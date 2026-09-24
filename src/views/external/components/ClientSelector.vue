<template>
  <div class="client-selector">
    <el-select
      v-model="selectedClientId"
      placeholder="选择客户端节点"
      size="small"
      class="client-select"
      @change="handleChange"
    >
      <el-option
        v-for="item in clients"
        :key="item.clientId"
        :label="item.machine?.code || item.clientId"
        :value="item.clientId"
      >
        <span class="option-label">{{ item.machine?.code || item.clientId }}</span>
        <span class="option-dot" :class="item.isOnline ? 'is-online' : 'is-offline'" />
      </el-option>
    </el-select>
    <span v-if="selectedClient" class="status-badge" :class="isAvailable ? 'is-online' : 'is-offline'">
      <span class="status-dot" />
      {{ isAvailable ? '服务就绪' : '服务离线' }}
    </span>
    <div class="selector-spacer" />
    <el-button size="small" :icon="Refresh" circle @click="handleRefresh" title="刷新节点" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Refresh } from '@element-plus/icons-vue'
import { useClientNodeState } from '@/services/clientNodeState'
import type { ImageEngineClientVO, ImageEngineServiceStatus } from '@/api/external/imageEngineApi'

defineProps<{ pluginKey?: string }>()

const emit = defineEmits<{
  (e: 'change', clientId: string): void
  (e: 'refresh'): void
}>()

const {
  onlineClients,
  refresh: refreshClientNodes,
} = useClientNodeState()

const selectedClientId = defineModel<string>({ default: '' })

const clients = computed<ImageEngineClientVO[]>(() => {
  return onlineClients.value.map((client) => {
    return {
      clientId: client.id,
      isOnline: client.isOnline,
      nodeStatus: client.nodeStatus,
      connectedAt: client.connectedAt,
      lastOnlineAt: client.lastOnlineAt,
      appVersion: client.clientInfo?.appVersion || null,
      workspaceDirectory: client.clientInfo?.workspaceDirectory || null,
      machine: client.clientInfo?.machine || null,
      location: client.clientInfo?.location || null,
      service: null as ImageEngineServiceStatus | null,
    }
  })
})

const selectedClient = computed<ImageEngineClientVO | null>(() => {
  if (!selectedClientId.value) return null
  return clients.value.find((c) => c.clientId === selectedClientId.value) || null
})

const isOnline = computed(() => !!selectedClient.value?.isOnline)
const isAvailable = computed(() => isOnline.value)

function handleChange(val: string) {
  selectedClientId.value = val
  emit('change', val)
}

async function handleRefresh() {
  await refreshClientNodes()
  emit('refresh')
}

defineExpose({
  clients,
  refresh: refreshClientNodes,
})
</script>

<style scoped>
.client-selector {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 0;
}

.client-select {
  width: 200px;
}

.selector-spacer {
  flex: 1;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.status-badge.is-online {
  background: var(--el-color-success-light-9);
  color: var(--el-color-success);
}

.status-badge.is-offline {
  background: var(--el-color-info-light-9);
  color: var(--el-color-info);
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}

.option-label {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.option-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.option-dot.is-online {
  background: var(--el-color-success);
}

.option-dot.is-offline {
  background: var(--el-color-info);
}

</style>
