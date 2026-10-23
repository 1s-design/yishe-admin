<template>
  <section class="create-task-stage">
    <div class="create-task-stage__header">
      <div class="create-task-stage__index">2</div>
      <div class="create-task-stage__title-wrap">
        <div class="create-task-stage__title">配置处理步骤（支持单功能或链式组合）</div>
        <div class="create-task-stage__desc">可选择单个独立功能处理，也可顺序添加多个功能进行链式处理。</div>
      </div>
    </div>

    <div class="create-task-block">
      <div class="create-task-toolbar">
        <div class="create-task-pills">
          <div class="create-task-pill">当前处理链 {{ currentOperations.length }} 步</div>
          <div class="create-task-pill">{{ currentOperationsParseError ? "需要修正 JSON" : "提交前会按当前顺序执行" }}</div>
        </div>
        <div class="create-task-toolbar__actions">
          <el-button size="small" :disabled="!currentOperations.length && !currentOperationsParseError" @click="$emit('clear-chain')">清空链路</el-button>
          <el-button size="small" type="primary" @click="openCatalogDialog">添加步骤</el-button>
          <el-button size="small" @click="$emit('format-json')">格式化 JSON</el-button>
        </div>
      </div>

      <el-alert v-if="currentOperationsParseError" type="warning" :closable="false" :title="currentOperationsParseError" />

      <div v-else-if="currentOperations.length" class="create-task-chain-list">
        <div v-for="(operation, index) in currentOperations" :key="operation.key" class="create-task-card">
          <div class="create-task-card__header">
            <div class="create-task-card__main">
              <span class="create-task-card__step">步骤 {{ index + 1 }}</span>
              <div class="create-task-card__title-wrap">
                <div class="create-task-card__title">{{ operation.title }}</div>
                <div class="create-task-card__desc">{{ operation.typeLabel }}</div>
              </div>
            </div>
            <div class="create-task-toolbar__actions">
              <el-button link size="small" :disabled="index === 0" @click="$emit('move-operation', index, -1)">上移</el-button>
              <el-button link size="small" :disabled="index === currentOperations.length - 1" @click="$emit('move-operation', index, 1)">下移</el-button>
              <el-button link size="small" @click="$emit('remove-operation', index)">删除</el-button>
            </div>
          </div>

          <div v-if="operation.description" class="create-task-card__desc">{{ operation.description }}</div>

          <div class="create-task-tags">
            <el-tag size="small" effect="plain">{{ operation.categoryLabel }}</el-tag>
            <el-tag size="small" effect="plain">{{ operation.typeLabel }}</el-tag>
            <el-tag v-if="operation.requiredParams.length" size="small" effect="plain" type="warning">
              必填：{{ operation.requiredParams.join(" / ") }}
            </el-tag>
          </div>

          <div v-if="operation.paramEntries.length" class="create-task-param-grid">
            <div v-for="param in operation.paramEntries" :key="`${operation.key}-${param.name}`" class="create-task-param-card">
              <div class="create-task-param-card__label">{{ param.name }}</div>
              <div class="create-task-param-card__input-wrap">
                <!-- 枚举下拉 -->
                <template v-if="param.options && param.options.length">
                  <el-select
                    size="small"
                    class="w-full"
                    :model-value="param.rawVal"
                    @change="$emit('update-param', index, param.name, $event)"
                  >
                    <el-option
                      v-for="option in param.options"
                      :key="`${operation.key}-${param.name}-${option}`"
                      :label="String(option)"
                      :value="option"
                    />
                  </el-select>
                </template>

                <!-- 颜色选择器 -->
                <template v-else-if="param.isColor">
                  <div class="flex items-center gap-2 w-full">
                    <el-color-picker
                      size="small"
                      :model-value="param.rawVal || '#000000'"
                      @change="$emit('update-param', index, param.name, $event)"
                    />
                    <el-input
                      size="small"
                      :model-value="param.rawVal"
                      placeholder="#000000"
                      @input="$emit('update-param', index, param.name, $event)"
                    />
                  </div>
                </template>

                <!-- 布尔开关 -->
                <template v-else-if="typeof param.rawVal === 'boolean' || param.type === 'boolean'">
                  <el-switch
                    size="small"
                    :model-value="Boolean(param.rawVal)"
                    @change="$emit('update-param', index, param.name, $event)"
                  />
                </template>

                <!-- 数字输入框 -->
                <template v-else-if="typeof param.rawVal === 'number' || param.type === 'number'">
                  <el-input-number
                    size="small"
                    controls-position="right"
                    class="w-full"
                    :model-value="Number(param.rawVal)"
                    @change="$emit('update-param', index, param.name, $event)"
                  />
                </template>

                <!-- 文本输入框 -->
                <template v-else>
                  <el-input
                    size="small"
                    class="w-full"
                    :model-value="param.rawVal !== undefined && param.rawVal !== null ? String(param.rawVal) : ''"
                    placeholder="请输入参数"
                    @input="$emit('update-param', index, param.name, $event)"
                  />
                </template>
              </div>
            </div>
          </div>
          <div v-else class="create-task-card__desc">这个操作无需额外参数</div>
        </div>
      </div>

      <div v-else class="create-task-empty">
        <div class="create-task-empty__title">还没有处理步骤</div>
        <div class="create-task-empty__desc">点击“添加步骤”后，从弹窗中选择要加入的操作。</div>
      </div>
    </div>

    <el-dialog
      v-model="catalogDialogVisible"
      title="添加处理步骤"
      width="720px"
      append-to-body
      class="create-task-catalog-dialog"
    >
      <div class="create-task-dialog-body">
      <div class="create-task-filter">
        <el-input :model-value="operationKeyword" clearable size="small" placeholder="搜索操作名称、描述、参数" @update:model-value="$emit('update:operation-keyword', $event)" />
        <el-radio-group :model-value="operationCategoryFilter" size="small" @update:model-value="$emit('update:operation-category-filter', $event)">
          <el-radio-button v-for="option in operationCategoryOptions" :key="option.value" :label="option.value">
            {{ option.label }} ({{ option.count }})
          </el-radio-button>
        </el-radio-group>
      </div>

      <div class="create-task-toolbar create-task-toolbar--plain">
        <span>匹配到 {{ filteredOperationCount }} 个操作</span>
        <span>当前处理链 {{ currentOperations.length }} 步</span>
      </div>

      <div v-if="operationSelectOptions.length" class="create-task-select-row create-task-select-row--single">
        <el-select
          :model-value="selectedOperationKey"
          clearable
          filterable
          size="default"
          class="create-task-select"
          placeholder="请选择要加入的处理操作"
          @update:model-value="handleSelectedOperationChange"
        >
          <el-option
            v-for="option in operationSelectOptions"
            :key="option.value"
            :label="option.label"
            :value="option.value"
          >
            <div class="create-task-select-option">
              <span class="create-task-select-option__title">{{ option.label }}</span>
              <span class="create-task-select-option__meta">{{ option.meta }}</span>
            </div>
          </el-option>
        </el-select>
      </div>

      <div v-if="selectedOperation" class="create-task-card create-task-card--op-detail">
        <div class="create-task-card__header">
          <div class="create-task-card__title-wrap">
            <div class="create-task-card__title">
              {{ selectedOperation.description || selectedOperation.type || selectedOperation.apiType }}
            </div>
            <div class="create-task-card__desc">{{ selectedOperation.apiType || selectedOperation.type }}</div>
          </div>
          <div class="create-task-toolbar__actions">
            <el-tag size="small" effect="plain">{{ selectedOperationCategoryLabel }}</el-tag>
            <el-tag
              v-if="getRequiredParamNames(selectedOperation).length"
              size="small"
              effect="plain"
              type="warning"
            >
              必填 {{ getRequiredParamNames(selectedOperation).length }}
            </el-tag>
            <el-tag
              v-if="getOperationUsageCount(selectedOperation)"
              size="small"
              effect="plain"
              type="success"
            >
              已添加 {{ getOperationUsageCount(selectedOperation) }} 次
            </el-tag>
          </div>
        </div>

        <div class="create-task-card__desc">{{ getOperationParamSummary(selectedOperation) }}</div>
        <div class="create-task-card__desc">
          必填参数：{{ getRequiredParamNames(selectedOperation).join(" / ") || "-" }}
        </div>
      </div>

      <div v-if="!filteredGroupedOperations.length" class="create-task-empty create-task-empty--simple">没有匹配的操作，请换个关键词或分类试试</div>
      </div>

      <template #footer>
        <div class="create-task-dialog-footer">
          <el-button @click="catalogDialogVisible = false">取消</el-button>
          <el-button type="primary" :disabled="!selectedOperation" @click="handleAppendSelectedOperation">
            加入处理链
          </el-button>
        </div>
      </template>
    </el-dialog>

    <div class="create-task-block create-task-block--optional">
      <div class="create-task-intro">
        <div class="create-task-intro__title">高级 JSON（可选）</div>
        <div class="create-task-intro__desc">适合批量调整参数或直接粘贴处理链。JSON 顶层必须是数组。</div>
      </div>

      <div class="create-task-json-editor">
        <el-input
          :model-value="form.operationsJson"
          type="textarea"
          resize="none"
          placeholder='[{"type":"resize","params":{"width":800,"height":800}}]'
          @update:model-value="$emit('update:operations-json', $event)"
        />
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";

defineOptions({ name: "CreateTaskProcessStage" });

const props = defineProps<{
  form: Record<string, any>;
  currentOperations: any[];
  currentOperationsParseError: string;
  operationKeyword: string;
  operationCategoryFilter: string;
  operationCategoryOptions: any[];
  filteredOperationCount: number;
  filteredGroupedOperations: any[];
  activeCatalogOperationKey: string;
  getOperationIdentity: (operation: any) => string;
  getRequiredParamNames: (operation: any) => string[];
  getOperationUsageCount: (operation: any) => number;
  getOperationParamSummary: (operation: any) => string;
}>();

const emit = defineEmits([
  "clear-chain",
  "move-operation",
  "remove-operation",
  "select-operation",
  "append-operation",
  "update-param",
  "format-json",
  "update:operation-keyword",
  "update:operation-category-filter",
  "update:operations-json",
]);
const catalogDialogVisible = ref(false);

const operationSelectOptions = computed(() => {
  return props.filteredGroupedOperations.flatMap((group) =>
    group.items.map((operation: any) => ({
      value: props.getOperationIdentity(operation),
      label: operation.description || operation.type || operation.apiType || "未命名操作",
      meta: `${group.label} · ${operation.apiType || operation.type || "-"}`,
      operation,
      categoryLabel: group.label,
    })),
  );
});

const selectedOperation = computed(() => {
  return (
    operationSelectOptions.value.find((item) => item.value === props.activeCatalogOperationKey)?.operation ||
    operationSelectOptions.value[0]?.operation ||
    null
  );
});

const selectedOperationKey = computed(() => {
  return selectedOperation.value ? props.getOperationIdentity(selectedOperation.value) : "";
});

const selectedOperationCategoryLabel = computed(() => {
  return (
    operationSelectOptions.value.find((item) => item.value === selectedOperationKey.value)?.categoryLabel ||
    "其他操作"
  );
});

function handleSelectedOperationChange(value: string) {
  const option = operationSelectOptions.value.find((item) => item.value === value);
  if (option?.operation) {
    emit("select-operation", option.operation);
  }
}

function openCatalogDialog() {
  catalogDialogVisible.value = true;
}

function handleAppendSelectedOperation() {
  if (!selectedOperation.value) {
    return;
  }
  emit("append-operation", selectedOperation.value);
  catalogDialogVisible.value = false;
}

function appendQuickPreset(presetType: string) {
  const presets: Record<string, any> = {
    resize: { type: "resize", description: "调整尺寸", params: { width: 1080, height: 1080, maintainAspectRatio: true } },
    watermark: { type: "watermark", description: "文字水印", params: { type: "text", text: "衣设 Yishe", position: "bottom-right", fontSize: 24, color: "#FFFFFF" } },
    sharpen: { type: "sharpen", description: "图像锐化", params: { radius: 1, amount: 1 } },
    sepia: { type: "sepia", description: "复古怀旧", params: { intensity: 80 } },
    lowpoly: { type: "lowpoly", description: "低多边形", params: { pointCount: 900, edgeBias: 0.65 } },
    png: { type: "convert", description: "格式转换", params: { format: "png", quality: 90 } },
  };

  const preset = presets[presetType];
  if (preset) {
    emit("append-operation", preset);
  }
}
</script>

<style scoped lang="scss">
.create-task-quick-presets {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  padding: 10px 0;
  border-bottom: 1px dashed var(--el-border-color-lighter);
}

.create-task-quick-presets__label {
  font-size: 12px;
  font-weight: 500;
  color: var(--el-text-color-regular);
}

.create-task-quick-presets__items {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.create-task-quick-tag {
  padding: 4px 10px;
  font-size: 12px;
  cursor: pointer;
  border-radius: 6px;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  user-select: none;

  &:hover {
    color: var(--el-color-primary);
    background-color: var(--el-color-primary-light-9);
    border-color: var(--el-color-primary);
    transform: translateY(-1px);
  }
}

.create-task-stage,
.create-task-block,
.create-task-intro,
.create-task-chain-list,
.create-task-filter,
.create-task-json-editor {
  display: flex;
  flex-direction: column;
}

.create-task-stage {
  gap: 20px;
}

.create-task-stage__header,
.create-task-toolbar,
.create-task-card__header {
  display: flex;
  gap: 10px;
}

.create-task-stage__header {
  align-items: center;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--el-border-color-extra-light);
}

.create-task-stage__index {
  display: flex;
  width: 24px;
  height: 24px;
  font-size: 12px;
  font-weight: 700;
  color: var(--el-color-primary);
  background: var(--el-color-primary-light-9);
  border-radius: 50%;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.create-task-stage__title-wrap {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.create-task-stage__title,
.create-task-intro__title,
.create-task-card__title,
.create-task-empty__title {
  font-size: 15px;
  font-weight: 600;
  line-height: 1.3;
  color: var(--el-text-color-primary);
}

.create-task-stage__desc,
.create-task-intro__desc,
.create-task-card__desc,
.create-task-empty__desc,
.create-task-toolbar--plain,
.create-task-param-card__label,
.create-task-param-card__value {
  font-size: 12px;
  line-height: 1.4;
  color: var(--el-text-color-placeholder);
}

.create-task-block {
  padding: 0;
  background: transparent;
  border: none;
  box-shadow: none;
  gap: 16px;
}

.create-task-block--optional {
  padding-top: 16px;
  margin-top: 10px;
  border-top: 1px dashed var(--el-border-color-lighter);
}

.create-task-intro {
  gap: 4px;
  padding: 0;
}

.create-task-toolbar {
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
}

.create-task-toolbar--plain {
  justify-content: space-between;
}

.create-task-toolbar__actions,
.create-task-pills,
.create-task-tags {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.create-task-select-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 12px;
  align-items: center;
}

.create-task-select {
  width: 100%;
}

.create-task-select-row--single {
  grid-template-columns: 1fr;
}

.create-task-dialog-body {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.create-task-dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.create-task-select-option {
  display: flex;
  height: 100%;
  min-width: 0;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.create-task-select-option__title,
.create-task-select-option__meta {
  display: inline-flex;
  align-items: center;
  font-size: 13px;
  line-height: 1;
}

.create-task-select-option__title {
  font-weight: 500;
  color: var(--el-text-color-primary);
}

.create-task-select-option__meta {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  flex-shrink: 0;
}

.create-task-pill,
.create-task-card__step {
  padding: 3px 8px;
  font-size: 12px;
  color: var(--el-text-color-regular);
  background: var(--el-fill-color-light);
  border-radius: 6px;
}

.create-task-chain-list {
  gap: 10px;
}

.create-task-card {
  display: flex;
  padding: 12px 14px;
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-extra-light);
  border-radius: 8px;
  transition: all 0.2s ease;
  flex-direction: column;
  gap: 8px;

  &:hover {
    border-color: var(--el-border-color-light);
  }
}

.create-task-card__header {
  align-items: center;
  justify-content: space-between;
}

.create-task-card__main,
.create-task-card__title-wrap {
  display: flex;
  align-items: center;
  min-width: 0;
}

.create-task-card__main {
  flex: 1;
  gap: 12px;
}

.create-task-card__title-wrap {
  flex: 1;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
}

.create-task-param-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 8px;
}

.create-task-param-card {
  padding: 6px 10px;
  background: var(--el-fill-color-extra-light);
  border-radius: 6px;
}

.create-task-empty {
  display: flex;
  padding: 24px 16px;
  text-align: center;
  background: var(--el-fill-color-blank);
  border: 1px dashed var(--el-border-color-light);
  border-radius: 8px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.create-task-empty--simple {
  padding: 16px;
  border-style: solid;
}

.create-task-filter {
  gap: 10px;
}

.create-task-json-editor :deep(.el-textarea__inner) {
  min-height: 180px !important;
  line-height: 1.6;
  border-radius: 6px;
}

@media (width <= 768px) {
  .create-task-block,
  .create-task-card {
    padding: 0;
  }

  .create-task-select-row {
    grid-template-columns: 1fr;
  }

  .create-task-toolbar,
  .create-task-card__header {
    flex-direction: column;
    align-items: flex-start;
  }

  .create-task-dialog-footer {
    flex-direction: column;
  }

  .create-task-dialog-footer .el-button {
    width: 100%;
  }

  .create-task-toolbar__actions {
    justify-content: flex-start;
  }
}
</style>
