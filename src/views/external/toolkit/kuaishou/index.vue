<template>
  <ContentWrap :plain="true">
    <div class="toolkit-container">
      <div class="toolkit-header">
        <div class="toolkit-header__title-area">
          <span class="toolkit-title">快手工具集</span>
          <el-tag :type="sessionTagType" effect="light" round size="small">{{ sessionLabel }}</el-tag>
        </div>
        <div class="toolkit-header__controls">
          <div class="control-item">
            <span class="control-label">客户端</span>
            <el-select v-model="selectedClientId" size="small" placeholder="选择客户端" :loading="loading" clearable filterable style="width: 150px">
              <el-option v-for="option in clientOptions" :key="option.value" :label="option.label" :value="option.value" />
            </el-select>
          </div>
          <div class="control-item">
            <span class="control-label">环境</span>
            <el-select v-model="selectedProfileValue" size="small" placeholder="选择环境" :disabled="!selectedClientId" clearable style="width: 150px">
              <el-option v-for="option in profileOptions" :key="option.value" :label="option.label" :value="option.value" />
            </el-select>
          </div>
          <el-button size="small" :loading="loading" :icon="Refresh" @click="refreshClientList">刷新客户端</el-button>
        </div>
      </div>

      <div class="toolkit-meta-line">
        <span><span class="meta-label">账号：</span>{{ accountText }}</span>
        <span class="meta-dot">·</span>
        <span><span class="meta-label">登录：</span>{{ loginStatusText }}</span>
      </div>

      <div class="toolkit-actions-row">
        <el-button type="primary" :loading="runningAction === 'login'" :disabled="!canRun" :icon="User" @click="handleLogin">打开快手登录</el-button>
        <el-button type="success" :icon="EditPen" :disabled="!canRun" @click="publishDialogVisible = true">发布快手</el-button>
      </div>

      <el-dialog v-model="publishDialogVisible" title="发布快手" fullscreen append-to-body :close-on-click-modal="false">
        <el-form :model="publishForm" label-width="70px" class="publish-form">
          <el-form-item label="视频URL">
            <el-input v-model="publishForm.videoUrl" placeholder="输入视频文件URL（MP4格式）" />
            <div class="form-tip">快手仅支持视频发布</div>
          </el-form-item>
          <el-form-item label="标题">
            <el-input v-model="publishForm.title" placeholder="输入标题（可选）" maxlength="55" show-word-limit />
          </el-form-item>
          <el-form-item label="正文">
            <el-input v-model="publishForm.content" type="textarea" :rows="6" placeholder="分享新鲜事..." maxlength="5000" show-word-limit />
          </el-form-item>
          <el-form-item label="话题">
            <el-select v-model="publishForm.tags" multiple filterable allow-create default-first-option placeholder="输入话题后按回车添加" style="width: 100%">
              <el-option v-for="tag in publishForm.tags" :key="tag" :label="tag" :value="tag" />
            </el-select>
          </el-form-item>
          <el-form-item label="参数">
            <pre class="param-preview">{{ JSON.stringify(previewParams, null, 2) }}</pre>
          </el-form-item>
        </el-form>
        <template #footer>
          <el-button @click="publishDialogVisible = false">取消</el-button>
          <el-button :loading="creatingTask" :disabled="!canPublish" @click="handleCreateTask">创建发布任务</el-button>
          <el-button type="primary" :loading="publishing" :disabled="!canPublish" @click="handlePublish">直接发布</el-button>
        </template>
      </el-dialog>
    </div>
  </ContentWrap>
</template>

<script setup lang="ts">
import { Refresh, User, EditPen } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import { computed, onMounted, watch, ref } from 'vue';
import { getPlatformSessions } from '@/api/user';
import { useBrowserAutomationExecutionContext } from '@/services/browserAutomationExecutionContext';

const { loading, refreshClients, clientOptions, profileOptions, selectedClientId, selectedClient, selectedProfileValue, effectiveProfileId, selectedProfile, activeProfile, setProfilesPayload, resetProfiles } = useBrowserAutomationExecutionContext();
const selectedProfileId = computed(() => String(effectiveProfileId.value || selectedProfile.value?.id || activeProfile.value?.id || "").trim());
const canRun = computed(() => !!selectedClientId.value && !!selectedProfileId.value);
const storedPlatformSession = ref<Record<string, any>>({});
const runningAction = ref('');
const publishDialogVisible = ref(false);
const publishing = ref(false);
const creatingTask = ref(false);
const publishForm = ref({ videoUrl: '', title: '', content: '', tags: [] as string[] });

const canPublish = computed(() => !!publishForm.value.videoUrl.trim());
const previewParams = computed(() => ({ platform: 'kuaishou', video: publishForm.value.videoUrl, title: publishForm.value.title, content: publishForm.value.content, tags: publishForm.value.tags, profileId: selectedProfileId.value }));
const asPlainObject = (value: any): Record<string, any> => value && typeof value === "object" && !Array.isArray(value) ? value : {};
const storedSession = computed(() => { const p = selectedProfileId.value; const profiles = asPlainObject(storedPlatformSession.value?.profiles); return p ? asPlainObject(profiles[p]) : {}; });
const hasStoredSession = computed(() => Object.keys(storedSession.value).length > 0);
const accountText = computed(() => "-");
const loginStatusText = computed(() => hasStoredSession.value ? "已采集" : "未采集");
const sessionTagType = computed<"" | "success" | "warning" | "danger" | "info">(() => hasStoredSession.value ? "success" : "info");
const sessionLabel = computed(() => loginStatusText.value);
const refreshClientList = () => void refreshClients();

const handleLogin = async () => {
  if (!selectedClientId.value || !selectedProfileId.value) { ElMessage.warning("请先选择客户端和环境"); return; }
  runningAction.value = 'login';
  try {
    const { sendServiceCommand } = await import('@/api/system/websocket');
    await sendServiceCommand({ target: { clientId: selectedClientId.value, pluginKey: 'browser-automation' }, command: { name: 'open-platform', payload: { platform: 'kuaishou', profileId: selectedProfileId.value, url: 'https://creator.kuaishou.com' } }, mode: 'production' });
    ElMessage.success('已打开快手创作者平台');
  } catch (error: any) { ElMessage.error(error?.message || '打开失败'); } finally { runningAction.value = ''; }
};

const handlePublish = async () => {
  if (!selectedClientId.value || !selectedProfileId.value) { ElMessage.warning("请先选择客户端和环境"); return; }
  if (!canPublish.value) { ElMessage.warning("请输入视频URL"); return; }
  publishing.value = true;
  try {
    const { directPublish } = await import('@/api/external/directPublish');
    const res = await directPublish({ platform: 'kuaishou', images: [], video: publishForm.value.videoUrl, title: publishForm.value.title, content: publishForm.value.content, tags: publishForm.value.tags, ...(selectedProfileId.value ? { profileId: selectedProfileId.value } : {}), ...(selectedClientId.value ? { clientId: selectedClientId.value } : {}) });
    if (res.success) { ElMessage.success('正在发布...'); publishDialogVisible.value = false; publishForm.value = { videoUrl: '', title: '', content: '', tags: [] }; } else { ElMessage.error(res.message || '发送失败'); }
  } catch (error: any) { ElMessage.error(error?.message || '发布失败'); } finally { publishing.value = false; }
};

const handleCreateTask = async () => {
  if (!selectedClientId.value || !selectedProfileId.value) { ElMessage.warning("请先选择客户端和环境"); return; }
  if (!canPublish.value) { ElMessage.warning("请输入视频URL"); return; }
  creatingTask.value = true;
  try {
    const { createPublishTask } = await import('@/api/external/directPublish');
    const res = await createPublishTask({ platform: 'kuaishou', images: [], video: publishForm.value.videoUrl, title: publishForm.value.title, content: publishForm.value.content, tags: publishForm.value.tags, ...(selectedProfileId.value ? { profileId: selectedProfileId.value } : {}), ...(selectedClientId.value ? { clientId: selectedClientId.value } : {}) });
    if (res.success) { ElMessage.success(`发布任务已创建: ${res.taskId}`); publishDialogVisible.value = false; publishForm.value = { videoUrl: '', title: '', content: '', tags: [] }; } else { ElMessage.error(res.message || '创建失败'); }
  } catch (error: any) { ElMessage.error(error?.message || '创建任务失败'); } finally { creatingTask.value = false; }
};

const loadStoredSession = async () => { if (!selectedProfileId.value) { storedPlatformSession.value = {}; return; } try { storedPlatformSession.value = asPlainObject(await getPlatformSessions({ platform: 'kuaishou' })); } catch { /* ignore */ } };
watch(() => selectedClient.value?.runtime?.details, (details) => setProfilesPayload((details || {}) as Record<string, any>), { immediate: true, deep: true });
watch(selectedClientId, (value) => { resetProfiles(); selectedProfileValue.value = ''; storedPlatformSession.value = {}; if (!value) return; setProfilesPayload((selectedClient.value?.runtime?.details || {}) as Record<string, any>); });
watch(selectedProfileId, () => { void loadStoredSession(); });
onMounted(async () => { await refreshClients(); setProfilesPayload((selectedClient.value?.runtime?.details || {}) as Record<string, any>); if (selectedProfileId.value) void loadStoredSession(); });
</script>

<style scoped lang="scss">
.toolkit-container { display: flex; flex-direction: column; gap: 14px; padding: 4px 0; }
.toolkit-header { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; &__title-area { display: flex; align-items: center; gap: 10px; } &__controls { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; } }
.toolkit-title { font-size: 16px; font-weight: 600; color: var(--el-text-color-primary); }
.control-item { display: flex; align-items: center; gap: 6px; }
.control-label { font-size: 12px; color: var(--el-text-color-secondary); white-space: nowrap; }
.toolkit-meta-line { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; font-size: 13px; color: var(--el-text-color-regular); padding: 8px 12px; background: var(--el-fill-color-light); border-radius: 6px; .meta-label { color: var(--el-text-color-secondary); } .meta-dot { color: var(--el-border-color-dark); font-weight: bold; } }
.toolkit-actions-row { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; }
.form-tip { font-size: 12px; color: var(--el-text-color-secondary); margin-top: 4px; }
:deep(.el-dialog__body) { padding: 20px 32px; overflow-y: auto; }
:deep(.el-dialog__footer) { padding: 12px 32px; border-top: 1px solid var(--el-border-color-lighter); }
.publish-form { max-width: 900px; }
.param-preview { background: var(--el-fill-color-light); border-radius: 6px; padding: 10px 12px; font-size: 12px; max-height: 160px; overflow: auto; white-space: pre-wrap; word-break: break-all; color: var(--el-text-color-regular); border: 1px solid var(--el-border-color-lighter); margin: 0; }
</style>
