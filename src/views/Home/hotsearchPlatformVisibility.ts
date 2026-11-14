/**
 * #/home/hot-search 模块与「热搜综合定时采集」工作流都不再使用的平台。
 *
 * 这几个源要么被客户端拦截（当当），要么偏电商/优惠/海外独立站趋势，
 * 与「热搜」语义不符。
 *
 * 服务端已在 design-server/src/hotsearch/hotsearch-platform-visibility.ts
 * 做权威过滤（列表/分页总数/概览都不返回），这里保留一份用于前端兜底，
 * 增删平台时两处需同步。
 */
export const HIDDEN_HOTSEARCH_PLATFORM_KEYS = [
  'hotsearch-dangdang-bestsellers',
  'hotsearch-manmanbuy-deals',
  'hotsearch-tunbang',
  'hotsearch-shopify-trending'
] as const

const HIDDEN_PLATFORM_KEY_SET = new Set<string>(HIDDEN_HOTSEARCH_PLATFORM_KEYS)

/** 该平台是否应从热搜模块中隐藏 */
export function isHotsearchPlatformHidden(platformKey?: string | null): boolean {
  const key = String(platformKey ?? '').trim()
  return !!key && HIDDEN_PLATFORM_KEY_SET.has(key)
}

/** 过滤掉隐藏平台 */
export function filterVisibleHotsearchPlatforms<T extends { platformKey?: string | null }>(
  platforms: T[] | null | undefined
): T[] {
  if (!Array.isArray(platforms)) return []
  return platforms.filter((item) => !isHotsearchPlatformHidden(item?.platformKey))
}
