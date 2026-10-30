import type { Component } from 'vue'
import PlatformCard from './PlatformCard.vue'
import PlatformHeadlineCard from './PlatformHeadlineCard.vue'

/**
 * 卡片渲染器注册表：源定义只声明 key，未知 key 一律回退 default。
 * 新增专属卡片时在这里登记，服务端无需改动。
 */
const RENDERERS: Record<string, Component> = {
  default: PlatformCard,
  headline: PlatformHeadlineCard
}

export const resolvePlatformRenderer = (key?: string): Component =>
  (key && RENDERERS[key]) || PlatformCard
