<template>
  <div class="svc-panel">
    <!-- 客户端 Agent 多任务实时运行态卡片 -->
    <section class="agent-card">
      <header class="agent-card__header">
        <div class="agent-card__title-wrap">
          <span
            :class="[
              'agent-card__dot',
              clientAgentRuntime?.activeCount
                ? 'is-running'
                : clientAgentRuntime?.enabled
                  ? 'is-ready'
                  : 'is-off',
            ]"
          />
          <span class="agent-card__title">客户端 Agent</span>
          <span class="agent-card__model">
            {{
              clientAgentRuntime
                ? clientAgentRuntime.model || "未绑定模型"
                : "等待客户端上报（重启新版客户端后自动显示）"
            }}
          </span>
        </div>

        <div v-if="clientAgentRuntime" class="agent-card__metrics">
          <span class="agent-pill">
            并发 {{ clientAgentRuntime.activeCount }} / {{ clientAgentRuntime.maxConcurrency }}
          </span>
          <span v-if="clientAgentRuntime.queuedCount > 0" class="agent-pill agent-pill--warn">
            排队 {{ clientAgentRuntime.queuedCount }}
          </span>
          <span
            :class="[
              'agent-pill',
              clientAgentRuntime.activeCount > 0
                ? 'agent-pill--running'
                : clientAgentRuntime.enabled
                  ? 'agent-pill--ready'
                  : '',
            ]"
          >
            {{
              !clientAgentRuntime.enabled
                ? "未启用"
                : clientAgentRuntime.activeCount > 0
                  ? "执行中"
                  : "空闲就绪"
            }}
          </span>
        </div>
      </header>

      <!-- 当前并发运行中的 Agent 任务列表 -->
      <div v-if="clientAgentRuntime?.activeRuns?.length" class="agent-runs">
        <div
          v-for="run in clientAgentRuntime.activeRuns"
          :key="run.runId"
          class="agent-run-row"
        >
          <span
            :class="[
              'agent-run-row__badge',
              run.status === 'running' ? 'is-running' : 'is-queued',
            ]"
          >
            {{ run.status === "running" ? "运行中" : "排队中" }}
          </span>
          <span class="agent-run-row__profile">{{ run.profileId }}</span>
          <span class="agent-run-row__title" :title="run.title">{{ run.title }}</span>
          <span v-if="run.currentTool" class="agent-run-row__tool">
            {{ run.currentTool }}
          </span>
          <span class="agent-run-row__meta">
            {{ formatDuration(run.durationMs) }}
            <template v-if="run.usage?.totalTokens">
              · {{ run.usage.totalTokens }} tok
            </template>
          </span>
        </div>
      </div>

      <!-- 最近完成的 Agent 执行记录 -->
      <div v-else-if="clientAgentRuntime?.recentRuns?.length" class="agent-recent">
        <div class="agent-recent__label">最近执行</div>
        <div
          v-for="run in clientAgentRuntime.recentRuns.slice(0, 4)"
          :key="run.runId"
          class="agent-run-row agent-run-row--recent"
        >
          <span :class="['agent-run-row__badge', `is-${run.status}`]">
            {{ statusLabel(run.status) }}
          </span>
          <span class="agent-run-row__profile">{{ run.profileId }}</span>
          <span class="agent-run-row__title" :title="run.title">{{ run.title }}</span>
          <span class="agent-run-row__meta">
            {{ formatDuration(run.durationMs) }}
            <template v-if="run.usage?.totalTokens">
              · {{ run.usage.totalTokens }} tok
            </template>
          </span>
        </div>
      </div>
    </section>

    <!-- 原有基础服务列表 -->
    <div class="svc-list">
      <template v-if="services.length">
        <div v-for="svc in services" :key="svc.key" class="svc-row">
          <span class="svc-row__name">{{ svc.label }}</span>
          <span :class="['svc-row__dot', `svc-row__dot--${svc.statusType}`]" />
          <span :class="['svc-row__status', `svc-row__status--${svc.statusType}`]">
            {{ svc.statusText }}
          </span>
          <span v-if="svc.state" class="svc-row__state">{{ svc.state }}</span>
          <span v-if="svc.message" class="svc-row__msg">{{ svc.message }}</span>
        </div>
      </template>
      <el-empty v-else description="暂无服务" :image-size="40" />
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed } from "vue";
import type { WebsocketConnectionVO } from "@/api/system/websocket";

interface AgentRunSummary {
  runId: string;
  profileId: string;
  title: string;
  status: string;
  currentTool?: string | null;
  durationMs?: number;
  usage?: {
    totalTokens?: number;
    cachedTokens?: number;
  };
}

interface ClientAgentRuntimeDetails {
  enabled: boolean;
  model: string;
  maxConcurrency: number;
  activeCount: number;
  queuedCount: number;
  activeRuns?: AgentRunSummary[];
  recentRuns?: AgentRunSummary[];
}

const props = defineProps<{ client: WebsocketConnectionVO }>();

/** 只显示核心服务，隐藏采集源等细粒度状态 */
const CORE_SERVICE_RE =
  /^(client-agent|browser-automation|photoshop|ps-automation|image-processing|material-library|video-template|file-download|mcp|collect|collect-engine|media-collect|googleArt|shopify|design-tool)$/i;

/** 采集源/数据工具等噪声服务 key 模式（全部隐藏） */
const NOISE_RE =
  /^(collect_|hotsearch_|data[_-]?tools|36kr|baidu|bing|bbcnews|bbc-news|chinadaily|cma|duckduckgo|emojipedia|flickr|foodiesfeed|gdelt|github|google[-_]?icons|googleimages|google[-_]?images|googlenews|google[-_]?news|govcn|gratisography|hackernews|hacker[-_]?news|huxiu|iconify|internet-archive|isorepublic|kaboompics|lifeofpix|magnific|metmuseum|midjourney|mittechreview|nappy|negativespace|nounproject|npr|openclipart|openmoji|openverse|pakutaso|pexels|picjumbo|pinterest|pixabay|producthunt|rawpixel|reddit|reuters|rijksmuseum|smithsonian|so|sogou|stocksnap|svgrepo|techcrunch|theguardian|thepaper|theverge|undraw|unsplash|vecteezy|wallhaven|wikimedia|xinhuanet|yandex|weather|currency|exchange|timezone|ip$|postal|color|sunrise|sunset|dictionary|worldometer|coingecko|coinmarketcap|flashscore|linkedin|yahoo|worldometers|weather-com|open-meteo|wttr|our-world|quanta|science|science-daily|hollywood|deadline|variety|billboard|space-com|phys-org|ars-technica|wired|engadget|apnews|npr-technology|bbc-technology|guardian-technology|techcrunch-rss|ars-technica-rss|mit-tech-review-rss|theverge-rss|bbctechnology|getApnews|getWired|getEngadget|getBbctechnology|getGuardiantechnology|getMittechreviewrss|getNprtechnology|getTechcrunchrss|getThevergerss|getArstechnicarss|getTime)/i;

const clientAgentRuntime = computed<ClientAgentRuntimeDetails | null>(() => {
  const svc = (props.client?.clientInfo?.services || {})["client-agent"] as any;
  if (!svc?.details) return null;
  return svc.details as ClientAgentRuntimeDetails;
});

function formatDuration(ms?: number): string {
  if (!ms || ms < 0) return "0s";
  if (ms < 1000) return `${ms}ms`;
  const sec = ms / 1000;
  if (sec < 60) return `${sec.toFixed(1)}s`;
  const min = Math.floor(sec / 60);
  const rem = Math.round(sec % 60);
  return `${min}m${rem}s`;
}

function statusLabel(status: string): string {
  if (status === "completed") return "完成";
  if (status === "failed") return "失败";
  if (status === "aborted") return "中止";
  if (status === "running") return "运行中";
  if (status === "queued") return "排队中";
  return status;
}

const services = computed(() => {
  const map = props.client?.clientInfo?.services || {};
  return Object.entries(map)
    .filter(([key]) => {
      if (CORE_SERVICE_RE.test(key)) return true;
      return !NOISE_RE.test(key);
    })
    .map(([key, v]) => {
      const s = v as Record<string, any>;
      const rawStatus = String(s.status || "").toLowerCase();
      const rawState = String(s.state || "").toLowerCase();
      const isDisconnected = rawStatus === "disconnected";
      const isError = rawStatus === "error" || rawState === "error";

      if (isError || isDisconnected) {
        return {
          key,
          label: s.label || key,
          statusText: isDisconnected ? "断开" : "错误",
          statusType: "danger" as const,
          state: s.state,
          message: s.message,
        };
      }
      if (s.available || s.connected) {
        return {
          key,
          label: s.label || key,
          statusText: s.available ? "可用" : "已连接",
          statusType: "success" as const,
          state: s.state,
          message: s.message,
        };
      }
      return {
        key,
        label: s.label || key,
        statusText: s.status || s.state || "未知",
        statusType: "info" as const,
        state: s.state,
        message: s.message,
      };
    });
});
</script>

<style scoped lang="scss">
.svc-panel {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.agent-card {
  padding: 12px 14px;
  border-radius: 8px;
  border: 1px solid var(--el-border-color-lighter);
  background: var(--app-content-surface-color, var(--el-bg-color));

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 8px;
  }

  &__title-wrap {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
  }

  &__dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    flex-shrink: 0;

    &.is-running {
      background: #10b981;
      box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.18);
    }

    &.is-ready {
      background: #10b981;
    }

    &.is-off {
      background: var(--el-text-color-placeholder);
    }
  }

  &__title {
    font-size: 13px;
    font-weight: 600;
    color: var(--el-text-color-primary);
  }

  &__model {
    font-size: 11.5px;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    color: var(--el-text-color-secondary);
  }

  &__metrics {
    display: flex;
    align-items: center;
    gap: 6px;
  }
}

.agent-pill {
  display: inline-flex;
  align-items: center;
  height: 20px;
  padding: 0 7px;
  border-radius: 5px;
  font-size: 11px;
  font-weight: 500;
  color: var(--el-text-color-secondary);
  background: var(--app-content-surface-muted-color, rgba(15, 23, 42, 0.04));
  font-variant-numeric: tabular-nums;

  &--running {
    color: #047857;
    background: rgba(16, 185, 129, 0.14);
  }

  &--ready {
    color: var(--el-text-color-primary);
  }

  &--warn {
    color: #b45309;
    background: rgba(245, 158, 11, 0.14);
  }
}

.agent-runs,
.agent-recent {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid var(--el-border-color-extra-light);
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.agent-recent__label {
  font-size: 11px;
  color: var(--el-text-color-placeholder);
  margin-bottom: 2px;
}

.agent-run-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  min-width: 0;

  &--recent {
    opacity: 0.85;
  }

  &__badge {
    flex-shrink: 0;
    font-size: 10.5px;
    padding: 1px 6px;
    border-radius: 4px;
    background: var(--app-content-surface-muted-color, rgba(15, 23, 42, 0.05));
    color: var(--el-text-color-secondary);

    &.is-running {
      color: #047857;
      background: rgba(16, 185, 129, 0.14);
    }

    &.is-queued {
      color: #b45309;
      background: rgba(245, 158, 11, 0.14);
    }

    &.is-completed {
      color: #047857;
    }

    &.is-failed {
      color: var(--el-color-danger);
      background: rgba(239, 68, 68, 0.1);
    }
  }

  &__profile {
    flex-shrink: 0;
    font-size: 11px;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    color: var(--el-text-color-secondary);
  }

  &__title {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--el-text-color-primary);
  }

  &__tool {
    flex-shrink: 0;
    font-size: 11px;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    color: var(--el-color-primary);
  }

  &__meta {
    flex-shrink: 0;
    font-size: 11px;
    color: var(--el-text-color-placeholder);
    font-variant-numeric: tabular-nums;
  }
}

.svc-list {
  display: flex;
  flex-direction: column;
}

.svc-row {
  display: flex;
  padding: 6px 0;
  font-size: 12px;
  border-bottom: 1px solid var(--el-border-color-lighter);
  align-items: center;
  gap: 8px;

  &:last-child {
    border-bottom: none;
  }

  &__name {
    min-width: 100px;
    font-weight: 500;
    color: var(--el-text-color-primary);
  }

  &__dot {
    width: 5px;
    height: 5px;
    background: var(--el-text-color-placeholder);
    border-radius: 50%;

    &--success {
      background: var(--el-color-success);
    }

    &--danger {
      background: var(--el-color-danger);
    }
  }

  &__status {
    font-size: 11px;

    &--success {
      color: var(--el-color-success);
    }

    &--danger {
      color: var(--el-color-danger);
    }

    &--info {
      color: var(--el-text-color-secondary);
    }
  }

  &__state {
    font-size: 11px;
    color: var(--el-text-color-secondary);
  }

  &__msg {
    overflow: hidden;
    color: var(--el-text-color-placeholder);
    text-overflow: ellipsis;
    white-space: nowrap;
    flex: 1;
  }
}
</style>
