<template>
  <ContentWrap :plain="true">
    <div class="image-analysis-page">
      <!-- 左侧：操作区 -->
      <div class="analysis-left">
        <!-- 图片上传区 -->
        <div class="upload-section">
          <div class="section-label">图片上传</div>

          <!-- 空状态：大面积拖拽区 -->
          <div
            class="drop-zone"
            :class="{ 'is-drag-over': isDragOver }"
            @dragover.prevent="isDragOver = true"
            @dragleave.prevent="isDragOver = false"
            @drop.prevent="handleDropFiles"
            @click="triggerUpload"
          >
            <input
              ref="fileInputRef"
              type="file"
              accept="image/*"
              multiple
              style="display: none"
              @change="handleFileInputChange"
            />
            <div v-if="!uploadedImages.length" class="drop-zone__empty">
              <div class="drop-zone__title">拖拽图片到此处，或点击选择</div>
              <div class="drop-zone__tip">支持 jpg / png / webp，最多 5 张</div>
            </div>
            <div v-else class="drop-zone__hint">
              继续添加（{{ uploadedImages.length }}/5）
            </div>
          </div>

          <!-- 已上传图片网格 -->
          <div v-if="uploadedImages.length" class="image-grid">
            <div v-for="(img, idx) in uploadedImages" :key="idx" class="image-grid__item">
              <el-image
                :src="img.url"
                :preview-src-list="uploadedImages.map(i => i.url)"
                :initial-index="idx"
                fit="cover"
                class="image-grid__img"
              />
              <div class="image-grid__overlay">
                <el-icon
                  class="image-grid__remove"
                  :size="16"
                  @click.stop="removeImage(idx)"
                ><Close /></el-icon>
              </div>
              <div v-if="img.uploading" class="image-grid__status">
                <el-icon class="is-loading" :size="14"><Loading /></el-icon>
              </div>
            </div>
          </div>
        </div>

        <!-- 分析配置 -->
        <div class="config-section">
          <div class="section-label">分析配置</div>

          <el-form label-position="top" class="analysis-form">
            <el-form-item label="提示词模板">
              <el-select
                v-model="selectedTemplate"
                placeholder="选择预设模板"
                clearable
                size="small"
                style="width: 100%"
                @change="applyTemplate"
              >
                <el-option
                  v-for="tpl in promptTemplates"
                  :key="tpl.label"
                  :label="tpl.label"
                  :value="tpl.value"
                />
              </el-select>
            </el-form-item>

            <el-form-item label="分析提示词">
              <el-input
                v-model="prompt"
                type="textarea"
                :rows="4"
                placeholder="请输入你希望 AI 分析的内容，例如：分析这张图片的设计元素、配色方案和适用场景"
              />
            </el-form-item>

            <el-form-item label="角色设定（可选）">
              <el-input
                v-model="systemPrompt"
                type="textarea"
                :rows="2"
                placeholder="例如：你是一个专业的视觉设计师"
              />
            </el-form-item>
          </el-form>

          <div class="analyze-btn-wrap">
            <el-button
              type="primary"
              :loading="analyzing"
              :disabled="!canAnalyze"
              class="analyze-btn"
              @click="handleAnalyze"
            >
              {{ analyzing ? '分析中...' : '开始分析' }}
            </el-button>
          </div>
        </div>
      </div>

      <!-- 右侧：结果区 -->
      <div class="analysis-right">
        <div class="result-section">
          <div class="result-header">
            <div class="section-label" style="margin-bottom: 0;">分析结果</div>
            <el-button
              v-if="result"
              type="primary"
              link
              size="small"
              @click="copyResult"
            >
              复制
            </el-button>
          </div>

          <div v-if="analyzing" class="result-loading">
            <el-icon class="is-loading" :size="32"><Loading /></el-icon>
            <p>AI 正在分析图片，请稍候...</p>
          </div>

          <div v-else-if="result" class="markdown-body" v-html="renderedResult" />

          <el-empty v-else description="上传图片并填写提示词后，点击「开始分析」" :image-size="80" />
        </div>
      </div>
    </div>

    <!-- 底部：分析记录 -->
    <div class="list-page-table-panel" style="margin-top: 14px;">
      <div class="list-page-table-panel__body">
        <div class="resource-toolbar" style="padding-bottom: 12px;">
          <div class="resource-toolbar__summary">
            <div class="resource-toolbar__title">分析记录</div>
          </div>
          <div class="resource-toolbar__actions">
            <el-button
              v-if="selectedRecords.length"
              type="danger"
              size="small"
              @click="handleBatchDelete"
            >
              批量删除 ({{ selectedRecords.length }})
            </el-button>
            <el-input
              v-model="historySearch"
              placeholder="搜索提示词或结果"
              clearable
              size="small"
              style="width: 220px"
              @keyup.enter="loadRecords"
              @clear="loadRecords"
            >
              <template #prefix>
                <el-icon><Search /></el-icon>
              </template>
            </el-input>
          </div>
        </div>

        <div class="common-table">
          <vxe-grid
            v-bind="historyGridOptions"
            :data="records"
            :loading="recordsLoading"
            @checkbox-change="handleCheckboxChange"
            @checkbox-all="handleCheckboxAll"
          >
            <template #imagesSlot="{ row }">
              <div class="table-image-group">
                <el-image
                  v-for="(url, idx) in (row.imageUrls || []).slice(0, 3)"
                  :key="idx"
                  :src="url"
                  fit="cover"
                  class="table-thumb table-thumb--sm"
                  :preview-src-list="row.imageUrls"
                  :initial-index="idx"
                />
                <span v-if="(row.imageUrls || []).length > 3" class="table-thumb-count">
                  +{{ row.imageUrls.length - 3 }}
                </span>
              </div>
            </template>

            <template #promptSlot="{ row }">
              <el-tooltip :content="row.prompt" placement="top" :show-after="300">
                <div class="table-cell-text clamp-2">{{ row.prompt }}</div>
              </el-tooltip>
            </template>

            <template #resultSlot="{ row }">
              <el-tooltip placement="top" :show-after="300" raw-content popper-class="record-result-tooltip">
                <template #content>
                  <div class="record-result-preview" v-html="renderMarkdown(truncate(row.result, 300))" />
                </template>
                <div class="table-cell-text clamp-2">{{ truncate(row.result, 80) }}</div>
              </el-tooltip>
            </template>

            <template #operationSlot="{ row }">
              <div class="table-operation-column">
                <el-button type="primary" link size="small" @click="viewRecord(row)">查看</el-button>
                <el-button type="danger" link size="small" @click="handleDeleteRecord(row)">删除</el-button>
              </div>
            </template>
          </vxe-grid>
        </div>
      </div>

      <div class="list-page-table-panel__pagination list-page-table-panel__pagination--flat">
        <el-pagination
          v-model:current-page="recordPage"
          v-model:page-size="recordPageSize"
          :total="recordTotal"
          :page-sizes="[10, 20, 50]"
          layout="total, sizes, prev, pager, next"
          @current-change="loadRecords"
          @size-change="loadRecords"
        />
      </div>
    </div>

    <!-- 查看记录详情弹窗 -->
    <el-dialog
      v-model="detailVisible"
      title="分析记录详情"
      width="900px"
      :destroy-on-close="true"
    >
      <div v-if="detailRecord" class="detail-content">
        <div>
          <div class="section-label">原始图片</div>
          <div class="detail-images">
            <el-image
              v-for="(url, idx) in detailRecord.imageUrls"
              :key="idx"
              :src="url"
              fit="contain"
              class="detail-image"
              :preview-src-list="detailRecord.imageUrls"
              :initial-index="idx"
            />
          </div>
        </div>

        <div>
          <div class="section-label">分析信息</div>
          <el-descriptions :column="1" border size="small">
            <el-descriptions-item label="提示词">{{ detailRecord.prompt }}</el-descriptions-item>
            <el-descriptions-item v-if="detailRecord.systemPrompt" label="角色设定">
              {{ detailRecord.systemPrompt }}
            </el-descriptions-item>
            <el-descriptions-item label="分析时间">
              {{ formatTime(detailRecord.createdAt) }}
            </el-descriptions-item>
          </el-descriptions>
        </div>

        <div>
          <div class="section-label">分析结果</div>
          <div class="markdown-body detail-result" v-html="renderedDetailResult" />
        </div>
      </div>
    </el-dialog>
  </ContentWrap>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useWindowSize } from "@vueuse/core";
import { ElMessage, ElMessageBox } from "element-plus";
import {
  Loading,
  Search,
  Close,
} from "@element-plus/icons-vue";
import { marked } from "marked";
import { useUserStore } from "@/store/modules/user";
import { uploadToCOS } from "@/api/cos";
import {
  analyzeImageAndRecord,
  getAnalysisRecords,
  deleteAnalysisRecord,
  batchDeleteAnalysisRecords,
} from "@/api/ai/analysis";
import { commonGridOptions } from "@/common/table";

defineOptions({ name: "AiImageAnalysis" });

// ── State ──
const userStore = useUserStore();
const fileInputRef = ref<HTMLInputElement>();
const isDragOver = ref(false);
const uploadedImages = ref<{ url: string; key: string; uploading?: boolean }[]>([]);
const prompt = ref("");
const systemPrompt = ref("");
const selectedTemplate = ref("");
const analyzing = ref(false);
const result = ref("");
const detailVisible = ref(false);
const detailRecord = ref<any>(null);

// ── History ──
const records = ref<any[]>([]);
const recordsLoading = ref(false);
const recordPage = ref(1);
const recordPageSize = ref(20);
const recordTotal = ref(0);
const historySearch = ref("");
const selectedRecords = ref<any[]>([]);

// ── Prompt Templates ──
const promptTemplates = [
  {
    label: "设计元素分析",
    value: "请分析这张图片中的设计元素，包括：构图方式、视觉层次、主要图形元素、排版特点。给出专业且详细的分析。",
  },
  {
    label: "配色方案分析",
    value: "请分析这张图片的配色方案，包括：主色调、辅助色、点缀色、色彩搭配类型（互补/类似/三色等）、色彩情感传达。给出具体的色值建议。",
  },
  {
    label: "风格识别",
    value: "请识别这张图片的设计风格，包括：整体风格定位（如极简、复古、赛博朋克等）、风格特征描述、适合的应用场景。",
  },
  {
    label: "适用场景分析",
    value: "请分析这张图片适合应用在哪些场景中，包括：适合的产品类型、适合的电商平台、适合的目标受众、可能的使用方式（主图/详情页/Banner等）。",
  },
  {
    label: "综合设计概览",
    value: "请对这张图片进行全面的设计分析，包括：设计元素、配色方案、风格定位、适用场景、目标受众、以及改进建议。请用结构化的方式呈现。",
  },
  {
    label: "素材标签生成",
    value: "请为这张图片生成一组适合用于素材库的标签，包括：中文标签、英文标签、分类建议、适用行业。标签应覆盖风格、颜色、主题、元素等维度。",
  },
];

// ── Computed ──
const canAnalyze = computed(() => {
  const hasUploading = uploadedImages.value.some((img) => img.uploading);
  return uploadedImages.value.length > 0 && prompt.value.trim() && !analyzing.value && !hasUploading;
});

const renderedResult = computed(() => renderMarkdown(result.value));
const renderedDetailResult = computed(() => renderMarkdown(detailRecord.value?.result || ""));

const { height } = useWindowSize();

const historyGridOptions = computed(() => ({
  ...commonGridOptions,
  maxHeight: Math.max(height.value - 280, 360),
  columns: [
    { type: "checkbox", width: 50 },
    { type: "seq", title: "#", width: 50 },
    {
      field: "imageUrls",
      title: "图片",
      width: 160,
      slots: { default: "imagesSlot" },
    },
    {
      field: "prompt",
      title: "提示词",
      minWidth: 200,
      slots: { default: "promptSlot" },
    },
    {
      field: "result",
      title: "分析结果",
      minWidth: 250,
      slots: { default: "resultSlot" },
    },
    {
      field: "createdAt",
      title: "时间",
      width: 170,
      formatter: ({ row }: any) => formatTime(row.createdAt),
    },
    {
      title: "操作",
      width: 120,
      fixed: "right",
      slots: { default: "operationSlot" },
    },
  ],
}));

// ── Methods ──
function renderMarkdown(content: string): string {
  if (!content) return "";
  try {
    return marked(content, { breaks: true }) as string;
  } catch {
    return content;
  }
}

function formatTime(date: string | Date): string {
  if (!date) return "-";
  const d = new Date(date);
  return d.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function truncate(text: string, maxLen: number): string {
  if (!text) return "";
  return text.length > maxLen ? text.slice(0, maxLen) + "..." : text;
}

function applyTemplate() {
  if (selectedTemplate.value) {
    prompt.value = selectedTemplate.value;
  }
}

function triggerUpload() {
  fileInputRef.value?.click();
}

function handleDropFiles(e: DragEvent) {
  isDragOver.value = false;
  const files = e.dataTransfer?.files;
  if (!files?.length) return;
  processFiles(Array.from(files));
}

function handleFileInputChange(e: Event) {
  const input = e.target as HTMLInputElement;
  if (input.files?.length) {
    processFiles(Array.from(input.files));
  }
  // 重置 input 以支持重复选择同一文件
  input.value = "";
}

async function processFiles(files: File[]) {
  const remaining = 5 - uploadedImages.value.length;
  if (remaining <= 0) {
    ElMessage.warning("最多上传 5 张图片");
    return;
  }
  const toUpload = files.slice(0, remaining);
  if (files.length > remaining) {
    ElMessage.warning(`最多上传 5 张图片，已自动截取前 ${remaining} 张`);
  }

  for (const raw of toUpload) {
    if (!raw.type.startsWith("image/")) {
      ElMessage.warning(`"${raw.name}" 不是图片文件，已跳过`);
      continue;
    }
    // 创建临时预览
    const tempUrl = URL.createObjectURL(raw);
    const entry = { url: tempUrl, key: "", uploading: true };
    uploadedImages.value.push(entry);
    const entryIdx = uploadedImages.value.indexOf(entry);

    try {
      const user = userStore.user as any;
      const { url, key } = await uploadToCOS({
        file: raw,
        category: "ai-image-analysis",
        account: user?.account || user?.shortName || "user",
        userId: user?.id,
      });
      // 替换临时 URL 为真实 COS URL
      uploadedImages.value[entryIdx] = { url, key, uploading: false };
      URL.revokeObjectURL(tempUrl);
    } catch (error: any) {
      // 移除失败项
      uploadedImages.value.splice(entryIdx, 1);
      URL.revokeObjectURL(tempUrl);
      ElMessage.error(`"${raw.name}" 上传失败: ${error.message}`);
    }
  }
}

function removeImage(idx: number) {
  uploadedImages.value.splice(idx, 1);
}

async function handleAnalyze() {
  if (!canAnalyze.value) return;

  analyzing.value = true;
  result.value = "";

  try {
    const imageUrls = uploadedImages.value.map((img) => img.url);
    const res = await analyzeImageAndRecord({
      prompt: prompt.value,
      imageUrls,
      systemPrompt: systemPrompt.value || undefined,
    });

    // 后端 TransformInterceptor 会将 { result: xxx } 解包为 xxx
    // res 可能是字符串（被解包）或对象（未被解包），兼容两种情况
    const text = typeof res === "string" ? res : (res?.result ?? "");
    result.value = text || "分析完成，但未返回结果";
    ElMessage.success("分析完成");
    loadRecords();
  } catch (error: any) {
    ElMessage.error(`分析失败: ${error.message}`);
    result.value = `**分析失败**: ${error.message}`;
  } finally {
    analyzing.value = false;
  }
}

function copyResult() {
  if (!result.value) return;
  navigator.clipboard.writeText(result.value).then(() => {
    ElMessage.success("已复制到剪贴板");
  });
}

// ── History ──
async function loadRecords() {
  recordsLoading.value = true;
  try {
    const res = await getAnalysisRecords({
      currentPage: recordPage.value,
      pageSize: recordPageSize.value,
      searchText: historySearch.value || undefined,
    });
    records.value = res.list || [];
    recordTotal.value = res.total || 0;
    selectedRecords.value = [];
  } catch (error: any) {
    ElMessage.error(`加载记录失败: ${error.message}`);
  } finally {
    recordsLoading.value = false;
  }
}

function viewRecord(row: any) {
  detailRecord.value = row;
  detailVisible.value = true;
}

async function handleDeleteRecord(row: any) {
  try {
    await ElMessageBox.confirm(
      "确定要删除这条分析记录吗？关联的 COS 图片文件也会被同步删除。",
      "确认删除",
      { type: "warning" },
    );
    const res = await deleteAnalysisRecord(row.id);
    if (res?.failedCosFiles > 0) {
      ElMessage.warning(res.message || `已删除记录，但有 ${res.failedCosFiles} 个 COS 文件删除失败`);
    } else {
      ElMessage.success("删除成功");
    }
    loadRecords();
  } catch (error: any) {
    if (error !== "cancel") {
      ElMessage.error(`删除失败: ${error.message}`);
    }
  }
}

async function handleBatchDelete() {
  if (!selectedRecords.value.length) {
    ElMessage.warning("请先选择要删除的记录");
    return;
  }
  try {
    await ElMessageBox.confirm(
      `确定要删除选中的 ${selectedRecords.value.length} 条分析记录吗？关联的 COS 图片文件也会被同步删除。`,
      "批量确认删除",
      { type: "warning" },
    );
    const ids = selectedRecords.value.map((r) => r.id);
    const res = await batchDeleteAnalysisRecords(ids);
    if (res?.failedCosFiles > 0) {
      ElMessage.warning(res.message || `已删除记录，但有 ${res.failedCosFiles} 个 COS 文件删除失败`);
    } else {
      ElMessage.success(`成功删除 ${ids.length} 条记录`);
    }
    selectedRecords.value = [];
    loadRecords();
  } catch (error: any) {
    if (error !== "cancel") {
      ElMessage.error(`批量删除失败: ${error.message}`);
    }
  }
}

function handleCheckboxChange({ records }: any) {
  selectedRecords.value = records;
}

function handleCheckboxAll({ records }: any) {
  selectedRecords.value = records;
}

// ── Init ──
onMounted(() => {
  loadRecords();
});
</script>

<style scoped>


/* ── Responsive ── */
@media (width <= 900px) {
  .image-analysis-page {
    flex-direction: column;
  }

  .analysis-left {
    width: 100%;
  }
}

.image-analysis-page {
  display: flex;
  gap: 24px;
  align-items: flex-start;
}

.analysis-left {
  display: flex;
  width: 440px;
  flex-shrink: 0;
  flex-direction: column;
  gap: 20px;
}

.analysis-right {
  flex: 1;
  min-width: 0;
}

/* ── Section Label ── */
.section-label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 10px;
  font-size: 13px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.section-label::before {
  width: 3px;
  height: 12px;
  background: var(--el-color-primary);
  border-radius: 999px;
  content: "";
}

/* ── Drop Zone ── */
.drop-zone {
  position: relative;
  display: flex;
  min-height: 140px;
  padding: 24px 16px;
  cursor: pointer;
  background: var(--app-content-surface-color, var(--el-fill-color-lighter));
  border: 2px dashed var(--app-content-border-color);
  border-radius: 12px;
  transition: all 0.2s ease;
  align-items: center;
  justify-content: center;
}

.drop-zone:hover {
  background: var(--el-color-primary-light-9);
  border-color: var(--el-color-primary-light-5);
}

.drop-zone.is-drag-over {
  background: var(--el-color-primary-light-9);
  border-color: var(--el-color-primary);
  box-shadow: 0 0 0 3px var(--el-color-primary-light-8);
}

.drop-zone__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  pointer-events: none;
}

.drop-zone__title {
  font-size: 14px;
  font-weight: 500;
  color: var(--el-text-color-primary);
}

.drop-zone__title em {
  font-style: normal;
  color: var(--el-color-primary);
}

.drop-zone__tip {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.drop-zone__hint {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--el-text-color-secondary);
  pointer-events: none;
}

/* ── Image Grid ── */
.image-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(88px, 1fr));
  gap: 8px;
  margin-top: 10px;
}

.image-grid__item {
  position: relative;
  overflow: hidden;
  border: 1px solid var(--app-content-border-color);
  border-radius: 8px;
  aspect-ratio: 1;
}

.image-grid__img {
  width: 100%;
  height: 100%;
}

.image-grid__overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: flex-start;
  justify-content: flex-end;
  padding: 4px;
  background: linear-gradient(180deg, rgb(0 0 0 / 24%) 0%, transparent 40%);
  opacity: 0;
  transition: opacity 0.15s ease;
}

.image-grid__item:hover .image-grid__overlay {
  opacity: 1;
}

.image-grid__remove {
  display: flex;
  width: 22px;
  height: 22px;
  color: #fff;
  cursor: pointer;
  background: rgb(0 0 0 / 50%);
  border-radius: 50%;
  transition: background 0.15s;
  align-items: center;
  justify-content: center;
}

.image-grid__remove:hover {
  background: var(--el-color-danger);
}

.image-grid__status {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgb(0 0 0 / 35%);
}

/* ── Form ── */
.analysis-form :deep(.el-form-item) {
  margin-bottom: 14px;
}

.analysis-form :deep(.el-form-item:last-child) {
  margin-bottom: 0;
}

.analysis-form :deep(.el-form-item__label) {
  padding-bottom: 4px;
  font-size: 12px;
  font-weight: 500;
  line-height: 1.2;
  color: var(--el-text-color-secondary);
}

.analyze-btn-wrap {
  padding-top: 12px;
  margin-top: 4px;
  border-top: 1px solid var(--app-content-border-color);
}

.analyze-btn {
  width: 100%;
  height: 40px;
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0.5px;
  border-radius: 8px;
}

/* ── Result ── */
.result-section {
  min-height: 400px;
}

.result-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}

.result-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 0;
  color: var(--el-text-color-secondary);
}

.result-loading p {
  margin-top: 12px;
  font-size: 13px;
}

/* ── Markdown ── */
.markdown-body {
  font-size: 13px;
  line-height: 1.8;
}

.markdown-body :deep(h1) {
  padding-bottom: 8px;
  margin: 20px 0 12px;
  font-size: 20px;
  font-weight: 600;
  border-bottom: 1px solid var(--app-content-border-color);
}

.markdown-body :deep(h2) {
  margin: 16px 0 10px;
  font-size: 17px;
  font-weight: 600;
}

.markdown-body :deep(h3) {
  margin: 12px 0 8px;
  font-size: 14px;
  font-weight: 600;
}

.markdown-body :deep(p) {
  margin: 6px 0;
}

.markdown-body :deep(ul),
.markdown-body :deep(ol) {
  padding-left: 22px;
  margin: 6px 0;
}

.markdown-body :deep(li) {
  margin: 3px 0;
}

.markdown-body :deep(table) {
  width: 100%;
  margin: 10px 0;
  border-collapse: collapse;
}

.markdown-body :deep(th),
.markdown-body :deep(td) {
  padding: 6px 10px;
  font-size: 12px;
  text-align: left;
  border: 1px solid var(--app-content-border-color);
}

.markdown-body :deep(th) {
  font-weight: 600;
  background: var(--app-content-surface-muted-color);
}

.markdown-body :deep(blockquote) {
  padding: 6px 14px;
  margin: 10px 0;
  background: var(--app-content-surface-muted-color);
  border-left: 4px solid var(--el-color-primary);
  border-radius: 0 6px 6px 0;
}

.markdown-body :deep(code) {
  padding: 2px 5px;
  font-family: monospace;
  font-size: 12px;
  background: var(--app-content-surface-muted-color);
  border-radius: 3px;
}

.markdown-body :deep(pre) {
  padding: 12px;
  overflow-x: auto;
  background: #1a1a2e;
  border-radius: 8px;
}

.markdown-body :deep(pre code) {
  padding: 0;
  font-size: 12px;
  color: #e0e0e0;
  background: none;
}

/* ── Detail Dialog ── */
.detail-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-height: 70vh;
  overflow-y: auto;
}

.detail-images {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.detail-image {
  max-width: 180px;
  max-height: 180px;
  border: 1px solid var(--app-content-border-color);
  border-radius: 8px;
}

.detail-result {
  padding: 0;
}
</style>
