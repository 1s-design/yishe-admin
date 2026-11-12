import { getUserSetting, updateUserSetting } from "@/api/user";
import { triggerPublishTaskAutoDispatch } from "@/api/system/websocket";

export interface PublishTaskAutoDispatchSetting {
  autoSchedulingEnabled: boolean;
  autoDispatchClientId: string;
  autoDispatchMachineCode: string;
  autoDispatchProfileId: string;
  /**
   * 店铺路由模式（抖店）。
   *
   * 开启后不再要求"某个固定客户端 + 某个固定环境"来领任务，
   * 而是由服务端按「任务绑定的店铺」去找「当前登录了该店铺的环境」。
   * 于是两个店铺分别登在两个环境（甚至两台设备）时，
   * 各自的环境都能领到自己店铺的任务，互不串店。
   */
  shopRoutedDispatch: boolean;
  autoDispatchFilter: PublishTaskAutoDispatchFilter;
}

export interface PublishTaskAutoDispatchFilter {
  taskTypes: string[];
  includeKeywords: string[];
  excludeKeywords: string[];
  createdAfter: string;
  createdBefore: string;
  /**
   * 执行店铺白名单（shop.id）。空 = 不限。
   * 只约束有店铺归属的任务，其他平台任务不受影响。
   */
  shopIds: string[];
  /**
   * 执行发布配置白名单（publish_config.id）。空 = 不限。
   * 品类由发布配置表达，勾选后只有这些配置生成的任务会自动执行，
   * 例如只勾鼠标垫配置即可实现「只自动发鼠标垫」。
   */
  publishConfigIds: string[];
}

const normalizeStringArray = (value?: any): string[] => {
  if (Array.isArray(value)) {
    return value.map((item) => String(item || "").trim()).filter(Boolean);
  }
  return String(value || "")
    .split(/[,，\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
};

const normalizePublishTaskAutoDispatchFilter = (value?: any): PublishTaskAutoDispatchFilter => ({
  taskTypes: normalizeStringArray(value?.taskTypes),
  includeKeywords: normalizeStringArray(value?.includeKeywords),
  excludeKeywords: normalizeStringArray(value?.excludeKeywords),
  createdAfter: String(value?.createdAfter || "").trim(),
  createdBefore: String(value?.createdBefore || "").trim(),
  shopIds: normalizeStringArray(value?.shopIds),
  publishConfigIds: normalizeStringArray(value?.publishConfigIds),
});

const normalizePublishTaskAutoDispatchSetting = (value?: any): PublishTaskAutoDispatchSetting => ({
  autoSchedulingEnabled: !!value?.autoSchedulingEnabled,
  autoDispatchClientId: String(value?.autoDispatchClientId || "").trim(),
  autoDispatchMachineCode: String(value?.autoDispatchMachineCode || "").trim(),
  autoDispatchProfileId: String(value?.autoDispatchProfileId || "").trim(),
  shopRoutedDispatch: value?.shopRoutedDispatch === true,
  autoDispatchFilter: normalizePublishTaskAutoDispatchFilter(value?.autoDispatchFilter),
});

export const loadPublishTaskAutoDispatchSetting = async () => {
  try {
    const response: any = await getUserSetting({ key: "browserAutomation" });
    const data = response?.data || response || {};
    return normalizePublishTaskAutoDispatchSetting(data);
  } catch {
    return normalizePublishTaskAutoDispatchSetting();
  }
};

export const enablePublishTaskAutoDispatch = async (target: {
  clientId: string;
  machineCode?: string | null;
  /** 店铺路由模式下可不选环境：环境由「店铺当前登录在哪」运行时决定 */
  profileId?: string;
  shopRoutedDispatch?: boolean;
  filter?: Partial<PublishTaskAutoDispatchFilter>;
}) => {
  const nextSetting = normalizePublishTaskAutoDispatchSetting({
    autoSchedulingEnabled: true,
    autoDispatchClientId: target.clientId,
    autoDispatchMachineCode: target.machineCode,
    autoDispatchProfileId: target.profileId,
    shopRoutedDispatch: target.shopRoutedDispatch,
    autoDispatchFilter: target.filter,
  });

  await updateUserSetting({
    key: "browserAutomation",
    data: {
      autoSchedulingEnabled: true,
      autoDispatchClientId: nextSetting.autoDispatchClientId,
      autoDispatchMachineCode: nextSetting.autoDispatchMachineCode || undefined,
      autoDispatchProfileId: nextSetting.autoDispatchProfileId || undefined,
      shopRoutedDispatch: nextSetting.shopRoutedDispatch,
      autoDispatchFilter: nextSetting.autoDispatchFilter,
    },
  });

  const triggerResult = {
    success: true,
    dispatched: false,
    reason: "trigger-scheduled",
    message: nextSetting.shopRoutedDispatch
      ? "已开启店铺路由自动执行：任务会按绑定店铺派给当前登录该店铺的环境"
      : "已保存自动执行设置并开启，目标客户端会使用指定浏览器环境领取待执行任务",
  };
  void triggerPublishTaskAutoDispatch().catch(() => undefined);

  return {
    setting: nextSetting,
    triggerResult,
  };
};

export const disablePublishTaskAutoDispatch = async (currentSetting?: {
  clientId?: string | null;
  machineCode?: string | null;
  profileId?: string | null;
  shopRoutedDispatch?: boolean;
  filter?: Partial<PublishTaskAutoDispatchFilter> | null;
}) => {
  const nextSetting = normalizePublishTaskAutoDispatchSetting({
    autoSchedulingEnabled: false,
    autoDispatchClientId: currentSetting?.clientId,
    autoDispatchMachineCode: currentSetting?.machineCode,
    autoDispatchProfileId: currentSetting?.profileId,
    shopRoutedDispatch: currentSetting?.shopRoutedDispatch,
    autoDispatchFilter: currentSetting?.filter,
  });

  await updateUserSetting({
    key: "browserAutomation",
    data: {
      autoSchedulingEnabled: false,
      autoDispatchClientId: nextSetting.autoDispatchClientId || undefined,
      autoDispatchMachineCode: nextSetting.autoDispatchMachineCode || undefined,
      autoDispatchProfileId: nextSetting.autoDispatchProfileId || undefined,
      shopRoutedDispatch: nextSetting.shopRoutedDispatch,
      autoDispatchFilter: nextSetting.autoDispatchFilter,
    },
  });

  return nextSetting;
};
