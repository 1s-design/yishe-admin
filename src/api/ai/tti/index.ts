import request from '@/config/axios'

export interface TtiRecordPageParams {
  page: number
  pageSize: number
  search?: string
}

export interface TtiParameterSchema {
  key: string
  label: string
  labelKey?: string
  type: 'select' | 'slider' | 'text' | 'textarea' | 'boolean'
  defaultValue: unknown
  options?: Array<{ label: string; labelKey?: string; value: unknown }>
  min?: number
  max?: number
  step?: number
  placeholder?: string
  description?: string
  descriptionKey?: string
  visibleWhen?: { param: string; equals: unknown }
}

export interface TtiModelOption {
  modelId: string
  label: string
  labelKey?: string
  description?: string
  capabilities?: Array<'negative-prompt' | 'seed' | 'async-task'>
}

export interface TtiProviderSpec {
  code: string
  label: string
  labelKey?: string
  category: string
  description: string
  capabilities: string[]
  defaultBaseUrl?: string
  defaultModel?: string
  tti?: {
    models: TtiModelOption[]
    parameterSchemas: {
      default: TtiParameterSchema[]
    }
  }
}

export interface CreateTtiRecordDto {
  prompt: string
  negativePrompt?: string
  model?: string
  size?: string
  n?: number
  style?: string
  specCode?: string
  providerParams?: Record<string, any>
  keyId?: number
}

export const getTtiProviderSpecs = () => {
  return request.get<TtiProviderSpec[]>({
    url: '/ai/tti/provider-specs'
  })
}

export const getTtiRecordPage = (data: TtiRecordPageParams) => {
  return request.post({
    url: '/ai/tti-record/page',
    data
  })
}

export const createTtiRecord = (data: CreateTtiRecordDto) => {
  return request.post({
    url: '/ai/tti-record',
    data
  })
}

export const deleteTtiRecord = (id: string) => {
  return request.delete({
    url: `/ai/tti-record/${id}`
  })
}

export const batchDeleteTtiRecord = (ids: string[]) => {
  return request.post({
    url: '/ai/tti-record/batch-delete',
    data: { ids }
  })
}

export const getTtiRecordById = (id: string) => {
  return request.get({
    url: `/ai/tti-record/${id}`
  })
}
