<template>
  <div class="multi-image-upload-container">
    <div
      class="image-preview-container"
      :class="{ 'is-drag-over': isDragOver }"
      @dragover.prevent="handleDragOver"
      @dragleave="handleDragLeave"
      @drop.prevent="handleDropFiles"
    >
      <div v-if="fileList.length" class="image-preview-list">
        <div v-for="(file, index) in fileList" :key="file.uid" class="image-preview-item">
          <div class="preview-media">
            <el-image
              :src="usePreview ? file.url : ''"
              alt="preview"
              :lazy="true"
              class="preview-image"
              loading="lazy"
              fit="contain"
            >
              <template #error>
                <div class="image-error-state">
                  <el-icon size="28" color="var(--el-text-color-secondary)">
                    <PictureFilled />
                  </el-icon>
                  <span>{{ usePreview ? "预览加载失败" : "已关闭图片预览" }}</span>
                </div>
              </template>
            </el-image>

            <div class="actions">
              <el-icon v-if="file.status !== 'uploading'" size="18" @click="handleRemove(index)">
                <Close />
              </el-icon>
            </div>

            <div v-if="file.status === 'uploading'" class="status uploading">
              <el-icon class="loading-icon">
                <Loading />
              </el-icon>
              上传中...
            </div>
            <div v-if="file.status === 'fail'" class="status fail" @click="handleRetry(index)">
              上传失败，点击重试
            </div>
            <div v-if="file.status === 'success'" class="status success">上传成功</div>
          </div>

          <div class="preview-details">
            <div class="preview-fields">
              <el-input v-model="file.name" size="small" placeholder="图片名称" />
              <el-input
                v-model="file.description"
                size="small"
                type="textarea"
                :rows="2"
                placeholder="图片描述"
              />
              <el-input
                v-model="file.keywords"
                size="small"
                placeholder="关键词（用英文逗号分隔）"
              />
            </div>

            <div class="preview-footer">
              <div v-if="file.rename" class="rename-tag">
                <el-tag round size="small" type="primary" effect="light">
                  重命名: {{ file.rename }}
                </el-tag>
              </div>

              <div class="file-info-tags">
                <el-tag round size="small" type="info" effect="light">
                  {{ `${(file.size / 1024 / 1024).toFixed(2)}Mb` }}
                </el-tag>
                <el-tag
                  v-if="file.width > 0 && file.height > 0"
                  round
                  size="small"
                  type="info"
                  effect="light"
                >
                  {{ file.width }} x {{ file.height }}
                </el-tag>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-else class="empty-state">
        <div class="empty-state-icon">
          <el-icon size="32">
            <PictureFilled />
          </el-icon>
        </div>
        <div class="empty-state-title">还没有待上传的图片</div>
        <div class="empty-state-desc">点击右侧“选择图片”，或直接拖拽图片到这里。</div>
      </div>
    </div>

    <div class="operation-container">
      <div class="operation-card">
        <div class="section-title">上传概览</div>
        <div class="stats-grid">
          <div class="stat-item">
            <span class="stat-label">已选择</span>
            <span class="stat-value is-primary">{{ totalCount }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">成功</span>
            <span class="stat-value is-success">{{ successCount }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">失败</span>
            <span class="stat-value is-danger">{{ failCount }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">上传中</span>
            <span class="stat-value is-warning">{{ loadingCount }}</span>
          </div>
        </div>

        <el-progress
          class="upload-progress"
          :format="() => `${successCount}/${totalCount}`"
          :text-inside="true"
          :stroke-width="20"
          :percentage="totalCount ? (successCount / totalCount) * 100 : totalCount"
          :striped-flow="someLoading"
          :striped="someLoading"
          :status="totalCount > 0 && totalCount === successCount ? 'success' : 'warning'"
        />
      </div>

      <div class="operation-card">
        <div class="section-title">批量操作</div>
        <div class="action-stack">
          <input
            ref="folderInputRef"
            class="folder-input"
            type="file"
            accept="image/*"
            multiple
            webkitdirectory
            directory
            @change="handleFolderChange"
          />
          <el-upload
            action="#"
            accept="image/*"
            list-type="text"
            :auto-upload="false"
            :on-change="handleFileChange"
            :show-file-list="false"
            multiple
          >
            <el-button class="action-btn" type="primary" plain :icon="UploadFilled">选择图片</el-button>
          </el-upload>
          <el-button class="action-btn" plain :icon="FolderOpened" @click="openFolderPicker">
            选择文件夹
          </el-button>
          <el-button class="action-btn" type="primary" :disabled="totalCount === 0" @click="handleUpload">
            上传
          </el-button>
          <el-button class="action-btn" type="danger" plain :disabled="totalCount === 0" @click="handleClear">
            清空
          </el-button>
        </div>
      </div>

      <div class="operation-card">
        <div class="section-title">上传选项</div>
        <div class="switch-list">
          <div class="switch-row">
            <div class="switch-copy">
              <div class="switch-title">开启图片预览</div>
              <div class="switch-desc">关闭后可减少本地资源占用，适合一次性批量上传。</div>
            </div>
            <el-switch v-model="usePreview" size="small" />
          </div>
          <div class="switch-row">
            <div class="switch-copy">
              <div class="switch-title">AI 自动补全内容</div>
              <div class="switch-desc">上传后自动补全名称、描述和关键词，适合素材整理。</div>
            </div>
            <el-switch v-model="useAiGenerate" size="small" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from "vue";
import type { PropType } from "vue";
import type { UploadFile } from "element-plus";
import { ElMessage, ElNotification } from "element-plus";
import { Close, FolderOpened, Loading, PictureFilled, UploadFilled } from "@element-plus/icons-vue";
import { useLocalStorage } from "@vueuse/core";
import { uploadToCOS } from "@/api/cos";
import { uploadMaterialFile } from "@/api/material";
import { useUserStore } from "@/store/modules/user";

interface UploadInfo {
  path?: string;
}

type UploadStatus = "waiting" | "uploading" | "success" | "fail";

interface UploadImageItem {
  uid: string | number;
  name: string;
  nameEn: string;
  url: string;
  size: number;
  raw: File;
  relativePath?: string;
  width: number;
  height: number;
  rename: string;
  status: UploadStatus;
  description: string;
  descriptionEn: string;
  keywords: string;
  keywordsEn: string;
}

const userStore = useUserStore();

defineProps({
  currentUploadInfo: {
    type: Object as PropType<UploadInfo>,
    default: () => ({ path: "" }),
  },
});

const emits = defineEmits<{
  "single-file-uploaded": [{ useAiGenerate: boolean }];
}>();

const fileList = ref<UploadImageItem[]>([]);
const folderInputRef = ref<HTMLInputElement | null>(null);
const isDragOver = ref(false);
const usePreview = useLocalStorage("material-upload:use-preview", true);
const useAiGenerate = useLocalStorage("material-upload:use-ai-generate", false);

const totalCount = computed(() => fileList.value.length);
const successCount = computed(
  () => fileList.value.filter((file) => file.status === "success").length,
);
const loadingCount = computed(
  () => fileList.value.filter((file) => file.status === "uploading").length,
);
const failCount = computed(() => fileList.value.filter((file) => file.status === "fail").length);
const someLoading = computed(() => fileList.value.some((item) => item.status === "uploading"));

const getImageDimensions = (file: File): Promise<{ width: number; height: number }> => {
  return new Promise((resolve) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve({
        width: img.naturalWidth || img.width,
        height: img.naturalHeight || img.height,
      });
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve({ width: 0, height: 0 });
    };

    img.src = objectUrl;
  });
};

const isImageFile = (file: File) => {
  if (file.type?.startsWith("image/")) {
    return true;
  }
  return /\.(apng|avif|bmp|gif|ico|jpe?g|jfif|pjpeg|pjp|png|svg|webp)$/i.test(file.name || "");
};

const buildFileUid = (file: File, fallback?: string | number) => {
  const relativePath = String((file as any).webkitRelativePath || "").trim();
  return fallback || `${relativePath || file.name}-${file.size}-${file.lastModified}`;
};

const buildAiGenerateRawInfo = (file: UploadImageItem) => {
  const sourceName = file.raw?.name || file.name || "";
  const nameWithoutExt = sourceName.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim();
  const parts = [
    `原始文件名：${sourceName}`,
    nameWithoutExt ? `从文件名提取的可读名称：${nameWithoutExt}` : "",
    file.relativePath ? `所在路径：${file.relativePath}` : "",
    file.width && file.height ? `图片尺寸：${file.width}x${file.height}px` : "",
    file.name && file.name !== sourceName ? `用户填写名称：${file.name}` : "",
    file.nameEn ? `用户填写英文名称：${file.nameEn}` : "",
    file.description ? `用户填写描述：${file.description}` : "",
    file.descriptionEn ? `用户填写英文描述：${file.descriptionEn}` : "",
    file.keywords ? `用户填写关键词：${file.keywords}` : "",
    file.keywordsEn ? `用户填写英文关键词：${file.keywordsEn}` : "",
  ].filter(Boolean);

  return parts.join("\n");
};

const appendRawFile = async (rawFile: File, uid?: string | number) => {
  if (!rawFile || !isImageFile(rawFile)) return false;

  const relativePath = String((rawFile as any).webkitRelativePath || "").trim();
  const url = URL.createObjectURL(rawFile);
  const info = await getImageDimensions(rawFile);

  fileList.value.push({
    uid: buildFileUid(rawFile, uid),
    name: rawFile.name,
    nameEn: "",
    url,
    size: rawFile.size,
    raw: rawFile,
    relativePath,
    width: info.width,
    height: info.height,
    rename: "",
    status: "waiting",
    description: "",
    descriptionEn: "",
    keywords: "",
    keywordsEn: "",
  });

  return true;
};

const handleFileChange = async (file: UploadFile) => {
  const rawFile = file.raw as File | undefined;
  if (!rawFile) return;
  await appendRawFile(rawFile, file.uid);
};

const openFolderPicker = () => {
  folderInputRef.value?.click();
};

const handleFolderChange = async (event: Event) => {
  const input = event.target as HTMLInputElement;
  const files = Array.from(input.files || []).filter(isImageFile);
  input.value = "";

  if (!files.length) {
    ElMessage.warning("文件夹里没有可上传的图片文件");
    return;
  }

  let addedCount = 0;
  for (const file of files) {
    if (await appendRawFile(file)) {
      addedCount += 1;
    }
  }

  ElMessage.success(`已从文件夹选择 ${addedCount} 张图片`);
};

const handleDragOver = () => {
  isDragOver.value = true;
};

const handleDragLeave = (event: DragEvent) => {
  const target = event.currentTarget as HTMLElement | null;
  const related = event.relatedTarget as Node | null;
  if (!target || !related || !target.contains(related)) {
    isDragOver.value = false;
  }
};

const handleDropFiles = async (event: DragEvent) => {
  isDragOver.value = false;
  const files = Array.from(event.dataTransfer?.files || []).filter(isImageFile);

  if (!files.length) {
    ElMessage.warning("请拖入图片文件");
    return;
  }

  let addedCount = 0;
  for (const file of files) {
    if (await appendRawFile(file)) {
      addedCount += 1;
    }
  }

  ElMessage.success(`已添加 ${addedCount} 张图片`);
};

const revokeFileUrl = (index: number) => {
  const current = fileList.value[index];
  if (current?.url?.startsWith("blob:")) {
    URL.revokeObjectURL(current.url);
  }
};

const handleRemove = (index: number) => {
  revokeFileUrl(index);
  fileList.value.splice(index, 1);
};

const handleRetry = async (index: number) => {
  const file = fileList.value[index];
  if (!file) return;

  file.status = "uploading";
  await uploadFile(file);
};

const handleUpload = async () => {
  if (fileList.value.length && successCount.value === fileList.value.length) {
    return ElNotification.success("图片都上传成功了，请再选择新素材吧~");
  }

  for (let i = 0; i < fileList.value.length; i++) {
    const file = fileList.value[i];
    if (file.status === "waiting" || file.status === "fail") {
      file.status = "uploading";
      void uploadFile(file);
    }
  }
};

const handleClear = () => {
  if (fileList.value.length && failCount.value) {
    return ElNotification.error("有上传失败的图片，请上传成功后再清空");
  }

  fileList.value.forEach((_, index) => revokeFileUrl(index));
  fileList.value = [];
};

const uploadFile = async (file: UploadImageItem) => {
  try {
    let suffix = "";
    if (file.raw?.name) {
      const match = file.raw.name.match(/\.([a-zA-Z0-9]+)$/);
      if (match) {
        suffix = match[1].toLowerCase();
      }
    }

    const userAccount =
      (userStore.user as any)?.account ||
      userStore.user?.shortName ||
      userStore.user?.name ||
      "anonymous";
    const userId = (userStore.user as any)?.id || (userStore as any).userInfo?.id;

    const cos = await uploadToCOS({
      file: file.raw,
      category: "sticker",
      account: userAccount,
      userId,
    });

    const { url } = cos;
    const width = file.width || 0;
    const height = file.height || 0;
    const aspectRatio = width && height ? width / height : undefined;

    await uploadMaterialFile({
      url,
      name: file.name,
      nameEn: file.nameEn || "",
      description: file.description || "",
      descriptionEn: file.descriptionEn || "",
      keywords: file.keywords || "",
      keywordsEn: file.keywordsEn || "",
      suffix,
      width,
      height,
      aspectRatio,
      userId: userStore.user?.id,
      useAiGenerate: useAiGenerate.value,
      aiGenerateRawInfo: useAiGenerate.value ? buildAiGenerateRawInfo(file) : undefined,
    });

    file.status = "success";
    emits("single-file-uploaded", { useAiGenerate: useAiGenerate.value });
  } catch (error) {
    file.status = "fail";
    console.error("上传文件失败:", error);
    const errorMessage = error instanceof Error ? error.message : String(error || "未知错误");
    ElMessage.error(`文件 ${file.name} 上传失败: ${errorMessage}`);
  }
};

onBeforeUnmount(() => {
  fileList.value.forEach((_, index) => revokeFileUrl(index));
});
</script>

<style scoped lang="scss">
.multi-image-upload-container {
  display: flex;
  align-items: stretch;
  width: 100%;
  height: 100%;
  min-height: 0;
  gap: 12px;
  overflow: hidden;
}

.image-preview-container {
  position: relative;
  display: flex;
  width: 0;
  min-width: min(100%, 640px);
  min-height: 0;
  padding: 12px;
  overflow: hidden;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 10px;
  transition: background-color 0.18s ease;
  flex: 1 1 auto;
  flex-direction: column;
}

.image-preview-container.is-drag-over {
  background: var(--el-fill-color-extra-light);
}

.image-preview-container.is-drag-over .empty-state,
.image-preview-container.is-drag-over .image-preview-list {
  opacity: 0.85;
}

.image-preview-list {
  display: grid;
  min-height: 0;
  overflow-y: auto;
  flex: 1;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  /* 行高按内容撑开，避免图片多时卡片被压扁导致下方输入框看不见 */
  grid-auto-rows: max-content;
  align-items: start;
  gap: 12px;
  align-content: start;
}

.image-preview-item {
  position: relative;
  display: flex;
  overflow: hidden;
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  flex-direction: column;
}

.preview-media {
  position: relative;
  height: 170px;
  padding: 12px;
}

.preview-image {
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: var(--el-fill-color-lighter);
  border-radius: 8px;
}

.preview-image :deep(.el-image__inner) {
  object-fit: contain;
}

.image-error-state {
  display: flex;
  width: 100%;
  height: 100%;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  flex-direction: column;
  gap: 8px;
  align-items: center;
  justify-content: center;
}

.actions {
  position: absolute;
  top: 18px;
  right: 18px;
  display: flex;
  width: 28px;
  height: 28px;
  color: var(--el-text-color-secondary);
  cursor: pointer;
  background: var(--el-fill-color-blank);
  border: 1px solid var(--el-border-color-light);
  border-radius: 999px;
  transition:
    color 0.18s ease,
    background-color 0.18s ease,
    border-color 0.18s ease;
  align-items: center;
  justify-content: center;
}

.actions:hover {
  color: var(--el-color-danger);
  background: var(--el-color-danger-light-9);
  border-color: var(--el-color-danger-light-8);
}

.status {
  position: absolute;
  right: 12px;
  bottom: 12px;
  left: 12px;
  display: flex;
  padding: 10px 14px;
  font-size: 14px;
  font-weight: 700;
  text-align: center;
  border-radius: 8px;
  gap: 6px;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgb(0 0 0 / 15%);
}

.uploading {
  color: #fff;
  background: var(--el-color-primary);
}

.fail {
  color: #fff;
  cursor: pointer;
  background: var(--el-color-danger);
}

.fail:hover {
  opacity: 0.9;
}

.success {
  color: #fff;
  background: var(--el-color-success);
}

.loading-icon {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}

.preview-details {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px;
}

.preview-fields {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.preview-fields :deep(.el-input__wrapper),
.preview-fields :deep(.el-textarea__inner) {
  border-radius: 8px;
}

.preview-fields :deep(.el-input__inner),
.preview-fields :deep(.el-textarea__inner) {
  font-size: 12px;
}

.preview-footer {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.rename-tag {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.file-info-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.file-info-tags :deep(.el-tag),
.rename-tag :deep(.el-tag) {
  font-weight: 500;
}

.empty-state {
  display: flex;
  flex: 1;
  min-height: 0;
  text-align: center;
  flex-direction: column;
  gap: 8px;
  align-items: center;
  justify-content: center;
}

.empty-state-icon {
  display: flex;
  width: 56px;
  height: 56px;
  color: var(--el-text-color-secondary);
  background: var(--el-fill-color-blank);
  border-radius: 14px;
  align-items: center;
  justify-content: center;
}

.empty-state-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.empty-state-desc {
  max-width: 320px;
  font-size: 12px;
  line-height: 1.6;
  color: var(--el-text-color-secondary);
}

.operation-container {
  display: flex;
  width: clamp(220px, 20vw, 260px);
  max-height: 100%;
  min-width: 0;
  min-height: 0;
  overflow-y: auto;
  flex: 0 0 clamp(220px, 20vw, 260px);
  flex-shrink: 0;
  flex-direction: column;
  gap: 12px;
}

.operation-card {
  display: flex;
  padding: 12px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  flex-direction: column;
  gap: 10px;
}

.section-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stat-label {
  font-size: 11px;
  color: var(--el-text-color-secondary);
}

.stat-value {
  font-size: 20px;
  font-weight: 700;
  line-height: 1;
}

.stat-value.is-primary {
  color: var(--el-color-primary);
}

.stat-value.is-success {
  color: var(--el-color-success);
}

.stat-value.is-danger {
  color: var(--el-color-danger);
}

.stat-value.is-warning {
  color: var(--el-color-warning);
}

.upload-progress :deep(.el-progress-bar__outer) {
  background: var(--el-fill-color-light);
}

.upload-progress :deep(.el-progress-bar__innerText) {
  font-size: 11px;
}

.action-stack {
  display: flex;
  flex-direction: column;
  gap: 10px;
  align-items: stretch;
}

.folder-input {
  display: none;
}

.action-stack :deep(.el-upload) {
  display: block;
  width: 100%;
}

.action-stack :deep(.el-upload .el-button) {
  width: 100%;
  justify-content: center;
  margin-left: 0;
}

.action-btn {
  width: 100%;
  justify-content: center;
  margin-left: 0 !important;
}

.switch-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.switch-row {
  display: flex;
  padding: 4px 0;
  gap: 10px;
  align-items: flex-start;
  justify-content: space-between;
}

.switch-copy {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.switch-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.switch-desc {
  font-size: 12px;
  line-height: 1.5;
  color: var(--el-text-color-secondary);
}

@media (width <= 1360px) {
  .multi-image-upload-container {
    flex-direction: column;
    height: auto;
    min-height: 100%;
    overflow: visible;
  }

  .operation-container {
    width: 100%;
    max-height: none;
    min-width: 0;
    overflow: visible;
    flex-basis: auto;
  }

  .image-preview-container {
    width: 100%;
    min-width: 0;
    flex: none;
    overflow: visible;
  }

  .image-preview-list {
    flex: none;
    overflow: visible;
  }
}

@media (width <= 768px) {
  .multi-image-upload-container {
    gap: 10px;
  }

  .image-preview-container,
  .operation-card {
    padding: 10px;
    border-radius: 8px;
  }

  .image-preview-list {
    grid-template-columns: 1fr;
  }

  .stats-grid {
    grid-template-columns: 1fr;
  }

  .empty-state {
    min-height: 220px;
    padding: 24px 16px;
  }
}
</style>
