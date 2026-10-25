<template>
  <el-dialog
    v-model="visible"
    :title="t('queue.taskStats')"
    fullscreen
    destroy-on-close
    :close-on-click-modal="true"
    class="task-stats-dialog"
  >
    <div class="task-stats">
      <!-- 筛选栏 -->
      <div class="task-stats__bar">
        <el-radio-group v-model="quickRange" size="small" @change="onQuickRangeChange">
          <el-radio-button value="today">{{ t('queue.today') }}</el-radio-button>
          <el-radio-button value="24h">{{ t('queue.last24Hours') }}</el-radio-button>
          <el-radio-button value="7d">{{ t('queue.last7Days') }}</el-radio-button>
          <el-radio-button value="30d">{{ t('queue.last30Days') }}</el-radio-button>
          <el-radio-button value="all">{{ t('queue.allTime') }}</el-radio-button>
        </el-radio-group>
        <el-select
          v-model="filterForm.platforms"
          multiple
          collapse-tags
          collapse-tags-tooltip
          clearable
          filterable
          :placeholder="t('queue.platform')"
          size="small"
          style="width: 180px"
          @change="fetchStats"
        >
          <el-option
            v-for="opt in platformOptions"
            :key="opt.value"
            :label="opt.label"
            :value="opt.value"
          />
        </el-select>
        <el-select
          v-model="filterForm.types"
          multiple
          collapse-tags
          collapse-tags-tooltip
          clearable
          filterable
          :placeholder="t('queue.allTypes')"
          size="small"
          style="width: 220px"
          @change="fetchStats"
        >
          <el-option
            v-for="opt in typeOptions"
            :key="opt.value"
            :label="opt.label"
            :value="opt.value"
          />
        </el-select>
        <el-date-picker
          v-model="filterForm.dateRange"
          type="datetimerange"
          :range-separator="t('queue.to')"
          :start-placeholder="t('queue.startTime')"
          :end-placeholder="t('queue.endTime')"
          value-format="YYYY-MM-DD HH:mm:ss"
          size="small"
          clearable
          :shortcuts="dateShortcuts"
          :default-time="[new Date(0, 0, 0, 0, 0, 0), new Date(0, 0, 0, 23, 59, 59)]"
          style="width: 340px"
          @change="quickRange = ''"
        />
        <el-button type="primary" size="small" :loading="loading" @click="fetchStats">
          {{ t('queue.search') }}
        </el-button>
        <el-button size="small" @click="resetFilter">{{ t('queue.reset') }}</el-button>

        <el-radio-group v-model="groupBy" size="small">
          <el-radio-button value="platform">{{ t('queue.byPlatform') }}</el-radio-button>
          <el-radio-button value="type">{{ t('queue.byTaskType') }}</el-radio-button>
        </el-radio-group>

        <div class="task-stats__total">
          {{ t('queue.total') }}: <strong>{{ summary.total }}</strong>
          &nbsp;&nbsp;{{ t('queue.pendingCompletion') }}: <strong class="text-warning">{{ summaryPending }}</strong>
          &nbsp;&nbsp;{{ t('queue.completed') }}: <strong class="text-success">{{ summary.completed }}</strong>
          &nbsp;&nbsp;{{ t('queue.failed') }}: <strong class="text-danger">{{ summary.failed }}</strong>
          &nbsp;&nbsp;{{ t('queue.successRate') }}: <strong>{{ summaryRateText }}</strong>
        </div>
      </div>

      <!-- 数据表格 -->
      <el-table
        v-loading="loading"
        :data="tableRows"
        stripe
        size="small"
        class="task-stats__table"
      >
        <el-table-column
          :label="groupBy === 'platform' ? t('queue.platform') : t('queue.taskType')"
          min-width="220"
          show-overflow-tooltip
        >
          <template #default="{ row }">{{ row.label }}</template>
        </el-table-column>
        <el-table-column prop="total" :label="t('queue.created')" width="100" align="center" />
        <el-table-column :label="t('queue.pendingCompletion')" width="110" align="center">
          <template #default="{ row }">
            <el-tooltip :content="pendingBreakdown(row)" placement="top">
              <span class="cell-count cell-count--warning">{{ row.pendingTotal }}</span>
            </el-tooltip>
          </template>
        </el-table-column>
        <el-table-column prop="completed" :label="t('queue.completed')" width="100" align="center">
          <template #default="{ row }">
            <span class="cell-count cell-count--success">{{ row.completed }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="failed" :label="t('queue.failed')" width="100" align="center">
          <template #default="{ row }">
            <span class="cell-count cell-count--danger">{{ row.failed }}</span>
          </template>
        </el-table-column>
        <el-table-column :label="t('queue.successRate')" width="200" align="center">
          <template #header>
            <el-tooltip :content="t('queue.successRateHint')" placement="top">
              <span>{{ t('queue.successRate') }}</span>
            </el-tooltip>
          </template>
          <template #default="{ row }">
            <div v-if="row.successRate !== null" class="task-stats__rate">
              <el-progress
                :percentage="row.successRate"
                :stroke-width="6"
                :show-text="false"
                :color="rateColor(row.successRate)"
              />
              <span class="task-stats__rate-text">{{ row.successRate.toFixed(1) }}%</span>
            </div>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <template #empty>
          <el-empty :description="t('queue.noData')" />
        </template>
      </el-table>
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, computed, defineModel, watch } from "vue";
import { ElMessage } from "element-plus";
import { useI18n } from "@/hooks/web/useI18n";
import { getTaskStatsDetail, type TaskStatsSummary } from "@/api/system/queue";
import { PLATFORM_LABEL_MAP, resolveTaskTypePlatform } from "@/config/task-types";

const props = defineProps<{
  taskTypeOptions: Array<{
    label: string;
    value: string;
    platform?: string;
    platformLabel?: string | null;
  }>;
}>();

const visible = defineModel<boolean>({ default: false });
const { t } = useI18n();

const loading = ref(false);

/** 快捷时间范围：today / 24h / 7d / 30d；手动改日期选择器时清空 */
const quickRange = ref("today");

/** 统计分组维度：platform（平台）/ type（任务类型） */
const groupBy = ref<"platform" | "type">("platform");

const fmtDateTime = (d: Date) => {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

function resolveQuickRange(key: string): [string, string] {
  const end = new Date();
  const start = new Date();
  if (key === "today") {
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
  } else if (key === "24h") {
    start.setTime(end.getTime() - 24 * 60 * 60 * 1000);
  } else if (key === "7d") {
    start.setTime(end.getTime() - 7 * 24 * 60 * 60 * 1000);
  } else if (key === "30d") {
    start.setTime(end.getTime() - 30 * 24 * 60 * 60 * 1000);
  }
  return [fmtDateTime(start), fmtDateTime(end)];
}

function onQuickRangeChange(key: string) {
  if (!key) return;
  filterForm.dateRange = key === "all" ? null : resolveQuickRange(key);
  fetchStats();
}

/** 类型原始值 → 中文标签 */
function getTypeLabel(type: string) {
  return props.taskTypeOptions.find((o) => o.value === type)?.label || type;
}

/** 解析任务类型对应的平台标识（发布类任务类型前缀里带平台） */
function getTypePlatform(type: string): string {
  const option = props.taskTypeOptions.find((o) => o.value === type);
  return String(option?.platform || resolveTaskTypePlatform(type) || "").trim();
}

/** 统计结果里实际出现过的所有任务类型（累积并集，保证非发布类任务也可筛选） */
const discoveredTypes = ref<string[]>([]);

/** 类型筛选选项：发布类选项 ∪ 统计结果中出现的全部类型 */
const typeOptions = computed(() => {
  const map = new Map<string, string>();
  for (const o of props.taskTypeOptions) map.set(o.value, o.label);
  for (const t of discoveredTypes.value) {
    if (!map.has(t)) map.set(t, t);
  }
  return [...map.entries()].map(([value, label]) => ({ value, label }));
});

/** 平台筛选选项：发布类选项 ∪ 统计结果中出现的平台 */
const platformOptions = computed(() => {
  const map = new Map<string, string>();
  const collect = (platform: string) => {
    if (!platform || map.has(platform)) return;
    map.set(platform, PLATFORM_LABEL_MAP[platform] || platform);
  };
  for (const o of props.taskTypeOptions) collect(getTypePlatform(o.value));
  for (const type of discoveredTypes.value) collect(getTypePlatform(type));
  return [...map.entries()].map(([value, label]) => ({ value, label }));
});

// 默认时间范围：今天
const defaultDateRange = ((): [string, string] => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const fmt = (d: Date) => {
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  };
  return [fmt(start), fmt(end)];
})();

const filterForm = reactive({
  platforms: [] as string[],
  types: [] as string[],
  dateRange: defaultDateRange as [string, string] | null,
});

/** 平台筛选 → 任务类型列表（平台筛选为空时直接用类型筛选） */
const selectedTypes = computed(() => {
  const types = filterForm.types;
  if (filterForm.platforms.length === 0) return types;
  const allowed = new Set(
    typeOptions.value
      .filter((o) => filterForm.platforms.includes(getTypePlatform(o.value)))
      .map((o) => o.value),
  );
  return types.length > 0 ? types.filter((type) => allowed.has(type)) : [...allowed];
});

const dateShortcuts = [
  {
    text: t('queue.today'),
    value: () => {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date();
      end.setHours(23, 59, 59, 999);
      return [start, end];
    },
  },
  {
    text: t('queue.last24Hours'),
    value: () => {
      const end = new Date();
      const start = new Date(end.getTime() - 24 * 60 * 60 * 1000);
      return [start, end];
    },
  },
  {
    text: t('queue.last3Days'),
    value: () => {
      const end = new Date();
      const start = new Date(end.getTime() - 3 * 24 * 60 * 60 * 1000);
      return [start, end];
    },
  },
  {
    text: t('queue.last7Days'),
    value: () => {
      const end = new Date();
      const start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
      return [start, end];
    },
  },
  {
    text: t('queue.last30Days'),
    value: () => {
      const end = new Date();
      const start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
      return [start, end];
    },
  },
  {
    text: t('queue.last90Days'),
    value: () => {
      const end = new Date();
      const start = new Date(end.getTime() - 90 * 24 * 60 * 60 * 1000);
      return [start, end];
    },
  },
];

const defaultSummary: TaskStatsSummary = {
  total: 0,
  pending: 0,
  waiting: 0,
  processing: 0,
  completed: 0,
  failed: 0,
  byType: [],
};

const summary = ref<TaskStatsSummary>({ ...defaultSummary });

/** 待完成 = 待执行 + 排队 + 执行中（未进入终态的任务） */
function pendingTotalOf(item: { pending?: number; waiting?: number; processing?: number }) {
  return (Number(item.pending) || 0) + (Number(item.waiting) || 0) + (Number(item.processing) || 0);
}

/** 成功率 = 完成 / (完成 + 失败)，无终态任务时返回 null */
function calcSuccessRate(completed: number, failed: number): number | null {
  const finished = completed + failed;
  return finished > 0 ? (completed / finished) * 100 : null;
}

const summaryPending = computed(() => pendingTotalOf(summary.value));
const summaryRate = computed(() =>
  calcSuccessRate(Number(summary.value.completed) || 0, Number(summary.value.failed) || 0),
);
const summaryRateText = computed(() =>
  summaryRate.value === null ? "-" : `${summaryRate.value.toFixed(1)}%`,
);

interface StatsRow {
  key: string;
  label: string;
  total: number;
  pending: number;
  waiting: number;
  processing: number;
  completed: number;
  failed: number;
  pendingTotal: number;
  successRate: number | null;
}

/** 表格行：按平台聚合并集 / 按任务类型直接展示 */
const tableRows = computed<StatsRow[]>(() => {
  const byType = Array.isArray(summary.value.byType) ? summary.value.byType : [];

  if (groupBy.value === "type") {
    return byType.map((item) => {
      const completed = Number(item.completed) || 0;
      const failed = Number(item.failed) || 0;
      return {
        key: item.type,
        label: getTypeLabel(item.type),
        total: Number(item.total) || 0,
        pending: Number(item.pending) || 0,
        waiting: Number(item.waiting) || 0,
        processing: Number(item.processing) || 0,
        completed,
        failed,
        pendingTotal: pendingTotalOf(item),
        successRate: calcSuccessRate(completed, failed),
      };
    });
  }

  const grouped = new Map<string, StatsRow>();
  for (const item of byType) {
    const platform = getTypePlatform(item.type);
    const key = platform || "__other__";
    const row =
      grouped.get(key) ||
      ({
        key,
        label: platform ? PLATFORM_LABEL_MAP[platform] || platform : t('queue.other'),
        total: 0,
        pending: 0,
        waiting: 0,
        processing: 0,
        completed: 0,
        failed: 0,
        pendingTotal: 0,
        successRate: null,
      } as StatsRow);
    row.total += Number(item.total) || 0;
    row.pending += Number(item.pending) || 0;
    row.waiting += Number(item.waiting) || 0;
    row.processing += Number(item.processing) || 0;
    row.completed += Number(item.completed) || 0;
    row.failed += Number(item.failed) || 0;
    grouped.set(key, row);
  }

  return [...grouped.values()]
    .map((row) => ({
      ...row,
      pendingTotal: pendingTotalOf(row),
      successRate: calcSuccessRate(row.completed, row.failed),
    }))
    .sort((a, b) => b.total - a.total);
});

/** 待完成的构成明细，hover 展示 */
function pendingBreakdown(row: StatsRow) {
  return `${t('queue.pending')} ${row.pending} / ${t('queue.waiting')} ${row.waiting} / ${t('queue.processing')} ${row.processing}`;
}

/** 成功率进度条颜色：≥90 成功、≥60 警告、其余失败 */
function rateColor(rate: number) {
  if (rate >= 90) return "var(--el-color-success)";
  if (rate >= 60) return "var(--el-color-warning)";
  return "var(--el-color-danger)";
}

async function fetchStats() {
  loading.value = true;
  try {
    const res = await getTaskStatsDetail({
      types: selectedTypes.value.length > 0 ? selectedTypes.value : undefined,
      createdAfter: filterForm.dateRange?.[0] || undefined,
      createdBefore: filterForm.dateRange?.[1] || undefined,
    });

    if (res && (res as any).success !== false) {
      const data = (res as any).data || res;
      summary.value = {
        total: Number(data.total) || 0,
        pending: Number(data.pending) || 0,
        waiting: Number(data.waiting) || 0,
        processing: Number(data.processing) || 0,
        completed: Number(data.completed) || 0,
        failed: Number(data.failed) || 0,
        byType: Array.isArray(data.byType) ? data.byType : [],
      };
      // 累积发现所有任务类型，让筛选器覆盖非发布类任务
      const found = summary.value.byType.map((i) => String(i.type || "")).filter(Boolean);
      discoveredTypes.value = [...new Set([...discoveredTypes.value, ...found])];
    }
  } catch (e) {
    ElMessage.error(t('queue.fetchStatsFailed'));
  } finally {
    loading.value = false;
  }
}

function resetFilter() {
  filterForm.platforms = [];
  filterForm.types = [];
  quickRange.value = "today";
  filterForm.dateRange = resolveQuickRange("today");
  groupBy.value = "platform";
  fetchStats();
}

watch(visible, (val) => {
  if (val) {
    fetchStats();
  }
});
</script>

<style scoped lang="scss">
.task-stats {
  display: flex;
  flex-direction: column;
  height: 100%;
  gap: 12px;
}

.task-stats__bar {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.task-stats__total {
  margin-left: auto;
  font-size: 13px;
  color: var(--el-text-color-secondary);

  strong {
    font-weight: 600;
    color: var(--el-text-color-primary);
  }

  .text-success {
    color: var(--el-color-success);
  }
  .text-danger {
    color: var(--el-color-danger);
  }
  .text-warning {
    color: var(--el-color-warning);
  }
  .text-primary {
    color: var(--el-color-primary);
  }
}

.task-stats__table {
  flex: 1;
  min-height: 0;
}

.task-stats__rate {
  display: flex;
  align-items: center;
  gap: 8px;

  :deep(.el-progress) {
    flex: 1;
    min-width: 0;
  }

  &-text {
    flex-shrink: 0;
    font-variant-numeric: tabular-nums;
    color: var(--el-text-color-regular);
  }
}

.cell-count {
  font-weight: 600;

  &--success {
    color: var(--el-color-success);
  }
  &--danger {
    color: var(--el-color-danger);
  }
  &--warning {
    color: var(--el-color-warning);
  }
  &--primary {
    color: var(--el-color-primary);
  }
}
</style>
