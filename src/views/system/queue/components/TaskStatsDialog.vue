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
        <el-select
          v-model="filterForm.types"
          multiple
          collapse-tags
          collapse-tags-tooltip
          clearable
          filterable
          :placeholder="t('queue.allTypes')"
          size="small"
          style="width: 240px"
        >
          <el-option
            v-for="opt in taskTypeOptions"
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
          style="width: 360px"
        />
        <el-button type="primary" size="small" :loading="loading" @click="fetchStats">
          {{ t('queue.search') }}
        </el-button>
        <el-button size="small" @click="resetFilter">{{ t('queue.reset') }}</el-button>

        <div class="task-stats__total">
          {{ t('queue.total') }}: <strong>{{ summary.total }}</strong>
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
        <el-table-column prop="type" :label="t('queue.taskType')" min-width="200" show-overflow-tooltip />
        <el-table-column prop="total" :label="t('queue.created')" width="100" align="center" />
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
        <template #empty>
          <el-empty :description="t('queue.noData')" />
        </template>
      </el-table>
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, defineModel, watch, onMounted } from "vue";
import { ElMessage } from "element-plus";
import { useI18n } from "@/hooks/web/useI18n";
import { getTaskStatsDetail, type TaskStatsSummary } from "@/api/system/queue";

const props = defineProps<{
  taskTypeOptions: Array<{ label: string; value: string }>;
}>();

const visible = defineModel<boolean>({ default: false });
const { t } = useI18n();

const loading = ref(false);

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
    }
  } catch (e) {
    ElMessage.error(t('queue.fetchStatsFailed'));
  } finally {
    loading.value = false;
  }
}

function resetFilter() {
  filterForm.types = [];
  filterForm.dateRange = defaultDateRange;
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
}
</style>
