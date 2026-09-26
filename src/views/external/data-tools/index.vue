<template>
  <CollectLayout
    title="数据工具采集"
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
import { DATA_TOOLS } from '@/api/external/data-tools/config'

defineOptions({ name: 'ExternalDataToolsCollect' })

const route = useRoute()
const router = useRouter()

const activeKey = ref<string>('openmeteo')

const activeSource = computed(() => DATA_TOOLS.find((s) => s.key === activeKey.value))

const menuGroups = [
  {
    label: '天气',
    items: DATA_TOOLS.filter((s) => s.category === '天气'),
  },
  {
    label: '汇率金融',
    items: DATA_TOOLS.filter((s) => s.category === '汇率金融'),
  },
  {
    label: '金融行情',
    items: DATA_TOOLS.filter((s) => s.category === '金融行情'),
  },
  {
    label: '查询工具',
    items: DATA_TOOLS.filter((s) => s.category === '查询工具'),
  },
  {
    label: '其他',
    items: DATA_TOOLS.filter((s) => s.category === '其他'),
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
    if (tab && DATA_TOOLS.some((s) => s.key === tab)) {
      activeKey.value = tab as string
    }
  },
  { immediate: true },
)
</script>

