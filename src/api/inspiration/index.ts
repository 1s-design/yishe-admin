import request from '@/config/axios'

/** 图片采集灵感（纯文字录入，不含采集执行 / 图片文件 / Agent / AI 分析） */
export interface Inspiration {
  id?: string | number
  userId?: string | number | null
  name: string
  /** 后端保留字段，前端不录入（默认 mixed） */
  inputType?: string
  content?: string | null
  /** 后端预留给未来 Agent / MCP 只读消费，前端不录入 */
  config?: Record<string, any> | null
  remark?: string | null
  createdAt?: string
  updatedAt?: string
}

export interface InspirationPageParams {
  currentPage?: number
  pageSize?: number
  keyword?: string
  inputType?: string
  userId?: string | number
}

export interface InspirationPageResult {
  list: Inspiration[]
  total: number
  currentPage: number
  pageSize: number
  totalPage: number
}

export const createInspiration = (data: Inspiration) =>
  request.post({ url: '/inspiration/create', data })

export const updateInspiration = (data: Inspiration) =>
  request.post({ url: '/inspiration/update', data })

export const deleteInspiration = (ids: string | number | Array<string | number>) =>
  request.post({
    url: '/inspiration/delete',
    data: { ids: Array.isArray(ids) ? ids : [ids] }
  })

export const getInspirationPage = (data: InspirationPageParams) =>
  request.post<InspirationPageResult>({ url: '/inspiration/page', data })

export const getInspirationDetail = (id: string | number) =>
  request.get<Inspiration>({ url: `/inspiration/${id}` })
