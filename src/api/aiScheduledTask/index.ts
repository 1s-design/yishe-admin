import request from '@/config/axios';

export interface AiScheduledTaskItem {
  id: string;
  userId?: number | null;
  /** 绑定智能体定义 ID（到期后派发给该智能体） */
  agentDefinitionId?: string | null;
  title: string;
  instructions: string;
  triggerType: 'cron' | 'interval';
  cronExpr?: string | null;
  intervalMinutes?: number | null;
  timezone: string;
  isEnabled: boolean;
  nextRunAt?: string | null;
  lastRunAt?: string | null;
  lastResultSummary?: string | null;
  failCount: number;
  lastFailReason?: string | null;
  payloadConfig?: Record<string, any> | null;
  tags?: string[] | null;
  createTime?: string;
  updateTime?: string;
}

export interface AiScheduledTaskExecutionItem {
  id: number;
  taskId: string;
  taskTitle: string;
  status: 'pending' | 'running' | 'success' | 'failed' | 'skipped';
  triggerSource: string;
  scheduledAt?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  resultSummary?: string | null;
  errorText?: string | null;
  durationMs?: number | null;
}

export function getAiScheduledTaskList(params: {
  keyword?: string;
  isEnabled?: boolean;
  triggerType?: string;
  page?: number;
  pageSize?: number;
}) {
  return request.get({
    url: '/ai-scheduled-task/list',
    params,
  }) as unknown as Promise<{ items: AiScheduledTaskItem[]; total: number }>;
}

export function getAiScheduledTask(id: string) {
  return request.get({
    url: `/ai-scheduled-task/${id}`,
  }) as unknown as Promise<AiScheduledTaskItem>;
}

export function createAiScheduledTask(data: {
  title: string;
  instructions: string;
  agentDefinitionId?: string;
  triggerType?: 'cron' | 'interval';
  cronExpr?: string;
  intervalMinutes?: number;
  timezone?: string;
  isEnabled?: boolean;
  tags?: string[];
}) {
  return request.post({
    url: '/ai-scheduled-task',
    data,
  }) as unknown as Promise<AiScheduledTaskItem>;
}

export function updateAiScheduledTask(
  id: string,
  data: Partial<{
    title: string;
    instructions: string;
    agentDefinitionId: string | null;
    triggerType: 'cron' | 'interval';
    cronExpr: string;
    intervalMinutes: number;
    timezone: string;
    isEnabled: boolean;
    tags: string[];
  }>,
) {
  return request.patch({
    url: `/ai-scheduled-task/${id}`,
    data,
  }) as unknown as Promise<AiScheduledTaskItem>;
}

export function enableAiScheduledTask(id: string) {
  return request.post({
    url: `/ai-scheduled-task/${id}/enable`,
  }) as unknown as Promise<AiScheduledTaskItem>;
}

export function disableAiScheduledTask(id: string) {
  return request.post({
    url: `/ai-scheduled-task/${id}/disable`,
  }) as unknown as Promise<AiScheduledTaskItem>;
}

export function deleteAiScheduledTask(id: string) {
  return request.delete({
    url: `/ai-scheduled-task/${id}`,
  }) as unknown as Promise<any>;
}

export function getAiScheduledTaskExecutions(
  id: string,
  params?: { page?: number; pageSize?: number },
) {
  return request.get({
    url: `/ai-scheduled-task/${id}/executions`,
    params,
  }) as unknown as Promise<{ items: AiScheduledTaskExecutionItem[]; total: number }>;
}
