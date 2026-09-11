<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{ data?: { config?: Record<string, any> } }>();
const LABELS: Record<string, string> = {
  keyword: "关键词",
  query: "查询",
  maxCount: "数量",
  limit: "数量",
  zoomLevel: "分辨率",
  category: "分类",
  city: "城市",
  method: "方法",
  url: "地址",
  storeUrl: "店铺",
  expression: "定时",
  path: "路径",
  channelName: "渠道",
  outputFormat: "格式",
  temperature: "温度",
  maxTokens: "令牌数",
  color: "颜色",
  style: "样式",
  mediaType: "媒体类型",
  formatPreference: "格式",
  timezone: "时区",
  word: "单词",
  latitude: "纬度",
  longitude: "经度",
  location: "位置编码",
  cityCode: "城市编码",
  codes: "证券代码",
  secid: "证券标识",
  symbol: "股票代码",
  ids: "币种",
  from: "基准货币",
  to: "目标货币",
  base: "基准货币",
  scope: "范围",
  platform: "平台",
  format: "格式",
  channelId: "渠道",
  triggerType: "触发方式",
  scoreId: "评分ID",
  sortby: "排序",
  executionMode: "执行端",
  page: "页码",
  pageSize: "每页",
};

const VALUE_LABELS: Record<string, string> = {
  all: "全部",
  monocolor: "单色",
  multicolor: "多色",
  duotone: "双色",
  technology: "科技",
  business: "商业",
  world: "国际",
  science: "科学",
  finance: "财经",
  sports: "体育",
  entertainment: "娱乐",
  photos: "图片",
  icons: "图标",
  videos: "视频",
  boards: "画板",
  pins: "图片",
  outlined: "描边",
  rounded: "圆角",
  sharp: "锐角",
  two_tone: "双色",
  color: "彩色",
  black: "黑白",
  png: "PNG 图片",
  svg: "SVG 矢量",
  jpg: "JPG 图片",
  text: "文本",
  json: "JSON",
  GET: "GET",
  POST: "POST",
  PUT: "PUT",
  DELETE: "DELETE",
  manual: "手动",
  cron: "定时",
  webhook: "Webhook",
  general: "综合",
  createtime: "最新",
  createtimeasc: "最早",
  replytime: "回复",
  light: "最亮",
  reply: "热门",
  server: "服务端",
  client: "客户端",
};
const entries = computed(() =>
  Object.entries(props.data?.config || {})
    .filter(
      ([key, value]) =>
        LABELS[key] &&
        value !== undefined &&
        value !== null &&
        value !== "" &&
        ![
          "code",
          "body",
          "headers",
          "conditions",
          "cases",
          "systemPrompt",
          "userPrompt",
          "metadata",
        ].includes(key),
    )
    .slice(0, 4)
    .map(([key, value]) => {
      let text = Array.isArray(value)
        ? `[${value.length}]`
        : typeof value === "object"
          ? "{…}"
          : VALUE_LABELS[String(value)] || String(value);
      const fullText = text;
      if (text.length > 28) text = `${text.slice(0, 25)}…`;
      return { key: LABELS[key] || key, value: text, fullText };
    }),
);
</script>

<template>
  <div v-if="entries.length" class="wf-node-params">
    <span
      v-for="item in entries"
      :key="item.key"
      class="wf-node-param"
      :title="`${item.key}: ${item.fullText}`"
    >
      <b>{{ item.key }}</b
      ><span>{{ item.value }}</span>
    </span>
  </div>
</template>

<style scoped>
.wf-node-params {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 4px;
  margin-top: 5px;
  max-width: 230px;
}
.wf-node-param {
  display: inline-flex;
  align-items: center;
  flex-wrap: nowrap;
  gap: 3px;
  width: 100%;
  max-width: none;
  padding: 2px 5px;
  border: 1px solid color-mix(in srgb, var(--app-content-border-color) 70%, transparent);
  border-radius: 4px;
  background: color-mix(in srgb, var(--app-content-surface-color) 80%, #64748b 20%);
  color: var(--el-text-color-secondary);
  font-size: 9px;
  line-height: 1.2;
  white-space: nowrap;
  word-break: keep-all;
}
.wf-node-param b {
  flex: 0 0 auto;
  min-width: 34px;
  color: var(--el-text-color-regular);
  font-weight: 600;
  white-space: nowrap;
}
.wf-node-param span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
