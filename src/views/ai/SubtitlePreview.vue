<template>
  <el-dialog v-model="visible" class="subtitle-preview-dialog" title="字幕预览" width="700px" :destroy-on-close="true"
    @close="handleClose">
    <div v-loading="loading" class="sp-body">
      <!-- 当前字幕 -->
      <div class="sp-current">
        <div v-if="currentSentenceIndex !== -1" class="sp-current-text" :style="getKaraokeStyle(currentSentenceIndex)">
          {{ getSentences()[currentSentenceIndex]?.text }}
        </div>
        <div v-else class="sp-current-empty">{{ isPlaying ? '...' : '点击播放' }}</div>
      </div>

      <!-- 播放控制 -->
      <div v-if="row?.resultUrl" class="sp-player">
        <audio ref="audioRef" :src="row.resultUrl" preload="auto" @loadedmetadata="onLoadedMetadata"
          @timeupdate="onTimeUpdate" @ended="onEnded" @play="onPlay" @pause="onPause" />
        <button class="sp-play-btn" @click="isPlaying ? pause() : play()">
          <el-icon><VideoPause v-if="isPlaying" /><VideoPlay v-else /></el-icon>
        </button>
        <div class="sp-progress" @click="handleProgressClick">
          <div class="sp-progress-bar" :style="{ width: audioProgressPercent }"></div>
        </div>
        <span class="sp-time">{{ formatTime(currentTime) }}/{{ formatTime(audioDuration) }}</span>
      </div>

      <!-- 字幕列表 -->
      <div class="sp-list" ref="trackRef">
        <div v-for="(s, idx) in getSentences()" :key="s.index || idx"
          :class="['sp-item', { active: idx === currentSentenceIndex }]" @click="seekToSentence(Number(s.start))">
          <span class="sp-idx">{{ idx + 1 }}</span>
          <span class="sp-text" :style="getKaraokeStyle(idx)">{{ s.text }}</span>
          <span class="sp-dur">{{ formatTime(s.duration) }}</span>
        </div>
      </div>
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onBeforeUnmount } from 'vue'
import { VideoPlay, VideoPause } from '@element-plus/icons-vue'

const props = defineProps<{ modelValue: boolean; row: any }>()
const emit = defineEmits(['update:modelValue'])

const visible = computed({ get: () => props.modelValue, set: (val) => emit('update:modelValue', val) })

const audioRef = ref<HTMLAudioElement | null>(null)
const trackRef = ref<HTMLElement | null>(null)
const currentTime = ref(0)
const audioDuration = ref(0)
const currentSentenceIndex = ref(-1)
const isPlaying = ref(false)
const loading = ref(false)
const timerLoopId = ref<number | null>(null)

const formatTime = (val: any) => {
  if (!val && val !== 0) return '0.0'
  return Number(val).toFixed(1)
}

const audioProgressPercent = computed(() => {
  const dur = audioDuration.value || props.row?.duration || 0
  if (!dur) return '0%'
  return `${Math.min(100, (currentTime.value / Number(dur)) * 100).toFixed(1)}%`
})

const getSentences = () => {
  const sub = props.row?.subtitle
  if (!sub) return []
  let obj = sub
  if (typeof sub === 'string') { try { obj = JSON.parse(sub) } catch { return [] } }
  return obj?.sentences || []
}

const startLoop = () => {
  if (timerLoopId.value) return
  const loop = () => { if (audioRef.value) update(audioRef.value.currentTime); timerLoopId.value = requestAnimationFrame(loop) }
  timerLoopId.value = requestAnimationFrame(loop)
}
const stopLoop = () => { if (timerLoopId.value) { cancelAnimationFrame(timerLoopId.value); timerLoopId.value = null } }

const update = (t: number) => {
  currentTime.value = t
  const sentences = getSentences()
  if (!sentences.length) return
  const idx = sentences.findIndex((s: any) => t >= Number(s.start || 0) && t <= Number(s.end || (Number(s.start) + Number(s.duration))))
  currentSentenceIndex.value = idx
}

const getKaraokeStyle = (idx: number) => {
  if (idx < 0) return {}
  const s = getSentences()[idx]
  if (!s) return {}
  const start = Number(s.start || 0)
  const dur = Number(s.duration || (Number(s.end) - start || 0))
  const end = start + dur
  let p = currentTime.value >= end ? 100 : currentTime.value <= start ? 0 : ((currentTime.value - start) / Math.max(0.01, dur)) * 100
  return {
    background: `linear-gradient(90deg, var(--el-color-primary) ${p}%, var(--el-text-color-primary) ${p}%)`,
    WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent'
  }
}

const handleProgressClick = (e: MouseEvent) => {
  if (!audioRef.value) return
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
  audioRef.value.currentTime = ((e.clientX - rect.left) / rect.width) * (audioDuration.value || 0)
  update(audioRef.value.currentTime)
}

const play = async () => { if (audioRef.value) { try { await audioRef.value.play() } catch {} } }
const pause = () => { if (audioRef.value) audioRef.value.pause() }

const seekToSentence = (t: number) => { if (audioRef.value) { audioRef.value.currentTime = t; if (!isPlaying.value) play() } }

const onPlay = () => { isPlaying.value = true; startLoop() }
const onPause = () => { isPlaying.value = false; stopLoop() }
const onEnded = () => { currentTime.value = 0; stopLoop(); currentSentenceIndex.value = -1; isPlaying.value = false }
const onTimeUpdate = (e: any) => { audioDuration.value = Number(e.target.duration || audioDuration.value || props.row?.duration || 0); if (!timerLoopId.value) update(e.target.currentTime || 0) }
const onLoadedMetadata = (e: any) => { audioDuration.value = Number(e.target.duration || props.row?.duration || 0) }

const handleClose = () => {
  stopLoop()
  if (audioRef.value) { audioRef.value.pause(); audioRef.value.currentTime = 0 }
  visible.value = false
}

watch(() => props.modelValue, async (val) => {
  if (val) {
    loading.value = true
    await nextTick()
    // 等待数据加载完成（有 subtitle 或 url 才算加载完）
    const checkReady = () => {
      const hasAudio = props.row?.resultUrl || props.row?.url
      const hasSubtitle = props.row?.subtitle?.sentences?.length > 0
      return hasAudio && hasSubtitle
    }
    // 轮询等待数据就绪（最多等 5 秒）
    let retries = 0
    const waitForData = async () => {
      while (!checkReady() && retries < 50) {
        await new Promise(r => setTimeout(r, 100))
        retries++
      }
      loading.value = false
      if (audioRef.value && checkReady()) {
        audioRef.value.currentTime = 0
        audioDuration.value = Number(props.row?.duration || 0)
        play()
      }
    }
    waitForData()
  }
})

watch(() => currentSentenceIndex.value, (idx) => {
  if (idx !== -1 && trackRef.value) {
    nextTick(() => {
      const el = trackRef.value?.querySelector('.sp-item.active') as HTMLElement
      if (el) trackRef.value?.scrollTo({ top: el.offsetTop - (trackRef.value.offsetHeight / 2) + (el.offsetHeight / 2), behavior: 'smooth' })
    })
  }
})

onBeforeUnmount(() => stopLoop())
</script>

<style scoped>
.sp-body { padding: 16px; }

/* 当前字幕 */
.sp-current {
  min-height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  margin-bottom: 12px;
  background: var(--el-fill-color-blank);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
}
.sp-current-text { font-size: 18px; font-weight: 500; line-height: 1.4; }
.sp-current-empty { font-size: 14px; color: var(--el-text-color-placeholder); }

/* 播放控制 */
.sp-player {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}
.sp-play-btn {
  width: 32px; height: 32px;
  border: none; border-radius: 50%;
  background: var(--el-color-primary);
  color: #fff;
  cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.sp-play-btn:hover { opacity: 0.85; }
.sp-progress {
  flex: 1;
  height: 4px;
  background: var(--el-border-color);
  border-radius: 2px;
  cursor: pointer;
  overflow: hidden;
}
.sp-progress-bar { height: 100%; background: var(--el-color-primary); transition: width 0.1s linear; }
.sp-time { font-size: 12px; color: var(--el-text-color-secondary); min-width: 80px; text-align: right; font-variant-numeric: tabular-nums; }

/* 字幕列表 */
.sp-list {
  max-height: 300px;
  overflow-y: auto;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  padding: 4px;
}
.sp-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.1s;
}
.sp-item:hover { background: var(--el-fill-color); }
.sp-item.active {
  background: color-mix(in srgb, var(--el-color-primary) 12%, transparent);
}
.sp-item.active .sp-text { font-weight: 500; }

.sp-idx {
  width: 20px; height: 20px;
  display: flex; align-items: center; justify-content: center;
  font-size: 11px; font-weight: 600;
  color: var(--el-text-color-secondary);
  background: var(--el-fill-color);
  border-radius: 4px;
  flex-shrink: 0;
}
.sp-item.active .sp-idx {
  background: var(--el-color-primary);
  color: #fff;
}
.sp-item.active .sp-text { font-weight: 600; }

.sp-text { flex: 1; font-size: 14px; line-height: 1.4; }
.sp-dur { font-size: 11px; color: var(--el-text-color-secondary); font-variant-numeric: tabular-nums; }
</style>
