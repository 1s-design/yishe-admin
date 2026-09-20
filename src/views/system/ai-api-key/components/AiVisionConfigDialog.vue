<template>
  <Dialog
    v-model="dialogVisible"
    title="图片分析 AI 配置"
    width="680px"
    :destroy-on-close="true"
  >
    <div v-loading="loading" class="vision-config">
      <div class="vision-config__header">
        <div class="vision-config__feature">
          <el-tag size="small" effect="plain" type="primary">AI 创作</el-tag>
          <span class="vision-config__feature-label">AI 图片分析</span>
        </div>
        <el-tag
          v-if="currentKeyId"
          size="small"
          :type="isCurrentKeyValid ? 'success' : 'danger'"
          effect="plain"
        >
          {{ isCurrentKeyValid ? '已配置' : 'Key 不可用' }}
        </el-tag>
        <el-tag v-else size="small" type="info" effect="plain">未配置</el-tag>
      </div>

      <div class="vision-config__desc">
        负责 AI 图片分析模块的视觉模型调用、图片内容识别和分析结果产出。按功能选择实际调用的 AI Key，调用规范由系统固定为 OpenAI 兼容图文理解（默认 gpt-4o）。
      </div>

      <!-- 当前绑定信息 -->
      <div v-if="currentKey" class="vision-config__current">
        <div class="vision-config__current-label">当前 Key</div>
        <div class="vision-config__current-name">{{ currentKey.name }}</div>
        <div class="vision-config__current-meta">
          <span>{{ currentKey.model || '未设置模型' }}</span>
          <span v-if="currentKey.uploader?.account"> · {{ currentKey.uploader.account }}</span>
          <el-tag
            size="small"
            :data-source="currentKey.source"
            class="vision-config__source-tag"
          >
            {{ currentKey.source === 'public' ? '公开 Key' : '我的 Key' }}
          </el-tag>
        </div>
        <div v-if="isCurrentKeyInvalid" class="vision-config__warning">
          当前绑定的 Key 不可用，请重新选择
        </div>
      </div>

      <div v-else class="vision-config__empty-state">
        <el-icon :size="20" color="var(--el-color-warning)"><WarningFilled /></el-icon>
        <span>尚未配置，请在下方选择一个 Key</span>
      </div>

      <!-- Key 选择 -->
      <div class="vision-config__select">
        <div class="vision-config__select-label">选择 AI Key</div>
        <el-select
          v-model="selectedKeyId"
          placeholder="请选择一个 Key"
          filterable
          clearable
          size="default"
          style="width: 100%"
        >
          <el-option
            v-for="item in keyOptions"
            :key="item.id"
            :label="item.name"
            :value="item.id!"
            :disabled="item.available === false"
          >
            <div class="key-option">
              <div class="key-option__top">
                <span class="key-option__name">{{ item.name }}</span>
                <el-tag
                  size="small"
                  :data-source="item.source"
                  class="vision-config__source-tag"
                >
                  {{ item.source === 'public' ? '公开' : '我的' }}
                </el-tag>
                <el-tag
                  v-if="item.available === false"
                  size="small"
                  type="danger"
                  effect="plain"
                >
                  不可用
                </el-tag>
              </div>
              <div class="key-option__meta">
                {{ item.model || '未设置模型' }}
                <span v-if="item.uploader?.account"> · {{ item.uploader.account }}</span>
              </div>
            </div>
          </el-option>
        </el-select>
      </div>

      <!-- 固定规范信息 -->
      <div class="vision-config__spec">
        <div class="vision-config__spec-label">固定规范</div>
        <div class="vision-config__spec-info">
          <span class="vision-config__spec-name">OpenAI 兼容图文理解</span>
          <span class="vision-config__spec-detail">默认模型: gpt-4o · 能力: chat, text, vision, json</span>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button size="small" @click="dialogVisible = false">取消</el-button>
        <el-button size="small" type="primary" :loading="saving" :disabled="!hasChanged" @click="handleSave">
          保存
        </el-button>
      </div>
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { ElMessage } from "element-plus";
import { WarningFilled } from "@element-plus/icons-vue";
import {
  getAiApiKeyUsageOptions,
  type AiApiKeyConfig,
} from "@/api/aiApiKey";
import { getAiSetting, updateAiSetting, type UserAiSetting } from "@/api/user";

const VISION_FEATURE_CODE = "ai.image-analysis.execute";

const emit = defineEmits(["saved"]);

const dialogVisible = ref(false);
const loading = ref(false);
const saving = ref(false);
const usageOptions = ref<AiApiKeyConfig[]>([]);
const currentKeyId = ref<number | null>(null);
const selectedKeyId = ref<number | null>(null);
const savedFeatureBindings = ref<Record<string, Record<string, { keyId: number; specCode: string }>>>({});

const hasChanged = computed(() => {
  return selectedKeyId.value !== currentKeyId.value;
});

const currentKey = computed(() => {
  if (!currentKeyId.value) return null;
  return usageOptions.value.find((k) => k.id === currentKeyId.value) || null;
});

const isCurrentKeyValid = computed(() => {
  if (!currentKey.value) return false;
  return currentKey.value.available !== false;
});

const isCurrentKeyInvalid = computed(() => {
  return currentKeyId.value && !isCurrentKeyValid.value;
});

const keyOptions = computed(() => usageOptions.value);

const normalizeKeyId = (value: unknown): number | null => {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
};

const loadData = async () => {
  loading.value = true;
  try {
    const [options, setting] = await Promise.all([
      getAiApiKeyUsageOptions(),
      getAiSetting(),
    ]);
    usageOptions.value = Array.isArray(options) ? options : [];
    const aiSetting = (setting as any)?.data || setting || {};

    const rawBindings = aiSetting.featureBindings || {};
    savedFeatureBindings.value = JSON.parse(JSON.stringify(rawBindings));

    // 新结构：bindings[featureCode] 是 { specCode: { keyId, specCode } }
    const visionSpecs = rawBindings[VISION_FEATURE_CODE] || {};
    const visionBinding = visionSpecs["openai.vision"] || Object.values(visionSpecs)[0] || null;
    const boundKeyId = normalizeKeyId(visionBinding?.keyId);
    currentKeyId.value = boundKeyId;
    selectedKeyId.value = boundKeyId;
  } finally {
    loading.value = false;
  }
};

const handleSave = async () => {
  saving.value = true;
  try {
    const featureBindings = JSON.parse(JSON.stringify(savedFeatureBindings.value));

    if (selectedKeyId.value) {
      featureBindings[VISION_FEATURE_CODE] = {
        "openai.vision": {
          keyId: selectedKeyId.value,
          specCode: "openai.vision",
          params: {},
        },
      };
    } else {
      delete featureBindings[VISION_FEATURE_CODE];
    }

    const payload: UserAiSetting = {
      version: 2,
      featureBindings,
      updatedAt: new Date().toISOString(),
    };

    await updateAiSetting(payload);
    currentKeyId.value = selectedKeyId.value;
    savedFeatureBindings.value = featureBindings;
    ElMessage.success("图片分析 AI 配置已保存");
    emit("saved");
    dialogVisible.value = false;
  } catch (error: any) {
    ElMessage.error(error?.message || "保存失败");
  } finally {
    saving.value = false;
  }
};

const open = async () => {
  dialogVisible.value = true;
  await loadData();
};

defineExpose({ open });
</script>

<style scoped>
.vision-config {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 4px 0;
}

.vision-config__header {
  display: flex;
  align-items: center;
  gap: 10px;
}

.vision-config__feature {
  display: flex;
  align-items: center;
  gap: 8px;
}

.vision-config__feature-label {
  font-size: 15px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.vision-config__desc {
  font-size: 12px;
  line-height: 1.6;
  color: var(--el-text-color-secondary);
}

.vision-config__current {
  padding: 12px;
  background: var(--el-fill-color-lighter);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
}

.vision-config__current-label {
  margin-bottom: 4px;
  font-size: 11px;
  color: var(--el-text-color-secondary);
}

.vision-config__current-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.vision-config__current-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 4px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.vision-config__source-tag {
  font-size: 10px;
}

.vision-config__source-tag[data-source="mine"] {
  color: var(--el-color-primary);
  background: var(--el-color-primary-light-9);
}

.vision-config__source-tag[data-source="public"] {
  color: var(--el-color-success);
  background: var(--el-color-success-light-9);
}

.vision-config__warning {
  margin-top: 6px;
  font-size: 12px;
  color: var(--el-color-danger);
}

.vision-config__empty-state {
  display: flex;
  padding: 12px;
  font-size: 13px;
  color: var(--el-text-color-secondary);
  background: var(--el-fill-color-blank);
  border: 1px dashed var(--el-border-color);
  border-radius: 8px;
  align-items: center;
  gap: 8px;
}

.vision-config__select {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.vision-config__select-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--el-text-color-primary);
}

.vision-config__spec {
  padding: 12px;
  background: var(--el-fill-color-blank);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
}

.vision-config__spec-label {
  margin-bottom: 4px;
  font-size: 11px;
  color: var(--el-text-color-secondary);
}

.vision-config__spec-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.vision-config__spec-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.vision-config__spec-detail {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.key-option {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 2px 0;
}

.key-option__top {
  display: flex;
  align-items: center;
  gap: 6px;
}

.key-option__name {
  font-size: 13px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.key-option__meta {
  font-size: 11px;
  color: var(--el-text-color-secondary);
}
</style>
