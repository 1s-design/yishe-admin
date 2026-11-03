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
          v-model="selectedProfileIds"
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
            :key="item.profileId"
            :label="formatEnvLabel(item)"
            :value="item.profileId"
          />
        </el-select>

        <div class="env-bar">
          <span class="env-summary">{{ envSummaryText }}</span>
          <div v-if="selectedEnvironments.length" class="env-list">
            <span v-for="env in selectedEnvironments" :key="env.profileId" class="env-item">
              <i class="env-dot" :class="envDotClass(env)"></i>
              <span class="env-name" :title="`${env.clientLabel} · ${env.profileName}`">
                {{ env.clientLabel }} · {{ env.profileName }}
              </span>
              <span class="env-state">{{ envStatusText(env) }}</span>
              <el-icon class="env-remove" @click="removeEnv(env.profileId)">
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

/** 勾选的执行环境 profileId */
const selectedProfileIds = ref<string[]>([])
const environments = ref<ShopExecutionEnvironment[]>([])
const envLoading = ref(false)

/**
 * 候选环境：全部列出，已勾选但当前不在清单里的（环境被删/换机器）也保留，
 * 否则一保存就会把历史绑定悄悄丢掉。
 */
const availableEnvironments = computed(() => {
  const picked = new Set(selectedProfileIds.value)
  const list = environments.value.filter((item) => item.profileExists !== false)
  for (const profileId of picked) {
    if (!list.some((item) => item.profileId === profileId)) {
      list.push({
        clientId: null,
        machineCode: null,
        clientLabel: '（未上报设备）',
        clientOnline: false,
        profileId,
        profileName: profileId,
        profileExists: true,
        isActiveProfile: false,
        instanceRunning: false,
        busy: false,
        currentTaskId: null,
      })
    }
  }
  return list
})

/** 已选环境，按勾选顺序展示 */
const selectedEnvironments = computed(() =>
  selectedProfileIds.value
    .map((profileId) => availableEnvironments.value.find((item) => item.profileId === profileId))
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

const removeEnv = (profileId: string) => {
  selectedProfileIds.value = selectedProfileIds.value.filter((id) => id !== profileId)
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
  selectedProfileIds.value = []
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
      selectedProfileIds.value = Array.isArray(res?.executionProfiles)
        ? res.executionProfiles
            .map((item: any) =>
              typeof item === 'string' ? item : String(item?.profileId || ''),
            )
            .filter(Boolean)
        : []
    } finally {
      formLoading.value = false
    }
  }
  // 先拿到店铺平台再拉环境，避免编辑非抖店店铺时用默认平台的环境清单
  void loadEnvironments()
}

const resetForm = () => {
  formData.id = undefined
  formData.name = ''
  formData.description = ''
  formData.logo = ''
  formData.carousel = []
  formData.platform = 'doudian'
  selectedProfileIds.value = []
}

const submitForm = async () => {
  const form = unref(formRef)
  if (!form) return
  await form.validate(async (valid) => {
    if (valid) {
      formLoading.value = true
      try {
        const executionProfiles = selectedProfileIds.value.map((profileId) => {
          const matched = environments.value.find((item) => item.profileId === profileId)
          return {
            profileId,
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
