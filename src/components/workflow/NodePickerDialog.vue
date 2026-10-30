<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { Search, Close } from "@element-plus/icons-vue";
import { Icon } from "@/components/Icon";
import {
  SYSTEM_NODE_REGISTRY,
  NODE_CATEGORIES,
  NODE_REQUIREMENTS,
  type SystemNodeCapability,
} from "@/views/workflow/editor/config/nodeRegistry";
import {
  useWorkflowNodeManifest,
  UNAVAILABLE_WORKFLOW_NODE_TYPES,
} from "@/composables/useWorkflowNodeManifest";

const props = defineProps<{
  modelValue: boolean;
}>();

const emit = defineEmits<{
  (e: "update:modelValue", val: boolean): void;
  (e: "select", capability: SystemNodeCapability): void;
}>();

const searchQuery = ref("");
const activeCategory = ref("all");
const { byType, serverOnlyCapabilities, load: loadServerManifest } =
  useWorkflowNodeManifest();
onMounted(() => {
  loadServerManifest();
});

const availableCapabilities = computed(() => [
  ...SYSTEM_NODE_REGISTRY.filter(
    (item) =>
      !UNAVAILABLE_WORKFLOW_NODE_TYPES.has(item.type) &&
      (!byType.value.get(item.type) || byType.value.get(item.type)?.executable !== false),
  ).map((item) => {
    const remote = byType.value.get(item.type);
    return remote
      ? {
          ...item,
          name: remote.name || item.name,
          description: remote.description || item.description,
          inputSchema: remote.inputSchema || item.inputSchema,
          outputSchema: remote.outputSchema || item.outputSchema,
        }
      : item;
  }),
  // 服务端新增、前端 registry 尚未登记的节点直接追加，避免新节点在节点库中“消失”。
  ...serverOnlyCapabilities.value,
]);

const filteredCapabilities = computed(() => {
  return availableCapabilities.value.filter((item) => {
    const matchCategory = activeCategory.value === "all" || item.category === activeCategory.value;
    const query = searchQuery.value.trim().toLowerCase();
    if (!query) return matchCategory;
    return (
      matchCategory &&
      (item.name.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query) ||
        item.type.toLowerCase().includes(query) ||
        (item.badge?.toLowerCase().includes(query) ?? false))
    );
  });
});

const getCategoryCount = (key: string) => {
  if (key === "all") return availableCapabilities.value.length;
  return availableCapabilities.value.filter((n) => n.category === key).length;
};

const handleSelect = (cap: SystemNodeCapability) => {
  emit("select", cap);
  emit("update:modelValue", false);
  searchQuery.value = "";
  activeCategory.value = "all";
};

const getReqStyle = (type: string) => {
  const color = NODE_REQUIREMENTS[type].color;
  return { color, background: `color-mix(in srgb, ${color} 12%, transparent)` };
};

const handleClose = () => {
  emit("update:modelValue", false);
  searchQuery.value = "";
  activeCategory.value = "all";
};
</script>

<template>
  <el-dialog
    :model-value="modelValue"
    :show-close="false"
    fullscreen
    class="node-picker-dialog"
    @close="handleClose"
  >
    <div class="np-layout">
      <!-- 顶部栏 -->
      <div class="np-header">
        <div class="np-header__center">
          <el-input
            v-model="searchQuery"
            placeholder="搜索节点..."
            size="default"
            clearable
            autofocus
            class="np-search"
          >
            <template #prefix>
              <el-icon>
                <Search />
              </el-icon>
            </template>
          </el-input>
        </div>
        <div class="np-header__right">
          <el-button text :icon="Close" @click="handleClose">关闭</el-button>
        </div>
      </div>

      <!-- 主体 -->
      <div class="np-body">
        <!-- 左侧分类 -->
        <div class="np-sidebar">
          <div
            v-for="cat in NODE_CATEGORIES"
            :key="cat.key"
            class="np-sidebar__item"
            :class="{ 'is-active': activeCategory === cat.key }"
            @click="activeCategory = cat.key"
          >
            <span class="np-sidebar__label">{{ cat.label }}</span>
            <span class="np-sidebar__count">{{ getCategoryCount(cat.key) }}</span>
          </div>
        </div>

        <!-- 右侧节点网格 -->
        <div class="np-grid-wrap">
          <div v-if="filteredCapabilities.length === 0" class="np-empty">
            <div class="np-empty__illustration">
              <el-icon class="np-empty__icon">
                <Search />
              </el-icon>
            </div>
            <p class="np-empty__title">未找到匹配的节点</p>
            <p class="np-empty__desc">尝试更换搜索词或切换分类</p>
          </div>
          <div v-else class="np-grid">
            <div
              v-for="cap in filteredCapabilities"
              :key="cap.type"
              class="np-card"
              @click="handleSelect(cap)"
            >
              <div class="np-card__media">
                <div class="np-card__icon-wrap">
                  <img v-if="cap.iconImage" :src="cap.iconImage" class="np-card__icon-img" />
                  <Icon
                    v-else-if="cap.icon"
                    :icon="cap.icon"
                    :size="22"
                    :color="cap.color"
                  />
                  <span v-else class="np-card__icon-text" :style="{ color: cap.color }">{{
                    cap.name?.charAt(0) || "?"
                  }}</span>
                </div>
              </div>
              <div class="np-card__content">
                <div class="np-card__header">
                  <span class="np-card__title">{{ cap.name }}</span>
                </div>
                <div class="np-card__desc">{{ cap.description }}</div>
                <div v-if="cap.requirements?.length" class="np-card__requirements">
                  <span
                    v-for="req in cap.requirements"
                    :key="req.type"
                    class="np-card__req-tag"
                    :style="getReqStyle(req.type)"
                    :title="req.description || req.label"
                  >
                    {{ NODE_REQUIREMENTS[req.type].label }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </el-dialog>
</template>

<style lang="scss">
/* 全局覆盖 dialog 默认样式，去掉 padding/header */
.node-picker-dialog {
  .el-dialog__header {
    display: none;
  }

  .el-dialog__body {
    height: 100vh;
    padding: 0;
    overflow: hidden;
  }
}
</style>

<style scoped lang="scss">
.np-layout {
  display: flex;
  height: 100vh;
  overflow: hidden;
  background: var(--el-bg-color);
  flex-direction: column;
}

/* 顶部栏 */
.np-header {
  display: flex;
  height: 56px;
  padding: 0 12px;
  border-bottom: 1px solid var(--el-border-color-light);
  align-items: center;
  gap: 16px;
  flex-shrink: 0;
}

.np-header__center {
  flex: 1;
  max-width: 420px;
}

.np-search {
  width: 100%;
}

.np-header__right {
  flex-shrink: 0;
  margin-left: auto;
}

/* 主体 */
.np-body {
  display: flex;
  flex: 1;
  overflow: hidden;
}

/* 左侧分类列表 */
.np-sidebar {
  width: 180px;
  padding: 12px 8px;
  overflow-y: auto;
  border-right: 1px solid var(--el-border-color-light);
  flex-shrink: 0;
}

.np-sidebar__item {
  display: flex;
  padding: 12px;
  margin-bottom: 4px;
  font-size: 11px;
  font-weight: 600;
  color: var(--el-text-color-regular);
  cursor: pointer;
  border-radius: 6px;
  transition: all 0.12s ease;
  align-items: center;

  &:hover {
    color: var(--el-text-color-primary);
    background: color-mix(in srgb, var(--el-color-primary) 6%, transparent);
  }

  &.is-active {
    font-weight: 600;
    color: var(--el-color-primary);
    background: color-mix(in srgb, var(--el-color-primary) 10%, transparent);

    .np-sidebar__count {
      color: var(--el-color-primary);
      background: color-mix(in srgb, var(--el-color-primary) 18%, transparent);
    }
  }
}

.np-sidebar__label {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.np-sidebar__count {
  min-width: 32px;
  padding: 2px 7px;
  font-size: 10px;
  font-weight: 600;
  color: var(--el-text-color-placeholder);
  text-align: center;
  background: color-mix(in srgb, var(--el-text-color-secondary) 10%, transparent);
  border-radius: 8px;
  flex-shrink: 0;
}

/* 右侧网格 */
.np-grid-wrap {
  padding: 20px 24px;
  overflow-y: auto;
  flex: 1;
}

.np-empty {
  display: flex;
  padding: 80px 0;
  text-align: center;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
}

.np-empty__illustration {
  display: flex;
  width: 56px;
  height: 56px;
  background: color-mix(in srgb, var(--el-text-color-secondary) 8%, transparent);
  border-radius: 14px;
  align-items: center;
  justify-content: center;
}

.np-empty__icon {
  font-size: 24px;
  color: var(--el-text-color-secondary);
  opacity: 0.5;
}

.np-empty__title {
  margin: 0;
  font-size: 11px;
  font-weight: 600;
  color: var(--el-text-color-regular);
}

.np-empty__desc {
  margin: 0;
  font-size: 11px;
  color: var(--el-text-color-placeholder);
}

.np-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 12px;
}

/* 节点卡片 - 简洁风格 */
.np-card {
  display: grid;
  grid-template-columns: 36px 1fr;
  grid-template-rows: auto;
  padding: 10px 12px;
  cursor: pointer;
  background: var(--app-content-surface-color);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
  transition: all 0.15s ease;
  gap: 10px;
  align-items: start;

  &:hover {
    border-color: var(--el-border-color);
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.06);
  }
}

html.dark .np-card {
  border-color: transparent;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);

  &:hover {
    border-color: color-mix(in srgb, var(--el-color-primary) 30%, transparent);
    box-shadow:
      0 3px 12px rgba(0, 0, 0, 0.4),
      0 0 0 1px color-mix(in srgb, var(--el-color-primary) 15%, transparent);
    transform: translateY(-1px);
  }
}

.np-card__media {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
}

.np-card__icon-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
}

.np-card__icon-text {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 4px;
  background: color-mix(in srgb, currentColor 10%, transparent);
  font-size: 12px;
  font-weight: 600;
  line-height: 1;
}

.np-card__icon-img {
  max-width: 100%;
  max-height: 100%;
  width: auto;
  height: auto;
  object-fit: contain;
}

.np-card__icon-wrap :deep(.el-icon),
.np-card__icon-wrap :deep(svg) {
  width: 28px;
  height: 28px;
  font-size: 28px;
}

.np-card__content {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.np-card__header {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.np-card__title {
  font-size: 13px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  line-height: 1.4;
}

.np-card__desc {
  display: -webkit-box;
  overflow: hidden;
  font-size: 11px;
  line-height: 1.5;
  color: var(--el-text-color-secondary);
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.np-card__requirements {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 6px;
}

.np-card__req-tag {
  display: inline-flex;
  padding: 2px 8px;
  font-size: 9px;
  font-weight: 600;
  line-height: 1.4;
  white-space: nowrap;
  border-radius: 20px;
  align-items: center;
}
</style>
