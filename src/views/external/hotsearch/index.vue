<template>
  <CollectLayout
    title="热搜采集"
    :groups="menuGroups"
    :active-key="activeKey"
    show-history
    @select="switchTab"
    @history="goToHistory"
  >
    <KeepAlive :max="6">
      <HotsearchPlatformPanel
        v-if="activePlatform"
        :key="activeKey"
        :plugin-key="activePlatform.key"
        :title="activePlatform.label"
        :subtitle="`${activePlatform.group} · 客户端实时数据采集`"
      />
    </KeepAlive>
  </CollectLayout>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import CollectLayout from '../components/CollectLayout.vue'
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

