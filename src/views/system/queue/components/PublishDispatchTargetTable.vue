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
  const classes: string[] = [];
  if (!row?.selectable) classes.push("is-disabled");
  if (row?.optionKey && row.optionKey === props.modelValue) classes.push("is-selected");
  return classes.join(" ");
}

function handleRowClick(row: DispatchOptionRow) {
  if (row?.selectable && row.optionKey) {
    emit("update:modelValue", row.optionKey);
  }
}
</script>

<template>
  <div v-loading="loading" class="dispatch-target-table">
    <el-table
      :data="rows"
      size="small"
      row-key="optionKey"
      :row-class-name="rowClassName"
      :empty-text="emptyText"
      @row-click="handleRowClick"
    >
      <el-table-column :label="t('queue.select')" width="52" align="center">
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
      <el-table-column :label="t('queue.clientNode')" min-width="160">
        <template #default="{ row }">
          <div class="dispatch-target-table__primary" :title="row.clientLabel">
            {{ row.clientLabel }}
          </div>
        </template>
      </el-table-column>
      <el-table-column :label="t('queue.browserEnvironment')" min-width="260">
        <template #default="{ row }">
          <div class="dispatch-target-table__primary" :title="row.profileLabel">
            {{ row.profileLabel }}
          </div>
          <div class="dispatch-target-table__secondary">
            <span :class="statusClass(row.profileTag.type)">{{ row.profileTag.text }}</span>
            <span v-if="row.description" class="dispatch-target-table__desc" :title="row.description">
              · {{ row.description }}
            </span>
          </div>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>
