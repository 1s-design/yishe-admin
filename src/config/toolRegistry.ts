import type { ToolWindowDefinition } from '@/types/toolWindow'
import { getAccessToken } from '@/utils/auth'

const normalizeEmbeddedToken = (tokenValue: unknown) => {
  const normalizedValue = String(tokenValue || '').trim()
  if (!normalizedValue) {
    return ''
  }

  return normalizedValue.replace(/^Bearer\s+/i, '').trim()
}

export const resolveDesignToolUrl = () => {
  const configuredUrl = String(import.meta.env.VITE_YISHE_TOOL_URL || '').trim()
  if (configuredUrl) {
    return configuredUrl
  }

  if (import.meta.env.DEV) {
    return 'http://localhost:1522'
  }

  if (typeof window !== 'undefined') {
    const { protocol, hostname } = window.location
    if (hostname === 'admin.1s.design' || hostname === '1s.design') {
      return 'https://tool.1s.design'
    }
    // 私有部署：自动派生到同域名的 1522 端口
    return `${protocol}//${hostname}:1522`
  }

  return 'https://tool.1s.design'
}

const buildEmbeddedToolUrl = (baseSrc: string) => {
  if (!baseSrc) {
    return ''
  }

  const token = normalizeEmbeddedToken(getAccessToken())

  try {
    const parsedUrl = new URL(baseSrc, window.location.origin)
    parsedUrl.searchParams.set('embed', 'admin')
    if (token) {
      parsedUrl.searchParams.set('token', token)
    }
    return parsedUrl.toString()
  } catch (error) {
    console.warn('构建工具地址失败，回退到原始地址', error)
    return baseSrc
  }
}

export const toolRegistry: Record<string, ToolWindowDefinition> = {
  designTool: {
    key: 'designTool',
    title: '设计工具',
    icon: 'ep:monitor',
    src: resolveDesignToolUrl(),
    buildSrc: buildEmbeddedToolUrl,
    singleton: true,
    defaultMode: 'fullscreen',
    defaultWidth: 1220,
    defaultHeight: 760,
    minWidth: 820,
    minHeight: 520,
    allowFullscreen: true,
    allowNewTab: true,
  },
  // === 内置组件工具 ===
  calculator: {
    key: 'calculator',
    title: '计算器',
    icon: 'ep:document-copy',
    component: () => import('@/components/ToolWindowHost/tools/Calculator.vue'),
    defaultMode: 'window',
    defaultWidth: 280,
    defaultHeight: 460,
    minWidth: 260,
    minHeight: 360,
    allowFullscreen: false,
    allowNewTab: false,
    singleton: true,
  },
  translator: {
    key: 'translator',
    title: 'AI翻译',
    icon: 'ep:chat-dot-round',
    component: () => import('@/components/ToolWindowHost/tools/Translator.vue'),
    defaultMode: 'window',
    defaultWidth: 720,
    defaultHeight: 680,
    minWidth: 520,
    minHeight: 480,
    allowFullscreen: false,
    allowNewTab: false,
    singleton: true,
  },
}

export const toolRegistryList = Object.values(toolRegistry)

export const getToolDefinition = (key: string) => toolRegistry[key]
