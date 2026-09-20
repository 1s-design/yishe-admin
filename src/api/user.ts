import request from "@/config/axios";

const LOCAL_CLIENT_SERVER = "http://localhost:1519";

// 获取本地服务密钥（用于调用敏感接口）
async function getLocalClientSecret(): Promise<string> {
  try {
    const res = await fetch(`${LOCAL_CLIENT_SERVER}/api/client-secret`);
    const data = await res.json();
    return data.secret || "";
  } catch {
    return "";
  }
}

// 客户端授权：将 token 传递给 electron 客户端
export async function saveTokenToClient(token: string): Promise<boolean> {
  const secret = await getLocalClientSecret();
  const res = await fetch(`${LOCAL_CLIENT_SERVER}/api/saveToken`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Local-Secret": secret,
    },
    body: JSON.stringify({ token }),
  });
  const data = await res.json();
  if (data.success) return true;
  throw new Error(data.message || "授权失败");
}

export function isClientAuthorized(): Promise<boolean> {
  if (
    typeof window !== "undefined" &&
    (window as any).api &&
    typeof (window as any).api.isTokenExist === "function"
  ) {
    return (window as any).api.isTokenExist();
  } else {
    return Promise.resolve(false);
  }
}

// 获取用户列表
export function getUserList(params: any) {
  return request.post({
    url: "/user/page",
    data: params,
  });
}

// 获取用户信息
export function getUserInfo(id: string) {
  return request.post({
    url: "/user/getUserInfo",
    data: { id },
  });
}

// 创建用户
export function createUser(data: any) {
  return request.post({
    url: "/user/register",
    data,
  });
}

// 更新用户信息
export function updateUser(data: any) {
  return request.post({
    url: "/user/update",
    data,
  });
}

// 删除用户
export function deleteUser(id: string) {
  return request.post({
    url: "/user/delete",
    data: { id },
  });
}

// 修改用户密码
export function updateUserPassword(data: any) {
  return request.post({
    url: "/user/updatePass",
    data,
  });
}

export function getUserSetting(data?: { key?: string }) {
  return request.post({
    url: "/user/getSetting",
    data: data || {},
  });
}

export interface UserPlatformSessionsQuery {
  platform?: string;
  profileId?: string;
}

export interface UserPlatformSessionsUpdatePayload {
  platform: string;
  profileId?: string;
  data: Record<string, any>;
}

export interface UserPlatformSessionActionPayload {
  platform: string;
  profileId?: string;
}

export function getPlatformSessions(data?: UserPlatformSessionsQuery) {
  return request.post<Record<string, any>>({
    url: "/user/getPlatformSessions",
    data: data || {},
  });
}

export function updatePlatformSessions(data: UserPlatformSessionsUpdatePayload) {
  return request.post<Record<string, any>>({
    url: "/user/updatePlatformSessions",
    data,
  });
}

export function deletePlatformSession(data: UserPlatformSessionActionPayload) {
  return request.post<Record<string, any>>({
    url: "/user/deletePlatformSession",
    data,
  });
}

export function validatePlatformSession(data: Required<UserPlatformSessionActionPayload>) {
  return request.post<Record<string, any>>({
    url: "/user/validatePlatformSession",
    data,
  });
}

export function refreshPlatformSessionInfo(data: Required<UserPlatformSessionActionPayload>) {
  return request.post<Record<string, any>>({
    url: "/user/refreshPlatformSessionInfo",
    data,
  });
}

export function updateUserSetting(data: {
  key?: string;
  data?: any;
  setting?: Record<string, any>;
}) {
  return request.post({
    url: "/user/updateSetting",
    data,
  });
}

export function getUserAccessSetting(data: { userId: string }) {
  return request.post<UserAccessControlSetting>({
    url: "/user/getAccessSetting",
    data,
  });
}

export interface UserAccessControlSetting {
  menuKeys: string[];
  roleKeys: string[];
  aiAccessEnabled: boolean;
  effectiveMenuKeys?: string[];
}

export function updateUserAccessSetting(data: {
  userId: string;
  accessControl: UserAccessControlSetting;
}) {
  return request.post<UserAccessControlSetting>({
    url: "/user/updateAccessSetting",
    data,
  });
}

export function getOpenApiSetting() {
  return request.post({
    url: "/user/getOpenApiSetting",
    data: {},
  });
}

export interface UserAiSetting {
  version?: number;
  featureBindings?: Record<
    string,
    Record<
      string,
      {
        keyId: number;
        specCode: string;
        model?: string;
        params?: Record<string, any>;
      }
    >
  >;
  updatedAt?: string;
}

export function getAiSetting() {
  return request.post<UserAiSetting>({
    url: "/user/getAiSetting",
    data: {},
  });
}

export function updateAiSetting(aiSetting: UserAiSetting) {
  return request.post<UserAiSetting>({
    url: "/user/updateAiSetting",
    data: { aiSetting },
  });
}

export function updateOpenApiSetting(data: { enabled: boolean }) {
  return request.post({
    url: "/user/updateOpenApiSetting",
    data,
  });
}

export function generateOpenApiKey() {
  return request.post({
    url: "/user/generateOpenApiKey",
    data: {},
  });
}
