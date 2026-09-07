<template>
  <ContentWrap :plain="true">
    <ListPageLayout class="publish-binding-records-page">
      <template #filter>
        <div class="list-page-filter list-page-filter--flat">
          <el-form :model="queryParams" label-position="top" class="list-page-search-form">
            <el-row :gutter="12" class="list-page-search-form__row">
              <el-col class="list-page-search-form__col--base" :xs="24" :sm="12" :md="8" :lg="5">
                <el-form-item label="套图ID">
                  <el-input v-model="queryParams.psdSetId" size="small" placeholder="请输入套图ID" clearable />
                </el-form-item>
              </el-col>
              <el-col class="list-page-search-form__col--base" :xs="24" :sm="12" :md="8" :lg="5">
                <el-form-item label="贴纸ID">
                  <el-input v-model="queryParams.stickerId" size="small" placeholder="请输入贴纸ID" clearable />
                </el-form-item>
              </el-col>
              <el-col class="list-page-search-form__col--base" :xs="24" :sm="12" :md="8" :lg="5">
                <el-form-item label="发布配置">
                  <el-select v-model="queryParams.publishConfigId" size="small" placeholder="请选择发布配置" clearable filterable>
                    <el-option v-for="item in publishConfigOptions" :key="item.id" :label="item.name" :value="item.id" />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col class="list-page-search-form__col--base" :xs="24" :sm="12" :md="8" :lg="5">
                <el-form-item label="状态">
                  <el-select v-model="queryParams.status" size="small" placeholder="请选择状态" clearable>
                    <el-option label="待处理" value="pending" />
                    <el-option label="成功" value="success" />
                    <el-option label="失败" value="failed" />
                    <el-option label="已过期" value="expired" />
                    <el-option label="已删除" value="deleted" />
                  </el-select>
                </el-form-item>
              </el-col>
            </el-row>
            <div class="list-page-search-form__actions">
              <el-button size="small" type="primary" :icon="Search" :loading="loading" @click="handleSearch">搜索</el-button>
              <el-button size="small" :icon="Refresh" :disabled="loading" @click="resetQuery">重置</el-button>
            </div>
          </el-form>
        </div>
      </template>

      <template #table>
        <div class="list-page-panel list-page-panel--flat list-page-table-panel list-page-table-panel--flat">
          <div class="list-page-table-panel__body">
            <div class="common-table">
              <vxe-grid ref="gridRef" v-bind="gridOptions" :data="dataSource" :loading="loading">
                <template #publishConfigDefaultSlot="{ row }">
                  {{ row.publishConfigId || "-" }}
                </template>

                <template #statusDefaultSlot="{ row }">
                  <el-tag :type="getStatusType(row.status)" size="small">
                    {{ getStatusLabel(row.status) }}
                  </el-tag>
                </template>

                <template #actionDefaultSlot="{ row }">
                  <el-button link type="primary" size="small" @click="handleViewDetail(row)">
                    查看详情
                  </el-button>
                </template>
              </vxe-grid>
            </div>
          </div>
        </div>
      </template>

      <template #pagination>
        <div class="list-page-panel list-page-panel--flat list-page-table-panel__pagination list-page-table-panel__pagination--flat">
          <pagination :total="total" v-model:page="queryParams.currentPage" v-model:limit="queryParams.pageSize" @pagination="getList" />
        </div>
      </template>
    </ListPageLayout>

    <!-- 详情对话框 -->
    <el-dialog
      v-model="detailDialogVisible"
      title="绑定记录详情"
      width="1000px"
      :close-on-click-modal="false"
    >
      <div v-loading="detailLoading" v-if="detailData" class="detail-content">
        <!-- 图片（贴纸）模块 -->
        <div class="detail-section">
          <div class="detail-section__header">
            <el-icon><Picture /></el-icon>
            <span>图片</span>
          </div>
          <div v-if="detailData.sticker?.id" class="detail-body">
            <div class="detail-body__main">
              <el-image
                v-if="detailData.sticker.url"
                :src="detailData.sticker.url"
                fit="contain"
                class="detail-sticker-img"
                :preview-src-list="[detailData.sticker.url]"
              />
              <div class="detail-body__info">
                <div class="detail-row">
                  <span class="detail-label">名称</span>
                  <span class="detail-value">{{ detailData.sticker.name || "-" }}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">ID</span>
                  <span class="detail-value detail-value--mono">{{ detailData.sticker.id }}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">尺寸</span>
                  <span class="detail-value">
                    <template v-if="detailData.sticker.width && detailData.sticker.height">
                      {{ detailData.sticker.width }} × {{ detailData.sticker.height }}px
                      <span class="detail-value--sub">({{ detailData.sticker.aspectRatio?.toFixed(2) || '-' }})</span>
                    </template>
                    <template v-else>-</template>
                  </span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">格式</span>
                  <span class="detail-value">{{ detailData.sticker.suffix?.toUpperCase() || '-' }}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">文件夹</span>
                  <span class="detail-value">{{ detailData.sticker.folder || '-' }}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">属性</span>
                  <span class="detail-value">
                    <el-tag v-if="detailData.sticker.isCustom" size="small" style="margin-right: 4px">自定义</el-tag>
                    <el-tag v-if="detailData.sticker.isCutout" size="small" type="success" style="margin-right: 4px">抠图</el-tag>
                    <el-tag v-if="detailData.sticker.isInfringement" size="small" type="danger">侵权</el-tag>
                    <span v-if="!detailData.sticker.isCustom && !detailData.sticker.isCutout && !detailData.sticker.isInfringement" class="detail-value--sub">普通素材</span>
                  </span>
                </div>
                <div class="detail-row" v-if="detailData.sticker.keywords">
                  <span class="detail-label">关键字</span>
                  <span class="detail-value">{{ detailData.sticker.keywords }}</span>
                </div>
                <div class="detail-row" v-if="detailData.sticker.description">
                  <span class="detail-label">描述</span>
                  <span class="detail-value">{{ detailData.sticker.description }}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">创建时间</span>
                  <span class="detail-value detail-value--sub">{{ formatTimestamp(detailData.sticker.createTime) }}</span>
                </div>
              </div>
            </div>
          </div>
          <div v-else class="detail-body detail-body--empty">
            <el-tag type="warning" size="small">⚠ 贴纸信息丢失</el-tag>
          </div>
        </div>

        <!-- PSD模板（套图）模块 -->
        <div class="detail-section">
          <div class="detail-section__header">
            <el-icon><Grid /></el-icon>
            <span>PSD模板</span>
          </div>
          <div v-if="detailData.psdSet?.id" class="detail-body">
            <div class="detail-body__info">
              <div class="detail-row">
                <span class="detail-label">名称</span>
                <span class="detail-value">{{ detailData.psdSet.name || "-" }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">ID</span>
                <span class="detail-value detail-value--mono">{{ detailData.psdSet.id }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">图片数</span>
                <span class="detail-value">{{ detailData.psdSet.imageCount || 0 }} 张</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">状态</span>
                <span class="detail-value">
                  <el-tag size="small" :type="detailData.psdSet.status === 'completed' ? 'success' : detailData.psdSet.status === 'failed' ? 'danger' : 'info'">
                    {{ detailData.psdSet.status || '-' }}
                  </el-tag>
                </span>
              </div>
              <div class="detail-row" v-if="detailData.psdSet.keywords">
                <span class="detail-label">关键字</span>
                <span class="detail-value">{{ detailData.psdSet.keywords }}</span>
              </div>
              <div class="detail-row" v-if="detailData.psdSet.description">
                <span class="detail-label">描述</span>
                <span class="detail-value">{{ detailData.psdSet.description }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">创建时间</span>
                <span class="detail-value detail-value--sub">{{ formatTimestamp(detailData.psdSet.createTime) }}</span>
              </div>
            </div>
          </div>
          <div v-else class="detail-body detail-body--empty">
            <el-tag type="warning" size="small">⚠ 套图信息丢失</el-tag>
          </div>
        </div>

        <!-- 发布任务模块 -->
        <div class="detail-section">
          <div class="detail-section__header">
            <el-icon><Upload /></el-icon>
            <span>发布任务</span>
          </div>
          <div class="detail-body">
            <div class="detail-body__info">
              <div class="detail-row">
                <span class="detail-label">记录ID</span>
                <span class="detail-value detail-value--mono">{{ detailData.id }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">任务ID</span>
                <span class="detail-value detail-value--mono">{{ detailData.taskId || '-' }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">状态</span>
                <span class="detail-value">
                  <el-tag :type="getStatusType(detailData.status)" size="small">{{ getStatusLabel(detailData.status) }}</el-tag>
                </span>
              </div>
              <div class="detail-row">
                <span class="detail-label">用户ID</span>
                <span class="detail-value">{{ detailData.userId || '-' }}</span>
              </div>

              <div class="detail-divider"></div>

              <div class="detail-row" v-if="detailData.publishConfig?.id">
                <span class="detail-label">发布配置</span>
                <span class="detail-value">
                  {{ detailData.publishConfig.name }}
                  <el-tag size="small" type="info" style="margin-left: 6px">{{ detailData.publishConfig.platform }}</el-tag>
                  <el-tag size="small" style="margin-left: 4px">{{ detailData.publishConfig.taskType }}</el-tag>
                </span>
              </div>
              <div class="detail-row" v-else>
                <span class="detail-label">发布配置</span>
                <span class="detail-value"><el-tag type="warning" size="small">⚠ 配置信息丢失</el-tag></span>
              </div>
              <div class="detail-row" v-if="detailData.publishConfig?.description">
                <span class="detail-label">配置描述</span>
                <span class="detail-value">{{ detailData.publishConfig.description }}</span>
              </div>

              <div class="detail-divider" v-if="detailData.resultMessage || detailData.errorInfo"></div>

              <div class="detail-row" v-if="detailData.resultMessage">
                <span class="detail-label">结果</span>
                <span class="detail-value">{{ detailData.resultMessage }}</span>
              </div>
              <div class="detail-row" v-if="detailData.errorInfo">
                <span class="detail-label">错误</span>
                <span class="detail-value detail-value--error">{{ detailData.errorInfo }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">记录时间</span>
                <span class="detail-value detail-value--sub">{{ formatTimestamp(detailData.createTime) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <el-empty v-else-if="!detailLoading" description="暂无数据" />
    </el-dialog>
  </ContentWrap>
</template>

<script setup lang="ts">
import { ref, reactive, watchEffect, onMounted } from "vue";
import { commonGridOptions } from "@/common/table";
import { formatTimestamp } from "@/common/date";
import { useWindowSize } from "@vueuse/core";
import { defaultSortingValue } from "@/common/sort";
import { ElMessage } from "element-plus";
import { Search, Refresh, Picture, Grid, Upload } from "@element-plus/icons-vue";
import { podPublishImageBindingApi } from "@/api/podPublishImageBinding";
import Pagination from "@/components/Pagination/index.vue";
import ListPageLayout from "@/components/ListPageLayout/index.vue";
import ContentWrap from "@/components/ContentWrap/src/ContentWrap.vue";

const queryParams = reactive({
  currentPage: 1,
  pageSize: 20,
  sortingFields: defaultSortingValue(),
  psdSetId: "",
  stickerId: "",
  publishConfigId: "",
  status: "",
});

const gridRef = ref();
const { height } = useWindowSize();

const gridOptions = ref({
  ...commonGridOptions,
  maxHeight: Math.max(height.value - 280, 360),
  rowConfig: { keyField: "id" },
  columns: [
    { title: "套图ID", field: "psdSetId", minWidth: 180 },
    { title: "贴纸ID", field: "stickerId", minWidth: 180 },
    { title: "发布配置", field: "publishConfigId", minWidth: 200, slots: { default: "publishConfigDefaultSlot" } },
    { title: "任务ID", field: "taskId", minWidth: 180 },
    { title: "状态", field: "status", width: 100, slots: { default: "statusDefaultSlot" } },
    { title: "创建时间", field: "createTime", width: 170, formatter: ({ cellValue }) => formatTimestamp(cellValue) },
    { title: "更新时间", field: "updateTime", width: 170, formatter: ({ cellValue }) => formatTimestamp(cellValue) },
    { title: "操作", width: 100, fixed: "right", slots: { default: "actionDefaultSlot" } },
  ],
});

watchEffect(() => {
  gridOptions.value.maxHeight = Math.max(height.value - 280, 360);
});

const dataSource = ref([]);
const loading = ref(false);
const total = ref(0);
const publishConfigOptions = ref([]);

async function getList() {
  loading.value = true;
  try {
    const res = await podPublishImageBindingApi.page({
      currentPage: queryParams.currentPage,
      pageSize: queryParams.pageSize,
      psdSetId: queryParams.psdSetId,
      stickerId: queryParams.stickerId,
      publishConfigId: queryParams.publishConfigId,
      status: queryParams.status,
    });
    dataSource.value = res.list || [];
    total.value = res.total || 0;
  } catch (error) {
    ElMessage.error("获取列表失败");
    dataSource.value = [];
    total.value = 0;
  } finally {
    loading.value = false;
  }
}

async function getPublishConfigOptions() {
  try {
    const res = await podPublishImageBindingApi.getPublishConfigOptions();
    publishConfigOptions.value = res || [];
  } catch (error) {
    publishConfigOptions.value = [];
  }
}

const handleSearch = () => {
  queryParams.currentPage = 1;
  getList();
};

const resetQuery = () => {
  queryParams.currentPage = 1;
  queryParams.psdSetId = "";
  queryParams.stickerId = "";
  queryParams.publishConfigId = "";
  queryParams.status = "";
  queryParams.sortingFields = defaultSortingValue();
  getList();
};

function getStatusType(status: string) {
  switch (status) {
    case "success": return "success";
    case "failed": return "danger";
    case "expired": return "warning";
    case "deleted": return "info";
    default: return "";
  }
}

function getStatusLabel(status: string) {
  switch (status) {
    case "pending": return "待处理";
    case "success": return "成功";
    case "failed": return "失败";
    case "expired": return "已过期";
    case "deleted": return "已删除";
    default: return status;
  }
}

// 详情对话框
const detailDialogVisible = ref(false);
const detailLoading = ref(false);
const detailData = ref<any>(null);

async function handleViewDetail(row: any) {
  detailDialogVisible.value = true;
  detailLoading.value = true;
  try {
    const res = await podPublishImageBindingApi.getDetail(row.id);
    detailData.value = res;
  } catch (error) {
    ElMessage.error("获取详情失败");
    detailData.value = null;
  } finally {
    detailLoading.value = false;
  }
}

onMounted(() => {
  getList();
  getPublishConfigOptions();
});
</script>

<style scoped lang="less">
:deep(.publish-binding-records-page) {
  gap: 10px;
  padding: 8px 0 0;
}

:deep(.publish-binding-records-page .list-page-layout__main) {
  gap: 10px;
}

:deep(.publish-binding-records-page .list-page-filter--flat) {
  padding-bottom: 10px;
}

.detail-content {
  max-height: 70vh;
  overflow-y: auto;
  padding-right: 4px;
}

.detail-section {
  margin-bottom: 16px;
  background: var(--el-bg-color-page);
  border-radius: 6px;

  &:last-child {
    margin-bottom: 0;
  }

  &__header {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 10px 14px;
    font-size: 13px;
    font-weight: 600;
    color: var(--el-text-color-regular);

    .el-icon {
      font-size: 15px;
      color: var(--el-color-primary);
    }
  }
}

.detail-body {
  padding: 8px 14px 14px;

  &__main {
    display: flex;
    gap: 16px;
  }

  &__info {
    flex: 1;
    min-width: 0;
  }

  &--empty {
    padding: 16px;
    text-align: center;
  }
}

.detail-sticker-img {
  width: 140px;
  height: 140px;
  flex-shrink: 0;
  border-radius: 4px;
  background: var(--el-fill-color-light);
  cursor: pointer;
}

.detail-row {
  display: flex;
  align-items: baseline;
  padding: 5px 0;
  font-size: 13px;
  line-height: 1.5;

  &:not(:last-child) {
    border-bottom: 1px dashed var(--el-border-color-lighter);
  }
}

.detail-label {
  flex-shrink: 0;
  width: 70px;
  color: var(--el-text-color-secondary);
  font-size: 12px;
}

.detail-value {
  flex: 1;
  min-width: 0;
  color: var(--el-text-color-primary);
  word-break: break-all;

  &--mono {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }

  &--sub {
    color: var(--el-text-color-secondary);
    font-size: 12px;
  }

  &--error {
    color: var(--el-color-danger);
  }
}

.detail-divider {
  margin: 8px 0;
  border-top: 1px dashed var(--el-border-color-lighter);
}
</style>
