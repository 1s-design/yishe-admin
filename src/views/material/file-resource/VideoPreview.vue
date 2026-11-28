<template>
  <el-dialog
    v-model="dialogVisible"
    :title="`文件预览 - ${fileName}`"
    width="100vw"
    fullscreen
    class="file-preview-dialog"
    :destroy-on-close="true"
    :close-on-click-modal="true"
    @close="handleClose"
  >
    <div class="file-preview-container" :class="`file-preview-container--${previewType}`">
      <!-- 视频预览 -->
      <video
        v-if="previewType === 'video' && fileUrl"
        :src="fileUrl"
        controls
        autoplay
        class="preview-video"
        @error="handleMediaError"
      >
        您的浏览器不支持视频播放
      </video>

      <!-- 音频预览 -->
      <div v-else-if="previewType === 'audio' && fileUrl" class="preview-audio-shell">
        <el-icon size="56" color="var(--el-color-primary)">
          <Headset />
        </el-icon>
        <div class="preview-audio-meta">
          <div class="preview-audio-name">{{ fileName }}</div>
          <div class="preview-audio-tip">音频资源预览</div>
        </div>
        <audio
          :src="fileUrl"
          controls
          autoplay
          preload="metadata"
          class="preview-audio"
          @error="handleMediaError"
        />
      </div>

      <!-- 图片预览 -->
      <img
        v-else-if="previewType === 'image' && fileUrl"
        :src="fileUrl"
        :alt="fileName"
        class="preview-image"
        @error="handleImageError"
      />

      <!-- PDF 预览 -->
      <iframe
        v-else-if="previewType === 'pdf' && fileUrl"
        :src="pdfPreviewUrl"
        class="preview-pdf"
        title="PDF 文件预览"
      />

      <!-- 文本/代码文件预览 -->
      <div v-else-if="previewType === 'text'" class="preview-text-shell">
        <div class="preview-text-header">
          <div class="preview-text-info">
            <el-icon size="20"><Document /></el-icon>
            <span class="preview-text-filename">{{ fileName }}</span>
            <el-tag size="small" type="info">{{ normalizedSuffix.toUpperCase() }}</el-tag>
          </div>
          <div class="preview-text-actions">
            <el-button size="small" :disabled="textLoading || textContent === null" @click="copyTextContent">
              <el-icon><DocumentCopy /></el-icon>
              复制
            </el-button>
          </div>
        </div>
        <div v-if="textLoading" class="preview-text-loading">
          <el-icon class="is-loading" size="22"><Loading /></el-icon>
          <span>正在加载完整文件内容...</span>
        </div>
        <div v-else class="preview-text-content">
          <pre><code>{{ textContent }}</code></pre>
        </div>
      </div>

      <!-- Excel 预览 -->
      <div v-else-if="previewType === 'excel' && fileUrl" class="preview-excel-shell">
        <ExcelPreview :file-url="fileUrl" :file-suffix="normalizedSuffix" />
      </div>

      <!-- 不支持预览的类型 -->
      <div v-else class="file-preview-empty">
        <el-icon size="48" color="var(--el-text-color-secondary)">
          <component :is="fallbackIcon" />
        </el-icon>
        <p class="file-preview-empty__title">当前文件暂不支持在线预览</p>
        <p class="file-preview-empty__tip">可以直接下载或在新窗口中打开查看</p>
      </div>
    </div>

    <template #footer>
      <el-button @click="handleClose">关闭</el-button>
      <el-button v-if="fileUrl" @click="handleOpenInNewTab">新窗口打开</el-button>
      <el-button type="primary" @click="handleDownload" v-if="fileUrl">下载</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { VideoPlay, Headset, Document, Picture, Folder, DocumentCopy, Loading } from '@element-plus/icons-vue'
import { downloadFileByElement } from '@/common/download'
import ExcelPreview from '@/components/ExcelPreview/index.vue'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  fileUrl: {
    type: String,
    default: ''
  },
  fileName: {
    type: String,
    default: '文件资源'
  },
  fileSuffix: {
    type: String,
    default: ''
  }
})

const emits = defineEmits(['close'])

const dialogVisible = computed({
  get: () => props.visible,
  set: (value) => {
    if (!value) {
      emits('close')
    }
  }
})

const textContent = ref<string | null>(null)
const textLoading = ref(false)

// 当对话框打开且是文本文件时，加载文本内容
watch([() => props.visible, () => props.fileUrl, () => props.fileSuffix], async ([visible, url, suffix]) => {
  if (!visible || !url) {
    textContent.value = null
    return
  }

  const suffixLower = String(suffix || '').trim().toLowerCase()
  const textSuffixes = [
    'txt', 'md', 'json', 'xml', 'csv', 'log',
    'js', 'ts', 'jsx', 'tsx', 'vue', 'html', 'htm', 'css', 'scss', 'less',
    'py', 'java', 'c', 'cpp', 'h', 'hpp', 'cs', 'go', 'rs', 'rb', 'php', 'sh', 'bat',
    'yml', 'yaml', 'toml', 'ini', 'cfg', 'conf', 'env',
    'sql', 'graphql', 'prisma',
  ]

  if (textSuffixes.includes(suffixLower)) {
    await loadTextContent()
  } else {
    textContent.value = null
  }
})

async function loadTextContent() {
  if (!props.fileUrl) {
    textContent.value = null
    return
  }

  textLoading.value = true
  try {
    const response = await fetch(props.fileUrl)
    if (!response.ok) {
      throw new Error('文件加载失败')
    }
    const text = await response.text()
    textContent.value = text
  } catch (error) {
    console.error('文本文件加载失败:', error)
    textContent.value = null
    ElMessage.error('文本文件加载失败')
  } finally {
    textLoading.value = false
  }
}

function handleClose() {
  textContent.value = null
  emits('close')
}

function handleDownload() {
  if (!props.fileUrl) {
    ElMessage.error('没有可下载的文件')
    return
  }

  try {
    const fileName = props.fileName || `file-resource.${normalizedSuffix.value || 'bin'}`
    downloadFileByElement(props.fileUrl, fileName)
    ElMessage.success('开始下载文件')
  } catch (error) {
    ElMessage.error('下载失败')
  }
}

function handleOpenInNewTab() {
  if (!props.fileUrl) return
  window.open(props.fileUrl, '_blank', 'noopener,noreferrer')
}

async function copyTextContent() {
  if (!textContent.value) {
    ElMessage.warning('没有可复制的内容')
    return
  }

  try {
    await navigator.clipboard.writeText(textContent.value)
    ElMessage.success('已复制到剪贴板')
  } catch (error) {
    console.error('复制失败:', error)
    ElMessage.error('复制失败')
  }
}

const normalizedSuffix = computed(() =>
  String(props.fileSuffix || '')
    .trim()
    .toLowerCase()
)

const previewType = computed<'video' | 'audio' | 'image' | 'pdf' | 'text' | 'excel' | 'unknown'>(() => {
  const suffix = normalizedSuffix.value
  if (['mp4', 'mov', 'avi', 'mkv', 'wmv', 'flv', 'webm', 'm4v', '3gp', 'ogv'].includes(suffix)) {
    return 'video'
  }
  if (['mp3', 'wav', 'aac', 'ogg', 'oga', 'm4a', 'flac', 'wma', 'opus', 'amr'].includes(suffix)) {
    return 'audio'
  }
  if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg', 'ico', 'tiff', 'tif'].includes(suffix)) {
    return 'image'
  }
  if (suffix === 'pdf') {
    return 'pdf'
  }
  if (['xls', 'xlsx'].includes(suffix)) {
    return 'excel'
  }
  // 文本/代码文件
  const textSuffixes = [
    'txt', 'md', 'json', 'xml', 'csv', 'log',
    'js', 'ts', 'jsx', 'tsx', 'vue', 'html', 'htm', 'css', 'scss', 'less',
    'py', 'java', 'c', 'cpp', 'h', 'hpp', 'cs', 'go', 'rs', 'rb', 'php', 'sh', 'bat',
    'yml', 'yaml', 'toml', 'ini', 'cfg', 'conf', 'env',
    'sql', 'graphql', 'prisma',
  ]
  if (textSuffixes.includes(suffix)) {
    return 'text'
  }
  return 'unknown'
})

const pdfPreviewUrl = computed(() => {
  if (!props.fileUrl) return ''
  return `${props.fileUrl}#toolbar=1&navpanes=0&scrollbar=1`
})

const fallbackIcon = computed(() => {
  switch (previewType.value) {
    case 'image':
      return Picture
    case 'pdf':
      return Document
    case 'audio':
      return Headset
    case 'video':
      return VideoPlay
    default:
      return Folder
  }
})

function handleMediaError(event: Event) {
  const media = event.target as HTMLMediaElement
  console.warn('媒体加载失败:', media.src)
  ElMessage.error('文件加载失败')
}

function handleImageError(event: Event) {
  const image = event.target as HTMLImageElement
  console.warn('图片加载失败:', image.src)
  ElMessage.error('图片加载失败')
}
</script>

<style scoped>


/* 响应式设计 */
@media (width <= 768px) {
  .preview-audio-shell {
    padding: 20px 16px;
  }

  .preview-audio {
    width: 100%;
    min-width: 0;
  }
}

:global(.file-preview-dialog.el-dialog) {
  --file-preview-footer-height: 54px;

  display: flex;
  height: 100vh;
  margin: 0;
  overflow: hidden;
  flex-direction: column;
}

:global(.file-preview-dialog .el-dialog__header) {
  padding: 14px 48px 12px 18px;
  margin: 0;
  border-bottom: 1px solid var(--el-border-color-lighter);
  flex: 0 0 auto;
}

:global(.file-preview-dialog .el-dialog__title) {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

:global(.file-preview-dialog .el-dialog__body) {
  display: flex;
  flex: 1 1 auto;
  min-height: 0;
  padding: 0;
  overflow: hidden;
  flex-direction: column;
}

:global(.file-preview-dialog .el-dialog__footer) {
  flex: 0 0 var(--file-preview-footer-height);
  height: var(--file-preview-footer-height);
  padding: 10px 16px;
  border-top: 1px solid var(--el-border-color-lighter);
}

.file-preview-container {
  display: flex;
  flex: 1 1 auto;
  width: 100%;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  background: var(--el-fill-color-blank);
  justify-content: center;
  align-items: center;
}

.file-preview-container--excel {
  align-items: stretch;
  justify-content: stretch;
}

.file-preview-container--video,
.file-preview-container--image,
.file-preview-container--pdf {
  background: var(--el-bg-color-page);
}

.preview-video {
  width: 100%;
  height: 100%;
  object-fit: contain;
  background: #000;
}

.preview-image {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  background: var(--el-fill-color-blank);
}

.preview-pdf {
  width: 100%;
  height: 100%;
  background: #fff;
  border: 0;
}

.preview-audio-shell {
  display: flex;
  width: min(720px, 100%);
  padding: 28px 24px;
  color: var(--el-text-color-secondary);
  background: linear-gradient(180deg, var(--el-color-primary-light-9) 0%, var(--el-fill-color-blank) 100%);
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
}

.preview-audio-meta {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  text-align: center;
}

.preview-audio-name {
  font-size: 16px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.preview-audio-tip {
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.preview-audio {
  display: block;
  width: min(560px, 100%);
  height: 42px;
  min-width: 280px;
}

.file-preview-empty {
  display: flex;
  min-height: 0;
  padding: 24px;
  text-align: center;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
}

.file-preview-empty__title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.file-preview-empty__tip {
  margin: 0;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.preview-tip {
  padding: 10px 4px 0;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

/* 文本文件预览样式 */
.preview-text-shell {
  display: flex;
  width: 100%;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  background: #1e1e1e;
  flex-direction: column;
}

.preview-excel-shell {
  width: 100%;
  height: 100%;
  min-height: 0;
  overflow: hidden;
}

.preview-text-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: #2d2d2d;
  border-bottom: 1px solid #3e3e3e;
}

.preview-text-info {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #d4d4d4;
}

.preview-text-filename {
  font-size: 14px;
  font-weight: 600;
  color: #fff;
}

.preview-text-actions {
  display: flex;
  gap: 8px;
}

.preview-text-content {
  min-height: 0;
  padding: 16px;
  overflow: auto;
  background: #1e1e1e;
  flex: 1;
}

.preview-text-loading {
  display: flex;
  min-height: 0;
  color: #d4d4d4;
  background: #1e1e1e;
  flex: 1;
  align-items: center;
  justify-content: center;
  gap: 10px;
}

.preview-text-content pre {
  margin: 0;
  font-family: Consolas, Monaco, 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.6;
  color: #d4d4d4;
  word-wrap: break-word;
  white-space: pre-wrap;
  tab-size: 2;
}

.preview-text-content code {
  font-family: inherit;
}

/* 滚动条样式 */
.preview-text-content::-webkit-scrollbar {
  width: 10px;
  height: 10px;
}

.preview-text-content::-webkit-scrollbar-track {
  background: #1e1e1e;
}

.preview-text-content::-webkit-scrollbar-thumb {
  background: #4e4e4e;
  border-radius: 5px;
}

.preview-text-content::-webkit-scrollbar-thumb:hover {
  background: #5e5e5e;
}
</style>
