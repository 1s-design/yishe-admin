<template>
  <Dialog
    v-model="dialogVisible"
    title="AI 使用设置"
    :initial-fullscreen="true"
    :fullscreen="true"
    scroll
    class="ai-usage-dialog"
  >
    <div class="ai-usage">
      <div class="ai-usage__header">
        <div class="ai-usage__header-left">
          <h2 class="ai-usage__title">功能场景绑定</h2>
          <p class="ai-usage__desc">按功能选择实际调用的 AI Key，调用规范由系统按功能固定。</p>
        </div>
        <div class="ai-usage__header-right">
          <span class="ai-usage__stat">已配置 {{ configuredCount }}/{{ form.items.length }}</span>
          <span class="ai-usage__stat">可用 Key {{ availableKeyCount }}</span>
          <el-button size="small" text :disabled="loading" @click="loadConfig">刷新</el-button>
        </div>
      </div>

      <div v-if="!loading && !availableKeyCount" class="ai-usage__empty">
        当前还没有可用 Key。请先新增自己的 Key，或联系管理员开放公开 Key 和共享 AI 使用权限。
      </div>

      <div v-loading="loading" class="ai-usage__body" style="overflow-y: auto; padding-right: 8px; margin-right: -8px;">
        <div v-for="group in featureGroups" :key="group.group" class="ai-usage__group">
          <div class="ai-usage__group-head">
            <span class="ai-usage__group-name">{{ group.group }}</span>
            <span class="ai-usage__group-count">{{ group.configuredCount }}/{{ group.items.length }}</span>
          </div>
          <div class="ai-usage__rows" :class="{ 'ai-usage__rows--collapsed': !expandedGroups.has(group.group) }">
            <div v-for="row in getGroupItems(group)" :key="row.code" class="ai-usage__row">
              <div class="ai-usage__row-left">
                <span
                  class="ai-usage__tag"
                  :class="{
                    'ai-usage__tag--bound': !!row.keyId && resolveSelectedOption(row.keyId)?.available !== false,
                    'ai-usage__tag--invalid': resolveSelectedOption(row.keyId)?.available === false,
                    'ai-usage__tag--unbound': !row.keyId,
                  }"
                >
                  {{ getStatusText(row) }}
                </span>
                <span class="ai-usage__row-name">{{ row.label }}</span>
                <span class="ai-usage__row-code">{{ row.code }}</span>
                <span v-if="row.description" class="ai-usage__row-desc">{{ row.description }}</span>
              </div>
              <div class="ai-usage__row-right">
                <el-select
                  :model-value="row.keyId"
                  placeholder="选择 Key"
                  size="small"
                  clearable
                  filterable
                  class="ai-usage__row-select"
                  @update:model-value="(val: number | '') => handleKeyChange(row.code, val || null)"
                >
                  <el-option-group v-if="groupedOptions.mine.length" label="我的 Key">
                    <el-option
                      v-for="opt in groupedOptions.mine"
                      :key="opt.id"
                      :label="opt.name"
                      :value="opt.id"
                      :disabled="opt.available === false"
                    />
                  </el-option-group>
                  <el-option-group v-if="groupedOptions.public.length" label="公开 Key">
                    <el-option
                      v-for="opt in groupedOptions.public"
                      :key="opt.id"
                      :label="opt.name"
                      :value="opt.id"
                      :disabled="opt.available === false"
                    />
                  </el-option-group>
                </el-select>
                <el-button
                  size="small"
                  :disabled="!isRowDirty(row) || savingCodes.includes(row.code)"
                  :loading="savingCodes.includes(row.code)"
                  @click="saveRow(row)"
                >
                  保存
                </el-button>
              </div>
            </div>
            <button
              v-if="group.items.length > 20"
              class="ai-usage__toggle"
              @click="toggleGroup(group.group)"
            >
              {{ expandedGroups.has(group.group) ? '收起' : `展开全部 (${group.items.length})` }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="ai-usage__footer">
        <span class="ai-usage__footer-hint">
          <template v-if="lastSavedCode">{{ lastSavedLabel }} 已保存</template>
        </span>
        <el-button @click="dialogVisible = false">关闭</el-button>
      </div>
    </template>
  </Dialog>
</template>

<script lang="ts" setup>
import { computed, ref, watch } from "vue";
import { ElMessage } from "element-plus";
import {
  getAiApiKeyUsageOptions,
  getAiFeatureRegistry,
  getAiProviderSpecs,
} from "@/api/aiApiKey";
import type { AiFeatureRegistryItem } from "@/api/aiApiKey";
import { getAiSetting, updateAiSetting } from "@/api/user";
import { getDefaultAiProviderSpecForFeature } from "@/utils/aiProviderSpecs";
import Dialog from "@/components/Dialog/src/Dialog.vue";

interface AiKeyOption {
  id: number;
  name: string;
  model: string;
  baseUrl: string;
  available: boolean;
  source: string;
  default: boolean;
  specCode?: string;
}

interface SpecOption {
  code: string;
  label: string;
  category: string;
  defaultBaseUrl: string;
  defaultModel: string;
  capabilities: string[];
}

interface FeatureSettingFormItem extends AiFeatureRegistryItem {
  keyId: number | null;
  specCode: string;
  params: Record<string, any>;
}

const emit = defineEmits<{ saved: [] }>();

const loading = ref(false);
const saving = ref(false);
const savingCodes = ref<string[]>([]);
const dialogVisible = ref(false);
const expandedGroups = ref<Set<string>>(new Set());

const keyOptions = ref<AiKeyOption[]>([]);
const specOptions = ref<SpecOption[]>([]);
const form = ref<{ items: FeatureSettingFormItem[] }>({ items: [] });
const formSnapshot = ref<Map<string, number | null>>(new Map());

// 保存已有的完整绑定，避免保存时丢失其他功能的绑定
const savedFeatureBindings = ref<Record<string, Record<string, { keyId: number; specCode: string; model?: string; params?: Record<string, any> }>>>({});

const lastSavedCode = ref("");
const lastSavedLabel = ref("");

const featureGroups = computed(() => {
  const map = new Map<string, { group: string; items: FeatureSettingFormItem[]; configuredCount: number }>();
  for (const item of form.value.items) {
    const g = item.group || "其他";
    if (!map.has(g)) map.set(g, { group: g, items: [], configuredCount: 0 });
    const entry = map.get(g)!;
    entry.items.push(item);
    if (item.keyId) entry.configuredCount++;
  }
  return Array.from(map.values());
});

const configuredCount = computed(() => form.value.items.filter((i) => i.keyId).length);
const availableKeyCount = computed(() => keyOptions.value.filter((k) => k.available).length);

const groupedOptions = computed(() => ({
  mine: keyOptions.value.filter((k) => k.source === "mine"),
  public: keyOptions.value.filter((k) => k.source === "public"),
}));

function isRowDirty(row: FeatureSettingFormItem) {
  return row.keyId !== formSnapshot.value.get(row.code);
}

function getStatusText(row: FeatureSettingFormItem) {
  if (!row.keyId) return "未绑定";
  const opt = resolveSelectedOption(row.keyId);
  if (opt?.available === false) return "不可用";
  return "已绑定";
}

function resolveSelectedOption(keyId: number | null) {
  if (!keyId) return undefined;
  return keyOptions.value.find((k) => k.id === keyId);
}

function resolveSpecLabel(specCode?: string) {
  if (!specCode) return "";
  const spec = specOptions.value.find((s) => s.code === specCode);
  return spec?.label || specCode;
}

function resolveSpecModel(specCode?: string) {
  if (!specCode) return "";
  const spec = specOptions.value.find((s) => s.code === specCode);
  return spec?.defaultModel || "";
}

function resolveDefaultSpecCode(row: AiFeatureRegistryItem) {
  return (
    String(row.defaultSpecCode || "").trim() ||
    String(row.allowedSpecCodes?.[0] || "").trim() ||
    specOptions.value[0]?.code ||
    ""
  );
}

function handleKeyChange(code: string, keyId: number | null) {
  const item = form.value.items.find((i) => i.code === code);
  if (item) item.keyId = keyId;
}

function handleSpecChange(code: string, specCode: string) {
  const item = form.value.items.find((i) => i.code === code);
  if (item) item.specCode = specCode;
}

function toggleGroup(groupName: string) {
  if (expandedGroups.value.has(groupName)) {
    expandedGroups.value.delete(groupName);
  } else {
    expandedGroups.value.add(groupName);
  }
}

function getGroupItems(group: { group: string; items: FeatureSettingFormItem[] }) {
  if (expandedGroups.value.has(group.group)) {
    return group.items;
  }
  return group.items.slice(0, 20);
}

async function saveRow(row: FeatureSettingFormItem) {

  if (savingCodes.value.includes(row.code)) return;
  savingCodes.value.push(row.code);
  try {
    console.log('[AiUsageSettingPanel] saveRow 开始', {
      code: row.code,
      label: row.label,
      keyId: row.keyId,
      specCode: row.specCode,
    });

    // 深拷贝嵌套的 featureBindings（保留 model 和 params 字段）
    const featureBindings: Record<string, Record<string, { keyId: number; specCode: string; model?: string; params?: Record<string, any> }>> = {};
    for (const [fc, specs] of Object.entries(savedFeatureBindings.value)) {
      featureBindings[fc] = {};
      for (const [sc, binding] of Object.entries(specs)) {
        featureBindings[fc][sc] = { ...binding };
      }
    }

    console.log('[AiUsageSettingPanel] 深拷贝后的 featureBindings', JSON.stringify(featureBindings));

    // 只更新当前行涉及的 spec，不影响其他 spec
    const specCode = String(row.specCode || "").trim();
    if (row.code.includes("__") && specCode) {
      // 多 Provider 展开行：写入 featureBindings[baseCode][specCode]
      const baseCode = row.code.split("__")[0];
      if (!featureBindings[baseCode]) featureBindings[baseCode] = {};
      if (row.keyId) {
        featureBindings[baseCode][specCode] = { ...featureBindings[baseCode][specCode], keyId: row.keyId, specCode };
      } else {
        delete featureBindings[baseCode][specCode];
        if (Object.keys(featureBindings[baseCode]).length === 0) {
          delete featureBindings[baseCode];
        }
      }
    } else {
      // 单 Provider 行：写入/删除对应的 spec
      const defaultSpec = getDefaultAiProviderSpecForFeature(row.code);
      if (!featureBindings[row.code]) featureBindings[row.code] = {};
      if (row.keyId) {
        featureBindings[row.code][defaultSpec] = { ...featureBindings[row.code][defaultSpec], keyId: row.keyId, specCode: defaultSpec };
      } else {
        delete featureBindings[row.code][defaultSpec];
        if (Object.keys(featureBindings[row.code]).length === 0) {
          delete featureBindings[row.code];
        }
      }
    }

    console.log('[AiUsageSettingPanel] 准备保存', {
      featureBindings: JSON.stringify(featureBindings),
    });

    await updateAiSetting({ version: 2, featureBindings, updatedAt: new Date().toISOString() });

    console.log('[AiUsageSettingPanel] 保存成功');

    // 更新保存后的快照
    savedFeatureBindings.value = JSON.parse(JSON.stringify(featureBindings));
    formSnapshot.value.set(row.code, row.keyId);
    lastSavedCode.value = row.code;
    lastSavedLabel.value = row.label;
    ElMessage.success(`${row.label} 已保存`);
    emit("saved");
  } catch (error: any) {
    console.error('[AiUsageSettingPanel] 保存失败', {
      error: error?.message || error,
      response: error?.response?.data,
      status: error?.response?.status,
    });
    ElMessage.error("保存失败");
  } finally {
    savingCodes.value = savingCodes.value.filter((c) => c !== row.code);
  }
}

async function loadConfig() {
  loading.value = true;
  try {
    const [keys, specs, settings, features] = await Promise.all([
      getAiApiKeyUsageOptions(),
      getAiProviderSpecs(),
      getAiSetting(),
      getAiFeatureRegistry(),
    ]);
    // 后端 TransformInterceptor 包装了响应: { data: {...}, code, message, status }
    const unwrap = (resp: any) => resp?.data || resp || {};
    keyOptions.value = Array.isArray(unwrap(keys)) ? unwrap(keys) : [];
    specOptions.value = Array.isArray(unwrap(specs)) ? unwrap(specs) : [];
    const aiSetting = unwrap(settings);
    const bindings = aiSetting.featureBindings || {};
    // 保存完整已有绑定，供保存时使用（避免覆盖其他功能的绑定）
    savedFeatureBindings.value = JSON.parse(JSON.stringify(bindings));
    const featureList = Array.isArray(unwrap(features)) ? unwrap(features) : [];
    const expandedItems: FeatureSettingFormItem[] = [];
    for (const f of featureList) {
      const specs = (f.allowedSpecCodes || []).filter(Boolean);
      // 新结构：bindings[f.code] 是 { specCode: { keyId, specCode } }
      const featureSpecs = bindings[f.code] || {};
      if (specs.length > 1) {
        // 多 Provider 规范：每个规范展开为独立行
        for (const specCode of specs) {
          const subCode = `${f.code}__${specCode}`;
          // 从嵌套结构中获取该 spec 的绑定
          const specBinding = featureSpecs[specCode];
          const keyId = specBinding?.keyId ?? null;
          expandedItems.push({
            ...f,
            code: subCode,
            label: `${f.label} - ${resolveSpecLabel(specCode)}`,
            keyId,
            specCode,
            params: {},
          });
        }
      } else {
        const singleSpec = specs[0] || resolveDefaultSpecCode(f);
        const specBinding = featureSpecs[singleSpec];
        const keyId = specBinding?.keyId ?? null;
        expandedItems.push({
          ...f,
          keyId,
          specCode: singleSpec,
          params: {},
        });
      }
    }
    form.value = { items: expandedItems };
    formSnapshot.value = new Map(form.value.items.map((i) => [i.code, i.keyId]));
  } finally {
    loading.value = false;
  }
}

watch(dialogVisible, (val) => {
  if (val) loadConfig();
});

const open = () => {
  dialogVisible.value = true;
};

defineExpose({ open, reload: loadConfig });
</script>

<style scoped>
.ai-usage {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-height: 0;
}

/* ── Header ── */
.ai-usage__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.ai-usage__header-left { flex: 1; }

.ai-usage__title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.ai-usage__desc {
  margin: 4px 0 0;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.ai-usage__header-right {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.ai-usage__stat {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.ai-usage__empty {
  padding: 16px 0;
  font-size: 13px;
  color: var(--el-text-color-placeholder);
  text-align: center;
}

/* ── Body ── */
.ai-usage__body {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* ── Group ── */
.ai-usage__group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.ai-usage__group-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 0 4px;
}

.ai-usage__group-name {
  font-size: 12px;
  font-weight: 500;
  color: var(--el-text-color-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.ai-usage__group-count {
  font-size: 11px;
  color: var(--el-text-color-placeholder);
}

/* ── Rows ── */
.ai-usage__rows {
  display: flex;
  flex-direction: column;
}

.ai-usage__rows--collapsed {
  max-height: 600px;
  overflow: hidden;
}

.ai-usage__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 6px 8px 6px 0;
  margin-right: 4px;
  border-radius: 4px;
  transition: background .1s;
}

.ai-usage__row:hover { background: var(--el-fill-color-lighter); }

.ai-usage__row-left {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  flex: 1;
}

.ai-usage__row-right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.ai-usage__row-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--el-text-color-primary);
  white-space: nowrap;
}

.ai-usage__row-code {
  margin-left: 8px;
  font-size: 11px;
  font-family: var(--el-font-family-monospace, 'SFMono-Regular', 'Consolas', monospace);
  color: var(--el-text-color-secondary);
  white-space: nowrap;
}

.ai-usage__row-desc {
  overflow: hidden;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ai-usage__row-select {
  width: 180px;
}

.ai-usage__toggle {
  display: flex;
  width: 100%;
  padding: 4px 0;
  font-size: 11px;
  color: var(--el-text-color-secondary);
  cursor: pointer;
  background: transparent;
  border: none;
  align-items: center;
  justify-content: center;
  transition: color .1s;
}

.ai-usage__toggle:hover {
  color: var(--el-color-primary);
}

/* ── Tags ── */
.ai-usage__tag {
  display: inline-flex;
  height: 18px;
  padding: 0 6px;
  font-size: 10px;
  font-weight: 500;
  line-height: 18px;
  border-radius: 3px;
  align-items: center;
  flex-shrink: 0;
}

.ai-usage__tag--bound {
  color: var(--el-color-success);
  background: transparent;
}

.ai-usage__tag--invalid {
  color: var(--el-color-danger);
  background: transparent;
}

.ai-usage__tag--unbound {
  color: var(--el-text-color-placeholder);
  background: transparent;
}

/* ── Footer ── */
.ai-usage__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.ai-usage__footer-hint {
  font-size: 12px;
  color: var(--el-color-success);
}
</style>
