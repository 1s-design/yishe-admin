<template>
  <ContentWrap :plain="true">
    <ListPageLayout class="file-asset-page">
      <template #filter>
        <div class="list-page-filter list-page-filter--flat">
          <el-form :model="query" label-position="top" class="list-page-search-form" @submit.prevent="loadList">
            <el-row :gutter="12" class="list-page-search-form__row">
              <el-col :xs="24" :sm="12" :md="8" :lg="6">
                <el-form-item label="关键词">
                  <el-input v-model="query.keyword" size="small" clearable placeholder="文件名或对象路径" @keyup.enter="loadList" />
                </el-form-item>
              </el-col>
              <el-col :xs="24" :sm="12" :md="8" :lg="5">
                <el-form-item label="来源应用">
                  <el-input v-model="query.sourceApp" size="small" clearable placeholder="例如 yishe-client" @keyup.enter="loadList" />
                </el-form-item>
              </el-col>
              <el-col :xs="24" :sm="12" :md="8" :lg="5">
                <el-form-item label="存储提供商">
                  <el-input v-model="query.provider" size="small" clearable placeholder="例如 tencent-cos" @keyup.enter="loadList" />
                </el-form-item>
              </el-col>
            </el-row>
            <div class="list-page-search-form__actions">
              <el-button size="small" type="primary" :icon="Search" :loading="loading" @click="loadList">查询</el-button>
              <el-button size="small" @click="resetQuery">重置</el-button>
            </div>
          </el-form>
        </div>
      </template>

      <template #table>
        <div class="list-page-panel list-page-panel--flat list-page-table-panel list-page-table-panel--flat">
          <div class="list-page-table-panel__body">
            <div class="common-table">
              <vxe-grid v-bind="gridOptions" :data="list" :loading="loading">
                <template #fileNameDefaultSlot="{ row }">
                  <span class="file-asset-ellipsis" :title="row.fileName || row.objectKey">{{ row.fileName || "未命名文件" }}</span>
                </template>
                <template #objectKeyDefaultSlot="{ row }">
                  <span class="file-asset-ellipsis" :title="row.objectKey">{{ row.objectKey }}</span>
                </template>
                <template #sizeDefaultSlot="{ row }">{{ formatSize(row.size) }}</template>
                <template #createdAtDefaultSlot="{ row }">{{ formatDate(row.createdAt) }}</template>
              </vxe-grid>
            </div>
          </div>
        </div>
        <div class="file-asset-pagination">
          <el-pagination v-model:current-page="query.page" v-model:page-size="query.pageSize" :total="total" size="small" layout="total, prev, pager, next" @current-change="loadList" @size-change="loadList" />
        </div>
      </template>
    </ListPageLayout>
  </ContentWrap>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { useWindowSize } from "@vueuse/core";
import { Search } from "@element-plus/icons-vue";
import ContentWrap from "@/components/ContentWrap/src/ContentWrap.vue";
import ListPageLayout from "@/components/ListPageLayout/index.vue";
import { commonGridOptions } from "@/common/table";
import { getFileAssetPageApi, type FileAssetItem } from "@/api/file-asset";

const loading = ref(false);
const list = ref<FileAssetItem[]>([]);
const total = ref(0);
const query = reactive({ page: 1, pageSize: 20, keyword: "", sourceApp: "", provider: "" });
const { height: windowHeight } = useWindowSize();

const gridOptions = computed(() => ({
  ...commonGridOptions,
  maxHeight: Math.max(windowHeight.value - 280, 360),
  columns: [
    { type: "seq", width: 60, title: "序号" },
    { field: "fileName", title: "文件名", minWidth: 180, slots: { default: "fileNameDefaultSlot" } },
    { field: "objectKey", title: "对象路径", minWidth: 300, slots: { default: "objectKeyDefaultSlot" } },
    { field: "provider", title: "存储", width: 130 },
    { field: "sourceApp", title: "来源应用", width: 130 },
    { field: "sourceModule", title: "来源模块", width: 150 },
    { field: "size", title: "大小", width: 100, slots: { default: "sizeDefaultSlot" } },
    { field: "createdAt", title: "登记时间", width: 170, slots: { default: "createdAtDefaultSlot" } },
  ],
}));

async function loadList() {
  loading.value = true;
  try {
    const result: any = await getFileAssetPageApi({ ...query });
    list.value = result?.list || result?.data?.list || [];
    total.value = Number(result?.total || result?.data?.total || 0);
  } finally {
    loading.value = false;
  }
}
function resetQuery() { Object.assign(query, { page: 1, keyword: "", sourceApp: "", provider: "" }); loadList(); }
function formatSize(value?: number | null) { if (!value) return "-"; if (value < 1024) return `${value} B`; if (value < 1024 ** 2) return `${(value / 1024).toFixed(1)} KB`; if (value < 1024 ** 3) return `${(value / 1024 ** 2).toFixed(1)} MB`; return `${(value / 1024 ** 3).toFixed(1)} GB`; }
function formatDate(value?: string) { return value ? new Date(value).toLocaleString("zh-CN") : "-"; }
onMounted(loadList);
</script>

<style scoped>
:deep(.file-asset-page) { gap: 10px; padding: 8px 0 0; }
:deep(.file-asset-page .list-page-layout__body),
:deep(.file-asset-page .list-page-layout__main) { gap: 10px; }
:deep(.file-asset-page .list-page-filter--flat) { padding-bottom: 10px; }
:deep(.file-asset-page .list-page-table-panel__body) { overflow: hidden; }

.file-asset-page { height: 100%; overflow: hidden; }
:deep(.file-asset-page .list-page-layout__body),
:deep(.file-asset-page .list-page-layout__main),
:deep(.file-asset-page .list-page-layout__table) { min-height: 0; overflow: hidden; }
.file-asset-ellipsis { display: block; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.file-asset-pagination { display: flex; justify-content: flex-end; padding: 16px 0 4px; }
</style>
