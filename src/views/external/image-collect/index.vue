<template>
  <div class="image-collect-page">
    <!-- 主体左右分栏 -->
    <div class="image-collect-layout">
      <!-- 左侧极简菜单栏 -->
      <aside class="collect-menu">
        <div class="menu-header">图片采集</div>
        <nav class="menu-list">
          <div
            v-for="item in menuItems"
            :key="item.key"
            class="menu-item"
            :class="{ 'is-active': activeTab === item.key }"
            @click="switchTab(item.key)"
          >
            <span class="menu-item-text">{{ item.name }}</span>
          </div>
        </nav>
      </aside>

      <!-- 右侧主体内容 -->
      <main class="collect-body">
        <keep-alive>
          <component :is="activeComponent" :key="activeTab" />
        </keep-alive>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, markRaw, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useTagsView } from '@/hooks/web/useTagsView'
import GoogleArtView from '../google-art/index.vue'
import PinterestView from '../pinterest/index.vue'
import WikimediaView from '../wikimedia/index.vue'
import PexelsView from '../pexels/index.vue'
import PixabayView from '../pixabay/index.vue'
import RawpixelView from '../rawpixel/index.vue'
import StockSnapView from '../stocksnap/index.vue'
import OpenverseView from '../openverse/index.vue'
import KaboompicsView from '../kaboompics/index.vue'
import OpenclipartView from '../openclipart/index.vue'
import UndrawView from '../undraw/index.vue'
import IconifyView from '../iconify/index.vue'
import NounProjectView from '../nounproject/index.vue'
import VecteezyView from '../vecteezy/index.vue'
import OpenMojiView from '../openmoji/index.vue'
import GoogleIconsView from '../googleicons/index.vue'
import EmojipediaView from '../emojipedia/index.vue'
import SvgRepoView from '../svgrepo/index.vue'
import BaiduView from '../baidu/index.vue'
import BingView from '../bing/index.vue'
import DuckDuckGoView from '../duckduckgo/index.vue'
import SogouView from '../sogou/index.vue'
import SoView from '../so/index.vue'
import WallhavenView from '../wallhaven/index.vue'
import UnsplashView from '../unsplash/index.vue'
import FlickrView from '../flickr/index.vue'
import GoogleImagesView from '../googleimages/index.vue'
import YandexView from '../yandex/index.vue'

defineOptions({
  name: 'ExternalImageCollect',
})

const route = useRoute()
const router = useRouter()
const { setTitle } = useTagsView()

type TabKey =
  | 'google-art'
  | 'pinterest'
  | 'wikimedia'
  | 'pexels'
  | 'pixabay'
  | 'rawpixel'
  | 'stocksnap'
  | 'openverse'
  | 'kaboompics'
  | 'openclipart'
  | 'undraw'
  | 'iconify'
  | 'nounproject'
  | 'vecteezy'
  | 'openmoji'
  | 'googleicons'
  | 'emojipedia'
  | 'svgrepo'
  | 'baidu'
  | 'bing'
  | 'duckduckgo'
  | 'sogou'
  | 'so'
  | 'wallhaven'
  | 'unsplash'
  | 'flickr'
  | 'googleimages'
  | 'yandex'

const activeTab = ref<TabKey>('google-art')

const menuItems = [
  {
    key: 'baidu' as TabKey,
    name: '百度图片搜索',
    component: markRaw(BaiduView),
  },
  {
    key: 'bing' as TabKey,
    name: '必应图片搜索 (Bing)',
    component: markRaw(BingView),
  },
  {
    key: 'duckduckgo' as TabKey,
    name: 'DuckDuckGo 图搜',
    component: markRaw(DuckDuckGoView),
  },
  {
    key: 'sogou' as TabKey,
    name: '搜狗图片搜索',
    component: markRaw(SogouView),
  },
  {
    key: 'so' as TabKey,
    name: '360 图片搜索',
    component: markRaw(SoView),
  },
  {
    key: 'wallhaven' as TabKey,
    name: 'Wallhaven 4K壁纸',
    component: markRaw(WallhavenView),
  },
  {
    key: 'unsplash' as TabKey,
    name: 'Unsplash 顶级摄影',
    component: markRaw(UnsplashView),
  },
  {
    key: 'flickr' as TabKey,
    name: 'Flickr 摄影社区',
    component: markRaw(FlickrView),
  },
  {
    key: 'googleimages' as TabKey,
    name: '谷歌图片搜索',
    component: markRaw(GoogleImagesView),
  },
  {
    key: 'yandex' as TabKey,
    name: 'Yandex 艺术壁纸',
    component: markRaw(YandexView),
  },
  {
    key: 'google-art' as TabKey,
    name: 'Google Arts & Culture',
    component: markRaw(GoogleArtView),
  },
  {
    key: 'pinterest' as TabKey,
    name: 'Pinterest',
    component: markRaw(PinterestView),
  },
  {
    key: 'wikimedia' as TabKey,
    name: 'Wikimedia Commons',
    component: markRaw(WikimediaView),
  },
  {
    key: 'pexels' as TabKey,
    name: 'Pexels 高清摄影',
    component: markRaw(PexelsView),
  },
  {
    key: 'pixabay' as TabKey,
    name: 'Pixabay 免费图库',
    component: markRaw(PixabayView),
  },
  {
    key: 'rawpixel' as TabKey,
    name: 'Rawpixel 艺术图库',
    component: markRaw(RawpixelView),
  },
  {
    key: 'stocksnap' as TabKey,
    name: 'StockSnap 免版权图库',
    component: markRaw(StockSnapView),
  },
  {
    key: 'openverse' as TabKey,
    name: 'Openverse 开放图库',
    component: markRaw(OpenverseView),
  },
  {
    key: 'kaboompics' as TabKey,
    name: 'Kaboompics 免费高清图库',
    component: markRaw(KaboompicsView),
  },
  {
    key: 'openclipart' as TabKey,
    name: 'Openclipart 免费矢量插画',
    component: markRaw(OpenclipartView),
  },
  {
    key: 'undraw' as TabKey,
    name: 'undraw 开源插画',
    component: markRaw(UndrawView),
  },
  {
    key: 'iconify' as TabKey,
    name: 'Iconify 开源图标',
    component: markRaw(IconifyView),
  },
  {
    key: 'nounproject' as TabKey,
    name: 'Noun Project 图标/图片',
    component: markRaw(NounProjectView),
  },
  {
    key: 'vecteezy' as TabKey,
    name: 'Vecteezy 免版税素材',
    component: markRaw(VecteezyView),
  },
  {
    key: 'openmoji' as TabKey,
    name: 'OpenMoji 开源 Emoji',
    component: markRaw(OpenMojiView),
  },
  {
    key: 'googleicons' as TabKey,
    name: 'Google Material Icons',
    component: markRaw(GoogleIconsView),
  },
  {
    key: 'emojipedia' as TabKey,
    name: 'Emojipedia Emoji/Sticker',
    component: markRaw(EmojipediaView),
  },
  {
    key: 'svgrepo' as TabKey,
    name: 'SVGRepo 50万+开源矢量',
    component: markRaw(SvgRepoView),
  },
]

const activeComponent = computed(() => {
  const target = menuItems.find((m) => m.key === activeTab.value)
  return target ? target.component : GoogleArtView
})

// 根据当前 tab 获取对应的菜单名称
const getTabName = (key: TabKey): string => {
  const item = menuItems.find((m) => m.key === key)
  return item ? item.name : '图片采集'
}

// 更新 TagsView 的 Tab 标题（使用 nextTick 确保 visitedViews 已添加）
const updateTabTitle = (key: TabKey) => {
  nextTick(() => {
    setTitle(getTabName(key), route.path)
  })
}

const switchTab = (key: TabKey) => {
  if (activeTab.value === key) return
  activeTab.value = key
  router.replace({
    query: {
      ...route.query,
      tab: key,
    },
  })
  // 动态更新 TagsView 的 Tab 标题
  updateTabTitle(key)
}

watch(
  () => route.query.tab,
  (newTab) => {
    if (newTab && menuItems.some((m) => m.key === newTab)) {
      if (activeTab.value !== newTab) {
        activeTab.value = newTab as TabKey
      }
      // 动态更新 TagsView 的 Tab 标题
      updateTabTitle(newTab as TabKey)
    }
  },
  { immediate: true }
)
</script>

<style scoped>
.image-collect-page {
  width: 100%;
  height: 100%;
}

.image-collect-layout {
  display: flex;
  gap: 12px;
  height: calc(100vh - var(--top-tool-height) - var(--tags-view-height));
}

/* 左侧极简菜单 */
.collect-menu {
  width: 180px;
  flex-shrink: 0;
  padding: 8px;
  overflow-y: auto;
}

/* 右侧内容容器 */
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

:global(.dark) .menu-item.is-active {
  background: var(--el-color-primary-light-8);
}
</style>
