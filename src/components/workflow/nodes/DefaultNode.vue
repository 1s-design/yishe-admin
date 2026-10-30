<script setup lang="ts">
import { computed } from "vue";
import { Handle, Position } from "@vue-flow/core";
import NodeParameterSummary from "./NodeParameterSummary.vue";
import { Icon } from "@/components/Icon";
import { getManifestByType } from "@/views/workflow/editor/config/node-manifest";
import {
  getWorkflowNodeCategoryDisplay,
  useWorkflowNodeManifest,
} from "@/composables/useWorkflowNodeManifest";

const props = defineProps<{
  id?: string;
  type?: string;
  data: { label?: string; config?: any; selected?: boolean; type?: string; name?: string };
}>();

const { byType, load } = useWorkflowNodeManifest();
// 服务端新增节点的名称/分类/字段只存在于 manifest，卡片必须等它加载后再补全。
load();

const nodeMeta = computed(() => {
  const rawType =
    (props.type && props.type !== "default" ? props.type : "") ||
    (props.data as any)?.capabilityType ||
    props.data?.type ||
    props.type ||
    "";
  const local = getManifestByType(rawType);
  const remote = rawType ? byType.value.get(rawType) : undefined;
  // 分类兜底：服务端新节点没有本地图标/配色时，按分类给出统一视觉。
  // 热搜源在服务端可能登记成 integration，这里按类型前缀纠正。
  const category = rawType.startsWith("hotsearch_")
    ? "hotsearch"
    : remote?.category || local?.category;
  const display = getWorkflowNodeCategoryDisplay(category);
  const name = local?.name || remote?.name || props.data?.label || rawType || "节点";
  const schema = (
    (Array.isArray(remote?.inputSchema) && remote.inputSchema.length
      ? remote.inputSchema
      : local?.inputSchema) || []
  ) as any[];

  return {
    iconImage: local?.iconImage,
    icon: local?.icon || display.icon,
    color: local?.color || display.color,
    title: props.data?.label || name,
    initial: String(name || "?").charAt(0),
    schema,
  };
});
</script>

<template>
  <div class="wf-node wf-node--default" :style="{ borderColor: nodeMeta.color + '40' }">
    <Handle type="target" :position="Position.Top" />
    <div class="wf-node__header">
      <img v-if="nodeMeta.iconImage" :src="nodeMeta.iconImage" class="wf-node__icon" />
      <span
        v-else
        class="wf-node__icon-box"
        :style="{
          color: nodeMeta.color,
          background: `color-mix(in srgb, ${nodeMeta.color} 12%, transparent)`,
        }"
      >
        <Icon v-if="nodeMeta.icon" :icon="nodeMeta.icon" :size="13" />
        <template v-else>{{ nodeMeta.initial }}</template>
      </span>
      <span class="wf-node__title">{{ nodeMeta.title }}</span>
    </div>
    <NodeParameterSummary :data="data" :schema="nodeMeta.schema" />
    <Handle type="source" :position="Position.Bottom" />
  </div>
</template>

<style scoped>
.wf-node--default {
  min-width: 100px;
  text-align: left;
  background: var(--app-content-surface-color);
  border: 1px solid;
  border-radius: 6px;
  box-shadow: 0 1px 4px rgb(0 0 0 / 4%);
  transition: all 0.15s ease;
}

.wf-node--default:hover,
.wf-node--default.selected {
  border-color: var(--el-color-primary);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--el-color-primary) 30%, transparent);
}

.wf-node__header {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.wf-node__icon {
  width: 18px;
  height: 18px;
  flex: 0 0 18px;
  object-fit: contain;
  border-radius: 3px;
}

.wf-node__icon-box {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  flex: 0 0 18px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 700;
  line-height: 1;
}

.wf-node__title {
  min-width: 0;
  font-size: 12px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
