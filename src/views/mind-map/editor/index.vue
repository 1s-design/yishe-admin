<template>
  <div class="mind-map-editor">
    <div class="mind-map-toolbar">
      <div class="mind-map-toolbar__left">
        <el-button :icon="ArrowLeft" @click="handleBack">返回</el-button>
        <span class="mind-map-toolbar__title">{{ mindMapName }}</span>
        <el-tag v-if="autoSaved" type="success" size="small" effect="light">已自动保存</el-tag>
        <el-tag v-if="!autoSaved && hasChanges" type="warning" size="small" effect="light">未保存</el-tag>
        <el-divider direction="vertical" />
        <!-- 节点操作 -->
        <el-button-group size="small">
          <el-button :icon="Plus" @click="handleAddChild" title="添加子节点 (Tab)">子节点</el-button>
          <el-button :icon="Plus" @click="handleAddSibling" title="添加兄弟节点 (Enter)">兄弟节点</el-button>
          <el-button :icon="Delete" @click="handleDeleteNode" title="删除节点 (Delete)">删除</el-button>
        </el-button-group>
        <el-divider direction="vertical" />
        <!-- 编辑操作 -->
        <el-button-group size="small">
          <el-button :icon="Edit" @click="handleEditNode" title="编辑节点 (F2)">编辑</el-button>
          <el-button :icon="RefreshLeft" @click="handleUndo" :disabled="!canUndo" title="撤销 (Ctrl+Z)">撤销</el-button>
          <el-button :icon="RefreshRight" @click="handleRedo" :disabled="!canRedo" title="重做 (Ctrl+Y)">重做</el-button>
        </el-button-group>
        <el-divider direction="vertical" />
        <!-- 节点样式 -->
        <el-dropdown @command="handleColorCommand" trigger="click">
          <el-button size="small" title="节点背景色">
            <span class="color-dot" :style="{ backgroundColor: selectedColor }"></span>
            背景色
          </el-button>
          <template #dropdown>
            <el-dropdown-menu class="color-dropdown">
              <div class="color-grid">
                <div
                  v-for="color in colorOptions"
                  :key="color"
                  class="color-item"
                  :class="{ 'color-item--active': selectedColor === color }"
                  :style="{ backgroundColor: color }"
                  @click="handleSetBackgroundColor(color)"
                ></div>
                <div class="color-item color-item--clear" @click="handleClearBackgroundColor">无</div>
              </div>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
        <el-dropdown @command="handleTextColorCommand" trigger="click">
          <el-button size="small" title="文字颜色">
            <span class="text-icon" :style="{ color: selectedTextColor }">A</span>
            文字色
          </el-button>
          <template #dropdown>
            <el-dropdown-menu class="color-dropdown">
              <div class="color-grid">
                <div
                  v-for="color in textColorOptions"
                  :key="color"
                  class="color-item color-item--text"
                  :class="{ 'color-item--active': selectedTextColor === color }"
                  :style="{ backgroundColor: color }"
                  @click="handleSetTextColor(color)"
                ></div>
              </div>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
        <el-button size="small" @click="handleToggleExpand" title="展开/折叠子节点">
          {{ isExpanded ? '折叠' : '展开' }}
        </el-button>
      </div>
      <div class="mind-map-toolbar__right">
        <!-- 视图操作 -->
        <el-button-group size="small">
          <el-button :icon="ZoomOut" @click="handleZoomOut" title="缩小">缩小</el-button>
          <span class="mind-map-toolbar__zoom">{{ Math.round(zoomLevel * 100) }}%</span>
          <el-button :icon="ZoomIn" @click="handleZoomIn" title="放大">放大</el-button>
          <el-button @click="handleFitView" title="适应画布">适应</el-button>
          <el-button @click="handleToCenter" title="回到中心">居中</el-button>
        </el-button-group>
        <el-divider direction="vertical" />
        <!-- 导出操作 -->
        <el-dropdown @command="handleExportCommand" trigger="click">
          <el-button size="small" :icon="Download">导出</el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="png">导出 PNG</el-dropdown-item>
              <el-dropdown-item command="svg">导出 SVG</el-dropdown-item>
              <el-dropdown-item command="json">导出 JSON</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
        <el-button type="primary" size="small" :loading="saving" @click="handleSave" title="保存 (Ctrl+S)">保存</el-button>
      </div>
    </div>

    <!-- 底部快捷键提示 -->
    <div class="mind-map-keyboard-hints">
      <span><kbd>Tab</kbd> 子节点</span>
      <span><kbd>Enter</kbd> 兄弟节点</span>
      <span><kbd>Delete</kbd> 删除</span>
      <span><kbd>F2</kbd> 编辑</span>
      <span><kbd>Ctrl+Z</kbd> 撤销</span>
      <span><kbd>Ctrl+Y</kbd> 重做</span>
      <span><kbd>Ctrl+S</kbd> 保存</span>
      <span><kbd>空格</kbd> 展开/折叠</span>
    </div>

    <div ref="mindMapContainer" class="mind-map-container"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, nextTick, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ElMessage, ElMessageBox } from "element-plus";
import {
  ArrowLeft,
  RefreshLeft,
  RefreshRight,
  ZoomIn,
  ZoomOut,
  Download,
  Document,
  Plus,
  Delete,
  Edit,
} from "@element-plus/icons-vue";
import MindElixir from "mind-elixir";
import "mind-elixir/style.css";
import type { MindElixirInstance, NodeObj } from "mind-elixir";
import {
  getMindMapDetailApi,
  updateMindMapApi,
  type MindElixirData,
} from "@/api/mind-map";

const route = useRoute();
const router = useRouter();

const mindMapId = ref("");
const mindMapName = ref("");
const mindMapContainer = ref<HTMLDivElement>();
const mindInstance = ref<MindElixirInstance>();

const saving = ref(false);
const autoSaved = ref(true);
const hasChanges = ref(false);
const canUndo = ref(false);
const canRedo = ref(false);
const zoomLevel = ref(1);
const selectedColor = ref("#E3F2FD");
const selectedTextColor = ref("#333333");
const isExpanded = ref(true);

let autoSaveTimer: ReturnType<typeof setInterval> | null = null;
let historyStack: MindElixirData[] = [];
let historyIndex = -1;

const colorOptions = [
  "#E3F2FD", "#FCE4EC", "#F3E5F5", "#E8F5E9", "#FFF3E0", "#FFFDE7",
  "#E0F7FA", "#F1F8E9", "#FBE9E7", "#E8EAF6", "#EFEBE9", "#FAFAFA",
  "#BBDEFB", "#F8BBD0", "#E1BEE7", "#C8E6C9", "#FFE0B2", "#FFF9C4",
  "#B2EBF2", "#DCEDC8", "#FFCCBC", "#C5CAE9", "#D7CCC8", "#F5F5F5",
];

const textColorOptions = [
  "#333333", "#555555", "#777777", "#999999",
  "#1976D2", "#388E3C", "#D32F2F", "#7B1FA2",
  "#F57C00", "#0097A7", "#5D4037", "#455A64",
];

const defaultData: MindElixirData = {
  nodeData: {
    topic: "中心主题",
    id: "root",
    children: [],
  },
  linkData: {},
};

function pushHistory(data: MindElixirData) {
  historyStack = historyStack.slice(0, historyIndex + 1);
  historyStack.push(JSON.parse(JSON.stringify(data)));
  historyIndex = historyStack.length - 1;
  if (historyStack.length > 50) {
    historyStack.shift();
    historyIndex--;
  }
  updateHistoryState();
}

function updateHistoryState() {
  canUndo.value = historyIndex > 0;
  canRedo.value = historyIndex < historyStack.length - 1;
}

function getCurrentData(): MindElixirData {
  if (!mindInstance.value) return defaultData;
  return {
    nodeData: mindInstance.value.nodeData as NodeObj,
    linkData: {},
  };
}

async function loadMindMap() {
  if (!mindMapId.value) return;
  try {
    const res: any = await getMindMapDetailApi(mindMapId.value);
    mindMapName.value = res.name || "未命名";
    const data = res.data || defaultData;
    await nextTick();
    initMindElixir(data);
    pushHistory(data);
  } catch (error) {
    console.error("加载思维导图失败:", error);
    ElMessage.error("加载思维导图失败");
  }
}

function initMindElixir(data: MindElixirData) {
  if (!mindMapContainer.value) return;
  mindMapContainer.value.innerHTML = "";

  mindInstance.value = new MindElixir({
    el: mindMapContainer.value,
    direction: MindElixir.SIDE,
    draggable: true,
    editable: true,
    contextMenu: true,
    toolBar: false,
    keypress: true,
    locale: "zh_CN",
    overflowHidden: false,
    allowUndo: true,
    scaleMin: 0.3,
    scaleMax: 2,
    newTopicName: "新节点",
  });

  mindInstance.value.init(data);

  // 监听变化
  mindInstance.value.bus.addListener("operation", () => {
    hasChanges.value = true;
    autoSaved.value = false;
    const currentData = getCurrentData();
    pushHistory(currentData);
  });

  // 监听节点选择
  mindInstance.value.bus.addListener("selectNode", (node: any) => {
    if (node?.style) {
      selectedColor.value = node.style.background || "#E3F2FD";
      selectedTextColor.value = node.style.color || "#333333";
    }
  });

  // 居中显示
  nextTick(() => {
    mindInstance.value?.toCenter();
  });
}

async function handleSave() {
  if (!mindInstance.value) return;
  saving.value = true;
  try {
    const data = getCurrentData();
    await updateMindMapApi({
      id: mindMapId.value,
      name: mindMapName.value,
      data,
    });
    hasChanges.value = false;
    autoSaved.value = true;
    ElMessage.success("保存成功");
  } catch (error) {
    console.error("保存失败:", error);
    ElMessage.error("保存失败");
  } finally {
    saving.value = false;
  }
}

function handleBack() {
  const doBack = () => router.push("/mind-map");
  if (hasChanges.value) {
    ElMessageBox.confirm("有未保存的更改，确定要离开吗？", "提示", {
      confirmButtonText: "离开",
      cancelButtonText: "取消",
      type: "warning",
    }).then(doBack).catch(() => {});
  } else {
    doBack();
  }
}

function handleUndo() {
  if (!canUndo.value || !mindInstance.value) return;
  historyIndex--;
  const data = historyStack[historyIndex];
  mindInstance.value.refresh(data);
  updateHistoryState();
  hasChanges.value = true;
}

function handleRedo() {
  if (!canRedo.value || !mindInstance.value) return;
  historyIndex++;
  const data = historyStack[historyIndex];
  mindInstance.value.refresh(data);
  updateHistoryState();
  hasChanges.value = true;
}

function handleAddChild() {
  if (!mindInstance.value) return;
  if (!mindInstance.value.currentNode) {
    ElMessage.warning("请先选择一个节点");
    return;
  }
  mindInstance.value.addChild();
}

function handleAddSibling() {
  if (!mindInstance.value) return;
  if (!mindInstance.value.currentNode) {
    ElMessage.warning("请先选择一个节点");
    return;
  }
  mindInstance.value.addSibling();
}

function handleDeleteNode() {
  if (!mindInstance.value) return;
  const selected = mindInstance.value.currentNode;
  if (!selected) {
    ElMessage.warning("请先选择一个节点");
    return;
  }
  if ((selected as any)?.parent === null) {
    ElMessage.warning("不能删除根节点");
    return;
  }
  mindInstance.value.removeNode();
}

function handleEditNode() {
  if (!mindInstance.value) return;
  const selected = mindInstance.value.currentNode;
  if (!selected) {
    ElMessage.warning("请先选择一个节点");
    return;
  }
  mindInstance.value.beginEdit(selected);
}

function handleSetBackgroundColor(color: string) {
  if (!mindInstance.value) return;
  const selected = mindInstance.value.currentNode as any;
  if (!selected) {
    ElMessage.warning("请先选择一个节点");
    return;
  }
  selected.style = { ...(selected.style || {}), background: color };
  mindInstance.value.reshapeNode(selected, { style: selected.style });
  selectedColor.value = color;
  hasChanges.value = true;
}

function handleClearBackgroundColor() {
  if (!mindInstance.value) return;
  const selected = mindInstance.value.currentNode as any;
  if (!selected) {
    ElMessage.warning("请先选择一个节点");
    return;
  }
  selected.style = { ...(selected.style || {}) };
  delete selected.style.background;
  mindInstance.value.reshapeNode(selected, { style: selected.style });
  selectedColor.value = "#E3F2FD";
  hasChanges.value = true;
}

function handleSetTextColor(color: string) {
  if (!mindInstance.value) return;
  const selected = mindInstance.value.currentNode as any;
  if (!selected) {
    ElMessage.warning("请先选择一个节点");
    return;
  }
  selected.style = { ...(selected.style || {}), color: color };
  mindInstance.value.reshapeNode(selected, { style: selected.style });
  selectedTextColor.value = color;
  hasChanges.value = true;
}

function handleToggleExpand() {
  if (!mindInstance.value) return;
  const selected = mindInstance.value.currentNode;
  if (!selected) {
    // 切换所有根节点的子节点
    isExpanded.value = !isExpanded.value;
    const data = getCurrentData();
    const toggleExpand = (node: any, expand: boolean) => {
      if (node.children) {
        node.children.forEach((child: any) => {
          child.expanded = expand;
          toggleExpand(child, expand);
        });
      }
    };
    if (data.nodeData.children) {
      data.nodeData.children.forEach((child: any) => {
        child.expanded = isExpanded.value;
        toggleExpand(child, isExpanded.value);
      });
    }
    mindInstance.value.refresh(data);
    hasChanges.value = true;
  } else {
    isExpanded.value = !isExpanded.value;
    mindInstance.value.expandNode(selected, isExpanded.value);
  }
}

function handleZoomIn() {
  if (!mindInstance.value) return;
  zoomLevel.value = Math.min(zoomLevel.value + 0.1, 2);
  mindInstance.value.scale(zoomLevel.value);
}

function handleZoomOut() {
  if (!mindInstance.value) return;
  zoomLevel.value = Math.max(zoomLevel.value - 0.1, 0.3);
  mindInstance.value.scale(zoomLevel.value);
}

function handleFitView() {
  if (!mindInstance.value) return;
  zoomLevel.value = 1;
  mindInstance.value.scaleFit();
}

function handleToCenter() {
  if (!mindInstance.value) return;
  mindInstance.value.toCenter();
}

async function handleExportPNG() {
  if (!mindInstance.value) return;
  try {
    const blob = await mindInstance.value.exportPng();
    if (blob) {
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${mindMapName.value}.png`;
      link.click();
      URL.revokeObjectURL(url);
      ElMessage.success("导出成功");
    }
  } catch (error) {
    console.error("导出PNG失败:", error);
    ElMessage.error("导出PNG失败");
  }
}

function handleExportSVG() {
  if (!mindInstance.value) return;
  try {
    const svg = mindInstance.value.exportSvg();
    const blob = new Blob([svg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${mindMapName.value}.svg`;
    link.click();
    URL.revokeObjectURL(url);
    ElMessage.success("导出成功");
  } catch (error) {
    console.error("导出SVG失败:", error);
    ElMessage.error("导出SVG失败");
  }
}

function handleExportJSON() {
  if (!mindInstance.value) return;
  const data = getCurrentData();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${mindMapName.value}.json`;
  link.click();
  URL.revokeObjectURL(url);
  ElMessage.success("导出成功");
}

function handleExportCommand(command: string) {
  switch (command) {
    case "png":
      void handleExportPNG();
      break;
    case "svg":
      handleExportSVG();
      break;
    case "json":
      handleExportJSON();
      break;
  }
}

function handleColorCommand() {}
function handleTextColorCommand() {}

onMounted(() => {
  mindMapId.value = route.params.id as string;
  if (mindMapId.value) {
    void loadMindMap();
  }
  // 自动保存定时器
  autoSaveTimer = setInterval(() => {
    if (hasChanges.value && mindMapId.value) {
      void handleSave();
    }
  }, 30000);
});

onBeforeUnmount(() => {
  if (autoSaveTimer) {
    clearInterval(autoSaveTimer);
    autoSaveTimer = null;
  }
  if (hasChanges.value && mindInstance.value) {
    void handleSave();
  }
  mindInstance.value?.destroy();
});
</script>

<style scoped>
.mind-map-editor {
  display: flex;
  flex-direction: column;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100%;
  background: #fff;
  z-index: 100;
}

.mind-map-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 16px;
  border-bottom: 1px solid var(--el-border-color-lighter);
  background: var(--el-bg-color);
  z-index: 10;
  flex-shrink: 0;
  gap: 6px;
}

.mind-map-toolbar :deep(.el-button) {
  padding: 4px 8px;
  font-size: 12px;
}

.mind-map-toolbar :deep(.el-button--small) {
  padding: 4px 8px;
  font-size: 12px;
}

.mind-map-toolbar :deep(.el-button-group .el-button) {
  padding: 4px 8px;
}

.mind-map-toolbar__left {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.mind-map-toolbar__right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.mind-map-toolbar__title {
  font-size: 16px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.mind-map-toolbar__zoom {
  font-size: 13px;
  color: var(--el-text-color-regular);
  min-width: 40px;
  text-align: center;
}

.mind-map-keyboard-hints {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 4px 16px;
  background: var(--el-fill-color-light);
  border-bottom: 1px solid var(--el-border-color-lighter);
  font-size: 12px;
  color: var(--el-text-color-secondary);
  flex-shrink: 0;
}

.mind-map-keyboard-hints kbd {
  display: inline-block;
  padding: 1px 4px;
  font-size: 11px;
  font-family: monospace;
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color);
  border-radius: 3px;
  margin-right: 4px;
}

.mind-map-container {
  flex: 1;
  overflow: hidden;
  position: relative;
  background: #fafafa;
}

.color-dot {
  display: inline-block;
  width: 12px;
  height: 12px;
  border-radius: 2px;
  border: 1px solid var(--el-border-color);
}

.text-icon {
  font-weight: bold;
  font-size: 14px;
}

.color-dropdown {
  padding: 8px;
}

.color-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 4px;
}

.color-item {
  width: 28px;
  height: 28px;
  border-radius: 4px;
  cursor: pointer;
  border: 2px solid transparent;
  transition: border-color 0.2s;
}

.color-item:hover {
  border-color: var(--el-color-primary);
}

.color-item--active {
  border-color: var(--el-color-primary);
  box-shadow: 0 0 0 1px var(--el-color-primary);
}

.color-item--clear {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  color: var(--el-text-color-secondary);
  background: var(--el-bg-color);
  border: 1px dashed var(--el-border-color);
}

.color-item--text {
  border: 1px solid var(--el-border-color);
}
</style>
