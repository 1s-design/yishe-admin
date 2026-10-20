import request from "@/config/axios";

export type AiUsageLogRecord = {
  id: number;
  userId?: number | null;
  userName?: string | null;
  featureCode: string;
  featureLabel?: string | null;
  specCode?: string | null;
  keyId?: number | null;
  keyName?: string | null;
  keySource?: string | null;
  model?: string | null;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  durationMs: number;
  status: "success" | "error";
  errorMessage?: string | null;
  createTime: string;
};

export type AiUsageLogQuery = {
  page?: number;
  pageSize?: number;
  keyword?: string;
  featureCode?: string;
  specCode?: string;
  keyId?: number;
  model?: string;
  userId?: number;
  status?: string;
  startTime?: string;
  endTime?: string;
};

export type AiUsageLogPageResult = {
  list: AiUsageLogRecord[];
  total: number;
  page: number;
  pageSize: number;
};

export type AiUsageStats = {
  callCount: number;
  totalTokens: number;
  promptTokens: number;
  completionTokens: number;
  errorCount: number;
  successCount: number;
  avgDurationMs: number;
};

export type AiUsageAggregateDimension =
  | "feature"
  | "model"
  | "key"
  | "spec"
  | "user"
  | "day";

export type AiUsageAggregateRow = {
  value: string | number | null;
  label: string | null;
  callCount: number;
  totalTokens: number;
  promptTokens: number;
  completionTokens: number;
  totalDurationMs: number;
  avgDurationMs: number;
  errorCount: number;
};

export type AiUsageCleanupResult = {
  success: boolean;
  dryRun?: boolean;
  deletedCount: number;
  willDelete?: number;
  boundary?: string;
  message?: string;
};

// 分页查看
export const getAiUsageLogPage = (params: AiUsageLogQuery) =>
  request.get<AiUsageLogPageResult>({ url: "/system/ai-usage-log", params });

// 概览
export const getAiUsageLogStats = (params?: AiUsageLogQuery) =>
  request.get<AiUsageStats>({ url: "/system/ai-usage-log/stats", params });

// 聚合统计（dimension: feature|model|key|spec|user|day）
export const getAiUsageLogAggregate = (
  dimension: AiUsageAggregateDimension,
  params?: AiUsageLogQuery,
) =>
  request.get<{ dimension: string; list: AiUsageAggregateRow[] }>({
    url: "/system/ai-usage-log/aggregate",
    params: { ...params, dimension },
  });

// 筛选下拉项
export const getAiUsageLogFacets = () =>
  request.get<{
    features: Array<{ value: string; label: string | null }>;
    models: Array<{ value: string; label: string | null }>;
    specs: Array<{ value: string; label: string | null }>;
  }>({ url: "/system/ai-usage-log/facets" });

// 流水总条数
export const getAiUsageLogCount = () =>
  request.get<{ total: number }>({ url: "/system/ai-usage-log/count" });

// 单条删除
export const deleteAiUsageLog = (id: number) =>
  request.delete({ url: `/system/ai-usage-log/${id}` });

// 批量删除
export const deleteAiUsageLogBatch = (ids: number[]) =>
  request.post<{ success: boolean; deletedCount: number; ids: number[] }>({
    url: "/system/ai-usage-log/delete-batch",
    data: { ids },
  });

// 清理历史数据（dryRun=true 只预览）
export const cleanupAiUsageLog = (data: {
  retentionDays?: number;
  before?: string;
  dryRun?: boolean;
}) => request.post<AiUsageCleanupResult>({ url: "/system/ai-usage-log/cleanup", data });
