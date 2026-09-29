<template>
  <ContentWrap :plain="true">
    <ListPageLayout class="ai-prompt-page">
      <template #filter>
        <div class="list-page-filter list-page-filter--flat">
          <el-form :model="queryParams" label-position="top" class="list-page-search-form">
            <el-row :gutter="12" class="list-page-search-form__row">
              <el-col class="list-page-search-form__col--wide" :xs="24" :sm="12" :md="8" :lg="6" :xl="5">
                <el-form-item label="关键词">
                  <el-input
                    v-model="queryParams.keyword"
                    size="small"
                    placeholder="标题 / 内容"
                    clearable
                    @keyup.enter="load(1)"
                    @change="(val: string) => { if (!val) load(1); }"
                  />
                </el-form-item>
              </el-col>
              <el-col class="list-page-search-form__col--narrow" :xs="24" :sm="12" :md="8" :lg="5" :xl="4">
                <el-form-item label="类型">
                  <el-select v-model="queryParams.kind" size="small" clearable placeholder="全部" @change="load(1)">
                    <el-option label="常用片段" value="snippet" />
                    <el-option label="界面示例" value="example" />
                    <el-option label="测试用例" value="test" />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col class="list-page-search-form__col--narrow" :xs="24" :sm="12" :md="8" :lg="5" :xl="4">
                <el-form-item label="分类">
                  <el-input
                    v-model="queryParams.category"
                    size="small"
                    placeholder="如 创作 / 办公"
                    clearable
                    @change="(val: string) => { if (!val) load(1); }"
                  />
                </el-form-item>
              </el-col>
            </el-row>
            <div class="list-page-search-form__actions">
              <el-button size="small" type="primary" :icon="Search" :loading="loading" @click="load(1)">搜索</el-button>
              <el-button size="small" type="primary" :icon="Plus" @click="openCreate">新建模板</el-button>
              <el-button size="small" @click="load(1)">刷新</el-button>
            </div>
          </el-form>
        </div>
      </template>

      <template #table>
        <div class="list-page-panel list-page-panel--flat list-page-table-panel list-page-table-panel--flat">
          <div class="list-page-table-panel__body">
            <div class="common-table">
              <vxe-grid v-bind="gridOptions" :max-height="tableMaxHeight" :data="list" :loading="loading">
                <template #titleSlot="{ row }">
                  <div class="prompt-title-cell">
                    <div class="prompt-title-row">
                      <span class="prompt-title">{{ row.title }}</span>
                      <el-tag v-if="row.isExample" size="small" type="warning">示例</el-tag>
                    </div>
                    <span class="prompt-content">{{ row.content }}</span>
                  </div>
                </template>

                <template #kindSlot="{ row }">
                  <el-tag size="small" :type="kindTagType(row.kind)">{{ kindLabel(row.kind) }}</el-tag>
                </template>

                <template #tagsSlot="{ row }">
                  <div class="prompt-tags">
                    <el-tag v-for="t in (row.tags || []).slice(0, 3)" :key="t" size="small" effect="plain">
                      {{ t }}
                    </el-tag>
                  </div>
                </template>

                <template #operationSlot="{ row }">
                  <div class="flex items-center">
                    <el-dropdown placement="bottom-end" @command="(cmd: string) => handleCommand(cmd, row)">
                      <el-button type="primary" link size="small">
                        操作
                        <el-icon class="el-icon--right"><ArrowDown /></el-icon>
                      </el-button>
                      <template #dropdown>
                        <el-dropdown-menu>
                          <el-dropdown-item command="edit">编辑</el-dropdown-item>
                          <el-dropdown-item command="copy">复制内容</el-dropdown-item>
                          <el-dropdown-item command="delete" divided>删除</el-dropdown-item>
                        </el-dropdown-menu>
                      </template>
                    </el-dropdown>
                  </div>
                </template>
              </vxe-grid>
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
        </div>
      </template>
    </ListPageLayout>

    <!-- 新建 / 编辑 -->
    <el-dialog v-model="editVisible" fullscreen destroy-on-close class="prompt-editor-dialog">
      <template #header>
        <div class="prompt-dialog-header">
          <div class="prompt-dialog-header__title">
            <span>{{ editingId ? '编辑提示词模板' : '新建提示词模板' }}</span>
            <span v-if="form.title" class="prompt-dialog-header__code">{{ form.title }}</span>
          </div>
        </div>
      </template>

      <div class="prompt-editor">
        <div class="prompt-section-label">基础信息</div>
        <div class="prompt-grid">
          <div class="prompt-field">
            <label>标题 <em>*</em></label>
            <el-input v-model="form.title" placeholder="如：英文催款邮件" maxlength="80" />
          </div>
          <div class="prompt-field">
            <label>类型</label>
            <el-select v-model="form.kind" style="width: 100%">
              <el-option label="常用片段" value="snippet" />
              <el-option label="界面示例" value="example" />
              <el-option label="测试用例" value="test" />
            </el-select>
          </div>
          <div class="prompt-field">
            <label>分类</label>
            <el-input v-model="form.category" placeholder="创作 / 办公 / 开发…" />
          </div>
          <div class="prompt-field">
            <label>界面示例</label>
            <el-switch v-model="form.isExample" active-text="展示" inactive-text="隐藏" />
          </div>
          <div class="prompt-field prompt-field--wide">
            <label>提示词内容 <em>*</em></label>
            <el-input
              v-model="form.content"
              type="textarea"
              :rows="10"
              placeholder="用户可一键复用的提示词内容…"
            />
          </div>
          <div class="prompt-field prompt-field--wide">
            <label>说明</label>
            <el-input v-model="form.description" type="textarea" :rows="2" placeholder="使用场景 / 备注" />
          </div>
          <div class="prompt-field prompt-field--wide">
            <label>标签（逗号分隔）</label>
            <el-input v-model="form.tagsText" placeholder="总结, 效率" />
          </div>
        </div>

        <template v-if="form.kind === 'test'">
          <div class="prompt-section-label">
            测试期望
            <span class="prompt-section-hint">kind=test 时用于 Agent 自动化验证（可选）</span>
          </div>
          <div class="prompt-grid">
            <div class="prompt-field prompt-field--wide">
              <label>期望调用的工具（逗号分隔）</label>
              <el-input v-model="form.expectToolsText" placeholder="task.create, prompt_template.list" />
            </div>
            <div class="prompt-field prompt-field--wide">
              <label>期望输出包含</label>
              <el-input v-model="form.expectContainsText" placeholder="已创建, 定时任务" />
            </div>
          </div>
        </template>
      </div>

      <template #footer>
        <div class="prompt-dialog-footer">
          <el-button @click="editVisible = false">取消</el-button>
          <el-button type="primary" :loading="saving" @click="submit">
            {{ editingId ? '保存修改' : '创建模板' }}
          </el-button>
        </div>
      </template>
    </el-dialog>
  </ContentWrap>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { ArrowDown, Plus, Search } from '@element-plus/icons-vue';
import ContentWrap from '@/components/ContentWrap/src/ContentWrap.vue';
import ListPageLayout from '@/components/ListPageLayout/index.vue';
import {
  buildOperationColumn,
  buildTimeColumn,
  commonGridOptions,
  useTableMaxHeight,
} from '@/common/table';
import {
  createAiPromptTemplate,
  deleteAiPromptTemplate,
  getAiPromptTemplate,
  getAiPromptTemplateList,
  updateAiPromptTemplate,
  type AiPromptTemplateItem,
} from '@/api/aiPromptTemplate';

const loading = ref(false);
const list = ref<AiPromptTemplateItem[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(20);
const tableMaxHeight = useTableMaxHeight(240, 360);

const queryParams = reactive({
  keyword: '',
  kind: '',
  category: '',
});

const gridOptions = computed(() => ({
  ...commonGridOptions,
  rowConfig: { keyField: 'id' },
  columns: [
    { title: '提示词', field: 'title', minWidth: 300, slots: { default: 'titleSlot' } },
    { title: '类型', field: 'kind', width: 100, slots: { default: 'kindSlot' } },
    { title: '分类', field: 'category', width: 110 },
    { title: '标签', field: 'tags', minWidth: 140, slots: { default: 'tagsSlot' } },
    { title: '使用次数', field: 'useCount', width: 90, align: 'center' },
    buildTimeColumn('创建时间', 'createTime', 150),
    buildOperationColumn('operationSlot', 90),
  ],
}));

function kindLabel(k?: string) {
  return k === 'example' ? '界面示例' : k === 'test' ? '测试用例' : '常用片段';
}
function kindTagType(k?: string) {
  return k === 'example' ? 'warning' : k === 'test' ? 'danger' : 'success';
}

async function load(p = 1) {
  page.value = p;
  loading.value = true;
  try {
    const data = await getAiPromptTemplateList({
      page: p,
      pageSize: pageSize.value,
      keyword: queryParams.keyword || undefined,
      kind: queryParams.kind || undefined,
      category: queryParams.category || undefined,
    });
    const result: any = data;
    list.value = result?.items || result?.list || [];
    total.value = Number(result?.total || list.value.length);
  } catch (e: any) {
    ElMessage.error(e?.message || '加载失败');
  } finally {
    loading.value = false;
  }
}

// ── 编辑 ────────────────────────────────────────────────────
const editVisible = ref(false);
const saving = ref(false);
const editingId = ref('');
const form = reactive({
  title: '',
  content: '',
  description: '',
  kind: 'snippet' as 'snippet' | 'example' | 'test',
  isExample: false,
  category: '',
  tagsText: '',
  expectToolsText: '',
  expectContainsText: '',
});

function openCreate() {
  editingId.value = '';
  form.title = '';
  form.content = '';
  form.description = '';
  form.kind = 'snippet';
  form.isExample = false;
  form.category = '';
  form.tagsText = '';
  form.expectToolsText = '';
  form.expectContainsText = '';
  editVisible.value = true;
}

async function openEdit(row: AiPromptTemplateItem) {
  try {
    const t = await getAiPromptTemplate(row.id);
    editingId.value = t.id;
    form.title = t.title || '';
    form.content = t.content || '';
    form.description = t.description || '';
    form.kind = (t.kind as any) || 'snippet';
    form.isExample = Boolean(t.isExample);
    form.category = t.category || '';
    form.tagsText = (t.tags || []).join(', ');
    form.expectToolsText = ((t.testExpect as any)?.expectTools || []).join(', ');
    form.expectContainsText = ((t.testExpect as any)?.expectContains || []).join(', ');
    editVisible.value = true;
  } catch (e: any) {
    ElMessage.error(e?.message || '加载失败');
  }
}

function splitList(s: string) {
  return s
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);
}

async function submit() {
  if (!form.title.trim() || !form.content.trim()) {
    ElMessage.warning('请填写标题与提示词内容');
    return;
  }
  saving.value = true;
  try {
    const payload: any = {
      title: form.title.trim(),
      content: form.content.trim(),
      description: form.description.trim(),
      kind: form.kind,
      isExample: form.isExample,
      category: form.category.trim() || undefined,
      tags: splitList(form.tagsText),
    };
    if (form.kind === 'test') {
      payload.testExpect = {
        expectTools: splitList(form.expectToolsText),
        expectContains: splitList(form.expectContainsText),
      };
    }
    if (editingId.value) {
      await updateAiPromptTemplate(editingId.value, payload);
      ElMessage.success('已保存');
    } else {
      await createAiPromptTemplate(payload);
      ElMessage.success('模板已创建');
    }
    editVisible.value = false;
    load(editingId.value ? page.value : 1);
  } catch (e: any) {
    ElMessage.error(e?.message || '保存失败');
  } finally {
    saving.value = false;
  }
}

function handleCommand(cmd: string, row: AiPromptTemplateItem) {
  switch (cmd) {
    case 'edit':
      openEdit(row);
      break;
    case 'copy':
      navigator.clipboard
        ?.writeText(row.content)
        .then(() => ElMessage.success('内容已复制'))
        .catch(() => ElMessage.error('复制失败'));
      break;
    case 'delete':
      ElMessageBox.confirm(`确认删除提示词「${row.title}」？`, '提示', { type: 'warning' })
        .then(async () => {
          await deleteAiPromptTemplate(row.id);
          ElMessage.success('已删除');
          load(page.value);
        })
        .catch(() => undefined);
      break;
  }
}

onMounted(() => load(1));
</script>

<style scoped lang="scss">
:deep(.ai-prompt-page) {
  gap: 10px;
  padding: 8px 0 0;
}
:deep(.ai-prompt-page .list-page-layout__main) {
  gap: 10px;
}
:deep(.ai-prompt-page .list-page-filter--flat) {
  gap: 10px;
  padding-bottom: 10px;
}
:deep(.ai-prompt-page .list-page-table-panel__body) {
  padding: 0;
}
:deep(.ai-prompt-page .list-page-table-panel__pagination--flat) {
  padding: 14px 0 0;
  justify-content: flex-end;
  border-top: 1px solid var(--list-page-panel-border, var(--el-border-color-lighter));
}

.prompt-title-cell {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.prompt-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.prompt-title {
  font-weight: 500;
  color: var(--el-text-color-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.prompt-content {
  font-size: 12px;
  line-height: 1.5;
  color: var(--el-text-color-secondary);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  word-break: break-word;
}

.prompt-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}
</style>

<style lang="scss">
.prompt-editor-dialog.el-dialog.is-fullscreen {
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
  }
}

.prompt-dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;

  &__title {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 16px;
    font-weight: 600;
    color: var(--el-text-color-primary);
  }
  &__code {
    font-size: 12px;
    font-weight: 400;
    color: var(--el-text-color-secondary);
    padding: 2px 8px;
    border-radius: 4px;
    background: var(--el-fill-color);
  }
}

.prompt-editor {
  height: 100%;
  overflow-y: auto;
  padding: 8px 24px 24px;
}

.prompt-section-label {
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

.prompt-section-hint {
  font-size: 12px;
  font-weight: 400;
  color: var(--el-text-color-secondary);
}

.prompt-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px 16px;
}

.prompt-field {
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
}

.prompt-dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
</style>
