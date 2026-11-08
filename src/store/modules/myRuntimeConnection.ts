import { ref, watch } from "vue";
import { defineStore, storeToRefs } from "pinia";
import {
  getMyOnlineRuntimeConnectionViews,
  type WebsocketConnectionVO,
} from "@/api/system/websocket";
import { useUserStore } from "@/store/modules/user";
import { websocketClient, type RuntimeConnectionChangedEvent } from "@/services/websocketClient";
import { compareRuntimeConnections } from "@/utils/websocketConnection";

const listenersBound = ref(false);
const reconnectWatchBound = ref(false);

const resolveConnectionViews = (response: unknown): WebsocketConnectionVO[] => {
  if (Array.isArray(response)) {
    return response;
  }
  if (response && typeof response === "object" && Array.isArray((response as any).data)) {
    return (response as any).data;
  }
  return [];
};

const normalizeId = (value: unknown) => String(value ?? "").trim();

const resolveConnectionUserId = (connection?: Partial<WebsocketConnectionVO> | null) =>
  normalizeId(
    connection?.userId ||
      connection?.tokenUser?.id ||
      connection?.clientInfo?.user?.id ||
      "",
  );

const belongsToCurrentUser = (connection?: Partial<WebsocketConnectionVO> | null) => {
  const currentUserId = normalizeId(useUserStore().getUser?.id);
  const connectionUserId = resolveConnectionUserId(connection);
  return Boolean(currentUserId && connectionUserId && currentUserId === connectionUserId);
};

const normalizeRuntimeConnections = (list: WebsocketConnectionVO[]) => {
  const deduped = new Map<string, WebsocketConnectionVO>();

  list.forEach((item) => {
    if (!item?.id || !belongsToCurrentUser(item)) {
      return;
    }

    deduped.set(item.id, {
      ...item,
      isOnline: item.isOnline !== false,
      nodeStatus: item.nodeStatus || "online",
    });
  });

  return Array.from(deduped.values()).sort(compareRuntimeConnections);
};

export const useMyRuntimeConnectionStore = defineStore("my-runtime-connection", () => {
  const connections = ref<WebsocketConnectionVO[]>([]);
  const loading = ref(false);
  const initialized = ref(false);

  const replaceConnection = (
    connectionId: string,
    updater: (previous?: WebsocketConnectionVO) => WebsocketConnectionVO | null,
  ) => {
    const index = connections.value.findIndex((item) => item.id === connectionId);
    const next = [...connections.value];
    const previous = index >= 0 ? next[index] : undefined;
    const resolved = updater(previous);

    if (!resolved) {
      if (index >= 0) {
        next.splice(index, 1);
        connections.value = next.sort(compareRuntimeConnections);
      }
      return;
    }

    if (index >= 0) {
      next[index] = resolved;
    } else {
      next.unshift(resolved);
    }
    connections.value = next.sort(compareRuntimeConnections);
  };

  const refresh = async (options: { force?: boolean; polling?: boolean } = {}) => {
    loading.value = true;
    try {
      const response = await getMyOnlineRuntimeConnectionViews(options);
      connections.value = normalizeRuntimeConnections(resolveConnectionViews(response));
    } finally {
      loading.value = false;
    }
  };

  const handleRuntimeConnectionChanged = (event: RuntimeConnectionChangedEvent) => {
    const connectionId = event.connection?.id;
    if (!connectionId) {
      return;
    }
    if (!belongsToCurrentUser(event.connection)) {
      replaceConnection(connectionId, () => null);
      return;
    }

    if (event.action === "removed") {
      replaceConnection(connectionId, () => null);
      return;
    }

    replaceConnection(connectionId, (previous) => ({
      ...(previous || {}),
      ...event.connection,
      isOnline: event.connection.isOnline !== false,
      nodeStatus: event.connection.nodeStatus || "online",
    }));
  };

  const ensureInitialized = () => {
    if (initialized.value) return;
    initialized.value = true;
    if (!listenersBound.value) {
      listenersBound.value = true;
      websocketClient.events.on("runtimeConnectionChanged", handleRuntimeConnectionChanged);
    }
    if (!reconnectWatchBound.value) {
      reconnectWatchBound.value = true;
      watch(
        () => websocketClient.state.status,
        (status, previousStatus) => {
          if (status === "connected" && previousStatus && status !== previousStatus) {
            void refresh().catch(() => undefined);
          }
        },
      );
    }
    void refresh().catch(() => undefined);
  };

  return {
    connections,
    loading,
    initialized,
    refresh,
    ensureInitialized,
  };
});

export const useMyRuntimeConnectionStoreRefs = () => {
  const store = useMyRuntimeConnectionStore();
  store.ensureInitialized();
  return {
    store,
    ...storeToRefs(store),
  };
};
