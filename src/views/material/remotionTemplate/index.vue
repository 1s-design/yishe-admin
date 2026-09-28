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
                  <div class="flex items-center">
                    <el-dropdown
                      class="operation-dropdown"
                      placement="bottom-end"
                      @command="(command: string) => handleOperation(command, row)"
                    >
                      <el-button type="primary" link size="small">
                        操作
                        <el-icon class="el-icon--right"><ArrowDown /></el-icon>
                      </el-button>
                      <template #dropdown>
                        <el-dropdown-menu>
                          <el-dropdown-item command="detail">详情</el-dropdown-item>
                          <el-dropdown-item command="edit">编辑</el-dropdown-item>
                          <el-dropdown-item command="export">导出</el-dropdown-item>
                          <el-dropdown-item
                            v-if="!row.isSystem"
                            command="delete"
                            divided
                            class="operation-menu-danger"
                          >删除</el-dropdown-item>
                          <el-dropdown-item v-else command="system-disabled" disabled>
                            系统内置
                          </el-dropdown-item>
                        </el-dropdown-menu>
                      </template>
                    </el-dropdown>
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

    <!-- 新增 / 编辑模板 -->
    <el-dialog
      v-model="createVisible"
      fullscreen
      destroy-on-close
      class="tpl-editor-dialog"
    >
      <template #header>
        <div class="tpl-dialog-header">
          <div class="tpl-dialog-header__title">
            <span>{{ editingId ? '编辑模板' : '新增模板' }}</span>
            <span v-if="createForm.code" class="tpl-dialog-header__code">{{ createForm.code }}</span>
          </div>
        </div>
      </template>

      <div class="tpl-editor">
        <div class="tpl-section-label">基础信息</div>
        <div class="tpl-grid">
          <div class="tpl-field">
            <label>模板名称 <em>*</em></label>
            <el-input v-model="createForm.name" placeholder="产品三卡上滑" maxlength="60" />
          </div>
          <div class="tpl-field">
            <label>标识码 <em>*</em></label>
            <el-input v-model="createForm.code" placeholder="product-three-cards" maxlength="80" />
          </div>
          <div class="tpl-field">
            <label>分类</label>
            <el-input v-model="createForm.category" placeholder="我的模板" />
          </div>
          <div class="tpl-field">
            <label>实现形态</label>
            <el-radio-group v-model="createForm.implementationKind">
              <el-radio-button label="structure">声明式结构</el-radio-button>
              <el-radio-button label="component">代码组件</el-radio-button>
            </el-radio-group>
          </div>
          <div class="tpl-field tpl-field--wide">
            <label>说明</label>
            <el-input v-model="createForm.description" type="textarea" :rows="3" placeholder="模板用途简介" />
          </div>
        </div>

        <div class="tpl-section-label">Composition</div>
        <div class="tpl-grid tpl-grid--compact">
          <div class="tpl-field">
            <label>画幅宽</label>
            <el-input-number v-model="createForm.width" :min="240" :max="4096" controls-position="right" />
          </div>
          <div class="tpl-field">
            <label>画幅高</label>
            <el-input-number v-model="createForm.height" :min="240" :max="4096" controls-position="right" />
          </div>
          <div class="tpl-field">
            <label>帧率</label>
            <el-input-number v-model="createForm.fps" :min="12" :max="60" controls-position="right" />
          </div>
          <div class="tpl-field">
            <label>画幅预设</label>
            <div class="tpl-preset-row">
              <el-button size="small" @click="setOrientation('portrait')">竖屏</el-button>
              <el-button size="small" @click="setOrientation('landscape')">横屏</el-button>
              <el-button size="small" @click="setOrientation('square')">方形</el-button>
            </div>
          </div>
        </div>

        <div class="tpl-section-label">
          {{ createForm.implementationKind === 'structure' ? 'SceneGraph 结构' : '组件代码 (TSX)' }}
          <span class="tpl-section-hint">
            {{ createForm.implementationKind === 'structure' ? STRUCT_HINT : '函数体形式，最后 return React 元素；作用域含 frame/props/palette/spring 等' }}
          </span>
        </div>
        <el-input
          v-if="createForm.implementationKind === 'structure'"
          v-model="createForm.structureJson"
          type="textarea"
          :rows="22"
          class="tpl-code-input"
          placeholder='{"meta": {"title": "{{title}}"}, "scenes": [{"duration": 3, "layers": [{"type": "headline", "text": "{{title}}"}]}]}'
        />
        <el-input
          v-else
          v-model="createForm.codeAssetsJson"
          type="textarea"
          :rows="22"
          class="tpl-code-input"
          placeholder='[{"name": "MyComp", "kind": "component", "code": "const { frame, props } = scope; return <div>{props.title}</div>;"}]'
        />

        <div class="tpl-section-label">
          默认 defaultProps
          <span class="tpl-section-hint">Remotion Composition 的默认 inputProps</span>
        </div>
        <el-input
          v-model="createForm.defaultPropsJson"
          type="textarea"
          :rows="12"
          class="tpl-code-input"
          placeholder='{"title": "示例标题"}'
        />
      </div>

      <template #footer>
        <div class="tpl-dialog-footer">
          <el-button @click="createVisible = false">取消</el-button>
          <el-button type="primary" :loading="createLoading" @click="submitCreate">
            {{ editingId ? '保存修改' : '创建模板' }}
          </el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 导入模板包 -->
    <el-dialog v-model="importVisible" title="导入模板包" width="680px" destroy-on-close>
      <el-input
        v-model="importJson"
        type="textarea"
        :rows="20"
        placeholder="粘贴 .ytpkg.json 内容"
      />
      <template #footer>
        <el-button @click="importVisible = false">取消</el-button>
        <el-button type="primary" :loading="importLoading" @click="submitImport">导入</el-button>
      </template>
    </el-dialog>

    <!-- 模板包详情 -->
    <el-dialog
      v-model="detailVisible"
      fullscreen
      destroy-on-close
      class="tpl-editor-dialog"
    >
      <template #header>
        <div class="tpl-dialog-header">
          <div class="tpl-dialog-header__title">
            <span>{{ detail?.name || '模板包详情' }}</span>
            <span v-if="detail?.code" class="tpl-dialog-header__code">{{ detail.code }}</span>
            <el-tag v-if="detail?.isSystem" size="small" type="info">系统</el-tag>
            <el-tag size="small" :type="kindTagType(detail?.implementationKind)">
              {{ kindLabel(detail?.implementationKind) }}
            </el-tag>
          </div>
          <div class="tpl-dialog-header__actions">
            <el-button v-if="detail" @click="exportPkg(detail)">导出</el-button>
            <el-button v-if="detail && !detail.isSystem" type="primary" @click="openEdit(detail)">编辑</el-button>
            <el-button @click="detailVisible = false">关闭</el-button>
          </div>
        </div>
      </template>

      <div v-if="detail" class="tpl-editor">
        <div class="tpl-section-label">概览</div>
        <div class="tpl-stats">
          <div class="tpl-stat">
            <span class="tpl-stat__label">画幅</span>
            <span class="tpl-stat__value">{{ detail.width }}×{{ detail.height }}</span>
          </div>
          <div class="tpl-stat">
            <span class="tpl-stat__label">帧率</span>
            <span class="tpl-stat__value">{{ detail.fps }}fps</span>
          </div>
          <div class="tpl-stat">
            <span class="tpl-stat__label">帧数</span>
            <span class="tpl-stat__value">{{ detail.durationInFrames }}f</span>
          </div>
          <div class="tpl-stat">
            <span class="tpl-stat__label">版本</span>
            <span class="tpl-stat__value">{{ detail.version }}</span>
          </div>
          <div class="tpl-stat">
            <span class="tpl-stat__label">范围</span>
            <span class="tpl-stat__value">{{ scopeLabel(detail.scope) }}</span>
          </div>
          <div class="tpl-stat">
            <span class="tpl-stat__label">Composition</span>
            <span class="tpl-stat__value">{{ detail.compositionId }}</span>
          </div>
        </div>
        <div v-if="detail.description" class="tpl-desc">{{ detail.description }}</div>
        <div class="tpl-meta-row">
          <span v-if="detail.sourceRecordId">来源记录：{{ detail.sourceRecordId }}</span>
          <span>contentHash：<code class="tpl-hash">{{ (detail.contentHash || '-').slice(0, 16) }}</code></span>
        </div>

        <div class="tpl-section-label" style="margin-top: 18px;">数据</div>
        <el-tabs v-model="detailTab">
          <el-tab-pane label="defaultProps" name="defaultProps">
            <pre class="tpl-json-block">{{ pretty(detail.defaultProps) }}</pre>
          </el-tab-pane>
          <el-tab-pane label="参数 Schema" name="schema">
            <pre class="tpl-json-block">{{ pretty({ propsSchema: detail.propsSchema, paramHints: detail.paramHints }) }}</pre>
          </el-tab-pane>
          <el-tab-pane :label="detail.implementationKind === 'structure' ? '结构' : '代码'" name="impl">
            <pre class="tpl-json-block tpl-json-block--tall">{{ pretty(detail.implementationKind === 'structure' ? detail.structure : detail.codeAssets) }}</pre>
          </el-tab-pane>
          <el-tab-pane label="meta" name="meta">
            <pre class="tpl-json-block">{{ pretty({ meta: detail.meta, editability: detail.editability }) }}</pre>
          </el-tab-pane>
        </el-tabs>
      </div>
    </el-dialog>
  </ContentWrap>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { ArrowDown, Plus, Search, Upload } from '@element-plus/icons-vue';
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
  updateRemotionTemplate,
  type RemotionTemplateItem,
} from '@/api/remotion-template';

const loading = ref(false);
const list = ref<RemotionTemplateItem[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(20);
const detailVisible = ref(false);
const detail = ref<RemotionTemplateItem | null>(null);
const detailTab = ref('defaultProps');
const STRUCT_HINT = '支持 {{key}} 占位符，复用时由 inputProps 替换';
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
    buildOperationColumn('operationSlot', 90),
  ],
}));

function kindLabel(k?: string) {
  return k === 'builtin' ? '内置组件（兼容）' : k === 'component' ? '代码组件' : '声明式结构';
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

function handleOperation(command: string, row: RemotionTemplateItem) {
  switch (command) {
    case 'detail':
      openDetail(row);
      break;
    case 'edit':
      openEdit(row);
      break;
    case 'export':
      exportPkg(row);
      break;
    case 'delete':
      ElMessageBox.confirm(`确认删除模板「${row.name}」？`, '提示', { type: 'warning' })
        .then(() => remove(row))
        .catch(() => undefined);
      break;
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

// ─── 新增 / 编辑模板 ──────────────────────────────────────────
const editingId = ref('');
const createVisible = ref(false);
const createLoading = ref(false);
const createForm = reactive({
  name: '',
  code: '',
  category: '我的模板',
  description: '',
  implementationKind: 'structure' as 'structure' | 'component',
  width: 1080,
  height: 1920,
  fps: 30,
  defaultPropsJson: '{}',
  structureJson: '',
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

function resetCreateForm() {
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
  createForm.codeAssetsJson = '[]';
}

function setOrientation(o: 'portrait' | 'landscape' | 'square') {
  if (o === 'portrait') {
    createForm.width = 1080;
    createForm.height = 1920;
  } else if (o === 'landscape') {
    createForm.width = 1920;
    createForm.height = 1080;
  } else {
    createForm.width = 1080;
    createForm.height = 1080;
  }
}

function openCreate() {
  editingId.value = '';
  resetCreateForm();
  createVisible.value = true;
}

async function openEdit(row: RemotionTemplateItem) {
  try {
    const tpl: any = await getRemotionTemplate(row.id || row.code);
    editingId.value = tpl.id || row.id || '';
    createForm.name = tpl.name || '';
    createForm.code = tpl.code || '';
    createForm.category = tpl.category || '我的模板';
    createForm.description = tpl.description || '';
    createForm.implementationKind = (tpl.implementationKind === 'component' ? 'component' : 'structure') as any;
    createForm.width = tpl.width || 1080;
    createForm.height = tpl.height || 1920;
    createForm.fps = tpl.fps || 30;
    createForm.defaultPropsJson = JSON.stringify(tpl.defaultProps ?? {}, null, 2);
    createForm.structureJson = tpl.structure ? JSON.stringify(tpl.structure, null, 2) : '';
    createForm.codeAssetsJson = tpl.codeAssets ? JSON.stringify(tpl.codeAssets, null, 2) : '[]';
    createVisible.value = true;
  } catch (e: any) {
    ElMessage.error(e?.message || '加载模板失败');
  }
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
    if (createForm.implementationKind === 'component') {
      const list = Array.isArray(codeAssets) ? codeAssets : [];
      if (!list.some((c: any) => c?.code)) {
        throw new Error('代码组件需要包含可执行 code');
      }
    }

    // 由结构自动推导 durationInFrames（component 沿用现有帧数）
    const fps = createForm.fps || 30;
    const totalSeconds = (structure?.scenes || []).reduce(
      (acc: number, s: any) => acc + (Number(s?.duration) || 0),
      0,
    );
    const durationInFrames = totalSeconds > 0 ? Math.round(totalSeconds * fps) : 300;

    const payload: any = {
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
      scope: 'private',
    };

    if (editingId.value) {
      await updateRemotionTemplate(editingId.value, payload);
      ElMessage.success('模板已更新');
    } else {
      await createRemotionTemplate(payload);
      ElMessage.success('模板已创建');
    }
    createVisible.value = false;
    load(1);
  } catch (e: any) {
    ElMessage.error(e?.message || (editingId.value ? '保存失败' : '创建失败'));
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

.operation-dropdown {
  :deep(.el-button) {
    padding: 2px 0;
  }
}
</style>

<!-- 全屏弹窗样式需全局/深度注入 -->
<style lang="scss">
.tpl-editor-dialog.el-dialog.is-fullscreen {
  display: flex !important;
  flex-direction: column !important;
  padding: 0 !important;
  overflow: hidden !important;
  background: var(--el-bg-color-overlay) !important;

  .el-dialog__header {
    padding: 14px 24px;
    border-bottom: 1px solid var(--el-border-color-lighter);
    margin-right: 0;
  }

  .el-dialog__body {
    flex: 1 1 auto;
    min-height: 0;
    overflow: hidden;
    padding: 0;
  }

  .el-dialog__footer {
    padding: 12px 24px;
    border-top: 1px solid var(--el-border-color-lighter);
    background: var(--el-bg-color-overlay);
  }
}

.tpl-dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;

  &__title {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
    font-size: 16px;
    font-weight: 600;
    color: var(--el-text-color-primary);

    > span:first-child {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }

  &__code {
    font-family: var(--el-font-family-monospace, monospace);
    font-size: 12px;
    font-weight: 400;
    color: var(--el-text-color-secondary);
    padding: 2px 8px;
    border-radius: 4px;
    background: var(--el-fill-color);
  }

  &__actions {
    display: flex;
    gap: 8px;
    flex-shrink: 0;
  }
}

.tpl-dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 4px 0 2px;
}

.tpl-editor {
  height: 100%;
  overflow-y: auto;
  padding: 8px 24px 24px;
}

.tpl-section-label {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin: 18px 0 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--el-border-color-lighter);
  font-size: 13px;
  font-weight: 600;
  color: var(--el-text-color-primary);

  &:first-child {
    margin-top: 4px;
  }
}

.tpl-section-hint {
  font-size: 12px;
  font-weight: 400;
  color: var(--el-text-color-secondary);
}

.tpl-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px 14px;

  &--compact {
    grid-template-columns: repeat(4, minmax(0, 1fr));
    align-items: end;
  }
}

.tpl-field {
  display: flex;
  flex-direction: column;
  gap: 5px;
  min-width: 0;

  > label {
    font-size: 12px;
    color: var(--el-text-color-secondary);

    em {
      color: var(--el-color-danger);
      font-style: normal;
    }
  }

  &--wide {
    grid-column: 1 / -1;
  }

  :deep(.el-input__wrapper),
  :deep(.el-input-number),
  :deep(.el-textarea__inner) {
    min-height: 36px;
  }

  :deep(.el-input .el-input__wrapper) {
    padding: 6px 12px;
  }

  :deep(.el-textarea__inner) {
    padding: 10px 12px;
    line-height: 1.6;
  }
}

.tpl-preset-row {
  display: flex;
  gap: 6px;
  padding-bottom: 2px;
}

.tpl-code-input {
  :deep(textarea) {
    font-family: var(--el-font-family-monospace, monospace);
    font-size: 13px;
    line-height: 1.7;
    padding: 12px 14px;
    min-height: 320px;
  }
}

.tpl-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 24px;
}

.tpl-stat {
  display: flex;
  align-items: baseline;
  gap: 6px;
  min-width: 0;

  &__label {
    font-size: 12px;
    color: var(--el-text-color-secondary);
    flex-shrink: 0;
  }

  &__value {
    font-size: 13px;
    font-weight: 600;
    color: var(--el-text-color-primary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.tpl-desc {
  margin-top: 12px;
  font-size: 13px;
  line-height: 1.6;
  color: var(--el-text-color-regular);
}

.tpl-meta-row {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  margin-top: 10px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.tpl-hash {
  font-family: var(--el-font-family-monospace, monospace);
  font-size: 12px;
}

.tpl-json-block {
  max-height: 58vh;
  overflow: auto;
  padding: 14px 16px;
  margin: 0;
  font-family: var(--el-font-family-monospace, monospace);
  font-size: 13px;
  line-height: 1.7;
  color: var(--el-text-color-regular);
  background: var(--el-fill-color-light);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 6px;
  white-space: pre-wrap;
  word-break: break-word;

  &--tall {
    max-height: 64vh;
  }
}
</style>
