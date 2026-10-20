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
  fileSize?: number | null
  isCutout?: boolean
  width?: number | null
  height?: number | null
  aspectRatio?: number | null
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

// ── 资源统计（通用结构，其它模块可复用）────────────────────────
export interface ResourceStatsWindow {
  /** 稳定标识：today / d7 / d30 … */
  key: string
  label: string
  count: number
}

export interface ResourceStatsPoint {
  /** YYYY-MM-DD */
  date: string
  count: number
}

export interface ResourceStats {
  total: number
  windows: ResourceStatsWindow[]
  series: ResourceStatsPoint[]
  /** 最近一条记录时间，null 表示暂无数据 */
  latestAt: string | null
}

// 爬图素材 API
export const CrawlerMaterialApi = {
  // 采集统计（总量 / 分档计数 / 按天序列 / 最近采集时间）
  getStats: async (params?: { days?: number }) => {
    return await request.get<ResourceStats>({ url: `/crawler/material/stats`, params })
  },

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
