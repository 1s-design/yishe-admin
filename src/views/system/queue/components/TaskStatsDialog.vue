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
          v-model="filterForm.types"
          multiple
          collapse-tags
          collapse-tags-tooltip
          clearable
          filterable
          :placeholder="t('queue.allTypes')"
          size="small"
          style="width: 220px"
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

        <div class="task-stats__total">
          {{ t('queue.total') }}: <strong>{{ summary.total }}</strong>
          &nbsp;&nbsp;{{ t('queue.waiting') }}: <strong class="text-warning">{{ summary.waiting }}</strong>
          &nbsp;&nbsp;{{ t('queue.processing') }}: <strong class="text-primary">{{ summary.processing }}</strong>
          &nbsp;&nbsp;{{ t('queue.completed') }}: <strong class="text-success">{{ summary.completed }}</strong>
          &nbsp;&nbsp;{{ t('queue.failed') }}: <strong class="text-danger">{{ summary.failed }}</strong>
        </div>
      </div>

      <!-- 数据表格 -->
      <el-table
        v-loading="loading"
        :data="summary.byType"
        stripe
        size="small"
        class="task-stats__table"
      >
        <el-table-column :label="t('queue.taskType')" min-width="180" show-overflow-tooltip>
          <template #default="{ row }">{{ getTypeLabel(row.type) }}</template>
        </el-table-column>
        <el-table-column prop="total" :label="t('queue.created')" width="90" align="center" />
        <el-table-column prop="pending" :label="t('queue.pending')" width="90" align="center" />
        <el-table-column prop="waiting" :label="t('queue.waiting')" width="90" align="center">
          <template #default="{ row }">
            <span class="cell-count cell-count--warning">{{ row.waiting }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="processing" :label="t('queue.processing')" width="90" align="center">
          <template #default="{ row }">
            <span class="cell-count cell-count--primary">{{ row.processing }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="completed" :label="t('queue.completed')" width="90" align="center">
          <template #default="{ row }">
            <span class="cell-count cell-count--success">{{ row.completed }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="failed" :label="t('queue.failed')" width="90" align="center">
          <template #default="{ row }">
            <span class="cell-count cell-count--danger">{{ row.failed }}</span>
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

const props = defineProps<{
  taskTypeOptions: Array<{ label: string; value: string }>;
}>();

const visible = defineModel<boolean>({ default: false });
const { t } = useI18n();

const loading = ref(false);

/** 快捷时间范围：today / 24h / 7d / 30d；手动改日期选择器时清空 */
const quickRange = ref("today");

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
  types: [] as string[],
  dateRange: defaultDateRange as [string, string] | null,
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

async function fetchStats() {
  loading.value = true;
  try {
    const res = await getTaskStatsDetail({
      types: filterForm.types.length > 0 ? filterForm.types : undefined,
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
  filterForm.types = [];
  quickRange.value = "today";
  filterForm.dateRange = resolveQuickRange("today");
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
