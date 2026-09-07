<template>
  <ContentWrap :plain="true">
    <ListPageLayout class="service-file-cache-page">
      <template #filter>
        <div class="list-page-filter list-page-filter--flat">
          <el-form label-position="top" class="list-page-search-form" @submit.prevent>
            <el-row :gutter="12" class="list-page-search-form__row">
              <el-col :xs="24" :sm="18" :md="16" :lg="14" :xl="12">
                <el-form-item label="HTTP 文件地址">
                  <el-input
                    v-model="cacheUrl"
                    size="small"
                    clearable
                    placeholder="输入 HTTP/HTTPS 文件地址"
                    @keyup.enter="handleEnsure"
                  />
                </el-form-item>
              </el-col>
              <el-col :xs="24" :sm="6" :md="5" :lg="4" :xl="3">
                <el-form-item label="缓存文件">
                  <el-button
                    class="w-full"
                    size="small"
                    type="primary"
                    :icon="FolderAdd"
                    :loading="ensuring"
                    @click="handleEnsure"
                  >
                    缓存
                  </el-button>
                </el-form-item>
              </el-col>
            </el-row>

            <div class="list-page-search-form__actions">
              <el-button size="small" :icon="Refresh" :loading="loading" @click="loadList">
                刷新
              </el-button>
              <el-button
                size="small"
                type="danger"
                :icon="Delete"
                :disabled="!items.length"
                :loading="clearing"
                @click="handleClearAll"
              >
                清空全部
              </el-button>
            </div>
          </el-form>
        </div>
      </template>

      <template #table>
        <div class="service-file-cache-page__main">
          <div class="service-file-cache-page__stats">
            <div class="service-file-cache-stat">
              <span class="service-file-cache-stat__label">缓存文件</span>
              <span class="service-file-cache-stat__value">{{ total }}</span>
            </div>
            <div class="service-file-cache-stat">
              <span class="service-file-cache-stat__label">总大小</span>
              <span class="service-file-cache-stat__value">{{ formatFileSize(totalSize) }}</span>
            </div>
            <div class="service-file-cache-stat service-file-cache-stat--path">
              <span class="service-file-cache-stat__label">服务目录</span>
              <span class="service-file-cache-stat__value">{{ cacheDir || "-" }}</span>
            </div>
          </div>

          <div
            class="list-page-panel list-page-panel--flat list-page-table-panel list-page-table-panel--flat"
          >
            <div class="list-page-table-panel__body">
              <div class="common-table">
                <vxe-grid v-bind="gridOptions" :data="items" :loading="loading">
                  <template #urlDefaultSlot="{ row }">
                    <div class="service-file-cache-url" :title="row.url">{{ row.url }}</div>
                  </template>

                  <template #sizeDefaultSlot="{ row }">
                    {{ formatFileSize(row.size) }}
                  </template>

                  <template #updatedAtDefaultSlot="{ row }">
                    {{ formatDateTime(row.updatedAt) }}
                  </template>

                  <template #operationDefaultSlot="{ row }">
                    <el-button
                      link
                      size="small"
                      type="danger"
                      :icon="Delete"
                      @click="handleClearItem(row)"
                    >
                      删除
                    </el-button>
                  </template>
                </vxe-grid>
              </div>
            </div>
          </div>
        </div>
      </template>
    </ListPageLayout>
  </ContentWrap>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useLocalStorage, useWindowSize } from "@vueuse/core";
import { Delete, FolderAdd, Refresh } from "@element-plus/icons-vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { buildOperationColumn, commonGridOptions } from "@/common/table";
import {
  clearServiceFileCache,
  ensureServiceFileCache,
  getServiceFileCacheList,
  type ServiceFileCacheItem,
} from "@/api/serviceFileCache";
import ContentWrap from "@/components/ContentWrap/src/ContentWrap.vue";
import ListPageLayout from "@/components/ListPageLayout/index.vue";

const cacheUrl = useLocalStorage("system:service-file-cache:url", "");
const items = ref<ServiceFileCacheItem[]>([]);
const totalSize = ref(0);
const cacheDir = ref("");
const loading = ref(false);
const ensuring = ref(false);
const clearing = ref(false);
const { height } = useWindowSize();

const total = computed(() => items.value.length);

const gridOptions = computed(() => ({
  ...commonGridOptions,
  maxHeight: Math.max(height.value - 280, 360),
  rowConfig: {
    keyField: "key",
  },
  columns: [
    {
      title: "HTTP 地址",
      field: "url",
      minWidth: 420,
      showOverflow: "tooltip",
      slots: { default: "urlDefaultSlot" },
    },
    { title: "大小", field: "size", width: 110, slots: { default: "sizeDefaultSlot" } },
    { title: "类型", field: "contentType", width: 180, showOverflow: "tooltip" },
    { title: "文件名", field: "filename", minWidth: 180, showOverflow: "tooltip" },
    {
      title: "更新时间",
      field: "updatedAt",
      width: 170,
      slots: { default: "updatedAtDefaultSlot" },
    },
    buildOperationColumn("operationDefaultSlot", 96),
  ],
}));

const extractRequestErrorMessage = (error: any, fallback: string) =>
  error?.response?.data?.message || error?.message || fallback;

const formatFileSize = (value: any) => {
  const size = Number(value || 0);
  if (!Number.isFinite(size) || size <= 0) return "0 B";
  if (size < 1024) return `${Math.round(size)} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  if (size < 1024 * 1024 * 1024) return `${(size / 1024 / 1024).toFixed(2)} MB`;
  return `${(size / 1024 / 1024 / 1024).toFixed(2)} GB`;
};

const formatDateTime = (value?: string) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

const loadList = async () => {
  loading.value = true;
  try {
    const result = await getServiceFileCacheList();
    items.value = Array.isArray(result?.items) ? result.items : [];
    totalSize.value = Number(result?.totalSize || 0) || 0;
    cacheDir.value = String(result?.cacheDir || "");
  } catch (error: any) {
    ElMessage.error(extractRequestErrorMessage(error, "获取服务缓存文件失败"));
  } finally {
    loading.value = false;
  }
};

const handleEnsure = async () => {
  const url = String(cacheUrl.value || "").trim();
  if (!/^https?:\/\//i.test(url)) {
    ElMessage.warning("请先输入 HTTP 文件地址");
    return;
  }

  ensuring.value = true;
  try {
    const item = await ensureServiceFileCache(url);
    await loadList();
    ElMessage.success(item?.hit ? "已命中服务缓存文件" : "文件已缓存到服务端");
  } catch (error: any) {
    ElMessage.error(extractRequestErrorMessage(error, "缓存服务文件失败"));
  } finally {
    ensuring.value = false;
  }
};

const handleClearItem = async (row: ServiceFileCacheItem) => {
  try {
    await clearServiceFileCache(row.url);
    await loadList();
    ElMessage.success("已删除服务缓存文件");
  } catch (error: any) {
    ElMessage.error(extractRequestErrorMessage(error, "删除服务缓存文件失败"));
  }
};

const handleClearAll = async () => {
  if (!items.value.length) return;
  try {
    await ElMessageBox.confirm("确认清空全部服务缓存文件吗？", "清空缓存", {
      type: "warning",
      confirmButtonText: "清空",
      cancelButtonText: "取消",
    });
  } catch {
    return;
  }

  clearing.value = true;
  try {
    await clearServiceFileCache();
    await loadList();
    ElMessage.success("已清空服务缓存文件");
  } catch (error: any) {
    ElMessage.error(extractRequestErrorMessage(error, "清空服务缓存文件失败"));
  } finally {
    clearing.value = false;
  }
};

onMounted(() => {
  void loadList();
});
</script>

<style scoped lang="scss">
.service-file-cache-page__main {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.service-file-cache-page__stats {
  display: grid;
  grid-template-columns: 160px 160px minmax(0, 1fr);
  gap: 10px;
}

.service-file-cache-stat {
  display: flex;
  min-width: 0;
  padding: 10px 12px;
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 6px;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.service-file-cache-stat__label {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  white-space: nowrap;
}

.service-file-cache-stat__value {
  min-width: 0;
  overflow: hidden;
  font-size: 13px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.service-file-cache-stat--path {
  justify-content: flex-start;
}

.service-file-cache-url {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (width <= 900px) {
  .service-file-cache-page__stats {
    grid-template-columns: 1fr;
  }
}
</style>
