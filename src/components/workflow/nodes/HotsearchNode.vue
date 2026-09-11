<script setup lang="ts">
import { computed } from "vue";
import NodeParameterSummary from "./NodeParameterSummary.vue";
import { Handle, Position } from "@vue-flow/core";
import { getManifestByType } from "@/views/workflow/editor/config/node-manifest";
import {
  weiboIcon,
  douyinIcon,
  bilibiliIcon,
  zhihuIcon,
  toutiaoIcon,
  doubanIcon,
  kuaishouIcon,
  v2exIcon,
  thirtySixKrIcon,
  ithomeIcon,
  xiaohongshuIcon,
} from "@/assets/icons/apps";
import { hupuIcon } from "@/assets/icons/news";

const props = defineProps<{
  id?: string;
  type?: string;
  data: { label?: string; config?: any; platform?: string; type?: string; name?: string; capabilityType?: string };
}>();

const platformIcons: Record<string, string> = {
  weibo: weiboIcon,
  douyin: douyinIcon,
  bilibili: bilibiliIcon,
  zhihu: zhihuIcon,
  toutiao: toutiaoIcon,
  douban: doubanIcon,
  kuaishou: kuaishouIcon,
  v2ex: v2exIcon,
  "36kr": thirtySixKrIcon,
  ithome: ithomeIcon,
  xiaohongshu: xiaohongshuIcon,
  xiaohongshu_note_detail: xiaohongshuIcon,
  hupu: hupuIcon,
  hupu_post_search: hupuIcon,
};

const resolvedInfo = computed(() => {
  const rawType =
    (props.type && props.type !== "default" ? props.type : "") ||
    (props.data as any)?.capabilityType ||
    props.data?.type ||
    props.type ||
    "";
  const platform =
    props.data?.platform ||
    props.data?.config?.platform ||
    (rawType.startsWith("hupu_") ? "hupu" : rawType.replace(/^hotsearch_/, "")) ||
    "weibo";

  // 1. 优先从全局 manifest 获取官方配置
  const manifest =
    getManifestByType(rawType) ||
    getManifestByType(`hotsearch_${platform}`) ||
    getManifestByType(platform);

  const icon =
    platformIcons[platform] ||
    platformIcons[rawType] ||
    manifest?.iconImage ||
    manifest?.icon;

  const color = manifest?.color || (platform === "hupu" ? "#C01A20" : "#4f46e5");
  const name = manifest?.name || props.data?.label || platform;

  return {
    icon,
    color,
    name,
    label: props.data?.label || name,
  };
});
</script>

<template>
  <div class="wf-node wf-node--hotsearch" :style="{ borderColor: resolvedInfo.color + '40' }">
    <Handle type="target" :position="Position.Top" />
    <div class="wf-node__header">
      <img v-if="resolvedInfo.icon" :src="resolvedInfo.icon" class="wf-node__icon" />
      <span v-else class="wf-node__text" :style="{ color: resolvedInfo.color }">{{ resolvedInfo.name }}</span>
      <span class="wf-node__title">{{ resolvedInfo.label }}</span>
    </div>
    <NodeParameterSummary :data="data" />
    <Handle type="source" :position="Position.Bottom" />
  </div>
</template>

<style scoped>
.wf-node--hotsearch {
  min-width: 100px;
  padding: 4px 8px;
  background: var(--app-content-surface-color);
  border: 1px solid;
  border-radius: 4px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
  transition: all 0.15s ease;
}

.wf-node--hotsearch:hover,
.wf-node--hotsearch.selected {
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
}

.wf-node__header {
  display: flex;
  align-items: center;
  gap: 4px;
}

.wf-node__icon {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  object-fit: contain;
  border-radius: 2px;
}

.wf-node__text {
  font-size: 11px;
  font-weight: 600;
  line-height: 1;
  flex-shrink: 0;
}

.wf-node__title {
  font-size: 11px;
  font-weight: 500;
  color: var(--el-text-color-primary);
  white-space: nowrap;
}
</style>
