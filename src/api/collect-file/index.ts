import request from '@/config/axios'

export interface CollectFileItem {
  id: string
  url: string
  originUrl?: string
  name?: string
  description?: string
  keywords?: string
  suffix?: string
  fileType?: string
  source?: string
  fileSize?: number | null
  userId?: number | null
  meta?: Record<string, unknown>
  createTime?: string
  updateTime?: string
}

export const CollectFileApi = {
  /** 分页获取采集文件 */
  page(data: {
    currentPage?: number
    pageSize?: number
    searchText?: string
    fileType?: string
    suffix?: string | string[]
    source?: string
    id?: string
    startTime?: string
    endTime?: string
    sortingFields?: string
  }) {
    return request.post<{ list: CollectFileItem[]; total: number }>({
      url: '/collect-file/page',
      data
    })
  },

  /** 删除采集文件（批量） */
  delete(data: { ids: string | string[] }) {
    return request.post({
      url: '/collect-file/delete',
      data
    })
  },

  /** 获取单个采集文件 */
  detail(id: string) {
    return request.get({ url: `/collect-file/${id}` })
  }
}
