import request from "@/config/axios";

export type HotTitleSource = "manual" | "doudian_collect" | "self_hit" | string;

export type HotTitleItem = {
  id: string;
  userId?: string | null;
  title: string;
  platform: string;
  category?: string | null;
  styleTags?: string | null;
  keywords?: string | null;
  source: HotTitleSource;
  sourceUrl?: string | null;
  heatScore: number;
  salesCount: number;
  usageCount: number;
  remark?: string | null;
  isActive: boolean;
  createTime: string;
  updateTime: string;
};

export type HotTitlePageParams = {
  pageNo?: number;
  pageSize?: number;
  keyword?: string;
  platform?: string;
  category?: string;
  source?: string;
  isActive?: boolean;
};

export type CreateHotTitlePayload = {
  title: string;
  platform?: string;
  category?: string;
  styleTags?: string;
  keywords?: string;
  source?: HotTitleSource;
  sourceUrl?: string;
  heatScore?: number;
  salesCount?: number;
  remark?: string;
  isActive?: boolean;
};

export type UpdateHotTitlePayload = Partial<CreateHotTitlePayload>;

export const getHotTitlePageApi = (params: HotTitlePageParams = {}) => {
  return request.get<{
    list: HotTitleItem[];
    total: number;
    pageNo: number;
    pageSize: number;
  }>({
    url: "/hot-title/page",
    params,
  });
};

export const getHotTitleApi = (id: string) => {
  return request.get<HotTitleItem>({
    url: `/hot-title/${id}`,
  });
};

export const createHotTitleApi = (data: CreateHotTitlePayload) => {
  return request.post<HotTitleItem>({
    url: "/hot-title",
    data,
    ownership: "skip",
  });
};

export const batchCreateHotTitleApi = (items: CreateHotTitlePayload[]) => {
  return request.post<{
    created: number;
    skipped: number;
    total: number;
    items: HotTitleItem[];
  }>({
    url: "/hot-title/batch",
    data: { items },
    ownership: "skip",
  });
};

export const updateHotTitleApi = (id: string, data: UpdateHotTitlePayload) => {
  return request.patch<HotTitleItem>({
    url: `/hot-title/${id}`,
    data,
    ownership: "skip",
  });
};

export const deleteHotTitleApi = (id: string) => {
  return request.delete({
    url: `/hot-title/${id}`,
  });
};

export const batchDeleteHotTitleApi = (ids: string[]) => {
  return request.post<{ deleted: number }>({
    url: "/hot-title/delete",
    data: { ids },
    ownership: "skip",
  });
};
