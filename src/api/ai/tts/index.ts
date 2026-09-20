import request from '@/config/axios'

export interface TtsRecordPageParams {
  page: number
  pageSize: number
  search?: string
}

export interface CreateTtsRecordDto {
  text: string
  prompt?: string
  voice?: string
  model?: string
  format?: string
  instructions?: string
  sample_rate?: number
  speed?: number
  pitch?: number
  providerParams?: Record<string, any>
  /** 指定使用的 Provider 规范，用于后端选择对应的 AI Key */
  specCode?: string
  /** 直接指定使用的 AI Key ID（可选） */
  keyId?: number
}

export interface TtsParameterSchema {
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

export interface TtsModelOption {
  modelId: string
  label: string
  labelKey?: string
  description?: string
  capabilities: Array<'instructions' | 'voice-clone' | 'subtitle' | 'streaming'>
}

export interface TtsVoiceOption {
  voiceId: string
  name: string
  nameKey?: string
  gender?: 'male' | 'female' | 'neutral'
  language?: string
  description?: string
  previewUrl?: string
}

export interface TtsProviderSpec {
  code: string
  label: string
  labelKey?: string
  category: string
  description: string
  capabilities: string[]
  defaultBaseUrl?: string
  defaultModel?: string
  tts?: {
    models: TtsModelOption[]
    voices?: TtsVoiceOption[]
    supportsVoiceList?: boolean
    supportsVoiceClone?: boolean
    formats?: string[]
    defaultFormat?: string
    parameterSchemas: {
      default: TtsParameterSchema[]
      instructions?: TtsParameterSchema[]
      voiceClone?: TtsParameterSchema[]
    }
  }
}

export interface CreateCustomVoiceDto {
  /** Provider 规范代码：qwen.tts 或 mimo.tts */
  specCode?: string
  audioBase64?: string
  audioUrl?: string
  targetModel: string
  preferredName?: string
  audioMimeType?: string
}

export interface ListCustomVoicesDto {
  /** Provider 规范代码：qwen.tts 或 mimo.tts */
  specCode?: string
  pageIndex?: number
  pageSize?: number
}

export interface CustomVoiceItem {
  voice: string
  gmt_create: string
  gmt_modified: string
  language: string
  target_model: string
  preferred_name?: string
}

export const generateTts = (data: {
  text: string
  voice?: string
  model?: string
  format?: string
  instructions?: string
}) => {
  return request.post({
    url: '/ai/tts',
    data
  })
}

export const getTtsRecordPage = (data: TtsRecordPageParams) => {
  return request.post({
    url: '/ai/tts-record/page',
    data
  })
}

export const createTtsRecord = (data: CreateTtsRecordDto) => {
  return request.post({
    url: '/ai/tts-record',
    data
  })
}

export const updateTtsRecord = (id: string, data: any) => {
  return request.post({
    url: `/ai/tts-record/${id}`,
    method: 'patch',
    data
  })
}

export const deleteTtsRecord = (id: string) => {
  return request.delete({
    url: `/ai/tts-record/${id}`
  })
}

export const batchDeleteTtsRecord = (ids: string[]) => {
  return request.post({
    url: '/ai/tts-record/batch-delete',
    data: { ids }
  })
}

export const getTtsRecordById = (id: string) => {
  return request.get({
    url: `/ai/tts-record/${id}`
  })
}

/**
 * 创建自定义音色 — 按 Provider 路由到独立接口
 * @param specCode Provider 规范代码：qwen.tts 或 mimo.tts
 * @param data 音色数据
 */
export const createCustomVoice = (specCode: string, data: CreateCustomVoiceDto) => {
  const provider = specCode === 'mimo.tts' ? 'mimo' : 'qwen'
  return request.post({
    url: `/ai/tts/${provider}/custom-voice`,
    data
  })
}

/**
 * 查询自定义音色列表 — 按 Provider 路由到独立接口
 * @param specCode Provider 规范代码：qwen.tts 或 mimo.tts
 * @param data 分页参数
 */
export const listCustomVoices = (specCode: string, data: Omit<ListCustomVoicesDto, 'specCode'> = {}) => {
  const provider = specCode === 'mimo.tts' ? 'mimo' : 'qwen'
  return request.post({
    url: `/ai/tts/${provider}/custom-voice/list`,
    data
  })
}

/**
 * 删除自定义音色 — 按 Provider 路由到独立接口
 * @param specCode Provider 规范代码：qwen.tts 或 mimo.tts
 * @param voice 音色 ID
 */
export const deleteCustomVoice = (specCode: string, voice: string) => {
  const provider = specCode === 'mimo.tts' ? 'mimo' : 'qwen'
  return request.delete({
    url: `/ai/tts/${provider}/custom-voice/${voice}`
  })
}

export const getTtsProviderSpecs = () => {
  return request.get<TtsProviderSpec[]>({
    url: '/ai/tts/provider-specs'
  })
}

export const getTtsVoices = (specCode: string) => {
  return request.get<TtsVoiceOption[]>({
    url: '/ai/tts/voices',
    params: { specCode }
  })
}
