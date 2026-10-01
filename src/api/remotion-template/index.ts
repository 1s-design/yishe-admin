import request from '@/config/axios';

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
}) {
  return request.get({
    url: '/remotion-template/page',
    params,
  }) as unknown as Promise<{ list: RemotionTemplateItem[]; total: number }>;
}

export function getRemotionTemplate(id: string) {
  return request.get({
    url: `/remotion-template/${id}`,
  }) as unknown as Promise<RemotionTemplateItem>;
}

export function createRemotionTemplate(data: Partial<RemotionTemplateItem>) {
  return request.post({
    url: '/remotion-template',
    data,
  }) as unknown as Promise<RemotionTemplateItem>;
}

export function updateRemotionTemplate(id: string, data: Partial<RemotionTemplateItem>) {
  return request.put({
    url: `/remotion-template/${id}`,
    data,
  }) as unknown as Promise<RemotionTemplateItem>;
}

export function deleteRemotionTemplate(id: string) {
  return request.delete({
    url: `/remotion-template/${id}`,
  }) as unknown as Promise<any>;
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
}) {
  return request.post({
    url: '/remotion-template/save-from-record',
    data,
  }) as unknown as Promise<RemotionTemplateItem>;
}

/** 从代码创建模板（自动识别变量） */
export function saveTemplateFromCode(data: {
  name: string;
  description?: string;
  code: string;
  componentName?: string;
  width?: number;
  height?: number;
  fps?: number;
  durationInFrames?: number;
  category?: string;
  tags?: string[];
  coverUrl?: string;
  defaultProps?: Record<string, any>;
}) {
  return request.post({
    url: '/remotion-template/save-from-code',
    data,
  }) as unknown as Promise<RemotionTemplateItem>;
}

/** 套用模板：合并 inputProps 产出渲染载荷 */
export function applyRemotionTemplate(data: {
  template: string;
  inputProps?: Record<string, any>;
}) {
  return request.post({
    url: '/remotion-template/apply',
    data,
  }) as unknown as Promise<any>;
}

export function exportRemotionTemplate(id: string) {
  return request.get({
    url: `/remotion-template/export/${id}`,
  }) as unknown as Promise<any>;
}

export function importRemotionTemplate(pkg: any) {
  return request.post({
    url: '/remotion-template/import',
    data: pkg,
  }) as unknown as Promise<RemotionTemplateItem>;
}
