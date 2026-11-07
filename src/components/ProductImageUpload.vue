<template>
  <div class="product-image-upload">
    <div class="image-list">
      <draggable
        v-model="localFiles"
        :animation="200"
        handle=".drag-handle"
        ghost-class="ghost-item"
        chosen-class="chosen-item"
        @start="onDragStart"
        @end="onDragEnd"
        item-key="id"
        class="draggable-container"
      >
        <template #item="{ element: file, index }">
          <div class="image-item" :class="{ 'dragging': isDragging }">
            <div class="drag-handle">
              <el-icon class="drag-icon"><Rank /></el-icon>
            </div>
            <el-image 
              :src="getPreviewUrl(file)" 
              fit="cover" 
              class="preview-image" 
              :preview-src-list="previewList" 
              :initial-index="index"
            >
              <template #error>
                <div class="image-slot">
                  <el-icon><Picture /></el-icon>
                </div>
              </template>
            </el-image>
            <div class="image-actions">
              <el-button type="danger" size="small" :icon="Delete" circle @click="removeFile(index)" />
            </div>
            <div class="image-index">{{ index + 1 }}</div>
          </div>
        </template>
      </draggable>

      <el-upload
        v-if="localFiles.length < maxCount"
        action="#"
        :auto-upload="false"
        :show-file-list="false"
        :on-change="handleChange"
        :multiple="true"
        accept="image/*"
        class="upload-btn"
      >
        <el-button type="primary" :icon="Plus">
          添加图片
        </el-button>
        <template #tip>
          <div class="upload-tip">
            最多上传 {{ maxCount }} 张图片 ({{ localFiles.length }}/{{ maxCount }})
          </div>
        </template>
      </el-upload>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onUnmounted } from 'vue'
import { Plus, Delete, Picture, Rank } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import draggable from 'vuedraggable'

const props = defineProps({
  modelValue: {
    type: Array,
    default: () => []
  },
  maxCount: {
    type: Number,
    default: 10
  }
})

const emit = defineEmits(['update:modelValue', 'files-change'])

// 本地文件列表，包含已上传的URL和新选择的文件
const localFiles = ref([])
const isDragging = ref(false)

// 预览 URL 在选文件时创建一次并复用，避免每次渲染都新建 blob URL
const getPreviewUrl = (file) => file.url || file.previewUrl || ''

// 释放创建时保存的那个 URL 引用
const releasePreviewUrl = (file) => {
  if (file?.previewUrl) {
    window.URL.revokeObjectURL(file.previewUrl)
    file.previewUrl = null
  }
}

// 计算预览列表
const previewList = computed(() => {
  return localFiles.value.map(file => getPreviewUrl(file))
})

// 处理文件变化
const handleChange = (file) => {
  if (!file.raw.type.startsWith('image/')) {
    ElMessage.error('请上传图片文件')
    return
  }

  if (localFiles.value.length >= props.maxCount) {
    ElMessage.warning(`最多只能上传 ${props.maxCount} 张图片`)
    return
  }

  // 添加新文件到本地列表，添加唯一ID
  localFiles.value.push({
    id: `file-${Date.now()}-${Math.random()}`,
    raw: file.raw,
    url: null,
    previewUrl: window.URL.createObjectURL(file.raw)
  })

  // 通知父组件文件列表已更新
  emit('files-change', localFiles.value)
}

// 删除文件
const removeFile = (index) => {
  const file = localFiles.value[index]
  releasePreviewUrl(file)
  localFiles.value.splice(index, 1)
  
  // 更新 modelValue，只保留已上传的图片URL
  const urls = localFiles.value
    .filter(file => file.url)
    .map(file => file.url)
  emit('update:modelValue', urls)
  
  // 通知父组件文件列表已更新
  emit('files-change', localFiles.value)
}

// 拖拽开始处理
const onDragStart = () => {
  isDragging.value = true
}

// 拖拽结束处理
const onDragEnd = () => {
  isDragging.value = false
  // 更新 modelValue，保持已上传图片的顺序
  const urls = localFiles.value
    .filter(file => file.url)
    .map(file => file.url)
  emit('update:modelValue', urls)
  
  // 通知父组件文件列表已更新
  emit('files-change', localFiles.value)
}

// 监听 modelValue 变化，更新本地文件列表
const updateLocalFiles = (newValue) => {
  // 保持原有文件的顺序和新上传的文件
  const existingFiles = localFiles.value.filter(file => file.raw)
  
  // 为URL文件添加唯一ID，如果已有相同URL的文件，保留其ID
  const urlFiles = newValue.map((url, idx) => {
    // 查找是否已有相同URL的文件
    const existingFile = localFiles.value.find(f => f.url === url)
    return { 
      id: existingFile?.id || `url-${url}-${idx}-${Date.now()}`,
      url, 
      raw: null
    }
  })
  localFiles.value = [...urlFiles, ...existingFiles]
}

// 初始化时设置本地文件列表
updateLocalFiles(props.modelValue)

// 监听 modelValue 变化
watch(() => props.modelValue, updateLocalFiles)

// 组件卸载时清理所有创建的URL
onUnmounted(() => {
  localFiles.value.forEach(file => releasePreviewUrl(file))
})

// 添加 reset 方法
const reset = () => {
  // 清理所有本地预览URL
  localFiles.value.forEach(file => releasePreviewUrl(file))
  // 重置本地文件列表
  localFiles.value = []
  // 重置父组件的值
  emit('update:modelValue', [])
  emit('files-change', [])
}

// 暴露方法给父组件
defineExpose({
  reset
})
</script>

<style scoped>
.product-image-upload {
  width: 100%;
}

.image-list {
  display: flex;
  width: 100%;
  padding-bottom: 8px;
  overflow: auto hidden;
  flex-flow: row nowrap;
  align-items: flex-start;
  gap: 12px;

  /* 自定义滚动条样式 */
  scrollbar-width: thin;
  scrollbar-color: #c1c1c1 #f1f1f1;
}

.draggable-container {
  display: flex !important;
  flex-flow: row nowrap !important;
  align-items: flex-start !important;
  gap: 12px !important;
  width: auto !important;
  min-width: fit-content;
}

.image-list::-webkit-scrollbar {
  height: 8px;
}

.image-list::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 4px;
}

.image-list::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 4px;
}

.image-list::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}

.image-item {
  position: relative;
  width: 120px;
  height: 120px;
  min-width: 120px;
  overflow: hidden;
  cursor: move;
  border: 1px dashed #dcdfe6;
  border-radius: 4px;
  transition: all 0.3s ease;
  flex-shrink: 0;
}

.image-item:hover {
  border-color: var(--el-color-primary);
  box-shadow: 0 2px 8px color-mix(in srgb, var(--el-color-primary) 20%, transparent);
}

.image-item.dragging {
  opacity: 0.5;
}

.drag-handle {
  position: absolute;
  top: 5px;
  left: 5px;
  z-index: 10;
  display: flex;
  width: 24px;
  height: 24px;
  cursor: grab;
  background: rgb(0 0 0 / 50%);
  border-radius: 4px;
  transition: background 0.2s;
  align-items: center;
  justify-content: center;
}

.drag-handle:hover {
  background: rgb(0 0 0 / 70%);
}

.drag-handle:active {
  cursor: grabbing;
}

.drag-icon {
  font-size: 14px;
  color: #fff;
}

.image-index {
  position: absolute;
  bottom: 5px;
  left: 5px;
  z-index: 5;
  padding: 2px 6px;
  font-size: 12px;
  color: #fff;
  background: rgb(0 0 0 / 60%);
  border-radius: 4px;
}

.ghost-item {
  background: #f0f0f0;
  opacity: 0.4;
}

.chosen-item {
  border-color: var(--el-color-primary);
  box-shadow: 0 2px 12px color-mix(in srgb, var(--el-color-primary) 30%, transparent);
}

.preview-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.image-actions {
  position: absolute;
  top: 5px;
  right: 5px;
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.upload-btn {
  display: flex;
  width: 120px;
  height: 120px;
  min-width: 120px;
  border: 1px dashed #dcdfe6;
  border-radius: 4px;
  flex-shrink: 0;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.upload-tip {
  margin-top: 8px;
  font-size: 12px;
  color: #909399;
  text-align: center;
}

.image-slot {
  display: flex;
  width: 100%;
  height: 100%;
  color: #909399;
  background: #f5f7fa;
  justify-content: center;
  align-items: center;
}
</style> 