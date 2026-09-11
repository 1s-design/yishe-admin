<script setup lang="ts">
import NodeParameterSummary from "./NodeParameterSummary.vue";
import { computed } from "vue";
import { Handle, Position } from "@vue-flow/core";
import { getManifestByType } from "@/views/workflow/editor/config/node-manifest";

const props = defineProps<{
  id?: string;
  type?: string;
  data: { label?: string; config?: any; type?: string; name?: string };
}>();

const nodeMeta = computed(() => {
  const rawType = (props.data as any)?.capabilityType || props.data?.type || props.type || "";
  const manifest = getManifestByType(rawType);
  const isImageCategory = manifest?.category === "material" || rawType.includes("image");
  const typeText = manifest?.badge || (isImageCategory ? "图片采集" : (manifest?.name?.replace(/搜索采集|采集|搜索/, "") || "数据采集"));
  return {
    icon: manifest?.iconImage || manifest?.icon,
    color: manifest?.color || "#4f46e5",
    label: props.data?.label || manifest?.name || "采集节点",
    type: typeText,
    showType: isImageCategory || Boolean(manifest?.badge),
  };
});

const keyword = computed(() => props.data?.config?.keyword || props.data?.config?.query || "");
const maxCount = computed(() => props.data?.config?.maxCount || props.data?.config?.limit || 10);
</script>

<template>
  <div class="wf-node wf-node--image-engine" :style="{ borderColor: nodeMeta.color + '40' }">
    <Handle type="target" :position="Position.Top" />
    <div class="wf-node__header">
      <img v-if="nodeMeta.icon" :src="nodeMeta.icon" class="wf-node__icon" />
      <span class="wf-node__title">{{ data.label || nodeMeta.label }}</span>
    </div>
    <div v-if="keyword" class="wf-node__subtitle">{{ keyword }}</div>
    <div v-if="nodeMeta.showType" class="wf-node__type">{{ nodeMeta.type }}</div>
    <NodeParameterSummary :data="data" />
    <Handle type="source" :position="Position.Bottom" />
  </div>
</template>

<style scoped>
.wf-node--image-engine {
  min-width: 120px;
  padding: 6px 10px;
  background: var(--app-content-surface-color);
  border: 1px solid;
  border-radius: 6px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
  transition: all 0.15s ease;
}

.wf-node--image-engine:hover {
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
}

.wf-node__header {
  display: flex;
  align-items: center;
  gap: 6px;
}

.wf-node__icon {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  object-fit: contain;
}

.wf-node__title {
  font-size: 11px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.wf-node__subtitle {
  font-size: 10px;
  color: var(--el-text-color-regular);
  margin-top: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.wf-node__type {
  font-size: 9px;
  color: var(--el-text-color-secondary);
  font-weight: 500;
  margin-top: 2px;
}
</style>
