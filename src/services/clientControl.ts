import * as WebsocketApi from "@/api/system/websocket";
import type { WebsocketConnectionVO } from "@/api/system/websocket";
import { getUserSetting, updateUserSetting } from "@/api/user";
import { downloadFileToClient, checkFileDownloadedOnClient } from "@/api/external/fileDownload";
import { ElMessage } from "element-plus";

function getResponseData<T = any>(response: any): T {
  return response?.data?.data || response?.data || response || ({} as T);
}

/**
 * 客户端控制服务
 * 用于用户操控自己账号登录的客户端
 */
export class ClientControlService {
  /**
   * 获取当前用户自己的客户端连接列表
   * @param options.lean 仅用于「下发命令前的归属校验」等只读 id 的场景；
   *   客户端详情弹窗（ClientControl/index.vue）不传，保持完整档响应一字不变。
   * @returns 当前用户的客户端连接列表
   */
  static async getMyClients(
    options: { lean?: boolean } = {},
  ): Promise<WebsocketConnectionVO[]> {
    try {
      const response: any = await WebsocketApi.getMyClientNodeViews(options);
      // 处理响应数据：可能是数组，也可能是包装后的对象 { data: [...], code: 0, ... }
      if (Array.isArray(response)) {
        return response;
      } else if (response && typeof response === "object" && Array.isArray(response.data)) {
        return response.data;
      } else {
        console.warn("[ClientControlService] 意外的响应格式:", response);
        return [];
      }
    } catch (error: any) {
      console.error("[ClientControlService] 获取客户端列表失败:", error);
      ElMessage.error(error?.message || "获取客户端列表失败");
      return [];
    }
  }

  /**
   * 发送消息到指定的客户端
   * @param connectionId 连接 ID (clientId)
   * @param data 消息数据
   * @param event 事件名称，默认为 'admin-message'
   * @param silent 是否静默发送（不显示成功消息）
   * @returns 是否发送成功
   */
  static async sendMessage(
    connectionId: string,
    data: any,
    event: string = "admin-message",
    silent: boolean = false,
  ): Promise<boolean> {
    try {
      // 先验证该连接是否属于当前用户
      const myClients = await this.getMyClients({ lean: true });
      const targetClient = myClients.find((client) => client.id === connectionId);

      if (!targetClient) {
        if (!silent) {
          ElMessage.error("无法操作该客户端：不属于当前用户或连接不存在");
        }
        return false;
      }

      // 发送消息
      const response = await WebsocketApi.sendMessageToConnection(connectionId, data, event);

      if (response.success) {
        if (!silent) {
          ElMessage.success("消息发送成功");
        }
        return true;
      } else {
        if (!silent) {
          ElMessage.error(response.message || "消息发送失败");
        }
        return false;
      }
    } catch (error: any) {
      console.error("[ClientControlService] 发送消息失败:", error);
      if (!silent) {
        ElMessage.error(error?.message || "发送消息失败");
      }
      return false;
    }
  }

  /**
   * 发送文本消息到指定的客户端
   * @param connectionId 连接 ID
   * @param text 文本内容
   * @returns 是否发送成功
   */
  static async sendTextMessage(connectionId: string, text: string): Promise<boolean> {
    return this.sendMessage(connectionId, { message: text, type: "text" });
  }

  static async sendServiceCommand(
    clientId: string,
    service: string,
    action: string,
    payload?: any,
    mode: "production" | "debug" | "maintenance" = "production",
    silent: boolean = false,
  ): Promise<boolean> {
    try {
      const myClients = await this.getMyClients({ lean: true });
      const targetClient = myClients.find((client) => client.id === clientId);

      if (!targetClient) {
        if (!silent) {
          ElMessage.error("无法操作该客户端：不属于当前用户或连接不存在");
        }
        return false;
      }

      const response = await WebsocketApi.sendServiceCommand({
        clientId,
        service,
        action,
        mode,
        payload,
      });

      if (response.success) {
        if (!silent) {
          ElMessage.success("服务命令已发送");
        }
        return true;
      }

      if (!silent) {
        ElMessage.error(response.message || "服务命令发送失败");
      }
      return false;
    } catch (error: any) {
      console.error("[ClientControlService] 发送服务命令失败:", error);
      if (!silent) {
        ElMessage.error(error?.message || "发送服务命令失败");
      }
      return false;
    }
  }

  static async setPsAutomationEnabled(
    clientId: string,
    enabled: boolean,
    silent: boolean = false,
  ): Promise<boolean> {
    try {
      const myClients = await this.getMyClients({ lean: true });
      const targetClient = myClients.find((client) => client.id === clientId);

      if (!targetClient) {
        if (!silent) {
          ElMessage.error("无法操作该客户端：不属于当前用户或连接不存在");
        }
        return false;
      }

      const response = enabled
        ? await WebsocketApi.enablePsAutomation(clientId)
        : await WebsocketApi.disablePsAutomation(clientId);

      if (response.success) {
        if (!silent) {
          ElMessage.success(enabled ? "已发送开启自动制作命令" : "已发送关闭自动制作命令");
        }
        return true;
      }

      if (!silent) {
        ElMessage.error(response.message || "自动制作命令发送失败");
      }
      return false;
    } catch (error: any) {
      console.error("[ClientControlService] 设置自动制作状态失败:", error);
      if (!silent) {
        ElMessage.error(error?.message || "设置自动制作状态失败");
      }
      return false;
    }
  }

  static async setPsAutomationAutoDispatchEnabled(
    clientId: string,
    enabled: boolean,
    silent: boolean = false,
  ): Promise<boolean> {
    try {
      const response = await WebsocketApi.togglePsAutomationAutoDispatch(clientId, enabled);
      if (response.success) {
        if (!silent) {
          ElMessage.success(enabled ? "已开启该客户端自动接单" : "已关闭该客户端自动接单");
        }
        return true;
      }

      if (!silent) {
        ElMessage.error(response.message || "客户端自动接单更新失败");
      }
      return false;
    } catch (error: any) {
      console.error("[ClientControlService] 设置客户端自动接单失败:", error);
      if (!silent) {
        ElMessage.error(error?.message || "设置客户端自动接单失败");
      }
      return false;
    }
  }

  static async getPsAutomationUserSetting(): Promise<{ autoSchedulingEnabled: boolean }> {
    try {
      const response: any = await getUserSetting({ key: "psAutomation" });
      const data = response?.data || response || {};
      return {
        autoSchedulingEnabled: !!data?.autoSchedulingEnabled,
      };
    } catch (error: any) {
      console.error("[ClientControlService] 获取用户调度设置失败:", error);
      return { autoSchedulingEnabled: false };
    }
  }

  private static async getRawPsAutomationUserSetting(): Promise<Record<string, any>> {
    try {
      const response: any = await getUserSetting({ key: "psAutomation" });
      const data = response?.data || response || {};
      return data && typeof data === "object" && !Array.isArray(data) ? data : {};
    } catch (error: any) {
      console.error("[ClientControlService] 获取用户自动制作设置失败:", error);
      return {};
    }
  }

  static async setPsAutomationUserAutoScheduling(
    enabled: boolean,
    silent: boolean = false,
    target?: {
      clientId?: string | null;
      machineCode?: string | null;
      filters?: Record<string, any> | null;
    },
  ): Promise<{ success: boolean; dispatched?: boolean; reason?: string; message?: string }> {
    try {
      const currentSetting = await this.getRawPsAutomationUserSetting();
      const clientId = String(target?.clientId || "").trim();
      const machineCode = String(target?.machineCode || "").trim();
      const nextClientId =
        enabled ? clientId : String(currentSetting.autoDispatchClientId || "").trim();
      const nextMachineCode =
        enabled ? machineCode : String(currentSetting.autoDispatchMachineCode || "").trim();
      await updateUserSetting({
        key: "psAutomation",
        data: {
          autoSchedulingEnabled: enabled,
          autoDispatchClientId: nextClientId || undefined,
          autoDispatchMachineCode: nextMachineCode || undefined,
          autoDispatchFilters:
            target?.filters !== undefined
              ? target.filters || {}
              : currentSetting.autoDispatchFilters || {},
        },
      });

      let triggerResult:
        | { success: boolean; dispatched: boolean; reason?: string; message?: string }
        | undefined;

      triggerResult = getResponseData(await WebsocketApi.triggerPsdSetAutoDispatch());

      const resultMessage = !enabled
        ? "已关闭自动制作"
        : triggerResult?.message || "已开启自动制作，目标客户端会主动领取待制作套图";

      if (!silent) {
        if (!enabled) {
          ElMessage.success("已关闭自动制作");
        } else if (
          triggerResult?.reason === "no-pending" ||
          triggerResult?.reason === "no-client" ||
          triggerResult?.reason === "has-processing" ||
          triggerResult?.reason === "no-binding" ||
          triggerResult?.reason === "disabled" ||
          triggerResult?.reason === "client-pull-required"
        ) {
          ElMessage.info(resultMessage);
        } else if (!triggerResult?.success || triggerResult?.reason === "dispatch-failed") {
          ElMessage.warning(resultMessage);
        } else {
          ElMessage.success(resultMessage);
        }
      }
      return {
        success: true,
        dispatched: triggerResult?.dispatched,
        reason: triggerResult?.reason,
        message: resultMessage,
      };
    } catch (error: any) {
      console.error("[ClientControlService] 设置用户调度开关失败:", error);
      if (!silent) {
        ElMessage.error(error?.message || "设置自动制作失败");
      }
      return {
        success: false,
        dispatched: false,
        message: error?.message || "设置自动制作失败",
      };
    }
  }

  /**
   * 检查连接是否属于当前用户
   * @param connectionId 连接 ID
   * @returns 是否属于当前用户
   */
  static async isMyClient(connectionId: string): Promise<boolean> {
    const myClients = await this.getMyClients({ lean: true });
    return myClients.some((client) => client.id === connectionId);
  }

  /**
   * 获取当前用户的客户端数量
   * @returns 客户端数量
   */
  static async getMyClientCount(): Promise<number> {
    const myClients = await this.getMyClients({ lean: true });
    return myClients.length;
  }

  /**
   * 下载文件到指定客户端的工作目录
   * @param clientId 客户端连接 ID
   * @param url 文件 URL
   * @param silent 是否静默执行
   * @returns 下载结果
   */
  static async downloadFileToClient(
    clientId: string,
    url: string,
    silent: boolean = false,
  ): Promise<{ success: boolean; message: string; filePath?: string; fileSize?: number }> {
    try {
      const myClients = await this.getMyClients({ lean: true });
      const targetClient = myClients.find((client) => client.id === clientId);

      if (!targetClient) {
        return { success: false, message: "客户端不存在或不属于当前用户" };
      }

      const response: any = await downloadFileToClient(clientId, url);
      const data = response?.data?.data || response?.data || response || {};

      if (data.success) {
        if (!silent) {
          ElMessage.success(data.message || "文件下载成功");
        }
        return {
          success: true,
          message: data.message,
          filePath: data.filePath,
          fileSize: data.fileSize,
        };
      }

      if (!silent) {
        ElMessage.error(data.message || "文件下载失败");
      }
      return { success: false, message: data.message || "下载失败" };
    } catch (error: any) {
      console.error("[ClientControlService] 下载文件到客户端失败:", error);
      if (!silent) {
        ElMessage.error(error?.message || "下载文件到客户端失败");
      }
      return { success: false, message: error?.message || "下载失败" };
    }
  }

  /**
   * 根据 URL 查询客户端本地文件路径
   * @param clientId 客户端连接 ID
   * @param url 文件 URL
   * @returns 查询结果
   */
  static async checkFileDownloaded(
    clientId: string,
    url: string,
    _silent: boolean = false,
  ): Promise<{
    success: boolean;
    found: boolean;
    message: string;
    filePath?: string;
    fileSize?: number;
  }> {
    try {
      const myClients = await this.getMyClients({ lean: true });
      const targetClient = myClients.find((client) => client.id === clientId);

      if (!targetClient) {
        return { success: false, found: false, message: "客户端不存在" };
      }

      const response: any = await checkFileDownloadedOnClient(clientId, url);
      const data = response?.data?.data || response?.data || response || {};

      if (data.success) {
        const resultData = data.data || {};
        return {
          success: true,
          found: !!resultData.found,
          message: data.message,
          filePath: resultData.filePath || resultData.entry?.filePath,
          fileSize: resultData.fileSize || resultData.entry?.fileSize,
        };
      }

      return { success: false, found: false, message: data.message || "查询失败" };
    } catch (error: any) {
      console.error("[ClientControlService] 查询文件路径失败:", error);
      return { success: false, found: false, message: error?.message || "查询失败" };
    }
  }
}
