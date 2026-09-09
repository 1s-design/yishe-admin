import request from "@/config/axios";

export type PublishConfig = {
  id: string;
  name: string;
  taskType?: string;
  platform: string;
  configData: any;
  description: string;
  isActive: boolean;
  createTime: string;
  updateTime: string;
};

export const getPublishConfigListApi = () => {
  return request.get({ url: "/publish-config" });
};

export type PublishConfigPageParams = {
  pageNo?: number;
  pageSize?: number;
  searchKeyword?: string;
  taskType?: string;
  platform?: string;
  isActive?: boolean;
  onlyUsable?: boolean;
};

export const getPublishConfigPageApi = (params: PublishConfigPageParams = {}) => {
  return request.get({ url: "/publish-config/page", params });
};

export const getPublishConfigApi = (id: string) => {
  return request.get({ url: "/publish-config/" + id });
};

export const createPublishConfigApi = (data: any) => {
  return request.post({ url: "/publish-config", data, ownership: "skip" });
};

export const updatePublishConfigApi = (id: string, data: any) => {
  return request.patch({ url: "/publish-config/" + id, data, ownership: "skip" });
};

export const deletePublishConfigApi = (id: string) => {
  return request.delete({ url: "/publish-config/" + id });
};

// 创建发布任务（服务端自动生成标题并写入任务数据）
export const createPublishTaskApi = (data: {
  psdSetId: string;
  taskType?: string;
  platform?: string;
  publishConfigId: string;
  publishOptions?: any;
  description?: string;
  metadata?: Record<string, any>;
}) => {
  return request.post({
    url: "/publish-config/create-publish-task",
    data,
    ownership: "skip",
  });
};

export const regeneratePublishTaskApi = (taskId: string) => {
  return request.post({
    url: "/publish-config/regenerate-publish-task",
    data: { taskId },
    ownership: "skip",
  });
};

export const regeneratePublishTasksBatchApi = (taskIds: string[]) => {
  return request.post<{
    success: boolean;
    data: {
      total: number;
      updated: number;
      skipped: Array<{ id: string; reason: string }>;
      items: Array<{
        id: string;
        success: boolean;
        asyncRegenerate?: boolean;
        status?: string;
        reason?: string;
      }>;
    };
  }>({
    url: "/publish-config/regenerate-publish-tasks/batch",
    data: { taskIds },
    ownership: "skip",
  });
};
