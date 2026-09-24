/**
 * 媒体采集 API
 *
 * 与 data-collect 标准链路保持一致：后台向指定在线客户端发送 service-command，
 * 并通过 WebSocket 等待执行结果。搜索、下载、上传全部在所选客户端执行。
 */

import { sendServiceCommand } from '@/api/system/websocket'
import { websocketClient } from '@/services/websocketClient'

/** 媒体资源 */
export interface MediaAsset {
  id: string
  source: string
  title: string
  description?: string
  mediaType: 'image' | 'video' | 'audio'
  mimeType?: string
  thumbnailUrl?: string
  previewUrl?: string
  fileUrl?: string
  fileSize?: number
  width?: number
  height?: number
  duration?: number
  license?: string
  creator?: string
  tags?: string[]
  rawMeta?: Record<string, any>
}

/** 搜索结果 */
export interface MediaSearchResult {
  total: number
  page: number
  pageSize: number
  items: MediaAsset[]
  hasMore?: boolean
}

interface CommandResponse {
  success: boolean
  message: string
  data?: {
    commandId?: string
  }
}

async function sendCommandAndWait(
  clientId: string,
  action: 'search' | 'import' | 'refreshRuntime',
  payload: Record<string, any>,
  timeoutMs = 120000,
) {
  const response = await sendServiceCommand({
    target: { clientId, pluginKey: 'media-collect' },
    command: { name: action, payload },
    mode: 'production',
  }) as CommandResponse

  const commandId = response?.data?.commandId
  if (!response?.success || !commandId) {
    throw new Error(response?.message || '媒体采集命令发送失败')
  }

  const result = await websocketClient.waitForServiceCommandResult(commandId, timeoutMs)
  if (!result?.success) {
    throw new Error(result?.message || '媒体采集命令执行失败')
  }
  return result.data
}

/** 刷新指定客户端的媒体采集服务状态 */
export async function refreshRuntime(clientId: string, source: string) {
  return await sendCommandAndWait(clientId, 'refreshRuntime', { source }, 30000)
}

/** 在指定客户端搜索媒体资源 */
export async function searchMediaCollect(
  clientId: string,
  params: {
    source: string
    query: string
    mediaType?: string
    page?: number
    pageSize?: number
  },
): Promise<MediaSearchResult> {
  const data = await sendCommandAndWait(clientId, 'search', params)
  return data || {}
}

/** 在指定客户端导入媒体（下载 -> COS -> 后端记录） */
export async function importMediaCollect(
  clientId: string,
  items: Partial<MediaAsset>[],
) {
  return await sendCommandAndWait(clientId, 'import', { items }, 300000)
}
