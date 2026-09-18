<template>
  <div class="collect-page">
    <div class="collect-layout">
      <aside class="collect-menu">
        <div class="menu-header">热搜采集</div>
        <nav class="menu-list">
          <div class="menu-group">
            <div class="menu-item" @click="goToHistory">
              <span class="menu-item-text">运行记录</span>
            </div>
          </div>
          <div v-for="group in menuGroups" :key="group.label" class="menu-group">
            <div class="menu-group__label">{{ group.label }}</div>
            <div
              v-for="item in group.items"
              :key="item.key"
              class="menu-item"
              :class="{ 'is-active': activeKey === item.key }"
              @click="switchTab(item.key)"
            >
              <span class="menu-item-text">{{ item.label }}</span>
            </div>
          </div>
        </nav>
      </aside>

      <main class="collect-body">
        <KeepAlive :max="6">
          <HotsearchPlatformPanel
            v-if="activePlatform"
            :key="activeKey"
            :plugin-key="activePlatform.key"
            :title="activePlatform.label"
            :subtitle="`${activePlatform.group} · 客户端实时数据采集`"
          />
        </KeepAlive>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import HotsearchPlatformPanel from './HotsearchPlatformPanel.vue'
import { HOTSEARCH_PLATFORMS } from '@/api/external/hotsearch/config'

defineOptions({ name: 'ExternalHotsearchCollect' })

const route = useRoute()
const router = useRouter()

const activeKey = ref<string>('weibo')

const activePlatform = computed(() =>
  HOTSEARCH_PLATFORMS.find((p) => p.key === activeKey.value),
)


const menuGroups = [
  { label: '国内热搜', items: HOTSEARCH_PLATFORMS.filter((p) => p.group === '国内热搜') },
  { label: '国际趋势', items: HOTSEARCH_PLATFORMS.filter((p) => p.group === '国际趋势') },
  { label: '电商', items: HOTSEARCH_PLATFORMS.filter((p) => p.group === '电商') },
]

const switchTab = (key: string) => {
  if (activeKey.value === key) return
  activeKey.value = key
  router.replace({ query: { ...route.query, tab: key } })
}

const goToHistory = () => {
  router.push({
    path: '/external/node-execution',
    query: activePlatform.value ? { node: activePlatform.value.key } : {},
  })
}

watch(
  () => route.query.tab,
  (tab) => {
    if (tab && HOTSEARCH_PLATFORMS.some((p) => p.key === tab)) {
      activeKey.value = tab as string
    }
  },
  { immediate: true },
)
</script>

<style scoped>
.collect-page {
  width: 100%;
  height: 100%;
}

.collect-layout {
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

.menu-header {
  font-size: 11px;
  font-weight: 600;
  color: var(--el-text-color-secondary);
  padding: 0 8px 4px 8px;
}

.menu-group {
  display: flex;
  flex-direction: column;
  gap: 1px;
  margin-top: 8px;
}

.menu-group__label {
  font-size: 11px;
  color: var(--el-text-color-placeholder);
  padding: 0 8px 4px 8px;
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
  transition: color 0.15s ease;
  user-select: none;
}

.menu-item:hover {
  background: transparent;
  color: var(--el-text-color-primary);
}

.menu-item:focus,
.menu-item:focus-visible {
  outline: none;
}

.menu-item.is-active {
  background: transparent;
  color: var(--el-color-primary);
  font-weight: 500;
}

.menu-item-text {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.collect-body {
  flex: 1;
  min-width: 0;
  overflow-y: auto;
}

/* 窄滚动条 */
.collect-menu::-webkit-scrollbar,
.collect-body::-webkit-scrollbar {
  width: 4px;
}

.collect-menu::-webkit-scrollbar-track,
.collect-body::-webkit-scrollbar-track {
  background: transparent;
}

.collect-menu::-webkit-scrollbar-thumb,
.collect-body::-webkit-scrollbar-thumb {
  background: var(--el-border-color);
  border-radius: 2px;
}

.collect-menu::-webkit-scrollbar-thumb:hover,
.collect-body::-webkit-scrollbar-thumb:hover {
  background: var(--el-text-color-secondary);
}
</style>