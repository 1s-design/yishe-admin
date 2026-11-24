<template>
  <ContentWrap :plain="true">
    <ListPageLayout class="media-account-page">
      <template #filter>
        <div class="list-page-filter list-page-filter--flat">
          <div class="resource-toolbar">
            <div class="resource-toolbar__meta">
              <div class="resource-toolbar__actions">
                <el-select
                  v-model="platformFilter"
                  size="small"
                  clearable
                  placeholder="全部平台"
                  style="width: 140px"
                  @change="getList"
                >
                  <el-option
                    v-for="item in MEDIA_PLATFORM_OPTIONS"
                    :key="item.value"
                    :label="item.label"
                    :value="item.value"
                  />
                </el-select>
                <el-button size="small" type="primary" @click="openDialog()">新增媒体账号</el-button>
                <el-button size="small" @click="getList">刷新</el-button>
                <el-button
                  size="small"
                  type="danger"
                  plain
                  :disabled="!selectedIds.length"
                  @click="handleBatchDelete"
                >
                  批量删除
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
                <template #platformSlot="{ row }">
                  <el-tag size="small" effect="plain">
                    {{ row.platformLabel || row.platform }}
                  </el-tag>
                </template>

                <template #enabledSlot="{ row }">
                  <el-tag
                    size="small"
                    :type="row.enabled ? 'success' : 'info'"
                    effect="plain"
                  >
                    {{ row.enabled ? '启用' : '停用' }}
                  </el-tag>
                </template>

                <template #executionSlot="{ row }">
                  <div v-if="row.executionProfiles?.length" class="account-execution-tags">
                    <el-tag
                      v-for="(item, idx) in row.executionProfiles.slice(0, 3)"
                      :key="item.profileId"
                      size="small"
                      :type="item.online ? 'success' : 'info'"
                      effect="plain"
                    >
                      {{ idx === 0 ? '主' : `备${idx}` }} · {{ item.profileName || item.profileId }}
                    </el-tag>
                    <el-tooltip
                      v-if="row.executionProfiles.length > 3"
                      :content="row.executionProfiles.map((i: any) => i.profileName || i.profileId).join('、')"
                      placement="top"
                    >
                      <span class="account-execution-tags__more">
                        +{{ row.executionProfiles.length - 3 }}
                      </span>
                    </el-tooltip>
                  </div>
                  <span v-else class="text-xs text-[var(--el-text-color-secondary)]">
                    未绑定环境（执行时将跳过）
                  </span>
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
                      <el-button type="primary" link size="small" class="operation-trigger-button">
                        操作
                      </el-button>
                      <template #dropdown>
                        <el-dropdown-menu class="operation-menu-compact">
                          <el-dropdown-item command="edit">编辑</el-dropdown-item>
                          <el-dropdown-item command="toggle">
                            {{ row.enabled ? '停用' : '启用' }}
                          </el-dropdown-item>
                          <el-dropdown-item command="delete" divided class="operation-menu-item--danger">
                            删除
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

    <MediaAccountDialog ref="dialogRef" @success="getList" />
  </ContentWrap>
</template>

<script setup lang="ts">
import { onMounted, ref, watchEffect } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { buildOperationColumn, buildTimeColumn, commonGridOptions } from '@/common/table'
import {
  MEDIA_PLATFORM_OPTIONS,
  batchDeleteMediaAccount,
  deleteMediaAccount,
  getMediaAccountList,
  updateMediaAccount,
  type MediaAccountItem,
} from '@/api/media-account'
import MediaAccountDialog from './components/MediaAccountDialog.vue'
import { formatDate } from '@/utils/formatTime'
import ListPageLayout from '@/components/ListPageLayout/index.vue'
import { useWindowSize } from '@vueuse/core'

const loading = ref(false)
const list = ref<MediaAccountItem[]>([])
const platformFilter = ref<string>('')
const dialogRef = ref()
const selectedIds = ref<number[]>([])

const updateSelectedIds = (records: any[]) => {
  selectedIds.value = (records || [])
    .map((item) => Number(item.id))
    .filter((id) => Number.isInteger(id) && id > 0)
}

const { height } = useWindowSize()

const gridOptions = ref({
  ...commonGridOptions,
  maxHeight: Math.max(height.value - 280, 360),
  rowConfig: { keyField: 'id' },
  checkboxConfig: { reserve: true },
  columns: [
    { type: 'checkbox', width: 48 },
    { title: 'ID', field: 'id', width: 72 },
    { title: '账号名称', field: 'name', minWidth: 160 },
    { title: '平台', field: 'platform', width: 100, slots: { default: 'platformSlot' } },
    { title: '平台标识', field: 'platformAccountId', minWidth: 130, showOverflow: 'tooltip' },
    { title: '状态', field: 'enabled', width: 84, slots: { default: 'enabledSlot' } },
    { title: '绑定执行环境', field: 'executionProfiles', minWidth: 260, slots: { default: 'executionSlot' } },
    { title: '定位备注', field: 'remark', minWidth: 200, showOverflow: 'tooltip' },
    { ...buildTimeColumn('创建时间', 'createTime', 170), slots: { default: 'createTimeSlot' } },
    buildOperationColumn('operationSlot'),
  ],
})

watchEffect(() => {
  gridOptions.value.maxHeight = Math.max(height.value - 280, 360)
})

const getList = async () => {
  loading.value = true
  try {
    const data: any = await getMediaAccountList({
      platform: platformFilter.value || undefined,
    })
    list.value = Array.isArray(data) ? data : []
    selectedIds.value = []
  } finally {
    loading.value = false
  }
}

const openDialog = (id?: number) => {
  dialogRef.value?.open(id)
}

const handleOperationCommand = async (command: string, row: MediaAccountItem) => {
  if (command === 'edit') {
    openDialog(row.id)
    return
  }
  if (command === 'toggle') {
    await updateMediaAccount(row.id, { enabled: !row.enabled })
    ElMessage.success(row.enabled ? '已停用' : '已启用')
    await getList()
    return
  }
  if (command === 'delete') {
    await handleDelete(row.id)
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
    await ElMessageBox.confirm('确认删除该媒体账号吗？', '提示', { type: 'warning' })
    await deleteMediaAccount(id)
    ElMessage.success('删除成功')
    await getList()
  } catch {}
}

const handleBatchDelete = async () => {
  if (!selectedIds.value.length) return
  try {
    await ElMessageBox.confirm(`确认删除选中的 ${selectedIds.value.length} 个媒体账号吗？`, '提示', {
      type: 'warning',
    })
    await batchDeleteMediaAccount(selectedIds.value)
    ElMessage.success('批量删除成功')
    await getList()
  } catch {}
}

onMounted(() => {
  getList()
})
</script>

<style scoped>
:deep(.media-account-page) {
  gap: 10px;
  padding: 8px 0 0;
}

:deep(.media-account-page .resource-toolbar) {
  justify-content: flex-start;
}

:deep(.media-account-page .resource-toolbar__meta) {
  flex: 0 1 auto;
}

:deep(.media-account-page .list-page-layout__main) {
  gap: 10px;
}

:deep(.media-account-page .list-page-filter--flat) {
  padding-bottom: 10px;
}

.account-execution-tags {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
}

.account-execution-tags__more {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  cursor: default;
}
</style>
