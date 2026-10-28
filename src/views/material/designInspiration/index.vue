<template>
  <ContentWrap :plain="true">
    <ListPageLayout class="design-inspiration-page">
      <template #filter>
        <!-- 自动制作工位监控胶囊条 -->
        <div class="station-monitor-capsule-bar">
          <div class="monitor-left">
            <div class="station-pulse-badge" :class="{ 'is-active': stats.onlineStations > 0 }">
              <span class="station-dot" :class="{ 'is-active': stats.onlineStations > 0 }"></span>
              <span class="station-title">在线工位 <strong>{{ stats.onlineStations }}</strong> 台</span>
            </div>
            <div class="monitor-stat-pill">
              <span class="stat-label">制作中</span>
              <span class="stat-val highlight">{{ stats.activeJobs }}</span>
            </div>
            <div class="monitor-stat-pill">
              <span class="stat-label">今日生产</span>
              <span class="stat-val default">{{ stats.todayCompleted }}</span>
            </div>
            <div class="monitor-stat-pill">
              <span class="stat-label">已入库</span>
              <span class="stat-val success">{{ stats.todayApproved }}</span>
            </div>
            <div class="monitor-stat-pill">
              <span class="stat-label">返工微调</span>
              <span class="stat-val warning">{{ stats.todayReworked }}</span>
            </div>
            <div class="monitor-stat-pill">
              <span class="stat-label">通过率</span>
              <span class="stat-val rate">{{ stats.approvalRate }}%</span>
            </div>
          </div>
          <div class="monitor-right">
            <el-button link size="small" :icon="Refresh" @click="fetchStats">刷新工位</el-button>
          </div>
        </div>

        <div class="list-page-filter list-page-filter--flat">
          <el-form :model="queryParams" label-position="top" class="list-page-search-form">
            <el-row :gutter="12" class="list-page-search-form__row">
              <el-col class="list-page-search-form__col--wide" :xs="24" :sm="12" :md="10" :lg="8">
                <el-form-item label="关键词">
                  <el-input
                    v-model="queryParams.keyword"
                    size="small"
                    clearable
                    placeholder="搜索标题、内容、分类、关键词"
                    @keyup.enter="handleSearch"
                    @clear="handleSearch"
                  >
                    <template #prefix>
                      <el-icon><Search /></el-icon>
                    </template>
                  </el-input>
                </el-form-item>
              </el-col>
              <el-col class="list-page-search-form__col--narrow" :xs="24" :sm="12" :md="7" :lg="4">
                <el-form-item label="分类">
                  <el-input
                    v-model="queryParams.category"
                    size="small"
                    clearable
                    placeholder="全部"
                    @keyup.enter="handleSearch"
                    @clear="handleSearch"
                  />
                </el-form-item>
              </el-col>
            </el-row>

            <div class="list-page-search-form__actions">
              <el-button
                size="small"
                type="primary"
                :icon="Search"
                :loading="loading"
                @click="handleSearch"
              >
                搜索
              </el-button>
              <el-button size="small" :disabled="loading" @click="handleReset">重置</el-button>
              <el-button size="small" type="primary" :icon="Plus" @click="handleAdd"
                >新增</el-button
              >
              <el-button
                size="small"
                type="danger"
                :icon="Delete"
                :loading="deleteLoading"
                @click="handleDelete(null)"
              >
                批量删除 ({{ ids.length }})
              </el-button>
            </div>
          </el-form>
        </div>
      </template>

      <template #table>
        <div
          class="list-page-panel list-page-panel--flat list-page-table-panel list-page-table-panel--flat"
        >
          <div class="list-page-table-panel__body">
            <!-- 桌面端表格视图 -->
            <div v-if="!isMobile" class="common-table">
              <vxe-grid
                v-bind="gridOptions"
                :max-height="gridOptions.maxHeight"
                :data="dataSource"
                :loading="loading"
                @checkbox-change="checkboxChange"
                @checkbox-all="checkboxAllChange"
              >
                <template #idSlot="{ row }">
                  <span
                    class="id-copy"
                    :title="row.id + '（点击复制）'"
                    @click.stop="copyId(row.id)"
                  >{{ row.id }}</span>
                </template>
                <template #imagesSlot="{ row }">
                  <div v-if="row.images?.length" class="flex items-center gap-1.5 py-1">
                    <el-image
                      :src="row.images[0]"
                      :preview-src-list="row.images"
                      preview-teleported
                      fit="cover"
                      style="width: 72px; height: 72px; border-radius: 6px; border: 1px solid var(--el-border-color-lighter); flex-shrink: 0; cursor: pointer; object-fit: cover;"
                    />
                    <el-tag
                      v-if="row.images.length > 1"
                      size="small"
                      type="info"
                      effect="plain"
                      style="padding: 0 4px; font-size: 11px;"
                    >
                      +{{ row.images.length - 1 }}
                    </el-tag>
                  </div>
                  <span v-else style="color: var(--el-text-color-placeholder); font-size: 12px;">-</span>
                </template>

                <template #titleSlot="{ row }">
                  <div class="design-inspiration-title">{{ row.title }}</div>
                </template>

                <template #contentSlot="{ row }">
                  <div class="design-inspiration-content">{{ row.content }}</div>
                </template>

                <template #keywordsSlot="{ row }">
                  <div v-if="row.keywords?.length" class="design-inspiration-tags">
                    <el-tag v-for="tag in row.keywords" :key="tag" size="small" type="info">
                      {{ tag }}
                    </el-tag>
                  </div>
                  <span v-else>-</span>
                </template>

                <template #promptHintsSlot="{ row }">
                  <div class="design-inspiration-content">{{ row.promptHints || "-" }}</div>
                </template>

                <template #productionSlot="{ row }">
                  <div class="production-cell">
                    <div class="production-status-row">
                      <el-tag
                        v-if="row.status === 'producing'"
                        type="success"
                        size="small"
                        effect="dark"
                        class="production-badge"
                      >
                        <span class="mini-pulse-dot"></span> 制作中
                      </el-tag>
                      <el-tag
                        v-else-if="row.status === 'done'"
                        type="info"
                        size="small"
                        effect="plain"
                      >
                        已达标
                      </el-tag>
                      <el-tag
                        v-else
                        size="small"
                        type="info"
                        effect="light"
                      >
                        待排产
                      </el-tag>
                      <el-switch
                        v-model="row.autoEnabled"
                        size="small"
                        :loading="row._switchLoading"
                        inline-prompt
                        active-text="挂机"
                        inactive-text="停"
                        @change="(val: boolean) => handleToggleAutoEnabled(row, val)"
                      />
                    </div>
                    <div class="production-progress-row">
                      <span class="progress-text">
                        <template v-if="row.targetCount">
                          已产 {{ row.approvedCount || 0 }}/{{ row.targetCount }} 款
                        </template>
                        <template v-else>
                          持续变体 ({{ row.approvedCount || 0 }}款)
                        </template>
                      </span>
                      <el-button
                        type="primary"
                        link
                        size="small"
                        class="history-btn"
                        @click.stop="openJobHistory(row)"
                      >
                        流水
                      </el-button>
                    </div>
                  </div>
                </template>

                <template #operationDefaultSlot="{ row }">
                  <div class="flex justify-start">
                    <el-dropdown class="operation-dropdown" placement="bottom-end">
                      <el-button type="primary" link size="small" class="operation-trigger-button">
                        操作
                      </el-button>
                      <template #dropdown>
                        <el-dropdown-menu class="operation-menu-compact">
                          <el-dropdown-item @click="openJobHistory(row)">制作历史流水</el-dropdown-item>
                          <el-dropdown-item @click="handleEdit(row)">编辑</el-dropdown-item>
                          <el-dropdown-item
                            divided
                            :disabled="loading || deleteLoading"
                            class="operation-menu-item--danger"
                            @click="handleDelete(row)"
                          >
                            删除
                          </el-dropdown-item>
                        </el-dropdown-menu>
                      </template>
                    </el-dropdown>
                  </div>
                </template>
              </vxe-grid>
            </div>

            <!-- 移动端专属卡片列表视图 -->
            <div v-else class="mobile-inspiration-container">
              <!-- 移动端批量操作条 -->
              <div v-if="dataSource.length" class="mobile-batch-bar">
                <el-checkbox
                  :model-value="isAllSelected"
                  :indeterminate="isIndeterminate"
                  @change="handleSelectAllMobile"
                >
                  <span class="mobile-batch-text">
                    全选本页 (已选 {{ selectedCountInPage }}/{{ dataSource.length }})
                  </span>
                </el-checkbox>
                <el-button
                  v-if="ids.length > 0"
                  type="danger"
                  link
                  size="small"
                  :icon="Delete"
                  :loading="deleteLoading"
                  @click="handleDelete(null)"
                >
                  删除选中 ({{ ids.length }})
                </el-button>
              </div>

              <!-- 加载状态骨架屏 -->
              <div v-if="loading" class="mobile-loading-skeleton">
                <el-skeleton :rows="3" animated />
                <el-skeleton :rows="3" animated style="margin-top: 12px" />
              </div>

              <!-- 空状态 -->
              <el-empty v-else-if="!dataSource.length" description="暂无设计灵感" />

              <!-- 灵感卡片列表 -->
              <div v-else class="mobile-inspiration-list">
                <div
                  v-for="item in dataSource"
                  :key="item.id"
                  class="mobile-inspiration-card"
                  :class="{ 'is-selected': item.id && ids.includes(item.id) }"
                  @click="item.id && toggleCardSelect(item.id)"
                >
                  <!-- 顶部：选择框、标题、分类 -->
                  <div class="mobile-card-header">
                    <div class="mobile-card-header__left">
                      <el-checkbox
                        :model-value="Boolean(item.id && ids.includes(item.id))"
                        @click.stop
                        @change="(val: any) => item.id && handleCardSelect(item.id, Boolean(val))"
                      />
                      <div class="mobile-card-title">{{ item.title }}</div>
                    </div>
                    <el-tag
                      v-if="item.category"
                      size="small"
                      effect="light"
                      class="mobile-card-category"
                    >
                      {{ item.category }}
                    </el-tag>
                  </div>

                  <!-- 参考图横向滑槽 -->
                  <div v-if="item.images?.length" class="mobile-card-images" @click.stop>
                    <div class="mobile-card-images__scroll">
                      <el-image
                        v-for="(img, idx) in item.images"
                        :key="idx"
                        :src="img"
                        :preview-src-list="item.images"
                        :initial-index="idx"
                        preview-teleported
                        fit="cover"
                        class="mobile-card-thumb"
                      />
                    </div>
                    <div class="mobile-card-images__info">
                      共 {{ item.images.length }} 张参考图（点击查看大图）
                    </div>
                  </div>

                  <!-- 灵感主体内容 -->
                  <div class="mobile-card-body">
                    <div
                      class="mobile-card-content"
                      :class="{
                        'is-clamped': item.id && !expandedCards[item.id] && (item.content?.length || 0) > 120,
                      }"
                    >
                      {{ item.content }}
                    </div>
                    <button
                      v-if="(item.content?.length || 0) > 120 && item.id"
                      type="button"
                      class="mobile-card-expand-toggle"
                      @click.stop="toggleExpand(item.id!)"
                    >
                      {{ expandedCards[item.id] ? "收起内容" : "展开全文" }}
                    </button>
                  </div>

                  <!-- 关键词标签 -->
                  <div v-if="item.keywords?.length" class="mobile-card-keywords">
                    <el-tag
                      v-for="tag in item.keywords"
                      :key="tag"
                      size="small"
                      type="info"
                      effect="plain"
                      class="mobile-card-tag"
                    >
                      #{{ tag }}
                    </el-tag>
                  </div>

                  <!-- 提示词片段 & 避让事项 -->
                  <div v-if="item.promptHints || item.avoidNotes" class="mobile-card-meta-chips">
                    <div v-if="item.promptHints" class="meta-chip prompt-hints-chip">
                      <div class="meta-chip__title">
                        <el-icon><MagicStick /></el-icon>
                        <span>提示词片段</span>
                      </div>
                      <div class="meta-chip__body">{{ item.promptHints }}</div>
                    </div>
                    <div v-if="item.avoidNotes" class="meta-chip avoid-notes-chip">
                      <div class="meta-chip__title">
                        <el-icon><Warning /></el-icon>
                        <span>避让事项</span>
                      </div>
                      <div class="meta-chip__body">{{ item.avoidNotes }}</div>
                    </div>
                  </div>

                  <!-- 底部：时间与快捷操作 -->
                  <div class="mobile-card-footer" @click.stop>
                    <div class="mobile-card-time">
                      <span v-if="item.targetCount" class="mobile-prod-tag">
                        进度 {{ item.approvedCount || 0 }}/{{ item.targetCount }}款
                      </span>
                      <span v-else class="mobile-prod-tag">
                        变体 ({{ item.approvedCount || 0 }}款)
                      </span>
                      <span>{{ formatTime(item.updateTime || item.createTime) }}</span>
                    </div>
                    <div class="mobile-card-actions">
                      <el-button
                        size="small"
                        type="primary"
                        link
                        @click="openJobHistory(item)"
                      >
                        流水
                      </el-button>
                      <el-button
                        size="small"
                        type="primary"
                        link
                        :icon="Edit"
                        @click="handleEdit(item)"
                      >
                        编辑
                      </el-button>
                      <el-button
                        size="small"
                        type="danger"
                        link
                        :icon="Delete"
                        :loading="deleteLoading"
                        @click="handleDelete(item)"
                      >
                        删除
                      </el-button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>

      <template #pagination>
        <div
          class="list-page-panel list-page-panel--flat list-page-table-panel__pagination list-page-table-panel__pagination--flat"
        >
          <Pagination
            :total="total"
            v-model:page="queryParams.currentPage"
            v-model:limit="queryParams.pageSize"
            @pagination="getList"
          />
        </div>
      </template>
    </ListPageLayout>

    <el-dialog
      :title="dialogTitle"
      v-model="dialogVisible"
      :width="isMobile ? 'calc(100vw - 16px)' : '840px'"
      align-center
      class="design-inspiration-dialog"
      :class="{ 'is-mobile': isMobile }"
      :style="isMobile ? { width: 'calc(100vw - 16px)', margin: '8px auto' } : { maxWidth: '94vw' }"
      :close-on-click-modal="!isMobile"
      @close="dialogClose"
    >
      <el-scrollbar :max-height="isMobile ? '55vh' : '65vh'" class="design-inspiration-dialog__scroll">
        <el-form
          ref="formRef"
          :model="form"
          :rules="rules"
          :label-width="isMobile ? undefined : '100px'"
          :label-position="isMobile ? 'top' : undefined"
          class="design-inspiration-form"
        >
          <el-form-item label="标题" prop="title">
            <el-input
              v-model="form.title"
              maxlength="200"
              show-word-limit
              placeholder="例如：太极 / LOL / 绝命毒师"
            />
          </el-form-item>
          <el-form-item label="分类" prop="category">
            <el-input v-model="form.category" maxlength="80" show-word-limit placeholder="可选" />
          </el-form-item>
          <el-form-item label="关键词">
            <el-input v-model="form.keywordsText" placeholder="多个关键词用逗号分隔" />
          </el-form-item>
          <el-form-item label="内容" prop="content">
            <el-input
              v-model="form.content"
              type="textarea"
              :rows="isMobile ? 4 : 6"
              maxlength="4000"
              show-word-limit
              placeholder="记录画面、情绪、元素、颜色或设计方向"
            />
          </el-form-item>
          <el-form-item label="自我认知片段">
            <el-input
              v-model="form.promptHints"
              type="textarea"
              :rows="isMobile ? 2 : 3"
              placeholder="后续可给 agent 使用的提示片段"
            />
          </el-form-item>
          <el-form-item label="避让事项">
            <el-input
              v-model="form.avoidNotes"
              type="textarea"
              :rows="isMobile ? 2 : 3"
              placeholder="例如：不要直接复刻 Logo，不要使用具体人物肖像"
            />
          </el-form-item>
          <el-row :gutter="12">
            <el-col :xs="24" :sm="12">
              <el-form-item label="制作优先级">
                <el-select v-model="form.priority" placeholder="选择优先级" style="width: 100%">
                  <el-option :value="0" label="0 - 紧急 (优先制作)" />
                  <el-option :value="1" label="1 - 高优" />
                  <el-option :value="2" label="2 - 普通" />
                  <el-option :value="3" label="3 - 低" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :xs="24" :sm="12">
              <el-form-item label="目标制作量">
                <el-input-number
                  v-model="form.targetCount"
                  :min="1"
                  :max="999"
                  style="width: 100%"
                  placeholder="留空则持续变体"
                />
              </el-form-item>
            </el-col>
          </el-row>
          <el-form-item label="尺寸规格建议">
            <el-input
              v-model="form.sizeHint"
              maxlength="200"
              placeholder="例如：横版 3000x1376 / 手机壳 / 贴纸（留空默认采用 2400x2400 超清规格）"
            />
          </el-form-item>
          <el-form-item label="自动挂机">
            <el-switch
              v-model="form.autoEnabled"
              active-text="参与 1s 自动工位制作"
              inactive-text="暂停自动制作"
            />
          </el-form-item>
          <el-form-item label="参考图">
            <div class="inspiration-image-upload-wrapper w-full">
              <el-upload
                v-model:file-list="imageFileList"
                action="#"
                list-type="picture-card"
                :auto-upload="false"
                :multiple="true"
                :limit="12"
                accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
                :on-preview="handleImagePreview"
                class="inspiration-image-upload"
              >
                <el-icon><Plus /></el-icon>
              </el-upload>
              <div class="inspiration-image-upload__tip">
                支持上传多张参考图/风格图（最多12张）。
              </div>
            </div>
          </el-form-item>
        </el-form>
      </el-scrollbar>

      <template #footer>
        <div class="design-inspiration-dialog__footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" :loading="submitLoading" @click="submitForm">确定</el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 参考图大图预览弹窗 -->
    <el-dialog v-model="previewDialogVisible" title="参考图预览" width="560px" append-to-body>
      <div style="display: flex; justify-content: center; align-items: center; max-height: 65vh; overflow: hidden;">
        <img :src="previewImageUrl" alt="参考图预览" style="max-width: 100%; max-height: 65vh; object-fit: contain;" />
      </div>
    </el-dialog>

    <!-- 制作历史流水抽屉 -->
    <DesignJobHistoryDrawer
      v-model="historyDrawerVisible"
      :inspiration="activeHistoryInspiration"
    />
  </ContentWrap>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref, watchEffect } from "vue";
import type { FormInstance, FormRules, UploadUserFile } from "element-plus";
import { ElMessage, ElMessageBox } from "element-plus";
import { Delete, Edit, MagicStick, Plus, Refresh, Search, Warning } from "@element-plus/icons-vue";
import { useWindowSize } from "@vueuse/core";
import { uploadToCOS } from "@/api/cos";
import {
  createDesignInspiration,
  deleteDesignInspiration,
  getDesignInspirationPage,
  updateDesignInspiration,
  type DesignInspiration,
} from "@/api/design-inspiration";
import {
  getDesignJobStats,
  type DesignJobStats,
} from "@/api/design-job";
import DesignJobHistoryDrawer from "./DesignJobHistoryDrawer.vue";
import { formatTimestamp } from "@/common/date";
import { buildOperationColumn, buildTimeColumn, commonGridOptions } from "@/common/table";
import ContentWrap from "@/components/ContentWrap/src/ContentWrap.vue";
import ListPageLayout from "@/components/ListPageLayout/index.vue";
import Pagination from "@/components/Pagination/index.vue";
import { useUserStore } from "@/store/modules/user";

const { width, height } = useWindowSize();
const isMobile = computed(() => width.value < 768);
const userStore = useUserStore();

const queryParams = reactive({
  currentPage: 1,
  pageSize: 20,
  keyword: "",
  category: "",
});

const gridOptions = ref<any>({
  ...commonGridOptions,
  maxHeight: Math.max(height.value - 280, 360),
  columns: [
    { type: "checkbox", width: 50 },
    { title: "参考图", field: "images", width: 170, slots: { default: "imagesSlot" } },
    { title: "标题", field: "title", minWidth: 180, slots: { default: "titleSlot" } },
    { title: "分类", field: "category", width: 120 },
    { title: "关键词", field: "keywords", minWidth: 180, slots: { default: "keywordsSlot" } },
    { title: "内容", field: "content", minWidth: 320, slots: { default: "contentSlot" } },
    {
      title: "提示词片段",
      field: "promptHints",
      minWidth: 240,
      slots: { default: "promptHintsSlot" },
    },
    {
      title: "制作进度 / 挂机",
      field: "production",
      width: 175,
      slots: { default: "productionSlot" },
    },
    buildTimeColumn("创建时间", "createTime", 160),
    buildTimeColumn("更新时间", "updateTime", 160),
    { title: "ID", field: "id", width: 190, slots: { default: "idSlot" } },
    buildOperationColumn("operationDefaultSlot"),
  ],
});

watchEffect(() => {
  gridOptions.value.maxHeight = Math.max(height.value - 280, 360);
});

const dataSource = ref<DesignInspiration[]>([]);
const loading = ref(false);
const ids = ref<string[]>([]);
const total = ref(0);
const deleteLoading = ref(false);
const formRef = ref<FormInstance>();
const dialogTitle = ref("");
const dialogVisible = ref(false);
const submitLoading = ref(false);
const isEdit = ref(false);

// 工位统计与历史流水抽屉
const historyDrawerVisible = ref(false);
const activeHistoryInspiration = ref<DesignInspiration | null>(null);

function openJobHistory(row: DesignInspiration) {
  activeHistoryInspiration.value = row;
  historyDrawerVisible.value = true;
}

const stats = reactive<DesignJobStats>({
  onlineStations: 0,
  activeJobs: 0,
  todayCompleted: 0,
  todayApproved: 0,
  todayRejected: 0,
  todayReworked: 0,
  approvalRate: 100,
});

async function fetchStats() {
  try {
    const res = await getDesignJobStats();
    if (res) {
      Object.assign(stats, res);
    }
  } catch (error) {
    console.warn("获取工位统计失败:", error);
  }
}

async function handleToggleAutoEnabled(row: any, val: boolean) {
  row._switchLoading = true;
  try {
    await updateDesignInspiration({
      id: row.id,
      title: row.title,
      autoEnabled: val,
    });
    ElMessage.success(val ? "已加入自动制作队列" : "已暂停自动制作");
  } catch (error: any) {
    row.autoEnabled = !val;
    ElMessage.error(error?.message || "切换失败");
  } finally {
    row._switchLoading = false;
  }
}

const imageFileList = ref<UploadUserFile[]>([]);
const previewDialogVisible = ref(false);
const previewImageUrl = ref("");

// 移动端卡片展开状态
const expandedCards = reactive<Record<string, boolean>>({});

function toggleExpand(id: string) {
  expandedCards[id] = !expandedCards[id];
}

function formatTime(val?: string | number | Date) {
  if (!val) return "-";
  return formatTimestamp(val);
}

// 移动端全选/部分选中计算属性
const selectedCountInPage = computed(() => {
  return dataSource.value.filter(
    (item: DesignInspiration) => item.id && ids.value.includes(item.id),
  ).length;
});

const isAllSelected = computed(() => {
  return (
    dataSource.value.length > 0 && selectedCountInPage.value === dataSource.value.length
  );
});

const isIndeterminate = computed(() => {
  return selectedCountInPage.value > 0 && selectedCountInPage.value < dataSource.value.length;
});

function handleCardSelect(id: string, checked: boolean) {
  if (checked) {
    if (!ids.value.includes(id)) {
      ids.value.push(id);
    }
  } else {
    ids.value = ids.value.filter((item) => item !== id);
  }
}

function toggleCardSelect(id: string) {
  handleCardSelect(id, !ids.value.includes(id));
}

function handleSelectAllMobile(val: any) {
  const pageIds = dataSource.value
    .map((item: DesignInspiration) => item.id)
    .filter(Boolean) as string[];
  if (val) {
    ids.value = Array.from(new Set([...ids.value, ...pageIds]));
  } else {
    const pageIdSet = new Set(pageIds);
    ids.value = ids.value.filter((id) => !pageIdSet.has(id));
  }
}

function handleImagePreview(file: UploadUserFile) {
  previewImageUrl.value = file.url || "";
  previewDialogVisible.value = true;
}

const defaultForm = () => ({
  id: "",
  title: "",
  content: "",
  keywordsText: "",
  category: "",
  promptHints: "",
  avoidNotes: "",
  priority: 2,
  autoEnabled: true,
  targetCount: null as number | null,
  sizeHint: "",
  images: [] as string[],
});

const form = ref(defaultForm());

const rules: FormRules = {
  // 名称与内容均不强制：灵感可以只有一张参考图、或只有关键词
  title: [{ max: 200, message: "标题长度不能超过 200 个字符", trigger: "blur" }],
  content: [{ max: 4000, message: "内容长度不能超过 4000 个字符", trigger: "blur" }],
  category: [{ max: 80, message: "分类长度不能超过 80 个字符", trigger: "blur" }],
};

async function copyId(id?: string | number) {
  const text = String(id || "");
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
    ElMessage.success("ID 已复制");
  } catch {
    // 剪贴板不可用时退化为可选中文本
    ElMessage.info(`ID：${text}`);
  }
}

function parseKeywords(value: string) {
  return value
    .split(/[,，、\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

async function getList() {
  loading.value = true;
  try {
    const res = await getDesignInspirationPage({ ...queryParams });
    dataSource.value = res.list || [];
    total.value = Number(res.total || 0);
    ids.value = [];
  } catch (error) {
    console.error("获取设计灵感失败:", error);
    ElMessage.error("获取设计灵感失败");
  } finally {
    loading.value = false;
  }
}

function handleSearch() {
  queryParams.currentPage = 1;
  getList();
}

function handleReset() {
  queryParams.keyword = "";
  queryParams.category = "";
  handleSearch();
}

function handleAdd() {
  isEdit.value = false;
  dialogTitle.value = "新增设计灵感";
  form.value = defaultForm();
  imageFileList.value = [];
  dialogVisible.value = true;
}

function handleEdit(row: DesignInspiration) {
  isEdit.value = true;
  dialogTitle.value = "编辑设计灵感";
  form.value = {
    id: row.id || "",
    title: row.title,
    content: row.content,
    keywordsText: (row.keywords || []).join(", "),
    category: row.category || "",
    promptHints: row.promptHints || "",
    avoidNotes: row.avoidNotes || "",
    priority: row.priority ?? 2,
    autoEnabled: row.autoEnabled ?? true,
    targetCount: row.targetCount ?? null,
    sizeHint: row.sizeHint ?? "",
    images: [...(row.images || [])],
  };
  imageFileList.value = (row.images || []).map((url: string, idx: number) => ({
    name: `ref-${idx + 1}`,
    url,
  }));
  dialogVisible.value = true;
}

function checkboxChange(e: any) {
  ids.value = e.records.map((item: any) => item.id);
}

function checkboxAllChange(e: any) {
  ids.value = e.records.map((item: any) => item.id);
}

function handleDelete(row?: DesignInspiration | null) {
  const delIds = row?.id ? [row.id] : [...ids.value];
  if (!delIds.length) {
    return ElMessage.warning("请选择要删除的数据");
  }

  const message = row
    ? `确认删除设计灵感"${row.title}"吗？（关联的参考图也将同步从云存储删除）`
    : `确认删除选中的 ${delIds.length} 条数据吗？（关联的参考图也将同步从云存储删除）`;
  ElMessageBox.confirm(message, "删除提示", {
    confirmButtonText: "确认",
    cancelButtonText: "取消",
    type: "warning",
  })
    .then(async () => {
      try {
        deleteLoading.value = true;
        await deleteDesignInspiration(delIds);
        ElMessage.success(`成功删除 ${delIds.length} 条数据`);
        if (dataSource.value.length === delIds.length && queryParams.currentPage > 1) {
          queryParams.currentPage--;
        }
        getList();
      } catch (error) {
        console.error("删除设计灵感失败:", error);
        ElMessage.error("删除失败");
      } finally {
        deleteLoading.value = false;
      }
    })
    .catch(() => {});
}

function dialogClose() {
  dialogVisible.value = false;
  submitLoading.value = false;
  imageFileList.value = [];
  formRef.value?.resetFields();
}

async function uploadPendingImages(): Promise<string[]> {
  const finalUrls: string[] = [];
  const total = imageFileList.value.length;
  console.log(`[设计灵感上传] 开始处理图片，共 ${total} 张`);
  for (const [index, file] of imageFileList.value.entries()) {
    console.log(`[设计灵感上传] 处理第 ${index + 1}/${total} 张, raw=${!!file.raw}, url=${file.url || '无'}`);
    if (file.raw) {
      const rawFile = file.raw as File;
      console.log(`[设计灵感上传] 准备上传第 ${index + 1} 张到 COS: name=${rawFile.name}, size=${rawFile.size}, type=${rawFile.type}`);
      try {
        const userAccount = (userStore.user as any)?.account || userStore.user?.shortName || userStore.user?.name || "anonymous";
        const userId = (userStore.user as any)?.id || (userStore as any).userInfo?.id;
        console.log(`[设计灵感上传] 用户信息: account=${userAccount}, userId=${userId}`);
        const res = await uploadToCOS({
          file: rawFile,
          category: "design-inspiration",
          account: userAccount,
          userId,
          onProgress: (progressData: any) => {
            console.log(`[设计灵感上传] 第 ${index + 1} 张上传进度:`, progressData);
          },
        });
        const url = (res as any)?.url || (typeof res === "string" ? res : "");
        console.log(`[设计灵感上传] 第 ${index + 1} 张上传完成, url=${url}`);
        if (url) {
          finalUrls.push(url);
        }
      } catch (error: any) {
        console.error(`[设计灵感上传] 第 ${index + 1} 张上传失败:`, error?.message || error);
        throw error;
      }
    } else if (file.url) {
      console.log(`[设计灵感上传] 第 ${index + 1} 张为已有 URL，跳过上传`);
      finalUrls.push(file.url);
    }
  }
  console.log(`[设计灵感上传] 图片处理完成，共 ${finalUrls.length} 个 URL`);
  return finalUrls;
}

async function submitForm() {
  if (!formRef.value) return;
  try {
    console.log("[设计灵感提交] 开始表单验证");
    await formRef.value.validate();
    console.log("[设计灵感提交] 表单验证通过，开始上传图片");
    submitLoading.value = true;

    // 上传新增的本地待传图片到 COS
    const images = await uploadPendingImages();
    console.log("[设计灵感提交] 图片上传完成，images=", images);

    const payload: DesignInspiration = {
      id: form.value.id || undefined,
      title: form.value.title || "",
      content: form.value.content || "",
      category: form.value.category,
      keywords: parseKeywords(form.value.keywordsText),
      images,
      promptHints: form.value.promptHints,
      avoidNotes: form.value.avoidNotes,
      priority: form.value.priority,
      autoEnabled: form.value.autoEnabled,
      targetCount: form.value.targetCount,
      sizeHint: form.value.sizeHint,
    };

    console.log("[设计灵感提交] 准备提交数据", payload);

    if (isEdit.value) {
      await updateDesignInspiration(payload);
      ElMessage.success("更新成功");
    } else {
      await createDesignInspiration(payload);
      ElMessage.success("新增成功");
    }

    console.log("[设计灵感提交] 提交成功");
    dialogVisible.value = false;
    getList();
  } catch (error: any) {
    console.error("[设计灵感提交] 失败:", error);
    ElMessage.error(error?.message || "操作失败");
  } finally {
    submitLoading.value = false;
  }
}

let statsIntervalTimer: any = null;

onMounted(() => {
  getList();
  fetchStats();
  statsIntervalTimer = setInterval(fetchStats, 15000);
});

onUnmounted(() => {
  if (statsIntervalTimer) {
    clearInterval(statsIntervalTimer);
  }
});
</script>

<style scoped>
/* ================= 工位监控胶囊条 ================= */
.station-monitor-capsule-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 14px;
  margin-bottom: 10px;
  background: var(--el-bg-color-overlay, #ffffff);
  border: 1px solid var(--el-border-color-light, #e2e8f0);
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
  backdrop-filter: blur(8px);
}

:global(html.dark) .station-monitor-capsule-bar {
  background: var(--el-bg-color-overlay, #1d1e1f);
  border-color: var(--el-border-color-darker, #363637);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.35);
}

.monitor-left {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.station-pulse-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 500;
  padding: 4px 10px;
  border-radius: 6px;
  white-space: nowrap;
  flex-shrink: 0;
  background: var(--el-fill-color-light, #f5f7fa);
  border: 1px solid var(--el-border-color-lighter, #e4e7ed);
  color: var(--el-text-color-regular, #606266);
  transition: all 0.25s ease;
}

.station-pulse-badge.is-active {
  background: #f0fdf4;
  border-color: #bbf7d0;
  color: #15803d;
}

:global(html.dark) .station-pulse-badge {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.1);
  color: #94a3b8;
}

:global(html.dark) .station-pulse-badge.is-active {
  background: rgba(34, 197, 94, 0.12);
  border-color: rgba(34, 197, 94, 0.28);
  color: #86efac;
}

.station-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--el-color-info-light-3, #c0c4cc);
  transition: all 0.3s ease;
}

.station-dot.is-active {
  background: var(--el-color-success, #67c23a);
  box-shadow: 0 0 0 0 rgba(103, 194, 58, 0.7);
  animation: pulse-green 1.8s infinite;
}

.monitor-stat-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 12px;
  white-space: nowrap;
  flex-shrink: 0;
  background: var(--el-fill-color-light, #f5f7fa);
  border: 1px solid var(--el-border-color-lighter, #e4e7ed);
  transition: all 0.2s ease;
}

:global(html.dark) .monitor-stat-pill {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.08);
}

.monitor-stat-pill .stat-label {
  color: var(--el-text-color-secondary, #909399);
  font-size: 12px;
}

:global(html.dark) .monitor-stat-pill .stat-label {
  color: #94a3b8;
}

.monitor-stat-pill .stat-val {
  font-weight: 700;
  font-size: 13px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}

.monitor-stat-pill .stat-val.default {
  color: var(--el-text-color-primary, #303133);
}

:global(html.dark) .monitor-stat-pill .stat-val.default {
  color: #f1f5f9;
}

.monitor-stat-pill .stat-val.highlight {
  color: var(--el-color-primary, #409eff);
}

:global(html.dark) .monitor-stat-pill .stat-val.highlight {
  color: #60a5fa;
}

.monitor-stat-pill .stat-val.success {
  color: var(--el-color-success, #67c23a);
}

:global(html.dark) .monitor-stat-pill .stat-val.success {
  color: #4ade80;
}

.monitor-stat-pill .stat-val.warning {
  color: var(--el-color-warning, #e6a23c);
}

:global(html.dark) .monitor-stat-pill .stat-val.warning {
  color: #fbbf24;
}

.monitor-stat-pill .stat-val.rate {
  color: #6366f1;
}

:global(html.dark) .monitor-stat-pill .stat-val.rate {
  color: #a5b4fc;
}

/* ================= 表格制作进度单元格 ================= */
.production-cell {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.production-status-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
}

.production-progress-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 11px;
}

.progress-text {
  color: var(--el-text-color-secondary);
  font-size: 11px;
}

.history-btn {
  padding: 0;
  height: auto;
  font-size: 11px;
}

.mini-pulse-dot {
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #ffffff;
  margin-right: 2px;
  animation: pulse-mini 1.2s infinite;
}

@keyframes pulse-mini {
  0% { opacity: 0.4; }
  50% { opacity: 1; }
  100% { opacity: 0.4; }
}

@keyframes pulse-green {
  0% {
    transform: scale(0.95);
    box-shadow: 0 0 0 0 rgba(103, 194, 58, 0.7);
  }
  70% {
    transform: scale(1);
    box-shadow: 0 0 0 6px rgba(103, 194, 58, 0);
  }
  100% {
    transform: scale(0.95);
    box-shadow: 0 0 0 0 rgba(103, 194, 58, 0);
  }
}

.mobile-prod-tag {
  background: var(--el-fill-color-darker);
  color: var(--el-text-color-regular);
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 11px;
  margin-right: 6px;
}

:deep(.design-inspiration-page) {
  gap: 10px;
  padding: 8px 0 0;
}

:deep(.design-inspiration-page .list-page-filter--flat) {
  gap: 10px;
  padding-bottom: 10px;
}

.inspiration-image-upload-wrapper {
  width: 100%;
}

.inspiration-image-upload :deep(.el-upload--picture-card) {
  width: 68px;
  height: 68px;
  line-height: 72px;
}

.inspiration-image-upload :deep(.el-upload-list--picture-card .el-upload-list__item) {
  width: 68px;
  height: 68px;
}

.inspiration-image-upload__tip {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  line-height: 1.4;
  margin-top: 6px;
}

.design-inspiration-title {
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.design-inspiration-content {
  display: -webkit-box;
  overflow: hidden;
  line-height: 1.5;
  color: var(--el-text-color-secondary);
  word-break: break-all;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.design-inspiration-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

/* ================= 移动端专属卡片样式 ================= */
.mobile-inspiration-container {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
  min-width: 0;
}

.mobile-batch-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: var(--el-fill-color-light);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  font-size: 13px;
}

.mobile-batch-text {
  font-size: 13px;
  color: var(--el-text-color-regular);
}

.mobile-loading-skeleton {
  padding: 16px;
  background: var(--el-bg-color-overlay);
  border-radius: 12px;
  border: 1px solid var(--el-border-color-lighter);
}

.mobile-inspiration-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
  min-width: 0;
}

.mobile-inspiration-card {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px;
  background: var(--el-bg-color-overlay);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 12px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
  transition: all 0.2s ease;
  cursor: pointer;
  box-sizing: border-box;
}

.mobile-inspiration-card.is-selected {
  border-color: var(--el-color-primary);
  background: color-mix(in srgb, var(--el-color-primary) 5%, var(--el-bg-color-overlay));
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.12);
}

.mobile-card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
}

.mobile-card-header__left {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  flex: 1;
}

.mobile-card-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  line-height: 1.4;
  word-break: break-word;
}

.mobile-card-category {
  flex-shrink: 0;
}

/* 参考图横向滑槽 */
.id-copy {
  display: inline-block;
  font-family: monospace;
  font-size: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 170px;
  cursor: pointer;
  border-bottom: 1px dashed var(--el-border-color);
}

.id-copy:hover {
  color: var(--el-color-primary);
  border-bottom-color: var(--el-color-primary);
}

.mobile-card-images {
  margin-top: 2px;
}

.mobile-card-images__scroll {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 4px;
  -webkit-overflow-scrolling: touch;
}

.mobile-card-thumb {
  width: 72px;
  height: 72px;
  border-radius: 8px;
  border: 1px solid var(--el-border-color-lighter);
  flex-shrink: 0;
  cursor: pointer;
  background: var(--el-fill-color-light);
}

.mobile-card-images__info {
  font-size: 11px;
  color: var(--el-text-color-secondary);
  margin-top: 4px;
}

/* 灵感主体内容 */
.mobile-card-body {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.mobile-card-content {
  font-size: 13px;
  line-height: 1.6;
  color: var(--el-text-color-regular);
  word-break: break-word;
  white-space: pre-wrap;
}

.mobile-card-content.is-clamped {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
  overflow: hidden;
}

.mobile-card-expand-toggle {
  align-self: flex-start;
  border: none;
  background: transparent;
  color: var(--el-color-primary);
  font-size: 12px;
  font-weight: 500;
  padding: 0;
  cursor: pointer;
  line-height: 1.4;
}

/* 关键词标签 */
.mobile-card-keywords {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.mobile-card-tag {
  font-size: 11px;
  border-radius: 4px;
}

/* 提示词片段 & 避让事项 */
.mobile-card-meta-chips {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 2px;
}

.meta-chip {
  padding: 8px 10px;
  border-radius: 8px;
  font-size: 12px;
}

.meta-chip__title {
  display: flex;
  align-items: center;
  gap: 5px;
  font-weight: 600;
  margin-bottom: 4px;
  font-size: 12px;
}

.meta-chip__body {
  line-height: 1.45;
  word-break: break-word;
}

.prompt-hints-chip {
  background: color-mix(in srgb, var(--el-color-primary) 8%, var(--el-bg-color-overlay));
  border: 1px solid color-mix(in srgb, var(--el-color-primary) 20%, transparent);
}

.prompt-hints-chip .meta-chip__title {
  color: var(--el-color-primary);
}

.prompt-hints-chip .meta-chip__body {
  color: var(--el-text-color-primary);
}

.avoid-notes-chip {
  background: color-mix(in srgb, var(--el-color-warning) 8%, var(--el-bg-color-overlay));
  border: 1px solid color-mix(in srgb, var(--el-color-warning) 20%, transparent);
}

.avoid-notes-chip .meta-chip__title {
  color: var(--el-color-warning-dark-2);
}

.avoid-notes-chip .meta-chip__body {
  color: var(--el-text-color-primary);
}

/* 底部操作与时间 */
.mobile-card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 8px;
  border-top: 1px dashed var(--el-border-color-lighter);
  margin-top: 2px;
}

.mobile-card-time {
  font-size: 11px;
  color: var(--el-text-color-secondary);
}

.mobile-card-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.mobile-card-actions :deep(.el-button) {
  padding: 4px 6px;
  font-size: 13px;
}

/* ================= 设计灵感弹窗 (基础与桌面端，彻底清除多余横向滚动条) ================= */
.design-inspiration-dialog :deep(.el-dialog) {
  border-radius: 12px;
  overflow: hidden;
}

.design-inspiration-dialog :deep(.el-dialog__header) {
  padding: 16px 20px 12px;
  margin-right: 0;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.design-inspiration-dialog :deep(.el-dialog__body) {
  padding: 18px 20px 6px;
  overflow-x: hidden !important;
}

.design-inspiration-dialog__scroll {
  overflow-x: hidden !important;
}

.design-inspiration-dialog__scroll :deep(.el-scrollbar__wrap) {
  overflow-x: hidden !important;
}

.design-inspiration-dialog__scroll :deep(.el-scrollbar__bar.is-horizontal) {
  display: none !important;
  opacity: 0 !important;
  pointer-events: none !important;
}

.design-inspiration-dialog__scroll :deep(.el-scrollbar__view) {
  padding-right: 14px;
  padding-left: 2px;
  overflow-x: hidden !important;
  box-sizing: border-box;
}

.design-inspiration-form {
  width: 100%;
  box-sizing: border-box;
  overflow-x: hidden;
}

.design-inspiration-form :deep(.el-row) {
  margin-left: 0 !important;
  margin-right: 0 !important;
}

.design-inspiration-form :deep(.el-form-item) {
  margin-bottom: 18px;
}

.design-inspiration-form :deep(.el-form-item__label) {
  font-weight: 500;
  color: var(--el-text-color-primary);
  white-space: nowrap;
}

.design-inspiration-dialog__footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 12px 20px 16px;
  border-top: 1px solid var(--el-border-color-lighter);
}

/* ================= 移动端适配响应式 ================= */
@media (width <= 767px) {
  .list-page-search-form__actions {
    display: grid !important;
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
    width: 100%;
    margin-top: 4px;
  }

  .list-page-search-form__actions .el-button {
    margin: 0 !important;
    width: 100%;
    height: 34px;
    font-size: 13px;
  }

  .design-inspiration-dialog :deep(.el-dialog) {
    width: calc(100vw - 16px) !important;
    max-height: calc(100vh - 16px);
    margin: 8px auto !important;
  }

  .design-inspiration-dialog :deep(.el-dialog__header) {
    padding: 12px 16px;
    margin-right: 0;
  }

  .design-inspiration-dialog :deep(.el-dialog__body) {
    padding: 12px 16px 0;
  }

  .design-inspiration-dialog__scroll :deep(.el-form-item) {
    margin-bottom: 14px;
  }

  .design-inspiration-dialog__scroll :deep(.el-form-item__label) {
    font-size: 13px;
  }

  .design-inspiration-dialog__scroll :deep(.el-textarea__inner) {
    font-size: 14px;
  }

  .design-inspiration-dialog__footer {
    display: flex;
    gap: 10px;
    padding: 12px 16px;
  }

  .design-inspiration-dialog__footer .el-button {
    flex: 1;
    height: 40px;
    font-size: 15px;
  }
}
</style>
