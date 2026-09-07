<template>
  <ContentWrap :plain="true">
    <ListPageLayout class="code-script-page">
      <template #filter>
        <div class="list-page-filter list-page-filter--flat">
          <el-form :model="queryParams" label-position="top" class="list-page-search-form">
            <el-row :gutter="12" class="list-page-search-form__row">
              <el-col
                class="list-page-search-form__col--wide"
                :xs="24"
                :sm="12"
                :md="8"
                :lg="6"
                :xl="5"
              >
                <el-form-item label="脚本名称">
                  <el-input
                    v-model="queryParams.search"
                    size="small"
                    placeholder="请输入脚本名称"
                    clearable
                    @keyup.enter="getList"
                    @change="
                      (val) => {
                        if (!val) getList();
                      }
                    "
                  />
                </el-form-item>
              </el-col>
            </el-row>
            <div class="list-page-search-form__actions">
              <el-button
                size="small"
                type="primary"
                :icon="Search"
                :loading="loading"
                @click="getList"
                >搜索</el-button
              >
              <el-button size="small" type="primary" :icon="Plus" @click="handleAdd"
                >新增脚本</el-button
              >
              <el-button
                size="small"
                type="danger"
                plain
                @click="handleDelete(null)"
              >
                批量删除 ({{ ids.length }})
              </el-button>
            </div>
          </el-form>
        </div>
      </template>

      <template #table>
        <div
          class="list-page-panel list-page-panel--flat list-page-table-panel list-page-table-panel--flat"
        >
          <div class="list-page-table-panel__body">
            <div class="common-table">
              <vxe-grid
                v-bind="gridOptions"
                :max-height="gridOptions.maxHeight"
                :data="dataSource"
                :loading="loading"
                @checkbox-change="checkboxChange"
                @checkbox-all="checkboxAllChange"
              >
                <template #statusSlot="{ row }">
                  <el-tag :type="row.isEnabled ? 'success' : 'info'" size="small">
                    {{ row.isEnabled ? "启用" : "停用" }}
                  </el-tag>
                </template>
                <template #tagsSlot="{ row }">
                  <div class="flex flex-wrap items-center gap-1">
                    <el-tag
                      v-for="tag in getTagsArray(row.tags)"
                      :key="tag"
                      size="small"
                      type="info"
                      effect="plain"
                      class="!bg-[var(--app-content-surface-muted-color)] !border-[var(--app-content-border-color)] !text-[var(--el-text-color-regular)]"
                    >
                      {{ tag }}
                    </el-tag>
                    <span v-if="!row.tags" class="text-xs text-[var(--el-text-color-secondary)]"
                      >-</span
                    >
                  </div>
                </template>
                <template #operationSlot="{ row }">
                  <div class="flex items-center">
                    <el-dropdown
                      trigger="click"
                      @command="(command) => handleOperationCommand(command, row)"
                    >
                      <el-button type="primary" link size="small" class="operation-trigger-button"
                        >操作</el-button
                      >
                      <template #dropdown>
                        <el-dropdown-menu class="operation-menu-compact">
                          <el-dropdown-item command="run">
                            <span>执行</span>
                          </el-dropdown-item>
                          <el-dropdown-item command="schedule">
                            <span>调度</span>
                          </el-dropdown-item>
                          <el-dropdown-item command="edit">
                            <span>编辑</span>
                          </el-dropdown-item>
                          <el-dropdown-item command="records">
                            <span>记录</span>
                          </el-dropdown-item>
                          <el-dropdown-item
                            command="delete"
                            divided
                            class="operation-menu-item--danger"
                          >
                            <span>删除</span>
                          </el-dropdown-item>
                        </el-dropdown-menu>
                      </template>
                    </el-dropdown>
                  </div>
                </template>
              </vxe-grid>
            </div>
          </div>
        </div>
      </template>

      <template #pagination>
        <div
          class="list-page-panel list-page-panel--flat list-page-table-panel__pagination list-page-table-panel__pagination--flat"
        >
          <pagination
            :total="total"
            v-model:page="queryParams.currentPage"
            v-model:limit="queryParams.pageSize"
            @pagination="getList"
          />
        </div>
      </template>
    </ListPageLayout>
  </ContentWrap>

  <el-dialog
    :title="dialogTitle"
    v-model="dialogVisible"
    fullscreen
    @close="dialogClose"
    align-center
  >
    <div class="grid h-[calc(100vh-120px)] grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
      <section
        class="flex min-h-0 flex-col rounded border border-solid border-[var(--el-border-color-light)]"
      >
        <div class="border-b border-solid border-[var(--el-border-color-light)] px-4 py-3">
          <div class="flex items-center justify-between gap-3">
            <div class="text-sm font-600">代码编辑</div>
            <div class="text-xs text-[var(--el-text-color-secondary)]">
              $result 返回结果，console.log 记录日志
            </div>
          </div>
        </div>
        <div class="min-h-0 flex-1 p-4">
          <el-form :model="form" :rules="rules" ref="formRef" label-width="0" class="h-full">
            <el-form-item prop="code" class="mb-0 h-full">
              <div
                class="h-full min-h-0 w-full overflow-hidden rounded border border-solid border-[var(--el-border-color-light)] bg-[var(--list-page-base-bg)]"
              >
                <div ref="editorHostRef" class="h-full min-h-0 w-full"></div>
              </div>
            </el-form-item>
          </el-form>
        </div>
      </section>

      <section class="flex min-h-0 flex-col gap-4 overflow-auto">
        <div class="rounded border border-solid border-[var(--el-border-color-light)] p-4">
          <div class="mb-3 text-sm font-600">基础信息</div>
          <el-form :model="form" :rules="rules" label-width="90px">
            <el-form-item label="脚本名称" prop="name">
              <el-input
                v-model="form.name"
                placeholder="请输入脚本名称"
                maxlength="200"
                show-word-limit
              />
            </el-form-item>
            <el-form-item label="超时(ms)" prop="timeoutMs">
              <el-input-number v-model="form.timeoutMs" :min="100" :max="1800000" class="w-full!" />
            </el-form-item>
            <el-form-item label="描述" prop="description">
              <el-input
                v-model="form.description"
                type="textarea"
                :rows="3"
                placeholder="请输入脚本描述"
              />
            </el-form-item>
            <el-form-item label="标签" prop="tags">
              <el-input v-model="form.tags" placeholder="例如：爬虫,下载,COS" />
            </el-form-item>
            <el-form-item label="是否启用" prop="isEnabled">
              <el-switch v-model="form.isEnabled" />
            </el-form-item>
          </el-form>
        </div>

        <div class="rounded border border-solid border-[var(--el-border-color-light)] p-4">
          <div class="mb-3 text-sm font-600">测试配置</div>
          <el-form label-width="90px">
            <el-form-item label="执行参数">
              <el-input
                v-model="form.paramsTemplate"
                type="textarea"
                :rows="10"
                placeholder='请输入 JSON，例如 { "url": "https://httpbin.org/json" }'
              />
            </el-form-item>
          </el-form>
          <div class="mb-3 text-xs leading-6 text-[var(--el-text-color-secondary)]">
            代码可直接写脚本体，使用 `$params`、`$tools`、`$result`。旧版 `module.exports = async
            function (...) {}` 仍兼容。
          </div>
          <div class="flex flex-wrap gap-2">
            <el-button @click="dialogVisible = false">关闭</el-button>
            <el-button type="primary" @click="submitForm" :loading="submitLoading">保存</el-button>
            <el-button type="success" @click="runTestFromEditor" :loading="runSubmitLoading"
              >测试执行</el-button
            >
          </div>
        </div>

        <div class="rounded border border-solid border-[var(--el-border-color-light)] p-4">
          <div class="mb-3 text-sm font-600">最近一次测试结果</div>
          <div
            class="mb-3 flex flex-wrap items-center gap-2 text-xs text-[var(--el-text-color-secondary)]"
          >
            <el-tag
              v-if="editorTestResult.status"
              :type="getRunStatusType(editorTestResult.status)"
              size="small"
            >
              {{ editorTestResult.status }}
            </el-tag>
            <span v-if="editorTestResult.durationMs"
              >耗时 {{ editorTestResult.durationMs }} ms</span
            >
          </div>
          <div class="grid grid-cols-1 gap-3">
            <div class="rounded bg-[var(--el-fill-color-lighter)] p-3">
              <div class="mb-2 text-xs font-600">结果</div>
              <pre class="m-0 whitespace-pre-wrap break-all text-xs leading-6">{{
                formatJson(editorTestResult.runResult)
              }}</pre>
            </div>
            <div class="rounded bg-[var(--el-fill-color-lighter)] p-3">
              <div class="mb-2 text-xs font-600">日志</div>
              <pre class="m-0 whitespace-pre-wrap break-all text-xs leading-6">{{
                formatJson(editorTestResult.logs)
              }}</pre>
            </div>
            <div
              v-if="editorTestResult.errorText"
              class="rounded bg-[var(--el-fill-color-lighter)] p-3"
            >
              <div class="mb-2 text-xs font-600">错误</div>
              <pre class="m-0 whitespace-pre-wrap break-all text-xs leading-6">{{
                editorTestResult.errorText
              }}</pre>
            </div>
          </div>
        </div>
      </section>
    </div>
  </el-dialog>

  <el-dialog title="执行脚本" v-model="runDialogVisible" width="780px" align-center>
    <el-form :model="runForm" label-width="100px">
      <el-form-item label="脚本名称">
        <div>{{ currentScript?.name || "-" }}</div>
      </el-form-item>
      <el-form-item label="执行参数">
        <el-input
          v-model="runForm.paramsText"
          type="textarea"
          :rows="10"
          placeholder="请输入执行参数 JSON"
        />
      </el-form-item>
      <el-form-item label="超时(ms)">
        <el-input-number
          v-model="runForm.timeoutMs"
          :min="100"
          :max="1800000"
          style="width: 100%"
        />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="runDialogVisible = false">取消</el-button>
      <el-button type="primary" @click="submitRun" :loading="runSubmitLoading">执行</el-button>
    </template>
  </el-dialog>

  <el-dialog title="执行详情" v-model="runDetailVisible" fullscreen align-center>
    <div class="run-detail-dialog" v-loading="runDetailLoading">
      <div class="run-detail-dialog__summary">
        <div class="run-detail-dialog__summary-main">
          <div class="run-detail-dialog__status-row">
            <el-tag :type="getRunStatusType(runDetail.status)" size="small">{{
              runDetail.status || "-"
            }}</el-tag>
            <span class="run-detail-dialog__status-text"> 当前脚本执行状态与运行上下文 </span>
          </div>
          <div class="run-detail-dialog__meta-grid">
            <div class="run-detail-dialog__meta-item">
              <div class="run-detail-dialog__meta-label">脚本名称</div>
              <div class="run-detail-dialog__meta-value">{{ runDetail.scriptName || "-" }}</div>
            </div>
            <div class="run-detail-dialog__meta-item">
              <div class="run-detail-dialog__meta-label">执行耗时</div>
              <div class="run-detail-dialog__meta-value">{{ runDetail.durationMs || 0 }} ms</div>
            </div>
            <div class="run-detail-dialog__meta-item">
              <div class="run-detail-dialog__meta-label">沙盒运行 ID</div>
              <div class="run-detail-dialog__meta-value is-mono">
                {{ runDetail.sandboxRunId || "-" }}
              </div>
            </div>
            <div class="run-detail-dialog__meta-item">
              <div class="run-detail-dialog__meta-label">记录 ID</div>
              <div class="run-detail-dialog__meta-value is-mono">{{ runDetail.id || "-" }}</div>
            </div>
          </div>
        </div>
        <div class="run-detail-dialog__summary-actions">
          <el-button
            v-if="isRunCancellable(runDetail)"
            size="small"
            type="danger"
            plain
            @click="handleCancelRun(runDetail)"
          >
            取消任务
          </el-button>
        </div>
      </div>
      <div class="run-detail-dialog__content">
        <div class="run-detail-panel">
          <div class="run-detail-panel__title">结果</div>
          <pre class="run-detail-panel__pre">{{ formatJson(runDetail.runResult) }}</pre>
        </div>
        <div class="run-detail-side">
          <div class="run-detail-panel">
            <div class="run-detail-panel__title">参数</div>
            <pre class="run-detail-panel__pre">{{ formatJson(runDetail.params) }}</pre>
          </div>
          <div class="run-detail-panel">
            <div class="run-detail-panel__title">日志</div>
            <div class="run-detail-panel__log">
              <div class="space-y-1 font-mono text-xs leading-6">
                <div
                  v-for="(item, index) in runDetailLogItems"
                  :key="`${index}-${item.level}`"
                  :class="getLogLevelClass(item.level)"
                >
                  <span class="mr-2 text-[10px] uppercase opacity-70">[{{ item.level }}]</span>
                  <span class="whitespace-pre-wrap break-all">{{ item.message }}</span>
                </div>
                <div v-if="!runDetailLogItems.length" class="text-[var(--el-text-color-secondary)]">
                  暂无日志
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </el-dialog>

  <el-dialog title="执行记录" v-model="runListVisible" fullscreen align-center>
    <div class="flex h-[calc(100vh-120px)] flex-col">
      <div class="mb-3 flex items-center justify-between gap-3">
        <div class="flex items-center gap-2">
          <el-tag v-if="runQuery.scriptId" size="small" type="primary"
            >脚本ID: {{ runQuery.scriptId }}</el-tag
          >
          <el-button
            type="danger"
            plain
            size="small"
            :disabled="!runIds.length"
            @click="handleDeleteRun()"
          >
            批量删除 ({{ runIds.length }})
          </el-button>
        </div>
        <div class="flex items-center gap-2">
          <el-button size="small" @click="clearRunFilter">查看全部</el-button>
          <el-button size="small" type="primary" @click="getRunList">刷新记录</el-button>
        </div>
      </div>
      <div class="common-table flex-1 min-h-0">
        <vxe-grid
          v-bind="runGridOptions"
          :max-height="runGridOptions.maxHeight"
          :data="runDataSource"
          :loading="runLoading"
          @checkbox-change="runCheckboxChange"
          @checkbox-all="runCheckboxAllChange"
        >
          <template #runStatusSlot="{ row }">
            <el-tag :type="getRunStatusType(row.status)" size="small">{{ row.status }}</el-tag>
          </template>
          <template #runOperationSlot="{ row }">
            <div class="flex items-center">
              <el-dropdown
                trigger="click"
                @command="(command) => handleRunOperationCommand(command, row)"
              >
                <el-button type="primary" link size="small" class="operation-trigger-button"
                  >操作</el-button
                >
                <template #dropdown>
                  <el-dropdown-menu class="operation-menu-compact">
                    <el-dropdown-item v-if="isRunCancellable(row)" command="cancel">
                      <span>取消</span>
                    </el-dropdown-item>
                    <el-dropdown-item command="detail">
                      <span>详情</span>
                    </el-dropdown-item>
                    <el-dropdown-item command="delete" divided class="operation-menu-item--danger">
                      <span>删除</span>
                    </el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </div>
          </template>
        </vxe-grid>
      </div>
      <div class="flex justify-end pt-3">
        <pagination
          :total="runTotal"
          v-model:page="runQuery.currentPage"
          v-model:limit="runQuery.pageSize"
          @pagination="getRunList"
        />
      </div>
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  reactive,
  ref,
  watch,
  watchEffect,
} from "vue";
import { useRouter } from "vue-router";
import { ElMessage, ElMessageBox } from "element-plus";
import { Search, Plus } from "@element-plus/icons-vue";
import { buildOperationColumn, commonGridOptions } from "@/common/table";
import ContentWrap from "@/components/ContentWrap/src/ContentWrap.vue";
import Pagination from "@/components/Pagination/index.vue";
import ListPageLayout from "@/components/ListPageLayout/index.vue";
import { useWindowSize } from "@vueuse/core";
import { EditorState } from "@codemirror/state";
import {
  EditorView,
  drawSelection,
  highlightActiveLine,
  highlightActiveLineGutter,
  keymap,
  lineNumbers,
} from "@codemirror/view";
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import {
  bracketMatching,
  defaultHighlightStyle,
  foldGutter,
  indentOnInput,
  syntaxHighlighting,
} from "@codemirror/language";
import { autocompletion, closeBrackets, closeBracketsKeymap } from "@codemirror/autocomplete";
import { javascript } from "@codemirror/lang-javascript";
import { oneDark } from "@codemirror/theme-one-dark";
import {
  cancelCodeScriptRun,
  createCodeScript,
  deleteCodeScript,
  deleteCodeScriptRun,
  getCodeScript,
  getCodeScriptList,
  getCodeScriptRun,
  getCodeScriptRunList,
  runCodeScript,
  updateCodeScript,
} from "@/api/codeScript";

const { height } = useWindowSize();
const router = useRouter();

const queryParams = reactive({
  currentPage: 1,
  pageSize: 20,
  search: "",
});

const runQuery = reactive({
  currentPage: 1,
  pageSize: 10,
  scriptId: undefined as number | undefined,
});

const gridOptions = ref({
  ...commonGridOptions,
  maxHeight: Math.max(height.value - 280, 360),
  rowConfig: { keyField: "id" },
  checkboxConfig: { reserve: true },
  columns: [
    { type: "checkbox", width: 48, reserve: true },
    { title: "ID", field: "id", width: 80 },
    { title: "脚本名称", field: "name", minWidth: 180, showOverflow: true },
    {
      title: "创建人",
      field: "uploader",
      width: 140,
      showOverflow: true,
      formatter: ({ row }) => row?.uploader?.account || row?.uploader?.name || row?.userId || "-",
    },
    { title: "描述", field: "description", minWidth: 200, showOverflow: true },
    { title: "标签", field: "tags", minWidth: 160, slots: { default: "tagsSlot" } },
    { title: "超时(ms)", field: "timeoutMs", width: 100 },
    { title: "状态", field: "isEnabled", width: 90, slots: { default: "statusSlot" } },
    { title: "更新时间", field: "updatedAt", width: 170, showOverflow: true },
    buildOperationColumn("operationSlot"),
  ],
} as any);

const runGridOptions = ref({
  ...commonGridOptions,
  maxHeight: Math.max(height.value - 280, 360),
  rowConfig: { keyField: "id" },
  checkboxConfig: { reserve: true },
  columns: [
    { type: "checkbox", width: 48, reserve: true },
    { title: "记录ID", field: "id", width: 90 },
    { title: "脚本名称", field: "scriptName", minWidth: 160, showOverflow: true },
    {
      title: "创建人",
      field: "uploader",
      width: 140,
      showOverflow: true,
      formatter: ({ row }) => row?.uploader?.account || row?.uploader?.name || row?.userId || "-",
    },
    { title: "状态", field: "status", width: 100, slots: { default: "runStatusSlot" } },
    { title: "沙盒ID", field: "sandboxRunId", minWidth: 180, showOverflow: true },
    { title: "耗时(ms)", field: "durationMs", width: 100 },
    { title: "创建时间", field: "createdAt", width: 170, showOverflow: true },
    buildOperationColumn("runOperationSlot"),
  ],
} as any);

watchEffect(() => {
  gridOptions.value.maxHeight = Math.max(height.value - 280, 360);
  runGridOptions.value.maxHeight = Math.max(height.value - 280, 360);
});

const loading = ref(false);
const dataSource = ref<any[]>([]);
const ids = ref<number[]>([]);
const total = ref(0);

const runLoading = ref(false);
const runDataSource = ref<any[]>([]);
const runTotal = ref(0);
const runIds = ref<number[]>([]);

const dialogVisible = ref(false);
const dialogTitle = ref("");
const submitLoading = ref(false);
const isEdit = ref(false);
const formRef = ref();
const editorHostRef = ref<HTMLDivElement>();
let editorView: EditorView | null = null;
const form = ref({
  id: undefined as number | undefined,
  name: "",
  description: "",
  code: `console.log('script start')\n$result = {\n  ok: true,\n  params: $params,\n}`,
  paramsTemplate: "{}",
  timeoutMs: 1800000,
  tags: "",
  isEnabled: true,
});

const runDialogVisible = ref(false);
const runSubmitLoading = ref(false);
const currentScript = ref<any>(null);
const runForm = reactive({
  paramsText: "{}",
  timeoutMs: 1800000,
});

const runDetailVisible = ref(false);
const runDetailLoading = ref(false);
const runListVisible = ref(false);
const editorTestResult = reactive<any>({
  status: "",
  durationMs: 0,
  runResult: null,
  logs: [],
  errorText: "",
});
const runDetail = reactive<any>({
  id: undefined,
  status: "",
  scriptName: "",
  sandboxRunId: "",
  durationMs: 0,
  params: {},
  runResult: null,
  logs: [],
  errorText: "",
});
const runDetailLogItems = computed(() => formatLogItems(runDetail.logs, runDetail.errorText));

const rules = {
  name: [{ required: true, message: "请输入脚本名称", trigger: "blur" }],
  code: [{ required: true, message: "请输入脚本代码", trigger: "blur" }],
  paramsTemplate: [{ required: true, message: "请输入默认参数 JSON", trigger: "blur" }],
};

function getTagsArray(tags: string) {
  if (!tags) return [];
  return tags
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function getRunStatusType(status: string) {
  if (status === "completed") return "success";
  if (status === "running" || status === "queued") return "warning";
  if (status === "failed" || status === "timed_out" || status === "cancelled") return "danger";
  return "info";
}

function isRunCancellable(row?: any) {
  const status = String(row?.status || "").toLowerCase();
  return status === "queued" || status === "running";
}

function formatJson(value: any) {
  return JSON.stringify(value ?? null, null, 2);
}

function normalizeLogMessage(value: any) {
  if (typeof value === "string") return value;
  if (value === null || value === undefined) return "";
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function formatLogItems(logs: any[], errorText?: string) {
  const items = Array.isArray(logs)
    ? logs.map((item) => {
        if (typeof item === "string") {
          return { level: "info", message: item };
        }
        return {
          level: String(item?.level || "info").toLowerCase(),
          message: normalizeLogMessage(item?.message ?? item),
        };
      })
    : [];

  if (errorText) {
    items.push({
      level: "error",
      message: normalizeLogMessage(errorText),
    });
  }

  return items.filter((item) => item.message);
}

function getLogLevelClass(level?: string) {
  const normalized = String(level || "info").toLowerCase();
  if (normalized === "error") return "text-red-600";
  if (normalized === "warn" || normalized === "warning") return "text-amber-600";
  if (normalized === "debug") return "text-sky-600";
  return "text-[var(--el-text-color-primary)]";
}

async function getList() {
  loading.value = true;
  try {
    const res = await getCodeScriptList({ ...queryParams });
    dataSource.value = res.list || [];
    total.value = res.total || 0;
    ids.value = [];
  } catch (error) {
    ElMessage.error("获取脚本列表失败");
  } finally {
    loading.value = false;
  }
}

async function getRunList() {
  runLoading.value = true;
  try {
    const res = await getCodeScriptRunList({ ...runQuery });
    runDataSource.value = res.list || [];
    runTotal.value = res.total || 0;
    runIds.value = [];
  } catch {
    ElMessage.error("获取执行记录失败");
  } finally {
    runLoading.value = false;
  }
}

function runCheckboxChange(e) {
  const records = Array.isArray(e.records) ? e.records : [];
  const reserves = Array.isArray(e.reserves) ? e.reserves : [];
  runIds.value = [...records.map((item) => item.id), ...reserves.map((item) => item.id)];
}

function runCheckboxAllChange(e) {
  const records = Array.isArray(e.records) ? e.records : [];
  const reserves = Array.isArray(e.reserves) ? e.reserves : [];
  runIds.value = [...records.map((item) => item.id), ...reserves.map((item) => item.id)];
}

function checkboxChange(e) {
  const records = Array.isArray(e.records) ? e.records : [];
  const reserves = Array.isArray(e.reserves) ? e.reserves : [];
  ids.value = [...records.map((item) => item.id), ...reserves.map((item) => item.id)];
}

function checkboxAllChange(e) {
  const records = Array.isArray(e.records) ? e.records : [];
  const reserves = Array.isArray(e.reserves) ? e.reserves : [];
  ids.value = [...records.map((item) => item.id), ...reserves.map((item) => item.id)];
}

function handleAdd() {
  isEdit.value = false;
  dialogTitle.value = "新增代码脚本";
  dialogVisible.value = true;
  form.value = {
    id: undefined,
    name: "",
    description: "",
    code: `console.log('script start')\n$result = {\n  ok: true,\n  params: $params,\n}`,
    paramsTemplate: "{}",
    timeoutMs: 1800000,
    tags: "",
    isEnabled: true,
  };
  Object.assign(editorTestResult, {
    status: "",
    durationMs: 0,
    runResult: null,
    logs: [],
    errorText: "",
  });
}

async function handleEdit(row) {
  isEdit.value = true;
  dialogTitle.value = "编辑代码脚本";
  const detail = await getCodeScript(row.id);
  form.value = {
    id: detail.id,
    name: detail.name || "",
    description: detail.description || "",
    code: detail.code || "",
    paramsTemplate: detail.paramsTemplate || "{}",
    timeoutMs: detail.timeoutMs || 1800000,
    tags: detail.tags || "",
    isEnabled: detail.isEnabled !== false,
  };
  Object.assign(editorTestResult, {
    status: "",
    durationMs: 0,
    runResult: null,
    logs: [],
    errorText: "",
  });
  dialogVisible.value = true;
}

function handleDelete(row?) {
  const delIds = row ? [row.id] : [...ids.value];
  if (!delIds.length) {
    return ElMessage.warning("请选择要删除的数据");
  }

  ElMessageBox.confirm(`确认删除选中的 ${delIds.length} 条脚本吗？`, "删除提示", {
    confirmButtonText: "确认",
    cancelButtonText: "取消",
    type: "warning",
  })
    .then(async () => {
      await deleteCodeScript({ ids: delIds });
      ElMessage.success("删除成功");
      getList();
      getRunList();
    })
    .catch(() => {});
}

async function submitForm() {
  submitLoading.value = true;
  try {
    validateScriptForm();
    if (isEdit.value) {
      await updateCodeScript(form.value);
      ElMessage.success("更新成功");
    } else {
      await createCodeScript(form.value);
      ElMessage.success("新增成功");
    }
    dialogVisible.value = false;
    getList();
  } catch (error: any) {
    ElMessage.error(error?.message || "保存失败，请检查 JSON 格式");
  } finally {
    submitLoading.value = false;
  }
}

function dialogClose() {
  formRef.value?.resetFields?.();
  destroyEditor();
}

function validateScriptForm() {
  if (!form.value.name?.trim()) {
    throw new Error("请输入脚本名称");
  }
  if (!form.value.code?.trim()) {
    throw new Error("请输入脚本代码");
  }
  JSON.parse(form.value.paramsTemplate || "{}");
}

async function runTestFromEditor() {
  runSubmitLoading.value = true;
  try {
    validateScriptForm();
    const payload =
      isEdit.value && form.value.id ? { ...form.value } : await createCodeScript({ ...form.value });

    if (!isEdit.value && payload?.id) {
      form.value.id = payload.id;
      isEdit.value = true;
      dialogTitle.value = "编辑代码脚本";
      ElMessage.success("已先保存脚本，再执行测试");
    } else if (isEdit.value) {
      await updateCodeScript(form.value);
    }

    const result = await runCodeScript({
      scriptId: form.value.id,
      params: JSON.parse(form.value.paramsTemplate || "{}"),
      timeoutMs: form.value.timeoutMs,
    });

    Object.assign(editorTestResult, {
      status: result?.status || "",
      durationMs: result?.durationMs || 0,
      runResult: result?.runResult ?? null,
      logs: result?.logs || [],
      errorText: result?.errorText || "",
    });
    ElMessage.success(result.status === "completed" ? "测试执行完成" : "测试执行已结束");
    await getList();
  } catch (error: any) {
    ElMessage.error(error?.message || "测试执行失败");
  } finally {
    runSubmitLoading.value = false;
  }
}

async function handleRun(row) {
  const detail = await getCodeScript(row.id);
  currentScript.value = detail;
  runForm.paramsText = detail.paramsTemplate || "{\n}";
  runForm.timeoutMs = detail.timeoutMs || 1800000;
  runDialogVisible.value = true;
}

function initEditor() {
  if (!editorHostRef.value) return;
  destroyEditor();

  const updateListener = EditorView.updateListener.of((update) => {
    if (update.docChanged) {
      form.value.code = update.state.doc.toString();
    }
  });

  const editorTheme = EditorView.theme({
    "&": {
      height: "100%",
      fontSize: "12px",
    },
    ".cm-scroller": {
      overflow: "auto",
      fontFamily: "Menlo, Monaco, Consolas, monospace",
      lineHeight: "1.75",
    },
    ".cm-content": {
      minHeight: "100%",
      padding: "16px",
    },
    ".cm-focused": {
      outline: "none",
    },
  });

  editorView = new EditorView({
    state: EditorState.create({
      doc: form.value.code || "",
      extensions: [
        lineNumbers(),
        highlightActiveLineGutter(),
        history(),
        drawSelection(),
        indentOnInput(),
        bracketMatching(),
        closeBrackets(),
        autocompletion(),
        foldGutter(),
        syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
        keymap.of([...closeBracketsKeymap, ...defaultKeymap, ...historyKeymap, indentWithTab]),
        highlightActiveLine(),
        javascript(),
        oneDark,
        updateListener,
        editorTheme,
      ],
    }),
    parent: editorHostRef.value,
  });
}

function syncEditorDoc(value: string) {
  if (!editorView) return;
  const current = editorView.state.doc.toString();
  if (current === value) return;
  editorView.dispatch({
    changes: { from: 0, to: current.length, insert: value || "" },
  });
}

function destroyEditor() {
  if (!editorView) return;
  editorView.destroy();
  editorView = null;
}

watch(
  () => dialogVisible.value,
  async (visible) => {
    if (!visible) return;
    await nextTick();
    initEditor();
  },
);

watch(
  () => form.value.code,
  (value) => {
    syncEditorDoc(value || "");
  },
);

async function submitRun() {
  if (!currentScript.value) return;
  runSubmitLoading.value = true;
  try {
    const params = JSON.parse(runForm.paramsText || "{}");
    const result = await runCodeScript({
      scriptId: currentScript.value.id,
      params,
      timeoutMs: runForm.timeoutMs,
    });
    ElMessage.success(result.status === "completed" ? "执行完成" : "执行已结束");
    runDialogVisible.value = false;
    runQuery.scriptId = currentScript.value.id;
    runQuery.currentPage = 1;
    await getRunList();
    if (result?.id) {
      await openRunDetail(result);
    }
  } catch (error: any) {
    ElMessage.error(error?.message || "执行失败");
  } finally {
    runSubmitLoading.value = false;
  }
}

function showRunRecords(row) {
  runQuery.scriptId = row.id;
  runQuery.currentPage = 1;
  runListVisible.value = true;
  getRunList();
}

function handleOperationCommand(command: string, row: any) {
  if (command === "run") {
    handleRun(row);
    return;
  }
  if (command === "schedule") {
    router.push({
      path: "/content/automation/code-script-schedule",
      query: { scriptId: String(row.id) },
    });
    return;
  }
  if (command === "edit") {
    handleEdit(row);
    return;
  }
  if (command === "records") {
    showRunRecords(row);
    return;
  }
  if (command === "delete") {
    handleDelete(row);
  }
}

function clearRunFilter() {
  runQuery.scriptId = undefined;
  runQuery.currentPage = 1;
  getRunList();
}

function handleRunOperationCommand(command: string, row: any) {
  if (command === "cancel") {
    handleCancelRun(row);
    return;
  }
  if (command === "detail") {
    openRunDetail(row);
    return;
  }
  if (command === "delete") {
    handleDeleteRun(row);
  }
}

function refreshRunDetailIfNeeded(id?: number) {
  if (!id || !runDetailVisible.value || runDetail.id !== id) {
    return Promise.resolve();
  }
  return openRunDetail({ id });
}

function handleCancelRun(row: any) {
  if (!row?.id) return;
  if (!isRunCancellable(row)) {
    ElMessage.warning("当前任务状态不可取消");
    return;
  }

  ElMessageBox.confirm(`确认取消执行记录 #${row.id} 吗？`, "取消任务", {
    confirmButtonText: "确认取消",
    cancelButtonText: "继续执行",
    type: "warning",
  })
    .then(async () => {
      await cancelCodeScriptRun({ id: row.id });
      ElMessage.success("取消成功");
      await Promise.all([getRunList(), refreshRunDetailIfNeeded(row.id)]);
    })
    .catch(() => {});
}

function handleDeleteRun(row?: any) {
  const deleteIds = row?.id ? [row.id] : [...runIds.value];
  if (!deleteIds.length) {
    return ElMessage.warning("请选择要删除的执行记录");
  }

  ElMessageBox.confirm(`确认删除选中的 ${deleteIds.length} 条执行记录吗？`, "删除提示", {
    confirmButtonText: "确认",
    cancelButtonText: "取消",
    type: "warning",
  })
    .then(async () => {
      await deleteCodeScriptRun({ ids: deleteIds });
      ElMessage.success("删除成功");
      if (row?.id && runDetailVisible.value && runDetail.id === row.id) {
        runDetailVisible.value = false;
      }
      await getRunList();
    })
    .catch(() => {});
}

async function openRunDetail(row) {
  runDetailVisible.value = true;
  runDetailLoading.value = true;
  try {
    const detail = await getCodeScriptRun(row.id);
    Object.assign(runDetail, {
      id: detail?.id,
      status: detail?.status || "",
      scriptName: detail?.scriptName || "",
      sandboxRunId: detail?.sandboxRunId || "",
      durationMs: detail?.durationMs || 0,
      params: detail?.params || {},
      runResult: detail?.runResult ?? null,
      logs: detail?.logs || [],
      errorText: detail?.errorText || "",
    });
  } finally {
    runDetailLoading.value = false;
  }
}

onMounted(async () => {
  await getList();
});

onBeforeUnmount(() => {
  destroyEditor();
});
</script>

<style scoped>
:deep(.code-script-page) {
  gap: 10px;
  padding: 8px 0 0;
}

:deep(.code-script-page .list-page-layout__main) {
  gap: 10px;
}

:deep(.code-script-page .list-page-filter--flat) {
  gap: 10px;
  padding-bottom: 10px;
}

:deep(.code-script-page .list-page-search-form__actions) {
  align-items: center;
}

:deep(.code-script-page .list-page-table-panel__pagination--flat) {
  padding-top: 10px;
}

.run-detail-dialog {
  display: flex;
  height: calc(100vh - 120px);
  min-height: 0;
  flex-direction: column;
  gap: 14px;
}

.run-detail-dialog__summary {
  display: flex;
  padding: 18px;
  background: linear-gradient(
    180deg,
    rgb(from var(--el-fill-color-lighter) r g b / 96%),
    rgb(from var(--el-fill-color) r g b / 78%)
  );
  border: 1px solid rgb(from var(--el-border-color-light) r g b / 72%);
  border-radius: 18px;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.run-detail-dialog__summary-main {
  flex: 1;
  min-width: 0;
}

.run-detail-dialog__summary-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex-shrink: 0;
}

.run-detail-dialog__status-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  margin-bottom: 14px;
}

.run-detail-dialog__status-text {
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.run-detail-dialog__meta-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
}

.run-detail-dialog__meta-item {
  min-height: 76px;
  padding: 14px 16px;
  background: rgb(from var(--el-bg-color) r g b / 76%);
  border-radius: 14px;
}

.run-detail-dialog__meta-label {
  font-size: 12px;
  line-height: 1.3;
  color: var(--el-text-color-secondary);
}

.run-detail-dialog__meta-value {
  margin-top: 8px;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.5;
  color: var(--el-text-color-primary);
  word-break: break-all;
}

.run-detail-dialog__meta-value.is-mono {
  font-family: var(--el-font-family-monospace, "SFMono-Regular", Consolas, monospace);
  font-size: 13px;
}

.run-detail-dialog__content {
  display: grid;
  min-height: 0;
  flex: 1;
  grid-template-columns: minmax(0, 1.3fr) minmax(320px, 0.7fr);
  gap: 14px;
}

.run-detail-side {
  display: grid;
  min-height: 0;
  grid-template-rows: minmax(0, 0.9fr) minmax(0, 1.1fr);
  gap: 14px;
}

.run-detail-panel {
  display: flex;
  min-height: 0;
  padding: 16px;
  background: rgb(from var(--el-fill-color-lighter) r g b / 96%);
  border: 1px solid rgb(from var(--el-border-color-light) r g b / 72%);
  border-radius: 18px;
  flex-direction: column;
}

.run-detail-panel__title {
  margin-bottom: 10px;
  font-size: 14px;
  font-weight: 700;
  line-height: 1.4;
  color: var(--el-text-color-primary);
}

.run-detail-panel__pre {
  margin: 0;
  overflow: auto;
  font-size: 12px;
  line-height: 1.7;
  word-break: break-all;
  white-space: pre-wrap;
  flex: 1;
}

.run-detail-panel__log {
  min-height: 0;
  padding: 12px 14px;
  overflow: auto;
  background: rgb(from var(--el-bg-color) r g b / 80%);
  border-radius: 14px;
  flex: 1;
}

@media (width <= 1279px) {
  .run-detail-dialog__content {
    grid-template-columns: minmax(0, 1fr);
  }

  .run-detail-side {
    grid-template-rows: minmax(220px, 0.85fr) minmax(260px, 1fr);
  }
}

@media (width <= 767px) {
  .run-detail-dialog {
    height: calc(100vh - 108px);
  }

  .run-detail-dialog__summary {
    flex-direction: column;
    padding: 16px;
  }

  .run-detail-dialog__summary-actions {
    width: 100%;
    justify-content: flex-start;
  }

  .run-detail-dialog__meta-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}

@keyframes sandbox-status-breathe-success {
  0%,
  100% {
    transform: scale(1);
    box-shadow: 0 0 0 0 rgb(103 194 58 / 12%);
  }

  50% {
    transform: scale(1.06);
    box-shadow: 0 0 0 5px rgb(103 194 58 / 0%);
  }
}

@keyframes sandbox-status-breathe-warning {
  0%,
  100% {
    transform: scale(1);
    box-shadow: 0 0 0 0 rgb(230 162 60 / 12%);
  }

  50% {
    transform: scale(1.06);
    box-shadow: 0 0 0 5px rgb(230 162 60 / 0%);
  }
}

@keyframes sandbox-status-breathe-danger {
  0%,
  100% {
    transform: scale(1);
    box-shadow: 0 0 0 0 rgb(245 108 108 / 10%);
  }

  50% {
    transform: scale(1.06);
    box-shadow: 0 0 0 5px rgb(245 108 108 / 0%);
  }
}
</style>
