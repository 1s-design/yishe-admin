<template>
  <Dialog
    v-model="dialogVisible"
    :title="dialogTitle"
    :initial-fullscreen="true"
    scroll
    class="shop-dialog"
  >
    <el-form
      ref="formRef"
      :model="formData"
      :rules="formRules"
      label-position="right"
      label-width="80px"
      class="shop-form"
      v-loading="formLoading"
    >
      <div class="group-title">基础信息</div>
      <el-row :gutter="16">
        <el-col :xs="24" :sm="12" :md="6">
          <el-form-item :label="t('shop.name')" prop="name">
            <el-input
              v-model="formData.name"
              :placeholder="t('shop.namePlaceholder')"
              clearable
            />
          </el-form-item>
        </el-col>
        <el-col :xs="24" :sm="12" :md="4">
          <el-form-item label="平台" prop="platform">
            <el-select v-model="formData.platform" style="width: 100%" @change="onPlatformChange">
              <el-option label="抖店" value="doudian" />
              <el-option label="拼多多" value="pdd" />
              <el-option label="Temu" value="temu" />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :xs="24" :sm="24" :md="14">
          <el-form-item :label="t('shop.description')" prop="description">
            <el-input
              v-model="formData.description"
              type="textarea"
              :rows="2"
              resize="none"
              :placeholder="t('shop.descriptionPlaceholder')"
            />
          </el-form-item>
        </el-col>
      </el-row>

      <el-row :gutter="16">
        <el-col :xs="24" :sm="12" :md="6">
          <el-form-item :label="t('shop.logo')" prop="logo">
            <UploadImg v-model="formData.logo" />
          </el-form-item>
        </el-col>
        <el-col :xs="24" :sm="12" :md="18">
          <el-form-item :label="t('shop.carousel')" prop="carousel">
            <UploadImgs v-model="formData.carousel" />
          </el-form-item>
        </el-col>
      </el-row>

      <div class="divider"></div>

      <div class="group-title">发布执行</div>
      <el-form-item label="执行环境">
        <el-select
          v-model="selectedEnvKeys"
          multiple
          filterable
          clearable
          collapse-tags
          collapse-tags-tooltip
          :loading="envLoading"
          no-data-text="没有检测到任何浏览器环境，请先在客户端打开环境"
          placeholder="选择允许执行该店铺任务的浏览器环境，可多选"
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
              v-for="env in selectedEnvironments"
              :key="environmentKeyOf(env)"
              class="env-item"
            >
              <i class="env-dot" :class="envDotClass(env)"></i>
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
      <el-button @click="dialogVisible = false">{{ t('common.cancel') }}</el-button>
      <el-button type="primary" @click="submitForm" :loading="formLoading">
        {{ t('common.confirm') }}
      </el-button>
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, reactive, unref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { Close } from '@element-plus/icons-vue'
import {
  createShop,
  updateShop,
  getShopDetail,
  getShopExecutionEnvironments,
  type ShopExecutionEnvironment
} from '@/api/shop'
import UploadImg from '@/components/UploadFile/src/UploadImg.vue'
import UploadImgs from '@/components/UploadFile/src/UploadImgs.vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const emit = defineEmits(['success'])

const dialogVisible = ref(false)
const dialogTitle = ref('')
const formLoading = ref(false)
const formRef = ref()
const formData = reactive({
  id: undefined as number | undefined,
  name: '',
  description: '',
  logo: '',
  carousel: [] as string[],
  platform: 'doudian',
})

/**
 * 勾选的执行环境，存的是「设备 + 环境」复合键。
 *
 * profileId 只在单台机器内唯一：换过机器码的旧设备记录会和新设备上报
 * 同一个 profileId（同一个 user-data 目录），只按 profileId 做选中值的话，
 * 选中其中一个，同值的另一个选项也会跟着高亮。
 */
const selectedEnvKeys = ref<string[]>([])
const environments = ref<ShopExecutionEnvironment[]>([])
const envLoading = ref(false)

/** 复合唯一键：clientId::profileId，无 clientId 时退化 legacy::profileId */
const environmentKeyOf = (item: {
  clientId?: string | null
  profileId?: string | null
  environmentKey?: string | null
}) => {
  const profileId = String(item?.profileId || '').trim()
  if (!profileId) return ''
  const clientId = String(item?.clientId || '').trim()
  return clientId ? `${clientId}::${profileId}` : `legacy::${profileId}`
}

/** 从复合键里取回 profileId */
const profileIdOfKey = (key: string) => {
  const parts = String(key || '').split('::')
  return (parts.length > 1 ? parts[1] : parts[0] || '').trim()
}

/**
 * 把店铺已绑定的环境映射成候选列表里的键。
 * 老数据可能没存 clientId、或存的设备已被清理，这时退到同 profileId 里
 * 最优先的那台（在线优先），避免保存时把绑定写回已经不存在的设备。
 */
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

/**
 * 候选环境：全部列出，已勾选但当前不在清单里的（环境被删/换机器）也保留，
 * 否则一保存就会把历史绑定悄悄丢掉。
 */
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

/** 已选环境，按勾选顺序展示 */
const selectedEnvironments = computed(() =>
  selectedEnvKeys.value
    .map((key) => availableEnvironments.value.find((item) => environmentKeyOf(item) === key))
    .filter(Boolean) as ShopExecutionEnvironment[]
)

const onlineEnvCount = computed(
  () => selectedEnvironments.value.filter((item) => item.clientOnline).length
)

const envSummaryText = computed(() => {
  if (!selectedEnvironments.value.length) {
    return formData.platform === 'doudian'
      ? '未绑定环境，该店铺的发布任务会被跳过'
      : '未绑定环境时不限制执行位置'
  }
  return `${selectedEnvironments.value.length} 个环境，${onlineEnvCount.value} 个在线`
})

const envStatusText = (item: ShopExecutionEnvironment) => {
  if (!item.clientOnline) return '设备离线'
  return item.busy ? '执行中' : '在线'
}

const envDotClass = (item: ShopExecutionEnvironment) => {
  if (!item.clientOnline) return 'is-offline'
  return item.busy ? 'is-busy' : 'is-online'
}

const formatEnvLabel = (item: ShopExecutionEnvironment) => {
  return `${item.clientLabel} · ${item.profileName}（${envStatusText(item)}）`
}

const removeEnv = (envKey: string) => {
  selectedEnvKeys.value = selectedEnvKeys.value.filter((key) => key !== envKey)
}

const loadEnvironments = async () => {
  envLoading.value = true
  try {
    const res: any = await getShopExecutionEnvironments(formData.platform || 'doudian')
    environments.value = Array.isArray(res?.environments) ? res.environments : []
  } catch (error) {
    console.warn('[shop] 加载执行环境失败', error)
    environments.value = []
  } finally {
    envLoading.value = false
  }
}

/** 切换平台后旧平台的环境不再有效，清空重选 */
const onPlatformChange = () => {
  selectedEnvKeys.value = []
  environments.value = []
  void loadEnvironments()
}

const formRules = {
  name: [{ required: true, message: t('shop.nameRequired'), trigger: 'blur' }]
}

const open = async (id?: number) => {
  dialogVisible.value = true
  dialogTitle.value = id ? t('shop.editShop') : t('shop.addShop')
  resetForm()
  let storedProfiles: any[] = []
  if (id) {
    formLoading.value = true
    try {
      const res: any = await getShopDetail(id)
      formData.id = res?.id
      formData.name = res?.name || ''
      formData.description = res?.description || ''
      formData.logo = res?.logo || ''
      formData.carousel = Array.isArray(res?.carousel) ? res.carousel : []
      formData.platform = res?.platform || 'doudian'
      storedProfiles = Array.isArray(res?.executionProfiles) ? res.executionProfiles : []
    } finally {
      formLoading.value = false
    }
  }
  // 先拿到实时环境清单，才能把绑定的环境还原成「设备 + 环境」的正确选项
  await loadEnvironments()
  selectedEnvKeys.value = storedProfiles
    .map((item) => resolveStoredKey(item))
    .filter(Boolean)
}

const resetForm = () => {
  formData.id = undefined
  formData.name = ''
  formData.description = ''
  formData.logo = ''
  formData.carousel = []
  formData.platform = 'doudian'
  selectedEnvKeys.value = []
}

const submitForm = async () => {
  const form = unref(formRef)
  if (!form) return
  await form.validate(async (valid) => {
    if (valid) {
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
        const data: any = {
          id: formData.id,
          name: formData.name,
          description: formData.description,
          logo: formData.logo,
          carousel: formData.carousel,
          platform: formData.platform,
          executionProfiles,
        }
        if (data.id) {
          await updateShop(data.id, data)
          ElMessage.success(t('common.updateSuccess'))
        } else {
          await createShop(data)
          ElMessage.success(t('common.addSuccess'))
        }
        dialogVisible.value = false
        emit('success')
      } finally {
        formLoading.value = false
      }
    }
  })
}

defineExpose({ open })
</script>

<style>
/* 只收起内容区默认内边距，让表单从左到右铺满；不覆盖任何背景，沿用 Element 默认 */
.shop-dialog .el-dialog__body {
  padding: 0 !important;
}
</style>

<style scoped>
.shop-form {
  padding: 16px 16px 4px;
}

.group-title {
  margin-bottom: 12px;
  font-size: 13px;
  font-weight: 500;
  line-height: 1.4;
  color: var(--el-text-color-secondary);
}

.divider {
  margin: 2px 0 16px;
  border-top: 1px solid var(--el-border-color-lighter);
}

.env-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 16px;
  width: 100%;
  margin-top: 6px;
  font-size: 12px;
  line-height: 20px;
  color: var(--el-text-color-secondary);
}

.env-summary {
  flex: none;
}

.env-list {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 16px;
  min-width: 0;
}

.env-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  max-width: 320px;
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
