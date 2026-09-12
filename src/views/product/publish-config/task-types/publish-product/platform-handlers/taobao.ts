import type { PlatformHandler } from './types'
import { normalizeHttpUrlList, normalizePsdImageIndexes, validatePsdImageIndexes, normalizeVendorProductMappings } from './shared'

export const taobaoHandler: PlatformHandler = {
  platform: 'taobao',

  validateConfig(configData) {
    const errors: string[] = []
    const itemId = typeof configData?.itemId === 'string' ? configData.itemId.trim() : ''
    const rawValue = configData?.appendImageUrls
    const vendorId = configData?.vendorId

    if (!itemId) {
      errors.push('请填写复制商品 itemId')
    } else if (!/^\d+$/.test(itemId)) {
      errors.push('复制商品 itemId 必须是数字')
    }

    if (vendorId !== undefined && vendorId !== null && vendorId !== '' && !Number.isFinite(Number(vendorId))) {
      errors.push('绑定厂家无效')
    }

    if (!validatePsdImageIndexes(configData?.psdImageIndexes)) {
      errors.push('套图图片序号格式不正确，请填写 1、1,3 或 2-5')
    }

    if (typeof rawValue === 'string' && rawValue.trim()) {
      const invalidLines = rawValue
        .split(/\r?\n/)
        .map((item) => item.trim())
        .filter(Boolean)
        .filter(
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

    if (formatted.itemId !== undefined && formatted.itemId !== null) {
      formatted.itemId = String(formatted.itemId).trim()
    }
    delete formatted.productCode
    if (formatted.vendorId !== undefined && formatted.vendorId !== null && formatted.vendorId !== '') {
      formatted.vendorId = Number(formatted.vendorId)
    } else {
      formatted.vendorId = undefined
    }
    formatted.copyItem = true
    formatted.fromAIPublish = true
    formatted.appendImageUrls = normalizeHttpUrlList(formatted.appendImageUrls)
    formatted.psdImageIndexes = normalizePsdImageIndexes(formatted.psdImageIndexes) || undefined
    formatted.vendorCode = String(formatted.vendorCode || '').trim() || undefined
    formatted.vendorName = String(formatted.vendorName || '').trim() || undefined
    formatted.vendorProductMappings = normalizeVendorProductMappings(formatted.vendorProductMappings)

    return formatted
  },

  formatConfigForEdit(configData) {
    const formatted = { ...configData }
    if (formatted.itemId !== undefined && formatted.itemId !== null) {
      formatted.itemId = String(formatted.itemId).trim()
    }
    delete formatted.productCode
    if (formatted.vendorId !== undefined && formatted.vendorId !== null && formatted.vendorId !== '') {
      formatted.vendorId = Number(formatted.vendorId)
    }
    formatted.copyItem = true
    formatted.fromAIPublish = true
    formatted.appendImageUrls = normalizeHttpUrlList(formatted.appendImageUrls)
    formatted.psdImageIndexes = normalizePsdImageIndexes(formatted.psdImageIndexes)
    return formatted
  },

  getHints() {
    return [
      '复制商品 itemId 为必填，发布端会进入 publish.htm?copyItem=true&itemId=... 页面',
      '支持绑定厂家，生成 productCode 时会按“素材码-厂家码”拼接',
      '支持固定标题或 AI 标题，并会在任务创建时筛选套图主图',
      '支持按序号选择套图图片，例如 1、1,3 或 2-5；留空默认使用全部套图图片',
      '当前先接入基础打开页面、标题与图片数据透传，具体页面字段后续继续补充'
    ]
  }
}
