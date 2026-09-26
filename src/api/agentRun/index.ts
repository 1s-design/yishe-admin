import request from "@/config/axios";

/** ── Types ── */

export type AgentRunStatus =
  | "pending"
  | "queued"
  | "running"
  | "waiting"
  | "success"
  | "failed"
  | "cancelled";

export type AgentRunStageStatus =
  | "pending"
  | "queued"
  | "running"
  | "waiting"
  | "success"
  | "failed"
  | "timeout"
  | "skipped"
  | "cancelled";

export interface AgentRunStage {
  id: number;
  runId: string;
  stageIndex: number;
  capabilityId: string;
  name: string;
  status: AgentRunStageStatus;
  input?: Record<string, any> | null;
  output?: Record<string, any> | null;
  artifactId?: string | null;
  params?: Record<string, any> | null;
  logs?: string | string[] | null;
  errorMessage?: string | null;
  errorDetail?: string | null;
  errorCode?: string | null;
  retryable?: boolean | null;
  retryCount: number;
  durationMs?: number | null;
  startedAt?: string | null;
  finishedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AgentRunArtifact {
  id: number;
  artifactId: string;
  type: string;
  runId?: string | null;
  stageIndex?: number | null;
  name?: string | null;
  storageType?: string | null;
  url?: string | null;
  contentText?: string | null;
  metadata?: Record<string, any> | null;
  createdAt: string;
}

export interface AgentRunDetail {
  runId: string;
  userId: number;
  title: string;
  status: AgentRunStatus;
  currentStage: number;
  totalStages: number;
  pendingQuestion?: string | null;
  errorMessage?: string | null;
  input?: Record<string, any> | null;
  output?: Record<string, any> | null;
  plan?: Record<string, any> | null;
  createdAt: string;
  updatedAt: string;
  startedAt?: string | null;
  finishedAt?: string | null;
  cancelledAt?: string | null;
  stages: AgentRunStage[];
  artifacts: AgentRunArtifact[];
}

export interface AgentRunListItem {
  runId: string;
  userId: number;
  title: string;
  status: AgentRunStatus;
  currentStage: number;
  totalStages: number;
  errorMessage?: string | null;
  input?: Record<string, any> | null;
  createdAt: string;
  updatedAt: string;
  startedAt?: string | null;
  finishedAt?: string | null;
}

export interface AgentRunListResult {
  list: AgentRunListItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AgentRunStatusCounts {
  all: number;
  pending: number;
  queued: number;
  running: number;
  waiting: number;
  success: number;
  failed: number;
  cancelled: number;
}

/** ── API Client ── */

export const AgentRunApi = {
  /** 获取任务列表（分页 + 状态筛选） */
  list: async (params?: {
    status?: AgentRunStatus | "";
    page?: number;
    pageSize?: number;
  }) => {
    return request.get<AgentRunListResult>({
      url: "/agent-run",
      params: {
        status: params?.status || undefined,
        page: params?.page || 1,
        pageSize: params?.pageSize || 20,
      },
    });
  },

  /** 获取任务详情（含 stages + artifacts） */
  detail: async (runId: string) => {
    return request.get<AgentRunDetail>({
      url: `/agent-run/${runId}`,
    });
  },

  /** 取消任务 */
  cancel: async (runId: string) => {
    return request.post<AgentRunDetail>({
      url: `/agent-run/${runId}/cancel`,
    });
  },

  /** 重试失败 Stage */
  retryStage: async (runId: string, stageIndex: number) => {
    return request.post<AgentRunDetail>({
      url: `/agent-run/${runId}/retry/${stageIndex}`,
    });
  },

  /** 审批 Stage */
  approveStage: async (
    runId: string,
    stageIndex: number,
    data: { approved: boolean; modifiedParams?: Record<string, any>; reason?: string },
  ) => {
    return request.post<AgentRunDetail>({
      url: `/agent-run/${runId}/approve/${stageIndex}`,
      data,
    });
  },

  /** 获取各状态任务数量 */
  statusCounts: async () => {
    return request.get<AgentRunStatusCounts>({
      url: "/agent-run/status-counts",
    });
  },

  /** 获取单个 Stage 详情（含 logs） */
  stageDetail: async (runId: string, stageIndex: number) => {
    return request.get<AgentRunStage>({
      url: `/agent-run/${runId}/stages/${stageIndex}`,
    });
  },
};
