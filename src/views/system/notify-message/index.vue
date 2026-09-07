<template>
  <ContentWrap :plain="true">
    <ListPageLayout class="notify-message-page">
      <template #filter>
        <div class="list-page-filter list-page-filter--flat">
          <div class="notify-message-toolbar">
            <div class="notify-message-toolbar__tabs">
              <el-tabs v-model="activeTab" @tab-change="handleTabChange">
                <el-tab-pane label="我收到的" name="received" />
                <el-tab-pane v-if="isAdmin" label="我发出的" name="sent" />
              </el-tabs>
            </div>
            <div class="notify-message-toolbar__actions">
              <el-button
                v-if="activeTab === 'received'"
                size="small"
                :disabled="loading || selectedIds.length === 0"
                @click="handleBatchMarkRead"
              >
                标为已读
              </el-button>
              <el-button
                v-if="activeTab === 'received'"
                size="small"
                :disabled="loading"
                @click="handleMarkAllRead"
              >
                全部标为已读
              </el-button>
              <el-button
                size="small"
                :disabled="loading || selectedIds.length === 0"
                @click="handleBatchDelete"
              >
                删除选中
              </el-button>
              <el-button
                size="small"
                :disabled="loading"
                @click="handleClearAll"
              >
                清空消息
              </el-button>
              <el-button
                v-if="isAdmin"
                size="small"
                type="primary"
                @click="handleSendMessage"
              >
                发送消息
              </el-button>
            </div>
          </div>
        </div>
      </template>

      <template #table>
        <div class="list-page-panel list-page-panel--flat list-page-table-panel list-page-table-panel--flat">
          <div class="list-page-table-panel__body">
            <div class="common-table">
              <vxe-grid
                v-bind="gridOptions"
                :data="dataList"
                :loading="loading"
                @checkbox-change="handleCheckboxChange"
                @checkbox-all="handleCheckboxAllChange"
              >
                <template #content_default="{ row }">
                  <div class="notify-content-cell">
                    <span class="notify-content-cell__title">{{ getContentTitle(row) }}</span>
                    <span class="notify-content-cell__text">{{ getContentBody(row) }}</span>
                  </div>
                </template>

                <template #sender_default="{ row }">
                  {{ getSenderLabel(row) }}
                </template>

                <template #readStatus_default="{ row }">
                  <el-tag size="small" :type="row.readStatus ? 'success' : 'warning'">
                    {{ row.readStatus ? "已读" : "未读" }}
                  </el-tag>
                </template>

                <template #operationDefaultSlot="{ row }">
                  <div class="flex justify-start">
                    <el-button
                      v-if="activeTab === 'received' && !row.readStatus"
                      type="primary"
                      link
                      size="small"
                      @click="handleMarkRead(row)"
                    >
                      标为已读
                    </el-button>
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
            :total="total"
            v-model:page="queryParams.currentPage"
            v-model:limit="queryParams.pageSize"
            @pagination="fetchList"
          />
        </div>
      </template>
    </ListPageLayout>

    <SendMessageDialog ref="sendDialogRef" @success="handleSendSuccess" />
  </ContentWrap>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref, watchEffect } from "vue";
import { useWindowSize } from "@vueuse/core";
import type { VxeGridProps } from "vxe-table";
import { ElMessage, ElMessageBox } from "element-plus";
import { buildOperationColumn, buildTimeColumn, commonGridOptions } from "@/common/table";
import ContentWrap from "@/components/ContentWrap/src/ContentWrap.vue";
import ListPageLayout from "@/components/ListPageLayout/index.vue";
import Pagination from "@/components/Pagination/index.vue";
import { useUserStore } from "@/store/modules/user";
import {
  getMyNotifyMessagePage,
  getSentNotifyMessagePage,
  updateAllNotifyMessageRead,
  updateNotifyMessageRead,
  deleteNotifyMessage,
  clearAllNotifyMessage,
  type NotifyMessageVO,
} from "@/api/system/notify/message";
import SendMessageDialog from "./components/SendMessageDialog.vue";

defineOptions({ name: "SystemNotifyMessage" });

type TabName = "received" | "sent";

const userStore = useUserStore();
const isAdmin = computed(() => !!userStore.user?.isAdmin);

const activeTab = ref<TabName>("received");
const loading = ref(false);
const dataList = ref<NotifyMessageVO[]>([]);
const total = ref(0);
const selectedIds = ref<number[]>([]);
const sendDialogRef = ref<InstanceType<typeof SendMessageDialog>>();

const queryParams = reactive({
  currentPage: 1,
  pageSize: 20,
});

const { height } = useWindowSize();

const gridOptions = ref<VxeGridProps<NotifyMessageVO>>({
  ...commonGridOptions,
  maxHeight: Math.max(height.value - 280, 360),
  rowConfig: {
    keyField: "id",
  },
  checkboxConfig: {
    reserve: true,
  },
  columns: [
    { type: "checkbox", width: 50, reserve: true },
    {
      title: "消息内容",
      field: "content",
      minWidth: 300,
      slots: { default: "content_default" },
    },
    {
      title: "发送人",
      field: "sender",
      width: 140,
      slots: { default: "sender_default" },
    },
    {
      title: "状态",
      field: "readStatus",
      width: 100,
      visible: activeTab.value === "received",
      slots: { default: "readStatus_default" },
    },
    buildTimeColumn("时间", "createTime"),
    buildOperationColumn("operationDefaultSlot", 100),
  ],
});

watchEffect(() => {
  gridOptions.value.maxHeight = Math.max(height.value - 280, 360);
});

const getContentTitle = (row: NotifyMessageVO): string => {
  if (row.messageType === 1) {
    return row.templateNickname || "消息";
  }
  return row.templateNickname || "系统通知";
};

const getContentBody = (row: NotifyMessageVO): string => {
  return row.templateContent || "-";
};

const getSenderLabel = (row: NotifyMessageVO): string => {
  if (row.messageType === 1) {
    return row.senderType === 1 ? "管理员" : "系统";
  }
  return row.templateNickname || "系统";
};

const handleCheckboxChange = ({ records }: { records: NotifyMessageVO[] }) => {
  selectedIds.value = records.map((item) => item.id);
};

const handleCheckboxAllChange = ({ records }: { records: NotifyMessageVO[] }) => {
  selectedIds.value = records.map((item) => item.id);
};

const fetchList = async () => {
  loading.value = true;
  selectedIds.value = [];
  try {
    const params = {
      currentPage: queryParams.currentPage,
      pageSize: queryParams.pageSize,
    };
    let res;
    if (activeTab.value === "received") {
      res = await getMyNotifyMessagePage(params);
    } else {
      res = await getSentNotifyMessagePage(params);
    }
    const pageData = (res as any)?.data ?? res;
    dataList.value = pageData?.list || [];
    total.value = pageData?.total || 0;
  } catch (error: any) {
    ElMessage.error(error?.message ?? "获取消息列表失败");
    dataList.value = [];
    total.value = 0;
  } finally {
    loading.value = false;
  }
};

const handleTabChange = () => {
  queryParams.currentPage = 1;
  queryParams.pageSize = 20;
  // update column visibility for status column
  const statusCol = gridOptions.value.columns?.find((c: any) => c.field === "readStatus");
  if (statusCol) {
    (statusCol as any).visible = activeTab.value === "received";
  }
  void fetchList();
};

const handleMarkRead = async (row: NotifyMessageVO) => {
  try {
    await updateNotifyMessageRead([row.id]);
    ElMessage.success("已标记为已读");
    await fetchList();
  } catch (error: any) {
    ElMessage.error(error?.message ?? "操作失败");
  }
};

const handleBatchMarkRead = async () => {
  if (selectedIds.value.length === 0) {
    ElMessage.warning("请选择要标记的消息");
    return;
  }
  try {
    await updateNotifyMessageRead(selectedIds.value);
    ElMessage.success(`已将 ${selectedIds.value.length} 条消息标为已读`);
    await fetchList();
  } catch (error: any) {
    ElMessage.error(error?.message ?? "批量标记失败");
  }
};

const handleMarkAllRead = async () => {
  try {
    await ElMessageBox.confirm("确认将所有未读消息标记为已读？", "提示", {
      type: "warning",
    });
    await updateAllNotifyMessageRead();
    ElMessage.success("已全部标为已读");
    await fetchList();
  } catch (error: any) {
    if (error !== "cancel" && error !== "close") {
      ElMessage.error(error?.message ?? "操作失败");
    }
  }
};

const handleSendMessage = () => {
  sendDialogRef.value?.open();
};

const handleSendSuccess = () => {
  if (activeTab.value === "sent") {
    void fetchList();
  }
};

const handleBatchDelete = async () => {
  if (selectedIds.value.length === 0) {
    ElMessage.warning("请选择要删除的消息");
    return;
  }
  try {
    await ElMessageBox.confirm(
      `确认删除选中的 ${selectedIds.value.length} 条消息？`,
      "提示",
      { type: "warning" }
    );
    await deleteNotifyMessage(selectedIds.value);
    ElMessage.success("删除成功");
    selectedIds.value = [];
    await fetchList();
  } catch (error: any) {
    if (error !== "cancel" && error !== "close") {
      ElMessage.error(error?.message ?? "删除失败");
    }
  }
};

const handleClearAll = async () => {
  try {
    await ElMessageBox.confirm("确认清空所有消息？此操作不可恢复。", "提示", {
      type: "warning",
    });
    await clearAllNotifyMessage();
    ElMessage.success("已清空");
    selectedIds.value = [];
    await fetchList();
  } catch (error: any) {
    if (error !== "cancel" && error !== "close") {
      ElMessage.error(error?.message ?? "清空失败");
    }
  }
};

let pollTimer: ReturnType<typeof setInterval> | null = null

const startPolling = () => {
  stopPolling()
  pollTimer = setInterval(() => {
    if (activeTab.value === 'received') {
      void fetchList()
    }
  }, 15_000)
}

const stopPolling = () => {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}

onMounted(() => {
  void fetchList()
  startPolling()
})

onUnmounted(() => {
  stopPolling()
})
</script>

<style scoped>
:deep(.notify-message-page) {
  gap: 10px;
  padding: 8px 0 0;
}

:deep(.notify-message-page .list-page-layout__main) {
  gap: 10px;
}

:deep(.notify-message-page .list-page-filter--flat) {
  padding-bottom: 0;
}

.notify-message-toolbar {
  display: flex;
  width: 100%;
  min-height: 32px;
  align-items: center;
  justify-content: space-between;
}

.notify-message-toolbar__tabs {
  flex: 1;
  min-width: 0;
  padding-bottom: 8px;
}

.notify-message-toolbar__tabs :deep(.el-tabs__nav-wrap::after) {
  display: none;
}

.notify-message-toolbar__tabs :deep(.el-tabs__header) {
  margin-bottom: 0;
}

.notify-message-toolbar__tabs :deep(.el-tabs__active-bar) {
  bottom: 6px;
}

.notify-message-toolbar__tabs :deep(.el-tabs__item) {
  padding: 0 16px;
}

.notify-message-toolbar__actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
  margin-left: 16px;
}

.notify-message-toolbar__actions :deep(.el-button + .el-button) {
  margin-left: 0;
}

.notify-message-page :deep(.list-page-panel--flat) {
  margin-top: 12px;
}

.common-table {
  overflow: hidden;
  border-radius: 8px;
}

.notify-content-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.notify-content-cell__title {
  font-weight: 500;
  color: var(--el-text-color-primary);
}

.notify-content-cell__text {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (width <= 768px) {
  .notify-message-toolbar {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
  }

  .notify-message-toolbar__actions {
    justify-content: flex-start;
    margin-left: 0;
  }
}
</style>
