/**
 * Material Symbols 图标集加载器
 * 将 material-symbols 图标数据注册到 Iconify 实例中
 * 使得 <Icon icon="material-symbols:xxx" /> 可以直接使用
 *
 * 性能说明：完整图标集 JSON 约 7.9MB，同步 import 会阻塞首屏
 * （dev 模式下每次启动都要下载解析，prod 模式下会撑大主包）。
 * 改为浏览器空闲时异步加载：
 * - 加载完成前，未命中的图标会由 Iconify 默认行为回退到 API 在线获取
 * - 加载完成后全量图标离线可用
 */
import Iconify from '@iconify/iconify'

// 将 material-symbols 图标集注册到 Iconify（异步，不阻塞启动）
const loadMaterialSymbols = async () => {
  try {
    const module = await import('@iconify/json/json/material-symbols.json')
    Iconify.addCollection(module.default as any)
  } catch (error) {
    console.warn('[iconify] material-symbols 图标集异步加载失败，将回退到 API 在线获取:', error)
  }
}

// 浏览器空闲时加载，避免与首屏渲染争抢资源
if (typeof window !== 'undefined') {
  const idleApi = (window as any).requestIdleCallback as
    | ((cb: () => void, opts?: { timeout?: number }) => number)
    | undefined

  if (typeof idleApi === 'function') {
    idleApi(() => loadMaterialSymbols(), { timeout: 3000 })
  } else {
    setTimeout(loadMaterialSymbols, 1500)
  }
}

export default {}
