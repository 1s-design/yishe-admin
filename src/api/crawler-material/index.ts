/*
 * @Author: chan-max jackieontheway666@gmail.com
 * @Date: 2025-01-20 10:00:00
 * @LastEditors: chan-max jackieontheway666@gmail.com
 * @LastEditTime: 2025-07-19 07:38:07
 * @FilePath: /yishe-admin/src/api/crawler-material/index.ts
 * @Description: 爬图素材模块 API
 */
import request from '@/config/axios'

// 爬图素材 VO
export interface CrawlerMaterialVO {
  id: string
  url: string
  originUrl?: string
  key: string
  keywords: string
  name: string
  description: string
  suffix: string
  userId?: string
  meta: any
  createTime: Date
  updateTime: Date
  isOwnResource?: boolean
}

export interface CrawlerMaterialImportTaskResponse {
  accepted: boolean
  taskId: string
  total: number
  message: string
  status: 'pending' | 'running'
}

// 爬图素材 API
export const CrawlerMaterialApi = {
  // 新增素材入库
  addCrawlerMaterial: async (data: {
    url: string
    originUrl?: string
    name?: string
    keywords?: string
    description?: string
    source?: string
    suffix?: string
    meta?: any
  }) => {
    return await request.post({ url: `/crawler/material/add`, data })
  },

  // 分页获取爬图素材
  getCrawlerMaterialPage: async (data: any) => {
    return await request.post({ url: `/crawler/material/page`, data })
  },

  // 获取单个素材
  getCrawlerMaterial: async (params: any) => {
    return await request.get({ url: `/crawler/material`, params })
  },

  // 更新素材
  updateCrawlerMaterial: async (data: any) => {
    return await request.post({ url: `/crawler/material/update`, data })
  },

  // 删除素材
  deleteCrawlerMaterial: async (data: any) => {
    return await request.post({ url: `/crawler/material/delete`, data })
  },

  // 批量入库到贴纸
  batchImportToSticker: async (data: { ids: string[], userId?: string }) => {
    return await request.post<CrawlerMaterialImportTaskResponse>({ url: `/crawler/material/import-to-sticker`, data })
  },

  // 从 COS URL 批量导入（媒体采集客户端上传 COS 后调用）
  importFromCos: async (items: any[]) => {
    return await request.post({ url: `/crawler/material/import-from-cos`, data: { items } })
  },

  // 单个素材从 COS 导入
  addFromCos: async (data: {
    url: string
    name?: string
    description?: string
    source?: string
    suffix?: string
    meta?: any
  }) => {
    return await request.post({ url: `/crawler/material/import-from-cos`, data: { items: [data] } })
  }
}
