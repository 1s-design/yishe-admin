<template>
  <div class="client-management" v-loading="loading">
    <div class="top-bar">
      <div class="top-bar__left">
        <span class="top-bar__title">客户端管理</span>
        <span class="top-bar__count" v-if="clients.length">{{ clients.length }} 个节点</span>
        <el-tag v-if="onlineCount > 0" type="success" size="small" effect="plain" round>
          {{ onlineCount }} 在线
        </el-tag>
      </div>
      <div class="top-bar__actions">
        <el-button
          v-if="selectedClient"
          text
          size="small"
          @click="handleRename"
        >
          <el-icon><EditPen /></el-icon>
          <span>重命名</span>
        </el-button>
        <el-button text size="small" @click="handleRefresh" :loading="loading">
          <el-icon><Refresh /></el-icon>
        </el-button>
      </div>
    </div>

    <div class="body">
      <ExternalClientSidebar
        class="sidebar"
        :items="clientNodeItems"
        :loading="loading"
        :selected-client-id="selectedClientId"
        @select="selectedClientId = $event"
      />

      <section class="main">
        <template v-if="selectedClient">
          <el-tabs v-model="activeTab" class="tabs">
            <el-tab-pane label="服务详情" name="service-status">
              <ClientServiceStatus :client="selectedClient" />
            </el-tab-pane>
            <el-tab-pane label="连接信息" name="connection-info">
              <ClientConnectionInfo :client="selectedClient" />
            </el-tab-pane>
            <el-tab-pane label="文件下载" name="file-download">
              <ClientFileDownloadPanel
                :client-id="selectedClientId"
                :client-name="selectedClientDisplayName"
              />
            </el-tab-pane>
          </el-tabs>
        </template>

        <div v-else class="empty-state">
          <el-empty description="请选择客户端节点" :image-size="64" />
        </div>
      </section>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed, ref, watch, onMounted } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { EditPen, Refresh } from "@element-plus/icons-vue";
import ExternalClientSidebar, {
  type ClientNodeItem,
} from "@/views/external/components/ExternalClientSidebar.vue";
import ClientFileDownloadPanel from "./components/ClientFileDownloadPanel.vue";
import ClientServiceStatus from "./components/ClientServiceStatus.vue";
import ClientConnectionInfo from "./components/ClientConnectionInfo.vue";
import { useClientNodeState } from "@/services/clientNodeState";
import {
  updateWebsocketClientAlias,
  type WebsocketConnectionVO,
} from "@/api/system/websocket";
import { formatDate } from "@/utils/formatTime";

const { clients, loading, refresh } = useClientNodeState();

const selectedClientId = ref<string>("");
const activeTab = ref("service-status");

const onlineCount = computed(() => clients.value.filter((c) => c.isOnline).length);

const getClientLabel = (client?: WebsocketConnectionVO | null) => {
  if (!client) return "未选择";
  return (
    client.displayName ||
    client.alias ||
    client.clientInfo?.machine?.code ||
    client.id
  );
};

const clientNodeItems = computed<ClientNodeItem[]>(() =>
  clients.value.map((client) => {
    const machineCode = client.clientInfo?.machine?.code || "";
    const label = getClientLabel(client);
    const detailParts = [
      machineCode && label !== machineCode ? `设备码: ${machineCode}` : "",
      client.clientInfo?.workspaceDirectory
        ? `工作目录: ${client.clientInfo.workspaceDirectory}`
        : "",
    ].filter(Boolean);
    return {
      connectionId: client.id,
      name: label,
      time: dateText(client.lastOnlineAt || client.connectedAt || client.lastOfflineAt),
      metaLeft: client.clientInfo?.app?.version || "",
      metaRight: client.clientInfo?.location?.city || "",
      detail: detailParts.join(" · "),
      isOnline: !!client.isOnline,
    };
  }),
);

const dateText = (value?: string | null) =>
  value ? formatDate(new Date(value), "YYYY-MM-DD HH:mm:ss") : "-";

const selectedClient = computed(() =>
  clients.value.find((c) => c.id === selectedClientId.value),
);

const selectedClientDisplayName = computed(() => getClientLabel(selectedClient.value));

const handleRefresh = async () => {
  await refresh({ force: true } as any);
  ElMessage.success("已刷新");
};

const handleRename = async () => {
  const client = selectedClient.value;
  if (!client) return;
  try {
    const { value } = await ElMessageBox.prompt(
      "输入便于识别的名称（留空将恢复默认名称）",
      "重命名客户端",
      {
        confirmButtonText: "保存",
        cancelButtonText: "取消",
        inputValue: client.alias || "",
        inputPlaceholder: "例如：办公室 Mac / 采集机 Win",
        inputValidator: (val) => {
          if (val && val.trim().length > 80) {
            return "客户端名称不能超过 80 个字符";
          }
          return true;
        },
      },
    );
    const nextAlias = String(value || "").trim() || null;
    await updateWebsocketClientAlias(client.id, nextAlias);
    await refresh({ force: true } as any);
    ElMessage.success(nextAlias ? "客户端名称已更新" : "已恢复默认名称");
  } catch (error: any) {
    if (error === "cancel" || error === "close") return;
    ElMessage.error(error?.message || "重命名失败");
  }
};

onMounted(() => {
  if (clients.value.length > 0 && !selectedClientId.value) {
    selectedClientId.value = clients.value[0].id;
  }
});

watch(clients, (newClients) => {
  if (newClients.length > 0 && !selectedClientId.value) {
    selectedClientId.value = newClients[0].id;
  }
});
</script>

<style scoped lang="scss">
.client-management {
  display: flex;
  height: 100%;
  flex-direction: column;
}

.top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;

  &__left {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  &__actions {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  &__title {
    font-size: 14px;
    font-weight: 600;
  }

  &__count {
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }
}

.body {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.sidebar {
  width: 240px;
  flex-shrink: 0;
  border-right: 1px solid var(--el-border-color-lighter);
}

.main {
  padding: 12px 16px;
  overflow-y: auto;
  flex: 1;
}

.tabs {
  :deep(.el-tabs__header) {
    margin-bottom: 10px;
  }

  :deep(.el-tabs__nav-wrap::after) {
    display: none;
  }
}

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  min-height: 300px;
}
</style>
