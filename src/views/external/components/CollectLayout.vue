<template>
  <div class="collect-page">
    <div class="collect-layout">
      <aside class="collect-menu">
        <div class="collect-menu__header">{{ title }}</div>
        <nav class="collect-menu__list">
          <!-- 可选的"运行记录"入口 -->
          <div v-if="showHistory" class="collect-menu__group">
            <div class="collect-menu__item" @click="emit('history')">
              <span class="collect-menu__item-text">运行记录</span>
            </div>
          </div>
          <!-- 分组菜单 -->
          <div
            v-for="group in groups"
            :key="group.label"
            class="collect-menu__group"
          >
            <div class="collect-menu__group-label">{{ group.label }}</div>
            <div
              v-for="item in group.items"
              :key="item.key"
              class="collect-menu__item"
              :class="{ 'is-active': activeKey === item.key }"
              @click="emit('select', item.key)"
            >
              <span class="collect-menu__item-text">{{ item.label }}</span>
            </div>
          </div>
        </nav>
      </aside>
      <main class="collect-body">
        <slot />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
export interface CollectGroupItem {
  key: string
  label: string
}

export interface CollectMenuGroup {
  label: string
  items: CollectGroupItem[]
}

defineProps<{
  title: string
  groups: CollectMenuGroup[]
  activeKey?: string
  showHistory?: boolean
}>()

const emit = defineEmits<{
  (e: 'select', key: string): void
  (e: 'history'): void
}>()
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

.collect-menu__header {
  font-size: 11px;
  font-weight: 600;
  color: var(--el-text-color-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: 0 8px 8px 8px;
  margin-bottom: 4px;
  border-bottom: 1px solid var(--el-border-color-extra-light);
}

.collect-menu__list {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.collect-menu__group {
  display: flex;
  flex-direction: column;
  gap: 1px;
  margin-top: 8px;
}

.collect-menu__group-label {
  font-size: 11px;
  color: var(--el-text-color-placeholder);
  padding: 0 8px 4px 8px;
}

.collect-menu__item {
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

.collect-menu__item:hover {
  background: transparent;
  color: var(--el-text-color-primary);
}

.collect-menu__item:focus,
.collect-menu__item:focus-visible {
  outline: none;
}

.collect-menu__item.is-active {
  background: transparent;
  color: var(--el-color-primary);
  font-weight: 500;
}

.collect-menu__item-text {
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
  border-radius: 6px;
}

.collect-menu::-webkit-scrollbar-thumb:hover,
.collect-body::-webkit-scrollbar-thumb:hover {
  background: var(--el-text-color-secondary);
}
</style>
