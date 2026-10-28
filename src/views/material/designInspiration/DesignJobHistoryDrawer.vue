<template>
  <el-drawer
    v-model="drawerVisible"
    :title="`制作历史流水 - ${inspiration?.title || '未命名灵感'}`"
    size="560px"
    destroy-on-close
    class="design-job-history-drawer"
  >
    <div v-loading="loading" class="drawer-content">
      <!-- 灵感概览卡片 -->
      <div v-if="inspiration" class="inspiration-summary-card">
        <div class="summary-header">
          <span class="inspiration-badge">灵感信息</span>
          <el-tag
            :type="inspiration.priority === 0 ? 'danger' : inspiration.priority === 1 ? 'warning' : 'info'"
            size="small"
            effect="dark"
          >
            {{ inspiration.priority === 0 ? '紧急' : inspiration.priority === 1 ? '高优' : '普通' }}
          </el-tag>
          <el-tag
            :type="inspiration.autoEnabled !== false ? 'success' : 'info'"
            size="small"
            effect="plain"
          >
            {{ inspiration.autoEnabled !== false ? '自动挂机开启' : '已暂停挂机' }}
          </el-tag>
        </div>
        <div class="summary-details">
          <div class="summary-item">
            <span class="label">目标数量：</span>
            <span class="value">{{ inspiration.targetCount ? `${inspiration.targetCount} 款` : '无限持续变体' }}</span>
          </div>
          <div v-if="inspiration.sizeHint" class="summary-item">
            <span class="label">尺寸建议：</span>
            <span class="value text-highlight">{{ inspiration.sizeHint }}</span>
          </div>
          <div class="summary-item">
            <span class="label">审核统计：</span>
            <span class="value">
              <span class="stat-num pass">通过 {{ inspiration.approvedCount || 0 }}</span> /
              <span class="stat-num rework">返工 {{ inspiration.reworkCount || 0 }}</span> /
              <span class="stat-num del">删除 {{ inspiration.deletedCount || 0 }}</span>
            </span>
          </div>
        </div>
      </div>

      <!-- 刷新与操作 -->
      <div class="actions-bar">
        <div class="job-count-label">共 {{ jobs.length }} 次流水任务</div>
        <el-button size="small" :icon="Refresh" :loading="loading" @click="fetchJobs">刷新流水</el-button>
      </div>

      <!-- 任务列表 / 时间轴 -->
      <el-empty v-if="!jobs.length && !loading" description="该灵感暂无制作流水记录，可在 1s 开启自动工位开始制作" />

      <div v-else class="job-timeline">
        <div
          v-for="job in jobs"
          :key="job.id"
          class="job-card"
          :class="`job-status--${job.status}`"
        >
          <div class="job-card-header">
            <div class="job-card-type">
              <el-tag
                :type="job.jobType === 'rework' ? 'warning' : 'primary'"
                size="small"
                effect="dark"
              >
                {{ job.jobType === 'rework' ? '返工微调' : '原创制作' }}
              </el-tag>
              <el-tag
                :type="job.brainType === 'mcp_external' ? 'success' : 'info'"
                size="small"
                effect="plain"
                class="ml-1"
              >
                {{ job.brainType === 'mcp_external' ? '外部 MCP' : '1s 内置 Agent' }}
              </el-tag>
            </div>
            <div class="job-card-status">
              <span v-if="job.status === 'running'" class="status-running-badge">
                <span class="pulse-dot"></span> 制作中
              </span>
              <el-tag
                v-else-if="job.status === 'completed'"
                type="success"
                size="small"
              >
                已完成
              </el-tag>
              <el-tag
                v-else-if="job.status === 'failed'"
                type="danger"
                size="small"
              >
                失败
              </el-tag>
              <el-tag v-else type="info" size="small">{{ job.status }}</el-tag>
            </div>
          </div>

          <div class="job-card-body">
            <!-- 缩略图成果 -->
            <div v-if="job.outputPreviewUrl" class="job-preview">
              <el-image
                :src="job.outputPreviewUrl"
                :preview-src-list="[job.outputPreviewUrl]"
                preview-teleported
                fit="contain"
                class="job-thumb"
              />
            </div>

            <div class="job-info">
              <!-- 返工提示与标签 -->
              <div v-if="job.jobType === 'rework'" class="job-rework-section">
                <div v-if="job.reworkTags?.length" class="rework-tags">
                  <span class="rework-label">调整项:</span>
                  <el-tag
                    v-for="tag in job.reworkTags"
                    :key="tag"
                    size="small"
                    type="danger"
                    effect="plain"
                    class="mr-1"
                  >
                    {{ tag }}
                  </el-tag>
                </div>
                <div v-if="job.reworkPrompt" class="rework-prompt">
                  "{{ job.reworkPrompt }}"
                </div>
              </div>

              <!-- 耗时与工位信息 -->
              <div class="job-meta">
                <span v-if="job.workerId" class="meta-item">
                  工位: <code>{{ job.workerId }}</code>
                </span>
                <span v-if="job.durationMs" class="meta-item">
                  耗时: {{ Math.round(job.durationMs / 1000) }}秒
                </span>
                <span class="meta-item time">
                  {{ formatTime(job.createdAt) }}
                </span>
              </div>

              <!-- 错误信息 -->
              <div v-if="job.errorMessage" class="job-error">
                失败原因: {{ job.errorMessage }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </el-drawer>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { Refresh } from "@element-plus/icons-vue";
import { formatTimestamp } from "@/common/date";
import type { DesignInspiration } from "@/api/design-inspiration";
import {
  getDesignJobsByInspiration,
  type DesignJobRecord,
} from "@/api/design-job";

const props = defineProps<{
  modelValue: boolean;
  inspiration: DesignInspiration | null;
}>();

const emit = defineEmits<{
  (e: "update:modelValue", val: boolean): void;
}>();

const drawerVisible = computed({
  get: () => props.modelValue,
  set: (val) => emit("update:modelValue", val),
});

const loading = ref(false);
const jobs = ref<DesignJobRecord[]>([]);

function formatTime(val?: string) {
  if (!val) return "-";
  return formatTimestamp(val);
}

async function fetchJobs() {
  if (!props.inspiration?.id) return;
  loading.value = true;
  try {
    jobs.value = await getDesignJobsByInspiration(props.inspiration.id);
  } catch (error) {
    console.error("获取制作流水失败:", error);
  } finally {
    loading.value = false;
  }
}

watch(
  () => props.modelValue,
  (val) => {
    if (val && props.inspiration?.id) {
      fetchJobs();
    } else {
      jobs.value = [];
    }
  },
);
</script>

<style scoped>
.drawer-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.inspiration-summary-card {
  padding: 12px 14px;
  background: var(--el-fill-color-light);
  border-radius: 8px;
  border: 1px solid var(--el-border-color-lighter);
}

.summary-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.inspiration-badge {
  font-weight: 600;
  font-size: 13px;
  color: var(--el-text-color-primary);
}

.summary-details {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 12px;
}

.summary-item {
  display: flex;
  align-items: center;
}

.summary-item .label {
  color: var(--el-text-color-secondary);
  width: 70px;
  flex-shrink: 0;
}

.summary-item .value {
  color: var(--el-text-color-regular);
}

.text-highlight {
  color: var(--el-color-primary);
  font-weight: 500;
}

.stat-num.pass {
  color: var(--el-color-success);
  font-weight: 600;
}

.stat-num.rework {
  color: var(--el-color-warning);
  font-weight: 600;
}

.stat-num.del {
  color: var(--el-color-danger);
  font-weight: 600;
}

.actions-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 4px;
}

.job-count-label {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.job-timeline {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.job-card {
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  padding: 12px;
  background: var(--el-bg-color);
  transition: all 0.2s ease;
}

.job-card:hover {
  border-color: var(--el-color-primary-light-5);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.job-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.status-running-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  color: var(--el-color-success);
}

.pulse-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--el-color-success);
  box-shadow: 0 0 0 0 rgba(103, 194, 58, 0.7);
  animation: pulse-green 1.5s infinite;
}

@keyframes pulse-green {
  0% {
    transform: scale(0.95);
    box-shadow: 0 0 0 0 rgba(103, 194, 58, 0.7);
  }
  70% {
    transform: scale(1);
    box-shadow: 0 0 0 6px rgba(103, 194, 58, 0);
  }
  100% {
    transform: scale(0.95);
    box-shadow: 0 0 0 0 rgba(103, 194, 58, 0);
  }
}

.job-card-body {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

.job-preview {
  flex-shrink: 0;
  width: 80px;
  height: 80px;
  border-radius: 6px;
  border: 1px solid var(--el-border-color-lighter);
  background: var(--el-fill-color-light, #f8fafc);
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

:global(html.dark) .job-preview {
  background: rgba(255, 255, 255, 0.04);
}

.job-thumb {
  width: 100%;
  height: 100%;
}

.job-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 12px;
}

.job-rework-section {
  background: var(--el-color-danger-light-9, #fef0f0);
  padding: 6px 8px;
  border-radius: 4px;
  border-left: 3px solid var(--el-color-danger);
}

:global(html.dark) .job-rework-section {
  background: rgba(245, 108, 108, 0.15);
}

.rework-tags {
  margin-bottom: 4px;
}

.rework-label {
  font-size: 11px;
  color: var(--el-color-danger);
  margin-right: 4px;
}

.rework-prompt {
  font-size: 12px;
  color: var(--el-text-color-primary);
  font-style: italic;
}

.job-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  color: var(--el-text-color-secondary);
  font-size: 11px;
}

.job-meta code {
  background: var(--el-fill-color-darker);
  padding: 1px 4px;
  border-radius: 3px;
}

.meta-item.time {
  margin-left: auto;
}

.job-error {
  color: var(--el-color-danger);
  font-size: 11px;
}
</style>
