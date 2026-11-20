<template>
  <div class="chapter-panel">
    <!-- 采集方式切换 -->
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
      <el-input
        v-model="keyword"
        :placeholder="activeTab === 'search' ? '搜索词，如：鼠标垫' : '类目关键词，如：鼠标垫'"
        size="small"
        clearable
        style="width: 220px"
        @keyup.enter="loadData"
      />
      <el-input-number
        v-model="pageNo"
        :min="1"
        :max="999"
        size="small"
        controls-position="right"
        style="width: 90px"
      />
      <el-input-number
        v-model="pageSize"
        :min="5"
        :max="50"
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
        {{ data.length }} 条<template v-if="totalCount && totalCount !== data.length"> / 共 {{ totalCount }} 条</template> · {{ formatTime(capturedAt) }}
      </span>
    </div>

    <!-- 匹配类目 -->
    <div v-if="isChannelTab && matchedCategory" class="matched-line">
      匹配类目：{{ matchedCategory.path }}
    </div>

    <!-- 错误 -->
    <el-alert v-if="error" :title="error" type="error" show-icon :closable="false" style="margin-bottom: 10px" />

    <!-- 空状态 -->
    <el-empty v-else-if="!loading && !data.length" :description="activeTab === 'search' ? '输入搜索词后点击「采集」' : '输入类目关键词后点击「采集」'" :image-size="80" />

    <!-- 数据表：面向 AI 分析的关键词原料（商品名/图/类目/标签/同款热卖） -->
    <div v-else class="table-wrap">
      <el-table :data="data" size="small" stripe>
        <el-table-column label="商品" min-width="320">
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
                  {{ (row.clue_detail?.category_path || []).join(" / ") }}
                </div>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="推荐理由" min-width="150">
          <template #default="{ row }">
            <div class="tag-row" :title="labelTitle(row.clue_detail)">
              <el-tag
                v-for="l in labelNames(row.clue_detail)"
                :key="l"
                size="small"
                type="warning"
                class="mini-tag"
              >{{ l }}</el-tag>
              <span v-if="!labelNames(row.clue_detail).length" class="dim">-</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="同款热卖" min-width="220">
          <template #default="{ row }">
            <div class="tag-row" :title="hotSaleTitle(row)">
              <el-tag
                v-for="n in hotSaleNames(row).slice(0, 2)"
                :key="n"
                size="small"
                class="mini-tag mini-tag--clip"
              >{{ n }}</el-tag>
              <span v-if="hotSaleNames(row).length > 2" class="dim">+{{ hotSaleNames(row).length - 2 }}</span>
              <span v-if="!hotSaleNames(row).length" class="dim">-</span>
            </div>
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
  ElTabs, ElTabPane, ElButton, ElInput, ElInputNumber,
  ElAlert, ElEmpty, ElTable, ElTableColumn, ElImage, ElDialog, ElTag,
} from "element-plus";
import { collectDoudianSearch, collectDoudianOpportunity } from "@/api/external/toolkit";

const props = defineProps<{ clientId: string; profileId?: string }>();

const tabs = [
  { key: "search", label: "商机搜索" },
  { key: "all_product", label: "跟潜力爆品" },
  { key: "all_word", label: "追抖音热词" },
];

const activeTab = ref("search");
const isChannelTab = computed(() => activeTab.value !== "search");
const keyword = ref("");
const pageNo = ref(1);
const pageSize = ref(21);
const loading = ref(false);
const error = ref("");
const data = ref<any[]>([]);
const totalCount = ref<number>(0);
const matchedCategory = ref<any>(null);
const capturedAt = ref<string>("");
const showJson = ref(false);

function labelNames(cd: any): string[] {
  return (cd?.clue_label_list || []).map((l: any) => l?.label_name).filter(Boolean);
}

function labelTitle(cd: any) {
  return (cd?.clue_label_list || [])
    .map((l: any) => l?.top_rank_label_hover_text || l?.label_name)
    .filter(Boolean)
    .join("；");
}

function hotSaleNames(row: any): string[] {
  return (row?.hot_sale_products || []).map((p: any) => p?.prod_name).filter(Boolean);
}

function hotSaleTitle(row: any) {
  return hotSaleNames(row).join("\n");
}

function formatTime(iso: string) {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString();
}

function extractResult(raw: any): any {
  if (!raw) return {};
  // 服务端全局拦截器会把客户端 handler 返回体包一层：{code,message,status,data:{success,data:[...],...}}
  const inner = raw?.data;
  let v = raw;
  if (
    inner &&
    typeof inner === "object" &&
    !Array.isArray(inner) &&
    ("data" in inner || "error" in inner || "success" in inner)
  ) {
    v = inner;
  } else {
    v = raw?.result ?? raw?.actionResult ?? raw?.data?.result ?? raw;
  }
  if (v && typeof v === "object") return v;
  return {};
}

async function loadData() {
  loading.value = true;
  error.value = "";
  try {
    if (!keyword.value.trim()) {
      error.value = activeTab.value === "search" ? "请输入搜索词（如：鼠标垫）" : "请输入类目关键词（如：鼠标垫）";
      return;
    }
    const res =
      activeTab.value === "search"
        ? await collectDoudianSearch(props.clientId, {
            keyword: keyword.value.trim(),
            page: pageNo.value,
            pageSize: pageSize.value,
            profileId: props.profileId,
          })
        : await collectDoudianOpportunity(props.clientId, {
            channel: activeTab.value as any,
            keyword: keyword.value.trim(),
            page: pageNo.value,
            pageSize: pageSize.value,
            profileId: props.profileId,
          });

    console.log("[doudian] raw API response:", res);
    const parsed = extractResult(res);
    console.log("[doudian] extracted result:", parsed);

    if (parsed.error) {
      error.value = `API error: ${parsed.error}`;
      data.value = [];
      totalCount.value = 0;
      matchedCategory.value = null;
    } else if (parsed.data) {
      data.value = Array.isArray(parsed.data) ? parsed.data : [];
      totalCount.value = Number(parsed.count) || data.value.length;
      matchedCategory.value = parsed.matchedCategory || null;
      capturedAt.value = new Date().toISOString();
    } else if (parsed.success === false) {
      error.value = parsed.message || "采集失败（success=false）";
      data.value = [];
      totalCount.value = 0;
      matchedCategory.value = parsed.matchedCategory || null;
    } else {
      console.warn("[doudian] 无 data 无 error，parsed 完整结构:", parsed);
      error.value = `返回结构异常，请检查浏览器控制台。keys: ${parsed ? Object.keys(parsed).join(",") : "null"}`;
      data.value = [];
      totalCount.value = 0;
      matchedCategory.value = null;
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
  a.download = `doudian-${activeTab.value}-${keyword.value || "data"}-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

watch(activeTab, () => {
  data.value = [];
  error.value = "";
  totalCount.value = 0;
  matchedCategory.value = null;
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

.matched-line {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-bottom: 10px;
}

.table-wrap { margin-top: 8px; }

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

.tag-row {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  align-items: center;
}
.mini-tag {
  margin-right: 0;
  max-width: 200px;
}
.mini-tag--clip {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.dim {
  color: var(--el-text-color-secondary);
}

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
