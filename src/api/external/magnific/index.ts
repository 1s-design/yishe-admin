/**
 * Magnific 视频素材 接口封装
 * 与 data-collect 标准链路一致：命令经服务端转发到客户端执行
 */
import {
  sendServiceCommand,
  type ServiceCommandDTO,
} from '@/api/system/websocket'
import { websocketClient } from '@/services/websocketClient'

export interface MagnificVideo {
  id: string
  name?: string
  title: string
  description?: string
  mediaType: 'video'
  /** 无水印预览 mp4（免费为 clear，premium 为 watermarked） */
  videoUrl: string
  /** 小尺寸预览 mp4（悬停预览用） */
  previewUrl?: string
  image: string // 封面（大图）
  thumbnail: string // 封面（小图）
  link?: string
  url?: string
  duration?: number | null
  quality?: string | null // 原片规格标记，如 "4K"
  premium?: boolean
  isAIGenerated?: boolean
  itemSubtype?: string | null // footage | motion_graphics
  width?: number | null
  height?: number | null
  aspectRatio?: string | null
  orientation?: string | null
  author?: string
  license?: string
  tags?: string
  isFree?: boolean
}

export interface MagnificSearchResult {
  success: boolean
  query: string
  count: number
  total?: number
  pages?: number
  items: MagnificVideo[]
  links: string[]
  page: number
  nextPage: number | null
  error?: string
}

export interface MagnificServiceStatus {
  key?: string
  pluginKey?: string
  label?: string
  connected?: boolean
  available?: boolean
  status?: 'connected' | 'disconnected' | 'error' | 'unknown'
  state?: 'idle' | 'busy' | 'offline' | 'error'
  busy?: boolean
  message?: string
  version?: string
  endpoint?: string
  lastCheckedAt?: string
  currentTaskId?: string | null
  lastError?: string | null
  supportedCommands?: string[]
  details?: Record<string, any>
}

export interface MagnificCommandResponse {
  success: boolean
  message: string
  data?: {
    commandId?: string
    clientId?: string
    pluginKey?: string
    service?: string
    action?: string
    mode?: string
    payload?: any
  }
}

function sendMagnificCommand(
  clientId: string,
  commandName: string,
  payload?: Record<string, any>,
) {
  const data: ServiceCommandDTO = {
    target: {
      clientId,
      pluginKey: 'magnific',
    },
    command: {
      name: commandName,
      payload: payload || {},
    },
    mode: 'production',
  }

  return sendServiceCommand(data) as Promise<MagnificCommandResponse>
}

function waitForServiceCommandResult(
  commandId: string,
  timeoutMs = 60000,
): Promise<{ success: boolean; message: string; data?: any }> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      websocketClient.events.off('serviceCommandResult', handler)
      reject(new Error(`命令执行超时 (${timeoutMs / 1000}s)`))
    }, timeoutMs)

    const handler = (event: any) => {
      if (event.commandId === commandId) {
        clearTimeout(timer)
        websocketClient.events.off('serviceCommandResult', handler)
        resolve({
          success: event.success,
          message: event.message,
          data: event.data,
        })
      }
    }

    websocketClient.events.on('serviceCommandResult', handler)
  })
}

export function refreshMagnificStatus(clientId: string) {
  return sendMagnificCommand(clientId, 'refreshRuntime')
}

export function searchMagnific(
  clientId: string,
  keyword: string,
  options: {
    page?: number
    limit?: number
    license?: 'free' | 'premium' | 'all'
    order?: 'relevance' | 'recent'
  } = {},
) {
  return sendMagnificCommand(clientId, 'search', {
    keyword,
    query: keyword,
    page: options.page || 1,
    limit: options.limit || 20,
    license: options.license || 'free',
    order: options.order || 'relevance',
  })
}

export function syncMagnificToMaterialLibrary(
  clientId: string,
  data: { videoUrl: string; metadata?: Record<string, any> },
) {
  return sendMagnificCommand(clientId, 'sync', data)
}

export function downloadMagnificVideo(
  clientId: string,
  data: { videoUrl: string; filename?: string },
) {
  return sendMagnificCommand(clientId, 'download', data)
}

export async function searchMagnificAndWait(
  clientId: string,
  keyword: string,
  options: {
    page?: number
    limit?: number
    license?: 'free' | 'premium' | 'all'
    order?: 'relevance' | 'recent'
  } = {},
): Promise<MagnificSearchResult> {
  const response = await searchMagnific(clientId, keyword, options)
  const commandId = response.data?.commandId || (response as any).commandId
  if (!response.success || !commandId) {
    throw new Error(response.message || '搜索命令发送失败')
  }
  const result = await waitForServiceCommandResult(commandId, 60000)
  if (!result.success) {
    throw new Error(result.message || '搜索失败')
  }
  const realData = (result.data && result.data.data ? result.data.data : result.data) || {}
  return realData as MagnificSearchResult
}

export async function syncMagnificToMaterialLibraryAndWait(
  clientId: string,
  data: { videoUrl: string; metadata?: Record<string, any> },
): Promise<{ success: boolean; message: string; data?: any }> {
  const response = await syncMagnificToMaterialLibrary(clientId, data)
  const commandId = response.data?.commandId || (response as any).commandId
  if (!response.success || !commandId) {
    throw new Error(response.message || '同步命令发送失败')
  }
  // 视频下载+上传耗时较长，放宽到 5 分钟
  return waitForServiceCommandResult(commandId, 300000)
}
