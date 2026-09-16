import request from "@/config/axios";

export interface MindElixirNode {
  topic: string
  id: string
  children?: MindElixirNode[]
  style?: {
    color?: string
    background?: string
    fontSize?: number
    fontWeight?: string
  }
  expanded?: boolean
  note?: string
  icons?: string[]
  tags?: string[]
}

export interface MindElixirData {
  nodeData: MindElixirNode
  linkData?: Record<string, any>
}

export interface MindMapItem {
  id: string
  name: string
  description?: string
  data: MindElixirData
  userId: number
  sourceUserId?: number | null
  sourceUser?: {
    id: number
    name?: string
    account?: string
  }
  shareType?: string
  createTime: string
  updateTime: string
}

export interface MindMapPageParams {
  currentPage?: number
  pageSize?: number
  name?: string
}

// 创建思维导图
export const createMindMapApi = (data: { name: string; description?: string }) =>
  request.post({ url: "/mind-map/create", data })

// 分页查询思维导图列表
export const getMindMapPageApi = (data: MindMapPageParams) =>
  request.post({ url: "/mind-map/page", data })

// 获取思维导图详情
export const getMindMapDetailApi = (id: string) => request.get({ url: `/mind-map/${id}` })

// 更新思维导图
export const updateMindMapApi = (data: {
  id: string
  name?: string
  description?: string
  data?: MindElixirData
}) => request.post({ url: "/mind-map/update", data })

// 删除思维导图
export const deleteMindMapApi = (ids: string | string[]) =>
  request.post({ url: "/mind-map/delete", data: { ids } })

// 分享思维导图给用户
export const shareMindMapApi = (data: { ids: string[]; targetUserId: number; shareType?: string }) =>
  request.post({ url: "/mind-map/share", data })
