<template>
  <div class="agent-run-tasks">
    <!-- 顶部工具栏 -->
    <div class="art__toolbar">
      <div class="art__status-tabs">
        <button
          v-for="tab in statusTabs"
          :key="tab.value"
          class="art__tab"
          :class="{ active: currentStatus === tab.value }"
          @click="currentStatus = tab.value; fetchRuns(true)"
        >
          <span class="art__tab-label">{{ tab.label }}</span>
          <span v-if="statusCounts" class="art__tab-count">{{ getTabCount(tab) }}</span>
        </button>
      </div>
      <button class="art__refresh" :disabled="loading" @click="fetchRuns">
        <el-icon :size="14"><Refresh /></el-icon>
        <span>刷新</span>
      </button>
    </div>

    <!-- 任务列表 -->
    <div class="art__list" v-loading="loading">
      <div v-if="!runs.length && !loading" class="art__empty">
        <span class="mdi mdi-clipboard-text-outline art__empty-icon" />
        <p>暂无执行任务</p>
      </div>

      <div
        v-for="run in runs"
        :key="run.runId"
        class="art__card"
        :class="`is-${run.status}`"
        @click="openDetail(run)"
      >
        <div class="art__card-header">
          <span class="art__card-status-dot" :class="`is-${run.status}`" />
          <span class="art__card-title">{{ run.title || run.input || '未命名任务' }}</span>
          <span class="art__card-time">{{ formatTime(run.createdAt) }}</span>
        </div>
        <div class="art__card-body">
          <span class="art__card-status-text">{{ statusText(run.status) }}</span>
          <span v-if="run.totalStages" class="art__card-progress">
            {{ run.currentStage + 1 }}/{{ run.totalStages }} 阶段
          </span>
          <span v-if="run.errorMessage" class="art__card-error">{{ run.errorMessage }}</span>
        </div>
        <!-- Stage 进度条 -->
        <div v-if="run.plan?.stages?.length" class="art__card-stages">
          <div
            v-for="(stage, idx) in run.plan.stages"
            :key="idx"
            class="art__card-stage-dot"
            :class="getStageClass(run, idx)"
            :title="stage.name || stage.capabilityId"
          />
        </div>
      </div>
    </div>

    <!-- 分页 -->
    <div v-if="pagination.total > pagination.pageSize" class="art__pagination">
      <el-pagination
        v-model:current-page="pagination.page"
        v-model:page-size="pagination.pageSize"
        :total="pagination.total"
        :page-sizes="[10, 20, 50]"
        layout="prev, pager, next, jumper"
        background
        @current-change="fetchRuns"
        @size-change="fetchRuns"
      />
    </div>

    <!-- 详情弹窗 -->
    <el-dialog
      v-model="detailVisible"
      :title="currentRun?.title || '任务详情'"
      fullscreen
      :close-on-click-modal="true"
      class="art__detail-dialog"
    >
      <RunDetail
        v-if="currentRun"
        :key="currentRun.runId"
        :run="currentRun"
        @refresh="fetchRuns"
        @close="detailVisible = false"
      />
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, reactive } from "vue";
import { Refresh } from "@element-plus/icons-vue";
import { AgentRunApi } from "@/api/agentRun";
import type { AgentRunListItem, AgentRunStatus, AgentRunStatusCounts } from "@/api/agentRun";
import RunDetail from "./RunDetail.vue";

const statusTabs: { label: string; value: string; countKey?: keyof AgentRunStatusCounts }[] = [
  { label: "全部", value: "", countKey: "all" },
  { label: "运行中", value: "running", countKey: "running" },
  { label: "排队中", value: "queued", countKey: "queued" },
  { label: "等待审批", value: "waiting", countKey: "waiting" },
  { label: "成功", value: "success", countKey: "success" },
  { label: "失败", value: "failed", countKey: "failed" },
  { label: "已取消", value: "cancelled", countKey: "cancelled" },
];

const loading = ref(false);
const runs = ref<AgentRunListItem[]>([]);
const currentStatus = ref<AgentRunStatus | "">("");
const detailVisible = ref(false);
const currentRun = ref<AgentRunListItem | null>(null);
const statusCounts = ref<AgentRunStatusCounts | null>(null);

const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0,
});

function getTabCount(tab: typeof statusTabs[number]): number {
  if (!statusCounts.value || !tab.countKey) return 0;
  return statusCounts.value[tab.countKey] ?? 0;
}

async function fetchRuns(resetPage = false) {
  if (resetPage) pagination.page = 1;
  loading.value = true;
  try {
    const [res, counts] = await Promise.all([
      AgentRunApi.list({
        status: currentStatus.value || undefined,
        page: pagination.page,
        pageSize: pagination.pageSize,
      }),
      AgentRunApi.statusCounts().catch(() => null),
    ]);
    runs.value = res.list || [];
    pagination.total = res.total || 0;
    if (counts) statusCounts.value = counts;
  } catch (e) {
    console.error("获取任务列表失败:", e);
  } finally {
    loading.value = false;
  }
}

function openDetail(run: AgentRunListItem) {
  currentRun.value = run;
  detailVisible.value = true;
}

function statusText(status: string): string {
  const map: Record<string, string> = {
    pending: "等待中",
    queued: "排队中",
    running: "运行中",
    waiting: "等待审批",
    success: "已完成",
    failed: "失败",
    cancelled: "已取消",
  };
  return map[status] || status;
}

function formatTime(dateStr?: string | null): string {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 60_000) return "刚刚";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} 分钟前`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} 小时前`;
  return d.toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getStageClass(run: AgentRunListItem, idx: number): string {
  if (idx < run.currentStage) return "is-success";
  if (idx === run.currentStage) return `is-${run.status}`;
  return "is-pending";
}

onMounted(() => {
  fetchRuns();
});
</script>

<style scoped>
.agent-run-tasks {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  background: var(--bg);
  color: var(--text);
}

/* ── Toolbar ── */
.art__toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px;
  border-bottom: 1px solid var(--agent-border-soft, var(--border));
  flex-shrink: 0;
}

.art__status-tabs {
  display: flex;
  gap: 4px;
}

.art__tab {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 6px 14px;
  font-size: 13px;
  color: var(--text-2);
  background: transparent;
  border: 1px solid transparent;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s;
}

.art__tab:hover {
  background: var(--agent-surface-hover, var(--surface-hover));
  color: var(--text);
}

.art__tab.active {
  color: var(--primary);
  background: color-mix(in srgb, var(--primary) 10%, transparent);
  border-color: color-mix(in srgb, var(--primary) 25%, transparent);
  font-weight: 600;
}

.art__tab-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  font-size: 11px;
  font-weight: 600;
  color: var(--text-3);
  background: var(--agent-surface, var(--surface));
  border: 1px solid var(--agent-border-soft, var(--border));
  border-radius: 9px;
  line-height: 1;
}

.art__tab.active .art__tab-count {
  color: var(--primary);
  background: color-mix(in srgb, var(--primary) 12%, transparent);
  border-color: color-mix(in srgb, var(--primary) 30%, transparent);
}

.art__refresh {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  font-size: 13px;
  color: var(--text-2);
  background: transparent;
  border: 1px solid var(--border);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s;
}

.art__refresh:hover {
  color: var(--text);
  border-color: var(--text-3);
}

/* ── List ── */
.art__list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.art__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 40vh;
  gap: 12px;
  color: var(--text-3);
}

.art__empty-icon {
  font-size: 48px;
  color: var(--text-3);
  opacity: 0.5;
}

/* ── Card ── */
.art__card {
  padding: 14px 16px;
  background: var(--agent-surface, var(--surface));
  border: 1px solid var(--agent-border-soft, var(--border));
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.15s;
}

.art__card:hover {
  border-color: var(--border);
  box-shadow: 0 2px 8px rgb(0 0 0 / 6%);
  transform: translateY(-1px);
}

.art__card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.art__card-status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
  background: var(--text-3);
}

.art__card-status-dot.is-running {
  background: #d97706;
  animation: art-pulse 1.2s ease-in-out infinite;
}

.art__card-status-dot.is-success,
.art__card-status-dot.is-completed {
  background: #059669;
}

.art__card-status-dot.is-failed,
.art__art__card-status-dot.is-cancelled {
  background: #dc2626;
}

.art__card-status-dot.is-waiting {
  background: #6366f1;
}

.art__card-status-dot.is-queued {
  background: #d97706;
}

.art__card-title {
  flex: 1;
  font-size: 14px;
  font-weight: 500;
  color: var(--text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.art__card-time {
  font-size: 12px;
  color: var(--text-3);
  flex-shrink: 0;
}

.art__card-body {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 12px;
  color: var(--text-2);
}

.art__card-status-text {
  font-weight: 500;
}

.art__card.is-running .art__card-status-text {
  color: #d97706;
}

.art__card.is-success .art__card-status-text {
  color: #059669;
}

.art__card.is-failed .art__card-status-text {
  color: #dc2626;
}

.art__card-progress {
  color: var(--text-3);
}

.art__card-error {
  color: #dc2626;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 300px;
}

/* Stage dots */
.art__card-stages {
  display: flex;
  gap: 4px;
  margin-top: 10px;
}

.art__card-stage-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--text-3);
  opacity: 0.3;
}

.art__card-stage-dot.is-success {
  background: #059669;
  opacity: 1;
}

.art__card-stage-dot.is-running {
  background: #d97706;
  opacity: 1;
  animation: art-pulse 1.2s ease-in-out infinite;
}

.art__card-stage-dot.is-failed,
.art__card-stage-dot.is-timeout {
  background: #dc2626;
  opacity: 1;
}

.art__card-stage-dot.is-waiting {
  background: #6366f1;
  opacity: 1;
}

@keyframes art-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

/* ── Pagination ── */
.art__pagination {
  display: flex;
  justify-content: center;
  padding: 12px 20px;
  border-top: 1px solid var(--border);
  flex-shrink: 0;
}

/* ── Dialog ── */
.art__detail-dialog :deep(.el-dialog__body) {
  padding: 0;
  overflow: hidden;
  height: calc(100vh - 54px);
}

/* ── Dark mode ── */
html.dark .art__toolbar {
  border-color: var(--agent-border-soft, var(--border));
}

html.dark .art__tab:hover {
  background: var(--agent-surface-hover, var(--surface-hover));
}

html.dark .art__tab-count {
  background: var(--agent-surface, var(--surface));
  border-color: var(--agent-border-soft, var(--border));
}
</style>
