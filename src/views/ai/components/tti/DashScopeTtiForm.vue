<template>
  <el-form ref="formRef" :model="form" :rules="rules" label-position="top" class="dashscope-tti-form">
    <div class="flex h-[calc(100vh-220px)] gap-6 overflow-y-auto py-2">
      <!-- 左侧：提示词区（正向 + 负向提示词） -->
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

          <!-- 正向画面提示词 -->
          <el-form-item label="画面描述 (Prompt)" prop="prompt" class="mb-3">
            <el-input
              v-model="form.prompt"
              type="textarea"
              :rows="11"
              resize="none"
              placeholder="请输入你想生成的画面细节，例如主体、材质、构图、光影及环境描述..."
              maxlength="2000"
              show-word-limit
            />
          </el-form-item>

          <!-- 负向提示词（通义万相支持排除不想要的元素） -->
          <el-form-item label="负向提示词 (Negative Prompt)" prop="negativePrompt" class="mb-0">
            <el-input
              v-model="form.negativePrompt"
              type="textarea"
              :rows="4"
              resize="none"
              placeholder="可选：描述你希望避开的元素，例如：模糊、低分辨率、畸变、多余肢体、水印、文字等"
              maxlength="500"
              show-word-limit
            />
          </el-form-item>
        </div>

        <!-- 专属特色提示卡片 -->
        <div class="tti-info-box--dashscope">
          <div class="mb-1 font-semibold flex items-center gap-1.5">
            <span class="inline-block h-2 w-2 rounded-full bg-purple-500"></span>
            阿里云通义万相 (Qwen) 专属优势
          </div>
          <div>• 支持负向提示词过滤，可显著压制画面的残影、模糊与杂乱背景。</div>
          <div>• 开启「智能扩写提示词」后，通义大模型会自动丰富细节，适合简短提示词的质感提升。</div>
        </div>
      </div>

      <!-- 右侧：专属生图参数区 -->
      <div class="flex w-[400px] flex-shrink-0 flex-col gap-4">
        <!-- 模型选择 -->
        <div class="tti-section-card">
          <div class="mb-3 tti-card-title">模型选择</div>
          <el-form-item prop="model" class="mb-0">
            <el-select v-model="form.model" class="w-full" size="default">
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

        <!-- 画幅尺寸卡片 -->
        <div class="tti-section-card">
          <div class="mb-3 flex items-center justify-between">
            <span class="tti-card-title">画幅尺寸</span>
            <span class="tti-card-desc">{{ currentSizeMeta.label }} ({{ currentSizeMeta.dim }})</span>
          </div>

          <div class="grid grid-cols-3 gap-2">
            <div
              v-for="s in sizeOptions"
              :key="s.value"
              class="tti-interactive-card p-2 text-center"
              :class="{ 'is-active': form.size === s.value }"
              @click="form.size = s.value"
            >
              <div class="mx-auto mb-1 flex h-6 items-center justify-center">
                <div
                  class="rounded border border-current"
                  :style="{ width: s.iconW, height: s.iconH }"
                ></div>
              </div>
              <div class="text-[11px] leading-tight font-medium tti-card-main-text">{{ s.label }}</div>
              <div class="tti-card-subdesc mt-0.5">{{ s.ratio }}</div>
            </div>
          </div>
        </div>

        <!-- 艺术风格卡片 -->
        <div class="tti-section-card">
          <div class="mb-3 tti-card-title">艺术风格预设</div>
          <div class="grid grid-cols-2 gap-2">
            <div
              v-for="st in styleOptions"
              :key="st.value"
              class="tti-interactive-card p-2.5 text-center text-xs"
              :class="{ 'is-active': form.style === st.value }"
              @click="form.style = st.value"
            >
              <div class="font-medium tti-card-main-text">{{ st.label }}</div>
              <div class="tti-card-subdesc mt-0.5">{{ st.desc }}</div>
            </div>
          </div>
        </div>

        <!-- 高级开关与数量 -->
        <div class="tti-section-card space-y-3">
          <div class="flex items-center justify-between">
            <div>
              <div class="text-xs font-medium" style="color: var(--el-text-color-primary);">智能扩写提示词</div>
              <div class="tti-card-subdesc">大模型自动扩展丰富细节</div>
            </div>
            <el-switch v-model="form.prompt_extend" />
          </div>

          <div class="flex items-center justify-between pt-3" style="border-top: 1px solid var(--el-border-color-lighter);">
            <div>
              <div class="text-xs font-medium" style="color: var(--el-text-color-primary);">添加官方水印</div>
              <div class="tti-card-subdesc">在生成图右下角添加标识</div>
            </div>
            <el-switch v-model="form.watermark" />
          </div>

          <div class="pt-3" style="border-top: 1px solid var(--el-border-color-lighter);">
            <div class="mb-2 flex items-center justify-between text-xs font-medium" style="color: var(--el-text-color-primary);">
              <span>生成张数 ({{ form.n }} 张)</span>
            </div>
            <el-slider v-model="form.n" :min="1" :max="4" :step="1" show-stops />
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
        立即生成 (通义万相)
      </el-button>
    </div>
  </el-form>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from "vue";
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
const selectedPromptId = ref<number | null>(null);
const promptLoading = ref(false);
const promptOptions = ref<any[]>([]);

const modelOptions = [
  { modelId: "qwen-image", label: "Qwen Image", description: "官方标准文生图" },
  { modelId: "qwen-image-plus", label: "Qwen Image Plus", description: "官方进阶生图增强版" },
  { modelId: "wanx-v1", label: "通义万相 v1", description: "经典万相生图模型" },
];

const sizeOptions = [
  { value: "1024*1024", ratio: "1:1", label: "正方形", dim: "1024×1024", iconW: "18px", iconH: "18px" },
  { value: "768*1024", ratio: "3:4", label: "竖版中图", dim: "768×1024", iconW: "15px", iconH: "20px" },
  { value: "1024*768", ratio: "4:3", label: "横版中图", dim: "1024×768", iconW: "20px", iconH: "15px" },
  { value: "1664*928", ratio: "16:9", label: "宽屏横图", dim: "1664×928", iconW: "22px", iconH: "13px" },
  { value: "928*1664", ratio: "9:16", label: "手机竖屏", dim: "928×1664", iconW: "13px", iconH: "22px" },
];

const styleOptions = [
  { value: "", label: "默认通用", desc: "自适应提示词特征" },
  { value: "photography", label: "摄影写实", desc: "真实质感光影" },
  { value: "illustration", label: "插画手绘", desc: "艺术设计插图" },
  { value: "anime", label: "二次元动漫", desc: "日韩动漫画风" },
];

const form = reactive({
  prompt: "",
  negativePrompt: "",
  model: "qwen-image",
  size: "1024*1024",
  style: "",
  prompt_extend: true,
  watermark: false,
  n: 1,
});

const rules = {
  prompt: [{ required: true, message: "请输入画面描述提示词", trigger: "blur" }],
};

const currentSizeMeta = computed(() => {
  return sizeOptions.find((s) => s.value === form.size) || sizeOptions[0];
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
    specCode: "dashscope.image",
    model: form.model,
    prompt: form.prompt.trim(),
    negativePrompt: form.negativePrompt.trim() || undefined,
    size: form.size,
    n: form.n,
    style: form.style || undefined,
    providerParams: {
      size: form.size,
      style: form.style || undefined,
      prompt_extend: form.prompt_extend,
      watermark: form.watermark,
      n: form.n,
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

.tti-interactive-card.is-active .border-current {
  border-color: var(--el-color-primary) !important;
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

/* 暗色模式下：选中激活状态（高对比度，清晰易读） */
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

:global(html.dark) .tti-interactive-card.is-active .border-current {
  border-color: #ffffff !important;
}

.tti-info-box--dashscope {
  border-radius: 12px;
  padding: 14px 16px;
  font-size: 12px;
  line-height: 1.6;
  background-color: rgba(147, 51, 234, 0.08);
  border: 1px solid rgba(147, 51, 234, 0.25);
  color: #6b21a8;
}

:global(html.dark) .tti-info-box--dashscope {
  background-color: rgba(147, 51, 234, 0.14);
  border-color: rgba(147, 51, 234, 0.35);
  color: #d8b4fe;
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
