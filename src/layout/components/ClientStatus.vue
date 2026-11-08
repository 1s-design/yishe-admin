<template>
  <div class="header-connection-status">
    <el-popover
      v-model:visible="popoverVisible"
      trigger="click"
      placement="bottom-end"
      :width="344"
      :show-after="0"
      :hide-after="0"
      transition="header-connection-status-pop"
      popper-class="header-connection-status-popover"
    >
      <template #reference>
        <button
          type="button"
          class="header-connection-status__trigger"
          :class="isRemoteConnected ? 'is-online' : 'is-offline'"
          :title="triggerSummaryText"
          :aria-label="t('layout.connection.connectionStatus')"
          @click="handleTriggerClick"
        >
          <span class="th-action-icon">
            <span class="header-connection-status__signal" aria-hidden="true" />
          </span>
          <span class="th-action-label">{{ t("layout.connection.connection") }}</span>
        </button>
      </template>

      <div class="header-connection-status__panel">
        <div class="header-connection-status__panel-head">
          <div class="header-connection-status__panel-title">{{ t("layout.connection.connectionStatusTitle") }}</div>
          <el-button text size="small" :loading="isRefreshing" @click="refreshAllStatuses">
            {{ t("layout.connection.refresh") }}
          </el-button>
        </div>

        <section class="header-connection-status__section">
          <div class="header-connection-status__metrics">
            <div class="header-connection-status__metric">
              <div class="header-connection-status__metric-head">
                <span class="header-connection-status__metric-dot is-plugin" />
                <span>{{ t("layout.connection.extension") }}</span>
              </div>
              <span class="header-connection-status__metric-value">{{ extensionCount }}</span>
            </div>
            <div class="header-connection-status__metric">
              <div class="header-connection-status__metric-head">
                <span class="header-connection-status__metric-dot is-admin" />
                <span>{{ t("layout.connection.admin") }}</span>
              </div>
              <span class="header-connection-status__metric-value">{{ adminCount }}</span>
            </div>
            <div class="header-connection-status__metric">
              <div class="header-connection-status__metric-head">
                <span class="header-connection-status__metric-dot is-client" />
                <span>{{ t("layout.connection.client") }}</span>
              </div>
              <span class="header-connection-status__metric-value">{{ clientRuntimeCount }}</span>
            </div>
            <div class="header-connection-status__metric">
              <div class="header-connection-status__metric-head">
                <span class="header-connection-status__metric-dot is-design-tool" />
                <span>{{ t("layout.connection.designTool") }}</span>
              </div>
              <span class="header-connection-status__metric-value">{{ designToolCount }}</span>
            </div>
          </div>
        </section>

        <section class="header-connection-status__section">
          <div class="header-connection-status__section-title">{{ t("layout.connection.connectionOverview") }}</div>
          <div class="header-connection-status__status-lines">
            <div class="header-connection-status__status-line">
              <div class="header-connection-status__status-main">
                <span
                  class="header-connection-status__status-dot"
                  :class="isRemoteConnected ? 'is-online' : 'is-offline'"
                />
                <div class="header-connection-status__status-copy">
                  <div class="header-connection-status__status-title">{{ t("layout.connection.admin") }}</div>
                  <div class="header-connection-status__status-meta">
                    {{ remoteStatusText }} · {{ remoteStatusMeta }}
                  </div>
                </div>
              </div>
              <el-button v-if="!isRemoteConnected" link size="small" @click="reconnectRemote">
                {{ t("layout.connection.reconnect") }}
              </el-button>
            </div>

            <div class="header-connection-status__status-line">
              <div class="header-connection-status__status-main">
                <span
                  class="header-connection-status__status-dot"
                  :class="onlineClientCount > 0 ? 'is-online' : 'is-offline'"
                />
                <div class="header-connection-status__status-copy">
                  <div class="header-connection-status__status-title">{{ t("layout.connection.client") }}</div>
                  <div class="header-connection-status__status-meta">
                    {{ clientNodeStatusText }} · {{ clientNodeMeta }}
                  </div>
                </div>
              </div>
              <el-button link size="small" @click="handleClientAction">
                {{ hasClientRecords ? t("layout.connection.view") : t("layout.connection.start") }}
              </el-button>
            </div>

            <div class="header-connection-status__status-line">
              <div class="header-connection-status__status-main">
                <span
                  class="header-connection-status__status-dot"
                  :class="extensionCount > 0 ? 'is-online' : 'is-offline'"
                />
                <div class="header-connection-status__status-copy">
                  <div class="header-connection-status__status-title">{{ t("layout.connection.extension") }}</div>
                  <div class="header-connection-status__status-meta">
                    {{ extensionStatusText }} · {{ extensionStatusMeta }}
                  </div>
                </div>
              </div>
            </div>

            <div class="header-connection-status__status-line">
              <div class="header-connection-status__status-main">
                <span
                  class="header-connection-status__status-dot"
                  :class="designToolCount > 0 ? 'is-online' : 'is-offline'"
                />
                <div class="header-connection-status__status-copy">
                  <div class="header-connection-status__status-title">{{ t("layout.connection.designTool") }}</div>
                  <div class="header-connection-status__status-meta">
                    {{ designToolStatusText }} · {{ designToolStatusMeta }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </el-popover>

    <ClientConnectionsDialog
      v-model="clientDialogVisible"
      @update:model-value="handleClientDialogVisibleChange"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import { ElMessage } from "element-plus";
import ClientConnectionsDialog from "@/components/ClientConnectionsDialog/index.vue";
import {
  clearConnectionChecks,
  clientRefreshLoading,
  isRemoteConnected,
  myClients,
  refreshMyClients,
  startConnectionChecks,
  startWebSocketConnection,
} from "@/stores/connectionStatus";
import { websocketClient } from "@/services/websocketClient";
import { formatPast } from "@/utils/formatTime";
import { useMyRuntimeConnectionStoreRefs } from "@/store/modules/myRuntimeConnection";
import { resolveRuntimeConnectionSourceKey } from "@/utils/websocketConnection";

defineOptions({ name: "ClientStatus" });

const { t } = useI18n();

const popoverVisible = ref(false);
const clientDialogVisible = ref(false);
const {
  store: runtimeConnectionStore,
  connections: runtimeConnections,
  loading: runtimeConnectionLoading,
} = useMyRuntimeConnectionStoreRefs();
const hasClientRecords = computed(() => myClients.value.length > 0);
const clientRecordCount = computed(() => myClients.value.length);
const onlineClientCount = computed(
  () => myClients.value.filter((client) => client.isOnline).length,
);
const offlineClientCount = computed(
  () => myClients.value.filter((client) => !client.isOnline).length,
);
const onlineRuntimeConnections = computed(() =>
  runtimeConnections.value.filter((connection) => connection.isOnline !== false),
);
const runtimeConnectionCountBySource = (source: "extension" | "admin" | "client" | "design-tool") =>
  onlineRuntimeConnections.value.filter(
    (connection) => resolveRuntimeConnectionSourceKey(connection) === source,
  ).length;
const extensionCount = computed(() => runtimeConnectionCountBySource("extension"));
const adminCount = computed(() =>
  Math.max(runtimeConnectionCountBySource("admin"), isRemoteConnected.value ? 1 : 0),
);
const clientRuntimeCount = computed(() =>
  Math.max(runtimeConnectionCountBySource("client"), onlineClientCount.value),
);
const designToolCount = computed(() => runtimeConnectionCountBySource("design-tool"));
const runtimeTotalCount = computed(() => adminCount.value + clientRuntimeCount.value + designToolCount.value);
const isRefreshing = computed(() => clientRefreshLoading.value || runtimeConnectionLoading.value);
const triggerSummaryText = computed(() => {
  const nodeText = clientRecordCount.value
    ? `节点 ${onlineClientCount.value}/${clientRecordCount.value}`
    : "无节点";

  if (runtimeTotalCount.value > 0) {
    return t('layout.connection.onlineWithNodes', { total: runtimeTotalCount.value, nodeText });
  }

  return isRemoteConnected.value ? t('layout.connection.connectedWithNodes', { nodeText }) : t('layout.connection.remoteNotConnected');
});
const clientNodeStatusText = computed(() => {
  return t("layout.connection.connectionCount", { count: clientRuntimeCount.value });
});
const clientNodeMeta = computed(() => {
  if (!clientRecordCount.value) {
    return t("layout.connection.noNodes");
  }

  if (onlineClientCount.value === clientRecordCount.value) {
    return t("layout.connection.nodesOnline", { count: clientRecordCount.value });
  }

  if (onlineClientCount.value > 0) {
    return t('layout.connection.nodesOnlineCount', { online: onlineClientCount.value, total: clientRecordCount.value });
  }

  return t("layout.connection.nodesOffline", { count: offlineClientCount.value });
});
const extensionStatusText = computed(() => t("layout.connection.connectionCount", { count: extensionCount.value }));
const extensionStatusMeta = computed(() =>
  extensionCount.value > 0 ? t("layout.connection.currentAccountOnline") : t("layout.connection.viewInRemoteConnectionPage"),
);
const designToolStatusText = computed(() => t("layout.connection.connectionCount", { count: designToolCount.value }));
const designToolStatusMeta = computed(() =>
  designToolCount.value > 0 ? t("layout.connection.currentAccountOnline") : t("layout.connection.noConnections"),
);

let timers: { localTimer: number; remoteTimer: number } | null = null;
let runtimeRefreshTimer: ReturnType<typeof setInterval> | null = null;

const remoteStatusText = computed(() => t("layout.connection.connectionCount", { count: adminCount.value }));

const remoteStatusMeta = computed(() => {
  if (isRemoteConnected.value) {
    if (adminCount.value > 1) {
      return t("layout.connection.includesCurrentPage", { count: adminCount.value });
    }

    return websocketClient.state.connectedAt
      ? formatPast(websocketClient.state.connectedAt)
      : t("layout.connection.connectionNormal");
  }

  switch (websocketClient.state.status) {
    case "connecting":
      return t("layout.connection.connecting");
    case "reconnecting":
      return t("layout.connection.reconnecting");
    case "error":
      return t("layout.connection.connectionError");
    default:
      return t("layout.connection.waitingForConnection");
  }
});

function openClient() {
  window.open("yishe://");
}

function handleClientAction() {
  if (hasClientRecords.value) {
    clientDialogVisible.value = true;
    popoverVisible.value = false;
    return;
  }

  openClient();
}

function reconnectRemote() {
  if (isRemoteConnected.value) {
    return;
  }

  const status = websocketClient.state.status;
  if (status === "connecting" || status === "reconnecting") {
    ElMessage.info(t("layout.connection.remoteConnectionRestoring"));
    return;
  }

  websocketClient.reconnect();
  startWebSocketConnection();
  ElMessage.success(t("layout.connection.initiatedReconnect"));
}

function handleTriggerClick(event: MouseEvent) {
  if (isRemoteConnected.value) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();
  reconnectRemote();
}

async function refreshAllStatuses() {
  // 手动刷新：强制回源，不受自动轮询共享窗口影响
  await Promise.all([refreshMyClients(), runtimeConnectionStore.refresh({ force: true })]);
}

function handleClientDialogVisibleChange(value: boolean) {
  clientDialogVisible.value = value;
  if (!value) {
    void refreshMyClients();
  }
}

onMounted(() => {
  timers = startConnectionChecks();
  void runtimeConnectionStore.refresh();
  runtimeRefreshTimer = setInterval(() => {
    if (websocketClient.state.status === "connected") {
      // 兜底轮询：与其余自动刷新共享窗口，实时状态由 WS 推送 patch
      void runtimeConnectionStore.refresh({ polling: true });
    }
  }, 15_000);
});

onUnmounted(() => {
  if (timers) {
    clearConnectionChecks(timers);
  }
  if (runtimeRefreshTimer) {
    clearInterval(runtimeRefreshTimer);
    runtimeRefreshTimer = null;
  }
});
</script>

<style scoped lang="scss">
.header-connection-status {
  display: flex;
  min-width: 0;
  align-items: center;
}

.header-connection-status__trigger {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: inherit;
  cursor: pointer;
  background: transparent;
  border: none;
  transition:
    background 0.15s ease,
    transform 0.15s ease;

  &:active {
    transform: scale(0.94);
  }
}

.header-connection-status__trigger.is-online {
  --status-accent: #67c23a;
}

.header-connection-status__trigger.is-offline {
  --status-accent: #f56c6c;
}

.th-action-icon .header-connection-status__signal {
  display: block;
  width: 10px;
  height: 10px;
  background: var(--status-accent);
  border-radius: 999px;
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--status-accent) 25%, transparent 75%);
  animation: header-connection-status-breathe 2s ease-in-out infinite;
}

.header-connection-status__panel {
  display: flex;
  flex-direction: column;
  gap: 8px;
  will-change: transform, opacity;
}

.header-connection-status__panel-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
  padding-bottom: 1px;
}

.header-connection-status__panel-title {
  font-size: 13px;
  font-weight: 700;
  color: var(--el-text-color-primary);
}

.header-connection-status__section {
  display: flex;
  padding: 10px;
  background: color-mix(in srgb, var(--el-fill-color-light) 38%, var(--el-bg-color) 62%);
  border: 1px solid color-mix(in srgb, var(--app-content-border-color) 62%, transparent 38%);
  border-radius: 12px;
  flex-direction: column;
  gap: 8px;
}

.header-connection-status__section-title {
  font-size: 11px;
  font-weight: 700;
  color: var(--el-text-color-primary);
}

.header-connection-status__metrics {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 6px;
}

.header-connection-status__metric {
  display: flex;
  min-width: 0;
  padding: 8px 8px 7px;
  background: color-mix(in srgb, var(--el-bg-color) 54%, var(--el-fill-color-light) 46%);
  border-radius: 10px;
  box-shadow: inset 0 0 0 1px
    color-mix(in srgb, var(--app-content-border-color) 36%, transparent 64%);
  flex-direction: column;
  gap: 6px;
}

.header-connection-status__metric-head {
  display: inline-flex;
  font-size: 10px;
  font-weight: 600;
  color: var(--el-text-color-secondary);
  align-items: center;
  gap: 5px;
}

.header-connection-status__metric-value {
  font-size: 16px;
  font-weight: 700;
  line-height: 1;
  color: var(--el-text-color-primary);
}

.header-connection-status__metric-dot {
  width: 6px;
  height: 6px;
  flex-shrink: 0;
  border-radius: 999px;
}

.header-connection-status__metric-dot.is-plugin {
  background: #67c23a;
}

.header-connection-status__metric-dot.is-admin {
  background: var(--el-color-primary);
}

.header-connection-status__metric-dot.is-client {
  background: #e6a23c;
}

.header-connection-status__metric-dot.is-design-tool {
  background: #13c2c2;
}

.header-connection-status__status-dot {
  width: 6px;
  height: 6px;
  flex-shrink: 0;
  border-radius: 999px;
}

.header-connection-status__status-dot.is-online {
  background: #67c23a;
}

.header-connection-status__status-dot.is-offline {
  background: #f56c6c;
}

.header-connection-status__status-lines {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.header-connection-status__status-line {
  display: flex;
  padding: 8px 10px;
  background: color-mix(in srgb, var(--el-bg-color) 58%, var(--el-fill-color-light) 42%);
  border-radius: 10px;
  box-shadow: inset 0 0 0 1px
    color-mix(in srgb, var(--app-content-border-color) 34%, transparent 66%);
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}

.header-connection-status__status-main {
  display: flex;
  min-width: 0;
  align-items: flex-start;
  gap: 8px;
}

.header-connection-status__status-copy {
  min-width: 0;
}

.header-connection-status__status-title {
  font-size: 12px;
  font-weight: 600;
  line-height: 1.2;
  color: var(--el-text-color-primary);
}

.header-connection-status__status-meta {
  margin-top: 2px;
  font-size: 10px;
  line-height: 1.35;
  color: var(--el-text-color-secondary);
}

.header-connection-status__runtime-list {
  display: flex;
  max-height: 184px;
  flex-direction: column;
  gap: 5px;
  overflow-y: auto;
}

.header-connection-status__runtime-item {
  display: flex;
  padding: 7px 8px;
  background: color-mix(in srgb, var(--el-bg-color) 58%, var(--el-fill-color-light) 42%);
  border-radius: 10px;
  box-shadow: inset 0 0 0 1px
    color-mix(in srgb, var(--app-content-border-color) 32%, transparent 68%);
  flex-direction: column;
  gap: 3px;
}

.header-connection-status__runtime-main {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 7px;
}

.header-connection-status__runtime-source {
  display: inline-flex;
  min-width: 48px;
  padding: 2px 7px;
  font-size: 9px;
  font-weight: 700;
  white-space: nowrap;
  border: 1px solid transparent;
  border-radius: 999px;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
}

.header-connection-status__runtime-source.is-extension {
  color: #4e9b2f;
  background: color-mix(in srgb, #67c23a 12%, transparent);
  border-color: color-mix(in srgb, #67c23a 34%, transparent);
}

.header-connection-status__runtime-source.is-admin {
  color: var(--el-color-primary);
  background: color-mix(in srgb, var(--el-color-primary) 10%, transparent);
  border-color: color-mix(in srgb, var(--el-color-primary) 30%, transparent);
}

.header-connection-status__runtime-source.is-client {
  color: #c78922;
  background: color-mix(in srgb, #e6a23c 12%, transparent);
  border-color: color-mix(in srgb, #e6a23c 30%, transparent);
}

.header-connection-status__runtime-source.is-unknown {
  color: var(--el-text-color-secondary);
  background: color-mix(in srgb, var(--el-text-color-secondary) 10%, transparent);
  border-color: color-mix(in srgb, var(--el-text-color-secondary) 26%, transparent);
}

.header-connection-status__runtime-title {
  min-width: 0;
  overflow: hidden;
  font-size: 11px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}

.header-connection-status__runtime-meta {
  font-size: 9px;
  line-height: 1.3;
  color: var(--el-text-color-secondary);
}

.header-connection-status__runtime-empty {
  padding: 8px 0 1px;
  font-size: 11px;
  line-height: 1.5;
  color: var(--el-text-color-secondary);
  text-align: center;
  background: color-mix(in srgb, var(--el-fill-color-light) 56%, transparent 44%);
  border-radius: 10px;
}

:global(.header-connection-status-popover.el-popover.el-popper) {
  max-width: min(92vw, 344px);
  padding: 10px !important;
  background: color-mix(in srgb, var(--el-bg-color) 98%, transparent 2%) !important;
  border: 1px solid color-mix(in srgb, var(--app-content-border-color) 76%, transparent 24%) !important;
  box-shadow:
    0 10px 28px rgb(15 23 42 / 12%),
    0 1px 0 rgb(255 255 255 / 4%) inset !important;
  backdrop-filter: blur(10px);
}

:global(.header-connection-status__panel .el-button--small) {
  min-height: 24px;
  padding: 5px 8px;
  font-size: 11px;
}

:global(.header-connection-status-popover .el-popper__arrow) {
  display: none !important;
}

:global(.header-connection-status-pop-enter-active),
:global(.header-connection-status-pop-leave-active) {
  transition:
    opacity 0.14s ease,
    transform 0.14s ease;
  transform-origin: top right;
}

:global(.header-connection-status-pop-enter-from),
:global(.header-connection-status-pop-leave-to) {
  opacity: 0;
  transform: translateY(-6px) scale(0.98);
}

@keyframes header-connection-status-breathe {
  0%,
  100% {
    opacity: 0.82;
    transform: scale(1);
  }

  50% {
    opacity: 1;
    transform: scale(1.08);
  }
}

@media (width <= 768px) {
  .header-connection-status__status-line {
    align-items: stretch;
    flex-direction: column;
    gap: 6px;
  }
}
</style>
