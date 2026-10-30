import { computed, shallowRef } from "vue";
import { getWorkflowNodeManifestApi } from "@/api/workflow";
import {
  NODE_MANIFEST_REGISTRY,
  type NodeManifest,
} from "@/views/workflow/editor/config/node-manifest";

// 在服务端 manifest 尚未加载完成时也先隐藏明确不可用节点，避免
// 节点库先闪现、随后又消失。
export const UNAVAILABLE_WORKFLOW_NODE_TYPES = new Set([
  "douban_book_search",
  "stats_gov_search",
  "hotsearch_tencent_news",
  "reddit_search",
  "producthunt_search",
]);

export interface WorkflowNodeServerManifest {
  type: string;
  name: string;
  category: string;
  description: string;
  inputSchema?: any[];
  outputSchema?: any[];
  defaultData?: Record<string, any>;
  executable?: boolean;
  available?: boolean;
  requiredFields?: string[];
  [key: string]: any;
}

/**
 * 服务端 manifest 只提供业务元信息（名称/分类/描述/Schema），不含前端展示用的图标与配色。
 * 前端静态 registry 也不会随服务端新增节点自动更新，因此这里按分类兜底，
 * 保证「服务端已上线、前端还没登记」的新节点也能获得统一的图标、配色与分类归属。
 */
const SERVER_CATEGORY_ALIASES: Record<string, string> = {
  news: "hotsearch",
  media: "material",
  legacy: "integration",
};

const CATEGORY_DISPLAY: Record<string, { icon: string; color: string }> = {
  base: { icon: "ep:location", color: "#64748b" },
  ai: { icon: "ep:magic-stick", color: "#8b5cf6" },
  hotsearch: { icon: "ep:trend-charts", color: "#f97316" },
  design: { icon: "ep:picture-filled", color: "#ec4899" },
  material: { icon: "ep:folder-opened", color: "#0ea5e9" },
  product: { icon: "ep:goods", color: "#f59e0b" },
  integration: { icon: "ep:connection", color: "#06b6d4" },
  notify: { icon: "ep:bell", color: "#10b981" },
  logic: { icon: "ep:cpu", color: "#6366f1" },
};

/** 开始/结束是画布边界节点，不能从节点库重复添加。 */
export const BOUNDARY_WORKFLOW_NODE_TYPES = new Set(["start", "end"]);

export function normalizeWorkflowNodeCategory(category?: string): string {
  if (!category) return "integration";
  return SERVER_CATEGORY_ALIASES[category] || category;
}

export function getWorkflowNodeCategoryDisplay(category?: string): {
  icon: string;
  color: string;
} {
  return (
    CATEGORY_DISPLAY[normalizeWorkflowNodeCategory(category)] || {
      icon: "ep:grid",
      color: "#64748b",
    }
  );
}

/** 把服务端节点描述转换成节点库/画布可直接消费的能力条目。 */
export function toWorkflowNodeCapability(
  node: WorkflowNodeServerManifest,
): NodeManifest {
  // 部分采集源在服务端被登记成 integration，前端统一按类型前缀归到“热搜与社交媒体”。
  const category = normalizeWorkflowNodeCategory(
    node.type.startsWith("hotsearch_") ? "hotsearch" : node.category,
  );
  const display = getWorkflowNodeCategoryDisplay(category);
  return {
    type: node.type,
    name: node.name || node.type,
    category,
    description: node.description || "",
    icon: display.icon,
    color: display.color,
    defaultData: node.defaultData,
    inputSchema: Array.isArray(node.inputSchema) ? node.inputSchema : [],
    outputSchema: Array.isArray(node.outputSchema) ? node.outputSchema : [],
  };
}

const LOCAL_NODE_TYPES = new Set(NODE_MANIFEST_REGISTRY.map((item) => item.type));

const nodes = shallowRef<WorkflowNodeServerManifest[]>([]);
const loading = shallowRef(false);
let loaded = false;
let pending: Promise<WorkflowNodeServerManifest[]> | null = null;

export function useWorkflowNodeManifest() {
  const byType = computed(() => new Map(nodes.value.map((node) => [node.type, node])));

  // 前端 registry 里没有、但服务端已经可执行的新节点。
  const serverOnlyCapabilities = computed<NodeManifest[]>(() =>
    nodes.value
      .filter((node) => !LOCAL_NODE_TYPES.has(node.type))
      .filter((node) => !BOUNDARY_WORKFLOW_NODE_TYPES.has(node.type))
      .filter((node) => !UNAVAILABLE_WORKFLOW_NODE_TYPES.has(node.type))
      .filter((node) => node.executable !== false && node.available !== false)
      .map(toWorkflowNodeCapability),
  );

  const load = async (force = false) => {
    if (loaded && !force) return nodes.value;
    if (pending && !force) return pending;
    loading.value = true;
    pending = (async () => {
      try {
        const response: any = await getWorkflowNodeManifestApi();
        const payload = response?.data || response;
        nodes.value = Array.isArray(payload?.nodes) ? payload.nodes : [];
        loaded = nodes.value.length > 0;
        return nodes.value;
      } finally {
        loading.value = false;
        pending = null;
      }
    })();
    return pending;
  };

  return { nodes, byType, loading, load, serverOnlyCapabilities };
}
