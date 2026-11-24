<template>
  <div class="connection-info">
    <div class="section">
      <div class="section-title">基本信息</div>
      <InfoRow label="显示名称" :value="client.displayName || client.alias" />
      <InfoRow label="自定义名称" :value="client.alias || '未设置'" />
      <InfoRow label="连接 ID" :value="client.id" />
      <InfoRow label="状态" :value="client.isOnline ? '在线' : '离线'" />
      <InfoRow label="IP" :value="client.ip" />
    </div>

    <div class="section">
      <div class="section-title">应用</div>
      <InfoRow label="名称" :value="client.clientInfo?.app?.name" />
      <InfoRow label="版本" :value="client.clientInfo?.app?.version" />
      <InfoRow label="工作目录" :value="client.clientInfo?.workspaceDirectory" />
    </div>

    <div class="section">
      <div class="section-title">设备</div>
      <InfoRow label="设备码" :value="client.clientInfo?.machine?.code" />
      <InfoRow label="平台" :value="client.clientInfo?.machine?.platform" />
      <InfoRow label="系统" :value="client.clientInfo?.os?.name" />
      <InfoRow
        label="屏幕"
        :value="
          client.clientInfo?.screen
            ? `${client.clientInfo.screen.width}×${client.clientInfo.screen.height}`
            : ''
        "
      />
    </div>

    <div class="section">
      <div class="section-title">位置</div>
      <InfoRow label="城市" :value="client.clientInfo?.location?.city" />
      <InfoRow label="时区" :value="client.clientInfo?.location?.timeZone" />
    </div>
  </div>
</template>

<script lang="ts" setup>
import type { WebsocketConnectionVO } from "@/api/system/websocket";
import { h } from "vue";

defineProps<{ client: WebsocketConnectionVO }>();

function InfoRow(props: { label: string; value?: string | number | null }) {
  const v =
    props.value !== undefined && props.value !== null && props.value !== ""
      ? String(props.value)
      : "—";
  return h("div", { class: "info-row" }, [
    h("span", { class: "info-label" }, props.label),
    h("span", { class: "info-value" }, v),
  ]);
}
</script>

<style scoped lang="scss">
.connection-info {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.section {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.section-title {
  padding-bottom: 4px;
  margin-bottom: 2px;
  font-size: 12px;
  font-weight: 600;
  color: var(--el-text-color-secondary);
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.info-row {
  display: flex;
  padding: 2px 0;
  font-size: 12px;
}

.info-label {
  width: 70px;
  color: var(--el-text-color-placeholder);
  flex-shrink: 0;
}

.info-value {
  color: var(--el-text-color-regular);
  word-break: break-all;
}
</style>
