import axios, { AxiosError, AxiosInstance, AxiosResponse, InternalAxiosRequestConfig } from "axios";

import { ElMessage, ElMessageBox, ElNotification } from "element-plus";
import qs from "qs";
import { config } from "@/config/axios/config";
import { getAccessToken, removeToken } from "@/utils/auth";
import errorCode from "./errorCode";
import { useUserStoreWithOut } from "@/store/modules/user";
import { useDataScopeStoreWithOut } from "@/store/modules/dataScope";

import { deleteUserCache } from "@/hooks/web/useCache";

const { result_code, base_url, request_timeout } = config;

export type OwnershipInjectionMode = "auto" | "force" | "skip";

type OwnershipAwareRequestConfig = InternalAxiosRequestConfig & {
  ownership?: OwnershipInjectionMode;
};

const legacyOwnershipExcludedKeywords = [
  "/login",
  "/refresh-token",
  "/page",
  "/list",
  "/delete",
  "/remove",
];
const authLikeOwnershipExcludedPatterns = [
  /^\/auth(\/|$)/i,
  /^\/api\/auth(\/|$)/i,
  /^\/open(\/|$)/i,
  /\/captcha(\/|$)/i,
];

// 这是兼容历史接口的兜底列表。更推荐的新方式是：
// 1. 后端在 service 中统一用 DataAccessScopeService.resolveRequestedUserId(user) 决定 owner
// 2. 如果某个旧接口仍然依赖前端补 userId，请在调用处使用 request.postOwned / putOwned / patchOwned
const legacyOwnershipWriteKeywords = [
  "/create",
  "/design-request",
  "/common-url",
  "/text-document",
  "/product",
  "/asset-3d",
  "/ai/tti-record",
  "/ai/tts-record",
  "/ai/tts/qwen/custom-voice",
  "/ai/tts/mimo/custom-voice",
  "/remotion-video-record",
  "/sticker-psd-set",
  "/sticker/story-script",
  "/sticker/create",
  "/sticker/update",
  "/sticker/copy",
  "/sticker/sticker-folder/create",
  "/psd-template/create",
  "/font-template/create",
  "/custom-model/create",
  "/file-resource/create",
  "/draft/create",
  "/crawler/material/add",
  "/crawler/material/update",
];
const isPlainObject = (value: unknown): value is Record<string, any> => {
  return Object.prototype.toString.call(value) === "[object Object]";
};

const normalizeUrlPath = (url = "") => {
  const [path = ""] = url.split("?");
  const normalizedUrl = path.startsWith("/") ? path : `/${path}`;
  return normalizedUrl.replace(/\/{2,}/g, "/");
};

const canCarryOwnership = (payload: unknown) =>
  payload instanceof FormData || isPlainObject(payload);

const normalizeOwnershipUserId = (userId: unknown) => {
  if (userId === undefined || userId === null || userId === "") {
    return "";
  }

  return String(userId);
};

const shouldInjectOwnership = (config: OwnershipAwareRequestConfig, currentUserId: string) => {
  if (!currentUserId || !canCarryOwnership(config.data)) {
    return false;
  }

  const mode = config.ownership || "auto";
  if (mode === "skip") {
    return false;
  }

  const normalizedUrl = normalizeUrlPath(config.url || "");
  if (authLikeOwnershipExcludedPatterns.some((pattern) => pattern.test(normalizedUrl))) {
    return false;
  }

  const upperMethod = String(config.method || "").toUpperCase();
  if (!["POST", "PUT", "PATCH"].includes(upperMethod)) {
    return false;
  }

  if (mode === "force") {
    return true;
  }

  if (legacyOwnershipExcludedKeywords.some((keyword) => normalizedUrl.includes(keyword))) {
    return false;
  }

  return legacyOwnershipWriteKeywords.some((keyword) => normalizedUrl.includes(keyword));
};

const applyOwnershipToPayload = (payload: unknown, userId: string) => {
  if (payload instanceof FormData) {
    const normalizedUserId = normalizeOwnershipUserId(payload.get("userId")) || userId;
    if (normalizedUserId) {
      if (typeof payload.set === "function") {
        payload.set("userId", normalizedUserId);
      } else {
        payload.delete("userId");
        payload.append("userId", normalizedUserId);
      }
    }
    return payload;
  }

  if (!isPlainObject(payload)) {
    return payload;
  }

  const normalizedUserId = normalizeOwnershipUserId(payload.userId) || userId;
  if (normalizedUserId) {
    payload.userId = normalizedUserId;
  }
  return payload;
};

const normalizeErrorMessagePart = (value: unknown): string => {
  if (value === undefined || value === null || value === "") {
    return "";
  }
  if (Array.isArray(value)) {
    return value.map(normalizeErrorMessagePart).filter(Boolean).join("; ");
  }
  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
};

const getResponseErrorMessage = (error: AxiosError): string => {
  const status = error.response?.status;
  const data = error.response?.data as any;
  const parts = [
    data?.message,
    data?.msg,
    data?.error,
    data?.details,
    data?.detail,
    data?.errors,
  ]
    .map(normalizeErrorMessagePart)
    .filter(Boolean);

  if (parts.length) {
    return status ? `请求失败 ${status}: ${parts.join("; ")}` : parts.join("; ");
  }

  return "";
};

// 需要忽略的提示。忽略后，自动 Promise.reject('error')
const ignoreMsgs = [
  "无效的刷新令牌", // 刷新令牌被删除时，不用提示
  "刷新令牌已过期", // 使用刷新令牌，刷新获取新的访问令牌时，结果因为过期失败，此时需要忽略。否则，会导致继续 401，无法跳转到登出界面
];
// 是否显示重新登录
export const isRelogin = { show: false };
// Axios 无感知刷新令牌，参考 https://www.dashingdog.cn/article/11 与 https://segmentfault.com/a/1190000020210980 实现
// 请求白名单，无须token的接口
const whiteList: string[] = ["/login", "/refresh-token"];

// 创建axios实例
const service: AxiosInstance = axios.create({
  baseURL: base_url, // api 的 base_url
  timeout: request_timeout, // 请求超时时间
  withCredentials: false, // 禁用 Cookie 等信息
  // 自定义参数序列化函数
  paramsSerializer: (params) => {
    return qs.stringify(params, { allowDots: true });
  },
});

// request拦截器
service.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const ownershipConfig = config as OwnershipAwareRequestConfig;
    // 是否需要设置 token
    const requestHeaders = config.headers as any;
    let isToken = requestHeaders?.isToken === false;
    const isLoginEndpoint = config.url && config.url.indexOf("/auth/login") > -1;

    // 登录接口必须只使用本次输入的账号密码，避免残留 token 干扰后端鉴权判断。
    if (isLoginEndpoint) {
      delete config.headers.Authorization;
      isToken = false;
    } else {
      // 其他接口按原逻辑处理
      whiteList.some((v) => {
        if (config.url && config.url.indexOf(v) > -1) {
          return (isToken = false);
        }
      });
      if (getAccessToken() && !isToken) {
        config.headers.Authorization = "Bearer " + getAccessToken(); // 让每个请求携带自定义token
      }
    }

    const url = config.url || "";
    const userStore = useUserStoreWithOut();
    const currentUserId = userStore.user?.id ? String(userStore.user.id) : "";
    const isAdmin = !!userStore.user?.isAdmin;
    if (isAdmin) {
      const dataScopeStore = useDataScopeStoreWithOut();
      const { mode, userId } = dataScopeStore.headerPayload;
      config.headers["x-data-scope-mode"] = mode;
      if (mode === "user" && userId) {
        config.headers["x-data-scope-user-id"] = userId;
      } else {
        delete config.headers["x-data-scope-user-id"];
      }
    } else {
      delete config.headers["x-data-scope-mode"];
      delete config.headers["x-data-scope-user-id"];
    }

    if (shouldInjectOwnership(ownershipConfig, currentUserId)) {
      config.data = applyOwnershipToPayload(config.data, currentUserId);
    }

    const method = config.method?.toUpperCase();
    // 防止 GET 请求缓存
    if (method === "GET") {
      config.headers["Cache-Control"] = "no-cache";
      config.headers["Pragma"] = "no-cache";
    }
    // 自定义参数序列化函数
    else if (method === "POST") {
      const contentType = config.headers["Content-Type"] || config.headers["content-type"];
      if (contentType === "application/x-www-form-urlencoded") {
        if (config.data && typeof config.data !== "string") {
          config.data = qs.stringify(config.data);
        }
      }
    }
    return config;
  },
  (error: AxiosError) => {
    // Do something with request error
    console.log(error); // for debug
    return Promise.reject(error);
  },
);

// response 拦截器
service.interceptors.response.use(
  async (response: AxiosResponse<any>) => {
    let { data } = response;
    const config = response.config;
    if (!data) {
      // 返回“[HTTP]请求没有返回值”;
      throw new Error();
    }
    const { t } = useI18n();
    // 未设置状态码则默认成功状态
    // 二进制数据则直接返回，例如说 Excel 导出
    if (
      response.request.responseType === "blob" ||
      response.request.responseType === "arraybuffer"
    ) {
      // 注意：如果导出的响应为 json，说明可能失败了，不直接返回进行下载
      if (response.data.type !== "application/json") {
        return response.data;
      }
      data = await new Response(response.data).json();
    }
    const code = data.code ?? result_code;
    // 获取错误信息，优先使用 message 字段（后端 NestJS 标准格式），其次使用 msg
    const msg = data.message || data.msg || errorCode[code] || errorCode["default"];
    if (ignoreMsgs.indexOf(msg) !== -1) {
      // 如果是忽略的错误码，直接返回 msg 异常
      return Promise.reject(msg);
    } else if (code === 401) {
      // 检查是否是 getUserInfo 接口，如果是，不立即登出，让调用方处理
      const url = config.url || "";
      if (url.includes("/user/getUserInfo")) {
        // getUserInfo 接口的 401 错误，返回错误信息，让调用方决定是否登出
        return Promise.reject({ code: 401, message: msg, response: response });
      }
      // 其他接口的 401 错误，直接未授权，强制登出并跳转首页
      return handleAuthorized(msg);
    } else if (
      code === 403 &&
      (String(msg || "").includes("账号已被禁用") || String(msg || "").includes("账号已过期"))
    ) {
      return handleAuthorized(msg);
    } else if (code === 500) {
      // 如果后端返回的 500 错误包含明确的服务不可用提示（例如 Remotion 服务未启动），
      // 则优先展示后端提供的具体消息，便于用户定位问题；否则展示通用提示。
      const lowerMsg = (msg || "").toLowerCase();
      if (
        lowerMsg.includes("remotion") ||
        lowerMsg.includes("connection refused") ||
        lowerMsg.includes("econnrefused") ||
        lowerMsg.includes("connectionrefused")
      ) {
        ElMessage.error(msg);
      } else {
        ElMessage.error(t("sys.api.errMsg500"));
      }
      return Promise.reject(new Error(msg));
    } else if (code === 901) {
      ElMessage.error({
        offset: 300,
        dangerouslyUseHTMLString: true,
        message:
          "<div>" +
          t("sys.api.errMsg901") +
          "</div>" +
          "<div> &nbsp; </div>" +
          "<div>参考 https://doc.iocoder.cn/ 教程</div>" +
          "<div> &nbsp; </div>" +
          "<div>5 分钟搭建本地环境</div>",
      });
      return Promise.reject(new Error(msg));
    } else if (code !== 200 && code !== 0) {
      if (msg === "无效的刷新令牌") {
        // hard coding：忽略这个提示，直接登出
        console.log(msg);
        return handleAuthorized(msg);
      } else {
        ElMessage.error(msg);
      }
      return Promise.reject("error");
    } else {
      return data;
    }
  },
  (error: AxiosError) => {
    console.log("err" + error); // for debug
    let { message } = error;
    const responseMessage = getResponseErrorMessage(error);
    const { t } = useI18n();
    if (responseMessage) {
      message = responseMessage;
    } else if (message === "Network Error") {
      message = t("sys.api.errorMessage");
    } else if (message.includes("timeout")) {
      message = t("sys.api.apiTimeoutMessage");
    } else if (message.includes("Request failed with status code")) {
      message = t("sys.api.apiRequestFailed") + message.substr(message.length - 3);
    }
    // 新增401处理
    if (
      error.response &&
      (error.response.status === 401 ||
        (error.response.status === 403 &&
          (String((error as any)?.response?.data?.message || "").includes("账号已被禁用") ||
            String((error as any)?.response?.data?.message || "").includes("账号已过期"))))
    ) {
      return handleAuthorized(String((error as any)?.response?.data?.message || ""));
    }
    ElMessage.error(message);
    return Promise.reject(error);
  },
);

const handleAuthorized = (reason?: string) => {
  const { t } = useI18n();
  const dialogMessage = String(reason || "").trim() || t("sys.api.timeoutMessage");
  const isAccessDeniedMessage =
    dialogMessage.includes("账号已被禁用") || dialogMessage.includes("账号已过期");
  if (!isRelogin.show) {
    isRelogin.show = true;
    ElMessageBox.confirm(dialogMessage, t("common.confirmTitle"), {
      showCancelButton: false,
      closeOnClickModal: false,
      showClose: false,
      closeOnPressEscape: false,
      confirmButtonText: isAccessDeniedMessage ? t("common.ok") : t("login.relogin"),
      type: "warning",
    }).then(() => {
      // resetRouter() // 重置静态路由表
      deleteUserCache(); // 删除用户缓存
      removeToken();
      isRelogin.show = false;
      // 直接跳转到登录页，而不是刷新当前页面
      window.location.href = "/#/login";
    });
  }
  return Promise.reject(dialogMessage);
};
export { service };
