import request from "@/config/axios";

export interface VectorRecord {
  id: number;
  collection: string;
  sourceId: string;
  embeddingHash: string;
  userId: string;
  summary: string;
  status: string;
  embeddingText: string;
  indexedAt: string;
}

export interface VectorRecordPage {
  items: VectorRecord[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CollectionStats {
  collection: string;
  vectorCount: number;
  userRecords: number;
  status: string;
}

export interface KnowledgeOverview {
  userId: string;
  collections: CollectionStats[];
}

export interface CollectionDefinition {
  name: string;
  label: string;
  description: string;
  dimensions: number;
  distance: string;
  role?: string;
  dataSource?: string;
  vectorType?: "text" | "image";
  internal?: boolean;
  manualIndexable?: boolean;
}

// 获取 Collection 定义列表（名称、中文标签、描述等）
export const getCollectionDefinitions = () => {
  return request.get<{ definitions: CollectionDefinition[] }>({
    url: "/vector-search/collections/definitions",
  });
};

// 新增向量记录（索引入库）
export const indexVectorRecord = (data: {
  collection: string;
  sourceId?: string;
  text: string;
  metadata?: Record<string, any>;
}) => {
  return request.post<{ success: boolean; sourceId: string }>({
    url: "/vector-search/index",
    data,
  });
};

// 查询向量记录列表
export const getVectorRecords = (params: {
  collection?: string;
  page?: number;
  pageSize?: number;
  status?: string;
}) => {
  return request.get<VectorRecordPage>({ url: "/vector-search/records", params });
};

// 获取单条记录详情
export const getVectorRecord = (id: string) => {
  return request.get<any>({ url: `/vector-search/records/${id}` });
};

// 删除单条记录
export const deleteVectorRecord = (id: string) => {
  return request.delete({ url: `/vector-search/records/${id}` });
};

// 获取 Collection 列表和统计
export const getCollections = () => {
  return request.get<{ collections: any[]; stats: any[] }>({ url: "/vector-search/collections" });
};

// 确保 Collection 存在（创建索引）
export const ensureCollection = (name: string) => {
  return request.post({ url: `/vector-search/collections/${name}/ensure` });
};

// 获取用户知识库概览
export const getKnowledgeOverview = () => {
  return request.get<KnowledgeOverview>({ url: "/vector-search/knowledge" });
};

// 清空用户指定 collection 的数据
export const clearUserCollection = (collection: string) => {
  return request.delete({ url: `/vector-search/knowledge/${collection}` });
};

// 清空用户所有向量数据
export const clearAllKnowledge = () => {
  return request.delete({ url: "/vector-search/knowledge" });
};

// 查询模型服务健康状态（yishe-models）
export const getModelServiceHealth = () => {
  return request.get<{
    key: string;
    name: string;
    available: boolean;
    baseUrl: string;
    message: string;
    timestamp: string;
  }>({ url: "/external-service-health/model-service" });
};

export interface StickerVectorReindexResult {
  total: number;
  indexed: number;
  skipped: number;
  failed: number;
  collections: string[];
  dryRun: boolean;
  force: boolean;
  details?: {
    stickers?: { indexed: number; skipped: number; failed: number };
    designPatterns?: { indexed: number; skipped: number; failed: number };
    stickerImages?: {
      indexed: number;
      skipped: number;
      failed: number;
      embeddingRequests: number;
      duplicateImages: number;
    };
  };
}

export interface ContentVectorBuildResult {
  total: number;
  indexed: number;
  skipped: number;
  failed: number;
  collections: string[];
  dryRun: boolean;
  force: boolean;
  details?: Record<
    "fonts" | "sentences" | "psd-templates" | "text-documents" | "design-knowledge",
    {
      total: number;
      indexed: number;
      skipped: number;
      failed: number;
    }
  >;
}

export type BaseVectorBuildJobStatus =
  | "idle"
  | "pending"
  | "running"
  | "stale"
  | "paused"
  | "completed"
  | "failed"
  | "canceled";

export interface BaseVectorBuildJobItem {
  collection: string;
  label: string;
  status: BaseVectorBuildJobStatus;
  total: number;
  processed: number;
  indexed: number;
  skipped: number;
  failed: number;
  message?: string;
  extra?: Record<string, any>;
}

export interface BaseVectorBuildJob {
  id: string;
  status: BaseVectorBuildJobStatus;
  trigger: "manual" | "scheduled";
  batchSize: number;
  dryRun: boolean;
  force: boolean;
  collections: string[];
  filters: Record<string, any>;
  createdAt: string;
  startedAt?: string;
  finishedAt?: string;
  updatedAt: string;
  progress: number;
  total: number;
  processed: number;
  indexed: number;
  skipped: number;
  failed: number;
  message?: string;
  error?: string;
  items: BaseVectorBuildJobItem[];
  errors: string[];
}

export interface CreateBaseVectorBuildJobResult {
  accepted: boolean;
  job: BaseVectorBuildJob;
  message?: string;
}

export const createBaseVectorBuildJob = (data: {
  batchSize?: number;
  dryRun?: boolean;
  force?: boolean;
  collections?: string[];
  filters?: {
    isCustom?: boolean;
    userId?: string;
    updatedAfter?: string;
    updatedBefore?: string;
  };
}) => {
  return request.post<CreateBaseVectorBuildJobResult>({
    url: "/sticker/vector-build-jobs",
    data,
  });
};

export const getLatestBaseVectorBuildJob = () => {
  return request.get<BaseVectorBuildJob | null>({
    url: "/sticker/vector-build-jobs/latest",
  });
};

export const getCollectionLastFinishedTimes = () => {
  return request.get<Record<string, string>>({
    url: "/sticker/vector-build-jobs/last-finished-by-collection",
  });
};

export interface VectorBuildSchedulerStatus {
  enabled: boolean;
  running: boolean;
  disabledReason: string | null;
  cron: string;
  cronDescription: string;
  timezone: string;
  windowHours: number;
  batchSize: number;
  stickerBuildEnabled: boolean;
  contentBuildEnabled: boolean;
  stickerCollections: string[];
  contentCollections: string[];
  scheduledCollections: string[];
  nextRunAt: string | null;
  summary: string;
}

export const getVectorBuildSchedulerStatus = () => {
  return request.get<VectorBuildSchedulerStatus>({
    url: "/sticker/vector-build-scheduler/status",
  });
};

export const pauseBaseVectorBuildJob = (id: string) => {
  return request.post<BaseVectorBuildJob | null>({
    url: `/sticker/vector-build-jobs/${id}/pause`,
  });
};

export const resumeBaseVectorBuildJob = (id: string) => {
  return request.post<BaseVectorBuildJob | null>({
    url: `/sticker/vector-build-jobs/${id}/resume`,
  });
};

export const cancelBaseVectorBuildJob = (id: string) => {
  return request.post<BaseVectorBuildJob | null>({
    url: `/sticker/vector-build-jobs/${id}/cancel`,
  });
};

export const retryBaseVectorBuildJob = (id: string) => {
  return request.post<CreateBaseVectorBuildJobResult | null>({
    url: `/sticker/vector-build-jobs/${id}/retry`,
  });
};

export const reindexStickerVectors = (data: {
  batchSize?: number;
  dryRun?: boolean;
  force?: boolean;
  collections?: string[];
  filters?: {
    isCustom?: boolean;
    userId?: string;
    updatedAfter?: string;
    updatedBefore?: string;
  };
}) => {
  return request.post<StickerVectorReindexResult>({
    url: "/sticker/reindex-vectors",
    data,
  });
};

export const reindexContentVectors = (data: {
  batchSize?: number;
  dryRun?: boolean;
  force?: boolean;
  collections?: string[];
  filters?: {
    userId?: string;
    updatedAfter?: string;
    updatedBefore?: string;
  };
}) => {
  return request.post<ContentVectorBuildResult>({
    url: "/vector-search/content/reindex",
    data,
  });
};

// ============ 通用覆盖率/缺口统计（provider 驱动，所有集合） ============
export interface VectorCollectionCoverage {
  collection: string;
  label: string | null;
  total: number;
  indexedAlive: number;
  missing: number;
  coverage: number | null;
  lastIndexedAt: string | null;
}

export interface VectorCoverageStatistics {
  generatedAt: string;
  collections: VectorCollectionCoverage[];
  summary: string;
}

export const getVectorCoverageStatistics = () => {
  return request.get<VectorCoverageStatistics>({
    url: "/vector-search/collections/statistics",
  });
};
