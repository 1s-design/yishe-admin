import request from '@/config/axios';

export interface RemotionSkillItem {
  id: string;
  code: string;
  name: string;
  icon: string;
  category: string;
  description: string;
  promptContent: string;
  defaultParams: Record<string, any> | null;
  isSystem: boolean;
  isActive: boolean;
  sortOrder: number;
  userId: number | null;
  createTime: string;
  updateTime: string;
}

export function getRemotionSkillList(params?: {
  category?: string;
  isActive?: boolean | string;
  keyword?: string;
}) {
  return request.get({
    url: '/remotion-skill/list',
    params,
  });
}

export function getRemotionSkillDetail(id: string) {
  return request.get({
    url: `/remotion-skill/${id}`,
  });
}

export function createRemotionSkill(data: {
  code?: string;
  name: string;
  icon?: string;
  category?: string;
  description?: string;
  promptContent: string;
  defaultParams?: Record<string, any>;
  isActive?: boolean;
  sortOrder?: number;
}) {
  return request.post({
    url: '/remotion-skill',
    data,
  });
}

export function updateRemotionSkill(
  id: string,
  data: {
    name?: string;
    icon?: string;
    category?: string;
    description?: string;
    promptContent?: string;
    defaultParams?: Record<string, any>;
    isActive?: boolean;
    sortOrder?: number;
  },
) {
  return request.put({
    url: `/remotion-skill/${id}`,
    data,
  });
}

export function deleteRemotionSkill(id: string) {
  return request.delete({
    url: `/remotion-skill/${id}`,
  });
}

export function toggleRemotionSkill(id: string) {
  return request.patch({
    url: `/remotion-skill/${id}/toggle`,
  });
}

export function importRemotionSkillMarkdown(markdown: string) {
  return request.post({
    url: '/remotion-skill/import-markdown',
    data: { markdown },
  });
}
