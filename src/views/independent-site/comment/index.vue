<template>
  <ContentWrap :plain="true">
    <ListPageLayout class="product-comment-page">
      <template #filter>
        <div class="list-page-filter list-page-filter--flat">
          <el-form :model="queryParams" label-position="top" class="list-page-search-form">
            <el-row :gutter="12" class="list-page-search-form__row">
              <el-col
                class="list-page-search-form__col--base"
                :xs="24"
                :sm="12"
                :md="8"
                :lg="5"
                :xl="4"
              >
                <el-form-item label="审核状态">
                  <el-select
                    v-model="queryParams.status"
                    size="small"
                    clearable
                    placeholder="全部审核状态"
                    @change="handleSearch"
                  >
                    <el-option label="已通过 (approved)" value="approved" />
                    <el-option label="待审核 (pending)" value="pending" />
                    <el-option label="已拒绝 (rejected)" value="rejected" />
                    <el-option label="已隐藏 (hidden)" value="hidden" />
                  </el-select>
                </el-form-item>
              </el-col>

              <el-col
                class="list-page-search-form__col--base"
                :xs="24"
                :sm="12"
                :md="8"
                :lg="5"
                :xl="4"
              >
                <el-form-item label="关联商品ID">
                  <el-input
                    v-model="queryParams.targetId"
                    size="small"
                    placeholder="请输入商品ID"
                    clearable
                    @change="(val) => { if (!val) handleSearch() }"
                    @keyup.enter="handleSearch"
                  />
                </el-form-item>
              </el-col>

              <el-col
                class="list-page-search-form__col--wide"
                :xs="24"
                :sm="12"
                :md="8"
                :lg="6"
                :xl="5"
              >
                <el-form-item label="检索内容 / 买家">
                  <el-input
                    v-model="queryParams.searchText"
                    size="small"
                    placeholder="按评价正文/买家昵称搜索"
                    clearable
                    @change="(val) => { if (!val) handleSearch() }"
                    @keyup.enter="handleSearch"
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

              <el-button
                size="small"
                :icon="Refresh"
                :disabled="loading"
                @click="resetQuery"
              >
                重置
              </el-button>

              <el-button
                size="small"
                type="success"
                plain
                :disabled="!ids.length"
                @click="handleBatchApprove"
              >
                批量通过 ({{ ids.length }})
              </el-button>

              <el-button
                size="small"
                type="warning"
                plain
                :disabled="!ids.length"
                @click="handleBatchReject"
              >
                批量拒绝 ({{ ids.length }})
              </el-button>

              <el-button
                size="small"
                type="danger"
                plain
                :icon="Delete"
                :disabled="!ids.length"
                @click="handleBatchDelete"
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
            <div class="common-table">
              <vxe-grid
                ref="gridRef"
                v-bind="gridOptions"
                :data="dataSource"
                :loading="loading"
                @checkbox-change="checkboxChange"
                @checkbox-all="checkboxAllChange"
              >
                <!-- C端买家 -->
                <template #userSlot="{ row }">
                  <div class="flex items-center gap-2">
                    <el-avatar
                      :size="26"
                      :src="row.publicUserAvatar || row.publicUser?.avatar"
                    >
                      {{ (row.publicUserName || '买')[0] }}
                    </el-avatar>
                    <div>
                      <span>{{ row.publicUserName || row.publicUserAccount || '匿名买家' }}</span>
                      <span v-if="row.replyToUserName" class="text-[color-mix(in_srgb,var(--el-color-primary)_72%,transparent)] ml-1 text-xs">
                        (回复 @{{ row.replyToUserName }})
                      </span>
                    </div>
                  </div>
                </template>

                <!-- 评分星级 -->
                <template #ratingSlot="{ row }">
                  <span class="text-amber-500 font-bold">★ {{ row.rating }}</span>
                </template>

                <!-- 评论内容 & 晒图 -->
                <template #contentSlot="{ row }">
                  <div class="leading-relaxed">
                    <p class="margin-0">{{ row.content }}</p>
                    <div v-if="row.images && row.images.length" class="flex gap-1.5 mt-1">
                      <el-image
                        v-for="(img, idx) in row.images"
                        :key="idx"
                        :src="img"
                        :preview-src-list="row.images"
                        :initial-index="idx"
                        fit="cover"
                        class="w-10 h-10 rounded border border-gray-200 cursor-pointer"
                        preview-teleported
                      />
                    </div>
                  </div>
                </template>

                <!-- 官方回复状态 -->
                <template #replySlot="{ row }">
                  <div v-if="row.replyContent" class="text-gray-700 bg-gray-50 dark:bg-gray-800 p-1.5 rounded border border-gray-100 text-xs">
                    <span class="font-bold text-[var(--el-color-primary)]">商家回复：</span>{{ row.replyContent }}
                  </div>
                  <span v-else class="text-gray-400">未回复</span>
                </template>

                <!-- 审核状态 Tag -->
                <template #statusSlot="{ row }">
                  <el-tag :type="getStatusTagType(row.status)" size="small">
                    {{ formatStatusLabel(row.status) }}
                  </el-tag>
                </template>

                <!-- 归属商家 (数据隔离账号) -->
                <template #ownerSlot="{ row }">
                  <span class="text-gray-500">
                    {{ row.ownerUser?.name || row.ownerUser?.account || row.ownerUserId || '-' }}
                  </span>
                </template>

                <!-- 创建时间 -->
                <template #createTimeSlot="{ row }">
                  {{ formatTimestamp(row.createTime) }}
                </template>

                <!-- 操作列 -->
                <template #opSlot="{ row }">
                  <div class="flex items-center gap-2">
                    <el-button size="small" type="primary" link @click="openReplyDialog(row)">
                      回复
                    </el-button>

                    <el-button
                      v-if="row.status !== 'approved'"
                      size="small"
                      type="success"
                      link
                      @click="handleSingleStatus(row.id, 'approved')"
                    >
                      通过
                    </el-button>

                    <el-button
                      v-if="row.status !== 'rejected'"
                      size="small"
                      type="warning"
                      link
                      @click="handleSingleStatus(row.id, 'rejected')"
                    >
                      拒绝
                    </el-button>

                    <el-button size="small" type="danger" link @click="handleDelete(row)">
                      删除
                    </el-button>
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
          <pagination
            :total="total"
            v-model:page="queryParams.currentPage"
            v-model:limit="queryParams.pageSize"
            @pagination="getList"
          />
        </div>
      </template>
    </ListPageLayout>

    <!-- 商家官方回复弹窗 -->
    <el-dialog
      v-model="replyDialogVisible"
      title="商家官方回复评价"
      width="520px"
      append-to-body
    >
      <div v-if="currentReplyRow" class="mb-3 text-sm text-gray-600 bg-gray-50 p-2.5 rounded">
        <div><strong>买家评价：</strong>{{ currentReplyRow.content }}</div>
      </div>
      <el-form label-position="top">
        <el-form-item label="官方回复内容">
          <el-input
            v-model="replyText"
            type="textarea"
            :rows="4"
            placeholder="请输入感谢致辞或售后服务指引..."
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="replyDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="replySubmitting" @click="submitReply">
          提交回复
        </el-button>
      </template>
    </el-dialog>
  </ContentWrap>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, watchEffect } from "vue";
import { commonGridOptions } from "@/common/table";
import { formatTimestamp } from "@/common/date";
import { useWindowSize } from "@vueuse/core";
import { Search, Refresh, Delete } from "@element-plus/icons-vue";
import { ElMessage, ElMessageBox } from "element-plus";
import {
  getProductCommentPage,
  replyProductComment,
  batchUpdateCommentStatus,
  deleteProductComment,
  deleteProductCommentBatch,
  type ProductCommentVO,
} from "@/api/system/product-comment";
import Pagination from "@/components/Pagination/index.vue";
import ListPageLayout from "@/components/ListPageLayout/index.vue";
import ContentWrap from "@/components/ContentWrap/src/ContentWrap.vue";

defineOptions({ name: "IndependentSiteProductComment" });

const loading = ref(false);
const dataSource = ref<ProductCommentVO[]>([]);
const total = ref(0);
const gridRef = ref();
const ids = ref<string[]>([]);

const queryParams = reactive({
  currentPage: 1,
  pageSize: 20,
  status: "",
  targetId: "",
  searchText: "",
});

const replyDialogVisible = ref(false);
const currentReplyRow = ref<ProductCommentVO | null>(null);
const replyText = ref("");
const replySubmitting = ref(false);

const { height } = useWindowSize();

const gridOptions = ref({
  ...commonGridOptions,
  maxHeight: Math.max(height.value - 280, 360),
  columns: [
    { type: "checkbox", width: 50 },
    { field: "publicUser", title: "C端买家", width: 180, slots: { default: "userSlot" } },
    { field: "rating", title: "评分", width: 80, slots: { default: "ratingSlot" } },
    { field: "content", title: "评价内容 / 晒图", minWidth: 240, slots: { default: "contentSlot" } },
    { field: "targetId", title: "关联商品ID", width: 140 },
    { field: "reply", title: "商家回复", minWidth: 160, slots: { default: "replySlot" } },
    { field: "status", title: "状态", width: 100, slots: { default: "statusSlot" } },
    { field: "ownerUser", title: "归属商家账号", width: 130, slots: { default: "ownerSlot" } },
    { field: "createTime", title: "评价时间", width: 160, slots: { default: "createTimeSlot" } },
    { field: "operation", title: "操作", width: 180, slots: { default: "opSlot" }, fixed: "right" },
  ],
});

watchEffect(() => {
  if (gridOptions.value) {
    gridOptions.value.maxHeight = Math.max(height.value - 280, 360);
  }
});

function checkboxChange(e: any) {
  ids.value = e.records.map((item: any) => item.id);
}

function checkboxAllChange(e: any) {
  ids.value = e.records.map((item: any) => item.id);
}

function formatStatusLabel(status: string) {
  switch (status) {
    case "approved":
      return "已通过";
    case "pending":
      return "待审核";
    case "rejected":
      return "已拒绝";
    case "hidden":
      return "已隐藏";
    default:
      return status || "已通过";
  }
}

function getStatusTagType(status: string) {
  switch (status) {
    case "approved":
      return "success";
    case "pending":
      return "warning";
    case "rejected":
      return "danger";
    case "hidden":
      return "info";
    default:
      return "success";
  }
}

async function getList() {
  loading.value = true;
  try {
    const res = await getProductCommentPage({
      currentPage: queryParams.currentPage,
      pageSize: queryParams.pageSize,
      status: queryParams.status || undefined,
      targetId: queryParams.targetId || undefined,
      searchText: queryParams.searchText || undefined,
    });
    dataSource.value = res.list || [];
    total.value = res.total || 0;
    ids.value = [];
  } finally {
    loading.value = false;
  }
}

function handleSearch() {
  queryParams.currentPage = 1;
  getList();
}

function resetQuery() {
  queryParams.status = "";
  queryParams.targetId = "";
  queryParams.searchText = "";
  queryParams.currentPage = 1;
  getList();
}

function openReplyDialog(row: ProductCommentVO) {
  currentReplyRow.value = row;
  replyText.value = row.replyContent || "";
  replyDialogVisible.value = true;
}

async function submitReply() {
  if (!currentReplyRow.value || !replyText.value.trim()) {
    ElMessage.warning("请填写回复内容");
    return;
  }

  replySubmitting.value = true;
  try {
    await replyProductComment(currentReplyRow.value.id, replyText.value.trim());
    ElMessage.success("回复成功");
    replyDialogVisible.value = false;
    getList();
  } catch (err) {
    ElMessage.error("回复失败");
  } finally {
    replySubmitting.value = false;
  }
}

async function handleSingleStatus(id: string, status: string) {
  try {
    await batchUpdateCommentStatus([id], status);
    ElMessage.success("状态更新成功");
    getList();
  } catch (err) {
    ElMessage.error("更新失败");
  }
}

async function handleBatchApprove() {
  if (!ids.value.length) return;
  try {
    await batchUpdateCommentStatus(ids.value, "approved");
    ElMessage.success(`已批量审核通过 ${ids.value.length} 条评论`);
    ids.value = [];
    getList();
  } catch (err) {
    ElMessage.error("批量处理失败");
  }
}

async function handleBatchReject() {
  if (!ids.value.length) return;
  try {
    await batchUpdateCommentStatus(ids.value, "rejected");
    ElMessage.success(`已批量拒绝 ${ids.value.length} 条评论`);
    ids.value = [];
    getList();
  } catch (err) {
    ElMessage.error("批量处理失败");
  }
}

async function handleDelete(row: ProductCommentVO) {
  try {
    await ElMessageBox.confirm("确定要删除这条评价吗？", "提示", {
      type: "warning",
      confirmButtonText: "确定删除",
      cancelButtonText: "取消",
    });
    await deleteProductComment(row.id);
    ElMessage.success("删除成功");
    getList();
  } catch (err) {
    // 静默忽略
  }
}

async function handleBatchDelete() {
  if (!ids.value.length) return;
  try {
    await ElMessageBox.confirm(
      `确认删除选中的 ${ids.value.length} 条评价吗？`,
      "提示",
      {
        type: "warning",
        confirmButtonText: "确认删除",
        cancelButtonText: "取消",
      }
    );
    await deleteProductCommentBatch(ids.value);
    ElMessage.success(`成功删除 ${ids.value.length} 条评价`);
    ids.value = [];
    getList();
  } catch (err) {
    // 静默忽略
  }
}

onMounted(() => {
  getList();
});
</script>

<style scoped>
.product-comment-page {
  padding: 0;
}
</style>
