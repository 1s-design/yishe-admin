<template>
  <el-dialog
    v-model="visible"
    :title="modalTitle"
    fullscreen
    destroy-on-close
    class="vendor-products-modal"
  >
    <template #header>
      <div class="modal-header-content">
        <div class="modal-header-title">
          <span class="modal-vendor-name">{{ currentVendor?.name || '厂家商品列表' }}</span>
          <el-tag v-if="currentVendor?.code" size="small" type="info" class="ml-2 font-mono">
            {{ currentVendor.code }}
          </el-tag>
          <el-tag
            v-if="currentVendor?.status"
            size="small"
            :type="getVendorStatusTagType(currentVendor.status)"
            class="ml-2"
          >
            {{ getVendorStatusLabel(currentVendor.status) }}
          </el-tag>
        </div>
        <div class="modal-header-sub flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-[var(--el-text-color-secondary)]">
          <span v-if="currentVendor?.contactName">联系人：{{ currentVendor.contactName }}</span>
          <span v-if="currentVendor?.contactPhone">电话：{{ currentVendor.contactPhone }}</span>
          <span v-if="currentVendor?.settlementType">账期：{{ currentVendor.settlementType }}</span>
          <div v-if="(currentVendor?.shopUrls && currentVendor.shopUrls.length) || currentVendor?.shopUrl" class="inline-flex items-center gap-1.5 ml-1">
            <span class="text-[var(--el-text-color-secondary)]">主页:</span>
            <template v-if="currentVendor?.shopUrls && currentVendor.shopUrls.length">
              <template v-for="(item, idx) in currentVendor.shopUrls" :key="idx">
                <a
                  :href="getSafeLink(item.url)"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-xs text-[var(--el-color-primary)] hover:underline inline-flex items-center gap-0.5"
                >
                  <span>{{ item.name || '店铺链接' }}</span>
                  <el-icon :size="10"><TopRight /></el-icon>
                </a>
                <span v-if="idx < currentVendor.shopUrls.length - 1" class="text-[var(--el-border-color)]">/</span>
              </template>
            </template>
            <template v-else-if="currentVendor?.shopUrl">
              <a
                :href="getSafeLink(currentVendor.shopUrl)"
                target="_blank"
                rel="noopener noreferrer"
                class="text-xs text-[var(--el-color-primary)] hover:underline inline-flex items-center gap-0.5"
              >
                <span>店铺链接</span>
                <el-icon :size="10"><TopRight /></el-icon>
              </a>
            </template>
          </div>
        </div>
      </div>
    </template>

    <div class="modal-body flex flex-col h-full" v-loading="loading">
      <!-- Toolbar -->
      <div class="modal-toolbar flex justify-between items-center pb-3 border-b border-[var(--el-border-color-lighter)]">
        <div class="modal-toolbar__left flex items-center gap-2">
          <el-input
            v-model="searchKeyword"
            placeholder="搜索商品编码 / 名称 / 型号 / 规格"
            size="small"
            clearable
            style="width: 260px"
            @keyup.enter="loadProducts"
            @clear="loadProducts"
          />
          <el-select
            v-model="statusFilter"
            placeholder="供货状态"
            size="small"
            clearable
            style="width: 130px"
            @change="loadProducts"
          >
            <el-option label="全部状态" value="" />
            <el-option label="正常供货" value="normal" />
            <el-option label="库存紧张" value="low_stock" />
            <el-option label="暂时缺货" value="out_of_stock" />
            <el-option label="已停产" value="discontinued" />
            <el-option label="打样开发中" value="sampling" />
          </el-select>
          <el-button size="small" type="primary" :icon="Search" @click="loadProducts">查询</el-button>
          <el-button size="small" :icon="Refresh" @click="resetFilter">重置</el-button>
        </div>
        <div class="modal-toolbar__right flex items-center gap-2">
          <el-button size="small" type="primary" :icon="Plus" @click="openCreateProduct">
            新增商品
          </el-button>
        </div>
      </div>

      <!-- Products Grid -->
      <div class="common-table flex-1 mt-3">
        <vxe-grid v-bind="gridOptions" :data="filteredProducts" :loading="loading">
          <template #codeSlot="{ row }">
            <span class="font-mono text-xs text-[var(--el-color-primary)] font-semibold">
              {{ row.code || '-' }}
            </span>
          </template>

          <template #imagesSlot="{ row }">
            <div class="table-image-group" v-if="row.images?.length">
              <el-image
                v-for="(img, idx) in row.images.slice(0, 3)"
                :key="`${img}-${idx}`"
                :src="img"
                fit="cover"
                class="table-thumb table-thumb--sm"
                :preview-src-list="row.images"
                preview-teleported
              />
              <span v-if="row.images.length > 3" class="table-thumb-count">
                +{{ row.images.length - 3 }}
              </span>
            </div>
            <span v-else class="text-xs text-[var(--el-text-color-secondary)]">-</span>
          </template>

          <template #statusSlot="{ row }">
            <el-tag size="small" :type="getProductStatusTagType(row.status)">
              {{ getProductStatusLabel(row.status) }}
            </el-tag>
          </template>

          <template #priceSlot="{ row }">
            <div class="text-xs">
              <span class="font-semibold text-amber-500">
                {{ row.price !== null && row.price !== undefined && row.price !== '' ? `¥${Number(row.price).toFixed(2)}` : '-' }}
              </span>
              <div v-if="row.taxIncluded || row.shippingIncluded" class="text-[10px] text-[var(--el-text-color-secondary)] flex gap-1 mt-0.5">
                <span v-if="row.taxIncluded">含税</span>
                <span v-if="row.shippingIncluded">包邮</span>
              </div>
            </div>
          </template>

          <template #customAttributesSlot="{ row }">
            <div class="flex flex-wrap gap-1" v-if="row.customAttributes?.length">
              <el-tooltip
                v-for="(attr, i) in row.customAttributes"
                :key="i"
                :content="`${attr.name}: ${attr.value}`"
                placement="top"
              >
                <el-tag size="small" type="info" effect="plain" class="text-xs">
                  {{ attr.name }}: {{ attr.value }}
                </el-tag>
              </el-tooltip>
            </div>
            <span v-else class="text-xs text-[var(--el-text-color-secondary)]">-</span>
          </template>

          <template #tierPricingSlot="{ row }">
            <div v-if="row.tierPricing?.length" class="text-xs space-y-0.5">
              <div v-for="(t, i) in row.tierPricing.slice(0, 2)" :key="i" class="text-[11px] text-[var(--el-text-color-secondary)]">
                {{ t.minQty }}{{ t.maxQty ? `~${t.maxQty}` : '+' }}件: ¥{{ Number(t.price).toFixed(2) }}
              </div>
              <span v-if="row.tierPricing.length > 2" class="text-[10px] text-blue-500">
                共{{ row.tierPricing.length }}档
              </span>
            </div>
            <span v-else class="text-xs text-[var(--el-text-color-secondary)]">-</span>
          </template>

          <template #operationSlot="{ row }">
            <div class="flex items-center gap-2">
              <el-button link type="primary" size="small" @click="openEditProduct(row)">编辑</el-button>
              <el-button link type="danger" size="small" @click="handleDeleteProduct(row)">删除</el-button>
            </div>
          </template>
        </vxe-grid>
      </div>

      <!-- Summary footer -->
      <div class="modal-stats-footer mt-3 pt-2 border-t border-[var(--el-border-color-lighter)] flex justify-between items-center text-xs text-[var(--el-text-color-secondary)]">
        <span>当前共 {{ filteredProducts.length }} 款商品（总计 {{ productList.length }} 款）</span>
        <el-button link type="primary" size="small" @click="navigateToVendorProductPage">
          前往商品库全功能页面 &gt;
        </el-button>
      </div>
    </div>

    <!-- Unified Product Dialog (Same component as vendor-product page) -->
    <VendorProductDialog ref="productDialogRef" @success="handleProductDialogSuccess" />
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Plus, Refresh, Search, TopRight } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  deleteVendorProduct,
  getVendorProductsByVendor,
  type Vendor,
  type VendorProductItem,
} from '@/api/vendor'
import { commonGridOptions } from '@/common/table'
import VendorProductDialog from '@/views/vendor-product/components/VendorProductDialog.vue'

const emit = defineEmits(['updated'])
const router = useRouter()

const visible = ref(false)
const loading = ref(false)
const currentVendor = ref<Vendor | null>(null)
const productList = ref<VendorProductItem[]>([])
const searchKeyword = ref('')
const statusFilter = ref('')
const productDialogRef = ref()

const getSafeLink = (url?: string) => {
  if (!url) return '#'
  const trimmed = url.trim()
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
}

const modalTitle = computed(() => {
  if (!currentVendor.value) return '厂家旗下商品管理'
  return `${currentVendor.value.name} - 旗下商品管理`
})

const filteredProducts = computed(() => {
  const kw = searchKeyword.value.trim().toLowerCase()
  const st = statusFilter.value.trim()
  return productList.value.filter((item) => {
    if (st && item.status !== st) return false
    if (!kw) return true
    return (
      (item.code || '').toLowerCase().includes(kw) ||
      (item.name || '').toLowerCase().includes(kw) ||
      (item.model || '').toLowerCase().includes(kw) ||
      (item.size || '').toLowerCase().includes(kw)
    )
  })
})

const gridOptions = ref({
  ...commonGridOptions,
  maxHeight: 620,
  rowConfig: { keyField: 'id' },
  columns: [
    { title: '商品编码', field: 'code', width: 120, slots: { default: 'codeSlot' } },
    { title: '产品图', field: 'images', width: 120, slots: { default: 'imagesSlot' } },
    { title: '商品名称', field: 'name', minWidth: 160 },
    { title: '型号', field: 'model', width: 120, showOverflow: 'tooltip' },
    { title: '规格/尺寸', field: 'size', width: 130, showOverflow: 'tooltip' },
    { title: '供货状态', field: 'status', width: 100, slots: { default: 'statusSlot' } },
    { title: '参考单价', field: 'price', width: 110, slots: { default: 'priceSlot' } },
    { title: '阶梯报价', field: 'tierPricing', minWidth: 140, slots: { default: 'tierPricingSlot' } },
    { title: '通用扩展属性', field: 'customAttributes', minWidth: 160, slots: { default: 'customAttributesSlot' } },
    { title: '单位', field: 'unit', width: 70 },
    { title: '备注', field: 'remark', minWidth: 140, showOverflow: 'tooltip' },
    { title: '操作', width: 120, fixed: 'right', slots: { default: 'operationSlot' } },
  ],
})

const getVendorStatusLabel = (status?: string) => {
  const map: Record<string, string> = {
    active: '正常合作',
    evaluating: '考察备选',
    suspended: '暂停合作',
    blacklisted: '淘汰拉黑',
  }
  return (status && map[status]) || status || '正常合作'
}

const getVendorStatusTagType = (status?: string): 'success' | 'warning' | 'info' | 'danger' => {
  const map: Record<string, 'success' | 'warning' | 'info' | 'danger'> = {
    active: 'success',
    evaluating: 'warning',
    suspended: 'info',
    blacklisted: 'danger',
  }
  return (status && map[status]) || 'success'
}

const getProductStatusLabel = (status?: string) => {
  const map: Record<string, string> = {
    normal: '正常供货',
    low_stock: '库存紧张',
    out_of_stock: '暂时缺货',
    discontinued: '已停产',
    sampling: '打样中',
  }
  return (status && map[status]) || status || '正常供货'
}

const getProductStatusTagType = (status?: string): 'success' | 'warning' | 'info' | 'danger' => {
  const map: Record<string, 'success' | 'warning' | 'info' | 'danger'> = {
    normal: 'success',
    low_stock: 'warning',
    out_of_stock: 'danger',
    discontinued: 'info',
    sampling: 'warning',
  }
  return (status && map[status]) || 'success'
}

const open = async (vendor: Vendor) => {
  currentVendor.value = vendor
  visible.value = true
  searchKeyword.value = ''
  statusFilter.value = ''
  await loadProducts()
}

const loadProducts = async () => {
  if (!currentVendor.value?.id) return
  loading.value = true
  try {
    const data = await getVendorProductsByVendor(currentVendor.value.id)
    productList.value = Array.isArray(data) ? data : []
  } catch (error: any) {
    ElMessage.error(error?.message || '获取商品列表失败')
  } finally {
    loading.value = false
  }
}

const resetFilter = () => {
  searchKeyword.value = ''
  statusFilter.value = ''
  loadProducts()
}

const openCreateProduct = () => {
  if (!currentVendor.value?.id) return
  productDialogRef.value?.open(undefined, currentVendor.value.id)
}

const openEditProduct = (row: VendorProductItem) => {
  productDialogRef.value?.open(row, currentVendor.value?.id)
}

const handleProductDialogSuccess = async () => {
  await loadProducts()
  emit('updated')
}

const handleDeleteProduct = async (row: VendorProductItem) => {
  if (!row.id) return
  try {
    await ElMessageBox.confirm(`确认删除商品「${row.name}」吗？`, '删除确认', {
      type: 'warning',
    })
    await deleteVendorProduct(row.id)
    ElMessage.success('删除成功')
    await loadProducts()
    emit('updated')
  } catch {}
}

const navigateToVendorProductPage = () => {
  visible.value = false
  router.push({
    path: '/operation/vendor-product',
    query: { vendorId: currentVendor.value?.id },
  })
}

defineExpose({
  open,
})
</script>

<style scoped lang="scss">
.vendor-products-modal :deep(.el-dialog__body) {
  padding: 16px 24px;
  height: calc(100vh - 80px);
  overflow-y: auto;
}

.modal-header-content {
  display: flex;
  flex-direction: column;
}

.modal-header-title {
  display: flex;
  align-items: center;
}

.modal-vendor-name {
  font-size: 16px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.modal-header-sub {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.modal-body {
  height: 100%;
}
</style>
