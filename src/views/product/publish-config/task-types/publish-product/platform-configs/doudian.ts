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
      key: 'stock',
      label: '库存',
      type: 'number',
      placeholder: '请输入库存',
      span: 24,
      tooltip: '发布端会将库存填入每个 SKU 行（SKU 配置为空时使用）'
    },
    {
      key: 'skuConfig',
      label: 'SKU 配置',
      type: 'sku-list',
      span: 24,
      tooltip: '按 SKU 顺序配置库存、价格和商家编码，留空则跳过'
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
      tooltip: '每个位置可填多个 URL 用 | 分隔，发布时随机选 1 张（抖店主图最多支持 5 张）'
    }
  ]
}
