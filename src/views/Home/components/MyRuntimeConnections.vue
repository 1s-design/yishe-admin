<template>
  <section class="home-section my-runtime-connections">
    <div class="home-section__head">
      <div>
        <div class="home-section__title">{{ t('home.myConnections.title') }}</div>
        <div class="home-section__desc">
          {{ t('home.myConnections.desc') }}
          <template v-if="isAdmin"> {{ t('home.myConnections.adminTip') }} </template>
        </div>
      </div>

      <div class="my-runtime-connections__toolbar">
        <div class="my-runtime-connections__summary">
          <el-tag size="small" effect="plain" type="success">{{ t('home.myConnections.extension') }} {{ extensionCount }}</el-tag>
          <el-tag size="small" effect="plain" type="primary">{{ t('home.myConnections.admin') }} {{ adminCount }}</el-tag>
          <el-tag size="small" effect="plain" type="warning">{{ t('home.myConnections.client') }} {{ clientCount }}</el-tag>
        </div>

        <div class="my-runtime-connections__actions">
          <el-button v-if="isAdmin" text @click="router.push('/system/websocket')"
            >{{ t('home.myConnections.viewAll') }}</el-button
          >
          <el-button size="small" @click="refreshConnections" :loading="loading">{{ t('home.myConnections.refresh') }}</el-button>
        </div>
      </div>
    </div>

    <div v-if="connections.length" class="my-runtime-connections__grid">
      <article v-for="item in connections" :key="item.id" class="home-panel my-runtime-card">
        <div class="my-runtime-card__head">
          <div class="my-runtime-card__tags">
            <el-tag size="small" :type="getRuntimeConnectionSourceTagType(item)">
              {{ formatRuntimeConnectionSourceLabel(item) }}
            </el-tag>
            <el-tag
              v-if="isCurrentAdminConnection(item)"
              size="small"
              effect="plain"
              type="primary"
            >
              {{ t('home.myConnections.currentAdmin') }}
            </el-tag>
          </div>
          <span class="my-runtime-card__status">{{ resolveStatusText(item) }}</span>
        </div>

        <div class="my-runtime-card__title">{{ resolveConnectionTitle(item) }}</div>
        <div class="my-runtime-card__desc">{{ resolveConnectionDesc(item) }}</div>

        <div class="my-runtime-card__chips">
          <span v-for="chip in buildMetaChips(item)" :key="chip" class="my-runtime-card__chip">
            {{ chip }}
          </span>
        </div>

        <div class="my-runtime-card__footer">
          <span class="my-runtime-card__id" :title="item.id">{{ item.id }}</span>
          <span class="my-runtime-card__time">{{
            formatConnectedAt(item.connectedAt || item.lastOnlineAt)
          }}</span>
        </div>
      </article>
    </div>

    <div v-else class="home-panel my-runtime-empty">
      <el-empty
        :description="loading ? t('home.myConnections.loading') : t('home.myConnections.noConnection')"
        :image-size="84"
      />
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { formatDate, formatPast } from "@/utils/formatTime";
import { type WebsocketConnectionVO } from "@/api/system/websocket";
import { useMessage } from "@/hooks/web/useMessage";
import { useUserStore } from "@/store/modules/user";
import { useMyRuntimeConnectionStoreRefs } from "@/store/modules/myRuntimeConnection";
import { websocketClient } from "@/services/websocketClient";
import {
  formatRuntimeConnectionSourceLabel,
  getRuntimeConnectionSourceTagType,
  resolveRuntimeConnectionSourceKey,
} from "@/utils/websocketConnection";

const { t } = useI18n()
const router = useRouter();
const message = useMessage();
const userStore = useUserStore();
const { store, connections, loading } = useMyRuntimeConnectionStoreRefs();

const isAdmin = computed(() => !!userStore.user?.isAdmin);
const currentAdminConnectionId = computed(() => websocketClient.state.connectionId);

const extensionCount = computed(
  () =>
    connections.value.filter((item) => resolveRuntimeConnectionSourceKey(item) === "extension")
      .length,
);
const adminCount = computed(
  () =>
    connections.value.filter((item) => resolveRuntimeConnectionSourceKey(item) === "admin").length,
);
const clientCount = computed(
  () =>
    connections.value.filter((item) => resolveRuntimeConnectionSourceKey(item) === "client").length,
);

const isCurrentAdminConnection = (item: WebsocketConnectionVO) =>
  resolveRuntimeConnectionSourceKey(item) === "admin" &&
  !!item.id &&
  item.id === currentAdminConnectionId.value;

const resolveConnectionTitle = (item: WebsocketConnectionVO) => {
  const info = item.clientInfo || {};
  return (
    info.page?.title ||
    info.extension?.name ||
    info.app?.name ||
    info.machine?.code ||
    info.clientId ||
    item.id
  );
};

const resolveConnectionDesc = (item: WebsocketConnectionVO) => {
  const info = item.clientInfo || {};
  const parts: string[] = [];

  if (info.page?.path) {
    parts.push(info.page.path);
  }

  if (info.app?.version) {
    parts.push(`${t('home.myConnections.app')} ${info.app.version}`);
  }

  if (info.extension?.version) {
    parts.push(`${t('home.myConnections.extension')} ${info.extension.version}`);
  }

  if (info.machine?.code && !parts.includes(info.machine.code)) {
    parts.push(`${t('home.myConnections.machine')} ${info.machine.code}`);
  }

  return parts.join(" · ") || t('home.myConnections.onlineConnection');
};

const buildMetaChips = (item: WebsocketConnectionVO) => {
  const info = item.clientInfo || {};
  const chips: string[] = [];

  if (info.page?.origin) {
    chips.push(info.page.origin);
  }

  const browserLabel = [info.browser?.name, info.browser?.version].filter(Boolean).join(" ");
  if (browserLabel) {
    chips.push(browserLabel);
  }

  const osLabel = [info.os?.name, info.os?.version].filter(Boolean).join(" ");
  if (osLabel) {
    chips.push(osLabel);
  }

  const locationLabel =
    [info.location?.city, info.location?.region, info.location?.country]
      .filter(Boolean)
      .join(" · ") ||
    info.location?.ip ||
    item.ip ||
    "";
  if (locationLabel) {
    chips.push(locationLabel);
  }

  return chips.slice(0, 4);
};

const resolveStatusText = (item: WebsocketConnectionVO) => {
  const statusTime = item.connectedAt || item.lastOnlineAt;
  if (!statusTime) {
    return item.isOnline === false ? t('home.myConnections.offline') : t('home.myConnections.online');
  }
  return item.isOnline === false ? t('home.myConnections.offline') : `${t('home.myConnections.connected')} ${formatPast(statusTime)}`;
};

const formatConnectedAt = (value?: string | null) => {
  if (!value) {
    return "-";
  }
  try {
    return formatDate(new Date(value));
  } catch {
    return value;
  }
};

const refreshConnections = async () => {
  try {
    // 手动刷新按钮：强制回源
    await store.refresh({ force: true });
  } catch (error: any) {
    message.error(error?.message || t('home.myConnections.refreshFail'));
  }
};
</script>

<style scoped lang="scss">
.home-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.home-section__head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
}

.home-section__title {
  font-size: 17px;
  font-weight: 700;
}

.home-section__desc {
  margin-top: 4px;
  font-size: 13px;
  line-height: 1.7;
  color: var(--el-text-color-secondary);
}

.home-panel {
  background: color-mix(in srgb, var(--el-bg-color) 96%, transparent 4%);
  border: 1px solid color-mix(in srgb, var(--el-border-color) 54%, transparent 46%);
  border-radius: 22px;
  box-shadow: 0 10px 28px rgb(15 23 42 / 4%);
}

.my-runtime-connections__toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 10px 12px;
}

.my-runtime-connections__summary,
.my-runtime-connections__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.my-runtime-connections__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.my-runtime-card,
.my-runtime-empty {
  min-width: 0;
}

.my-runtime-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 18px;
}

.my-runtime-card__head,
.my-runtime-card__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.my-runtime-card__tags,
.my-runtime-card__chips {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.my-runtime-card__status,
.my-runtime-card__time {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  white-space: nowrap;
}

.my-runtime-card__title {
  font-size: 15px;
  font-weight: 700;
  line-height: 1.4;
  word-break: break-word;
}

.my-runtime-card__desc {
  font-size: 13px;
  line-height: 1.7;
  color: var(--el-text-color-secondary);
  word-break: break-word;
}

.my-runtime-card__chip {
  display: inline-flex;
  max-width: 100%;
  min-height: 28px;
  padding: 0 10px;
  font-size: 12px;
  line-height: 1.3;
  color: var(--el-text-color-regular);
  word-break: break-word;
  background: color-mix(in srgb, var(--el-fill-color-light) 80%, transparent 20%);
  border-radius: 999px;
  align-items: center;
}

.my-runtime-card__id {
  max-width: 58%;
  overflow: hidden;
  font-family: Monaco, Menlo, monospace;
  font-size: 12px;
  color: var(--el-text-color-placeholder);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.my-runtime-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 196px;
}

@media (width <= 1180px) {
  .my-runtime-connections__grid {
    grid-template-columns: 1fr;
  }
}

@media (width <= 767px) {
  .home-panel {
    border-radius: 18px;
  }

  .my-runtime-connections__toolbar,
  .my-runtime-connections__actions {
    width: 100%;
    justify-content: flex-start;
  }

  .my-runtime-card {
    padding: 16px;
  }

  .my-runtime-card__head,
  .my-runtime-card__footer {
    flex-direction: column;
    align-items: flex-start;
  }

  .my-runtime-card__id {
    max-width: 100%;
  }
}
</style>
