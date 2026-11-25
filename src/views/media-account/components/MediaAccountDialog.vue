<template>
  <Dialog
    v-model="dialogVisible"
    :title="dialogTitle"
    :initial-fullscreen="true"
    scroll
    class="media-account-dialog"
  >
    <el-form
      ref="formRef"
      :model="formData"
      :rules="formRules"
      label-position="right"
      label-width="96px"
      class="media-account-form"
      v-loading="formLoading"
    >
      <el-row :gutter="16">
        <el-col :xs="24" :sm="12">
          <el-form-item label="账号名称" prop="name">
            <el-input
              v-model="formData.name"
              placeholder="例如：治愈风景抖音1号"
              clearable
            />
          </el-form-item>
        </el-col>
        <el-col :xs="24" :sm="12">
          <el-form-item label="所属平台" prop="platform">
            <el-select
              v-model="formData.platform"
              style="width: 100%"
              @change="onPlatformChange"
            >
              <el-option
                v-for="item in MEDIA_PLATFORM_OPTIONS"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </el-select>
          </el-form-item>
        </el-col>
      </el-row>

      <el-row :gutter="16">
        <el-col :xs="24" :sm="12">
          <el-form-item label="平台账号标识" prop="platformAccountId">
            <el-input
              v-model="formData.platformAccountId"
              placeholder="可选：主页 ID / 昵称，便于核对"
              clearable
            />
          </el-form-item>
        </el-col>
        <el-col :xs="24" :sm="12">
          <el-form-item label="启用状态" prop="enabled">
            <el-switch v-model="formData.enabled" active-text="启用" inactive-text="停用" />
          </el-form-item>
        </el-col>
      </el-row>

      <el-form-item label="定位备注" prop="remark">
        <el-input
          v-model="formData.remark"
          type="textarea"
          :rows="2"
          resize="none"
          placeholder="可选：人工备忘或补充说明"
        />
      </el-form-item>

      <el-divider content-position="left">运营方向（供智能体参考）</el-divider>

      <el-form-item label="运营方向">
        <el-input
          v-model="formData.operationStrategy.direction"
          type="textarea"
          :rows="4"
          placeholder="例如：热门新闻资讯 + POD商品设计分享 + 免费为小企业和个人提供Logo/名片/POD设计"
        />
      </el-form-item>

      <el-form-item label="内容风格">
        <el-input
          v-model="formData.operationStrategy.style"
          type="textarea"
          :rows="4"
          placeholder="例如：150字内简洁有观点，带1-2个#话题#，配1张图，不硬广不标题党"
        />
      </el-form-item>

      <el-form-item label="禁忌红线">
        <el-input
          v-model="formData.operationStrategy.forbidden"
          placeholder="例如：政治、社会负面、明星八卦、拉布布、奥特曼"
          clearable
        />
      </el-form-item>

      <el-form-item label="绑定环境">
        <el-select
          v-model="selectedEnvKeys"
          multiple
          filterable
          clearable
          collapse-tags
          collapse-tags-tooltip
          :loading="envLoading"
          no-data-text="没有检测到任何浏览器环境，请先在客户端打开环境"
          placeholder="选择允许执行该媒体账号的客户端与浏览器环境（按选择顺序为主备优先级）"
          style="width: 100%"
        >
          <el-option
            v-for="item in availableEnvironments"
            :key="environmentKeyOf(item)"
            :label="formatEnvLabel(item)"
            :value="environmentKeyOf(item)"
          />
        </el-select>

        <div class="env-bar">
          <span class="env-summary">{{ envSummaryText }}</span>
          <div v-if="selectedEnvironments.length" class="env-list">
            <span
              v-for="(env, idx) in selectedEnvironments"
              :key="environmentKeyOf(env)"
              class="env-item"
            >
              <i class="env-dot" :class="envDotClass(env)"></i>
              <span class="env-order">{{ idx === 0 ? '主' : `备${idx}` }}</span>
              <span class="env-name" :title="`${env.clientLabel} · ${env.profileName}`">
                {{ env.clientLabel }} · {{ env.profileName }}
              </span>
              <span class="env-state">{{ envStatusText(env) }}</span>
              <el-icon class="env-remove" @click="removeEnv(environmentKeyOf(env))">
                <Close />
              </el-icon>
            </span>
          </div>
        </div>
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="dialogVisible = false">取消</el-button>
      <el-button type="primary" @click="submitForm" :loading="formLoading">确定</el-button>
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, reactive, unref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { Close } from '@element-plus/icons-vue'
import {
  MEDIA_PLATFORM_OPTIONS,
  createMediaAccount,
  updateMediaAccount,
  getMediaAccountDetail,
  getMediaAccountExecutionEnvironments,
  type MediaAccountExecutionEnvironment,
} from '@/api/media-account'

const emit = defineEmits(['success'])

const dialogVisible = ref(false)
const dialogTitle = ref('')
const formLoading = ref(false)
const formRef = ref()
const formData = reactive({
  id: undefined as number | undefined,
  name: '',
  platform: 'douyin',
  platformAccountId: '',
  remark: '',
  enabled: true,
  operationStrategy: {
    direction: '',
    style: '',
    forbidden: '',
  },
})

const selectedEnvKeys = ref<string[]>([])
const environments = ref<MediaAccountExecutionEnvironment[]>([])
const envLoading = ref(false)

const environmentKeyOf = (item: {
  clientId?: string | null
  profileId?: string | null
}) => {
  const profileId = String(item?.profileId || '').trim()
  if (!profileId) return ''
  const clientId = String(item?.clientId || '').trim()
  return clientId ? `${clientId}::${profileId}` : `legacy::${profileId}`
}

const profileIdOfKey = (key: string) => {
  const parts = String(key || '').split('::')
  return (parts.length > 1 ? parts[1] : parts[0] || '').trim()
}

const resolveStoredKey = (item: any) => {
  const profileId = String(
    typeof item === 'string' ? item : item?.profileId || ''
  ).trim()
  if (!profileId) return ''
  const storedClientId = typeof item === 'string' ? '' : String(item?.clientId || '').trim()
  const rawKey = storedClientId ? `${storedClientId}::${profileId}` : `legacy::${profileId}`
  const live = environments.value
  if (live.some((env) => environmentKeyOf(env) === rawKey)) return rawKey
  const sameProfile = live.filter((env) => env.profileId === profileId)
  if (!sameProfile.length) return rawKey
  const best = sameProfile.find((env) => env.clientOnline) || sameProfile[0]
  return environmentKeyOf(best)
}

const availableEnvironments = computed(() => {
  const list = environments.value.filter((item) => item.profileExists !== false)
  const seen = new Set(list.map((item) => environmentKeyOf(item)))
  for (const key of selectedEnvKeys.value) {
    if (!key || seen.has(key)) continue
    seen.add(key)
    list.push({
      clientId: key.includes('::') ? key.split('::')[0] : null,
      machineCode: null,
      clientLabel: '（未上报设备）',
      clientOnline: false,
      environmentKey: key,
      profileId: profileIdOfKey(key),
      profileName: profileIdOfKey(key),
      profileExists: true,
      isActiveProfile: false,
      instanceRunning: false,
      busy: false,
      currentTaskId: null,
    })
  }
  return list
})

const selectedEnvironments = computed(() =>
  selectedEnvKeys.value
    .map((key) => availableEnvironments.value.find((item) => environmentKeyOf(item) === key))
    .filter(Boolean) as MediaAccountExecutionEnvironment[]
)

const onlineEnvCount = computed(
  () => selectedEnvironments.value.filter((item) => item.clientOnline).length
)

const envSummaryText = computed(() => {
  if (!selectedEnvironments.value.length) {
    return '未绑定环境：绑定该账号的发布任务将被拦截跳过，不会乱跑'
  }
  return `已选 ${selectedEnvironments.value.length} 个环境（${onlineEnvCount.value} 个在线），按顺序主备容灾`
})

const envStatusText = (item: MediaAccountExecutionEnvironment) => {
  if (!item.clientOnline) return '设备离线'
  return item.busy ? '执行中' : '在线'
}

const envDotClass = (item: MediaAccountExecutionEnvironment) => {
  if (!item.clientOnline) return 'is-offline'
  return item.busy ? 'is-busy' : 'is-online'
}

const formatEnvLabel = (item: MediaAccountExecutionEnvironment) => {
  return `${item.clientLabel} · ${item.profileName}（${envStatusText(item)}）`
}

const removeEnv = (envKey: string) => {
  selectedEnvKeys.value = selectedEnvKeys.value.filter((key) => key !== envKey)
}

const loadEnvironments = async () => {
  envLoading.value = true
  try {
    const res: any = await getMediaAccountExecutionEnvironments(formData.platform || 'douyin')
    environments.value = Array.isArray(res?.environments) ? res.environments : []
  } catch (error) {
    console.warn('[media-account] 加载执行环境失败', error)
    environments.value = []
  } finally {
    envLoading.value = false
  }
}

const onPlatformChange = () => {
  void loadEnvironments()
}

const formRules = {
  name: [{ required: true, message: '请输入媒体账号名称', trigger: 'blur' }],
  platform: [{ required: true, message: '请选择所属平台', trigger: 'change' }],
}

const resetForm = () => {
  formData.id = undefined
  formData.name = ''
  formData.platform = 'douyin'
  formData.platformAccountId = ''
  formData.remark = ''
  formData.enabled = true
  formData.operationStrategy.direction = ''
  formData.operationStrategy.style = ''
  formData.operationStrategy.forbidden = ''
  selectedEnvKeys.value = []
}

const open = async (id?: number) => {
  dialogVisible.value = true
  dialogTitle.value = id ? '编辑媒体账号' : '新增媒体账号'
  resetForm()
  let storedProfiles: any[] = []
  if (id) {
    formLoading.value = true
    try {
      const res: any = await getMediaAccountDetail(id)
      formData.id = res?.id
      formData.name = res?.name || ''
      formData.platform = res?.platform || 'douyin'
      formData.platformAccountId = res?.platformAccountId || ''
      formData.remark = res?.remark || ''
      formData.enabled = res?.enabled !== false
      const strategy = res?.operationStrategy || {}
      formData.operationStrategy.direction = strategy.direction || ''
      formData.operationStrategy.style = strategy.style || ''
      formData.operationStrategy.forbidden = strategy.forbidden || ''
      storedProfiles = Array.isArray(res?.executionProfiles) ? res.executionProfiles : []
    } finally {
      formLoading.value = false
    }
  }
  await loadEnvironments()
  selectedEnvKeys.value = storedProfiles
    .map((item) => resolveStoredKey(item))
    .filter(Boolean)
}

const submitForm = async () => {
  const form = unref(formRef)
  if (!form) return
  await form.validate(async (valid) => {
    if (!valid) return
    formLoading.value = true
    try {
      const executionProfiles = selectedEnvKeys.value.map((envKey) => {
        const matched = availableEnvironments.value.find(
          (item) => environmentKeyOf(item) === envKey
        )
        return {
          profileId: matched?.profileId || profileIdOfKey(envKey),
          profileName: matched?.profileName || undefined,
          clientId: matched?.clientId || undefined,
          machineCode: matched?.machineCode || undefined,
        }
      })
      const strategy = {
        direction: formData.operationStrategy.direction.trim() || undefined,
        style: formData.operationStrategy.style.trim() || undefined,
        forbidden: formData.operationStrategy.forbidden.trim() || undefined,
      }
      const hasStrategy = Boolean(strategy.direction || strategy.style || strategy.forbidden)
      const payload = {
        name: formData.name,
        platform: formData.platform,
        platformAccountId: formData.platformAccountId || null,
        remark: formData.remark || null,
        operationStrategy: hasStrategy ? strategy : null,
        enabled: formData.enabled,
        executionProfiles,
      }
      if (formData.id) {
        await updateMediaAccount(formData.id, payload)
        ElMessage.success('更新成功')
      } else {
        await createMediaAccount(payload)
        ElMessage.success('创建成功')
      }
      dialogVisible.value = false
      emit('success')
    } finally {
      formLoading.value = false
    }
  })
}

defineExpose({ open })
</script>

<style scoped>
.media-account-form {
  max-width: 920px;
  margin: 0 auto;
  padding: 12px 16px 8px;
}

.env-bar {
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 100%;
  margin-top: 6px;
  font-size: 12px;
  line-height: 20px;
  color: var(--el-text-color-secondary);
}

.env-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 14px;
}

.env-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  max-width: 340px;
  font-size: 12px;
  color: var(--el-text-color-regular);
}

.env-dot {
  flex: none;
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

.env-dot.is-online {
  background: var(--el-color-success);
}

.env-dot.is-busy {
  background: var(--el-color-warning);
}

.env-dot.is-offline {
  background: var(--el-color-info);
}

.env-order {
  flex: none;
  padding: 0 4px;
  border-radius: 3px;
  font-size: 11px;
  background: var(--el-fill-color);
  color: var(--el-text-color-secondary);
}

.env-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.env-state {
  flex: none;
  color: var(--el-text-color-placeholder);
}

.env-remove {
  flex: none;
  cursor: pointer;
  color: var(--el-text-color-placeholder);
}

.env-remove:hover {
  color: var(--el-color-danger);
}
</style>
