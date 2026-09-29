import request from '@/config/axios';

export interface AiPromptTemplateItem {
  id: string;
  userId?: number | null;
  title: string;
  content: string;
  description?: string | null;
  kind: 'snippet' | 'example' | 'test';
  isExample: boolean;
  category?: string | null;
  tags?: string[] | null;
  testExpect?: Record<string, any> | null;
  useCount: number;
  lastUsedAt?: string | null;
  isEnabled: boolean;
  createTime?: string;
  updateTime?: string;
}

export function getAiPromptTemplateList(params: {
  keyword?: string;
  kind?: string;
  category?: string;
  isExample?: boolean;
  tag?: string;
  page?: number;
  pageSize?: number;
}) {
  return request.get({
    url: '/ai-prompt-template/list',
    params,
  }) as unknown as Promise<{ items: AiPromptTemplateItem[]; total: number }>;
}

export function getAiPromptTemplateExamples() {
  return request.get({
    url: '/ai-prompt-template/examples',
  }) as unknown as Promise<{ items: AiPromptTemplateItem[]; total: number }>;
}

export function getAiPromptTemplate(id: string) {
  return request.get({
    url: `/ai-prompt-template/${id}`,
  }) as unknown as Promise<AiPromptTemplateItem>;
}

export function createAiPromptTemplate(data: {
  title: string;
  content: string;
  description?: string;
  kind?: 'snippet' | 'example' | 'test';
  isExample?: boolean;
  category?: string;
  tags?: string[];
  testExpect?: Record<string, any>;
}) {
  return request.post({
    url: '/ai-prompt-template',
    data,
  }) as unknown as Promise<AiPromptTemplateItem>;
}

export function updateAiPromptTemplate(id: string, data: Partial<AiPromptTemplateItem>) {
  return request.patch({
    url: `/ai-prompt-template/${id}`,
    data,
  }) as unknown as Promise<AiPromptTemplateItem>;
}

export function deleteAiPromptTemplate(id: string) {
  return request.delete({
    url: `/ai-prompt-template/${id}`,
  }) as unknown as Promise<any>;
}
