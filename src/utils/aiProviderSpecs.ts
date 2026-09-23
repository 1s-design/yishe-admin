/**
 * AI Provider Spec 工具函数
 * 用于获取功能场景的默认 Provider Spec
 */

const DEFAULT_AI_PROVIDER_SPEC_CODE = "openai.chat";

/**
 * 获取功能场景的默认 Provider Spec Code
 * @param featureCode 功能代码
 * @returns Provider Spec Code
 */
export function getDefaultAiProviderSpecForFeature(featureCode?: string | null) {
  const code = String(featureCode || "").trim();
  if (code === "ai.tti.generate") {
    return "dashscope.image";
  }
  if (code === "ai.tts.generate") {
    return "qwen.tts";
  }
  if (
    code.includes("generate-info") ||
    code.includes("complete") ||
    code.includes("infringement") ||
    code.includes("story-script") ||
    code === "ai.chat.vision" ||
    code === "ai.image-analysis.execute" ||
    code === "product.product.generate-info" ||
    code === "product.publish.generate-title"
  ) {
    return "openai.vision";
  }
  return DEFAULT_AI_PROVIDER_SPEC_CODE;
}
