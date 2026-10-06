<template>
  <ContentWrap :plain="true">
    <div class="ss">
      <header class="ss-head">
        <div class="ss-head__left">
          <h2 class="ss-head__title">服务状态</h2>
          <span class="ss-head__dot" :class="`is-${overview?.summary?.overall || 'ok'}`" />
          <span class="ss-head__overall">{{ overallLabel }}</span>
          <span v-if="lastUpdatedAt" class="ss-head__time">{{ lastUpdatedAt }}</span>
          <span v-else-if="loading" class="ss-head__time">加载中…</span>
        </div>
        <div class="ss-head__right">
          <el-switch v-model="autoRefresh" size="small" @change="handleAutoRefreshChange" />
          <span class="ss-head__hint">{{ refreshIntervalSec }}s</span>
          <el-button size="small" text :icon="Refresh" :loading="loading" @click="loadOverview">
            刷新
          </el-button>
        </div>
      </header>

      <template v-if="overview">
        <!-- 顶部指标条 -->
        <div class="ss-metrics">
          <div class="ss-metrics__item">
            <span class="ss-metrics__value">{{ overview.summary.total }}</span>
            <span class="ss-metrics__label">组件</span>
          </div>
          <div class="ss-metrics__sep" />
          <div class="ss-metrics__item">
            <span class="ss-metrics__value is-ok">{{ overview.summary.ok }}</span>
            <span class="ss-metrics__label">正常</span>
          </div>
          <div class="ss-metrics__sep" />
          <div class="ss-metrics__item">
            <span class="ss-metrics__value is-degraded">{{ overview.summary.degraded }}</span>
            <span class="ss-metrics__label">降级</span>
          </div>
          <div class="ss-metrics__sep" />
          <div class="ss-metrics__item">
            <span class="ss-metrics__value is-down">{{ overview.summary.down }}</span>
            <span class="ss-metrics__label">异常</span>
          </div>
          <div class="ss-metrics__sep" />
          <div class="ss-metrics__item">
            <span class="ss-metrics__value">v{{ overview.app.version }}</span>
            <span class="ss-metrics__label">版本</span>
          </div>
          <div class="ss-metrics__sep" />
          <div class="ss-metrics__item">
            <span class="ss-metrics__value">{{ formatDuration(overview.app.uptimeSeconds) }}</span>
            <span class="ss-metrics__label">运行时长</span>
          </div>
          <div class="ss-metrics__sep" />
          <div class="ss-metrics__item">
            <span class="ss-metrics__value">{{ overview.app.memory.rssMb }} MB</span>
            <span class="ss-metrics__label">进程内存</span>
          </div>
        </div>

        <!-- 服务组件 -->
        <section class="ss-block">
          <div class="ss-block__head">服务组件</div>
          <div class="ss-grid">
            <div v-for="item in overview.components" :key="item.key" class="ss-card">
              <div class="ss-card__head">
                <span class="ss-card__dot" :class="`is-${item.status}`" />
                <span class="ss-card__name">{{ item.name }}</span>
                <span class="ss-card__status" :class="`is-${item.status}`">
                  {{ statusLabel(item.status) }}
                </span>
                <span v-if="item.latencyMs !== null" class="ss-card__latency">
                  {{ item.latencyMs }} ms
                </span>
              </div>
              <div class="ss-card__msg">{{ item.message }}</div>
              <dl v-if="metricEntries(item).length" class="ss-kv">
                <div v-for="[key, value] in metricEntries(item)" :key="key" class="ss-kv__row">
                  <dt>{{ metricLabel(key) }}</dt>
                  <dd :title="String(value)">{{ formatMetricValue(key, value) }}</dd>
                </div>
              </dl>
            </div>
          </div>
        </section>

        <!-- 应用 / 设备 -->
        <div class="ss-cols">
          <section class="ss-block">
            <div class="ss-block__head">应用信息</div>
            <dl class="ss-kv ss-kv--wide">
              <div class="ss-kv__row"><dt>服务名称</dt><dd>{{ overview.app.name }}</dd></div>
              <div class="ss-kv__row"><dt>版本</dt><dd>v{{ overview.app.version }}</dd></div>
              <div class="ss-kv__row"><dt>运行环境</dt><dd>{{ overview.app.env }}</dd></div>
              <div class="ss-kv__row"><dt>Node</dt><dd>{{ overview.app.nodeVersion }}</dd></div>
              <div class="ss-kv__row"><dt>进程 PID</dt><dd>{{ overview.app.pid }}</dd></div>
              <div class="ss-kv__row">
                <dt>运行时长</dt>
                <dd>{{ formatDuration(overview.app.uptimeSeconds) }}</dd>
              </div>
              <div class="ss-kv__row">
                <dt>内存 (RSS)</dt>
                <dd>{{ overview.app.memory.rssMb }} MB</dd>
              </div>
              <div class="ss-kv__row">
                <dt>堆内存</dt>
                <dd>
                  {{ overview.app.memory.heapUsedMb }} / {{ overview.app.memory.heapTotalMb }} MB
                </dd>
              </div>
            </dl>
          </section>

          <section class="ss-block">
            <div class="ss-block__head">运行设备</div>
            <dl class="ss-kv ss-kv--wide">
              <div class="ss-kv__row"><dt>主机名</dt><dd>{{ overview.host.hostname }}</dd></div>
              <div class="ss-kv__row">
                <dt>系统</dt>
                <dd>{{ overview.host.platform }} / {{ overview.host.arch }}</dd>
              </div>
              <div class="ss-kv__row">
                <dt>CPU</dt>
                <dd :title="overview.host.cpuModel">
                  {{ overview.host.cpuModel }}（{{ overview.host.cpuCores }} 核）
                </dd>
              </div>
              <div class="ss-kv__row">
                <dt>内存</dt>
                <dd>
                  {{ overview.host.freeMemMb }} / {{ overview.host.totalMemMb }} MB 空闲 ·
                  {{ overview.host.memUsagePercent }}%
                </dd>
              </div>
              <div class="ss-kv__row">
                <dt>负载</dt>
                <dd>{{ overview.host.loadAvg.join(" · ") }}</dd>
              </div>
              <div class="ss-kv__row">
                <dt>磁盘</dt>
                <dd>
                  <template v-if="overview.host.disk">
                    {{ overview.host.disk.freeMb }} / {{ overview.host.disk.totalMb }} MB 空闲 ·
                    {{ overview.host.disk.usagePercent }}%
                  </template>
                  <template v-else>—</template>
                </dd>
              </div>
              <div class="ss-kv__row">
                <dt>系统运行</dt>
                <dd>{{ formatDuration(overview.host.osUptimeSeconds) }}</dd>
              </div>
              <div class="ss-kv__row">
                <dt>内网 IP</dt>
                <dd>
                  <template v-if="overview.host.network.length">
                    <span
                      v-for="n in overview.host.network"
                      :key="`${n.name}-${n.address}`"
                      class="ss-ip"
                    >
                      {{ n.address }}
                    </span>
                  </template>
                  <template v-else>—</template>
                </dd>
              </div>
            </dl>
          </section>
        </div>
      </template>

      <el-empty v-else-if="!loading" description="暂无服务状态数据" />
    </div>
  </ContentWrap>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import { useIntervalFn } from "@vueuse/core";
import { Refresh } from "@element-plus/icons-vue";
import { ElMessage } from "element-plus";
import ContentWrap from "@/components/ContentWrap/src/ContentWrap.vue";
import {
  getSystemStatusOverview,
  type ComponentStatus,
  type ServiceComponentStatus,
  type SystemStatusOverview
} from "@/api/systemStatus";

defineOptions({ name: "SystemServiceStatus" });

const REFRESH_INTERVAL_SEC = 30;

const overview = ref<SystemStatusOverview | null>(null);
const loading = ref(false);
const autoRefresh = ref(true);
const lastUpdatedAt = ref("");
const refreshIntervalSec = REFRESH_INTERVAL_SEC;

const overallLabel = computed(() => statusLabel(overview.value?.summary?.overall || "ok"));

const statusLabel = (status: ComponentStatus | string) => {
  if (status === "ok") return "正常";
  if (status === "degraded") return "降级";
  if (status === "down") return "异常";
  return String(status);
};

const formatDuration = (seconds: number) => {
  const total = Number(seconds || 0);
  if (!Number.isFinite(total) || total < 0) return "—";
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = Math.floor(total % 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${secs}s`;
  return `${secs}s`;
};

const METRIC_LABELS: Record<string, string> = {
  version: "版本",
  database: "数据库",
  host: "主机",
  threadsConnected: "连接数",
  poolSize: "连接池",
  mode: "模式",
  connectedClients: "客户端",
  usedMemoryMb: "已用内存",
  usedMemoryPeakMb: "内存峰值",
  hitRatePercent: "命中率",
  uptimeSeconds: "运行时长",
  baseUrl: "地址",
  collectionCount: "集合数",
  totalVectors: "向量量",
  collections: "集合"
};

const metricLabel = (key: string) => METRIC_LABELS[key] || key;

const formatMetricValue = (key: string, value: any) => {
  if (value === null || value === undefined || value === "") return "—";
  if (key === "hitRatePercent") return `${value}%`;
  if (key === "uptimeSeconds") return formatDuration(Number(value));
  return String(value);
};

const metricEntries = (item: ServiceComponentStatus) =>
  Object.entries(item.metrics || {}).filter(
    ([, value]) => value !== null && value !== undefined && value !== ""
  );

const formatDateTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
};

const loadOverview = async () => {
  loading.value = true;
  try {
    const result = await getSystemStatusOverview();
    overview.value = result || null;
    lastUpdatedAt.value = formatDateTime(result?.timestamp || new Date().toISOString());
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.message || error?.message || "获取服务状态失败");
  } finally {
    loading.value = false;
  }
};

const { pause, resume } = useIntervalFn(() => loadOverview(), REFRESH_INTERVAL_SEC * 1000, {
  immediate: false
});

const handleAutoRefreshChange = (value: boolean | string | number) => {
  if (value) {
    resume();
    loadOverview();
  } else {
    pause();
  }
};

onMounted(() => {
  loadOverview();
  if (autoRefresh.value) resume();
});

onUnmounted(() => pause());
</script>

<style scoped lang="scss">
/* 极简扁平：无阴影、无左侧色条，仅发丝线分隔 */
.ss {
  display: flex;
  flex-direction: column;
  gap: 28px;
  color: var(--el-text-color-primary);
}

/* ── 顶栏 ───────────────────────────────── */
.ss-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding-bottom: 14px;
  border-bottom: 1px solid var(--el-border-color-lighter);

  &__left {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
  }

  &__title {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    letter-spacing: 0.02em;
  }

  &__dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--el-color-success);
    flex-shrink: 0;

    &.is-degraded {
      background: var(--el-color-warning);
    }
    &.is-down {
      background: var(--el-color-danger);
    }
  }

  &__overall {
    font-size: 13px;
    color: var(--el-text-color-regular);
  }

  &__time {
    font-size: 12px;
    color: var(--el-text-color-secondary);
    font-variant-numeric: tabular-nums;
  }

  &__right {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  &__hint {
    font-size: 12px;
    color: var(--el-text-color-secondary);
    font-variant-numeric: tabular-nums;
  }
}

/* ── 顶部指标条 ─────────────────────────── */
.ss-metrics {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0 20px;
  padding: 4px 0;

  &__item {
    display: flex;
    align-items: baseline;
    gap: 8px;
  }

  &__value {
    font-size: 20px;
    font-weight: 600;
    line-height: 1.2;
    font-variant-numeric: tabular-nums;

    &.is-ok {
      color: var(--el-color-success);
    }
    &.is-degraded {
      color: var(--el-color-warning);
    }
    &.is-down {
      color: var(--el-color-danger);
    }
  }

  &__label {
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }

  &__sep {
    width: 1px;
    height: 14px;
    background: var(--el-border-color-lighter);
  }
}

/* ── 区块 ───────────────────────────────── */
.ss-block {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;

  &__head {
    font-size: 13px;
    font-weight: 600;
    color: var(--el-text-color-secondary);
    letter-spacing: 0.04em;
  }
}

.ss-cols {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 32px;
  align-items: start;
}

/* ── 组件卡片：纯发丝线，无左侧色条 ─────── */
.ss-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 12px;
}

.ss-card {
  padding: 16px 18px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 6px;
  background: var(--el-fill-color-blank);
  display: flex;
  flex-direction: column;
  gap: 10px;

  &__head {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  &__dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--el-color-success);
    flex-shrink: 0;

    &.is-degraded {
      background: var(--el-color-warning);
    }
    &.is-down {
      background: var(--el-color-danger);
    }
  }

  &__name {
    font-size: 13px;
    font-weight: 600;
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__status {
    font-size: 12px;

    &.is-ok {
      color: var(--el-color-success);
    }
    &.is-degraded {
      color: var(--el-color-warning);
    }
    &.is-down {
      color: var(--el-color-danger);
    }
  }

  &__latency {
    font-size: 12px;
    color: var(--el-text-color-secondary);
    font-variant-numeric: tabular-nums;
  }

  &__msg {
    font-size: 12px;
    line-height: 1.6;
    color: var(--el-text-color-secondary);
  }
}

/* ── 键值列表 ───────────────────────────── */
.ss-kv {
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0;

  &__row {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 16px;
    padding: 7px 0;
    border-top: 1px solid var(--el-border-color-lighter);
    font-size: 12px;

    &:first-child {
      border-top: none;
      padding-top: 0;
    }

    dt {
      color: var(--el-text-color-secondary);
      flex-shrink: 0;
    }

    dd {
      margin: 0;
      color: var(--el-text-color-regular);
      text-align: right;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-variant-numeric: tabular-nums;
    }
  }

  /* 信息面板里首行也有分隔线，形成统一列表感 */
  &--wide &__row {
    border-top: 1px solid var(--el-border-color-lighter);
    padding: 8px 0;

    &:first-child {
      border-top: none;
      padding-top: 0;
    }
  }
}

.ss-ip {
  display: inline-block;
  margin-left: 10px;
  font-variant-numeric: tabular-nums;

  &:first-child {
    margin-left: 0;
  }
}
</style>
