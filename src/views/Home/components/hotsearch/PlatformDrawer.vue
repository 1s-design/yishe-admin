<template>
  <el-drawer
    v-model="visible"
    :with-header="false"
    :size="drawerSize"
    class="hs-drawer"
    @open="load"
  >
    <div class="hs-drawer__inner" :class="{ 'has-accent': !!accent }" :style="accentStyle(display)">
      <header class="hs-drawer__head">
        <div class="hs-drawer__heading">
          <h3 class="hs-drawer__title">
            <img v-if="iconSrc" class="hs-drawer__icon" :src="iconSrc" alt="" />
            <span class="hs-drawer__title-text">{{ platform?.platformName || '—' }}</span>
          </h3>
          <div class="hs-drawer__meta">
            <span v-if="platform?.group">{{ platform.group }}</span>
            <span v-if="platform?.ageMinutes !== null && platform?.ageMinutes !== undefined" class="hs-drawer__sep" />
            <span v-if="platform?.ageMinutes !== null && platform?.ageMinutes !== undefined">{{ ageLabel }}</span>
            <span v-if="itemCount" class="hs-drawer__sep" />
            <span v-if="itemCount">{{ itemCount }} 条</span>
          </div>
        </div>
        <el-button link :icon="Close" class="hs-drawer__close" @click="visible = false" />
      </header>

      <div v-loading="loading" class="hs-drawer__body">
        <ol v-if="rows.length" class="hs-drawer__list">
          <li v-for="(row, index) in rows" :key="index" class="hs-drawer__row">
            <span class="hs-drawer__rank" :class="{ 'is-top': index < 3 }">{{ row.rank }}</span>
            <div class="hs-drawer__main">
              <a
                v-if="row.link"
                class="hs-drawer__name"
                :href="row.link"
                target="_blank"
                rel="noopener noreferrer"
              >{{ row.title }}</a>
              <span v-else class="hs-drawer__name">{{ row.title }}</span>
              <span v-if="row.subtitle" class="hs-drawer__sub">{{ row.subtitle }}</span>
            </div>
            <span v-if="row.trend" class="hs-drawer__badge" :class="trendClass(row.trend)">{{ row.trend }}</span>
            <span v-if="row.heat" class="hs-drawer__heat">{{ row.heat }}</span>
          </li>
        </ol>
        <el-empty v-else-if="!loading" :image-size="72" description="该平台在时间窗内暂无数据" />
      </div>
    </div>
  </el-drawer>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { Close } from '@element-plus/icons-vue'
import {
  getHotsearchOverviewPlatform,
  type HotsearchOverviewPlatform,
  type HotsearchOverviewDisplay,
  type HotsearchOverviewPlatformResult
} from '@/api/hotsearch'
import { accentStyle, resolvePlatformIcon } from './icons'

defineOptions({ name: 'HotsearchPlatformDrawer' })

const props = defineProps<{
  modelValue: boolean
  platform: HotsearchOverviewPlatform | null
  module: string
  sinceMinutes: number
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
}>()

const visible = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit('update:modelValue', value)
})

const loading = ref(false)
const detail = ref<HotsearchOverviewPlatformResult | null>(null)
const drawerSize = 'min(440px, 92vw)'

const unwrap = <T,>(res: any): T => ((res as any)?.data ?? res) as T

const load = async () => {
  const current = props.platform
  if (!current) return
  loading.value = true
  detail.value = null
  try {
    const res = await getHotsearchOverviewPlatform({
      platformKey: current.platformKey,
      module: props.module,
      sinceMinutes: props.sinceMinutes,
      limit: 200
    })
    detail.value = unwrap<HotsearchOverviewPlatformResult>(res)
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

const display = computed<HotsearchOverviewDisplay | undefined>(
  () => (detail.value ?? props.platform)?.display
)
const fields = computed(() => display.value?.fields)
const iconSrc = computed(() => resolvePlatformIcon(display.value?.icon))
const accent = computed(() => display.value?.accent)

const rows = computed(() => {
  const map = fields.value
  if (!map) return []
  const list = detail.value?.items ?? props.platform?.top ?? []
  return list.map((item, index) => ({
    rank: item[map.rank] ?? index + 1,
    title: String(item[map.title] ?? '').trim(),
    heat: String(item[map.heat] ?? '').trim(),
    trend: String(item[map.trend] ?? '').trim(),
    link: String(item[map.link] ?? '').trim(),
    subtitle: String(item[map.subtitle] ?? '').trim()
  })).filter((row) => row.title)
})

const itemCount = computed(() => detail.value?.itemCount ?? props.platform?.itemCount ?? 0)

const ageLabel = computed(() => {
  const minutes = detail.value?.ageMinutes ?? props.platform?.ageMinutes
  if (minutes === null || minutes === undefined) return ''
  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes} 分钟前`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} 小时前`
  return `${Math.floor(hours / 24)} 天前`
})

const trendClass = (trend: string) => {
  if (/热|沸|爆/.test(trend)) return 'is-hot'
  if (trend.includes('新')) return 'is-new'
  return 'is-info'
}
</script>

<style scoped lang="scss">
.hs-drawer__inner {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.hs-drawer__head {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  justify-content: space-between;
  padding: 18px 20px 14px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.has-accent .hs-drawer__head {
  border-bottom-color: color-mix(in srgb, var(--hs-accent) 26%, var(--el-border-color-lighter));
}

.hs-drawer__heading {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.hs-drawer__title {
  display: flex;
  gap: 6px;
  align-items: center;
  min-width: 0;
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  line-height: 1.35;
  color: var(--el-text-color-primary);
}

.hs-drawer__icon {
  flex-shrink: 0;
  width: 16px;
  height: 16px;
  object-fit: contain;
  border-radius: 3px;
}

.hs-drawer__title-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.hs-drawer__meta {
  display: inline-flex;
  gap: 8px;
  align-items: center;
  font-size: 11.5px;
  color: var(--el-text-color-secondary);
  font-variant-numeric: tabular-nums;
}

.hs-drawer__sep {
  width: 1px;
  height: 10px;
  background: var(--el-border-color);
}

.hs-drawer__close {
  flex-shrink: 0;
  margin-top: 2px;
  color: var(--el-text-color-placeholder);

  &:hover {
    color: var(--el-text-color-primary);
  }
}

.hs-drawer__body {
  flex: 1;
  min-height: 0;
  padding: 6px 12px 20px;
  overflow-y: auto;
}

.hs-drawer__list {
  display: flex;
  flex-direction: column;
  padding: 0;
  margin: 0;
  list-style: none;
}

.hs-drawer__row {
  display: flex;
  gap: 10px;
  align-items: baseline;
  padding: 10px 8px;
  border-bottom: 1px solid var(--el-border-color-extra-light);

  &:last-child {
    border-bottom: none;
  }
}

.hs-drawer__rank {
  flex-shrink: 0;
  width: 18px;
  font-size: 12px;
  line-height: 1.5;
  color: var(--el-text-color-placeholder);
  text-align: right;
  font-variant-numeric: tabular-nums;

  &.is-top {
    font-weight: 700;
    color: var(--el-text-color-primary);
  }
}

.hs-drawer__main {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.hs-drawer__name {
  font-size: 13px;
  line-height: 1.5;
  color: var(--el-text-color-regular);
  text-decoration: none;
  word-break: break-all;
}

a.hs-drawer__name:hover {
  color: var(--hs-accent, var(--el-color-primary));
}

.hs-drawer__sub {
  overflow: hidden;
  font-size: 11.5px;
  line-height: 1.45;
  color: var(--el-text-color-placeholder);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.hs-drawer__heat {
  flex-shrink: 0;
  font-size: 11.5px;
  line-height: 1.5;
  color: var(--el-text-color-placeholder);
  font-variant-numeric: tabular-nums;
}

.hs-drawer__badge {
  flex-shrink: 0;
  height: 15px;
  padding: 0 4px;
  font-size: 10px;
  line-height: 15px;
  border-radius: 3px;

  &.is-hot {
    color: var(--el-color-danger);
    background: color-mix(in srgb, var(--el-color-danger) 10%, transparent);
  }

  &.is-new {
    color: var(--el-color-primary);
    background: color-mix(in srgb, var(--el-color-primary) 10%, transparent);
  }

  &.is-info {
    color: var(--el-color-info);
    background: color-mix(in srgb, var(--el-color-info) 10%, transparent);
  }
}
</style>
