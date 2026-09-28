<template>
  <ContentWrap :plain="true">
    <ListPageLayout class="remotion-template-page">
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
                <el-form-item label="关键词">
                  <el-input
                    v-model="queryParams.keyword"
                    size="small"
                    placeholder="模板名称或 code"
                    clearable
                    @keyup.enter="load(1)"
                    @change="(val: string) => { if (!val) load(1); }"
                  />
                </el-form-item>
              </el-col>
              <el-col
                class="list-page-search-form__col--narrow"
                :xs="24"
                :sm="12"
                :md="8"
                :lg="5"
                :xl="4"
              >
                <el-form-item label="可见范围">
                  <el-select
                    v-model="queryParams.scope"
                    size="small"
                    clearable
                    placeholder="全部范围"
                    @change="load(1)"
                  >
                    <el-option label="官方" value="official" />
                    <el-option label="共享" value="shared" />
                    <el-option label="未列出" value="unlisted" />
                    <el-option label="私有" value="private" />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col
                class="list-page-search-form__col--narrow"
                :xs="24"
                :sm="12"
                :md="8"
                :lg="5"
                :xl="4"
              >
                <el-form-item label="实现形态">
                  <el-select
                    v-model="queryParams.implementationKind"
                    size="small"
                    clearable
                    placeholder="全部形态"
                    @change="load(1)"
                  >
                    <el-option label="内置引擎" value="builtin" />
                    <el-option label="声明式结构" value="structure" />
                    <el-option label="代码组件" value="component" />
                  </el-select>
                </el-form-item>
              </el-col>
            </el-row>
            <div class="list-page-search-form__actions">
              <el-button size="small" type="primary" :icon="Search" :loading="loading" @click="load(1)">
                搜索
              </el-button>
              <el-button size="small" @click="load(1)">刷新</el-button>
            </div>
          </el-form>
        </div>
      </template>

      <template #table>
        <div class="list-page-panel list-page-panel--flat list-page-table-panel list-page-table-panel--flat">
          <div class="list-page-table-panel__body">
            <div class="common-table">
              <vxe-grid
                v-bind="gridOptions"
                :max-height="tableMaxHeight"
                :data="list"
                :loading="loading"
              >
                <template #nameSlot="{ row }">
                  <div class="flex items-center gap-1.5">
                    <span class="font-medium text-[var(--el-text-color-primary)]">{{ row.name }}</span>
                    <el-tag v-if="row.isSystem" size="small" type="info">系统</el-tag>
                    <el-tag v-else size="small" type="warning">用户</el-tag>
                  </div>
                </template>

                <template #codeSlot="{ row }">
                  <span class="tpl-code-tag">{{ row.code }}</span>
                </template>

                <template #kindSlot="{ row }">
                  <el-tag size="small" :type="kindTagType(row.implementationKind)">
                    {{ kindLabel(row.implementationKind) }}
                  </el-tag>
                </template>

                <template #compSlot="{ row }">
                  <div class="tpl-comp-cell">
                    <span>{{ row.compositionId }}</span>
                    <span class="tpl-comp-meta">{{ row.width }}×{{ row.height }} · {{ row.fps }}fps · {{ row.durationInFrames }}f</span>
                  </div>
                </template>

                <template #scopeSlot="{ row }">
                  <el-tag size="small" effect="plain">{{ scopeLabel(row.scope) }}</el-tag>
                </template>

                <template #operationSlot="{ row }">
                  <div class="flex items-center gap-2">
                    <el-button size="small" link type="primary" @click="openDetail(row)">详情</el-button>
                    <el-button size="small" link type="primary" @click="exportPkg(row)">导出</el-button>
                    <el-popconfirm
                      v-if="!row.isSystem"
                      title="确认删除该模板？"
                      @confirm="remove(row)"
                    >
                      <template #reference>
                        <el-button size="small" link type="danger">删除</el-button>
                      </template>
                    </el-popconfirm>
                  </div>
                </template>
              </vxe-grid>
            </div>
          </div>
        </div>
        <div class="list-page-panel list-page-panel--flat list-page-table-panel__pagination list-page-table-panel__pagination--flat">
          <el-pagination
            background
            layout="total, prev, pager, next, sizes"
            :total="total"
            :current-page="page"
            :page-size="pageSize"
            :page-sizes="[10, 20, 50]"
            @current-change="(p: number) => load(p)"
            @size-change="(s: number) => { pageSize = s; load(1); }"
          />
        </div>
      </template>
    </ListPageLayout>

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
            <span class="tpl-hash">{{ (detail.contentHash || '-').slice(0, 16) }}</span>
          </el-descriptions-item>
        </el-descriptions>

        <h4 class="tpl-json-title">defaultProps</h4>
        <pre class="tpl-json-block">{{ pretty(detail.defaultProps) }}</pre>

        <h4 class="tpl-json-title">propsSchema / paramHints</h4>
        <pre class="tpl-json-block">{{ pretty({ propsSchema: detail.propsSchema, paramHints: detail.paramHints }) }}</pre>

        <h4 class="tpl-json-title">implementation</h4>
        <pre class="tpl-json-block">{{ pretty({ kind: detail.implementationKind, builtinKey: detail.builtinKey, structure: detail.structure, codeAssets: detail.codeAssets }) }}</pre>

        <h4 class="tpl-json-title">meta / editability</h4>
        <pre class="tpl-json-block">{{ pretty({ meta: detail.meta, editability: detail.editability }) }}</pre>
      </template>
    </el-drawer>
  </ContentWrap>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { ElMessage } from 'element-plus';
import { Search } from '@element-plus/icons-vue';
import ContentWrap from '@/components/ContentWrap/src/ContentWrap.vue';
import ListPageLayout from '@/components/ListPageLayout/index.vue';
import {
  buildOperationColumn,
  buildTimeColumn,
  commonGridOptions,
  useTableMaxHeight,
} from '@/common/table';
import {
  deleteRemotionTemplate,
  exportRemotionTemplate,
  getRemotionTemplate,
  getRemotionTemplatePage,
  type RemotionTemplateItem,
} from '@/api/remotion-template';

const loading = ref(false);
const list = ref<RemotionTemplateItem[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(20);
const detailVisible = ref(false);
const detail = ref<RemotionTemplateItem | null>(null);
const tableMaxHeight = useTableMaxHeight(240, 360);

const queryParams = reactive({
  keyword: '',
  scope: '',
  implementationKind: '',
});

const gridOptions = computed(() => ({
  ...commonGridOptions,
  rowConfig: { keyField: 'id' },
  columns: [
    { title: '模板名称', field: 'name', minWidth: 180, slots: { default: 'nameSlot' } },
    { title: '标识码 (Code)', field: 'code', minWidth: 170, slots: { default: 'codeSlot' } },
    { title: '分类', field: 'category', width: 100 },
    { title: '实现形态', field: 'implementationKind', width: 100, slots: { default: 'kindSlot' } },
    { title: 'Composition', field: 'compositionId', minWidth: 190, slots: { default: 'compSlot' } },
    { title: '版本', field: 'version', width: 80, align: 'center' },
    { title: '范围', field: 'scope', width: 90, align: 'center', slots: { default: 'scopeSlot' } },
    buildTimeColumn('创建时间', 'createTime', 150),
    buildOperationColumn('operationSlot', 150),
  ],
}));

function kindLabel(k?: string) {
  return k === 'builtin' ? '内置引擎' : k === 'component' ? '代码组件' : '声明式结构';
}
function kindTagType(k?: string) {
  return k === 'builtin' ? 'info' : k === 'component' ? 'danger' : 'success';
}
function scopeLabel(s?: string) {
  return s === 'official' ? '官方' : s === 'shared' ? '共享' : s === 'unlisted' ? '未列出' : '私有';
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
      keyword: queryParams.keyword || undefined,
      scope: queryParams.scope || undefined,
      implementationKind: queryParams.implementationKind || undefined,
    });
    const result: any = data;
    list.value = Array.isArray(result) ? result : result?.list || [];
    total.value = Number(result?.total ?? list.value.length) || 0;
  } catch (e: any) {
    ElMessage.error(e?.message || '加载失败');
  } finally {
    loading.value = false;
  }
}

async function openDetail(row: RemotionTemplateItem) {
  try {
    detail.value = await getRemotionTemplate(row.id || row.code);
    detailVisible.value = true;
  } catch (e: any) {
    ElMessage.error(e?.message || '加载详情失败');
  }
}

async function exportPkg(row: RemotionTemplateItem) {
  try {
    const pkg = await exportRemotionTemplate(row.id || row.code);
    const blob = new Blob([JSON.stringify(pkg, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${row.code}.ytpkg.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    ElMessage.success('模板包已导出');
  } catch (e: any) {
    ElMessage.error(e?.message || '导出失败');
  }
}

async function remove(row: RemotionTemplateItem) {
  try {
    await deleteRemotionTemplate(row.id || row.code);
    ElMessage.success('已删除');
    load(page.value);
  } catch (e: any) {
    ElMessage.error(e?.message || '删除失败');
  }
}

onMounted(() => load(1));
</script>

<style scoped lang="scss">
:deep(.remotion-template-page) {
  gap: 10px;
  padding: 8px 0 0;
}

:deep(.remotion-template-page .list-page-layout__main) {
  gap: 10px;
}

:deep(.remotion-template-page .list-page-filter--flat) {
  gap: 10px;
  padding-bottom: 10px;
}

:deep(.remotion-template-page .list-page-table-panel__body) {
  padding: 0;
}

:deep(.remotion-template-page .list-page-table-panel__pagination--flat) {
  padding: 14px 0 0;
  justify-content: flex-end;
  border-top: 1px solid var(--list-page-panel-border, var(--el-border-color-lighter));
}

.tpl-code-tag {
  font-family: var(--el-font-family-monospace, monospace);
  font-size: 11px;
  padding: 1px 6px;
  border-radius: 4px;
  background: color-mix(in srgb, var(--el-color-primary) 10%, transparent);
  color: var(--el-color-primary);
  border: 1px solid color-mix(in srgb, var(--el-color-primary) 28%, transparent);
  display: inline-block;
  line-height: 18px;
}

.tpl-comp-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;

  .tpl-comp-meta {
    font-size: 11px;
    color: var(--el-text-color-secondary);
  }
}

.tpl-json-title {
  margin: 16px 0 6px;
  font-size: 13px;
  color: var(--el-text-color-primary);
}

.tpl-json-block {
  max-height: 240px;
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

.tpl-hash {
  font-family: monospace;
  font-size: 12px;
}
</style>
