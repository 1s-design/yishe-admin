<template>
  <ContentWrap :plain="true">
    <ListPageLayout class="ai-api-key-page">
      <template #filter>
        <div class="list-page-filter list-page-filter--flat">
          <div class="list-page-filter__row">
            <div class="list-page-search-form__actions">
              <el-input
                v-model="queryParams.keyword"
                class="ai-api-key-search"
                clearable
                placeholder="搜索名称 / 默认模型 / Base URL"
                size="small"
                @clear="handleSearch"
                @keyup.enter="handleSearch"
              />
              <el-select
                v-model="queryParams.enabled"
                class="ai-api-key-status-filter"
                clearable
                placeholder="启用状态"
                size="small"
                @change="handleSearch"
                @clear="handleSearch"
              >
                <el-option label="启用" value="true" />
                <el-option label="停用" value="false" />
              </el-select>
              <el-button size="small" :disabled="loading" @click="openUsageSettingDialog()">
                AI 使用设置
              </el-button>
              <el-button size="small" :disabled="loading" @click="handleSearch">查询</el-button>
              <el-button
                size="small"
                type="primary"
                :disabled="loading || deleteLoading"
                @click="openDialog()"
              >
                新增 Key
              </el-button>
            </div>
          </div>
        </div>
      </template>

      <template #table>
        <div
          class="list-page-panel list-page-panel--flat list-page-table-panel list-page-table-panel--flat"
        >
          <div class="ai-api-key-tabs">
            <el-tabs v-model="activeTab">
              <el-tab-pane :label="`我的 Key (${mineList.length})`" name="mine" />
              <el-tab-pane :label="`公开 Key (${publicList.length})`" name="public" />
            </el-tabs>
          </div>

          <div class="list-page-table-panel__body">
            <div class="common-table">
              <vxe-grid
                :key="activeTab"
                v-bind="currentGridOptions"
                :max-height="tableMaxHeight"
                :data="currentList"
                :loading="loading"
              >
                <template #enabledSlot="{ row }">
                  <div class="ai-api-key-switch-cell">
                    <el-switch
                      :model-value="row.enabled"
                      :loading="statusLoadingId === row.id"
                      inline-prompt
                      active-text="开"
                      inactive-text="关"
                      @change="(value) => handleToggleEnabled(row, value === true)"
                    />
                    <span class="table-meta-text">
                      {{ row.enabled ? "启用" : "停用" }}
                    </span>
                  </div>
                </template>

                <template #publicSlot="{ row }">
                  <div class="ai-api-key-switch-cell">
                    <el-switch
                      :model-value="row.isPublic"
                      :disabled="!canManagePublic"
                      :loading="publicLoadingId === row.id"
                      inline-prompt
                      active-text="开"
                      inactive-text="关"
                      @change="(value) => handleTogglePublic(row, value === true)"
                    />
                    <span class="table-meta-text">
                      {{ row.isPublic ? "公开" : "私有" }}
                    </span>
                  </div>
                </template>

                <template #apiKeySlot="{ row }">
                  <div class="ai-api-key-mask">
                    <span>{{ getDisplayedApiKey(row) }}</span>
                    <el-button
                      v-if="row.id"
                      link
                      size="small"
                      :loading="apiKeyLoadingId === row.id"
                      @click="handleToggleApiKeyVisible(row)"
                    >
                      {{ isApiKeyVisible(row) ? "隐藏" : "查看明文" }}
                    </el-button>
                  </div>
                </template>

                <template #availabilitySlot="{ row }">
                  <div class="ai-api-key-availability">
                    <el-tag
                      size="small"
                      :type="row.available === false ? 'danger' : 'success'"
                      effect="plain"
                    >
                      {{ row.available === false ? row.unavailableReasonText || "不可用" : "可用" }}
                    </el-tag>
                  </div>
                </template>

                <template #expiresAtSlot="{ row }">
                  <span :class="['table-meta-text', { 'is-expired': isExpired(row.expiresAt) }]">
                    {{ formatExpiresAt(row.expiresAt) }}
                  </span>
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
                      <el-button type="primary" link size="small" class="operation-trigger-button">
                        操作
                      </el-button>
                      <template #dropdown>
                        <el-dropdown-menu class="operation-menu-compact">
                          <el-dropdown-item command="edit">
                            <span>编辑</span>
                          </el-dropdown-item>
                          <el-dropdown-item command="apply-all">
                            <span>一键应用</span>
                          </el-dropdown-item>
                          <el-dropdown-item v-if="canManagePublic" command="share">
                            <span>分享给用户</span>
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

      <template #pagination>
        <div
          v-if="activeTab === 'mine'"
          class="list-page-panel list-page-panel--flat list-page-table-panel__pagination list-page-table-panel__pagination--flat"
        >
          <pagination
            :total="mineTotal"
            v-model:page="queryParams.currentPage"
            v-model:limit="queryParams.pageSize"
            @pagination="getList"
          />
        </div>
      </template>
    </ListPageLayout>

    <AiApiKeyDialog ref="dialogRef" @success="handleDialogSuccess" />
    <AiApiKeyShareDialog ref="shareDialogRef" @success="handleDialogSuccess" />
    <AiUsageSettingPanel ref="usageSettingDialogRef" @saved="handleUsageSettingSaved" />
  </ContentWrap>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { useWindowSize } from "@vueuse/core";
import { ElMessage, ElMessageBox } from "element-plus";
import {
  applyAiApiKeyToAllFeatures,
  deleteAiApiKey,
  getAiApiKeyDetail,
  getAiApiKeyList,
  getPublicAiApiKeyList,
  updateAiApiKey,
  type AiApiKeyConfig,
} from "@/api/aiApiKey";
import { buildOperationColumn, buildTimeColumn, commonGridOptions } from "@/common/table";
import { useUserStore } from "@/store/modules/user";
import AiApiKeyDialog from "./components/AiApiKeyDialog.vue";
import AiApiKeyShareDialog from "./components/AiApiKeyShareDialog.vue";
import AiUsageSettingPanel from "./components/AiUsageSettingPanel.vue";
import { refreshAiConfigState } from "@/services/aiConfigState";

const userStore = useUserStore();
const canManagePublic = computed(() => !!userStore.user?.isAdmin);

const loading = ref(false);
const deleteLoading = ref(false);
const statusLoadingId = ref<number | null>(null);
const publicLoadingId = ref<number | null>(null);
const apiKeyLoadingId = ref<number | null>(null);
const activeTab = ref<"mine" | "public">("mine");
const mineList = ref<AiApiKeyConfig[]>([]);
const publicList = ref<AiApiKeyConfig[]>([]);
const mineTotal = ref(0);
const dialogRef = ref();
const shareDialogRef = ref();
const usageSettingDialogRef = ref();
const revealedApiKeyMap = reactive<Record<number, boolean>>({});
const plainApiKeyMap = reactive<Record<number, string>>({});
const queryParams = reactive({
  currentPage: 1,
  pageSize: 10,
  keyword: "",
  enabled: "",
});

const { height } = useWindowSize();
const tableMaxHeight = computed(() => Math.max(height.value - 280, 360));

const mineGridOptions = computed(() => ({
  ...commonGridOptions,
  maxHeight: tableMaxHeight.value,
  columns: [
    { title: "ID", field: "id", width: 80 },
    { title: "名称", field: "name", minWidth: 180 },
    {
      title: "创建人",
      field: "uploader",
      width: 140,
      showOverflow: "tooltip",
      formatter: ({ row }) => row?.uploader?.account || row?.uploader?.name || row?.userId || "-",
    },
    {
      title: "默认模型",
      field: "model",
      minWidth: 180,
      showOverflow: "tooltip",
      formatter: ({ row }) => row?.model || "-",
    },
    { title: "状态", field: "enabled", width: 110, slots: { default: "enabledSlot" } },
    { title: "公开", field: "isPublic", width: 110, slots: { default: "publicSlot" } },
    { title: "密钥", field: "maskedApiKey", minWidth: 360, slots: { default: "apiKeySlot" } },
    { title: "过期时间", field: "expiresAt", minWidth: 180, slots: { default: "expiresAtSlot" } },
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
}));

const publicGridOptions = computed(() => ({
  ...commonGridOptions,
  maxHeight: tableMaxHeight.value,
  columns: [
    { title: "ID", field: "id", width: 80 },
    { title: "名称", field: "name", minWidth: 180 },
    {
      title: "创建人",
      field: "uploader",
      width: 140,
      showOverflow: "tooltip",
      formatter: ({ row }) => row?.uploader?.account || row?.uploader?.name || row?.userId || "-",
    },
    {
      title: "默认模型",
      field: "model",
      minWidth: 180,
      showOverflow: "tooltip",
      formatter: ({ row }) => row?.model || "-",
    },
    { title: "可用状态", field: "available", width: 120, slots: { default: "availabilitySlot" } },
    { title: "过期时间", field: "expiresAt", minWidth: 180, slots: { default: "expiresAtSlot" } },
    {
      title: "备注",
      field: "remark",
      minWidth: 220,
      showOverflow: "tooltip",
      slots: { default: "remarkSlot" },
    },
    buildTimeColumn("更新时间", "updateTime"),
  ],
}));

const currentGridOptions = computed(() => {
  return activeTab.value === "mine" ? mineGridOptions.value : publicGridOptions.value;
});

const currentList = computed(() => {
  return activeTab.value === "mine" ? mineList.value : publicList.value;
});

const maskApiKey = (value?: string) => {
  const key = String(value || "").trim();
  if (!key) return "-";
  if (key.length <= 10) {
    return `${key.slice(0, 2)}****${key.slice(-2)}`;
  }
  return `${key.slice(0, 6)}...${key.slice(-4)}`;
};

const isApiKeyVisible = (row: AiApiKeyConfig) => {
  if (!row.id) return false;
  return !!revealedApiKeyMap[row.id];
};

const getDisplayedApiKey = (row: AiApiKeyConfig) => {
  if (row.id && revealedApiKeyMap[row.id] && plainApiKeyMap[row.id]) {
    return plainApiKeyMap[row.id];
  }
  return row.maskedApiKey || maskApiKey(row.apiKey);
};

const isExpired = (expiresAt?: string | null) => {
  if (!expiresAt) return false;
  const timestamp = new Date(expiresAt).getTime();
  if (Number.isNaN(timestamp)) return false;
  return timestamp < Date.now();
};

const formatExpiresAt = (expiresAt?: string | null) => {
  if (!expiresAt) return "长期有效";
  return isExpired(expiresAt) ? `${expiresAt}（已过期）` : expiresAt;
};

const resetPlainKeyState = () => {
  Object.keys(revealedApiKeyMap).forEach((key) => {
    delete revealedApiKeyMap[Number(key)];
  });
  Object.keys(plainApiKeyMap).forEach((key) => {
    delete plainApiKeyMap[Number(key)];
  });
};

const getList = async () => {
  loading.value = true;
  try {
    const [mineData, publicData] = await Promise.all([
      getAiApiKeyList({
        page: queryParams.currentPage,
        pageSize: queryParams.pageSize,
        keyword: queryParams.keyword || undefined,
        enabled: queryParams.enabled || undefined,
      }),
      getPublicAiApiKeyList(),
    ]);
    mineList.value = Array.isArray(mineData?.list) ? mineData.list : [];
    mineTotal.value = Number(mineData?.total || 0);
    publicList.value = Array.isArray(publicData) ? publicData : [];
    resetPlainKeyState();
    void refreshAiConfigState();
  } finally {
    loading.value = false;
  }
};

const handleSearch = async () => {
  queryParams.currentPage = 1;
  await getList();
};

const handleDialogSuccess = async () => {
  await getList();
};

const handleUsageSettingSaved = () => {
  void refreshAiConfigState();
};

const openDialog = (id?: number) => {
  dialogRef.value?.open(id);
};

const openShareDialog = (row: AiApiKeyConfig) => {
  shareDialogRef.value?.open(row);
};

const openUsageSettingDialog = () => {
  usageSettingDialogRef.value?.open();
};

const handleToggleEnabled = async (row: AiApiKeyConfig, enabled: boolean) => {
  if (!row.id || statusLoadingId.value === row.id) return;

  statusLoadingId.value = row.id;
  try {
    await updateAiApiKey(row.id, { enabled });
    row.enabled = enabled;
    await getList();
    ElMessage.success(enabled ? "已启用该 Key" : "已停用该 Key");
  } catch (error: any) {
    ElMessage.error(error?.message || "更新状态失败");
  } finally {
    statusLoadingId.value = null;
  }
};

const handleTogglePublic = async (row: AiApiKeyConfig, isPublic: boolean) => {
  if (!row.id || publicLoadingId.value === row.id || !canManagePublic.value) return;

  publicLoadingId.value = row.id;
  try {
    await updateAiApiKey(row.id, { isPublic });
    row.isPublic = isPublic;
    await getList();
    ElMessage.success(isPublic ? "已公开该 Key" : "已取消公开该 Key");
  } catch (error: any) {
    ElMessage.error(error?.message || "更新公开状态失败");
  } finally {
    publicLoadingId.value = null;
  }
};

const handleToggleApiKeyVisible = async (row: AiApiKeyConfig) => {
  if (!row.id) return;
  if (revealedApiKeyMap[row.id]) {
    revealedApiKeyMap[row.id] = false;
    return;
  }

  apiKeyLoadingId.value = row.id;
  try {
    const detail = await getAiApiKeyDetail(row.id);
    plainApiKeyMap[row.id] = String(detail.apiKey || "").trim();
    revealedApiKeyMap[row.id] = true;
  } catch (error: any) {
    ElMessage.error(error?.message || "获取密钥明文失败");
  } finally {
    apiKeyLoadingId.value = null;
  }
};

const handleOperationCommand = (command: string, row: AiApiKeyConfig) => {
  if (command === "edit") {
    openDialog(row.id);
    return;
  }
  if (command === "share") {
    openShareDialog(row);
    return;
  }
  if (command === "apply-all") {
    handleApplyToAll(row);
    return;
  }
  if (command === "delete") {
    handleDelete(row.id as number);
  }
};

const handleDelete = async (id: number) => {
  try {
    await ElMessageBox.confirm(
      "确认删除这个 AI API Key 吗？删除后将无法继续在后续接入中复用。",
      "提示",
      {
        type: "warning",
      },
    );
    deleteLoading.value = true;
    await deleteAiApiKey(id);
    ElMessage.success("删除成功");
    await getList();
  } catch {
  } finally {
    deleteLoading.value = false;
  }
};

const handleApplyToAll = async (row: AiApiKeyConfig) => {
  if (!row.enabled) {
    ElMessage.warning("该 Key 已停用，请先启用后再应用");
    return;
  }
  try {
    await ElMessageBox.confirm(
      `确认将「${row.name}」应用到所有 AI 功能吗？这将覆盖所有功能场景的现有绑定。`,
      "一键应用",
      { type: "warning" },
    );
    const res: any = await applyAiApiKeyToAllFeatures(row.id as number);
    ElMessage.success(`已应用到 ${res?.appliedCount || 0} 个功能场景`);
  } catch (err: any) {
    if (err !== "cancel") {
      ElMessage.error(err?.message || "应用失败");
    }
  }
};

onMounted(() => {
  getList();
});
</script>

<style scoped lang="scss">
:deep(.ai-api-key-page) {
  gap: 10px;
  padding: 8px 0 0;
}

:deep(.ai-api-key-page .list-page-layout__main) {
  gap: 10px;
}

.ai-api-key-tabs {
  padding: 0 14px;
}

.ai-api-key-tabs :deep(.el-tabs__header) {
  margin-bottom: 10px;
}

.ai-api-key-search {
  width: 260px;
}

.ai-api-key-status-filter {
  width: 120px;
}

.ai-api-key-mask {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  line-height: 1.5;
  color: var(--el-text-color-secondary);
  word-break: break-all;
}

.ai-api-key-mask span {
  flex: 1;
  min-width: 0;
}

.ai-api-key-mask :deep(.el-button) {
  flex-shrink: 0;
}

.ai-api-key-switch-cell {
  display: inline-flex;
  align-items: center;
  gap: 10px;
}

.ai-api-key-availability {
  display: inline-flex;
  align-items: center;
}

.table-meta-text.is-expired {
  color: var(--el-color-danger);
}

:deep(.ai-api-key-page .list-page-filter--flat) {
  gap: 10px;
  padding-bottom: 10px;
}

:deep(.ai-api-key-page .list-page-table-panel__pagination--flat) {
  padding-top: 10px;
}
</style>
