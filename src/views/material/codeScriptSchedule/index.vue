<template>
  <ContentWrap :plain="true">
    <ListPageLayout class="code-script-schedule-page">
      <template #filter>
        <div class="list-page-filter list-page-filter--flat">
          <el-form :model="queryParams" label-position="top" class="list-page-search-form">
            <el-row :gutter="12" class="list-page-search-form__row">
              <el-col class="list-page-search-form__col--base" :xs="24" :sm="12" :md="8" :lg="6" :xl="5">
                <el-form-item :label="t('codeScriptSchedule.scheduleName')">
                  <el-input
                    v-model="queryParams.search"
                    size="small"
                    :placeholder="t('codeScriptSchedule.enterScheduleName')"
                    clearable
                    @keyup.enter="getList"
                    @change="(val) => { if (!val) getList(); }"
                  />
                </el-form-item>
              </el-col>
              <!-- <el-col class="list-page-search-form__col--narrow" :xs="24" :sm="12" :md="8" :lg="5" :xl="4">
                <el-form-item label="运行环境">
                  <el-select v-model="queryParams.runtimeEnv" size="small" clearable @change="getList">
                    <el-option label="开发环境" value="development" />
                    <el-option label="生产环境" value="production" />
                  </el-select>
                </el-form-item>
              </el-col> -->
              <el-col class="list-page-search-form__col--base" :xs="24" :sm="12" :md="8" :lg="6" :xl="5">
                <el-form-item :label="t('codeScriptSchedule.codeScript')">
                  <el-select
                    v-model="queryParams.scriptId"
                    size="small"
                    filterable
                    clearable
                    :placeholder="t('codeScriptSchedule.selectCodeScript')"
                    @change="handleScriptFilterChange"
                  >
                    <el-option
                      v-for="script in scriptOptions"
                      :key="script.id"
                      :label="`${script.name} (#${script.id})`"
                      :value="script.id"
                    />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col class="list-page-search-form__col--narrow" :xs="24" :sm="12" :md="8" :lg="4" :xl="3">
                <el-form-item :label="t('codeScriptSchedule.enabledStatus')">
                  <el-select v-model="queryParams.isEnabled" size="small" clearable @change="getList">
                    <el-option :label="t('codeScriptSchedule.enabled')" :value="true" />
                    <el-option :label="t('codeScriptSchedule.disabled')" :value="false" />
                  </el-select>
                </el-form-item>
              </el-col>
            </el-row>
            <div class="list-page-search-form__actions">
              <el-button size="small" class="!ml-0" type="primary" :icon="Search" :loading="loading" @click="getList">
                {{ t('common.search') }}
              </el-button>
              <el-button size="small" type="primary" :icon="Plus" @click="handleAdd">{{ t('codeScriptSchedule.addSchedule') }}</el-button>
              <el-button
                size="small"
                class="!ml-0"
                type="danger"
                plain
                @click="handleDelete()"
              >
                {{ t('common.batchDelete') }} ({{ ids.length }})
              </el-button>
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
                :max-height="gridOptions.maxHeight"
                :data="dataSource"
                :loading="loading"
                @checkbox-change="checkboxChange"
                @checkbox-all="checkboxAllChange"
              >
                <template #scriptSlot="{ row }">
                  <div class="flex flex-col">
                    <span>{{ row.scriptName || t('codeScriptSchedule.scriptIdLabel', { id: row.scriptId }) }}</span>
                    <span class="text-xs text-[var(--el-text-color-secondary)]"
                      >ID {{ row.scriptId }}</span
                    >
                  </div>
                </template>
                <template #envSlot="{ row }">
                  <!-- <el-tag
                    size="small"
                    :type="row.runtimeEnv === 'production' ? 'danger' : 'success'"
                  >
                    {{ formatRuntimeEnv(row.runtimeEnv) }}
                  </el-tag> -->
                  <span>-</span>
                </template>
                <template #triggerSlot="{ row }">
                  <div class="flex flex-col">
                    <span>{{
                      row.triggerType === "cron"
                        ? t('codeScriptSchedule.fixedTime')
                        : t('codeScriptSchedule.intervalExecution')
                    }}</span>
                    <span class="text-xs text-[var(--el-text-color-secondary)]">{{
                      formatTrigger(row)
                    }}</span>
                  </div>
                </template>
                <template #enabledSlot="{ row }">
                  <el-tag :type="row.isEnabled ? 'success' : 'info'" size="small">
                    {{
                      row.isEnabled
                        ? t('codeScriptSchedule.enabled')
                        : t('codeScriptSchedule.disabled')
                    }}
                  </el-tag>
                </template>
                <template #lastStatusSlot="{ row }">
                  <el-tag
                    v-if="row.lastStatus"
                    :type="getExecutionStatusType(row.lastStatus)"
                    size="small"
                    effect="plain"
                  >
                    {{ row.lastStatus }}
                  </el-tag>
                  <span v-else class="text-xs text-[var(--el-text-color-secondary)]">-</span>
                </template>
                <template #nextRunAtSlot="{ row }">
                  <span>{{ formatScheduleDateTime(row.nextRunAt) }}</span>
                </template>
                <template #operationSlot="{ row }">
                  <el-dropdown
                    trigger="click"
                    @command="(command) => handleOperationCommand(String(command), row)"
                    class="operation-dropdown"
                  >
                    <el-button type="primary" link size="small" class="operation-trigger-button">{{ t('common.operation') }}</el-button>
                    <template #dropdown>
                      <el-dropdown-menu class="operation-menu-compact">
                        <el-dropdown-item command="run">{{ t('codeScriptSchedule.runNow') }}</el-dropdown-item>
                        <el-dropdown-item command="toggle">{{
                          row.isEnabled ? t('codeScriptSchedule.disabled') : t('codeScriptSchedule.enabled')
                        }}</el-dropdown-item>
                        <el-dropdown-item command="records">{{ t('codeScriptSchedule.executionRecords') }}</el-dropdown-item>
                        <el-dropdown-item command="edit">{{ t('common.edit') }}</el-dropdown-item>
                        <el-dropdown-item command="delete" divided class="operation-menu-item--danger">{{ t('common.delete') }}</el-dropdown-item>
                      </el-dropdown-menu>
                    </template>
                  </el-dropdown>
                </template>
              </vxe-grid>
            </div>
          </div>
        </div>
      </template>

      <template #pagination>
        <div class="list-page-panel list-page-panel--flat list-page-table-panel__pagination list-page-table-panel__pagination--flat">
          <Pagination
            :total="total"
            v-model:page="queryParams.currentPage"
            v-model:limit="queryParams.pageSize"
            @pagination="getList"
          />
        </div>
      </template>
    </ListPageLayout>
  </ContentWrap>

  <el-dialog :title="dialogTitle" v-model="dialogVisible" fullscreen align-center destroy-on-close>
    <div
      class="mx-auto grid h-[calc(100vh-120px)] max-w-[1440px] grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.1fr)_420px]"
    >
      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-width="110px"
        class="grid min-h-0 gap-4"
      >
        <div class="grid gap-4 lg:grid-cols-2">
          <div class="rounded border border-solid border-[var(--el-border-color-light)] p-4">
            <div class="mb-3 text-sm font-600">{{ t('codeScriptSchedule.baseInfo') }}</div>
            <el-form-item :label="t('codeScriptSchedule.scheduleName')" prop="name" class="mb-4">
              <el-input
                v-model="form.name"
                maxlength="200"
                show-word-limit
                :placeholder="t('codeScriptSchedule.enterScheduleName')"
              />
            </el-form-item>
            <el-form-item :label="t('codeScriptSchedule.codeScript')" prop="scriptId" class="mb-4">
              <el-select
                v-model="form.scriptId"
                filterable
                class="w-full"
                :placeholder="t('codeScriptSchedule.selectCodeScript')"
              >
                <el-option
                  v-for="script in scriptOptions"
                  :key="script.id"
                  :label="`${script.name} (#${script.id})`"
                  :value="script.id"
                />
              </el-select>
            </el-form-item>
            <!-- <el-form-item label="运行环境" prop="runtimeEnv" class="mb-4">
              <el-radio-group v-model="form.runtimeEnv">
                <el-radio label="development">开发环境</el-radio>
                <el-radio label="production">生产环境</el-radio>
              </el-radio-group>
            </el-form-item> -->
            <el-form-item :label="t('codeScriptSchedule.whetherEnabled')" prop="isEnabled" class="mb-0">
              <el-switch v-model="form.isEnabled" />
            </el-form-item>
          </div>

          <div class="rounded border border-solid border-[var(--el-border-color-light)] p-4">
            <div class="mb-3 text-sm font-600">{{ t('codeScriptSchedule.executionConfig') }}</div>
            <el-form-item :label="t('codeScriptSchedule.triggerType')" prop="triggerType" class="mb-4">
              <el-radio-group v-model="form.triggerType">
                <el-radio label="cron">{{ t('codeScriptSchedule.fixedTime') }}</el-radio>
                <el-radio label="interval">{{ t('codeScriptSchedule.intervalExecution') }}</el-radio>
              </el-radio-group>
            </el-form-item>
            <el-form-item
              v-if="form.triggerType === 'cron'"
              :label="t('codeScriptSchedule.cronExpression')"
              prop="cronExpr"
              class="mb-4"
            >
              <el-input v-model="form.cronExpr" :placeholder="t('codeScriptSchedule.cronExprPlaceholder')" />
            </el-form-item>
            <el-form-item v-else :label="t('codeScriptSchedule.intervalMinutes')" prop="intervalMinutes" class="mb-4">
              <el-input-number
                v-model="form.intervalMinutes"
                :min="1"
                :max="1440"
                class="w-full!"
              />
            </el-form-item>
            <el-form-item :label="t('codeScriptSchedule.timeoutOverrideMs')" prop="timeoutMsOverride" class="mb-0">
              <el-input-number
                v-model="form.timeoutMsOverride"
                :min="100"
                :max="1800000"
                class="w-full!"
              />
            </el-form-item>
          </div>
        </div>

        <div class="rounded border border-solid border-[var(--el-border-color-light)] p-4">
          <div class="mb-3 text-sm font-600">{{ t('codeScriptSchedule.paramsOverride') }}</div>
          <el-form-item label-width="0" prop="paramsOverride" class="mb-0">
            <el-input
              v-model="form.paramsOverride"
              type="textarea"
              :rows="12"
              :placeholder="t('codeScriptSchedule.paramsOverridePlaceholder')"
            />
          </el-form-item>
        </div>
      </el-form>

      <div class="grid min-h-0 gap-4">
        <div
          class="rounded border border-solid border-[var(--el-border-color-light)] bg-[var(--el-fill-color-lighter)] p-4"
        >
          <div class="mb-3 text-sm font-600">{{ t('codeScriptSchedule.cronQuickTemplates') }}</div>
          <div class="flex flex-wrap gap-2">
            <el-button
              v-for="item in cronTemplates"
              :key="item.expr"
              size="small"
              @click="applyCronTemplate(item.expr)"
            >
              {{ item.label }}
            </el-button>
          </div>
        </div>

        <div
          class="rounded border border-solid border-[var(--el-border-color-light)] bg-[var(--el-fill-color-lighter)] p-4"
        >
          <div class="mb-3 text-sm font-600">{{ t('codeScriptSchedule.cronReference') }}</div>
          <div class="space-y-2 text-xs leading-6 text-[var(--el-text-color-secondary)]">
            <div v-for="item in cronTemplates" :key="`${item.expr}-desc`">
              {{ item.label }}:
              <span class="font-mono text-[var(--el-text-color-primary)]">{{ item.expr }}</span>
              {{ item.desc }}
            </div>
          </div>
        </div>
      </div>
    </div>
    <template #footer>
      <el-button @click="dialogVisible = false">{{ t('common.cancel') }}</el-button>
      <el-button type="primary" :loading="submitLoading" @click="submitForm">{{ t('common.save') }}</el-button>
    </template>
  </el-dialog>

  <el-dialog :title="t('codeScriptSchedule.executionRecords')" v-model="executionDialogVisible" fullscreen align-center>
    <div class="flex h-[calc(100vh-120px)] flex-col">
      <div class="mb-3 flex items-center justify-between gap-3">
        <div class="flex items-center gap-2">
          <el-tag v-if="currentSchedule" size="small" type="primary">
            {{ currentSchedule.name }} (#{{ currentSchedule.id }})
          </el-tag>
        </div>
        <div class="flex items-center gap-2">
          <el-button
            size="small"
            type="danger"
            plain
            :disabled="!executionIds.length"
            @click="handleDeleteExecution()"
          >
            {{ t('common.batchDelete') }} ({{ executionIds.length }})
          </el-button>
          <el-button size="small" type="primary" @click="getExecutionList">{{ t('codeScriptSchedule.refreshRecords') }}</el-button>
        </div>
      </div>

      <div class="common-table flex-1 min-h-0">
        <vxe-grid
          v-bind="executionGridOptions"
          :max-height="executionGridOptions.maxHeight"
          :data="executionDataSource"
          :loading="executionLoading"
          @checkbox-change="executionCheckboxChange"
          @checkbox-all="executionCheckboxAllChange"
        >
          <template #executionStatusSlot="{ row }">
            <el-tag :type="getExecutionStatusType(row.status)" size="small">{{
              row.status
            }}</el-tag>
          </template>
          <template #scheduledAtSlot="{ row }">
            <span>{{ formatScheduleDateTime(row.scheduledAt) }}</span>
          </template>
          <template #startedAtSlot="{ row }">
            <span>{{ formatScheduleDateTime(row.startedAt) }}</span>
          </template>
          <template #executionOperationSlot="{ row }">
            <el-dropdown
              trigger="click"
              @command="(command) => handleExecutionOperationCommand(String(command), row)"
              class="operation-dropdown"
            >
              <el-button type="primary" link size="small" class="operation-trigger-button">{{ t('common.operation') }}</el-button>
              <template #dropdown>
                <el-dropdown-menu class="operation-menu-compact">
                  <el-dropdown-item v-if="isExecutionCancellable(row)" command="cancel">{{ t('common.cancel') }}</el-dropdown-item>
                  <el-dropdown-item command="detail">{{ t('common.detail') }}</el-dropdown-item>
                  <el-dropdown-item command="delete" divided class="operation-menu-item--danger">{{ t('common.delete') }}</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </template>
        </vxe-grid>
      </div>

      <div class="flex justify-end pt-3">
        <Pagination
          :total="executionTotal"
          v-model:page="executionQuery.currentPage"
          v-model:limit="executionQuery.pageSize"
          @pagination="getExecutionList"
        />
      </div>
    </div>
  </el-dialog>

  <el-dialog :title="t('codeScriptSchedule.executionDetail')" v-model="executionDetailVisible" fullscreen align-center>
    <div class="execution-detail-dialog" v-loading="executionDetailLoading">
      <div class="execution-detail-dialog__summary">
        <div class="execution-detail-dialog__summary-main">
          <div class="execution-detail-dialog__status-row">
            <el-tag :type="getExecutionStatusType(executionDetail.status)" size="small">{{
              executionDetail.status || "-"
            }}</el-tag>
            <span class="execution-detail-dialog__status-text">
              {{ t('codeScriptSchedule.statusContext') }}
            </span>
          </div>
          <div class="execution-detail-dialog__meta-grid">
            <div class="execution-detail-dialog__meta-item">
              <div class="execution-detail-dialog__meta-label">{{ t('codeScriptSchedule.scheduleName') }}</div>
              <div class="execution-detail-dialog__meta-value">
                {{ executionDetail.scheduleName || "-" }}
              </div>
            </div>
            <div class="execution-detail-dialog__meta-item">
              <div class="execution-detail-dialog__meta-label">{{ t('codeScriptSchedule.scriptName') }}</div>
              <div class="execution-detail-dialog__meta-value">
                {{ executionDetail.scriptName || "-" }}
              </div>
            </div>
            <div class="execution-detail-dialog__meta-item">
              <div class="execution-detail-dialog__meta-label">{{ t('codeScriptSchedule.scriptExecutionId') }}</div>
              <div class="execution-detail-dialog__meta-value is-mono">
                {{ executionDetail.codeScriptRunId || "-" }}
              </div>
            </div>
            <div class="execution-detail-dialog__meta-item">
              <div class="execution-detail-dialog__meta-label">{{ t('codeScriptSchedule.sandboxRunId') }}</div>
              <div class="execution-detail-dialog__meta-value is-mono">
                {{ executionDetail.sandboxRunId || "-" }}
              </div>
            </div>
          </div>
        </div>
        <div class="execution-detail-dialog__summary-actions">
          <el-button
            v-if="isExecutionCancellable(executionDetail)"
            size="small"
            type="danger"
            plain
            @click="handleCancelExecution(executionDetail)"
          >
            {{ t('codeScriptSchedule.cancelTask') }}
          </el-button>
        </div>
      </div>
      <div class="execution-detail-dialog__content">
        <div class="execution-detail-panel">
          <div class="execution-detail-panel__title">{{ t('codeScriptSchedule.executionResult') }}</div>
          <pre class="execution-detail-panel__pre">{{
            formatJson(executionDetail.runResult)
          }}</pre>
        </div>
        <div class="execution-detail-side">
          <div class="execution-detail-panel">
            <div class="execution-detail-panel__title">{{ t('codeScriptSchedule.paramsSnapshot') }}</div>
            <pre class="execution-detail-panel__pre">{{
              formatJson(executionDetail.paramsSnapshotJson)
            }}</pre>
          </div>
          <div class="execution-detail-panel">
            <div class="execution-detail-panel__title">{{ t('codeScriptSchedule.logs') }}</div>
            <div class="execution-detail-panel__log">
              <div
                v-for="(line, index) in formattedExecutionLogLines"
                :key="`${index}-${line.text}`"
                :class="line.className"
              >
                {{ line.text }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch, watchEffect } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ElMessage, ElMessageBox } from "element-plus";
import { Plus, Search } from "@element-plus/icons-vue";
import { useWindowSize } from "@vueuse/core";
import { buildOperationColumn, commonGridOptions } from "@/common/table";
import { useI18n } from "@/hooks/web/useI18n";
import Pagination from "@/components/Pagination/index.vue";
import ListPageLayout from "@/components/ListPageLayout/index.vue";
import { formatDate } from "@/utils/formatTime";
import { getCodeScriptList } from "@/api/codeScript";
import {
  cancelCodeScriptScheduleExecution,
  createCodeScriptSchedule,
  deleteCodeScriptScheduleExecution,
  deleteCodeScriptSchedule,
  getCodeScriptSchedule,
  getCodeScriptScheduleExecution,
  getCodeScriptScheduleExecutionList,
  getCodeScriptScheduleList,
  runNowCodeScriptSchedule,
  toggleCodeScriptSchedule,
  updateCodeScriptSchedule,
} from "@/api/codeScriptSchedule";

const { t } = useI18n();
const { height } = useWindowSize();
const route = useRoute();
const router = useRouter();

const queryParams = reactive({
  currentPage: 1,
  pageSize: 20,
  search: "",
  scriptId: undefined as number | undefined,
  runtimeEnv: "",
  isEnabled: undefined as boolean | undefined,
});

const executionQuery = reactive({
  currentPage: 1,
  pageSize: 10,
  scheduleId: undefined as number | undefined,
});

const loading = ref(false);
const dataSource = ref<any[]>([]);
const total = ref(0);
const ids = ref<number[]>([]);
const scriptOptions = ref<any[]>([]);

const executionLoading = ref(false);
const executionDataSource = ref<any[]>([]);
const executionTotal = ref(0);
const executionIds = ref<number[]>([]);

const dialogVisible = ref(false);
const dialogTitle = ref("");
const submitLoading = ref(false);
const isEdit = ref(false);
const formRef = ref();
const form = reactive({
  id: undefined as number | undefined,
  name: "",
  scriptId: undefined as number | undefined,
  runtimeEnv: "development",
  triggerType: "cron",
  cronExpr: "0 9 * * *",
  intervalMinutes: 60,
  paramsOverride: "{}",
  timeoutMsOverride: undefined as number | undefined,
  isEnabled: true,
});

const currentSchedule = ref<any>(null);
const executionDialogVisible = ref(false);
const executionDetailVisible = ref(false);
const executionDetailLoading = ref(false);
const executionDetail = reactive<any>({
  id: undefined,
  status: "",
  scheduleName: "",
  scriptName: "",
  codeScriptRunId: "",
  sandboxRunId: "",
  paramsSnapshotJson: {},
  runResult: null,
  logs: [],
  errorText: "",
});

const LOG_TYPE_CLASS_MAP: Record<string, string> = {
  success: "text-emerald-300",
  fail: "text-rose-300",
  error: "text-rose-300",
  done: "text-sky-300",
  start: "text-amber-300",
  page: "text-violet-300",
  request: "text-cyan-300",
  warn: "text-yellow-300",
  info: "text-slate-200",
};

const cronTemplates = [
  { label: t('codeScriptSchedule.cronEvery5Min'), expr: "*/5 * * * *", desc: t('codeScriptSchedule.cronHighFreqLight') },
  { label: t('codeScriptSchedule.cronEvery10Min'), expr: "*/10 * * * *", desc: t('codeScriptSchedule.cronCommonPolling') },
  { label: t('codeScriptSchedule.cronEvery30Min'), expr: "*/30 * * * *", desc: t('codeScriptSchedule.cronMidFreqSync') },
  { label: t('codeScriptSchedule.cronHourly'), expr: "0 * * * *", desc: t('codeScriptSchedule.cronHourlyOnce') },
  { label: t('codeScriptSchedule.cronDaily9'), expr: "0 9 * * *", desc: t('codeScriptSchedule.cronDaily9Desc') },
  { label: t('codeScriptSchedule.cronDaily12'), expr: "0 12 * * *", desc: t('codeScriptSchedule.cronDaily12Desc') },
  { label: t('codeScriptSchedule.cronDaily18'), expr: "0 18 * * *", desc: t('codeScriptSchedule.cronDaily18Desc') },
  { label: t('codeScriptSchedule.cronDaily0030'), expr: "30 0 * * *", desc: t('codeScriptSchedule.cronNightBatch') },
  { label: t('codeScriptSchedule.cronWorkday9'), expr: "0 9 * * 1-5", desc: t('codeScriptSchedule.cronWorkday9Desc') },
  { label: t('codeScriptSchedule.cronWorkday18'), expr: "0 18 * * 1-5", desc: t('codeScriptSchedule.cronWorkday18Desc') },
  { label: t('codeScriptSchedule.cronMonday9'), expr: "0 9 * * 1", desc: t('codeScriptSchedule.cronMonday9Desc') },
  { label: t('codeScriptSchedule.cronSunday23'), expr: "0 23 * * 0", desc: t('codeScriptSchedule.cronSunday23Desc') },
  { label: t('codeScriptSchedule.cronMonthly1'), expr: "0 9 1 * *", desc: t('codeScriptSchedule.cronMonthly1Desc') },
  { label: t('codeScriptSchedule.cronMonthlyLastDay'), expr: "0 23 28-31 * *", desc: t('codeScriptSchedule.cronMonthlyLastDayDesc') },
];

const gridOptions = ref({
  ...commonGridOptions,
  maxHeight: Math.max(height.value - 280, 360),
  rowConfig: { keyField: "id" },
  checkboxConfig: { reserve: true },
  columns: [
    { type: "checkbox", width: 48, reserve: true },
    { title: t('common.id'), field: "id", width: 80 },
    { title: t('codeScriptSchedule.scheduleName'), field: "name", minWidth: 180, showOverflow: true },
    {
      title: t('codeScriptSchedule.creator'),
      field: "uploader",
      width: 140,
      showOverflow: true,
      formatter: ({ row }) => row?.uploader?.account || row?.uploader?.name || row?.userId || "-",
    },
    { title: t('codeScriptSchedule.relatedScript'), field: "scriptName", minWidth: 180, slots: { default: "scriptSlot" } },
    // { title: "运行环境", field: "runtimeEnv", width: 110, slots: { default: "envSlot" } },
    { title: t('codeScriptSchedule.triggerType'), field: "triggerType", minWidth: 180, slots: { default: "triggerSlot" } },
    { title: t('codeScriptSchedule.enabledStatus'), field: "isEnabled", width: 100, slots: { default: "enabledSlot" } },
    { title: t('codeScriptSchedule.executionStatus'), field: "lastStatus", width: 110, slots: { default: "lastStatusSlot" } },
    {
      title: t('codeScriptSchedule.nextRun'),
      field: "nextRunAt",
      width: 170,
      showOverflow: true,
      slots: { default: "nextRunAtSlot" },
    },
    buildOperationColumn("operationSlot"),
  ],
} as any);

const executionGridOptions = ref({
  ...commonGridOptions,
  maxHeight: Math.max(height.value - 280, 360),
  rowConfig: { keyField: "id" },
  checkboxConfig: { reserve: true },
  columns: [
    { type: "checkbox", width: 48, reserve: true },
    { title: t('codeScriptSchedule.recordId'), field: "id", width: 90 },
    {
      title: t('codeScriptSchedule.creator'),
      field: "uploader",
      width: 140,
      showOverflow: true,
      formatter: ({ row }) => row?.uploader?.account || row?.uploader?.name || row?.userId || "-",
    },
    { title: t('codeScriptSchedule.status'), field: "status", width: 100, slots: { default: "executionStatusSlot" } },
    { title: t('codeScriptSchedule.triggerSource'), field: "triggerSource", width: 100 },
    {
      title: t('codeScriptSchedule.plannedExecuteTime'),
      field: "scheduledAt",
      width: 170,
      showOverflow: true,
      slots: { default: "scheduledAtSlot" },
    },
    {
      title: t('common.startTimeText'),
      field: "startedAt",
      width: 170,
      showOverflow: true,
      slots: { default: "startedAtSlot" },
    },
    { title: t('codeScriptSchedule.durationMs'), field: "durationMs", width: 100 },
    { title: t('codeScriptSchedule.sandboxId'), field: "sandboxRunId", minWidth: 180, showOverflow: true },
    buildOperationColumn("executionOperationSlot"),
  ],
} as any);

watchEffect(() => {
  gridOptions.value.maxHeight = Math.max(height.value - 280, 360);
  executionGridOptions.value.maxHeight = Math.max(height.value - 280, 360);
});

watch(
  () => form.triggerType,
  (value) => {
    if (value === "cron") {
      form.intervalMinutes = 60;
    } else {
      form.cronExpr = "0 9 * * *";
    }
  },
);

watch(
  () => route.query.scriptId,
  (value) => {
    const scriptId = Number(value);
    const nextScriptId = Number.isFinite(scriptId) && scriptId > 0 ? scriptId : undefined;
    if (queryParams.scriptId === nextScriptId) {
      return;
    }
    queryParams.scriptId = nextScriptId;
    queryParams.currentPage = 1;
    getList();
  },
);

const rules = {
  name: [{ required: true, message: t('codeScriptSchedule.enterScheduleName'), trigger: "blur" }],
  scriptId: [{ required: true, message: t('codeScriptSchedule.selectCodeScript'), trigger: "change" }],
  runtimeEnv: [{ required: true, message: t('codeScriptSchedule.selectRuntimeEnv'), trigger: "change" }],
  triggerType: [{ required: true, message: t('codeScriptSchedule.selectTriggerType'), trigger: "change" }],
  cronExpr: [{ required: true, message: t('codeScriptSchedule.enterCronExpr'), trigger: "blur" }],
  intervalMinutes: [{ required: true, message: t('codeScriptSchedule.enterIntervalMinutes'), trigger: "change" }],
  paramsOverride: [{ required: true, message: t('codeScriptSchedule.enterParamsOverride'), trigger: "blur" }],
};

function formatRuntimeEnv(value: string) {
  return value === "production" ? t('codeScriptSchedule.productionEnv') : t('codeScriptSchedule.developmentEnv');
}

function formatTrigger(row: any) {
  return row.triggerType === "cron"
    ? row.cronExpr || "-"
    : t('codeScriptSchedule.everyMinutes', { minutes: row.intervalMinutes || 0 });
}

function getExecutionStatusType(status: string) {
  if (status === "completed") return "success";
  if (status === "running" || status === "queued") return "warning";
  if (status === "failed" || status === "timed_out" || status === "cancelled") return "danger";
  return "info";
}

function isExecutionCancellable(row?: any) {
  const status = String(row?.status || "").toLowerCase();
  return status === "queued" || status === "running";
}

function formatJson(value: any) {
  return JSON.stringify(value ?? null, null, 2);
}

function detectLogLineType(text: string) {
  const normalized = String(text || "").toUpperCase();
  if (normalized.includes("[SUCCESS]")) return "success";
  if (normalized.includes("[FAIL]")) return "fail";
  if (normalized.includes("[ERROR]")) return "error";
  if (normalized.includes("[DONE]")) return "done";
  if (normalized.includes("[START]")) return "start";
  if (normalized.includes("[PAGE]")) return "page";
  if (normalized.includes("[REQUEST]")) return "request";
  if (normalized.includes("[WARN]") || normalized.includes("[WARNING]")) return "warn";
  return "info";
}

function normalizeLogLines(logs: any, errorText?: string) {
  const result: Array<{ text: string; className: string }> = [];

  const appendLine = (raw: unknown, preferredType?: string) => {
    const text = String(raw ?? "").trimEnd();
    if (!text) return;
    const type = preferredType || detectLogLineType(text);
    result.push({
      text,
      className: LOG_TYPE_CLASS_MAP[type] || LOG_TYPE_CLASS_MAP.info,
    });
  };

  if (Array.isArray(logs)) {
    logs.forEach((item) => {
      if (typeof item === "string") {
        item.split("\n").forEach((line) => appendLine(line));
        return;
      }

      if (item && typeof item === "object") {
        const ts = item.ts ? `[${formatScheduleDateTime(item.ts)}] ` : "";
        const message = item.message ?? formatJson(item);
        const type =
          item.level === "error"
            ? "error"
            : item.level === "warn" || item.level === "warning"
              ? "warn"
              : detectLogLineType(String(message));

        String(message)
          .split("\n")
          .forEach((line) => appendLine(`${ts}${line}`, type));
        return;
      }

      appendLine(item);
    });
  } else if (logs) {
    String(formatJson(logs))
      .split("\n")
      .forEach((line) => appendLine(line));
  }

  if (errorText) {
    appendLine("[ERROR]", "error");
    String(errorText)
      .split("\n")
      .forEach((line) => appendLine(line, "error"));
  }

  if (!result.length) {
    appendLine(t('codeScriptSchedule.noLogs'), "info");
  }

  return result;
}

const formattedExecutionLogLines = computed(() =>
  normalizeLogLines(executionDetail.logs, executionDetail.errorText),
);

function formatScheduleDateTime(value: unknown) {
  if (!value) return "-";

  if (value instanceof Date) {
    return formatDate(value);
  }

  if (typeof value === "string") {
    const raw = value.trim();
    if (!raw) return "-";

    const hasTimezone = /(?:Z|[+-]\d{2}:\d{2})$/i.test(raw);
    const normalized = hasTimezone ? raw : raw.replace(" ", "T") + "Z";
    const parsed = new Date(normalized);
    if (!Number.isNaN(parsed.getTime())) {
      return formatDate(parsed);
    }
  }

  const parsed = new Date(value as any);
  return Number.isNaN(parsed.getTime()) ? String(value) : formatDate(parsed);
}

function applyCronTemplate(expr: string) {
  form.cronExpr = expr;
}

async function getScriptOptions() {
  const res = await getCodeScriptList({
    currentPage: 1,
    pageSize: 500,
    search: "",
  });
  scriptOptions.value = res.list || [];
}

async function getList() {
  loading.value = true;
  try {
    const res = await getCodeScriptScheduleList({ ...queryParams });
    dataSource.value = res.list || [];
    total.value = res.total || 0;
    ids.value = [];
  } catch (error: any) {
    ElMessage.error(error?.message || t('codeScriptSchedule.getListFailed'));
  } finally {
    loading.value = false;
  }
}

async function getExecutionList() {
  if (!executionQuery.scheduleId) return;
  executionLoading.value = true;
  try {
    const res = await getCodeScriptScheduleExecutionList({ ...executionQuery });
    executionDataSource.value = res.list || [];
    executionTotal.value = res.total || 0;
    executionIds.value = [];
  } catch (error: any) {
    ElMessage.error(error?.message || t('codeScriptSchedule.getExecutionListFailed'));
  } finally {
    executionLoading.value = false;
  }
}

function checkboxChange({ records }) {
  ids.value = records.map((item) => item.id);
}

function checkboxAllChange({ records }) {
  ids.value = records.map((item) => item.id);
}

function executionCheckboxChange({ records }) {
  executionIds.value = records.map((item) => item.id);
}

function executionCheckboxAllChange({ records }) {
  executionIds.value = records.map((item) => item.id);
}

function syncRouteScriptId(scriptId?: number) {
  const currentScriptId =
    typeof route.query.scriptId === "string" ? route.query.scriptId : undefined;
  const nextScriptId = scriptId ? String(scriptId) : undefined;
  if (currentScriptId === nextScriptId) {
    return;
  }
  const nextQuery = { ...route.query };
  if (scriptId) {
    nextQuery.scriptId = String(scriptId);
  } else {
    delete nextQuery.scriptId;
  }
  router.replace({ path: route.path, query: nextQuery });
}

function handleScriptFilterChange(value?: number) {
  queryParams.currentPage = 1;
  syncRouteScriptId(value);
  getList();
}

function resetForm() {
  form.id = undefined;
  form.name = "";
  form.scriptId = undefined;
  form.runtimeEnv = "development";
  form.triggerType = "cron";
  form.cronExpr = "0 9 * * *";
  form.intervalMinutes = 60;
  form.paramsOverride = "{}";
  form.timeoutMsOverride = undefined;
  form.isEnabled = true;
}

function handleAdd() {
  isEdit.value = false;
  dialogTitle.value = t('codeScriptSchedule.addScheduleTitle');
  resetForm();
  if (queryParams.scriptId) {
    form.scriptId = queryParams.scriptId;
  }
  dialogVisible.value = true;
}

async function handleEdit(row: any) {
  const detail = await getCodeScriptSchedule(row.id);
  isEdit.value = true;
  dialogTitle.value = t('codeScriptSchedule.editScheduleTitle');
  form.id = detail.id;
  form.name = detail.name;
  form.scriptId = detail.scriptId;
  form.runtimeEnv = detail.runtimeEnv;
  form.triggerType = detail.triggerType;
  form.cronExpr = detail.cronExpr || "0 9 * * *";
  form.intervalMinutes = detail.intervalMinutes || 60;
  form.paramsOverride = detail.paramsOverride || "{}";
  form.timeoutMsOverride = detail.timeoutMsOverride || undefined;
  form.isEnabled = !!detail.isEnabled;
  dialogVisible.value = true;
}

async function submitForm() {
  await formRef.value?.validate();
  submitLoading.value = true;
  try {
    const payload = {
      id: form.id,
      name: form.name,
      scriptId: form.scriptId,
      runtimeEnv: form.runtimeEnv,
      triggerType: form.triggerType,
      cronExpr: form.triggerType === "cron" ? form.cronExpr : undefined,
      intervalMinutes: form.triggerType === "interval" ? form.intervalMinutes : undefined,
      paramsOverride: form.paramsOverride,
      timeoutMsOverride: form.timeoutMsOverride,
      isEnabled: form.isEnabled,
    };
    if (isEdit.value) {
      await updateCodeScriptSchedule(payload);
      ElMessage.success(t('codeScriptSchedule.updateScheduleSuccess'));
    } else {
      await createCodeScriptSchedule(payload);
      ElMessage.success(t('codeScriptSchedule.createScheduleSuccess'));
    }
    dialogVisible.value = false;
    getList();
  } catch (error: any) {
    ElMessage.error(error?.message || t('codeScriptSchedule.saveScheduleFailed'));
  } finally {
    submitLoading.value = false;
  }
}

async function handleDelete(row?: any) {
  const deleteIds = row ? [row.id] : [...ids.value];
  if (!deleteIds.length) {
    ElMessage.warning(t('codeScriptSchedule.selectScheduleToDelete'));
    return;
  }
  await ElMessageBox.confirm(
    t('codeScriptSchedule.confirmDeleteSchedules', { count: deleteIds.length }),
    t('codeScriptSchedule.deleteTip'),
    {
      type: "warning",
    },
  );
  try {
    await deleteCodeScriptSchedule({ ids: deleteIds });
    ElMessage.success(t('common.deleteSuccess'));
    getList();
  } catch (error: any) {
    ElMessage.error(error?.message || t('common.deleteFailed'));
  }
}

async function handleToggle(row: any) {
  try {
    await toggleCodeScriptSchedule({ id: row.id, enabled: !row.isEnabled });
    ElMessage.success(
      t('codeScriptSchedule.toggleScheduleDone', {
        status: row.isEnabled ? t('codeScriptSchedule.disabled') : t('codeScriptSchedule.enabled'),
      }),
    );
    getList();
  } catch (error: any) {
    ElMessage.error(error?.message || t('codeScriptSchedule.toggleFailed'));
  }
}

async function handleRunNow(row: any) {
  await ElMessageBox.confirm(
    t('codeScriptSchedule.confirmRunNow', { name: row.name }),
    t('codeScriptSchedule.runNow'),
    {
      type: "warning",
    },
  );
  try {
    const detail = await runNowCodeScriptSchedule({ id: row.id });
    ElMessage.success(t('codeScriptSchedule.runNowTriggered'));
    await getList();
    currentSchedule.value = row;
    executionQuery.scheduleId = row.id;
    executionQuery.currentPage = 1;
    executionDialogVisible.value = true;
    await getExecutionList();
    if (detail?.id) {
      await openExecutionDetail(detail);
    }
  } catch (error: any) {
    ElMessage.error(error?.message || t('codeScriptSchedule.runNowFailed'));
  }
}

async function openExecutionRecords(row: any) {
  currentSchedule.value = row;
  executionQuery.scheduleId = row.id;
  executionQuery.currentPage = 1;
  executionDialogVisible.value = true;
  await getExecutionList();
}

async function openExecutionDetail(row: any) {
  executionDetailLoading.value = true;
  executionDetailVisible.value = true;
  try {
    const detail = await getCodeScriptScheduleExecution(row.id);
    Object.assign(executionDetail, detail || {});
  } catch (error: any) {
    ElMessage.error(error?.message || t('codeScriptSchedule.getExecutionDetailFailed'));
  } finally {
    executionDetailLoading.value = false;
  }
}

async function handleDeleteExecution(row?: any) {
  const deleteIds = row?.id ? [row.id] : [...executionIds.value];
  if (!deleteIds.length) {
    ElMessage.warning(t('codeScriptSchedule.selectExecutionToDelete'));
    return;
  }

  await ElMessageBox.confirm(
    t('codeScriptSchedule.confirmDeleteExecutions', { count: deleteIds.length }),
    t('codeScriptSchedule.deleteTip'),
    {
      type: "warning",
    },
  );

  try {
    await deleteCodeScriptScheduleExecution({ ids: deleteIds });
    ElMessage.success(t('common.deleteSuccess'));
    if (row?.id && executionDetailVisible.value && executionDetail.id === row.id) {
      executionDetailVisible.value = false;
    }
    await getExecutionList();
  } catch (error: any) {
    ElMessage.error(error?.message || t('codeScriptSchedule.deleteExecutionFailed'));
  }
}

function refreshExecutionDetailIfNeeded(id?: number) {
  if (!id || !executionDetailVisible.value || executionDetail.id !== id) {
    return Promise.resolve();
  }
  return openExecutionDetail({ id });
}

async function handleCancelExecution(row: any) {
  if (!row?.id) return;
  if (!isExecutionCancellable(row)) {
    ElMessage.warning(t('codeScriptSchedule.notCancellable'));
    return;
  }

  await ElMessageBox.confirm(
    t('codeScriptSchedule.confirmCancelExecution', { id: row.id }),
    t('codeScriptSchedule.cancelTask'),
    {
      confirmButtonText: t('codeScriptSchedule.confirmCancel'),
      cancelButtonText: t('codeScriptSchedule.continueExecution'),
      type: "warning",
    },
  );

  try {
    await cancelCodeScriptScheduleExecution({ id: row.id });
    ElMessage.success(t('codeScriptSchedule.cancelSuccess'));
    await Promise.all([getList(), getExecutionList(), refreshExecutionDetailIfNeeded(row.id)]);
  } catch (error: any) {
    ElMessage.error(error?.message || t('codeScriptSchedule.cancelFailed'));
  }
}

async function handleExecutionOperationCommand(command: string, row: any) {
  if (command === "cancel") {
    await handleCancelExecution(row);
    return;
  }
  if (command === "detail") {
    await openExecutionDetail(row);
    return;
  }
  if (command === "delete") {
    await handleDeleteExecution(row);
  }
}

async function handleOperationCommand(command: string, row: any) {
  if (command === "edit") {
    await handleEdit(row);
    return;
  }
  if (command === "delete") {
    await handleDelete(row);
    return;
  }
  if (command === "toggle") {
    await handleToggle(row);
    return;
  }
  if (command === "run") {
    await handleRunNow(row);
    return;
  }
  if (command === "records") {
    await openExecutionRecords(row);
  }
}

onMounted(async () => {
  const routeScriptId = Number(route.query.scriptId);
  if (Number.isFinite(routeScriptId) && routeScriptId > 0) {
    queryParams.scriptId = routeScriptId;
  }
  await Promise.all([getScriptOptions(), getList()]);
});
</script>

<style scoped>
:deep(.code-script-schedule-page) {
  gap: 10px;
  padding: 8px 0 0;
}

:deep(.code-script-schedule-page .list-page-layout__main) {
  gap: 10px;
}

:deep(.code-script-schedule-page .list-page-filter--flat) {
  gap: 10px;
  padding-bottom: 10px;
}

:deep(.code-script-schedule-page .list-page-table-panel__pagination--flat) {
  padding-top: 10px;
}

.execution-detail-dialog {
  display: flex;
  height: calc(100vh - 120px);
  min-height: 0;
  flex-direction: column;
  gap: 14px;
}

.execution-detail-dialog__summary {
  display: flex;
  padding: 18px;
  background: linear-gradient(180deg, rgb(from var(--el-fill-color-lighter) r g b / 96%), rgb(from var(--el-fill-color) r g b / 78%));
  border: 1px solid rgb(from var(--el-border-color-light) r g b / 72%);
  border-radius: 18px;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.execution-detail-dialog__summary-main {
  flex: 1;
  min-width: 0;
}

.execution-detail-dialog__summary-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex-shrink: 0;
}

.execution-detail-dialog__status-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  margin-bottom: 14px;
}

.execution-detail-dialog__status-text {
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.execution-detail-dialog__meta-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
}

.execution-detail-dialog__meta-item {
  min-height: 76px;
  padding: 14px 16px;
  background: rgb(from var(--el-bg-color) r g b / 76%);
  border-radius: 14px;
}

.execution-detail-dialog__meta-label {
  font-size: 12px;
  line-height: 1.3;
  color: var(--el-text-color-secondary);
}

.execution-detail-dialog__meta-value {
  margin-top: 8px;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.5;
  color: var(--el-text-color-primary);
  word-break: break-all;
}

.execution-detail-dialog__meta-value.is-mono {
  font-family: var(--el-font-family-monospace, "SFMono-Regular", Consolas, monospace);
  font-size: 13px;
}

.execution-detail-dialog__content {
  display: grid;
  min-height: 0;
  flex: 1;
  grid-template-columns: minmax(0, 1.3fr) minmax(320px, 0.7fr);
  gap: 14px;
}

.execution-detail-side {
  display: grid;
  min-height: 0;
  grid-template-rows: minmax(0, 0.9fr) minmax(0, 1.1fr);
  gap: 14px;
}

.execution-detail-panel {
  display: flex;
  min-height: 0;
  padding: 16px;
  background: rgb(from var(--el-fill-color-lighter) r g b / 96%);
  border: 1px solid rgb(from var(--el-border-color-light) r g b / 72%);
  border-radius: 18px;
  flex-direction: column;
}

.execution-detail-panel__title {
  margin-bottom: 10px;
  font-size: 14px;
  font-weight: 700;
  line-height: 1.4;
  color: var(--el-text-color-primary);
}

.execution-detail-panel__pre {
  margin: 0;
  overflow: auto;
  font-size: 12px;
  line-height: 1.7;
  word-break: break-all;
  white-space: pre-wrap;
  flex: 1;
}

.execution-detail-panel__log {
  min-height: 0;
  padding: 12px 14px;
  margin: 0;
  overflow: auto;
  font-family: var(--el-font-family-monospace, "SFMono-Regular", Consolas, monospace);
  font-size: 12px;
  line-height: 1.7;
  color: rgb(226 232 240);
  word-break: break-all;
  white-space: pre-wrap;
  background: var(--list-page-base-bg);
  border-radius: 14px;
  flex: 1;
}

@media (width <= 1279px) {
  .execution-detail-dialog__content {
    grid-template-columns: minmax(0, 1fr);
  }

  .execution-detail-side {
    grid-template-rows: minmax(220px, 0.85fr) minmax(260px, 1fr);
  }
}

@media (width <= 767px) {
  .execution-detail-dialog {
    height: calc(100vh - 108px);
  }

  .execution-detail-dialog__summary {
    flex-direction: column;
    padding: 16px;
  }

  .execution-detail-dialog__summary-actions {
    width: 100%;
    justify-content: flex-start;
  }

  .execution-detail-dialog__meta-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
