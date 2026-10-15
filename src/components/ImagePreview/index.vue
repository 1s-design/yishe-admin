<template>
  <teleport to="body">
    <div
      v-if="visible"
      class="image-preview-overlay"
      @click="handleOverlayClick"
      @keydown.esc="close"
      tabindex="0"
    >
      <div class="image-preview-container">
        <!-- 关闭按钮 -->
        <button class="image-preview-close" @click.stop="close">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>

        <!-- 图片容器 -->
        <div class="image-preview-content">
          <img
            ref="imageRef"
            :src="currentImage"
            :alt="alt"
            class="image-preview-img"
            :style="imageStyle"
            @click="handleImageClick"
            @load="handleImageLoad"
            @error="handleImageError"
            @wheel="handleWheel"
            @mousedown="handleMouseDown"
            @mousemove="handleMouseMove"
            @mouseup="handleMouseUp"
            @mouseleave="handleMouseUp"
          />

          <!-- 左右切换 -->
          <template v-if="hasMultiple">
            <button class="image-preview-nav prev" @click.stop="goPrev" title="上一张">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <path d="M15 18l-6-6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </button>
            <button class="image-preview-nav next" @click.stop="goNext" title="下一张">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <path d="M9 18l6-6-6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </button>
            <div class="image-preview-counter">{{ currentIndex + 1 }} / {{ normalizedList.length }}</div>
          </template>

          <!-- 缩略图试文字文案展示 -->
          <div v-if="currentText" class="image-preview-caption" @click.stop>
            <span class="caption-tag">试文字</span>
            <span class="caption-text">{{ currentText }}</span>
          </div>
        </div>

        <!-- 缩略图条（多图时显示） -->
        <div v-if="hasMultiple" class="image-preview-thumbs" @click.stop>
          <div
            v-for="(item, i) in normalizedList"
            :key="item.url + i"
            class="image-preview-thumb-item"
            :class="{ active: i === currentIndex }"
            @click="switchTo(i)"
          >
            <img :src="item.url" class="image-preview-thumb" />
            <span v-if="item.text" class="thumb-text-badge" :title="item.text">{{ item.text }}</span>
          </div>
        </div>

        <!-- 工具栏 -->
        <div class="image-preview-toolbar" @click.stop>
          <!-- 缩放控制 -->
          <button class="toolbar-btn" @click="zoomOut" title="缩小">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="11" cy="11" r="8" stroke="currentColor" stroke-width="2"/>
              <path d="M8 11h6" stroke="currentColor" stroke-width="2"/>
            </svg>
          </button>
          
          <span class="zoom-text">{{ Math.round(scale * 100) }}%</span>
          
          <button class="toolbar-btn" @click="zoomIn" title="放大">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="11" cy="11" r="8" stroke="currentColor" stroke-width="2"/>
              <path d="M11 8v6M8 11h6" stroke="currentColor" stroke-width="2"/>
            </svg>
          </button>

          <!-- 旋转控制 -->
          <button class="toolbar-btn" @click="rotateLeft" title="逆时针旋转">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M1 4v6h6M3.51 15a9 9 0 1 0 2.13-9.36L1 10" stroke="currentColor" stroke-width="2" fill="none"/>
            </svg>
          </button>
          
          <button class="toolbar-btn" @click="rotateRight" title="顺时针旋转">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M23 4v6h-6M20.49 15a9 9 0 1 1-2.12-9.36L23 10" stroke="currentColor" stroke-width="2" fill="none"/>
            </svg>
          </button>

          <!-- 重置 -->
          <button class="toolbar-btn" @click="reset" title="重置">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" stroke="currentColor" stroke-width="2" fill="none"/>
              <path d="M21 3v5h-5" stroke="currentColor" stroke-width="2" fill="none"/>
              <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" stroke="currentColor" stroke-width="2" fill="none"/>
              <path d="M8 16l-5 5v-5" stroke="currentColor" stroke-width="2" fill="none"/>
            </svg>
          </button>

          <!-- 适应屏幕 -->
          <button class="toolbar-btn" @click="fitToScreen" title="适应屏幕">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" stroke="currentColor" stroke-width="2" fill="none"/>
            </svg>
          </button>
        </div>


      </div>
    </div>
  </teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'

export type PreviewImageItem =
  | string
  | { thumbnail?: string; url?: string; text?: string }

export interface NormalizedPreviewItem {
  url: string
  text: string
}

interface Props {
  visible: boolean
  imageUrl?: string
  /** 多图模式：传入数组支持 string[] 或 [{ thumbnail, text }] */
  imageUrls?: PreviewImageItem[]
  alt?: string
}

const props = withDefaults(defineProps<Props>(), {
  alt: '图片预览',
  imageUrl: '',
  imageUrls: () => []
})

const emit = defineEmits<{
  close: []
}>()

// 状态管理
const scale = ref(1)
const rotation = ref(0)
const translateX = ref(0)
const translateY = ref(0)
const isDragging = ref(false)
const dragStart = ref({ x: 0, y: 0 })
const hasDragged = ref(false)
const imageRef = ref<HTMLImageElement>()
const currentIndex = ref(0)

// 计算属性
const normalizedList = computed<NormalizedPreviewItem[]>(() => {
  const rawList =
    props.imageUrls && props.imageUrls.length
      ? props.imageUrls
      : props.imageUrl
      ? [props.imageUrl]
      : []

  return rawList
    .map((item) => {
      if (typeof item === 'string') {
        const u = item.trim()
        return u ? { url: u, text: '' } : null
      }
      if (item && typeof item === 'object') {
        const u = String(item.thumbnail || item.url || '').trim()
        return u
          ? {
              url: u,
              text: typeof item.text === 'string' ? item.text : '',
            }
          : null
      }
      return null
    })
    .filter((it): it is NormalizedPreviewItem => !!it && !!it.url)
})

const hasMultiple = computed(() => normalizedList.value.length > 1)

const currentItem = computed<NormalizedPreviewItem | null>(() => {
  return normalizedList.value[currentIndex.value] || null
})

const currentImage = computed(() => currentItem.value?.url || '')
const currentText = computed(() => currentItem.value?.text || '')

/** 切图后重置缩放/位移 */
function switchTo(index: number) {
  const len = normalizedList.value.length
  if (!len) return
  currentIndex.value = (index + len) % len
  scale.value = 1
  rotation.value = 0
  translateX.value = 0
  translateY.value = 0
}

const goPrev = () => switchTo(currentIndex.value - 1)
const goNext = () => switchTo(currentIndex.value + 1)

const imageStyle = computed(() => ({
  transform: `translate(${translateX.value}px, ${translateY.value}px) scale(${scale.value}) rotate(${rotation.value}deg)`,
  cursor: isDragging.value ? 'grabbing' : 'grab'
}))

// 方法
const close = () => {
  emit('close')
}

const handleOverlayClick = (e: MouseEvent) => {
  console.log('handleOverlayClick',e)
  // close()
}

const handleImageClick = (e: MouseEvent) => {
  // 只有在没有拖动的情况下才关闭预览
  if (!hasDragged.value) {
    close()
  }
}

const zoomIn = () => {
  scale.value = Math.min(scale.value * 1.2, 5)
}

const zoomOut = () => {
  scale.value = Math.max(scale.value / 1.2, 0.1)
}

const rotateLeft = () => {
  rotation.value -= 90
}

const rotateRight = () => {
  rotation.value += 90
}

const reset = () => {
  scale.value = 1
  rotation.value = 0
  translateX.value = 0
  translateY.value = 0
}

const fitToScreen = () => {
  if (!imageRef.value) return
  
  const img = imageRef.value
  const container = img.parentElement
  if (!container) return
  
  const containerWidth = container.clientWidth
  const containerHeight = container.clientHeight
  const imgWidth = img.naturalWidth
  const imgHeight = img.naturalHeight
  
  const scaleX = containerWidth / imgWidth
  const scaleY = containerHeight / imgHeight
  scale.value = Math.min(scaleX, scaleY, 1) * 0.9
  
  translateX.value = 0
  translateY.value = 0
}



const handleImageLoad = () => {
  nextTick(() => {
    fitToScreen()
  })
}

const handleImageError = () => {
  console.error('图片加载失败:', currentImage.value)
}

const handleWheel = (e: WheelEvent) => {
  e.preventDefault()
  if (e.deltaY < 0) {
    zoomIn()
  } else {
    zoomOut()
  }
}

const handleMouseDown = (e: MouseEvent) => {
  isDragging.value = true
  hasDragged.value = false
  dragStart.value = { x: e.clientX - translateX.value, y: e.clientY - translateY.value }
}

const handleMouseMove = (e: MouseEvent) => {
  if (!isDragging.value) return
  hasDragged.value = true
  translateX.value = e.clientX - dragStart.value.x
  translateY.value = e.clientY - dragStart.value.y
}

const handleMouseUp = () => {
  isDragging.value = false
  // 延迟重置hasDragged，确保click事件能正确判断
  setTimeout(() => {
    hasDragged.value = false
  }, 100)
}

function handleKeydown(e: KeyboardEvent) {
  if (!props.visible) return

  switch (e.key) {
    case 'Escape':
      close()
      break
    case 'ArrowLeft':
      goPrev()
      break
    case 'ArrowRight':
      goNext()
      break
    case '+':
    case '=':
      zoomIn()
      break
    case '-':
      zoomOut()
      break
    case '0':
      reset()
      break
  }
}

// 监听器

watch(() => props.visible, (visible) => {
  if (visible) {
    currentIndex.value = 0
    document.body.style.overflow = 'hidden'
    nextTick(() => {
      const overlay = document.querySelector('.image-preview-overlay') as HTMLElement
      overlay?.focus()
    })
  } else {
    document.body.style.overflow = ''
  }
})

onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
  document.body.style.overflow = ''
})
</script>

<style scoped>
.image-preview-overlay {
  position: fixed;
  inset: 0;
  z-index: 99999999;
  display: flex;
  background-color: rgb(240 240 240 / 95%);
  background-image: 
    linear-gradient(45deg, #b0b0b0 25%, transparent 25%), 
    linear-gradient(-45deg, #b0b0b0 25%, transparent 25%), 
    linear-gradient(45deg, transparent 75%, #b0b0b0 75%), 
    linear-gradient(-45deg, transparent 75%, #b0b0b0 75%);
  background-position: 0 0, 0 10px, 10px -10px, -10px 0;
  background-size: 20px 20px;
  outline: none;
  align-items: center;
  justify-content: center;
}

.image-preview-container {
  position: relative;
  display: flex;
  width: 100%;
  height: 100%;
  align-items: center;
  justify-content: center;
}

.image-preview-close {
  position: absolute;
  top: 20px;
  right: 20px;
  z-index: 10;
  display: flex;
  width: 48px;
  height: 48px;
  color: white;
  cursor: pointer;
  background: rgb(0 0 0 / 50%);
  border: none;
  border-radius: 50%;
  align-items: center;
  justify-content: center;
}

.image-preview-close:hover {
  background: rgb(0 0 0 / 70%);
}

.image-preview-content {
  display: flex;
  width: 100%;
  height: 100%;
  overflow: hidden;
  align-items: center;
  justify-content: center;
}

.image-preview-img {
  max-width: none;
  max-height: none;
  user-select: none;
  -webkit-user-drag: none;
}

.image-preview-toolbar {
  position: absolute;
  bottom: 20px;
  left: 50%;
  z-index: 10;
  display: flex;
  padding: 12px 16px;
  background: rgb(0 0 0 / 70%);
  border-radius: 24px;
  transform: translateX(-50%);
  align-items: center;
  gap: 12px;
}

.toolbar-btn {
  display: flex;
  width: 40px;
  height: 40px;
  color: white;
  cursor: pointer;
  background: transparent;
  border: none;
  border-radius: 50%;
  align-items: center;
  justify-content: center;
}

.toolbar-btn:hover {
  background: rgb(255 255 255 / 10%);
}

.zoom-text {
  min-width: 50px;
  font-size: 14px;
  color: white;
  text-align: center;
}


/* 多图：左右切换按钮 */
.image-preview-nav {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 50%;
  background: rgb(0 0 0 / 45%);
  color: #fff;
  cursor: pointer;
  transition: background 0.2s;
  z-index: 3;
}

.image-preview-nav:hover {
  background: rgb(0 0 0 / 70%);
}

.image-preview-nav.prev {
  left: 16px;
}

.image-preview-nav.next {
  right: 16px;
}

/* 多图：计数器 */
.image-preview-counter {
  position: absolute;
  top: 16px;
  left: 50%;
  transform: translateX(-50%);
  padding: 2px 12px;
  border-radius: 12px;
  background: rgb(0 0 0 / 55%);
  color: #fff;
  font-size: 13px;
  z-index: 3;
}

/* 多图：底部缩略图条 */
.image-preview-thumbs {
  position: absolute;
  left: 50%;
  bottom: 16px;
  transform: translateX(-50%);
  display: flex;
  gap: 8px;
  max-width: 80vw;
  padding: 8px;
  border-radius: 10px;
  background: rgb(0 0 0 / 45%);
  overflow-x: auto;
  z-index: 3;
}

.image-preview-thumb {
  width: 56px;
  height: 56px;
  object-fit: contain;
  background: #fff;
  border: 2px solid transparent;
  border-radius: 6px;
  cursor: pointer;
  flex-shrink: 0;
  transition: border-color 0.2s;
}

.image-preview-thumb.active {
  border-color: #409eff;
}

/* 多图：当前试文字文案浮层 */
.image-preview-caption {
  position: absolute;
  top: 56px;
  left: 50%;
  transform: translateX(-50%);
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 16px;
  border-radius: 20px;
  background: rgb(0 0 0 / 65%);
  backdrop-filter: blur(8px);
  color: #fff;
  font-size: 14px;
  max-width: 80vw;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
  z-index: 3;
}

.caption-tag {
  font-size: 11px;
  padding: 1px 6px;
  border-radius: 4px;
  background: #409eff;
  color: #fff;
  font-weight: 500;
  flex-shrink: 0;
}

.caption-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 缩略图项外层包装 */
.image-preview-thumb-item {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;
  flex-shrink: 0;
}

.thumb-text-badge {
  position: absolute;
  bottom: 2px;
  left: 2px;
  right: 2px;
  background: rgba(0, 0, 0, 0.72);
  color: #fff;
  font-size: 10px;
  line-height: 14px;
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  padding: 0 2px;
  border-radius: 2px;
  pointer-events: none;
}
</style>
