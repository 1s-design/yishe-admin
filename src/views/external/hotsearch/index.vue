<template>
  <div class="hotsearch-collect-page">
    <div class="hotsearch-collect-layout">
      <!-- 左侧极简菜单栏（接口驱动：新闻源清单来自服务端定义） -->
      <aside class="collect-menu">
        <div class="menu-header">热搜采集</div>
        <nav class="menu-list">
          <div class="menu-group-title">通用采集</div>
          <div
            v-for="item in engineItems"
            :key="item.key"
            class="menu-item"
            :class="{ 'is-active': activeTab === item.key }"
            @click="switchTab(item.key)"
          >
            <span class="menu-item-text">{{ item.name }}</span>
            <span
              v-if="item.available === false"
              class="menu-disabled-tag"
              :title="item.reason || '当前不可用'"
            >不可用</span>
          </div>
        </nav>
      </aside>

      <!-- 右侧主体内容 -->
      <main class="collect-body">
        <keep-alive>
          <component :is="activeComponent" :key="activeTab" v-bind="activeProps" />
        </keep-alive>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, markRaw, nextTick, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useTagsView } from '@/hooks/web/useTagsView'
import CollectEnginePanel from '../components/CollectEnginePanel.vue'
import { listCollectSources, type CollectSourceMeta } from '@/api/external/collect'

defineOptions({ name: 'ExternalHotsearchCollect' })

const route = useRoute()
const router = useRouter()
const { setTitle } = useTagsView()

type TabKey = string

interface MenuItem {
  key: TabKey
  name: string
  component: any
  props?: Record<string, any>
  available?: boolean
  reason?: string
  group?: 'special'
}

const engineItems = ref<MenuItem[]>([])

async function loadEngineSources() {
  try {
    const res: any = await listCollectSources('hotsearch')
    const list = res?.data ?? res ?? []
    const metas: CollectSourceMeta[] = Array.isArray(list) ? list : []
    engineItems.value = metas.map((m) => ({
      key: `src-${m.id}`,
      name: m.name,
      component: markRaw(CollectEnginePanel),
      props: { sourceId: m.id },
      available: m.available !== false,
      reason: m.unavailableReason || '',
    }))
  } catch (e) {
    console.error('[hotsearch] 加载采集源清单失败:', e)
    engineItems.value = []
  }
}

const menuItems = computed<MenuItem[]>(() => engineItems.value)
const activeTab = ref<TabKey>('')

const activeComponent = computed(() => {
  const target = menuItems.value.find((m) => m.key === activeTab.value)
  return target ? target.component : null
})
const activeProps = computed(() => {
  const target = menuItems.value.find((m) => m.key === activeTab.value)
  return target?.props || {}
})

const getTabName = (key: TabKey): string => {
  const item = menuItems.value.find((m) => m.key === key)
  return item ? item.name : '热搜采集'
}
const updateTabTitle = (key: TabKey) => {
  nextTick(() => setTitle(getTabName(key), route.path))
}
const switchTab = (key: TabKey) => {
  if (activeTab.value === key) return
  activeTab.value = key
  router.replace({ query: { ...route.query, tab: key } })
  updateTabTitle(key)
}

function applyTabFromRoute() {
  const raw = String(route.query.tab || '')
  if (!raw) {
    if (!activeTab.value && menuItems.value.length) {
      activeTab.value = menuItems.value[0].key
      updateTabTitle(activeTab.value)
    }
    return
  }
  let key: TabKey = raw
  if (!menuItems.value.some((m) => m.key === key)) {
    const alt = menuItems.value.some((m) => m.key === `src-${raw}`) ? `src-${raw}` : ''
    if (alt) key = alt
  }
  if (menuItems.value.some((m) => m.key === key)) {
    if (activeTab.value !== key) activeTab.value = key
    updateTabTitle(key)
  }
}

watch(() => route.query.tab, applyTabFromRoute)

onMounted(async () => {
  await loadEngineSources()
  applyTabFromRoute()
})
</script>

<style scoped>
.hotsearch-collect-page {
  width: 100%;
  height: 100%;
}
.hotsearch-collect-layout {
  display: flex;
  gap: 12px;
  height: calc(100vh - var(--top-tool-height) - var(--tags-view-height));
}
.collect-menu {
  width: 180px;
  flex-shrink: 0;
  padding: 8px;
  overflow-y: auto;
}
.collect-body {
  flex: 1;
  min-width: 0;
  padding: 16px;
  overflow-y: auto;
}
.menu-header {
  font-size: 11px;
  font-weight: 600;
  color: var(--el-text-color-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: 0 8px 8px 8px;
  margin-bottom: 4px;
  border-bottom: 1px solid var(--el-border-color-extra-light);
}
.menu-list {
  display: flex;
  flex-direction: column;
  gap: 1px;
  margin-top: 4px;
}
.menu-group-title {
  font-size: 11px;
  font-weight: 600;
  color: var(--el-text-color-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: 10px 8px 4px 8px;
}
.menu-item {
  display: flex;
  align-items: center;
  height: 32px;
  padding: 0 8px;
  border-radius: 4px;
  font-size: 12px;
  color: var(--el-text-color-regular);
  cursor: pointer;
  transition: background-color 0.15s ease, color 0.15s ease;
  user-select: none;
}
.menu-item:hover {
  color: var(--el-text-color-primary);
}
.menu-item.is-active {
  background: var(--el-fill-color-light);
  color: var(--el-color-primary);
  font-weight: 600;
}
.menu-disabled-tag {
  flex-shrink: 0;
  margin-left: 4px;
  font-size: 10px;
  line-height: 1;
  padding: 2px 4px;
  border-radius: 3px;
  background: var(--el-color-danger-light-9, #fef0f0);
  color: var(--el-color-danger, #f56c6c);
  font-weight: 600;
}

.menu-item-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
