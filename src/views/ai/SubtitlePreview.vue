<template>
  <el-dialog
    v-model="visible"
    class="subtitle-preview-dialog"
    fullscreen
    :destroy-on-close="true"
    :show-close="true"
    append-to-body
    @close="handleClose"
  >
    <template #header>
      <div class="sp-head">
        <div class="sp-head-title">字幕预览</div>
        <div class="sp-head-meta">
          <span v-if="metaVoice">{{ metaVoice }}</span>
          <span v-if="sentenceCount">{{ sentenceCount }} 句</span>
          <span>{{ formatClock(totalDuration) }}</span>
        </div>
        <span class="sp-status" :class="`is-${statusInfo.tone}`">{{ statusInfo.label }}</span>
        <button
          class="sp-icon-btn"
          :class="{ 'is-off': muted }"
          :title="muted ? '取消静音' : '静音'"
          @click="toggleMute"
        >
          <el-icon><Mute v-if="muted" /><Microphone v-else /></el-icon>
        </button>
      </div>
    </template>

    <div v-loading="loading" class="sp-body">
      <audio
        ref="audioRef"
        :src="row?.resultUrl || row?.url"
        preload="auto"
        class="sp-audio"
        @loadedmetadata="onLoadedMetadata"
        @timeupdate="onTimeUpdate"
        @ended="onEnded"
        @play="onPlay"
        @pause="onPause"
        @error="onAudioError"
      />

      <div class="sp-current" :class="{ 'is-active': hasSubtitle && currentSentenceIndex >= 0 }">
        {{ activeText }}
      </div>

      <div class="sp-transport">
        <button
          class="sp-play"
          :class="{ 'is-playing': isPlaying }"
          :disabled="!hasAudio || audioError"
          :title="isPlaying ? '暂停' : '播放'"
          @click="isPlaying ? pause() : play()"
        >
          <el-icon><VideoPause v-if="isPlaying" /><VideoPlay v-else /></el-icon>
        </button>
        <span class="sp-time"
          >{{ formatClock(currentTime) }} / {{ formatClock(totalDuration) }}</span
        >
        <div
          ref="timelineRef"
          class="sp-seek"
          :class="{ 'is-disabled': !hasAudio || audioError }"
          @pointerdown="onTimelineDown"
          @pointermove="onTimelineMove"
          @pointerup="onTimelineUp"
        >
          <div class="sp-seek-fill" :style="{ width: audioProgressPercent }"></div>
        </div>
        <button v-if="audioError" class="sp-retry" @click="retryAudio">重试</button>
      </div>

      <div ref="trackRef" class="sp-track">
        <div
          v-for="(s, idx) in sentences"
          :key="s.index || idx"
          class="sp-item"
          :class="{ active: idx === currentSentenceIndex }"
          @click="seekToSentence(Number(s.start))"
        >
          <span class="sp-idx">{{ idx + 1 }}</span>
          <span class="sp-text">{{ s.text }}</span>
          <span class="sp-dur">{{ formatTime(s.duration) }}s</span>
        </div>
        <div v-if="!hasSubtitle" class="sp-empty">
          <el-icon><Tickets /></el-icon>
          <span>暂无字幕</span>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="sp-foot">
        <button class="sp-copy is-primary" @click="copyAudioData">
          <el-icon><DocumentCopy /></el-icon>复制音频数据
        </button>
        <button class="sp-copy" @click="copyText">
          <el-icon><Document /></el-icon>复制文案
        </button>
        <button class="sp-copy" @click="copySubtitles">
          <el-icon><Tickets /></el-icon>复制字幕
        </button>
        <button class="sp-copy" @click="copyAudioUrl">
          <el-icon><Link /></el-icon>复制链接
        </button>
        <button class="sp-close" @click="handleClose">关闭</button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from "vue";
import {
  VideoPlay,
  VideoPause,
  Mute,
  Microphone,
  DocumentCopy,
  Document,
  Link,
  Tickets,
} from "@element-plus/icons-vue";
import { ElMessage } from "element-plus";
import { getTtsAudioContentInfo } from "@/api/ai/tts";

const props = defineProps<{ modelValue: boolean; row: any }>();
const emit = defineEmits(["update:modelValue"]);

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit("update:modelValue", val),
});

const audioRef = ref<HTMLAudioElement | null>(null);
const trackRef = ref<HTMLElement | null>(null);
const timelineRef = ref<HTMLElement | null>(null);
const currentTime = ref(0);
const audioDuration = ref(0);
const currentSentenceIndex = ref(-1);
const isPlaying = ref(false);
const loading = ref(false);
const timerLoopId = ref<number | null>(null);
const audioError = ref(false);
const isSeeking = ref(false);
const muted = ref(false);

const formatTime = (val: any) => {
  if (!val && val !== 0) return "0.0";
  return Number(val).toFixed(1);
};

const formatClock = (val: any) => {
  const t = Math.max(0, Number(val) || 0);
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
};

interface SubtitleSentence {
  index?: number;
  text?: string;
  start?: number | string;
  end?: number | string;
  duration?: number | string;
}

const getSentences = (): SubtitleSentence[] => {
  const sub = props.row?.subtitle;
  if (!sub) return [];
  let obj = sub;
  if (typeof sub === "string") {
    try {
      obj = JSON.parse(sub);
    } catch {
      return [];
    }
  }
  return (obj?.sentences || []) as SubtitleSentence[];
};

const sentences = computed(() => getSentences());
const sentenceCount = computed(() => sentences.value.length);
const hasSubtitle = computed(() => sentenceCount.value > 0);
const hasAudio = computed(() => !!(props.row?.resultUrl || props.row?.url));
const totalDuration = computed(() => Number(audioDuration.value || props.row?.duration || 0));

const metaVoice = computed(
  () =>
    props.row?.voice || props.row?.configParams?.voice || props.row?.configParams?.voiceId || "",
);

const statusInfo = computed(() => {
  const sub = props.row?.subtitle;
  let obj = sub;
  if (typeof sub === "string") {
    try {
      obj = JSON.parse(sub);
    } catch {
      obj = null;
    }
  }
  const st = obj?.subtitleStatus;
  const n = obj?.sentences?.length || 0;
  if (st === "failed") return { label: "失败", tone: "danger" };
  if (st === "skipped") return { label: "跳过", tone: "info" };
  if (st === "fallback") return { label: "兜底", tone: "warning" };
  if (st === "success" || n > 0) return { label: "已生成", tone: "success" };
  return { label: "无字幕", tone: "info" };
});

const audioProgressPercent = computed(() => {
  const dur = totalDuration.value;
  if (!dur) return "0%";
  return `${Math.min(100, (currentTime.value / dur) * 100).toFixed(2)}%`;
});

const activeText = computed(() => {
  const s = sentences.value[currentSentenceIndex.value];
  if (s?.text) return s.text;
  if (hasSubtitle.value) return sentences.value[0]?.text || "";
  return props.row?.text || "";
});

const startLoop = () => {
  if (timerLoopId.value) return;
  const tick = () => {
    if (audioRef.value) update(audioRef.value.currentTime);
    timerLoopId.value = requestAnimationFrame(tick);
  };
  timerLoopId.value = requestAnimationFrame(tick);
};
const stopLoop = () => {
  if (timerLoopId.value) {
    cancelAnimationFrame(timerLoopId.value);
    timerLoopId.value = null;
  }
};

const update = (t: number) => {
  currentTime.value = t;
  const list = getSentences();
  if (!list.length) {
    currentSentenceIndex.value = -1;
    return;
  }
  let idx = -1;
  for (let i = 0; i < list.length; i++) {
    if (t >= Number(list[i].start || 0)) idx = i;
    else break;
  }
  currentSentenceIndex.value = idx;
};

const applyMuted = () => {
  if (audioRef.value) audioRef.value.muted = muted.value;
};

const play = async () => {
  if (audioRef.value) {
    try {
      await audioRef.value.play();
    } catch {}
  }
};
const pause = () => {
  if (audioRef.value) audioRef.value.pause();
};

const seekToSentence = (t: number) => {
  if (audioRef.value) {
    audioRef.value.currentTime = t;
    update(t);
    if (!isPlaying.value) play();
  }
};

const seekToFraction = (frac: number) => {
  const a = audioRef.value;
  if (!a || !totalDuration.value) return;
  const t = Math.max(0, Math.min(1, frac)) * totalDuration.value;
  a.currentTime = t;
  update(t);
};

const toggleMute = () => {
  muted.value = !muted.value;
  applyMuted();
};

const fractionFromEvent = (e: PointerEvent) => {
  const el = timelineRef.value;
  if (!el) return 0;
  const rect = el.getBoundingClientRect();
  return (e.clientX - rect.left) / rect.width;
};
const onTimelineDown = (e: PointerEvent) => {
  if (!hasAudio.value || audioError.value) return;
  isSeeking.value = true;
  (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  seekToFraction(fractionFromEvent(e));
};
const onTimelineMove = (e: PointerEvent) => {
  if (isSeeking.value) seekToFraction(fractionFromEvent(e));
};
const onTimelineUp = (e: PointerEvent) => {
  if (!isSeeking.value) return;
  isSeeking.value = false;
  (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
};

const retryAudio = () => {
  audioError.value = false;
  const a = audioRef.value;
  if (a) {
    a.load();
    applyMuted();
    play();
  }
};

const onPlay = () => {
  isPlaying.value = true;
  startLoop();
};
const onPause = () => {
  isPlaying.value = false;
  stopLoop();
};
const onEnded = () => {
  currentTime.value = 0;
  stopLoop();
  currentSentenceIndex.value = -1;
  isPlaying.value = false;
};
const onTimeUpdate = (e: any) => {
  audioDuration.value = Number(
    e.target.duration || audioDuration.value || props.row?.duration || 0,
  );
  if (!timerLoopId.value) update(e.target.currentTime || 0);
};
const onLoadedMetadata = (e: any) => {
  audioDuration.value = Number(e.target.duration || props.row?.duration || 0);
  audioError.value = false;
  applyMuted();
};
const onAudioError = () => {
  audioError.value = true;
  isPlaying.value = false;
  stopLoop();
};

const handleClose = () => {
  stopLoop();
  if (audioRef.value) {
    audioRef.value.pause();
    audioRef.value.currentTime = 0;
  }
  visible.value = false;
};

const scrollToActive = (behavior: ScrollBehavior = "smooth") => {
  const track = trackRef.value;
  if (!track) return;
  const el = track.querySelector(".sp-item.active") as HTMLElement;
  if (el)
    track.scrollTo({ top: el.offsetTop - track.offsetHeight / 2 + el.offsetHeight / 2, behavior });
};

watch(
  () => props.modelValue,
  async (val) => {
    if (val) {
      loading.value = true;
      audioError.value = false;
      currentTime.value = 0;
      currentSentenceIndex.value = -1;
      await nextTick();
      const checkReady = () => {
        const hasA = props.row?.resultUrl || props.row?.url;
        const sub = props.row?.subtitle;
        let obj = sub;
        if (typeof sub === "string") {
          try {
            obj = JSON.parse(sub);
          } catch {
            obj = null;
          }
        }
        const hasS = (obj?.sentences?.length || 0) > 0;
        return hasA && hasS;
      };
      let retries = 0;
      const waitForData = async () => {
        while (!checkReady() && retries < 50) {
          await new Promise((r) => setTimeout(r, 100));
          retries++;
        }
        loading.value = false;
        await nextTick();
        if (audioRef.value) {
          applyMuted();
          if (checkReady()) {
            audioRef.value.currentTime = 0;
            audioDuration.value = Number(props.row?.duration || 0);
            update(0);
            play();
          }
        }
      };
      waitForData();
    }
  },
);

watch(
  () => currentSentenceIndex.value,
  (idx) => {
    if (idx !== -1) nextTick(() => scrollToActive());
  },
);

const copyAudioData = async () => {
  try {
    let payload: any = null;
    if (props.row?.id) {
      try {
        const res = await getTtsAudioContentInfo(props.row.id);
        const content = res?.data ?? res;
        payload = {
          text: content.text || "",
          url: content.url || content.audioUrl || "",
          duration: content.duration ?? null,
          subtitle: content.subtitle || null,
        };
      } catch {
        // fallback
      }
    }
    if (!payload) {
      payload = {
        text: props.row?.text || "",
        url: props.row?.resultUrl || props.row?.url || "",
        duration: props.row?.duration ? Number(props.row.duration) : null,
        subtitle: getSentences().length
          ? { sentences: getSentences() }
          : props.row?.subtitle || null,
      };
    }
    await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
    ElMessage.success("已复制音频数据（文案/链接/时长/字幕）到剪贴板");
  } catch (err: any) {
    ElMessage.error(err?.message || "复制失败");
  }
};

const copyText = async () => {
  const text = props.row?.text || "";
  if (!text) {
    ElMessage.warning("暂无文案");
    return;
  }
  await navigator.clipboard.writeText(text);
  ElMessage.success("文案已复制到剪贴板");
};

const copySubtitles = async () => {
  const list = getSentences();
  if (!list.length) {
    ElMessage.warning("暂无字幕数据");
    return;
  }
  const formatted = list
    .map(
      (s: any, i: number) =>
        `${i + 1}. [${formatTime(s.start)}s ~ ${formatTime(s.end)}s] ${s.text}`,
    )
    .join("\n");
  await navigator.clipboard.writeText(formatted);
  ElMessage.success("字幕已复制到剪贴板");
};

const copyAudioUrl = async () => {
  const url = props.row?.resultUrl || props.row?.url || "";
  if (!url) {
    ElMessage.warning("暂无音频地址");
    return;
  }
  await navigator.clipboard.writeText(url);
  ElMessage.success("音频地址已复制到剪贴板");
};

onBeforeUnmount(() => stopLoop());
</script>

<style scoped>
.sp-audio {
  display: none;
}

.sp-body {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 20px;
  min-height: 0;
  padding: 24px;
}

.sp-current {
  min-height: 44px;
  font-size: 28px;
  font-weight: 600;
  line-height: 1.5;
  color: var(--el-text-color-primary);
  flex-shrink: 0;
}

.sp-current.is-active {
  color: var(--el-color-primary);
}

.sp-transport {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: 16px;
}

.sp-play {
  display: inline-flex;
  width: 40px;
  height: 40px;
  font-size: 18px;
  color: var(--el-color-primary);
  cursor: pointer;
  background: transparent;
  border: 1px solid var(--el-border-color);
  border-radius: 4px;
  align-items: center;
  justify-content: center;
}

.sp-play.is-playing {
  background: var(--el-color-primary-light-9);
  border-color: var(--el-color-primary);
}

.sp-play:disabled {
  color: var(--el-text-color-placeholder);
  cursor: not-allowed;
}

.sp-time {
  font-size: 13px;
  color: var(--el-text-color-secondary);
  flex-shrink: 0;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.sp-seek {
  position: relative;
  height: 4px;
  cursor: pointer;
  background: var(--el-fill-color);
  border-radius: 2px;
  flex: 1;
  touch-action: none;
}

.sp-seek.is-disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.sp-seek-fill {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  background: var(--el-color-primary);
  border-radius: 2px;
}

.sp-retry {
  padding: 4px 12px;
  font-size: 13px;
  color: var(--el-color-danger);
  cursor: pointer;
  background: transparent;
  border: 1px solid var(--el-color-danger);
  border-radius: 4px;
  flex-shrink: 0;
}

.sp-track {
  position: relative;
  flex: 1;
  min-height: 0;
  padding: 8px 12px 8px 0;
  overflow-y: auto;
  border-top: 1px solid var(--el-border-color-lighter);
}

.sp-track::-webkit-scrollbar {
  width: 10px;
}

.sp-track::-webkit-scrollbar-track {
  background: transparent;
}

.sp-track::-webkit-scrollbar-thumb {
  background-color: var(--el-border-color);
  border: 3px solid transparent;
  border-radius: 5px;
  background-clip: padding-box;
}

.sp-track::-webkit-scrollbar-thumb:hover {
  background-color: var(--el-text-color-placeholder);
}

.sp-item {
  display: flex;
  padding: 10px 12px;
  color: var(--el-text-color-regular);
  cursor: pointer;
  border-bottom: 1px solid var(--el-border-color-lighter);
  border-left: 2px solid transparent;
  align-items: baseline;
  gap: 12px;
}

.sp-item:hover {
  background: var(--el-fill-color-light);
}

.sp-item.active {
  color: var(--el-color-primary);
  background: var(--el-color-primary-light-9);
  border-left-color: var(--el-color-primary);
}

.sp-idx {
  width: 24px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  flex-shrink: 0;
  font-variant-numeric: tabular-nums;
}

.sp-item.active .sp-idx {
  color: var(--el-color-primary);
}

.sp-text {
  flex: 1;
  font-size: 15px;
  line-height: 1.6;
}

.sp-dur {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  flex-shrink: 0;
  font-variant-numeric: tabular-nums;
}

.sp-empty {
  display: flex;
  padding: 48px 0;
  font-size: 14px;
  color: var(--el-text-color-secondary);
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.sp-head {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.sp-head-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.sp-head-meta {
  display: flex;
  font-size: 13px;
  color: var(--el-text-color-secondary);
  gap: 12px;
  flex-wrap: wrap;
}

.sp-status {
  padding: 2px 10px;
  margin-left: auto;
  font-size: 12px;
  border-radius: 4px;
}

.sp-status.is-success {
  color: var(--el-color-success);
  background: var(--el-color-success-light-9);
}

.sp-status.is-warning {
  color: var(--el-color-warning);
  background: var(--el-color-warning-light-9);
}

.sp-status.is-danger {
  color: var(--el-color-danger);
  background: var(--el-color-danger-light-9);
}

.sp-status.is-info {
  color: var(--el-color-info);
  background: var(--el-color-info-light-9);
}

.sp-icon-btn {
  display: inline-flex;
  width: 32px;
  height: 32px;
  font-size: 16px;
  color: var(--el-text-color-regular);
  cursor: pointer;
  background: transparent;
  border: 1px solid var(--el-border-color);
  border-radius: 4px;
  align-items: center;
  justify-content: center;
}

.sp-icon-btn.is-off {
  color: var(--el-color-danger);
  border-color: var(--el-color-danger);
}

.sp-foot {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.sp-copy {
  display: inline-flex;
  padding: 6px 14px;
  font-size: 13px;
  color: var(--el-text-color-regular);
  white-space: nowrap;
  cursor: pointer;
  background: transparent;
  border: 1px solid var(--el-border-color);
  border-radius: 4px;
  align-items: center;
  gap: 6px;
}

.sp-copy:hover {
  color: var(--el-color-primary);
  border-color: var(--el-color-primary);
}

.sp-copy.is-primary {
  color: #fff;
  background: var(--el-color-primary);
  border-color: var(--el-color-primary);
}

.sp-copy.is-primary:hover {
  color: #fff;
  background: var(--el-color-primary-light-3);
}

.sp-close {
  padding: 6px 20px;
  margin-left: auto;
  font-size: 13px;
  color: var(--el-text-color-regular);
  white-space: nowrap;
  cursor: pointer;
  background: transparent;
  border: 1px solid var(--el-border-color);
  border-radius: 4px;
}

.sp-close:hover {
  color: var(--el-color-primary);
  border-color: var(--el-color-primary);
}
</style>

<style>
.subtitle-preview-dialog.is-fullscreen {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.subtitle-preview-dialog .el-dialog__header {
  padding: 14px 56px 14px 24px;
  margin-right: 0;
  border-bottom: 1px solid var(--el-border-color-lighter);
  flex-shrink: 0;
}

.subtitle-preview-dialog .el-dialog__body {
  display: flex;
  min-height: 0;
  padding: 0;
  overflow: hidden;
  flex: 1;
  flex-direction: column;
}

.subtitle-preview-dialog .el-dialog__footer {
  flex-shrink: 0;
  padding: 12px 24px;
  border-top: 1px solid var(--el-border-color-lighter);
}
</style>
