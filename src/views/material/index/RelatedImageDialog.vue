<template>
  <el-dialog
    v-model="visible"
    width="960px"
    :destroy-on-close="true"
    align-center
    :title="`管理关联图${list.length ? `（${list.length}）` : ''}`"
  >
    <div class="related-image-panel" v-loading="loading">
      <!-- 按 ID 添加 -->
      <div class="related-image-panel__add">
        <div class="related-image-panel__add-label">
          素材 ID
          <span class="related-image-panel__add-hint">多个用逗号、空格或换行分隔</span>
        </div>
        <el-input
          v-model="inputIds"
          type="textarea"
          :rows="2"
          resize="none"
          placeholder="粘贴要关联的素材 ID"
        />
        <div class="related-image-panel__add-actions">
          <el-button size="small" text @click="inputIds = ''">清空</el-button>
          <el-button
            type="primary"
            size="small"
            :loading="adding"
            :disabled="!parsedInputIds.length"
            @click="handleAdd"
          >
            添加{{ parsedInputIds.length ? `（${parsedInputIds.length}）` : '' }}
          </el-button>
        </div>
      </div>

      <!-- 关联图列表 -->
      <el-table
        :data="list"
        size="small"
        class="related-image-table"
        style="width: 100%"
        max-height="calc(100vh - 360px)"
        @selection-change="onSelectionChange"
      >
        <el-table-column type="selection" width="44" />
        <el-table-column label="缩略图" width="96" align="center">
          <template #default="{ row }">
            <el-image
              :src="getThumbUrl(row)"
              :preview-src-list="[row?.url].filter(Boolean)"
              :initial-index="0"
              :preview-teleported="true"
              :hide-on-click-modal="false"
              fit="contain"
              class="related-image-row__thumb"
            >
              <template #error>
                <div class="related-image-row__empty">无图</div>
              </template>
            </el-image>
          </template>
        </el-table-column>
        <el-table-column prop="name" label="名称" min-width="180" show-overflow-tooltip>
          <template #default="{ row }">
            <span>{{ row?.name || '-' }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="code" label="编码" width="130" show-overflow-tooltip>
          <template #default="{ row }">
            <span>{{ row?.code || '-' }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="id" label="素材 ID" min-width="320" show-overflow-tooltip />
        <el-table-column label="操作" width="88" align="center">
          <template #default="{ row }">
            <el-button link type="danger" size="small" :loading="removingIds.has(row.id)" @click="handleRemove([row.id])">
              解除
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-empty v-if="!loading && !list.length" description="暂无关联图，可在上方粘贴素材 ID 添加" />
    </div>

    <template #footer>
      <el-button
        type="danger"
        plain
        :disabled="!selectedIds.length"
        :loading="removing"
        @click="handleRemove(selectedIds)"
      >
        批量解除{{ selectedIds.length ? `（${selectedIds.length}）` : '' }}
      </el-button>
      <el-button @click="visible = false">关闭</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { addRelatedImages, getRelatedImages, removeRelatedImages } from '@/api/material'
import { getFastPreviewImageUrl } from '@/utils/image'

const emit = defineEmits<{ (e: 'changed'): void }>()

const visible = ref(false)
const loading = ref(false)
const adding = ref(false)
const removing = ref(false)
const materialId = ref('')
const list = ref<any[]>([])
const inputIds = ref('')
const selectedIds = ref<string[]>([])
const removingIds = ref<Set<string>>(new Set())

/** 把输入解析成 id 数组：支持逗号/空格/换行分隔 */
const parsedInputIds = computed(() => {
  return Array.from(
    new Set(
      String(inputIds.value || '')
        .split(/[\s,，;；]+/)
        .map((s) => s.trim())
        .filter((s) => s.length > 0)
    )
  )
})

function getThumbUrl(row: any) {
  const url = row?.url || row?.originUrl || ''
  return url ? getFastPreviewImageUrl(url, { width: 120, height: 120 }) : ''
}

function onSelectionChange(rows: any[]) {
  selectedIds.value = (rows || []).map((row) => String(row.id))
}

async function fetchList() {
  loading.value = true
  try {
    const res: any = await getRelatedImages(materialId.value)
    const data = res?.data ?? res
    const rows = data?.list || []
    list.value = Array.isArray(rows) ? rows : []
    // 让接口返回的 relatedImageIds 里已失效的 id 不阻塞操作
  } catch (error: any) {
    ElMessage.error(error?.message || '查询关联图失败')
    list.value = []
  } finally {
    loading.value = false
  }
}

async function handleAdd() {
  const ids = parsedInputIds.value
  if (!ids.length) {
    ElMessage.warning('请输入要添加的素材 ID')
    return
  }
  adding.value = true
  try {
    await addRelatedImages({ id: materialId.value, ids })
    ElMessage.success(`已添加 ${ids.length} 个关联图`)
    inputIds.value = ''
    await fetchList()
    emit('changed')
  } catch (error: any) {
    ElMessage.error(error?.message || '添加关联图失败')
  } finally {
    adding.value = false
  }
}

async function handleRemove(ids: string[]) {
  const targets = (ids || []).map(String).filter(Boolean)
  if (!targets.length) return

  try {
    await ElMessageBox.confirm(`确定解除 ${targets.length} 个关联图吗？`, '解除关联', {
      type: 'warning',
      confirmButtonText: '解除',
      cancelButtonText: '取消'
    })
  } catch {
    return
  }

  removing.value = true
  targets.forEach((id) => removingIds.value.add(id))
  try {
    await removeRelatedImages({ id: materialId.value, ids: targets })
    ElMessage.success(`已解除 ${targets.length} 个关联图`)
    await fetchList()
    emit('changed')
  } catch (error: any) {
    ElMessage.error(error?.message || '解除关联图失败')
  } finally {
    removing.value = false
    removingIds.value = new Set()
  }
}

async function open(row: any) {
  const id = String(row?.id || '')
  if (!id) {
    ElMessage.warning('素材 ID 不存在')
    return
  }
  materialId.value = id
  inputIds.value = ''
  selectedIds.value = []
  list.value = []
  visible.value = true
  await fetchList()
}

defineExpose({ open })
</script>

<style scoped>
.related-image-panel {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

/* 扁平化：去掉外框盒子，靠留白与细分割线分层 */
.related-image-panel__add {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.related-image-panel__add-label {
  font-size: 12px;
  color: var(--el-text-color-regular);
}

.related-image-panel__add-hint {
  margin-left: 8px;
  color: var(--el-text-color-secondary);
}

.related-image-panel__add-actions {
  display: flex;
  justify-content: flex-end;
  gap: 4px;
}

/* 扁平表格：无外框、无斑马，仅行分隔线 */
.related-image-table {
  --el-table-border-color: transparent;
  --el-table-header-bg-color: transparent;
  --el-table-tr-bg-color: transparent;
}

.related-image-table :deep(th.el-table__cell),
.related-image-table :deep(td.el-table__cell) {
  border-bottom: 1px solid var(--el-fill-color);
}

/*
 * 粘性列（fixed）依赖单元格背景遮住下方滚动内容，
 * 一旦设成 transparent 就会「透底」，这里给实心背景兜底。
 */
.related-image-table :deep(th.el-table-fixed-column--left),
.related-image-table :deep(th.el-table-fixed-column--right),
.related-image-table :deep(td.el-table-fixed-column--left),
.related-image-table :deep(td.el-table-fixed-column--right) {
  background-color: var(--el-bg-color-overlay);
}

.related-image-table :deep(th.el-table__cell .cell) {
  color: var(--el-text-color-secondary);
  font-weight: 500;
}

.related-image-row__thumb {
  width: 48px;
  height: 48px;
  overflow: hidden;
  cursor: zoom-in;
  background: var(--el-fill-color-lighter);
  border-radius: 6px;
}

.related-image-row__empty {
  display: inline-flex;
  width: 48px;
  height: 48px;
  font-size: 12px;
  color: var(--el-text-color-placeholder);
  background: var(--el-fill-color-lighter);
  border-radius: 6px;
  align-items: center;
  justify-content: center;
}
</style>
