<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { Search, Plus } from "@element-plus/icons-vue";
import {
  SYSTEM_NODE_REGISTRY,
  NODE_CATEGORIES,
  type SystemNodeCapability,
} from "@/views/workflow/editor/config/nodeRegistry";
import {
  useWorkflowNodeManifest,
  UNAVAILABLE_WORKFLOW_NODE_TYPES,
} from "@/composables/useWorkflowNodeManifest";

const emit = defineEmits<{
  (e: "add-node", nodeCapability: SystemNodeCapability): void;
}>();

const searchQuery = ref("");
const activeCategory = ref<string>("all");
const { byType, serverOnlyCapabilities, load: loadServerManifest } =
  useWorkflowNodeManifest();

onMounted(() => {
  loadServerManifest();
});

const availableCapabilities = computed(() => {
  const registry = SYSTEM_NODE_REGISTRY.filter((item) => {
    const remote = byType.value.get(item.type);
    return (
      !UNAVAILABLE_WORKFLOW_NODE_TYPES.has(item.type) && (!remote || remote.executable !== false)
    );
  }).map((item) => {
    const remote = byType.value.get(item.type);
    return remote
      ? {
          ...item,
          name: remote.name || item.name,
          // 始终使用本地详细描述，忽略服务端描述（服务端数据不完整）
          description: item.description || '',
          inputSchema: item.inputSchema || remote.inputSchema,
          outputSchema: item.outputSchema || remote.outputSchema,
        }
      : item;
  });
  // 服务端新增、前端 registry 尚未登记的节点同样纳入能力库。
  return [...registry, ...serverOnlyCapabilities.value];
});

const filteredCapabilities = computed(() => {
  return availableCapabilities.value.filter((item) => {
    // 1. 分类匹配
    const matchCategory = activeCategory.value === "all" || item.category === activeCategory.value;

    // 2. 检索关键字匹配
    const query = searchQuery.value.trim().toLowerCase();
    if (!query) return matchCategory;

    const matchName = item.name.toLowerCase().includes(query);
    const matchDesc = item.description.toLowerCase().includes(query);
    const matchType = item.type.toLowerCase().includes(query);
    const matchBadge = item.badge?.toLowerCase().includes(query);

    return matchCategory && (matchName || matchDesc || matchType || matchBadge);
  });
});

const getCategoryCount = (categoryKey: string) => {
  if (categoryKey === "all") return availableCapabilities.value.length;
  return availableCapabilities.value.filter((item) => item.category === categoryKey).length;
};

const onDragStart = (event: DragEvent, capability: SystemNodeCapability) => {
  if (event.dataTransfer) {
    event.dataTransfer.setData("application/vueflow-node-type", capability.type);
    event.dataTransfer.setData("application/vueflow-node-label", capability.name);
    event.dataTransfer.setData(
      "application/vueflow-node-data",
      JSON.stringify(capability.defaultData),
    );
    event.dataTransfer.effectAllowed = "move";
  }
};

const handleQuickAdd = (capability: SystemNodeCapability) => {
  emit("add-node", capability);
};
</script>

<template>
  <div class="node-library-panel">
    <!-- 面板标题与检索框 -->
    <div class="node-library-panel__header">
      <div class="node-library-panel__title-bar">
        <span class="node-library-panel__title">系统能力库</span>
        <span class="node-library-panel__badge">{{ SYSTEM_NODE_REGISTRY.length }} 项已集成</span>
      </div>
      <el-input
        v-model="searchQuery"
        placeholder="检索 AI抠图 / PSD渲染 / HTTP..."
        size="small"
        clearable
        class="node-library-panel__search"
      >
        <template #prefix>
          <el-icon><Search /></el-icon>
        </template>
      </el-input>
    </div>

    <!-- 分类 Pills 切换 -->
    <div class="node-library-panel__categories">
      <div
        v-for="cat in NODE_CATEGORIES"
        :key="cat.key"
        class="node-library-panel__category-pill"
        :class="{ 'is-active': activeCategory === cat.key }"
        @click="activeCategory = cat.key"
      >
        <span>{{ cat.label }}</span>
        <span class="node-library-panel__count-badge">{{ getCategoryCount(cat.key) }}</span>
      </div>
    </div>

    <!-- 能力卡片列表 -->
    <div class="node-library-panel__list">
      <div
        v-for="cap in filteredCapabilities"
        :key="cap.type"
        class="node-library-card"
        draggable="true"
        @dragstart="onDragStart($event, cap)"
      >
        <div class="node-library-card__icon-box" :style="{ background: cap.color }">
          <img
            v-if="cap.iconImage"
            :src="cap.iconImage"
            class="node-library-card__icon-img"
            style="width: 20px; height: 20px; object-fit: contain"
          />
          <Icon v-else :icon="cap.icon" class="node-library-card__icon" />
        </div>

        <div class="node-library-card__content">
          <div class="node-library-card__title-row">
            <span class="node-library-card__name">{{ cap.name }}</span>
            <span
              v-if="cap.badge"
              class="node-library-card__badge"
              :style="{ borderColor: cap.color, color: cap.color }"
            >
              {{ cap.badge }}
            </span>
          </div>
          <p class="node-library-card__desc">{{ cap.description }}</p>
        </div>

        <button
          type="button"
          class="node-library-card__add-btn"
          title="点击直接添加至画布"
          @click.stop="handleQuickAdd(cap)"
        >
          <el-icon><Plus /></el-icon>
        </button>
      </div>

      <div v-if="filteredCapabilities.length === 0" class="node-library-panel__empty">
        <div class="node-library-panel__empty-illustration">
          <el-icon class="node-library-panel__empty-icon"><Search /></el-icon>
        </div>
        <p class="node-library-panel__empty-title">未找到匹配的节点</p>
        <p class="node-library-panel__empty-desc">尝试更换搜索词或切换分类</p>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.node-library-panel {
  display: flex;
  width: 240px;
  height: 100%;
  overflow: hidden;
  background: var(--app-content-surface-color, #141518);
  border-right: 1px solid var(--app-content-border-color, rgb(255 255 255 / 8%));
  user-select: none;
  flex-direction: column;
  flex-shrink: 0;
}

.node-library-panel__header {
  display: flex;
  padding: 10px 10px 8px;
  border-bottom: 1px solid var(--app-content-border-color, rgb(255 255 255 / 6%));
  flex-direction: column;
  gap: 8px;
}

.node-library-panel__title-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.node-library-panel__title {
  font-size: 13px;
  font-weight: 700;
  color: var(--el-text-color-primary);
}

.node-library-panel__badge {
  padding: 1px 6px;
  font-size: 10px;
  font-weight: 600;
  color: var(--el-color-primary);
  background: color-mix(in srgb, var(--el-color-primary) 12%, transparent);
  border-radius: 999px;
}

.node-library-panel__categories {
  display: flex;
  padding: 8px 10px;
  background: rgb(0 0 0 / 2%);
  border-bottom: 1px solid var(--app-content-border-color, rgb(255 255 255 / 4%));
  flex-wrap: wrap;
  gap: 4px;
}

.node-library-panel__category-pill {
  display: inline-flex;
  padding: 2px 7px;
  font-size: 10px;
  color: var(--el-text-color-secondary);
  cursor: pointer;
  background: transparent;
  border-radius: 4px;
  transition: all 0.15s ease;
  align-items: center;
  gap: 4px;

  &:hover {
    color: var(--el-text-color-primary);
    background: color-mix(in srgb, var(--el-color-primary) 8%, transparent);
  }

  &.is-active {
    font-weight: 600;
    color: #fff;
    background: var(--el-color-primary);

    .node-library-panel__count-badge {
      color: #fff;
      background: rgb(255 255 255 / 20%);
    }
  }
}

.node-library-panel__count-badge {
  padding: 0 4px;
  font-size: 9px;
  color: var(--el-text-color-secondary);
  background: color-mix(in srgb, var(--el-text-color-secondary) 15%, transparent);
  border-radius: 999px;
}

.node-library-panel__list {
  display: flex;
  padding: 8px 10px;
  overflow-y: auto;
  flex: 1;
  flex-direction: column;
  gap: 8px;
}

.node-library-card {
  position: relative;
  display: flex;
  padding: 8px 9px;
  cursor: grab;
  background: color-mix(in srgb, var(--app-content-surface-color) 92%, #fff 8%);
  border: 1px solid var(--app-content-border-color, rgb(255 255 255 / 6%));
  border-radius: 8px;
  transition: all 0.18s cubic-bezier(0.22, 1, 0.36, 1);
  align-items: flex-start;
  gap: 9px;

  &:hover {
    background: color-mix(in srgb, var(--el-color-primary) 6%, var(--app-content-surface-color));
    border-color: color-mix(in srgb, var(--el-color-primary) 40%, transparent);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgb(0 0 0 / 8%);

    .node-library-card__add-btn {
      opacity: 1;
      transform: scale(1);
    }
  }
}

html.dark .node-library-card {
  border-color: transparent;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.25);

  &:hover {
    border-color: color-mix(in srgb, var(--el-color-primary) 30%, transparent);
    box-shadow:
      0 3px 12px rgba(0, 0, 0, 0.4),
      0 0 0 1px color-mix(in srgb, var(--el-color-primary) 15%, transparent);
    transform: translateY(-1px);
  }

  &:active {
    cursor: grabbing;
    transform: translateY(0);
  }
}

.node-library-card__icon-box {
  display: flex;
  width: 26px;
  height: 26px;
  color: #fff;
  border-radius: 6px;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.node-library-card__icon {
  font-size: 14px;
}

.node-library-card__content {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 2px;
}

.node-library-card__title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 4px;
}

.node-library-card__name {
  overflow: hidden;
  font-size: 11px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.node-library-card__badge {
  padding: 0 4px;
  font-size: 9px;
  font-weight: 600;
  line-height: 1.2;
  border: 1px solid currentcolor;
  border-radius: 3px;
}

.node-library-card__desc {
  display: -webkit-box;
  margin: 0;
  overflow: hidden;
  font-size: 10px;
  line-height: 1.35;
  color: var(--el-text-color-secondary);
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.node-library-card__add-btn {
  position: absolute;
  top: 6px;
  right: 6px;
  display: flex;
  width: 20px;
  height: 20px;
  color: #fff;
  cursor: pointer;
  background: var(--el-color-primary);
  border: none;
  border-radius: 4px;
  opacity: 0;
  transform: scale(0.85);
  transition: all 0.15s ease;
  align-items: center;
  justify-content: center;

  &:hover {
    background: color-mix(in srgb, var(--el-color-primary) 85%, #000 15%);
  }
}

.node-library-panel__empty {
  padding: 30px 0;
  text-align: center;
}
</style>
