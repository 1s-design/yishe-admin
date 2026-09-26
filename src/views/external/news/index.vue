<template>
  <CollectLayout
    title="新闻资讯采集"
    :groups="menuGroups"
    :active-key="activeKey"
    @select="switchTab"
  >
    <KeepAlive :max="6">
      <ServicePanel
        v-if="activeSource"
        :key="activeSource.key"
        :plugin-key="activeSource.key"
        :title="activeSource.label"
        :subtitle="activeSource.desc"
        :fields="activeSource.fields"
      />
    </KeepAlive>
  </CollectLayout>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import CollectLayout from '../components/CollectLayout.vue'
import ServicePanel from '../components/ServicePanel.vue'
import { NEWS_SOURCES } from '@/api/external/news/config'

defineOptions({ name: 'ExternalNewsCollect' })

const route = useRoute()
const router = useRouter()

const activeKey = ref<string>('hackernews')

const activeSource = computed(() =>
  NEWS_SOURCES.find((s) => s.key === activeKey.value),
)

const menuGroups = [
  {
    label: '国外新闻',
    items: NEWS_SOURCES.filter((s) => s.category === '国外新闻'),
  },
  {
    label: '国内新闻',
    items: NEWS_SOURCES.filter((s) => s.category === '国内新闻'),
  },
  {
    label: '娱乐影视',
    items: NEWS_SOURCES.filter((s) => s.category === '娱乐影视'),
  },
  {
    label: '体育',
    items: NEWS_SOURCES.filter((s) => s.category === '体育'),
  },
  {
    label: '招聘',
    items: NEWS_SOURCES.filter((s) => s.category === '招聘'),
  },
  {
    label: '政府数据',
    items: NEWS_SOURCES.filter((s) => s.category === '政府数据'),
  },
]

const switchTab = (key: string) => {
  if (activeKey.value === key) return
  activeKey.value = key
  router.replace({ query: { ...route.query, tab: key } })
}

watch(
  () => route.query.tab,
  (tab) => {
    if (tab && NEWS_SOURCES.some((s) => s.key === tab)) {
      activeKey.value = tab as string
    }
  },
  { immediate: true },
)
</script>

