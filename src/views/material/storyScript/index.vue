<template>
  <ContentWrap :plain="true">
    <ListPageLayout class="story-script-page">
      <template #filter>
        <div class="list-page-filter list-page-filter--flat">
          <el-form
            :model="queryParams"
            label-position="top"
            class="list-page-search-form"
          >
            <el-row :gutter="12" class="list-page-search-form__row">
              <el-col class="list-page-search-form__col--base" :xs="24" :sm="12" :md="8" :lg="8" :xl="8">
                <el-form-item label="关键词">
                  <el-input
                    v-model="queryParams.keyword"
                    size="small"
                    placeholder="标题 / 正文 / 标签"
                    clearable
                    @keyup.enter="handleSearch"
                    @change="handleKeywordChange"
                  />
                </el-form-item>
              </el-col>
              <el-col class="list-page-search-form__col--base" :xs="24" :sm="12" :md="8" :lg="8" :xl="8">
                <el-form-item label="场景">
                  <el-select
                    v-model="queryParams.sceneType"
                    size="small"
                    clearable
                    placeholder="全部场景"
                    @change="getList"
                  >
                    <el-option label="社交平台文案" value="social_post" />
                    <el-option label="短视频字幕" value="short_video_subtitle" />
                    <el-option label="口播脚本" value="voiceover" />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col class="list-page-search-form__col--base" :xs="24" :sm="12" :md="8" :lg="8" :xl="8">
                <el-form-item label="素材ID">
                  <el-input
                    v-model="queryParams.stickerId"
                    size="small"
                    placeholder="请输入素材ID"
                    clearable
                    @keyup.enter="handleSearch"
                    @change="handleStickerIdChange"
                  />
                </el-form-item>
              </el-col>
            </el-row>
            <div class="list-page-search-form__actions">
              <el-button size="small" type="primary" :icon="Search" :loading="loading" @click="handleSearch">
                搜索
              </el-button>
              <el-button
                size="small"
                type="danger"
                :icon="Delete"
                :loading="deleteLoading"
                @click="handleBatchDelete"
              >
                批量删除 ({{ selectedIds.length }})
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
            <div class="common-table">
              <vxe-grid
                v-bind="gridOptions"
                :data="dataSource"
                :loading="loading"
                @checkbox-change="handleCheckboxChange"
                @checkbox-all="handleCheckboxAll"
              >
                <template #materialSlot="{ row }">
                  <div class="story-material-thumb">
                    <el-skeleton v-if="isMaterialHydrating(row)" animated>
                      <template #template>
                        <div class="story-material-skeleton"></div>
                      </template>
                    </el-skeleton>
                    <SingleImage
                      v-else-if="getMaterialPreview(row)"
                      :src="getMaterialPreview(row, 'list')"
                      :width="'100%'"
                      :height="'100%'"
                      fit="cover"
                      :alt="getMaterialName(row)"
                    />
                    <div v-else class="story-material-placeholder">暂无预览</div>
                  </div>
                </template>
                <template #materialNameSlot="{ row }">
                  <div class="story-cell-text">{{ getMaterialName(row) }}</div>
                </template>
                <template #materialIdSlot="{ row }">
                  <div class="story-cell-text">{{ row.stickerId || "-" }}</div>
                </template>
                <template #sceneSlot="{ row }">
                  <el-tag effect="plain" size="small">{{ getSceneLabel(row.sceneType) }}</el-tag>
                </template>
                <template #contentSlot="{ row }">
                  <div class="story-content-cell">{{ row.content || "-" }}</div>
                </template>
                <template #hashtagsSlot="{ row }">
                  <div class="story-hashtag-cell">{{ row.hashtags || "-" }}</div>
                </template>
                <template #createTimeSlot="{ row }">
                  <span class="table-time-text">{{ formatTimestamp(row.createTime) }}</span>
                </template>
                <template #uploaderSlot="{ row }">
                  <span>{{ row?.uploader?.account || row?.uploader?.name || row?.userId || "-" }}</span>
                </template>
                <template #operationDefaultSlot="{ row }">
                  <div class="flex justify-start">
                    <el-dropdown
                      class="operation-dropdown"
                      placement="bottom-end"
                      @command="(command) => handleOperationCommand(String(command), row)"
                    >
                      <el-button type="primary" link size="small" class="operation-trigger-button">操作</el-button>
                      <template #dropdown>
                        <el-dropdown-menu class="operation-menu-compact">
                          <el-dropdown-item command="detail">
                            <el-icon><View /></el-icon>
                            <span>查看详情</span>
                          </el-dropdown-item>
                          <el-dropdown-item command="delete" divided class="operation-menu-item--danger">
                            <el-icon><Delete /></el-icon>
                            <span>删除</span>
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
  </ContentWrap>

  <el-dialog
    v-model="detailVisible"
    title="故事脚本详情"
    fullscreen
    destroy-on-close
    class="story-detail-dialog"
  >
    <div v-if="currentRow" class="story-detail-layout story-detail-fullscreen">
      <el-card shadow="never" class="story-detail-material-card story-detail-card">
        <template #header>关联素材</template>
        <div class="story-detail-material">
          <div class="story-detail-thumb">
            <el-skeleton v-if="isMaterialHydrating(currentRow)" animated>
              <template #template>
                <div class="story-detail-skeleton"></div>
              </template>
            </el-skeleton>
            <SingleImage
              v-else-if="getMaterialPreview(currentRow)"
              :src="getMaterialPreview(currentRow, 'detail')"
              :width="'100%'"
              :height="'100%'"
              fit="cover"
              :alt="getMaterialName(currentRow)"
            />
            <div v-else class="story-material-placeholder">暂无预览</div>
          </div>
          <div class="story-detail-meta">
            <div><strong>素材名称：</strong>{{ getMaterialName(currentRow) }}</div>
            <div><strong>素材ID：</strong>{{ currentRow.stickerId || "-" }}</div>
            <div><strong>场景：</strong>{{ getSceneLabel(currentRow.sceneType) }}</div>
            <div><strong>创建时间：</strong>{{ formatTimestamp(currentRow.createTime) }}</div>
          </div>
        </div>
      </el-card>

      <div class="story-detail-grid">
        <el-card shadow="never" class="story-detail-card">
          <template #header>脚本信息</template>
          <div class="story-detail-section">
            <div><strong>标题：</strong>{{ currentRow.title || "-" }}</div>
            <div class="story-detail-content-block">
              <strong>正文：</strong>
              <div class="story-detail-text">{{ currentRow.content || "-" }}</div>
            </div>
            <div v-if="currentRow.subtitleContent" class="story-detail-content-block">
              <strong>字幕稿：</strong>
              <pre class="story-detail-text preformatted">{{ currentRow.subtitleContent }}</pre>
            </div>
            <div><strong>标签：</strong>{{ currentRow.hashtags || "-" }}</div>
          </div>
        </el-card>

        <el-card shadow="never" class="story-detail-card">
          <template #header>生成配置</template>
          <div class="story-detail-section">
            <div><strong>风格要求：</strong>{{ currentRow.stylePrompt || "-" }}</div>
            <div><strong>语气要求：</strong>{{ currentRow.tonePrompt || "-" }}</div>
            <div><strong>长度要求：</strong>{{ currentRow.lengthPrompt || "-" }}</div>
            <div><strong>补充要求：</strong>{{ currentRow.extraPrompt || "-" }}</div>
          </div>
        </el-card>
      </div>
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { Delete, Search, View } from "@element-plus/icons-vue";
import { useWindowSize } from "@vueuse/core";
import { formatTimestamp } from "@/common/date";
import { buildOperationColumn, buildTimeColumn, commonGridOptions } from "@/common/table";
import {
  batchDeleteStickerStoryScript,
  deleteStickerStoryScript,
  getMaterialList,
  getStickerStoryScriptPage,
} from "@/api/material";
import { getFastPreviewImageUrl } from "@/utils/image";
import Pagination from "@/components/Pagination/index.vue";
import ListPageLayout from "@/components/ListPageLayout/index.vue";

const loading = ref(false);
const total = ref(0);
const dataSource = ref<any[]>([]);
const detailVisible = ref(false);
const currentRow = ref<any>(null);
const materialMap = ref<Record<string, any>>({});
const selectedIds = ref<string[]>([]);
const materialLoadingIds = ref<string[]>([]);
const deleteLoading = ref(false);

const queryParams = reactive({
  currentPage: 1,
  pageSize: 20,
  keyword: "",
  sceneType: "",
  stickerId: "",
});

const sceneLabelMap: Record<string, string> = {
  social_post: "社交平台文案",
  short_video_subtitle: "短视频字幕",
  voiceover: "口播脚本",
};

const { height } = useWindowSize();
const gridOptions = computed(() => ({
  ...commonGridOptions,
  maxHeight: Math.max(height.value - 280, 360),
  rowConfig: { keyField: "id" },
  checkboxConfig: { reserve: true },
  columns: [
    { type: "checkbox", width: 48 },
    { title: "预览", field: "stickerId", width: 110, slots: { default: "materialSlot" } },
    {
      title: "素材名称",
      field: "materialName",
      minWidth: 180,
      slots: { default: "materialNameSlot" },
    },
    { title: "素材ID", field: "stickerId", width: 120, slots: { default: "materialIdSlot" } },
    { title: "场景", field: "sceneType", width: 140, slots: { default: "sceneSlot" } },
    { title: "标题", field: "title", minWidth: 220, showOverflow: true },
    { title: "正文", field: "content", minWidth: 360, slots: { default: "contentSlot" } },
    { title: "标签", field: "hashtags", minWidth: 220, slots: { default: "hashtagsSlot" } },
    { title: "上传者", field: "uploader", width: 140, slots: { default: "uploaderSlot" } },
    { ...buildTimeColumn("创建时间", "createTime", 180), slots: { default: "createTimeSlot" } },
    buildOperationColumn("operationDefaultSlot"),
  ],
}));

watch(
  () => dataSource.value,
  () => {
    hydrateRelatedMaterials();
  },
  { deep: true },
);

function handleKeywordChange(val: string) {
  if (!val) getList();
}

function handleStickerIdChange(val: string) {
  if (!val) getList();
}

function handleSearch() {
  queryParams.currentPage = 1;
  getList();
}

function getSceneLabel(sceneType?: string) {
  return sceneLabelMap[sceneType || ""] || sceneType || "-";
}

function getRelatedMaterial(row: any) {
  return materialMap.value[String(row?.stickerId || "")] || null;
}

function getMaterialName(row: any) {
  const material = getRelatedMaterial(row);
  return material?.name || "未命名素材";
}

function getMaterialPreview(row: any, scene: "list" | "detail" = "list") {
  const material = getRelatedMaterial(row);
  if (!material?.url) return "";
  const width = scene === "detail" ? 420 : 240;
  return getFastPreviewImageUrl(material.url, { width });
}

function isMaterialHydrating(row: any) {
  const id = String(row?.stickerId || "");
  if (!id) return false;
  return materialLoadingIds.value.includes(id) && !materialMap.value[id];
}

async function hydrateRelatedMaterials() {
  const ids = Array.from(
    new Set(dataSource.value.map((item) => String(item?.stickerId || "")).filter(Boolean)),
  );
  if (!ids.length) {
    materialMap.value = {};
    materialLoadingIds.value = [];
    return;
  }

  const nextMap: Record<string, any> = { ...materialMap.value };
  const pendingIds = ids.filter((id) => !nextMap[id]);
  materialLoadingIds.value = pendingIds;
  await Promise.all(
    ids.map(async (id) => {
      if (nextMap[id]) return;
      try {
        const result: any = await getMaterialList({ currentPage: 1, pageSize: 1, id });
        const row = result?.list?.[0] || result?.records?.[0] || null;
        if (row) nextMap[id] = row;
      } catch {
        nextMap[id] = { id, name: "", url: "" };
      }
    }),
  );
  materialMap.value = nextMap;
  materialLoadingIds.value = [];
}

async function getList() {
  loading.value = true;
  try {
    const result: any = await getStickerStoryScriptPage({ ...queryParams });
    dataSource.value = result?.list || result?.records || [];
    total.value = result?.total || 0;
    selectedIds.value = [];
  } catch (error: any) {
    dataSource.value = [];
    total.value = 0;
    selectedIds.value = [];
    ElMessage.error(error?.message || "获取故事脚本列表失败");
  } finally {
    loading.value = false;
  }
}

function handleCheckboxChange({ records }: any) {
  selectedIds.value = records.map((item: any) => item.id);
}

function handleCheckboxAll({ records }: any) {
  selectedIds.value = records.map((item: any) => item.id);
}

function openDetail(row: any) {
  currentRow.value = row;
  detailVisible.value = true;
}

async function handleDelete(row: any) {
  try {
    await ElMessageBox.confirm(`确认删除脚本「${row.title || row.id}」吗？`, "删除确认", {
      type: "warning",
    });
    deleteLoading.value = true;
    await deleteStickerStoryScript(row.id);
    ElMessage.success("删除成功");
    if (dataSource.value.length === 1 && queryParams.currentPage > 1) {
      queryParams.currentPage -= 1;
    }
    await getList();
  } catch (error: any) {
    if (error !== "cancel") {
      ElMessage.error(error?.message || "删除故事脚本失败");
    }
  } finally {
    deleteLoading.value = false;
  }
}

async function handleBatchDelete() {
  if (!selectedIds.value.length) {
    ElMessage.warning("请选择要删除的故事脚本");
    return;
  }

  try {
    await ElMessageBox.confirm(
      `确认删除选中的 ${selectedIds.value.length} 条故事脚本吗？`,
      "批量删除",
      { type: "warning" },
    );
    deleteLoading.value = true;
    await batchDeleteStickerStoryScript(selectedIds.value);
    ElMessage.success("批量删除成功");
    if (dataSource.value.length === selectedIds.value.length && queryParams.currentPage > 1) {
      queryParams.currentPage -= 1;
    }
    selectedIds.value = [];
    await getList();
  } catch (error: any) {
    if (error !== "cancel") {
      ElMessage.error(error?.message || "批量删除故事脚本失败");
    }
  } finally {
    deleteLoading.value = false;
  }
}

function handleOperationCommand(command: string, row: any) {
  if (command === "detail") {
    openDetail(row);
    return;
  }
  if (command === "delete") {
    handleDelete(row);
  }
}

onMounted(() => {
  getList();
});
</script>

<style scoped>
.story-material-thumb {
  width: 84px;
  height: 84px;
  overflow: hidden;
  background: var(--list-page-surface-bg-soft);
  border: 1px solid var(--app-content-border-color);
  border-radius: 14px;
  flex-shrink: 0;
}

:deep(.story-script-page) {
  gap: 10px;
  padding: 8px 0 0;
}

:deep(.story-script-page .list-page-layout__main) {
  gap: 10px;
}

:deep(.story-script-page .list-page-filter--flat) {
  gap: 10px;
  padding-bottom: 10px;
}

:deep(.story-script-page .list-page-table-panel__pagination--flat) {
  padding-top: 10px;
}

.story-material-placeholder {
  display: flex;
  width: 100%;
  height: 100%;
  padding: 6px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  text-align: center;
  align-items: center;
  justify-content: center;
}

.story-material-skeleton,
.story-detail-skeleton {
  width: 100%;
  height: 100%;
  background: linear-gradient(
    110deg,
    color-mix(in srgb, var(--app-content-surface-muted-color) 88%, white) 25%,
    color-mix(in srgb, var(--app-content-surface-muted-color) 72%, white) 37%,
    color-mix(in srgb, var(--app-content-surface-muted-color) 88%, white) 63%
  );
  background-size: 400% 100%;
  border-radius: inherit;
  animation: story-material-shimmer 1.4s ease infinite;
}

.story-cell-text,
.story-title-text {
  font-weight: 500;
  line-height: 1.5;
  color: var(--el-text-color-primary);
  word-break: break-word;
}

.story-content-cell,
.story-hashtag-cell {
  display: -webkit-box;
  overflow: hidden;
  line-height: 1.7;
  color: var(--el-text-color-regular);
  word-break: break-word;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
}

.story-detail-card {
  overflow: hidden;
  background: var(--list-page-surface-bg);
  border: 1px solid var(--app-content-border-color);
  border-radius: 12px;
  box-shadow: none;
}

.story-detail-layout {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.story-detail-material {
  display: flex;
  gap: 16px;
  align-items: flex-start;
}

.story-detail-thumb {
  width: 180px;
  height: 180px;
  overflow: hidden;
  background: var(--list-page-surface-bg-soft);
  border: 1px solid var(--app-content-border-color);
  border-radius: 12px;
  flex-shrink: 0;
}

.story-detail-meta,
.story-detail-section {
  display: flex;
  line-height: 1.7;
  color: var(--el-text-color-regular);
  flex-direction: column;
  gap: 12px;
}

.story-detail-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr);
  gap: 16px;
  min-height: 0;
}

.story-detail-content-block {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.story-detail-text {
  word-break: break-word;
  white-space: pre-wrap;
}

.preformatted {
  margin: 0;
  font-family: inherit;
}

@media (width <= 960px) {
  .story-detail-grid {
    grid-template-columns: 1fr;
  }

  .story-detail-material {
    flex-direction: column;
  }
}

@keyframes story-material-shimmer {
  0% {
    background-position: 100% 50%;
  }

  100% {
    background-position: 0 50%;
  }
}

:deep(.story-detail-dialog .el-dialog__body) {
  height: calc(100vh - 56px);
  padding: 16px 20px 20px;
  overflow: hidden;
}

:deep(.story-detail-dialog.el-dialog.is-fullscreen) {
  width: 100vw !important;
  height: 100vh !important;
  max-width: 100vw !important;
  margin: 0 !important;
}

:deep(.story-detail-dialog.el-dialog.is-fullscreen .el-dialog__header) {
  padding: 16px 20px 12px;
}

:deep(.story-detail-card .el-card__header) {
  padding: 14px 16px;
  background: transparent;
  border-bottom: 1px solid rgb(255 255 255 / 6%);
}

:deep(.story-detail-card .el-card__body) {
  padding: 16px;
}

.story-detail-fullscreen {
  display: grid;
  height: 100%;
  grid-template-rows: auto minmax(0, 1fr);
  gap: 16px;
}

.story-detail-material-card {
  flex-shrink: 0;
}

.story-detail-grid :deep(.el-card) {
  height: 100%;
}

.story-detail-grid :deep(.el-card__body) {
  height: calc(100% - 56px);
  overflow: auto;
}
</style>
