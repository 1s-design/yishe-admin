<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, MoreFilled, Download } from '@element-plus/icons-vue'
import { Icon } from '@/components/Icon'
import { useUserStore } from '@/store/modules/user'
import { getManifestByType } from '@/views/workflow/editor/config/node-manifest'
import ContentWrap from '@/components/ContentWrap/src/ContentWrap.vue'
import {
  getWorkflowLibraryPageApi,
  importWorkflowFromLibraryApi,
  unpublishWorkflowLibraryApi,
  publishWorkflowToLibraryApi,
  getWorkflowPageApi,
  type WorkflowLibraryItem,
  type WorkflowItem
} from '@/api/workflow'

const router = useRouter()
const userStore = useUserStore()
const isAdmin = computed(() => userStore.user?.isAdmin === true)

const searchKeyword = ref('')
const loading = ref(false)
const list = ref<WorkflowLibraryItem[]>([])
const total = ref(0)
const params = reactive({
  currentPage: 1,
  pageSize: 20,
})

// 查询工作流库
const fetchLibraryList = async () => {
  loading.value = true
  try {
    const res: any = await getWorkflowLibraryPageApi({
      currentPage: params.currentPage,
      pageSize: params.pageSize,
      keyword: searchKeyword.value.trim() || undefined,
    })
    list.value = res?.list || []
    total.value = res?.total || 0
  } catch (error: any) {
    ElMessage.error(error?.message || '获取工作流库失败')
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  params.currentPage = 1
  fetchLibraryList()
}

// 导入工作流
const importingId = ref<string | null>(null)
const handleImport = async (item: WorkflowLibraryItem, autoOpen = true) => {
  importingId.value = item.id
  try {
    await ElMessageBox.confirm(
      `确定导入“${item.name}”吗？导入后会在「我的工作流」中生成独立副本。`,
      '导入工作流模板',
      {
        confirmButtonText: '立即导入',
        cancelButtonText: '取消',
        type: 'info',
      }
    )
    const result: any = await importWorkflowFromLibraryApi(item.id)
    item.importCount = (item.importCount || 0) + 1
    ElMessage.success('工作流已成功导入')
    if (autoOpen && result?.id) {
      router.push(`/workflow/editor/${result.id}`)
    }
  } catch (error: any) {
    if (error !== 'cancel' && error !== 'close') {
      ElMessage.error(error?.message || '导入工作流失败')
    }
  } finally {
    importingId.value = null
  }
}

// 管理员下架模板
const handleDelete = async (item: WorkflowLibraryItem) => {
  if (!isAdmin.value) return
  try {
    await ElMessageBox.confirm(
      `确定下架“${item.name}”吗？只会从工作流库移除，不会影响已导入的用户工作流。`,
      '下架工作流模板',
      {
        confirmButtonText: '确认下架',
        cancelButtonText: '取消',
        type: 'warning',
      }
    )
    await unpublishWorkflowLibraryApi(item.id)
    ElMessage.success('已下架该模板')
    await fetchLibraryList()
  } catch (error: any) {
    if (error !== 'cancel' && error !== 'close') {
      ElMessage.error(error?.message || '下架模板失败')
    }
  }
}

// 管理员发布工作流弹窗
const publishDialogVisible = ref(false)
const publishSubmitting = ref(false)
const userWorkflows = ref<WorkflowItem[]>([])
const loadingWorkflows = ref(false)

const publishForm = reactive({
  workflowId: '',
  description: '',
  tagsString: '',
})

const openPublishDialog = async () => {
  publishDialogVisible.value = true
  publishForm.workflowId = ''
  publishForm.description = ''
  publishForm.tagsString = ''

  loadingWorkflows.value = true
  try {
    const res: any = await getWorkflowPageApi({ currentPage: 1, pageSize: 100 })
    userWorkflows.value = res?.list || []
  } finally {
    loadingWorkflows.value = false
  }
}

const handleWorkflowSelect = (wfId: string) => {
  const selected = userWorkflows.value.find((w) => w.id === wfId)
  if (selected && !publishForm.description) {
    publishForm.description = selected.description || ''
  }
}

const handlePublishSubmit = async () => {
  if (!publishForm.workflowId) {
    ElMessage.warning('请选择要发布的工作流')
    return
  }

  const tags = publishForm.tagsString
    .split(/[,，\s]+/)
    .map((s) => s.trim())
    .filter(Boolean)

  publishSubmitting.value = true
  try {
    await publishWorkflowToLibraryApi(publishForm.workflowId, {
      category: '通用',
      tags,
      description: publishForm.description.trim() || undefined,
    })
    ElMessage.success('已发布到工作流库')
    publishDialogVisible.value = false
    await fetchLibraryList()
  } catch (error: any) {
    ElMessage.error(error?.message || '发布失败')
  } finally {
    publishSubmitting.value = false
  }
}

// 解析模板中使用的节点类型
const getNodeManifests = (item: WorkflowLibraryItem) => {
  const nodeTypes = new Set<string>()
  if (Array.isArray(item.nodeTypes)) {
    for (const t of item.nodeTypes) {
      if (t) nodeTypes.add(String(t))
    }
  }
  const nodes = item.definition?.canvas?.nodes || item.definition?.nodes
  if (Array.isArray(nodes)) {
    for (const node of nodes) {
      if (node?.type) nodeTypes.add(String(node.type))
    }
  }
  return Array.from(nodeTypes)
    .map((type) => getManifestByType(type))
    .filter(Boolean)
    .slice(0, 8)
}

onMounted(() => {
  fetchLibraryList()
})
</script>

<template>
  <ContentWrap :plain="true">
    <div class="wf-page">
      <!-- 页头：极简风格，搜索与操作同一行 -->
      <div class="wf-page__header">
        <div class="wf-page__header-left">
          <el-input
            v-model="searchKeyword"
            class="wf-page__search-input"
            placeholder="搜索工作流模板..."
            size="small"
            clearable
            @keyup.enter="handleSearch"
            @clear="handleSearch"
          />
        </div>

        <div class="wf-page__header-actions">
          <el-button size="small" @click="router.push('/workflow/index')">我的工作流</el-button>
          <el-button
            v-if="isAdmin"
            type="primary"
            size="small"
            @click="openPublishDialog"
          >
            <el-icon class="el-icon--left"><Plus /></el-icon>
            发布到工作流库
          </el-button>
        </div>
      </div>

      <!-- 卡片网格 -->
      <div v-loading="loading" class="wf-grid">
        <!-- 空状态 -->
        <div v-if="!loading && !list.length" class="wf-empty-wrap">
          <el-empty description="工作流库暂无匹配模板" :image-size="80">
            <template #extra>
              <el-button
                v-if="isAdmin"
                type="primary"
                size="small"
                @click="openPublishDialog"
              >
                发布第一个工作流模板
              </el-button>
            </template>
          </el-empty>
        </div>

        <!-- 模板卡片 -->
        <div
          v-for="item in list"
          :key="item.id"
          class="wf-card"
          @click="handleImport(item, true)"
        >
          <div class="wf-card__hero">
            <header class="wf-card__hero-header">
              <span class="wf-card__import-count" title="导入引用次数">
                <el-icon><Download /></el-icon>{{ item.importCount || 0 }}
              </span>
            </header>

            <h3 class="wf-card__title" :title="item.name">{{ item.name }}</h3>

            <!-- 节点图标行 -->
            <div v-if="getNodeManifests(item).length" class="wf-card__node-icons" title="包含节点">
              <span
                v-for="manifest in getNodeManifests(item)"
                :key="manifest!.type"
                class="wf-card__node-icon"
                :style="{ color: manifest!.color }"
                :title="manifest!.name"
              >
                <img v-if="manifest!.iconImage" :src="manifest!.iconImage" :alt="manifest!.name" />
                <Icon v-else-if="manifest!.icon" :icon="manifest!.icon" :size="18" />
                <span v-else>{{ manifest!.name.slice(0, 1) }}</span>
              </span>
            </div>
          </div>

          <footer class="wf-card__footer">
            <div class="wf-card__info">
              <p v-if="item.description" class="wf-card__desc">{{ item.description }}</p>
              <span class="wf-card__date">发布于 {{ (item.createTime || '').slice(0, 10) }}</span>
            </div>

            <!-- 操作区 -->
            <div class="wf-card__actions" @click.stop>
              <el-button
                type="primary"
                link
                size="small"
                :loading="importingId === item.id"
                @click.stop="handleImport(item, true)"
              >
                导入
              </el-button>

              <el-dropdown v-if="isAdmin" trigger="click" placement="bottom-end" @click.stop>
                <button class="wf-card__more" @click.stop>
                  <el-icon><MoreFilled /></el-icon>
                </button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item @click="handleImport(item, false)">导入到我的工作流</el-dropdown-item>
                    <el-dropdown-item @click="handleImport(item, true)">导入并打开编辑器</el-dropdown-item>
                    <el-dropdown-item type="danger" divided @click="handleDelete(item)">下架模板</el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </div>
          </footer>
        </div>
      </div>

      <!-- 分页 -->
      <div v-if="total > params.pageSize" class="wf-page__pagination">
        <el-pagination
          v-model:current-page="params.currentPage"
          v-model:page-size="params.pageSize"
          :total="total"
          :page-sizes="[20, 40, 60]"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="fetchLibraryList"
          @current-change="fetchLibraryList"
        />
      </div>
    </div>

    <!-- 管理员发布工作流弹窗 -->
    <el-dialog
      v-model="publishDialogVisible"
      title="发布到工作流库"
      width="440px"
      align-center
    >
      <el-form label-position="top">
        <el-form-item label="选择工作流" required>
          <el-select
            v-model="publishForm.workflowId"
            placeholder="请选择已有工作流"
            style="width: 100%"
            :loading="loadingWorkflows"
            @change="handleWorkflowSelect"
          >
            <el-option
              v-for="wf in userWorkflows"
              :key="wf.id"
              :label="wf.name"
              :value="wf.id"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="模板简介">
          <el-input
            v-model="publishForm.description"
            type="textarea"
            :rows="3"
            placeholder="简要说明此工作流的用途与执行效果..."
            maxlength="300"
            show-word-limit
          />
        </el-form-item>

        <el-form-item label="标签关键词（空格分隔）">
          <el-input
            v-model="publishForm.tagsString"
            placeholder="例如：Temu PS自动化 套图"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="publishDialogVisible = false">取消</el-button>
        <el-button
          type="primary"
          :loading="publishSubmitting"
          @click="handlePublishSubmit"
        >
          确认发布
        </el-button>
      </template>
    </el-dialog>
  </ContentWrap>
</template>

<style scoped lang="scss">
.wf-page {
  min-height: calc(100vh - 120px);
  padding: 10px 0 0;

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    min-height: 32px;
    margin-bottom: 16px;
  }

  &__header-left,
  &__header-actions {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  &__header-left {
    min-width: 0;
    flex: 1;
  }

  &__header-actions {
    flex-shrink: 0;
  }

  &__search-input {
    width: 240px;
  }

  &__pagination {
    display: flex;
    justify-content: center;
    margin-top: 16px;
  }
}

.wf-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.wf-empty-wrap {
  grid-column: 1 / -1;
  padding: 40px 0;
}

.wf-card {
  position: relative;
  z-index: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  justify-content: flex-start;
  min-height: 200px;
  background: var(--app-content-surface-color);
  border: 1px solid var(--app-content-border-color);
  border-radius: 12px;
  box-shadow: 0 1px 2px color-mix(in srgb, var(--el-text-color-primary) 6%, transparent);
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease,
    border-color 0.2s ease;
  cursor: pointer;

  &:hover {
    border-color: color-mix(in srgb, var(--el-color-primary) 32%, var(--app-content-border-color));
    box-shadow: 0 12px 28px color-mix(in srgb, var(--el-text-color-primary) 12%, transparent);
    transform: translateY(-2px);
  }

  html.dark & {
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.4);

    &:hover {
      box-shadow: 0 12px 30px rgba(0, 0, 0, 0.55);
    }
  }

  /* Hero section */
  &__hero {
    position: relative;
    padding: 16px 16px 14px;
    flex: 1;
  }

  &__hero-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-direction: row;
    flex-wrap: nowrap;
    gap: 12px;
    font-weight: 700;
  }

  &__badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 10px;
    font-weight: 600;
    padding: 2px 8px;
    border-radius: 14px;
    white-space: nowrap;

    &-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: currentcolor;
    }

    &--on {
      color: var(--el-color-primary);
      background: color-mix(in srgb, var(--el-color-primary) 12%, transparent);
    }
  }

  &__import-count {
    font-size: 11px;
    color: var(--el-text-color-placeholder);
    display: inline-flex;
    align-items: center;
    gap: 3px;
  }

  &__node-icons {
    display: flex;
    align-items: center;
    min-width: 0;
    padding: 9px 0 2px;
    flex-wrap: wrap;
    gap: 6px;
  }

  &__node-icon {
    display: inline-flex;
    width: 22px;
    height: 22px;
    align-items: center;
    justify-content: center;
    color: var(--el-color-primary);
  }

  &__node-icon img {
    width: 22px;
    height: 22px;
    object-fit: contain;
  }

  &__title {
    margin: 14px 0 0;
    font-size: 15px;
    font-weight: 600;
    color: var(--el-text-color-primary);
    line-height: 1.35;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    padding-right: 12px;
  }

  /* Footer section */
  &__footer {
    position: relative;
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-direction: row;
    flex-wrap: nowrap;
    padding: 12px 16px;
    gap: 12px;
    border-top: 1px solid color-mix(in srgb, var(--app-content-border-color) 65%, transparent);
  }

  &__info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  &__desc {
    margin: 0;
    font-size: 12px;
    line-height: 1.5;
    color: var(--el-text-color-secondary);
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  &__date {
    font-size: 11px;
    color: var(--el-text-color-placeholder);
  }

  &__actions {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-shrink: 0;
  }

  &__more {
    display: flex;
    width: 28px;
    height: 28px;
    padding: 0;
    color: var(--el-text-color-secondary);
    background: none;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    align-items: center;
    justify-content: center;
    transition: background-color 0.15s ease;

    &:hover {
      background: var(--app-content-surface-muted-color);
      color: var(--el-text-color-primary);
    }
  }
}
</style>
