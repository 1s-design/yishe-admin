import request from "@/config/axios";

export interface ActivePsdSetSummaryItem {
  id: string;
  name?: string | null;
  status?: string | null;
  schedulerStatus?: string | null;
  statusMessage?: string | null;
  currentStep?: string | null;
  progress?: number | null;
  assignedClientId?: string | null;
  assignedMachineCode?: string | null;
  profileId?: string | null;
  updateTime?: string | null;
}

export interface ActivePsdSetSummaryResponse {
  total: number;
  items: ActivePsdSetSummaryItem[];
  fetchedAt?: string | null;
}

export const stickerPsdSetApi = {
  page: (data: any) => request.post({ url: "/sticker-psd-set/page", data }),
  getPublishUsageRecords: (params: { psdSetId?: string; stickerId?: string; imageUrl?: string; publishConfigId?: string }) =>
    request.get({ url: "/pod-publish-image-binding/records", params }),
  getPublishUsageConfigOptions: () =>
    request.get({ url: "/pod-publish-image-binding/publish-config-options" }),
  getActiveSummary: () =>
    request.get<ActivePsdSetSummaryResponse>({ url: "/sticker-psd-set/runtime/active-summary" }),
  create: (data: any) => request.post({ url: "/sticker-psd-set", data }),
  batchCreate: (data: {
    stickerIds: string[];
    psdTemplateIds: string[];
    mergeSticker?: boolean;
    configBindings?: Array<{
      stickerId?: string;
      stickerIds?: string[];
      psdTemplateId: string;
      psdTemplateConfig?: any;
    }>;
    meta?: any;
  }) => request.post({ url: "/sticker-psd-set/batch", data }),
  batchCreateByImageGroup: (data: {
    imageGroupIds: string[];
    psdTemplateIds: string[];
    templateConfigs?: Array<{
      psdTemplateId: string;
      psdTemplateConfig?: any;
    }>;
    meta?: Record<string, any>;
  }) => request.post({ url: "/sticker-psd-set/batch-by-image-group", data }),
  batchCreateByPublishConfig: (data: {
    stickerIds?: string[];
    imageGroupIds?: string[];
    publishConfigIds: string[];
  }) =>
    request.post({ url: "/sticker-psd-set/batch-by-publish-config", data }),
  batchCreateByProductGenerationTemplate: (data: {
    stickerIds?: string[];
    imageGroupIds?: string[];
    productGenerationTemplateIds: string[];
  }) => request.post({ url: "/sticker-psd-set/batch-by-product-generation-template", data }),
  generateProduct: (data: { id: string; productGenerationTemplateId?: string | null; promptId?: number | null }) =>
    request.post({ url: "/sticker-psd-set/generate-product", data }),
  generateProductBatch: (data: { ids: string[]; productGenerationTemplateIds: string[] }) =>
    request.post({ url: "/sticker-psd-set/generate-product-batch", data }),
  getGenerateProductBatchProgress: (taskId: string) =>
    request.get({ url: `/sticker-psd-set/generate-product-batch/${taskId}` }),
  getPublishTasks: (id: string) => request.get({ url: `/sticker-psd-set/publish-tasks/${id}` }),
  update: (id: string, data: any) => request.patch({ url: `/sticker-psd-set/${id}`, data }),
  updateStatus: (id: string, data: { status: string; statusMessage?: string }) =>
    request.post({ url: `/sticker-psd-set/${id}/status`, data, ownership: "skip" }),
  dispatch: (id: string, data?: { clientId?: string }) =>
    request.post({ url: `/sticker-psd-set/${id}/dispatch`, data, ownership: "skip" }),
  retry: (id: string, data?: { clientId?: string }) =>
    request.post({ url: `/sticker-psd-set/${id}/retry`, data, ownership: "skip" }),
  remove: (id: string) => request.delete({ url: `/sticker-psd-set/${id}` }),
  removeBatch: (ids: string[]) =>
    request.post({ url: `/sticker-psd-set/delete-batch`, data: { ids } }),
  // 根据ID查询贴纸详情
  getStickerById: (id: string) => request.get({ url: `/sticker/${id}` }),
  // 根据ID查询PSD模板详情
  getPsdTemplateById: (id: string) => request.get({ url: `/psd-template/${id}` }),
};
