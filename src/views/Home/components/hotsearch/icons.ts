import type { HotsearchOverviewDisplay } from '@/api/hotsearch'
import {
  bilibiliIcon,
  doubanIcon,
  douyinIcon,
  ithomeIcon,
  kuaishouIcon,
  thirtySixKrIcon,
  toutiaoIcon,
  v2exIcon,
  weiboIcon,
  xiaohongshuIcon,
  zhihuIcon
} from '@/assets/icons/apps'
import { githubIcon, hupuIcon, huxiuIcon, sspaiIcon } from '@/assets/icons/news'

/** 源定义的 display.icon → 本地图标资源；未知 key 不渲染图标 */
const ICONS: Record<string, string> = {
  weibo: weiboIcon,
  douyin: douyinIcon,
  bilibili: bilibiliIcon,
  zhihu: zhihuIcon,
  toutiao: toutiaoIcon,
  douban: doubanIcon,
  kuaishou: kuaishouIcon,
  xiaohongshu: xiaohongshuIcon,
  v2ex: v2exIcon,
  '36kr': thirtySixKrIcon,
  ithome: ithomeIcon,
  github: githubIcon,
  hupu: hupuIcon,
  huxiu: huxiuIcon,
  sspai: sspaiIcon
}

export const resolvePlatformIcon = (key?: string): string | undefined =>
  key ? ICONS[key] : undefined

export const accentStyle = (display?: HotsearchOverviewDisplay) =>
  display?.accent ? { '--hs-accent': display.accent } : undefined
