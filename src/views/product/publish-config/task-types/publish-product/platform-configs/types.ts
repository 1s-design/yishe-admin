export interface FieldConfig {
  key: string
  label: string
  type: 'input' | 'textarea' | 'select' | 'switch' | 'number' | 'radio' | 'url-list' | 'vendor-products' | 'sku-list'
  inputType?: 'text' | 'password'
  placeholder?: string
  options?: Array<{ label: string; value: any }>
  defaultValue?: any
  rows?: number
  span?: number
  required?: boolean
  tooltip?: string
  buttonText?: string
}

export interface PlatformConfig {
  platform: string
  label: string
  description: string
  fields: FieldConfig[]
  supportVideo: boolean
  supportImage: boolean
  titleMaxLength?: number
}

export interface TaskTypeConfig extends PlatformConfig {
  taskType: string
  taskKind: 'publish-product'
  platformLabel: string
}
