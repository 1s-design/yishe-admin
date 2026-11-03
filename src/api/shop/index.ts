import request from '@/config/axios'

/** 店铺绑定的一个执行环境 */
export interface ShopExecutionProfile {
  profileId: string;
  profileName?: string;
  clientId?: string | null;
  machineCode?: string | null;
}

export interface Shop {
  id: number;
  name: string;
  description?: string;
  logo?: string;
  carousel?: string[];
  createTime?: string;
  updateTime?: string;
  /** 所属平台，默认 doudian */
  platform?: string;
  /** 允许执行该店铺任务的浏览器环境（可多个） */
  executionProfiles?: ShopExecutionProfile[];
}

/** 账号下一台设备里的一个浏览器环境 */
export interface ShopExecutionEnvironment {
  clientId: string | null;
  machineCode: string | null;
  clientLabel: string;
  clientOnline: boolean;
  profileId: string;
  profileName: string;
  profileExists: boolean;
  isActiveProfile: boolean;
  instanceRunning: boolean;
  busy: boolean;
  currentTaskId: string | null;
}

export const getShopList = () => {
  return request.get({ url: '/operations/shop' })
}

export const getShopDetail = (id: number) => {
  return request.get({ url: `/operations/shop/${id}` })
}

export const createShop = (data: Partial<Shop>) => {
  return request.post({ url: '/operations/shop', data })
}

export const updateShop = (id: number, data: Partial<Shop>) => {
  return request.patch({ url: `/operations/shop/${id}`, data })
}

export const deleteShop = (id: number) => {
  return request.delete({ url: `/operations/shop/${id}` })
}

export const batchDeleteShop = (ids: number[]) => {
  return request.post({ url: '/operations/shop/batch-delete', data: { ids } })
}

/** 可绑定的执行环境清单（设备 + 浏览器环境） */
export const getShopExecutionEnvironments = (platform = 'doudian') => {
  return request.get<{
    platform: string
    onlineWindowMinutes: number
    clients: any[]
    environments: ShopExecutionEnvironment[]
  }>({ url: '/operations/shop/execution-environments', params: { platform } })
}
