<template>
  <ContentWrap :plain="true">
    <ListPageLayout class="queue-page">
      <template #filter>
        <div class="list-page-filter list-page-filter--flat">
          <el-form :model="queryParams" label-position="top" class="list-page-search-form">
            <el-row :gutter="12" class="list-page-search-form__row">
              <el-col
                class="list-page-search-form__col--base"
                :xs="24"
                :sm="12"
                :md="8"
                :lg="6"
                :xl="6"
              >
                <el-form-item :label="t('queue.taskId')">
                  <el-input
                    v-model="queryParams.id"
                    size="small"
                    clearable
                    :placeholder="t('queue.placeholderQueryAll')"
                    @keyup.enter="handleQueryChange"
                  />
                </el-form-item>
              </el-col>
              <el-col
                class="list-page-search-form__col--base"
                :xs="24"
                :sm="12"
                :md="8"
                :lg="6"
                :xl="6"
              >
                <el-form-item :label="t('queue.taskType')">
                  <el-select
                    v-model="queryParams.types"
                    size="small"
                    multiple
                    collapse-tags
                    collapse-tags-tooltip
                    clearable
                    filterable
                    :placeholder="t('queue.allTypes')"
                    @change="handleQueryChange"
                    @clear="handleTypeClear"
                  >
                    <el-option
                      v-for="opt in publishTaskTypeOptions"
                      :key="opt.value"
                      :label="opt.label"
                      :value="opt.value"
                    />
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
                <el-form-item :label="t('queue.taskStatus')">
                  <el-select
                    v-model="queryParams.status"
                    size="small"
                    clearable
                    :placeholder="t('queue.allStatuses')"
                    @change="handleQueryChange"
                  >
                    <el-option :label="t('queue.pending')" value="pending" />
                    <el-option :label="t('queue.waiting')" value="waiting" />
                    <el-option :label="t('queue.processing')" value="processing" />
                    <el-option :label="t('queue.completed')" value="completed" />
                    <el-option :label="t('queue.failed')" value="failed" />
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
                <el-form-item :label="t('queue.executionStatus')">
                  <el-select
                    v-model="queryParams.executionReadinessStatus"
                    size="small"
                    clearable
                    :placeholder="t('queue.all')"
                    @change="handleQueryChange"
                  >
                    <el-option :label="t('queue.executable')" value="ready" />
                    <el-option :label="t('queue.toBePrepared')" value="waiting" />
                    <el-option :label="t('queue.notExecutable')" value="blocked" />
                    <el-option :label="t('queue.unknown')" value="unknown" />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col
                class="list-page-search-form__col--wide"
                :xs="24"
                :sm="12"
                :md="8"
                :lg="7"
                :xl="8"
              >
                <el-form-item :label="t('queue.sortType')">
                  <el-select
                    v-model="queryParams.sortType"
                    size="small"
                    :placeholder="t('queue.selectSort')"
                    @change="handleSortTypeChange"
                  >
                    <el-option :label="t('queue.createdAtDesc')" value="createdAt_DESC" />
                    <el-option :label="t('queue.createdAtAsc')" value="createdAt_ASC" />
                    <el-option :label="t('queue.updatedAtDesc')" value="updatedAt_DESC" />
                    <el-option :label="t('queue.updatedAtAsc')" value="updatedAt_ASC" />
                    <el-option :label="t('queue.processedAtDesc')" value="processedAt_DESC" />
                    <el-option :label="t('queue.processedAtAsc')" value="processedAt_ASC" />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col
                class="list-page-search-form__col--wide"
                :xs="24"
                :sm="12"
                :md="8"
                :lg="7"
                :xl="8"
              >
                <el-form-item :label="t('queue.createdAt')">
                  <el-date-picker
                    v-model="queryParams.createdDateRange"
                    type="datetimerange"
                    :range-separator="t('queue.to')"
                    :start-placeholder="t('queue.startTime')"
                    :end-placeholder="t('queue.endTime')"
                    value-format="YYYY-MM-DD HH:mm:ss"
                    size="small"
                    clearable
                    :shortcuts="dateRangeShortcuts"
                    :default-time="[new Date(0, 0, 0, 0, 0, 0), new Date(0, 0, 0, 23, 59, 59)]"
                    @change="handleQueryChange"
                  />
                </el-form-item>
              </el-col>
            </el-row>
            <div class="list-page-search-form__actions">
              <el-button
                size="small"
                type="primary"
                :icon="Search"
                :loading="loading"
                @click="handleQueryChange"
                >{{ t('queue.search') }}</el-button
              >
              <el-button size="small" :disabled="loading" @click="handleResetQuery">{{ t('queue.reset') }}</el-button>
              <el-button size="small" type="primary" :icon="Plus" @click="handleAdd"
                >{{ t('queue.addTask') }}</el-button
              >
              <el-button
                size="small"
                type="danger"
                :icon="Delete"
                :disabled="!ids.length"
                @click="handleDelete(null)"
              >
                {{ t('queue.batchDelete') }}
              </el-button>
              <el-button
                size="small"
                type="warning"
                :disabled="!ids.length"
                :loading="batchResetPendingLoading"
                @click="handleBatchResetPublishTasksToPending"
              >
                {{ t('queue.batchResetToPending') }}
              </el-button>
              <el-button
                size="small"
                type="warning"
                plain
                :disabled="!ids.length"
                :loading="batchRegenerateLoading"
                @click="handleBatchRegeneratePublishTasks"
              >
                {{ t('queue.batchRegenerate') }}
              </el-button>
            </div>
          </el-form>
        </div>
      </template>

      <template #table>
        <div class="queue-page__main">
          <div class="queue-page__stats-bar">
            <div class="queue-stats-pill queue-stats-pill--pending">
              <span class="queue-stats-pill__label">{{ t('queue.pending') }}</span>
              <span class="queue-stats-pill__value">{{ stats.pending }}</span>
            </div>
            <div class="queue-stats-pill queue-stats-pill--processing">
              <span class="queue-stats-pill__label">{{ t('queue.processing') }}</span>
              <span class="queue-stats-pill__value">{{ stats.processing }}</span>
            </div>
            <div class="queue-stats-pill queue-stats-pill--completed">
              <span class="queue-stats-pill__label">{{ t('queue.completed') }}</span>
              <span class="queue-stats-pill__value">{{ stats.completed }}</span>
            </div>
            <div class="queue-stats-pill queue-stats-pill--failed">
              <span class="queue-stats-pill__label">{{ t('queue.failed') }}</span>
              <span class="queue-stats-pill__value">{{ stats.failed }}</span>
            </div>
            <div class="queue-stats-pill">
              <span class="queue-stats-pill__label">{{ t('queue.total') }}</span>
              <span class="queue-stats-pill__value">{{ stats.total }}</span>
            </div>

            <div v-if="showPublishDispatchPanel" class="queue-dispatch-panel">
              <div class="queue-dispatch-panel__main">
                <span class="queue-dispatch-panel__title">{{ t('queue.autoExecute') }}</span>
                <span
                  class="queue-dispatch-panel__status"
                  :class="publishTaskAutoDispatchStatusClass"
                >
                  <span class="queue-dispatch-panel__status-dot" />
                  <span>{{ publishTaskAutoDispatchStatusText }}</span>
                </span>
                <div
                  v-if="publishTaskAutoDispatchEnabled"
                  class="queue-dispatch-panel__binding"
                  :class="publishTaskAutoDispatchTargetClass"
                >
                  <span class="queue-dispatch-panel__binding-label">{{
                    currentAutoDispatchRunningRows.length > 0 ? t('queue.processing') : t('queue.target')
                  }}</span>
                  <span class="queue-dispatch-panel__binding-value">
                    {{ publishTaskAutoDispatchTargetText }}
                  </span>
                </div>
                <div
                  class="queue-dispatch-panel__runtime"
                  :class="publishTaskAutoDispatchEnabled ? 'is-success' : 'is-info'"
                >
                  <span class="queue-dispatch-panel__runtime-dot" />
                  <span>{{
                    publishTaskAutoDispatchEnabled ? t('queue.clientActiveClaimMode') : t('queue.autoExecuteDisabled')
                  }}</span>
                </div>
                <span
                  v-if="publishTaskAutoDispatchTargetHint"
                  class="queue-dispatch-panel__binding-meta"
                >
                  {{ publishTaskAutoDispatchTargetHint }}
                </span>
                <span class="queue-dispatch-panel__filter-wrap">
                  <span class="queue-dispatch-panel__filter">
                    {{ publishTaskAutoDispatchFilterSummary }}
                  </span>
                  <span class="queue-dispatch-panel__filter-popover">
                    {{ publishTaskAutoDispatchFilterDetail }}
                  </span>
                </span>
              </div>
              <el-button
                size="small"
                plain
                :type="publishTaskAutoDispatchEnabled ? 'danger' : 'success'"
                :loading="publishTaskAutoDispatchLoading"
                @click="handleTogglePublishAutoDispatch(!publishTaskAutoDispatchEnabled)"
              >
                {{ publishTaskAutoDispatchEnabled ? t('queue.close') : t('queue.open') }}
              </el-button>
            </div>
          </div>

          <div
            class="list-page-panel list-page-panel--flat list-page-table-panel list-page-table-panel--flat"
          >
            <div class="list-page-table-panel__body">
              <div class="common-table">
                <vxe-grid
                  v-bind="gridOptions"
                  :data="dataSource"
                  :loading="loading"
                  @checkbox-change="checkboxChange"
                  @checkbox-all="checkboxAllChange"
                >
                  <template #statusDefaultSlot="{ row }">
                    <el-tag :type="getStatusType(row.status)">
                      {{ getStatusText(row.status) }}
                    </el-tag>
                  </template>

                  <template #executionStatusDefaultSlot="{ row }">
                    <el-tooltip
                      :disabled="!getExecutionStatusInfo(row).reason"
                      :content="getExecutionStatusInfo(row).reason || ''"
                      placement="top"
                    >
                      <el-tag
                        v-if="getExecutionStatusInfo(row).type"
                        :type="getExecutionStatusInfo(row).type"
                        size="small"
                        effect="plain"
                      >
                        {{ getExecutionStatusInfo(row).text }}
                      </el-tag>
                      <span v-else class="text-gray-400 text-sm">-</span>
                    </el-tooltip>
                  </template>

                  <template #dispatchTargetDefaultSlot="{ row }">
                    <div class="queue-dispatch-target-cell">
                      <div class="queue-dispatch-target-cell__main">
                        {{ getQueueTaskDispatchTargetText(row) }}
                      </div>
                      <div
                        v-if="getQueueTaskDispatchTargetHint(row)"
                        class="queue-dispatch-target-cell__hint"
                      >
                        {{ getQueueTaskDispatchTargetHint(row) }}
                      </div>
                    </div>
                  </template>

                  <template #operationDefaultSlot="{ row }">
                    <div class="queue-operation-cell">
                      <el-dropdown
                        class="operation-dropdown"
                        placement="bottom-end"
                        @command="(command) => handleOperationCommand(String(command), row)"
                      >
                        <el-button
                          type="primary"
                          link
                          size="small"
                          class="operation-trigger-button"
                        >
                          {{ t('queue.operation') }}
                        </el-button>
                        <template #dropdown>
                          <el-dropdown-menu class="operation-menu-compact">
                            <el-dropdown-item :command="'viewData'">{{ t('queue.viewData') }}</el-dropdown-item>
                            <el-dropdown-item :command="'viewRuntimeLogs'">
                              {{ t('queue.viewLogs') }}
                            </el-dropdown-item>
                            <el-dropdown-item
                              v-if="isPublishTaskRow(row)"
                              :command="'startExecution'"
                              divided
                              :disabled="!canStartPublishExecution(row)"
                            >
                              {{ t('queue.startExecution') }}
                            </el-dropdown-item>
                            <el-dropdown-item
                              v-if="String(row.type || '').startsWith('publish-product-')"
                              :command="'regenerate'"
                              :disabled="row.status === 'processing' || regeneratingTaskIds.has(row.id)"
                            >
                              <span v-if="regeneratingTaskIds.has(row.id)" class="is-loading">
                                <el-icon class="is-loading"><Loading /></el-icon>
                                {{ t('queue.generating') }}
                              </span>
                              <span v-else>{{ t('queue.regenerate') }}</span>
                            </el-dropdown-item>
                            <el-dropdown-item
                              v-if="isPublishTaskRow(row)"
                              :command="'stopExecution'"
                              :disabled="!canStopPublishExecution(row)"
                            >
                              {{ t('queue.stopTask') }}
                            </el-dropdown-item>
                            <el-dropdown-item
                              v-if="isPublishTaskRow(row)"
                              :command="'resetExecutionState'"
                              :disabled="!canResetPublishExecution(row)"
                            >
                              {{ t('queue.resetToPending') }}
                            </el-dropdown-item>
                            <el-dropdown-item :command="'updateData'">{{ t('queue.updateData') }}</el-dropdown-item>
                            <el-dropdown-item v-if="!isPublishTaskRow(row)" :command="'editStatus'">
                              {{ t('queue.markStatus') }}
                            </el-dropdown-item>
                            <el-dropdown-item
                              v-if="userStore.user?.isAdmin"
                              :command="'delete'"
                              divided
                              class="operation-menu-item--danger"
                            >
                              {{ t('queue.delete') }}
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
        </div>
      </template>

      <template #pagination>
        <div
          class="list-page-panel list-page-panel--flat list-page-table-panel__pagination list-page-table-panel__pagination--flat"
        >
          <Pagination
            :total="total"
            v-model:page="queryParams.currentPage"
            v-model:limit="queryParams.pageSize"
            @pagination="getList"
          />
        </div>
      </template>
    </ListPageLayout>

    <!-- 新增任务对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="700px"
      :center="false"
      align-center
      @close="resetForm"
    >
      <el-form ref="formRef" :model="formData" :rules="formRules" label-width="100px">
        <el-form-item :label="t('queue.taskType')" prop="type">
          <el-select
            v-model="formData.type"
            :placeholder="t('queue.selectTaskType')"
            style="width: 100%"
            clearable
          >
            <el-option
              v-for="opt in publishTaskTypeOptions"
              :key="opt.value"
              :label="opt.label"
              :value="opt.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item :label="t('queue.taskDescription')" prop="description">
          <el-input
            v-model="formData.description"
            type="textarea"
            :rows="2"
            :placeholder="t('queue.enterTaskDescription')"
          />
        </el-form-item>
        <el-form-item :label="t('queue.taskData')" prop="data">
          <el-input
            v-model="formData.dataStr"
            type="textarea"
            :rows="6"
            :placeholder="t('queue.taskDataPlaceholder')"
          />
        </el-form-item>
        <el-form-item :label="t('queue.delaySeconds')" prop="delay">
          <el-input-number
            v-model="formData.delay"
            :min="0"
            :placeholder="t('queue.delayPlaceholder')"
            style="width: 100%"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button :disabled="submitLoading" @click="dialogVisible = false">{{ t('queue.cancel') }}</el-button>
          <el-button type="primary" :loading="submitLoading" @click="handleSubmit">{{ t('queue.confirm') }}</el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 编辑状态对话框 -->
    <el-dialog
      v-model="statusDialogVisible"
      :title="t('queue.editTaskStatus')"
      width="500px"
      :center="false"
      align-center
    >
      <el-form
        ref="statusFormRef"
        :model="statusFormData"
        :rules="statusFormRules"
        label-width="100px"
      >
        <el-form-item :label="t('queue.taskId')">
          <el-input v-model="statusFormData.id" disabled />
        </el-form-item>
        <el-form-item :label="t('queue.currentStatus')">
          <el-tag :type="getStatusType(statusFormData.status)">
            {{ getStatusText(statusFormData.status) }}
          </el-tag>
        </el-form-item>
        <el-form-item :label="t('queue.newStatus')" prop="newStatus">
          <el-select
            v-model="statusFormData.newStatus"
            :placeholder="t('queue.selectNewStatus')"
            style="width: 100%"
          >
            <el-option :label="t('queue.pending')" value="pending" />
            <el-option :label="t('queue.waiting')" value="waiting" />
            <el-option :label="t('queue.processing')" value="processing" />
            <el-option :label="t('queue.completed')" value="completed" />
            <el-option :label="t('queue.failed')" value="failed" />
          </el-select>
        </el-form-item>
        <el-form-item :label="t('queue.errorMessage')" prop="error" v-if="statusFormData.newStatus === 'failed'">
          <el-input
            v-model="statusFormData.error"
            type="textarea"
            :rows="3"
            :placeholder="t('queue.enterErrorMessage')"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button :disabled="statusSubmitLoading" @click="statusDialogVisible = false"
            >{{ t('queue.cancel') }}</el-button
          >
          <el-button type="primary" :loading="statusSubmitLoading" @click="handleStatusSubmit"
            >{{ t('queue.confirm') }}</el-button
          >
        </div>
      </template>
    </el-dialog>

    <!-- 查看数据对话框 -->
    <el-dialog
      v-model="dataDialogVisible"
      :title="t('queue.taskData')"
      fullscreen
      :center="false"
      align-center
      class="queue-json-dialog"
    >
      <div v-loading="dataDialogLoading" class="queue-json-viewer-shell">
        <div class="queue-json-panel queue-json-panel--preview">
          <div class="queue-json-panel__header">
            <span class="queue-json-panel__title">{{ t('queue.jsonPreview') }}</span>
          </div>
          <div class="queue-json-panel__body queue-json-panel__body--viewer">
            <pre class="queue-json-raw">{{ formatRawJson(currentTaskData) }}</pre>
          </div>
        </div>
      </div>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="dataDialogVisible = false">{{ t('queue.close') }}</el-button>
        </div>
      </template>
    </el-dialog>

    <el-dialog
      v-model="runtimeLogDialogVisible"
      fullscreen
      :center="false"
      align-center
      class="queue-runtime-dialog"
    >
      <div v-loading="runtimeLogDialogLoading" class="queue-runtime-window">
        <div class="queue-runtime-window__summary">
          <div class="queue-runtime-window__summary-item">
            <span class="queue-runtime-window__summary-label">{{ t('queue.taskId') }}</span>
            <span class="queue-runtime-window__summary-value">{{ currentTaskId || "-" }}</span>
          </div>
          <div class="queue-runtime-window__summary-item">
            <span class="queue-runtime-window__summary-label">{{ t('queue.platform') }}</span>
            <span class="queue-runtime-window__summary-value">{{
              currentTaskRuntime?.platform || "-"
            }}</span>
          </div>
          <div class="queue-runtime-window__summary-item">
            <span class="queue-runtime-window__summary-label">{{ t('queue.logCount') }}</span>
            <span class="queue-runtime-window__summary-value">{{
              currentTaskRuntime?.logCount ?? currentTaskLogs.length
            }}</span>
          </div>
          <div class="queue-runtime-window__summary-item">
            <span class="queue-runtime-window__summary-label">{{ t('queue.lastUpdated') }}</span>
            <span class="queue-runtime-window__summary-value">{{
              formatLogTimestamp(currentTaskRuntime?.updatedAt || currentTaskRuntime?.lastLogTime)
            }}</span>
          </div>
        </div>

        <div class="queue-runtime-window__body">
          <div v-if="currentTaskLogs.length" class="queue-runtime-console">
            <div
              v-for="(log, index) in currentTaskLogs"
              :key="log.id || `${log.timestamp}-${index}`"
              class="queue-runtime-console__line"
              :data-level="normalizeLogLevel(log.level)"
            >
              <div class="queue-runtime-console__prompt">
                <span class="queue-runtime-console__user">yishe@admin:</span>
                <span class="queue-runtime-console__location">~</span>
                <span class="queue-runtime-console__time">{{
                  formatLogTimestamp(log.time || log.timestamp)
                }}</span>
              </div>
              <div class="queue-runtime-console__content">
                <div class="queue-runtime-console__message">{{ log.message || "-" }}</div>
                <div v-if="hasLogData(log)" class="queue-runtime-console__actions">
                  <el-button
                    type="primary"
                    link
                    size="small"
                    class="queue-runtime-console__detail-trigger"
                    @click="openRuntimeLogData(log, index)"
                  >
                    {{ t('queue.viewDetailData') }}
                  </el-button>
                </div>
              </div>
            </div>
            <div class="queue-runtime-console__cursor-row">
              <span class="queue-runtime-console__user">yishe@admin:</span>
              <span class="queue-runtime-console__location">~</span>
              <span class="queue-runtime-console__cursor" />
            </div>
          </div>
          <div v-else class="queue-runtime-console queue-runtime-console--empty">
            <div class="queue-runtime-console__empty">
              <span class="queue-runtime-console__user">yishe@admin:</span>
              <span class="queue-runtime-console__location">~</span>
              <span class="queue-runtime-console__message">{{ t('queue.noMatchingLogs') }}</span>
              <span class="queue-runtime-console__cursor" />
            </div>
          </div>
        </div>
      </div>

      <template #footer>
        <div class="queue-runtime-dialog__footer">
          <div class="queue-runtime-dialog__footer-meta">
            <span>{{ t('queue.runtimeLogWindow') }}</span>
            <span>{{ t('queue.recordCount', { count: currentTaskRuntime?.logCount ?? currentTaskLogs.length }) }}</span>
          </div>
          <div class="queue-runtime-dialog__footer-actions">
            <el-button @click="refreshRuntimeLogDialogDetail()">{{ t('queue.refreshLogs') }}</el-button>
            <el-button @click="runtimeLogDialogVisible = false">{{ t('queue.close') }}</el-button>
          </div>
        </div>
      </template>
    </el-dialog>

    <el-dialog
      v-model="runtimeLogDataDialogVisible"
      width="860px"
      :center="false"
      align-center
      class="queue-runtime-data-dialog"
    >
      <template #header>
        <div class="queue-runtime-data-dialog__header">
          <div class="queue-runtime-data-dialog__title">{{ t('queue.logDetailData') }}</div>
          <div class="queue-runtime-data-dialog__meta">
            <span>{{ runtimeLogDataDialogMeta.time || "-" }}</span>
            <span>{{ runtimeLogDataDialogMeta.level }}</span>
          </div>
          <div class="queue-runtime-data-dialog__message">
            {{ runtimeLogDataDialogMeta.message || "-" }}
          </div>
        </div>
      </template>
      <div class="queue-runtime-data-dialog__body">
        <pre class="queue-runtime-data-dialog__raw">{{ runtimeLogDataDialogText }}</pre>
      </div>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="runtimeLogDataDialogVisible = false">{{ t('queue.close') }}</el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 更新数据对话框 -->
    <el-dialog
      v-model="dataUpdateDialogVisible"
      :title="t('queue.updateData')"
      fullscreen
      :center="false"
      align-center
      @close="resetDataUpdateForm"
    >
      <div class="queue-json-editor-layout">
        <div class="queue-json-panel queue-json-panel--preview">
          <div class="queue-json-panel__header">
            <span class="queue-json-panel__title">{{ t('queue.realtimePreview') }}</span>
            <span class="queue-json-panel__desc">{{ t('queue.previewHint') }}</span>
          </div>
          <div class="queue-json-panel__body queue-json-panel__body--viewer">
            <pre class="queue-json-raw">{{ formatRawJson(parsedUpdateData) }}</pre>
          </div>
        </div>
        <div class="queue-json-panel queue-json-panel--editor">
          <div class="queue-json-panel__header">
            <span class="queue-json-panel__title">{{ t('queue.jsonEditor') }}</span>
            <span class="queue-json-panel__desc">{{ t('queue.enterFullJson') }}</span>
          </div>
          <div class="queue-json-panel__body queue-json-panel__body--editor">
            <el-input
              v-model="dataUpdateFormData.dataStr"
              type="textarea"
              class="queue-json-textarea"
              :input-style="{
                height: '100%',
                resize: 'none',
                fontFamily: 'Monaco, Menlo, Consolas, monospace',
              }"
              :placeholder="t('queue.enterFullJsonData')"
            />
          </div>
        </div>
      </div>
      <template #footer>
        <div class="dialog-footer">
          <el-button :disabled="dataUpdateSubmitting" @click="dataUpdateDialogVisible = false"
            >{{ t('queue.cancel') }}</el-button
          >
          <el-button type="primary" :loading="dataUpdateSubmitting" @click="handleDataUpdateSubmit"
            >{{ t('queue.confirm') }}</el-button
          >
        </div>
      </template>
    </el-dialog>

    <el-dialog
      v-model="publishDispatchDialogVisible"
      :title="t('queue.startPublishTask')"
      width="1220px"
      :center="false"
      align-center
      class="start-publish-dialog"
      @open="handleOpenPublishDispatchDialog"
    >
      <div
        v-loading="publishDispatchDialogLoading"
        :element-loading-text="DISPATCH_DIALOG_LOADING_TEXT"
        class="start-publish-dialog__body"
      >
          <PublishDispatchTargetTable
            v-if="!publishDispatchDialogLoading && dispatchAvailableRows.length"
            v-model="selectedDispatchOptionKey"
            :rows="dispatchAvailableRows"
          :empty-text="t('queue.noExecutableNode')"
        />
        <div
          v-if="!publishDispatchDialogLoading && !dispatchAvailableRows.length"
          class="start-publish-dialog__empty"
        >
          {{ t('queue.noExecutableNode') }}
        </div>
      </div>
      <template #footer>
        <div class="start-publish-dialog__footer">
          <el-button
            :disabled="publishDispatchSubmitting"
            @click="publishDispatchDialogVisible = false"
            >{{ t('queue.cancel') }}</el-button
          >
          <el-button
            type="primary"
            :loading="publishDispatchSubmitting"
            :disabled="!canConfirmPublishDispatch"
            @click="handleConfirmPublishDispatch"
          >
            {{ t('queue.startExecution') }}
          </el-button>
        </div>
      </template>
    </el-dialog>

    <el-dialog
      v-model="autoDispatchTargetDialogVisible"
      :title="t('queue.autoDispatchSettings')"
      width="1220px"
      :center="false"
      align-center
      class="publish-dispatch-dialog"
      @open="handleOpenAutoDispatchTargetDialog"
    >
      <div class="publish-dispatch-dialog__body">
        <div class="publish-dispatch-dialog__panel publish-dispatch-filter-panel">
          <div class="publish-dispatch-dialog__panel-title">{{ t('queue.taskFilter') }}</div>
          <el-form label-width="72px" size="small" class="publish-dispatch-filter-form">
            <el-form-item :label="t('queue.taskType')">
              <el-select
                v-model="autoDispatchFilterForm.taskTypes"
                multiple
                collapse-tags
                collapse-tags-tooltip
                clearable
                filterable
                :placeholder="t('queue.allPublishTaskTypes')"
              >
                <el-option
                  v-for="opt in publishTaskTypeOptions"
                  :key="opt.value"
                  :label="opt.label"
                  :value="opt.value"
                />
              </el-select>
            </el-form-item>
            <el-form-item :label="t('queue.createdAt')">
              <el-date-picker
                v-model="autoDispatchFilterDateRange"
                type="datetimerange"
                :range-separator="t('queue.to')"
                :start-placeholder="t('queue.startTime')"
                :end-placeholder="t('queue.endTime')"
                value-format="YYYY-MM-DD HH:mm:ss"
                clearable
                class="publish-dispatch-filter-form__date"
              />
            </el-form-item>
            <el-form-item :label="t('queue.includeKeywords')">
              <el-input
                v-model="autoDispatchFilterForm.includeKeywordsText"
                clearable
                :placeholder="t('queue.keywordsSeparatorHint')"
              />
            </el-form-item>
            <el-form-item :label="t('queue.excludeKeywords')">
              <el-input
                v-model="autoDispatchFilterForm.excludeKeywordsText"
                clearable
                :placeholder="t('queue.excludeKeywordsHint')"
              />
            </el-form-item>
          </el-form>
        </div>
        <div
          v-loading="autoDispatchTargetDialogLoading"
          :element-loading-text="DISPATCH_DIALOG_LOADING_TEXT"
          class="publish-dispatch-dialog__panel"
        >
          <div class="publish-dispatch-dialog__panel-title">{{ t('queue.targetClient') }}</div>
          <PublishDispatchTargetTable
            v-if="!autoDispatchTargetDialogLoading && autoDispatchClientRows.length"
            v-model="selectedAutoDispatchOptionKey"
            :rows="autoDispatchClientRows"
            :empty-text="t('queue.noBindableNode')"
          />
          <div
            v-if="!autoDispatchTargetDialogLoading && !autoDispatchClientRows.length"
            class="publish-dispatch-dialog__empty"
          >
            {{ t('queue.noBindableNode') }}
          </div>
        </div>
      </div>
      <template #footer>
        <div class="publish-dispatch-dialog__footer">
          <el-button
            :disabled="autoDispatchTargetSubmitting"
            @click="autoDispatchTargetDialogVisible = false"
          >
            {{ t('queue.cancel') }}
          </el-button>
          <el-button
            type="primary"
            :loading="autoDispatchTargetSubmitting"
            :disabled="!canConfirmAutoDispatchTarget"
            @click="handleConfirmAutoDispatchTarget"
          >
            {{ t('queue.saveAndEnable') }}
          </el-button>
        </div>
      </template>
    </el-dialog>
  </ContentWrap>
</template>

<script setup lang="tsx">
import { ref, reactive, watchEffect, onMounted, onUnmounted, watch, computed } from "vue";
import { buildOperationColumn, commonGridOptions } from "@/common/table";
import { useLocalStorage, useWindowSize } from "@vueuse/core";
import { ElMessage, ElMessageBox } from "element-plus";
import { useI18n } from '@/hooks/web/useI18n';
import { Search, Delete, Plus, Loading } from "@element-plus/icons-vue";
import {
  getTaskList,
  createTask,
  deleteTask,
  getTaskDetail,
  getQueueStats,
  updateTaskData,
  updateTaskStatus,
  batchResetPublishTasksToPending,
  type QueueExecutionReadinessStatusFilter,
  type QueueMessage,
  type QueueStats,
} from "@/api/system/queue";
import { regeneratePublishTaskApi, regeneratePublishTasksBatchApi } from "@/api/product/publishConfig";
import {
  resetPublishTaskDispatch,
  startPublishTaskDispatch,
  stopPublishTaskDispatch,
} from "@/api/system/websocket";
import ContentWrap from "@/components/ContentWrap/src/ContentWrap.vue";
import ListPageLayout from "@/components/ListPageLayout/index.vue";
import Pagination from "@/components/Pagination/index.vue";
import { useUserStore } from "@/store/modules/user";
import {
  publishTaskTypeOptions,
  refreshPublishTaskTypeOptions,
} from "@/services/publishTaskCapabilityOptions";
import { useClientNodeState } from "@/services/clientNodeState";
import {
  getBrowserAutomationRuntimeHint,
  isBrowserAutomationRuntimeBusy as isBrowserAutomationRuntimeBusyByRuntime,
  supportsBrowserAutomationTaskType,
} from "@/services/browserAutomationRuntime";
import { resolveTaskExecutionReadinessIndicator } from "@/services/taskExecutionReadiness";
import {
  websocketClient,
  type PublishTaskRuntimeEvent,
  type ServiceCommandResultEvent,
} from "@/services/websocketClient";
import { usePublishTaskRuntimeState } from "@/services/publishTaskRuntimeState";
import {
  disablePublishTaskAutoDispatch,
  enablePublishTaskAutoDispatch,
  loadPublishTaskAutoDispatchSetting as fetchPublishTaskAutoDispatchSetting,
  type PublishTaskAutoDispatchFilter,
  type PublishTaskAutoDispatchSetting,
} from "@/services/publishTaskAutoDispatch";
import { getClientServiceRuntime } from "@/store/modules/clientNode";
import PublishDispatchTargetTable from "./components/PublishDispatchTargetTable.vue";

type QueueTagType = "success" | "warning" | "info" | "primary" | "danger";

interface ExecutionStatusInfo {
  text: string;
  type?: QueueTagType;
  reason?: string | null;
  ready?: boolean;
}

interface DispatchClientState {
  enabled: boolean;
  text: string;
  tagType: QueueTagType;
  tagText: string;
}

interface DispatchProfileOption {
  profileId: string | null;
  label: string;
  description: string;
  enabled: boolean;
  connected: boolean;
  busy: boolean;
  runtimeModeTag?: DispatchStatusTag;
  isAuto?: boolean;
}

interface DispatchStatusTag {
  text: string;
  type: QueueTagType;
}

interface ManualDispatchOptionRow {
  optionKey: string;
  clientId: string;
  clientLabel: string;
  onlineTag: DispatchStatusTag;
  serviceTag: DispatchStatusTag;
  profileId: string | null;
  profileLabel: string;
  runtimeModeTag: DispatchStatusTag;
  profileTag: DispatchStatusTag;
  description: string;
  selectable: boolean;
}

interface DispatchOptionRow {
  optionKey: string;
  clientId: string;
  clientLabel: string;
  onlineTag: DispatchStatusTag;
  serviceTag: DispatchStatusTag;
  profileId: string | null;
  profileLabel: string;
  profileTag: DispatchStatusTag;
  runtimeModeTag: DispatchStatusTag;
  acceptTag: DispatchStatusTag;
  description: string;
  selectable: boolean;
}

const userStore = useUserStore();
const { t } = useI18n();
const { clients: clientNodes, refresh: refreshClientNodes } = useClientNodeState();
const getBrowserAutomationRuntime = (client?: Record<string, any> | null) =>
  getClientServiceRuntime(client, "browser-automation");
const browserAutomationClients = computed(() =>
  clientNodes.value.filter((client) => !!getBrowserAutomationRuntime(client)),
);
const DISPATCH_DIALOG_LOADING_TEXT = t('queue.syncingAvailableNodes');
const {
  refresh: refreshPublishTaskRuntime,
  setAutoSchedulingEnabled: setPublishTaskAutoSchedulingEnabled,
} = usePublishTaskRuntimeState();

const defaultQueueQueryFilters = {
  pageSize: 20,
  status: undefined as QueueMessage["status"] | undefined,
  executionReadinessStatus: undefined as QueueExecutionReadinessStatusFilter | undefined,
  types: [] as string[],
  id: "",
  sortType: "createdAt_DESC",
  createdDateRange: null as [string, string] | null,
};
const queueQueryFilterStorage = useLocalStorage("queue_query_filters", defaultQueueQueryFilters, {
  mergeDefaults: true,
});

// 查询条件
const queryParams = reactive({
  currentPage: 1,
  pageSize: Number(queueQueryFilterStorage.value.pageSize) || defaultQueueQueryFilters.pageSize,
  status: queueQueryFilterStorage.value.status,
  executionReadinessStatus: queueQueryFilterStorage.value.executionReadinessStatus,
  types: Array.isArray(queueQueryFilterStorage.value.types)
    ? [...queueQueryFilterStorage.value.types]
    : [],
  id: String(queueQueryFilterStorage.value.id || ""),
  sortType: queueQueryFilterStorage.value.sortType || defaultQueueQueryFilters.sortType,
  createdDateRange: queueQueryFilterStorage.value.createdDateRange || null,
});

// 日期范围预设快捷选项
const dateRangeShortcuts = [
  {
    text: t('queue.today'),
    value: () => {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date();
      end.setHours(23, 59, 59, 999);
      return [start, end];
    },
  },
  {
    text: t('queue.last24Hours'),
    value: () => {
      const end = new Date();
      const start = new Date(end.getTime() - 24 * 60 * 60 * 1000);
      return [start, end];
    },
  },
  {
    text: t('queue.last3Days'),
    value: () => {
      const end = new Date();
      const start = new Date(end.getTime() - 3 * 24 * 60 * 60 * 1000);
      return [start, end];
    },
  },
  {
    text: t('queue.last7Days'),
    value: () => {
      const end = new Date();
      const start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
      return [start, end];
    },
  },
  {
    text: t('queue.last30Days'),
    value: () => {
      const end = new Date();
      const start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
      return [start, end];
    },
  },
  {
    text: t('queue.last90Days'),
    value: () => {
      const end = new Date();
      const start = new Date(end.getTime() - 90 * 24 * 60 * 60 * 1000);
      return [start, end];
    },
  },
];

function getSelectedQueryTypes() {
  return queryParams.types.map((item) => String(item || "").trim()).filter(Boolean);
}

function getPrimaryQueryType() {
  return getSelectedQueryTypes()[0] || "";
}

function getStatsQueueName() {
  const types = getSelectedQueryTypes();
  return types.length === 1 ? types[0] : "";
}

const stats = ref<QueueStats>({
  queue: "",
  pending: 0,
  waiting: 0,
  processing: 0,
  delayed: 0,
  completed: 0,
  failed: 0,
  total: 0,
});

const { height } = useWindowSize();

const gridOptions = ref({
  ...commonGridOptions,
  maxHeight: Math.max(height.value - 280, 360),
  rowClassName: ({ row }) => getQueueRowClassName(row),
  rowConfig: {
    keyField: "id",
  },
  checkboxConfig: {
    reserve: true,
  },
  columns: [
    { type: "checkbox", width: 50, ellipsis: true, reserve: true },
    { title: t('queue.taskId'), field: "id", minWidth: 200, showOverflow: true },
    { title: t('queue.taskType'), field: "type", width: 240 },
    {
      title: t('queue.creator'),
      field: "uploader",
      width: 140,
      showOverflow: true,
      formatter: ({ row }) => row?.uploader?.account || row?.uploader?.name || row?.userId || "-",
    },
    {
      title: t('queue.taskDescription'),
      field: "description",
      minWidth: 200,
      showOverflow: true,
      formatter: (e) => {
        return e.cellValue || "-";
      },
    },
    {
      title: t('queue.status'),
      field: "status",
      width: 100,
      slots: {
        default: "statusDefaultSlot",
      },
    },
    {
      title: t('queue.executionStatus'),
      field: "executionStatus",
      width: 120,
      slots: {
        default: "executionStatusDefaultSlot",
      },
    },
    {
      title: t('queue.executionNode'),
      field: "dispatchTarget",
      minWidth: 220,
      slots: {
        default: "dispatchTargetDefaultSlot",
      },
    },
    {
      title: t('queue.statusMessage'),
      field: "statusMessage",
      minWidth: 280,
      showOverflow: true,
      formatter: ({ row }) => resolveQueueTaskStatusMessage(row),
    },
    {
      title: t('queue.createdAt'),
      field: "createdAt",
      width: 180,
      showOverflow: true,
      formatter: (e) => {
        return e.cellValue ? new Date(e.cellValue).toLocaleString() : "-";
      },
    },
    {
      title: t('queue.updatedAt'),
      field: "updatedAt",
      width: 180,
      showOverflow: true,
      formatter: (e) => {
        return e.cellValue ? new Date(e.cellValue).toLocaleString() : "-";
      },
    },
    {
      title: t('queue.errorMessage'),
      field: "error",
      minWidth: 200,
      showOverflow: true,
      formatter: (e) => {
        return e.cellValue || "-";
      },
    },
    buildOperationColumn("operationDefaultSlot"),
  ],
});

const dataSource = ref<QueueMessage[]>([]);
const loading = ref(false);
const ids = ref<string[]>([]);
const total = ref(0);
const submitLoading = ref(false);
const statusSubmitLoading = ref(false);
const dataUpdateSubmitting = ref(false);
const deleteLoading = ref(false);
const batchResetPendingLoading = ref(false);
const batchRegenerateLoading = ref(false);
const publishTaskAutoDispatchEnabled = ref(false);
const publishTaskAutoDispatchLoading = ref(false);
const publishDispatchDialogVisible = ref(false);
const publishDispatchDialogLoading = ref(false);
const publishDispatchSubmitting = ref(false);
const autoDispatchTargetDialogVisible = ref(false);
const autoDispatchTargetDialogLoading = ref(false);
const autoDispatchTargetSubmitting = ref(false);
const dispatchTargetTask = ref<QueueMessage | null>(null);
const selectedDispatchClientId = ref("");
const selectedDispatchProfileId = ref("");
const autoDispatchTargetClientId = ref("");
const autoDispatchTargetProfileId = ref("");
const autoDispatchFilterForm = reactive({
  taskTypes: [] as string[],
  includeKeywordsText: "",
  excludeKeywordsText: "",
});
const autoDispatchFilterDateRange = ref<[string, string] | []>([]);
let publishTaskRuntimeReloadTimer: ReturnType<typeof setTimeout> | null = null;
let publishTaskCountersRefreshTimer: ReturnType<typeof setTimeout> | null = null;
let publishTaskMenuRuntimeSyncTimer: ReturnType<typeof setTimeout> | null = null;
let runtimeLogDialogRefreshTimer: ReturnType<typeof setInterval> | null = null;
let runtimeLogDialogRefreshing = false;
let queueListRequestSeq = 0;
let queueListSilentRequestSeq = 0;
let queueListVisibleLoadingCount = 0;
let queueStatsRequestSeq = 0;

// 对话框相关
const dialogVisible = ref(false);
const dialogTitle = ref(t('queue.addTask'));
const formRef = ref();
const formData = reactive({
  type: "",
  description: "",
  dataStr: "{}",
  delay: 0,
});

const formRules = {
  type: [{ required: true, message: t('queue.enterTaskType'), trigger: "blur" }],
  dataStr: [
    { required: true, message: t('queue.enterTaskData'), trigger: "blur" },
    {
      validator: (_rule, value, callback) => {
        try {
          JSON.parse(value);
          callback();
        } catch {
          callback(new Error(t('queue.validJsonFormat')));
        }
      },
      trigger: "blur",
    },
  ],
};

// 状态编辑对话框
const statusDialogVisible = ref(false);
const statusFormRef = ref();
const statusFormData = reactive({
  id: "",
  type: "",
  status: "" as QueueMessage["status"],
  newStatus: "" as QueueMessage["status"],
  error: "",
});

const statusFormRules = {
  newStatus: [{ required: true, message: t('queue.selectNewStatus'), trigger: "change" }],
  error: [{ required: true, message: t('queue.enterErrorMessage'), trigger: "blur" }],
};

// 查看数据对话框
const dataDialogVisible = ref(false);
const dataDialogLoading = ref(false);
const currentTaskData = ref<any>({});
const currentTaskId = ref<string>("");
const currentTaskQueue = ref<string>("");
const currentTaskRuntimeLog = ref<any>(null);
const runtimeLogDialogVisible = ref(false);
const runtimeLogDialogLoading = ref(false);
const runtimeLogDataDialogVisible = ref(false);
const runtimeLogDataDialogText = ref("");
const runtimeLogDataDialogMeta = reactive({
  time: "",
  level: "",
  message: "",
});

const currentTaskRuntime = computed(() =>
  extractTaskRuntime(currentTaskData.value, currentTaskRuntimeLog.value),
);
const currentTaskLogs = computed(() => {
  const logs = currentTaskRuntime.value?.logs;
  return Array.isArray(logs) ? logs : [];
});

// 更新数据对话框
const dataUpdateDialogVisible = ref(false);
const dataUpdateFormRef = ref();
const dataUpdateFormData = reactive({
  queue: "",
  messageId: "",
  dataStr: "",
  dataObj: {} as any,
});
const currentDataUpdateRow = ref<QueueMessage | null>(null);

const parsedUpdateData = computed(() => {
  if (!dataUpdateFormData.dataStr.trim()) return {};
  try {
    return JSON.parse(dataUpdateFormData.dataStr);
  } catch (e) {
    return { error: t('queue.invalidJsonHint') };
  }
});

const showPublishDispatchPanel = computed(() => {
  const selectedTypes = getSelectedQueryTypes();
  return (
    selectedTypes.length === 0 ||
    selectedTypes.some((type) => type.startsWith("publish-product-")) ||
    dataSource.value.some((row) => isPublishTaskRow(row))
  );
});

const publishTaskRunningCount = computed(() => Number(stats.value.processing || 0));

const publishTaskAutoDispatchStatusText = computed(() => {
  if (publishTaskRunningCount.value > 0) {
    return t('queue.runningCount', { count: publishTaskRunningCount.value });
  }

  return publishTaskAutoDispatchEnabled.value ? t('queue.clientPolling') : t('queue.disabled');
});

const publishTaskAutoDispatchStatusClass = computed(() => ({
  "is-success": publishTaskAutoDispatchEnabled.value && publishTaskRunningCount.value === 0,
  "is-warning": publishTaskRunningCount.value > 0,
  "is-info": !publishTaskAutoDispatchEnabled.value && publishTaskRunningCount.value === 0,
}));

const publishTaskAutoDispatchTargetClient = computed(
  () =>
    browserAutomationClients.value.find(
      (client) => client.id === autoDispatchTargetClientId.value,
    ) || null,
);

const publishTaskAutoDispatchTargetText = computed(() => {
  const clientLabel = publishTaskAutoDispatchTargetClient.value
    ? formatClientNodeName(publishTaskAutoDispatchTargetClient.value)
    : autoDispatchTargetClientId.value || null;
  if (!clientLabel) {
    return t('queue.noClientSet');
  }

  const runningRow = currentAutoDispatchRunningRows.value[0];
  if (runningRow) {
    const taskTypeLabel = runningRow.type || "";
    const runtime = extractTaskRuntime(
      normalizeTaskDataRecord(runningRow.data),
      runningRow.taskRuntimeLog,
    );
    const step = runtime?.currentStep || runtime?.status || "";
    const brief = step ? `${taskTypeLabel} (${step})` : taskTypeLabel;
    return `${clientLabel} / ${brief}`;
  }

  const profileLabel = selectedAutoDispatchClientRow.value?.profileLabel || autoDispatchTargetProfileId.value;
  return profileLabel ? `${clientLabel} / ${profileLabel}` : clientLabel;
});

const publishTaskAutoDispatchTargetHint = computed(() => {
  const runningCount = currentAutoDispatchRunningRows.value.length;
  const client = publishTaskAutoDispatchTargetClient.value;
  if (!autoDispatchTargetClientId.value) {
    return t('queue.autoDispatchNotBound');
  }
  if (!client) {
    return t('queue.targetClientNotConnected');
  }
  if (!client.isOnline) {
    return t('queue.targetClientOffline');
  }
  const runtime = getBrowserAutomationRuntime(client) as Record<string, any>;
  if (!(runtime?.available || runtime?.connected)) {
    return t('queue.browserAutomationNotReady');
  }
  const matchedRow =
    autoDispatchClientRows.value.find(
      (item) =>
        item.clientId === autoDispatchTargetClientId.value &&
        item.profileId === normalizeDispatchProfileId(autoDispatchTargetProfileId.value),
    ) ||
    null;
  const baseText = matchedRow?.description || t('queue.targetClientBound');
  return runningCount > 0 ? t('queue.currentRunningTasks', { baseText, count: runningCount }) : baseText;
});

const publishTaskAutoDispatchFilterSummary = computed(() =>
  getAutoDispatchFilterSummary(buildAutoDispatchFilterFromForm()),
);

const publishTaskAutoDispatchFilterDetail = computed(() =>
  getAutoDispatchFilterDetail(buildAutoDispatchFilterFromForm()),
);

const publishTaskAutoDispatchTargetClass = computed(() => ({
  "is-success":
    !!publishTaskAutoDispatchTargetClient.value &&
    !!publishTaskAutoDispatchTargetClient.value.isOnline &&
    !!(
      getBrowserAutomationRuntime(publishTaskAutoDispatchTargetClient.value)?.available ||
      getBrowserAutomationRuntime(publishTaskAutoDispatchTargetClient.value)?.connected
    ),
  "is-warning":
    !!autoDispatchTargetClientId.value &&
    (!publishTaskAutoDispatchTargetClient.value ||
      !publishTaskAutoDispatchTargetClient.value.isOnline ||
      !(
        getBrowserAutomationRuntime(publishTaskAutoDispatchTargetClient.value)?.available ||
        getBrowserAutomationRuntime(publishTaskAutoDispatchTargetClient.value)?.connected
      )),
  "is-info": !autoDispatchTargetClientId.value,
}));

const currentAutoDispatchRunningRows = computed(() =>
  dataSource.value.filter((row) => {
    const target = getQueueTaskDispatchTarget(row);
    if (!target.clientId) {
      return false;
    }
    if (target.clientId !== autoDispatchTargetClientId.value) {
      return false;
    }
    if (autoDispatchTargetProfileId.value && target.profileId !== autoDispatchTargetProfileId.value) {
      return false;
    }
    return row.status === "processing";
  }),
);

const dispatchClientCandidates = computed(() =>
  clientNodes.value.filter((client) => {
    if (!client?.isOnline) {
      return false;
    }
    return !!getBrowserAutomationRuntime(client);
  }),
);

const dispatchAvailableRows = computed<ManualDispatchOptionRow[]>(() => {
  const taskType = dispatchTargetTask.value?.type;
  return dispatchClientCandidates.value
    .flatMap((client) => {
      const onlineTag = getDispatchClientOnlineTag(client);
      const serviceTag = getDispatchClientServiceTag(client);
      const taskState = getClientTaskTypeState(client, taskType);
      const profileOptions = resolveClientDispatchProfileOptions(client, taskType);
      const concreteOptions = profileOptions.filter((item) => !item.isAuto);
      const effectiveOptions = concreteOptions.length
        ? concreteOptions
        : profileOptions.length
          ? profileOptions
          : [
              {
                profileId: null,
                label: t('queue.noAvailableEnvironment'),
                description: taskState.text,
                enabled: false,
                connected: !!getBrowserAutomationRuntime(client)?.available,
                busy: isBrowserAutomationClientBusy(client),
              } satisfies DispatchProfileOption,
            ];

      return effectiveOptions.map((option) => ({
        optionKey: buildDispatchOptionKey(client.id, option.profileId),
        clientId: String(client.id || "").trim(),
        clientLabel: formatClientNodeName(client),
        onlineTag,
        serviceTag,
        profileId: option.profileId,
        profileLabel: option.label,
        runtimeModeTag:
          option.runtimeModeTag ||
          getDispatchProfileRuntimeModeTag(null, {
            isAuto: option.isAuto === true,
          }),
        profileTag: getDispatchProfileTag(client, option, taskType),
        description: taskState.enabled ? option.description : taskState.text,
        selectable: taskState.enabled && option.enabled,
      }));
    })
    .sort((a, b) => {
      if (a.selectable !== b.selectable) {
        return a.selectable ? -1 : 1;
      }
      const clientCompare = a.clientLabel.localeCompare(b.clientLabel, "zh-CN");
      if (clientCompare !== 0) {
        return clientCompare;
      }
      return a.profileLabel.localeCompare(b.profileLabel, "zh-CN");
    });
});
const dispatchSelectableRows = computed(() =>
  dispatchAvailableRows.value.filter((item) => item.selectable),
);

const autoDispatchClientRows = computed<DispatchOptionRow[]>(() =>
  dispatchClientCandidates.value
    .flatMap((client) => {
      const runtime = getBrowserAutomationRuntime(client) as Record<string, any>;
      const clientReady = !!(client?.isOnline && (runtime?.available || runtime?.connected));
      const autoDispatchEnabled =
        runtime?.autoDispatchEnabled ?? runtime?.details?.autoDispatchEnabled ?? true;
      const profileOptions = resolveClientConcreteDispatchProfileOptions(client);
      const effectiveOptions = profileOptions.length
        ? profileOptions
        : [
            {
              profileId: null,
              label: t('queue.noAvailableEnvironment'),
              description: clientReady
                ? t('queue.clientNoBrowserEnv')
                : resolveAutoDispatchUnavailableReason(client),
              enabled: false,
              connected: false,
              busy: false,
              runtimeModeTag: getDispatchProfileRuntimeModeTag(null),
            } satisfies DispatchProfileOption,
          ];

      return effectiveOptions.map((option) => {
        const selectable =
          clientReady && autoDispatchEnabled !== false && !!option.profileId && option.enabled;
        return {
          optionKey: buildDispatchOptionKey(client.id, option.profileId),
          clientId: String(client.id || "").trim(),
          clientLabel: formatClientNodeName(client),
          onlineTag: getDispatchClientOnlineTag(client),
          serviceTag: getDispatchClientServiceTag(client),
          profileId: option.profileId,
          profileLabel: option.label,
          profileTag: getDispatchProfileTag(client, option),
          runtimeModeTag: option.runtimeModeTag || getDispatchProfileRuntimeModeTag(null),
          acceptTag: selectable
            ? ({ text: t('queue.acceptable'), type: "success" } as DispatchStatusTag)
            : ({ text: t('queue.unavailable'), type: clientReady ? "warning" : "info" } as DispatchStatusTag),
          description:
            autoDispatchEnabled === false
              ? t('queue.clientAutoDispatchClosed')
              : clientReady
                ? option.description || t('queue.targetClientClaimTask')
                : resolveAutoDispatchUnavailableReason(client),
          selectable,
        };
      });
    })
    .sort((a, b) => {
      if (a.selectable !== b.selectable) {
        return a.selectable ? -1 : 1;
      }
      const clientCompare = a.clientLabel.localeCompare(b.clientLabel, "zh-CN");
      if (clientCompare !== 0) {
        return clientCompare;
      }
      return a.profileLabel.localeCompare(b.profileLabel, "zh-CN");
    }),
);
const autoDispatchSelectableRows = computed(() =>
  autoDispatchClientRows.value.filter((item) => item.selectable),
);
const selectedAutoDispatchClientRow = computed(
  () =>
    autoDispatchClientRows.value.find(
      (item) =>
        item.clientId === autoDispatchTargetClientId.value &&
        item.profileId === normalizeDispatchProfileId(autoDispatchTargetProfileId.value),
    ) ||
    null,
);
const canConfirmAutoDispatchTarget = computed(
  () => !autoDispatchTargetDialogLoading.value && !!selectedAutoDispatchClientRow.value?.selectable,
);

const selectedDispatchRow = computed(
  () =>
    dispatchAvailableRows.value.find(
      (item) => item.optionKey === selectedDispatchOptionKey.value,
    ) || null,
);
const selectedDispatchOptionKey = computed({
  get: () =>
    buildDispatchOptionKey(
      selectedDispatchClientId.value,
      normalizeDispatchProfileId(selectedDispatchProfileId.value),
    ),
  set: (value: string) => {
    const selection = parseDispatchOptionKey(value);
    selectedDispatchClientId.value = selection.clientId;
    selectedDispatchProfileId.value = selection.profileId || "";
  },
});

const selectedAutoDispatchOptionKey = computed({
  get: () =>
    buildDispatchOptionKey(
      autoDispatchTargetClientId.value,
      normalizeDispatchProfileId(autoDispatchTargetProfileId.value),
    ),
  set: (value: string) => {
    const selection = parseDispatchOptionKey(value);
    autoDispatchTargetClientId.value = selection.clientId;
    autoDispatchTargetProfileId.value = selection.profileId || "";
  },
});

const canConfirmPublishDispatch = computed(
  () => !publishDispatchDialogLoading.value && !!selectedDispatchRow.value?.selectable,
);

watchEffect(() => {
  gridOptions.value.maxHeight = Math.max(
    height.value - (showPublishDispatchPanel.value ? 320 : 280),
    360,
  );
});

function isPublishTaskRow(row?: QueueMessage | null) {
  return String(row?.type || "").startsWith("publish-product-");
}

const PUBLISH_DISPATCH_STALE_MS = 45_000;

function getPublishDispatchMeta(row?: QueueMessage | null) {
  const meta = row?.metadata?.publishDispatch;
  const normalizedMeta = meta && typeof meta === "object" ? meta : {};
  const heartbeat = String(
    normalizedMeta.lastHeartbeatAt || normalizedMeta.assignedAt || normalizedMeta.startedAt || "",
  ).trim();
  const status = String(normalizedMeta.status || "").trim();

  if (
    heartbeat &&
    (status === "assigned" || status === "running") &&
    Date.now() - new Date(heartbeat).getTime() >= PUBLISH_DISPATCH_STALE_MS
  ) {
    return {
      ...normalizedMeta,
      status: "timeout",
      currentStep: normalizedMeta.currentStep || t('queue.executionHeartbeatTimeout'),
      lastError: normalizedMeta.lastError || t('queue.executionHeartbeatLost'),
    };
  }

  return normalizedMeta;
}

function supportsTaskType(client: any, taskType?: string) {
  const runtime = getBrowserAutomationRuntime(client);
  return supportsBrowserAutomationTaskType(runtime, taskType);
}

function normalizeDispatchProfileId(value: any) {
  const normalized = String(value || "").trim();
  return normalized || null;
}

function buildDispatchOptionKey(clientId: any, profileId?: string | null) {
  const normalizedClientId = String(clientId || "").trim();
  if (!normalizedClientId) {
    return "";
  }
  return `${normalizedClientId}::${normalizeDispatchProfileId(profileId) || "__auto__"}`;
}

function parseDispatchOptionKey(value: any) {
  const normalizedValue = String(value || "").trim();
  const [rawClientId, rawProfileId = ""] = normalizedValue.split("::");
  const clientId = String(rawClientId || "").trim();
  const profileId =
    rawProfileId && rawProfileId !== "__auto__" ? normalizeDispatchProfileId(rawProfileId) : null;

  return {
    clientId,
    profileId,
  };
}

function getClientDispatchProfileInstances(client: any) {
  const runtime = getBrowserAutomationRuntime(client) as Record<string, any>;
  const instances = runtime?.details?.instances;
  return Array.isArray(instances) ? instances : [];
}

function getClientDispatchProfiles(client: any) {
  const runtime = getBrowserAutomationRuntime(client) as Record<string, any>;
  const profiles = runtime?.details?.profiles;
  return Array.isArray(profiles) ? profiles : [];
}

function getDispatchProfileRuntimeModeTag(
  instance?: Record<string, any> | null,
  options: { isAuto?: boolean } = {},
): DispatchStatusTag {
  if (options.isAuto) {
    return { text: t('queue.auto'), type: "info" };
  }
  const started = !!(
    instance?.hasInstance ||
    instance?.connected ||
    instance?.isConnected ||
    instance?.connecting
  );
  if (!started) {
    return { text: t('queue.notStarted'), type: "info" };
  }
  if (instance?.headless === true) {
    return { text: t('queue.headless'), type: "warning" };
  }
  if (instance?.headless === false) {
    return { text: t('queue.normal'), type: "success" };
  }
  return { text: t('queue.unknown'), type: "info" };
}

function getDispatchClientOnlineTag(client: any): DispatchStatusTag {
  return client?.isOnline ? { text: t('queue.online'), type: "success" } : { text: t('queue.offline'), type: "info" };
}

function getDispatchClientServiceTag(client: any): DispatchStatusTag {
  const runtime = getBrowserAutomationRuntime(client) as Record<string, any>;
  const status = String(runtime?.status || "").trim();

  if (!client?.isOnline) {
    return { text: t('queue.offline'), type: "info" };
  }
  if (status === "error") {
    return { text: t('queue.abnormal'), type: "danger" };
  }
  if (runtime?.available || runtime?.connected) {
    return { text: t('queue.enabled'), type: "success" };
  }

  return { text: t('queue.notEnabled'), type: "warning" };
}

function getDispatchProfileTag(
  client: any,
  option: DispatchProfileOption,
  taskType?: string,
): DispatchStatusTag {
  const runtime = getBrowserAutomationRuntime(client) as Record<string, any>;
  const normalizedTaskType = String(taskType || "").trim();

  if (!client?.isOnline) {
    return { text: t('queue.unavailable'), type: "info" };
  }
  if (!(runtime?.available || runtime?.connected)) {
    return { text: t('queue.unavailable'), type: "warning" };
  }
  if (normalizedTaskType && !supportsTaskType(client, normalizedTaskType)) {
    return { text: t('queue.notSupported'), type: "warning" };
  }
  if (option.busy) {
    return { text: t('queue.busy'), type: "warning" };
  }

  return { text: t('queue.idle'), type: "success" };
}

function resolveAutoDispatchUnavailableReason(client: any) {
  const runtime = getBrowserAutomationRuntime(client) as Record<string, any>;
  if (!client?.isOnline) {
    return t('queue.clientOffline');
  }
  if (!(runtime?.available || runtime?.connected)) {
    return t('queue.browserAutomationNotReady');
  }
  return t('queue.targetClientNotAccepting');
}

function formatDispatchProfileLabel(profileId: string, profile?: Record<string, any> | null) {
  const profileName =
    String(profile?.name || profile?.profileName || profileId).trim() || profileId;
  return `${profileName}${profileId ? ` (${profileId})` : ""}`;
}

function extractRequestErrorMessage(error: any, fallback = t('queue.operationFailed')) {
  return error?.response?.data?.message || error?.message || fallback;
}

function resolveClientDispatchProfileOptions(
  client: any,
  taskType?: string,
): DispatchProfileOption[] {
  const runtime = getBrowserAutomationRuntime(client) as Record<string, any>;
  if (
    !taskType ||
    !client?.isOnline ||
    !runtime?.connected ||
    !supportsTaskType(client, taskType)
  ) {
    return [];
  }

  const profileInstances = getClientDispatchProfileInstances(client);
  const profiles = getClientDispatchProfiles(client);
  const profileMap = new Map(
    profiles
      .map((item: any) => [normalizeDispatchProfileId(item?.id), item] as const)
      .filter(([profileId]) => !!profileId),
  );
  const instanceMap = new Map(
    profileInstances
      .map((item: any) => [normalizeDispatchProfileId(item?.profileId), item] as const)
      .filter(([profileId]) => !!profileId),
  );
  const orderedProfileIds = Array.from(
    new Set(
      [...profileInstances, ...profiles]
        .map((item: any) => normalizeDispatchProfileId(item?.profileId || item?.id))
        .filter(Boolean),
    ),
  ) as string[];

  const concreteOptions = orderedProfileIds.map((profileId) => {
    const profile = profileMap.get(profileId) || instanceMap.get(profileId) || null;
    const instance = instanceMap.get(profileId) || null;
    const busy = instance?.busy === true;
    const connected = instance?.connected === true || instance?.hasInstance === true;
    const pageCount = typeof instance?.pageCount === "number" ? Number(instance.pageCount) : null;

    let description = t('queue.browserWillLaunch');
    if (busy) {
      description = instance?.currentTaskId
        ? t('queue.currentlyExecutingTask', { id: instance.currentTaskId })
        : t('queue.envExecutingTask');
    } else if (connected) {
      description = pageCount !== null ? t('queue.browserOpenPages', { count: pageCount }) : t('queue.browserOpened');
    }

    return {
      profileId,
      label: formatDispatchProfileLabel(profileId, profile),
      description,
      enabled: !busy,
      connected,
      busy,
      runtimeModeTag: getDispatchProfileRuntimeModeTag(instance),
    } satisfies DispatchProfileOption;
  });

  const enabledConcreteOptions = concreteOptions.filter((item) => item.enabled);
  const autoEnabled = orderedProfileIds.length
    ? enabledConcreteOptions.length > 0
    : !isBrowserAutomationRuntimeBusyByRuntime(runtime);

  return [
    {
      profileId: null,
      label: t('queue.autoSelect'),
      description: orderedProfileIds.length
        ? autoEnabled
          ? t('queue.autoSelectFromIdle', { count: enabledConcreteOptions.length })
          : t('queue.noIdleBrowserConfig')
        : t('queue.clientNoReportConfig'),
      enabled: autoEnabled,
      connected: !!runtime?.available,
      busy: !autoEnabled,
      runtimeModeTag: getDispatchProfileRuntimeModeTag(null, { isAuto: true }),
      isAuto: true,
    },
    ...concreteOptions,
  ];
}

function formatClientNodeName(client: any) {
  return (
    getClientMachineCode(client) ||
    client?.location?.city ||
    client?.clientId ||
    client?.id ||
    "-"
  );
}

function getClientMachineCode(client: any) {
  return String(client?.clientInfo?.machine?.code || client?.machine?.code || "").trim();
}

function isBrowserAutomationClientBusy(client: any) {
  return isBrowserAutomationRuntimeBusyByRuntime(getBrowserAutomationRuntime(client));
}

function getClientTaskTypeState(client: any, taskType?: string) {
  if (!taskType) {
    return {
      enabled: false,
      text: t('queue.taskTypeUnknown'),
      tagType: "info" as QueueTagType,
      tagText: t('queue.unknown'),
    } satisfies DispatchClientState;
  }
  if (!client?.isOnline) {
    return {
      enabled: false,
      text: t('queue.clientOffline'),
      tagType: "info" as QueueTagType,
      tagText: t('queue.offline'),
    } satisfies DispatchClientState;
  }
  const runtime = getBrowserAutomationRuntime(client);
  const runtimeHint = getBrowserAutomationRuntimeHint(runtime);
  if (!(runtime?.available || runtime?.connected)) {
    return {
      enabled: false,
      text: runtimeHint ? t('queue.automationServiceUnavailableHint', { reason: runtimeHint }) : t('queue.automationServiceUnavailable'),
      tagType: "warning" as QueueTagType,
      tagText: t('queue.notReady'),
    } satisfies DispatchClientState;
  }
  if (!supportsTaskType(client, taskType)) {
    return {
      enabled: false,
      text: t('queue.nodeNotSupportTaskType'),
      tagType: "warning" as QueueTagType,
      tagText: t('queue.notSupported'),
    } satisfies DispatchClientState;
  }
  const profileOptions = resolveClientDispatchProfileOptions(client, taskType).filter(
    (item) => !item.isAuto,
  );
  if (profileOptions.length > 0) {
    const enabledProfiles = profileOptions.filter((item) => item.enabled);
    if (!enabledProfiles.length) {
      return {
        enabled: false,
        text: t('queue.allEnvironmentsBusy'),
        tagType: "warning" as QueueTagType,
        tagText: t('queue.busy'),
      } satisfies DispatchClientState;
    }
    const connectedCount = enabledProfiles.filter((item) => item.connected).length;
    return {
      enabled: true,
      text:
        connectedCount > 0
          ? t('queue.executableEnvironmentsWithOpened', { count: enabledProfiles.length, opened: connectedCount })
          : t('queue.executableEnvironmentsAutoLaunch', { count: enabledProfiles.length }),
      tagType: "success" as QueueTagType,
      tagText: t('queue.executable'),
    } satisfies DispatchClientState;
  }
  if (isBrowserAutomationClientBusy(client)) {
    return {
      enabled: false,
      text: runtimeHint ? t('queue.nodeBusyHint', { reason: runtimeHint }) : t('queue.nodeBusy'),
      tagType: "warning" as QueueTagType,
      tagText: t('queue.busy'),
    } satisfies DispatchClientState;
  }
  return {
    enabled: true,
    text: t('queue.readyToExecute'),
    tagType: "success" as QueueTagType,
    tagText: t('queue.executable'),
  } satisfies DispatchClientState;
}

function syncDispatchProfileSelection() {
  const matched = dispatchAvailableRows.value.find(
    (item) => item.optionKey === selectedDispatchOptionKey.value,
  );
  if (matched?.selectable) {
    return;
  }

  const preferredRow = dispatchSelectableRows.value[0] || matched || dispatchAvailableRows.value[0];
  selectedDispatchClientId.value = preferredRow?.clientId || "";
  selectedDispatchProfileId.value = preferredRow?.profileId || "";
}

// 获取状态类型
function getStatusType(status: QueueMessage["status"]) {
  const map: Record<QueueMessage["status"], QueueTagType> = {
    pending: "info",
    waiting: "warning",
    processing: "warning",
    completed: "success",
    failed: "danger",
  };
  return map[status] || "info";
}

// 获取状态文本
function getStatusText(status: QueueMessage["status"]) {
  const map = {
    pending: t('queue.pending'),
    waiting: t('queue.waiting'),
    processing: t('queue.processing'),
    completed: t('queue.completed'),
    failed: t('queue.failed'),
  };
  return map[status] || status;
}

function getExecutionStatusInfo(row: QueueMessage): ExecutionStatusInfo {
  const indicator = resolveTaskExecutionReadinessIndicator(row);
  return {
    text: indicator.text,
    type: indicator.type,
    reason: indicator.reason || null,
    ready: indicator.ready,
  };
}

function getQueueTaskDispatchTarget(row?: QueueMessage | null) {
  const meta = getPublishDispatchMeta(row);
  const runtime = extractTaskRuntime(normalizeTaskDataRecord(row?.data), row?.taskRuntimeLog);
  const clientId = String(meta?.assignedClientId || runtime?.assignedClientId || "").trim() || null;
  const machineCode =
    String(meta?.assignedMachineCode || runtime?.assignedMachineCode || "").trim() || null;
  const profileId =
    String(
      meta?.profileId ||
        row?.metadata?.profileId ||
        row?.metadata?.browserAutomationProfileId ||
        runtime?.assignedProfileId ||
        "",
    ).trim() || null;

  return {
    clientId,
    machineCode,
    profileId,
  };
}

function getQueueTaskDispatchTargetText(row?: QueueMessage | null) {
  const target = getQueueTaskDispatchTarget(row);
  if (!target.clientId && !target.machineCode) {
    return "-";
  }

  return target.machineCode || target.clientId || t('queue.unknownClient');
}

function getQueueTaskDispatchTargetHint(row?: QueueMessage | null) {
  const meta = getPublishDispatchMeta(row);
  const hints = [
    meta?.status ? t('queue.dispatchStatus', { status: meta.status }) : "",
    meta?.currentStep ? String(meta.currentStep) : "",
  ]
    .map((item) => String(item || "").trim())
    .filter(Boolean);

  return hints.join(" · ");
}

function resolveQueueTaskStatusMessage(row?: QueueMessage | null) {
  const normalizedStatus = String(row?.status || "")
    .trim()
    .toLowerCase();
  const meta = getPublishDispatchMeta(row);
  const currentStep = String(meta?.currentStep || "").trim();
  const lastError = String(meta?.lastError || row?.error || "").trim();
  const dispatchStatus = String(meta?.status || "")
    .trim()
    .toLowerCase();

  if (
    currentStep &&
    (normalizedStatus === "processing" ||
      dispatchStatus === "assigned" ||
      dispatchStatus === "running")
  ) {
    return currentStep;
  }

  if (lastError && (normalizedStatus === "failed" || dispatchStatus === "failed")) {
    return lastError;
  }

  if (dispatchStatus === "timeout") {
    return lastError || currentStep || t('queue.executionTimeout');
  }

  if (currentStep) {
    return currentStep;
  }

  switch (normalizedStatus) {
    case "completed":
      return t('queue.executionCompleted');
    case "failed":
      return lastError || t('queue.executionFailed');
    case "processing":
      return t('queue.processing');
    case "waiting":
      return t('queue.waitingServerPrepare');
    case "pending":
      return getExecutionStatusInfo(row as QueueMessage).reason || t('queue.pending');
    default:
      return lastError || "-";
  }
}

function canStartPublishExecution(row: QueueMessage) {
  const executionStatus = getExecutionStatusInfo(row);
  if (!isPublishTaskRow(row)) {
    return false;
  }
  if (row.status === "waiting" || row.status === "processing") {
    return false;
  }
  return !!executionStatus.ready;
}

function canStopPublishExecution(row: QueueMessage) {
  if (!isPublishTaskRow(row)) {
    return false;
  }

  const dispatchMeta = getPublishDispatchMeta(row);
  return (
    row.status === "processing" ||
    ((row.status === "pending" || row.status === "waiting") &&
      (dispatchMeta.status === "assigned" || dispatchMeta.status === "running"))
  );
}

function canResetPublishExecution(row: QueueMessage) {
  if (!isPublishTaskRow(row)) {
    return false;
  }

  return !canStopPublishExecution(row);
}

function parseMaybeJson(value: any) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value === "object") {
    return value;
  }

  if (typeof value !== "string") {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch (error) {
    return value;
  }
}

function normalizeTaskRuntimeLogRecord(value: any) {
  const parsed = parseMaybeJson(value);
  return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
}

function extractTaskRuntime(data: any, runtimeLog?: any) {
  if (!data || typeof data !== "object") {
    const runtimeLogRecord = normalizeTaskRuntimeLogRecord(runtimeLog);
    if (!runtimeLogRecord) {
      return null;
    }
    return {
      ...runtimeLogRecord,
      logs: Array.isArray(runtimeLogRecord.logs) ? runtimeLogRecord.logs : [],
    };
  }

  const runtimeLogRecord = normalizeTaskRuntimeLogRecord(runtimeLog);
  if (runtimeLogRecord) {
    const summary =
      data.taskLogs && typeof data.taskLogs === "object" && !Array.isArray(data.taskLogs)
        ? data.taskLogs
        : {};
    return {
      source: runtimeLogRecord.source || summary.source || "uploader",
      sourceId: runtimeLogRecord.sourceId || summary.sourceId || null,
      platform: runtimeLogRecord.platform || summary.platform || null,
      status: summary.status || runtimeLogRecord.status || null,
      step: summary.step || summary.currentStep || runtimeLogRecord.step || null,
      logCount:
        typeof runtimeLogRecord.logCount === "number"
          ? runtimeLogRecord.logCount
          : Array.isArray(runtimeLogRecord.logs)
            ? runtimeLogRecord.logs.length
            : Number(summary.logCount) || 0,
      lastLogId: runtimeLogRecord.lastLogId || summary.lastLogId || null,
      lastLogTime: runtimeLogRecord.lastLogTime || summary.lastLogTime || null,
      lastLogLevel: runtimeLogRecord.lastLogLevel || summary.lastLogLevel || null,
      lastLogMessage: runtimeLogRecord.lastLogMessage || summary.lastLogMessage || null,
      updatedAt: runtimeLogRecord.updatedAt || summary.updatedAt || null,
      logs: Array.isArray(runtimeLogRecord.logs) ? runtimeLogRecord.logs : [],
    };
  }

  if (data.taskLogs && typeof data.taskLogs === "object") {
    return data.taskLogs;
  }

  if (data.taskRuntime && typeof data.taskRuntime === "object") {
    return data.taskRuntime;
  }

  const legacyRuntime = data.executionRuntime;
  if (!legacyRuntime || typeof legacyRuntime !== "object") {
    return null;
  }

  if (Array.isArray(legacyRuntime.logs)) {
    return legacyRuntime;
  }

  const firstPlatformKey = Object.keys(legacyRuntime)[0];
  if (!firstPlatformKey) {
    return null;
  }

  const firstPlatformRuntime = legacyRuntime[firstPlatformKey];
  if (!firstPlatformRuntime || typeof firstPlatformRuntime !== "object") {
    return null;
  }

  return {
    platform: firstPlatformRuntime.platform || firstPlatformKey,
    logs: Array.isArray(firstPlatformRuntime.logs) ? firstPlatformRuntime.logs : [],
  };
}

function formatLogTimestamp(value: any) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }
  return date.toLocaleString();
}

function normalizeLogLevel(level: any) {
  const normalized = String(level || "info")
    .trim()
    .toLowerCase();

  if (["error", "danger"].includes(normalized)) return "error";
  if (["warn", "warning"].includes(normalized)) return "warning";
  if (["success", "ok", "done", "completed"].includes(normalized)) return "success";
  if (["debug", "trace"].includes(normalized)) return "debug";
  return "info";
}

function hasLogData(log: any) {
  return (
    log?.data !== undefined &&
    log?.data !== null &&
    !(Array.isArray(log.data) && log.data.length === 0)
  );
}

function formatLogData(value: any) {
  try {
    return JSON.stringify(value, null, 2);
  } catch (error) {
    return String(value);
  }
}

function openRuntimeLogData(log: any, index: number) {
  runtimeLogDataDialogMeta.time = formatLogTimestamp(log?.time || log?.timestamp);
  runtimeLogDataDialogMeta.level = String(log?.level || "info").toUpperCase();
  runtimeLogDataDialogMeta.message = String(log?.message || t('queue.logN', { n: index + 1 }));
  runtimeLogDataDialogText.value = formatLogData(log?.data);
  runtimeLogDataDialogVisible.value = true;
}

function formatRawJson(value: any) {
  try {
    return JSON.stringify(value ?? {}, null, 2);
  } catch (error) {
    return String(value ?? "");
  }
}

function getQueueRowClassName(row: QueueMessage) {
  if (!isPublishTaskRow(row)) {
    return "";
  }

  const dispatchMeta = getPublishDispatchMeta(row);
  if (
    row.status === "processing" ||
    ((row.status === "pending" || row.status === "waiting") &&
      (dispatchMeta.status === "assigned" || dispatchMeta.status === "running"))
  ) {
    return "queue-row queue-row--running";
  }

  if (
    dispatchMeta.status === "failed" ||
    dispatchMeta.status === "timeout" ||
    row.status === "failed"
  ) {
    return "queue-row queue-row--failed";
  }

  return "queue-row";
}

function normalizeTaskDataRecord(value: any) {
  const parsed = parseMaybeJson(value);
  return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
}

// 获取列表
async function getList(options?: unknown) {
  const silent =
    !!options &&
    typeof options === "object" &&
    "silent" in options &&
    !!(options as { silent?: boolean }).silent;
  const requestSeq = silent ? queueListRequestSeq : ++queueListRequestSeq;
  const silentRequestSeq = silent ? ++queueListSilentRequestSeq : 0;
  if (!silent) {
    queueListSilentRequestSeq += 1;
    queueListVisibleLoadingCount += 1;
    loading.value = true;
  }
  try {
    const [sortField, sortOrder] = queryParams.sortType.split("_");
    const res = await getTaskList({
      status: queryParams.status,
      executionReadinessStatus: queryParams.executionReadinessStatus,
      types: getSelectedQueryTypes().length > 0 ? getSelectedQueryTypes() : undefined,
      id: queryParams.id?.trim() || undefined,
      sortField: sortField as "createdAt" | "updatedAt" | "processedAt",
      sortOrder: sortOrder as "ASC" | "DESC",
      includeTotal: !silent,
      limit: queryParams.pageSize,
      offset: (queryParams.currentPage - 1) * queryParams.pageSize,
      createdAfter: queryParams.createdDateRange?.[0] || undefined,
      createdBefore: queryParams.createdDateRange?.[1] || undefined,
    });

    let responseData = res;

    if (res && res.data && typeof res.data === "object" && !Array.isArray(res.data)) {
      if (
        res.data.success !== undefined ||
        res.data.list !== undefined ||
        res.data.total !== undefined
      ) {
        responseData = res.data;
      }
    }

    if (
      requestSeq !== queueListRequestSeq ||
      (silent && silentRequestSeq !== queueListSilentRequestSeq)
    ) {
      return;
    }

    if (responseData) {
      const isSuccess =
        responseData.success !== false && responseData.success !== undefined
          ? responseData.success
          : true;

      if (isSuccess) {
        const messages = responseData.list || responseData.messages || [];
        const totalCount =
          responseData.total !== undefined
            ? Number(responseData.total) || 0
            : Array.isArray(messages)
              ? messages.length
              : 0;

        dataSource.value = Array.isArray(messages) ? messages : [];
        if (!silent || responseData.total !== undefined) {
          total.value = totalCount;
        }
      } else {
        if (!silent) {
          dataSource.value = [];
          total.value = 0;
        }
      }
    } else {
      if (!silent) {
        dataSource.value = [];
        total.value = 0;
      }
    }
    if (!silent) {
      ids.value = [];
    }
  } catch (error: any) {
    if (requestSeq === queueListRequestSeq) {
      if (!silent) {
        ElMessage.error(error?.message || t('queue.fetchListFailed'));
        dataSource.value = [];
        total.value = 0;
      }
    }
  } finally {
    if (!silent) {
      queueListVisibleLoadingCount = Math.max(0, queueListVisibleLoadingCount - 1);
      if (queueListVisibleLoadingCount === 0) {
        loading.value = false;
      }
    }
  }
}

function handleSortTypeChange() {
  queryParams.currentPage = 1;
  getList();
}

// 重置筛选条件
function handleResetQuery() {
  // 恢复默认值
  queryParams.currentPage = 1;
  queryParams.pageSize = defaultQueueQueryFilters.pageSize;
  queryParams.status = undefined;
  queryParams.executionReadinessStatus = undefined;
  queryParams.types = [];
  queryParams.id = "";
  queryParams.sortType = defaultQueueQueryFilters.sortType;
  queryParams.createdDateRange = null;

  // 清除缓存
  queueQueryFilterStorage.value = { ...defaultQueueQueryFilters };
  localStorage.removeItem("queue_last_type");

  // 刷新列表和统计
  getList();
  refreshStats();
}

function handleQueryChange() {
  queryParams.currentPage = 1;
  getList();
  refreshStats();
}

async function refreshStats() {
  const requestSeq = ++queueStatsRequestSeq;
  try {
    const queueName = getStatsQueueName();
    const selectedTypes = getSelectedQueryTypes();
    const res = await getQueueStats(
      queueName,
      selectedTypes.length > 1 ? selectedTypes : undefined,
    );

    let statsData = res;

    if (res && res.data && typeof res.data === "object" && !Array.isArray(res.data)) {
      if (
        res.data.queue !== undefined ||
        res.data.pending !== undefined ||
        res.data.processing !== undefined
      ) {
        statsData = res.data;
      } else if (res.data.data && typeof res.data.data === "object") {
        statsData = res.data.data;
      }
    }

    if (requestSeq !== queueStatsRequestSeq) {
      return;
    }

    if (statsData && typeof statsData === "object" && !Array.isArray(statsData)) {
      const nextStats = {
        queue: statsData.queue || queueName || "*",
        pending: Number(statsData.pending) || 0,
        waiting: Number(statsData.waiting) || 0,
        processing: Number(statsData.processing) || 0,
        delayed: Number(statsData.delayed) || 0,
        completed: Number(statsData.completed) || 0,
        failed: Number(statsData.failed) || 0,
        total: Number(statsData.total) || 0,
      };
      stats.value = nextStats;
      if (!queryParams.id?.trim()) {
        const statusTotal =
          queryParams.status && queryParams.status in nextStats
            ? Number(nextStats[queryParams.status]) || 0
            : nextStats.total;
        total.value = statusTotal;
      }
    }
  } catch {
    // 不显示错误提示，静默失败
  }
}

// 复选框变化
function checkboxChange(e) {
  ids.value = e.records.map((item) => item.id);
}

function checkboxAllChange(e) {
  ids.value = e.records.map((item) => item.id);
}

function getSelectedQueueRows() {
  const selectedIdSet = new Set(ids.value.map((id) => String(id || "").trim()).filter(Boolean));
  return dataSource.value.filter((row) => selectedIdSet.has(String(row.id || "").trim()));
}

// 任务类型清空处理
function handleTypeClear() {
  queryParams.types = [];
  dataSource.value = [];
  total.value = 0;
  stats.value = {
    queue: "",
    pending: 0,
    waiting: 0,
    processing: 0,
    delayed: 0,
    completed: 0,
    failed: 0,
    total: 0,
  };
  localStorage.removeItem("queue_last_type");
}

// 新增
function handleAdd() {
  dialogTitle.value = t('queue.addTask');
  dialogVisible.value = true;
  // 延迟重置表单，确保 dialogVisible 已更新
  setTimeout(() => {
    resetForm();
  }, 50);
}

// 编辑
function handleEdit(row: QueueMessage) {
  statusFormData.id = row.id;
  statusFormData.type = row.type;
  statusFormData.status = row.status;
  statusFormData.newStatus = row.status;
  statusFormData.error = row.error || "";
  statusDialogVisible.value = true;
}

function normalizeTaskDetailMessageResponse(payload: any) {
  if (payload && typeof payload === "object" && !Array.isArray(payload)) {
    if ("success" in payload) {
      if (payload.success === false) {
        throw new Error(String(payload.message || t('queue.fetchTaskDetailFailed')));
      }
      return payload.data;
    }

    if ("data" in payload && !("id" in payload)) {
      return payload.data;
    }
  }
  return payload;
}

function applyTaskDetailPayload(message: any, fallbackRow?: QueueMessage | null) {
  const fallbackData = parseMaybeJson(fallbackRow?.data) ?? fallbackRow?.data ?? {};
  const fallbackRuntimeLog = normalizeTaskRuntimeLogRecord(fallbackRow?.taskRuntimeLog) ?? null;
  const taskData = parseMaybeJson(message?.data);
  const taskRuntimeLog = normalizeTaskRuntimeLogRecord(message?.taskRuntimeLog);

  currentTaskData.value = taskData ?? fallbackData;
  currentTaskRuntimeLog.value = taskRuntimeLog ?? fallbackRuntimeLog;
}

async function fetchTaskDetailPayload(
  queue: string,
  messageId: string,
  options: {
    fallbackRow?: QueueMessage | null;
    silent?: boolean;
  } = {},
) {
  const res = await getTaskDetail(queue, messageId);
  const message = normalizeTaskDetailMessageResponse(res?.data ?? res);
  applyTaskDetailPayload(message, options.fallbackRow);
  return message;
}

function stopRuntimeLogDialogAutoRefresh() {
  if (runtimeLogDialogRefreshTimer) {
    clearInterval(runtimeLogDialogRefreshTimer);
    runtimeLogDialogRefreshTimer = null;
  }
  runtimeLogDialogRefreshing = false;
}

async function refreshRuntimeLogDialogDetail(options: { silent?: boolean } = {}) {
  if (!runtimeLogDialogVisible.value) {
    return;
  }
  if (runtimeLogDialogRefreshing) {
    return;
  }

  const queue = currentTaskQueue.value.trim();
  const messageId = currentTaskId.value.trim();
  if (!queue || !messageId) {
    return;
  }

  runtimeLogDialogRefreshing = true;
  if (!options.silent) {
    runtimeLogDialogLoading.value = true;
  }

  try {
    await fetchTaskDetailPayload(queue, messageId, { silent: options.silent });
  } catch (error) {
    if (!options.silent) {
      ElMessage.warning(t('queue.fetchRuntimeLogFailed'));
    }
  } finally {
    if (!options.silent) {
      runtimeLogDialogLoading.value = false;
    }
    runtimeLogDialogRefreshing = false;
  }
}

function startRuntimeLogDialogAutoRefresh() {
  stopRuntimeLogDialogAutoRefresh();
  runtimeLogDialogRefreshTimer = setInterval(() => {
    void refreshRuntimeLogDialogDetail({ silent: true });
  }, 2000);
}

// 查看数据，优先拉取详情，避免列表数据被裁剪或序列化后显示为空
async function handleViewData(row: QueueMessage) {
  dataDialogVisible.value = true;
  dataDialogLoading.value = true;
  currentTaskData.value = {};
  currentTaskRuntimeLog.value = null;
  currentTaskId.value = row.id;
  currentTaskQueue.value = row.queue || row.type;

  try {
    await fetchTaskDetailPayload(row.queue || row.type, row.id, {
      fallbackRow: row,
    });
  } catch (error) {
    currentTaskData.value = parseMaybeJson(row?.data) ?? row?.data ?? {};
    currentTaskRuntimeLog.value = normalizeTaskRuntimeLogRecord(row?.taskRuntimeLog) ?? null;
    ElMessage.warning(t('queue.fetchTaskDetailSnapshot'));
  } finally {
    dataDialogLoading.value = false;
  }
}

async function handleViewRuntimeLogs(row: QueueMessage) {
  runtimeLogDialogVisible.value = true;
  runtimeLogDialogLoading.value = true;
  currentTaskData.value = {};
  currentTaskRuntimeLog.value = normalizeTaskRuntimeLogRecord(row?.taskRuntimeLog) ?? null;
  currentTaskId.value = row.id;
  currentTaskQueue.value = row.queue || row.type;

  try {
    await fetchTaskDetailPayload(row.queue || row.type, row.id, {
      fallbackRow: row,
    });
  } catch (error) {
    currentTaskData.value = parseMaybeJson(row?.data) ?? row?.data ?? {};
    currentTaskRuntimeLog.value = normalizeTaskRuntimeLogRecord(row?.taskRuntimeLog) ?? null;
    ElMessage.warning(t('queue.fetchRuntimeLogSnapshot'));
  } finally {
    runtimeLogDialogLoading.value = false;
  }
}

function openPublishDispatchDialog(row: QueueMessage) {
  const executionStatus = getExecutionStatusInfo(row);
  if (!executionStatus.ready) {
    ElMessage.warning(executionStatus.reason || t('queue.taskNotReady'));
    return;
  }

  dispatchTargetTask.value = row;
  selectedDispatchClientId.value = "";
  selectedDispatchProfileId.value = "";
  publishDispatchDialogVisible.value = true;
}

function syncAutoDispatchTargetSelection() {
  const matched = autoDispatchClientRows.value.find(
    (item) =>
      item.clientId === autoDispatchTargetClientId.value &&
      item.profileId === normalizeDispatchProfileId(autoDispatchTargetProfileId.value),
  );
  if (matched?.selectable) {
    return;
  }

  const preferredRow = autoDispatchSelectableRows.value[0] || matched || autoDispatchClientRows.value[0];
  autoDispatchTargetClientId.value = preferredRow?.selectable ? preferredRow.clientId : "";
  autoDispatchTargetProfileId.value = preferredRow?.selectable ? preferredRow.profileId || "" : "";
}

function openAutoDispatchTargetDialog() {
  syncAutoDispatchTargetSelection();
  autoDispatchTargetDialogVisible.value = true;
}

function splitAutoDispatchKeywordText(value: string) {
  return String(value || "")
    .split(/[,，\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function joinAutoDispatchKeywords(value?: string[] | null) {
  return (Array.isArray(value) ? value : [])
    .map((item) => String(item || "").trim())
    .filter(Boolean)
    .join("，");
}

function buildAutoDispatchFilterFromForm(): PublishTaskAutoDispatchFilter {
  const [createdAfter = "", createdBefore = ""] = Array.isArray(autoDispatchFilterDateRange.value)
    ? autoDispatchFilterDateRange.value
    : [];

  return {
    taskTypes: autoDispatchFilterForm.taskTypes
      .map((item) => String(item || "").trim())
      .filter(Boolean),
    includeKeywords: splitAutoDispatchKeywordText(autoDispatchFilterForm.includeKeywordsText),
    excludeKeywords: splitAutoDispatchKeywordText(autoDispatchFilterForm.excludeKeywordsText),
    createdAfter: String(createdAfter || "").trim(),
    createdBefore: String(createdBefore || "").trim(),
  };
}

function applyAutoDispatchFilterToForm(filter?: Partial<PublishTaskAutoDispatchFilter> | null) {
  autoDispatchFilterForm.taskTypes = Array.isArray(filter?.taskTypes)
    ? filter.taskTypes.map((item) => String(item || "").trim()).filter(Boolean)
    : [];
  autoDispatchFilterForm.includeKeywordsText = joinAutoDispatchKeywords(filter?.includeKeywords);
  autoDispatchFilterForm.excludeKeywordsText = joinAutoDispatchKeywords(filter?.excludeKeywords);
  const createdAfter = String(filter?.createdAfter || "").trim();
  const createdBefore = String(filter?.createdBefore || "").trim();
  autoDispatchFilterDateRange.value =
    createdAfter || createdBefore ? [createdAfter, createdBefore] : [];
}

function getAutoDispatchFilterSummary(filter?: Partial<PublishTaskAutoDispatchFilter> | null) {
  const parts: string[] = [];
  const taskTypeCount = Array.isArray(filter?.taskTypes) ? filter.taskTypes.length : 0;
  const includeCount = Array.isArray(filter?.includeKeywords) ? filter.includeKeywords.length : 0;
  const excludeCount = Array.isArray(filter?.excludeKeywords) ? filter.excludeKeywords.length : 0;

  if (taskTypeCount > 0) {
    parts.push(t('queue.taskTypeCount', { count: taskTypeCount }));
  }
  if (includeCount > 0) {
    parts.push(t('queue.includesCount', { count: includeCount }));
  }
  if (excludeCount > 0) {
    parts.push(t('queue.excludesCount', { count: excludeCount }));
  }
  if (filter?.createdAfter || filter?.createdBefore) {
    parts.push(t('queue.timeLimited'));
  }

  return parts.length ? `${t('queue.filterPrefix')}${parts.join(" / ")}` : t('queue.filterAllPending');
}

function getAutoDispatchTaskTypeLabel(type: string) {
  const normalizedType = String(type || "").trim();
  const matched = publishTaskTypeOptions.value.find((item) => item.value === normalizedType);
  return matched?.label ? t('queue.taskTypeLabelWithType', { label: matched.label, type: normalizedType }) : normalizedType;
}

function getAutoDispatchFilterDetail(filter?: Partial<PublishTaskAutoDispatchFilter> | null) {
  const taskTypes = Array.isArray(filter?.taskTypes)
    ? filter.taskTypes.map((item) => String(item || "").trim()).filter(Boolean)
    : [];
  const includeKeywords = Array.isArray(filter?.includeKeywords)
    ? filter.includeKeywords.map((item) => String(item || "").trim()).filter(Boolean)
    : [];
  const excludeKeywords = Array.isArray(filter?.excludeKeywords)
    ? filter.excludeKeywords.map((item) => String(item || "").trim()).filter(Boolean)
    : [];
  const createdAfter = String(filter?.createdAfter || "").trim();
  const createdBefore = String(filter?.createdBefore || "").trim();

  return [
    t('queue.filterTaskTypes', {
      value: taskTypes.length ? taskTypes.map(getAutoDispatchTaskTypeLabel).join("、") : t('queue.all'),
    }),
    t('queue.filterCreatedTime', {
      start: createdAfter || t('queue.unlimited'),
      end: createdBefore || t('queue.unlimited'),
    }),
    t('queue.filterIncludeKeywords', {
      value: includeKeywords.length ? includeKeywords.join("、") : t('queue.none'),
    }),
    t('queue.filterExcludeKeywords', {
      value: excludeKeywords.length ? excludeKeywords.join("、") : t('queue.none'),
    }),
  ].join("\n");
}

function applyPublishTaskAutoDispatchSettingState(setting: PublishTaskAutoDispatchSetting) {
  publishTaskAutoDispatchEnabled.value = !!setting.autoSchedulingEnabled;
  setPublishTaskAutoSchedulingEnabled(!!setting.autoSchedulingEnabled);
  autoDispatchTargetClientId.value = String(setting.autoDispatchClientId || "").trim();
  autoDispatchTargetProfileId.value = String(setting.autoDispatchProfileId || "").trim();
  applyAutoDispatchFilterToForm(setting.autoDispatchFilter);
}

async function refreshPublishDispatchPageState(
  options: {
    includeBrowserClients?: boolean;
    includeAutoDispatchSetting?: boolean;
    includeSchedulerRuntime?: boolean;
  } = {},
) {
  const tasks: Promise<any>[] = [getList(), refreshStats(), refreshPublishTaskRuntime()];
  if (options.includeBrowserClients !== false) {
    tasks.push(refreshClientNodes());
  }
  if (options.includeAutoDispatchSetting) {
    tasks.push(loadPublishTaskAutoDispatchSettingState());
  }
  if (options.includeSchedulerRuntime) {
  }
  await Promise.all(tasks);
}

async function handleOpenPublishDispatchDialog() {
  publishDispatchDialogLoading.value = true;
  try {
    await Promise.all([refreshClientNodes(), refreshPublishTaskRuntime()]);
    syncDispatchProfileSelection();
  } finally {
    publishDispatchDialogLoading.value = false;
  }
}

async function handleOpenAutoDispatchTargetDialog() {
  autoDispatchTargetDialogLoading.value = true;
  try {
    await Promise.all([refreshClientNodes(), loadPublishTaskAutoDispatchSettingState()]);
    syncAutoDispatchTargetSelection();
  } finally {
    autoDispatchTargetDialogLoading.value = false;
  }
}

async function handleConfirmPublishDispatch() {
  if (!dispatchTargetTask.value) {
    return;
  }
  const selectedRow = selectedDispatchRow.value;
  if (!selectedRow) {
    ElMessage.warning(t('queue.selectClientNode'));
    return;
  }
  if (!selectedRow.selectable) {
    ElMessage.warning(t('queue.selectExecutableNode'));
    return;
  }

  const selectedClient = dispatchClientCandidates.value.find(
    (client) => client.id === selectedRow.clientId,
  );
  if (
    !selectedClient ||
    !getClientTaskTypeState(selectedClient, dispatchTargetTask.value.type).enabled
  ) {
    ElMessage.warning(t('queue.selectedNodeNotExecutable'));
    return;
  }

  try {
    await ElMessageBox.confirm(
      t('queue.confirmStartPublishTask', { client: formatClientNodeName(selectedClient) }),
      t('queue.startExecutionConfirm'),
      {
        confirmButtonText: t('queue.confirm'),
        cancelButtonText: t('queue.cancel'),
        type: "info",
      },
    );
  } catch {
    return;
  }

  publishDispatchSubmitting.value = true;
  try {
    await startPublishTaskDispatch(dispatchTargetTask.value.id, {
      clientId: selectedRow.clientId,
      profileId: selectedRow.profileId || undefined,
    });
    schedulePublishTaskMenuRuntimeSync();
    ElMessage.success(t('queue.taskAssignedToClient'));
    publishDispatchDialogVisible.value = false;
    await refreshPublishDispatchPageState();
  } catch (error: any) {
    ElMessage.error(extractRequestErrorMessage(error, t('queue.taskDispatchFailed')));
  } finally {
    publishDispatchSubmitting.value = false;
  }
}

async function handleConfirmAutoDispatchTarget() {
  const selectedRow = selectedAutoDispatchClientRow.value;
  if (!selectedRow?.selectable) {
    ElMessage.warning(t('queue.selectAcceptableClientEnv'));
    return;
  }
  if (!selectedRow.profileId) {
    ElMessage.warning(t('queue.selectBrowserEnv'));
    return;
  }

  autoDispatchTargetSubmitting.value = true;
  publishTaskAutoDispatchLoading.value = true;
  try {
    const selectedClient = browserAutomationClients.value.find(
      (client) => client.id === selectedRow.clientId,
    );
    const { setting, triggerResult } = await enablePublishTaskAutoDispatch({
      clientId: selectedRow.clientId,
      machineCode: getClientMachineCode(selectedClient) || undefined,
      profileId: selectedRow.profileId,
      filter: buildAutoDispatchFilterFromForm(),
    });
    applyPublishTaskAutoDispatchSettingState(setting);
    autoDispatchTargetDialogVisible.value = false;

    schedulePublishTaskMenuRuntimeSync();
    if (triggerResult?.success === false) {
      ElMessage.warning(triggerResult?.message || t('queue.savedButTriggerFailed'));
    } else {
      ElMessage.success(triggerResult?.message || t('queue.savedAndEnabled'));
    }
    await refreshPublishDispatchPageState({
      includeAutoDispatchSetting: true,
      includeSchedulerRuntime: true,
    });
  } catch (error: any) {
    ElMessage.error(error?.message || t('queue.saveAutoDispatchFailed'));
  } finally {
    autoDispatchTargetSubmitting.value = false;
    publishTaskAutoDispatchLoading.value = false;
  }
}

async function loadPublishTaskAutoDispatchSettingState() {
  const setting = await fetchPublishTaskAutoDispatchSetting();
  applyPublishTaskAutoDispatchSettingState(setting);
}

async function handleTogglePublishAutoDispatch(enabled: boolean) {
  if (enabled) {
    openAutoDispatchTargetDialog();
    return;
  }

  publishTaskAutoDispatchLoading.value = true;
  try {
    const setting = await disablePublishTaskAutoDispatch({
      clientId: autoDispatchTargetClientId.value || undefined,
      machineCode: getClientMachineCode(publishTaskAutoDispatchTargetClient.value) || undefined,
      profileId: autoDispatchTargetProfileId.value || undefined,
      filter: buildAutoDispatchFilterFromForm(),
    });
    applyPublishTaskAutoDispatchSettingState(setting);
    ElMessage.success(t('queue.autoDispatchClosed'));
    await refreshPublishDispatchPageState({
      includeAutoDispatchSetting: true,
      includeSchedulerRuntime: true,
    });
  } catch (error: any) {
    ElMessage.error(error?.message || t('queue.updateAutoDispatchToggleFailed'));
  } finally {
    publishTaskAutoDispatchLoading.value = false;
  }
}

function schedulePublishTaskListRefresh() {
  if (publishTaskRuntimeReloadTimer) {
    clearTimeout(publishTaskRuntimeReloadTimer);
  }

  publishTaskRuntimeReloadTimer = setTimeout(() => {
    publishTaskRuntimeReloadTimer = null;
    void Promise.all([getList({ silent: true }), refreshStats()]);
  }, 1800);
}

function schedulePublishTaskCountersRefresh() {
  if (publishTaskCountersRefreshTimer) {
    clearTimeout(publishTaskCountersRefreshTimer);
  }

  publishTaskCountersRefreshTimer = setTimeout(() => {
    publishTaskCountersRefreshTimer = null;
    void refreshStats();
  }, 1200);
}

function schedulePublishTaskMenuRuntimeSync() {
  void refreshPublishTaskRuntime();
  if (publishTaskMenuRuntimeSyncTimer) {
    clearTimeout(publishTaskMenuRuntimeSyncTimer);
  }
  publishTaskMenuRuntimeSyncTimer = setTimeout(() => {
    publishTaskMenuRuntimeSyncTimer = null;
    void refreshPublishTaskRuntime();
  }, 8000);
}

function findQueueTaskIndexById(taskId: unknown) {
  const normalizedTaskId = String(taskId || "").trim();
  if (!normalizedTaskId) {
    return -1;
  }

  return dataSource.value.findIndex((item) => String(item?.id || "").trim() === normalizedTaskId);
}

function shouldIgnorePublishTaskRuntimeRegression(row: QueueMessage, nextStatus?: string) {
  const normalizedNextStatus = String(nextStatus || "")
    .trim()
    .toLowerCase();
  if (!normalizedNextStatus) {
    return false;
  }

  const currentDispatchMeta: any = getPublishDispatchMeta(row);
  const currentStatus = String(row?.status || "")
    .trim()
    .toLowerCase();
  const currentDispatchStatus = String(currentDispatchMeta?.status || "")
    .trim()
    .toLowerCase();

  if (currentStatus === "completed" || currentDispatchStatus === "completed") {
    return normalizedNextStatus !== "completed";
  }

  if (
    currentStatus === "failed" ||
    currentDispatchStatus === "failed" ||
    currentDispatchStatus === "timeout"
  ) {
    return normalizedNextStatus !== "failed" && normalizedNextStatus !== "completed";
  }

  return false;
}

function applyPublishTaskRuntimeEvent(event: PublishTaskRuntimeEvent) {
  const normalizedTaskId = String(event?.taskId || "").trim();
  if (!normalizedTaskId) {
    return;
  }

  const taskIndex = findQueueTaskIndexById(normalizedTaskId);
  if (taskIndex >= 0) {
    const row = dataSource.value[taskIndex];
    if (shouldIgnorePublishTaskRuntimeRegression(row, event.status)) {
      return;
    }
    const currentDispatchMeta: any = getPublishDispatchMeta(row);
    const nextRow: QueueMessage = {
      ...row,
      status:
        event.status === "completed"
          ? "completed"
          : event.status === "failed"
            ? "failed"
            : event.status === "pending"
              ? "pending"
              : "processing",
      error: event.status === "failed" ? event.error || event.message || row.error : undefined,
      updatedAt: event.reportedAt || row.updatedAt,
      metadata: {
        ...(row.metadata || {}),
        publishDispatch: {
          ...currentDispatchMeta,
          status: event.status === "pending" ? "pending" : event.status || "running",
          assignedClientId: event.clientId || currentDispatchMeta.assignedClientId || null,
          assignedMachineCode: event.machineCode || currentDispatchMeta.assignedMachineCode || null,
          profileId: String(event.profileId || "").trim() || currentDispatchMeta.profileId || null,
          currentStep:
            event.currentStep || event.message || currentDispatchMeta.currentStep || null,
          progress:
            typeof event.progress === "number"
              ? event.progress
              : (currentDispatchMeta.progress ?? null),
          lastHeartbeatAt: event.reportedAt || new Date().toISOString(),
          startedAt:
            event.status === "running" || event.status === "assigned"
              ? currentDispatchMeta.startedAt || new Date().toISOString()
              : currentDispatchMeta.startedAt || null,
          finishedAt:
            event.status === "completed" || event.status === "failed" || event.status === "pending"
              ? event.reportedAt || new Date().toISOString()
              : null,
          lastError: event.error || null,
        },
      },
      data: {
        ...normalizeTaskDataRecord(row.data),
        ...(event.runtime
          ? {
              taskLogs: event.runtime,
            }
          : {}),
      },
    };

    dataSource.value.splice(taskIndex, 1, nextRow);
  }

  if (
    String(dispatchTargetTask.value?.id || "").trim() === normalizedTaskId &&
    event.status === "running"
  ) {
    publishDispatchDialogVisible.value = false;
  }

  if (String(currentTaskId.value || "").trim() === normalizedTaskId && event.runtime) {
    currentTaskData.value = {
      ...normalizeTaskDataRecord(currentTaskData.value),
      taskLogs: event.runtime,
    };
    currentTaskRuntimeLog.value = {
      ...(normalizeTaskRuntimeLogRecord(currentTaskRuntimeLog.value) || {}),
      source: event.runtime.source || currentTaskRuntimeLog.value?.source || "uploader",
      sourceId: event.runtime.sourceId || currentTaskRuntimeLog.value?.sourceId || null,
      platform: event.runtime.platform || currentTaskRuntimeLog.value?.platform || null,
      logCount:
        typeof event.runtime.logCount === "number"
          ? event.runtime.logCount
          : (currentTaskRuntimeLog.value?.logCount ?? 0),
      lastLogId: event.runtime.lastLogId || currentTaskRuntimeLog.value?.lastLogId || null,
      lastLogTime: event.runtime.lastLogTime || currentTaskRuntimeLog.value?.lastLogTime || null,
      lastLogLevel: event.runtime.lastLogLevel || currentTaskRuntimeLog.value?.lastLogLevel || null,
      lastLogMessage:
        event.runtime.lastLogMessage || currentTaskRuntimeLog.value?.lastLogMessage || null,
      updatedAt: event.runtime.updatedAt || currentTaskRuntimeLog.value?.updatedAt || null,
      logs: Array.isArray(currentTaskRuntimeLog.value?.logs)
        ? currentTaskRuntimeLog.value.logs
        : [],
    };
  }

  if (event.status === "completed" || event.status === "failed" || event.status === "pending") {
    schedulePublishTaskListRefresh();
    return;
  }

  schedulePublishTaskCountersRefresh();
}

function applyPublishTaskCommandResultEvent(event: ServiceCommandResultEvent) {
  if (String(event?.action || "").trim() !== "executePublishTask") {
    return;
  }

  const taskId = String(event?.data?.taskId || "").trim();
  if (!taskId) {
    return;
  }

  if (event.success) {
    const taskIndex = findQueueTaskIndexById(taskId);
    if (taskIndex >= 0) {
      const row = dataSource.value[taskIndex];
      const currentDispatchMeta: any = getPublishDispatchMeta(row);
      dataSource.value.splice(taskIndex, 1, {
        ...row,
        status: "completed",
        error: undefined,
        updatedAt: event.finishedAt || row.updatedAt,
        metadata: {
          ...(row.metadata || {}),
          publishDispatch: {
            ...currentDispatchMeta,
            status: "completed",
            assignedClientId: event.clientId || currentDispatchMeta.assignedClientId || null,
            currentStep: event.message || t('queue.executionCompleted'),
            progress: 100,
            lastHeartbeatAt: event.finishedAt || new Date().toISOString(),
            finishedAt: event.finishedAt || new Date().toISOString(),
            lastError: null,
          },
        },
      });
    }
  }

  schedulePublishTaskListRefresh();
}

// 删除任务
function handleDelete(row?: QueueMessage) {
  if (deleteLoading.value) return;
  if (!userStore.user?.isAdmin) {
    return ElMessage.warning(t('queue.noPermissionDelete'));
  }
  let delIds: string[] = [];
  if (row) {
    delIds = [row.id];
  } else if (!ids.value.length) {
    return ElMessage.warning(t('queue.selectDataToDelete'));
  } else {
    delIds = [...ids.value];
  }

  ElMessageBox.confirm(t('queue.confirmDeleteData', { count: delIds.length }), t('queue.deleteTip'), {
    confirmButtonText: t('queue.confirm'),
    cancelButtonText: t('queue.cancel'),
    type: "error",
  })
    .then(async () => {
      try {
        deleteLoading.value = true;
        for (const id of delIds) {
          const task = dataSource.value.find((t) => t.id === id);
          if (task) {
            await deleteTask(task.queue, id);
          }
        }
        ElMessage.success(t('queue.deleteSuccess'));
        await getList();
        await refreshStats();
      } catch (error) {
        ElMessage.error(t('queue.deleteFailed'));
      } finally {
        deleteLoading.value = false;
      }
    })
    .catch(() => {});
}

async function handleBatchResetPublishTasksToPending() {
  if (batchResetPendingLoading.value) return;
  const selectedRows = getSelectedQueueRows();
  if (!selectedRows.length) {
    return ElMessage.warning(t('queue.selectTaskToReset'));
  }

  const publishRows = selectedRows.filter((row) => isPublishTaskRow(row));
  const ignoredNonPublishCount = selectedRows.length - publishRows.length;
  if (!publishRows.length) {
    return ElMessage.warning(t('queue.noPublishTaskSelected'));
  }

  try {
    await ElMessageBox.confirm(
      t('queue.confirmBatchReset', { count: publishRows.length }),
      t('queue.batchResetToPending'),
      {
        type: "warning",
        confirmButtonText: t('queue.confirm'),
        cancelButtonText: t('queue.cancel'),
      },
    );

    batchResetPendingLoading.value = true;
    const response: any = await batchResetPublishTasksToPending(publishRows.map((row) => row.id));
    const payload = response?.data?.data ?? response?.data ?? response;
    const updated = Number(payload?.updated) || 0;
    const skipped = Array.isArray(payload?.skipped) ? payload.skipped : [];
    const skippedCount = skipped.length + ignoredNonPublishCount;

    if (updated > 0 && skippedCount > 0) {
      ElMessage.warning(t('queue.resetSkipped', { updated, skipped: skippedCount }));
    } else if (updated > 0) {
      ElMessage.success(t('queue.resetPlatformTasks', { count: updated }));
    } else {
      ElMessage.warning(skipped[0]?.reason || t('queue.noTaskToReset'));
    }

    schedulePublishTaskMenuRuntimeSync();
    await refreshPublishDispatchPageState();
  } catch (error: any) {
    if (error === "cancel" || error === "close") {
      return;
    }
    ElMessage.error(error?.message || t('queue.batchResetFailed'));
  } finally {
    batchResetPendingLoading.value = false;
  }
}

async function handleBatchRegeneratePublishTasks() {
  if (batchRegenerateLoading.value) return;
  const selectedRows = getSelectedQueueRows();
  if (!selectedRows.length) {
    return ElMessage.warning(t('queue.selectTaskToRegenerate'));
  }

  const publishRows = selectedRows.filter((row) =>
    String(row?.type || "").startsWith("publish-product-"),
  );
  const ignoredNonPublishCount = selectedRows.length - publishRows.length;
  if (!publishRows.length) {
    return ElMessage.warning(t('queue.noRegenerableTask'));
  }

  try {
    await ElMessageBox.confirm(
      t('queue.confirmBatchRegenerate', { count: publishRows.length }),
      t('queue.batchRegenerateTitle'),
      {
        type: "warning",
        confirmButtonText: t('queue.confirm'),
        cancelButtonText: t('queue.cancel'),
      },
    );

    batchRegenerateLoading.value = true;
    const response: any = await regeneratePublishTasksBatchApi(publishRows.map((row) => row.id));
    const payload = response?.data?.data ?? response?.data ?? response;
    const updated = Number(payload?.updated) || 0;
    const skipped = Array.isArray(payload?.skipped) ? payload.skipped : [];
    const skippedCount = skipped.length + ignoredNonPublishCount;

    if (updated > 0 && skippedCount > 0) {
      ElMessage.warning(t('queue.regenerateSubmittedSkipped', { count: updated, skipped: skippedCount }));
    } else if (updated > 0) {
      ElMessage.success(t('queue.regenerateSubmitted', { count: updated }));
    } else {
      ElMessage.warning(skipped[0]?.reason || t('queue.noTaskToRegenerate'));
    }

    schedulePublishTaskMenuRuntimeSync();
    await refreshPublishDispatchPageState();
  } catch (error: any) {
    if (error === "cancel" || error === "close") {
      return;
    }
    ElMessage.error(error?.message || t('queue.batchRegenerateFailed'));
  } finally {
    batchRegenerateLoading.value = false;
  }
}

// 提交表单
async function handleSubmit() {
  if (submitLoading.value) return;
  try {
    submitLoading.value = true;
    await formRef.value.validate();

    // 检查任务类型
    if (!formData.type || !formData.type.trim()) {
      ElMessage.warning(t('queue.enterTaskType'));
      return;
    }

    let taskData;
    try {
      taskData = JSON.parse(formData.dataStr);
    } catch (e) {
      ElMessage.error(t('queue.taskDataFormatError'));
      return;
    }

    // 只传递任务类型，后端会自动使用 type 作为 queue
    await createTask({
      type: formData.type.trim(),
      description: formData.description?.trim() || undefined,
      data: taskData,
      delay: formData.delay,
    });

    ElMessage.success(t('queue.taskCreated'));
    dialogVisible.value = false;

    // 创建成功后，自动设置查询条件并刷新列表和统计
    const createdType = formData.type.trim();
    const selectedTypes = getSelectedQueryTypes();

    // 如果当前没有查询条件，或者查询的就是创建的任务类型，则刷新
    if (selectedTypes.length === 0 || selectedTypes.includes(createdType)) {
      if (selectedTypes.length === 0) {
        queryParams.types = [createdType];
      }
      queryParams.currentPage = 1; // 重置到第一页

      // 等待一小段时间，确保后端数据已写入
      await new Promise((resolve) => setTimeout(resolve, 300));

      await getList();
      await refreshStats();
    } else {
      // 如果查询的是其他任务类型，只刷新统计（如果统计的是创建的任务类型）
      if (stats.value.queue === createdType) {
        await refreshStats();
      }
    }
  } catch (error: any) {
    ElMessage.error(error?.message || t('queue.createTaskFailed'));
  } finally {
    submitLoading.value = false;
  }
}

// 提交状态修改
async function handleStatusSubmit() {
  if (statusSubmitLoading.value) return;
  try {
    statusSubmitLoading.value = true;
    await statusFormRef.value.validate();

    // 如果新状态和当前状态相同，直接返回
    if (statusFormData.newStatus === statusFormData.status) {
      ElMessage.info(t('queue.statusUnchanged'));
      statusDialogVisible.value = false;
      return;
    }

    await updateTaskStatus(
      statusFormData.type,
      statusFormData.id,
      statusFormData.newStatus,
      statusFormData.newStatus === "failed" ? statusFormData.error : undefined,
    );

    ElMessage.success(t('queue.statusUpdated'));
    statusDialogVisible.value = false;
    await getList();
    await refreshStats();
  } catch (error: any) {
    ElMessage.error(error?.message || t('queue.operationFailed'));
  } finally {
    statusSubmitLoading.value = false;
  }
}

// 重置表单
function resetForm() {
  // 使用当前查询的任务类型，确保使用最新的值
  const currentType = getPrimaryQueryType();
  Object.assign(formData, {
    type: currentType, // 使用当前查询的任务类型，如果没有则为空
    description: "",
    dataStr: "{}",
    delay: 0,
  });
  // 延迟清除验证，确保表单已更新
  setTimeout(() => {
    formRef.value?.clearValidate();
  }, 50);
}

// 更新数据
async function handleUpdateData(row: QueueMessage) {
  try {
    currentDataUpdateRow.value = row;
    const detailQueue = row.queue || row.type;
    const detailResponse = await getTaskDetail(detailQueue, row.id);
    const detailMessage = normalizeTaskDetailMessageResponse(
      detailResponse?.data ?? detailResponse,
    );
    const currentData = parseMaybeJson(detailMessage?.data) ?? detailMessage?.data ?? {};
    const dataStrValue =
      typeof currentData === "object" && currentData !== null
        ? JSON.stringify(currentData, null, 2)
        : String(currentData || "{}");

    dataUpdateFormData.queue = detailQueue;
    dataUpdateFormData.messageId = row.id;
    dataUpdateFormData.dataStr = dataStrValue;
    dataUpdateFormData.dataObj =
      typeof currentData === "string" ? JSON.parse(currentData) : currentData || {};
    dataUpdateDialogVisible.value = true;
  } catch (e) {
    ElMessage.error((e as Error)?.message || t('queue.fetchTaskDetailFailed'));
  }
}

// 提交数据更新
async function handleDataUpdateSubmit() {
  if (dataUpdateSubmitting.value) return;
  let data: any;
  try {
    data = JSON.parse(dataUpdateFormData.dataStr);
  } catch (e) {
    ElMessage.error(t('queue.validJsonFormat'));
    return;
  }

  try {
    dataUpdateSubmitting.value = true;
    await updateTaskData(dataUpdateFormData.queue, dataUpdateFormData.messageId, data);
    ElMessage.success(t('queue.dataUpdated'));
    dataUpdateDialogVisible.value = false;
    await getList();
  } catch (error: any) {
    ElMessage.error(error?.message || t('queue.updateDataFailed'));
  } finally {
    dataUpdateSubmitting.value = false;
  }
}

const regeneratingTaskIds = ref<Set<string>>(new Set());
const actionPendingTaskIds = ref<Set<string>>(new Set());

async function handleRegeneratePublishTask(row: QueueMessage) {
  const taskId = String(row?.id || "").trim();
  if (!taskId) {
    ElMessage.warning(t('queue.missingTaskId'));
    return;
  }

  try {
    await ElMessageBox.confirm(
      t('queue.confirmRegenerate'),
      t('queue.regeneratePublishData'),
      {
        type: "warning",
        confirmButtonText: t('queue.confirm'),
        cancelButtonText: t('queue.cancel'),
      },
    );

    regeneratingTaskIds.value = new Set([...regeneratingTaskIds.value, taskId]);
    const result: any = await regeneratePublishTaskApi(taskId);
    const payload = result?.data?.data ?? result?.data ?? result;

    if (payload?.asyncRegenerate) {
      ElMessage.success(t('queue.regenerateSubmittedAsync'));
    } else {
      ElMessage.success(t('queue.publishDataRegenerated'));
    }

    await getList();
    await refreshStats();
  } catch (error: any) {
    if (error === "cancel") {
      return;
    }
    ElMessage.error(error?.message || t('queue.regenerateFailed'));
  } finally {
    const nextRegeneratingTaskIds = new Set(regeneratingTaskIds.value);
    nextRegeneratingTaskIds.delete(taskId);
    regeneratingTaskIds.value = nextRegeneratingTaskIds;
  }
}

function resolveClientConcreteDispatchProfileOptions(client: any): DispatchProfileOption[] {
  const runtime = getBrowserAutomationRuntime(client) as Record<string, any>;
  if (!client?.isOnline || !(runtime?.available || runtime?.connected)) {
    return [];
  }

  const profileInstances = getClientDispatchProfileInstances(client);
  const profiles = getClientDispatchProfiles(client);
  const profileMap = new Map(
    profiles
      .map((item: any) => [normalizeDispatchProfileId(item?.id), item] as const)
      .filter(([profileId]) => !!profileId),
  );
  const instanceMap = new Map(
    profileInstances
      .map((item: any) => [normalizeDispatchProfileId(item?.profileId), item] as const)
      .filter(([profileId]) => !!profileId),
  );
  const orderedProfileIds = Array.from(
    new Set(
      [...profileInstances, ...profiles]
        .map((item: any) => normalizeDispatchProfileId(item?.profileId || item?.id))
        .filter(Boolean),
    ),
  ) as string[];

  return orderedProfileIds.map((profileId) => {
    const profile = profileMap.get(profileId) || instanceMap.get(profileId) || null;
    const instance = instanceMap.get(profileId) || null;
    const busy = instance?.busy === true;
    const connected = instance?.connected === true || instance?.hasInstance === true;
    const pageCount = typeof instance?.pageCount === "number" ? Number(instance.pageCount) : null;
    let description = t('queue.specifiedEnvNotOpen');
    if (busy) {
      description = instance?.currentTaskId
        ? t('queue.currentlyExecutingTask', { id: instance.currentTaskId })
        : t('queue.envExecutingTask');
    } else if (connected) {
      description = pageCount !== null ? t('queue.browserOpenPages', { count: pageCount }) : t('queue.browserOpened');
    }

    return {
      profileId,
      label: formatDispatchProfileLabel(profileId, profile),
      description,
      enabled: !busy,
      connected,
      busy,
      runtimeModeTag: getDispatchProfileRuntimeModeTag(instance),
    } satisfies DispatchProfileOption;
  });
}

async function handleStopPublishTask(row: QueueMessage) {
  const taskId = String(row?.id || "").trim();
  if (!taskId) {
    ElMessage.warning(t('queue.missingTaskIdentifier'));
    return;
  }

  if (!canStopPublishExecution(row)) {
    ElMessage.warning(t('queue.taskNotRunning'));
    return;
  }

  try {
    await ElMessageBox.confirm(
      t('queue.confirmStopTask'),
      t('queue.stopTask'),
      {
        type: "warning",
        confirmButtonText: t('queue.confirm'),
        cancelButtonText: t('queue.cancel'),
      },
    );

    actionPendingTaskIds.value.add(taskId);
    const response: any = await stopPublishTaskDispatch(taskId, {
      reason: "管理员手动停止任务",
    });
    const payload = response?.data?.data ?? response?.data ?? response;
    if (payload?.alreadyStopped) {
      ElMessage.warning(response?.message || payload?.message || t('queue.taskNotRunning'));
    } else {
      ElMessage.success(response?.message || t('queue.stopCommandSent'));
    }
    schedulePublishTaskMenuRuntimeSync();
    await refreshPublishDispatchPageState();
  } catch (error: any) {
    if (error === "cancel" || error === "close") {
      return;
    }
    ElMessage.error(error?.message || t('queue.stopTaskFailed'));
  } finally {
    actionPendingTaskIds.value.delete(taskId);
  }
}

async function handleResetPublishTask(row: QueueMessage) {
  const taskId = String(row?.id || "").trim();
  if (!taskId) {
    ElMessage.warning(t('queue.missingTaskIdentifier'));
    return;
  }

  if (!canResetPublishExecution(row)) {
    ElMessage.warning(t('queue.taskRunningStopFirst'));
    return;
  }

  try {
    await ElMessageBox.confirm(
      t('queue.confirmResetTask'),
      t('queue.resetToPending'),
      {
        type: "warning",
        confirmButtonText: t('queue.confirm'),
        cancelButtonText: t('queue.cancel'),
      },
    );

    actionPendingTaskIds.value.add(taskId);
    await resetPublishTaskDispatch(taskId, {
      reason: "管理员重置为未运行状态",
    });
    ElMessage.success(t('queue.taskResetToPending'));
    schedulePublishTaskMenuRuntimeSync();
    await refreshPublishDispatchPageState();
  } catch (error: any) {
    if (error === "cancel" || error === "close") {
      return;
    }
    ElMessage.error(error?.message || t('queue.resetTaskFailed'));
  } finally {
    actionPendingTaskIds.value.delete(taskId);
  }
}

async function handleOperationCommand(command: string, row: QueueMessage) {
  switch (command) {
    case "viewData":
      await handleViewData(row);
      break;
    case "viewRuntimeLogs":
      await handleViewRuntimeLogs(row);
      break;
    case "startExecution":
      openPublishDispatchDialog(row);
      break;
    case "stopExecution":
      await handleStopPublishTask(row);
      break;
    case "resetExecutionState":
      await handleResetPublishTask(row);
      break;
    case "regenerate":
      await handleRegeneratePublishTask(row);
      break;
    case "updateData":
      await handleUpdateData(row);
      break;
    case "editStatus":
      handleEdit(row);
      break;
    case "delete":
      handleDelete(row);
      break;
    default:
      break;
  }
}

// 重置数据更新表单
function resetDataUpdateForm() {
  dataUpdateFormData.queue = "";
  dataUpdateFormData.messageId = "";
  dataUpdateFormData.dataStr = "";
  currentDataUpdateRow.value = null;
  setTimeout(() => {
    dataUpdateFormRef.value?.clearValidate();
  }, 50);
}

// 监听筛选条件变化，同步到 useLocalStorage 缓存
watch(
  () => ({
    id: queryParams.id,
    types: [...queryParams.types],
    status: queryParams.status,
    executionReadinessStatus: queryParams.executionReadinessStatus,
    sortType: queryParams.sortType,
    pageSize: queryParams.pageSize,
    createdDateRange: queryParams.createdDateRange,
  }),
  (newValue) => {
    queueQueryFilterStorage.value = {
      id: newValue.id || "",
      types: newValue.types,
      status: newValue.status,
      executionReadinessStatus: newValue.executionReadinessStatus,
      sortType: newValue.sortType,
      pageSize: newValue.pageSize,
      createdDateRange: newValue.createdDateRange,
    };
  },
  { deep: true },
);

watch(dispatchAvailableRows, () => {
  syncDispatchProfileSelection();
});

watch(autoDispatchClientRows, () => {
  syncAutoDispatchTargetSelection();
});

watch(runtimeLogDialogVisible, (visible) => {
  if (visible) {
    startRuntimeLogDialogAutoRefresh();
    return;
  }

  stopRuntimeLogDialogAutoRefresh();
  runtimeLogDialogLoading.value = false;
});

// 初始化
onMounted(() => {
  void Promise.all([
    getList(),
    refreshStats(),
    refreshClientNodes(),
    refreshPublishTaskTypeOptions(),
    loadPublishTaskAutoDispatchSettingState(),
    refreshPublishTaskRuntime(),
  ]);
  websocketClient.events.on("publishTaskRuntime", applyPublishTaskRuntimeEvent);
  websocketClient.events.on("serviceCommandResult", applyPublishTaskCommandResultEvent);
});

onUnmounted(() => {
  if (publishTaskMenuRuntimeSyncTimer) {
    clearTimeout(publishTaskMenuRuntimeSyncTimer);
    publishTaskMenuRuntimeSyncTimer = null;
  }
  if (publishTaskRuntimeReloadTimer) {
    clearTimeout(publishTaskRuntimeReloadTimer);
    publishTaskRuntimeReloadTimer = null;
  }
  if (publishTaskCountersRefreshTimer) {
    clearTimeout(publishTaskCountersRefreshTimer);
    publishTaskCountersRefreshTimer = null;
  }
  stopRuntimeLogDialogAutoRefresh();
  websocketClient.events.off("publishTaskRuntime", applyPublishTaskRuntimeEvent);
  websocketClient.events.off("serviceCommandResult", applyPublishTaskCommandResultEvent);
});
</script>
<style lang="less" scoped>
.queue-page.list-page-layout {
  gap: 10px;
  padding: 8px 0 0;
}

.queue-page .list-page-layout__main {
  gap: 10px;
}

.queue-page .list-page-filter--flat {
  gap: 10px;
  padding-bottom: 10px;
}

.queue-page .list-page-table-panel__pagination--flat {
  padding-top: 10px;
}

.queue-page__main {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.queue-page__stats-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
  min-height: 32px;
  padding: 4px 0;
}

.queue-stats-pill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  min-height: 24px;
  padding: 0 4px;
  border: 0;
  border-radius: 0;
  background: transparent;
  color: var(--el-text-color-secondary);
}

.queue-stats-pill__label {
  font-size: 11px;
  font-weight: 500;
  line-height: 1;
}

.queue-stats-pill__value {
  min-width: 20px;
  font-size: 13px;
  font-weight: 700;
  line-height: 1;
  color: var(--el-text-color-primary);
}

.queue-stats-pill + .queue-stats-pill::before {
  content: "";
  width: 1px;
  height: 12px;
  margin-right: 2px;
  background: var(--el-border-color-lighter);
}

.queue-stats-pill--pending .queue-stats-pill__value {
  color: var(--el-color-info);
}

.queue-stats-pill--processing .queue-stats-pill__value {
  color: var(--el-color-warning);
}

.queue-stats-pill--completed .queue-stats-pill__value {
  color: var(--el-color-success);
}

.queue-stats-pill--failed .queue-stats-pill__value {
  color: var(--el-color-danger);
}

.queue-dispatch-panel {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  flex: 1 1 520px;
  min-width: min(100%, 380px);
  min-height: 28px;
  padding: 0 0 0 8px;
  border: 0;
  border-left: 1px solid var(--el-border-color-lighter);
  border-radius: 0;
  background: transparent;
}

.queue-dispatch-panel__main {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1 1 auto;
  min-width: 0;
  overflow: visible;
}

.queue-dispatch-panel__title {
  flex: 0 0 auto;
  font-size: 12px;
  font-weight: 600;
  line-height: 1;
  color: var(--el-text-color-primary);
}

.queue-dispatch-panel__binding {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  flex: 1 1 180px;
  min-width: 120px;
  overflow: hidden;
  color: var(--el-text-color-secondary);
  font-size: 11px;
  line-height: 1;
}

.queue-dispatch-panel__binding-label {
  flex: 0 0 auto;
  font-weight: 600;
  color: var(--el-text-color-secondary);
}

.queue-dispatch-panel__binding-value {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 600;
}

.queue-dispatch-panel__binding-meta {
  flex: 1 1 140px;
  min-width: 90px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--el-text-color-placeholder);
  font-size: 11px;
}

.queue-dispatch-panel__filter-wrap {
  position: relative;
  display: inline-flex;
  align-items: center;
  flex: 0 1 150px;
  min-width: 86px;
  max-width: 180px;
}

.queue-dispatch-panel__filter {
  display: inline-block;
  width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--el-text-color-secondary);
  font-size: 11px;
  line-height: 1;
}

.queue-dispatch-panel__filter-popover {
  position: absolute;
  right: 0;
  bottom: calc(100% + 8px);
  z-index: 20;
  width: max-content;
  max-width: 520px;
  padding: 8px 10px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 4px;
  background: var(--el-bg-color-overlay);
  box-shadow: var(--el-box-shadow-light);
  color: var(--el-text-color-regular);
  pointer-events: none;
  opacity: 0;
  visibility: hidden;
  transform: none;
  transition:
    opacity 0.12s ease,
    visibility 0.12s ease;
  white-space: pre-line;
  line-height: 1.6;
  font-size: 12px;
}

.queue-dispatch-panel__filter-wrap:hover .queue-dispatch-panel__filter-popover {
  opacity: 1;
  visibility: visible;
}

.queue-dispatch-panel__binding.is-success .queue-dispatch-panel__binding-value {
  color: #67c23a;
}

.queue-dispatch-panel__binding.is-warning .queue-dispatch-panel__binding-value {
  color: #f97316;
}

.queue-dispatch-panel__binding.is-info .queue-dispatch-panel__binding-value {
  color: #909399;
}

.queue-dispatch-panel__runtime {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  flex: 0 1 auto;
  min-width: 0;
  max-width: 210px;
  overflow: hidden;
  color: var(--el-text-color-secondary);
  font-size: 11px;
  line-height: 1;
  white-space: nowrap;
}

.queue-dispatch-panel__runtime.is-success {
  color: #67c23a;
}

.queue-dispatch-panel__runtime.is-warning {
  color: #f97316;
}

.queue-dispatch-panel__runtime.is-danger {
  color: #f56c6c;
}

.queue-dispatch-panel__runtime.is-info {
  color: #909399;
}

.queue-dispatch-panel__runtime-dot {
  width: 6px;
  height: 6px;
  border-radius: 999px;
  background: currentColor;
  flex: 0 0 auto;
}

.queue-dispatch-panel__runtime.is-success .queue-dispatch-panel__runtime-dot {
  box-shadow: 0 0 0 0 rgb(103 194 58 / 24%);
  animation: queue-status-breath-success 1.8s infinite ease-in-out;
}

.queue-dispatch-panel__runtime.is-warning .queue-dispatch-panel__runtime-dot {
  box-shadow: 0 0 0 0 rgb(249 115 22 / 22%);
  animation: queue-status-breath-warning 1.8s infinite ease-in-out;
}

.queue-dispatch-panel__runtime-meta {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--el-text-color-placeholder);
}

.queue-dispatch-panel__status {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  flex: 0 0 auto;
  height: 22px;
  padding: 0 8px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 999px;
  background: var(--el-fill-color-light);
  font-size: 11px;
  font-weight: 600;
  color: var(--el-text-color-secondary);
}

.queue-dispatch-panel__status.is-success {
  border-color: rgb(103 194 58 / 24%);
  color: #67c23a;
}

.queue-dispatch-panel__status.is-info {
  border-color: rgb(144 147 153 / 24%);
  color: #909399;
}

.queue-dispatch-panel__status.is-warning {
  border-color: rgb(249 115 22 / 24%);
  color: #f97316;
}

.queue-dispatch-panel__status-dot {
  width: 6px;
  height: 6px;
  border-radius: 999px;
  background: currentColor;
}

.queue-dispatch-panel__status.is-success .queue-dispatch-panel__status-dot {
  box-shadow: 0 0 0 0 rgb(103 194 58 / 32%);
  animation: queue-status-breath-success 1.8s infinite ease-in-out;
}

.queue-dispatch-panel__status.is-warning .queue-dispatch-panel__status-dot {
  box-shadow: 0 0 0 0 rgb(249 115 22 / 28%);
  animation: queue-status-breath-warning 1.8s infinite ease-in-out;
}

.queue-operation-cell {
  display: inline-flex;
  align-items: center;
  min-height: 28px;
}

.queue-runtime-log-cell {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.queue-runtime-log-cell__count {
  color: var(--el-text-color-secondary);
  font-size: 12px;
  line-height: 1.4;
}

.queue-dispatch-target-cell {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.queue-dispatch-target-cell__main {
  color: var(--el-text-color-primary);
  font-size: 12px;
  font-weight: 600;
  line-height: 1.5;
}

.queue-dispatch-target-cell__hint {
  color: var(--el-text-color-secondary);
  font-size: 12px;
  line-height: 1.5;
}

.queue-page :deep(.table-operation-cell .vxe-cell),
.queue-page :deep(.table-operation-cell .vxe-cell--wrapper),
.queue-page :deep(.table-operation-cell .vxe-cell--label) {
  min-height: 100%;
}

.queue-page :deep(.table-operation-cell .queue-operation-cell),
.queue-page :deep(.table-operation-cell .operation-dropdown),
.queue-page :deep(.table-operation-cell .operation-trigger-button) {
  display: inline-flex;
  align-items: center;
}

.queue-page :deep(.table-operation-cell .operation-trigger-button) {
  min-height: 28px;
}


.publish-dispatch-dialog__body {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 204px;
}

.publish-dispatch-dialog__panel {
  padding: 10px 12px;
  border: 1px solid color-mix(in srgb, var(--el-border-color) 62%, transparent 38%);
  border-radius: 6px;
  background: var(--el-bg-color);
  min-height: 206px;
}

.publish-dispatch-dialog__panel-title {
  margin-bottom: 10px;
  color: var(--el-text-color-primary);
  font-size: 13px;
  font-weight: 700;
}

.publish-dispatch-dialog__empty {
  color: var(--el-text-color-secondary);
  font-size: 12px;
  line-height: 1.6;
}

.publish-dispatch-dialog__table {
  overflow: hidden;
}

.publish-dispatch-filter-panel {
  min-height: 0;
}

.publish-dispatch-filter-form {
  display: grid;
  grid-template-columns: repeat(2, minmax(260px, 1fr));
  column-gap: 16px;
  row-gap: 2px;
}

.publish-dispatch-filter-form .el-form-item {
  margin-bottom: 8px;
}

.publish-dispatch-filter-form .el-select,
.publish-dispatch-filter-form .el-input,
.publish-dispatch-filter-form__date {
  width: 100%;
}

.publish-dispatch-dialog__table :deep(.el-table) {
  --el-table-row-hover-bg-color: transparent;
  --el-table-current-row-bg-color: transparent;
  font-size: 12px;
}

.publish-dispatch-dialog__table :deep(.el-table td),
.publish-dispatch-dialog__table :deep(.el-table th) {
  padding-top: 7px;
  padding-bottom: 7px;
}

.publish-dispatch-dialog__table :deep(.el-table .cell) {
  padding-left: 8px;
  padding-right: 8px;
  line-height: 1.35;
}

.publish-dispatch-dialog__table :deep(.el-table__row) {
  cursor: pointer;
}

.publish-dispatch-dialog__table :deep(.el-table__row.is-disabled) {
  cursor: not-allowed;
}

.publish-dispatch-dialog__table :deep(.el-table__row.is-disabled td) {
  color: var(--el-text-color-placeholder);
}

.publish-dispatch-dialog__table :deep(.el-radio) {
  pointer-events: none;
  margin-right: 0;
}

.publish-dispatch-dialog__primary {
  color: var(--el-text-color-primary);
  font-weight: 600;
  font-size: 12px;
  line-height: 1.35;
}

.publish-dispatch-dialog__state-text {
  font-size: 11px;
  font-weight: 600;
  line-height: 1.2;
}

.publish-dispatch-dialog__state-text.is-success {
  color: #1f8f46;
}

.publish-dispatch-dialog__state-text.is-warning {
  color: #b26a00;
}

.publish-dispatch-dialog__state-text.is-danger {
  color: #d5485a;
}

.publish-dispatch-dialog__state-text.is-info {
  color: #356dd1;
}

.publish-dispatch-dialog__state-text.is-muted {
  color: var(--el-text-color-secondary);
}

.publish-dispatch-dialog__footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  width: 100%;
}

.publish-dispatch-dialog__summary {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.publish-dispatch-dialog__title {
  font-size: 15px;
  font-weight: 700;
}

.publish-dispatch-dialog__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.publish-dispatch-dialog__hint {
  color: var(--el-text-color-secondary);
  font-size: 13px;
  line-height: 1.55;
}

.publish-dispatch-dialog__hint--section {
  margin-top: -6px;
}

.publish-dispatch-dialog__section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.publish-dispatch-dialog__section-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
  flex-wrap: wrap;
}

.publish-dispatch-dialog__section-head--compact {
  gap: 12px;
}

.publish-dispatch-dialog__section-title {
  color: var(--el-text-color-primary);
  font-size: 13px;
  font-weight: 700;
  line-height: 1.35;
}

.publish-dispatch-dialog__section-desc {
  margin-top: 4px;
  color: var(--el-text-color-secondary);
  font-size: 12px;
  line-height: 1.55;
}

.publish-dispatch-dialog__section-meta {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.publish-dispatch-dialog__meta-pill {
  display: inline-flex;
  min-height: 28px;
  align-items: center;
  padding: 0 10px;
  border: 1px solid color-mix(in srgb, var(--el-border-color) 70%, transparent 30%);
  border-radius: 999px;
  background: color-mix(in srgb, var(--el-fill-color-light) 64%, white 36%);
  color: var(--el-text-color-regular);
  font-size: 12px;
  font-weight: 600;
  line-height: 1;
}

.publish-dispatch-dialog__meta-pill.is-muted {
  color: var(--el-text-color-secondary);
}

.publish-dispatch-dialog__meta-pill.is-warning {
  border-color: rgb(249 115 22 / 24%);
  color: #f97316;
}

.publish-dispatch-dialog__profile-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px 16px;
  border: 1px solid color-mix(in srgb, var(--el-border-color) 58%, transparent 42%);
  border-radius: 14px;
  background: linear-gradient(
    180deg,
    color-mix(in srgb, var(--el-fill-color-light) 68%, white 32%),
    #fff
  );
}

.publish-dispatch-dialog__profile-title {
  font-size: 13px;
  font-weight: 700;
  color: var(--el-text-color-primary);
}

.publish-dispatch-dialog__client-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
}

.publish-dispatch-dialog__profile-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
}

.publish-dispatch-client {
  display: flex;
  min-height: 108px;
  flex-direction: column;
  justify-content: space-between;
  width: 100%;
  padding: 16px;
  border: 1px solid color-mix(in srgb, var(--el-border-color) 54%, transparent 46%);
  border-radius: 16px;
  background: color-mix(in srgb, var(--el-bg-color) 94%, transparent 6%);
  text-align: left;
  cursor: pointer;
  transition:
    transform 0.18s ease,
    border-color 0.18s ease,
    box-shadow 0.18s ease;
}

.publish-dispatch-client:not(:disabled):hover {
  transform: translateY(-1px);
  border-color: color-mix(in srgb, var(--el-color-primary) 34%, transparent 66%);
  box-shadow: 0 10px 24px rgba(37, 99, 235, 0.1);
}

.publish-dispatch-client.is-selected {
  border-color: color-mix(in srgb, var(--el-color-primary) 56%, transparent 44%);
  box-shadow:
    0 12px 26px rgba(37, 99, 235, 0.12),
    inset 0 0 0 1px rgba(37, 99, 235, 0.16);
}

.publish-dispatch-client.is-disabled {
  opacity: 0.62;
}

.publish-dispatch-client__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.publish-dispatch-client__title {
  min-width: 0;
  flex: 1;
  font-size: 14px;
  font-weight: 700;
  word-break: break-word;
}

.publish-dispatch-client__desc {
  margin-top: 10px;
  color: var(--el-text-color-secondary);
  font-size: 13px;
  line-height: 1.6;
}

.publish-dispatch-profile {
  display: flex;
  min-height: 120px;
  width: 100%;
  flex-direction: column;
  gap: 12px;
  padding: 14px 15px;
  border: 1px solid color-mix(in srgb, var(--el-border-color) 56%, transparent 44%);
  border-radius: 14px;
  background: color-mix(in srgb, var(--el-bg-color) 96%, transparent 4%);
  text-align: left;
  cursor: pointer;
  transition:
    transform 0.18s ease,
    border-color 0.18s ease,
    background-color 0.18s ease,
    box-shadow 0.18s ease;
}

.publish-dispatch-profile:not(:disabled):hover {
  transform: translateY(-1px);
  border-color: color-mix(in srgb, var(--el-color-primary) 34%, transparent 66%);
  box-shadow: 0 10px 22px rgba(37, 99, 235, 0.08);
}

.publish-dispatch-profile.is-selected {
  border-color: color-mix(in srgb, var(--el-color-primary) 56%, transparent 44%);
  background: color-mix(in srgb, var(--el-color-primary-light-9) 62%, white 38%);
  box-shadow:
    0 12px 24px rgba(37, 99, 235, 0.1),
    inset 0 0 0 1px rgba(37, 99, 235, 0.14);
}

.publish-dispatch-profile.is-disabled {
  opacity: 0.62;
}

.publish-dispatch-profile__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}

.publish-dispatch-profile__title-wrap {
  min-width: 0;
  flex: 1;
}

.publish-dispatch-profile__title {
  color: var(--el-text-color-primary);
  font-size: 13px;
  font-weight: 700;
  line-height: 1.4;
  word-break: break-word;
}

.publish-dispatch-profile__caption {
  margin-top: 4px;
  color: var(--el-text-color-secondary);
  font-size: 11px;
  line-height: 1.4;
}

.publish-dispatch-profile__badges {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.publish-dispatch-profile__selected {
  display: inline-flex;
  min-height: 22px;
  align-items: center;
  padding: 0 8px;
  border-radius: 999px;
  background: rgba(37, 99, 235, 0.12);
  color: var(--el-color-primary);
  font-size: 11px;
  font-weight: 700;
  line-height: 1;
}

.publish-dispatch-profile__desc {
  color: var(--el-text-color-secondary);
  font-size: 12px;
  line-height: 1.6;
}

.publish-dispatch-dialog__profile-empty {
  padding: 14px 16px;
  border: 1px dashed color-mix(in srgb, var(--el-border-color) 74%, transparent 26%);
  border-radius: 12px;
  background: color-mix(in srgb, var(--el-fill-color-light) 56%, white 44%);
  color: var(--el-text-color-secondary);
  font-size: 12px;
  line-height: 1.6;
}

.queue-page :deep(.queue-row--running) {
  background:
    linear-gradient(90deg, rgba(20, 184, 166, 0.08), transparent 36%),
    linear-gradient(0deg, transparent, transparent);
}

.queue-page :deep(.queue-row--running .vxe-body--column) {
  background-color: transparent !important;
}

.queue-page :deep(.queue-row--failed) {
  background:
    linear-gradient(90deg, rgba(239, 68, 68, 0.06), transparent 32%),
    linear-gradient(0deg, transparent, transparent);
}

.data-preview {
  padding: 16px;
  border-radius: 4px;
  max-height: 400px;
  overflow: auto;
  font-size: 12px;
  line-height: 1.6;
}

.queue-json-viewer-shell,
.queue-json-editor-layout {
  height: 100%;
  min-height: 0;
}

.queue-json-viewer-shell {
  padding: 6px;
}

.queue-json-editor-layout {
  padding: 6px;
}

.queue-json-editor-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(360px, 42%);
  gap: 20px;
}

.queue-json-panel {
  display: flex;
  flex-direction: column;
  min-height: 0;
  border: 1px solid var(--el-border-color);
  border-radius: 8px;
  overflow: hidden;
}

.queue-json-panel__header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 18px;
  border-bottom: 1px solid var(--el-border-color-light);
}

.queue-json-panel__title {
  font-size: 14px;
  font-weight: 700;
}

.queue-json-panel__desc {
  font-size: 12px;
}

.queue-json-panel__body {
  flex: 1;
  min-height: 0;
}

.queue-json-panel__body--viewer {
  min-height: 0;
  overflow: auto;
  padding: 14px;
}

.queue-json-raw {
  margin: 0;
  min-height: 100%;
  font-family: Consolas, Monaco, "Courier New", monospace;
  font-size: 13px;
  line-height: 1.7;
  white-space: pre-wrap;
  word-break: break-word;
}

.queue-json-panel__body--editor {
  padding: 14px;
}

.queue-runtime-dialog :deep(.el-dialog) {
  height: 100vh;
  margin: 0;
  display: flex;
  flex-direction: column;
  border-radius: 0;
  overflow: hidden;
  background: rgba(33, 33, 33, 0.78);
  backdrop-filter: blur(8px);
}

.queue-runtime-dialog :deep(.el-dialog__header) {
  flex-shrink: 0;
  padding: 0;
  margin: 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.queue-runtime-dialog :deep(.el-dialog__headerbtn) {
  top: 10px;
  right: 12px;
  z-index: 3;
}

.queue-runtime-dialog :deep(.el-dialog__headerbtn .el-dialog__close) {
  color: rgba(255, 255, 255, 0.72);
}

.queue-runtime-dialog :deep(.el-dialog__body) {
  flex: 1;
  min-height: 0;
  padding: 0;
  overflow: hidden;
  background:
    radial-gradient(circle at top left, rgba(61, 157, 246, 0.08), transparent 28%),
    linear-gradient(180deg, rgba(0, 0, 0, 0.46) 0%, rgba(8, 8, 8, 0.72) 100%);
}

.queue-runtime-dialog :deep(.el-dialog__footer) {
  flex-shrink: 0;
  padding: 0;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  background: linear-gradient(145deg, #1d1d1d, #121212);
}

.queue-runtime-window {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  font-family:
    "Fira Code", "JetBrains Mono", "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
}

.queue-runtime-window__chrome-btn--red {
  background: radial-gradient(circle at 30% 30%, #ff5f56, #bf2e2e);
}

.queue-runtime-window__chrome-btn--yellow {
  background: radial-gradient(circle at 30% 30%, #ffbd2e, #b4820e);
}

.queue-runtime-window__chrome-btn--green {
  background: radial-gradient(circle at 30% 30%, #27c93f, #199f2c);
}

.queue-runtime-window__toolbar-user {
  flex: 1;
  min-width: 0;
  color: #d5d0ce;
  font-size: 14px;
  line-height: 1.4;
  text-align: center;
}

.queue-runtime-window__toolbar-tab {
  padding: 0 8px;
  border: 1px solid rgba(255, 255, 255, 0.72);
  border-bottom: none;
  border-radius: 4px 4px 0 0;
  color: #fff;
  background-color: rgba(255, 255, 255, 0.05);
  font-size: 13px;
  line-height: 1.4;
}

.queue-runtime-window__summary {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  padding: 14px 18px 8px;
}

.queue-runtime-window__summary-item {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 30px;
  padding: 0 10px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.04);
}

.queue-runtime-window__summary-label {
  color: #94a3b8;
  font-size: 12px;
  font-weight: 600;
}

.queue-runtime-window__summary-value {
  color: #f8fafc;
  font-size: 12px;
  font-weight: 700;
}

.queue-runtime-window__body {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 10px 18px 18px;
}

.queue-runtime-console {
  min-height: 100%;
  padding: 12px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  background: linear-gradient(180deg, rgba(15, 23, 42, 0.98) 0%, rgba(17, 24, 39, 0.99) 100%);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.04),
    0 18px 48px rgba(15, 23, 42, 0.16);
}

.queue-runtime-console--empty {
  display: flex;
  align-items: center;
}

.queue-runtime-console__line + .queue-runtime-console__line {
  margin-top: 8px;
}

.queue-runtime-console__line {
  padding: 10px 12px;
  border-radius: 10px;
  background: linear-gradient(180deg, rgba(15, 23, 42, 0.52) 0%, rgba(15, 23, 42, 0.68) 100%);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.02),
    0 4px 10px rgba(2, 6, 23, 0.16);
  transition:
    transform 0.18s ease,
    box-shadow 0.18s ease;
}

.queue-runtime-console__line:hover {
  transform: translateY(-1px);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.03),
    0 8px 16px rgba(2, 6, 23, 0.2);
}

.queue-runtime-console__prompt,
.queue-runtime-console__empty {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  font-size: 12px;
  line-height: 1.35;
}

.queue-runtime-console__user {
  color: #00ffae;
  text-shadow: 0 0 4px rgba(0, 255, 174, 0.45);
}

.queue-runtime-console__location {
  color: #3d9df6;
  text-shadow: 0 0 4px rgba(61, 157, 246, 0.42);
}

.queue-runtime-console__time {
  color: #94a3b8;
  font-size: 12px;
  letter-spacing: 0.01em;
}

.queue-runtime-console__content {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-top: 8px;
}

.queue-runtime-console__message {
  flex: 1;
  min-width: 0;
  color: #e5edf7;
  font-size: 13px;
  line-height: 1.55;
  white-space: pre-wrap;
  word-break: break-word;
  text-shadow: 0 0 3px rgba(255, 255, 255, 0.12);
}

.queue-runtime-console__line[data-level="warn"] .queue-runtime-console__message,
.queue-runtime-console__line[data-level="warning"] .queue-runtime-console__message {
  color: #fde68a;
}

.queue-runtime-console__line[data-level="error"] .queue-runtime-console__message {
  color: #fecaca;
}

.queue-runtime-console__line[data-level="success"] .queue-runtime-console__message {
  color: #dcfce7;
}

.queue-runtime-console__actions {
  flex: 0 0 auto;
  padding-top: 1px;
}

.queue-runtime-console__detail-trigger {
  min-height: 24px;
  padding: 0 9px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.03);
  color: #a5d8ff;
  font-size: 12px;
  line-height: 1;
  border: 1px solid rgba(148, 163, 184, 0.12);
}

.queue-runtime-console__detail-trigger:hover {
  color: #d7ecff;
  background: color-mix(in srgb, var(--el-color-primary) 8%, transparent);
  border-color: color-mix(in srgb, var(--el-color-primary) 18%, transparent);
}

.queue-runtime-console__detail-trigger:focus-visible {
  outline: 2px solid color-mix(in srgb, var(--el-color-primary) 30%, transparent);
  outline-offset: 1px;
}

.queue-runtime-console__cursor-row {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: 12px;
  flex-wrap: wrap;
}

.queue-runtime-console__cursor {
  display: inline-block;
  width: 6px;
  height: 14px;
  border-radius: 2px;
  background: #ffffff;
  animation: queue-runtime-cursor-blink 800ms steps(2) infinite;
}

.queue-runtime-dialog__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 18px;
  color: #cbd5e1;
}

.queue-runtime-dialog__footer-meta {
  display: inline-flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
  font-size: 12px;
}

.queue-runtime-dialog__footer-actions {
  margin-left: auto;
}

.queue-runtime-data-dialog__header {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.queue-runtime-data-dialog__title {
  font-size: 15px;
  font-weight: 700;
  color: var(--el-text-color-primary);
}

.queue-runtime-data-dialog__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  color: var(--el-text-color-secondary);
  font-size: 12px;
  line-height: 1.4;
}

.queue-runtime-data-dialog__message {
  color: var(--el-text-color-primary);
  font-size: 13px;
  line-height: 1.6;
}

.queue-runtime-data-dialog__body {
  max-height: min(60vh, 720px);
  overflow: auto;
  padding: 6px 2px 2px;
}

.queue-runtime-data-dialog__raw {
  margin: 0;
  padding: 14px 16px;
  overflow: auto;
  border: 1px solid rgb(15 23 42 / 12%);
  border-radius: 12px;
  background: linear-gradient(180deg, #0f172a 0%, #111827 100%);
  color: #e5edf7;
  font-family: "JetBrains Mono", "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
  font-size: 12px;
  line-height: 1.7;
  white-space: pre-wrap;
  word-break: break-word;
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 3%),
    0 12px 26px rgb(15 23 42 / 10%);
}

.queue-json-textarea {
  height: 100%;
}

.queue-json-textarea :deep(.el-textarea) {
  height: 100%;
}

.queue-json-textarea :deep(.el-textarea__wrapper) {
  height: 100%;
  padding: 0;
}

.queue-json-textarea :deep(.el-textarea__inner) {
  height: 100%;
  border: 0;
  box-shadow: none;
  font-size: 13px;
  line-height: 1.7;
}

.queue-json-textarea :deep(.el-textarea__inner::placeholder) {
  color: inherit;
}

.queue-json-dialog :deep(.el-dialog__body) {
  height: calc(100vh - 120px);
  min-height: 0;
  overflow: hidden;
}

.queue-json-dialog :deep(.el-dialog__footer) {
  flex-shrink: 0;
}

@media (max-width: 960px) {
  .queue-page__stats-bar {
    gap: 6px;
  }

  .queue-stats-pill {
    min-height: 24px;
    padding: 0 3px;
  }

  .queue-dispatch-panel {
    width: 100%;
    flex: 1 1 100%;
    padding-top: 6px;
    border-top: 1px solid var(--el-border-color-lighter);
    border-left: 0;
  }

  .queue-dispatch-panel__main {
    flex-wrap: wrap;
    row-gap: 6px;
  }

  .queue-json-editor-layout {
    grid-template-columns: 1fr;
  }

  .queue-runtime-window__toolbar {
    padding-right: 44px;
  }

  .queue-runtime-window__toolbar-user {
    text-align: left;
  }

  .queue-runtime-window__summary,
  .queue-runtime-window__body,
  .queue-runtime-dialog__footer {
    padding-left: 14px;
    padding-right: 14px;
  }

  .queue-runtime-console__content {
    flex-direction: column;
    gap: 8px;
  }

  .queue-runtime-console__actions {
    padding-top: 0;
  }
}

@media (min-width: 768px) and (max-width: 1180px) {
  .queue-page {
    gap: 12px;
  }

  .queue-page__stats-bar {
    gap: 10px;
  }

  .queue-page .list-page-search-form__actions .el-button {
    min-height: 42px;
    padding: 0 18px;
  }

  .publish-dispatch-dialog__client-list {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .publish-dispatch-client {
    border-radius: 18px;
  }

  .publish-dispatch-client {
    padding-left: 18px;
    padding-right: 18px;
  }

  .publish-dispatch-dialog__profile-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .queue-runtime-console {
    padding: 14px 16px;
  }

  .publish-dispatch-dialog :deep(.el-dialog__body) {
    padding: 18px 20px;
  }
}

@media (max-width: 767px) {
  .publish-dispatch-dialog__table :deep(.el-table) {
    font-size: 12px;
  }

  .publish-dispatch-dialog__client-list,
  .publish-dispatch-dialog__profile-grid {
    grid-template-columns: 1fr;
  }

  .publish-dispatch-dialog__section-meta {
    width: 100%;
  }
}

@keyframes queue-status-breath-success {
  0%,
  100% {
    box-shadow: 0 0 0 0 rgb(103 194 58 / 16%);
    transform: scale(1);
  }

  50% {
    box-shadow: 0 0 0 6px rgb(103 194 58 / 0%);
    transform: scale(1.04);
  }
}

@keyframes queue-status-breath-warning {
  0%,
  100% {
    box-shadow: 0 0 0 0 rgb(249 115 22 / 16%);
    transform: scale(1);
  }

  50% {
    box-shadow: 0 0 0 6px rgb(249 115 22 / 0%);
    transform: scale(1.04);
  }
}

@keyframes queue-runtime-cursor-blink {
  0%,
  49% {
    opacity: 1;
  }

  50%,
  99% {
    opacity: 0;
  }

  100% {
    opacity: 1;
  }
}
</style>

<style lang="less">
.start-publish-dialog {
  border-radius: 8px;
  overflow: hidden;

  .el-dialog__header {
    margin-right: 0;
    padding: 16px 20px 12px;
    border-bottom: 1px solid var(--el-border-color-lighter);
  }

  .el-dialog__title {
    font-size: 15px;
    font-weight: 600;
  }

  .el-dialog__body {
    padding: 12px 16px;
  }

  .el-dialog__footer {
    padding: 12px 20px 16px;
    border-top: 1px solid var(--el-border-color-lighter);
  }

  &__body {
    min-height: 120px;
    max-height: 480px;
    overflow-y: auto;
  }

  &__empty {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 140px;
    color: var(--el-text-color-secondary);
    font-size: 13px;
  }

  &__footer {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
  }
}

// 暗色模式样式
html.dark {
  .start-publish-dialog {
    .el-dialog__header {
      border-bottom-color: rgba(255, 255, 255, 0.08);
    }
    .el-dialog__footer {
      border-top-color: rgba(255, 255, 255, 0.08);
    }
  }

}

</style>
