<template>
  <ContentWrap :plain="true">
    <ListPageLayout class="ai-task-page">
      <template #filter>
        <div class="list-page-filter list-page-filter--flat">
          <el-form :model="queryParams" label-position="top" class="list-page-search-form">
            <el-row :gutter="12" class="list-page-search-form__row">
              <el-col class="list-page-search-form__col--wide" :xs="24" :sm="12" :md="8" :lg="6" :xl="5">
                <el-form-item label="关键词">
                  <el-input
                    v-model="queryParams.keyword"
                    size="small"
                    placeholder="任务标题 / 执行指令"
                    clearable
                    @keyup.enter="load(1)"
                    @change="(val: string) => { if (!val) load(1); }"
                  />
                </el-form-item>
              </el-col>
              <el-col class="list-page-search-form__col--narrow" :xs="24" :sm="12" :md="8" :lg="5" :xl="4">
                <el-form-item label="状态">
                  <el-select v-model="queryParams.isEnabled" size="small" clearable placeholder="全部" @change="load(1)">
                    <el-option label="已启用" :value="true" />
                    <el-option label="已暂停" :value="false" />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col class="list-page-search-form__col--narrow" :xs="24" :sm="12" :md="8" :lg="5" :xl="4">
                <el-form-item label="触发类型">
                  <el-select v-model="queryParams.triggerType" size="small" clearable placeholder="全部" @change="load(1)">
                    <el-option label="Cron 表达式" value="cron" />
                    <el-option label="固定间隔" value="interval" />
                  </el-select>
                </el-form-item>
              </el-col>
            </el-row>
            <div class="list-page-search-form__actions">
              <el-button size="small" type="primary" :icon="Search" :loading="loading" @click="load(1)">搜索</el-button>
              <el-button size="small" type="primary" :icon="Plus" @click="openCreate">新建任务</el-button>
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
                  <div class="task-title-cell">
                    <span class="task-title">{{ row.title }}</span>
                    <span class="task-instructions">{{ row.instructions }}</span>
                  </div>
                </template>

                <template #triggerSlot="{ row }">
                  <div class="task-trigger-cell">
                    <el-tag size="small" effect="plain">{{ row.triggerType === 'cron' ? 'Cron' : '间隔' }}</el-tag>
                    <span class="task-trigger-value">
                      {{ row.triggerType === 'cron' ? row.cronExpr : `每 ${row.intervalMinutes} 分钟` }}
                    </span>
                  </div>
                </template>

                <template #statusSlot="{ row }">
                  <el-switch
                    v-model="row.isEnabled"
                    inline-prompt
                    active-text="启"
                    inactive-text="停"
                    @change="(v: boolean) => handleToggle(row, v)"
                  />
                </template>

                <template #nextSlot="{ row }">
                  <span class="task-time">{{ formatTime(row.nextRunAt) }}</span>
                </template>

                <template #lastSlot="{ row }">
                  <div class="task-last-cell">
                    <span class="task-time">{{ formatTime(row.lastRunAt) }}</span>
                    <span v-if="row.lastResultSummary" class="task-last-summary">{{ row.lastResultSummary }}</span>
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
                          <el-dropdown-item command="executions">执行历史</el-dropdown-item>
                          <el-dropdown-item v-if="row.isEnabled" command="pause">暂停</el-dropdown-item>
                          <el-dropdown-item v-else command="resume">恢复</el-dropdown-item>
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
    <el-dialog v-model="editVisible" fullscreen destroy-on-close class="task-editor-dialog">
      <template #header>
        <div class="task-dialog-header">
          <div class="task-dialog-header__title">
            <span>{{ editingId ? '编辑定时任务' : '新建定时任务' }}</span>
            <span v-if="form.title" class="task-dialog-header__code">{{ form.title }}</span>
          </div>
        </div>
      </template>

      <div class="task-editor">
        <div class="task-section-label">基础信息</div>
        <div class="task-grid">
          <div class="task-field">
            <label>任务标题 <em>*</em></label>
            <el-input v-model="form.title" placeholder="每日热搜总结" maxlength="80" />
          </div>
          <div class="task-field">
            <label>时区</label>
            <el-input v-model="form.timezone" placeholder="Asia/Shanghai" />
          </div>
          <div class="task-field task-field--wide">
            <label>执行指令 <em>*</em></label>
            <el-input
              v-model="form.instructions"
              type="textarea"
              :rows="4"
              placeholder="到点执行时的指令，如：总结今天热搜 Top10，输出要点摘要"
            />
          </div>
        </div>

        <div class="task-section-label">时间规则</div>
        <div class="task-grid">
          <div class="task-field">
            <label>触发类型</label>
            <el-radio-group v-model="form.triggerType">
              <el-radio-button label="cron">Cron 表达式</el-radio-button>
              <el-radio-button label="interval">固定间隔</el-radio-button>
            </el-radio-group>
          </div>
          <div v-if="form.triggerType === 'cron'" class="task-field">
            <label>Cron 表达式 <em>*</em></label>
            <el-input v-model="form.cronExpr" placeholder="0 8 * * *" />
            <span class="task-field-hint">分 时 日 月 周 · 例：0 8 * * * 每天 8 点</span>
          </div>
          <div v-else class="task-field">
            <label>间隔分钟 <em>*</em></label>
            <el-input-number v-model="form.intervalMinutes" :min="1" :max="10080" controls-position="right" />
            <span class="task-field-hint">每 N 分钟执行一次</span>
          </div>
          <div class="task-field">
            <label>启用状态</label>
            <el-switch v-model="form.isEnabled" active-text="启用" inactive-text="暂停" />
          </div>
        </div>
      </div>

      <template #footer>
        <div class="task-dialog-footer">
          <el-button @click="editVisible = false">取消</el-button>
          <el-button type="primary" :loading="saving" @click="submit">
            {{ editingId ? '保存修改' : '创建任务' }}
          </el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 执行历史 -->
    <el-dialog v-model="execVisible" title="执行历史" width="860px" destroy-on-close>
      <div class="task-exec-title">{{ execTask?.title }}</div>
      <el-table :data="execList" size="small" border>
        <el-table-column prop="status" label="状态" width="90">
          <template #default="{ row }">
            <el-tag size="small" :type="execTagType(row.status)">{{ row.status }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="触发" width="80">
          <template #default="{ row }">{{ row.triggerSource === 'manual' ? '手动' : '定时' }}</template>
        </el-table-column>
        <el-table-column label="计划时间" width="160">
          <template #default="{ row }">{{ formatTime(row.scheduledAt) }}</template>
        </el-table-column>
        <el-table-column label="耗时" width="80">
          <template #default="{ row }">{{ row.durationMs != null ? `${Math.round(row.durationMs / 1000)}s` : '-' }}</template>
        </el-table-column>
        <el-table-column label="结果 / 错误" min-width="220">
          <template #default="{ row }">
            <span v-if="row.errorText" class="task-exec-error">{{ row.errorText }}</span>
            <span v-else>{{ row.resultSummary || '-' }}</span>
          </template>
        </el-table-column>
      </el-table>
      <div v-if="!execList.length" class="task-exec-empty">暂无执行记录（执行体接入后将在此留痕）</div>
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
  createAiScheduledTask,
  deleteAiScheduledTask,
  disableAiScheduledTask,
  enableAiScheduledTask,
  getAiScheduledTask,
  getAiScheduledTaskExecutions,
  getAiScheduledTaskList,
  updateAiScheduledTask,
  type AiScheduledTaskExecutionItem,
  type AiScheduledTaskItem,
} from '@/api/aiScheduledTask';

const loading = ref(false);
const list = ref<AiScheduledTaskItem[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(20);
const tableMaxHeight = useTableMaxHeight(240, 360);

const queryParams = reactive({
  keyword: '',
  isEnabled: undefined as boolean | undefined,
  triggerType: '',
});

const gridOptions = computed(() => ({
  ...commonGridOptions,
  rowConfig: { keyField: 'id' },
  columns: [
    { title: '任务 / 执行指令', field: 'title', minWidth: 240, slots: { default: 'titleSlot' } },
    { title: '时间规则', field: 'triggerType', minWidth: 150, slots: { default: 'triggerSlot' } },
    { title: '状态', field: 'isEnabled', width: 90, align: 'center', slots: { default: 'statusSlot' } },
    { title: '下次执行', field: 'nextRunAt', width: 150, slots: { default: 'nextSlot' } },
    { title: '最近执行', field: 'lastRunAt', minWidth: 150, slots: { default: 'lastSlot' } },
    buildTimeColumn('创建时间', 'createTime', 150),
    buildOperationColumn('operationSlot', 90),
  ],
}));

function formatTime(v?: string | null) {
  if (!v) return '—';
  try {
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleString('zh-CN', { hour12: false });
  } catch {
    return '—';
  }
}

function execTagType(s: string) {
  return s === 'success' ? 'success' : s === 'failed' ? 'danger' : s === 'running' ? 'warning' : 'info';
}

async function load(p = 1) {
  page.value = p;
  loading.value = true;
  try {
    const data = await getAiScheduledTaskList({
      page: p,
      pageSize: pageSize.value,
      keyword: queryParams.keyword || undefined,
      isEnabled: queryParams.isEnabled,
      triggerType: queryParams.triggerType || undefined,
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
  instructions: '',
  triggerType: 'cron' as 'cron' | 'interval',
  cronExpr: '0 8 * * *',
  intervalMinutes: 30,
  timezone: 'Asia/Shanghai',
  isEnabled: true,
});

function openCreate() {
  editingId.value = '';
  form.title = '';
  form.instructions = '';
  form.triggerType = 'cron';
  form.cronExpr = '0 8 * * *';
  form.intervalMinutes = 30;
  form.timezone = 'Asia/Shanghai';
  form.isEnabled = true;
  editVisible.value = true;
}

async function openEdit(row: AiScheduledTaskItem) {
  try {
    const t = await getAiScheduledTask(row.id);
    editingId.value = t.id;
    form.title = t.title || '';
    form.instructions = t.instructions || '';
    form.triggerType = t.triggerType === 'interval' ? 'interval' : 'cron';
    form.cronExpr = t.cronExpr || '0 8 * * *';
    form.intervalMinutes = t.intervalMinutes || 30;
    form.timezone = t.timezone || 'Asia/Shanghai';
    form.isEnabled = t.isEnabled !== false;
    editVisible.value = true;
  } catch (e: any) {
    ElMessage.error(e?.message || '加载失败');
  }
}

async function submit() {
  if (!form.title.trim() || !form.instructions.trim()) {
    ElMessage.warning('请填写标题与执行指令');
    return;
  }
  if (form.triggerType === 'cron' && !form.cronExpr.trim()) {
    ElMessage.warning('请填写 Cron 表达式');
    return;
  }
  saving.value = true;
  try {
    const payload: any = {
      title: form.title.trim(),
      instructions: form.instructions.trim(),
      triggerType: form.triggerType,
      timezone: form.timezone || 'Asia/Shanghai',
      isEnabled: form.isEnabled,
    };
    if (form.triggerType === 'cron') payload.cronExpr = form.cronExpr.trim();
    else payload.intervalMinutes = form.intervalMinutes;

    if (editingId.value) {
      await updateAiScheduledTask(editingId.value, payload);
      ElMessage.success('已保存');
    } else {
      await createAiScheduledTask(payload);
      ElMessage.success('任务已创建');
    }
    editVisible.value = false;
    load(editingId.value ? page.value : 1);
  } catch (e: any) {
    ElMessage.error(e?.message || '保存失败');
  } finally {
    saving.value = false;
  }
}

async function handleToggle(row: AiScheduledTaskItem, enabled: boolean) {
  try {
    if (enabled) await enableAiScheduledTask(row.id);
    else await disableAiScheduledTask(row.id);
    ElMessage.success(enabled ? '已启用' : '已暂停');
    load(page.value);
  } catch (e: any) {
    ElMessage.error(e?.message || '操作失败');
    row.isEnabled = !enabled;
  }
}

function handleCommand(cmd: string, row: AiScheduledTaskItem) {
  switch (cmd) {
    case 'edit':
      openEdit(row);
      break;
    case 'executions':
      openExecutions(row);
      break;
    case 'pause':
      handleToggle(row, false);
      break;
    case 'resume':
      handleToggle(row, true);
      break;
    case 'delete':
      ElMessageBox.confirm(`确认删除定时任务「${row.title}」？`, '提示', { type: 'warning' })
        .then(async () => {
          await deleteAiScheduledTask(row.id);
          ElMessage.success('已删除');
          load(page.value);
        })
        .catch(() => undefined);
      break;
  }
}

// ── 执行历史 ────────────────────────────────────────────────
const execVisible = ref(false);
const execTask = ref<AiScheduledTaskItem | null>(null);
const execList = ref<AiScheduledTaskExecutionItem[]>([]);

async function openExecutions(row: AiScheduledTaskItem) {
  execTask.value = row;
  execList.value = [];
  execVisible.value = true;
  try {
    const data = await getAiScheduledTaskExecutions(row.id, { page: 1, pageSize: 50 });
    execList.value = (data as any)?.items || [];
  } catch (e: any) {
    ElMessage.error(e?.message || '加载执行历史失败');
  }
}

onMounted(() => load(1));
</script>

<style scoped lang="scss">
:deep(.ai-task-page) {
  gap: 10px;
  padding: 8px 0 0;
}
:deep(.ai-task-page .list-page-layout__main) {
  gap: 10px;
}
:deep(.ai-task-page .list-page-filter--flat) {
  gap: 10px;
  padding-bottom: 10px;
}
:deep(.ai-task-page .list-page-table-panel__body) {
  padding: 0;
}
:deep(.ai-task-page .list-page-table-panel__pagination--flat) {
  padding: 14px 0 0;
  justify-content: flex-end;
  border-top: 1px solid var(--list-page-panel-border, var(--el-border-color-lighter));
}

.task-title-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;

  .task-title {
    font-weight: 500;
    color: var(--el-text-color-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .task-instructions {
    font-size: 12px;
    color: var(--el-text-color-secondary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
}

.task-trigger-cell {
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: flex-start;

  .task-trigger-value {
    font-size: 12px;
    font-family: var(--el-font-family-monospace, monospace);
    color: var(--el-text-color-regular);
  }
}

.task-time {
  font-size: 12px;
  color: var(--el-text-color-regular);
}
.task-last-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.task-last-summary {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.task-exec-title {
  margin-bottom: 10px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}
.task-exec-error {
  color: var(--el-color-danger);
}
.task-exec-empty {
  padding: 20px;
  text-align: center;
  color: var(--el-text-color-secondary);
}
</style>

<style lang="scss">
.task-editor-dialog.el-dialog.is-fullscreen {
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

.task-dialog-header {
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

.task-editor {
  height: 100%;
  overflow-y: auto;
  padding: 8px 24px 24px;
}

.task-section-label {
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

.task-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px 16px;
}

.task-field {
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

.task-field-hint {
  font-size: 11px;
  color: var(--el-text-color-secondary);
}

.task-dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
</style>
