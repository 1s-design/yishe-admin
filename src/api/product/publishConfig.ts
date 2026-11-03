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
  sortField?: "createTime" | "updateTime";
  sortOrder?: "ASC" | "DESC";
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

/**
 * 可供发布配置绑定的店铺列表。
 *
 * 数据源是「店铺管理」里的店铺记录（shop.id），不是客户端会话快照：
 * 发布配置只绑店铺，环境归属由店铺自己维护，两层职责分开。
 */
export type PlatformShopItem = {
  platform: string;
  /** 店铺模块的店铺 ID，绑定时存的就是它 */
  shopId: string;
  shopName: string | null;
  /** 该店铺已绑定、允许执行的环境 */
  profileIds: string[];
  executionProfileIds: string[];
  platformShopId: string | null;
  bound: boolean;
  updatedAt: string | null;
};

export const getDoudianShopsApi = () => {
  return request.get<{ platform: string; total: number; list: PlatformShopItem[] }>({
    url: "/publish-config/doudian-shops",
  });
};

/** @deprecated 执行环境已改由店铺模块维护，发布配置不再需要它 */
export type ExecutionEnvironmentItem = {
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
  currentShopId: string | null;
  currentShopName: string | null;
  sessionStatus: string | null;
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
