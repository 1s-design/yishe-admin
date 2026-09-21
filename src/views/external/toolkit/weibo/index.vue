<template>
  <ContentWrap :plain="true">
    <div class="toolkit-container">
      <!-- 1. 顶部控制条 -->
      <div class="toolkit-header">
        <div class="toolkit-header__title-area">
          <span class="toolkit-title">微博工具集</span>
          <el-tag :type="sessionTagType" effect="light" round size="small">
            {{ sessionLabel }}
          </el-tag>
        </div>

        <div class="toolkit-header__controls">
          <div class="control-item">
            <span class="control-label">客户端</span>
            <el-select
              v-model="selectedClientId"
              size="small"
              placeholder="选择客户端"
              :loading="loading"
              clearable
              filterable
              style="width: 150px"
            >
              <el-option
                v-for="option in clientOptions"
                :key="option.value"
                :label="option.label"
                :value="option.value"
              />
            </el-select>
          </div>

          <div class="control-item">
            <span class="control-label">环境</span>
            <el-select
              v-model="selectedProfileValue"
              size="small"
              placeholder="选择环境"
              :disabled="!selectedClientId"
              clearable
              style="width: 150px"
            >
              <el-option
                v-for="option in profileOptions"
                :key="option.value"
                :label="option.label"
                :value="option.value"
              />
            </el-select>
          </div>

          <el-button size="small" :loading="loading" :icon="Refresh" @click="refreshClientList">
            刷新客户端
          </el-button>
        </div>
      </div>

      <!-- 2. 会话信息条 -->
      <div class="toolkit-meta-line">
        <span><span class="meta-label">账号：</span>{{ accountText }}</span>
        <span class="meta-dot">·</span>
        <span><span class="meta-label">登录：</span>{{ loginStatusText }}</span>
        <span class="meta-dot">·</span>
        <span><span class="meta-label">更新时间：</span>{{ formatTime(storedSession.updatedAt) || "未采集" }}</span>
      </div>

      <!-- 3. 操作按钮 -->
      <div class="toolkit-actions-row">
        <el-button
          type="primary"
          :loading="runningAction === 'login'"
          :disabled="!canRun"
          :icon="User"
          @click="handleLogin"
        >
          打开微博登录
        </el-button>
        <el-button
          :loading="runningAction === 'checkLogin'"
          :disabled="!canRun"
          :icon="Search"
          @click="handleCheckLogin"
        >
          检测登录状态
        </el-button>
        <el-button
          :loading="runningAction === 'collect'"
          :disabled="!canRun"
          :icon="Download"
          @click="handleCollectSession"
        >
          采集会话
        </el-button>
        <el-button
          type="success"
          :icon="EditPen"
          :disabled="!canRun"
          @click="publishDialogVisible = true"
        >
          发布微博
        </el-button>
      </div>

      <!-- 4. 发布微博弹窗（全屏） -->
      <el-dialog
        v-model="publishDialogVisible"
        title="发布微博"
        fullscreen
        append-to-body
        :close-on-click-modal="false"
      >
        <el-form :model="publishForm" label-width="70px" class="publish-form">
          <el-form-item label="图片URL">
            <el-input
              v-model="publishForm.imageUrls"
              type="textarea"
              :rows="4"
              placeholder="每行一个HTTP图片URL，最多9张&#10;https://cdn.xxx.com/img1.jpg"
            />
            <div class="form-tip">至少1张，最多9张</div>
          </el-form-item>
          <el-form-item label="正文">
            <el-input
              v-model="publishForm.content"
              type="textarea"
              :rows="6"
              placeholder="分享新鲜事..."
              maxlength="5000"
              show-word-limit
            />
          </el-form-item>
          <el-form-item label="话题">
            <el-select
              v-model="publishForm.tags"
              multiple
              filterable
              allow-create
              default-first-option
              placeholder="输入话题后按回车添加"
              style="width: 100%"
            >
              <el-option
                v-for="tag in publishForm.tags"
                :key="tag"
                :label="tag"
                :value="tag"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="参数">
            <pre class="param-preview">{{ JSON.stringify(previewParams, null, 2) }}</pre>
          </el-form-item>
        </el-form>
        <template #footer>
          <el-button @click="publishDialogVisible = false">取消</el-button>
          <el-button
            :loading="creatingTask"
            :disabled="!canPublish"
            @click="handleCreateTask"
          >
            创建发布任务
          </el-button>
          <el-button
            type="primary"
            :loading="publishing"
            :disabled="!canPublish"
            @click="handlePublish"
          >
            直接发布
          </el-button>
        </template>
      </el-dialog>

    </div>
  </ContentWrap>
</template>

<script setup lang="ts">
import {
  Refresh,
  Search,
  Download,
  User,
  EditPen,
} from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import {
  getPlatformSessions,
  updatePlatformSessions,
  deletePlatformSession,
} from '@/api/user';
import { websocketClient, type ServiceCommandResultEvent } from '@/services/websocketClient';
import { useBrowserAutomationExecutionContext } from '@/services/browserAutomationExecutionContext';
import { formatDate } from '@/utils/formatTime';

const {
  loading,
  refreshClients,
  clientOptions,
  profileOptions,
  selectedClientId,
  selectedClient,
  selectedProfileValue,
  effectiveProfileId,
  selectedProfile,
  activeProfile,
  setProfilesPayload,
  resetProfiles,
} = useBrowserAutomationExecutionContext();

const selectedProfileId = computed(
  () => String(effectiveProfileId.value || selectedProfile.value?.id || activeProfile.value?.id || "").trim(),
);
const canRun = computed(() => !!selectedClientId.value && !!selectedProfileId.value);

// 会话状态
const storedPlatformSession = ref<Record<string, any>>({});
const storedSessionLoading = ref(false);
const runningAction = ref('');
const pendingCommandId = ref('');
const lastResult = ref<any>(null);
const publishDialogVisible = ref(false);
const publishing = ref(false);
const creatingTask = ref(false);

// 发布表单
const publishForm = ref({
  imageUrls: '',
  content: '',
  tags: [] as string[],
});

const imageUrlList = computed(() => {
  return publishForm.value.imageUrls
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 9);
});

const canPublish = computed(() => {
  return imageUrlList.value.length > 0 && publishForm.value.content.trim().length > 0;
});

// 实时预览参数
const previewParams = computed(() => ({
  platform: 'weibo',
  images: imageUrlList.value,
  content: publishForm.value.content,
  tags: publishForm.value.tags,
  profileId: selectedProfileId.value,
}));

// 图片加载失败时显示占位
const handleImageError = (event: Event, idx: number) => {
  const img = event.target as HTMLImageElement;
  img.src = `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect fill="%23f0f0f0" width="100" height="100"/><text fill="%23999" x="50" y="50" text-anchor="middle" dy=".3em">图片 ${idx + 1}</text></svg>`;
};

// 会话信息
const storedSession = computed(() => {
  const profileId = selectedProfileId.value;
  const profiles = asPlainObject(storedPlatformSession.value?.profiles);
  return profileId ? asPlainObject(profiles[profileId]) : {};
});

const hasStoredSession = computed(() => Object.keys(storedSession.value).length > 0);

const accountText = computed(() => {
  const userInfo = asPlainObject(storedSession.value?.userInfo);
  const candidates = [
    userInfo.userName,
    userInfo.nickname,
    userInfo.userId,
    storedSession.value.userName,
  ];
  const parts = candidates
    .map((item) => String(item || "").trim())
    .filter(Boolean);
  return parts.length > 0 ? parts.join(" / ") : "-";
});

const loginStatusText = computed(() => {
  if (!hasStoredSession.value) return "未采集";
  const validation = asPlainObject(storedSession.value?.validation);
  const status = String(validation.status || "").trim();
  if (status === "valid") return "已登录";
  if (status === "invalid") return "已失效";
  if (status === "fresh") return "待校验";
  return "未校验";
});

const sessionTagType = computed<"" | "success" | "warning" | "danger" | "info">(() => {
  if (!hasStoredSession.value) return "info";
  const status = String(asPlainObject(storedSession.value?.validation).status || "").trim();
  if (status === "valid") return "success";
  if (status === "invalid") return "danger";
  return "warning";
});

const sessionLabel = computed(() => loginStatusText.value);

// 工具函数
const asPlainObject = (value: any): Record<string, any> =>
  value && typeof value === "object" && !Array.isArray(value) ? value : {};

const formatTime = (value?: string | null) =>
  value ? formatDate(new Date(value), "YYYY-MM-DD HH:mm:ss") : "";

// 操作处理
const refreshClientList = () => {
  void refreshClients();
};

const handleLogin = async () => {
  if (!selectedClientId.value || !selectedProfileId.value) {
    ElMessage.warning("请先选择客户端和环境");
    return;
  }
  runningAction.value = 'login';
  try {
    const { sendServiceCommand } = await import('@/api/system/websocket');
    const res = await sendServiceCommand({
      target: { clientId: selectedClientId.value, pluginKey: 'browser-automation' },
      command: {
        name: 'open-platform',
        payload: {
          platform: 'weibo',
          profileId: selectedProfileId.value,
          url: 'https://weibo.com',
        },
      },
      mode: 'production',
    });
    ElMessage.success('已打开微博页面，请在浏览器中完成登录');
  } catch (error: any) {
    ElMessage.error(error?.message || '打开失败');
  } finally {
    runningAction.value = '';
  }
};

const handleCheckLogin = async () => {
  if (!selectedClientId.value || !selectedProfileId.value) {
    ElMessage.warning("请先选择客户端和环境");
    return;
  }
  runningAction.value = 'checkLogin';
  lastResult.value = null;
  try {
    const { sendServiceCommand } = await import('@/api/system/websocket');
    const res = await sendServiceCommand({
      target: { clientId: selectedClientId.value, pluginKey: 'browser-automation' },
      command: {
        name: 'check-login',
        payload: {
          platform: 'weibo',
          profileId: selectedProfileId.value,
        },
      },
      mode: 'production',
    });
    const cmdId = res?.data?.commandId || res?.commandId || '';
    if (cmdId) {
      pendingCommandId.value = cmdId;
    }
  } catch (error: any) {
    ElMessage.error(error?.message || '检测失败');
    runningAction.value = '';
  }
};

const handleCollectSession = async () => {
  if (!selectedClientId.value || !selectedProfileId.value) {
    ElMessage.warning("请先选择客户端和环境");
    return;
  }
  runningAction.value = 'collect';
  lastResult.value = null;
  try {
    const { sendServiceCommand } = await import('@/api/system/websocket');
    const res = await sendServiceCommand({
      target: { clientId: selectedClientId.value, pluginKey: 'browser-automation' },
      command: {
        name: 'collect-session',
        payload: {
          platform: 'weibo',
          profileId: selectedProfileId.value,
        },
      },
      mode: 'production',
    });
    const cmdId = res?.data?.commandId || res?.commandId || '';
    if (cmdId) {
      pendingCommandId.value = cmdId;
    }
  } catch (error: any) {
    ElMessage.error(error?.message || '采集失败');
    runningAction.value = '';
  }
};

const handlePublish = async () => {
  if (!selectedClientId.value || !selectedProfileId.value) {
    ElMessage.warning("请先选择客户端和环境");
    return;
  }
  if (!canPublish.value) {
    ElMessage.warning("请上传图片并填写正文");
    return;
  }

  const urls = imageUrlList.value;
  if (urls.length === 0) {
    ElMessage.warning('请输入至少1张图片的URL');
    return;
  }

  publishing.value = true;
  try {
    const { directPublish } = await import('@/api/external/directPublish');
    const res = await directPublish({
      platform: 'weibo',
      images: urls,
      content: publishForm.value.content,
      tags: publishForm.value.tags,
      ...(selectedProfileId.value ? { profileId: selectedProfileId.value } : {}),
      ...(selectedClientId.value ? { clientId: selectedClientId.value } : {}),
    });
    if (res.success) {
      ElMessage.success('正在发布...');
      publishDialogVisible.value = false;
      publishForm.value = { imageUrls: '', content: '', tags: [] };
    } else {
      ElMessage.error(res.message || '发送失败');
    }
  } catch (error: any) {
    ElMessage.error(error?.message || '发布失败');
  } finally {
    publishing.value = false;
  }
};

/**
 * 创建发布任务（只建记录，不执行）
 */
const handleCreateTask = async () => {
  if (!selectedClientId.value || !selectedProfileId.value) {
    ElMessage.warning("请先选择客户端和环境");
    return;
  }
  if (!canPublish.value) {
    ElMessage.warning("请输入图片URL并填写正文");
    return;
  }

  const urls = imageUrlList.value;
  if (urls.length === 0) {
    ElMessage.warning('请输入至少1张图片的URL');
    return;
  }

  creatingTask.value = true;
  try {
    const { createPublishTask } = await import('@/api/external/directPublish');
    const res = await createPublishTask({
      platform: 'weibo',
      images: urls,
      content: publishForm.value.content,
      tags: publishForm.value.tags,
      ...(selectedProfileId.value ? { profileId: selectedProfileId.value } : {}),
      ...(selectedClientId.value ? { clientId: selectedClientId.value } : {}),
    });
    if (res.success) {
      ElMessage.success(`发布任务已创建: ${res.taskId}`);
      publishDialogVisible.value = false;
      publishForm.value = { imageUrls: '', content: '', tags: [] };
    } else {
      ElMessage.error(res.message || '创建失败');
    }
  } catch (error: any) {
    ElMessage.error(error?.message || '创建任务失败');
  } finally {
    creatingTask.value = false;
  }
};

const loadStoredSession = async () => {
  if (!selectedProfileId.value) {
    storedPlatformSession.value = {};
    return;
  }
  storedSessionLoading.value = true;
  try {
    storedPlatformSession.value = asPlainObject(
      await getPlatformSessions({ platform: 'weibo' }),
    );
  } catch {
    // ignore
  } finally {
    storedSessionLoading.value = false;
  }
};

const onCommand = (event: ServiceCommandResultEvent) => {
  if (event.clientId !== selectedClientId.value) return;

  if (event.commandId === pendingCommandId.value) {
    pendingCommandId.value = '';
    runningAction.value = '';
    publishing.value = false;
    lastResult.value = event.data || { success: event.success, message: event.message };

    if (event.success) {
      ElMessage.success('操作成功');
      // 如果是采集操作，刷新会话
      if (runningAction.value === 'collect') {
        loadStoredSession();
      }
      // 发布成功后清空表单
      if (publishForm.value.content) {
        publishDialogVisible.value = false;
        publishForm.value = { imageUrls: '', content: '', tags: [] };
      }
    } else {
      ElMessage.error(event.message || event.error || '操作失败');
    }
  }
};

watch(
  () => selectedClient.value?.runtime?.details,
  (details) => setProfilesPayload((details || {}) as Record<string, any>),
  { immediate: true, deep: true },
);

watch(selectedClientId, (value) => {
  resetProfiles();
  selectedProfileValue.value = '';
  storedPlatformSession.value = {};
  if (!value) return;
  setProfilesPayload((selectedClient.value?.runtime?.details || {}) as Record<string, any>);
});

watch(selectedProfileId, () => {
  void loadStoredSession();
});

onMounted(async () => {
  websocketClient.events.on('serviceCommandResult', onCommand);
  await refreshClients();
  setProfilesPayload((selectedClient.value?.runtime?.details || {}) as Record<string, any>);
  if (selectedProfileId.value) void loadStoredSession();
});

onUnmounted(() => {
  websocketClient.events.off('serviceCommandResult', onCommand);
});
</script>

<style scoped lang="scss">
.toolkit-container {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 4px 0;
}

.toolkit-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;

  &__title-area {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  &__controls {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
  }
}

.toolkit-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.control-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.control-label {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  white-space: nowrap;
}

.toolkit-meta-line {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  font-size: 13px;
  color: var(--el-text-color-regular);
  padding: 8px 12px;
  background: var(--el-fill-color-light);
  border-radius: 6px;

  .meta-label {
    color: var(--el-text-color-secondary);
  }

  .meta-dot {
    color: var(--el-border-color-dark);
    font-weight: bold;
  }
}

.toolkit-actions-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.toolkit-result {
  padding: 12px;
  background: var(--el-fill-color-light);
  border-radius: 6px;
  border-left: 3px solid var(--el-color-primary);

  .result-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
  }

  .result-title {
    font-size: 14px;
    font-weight: 600;
    color: var(--el-text-color-primary);
  }
}

.result-content {
  max-height: 400px;
  padding: 12px;
  margin: 0;
  overflow: auto;
  font-size: 12px;
  line-height: 1.5;
  color: var(--el-text-color-regular);
  white-space: pre-wrap;
  background: var(--el-fill-color-blank);
  border-radius: 4px;
}

.form-tip {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-top: 4px;
}

/* 全屏弹窗 */
:deep(.el-dialog__body) {
  padding: 20px 32px;
  overflow-y: auto;
}

:deep(.el-dialog__footer) {
  padding: 12px 32px;
  border-top: 1px solid var(--el-border-color-lighter);
}

.publish-form {
  max-width: 900px;
}

/* 参数预览 */
.param-preview {
  background: var(--el-fill-color-light);
  border-radius: 6px;
  padding: 10px 12px;
  font-size: 12px;
  max-height: 160px;
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-all;
  color: var(--el-text-color-regular);
  border: 1px solid var(--el-border-color-lighter);
  margin: 0;
}
</style>
