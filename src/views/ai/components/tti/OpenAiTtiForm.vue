<template>
  <el-form ref="formRef" :model="form" :rules="rules" label-position="top" class="openai-tti-form">
    <div class="flex h-[calc(100vh-220px)] gap-6 overflow-y-auto py-2">
      <!-- 左侧：提示词区 -->
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
          <el-form-item prop="prompt" class="mb-0">
            <el-input
              v-model="form.prompt"
              type="textarea"
              :rows="14"
              resize="none"
              placeholder="请详细描述你想呈现的画面内容，如主体、材质、灯光、色彩、场景与构图风格..."
              maxlength="2000"
              show-word-limit
            />
          </el-form-item>
        </div>

        <!-- 专属特色提示卡片 -->
        <div class="tti-info-box--openai">
          <div class="mb-1 font-semibold flex items-center gap-1.5">
            <span class="inline-block h-2 w-2 rounded-full bg-blue-500"></span>
            OpenAI DALL-E 3 提示词指南
          </div>
          <div>• DALL-E 3 拥有顶级的长文本指令理解能力，可直接输入故事性或细节丰富的连贯描述。</div>
          <div>• OpenAI 规范原生无需负向提示词，直接在正向描述中明确排除项（如“无文字、无水印、背景纯净”）。</div>
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

        <!-- 画幅比例可视化卡片 -->
        <div class="tti-section-card">
          <div class="mb-3 flex items-center justify-between">
            <span class="tti-card-title">画幅比例与尺寸</span>
            <span class="tti-card-desc">{{ currentSizeMeta.label }}</span>
          </div>

          <div class="grid grid-cols-3 gap-2.5">
            <div
              v-for="s in sizeOptions"
              :key="s.value"
              class="tti-interactive-card p-2.5 text-center"
              :class="{ 'is-active': form.size === s.value }"
              @click="form.size = s.value"
            >
              <div class="mx-auto mb-1.5 flex h-7 items-center justify-center">
                <div
                  class="rounded border border-current"
                  :style="{ width: s.iconW, height: s.iconH }"
                ></div>
              </div>
              <div class="text-xs font-medium tti-card-main-text">{{ s.ratio }}</div>
              <div class="tti-card-subdesc mt-0.5">{{ s.dim }}</div>
            </div>
          </div>
        </div>

        <!-- 画质与风格 (DALL-E 3 专属) -->
        <div v-if="form.model.includes('dall-e-3') || form.model.includes('gpt-image')" class="tti-section-card">
          <div class="mb-3 tti-card-title">画质与风格模式</div>

          <!-- 画质切换 -->
          <div class="mb-3">
            <div class="mb-1.5 tti-card-desc">生成画质</div>
            <div class="grid grid-cols-2 gap-2">
              <div
                class="tti-interactive-card p-2.5 text-center text-xs"
                :class="{ 'is-active': form.quality === 'standard' }"
                @click="form.quality = 'standard'"
              >
                <div class="font-medium tti-card-main-text">标准 (Standard)</div>
                <div class="tti-card-subdesc mt-0.5">极速出图</div>
              </div>
              <div
                class="tti-interactive-card p-2.5 text-center text-xs"
                :class="{ 'is-active': form.quality === 'hd' }"
                @click="form.quality = 'hd'"
              >
                <div class="font-medium tti-card-main-text">高清 (HD)</div>
                <div class="tti-card-subdesc mt-0.5">细节倍增</div>
              </div>
            </div>
          </div>

          <!-- 风格切换 -->
          <div>
            <div class="mb-1.5 tti-card-desc">画面表现风格</div>
            <div class="grid grid-cols-2 gap-2">
              <div
                class="tti-interactive-card p-2.5 text-center text-xs"
                :class="{ 'is-active': form.style === 'vivid' }"
                @click="form.style = 'vivid'"
              >
                <div class="font-medium tti-card-main-text">生动逼真 (Vivid)</div>
                <div class="tti-card-subdesc mt-0.5">戏剧感细节丰富</div>
              </div>
              <div
                class="tti-interactive-card p-2.5 text-center text-xs"
                :class="{ 'is-active': form.style === 'natural' }"
                @click="form.style = 'natural'"
              >
                <div class="font-medium tti-card-main-text">自然真实 (Natural)</div>
                <div class="tti-card-subdesc mt-0.5">柔和自然写实</div>
              </div>
            </div>
          </div>
        </div>

        <!-- 生成数量 -->
        <div class="tti-section-card">
          <div class="mb-2 flex items-center justify-between text-sm">
            <span class="tti-card-title">生成张数</span>
            <span class="tti-card-desc">{{ form.model.includes('dall-e-3') ? 'DALL-E 3 仅支持单张' : '1 ~ 4 张' }}</span>
          </div>
          <el-input-number
            v-model="form.n"
            :min="1"
            :max="form.model.includes('dall-e-3') ? 1 : 4"
            :disabled="form.model.includes('dall-e-3')"
            class="w-full"
          />
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
        立即生成 (OpenAI)
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
  { modelId: "dall-e-3", label: "DALL-E 3", description: "首选高清旗舰模型" },
  { modelId: "dall-e-2", label: "DALL-E 2", description: "极速生图模型" },
  { modelId: "gpt-image-1", label: "GPT Image 1", description: "OpenAI 兼容新版" },
];

const sizeOptions = [
  { value: "1024x1024", ratio: "1:1", label: "正方形", dim: "1024×1024", iconW: "20px", iconH: "20px" },
  { value: "1024x1792", ratio: "9:16", label: "手机竖屏", dim: "1024×1792", iconW: "14px", iconH: "24px" },
  { value: "1792x1024", ratio: "16:9", label: "宽屏横图", dim: "1792×1024", iconW: "24px", iconH: "14px" },
];

const form = reactive({
  prompt: "",
  model: "dall-e-3",
  size: "1024x1024",
  quality: "standard",
  style: "vivid",
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
    specCode: "openai.image",
    model: form.model,
    prompt: form.prompt.trim(),
    size: form.size,
    n: form.n,
    style: form.style,
    providerParams: {
      size: form.size,
      quality: form.quality,
      style: form.style,
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

.tti-info-box--openai {
  border-radius: 12px;
  padding: 14px 16px;
  font-size: 12px;
  line-height: 1.6;
  background-color: rgba(64, 158, 255, 0.08);
  border: 1px solid rgba(64, 158, 255, 0.25);
  color: var(--el-color-primary-dark-2, #1d4ed8);
}

:global(html.dark) .tti-info-box--openai {
  background-color: rgba(64, 158, 255, 0.12);
  border-color: rgba(64, 158, 255, 0.35);
  color: #93c5fd;
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
