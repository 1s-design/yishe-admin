<template>
  <div class="module-collect-page">
    <!-- 通用引擎面板：数据工具由服务端 data-tools 源定义维护（含工具切换） -->
    <CollectEnginePanel source-id="data-tools" />
  </div>
</template>

<script setup lang="ts">
import CollectEnginePanel from '../components/CollectEnginePanel.vue'

defineOptions({ name: 'ExternalDataToolsCollect' })
</script>

<style scoped>
.module-collect-page {
  width: 100%;
  height: 100%;
  overflow-y: auto;
}
</style>
