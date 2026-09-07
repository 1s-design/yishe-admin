<template>
  <ContentWrap :plain="true">
    <ListPageLayout class="message-push-page">
      <template #filter>
        <div class="list-page-filter list-page-filter--flat">
          <div class="list-page-filter__row message-push-toolbar">
            <div class="message-push-toolbar__filter">
              <el-select
                v-model="platformFilter"
                placeholder="全部平台"
                clearable
                size="small"
                style="width: 140px"
                @change="handlePlatformFilterChange"
              >
                <el-option label="飞书" value="feishu" />
                <el-option label="企业微信" value="wecom" />
              </el-select>
            </div>
            <div class="list-page-search-form__actions message-push-toolbar__actions">
              <el-button
                size="small"
                :disabled="loading || deleteLoading"
                @click="openSettingPanel"
              >
                通知设置
              </el-button>
              <el-button
                size="small"
                type="primary"
                :disabled="loading || deleteLoading"
                @click="openDialog()"
                >新增渠道</el-button
              >
            </div>
          </div>
        </div>
      </template>

      <template #table>
        <div
          class="list-page-panel list-page-panel--flat list-page-table-panel list-page-table-panel--flat"
        >
          <div class="list-page-table-panel__body">
            <div class="common-table">
              <vxe-grid v-bind="gridOptions" :data="filteredList" :loading="loading">
                <template #nameSlot="{ row }">
                  <span>{{ row.name }}</span>
                </template>

                <template #platformSlot="{ row }">
                  <div class="platform-cell">
                    <img
                      :src="row.platform === 'feishu' ? feishuIcon : wecomIcon"
                      class="platform-icon"
                      :alt="row.platform"
                    />
                    <span class="platform-name">{{ platformLabelMap[row.platform] || row.platform }}</span>
                  </div>
                </template>

                <template #enabledSlot="{ row }">
                  <el-tag size="small" :type="row.enabled ? 'success' : 'info'">
                    {{ row.enabled ? "启用" : "停用" }}
                  </el-tag>
                </template>

                <template #webhookSlot="{ row }">
                  <div class="message-push-url">{{ maskWebhook(row.webhookUrl) }}</div>
                </template>

                <template #remarkSlot="{ row }">
                  <span class="table-meta-text">{{ row.remark || "-" }}</span>
                </template>

                <template #operationDefaultSlot="{ row }">
                  <div class="flex justify-start">
                    <el-dropdown
                      class="operation-dropdown"
                      placement="bottom-end"
                      @command="(command) => handleOperationCommand(String(command), row)"
                    >
                      <el-button type="primary" link size="small" class="operation-trigger-button"
                        >操作</el-button
                      >
                      <template #dropdown>
                        <el-dropdown-menu class="operation-menu-compact">
                          <el-dropdown-item command="test">
                            <span>测试发送</span>
                          </el-dropdown-item>
                          <el-dropdown-item command="edit">
                            <span>编辑</span>
                          </el-dropdown-item>
                          <el-dropdown-item
                            command="delete"
                            divided
                            class="operation-menu-item--danger"
                          >
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
    </ListPageLayout>

    <MessagePushDialog ref="dialogRef" @success="refreshPageData" />
    <MessagePushSettingPanel ref="settingPanelRef" @saved="handleMessagePushSettingSaved" />
    <MessagePushTestDialog ref="testDialogRef" />
  </ContentWrap>
</template>

<script setup lang="ts">
import { onMounted, ref, watchEffect } from "vue";
import { useWindowSize } from "@vueuse/core";
import { ElMessage, ElMessageBox } from "element-plus";
import {
  deleteMessagePush,
  getMessagePushList,
  type MessagePushConfig,
  type MessagePushPlatform,
} from "@/api/messagePush";
import { feishuIcon, wecomIcon } from "@/assets/icons/apps";
import { buildOperationColumn, buildTimeColumn, commonGridOptions } from "@/common/table";
import { syncMessagePushMenuState } from "@/services/messagePushState";
import MessagePushDialog from "./components/MessagePushDialog.vue";
import MessagePushSettingPanel from "./components/MessagePushSettingPanel.vue";
import MessagePushTestDialog from "./components/MessagePushTestDialog.vue";

const loading = ref(false);
const deleteLoading = ref(false);
const list = ref<MessagePushConfig[]>([]);
const platformFilter = ref<MessagePushPlatform | "">("");
const dialogRef = ref();
const settingPanelRef = ref();
const testDialogRef = ref();

const platformLabelMap: Record<MessagePushPlatform, string> = {
  feishu: "飞书",
  wecom: "企业微信",
};

const { height } = useWindowSize();

const gridOptions = ref({
  ...commonGridOptions,
  maxHeight: Math.max(height.value - 280, 360),
  columns: [
    { title: "渠道名称", field: "name", minWidth: 200, slots: { default: "nameSlot" } },
    {
      title: "创建人",
      field: "uploader",
      width: 140,
      showOverflow: "tooltip",
      formatter: ({ row }) => row?.uploader?.account || row?.uploader?.name || row?.userId || "-",
    },
    { title: "平台", field: "platform", width: 120, slots: { default: "platformSlot" } },
    { title: "状态", field: "enabled", width: 100, slots: { default: "enabledSlot" } },
    { title: "Webhook", field: "webhookUrl", minWidth: 360, slots: { default: "webhookSlot" } },
    {
      title: "备注",
      field: "remark",
      minWidth: 220,
      showOverflow: "tooltip",
      slots: { default: "remarkSlot" },
    },
    buildTimeColumn("创建时间", "createTime"),
    buildOperationColumn("operationDefaultSlot"),
  ],
});

watchEffect(() => {
  gridOptions.value.maxHeight = Math.max(height.value - 280, 360);
});

const maskWebhook = (url?: string) => {
  const value = String(url || "").trim();
  if (!value) return "-";
  if (value.length <= 36) return value;
  return `${value.slice(0, 20)}...${value.slice(-12)}`;
};

const filteredList = computed(() => {
  if (!platformFilter.value) return list.value;
  return list.value.filter((item) => item.platform === platformFilter.value);
});

const handlePlatformFilterChange = () => {
  // 筛选变化时自动通过 computed 更新
};

const getList = async () => {
  loading.value = true;
  try {
    const data = await getMessagePushList();
    list.value = Array.isArray(data) ? data : [];
  } finally {
    loading.value = false;
  }
};

const refreshPageData = async () => {
  await getList();
};

const openDialog = (id?: number) => {
  dialogRef.value?.open(id);
};

const openSettingPanel = () => {
  settingPanelRef.value?.open();
};

const openTestDialog = (row: MessagePushConfig) => {
  testDialogRef.value?.open({
    id: Number(row.id),
    name: row.name,
  });
};

const handleMessagePushSettingSaved = async () => {
  await getList();
};

const handleOperationCommand = (command: string, row: MessagePushConfig) => {
  if (command === "test") {
    openTestDialog(row);
    return;
  }
  if (command === "edit") {
    openDialog(row.id);
    return;
  }
  if (command === "delete") {
    handleDelete(row.id as number);
  }
};

const handleDelete = async (id: number) => {
  try {
    await ElMessageBox.confirm(
      "确认删除该推送渠道吗？删除后按该渠道 ID 的开放发送调用将失效。",
      "提示",
      {
        type: "warning",
      },
    );
    deleteLoading.value = true;
    await deleteMessagePush(id);
    ElMessage.success("删除成功");
    await refreshPageData();
  } catch {
  } finally {
    deleteLoading.value = false;
  }
};

onMounted(() => {
  refreshPageData();
});
</script>

<style scoped lang="scss">
:deep(.message-push-page) {
  gap: 10px;
  padding: 8px 0 0;
}

:deep(.message-push-page .list-page-layout__main) {
  gap: 10px;
}

.message-push-url {
  font-size: 12px;
  line-height: 1.5;
  color: var(--el-text-color-secondary);
  word-break: break-all;
}

.platform-cell {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.platform-icon {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
}

.platform-name {
  font-size: 12px;
  color: var(--el-text-color-primary);
}

.message-push-toolbar {
  display: flex;
  width: 100%;
  min-height: 32px;
  align-items: center;
  justify-content: space-between;
}

.message-push-toolbar__filter {
  display: flex;
  align-items: center;
  gap: 8px;
}

.message-push-toolbar__actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  margin-left: auto;
}

.message-push-toolbar__actions :deep(.el-button + .el-button) {
  margin-left: 0;
}

:deep(.message-push-page .list-page-filter--flat) {
  gap: 12px;
  padding-bottom: 12px;
}

:deep(.message-push-page .list-page-filter__row) {
  width: 100%;
}

:deep(.message-push-page .list-page-table-panel__body) {
  padding-top: 0;
}

:deep(.message-push-page .list-page-table-panel__pagination--flat) {
  padding-top: 12px;
}
</style>
