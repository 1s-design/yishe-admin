<template>
  <div class="multi-file-upload-container">
    <div class="file-preview-container">
      <div v-if="fileList.length" class="file-preview-list">
        <div v-for="(file, index) in fileList" :key="file.uid" class="file-preview-item">
          <div class="preview-media">
            <video
              v-if="(file.previewUrl || file.url) && isVideoFile(file.suffix)"
              :src="file.previewUrl || file.url"
              class="preview-video"
              controls
              preload="metadata"
            />
            <el-image
              v-else-if="(file.previewUrl || file.url) && isImageFile(file.suffix)"
              :src="file.previewUrl || file.url"
              class="preview-image"
              fit="cover"
            >
              <template #error>
                <div class="preview-placeholder">
                  <el-icon size="44" color="var(--el-text-color-secondary)">
                    <component :is="getFileIcon(file.suffix)" />
                  </el-icon>
                  <div class="preview-placeholder__title">{{ file.name }}</div>
                  <div class="preview-placeholder__meta">{{ formatFileSize(file.size) }}</div>
                  <div class="preview-placeholder__suffix">{{ file.suffix.toUpperCase() }}</div>
                </div>
              </template>
            </el-image>
            <div v-else class="preview-placeholder">
              <el-icon size="44" color="var(--el-text-color-secondary)">
                <component :is="getFileIcon(file.suffix)" />
              </el-icon>
              <div class="preview-placeholder__title">{{ file.name }}</div>
              <div class="preview-placeholder__meta">{{ formatFileSize(file.size) }}</div>
              <div class="preview-placeholder__suffix">{{ file.suffix.toUpperCase() }}</div>
            </div>

            <div class="actions">
              <el-icon
                v-if="file.status !== UploadStatus.Uploading"
                size="18"
                @click="handleRemove(index)"
              >
                <Close />
              </el-icon>
            </div>

            <div v-if="file.status === UploadStatus.Uploading" class="status uploading">
              <el-icon class="loading-icon">
                <Loading />
              </el-icon>
              上传中...
            </div>
            <div
              v-if="file.status === UploadStatus.Fail"
              class="status fail"
              @click="handleRetry(index)"
            >
              上传失败，点击重试
            </div>
            <div v-if="file.status === UploadStatus.Success" class="status success">上传成功</div>
          </div>

          <div class="preview-details">
            <div class="preview-fields">
              <el-input v-model="file.name" size="small" placeholder="文件名称" />
              <el-input
                v-model="file.description"
                size="small"
                type="textarea"
                :rows="2"
                placeholder="文件描述"
              />
              <el-input
                v-model="file.keywords"
                size="small"
                placeholder="关键词（用英文逗号分隔）"
              />
              <el-input v-model="file.tags" size="small" placeholder="标签（用英文逗号分隔）" />
            </div>

            <div class="preview-footer">
              <div class="file-info-tags">
                <el-tag round size="small" type="info" effect="light">
                  {{ formatFileSize(file.size) }}
                </el-tag>
                <el-tag round size="small" type="info" effect="light">
                  {{ file.suffix.toUpperCase() }}
                </el-tag>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-else class="empty-state">
        <div class="empty-state-icon">
          <el-icon size="32">
            <Folder />
          </el-icon>
        </div>
        <div class="empty-state-title">还没有待上传的文件</div>
        <div class="empty-state-desc">
          点击右侧“选择文件”后，可在这里批量填写名称、描述、关键词和标签。
        </div>
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
            multiple
            webkitdirectory
            directory
            @change="handleFolderChange"
          />
          <el-upload
            action="#"
            :accept="acceptAllFiles"
            list-type="text"
            :auto-upload="false"
            :on-change="handleFileChange"
            :show-file-list="false"
            multiple
          >
            <el-button class="action-btn" type="primary" plain :icon="UploadFilled">选择文件</el-button>
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
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from "vue";
import type { PropType } from "vue";
import { ElMessage, ElNotification } from "element-plus";
import {
  Close,
  Document,
  Folder,
  FolderOpened,
  Loading,
  Picture,
  UploadFilled,
  VideoPlay,
} from "@element-plus/icons-vue";
import type { UploadFile } from "element-plus";
import { createFileResource } from "@/api/file-resource";
import { uploadToCOS, initCOS } from "@/api/cos";
import { useUserStore } from "@/store/modules/user";

interface UploadInfo {
  path?: string;
}

enum UploadStatus {
  Waiting = "waiting",
  Uploading = "uploading",
  Success = "success",
  Fail = "fail",
}

interface FileUploadItem {
  uid: string | number;
  name: string;
  description: string;
  keywords: string;
  category?: string;
  tags: string;
  suffix: string;
  size: number;
  status: UploadStatus;
  file: File;
  url: string;
  previewUrl?: string;
  relativePath?: string;
  id?: string | number;
}

defineProps({
  currentUploadInfo: {
    type: Object as PropType<UploadInfo>,
    default: () => ({}),
  },
});

const emits = defineEmits(["single-file-uploaded"]);
const userStore = useUserStore();

const fileList = ref<FileUploadItem[]>([]);
const folderInputRef = ref<HTMLInputElement | null>(null);

const totalCount = computed(() => fileList.value.length);
const successCount = computed(
  () => fileList.value.filter((file) => file.status === UploadStatus.Success).length,
);
const failCount = computed(
  () => fileList.value.filter((file) => file.status === UploadStatus.Fail).length,
);
const loadingCount = computed(
  () => fileList.value.filter((file) => file.status === UploadStatus.Uploading).length,
);
const someLoading = computed(() => loadingCount.value > 0);

const acceptAllFiles = "*";

function isVideoFile(suffix: string): boolean {
  const videoSuffixes = ["mp4", "mov", "avi", "mkv", "wmv", "flv", "webm", "m4v", "3gp", "ogv"];
  return videoSuffixes.includes(suffix.toLowerCase());
}

function isImageFile(suffix: string): boolean {
  const imageSuffixes = ["jpg", "jpeg", "png", "gif", "bmp", "webp", "svg", "ico", "tiff", "tif"];
  return imageSuffixes.includes(suffix.toLowerCase());
}

function getFileIcon(suffix: string) {
  const videoSuffixes = ["mp4", "mov", "avi", "mkv", "wmv", "flv", "webm", "m4v", "3gp", "ogv"];
  const imageSuffixes = ["jpg", "jpeg", "png", "gif", "bmp", "webp", "svg", "ico", "tiff", "tif"];
  const documentSuffixes = ["pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt", "rtf"];

  if (videoSuffixes.includes(suffix.toLowerCase())) return VideoPlay;
  if (imageSuffixes.includes(suffix.toLowerCase())) return Picture;
  if (documentSuffixes.includes(suffix.toLowerCase())) return Document;
  return Folder;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

function buildFileUid(file: File, fallback?: string | number) {
  const relativePath = String((file as any).webkitRelativePath || "").trim();
  return fallback || `${relativePath || file.name}-${file.size}-${file.lastModified}`;
}

function revokeFilePreview(fileItem?: FileUploadItem) {
  if (fileItem?.previewUrl && fileItem.previewUrl.startsWith("blob:")) {
    URL.revokeObjectURL(fileItem.previewUrl);
  }
}

function appendRawFile(actualFile: File, uid?: string | number) {
  if (!actualFile) return false;

  const maxSize = 1024 * 1024 * 1024;
  if (actualFile.size > maxSize) {
    ElMessage.error(`文件 ${actualFile.name} 大小不能超过1GB`);
    return false;
  }

  const suffix = actualFile.name.split(".").pop()?.toLowerCase() || "unknown";
  const relativePath = String((actualFile as any).webkitRelativePath || "").trim();
  const previewUrl =
    isImageFile(suffix) || isVideoFile(suffix)
      ? URL.createObjectURL(actualFile)
      : "";

  fileList.value.push({
    uid: buildFileUid(actualFile, uid),
    name: actualFile.name.replace(/\.[^/.]+$/, ""),
    description: "",
    keywords: "",
    tags: "",
    suffix,
    size: actualFile.size,
    status: UploadStatus.Waiting,
    file: actualFile,
    url: "",
    previewUrl,
    relativePath,
  });

  return true;
}

function handleFileChange(file: UploadFile | File) {
  const actualFile = (file as UploadFile).raw || (file as File);
  if (!actualFile) return;
  appendRawFile(actualFile, (file as UploadFile).uid);
}

function openFolderPicker() {
  folderInputRef.value?.click();
}

function handleFolderChange(event: Event) {
  const input = event.target as HTMLInputElement;
  const files = Array.from(input.files || []);
  input.value = "";

  if (!files.length) {
    ElMessage.warning("文件夹里没有可上传的文件");
    return;
  }

  let addedCount = 0;
  for (const file of files) {
    if (appendRawFile(file)) {
      addedCount += 1;
    }
  }

  ElMessage.success(`已从文件夹选择 ${addedCount} 个文件`);
}

function handleRemove(index: number) {
  const removed = fileList.value.splice(index, 1)[0];
  revokeFilePreview(removed);
}

function handleRetry(index: number) {
  const file = fileList.value[index];
  if (!file) return;

  file.status = UploadStatus.Waiting;
  void handleUpload();
}

function handleClear() {
  fileList.value.forEach((file) => revokeFilePreview(file));
  fileList.value = [];
}

onBeforeUnmount(() => {
  fileList.value.forEach((file) => revokeFilePreview(file));
});

async function handleUpload() {
  if (totalCount.value === 0) {
    ElMessage.warning("请先选择文件");
    return;
  }

  const waitingFiles = fileList.value.filter((file) => file.status === UploadStatus.Waiting);
  if (waitingFiles.length === 0) {
    ElMessage.warning("没有待上传的文件");
    return;
  }

  for (const file of waitingFiles) {
    await uploadSingleFile(file);
  }
}

async function uploadSingleFile(fileItem: FileUploadItem) {
  try {
    fileItem.status = UploadStatus.Uploading;

    await initCOS();

    const cosResult = await uploadToCOS({
      file: fileItem.file,
      category: "file-resource",
      account:
        (userStore.user as any)?.account ||
        userStore.user?.shortName ||
        userStore.user?.name ||
        "anonymous",
      userId: (userStore.user as any)?.id || (userStore as any).userInfo?.id,
    });

    if (!cosResult.url) {
      throw new Error("上传到COS失败");
    }

    fileItem.url = cosResult.url;

    const materialData = {
      name: fileItem.name,
      description: fileItem.description,
      keywords: fileItem.keywords,
      suffix: fileItem.suffix,
      tags: fileItem.tags,
      url: cosResult.url,
      isPublic: true,
      userId: (userStore.user as any)?.id || (userStore as any).userInfo?.id,
    };

    const result = await createFileResource(materialData);
    if (!result) {
      throw new Error("保存到数据库失败");
    }

    fileItem.status = UploadStatus.Success;
    fileItem.id = result.id;
    ElNotification.success(`文件 ${fileItem.name} 上传成功`);
    emits("single-file-uploaded");
  } catch (error) {
    console.error("上传失败:", error);
    fileItem.status = UploadStatus.Fail;
    const message = error instanceof Error ? error.message : "未知错误";
    ElMessage.error(`文件 ${fileItem.name} 上传失败: ${message}`);
  }
}
</script>

<style scoped lang="scss">
.multi-file-upload-container {
  display: flex;
  align-items: stretch;
  width: 100%;
  height: 100%;
  min-height: 0;
  gap: 12px;
  overflow: hidden;
}

.file-preview-container {
  display: flex;
  width: 0;
  min-width: min(100%, 640px);
  min-height: 0;
  padding: 12px;
  overflow: hidden;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 10px;
  flex: 1 1 auto;
  flex-direction: column;
}

.file-preview-list {
  display: grid;
  min-height: 0;
  overflow-y: auto;
  flex: 1;
  grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
  gap: 12px;
  align-content: start;
}

.file-preview-item {
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
  height: 180px;
  padding: 12px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.preview-video,
.preview-image {
  display: block;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: var(--el-fill-color-lighter);
  border-radius: 8px;
  object-fit: cover;
}

.preview-placeholder {
  display: flex;
  width: 100%;
  height: 100%;
  padding: 18px;
  text-align: center;
  background: var(--el-fill-color-lighter);
  border: 1px dashed var(--el-border-color-light);
  border-radius: 8px;
  flex-direction: column;
  gap: 8px;
  align-items: center;
  justify-content: center;
}

.preview-placeholder__title {
  font-size: 13px;
  font-weight: 600;
  line-height: 1.5;
  color: var(--el-text-color-primary);
  word-break: break-word;
}

.preview-placeholder__meta {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.preview-placeholder__suffix {
  padding: 2px 8px;
  font-size: 11px;
  font-weight: 600;
  color: var(--el-text-color-secondary);
  background: var(--el-fill-color-blank);
  border-radius: 999px;
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
  animation: rotate 1s linear infinite;
}

@keyframes rotate {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}

.preview-details {
  display: flex;
  flex: 1;
  min-height: 0;
  flex-direction: column;
  gap: 10px;
  padding: 12px;
}

.preview-fields {
  display: flex;
  flex: 1;
  min-height: 0;
  flex-direction: column;
  gap: 8px;
}

.preview-fields :deep(.el-input__wrapper),
.preview-fields :deep(.el-textarea__inner),
.preview-fields :deep(.el-select__wrapper) {
  border-radius: 8px;
}

.preview-fields :deep(.el-input__inner),
.preview-fields :deep(.el-textarea__inner),
.preview-fields :deep(.el-select__selected-item) {
  font-size: 12px;
}

.preview-footer {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.file-info-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding-top: 10px;
  border-top: 1px solid var(--el-border-color-lighter);
}

.file-info-tags :deep(.el-tag) {
  font-weight: 500;
}

.empty-state {
  display: flex;
  flex: 1;
  min-height: 0;
  padding: 32px 24px;
  text-align: center;
  background: transparent;
  border: 1px dashed var(--el-border-color-light);
  border-radius: 10px;
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
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 10px;
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
  padding: 8px 10px;
  background: var(--el-fill-color-extra-light);
  border-radius: 8px;
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

.action-stack > * {
  width: 100%;
}

.action-stack :deep(.el-button) {
  width: 100%;
  justify-content: center;
  margin-left: 0;
}

.action-button-row {
  width: 100%;
}

.local-select {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}

.folder-input {
  display: none;
}

.local-select :deep(.el-upload) {
  display: block;
  width: 100%;
}

.local-select :deep(.el-upload .el-button) {
  width: 100%;
  justify-content: center;
}

@media (width <= 1360px) {
  .multi-file-upload-container {
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

  .file-preview-container {
    width: 100%;
    min-width: 0;
    flex: none;
    overflow: visible;
  }

  .file-preview-list {
    flex: none;
    overflow: visible;
  }
}

@media (width <= 768px) {
  .multi-file-upload-container {
    gap: 10px;
  }

  .file-preview-container,
  .operation-card {
    padding: 10px;
    border-radius: 8px;
  }

  .file-preview-list {
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
