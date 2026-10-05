<template>
  <div class="data-tools-page">
    <div class="data-tools-layout">
      <!-- 左侧工具菜单（由源 meta.searchParams 的 tool 选项动态生成） -->
      <aside class="collect-menu">
        <div class="menu-header">数据工具</div>
        <nav class="menu-list">
          <div class="menu-group-title">通用采集</div>
          <div
            v-for="t in toolItems"
            :key="t.value"
            class="menu-item"
            :class="{ 'is-active': activeTool === t.value }"
            @click="switchTool(t.value)"
          >
            <span class="menu-item-text">{{ t.label }}</span>
          </div>
        </nav>
      </aside>

      <!-- 右侧通用引擎面板（工具选择随 tab 预置） -->
      <main class="collect-body">
        <CollectEnginePanel
          v-if="activeTool"
          source-id="data-tools"
          :preset-params="{ tool: activeTool }"
        />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import CollectEnginePanel from '../components/CollectEnginePanel.vue'
import { listCollectSources, type CollectSourceMeta } from '@/api/external/collect'

defineOptions({ name: 'ExternalDataToolsCollect' })

interface ToolItem { value: string; label: string }

const toolItems = ref<ToolItem[]>([])
const activeTool = ref('')

async function loadTools() {
  try {
    const res: any = await listCollectSources('data-tools')
    const list = res?.data ?? res ?? []
    const meta: CollectSourceMeta | undefined = (Array.isArray(list) ? list : []).find(
      (s: CollectSourceMeta) => s.id === 'data-tools',
    )
    const toolField = (meta?.searchParams || []).find((p) => p.key === 'tool')
    toolItems.value = (toolField?.options || []).map((o) => ({
      value: String(o.value),
      label: o.label,
    }))
    if (!activeTool.value && toolItems.value.length) {
      activeTool.value = toolItems.value[0].value
    }
  } catch (e) {
    console.error('[data-tools] 加载工具清单失败:', e)
    toolItems.value = []
  }
}

function switchTool(value: string) {
  if (activeTool.value === value) return
  activeTool.value = value
}

onMounted(loadTools)
</script>

<style scoped>
.data-tools-page {
  width: 100%;
  height: 100%;
}
.data-tools-layout {
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
.menu-item-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
