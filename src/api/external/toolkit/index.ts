import request from "@/config/axios";
import type {
  BrowserAutomationClientVO,
  BrowserAutomationCommandResponse,
  BrowserAutomationProfilesPayload,
  BrowserAutomationSmallFeatureItem,
} from "@/api/external/browserAutomation";

export type ToolkitClientVO = BrowserAutomationClientVO;
export type ToolkitProfilesPayload = BrowserAutomationProfilesPayload;
export type ToolkitToolItem = BrowserAutomationSmallFeatureItem;

export const getToolkitClients = () => {
  return request.get<ToolkitClientVO[]>({
    url: "/external/toolkit/clients",
  });
};

export const getToolkitProfiles = (clientId: string) => {
  return request.get<BrowserAutomationCommandResponse>({
    url: `/external/toolkit/${clientId}/profiles`,
  });
};

export const getToolkitTools = (clientId: string) => {
  return request.get<BrowserAutomationCommandResponse>({
    url: `/external/toolkit/${clientId}/tools`,
  });
};

export const runToolkitTool = (clientId: string, data: Record<string, any>) => {
  return request.post<BrowserAutomationCommandResponse>({
    url: `/external/toolkit/${clientId}/tools/run`,
    data,
  });
};

// ============ 抖店商机搜索（搜索词） ============

export interface DoudianSearchParams {
  keyword: string;
  page?: number;
  pageSize?: number;
  profileId?: string;
}

export const collectDoudianSearch = (clientId: string, params: DoudianSearchParams) => {
  return request.get({
    url: `/external/toolkit/${clientId}/doudian/search`,
    params,
  });
};

// ============ 抖店商机采集（双通道 + 类目关键词） ============

export interface DoudianOpportunityParams {
  channel?: "all_product" | "all_word";
  keyword: string;
  page?: number;
  pageSize?: number;
  profileId?: string;
}

export const collectDoudianOpportunity = (clientId: string, params: DoudianOpportunityParams) => {
  return request.get({
    url: `/external/toolkit/${clientId}/doudian/opportunity`,
    params,
  });
};
