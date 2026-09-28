import { request } from '@/config/axios';

/** Remotion 模板包（对齐官方 Composition 契约） */
export interface RemotionTemplateItem {
  id: string;
  code: string;
  name: string;
  description?: string;
  category: string;
  tags: string[];
  compositionId: string;
  width: number;
  height: number;
  fps: number;
  durationInFrames: number;
  defaultProps?: Record<string, any>;
  propsSchema?: Record<string, any>;
  implementationKind: 'structure' | 'component' | 'builtin';
  structure?: Record<string, any>;
  builtinKey?: string;
  paramHints?: Array<Record<string, any>>;
  editability?: Record<string, any>;
  coverUrl?: string;
  previewVideoUrl?: string;
  scope: 'private' | 'unlisted' | 'shared' | 'official';
  isSystem: boolean;
  version: string;
  userId?: number;
  sourceRecordId?: string;
  createTime: string;
  updateTime: string;
}

export function getRemotionTemplatePage(params: {
  currentPage?: number;
  pageSize?: number;
  keyword?: string;
  category?: string;
  scope?: string;
  implementationKind?: string;
  tag?: string;
}): Promise<{ list: RemotionTemplateItem[]; total: number }> {
  return request({ url: '/remotion-template/page', method: 'get', params }) as any;
}

export function getRemotionTemplate(id: string): Promise<RemotionTemplateItem> {
  return request({ url: `/remotion-template/${id}`, method: 'get' }) as any;
}

export function createRemotionTemplate(data: Partial<RemotionTemplateItem>): Promise<RemotionTemplateItem> {
  return request({ url: '/remotion-template', method: 'post', data }) as any;
}

export function updateRemotionTemplate(id: string, data: Partial<RemotionTemplateItem>): Promise<RemotionTemplateItem> {
  return request({ url: `/remotion-template/${id}`, method: 'put', data }) as any;
}

export function deleteRemotionTemplate(id: string): Promise<any> {
  return request({ url: `/remotion-template/${id}`, method: 'delete' }) as any;
}

export interface SaveTemplateParam {
  key: string;
  label: string;
  type: 'text' | 'multiline' | 'image' | 'video' | 'audio' | 'number' | 'color' | 'select';
  required?: boolean;
  defaultValue?: string;
  maxLength?: number;
  bindings: string[];
}

/** 从生成记录「存为模板」 */
export function saveTemplateFromRecord(data: {
  recordId: string;
  name: string;
  description?: string;
  category?: string;
  tags?: string[];
  params: SaveTemplateParam[];
  editability?: Record<string, any>;
  scope?: 'private' | 'unlisted' | 'shared';
}): Promise<RemotionTemplateItem> {
  return request({ url: '/remotion-template/save-from-record', method: 'post', data }) as any;
}

/** 套用模板：合并 inputProps 产出渲染载荷 */
export function applyRemotionTemplate(data: {
  template: string;
  inputProps?: Record<string, any>;
}): Promise<any> {
  return request({ url: '/remotion-template/apply', method: 'post', data }) as any;
}

export function exportRemotionTemplate(id: string): Promise<any> {
  return request({ url: `/remotion-template/export/${id}`, method: 'get' }) as any;
}

export function importRemotionTemplate(pkg: any): Promise<RemotionTemplateItem> {
  return request({ url: '/remotion-template/import', method: 'post', data: pkg }) as any;
}
