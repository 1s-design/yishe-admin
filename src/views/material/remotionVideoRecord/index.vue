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
              <el-button size="small" type="primary" plain @click="router.push('/content/remotion-skill')">
                视频模版skill
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
                  <el-tag :type="getStatusTagType(row.status)" size="small">{{
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
                    <div
                      class="cell-video-wrapper"
                      :class="getVideoRatioClass(row)"
                      :title="hasPlayableVideo(row) ? '点击预览视频' : ''"
                      @click.stop="previewVideo(row)"
                    >
                      <template v-if="hasPlayableVideo(row)">
                        <video
                          :src="resolveRecordVideoUrl(row)"
                          preload="metadata"
                          class="cell-video-player"
                          muted
                          playsinline
                          :controls="false"
                        ></video>
                        <div class="cell-video-hover-badge">
                          <el-icon class="cell-video-play-icon"><VideoPlay /></el-icon>
                        </div>
                      </template>
                      <span v-else class="cell-video-placeholder">-</span>
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
                          <el-dropdown-item
                            v-if="hasPlayableVideo(row)"
                            command="preview"
                          >
                            {{ t('remotionVideoRecord.videoPreview') }}
                          </el-dropdown-item>
                          <el-dropdown-item
                            v-if="row.responseData?.prompt || row.inputProps?.prompt"
                            command="recreate"
                          >
                            基于此提示词创作
                          </el-dropdown-item>
                          <el-dropdown-item
                            v-if="canRetryRecord(row)"
                            command="retry"
                          >
                            重试任务
                          </el-dropdown-item>
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
                <div class="template-card-header-row">
                  <span class="template-card-tag">{{ getTemplateOrientationLabel(template) }}</span>
                  <span v-if="form.templateId === template.id" class="template-card-selected-badge">
                    <el-icon><Check /></el-icon>
                  </span>
                </div>
                <div class="template-card-name">{{ getTemplateLocalName(template) }}</div>
                <div class="template-card-desc">{{ getTemplateLocalDesc(template) }}</div>
                <div class="template-card-meta">
                  <span class="template-card-duration">{{ getTemplateDurationText(template) }}</span>
                  <span class="meta-dot"></span>
                  <span class="template-card-fps">{{ template.fps || 30 }}fps</span>
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
            <div class="params-header-info">
              <span class="params-template-name">{{ selectedTemplate.name }}</span>
              <el-tag size="small" type="primary" class="params-header-tag">{{ getTemplateOrientationLabel(selectedTemplate) }}</el-tag>
              <el-tag size="small" type="info" class="params-header-tag">{{ selectedTemplate.durationLabel || getTemplateDurationText(selectedTemplate) }}</el-tag>
              <span class="params-template-id">ID: {{ selectedTemplate.id }}</span>
            </div>
            <el-button type="primary" link @click="currentStep = 0">
              {{ t('remotionVideoRecord.reselect') }}
            </el-button>
          </div>

          <div class="params-editor-layout">
            <div class="params-card params-card--form">
              <div class="params-card-header">
                <div class="params-card-header-left">
                  <span class="params-card-title">表单参数配置</span>
                  <span class="params-card-subtitle">按字段可视化修改</span>
                </div>
              </div>
              <div class="params-form">
                <el-form
                  v-if="selectedTemplate.inputSchema && selectedTemplate.inputSchema.length"
                  label-position="top"
                  label-width="auto"
                  class="params-el-form"
                >
                  <el-form-item
                    v-for="field in selectedTemplate.inputSchema"
                    :key="field.key"
                    :label="field.label || field.key"
                    :required="field.required"
                    class="param-form-item"
                  >
                    <template #label>
                      <span class="param-label-text">{{ field.label || field.key }}</span>
                      <el-tooltip v-if="field.description" :content="field.description" placement="top">
                        <el-icon class="param-help-icon"><QuestionFilled /></el-icon>
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
                      class="param-textarea"
                      @update:model-value="(value) => updateParamField(field, value)"
                    />
                    <div v-if="isComplexInput(field)" class="param-json-tip">
                      <el-icon class="param-tip-icon"><QuestionFilled /></el-icon>
                      <span>{{ getComplexFieldTip(field) }}</span>
                    </div>
                  </el-form-item>
                </el-form>
                <el-empty v-else :description="t('remotionVideoRecord.noParamFields')" :image-size="80" />
              </div>
            </div>

            <div class="params-card params-card--json">
              <div class="params-card-header">
                <div class="params-card-header-left">
                  <span class="params-card-title">{{ t('remotionVideoRecord.jsonParams') }}</span>
                  <span class="json-hint" :class="{ 'json-hint--error': !!jsonEditError }">
                    {{ jsonEditError || t('remotionVideoRecord.jsonSyncTip') }}
                  </span>
                </div>
              </div>
              <div class="params-json-body">
                <el-input
                  type="textarea"
                  v-model="form.inputPropsJson"
                  resize="none"
                  class="json-editor"
                  :placeholder="t('remotionVideoRecord.inputJsonPlaceholder')"
                  @input="handleJsonInput"
                />
              </div>
            </div>
          </div>
        </div>
        <el-empty v-else :description="t('remotionVideoRecord.selectTemplateFirst')" />
      </div>

      <!-- 步骤3: 确认提交 -->
      <div v-show="currentStep === 2" class="remotion-step-panel">
        <div v-if="selectedTemplate" class="confirm-panel">
          <div class="confirm-section">
            <div class="confirm-title">
              <span class="confirm-title-indicator"></span>
              <span>{{ t('remotionVideoRecord.templateInfo') }}</span>
            </div>
            <div class="confirm-grid">
              <div class="confirm-item">
                <span class="confirm-label">{{ t('remotionVideoRecord.templateName') }}</span>
                <span class="confirm-value">{{ selectedTemplate.name }}</span>
              </div>
              <div class="confirm-item">
                <span class="confirm-label">{{ t('remotionVideoRecord.resolution') }}</span>
                <span class="confirm-value">{{ selectedTemplate.width }} × {{ selectedTemplate.height }}</span>
              </div>
              <div class="confirm-item">
                <span class="confirm-label">{{ t('remotionVideoRecord.duration') }}</span>
                <span class="confirm-value">{{ selectedTemplate.durationLabel || '-' }}</span>
              </div>
              <div class="confirm-item">
                <span class="confirm-label">{{ t('remotionVideoRecord.fps') }}</span>
                <span class="confirm-value">{{ selectedTemplate.fps }} fps</span>
              </div>
            </div>
          </div>

          <div class="confirm-section">
            <div class="confirm-title">
              <span class="confirm-title-indicator"></span>
              <span>{{ t('remotionVideoRecord.inputParams') }}</span>
            </div>
            <div class="confirm-params">
              <pre>{{ displayParamsJson }}</pre>
            </div>
          </div>

          <div class="confirm-section">
            <div class="confirm-title">
              <span class="confirm-title-indicator"></span>
              <span>{{ t('remotionVideoRecord.taskSettings') }}</span>
            </div>
            <el-form label-position="top" class="confirm-form">
              <el-row :gutter="16">
                <el-col :xs="24" :sm="14">
                  <el-form-item :label="t('remotionVideoRecord.recordTitleOptional')">
                    <el-input v-model="form.title" :placeholder="t('remotionVideoRecord.titlePlaceholderDetail')" clearable />
                  </el-form-item>
                </el-col>
                <el-col :xs="24" :sm="10">
                  <el-form-item :label="t('remotionVideoRecord.timeoutMs')">
                    <el-input-number
                      v-model="form.timeoutMs"
                      :min="1000"
                      :max="900000"
                      :step="1000"
                      class="w-full"
                    />
                  </el-form-item>
                </el-col>
              </el-row>
            </el-form>
          </div>

          <el-alert
            v-if="remotionStatus.checked && !remotionStatus.available"
            type="error"
            :closable="false"
            show-icon
            :title="t('remotionVideoRecord.clientNotDetected')"
            :description="remotionStatus.message || t('remotionVideoRecord.clientLoginTip')"
            class="confirm-alert"
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
    <div v-if="currentRow" class="detail-layout">
      <!-- 左侧：视频预览 -->
      <div class="detail-video-area">
        <video
          v-if="hasPlayableVideo(currentRow)"
          :src="resolveRecordVideoUrl(currentRow)"
          controls
          class="detail-video"
        ></video>
        <el-empty v-else :description="t('remotionVideoRecord.noVideoResult')" :image-size="96" />
      </div>

      <!-- 右侧：信息面板 (可滚动) -->
      <div class="detail-info">
        <div class="detail-block">
          <div class="detail-block-title">基本信息</div>
          <div class="detail-info-list">
            <div class="detail-info-item">
              <span class="detail-info-label">标题</span>
              <span class="detail-info-value">{{ currentRow.title || "-" }}</span>
            </div>
            <div class="detail-info-item">
              <span class="detail-info-label">模板</span>
              <span class="detail-info-value">
                <el-tag
                  v-if="currentRow.templateName === '自由创作' || currentRow.templateId === 'ai-universal'"
                  type="warning"
                  size="small"
                >{{ t('remotionVideoRecord.freeCreation') }}</el-tag>
                <span v-else>{{ currentRow.templateName || currentRow.templateId }}</span>
              </span>
            </div>
            <div class="detail-info-item">
              <span class="detail-info-label">上传者</span>
              <span class="detail-info-value">{{ currentRow.uploader?.name || currentRow.uploader?.account || (currentRow.userId ? `用户 #${currentRow.userId}` : "-") }}</span>
            </div>
            <div class="detail-info-item">
              <span class="detail-info-label">状态</span>
              <span class="detail-info-value">{{ getStatusLabel(currentRow.status) }}</span>
            </div>
            <div class="detail-info-item">
              <span class="detail-info-label">进度</span>
              <span class="detail-info-value">{{ getProgressDisplayText(currentRow) }}</span>
            </div>
            <div class="detail-info-item">
              <span class="detail-info-label">创建时间</span>
              <span class="detail-info-value">{{ formatTimestamp(currentRow.createTime) }}</span>
            </div>
            <div v-if="resolveRecordMachineCode(currentRow)" class="detail-info-item">
              <span class="detail-info-label">机器码</span>
              <span class="detail-info-value">{{ resolveRecordMachineCode(currentRow) }}</span>
            </div>
            <div v-if="currentRow.errorMessage" class="detail-info-item">
              <span class="detail-info-label">错误信息</span>
              <span class="detail-info-value detail-info-error">{{ currentRow.errorMessage }}</span>
            </div>
          </div>
        </div>

        <div v-if="currentRow.responseData?.prompt || currentRow.inputProps?.prompt" class="detail-block">
          <div class="detail-block-title">
            <span>AI 提示词与参数</span>
            <el-button
              type="primary"
              link
              size="small"
              @click="recreateFromDetail(currentRow)"
            >
              基于此提示词再次创作
            </el-button>
          </div>
          <div class="detail-ai-content">
            <div v-if="currentRow.responseData?.prompt || currentRow.inputProps?.prompt" class="detail-ai-block">
              <div class="detail-ai-label">Prompt</div>
              <div class="detail-ai-text">{{ currentRow.responseData?.prompt || currentRow.inputProps?.prompt }}</div>
            </div>
            <div v-if="currentRow.responseData?.params || currentRow.inputProps?.params" class="detail-ai-block">
              <div class="detail-ai-label">Params</div>
              <pre class="detail-ai-code">{{ formatJson(currentRow.responseData?.params || currentRow.inputProps?.params) }}</pre>
            </div>
          </div>
        </div>

        <div class="detail-block">
          <div class="detail-block-title">完整参数 (JSON)</div>
          <pre class="detail-json-code">{{ formatJson(currentRow.inputProps) }}</pre>
        </div>
      </div>
    </div>
  </el-dialog>

  <!-- 视频预览弹窗 (极简全屏) -->
  <el-dialog
    v-model="previewVisible"
    fullscreen
    destroy-on-close
    class="remotion-preview-dialog"
    @closed="handleClosePreview"
  >
    <template #header>
      <div class="preview-simple-header">
        <span class="preview-simple-title">{{ previewRow?.title || t('remotionVideoRecord.videoPreview') }}</span>
        <div class="preview-simple-actions">
          <el-button size="small" @click="copyPreviewUrl">复制地址</el-button>
          <el-button size="small" @click="openPreviewInNewTab">新窗口打开</el-button>
          <el-button size="small" @click="downloadPreviewVideo">下载视频</el-button>
        </div>
      </div>
    </template>

    <div class="preview-simple-body">
      <video
        v-if="previewUrl"
        ref="previewVideoRef"
        :src="previewUrl"
        controls
        autoplay
        playsinline
        class="preview-simple-video"
      ></video>
    </div>
  </el-dialog>

  <!-- AI 视频生成全屏弹窗 (极简 Studio 风格) -->
  <el-dialog
    v-model="aiGenerateVisible"
    fullscreen
    destroy-on-close
    class="remotion-ai-dialog"
    :show-close="false"
    :close-on-click-modal="false"
  >
    <!-- 极简顶部工具栏 -->
    <template #header>
      <div class="ai-studio-header">
        <div class="ai-header-brand">
          <span class="ai-brand-title">AI 视频生成</span>
        </div>

        <!-- 创作模式切换 (极简 Segmented / Radio) -->
        <div class="ai-header-mode">
          <el-radio-group v-model="aiForm.mode" size="small">
            <el-radio-button label="ai-free-generate">自由创作生成</el-radio-button>
            <el-radio-button label="ai-generate">智能匹配模板</el-radio-button>
          </el-radio-group>
        </div>

        <!-- 顶部操作按钮组 -->
        <div class="ai-header-actions">
          <button class="ai-close-icon-btn" type="button" @click="aiGenerateVisible = false">
            <el-icon><Close /></el-icon>
          </button>
        </div>
      </div>
    </template>

    <!-- 全屏工作区：左侧提示词，右侧参数 -->
    <div class="ai-studio-workspace">
      <!-- 左侧：核心输入区 -->
      <div class="ai-editor-column">
        <div class="ai-editor-header-hint">
          <span>{{ aiForm.mode === 'ai-free-generate' ? '大模型自主规划分镜场景、视觉排版与转场动画' : '根据提示词关键词与图文素材智能匹配预置模板' }}</span>
        </div>

        <div class="ai-editor-box">
          <el-input
            v-model="aiForm.prompt"
            type="textarea"
            class="ai-minimal-textarea"
            @keydown.meta.enter.prevent="submitAiGenerate"
            @keydown.ctrl.enter.prevent="submitAiGenerate"
          />
        </div>

        <div class="ai-editor-statusbar">
          <div class="statusbar-shortcut">
            <span>按 <kbd>⌘</kbd>+<kbd>Enter</kbd> 或 <kbd>Ctrl</kbd>+<kbd>Enter</kbd> 快速提交</span>
          </div>
          <div class="statusbar-meta">
            <el-button
              v-if="aiForm.prompt"
              link
              type="info"
              size="small"
              @click="aiForm.prompt = ''"
            >
              清空
            </el-button>
            <span class="word-counter">{{ aiForm.prompt.length }} / 1500</span>
          </div>
        </div>
      </div>

      <!-- 右侧：参数配置侧边栏 -->
      <div class="ai-sidebar-column">
        <el-scrollbar class="ai-sidebar-scrollbar">
          <div class="sidebar-inner">
            <div class="sidebar-group-title">基础规格</div>

            <el-form label-position="top" class="ai-minimal-form">
              <!-- 画幅比例与分辨率 (下拉选择 + 自定义) -->
              <el-form-item label="画幅比例与分辨率">
                <el-select
                  v-model="selectedAspectKey"
                  popper-class="aspect-ratio-select-dropdown"
                  style="width: 100%;"
                  @change="handleAspectRatioChange"
                >
                  <el-option-group
                    v-for="grp in ASPECT_RATIO_GROUPS"
                    :key="grp.group"
                    :label="grp.group"
                  >
                    <el-option
                      v-for="opt in grp.options"
                      :key="opt.key"
                      :label="opt.label"
                      :value="opt.key"
                    >
                      <div class="aspect-option-item">
                        <div class="aspect-option-left">
                          <span class="aspect-ratio-badge">{{ opt.ratio }}</span>
                          <span class="aspect-option-label">{{ opt.label }}</span>
                        </div>
                        <span class="aspect-res-tag">{{ opt.badge }}</span>
                      </div>
                    </el-option>
                  </el-option-group>
                </el-select>

                <!-- 自定义尺寸输入 -->
                <div v-if="selectedAspectKey === 'custom'" class="custom-res-row">
                  <el-input-number
                    v-model="aiForm.params.width"
                    :min="240"
                    :max="4096"
                    :step="10"
                    placeholder="宽度"
                    controls-position="right"
                    style="flex: 1;"
                    @change="onCustomResolutionChange"
                  >
                    <template #prefix><span class="res-prefix">宽:</span></template>
                  </el-input-number>
                  <span class="res-multiply">×</span>
                  <el-input-number
                    v-model="aiForm.params.height"
                    :min="240"
                    :max="4096"
                    :step="10"
                    placeholder="高度"
                    controls-position="right"
                    style="flex: 1;"
                    @change="onCustomResolutionChange"
                  >
                    <template #prefix><span class="res-prefix">高:</span></template>
                  </el-input-number>
                </div>
              </el-form-item>

              <!-- 成片总时长 (下拉推荐 + 自定义) -->
              <el-form-item label="成片总时长">
                <div class="duration-control-wrapper">
                  <el-select
                    v-model="selectedDurationKey"
                    placeholder="请选择视频时长"
                    popper-class="duration-select-dropdown"
                    style="width: 100%;"
                    @change="handleDurationChange"
                  >
                    <el-option
                      v-for="item in DURATION_PRESETS"
                      :key="item.value"
                      :label="item.label"
                      :value="item.value"
                    >
                      <div class="duration-option-item">
                        <span class="duration-option-label">{{ item.label }}</span>
                        <span class="duration-option-desc">{{ item.desc }}</span>
                      </div>
                    </el-option>
                  </el-select>

                  <!-- 自定义时长秒数输入 -->
                  <div v-if="selectedDurationKey === 'custom'" class="custom-duration-input-box">
                    <el-input-number
                      v-model="aiForm.params.duration"
                      :min="3"
                      :max="300"
                      :step="1"
                      placeholder="请输入秒数（3~300秒）"
                      controls-position="right"
                      style="width: 100%;"
                    >
                      <template #prefix><span class="res-prefix">时长:</span></template>
                      <template #suffix><span class="res-suffix">秒 (s)</span></template>
                    </el-input-number>
                  </div>
                </div>
              </el-form-item>

              <!-- 渲染帧率与标题 -->
              <div class="form-dual-row">
                <el-form-item label="渲染帧率" style="flex: 1;">
                  <el-select v-model="aiForm.params.fps" size="default">
                    <el-option label="30 FPS (标准)" :value="30" />
                    <el-option label="60 FPS (丝滑)" :value="60" />
                  </el-select>
                </el-form-item>
                <el-form-item label="成片标题" style="flex: 1.4;">
                  <el-input
                    v-model="aiForm.params.title"
                    placeholder="留空由 AI 拟定"
                    clearable
                    maxlength="50"
                  />
                </el-form-item>
              </div>

              <div class="sidebar-group-title" style="margin-top: 16px;">音频设置</div>

              <!-- 背景配乐与音量 -->
              <el-form-item label="背景配乐 URL">
                <el-input
                  v-model="aiForm.params.bgmUrl"
                  placeholder="可粘贴 MP3 直链 (选填)"
                  clearable
                />
                <div v-if="aiForm.params.bgmUrl" class="volume-slider-box">
                  <span class="volume-label">配乐音量</span>
                  <el-slider
                    v-model="aiForm.params.bgmVolume"
                    :min="0"
                    :max="100"
                    :step="5"
                    style="flex: 1; margin: 0 12px;"
                  />
                  <span class="volume-val">{{ aiForm.params.bgmVolume }}%</span>
                </div>
              </el-form-item>

              <!-- 视频模版skill 多选与场景快捷预设 -->
              <el-form-item style="margin-top: 14px;">
                <template #label>
                  <div class="skill-select-label-row">
                    <span class="skill-select-label-title">视频模版 skill</span>
                    <el-tag size="small" type="primary" class="skill-count-badge">
                      已选 {{ aiForm.skillIds?.length || 0 }} 项
                    </el-tag>
                    <div class="skill-label-actions">
                      <el-button
                        v-if="aiForm.skillIds?.length"
                        size="small"
                        link
                        type="danger"
                        @click="clearSelectedSkills"
                      >
                        清空
                      </el-button>
                      <el-button
                        size="small"
                        link
                        type="primary"
                        @click="router.push('/content/remotion-skill')"
                      >
                        管理技能库
                      </el-button>
                    </div>
                  </div>
                </template>

                <!-- 多选下拉框 -->
                <el-select
                  v-model="aiForm.skillIds"
                  multiple
                  filterable
                  clearable
                  collapse-tags
                  collapse-tags-tooltip
                  :max-collapse-tags="2"
                  placeholder="请选择本次视频应用的模版技能（支持多选）"
                  popper-class="skill-multi-select-dropdown"
                  style="width: 100%;"
                >
                  <el-option-group
                    v-for="group in groupedSkills"
                    :key="group.category"
                    :label="group.label"
                  >
                    <el-option
                      v-for="skill in group.list"
                      :key="skill.id"
                      :label="skill.name"
                      :value="skill.id"
                    >
                      <div class="skill-dropdown-row">
                        <span class="skill-dropdown-name" :title="skill.name">{{ skill.name }}</span>
                        <div class="skill-dropdown-meta">
                          <span class="skill-dropdown-code">{{ skill.code }}</span>
                          <span v-if="skill.isSystem" class="skill-dropdown-sys">系统</span>
                        </div>
                      </div>
                    </el-option>
                  </el-option-group>
                </el-select>

                <!-- 已选技能标签展示与悬浮说明 -->
                <div v-if="selectedSkillsList.length > 0" class="selected-skills-tags-wrap">
                  <el-tooltip
                    v-for="skill in selectedSkillsList"
                    :key="skill.id"
                    placement="top"
                    :show-after="300"
                  >
                    <template #content>
                      <div style="max-width: 280px; font-size: 12px; line-height: 1.5;">
                        <div style="font-weight: 600; margin-bottom: 4px;">{{ skill.name }} ({{ skill.code }})</div>
                        <div style="color: #cbd5e1; margin-bottom: 6px;">{{ skill.description || '无描述' }}</div>
                        <div style="white-space: pre-wrap; font-size: 11px; opacity: 0.85;">{{ skill.promptContent }}</div>
                      </div>
                    </template>
                    <el-tag
                      closable
                      size="small"
                      :type="getSkillCategoryTagType(skill.category)"
                      effect="light"
                      class="selected-skill-pill"
                      @close="removeSelectedSkill(skill.id)"
                    >
                      <span class="pill-category">[{{ getSkillCategoryLabel(skill.category) }}]</span>
                      {{ skill.name }}
                    </el-tag>
                  </el-tooltip>
                </div>
              </el-form-item>

              <div class="sidebar-group-title" style="margin-top: 16px;">高级扩展参数</div>


              <!-- 高级扩展参数 (JSON) -->
              <el-collapse v-model="aiAdvancedCollapse" class="ai-minimal-collapse">
                <el-collapse-item title="高级通用参数 (JSON)" name="customParams">
                  <div class="template-btns-row">
                    <div class="template-btns-list">
                      <el-button size="small" text bg @click="applyConfigTemplate('full')">完整骨架</el-button>
                      <el-button size="small" text bg @click="applyConfigTemplate('dimension')">画质规格</el-button>
                      <el-button size="small" text bg @click="applyConfigTemplate('transition')">分镜转场</el-button>
                      <el-button size="small" text bg @click="applyConfigTemplate('audio')">音频音效</el-button>
                      <el-button size="small" text bg @click="applyConfigTemplate('inputProps')">模板传参</el-button>
                    </div>
                    <div class="template-actions">
                      <el-button
                        v-if="aiForm.customParamsJson"
                        size="small"
                        link
                        type="primary"
                        @click="formatCustomJson"
                      >
                        格式化
                      </el-button>
                      <el-button
                        v-if="aiForm.customParamsJson"
                        size="small"
                        link
                        type="danger"
                        @click="clearCustomParams"
                      >
                        清空
                      </el-button>
                    </div>
                  </div>

                  <el-input
                    v-model="aiForm.customParamsJson"
                    type="textarea"
                    :rows="6"
                    class="code-textarea"
                    placeholder='透传通用参数给 Remotion 渲染引擎，例如：&#10;{&#10;  "width": 1080,&#10;  "height": 1920,&#10;  "fps": 30,&#10;  "duration": 15,&#10;  "sceneDuration": 3,&#10;  "transition": "fade",&#10;  "transitionFrames": 24,&#10;  "bgmVolume": 0.8&#10;}'
                  />

                  <div class="params-spec-table">
                    <div class="spec-row"><code>width / height</code><span>分辨率像素</span></div>
                    <div class="spec-row"><code>fps / duration</code><span>帧率与总时长秒数</span></div>
                    <div class="spec-row"><code>sceneDuration</code><span>单分镜秒数</span></div>
                    <div class="spec-row"><code>transition</code><span>转场 (fade, slide-left, zoom, cut)</span></div>
                    <div class="spec-row"><code>transitionFrames</code><span>转场过渡帧数 (如 24)</span></div>
                    <div class="spec-row"><code>bgmVolume / loop</code><span>音量与循环</span></div>
                    <div class="spec-row"><code>inputProps</code><span>模板原生参数</span></div>
                  </div>
                </el-collapse-item>
              </el-collapse>
            </el-form>
          </div>
        </el-scrollbar>
        <!-- 底部操作栏 -->
        <div class="ai-sidebar-footer">
          <el-button
            type="primary"
            size="default"
            :disabled="!aiForm.prompt?.trim()"
            @click="submitAiGenerate"
          >
            <el-icon style="margin-right: 6px;"><VideoPlay /></el-icon>
            开始生成
          </el-button>
        </div>
      </div>
    </div>
  </el-dialog>

  <!-- 🧠 AI 编导技能库管理抽屉 -->
  <el-drawer
    v-model="skillManageDrawerVisible"
    title="🧠 AI 编导技能库 (Remotion Skills)"
    size="680px"
    :append-to-body="true"
    destroy-on-close
  >
    <div class="skill-drawer-container">
      <!-- 顶部操作栏 -->
      <div class="skill-drawer-header-actions">
        <el-input
          v-model="skillSearchKeyword"
          placeholder="搜索技能名称或描述..."
          prefix-icon="Search"
          clearable
          style="flex: 1;"
          @input="handleSkillSearch"
        />
        <el-button type="primary" plain @click="openCreateSkillDialog">
          <el-icon style="margin-right: 4px;"><Plus /></el-icon>
          新建技能
        </el-button>
        <el-button type="success" plain @click="openImportSkillDialog">
          <el-icon style="margin-right: 4px;"><Upload /></el-icon>
          导入 SKILL.md
        </el-button>
      </div>

      <!-- 分类筛选标签页 -->
      <el-radio-group v-model="skillCategoryFilter" size="small" class="skill-category-tabs" @change="fetchAllSkills">
        <el-radio-button label="all">全部</el-radio-button>
        <el-radio-button label="motion">动效规范</el-radio-button>
        <el-radio-button label="caption">文案字幕</el-radio-button>
        <el-radio-button label="audio">音频媒体</el-radio-button>
        <el-radio-button label="marketing">电商营销</el-radio-button>
        <el-radio-button label="cinematic">电影美学</el-radio-button>
        <el-radio-button label="custom">自定义</el-radio-button>
      </el-radio-group>

      <!-- 技能列表 -->
      <div v-loading="skillManageLoading" class="skill-list-container">
        <el-empty v-if="allSkillsList.length === 0" description="暂无符合条件的技能" />
        <div
          v-for="skill in allSkillsList"
          :key="skill.id"
          class="skill-manage-card"
          :class="{ disabled: !skill.isActive }"
        >
          <div class="skill-manage-header">
            <div class="skill-manage-title-box">
              <span class="skill-manage-icon">{{ skill.icon || '🎯' }}</span>
              <div class="skill-manage-title-meta">
                <div class="skill-manage-name">{{ skill.name }}</div>
                <div class="skill-manage-code">
                  <code>{{ skill.code }}</code>
                  <el-tag v-if="skill.isSystem" size="small" type="info" effect="plain" style="margin-left: 6px;">
                    官方内置
                  </el-tag>
                  <el-tag size="small" type="primary" effect="light" style="margin-left: 4px;">
                    {{ getSkillCategoryLabel(skill.category) }}
                  </el-tag>
                </div>
              </div>
            </div>
            <div class="skill-manage-actions">
              <el-switch
                v-model="skill.isActive"
                inline-prompt
                active-text="开"
                inactive-text="关"
                @change="toggleSkillActiveState(skill)"
              />
              <el-button size="small" link type="primary" @click="openEditSkillDialog(skill)">
                <el-icon><Edit /></el-icon>
                编辑
              </el-button>
              <el-popconfirm
                v-if="!skill.isSystem"
                title="确定删除此自定义技能吗？"
                @confirm="deleteSkillItem(skill)"
              >
                <template #reference>
                  <el-button size="small" link type="danger">
                    <el-icon><Delete /></el-icon>
                    删除
                  </el-button>
                </template>
              </el-popconfirm>
            </div>
          </div>

          <div class="skill-manage-desc">
            {{ skill.description || '暂无描述' }}
          </div>

          <div class="skill-manage-prompt-preview">
            <div class="prompt-preview-title">编导规则提要：</div>
            <pre class="prompt-code-block">{{ skill.promptContent?.slice(0, 180) }}...</pre>
          </div>
        </div>
      </div>
    </div>
  </el-drawer>

  <!-- ✏️ 新建 / 编辑技能弹窗 -->
  <el-dialog
    v-model="skillEditDialogVisible"
    :title="skillEditForm.id ? '编辑 Remotion 技能' : '新建自定义技能'"
    width="640px"
    :append-to-body="true"
    destroy-on-close
  >
    <el-form label-position="top" size="default">
      <div class="form-dual-row">
        <el-form-item label="技能名称" required style="flex: 1.4;">
          <el-input v-model="skillEditForm.name" placeholder="例如：极速爆品卡点风" maxlength="50" />
        </el-form-item>
        <el-form-item label="图标 (Emoji)" style="flex: 0.6;">
          <el-input v-model="skillEditForm.icon" placeholder="🎯" maxlength="8" />
        </el-form-item>
      </div>

      <div class="form-dual-row">
        <el-form-item label="技能标识码 (Code)" style="flex: 1.2;">
          <el-input
            v-model="skillEditForm.code"
            placeholder="留空自动生成，例如 ecom-fast"
            :disabled="Boolean(skillEditForm.id && skillEditForm.isSystem)"
          />
        </el-form-item>
        <el-form-item label="分类" style="flex: 0.8;">
          <el-select v-model="skillEditForm.category">
            <el-option label="动效规范 (motion)" value="motion" />
            <el-option label="文案字幕 (caption)" value="caption" />
            <el-option label="音频媒体 (audio)" value="audio" />
            <el-option label="电商营销 (marketing)" value="marketing" />
            <el-option label="电影美学 (cinematic)" value="cinematic" />
            <el-option label="自定义 (custom)" value="custom" />
          </el-select>
        </el-form-item>
      </div>

      <el-form-item label="简明说明">
        <el-input
          v-model="skillEditForm.description"
          type="textarea"
          :rows="2"
          placeholder="向使用者简要说明此技能的编导风格、适用场景与亮点"
          maxlength="200"
          show-word-limit
        />
      </el-form-item>

      <el-form-item label="核心编导提示词规则 (Prompt 内容，支持 Markdown)" required>
        <el-input
          v-model="skillEditForm.promptContent"
          type="textarea"
          :rows="7"
          class="code-textarea"
          placeholder="编写具体编导指令，例如：&#10;1. 场景转场必须使用 zoom；&#10;2. 前 2 秒黄金痛点提问；&#10;3. 末尾强制展示 CTA 转化按钮。"
        />
      </el-form-item>

      <el-form-item label="附加默认参数 (JSON，选填)">
        <el-input
          v-model="skillEditForm.defaultParamsJson"
          type="textarea"
          :rows="3"
          class="code-textarea"
          placeholder='例如：{ "transition": "zoom", "transitionFrames": 12, "fps": 30 }'
        />
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="skillEditDialogVisible = false">取消</el-button>
      <el-button type="primary" :loading="skillEditLoading" @click="saveSkillEdit">
        保存技能
      </el-button>
    </template>
  </el-dialog>

  <!-- 📥 导入 SKILL.md 弹窗 -->
  <el-dialog
    v-model="skillImportDialogVisible"
    title="📥 导入 Remotion 官方 / 社区 SKILL.md"
    width="640px"
    :append-to-body="true"
    destroy-on-close
  >
    <div class="import-tips-banner">
      支持直接粘贴 Remotion 官网 (https://www.remotion.dev/docs/ai/skills) 或 GitHub 中的 <code>SKILL.md</code> 全文内容，系统将自动解析 YAML 前置信息与正文规则并存入技能库！
    </div>
    <el-input
      v-model="skillImportMarkdown"
      type="textarea"
      :rows="12"
      class="code-textarea"
      placeholder="---&#10;name: remotion-markup&#10;title: Remotion 动效规范&#10;icon: 📐&#10;description: 最佳实践规则&#10;---&#10;&#10;## 编导规则&#10;1. 所有动画由帧数计算插值..."
    />
    <template #footer>
      <el-button @click="skillImportDialogVisible = false">取消</el-button>
      <el-button
        type="success"
        :loading="skillImportLoading"
        :disabled="!skillImportMarkdown.trim()"
        @click="handleImportMarkdown"
      >
        解析并导入
      </el-button>
    </template>
  </el-dialog>
</template>


<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { ElMessage, ElMessageBox } from "element-plus";
import { useI18n } from "@/hooks/web/useI18n";
import {
  Delete,
  Search,
  QuestionFilled,
  MagicStick,
  Files,
  VideoPlay,
  CircleCheck,
  Check,
  Operation,
  ArrowRight,
  CopyDocument,
  TopRight,
  Download,
  Close,
  Refresh,
  FullScreen,
  Setting,
  Plus,
  Upload,
  Edit,
  Cpu,
} from "@element-plus/icons-vue";

const router = useRouter();
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
  retryRemotionVideoRecord,
} from "@/api/remotion-video-record";
import {
  getRemotionSkillList,
  createRemotionSkill,
  updateRemotionSkill,
  deleteRemotionSkill,
  toggleRemotionSkill,
  importRemotionSkillMarkdown,
  type RemotionSkillItem,
} from "@/api/remotion-skill";
import ContentWrap from "@/components/ContentWrap/src/ContentWrap.vue";
import ListPageLayout from "@/components/ListPageLayout/index.vue";
import Pagination from "@/components/Pagination/index.vue";
import { refreshServiceHealth, useServiceHealthState } from "@/services/serviceHealthState";
import { websocketClient, type RemotionVideoRecordStatusEvent } from "@/services/websocketClient";

const { t } = useI18n();

const { width: windowWidth, height } = useWindowSize();
const isMobile = computed(() => windowWidth.value < 768);
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

// 视频预览相关状态
const previewVisible = ref(false);
const previewUrl = ref('');
const previewRow = ref<any>(null);
const previewVideoRef = ref<HTMLVideoElement | null>(null);

const remotionStatus = useServiceHealthState("videoTemplate");

// AI 生成相关状态
const isAiFullscreen = ref(false);
const aiGenerateVisible = ref(false);
const aiAdvancedCollapse = ref<string[]>([]);
const aiForm = ref({
  mode: 'ai-free-generate' as 'ai-generate' | 'ai-free-generate',
  prompt: '',
  skillIds: [] as string[],
  customParamsJson: '',
  params: {
    orientation: 'portrait' as 'portrait' | 'landscape' | 'square',
    aspectRatio: '9:16',
    width: 1080 as number | undefined,
    height: 1920 as number | undefined,
    duration: undefined as number | undefined,
    fps: 30 as number | undefined,
    title: '',
    bgmUrl: '',
    bgmVolume: 80,
  },
});

const selectedAspectKey = ref('9:16-1080p');

const ASPECT_RATIO_GROUPS = [
  {
    group: '主流竖屏画幅 (9:16 / 4:5 / 3:4)',
    options: [
      {
        key: '9:16-1080p',
        label: '9:16 标准短视频 (1080×1920)',
        ratio: '9:16',
        orientation: 'portrait' as const,
        width: 1080,
        height: 1920,
        badge: '抖音 / 快手 / 视频号',
      },
      {
        key: '9:16-720p',
        label: '9:16 高清省流 (720×1280)',
        ratio: '9:16',
        orientation: 'portrait' as const,
        width: 720,
        height: 1280,
        badge: '极速生成',
      },
      {
        key: '9:16-4k',
        label: '9:16 4K超清画质 (2160×3840)',
        ratio: '9:16',
        orientation: 'portrait' as const,
        width: 2160,
        height: 3840,
        badge: '4K超细腻',
      },
      {
        key: '4:5-1080p',
        label: '4:5 社交信息流 (1080×1350)',
        ratio: '4:5',
        orientation: 'portrait' as const,
        width: 1080,
        height: 1350,
        badge: '小红书 / Instagram',
      },
      {
        key: '3:4-1080p',
        label: '3:4 电商图文竖屏 (1080×1440)',
        ratio: '3:4',
        orientation: 'portrait' as const,
        width: 1080,
        height: 1440,
        badge: '电商详情 / 种草',
      },
    ],
  },
  {
    group: '主流横屏画幅 (16:9 / 4:3 / 21:9)',
    options: [
      {
        key: '16:9-1080p',
        label: '16:9 全高清横屏 (1920×1080)',
        ratio: '16:9',
        orientation: 'landscape' as const,
        width: 1920,
        height: 1080,
        badge: 'B站 / YouTube / 电脑',
      },
      {
        key: '16:9-2k',
        label: '16:9 2K超清横屏 (2560×1440)',
        ratio: '16:9',
        orientation: 'landscape' as const,
        width: 2560,
        height: 1440,
        badge: '2K清晰度',
      },
      {
        key: '16:9-4k',
        label: '16:9 4K电影极清 (3840×2160)',
        ratio: '16:9',
        orientation: 'landscape' as const,
        width: 3840,
        height: 2160,
        badge: '4K大片',
      },
      {
        key: '16:9-720p',
        label: '16:9 标清横屏 (1280×720)',
        ratio: '16:9',
        orientation: 'landscape' as const,
        width: 1280,
        height: 720,
        badge: '720P快速',
      },
      {
        key: '4:3-1080p',
        label: '4:3 经典复古屏 (1440×1080)',
        ratio: '4:3',
        orientation: 'landscape' as const,
        width: 1440,
        height: 1080,
        badge: '课件 / 复古质感',
      },
      {
        key: '21:9-1080p',
        label: '21:9 宽银幕电影画幅 (2560×1080)',
        ratio: '21:9',
        orientation: 'landscape' as const,
        width: 2560,
        height: 1080,
        badge: '宽银幕电影感',
      },
    ],
  },
  {
    group: '方形画幅规格 (1:1)',
    options: [
      {
        key: '1:1-1080p',
        label: '1:1 高清方屏 (1080×1080)',
        ratio: '1:1',
        orientation: 'square' as const,
        width: 1080,
        height: 1080,
        badge: '主图 / 朋友圈广告',
      },
      {
        key: '1:1-800p',
        label: '1:1 电商标准图 (800×800)',
        ratio: '1:1',
        orientation: 'square' as const,
        width: 800,
        height: 800,
        badge: '淘宝 / 京东主图',
      },
    ],
  },
  {
    group: '高级自定义规格',
    options: [
      {
        key: 'custom',
        label: '自定义分辨率 (自由输入宽×高)...',
        ratio: '自定义',
        orientation: 'portrait' as const,
        width: 1080,
        height: 1920,
        badge: '自定义 px',
      },
    ],
  },
];

function handleAspectRatioChange(key: string) {
  if (key === 'custom') {
    aiForm.value.params.width = aiForm.value.params.width || 1080;
    aiForm.value.params.height = aiForm.value.params.height || 1920;
    onCustomResolutionChange();
    return;
  }
  for (const group of ASPECT_RATIO_GROUPS) {
    const item = group.options.find((opt) => opt.key === key);
    if (item) {
      aiForm.value.params.orientation = item.orientation;
      aiForm.value.params.width = item.width;
      aiForm.value.params.height = item.height;
      aiForm.value.params.aspectRatio = item.ratio;
      break;
    }
  }
}

function onCustomResolutionChange() {
  const w = Number(aiForm.value.params.width) || 1080;
  const h = Number(aiForm.value.params.height) || 1920;
  if (w > h) {
    aiForm.value.params.orientation = 'landscape';
  } else if (w === h) {
    aiForm.value.params.orientation = 'square';
  } else {
    aiForm.value.params.orientation = 'portrait';
  }
  aiForm.value.params.aspectRatio = `${w}:${h}`;
}

const selectedDurationKey = ref<string | number>('auto');

const DURATION_PRESETS = [
  { label: '自动分配 (由 AI 根据文案内容智能推算)', value: 'auto', desc: '根据分镜动态计算' },
  { label: '5 秒 · 极速卡点切片', value: 5, desc: '短卡点 / 极简动效' },
  { label: '10 秒 · 黄金爆款前奏', value: 10, desc: '完播率高 / 抓人眼球' },
  { label: '15 秒 · 标准短视频带货', value: 15, desc: '主流带货 (推荐)' },
  { label: '20 秒 · 痛点种草短片', value: 20, desc: '问题场景 + 解决方案' },
  { label: '30 秒 · 完整商业广告', value: 30, desc: '经典TVC篇幅' },
  { label: '45 秒 · 深度产品演示', value: 45, desc: '多卖点详细功能拆解' },
  { label: '60 秒 · 1分钟干货科普', value: 60, desc: '知识讲解干货' },
  { label: '90 秒 · 沉浸情节短片', value: 90, desc: '情景剧故事短片' },
  { label: '120 秒 · 2分钟长片精讲', value: 120, desc: '长篇详尽阐述' },
  { label: '自定义时长 (自由输入秒数)...', value: 'custom', desc: '输入 3~300 秒' },
];

function handleDurationChange(val: string | number) {
  if (val === 'auto') {
    aiForm.value.params.duration = undefined;
  } else if (typeof val === 'number') {
    aiForm.value.params.duration = val;
  } else if (val === 'custom') {
    aiForm.value.params.duration = aiForm.value.params.duration || 15;
  }
}

const PROMPT_TEMPLATES = [
  {
    name: "科技新品发布",
    icon: "🚀",
    prompt: "品牌名：星瞳科技 NovaVision。标题：量子计算新纪元。第一幕展示产品外观与核心算力突破；第二幕展示多核分布式架构与极致能效比；第三幕展示开发者生态与限时预约申请。",
    orientation: "landscape",
    duration: 15,
  },
  {
    name: "电商好物种草",
    icon: "🛍️",
    prompt: "品牌名：极光美学。标题：极简降噪无线耳机。第一幕：45dB 深度混合主动降噪，沉浸音乐世界；第二幕：40小时超长续航，双麦高清通话；第三幕：限时首发立减100元，立即抢购！",
    orientation: "portrait",
    duration: 12,
  },
  {
    name: "业务数据简报",
    icon: "📊",
    prompt: "标题：2026年第三季度业务运营数据简报。第一幕：总交易额突破 1.2 亿元，同比增长 45%；第二幕：月活跃商户数达 8.5 万家，留存率 92%；第三幕：持续赋能实体数字化升级，携手共创未来！",
    orientation: "landscape",
    duration: 15,
  },
  {
    name: "知识干货科普",
    icon: "💡",
    prompt: "标题：3分钟搞懂 AI 大模型微调原理。第一幕：为什么预训练大模型还需要微调？第二幕：LoRA 与全量微调的核心差异与显存对比；第三幕：关注我们，获取完整的微调实战代码包！",
    orientation: "portrait",
    duration: 15,
  },
];

function applyPromptTemplate(tpl: (typeof PROMPT_TEMPLATES)[0]) {
  aiForm.value.prompt = tpl.prompt;
  if (tpl.orientation) {
    aiForm.value.params.orientation = tpl.orientation as any;
    if (tpl.orientation === 'landscape') {
      selectedAspectKey.value = '16:9-1080p';
      handleAspectRatioChange('16:9-1080p');
    } else if (tpl.orientation === 'square') {
      selectedAspectKey.value = '1:1-1080p';
      handleAspectRatioChange('1:1-1080p');
    } else {
      selectedAspectKey.value = '9:16-1080p';
      handleAspectRatioChange('9:16-1080p');
    }
  }
  if (tpl.duration) {
    aiForm.value.params.duration = tpl.duration;
    const matched = DURATION_PRESETS.find((d) => d.value === tpl.duration);
    selectedDurationKey.value = matched ? tpl.duration : 'custom';
  }
  ElMessage.success(`已载入「${tpl.name}」创作灵感示范`);
}

const CONFIG_TEMPLATES: Record<string, Record<string, any>> = {
  full: {
    width: 1080,
    height: 1920,
    fps: 30,
    duration: 15,
    sceneDuration: 3,
    transition: "fade",
    transitionFrames: 24,
    bgmVolume: 0.8,
    showCaptions: true,
  },
  dimension: {
    width: 1080,
    height: 1920,
    fps: 30,
    duration: 15,
  },
  transition: {
    sceneDuration: 3,
    transition: "fade",
    transitionFrames: 24,
  },
  audio: {
    bgmUrl: "https://example.com/audio.mp3",
    bgmVolume: 0.8,
    loop: true,
  },
  inputProps: {
    templateId: "ai-universal",
    inputProps: {
      title: "主标题",
      subtitle: "副标题文案",
      showCaptions: true,
    },
  },
};

function applyConfigTemplate(type: string) {
  const tpl = CONFIG_TEMPLATES[type] || {};
  let current: Record<string, any> = {};
  if (aiForm.value.customParamsJson?.trim()) {
    try {
      current = JSON.parse(aiForm.value.customParamsJson.trim());
    } catch {
      current = {};
    }
  }
  const merged = Object.keys(current).length > 0 ? { ...current, ...tpl } : tpl;
  aiForm.value.customParamsJson = JSON.stringify(merged, null, 2);
}

function clearCustomParams() {
  aiForm.value.customParamsJson = "";
}

function formatCustomJson() {
  if (!aiForm.value.customParamsJson?.trim()) return;
  try {
    const parsed = JSON.parse(aiForm.value.customParamsJson.trim());
    aiForm.value.customParamsJson = JSON.stringify(parsed, null, 2);
    ElMessage.success("JSON 已格式化");
  } catch (err: any) {
    ElMessage.error(`JSON 解析失败: ${err?.message || err}`);
  }
}

// ==================== Remotion 技能体系相关状态与方法 ====================
const availableSkills = ref<RemotionSkillItem[]>([]);
const allSkillsList = ref<RemotionSkillItem[]>([]);
const skillManageDrawerVisible = ref(false);
const skillManageLoading = ref(false);
const skillCategoryFilter = ref('all');
const skillSearchKeyword = ref('');

// 技能编辑表单
const skillEditDialogVisible = ref(false);
const skillEditLoading = ref(false);
const skillEditForm = ref<{
  id?: string;
  code?: string;
  name: string;
  icon: string;
  category: string;
  description: string;
  promptContent: string;
  defaultParamsJson: string;
  isSystem?: boolean;
  isActive: boolean;
  sortOrder: number;
}>({
  name: '',
  icon: '🎯',
  category: 'custom',
  description: '',
  promptContent: '',
  defaultParamsJson: '',
  isActive: true,
  sortOrder: 0,
});

// Markdown 导入
const skillImportDialogVisible = ref(false);
const skillImportLoading = ref(false);
const skillImportMarkdown = ref('');

function getSkillCategoryLabel(category: string) {
  const map: Record<string, string> = {
    motion: '动效规范',
    caption: '文案字幕',
    audio: '音频媒体',
    marketing: '电商营销',
    cinematic: '电影美学',
    custom: '自定义',
  };
  return map[category] || category || '通用';
}

function getSkillCategoryTagType(category: string) {
  const map: Record<string, string> = {
    motion: 'primary',
    caption: 'success',
    audio: 'warning',
    marketing: 'danger',
    cinematic: 'info',
    custom: '',
  };
  return map[category] || 'info';
}

const groupedSkills = computed(() => {
  const groups: Record<string, { label: string; list: RemotionSkillItem[] }> = {
    motion: { label: '动效规范', list: [] },
    caption: { label: '文案字幕', list: [] },
    audio: { label: '音频媒体', list: [] },
    marketing: { label: '电商营销', list: [] },
    cinematic: { label: '电影美学', list: [] },
    custom: { label: '自定义', list: [] },
  };

  for (const s of availableSkills.value) {
    const cat = s.category && groups[s.category] ? s.category : 'custom';
    groups[cat].list.push(s);
  }

  return Object.entries(groups)
    .filter(([_, g]) => g.list.length > 0)
    .map(([key, g]) => ({ category: key, label: g.label, list: g.list }));
});

const selectedSkillsList = computed(() => {
  if (!Array.isArray(aiForm.value.skillIds)) return [];
  return availableSkills.value.filter((s) => aiForm.value.skillIds.includes(s.id));
});

function removeSelectedSkill(skillId: string) {
  if (!Array.isArray(aiForm.value.skillIds)) return;
  const idx = aiForm.value.skillIds.indexOf(skillId);
  if (idx !== -1) {
    aiForm.value.skillIds.splice(idx, 1);
  }
}

function clearSelectedSkills() {
  aiForm.value.skillIds = [];
}

async function fetchSkills(forceRefresh = false) {
  if (availableSkills.value.length > 0 && !forceRefresh) return;
  try {
    const res: any = await getRemotionSkillList({ isActive: true });
    const list: RemotionSkillItem[] = res?.data || res || [];
    availableSkills.value = list;

    // 如果还没有选择任何技能，默认勾选官方核心技能
    if ((!aiForm.value.skillIds || aiForm.value.skillIds.length === 0) && list.length > 0) {
      const defaultIds = list
        .filter((s) => s.isSystem && (s.code === 'remotion-markup' || s.code === 'remotion-captions'))
        .map((s) => s.id);
      aiForm.value.skillIds = defaultIds.length > 0 ? defaultIds : [list[0].id];
    }
  } catch (err: any) {
    console.error('获取 Remotion Skills 失败:', err);
  }
}

function toggleSkillSelect(skillId: string) {
  if (!aiForm.value.skillIds) {
    aiForm.value.skillIds = [];
  }
  const index = aiForm.value.skillIds.indexOf(skillId);
  if (index > -1) {
    aiForm.value.skillIds.splice(index, 1);
  } else {
    aiForm.value.skillIds.push(skillId);
  }
}

async function fetchAllSkills() {
  skillManageLoading.value = true;
  try {
    const category = skillCategoryFilter.value === 'all' ? undefined : skillCategoryFilter.value;
    const res: any = await getRemotionSkillList({
      category,
      keyword: skillSearchKeyword.value.trim() || undefined,
    });
    allSkillsList.value = res?.data || res || [];
  } catch (err: any) {
    ElMessage.error(`获取技能列表失败: ${err?.message || err}`);
  } finally {
    skillManageLoading.value = false;
  }
}

function handleSkillSearch() {
  fetchAllSkills();
}

function openSkillManager() {
  skillManageDrawerVisible.value = true;
  skillCategoryFilter.value = 'all';
  skillSearchKeyword.value = '';
  fetchAllSkills();
}

function openCreateSkillDialog() {
  skillEditForm.value = {
    name: '',
    code: '',
    icon: '🎯',
    category: 'custom',
    description: '',
    promptContent: '',
    defaultParamsJson: '',
    isActive: true,
    sortOrder: 0,
  };
  skillEditDialogVisible.value = true;
}

function openEditSkillDialog(skill: RemotionSkillItem) {
  skillEditForm.value = {
    id: skill.id,
    code: skill.code,
    name: skill.name,
    icon: skill.icon || '🎯',
    category: skill.category || 'custom',
    description: skill.description || '',
    promptContent: skill.promptContent || '',
    defaultParamsJson: skill.defaultParams ? JSON.stringify(skill.defaultParams, null, 2) : '',
    isSystem: skill.isSystem,
    isActive: skill.isActive,
    sortOrder: skill.sortOrder || 0,
  };
  skillEditDialogVisible.value = true;
}

async function saveSkillEdit() {
  if (!skillEditForm.value.name?.trim()) {
    ElMessage.warning('请输入技能名称');
    return;
  }
  if (!skillEditForm.value.promptContent?.trim()) {
    ElMessage.warning('请输入核心编导提示词规则');
    return;
  }

  let defaultParams: Record<string, any> | undefined = undefined;
  if (skillEditForm.value.defaultParamsJson?.trim()) {
    try {
      defaultParams = JSON.parse(skillEditForm.value.defaultParamsJson.trim());
    } catch (e: any) {
      ElMessage.error(`默认参数 JSON 格式有误: ${e?.message || e}`);
      return;
    }
  }

  skillEditLoading.value = true;
  try {
    if (skillEditForm.value.id) {
      await updateRemotionSkill(skillEditForm.value.id, {
        name: skillEditForm.value.name.trim(),
        icon: skillEditForm.value.icon?.trim() || '🎯',
        category: skillEditForm.value.category,
        description: skillEditForm.value.description?.trim(),
        promptContent: skillEditForm.value.promptContent.trim(),
        defaultParams,
        isActive: skillEditForm.value.isActive,
        sortOrder: skillEditForm.value.sortOrder,
      });
      ElMessage.success('技能修改成功');
    } else {
      await createRemotionSkill({
        code: skillEditForm.value.code?.trim() || undefined,
        name: skillEditForm.value.name.trim(),
        icon: skillEditForm.value.icon?.trim() || '🎯',
        category: skillEditForm.value.category,
        description: skillEditForm.value.description?.trim(),
        promptContent: skillEditForm.value.promptContent.trim(),
        defaultParams,
        isActive: skillEditForm.value.isActive,
        sortOrder: skillEditForm.value.sortOrder,
      });
      ElMessage.success('自定义技能创建成功');
    }
    skillEditDialogVisible.value = false;
    await fetchAllSkills();
    await fetchSkills(true);
  } catch (err: any) {
    ElMessage.error(err?.message || '保存技能失败');
  } finally {
    skillEditLoading.value = false;
  }
}

async function deleteSkillItem(skill: RemotionSkillItem) {
  try {
    await deleteRemotionSkill(skill.id);
    ElMessage.success(`技能「${skill.name}」已删除`);
    await fetchAllSkills();
    await fetchSkills(true);
    // 从已选中列表中移除
    const idx = aiForm.value.skillIds.indexOf(skill.id);
    if (idx > -1) {
      aiForm.value.skillIds.splice(idx, 1);
    }
  } catch (err: any) {
    ElMessage.error(err?.message || '删除技能失败');
  }
}

async function toggleSkillActiveState(skill: RemotionSkillItem) {
  try {
    await toggleRemotionSkill(skill.id);
    ElMessage.success(`技能「${skill.name}」状态已更新`);
    await fetchSkills(true);
  } catch (err: any) {
    ElMessage.error(err?.message || '更新技能状态失败');
    skill.isActive = !skill.isActive; // 恢复原状
  }
}

function openImportSkillDialog() {
  skillImportMarkdown.value = '';
  skillImportDialogVisible.value = true;
}

async function handleImportMarkdown() {
  if (!skillImportMarkdown.value.trim()) return;
  skillImportLoading.value = true;
  try {
    const res: any = await importRemotionSkillMarkdown(skillImportMarkdown.value.trim());
    ElMessage.success(`成功导入技能「${res?.data?.name || res?.name || '新技能'}」`);
    skillImportDialogVisible.value = false;
    await fetchAllSkills();
    await fetchSkills(true);
  } catch (err: any) {
    ElMessage.error(err?.message || '导入技能失败，请检查 Markdown 格式');
  } finally {
    skillImportLoading.value = false;
  }
}

let processingPollTimer: ReturnType<typeof setTimeout> | null = null;
let templateSearchTimer: ReturnType<typeof setTimeout> | null = null;
const ACTIVE_RECORD_STATUSES = new Set([
  "pending",
  "pending_ai",
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
        row?.uploader?.name || row?.uploader?.account || (row?.userId ? `用户 #${row.userId}` : "-"),
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
    pending_ai: "AI构思中",
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
  if (status === "pending_ai") return "warning";
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

function openAiGenerateDialog(initialData?: {
  prompt?: string;
  params?: any;
  mode?: 'ai-free-generate' | 'ai-generate';
}) {
  aiGenerateVisible.value = true;
  void fetchSkills();

  let customParamsJson = '';
  const initialParams = initialData?.params || {};
  const standardKeys = new Set([
    'orientation',
    'aspectRatio',
    'width',
    'height',
    'duration',
    'fps',
    'title',
    'bgmUrl',
    'bgmVolume',
    'skillIds',
  ]);
  const extraParams: Record<string, any> = {};

  if (typeof initialParams === 'object' && initialParams !== null) {
    for (const [k, v] of Object.entries(initialParams)) {
      if (!standardKeys.has(k) && v !== undefined && v !== null && v !== '') {
        extraParams[k] = v;
      }
    }
  }

  if (Object.keys(extraParams).length > 0) {
    customParamsJson = JSON.stringify(extraParams, null, 2);
    aiAdvancedCollapse.value = ['customParams'];
  } else {
    aiAdvancedCollapse.value = [];
  }

  const initOrientation = (initialParams.orientation || 'portrait') as
    | 'portrait'
    | 'landscape'
    | 'square';
  const initWidth = initialParams.width
    ? Number(initialParams.width)
    : initOrientation === 'landscape'
      ? 1920
      : initOrientation === 'square'
        ? 1080
        : 1080;
  const initHeight = initialParams.height
    ? Number(initialParams.height)
    : initOrientation === 'landscape'
      ? 1080
      : initOrientation === 'square'
        ? 1080
        : 1920;
  const initAspectRatio =
    initialParams.aspectRatio ||
    (initOrientation === 'landscape'
      ? '16:9'
      : initOrientation === 'square'
        ? '1:1'
        : '9:16');

  aiForm.value = {
    mode: initialData?.mode || 'ai-free-generate',
    prompt: initialData?.prompt || '',
    skillIds: initialData?.params?.skillIds || aiForm.value.skillIds || [],
    customParamsJson,
    params: {
      orientation: initOrientation,
      aspectRatio: initAspectRatio,
      width: initWidth,
      height: initHeight,
      duration: initialParams.duration ? Number(initialParams.duration) : undefined,
      fps: initialParams.fps ? Number(initialParams.fps) : 30,
      title: initialParams.title || '',
      bgmUrl: initialParams.bgmUrl || '',
      bgmVolume:
        typeof initialParams.bgmVolume === 'number'
          ? Math.round(initialParams.bgmVolume * 100)
          : 80,
    },
  };

  const matchedAspect = ASPECT_RATIO_GROUPS.flatMap((g) => g.options).find(
    (opt) => opt.width === initWidth && opt.height === initHeight
  );
  selectedAspectKey.value = matchedAspect ? matchedAspect.key : 'custom';

  if (!initialParams.duration) {
    selectedDurationKey.value = 'auto';
  } else {
    const durNum = Number(initialParams.duration);
    const matchedDur = DURATION_PRESETS.find((p) => p.value === durNum);
    selectedDurationKey.value = matchedDur ? matchedDur.value : 'custom';
  }
}

function recreateFromDetail(row: any) {
  if (!row) return;
  const prompt = row.responseData?.prompt || row.inputProps?.prompt || '';
  const params = row.responseData?.params || row.inputProps?.params || {};
  const mode =
    row.responseData?.action === 'ai-generate'
      ? 'ai-generate'
      : 'ai-free-generate';
  detailVisible.value = false;
  openAiGenerateDialog({
    prompt,
    params,
    mode,
  });
}

async function submitAiGenerate() {
  if (!aiForm.value.prompt?.trim()) return;

  let customParams: Record<string, any> = {};
  if (aiForm.value.customParamsJson?.trim()) {
    try {
      customParams = JSON.parse(aiForm.value.customParamsJson.trim());
      if (
        typeof customParams !== 'object' ||
        Array.isArray(customParams) ||
        customParams === null
      ) {
        ElMessage.error('高级扩展参数必须是合法的 JSON 对象格式');
        return;
      }
    } catch (e: any) {
      ElMessage.error(`高级扩展参数 JSON 格式解析失败: ${e?.message || e}`);
      return;
    }
  }

  const basicParams: Record<string, any> = {};
  if (aiForm.value.params.duration)
    basicParams.duration = Number(aiForm.value.params.duration);
  if (aiForm.value.params.fps) basicParams.fps = Number(aiForm.value.params.fps);
  if (aiForm.value.params.orientation)
    basicParams.orientation = aiForm.value.params.orientation;
  if (aiForm.value.params.width)
    basicParams.width = Number(aiForm.value.params.width);
  if (aiForm.value.params.height)
    basicParams.height = Number(aiForm.value.params.height);
  if (aiForm.value.params.aspectRatio)
    basicParams.aspectRatio = aiForm.value.params.aspectRatio;
  if (aiForm.value.params.bgmUrl?.trim())
    basicParams.bgmUrl = aiForm.value.params.bgmUrl.trim();
  if (aiForm.value.params.title?.trim())
    basicParams.title = aiForm.value.params.title.trim();
  if (typeof aiForm.value.params.bgmVolume === 'number') {
    basicParams.bgmVolume = Math.round(aiForm.value.params.bgmVolume) / 100;
  }

  const mergedParams: Record<string, any> = {
    ...basicParams,
    ...customParams,
  };

  if (aiForm.value.skillIds && aiForm.value.skillIds.length > 0) {
    mergedParams.skillIds = aiForm.value.skillIds;
  }

  const submitData = {
    action: aiForm.value.mode,
    prompt: aiForm.value.prompt.trim(),
    params: Object.keys(mergedParams).length > 0 ? mergedParams : undefined,
  };


  // 立即关闭弹窗，不阻塞用户
  aiGenerateVisible.value = false;
  aiForm.value.prompt = '';
  aiForm.value.customParamsJson = '';
  ElMessage.success('AI 视频生成任务已提交，后台正在异步处理中...');

  // 异步提交，不等待响应
  aiGenerateRemotionVideoRecord(submitData)
    .then((result: any) => {
      if (result?.success) {
        getList();
      } else {
        ElMessage.error(result?.error || '任务提交失败');
      }
    })
    .catch((error: any) => {
      ElMessage.error(error?.message || '网络错误，任务提交失败');
    });
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

function resolveRecordVideoUrl(row: any): string {
  if (!row) return '';
  const rawUrl = String(row.url || row.resultUrl || row.remotionVideoUrl || '').trim();
  if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://')) {
    return rawUrl;
  }
  // 如果是本地路径或为空，但记录有有效 ID，回落至后端流媒体中转/重定向端点
  if (row.id) {
    return `/api/remotion-video-record/stream/${row.id}`;
  }
  return rawUrl;
}

function hasPlayableVideo(row: any): boolean {
  if (!row) return false;
  const rawUrl = String(row.url || row.resultUrl || row.remotionVideoUrl || '').trim();
  if (rawUrl) return true;
  return row.status === 'success' || row.status === 'completed';
}

function getVideoRatioClass(row: any): string {
  // 优先从 inputProps.params.orientation 获取
  const orientation = String(row?.inputProps?.params?.orientation || '').toLowerCase();
  if (orientation === 'portrait') return 'is-portrait';
  if (orientation === 'landscape') return 'is-landscape';
  if (orientation === 'square') return 'is-square';
  //  fallback: 从 width/height 推算
  const width = Number(row?.inputProps?.width || 0);
  const height = Number(row?.inputProps?.height || 0);
  if (width && height) {
    if (width === height) return 'is-square';
    return width > height ? 'is-landscape' : 'is-portrait';
  }
  return 'is-landscape'; // 默认横屏
}

function previewVideo(row: any) {
  const url = resolveRecordVideoUrl(row);
  if (!url) {
    ElMessage.warning('暂无可用视频播放地址');
    return;
  }
  previewRow.value = row;
  previewUrl.value = url;
  previewVisible.value = true;
}

function handleClosePreview() {
  if (previewVideoRef.value) {
    try {
      previewVideoRef.value.pause();
    } catch {}
  }
  previewVisible.value = false;
  previewUrl.value = '';
  previewRow.value = null;
}

async function copyPreviewUrl() {
  if (!previewUrl.value) return;
  const fullUrl = previewUrl.value.startsWith('http')
    ? previewUrl.value
    : `${window.location.origin}${previewUrl.value}`;
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(fullUrl);
    } else {
      const input = document.createElement('textarea');
      input.value = fullUrl;
      input.style.position = 'fixed';
      input.style.opacity = '0';
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
    }
    ElMessage.success('视频播放地址已复制到剪贴板');
  } catch (e: any) {
    ElMessage.error('复制失败，请手动复制');
  }
}

function openPreviewInNewTab() {
  if (!previewUrl.value) return;
  const fullUrl = previewUrl.value.startsWith('http')
    ? previewUrl.value
    : `${window.location.origin}${previewUrl.value}`;
  window.open(fullUrl, '_blank');
}

async function downloadPreviewVideo() {
  if (!previewUrl.value) return;
  const filename = `${previewRow.value?.title || 'remotion-video'}.mp4`;
  try {
    ElMessage.info('正在准备下载视频...');
    const response = await fetch(previewUrl.value, { mode: 'cors' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(blobUrl);
    ElMessage.success('下载完成');
  } catch {
    // 降级使用普通链接触发下载
    const link = document.createElement('a');
    link.href = previewUrl.value;
    link.target = '_blank';
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
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

function canRetryRecord(row: any) {
  const s = String(row?.status || "").toLowerCase();
  return s !== "success" && s !== "completed";
}

async function handleRetry(row: any) {
  try {
    await ElMessageBox.confirm(
      `确定要重新排队并执行任务「${row.title || row.id}」吗？`,
      "提示",
      {
        confirmButtonText: "确定",
        cancelButtonText: "取消",
        type: "warning",
      },
    );
    await retryRemotionVideoRecord(row.id);
    ElMessage.success("已重新提交渲染任务");
    await getList();
  } catch (err: any) {
    if (err !== "cancel") {
      ElMessage.error(err?.message || "重试任务失败");
    }
  }
}

function handleOperationCommand(command: string, row: any) {
  if (command === "detail") {
    openDetail(row);
    return;
  }
  if (command === "preview") {
    previewVideo(row);
    return;
  }
  if (command === "recreate") {
    recreateFromDetail(row);
    return;
  }
  if (command === "retry") {
    handleRetry(row);
    return;
  }
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

  .detail-layout {
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

  .cell-video-wrapper {
    width: 140px;
  }

  .template-grid {
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  }
}

@media (width <= 768px) {
  .ai-studio-workspace {
    flex-direction: column;
  }

  .ai-sidebar-column {
    width: 100%;
    border-left: none;
    border-top: 1px solid var(--el-border-color-lighter);
  }

  .ai-sidebar-scrollbar {
    max-height: 300px;
  }

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
    max-height: none;
    overflow: visible;
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

  .detail-layout {
    height: auto;
    grid-template-columns: 1fr;
    grid-template-rows: auto;
    gap: 0;
  }

  .detail-video-area {
    min-height: 220px;
  }

  .detail-info {
    border-left: none;
    border-top: 1px solid var(--el-border-color-lighter);
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

  .cell-video-wrapper {
    width: 120px;
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

  .detail-video-area {
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
.record-progress-cell {
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

/* ==========================================================================
   Remotion Create Dialog Theme Tokens & Styles (Light & Dark Mode)
   ========================================================================== */
:global(.remotion-create-dialog) {
  --rc-bg-dialog: var(--el-bg-color-overlay, #ffffff);
  --rc-bg-card: var(--el-bg-color, #ffffff);
  --rc-bg-card-subtle: #f8fafc;
  --rc-bg-card-hover: #f1f5f9;
  --rc-bg-card-selected: #eff6ff;
  --rc-border-card: var(--el-border-color-lighter, #e2e8f0);
  --rc-border-card-hover: var(--el-color-primary-light-5, #93c5fd);
  --rc-border-card-selected: var(--el-color-primary, #3b82f6);
  --rc-shadow-card: 0 1px 3px rgba(15, 23, 42, 0.05), 0 1px 2px rgba(15, 23, 42, 0.03);
  --rc-shadow-card-hover: 0 6px 18px -4px rgba(59, 130, 246, 0.15), 0 2px 6px -2px rgba(15, 23, 42, 0.04);
  --rc-shadow-card-selected: 0 0 0 1.5px var(--el-color-primary, #3b82f6), 0 6px 20px -2px rgba(59, 130, 246, 0.22);
  --rc-step-bg: var(--el-fill-color-light, #f1f5f9);
  --rc-step-border: var(--el-border-color-lighter, #e2e8f0);
  --rc-step-text: var(--el-text-color-regular, #475569);
  --rc-step-active-bg: var(--el-color-primary-light-9, #eff6ff);
  --rc-step-active-border: var(--el-color-primary, #3b82f6);
  --rc-step-active-text: var(--el-color-primary, #2563eb);
  --rc-step-done-bg: var(--el-color-success-light-9, #f0fdf4);
  --rc-step-done-border: var(--el-color-success-light-5, #86efac);
  --rc-step-done-text: var(--el-color-success, #16a34a);
  --rc-tag-bg: var(--el-fill-color-light, #f1f5f9);
  --rc-tag-text: var(--el-text-color-secondary, #64748b);
  --rc-code-bg: #f8fafc;
  --rc-code-text: #0f172a;
  --rc-code-border: var(--el-border-color-lighter, #cbd5e1);
  --rc-section-bg: #f8fafc;
  --rc-section-border: var(--el-border-color-lighter, #e2e8f0);
}

:global(html.dark) :global(.remotion-create-dialog),
:global(html.dark .remotion-create-dialog) {
  --rc-bg-dialog: #14161a;
  --rc-bg-card: #1c1f26;
  --rc-bg-card-subtle: #16181f;
  --rc-bg-card-hover: #222733;
  --rc-bg-card-selected: rgba(59, 130, 246, 0.15);
  --rc-border-card: rgba(255, 255, 255, 0.09);
  --rc-border-card-hover: rgba(96, 165, 250, 0.5);
  --rc-border-card-selected: #3b82f6;
  --rc-shadow-card: 0 2px 6px rgba(0, 0, 0, 0.35);
  --rc-shadow-card-hover: 0 8px 24px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(96, 165, 250, 0.35);
  --rc-shadow-card-selected: 0 0 0 1.5px #60a5fa, 0 8px 24px rgba(37, 99, 235, 0.35);
  --rc-step-bg: rgba(255, 255, 255, 0.05);
  --rc-step-border: rgba(255, 255, 255, 0.1);
  --rc-step-text: #94a3b8;
  --rc-step-active-bg: rgba(59, 130, 246, 0.18);
  --rc-step-active-border: #60a5fa;
  --rc-step-active-text: #93c5fd;
  --rc-step-done-bg: rgba(16, 185, 129, 0.15);
  --rc-step-done-border: rgba(16, 185, 129, 0.4);
  --rc-step-done-text: #6ee7b7;
  --rc-tag-bg: rgba(255, 255, 255, 0.06);
  --rc-tag-text: #94a3b8;
  --rc-code-bg: #0b0f17;
  --rc-code-text: #e2e8f0;
  --rc-code-border: rgba(255, 255, 255, 0.12);
  --rc-section-bg: rgba(255, 255, 255, 0.03);
  --rc-section-border: rgba(255, 255, 255, 0.08);
}

/* 全屏弹窗基础结构 */
:global(.remotion-create-dialog.el-dialog),
:deep(.remotion-create-dialog.el-dialog) {
  background: var(--rc-bg-dialog) !important;
}

:global(.remotion-create-dialog .el-dialog__header),
:deep(.remotion-create-dialog .el-dialog__header) {
  padding: 16px 24px 14px;
  margin-right: 0;
  border-bottom: 1px solid var(--rc-section-border);
  background: var(--rc-bg-dialog);
}

:global(.remotion-create-dialog .el-dialog__title),
:deep(.remotion-create-dialog .el-dialog__title) {
  font-size: 16px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  display: flex;
  align-items: center;
  gap: 8px;
}

:global(.remotion-create-dialog .el-dialog__body),
:deep(.remotion-create-dialog .el-dialog__body) {
  display: flex;
  height: calc(100vh - 65px);
  padding: 12px 24px 18px;
  overflow: hidden;
  flex-direction: column;
  background: var(--rc-bg-dialog);
}

/* 分步向导工具栏 */
.remotion-dialog-toolbar {
  display: flex;
  padding: 4px 0 12px;
  margin-bottom: 12px;
  border-bottom: 1px solid var(--rc-section-border);
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

.remotion-step-item {
  position: relative;
  display: flex;
  height: 34px;
  min-width: 120px;
  padding: 0 14px 0 10px;
  cursor: pointer;
  background: var(--rc-step-bg);
  border: 1px solid var(--rc-step-border);
  border-radius: 999px;
  flex-direction: row;
  align-items: center;
  gap: 8px;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  user-select: none;
}

.remotion-step-item:hover {
  border-color: var(--rc-border-card-hover);
  background: var(--rc-bg-card-hover);
}

.remotion-step-icon {
  display: flex;
  width: 22px;
  height: 22px;
  font-size: 11px;
  font-weight: 700;
  color: var(--rc-step-text);
  background: rgba(125, 125, 125, 0.15);
  border-radius: 50%;
  transition: all 0.2s;
  align-items: center;
  justify-content: center;
}

.remotion-step-label {
  font-size: 12.5px;
  font-weight: 500;
  color: var(--rc-step-text);
  white-space: nowrap;
  transition: color 0.2s;
}

.remotion-step-active {
  background: var(--rc-step-active-bg);
  border-color: var(--rc-step-active-border);
  box-shadow: 0 0 0 1px var(--rc-step-active-border);
}

.remotion-step-active .remotion-step-icon {
  color: #fff;
  background: var(--el-color-primary, #3b82f6);
}

.remotion-step-active .remotion-step-label {
  font-weight: 600;
  color: var(--rc-step-active-text);
}

.remotion-step-done {
  background: var(--rc-step-done-bg);
  border-color: var(--rc-step-done-border);
}

.remotion-step-done .remotion-step-icon {
  color: #fff;
  background: var(--el-color-success, #16a34a);
}

.remotion-step-done .remotion-step-label {
  font-weight: 500;
  color: var(--rc-step-done-text);
}

.remotion-dialog-actions {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
}

.remotion-dialog-actions .el-button {
  min-width: 82px;
  border-radius: 6px;
  font-weight: 500;
}

.remotion-step-content {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.remotion-step-panel {
  height: 100%;
  min-height: 0;
  padding: 0 4px;
  overflow: hidden;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
}

/* 步骤1: 模板筛选栏 */
.template-filter-bar {
  display: flex;
  padding: 0 0 12px;
  margin-bottom: 12px;
  border-bottom: 1px solid var(--rc-section-border);
  flex: 0 0 auto;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.template-filter-controls {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.filter-select {
  width: 132px;
  flex: 0 0 132px;
}

.filter-select--compact {
  width: 96px;
  flex-basis: 96px;
}

.filter-select--wide {
  width: 170px;
  flex-basis: 170px;
}

.filter-search {
  flex: 1 1 240px;
  min-width: 200px;
}

.template-filter-reset {
  flex: 0 0 auto;
  height: 32px;
  padding: 0 12px;
  border-radius: 6px;
}

.template-filter-summary {
  display: inline-flex;
  font-size: 12px;
  line-height: 1;
  color: var(--rc-tag-text);
  white-space: nowrap;
  flex: 0 0 auto;
  align-items: center;
  gap: 10px;
  padding: 6px 12px;
  background: var(--rc-step-bg);
  border: 1px solid var(--rc-section-border);
  border-radius: 6px;
}

/* 模板分类列表（单滚动容器，彻底杜绝多层滚动条） */
.template-categories {
  display: flex;
  height: calc(100vh - 175px);
  min-height: 0;
  padding: 2px 8px 20px 0;
  overflow-y: auto;
  flex: 1 1 auto;
  flex-direction: column;
  gap: 22px;
}

.template-category {
  display: flex;
  flex-direction: column;
}

.template-category-header {
  display: flex;
  padding-bottom: 8px;
  margin-bottom: 12px;
  border-bottom: 1px solid var(--rc-section-border);
  align-items: center;
  gap: 10px;
}

.template-category-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  display: flex;
  align-items: center;
  gap: 6px;
}

.template-category-name::before {
  content: "";
  display: inline-block;
  width: 3px;
  height: 14px;
  background: var(--el-color-primary, #3b82f6);
  border-radius: 2px;
}

.template-category-count {
  font-size: 11.5px;
  padding: 2px 8px;
  border-radius: 10px;
  background: var(--rc-tag-bg);
  color: var(--rc-tag-text);
}

.template-grid-empty {
  flex: 1 1 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 260px;
  border: 1px dashed var(--rc-border-card);
  border-radius: 8px;
  background: var(--rc-bg-card-subtle);
}

/* 模板卡片网格 */
.template-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
  gap: 12px;
  overflow: visible;
  max-height: none;
  padding: 0;
}

.template-card {
  position: relative;
  display: flex;
  padding: 14px;
  cursor: pointer;
  background: var(--rc-bg-card);
  border: 1px solid var(--rc-border-card);
  border-radius: 10px;
  box-shadow: var(--rc-shadow-card);
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  flex-direction: column;
  gap: 8px;
  overflow: hidden;
}

.template-card:hover {
  background: var(--rc-bg-card-hover);
  border-color: var(--rc-border-card-hover);
  box-shadow: var(--rc-shadow-card-hover);
  transform: translateY(-2px);
}

.template-card-selected {
  background: var(--rc-bg-card-selected);
  border-color: var(--rc-border-card-selected);
  box-shadow: var(--rc-shadow-card-selected);
}

.template-card-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 20px;
}

.template-card-tag {
  font-size: 11px;
  padding: 2px 7px;
  border-radius: 4px;
  background: var(--rc-tag-bg);
  color: var(--rc-tag-text);
  font-weight: 500;
}

.template-card-selected-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  background: var(--el-color-primary, #3b82f6);
  color: #ffffff;
  border-radius: 50%;
  font-size: 11px;
  box-shadow: 0 2px 6px rgba(59, 130, 246, 0.4);
}

.template-card-name {
  overflow: hidden;
  font-size: 13.5px;
  font-weight: 600;
  line-height: 1.4;
  color: var(--el-text-color-primary);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.template-card-desc {
  display: -webkit-box;
  overflow: hidden;
  font-size: 12px;
  line-height: 1.5;
  color: var(--el-text-color-secondary);
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  min-height: 36px;
}

.template-card-meta {
  display: flex;
  margin-top: auto;
  padding-top: 6px;
  border-top: 1px solid var(--rc-section-border);
  overflow: hidden;
  font-size: 11px;
  line-height: 1.2;
  color: var(--rc-tag-text);
  white-space: nowrap;
  align-items: center;
  gap: 6px;
}

.meta-dot {
  width: 3px;
  height: 3px;
  background: var(--rc-tag-text);
  opacity: 0.5;
  border-radius: 50%;
  flex: 0 0 auto;
}

/* 步骤2: 参数面板 */
.params-panel {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 170px);
  min-height: 0;
  gap: 12px;
}

.params-header {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  background: var(--rc-bg-card);
  border: 1px solid var(--rc-border-card);
  border-radius: 8px;
}

.params-header-info {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.params-template-name {
  font-size: 15px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.params-header-tag {
  font-size: 11px;
}

.params-template-id {
  font-size: 12px;
  color: var(--rc-tag-text);
  font-family: Consolas, Monaco, monospace;
}

.params-editor-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(360px, 0.9fr);
  gap: 14px;
  flex: 1;
  min-height: 0;
  box-sizing: border-box;
}

.params-card {
  display: flex;
  flex-direction: column;
  min-height: 0;
  background: var(--rc-bg-card);
  border: 1px solid var(--rc-border-card);
  border-radius: 10px;
  box-shadow: var(--rc-shadow-card);
  overflow: hidden;
}

.params-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: var(--rc-bg-card-subtle);
  border-bottom: 1px solid var(--rc-section-border);
  flex: 0 0 auto;
}

.params-card-header-left {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.params-card-title {
  font-size: 13.5px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.params-card-subtitle {
  font-size: 11.5px;
  color: var(--rc-tag-text);
}

.params-form {
  flex: 1;
  min-width: 0;
  min-height: 0;
  padding: 16px;
  overflow-y: auto;
  box-sizing: border-box;
}

.params-el-form .el-form-item {
  margin-bottom: 16px;
}

.param-label-text {
  font-size: 13px;
  font-weight: 500;
  color: var(--el-text-color-primary);
}

.param-help-icon {
  font-size: 13px;
  color: var(--rc-tag-text);
  cursor: pointer;
  margin-left: 4px;
  vertical-align: -1px;
}

.param-help-icon:hover {
  color: var(--el-color-primary);
}

.param-json-tip {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 6px;
  padding: 6px 10px;
  font-size: 11.5px;
  line-height: 1.4;
  color: var(--rc-tag-text);
  background: var(--rc-bg-card-subtle);
  border: 1px solid var(--rc-section-border);
  border-radius: 6px;
}

.param-tip-icon {
  font-size: 13px;
  flex: 0 0 auto;
}

.params-json-body {
  flex: 1;
  min-height: 0;
  padding: 12px;
  display: flex;
  flex-direction: column;
}

.json-editor {
  flex: 1;
  height: 100%;
  display: flex;
}

.json-editor :deep(.el-textarea) {
  height: 100%;
}

.json-editor :deep(.el-textarea__inner) {
  height: 100% !important;
  font-family: "JetBrains Mono", "Fira Code", Menlo, Monaco, Consolas, "Courier New", monospace !important;
  font-size: 12.5px !important;
  line-height: 1.65 !important;
  tab-size: 2 !important;
  background: var(--rc-code-bg) !important;
  color: var(--rc-code-text) !important;
  border: 1px solid var(--rc-code-border) !important;
  border-radius: 8px !important;
  padding: 12px !important;
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.05) !important;
}

.json-editor :deep(.el-textarea__inner:focus) {
  border-color: var(--el-color-primary) !important;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2) !important;
}

.json-hint {
  font-size: 12px;
  font-weight: 400;
  color: var(--rc-tag-text);
}

.json-hint--error {
  color: var(--el-color-danger, #ef4444) !important;
  font-weight: 500;
}

/* 步骤3: 确认面板 */
.confirm-panel {
  display: flex;
  height: calc(100vh - 170px);
  min-height: 0;
  padding-right: 6px;
  overflow-y: auto;
  flex-direction: column;
  gap: 16px;
}

.confirm-section {
  padding: 16px 20px;
  background: var(--rc-bg-card);
  border: 1px solid var(--rc-border-card);
  border-radius: 10px;
  box-shadow: var(--rc-shadow-card);
}

.confirm-title {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-bottom: 10px;
  margin-bottom: 14px;
  font-size: 14px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  border-bottom: 1px solid var(--rc-section-border);
}

.confirm-title-indicator {
  width: 3px;
  height: 14px;
  background: var(--el-color-primary, #3b82f6);
  border-radius: 2px;
}

.confirm-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}

.confirm-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px 14px;
  background: var(--rc-bg-card-subtle);
  border: 1px solid var(--rc-section-border);
  border-radius: 8px;
}

.confirm-label {
  font-size: 11.5px;
  color: var(--rc-tag-text);
}

.confirm-value {
  font-size: 13.5px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.confirm-params {
  max-height: 220px;
  overflow-y: auto;
  border-radius: 8px;
  border: 1px solid var(--rc-code-border);
}

.confirm-params pre {
  padding: 14px;
  margin: 0;
  font-family: "JetBrains Mono", "Fira Code", Menlo, Monaco, Consolas, monospace;
  font-size: 12px;
  line-height: 1.6;
  word-break: break-word;
  white-space: pre-wrap;
  background: var(--rc-code-bg);
  color: var(--rc-code-text);
}

.confirm-form {
  padding-top: 4px;
}

.confirm-alert {
  margin-top: 4px;
}

/* ========== 视频详情弹窗 (扁平化) ========== */
:global(.remotion-detail-dialog.el-dialog.is-fullscreen) {
  display: flex !important;
  flex-direction: column !important;
  padding: 0 !important;
  overflow: hidden !important;
  background: var(--el-bg-color-overlay) !important;
}

:deep(.remotion-detail-dialog .el-dialog__body) {
  padding: 0 !important;
  flex: 1 1 auto !important;
  overflow: hidden !important;
  min-height: 0 !important;
}

.detail-layout {
  display: grid;
  grid-template-columns: 1fr 360px;
  height: calc(100vh - 56px);
  min-height: 0;
  overflow: hidden;
}

/* 左侧视频区 */
.detail-video-area {
  display: flex;
  align-items: center;
  justify-content: center;
  background: #000;
  min-height: 0;
  overflow: hidden;
}

.detail-video {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
  background: #000;
}

/* 右侧信息面板 */
.detail-info {
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  border-left: 1px solid var(--el-border-color-lighter);
  background: var(--el-bg-color);
}

.detail-block {
  padding: 16px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.detail-block-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 13px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  margin-bottom: 12px;
}

.detail-info-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.detail-info-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 13px;
  line-height: 1.5;
}

.detail-info-label {
  flex-shrink: 0;
  width: 60px;
  color: var(--el-text-color-secondary);
}

.detail-info-value {
  color: var(--el-text-color-primary);
  word-break: break-all;
}

.detail-info-error {
  color: var(--el-color-danger);
}

.detail-ai-content {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.detail-ai-block {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.detail-ai-label {
  font-size: 12px;
  font-weight: 500;
  color: var(--el-text-color-secondary);
}

.detail-ai-text {
  font-size: 13px;
  line-height: 1.6;
  color: var(--el-text-color-primary);
  white-space: pre-wrap;
  word-break: break-word;
}

.detail-ai-code {
  padding: 8px 10px;
  margin: 0;
  background: var(--el-fill-color-light);
  border-radius: 4px;
  font-family: Consolas, Monaco, monospace;
  font-size: 12px;
  line-height: 1.5;
  color: var(--el-text-color-primary);
  max-height: 180px;
  overflow: auto;
  word-break: break-word;
  white-space: pre-wrap;
}

.detail-json-code {
  padding: 8px 10px;
  margin: 0;
  background: var(--el-fill-color-light);
  border-radius: 4px;
  font-family: Consolas, Monaco, monospace;
  font-size: 12px;
  line-height: 1.5;
  color: var(--el-text-color-primary);
  max-height: 300px;
  overflow: auto;
  word-break: break-word;
  white-space: pre-wrap;
}

.cell-video-player {
  width: 100%;
  height: 100%;
  background: #000;
  border-radius: 6px;
  object-fit: cover;
}

.cell-video-wrapper {
  position: relative;
  display: inline-flex;
  overflow: hidden;
  background: rgb(15 23 42 / 4%);
  border-radius: 6px;
  align-items: center;
  justify-content: center;
  /* 固定宽度，高度按视频比例自适应 */
  width: 160px;
  /* 默认 16:9 横屏 */
  aspect-ratio: 16 / 9;
}

/* 竖屏 9:16 */
.cell-video-wrapper.is-portrait {
  aspect-ratio: 9 / 16;
}

/* 横屏 16:9 */
.cell-video-wrapper.is-landscape {
  aspect-ratio: 16 / 9;
}

/* 方形 1:1 */
.cell-video-wrapper.is-square {
  aspect-ratio: 1 / 1;
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

/* ==========================================================================
   Remotion AI Video Dialog (全屏极简 Studio 风格)
   ========================================================================== */
:global(.remotion-ai-dialog.el-dialog) {
  padding: 0 !important;
  margin: 0 !important;
  background: var(--el-bg-color) !important;
  overflow: hidden !important;
}

:global(.remotion-ai-dialog .el-dialog__header) {
  padding: 0 !important;
  margin-right: 0 !important;
  border-bottom: 1px solid var(--el-border-color-lighter) !important;
  background: var(--el-bg-color-overlay) !important;
}

:global(.remotion-ai-dialog .el-dialog__headerbtn) {
  display: none !important;
}

:global(.remotion-ai-dialog .el-dialog__body) {
  height: calc(100vh - 56px) !important;
  padding: 0 !important;
  overflow: hidden !important;
  background: var(--el-bg-color) !important;
}

/* 顶部工具栏 */
.ai-studio-header {
  height: 55px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  box-sizing: border-box;
}

.ai-header-brand {
  display: flex;
  align-items: center;
  gap: 8px;
}

.ai-brand-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  letter-spacing: -0.2px;
}

.ai-header-mode {
  display: flex;
  align-items: center;
}

.ai-header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.ai-close-icon-btn {
  width: 32px;
  height: 32px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  border: 1px solid var(--el-border-color-lighter);
  background: transparent;
  color: var(--el-text-color-secondary);
  cursor: pointer;
  font-size: 16px;
  transition: all 0.2s ease;
  margin-left: 4px;
}

.ai-close-icon-btn:hover {
  background: var(--el-fill-color-light);
  color: var(--el-text-color-primary);
}

/* 全屏双栏工作区 */
.ai-studio-workspace {
  display: flex;
  height: 100%;
  width: 100%;
  overflow: hidden;
}

/* 左侧：核心编辑器 */
.ai-editor-column {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  padding: 24px 32px 20px;
  box-sizing: border-box;
  background: var(--el-bg-color);
}

.ai-editor-header-hint {
  font-size: 13px;
  color: var(--el-text-color-secondary);
  margin-bottom: 12px;
  user-select: none;
}

.ai-editor-box {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.ai-minimal-textarea {
  flex: 1;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.ai-minimal-textarea :deep(.el-textarea__inner) {
  height: 100% !important;
  font-size: 15px;
  line-height: 1.8;
  padding: 16px;
  border-radius: 8px;
  resize: none;
  border-color: var(--el-border-color-lighter);
  background: var(--el-bg-color-overlay);
  color: var(--el-text-color-primary);
  font-family: inherit;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.ai-minimal-textarea :deep(.el-textarea__inner:focus) {
  border-color: var(--el-color-primary);
  box-shadow: 0 0 0 1px var(--el-color-primary-light-5);
}

.ai-editor-statusbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 10px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.statusbar-shortcut kbd {
  font-size: 11px;
  padding: 2px 5px;
  border-radius: 4px;
  background: var(--el-fill-color);
  border: 1px solid var(--el-border-color-lighter);
  color: var(--el-text-color-primary);
  font-family: inherit;
}

.statusbar-meta {
  display: flex;
  align-items: center;
  gap: 12px;
}

.word-counter {
  font-variant-numeric: tabular-nums;
}

/* 右侧：配置侧栏 */
.ai-sidebar-column {
  width: 380px;
  flex-shrink: 0;
  border-left: 1px solid var(--el-border-color-lighter);
  background: var(--el-bg-color-overlay);
  display: flex;
  flex-direction: column;
}

.ai-sidebar-scrollbar {
  height: 100%;
}

.sidebar-inner {
  padding: 24px 20px;
}

.ai-sidebar-footer {
  padding: 12px 20px;
  border-top: 1px solid var(--el-border-color-lighter);
  background: var(--el-bg-color-overlay);
  flex-shrink: 0;
}

.ai-sidebar-footer .el-button {
  width: 100%;
  height: 40px;
  font-size: 14px;
}

.sidebar-group-title {
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--el-text-color-secondary);
  margin-bottom: 14px;
}

.ai-minimal-form .el-form-item {
  margin-bottom: 16px;
}

.custom-res-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
  width: 100%;
}

.res-prefix {
  font-size: 11px;
  color: var(--el-text-color-secondary);
  font-weight: 500;
}

.res-multiply {
  font-weight: 600;
  color: var(--el-text-color-secondary);
  font-size: 14px;
}

.duration-control-wrapper {
  width: 100%;
}

.custom-duration-input-box {
  margin-top: 8px;
  width: 100%;
}

.form-dual-row {
  display: flex;
  gap: 12px;
}

.volume-slider-box {
  display: flex;
  align-items: center;
  margin-top: 8px;
  padding: 4px 10px;
  border-radius: 6px;
  background: var(--el-fill-color-light);
  font-size: 12px;
}

.volume-label {
  color: var(--el-text-color-secondary);
  white-space: nowrap;
}

.volume-val {
  font-weight: 600;
  min-width: 36px;
  text-align: right;
  color: var(--el-text-color-primary);
}

/* 高级参数折叠面板 */
.ai-minimal-collapse {
  border: none;
  border-top: 1px solid var(--el-border-color-lighter);
}

.ai-minimal-collapse :deep(.el-collapse-item__header) {
  font-size: 13px;
  font-weight: 500;
  color: var(--el-text-color-primary);
  background: transparent;
  height: 40px;
  line-height: 40px;
  border-bottom: none;
}

.ai-minimal-collapse :deep(.el-collapse-item__wrap) {
  background: transparent;
  border-bottom: none;
}

.ai-minimal-collapse :deep(.el-collapse-item__content) {
  padding-bottom: 0;
}

.template-btns-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  flex-wrap: wrap;
  gap: 6px;
}

.template-btns-list {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.code-textarea :deep(.el-textarea__inner) {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace !important;
  font-size: 12px !important;
  line-height: 1.6 !important;
  background: var(--el-fill-color-lighter);
  border-radius: 6px;
}

.params-spec-table {
  font-size: 11px;
  margin-top: 8px;
  padding: 8px 10px;
  border-radius: 6px;
  background: var(--el-fill-color-light);
  border: 1px solid var(--el-border-color-lighter);
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.spec-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: var(--el-text-color-secondary);
}

.spec-row code {
  color: var(--el-color-primary);
  font-size: 11px;
}

/* ==========================================================================
   Remotion Preview Dialog (极简全屏)
   ========================================================================== */
:global(.remotion-preview-dialog.el-dialog.is-fullscreen) {
  display: flex !important;
  flex-direction: column !important;
  padding: 0 !important;
  overflow: hidden !important;
  background: var(--el-bg-color-overlay) !important;
}

:global(.remotion-preview-dialog .el-dialog__header) {
  position: relative !important;
  padding: 12px 20px !important;
  margin-right: 0 !important;
  border-bottom: 1px solid var(--el-border-color-lighter) !important;
  flex-shrink: 0 !important;
  background: var(--el-bg-color-overlay) !important;
}

:global(.remotion-preview-dialog .el-dialog__headerbtn) {
  position: absolute !important;
  top: 50% !important;
  transform: translateY(-50%) !important;
  right: 16px !important;
  font-size: 18px !important;
  width: 32px !important;
  height: 32px !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  color: var(--el-text-color-regular) !important;
  cursor: pointer !important;
  z-index: 10 !important;
  transition: color 0.2s ease !important;
}

:global(.remotion-preview-dialog .el-dialog__headerbtn:hover) {
  color: var(--el-color-primary) !important;
}

:global(.remotion-preview-dialog .el-dialog__headerbtn .el-dialog__close) {
  font-size: 18px !important;
  color: inherit !important;
}

:global(.remotion-preview-dialog .el-dialog__body) {
  padding: 0 !important;
  flex: 1 1 auto !important;
  min-height: 0 !important;
  overflow: hidden !important;
  background: #000 !important;
}

.preview-simple-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-right: 48px;
  gap: 16px;
}

.preview-simple-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.preview-simple-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.preview-simple-body {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  background: #000;
  overflow: hidden;
}

.preview-simple-video {
  display: block;
  max-width: 100%;
  max-height: 100%;
  width: auto;
  height: auto;
  object-fit: contain;
  outline: none;
}

/* Table Video Cell Hover Enhancement */
.cell-video-hover-badge {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s ease;
  pointer-events: none;
}

.cell-video-wrapper:hover .cell-video-hover-badge {
  opacity: 1;
}

.cell-video-play-icon {
  font-size: 28px;
  color: #ffffff;
  filter: drop-shadow(0 2px 6px rgba(0, 0, 0, 0.6));
}

/* ==================== Remotion Skills Styles ==================== */
.sidebar-group-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.sidebar-group-header .sidebar-group-title {
  margin-bottom: 0;
}

.sidebar-group-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.skills-selector-grid {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
}

.skill-chip-card {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 8px;
  background: var(--el-fill-color-light);
  border: 1px solid var(--el-border-color-lighter);
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  user-select: none;
  position: relative;
}

.skill-chip-card:hover {
  border-color: var(--el-color-primary-light-5);
  background: var(--el-fill-color);
  transform: translateY(-1px);
}

.skill-chip-card.active {
  background: rgba(var(--el-color-primary-rgb, 64, 158, 255), 0.08);
  border-color: var(--el-color-primary);
  box-shadow: 0 0 0 1px var(--el-color-primary);
}

.skill-chip-icon {
  font-size: 20px;
  line-height: 1;
  flex-shrink: 0;
  margin-top: 2px;
}

.skill-chip-info {
  flex: 1;
  min-width: 0;
}

.skill-chip-top {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 2px;
}

.skill-chip-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.skill-sys-badge {
  font-size: 10px;
  line-height: 1.4;
  padding: 0 4px;
  border-radius: 4px;
  background: var(--el-color-info-light-8);
  color: var(--el-color-info);
  font-weight: 500;
  flex-shrink: 0;
}

.skill-chip-desc {
  font-size: 11px;
  line-height: 1.4;
  color: var(--el-text-color-secondary);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.skill-chip-check {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 1px solid var(--el-border-color);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  color: #fff;
  flex-shrink: 0;
  margin-top: 2px;
  transition: all 0.2s ease;
}

.skill-chip-card.active .skill-chip-check {
  background: var(--el-color-primary);
  border-color: var(--el-color-primary);
}

/* Skills Manager Drawer Styles */
.skill-drawer-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  gap: 16px;
}

.skill-drawer-header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.skill-category-tabs {
  margin-bottom: 4px;
}

.skill-list-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow-y: auto;
  padding-right: 4px;
  max-height: calc(100vh - 200px);
}

.skill-manage-card {
  border: 1px solid var(--el-border-color-lighter);
  background: var(--el-bg-color-overlay);
  border-radius: 10px;
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  transition: all 0.2s ease;
}

.skill-manage-card:hover {
  border-color: var(--el-color-primary-light-5);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.skill-manage-card.disabled {
  opacity: 0.6;
}

.skill-manage-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.skill-manage-title-box {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 0;
}

.skill-manage-icon {
  font-size: 26px;
  line-height: 1;
  flex-shrink: 0;
}

.skill-manage-title-meta {
  flex: 1;
  min-width: 0;
}

.skill-manage-name {
  font-size: 15px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  margin-bottom: 3px;
}

.skill-manage-code {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
}

.skill-manage-code code {
  font-family: var(--el-font-family-monospace, monospace);
  color: var(--el-text-color-secondary);
  background: var(--el-fill-color);
  padding: 1px 5px;
  border-radius: 4px;
}

.skill-manage-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.skill-manage-desc {
  font-size: 13px;
  line-height: 1.5;
  color: var(--el-text-color-regular);
}

.skill-manage-prompt-preview {
  background: var(--el-fill-color-light);
  border-radius: 6px;
  padding: 8px 12px;
}

.prompt-preview-title {
  font-size: 11px;
  font-weight: 600;
  color: var(--el-text-color-secondary);
  margin-bottom: 4px;
}

.prompt-code-block {
  margin: 0;
  font-family: var(--el-font-family-monospace, monospace);
  font-size: 11px;
  line-height: 1.4;
  color: var(--el-text-color-regular);
  white-space: pre-wrap;
  word-break: break-all;
}

.import-tips-banner {
  background: rgba(var(--el-color-primary-rgb, 64, 158, 255), 0.08);
  border: 1px solid var(--el-color-primary-light-7);
  border-radius: 6px;
  padding: 10px 14px;
  font-size: 12px;
  line-height: 1.6;
  color: var(--el-text-color-regular);
  margin-bottom: 14px;
}

.import-tips-banner code {
  background: rgba(var(--el-color-primary-rgb, 64, 158, 255), 0.15);
  color: var(--el-color-primary);
  padding: 1px 4px;
  border-radius: 3px;
  font-weight: 600;
}

.skill-select-label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.skill-select-label-title {
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.skill-count-badge {
  margin-left: 8px;
}

.skill-label-actions {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 8px;
}

.selected-skills-tags-wrap {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  margin-top: 8px;
  padding: 6px 10px;
  background: var(--el-fill-color-lighter, #f8fafc);
  border-radius: 6px;
  border: 1px solid var(--el-border-color-lighter, #e2e8f0);
}

:global(html.dark) .selected-skills-tags-wrap {
  background: #181818;
  border-color: rgba(255, 255, 255, 0.08);
}

.selected-skill-pill {
  cursor: default;
}

.pill-category {
  opacity: 0.8;
  margin-right: 3px;
  font-size: 10px;
}
</style>

<style lang="scss">
.skill-multi-select-dropdown {
  min-width: 440px !important;
  max-width: 580px !important;

  .el-select-group__title {
    font-size: 11px;
    font-weight: 600;
    color: var(--el-text-color-secondary, #64748b);
    padding: 6px 14px 4px;
    line-height: 18px;
    background: var(--el-fill-color-lighter, #f8fafc);
    border-bottom: 1px solid var(--el-border-color-extra-light, #f1f5f9);
    letter-spacing: 0.3px;
  }

  .el-select-group__wrap:not(:last-of-type) {
    border-bottom: 1px dashed var(--el-border-color-lighter, #e2e8f0);
    padding-bottom: 2px;
    margin-bottom: 2px;
  }

  .el-select-dropdown__item {
    height: 38px !important;
    line-height: 38px !important;
    padding: 0 36px 0 14px !important;
    display: flex !important;
    align-items: center !important;
    box-sizing: border-box;

    &.is-hovering {
      background-color: var(--el-fill-color-light, #f1f5f9);
    }

    &.is-selected {
      color: var(--el-color-primary, #409eff);
      font-weight: 500;
    }
  }

  .skill-dropdown-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    height: 100%;
    gap: 12px;
  }

  .skill-dropdown-name {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 13px;
    color: var(--el-text-color-primary);
  }

  .skill-dropdown-meta {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    flex-shrink: 0;
  }

  .skill-dropdown-code {
    font-family: var(--el-font-family-monospace, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace);
    font-size: 11px;
    color: var(--el-color-primary);
    background: color-mix(in srgb, var(--el-color-primary) 10%, transparent);
    padding: 0 6px;
    border-radius: 4px;
    height: 20px;
    line-height: 18px;
    border: 1px solid color-mix(in srgb, var(--el-color-primary) 28%, transparent);
    box-sizing: border-box;
    display: inline-block;
  }

  .skill-dropdown-sys {
    font-size: 10px;
    color: var(--el-text-color-secondary);
    background: var(--el-fill-color, #f1f5f9);
    padding: 0 5px;
    border-radius: 4px;
    height: 20px;
    line-height: 18px;
    border: 1px solid var(--el-border-color-lighter, #e2e8f0);
    font-weight: 500;
    box-sizing: border-box;
    display: inline-block;
  }
}

html.dark .skill-multi-select-dropdown {
  .el-select-group__title {
    color: rgba(255, 255, 255, 0.55);
    background: #181818;
    border-bottom-color: rgba(255, 255, 255, 0.08);
  }

  .el-select-group__wrap:not(:last-of-type) {
    border-bottom-color: rgba(255, 255, 255, 0.08);
  }

  .el-select-dropdown__item {
    &.is-hovering {
      background-color: rgba(255, 255, 255, 0.06);
    }
    &.is-selected {
      color: var(--el-color-primary-light-3, var(--el-color-primary));
    }
  }

  .skill-dropdown-name {
    color: rgba(255, 255, 255, 0.92);
  }

  .skill-dropdown-code {
    color: var(--el-color-primary-light-3, var(--el-color-primary));
    background: color-mix(in srgb, var(--el-color-primary) 18%, transparent);
    border-color: color-mix(in srgb, var(--el-color-primary) 38%, transparent);
  }

  .skill-dropdown-sys {
    color: #cbd5e1;
    background: rgba(255, 255, 255, 0.06);
    border-color: rgba(255, 255, 255, 0.12);
  }
}

.aspect-ratio-select-dropdown {
  min-width: 400px !important;
  max-width: 540px !important;

  .el-select-group__title {
    font-size: 11px;
    font-weight: 600;
    color: var(--el-text-color-secondary, #64748b);
    padding: 6px 14px 4px;
    line-height: 18px;
    background: var(--el-fill-color-lighter, #f8fafc);
    border-bottom: 1px solid var(--el-border-color-extra-light, #f1f5f9);
    letter-spacing: 0.3px;
  }

  .el-select-group__wrap:not(:last-of-type) {
    border-bottom: 1px dashed var(--el-border-color-lighter, #e2e8f0);
    padding-bottom: 2px;
    margin-bottom: 2px;
  }

  .el-select-dropdown__item {
    height: 38px !important;
    line-height: 38px !important;
    padding: 0 14px !important;
    display: flex !important;
    align-items: center !important;
    box-sizing: border-box;

    &.is-hovering {
      background-color: var(--el-fill-color-light, #f1f5f9);
    }

    &.is-selected {
      color: var(--el-color-primary, #409eff);
      font-weight: 500;
    }
  }

  .aspect-option-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    height: 100%;
    gap: 10px;
  }

  .aspect-option-left {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
    flex: 1;
  }

  .aspect-ratio-badge {
    font-family: var(--el-font-family-monospace, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace);
    font-size: 11px;
    font-weight: 600;
    color: var(--el-color-primary);
    background: color-mix(in srgb, var(--el-color-primary) 10%, transparent);
    padding: 0 6px;
    border-radius: 4px;
    height: 20px;
    line-height: 18px;
    border: 1px solid color-mix(in srgb, var(--el-color-primary) 28%, transparent);
    box-sizing: border-box;
    display: inline-block;
    flex-shrink: 0;
  }

  .aspect-option-label {
    font-size: 13px;
    color: var(--el-text-color-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .aspect-res-tag {
    font-size: 11px;
    color: var(--el-text-color-secondary);
    background: var(--el-fill-color, #f1f5f9);
    padding: 0 6px;
    border-radius: 4px;
    height: 20px;
    line-height: 18px;
    border: 1px solid var(--el-border-color-lighter, #e2e8f0);
    box-sizing: border-box;
    flex-shrink: 0;
    white-space: nowrap;
  }
}

html.dark .aspect-ratio-select-dropdown {
  .el-select-group__title {
    color: rgba(255, 255, 255, 0.55);
    background: #181818;
    border-bottom-color: rgba(255, 255, 255, 0.08);
  }

  .el-select-group__wrap:not(:last-of-type) {
    border-bottom-color: rgba(255, 255, 255, 0.08);
  }

  .el-select-dropdown__item {
    &.is-hovering {
      background-color: rgba(255, 255, 255, 0.06);
    }
    &.is-selected {
      color: var(--el-color-primary-light-3, var(--el-color-primary));
    }
  }

  .aspect-option-label {
    color: rgba(255, 255, 255, 0.92);
  }

  .aspect-ratio-badge {
    color: var(--el-color-primary-light-3, var(--el-color-primary));
    background: color-mix(in srgb, var(--el-color-primary) 18%, transparent);
    border-color: color-mix(in srgb, var(--el-color-primary) 38%, transparent);
  }

  .aspect-res-tag {
    color: #cbd5e1;
    background: rgba(255, 255, 255, 0.06);
    border-color: rgba(255, 255, 255, 0.12);
  }
}

.duration-select-dropdown {
  min-width: 380px !important;
  max-width: 520px !important;

  .el-select-dropdown__item {
    height: 38px !important;
    line-height: 38px !important;
    padding: 0 14px !important;
    display: flex !important;
    align-items: center !important;
    box-sizing: border-box;

    &.is-hovering {
      background-color: var(--el-fill-color-light, #f1f5f9);
    }

    &.is-selected {
      color: var(--el-color-primary, #409eff);
      font-weight: 500;
    }
  }

  .duration-option-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    height: 100%;
    gap: 12px;
  }

  .duration-option-label {
    font-size: 13px;
    color: var(--el-text-color-primary);
    font-weight: 500;
  }

  .duration-option-desc {
    font-size: 11px;
    color: var(--el-text-color-secondary);
    background: var(--el-fill-color, #f1f5f9);
    padding: 0 6px;
    border-radius: 4px;
    height: 20px;
    line-height: 18px;
    border: 1px solid var(--el-border-color-lighter, #e2e8f0);
    box-sizing: border-box;
    white-space: nowrap;
  }
}

html.dark .duration-select-dropdown {
  .el-select-dropdown__item {
    &.is-hovering {
      background-color: rgba(255, 255, 255, 0.06);
    }
    &.is-selected {
      color: var(--el-color-primary-light-3, var(--el-color-primary));
    }
  }

  .duration-option-label {
    color: rgba(255, 255, 255, 0.92);
  }

  .duration-option-desc {
    color: #cbd5e1;
    background: rgba(255, 255, 255, 0.06);
    border-color: rgba(255, 255, 255, 0.12);
  }
}
</style>

