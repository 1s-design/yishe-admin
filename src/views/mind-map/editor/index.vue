<template>
  <div class="mind-map-editor">
    <div class="mind-map-toolbar">
      <div class="mind-map-toolbar__left">
        <el-button :icon="ArrowLeft" @click="handleBack">返回</el-button>
        <span class="mind-map-toolbar__title">{{ mindMapName }}</span>
        <el-tag v-if="autoSaved" type="success" size="small" effect="light">已自动保存</el-tag>
        <el-tag v-if="!autoSaved && hasChanges" type="warning" size="small" effect="light">未保存</el-tag>
      </div>
      <div class="mind-map-toolbar__right">
        <el-button :icon="Plus" @click="handleAddChild" title="添加子节点 (Tab)">子节点</el-button>
        <el-button :icon="Plus" @click="handleAddSibling" title="添加兄弟节点 (Enter)">兄弟节点</el-button>
        <el-button :icon="Delete" @click="handleDeleteNode" title="删除节点 (Delete)">删除</el-button>
        <el-divider direction="vertical" />
        <el-button :icon="RefreshLeft" @click="handleUndo" :disabled="!canUndo">撤销</el-button>
        <el-button :icon="RefreshRight" @click="handleRedo" :disabled="!canRedo">重做</el-button>
        <el-divider direction="vertical" />
        <el-button :icon="ZoomOut" @click="handleZoomOut">缩小</el-button>
        <span class="mind-map-toolbar__zoom">{{ Math.round(zoomLevel * 100) }}%</span>
        <el-button :icon="ZoomIn" @click="handleZoomIn">放大</el-button>
        <el-button @click="handleFitView">适应画布</el-button>
        <el-divider direction="vertical" />
        <el-button :icon="Download" @click="handleExportPNG">导出 PNG</el-button>
        <el-button :icon="Document" @click="handleExportJSON">导出 JSON</el-button>
        <el-divider direction="vertical" />
        <el-button type="primary" :loading="saving" @click="handleSave">保存</el-button>
      </div>
    </div>
    <div ref="mindMapContainer" class="mind-map-container"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, nextTick } from "vue";
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

let autoSaveTimer: ReturnType<typeof setInterval> | null = null;
let historyStack: MindElixirData[] = [];
let historyIndex = -1;

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
  // 清空容器
  mindMapContainer.value.innerHTML = "";

  mindInstance.value = new MindElixir({
    el: mindMapContainer.value,
    direction: MindElixir.SIDE,
    draggable: true,
    contextMenu: true,
    toolBar: false,
    keypress: true,
    locale: "zh_CN",
    overflowHidden: false,
  });

  mindInstance.value.init(data);

  // 监听变化
  mindInstance.value.bus.addListener("operation", () => {
    hasChanges.value = true;
    autoSaved.value = false;
    const currentData = getCurrentData();
    pushHistory(currentData);
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
  if (hasChanges.value) {
    ElMessageBox.confirm("有未保存的更改，确定要离开吗？", "提示", {
      confirmButtonText: "离开",
      cancelButtonText: "取消",
      type: "warning",
    })
      .then(() => {
        router.push("/mind-map");
      })
      .catch(() => {});
  } else {
    router.push("/mind-map");
  }
}

function handleUndo() {
  if (!canUndo.value || !mindInstance.value) return;
  historyIndex--;
  const data = historyStack[historyIndex];
  mindInstance.value.refresh(data);
  updateHistoryState();
}

function handleRedo() {
  if (!canRedo.value || !mindInstance.value) return;
  historyIndex++;
  const data = historyStack[historyIndex];
  mindInstance.value.refresh(data);
  updateHistoryState();
}

function handleZoomIn() {
  if (!mindInstance.value) return;
  zoomLevel.value = Math.min(zoomLevel.value + 0.1, 2);
  mindInstance.value.container.style.transform = `scale(${zoomLevel.value})`;
}

function handleZoomOut() {
  if (!mindInstance.value) return;
  zoomLevel.value = Math.max(zoomLevel.value - 0.1, 0.3);
  mindInstance.value.container.style.transform = `scale(${zoomLevel.value})`;
}

function handleFitView() {
  if (!mindInstance.value) return;
  zoomLevel.value = 1;
  mindInstance.value.container.style.transform = "scale(1)";
}

function handleAddChild() {
  if (!mindInstance.value) return;
  const selected = mindInstance.value.currentNode;
  if (!selected) {
    ElMessage.warning("请先选择一个节点");
    return;
  }
  mindInstance.value.addChild();
}

function handleAddSibling() {
  if (!mindInstance.value) return;
  const selected = mindInstance.value.currentNode;
  if (!selected) {
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
  // 不能删除根节点
  const nodeObj = selected as any;
  if (nodeObj?.parent === null) {
    ElMessage.warning("不能删除根节点");
    return;
  }
  mindInstance.value.removeNode();
}

function handleExportPNG() {
  if (!mindInstance.value) return;
  // mind-elixir-core 支持导出 PNG
  const link = document.createElement("a");
  link.download = `${mindMapName.value}.png`;
  // 使用 mind-elixir 的导出功能
  ElMessage.info("导出功能需要后端支持，敬请期待");
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
  // 离开前保存
  if (hasChanges.value && mindInstance.value) {
    void handleSave();
  }
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
  padding: 8px 16px;
  border-bottom: 1px solid var(--el-border-color-lighter);
  background: var(--el-bg-color);
  z-index: 10;
}

.mind-map-toolbar__left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.mind-map-toolbar__title {
  font-size: 16px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.mind-map-toolbar__right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.mind-map-toolbar__zoom {
  font-size: 13px;
  color: var(--el-text-color-regular);
  min-width: 40px;
  text-align: center;
}

.mind-map-container {
  flex: 1;
  overflow: hidden;
  position: relative;
}
</style>
