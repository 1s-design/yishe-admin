import type { PlatformHandler } from './types'
import {
  normalizeHttpUrlList,
  normalizeIndexList,
  normalizePsdImageIndexes,
  parsePsdImageIndexes,
  validatePositiveIndexList,
  validatePsdImageIndexes,
  normalizeVendorProductMappings
} from './shared'

export const pddHandler: PlatformHandler = {
  platform: 'pdd',

  validateConfig(configData) {
    const errors: string[] = []
    const goodsId = typeof configData?.goodsId === 'string'
      ? configData.goodsId.trim()
      : String(configData?.goodsId ?? configData?.goods_id ?? '').trim()
    const rawValue = configData?.appendImageUrls
    const vendorId = configData?.vendorId

    if (!goodsId) {
      errors.push('请填写拼多多相似商品 goodsId')
    } else if (!/^\d+$/.test(goodsId)) {
      errors.push('拼多多相似商品 goodsId 必须是数字')
    }

    if (vendorId !== undefined && vendorId !== null && vendorId !== '' && !Number.isFinite(Number(vendorId))) {
      errors.push('绑定厂家无效')
    }

    if (!validatePsdImageIndexes(configData?.psdImageIndexes)) {
      errors.push('套图图片序号格式不正确，请填写 1、1,3 或 2-5')
    }
    if (parsePsdImageIndexes(configData?.psdImageIndexes).length > 10) {
      errors.push('拼多多套图图片序号最多选择 10 个')
    }
    if (!validatePositiveIndexList(configData?.skuImageIndexes)) {
      errors.push('SKU 图片序号格式不正确，请填写 2,3,4,5')
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

    const rawGoodsId = formatted.goodsId ?? formatted.goods_id
    if (rawGoodsId !== undefined && rawGoodsId !== null) {
      formatted.goodsId = String(rawGoodsId).trim()
    }
    delete formatted.id
    delete formatted.goods_id
    delete formatted.copyGoodsId
    delete formatted.createUrl
    if (formatted.vendorId !== undefined && formatted.vendorId !== null && formatted.vendorId !== '') {
      formatted.vendorId = Number(formatted.vendorId)
    } else {
      formatted.vendorId = undefined
    }
    if (formatted.stock !== undefined && formatted.stock !== null && formatted.stock !== '') {
      formatted.stock = Number(formatted.stock)
    }
    formatted.appendImageUrls = normalizeHttpUrlList(formatted.appendImageUrls)
    formatted.psdImageIndexes = normalizePsdImageIndexes(formatted.psdImageIndexes) || undefined
    formatted.skuImageIndexes = normalizeIndexList(formatted.skuImageIndexes) || undefined
    formatted.vendorCode = String(formatted.vendorCode || '').trim() || undefined
    formatted.vendorName = String(formatted.vendorName || '').trim() || undefined
    formatted.vendorProductMappings = normalizeVendorProductMappings(formatted.vendorProductMappings)

    return formatted
  },

  formatConfigForEdit(configData) {
    const formatted = { ...configData }
    const rawGoodsId = formatted.goodsId ?? formatted.goods_id
    if (rawGoodsId !== undefined && rawGoodsId !== null) {
      formatted.goodsId = String(rawGoodsId).trim()
    }
    delete formatted.id
    delete formatted.goods_id
    delete formatted.copyGoodsId
    delete formatted.createUrl
    if (formatted.vendorId !== undefined && formatted.vendorId !== null && formatted.vendorId !== '') {
      formatted.vendorId = Number(formatted.vendorId)
    }
    formatted.appendImageUrls = normalizeHttpUrlList(formatted.appendImageUrls)
    formatted.psdImageIndexes = normalizePsdImageIndexes(formatted.psdImageIndexes)
    formatted.skuImageIndexes = normalizeIndexList(formatted.skuImageIndexes)
    return formatted
  },

  getHints() {
    return [
      '拼多多只需填写相似商品 goodsId，发布端会进入商品列表查询后点击发布相似品',
      '支持绑定厂家，生成 productCode 时会按“素材码-厂家码”拼接',
      '支持按序号选择套图图片，例如 1、1,3 或 2-5；留空默认使用全部套图图片，最多 10 张',
      '预留 skuImageIndexes 隐藏字段，例如 2,3,4,5，表示第 1 个 SKU 用第 2 张图，以此类推',
      '支持附加图片，会在生成发布任务时追加到商品图片后面',
      '当前先接入打开相似发布页和数据透传，页面字段会按你后续提供的细节继续补充'
    ]
  }
}
