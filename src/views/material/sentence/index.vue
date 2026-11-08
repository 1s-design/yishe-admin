<template>
  <ContentWrap :plain="true">
    <ListPageLayout
      class="sentence-page"
      :sidebar-width="folderTreeCollapsed ? '28px' : '280px'"
    >
      <template #filter>
        <div class="list-page-filter list-page-filter--flat">
          <el-form :model="queryParams" label-position="top" class="list-page-search-form">
            <el-row :gutter="12" class="list-page-search-form__row">
              <el-col class="list-page-search-form__col--wide" :xs="24" :sm="12" :md="8" :lg="6" :xl="5">
                <el-form-item label="搜索">
                  <el-input
                    v-model="queryParams.search"
                    size="small"
                    placeholder="搜索内容/描述/关键词（情感、风格、场景都在这里）"
                    clearable
                    @keyup.enter="handleSearch"
                    @clear="handleSearch"
                  >
                    <template #prefix>
                      <el-icon><Search /></el-icon>
                    </template>
                  </el-input>
                </el-form-item>
              </el-col>
              <el-col class="list-page-search-form__col--narrow" :xs="12" :sm="8" :md="5" :lg="4" :xl="3">
                <el-form-item label="语言">
                  <el-select v-model="queryParams.language" size="small" placeholder="全部" clearable @change="handleSearch">
                    <el-option v-for="opt in languageOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col class="list-page-search-form__col--narrow" :xs="12" :sm="8" :md="5" :lg="4" :xl="3">
                <el-form-item label="审核状态">
                  <el-select v-model="queryParams.reviewStatus" size="small" placeholder="全部" clearable @change="handleSearch">
                    <el-option label="待审核" :value="0" />
                    <el-option label="可用" :value="1" />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col class="list-page-search-form__col--narrow" :xs="12" :sm="8" :md="6" :lg="5" :xl="4">
                <el-form-item label="文字数">
                  <el-popover
                    ref="lengthPopperRef"
                    placement="bottom-start"
                    :width="304"
                    trigger="click"
                    popper-class="length-picker-popper"
                  >
                    <template #reference>
                      <el-button size="small" class="length-trigger" :class="{ 'is-active': lengthActive }">
                        <span class="length-trigger__text">{{ lengthLabel }}</span>
                        <el-icon class="length-trigger__arrow"><ArrowDown /></el-icon>
                      </el-button>
                    </template>
                    <div class="length-picker">
                      <div class="length-picker__section">
                        <span class="length-picker__title">常用区间</span>
                        <div class="length-picker__chips">
                          <button
                            v-for="opt in LENGTH_RANGES"
                            :key="opt.key"
                            type="button"
                            class="length-chip"
                            :class="{ 'is-active': lengthFilter.key === opt.key }"
                            @click="pickLength(opt)"
                          >
                            {{ opt.label }}
                          </button>
                        </div>
                      </div>
                      <div class="length-picker__section">
                        <span class="length-picker__title">精确字数</span>
                        <div class="length-picker__chips">
                          <button
                            v-for="n in [4, 5, 6, 7, 8]"
                            :key="'exact' + n"
                            type="button"
                            class="length-chip"
                            :class="{ 'is-active': lengthFilter.exact === n }"
                            @click="pickLength({ key: 'exact' + n, exact: n })"
                          >
                            {{ n }} 字
                          </button>
                        </div>
                      </div>
                      <div class="length-picker__section">
                        <span class="length-picker__title">自定义</span>
                        <div class="length-picker__custom">
                          <el-input-number
                            v-model="customMin"
                            size="small"
                            :min="1"
                            :max="300"
                            :controls="false"
                            placeholder="最小"
                            class="length-num"
                          />
                          <span class="length-picker__tilde">~</span>
                          <el-input-number
                            v-model="customMax"
                            size="small"
                            :min="1"
                            :max="300"
                            :controls="false"
                            placeholder="最大"
                            class="length-num"
                          />
                          <el-button size="small" type="primary" @click="applyCustomLength">应用</el-button>
                        </div>
                      </div>
                    </div>
                  </el-popover>
                </el-form-item>
              </el-col>
            </el-row>
            <div class="list-page-search-form__actions">
              <el-button size="small" type="primary" :icon="Search" :loading="loading" @click="handleSearch">搜索</el-button>
              <el-button size="small" :disabled="loading" @click="handleReset">
                重置<template v-if="activeFilterCount">（{{ activeFilterCount }}）</template>
              </el-button>
              <el-button size="small" type="primary" :icon="Plus" @click="handleAdd">添加句子</el-button>
              <el-button
                size="small"
                class="quick-review-btn"
                :icon="Aim"
                title="全屏逐条审核：通过 / 删除 / 忽略"
                @click="quickReviewVisible = true"
              >
                快捷审核<template v-if="pendingCount">（待审 {{ pendingCount }}）</template>
              </el-button>
              <transition name="el-fade-in">
                <span v-if="ids.length" class="selection-actions">
                  <el-button
                    size="small"
                    type="success"
                    @click="openSentenceUserTransferDialog('share')"
                  >
                    分享 ({{ ids.length }})
                  </el-button>
                  <el-button
                    size="small"
                    type="success"
                    :icon="Check"
                    :loading="batchReviewLoading"
                    @click="handleBatchReview"
                  >
                    通过 ({{ ids.length }})
                  </el-button>
                  <el-button
                    size="small"
                    type="danger"
                    :icon="Delete"
                    :loading="deleteLoading"
                    @click="handleDelete(null)"
                  >
                    删除 ({{ ids.length }})
                  </el-button>
                </span>
              </transition>
            </div>
          </el-form>
        </div>
      </template>

      <template #sidebar>
        <div
          class="list-page-panel list-page-panel--flat list-page-sidebar sentence-sidebar folder-sidebar-shell"
        >
          <div class="list-page-sidebar__body folder-sidebar-body">
            <div v-show="!folderTreeCollapsed" class="folder-sidebar-tree">
              <FolderTree
                v-model="selectedFolderId"
                width="100%"
                :folder-category="FOLDER_CATEGORY"
                :show-count="false"
                :drag-state="dragState"
                @change="handleFolderChange"
                @folder-drag-over="handleFolderDragOver"
                @folder-drag-leave="handleFolderDragLeave"
                @folder-drop="handleFolderDrop"
              />
            </div>
          </div>
          <button
            type="button"
            class="folder-sidebar-toggle"
            @click="folderTreeCollapsed = !folderTreeCollapsed"
          >
            <el-icon :size="14">
              <DArrowRight v-if="folderTreeCollapsed" />
              <DArrowLeft v-else />
            </el-icon>
          </button>
        </div>
      </template>

      <template #table>
        <div class="list-page-panel list-page-panel--flat list-page-table-panel list-page-table-panel--flat">
          <div class="list-page-table-panel__body">
            <div class="common-table">
      <vxe-grid
        class="sentence-dnd-grid dnd-text-selectable"
        v-bind="gridOptions"
        :max-height="gridOptions.maxHeight"
        :data="dataSource"
        :loading="loading"
        @checkbox-change="checkboxChange"
        @checkbox-all="checkboxAllChange"
      >
        <template #dragHandleSlot>
          <TableRowDragHandle />
        </template>
        <template #operationDefaultSlot="{ row }">
          <div class="flex items-center">
            <el-dropdown
              trigger="click"
              @command="(command) => handleOperationCommand(command, row)"
              class="operation-dropdown"
            >
              <el-button type="primary" link size="small" class="operation-trigger-button">操作</el-button>
              <template #dropdown>
                <el-dropdown-menu class="operation-menu-compact">
                  <el-dropdown-item command="detail">
                    <el-icon><View /></el-icon>
                    <span>详情</span>
                  </el-dropdown-item>
                  <el-dropdown-item command="edit">
                    <el-icon><Edit /></el-icon>
                    <span>编辑</span>
                  </el-dropdown-item>
                  <el-dropdown-item command="ai-analyze" :disabled="aiTableLoading?.[row?.id]">
                    <el-icon><MagicStick /></el-icon>
                    <span>AI分析</span>
                    <el-icon v-if="aiTableLoading?.[row?.id]" class="is-loading ml-1"><Loading /></el-icon>
                  </el-dropdown-item>
                  <el-dropdown-item command="share-to-user">
                    <el-icon><Share /></el-icon>
                    <span>分享给用户</span>
                  </el-dropdown-item>
                  <el-dropdown-item v-if="isAdmin" command="move-to-user">
                    <el-icon><User /></el-icon>
                    <span>转移给用户</span>
                  </el-dropdown-item>
                  <el-dropdown-item command="view-shared">
                    <el-icon><Connection /></el-icon>
                    <span>查看分享</span>
                  </el-dropdown-item>
                  <el-dropdown-item command="review-approve">
                    <el-icon><Check /></el-icon>
                    <span>通过审核</span>
                  </el-dropdown-item>
                  <el-dropdown-item command="delete" divided class="operation-menu-item--danger">
                    <el-icon><Delete /></el-icon>
                    <span>删除</span>
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
            <el-icon
              v-if="aiTableLoading?.[row?.id]"
              class="is-loading ml-2"
              style=" font-size: 18px;color: var(--el-color-primary)"
            />
          </div>
        </template>
        <template #contentSlot="{ row }">
          <div
            class="sentence-content flex items-center gap-1.5 cursor-pointer hover:text-[var(--el-color-primary)]"
            :class="{ 'sentence-content--collapsed': contentCollapsed }"
            title="点击查看详情"
            @click="openDetail(row)"
          >
            <span>{{ row.content }}</span>
          </div>
        </template>
        <template #contentHeaderSlot>
          <div class="flex items-center gap-1">
            <span>句子内容</span>
            <el-switch
              v-model="contentCollapsed"
              size="small"
              inline-prompt
              active-text="展开"
              inactive-text="折叠"
              class="sentence-content-switch"
            />
          </div>
        </template>

        <template #reviewStatusSlot="{ row }">
          <el-tag
            :type="row.reviewStatus === 1 ? 'success' : 'warning'"
            size="small"
            effect="light"
            class="sentence-review-tag"
            :title="row.reviewStatus === 1 ? '可用' : '待审核，点击详情可快速审核'"
          >
            {{ row.reviewStatus === 1 ? "可用" : "待审核" }}
          </el-tag>
        </template>
        <template #createdAtSlot="{ row }">
          <span>{{ formatDateTime(row.createdAt) }}</span>
        </template>
        <template #updatedAtSlot="{ row }">
          <span>{{ formatDateTime(row.updatedAt) }}</span>
        </template>
      </vxe-grid>
            </div>
          </div>
        </div>
      </template>

      <template #pagination>
        <div class="list-page-panel list-page-panel--flat list-page-table-panel__pagination list-page-table-panel__pagination--flat">
          <pagination
            :total="total"
            v-model:page="queryParams.currentPage"
            v-model:limit="queryParams.pageSize"
            @pagination="getList"
          />
        </div>
      </template>
    </ListPageLayout>

    <!-- AI分析句子弹窗 -->
    <el-dialog
      v-model="aiAnalyzeDialogVisible"
      title="AI分析句子"
      width="500px"
      align-center
      :destroy-on-close="true"
    >
      <div style="margin-bottom: 16px; font-size: 15px; color: #888">
        请输入你希望AI分析的角度或要求（可选，留空则使用默认分析标准）
      </div>
      <el-input
        v-model="aiAnalyzePrompt"
        type="textarea"
        :rows="4"
        placeholder="如：请重点关注句子的情感色彩和主题..."
        style=" width: 100%; min-height: 100px;font-size: 16px; resize: vertical"
      />
      <template #footer>
        <el-button @click="aiAnalyzeDialogVisible = false">取消</el-button>
        <el-button
          type="primary"
          :loading="aiAnalyzeLoading"
          @click="submitAiAnalyzeDialog"
          >确定</el-button
        >
      </template>
    </el-dialog>

    <el-dialog
      :title="dialogTitle"
      v-model="dialogVisible"
      width="900px"
      @close="dialogClose"
      align-center
    >
      <el-form :model="form" :rules="rules" ref="formRef" label-width="100px">
        <el-row>
          <el-col :span="24">
            <el-form-item label="句子内容" prop="content">
              <el-input
                v-model="form.content"
                type="textarea"
                :rows="10"
                placeholder="请输入句子内容"
                maxlength="5000"
                show-word-limit
              />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="描述" prop="description">
              <el-input
                v-model="form.description"
                type="textarea"
                :rows="4"
                placeholder="请输入描述（可选）"
                maxlength="1000"
                show-word-limit
              />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="关键词" prop="keywords">
              <el-input
                v-model="form.keywords"
                type="textarea"
                :rows="3"
                placeholder="请输入关键词，多个关键词用逗号分隔（可选）"
                maxlength="500"
                show-word-limit
              />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitForm" :loading="submitLoading"
          >确定</el-button
        >
      </template>
    </el-dialog>

    <!-- 用户转移 / 资源分享弹窗 -->
    <el-dialog
      v-model="sentenceUserTransferDialogVisible"
      :title="sentenceUserTransferDialogTitle"
      width="520px"
      align-center
      :close-on-click-modal="false"
      @closed="resetSentenceUserTransferDialog"
    >
      <div class="sticker-user-transfer-dialog">



        <el-form label-width="96px" class="sticker-user-transfer-form mt-4">
          <el-form-item label="目标用户" required>
            <el-select
              v-model="sentenceUserTransferTargetUserId"
              class="sticker-user-transfer-form__select w-full"
              filterable
              clearable
              :loading="sentenceUserTransferUsersLoading"
              placeholder="请选择目标用户"
            >
              <el-option
                v-for="item in sentenceUserTransferUserOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </el-select>
          </el-form-item>

          <el-form-item label="已选例句">
            <div class="sticker-user-transfer-selected-count">
              共选定
              <el-tag type="info">{{ sentenceUserTransferIds.length }}</el-tag>
              条资源
            </div>
          </el-form-item>
        </el-form>
      </div>

      <template #footer>
        <el-button @click="sentenceUserTransferDialogVisible = false">取消</el-button>
        <el-button
          type="primary"
          :loading="sentenceUserTransferSubmitting"
          @click="submitSentenceUserTransfer"
        >
          {{ sentenceUserTransferSubmitText }}
        </el-button>
      </template>
    </el-dialog>

    <!-- 查看分享记录弹窗 -->
    <el-dialog
      v-model="shareRecordsDialogVisible"
      :title="`分享记录 - ${shareRecordsResourceName}`"
      width="600px"
      destroy-on-close
    >
      <div v-loading="shareRecordsLoading">
        <el-empty v-if="!shareRecordsLoading && shareRecordsList.length === 0" description="暂无分享记录" />
        <el-table v-else :data="shareRecordsList" style="width: 100%">
          <el-table-column prop="userName" label="分享给" min-width="120">
            <template #default="{ row }">
              <span>{{ row.userName || row.userId }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="shareType" label="分享类型" width="120">
            <template #default="{ row }">
              <el-tag v-if="row.shareType === 'shared'" type="warning" size="small" effect="light">快捷共享</el-tag>
              <el-tag v-else-if="row.shareType === 'copy'" type="success" size="small" effect="light">物理副本</el-tag>
              <el-tag v-else type="info" size="small" effect="plain">{{ row.shareType || '-' }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="createTime" label="分享时间" width="180">
            <template #default="{ row }">
              {{ formatTimestamp(row.createTime) }}
            </template>
          </el-table-column>
        </el-table>
      </div>
    </el-dialog>

    <!-- 文案详情弹窗：极简，完整信息按需加载 -->
    <el-dialog
      v-model="detailVisible"
      width="560px"
      append-to-body
      destroy-on-close
      align-center
      class="sentence-detail-dialog"
    >
      <template #header><span /></template>
      <div v-loading="detailLoading" class="sentence-detail">
        <template v-if="detail">
          <div class="sentence-detail__content">{{ detail.content }}</div>
          <div v-if="detail.description" class="sentence-detail__text">{{ detail.description }}</div>
          <div v-if="detailKeywords.length" class="sentence-detail__tags">
            <el-tag v-for="k in detailKeywords" :key="k" size="small" effect="plain">{{ k }}</el-tag>
          </div>
          <div class="sentence-detail__meta">
            <span>{{ detailLanguageLabel }}</span>
            <span class="sentence-detail__dot">·</span>
            <span>{{ detail.content ? Array.from(detail.content).length : 0 }} 字</span>
            <span class="sentence-detail__dot">·</span>
            <el-tag :type="detail.reviewStatus === 1 ? 'success' : 'warning'" size="small" effect="light">
              {{ detail.reviewStatus === 1 ? "可用" : "待审核" }}
            </el-tag>
            <el-tag :type="detail.isPublish ? 'success' : 'info'" size="small" effect="light">
              {{ detail.isPublish ? "已发布" : "未发布" }}
            </el-tag>
            <template v-if="typeof detail.meta?.copyrightFree === 'boolean'">
              <el-tag :type="detail.meta.copyrightFree ? 'success' : 'danger'" size="small" effect="light">
                {{ detail.meta.copyrightFree ? "可商用" : "注意版权" }}
              </el-tag>
            </template>
            <span class="sentence-detail__time">{{ formatDateTime(detail.updatedAt) }}</span>
          </div>
          <div v-if="detail.meta?.author || detail.meta?.source" class="sentence-detail__extra">
            <span v-if="detail.meta?.author">作者：{{ detail.meta.author }}</span>
            <span v-if="detail.meta?.author && detail.meta?.source" class="sentence-detail__dot">·</span>
            <span v-if="detail.meta?.source">出处：{{ detail.meta.source }}</span>
          </div>
        </template>
      </div>
    </el-dialog>

    <!-- 快捷审核（全屏逐条：通过 / 删除 / 忽略，参考采集素材模块） -->
    <SentenceQuickReview
      v-model:visible="quickReviewVisible"
      :query="quickReviewQuery"
      @reviewed="getList"
    />
  </ContentWrap>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, watchEffect, nextTick } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import {
  Search,
  Delete,
  Plus,
  Check,
  View,
  MagicStick,
  Edit,
  Loading,
  Aim,
  DArrowLeft,
  DArrowRight,
  ArrowDown,
  Share,
  User,
  Connection,
} from "@element-plus/icons-vue";
import {
  getSentenceList,
  searchSentences,
  getSentence,
  createSentence,
  updateSentence,
  deleteSentence,
  aiAnalyzeSentence,
  batchMoveSentence,
  batchReviewSentences,
  shareSentenceToUser,
  copySentenceToUser,
  moveSentenceToUser,
  getSentenceSharedRecords,
} from "@/api/sentence";
import { formatTimestamp } from "@/common/date";
import { getUserList } from "@/api/user";
import { buildOperationColumn, commonGridOptions } from "@/common/table";
import ContentWrap from "@/components/ContentWrap/src/ContentWrap.vue";
import Pagination from "@/components/Pagination/index.vue";
import ListPageLayout from "@/components/ListPageLayout/index.vue";
import FolderTree from "@/components/material/FolderTree.vue";
import TableRowDragHandle from "@/components/TableRowDragHandle/index.vue";
import SentenceQuickReview from "./SentenceQuickReview.vue";
import { useWindowSize, useLocalStorage } from "@vueuse/core";
import { useUserStore } from "@/store/modules/user";
import { computed } from "vue";
import { useFolderRowDrag } from "@/hooks/useFolderRowDrag";
import { FOLDER_FILTER, convertFolderIdToApiParam } from "@/constants/folder";

const FOLDER_CATEGORY = "sentence";
const folderTreeCollapsed = useLocalStorage("sentence_folder_collapsed", false);
const selectedFolderId = ref<string | null>("__all__");

const userStore = useUserStore();
const isAdmin = computed(() => userStore.user?.isAdmin ?? false);
const { height } = useWindowSize();

const queryParams = reactive({
  currentPage: 1,
  pageSize: 20,
  search: "",
  folderId: null as string | null,
  language: "" as string,
  reviewStatus: "" as string | number,
});

// 文字数筛选：常用档位点选 / 精确字数 / 自定义区间（面板里完成，不用记语法）
type LengthFilter = { key: string; exact?: number; min?: number; max?: number };

const LENGTH_RANGES: Array<{ key: string; label: string; min?: number; max?: number }> = [
  { key: "all", label: "不限" },
  { key: "r1_4", label: "1-4 字", min: 1, max: 4 },
  { key: "r5_8", label: "5-8 字", min: 5, max: 8 },
  { key: "r9_16", label: "9-16 字", min: 9, max: 16 },
  { key: "r17_30", label: "17-30 字", min: 17, max: 30 },
  { key: "r31", label: "30 字以上", min: 31 },
];

const lengthFilter = reactive<LengthFilter>({ key: "all" });
const customMin = ref<number | undefined>(undefined);
const customMax = ref<number | undefined>(undefined);
const lengthPopperRef = ref<any>(null);

const lengthActive = computed(
  () => lengthFilter.key !== "all" || !!(lengthFilter.exact || lengthFilter.min || lengthFilter.max),
);

const lengthLabel = computed(() => {
  if (lengthFilter.exact) return `正好 ${lengthFilter.exact} 字`;
  if (lengthFilter.min && lengthFilter.max) return `${lengthFilter.min}-${lengthFilter.max} 字`;
  if (lengthFilter.min) return `≥ ${lengthFilter.min} 字`;
  if (lengthFilter.max) return `≤ ${lengthFilter.max} 字`;
  return "不限";
});

/** 当前生效的筛选条件数（重置按钮角标） */
const activeFilterCount = computed(() => {
  let n = 0;
  if (queryParams.search) n += 1;
  if (queryParams.language) n += 1;
  if (
    queryParams.reviewStatus !== "" &&
    queryParams.reviewStatus !== null &&
    queryParams.reviewStatus !== undefined
  ) {
    n += 1;
  }
  if (lengthActive.value) n += 1;
  return n;
});

function closeLengthPicker() {
  lengthPopperRef.value?.hide?.();
}

function pickLength(opt: { key: string; exact?: number; min?: number; max?: number }) {
  lengthFilter.key = opt.key;
  lengthFilter.exact = opt.exact;
  lengthFilter.min = opt.min;
  lengthFilter.max = opt.max;
  customMin.value = opt.exact ?? opt.min;
  customMax.value = opt.exact ?? opt.max;
  closeLengthPicker();
  handleSearch();
}

function applyCustomLength() {
  const min = customMin.value ? Number(customMin.value) : undefined;
  const max = customMax.value ? Number(customMax.value) : undefined;
  if (!min && !max) {
    ElMessage.warning("至少填一个字数");
    return;
  }
  if (min && max && min > max) {
    ElMessage.warning("最小值不能大于最大值");
    return;
  }
  lengthFilter.key = "custom";
  lengthFilter.exact = min && max && min === max ? min : undefined;
  lengthFilter.min = min;
  lengthFilter.max = max;
  closeLengthPicker();
  handleSearch();
}

function resetLengthFilter() {
  lengthFilter.key = "all";
  lengthFilter.exact = undefined;
  lengthFilter.min = undefined;
  lengthFilter.max = undefined;
  customMin.value = undefined;
  customMax.value = undefined;
}

const languageOptions = [
  { value: "zh", label: "中文" },
  { value: "en", label: "英文" },
  { value: "ja", label: "日文" },
  { value: "ko", label: "韩文" },
  { value: "mixed", label: "中英混合" },
];

// 详情弹窗（完整信息按需加载，列表只拿 basic 字段）
const detailVisible = ref(false);
const detailLoading = ref(false);
const detail = ref<any>(null);
const detailKeywords = computed(() =>
  (detail.value?.keywords || "")
    .split(/[,，]/)
    .map((k: string) => k.trim())
    .filter(Boolean),
);
const detailLanguageLabel = computed(
  () => languageOptions.find((o) => o.value === detail.value?.language)?.label || detail.value?.language || "-",
);

async function openDetail(row: any) {
  detail.value = row;
  detailVisible.value = true;
  detailLoading.value = true;
  try {
    const res = await getSentence(row.id);
    detail.value = res || row;
  } catch (e: any) {
    ElMessage.error(e?.message || "获取详情失败");
  } finally {
    detailLoading.value = false;
  }
}

// ==========================================================================
// 快捷审核：全屏接管式（SentenceQuickReview 组件），两状态 0-待审核 1-可用
// 舞台内快捷键：→/D=通过  ↓/S=删除  ←/A=忽略  Z=撤回删除  Esc=退出
// ==========================================================================
const quickReviewVisible = ref(false);
const batchReviewLoading = ref(false);

/** 列表当前待审核条数（工具栏按钮角标） */
const pendingCount = computed(
  () => (dataSource.value as any[]).filter((row: any) => row.reviewStatus !== 1).length,
);

/** 沿用列表当前筛选条件（去掉分页，组件内固定只取待审核） */
const quickReviewQuery = computed(() => {
  const rest: Record<string, any> = {
    keyword: queryParams.search || undefined,
    language: queryParams.language || undefined,
    length: lengthFilter.exact,
    minLength: lengthFilter.min,
    maxLength: lengthFilter.max,
    folderId: convertFolderIdToApiParam(queryParams.folderId),
  };
  return Object.fromEntries(
    Object.entries(rest).filter(([, v]) => v !== undefined && v !== null && v !== ""),
  );
});

function markRowReviewed(rowId: any, status: number) {
  const row = (dataSource.value as any[]).find((item: any) => String(item.id) === String(rowId));
  if (row) row.reviewStatus = status;
}

/** 单条通过（操作菜单「通过审核」用） */
async function quickReview(status: number, row: any) {
  if (!row) return;
  try {
    await batchReviewSentences({ ids: [Number(row.id)], reviewStatus: status });
    markRowReviewed(row.id, status);
    ElMessage.success("已通过审核");
  } catch (e: any) {
    ElMessage.error(e?.message || "审核失败");
  }
}

/** 批量通过选中项 */
async function handleBatchReview() {
  if (!ids.value.length) return ElMessage.warning("请选择要通过的数据");
  batchReviewLoading.value = true;
  try {
    const count = ids.value.length;
    await batchReviewSentences({ ids: [...ids.value], reviewStatus: 1 });
    ids.value.forEach((id: any) => markRowReviewed(id, 1));
    ids.value = [];
    ElMessage.success(`已通过 ${count} 条`);
  } catch (e: any) {
    ElMessage.error(e?.message || "批量审核失败");
  } finally {
    batchReviewLoading.value = false;
  }
}



const gridOptions = ref({
  ...commonGridOptions,
  maxHeight: Math.max(height.value - 280, 360),
  rowConfig: { keyField: "id" },
  checkboxConfig: { reserve: true },
  columns: [
    {
      title: "",
      field: "dragHandle",
      width: 34,
      showOverflow: false,
      align: "center",
      slots: { default: "dragHandleSlot" },
    },
    { type: "checkbox", width: 42, ellipsis: true, reserve: true },
    {
      title: "句子内容",
      field: "content",
      minWidth: 500,
      slots: { default: "contentSlot", header: "contentHeaderSlot" },
    },
    {
      title: "字数",
      field: "contentLength",
      width: 64,
      align: "center",
      formatter: ({ row }) => (row?.content ? Array.from(row.content).length : "-"),
    },
    {
      title: "语言",
      field: "language",
      width: 70,
      align: "center",
      formatter: ({ row }) => languageOptions.find((o) => o.value === row?.language)?.label || "-",
    },
    {
      title: "审核",
      field: "reviewStatus",
      width: 76,
      align: "center",
      slots: { default: "reviewStatusSlot" },
    },
    {
      title: "更新时间",
      field: "updatedAt",
      width: 160,
      slots: { default: "updatedAtSlot" },
    },
    buildOperationColumn("operationDefaultSlot"),
  ],
} as any);

watchEffect(() => {
  gridOptions.value.maxHeight = Math.max(height.value - 280, 360);
});

const dataSource = ref([]);
const loading = ref(false);
const ids = ref([]);
const total = ref(0);
const formRef = ref();
const dialogTitle = ref("");
const dialogVisible = ref(false);
const isEdit = ref(false);
const form = ref({
  content: "",
  description: "",
  keywords: "",
});
const submitLoading = ref(false);
const deleteLoading = ref(false);
const editId = ref<string | null>(null);

// 拖拽状态（拖文案 -> 文件夹）
const {
  dragState,
  setupRowDrag,
  handleFolderDragOver,
  handleFolderDragLeave,
  resetAfterDrop,
  markExternalFolderDropHandled,
} = useFolderRowDrag({
  gridClass: "sentence-dnd-grid",
  dataSource,
  selectedIds: ids,
  onDropToFolder: handleFolderDrop,
});

// 查看分享记录
const shareRecordsDialogVisible = ref(false);
const shareRecordsLoading = ref(false);
const shareRecordsList = ref<any[]>([]);
const shareRecordsTotal = ref(0);
const shareRecordsResourceName = ref('');

// AI分析相关
const aiAnalyzeDialogVisible = ref(false);
const aiAnalyzePrompt = ref("");
const aiAnalyzeLoading = ref(false);
const aiTableLoading = ref<Record<string, boolean>>({});
let aiAnalyzeRow = null;
const contentCollapsed = ref(true);

// 格式化日期时间
function formatDateTime(dateStr: string) {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  return date.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

async function getList() {
  loading.value = true;
  try {
    const params: any = {
      currentPage: queryParams.currentPage,
      pageSize: queryParams.pageSize,
      fields: "basic", // 列表只要基础字段，描述/关键词等详情再取，省流量渲染快
      folderId: convertFolderIdToApiParam(queryParams.folderId) as string | null | undefined,
    };
    if (queryParams.search) params.keyword = queryParams.search;
    if (queryParams.language) params.language = queryParams.language;
    if (queryParams.reviewStatus !== "" && queryParams.reviewStatus !== null && queryParams.reviewStatus !== undefined) {
      params.reviewStatus = Number(queryParams.reviewStatus);
    }
    if (lengthFilter.exact) params.length = lengthFilter.exact;
    if (lengthFilter.min) params.minLength = lengthFilter.min;
    if (lengthFilter.max) params.maxLength = lengthFilter.max;
    const res = await searchSentences(params);
    dataSource.value = res.list || [];
    total.value = res.total || 0;
    ids.value = [];
  } catch (error) {
    console.error("获取列表失败:", error);
    ElMessage.error("获取列表失败");
  } finally {
    loading.value = false;
    nextTick(setupRowDrag);
  }
}

function handleSearch() {
  queryParams.currentPage = 1;
  getList();
}

function handleReset() {
  queryParams.search = "";
  queryParams.language = "";
  queryParams.reviewStatus = "";
  resetLengthFilter();
  queryParams.currentPage = 1;
  getList();
}

function handleFolderChange(payload: { folderId: string | null }) {
  if (payload.folderId === "__all__") {
    queryParams.folderId = FOLDER_FILTER.ALL;
  } else if (payload.folderId === null) {
    queryParams.folderId = FOLDER_FILTER.NOT_GROUP;
  } else {
    queryParams.folderId = payload.folderId;
  }
  queryParams.currentPage = 1;
  getList();
}

async function handleFolderDrop(payload: { data: any }) {
  markExternalFolderDropHandled();
  if (!dragState.draggingIds.length) return;
  if (payload.data.id === FOLDER_FILTER.ALL) return;

  const targetFolderId =
    payload.data.id === FOLDER_FILTER.NOT_GROUP ? FOLDER_FILTER.NOT_GROUP : payload.data.id;
  const targetPath = payload.data.path || "";
  const movingIds = [...dragState.draggingIds];

  try {
    await batchMoveSentence({
      ids: movingIds.map(Number),
      folderId: convertFolderIdToApiParam(targetFolderId) as string,
    });
    ElMessage.success(`已移动 ${movingIds.length} 条文案到 ${targetPath || "未分组"}`);
    await getList();
    ids.value = [];
  } catch (error) {
    ElMessage.error((error as Error).message || "移动失败");
  } finally {
    resetAfterDrop();
  }
}

function handleAdd() {
  isEdit.value = false;
  dialogVisible.value = true;
  dialogTitle.value = "新增句子";
  form.value = {
    content: "",
    description: "",
    keywords: "",
  };
}

onMounted(() => {
  getList();
});

function checkboxChange(e) {
  const records = Array.isArray(e.records) ? e.records : [];
  const reserves = Array.isArray(e.reserves) ? e.reserves : [];
  ids.value = [...records.map((item) => item.id), ...reserves.map((item) => item.id)];
  console.log("checkboxChange - ids:", ids.value); // 添加调试信息
}

function checkboxAllChange(e) {
  const records = Array.isArray(e.records) ? e.records : [];
  const reserves = Array.isArray(e.reserves) ? e.reserves : [];
  ids.value = [...records.map((item) => item.id), ...reserves.map((item) => item.id)];
  console.log("checkboxAllChange - ids:", ids.value); // 添加调试信息
}

function handleEdit(row) {
  isEdit.value = true;
  dialogVisible.value = true;
  dialogTitle.value = "编辑句子";
  editId.value = row.id;
  form.value = {
    content: row.content,
    description: row.description || "",
    keywords: row.keywords || "",
  };
}


async function handleDelete(row?) {
  let delIds = null;
  if (row) {
    delIds = [row.id];
  } else if (!ids.value.length) {
    return ElMessage.warning("请选择要删除的数据");
  } else {
    delIds = [...ids.value];
  }

  const targetItems = delIds.map(
    (id: any) =>
      dataSource.value.find((item: any) => String(item.id) === String(id)) ||
      (row && String(row.id) === String(id) ? row : null),
  ).filter(Boolean);

  const sharedItems = targetItems.filter(
    (item: any) =>
      item.isShared ||
      item.resourceLibraryId ||
      item.shareType ||
      (item.sourceUserId && String(item.sourceUserId) !== String(item.userId)),
  );

  let confirmMsg = `确认删除选中的 ${delIds.length} 条数据吗？`;
  if (sharedItems.length > 0) {
    const sampleNames = sharedItems
      .slice(0, 3)
      .map((i: any) => `「${i.text || i.content || i.id}」`)
      .join("、");
    const moreText = sharedItems.length > 3 ? ` 等共 ${sharedItems.length} 项` : "";
    confirmMsg = `选中的例句文案中包含已发布到素材中心或已共享给其他用户的资源（如 ${sampleNames}${moreText}）。删除后相关记录将被移除，是否确认继续删除？`;
  }

  try {
    await ElMessageBox.confirm(confirmMsg, "删除提示", {
      confirmButtonText: "确认",
      cancelButtonText: "取消",
      type: sharedItems.length > 0 ? "warning" : "error",
    });

    deleteLoading.value = true;
    let successCount = 0;
    const failMessages: string[] = [];
    for (const id of delIds) {
      try {
        await deleteSentence(id);
        successCount++;
      } catch (e: any) {
        console.error(`删除句子 ${id} 失败:`, e);
        failMessages.push(e?.message || String(id));
      }
    }
    if (successCount > 0 && failMessages.length === 0) {
      ElMessage.success("删除成功");
    } else if (successCount > 0 && failMessages.length > 0) {
      ElMessage.warning(`已删除 ${successCount} 条，${failMessages.length} 条失败`);
    } else {
      ElMessage.error(`删除失败：${failMessages.slice(0, 3).join("；")}`);
    }
    ids.value = ids.value.filter((id: any) => !delIds.includes(id));
    await getList();
  } catch (error: any) {
    if (error === "cancel" || error === "close" || error?.action === "cancel" || error?.action === "close") {
      return;
    }
    console.error("删除失败:", error);
    ElMessage.error(error?.message || "删除失败");
  } finally {
    deleteLoading.value = false;
  }
}

// AI分析句子
function handleAiAnalyze(row) {
  if (aiTableLoading.value[row.id]) return;
  aiAnalyzeRow = row;
  aiAnalyzePrompt.value = "";
  aiAnalyzeDialogVisible.value = true;
}

async function submitAiAnalyzeDialog() {
  if (!aiAnalyzeRow) return;
  aiAnalyzeLoading.value = true;
  aiTableLoading.value = { ...aiTableLoading.value, [aiAnalyzeRow.id]: true };
  try {
    await handleAiAnalyzeSentence(
      aiAnalyzeRow,
      () => {
        aiTableLoading.value = { ...aiTableLoading.value, [aiAnalyzeRow.id]: false };
        aiAnalyzeLoading.value = false;
        aiAnalyzeDialogVisible.value = false;
        aiAnalyzeRow = null;
      },
      aiAnalyzePrompt.value
    );
  } catch (e) {
    aiTableLoading.value = { ...aiTableLoading.value, [aiAnalyzeRow.id]: false };
    aiAnalyzeLoading.value = false;
    aiAnalyzeDialogVisible.value = false;
    aiAnalyzeRow = null;
  } finally {
    // AI 分析回填 description/keywords 后刷新列表
    getList();
  }
}

async function handleAiAnalyzeSentence(row, cb, prompt) {
  try {
    const res = await aiAnalyzeSentence(row.id, prompt || "");
    // 更新行数据
    if (res) {
      row.description = res.description;
      row.keywords = res.keywords;
    }
    ElMessage.success("AI分析完成");
    if (typeof cb === "function") cb();
    getList();
  } catch (e) {
    ElMessage.error(`AI分析失败：${e.message || "未知错误"}`);
    if (typeof cb === "function") cb();
  }
}


async function openShareRecordsDialog(row: any) {
  shareRecordsResourceName.value = row.content || `ID: ${row.id}`;
  shareRecordsDialogVisible.value = true;
  shareRecordsLoading.value = true;
  shareRecordsList.value = [];
  try {
    const res = await getSentenceSharedRecords(row.id);
    shareRecordsList.value = res?.list || [];
    shareRecordsTotal.value = res?.total || 0;
  } catch (e: any) {
    ElMessage.error(e?.message || '获取分享记录失败');
  } finally {
    shareRecordsLoading.value = false;
  }
}

// 处理dropdown操作命令
function handleOperationCommand(command: string, row: any) {
  switch (command) {
    case "detail":
      openDetail(row);
      break;
    case "review-approve":
      quickReview(1, row);
      break;
    case "edit":
      handleEdit(row);
      break;
    case "ai-analyze":
      handleAiAnalyze(row);
      break;
    case "share-to-user":
      openSentenceUserTransferDialog("share", row);
      break;
    case "copy-to-user":
      openSentenceUserTransferDialog("copy", row);
      break;
    case "move-to-user":
      openSentenceUserTransferDialog("move", row);
      break;
    case "view-shared":
      openShareRecordsDialog(row);
      break;
    case "delete":
      handleDelete(row);
      break;
    default:
      console.warn("未知的操作命令:", command);
  }
}

// 资源转移/分享
type SentenceUserTransferAction = "share" | "move";
type SentenceUserTransferUserOption = {
  value: number;
  label: string;
  account?: string;
  isAdmin?: boolean;
};

const sentenceUserTransferDialogVisible = ref(false);
const sentenceUserTransferSubmitting = ref(false);
const sentenceUserTransferUsersLoading = ref(false);
const sentenceUserTransferUsersLoaded = ref(false);
const sentenceUserTransferAction = ref<SentenceUserTransferAction>("share");
const sentenceUserTransferIds = ref<Array<number | string>>([]);
const sentenceUserTransferTargetUserId = ref<number | string>("");
const sentenceUserTransferUserOptions = ref<SentenceUserTransferUserOption[]>([]);

const sentenceUserTransferDialogTitle = computed(() => {
  if (sentenceUserTransferAction.value === "share") return "分享例句给用户";
  return "转移例句给用户";
});

const sentenceUserTransferSubmitText = computed(() => {
  if (sentenceUserTransferAction.value === "share") return "确认分享";
  return "确认转移";
});

async function loadSentenceTransferUserOptions() {
  if (sentenceUserTransferUsersLoaded.value || sentenceUserTransferUsersLoading.value) return;
  sentenceUserTransferUsersLoading.value = true;
  try {
    const res: any = await getUserList({ currentPage: 1, pageSize: 1000 });
    const list = Array.isArray(res) ? res : res?.list || [];
    sentenceUserTransferUserOptions.value = list.map((item: any) => ({
      value: Number(item.id),
      label: item.name ? `${item.name} (${item.account || item.id})` : item.account || `用户 ${item.id}`,
      account: item.account,
      isAdmin: Boolean(item.isAdmin),
    }));
    sentenceUserTransferUsersLoaded.value = true;
  } catch (error) {
    ElMessage.error("获取用户列表失败");
  } finally {
    sentenceUserTransferUsersLoading.value = false;
  }
}

function resetSentenceUserTransferDialog() {
  sentenceUserTransferSubmitting.value = false;
  sentenceUserTransferAction.value = "share";
  sentenceUserTransferIds.value = [];
  sentenceUserTransferTargetUserId.value = "";
}

async function openSentenceUserTransferDialog(action: SentenceUserTransferAction, row?: any) {
  sentenceUserTransferAction.value = action;
  if (row?.id != null) {
    sentenceUserTransferIds.value = [row.id];
  } else {
    sentenceUserTransferIds.value = [...ids.value];
  }
  if (!sentenceUserTransferIds.value.length) {
    ElMessage.warning("请至少选择一条例句");
    return;
  }
  sentenceUserTransferDialogVisible.value = true;
  await loadSentenceTransferUserOptions();
}

async function submitSentenceUserTransfer() {
  if (!sentenceUserTransferTargetUserId.value) {
    ElMessage.warning("请选择目标用户");
    return;
  }
  sentenceUserTransferSubmitting.value = true;
  try {
    const payload = {
      ids: sentenceUserTransferIds.value,
      targetUserId: sentenceUserTransferTargetUserId.value,
    };
    let res: any;
    if (sentenceUserTransferAction.value === "share") {
      res = await shareSentenceToUser(payload as any);
    } else {
      res = await moveSentenceToUser(payload as any);
    }
    const failed = res?.failed || [];
    if (failed.length) {
      ElMessage.warning(`操作完成，其中 ${failed.length} 条失败`);
    } else {
      ElMessage.success(
        sentenceUserTransferAction.value === "share"
          ? "分享成功"
          : "转移成功"
      );
    }
    sentenceUserTransferDialogVisible.value = false;
    ids.value = [];
    getList();
  } catch (error: any) {
    ElMessage.error(error?.message || "操作失败");
  } finally {
    sentenceUserTransferSubmitting.value = false;
  }
}

const rules = {
  content: [
    { required: true, message: "请输入句子内容", trigger: "blur" },
    { min: 1, max: 5000, message: "句子内容长度在 1 到 5000 个字符", trigger: "blur" },
  ],
  description: [{ max: 1000, message: "描述长度不能超过 1000 个字符", trigger: "blur" }],
  keywords: [{ max: 500, message: "关键词长度不能超过 500 个字符", trigger: "blur" }],
};

const dialogClose = () => {
  dialogVisible.value = false;
  submitLoading.value = false;
  formRef.value?.resetFields();
};

const submitForm = async () => {
  if (!formRef.value) return;

  try {
    await formRef.value.validate();
    submitLoading.value = true;

    if (isEdit.value) {
      await updateSentence(editId.value, {
        content: form.value.content,
        description: form.value.description,
        keywords: form.value.keywords,
      });
      ElMessage.success("更新成功");
    } else {
      await createSentence({
        content: form.value.content,
        description: form.value.description,
        keywords: form.value.keywords,
      });
      ElMessage.success("新增成功");
    }

    getList();
    dialogVisible.value = false;
  } catch (error) {
    console.error("提交失败:", error);
    ElMessage.error("操作失败");
  } finally {
    submitLoading.value = false;
  }
};
</script>

<style scoped>

/* 文字数筛选：触发按钮 */
.length-trigger {
  width: 100%;
  justify-content: space-between;
  padding: 0 8px;
  font-weight: 400;
}

.length-trigger__text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.length-trigger__arrow {
  flex-shrink: 0;
  margin-left: 4px;
  font-size: 12px;
  color: var(--el-text-color-placeholder);
}

.length-trigger.is-active {
  color: var(--el-color-primary);
  border-color: var(--el-color-primary-light-5);
  background: var(--el-color-primary-light-9);
}

.length-trigger.is-active .length-trigger__arrow {
  color: var(--el-color-primary);
}

/* 选中后才出现的批量操作 */
.selection-actions {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.selection-actions :deep(.el-button + .el-button) {
  margin-left: 0;
}

/* 文字数面板（popper 挂在 body，需全局样式） */
:global(.length-picker-popper) {
  padding: 12px 14px 14px;
}

:global(.length-picker__section) {
  margin-bottom: 12px;
}

:global(.length-picker__section:last-child) {
  margin-bottom: 0;
}

:global(.length-picker__title) {
  display: block;
  margin-bottom: 6px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

:global(.length-picker__chips) {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

:global(.length-chip) {
  height: 26px;
  padding: 0 10px;
  font-size: 12px;
  line-height: 24px;
  color: var(--el-text-color-regular);
  background: var(--el-fill-color-blank);
  border: 1px solid var(--el-border-color);
  border-radius: 13px;
  cursor: pointer;
  transition: color 0.15s, border-color 0.15s, background-color 0.15s;
}

:global(.length-chip:hover) {
  color: var(--el-color-primary);
  border-color: var(--el-color-primary-light-5);
  background: var(--el-color-primary-light-9);
}

:global(.length-chip.is-active) {
  color: #fff;
  background: var(--el-color-primary);
  border-color: var(--el-color-primary);
}

:global(.length-picker__custom) {
  display: flex;
  align-items: center;
  gap: 6px;
}

:global(.length-num) {
  width: 78px;
}

:global(.length-picker__tilde) {
  color: var(--el-text-color-placeholder);
}


@media (width <= 600px) {
  .shrink-0 {
    width: 100%;
  }

  .shrink-0 > * {
    width: 100% !important;
    min-width: 0 !important;
    margin-bottom: 6px !important;
  }

  .el-input,
  .el-select,
  .el-button,
  .el-date-editor {
    width: 100% !important;
    min-width: 0 !important;
    box-sizing: border-box;
  }

  .sentence-content {
    max-width: 100%;
    margin: 0 4px;
  }
}

:deep(.sentence-page) {
  gap: 10px;
  padding: 8px 0 0;
}

:deep(.sentence-page .list-page-layout__main) {
  gap: 10px;
}

:deep(.sentence-page .list-page-filter--flat) {
  gap: 10px;
  padding-bottom: 10px;
}

:deep(.sentence-page .list-page-table-panel__pagination--flat) {
  padding-top: 10px;
}

.sentence-sidebar {
  min-height: 100%;
}

/* 句子内容样式优化 */
.sentence-content {
  width: 100%;
  font-size: 13px;
  font-weight: 400;
  line-height: 1.5;
  word-break: break-all;
}

.sentence-content--collapsed {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sentence-content:not(.sentence-content--collapsed) {
  padding: 8px 12px;
  margin: 4px 0;
  background-color: var(--el-fill-color-light);
  border-radius: 4px;
}

:deep(.sentence-content-switch .el-switch__core .el-switch__inner span) {
  font-size: 9px !important;
}

/* 操作列样式优化 */

/* 详情弹窗（极简） */
.sentence-detail {
  min-height: 160px;
}
.sentence-detail__content {
  font-size: 15px;
  font-weight: 500;
  line-height: 1.8;
  white-space: pre-wrap;
  word-break: break-all;
  color: var(--el-text-color-primary);
}
.sentence-detail__text {
  margin-top: 14px;
  font-size: 13px;
  line-height: 1.7;
  white-space: pre-wrap;
  word-break: break-all;
  color: var(--el-text-color-secondary);
}
.sentence-detail__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 14px;
}
.sentence-detail__meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  margin-top: 18px;
  padding-top: 14px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  border-top: 1px solid var(--el-border-color-lighter);
}
.sentence-detail__dot {
  color: var(--el-text-color-placeholder);
}
.sentence-detail__time {
  margin-left: auto;
}
.sentence-detail__extra {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
/* 极简弹窗：去标题栏内边距，仅保留右上角关闭按钮 */
.sentence-detail-dialog .el-dialog__header {
  padding: 12px 20px 0;
}
.sentence-detail-dialog .el-dialog__body {
  padding: 8px 24px 24px;
}


/* 标签筛选行：checkbox 与下拉框垂直居中、不换行 */
.sentence-tag-mode {
  flex-shrink: 0;
  height: auto;
  margin-right: 0;
  white-space: nowrap;
}
.sentence-tag-mode :deep(.el-checkbox__label) {
  font-size: 12px;
  padding-left: 5px;
}
</style>
