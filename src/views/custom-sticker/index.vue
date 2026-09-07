<template>
  <ContentWrap :plain="true">
    <ListPageLayout class="custom-sticker-page" :sidebar-width="folderTreeCollapsed ? '28px' : '280px'">
      <template #filter>
        <div class="list-page-filter list-page-filter--flat">
          <el-form :model="queryParams" label-position="top" class="list-page-search-form">
            <el-row :gutter="12" class="list-page-search-form__row">
              <el-col class="list-page-search-form__col--wide" :xs="24" :sm="12" :md="9" :lg="7" :xl="6">
                <el-form-item label="搜索">
                  <el-input
                    v-model="queryParams.searchText"
                    size="small"
                    clearable
                    placeholder="搜索名称、描述、关键词、用户名、用户 ID"
                    @keyup.enter="handleSearch"
                    @clear="handleSearch"
                  >
                    <template #prefix><el-icon><Search /></el-icon></template>
                  </el-input>
                </el-form-item>
              </el-col>
              <el-col class="list-page-search-form__col--narrow" :xs="24" :sm="12" :md="6" :lg="4" :xl="3">
                <el-form-item label="素材中心">
                  <el-select v-model="queryParams.shareState" size="small" @change="handleSearch">
                    <el-option label="全部" value="all" />
                    <el-option label="未发布" value="unshared" />
                    <el-option label="已发布" value="shared" />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col class="list-page-search-form__col--narrow" :xs="24" :sm="12" :md="6" :lg="4" :xl="3">
                <el-form-item label="素材库状态">
                  <el-select v-model="queryParams.importState" size="small" @change="handleSearch">
                    <el-option label="全部" value="all" />
                    <el-option label="未复制" value="not-imported" />
                    <el-option label="已复制" value="imported" />
                  </el-select>
                </el-form-item>
              </el-col>
            </el-row>
            <div class="list-page-search-form__actions">
              <el-button size="small" type="primary" :icon="Search" :loading="loading" @click="handleSearch">搜索</el-button>
              <el-button size="small" :disabled="loading" @click="handleReset">重置</el-button>
              <el-button
                size="small"
                type="danger"
                :icon="Delete"
                :disabled="loading || !selectedIds.length"
                @click="() => handleDelete(null)"
              >
                批量删除 ({{ selectedIds.length }})
              </el-button>
              <!-- 分享统一下拉菜单（完全统一文案） -->
              <el-dropdown
                trigger="click"
                :disabled="loading || !selectedIds.length"
                @command="(cmd: CustomStickerTransferAction) => openUserTransferDialog(cmd)"
              >
                <el-button size="small" type="success" :disabled="loading || !selectedIds.length">
                  分享 ({{ selectedIds.length }})
                  <el-icon class="el-icon--right"><ArrowDown /></el-icon>
                </el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item command="share">
                      <el-icon><Share /></el-icon>
                      <span>快捷共享</span>
                    </el-dropdown-item>
                    <el-dropdown-item command="copy">
                      <el-icon><CopyDocument /></el-icon>
                      <span>复制副本</span>
                    </el-dropdown-item>
                    <el-dropdown-item command="move">
                      <el-icon><Right /></el-icon>
                      <span>转移所有权</span>
                    </el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
              <el-button
                size="small"
                type="warning"
                :disabled="loading || !selectedIds.length"
                @click="openBatchPublish"
              >
                发布到素材中心 ({{ selectedIds.length }})
              </el-button>
            </div>
          </el-form>
        </div>
      </template>

      <template #sidebar>
        <div class="list-page-panel list-page-panel--flat list-page-sidebar folder-sidebar-shell">
          <div class="list-page-sidebar__body folder-sidebar-body">
            <div v-show="!folderTreeCollapsed" class="folder-sidebar-tree">
              <FolderTree
                v-model="selectedFolderId"
                folder-category="customsticker"
                :show-count="false"
                width="100%"
                :drag-state="dragState"
                @change="handleFolderChange"
                @folder-drag-over="handleFolderDragOver"
                @folder-drag-leave="handleFolderDragLeave"
                @folder-drop="handleFolderDrop"
              />
            </div>
          </div>
          <button type="button" class="folder-sidebar-toggle" @click="folderTreeCollapsed = !folderTreeCollapsed">
            <el-icon :size="14"><DArrowRight v-if="folderTreeCollapsed" /><DArrowLeft v-else /></el-icon>
          </button>
        </div>
      </template>

      <template #table>
        <div class="list-page-panel list-page-panel--flat list-page-table-panel list-page-table-panel--flat">
          <div class="list-page-table-panel__body">
            <div class="common-table">
              <vxe-grid
                class="custom-sticker-dnd-grid dnd-text-selectable"
                v-bind="gridOptions"
                :data="filteredRows"
                :loading="loading"
                @checkbox-change="handleCheckboxChange"
                @checkbox-all="handleCheckboxChange"
              >
                <template #dragHandleSlot><TableRowDragHandle /></template>
                <template #previewSlot="{ row }">
                  <div class="material-compact-preview">
                    <div class="material-compact-preview__image-wrap">
                      <el-image
                        :src="getFastPreviewImageUrl(row.url, { width: 160, quality: 82, format: 'webp' })"
                        :preview-src-list="row.url ? [row.url] : []"
                        preview-teleported
                        fit="contain"
                        class="material-compact-preview__image"
                      />
                    </div>
                  </div>
                </template>
                <template #nameSlot="{ row }">
                  <div class="name-cell">
                    <span class="name-cell__title">{{ row.name || '未命名贴纸' }}</span>
                    <span class="name-cell__meta">{{ row.width || '-' }} × {{ row.height || '-' }} · {{ row.suffix || 'png' }}</span>
                  </div>
                </template>
                <template #folderSlot="{ row }"><span>{{ row.folder || '未分组' }}</span></template>
                <template #importSlot="{ row }">
                  <div class="import-cell">
                    <el-tag :type="row.imported ? 'success' : 'info'" size="small" effect="plain">
                      {{ row.imported ? '已复制' : '未复制' }}
                    </el-tag>
                    <div v-if="row.imported && row.importedSticker?.code" class="import-cell__code mono" :title="`素材库编码: ${row.importedSticker.code}`">
                      {{ row.importedSticker.code }}
                    </div>
                  </div>
                </template>
                <template #shareSlot="{ row }">
                  <el-tag :type="row.isShared ? 'success' : 'info'" size="small" effect="plain">
                    {{ row.isShared ? '已发布' : '未发布' }}
                  </el-tag>
                </template>
                <template #ownerSlot="{ row }">
                  <span class="owner-text" :title="`ID: ${row.userId}`">{{ formatUserName(row.user, row.userId) }}</span>
                </template>
                <template #timeSlot="{ row }"><span>{{ formatTime(row.updateTime || row.createTime) }}</span></template>
                <template #operationSlot="{ row }">
                  <el-dropdown trigger="click" @command="(command) => handleOperation(command, row)">
                    <el-button type="primary" link size="small">操作</el-button>
                    <template #dropdown>
                      <el-dropdown-menu>
                        <el-dropdown-item command="detail"><el-icon><View /></el-icon>查看设计数据</el-dropdown-item>
                        <el-dropdown-item command="copyToLibrary" :disabled="row.imported">
                          <el-icon><CopyDocument /></el-icon>{{ row.imported ? '已复制到素材库' : '复制到素材库' }}
                        </el-dropdown-item>
                        <el-dropdown-item command="publish" :disabled="row.isShared"><el-icon><Upload /></el-icon>发布到素材中心</el-dropdown-item>
                        <el-dropdown-item command="share"><el-icon><Share /></el-icon>快捷共享</el-dropdown-item>
                        <el-dropdown-item command="copy"><el-icon><CopyDocument /></el-icon>复制副本</el-dropdown-item>
                        <el-dropdown-item command="move"><el-icon><Right /></el-icon>转移所有权</el-dropdown-item>
                        <el-dropdown-item command="delete" divided>
                          <el-icon><Delete /></el-icon><span style="color: var(--el-color-danger)">删除</span>
                        </el-dropdown-item>
                      </el-dropdown-menu>
                    </template>
                  </el-dropdown>
                </template>
              </vxe-grid>
            </div>
          </div>
        </div>
      </template>

      <template #pagination>
        <div class="list-page-panel list-page-panel--flat list-page-table-panel__pagination list-page-table-panel__pagination--flat">
          <Pagination v-model:page="queryParams.page" v-model:limit="queryParams.pageSize" :total="total" @pagination="loadData" />
        </div>
      </template>
    </ListPageLayout>

    <!-- 极简全屏详情（左侧展示图片与元数据信息，右侧大空间展示核心设计数据） -->
    <el-dialog
      v-model="detailVisible"
      fullscreen
      :show-close="false"
      class="cs-info-dialog"
      destroy-on-close
    >
      <template #header>
        <div class="cs-info-nav">
          <button type="button" class="cs-info-back" @click="detailVisible = false">
            <el-icon :size="16"><Back /></el-icon>
            <span>返回列表</span>
          </button>
          <span class="cs-info-nav-title">{{ activeSticker?.name || '自定义贴纸详情' }}</span>
          <button type="button" class="cs-info-close" @click="detailVisible = false" title="关闭 (Esc)">
            <el-icon :size="18"><Close /></el-icon>
          </button>
        </div>
      </template>

      <div v-if="activeSticker" class="cs-info-layout">
        <!-- 左侧：图片 + 名称 + 状态 + 描述 + 关键词 + 属性 -->
        <div class="cs-sidebar-panel">
          <!-- 贴纸大图预览 -->
          <div class="cs-sidebar-img-box">
            <el-image
              :src="activeSticker.url"
              :preview-src-list="activeSticker.url ? [activeSticker.url] : []"
              preview-teleported
              fit="contain"
              class="cs-sidebar-img"
            />
          </div>

          <div class="cs-sidebar-specs">
            <span>{{ activeSticker.width || '-' }} × {{ activeSticker.height || '-' }} px</span>
            <span>·</span>
            <span>{{ (activeSticker.suffix || 'png').toUpperCase() }}</span>
            <span>·</span>
            <span>比例 {{ activeSticker.aspectRatio ? activeSticker.aspectRatio.toFixed(2) : '1:1' }}</span>
          </div>

          <!-- 贴纸标题与状态标签 -->
          <div class="cs-sidebar-meta-block">
            <h2 class="cs-sidebar-title">{{ activeSticker.name || '未命名贴纸' }}</h2>
            <div class="cs-sidebar-tags">
              <el-tag size="small" :type="activeSticker.isShared ? 'success' : 'info'" effect="plain">
                {{ activeSticker.isShared ? '素材中心已发布' : '素材中心未发布' }}
              </el-tag>
              <el-tag size="small" :type="activeSticker.imported ? 'success' : 'info'" effect="plain">
                {{ activeSticker.imported ? '素材库已复制' : '素材库未复制' }}
              </el-tag>
              <el-tag v-if="activeSticker.meta?.source === 'ai-agent'" size="small" type="warning" effect="plain">
                AI 智能设计
              </el-tag>
            </div>
          </div>

          <!-- 描述 -->
          <div v-if="activeSticker.description" class="cs-sidebar-desc">
            {{ activeSticker.description }}
          </div>

          <!-- 关键词（极简纯文本微胶囊） -->
          <div v-if="keywordList.length" class="cs-sidebar-keywords">
            <span v-for="kw in keywordList" :key="kw" class="cs-sidebar-kw">{{ kw }}</span>
          </div>

          <!-- 属性表格 -->
          <div class="cs-sidebar-table">
            <div class="cs-sidebar-row">
              <span class="label">作品 ID</span>
              <span class="value mono copyable" @click="copyText(activeSticker.id, '作品 ID')">
                {{ activeSticker.id }}
                <el-icon><CopyDocument /></el-icon>
              </span>
            </div>
            <div class="cs-sidebar-row">
              <span class="label">所属用户</span>
              <span class="value">{{ formatUserName(activeSticker.user, activeSticker.userId) }}</span>
            </div>
            <div class="cs-sidebar-row">
              <span class="label">所属文件夹</span>
              <span class="value">{{ activeSticker.folder || '未分组' }}</span>
            </div>
            <div class="cs-sidebar-row">
              <span class="label">创建时间</span>
              <span class="value">{{ formatTime(activeSticker.createTime) }}</span>
            </div>
            <div class="cs-sidebar-row">
              <span class="label">更新时间</span>
              <span class="value">{{ formatTime(activeSticker.updateTime) }}</span>
            </div>
            <div v-if="activeSticker.importedSticker?.code" class="cs-sidebar-row">
              <span class="label">素材库编码</span>
              <span class="value mono font-bold text-primary" style="display: flex; align-items: center; gap: 6px;">
                {{ activeSticker.importedSticker.code }}
                <el-button link type="primary" size="small" @click="copyText(activeSticker.importedSticker.code, '素材库编码')">复制</el-button>
              </span>
            </div>
            <div v-if="activeSticker.importedStickerId" class="cs-sidebar-row">
              <span class="label">素材库副本 ID</span>
              <span class="value mono">{{ activeSticker.importedStickerId }}</span>
            </div>
            <div v-if="activeSticker.sourceCustomStickerId" class="cs-sidebar-row">
              <span class="label">来源副本</span>
              <span class="value mono">用户 #{{ activeSticker.sourceUserId }} ({{ activeSticker.sourceCustomStickerId }})</span>
            </div>
          </div>
        </div>

        <!-- 右侧：大空间展示核心数据（AI 提示词、演进历史、完整 JSON） -->
        <div class="cs-main-panel">
          <!-- AI 提示词 -->
          <div v-if="activeSticker.meta?.prompt" class="cs-main-section">
            <div class="cs-main-head">
              <span class="cs-main-heading">AI 生成提示词 (Prompt)</span>
              <el-button link type="primary" size="small" @click="copyText(activeSticker.meta?.prompt, '提示词')">
                复制提示词
              </el-button>
            </div>
            <div class="cs-prompt-content">
              {{ activeSticker.meta.prompt }}
            </div>
          </div>

          <!-- 提示词迭代记录 -->
          <div v-if="activeSticker.meta?.promptHistory?.length" class="cs-main-section">
            <div class="cs-main-head">
              <span class="cs-main-heading">提示词迭代记录 ({{ activeSticker.meta.promptHistory.length }})</span>
            </div>
            <div class="cs-history-box">
              <div
                v-for="(hPrompt, idx) in activeSticker.meta.promptHistory"
                :key="idx"
                class="cs-history-row"
              >
                <span class="cs-history-tag">步骤 #{{ idx + 1 }}</span>
                <span class="cs-history-val">{{ hPrompt }}</span>
                <el-button link size="small" @click="copyText(hPrompt, `步骤 #${idx + 1} 提示词`)">
                  复制
                </el-button>
              </div>
            </div>
          </div>

          <!-- 设计数据规范 JSON -->
          <div class="cs-main-section flex-fill-section">
            <div class="cs-main-head">
              <span class="cs-main-heading">完整设计数据规范 (JSON)</span>
              <el-button
                link
                type="primary"
                size="small"
                @click="copyText(JSON.stringify(activeSticker.meta || {}, null, 2), '完整设计 JSON')"
              >
                复制全部 JSON
              </el-button>
            </div>
            <pre class="cs-full-json-pre"><code>{{ JSON.stringify(activeSticker.meta || {}, null, 2) }}</code></pre>
          </div>
        </div>
      </div>
    </el-dialog>

    <!-- 发布到素材中心弹窗 -->
    <el-dialog v-model="publishVisible" :title="publishTargetIds.length > 1 ? `发布 ${publishTargetIds.length} 个自定义贴纸到素材中心` : '发布到素材中心'" width="460px" destroy-on-close>
      <el-form label-width="84px">
        <el-form-item label="分类"><el-input v-model="publishForm.category" placeholder="例如：精选自定义贴纸" /></el-form-item>
        <el-form-item label="发布说明"><el-input v-model="publishForm.description" type="textarea" :rows="3" placeholder="不填时使用作品描述" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="publishVisible = false">取消</el-button>
        <el-button type="primary" :loading="publishing" @click="publishCurrent">确认发布</el-button>
      </template>
    </el-dialog>

    <!-- 用户分发/共享弹窗（与素材库/图库完全一致的 UI 与架构） -->
    <el-dialog
      v-model="userTransferDialogVisible"
      :title="userTransferDialogTitle"
      width="560px"
      align-center
      :close-on-click-modal="false"
      @closed="resetUserTransferDialog"
    >
      <div class="sticker-user-transfer-dialog">
        <el-alert
          :title="userTransferActionAlertTitle"
          type="info"
          :closable="false"
          show-icon
        />
        <el-form label-width="96px" class="sticker-user-transfer-form">
          <el-form-item label="目标用户" required>
            <el-select
              v-model="userTransferTargetUserId"
              class="sticker-user-transfer-form__select"
              filterable
              clearable
              :loading="usersLoading"
              placeholder="请选择或搜索目标用户"
            >
              <el-option
                v-for="item in userOptions"
                :key="item.id"
                :label="item.label"
                :value="item.id"
              >
                <div class="sticker-user-transfer-option">
                  <div class="sticker-user-transfer-option__main">
                    <span>{{ item.name || item.account || `用户 #${item.id}` }}</span>
                    <el-tag v-if="item.isAdmin" size="small" type="warning">管理员</el-tag>
                  </div>
                  <span class="sticker-user-transfer-option__meta">
                    {{ item.account || `ID: ${item.id}` }}
                  </span>
                </div>
              </el-option>
            </el-select>
          </el-form-item>

          <el-form-item label="贴纸数量">
            <el-tag type="info">{{ userTransferIds.length }}</el-tag>
          </el-form-item>

          <el-form-item label="已选贴纸">
            <div class="sticker-user-transfer-preview">
              <el-tag v-for="item in userTransferPreviewItems" :key="item.id" size="small" effect="plain">
                {{ item.name || item.id }}
              </el-tag>
              <span v-if="userTransferIds.length > userTransferPreviewItems.length" class="sticker-user-transfer-preview__more">
                等共 {{ userTransferIds.length }} 项
              </span>
            </div>
          </el-form-item>
        </el-form>
      </div>

      <template #footer>
        <el-button @click="userTransferDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="userTransferSubmitting" @click="submitUserTransfer">
          {{ userTransferSubmitText }}
        </el-button>
      </template>
    </el-dialog>
  </ContentWrap>
</template>

<script setup lang="ts">
import { computed, nextTick, reactive, ref } from 'vue'
import dayjs from 'dayjs'
import {
  ArrowDown,
  Back,
  Close,
  CopyDocument,
  DArrowLeft,
  DArrowRight,
  Delete,
  Right,
  Search,
  Share,
  Upload,
  View,
} from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox, ElNotification } from 'element-plus'
import ContentWrap from '@/components/ContentWrap/src/ContentWrap.vue'
import ListPageLayout from '@/components/ListPageLayout/index.vue'
import Pagination from '@/components/Pagination/index.vue'
import FolderTree from '@/components/material/FolderTree.vue'
import TableRowDragHandle from '@/components/TableRowDragHandle/index.vue'
import { useFolderRowDrag } from '@/hooks/useFolderRowDrag'
import { buildOperationColumn, commonGridOptions } from '@/common/table'
import { getFastPreviewImageUrl } from '@/utils/image'
import { FOLDER_FILTER, convertFolderIdToApiParam } from '@/constants/folder'
import { useLocalStorage, useWindowSize } from '@vueuse/core'
import { CustomStickerApi, type CustomSticker, type CustomStickerTransferAction } from '@/api/custom-sticker'
import { getUserList } from '@/api/user'

const folderTreeCollapsed = useLocalStorage('custom_sticker_folder_collapsed', false)
const selectedFolderId = ref<string | null>(FOLDER_FILTER.ALL)
const { height } = useWindowSize()
const loading = ref(false)
const rows = ref<CustomSticker[]>([])
const total = ref(0)
const selectedIds = ref<string[]>([])
const activeSticker = ref<CustomSticker | null>(null)
const publishTargetIds = ref<string[]>([])

const detailVisible = ref(false)
const publishVisible = ref(false)
const publishing = ref(false)

// 分发/共享相关状态（与素材库、图库完全统一）
const userTransferAction = ref<CustomStickerTransferAction>('share')
const userTransferIds = ref<string[]>([])
const userTransferTargetUserId = ref('')
const userTransferDialogVisible = ref(false)
const userTransferSubmitting = ref(false)
const usersLoading = ref(false)
const usersLoaded = ref(false)
const userOptions = ref<{ id: string; name: string; account: string; label: string; isAdmin: boolean }[]>([])

const publishForm = reactive({ category: '自定义贴纸', description: '' })
const queryParams = reactive({
  page: 1,
  pageSize: 20,
  searchText: '',
  folderId: FOLDER_FILTER.ALL as string | null,
  shareState: 'all',
  importState: 'all',
})

const keywordList = computed(() => {
  const kw = activeSticker.value?.keywords || ''
  return String(kw).split(/[,，、\s]/).map((s) => s.trim()).filter(Boolean)
})

const userTransferDialogTitle = computed(() => {
  if (userTransferAction.value === 'share') return '快捷共享自定义贴纸给用户'
  if (userTransferAction.value === 'copy') return '复制自定义贴纸副本给用户'
  return '转移自定义贴纸所有权给用户'
})

const userTransferSubmitText = computed(() => {
  if (userTransferAction.value === 'share') return '确认快捷共享'
  if (userTransferAction.value === 'copy') return '确认复制'
  return '确认转移'
})

const userTransferActionAlertTitle = computed(() => {
  if (userTransferAction.value === 'share') {
    return '快捷共享将保留原作品文件，仅为目标用户创建设计视图与编辑引用。'
  }
  if (userTransferAction.value === 'copy') {
    return '复制副本将为目标用户完整克隆设计数据并独立拷贝一份云存储图片。'
  }
  return '转移所有权将把该自定义贴纸及其文件归属直接划转给目标用户。'
})

const userTransferPreviewItems = computed(() => {
  return rows.value
    .filter((item) => userTransferIds.value.includes(item.id))
    .slice(0, 8)
})

function formatUserName(user?: { name?: string; account?: string; id?: number } | null, fallbackId?: number | null) {
  if (user?.name && user?.account) {
    return `${user.name} (${user.account})`
  }
  if (user?.name) return user.name
  if (user?.account) return user.account
  if (fallbackId) return `用户 #${fallbackId}`
  return '-'
}

const gridOptions = computed(() => ({
  ...commonGridOptions,
  maxHeight: Math.max(height.value - 282, 360),
  rowConfig: { keyField: 'id' },
  checkboxConfig: { reserve: true },
  columns: [
    { title: '', field: 'dragHandle', width: 34, align: 'center', slots: { default: 'dragHandleSlot' } },
    { type: 'checkbox', width: 44, align: 'center', reserve: true },
    { title: '预览', width: 128, align: 'center', slots: { default: 'previewSlot' } },
    { title: '名称', minWidth: 180, slots: { default: 'nameSlot' } },
    { title: '文件夹', minWidth: 130, slots: { default: 'folderSlot' } },
    { title: '所属用户', width: 150, slots: { default: 'ownerSlot' } },
    { title: '素材库', width: 120, align: 'center', slots: { default: 'importSlot' } },
    { title: '素材中心', width: 100, align: 'center', slots: { default: 'shareSlot' } },
    { title: '最近更新', width: 164, slots: { default: 'timeSlot' } },
    buildOperationColumn('operationSlot'),
  ],
} as any))

const filteredRows = computed(() => rows.value.filter((row) => {
  if (queryParams.shareState === 'shared' && !row.isShared) return false
  if (queryParams.shareState === 'unshared' && row.isShared) return false
  if (queryParams.importState === 'imported' && !row.imported) return false
  if (queryParams.importState === 'not-imported' && row.imported) return false
  return true
}))

const {
  dragState,
  setupRowDrag,
  handleFolderDragOver,
  handleFolderDragLeave,
  resetAfterDrop,
  markExternalFolderDropHandled,
} = useFolderRowDrag({
  gridClass: 'custom-sticker-dnd-grid',
  dataSource: filteredRows,
  selectedIds,
  onDropToFolder: handleFolderDrop,
})

async function loadData() {
  loading.value = true
  try {
    const result = await CustomStickerApi.getAdminPage({
      page: queryParams.page,
      pageSize: queryParams.pageSize,
      searchText: queryParams.searchText || undefined,
      folderId: convertFolderIdToApiParam(queryParams.folderId),
    })
    rows.value = result?.items || []
    total.value = result?.total || 0
    selectedIds.value = []
    await nextTick()
    setupRowDrag()
  } catch (error: any) {
    ElMessage.error(error?.message || '获取自定义贴纸失败')
  } finally {
    loading.value = false
  }
}

async function loadUserOptions() {
  if (usersLoaded.value || usersLoading.value) return
  usersLoading.value = true
  try {
    const res: any = await getUserList({ currentPage: 1, pageSize: 1000 })
    const list = res?.list || res?.items || []
    userOptions.value = list.map((item: any) => ({
      id: String(item.id),
      name: String(item.name || '').trim(),
      account: String(item.account || '').trim(),
      label: item.name ? `${item.name} (${item.account || item.id})` : (item.account || `用户 #${item.id}`),
      isAdmin: !!item.isAdmin,
    }))
    usersLoaded.value = true
  } catch (error: any) {
    ElMessage.error(error?.message || '加载用户列表失败')
  } finally {
    usersLoading.value = false
  }
}

function resetUserTransferDialog() {
  userTransferSubmitting.value = false
  userTransferAction.value = 'share'
  userTransferIds.value = []
  userTransferTargetUserId.value = ''
}

async function openUserTransferDialog(action: CustomStickerTransferAction, row?: CustomSticker) {
  const targetIds = row
    ? [String(row.id)]
    : selectedIds.value.map(String).filter(Boolean)

  if (!targetIds.length) {
    ElMessage.warning('请选择要操作的自定义贴纸')
    return
  }

  userTransferAction.value = action
  userTransferIds.value = Array.from(new Set(targetIds))
  userTransferTargetUserId.value = ''
  await loadUserOptions()
  userTransferDialogVisible.value = true
}

async function submitUserTransfer() {
  if (!userTransferIds.value.length) {
    ElMessage.warning('请选择要操作的自定义贴纸')
    return
  }
  if (!userTransferTargetUserId.value) {
    ElMessage.warning('请选择目标用户')
    return
  }

  userTransferSubmitting.value = true
  const actionLabel =
    userTransferAction.value === 'share'
      ? '快捷共享'
      : userTransferAction.value === 'copy'
        ? '复制副本'
        : '转移所有权'

  try {
    const res = await CustomStickerApi.transferToUser({
      ids: userTransferIds.value,
      targetUserId: userTransferTargetUserId.value,
      action: userTransferAction.value,
    })

    const result = res || {}
    const successCount = Array.isArray(result?.list)
      ? result.list.length
      : Number(result?.total || 0)
    const failedCount = Array.isArray(result?.failed) ? result.failed.length : 0

    if (successCount > 0) {
      const failedText = failedCount ? `（${failedCount} 项失败）` : ''
      ElNotification.success(`已成功为目标用户完成 ${actionLabel} ${successCount} 项${failedText}`)
      userTransferDialogVisible.value = false
      selectedIds.value = []
      await loadData()
    } else if (failedCount > 0) {
      ElMessage.error(`${actionLabel}失败：${result.failed?.[0]?.message || '未知错误'}`)
    } else {
      ElMessage.warning('未处理任何数据')
    }
  } catch (error: any) {
    ElMessage.error(error?.message || `${actionLabel}失败`)
  } finally {
    userTransferSubmitting.value = false
  }
}

function handleSearch() { queryParams.page = 1; loadData() }
function handleReset() { queryParams.searchText = ''; queryParams.shareState = 'all'; queryParams.importState = 'all'; queryParams.page = 1; loadData() }
function handleFolderChange(payload: { folderId: string | null }) { queryParams.folderId = payload.folderId || FOLDER_FILTER.ALL; queryParams.page = 1; loadData() }
function handleCheckboxChange(event: any) { const records = Array.isArray(event.records) ? event.records : []; const reserves = Array.isArray(event.reserves) ? event.reserves : []; selectedIds.value = Array.from(new Set([...records, ...reserves].map((item: any) => String(item.id)))) }

async function handleFolderDrop(payload: { data: any }) {
  markExternalFolderDropHandled()
  if (!dragState.draggingIds.length) return
  if (payload.data.id === FOLDER_FILTER.ALL) return

  const movingIds = [...dragState.draggingIds]
  const targetFolderId = payload.data.id === FOLDER_FILTER.NOT_GROUP ? null : String(payload.data.id)
  try {
    await CustomStickerApi.batchMove({ ids: movingIds, folderId: targetFolderId })
    ElMessage.success(`已移动 ${movingIds.length} 个自定义贴纸到 ${payload.data.path || '未分组'}`)
    await loadData()
  } catch (error: any) {
    ElMessage.error(error?.message || '移动失败')
  } finally {
    resetAfterDrop()
  }
}

function openDetail(item: CustomSticker) {
  activeSticker.value = item
  detailVisible.value = true
}

function openPublish(item: CustomSticker) {
  activeSticker.value = item
  publishTargetIds.value = [item.id]
  publishForm.category = '自定义贴纸'
  publishForm.description = item.description || ''
  publishVisible.value = true
}

async function copyToLibrary(item: CustomSticker) {
  if (item.imported) {
    ElMessage.info('该自定义贴纸已复制到素材库')
    return
  }
  try {
    const res = await CustomStickerApi.copyToStickerLibrary({ customStickerId: item.id })
    const codeText = res?.code ? `（编码：${res.code}）` : ''
    ElMessage.success(`贴纸「${item.name || '未命名'}」已成功复制到素材库${codeText}`)
    item.imported = true
    if (res?.id) {
      item.importedStickerId = res.id
      item.importedSticker = res
    }
    if (activeSticker.value?.id === item.id) {
      activeSticker.value.imported = true
      if (res?.id) {
        activeSticker.value.importedStickerId = res.id
        activeSticker.value.importedSticker = res
      }
    }
    await loadData()
  } catch (error: any) {
    ElMessage.error(error?.message || '复制到素材库失败')
  }
}

function handleOperation(command: string, row: CustomSticker) {
  if (command === 'detail') openDetail(row)
  if (command === 'publish') openPublish(row)
  if (command === 'share') openUserTransferDialog('share', row)
  if (command === 'copy') openUserTransferDialog('copy', row)
  if (command === 'move') openUserTransferDialog('move', row)
  if (command === 'copyToLibrary') copyToLibrary(row)
  if (command === 'delete') handleDelete(row)
}

function openBatchPublish() {
  if (!selectedIds.value.length) return
  activeSticker.value = rows.value.find((item) => item.id === selectedIds.value[0]) || null
  publishTargetIds.value = rows.value.filter((item) => selectedIds.value.includes(item.id) && !item.isShared).map((item) => item.id)
  if (!publishTargetIds.value.length) return ElMessage.warning('选中的自定义贴纸都已发布')
  publishForm.category = '自定义贴纸'
  publishForm.description = ''
  publishVisible.value = true
}

async function publishCurrent() {
  if (!publishTargetIds.value.length) return
  publishing.value = true
  try {
    const results = await Promise.allSettled(
      publishTargetIds.value.map((customStickerId) =>
        CustomStickerApi.publishToResourceCenter({ customStickerId, ...publishForm }),
      ),
    )
    const failed = results.filter((result) => result.status === 'rejected').length
    if (failed) ElMessage.warning(`已发布 ${results.length - failed} 个，${failed} 个发布失败`)
    else ElMessage.success(`已发布 ${results.length} 个到素材中心`)
    publishVisible.value = false
    await loadData()
  } finally {
    publishing.value = false
  }
}

async function handleDelete(row?: CustomSticker | null) {
  const delIds = row ? [row.id] : [...selectedIds.value]
  if (!delIds.length) {
    return ElMessage.warning('请选择要删除的自定义贴纸')
  }
  const targetItems = rows.value.filter((item) => delIds.includes(item.id))
  // 检查是否已经发布到素材中心或已复制到素材库或属于共享副本
  const sharedItems = targetItems.filter((item) => item.isShared || item.imported || (item.sourceCustomStickerId && String(item.sourceCustomStickerId) !== String(item.id)))

  let confirmMsg = `确认删除选中的 ${delIds.length} 个自定义贴纸吗？删除后不可恢复。`
  if (sharedItems.length > 0) {
    const sampleNames = sharedItems.slice(0, 3).map((i) => `「${i.name || '未命名'}」`).join('、')
    const moreText = sharedItems.length > 3 ? ` 等共 ${sharedItems.length} 个作品` : ''
    confirmMsg = `选中的作品中包含已发布到素材中心或已复制到素材库的贴纸（如 ${sampleNames}${moreText}）。删除后该自定义贴纸记录将被移除，是否确认继续删除？`
  }

  try {
    await ElMessageBox.confirm(confirmMsg, '删除确认提示', {
      confirmButtonText: '确定删除',
      cancelButtonText: '取消',
      type: sharedItems.length > 0 ? 'warning' : 'error',
    })

    await CustomStickerApi.batchDelete({ ids: delIds })
    ElNotification.success(`已成功删除 ${delIds.length} 个自定义贴纸`)
    selectedIds.value = selectedIds.value.filter((id) => !delIds.includes(id))
    await loadData()
  } catch (error: any) {
    if (error === 'cancel' || error === 'close' || error?.action === 'cancel' || error?.action === 'close') return
    ElMessage.error(error?.message || '删除失败')
  }
}

function copyText(text?: string, label = '内容') {
  if (!text) return
  if (navigator?.clipboard?.writeText) {
    navigator.clipboard.writeText(text).then(() => {
      ElMessage.success(`已复制 ${label}`)
    }).catch(() => {
      fallbackCopy(text, label)
    })
  } else {
    fallbackCopy(text, label)
  }
}

function fallbackCopy(text: string, label: string) {
  const el = document.createElement('textarea')
  el.value = text
  document.body.appendChild(el)
  el.select()
  document.execCommand('copy')
  document.body.removeChild(el)
  ElMessage.success(`已复制 ${label}`)
}

function formatTime(value?: string | Date) {
  return value ? dayjs(value).format('YYYY-MM-DD HH:mm') : '-'
}

loadData()
</script>

<style scoped lang="scss">
.custom-sticker-page {
  min-height: 100%;
  padding: 8px 0 0;
  gap: 10px;

  :deep(.list-page-layout__body),
  :deep(.list-page-layout__main) {
    gap: 10px;
  }
}

.folder-sidebar-tree {
  min-height: 0;
}

.material-compact-preview {
  position: relative;
  display: inline-flex;
  width: 96px;
  height: 96px;
  overflow: hidden;
  background: var(--el-fill-color-lighter);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 6px;
  align-items: center;
  justify-content: center;
}

.material-compact-preview__image-wrap {
  display: flex;
  width: 100%;
  height: 100%;
  align-items: center;
  justify-content: center;
}

.material-compact-preview__image {
  display: block;
  width: 100%;
  height: 100%;
  cursor: zoom-in;
}

.name-cell {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 4px;

  &__title {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-weight: 500;
  }

  &__meta {
    color: var(--el-text-color-secondary);
    font-size: 12px;
  }
}

.owner-text {
  font-size: 13px;
  color: var(--el-text-color-primary);
  font-weight: 500;
}

.import-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;

  &__code {
    font-size: 11px;
    line-height: 1.2;
    color: var(--el-color-primary);
    background: var(--el-color-primary-light-9);
    padding: 1px 4px;
    border-radius: 4px;
    letter-spacing: 0.5px;
  }
}

/* ================== 用户分发/共享弹窗（与素材库/图库完全一致） ================== */
.sticker-user-transfer-dialog {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.sticker-user-transfer-form {
  margin-top: 4px;
}

.sticker-user-transfer-form__select {
  width: 100%;
}

.sticker-user-transfer-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
}

.sticker-user-transfer-option__main {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  color: var(--el-text-color-primary);
}

.sticker-user-transfer-option__meta {
  flex-shrink: 0;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.sticker-user-transfer-preview {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.sticker-user-transfer-preview__more {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  line-height: 24px;
}

/* ================== 极简纯信息全屏详情 ================== */
:deep(.cs-info-dialog.el-dialog.is-fullscreen) {
  display: flex;
  flex-direction: column;
  padding: 0;
  background: var(--el-bg-color);
  overflow: hidden;

  .el-dialog__header {
    padding: 0;
    margin: 0;
    border-bottom: 1px solid var(--el-border-color-lighter);
  }

  .el-dialog__body {
    flex: 1;
    padding: 0;
    overflow: hidden;
  }
}

.cs-info-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 48px;
  padding: 0 20px;
  background: var(--el-bg-color);
}

.cs-info-back {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: none;
  background: transparent;
  color: var(--el-text-color-regular);
  font-size: 13px;
  cursor: pointer;
  padding: 4px 6px;
  border-radius: 4px;

  &:hover {
    color: var(--el-color-primary);
  }
}

.cs-info-nav-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--el-text-color-secondary);
}

.cs-info-close {
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  color: var(--el-text-color-secondary);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  cursor: pointer;

  &:hover {
    background: var(--el-fill-color-light);
    color: var(--el-text-color-primary);
  }
}

/* 双栏布局：左侧信息栏 (400px)，右侧核心数据区 (自适应撑满) */
.cs-info-layout {
  display: grid;
  grid-template-columns: 400px 1fr;
  height: 100%;
  overflow: hidden;
  background: var(--el-bg-color);
}

/* 左侧：图片 + 元数据面板 */
.cs-sidebar-panel {
  padding: 24px;
  border-right: 1px solid var(--el-border-color-lighter);
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
  background: var(--el-bg-color);
}

.cs-sidebar-img-box {
  width: 100%;
  height: 260px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--el-fill-color-light);
  border-radius: 8px;
  padding: 16px;
}

.cs-sidebar-img {
  max-width: 100%;
  max-height: 100%;
}

.cs-sidebar-specs {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.cs-sidebar-meta-block {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.cs-sidebar-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  margin: 0;
  line-height: 1.4;
}

.cs-sidebar-tags {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}

.cs-sidebar-desc {
  font-size: 13px;
  color: var(--el-text-color-regular);
  line-height: 1.6;
}

.cs-sidebar-keywords {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.cs-sidebar-kw {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  background: var(--el-fill-color-light);
  padding: 2px 8px;
  border-radius: 4px;
  line-height: 1.4;
  user-select: none;
}

/* 扁平属性表格 */
.cs-sidebar-table {
  display: flex;
  flex-direction: column;
  border-top: 1px solid var(--el-border-color-lighter);
  padding-top: 6px;
}

.cs-sidebar-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid var(--el-border-color-lighter);

  &:last-child {
    border-bottom: none;
  }

  .label {
    font-size: 12px;
    color: var(--el-text-color-secondary);
    flex-shrink: 0;
  }

  .value {
    font-size: 13px;
    color: var(--el-text-color-primary);
    font-weight: 500;
    text-align: right;

    &.mono {
      font-family: monospace;
      font-size: 12px;
    }

    &.copyable {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      cursor: pointer;

      &:hover {
        color: var(--el-color-primary);
      }
    }
  }
}

/* 右侧：核心数据区 */
.cs-main-panel {
  padding: 28px 36px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 24px;
  background: var(--el-bg-color);
}

.cs-main-section {
  display: flex;
  flex-direction: column;
  gap: 10px;

  &.flex-fill-section {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 300px;
  }
}

.cs-main-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.cs-main-heading {
  font-size: 13px;
  font-weight: 600;
  color: var(--el-text-color-regular);
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.cs-prompt-content {
  background: var(--el-fill-color-light);
  padding: 14px 18px;
  border-radius: 6px;
  font-size: 13px;
  line-height: 1.6;
  color: var(--el-text-color-primary);
  white-space: pre-wrap;
  word-break: break-word;
}

.cs-history-box {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.cs-history-row {
  display: flex;
  align-items: center;
  gap: 10px;
  background: var(--el-fill-color-light);
  padding: 8px 12px;
  border-radius: 4px;
}

.cs-history-tag {
  font-size: 11px;
  font-weight: 600;
  color: var(--el-color-primary);
  background: var(--el-color-primary-light-8);
  padding: 1px 5px;
  border-radius: 3px;
  flex-shrink: 0;
}

.cs-history-val {
  flex: 1;
  font-size: 12px;
  color: var(--el-text-color-regular);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cs-full-json-pre {
  margin: 0;
  padding: 16px 20px;
  border-radius: 6px;
  font-family: monospace;
  font-size: 12px;
  line-height: 1.5;
  background: #18181b;
  color: #a7f3d0;
  overflow: auto;
  flex: 1;
  max-height: calc(100vh - 280px);
}

@media (max-width: 900px) {
  .cs-info-layout {
    grid-template-columns: 1fr;
    overflow-y: auto;
  }

  .cs-sidebar-panel {
    border-right: none;
    border-bottom: 1px solid var(--el-border-color-lighter);
  }

  .cs-main-panel {
    padding: 20px;
  }
}
</style>
