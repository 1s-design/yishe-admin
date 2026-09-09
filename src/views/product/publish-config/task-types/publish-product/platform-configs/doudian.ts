import type { PlatformConfig } from './types'

export const doudianPlatformConfig: PlatformConfig = {
  platform: 'doudian',
  label: '抖店',
  description: '抖店平台配置',
  supportVideo: true,
  supportImage: true,
  titleMaxLength: 60,
  fields: [
    {
      key: 'copyId',
      label: '复制模板 ID',
      type: 'input',
      placeholder: '请输入抖店 create?copyid=... 中的 copyid',
      span: 24,
      tooltip: '发布端会基于这个 copyId 打开抖店模板创建页'
    },
    {
      key: 'vendorId',
      label: '绑定厂家',
      type: 'select',
      placeholder: '请选择厂家',
      span: 24
    },
    {
      key: 'vendorProducts',
      label: '供应商商品',
      type: 'vendor-products',
      span: 24,
      tooltip: '选择厂家后可选商品。编码规则：有商品时"素材码-商品码"，无商品时"素材码"。'
    },
    {
      key: 'stock',
      label: '库存',
      type: 'number',
      placeholder: '请输入库存',
      span: 24,
      tooltip: '发布端会将库存填入每个 SKU 行'
    },
    {
      key: 'psdImageIndexes',
      label: '套图图片序号',
      type: 'input',
      placeholder: '留空使用全部，例如：1 或 1,3 或 2-5',
      span: 24,
      tooltip: '按套图成品图片顺序选择要发布的图片，序号从 1 开始'
    },
    {
      key: 'appendImageUrls',
      label: '附加图片',
      type: 'url-list',
      placeholder: '请输入 http/https 图片 URL',
      defaultValue: [],
      span: 24,
      tooltip: '适合材质图、说明图等固定复用图片（抖店主图最多支持 5 张）'
    }
  ]
}
