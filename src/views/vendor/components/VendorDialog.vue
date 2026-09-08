<template>
  <Dialog
    v-model="dialogVisible"
    :title="dialogTitle"
    :initial-fullscreen="true"
    scroll
    max-height="calc(100vh - 140px)"
    width="1200px"
  >
    <el-form
      ref="formRef"
      :model="formData"
      :rules="formRules"
      label-width="96px"
      class="vendor-form"
      v-loading="formLoading"
    >
      <!-- 基础合作信息 -->
      <div class="vendor-form__section">
        <div class="vendor-form__section-title">基础与合作信息</div>
        <el-row :gutter="20">
          <el-col :xs="24" :md="8">
            <el-form-item label="厂家编码">
              <el-input
                :model-value="formData.code || ''"
                :placeholder="formData.id ? '暂无厂家编码' : '创建后由后台自动生成'"
                disabled
              />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :md="8">
            <el-form-item label="厂家名称" prop="name">
              <el-input v-model="formData.name" placeholder="请输入厂家名称" />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :md="8">
            <el-form-item label="合作状态" prop="status">
              <el-select v-model="formData.status" placeholder="请选择合作状态" style="width: 100%">
                <el-option label="正常合作 (active)" value="active" />
                <el-option label="考察备选 (evaluating)" value="evaluating" />
                <el-option label="暂停合作 (suspended)" value="suspended" />
                <el-option label="淘汰拉黑 (blacklisted)" value="blacklisted" />
              </el-select>
            </el-form-item>
          </el-col>

          <el-col :xs="24" :md="8">
            <el-form-item label="结算方式" prop="settlementType">
              <el-select
                v-model="formData.settlementType"
                filterable
                allow-create
                default-first-option
                placeholder="例如: 现结 / 月结30天 / 预付30%"
                style="width: 100%"
              >
                <el-option label="现结" value="现结" />
                <el-option label="月结30天" value="月结30天" />
                <el-option label="月结60天" value="月结60天" />
                <el-option label="预付30%尾款70%" value="预付30%尾款70%" />
                <el-option label="季结" value="季结" />
              </el-select>
            </el-form-item>
          </el-col>

          <el-col :xs="24" :md="8">
            <el-form-item label="联系人" prop="contactName">
              <el-input v-model="formData.contactName" placeholder="请输入联系人姓名" />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :md="8">
            <el-form-item label="联系电话" prop="contactPhone">
              <el-input v-model="formData.contactPhone" placeholder="请输入联系电话" />
            </el-form-item>
          </el-col>

          <el-col :xs="24" :md="8">
            <el-form-item label="微信号" prop="wechat">
              <el-input v-model="formData.wechat" placeholder="微信或企业微信" />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="主页/网店" prop="shopUrls">
              <div class="w-full space-y-2">
                <div
                  v-for="(item, index) in formData.shopUrls"
                  :key="index"
                  class="flex items-center gap-2"
                >
                  <el-input
                    v-model="item.name"
                    placeholder="平台/说明 (如: 1688 / 官网 / 淘宝)"
                    style="width: 220px; flex-shrink: 0"
                    clearable
                  />
                  <el-input
                    v-model="item.url"
                    placeholder="主页链接 URL (如: https://...)"
                    class="flex-1"
                    clearable
                  >
                    <template #append v-if="item.url && item.url.trim()">
                      <el-button
                        :icon="TopRight"
                        title="在浏览器中打开链接"
                        @click="openLink(item.url)"
                      />
                    </template>
                  </el-input>
                  <el-button
                    link
                    type="danger"
                    :icon="Delete"
                    title="删除此链接"
                    @click="removeShopUrl(index)"
                  />
                </div>
                <div class="flex items-center gap-3 pt-1">
                  <el-button
                    size="small"
                    type="primary"
                    plain
                    :icon="Plus"
                    @click="addShopUrl"
                  >
                    添加主页链接
                  </el-button>
                  <div class="text-xs text-[var(--el-text-color-secondary)]">
                    可添加任意多个店铺或主页（如 1688 批发店、官方网站、淘宝/天猫店等）
                  </div>
                </div>
              </div>
            </el-form-item>
          </el-col>

          <el-col :xs="24" :md="12">
            <el-form-item label="主营标签" prop="categoryTags">
              <el-select
                v-model="formData.categoryTags"
                multiple
                filterable
                allow-create
                default-first-option
                placeholder="输入标签按回车添加(如: 数码印花、鼠标垫、亚克力)"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>

          <el-col :xs="24" :md="12">
            <el-form-item label="地址" prop="address">
              <el-input v-model="formData.address" placeholder="请输入厂家发货或生产地址" />
            </el-form-item>
          </el-col>
        </el-row>
      </div>

      <!-- 通用扩展属性 -->
      <div class="vendor-form__section">
        <div class="vendor-form__section-header flex justify-between items-center mb-3">
          <div class="vendor-form__section-title mb-0">通用扩展属性</div>
          <el-button size="small" type="primary" :icon="Plus" @click="addCustomAttr">添加扩展属性</el-button>
        </div>
        <div v-if="formData.customAttributes?.length" class="space-y-2">
          <div
            v-for="(attr, index) in formData.customAttributes"
            :key="index"
            class="flex items-center gap-3"
          >
            <el-input v-model="attr.name" placeholder="属性名 (例如: 工厂面积 / 开票税率 / 发票类型)" style="width: 240px" />
            <el-input v-model="attr.value" placeholder="属性值 (例如: 3000平 / 13%增值税专票)" class="flex-1" />
            <el-button link type="danger" :icon="Delete" @click="removeCustomAttr(index)" />
          </div>
        </div>
        <div v-else class="text-xs text-[var(--el-text-color-secondary)]">
          暂无自定义属性。可自由增加业务参数（如工厂规模、质保协议、开票税率等），系统会自动持久化存储。
        </div>
      </div>

      <!-- 展示与描述 -->
      <div class="vendor-form__section">
        <div class="vendor-form__section-title">展示与简介</div>
        <el-row :gutter="20">
          <el-col :span="24">
            <el-form-item label="厂家描述" prop="description">
              <el-input
                v-model="formData.description"
                type="textarea"
                :rows="4"
                placeholder="请输入厂家主营业务、配合度说明、打样与生产特点等"
              />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="厂家图片" prop="images">
              <el-upload
                v-model:file-list="imageFileList"
                action="#"
                list-type="picture-card"
                :auto-upload="false"
                :multiple="true"
                :limit="20"
                :before-upload="beforeImageUpload"
                :on-change="handleImageChange"
                :on-remove="handleImageRemove"
                :on-preview="handleImagePreview"
                class="vendor-image-upload"
              >
                <el-icon><Plus /></el-icon>
              </el-upload>
              <div class="vendor-form__hint">
                选择图片后本地暂存预览，点击“确定”时上传到 COS (路径: vendor/日期/账号/...)。
              </div>
            </el-form-item>
          </el-col>
        </el-row>
      </div>
    </el-form>
    <template #footer>
      <el-button @click="handleCancel">取消</el-button>
      <el-button type="primary" :loading="formLoading" @click="submitForm">确定</el-button>
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import type { UploadProps, UploadUserFile } from 'element-plus'
import { computed, reactive, ref, unref } from 'vue'
import { ElMessage, ElNotification } from 'element-plus'
import { Delete, Plus, TopRight } from '@element-plus/icons-vue'
import { createVendor, getVendorDetail, updateVendor, type CustomAttribute, type Vendor, type VendorShopUrl } from '@/api/vendor'
import { createImageViewer } from '@/components/ImageViewer'
import { uploadToCOS } from '@/api/cos'
import { useUserStore } from '@/store/modules/user'

const emit = defineEmits(['success'])

const userStore = useUserStore()
const dialogVisible = ref(false)
const dialogTitle = ref('')
const formLoading = ref(false)
const formRef = ref()
const imageFileList = ref<UploadUserFile[]>([])
const existingImages = ref<string[]>([])

const formData = reactive<{
  id?: number
  code: string
  name: string
  description: string
  contactName: string
  contactPhone: string
  wechat: string
  shopUrl: string
  shopUrls: Array<{ name: string; url: string }>
  status: string
  settlementType: string
  categoryTags: string[]
  customAttributes: CustomAttribute[]
  address: string
  images: string[]
}>({
  id: undefined,
  code: '',
  name: '',
  description: '',
  contactName: '',
  contactPhone: '',
  wechat: '',
  shopUrl: '',
  shopUrls: [],
  status: 'active',
  settlementType: '',
  categoryTags: [],
  customAttributes: [],
  address: '',
  images: [],
})

const formRules = {
  name: [{ required: true, message: '请输入厂家名称', trigger: 'blur' }],
}

const userAccount = computed(
  () =>
    (userStore.user as any)?.account || userStore.user?.shortName || userStore.user?.name || 'anonymous',
)

const revokeLocalPreviewUrls = () => {
  imageFileList.value.forEach((file) => {
    if (file.raw && typeof file.url === 'string' && file.url.startsWith('blob:')) {
      URL.revokeObjectURL(file.url)
    }
  })
}

const buildExistingFileList = (images: string[]) =>
  images.map((url) => ({
    name: url.substring(url.lastIndexOf('/') + 1),
    url,
  }))

const resetForm = () => {
  revokeLocalPreviewUrls()
  formData.id = undefined
  formData.code = ''
  formData.name = ''
  formData.description = ''
  formData.contactName = ''
  formData.contactPhone = ''
  formData.wechat = ''
  formData.shopUrl = ''
  formData.shopUrls = [{ name: '', url: '' }]
  formData.status = 'active'
  formData.settlementType = ''
  formData.categoryTags = []
  formData.customAttributes = []
  formData.address = ''
  formData.images = []
  existingImages.value = []
  imageFileList.value = []
}

const addShopUrl = () => {
  formData.shopUrls.push({ name: '', url: '' })
}

const removeShopUrl = (index: number) => {
  formData.shopUrls.splice(index, 1)
  if (!formData.shopUrls.length) {
    formData.shopUrls.push({ name: '', url: '' })
  }
}

const openLink = (url: string) => {
  let targetUrl = (url || '').trim()
  if (!targetUrl) return
  if (!/^https?:\/\//i.test(targetUrl)) {
    targetUrl = 'https://' + targetUrl
  }
  window.open(targetUrl, '_blank', 'noopener,noreferrer')
}

const addCustomAttr = () => {
  formData.customAttributes.push({ name: '', value: '' })
}

const removeCustomAttr = (index: number) => {
  formData.customAttributes.splice(index, 1)
}

const open = async (id?: number) => {
  dialogVisible.value = true
  dialogTitle.value = id ? '编辑厂家' : '新增厂家'
  resetForm()

  if (!id) return

  formLoading.value = true
  try {
    const data = await getVendorDetail(id)
    const images = Array.isArray(data?.images) ? data.images : []
    const categoryTags = Array.isArray(data?.categoryTags) ? data.categoryTags : []
    const customAttributes = Array.isArray(data?.customAttributes) ? data.customAttributes : []

    let shopUrls: Array<{ name: string; url: string }> = []
    if (Array.isArray((data as any)?.shopUrls) && (data as any).shopUrls.length) {
      shopUrls = (data as any).shopUrls.map((item: any) => {
        if (typeof item === 'string') return { name: '', url: item }
        return { name: item?.name || '', url: item?.url || '' }
      })
    } else if (data?.shopUrl && data.shopUrl.trim()) {
      shopUrls = [{ name: '', url: data.shopUrl.trim() }]
    }

    if (!shopUrls.length) {
      shopUrls = [{ name: '', url: '' }]
    }

    Object.assign(formData, {
      ...data,
      status: data.status || 'active',
      settlementType: data.settlementType || '',
      wechat: data.wechat || '',
      shopUrl: data.shopUrl || '',
      shopUrls,
      categoryTags,
      customAttributes: customAttributes.map((a) => ({ name: a.name, value: a.value })),
      images,
    })
    existingImages.value = [...images]
    imageFileList.value = buildExistingFileList(images)
  } finally {
    formLoading.value = false
  }
}

const beforeImageUpload: UploadProps['beforeUpload'] = (rawFile) => {
  const supportedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
  const isImage = supportedTypes.includes(rawFile.type)
  const isLt5M = rawFile.size / 1024 / 1024 < 5

  if (!isImage) {
    ElNotification({
      title: '温馨提示',
      message: '仅支持 JPG、PNG、GIF、WEBP 图片格式',
      type: 'warning',
    })
    return false
  }

  if (!isLt5M) {
    ElNotification({
      title: '温馨提示',
      message: '图片大小不能超过 5MB',
      type: 'warning',
    })
    return false
  }

  return true
}

const handleImageChange: UploadProps['onChange'] = (uploadFile, uploadFiles) => {
  if (uploadFile.raw && !uploadFile.url) {
    uploadFile.url = URL.createObjectURL(uploadFile.raw)
  }
  imageFileList.value = uploadFiles
}

const handleImageRemove: UploadProps['onRemove'] = (file) => {
  if (file.url && existingImages.value.includes(file.url)) {
    existingImages.value = existingImages.value.filter((url) => url !== file.url)
  }
}

const handleImagePreview: UploadProps['onPreview'] = (file) => {
  const url = file.url || (file.raw ? URL.createObjectURL(file.raw) : '')
  if (!url) return
  createImageViewer({
    urlList: [url],
  })
}

const buildVendorUploadPath = (file: File) => {
  const account = userAccount.value || 'anonymous'
  const date = new Date().toISOString().slice(0, 10)
  const ext = file.name.includes('.') ? file.name.substring(file.name.lastIndexOf('.')) : ''
  const filename = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`
  return `vendor/${date}/${account}/${filename}`
}

const uploadNewImages = async () => {
  const pendingFiles = imageFileList.value.filter((file) => file.raw)
  if (!pendingFiles.length) return []

  const uploadTasks = pendingFiles.map(async (file) => {
    const rawFile = file.raw as File
    const cosPath = buildVendorUploadPath(rawFile)
    const result = await uploadToCOS({
      file: rawFile,
      path: cosPath,
    })
    return (result as any)?.url || result
  })

  return Promise.all(uploadTasks)
}

const handleCancel = () => {
  revokeLocalPreviewUrls()
  dialogVisible.value = false
}

const submitForm = async () => {
  const form = unref(formRef)
  if (!form) return

  await form.validate(async (valid: boolean) => {
    if (!valid) return

    formLoading.value = true
    try {
      const uploadedImages = await uploadNewImages()
      const remainingExistingImages = imageFileList.value
        .filter((file) => !file.raw && file.url)
        .map((file) => file.url as string)

      const finalImages = Array.from(new Set([...remainingExistingImages, ...uploadedImages]))

      const cleanedShopUrls = (formData.shopUrls || [])
        .filter((item) => item && item.url && String(item.url).trim())
        .map((item) => ({
          name: item.name ? String(item.name).trim() : undefined,
          url: String(item.url).trim(),
        }))

      const primaryShopUrl = cleanedShopUrls[0]?.url || undefined

      const cleanedCategoryTags = (formData.categoryTags || [])
        .map((tag) => (tag ? String(tag).trim() : ''))
        .filter(Boolean)

      const cleanedCustomAttributes = (formData.customAttributes || [])
        .filter((attr) => attr && attr.name && String(attr.name).trim())
        .map((attr) => ({
          name: String(attr.name).trim(),
          value: attr.value ? String(attr.value).trim() : '',
        }))

      const payload: Vendor = {
        name: String(formData.name || '').trim(),
        description: formData.description ? String(formData.description).trim() : undefined,
        contactName: formData.contactName ? String(formData.contactName).trim() : undefined,
        contactPhone: formData.contactPhone ? String(formData.contactPhone).trim() : undefined,
        wechat: formData.wechat ? String(formData.wechat).trim() : undefined,
        shopUrl: primaryShopUrl,
        shopUrls: cleanedShopUrls,
        status: formData.status || 'active',
        settlementType: formData.settlementType ? String(formData.settlementType).trim() : undefined,
        categoryTags: cleanedCategoryTags,
        customAttributes: cleanedCustomAttributes,
        address: formData.address ? String(formData.address).trim() : undefined,
        images: finalImages,
      }

      if (formData.id) {
        await updateVendor(formData.id, payload)
        ElMessage.success('更新成功')
      } else {
        await createVendor(payload)
        ElMessage.success('创建成功')
      }

      revokeLocalPreviewUrls()
      dialogVisible.value = false
      emit('success')
    } catch (error: any) {
      ElMessage.error(error?.message || '图片上传或保存失败')
    } finally {
      formLoading.value = false
    }
  })
}

defineExpose({ open })
</script>

<style scoped lang="scss">
.vendor-form {
  padding: 8px 4px;
}

.vendor-form__section {
  padding: 18px 18px 12px;
  margin-bottom: 16px;
  background: var(--app-content-surface-color);
  border: 1px solid var(--app-content-border-color);
  border-radius: 12px;
  box-shadow: none;
}

.vendor-form__section-title {
  margin-bottom: 18px;
  font-size: 16px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.vendor-form__hint {
  margin-top: 10px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.vendor-form :deep(.el-form-item) {
  margin-bottom: 20px;
}

.vendor-image-upload :deep(.el-upload--picture-card),
.vendor-image-upload :deep(.el-upload-list__item) {
  width: 120px;
  height: 120px;
  border-radius: 10px;
}
</style>
