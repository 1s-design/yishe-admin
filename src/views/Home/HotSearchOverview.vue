<template>
  <ContentWrap :plain="true">
    <div class="hs-ov">
      <header class="hs-ov__head">
        <div class="hs-ov__heading">
          <h2 class="hs-ov__title">热搜概览</h2>
          <p class="hs-ov__desc">按源定义动态渲染，平台、分组与展示字段均来自服务端元数据</p>
        </div>
        <div class="hs-ov__actions">
          <el-radio-group v-model="module" size="small" @change="load">
            <el-radio-button v-for="m in modules" :key="m.module" :value="m.module">
              {{ m.label }}
            </el-radio-button>
          </el-radio-group>
          <el-select v-model="sinceMinutes" size="small" class="hs-ov__window" @change="load">
            <el-option v-for="opt in WINDOW_OPTIONS" :key="opt.value" :label="opt.label" :value="opt.value" />
          </el-select>
          <el-button size="small" :icon="Refresh" :loading="loading" @click="load">刷新</el-button>
        </div>
      </header>

      <div class="hs-ov__stats">
        <span class="hs-ov__stat">
          <span class="hs-ov__stat-label">最新采集</span>
          <span class="hs-ov__stat-value">{{ latestLabel }}</span>
        </span>
        <span class="hs-ov__sep" />
        <span class="hs-ov__stat">
          <span class="hs-ov__stat-label">平台</span>
          <span class="hs-ov__stat-value">{{ overview?.stats.platformCount ?? 0 }}</span>
        </span>
        <span class="hs-ov__sep" />
        <span class="hs-ov__stat">
          <span class="hs-ov__stat-label">条目</span>
          <span class="hs-ov__stat-value">{{ overview?.stats.itemCount ?? 0 }}</span>
        </span>
        <span v-if="isStale" class="hs-ov__badge">数据滞后</span>
      </div>

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
        <template v-if="groups.length">
          <section v-for="group in groups" :key="group.key" class="hs-ov__group">
            <header class="hs-ov__group-head">
              <span class="hs-ov__group-title">{{ group.label }}</span>
              <span class="hs-ov__group-count">{{ group.platforms.length }} 个平台</span>
            </header>
            <div class="hs-ov__grid">
              <component
                :is="resolvePlatformRenderer(platform.display.renderer)"
                v-for="platform in group.platforms"
                :key="platform.platformKey"
                :platform="platform"
                @open="openDrawer"
              />
            </div>
          </section>
        </template>

        <div v-else-if="!loading" class="hs-ov__empty">
          <span class="hs-ov__empty-title">{{ error ? '概览加载失败' : '暂无概览数据' }}</span>
          <div class="hs-ov__empty-actions">
            <el-button size="small" type="primary" plain @click="router.push('/external/hotsearch')">去采集</el-button>
            <el-button size="small" plain @click="router.push('/home/hot-search')">采集历史</el-button>
          </div>
        </div>
      </div>

      <PlatformDrawer
        v-model="drawerVisible"
        :platform="activePlatform"
        :module="module"
        :since-minutes="sinceMinutes"
      />
    </div>
  </ContentWrap>
</template>

<script setup lang="ts" name="HotsearchOverview">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Refresh } from '@element-plus/icons-vue'
import ContentWrap from '@/components/ContentWrap/src/ContentWrap.vue'
import { resolvePlatformRenderer } from './components/hotsearch/renderers'
import PlatformDrawer from './components/hotsearch/PlatformDrawer.vue'
import {
  getHotsearchOverview,
  getModules,
  type HotsearchModuleInfo,
  type HotsearchOverviewPlatform,
  type HotsearchOverviewResult
} from '@/api/hotsearch'

defineOptions({ name: 'HotsearchOverview' })

const router = useRouter()

const WINDOW_OPTIONS = [
  { label: '1 小时', value: 60 },
  { label: '3 小时', value: 180 },
  { label: '12 小时', value: 720 },
  { label: '24 小时', value: 1440 }
]

const loading = ref(false)
const error = ref(false)
const overview = ref<HotsearchOverviewResult | null>(null)
const modules = ref<HotsearchModuleInfo[]>([])
const module = ref('hotsearch')
const sinceMinutes = ref(1440)
const drawerVisible = ref(false)
const activePlatform = ref<HotsearchOverviewPlatform | null>(null)

const unwrap = <T,>(res: any): T => ((res as any)?.data ?? res) as T

const groups = computed(() => overview.value?.groups ?? [])
const keywords = computed(() => overview.value?.keywords ?? [])
const isStale = computed(() => overview.value?.freshness.stale === true)

const latestLabel = computed(() => {
  const age = overview.value?.freshness.ageMinutes
  if (age === null || age === undefined) return '—'
  if (age < 1) return '刚刚'
  if (age < 60) return `${age} 分钟前`
  const hours = Math.floor(age / 60)
  if (hours < 24) return `${hours} 小时前`
  return `${Math.floor(hours / 24)} 天前`
})

const loadModules = async () => {
  try {
    const res = await getModules()
    const list = unwrap<HotsearchModuleInfo[]>(res) || []
    if (!list.length) return
    modules.value = list
    if (!list.some((item) => item.module === module.value)) {
      module.value = list[0].module
    }
  } catch (e) {
    console.error(e)
  }
}

const load = async () => {
  loading.value = true
  error.value = false
  try {
    const res = await getHotsearchOverview({
      module: module.value,
      sinceMinutes: sinceMinutes.value
    })
    overview.value = unwrap<HotsearchOverviewResult>(res)
  } catch (e) {
    error.value = true
    overview.value = null
    console.error(e)
  } finally {
    loading.value = false
  }
}

const openDrawer = (platform: HotsearchOverviewPlatform) => {
  activePlatform.value = platform
  drawerVisible.value = true
}

onMounted(async () => {
  await loadModules()
  await load()
})
</script>

<style scoped lang="scss">
.hs-ov {
  display: flex;
  flex-direction: column;
  gap: 20px;
  color: var(--el-text-color-primary);
}

.hs-ov__head {
  display: flex;
  gap: 16px;
  align-items: flex-end;
  justify-content: space-between;
  padding-bottom: 14px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.hs-ov__heading {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.hs-ov__title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  line-height: 1.3;
  letter-spacing: 0.02em;
}

.hs-ov__desc {
  margin: 0;
  font-size: 12.5px;
  line-height: 1.5;
  color: var(--el-text-color-secondary);
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
  gap: 12px;
  align-items: center;
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
  gap: 6px;
  align-items: center;
  height: 26px;
  padding: 0 10px;
  font-size: 12px;
  line-height: 1;
  color: var(--el-text-color-regular);
  cursor: default;
  background: var(--el-fill-color-light);
  border: 1px solid transparent;
  border-radius: 6px;
  transition: border-color 0.15s ease, color 0.15s ease;

  &:hover {
    color: var(--el-color-primary);
    border-color: color-mix(in srgb, var(--el-color-primary) 28%, transparent);
  }
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
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
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
