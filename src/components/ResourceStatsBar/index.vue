<template>
  <div class="rsb">
    <div class="rsb__stats">
      <div v-for="w in windowItems" :key="w.key" class="rsb__item">
        <span class="rsb__label">{{ w.label }}</span>
        <span class="rsb__value" :class="{ 'is-zero': w.count === 0 }">
          {{ w.prefix }}{{ formatNumber(w.count) }}
        </span>
      </div>
      <div v-if="showTotal" class="rsb__item rsb__item--total">
        <span class="rsb__label">总量</span>
        <span class="rsb__value">{{ formatNumber(stats?.total) }}</span>
      </div>
    </div>

    <svg
      v-if="sparkPath"
      class="rsb__spark"
      :class="{ 'rsb__spark--fill': sparkFill }"
      :width="width"
      :height="height"
      :viewBox="`0 0 ${width} ${height}`"
      preserveAspectRatio="none"
      role="img"
      aria-label="近期趋势"
    >
      <defs>
        <!-- 从上到下的渐变填充：顶部较实，向下淡出 -->
        <linearGradient :id="gradientId" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="currentColor" stop-opacity="0.5" />
          <stop offset="55%" stop-color="currentColor" stop-opacity="0.18" />
          <stop offset="100%" stop-color="currentColor" stop-opacity="0" />
        </linearGradient>
      </defs>
      <path :d="areaPath" :fill="`url(#${gradientId})`" stroke="none" />
      <path
        :d="sparkPath"
        class="rsb__spark-line"
        fill="none"
        vector-effect="non-scaling-stroke"
      />
      <circle
        v-if="lastPoint"
        :cx="lastPoint.x"
        :cy="lastPoint.y"
        r="2.5"
        class="rsb__spark-dot"
      />
    </svg>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { ResourceStats } from "@/api/crawler-material";

const props = withDefaults(
  defineProps<{
    stats: ResourceStats | null | undefined;
    /** 是否显示总量 */
    showTotal?: boolean;
    /** 迷你折线宽度（viewBox 宽度） */
    width?: number;
    /** 迷你折线高度 */
    height?: number;
    /** 折线是否横向撑满剩余空间（首页大图用） */
    sparkFill?: boolean;
  }>(),
  {
    stats: null,
    showTotal: true,
    width: 120,
    height: 28,
    sparkFill: false,
  },
);

// 渐变 ID 必须全局唯一，否则同页多个实例会互相覆盖
let gradientSeq = 0;
const gradientId = `rsb-grad-${++gradientSeq}-${Math.random().toString(36).slice(2, 8)}`;

const formatNumber = (value: number | null | undefined) =>
  Number(value || 0).toLocaleString("en-US");

const windowItems = computed(() => {
  const list = props.stats?.windows || [];
  // 「今日」用 + 前缀，强调新增
  return list.map((w) => ({
    ...w,
    prefix: w.key === "today" ? "+" : "",
  }));
});

// ── 迷你折线 ─────────────────────────────────────────────
const lastPoint = computed(() => {
  const pts = points.value;
  return pts.length ? pts[pts.length - 1] : null;
});

const points = computed(() => {
  const series = props.stats?.series || [];
  if (series.length < 2) return [];

  const w = props.width;
  const h = props.height;
  const pad = 3;
  const values = series.map((p) => Number(p.count || 0));
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const span = max - min || 1;

  return series.map((p, i) => ({
    x: (i / (series.length - 1)) * (w - pad * 2) + pad,
    y: h - pad - ((Number(p.count || 0) - min) / span) * (h - pad * 2),
  }));
});

const sparkPath = computed(() => {
  const pts = points.value;
  if (!pts.length) return "";
  return pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
});

const areaPath = computed(() => {
  const pts = points.value;
  if (!pts.length) return "";
  const h = props.height;
  const last = pts[pts.length - 1];
  const first = pts[0];
  return `${sparkPath.value} L${last.x.toFixed(1)},${h} L${first.x.toFixed(1)},${h} Z`;
});
</script>

<style scoped>
.rsb {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  width: 100%;
  padding: 2px 2px 0;
  /* 与下方筛选行留白 */
  margin-bottom: 10px;
}

.rsb__stats {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  min-width: 0;
}

.rsb__item {
  display: inline-flex;
  align-items: baseline;
  gap: 6px;
  padding: 0 16px;
}

.rsb__item + .rsb__item {
  border-left: 1px solid var(--el-border-color-lighter);
}

.rsb__item:first-child {
  padding-left: 2px;
}

.rsb__item:last-child {
  padding-right: 2px;
}

.rsb__label {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  white-space: nowrap;
}

.rsb__value {
  font-size: 15px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.rsb__value.is-zero {
  color: var(--el-text-color-disabled);
  font-weight: 500;
}

.rsb__item--total .rsb__value {
  font-size: 13px;
  font-weight: 500;
  color: var(--el-text-color-regular);
}

.rsb__spark {
  flex-shrink: 0;
  overflow: visible;
  /* 让渐变里的 currentColor 解析到主题色 */
  color: var(--el-color-primary);
}

/* 首页大图：横向撑满剩余空间，高度由 height 属性决定 */
.rsb__spark--fill {
  flex: 1 1 auto;
  min-width: 0;
  width: 100%;
  max-width: none;
}

.rsb__spark-line {
  stroke: var(--el-color-primary);
  stroke-width: 1.75;
  stroke-linejoin: round;
  stroke-linecap: round;
}

.rsb__spark-dot {
  fill: var(--el-color-primary);
}
</style>
