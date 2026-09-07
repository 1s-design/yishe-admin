<template>
  <ContentWrap :plain="true">
    <ListPageLayout class="shop-page">
      <template #filter>
        <div class="list-page-filter list-page-filter--flat">
          <div class="resource-toolbar">
            <div class="resource-toolbar__meta">
              <div class="resource-toolbar__actions">
                <el-button size="small" type="primary" @click="openDialog()">{{ t('shop.addShop') }}</el-button>
                <el-button size="small" type="danger" plain :disabled="!selectedIds.length" @click="handleBatchDelete">
                  {{ t('common.batchDelete') }}
                </el-button>
              </div>
            </div>
          </div>
        </div>
      </template>

      <template #table>
        <div class="list-page-panel list-page-panel--flat list-page-table-panel list-page-table-panel--flat">
          <div class="list-page-table-panel__body">
            <div class="common-table">
              <vxe-grid
                v-bind="gridOptions"
                :max-height="gridOptions.maxHeight"
                :data="list"
                :loading="loading"
                @checkbox-change="handleCheckboxChange"
                @checkbox-all="handleCheckboxAll"
              >
        <template #logoSlot="{ row }">
          <div class="flex items-center">
            <el-image
              v-if="row.logo"
              :src="row.logo"
              fit="contain"
              :preview-src-list="[row.logo]"
              preview-teleported
              class="table-thumb table-thumb--md table-thumb--contain"
            />
            <span v-else class="text-xs text-[var(--el-text-color-secondary)]">-</span>
          </div>
        </template>

        <template #carouselSlot="{ row }">
          <div class="flex items-center gap-2">
            <template v-if="row.carousel?.length">
              <el-image
                v-for="image in row.carousel.slice(0, 3)"
                :key="image"
                :src="image"
                fit="cover"
                :preview-src-list="row.carousel"
                preview-teleported
                class="table-thumb table-thumb--sm"
              />
              <span v-if="row.carousel.length > 3" class="table-thumb-count">+{{ row.carousel.length - 3 }}</span>
            </template>
            <span v-else class="text-xs text-[var(--el-text-color-secondary)]">-</span>
          </div>
        </template>

        <template #createTimeSlot="{ row }">
          <span class="table-time-text">{{ formatDate(row.createTime) }}</span>
        </template>

        <template #operationSlot="{ row }">
          <div class="flex justify-start">
            <el-dropdown
              class="operation-dropdown"
              placement="bottom-end"
              @command="(command) => handleOperationCommand(String(command), row)"
            >
              <el-button type="primary" link size="small" class="operation-trigger-button">{{ t('common.operation') }}</el-button>
              <template #dropdown>
                <el-dropdown-menu class="operation-menu-compact">
                  <el-dropdown-item command="edit">
                    <span>{{ t('common.edit') }}</span>
                  </el-dropdown-item>
                  <el-dropdown-item command="delete" divided class="operation-menu-item--danger">
                    <span>{{ t('common.delete') }}</span>
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </template>
              </vxe-grid>
            </div>
          </div>
        </div>
      </template>
    </ListPageLayout>

    <ShopDialog ref="dialogRef" @success="getList" />
  </ContentWrap>
</template>

<script setup lang="ts">
import { onMounted, ref, watchEffect } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { buildOperationColumn, buildTimeColumn, commonGridOptions } from '@/common/table'
import { batchDeleteShop, deleteShop, getShopList } from '@/api/shop'
import ShopDialog from './components/ShopDialog.vue'
import { formatDate } from '@/utils/formatTime'
import ListPageLayout from '@/components/ListPageLayout/index.vue'
import { useI18n } from 'vue-i18n'
import { useWindowSize } from '@vueuse/core'

const { t } = useI18n()

const loading = ref(false)
const list = ref<any[]>([])
const dialogRef = ref()
const selectedIds = ref<number[]>([])

const updateSelectedIds = (records: any[]) => {
  selectedIds.value = (records || []).map((item) => Number(item.id)).filter((id) => Number.isInteger(id) && id > 0)
}

const { height } = useWindowSize()

const gridOptions = ref({
  ...commonGridOptions,
  maxHeight: Math.max(height.value - 280, 360),
  rowConfig: {
    keyField: 'id'
  },
  checkboxConfig: {
    reserve: true
  },
  columns: [
    { type: 'checkbox', width: 48 },
    { title: t('common.id'), field: 'id', width: 80 },
    { title: t('shop.name'), field: 'name', minWidth: 180 },
    { title: t('shop.logo'), field: 'logo', width: 100, slots: { default: 'logoSlot' } },
    { title: t('shop.carousel'), field: 'carousel', width: 180, slots: { default: 'carouselSlot' } },
    { title: t('common.description'), field: 'description', minWidth: 240, showOverflow: 'tooltip' },
    { ...buildTimeColumn(t('common.createTime'), 'createTime', 180), slots: { default: 'createTimeSlot' } },
    buildOperationColumn('operationSlot')
  ]
})

watchEffect(() => {
  gridOptions.value.maxHeight = Math.max(height.value - 280, 360)
})

const getList = async () => {
  loading.value = true
  try {
    const data = await getShopList()
    list.value = Array.isArray(data) ? data : []
    selectedIds.value = []
  } finally {
    loading.value = false
  }
}

const openDialog = (id?: number) => {
  dialogRef.value?.open(id)
}

const handleOperationCommand = (command: string, row: any) => {
  if (command === 'edit') {
    openDialog(row.id)
    return
  }
  if (command === 'delete') {
    handleDelete(row.id)
  }
}

const handleCheckboxChange = ({ records }: any) => {
  updateSelectedIds(records)
}

const handleCheckboxAll = ({ records }: any) => {
  updateSelectedIds(records)
}

const handleDelete = async (id: number) => {
  try {
    await ElMessageBox.confirm(t('shop.confirmDelete'), t('common.tip'), { type: 'warning' })
    await deleteShop(id)
    ElMessage.success(t('common.deleteSuccess'))
    await getList()
  } catch {}
}

const handleBatchDelete = async () => {
  if (!selectedIds.value.length) return
  try {
    await ElMessageBox.confirm(t('shop.confirmBatchDelete', { count: selectedIds.value.length }), t('common.tip'), { type: 'warning' })
    await batchDeleteShop(selectedIds.value)
    ElMessage.success(t('common.batchDeleteSuccess'))
    await getList()
  } catch {}
}

onMounted(() => {
  getList()
})
</script>

<style scoped>
:deep(.shop-page) {
  gap: 10px;
  padding: 8px 0 0;
}

:deep(.shop-page .resource-toolbar) {
  justify-content: flex-start;
}

:deep(.shop-page .resource-toolbar__meta) {
  flex: 0 1 auto;
}

:deep(.shop-page .list-page-layout__main) {
  gap: 10px;
}

:deep(.shop-page .list-page-filter--flat) {
  padding-bottom: 10px;
}
</style>
