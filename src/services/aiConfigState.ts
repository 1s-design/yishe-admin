import { reactive } from "vue";
import { getAiApiKeyUsageOptions, getAiFeatureRegistry, type AiApiKeyConfig } from "@/api/aiApiKey";
import { getAiSetting } from "@/api/user";
import { getDefaultAiProviderSpecForFeature } from "@/utils/aiProviderSpecs";

type AiConfigState = {
  initialized: boolean;
  loading: boolean;
  missing: boolean;
  reason: string;
  enabledKeyCount: number;
  boundFeatureCount: number;
  totalFeatureCount: number;
  validBoundFeatureCount: number;
  invalidBoundFeatureCount: number;
};

export const aiConfigState = reactive<AiConfigState>({
  initialized: false,
  loading: false,
  missing: false,
  reason: "",
  enabledKeyCount: 0,
  boundFeatureCount: 0,
  totalFeatureCount: 0,
  validBoundFeatureCount: 0,
  invalidBoundFeatureCount: 0,
});

let pendingRefresh: Promise<void> | null = null;

const normalizeKeyId = (value: unknown) => {
  const normalized = Number(value);
  if (!Number.isInteger(normalized) || normalized <= 0) {
    return null;
  }
  return normalized;
};


const buildEnabledKeyIdSet = (keys: AiApiKeyConfig[]) => {
  return new Set(
    keys
      .filter((item) => item.available)
      .map((item) => normalizeKeyId(item.id))
      .filter((item): item is number => item !== null),
  );
};

const resolveMissingReason = (summary: {
  enabledKeyCount: number;
  boundFeatureCount: number;
  totalFeatureCount: number;
  validBoundFeatureCount: number;
  invalidBoundFeatureCount: number;
}) => {
  if (summary.enabledKeyCount <= 0) {
    return "还没有可用的 AI Key";
  }
  if (summary.boundFeatureCount <= 0) {
    return "还没有给 AI 功能分配 Key";
  }
  if (summary.boundFeatureCount < summary.totalFeatureCount) {
    return `还有 ${summary.totalFeatureCount - summary.boundFeatureCount} 个 AI 功能未分配 Key`;
  }
  if (summary.validBoundFeatureCount <= 0) {
    return "当前 AI 功能绑定的 Key 不可用";
  }
  if (summary.invalidBoundFeatureCount > 0) {
    return `有 ${summary.invalidBoundFeatureCount} 个 AI 功能绑定了不可用 Key`;
  }
  return "";
};

export async function refreshAiConfigState() {
  if (pendingRefresh) {
    return pendingRefresh;
  }

  pendingRefresh = (async () => {
    aiConfigState.loading = true;
    try {
      const [keyList, settingResp, registry] = await Promise.all([
        getAiApiKeyUsageOptions(),
        getAiSetting(),
        getAiFeatureRegistry(),
      ]);
      // 后端 TransformInterceptor 包装了响应: { data: {...}, code, message, status }
      const unwrap = (resp: any) => resp?.data || resp || {};
      const keys = Array.isArray(unwrap(keyList)) ? unwrap(keyList) : [];
      const features = Array.isArray(unwrap(registry)) ? unwrap(registry) : [];
      const aiSetting = unwrap(settingResp);
      const featureCodes = new Set<string>(
        features
          .map((item: any) => String(item?.code || "").trim())
          .filter((code: string) => !!code),
      );
      const enabledKeyIds = buildEnabledKeyIdSet(keys);

      // 总数 = 所有 spec 行数（多 Provider 功能按 spec 数量计算）
      let totalFeatureCount = 0;
      const featureSpecCodes = new Map<string, string[]>();
      for (const code of featureCodes) {
        const f = features.find((item: any) => String(item?.code || "").trim() === code);
        const specs: string[] = ((f?.allowedSpecCodes || []) as unknown[]).filter(Boolean) as string[];
        const specList: string[] = specs.length > 0 ? specs : [getDefaultAiProviderSpecForFeature(code)].filter(Boolean) as string[];
        featureSpecCodes.set(code, specList);
        totalFeatureCount += specList.length;
      }

      let boundFeatureCount = 0;
      let validBoundFeatureCount = 0;
      let invalidBoundFeatureCount = 0;

      const countOne = (keyId: number) => {
        boundFeatureCount += 1;
        if (enabledKeyIds.has(keyId)) {
          validBoundFeatureCount += 1;
        } else {
          invalidBoundFeatureCount += 1;
        }
      };

      // featureBindings 结构：{ featureCode: { specCode: { keyId, specCode } } }
      const bindings = aiSetting.featureBindings as Record<string, Record<string, { keyId?: number; specCode?: string }>> | undefined;
      if (bindings && typeof bindings === "object" && !Array.isArray(bindings)) {
        // 按 spec 行计数：只认「该功能预期规格」的绑定，
        // 避免绑错规格（如文本规格）也计成已配置、与配置页的缺口提示不一致
        for (const [featureCode, specs] of Object.entries(bindings)) {
          if (!specs || typeof specs !== "object") continue;
          if (featureCodes.size && !featureCodes.has(featureCode)) continue;
          const expectedSpecs = featureSpecCodes.get(featureCode) || [];
          for (const [specCode, binding] of Object.entries(specs)) {
            if (expectedSpecs.length > 0 && !expectedSpecs.includes(specCode)) continue;
            const keyId = normalizeKeyId(binding?.keyId);
            if (keyId) {
              countOne(keyId);
            }
          }
        }

      }

      const nextState = {
        initialized: true,
        loading: false,
        enabledKeyCount: enabledKeyIds.size,
        boundFeatureCount,
        totalFeatureCount,
        validBoundFeatureCount,
        invalidBoundFeatureCount,
      };
      const reason = resolveMissingReason(nextState);

      Object.assign(aiConfigState, nextState, {
        missing: !!reason,
        reason,
      });
    } catch (error) {
      console.warn("[ai-config-state] refresh failed", error);
      aiConfigState.initialized = true;
    } finally {
      aiConfigState.loading = false;
      pendingRefresh = null;
    }
  })();

  return pendingRefresh;
}
