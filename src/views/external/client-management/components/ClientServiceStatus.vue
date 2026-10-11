<template>
  <div class="svc-list">
    <template v-if="services.length">
      <div v-for="svc in services" :key="svc.key" class="svc-row">
        <span class="svc-row__name">{{ svc.label }}</span>
        <span
          :class="['svc-row__dot', `svc-row__dot--${svc.statusType}`]"
        />
        <span :class="['svc-row__status', `svc-row__status--${svc.statusType}`]">
          {{ svc.statusText }}
        </span>
        <span v-if="svc.state" class="svc-row__state">{{ svc.state }}</span>
        <span v-if="svc.message" class="svc-row__msg">{{ svc.message }}</span>
      </div>
    </template>
    <el-empty v-else description="暂无服务" :image-size="40" />
  </div>
</template>

<script lang="ts" setup>
import { computed } from "vue";
import type { WebsocketConnectionVO } from "@/api/system/websocket";

interface ServiceDisplayInfo {
  key: string;
  label: string;
  statusText: string;
  statusType: "success" | "danger" | "info";
  state?: string;
  message?: string;
}

const props = defineProps<{ client: WebsocketConnectionVO }>();

/** 只显示核心服务，隐藏采集源等细粒度状态 */
const CORE_SERVICE_RE = /^(browser-automation|photoshop|ps-automation|image-processing|material-library|video-template|file-download|mcp|collect|collect-engine|media-collect|googleArt|shopify|design-tool)$/i;

/** 采集源/数据工具等噪声服务 key 模式（全部隐藏） */
const NOISE_RE = /^(collect_|hotsearch_|data[_-]?tools|36kr|baidu|bing|bbcnews|bbc-news|chinadaily|cma|duckduckgo|emojipedia|flickr|foodiesfeed|gdelt|github|google[-_]?icons|googleimages|google[-_]?images|googlenews|google[-_]?news|govcn|gratisography|hackernews|hacker[-_]?news|huxiu|iconify|internet-archive|isorepublic|kaboompics|lifeofpix|magnific|metmuseum|midjourney|mittechreview|nappy|negativespace|nounproject|npr|openclipart|openmoji|openverse|pakutaso|pexels|picjumbo|pinterest|pixabay|producthunt|rawpixel|reddit|reuters|rijksmuseum|smithsonian|so|sogou|stocksnap|svgrepo|techcrunch|theguardian|thepaper|theverge|undraw|unsplash|vecteezy|wallhaven|wikimedia|xinhuanet|yandex|weather|currency|exchange|timezone|ip$|postal|color|sunrise|sunset|dictionary|worldometer|coingecko|coinmarketcap|flashscore|linkedin|yahoo|worldometers|weather-com|open-meteo|wttr|our-world|quanta|science|science-daily|hollywood|deadline|variety|billboard|space-com|phys-org|ars-technica|wired|engadget|apnews|npr-technology|bbc-technology|guardian-technology|techcrunch-rss|ars-technica-rss|mit-tech-review-rss|theverge-rss|bbctechnology|getApnews|getWired|getEngadget|getBbctechnology|getGuardiantechnology|getMittechreviewrss|getNprtechnology|getTechcrunchrss|getThevergerss|getArstechnicarss|getTime)/i;

const services = computed(() => {
  const map = props.client?.clientInfo?.services || {};
  return Object.entries(map)
    .filter(([key]) => {
      if (CORE_SERVICE_RE.test(key)) return true;
      return !NOISE_RE.test(key);
    })
    .map(([key, v]) => {
      const s = v as Record<string, any>;
      const rawStatus = String(s.status || "").toLowerCase();
      const rawState = String(s.state || "").toLowerCase();
      const isDisconnected = rawStatus === "disconnected";
      const isError = rawStatus === "error" || rawState === "error";

      if (isError || isDisconnected) {
        return { key, label: s.label || key, statusText: isDisconnected ? "断开" : "错误", statusType: "danger", state: s.state, message: s.message };
      }
      if (s.available || s.connected) {
        return { key, label: s.label || key, statusText: s.available ? "可用" : "已连接", statusType: "success", state: s.state, message: s.message };
      }
      return { key, label: s.label || key, statusText: s.status || s.state || "未知", statusType: "info", state: s.state, message: s.message };
    });
});
</script>

<style scoped lang="scss">
.svc-list {
  display: flex;
  flex-direction: column;
}

.svc-row {
  display: flex;
  padding: 6px 0;
  font-size: 12px;
  border-bottom: 1px solid var(--el-border-color-lighter);
  align-items: center;
  gap: 8px;

  &:last-child {
    border-bottom: none;
  }

  &__name {
    min-width: 100px;
    font-weight: 500;
    color: var(--el-text-color-primary);
  }

  &__dot {
    width: 5px;
    height: 5px;
    background: var(--el-text-color-placeholder);
    border-radius: 50%;

    &--success { background: var(--el-color-success); }

    &--danger { background: var(--el-color-danger); }
  }

  &__status {
    font-size: 11px;

    &--success { color: var(--el-color-success); }

    &--danger { color: var(--el-color-danger); }

    &--info { color: var(--el-text-color-secondary); }
  }

  &__state {
    font-size: 11px;
    color: var(--el-text-color-secondary);
  }

  &__msg {
    overflow: hidden;
    color: var(--el-text-color-placeholder);
    text-overflow: ellipsis;
    white-space: nowrap;
    flex: 1;
  }
}
</style>
