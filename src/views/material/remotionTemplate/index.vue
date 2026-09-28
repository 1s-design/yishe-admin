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
              <el-button size="small" type="primary" :icon="Plus" @click="openCreate">
                新增模板
              </el-button>
              <el-button size="small" type="success" plain :icon="Upload" @click="openImport">
                导入模板包
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

    <!-- 新增模板 -->
    <el-dialog v-model="createVisible" title="新增模板" width="760px" destroy-on-close>
      <el-form :model="createForm" label-width="110px">
        <el-row :gutter="12">
          <el-col :span="12">
            <el-form-item label="模板名称" required>
              <el-input v-model="createForm.name" placeholder="例如：产品三卡上滑" maxlength="60" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="标识码" required>
              <el-input v-model="createForm.code" placeholder="例如：product-three-cards" maxlength="80" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="分类">
              <el-input v-model="createForm.category" placeholder="我的模板" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="实现形态">
              <el-select v-model="createForm.implementationKind" style="width: 100%">
                <el-option label="声明式结构 (structure)" value="structure" />
                <el-option label="代码组件 (component)" value="component" />
                <el-option label="内置引擎 (builtin)" value="builtin" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="说明">
              <el-input v-model="createForm.description" type="textarea" :rows="2" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="12">
          <el-col :span="8">
            <el-form-item label="画幅宽">
              <el-input-number v-model="createForm.width" :min="240" :max="4096" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="画幅高">
              <el-input-number v-model="createForm.height" :min="240" :max="4096" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="帧率">
              <el-input-number v-model="createForm.fps" :min="12" :max="60" style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="默认 defaultProps">
          <el-input v-model="createForm.defaultPropsJson" type="textarea" :rows="4" placeholder='{"title": "示例标题"}' />
        </el-form-item>

        <el-form-item v-if="createForm.implementationKind === 'structure'" label="SceneGraph 结构">
          <el-input v-model="createForm.structureJson" type="textarea" :rows="8" placeholder='{"meta": {}, "scenes": [{"duration": 3, "layers": [{"type": "headline", "text": "{{title}}"}]}]}' />
        </el-form-item>
        <el-form-item v-else-if="createForm.implementationKind === 'builtin'" label="内置组件 Key">
          <el-select v-model="createForm.builtinKey" style="width: 100%" placeholder="选择内置引擎组件">
            <el-option v-for="t in builtinOptions" :key="t" :label="t" :value="t" />
          </el-select>
        </el-form-item>
        <el-form-item v-else label="组件代码 (TSX)">
          <el-input v-model="createForm.codeAssetsJson" type="textarea" :rows="6" placeholder='[{"name": "MyComp", "kind": "component", "code": "..."}]' />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createVisible = false">取消</el-button>
        <el-button type="primary" :loading="createLoading" @click="submitCreate">保存</el-button>
      </template>
    </el-dialog>

    <!-- 导入模板包 -->
    <el-dialog v-model="importVisible" title="导入模板包" width="680px" destroy-on-close>
      <el-input
        v-model="importJson"
        type="textarea"
        :rows="14"
        placeholder='粘贴 .ytpkg.json 内容'
      />
      <template #footer>
        <el-button @click="importVisible = false">取消</el-button>
        <el-button type="primary" :loading="importLoading" @click="submitImport">导入</el-button>
      </template>
    </el-dialog>

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
import { Plus, Search, Upload } from '@element-plus/icons-vue';
import ContentWrap from '@/components/ContentWrap/src/ContentWrap.vue';
import ListPageLayout from '@/components/ListPageLayout/index.vue';
import {
  buildOperationColumn,
  buildTimeColumn,
  commonGridOptions,
  useTableMaxHeight,
} from '@/common/table';
import {
  createRemotionTemplate,
  deleteRemotionTemplate,
  exportRemotionTemplate,
  getRemotionTemplate,
  getRemotionTemplatePage,
  importRemotionTemplate,
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

// ─── 新增模板 ────────────────────────────────────────────────
const builtinOptions = [
  'gradient-image-transition',
  'simple-fade-text',
  'slide-up-cards',
  'progress-steps',
  'image-showcase',
  'quote-reveal',
  'knowledge-cards',
  'data-insight',
  'cinematic-story',
  'mood-kinetic',
  'editorial-montage',
];

const createVisible = ref(false);
const createLoading = ref(false);
const createForm = reactive({
  name: '',
  code: '',
  category: '我的模板',
  description: '',
  implementationKind: 'structure' as 'structure' | 'component' | 'builtin',
  width: 1080,
  height: 1920,
  fps: 30,
  defaultPropsJson: '{}',
  structureJson: '',
  builtinKey: '',
  codeAssetsJson: '[]',
});

function parseJsonField(raw: string, fallback: any, label: string) {
  const text = (raw || '').trim();
  if (!text) return fallback;
  try {
    return JSON.parse(text);
  } catch (e: any) {
    throw new Error(`${label} JSON 解析失败: ${e?.message || e}`);
  }
}

function openCreate() {
  createForm.name = '';
  createForm.code = '';
  createForm.category = '我的模板';
  createForm.description = '';
  createForm.implementationKind = 'structure';
  createForm.width = 1080;
  createForm.height = 1920;
  createForm.fps = 30;
  createForm.defaultPropsJson = '{}';
  createForm.structureJson = '';
  createForm.builtinKey = '';
  createForm.codeAssetsJson = '[]';
  createVisible.value = true;
}

async function submitCreate() {
  if (!createForm.name.trim() || !createForm.code.trim()) {
    ElMessage.warning('请填写模板名称与标识码');
    return;
  }
  createLoading.value = true;
  try {
    const defaultProps = parseJsonField(createForm.defaultPropsJson, {}, 'defaultProps');
    const structure =
      createForm.implementationKind === 'structure'
        ? parseJsonField(createForm.structureJson, null, 'SceneGraph')
        : null;
    const codeAssets =
      createForm.implementationKind === 'component'
        ? parseJsonField(createForm.codeAssetsJson, [], 'codeAssets')
        : null;

    if (createForm.implementationKind === 'structure' && !structure?.scenes?.length) {
      throw new Error('声明式结构需要包含至少一个 scene');
    }
    if (createForm.implementationKind === 'builtin' && !createForm.builtinKey) {
      throw new Error('请选择内置组件 Key');
    }

    // 由结构自动推导 durationInFrames
    const fps = createForm.fps || 30;
    const totalSeconds = (structure?.scenes || []).reduce(
      (acc: number, s: any) => acc + (Number(s?.duration) || 0),
      0,
    );
    const durationInFrames = totalSeconds > 0 ? Math.round(totalSeconds * fps) : 300;

    await createRemotionTemplate({
      code: createForm.code.trim(),
      name: createForm.name.trim(),
      description: createForm.description,
      category: createForm.category || '我的模板',
      compositionId: `Tpl_${createForm.code.trim()}`,
      width: createForm.width,
      height: createForm.height,
      fps,
      durationInFrames,
      defaultProps,
      implementationKind: createForm.implementationKind,
      structure,
      codeAssets,
      builtinKey: createForm.implementationKind === 'builtin' ? createForm.builtinKey : undefined,
      scope: 'private',
    } as any);
    ElMessage.success('模板已创建');
    createVisible.value = false;
    load(1);
  } catch (e: any) {
    ElMessage.error(e?.message || '创建失败');
  } finally {
    createLoading.value = false;
  }
}

// ─── 导入模板包 ──────────────────────────────────────────────
const importVisible = ref(false);
const importLoading = ref(false);
const importJson = ref('');

function openImport() {
  importJson.value = '';
  importVisible.value = true;
}

async function submitImport() {
  const text = importJson.value.trim();
  if (!text) {
    ElMessage.warning('请粘贴模板包 JSON');
    return;
  }
  let pkg: any;
  try {
    pkg = JSON.parse(text);
  } catch (e: any) {
    ElMessage.error(`JSON 解析失败: ${e?.message || e}`);
    return;
  }
  importLoading.value = true;
  try {
    await importRemotionTemplate(pkg);
    ElMessage.success('模板包已导入');
    importVisible.value = false;
    load(1);
  } catch (e: any) {
    ElMessage.error(e?.message || '导入失败');
  } finally {
    importLoading.value = false;
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
