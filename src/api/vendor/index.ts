import request from '@/config/axios'

export interface CustomAttribute {
  name: string
  value: string
}

export interface VendorContact {
  name: string
  role?: string
  phone?: string
  wechat?: string
  isDefault?: boolean
}

export interface TierPricingItem {
  minQty: number
  maxQty?: number | null
  price: number
}

export interface VendorShopUrl {
  name?: string
  url: string
}

export interface Vendor {
  id?: number
  code?: string
  name: string
  description?: string
  contactName?: string
  contactPhone?: string
  wechat?: string
  shopUrl?: string
  shopUrls?: VendorShopUrl[]
  status?: 'active' | 'evaluating' | 'suspended' | 'blacklisted' | string
  settlementType?: string
  categoryTags?: string[]
  contacts?: VendorContact[]
  customAttributes?: CustomAttribute[]
  address?: string
  images?: string[]
  products?: VendorProductItem[]
  uploader?: {
    id?: number
    account?: string
    name?: string
  }
  createTime?: string
  updateTime?: string
}

export interface VendorProductItem {
  id?: number
  code?: string | null
  vendorId?: number
  name: string
  model?: string
  size?: string
  productSize?: string
  packageSize?: string
  price?: number | null
  images?: string[]
  status?: 'normal' | 'low_stock' | 'out_of_stock' | 'discontinued' | 'sampling' | string
  moq?: number | null
  sampleLeadTime?: number | null
  productionLeadTime?: number | null
  taxIncluded?: boolean
  shippingIncluded?: boolean
  tierPricing?: TierPricingItem[]
  customAttributes?: CustomAttribute[]
  unit?: string
  remark?: string
  vendor?: Vendor
  uploader?: {
    id?: number
    account?: string
    name?: string
  }
  createTime?: string
  updateTime?: string
}

export interface VendorListParams {
  page?: number
  pageSize?: number
  search?: string
  status?: string
  categoryTag?: string
}

export interface VendorProductListParams {
  page?: number
  pageSize?: number
  search?: string
  code?: string
  vendorId?: number
  status?: string
  minPrice?: number
  maxPrice?: number
}

export interface PageResult<T> {
  list: T[]
  total: number
  page: number
  pageSize: number
}

export const getVendorList = (params?: VendorListParams) =>
  request.get<Vendor[] | PageResult<Vendor>>({ url: '/operations/vendor', params })

export const getVendorDetail = (id: number) => request.get<Vendor>({ url: `/operations/vendor/${id}` })

export const createVendor = (data: Vendor) => request.post<Vendor>({ url: '/operations/vendor', data })

export const updateVendor = (id: number, data: Vendor) =>
  request.patch<Vendor>({ url: `/operations/vendor/${id}`, data })

export const deleteVendor = (id: number) => request.delete({ url: `/operations/vendor/${id}` })

export const batchDeleteVendor = (ids: number[]) =>
  request.post({ url: '/operations/vendor/batch-delete', data: { ids } })

export const getVendorProductList = (params?: VendorProductListParams) =>
  request.get<VendorProductItem[] | PageResult<VendorProductItem>>({
    url: '/operations/vendor/products/list',
    params,
  })

export const getVendorProductsByVendor = (vendorId: number) =>
  request.get<VendorProductItem[]>({ url: `/operations/vendor/${vendorId}/products` })

export const createVendorProduct = (data: VendorProductItem) =>
  request.post<VendorProductItem>({ url: '/operations/vendor/products', data })

export const updateVendorProduct = (id: number, data: VendorProductItem) =>
  request.patch<VendorProductItem>({ url: `/operations/vendor/products/${id}`, data })

export const deleteVendorProduct = (id: number) =>
  request.delete({ url: `/operations/vendor/products/${id}` })

export const batchDeleteVendorProduct = (ids: number[]) =>
  request.post({ url: '/operations/vendor/products/batch-delete', data: { ids } })
