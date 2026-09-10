<script setup lang="ts">
import { useI18n } from "@/hooks/web/useI18n";

type QueueTagType = "success" | "warning" | "info" | "primary" | "danger";

type DispatchStatusTag = {
  text: string;
  type: QueueTagType;
};

type DispatchOptionRow = {
  optionKey: string;
  clientId: string;
  clientLabel: string;
  onlineTag: DispatchStatusTag;
  serviceTag: DispatchStatusTag;
  profileId: string | null;
  profileLabel: string;
  profileTag: DispatchStatusTag;
  runtimeModeTag: DispatchStatusTag;
  acceptTag?: DispatchStatusTag;
  description: string;
  selectable: boolean;
};

const props = withDefaults(
  defineProps<{
    rows: DispatchOptionRow[];
    modelValue: string;
    loading?: boolean;
    emptyText: string;
  }>(),
  {
    loading: false,
  },
);

const emit = defineEmits<{
  (event: "update:modelValue", value: string): void;
}>();

const { t } = useI18n();

function statusClass(type?: QueueTagType) {
  if (type === "success") return "is-success";
  if (type === "warning") return "is-warning";
  if (type === "danger") return "is-danger";
  if (type === "info" || type === "primary") return "is-info";
  return "is-muted";
}

function rowClassName({ row }: { row: DispatchOptionRow }) {
  return row?.selectable ? "" : "is-disabled";
}

function handleRowClick(row: DispatchOptionRow) {
  if (row?.selectable && row.optionKey) {
    emit("update:modelValue", row.optionKey);
  }
}

function resolveAcceptTag(row: DispatchOptionRow): DispatchStatusTag {
  return (
    row.acceptTag ||
    (row.selectable
      ? { text: t("queue.acceptable"), type: "success" }
      : { text: t("queue.unavailable"), type: "warning" })
  );
}
</script>

<template>
  <div v-loading="loading" class="publish-dispatch-target-table publish-dispatch-dialog__table">
    <el-table
      :data="rows"
      border
      size="small"
      row-key="optionKey"
      :row-class-name="rowClassName"
      :empty-text="emptyText"
      @row-click="handleRowClick"
    >
      <el-table-column :label="t('queue.select')" width="56" align="center">
        <template #default="{ row }">
          <el-radio
            :value="row.optionKey"
            :model-value="modelValue"
            :disabled="!row.selectable"
            @update:model-value="emit('update:modelValue', $event)"
            @click.stop
          />
        </template>
      </el-table-column>
      <el-table-column :label="t('queue.clientNode')" min-width="150" show-overflow-tooltip>
        <template #default="{ row }">
          <div class="publish-dispatch-target-table__primary">{{ row.clientLabel }}</div>
        </template>
      </el-table-column>
      <el-table-column :label="t('queue.browserEnvironment')" min-width="220" show-overflow-tooltip>
        <template #default="{ row }">
          <div class="publish-dispatch-target-table__primary">{{ row.profileLabel }}</div>
          <div
            class="publish-dispatch-target-table__secondary"
            :class="statusClass(row.profileTag.type)"
          >
            {{ row.profileTag.text }}
          </div>
        </template>
      </el-table-column>
      <el-table-column :label="t('queue.online')" width="82" align="center">
        <template #default="{ row }">
          <span class="publish-dispatch-target-table__state" :class="statusClass(row.onlineTag.type)">
            {{ row.onlineTag.text }}
          </span>
        </template>
      </el-table-column>
      <el-table-column :label="t('queue.service')" width="88" align="center">
        <template #default="{ row }">
          <span class="publish-dispatch-target-table__state" :class="statusClass(row.serviceTag.type)">
            {{ row.serviceTag.text }}
          </span>
        </template>
      </el-table-column>
      <el-table-column :label="t('queue.mode')" width="82" align="center">
        <template #default="{ row }">
          <span class="publish-dispatch-target-table__state" :class="statusClass(row.runtimeModeTag.type)">
            {{ row.runtimeModeTag.text }}
          </span>
        </template>
      </el-table-column>
      <el-table-column :label="t('queue.acceptOrder')" width="88" align="center">
        <template #default="{ row }">
          <span class="publish-dispatch-target-table__state" :class="statusClass(resolveAcceptTag(row).type)">
            {{ resolveAcceptTag(row).text }}
          </span>
        </template>
      </el-table-column>
      <el-table-column prop="description" :label="t('queue.description')" min-width="220" show-overflow-tooltip />
    </el-table>
  </div>
</template>

<style scoped lang="less">
.publish-dispatch-target-table {
  width: 100%;
}

.publish-dispatch-target-table :deep(.el-table) {
  --el-table-row-hover-bg-color: transparent;
  --el-table-current-row-bg-color: transparent;
  width: 100%;
  font-size: 12px;
}

.publish-dispatch-target-table :deep(.el-table td),
.publish-dispatch-target-table :deep(.el-table th) {
  padding-top: 7px;
  padding-bottom: 7px;
}

.publish-dispatch-target-table :deep(.el-table .cell) {
  padding-right: 8px;
  padding-left: 8px;
  line-height: 1.35;
}

.publish-dispatch-target-table :deep(.el-table__row) {
  cursor: pointer;
}

.publish-dispatch-target-table :deep(.el-table__row.is-disabled) {
  cursor: not-allowed;
  opacity: 0.55;
}

.publish-dispatch-target-table__primary {
  overflow: hidden;
  color: var(--el-text-color-primary);
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.publish-dispatch-target-table__secondary {
  margin-top: 3px;
  font-size: 12px;
}

.publish-dispatch-target-table__state {
  font-size: 12px;
  white-space: nowrap;
}

.is-success {
  color: var(--el-color-success);
}

.is-warning {
  color: var(--el-color-warning);
}

.is-danger {
  color: var(--el-color-danger);
}

.is-info,
.is-muted {
  color: var(--el-text-color-secondary);
}
</style>
