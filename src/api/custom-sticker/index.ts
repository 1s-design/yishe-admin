import request from '@/config/axios'

export interface CustomSticker {
  id: string
  url: string
  name?: string | null
  description?: string | null
  keywords?: string | null
  suffix?: string | null
  userId?: number | null
  user?: {
    id: number
    account?: string
    name?: string
    phone?: string
  } | null
  width?: number | null
  height?: number | null
  aspectRatio?: number | null
  /** 文件体积（字节），与素材库 fileSize 对应 */
  fileSize?: number | null
  /** 是否抠图（透明背景），与素材库 isCutout 对应 */
  isCutout?: boolean | null
  folderId?: string | null
  folder?: string | null
  imported?: boolean
  importedStickerId?: string | null
  importedSticker?: {
    id: string
    code?: string | null
    name?: string | null
    url?: string | null
  } | null
  isShared?: boolean
  sharedBy?: number | null
  sharedTime?: string | null
  resourceLibraryId?: string | null
  sourceCustomStickerId?: string | null
  sourceUserId?: number | null
  shareType?: 'shared' | 'copy' | null
  /** 是否被管理员标记为模板 */
  isTemplate?: boolean
  meta?: Record<string, any> | null
  createTime?: string
  updateTime?: string
}

export interface CustomStickerPageParams {
  page?: number
  pageSize?: number
  folderId?: string | null
  searchText?: string
  shareState?: string
  importState?: string
  /** 模板筛选：template 仅模板 / not-template 非模板 */
  templateState?: string
  /** 排序方式：latest 最近（默认）/ earliest 最早 / random 随机（同 seed 分页稳定） */
  sort?: 'latest' | 'earliest' | 'random'
  /** 随机排序种子，同一次随机审核内保持不变 */
  seed?: number
}

export interface CustomStickerPageResult {
  items: CustomSticker[]
  total: number
  currentPage: number
  pageSize: number
}

export type CustomStickerTransferAction = 'share' | 'copy' | 'move'

export interface CustomStickerTransferResult {
  list: any[]
  total: number
  failed: Array<{ id: string; message: string }>
}

export const CustomStickerApi = {
  getAdminPage: (params: CustomStickerPageParams) =>
    request.get<CustomStickerPageResult>({ url: '/custom-sticker/admin/all', params }),

  batchMove: (data: { ids: string[]; folderId: string | null }) =>
    request.post<{ success: boolean; movedCount: number }>({ url: '/custom-sticker/batch-move', data }),

  batchMarkTemplate: (data: { ids: string[]; isTemplate?: boolean }) =>
    request.post<{ success: boolean; updatedCount: number; isTemplate: boolean }>({
      url: '/custom-sticker/batch-mark-template',
      data,
    }),

  publishToResourceCenter: (data: { customStickerId: string; category?: string; description?: string }) =>
    request.post({ url: '/custom-sticker/share-to-resource-center', data }),

  transferToUser: (data: { ids: string[]; targetUserId: string; action?: CustomStickerTransferAction }) =>
    request.post<CustomStickerTransferResult>({ url: '/custom-sticker/transfer-to-user', data }),

  shareToUser: (data: { ids: string[]; targetUserId: string }) =>
    request.post<CustomStickerTransferResult>({ url: '/custom-sticker/transfer-to-user', data: { ...data, action: 'share' } }),

  copyToUser: (data: { ids: string[]; targetUserId: string }) =>
    request.post<CustomStickerTransferResult>({ url: '/custom-sticker/transfer-to-user', data: { ...data, action: 'copy' } }),

  moveToUser: (data: { ids: string[]; targetUserId: string }) =>
    request.post<CustomStickerTransferResult>({ url: '/custom-sticker/transfer-to-user', data: { ...data, action: 'move' } }),

  copyToStickerLibrary: (data: { customStickerId: string; folderId?: string | null }) =>
    request.post<{
      id: string
      code?: string | null
      name?: string | null
      url?: string | null
      [key: string]: any
    }>({ url: '/custom-sticker/import-to-sticker', data }),

  batchCopyToStickerLibrary: (data: { ids: string[]; folderId?: string | null }) =>
    request.post<CustomStickerTransferResult>({ url: '/custom-sticker/batch-import-to-sticker', data }),

  getDetail: (id: string) =>
    request.get<CustomSticker>({ url: `/custom-sticker/${id}` }),

  delete: (id: string) =>
    request.delete({ url: `/custom-sticker/${id}` }),

  batchDelete: (data: { ids: string[] }) =>
    request.post<{ success: boolean; deletedCount: number; requestedCount?: number }>({
      url: '/custom-sticker/batch-delete',
      data
    }),

  triggerRework: (data: { sourceStickerId: string; inspirationId?: string; feedbackPrompt: string; priority?: number }) =>
    request.post<{ success: boolean; jobId: string; message: string }>({ url: '/design-job/rework', data }),
}
