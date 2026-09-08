<template>
  <el-dialog
    v-model="dialogVisible"
    :title="formData.id ? '编辑供应商商品' : '新增供应商商品'"
    fullscreen
    :destroy-on-close="false"
    class="vendor-product-fullscreen-dialog"
  >
    <div class="vendor-product-dialog-layout" v-loading="formLoading">
      <div class="vendor-product-dialog-main">
        <el-form
          ref="formRef"
          :model="formData"
          :rules="formRules"
          label-width="110px"
          class="vendor-product-form"
        >
          <!-- 基础信息 -->
          <div class="dialog-section dialog-section-basic">
            <div class="dialog-section-title">基础与归属</div>
            <el-row :gutter="16">
              <el-col :span="8">
                <el-form-item label="所属供应商" prop="vendorId">
                  <el-select
                    v-model="formData.vendorId"
                    filterable
                    placeholder="请选择供应商"
                    style="width: 100%"
                    :disabled="lockVendor"
                  >
                    <el-option
                      v-for="vendor in vendors"
                      :key="vendor.id"
                      :label="vendor.name"
                      :value="vendor.id"
                    />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col v-if="formData.code" :span="8">
                <el-form-item label="唯一编码" prop="code">
                  <el-input v-model="formData.code" disabled />
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item label="供货状态" prop="status">
                  <el-select v-model="formData.status" style="width: 100%">
                    <el-option label="正常供货" value="normal" />
                    <el-option label="库存紧张" value="low_stock" />
                    <el-option label="暂时缺货" value="out_of_stock" />
                    <el-option label="已停产" value="discontinued" />
                    <el-option label="打样开发中" value="sampling" />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item label="商品名称" prop="name">
                  <el-input v-model="formData.name" placeholder="例如：超大电竞鼠标垫" />
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item label="型号" prop="model">
                  <el-input v-model="formData.model" placeholder="例如：精细锁边厚垫" />
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item label="单位" prop="unit">
                  <el-input v-model="formData.unit" placeholder="例如：个、套、张" />
                </el-form-item>
              </el-col>
            </el-row>
          </div>

          <!-- 规格与价格条款 -->
          <div class="dialog-section dialog-section-spec">
            <div class="dialog-section-title">规格、价格与交付</div>
            <el-row :gutter="16">
              <el-col :span="8">
                <el-form-item label="规格/尺寸" prop="size">
                  <el-input v-model="formData.size" placeholder="例如：900x400x4mm" />
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item label="产品尺寸" prop="productSize">
                  <el-input v-model="formData.productSize" placeholder="例如：900x400mm" />
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item label="包装尺寸" prop="packageSize">
                  <el-input v-model="formData.packageSize" placeholder="例如：420x80x80mm" />
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item label="参考价格 (¥)" prop="price">
                  <el-input-number
                    v-model="formData.price"
                    :min="0"
                    :precision="2"
                    :step="0.1"
                    style="width: 100%"
                  />
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item label="最小起订(MOQ)" prop="moq">
                  <el-input-number
                    v-model="formData.moq"
                    :min="1"
                    :step="10"
                    placeholder="件数"
                    style="width: 100%"
                  />
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item label="打样周期(天)" prop="sampleLeadTime">
                  <el-input-number
                    v-model="formData.sampleLeadTime"
                    :min="0"
                    style="width: 100%"
                  />
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item label="大货交期(天)" prop="productionLeadTime">
                  <el-input-number
                    v-model="formData.productionLeadTime"
                    :min="0"
                    style="width: 100%"
                  />
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item label="商业条款">
                  <div class="flex items-center gap-4 h-full pt-1">
                    <el-checkbox v-model="formData.taxIncluded">报价含税</el-checkbox>
                    <el-checkbox v-model="formData.shippingIncluded">报价包邮</el-checkbox>
                  </div>
                </el-form-item>
              </el-col>
            </el-row>
          </div>

          <!-- 阶梯价格区间 -->
          <div class="dialog-section dialog-section-tier">
            <div class="flex justify-between items-center mb-2">
              <div class="dialog-section-title mb-0">阶梯报价 (Tier Pricing)</div>
              <el-button size="small" type="primary" :icon="Plus" @click="addTierPricing">
                添加阶梯价
              </el-button>
            </div>
            <div v-if="formData.tierPricing?.length" class="space-y-2">
              <div
                v-for="(tier, idx) in formData.tierPricing"
                :key="idx"
                class="flex items-center gap-3 bg-[var(--el-fill-color-light)] p-2 rounded"
              >
                <span class="text-xs text-[var(--el-text-color-secondary)]">起订量:</span>
                <el-input-number v-model="tier.minQty" :min="1" size="small" style="width: 120px" />
                <span class="text-xs text-[var(--el-text-color-secondary)]">至</span>
                <el-input-number
                  v-model="tier.maxQty"
                  :min="tier.minQty"
                  size="small"
                  placeholder="无上限"
                  style="width: 120px"
                />
                <span class="text-xs text-[var(--el-text-color-secondary)]">件，单价 ¥:</span>
                <el-input-number
                  v-model="tier.price"
                  :min="0"
                  :precision="2"
                  size="small"
                  style="width: 130px"
                />
                <el-button link type="danger" :icon="Delete" @click="removeTierPricing(idx)" />
              </div>
            </div>
            <div v-else class="text-xs text-[var(--el-text-color-secondary)]">
              如按采购量区分单价，可添加阶梯价格（如 1~99件 20元，100件以上 16元）。
            </div>
          </div>

          <!-- 通用自定义属性 -->
          <div class="dialog-section dialog-section-custom">
            <div class="flex justify-between items-center mb-2">
              <div class="dialog-section-title mb-0">通用自定义属性 (Custom Attributes)</div>
              <el-button size="small" type="primary" :icon="Plus" @click="addCustomAttr">
                添加自定义属性
              </el-button>
            </div>
            <div v-if="formData.customAttributes?.length" class="space-y-2">
              <div
                v-for="(attr, idx) in formData.customAttributes"
                :key="idx"
                class="flex items-center gap-3"
              >
                <el-input
                  v-model="attr.name"
                  placeholder="属性名 (如: 材质/面料克重/接口类型)"
                  style="width: 220px"
                />
                <el-input
                  v-model="attr.value"
                  placeholder="属性值 (如: 纯棉240g/Type-C/环保认证)"
                  class="flex-1"
                />
                <el-button link type="danger" :icon="Delete" @click="removeCustomAttr(idx)" />
              </div>
            </div>
            <div v-else class="text-xs text-[var(--el-text-color-secondary)]">
              非标属性可自由扩展（如工艺、材质、质保期、认证资质等），无需修改数据库即可使用。
            </div>
          </div>

          <!-- 产品图片 -->
          <div class="dialog-section dialog-section-assets">
            <div class="dialog-section-title">产品图集</div>
            <el-form-item label="图片上传" prop="images" class="asset-form-item">
              <div class="asset-block">
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
                  class="vendor-product-image-upload"
                >
                  <el-icon><Plus /></el-icon>
                </el-upload>
                <div class="vendor-product-form__hint">支持多张产品实拍与打样图。</div>
              </div>
            </el-form-item>
          </div>

          <!-- 备注信息 -->
          <div class="dialog-section dialog-section-remark">
            <div class="dialog-section-title">备注说明</div>
            <el-form-item label="补充备注" prop="remark">
              <el-input
                v-model="formData.remark"
                type="textarea"
                :rows="3"
                placeholder="可填写打样注意事项、工艺要求、产地说明等"
              />
            </el-form-item>
          </div>
        </el-form>
      </div>
    </div>
    <template #footer>
      <el-button @click="dialogVisible = false">取消</el-button>
      <el-button type="primary" :loading="formLoading" @click="submitForm">确定</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { reactive, ref, unref } from 'vue'
import {
  ElMessage,
  ElNotification,
  type FormInstance,
  type FormRules,
  type UploadProps,
  type UploadUserFile,
} from 'element-plus'
import { Delete, Plus } from '@element-plus/icons-vue'
import {
  createVendorProduct,
  getVendorList,
  updateVendorProduct,
  type PageResult,
  type Vendor,
  type VendorProductItem,
} from '@/api/vendor'
import { createImageViewer } from '@/components/ImageViewer'
import { uploadToCOS } from '@/api/cos'
import { useUserStore } from '@/store/modules/user'

const emit = defineEmits(['success'])

const userStore = useUserStore()
const formLoading = ref(false)
const dialogVisible = ref(false)
const formRef = ref<FormInstance>()
const lockVendor = ref(false)
const vendors = ref<Vendor[]>([])
const imageFileList = ref<UploadUserFile[]>([])
const existingImages = ref<string[]>([])

const createEmptyForm = (): VendorProductItem => ({
  code: '',
  vendorId: undefined,
  name: '',
  model: '',
  size: '',
  productSize: '',
  packageSize: '',
  price: null,
  status: 'normal',
  moq: null,
  sampleLeadTime: null,
  productionLeadTime: null,
  taxIncluded: false,
  shippingIncluded: false,
  tierPricing: [],
  customAttributes: [],
  images: [],
  unit: '',
  remark: '',
})

const formData = reactive<VendorProductItem>(createEmptyForm())

const formRules: FormRules = {
  vendorId: [{ required: true, message: '请选择供应商', trigger: 'change' }],
  name: [{ required: true, message: '请输入商品名称', trigger: 'blur' }],
}

const addTierPricing = () => {
  if (!formData.tierPricing) formData.tierPricing = []
  formData.tierPricing.push({ minQty: 1, maxQty: null, price: 0 })
}

const removeTierPricing = (idx: number) => {
  formData.tierPricing?.splice(idx, 1)
}

const addCustomAttr = () => {
  if (!formData.customAttributes) formData.customAttributes = []
  formData.customAttributes.push({ name: '', value: '' })
}

const removeCustomAttr = (idx: number) => {
  formData.customAttributes?.splice(idx, 1)
}

const resetForm = () => {
  revokeLocalPreviewUrls()
  Object.assign(formData, createEmptyForm())
  existingImages.value = []
  imageFileList.value = []
  lockVendor.value = false
  formRef.value?.clearValidate()
}

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

const loadVendors = async (force = false) => {
  if (vendors.value.length > 0 && !force) return
  try {
    const res = await getVendorList({ page: 1, pageSize: 500 })
    if (res && typeof res === 'object' && 'list' in res) {
      vendors.value = (res as PageResult<Vendor>).list || []
    } else if (Array.isArray(res)) {
      vendors.value = res
    }
  } catch {}
}

const open = (row?: VendorProductItem, defaultVendorId?: number) => {
  resetForm()
  dialogVisible.value = true

  // 异步预载/刷新供应商下拉列表，不阻塞弹窗的秒开显示
  loadVendors()

  if (row?.id) {
    const images = Array.isArray(row.images) ? row.images : []
    const tierPricing = Array.isArray(row.tierPricing) ? row.tierPricing : []
    const customAttributes = Array.isArray(row.customAttributes) ? row.customAttributes : []

    Object.assign(formData, {
      ...row,
      price: row.price === undefined ? null : row.price,
      status: row.status || 'normal',
      taxIncluded: Boolean(row.taxIncluded),
      shippingIncluded: Boolean(row.shippingIncluded),
      tierPricing: tierPricing.map((t) => ({ ...t })),
      customAttributes: customAttributes.map((a) => ({ ...a })),
      images,
    })
    existingImages.value = [...images]
    imageFileList.value = buildExistingFileList(images)
    if (defaultVendorId) {
      lockVendor.value = true
    }
  } else {
    if (defaultVendorId) {
      formData.vendorId = defaultVendorId
      lockVendor.value = true
    }
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
  }

  if (!isLt5M) {
    ElNotification({
      title: '温馨提示',
      message: '单张图片大小不能超过 5MB',
      type: 'warning',
    })
  }

  return isImage && isLt5M
}

const handleImageChange: UploadProps['onChange'] = (uploadFile, uploadFiles) => {
  if (uploadFile.raw && (!uploadFile.url || !uploadFile.url.startsWith('blob:'))) {
    uploadFile.url = URL.createObjectURL(uploadFile.raw)
  }
  imageFileList.value = uploadFiles as UploadUserFile[]
}

const handleImageRemove: UploadProps['onRemove'] = (uploadFile, uploadFiles) => {
  if (uploadFile.raw && typeof uploadFile.url === 'string' && uploadFile.url.startsWith('blob:')) {
    URL.revokeObjectURL(uploadFile.url)
  }
  if (!uploadFile.raw && uploadFile.url) {
    existingImages.value = existingImages.value.filter((url) => url !== uploadFile.url)
  }
  imageFileList.value = uploadFiles as UploadUserFile[]
}

const handleImagePreview: UploadProps['onPreview'] = (uploadFile) => {
  const url = uploadFile.url || (uploadFile.raw ? URL.createObjectURL(uploadFile.raw) : '')
  if (!url) return
  createImageViewer({
    zIndex: 9999999,
    urlList: [url],
  })
}

const uploadPendingImages = async () => {
  const uploadedUrls = new Map<UploadUserFile, string>()

  for (const file of imageFileList.value) {
    if (!file.raw) continue

    const account = (userStore.user as any)?.account || userStore.user?.name || 'anonymous'
    const date = new Date().toISOString().slice(0, 10)
    const ext = file.name.includes('.') ? file.name.substring(file.name.lastIndexOf('.')) : ''
    const filename = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`
    const cosPath = `vendor-product/${date}/${account}/${filename}`

    const result = await uploadToCOS({
      file: file.raw as File,
      path: cosPath,
    })
    uploadedUrls.set(file, (result as any)?.url || result)
  }

  return imageFileList.value
    .map((file) => {
      if (file.raw) {
        return uploadedUrls.get(file) || ''
      }
      return file.url || ''
    })
    .filter(Boolean)
}

const submitForm = async () => {
  const form = unref(formRef)
  if (!form) return
  await form.validate(async (valid) => {
    if (!valid) return
    formLoading.value = true
    try {
      const images = await uploadPendingImages()
      const payload: VendorProductItem = {
        ...formData,
        vendorId: Number(formData.vendorId),
        price: formData.price === undefined ? null : formData.price,
        moq: formData.moq !== undefined && formData.moq !== null ? Number(formData.moq) : null,
        sampleLeadTime:
          formData.sampleLeadTime !== undefined && formData.sampleLeadTime !== null
            ? Number(formData.sampleLeadTime)
            : null,
        productionLeadTime:
          formData.productionLeadTime !== undefined && formData.productionLeadTime !== null
            ? Number(formData.productionLeadTime)
            : null,
        tierPricing: (formData.tierPricing || []).filter(
          (t) => t.price !== null && t.price !== undefined,
        ),
        customAttributes: (formData.customAttributes || []).filter(
          (a) => a.name && String(a.name).trim(),
        ),
        images,
      }
      if (payload.id) {
        await updateVendorProduct(payload.id, payload)
        ElMessage.success('修改成功')
      } else {
        await createVendorProduct(payload)
        ElMessage.success('新增成功')
      }
      dialogVisible.value = false
      emit('success', payload)
    } catch (err: any) {
      ElMessage.error(err?.message || '保存失败')
    } finally {
      formLoading.value = false
    }
  })
}

defineExpose({
  open,
})
</script>

<style scoped lang="scss">
.vendor-product-fullscreen-dialog :deep(.el-dialog__body) {
  padding: 16px 24px;
}

.dialog-section {
  padding: 16px 18px 10px;
  margin-bottom: 16px;
  background: var(--app-content-surface-color);
  border: 1px solid var(--app-content-border-color);
  border-radius: 12px;
}

.dialog-section-title {
  margin-bottom: 16px;
  font-size: 15px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.vendor-product-form__hint {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-top: 6px;
}

.vendor-product-image-upload :deep(.el-upload--picture-card),
.vendor-product-image-upload :deep(.el-upload-list__item) {
  width: 110px;
  height: 110px;
  border-radius: 10px;
}
</style>
