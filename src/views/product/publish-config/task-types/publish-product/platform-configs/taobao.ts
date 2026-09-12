import type { PlatformConfig } from './types'

export const taobaoPlatformConfig: PlatformConfig = {
  platform: 'taobao',
  label: '淘宝',
  description: '淘宝商品发布配置',
  supportVideo: false,
  supportImage: true,
  titleMaxLength: 60,
  fields: [
    {
      key: 'itemId',
      label: '复制商品 itemId',
      type: 'input',
      placeholder: '请输入淘宝 publish.htm 链接中的 itemId',
      required: true,
      span: 24,
      tooltip: '会基于这个 itemId 打开淘宝复制发布页'
    },
    {
      key: 'vendorId',
      label: '绑定厂家',
      type: 'select',
      placeholder: '请选择厂家',
      span: 24,
      tooltip: '生成 productCode 时会按”素材码-商品码”拼接'
    },
    {
      key: 'vendorProducts',
      label: '供应商商品',
      type: 'vendor-products',
      span: 24,
      tooltip: '选择厂家后可选商品。编码规则：有商品时”素材码-商品码”，无商品时”素材码”。'
    },
    {
      key: 'psdImageIndexes',
      label: '套图图片序号',
      type: 'input',
      placeholder: '留空使用全部，例如：1, 1,3, 2-5, random(1,3,5)',
      span: 24,
      tooltip: '支持：序号 1、多选 1,3、范围 2-5、随机 random(1,3,5)，逗号组合'
    },
    {
      key: 'appendImageUrls',
      label: '附加图片',
      type: 'url-list',
      placeholder: '请输入 http/https URL，多个用 | 分隔随机（如 urlA|urlB|urlC）',
      defaultValue: [],
      span: 24,
      tooltip: '适合材质图、说明图等固定复用图片'
    }
  ]
}
