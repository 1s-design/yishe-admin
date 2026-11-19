<template>
  <div class="chapter-panel">
    <!-- 数据源切换 -->
    <el-tabs v-model="activeTab" class="chapter-tabs">
      <el-tab-pane
        v-for="tab in tabs"
        :key="tab.key"
        :name="tab.key"
        :label="tab.label"
      />
    </el-tabs>

    <!-- 工具栏 -->
    <div class="toolbar">
      <el-select
        v-if="clueTypeTabs.includes(activeTab)"
        v-model="clueTypeNew"
        size="small"
        style="width: 120px"
        @change="loadData"
      >
        <el-option label="全部商机" :value="9" />
        <el-option label="潜力爆品" :value="11" />
      </el-select>

      <el-input-number
        v-if="activeTab === 'clues'"
        v-model="pageSize"
        :min="5"
        :max="50"
        :step="5"
        size="small"
        controls-position="right"
        style="width: 90px"
      />

      <el-button type="primary" size="small" :loading="loading" @click="loadData">
        {{ loading ? "采集中..." : "采集" }}
      </el-button>
      <el-button size="small" text :disabled="!data.length" @click="showJson = true">
        原始结果
      </el-button>
      <el-button size="small" text :disabled="!data.length" @click="exportJson">
        导出 JSON
      </el-button>

      <span v-if="data.length" class="summary">
        {{ data.length }} 条 · {{ formatTime(capturedAt) }}
      </span>
    </div>

    <!-- 错误 -->
    <el-alert v-if="error" :title="error" type="error" show-icon :closable="false" style="margin-bottom: 10px" />

    <!-- 空状态 -->
    <el-empty v-else-if="!loading && !data.length" description="点击「采集」获取数据" :image-size="80" />

    <!-- 线索商品（表格统一展示） -->
    <div v-else class="table-wrap">
      <el-table
        v-if="activeTab === 'clues'"
        :data="data"
        size="small"
        stripe
        :default-sort="{ prop: 'gmv', order: 'descending' }"
      >
        <el-table-column label="商品" min-width="280">
          <template #default="{ row }">
            <div class="clue-product">
              <el-image
                :src="row.clue_detail?.product_pic_url"
                fit="cover"
                class="clue-product__img"
                :preview-src-list="[row.clue_detail?.product_pic_url]"
                preview-teleported
              />
              <div class="clue-product__info">
                <div class="clue-product__name" :title="row.clue_detail?.name">
                  {{ row.clue_detail?.name }}
                </div>
                <div class="clue-product__cats">
                  {{ [row.clue_detail?.first_name, row.clue_detail?.second_name].filter(Boolean).join(" / ") }}
                </div>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="clue_detail.price_min" label="最低价" width="90" align="right">
          <template #default="{ row }">
            ¥{{ row.clue_detail?.price_min }}
          </template>
        </el-table-column>
        <el-table-column prop="clue_detail.price_max" label="最高价" width="90" align="right">
          <template #default="{ row }">
            ¥{{ row.clue_detail?.price_max }}
          </template>
        </el-table-column>
        <el-table-column prop="clue_detail.gmv" label="GMV" width="100" align="right" sortable>
          <template #default="{ row }">
            {{ fmtNum(row.clue_detail?.gmv) }}
          </template>
        </el-table-column>
        <el-table-column prop="clue_detail.order_num" label="订单" width="90" align="right" sortable>
          <template #default="{ row }">
            {{ fmtNum(row.clue_detail?.order_num) }}
          </template>
        </el-table-column>
        <el-table-column prop="clue_detail.clue_channel" label="来源" width="110">
          <template #default="{ row }">
            {{ clueChannelLabel(row.clue_detail?.clue_channel) }}
          </template>
        </el-table-column>
      </el-table>

      <el-table v-else :data="data" size="small" stripe>
        <el-table-column
          v-for="col in visibleCols"
          :key="col.prop"
          :prop="col.prop"
          :label="col.label"
          :width="col.width"
          :min-width="col.minWidth"
        >
          <template #default="{ row }">
            <template v-if="col.prop.includes('img') || col.prop.includes('pic')">
              <el-image
                v-if="row[col.prop]"
                :src="row[col.prop]"
                :preview-src-list="[row[col.prop]]"
                fit="cover"
                style="width: 40px; height: 40px"
              />
            </template>
            <template v-else-if="typeof row[col.prop] === 'object'">
              {{ JSON.stringify(row[col.prop]).substring(0, 120) }}
            </template>
            <template v-else>
              {{ row[col.prop] }}
            </template>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 原始 JSON 弹窗 -->
    <el-dialog v-model="showJson" title="原始结果" width="70%" destroy-on-close>
      <pre class="json-pre">{{ JSON.stringify(data, null, 2) }}</pre>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import {
  ElTabs, ElTabPane, ElButton, ElSelect, ElOption, ElInputNumber,
  ElAlert, ElEmpty, ElTable, ElTableColumn, ElImage, ElDialog,
} from "element-plus";
import {
  collectDoudianClues, collectDoudianCategories, collectDoudianTopics,
  collectDoudianProfits, collectDoudianLabels, collectDoudianHotWords,
} from "@/api/external/toolkit";

const props = defineProps<{ clientId: string; profileId?: string }>();

const tabs = [
  { key: "clues", label: "线索商品池" },
  { key: "categories", label: "分类字典" },
  { key: "topics", label: "热门话题" },
  { key: "profits", label: "任务激励" },
  { key: "labels", label: "线索标签" },
  { key: "hot-words", label: "推荐搜索词" },
];

const clueTypeTabs = ["clues", "topics", "profits", "labels"];

const activeTab = ref("clues");
const clueTypeNew = ref(9);
const pageSize = ref(20);
const loading = ref(false);
const error = ref("");
const data = ref<any[]>([]);
const capturedAt = ref<string>("");
const showJson = ref(false);

const visibleCols = computed(() => {
  switch (activeTab.value) {
    case "topics":
      return [
        { prop: "topic_id", label: "ID", width: 70 },
        { prop: "topic_name", label: "话题", minWidth: 160 },
        { prop: "topic_recommendation", label: "推荐语", minWidth: 260 },
        { prop: "header_background_img", label: "封面", width: 60 },
      ];
    case "profits":
      return [
        { prop: "profit_id", label: "ID", width: 70 },
        { prop: "profit_name", label: "激励", minWidth: 140 },
        { prop: "short_text", label: "描述", minWidth: 220 },
      ];
    case "labels":
      return [
        { prop: "label_id", label: "ID", width: 70 },
        { prop: "label_name", label: "标签", minWidth: 140 },
        { prop: "label_desc", label: "描述", minWidth: 220 },
      ];
    case "hot-words":
      return [{ prop: "word", label: "推荐搜索词", minWidth: 240 }];
    case "categories":
      return [
        { prop: "label", label: "分类名称", minWidth: 220 },
        { prop: "value", label: "分类 ID", width: 120 },
        { prop: "children", label: "子分类", width: 90 },
      ];
    default:
      return [{ prop: "data", label: "数据" }];
  }
});

function clueChannelLabel(ch: string) {
  const map: Record<string, string> = {
    query_none_less: "低竞争",
    choice_low_price: "低价优选",
    choice_high_gmv: "高GMV优选",
    hot_sales: "热销",
    rank: "榜单",
  };
  return map[ch] || ch || "-";
}

function fmtNum(n: number) {
  if (!n) return "-";
  if (n >= 10000) return (n / 10000).toFixed(1) + "万";
  return String(n);
}

function formatTime(iso: string) {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString();
}

function extractResult(raw: any): { code?: number; data?: any[]; error?: string } {
  if (!raw) return {};
  const v = raw?.result ?? raw?.actionResult ?? raw?.data?.result ?? raw;
  if (v && typeof v === "object") return v;
  return {};
}

async function loadData() {
  loading.value = true;
  error.value = "";
  try {
    const params: any = { profileId: props.profileId };
    if (activeTab.value === "clues") {
      params.pageSize = pageSize.value;
      params.clueTypeNew = clueTypeNew.value;
    } else if (clueTypeTabs.includes(activeTab.value)) {
      params.clueTypeNew = clueTypeNew.value;
    }

    let res: any;
    switch (activeTab.value) {
      case "clues": res = await collectDoudianClues(props.clientId, params); break;
      case "categories": res = await collectDoudianCategories(props.clientId, params); break;
      case "topics": res = await collectDoudianTopics(props.clientId, params); break;
      case "profits": res = await collectDoudianProfits(props.clientId, params); break;
      case "labels": res = await collectDoudianLabels(props.clientId, params); break;
      case "hot-words": res = await collectDoudianHotWords(props.clientId, params); break;
    }

    console.log("[doudian] raw API response:", res);
    console.log("[doudian] response keys:", res ? Object.keys(res) : "null");

    const parsed = extractResult(res);
    console.log("[doudian] extracted result:", parsed);

    if (parsed.error) {
      error.value = `API error: ${parsed.error}`;
      data.value = [];
    } else if (parsed.data) {
      data.value = Array.isArray(parsed.data) ? parsed.data : [];
      capturedAt.value = new Date().toISOString();
    } else if (parsed.success === false) {
      error.value = parsed.message || "采集失败（success=false）";
      data.value = [];
    } else {
      // 兜底：打印完整 parsed 让用户看 console
      console.warn("[doudian] 无 data 无 error，parsed 完整结构:", parsed);
      error.value = `返回结构异常，请检查浏览器控制台。keys: ${parsed ? Object.keys(parsed).join(",") : "null"}`;
      data.value = [];
    }
  } catch (e: any) {
    console.error("[doudian] loadData exception:", e);
    error.value = e?.message || "采集失败";
  } finally {
    loading.value = false;
  }
}

function exportJson() {
  const blob = new Blob([JSON.stringify(data.value, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `doudian-${activeTab.value}-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

watch(activeTab, () => {
  data.value = [];
  error.value = "";
});
</script>

<style scoped>
.chapter-panel { padding: 0; }

.chapter-tabs { margin-bottom: 16px; }
.chapter-tabs :deep(.el-tabs__item) { font-size: 13px; }

.toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  border-bottom: 1px solid var(--el-border-color-lighter);
  padding-bottom: 10px;
}
.summary {
  margin-left: auto;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.table-wrap { margin-top: 8px; }

/* 线索商品表格里的商品列 */
.clue-product {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}
.clue-product__img {
  width: 48px;
  height: 48px;
  border-radius: 4px;
  flex-shrink: 0;
  background: var(--el-fill-color-lighter);
}
.clue-product__info { min-width: 0; flex: 1; }
.clue-product__name {
  font-size: 13px;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}
.clue-product__cats {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-top: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 原始结果代码区 */
.json-pre {
  max-height: 60vh;
  overflow: auto;
  font-size: 12px;
  line-height: 1.5;
  padding: 12px 14px;
  background: var(--el-fill-color-lighter);
  border-radius: 4px;
  white-space: pre-wrap;
  word-break: break-all;
}
</style>
