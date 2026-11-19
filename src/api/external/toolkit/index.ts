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

// ============ 抖店商机中心采集 ============

export interface DoudianChapterParams {
  profileId?: string;
  page?: number;
  pageSize?: number;
  clueTypeNew?: number;
}

const doudianChapter = (clientId: string, source: string, params: DoudianChapterParams = {}) => {
  return request.get({
    url: `/external/toolkit/${clientId}/doudian/chapter/${source}`,
    params,
  });
};

export const collectDoudianClues = (clientId: string, params?: DoudianChapterParams) =>
  doudianChapter(clientId, "clues", params);
export const collectDoudianCategories = (clientId: string, params?: DoudianChapterParams) =>
  doudianChapter(clientId, "categories", params);
export const collectDoudianTopics = (clientId: string, params?: DoudianChapterParams) =>
  doudianChapter(clientId, "topics", params);
export const collectDoudianProfits = (clientId: string, params?: DoudianChapterParams) =>
  doudianChapter(clientId, "profits", params);
export const collectDoudianLabels = (clientId: string, params?: DoudianChapterParams) =>
  doudianChapter(clientId, "labels", params);
export const collectDoudianHotWords = (clientId: string, params?: DoudianChapterParams) =>
  doudianChapter(clientId, "hot-words", params);
