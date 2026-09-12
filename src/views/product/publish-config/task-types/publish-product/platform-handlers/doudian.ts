import type { PlatformHandler } from './types'
import { normalizeHttpUrlList, normalizePsdImageIndexes, validatePsdImageIndexes, normalizeVendorProductMappings } from './shared'

export const doudianHandler: PlatformHandler = {
  platform: 'doudian',

  validateConfig(configData) {
    const errors: string[] = []
    const copyId = typeof configData?.copyId === 'string' ? configData.copyId.trim() : ''
    const rawValue = configData?.appendImageUrls
    const vendorId = configData?.vendorId

    if (copyId && !/^\d+$/.test(copyId)) {
      errors.push('复制模板 ID 必须是数字')
    }

    if (vendorId !== undefined && vendorId !== null && vendorId !== '' && !Number.isFinite(Number(vendorId))) {
      errors.push('绑定厂家无效')
    }

    if (!validatePsdImageIndexes(configData?.psdImageIndexes)) {
      errors.push('套图图片序号格式不正确，请填写 1、1,3 或 2-5')
    }

    if (typeof rawValue === 'string' && rawValue.trim()) {
      const lines = rawValue
        .split(/\r?\n/)
        .map((item) => item.trim())
        .filter(Boolean)

      const invalidLines = lines.filter(
        (item) => !item.split('|').every((s) => /^https?:\/\//i.test(s.trim())),
      )
      if (invalidLines.length > 0) {
        errors.push('附加图片只支持 http/https URL，多个用 | 分隔随机')
      }
    } else if (Array.isArray(rawValue)) {
      const invalidItems = rawValue
        .map((item) => String(item || '').trim())
        .filter(Boolean)
        .filter(
          (item) => !item.split('|').every((s) => /^https?:\/\//i.test(s.trim())),
        )

      if (invalidItems.length > 0) {
        errors.push('附加图片只支持 http/https URL，多个用 | 分隔随机')
      }
    }

    return {
      valid: errors.length === 0,
      errors
    }
  },

  formatConfigForSubmit(configData) {
    const formatted = { ...configData }

    if (formatted.copyId !== undefined && formatted.copyId !== null) {
      formatted.copyId = String(formatted.copyId).trim()
    }
    if (formatted.vendorId !== undefined && formatted.vendorId !== null && formatted.vendorId !== '') {
      formatted.vendorId = Number(formatted.vendorId)
    } else {
      formatted.vendorId = undefined
    }
    if (formatted.price !== undefined && formatted.price !== null && formatted.price !== '') {
      formatted.price = Number(formatted.price)
    }
    if (formatted.stock !== undefined && formatted.stock !== null && formatted.stock !== '') {
      formatted.stock = Number(formatted.stock)
    }
    formatted.appendImageUrls = normalizeHttpUrlList(formatted.appendImageUrls)
    formatted.psdImageIndexes = normalizePsdImageIndexes(formatted.psdImageIndexes) || undefined
    formatted.vendorCode = String(formatted.vendorCode || '').trim() || undefined
    formatted.vendorName = String(formatted.vendorName || '').trim() || undefined
    formatted.vendorProductMappings = normalizeVendorProductMappings(formatted.vendorProductMappings)

    return formatted
  },

  formatConfigForEdit(configData) {
    const formatted = { ...configData }
    if (formatted.copyId !== undefined && formatted.copyId !== null) {
      formatted.copyId = String(formatted.copyId).trim()
    }
    if (formatted.vendorId !== undefined && formatted.vendorId !== null && formatted.vendorId !== '') {
      formatted.vendorId = Number(formatted.vendorId)
    }
    formatted.appendImageUrls = normalizeHttpUrlList(formatted.appendImageUrls)
    formatted.psdImageIndexes = normalizePsdImageIndexes(formatted.psdImageIndexes)
    return formatted
  },

  getHints() {
    return [
      '支持配置抖店模板 copyId，发布端会优先进入 create?copyid=... 页面',
      '支持绑定厂家，生成 productCode 时会按“素材码-厂家码”拼接',
      '当前先支持标题、描述、图片和少量可选参数透传',
      '支持按序号选择套图图片，例如 1、1,3 或 2-5；留空默认使用全部套图图片',
      '支持附加图片，会在生成发布任务时追加到商品图片后面',
      '类目、SKU、物流模板等详细字段后续再补充'
    ]
  }
}
