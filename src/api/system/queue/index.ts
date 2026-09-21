import request from "@/config/axios";

export interface QueueMessage {
  id: string;
  queue: string;
  type: string;
  // 列表接口默认返回轻量摘要；详情接口返回完整任务数据。
  data?: any;
  // 列表接口默认返回日志摘要；详情接口返回完整运行日志快照。
  taskRuntimeLog?: Record<string, any> | null;
  description?: string;
  priority?: number;
  delay?: number;
  maxAttempts?: number;
  attempts?: number;
  status: "pending" | "waiting" | "processing" | "completed" | "failed";
  createdAt: string;
  updatedAt?: string;
  processedAt?: string;
  error?: string;
  metadata?: Record<string, any>;
  userId?: number | null;
  uploader?: {
    id?: number;
    account?: string;
    name?: string;
  } | null;
  executionReadiness?: TaskExecutionReadinessSnapshot | null;
}

export type TaskExecutionReadinessStatus =
  | "ready"
  | "waiting"
  | "blocked"
  | "manual_ready"
  | "manual_blocked"
  | "unknown";

export type QueueExecutionReadinessStatusFilter = TaskExecutionReadinessStatus;

export type TaskExecutionReadinessOverrideMode = "ready" | "blocked" | "auto";

export interface TaskExecutionReadinessSnapshot {
  status: TaskExecutionReadinessStatus;
  ready: boolean;
  manual: boolean;
  label: string;
  reason?: string | null;
  ruleKey?: string | null;
  updatedAt?: string | null;
}

export interface QueueStats {
  queue: string;
  pending: number;
  waiting?: number;
  processing: number;
  delayed: number;
  completed: number;
  failed: number;
  total: number;
}

export interface PublishTaskRuntimeSummary {
  typePrefix: string;
  pending: number;
  waiting: number;
  processing: number;
  delayed: number;
  completed: number;
  failed: number;
  total: number;
  active: number;
  items?: PublishTaskRuntimeSummaryItem[];
  fetchedAt?: string | null;
}

export interface PublishTaskRuntimeSummaryItem {
  id: string;
  taskType: string;
  label?: string | null;
  status?: string | null;
  dispatchStatus?: string | null;
  currentStep?: string | null;
  lastError?: string | null;
  assignedClientId?: string | null;
  assignedMachineCode?: string | null;
  profileId?: string | null;
  updatedAt?: string | null;
}

export interface PublishTaskCapabilityFeature {
  key: string;
  label: string;
  description: string;
}

export interface PublishTaskCapabilityTaskType {
  taskType: string;
  label: string;
  platform?: string | null;
  platformLabel?: string | null;
  executionTransport: "client-assisted" | "server-only" | "unknown";
  serverPrepareSupported: boolean;
  serverDirectExecuteSupported: boolean;
  browserAutomationExecuteSupported: boolean;
}

export interface PublishTaskCapabilityCatalogResponse {
  success: boolean;
  data: {
    browserAutomation: {
      roleDescription?: string;
      declaredTaskTypes: Array<{
        taskType: string;
        label: string;
      }>;
    };
    server: {
      roleDescription?: string;
      features: PublishTaskCapabilityFeature[];
      taskTypes: PublishTaskCapabilityTaskType[];
    };
    taskTypes: PublishTaskCapabilityTaskType[];
  };
}

export interface CreateTaskDto {
  queue?: string; // 队列名称（可选，如果未提供则使用 type 作为 queue）
  type: string; // 任务类型（必需，如果未提供 queue 则同时作为队列名称）
  data: any;
  description?: string;
  priority?: number;
  delay?: number;
  maxAttempts?: number;
  metadata?: Record<string, any>;
}

// 创建任务
export const createTask = (data: CreateTaskDto) => {
  return request.post({ url: "/queue/produce", data });
};

// 批量创建任务
export const createTaskBatch = (data: {
  queue: string;
  tasks: Array<{ type: string; data: any; priority?: number; delay?: number }>;
}) => {
  return request.post({ url: "/queue/produce/batch", data });
};

// 获取任务列表（根据状态分页查询）
export const getTaskList = (params: {
  queue?: string;
  status?: "pending" | "waiting" | "processing" | "completed" | "failed";
  type?: string;
  types?: string[];
  id?: string;
  executionReadinessStatus?: QueueExecutionReadinessStatusFilter;
  sortField?: "createdAt" | "updatedAt" | "processedAt";
  sortOrder?: "ASC" | "DESC";
  includeTotal?: boolean;
  limit?: number;
  offset?: number;
  createdAfter?: string;
  createdBefore?: string;
}) => {
  const queryParams: any = { ...params };
  if (!queryParams.queue || !queryParams.queue.trim()) {
    delete queryParams.queue;
  }
  if (Array.isArray(queryParams.types) && queryParams.types.length > 0) {
    queryParams.types = queryParams.types.join(",");
    delete queryParams.type;
  } else {
    delete queryParams.types;
    if (!queryParams.type || !queryParams.type.trim()) {
      delete queryParams.type;
    }
  }
  if (!queryParams.id || !queryParams.id.trim()) {
    delete queryParams.id;
  }
  if (!queryParams.executionReadinessStatus) {
    delete queryParams.executionReadinessStatus;
  }
  if (!queryParams.createdAfter) {
    delete queryParams.createdAfter;
  }
  if (!queryParams.createdBefore) {
    delete queryParams.createdBefore;
  }
  return request.get({ url: `/queue/messages`, params: queryParams });
};

// 获取任务详情
export const getTaskDetail = (queue: string, messageId: string) => {
  return request.get({ url: `/queue/message`, params: { queue, messageId } });
};

// 删除任务
export const deleteTask = (queue: string, messageId: string) => {
  return request.delete({ url: `/queue/message`, params: { queue, messageId } });
};

// 获取队列统计信息
export const getQueueStats = (queue?: string, types?: string[]) => {
  // 如果 queue 为空字符串，不传该参数（查询所有队列的统计）
  const params: any = {};
  if (Array.isArray(types) && types.length > 0) {
    params.types = types.join(",");
  }
  if (queue && queue.trim()) {
    params.queue = queue.trim();
  }
  return request.get({ url: `/queue/stats`, params });
};

// 获取任务统计明细（支持时间范围）
export interface TaskStatsQueryParams {
  types?: string[];
  createdAfter?: string;
  createdBefore?: string;
}

export interface TaskTypeStatsItem {
  type: string;
  total: number;
  pending: number;
  waiting: number;
  processing: number;
  completed: number;
  failed: number;
}

export interface TaskStatsSummary {
  total: number;
  pending: number;
  waiting: number;
  processing: number;
  completed: number;
  failed: number;
  byType: TaskTypeStatsItem[];
}

export const getTaskStatsDetail = (query: TaskStatsQueryParams) => {
  const params: any = {};
  if (Array.isArray(query.types) && query.types.length > 0) {
    params.types = query.types.join(",");
  }
  if (query.createdAfter) {
    params.createdAfter = query.createdAfter;
  }
  if (query.createdBefore) {
    params.createdBefore = query.createdBefore;
  }
  return request.get<{ success: boolean; data: TaskStatsSummary }>({
    url: `/queue/stats/detail`,
    params,
  });
};

export const getPublishTaskRuntimeSummary = () => {
  return request.get({ url: "/queue/publish-summary" });
};

export const getPublishTaskCapabilityCatalog = () => {
  return request.get<PublishTaskCapabilityCatalogResponse>({
    url: "/queue/publish-capabilities",
  });
};

// 确认任务成功（ACK）
export const ackTask = (queue: string, messageId: string) => {
  return request.post({ url: `/queue/ack`, data: { queue, messageId } });
};

// 确认任务失败（NACK）
export const nackTask = (queue: string, messageId: string, error?: string, requeue?: boolean) => {
  return request.post({ url: `/queue/nack`, data: { queue, messageId, error, requeue } });
};

// 重新入队失败的任务
export const requeueTask = (queue: string, messageId: string) => {
  return request.post({ url: `/queue/requeue`, data: { queue, messageId } });
};

// 更新任务元数据
export const updateTaskMetadata = (
  queue: string,
  messageId: string,
  metadata: Record<string, any>,
) => {
  return request.post({ url: `/queue/message/metadata`, data: { queue, messageId, metadata } });
};

// 更新任务数据
export const updateTaskData = (queue: string, messageId: string, data: any) => {
  return request.post({ url: `/queue/message/data`, data: { queue, messageId, data } });
};

// 更新任务状态（使用 type 字段而不是 queue）
export const updateTaskStatus = (
  type: string,
  messageId: string,
  status: "pending" | "waiting" | "processing" | "completed" | "failed",
  error?: string,
) => {
  return request.post({ url: "/queue/message/status", data: { type, messageId, status, error } });
};

export const batchResetPublishTasksToPending = (ids: string[]) => {
  return request.post<{
    success: boolean;
    message: string;
    data: {
      total: number;
      updated: number;
      skipped: Array<{ id: string; reason: string }>;
    };
  }>({
    url: "/queue/messages/status-batch/pending",
    data: { ids },
  });
};

export const updateTaskExecutionReadiness = (
  type: string,
  messageId: string,
  mode: TaskExecutionReadinessOverrideMode,
  reason?: string,
) => {
  return request.post<{ success: boolean; message: string; data?: TaskExecutionReadinessSnapshot }>(
    {
      url: "/queue/message/execution-readiness",
      data: { type, messageId, mode, reason },
    },
  );
};

// 清空队列
export const clearQueue = (queue: string) => {
  return request.delete({ url: `/queue/clear`, params: { queue } });
};

// 获取失败任务列表
export const getFailedTasks = (queue: string, limit?: number) => {
  return request.get({ url: `/queue/failed`, params: { queue, limit } });
};
