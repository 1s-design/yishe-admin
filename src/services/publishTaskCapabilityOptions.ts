import { ref } from "vue";
import {
  getPublishTaskCapabilityCatalog,
  type PublishTaskCapabilityTaskType,
} from "@/api/system/queue";
import {
  TASK_TYPE_OPTIONS,
  isPublishMediaFamily,
  resolveTaskTypePlatform,
  getTaskTypeLabel,
} from "@/config/task-types";

export interface PublishTaskTypeOption {
  label: string;
  value: string;
  platform: string;
  platformLabel?: string | null;
  taskKind: "publish-product" | "publish-media";
}

function normalizeResponseData(response: any): any {
  return response?.data?.data ?? response?.data ?? response ?? {};
}

function normalizeTaskTypeOption(
  item: Partial<PublishTaskCapabilityTaskType>,
): PublishTaskTypeOption | null {
  const value = String(item?.taskType || "").trim();
  if (!value) return null;

  const platform = String(item?.platform || resolveTaskTypePlatform(value) || "").trim();
  return {
    value,
    label: String(item?.label || getTaskTypeLabel(value, platform) || value).trim(),
    platform,
    platformLabel: item?.platformLabel ?? null,
    taskKind: isPublishMediaFamily(value) ? "publish-media" : "publish-product",
  };
}

function buildFallbackOptions(): PublishTaskTypeOption[] {
  return TASK_TYPE_OPTIONS.map((item) =>
    normalizeTaskTypeOption({
      taskType: item.value,
      label: item.label,
      platform: resolveTaskTypePlatform(item.value),
    }),
  ).filter(Boolean) as PublishTaskTypeOption[];
}

function normalizeCatalogOptions(data: any): PublishTaskTypeOption[] {
  const candidates = Array.isArray(data?.taskTypes)
    ? data.taskTypes
    : Array.isArray(data?.server?.taskTypes)
      ? data.server.taskTypes
      : Array.isArray(data?.browserAutomation?.declaredTaskTypes)
        ? data.browserAutomation.declaredTaskTypes
        : [];

  const seen = new Set<string>();
  const options: PublishTaskTypeOption[] = [];
  candidates.forEach((item: any) => {
    const option = normalizeTaskTypeOption(item);
    if (!option || seen.has(option.value)) return;
    seen.add(option.value);
    options.push(option);
  });
  return options;
}

export const publishTaskTypeOptions = ref<PublishTaskTypeOption[]>(buildFallbackOptions());

let pendingRefresh: Promise<PublishTaskTypeOption[]> | null = null;

export async function refreshPublishTaskTypeOptions(): Promise<PublishTaskTypeOption[]> {
  if (pendingRefresh) return pendingRefresh;

  pendingRefresh = getPublishTaskCapabilityCatalog()
    .then((response) => {
      const options = normalizeCatalogOptions(normalizeResponseData(response));
      if (options.length > 0) {
        publishTaskTypeOptions.value = options;
      }
      return publishTaskTypeOptions.value;
    })
    .catch(() => publishTaskTypeOptions.value)
    .finally(() => {
      pendingRefresh = null;
    });

  return pendingRefresh;
}
