<script lang="ts" setup>
import { computed } from 'vue'
import { isDark } from '@/utils/is'
import { useAppStore } from '@/store/modules/app'
import { useDesign } from '@/hooks/web/useDesign'
import { CACHE_KEY, useCache } from '@/hooks/web/useCache'
import routerSearch from '@/components/RouterSearch/index.vue'
import ToolWindowHost from '@/components/ToolWindowHost/index.vue'
import GlobalUploadTaskPanel from '@/components/GlobalUploadTaskPanel.vue'
import GlobalTemuBatchProgress from '@/components/GlobalTemuBatchProgress.vue'
import AiAssistantFloating from '@/components/AiAssistantFloating.vue'

defineOptions({ name: 'APP' })

const { getPrefixCls } = useDesign()
const prefixCls = getPrefixCls('app')
const appStore = useAppStore()
const currentSize = computed(() => appStore.getCurrentSize)
const greyMode = computed(() => appStore.getGreyMode)
const { wsCache } = useCache()

// 根据浏览器当前主题设置系统主题色
const setDefaultTheme = () => {
  let isDarkTheme = wsCache.get(CACHE_KEY.IS_DARK)
  if (isDarkTheme === null) {
    isDarkTheme = isDark()
  }
  appStore.setIsDark(isDarkTheme)
}
setDefaultTheme()
</script>
<template>
  <ConfigGlobal :size="currentSize">
    <RouterView :class="greyMode ? `${prefixCls}-grey-mode` : ''" />
    <routerSearch />
    <ToolWindowHost />
    <AiAssistantFloating />
    <GlobalUploadTaskPanel />
    <GlobalTemuBatchProgress />
  </ConfigGlobal>
</template>
<style lang="scss">
$prefix-cls: #{$namespace}-app;

.size {
  width: 100%;
  height: 100%;
}

html,
body {
  @extend .size;

  padding: 0 !important;
  margin: 0;
  border: 0 !important;
  outline: none !important;
  overflow: hidden;

  #app {
    @extend .size;
    border: 0 !important;
    outline: none !important;
  }
}

.#{$prefix-cls}-grey-mode {
  filter: grayscale(100%);
}
</style>
