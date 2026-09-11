<script setup lang="ts">
import { computed } from "vue";
import { Handle, Position } from "@vue-flow/core";
import NodeParameterSummary from "./NodeParameterSummary.vue";
import { getManifestByType } from "@/views/workflow/editor/config/node-manifest";

const props = defineProps<{
  id?: string;
  type?: string;
  data: { label?: string; config?: any; selected?: boolean; type?: string; name?: string };
}>();

const nodeMeta = computed(() => {
  const rawType =
    (props.type && props.type !== "default" ? props.type : "") ||
    (props.data as any)?.capabilityType ||
    props.data?.type ||
    props.type ||
    "";
  const manifest = getManifestByType(rawType);
  return {
    icon: manifest?.iconImage || manifest?.icon,
    color: manifest?.color || "#4f46e5",
    label: props.data?.label || manifest?.name || "节点",
  };
});
</script>

<template>
  <div class="wf-node wf-node--default" :style="{ borderColor: nodeMeta.color + '40' }">
    <Handle type="target" :position="Position.Top" />
    <div class="wf-node__header">
      <img v-if="nodeMeta.icon" :src="nodeMeta.icon" class="wf-node__icon" />
      <span class="wf-node__label">{{ nodeMeta.label }}</span>
    </div>
    <NodeParameterSummary :data="data" />
    <Handle type="source" :position="Position.Bottom" />
  </div>
</template>

<style scoped>
.wf-node--default {
  min-width: 100px;
  padding: 6px 12px;
  text-align: center;
  background: var(--app-content-surface-color);
  border: 1px solid var(--app-content-border-color);
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
  justify-content: center;
  gap: 6px;
}

.wf-node__icon {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
  object-fit: contain;
}

.wf-node__label {
  font-size: 12px;
  font-weight: 500;
  color: var(--el-text-color-primary);
}
</style>
