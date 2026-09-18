<script setup lang="ts">
import { ref, computed, watch, nextTick } from "vue";
import { Pointer, Plus, FullScreen, QuestionFilled } from "@element-plus/icons-vue";
import type { Node } from "@vue-flow/core";
import AdvancedCronDialog from "./AdvancedCronDialog.vue";
import VariableSelector from "./VariableSelector.vue";
import {
  NODE_MANIFEST_REGISTRY,
  type NodeManifest,
  type NodeIOSchemaField,
} from "@/views/workflow/editor/config/node-manifest";
import { getMessagePushList, type MessagePushConfig } from "@/api/messagePush";
import { useWorkflowNodeManifest } from "@/composables/useWorkflowNodeManifest";
import { getWorkflowVariableKey } from "@/views/workflow/editor/config/workflowVariableKey";

const props = defineProps<{
  node: Node | null;
  workflowId?: string;
  allNodes?: Node[];
  allEdges?: any[];
  selectedEdge?: any | null;
}>();

const emit = defineEmits<{
  (e: "update", node: Node): void;
  (e: "delete", nodeId: string): void;
  (e: "updateEdge", edge: any): void;
}>();

const form = ref({ label: "", variableKey: "", config: {} as any });
const advancedCronVisible = ref(false);
const edgeCondition = ref("");
const { byType, load: loadServerManifest } = useWorkflowNodeManifest();
loadServerManifest();

// 变量选择器
const variableSelectorVisible = ref(false);
const activeFieldForVariable = ref("");

// 代码字段不在窄侧栏中直接编辑：使用草稿缓冲，只有点击“保存代码”才写回工作流节点。
const codeEditorVisible = ref(false);
const activeCodeField = ref("");
const codeEditorDraft = ref("");
const codeEditorTextarea = ref<HTMLTextAreaElement | null>(null);

const activeCodeFieldLabel = computed(() =>
  resolvedInputSchema.value.find((field) => field.field === activeCodeField.value)?.label || "代码",
);

const openCodeEditor = async (field: NodeIOSchemaField) => {
  activeCodeField.value = field.field;
  codeEditorDraft.value = String(form.value.config[field.field] ?? "");
  codeEditorVisible.value = true;
  await nextTick();
  codeEditorTextarea.value?.focus();
};

const saveCodeEditor = () => {
  if (!activeCodeField.value) return;
  form.value.config[activeCodeField.value] = codeEditorDraft.value;
  handleDataChange();
  codeEditorVisible.value = false;
};

const insertCodeIndent = (event: KeyboardEvent) => {
  const textarea = event.target as HTMLTextAreaElement;
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  codeEditorDraft.value = `${codeEditorDraft.value.slice(0, start)}  ${codeEditorDraft.value.slice(end)}`;
  nextTick(() => {
    textarea.selectionStart = textarea.selectionEnd = start + 2;
  });
};

const openVariableSelector = (fieldName: string) => {
  activeFieldForVariable.value = fieldName;
  variableSelectorVisible.value = true;
};

const handleVariableSelect = (variablePath: string, _label: string) => {
  if (!props.node) return;
  const fieldName = activeFieldForVariable.value;
  if (!fieldName) return;
  const currentVal = form.value.config[fieldName] || "";
  form.value.config[fieldName] = currentVal + `{{ ${variablePath} }}`;
  handleDataChange();
  variableSelectorVisible.value = false;
};

// 输出变量点击复制
const copiedField = ref("");
const copyVariable = async (nodeId: string, fieldName: string) => {
  const variableKey = props.node
    ? getWorkflowVariableKey(props.node, props.allNodes || [])
    : nodeId;
  const text = `{{ ${variableKey}.${fieldName} }}`;
  try {
    await navigator.clipboard.writeText(text);
    copiedField.value = fieldName;
    setTimeout(() => {
      copiedField.value = "";
    }, 1500);
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
    copiedField.value = fieldName;
    setTimeout(() => {
      copiedField.value = "";
    }, 1500);
  }
};

// 监听选中 edge，同步 condition
watch(
  () => props.selectedEdge,
  (edge) => {
    edgeCondition.value = edge?.data?.condition || edge?.condition || "";
  },
  { immediate: true },
);

const handleUpdateEdgeCondition = () => {
  if (!props.selectedEdge) return;
  const edge = { ...props.selectedEdge };
  if (!edge.data) edge.data = {};
  edge.data.condition = edgeCondition.value;
  edge.condition = edgeCondition.value;
  emit("updateEdge", edge);
};

// 消息推送渠道列表（动态从 API 加载）
const messagePushChannels = ref<MessagePushConfig[]>([]);
const messagePushLoading = ref(false);

const isNotifyNode = computed(() => {
  if (!props.node) return false;
  const t = props.node.type;
  return t === "message_push" || t === "message_push_feishu" || t === "message_push_wecom";
});

const loadMessagePushChannels = async () => {
  try {
    messagePushLoading.value = true;
    const res = await getMessagePushList();
    if (res && Array.isArray(res)) {
      messagePushChannels.value = res.filter((item) => item.enabled);
    }
  } catch (err) {
    console.error("加载消息推送渠道失败:", err);
  } finally {
    messagePushLoading.value = false;
  }
};

// 当前节点的 capability 定义
const currentCapability = computed<NodeManifest | null>(() => {
  if (!props.node) return null;
  const type = props.node.data?.capabilityType || props.node.type;
  const local = NODE_MANIFEST_REGISTRY.find((item) => item.type === type);
  const remote = byType.value?.get?.(type);
  if (!remote) return local || null;

  // 深度合并 inputSchema，确保本地定义的精细控件 (select options 等) 始终生效
  const localFields = Array.isArray(local?.inputSchema) ? local.inputSchema : [];
  const remoteFields = Array.isArray(remote.inputSchema) ? remote.inputSchema : [];
  const localMap = new Map(localFields.map((f) => [f.field, f]));
  const mergedInputSchema = localFields.map((lf) => {
    const rf = remoteFields.find((f: any) => f.field === lf.field);
    return rf ? { ...rf, ...lf, type: lf.type || rf.type, options: lf.options || rf.options } : lf;
  });
  // 补充仅服务端存在的字段
  for (const rf of remoteFields) {
    if (!localMap.has(rf.field)) {
      mergedInputSchema.push(rf);
    }
  }

  return {
    ...local,
    ...remote,
    type,
    inputSchema: mergedInputSchema.length ? mergedInputSchema : (remote.inputSchema || local?.inputSchema),
  } as NodeManifest;
});

// 是否受保护的边界节点（start 不允许删除）
const isProtectedBoundaryNode = computed(() => {
  return props.node?.type === "start";
});

// 计算动态输入表单 Schema
const resolvedInputSchema = computed<NodeIOSchemaField[]>(() => {
  const cap = currentCapability.value;
  if (!cap?.inputSchema) return [];
  const schema = Array.isArray(cap.inputSchema) ? cap.inputSchema : [];

  return schema.map((field) => {
    if (field.field === "channelId") {
      return {
        ...field,
        options: messagePushChannels.value.map((ch) => ({
          label: `${ch.name} (${ch.platform === "feishu" ? "飞书" : "企业微信"})`,
          value: ch.id,
        })),
      };
    }
    return field;
  });
});

const isStartNode = computed(() => props.node?.type === "start");

// 开始节点已有专属的触发器和输入变量设置，不能再由 Schema 重复渲染。
const shouldRenderSchemaForm = computed(() => !isStartNode.value);
const shouldShowOutputVariables = computed(
  () => !isStartNode.value && Boolean(currentCapability.value?.outputSchema?.length),
);

watch(
  () => props.node,
  (n) => {
    codeEditorVisible.value = false;
    if (n) {
      form.value.label = n.data?.label || (n.type === "start" ? "开始" : "");
      form.value.variableKey = n.data?.variableKey || getWorkflowVariableKey(n, props.allNodes || []);
      const cfg = { ...(n.data?.config || {}) };
      if (n.type === "start") {
        if (!Array.isArray(cfg.inputParams)) {
          cfg.inputParams = [];
        }
        // 如果 config 中存在直接定义的 key-value（非系统保留字段），自动补充为 inputParams 保证可见且可编辑
        const systemKeys = new Set(["triggerType", "cron", "inputParams", "webhook", "path"]);
        for (const [key, val] of Object.entries(cfg)) {
          if (!systemKeys.has(key) && !cfg.inputParams.some((p: any) => p.key === key)) {
            cfg.inputParams.push({
              key,
              type: typeof val === "number" ? "number" : typeof val === "boolean" ? "boolean" : typeof val === "object" ? "json" : "string",
              defaultValue: typeof val === "object" ? JSON.stringify(val) : String(val ?? ""),
            });
          }
        }
      }
      form.value.config = cfg;
    }
    if (isNotifyNode.value) {
      loadMessagePushChannels();
    }
  },
  { immediate: true },
);

const onChannelChange = (channelId: any) => {
  const matched = messagePushChannels.value.find((ch) => ch.id === channelId);
  if (matched) {
    form.value.config.channelName = matched.name;
    form.value.config.platform = matched.platform;
  }
  handleDataChange("channelId", matched?.name);
};

const handleDataChange = (fieldName?: string, selectedLabel?: string) => {
  if (!props.node) return;

  const config = { ...form.value.config };
  if (fieldName && selectedLabel) {
    const nameKey = fieldName === "channelId" ? "channelName" : `${fieldName}Name`;
    config[nameKey] = selectedLabel;
  }

  // 自动根据选中的 channelId 补全渠道名称和平台
  if (config.channelId && messagePushChannels.value?.length) {
    const matched = messagePushChannels.value.find((ch) => ch.id === config.channelId);
    if (matched) {
      config.channelName = matched.name;
      config.platform = matched.platform;
    }
  }

  // 开始节点：确保 inputParams 里的 key 与 defaultValue 同步到 config 根对象上，同时清理已删除的 key
  if (props.node.type === "start" && Array.isArray(config.inputParams)) {
    const systemKeys = new Set(["triggerType", "cron", "inputParams", "webhook", "path"]);
    const paramKeys = new Set(config.inputParams.map((p: any) => p.key).filter(Boolean));
    // 移除已删除的 inputParams 对应的 config 根级 key，避免 watch 自动补回
    for (const key of Object.keys(config)) {
      if (!systemKeys.has(key) && !paramKeys.has(key)) {
        delete config[key];
      }
    }
    // 同步 inputParams 到 config 根对象
    for (const param of config.inputParams) {
      if (param.key) {
        config[param.key] = param.defaultValue ?? config[param.key] ?? "";
      }
    }
  }

  emit("update", {
    ...props.node,
    data: {
      ...props.node.data,
      label: form.value.label,
      variableKey: form.value.variableKey,
      config,
    },
  });
};

const handleDelete = () => {
  if (props.node) emit("delete", props.node.id);
};

const addInputParam = () => {
  if (!form.value.config.inputParams) {
    form.value.config.inputParams = [];
  }
  form.value.config.inputParams.push({ key: "", type: "string" });
  handleDataChange();
};

const removeInputParam = (index: number) => {
  if (Array.isArray(form.value.config.inputParams)) {
    form.value.config.inputParams.splice(index, 1);
    handleDataChange();
  }
};
</script>

<template>
  <div class="config-panel">
    <!-- Edge 条件编辑器 -->
    <template v-if="selectedEdge && !node">
      <div class="config-panel__header">
        <div class="config-panel__title-badge">
          <span class="config-panel__type-name">连线条件</span>
        </div>
      </div>
      <div class="config-panel__body">
        <el-form label-position="top" size="small">
          <el-form-item label="条件表达式">
            <el-input
              v-model="edgeCondition"
              type="textarea"
              :rows="3"
              placeholder="例如：branch === 'sufficient'"
              @input="handleUpdateEdgeCondition"
            />
            <div class="config-panel__field-desc">
              支持运算符：===, !==, &gt;, &lt;, &gt;=, &lt;=, contains
            </div>
          </el-form-item>
          <div class="config-panel__meta-box">
            <div class="config-panel__meta-row">
              <span class="config-panel__meta-label">来源节点:</span>
              <span class="config-panel__meta-val">{{ selectedEdge.source }}</span>
            </div>
            <div class="config-panel__meta-row">
              <span class="config-panel__meta-label">目标节点:</span>
              <span class="config-panel__meta-val">{{ selectedEdge.target }}</span>
            </div>
          </div>
        </el-form>
      </div>
    </template>

    <template v-if="node">
      <div class="config-panel__header">
        <div class="config-panel__title-badge">
          <span
            v-if="currentCapability"
            class="config-panel__dot"
            :style="{ background: currentCapability.color }"
          />
          <span class="config-panel__type-name">
            {{ currentCapability?.name || node.data?.label || node.type }}
          </span>
        </div>
        <el-button
          v-if="!isProtectedBoundaryNode"
          type="danger"
          text
          size="small"
          @click="handleDelete"
        >
          <svg
            class="config-panel__delete-icon"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M4 7h16M10 11v6M14 11v6M5 7l1 13a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-13M9 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3"
              stroke="currentColor"
              stroke-width="1.75"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </el-button>
      </div>

      <div class="config-panel__body">
        <el-form label-position="top" size="small">
          <!-- 基础信息：节点名称支持自由编辑 -->
          <el-form-item label="节点显示名称">
            <el-input v-model="form.label" placeholder="输入节点名称 (例如: 开始)" @input="handleDataChange" />
          </el-form-item>

          <el-form-item label="节点变量标识 (variableKey)">
            <el-input
              v-model="form.variableKey"
              placeholder="下游引用的变量标识 (例如: start, collect_input)"
              @input="handleDataChange"
            />
            <div class="config-panel__field-desc">
              下游节点引用的变量前缀：<code>{{ '{' }}{{ '{' }}{{ form.variableKey || 'node' }}.字段名{{ '}' }}{{ '}' }}</code>
            </div>
          </el-form-item>

          <!-- 1. 开始节点专属配置 -->
          <template v-if="node.type === 'start'">
            <div class="config-panel__section-title config-panel__section-title--first">启动配置</div>
            <el-form-item label="触发类型">
              <el-select
                v-model="form.config.triggerType"
                placeholder="选择类型"
                @change="() => handleDataChange()"
              >
                <el-option label="手动触发 / API" value="manual" />
                <el-option label="定时触发" value="cron" />
                <el-option label="Webhook 触发" value="webhook" />
              </el-select>
            </el-form-item>

            <template v-if="form.config.triggerType === 'cron'">
              <el-button
                size="small"
                type="primary"
                plain
                style="width: 100%; margin-bottom: 12px"
                @click="advancedCronVisible = true"
              >
                设置定时与预设模板
              </el-button>
            </template>

            <div v-if="form.config.triggerType === 'webhook'" class="config-panel__field-desc config-panel__start-note">
              Webhook 地址和启用状态请在顶部“设置”的“Webhook 触发”中配置。
            </div>

            <div class="config-panel__section-title">输入变量列表</div>
            <div class="config-panel__field-desc" style="margin-bottom: 8px">
              下游节点可通过 <code>{{ '{' }}{{ '{' }}{{ form.variableKey || 'start' }}.变量名{{ '}' }}{{ '}' }}</code> 引用此处的输入变量。
            </div>
            <el-form-item label="">
              <div class="wf-param-list" style="display: flex; flex-direction: column; gap: 8px">
                <div
                  v-for="(param, idx) in form.config.inputParams || []"
                  :key="param.key || idx"
                  class="wf-param-card"
                  style="padding: 8px; border: 1px solid var(--el-border-color-lighter); border-radius: 6px; background: var(--el-fill-color-blank); display: flex; flex-direction: column; gap: 6px"
                >
                  <div style="display: flex; align-items: center; gap: 6px">
                    <el-input
                      v-model="param.key"
                      placeholder="变量名 (如 title)"
                      size="small"
                      style="flex: 1"
                      @input="handleDataChange"
                    />
                    <el-select
                      v-model="param.type"
                      size="small"
                      style="width: 90px"
                      @change="() => handleDataChange()"
                    >
                      <el-option label="string" value="string" />
                      <el-option label="number" value="number" />
                      <el-option label="boolean" value="boolean" />
                      <el-option label="json" value="json" />
                    </el-select>
                    <el-button
                      type="danger"
                      text
                      circle
                      size="small"
                      @click="removeInputParam(Number(idx))"
                    >
                      <svg
                        class="config-panel__delete-icon config-panel__delete-icon--sm"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M4 7h16M10 11v6M14 11v6M5 7l1 13a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-13M9 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3"
                          stroke="currentColor"
                          stroke-width="1.75"
                          stroke-linecap="round"
                          stroke-linejoin="round"
                        />
                      </svg>
                    </el-button>
                  </div>
                  <div>
                    <el-input
                      v-model="param.defaultValue"
                      :type="param.type === 'json' ? 'textarea' : 'text'"
                      :rows="param.type === 'json' ? 2 : 1"
                      placeholder="默认测试值 / 初始值"
                      size="small"
                      @input="() => { if (param.key) form.config[param.key] = param.defaultValue; handleDataChange(); }"
                    />
                  </div>
                </div>
                <el-button
                  size="small"
                  type="primary"
                  plain
                  style="width: 100%; margin-top: 4px"
                  @click="addInputParam"
                >
                  + 添加输入变量
                </el-button>
              </div>
            </el-form-item>
          </template>

          <!-- 2. HTTP 请求节点专属配置 -->
          <template v-if="node.type === 'http'">
            <el-form-item label="请求 URL">
              <el-input
                v-model="form.config.url"
                placeholder="https://api.example.com/data"
                @input="handleDataChange"
              >
                <template #prefix>
                  <span
                    class="http-method-tag"
                    :class="`http-method--${(form.config.method || 'GET').toLowerCase()}`"
                  >
                    {{ form.config.method || "GET" }}
                  </span>
                </template>
              </el-input>
            </el-form-item>
            <el-form-item label="请求方法">
              <el-select v-model="form.config.method" @change="() => handleDataChange()">
                <el-option label="GET" value="GET" />
                <el-option label="POST" value="POST" />
                <el-option label="PUT" value="PUT" />
                <el-option label="DELETE" value="DELETE" />
              </el-select>
            </el-form-item>
            <el-form-item label="超时时间 (ms)">
              <el-input-number
                v-model="form.config.timeout"
                :min="1000"
                :max="60000"
                :step="1000"
                @change="() => handleDataChange()"
              />
            </el-form-item>
            <el-form-item label="请求头 (JSON)">
              <el-input
                v-model="form.config.headers"
                type="textarea"
                :rows="2"
                placeholder='{"Content-Type": "application/json"}'
                @input="handleDataChange"
              />
            </el-form-item>
            <el-form-item label="请求体 (JSON)">
              <el-input
                v-model="form.config.body"
                type="textarea"
                :rows="2"
                placeholder='{"key": "value"}'
                @input="handleDataChange"
              />
            </el-form-item>
          </template>

          <!-- AI 调用节点统一使用下方能力清单渲染，避免专属表单与 Schema 重复展示 -->
          <!-- 4. 消息推送节点专属配置 -->
          <template
            v-if="node.type === 'message_push_feishu' || node.type === 'message_push_wecom'"
          >
            <el-form-item label="推送渠道" required>
              <el-select v-model="form.config.channelId" @change="onChannelChange">
                <el-option
                  v-for="ch in messagePushChannels"
                  :key="ch.id"
                  :label="`${ch.name} (${ch.platform === 'feishu' ? '飞书' : '企微'})`"
                  :value="ch.id"
                />
              </el-select>
            </el-form-item>
            <el-form-item label="消息标题">
              <el-input
                v-model="form.config.title"
                placeholder="支持 {{变量引用}}"
                @input="handleDataChange"
              />
            </el-form-item>
            <el-form-item label="消息内容" required>
              <el-input
                v-model="form.config.content"
                type="textarea"
                :rows="4"
                placeholder="支持 {{变量引用}}"
                @input="handleDataChange"
              />
            </el-form-item>
          </template>

          <!-- 5. 热搜采集节点专属配置 -->
          <template v-if="node.type && node.type.startsWith('hotsearch_')">
            <el-form-item label="平台">
              <span
                class="hotsearch-platform-badge"
                :data-platform="form.config.platform || node.type.replace('hotsearch_', '')"
              >
                {{ (form.config.platform || node.type.replace("hotsearch_", "")).toUpperCase() }}
              </span>
            </el-form-item>
          </template>

          <!-- 2. 基于 Schema 动态渲染输入表单 -->
          <template v-if="shouldRenderSchemaForm && resolvedInputSchema.length">
            <div class="config-panel__section-title">节点入参配置</div>
            <div
              v-for="field in resolvedInputSchema"
              :key="field.field"
              class="config-panel__schema-field"
            >
              <el-form-item :label="field.label">
                <template #label>
                  <span style="display: flex; align-items: center; gap: 4px">
                    {{ field.label }}
                    <el-tooltip
                      v-if="field.help"
                      placement="top"
                      :content="field.help"
                      raw-content
                    >
                      <el-icon class="config-panel__help-icon"><QuestionFilled /></el-icon>
                    </el-tooltip>
                  </span>
                </template>
                <template v-if="field.type === 'select'">
                  <el-select
                    v-model="form.config[field.field]"
                    :placeholder="field.placeholder || '请选择'"
                    style="width: 100%"
                    @change="
                      (val) => {
                        const opt = field.options?.find((o) => String(o.value) === String(val));
                        handleDataChange(field.field, opt?.label);
                      }
                    "
                  >
                    <el-option
                      v-for="opt in field.options || []"
                      :key="opt.value"
                      :label="opt.label"
                      :value="opt.value"
                    />
                  </el-select>
                </template>

                <template v-else-if="field.type === 'code'">
                  <button
                    type="button"
                    class="config-panel__open-code-editor"
                    @click="openCodeEditor(field)"
                  >
                    <span class="config-panel__open-code-editor-title">
                      {{ form.config[field.field] ? "已配置代码" : "点击打开代码编辑器" }}
                    </span>
                    <code class="config-panel__open-code-editor-preview">
                      {{ String(form.config[field.field] || field.placeholder || "").split("\n")[0] || "// 点击开始编写 JavaScript" }}
                    </code>
                    <el-icon class="config-panel__open-code-editor-icon"><FullScreen /></el-icon>
                  </button>
                </template>

                <template v-else-if="field.type === 'textarea'">
                  <div class="config-panel__textarea-wrapper">
                    <el-input
                      v-model="form.config[field.field]"
                      type="textarea"
                      :rows="3"
                      :placeholder="field.placeholder || '支持 {{ node_id.variable }}'"
                      @input="handleDataChange"
                    />
                    <button
                      class="config-panel__insert-var-icon--textarea"
                      @click="openVariableSelector(field.field)"
                      title="插入变量"
                    >
                      <el-icon :size="14"><Plus /></el-icon>
                    </button>
                  </div>
                </template>

                <template v-else-if="field.type === 'number'">
                  <el-input-number
                    v-model="form.config[field.field]"
                    size="small"
                    style="width: 100%"
                    @change="() => handleDataChange()"
                  />
                </template>

                <template v-else-if="field.type === 'boolean'">
                  <el-switch
                    v-model="form.config[field.field]"
                    @change="() => handleDataChange()"
                  />
                </template>

                <template v-else>
                  <el-input
                    v-model="form.config[field.field]"
                    :placeholder="field.placeholder || '输入内容或 {{ 变量 }}'"
                    @input="handleDataChange"
                  >
                    <template #suffix>
                      <button
                        class="config-panel__insert-var-icon"
                        @click="openVariableSelector(field.field)"
                        title="插入变量"
                      >
                        <el-icon :size="14"><Plus /></el-icon>
                      </button>
                    </template>
                  </el-input>
                </template>

                <!-- 字段说明提示 -->
                <div v-if="field.description" class="config-panel__field-desc">
                  {{ field.description }}
                </div>
              </el-form-item>
            </div>
          </template>

          <!-- 3. 输出变量 Schema 预览 -->
          <template v-if="shouldShowOutputVariables">
            <div class="config-panel__section-title">下游可用数据</div>
            <div class="config-panel__output-variables">
              <div
                v-for="out in currentCapability.outputSchema"
                :key="out.field"
                class="config-panel__output-row"
                :title="`复制变量：{{ ${getWorkflowVariableKey(node, allNodes || [])}.${out.field} }}`"
              >
                <span class="config-panel__output-main">
                  <span class="config-panel__output-label">{{ out.label || out.field }}</span>
                  <code class="config-panel__output-path"
                    >{{ getWorkflowVariableKey(node, allNodes || []) }}.{{ out.field }}</code
                  >
                </span>
                <button
                  type="button"
                  class="config-panel__output-copy"
                  @click="copyVariable(node.id, out.field)"
                >
                  {{ copiedField === out.field ? "已复制" : "复制" }}
                </button>
              </div>
            </div>
          </template>

          <!-- 元数据只在可编辑功能节点展示，开始/结束节点无需暴露内部 ID 与坐标。 -->
          <div v-if="!isProtectedBoundaryNode" class="config-panel__meta-box">
            <div class="config-panel__meta-row">
              <span class="config-panel__meta-label">节点 ID:</span>
              <span class="config-panel__meta-val">{{ node.id }}</span>
            </div>
            <div class="config-panel__meta-row">
              <span class="config-panel__meta-label">坐标:</span>
              <span class="config-panel__meta-val"
                >({{ Math.round(node.position.x) }}, {{ Math.round(node.position.y) }})</span
              >
            </div>
          </div>
        </el-form>
      </div>
    </template>

    <template v-else-if="!selectedEdge">
      <div class="config-panel__empty">
        <div class="config-panel__empty-illustration">
          <el-icon class="config-panel__empty-icon"><Pointer /></el-icon>
        </div>
        <div class="config-panel__empty-content">
          <p class="config-panel__empty-title">未选择节点</p>
          <p class="config-panel__empty-desc">点击画布中的节点进行配置</p>
        </div>
      </div>
    </template>

    <VariableSelector
      v-if="node"
      v-model:visible="variableSelectorVisible"
      :current-node-id="node.id"
      :all-nodes="allNodes || []"
      :all-edges="allEdges || []"
      @select="handleVariableSelect"
    />
    <AdvancedCronDialog v-model="advancedCronVisible" :workflow-id="workflowId || ''" />

    <el-dialog
      v-model="codeEditorVisible"
      :title="`${activeCodeFieldLabel}编辑器`"
      width="min(920px, 92vw)"
      top="5vh"
      append-to-body
      class="workflow-code-dialog"
      :close-on-click-modal="false"
    >
      <div class="workflow-code-dialog__hint">
        使用 Tab 插入两个空格；保存后才会更新当前工作流节点。
      </div>
      <textarea
        ref="codeEditorTextarea"
        v-model="codeEditorDraft"
        class="workflow-code-dialog__textarea"
        :placeholder="'// $params 包含上游节点输出\n// return { ok: true };'"
        spellcheck="false"
        @keydown.tab.prevent="insertCodeIndent"
      ></textarea>
      <template #footer>
        <el-button @click="codeEditorVisible = false">取消</el-button>
        <el-button type="primary" @click="saveCodeEditor">保存代码</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped lang="scss">
.config-panel {
  display: flex;
  width: 250px;
  height: 100%;
  background: var(--app-content-surface-color, #141518);
  border-left: 1px solid var(--app-content-border-color, rgb(255 255 255 / 8%));
  user-select: none;
  flex-direction: column;
  flex-shrink: 0;
}

.config-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  border-bottom: 1px solid var(--app-content-border-color, rgb(255 255 255 / 6%));
}

.config-panel__title-badge {
  display: flex;
  align-items: center;
  gap: 6px;
}

.config-panel__dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.config-panel__type-name {
  font-size: 12px;
  font-weight: 700;
  color: var(--el-text-color-primary);
}

.config-panel__body {
  padding: 12px;
  flex: 1;
  overflow-y: auto;

  :deep(.el-form-item) {
    margin-bottom: 12px;
  }

  :deep(.el-form-item__label) {
    padding-bottom: 2px;
    font-size: 11px;
    font-weight: 500;
    color: var(--el-text-color-secondary);
  }
}

.config-panel__section-title {
  padding-bottom: 4px;
  margin: 14px 0 8px;
  font-size: 11px;
  font-weight: 700;
  color: var(--el-text-color-primary);
  border-bottom: 1px dashed var(--app-content-border-color, rgb(255 255 255 / 10%));
}

.config-panel__section-title--first {
  margin-top: 0;
}

.config-panel__start-note {
  margin: -4px 0 10px;
}

.wf-param-list {
  width: 100%;
}

.wf-param-item {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 6px;
}

.config-panel__output-variables {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.config-panel__output-row {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border: 1px solid color-mix(in srgb, var(--el-color-primary) 18%, var(--app-content-border-color));
  border-radius: 5px;
  background: color-mix(in srgb, var(--el-color-primary) 5%, transparent);
}

.config-panel__output-main {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 2px;
  flex: 1;
}

.config-panel__output-label {
  display: block;
  min-width: 0;
  max-width: 100%;
  overflow: hidden;
  color: var(--el-text-color-regular);
  font-size: 10px;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex-shrink: 0;
}

.config-panel__output-path {
  display: block;
  min-width: 0;
  overflow: hidden;
  color: var(--el-color-primary);
  font-size: 10px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.config-panel__output-copy {
  padding: 2px 5px;
  border: 0;
  border-radius: 3px;
  color: var(--el-color-primary);
  background: color-mix(in srgb, var(--el-color-primary) 10%, transparent);
  cursor: pointer;
  font-size: 9px;
  flex-shrink: 0;
}

.config-panel__output-copy:hover {
  background: color-mix(in srgb, var(--el-color-primary) 18%, transparent);
}

.config-panel__meta-box {
  display: flex;
  padding: 8px 10px;
  margin-top: 16px;
  background: color-mix(in srgb, var(--el-text-color-secondary) 6%, transparent);
  border: 1px solid var(--app-content-border-color, rgb(255 255 255 / 4%));
  border-radius: 6px;
  flex-direction: column;
  gap: 4px;
}

.config-panel__meta-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 10px;
}

.config-panel__meta-label {
  color: var(--el-text-color-placeholder);
  flex-shrink: 0;
}

.config-panel__meta-val {
  min-width: 0;
  margin-left: 8px;
  overflow: hidden;
  font-family: monospace;
  color: var(--el-text-color-secondary);
  text-overflow: ellipsis;
  white-space: nowrap;
  flex-shrink: 1;
}

.config-panel__empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 40px 20px;
  text-align: center;
}

.config-panel__empty-illustration {
  display: flex;
  width: 56px;
  height: 56px;
  background: color-mix(in srgb, var(--el-text-color-secondary) 8%, transparent);
  border-radius: 14px;
  align-items: center;
  justify-content: center;
}

.config-panel__empty-icon {
  font-size: 24px;
  color: var(--el-text-color-secondary);
  opacity: 0.5;
}

.config-panel__empty-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.config-panel__empty-title {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  color: var(--el-text-color-regular);
}

.config-panel__empty-desc {
  margin: 0;
  font-size: 11px;
  line-height: 1.4;
  color: var(--el-text-color-placeholder);
}

.config-panel__field-desc {
  margin-top: 4px;
  font-size: 10px;
  line-height: 1.5;
  color: var(--el-text-color-placeholder);
}

.config-panel__help-icon {
  font-size: 14px;
  color: var(--el-text-color-secondary);
  cursor: help;
  transition: color 0.2s;

  &:hover {
    color: var(--el-color-primary);
  }
}

.config-panel__delete-icon {
  width: 16px;
  height: 16px;

  &--sm {
    width: 13px;
    height: 13px;
  }
}

/* 变量插入按钮 - Input 后缀图标样式 */
.config-panel__insert-var-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  padding: 0;
  color: var(--el-text-color-placeholder);
  background: transparent;
  border: none;
  border-radius: 3px;
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    color: var(--el-color-primary);
    background: color-mix(in srgb, var(--el-color-primary) 10%, transparent);
  }
}

.config-panel__textarea-wrapper {
  position: relative;
  width: 100%;
}

.config-panel__code-wrapper {
  position: relative;
  width: 100%;
}

.config-panel__code-editor {
  width: 100%;
  padding: 8px 10px;
  font-family: "SF Mono", "Fira Code", "Consolas", monospace;
  font-size: 11px;
  line-height: 1.5;
  color: var(--el-text-color-primary);
  background: var(--el-bg-color-page);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 4px;
  outline: none;
  resize: vertical;
  tab-size: 2;
  white-space: pre;
  overflow: auto;
}

.config-panel__code-editor:focus {
  border-color: var(--el-color-primary);
}

.config-panel__code-editor::placeholder {
  color: var(--el-text-color-placeholder);
}

.config-panel__open-code-editor {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  width: 100%;
  padding: 9px 10px;
  overflow: hidden;
  color: var(--el-text-color-regular);
  text-align: left;
  cursor: pointer;
  background: color-mix(in srgb, var(--el-bg-color-page) 88%, var(--el-color-primary) 12%);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 5px;
  gap: 3px 8px;
  transition: border-color 0.15s ease, background-color 0.15s ease;
}

.config-panel__open-code-editor:hover {
  background: color-mix(in srgb, var(--el-bg-color-page) 78%, var(--el-color-primary) 22%);
  border-color: var(--el-color-primary);
}

.config-panel__open-code-editor-title {
  min-width: 0;
  color: var(--el-text-color-primary);
  font-size: 11px;
  font-weight: 600;
}

.config-panel__open-code-editor-preview {
  grid-column: 1;
  min-width: 0;
  overflow: hidden;
  font-family: "SF Mono", "Fira Code", "Consolas", monospace;
  font-size: 10px;
  line-height: 1.45;
  color: var(--el-text-color-secondary);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.config-panel__open-code-editor-icon {
  grid-row: 1 / span 2;
  grid-column: 2;
  align-self: center;
  color: var(--el-color-primary);
  font-size: 16px;
}

:deep(.workflow-code-dialog .el-dialog__body) {
  padding-top: 12px;
}

.workflow-code-dialog__hint {
  margin-bottom: 8px;
  color: var(--el-text-color-secondary);
  font-size: 12px;
}

.workflow-code-dialog__textarea {
  display: block;
  width: 100%;
  min-height: min(64vh, 620px);
  padding: 14px 16px;
  overflow: auto;
  box-sizing: border-box;
  font-family: "SF Mono", "Fira Code", "Consolas", monospace;
  font-size: 13px;
  line-height: 1.65;
  color: var(--el-text-color-primary);
  tab-size: 2;
  resize: vertical;
  background: var(--el-bg-color-page);
  border: 1px solid var(--el-border-color);
  border-radius: 6px;
  outline: none;
  white-space: pre;
}

.workflow-code-dialog__textarea:focus {
  border-color: var(--el-color-primary);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--el-color-primary) 16%, transparent);
}

.workflow-code-dialog__textarea::placeholder {
  color: var(--el-text-color-placeholder);
}

.config-panel__insert-var-icon--textarea {
  position: absolute;
  right: 6px;
  bottom: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  padding: 0;
  color: var(--el-text-color-placeholder);
  background: color-mix(in srgb, var(--app-content-surface-color, #141518) 85%, transparent);
  border: 1px solid var(--app-content-border-color, rgb(255 255 255 / 8%));
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    color: var(--el-color-primary);
    background: color-mix(in srgb, var(--el-color-primary) 12%, transparent);
    border-color: color-mix(in srgb, var(--el-color-primary) 30%, transparent);
  }
}

.config-panel__input-with-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  width: 100%;
}
.http-method-tag {
  display: inline-block;
  padding: 2px 6px;
  font-size: 10px;
  font-weight: 600;
  border-radius: 3px;
  margin-right: 4px;
}
.http-method--get {
  background: #e8f5e9;
  color: #2e7d32;
}
.http-method--post {
  background: #e3f2fd;
  color: #1565c0;
}
.http-method--put {
  background: #fff3e0;
  color: #e65100;
}
.http-method--delete {
  background: #ffebee;
  color: #c62828;
}

.hotsearch-platform-badge {
  display: inline-block;
  padding: 2px 8px;
  font-size: 11px;
  font-weight: 600;
  border-radius: 4px;
  background: var(--el-fill-color);
  color: var(--el-text-color-primary);
}

.wf-config-info-box {
  margin-top: 12px;
  padding: 10px 12px;
  background: var(--el-fill-color-light);
  border-radius: 6px;
  border-left: 3px solid var(--el-color-primary);
}

.wf-config-info-title {
  font-size: 11px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  margin-bottom: 6px;
}

.wf-config-info-item {
  font-size: 10px;
  color: var(--el-text-color-secondary);
  padding: 2px 0;
}

.wf-config-info-item code {
  padding: 1px 4px;
  background: var(--el-bg-color);
  border-radius: 3px;
  font-family: monospace;
  color: var(--el-color-primary);
}


.config-panel__start-note {
  margin: 0 0 12px;
  font-size: 12px;
  line-height: 1.5;
  color: var(--el-text-color-secondary);
}
</style>
