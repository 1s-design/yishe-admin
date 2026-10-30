<template>
  <div class="hs-ov">
    <header class="hs-ov__head">
      <div class="hs-ov__stats">
        <span class="hs-ov__stat">
          <span class="hs-ov__stat-label">最新采集</span>
          <span class="hs-ov__stat-value">{{ latestLabel }}</span>
        </span>
        <span class="hs-ov__sep" />
        <span class="hs-ov__stat">
          <span class="hs-ov__stat-label">平台</span>
          <span class="hs-ov__stat-value">{{ stats.platformCount }}</span>
        </span>
        <span class="hs-ov__sep" />
        <span class="hs-ov__stat">
          <span class="hs-ov__stat-label">条目</span>
          <span class="hs-ov__stat-value">{{ stats.itemCount }}</span>
        </span>
        <span v-if="isStale" class="hs-ov__badge">数据滞后</span>
      </div>
      <div class="hs-ov__actions">
        <el-select v-model="sinceMinutes" size="small" class="hs-ov__window" @change="load">
          <el-option v-for="opt in WINDOW_OPTIONS" :key="opt.value" :label="opt.label" :value="opt.value" />
        </el-select>
        <el-button size="small" :icon="Refresh" :loading="loading" @click="load">刷新</el-button>
      </div>
    </header>

    <section v-if="keywords.length" class="hs-ov__keywords">
      <div class="hs-ov__kw-head">
        <span class="hs-ov__kw-title">趋势词</span>
        <span class="hs-ov__kw-hint">跨平台上榜的共性词</span>
      </div>
      <div class="hs-ov__kw-list">
        <el-tooltip
          v-for="kw in keywords"
          :key="kw.word"
          placement="top"
          effect="light"
          :show-after="120"
          popper-class="hs-ov__kw-popper"
        >
          <template #content>
            <div class="hs-kw-tip">
              <div v-if="kw.platformNames?.length" class="hs-kw-tip__row">
                <span class="hs-kw-tip__label">平台</span>
                <span>{{ kw.platformNames.join('、') }}</span>
              </div>
              <div v-if="kw.sampleTitles?.length" class="hs-kw-tip__row">
                <span class="hs-kw-tip__label">示例</span>
                <span>{{ kw.sampleTitles[0] }}</span>
              </div>
            </div>
          </template>
          <span class="hs-ov__kw">
            <span class="hs-ov__kw-word">{{ kw.word }}</span>
            <span v-if="kw.hitCount > 1" class="hs-ov__kw-count">{{ kw.hitCount }}</span>
          </span>
        </el-tooltip>
      </div>
    </section>

    <div v-loading="loading" class="hs-ov__body">
      <template v-if="hasData">
        <section v-for="sec in renderedSections" :key="sec.module" class="hs-ov__module">
          <header class="hs-ov__module-head">
            <span class="hs-ov__module-title">{{ sec.label }}</span>
            <span class="hs-ov__module-meta">
              {{ sec.stats.platformCount }} 个平台 · {{ sec.stats.itemCount }} 条
            </span>
          </header>
          <section v-for="group in sec.groups" :key="group.key" class="hs-ov__group">
            <header
              v-if="sec.groups.length > 1 || group.label !== sec.label"
              class="hs-ov__group-head"
            >
              <span class="hs-ov__group-title">{{ group.label }}</span>
              <span class="hs-ov__group-count">{{ group.platforms.length }} 个平台</span>
            </header>
            <div class="hs-ov__grid">
              <component
                :is="resolvePlatformRenderer(platform.display.renderer)"
                v-for="platform in group.platforms"
                :key="platform.platformKey"
                :platform="platform"
                @open="openDrawer(platform, sec.module)"
              />
            </div>
          </section>
        </section>
      </template>

      <div v-else-if="!loading" class="hs-ov__empty">
        <span class="hs-ov__empty-title">{{ error ? '概览加载失败' : '暂无概览数据' }}</span>
        <div class="hs-ov__empty-actions">
          <el-button size="small" type="primary" plain @click="router.push('/external/hotsearch')">去采集</el-button>
        </div>
      </div>
    </div>

    <PlatformDrawer
      v-model="drawerVisible"
      :platform="activePlatform"
      :module="activeModule"
      :since-minutes="sinceMinutes"
    />
  </div>
</template>

<script setup lang="ts" name="HotsearchOverview">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Refresh } from '@element-plus/icons-vue'
import { resolvePlatformRenderer } from './components/hotsearch/renderers'
import PlatformDrawer from './components/hotsearch/PlatformDrawer.vue'
import {
  getHotsearchOverview,
  type HotsearchKeyword,
  type HotsearchOverviewPlatform,
  type HotsearchOverviewResult
} from '@/api/hotsearch'

defineOptions({ name: 'HotsearchOverview' })

const router = useRouter()

const OVERVIEW_MODULES = [
  { module: 'hotsearch', label: '热搜' },
  { module: 'news', label: '资讯' }
] as const

const WINDOW_OPTIONS = [
  { label: '1 小时', value: 60 },
  { label: '3 小时', value: 180 },
  { label: '12 小时', value: 720 },
  { label: '24 小时', value: 1440 }
]

const loading = ref(false)
const error = ref(false)
const overviews = ref<Record<string, HotsearchOverviewResult | null>>({ hotsearch: null, news: null })
const sinceMinutes = ref(1440)
const drawerVisible = ref(false)
const activePlatform = ref<HotsearchOverviewPlatform | null>(null)
const activeModule = ref('hotsearch')

const unwrap = <T,>(res: any): T => ((res as any)?.data ?? res) as T

const sections = computed(() =>
  OVERVIEW_MODULES.map((item) => {
    const overview = overviews.value[item.module]
    return {
      module: item.module,
      label: item.label,
      groups: overview?.groups ?? [],
      stats: overview?.stats ?? { platformCount: 0, itemCount: 0 }
    }
  })
)
const renderedSections = computed(() => sections.value.filter((sec) => sec.groups.length > 0))
const hasData = computed(() => renderedSections.value.length > 0)
const stats = computed(() => ({
  platformCount: sections.value.reduce((sum, sec) => sum + sec.stats.platformCount, 0),
  itemCount: sections.value.reduce((sum, sec) => sum + sec.stats.itemCount, 0)
}))

const keywords = computed<HotsearchKeyword[]>(() => {
  const merged = new Map<string, HotsearchKeyword>()
  for (const overview of Object.values(overviews.value)) {
    for (const kw of overview?.keywords ?? []) {
      const current = merged.get(kw.word)
      if (!current) {
        merged.set(kw.word, {
          ...kw,
          platforms: [...(kw.platforms ?? [])],
          platformNames: [...(kw.platformNames ?? [])],
          sampleTitles: [...(kw.sampleTitles ?? [])]
        })
        continue
      }
      current.hitCount += kw.hitCount
      current.score = Math.max(current.score, kw.score)
      current.bestRank = Math.min(current.bestRank || Infinity, kw.bestRank || Infinity) || 0
      for (const key of kw.platforms ?? []) {
        if (!current.platforms.includes(key)) current.platforms.push(key)
      }
      for (const name of kw.platformNames ?? []) {
        if (!current.platformNames.includes(name)) current.platformNames.push(name)
      }
      for (const title of kw.sampleTitles ?? []) {
        if (current.sampleTitles.length >= 2) break
        if (!current.sampleTitles.includes(title)) current.sampleTitles.push(title)
      }
    }
  }
  return [...merged.values()].sort((a, b) => b.score - a.score).slice(0, 24)
})

const latestAgeMinutes = computed(() => {
  const ages = Object.values(overviews.value)
    .map((overview) => overview?.freshness?.ageMinutes)
    .filter((age): age is number => typeof age === 'number')
  return ages.length ? Math.min(...ages) : null
})
const isStale = computed(() =>
  Object.values(overviews.value).some((overview) => overview?.freshness?.stale === true)
)

const latestLabel = computed(() => {
  const age = latestAgeMinutes.value
  if (age === null || age === undefined) return '—'
  if (age < 1) return '刚刚'
  if (age < 60) return `${age} 分钟前`
  const hours = Math.floor(age / 60)
  if (hours < 24) return `${hours} 小时前`
  return `${Math.floor(hours / 24)} 天前`
})

const load = async () => {
  loading.value = true
  error.value = false
  let failed = 0
  const results = await Promise.all(
    OVERVIEW_MODULES.map(async (item) => {
      try {
        const res = await getHotsearchOverview({
          module: item.module,
          sinceMinutes: sinceMinutes.value
        })
        return [item.module, unwrap<HotsearchOverviewResult>(res)] as const
      } catch (e) {
        failed++
        console.error(e)
        return [item.module, null] as const
      }
    })
  )
  overviews.value = Object.fromEntries(results)
  error.value = failed === OVERVIEW_MODULES.length
  loading.value = false
}

const openDrawer = (platform: HotsearchOverviewPlatform, module: string) => {
  activePlatform.value = platform
  activeModule.value = module
  drawerVisible.value = true
}

onMounted(load)
</script>

<style scoped lang="scss">
.hs-ov {
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 18px 20px 24px;
  color: var(--el-text-color-primary);
}

.hs-ov__head {
  display: flex;
  gap: 16px;
  align-items: center;
  justify-content: space-between;
}

.hs-ov__actions {
  display: flex;
  flex-shrink: 0;
  gap: 10px;
  align-items: center;
}

.hs-ov__window {
  width: 108px;
}

.hs-ov__stats {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  min-width: 0;
  font-size: 12px;
  white-space: nowrap;
}

.hs-ov__stat {
  display: inline-flex;
  gap: 6px;
  align-items: baseline;
}

.hs-ov__stat-label {
  color: var(--el-text-color-secondary);
}

.hs-ov__stat-value {
  font-weight: 500;
  color: var(--el-text-color-primary);
  font-variant-numeric: tabular-nums;
}

.hs-ov__sep {
  width: 1px;
  height: 11px;
  background: var(--el-border-color);
}

.hs-ov__badge {
  display: inline-flex;
  align-items: center;
  height: 18px;
  padding: 0 6px;
  font-size: 11px;
  font-weight: 500;
  line-height: 1;
  color: var(--el-color-warning);
  background: color-mix(in srgb, var(--el-color-warning) 10%, transparent);
  border-radius: 4px;
}

.hs-ov__keywords {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px 16px;
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
}

.hs-ov__kw-head {
  display: flex;
  gap: 10px;
  align-items: baseline;
}

.hs-ov__kw-title {
  font-size: 13px;
  font-weight: 600;
}

.hs-ov__kw-hint {
  font-size: 11.5px;
  color: var(--el-text-color-placeholder);
}

.hs-ov__kw-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.hs-ov__kw {
  display: inline-flex;
  height: 26px;
  max-width: 100%;
  padding: 0 10px;
  overflow: hidden;
  font-size: 12px;
  line-height: 1;
  color: var(--el-text-color-regular);
  cursor: default;
  background: var(--el-fill-color-light);
  border: 1px solid transparent;
  border-radius: 6px;
  transition: border-color 0.15s ease, color 0.15s ease;
  gap: 6px;
  align-items: center;

  &:hover {
    color: var(--el-color-primary);
    border-color: color-mix(in srgb, var(--el-color-primary) 28%, transparent);
  }
}

.hs-ov__kw-word {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.hs-ov__kw-count {
  font-size: 10.5px;
  color: var(--el-text-color-placeholder);
  font-variant-numeric: tabular-nums;
}

.hs-ov__body {
  display: flex;
  flex-direction: column;
  gap: 22px;
  min-height: 220px;
}

.hs-ov__group {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.hs-ov__module {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.hs-ov__module + .hs-ov__module {
  padding-top: 20px;
  border-top: 1px solid var(--el-border-color-lighter);
}

.hs-ov__module-head {
  display: flex;
  gap: 10px;
  align-items: baseline;
}

.hs-ov__module-title {
  font-size: 15px;
  font-weight: 700;
  letter-spacing: 0.01em;
}

.hs-ov__module-meta {
  font-size: 11.5px;
  color: var(--el-text-color-placeholder);
  font-variant-numeric: tabular-nums;
}

.hs-ov__group-head {
  display: flex;
  gap: 10px;
  align-items: baseline;
}

.hs-ov__group-title {
  font-size: 13.5px;
  font-weight: 600;
  letter-spacing: 0.01em;
}

.hs-ov__group-count {
  font-size: 11.5px;
  color: var(--el-text-color-placeholder);
  font-variant-numeric: tabular-nums;
}

.hs-ov__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 280px), 1fr));
  gap: 12px;
}

.hs-ov__empty {
  display: flex;
  flex-direction: column;
  gap: 14px;
  align-items: center;
  justify-content: center;
  min-height: 220px;
  border: 1px dashed var(--el-border-color);
  border-radius: 8px;
}

.hs-ov__empty-title {
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.hs-ov__empty-actions {
  display: flex;
  gap: 10px;
}

:global(.hs-ov__kw-popper) {
  max-width: 300px;
  padding: 8px 11px;
  font-size: 12px;
  line-height: 1.5;
}

.hs-kw-tip {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 12px;
}

.hs-kw-tip__row {
  display: flex;
  gap: 8px;
}

.hs-kw-tip__label {
  flex-shrink: 0;
  opacity: 0.65;
}

@media (width <= 900px) {
  .hs-ov {
    padding: 16px 16px 20px;
  }

  .hs-ov__head {
    flex-direction: column;
    align-items: flex-start;
  }

  .hs-ov__actions {
    flex-wrap: wrap;
    width: 100%;
  }
}

@media (width <= 640px) {
  .hs-ov {
    gap: 16px;
    padding: 12px 12px 16px;
  }

  .hs-ov__stats {
    flex-wrap: wrap;
    white-space: normal;
  }

  .hs-ov__grid {
    grid-template-columns: 1fr;
  }
}
</style>
