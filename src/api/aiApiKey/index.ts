import request from "@/config/axios";

export type AiApiKeySource = "mine" | "public" | "missing";

export interface AiApiKeyConfig {
  id?: number;
  name: string;
  model: string;
  apiKey?: string;
  maskedApiKey?: string;
  baseUrl?: string | null;
  enabled: boolean;
  isPublic?: boolean;
  expiresAt?: string | null;
  remark?: string;
  userId?: number | null;
  source?: AiApiKeySource;
  available?: boolean;
  unavailableReasonCode?: string | null;
  unavailableReasonText?: string;
  uploader?: {
    id?: number;
    account?: string;
    name?: string;
  } | null;
  createTime?: string;
  updateTime?: string;
}

export interface AiApiKeyListParams {
  page?: number;
  pageSize?: number;
  keyword?: string;
  enabled?: boolean | string;
  isPublic?: boolean | string;
}

export interface AiApiKeyPageResult {
  list: AiApiKeyConfig[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AiFeatureRegistryItem {
  code: string;
  label: string;
  group: string;
  scene: string;
  description: string;
  defaultSpecCode?: string;
  allowedSpecCodes?: string[];
}

export interface AiProviderSpec {
  code: string;
  label: string;
  category: string;
  description: string;
  capabilities: string[];
  defaultBaseUrl?: string;
  defaultModel?: string;
}

export const getAiApiKeyList = (params?: AiApiKeyListParams) =>
  request.get<AiApiKeyPageResult>({ url: "/system/ai-api-key", params });

export const getPublicAiApiKeyList = () =>
  request.get<AiApiKeyConfig[]>({ url: "/system/ai-api-key/public" });

export const getAiApiKeyUsageOptions = () =>
  request.get<AiApiKeyConfig[]>({ url: "/system/ai-api-key/usage-options" });

export const getAiFeatureRegistry = () =>
  request.get<AiFeatureRegistryItem[]>({ url: "/system/ai-api-key/feature-registry" });

export const getAiProviderSpecs = () =>
  request.get<AiProviderSpec[]>({ url: "/system/ai-api-key/provider-specs" });

export const getAiApiKeyDetail = (id: number) =>
  request.get<AiApiKeyConfig>({ url: `/system/ai-api-key/${id}` });

// 明文密钥单独走 reveal 接口，后端会记审计日志
export const revealAiApiKey = (id: number) =>
  request.post<AiApiKeyConfig>({ url: `/system/ai-api-key/${id}/reveal` });

export const createAiApiKey = (data: AiApiKeyConfig) =>
  request.post({ url: "/system/ai-api-key", data });

export const updateAiApiKey = (id: number, data: Partial<AiApiKeyConfig>) =>
  request.patch({ url: `/system/ai-api-key/${id}`, data });

export const shareAiApiKeyToUsers = (id: number, data: { userIds: Array<number | string> }) =>
  request.post<{
    sourceKeyId: number;
    createdCount: number;
    createdIds: number[];
    skippedUserIds: number[];
  }>({ url: `/system/ai-api-key/${id}/share`, data });

export const deleteAiApiKey = (id: number) => request.delete({ url: `/system/ai-api-key/${id}` });

// 一键应用到所有 AI 功能
export const applyAiApiKeyToAllFeatures = (id: number) =>
  request.post({
    url: `/system/ai-api-key/${id}/apply-to-all`,
  });

export interface AiApiKeyTestParams {
  id?: number;
  apiKey?: string;
  baseUrl?: string | null;
  model?: string | null;
}

export interface AiApiKeyTestResult {
  success: boolean;
  status: "success" | "warning" | "error";
  message: string;
  durationMs: number;
  statusCode?: number;
  modelChecked?: string | null;
  modelFound?: boolean;
  modelsCount?: number;
  availableModelsPreview?: string[];
  endpointType?: "openai-compatible" | "dashscope" | "unknown";
  testedAt: string;
}

// 测试连通性（支持临时凭证或已有配置）
export const testAiApiKey = (data: AiApiKeyTestParams) =>
  request.post<AiApiKeyTestResult>({ url: "/system/ai-api-key/test", data });

// 测试指定已有 Key 连通性
export const testAiApiKeyById = (id: number, data?: Partial<AiApiKeyTestParams>) =>
  request.post<AiApiKeyTestResult>({ url: `/system/ai-api-key/${id}/test`, data: data || {} });

