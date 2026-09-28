import request from "@/config/axios";

// ─── 类型定义（与 design-server src/ai-role/entities/ai-role.entity.ts 对应） ───

export interface AiRoleExampleDialogue {
  user: string;
  assistant: string;
}

export interface AiRoleIdentity {
  personaPrompt?: string;
  expertise?: string[];
  exampleDialogues?: AiRoleExampleDialogue[];
}

export interface AiRoleStyle {
  tone?: "casual" | "professional" | "humorous" | "sharp" | "warm" | "cold";
  verbosity?: "minimal" | "concise" | "moderate" | "detailed";
  emoji?: "none" | "light" | "moderate" | "heavy";
  languageStyle?: "colloquial" | "written" | "mixed" | "technical";
  sentenceLength?: "short" | "medium" | "long";
  structure?: "paragraph" | "bullet" | "numbered" | "mixed";
  cta?: string;
  customRules?: string[];
}

export interface AiRole {
  id?: string;
  key: string;
  name: string;
  avatar?: string | null;
  description?: string | null;
  category?: string;
  tags?: string[];
  identity?: AiRoleIdentity;
  style?: AiRoleStyle;
  preferences?: string[];
  extensions?: Record<string, unknown> | null;
  isPublic?: boolean;
  enabled?: boolean;
  sortOrder?: number;
  owner?: { id: number; name?: string; avatar?: string } | null;
  createTime?: string;
  updateTime?: string;
}

export interface AiRolePageParams {
  currentPage?: number;
  pageSize?: number;
  keyword?: string;
  category?: string;
  enabled?: boolean;
}

export interface AiRolePageResult {
  list: AiRole[];
  total: number;
  currentPage: number;
  pageSize: number;
  totalPage: number;
}

// ─── API ───

export const getAiRolePage = (data: AiRolePageParams) =>
  request.post<AiRolePageResult>({ url: "/ai-role/page", data });

export const getAiRoleList = () => request.get<AiRole[]>({ url: "/ai-role/list" });

export const getAiRoleSimpleList = () =>
  request.get<Array<Pick<AiRole, "id" | "key" | "name" | "avatar" | "category">>>({
    url: "/ai-role/simple-list",
  });

export const getAiRole = (id: string) => request.get<AiRole>({ url: `/ai-role/${id}` });

export const createAiRole = (data: AiRole) =>
  request.post<AiRole>({ url: "/ai-role/create", data });

export const updateAiRole = (data: Partial<AiRole> & { id: string }) =>
  request.post<AiRole>({ url: "/ai-role/update", data });

export const deleteAiRole = (ids: string | string[]) =>
  request.post<{ removedCount: number }>({
    url: "/ai-role/delete",
    data: { ids: Array.isArray(ids) ? ids : [ids] },
  });

export const previewAiRolePrompt = (data: { idOrKey: string; includeExamples?: boolean }) =>
  request.post<{ role: { id: string; key: string; name: string }; prompt: string }>({
    url: "/ai-role/preview-prompt",
    data,
  });

export const createAiRoleSnapshot = (data: { idOrKey: string }) =>
  request.post<Record<string, unknown>>({ url: "/ai-role/snapshot", data });
