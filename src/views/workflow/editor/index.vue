<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch, markRaw } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ElMessage, ElMessageBox, ElNotification } from "element-plus";
import { ArrowLeft, EditPen, Reading } from "@element-plus/icons-vue";
import {
  VueFlow,
  useVueFlow,
  type Node,
  type Edge,
  type Connection,
  type NodeMouseEvent,
  type EdgeMouseEvent,
} from "@vue-flow/core";
import { Background } from "@vue-flow/background";
import { Controls } from "@vue-flow/controls";
import { MiniMap } from "@vue-flow/minimap";
import { useAppStore } from "@/store/modules/app";
import { useI18n } from "vue-i18n";
import { getWorkflowDetailApi, updateWorkflowApi, runWorkflowApi, resetWorkflowApi } from "@/api/workflow";
import { useWorkflowHistory } from "@/composables/useWorkflowHistory";
import { useSmartSave } from "@/composables/useSmartSave";

// 自定义节点
import StartNode from "@/components/workflow/nodes/StartNode.vue";
import DefaultNode from "@/components/workflow/nodes/DefaultNode.vue";
import EndNode from "@/components/workflow/nodes/EndNode.vue";
import ConditionNode from "@/components/workflow/nodes/ConditionNode.vue";
import SwitchNode from "@/components/workflow/nodes/SwitchNode.vue";
import LoopNode from "@/components/workflow/nodes/LoopNode.vue";
import WhileNode from "@/components/workflow/nodes/WhileNode.vue";
import JsCodeNode from "@/components/workflow/nodes/JsCodeNode.vue";
import AiCallNode from "@/components/workflow/nodes/AiCallNode.vue";
import LLMNode from "@/components/workflow/nodes/LLMNode.vue";
import HttpNode from "@/components/workflow/nodes/HttpNode.vue";
import CodeNode from "@/components/workflow/nodes/CodeNode.vue";
import MessagePushNode from "@/components/workflow/nodes/MessagePushNode.vue";
import HotsearchNode from "@/components/workflow/nodes/HotsearchNode.vue";
import FeishuNode from "@/components/workflow/nodes/FeishuNode.vue";
import WecomNode from "@/components/workflow/nodes/WecomNode.vue";
import GoogleArtsCultureNode from "@/components/workflow/nodes/GoogleArtsCultureNode.vue";
import PinterestNode from "@/components/workflow/nodes/PinterestNode.vue";
import WikimediaNode from "@/components/workflow/nodes/WikimediaNode.vue";
import PexelsNode from "@/components/workflow/nodes/PexelsNode.vue";
import PixabayNode from "@/components/workflow/nodes/PixabayNode.vue";
import RawpixelNode from "@/components/workflow/nodes/RawpixelNode.vue";
import DouyinJingxuanNode from "@/components/workflow/nodes/DouyinJingxuanNode.vue";
import StockSnapNode from "@/components/workflow/nodes/StockSnapNode.vue";
import OpenverseNode from "@/components/workflow/nodes/OpenverseNode.vue";
import OpenClipartNode from "@/components/workflow/nodes/OpenClipartNode.vue";
import UndrawNode from "@/components/workflow/nodes/UndrawNode.vue";
import IconifyNode from "@/components/workflow/nodes/IconifyNode.vue";
import NounProjectNode from "@/components/workflow/nodes/NounProjectNode.vue";
import VecteezyNode from "@/components/workflow/nodes/VecteezyNode.vue";
import OpenmeteoNode from "@/components/workflow/nodes/OpenmeteoNode.vue";
import WttrNode from "@/components/workflow/nodes/WttrNode.vue";
import CoingeckoNode from "@/components/workflow/nodes/CoingeckoNode.vue";
import FrankfurterNode from "@/components/workflow/nodes/FrankfurterNode.vue";
import DictionaryNode from "@/components/workflow/nodes/DictionaryNode.vue";
import JokeNode from "@/components/workflow/nodes/JokeNode.vue";
import IpifyNode from "@/components/workflow/nodes/IpifyNode.vue";
import SunrisesunsetNode from "@/components/workflow/nodes/SunrisesunsetNode.vue";
import TimeapiNode from "@/components/workflow/nodes/TimeapiNode.vue";
import ZippopotamNode from "@/components/workflow/nodes/ZippopotamNode.vue";
import CountryisNode from "@/components/workflow/nodes/CountryisNode.vue";
import ErapiNode from "@/components/workflow/nodes/ErapiNode.vue";
import FawazahmedNode from "@/components/workflow/nodes/FawazahmedNode.vue";
import ColorapiNode from "@/components/workflow/nodes/ColorapiNode.vue";
import ShopifyNode from "@/components/workflow/nodes/ShopifyNode.vue";
import OpenMojiNode from "@/components/workflow/nodes/OpenMojiNode.vue";
import GoogleIconsNode from "@/components/workflow/nodes/GoogleIconsNode.vue";
import EmojipediaNode from "@/components/workflow/nodes/EmojipediaNode.vue";
import HackernewsNode from "@/components/workflow/nodes/HackernewsNode.vue";
import ArxivNode from "@/components/workflow/nodes/ArxivNode.vue";
import GithubNode from "@/components/workflow/nodes/GithubNode.vue";
import GdeltNode from "@/components/workflow/nodes/GdeltNode.vue";
import GooglenewsNode from "@/components/workflow/nodes/GooglenewsNode.vue";
import RedditNode from "@/components/workflow/nodes/RedditNode.vue";
import ProducthuntNode from "@/components/workflow/nodes/ProducthuntNode.vue";
import TheguardianNode from "@/components/workflow/nodes/TheguardianNode.vue";
import BbcnewsNode from "@/components/workflow/nodes/BbcnewsNode.vue";
import NprNode from "@/components/workflow/nodes/NprNode.vue";
import TechcrunchNode from "@/components/workflow/nodes/TechcrunchNode.vue";
import ThevergeNode from "@/components/workflow/nodes/ThevergeNode.vue";
import ArstechnicaNode from "@/components/workflow/nodes/ArstechnicaNode.vue";
import MittechreviewNode from "@/components/workflow/nodes/MittechreviewNode.vue";
import ReutersNode from "@/components/workflow/nodes/ReutersNode.vue";
import ChinadailyNode from "@/components/workflow/nodes/ChinadailyNode.vue";
import GovcnNode from "@/components/workflow/nodes/GovcnNode.vue";
import XinhuanetNode from "@/components/workflow/nodes/XinhuanetNode.vue";
import ThepaperNode from "@/components/workflow/nodes/ThepaperNode.vue";
import ThirtySixKrNewsNode from "@/components/workflow/nodes/ThirtySixKrNewsNode.vue";
import HuxiuNode from "@/components/workflow/nodes/HuxiuNode.vue";
import SvgrepoNode from "@/components/workflow/nodes/SvgrepoNode.vue";
import KaboompicsNode from "@/components/workflow/nodes/KaboompicsNode.vue";
import ImageEngineNode from "@/components/workflow/nodes/ImageEngineNode.vue";

import NodePanel from "@/components/workflow/NodePanel.vue";
import ConfigPanel from "@/components/workflow/ConfigPanel.vue";
import NodePickerDialog from "@/components/workflow/NodePickerDialog.vue";
import TriggerConfigDialog from "@/components/workflow/TriggerConfigDialog.vue";
import ShortcutGuide from "@/components/workflow/ShortcutGuide.vue";
import { useWorkflowAiContext } from "@/composables/useWorkflowAiContext";
import { websocketClient } from "@/services/websocketClient";
import AssistantChat from "@/components/AiAssistant/AssistantChat.vue";
import { useAiAssistantStore } from "@/store/modules/aiAssistant";
import { NODE_MANIFEST_REGISTRY, type NodeManifest } from "./config/node-manifest";
import { createWorkflowVariableKey, getWorkflowVariableKey } from "./config/workflowVariableKey";
import { useUserStore } from "@/store/modules/user";
import { publishWorkflowToLibraryApi } from "@/api/workflow";

const appStore = useAppStore();
const userStore = useUserStore();
const isAdmin = computed(() => userStore.user?.isAdmin === true);
const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const workflowId = computed(() => route.params.id as string);

const patternColor = computed(() =>
  appStore.getIsDark ? "rgba(255, 255, 255, 0.15)" : "rgba(148, 163, 184, 0.4)",
);

// VueFlow 实例
const {
  nodes,
  edges,
  addNodes,
  addEdges,
  removeNodes,
  removeEdges,
  setNodes,
  setEdges,
  setViewport,
  getViewport,
  onConnect,
  onEdgeUpdate,
  project,
  findNode,
  updateNodeData,
  updateEdge,
} = useVueFlow();

// 状态
const workflow = ref<any>(null);
const loading = ref(true);
const selectedNode = ref<Node | null>(null);
const selectedEdge = ref<Edge | null>(null);
const canvasRef = ref<HTMLDivElement | null>(null);

const triggerDialogVisible = ref(false);
const shortcutGuideVisible = ref(false);
const nodePickerVisible = ref(false);

const handleOpenNodePicker = () => {
  nodePickerVisible.value = true;
};

const runningWorkflow = ref(false);
const { setWorkflowContext } = useWorkflowAiContext();
const aiStore = useAiAssistantStore();
const aiPanelVisible = ref(false);

const handleToggleAiPanel = async () => {
  // 只有在没有当前会话时才创建新会话
  if (!aiPanelVisible.value && !aiStore.currentConversationId) {
    await aiStore.createConversation();
  }
  aiPanelVisible.value = !aiPanelVisible.value;
};

// 同步工作流上下文给 AI 助手
watch(
  () => ({
    workflowId: workflowId.value,
    name: workflow.value?.name,
    nodes: nodes.value,
    edges: edges.value,
  }),
  (val) => {
    if (val.workflowId) {
      setWorkflowContext({
        workflowId: val.workflowId,
        workflowName: val.name,
        canvas: { nodes: val.nodes, edges: val.edges },
      });
    }
  },
  { deep: true },
);
const handleRunWorkflow = async () => {
  if (!workflowId.value) return;
  runningWorkflow.value = true;
  try {
    const res: any = await runWorkflowApi(workflowId.value);
    ElNotification({
      title: t("workflow.triggerSuccess"),
      message: `${t("workflow.runRecordId", { id: res?.executionId || "OK", duration: res?.durationMs || 0 })}`,
      type: "success",
      duration: 3000,
    });
  } catch (err: any) {
    ElMessage.error(err.message || t("workflow.triggerFailed"));
  } finally {
    runningWorkflow.value = false;
  }
};

const resettingWorkflow = ref(false);
const handleForceResetWorkflow = async () => {
  if (!workflowId.value) return;
  try {
    await ElMessageBox.confirm(
      "确定强制终止所有正在运行/排队的执行任务，并重置工作流状态吗？",
      "强制终止与重置",
      {
        confirmButtonText: "强制重置",
        cancelButtonText: "取消",
        type: "warning",
        confirmButtonClass: "el-button--danger",
      },
    );
  } catch {
    return;
  }

  resettingWorkflow.value = true;
  try {
    const res: any = await resetWorkflowApi(workflowId.value);
    runningWorkflow.value = false;
    ElMessage.success(res?.message || "工作流状态已强制重置");
  } catch (err: any) {
    ElMessage.error(err?.message || "重置工作流状态失败");
  } finally {
    resettingWorkflow.value = false;
    runningWorkflow.value = false;
  }
};

// 连线类型与配置
const edgeType = ref<"default" | "smoothstep" | "straight">("default");

// 自定义节点类型映射 (使用 markRaw 避免 Vue 响应式代理警告)
const nodeTypes = {
  start: markRaw(StartNode),
  default: markRaw(DefaultNode),
  end: markRaw(EndNode),
  condition: markRaw(ConditionNode),
  switch: markRaw(SwitchNode),
  loop: markRaw(LoopNode),
  while_loop: markRaw(WhileNode),
  js_code: markRaw(JsCodeNode),
  ai_call: markRaw(AiCallNode),
  llm: markRaw(LLMNode),
  http: markRaw(HttpNode),
  code: markRaw(CodeNode),
  message_push: markRaw(MessagePushNode),
  // 所有国内热搜平台使用通用 HotsearchNode
  hotsearch_weibo: markRaw(HotsearchNode),
  hotsearch_douyin: markRaw(HotsearchNode),
  hotsearch_bilibili: markRaw(HotsearchNode),
  hotsearch_zhihu: markRaw(HotsearchNode),
  hotsearch_toutiao: markRaw(HotsearchNode),
  hotsearch_douban: markRaw(HotsearchNode),
  hotsearch_kuaishou: markRaw(HotsearchNode),
  hotsearch_v2ex: markRaw(HotsearchNode),
  hotsearch_36kr: markRaw(HotsearchNode),
  hotsearch_ithome: markRaw(HotsearchNode),
  hotsearch_google_trends: markRaw(HotsearchNode),
  hotsearch_hackernews: markRaw(HotsearchNode),
  hotsearch_github: markRaw(HotsearchNode),
  hotsearch_wikipedia: markRaw(HotsearchNode),
  hotsearch_bbc_news: markRaw(HotsearchNode),
  hotsearch_cnn: markRaw(HotsearchNode),
  hotsearch_nytimes: markRaw(HotsearchNode),
  hotsearch_aljazeera: markRaw(HotsearchNode),
  hotsearch_devto: markRaw(HotsearchNode),
  hotsearch_ebay_trending: markRaw(HotsearchNode),
  hotsearch_shopify_trending: markRaw(HotsearchNode),
  hotsearch_xiaohongshu: markRaw(HotsearchNode),
  xiaohongshu_note_detail: markRaw(HotsearchNode),
  hupu_post_search: markRaw(HotsearchNode),
  message_push_feishu: markRaw(FeishuNode),
  message_push_wecom: markRaw(WecomNode),
  google_arts_culture: markRaw(GoogleArtsCultureNode),
  pinterest_culture: markRaw(PinterestNode),
  wikimedia_culture: markRaw(WikimediaNode),
  pexels_search: markRaw(PexelsNode),
  pixabay_search: markRaw(PixabayNode),
  rawpixel_search: markRaw(RawpixelNode),
  douyin_jingxuan_search: markRaw(DouyinJingxuanNode),
  stocksnap_search: markRaw(StockSnapNode),
  openverse_search: markRaw(OpenverseNode),
  openclipart_search: markRaw(OpenClipartNode),
  undraw_search: markRaw(UndrawNode),
  iconify_search: markRaw(IconifyNode),
  nounproject_search: markRaw(NounProjectNode),
  vecteezy_search: markRaw(VecteezyNode),
  openmeteo_search: markRaw(OpenmeteoNode),
  wttr_search: markRaw(WttrNode),
  coingecko_search: markRaw(CoingeckoNode),
  frankfurter_search: markRaw(FrankfurterNode),
  dictionary_search: markRaw(DictionaryNode),
  joke_search: markRaw(JokeNode),
  ipify_search: markRaw(IpifyNode),
  sunrisesunset_search: markRaw(SunrisesunsetNode),
  timeapi_search: markRaw(TimeapiNode),
  zippopotam_search: markRaw(ZippopotamNode),
  countryis_search: markRaw(CountryisNode),
  erapi_search: markRaw(ErapiNode),
  fawazahmed_search: markRaw(FawazahmedNode),
  colorapi_search: markRaw(ColorapiNode),
  shopify_search: markRaw(ShopifyNode),
  openmoji_search: markRaw(OpenMojiNode),
  googleicons_search: markRaw(GoogleIconsNode),
  emojipedia_search: markRaw(EmojipediaNode),
  hackernews_search: markRaw(HackernewsNode),
  arxiv_search: markRaw(ArxivNode),
  github_search: markRaw(GithubNode),
  gdelt_search: markRaw(GdeltNode),
  googlenews_search: markRaw(GooglenewsNode),
  reddit_search: markRaw(RedditNode),
  producthunt_search: markRaw(ProducthuntNode),
  theguardian_search: markRaw(TheguardianNode),
  bbcnews_search: markRaw(BbcnewsNode),
  npr_search: markRaw(NprNode),
  techcrunch_search: markRaw(TechcrunchNode),
  theverge_search: markRaw(ThevergeNode),
  arstechnica_search: markRaw(ArstechnicaNode),
  mittechreview_search: markRaw(MittechreviewNode),
  reuters_search: markRaw(ReutersNode),
  chinadaily_search: markRaw(ChinadailyNode),
  govcn_search: markRaw(GovcnNode),
  xinhuanet_search: markRaw(XinhuanetNode),
  thepaper_search: markRaw(ThepaperNode),
  "36kr_search": markRaw(ThirtySixKrNewsNode),
  huxiu_search: markRaw(HuxiuNode),
  svgrepo_search: markRaw(SvgrepoNode),
  kaboompics_search: markRaw(KaboompicsNode),
  // 图片搜索引擎节点使用统一组件
  baidu_search: markRaw(ImageEngineNode),
  bing_search: markRaw(ImageEngineNode),
  duckduckgo_search: markRaw(ImageEngineNode),
  sogou_search: markRaw(ImageEngineNode),
  so_search: markRaw(ImageEngineNode),
  wallhaven_search: markRaw(ImageEngineNode),
  unsplash_search: markRaw(ImageEngineNode),
  flickr_search: markRaw(ImageEngineNode),
  googleimages_search: markRaw(ImageEngineNode),
  yandex_search: markRaw(ImageEngineNode),
  // Legacy RSS/新闻/娱乐/体育/招聘/金融/天气节点使用统一组件
  techcrunchrss_search: markRaw(ImageEngineNode),
  arstechnicarss_search: markRaw(ImageEngineNode),
  thevergerss_search: markRaw(ImageEngineNode),
  wired_search: markRaw(ImageEngineNode),
  mittechreviewrss_search: markRaw(ImageEngineNode),
  engadget_search: markRaw(ImageEngineNode),
  bbctechnology_search: markRaw(ImageEngineNode),
  guardiantechnology_search: markRaw(ImageEngineNode),
  time_search: markRaw(ImageEngineNode),
  apnews_search: markRaw(ImageEngineNode),
  nprtechnology_search: markRaw(ImageEngineNode),
  sciencedaily_search: markRaw(ImageEngineNode),
  physorg_search: markRaw(ImageEngineNode),
  quantamagazine_search: markRaw(ImageEngineNode),
  spacecom_search: markRaw(ImageEngineNode),
  nature_search: markRaw(ImageEngineNode),
  scienceaaas_search: markRaw(ImageEngineNode),
  jiqizhixin_search: markRaw(ImageEngineNode),
  sspai_search: markRaw(ImageEngineNode),
  variety_search: markRaw(ImageEngineNode),
  hollywood_reporter_search: markRaw(ImageEngineNode),
  deadline_search: markRaw(ImageEngineNode),
  billboard_search: markRaw(ImageEngineNode),
  tmz_search: markRaw(ImageEngineNode),
  ign_search: markRaw(ImageEngineNode),
  polygon_search: markRaw(ImageEngineNode),
  douban_movie_search: markRaw(ImageEngineNode),
  douban_book_search: markRaw(ImageEngineNode),
  douban_gallery_search: markRaw(ImageEngineNode),
  medrxiv_search: markRaw(ImageEngineNode),
  stats_gov_search: markRaw(ImageEngineNode),
  sse_search: markRaw(ImageEngineNode),
  chinamoney_search: markRaw(ImageEngineNode),
  worldometers_search: markRaw(ImageEngineNode),
  ourworldindata_search: markRaw(ImageEngineNode),
  lagou_search: markRaw(ImageEngineNode),
  zhipin_search: markRaw(ImageEngineNode),
  "51job_search": markRaw(ImageEngineNode),
  linkedin_jobs_search: markRaw(ImageEngineNode),
  yahoo_finance_search: markRaw(ImageEngineNode),
  sina_finance_search: markRaw(ImageEngineNode),
  eastmoney_search: markRaw(ImageEngineNode),
  cls_telegraph_search: markRaw(ImageEngineNode),
  coinmarketcap_search: markRaw(ImageEngineNode),
  zhibo8_search: markRaw(ImageEngineNode),
  bbc_sport_search: markRaw(ImageEngineNode),
  flashscore_search: markRaw(ImageEngineNode),
  weather_cn_search: markRaw(ImageEngineNode),
  weather_com_search: markRaw(ImageEngineNode),
};

// 自动为 manifest 中属于 hotsearch 分类或前缀匹配的节点补充 HotsearchNode 映射（防漏配通用保障）
NODE_MANIFEST_REGISTRY.forEach((item) => {
  if (!(nodeTypes as any)[item.type]) {
    if (
      item.category === "hotsearch" ||
      item.type.startsWith("hotsearch_") ||
      item.type.startsWith("hupu_")
    ) {
      (nodeTypes as any)[item.type] = markRaw(HotsearchNode);
    }
  }
});

// ─── 撤销/重做历史 ─────────────────────────────────────────────
const { undo, redo, pushHistory, canUndo, canRedo } = useWorkflowHistory(
  nodes,
  edges,
  setNodes,
  setEdges,
);

// ─── 智能保存 ─────────────────────────────────────────────────
const saveCanvasFn = async (canvas: { nodes: any[]; edges: any[]; viewport: any }) => {
  await updateWorkflowApi({
    id: workflowId.value,
    canvas,
  });
};

const {
  saveStatus,
  saveNow: smartSaveNow,
  triggerSave,
  cancelSave,
} = useSmartSave(nodes, edges, getViewport, saveCanvasFn, { debounceMs: 2000, maxRetries: 3 });

// ─── 复制/粘贴节点 ───────────────────────────────────────────
const copiedNode = ref<Node | null>(null);

// ─── 快捷点击添加能力节点 ──────────────────────────────────────
const handleAddNodeFromLibrary = (capability: NodeManifest) => {
  pushHistory();
  const mappedType = nodeTypes[capability.type as keyof typeof nodeTypes]
    ? capability.type
    : "default";

  // 计算当前视口中心点，使节点出现在用户可见区域
  const canvasEl = canvasRef.value;
  let centerPos = { x: 280, y: 160 };
  if (canvasEl) {
    const rect = canvasEl.getBoundingClientRect();
    const vp = getViewport();
    centerPos = {
      x: (rect.width / 2 - vp.x) / vp.zoom,
      y: (rect.height / 2 - vp.y) / vp.zoom,
    };
  }

  // 热搜平台节点：从类型或分类中提取 platform 字段传递给 UI 组件
  const isHotsearch =
    capability.category === "hotsearch" ||
    capability.type.startsWith("hotsearch_") ||
    capability.type.startsWith("hupu_");
  const platformKey = isHotsearch
    ? capability.type.startsWith("hupu_")
      ? "hupu"
      : capability.type.replace("hotsearch_", "")
    : undefined;

  const newNode: Node = {
    id: `${capability.type}_${Date.now().toString(36)}`,
    type: mappedType,
    position: centerPos,
    data: {
      label: capability.name,
      type: capability.type,
      capabilityType: capability.type,
      variableKey: createWorkflowVariableKey(capability.type, nodes.value as Node[]),
      config: { ...(capability.defaultData?.config || capability.defaultData || {}) },
      ...(isHotsearch ? { platform: platformKey } : {}),
    },
  };

  addNodes([newNode]);
  selectedNode.value = newNode;
};

// ─── 拖拽放置节点 ─────────────────────────────────────────────
const onDrop = (event: DragEvent) => {
  event.preventDefault();
  const type = event.dataTransfer?.getData("application/vueflow-node-type");
  const label = event.dataTransfer?.getData("application/vueflow-node-label");
  const rawData = event.dataTransfer?.getData("application/vueflow-node-data");
  if (!type || !canvasRef.value) return;

  let defaultData = {};
  if (rawData) {
    try {
      defaultData = JSON.parse(rawData);
    } catch (e) { }
  }

  const bounds = canvasRef.value.getBoundingClientRect();
  const position = project({
    x: event.clientX - bounds.left,
    y: event.clientY - bounds.top,
  });

  const mappedType = nodeTypes[type as keyof typeof nodeTypes] ? type : "default";

  // 热搜平台节点：从类型中提取 platform 字段
  const isHotsearchDrop =
    type.startsWith("hotsearch_") ||
    type.startsWith("hupu_") ||
    (type in nodeTypes && (nodeTypes as any)[type] === HotsearchNode);
  const platformKeyDrop = isHotsearchDrop
    ? type.startsWith("hupu_")
      ? "hupu"
      : type.replace("hotsearch_", "")
    : undefined;

  pushHistory();
  const newNode: Node = {
    id: `${type}_${Date.now().toString(36)}`,
    type: mappedType,
    position,
    data: {
      label: label || type,
      type: type,
      capabilityType: type,
      variableKey: createWorkflowVariableKey(type, nodes.value as Node[]),
      config: { ...defaultData },
      ...(isHotsearchDrop ? { platform: platformKeyDrop } : {}),
    },
  };

  addNodes([newNode]);
  selectedNode.value = newNode;
};

const onDragOver = (event: DragEvent) => {
  event.preventDefault();
  if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
};

// ─── 键盘事件处理 ─────────────────────────────────────────────
const handleKeydown = (e: KeyboardEvent) => {
  const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
  if (tag === "input" || tag === "textarea") return;

  // 撤销 Ctrl+Z
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z" && !e.shiftKey) {
    e.preventDefault();
    if (canUndo()) {
      undo();
      ElMessage.info(t("common.undone"));
    }
    return;
  }

  // 重做 Ctrl+Shift+Z 或 Ctrl+Y
  if (
    (e.metaKey || e.ctrlKey) &&
    (e.key.toLowerCase() === "y" || (e.key.toLowerCase() === "z" && e.shiftKey))
  ) {
    e.preventDefault();
    if (canRedo()) {
      redo();
      ElMessage.info(t("common.redone"));
    }
    return;
  }

  // 复制节点
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "c") {
    if (selectedNode.value) {
      copiedNode.value = JSON.parse(JSON.stringify(selectedNode.value));
      ElMessage.success(t("workflow.nodeCopied"));
    }
    return;
  }

  // 粘贴节点
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "v") {
    if (copiedNode.value) {
      pushHistory();
      const newNode: Node = {
        ...JSON.parse(JSON.stringify(copiedNode.value)),
        id: `node_${Date.now()}`,
        position: {
          x: copiedNode.value.position.x + 30,
          y: copiedNode.value.position.y + 30,
        },
      };
      newNode.data = { ...(newNode.data || {}), variableKey: createWorkflowVariableKey(newNode.data?.capabilityType || newNode.type || "node", nodes.value as Node[]) };
      addNodes([newNode]);
      selectedNode.value = newNode;
      ElMessage.success(t("workflow.nodePasted"));
    }
    return;
  }

  // 快捷键帮助
  if (e.key === "?" || (e.shiftKey && e.key === "/")) {
    e.preventDefault();
    shortcutGuideVisible.value = true;
    return;
  }

  // 删除选中节点或连线
  if (e.key === "Delete" || e.key === "Backspace") {
    if (selectedEdge.value) {
      e.preventDefault();
      handleDeleteEdge(selectedEdge.value.id);
    } else if (selectedNode.value) {
      e.preventDefault();
      onNodeDelete(selectedNode.value.id);
    }
  }
};

// ─── 一键整理对齐布局 ─────────────────────────────────────────
const autoLayout = () => {
  if (nodes.value.length === 0) return;
  pushHistory();

  const nodeMap = new Map(nodes.value.map((n) => [n.id, n]));
  const startNodes = nodes.value.filter(
    (n) => n.type === "start" || !edges.value.some((e) => e.target === n.id),
  );

  const levels = new Map<string, number>();
  const queue = startNodes.map((n) => ({ id: n.id, level: 0 }));

  while (queue.length > 0) {
    const curr = queue.shift()!;
    if (levels.has(curr.id) && levels.get(curr.id)! >= curr.level) continue;
    levels.set(curr.id, curr.level);
    const outgoing = edges.value.filter((e) => e.source === curr.id);
    for (const edge of outgoing) {
      queue.push({ id: edge.target, level: curr.level + 1 });
    }
  }

  const levelGroups: Record<number, string[]> = {};
  nodes.value.forEach((n) => {
    const lvl = levels.get(n.id) || 0;
    if (!levelGroups[lvl]) levelGroups[lvl] = [];
    levelGroups[lvl].push(n.id);
  });

  Object.entries(levelGroups).forEach(([lvlStr, nodeIds]) => {
    const lvl = Number(lvlStr);
    const y = 80 + lvl * 140;
    const totalWidth = nodeIds.length * 200;
    const startX = 200 - totalWidth / 2;

    nodeIds.forEach((id, idx) => {
      const node = nodeMap.get(id);
      if (node) {
        node.position = { x: startX + idx * 200, y };
      }
    });
  });
  ElMessage.success(t("workflow.canvasAligned"));
};

// ─── 导出 / 导入 JSON ────────────────────────────────────────
const exportJson = () => {
  const data = JSON.stringify(
    {
      name: workflow.value?.name,
      canvas: {
        nodes: nodes.value,
        edges: edges.value,
        viewport: getViewport(),
      },
    },
    null,
    2,
  );
  const blob = new Blob([data], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `workflow_${workflowId.value}.json`;
  a.click();
  URL.revokeObjectURL(url);
  ElMessage.success(t("workflow.jsonExported"));
};

const fileInputRef = ref<HTMLInputElement | null>(null);
const triggerImportJson = () => {
  fileInputRef.value?.click();
};

const handleImportJson = (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const json = JSON.parse(e.target?.result as string);
      if (json.canvas) {
        pushHistory();
        setNodes(normalizeCanvasNodes(json.canvas.nodes || []));
        setEdges(json.canvas.edges || []);
        if (json.canvas.viewport) setViewport(json.canvas.viewport);
        ElMessage.success(t("workflow.jsonImported"));
      }
    } catch {
      ElMessage.error(t("workflow.jsonParseError"));
    }
  };
  reader.readAsText(file);
};

// ─── 清空画布 ────────────────────────────────────────────────
const clearCanvas = async () => {
  await ElMessageBox.confirm(t("workflow.clearCanvasConfirm"), t("common.tip"), {
    confirmButtonText: t("common.clear"),
    cancelButtonText: t("common.cancel"),
    type: "warning",
  });
  pushHistory();
  setNodes([]);
  setEdges([]);
  selectedNode.value = null;
  selectedEdge.value = null;
  ElMessage.success(t("workflow.canvasCleared"));
};

// ─── 连线删除 ─────────────────────────────────────────────────
const handleDeleteEdge = (edgeId: string) => {
  pushHistory();
  removeEdges([edgeId]);
  selectedEdge.value = null;
  ElMessage.success(t("workflow.edgeDeleted"));
};

// 所有进入画布的旧数据统一补齐稳定变量名与类型自愈，保证变量引用稳定且节点卡片正常渲染
const normalizeCanvasNodes = (rawNodes: any[]) => {
  const source = Array.isArray(rawNodes) ? rawNodes : [];
  const used = new Set<string>();
  return source.map((node: any) => {
    let actualType = node.type;
    const capType = node.data?.capabilityType;
    if ((actualType === "default" || !actualType) && capType && (nodeTypes as any)[capType]) {
      actualType = capType;
    }
    const base = getWorkflowVariableKey({ ...node, type: actualType }, source as Node[]);
    let variableKey = base;
    let suffix = 1;
    while (used.has(variableKey)) variableKey = `${base}_${suffix++}`;
    used.add(variableKey);
    return {
      ...node,
      type: actualType,
      data: {
        ...(node.data || {}),
        capabilityType: capType || actualType,
        type: node.data?.type || capType || actualType,
        variableKey,
      },
    };
  });
};

const handlePublishToLibrary = async () => {
  if (!isAdmin.value) return;
  try {
    const category = await ElMessageBox.prompt("请输入工作流库分类", "发布到工作流库", { inputValue: "其他", confirmButtonText: "发布", cancelButtonText: "取消" });
    const result: any = await publishWorkflowToLibraryApi(workflowId.value, { category: category.value || "其他" });
    await ElMessageBox.alert(`已发布到工作流库：${result?.name || workflow.value?.name || "工作流"}\n\n其他用户导入后会得到独立副本，后续互不影响。`, "发布成功", { confirmButtonText: "知道了" });
  } catch (error: any) {
    if (error !== "cancel" && error !== "close") ElMessage.error(error?.message || "发布到工作流库失败");
  }
};

// ─── 加载工作流与注册键盘事件 ──────────────────────────────
onMounted(async () => {
  window.addEventListener("keydown", handleKeydown);
  try {
    const res: any = await getWorkflowDetailApi(workflowId.value);
    workflow.value = res;
    if (res.canvas) {
      setNodes(normalizeCanvasNodes(res.canvas.nodes || []));
      setEdges(res.canvas.edges || []);
      if (res.canvas.viewport) {
        setViewport(res.canvas.viewport);
      }
    }
    setTimeout(() => smartSaveNow(), 100);
  } catch (e) {
    ElMessage.error(t("workflow.loadFailed"));
  } finally {
    loading.value = false;
  }

  // 监听工作流实时变更（AI 操作同步）
  websocketClient.events.on("workflow:updated", handleWorkflowUpdate);
});

// 处理工作流实时更新
const handleWorkflowUpdate = (data: { workflowId: string; name: string; canvas: any }) => {
  if (data.workflowId !== workflowId.value) return;
  // 更新画布
  if (data.canvas) {
    setNodes(normalizeCanvasNodes(data.canvas.nodes || []));
    setEdges(data.canvas.edges || []);
    if (data.canvas.viewport) {
      setViewport(data.canvas.viewport);
    }
  }
  // 更新工作流信息
  if (data.name && workflow.value) {
    workflow.value.name = data.name;
  }
};

onBeforeUnmount(() => {
  window.removeEventListener("keydown", handleKeydown);
  cancelSave();
  // 移除工作流更新监听
  websocketClient.events.off("workflow:updated", handleWorkflowUpdate);
});

// ─── 自动保存 ─────────────────────────────────────────────────
watch(nodes, triggerSave, { deep: true });
watch(edges, triggerSave, { deep: true });

// ─── 连线类型切换：同步更新已有连线 ─────────────────────────
watch(edgeType, (newType) => {
  const currentEdges = edges.value;
  if (currentEdges.length === 0) return;
  setEdges(
    currentEdges.map((e) => ({
      ...e,
      type: newType,
    })),
  );
});

// ─── 节点连接 ─────────────────────────────────────────────────
onConnect((params: Connection) => {
  pushHistory();
  addEdges([
    {
      id: `e-${params.source}-${params.target}-${Date.now()}`,
      source: params.source,
      target: params.target,
      sourceHandle: params.sourceHandle,
      targetHandle: params.targetHandle,
      type: edgeType.value,
      animated: false,
      style: { stroke: "#94a3b8", strokeWidth: 2 },
    },
  ]);
});

// ─── 连线更新（重新连接）────────────────────────────────────
onEdgeUpdate(({ edge, connection }) => {
  pushHistory();
  updateEdge(edge, {
    source: connection.source,
    target: connection.target,
    sourceHandle: connection.sourceHandle,
    targetHandle: connection.targetHandle,
  });
});

// ─── 节点点击（选中→配置面板）────────────────────────────────
const onNodeClick = ({ node }: NodeMouseEvent) => {
  selectedNode.value = node;
  selectedEdge.value = null;
};

// ─── 连线点击（选中→可删除）─────────────────────────────────
const onEdgeClick = ({ edge }: EdgeMouseEvent) => {
  selectedEdge.value = edge;
  selectedNode.value = null;
};

const onPaneClick = () => {
  selectedNode.value = null;
  selectedEdge.value = null;
};

// ─── 节点配置更新 ─────────────────────────────────────────────
const onNodeUpdate = (updated: Node) => {
  updateNodeData(updated.id, { ...updated.data });
  const node = findNode(updated.id);
  if (node) selectedNode.value = { ...node };
};

// ─── 节点删除 ─────────────────────────────────────────────────
const onNodeDelete = (nodeId: string) => {
  pushHistory();
  removeNodes([nodeId]);
  selectedNode.value = null;
};

// ─── 标题编辑 ─────────────────────────────────────────────────
const editingTitle = ref(false);
const popoverVisible = ref(false);
const titleInput = ref("");

const startEditTitle = () => {
  titleInput.value = workflow.value?.name || "";
  editingTitle.value = true;
  popoverVisible.value = true;
};

const saveTitle = async () => {
  if (!titleInput.value.trim()) return;
  editingTitle.value = false;
  popoverVisible.value = false;
  workflow.value.name = titleInput.value.trim();
  await updateWorkflowApi({ id: workflowId.value, name: workflow.value.name });
};

const cancelEditTitle = () => {
  popoverVisible.value = false;
  editingTitle.value = false;
};

const statusText = computed(() => {
  if (saveStatus.value === "saving") return t("workflow.saving");
  if (saveStatus.value === "unsaved") return t("workflow.unsaved");
  return t("workflow.saved");
});
</script>

<template>
  <div class="workflow-editor" v-loading="loading">
    <!-- 顶部工具栏 -->
    <div class="wf-editor-toolbar">
      <div class="wf-editor-toolbar__left">
        <el-button text @click="router.push('/workflow')" class="wf-back-btn">
          <el-icon>
            <ArrowLeft />
          </el-icon>
          {{ t("workflow.title") }}
        </el-button>
        <div class="wf-divider" />
        <!-- 可编辑标题 -->
        <div class="wf-title-wrap">
          <el-popover v-model:visible="popoverVisible" placement="bottom-start" :width="240" :show-arrow="false"
            trigger="click">
            <template #reference>
              <span class="wf-title" @click="startEditTitle">
                <span class="wf-title__text">{{ workflow?.name || "..." }}</span>
                <el-icon class="wf-title__icon">
                  <EditPen />
                </el-icon>
              </span>
            </template>
            <div class="wf-title-edit">
              <el-input v-model="titleInput" type="textarea" :rows="3" :placeholder="t('workflow.name')" />
              <div class="wf-title-edit__actions">
                <el-button size="small" text @click="cancelEditTitle">{{
                  t("common.cancel")
                  }}</el-button>
                <el-button size="small" type="primary" @click="saveTitle">{{
                  t("common.confirm")
                  }}</el-button>
              </div>
            </div>
          </el-popover>
        </div>
      </div>

      <div class="wf-editor-toolbar__right">
        <!-- 连线类型 -->
        <el-select v-model="edgeType" size="small" style="width: 72px" :placeholder="t('workflow.edge')">
          <el-option :label="t('workflow.polyline')" value="smoothstep" />
          <el-option :label="t('workflow.curve')" value="default" />
          <el-option :label="t('workflow.straight')" value="straight" />
        </el-select>

        <!-- 撤销/重做 -->
        <el-button size="small" :disabled="!canUndo()" @click="undo" :title="t('common.undo') + ' (Ctrl+Z)'">{{
          t("common.undo") }}</el-button>
        <el-button size="small" :disabled="!canRedo()" @click="redo" :title="t('common.redo') + ' (Ctrl+Shift+Z)'">{{
          t("common.redo") }}</el-button>

        <!-- 整理与工具按纽 -->
        <el-button size="small" @click="autoLayout">{{ t("workflow.align") }}</el-button>
        <el-button size="small" type="primary" plain @click="nodePickerVisible = true">{{
          t("workflow.featureNode")
          }}</el-button>
        <el-button size="small" @click="triggerDialogVisible = true">{{
          t("common.settings")
          }}</el-button>
        <el-button size="small" type="success" :loading="runningWorkflow" @click="handleRunWorkflow">{{
          t("workflow.run")
          }}</el-button>
        <el-button size="small" @click="exportJson">{{ t("common.export") }}</el-button>
        <el-button v-if="isAdmin" size="small" type="warning" plain @click="handlePublishToLibrary">发布到工作流库</el-button>
        <el-button size="small" @click="triggerImportJson">{{ t("common.import") }}</el-button>
        <input ref="fileInputRef" type="file" accept=".json" style="display: none" @change="handleImportJson" />
        <el-button size="small" type="danger" text @click="clearCanvas">{{
          t("common.clear")
          }}</el-button>

        <!-- 快捷键帮助 -->
        <el-button size="small" circle @click="shortcutGuideVisible = true" title="键盘快捷键 (?)">
          <el-icon>
            <Reading />
          </el-icon>
        </el-button>

        <div class="wf-divider" />

        <!-- 保存按钮（现代极简扁平化风格） -->
        <button type="button" :class="['wf-flat-save-btn', `wf-flat-save-btn--${saveStatus}`]"
          :disabled="saveStatus === 'saving'" title="点击立即保存 (Ctrl+S / ⌘S)" @click="smartSaveNow">
          <span class="wf-flat-save-btn__indicator">
            <svg v-if="saveStatus === 'saving'" class="wf-flat-save-btn__spinner" viewBox="0 0 24 24" width="12"
              height="12" fill="none" stroke="currentColor" stroke-width="2.5">
              <circle cx="12" cy="12" r="10" stroke-dasharray="32" stroke-dashoffset="12" stroke-linecap="round" />
            </svg>
            <svg v-else-if="saveStatus === 'saved'" class="wf-flat-save-btn__icon" viewBox="0 0 24 24" width="12"
              height="12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"
              stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span v-else class="wf-flat-save-btn__dot" />
          </span>
          <span class="wf-flat-save-btn__text">{{ statusText }}</span>
        </button>
      </div>
    </div>

    <!-- 编辑器主体 -->
    <div class="wf-editor-body">
      <!-- 左侧基础节点面板 -->
      <NodePanel :ai-panel-visible="aiPanelVisible" @open-node-picker="handleOpenNodePicker"
        @toggle-ai-panel="handleToggleAiPanel" />

      <!-- 画布区 -->
      <div ref="canvasRef" class="wf-canvas" @drop="onDrop" @dragover="onDragOver">
        <VueFlow :node-types="nodeTypes" fit-view-on-init :min-zoom="0.1" :max-zoom="4"
          :default-edge-options="{ animated: false, style: { stroke: '#94a3b8', strokeWidth: 2 } }"
          @node-click="onNodeClick" @edge-click="onEdgeClick" @pane-click="onPaneClick">
          <Background :pattern-color="patternColor" :gap="20" />
          <Controls />
          <MiniMap class="wf-minimap" />
        </VueFlow>
      </div>

      <!-- AI 助手侧边面板 -->
      <div v-if="aiPanelVisible" class="wf-editor-ai-panel">
        <div class="wf-editor-ai-panel__header">
          <div class="wf-editor-ai-panel__actions">
            <button class="wf-editor-ai-panel__toggle" @click="aiStore.createConversation" title="新对话">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"
                stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </button>
            <button class="wf-editor-ai-panel__toggle" @click="aiStore.clearMessages" title="清空">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"
                stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
              </svg>
            </button>
          </div>
          <button class="wf-editor-ai-panel__toggle" @click="aiPanelVisible = false" title="收起">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"
              stroke-linecap="round">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        </div>
        <AssistantChat :messages="aiStore.messages" :loading="aiStore.loading"
          :pending-interaction="aiStore.pendingInteraction" :thinking-text="aiStore.thinkingText" :can-send="true"
          input-placeholder="描述你想要的工作流..." @send="aiStore.sendMessage" @interaction-submit="
            (r) => aiStore.resumeInteraction(r.confirmed, r.input, r.reason || '')
          " @interaction-reject="
            (r) =>
              aiStore.resumeInteraction(
                false,
                { ...(aiStore.pendingInteraction?.input || {}), action: 'reject' },
                r.reason || '',
              )
          " @new-conversation="aiStore.createConversation" @clear-conversation="aiStore.clearMessages" />
      </div>


      <!-- 右侧配置面板 -->
      <ConfigPanel :node="selectedNode" :workflow-id="workflowId" :all-nodes="nodes" :all-edges="edges"
        :selected-edge="selectedEdge" @update="onNodeUpdate" @delete="onNodeDelete" />
    </div>

    <!-- 触发器与设置对话框 -->
    <ShortcutGuide v-model:visible="shortcutGuideVisible" />
    <TriggerConfigDialog v-model="triggerDialogVisible" :workflow-id="workflowId" />

    <!-- 功能节点选择弹窗 -->
    <NodePickerDialog v-model="nodePickerVisible" @select="handleAddNodeFromLibrary" />
  </div>
</template>

<style>
@import url("@vue-flow/core/dist/style.css");
@import url("@vue-flow/core/dist/theme-default.css");
@import url("@vue-flow/controls/dist/style.css");
@import url("@vue-flow/minimap/dist/style.css");

/*
 * 画布节点的视觉基线：不同采集/工具节点过去各自只有 100~140px 的最小宽度，
 * 关键词、节点标题和参数会被挤成多行。统一提高可读尺寸，长文本统一省略显示，
 * 完整内容仍在右侧配置面板编辑，避免画布节点无限增高。
 */
.wf-canvas .vue-flow__node .wf-node {
  box-sizing: border-box;
  min-width: 190px !important;
  max-width: 300px;
  padding: 10px 12px !important;
  font-size: 13px !important;
}

.wf-canvas .vue-flow__node .wf-node__header {
  min-width: 0;
  gap: 8px !important;
}

.wf-canvas .vue-flow__node .wf-node__title,
.wf-canvas .vue-flow__node .wf-node__subtitle,
.wf-canvas .vue-flow__node .wf-node__type,
.wf-canvas .vue-flow__node .wf-node__badge,
.wf-canvas .vue-flow__node .wf-node__scope,
.wf-canvas .vue-flow__node .wf-node__ai-preview,
.wf-canvas .vue-flow__node .wf-node__code-preview {
  min-width: 0;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
  white-space: nowrap !important;
  overflow-wrap: normal !important;
  word-break: normal !important;
}

.wf-canvas .vue-flow__node .wf-node__title {
  font-size: 13px !important;
  line-height: 20px;
}

.wf-canvas .vue-flow__node .wf-node__subtitle {
  font-size: 12px !important;
  line-height: 18px;
}

.wf-canvas .vue-flow__node .wf-node__type,
.wf-canvas .vue-flow__node .wf-node__badge,
.wf-canvas .vue-flow__node .wf-node__scope,
.wf-canvas .vue-flow__node .wf-node__ai-preview,
.wf-canvas .vue-flow__node .wf-node__code-preview {
  font-size: 11px !important;
  line-height: 17px;
}

.wf-canvas .vue-flow__node .wf-node__icon,
.wf-canvas .vue-flow__node .wf-node__platform-icon {
  width: 20px !important;
  height: 20px !important;
  flex: 0 0 20px;
}

.wf-canvas .vue-flow__node .wf-node-params {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  width: 100%;
  max-width: 276px !important;
  gap: 5px !important;
}

.wf-canvas .vue-flow__node .wf-node-param {
  display: inline-flex;
  flex-wrap: nowrap !important;
  min-width: 0;
  width: 100%;
  max-width: none !important;
  padding: 3px 6px !important;
  font-size: 10px !important;
  white-space: nowrap !important;
  word-break: keep-all !important;
}

.wf-canvas .vue-flow__node .wf-node-param b {
  flex: 0 0 auto;
  min-width: 38px;
  white-space: nowrap !important;
  word-break: keep-all !important;
}

.wf-canvas .vue-flow__node .wf-node-param span {
  flex: 1 1 auto;
  min-width: 0;
}

/* AI 助手侧边面板 */
.wf-editor-ai-panel {
  display: flex;
  width: 400px;
  height: 100%;
  background: var(--app-content-surface-color);
  border-left: 1px solid var(--app-content-border-color);
  flex-direction: column;
  flex-shrink: 0;
}

.wf-editor-ai-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 8px;
  border-bottom: 1px solid var(--app-content-border-color);
  flex-shrink: 0;
}

.wf-editor-ai-panel__actions {
  display: flex;
  align-items: center;
  gap: 2px;
}

.wf-editor-ai-panel__toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  color: var(--el-text-color-placeholder);
  cursor: pointer;
  background: transparent;
  border: none;
  border-radius: 4px;
}

.wf-editor-ai-panel__toggle:hover {
  background: var(--app-content-surface-muted-color);
  color: var(--el-text-color-primary);
}

:deep(.wf-editor-ai-panel .assistant-chat) {
  height: 100%;
  border: none;
  border-radius: 0;
}
</style>

<style scoped lang="scss">
.workflow-editor {
  display: flex;
  height: calc(100vh - var(--top-tool-height) - var(--tags-view-height));
  overflow: hidden;
  background: var(--app-content-bg-color);
  flex-direction: column;
}

.wf-editor-toolbar {
  display: flex;
  height: 36px;
  padding: 0 12px;
  background: var(--app-content-surface-color);
  border-bottom: 1px solid var(--app-content-border-color);
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
  gap: 8px;
}

.wf-editor-toolbar__left,
.wf-editor-toolbar__right {
  display: flex;
  align-items: center;
  gap: 4px;
}

.wf-editor-toolbar__right {
  :deep(.el-button--small) {
    height: 24px;
    padding: 2px 7px;
    font-size: 11px;
    border-radius: 4px;
  }

  :deep(.el-select--small) {
    .el-select__wrapper {
      height: 24px;
      min-height: 24px;
      padding: 0 6px;
      font-size: 11px;
      border-radius: 4px;
    }
  }
}

.wf-back-btn {
  height: 24px;
  padding: 2px 4px;
  font-size: 11px;
  color: var(--el-text-color-secondary);
}

.wf-divider {
  width: 1px;
  height: 12px;
  margin: 0 2px;
  background: var(--app-content-border-color);
}

.wf-title-wrap {
  display: flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
}

.wf-title {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 6px;
  font-size: 13px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  cursor: pointer;
  border-radius: 4px;
  transition: background-color 0.15s ease;
  max-width: 480px;

  &:hover {
    background: var(--app-content-surface-muted-color);
  }

  &__text {
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    min-width: 0;
  }

  &__icon {
    font-size: 11px;
    color: var(--el-text-color-placeholder);
    flex-shrink: 0;
  }
}

.wf-title-edit {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.wf-title-edit__actions {
  display: flex;
  justify-content: flex-end;
  gap: 4px;

  :deep(.el-button) {
    height: 20px;
    padding: 0 8px;
    font-size: 11px;
    border-radius: 3px;
  }
}

.wf-flat-save-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  width: 86px;
  min-width: 86px;
  max-width: 86px;
  height: 24px;
  padding: 0 8px;
  font-size: 11px;
  font-weight: 500;
  border-radius: 4px;
  box-sizing: border-box;
  cursor: pointer;
  outline: none;
  user-select: none;
  font-family: -apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", Roboto, sans-serif;
  letter-spacing: 0.1px;
  transition:
    background-color 0.12s ease,
    border-color 0.12s ease,
    box-shadow 0.12s ease,
    color 0.12s ease;
  position: relative;
  overflow: hidden;

  &:active {
    transform: translateY(0.5px);
  }

  &__indicator {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 12px;
    height: 12px;
    flex-shrink: 0;
  }

  &__icon {
    stroke: currentColor;
    flex-shrink: 0;
  }

  &__spinner {
    flex-shrink: 0;
    animation: wf-save-spin 0.7s linear infinite;
  }

  &__dot {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background-color: currentColor;
  }

  &__text {
    line-height: 1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  // 1. 已保存（Figma/PS 工业中性灰底，安静沉稳）
  &--saved {
    color: #4b5563;
    background: #f3f4f6;
    border: 1px solid #d1d5db;
    box-shadow: 0 1px 1px rgba(0, 0, 0, 0.04);

    .wf-flat-save-btn__indicator {
      color: #10b981;
    }

    &:hover {
      background: #e5e7eb;
      border-color: #9ca3af;
      color: #1f2937;
    }

    &:active {
      background: #d1d5db;
      box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.1);
    }
  }

  // 2. 保存中（工业精密加载态）
  &--saving {
    color: #6b7280;
    background: #f9fafb;
    border: 1px solid #e5e7eb;
    box-shadow: none;
    cursor: wait;

    .wf-flat-save-btn__indicator {
      color: #0d99ff;
    }
  }

  // 3. 未保存（Figma 经典高对比蓝键 / 醒目操作提示）
  &--unsaved {
    color: #ffffff;
    background: #0d99ff;
    border: 1px solid #007be5;
    box-shadow:
      0 1px 2px rgba(13, 153, 255, 0.2),
      inset 0 1px 0 rgba(255, 255, 255, 0.2);

    .wf-flat-save-btn__dot {
      background-color: #ffffff;
      box-shadow: 0 0 4px rgba(255, 255, 255, 0.8);
      animation: wf-save-pulse 1.4s ease-in-out infinite;
    }

    &:hover {
      background: #008ae6;
      border-color: #006ecf;
      box-shadow:
        0 1px 4px rgba(13, 153, 255, 0.35),
        inset 0 1px 0 rgba(255, 255, 255, 0.25);
    }

    &:active {
      background: #0075cc;
      box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.25);
    }
  }
}

// 深色模式自动适配（Photoshop / Figma 经典深灰面板 #2c2c2c）
html.dark .wf-flat-save-btn {
  &--saved {
    color: #9ca3af;
    background: #2c2c2c;
    border: 1px solid #3e3e3e;
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.05),
      0 1px 2px rgba(0, 0, 0, 0.3);

    .wf-flat-save-btn__indicator {
      color: #34d399;
    }

    &:hover {
      background: #363636;
      border-color: #4f4f4f;
      color: #e5e7eb;
    }

    &:active {
      background: #222222;
      box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.4);
    }
  }

  &--saving {
    color: #6b7280;
    background: #222222;
    border: 1px solid #333333;
    box-shadow: none;

    .wf-flat-save-btn__indicator {
      color: #0d99ff;
    }
  }

  &--unsaved {
    color: #ffffff;
    background: #0d99ff;
    border: 1px solid #0c8ce9;
    box-shadow:
      0 1px 3px rgba(0, 0, 0, 0.5),
      inset 0 1px 0 rgba(255, 255, 255, 0.25);

    .wf-flat-save-btn__dot {
      background-color: #ffffff;
      box-shadow: 0 0 4px rgba(255, 255, 255, 0.8);
    }

    &:hover {
      background: #008ae6;
      border-color: #007ae0;
    }

    &:active {
      background: #0075cc;
      box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.4);
    }
  }
}

@keyframes wf-save-spin {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}

@keyframes wf-save-pulse {

  0%,
  100% {
    opacity: 1;
    transform: scale(1);
  }

  50% {
    opacity: 0.4;
    transform: scale(0.85);
  }
}

.wf-editor-body {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.wf-canvas {
  position: relative;
  height: 100%;
  background: var(--app-content-bg-color);
  flex: 1;
}

/* VueFlow 控件适配深色/浅色模式 */
:deep(.vue-flow__controls) {
  overflow: hidden;
  background: var(--app-content-surface-color);
  border: 1px solid var(--app-content-border-color);
  border-radius: 8px;
  box-shadow: var(--app-content-shadow);
}

:deep(.vue-flow__controls-button) {
  color: var(--el-text-color-primary);
  background: var(--app-content-surface-color);
  border-bottom: 1px solid var(--app-content-border-color);
  fill: var(--el-text-color-primary);

  &:hover {
    background: var(--app-content-surface-muted-color);
  }
}

:deep(.vue-flow__edge-path) {
  stroke: var(--el-border-color-darker, #94a3b8);
}

:deep(.wf-minimap) {
  overflow: hidden;
  background: var(--app-content-surface-color);
  border: 1px solid var(--app-content-border-color);
  border-radius: 8px;
}

/* AI 助手侧边面板 */
.wf-editor-ai-panel {
  display: flex;
  width: 400px;
  height: 100%;
  background: var(--app-content-surface-color);
  border-left: 1px solid var(--app-content-border-color);
  flex-direction: column;
  flex-shrink: 0;
}

.wf-editor-ai-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border-bottom: 1px solid var(--app-content-border-color);
  flex-shrink: 0;
}

.wf-editor-ai-panel__actions {
  display: flex;
  align-items: center;
  gap: 2px;
}

.wf-editor-ai-panel__toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  color: var(--el-text-color-placeholder);
  cursor: pointer;
  background: transparent;
  border: none;
  border-radius: 4px;
}

.wf-editor-ai-panel__toggle:hover {
  background: var(--app-content-surface-muted-color);
  color: var(--el-text-color-primary);
}


:deep(.wf-editor-ai-panel .assistant-chat) {
  height: 100%;
  border: none;
  border-radius: 0;
}
</style>
