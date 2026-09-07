<template>
  <ContentWrap :plain="true">
    <ListPageLayout class="remotion-record-page">
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
                <el-form-item :label="t('remotionVideoRecord.keyword')">
                  <el-input
                    v-model="queryParams.keyword"
                    size="small"
                    clearable
                    :placeholder="t('remotionVideoRecord.titlePlaceholder')"
                    @keyup.enter="getList"
                    @change="handleKeywordChange"
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
                <el-form-item :label="t('common.status')">
                  <el-select
                    v-model="queryParams.status"
                    size="small"
                    clearable
                    :placeholder="t('remotionVideoRecord.allStatus')"
                    @change="getList"
                  >
                    <el-option :label="t('remotionVideoRecord.statusPending')" value="pending" />
                    <el-option :label="t('remotionVideoRecord.statusPendingClient')" value="pending_client" />
                    <el-option :label="t('remotionVideoRecord.statusAssigned')" value="assigned" />
                    <el-option :label="t('remotionVideoRecord.statusQueued')" value="queued" />
                    <el-option :label="t('remotionVideoRecord.statusProcessing')" value="processing" />
                    <el-option :label="t('common.success')" value="success" />
                    <el-option :label="t('remotionVideoRecord.statusFailed')" value="failed" />
                  </el-select>
                </el-form-item>
              </el-col>
            </el-row>
            <div class="list-page-search-form__actions">
              <el-button
                size="small"
                type="primary"
                :icon="Search"
                :loading="loading"
                @click="getList"
                >{{ t('common.search') }}</el-button
              >
              <el-button size="small" type="primary" @click="openCreateDialog()">{{ t('common.add') }}</el-button>
              <el-button size="small" type="success" @click="openAiGenerateDialog()">
                <el-icon><MagicStick /></el-icon>
                {{ t('remotionVideoRecord.aiGenerate') }}
              </el-button>
              <el-button
                size="small"
                type="danger"
                :icon="Delete"
                :disabled="loading"
                @click="handleBatchDelete"
              >
                {{ t('remotionVideoRecord.batchDelete', { count: selectedRows.length }) }}
              </el-button>
            </div>
          </el-form>
        </div>
      </template>

      <template #table>
        <div
          class="list-page-panel list-page-panel--flat list-page-table-panel list-page-table-panel--flat"
        >
          <div class="list-page-table-panel__body">
            <div class="common-table">
              <vxe-grid
                v-bind="gridOptions"
                :data="dataSource"
                :loading="loading"
                @checkbox-change="handleCheckboxChange"
                @checkbox-all="handleCheckboxAll"
              >
                <template #titleSlot="{ row }">
                  <div class="record-title-cell">
                    <div class="record-title-text">
                      <span class="record-title-main">{{ row.title || "-" }}</span>
                      <span class="record-id">ID: {{ row.id }}</span>
                    </div>
                  </div>
                </template>
                <template #templateSlot="{ row }">
                  <div class="record-template-cell">
                    <div class="record-template-name">
                      <el-tag
                        v-if="row.templateName === '自由创作' || row.templateId === 'ai-universal'"
                        type="warning"
                        size="small"
                        effect="plain"
                        class="mr-1"
                      >{{ t('remotionVideoRecord.freeCreation') }}</el-tag>
                      <span v-else class="record-template-main">{{
                        row.templateName || row.templateId
                      }}</span>
                      <span class="record-template-id">{{ row.templateId }}</span>
                    </div>
                  </div>
                </template>
                <template #statusSlot="{ row }">
                  <el-tag :type="getStatusTagType(row.status)" effect="plain">{{
                    getStatusLabel(row.status)
                  }}</el-tag>
                </template>
                <template #progressSlot="{ row }">
                  <div class="record-progress-cell">
                    <el-progress
                      v-if="typeof resolveRowProgress(row) === 'number'"
                      :percentage="resolveRowProgress(row) || 0"
                      :status="getProgressStatus(row)"
                      :stroke-width="4"
                    />
                    <span v-else class="record-progress-placeholder">
                      {{ getProgressPlaceholder(row) }}
                    </span>
                    <div v-if="getProgressMessage(row)" class="record-progress-message">
                      {{ getProgressMessage(row) }}
                    </div>
                  </div>
                </template>
                <template #videoSlot="{ row }">
                  <div class="record-video-cell">
                    <div class="cell-video-wrapper">
                      <video
                          v-if="row.url"
                          :src="row.url"
                          preload="metadata"
                          class="cell-video-player"
                          muted
                          playsinline
                          :controls="false"
                          @click.stop="previewVideo(row)"
                        ></video>
                        <span v-if="!row.url" class="cell-video-placeholder">-</span>
                    </div>
                  </div>
                </template>
                <template #createTimeSlot="{ row }">
                  <span class="table-time-text">{{ formatTimestamp(row.createTime) }}</span>
                </template>
                <template #operationDefaultSlot="{ row }">
                  <div class="flex justify-start">
                    <el-dropdown
                      trigger="click"
                      placement="bottom-end"
                      @command="(command) => handleOperationCommand(command, row)"
                      class="operation-dropdown"
                    >
                      <el-button type="primary" link size="small" class="operation-trigger-button"
                        >{{ t('common.operation') }}</el-button
                      >
                      <template #dropdown>
                        <el-dropdown-menu class="operation-menu-compact">
                          <el-dropdown-item command="detail">{{ t('remotionVideoRecord.viewDetail') }}</el-dropdown-item>
                          <!-- 再次生成已移除 -->
                          <el-dropdown-item
                            command="delete"
                            divided
                            class="operation-menu-item--danger"
                            >{{ t('common.delete') }}</el-dropdown-item
                          >
                        </el-dropdown-menu>
                      </template>
                    </el-dropdown>
                  </div>
                </template>
              </vxe-grid>
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
  </ContentWrap>

  <el-dialog
    v-model="createVisible"
    :title="t('remotionVideoRecord.createVideoProduction')"
    fullscreen
    destroy-on-close
    class="remotion-create-dialog"
    :close-on-click-modal="false"
  >
    <div class="remotion-dialog-toolbar">
      <!-- 步骤指示器 -->
      <div class="remotion-steps">
        <div
          v-for="(step, index) in steps"
          :key="index"
          class="remotion-step-item"
          :class="{
            'remotion-step-active': currentStep === index,
            'remotion-step-done': currentStep > index
          }"
          @click="goToStep(index)"
        >
          <div class="remotion-step-icon">
            <span v-if="currentStep > index">✓</span>
            <span v-else>{{ index + 1 }}</span>
          </div>
          <div class="remotion-step-label">{{ step.label }}</div>
        </div>
      </div>

      <div class="remotion-dialog-actions">
        <el-button @click="createVisible = false">{{ t('common.cancel') }}</el-button>
        <el-button v-if="currentStep > 0" @click="currentStep--">{{ t('common.prevLabel') }}</el-button>
        <el-button
          v-if="currentStep < 2"
          type="primary"
          :disabled="!canGoNext"
          @click="currentStep++"
        >
          {{ t('common.nextLabel') }}
        </el-button>
        <el-button
          v-if="currentStep === 2"
          type="primary"
          :loading="submitLoading"
          :disabled="!canSubmitGenerate"
          @click="submitGenerate"
        >
          {{ t('remotionVideoRecord.startProduction') }}
        </el-button>
      </div>
    </div>

    <!-- 步骤内容 -->
    <div class="remotion-step-content">
      <!-- 步骤1: 选择模板 -->
      <div v-show="currentStep === 0" class="remotion-step-panel">
        <div class="template-filter-bar">
          <div class="template-filter-controls">
            <el-input
              v-model="templateSearchKeyword"
              clearable
              :placeholder="t('remotionVideoRecord.searchTemplatePlaceholder')"
              class="filter-search"
              @input="handleTemplateFilterChange"
            >
              <template #prefix>
                <el-icon><Search /></el-icon>
              </template>
            </el-input>
            <el-select
              v-model="templateFilters.category"
              clearable
              :placeholder="t('remotionVideoRecord.contentCategory')"
              class="filter-select"
              @change="handleTemplateFilterChange"
            >
              <el-option
                v-for="item in templateCategoryOptions"
                :key="item"
                :label="item"
                :value="item"
              />
            </el-select>
            <el-select
              v-model="templateFilters.orientation"
              clearable
              :placeholder="t('remotionVideoRecord.orientation')"
              class="filter-select filter-select--compact"
              @change="handleTemplateFilterChange"
            >
              <el-option :label="t('remotionVideoRecord.portrait')" value="portrait" />
              <el-option :label="t('remotionVideoRecord.landscape')" value="landscape" />
              <el-option :label="t('remotionVideoRecord.square')" value="square" />
            </el-select>
            <el-select
              v-model="templateFilters.durationLabel"
              clearable
              :placeholder="t('remotionVideoRecord.durationType')"
              class="filter-select"
              @change="handleTemplateFilterChange"
            >
              <el-option
                v-for="item in templateDurationOptions"
                :key="item"
                :label="item"
                :value="item"
              />
            </el-select>
            <el-select
              v-model="templateFilters.tag"
              clearable
              filterable
              :placeholder="t('remotionVideoRecord.tag')"
              class="filter-select"
              @change="handleTemplateFilterChange"
            >
              <el-option
                v-for="item in templateTagOptions"
                :key="item"
                :label="item"
                :value="item"
              />
            </el-select>
            <el-select
              v-model="templateFilters.style"
              clearable
              filterable
              :placeholder="t('remotionVideoRecord.style')"
              class="filter-select filter-select--wide"
              @change="handleTemplateFilterChange"
            >
              <el-option
                v-for="item in templateStyleOptions"
                :key="item"
                :label="item"
                :value="item"
              />
            </el-select>
            <el-button class="template-filter-reset" @click="resetTemplateFiltersAndReload">
              {{ t('common.reset') }}
            </el-button>
          </div>
          <div class="template-filter-summary">
            <span>{{ t('remotionVideoRecord.currentCount', { count: templateMeta.total || filteredTemplateOptions.length }) }}</span>
            <span v-if="templateMeta.allTotal">{{ t('remotionVideoRecord.allCount', { count: templateMeta.allTotal }) }}</span>
          </div>
        </div>

        <div v-if="categorizedTemplates.length === 0" class="template-grid-empty">
          <el-empty :description="t('remotionVideoRecord.noMatchingTemplates')" />
        </div>
        <div v-else class="template-categories">
          <div
            v-for="group in categorizedTemplates"
            :key="group.category"
            class="template-category"
          >
            <div class="template-category-header">
              <span class="template-category-name">{{ group.category }}</span>
              <span class="template-category-count">{{ t('remotionVideoRecord.templateCount', { count: group.templates.length }) }}</span>
            </div>
            <div class="template-grid">
              <div
                v-for="template in group.templates"
                :key="template.id"
                class="template-card"
                :class="{ 'template-card-selected': form.templateId === template.id }"
                @click="selectTemplate(template)"
              >
                <div class="template-card-name">{{ getTemplateLocalName(template) }}</div>
                <div class="template-card-desc">{{ getTemplateLocalDesc(template) }}</div>
                <div class="template-card-meta">
                  <span>{{ getTemplateOrientationLabel(template) }}</span>
                  <span class="meta-dot"></span>
                  <span>{{ getTemplateDurationText(template) }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 步骤2: 填写参数 -->
      <div v-show="currentStep === 1" class="remotion-step-panel">
        <div v-if="selectedTemplate" class="params-panel">
          <div class="params-header">
            <div class="params-template-name">{{ selectedTemplate.name }}</div>
            <el-button type="primary" link @click="currentStep = 0">{{ t('remotionVideoRecord.reselect') }}</el-button>
          </div>

          <div class="params-editor-layout">
            <div class="params-form">
              <el-form
                v-if="selectedTemplate.inputSchema && selectedTemplate.inputSchema.length"
                label-position="top"
                label-width="auto"
              >
                <el-form-item
                  v-for="field in selectedTemplate.inputSchema"
                  :key="field.key"
                  :label="field.label || field.key"
                  :required="field.required"
                >
                  <template #label>
                    <span>{{ field.label || field.key }}</span>
                    <el-tooltip v-if="field.description" :content="field.description" placement="top">
                      <el-icon class="ml-1 cursor-pointer"><QuestionFilled /></el-icon>
                    </el-tooltip>
                  </template>
                  <el-input
                    v-if="isTextInput(field)"
                    :model-value="getParamFieldString(field.key)"
                    :placeholder="getFieldPlaceholder(field)"
                    clearable
                    @update:model-value="(value) => updateParamField(field, value)"
                  />
                  <el-input-number
                    v-else-if="isNumberInput(field)"
                    :model-value="getParamFieldNumber(field.key)"
                    :placeholder="field.example !== undefined ? String(field.example) : t('remotionVideoRecord.inputNumber')"
                    class="w-full"
                    @update:model-value="(value) => updateParamField(field, value)"
                  />
                  <el-switch
                    v-else-if="isBoolInput(field)"
                    :model-value="!!formParams[field.key]"
                    @update:model-value="(value) => updateParamField(field, value)"
                  />
                  <el-input
                    v-else
                    :model-value="getParamFieldJson(field.key)"
                    type="textarea"
                    :rows="getComplexFieldRows(field)"
                    :placeholder="getFieldPlaceholder(field)"
                    @update:model-value="(value) => updateParamField(field, value)"
                  />
                  <div v-if="isComplexInput(field)" class="param-json-tip">
                    {{ getComplexFieldTip(field) }}
                  </div>
                </el-form-item>
              </el-form>
              <el-empty v-else :description="t('remotionVideoRecord.noParamFields')" :image-size="80" />
            </div>

            <div class="params-json">
              <div class="params-json-header">
                <span>{{ t('remotionVideoRecord.jsonParams') }}</span>
                <span class="json-hint" :class="{ 'json-hint--error': !!jsonEditError }">
                  {{ jsonEditError || t('remotionVideoRecord.jsonSyncTip') }}
                </span>
              </div>
              <el-input
                type="textarea"
                v-model="form.inputPropsJson"
                :rows="18"
                resize="none"
                class="json-editor"
                :placeholder="t('remotionVideoRecord.inputJsonPlaceholder')"
                @input="handleJsonInput"
              />
            </div>
          </div>
        </div>
        <el-empty v-else :description="t('remotionVideoRecord.selectTemplateFirst')" />
      </div>

      <!-- 步骤3: 确认提交 -->
      <div v-show="currentStep === 2" class="remotion-step-panel">
        <div v-if="selectedTemplate" class="confirm-panel">
          <div class="confirm-section">
            <div class="confirm-title">{{ t('remotionVideoRecord.templateInfo') }}</div>
            <div class="confirm-grid">
              <div class="confirm-item">
                <span class="confirm-label">{{ t('remotionVideoRecord.templateName') }}</span>
                <span class="confirm-value">{{ selectedTemplate.name }}</span>
              </div>
              <div class="confirm-item">
                <span class="confirm-label">{{ t('remotionVideoRecord.resolution') }}</span>
                <span class="confirm-value">{{ selectedTemplate.width }} x {{ selectedTemplate.height }}</span>
              </div>
              <div class="confirm-item">
                <span class="confirm-label">{{ t('remotionVideoRecord.duration') }}</span>
                <span class="confirm-value">{{ selectedTemplate.durationLabel || '-' }}</span>
              </div>
              <div class="confirm-item">
                <span class="confirm-label">{{ t('remotionVideoRecord.fps') }}</span>
                <span class="confirm-value">{{ selectedTemplate.fps }}fps</span>
              </div>
            </div>
          </div>

          <div class="confirm-section">
            <div class="confirm-title">{{ t('remotionVideoRecord.inputParams') }}</div>
            <div class="confirm-params">
              <pre>{{ displayParamsJson }}</pre>
            </div>
          </div>

          <div class="confirm-section">
            <div class="confirm-title">{{ t('remotionVideoRecord.taskSettings') }}</div>
            <el-form label-position="top">
              <el-form-item :label="t('remotionVideoRecord.recordTitleOptional')">
                <el-input v-model="form.title" :placeholder="t('remotionVideoRecord.titlePlaceholderDetail')" />
              </el-form-item>
              <el-form-item :label="t('remotionVideoRecord.timeoutMs')">
                <el-input-number
                  v-model="form.timeoutMs"
                  :min="1000"
                  :max="900000"
                  :step="1000"
                  class="w-full"
                />
              </el-form-item>
            </el-form>
          </div>

          <el-alert
            v-if="remotionStatus.checked && !remotionStatus.available"
            type="error"
            :closable="false"
            show-icon
            :title="t('remotionVideoRecord.clientNotDetected')"
            :description="remotionStatus.message || t('remotionVideoRecord.clientLoginTip')"
          />
        </div>
      </div>
    </div>

  </el-dialog>

  <el-dialog
    v-model="detailVisible"
    :title="t('remotionVideoRecord.videoDetail')"
    fullscreen
    destroy-on-close
    class="remotion-detail-dialog"
  >
    <div v-if="currentRow" class="remotion-detail-layout">
      <el-card shadow="never">
        <template #header>{{ t('remotionVideoRecord.resultPreview') }}</template>
        <div class="remotion-video-preview">
          <video
            v-if="currentRow.url"
            :src="currentRow.url"
            controls
            class="remotion-video-player"
          ></video>
          <el-empty v-else :description="t('remotionVideoRecord.noVideoResult')" :image-size="96" />
        </div>
      </el-card>
      <div class="remotion-detail-side">
        <el-card shadow="never">
          <template #header>{{ t('remotionVideoRecord.basicInfo') }}</template>
          <div class="detail-section">
            <div><strong>{{ t('remotionVideoRecord.title') }}：</strong>{{ currentRow.title || "-" }}</div>
            <div>
              <strong>{{ t('remotionVideoRecord.template') }}：</strong>
              <el-tag
                v-if="currentRow.templateName === '自由创作' || currentRow.templateId === 'ai-universal'"
                type="warning"
                size="small"
                effect="plain"
              >{{ t('remotionVideoRecord.freeCreation') }}</el-tag>
              <span v-else>{{ currentRow.templateName || currentRow.templateId }}</span>
            </div>
            <div><strong>{{ t('common.status') }}：</strong>{{ getStatusLabel(currentRow.status) }}</div>
            <div><strong>{{ t('remotionVideoRecord.progress') }}：</strong>{{ getProgressDisplayText(currentRow) }}</div>
            <div v-if="resolveRecordMachineCode(currentRow)">
              <strong>{{ t('remotionVideoRecord.machineCode') }}：</strong>{{ resolveRecordMachineCode(currentRow) }}
            </div>
            <div v-if="resolveQueueDetailText(currentRow)">
              <strong>{{ t('remotionVideoRecord.queueStatus') }}：</strong>{{ resolveQueueDetailText(currentRow) }}
            </div>
            <div><strong>{{ t('common.createTime') }}：</strong>{{ formatTimestamp(currentRow.createTime) }}</div>
            <div v-if="currentRow.url"><strong>{{ t('remotionVideoRecord.cosAddress') }}：</strong>{{ currentRow.url }}</div>
            <div v-if="currentRow.remotionVideoUrl">
              <strong>{{ t('remotionVideoRecord.sourceAddress') }}：</strong>{{ currentRow.remotionVideoUrl }}
            </div>
            <div v-if="currentRow.errorMessage">
              <strong>{{ t('remotionVideoRecord.errorMessage') }}：</strong>{{ currentRow.errorMessage }}
            </div>
          </div>
        </el-card>
        <el-card shadow="never">
          <template #header>{{ t('remotionVideoRecord.inputParams') }}</template>
          <div class="detail-json-panel">
            <pre>{{ formatJson(currentRow.inputProps) }}</pre>
          </div>
        </el-card>
      </div>
    </div>
  </el-dialog>

  <el-dialog
    v-model="previewVisible"
    :title="t('remotionVideoRecord.videoPreview')"
    width="680px"
    destroy-on-close
    class="remotion-preview-dialog"
  >
    <div class="preview-video-wrapper">
      <video
        v-if="previewUrl"
        :src="previewUrl"
        controls
        autoplay
        class="preview-video-player"
      ></video>
    </div>
  </el-dialog>

  <!-- AI 视频生成对话框 -->
  <el-dialog
    v-model="aiGenerateVisible"
    :title="t('remotionVideoRecord.aiGenerateVideo')"
    :width="isMobile ? 'calc(100vw - 16px)' : '520px'"
    destroy-on-close
    :close-on-click-modal="false"
  >
    <!-- 模式切换 -->
    <div style="display: flex; margin-bottom: 16px; overflow: hidden; border: 1px solid var(--el-border-color); border-radius: 8px; gap: 0;">
      <button
        type="button"
        :style="{
          flex: 1, padding: '10px 0', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 600,
          background: aiForm.mode === 'ai-generate' ? 'var(--el-color-primary)' : 'var(--el-fill-color-light)',
          color: aiForm.mode === 'ai-generate' ? '#fff' : 'var(--el-text-color-regular)',
          transition: 'all 0.2s',
        }"
        @click="aiForm.mode = 'ai-generate'"
      >
        <el-icon style=" margin-right: 4px;vertical-align: -2px;"><MagicStick /></el-icon>
        {{ t('remotionVideoRecord.smartMatch') }}
      </button>
      <button
        type="button"
        :style="{
          flex: 1, padding: '10px 0', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 600,
          background: aiForm.mode === 'ai-free-generate' ? 'var(--el-color-primary)' : 'var(--el-fill-color-light)',
          color: aiForm.mode === 'ai-free-generate' ? '#fff' : 'var(--el-text-color-regular)',
          transition: 'all 0.2s',
        }"
        @click="aiForm.mode = 'ai-free-generate'"
      >
        <el-icon style=" margin-right: 4px;vertical-align: -2px;"><VideoPlay /></el-icon>
        {{ t('remotionVideoRecord.freeDescription') }}
      </button>
    </div>

    <!-- 模式说明 -->
    <div style=" padding: 8px 12px;margin-bottom: 12px; font-size: 12px; line-height: 1.6; color: var(--el-text-color-secondary); background: var(--el-fill-color-lighter); border-radius: 6px;">
      <template v-if="aiForm.mode === 'ai-generate'">
        {{ t('remotionVideoRecord.aiGenerateModeTip') }}
      </template>
      <template v-else>
        {{ t('remotionVideoRecord.aiFreeGenerateModeTip') }}
      </template>
    </div>

    <!-- Prompt 输入 -->
    <el-input
      v-model="aiForm.prompt"
      type="textarea"
      :rows="5"
      :placeholder="aiForm.mode === 'ai-generate' ? t('remotionVideoRecord.aiGeneratePlaceholder') : t('remotionVideoRecord.aiFreeGeneratePlaceholder')"
      resize="none"
    />
    <div style=" display: flex;margin-top: 8px; gap: 6px; flex-wrap: wrap;">
      <el-link
        v-for="tag in currentQuickTags"
        :key="tag.label"
        type="info"
        :underline="false"
        style="font-size: 12px;"
        @click="insertQuickTag(tag.value)"
      >{{ tag.label }}</el-link>
    </div>

    <!-- 结果显示 -->
    <div v-if="aiSubmitResult" style="margin-top: 12px; font-size: 13px;">
      <template v-if="aiSubmitResult.success">
        <div style="display: flex; align-items: center; gap: 6px; color: var(--el-color-success);">
          <el-icon><CircleCheck /></el-icon>
          {{ t('remotionVideoRecord.submitted') }} · {{ aiSubmitResult.templateUsed }}
          <template v-if="aiSubmitResult.sceneCount">
            · {{ t('remotionVideoRecord.sceneCount', { count: aiSubmitResult.sceneCount }) }} · {{ aiSubmitResult.totalDuration }}s
          </template>
        </div>
      </template>
      <span v-else style="color: var(--el-color-danger);">{{ aiSubmitResult.error }}</span>
    </div>

    <template #footer>
      <el-button @click="aiGenerateVisible = false">{{ t('common.cancel') }}</el-button>
      <el-button
        type="primary"
        :loading="aiSubmitting"
        :disabled="!aiForm.prompt"
        @click="submitAiGenerate"
      >{{ aiSubmitting ? t('remotionVideoRecord.generating') : t('remotionVideoRecord.generate') }}</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { useI18n } from "@/hooks/web/useI18n";
import { Delete, Search, QuestionFilled, MagicStick, Files, VideoPlay, CircleCheck } from "@element-plus/icons-vue";
import { useWindowSize } from "@vueuse/core";
import { formatTimestamp } from "@/common/date";
import { buildOperationColumn, buildTimeColumn, commonGridOptions } from "@/common/table";
import {
  deleteRemotionVideoRecord,
  batchDeleteRemotionVideoRecord,
  generateRemotionVideoRecord,
  getRemotionTemplateList,
  getRemotionVideoRecordDetail,
  getRemotionVideoRecordPage,
  aiGenerateRemotionVideoRecord,
} from "@/api/remotion-video-record";
import ContentWrap from "@/components/ContentWrap/src/ContentWrap.vue";
import ListPageLayout from "@/components/ListPageLayout/index.vue";
import Pagination from "@/components/Pagination/index.vue";
import { refreshServiceHealth, useServiceHealthState } from "@/services/serviceHealthState";
import { websocketClient, type RemotionVideoRecordStatusEvent } from "@/services/websocketClient";

const { t } = useI18n();

const { height } = useWindowSize();
const isMobile = computed(() => window.innerWidth < 768);
const loading = ref(false);
const total = ref(0);
const dataSource = ref<any[]>([]);
const templateOptions = ref<any[]>([]);
const templateMeta = reactive({
  total: 0,
  allTotal: 0,
  filters: {
    categories: [] as string[],
    durationLabels: [] as string[],
    styles: [] as string[],
    useCases: [] as string[],
    tags: [] as string[],
    orientations: [] as string[],
  },
});
const templateFilters = reactive({
  category: "",
  durationLabel: "",
  style: "",
  useCase: "",
  tag: "",
  orientation: "",
});
const templateSearchKeyword = ref("");
const createVisible = ref(false);
const detailVisible = ref(false);
const submitLoading = ref(false);
const currentRow = ref<any>(null);
const previewVisible = ref(false);
const previewUrl = ref('');
const remotionStatus = useServiceHealthState("videoTemplate");

// AI 生成相关状态
const aiGenerateVisible = ref(false);
const aiSubmitting = ref(false);
const aiForm = ref({
  mode: 'ai-free-generate' as 'ai-generate' | 'ai-free-generate',
  prompt: '',
});
const aiSubmitResult = ref<any>(null);

// 快捷标签（按模式分组）
const quickTagsByMode = computed(() => ({
  'ai-generate': [
    { label: t('remotionVideoRecord.quickTagMultiImageGradient'), value: '图片轮播展示，标题：产品图集，以下是图片 https://example.com/1.jpg https://example.com/2.jpg https://example.com/3.jpg' },
    { label: t('remotionVideoRecord.quickTagTextDisplay'), value: '产品卖点展示，标题：核心优势，简洁高效；一键生成；永久免费' },
    { label: t('remotionVideoRecord.quickTagQuoteDisplay'), value: '品牌金句展示，品牌：YISHE，好的设计不是做加法，而是做减法' },
    { label: t('remotionVideoRecord.quickTagFeatureCards'), value: '功能介绍，标题：核心功能，智能分析；多平台整合；实时同步' },
    { label: t('remotionVideoRecord.quickTagDataReport'), value: '数据分析报告，标题：用户增长趋势，日活5.2万；转化率3.8%；留存62%' },
  ],
  'ai-free-generate': [
    { label: t('remotionVideoRecord.quickTagMultiImageGradient'), value: '图片轮播展示，标题：产品图集，以下是图片 https://example.com/1.jpg https://example.com/2.jpg https://example.com/3.jpg' },
    { label: t('remotionVideoRecord.quickTagTextDisplay'), value: '产品卖点展示，标题：核心优势，简洁高效；一键生成；永久免费' },
    { label: t('remotionVideoRecord.quickTagQuoteDisplay'), value: '品牌金句展示，品牌：YISHE，好的设计不是做加法，而是做减法' },
    { label: t('remotionVideoRecord.quickTagFeatureCards'), value: '功能介绍，标题：核心功能，智能分析；多平台整合；实时同步' },
    { label: t('remotionVideoRecord.quickTagDataReport'), value: '数据分析报告，标题：用户增长趋势，日活5.2万；转化率3.8%；留存62%' },
  ],
}));

const currentQuickTags = computed(() => quickTagsByMode.value[aiForm.value.mode] || quickTagsByMode.value['ai-free-generate']);

function insertQuickTag(value: string) {
  aiForm.value.prompt = value;
}
let processingPollTimer: ReturnType<typeof setTimeout> | null = null;
let templateSearchTimer: ReturnType<typeof setTimeout> | null = null;
const ACTIVE_RECORD_STATUSES = new Set([
  "pending",
  "pending_client",
  "assigned",
  "queued",
  "processing",
]);

// 分步向导状态
const currentStep = ref(0);
const paramsMode = ref<"form" | "json">("form");
const formParams = reactive<Record<string, any>>({});
const jsonEditError = ref("");
let syncingJsonFromForm = false;

const steps = computed(() => [
  { label: t("remotionVideoRecord.stepSelectTemplate") },
  { label: t("remotionVideoRecord.stepFillParams") },
  { label: t("remotionVideoRecord.stepConfirmSubmit") },
]);

const queryParams = reactive({
  currentPage: 1,
  pageSize: 20,
  keyword: "",
  status: "",
});

const form = reactive({
  templateId: "",
  title: "",
  timeoutMs: 300000,
  inputProps: {} as Record<string, any>,
  // Raw JSON string editor for flexible, complex params
  inputPropsJson: "{}",
});

const selectedTemplate = computed(
  () => templateOptions.value.find((item) => item.id === form.templateId) || null,
);
const templateCategoryOptions = computed(() =>
  templateMeta.filters.categories.length
    ? templateMeta.filters.categories
    : Array.from(
        new Set(
          templateOptions.value.map((item) => String(item?.category || "").trim()).filter(Boolean),
        ),
      ),
);
const templateDurationOptions = computed(() =>
  templateMeta.filters.durationLabels.length
    ? templateMeta.filters.durationLabels
    : Array.from(
        new Set(
          templateOptions.value
            .map((item) => String(item?.durationLabel || "").trim())
            .filter(Boolean),
        ),
      ),
);
const templateStyleOptions = computed(() =>
  templateMeta.filters.styles.length
    ? templateMeta.filters.styles
    : Array.from(
        new Set(templateOptions.value.map((item) => String(item?.style || "").trim()).filter(Boolean)),
      ),
);
const templateTagOptions = computed(() =>
  templateMeta.filters.tags.length
    ? templateMeta.filters.tags
    : Array.from(
        new Set(
          templateOptions.value
            .flatMap((item) => (Array.isArray(item?.tags) ? item.tags : []))
            .map((item) => String(item || "").trim())
            .filter(Boolean),
        ),
      ),
);
const filteredTemplateOptions = computed(() => templateOptions.value);

/** 模板中文名映射（ID → 名称/描述） */
const templateNameMap = computed<Record<string, { name: string; desc: string }>>(() => ({
  // 过渡效果
  'fade': { name: t('remotionVideoRecord.tplFade'), desc: t('remotionVideoRecord.tplFadeDesc') },
  'fade-in': { name: t('remotionVideoRecord.tplFadeIn'), desc: t('remotionVideoRecord.tplFadeInDesc') },
  'fade-out': { name: t('remotionVideoRecord.tplFadeOut'), desc: t('remotionVideoRecord.tplFadeOutDesc') },
  'crossfade': { name: t('remotionVideoRecord.tplCrossfade'), desc: t('remotionVideoRecord.tplCrossfadeDesc') },
  'dissolve': { name: t('remotionVideoRecord.tplDissolve'), desc: t('remotionVideoRecord.tplDissolveDesc') },
  'wipe': { name: t('remotionVideoRecord.tplWipe'), desc: t('remotionVideoRecord.tplWipeDesc') },
  // 滑动
  'slide': { name: t('remotionVideoRecord.tplSlide'), desc: t('remotionVideoRecord.tplSlideDesc') },
  'slide-left': { name: t('remotionVideoRecord.tplSlideLeft'), desc: t('remotionVideoRecord.tplSlideLeftDesc') },
  'slide-right': { name: t('remotionVideoRecord.tplSlideRight'), desc: t('remotionVideoRecord.tplSlideRightDesc') },
  'slide-up': { name: t('remotionVideoRecord.tplSlideUp'), desc: t('remotionVideoRecord.tplSlideUpDesc') },
  'slide-down': { name: t('remotionVideoRecord.tplSlideDown'), desc: t('remotionVideoRecord.tplSlideDownDesc') },
  // 缩放
  'zoom': { name: t('remotionVideoRecord.tplZoom'), desc: t('remotionVideoRecord.tplZoomDesc') },
  'zoom-in': { name: t('remotionVideoRecord.tplZoomIn'), desc: t('remotionVideoRecord.tplZoomInDesc') },
  'zoom-out': { name: t('remotionVideoRecord.tplZoomOut'), desc: t('remotionVideoRecord.tplZoomOutDesc') },
  'scale': { name: t('remotionVideoRecord.tplScale'), desc: t('remotionVideoRecord.tplScaleDesc') },
  // 旋转
  'rotate': { name: t('remotionVideoRecord.tplRotate'), desc: t('remotionVideoRecord.tplRotateDesc') },
  'spin': { name: t('remotionVideoRecord.tplSpin'), desc: t('remotionVideoRecord.tplSpinDesc') },
  // 翻转
  'flip': { name: t('remotionVideoRecord.tplFlip'), desc: t('remotionVideoRecord.tplFlipDesc') },
  'flip-horizontal': { name: t('remotionVideoRecord.tplFlipHorizontal'), desc: t('remotionVideoRecord.tplFlipHorizontalDesc') },
  'flip-vertical': { name: t('remotionVideoRecord.tplFlipVertical'), desc: t('remotionVideoRecord.tplFlipVerticalDesc') },
  // 其他基础效果
  'blur': { name: t('remotionVideoRecord.tplBlur'), desc: t('remotionVideoRecord.tplBlurDesc') },
  'ken-burns': { name: t('remotionVideoRecord.tplKenBurns'), desc: t('remotionVideoRecord.tplKenBurnsDesc') },
  'parallax': { name: t('remotionVideoRecord.tplParallax'), desc: t('remotionVideoRecord.tplParallaxDesc') },
  'push': { name: t('remotionVideoRecord.tplPush'), desc: t('remotionVideoRecord.tplPushDesc') },
  'none': { name: t('remotionVideoRecord.tplNone'), desc: t('remotionVideoRecord.tplNoneDesc') },
  // 合成
  'slideshow': { name: t('remotionVideoRecord.tplSlideshow'), desc: t('remotionVideoRecord.tplSlideshowDesc') },
  'collage': { name: t('remotionVideoRecord.tplCollage'), desc: t('remotionVideoRecord.tplCollageDesc') },
  'grid': { name: t('remotionVideoRecord.tplGrid'), desc: t('remotionVideoRecord.tplGridDesc') },
}));

function getTemplateLocalName(template: any): string {
  return templateNameMap.value[template.id]?.name || template.name || template.id;
}

function getTemplateLocalDesc(template: any): string {
  return templateNameMap.value[template.id]?.desc || template.description || t('remotionVideoRecord.noDescription');
}

const categorizedTemplates = computed(() => {
  const categoryOrder: string[] = [
    '过渡效果', '滑动', '缩放', '旋转', '翻转', '基础效果', '合成', '其他',
  ];
  const groupMap = new Map<string, any[]>();

  for (const t of filteredTemplateOptions.value) {
    const cat = String(t.category || '其他').trim() || '其他';
    if (!groupMap.has(cat)) groupMap.set(cat, []);
    groupMap.get(cat)!.push(t);
  }

  // 按预定义顺序排列，未列出的分类排在后面
  const known = new Set(categoryOrder);
  const sortedCats = [...groupMap.keys()].sort((a, b) => {
    const ia = categoryOrder.indexOf(a);
    const ib = categoryOrder.indexOf(b);
    return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
  });

  return sortedCats.map(category => ({
    category,
    templates: groupMap.get(category) || [],
  }));
});

// 分步向导控制
const canGoNext = computed(() => {
  if (currentStep.value === 0) return !!form.templateId;
  if (currentStep.value === 1) {
    return !jsonEditError.value;
  }
  return true;
});

const displayParamsJson = computed(() => {
  if (paramsMode.value === "json") {
    try {
      return form.inputPropsJson ? JSON.stringify(JSON.parse(form.inputPropsJson), null, 2) : "{}";
    } catch {
      return form.inputPropsJson || "{}";
    }
  }
  return JSON.stringify(formParams, null, 2);
});

const canSubmitGenerate = computed(
  () => !!form.templateId && (!remotionStatus.checked || remotionStatus.available),
);
const submitDisabledText = computed(() => {
  if (!form.templateId) return "请先选择模板";
  if (remotionStatus.checked && !remotionStatus.available) return "视频制作客户端未连接";
  return "";
});

const gridOptions = computed(() => ({
  ...commonGridOptions,
  maxHeight: Math.max(height.value - 280, 360),
  rowConfig: { keyField: "id" },
  columns: [
    { type: "checkbox", width: 50 },
    { title: t("remotionVideoRecord.video"), field: "url", minWidth: 200, slots: { default: "videoSlot" } },
    { title: t("remotionVideoRecord.title"), field: "title", minWidth: 260, slots: { default: "titleSlot" } },
    { title: t("remotionVideoRecord.template"), field: "templateName", minWidth: 220, slots: { default: "templateSlot" } },
    { title: t("common.status"), field: "status", width: 120, slots: { default: "statusSlot" } },
    {
      title: t("remotionVideoRecord.progress"),
      field: "responseData.progress",
      minWidth: 260,
      slots: { default: "progressSlot" },
    },
    {
      title: t("remotionVideoRecord.uploader"),
      field: "uploader",
      width: 140,
      formatter: ({ row }: any) =>
        row?.uploader?.account || row?.uploader?.name || row?.userId || "-",
    },
    { ...buildTimeColumn(t("common.createTime"), "createTime", 180), slots: { default: "createTimeSlot" } },
    buildOperationColumn("operationDefaultSlot"),
  ],
}));

function handleKeywordChange(val: string) {
  if (!val) getList();
}

// 多选状态
const selectedRows = ref<any[]>([]);

// 多选change事件
function handleCheckboxChange({ records }: any) {
  selectedRows.value = records || [];
}

// 全选change事件
function handleCheckboxAll({ records }: any) {
  selectedRows.value = records || [];
}

// 批量删除
async function handleBatchDelete() {
  if (!selectedRows.value || selectedRows.value.length === 0) {
    ElMessage.warning("请选择要删除的记录");
    return;
  }

  try {
    await ElMessageBox.confirm(
      `确认删除选中的 ${selectedRows.value.length} 条记录吗？`,
      "批量删除确认",
      {
        confirmButtonText: "确定",
        cancelButtonText: "取消",
        type: "warning",
      },
    );

    loading.value = true;
    const ids = selectedRows.value.map((r: any) => r.id);
    const res: any = await batchDeleteRemotionVideoRecord(ids);
    const payload = res?.data ?? res;
    if (payload && payload.failed && payload.failed.length) {
      ElMessage.warning(`部分删除失败：${payload.failed.length} 条`);
    } else {
      ElMessage.success(`成功删除 ${payload.successIds?.length || ids.length} 条记录`);
    }
    selectedRows.value = [];
    await getList();
  } catch (error: any) {
    if (error !== "cancel") {
      ElMessage.error(error?.message || "批量删除失败");
    }
  } finally {
    loading.value = false;
  }
}

function getStatusLabel(status?: string) {
  const map: Record<string, string> = {
    pending: "待处理",
    pending_client: "等待客户端",
    assigned: "已派发",
    queued: "排队中",
    processing: "处理中",
    success: "成功",
    failed: "失败",
  };
  return map[status || ""] || status || "-";
}

function getStatusTagType(status?: string) {
  if (status === "success") return "success";
  if (status === "failed") return "danger";
  if (status === "queued") return "primary";
  if (status === "assigned") return "warning";
  if (status === "processing") return "warning";
  return "info";
}

function isActiveRecordStatus(status?: string) {
  return ACTIVE_RECORD_STATUSES.has(String(status || ""));
}

function hasConnectedRealtimeChannel() {
  return websocketClient.state.status === "connected";
}

function normalizeProgressValue(progress: unknown) {
  const numericValue = Number(progress);
  if (!Number.isFinite(numericValue)) {
    return null;
  }
  return Math.max(0, Math.min(100, Math.round(numericValue)));
}

function resolveRecordMachineCode(row: any) {
  return String(
    row?.responseData?.clientRuntime?.machineCode ||
      row?.responseData?.machineCode ||
      row?.responseData?.dispatch?.machineCode ||
      "",
  ).trim();
}

function resolveQueueAheadCount(row: any) {
  const numericValue = Number(row?.responseData?.queueAheadCount);
  return Number.isFinite(numericValue) ? Math.max(0, Math.round(numericValue)) : null;
}

function resolveQueueDetailText(row: any) {
  const detailList: string[] = [];
  const aheadCount = resolveQueueAheadCount(row);

  if (row?.status === "queued") {
    if (aheadCount === 0) {
      detailList.push("即将开始");
    } else if (aheadCount !== null) {
      detailList.push(`前方 ${aheadCount} 个任务`);
    }
  }
  if (row?.status === "processing") {
    detailList.push("制作中");
  }

  return detailList.join(" · ");
}

function resolveRowProgress(row: any) {
  const progress = normalizeProgressValue(row?.responseData?.progress);
  if (progress !== null) {
    return progress;
  }
  if (row?.status === "success") {
    return 100;
  }
  if (row?.status === "processing") {
    return 0;
  }
  return null;
}

function getProgressStatus(row: any) {
  if (row?.status === "success") return "success";
  if (row?.status === "failed") return "exception";
  return undefined;
}

function getProgressPlaceholder(row: any) {
  return getStatusLabel(row?.status);
}

function getProgressMessage(row: any) {
  const placeholder = getProgressPlaceholder(row);
  const queueDetailText = resolveQueueDetailText(row);
  const machineMessage =
    isActiveRecordStatus(row?.status) && resolveRecordMachineCode(row)
      ? `机器 ${resolveRecordMachineCode(row)}`
      : "";
  const extraMessage = [queueDetailText, machineMessage].filter(Boolean).join(" · ");
  const messageList = [row?.responseData?.message, row?.errorMessage, extraMessage];

  for (const item of messageList) {
    const message = String(item || "").trim();
    if (message && message !== placeholder) {
      return message;
    }
  }

  return "";
}

function getProgressDisplayText(row: any) {
  const progress = resolveRowProgress(row);
  if (progress !== null) {
    return `${progress}%`;
  }
  const message = getProgressMessage(row);
  return message || getProgressPlaceholder(row);
}

function formatJson(value: any) {
  try {
    return JSON.stringify(value || {}, null, 2);
  } catch {
    return "{}";
  }
}

// 判断字段类型
function isTextInput(field: any) {
  const type = String(field.type || "").toLowerCase();
  return type === "string" || type === "text" || (!type && field.example && typeof field.example === "string");
}

function isNumberInput(field: any) {
  const type = String(field.type || "").toLowerCase();
  return type === "number" || type === "int" || (field.example && typeof field.example === "number");
}

function isBoolInput(field: any) {
  const type = String(field.type || "").toLowerCase();
  return type === "boolean" || type === "bool" || (field.example && typeof field.example === "boolean");
}

function isComplexInput(field: any) {
  const type = String(field?.type || "").toLowerCase();
  return (
    type === "object" ||
    type === "array" ||
    Array.isArray(field?.example) ||
    (!!field?.example && typeof field.example === "object")
  );
}

function stringifyParamValue(value: any) {
  if (value === undefined || value === null) return "";
  if (typeof value === "object") {
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return "";
    }
  }
  return String(value);
}

function cloneParamValue(value: any) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "object") return value;
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return value;
  }
}

function getFieldDefaultValue(field: any) {
  if (field?.example !== undefined) {
    return cloneParamValue(field.example);
  }
  if (isComplexInput(field)) {
    return String(field?.type || "").toLowerCase() === "array" ? [] : {};
  }
  if (isBoolInput(field)) return false;
  if (isNumberInput(field)) return null;
  return "";
}

function ensureParamDefaults(template: any) {
  const fields = Array.isArray(template?.inputSchema) ? template.inputSchema : [];
  for (const field of fields) {
    const key = String(field?.key || "").trim();
    if (!key || formParams[key] !== undefined) {
      continue;
    }
    formParams[key] = getFieldDefaultValue(field);
  }
}

function getFieldPlaceholder(field: any) {
  if (field?.placeholder) return String(field.placeholder);
  if (field?.example === undefined) return isComplexInput(field) ? "请输入 JSON" : "请输入";
  return isComplexInput(field)
    ? "可直接修改下方 JSON 示例"
    : `例如: ${stringifyParamValue(field.example)}`;
}

function getComplexFieldRows(field: any) {
  const rows = Number(field?.rows);
  if (Number.isFinite(rows) && rows > 0) {
    return rows;
  }
  if (String(field?.type || "").toLowerCase() === "array" || Array.isArray(field?.example)) {
    return 5;
  }
  return 4;
}

function getComplexFieldTip(field: any) {
  if (field?.helperText) {
    return String(field.helperText);
  }
  if (String(field?.type || "").toLowerCase() === "array" || Array.isArray(field?.example)) {
    return "请输入 JSON 数组，可在示例基础上增删项目。";
  }
  return "请输入 JSON 对象，可直接修改默认示例。";
}

function getParamFieldString(key: string) {
  const value = formParams[key];
  return typeof value === "object" ? stringifyParamValue(value) : String(value ?? "");
}

function getParamFieldNumber(key: string) {
  const value = Number(formParams[key]);
  return Number.isFinite(value) ? value : undefined;
}

function getParamFieldJson(key: string) {
  return stringifyParamValue(formParams[key]);
}

function updateParamField(field: any, rawValue: any) {
  if (isNumberInput(field)) {
    formParams[field.key] = rawValue ?? null;
  } else if (isBoolInput(field)) {
    formParams[field.key] = !!rawValue;
  } else if (isComplexInput(field)) {
    const text = String(rawValue || "").trim();
    if (!text) {
      formParams[field.key] = Array.isArray(field?.example) ? [] : {};
    } else {
      try {
        formParams[field.key] = JSON.parse(text);
      } catch {
        formParams[field.key] = rawValue;
      }
    }
  } else {
    formParams[field.key] = rawValue;
  }
  syncFormToJson();
}

function getTemplateResolution(template: any) {
  if (template?.resolution) return template.resolution;
  if (template?.width && template?.height) return `${template.width}x${template.height}`;
  return "-";
}

function getTemplateOrientationLabel(template: any) {
  const orientation = String(template?.orientation || "").toLowerCase();
  if (orientation === "portrait") return "竖屏";
  if (orientation === "landscape") return "横屏";
  if (orientation === "square") return "方屏";
  const width = Number(template?.width || 0);
  const height = Number(template?.height || 0);
  if (width && height) {
    if (width === height) return "方屏";
    return width > height ? "横屏" : "竖屏";
  }
  return "-";
}

function getTemplateDurationText(template: any) {
  if (template?.durationLabel) return template.durationLabel;
  const seconds = Number(template?.durationSeconds);
  if (Number.isFinite(seconds) && seconds > 0) return `${seconds}s`;
  const frames = Number(template?.durationInFrames || 0);
  const fps = Number(template?.fps || 0);
  if (frames > 0 && fps > 0) return `${Math.round((frames / fps) * 10) / 10}s`;
  return "-";
}

function getTemplateFieldCount(template: any) {
  if (Array.isArray(template?.inputSchema)) return template.inputSchema.length;
  if (Array.isArray(template?.editableFields)) return template.editableFields.length;
  return 0;
}

function getTemplateUseCaseText(template: any) {
  const text = String(template?.useCase || "").trim();
  return text.length > 18 ? `${text.slice(0, 18)}...` : text;
}

// 选择模板
function selectTemplate(template: any) {
  form.templateId = template.id;
  form.title = template.name || "";

  // 初始化表单参数
  Object.keys(formParams).forEach(key => delete formParams[key]);

  if (template.defaultInputProps) {
    Object.assign(formParams, template.defaultInputProps);
    ensureParamDefaults(template);
    syncFormToJson();
  } else {
    ensureParamDefaults(template);
    syncFormToJson();
  }
  if (!Object.keys(formParams).length) {
    form.inputPropsJson = "{}";
  }
  jsonEditError.value = "";
}

// 步骤导航
function goToStep(step: number) {
  // 只允许跳转到已完成的步骤或当前步骤
  if (step <= currentStep.value) {
    currentStep.value = step;
  }
}

// 同步表单和 JSON
function syncFormToJson() {
  try {
    syncingJsonFromForm = true;
    form.inputPropsJson = JSON.stringify(formParams, null, 2);
    jsonEditError.value = "";
  } catch {
    form.inputPropsJson = "{}";
  } finally {
    syncingJsonFromForm = false;
  }
}

function syncJsonToForm() {
  try {
    if (form.inputPropsJson && form.inputPropsJson.trim()) {
      const parsed = JSON.parse(form.inputPropsJson);
      Object.keys(formParams).forEach(key => delete formParams[key]);
      Object.assign(formParams, parsed);
      jsonEditError.value = "";
    }
  } catch (error: any) {
    jsonEditError.value = error?.message || "JSON 格式错误";
  }
}

function handleJsonInput() {
  if (syncingJsonFromForm) return;
  syncJsonToForm();
}

// 监听模式切换
watch(paramsMode, (newMode) => {
  if (newMode === "json") {
    syncFormToJson();
  } else {
    syncJsonToForm();
  }
});

async function loadTemplates() {
  try {
    const result: any = await getRemotionTemplateList({
      keyword: templateSearchKeyword.value || undefined,
      category: templateFilters.category || undefined,
      durationLabel: templateFilters.durationLabel || undefined,
      style: templateFilters.style || undefined,
      useCase: templateFilters.useCase || undefined,
      tag: templateFilters.tag || undefined,
      orientation: templateFilters.orientation || undefined,
      pageSize: 200,
    });
    const list = Array.isArray(result) ? result : result?.list || result?.records || [];
    templateOptions.value = Array.isArray(list) ? list : [];
    templateMeta.total = Number(result?.total ?? templateOptions.value.length) || 0;
    templateMeta.allTotal = Number(result?.allTotal ?? templateMeta.total) || 0;
    templateMeta.filters.categories = Array.isArray(result?.filters?.categories)
      ? result.filters.categories
      : [];
    templateMeta.filters.durationLabels = Array.isArray(result?.filters?.durationLabels)
      ? result.filters.durationLabels
      : [];
    templateMeta.filters.styles = Array.isArray(result?.filters?.styles) ? result.filters.styles : [];
    templateMeta.filters.useCases = Array.isArray(result?.filters?.useCases)
      ? result.filters.useCases
      : [];
    templateMeta.filters.tags = Array.isArray(result?.filters?.tags) ? result.filters.tags : [];
    templateMeta.filters.orientations = Array.isArray(result?.filters?.orientations)
      ? result.filters.orientations
      : [];
  } catch (error: any) {
    templateOptions.value = [];
    templateMeta.total = 0;
    templateMeta.allTotal = 0;
    ElMessage.error(getRemotionErrorMessage(error, "获取 Video Template 模板失败"));
  }
}

async function checkRemotionHealth() {
  await refreshServiceHealth("videoTemplate");
}

function resetTemplateFilters() {
  templateFilters.category = "";
  templateFilters.durationLabel = "";
  templateFilters.style = "";
  templateFilters.useCase = "";
  templateFilters.tag = "";
  templateFilters.orientation = "";
  templateSearchKeyword.value = "";
}

function resetTemplateFiltersAndReload() {
  resetTemplateFilters();
  void loadTemplates();
}

function resetForm() {
  resetTemplateFilters();
  currentStep.value = 0;
  paramsMode.value = "form";
  form.templateId = "";
  form.title = "";
  form.timeoutMs = 300000;
  form.inputProps = {};
  form.inputPropsJson = "{}";
  jsonEditError.value = "";
  Object.keys(formParams).forEach(key => delete formParams[key]);
}

function stopProcessingPoll() {
  if (processingPollTimer) {
    clearTimeout(processingPollTimer);
    processingPollTimer = null;
  }
}

function scheduleProcessingPoll() {
  stopProcessingPoll();
  if (hasConnectedRealtimeChannel()) {
    return;
  }
  const hasPendingRecord = dataSource.value.some((item) => isActiveRecordStatus(item?.status));
  if (!hasPendingRecord) {
    return;
  }
  processingPollTimer = setTimeout(() => {
    void refreshActiveRows();
  }, 3000);
}

function mergeRecordRow(nextRow: any) {
  if (!nextRow?.id) {
    return;
  }

  const targetRow = dataSource.value.find((item) => item.id === nextRow.id);
  if (targetRow) {
    Object.assign(targetRow, nextRow);
  }

  if (currentRow.value?.id === nextRow.id) {
    currentRow.value = {
      ...currentRow.value,
      ...nextRow,
    };
  }
}

function applyRemotionVideoRecordStatusEvent(event: RemotionVideoRecordStatusEvent) {
  const recordId = String(event?.recordId || "").trim();
  if (!recordId) {
    return;
  }

  const currentRowData =
    dataSource.value.find((item) => item.id === recordId) ||
    (currentRow.value?.id === recordId ? currentRow.value : null);

  if (!currentRowData) {
    return;
  }

  const nextStatus = String(event?.status || currentRowData?.status || "").trim();
  if (queryParams.status && nextStatus && queryParams.status !== nextStatus) {
    void getList();
    return;
  }

  const responseData = {
    ...(currentRowData?.responseData || {}),
    ...(typeof event?.progress === "number" ? { progress: event.progress } : {}),
    ...(event?.message ? { message: event.message } : {}),
    ...(event?.reportedAt ? { reportedAt: event.reportedAt } : {}),
    ...(event?.machineCode ? { machineCode: event.machineCode } : {}),
    ...(event?.queueStatus ? { queueStatus: event.queueStatus } : {}),
    ...(typeof event?.queuePosition === "number"
      ? { queuePosition: event.queuePosition }
      : {}),
    ...(typeof event?.queueAheadCount === "number"
      ? { queueAheadCount: event.queueAheadCount }
      : {}),
    ...(typeof event?.queueActiveCount === "number"
      ? { queueActiveCount: event.queueActiveCount }
      : {}),
    ...(typeof event?.queueQueuedCount === "number"
      ? { queueQueuedCount: event.queueQueuedCount }
      : {}),
    ...(typeof event?.queueProcessingCount === "number"
      ? { queueProcessingCount: event.queueProcessingCount }
      : {}),
    ...(event?.localJobStatus ? { localJobStatus: event.localJobStatus } : {}),
    ...(event?.createdAt ? { createdAt: event.createdAt } : {}),
    ...(event?.startedAt ? { startedAt: event.startedAt } : {}),
    ...(event?.completedAt ? { completedAt: event.completedAt } : {}),
    ...(typeof event?.elapsedMs === "number" ? { elapsedMs: event.elapsedMs } : {}),
    clientRuntime: {
      clientId: event.clientId,
      machineCode: event.machineCode || null,
      reportedAt: event.reportedAt || new Date().toISOString(),
    },
  };

  mergeRecordRow({
    id: recordId,
    status: nextStatus || currentRowData?.status,
    remotionJobId: event?.remotionJobId ?? currentRowData?.remotionJobId ?? null,
    remotionVideoUrl: event?.remotionVideoUrl ?? currentRowData?.remotionVideoUrl ?? null,
    resultUrl: event?.resultUrl ?? currentRowData?.resultUrl ?? null,
    url: event?.url ?? currentRowData?.url ?? null,
    errorMessage:
      event?.errorMessage ??
      (nextStatus === "failed"
        ? event?.message || currentRowData?.errorMessage || null
        : (currentRowData?.errorMessage ?? null)),
    responseData,
  });

  if (!hasConnectedRealtimeChannel()) {
    scheduleProcessingPoll();
  }
}

async function refreshActiveRows() {
  stopProcessingPoll();
  const activeIds = dataSource.value
    .filter((item) => isActiveRecordStatus(item?.status))
    .map((item) => String(item?.id || ""))
    .filter(Boolean);

  if (!activeIds.length) {
    return;
  }

  try {
    const resultList = await Promise.allSettled(
      activeIds.map((recordId) => getRemotionVideoRecordDetail(recordId)),
    );

    resultList.forEach((result) => {
      if (result.status === "fulfilled") {
        mergeRecordRow(result.value);
      }
    });
  } finally {
    scheduleProcessingPoll();
  }
}

function handleTemplateFilterChange() {
  if (templateSearchTimer) {
    clearTimeout(templateSearchTimer);
  }
  templateSearchTimer = setTimeout(async () => {
    await loadTemplates();
    if (!form.templateId) return;
    const stillVisible = filteredTemplateOptions.value.some((item) => item.id === form.templateId);
    if (!stillVisible) {
      form.templateId = "";
      form.inputProps = {};
      form.inputPropsJson = "{}";
    }
  }, 250);
}

function handleTemplateChange() {
  form.inputProps = selectedTemplate.value?.defaultInputProps
    ? { ...selectedTemplate.value.defaultInputProps }
    : {};
  try {
    form.inputPropsJson = selectedTemplate.value?.defaultInputProps
      ? JSON.stringify(selectedTemplate.value.defaultInputProps, null, 2)
      : "{}";
  } catch {
    form.inputPropsJson = "{}";
  }
  if (!form.title) {
    form.title = selectedTemplate.value?.name || "";
  }
}

function openCreateDialog(row?: any) {
  createVisible.value = true;
  currentStep.value = 0;
  paramsMode.value = "form";

  if (!row) {
    resetForm();
    void Promise.allSettled([loadTemplates(), checkRemotionHealth()]);
    return;
  }

  void Promise.allSettled([loadTemplates(), checkRemotionHealth()]);

  resetTemplateFilters();
  form.templateId = row.templateId || "";
  form.title = row.title || "";
  form.timeoutMs = 300000;
  form.inputProps = row.inputProps ? JSON.parse(JSON.stringify(row.inputProps)) : {};
  try {
    form.inputPropsJson = row.inputProps ? JSON.stringify(row.inputProps, null, 2) : "{}";
  } catch {
    form.inputPropsJson = "{}";
  }

  // 初始化表单参数
  Object.keys(formParams).forEach(key => delete formParams[key]);
  if (form.inputProps) {
    Object.assign(formParams, form.inputProps);
  }
}

function openAiGenerateDialog() {
  aiGenerateVisible.value = true;
  aiSubmitResult.value = null;
  aiForm.value = {
    mode: 'ai-free-generate',
    prompt: '',
  };
}

async function submitAiGenerate() {
  if (!aiForm.value.prompt) return;
  
  aiSubmitting.value = true;
  aiSubmitResult.value = null;
  
  try {
    const result: any = await aiGenerateRemotionVideoRecord({
      action: aiForm.value.mode,
      prompt: aiForm.value.prompt,
    });
    
    if (result.success) {
      aiSubmitResult.value = {
        success: true,
        jobId: result.jobId,
        recordId: result.recordId,
        templateUsed: result.templateUsed,
        sceneCount: result.sceneCount,
        totalDuration: result.totalDuration,
        mode: result.mode,
      };
      getList();
    } else {
      aiSubmitResult.value = {
        success: false,
        error: result.error || '提交失败',
      };
    }
  } catch (error: any) {
    aiSubmitResult.value = {
      success: false,
      error: error.message || '网络错误',
    };
  } finally {
    aiSubmitting.value = false;
  }
}

async function submitGenerate() {
  if (!form.templateId) {
    ElMessage.warning("请先选择模板");
    return;
  }
  submitLoading.value = true;
  try {
    await checkRemotionHealth();
    if (remotionStatus.checked && !remotionStatus.available) {
      ElMessage.error(
        remotionStatus.message || "未检测到可用的视频制作客户端，请先启动客户端并登录当前账号",
      );
      return;
    }

    let inputPropsToSend: Record<string, any> = {};

    if (form.inputPropsJson && String(form.inputPropsJson).trim()) {
      try {
        inputPropsToSend = JSON.parse(form.inputPropsJson);
      } catch (e: any) {
        jsonEditError.value = e?.message || "JSON 格式错误";
        ElMessage.error("参数 JSON 格式不正确");
        submitLoading.value = false;
        return;
      }
    }

    // 如果都为空，使用默认参数
    if (Object.keys(inputPropsToSend).length === 0 && selectedTemplate.value?.defaultInputProps) {
      inputPropsToSend = { ...selectedTemplate.value.defaultInputProps };
    }

    const result: any = await generateRemotionVideoRecord({
      templateId: form.templateId,
      title: form.title || undefined,
      timeoutMs: Number(form.timeoutMs || 300000),
      inputProps: inputPropsToSend,
    });

    if (result?.status === "failed") {
      ElMessage.error(result?.errorMessage || "视频制作任务提交失败");
      await getList();
      return;
    }

    ElMessage.success("已提交制作任务，正在后台生成");
    createVisible.value = false;
    resetForm();
    await getList();
  } catch (error: any) {
    ElMessage.error(getRemotionErrorMessage(error, "视频生成失败"));
  } finally {
    submitLoading.value = false;
  }
}

function getRemotionErrorMessage(error: any, fallback: string) {
  const raw = String(error?.message || error || "").trim();
  const lower = raw.toLowerCase();

  if (!raw) return fallback;
  if (lower.includes("connection refused") || lower.includes("econnrefused")) {
    return "服务未启动";
  }
  if (lower.includes("network error")) {
    return "网络异常";
  }
  if (lower.includes("timeout")) {
    return "请求超时";
  }
  if (lower.includes("not found")) {
    return "接口不存在";
  }
  if (lower.includes("remotion") || lower.includes("video-template")) {
    return "Video Template 服务异常";
  }
  return raw || fallback;
}

async function getList() {
  stopProcessingPoll();
  loading.value = true;
  try {
    const result: any = await getRemotionVideoRecordPage({ ...queryParams });
    dataSource.value = result?.list || result?.records || [];
    total.value = result?.total || 0;
  } catch (error: any) {
    dataSource.value = [];
    total.value = 0;
    ElMessage.error(error?.message || "获取视频生成记录失败");
  } finally {
    loading.value = false;
    scheduleProcessingPoll();
  }
}

async function openDetail(row: any) {
  const result: any = await getRemotionVideoRecordDetail(row.id);
  currentRow.value = result;
  detailVisible.value = true;
}

function previewVideo(row: any) {
  if (!row?.url) return;
  previewUrl.value = row.url;
  previewVisible.value = true;
}

async function handleDelete(row: any) {
  try {
    await ElMessageBox.confirm(`确认删除记录「${row.title || row.id}」吗？`, "删除确认", {
      type: "warning",
    });
    await deleteRemotionVideoRecord(row.id);
    ElMessage.success("删除成功");
    await getList();
  } catch (error: any) {
    if (error !== "cancel") {
      ElMessage.error(error?.message || "删除视频记录失败");
    }
  }
}

function handleOperationCommand(command: string, row: any) {
  if (command === "detail") {
    openDetail(row);
    return;
  }
  // 'regenerate' action removed
  if (command === "delete") {
    handleDelete(row);
  }
}

onMounted(async () => {
  websocketClient.events.on("remotionVideoRecordStatus", applyRemotionVideoRecordStatusEvent);
  resetForm();
  await Promise.allSettled([loadTemplates(), getList(), checkRemotionHealth()]);
});

onBeforeUnmount(() => {
  websocketClient.events.off("remotionVideoRecordStatus", applyRemotionVideoRecordStatusEvent);
  stopProcessingPoll();
  if (templateSearchTimer) {
    clearTimeout(templateSearchTimer);
    templateSearchTimer = null;
  }
});

watch(
  () => websocketClient.state.status,
  async (status, oldStatus) => {
    if (status === "connected") {
      stopProcessingPoll();
      // WebSocket 新连接时重新加载模板（服务可能是后来启动的）
      if (oldStatus !== "connected" && templateOptions.value.length === 0) {
        await loadTemplates();
      }
      return;
    }

    scheduleProcessingPoll();
  },
);
</script>

<style scoped>


@media (width <= 1280px) {
  .remotion-record-page__status-content {
    max-width: none;
  }

  .remotion-detail-layout {
    grid-template-columns: 1fr;
    grid-template-rows: minmax(360px, 50vh) minmax(0, 1fr);
  }
}

@media (width <= 900px) {
  .remotion-record-page__status-bar {
    flex-direction: column;
    align-items: stretch;
    gap: 6px;
  }

  .remotion-record-page__status-content {
    max-width: none;
  }

  .cell-video-player,
  .cell-video-wrapper {
    width: 140px;
    height: 79px;
  }

  .template-grid {
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  }
}

@media (width <= 768px) {
  :deep(.remotion-record-page .list-page-search-form__row) {
    row-gap: 0;
  }

  :deep(.remotion-record-page .list-page-search-form__actions) {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
    width: 100%;
  }

  :deep(.remotion-record-page .list-page-search-form__actions .el-button) {
    width: 100%;
    margin: 0;
  }

  .remotion-record-page__status-text,
  .remotion-record-page__status-detail {
    white-space: nowrap;
  }

  .template-filter-bar {
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
  }

  .template-filter-controls {
    flex-direction: column;
  }

  .filter-select,
  .filter-search {
    width: 100%;
    min-width: 0;
    flex: 0 0 auto;
  }

  .template-filter-summary {
    justify-content: space-between;
    width: 100%;
  }

  .remotion-steps {
    flex: 1 1 auto;
    justify-content: flex-start;
    overflow-x: auto;
  }

  .remotion-dialog-toolbar {
    flex-wrap: wrap;
    align-items: flex-start;
    gap: 8px;
  }

  .remotion-dialog-actions {
    width: 100%;
  }

  .remotion-step-item {
    min-width: 96px;
    padding: 0 8px;
  }

  .remotion-step-icon {
    width: 18px;
    height: 18px;
    font-size: 10px;
  }

  .remotion-step-label {
    font-size: 11px;
  }

  .template-grid {
    grid-template-columns: 1fr;
    max-height: 360px;
  }

  .params-editor-layout {
    grid-template-columns: 1fr;
    overflow: auto;
  }

  .params-form,
  .params-json {
    min-height: 0;
    overflow: auto;
  }

  .json-editor {
    min-height: 320px;
  }

  .template-card {
    min-height: 0;
  }

  :deep(.remotion-create-dialog .el-dialog__body) {
    height: calc(100vh - 70px);
    max-height: none;
    padding: 0 16px 16px;
  }

  .remotion-detail-layout {
    height: auto;
    grid-template-columns: 1fr;
    grid-template-rows: auto;
    gap: 12px;
  }

  .remotion-detail-side {
    grid-template-rows: auto;
    gap: 12px;
  }

  .remotion-video-preview {
    min-height: 220px;
    padding: 8px;
  }

  .confirm-grid {
    grid-template-columns: 1fr;
  }
}

@media (width <= 480px) {
  :deep(.remotion-record-page .list-page-search-form__actions) {
    grid-template-columns: 1fr;
  }

  .remotion-record-page__status-bar {
    min-height: 0;
  }

  .cell-video-player,
  .cell-video-wrapper {
    width: 120px;
    height: 68px;
  }

  .record-title-main,
  .record-template-main {
    font-size: 13px;
  }

  .record-id,
  .record-template-id,
  .table-time-text {
    font-size: 11px;
  }

  .remotion-video-preview {
    min-height: 180px;
  }

  .remotion-step-item {
    min-width: 92px;
    padding: 0 8px;
  }

  .remotion-step-icon {
    width: 18px;
    height: 18px;
    font-size: 10px;
  }

  .remotion-step-label {
    font-size: 11px;
  }
}

:deep(.remotion-record-page) {
  gap: 10px;
  padding: 8px 0 0;
}

:deep(.remotion-record-page .list-page-layout__main) {
  gap: 10px;
}

:deep(.remotion-record-page .list-page-filter--flat) {
  gap: 10px;
  padding-bottom: 10px;
}

:deep(.remotion-record-page .list-page-table-panel__pagination--flat) {
  padding-top: 10px;
}

.remotion-record-page__status-bar {
  display: flex;
  width: 100%;
  min-height: 40px;
  align-items: flex-start;
  gap: 10px;
}

.remotion-record-page__status-content {
  display: flex;
  max-width: 360px;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 2px;
}

.remotion-record-page__status-text {
  display: block;
  max-width: 100%;
  min-width: 0;
  overflow: hidden;
  font-size: 12px;
  line-height: 1.5;
  color: var(--el-text-color-primary);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.remotion-record-page__status-detail {
  display: block;
  max-width: 100%;
  min-width: 0;
  overflow: hidden;
  font-size: 12px;
  line-height: 1.4;
  color: var(--el-text-color-secondary);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.record-title-cell,
.record-template-cell,
.record-video-cell,
.record-progress-cell,
.detail-section {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.record-progress-placeholder,
.record-progress-message {
  font-size: 10px;
  line-height: 1.4;
  color: var(--el-text-color-secondary);
  word-break: break-word;
}

.record-progress-message {
  min-height: 14px;
}

.record-progress-cell :deep(.el-progress) {
  align-items: center;
  gap: 6px;
  width: 100%;
}

.record-progress-cell :deep(.el-progress-bar) {
  width: 100%;
  background-color: var(--el-fill-color-dark);
  border-radius: 999px;
}

.record-progress-cell :deep(.el-progress-bar__outer) {
  background-color: var(--el-fill-color-darker);
  border-radius: 999px;
}

.record-progress-cell :deep(.el-progress-bar__inner) {
  border-radius: 999px;
}

.record-progress-cell :deep(.el-progress__text) {
  min-width: 28px;
  font-size: 10px !important;
  font-weight: 500;
  color: var(--el-text-color-secondary);
}

.record-title-text,
.record-template-name,
.template-summary-name {
  font-weight: 500;
  color: var(--el-text-color-primary);
  word-break: break-word;
}

.record-title-sub,
.record-template-id,
.template-summary-desc,
.template-summary-meta {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

/* 分步向导样式 */
.remotion-dialog-toolbar {
  display: flex;
  padding: 8px 0 10px;
  margin-bottom: 12px;
  border-bottom: 1px solid var(--el-border-color-lighter);
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex: 0 0 auto;
}

.remotion-steps {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.remotion-dialog-actions {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
}

.remotion-dialog-actions .el-button {
  min-width: 78px;
}

.remotion-step-item {
  position: relative;
  display: flex;
  height: 30px;
  min-width: 110px;
  padding: 0 10px;
  cursor: pointer;
  background: var(--el-fill-color-blank);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 999px;
  flex-direction: row;
  align-items: center;
  gap: 6px;
}

.remotion-step-active {
  background: var(--el-color-primary-light-9);
  border-color: var(--el-color-primary-light-5);
}

.remotion-step-icon {
  display: flex;
  width: 20px;
  height: 20px;
  font-size: 11px;
  font-weight: 600;
  color: var(--el-text-color-secondary);
  background: var(--el-fill-color);
  border-radius: 50%;
  transition: all 0.3s;
  align-items: center;
  justify-content: center;
}

.remotion-step-active .remotion-step-icon {
  color: #fff;
  background: var(--el-color-primary);
}

.remotion-step-done .remotion-step-icon {
  color: #fff;
  background: var(--el-color-success);
}

.remotion-step-label {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  white-space: nowrap;
  transition: color 0.3s;
}

.remotion-step-active .remotion-step-label {
  font-weight: 500;
  color: var(--el-color-primary);
}

.remotion-step-done .remotion-step-label {
  color: var(--el-color-success);
}

.remotion-step-content {
  flex: 1;
  min-height: 0;
  overflow: auto;
}

.remotion-step-panel {
  height: 100%;
  min-height: 0;
  padding: 0 10px 2px;
  overflow: visible;
  box-sizing: border-box;
}

.remotion-step-panel:not(:first-child) {
  display: flex;
  flex-direction: column;
}

.remotion-step-panel:first-child {
  display: flex;
  flex-direction: column;
}

/* 模板筛选栏 */
.template-filter-bar {
  display: flex;
  padding: 0 0 10px;
  margin-bottom: 10px;
  border-bottom: 1px solid var(--el-border-color-lighter);
  flex: 0 0 auto;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}

.template-filter-controls {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-wrap: wrap;
  gap: 8px;
}

.filter-select {
  width: 132px;
  flex: 0 0 132px;
}

.filter-select--compact {
  width: 92px;
  flex-basis: 92px;
}

.filter-select--wide {
  width: 170px;
  flex-basis: 170px;
}

.filter-search {
  flex: 1 1 260px;
  min-width: 220px;
}

.template-filter-reset {
  flex: 0 0 auto;
  height: 32px;
  padding: 0 12px;
}

.template-filter-summary {
  display: inline-flex;
  font-size: 12px;
  line-height: 1;
  color: var(--el-text-color-secondary);
  white-space: nowrap;
  flex: 0 0 auto;
  align-items: center;
  gap: 10px;
}

/* 模板分类容器 */
.template-categories {
  display: flex;
  max-height: calc(100vh - 158px);
  min-height: 0;
  padding: 2px 6px 2px 0;
  overflow-y: auto;
  flex: 1 1 auto;
  flex-direction: column;
  gap: 20px;
}

.template-category-header {
  display: flex;
  padding-bottom: 6px;
  margin-bottom: 10px;
  border-bottom: 1px solid var(--el-border-color-lighter);
  align-items: center;
  gap: 10px;
}

.template-category-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.template-category-count {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.template-grid-empty {
  flex: 1 1 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 260px;
  border: 1px dashed var(--el-border-color);
  border-radius: 8px;
}

/* 模板卡片网格 */
.template-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 8px;
}

.template-card {
  position: relative;
  display: flex;
  padding: 10px 12px;
  cursor: pointer;
  background: var(--el-fill-color-blank);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  transition: border-color 0.16s ease, background-color 0.16s ease;
  flex-direction: column;
  gap: 6px;
}

.template-card:hover {
  background: var(--el-color-primary-light-9);
  border-color: var(--el-color-primary-light-5);
}

.template-card-selected {
  background: var(--el-color-primary-light-9);
  border-color: var(--el-color-primary);
}

.template-card-selected::after {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 6px;
  height: 6px;
  background: var(--el-color-primary);
  border-radius: 50%;
  content: "";
}

.template-card-name {
  overflow: hidden;
  font-size: 13px;
  font-weight: 600;
  line-height: 1.35;
  color: var(--el-text-color-primary);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.template-card-desc {
  display: -webkit-box;
  overflow: hidden;
  font-size: 12px;
  line-height: 1.45;
  color: var(--el-text-color-secondary);
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.template-card-specs {
  display: grid;
  overflow: hidden;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 6px;
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.template-spec {
  min-width: 0;
  padding: 6px 4px;
  text-align: center;
  background: var(--el-fill-color-light);
  border-right: 1px solid var(--el-border-color-lighter);
}

.template-spec:last-child {
  border-right: 0;
}

.template-spec-label {
  display: block;
  margin-bottom: 3px;
  font-size: 11px;
  line-height: 1;
  color: var(--el-text-color-placeholder);
}

.template-spec strong {
  display: block;
  overflow: hidden;
  font-size: 11px;
  font-weight: 600;
  line-height: 1.2;
  color: var(--el-text-color-primary);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.template-card-meta {
  display: flex;
  min-height: 18px;
  overflow: hidden;
  font-size: 11px;
  line-height: 1.2;
  color: var(--el-text-color-secondary);
  white-space: nowrap;
  align-items: center;
  gap: 6px;
}

.meta-tag {
  overflow: hidden;
  font-weight: 500;
  color: var(--el-text-color-regular);
  text-overflow: ellipsis;
}

.meta-dot {
  width: 3px;
  height: 3px;
  background: var(--el-border-color);
  border-radius: 50%;
  flex: 0 0 auto;
}

.template-card-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  min-height: 18px;
}

.template-tag {
  display: inline-flex;
  height: 18px;
  max-width: 96px;
  padding: 0;
  overflow: hidden;
  font-size: 11px;
  line-height: 1;
  color: var(--el-text-color-secondary);
  text-overflow: ellipsis;
  white-space: nowrap;
  background: transparent;
  border-radius: 4px;
  align-items: center;
}

.template-tag--more {
  color: var(--el-text-color-secondary);
}

/* 视频预览弹窗 */
.preview-video-wrapper {
  display: flex;
  overflow: hidden;
  background: #000;
  border-radius: 4px;
  justify-content: center;
}

.preview-video-player {
  display: block;
  width: 100%;
  max-height: 460px;
}

.record-video-cell .cell-video-wrapper {
  cursor: pointer;
}

.record-video-cell .cell-video-player:hover {
  opacity: 0.85;
}

/* 参数面板 */
.params-panel {
  display: flex;
  flex-direction: column;
  min-height: 0;
  gap: 10px;
}

.params-header {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.params-template-name {
  font-size: 16px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.params-editor-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.05fr) minmax(360px, 0.95fr);
  gap: 14px;
  min-height: 0;
  padding: 2px 6px 6px;
  align-items: start;
  box-sizing: border-box;
}

.params-form {
  min-width: 0;
  min-height: 0;
  padding: 4px 8px 10px 4px;
  overflow: auto;
  box-sizing: border-box;
  scrollbar-gutter: stable;
}

.params-form :deep(.el-form-item) {
  margin-bottom: 10px;
}

.param-example {
  margin-top: 4px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.param-example code {
  padding: 2px 6px;
  font-family: Consolas, Monaco, monospace;
  font-size: 11px;
  background: var(--el-fill-color);
  border-radius: 4px;
}

.param-json-tip {
  margin-top: 5px;
  font-size: 12px;
  line-height: 1.4;
  color: var(--el-text-color-secondary);
}

.params-json {
  display: flex;
  min-width: 0;
  min-height: 0;
  padding: 4px 6px 10px 4px;
  overflow: auto;
  box-sizing: border-box;
  flex-direction: column;
}

.json-editor {
  flex: 1 1 auto;
  min-height: 0;
  margin-bottom: 0;
}

.json-editor :deep(.el-textarea),
.json-editor :deep(.el-textarea__inner) {
  height: 100%;
}

.params-form :deep(.el-input),
.params-form :deep(.el-input-number),
.params-form :deep(.el-textarea),
.params-json :deep(.el-textarea) {
  padding: 2px;
  margin: -2px;
}

.params-json-header {
  display: flex;
  margin-bottom: 8px;
  font-size: 13px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.json-hint {
  font-size: 12px;
  font-weight: 400;
  color: var(--el-text-color-secondary);
}

.json-hint--error {
  color: var(--el-color-danger);
}

/* 确认面板 */
.confirm-panel {
  display: flex;
  max-height: calc(100vh - 150px);
  min-height: 0;
  padding-right: 4px;
  overflow: auto;
  flex-direction: column;
  gap: 20px;
}

.confirm-section {
  padding: 16px;
  background: var(--el-fill-color-light);
  border-radius: 8px;
}

.confirm-title {
  padding-bottom: 8px;
  margin-bottom: 12px;
  font-size: 14px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.confirm-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.confirm-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.confirm-label {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.confirm-value {
  font-size: 14px;
  font-weight: 500;
  color: var(--el-text-color-primary);
}

.confirm-params {
  max-height: 200px;
  overflow-y: auto;
}

.confirm-params pre {
  padding: 12px;
  margin: 0;
  font-family: Consolas, Monaco, monospace;
  font-size: 12px;
  line-height: 1.6;
  word-break: break-word;
  white-space: pre-wrap;
  background: var(--el-fill-color);
  border-radius: 6px;
}

/* 创建对话框 - 全屏模式 */
:deep(.remotion-create-dialog .el-dialog__body) {
  display: flex;
  height: calc(100vh - 70px);
  padding: 0 24px 18px;
  overflow: auto;
  flex-direction: column;
}

:deep(.remotion-create-dialog .el-dialog__header) {
  padding: 16px 24px 0;
  margin-right: 0;
}

.remotion-step-content {
  flex: 1;
  min-height: 0;
  overflow: auto;
}

/* 全屏模式下模板网格自适应 */
.template-grid {
  display: grid;
  max-height: calc(100vh - 158px);
  min-height: 0;
  padding: 2px 6px 2px 0;
  overflow-y: auto;
  flex: 1 1 auto;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 8px;
}

.remotion-detail-layout {
  display: grid;
  height: calc(100vh - 56px);
  grid-template-columns: minmax(0, 1.4fr) minmax(360px, 0.9fr);
  gap: 16px;
}

:deep(.remotion-detail-dialog .el-dialog__body) {
  padding: 16px 20px 20px;
  overflow: hidden;
}

.remotion-detail-side {
  display: grid;
  grid-template-rows: minmax(0, 1fr) minmax(0, 1fr);
  gap: 16px;
}

.remotion-detail-layout > .el-card,
.remotion-detail-side > .el-card {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

:deep(.remotion-detail-layout > .el-card .el-card__body),
:deep(.remotion-detail-side > .el-card .el-card__body) {
  display: flex;
  min-height: 0;
  overflow: hidden;
  flex: 1 1 auto;
  flex-direction: column;
}

.remotion-video-preview {
  display: flex;
  width: 100%;
  height: 100%;
  padding: 12px;
  background: #000;
  border-radius: 12px;
  align-items: center;
  justify-content: center;
}

.remotion-video-player {
  width: 100%;
  height: 100%;
  background: #000;
  border-radius: 8px;
  object-fit: contain;
}

.cell-video-player {
  width: 160px;
  height: 90px;
  background: #000;
  border-radius: 6px;
  object-fit: cover;
}

.cell-video-wrapper {
  position: relative;
  display: inline-flex;
  width: 160px;
  height: 90px;
  overflow: hidden;
  background: rgb(15 23 42 / 4%);
  border-radius: 6px;
  align-items: center;
  justify-content: center;
}

.cell-video-placeholder {
  display: inline-flex;
  width: 100%;
  height: 100%;
  font-size: 12px;
  line-height: 1;
  color: var(--el-text-color-secondary);
  align-items: center;
  justify-content: center;
}

.cell-video-wrapper {
  cursor: pointer;
}

.cell-video-wrapper:hover .cell-video-player {
  opacity: 0.85;
}

.detail-json-panel pre {
  margin: 0;
  font-family: Consolas, Monaco, monospace;
  font-size: 12px;
  line-height: 1.7;
  word-break: break-word;
  white-space: pre-wrap;
}

/* AI 生成对话框样式 */
</style>
