<template>
  <div class="run-detail" v-loading="loading" element-loading-text="加载中...">
    <template v-if="runDetail">
      <!-- 头部状态 -->
      <div class="rd__header">
        <div class="rd__status-row">
          <span class="rd__status-dot" :class="`is-${runDetail.status}`" />
          <span class="rd__status-text">{{ statusText(runDetail.status) }}</span>
          <span class="rd__run-id">{{ runDetail.runId }}</span>
        </div>
        <div class="rd__meta">
          <span v-if="runDetail.input" class="rd__meta-item">
            <span class="rd__meta-label">输入</span>
            <span class="rd__meta-value">{{ runDetail.input }}</span>
          </span>
          <span class="rd__meta-item">
            <span class="rd__meta-label">创建</span>
            <span class="rd__meta-value">{{ formatTime(runDetail.createdAt) }}</span>
          </span>
          <span v-if="runDetail.startedAt" class="rd__meta-item">
            <span class="rd__meta-label">开始</span>
            <span class="rd__meta-value">{{ formatTime(runDetail.startedAt) }}</span>
          </span>
          <span v-if="runDetail.finishedAt" class="rd__meta-item">
            <span class="rd__meta-label">完成</span>
            <span class="rd__meta-value">{{ formatTime(runDetail.finishedAt) }}</span>
          </span>
        </div>

        <!-- 操作按钮 -->
        <div class="rd__actions">
          <el-button
            v-if="['running', 'queued', 'waiting'].includes(runDetail.status)"
            size="small"
            type="danger"
            @click="handleCancel"
          >
            取消任务
          </el-button>
        </div>
      </div>

      <!-- Stage 时间线 -->
      <div class="rd__timeline">
        <div class="rd__timeline-header">
          <span class="mdi mdi-pipeline rd__timeline-icon" />
          <span class="rd__timeline-title">执行管线</span>
          <span class="rd__timeline-progress">
            {{ runDetail.currentStage + 1 }}/{{ runDetail.totalStages }}
          </span>
        </div>
        <div class="rd__stages">
          <div
            v-for="(stage, idx) in runDetail.stages"
            :key="idx"
            class="rd__stage"
            :class="`is-${stage.status}`"
          >
            <div class="rd__stage-connector">
              <div class="rd__stage-dot" :class="`is-${stage.status}`" />
              <div v-if="idx < runDetail.stages.length - 1" class="rd__stage-line" />
            </div>
            <div class="rd__stage-content">
              <div class="rd__stage-header">
                <span class="rd__stage-name">{{ stage.name || stage.capabilityId }}</span>
                <span class="rd__stage-status">{{ stageStatusText(stage.status) }}</span>
                <span v-if="stage.durationMs" class="rd__stage-duration">
                  {{ formatDuration(stage.durationMs) }}
                </span>
              </div>
              <div v-if="stage.errorMessage" class="rd__stage-error">
                {{ stage.errorMessage }}
              </div>
              <div v-if="stage.output" class="rd__stage-output">
                <pre class="rd__stage-pre">{{ formatJson(stage.output) }}</pre>
              </div>
              <!-- 执行日志折叠面板 -->
              <details v-if="parseLogs(stage.logs).length" class="rd__stage-logs-details">
                <summary class="rd__stage-logs-summary">
                  <span>执行日志 ({{ parseLogs(stage.logs).length }} 条)</span>
                </summary>
                <div class="rd__stage-logs-body">
                  <div
                    v-for="(logLine, lIdx) in parseLogs(stage.logs)"
                    :key="lIdx"
                    class="rd__stage-log-line"
                  >
                    {{ logLine }}
                  </div>
                </div>
              </details>
              <!-- 审批按钮 -->
              <div v-if="stage.status === 'waiting' && runDetail.status === 'waiting'" class="rd__stage-actions">
                <el-button size="small" type="primary" @click="handleApprove(stage.stageIndex, true)">
                  直接通过
                </el-button>
                <el-button v-if="stage.output?.text" size="small" type="success" @click="openEditDialog(stage)">
                  修改文案并确认
                </el-button>
                <el-button size="small" @click="handleApprove(stage.stageIndex, false)">
                  拒绝
                </el-button>
              </div>
              <!-- 重试按钮 -->
              <div v-if="['failed', 'timeout'].includes(stage.status)" class="rd__stage-actions">
                <el-button size="small" type="warning" @click="handleRetry(stage.stageIndex)">
                  重试
                </el-button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Artifacts -->
      <div v-if="runDetail.artifacts?.length" class="rd__artifacts">
        <div class="rd__section-title">产出物</div>
        <div class="rd__artifact-list">
          <div
            v-for="artifact in runDetail.artifacts"
            :key="artifact.artifactId"
            class="rd__artifact"
          >
            <span class="rd__artifact-type">{{ artifact.type }}</span>
            <span class="rd__artifact-name">{{ artifact.name || artifact.artifactId }}</span>
            <a
              v-if="artifact.url"
              :href="artifact.url"
              target="_blank"
              class="rd__artifact-link"
            >
              下载 ↗
            </a>
            <!-- 音频播放组件 -->
            <audio
              v-if="artifact.url && (artifact.type === 'audio' || artifact.url.endsWith('.mp3') || artifact.url.endsWith('.wav'))"
              :src="artifact.url"
              controls
              class="rd__artifact-audio"
            />
            <span v-if="artifact.contentText" class="rd__artifact-text">
              {{ truncate(artifact.contentText, 200) }}
            </span>
          </div>
        </div>
      </div>

      <!-- Final Output -->
      <div v-if="runDetail.output" class="rd__output">
        <div class="rd__section-title">最终输出</div>
        <pre class="rd__output-pre">{{ formatJson(runDetail.output) }}</pre>
      </div>

      <!-- 修改文案审批弹窗 -->
      <el-dialog
        v-model="editDialogVisible"
        title="修改文案并确认通过"
        width="650px"
        append-to-body
      >
        <el-form label-position="top">
          <el-form-item label="文案内容（修改后将作为后续配音等阶段的输入）">
            <el-input
              v-model="editingText"
              type="textarea"
              :rows="12"
              placeholder="请输入修改后的文案..."
            />
          </el-form-item>
        </el-form>
        <template #footer>
          <el-button @click="editDialogVisible = false">取消</el-button>
          <el-button type="primary" :loading="approving" @click="submitEditedApproval">
            确认通过并继续
          </el-button>
        </template>
      </el-dialog>
    </template>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { AgentRunApi } from "@/api/agentRun";
import type { AgentRunDetail, AgentRunStage } from "@/api/agentRun";

const props = defineProps<{
  run: { runId: string };
}>();

const emit = defineEmits<{
  refresh: [];
  close: [];
}>();

const loading = ref(false);
const runDetail = ref<AgentRunDetail | null>(null);
const editDialogVisible = ref(false);
const editingStageIndex = ref<number>(0);
const editingText = ref("");
const approving = ref(false);

function openEditDialog(stage: AgentRunStage) {
  editingStageIndex.value = stage.stageIndex;
  editingText.value = stage.output?.text || "";
  editDialogVisible.value = true;
}

async function submitEditedApproval() {
  approving.value = true;
  try {
    await AgentRunApi.approveStage(props.run.runId, editingStageIndex.value, {
      approved: true,
      modifiedParams: { text: editingText.value },
    });
    ElMessage.success("已通过并更新文案");
    editDialogVisible.value = false;
    emit("refresh");
    fetchDetail();
  } catch (e: any) {
    ElMessage.error(e?.message || "操作失败");
  } finally {
    approving.value = false;
  }
}

async function fetchDetail() {
  loading.value = true;
  try {
    runDetail.value = await AgentRunApi.detail(props.run.runId);
  } catch (e: any) {
    ElMessage.error(e?.message || "获取详情失败");
  } finally {
    loading.value = false;
  }
}

async function handleCancel() {
  try {
    await ElMessageBox.confirm("确定要取消这个任务吗？", "提示", { type: "warning" });
    await AgentRunApi.cancel(props.run.runId);
    ElMessage.success("已取消");
    emit("refresh");
    fetchDetail();
  } catch (e: any) {
    if (e !== "cancel") ElMessage.error(e?.message || "取消失败");
  }
}

async function handleApprove(stageIndex: number, approved: boolean) {
  try {
    await AgentRunApi.approveStage(props.run.runId, stageIndex, { approved });
    ElMessage.success(approved ? "已通过" : "已拒绝");
    emit("refresh");
    fetchDetail();
  } catch (e: any) {
    ElMessage.error(e?.message || "操作失败");
  }
}

async function handleRetry(stageIndex: number) {
  try {
    await AgentRunApi.retryStage(props.run.runId, stageIndex);
    ElMessage.success("已重试");
    emit("refresh");
    fetchDetail();
  } catch (e: any) {
    ElMessage.error(e?.message || "重试失败");
  }
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

function stageStatusText(status: string): string {
  const map: Record<string, string> = {
    pending: "等待中",
    queued: "排队中",
    running: "执行中",
    success: "完成",
    failed: "失败",
    timeout: "超时",
    waiting: "待审批",
    skipped: "已跳过",
    cancelled: "已取消",
  };
  return map[status] || status;
}

function formatTime(dateStr?: string | null): string {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60_000).toFixed(1)}min`;
}

function formatJson(value: any): string {
  try {
    return typeof value === "string" ? value : JSON.stringify(value, null, 2);
  } catch {
    return String(value || "");
  }
}

function truncate(text: string, max: number): string {
  return text.length > max ? text.slice(0, max) + "..." : text;
}

function parseLogs(logs: string | string[] | null | undefined): string[] {
  if (!logs) return [];
  if (Array.isArray(logs)) return logs;
  try {
    const parsed = JSON.parse(logs);
    if (Array.isArray(parsed)) return parsed;
    return [String(parsed)];
  } catch {
    return [logs];
  }
}

onMounted(() => {
  fetchDetail();
});
</script>

<style scoped>
.run-detail {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow-y: auto;
  padding: 24px 48px;
  gap: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

/* ── Header ── */
.rd__header {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border);
}

.rd__status-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.rd__status-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--text-3);
}

.rd__status-dot.is-running {
  background: #d97706;
  animation: rd-pulse 1.2s ease-in-out infinite;
}

.rd__status-dot.is-success {
  background: #059669;
}

.rd__status-dot.is-failed,
.rd__status-dot.is-cancelled {
  background: #dc2626;
}

.rd__status-dot.is-waiting {
  background: #6366f1;
}

.rd__status-dot.is-queued {
  background: #d97706;
}

.rd__status-text {
  font-size: 14px;
  font-weight: 600;
}

.rd__run-id {
  font-family: "JetBrains Mono", monospace;
  font-size: 11px;
  color: var(--text-3);
  padding: 2px 6px;
  background: var(--surface);
  border-radius: 4px;
}

.rd__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}

.rd__meta-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.rd__meta-label {
  font-size: 11px;
  color: var(--text-3);
}

.rd__meta-value {
  font-size: 12px;
  color: var(--text-2);
}

@keyframes rd-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

/* ── Timeline ── */
.rd__timeline {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.rd__timeline-header {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
}

.rd__timeline-icon {
  font-size: 16px;
  color: #6366f1;
}

.rd__timeline-progress {
  margin-left: auto;
  font-size: 12px;
  color: var(--text-3);
  font-weight: 400;
}

.rd__stages {
  display: flex;
  flex-direction: column;
}

.rd__stage {
  display: flex;
  gap: 12px;
  position: relative;
}

.rd__stage-connector {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 16px;
  flex-shrink: 0;
}

.rd__stage-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--text-3);
  flex-shrink: 0;
  z-index: 1;
}

.rd__stage-dot.is-success {
  background: #059669;
}

.rd__stage-dot.is-running {
  background: #d97706;
  animation: rd-pulse 1.2s ease-in-out infinite;
}

.rd__stage-dot.is-failed,
.rd__stage-dot.is-timeout {
  background: #dc2626;
}

.rd__stage-dot.is-waiting {
  background: #6366f1;
}

.rd__stage-line {
  width: 2px;
  flex: 1;
  background: var(--border);
  margin: 2px 0;
}

.rd__stage-content {
  flex: 1;
  min-width: 0;
  padding-bottom: 16px;
}

.rd__stage-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.rd__stage-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--text);
}

.rd__stage-status {
  font-size: 11px;
  color: var(--text-3);
}

.rd__stage-duration {
  margin-left: auto;
  font-size: 11px;
  color: var(--text-3);
  font-variant-numeric: tabular-nums;
}

.rd__stage-error {
  margin-top: 6px;
  font-size: 12px;
  color: #dc2626;
  padding: 6px 10px;
  background: rgba(220, 38, 38, 0.04);
  border: 1px solid rgba(220, 38, 38, 0.2);
  border-radius: 6px;
}

.rd__stage-output {
  margin-top: 8px;
}

.rd__stage-pre {
  max-height: 200px;
  overflow: auto;
  padding: 10px 12px;
  margin: 0;
  font-family: "JetBrains Mono", "SF Mono", monospace;
  font-size: 11px;
  line-height: 1.5;
  color: var(--text-2);
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 6px;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.rd__stage-logs-details {
  margin-top: 8px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 6px;
  font-size: 11px;
}

.rd__stage-logs-summary {
  cursor: pointer;
  padding: 6px 10px;
  color: var(--text-3);
  font-weight: 500;
  user-select: none;
}

.rd__stage-logs-summary:hover {
  color: var(--text);
}

.rd__stage-logs-body {
  padding: 8px 10px;
  border-top: 1px solid var(--border);
  background: rgba(0, 0, 0, 0.02);
  max-height: 180px;
  overflow-y: auto;
  font-family: "JetBrains Mono", "SF Mono", monospace;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.rd__stage-log-line {
  color: var(--text-2);
  line-height: 1.4;
  word-break: break-all;
}

.rd__stage-actions {
  display: flex;
  gap: 8px;
  margin-top: 10px;
}

/* ── Artifacts ── */
.rd__artifacts {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.rd__section-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
  padding-bottom: 8px;
  border-bottom: 1px solid var(--border);
}

.rd__artifact-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.rd__artifact {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  font-size: 12px;
}

.rd__artifact-type {
  font-size: 10px;
  font-weight: 600;
  color: var(--text-3);
  text-transform: uppercase;
  padding: 2px 6px;
  background: var(--agent-border-soft, var(--surface-hover));
  border-radius: 4px;
}

.rd__artifact-name {
  flex: 1;
  color: var(--text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.rd__artifact-link {
  color: var(--primary);
  text-decoration: none;
  flex-shrink: 0;
}

.rd__artifact-link:hover {
  text-decoration: underline;
}

.rd__artifact-audio {
  height: 28px;
  max-width: 260px;
}

.rd__artifact-text {
  color: var(--text-3);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 300px;
}

/* ── Final Output ── */
.rd__output {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.rd__output-pre {
  max-height: 300px;
  overflow: auto;
  padding: 12px 14px;
  margin: 0;
  font-family: "JetBrains Mono", "SF Mono", monospace;
  font-size: 12px;
  line-height: 1.55;
  color: var(--text-2);
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
</style>
