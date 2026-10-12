<template>
  <el-popover
    v-model:visible="visible"
    placement="bottom-start"
    :width="330"
    trigger="click"
    popper-class="image-size-filter-popover"
  >
    <template #reference>
      <el-button
        size="small"
        :type="hasValue ? 'primary' : 'default'"
        :plain="!hasValue"
        class="image-size-filter-trigger"
        :title="summary"
      >
        <el-icon><FullScreen /></el-icon>
        <span class="image-size-filter-trigger__text">{{ summary }}</span>
        <el-icon
          v-if="hasValue"
          class="image-size-filter-trigger__close"
          @click.stop="clearAll"
        >
          <Close />
        </el-icon>
      </el-button>
    </template>

    <div class="image-size-filter-body">
      <!-- 匹配方式 -->
      <div class="isf-row isf-row--mode">
        <span class="isf-label">匹配方式</span>
        <el-radio-group v-model="mode" size="small">
          <el-radio-button value="exact">精确</el-radio-button>
          <el-radio-button value="range">范围</el-radio-button>
        </el-radio-group>
      </div>

      <!-- 精确：每个维度一个值 -->
      <template v-if="mode === 'exact'">
        <div class="isf-row">
          <span class="isf-label">宽度</span>
          <el-input-number
            v-model="exactWidth"
            size="small"
            :min="1"
            :max="100000"
            :controls="false"
            placeholder="不限"
            class="isf-input"
          />
          <span class="isf-unit">px</span>
        </div>
        <div class="isf-row">
          <span class="isf-label">高度</span>
          <el-input-number
            v-model="exactHeight"
            size="small"
            :min="1"
            :max="100000"
            :controls="false"
            placeholder="不限"
            class="isf-input"
          />
          <span class="isf-unit">px</span>
        </div>
      </template>

      <!-- 范围：每个维度 min ~ max -->
      <template v-else>
        <div class="isf-row">
          <span class="isf-label">宽度</span>
          <el-input-number
            v-model="rangeWidthMin"
            size="small"
            :min="1"
            :max="100000"
            :controls="false"
            placeholder="最小"
            class="isf-input"
          />
          <span class="isf-sep">~</span>
          <el-input-number
            v-model="rangeWidthMax"
            size="small"
            :min="1"
            :max="100000"
            :controls="false"
            placeholder="最大"
            class="isf-input"
          />
          <span class="isf-unit">px</span>
        </div>
        <div class="isf-row">
          <span class="isf-label">高度</span>
          <el-input-number
            v-model="rangeHeightMin"
            size="small"
            :min="1"
            :max="100000"
            :controls="false"
            placeholder="最小"
            class="isf-input"
          />
          <span class="isf-sep">~</span>
          <el-input-number
            v-model="rangeHeightMax"
            size="small"
            :min="1"
            :max="100000"
            :controls="false"
            placeholder="最大"
            class="isf-input"
          />
          <span class="isf-unit">px</span>
        </div>
      </template>

      <!-- 快捷：最小宽度 -->
      <div class="isf-presets">
        <span
          v-for="preset in MIN_WIDTH_PRESETS"
          :key="preset"
          class="isf-chip"
          :class="{ 'is-active': mode === 'range' && rangeWidthMin === preset }"
          @click="applyMinWidthPreset(preset)"
        >
          宽≥{{ preset }}
        </span>
      </div>

      <!-- 实时回显 -->
      <div class="isf-hint">
        <span v-if="previewText" class="isf-hint__preview">{{ previewText }}</span>
        <span v-else class="isf-hint__empty">留空表示不限制，可只填一个维度</span>
      </div>

      <div class="isf-footer">
        <el-button size="small" link :disabled="!hasValue && !dirty" @click="clearAll">
          清空
        </el-button>
        <el-button size="small" type="primary" @click="apply">应用</el-button>
      </div>
    </div>
  </el-popover>
</template>

<script lang="ts">
export interface ImageSizeFilterValue {
  widthMin?: number;
  widthMax?: number;
  heightMin?: number;
  heightMax?: number;
}
</script>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { Close, FullScreen } from "@element-plus/icons-vue";

const props = defineProps<{
  modelValue?: ImageSizeFilterValue;
}>();

const emit = defineEmits<{
  (e: "update:modelValue", value: ImageSizeFilterValue): void;
  (e: "change", value: ImageSizeFilterValue): void;
}>();

/** 常用最小宽度快捷值 */
const MIN_WIDTH_PRESETS = [500, 800, 1000, 2000, 4000];

const visible = ref(false);
const mode = ref<"exact" | "range">("exact");

const exactWidth = ref<number | undefined>();
const exactHeight = ref<number | undefined>();
const rangeWidthMin = ref<number | undefined>();
const rangeWidthMax = ref<number | undefined>();
const rangeHeightMin = ref<number | undefined>();
const rangeHeightMax = ref<number | undefined>();

function toNum(value: unknown): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const num = Number(value);
  return Number.isFinite(num) && num > 0 ? num : undefined;
}

/** 把外部传入的 4 个区间参数还原成内部 UI 状态 */
function syncFromModel() {
  const m = props.modelValue || {};
  const wMin = toNum(m.widthMin);
  const wMax = toNum(m.widthMax);
  const hMin = toNum(m.heightMin);
  const hMax = toNum(m.heightMax);

  rangeWidthMin.value = wMin;
  rangeWidthMax.value = wMax;
  rangeHeightMin.value = hMin;
  rangeHeightMax.value = hMax;

  // 两侧相等即视为"精确"
  const wExact = wMin !== undefined && wMax !== undefined && wMin === wMax;
  const hExact = hMin !== undefined && hMax !== undefined && hMin === hMax;
  exactWidth.value = wExact ? wMin : undefined;
  exactHeight.value = hExact ? hMin : undefined;

  // 只有「空」或「两侧相等」才归入精确模式，否则是真正的区间
  const allExactOrEmpty =
    (wMin === undefined || wExact) &&
    (wMax === undefined || wExact) &&
    (hMin === undefined || hExact) &&
    (hMax === undefined || hExact);
  mode.value = allExactOrEmpty ? "exact" : "range";
}

watch(() => props.modelValue, syncFromModel, { immediate: true, deep: true });

const hasValue = computed(() => {
  const m = props.modelValue || {};
  return (
    m.widthMin !== undefined ||
    m.widthMax !== undefined ||
    m.heightMin !== undefined ||
    m.heightMax !== undefined
  );
});

/** 当前内部输入是否与已应用的条件不同（用于「清空」按钮可用性） */
const dirty = computed(() => {
  const m = props.modelValue || {};
  const current = normalize(mode.value);
  return (
    current.widthMin !== m.widthMin ||
    current.widthMax !== m.widthMax ||
    current.heightMin !== m.heightMin ||
    current.heightMax !== m.heightMax
  );
});

/** 把内部 UI 状态归一化成 4 个区间参数（min > max 时自动交换） */
function normalize(currentMode: "exact" | "range"): ImageSizeFilterValue {
  if (currentMode === "exact") {
    const w = toNum(exactWidth.value);
    const h = toNum(exactHeight.value);
    return { widthMin: w, widthMax: w, heightMin: h, heightMax: h };
  }
  // el-input-number 清空时可能给出 null，统一收敛成 undefined 再比较
  const wMin = toNum(rangeWidthMin.value);
  const wMax = toNum(rangeWidthMax.value);
  const hMin = toNum(rangeHeightMin.value);
  const hMax = toNum(rangeHeightMax.value);
  return {
    widthMin: wMin !== undefined && wMax !== undefined ? Math.min(wMin, wMax) : wMin,
    widthMax: wMin !== undefined && wMax !== undefined ? Math.max(wMin, wMax) : wMax,
    heightMin: hMin !== undefined && hMax !== undefined ? Math.min(hMin, hMax) : hMin,
    heightMax: hMin !== undefined && hMax !== undefined ? Math.max(hMin, hMax) : hMax,
  };
}

function formatDim(label: string, min?: number, max?: number): string | null {
  if (min !== undefined && max !== undefined) {
    return min === max ? `${label}=${min}` : `${label} ${min}~${max}`;
  }
  if (min !== undefined) return `${label}≥${min}`;
  if (max !== undefined) return `${label}≤${max}`;
  return null;
}

const summary = computed(() => {
  const m = props.modelValue || {};
  const parts = [
    formatDim("宽", m.widthMin, m.widthMax),
    formatDim("高", m.heightMin, m.heightMax),
  ].filter(Boolean);
  return parts.length ? parts.join(" · ") : "像素尺寸";
});

const previewText = computed(() => {
  const current = normalize(mode.value);
  const parts = [
    formatDim("宽度", current.widthMin, current.widthMax),
    formatDim("高度", current.heightMin, current.heightMax),
  ].filter(Boolean);
  return parts.length ? parts.join(" · ") : "";
});

function applyMinWidthPreset(value: number) {
  mode.value = "range";
  rangeWidthMin.value = value;
}

function apply() {
  const next = normalize(mode.value);
  emit("update:modelValue", next);
  emit("change", next);
  visible.value = false;
}

function clearAll() {
  exactWidth.value = undefined;
  exactHeight.value = undefined;
  rangeWidthMin.value = undefined;
  rangeWidthMax.value = undefined;
  rangeHeightMin.value = undefined;
  rangeHeightMax.value = undefined;
  mode.value = "exact";
  const empty: ImageSizeFilterValue = {};
  emit("update:modelValue", empty);
  emit("change", empty);
  visible.value = false;
}
</script>

<style scoped>
.image-size-filter-trigger {
  display: inline-flex;
  gap: 6px;
  max-width: 100%;
  align-items: center;
}

.image-size-filter-trigger__text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.image-size-filter-trigger__close {
  margin-left: auto;
  opacity: 0.7;
}

.image-size-filter-trigger__close:hover {
  opacity: 1;
}
</style>

<!-- 弹层会 teleport 到 body，scoped 样式无法命中 -->
<style>
.image-size-filter-popover .image-size-filter-body {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.image-size-filter-popover .isf-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.image-size-filter-popover .isf-row--mode {
  justify-content: space-between;
}

.image-size-filter-popover .isf-label {
  width: 56px;
  font-size: 12px;
  color: var(--el-text-color-regular);
  flex-shrink: 0;
}

.image-size-filter-popover .isf-input {
  flex: 1;
  min-width: 0;
}

.image-size-filter-popover .isf-sep {
  color: var(--el-text-color-secondary);
  flex-shrink: 0;
}

.image-size-filter-popover .isf-unit {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  flex-shrink: 0;
}

.image-size-filter-popover .isf-presets {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding-top: 2px;
}

.image-size-filter-popover .isf-chip {
  padding: 2px 8px;
  font-size: 12px;
  color: var(--el-text-color-regular);
  background: var(--el-fill-color-light);
  border: 1px solid transparent;
  border-radius: 999px;
  cursor: pointer;
  transition: all 0.15s;
}

.image-size-filter-popover .isf-chip:hover {
  color: var(--el-color-primary);
  border-color: var(--el-color-primary);
}

.image-size-filter-popover .isf-chip.is-active {
  color: var(--el-color-primary);
  background: color-mix(in srgb, var(--el-color-primary) 12%, transparent);
  border-color: var(--el-color-primary);
}

.image-size-filter-popover .isf-hint {
  font-size: 12px;
  line-height: 1.5;
}

.image-size-filter-popover .isf-hint__preview {
  color: var(--el-color-primary);
}

.image-size-filter-popover .isf-hint__empty {
  color: var(--el-text-color-secondary);
}

.image-size-filter-popover .isf-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding-top: 4px;
  border-top: 1px solid var(--el-border-color-lighter);
}
</style>
