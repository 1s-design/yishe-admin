<template>
  <el-dialog
    v-model="dialogVisible"
    :title="dialogTitle"
    width="680px"
    align-center
    destroy-on-close
    :close-on-click-modal="false"
    class="ai-api-key-dialog"
  >
    <el-form
      ref="formRef"
      :model="formData"
      :rules="formRules"
      label-width="100px"
      class="ai-api-key-dialog__form"
      v-loading="formLoading"
      autocomplete="off"
    >
      <!-- 基础信息 -->
      <section class="ai-api-key-section">
        <div class="ai-api-key-section__title">基础信息</div>
        <el-row :gutter="20">
          <el-col :xs="24" :md="12">
            <el-form-item label="名称" prop="name">
              <el-input v-model="formData.name" placeholder="例如：OpenAI 主账号 Key" clearable />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :md="12">
            <el-form-item label="默认模型">
              <el-input
                v-model="formData.model"
                placeholder="例如：gpt-4o / qwen-vl-max"
                clearable
              />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="Base URL">
              <el-input
                v-model="formData.baseUrl"
                placeholder="例如：https://api.openai.com/v1"
                autocomplete="off"
                name="ai-base-url"
                clearable
              />
            </el-form-item>
          </el-col>
        </el-row>
      </section>

      <!-- 密钥凭据 -->
      <section class="ai-api-key-section">
        <div class="ai-api-key-section__title">密钥凭据</div>
        <el-form-item label="API Key" prop="apiKey">
          <div class="ai-api-key-field">
            <el-input
              v-model="formData.apiKey"
              placeholder="请输入 API 密钥"
              show-password
              autocomplete="new-password"
              name="ai-api-key"
            />
            <el-button class="ai-api-key-field__copy" :disabled="!formData.apiKey" @click="copyApiKey">
              复制
            </el-button>
          </div>
        </el-form-item>
      </section>

      <!-- 使用设置 -->
      <section class="ai-api-key-section">
        <div class="ai-api-key-section__title">使用设置</div>
        <el-row :gutter="20">
          <el-col :xs="24" :md="12">
            <el-form-item label="启用状态">
              <div class="ai-api-key-switch">
                <el-switch v-model="formData.enabled" />
                <span class="ai-api-key-switch__hint">
                  {{ formData.enabled ? "启用后即可参与 AI 调用" : "停用后不会被任何功能使用" }}
                </span>
              </div>
            </el-form-item>
          </el-col>
          <el-col v-if="canManagePublic" :xs="24" :md="12">
            <el-form-item label="公开使用">
              <div class="ai-api-key-switch">
                <el-switch v-model="formData.isPublic" />
                <span class="ai-api-key-switch__hint">
                  {{ formData.isPublic ? "已公开，共享用户可引用" : "仅自己可见" }}
                </span>
              </div>
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="过期时间">
              <el-date-picker
                v-model="formData.expiresAt"
                type="datetime"
                class="ai-api-key-dialog__date-picker !w-full"
                value-format="YYYY-MM-DD HH:mm:ss"
                placeholder="不填则视为长期有效"
                clearable
              />
            </el-form-item>
          </el-col>
        </el-row>
      </section>

      <!-- 备注 -->
      <section class="ai-api-key-section">
        <div class="ai-api-key-section__title">备注</div>
        <el-form-item label="备注">
          <el-input
            v-model="formData.remark"
            type="textarea"
            :rows="3"
            placeholder="补充这个 Key 的用途、来源或注意事项"
            show-word-limit
            maxlength="500"
          />
        </el-form-item>
      </section>
    </el-form>

    <template #footer>
      <el-button @click="dialogVisible = false">取消</el-button>
      <el-button type="primary" :loading="formLoading" @click="submitForm">确定</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, reactive, ref, unref } from "vue";
import { ElMessage } from "element-plus";
import {
  createAiApiKey,
  getAiApiKeyDetail,
  updateAiApiKey,
  type AiApiKeyConfig,
} from "@/api/aiApiKey";
import { useUserStore } from "@/store/modules/user";
import { copyToClipboard } from "@/utils/clipboard";

const emit = defineEmits(["success"]);
const userStore = useUserStore();

const dialogVisible = ref(false);
const dialogTitle = ref("");
const formLoading = ref(false);
const formRef = ref();
const canManagePublic = computed(() => !!userStore.user?.isAdmin);

const createFormData = (): AiApiKeyConfig => ({
  name: "",
  model: "",
  apiKey: "",
  baseUrl: "",
  enabled: true,
  isPublic: false,
  expiresAt: "",
  remark: "",
});

const formData = reactive<AiApiKeyConfig>({
  ...createFormData(),
});

const isEditMode = computed(() => !!formData.id);

const formRules = {
  name: [{ required: true, message: "请输入名称", trigger: "blur" }],
  // apiKey 在新增时必填，编辑时可选（留空表示不修改）
  apiKey: [{ required: !isEditMode, message: "请输入 API Key", trigger: "blur" }],
};

const resetForm = () => {
  Object.assign(formData, createFormData(), { id: undefined });
};

const open = async (id?: number) => {
  dialogVisible.value = true;
  dialogTitle.value = id ? "编辑 AI API Key" : "新增 AI API Key";
  resetForm();

  if (!id) {
    console.log('[AiApiKeyDialog] 新增模式');
    return;
  }

  formLoading.value = true;
  try {
    const data = await getAiApiKeyDetail(id);
    console.log('[AiApiKeyDialog] 获取到详情数据', {
      id: data.id,
      name: data.name,
      model: data.model,
      apiKey: data.apiKey ? '***' : '',
      baseUrl: data.baseUrl,
      isPublic: data.isPublic,
    });

    // 编辑时，如果 apiKey 为空或看起来是掩码值，则不填充到 formData
    // 避免提交时把掩码值当作真实 API Key 发送
    const rawApiKey = String(data.apiKey || "").trim();
    const isMaskedKey = rawApiKey.includes("...") || rawApiKey.includes("****");

    console.log('[AiApiKeyDialog] apiKey 检测', {
      rawApiKey: rawApiKey ? '***' : '',
      isMaskedKey,
      willFill: !isMaskedKey && !!rawApiKey,
    });

    Object.assign(formData, {
      ...createFormData(),
      ...data,
      model: data.model || "",
      apiKey: isMaskedKey ? "" : rawApiKey,
      baseUrl: data.baseUrl || "",
      isPublic: !!data.isPublic,
      expiresAt: data.expiresAt || "",
      remark: data.remark || "",
    });

    console.log('[AiApiKeyDialog] formData 填充完成', {
      id: formData.id,
      name: formData.name,
      model: formData.model,
      apiKey: formData.apiKey ? '***' : '',
      baseUrl: formData.baseUrl,
    });
  } catch (error: any) {
    console.error('[AiApiKeyDialog] 获取详情失败', error);
  } finally {
    formLoading.value = false;
  }
};

const copyApiKey = async () => {
  if (!formData.apiKey) {
    ElMessage.warning("暂无可复制的 API Key");
    return;
  }
  await copyToClipboard(formData.apiKey, "API Key 已复制到剪贴板");
};

const submitForm = async () => {
  const form = unref(formRef);
  if (!form) {
    console.error('[AiApiKeyDialog] formRef is null');
    return;
  }

  console.log('[AiApiKeyDialog] submitForm 开始', {
    isEditMode: isEditMode.value,
    formData: { ...formData, apiKey: formData.apiKey ? '***' : '' },
  });

  await form.validate(async (valid) => {
    console.log('[AiApiKeyDialog] 表单验证结果', { valid });

    if (!valid) {
      console.error('[AiApiKeyDialog] 表单验证失败');
      // 获取验证错误信息
      const errors = formRef.value?.validateState;
      console.error('[AiApiKeyDialog] 验证错误详情', errors);
      return;
    }

    formLoading.value = true;
    try {
      const payload: Partial<AiApiKeyConfig> = {
        ...formData,
        name: String(formData.name || "").trim(),
        model: String(formData.model || "").trim(),
        baseUrl: String(formData.baseUrl || "").trim(),
        remark: String(formData.remark || "").trim(),
        expiresAt: formData.expiresAt || "",
        enabled: Boolean(formData.enabled),
      };

      // 编辑模式下，如果 apiKey 为空，则不发送该字段，保持后端原值
      const apiKeyTrimmed = String(formData.apiKey || "").trim();
      if (apiKeyTrimmed) {
        payload.apiKey = apiKeyTrimmed;
      } else if (!payload.id) {
        // 新增时 apiKey 必填
        console.error('[AiApiKeyDialog] 新增时 apiKey 为空');
        ElMessage.error("请输入 API Key");
        formLoading.value = false;
        return;
      }

      if (canManagePublic.value) {
        payload.isPublic = Boolean(formData.isPublic);
      }

      console.log('[AiApiKeyDialog] 准备发送请求', {
        isEdit: !!payload.id,
        payload: { ...payload, apiKey: payload.apiKey ? '***' : undefined },
      });

      if (payload.id) {
        await updateAiApiKey(payload.id, payload);
        ElMessage.success("修改成功");
      } else {
        await createAiApiKey(payload as AiApiKeyConfig);
        ElMessage.success("新增成功");
      }

      dialogVisible.value = false;
      emit("success");
    } catch (error: any) {
      console.error('[AiApiKeyDialog] 保存失败', {
        error: error?.message || error,
        response: error?.response?.data,
        status: error?.response?.status,
      });
      ElMessage.error(error?.message || "保存失败");
    } finally {
      formLoading.value = false;
    }
  });
};

defineExpose({ open });
</script>

<style scoped lang="scss">
.ai-api-key-dialog {
  :deep(.el-dialog__body) {
    max-height: 66vh;
    padding-top: 12px;
    padding-bottom: 4px;
    overflow-y: auto;
  }

  &__form {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  &__date-picker.el-date-editor {
    display: flex;
    align-items: center;
    width: 100%;
  }
}

.ai-api-key-section {
  & + & {
    margin-top: 6px;
  }

  &__title {
    margin-bottom: 10px;
    font-size: 13px;
    font-weight: 600;
    line-height: 1.4;
    color: var(--el-text-color-primary);
  }

  :deep(.el-form-item) {
    margin-bottom: 14px;
  }
}

.ai-api-key-field {
  display: flex;
  gap: 8px;
  width: 100%;

  :deep(.el-input) {
    flex: 1;
  }

  &__copy {
    flex-shrink: 0;
  }
}

.ai-api-key-switch {
  display: flex;
  align-items: center;
  gap: 10px;

  &__hint {
    font-size: 12px;
    line-height: 1.5;
    color: var(--el-text-color-secondary);
  }
}
</style>
