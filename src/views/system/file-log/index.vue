<template>
  <ContentWrap :plain="true">
    <ListPageLayout class="file-log-page" sidebar-width="330px">
      <template #filter>
        <div class="list-page-filter list-page-filter--flat file-log-filter">
          <el-form :model="queryParams" label-position="top" class="list-page-search-form">
            <el-row :gutter="12" class="list-page-search-form__row">
              <el-col :xs="24" :sm="12" :md="8" :lg="5" :xl="4">
                <el-form-item label="日志来源">
                  <el-select v-model="queryParams.source" size="small" @change="handleSourceChange">
                    <el-option
                      v-for="item in sourceOptions"
                      :key="item.value"
                      :label="item.label"
                      :value="item.value"
                    />
                  </el-select>
                </el-form-item>
              </el-col>

              <el-col v-if="queryParams.source === 'client'" :xs="24" :sm="12" :md="8" :lg="7" :xl="6">
                <el-form-item label="客户端节点">
                  <el-select
                    v-model="queryParams.clientId"
                    size="small"
                    filterable
                    clearable
                    placeholder="请选择在线客户端"
                    :loading="clientOptionsLoading"
                    @visible-change="handleClientSelectVisibleChange"
                    @change="handleClientChange"
                  >
                    <el-option
                      v-for="item in clientOptions"
                      :key="item.id"
                      :label="item.label"
                      :value="item.id"
                    >
                      <div class="file-log-user-option">
                        <span>{{ item.label }}</span>
                        <span class="file-log-user-option__id">{{ item.machineCode || item.id }}</span>
                      </div>
                    </el-option>
                  </el-select>
                </el-form-item>
              </el-col>

              <el-col :xs="24" :sm="12" :md="8" :lg="5" :xl="4">
                <el-form-item label="查看方式">
                  <el-select v-model="queryParams.mode" size="small" @change="handleSearch">
                    <el-option
                      v-for="item in modeOptions"
                      :key="item.value"
                      :label="item.label"
                      :value="item.value"
                    />
                  </el-select>
                </el-form-item>
              </el-col>

              <el-col :xs="24" :sm="12" :md="8" :lg="6" :xl="5">
                <el-form-item label="日志类型">
                  <el-select
                    v-model="queryParams.types"
                    size="small"
                    multiple
                    collapse-tags
                    collapse-tags-tooltip
                    clearable
                    placeholder="全部类型"
                    :disabled="queryParams.source === 'client'"
                  >
                    <el-option
                      v-for="item in typeOptions"
                      :key="item.type"
                      :label="item.label"
                      :value="item.type"
                    />
                  </el-select>
                </el-form-item>
              </el-col>

              <el-col :xs="24" :sm="12" :md="8" :lg="6" :xl="5">
                <el-form-item label="日期范围">
                  <el-date-picker
                    v-model="queryParams.dateRange"
                    size="small"
                    type="daterange"
                    value-format="YYYY-MM-DD"
                    start-placeholder="开始日期"
                    end-placeholder="结束日期"
                    clearable
                    class="w-full"
                  />
                </el-form-item>
              </el-col>

              <el-col :xs="24" :sm="12" :md="8" :lg="5" :xl="4">
                <el-form-item label="日志等级">
                  <el-select
                    v-model="queryParams.level"
                    size="small"
                    clearable
                    placeholder="全部等级"
                  >
                    <el-option v-for="item in levelOptions" :key="item" :label="item" :value="item" />
                  </el-select>
                </el-form-item>
              </el-col>

              <el-col :xs="24" :sm="12" :md="8" :lg="6" :xl="5">
                <el-form-item label="操作用户">
                  <el-select
                    v-model="queryParams.userId"
                    size="small"
                    filterable
                    clearable
                    placeholder="选择用户"
                    :loading="userOptionsLoading"
                    @visible-change="handleUserSelectVisibleChange"
                  >
                    <el-option
                      v-for="item in userOptions"
                      :key="item.id"
                      :label="item.label"
                      :value="item.id"
                    >
                      <div class="file-log-user-option">
                        <span>{{ item.label }}</span>
                        <span class="file-log-user-option__id">ID：{{ item.id }}</span>
                      </div>
                    </el-option>
                  </el-select>
                </el-form-item>
              </el-col>

              <el-col :xs="24" :sm="12" :md="8" :lg="5" :xl="4">
                <el-form-item label="用户名">
                  <el-input
                    v-model="queryParams.userName"
                    size="small"
                    clearable
                    placeholder="用户名关键词"
                    @keyup.enter="handleSearch"
                  />
                </el-form-item>
              </el-col>

              <el-col :xs="24" :sm="12" :md="8" :lg="5" :xl="4">
                <el-form-item label="模块/功能">
                  <el-input
                    v-model="queryParams.module"
                    size="small"
                    clearable
                    placeholder="模块关键词"
                    @keyup.enter="handleSearch"
                  />
                </el-form-item>
              </el-col>

              <el-col :xs="24" :sm="12" :md="10" :lg="7" :xl="6">
                <el-form-item label="关键词">
                  <el-input
                    v-model="queryParams.keyword"
                    size="small"
                    clearable
                    placeholder="搜索日志正文、requestId、错误栈"
                    @keyup.enter="handleSearch"
                  />
                </el-form-item>
              </el-col>

              <el-col :xs="24" :sm="12" :md="6" :lg="4" :xl="3">
                <el-form-item :label="queryParams.mode === 'tail' ? '最近行数' : '每页行数'">
                  <el-input-number
                    v-if="queryParams.mode === 'tail'"
                    v-model="queryParams.lines"
                    size="small"
                    :min="50"
                    :max="5000"
                    :step="50"
                    controls-position="right"
                    class="w-full"
                  />
                  <el-input-number
                    v-else
                    v-model="queryParams.pageSize"
                    size="small"
                    :min="20"
                    :max="1000"
                    :step="20"
                    controls-position="right"
                    class="w-full"
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
                @click="handleSearch"
              >
                查询
              </el-button>
              <el-button size="small" :icon="Refresh" :disabled="loading" @click="resetQuery">
                重置
              </el-button>
              <el-button
                size="small"
                :icon="RefreshRight"
                :disabled="loading"
                @click="refreshTreeAndList"
              >
                刷新
              </el-button>
              <el-button
                size="small"
                type="success"
                plain
                :icon="Download"
                :disabled="!selectedFile"
                @click="handleDownload"
              >
                下载文件
              </el-button>
              <el-button
                size="small"
                type="danger"
                plain
                :icon="Delete"
                :disabled="!selectedFile || loading"
                @click="handleDeleteFile"
              >
                删除文件
              </el-button>
            </div>
          </el-form>
        </div>
      </template>

      <template #sidebar>
        <div class="list-page-panel list-page-panel--flat file-log-sidebar">
          <div class="file-log-sidebar__header">
            <div>
              <div class="file-log-sidebar__title">
                <el-icon><FolderOpened /></el-icon>
                <span>日志目录</span>
              </div>
              <div class="file-log-sidebar__path">
                {{ queryParams.source === "client" ? selectedClientLabel || "请选择客户端" : logRoot || "-" }}
              </div>
            </div>
            <div class="file-log-sidebar__count">{{ fileCount }} 个文件</div>
          </div>

          <el-scrollbar class="file-log-tree-scrollbar">
            <el-tree
              v-loading="treeLoading"
              :data="treeNodes"
              node-key="id"
              default-expand-all
              highlight-current
              :expand-on-click-node="false"
              empty-text="暂无日志文件"
              @node-click="handleTreeNodeClick"
            >
              <template #default="{ node, data }">
                <div class="file-log-tree-node" :class="{ 'is-file': data.nodeType === 'file' }">
                  <div class="file-log-tree-node__main">
                    <el-icon class="file-log-tree-node__icon">
                      <Document v-if="data.nodeType === 'file'" />
                      <FolderOpened v-else />
                    </el-icon>
                    <span class="file-log-tree-node__label">{{ node.label }}</span>
                  </div>
                  <span v-if="data.nodeType === 'file'" class="file-log-tree-node__meta">
                    {{ formatSize(data.size) }}
                  </span>
                </div>
              </template>
            </el-tree>
          </el-scrollbar>
        </div>
      </template>

      <template #table>
        <div
          class="list-page-panel list-page-panel--flat list-page-table-panel list-page-table-panel--flat file-log-table-panel"
        >
          <div class="file-log-table-toolbar">
            <div class="file-log-current">
              <span class="file-log-current__label">当前文件</span>
              <span class="file-log-current__value">
                {{ selectedFile ? selectedFile.relativePath : queryParams.source === "client" ? "客户端全部匹配文件" : "全部匹配文件" }}
              </span>
            </div>
            <div class="file-log-current__stats">
              匹配 {{ total }} 行 / 扫描 {{ scannedFiles.length }} 个文件
            </div>
          </div>

          <div class="list-page-table-panel__body">
            <div class="common-table file-log-table">
              <vxe-grid
                ref="gridRef"
                v-bind="gridOptions"
                :data="dataSource"
                :loading="loading"
                @cell-click="handleCellClick"
              >
                <template #levelSlot="{ row }">
                  <el-tag size="small" :type="getLevelTagType(row.level)" effect="plain">
                    {{ row.level || "-" }}
                  </el-tag>
                </template>

                <template #typeSlot="{ row }">
                  <div class="file-log-type-cell">
                    <span>{{ getTypeLabel(row.type) }}</span>
                    <span>{{ getFileBaseName(row.fileName) }}:{{ row.lineNumber }}</span>
                  </div>
                </template>

                <template #userSlot="{ row }">
                  <span>{{ formatLogUser(row) }}</span>
                </template>

                <template #messageSlot="{ row }">
                  <div class="file-log-message-cell">
                    {{ row.message || row.raw }}
                  </div>
                </template>

                <template #operationSlot="{ row }">
                  <el-button size="small" type="primary" link :icon="View" @click.stop="openDetail(row)">
                    查看
                  </el-button>
                </template>
              </vxe-grid>
            </div>
          </div>
        </div>
      </template>

      <template #pagination>
        <div
          v-if="queryParams.mode === 'search'"
          class="list-page-panel list-page-panel--flat list-page-table-panel__pagination list-page-table-panel__pagination--flat"
        >
          <pagination
            :total="total"
            v-model:page="queryParams.currentPage"
            v-model:limit="queryParams.pageSize"
            @pagination="executeQuery"
          />
        </div>
      </template>
    </ListPageLayout>

    <el-dialog v-model="detailVisible" width="76vw" top="6vh" class="file-log-detail-dialog">
      <template #header>
        <div class="file-log-detail-header">
          <div>
            <div class="file-log-detail-header__title">日志详情</div>
            <div class="file-log-detail-header__sub">
              {{ currentRow?.fileName || "-" }}:{{ currentRow?.lineNumber || "-" }}
            </div>
          </div>
          <el-tag v-if="currentRow?.level" size="small" :type="getLevelTagType(currentRow.level)" effect="plain">
            {{ currentRow.level }}
          </el-tag>
        </div>
      </template>
      <template v-if="currentRow">
        <div class="file-log-detail-meta">
          <div class="file-log-detail-meta__item">
            <span>时间</span>
            <strong>{{ formatTime(currentRow.time) }}</strong>
          </div>
          <div class="file-log-detail-meta__item">
            <span>模块</span>
            <strong>{{ currentRow.module || "-" }}</strong>
          </div>
          <div class="file-log-detail-meta__item">
            <span>用户</span>
            <strong>{{ formatLogUser(currentRow) }}</strong>
          </div>
          <div class="file-log-detail-meta__item">
            <span>RequestId</span>
            <strong>{{ currentRow.requestId || "-" }}</strong>
          </div>
          <div class="file-log-detail-meta__item">
            <span>TaskId</span>
            <strong>{{ currentRow.taskId || "-" }}</strong>
          </div>
        </div>

        <el-tabs model-value="parsed" class="file-log-detail-tabs">
          <el-tab-pane label="结构化" name="parsed">
            <pre class="file-log-code">{{ formatJson(currentRow.parsed || currentRow.raw) }}</pre>
          </el-tab-pane>
          <el-tab-pane label="原始行" name="raw">
            <pre class="file-log-code">{{ currentRow.raw }}</pre>
          </el-tab-pane>
        </el-tabs>
      </template>
    </el-dialog>
  </ContentWrap>
</template>

<script setup lang="tsx">
import { computed, onMounted, reactive, ref, watchEffect } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import {
  Delete,
  Document,
  Download,
  FolderOpened,
  Refresh,
  RefreshRight,
  Search,
  View,
} from "@element-plus/icons-vue";
import { useWindowSize } from "@vueuse/core";
import { commonGridOptions } from "@/common/table";
import { formatTimestamp } from "@/common/date";
import {
  downloadFileLog,
  deleteFileLog,
  getFileLogMeta,
  getFileLogTree,
  searchFileLogs,
  tailFileLogs,
  type FileLogFile,
  type FileLogLine,
  type FileLogSearchParams,
  type FileLogType,
  type FileLogTypeOption,
} from "@/api/system/fileLog";
import {
  getRuntimeWebsocketConnectionViews,
  queryClientLog,
  type WebsocketConnectionVO,
} from "@/api/system/websocket";
import { getUserList } from "@/api/user";
import Pagination from "@/components/Pagination/index.vue";
import ListPageLayout from "@/components/ListPageLayout/index.vue";

type QueryMode = "tail" | "search";
type LogSource = "server" | "client";

type TreeNode = {
  id: string;
  label: string;
  nodeType: "type" | "date" | "file";
  type?: FileLogType;
  date?: string;
  file?: FileLogFile;
  size?: number;
  children?: TreeNode[];
};

const levelOptions = ["TRACE", "DEBUG", "INFO", "WARN", "ERROR", "FATAL"];
const sourceOptions = [
  { label: "服务端", value: "server" },
  { label: "客户端", value: "client" },
];
const modeOptions = [
  { label: "最近日志", value: "tail" },
  { label: "搜索日志", value: "search" },
];

const queryParams = reactive({
  source: "server" as LogSource,
  clientId: "",
  mode: "tail" as QueryMode,
  types: [] as FileLogType[],
  dateRange: [] as string[],
  keyword: "",
  userId: undefined as number | undefined,
  userName: "",
  module: "",
  level: "",
  lines: 500,
  currentPage: 1,
  pageSize: 200,
});

const loading = ref(false);
const treeLoading = ref(false);
const logRoot = ref("");
const typeOptions = ref<FileLogTypeOption[]>([]);
const treeNodes = ref<TreeNode[]>([]);
const selectedFile = ref<FileLogFile | null>(null);
const dataSource = ref<FileLogLine[]>([]);
const scannedFiles = ref<FileLogFile[]>([]);
const total = ref(0);
const detailVisible = ref(false);
const currentRow = ref<FileLogLine | null>(null);
const gridRef = ref();
const userOptionsLoading = ref(false);
const userOptionsLoaded = ref(false);
const userOptions = ref<Array<{ id: number; label: string }>>([]);
const clientOptionsLoading = ref(false);
const clientOptionsLoaded = ref(false);
const clientOptions = ref<Array<{ id: string; label: string; machineCode?: string | null }>>([]);

const { height } = useWindowSize();

const fileCount = computed(() =>
  treeNodes.value.reduce((sum, node) => sum + (node.children?.length || 0), 0),
);
const selectedClientLabel = computed(
  () => clientOptions.value.find((item) => item.id === queryParams.clientId)?.label || "",
);

const gridOptions = ref({
  ...commonGridOptions,
  maxHeight: Math.max(height.value - 280, 360),
  rowConfig: {
    keyField: "id",
  },
  columns: [
    {
      title: "时间",
      field: "time",
      width: 176,
      showOverflow: true,
      formatter: ({ cellValue }: { cellValue: string }) => formatTime(cellValue),
    },
    { title: "等级", field: "level", width: 88, slots: { default: "levelSlot" } },
    { title: "文件/行号", field: "fileName", minWidth: 220, slots: { default: "typeSlot" } },
    { title: "模块", field: "module", width: 150, showOverflow: "tooltip" },
    { title: "用户", field: "userName", width: 150, slots: { default: "userSlot" } },
    { title: "消息", field: "message", minWidth: 420, slots: { default: "messageSlot" } },
    { title: "RequestId", field: "requestId", width: 170, showOverflow: "tooltip" },
    { title: "操作", field: "operation", fixed: "right", width: 86, slots: { default: "operationSlot" } },
  ],
});

watchEffect(() => {
  gridOptions.value.maxHeight = Math.max(height.value - 280, 360);
});

function getDateParams() {
  const [startDate, endDate] = queryParams.dateRange || [];
  return { startDate, endDate };
}

function getFileBaseName(fileName?: string) {
  const parts = String(fileName || "").split("/");
  return parts[parts.length - 1] || "-";
}

function groupFilesByDate(files: FileLogFile[]) {
  const map = new Map<string, FileLogFile[]>();
  files.forEach((file) => {
    const date = file.date || "未识别日期";
    map.set(date, [...(map.get(date) || []), file]);
  });
  return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
}

function buildPayload(): FileLogSearchParams {
  const { startDate, endDate } = getDateParams();
  const payload: FileLogSearchParams = {
    types: queryParams.types,
    startDate,
    endDate,
    keyword: queryParams.keyword.trim() || undefined,
    userId: queryParams.userId,
    userName: queryParams.userName.trim() || undefined,
    module: queryParams.module.trim() || undefined,
    level: queryParams.level || undefined,
  };

  if (selectedFile.value) {
    payload.type = selectedFile.value.type;
    payload.file = selectedFile.value.fileName;
  }

  if (queryParams.mode === "tail") {
    payload.lines = queryParams.lines;
  } else {
    payload.page = queryParams.currentPage;
    payload.pageSize = queryParams.pageSize;
  }

  return payload;
}

async function loadMeta() {
  const meta = await getFileLogMeta();
  logRoot.value = meta.root;
  typeOptions.value = meta.types;
}

async function loadTree() {
  if (queryParams.source === "client") {
    await loadClientTree();
    return;
  }

  treeLoading.value = true;
  try {
    const tree = await getFileLogTree(getDateParams());
    logRoot.value = tree.root;
    treeNodes.value = tree.children.map((item) => ({
      id: `type:${item.type}`,
      label: `${item.label} (${item.files.length})`,
      nodeType: "type",
      type: item.type,
      children: groupFilesByDate(item.files).map(([date, files]) => ({
        id: `date:${item.type}:${date}`,
        label: `${date} (${files.length})`,
        nodeType: "date",
        type: item.type,
        date,
        children: files.map((file) => ({
          id: file.relativePath,
          label: getFileBaseName(file.fileName),
          nodeType: "file",
          type: file.type,
          date: file.date,
          file,
          size: file.size,
        })),
      })),
    }));
  } finally {
    treeLoading.value = false;
  }
}

async function executeQuery() {
  if (queryParams.source === "client") {
    await executeClientQuery();
    return;
  }

  loading.value = true;
  try {
    const payload = buildPayload();
    const result =
      queryParams.mode === "tail" ? await tailFileLogs(payload) : await searchFileLogs(payload);
    dataSource.value = result.list || [];
    scannedFiles.value = result.files || [];
    total.value = result.total || 0;
  } finally {
    loading.value = false;
  }
}

async function loadClientOptions(force = false) {
  if (!force && (clientOptionsLoaded.value || clientOptionsLoading.value)) {
    return;
  }

  clientOptionsLoading.value = true;
  try {
    const list = await getRuntimeWebsocketConnectionViews();
    clientOptions.value = (Array.isArray(list) ? list : [])
      .filter((item: WebsocketConnectionVO) => {
        const source = item.clientSource || (item.query as any)?.clientSource;
        return source === "客户端";
      })
      .map((item: WebsocketConnectionVO) => {
        const machineCode = (item.clientInfo as any)?.machine?.code || (item.query as any)?.machineCode || "";
        return {
          id: String(item.id),
          label:
            (item.clientInfo as any)?.machine?.name ||
            machineCode ||
            (item.clientInfo as any)?.appVersion ||
            String(item.id),
          machineCode,
        };
      });
    clientOptionsLoaded.value = true;
    if (!queryParams.clientId && clientOptions.value.length === 1) {
      queryParams.clientId = clientOptions.value[0].id;
    }
  } finally {
    clientOptionsLoading.value = false;
  }
}

async function loadClientTree() {
  treeLoading.value = true;
  try {
    await loadClientOptions();
    if (!queryParams.clientId) {
      treeNodes.value = [];
      dataSource.value = [];
      scannedFiles.value = [];
      total.value = 0;
      return;
    }
    const { startDate, endDate } = getDateParams();
    const res = await queryClientLog({
      clientId: queryParams.clientId,
      action: "list",
      startDate,
      endDate,
    });
    const files = Array.isArray(res?.data?.files) ? res.data.files : [];
    logRoot.value = res?.data?.root || "";
    const normalizedFiles = files.map((file: any) => ({
      type: "client" as any,
      fileName: file.fileName,
      relativePath: file.relativePath || `client/${file.fileName}`,
      size: file.size,
      mtime: file.mtime,
      date: file.date,
      compressed: false,
    }));
    treeNodes.value = [
      {
        id: "type:client",
        label: `客户端日志 (${files.length})`,
        nodeType: "type",
        type: "client" as any,
        children: groupFilesByDate(normalizedFiles).map(([date, dateFiles]) => ({
          id: `date:client:${date}`,
          label: `${date} (${dateFiles.length})`,
          nodeType: "date",
          type: "client" as any,
          date,
          children: dateFiles.map((file) => ({
            id: file.relativePath || `client/${file.fileName}`,
            label: getFileBaseName(file.fileName),
            nodeType: "file",
            type: "client" as any,
            date: file.date,
            file,
            size: file.size,
          })),
        })),
      },
    ];
  } finally {
    treeLoading.value = false;
  }
}

async function executeClientQuery() {
  loading.value = true;
  try {
    await loadClientOptions();
    if (!queryParams.clientId) {
      ElMessage.warning("请先选择客户端节点");
      dataSource.value = [];
      scannedFiles.value = [];
      total.value = 0;
      return;
    }
    const { startDate, endDate } = getDateParams();
    const res = await queryClientLog({
      clientId: queryParams.clientId,
      action: queryParams.mode,
      file: selectedFile.value?.fileName,
      startDate,
      endDate,
      keyword: queryParams.keyword.trim() || undefined,
      module: queryParams.module.trim() || undefined,
      level: queryParams.level || undefined,
      lines: queryParams.lines,
      page: queryParams.currentPage,
      pageSize: queryParams.pageSize,
    });
    const payload = res?.data || {};
    dataSource.value = payload.list || [];
    scannedFiles.value = payload.files || [];
    total.value = payload.total || 0;
  } finally {
    loading.value = false;
  }
}

async function handleSearch() {
  queryParams.currentPage = 1;
  await loadTree();
  await executeQuery();
}

async function refreshTreeAndList() {
  await loadTree();
  await executeQuery();
}

async function resetQuery() {
  const source = queryParams.source;
  const clientId = queryParams.clientId;
  queryParams.source = source;
  queryParams.clientId = clientId;
  queryParams.mode = "tail";
  queryParams.types = [];
  queryParams.dateRange = [];
  queryParams.keyword = "";
  queryParams.userId = undefined;
  queryParams.userName = "";
  queryParams.module = "";
  queryParams.level = "";
  queryParams.lines = 500;
  queryParams.currentPage = 1;
  queryParams.pageSize = 200;
  selectedFile.value = null;
  await refreshTreeAndList();
}

async function handleTreeNodeClick(node: TreeNode) {
  if (node.nodeType === "file" && node.file) {
    selectedFile.value = node.file;
    queryParams.types = queryParams.source === "client" ? [] : [node.file.type];
    if (node.file.date) {
      queryParams.dateRange = [node.file.date, node.file.date];
    }
  } else if (node.nodeType === "date" && node.type) {
    selectedFile.value = null;
    queryParams.types = queryParams.source === "client" ? [] : [node.type];
    if (node.date && node.date !== "未识别日期") {
      queryParams.dateRange = [node.date, node.date];
    }
  } else if (node.nodeType === "type" && node.type) {
    selectedFile.value = null;
    queryParams.types = queryParams.source === "client" ? [] : [node.type];
  }
  queryParams.currentPage = 1;
  await executeQuery();
}

async function handleDownload() {
  if (!selectedFile.value) {
    ElMessage.warning("请先选择一个日志文件");
    return;
  }

  const file = selectedFile.value;
  if (queryParams.source === "client") {
    const rows = dataSource.value.map((item) => item.raw).join("\n");
    const blob = new Blob([rows], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = file.fileName;
    link.click();
    URL.revokeObjectURL(url);
    return;
  }

  const blob = await downloadFileLog({ type: file.type, file: file.fileName });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = file.fileName;
  link.click();
  URL.revokeObjectURL(url);
}

async function handleDeleteFile() {
  if (!selectedFile.value) {
    ElMessage.warning("请先选择一个日志文件");
    return;
  }

  const file = selectedFile.value;
  try {
    await ElMessageBox.confirm(
      `确认删除日志文件「${file.fileName}」？删除后无法在系统日志中继续查看该文件。`,
      "删除日志文件",
      {
        confirmButtonText: "删除",
        cancelButtonText: "取消",
        type: "warning",
        confirmButtonClass: "el-button--danger",
      },
    );
  } catch {
    return;
  }

  if (queryParams.source === "client") {
    if (!queryParams.clientId) {
      ElMessage.warning("请先选择客户端节点");
      return;
    }
    const res = await queryClientLog({
      clientId: queryParams.clientId,
      action: "delete",
      file: file.fileName,
    });
    if (res?.success === false) {
      throw new Error(res?.message || "删除客户端日志失败");
    }
  } else {
    await deleteFileLog({ type: file.type, file: file.fileName });
  }

  ElMessage.success("日志文件已删除");
  selectedFile.value = null;
  queryParams.currentPage = 1;
  await refreshTreeAndList();
}

async function handleSourceChange() {
  selectedFile.value = null;
  queryParams.currentPage = 1;
  if (queryParams.source === "client") {
    queryParams.types = [];
    await loadClientOptions(true);
  }
  await refreshTreeAndList();
}

async function handleClientChange() {
  selectedFile.value = null;
  queryParams.currentPage = 1;
  await refreshTreeAndList();
}

function handleClientSelectVisibleChange(visible: boolean) {
  if (visible) {
    loadClientOptions(true);
  }
}

function handleCellClick({ row }: { row: FileLogLine }) {
  openDetail(row);
}

function openDetail(row: FileLogLine) {
  currentRow.value = row;
  detailVisible.value = true;
}

async function loadUserOptions() {
  if (userOptionsLoaded.value || userOptionsLoading.value) {
    return;
  }

  userOptionsLoading.value = true;
  try {
    const res = await getUserList({
      currentPage: 1,
      pageSize: 1000,
    });
    const list = Array.isArray((res as any)?.list) ? (res as any).list : [];
    userOptions.value = list.map((item: any) => ({
      id: Number(item.id),
      label: item.name || item.account || item.username || `用户 ${item.id}`,
    }));
    userOptionsLoaded.value = true;
  } finally {
    userOptionsLoading.value = false;
  }
}

function handleUserSelectVisibleChange(visible: boolean) {
  if (visible) {
    loadUserOptions();
  }
}

function formatTime(value?: string) {
  return value ? formatTimestamp(value) : "-";
}

function formatLogUser(row: FileLogLine) {
  if (row.userName && row.userId) return `${row.userName} (${row.userId})`;
  return row.userName || row.userId || "-";
}

function formatSize(size?: number) {
  const value = Number(size || 0);
  if (value >= 1024 * 1024) return `${(value / 1024 / 1024).toFixed(1)} MB`;
  if (value >= 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${value} B`;
}

function formatJson(value: any) {
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function getTypeLabel(type: FileLogType) {
  if (String(type) === "client") return "客户端日志";
  return typeOptions.value.find((item) => item.type === type)?.label || type;
}

function getLevelTagType(level?: string) {
  const normalized = String(level || "").toUpperCase();
  if (normalized === "ERROR" || normalized === "FATAL") return "danger";
  if (normalized === "WARN") return "warning";
  if (normalized === "DEBUG" || normalized === "TRACE") return "info";
  return "success";
}

onMounted(async () => {
  await loadMeta();
  await loadTree();
  await executeQuery();
});
</script>

<style scoped lang="scss">
.file-log-page {
  min-height: calc(100vh - 110px);
}

.file-log-filter {
  padding: 10px 12px 8px;

  :deep(.el-form-item) {
    margin-bottom: 8px;
  }

  :deep(.el-form-item__label) {
    margin-bottom: 4px;
    font-size: 12px;
    line-height: 18px;
    color: var(--el-text-color-secondary);
  }

  :deep(.el-select),
  :deep(.el-date-editor) {
    width: 100%;
  }
}

.file-log-sidebar {
  display: flex;
  height: min(640px, calc(100vh - 250px));
  max-height: min(640px, calc(100vh - 250px));
  min-height: 360px;
  overflow: hidden;
  flex-direction: column;
}

.file-log-sidebar__header {
  display: flex;
  padding: 10px 12px 8px;
  background: var(--el-fill-color-blank);
  border-bottom: 1px solid var(--el-border-color-lighter);
  gap: 10px;
  align-items: flex-start;
  justify-content: space-between;
}

.file-log-sidebar__title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.file-log-sidebar__path {
  max-width: 230px;
  margin-top: 4px;
  overflow: hidden;
  font-size: 12px;
  line-height: 18px;
  color: var(--el-text-color-secondary);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-log-sidebar__count {
  padding-top: 1px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  flex: 0 0 auto;
}

.file-log-tree-scrollbar {
  flex: 1;
  min-height: 0;
  padding: 6px;

  :deep(.el-tree) {
    --el-tree-node-hover-bg-color: var(--el-fill-color-light);

    background: transparent;
  }

  :deep(.el-tree-node__content) {
    height: 32px;
    border-radius: 6px;
  }

  :deep(.el-tree--highlight-current .el-tree-node.is-current > .el-tree-node__content) {
    color: var(--el-color-primary);
    background: var(--el-color-primary-light-9);
  }
}

.file-log-tree-node {
  display: flex;
  width: 100%;
  min-width: 0;
  font-size: 13px;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.file-log-tree-node__main {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 6px;
}

.file-log-tree-node__icon {
  font-size: 15px;
  color: var(--el-text-color-secondary);
  flex: 0 0 auto;
}

.file-log-tree-node.is-file .file-log-tree-node__icon {
  color: var(--el-color-primary);
}

.file-log-tree-node__label {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-log-tree-node__meta {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  flex: 0 0 auto;
}

.file-log-table-panel {
  display: flex;
  min-height: 560px;
  flex-direction: column;
}

.file-log-table-toolbar {
  display: flex;
  padding: 9px 12px;
  background: var(--el-fill-color-blank);
  border-bottom: 1px solid var(--el-border-color-lighter);
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.file-log-current {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 8px;
}

.file-log-current__label {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  flex: 0 0 auto;
}

.file-log-current__value {
  min-width: 0;
  overflow: hidden;
  font-size: 13px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-log-current__stats {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  flex: 0 0 auto;
}

.file-log-table {
  width: 100%;

  :deep(.vxe-table--header-wrapper .vxe-header--row) {
    height: 38px;
  }

  :deep(.vxe-body--row) {
    cursor: pointer;
  }

  :deep(.vxe-body--column),
  :deep(.vxe-header--column) {
    padding-top: 6px;
    padding-bottom: 6px;
  }
}

.file-log-type-cell {
  display: flex;
  min-width: 0;
  flex-direction: column;
  line-height: 18px;
}

.file-log-type-cell span:first-child {
  color: var(--el-text-color-primary);
}

.file-log-type-cell span:last-child {
  overflow: hidden;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-log-message-cell {
  display: -webkit-box;
  overflow: hidden;
  line-height: 20px;
  word-break: break-all;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.file-log-user-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.file-log-user-option__id {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.file-log-detail-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.file-log-detail-header__title {
  font-size: 15px;
  font-weight: 600;
  line-height: 22px;
  color: var(--el-text-color-primary);
}

.file-log-detail-header__sub {
  margin-top: 2px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.file-log-detail-meta {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 8px;
  margin-bottom: 10px;
}

.file-log-detail-meta__item {
  min-width: 0;
  padding: 8px 10px;
  background: var(--el-fill-color-blank);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 6px;
}

.file-log-detail-meta__item span {
  display: block;
  font-size: 12px;
  line-height: 16px;
  color: var(--el-text-color-secondary);
}

.file-log-detail-meta__item strong {
  display: block;
  min-width: 0;
  margin-top: 3px;
  overflow: hidden;
  font-size: 12px;
  font-weight: 500;
  line-height: 18px;
  color: var(--el-text-color-primary);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-log-detail-tabs {
  min-height: 430px;

  :deep(.el-tabs__header) {
    margin-bottom: 8px;
  }
}

.file-log-code {
  max-height: 52vh;
  padding: 12px;
  margin: 0;
  overflow: auto;
  font-size: 12px;
  line-height: 1.6;
  color: #dbeafe;
  word-break: break-all;
  white-space: pre-wrap;
  background: #0f172a;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 6px;
}

@media (width <= 1024px) {
  .file-log-sidebar {
    height: min(460px, calc(100vh - 220px));
    max-height: min(460px, calc(100vh - 220px));
    min-height: 320px;
  }

  .file-log-table-panel {
    min-height: 420px;
  }

  .file-log-table-toolbar {
    align-items: flex-start;
    flex-direction: column;
  }

  .file-log-detail-meta {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
