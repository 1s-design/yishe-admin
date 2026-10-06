<template>
  <ContentWrap :plain="true">
    <ListPageLayout class="collect-file-page">
      <template #filter>
        <div class="list-page-filter list-page-filter--flat">
          <el-form :model="queryParams" label-position="top" class="list-page-search-form">
            <el-row :gutter="12" class="list-page-search-form__row">
              <el-col class="list-page-search-form__col--wide" :xs="24" :sm="12" :md="8" :lg="5">
                <el-form-item :label="t('collectFile.searchByName')">
                  <el-input
                    v-model="queryParams.searchText"
                    size="small"
                    :placeholder="t('collectFile.searchPlaceholder')"
                    clearable
                    @change="(val) => { if (!val) getList(); }"
                  />
                </el-form-item>
              </el-col>
              <el-col class="list-page-search-form__col--narrow" :xs="24" :sm="12" :md="8" :lg="4">
                <el-form-item :label="t('collectFile.sort')">
                  <el-select v-model="queryParams.sortingFields" size="small" :placeholder="t('collectFile.selectSortPlaceholder')" @change="getList">
                    <el-option :label="t('collectFile.createTimeDesc')" value="createTime DESC" />
                    <el-option :label="t('collectFile.createTimeAsc')" value="createTime ASC" />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col class="list-page-search-form__col--narrow" :xs="24" :sm="12" :md="8" :lg="4">
                <el-form-item :label="t('collectFile.fileType')">
                  <el-select v-model="queryParams.fileType" size="small" :placeholder="t('collectFile.selectFileTypePlaceholder')" clearable @change="getList">
                    <el-option :label="t('collectFile.all')" value="" />
                    <el-option :label="t('collectFile.image')" value="image" />
                    <el-option :label="t('collectFile.video')" value="video" />
                    <el-option :label="t('collectFile.audio')" value="audio" />
                    <el-option :label="t('collectFile.document')" value="document" />
                    <el-option :label="t('collectFile.other')" value="other" />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col class="list-page-search-form__col--narrow" :xs="24" :sm="12" :md="8" :lg="3">
                <el-form-item :label="t('collectFile.suffix')">
                  <el-select v-model="queryParams.suffix" size="small" :placeholder="t('collectFile.selectSuffixPlaceholder')" clearable @change="getList">
                    <el-option :label="t('collectFile.all')" value="" />
                    <el-option v-for="s in suffixOptions" :key="s" :label="s" :value="s" />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col class="list-page-search-form__col--narrow" :xs="24" :sm="12" :md="8" :lg="4">
                <el-form-item :label="t('collectFile.source')">
                  <el-input
                    v-model="queryParams.source"
                    size="small"
                    :placeholder="t('collectFile.selectSourcePlaceholder')"
                    clearable
                    @change="(val) => { if (!val) getList(); }"
                  />
                </el-form-item>
              </el-col>
              <el-col class="list-page-search-form__col--wide" :xs="24" :sm="12" :md="8" :lg="4">
                <el-form-item :label="t('collectFile.timeRange')">
                  <DateRangePicker
                    @change="
                      (val) => {
                        queryParams.startTime = val.start;
                        queryParams.endTime = val.end;
                        getList();
                      }
                    "
                  />
                </el-form-item>
              </el-col>
            </el-row>
            <div class="list-page-search-form__actions">
              <el-button size="small" type="primary" :icon="Search" :loading="loading" @click="getList">
                {{ t('collectFile.search') }}
              </el-button>
              <el-button size="small" :icon="Download" :disabled="!ids.length" @click="handleBatchDownload">
                {{ t('collectFile.downloadCount', { count: ids.length }) }}
              </el-button>
              <el-button size="small" :icon="FolderAdd" :disabled="!ids.length" @click="handleAddToFileResource()">
                {{ t('collectFile.addToResourceCount', { count: ids.length }) }}
              </el-button>
              <el-button size="small" type="danger" :icon="Delete" :disabled="!ids.length" @click="handleDelete()">
                {{ t('collectFile.batchDeleteCount', { count: ids.length }) }}
              </el-button>
            </div>
          </el-form>
        </div>
      </template>

      <template #table>
        <div class="list-page-panel list-page-panel--flat list-page-table-panel list-page-table-panel--flat">
          <div class="list-page-table-panel__body">
            <div class="common-table">
              <vxe-grid
                ref="gridRef"
                v-bind="gridOptions"
                :max-height="gridOptions.maxHeight"
                :data="dataSource"
                :loading="loading"
                @checkbox-change="checkboxChange"
                @checkbox-all="checkboxAllChange"
              >
                <template #previewDefaultSlot="{ row }">
                  <div class="table-media-cell table-file-cell p-2">
                    <video
                      v-if="row.url && isVideoFile(row.suffix)"
                      :src="row.url"
                      class="table-file-cell__video"
                      @click="openFilePreview(row)"
                      controls
                      preload="metadata"
                    />
                    <img
                      v-else-if="row.url && isImageFile(row.suffix)"
                      :src="row.url"
                      :alt="row.name || t('collectFile.collectFile')"
                      class="table-file-cell__image"
                      @click="openFilePreview(row)"
                    />
                    <div v-else-if="row.url && isAudioFile(row.suffix)" class="table-file-audio-card" @click="openFilePreview(row)">
                      <div class="table-file-audio-card__meta">
                        <el-icon size="18"><Headset /></el-icon>
                        <span class="table-file-audio-card__title">{{ row.name || t('collectFile.audioFile') }}</span>
                        <span class="table-file-audio-card__suffix">{{ String(row.suffix || '').toUpperCase() }}</span>
                      </div>
                      <div class="table-file-audio-card__player-wrap" @click.stop>
                        <audio :src="row.url" controls preload="metadata" class="table-file-audio-card__player" />
                      </div>
                    </div>
                    <div v-else class="table-file-doc-card" @click="openFilePreview(row)">
                      <el-icon size="24"><Document /></el-icon>
                      <div class="table-file-doc-card__title">{{ row.name || t('collectFile.collectFile') }}</div>
                      <div class="table-file-doc-card__tip">{{ String(row.suffix || 'FILE').toUpperCase() }}</div>
                    </div>
                  </div>
                </template>

                <template #nameSlot="{ row }">
                  <div class="flex items-center gap-2 flex-wrap">
                    <span>{{ row.name || t('collectFile.fileId', { id: row.id }) }}</span>
                  </div>
                </template>

                <template #sourceSlot="{ row }">
                  <el-tag v-if="row.source" size="small" effect="plain">{{ row.source }}</el-tag>
                  <span v-else>-</span>
                </template>

                <template #sizeSlot="{ row }">
                  <span>{{ formatFileSize(row.fileSize) }}</span>
                </template>

                <template #idSlot="{ row }">
                  <span style="font-size: 12px; color: #999">{{ row.id }}</span>
                </template>

                <template #operationDefaultSlot="{ row }">
                  <div class="flex items-center">
                    <el-dropdown trigger="click" @command="(cmd) => handleOperationCommand(cmd, row)" class="operation-dropdown">
                      <el-button type="primary" link size="small" class="operation-trigger-button">
                        {{ t('collectFile.operation') }}
                      </el-button>
                      <template #dropdown>
                        <el-dropdown-menu class="operation-menu-compact">
                          <el-dropdown-item command="preview">
                            <el-icon><View /></el-icon>
                            <span>{{ t('collectFile.preview') }}</span>
                          </el-dropdown-item>
                          <el-dropdown-item command="download">
                            <el-icon><Download /></el-icon>
                            <span>{{ t('collectFile.download') }}</span>
                          </el-dropdown-item>
                          <el-dropdown-item command="copy-link">
                            <el-icon><DocumentCopy /></el-icon>
                            <span>{{ t('collectFile.copyLink') }}</span>
                          </el-dropdown-item>
                          <el-dropdown-item command="add-to-resource">
                            <el-icon><FolderAdd /></el-icon>
                            <span>{{ t('collectFile.addToResource') }}</span>
                          </el-dropdown-item>
                          <el-dropdown-item command="delete" divided class="operation-menu-item--danger">
                            <el-icon><Delete /></el-icon>
                            <span>{{ t('collectFile.delete') }}</span>
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
        <div class="list-page-panel list-page-panel--flat list-page-table-panel__pagination list-page-table-panel__pagination--flat">
          <pagination
            v-model:page="queryParams.currentPage"
            v-model:limit="queryParams.pageSize"
            :total="total"
            @pagination="getList"
          />
        </div>
      </template>
    </ListPageLayout>

    <VideoPreview
      :visible="previewVisible"
      :file-url="currentPreviewUrl"
      :file-name="currentPreviewName"
      :file-suffix="currentPreviewSuffix"
      @close="closePreview"
    />
  </ContentWrap>
</template>

<script setup lang="ts">
import { ref, reactive, watchEffect } from "vue";
import { CollectFileApi, type CollectFileItem } from "@/api/collect-file";
import { createFileResource, getFileResourceList } from "@/api/file-resource";
import { buildOperationColumn, commonGridOptions } from "@/common/table";
import { formatTimestamp } from "@/common/date";
import { downloadFileByElement } from "@/common/download";
import { useWindowSize } from "@vueuse/core";
import VideoPreview from "../file-resource/VideoPreview.vue";
import DateRangePicker from "@/components/DateRangePicker.vue";
import Pagination from "@/components/Pagination/index.vue";
import ListPageLayout from "@/components/ListPageLayout/index.vue";
import { ElNotification, ElMessage, ElMessageBox } from "element-plus";
import { useI18n } from "@/hooks/web/useI18n";
import {
  Delete,
  Search,
  Download,
  Document,
  Headset,
  View,
  DocumentCopy,
  FolderAdd,
} from "@element-plus/icons-vue";

defineOptions({ name: "CollectFile" });

const { t } = useI18n();

const loading = ref(false);
const dataSource = ref<CollectFileItem[]>([]);
const total = ref(0);
const ids = ref<any[]>([]);

const queryParams = reactive({
  currentPage: 1,
  pageSize: 20,
  searchText: "",
  fileType: "",
  suffix: "",
  source: "",
  startTime: "",
  endTime: "",
  sortingFields: "createTime DESC",
});

const suffixOptions = ["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp", "mp4", "mov", "webm", "mp3", "wav", "pdf", "zip"];

const gridRef = ref();

function resetCheckStatus() {
  gridRef.value?.clearCheckboxRow?.();
  gridRef.value?.clearCheckboxReserve?.();
  ids.value = [];
}

const { height } = useWindowSize();

const gridOptions = ref({
  ...commonGridOptions,
  maxHeight: Math.max(height.value - 280, 360),
  rowConfig: { keyField: "id" },
  checkboxConfig: { reserve: true },
  columns: [
    { type: "checkbox", width: 42, ellipsis: true, reserve: true },
    {
      title: t("collectFile.filePreview"),
      field: "url",
      width: 320,
      slots: { default: "previewDefaultSlot" },
    },
    {
      title: t("collectFile.fileName"),
      field: "name",
      minWidth: 180,
      className: "font-bold",
      slots: { default: "nameSlot" },
    },
    { title: t("collectFile.source"), field: "source", width: 120, slots: { default: "sourceSlot" } },
    { title: t("collectFile.suffix"), field: "suffix", width: 80 },
    { title: t("collectFile.fileSize"), field: "fileSize", width: 100, slots: { default: "sizeSlot" } },
    { title: t("common.id"), field: "id", width: 90, slots: { default: "idSlot" } },
    {
      title: t("common.createTime"),
      field: "createTime",
      width: 150,
      ellipsis: true,
      formatter: (e: any) => formatTimestamp(e.cellValue),
    },
    buildOperationColumn("operationDefaultSlot"),
  ],
});

watchEffect(() => {
  gridOptions.value.maxHeight = Math.max(height.value - 280, 360);
});

async function getList() {
  loading.value = true;
  try {
    const res = await CollectFileApi.page({ ...queryParams });
    dataSource.value = res?.list || [];
    total.value = res?.total || 0;
  } catch (e: any) {
    ElMessage.error(e?.message || t("collectFile.loadFailed"));
  } finally {
    loading.value = false;
  }
}

function checkboxChange(e: any) {
  const records = Array.isArray(e.records) ? e.records : [];
  const reserves = Array.isArray(e.reserves) ? e.reserves : [];
  ids.value = [...records.map((i: any) => i.id), ...reserves.map((i: any) => i.id)];
}

function checkboxAllChange(e: any) {
  const records = Array.isArray(e.records) ? e.records : [];
  const reserves = Array.isArray(e.reserves) ? e.reserves : [];
  ids.value = [...records.map((i: any) => i.id), ...reserves.map((i: any) => i.id)];
}

// ── 预览 ────────────────────────────────────────────
const previewVisible = ref(false);
const currentPreviewUrl = ref("");
const currentPreviewName = ref("");
const currentPreviewSuffix = ref("");

function openFilePreview(row: { url?: string; name?: string; suffix?: string }) {
  currentPreviewUrl.value = row?.url || "";
  currentPreviewName.value = row?.name || t("collectFile.collectFile");
  currentPreviewSuffix.value = row?.suffix || "";
  previewVisible.value = true;
}

function closePreview() {
  previewVisible.value = false;
  currentPreviewUrl.value = "";
  currentPreviewName.value = "";
  currentPreviewSuffix.value = "";
}

// ── 文件类型判断 ────────────────────────────────────
function normalizeSuffix(suffix: string): string {
  return String(suffix || "").trim().toLowerCase();
}

function isVideoFile(suffix: string): boolean {
  return ["mp4", "mov", "avi", "mkv", "wmv", "flv", "webm", "m4v", "3gp", "ogv"].includes(normalizeSuffix(suffix));
}

function isAudioFile(suffix: string): boolean {
  return ["mp3", "wav", "aac", "ogg", "oga", "m4a", "flac", "wma", "opus", "amr"].includes(normalizeSuffix(suffix));
}

function isImageFile(suffix: string): boolean {
  return ["jpg", "jpeg", "png", "gif", "bmp", "webp", "svg", "ico", "tiff", "tif", "avif"].includes(normalizeSuffix(suffix));
}

function formatFileSize(size?: number | null): string {
  if (!size || Number.isNaN(Number(size))) return "-";
  const n = Number(size);
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

// ── 操作 ────────────────────────────────────────────
function handleOperationCommand(command: string, row: any) {
  switch (command) {
    case "preview":
      openFilePreview(row);
      break;
    case "download":
      handleDownload(row);
      break;
    case "copy-link":
      if (!row?.url) {
        ElMessage.warning(t("collectFile.noUrlToCopy"));
        return;
      }
      navigator.clipboard
        ?.writeText(row.url)
        .then(() => ElMessage.success(t("collectFile.linkCopied")))
        .catch(() => ElMessage.error(t("collectFile.copyFailed")));
      break;
    case "add-to-resource":
      handleAddToFileResource(row);
      break;
    case "delete":
      handleDelete(row);
      break;
  }
}

/** 采集文件 → 文件资源（url 查重，已存在则跳过） */
async function handleAddToFileResource(row?: any) {
  const targets: CollectFileItem[] = row
    ? [row]
    : dataSource.value.filter((item) => ids.value.includes(item.id));
  if (!targets.length) {
    ElMessage.warning(t("collectFile.addToResourceSelectFirst"));
    return;
  }

  let added = 0;
  let duplicated = 0;
  const errors: string[] = [];

  for (const item of targets) {
    if (!item?.url) {
      errors.push(item?.name || item?.id || "?");
      continue;
    }
    try {
      const existing = await getFileResourceList({ url: item.url, pageSize: 1 });
      const list = (existing as any)?.list || (existing as any)?.data?.list || [];
      if (Array.isArray(list) && list.length > 0) {
        duplicated += 1;
        continue;
      }
      await createFileResource({
        url: item.url,
        name: item.name,
        description: item.description,
        keywords: item.keywords,
        suffix: item.suffix,
        fileType: item.fileType,
        uploadType: "system",
        meta: {
          source: "collect-file",
          collectFileId: item.id,
          collectSource: item.source,
          originUrl: item.originUrl,
        },
      });
      added += 1;
    } catch (e: any) {
      errors.push(item.name || item.id);
    }
  }

  if (added > 0) {
    ElMessage.success(t("collectFile.addToResourceSuccess", { count: added }));
  }
  if (duplicated > 0) {
    ElMessage.info(t("collectFile.addToResourceDuplicate", { count: duplicated }));
  }
  if (errors.length > 0) {
    ElMessage.error(t("collectFile.addToResourceFailed", { message: errors.join(", ") }));
  }
}

async function handleDownload(row: any) {
  try {
    const downloadUrl = row.url;
    const fileName = row.name || `collect_${row.id}.${row.suffix || "bin"}`;
    if (!downloadUrl) {
      ElMessage.error(t("collectFile.downloadFailedMissingUrl", { name: fileName }));
      return;
    }
    await downloadFileByElement(downloadUrl, fileName);
    ElNotification.success(t("collectFile.downloadSuccess", { name: fileName }));
  } catch (error: any) {
    ElMessage.error(t("collectFile.downloadFailed", { message: error?.message || "" }));
  }
}

async function handleBatchDownload() {
  const targets = dataSource.value.filter((row: any) => ids.value.includes(row.id));
  if (!targets.length) {
    ElMessage.warning(t("collectFile.selectFilesFirst"));
    return;
  }
  for (const row of targets) {
    await handleDownload(row);
  }
}

async function handleDelete(row?: any) {
  let delIds: any = null;
  if (row) {
    delIds = [row.id];
  } else if (!ids.value.length) {
    return ElMessage.warning(t("collectFile.selectFilesFirst"));
  } else {
    delIds = [...ids.value];
  }

  try {
    await ElMessageBox.confirm(
      row ? t("collectFile.confirmDeleteOne", { name: row.name || row.id }) : t("collectFile.confirmDeleteMany", { count: delIds.length }),
      t("collectFile.deleteTip"),
      { confirmButtonText: t("common.confirm"), cancelButtonText: t("common.cancel"), type: "error" },
    );
    await CollectFileApi.delete({ ids: delIds });
    ElNotification.success(t("common.deleteSuccess"));
    resetCheckStatus();
    getList();
  } catch (error: any) {
    if (error === "cancel" || error === "close" || error?.action === "cancel" || error?.action === "close") return;
    ElMessage.error(t("collectFile.deleteFailed", { message: error?.message || t("collectFile.unknownError") }));
  }
}

getList();
</script>

<style lang="less" scoped>
:deep(.collect-file-page) {
  gap: 10px;
  padding: 8px 0 0;
}

:deep(.collect-file-page .list-page-layout__body),
:deep(.collect-file-page .list-page-layout__main) {
  gap: 10px;
}

:deep(.collect-file-page .list-page-filter--flat) {
  gap: 10px;
  padding-bottom: 10px;
}

:deep(.collect-file-page .list-page-table-panel__pagination--flat) {
  padding-top: 10px;
}

/* ── 文件预览单元格（与文件资源一致的尺寸限制）── */
:deep(.table-file-cell) {
  display: flex;
  align-items: center;
  width: 100%;
  min-width: 0;
}

:deep(.table-file-cell__video),
:deep(.table-file-cell__image) {
  display: block;
  width: 180px;
  max-width: 180px;
  max-height: 120px;
  border-radius: 10px;
  border: 1px solid var(--el-border-color-light);
  background: var(--el-fill-color-light);
  object-fit: contain;
  cursor: pointer;
}

:deep(.table-file-audio-card),
:deep(.table-file-doc-card) {
  min-height: 120px;
  padding: 12px;
  border-radius: 12px;
  border: 1px solid var(--el-border-color-light);
  background: var(--el-fill-color-blank);
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 10px;
}

:deep(.table-file-audio-card) {
  width: min(100%, 320px);
  min-height: 128px;
  padding: 14px 16px;
  box-sizing: border-box;
  cursor: pointer;
  background: linear-gradient(
    180deg,
    var(--el-color-primary-light-9) 0%,
    var(--el-fill-color-blank) 100%
  );
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.2s ease;
}

:deep(.table-file-audio-card:hover) {
  border-color: var(--el-color-primary-light-5);
  box-shadow: 0 10px 24px color-mix(in srgb, var(--el-color-primary) 12%, transparent);
  transform: translateY(-1px);
}

:deep(.table-file-audio-card__meta) {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  color: var(--el-text-color-primary);
}

:deep(.table-file-audio-card__title),
:deep(.table-file-doc-card__title) {
  flex: 1;
  min-width: 0;
  font-size: 13px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  word-break: break-word;
}

:deep(.table-file-audio-card__suffix) {
  font-size: 11px;
  color: var(--el-text-color-secondary);
}

:deep(.table-file-audio-card__player) {
  width: calc(100% / 0.92);
  min-width: 0;
  height: 40px;
  display: block;
  transform: scale(0.92);
  transform-origin: left center;
  will-change: transform;
}

:deep(.table-file-audio-card__player-wrap) {
  width: 100%;
  overflow: hidden;
}

:deep(.table-file-audio-card__player::-webkit-media-controls-panel) {
  padding-inline: 4px;
}

:deep(.table-file-audio-card__player::-webkit-media-controls-current-time-display),
:deep(.table-file-audio-card__player::-webkit-media-controls-time-remaining-display) {
  font-size: 11px;
  min-width: auto;
}

:deep(.table-file-audio-card__player::-webkit-media-controls-timeline) {
  margin-inline: 4px;
}

:deep(.table-file-doc-card) {
  width: 180px;
  align-items: center;
  text-align: center;
  color: var(--el-text-color-secondary);
}

:deep(.table-file-doc-card__tip) {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
</style>
