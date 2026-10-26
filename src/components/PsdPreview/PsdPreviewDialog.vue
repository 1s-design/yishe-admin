<template>
  <el-dialog
    :model-value="visible"
    :title="title"
    fullscreen
    :show-close="true"
    :close-on-click-modal="false"
    :destroy-on-close="true"
    append-to-body
    class="psd-preview-dialog"
    @update:model-value="(v) => emit('update:visible', v)"
  >
    <div class="psd-preview-dialog__body">
      <PsdPreview
        v-if="visible && (file || url)"
        :file="file"
        :url="url"
        :name="name"
        :can-set-thumbnail="canSetThumbnail"
        @thumbnail="handleThumbnail"
      />
      <div v-else class="psd-preview-dialog__empty">
        <el-empty description="无 PSD 文件" />
      </div>
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import PsdPreview from './PsdPreview.vue'

const props = defineProps<{
  visible: boolean
  file?: File | null
  url?: string | null
  name?: string
  canSetThumbnail?: boolean
}>()

/** 缩略图导出结果：父组件上传并保存成功后需回调 done(true) */
interface ThumbnailPayload {
  blob: Blob
  width: number
  height: number
  done: (success: boolean, message?: string) => void
}

const emit = defineEmits<{
  (e: 'update:visible', v: boolean): void
  (e: 'thumbnail', payload: ThumbnailPayload): void
}>()

const title = computed(() => props.name || 'PSD 预览')

function handleThumbnail(payload: ThumbnailPayload) {
  emit('thumbnail', payload)
}
</script>

<style scoped>
.psd-preview-dialog__body {
  height: calc(100vh - 55px);
  min-height: 0;
  overflow: hidden;
}

.psd-preview-dialog__empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}
</style>

<style>
.psd-preview-dialog .el-dialog__header {
  margin: 0;
  padding: 12px 20px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.psd-preview-dialog .el-dialog__title {
  font-size: 14px;
  font-weight: 600;
}

.psd-preview-dialog .el-dialog__body {
  padding: 0;
}
</style>
