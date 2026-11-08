import request from "@/config/axios";

export interface WorkflowCanvas {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  viewport?: { x: number; y: number; zoom: number };
}

export interface WorkflowNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: Record<string, any>;
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  type?: string;
}

export interface WorkflowItem {
  id: string;
  name: string;
  publisherUserId?: number | null;
  description?: string;
  status: "draft" | "published" | "archived";
  isEnabled: boolean;
  isRunning: boolean;
  userId: number;
  canvas?: WorkflowCanvas;
  createTime: string;
  updateTime: string;
  /** 触发器列表（定时/手动/webhook） */
  triggers?: WorkflowTrigger[];
  /** 画布中实际使用的节点类型，供工作流卡片展示图标。 */
  nodeTypes?: string[];
  nodeCount?: number;
  /** 工作流列表卡片展示的最近一次执行状态与错误摘要。 */
  lastExecution?: {
    id: string;
    status: "queued" | "running" | "success" | "failed" | "cancelled" | "paused" | string;
    errorText?: string | null;
    currentNodeId?: string | null;
    durationMs?: number | null;
    updateTime?: string;
  } | null;
}

export interface WorkflowTrigger {
  id: string;
  type: "manual" | "cron" | "webhook";
  enabled: boolean;
  config?: {
    expression?: string;
    name?: string;
  };
  nextRunTime?: string;
}

export interface WorkflowPageParams {
  currentPage?: number;
  pageSize?: number;
  name?: string;
  status?: string;
  /**
   * 仅全局菜单角标使用：请求体带 brief:true 时服务端只返回
   * id/isRunning/isEnabled/triggers[3]。卡片页与模板库不要传，
   * 不传时请求体与响应逐字节不变。
   */
  brief?: boolean;
}

// 创建工作流
export const createWorkflowApi = (data: { name: string; description?: string }) =>
  request.post({ url: "/workflow/create", data });

// 分页查询工作流列表
export const getWorkflowPageApi = (data: WorkflowPageParams) =>
  request.post({ url: "/workflow/page", data });

// 获取工作流详情（含画布）
export const getWorkflowDetailApi = (id: string) => request.get({ url: `/workflow/${id}` });

// 更新工作流（支持局部更新：名称 / 画布 / 状态）
export const updateWorkflowApi = (data: {
  id: string;
  name?: string;
  description?: string;
  status?: string;
  isEnabled?: boolean;
  canvas?: WorkflowCanvas;
}) => request.post({ url: "/workflow/update", data });

// 删除工作流
export const deleteWorkflowApi = (ids: string | string[]) =>
  request.post({ url: "/workflow/delete", data: { ids } });

// 切换工作流启用状态
export const toggleEnabledApi = (id: string) =>
  request.put({ url: `/workflow/${id}/toggle-enabled` });

// 🚀 手动运行工作流
export const runWorkflowApi = (id: string, input?: Record<string, any>) =>
  request.post({ url: `/workflow/${id}/run`, data: { input } });

// 🛑 强制重置工作流运行状态并终止所有运行中任务
export const resetWorkflowApi = (id: string) =>
  request.post({ url: `/workflow/workflows/${id}/reset` });

// 取消工作流执行
export const cancelWorkflowExecutionApi = (executionId: string) =>
  request.post({ url: `/workflow/executions/${executionId}/cancel` });

export const pauseWorkflowExecutionApi = (executionId: string) =>
  request.post({ url: `/workflow/executions/${executionId}/pause` });

export const resumeWorkflowExecutionApi = (executionId: string) =>
  request.post({ url: `/workflow/executions/${executionId}/resume` });

// 获取工作流关联的触发器列表
export const getWorkflowTriggersApi = (id: string) =>
  request.get({ url: `/workflow/${id}/triggers` });

// 保存/新增/更新工作流触发器
export const saveWorkflowTriggerApi = (
  id: string,
  data: { type: string; config?: Record<string, any>; enabled?: boolean },
) => request.post({ url: `/workflow/${id}/triggers`, data });

// 删除触发器
export const deleteWorkflowTriggerApi = (triggerId: string) =>
  request.delete({ url: `/workflow/triggers/${triggerId}` });

// 获取工作流运行历史日志列表
export const getWorkflowExecutionsApi = (
  id: string,
  data?: { currentPage?: number; pageSize?: number },
) => request.post({ url: `/workflow/${id}/executions`, data });

// 删除单条执行记录
export const deleteWorkflowExecutionApi = (executionId: string) =>
  request.delete({ url: `/workflow/executions/${executionId}` });

// 清空工作流执行记录
export const clearWorkflowExecutionsApi = (workflowId: string) =>
  request.delete({ url: `/workflow/${workflowId}/executions` });

// 服务端唯一节点清单：名称、参数、输出和是否已注册执行器
export const getWorkflowNodeManifestApi = () => request.get({ url: "/workflow/nodes/manifest" });


export interface WorkflowLibraryItem {
  id: string;
  name: string;
  description?: string;
  category: string;
  tags: string[];
  definitionVersion: number;
  status: "published" | "archived";
  publishedAt?: string | null;
  importCount: number;
  nodeTypes?: string[];
  createTime: string;
  updateTime: string;
  definition?: Record<string, any>;
}

/** 管理员发布当前工作流的独立模板快照。 */
export const publishWorkflowToLibraryApi = (
  id: string,
  data?: { category?: string; tags?: string[]; description?: string },
) => request.post({ url: `/workflow/${id}/library-publish`, data: data || {} });

export const getWorkflowLibraryPageApi = (data?: {
  currentPage?: number;
  pageSize?: number;
  keyword?: string;
  category?: string;
}) => request.post({ url: "/workflow/library/page", data: data || {} });

export const getWorkflowLibraryDetailApi = (id: string) =>
  request.get({ url: `/workflow/library/${id}` });

export const importWorkflowFromLibraryApi = (id: string) =>
  request.post({ url: `/workflow/library/${id}/import`, data: {} });

export const unpublishWorkflowLibraryApi = (id: string) =>
  request.delete({ url: `/workflow/library/${id}` });

/** 管理员直接复制给指定用户，不经过分享记录。 */
export const copyWorkflowToUserApi = (id: string, targetUserId: number) =>
  request.post({ url: `/workflow/${id}/copy`, data: { targetUserId } });
