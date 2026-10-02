<template>
  <el-form ref="formRef" :model="form" :rules="rules" label-position="top" class="volcengine-tti-form">
    <div class="flex h-[calc(100vh-220px)] gap-6 overflow-y-auto py-2">
      <!-- 左侧：提示词区与工具 -->
      <div class="flex min-w-0 flex-1 flex-col gap-4">
        <!-- 提示词来源选择 -->
        <div class="tti-section-card">
          <div class="mb-3 flex items-center justify-between">
            <span class="tti-card-title">提示词输入</span>
            <el-radio-group v-model="promptMode" size="small">
              <el-radio-button value="manual">手动输入</el-radio-button>
              <el-radio-button value="template">提示词模板</el-radio-button>
            </el-radio-group>
          </div>

          <!-- 模板选择器 -->
          <div v-if="promptMode === 'template'" class="mb-4">
            <el-select
              v-model="selectedPromptId"
              clearable
              filterable
              placeholder="从 AI 提示词库选取预设模板"
              :loading="promptLoading"
              class="w-full"
              @visible-change="handlePromptDropdownVisible"
              @change="handlePromptChange"
            >
              <el-option
                v-for="item in promptOptions"
                :key="item.id"
                :label="item.title"
                :value="item.id"
              />
            </el-select>
          </div>

          <!-- 画面提示词 textarea -->
          <el-form-item prop="prompt" class="mb-3">
            <el-input
              v-model="form.prompt"
              type="textarea"
              :rows="12"
              resize="none"
              placeholder="请输入你想生成的画面内容，例如主体、材质、构图、光影及环境描述（建议中文 <= 300 字，英文 <= 600 词）..."
              maxlength="2000"
              show-word-limit
            />
          </el-form-item>

          <!-- 联网搜索增强开关 -->
          <div class="flex items-center justify-between pt-2 border-t" style="border-color: var(--el-border-color-lighter);">
            <div>
              <div class="text-xs font-medium" style="color: var(--el-text-color-primary);">联网搜索增强 (Web Search)</div>
              <div class="tti-card-subdesc">模型自主联网搜索最新商品、流行热点与时事信息，增强图片时效性</div>
            </div>
            <el-switch v-model="form.web_search" />
          </div>
        </div>

        <!-- 专属特色提示卡片 -->
        <div class="tti-info-box--volcengine">
          <div class="mb-1 font-semibold flex items-center gap-1.5">
            <span class="inline-block h-2 w-2 rounded-full bg-amber-500"></span>
            火山引擎豆包 (Seedream) 专属特性指南
          </div>
          <div>• <strong>分辨率档位体系</strong>：支持 1K、1.5K、2K 档位分级；1.5K 与 1K 同价且画质明显提升。</div>
          <div>• <strong>透明免抠背景</strong>：开启「背景透明通道」可直接生成带 Alpha 通道的 PNG 免抠元素。</div>
          <div>• <strong>连环组图输出</strong>：Seedream 5.0 lite / 4.5 模型支持一次产出 1~15 张强关联的故事套图。</div>
        </div>
      </div>

      <!-- 右侧：专属生图参数区 -->
      <div class="flex w-[420px] flex-shrink-0 flex-col gap-4">
        <!-- 模型选择 -->
        <div class="tti-section-card">
          <div class="mb-3 tti-card-title">模型选择</div>
          <el-form-item prop="model" class="mb-0">
            <el-select v-model="form.model" class="w-full" size="default" filterable allow-create default-first-option placeholder="选择官方模型或输入 Endpoint ID (如 ep-xxx)">
              <el-option
                v-for="m in modelOptions"
                :key="m.modelId"
                :label="m.label"
                :value="m.modelId"
              >
                <div class="flex items-center justify-between py-1">
                  <span class="font-medium">{{ m.label }}</span>
                  <span class="text-xs opacity-60">{{ m.description }}</span>
                </div>
              </el-option>
            </el-select>
          </el-form-item>
        </div>

        <!-- 分辨率与尺寸 -->
        <div class="tti-section-card">
          <div class="mb-3 flex items-center justify-between">
            <span class="tti-card-title">分辨率与画幅</span>
            <el-radio-group v-model="sizeMode" size="small">
              <el-radio-button value="tier">标准档位</el-radio-button>
              <el-radio-button value="custom">像素尺寸</el-radio-button>
            </el-radio-group>
          </div>

          <!-- 档位模式 -->
          <div v-if="sizeMode === 'tier'" class="grid grid-cols-3 gap-2">
            <div
              v-for="t in tierOptions"
              :key="t.value"
              class="tti-interactive-card p-2.5 text-center"
              :class="{ 'is-active': form.size === t.value }"
              @click="form.size = t.value"
            >
              <div class="font-semibold text-sm tti-card-main-text">{{ t.label }}</div>
              <div class="tti-card-subdesc mt-0.5">{{ t.desc }}</div>
            </div>
          </div>

          <!-- 自定义像素尺寸模式 -->
          <div v-else class="space-y-2.5">
            <div class="grid grid-cols-3 gap-2">
              <div
                v-for="p in pixelPresets"
                :key="p.value"
                class="tti-interactive-card p-2 text-center text-xs"
                :class="{ 'is-active': form.size === p.value }"
                @click="form.size = p.value"
              >
                <div class="font-medium tti-card-main-text">{{ p.ratio }}</div>
                <div class="tti-card-subdesc mt-0.5">{{ p.label }}</div>
              </div>
            </div>
            <el-input
              v-model="form.size"
              placeholder="自定义宽x高，例如 2048x2048、2048x1024"
              size="small"
              clearable
            />
          </div>
        </div>

        <!-- 进阶特色开关组 -->
        <div class="tti-section-card space-y-3">
          <!-- 透明通道 -->
          <div class="flex items-center justify-between">
            <div>
              <div class="text-xs font-medium" style="color: var(--el-text-color-primary);">透明免抠背景 (PNG)</div>
              <div class="tti-card-subdesc">生成带透明通道的无底色图片，适用于电商与设计素材</div>
            </div>
            <el-switch v-model="form.isTransparent" />
          </div>

          <!-- 提示词优化模式 -->
          <div class="flex items-center justify-between pt-3 border-t" style="border-color: var(--el-border-color-lighter);">
            <div>
              <div class="text-xs font-medium" style="color: var(--el-text-color-primary);">提示词优化模式</div>
              <div class="tti-card-subdesc">标准质量优先 vs 快速响应模式</div>
            </div>
            <el-radio-group v-model="form.optimize_prompt_mode" size="small">
              <el-radio-button value="standard">标准 (Quality)</el-radio-button>
              <el-radio-button value="fast">快速 (Fast)</el-radio-button>
            </el-radio-group>
          </div>

          <!-- 连环组图模式 -->
          <div class="pt-3 border-t" style="border-color: var(--el-border-color-lighter);">
            <div class="flex items-center justify-between">
              <div>
                <div class="text-xs font-medium" style="color: var(--el-text-color-primary);">连环组图生成 (Story Mode)</div>
                <div class="tti-card-subdesc">根据故事描述一次生成一组内容关联的套图</div>
              </div>
              <el-switch
                v-model="form.enableSequential"
                :disabled="!supportsSequential"
              />
            </div>
            <div v-if="form.enableSequential" class="mt-2.5">
              <div class="flex items-center justify-between text-xs font-medium" style="color: var(--el-text-color-primary);">
                <span>最大组图张数 ({{ form.max_images }} 张)</span>
              </div>
              <el-slider v-model="form.max_images" :min="1" :max="15" :step="1" show-stops />
            </div>
            <div v-else-if="!supportsSequential" class="mt-1 text-[10px] text-amber-500">
              * 组图模式仅 Seedream 5.0 lite / 4.5 / 4.0 支持，当前模型已自动关闭
            </div>
          </div>

          <!-- 官方水印 -->
          <div class="flex items-center justify-between pt-3 border-t" style="border-color: var(--el-border-color-lighter);">
            <div>
              <div class="text-xs font-medium" style="color: var(--el-text-color-primary);">添加官方水印</div>
              <div class="tti-card-subdesc">在生成图片右下角添加官方标识</div>
            </div>
            <el-switch v-model="form.watermark" />
          </div>
        </div>
      </div>
    </div>

    <!-- 弹窗底部操作按钮 -->
    <div class="tti-form-actions">
      <el-button @click="$emit('cancel')">取消</el-button>
      <el-button
        type="primary"
        :loading="loading"
        :icon="MagicStick"
        @click="handleSubmit"
      >
        立即生成 (火山豆包)
      </el-button>
    </div>
  </el-form>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from "vue";
import { MagicStick } from "@element-plus/icons-vue";
import { getPromptList } from "@/api/prompt";
import { ElMessage } from "element-plus";

defineProps<{
  loading?: boolean;
}>();

const emit = defineEmits<{
  submit: [payload: any];
  cancel: [];
}>();

const formRef = ref();
const promptMode = ref<"manual" | "template">("manual");
const sizeMode = ref<"tier" | "custom">("tier");
const selectedPromptId = ref<number | null>(null);
const promptLoading = ref(false);
const promptOptions = ref<any[]>([]);

const modelOptions = [
  { modelId: "doubao-seedream-5-0-pro-260628", label: "Seedream 5.0 pro", description: "官方旗舰高画质，支持 2K 与 fast 模式" },
  { modelId: "doubao-seedream-5-0-flash-260915", label: "Seedream 5.0 flash", description: "官方极速轻量出图，极低时延" },
  { modelId: "doubao-seedream-4-0-20260415", label: "Seedream 4.0", description: "官方经典标准生图模型" },
];

const tierOptions = [
  { value: "2K", label: "2K 高清", desc: "旗舰超清推荐" },
  { value: "1.5K", label: "1.5K 超清", desc: "同价质感更佳" },
  { value: "1K", label: "1K 标准", desc: "轻量经典档位" },
];

const pixelPresets = [
  { value: "2048x2048", ratio: "1:1", label: "正方 2048×2048" },
  { value: "2816x1584", ratio: "16:9", label: "横屏 2816×1584" },
  { value: "1584x2816", ratio: "9:16", label: "竖屏 1584×2816" },
  { value: "2368x1776", ratio: "4:3", label: "横图 2368×1776" },
  { value: "1776x2368", ratio: "3:4", label: "竖图 1776×2368" },
  { value: "2496x1664", ratio: "3:2", label: "摄影 2496×1664" },
];

const form = reactive({
  prompt: "",
  model: "doubao-seedream-5-0-pro-260628",
  size: "2K",
  web_search: false,
  isTransparent: false,
  optimize_prompt_mode: "standard",
  enableSequential: false,
  max_images: 4,
  watermark: false,
});

const rules = {
  prompt: [{ required: true, message: "请输入画面描述提示词", trigger: "blur" }],
};

const supportsSequential = computed(() => {
  return (
    form.model.includes("lite") ||
    form.model.includes("4.5") ||
    form.model.includes("4.0")
  );
});

watch(supportsSequential, (supported) => {
  if (!supported) {
    form.enableSequential = false;
  }
});

watch(sizeMode, (mode) => {
  if (mode === "tier" && !["1K", "1.5K", "2K"].includes(form.size)) {
    form.size = "2K";
  } else if (mode === "custom" && ["1K", "1.5K", "2K"].includes(form.size)) {
    form.size = "2048x2048";
  }
});

const loadPromptOptions = async () => {
  if (promptLoading.value) return;
  promptLoading.value = true;
  try {
    const res: any = await getPromptList({ currentPage: 1, pageSize: 100 });
    promptOptions.value = Array.isArray(res?.list) ? res.list : [];
  } catch (err) {
    ElMessage.error({ message: "加载提示词模板失败", duration: 3000 });
  } finally {
    promptLoading.value = false;
  }
};

const handlePromptDropdownVisible = (visible: boolean) => {
  if (visible) loadPromptOptions();
};

const handlePromptChange = (id: number | null) => {
  if (!id) return;
  const match = promptOptions.value.find((p) => Number(p.id) === Number(id));
  if (match?.content) {
    form.prompt = String(match.content).trim();
  }
};

const handleSubmit = async () => {
  await formRef.value.validate();
  emit("submit", {
    specCode: "volcengine.seedream",
    model: form.model,
    prompt: form.prompt.trim(),
    size: form.size,
    providerParams: {
      size: form.size,
      background: form.isTransparent ? "transparent" : "opaque",
      optimize_prompt_mode: form.optimize_prompt_mode,
      sequential_image_generation: form.enableSequential ? "auto" : "disabled",
      max_images: form.enableSequential ? form.max_images : undefined,
      watermark: form.watermark,
      web_search: form.web_search,
      output_format: form.isTransparent ? "png" : "jpeg",
    },
  });
};
</script>

<style scoped>
.tti-section-card {
  border-radius: 12px;
  padding: 16px;
  background-color: var(--el-bg-color-overlay, #ffffff);
  border: 1px solid var(--el-border-color-lighter, #ebeef5);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

:global(html.dark) .tti-section-card {
  background-color: var(--el-bg-color-overlay, #1d1e1f);
  border-color: var(--el-border-color-lighter, #363637);
  box-shadow: none;
}

.tti-card-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--el-text-color-primary, #303133);
}

.tti-card-desc {
  font-size: 12px;
  color: var(--el-text-color-secondary, #909399);
}

.tti-card-main-text {
  color: var(--el-text-color-primary, #303133);
  transition: color 0.2s ease;
}

.tti-card-subdesc {
  font-size: 10px;
  color: var(--el-text-color-secondary, #909399);
  transition: color 0.2s ease;
}

/* 基础可交互卡片（默认状态） */
.tti-interactive-card {
  cursor: pointer;
  border-radius: 8px;
  border: 1px solid var(--el-border-color, #dcdfe6);
  background-color: var(--el-fill-color-blank, #ffffff);
  color: var(--el-text-color-primary, #303133);
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  user-select: none;
}

.tti-interactive-card:hover {
  border-color: var(--el-color-primary);
  background-color: var(--el-fill-color-light, #f5f7fa);
}

/* 亮色模式下：选中激活状态 */
.tti-interactive-card.is-active {
  border-color: var(--el-color-primary) !important;
  background-color: #ecf5ff !important;
  box-shadow: 0 0 0 1px var(--el-color-primary) inset;
}

.tti-interactive-card.is-active .tti-card-main-text {
  color: var(--el-color-primary) !important;
  font-weight: 600;
}

.tti-interactive-card.is-active .tti-card-subdesc {
  color: var(--el-color-primary) !important;
  opacity: 0.85;
}

/* 暗色模式下：默认与悬停状态 */
:global(html.dark) .tti-interactive-card {
  border-color: rgba(255, 255, 255, 0.12);
  background-color: #1e1e20;
  color: rgba(255, 255, 255, 0.88);
}

:global(html.dark) .tti-interactive-card:hover {
  border-color: rgba(64, 158, 255, 0.6);
  background-color: rgba(255, 255, 255, 0.06);
}

:global(html.dark) .tti-card-main-text {
  color: rgba(255, 255, 255, 0.9);
}

:global(html.dark) .tti-card-subdesc {
  color: rgba(255, 255, 255, 0.52);
}

/* 暗色模式下：选中激活状态 */
:global(html.dark) .tti-interactive-card.is-active {
  border-color: var(--el-color-primary) !important;
  background-color: rgba(64, 158, 255, 0.2) !important;
  box-shadow: 0 0 0 1px var(--el-color-primary) inset, 0 0 12px rgba(64, 158, 255, 0.25);
}

:global(html.dark) .tti-interactive-card.is-active .tti-card-main-text {
  color: #ffffff !important;
  font-weight: 600;
}

:global(html.dark) .tti-interactive-card.is-active .tti-card-subdesc {
  color: #a0cfff !important;
  opacity: 1;
}

.tti-info-box--volcengine {
  border-radius: 12px;
  padding: 14px 16px;
  font-size: 12px;
  line-height: 1.6;
  background-color: rgba(245, 158, 11, 0.08);
  border: 1px solid rgba(245, 158, 11, 0.25);
  color: #b45309;
}

:global(html.dark) .tti-info-box--volcengine {
  background-color: rgba(245, 158, 11, 0.14);
  border-color: rgba(245, 158, 11, 0.35);
  color: #fcd34d;
}

.tti-form-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  padding-top: 14px;
  border-top: 1px solid var(--el-border-color-light, #e4e7ed);
}

:global(html.dark) .tti-form-actions {
  border-color: var(--el-border-color-lighter, #363637);
}
</style>
