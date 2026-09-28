<template>
  <div class="remotion-template-page">
    <div class="page-header">
      <div class="page-header__title">
        <h2>视频模板库</h2>
        <span class="page-header__desc">
          Remotion 模板包（对齐官方 Composition 契约）· 系统模板与用户沉淀模板统一管理
        </span>
      </div>
      <div class="page-header__actions">
        <el-input
          v-model="keyword"
          placeholder="搜索模板名称 / code"
          clearable
          style="width: 220px"
          @keyup.enter="load(1)"
          @clear="load(1)"
        />
        <el-select v-model="scope" placeholder="范围" clearable style="width: 120px" @change="load(1)">
          <el-option label="官方" value="official" />
          <el-option label="共享" value="shared" />
          <el-option label="私有" value="private" />
        </el-select>
        <el-select v-model="kind" placeholder="实现形态" clearable style="width: 130px" @change="load(1)">
          <el-option label="内置引擎" value="builtin" />
          <el-option label="声明式结构" value="structure" />
          <el-option label="代码组件" value="component" />
        </el-select>
        <el-button type="primary" @click="load(1)">刷新</el-button>
      </div>
    </div>

    <el-table v-loading="loading" :data="list" stripe border style="width: 100%">
      <el-table-column label="模板" min-width="220">
        <template #default="{ row }">
          <div class="tpl-cell">
            <el-tag v-if="row.isSystem" size="small" type="info" class="tpl-tag">系统</el-tag>
            <el-tag v-else size="small" type="warning" class="tpl-tag">用户</el-tag>
            <span class="tpl-name">{{ row.name }}</span>
            <span class="tpl-code">{{ row.code }}</span>
          </div>
        </template>
      </el-table-column>
      <el-table-column prop="category" label="分类" width="110" />
      <el-table-column label="实现形态" width="120">
        <template #default="{ row }">
          <el-tag size="small" :type="kindTagType(row.implementationKind)">
            {{ kindLabel(row.implementationKind) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="Composition" min-width="200">
        <template #default="{ row }">
          <div class="tpl-comp">
            <span>{{ row.compositionId }}</span>
            <span class="tpl-comp-meta">{{ row.width }}×{{ row.height }} · {{ row.fps }}fps · {{ row.durationInFrames }}f</span>
          </div>
        </template>
      </el-table-column>
      <el-table-column prop="version" label="版本" width="80" />
      <el-table-column label="范围" width="90">
        <template #default="{ row }">
          <el-tag size="small" effect="plain">{{ scopeLabel(row.scope) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="createTime" label="创建时间" width="160" />
      <el-table-column label="操作" width="200" fixed="right">
        <template #default="{ row }">
          <el-button size="small" link type="primary" @click="openDetail(row)">详情</el-button>
          <el-button size="small" link type="primary" @click="exportPkg(row)">导出</el-button>
          <el-button
            v-if="!row.isSystem"
            size="small"
            link
            type="danger"
            @click="remove(row)"
          >删除</el-button>
          <el-button v-else size="small" link type="info" disabled>系统内置</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-pagination
      class="page-pagination"
      background
      layout="total, prev, pager, next, sizes"
      :total="total"
      :current-page="page"
      :page-size="pageSize"
      :page-sizes="[10, 20, 50]"
      @current-change="(p: number) => load(p)"
      @size-change="(s: number) => { pageSize = s; load(1); }"
    />

    <el-drawer v-model="detailVisible" title="模板包详情" size="60%">
      <template v-if="detail">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="名称">{{ detail.name }}</el-descriptions-item>
          <el-descriptions-item label="code">{{ detail.code }}</el-descriptions-item>
          <el-descriptions-item label="实现形态">{{ kindLabel(detail.implementationKind) }}</el-descriptions-item>
          <el-descriptions-item label="Composition">{{ detail.compositionId }}</el-descriptions-item>
          <el-descriptions-item label="画幅">{{ detail.width }}×{{ detail.height }}</el-descriptions-item>
          <el-descriptions-item label="帧率 / 帧数">{{ detail.fps }}fps / {{ detail.durationInFrames }}f</el-descriptions-item>
          <el-descriptions-item label="范围">{{ scopeLabel(detail.scope) }}</el-descriptions-item>
          <el-descriptions-item label="版本">{{ detail.version }}</el-descriptions-item>
          <el-descriptions-item label="来源记录">{{ detail.sourceRecordId || '-' }}</el-descriptions-item>
          <el-descriptions-item label="contentHash">
            <span class="hash">{{ (detail.contentHash || '-').slice(0, 16) }}</span>
          </el-descriptions-item>
        </el-descriptions>

        <h4 class="json-title">defaultProps（官方 default inputProps）</h4>
        <pre class="json-block">{{ pretty(detail.defaultProps) }}</pre>

        <h4 class="json-title">propsSchema / paramHints（参数自描述）</h4>
        <pre class="json-block">{{ pretty({ propsSchema: detail.propsSchema, paramHints: detail.paramHints }) }}</pre>

        <h4 class="json-title">implementation（结构本体）</h4>
        <pre class="json-block">{{ pretty({ kind: detail.implementationKind, builtinKey: detail.builtinKey, structure: detail.structure, codeAssets: detail.codeAssets }) }}</pre>

        <h4 class="json-title">meta / editability</h4>
        <pre class="json-block">{{ pretty({ meta: detail.meta, editability: detail.editability }) }}</pre>
      </template>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import {
  deleteRemotionTemplate,
  exportRemotionTemplate,
  getRemotionTemplate,
  getRemotionTemplatePage,
  type RemotionTemplateItem,
} from "@/api/remotion-template";

const list = ref<RemotionTemplateItem[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(20);
const keyword = ref("");
const scope = ref("");
const kind = ref("");
const loading = ref(false);
const detailVisible = ref(false);
const detail = ref<RemotionTemplateItem | null>(null);

function kindLabel(k?: string) {
  return k === "builtin" ? "内置引擎" : k === "component" ? "代码组件" : "声明式结构";
}
function kindTagType(k?: string) {
  return k === "builtin" ? "info" : k === "component" ? "danger" : "success";
}
function scopeLabel(s?: string) {
  return s === "official" ? "官方" : s === "shared" ? "共享" : s === "unlisted" ? "未列出" : "私有";
}
function pretty(obj: any) {
  try {
    return JSON.stringify(obj ?? null, null, 2);
  } catch {
    return String(obj);
  }
}

async function load(p = 1) {
  page.value = p;
  loading.value = true;
  try {
    const data = await getRemotionTemplatePage({
      currentPage: p,
      pageSize: pageSize.value,
      keyword: keyword.value || undefined,
      scope: scope.value || undefined,
      implementationKind: kind.value || undefined,
    });
    list.value = data?.list || [];
    total.value = data?.total || 0;
  } catch (e: any) {
    ElMessage.error(e?.message || "加载失败");
  } finally {
    loading.value = false;
  }
}

async function openDetail(row: RemotionTemplateItem) {
  try {
    detail.value = await getRemotionTemplate(row.id || row.code);
    detailVisible.value = true;
  } catch (e: any) {
    ElMessage.error(e?.message || "加载详情失败");
  }
}

async function exportPkg(row: RemotionTemplateItem) {
  try {
    const pkg = await exportRemotionTemplate(row.id || row.code);
    const blob = new Blob([JSON.stringify(pkg, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${row.code}.ytpkg.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    ElMessage.success("模板包已导出");
  } catch (e: any) {
    ElMessage.error(e?.message || "导出失败");
  }
}

async function remove(row: RemotionTemplateItem) {
  await ElMessageBox.confirm(`确认删除模板「${row.name}」？`, "提示", { type: "warning" });
  try {
    await deleteRemotionTemplate(row.id || row.code);
    ElMessage.success("已删除");
    load(page.value);
  } catch (e: any) {
    ElMessage.error(e?.message || "删除失败");
  }
}

onMounted(() => load(1));
</script>

<style scoped lang="scss">
.remotion-template-page {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 12px;
}

.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;

  &__title {
    h2 {
      margin: 0 0 4px;
      font-size: 18px;
    }
  }

  &__desc {
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }

  &__actions {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }
}

.tpl-cell {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  min-width: 0;

  .tpl-tag {
    margin-bottom: 2px;
  }

  .tpl-name {
    font-weight: 500;
    color: var(--el-text-color-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 100%;
  }

  .tpl-code {
    font-size: 12px;
    color: var(--el-text-color-secondary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 100%;
  }
}

.tpl-comp {
  display: flex;
  flex-direction: column;
  gap: 2px;

  .tpl-comp-meta {
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }
}

.page-pagination {
  display: flex;
  justify-content: flex-end;
  padding-top: 8px;
}

.json-title {
  margin: 16px 0 6px;
  font-size: 13px;
  color: var(--el-text-color-primary);
}

.json-block {
  max-height: 260px;
  overflow: auto;
  padding: 10px 12px;
  margin: 0;
  font-size: 12px;
  line-height: 1.5;
  color: var(--el-text-color-regular);
  background: var(--el-fill-color-light);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 6px;
  white-space: pre-wrap;
  word-break: break-word;
}

.hash {
  font-family: monospace;
  font-size: 12px;
}
</style>
