<template>
  <div class="mcp-console-container">
    <!-- 面包屑/简单标题 -->
    <div class="mcp-page-title">
      <h2>MCP 功能文档与管理</h2>
      <p>浏览系统向外部 Agent (如 Cursor / Claude) 开放的 API 工具清单及安全控制策略</p>
    </div>

    <!-- 顶部状态统计栏 (扁平简洁) -->
    <div class="mcp-stats-row">
      <div class="stat-item">
        <span class="label">工具总数</span>
        <span class="value">{{ toolsList.length }}</span>
      </div>
      <div class="stat-item">
        <span class="label">当前长连接会话</span>
        <span class="value active">{{ activeSessions.length }}</span>
      </div>
    </div>

    <el-tabs v-model="activeTab" class="mcp-tabs">
      <!-- 选项卡 1：工具大盘与文档 -->
      <el-tab-pane name="tools">
        <template #label>
          <span>工具清单 & 接口文档</span>
        </template>

        <!-- 工具检索与过滤栏 -->
        <div class="filter-bar">
          <div class="filter-left">
            <el-input
              v-model="searchQuery"
              placeholder="搜索工具名、描述、标签..."
              clearable
              size="small"
              class="search-input"
            >
              <template #prefix>
                <el-icon><Search /></el-icon>
              </template>
            </el-input>
            <el-select
              v-model="selectedCategory"
              placeholder="功能分类"
              clearable
              size="small"
              class="filter-select"
            >
              <el-option label="全部分类" value="" />
              <el-option
                v-for="cat in categories"
                :key="cat.key"
                :label="cat.label"
                :value="cat.key"
              />
            </el-select>
          </div>
          <el-radio-group v-model="filterReadOnly" size="small">
            <el-radio-button :value="null">全部</el-radio-button>
            <el-radio-button :value="true">只读查询</el-radio-button>
            <el-radio-button :value="false">写入操作</el-radio-button>
          </el-radio-group>
        </div>

        <!-- 扁平化数据表格 -->
        <el-table
          v-loading="loading"
          :data="filteredTools"
          style="width: 100%"
          border
          class="flat-table"
        >
          <el-table-column label="工具名称 (LLM 调用名)" min-width="220">
            <template #default="{ row }">
              <div class="tool-name-cell">
                <code class="code-style">{{ row.name }}</code>
                <span class="tool-label-text">{{ row.label }}</span>
              </div>
            </template>
          </el-table-column>
          <el-table-column prop="description" label="功能描述" min-width="240" show-overflow-tooltip />
          <el-table-column prop="categoryLabel" label="所属分类" width="120" />
          <el-table-column label="模式" width="100">
            <template #default="{ row }">
              <el-tag :type="row.readOnly ? 'info' : 'warning'" size="small" effect="plain">
                {{ row.readOnly ? '只读' : '写入' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="风险等级" width="100">
            <template #default="{ row }">
              <el-tag :type="getRiskTagType(row.executionPolicy.riskLevel)" size="small" effect="plain">
                {{ getRiskLabel(row.executionPolicy.riskLevel) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="状态" width="100">
            <template #default="{ row }">
              <el-switch
                v-model="row.metadata.available"
                size="small"
                @change="handleToggleAvailable(row)"
              />
            </template>
          </el-table-column>
          <el-table-column label="人工确认" width="100">
            <template #default="{ row }">
              <el-switch
                v-model="row.executionPolicy.requiresConfirmation"
                size="small"
                @change="handleToggleConfirmation(row)"
              />
            </template>
          </el-table-column>
          <el-table-column label="操作" width="120" fixed="right">
            <template #default="{ row }">
              <el-button size="small" link type="primary" @click="showDetailDrawer(row)">
                查看文档
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>

      <!-- 选项卡 2：接入指南 -->
      <el-tab-pane name="guide">
        <template #label>
          <span>配置接入指南</span>
        </template>
        <div class="guide-panel">
          <div class="guide-section">
            <h3>Cursor 配置步骤</h3>
            <ol>
              <li>
                打开 Cursor，进入设置 <code>Settings -> Features -> MCP</code>。
              </li>
              <li>点击 <strong>"+ Add New MCP Server"</strong> 按钮。</li>
              <li>在表单中填写：
                <ul>
                  <li>Name: <code>yishe-server</code></li>
                  <li>Type: <code>SSE</code></li>
                  <li>URL:
                    <div class="copy-box">
                      <code>{{ mcpSseUrl }}</code>
                      <el-button size="small" link type="primary" @click="copyText(mcpSseUrl)">复制</el-button>
                    </div>
                  </li>
                </ul>
              </li>
            </ol>
            <el-alert
              title="提示：系统已自动读取并拼接你当前的 JWT Token 到 URL 中。如果是远程运行，请把 localhost 替换为对应服务器 IP/域名。"
              type="info"
              :closable="false"
              class="guide-alert"
            />
          </div>

          <div class="guide-section">
            <h3>Claude Desktop 配置文件</h3>
            <p>编辑配置文件 <code>~/Library/Application Support/Claude/claude_desktop_config.json</code> 并写入：</p>
            <pre class="json-pre"><code>{
  "mcpServers": {
    "yishe-server": {
      "type": "sse",
      "url": "{{ mcpSseUrl }}"
    }
  }
}</code></pre>
          </div>
        </div>
      </el-tab-pane>

      <!-- 选项卡 3：在线会话 -->
      <el-tab-pane name="sessions">
        <template #label>
          <span>活跃连接会话 ({{ activeSessions.length }})</span>
        </template>
        <div class="flat-panel">
          <div class="panel-header">
            <h4>在线 MCP 客户端连接</h4>
            <el-button size="small" link type="primary" @click="fetchSessions">刷新连接</el-button>
          </div>
          <el-table :data="activeSessions" style="width: 100%" border empty-text="当前无活跃 Agent 客户端连接">
            <el-table-column prop="sessionId" label="会话 ID" min-width="240">
              <template #default="{ row }">
                <code class="code-style">{{ row.sessionId }}</code>
              </template>
            </el-table-column>
            <el-table-column label="连接账号" width="180">
              <template #default="{ row }">
                <span>{{ row.user?.account || "系统账号" }}</span>
              </template>
            </el-table-column>
            <el-table-column label="用户姓名" width="180">
              <template #default="{ row }">
                <span>{{ row.user?.name || "管理员" }}</span>
              </template>
            </el-table-column>
            <el-table-column label="连接状态" width="120">
              <template #default>
                <span class="active-status">● 活动中</span>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </el-tab-pane>

      <!-- 选项卡 4：审计日志 -->
      <el-tab-pane name="logs">
        <template #label>
          <span>调用审计日志</span>
        </template>
        <div class="flat-panel">
          <div class="panel-header">
            <div class="search-left">
              <el-input
                v-model="logsFilterUser"
                placeholder="操作账号..."
                clearable
                size="small"
                class="log-search-input"
                @input="handleLogsQuery"
              />
              <el-input
                v-model="logsFilterTool"
                placeholder="工具名称..."
                clearable
                size="small"
                class="log-search-input"
                @input="handleLogsQuery"
              />
            </div>
            <el-button size="small" link type="primary" @click="fetchLogs">刷新日志</el-button>
          </div>

          <el-table :data="auditLogs" style="width: 100%" border v-loading="logsLoading">
            <el-table-column prop="timestamp" label="调用时间" width="170">
              <template #default="{ row }">
                <span>{{ formatTime(row.timestamp) }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="userName" label="操作人" width="130">
              <template #default="{ row }">
                <span>{{ row.userName || '系统' }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="toolName" label="调用的工具" min-width="200">
              <template #default="{ row }">
                <code class="code-style">{{ row.toolName }}</code>
              </template>
            </el-table-column>
            <el-table-column label="执行状态" width="100" align="center">
              <template #default="{ row }">
                <el-tag :type="row.success ? 'success' : 'danger'" size="small" effect="plain">
                  {{ row.success ? '成功' : '失败' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="ip" label="IP 地址" width="130" />
            <el-table-column label="操作" width="110" fixed="right">
              <template #default="{ row }">
                <el-button size="small" link type="primary" @click="viewLogDetails(row)">
                  查看明细
                </el-button>
              </template>
            </el-table-column>
          </el-table>

          <div class="pagination-container">
            <el-pagination
              v-model:current-page="logsPage"
              v-model:page-size="logsPageSize"
              :page-sizes="[10, 20, 50]"
              layout="total, sizes, prev, pager, next"
              :total="logsTotal"
              @size-change="handleLogsPageSizeChange"
              @current-change="handleLogsPageChange"
            />
          </div>
        </div>
      </el-tab-pane>
    </el-tabs>

    <!-- 工具详情抽屉 (文档) -->
    <el-drawer
      v-model="drawerVisible"
      :title="selectedTool?.label"
      size="45%"
      direction="rtl"
    >
      <div v-if="selectedTool" class="drawer-content">
        <div class="drawer-section">
          <h4>基本信息</h4>
          <table class="simple-info-table">
            <tr>
              <th>调用标识:</th>
              <td><code>{{ selectedTool.name }}</code></td>
            </tr>
            <tr>
              <th>中文描述:</th>
              <td>{{ selectedTool.description }}</td>
            </tr>
            <tr>
              <th>功能分类:</th>
              <td>{{ selectedTool.categoryLabel }} ({{ selectedTool.category }})</td>
            </tr>
            <tr>
              <th>只读/写入:</th>
              <td>{{ selectedTool.readOnly ? '数据查询 (只读)' : '资产修改 (写入)' }}</td>
            </tr>
            <tr>
              <th>风险等级:</th>
              <td>{{ getRiskLabel(selectedTool.executionPolicy.riskLevel) }}</td>
            </tr>
          </table>
        </div>

        <div class="drawer-section">
          <h4>参数定义 (Parameters Schema)</h4>
          <el-table :data="selectedTool.parameters" style="width: 100%" size="small" border>
            <el-table-column prop="name" label="参数名称" width="120">
              <template #default="{ row }">
                <code class="code-style">{{ row.name }}</code>
                <span v-if="row.required" class="required-star">*</span>
              </template>
            </el-table-column>
            <el-table-column prop="type" label="类型" width="100">
              <template #default="{ row }">
                <span class="type-text">{{ Array.isArray(row.type) ? row.type.join(' | ') : row.type }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="description" label="说明" />
            <el-table-column prop="default" label="默认值" width="90">
              <template #default="{ row }">
                <span v-if="row.default !== undefined">{{ JSON.stringify(row.default) }}</span>
                <span v-else class="empty-cell">-</span>
              </template>
            </el-table-column>
          </el-table>
        </div>

        <div class="drawer-section">
          <h4>调用示例 (Prompt Cases)</h4>
          <div v-if="selectedTool.examples && selectedTool.examples.length" class="example-container">
            <div v-for="(ex, index) in selectedTool.examples" :key="index" class="example-item">
              <p class="example-prompt"><strong>模型提示词:</strong> "{{ ex.prompt }}"</p>
              <pre v-if="ex.input" class="json-pre"><code>{{ JSON.stringify(ex.input, null, 2) }}</code></pre>
            </div>
          </div>
          <div v-else class="empty-case">暂无大模型使用案例</div>
        </div>
      </div>
    </el-drawer>

    <!-- Log Payload 详情弹窗 -->
    <el-dialog v-model="logDialogVisible" title="调用明细 (Payload)" width="45%">
      <div v-if="selectedLog" class="log-payload-viewer">
        <p><strong>调用的工具:</strong> <code>{{ selectedLog.toolName }}</code></p>
        <p><strong>执行状态:</strong> 
          <el-tag :type="selectedLog.success ? 'success' : 'danger'" size="small">
            {{ selectedLog.success ? '成功' : '失败' }}
          </el-tag>
        </p>
        <p><strong>执行人:</strong> {{ selectedLog.userName || '系统' }}</p>
        <p><strong>调用时间:</strong> {{ formatTime(selectedLog.timestamp) }}</p>
        <el-divider />
        <div style="margin-bottom: 12px;">
          <strong>输入参数 (Arguments):</strong>
          <pre class="json-pre"><code>{{ JSON.stringify(selectedLog.input || {}, null, 2) }}</code></pre>
        </div>
        <div>
          <strong>输出结果 (Result):</strong>
          <pre class="json-pre"><code>{{ JSON.stringify(selectedLog.output || {}, null, 2) }}</code></pre>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { ElMessage } from "element-plus";
import { Search } from "@element-plus/icons-vue";
import { McpApi, type McpTool, type McpToolCategory, type McpSession, type McpLog } from "@/api/mcp";
import { getAccessToken } from "@/utils/auth";

defineOptions({
  name: "McpConsole",
});

const mcpSseUrl = computed(() => {
  const token = getAccessToken() || "YOUR_TOKEN";
  const apiBase = (import.meta.env.VITE_BASE_URL || window.location.origin).replace(/\/+$/, "").replace(/\/api$/, "");
  return `${apiBase}/api/sse?token=${token}`;
});

const activeTab = ref("tools");
const loading = ref(false);
const toolsList = ref<McpTool[]>([]);
const categories = ref<McpToolCategory[]>([]);
const activeSessions = ref<McpSession[]>([]);

// 检索筛选
const searchQuery = ref("");
const selectedCategory = ref("");
const filterReadOnly = ref<boolean | null>(null);

// 详情抽屉
const drawerVisible = ref(false);
const selectedTool = ref<McpTool | null>(null);

// 日志数据
const auditLogs = ref<McpLog[]>([]);
const logsLoading = ref(false);
const logsFilterUser = ref("");
const logsFilterTool = ref("");
const logsPage = ref(1);
const logsPageSize = ref(20);
const logsTotal = ref(0);
const logDialogVisible = ref(false);
const selectedLog = ref<McpLog | null>(null);

// 获取工具列表
const fetchTools = async () => {
  loading.value = true;
  try {
    const res = await McpApi.getTools();
    if (res.success) {
      toolsList.value = res.tools || [];
      categories.value = res.categories || [];
    }
  } catch (error) {
    console.error("Failed to fetch tools:", error);
    ElMessage.error("获取工具数据失败");
  } finally {
    loading.value = false;
  }
};

// 过滤筛选
const filteredTools = computed(() => {
  return toolsList.value.filter((tool) => {
    if (selectedCategory.value && tool.category !== selectedCategory.value) {
      return false;
    }
    if (filterReadOnly.value !== null && tool.readOnly !== filterReadOnly.value) {
      return false;
    }
    if (searchQuery.value) {
      const q = searchQuery.value.toLowerCase();
      return (
        tool.name.toLowerCase().includes(q) ||
        tool.label.toLowerCase().includes(q) ||
        tool.description.toLowerCase().includes(q)
      );
    }
    return true;
  });
});

const getRiskTagType = (level: string) => {
  switch (level) {
    case "high": return "danger";
    case "medium": return "warning";
    case "low":
    default:
      return "success";
  }
};

const getRiskLabel = (level: string) => {
  switch (level) {
    case "high": return "高风险";
    case "medium": return "中风险";
    case "low":
    default:
      return "低风险";
  }
};

const showDetailDrawer = (tool: McpTool) => {
  selectedTool.value = tool;
  drawerVisible.value = true;
};

// 启用状态 Toggle
const handleToggleAvailable = async (tool: McpTool) => {
  try {
    const res = await McpApi.updateTool(tool.name, {
      enabled: tool.metadata.available,
    });
    if (res.success) {
      ElMessage.success(`已${tool.metadata.available ? '启用' : '禁用'}工具: ${tool.label}`);
    }
  } catch (error) {
    ElMessage.error("修改启用状态失败");
    tool.metadata.available = !tool.metadata.available; // 回滚
  }
};

// 人工确认 Toggle
const handleToggleConfirmation = async (tool: McpTool) => {
  try {
    const res = await McpApi.updateTool(tool.name, {
      confirmRequired: tool.executionPolicy.requiresConfirmation,
    });
    if (res.success) {
      ElMessage.success(`安全确认机制已${tool.executionPolicy.requiresConfirmation ? '开启' : '关闭'}`);
    }
  } catch (error) {
    ElMessage.error("修改安全确认机制失败");
    tool.executionPolicy.requiresConfirmation = !tool.executionPolicy.requiresConfirmation; // 回滚
  }
};

// 活跃会话
const fetchSessions = async () => {
  try {
    const res = await McpApi.getSessions();
    if (res.success) {
      activeSessions.value = res.list || [];
    }
  } catch (error) {
    console.error(error);
  }
};

// 审计日志
const fetchLogs = async () => {
  logsLoading.value = true;
  try {
    const res = await McpApi.getLogs({
      page: logsPage.value,
      pageSize: logsPageSize.value,
      userName: logsFilterUser.value || undefined,
      toolName: logsFilterTool.value || undefined,
    });
    if (res.success) {
      auditLogs.value = res.list || [];
      logsTotal.value = res.total || 0;
    }
  } catch (error) {
    console.error(error);
  } finally {
    logsLoading.value = false;
  }
};

const handleLogsQuery = () => {
  logsPage.value = 1;
  fetchLogs();
};

const handleLogsPageChange = (page: number) => {
  logsPage.value = page;
  fetchLogs();
};

const handleLogsPageSizeChange = (size: number) => {
  logsPageSize.value = size;
  logsPage.value = 1;
  fetchLogs();
};

const viewLogDetails = (log: McpLog) => {
  selectedLog.value = log;
  logDialogVisible.value = true;
};

const copyText = (text: string) => {
  navigator.clipboard.writeText(text).then(() => {
    ElMessage.success("已复制到剪贴板");
  }).catch(() => {
    ElMessage.error("复制失败");
  });
};

const formatTime = (timeStr?: string) => {
  if (!timeStr) return "";
  const d = new Date(timeStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`;
};

onMounted(() => {
  fetchTools();
  fetchSessions();
  fetchLogs();
});
</script>

<style scoped>
/* 使用系统原生主题颜色变量，保证完美适配白天/黑夜模式 */
.mcp-console-container {
  padding: 4px 0;
  color: var(--el-text-color-primary);
  box-sizing: border-box;
}

.mcp-page-title {
  margin-bottom: 12px;
}

.mcp-page-title h2 {
  margin: 0 0 4px;
  font-size: 16px;
  font-weight: 600;
}

.mcp-page-title p {
  margin: 0;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

/* 扁平统计栏 */
.mcp-stats-row {
  display: flex;
  padding: 8px 0;
  margin-bottom: 16px;
  border-bottom: 1px solid var(--el-border-color-light);
  gap: 24px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stat-item .label {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.stat-item .value {
  font-size: 20px;
  font-weight: bold;
  color: var(--el-text-color-primary);
}

.stat-item .value.active {
  color: var(--el-color-success);
}

.mcp-tabs {
  background-color: var(--el-bg-color);
}

.filter-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  gap: 16px;
}

.filter-left {
  display: flex;
  gap: 10px;
  flex: 1;
}

.search-input {
  max-width: 280px;
}

.filter-select {
  width: 140px;
}

.tool-name-cell {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.code-style {
  padding: 2px 6px;
  font-family: Menlo, Monaco, Consolas, monospace;
  font-size: 12px;
  color: var(--el-color-primary);
  word-break: break-all;
  background-color: var(--el-fill-color-light);
  border-radius: 4px;
  align-self: flex-start;
}

.tool-label-text {
  font-size: 13px;
  font-weight: 500;
}

/* flat 布局面板 */
.flat-panel {
  padding: 12px 0;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.panel-header h4 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
}

.active-status {
  font-size: 12px;
  color: var(--el-color-success);
}

/* 日志面板 */
.search-left {
  display: flex;
  gap: 12px;
}

.log-search-input {
  width: 180px;
}

.pagination-container {
  display: flex;
  margin-top: 16px;
  justify-content: flex-end;
}

/* 接入指南 */
.guide-panel {
  max-width: 720px;
  padding: 12px 0;
}

.guide-section {
  margin-bottom: 30px;
}

.guide-section h3 {
  margin-bottom: 12px;
  font-size: 14px;
  font-weight: 600;
}

.guide-section ol {
  padding-left: 20px;
  font-size: 13px;
  line-height: 1.8;
}

.guide-section ul {
  padding-left: 20px;
}

.copy-box {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-top: 6px;
}

.copy-box code {
  padding: 4px 8px;
  font-family: Menlo, Monaco, monospace;
  background-color: var(--el-fill-color-light);
  border-radius: 4px;
}

.guide-alert {
  margin-top: 12px;
}

.json-pre {
  padding: 12px;
  margin: 8px 0;
  overflow-x: auto;
  font-family: Menlo, Monaco, Consolas, monospace;
  font-size: 11px;
  color: #fff;
  background-color: var(--el-fill-color-darker);
  border-radius: 6px;
}

/* Drawer 样式 */
.drawer-content {
  padding: 0 10px;
}

.drawer-section {
  margin-bottom: 24px;
}

.drawer-section h4 {
  padding-left: 8px;
  margin: 0 0 12px;
  font-size: 13px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  border-left: 3px solid var(--el-color-primary);
}

.simple-info-table {
  width: 100%;
  font-size: 13px;
  border-collapse: collapse;
}

.simple-info-table th, .simple-info-table td {
  padding: 8px 10px;
  text-align: left;
  border-bottom: 1px solid var(--el-border-color-light);
}

.simple-info-table th {
  width: 100px;
  font-weight: 500;
  color: var(--el-text-color-secondary);
}

.simple-info-table td {
  color: var(--el-text-color-primary);
}

.required-star {
  margin-left: 2px;
  color: var(--el-color-danger);
}

.type-text {
  font-size: 11px;
  color: var(--el-text-color-placeholder);
}

.empty-cell {
  color: var(--el-text-color-placeholder);
}

.example-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.example-item {
  padding: 10px;
  background-color: var(--el-fill-color-light);
  border: 1px solid var(--el-border-color-light);
  border-radius: 4px;
}

.example-prompt {
  margin: 0 0 8px;
  font-size: 12px;
}

.empty-case {
  padding: 20px;
  font-size: 12px;
  color: var(--el-text-color-placeholder);
  text-align: center;
}

.log-payload-viewer {
  font-size: 13px;
}

.flat-table {
  width: 100% !important;
  box-sizing: border-box;
}
</style>
