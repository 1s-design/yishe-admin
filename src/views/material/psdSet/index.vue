<template>
  <ContentWrap :plain="true" class="psd-set-page">
    <ListPageLayout class="psd-set-page__layout">
      <template #filter>
        <div class="list-page-filter list-page-filter--flat psd-set-page__filter">
          <el-form :model="queryParams" label-position="top" class="list-page-search-form">
            <el-row :gutter="12" class="list-page-search-form__row">
              <el-col class="list-page-search-form__col--narrow" :xs="24" :sm="12" :md="8" :lg="4">
                <el-form-item :label="t('common.id')">
                  <el-input v-model="queryParams.id" size="small" :placeholder="t('psdSet.psdSetId')" clearable
                    @change="handleIdChange" />
                </el-form-item>
              </el-col>
              <el-col class="list-page-search-form__col--wide" :xs="24" :sm="12" :md="8" :lg="5">
                <el-form-item :label="t('psdSet.keyword')">
                  <el-input v-model="queryParams.keyword" size="small" :placeholder="t('psdSet.keywordPlaceholder')" clearable
                    @change="handleKeywordChange" />
                </el-form-item>
              </el-col>
              <el-col class="list-page-search-form__col--narrow" :xs="24" :sm="12" :md="8" :lg="4">
                <el-form-item :label="t('psdSet.imageId')">
                  <el-input v-model="queryParams.stickerId" size="small" :placeholder="t('psdSet.imageIdPlaceholder')" clearable
                    @change="handleStickerIdChange" />
                </el-form-item>
              </el-col>
              <el-col class="list-page-search-form__col--narrow" :xs="24" :sm="12" :md="8" :lg="4">
                <el-form-item :label="t('psdSet.psdTemplateId')">
                  <el-input v-model="queryParams.psdTemplateId" size="small" :placeholder="t('psdSet.psdTemplateId')" clearable
                    @change="handlePsdTemplateIdChange" />
                </el-form-item>
              </el-col>
              <el-col class="list-page-search-form__col--narrow" :xs="24" :sm="12" :md="8" :lg="4">
                <el-form-item :label="t('common.status')">
                  <el-select v-model="queryParams.status" size="small" :placeholder="t('psdSet.allStatus')" clearable @change="getList">
                    <el-option v-for="item in statusOptions" :key="item.value" :label="item.label"
                      :value="item.value" />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col class="list-page-search-form__col--narrow" :xs="24" :sm="12" :md="8" :lg="4">
                <el-form-item :label="t('psdSet.sortType')">
                  <el-select v-model="queryParams.sortingFields" size="small" @change="getList">
                    <el-option v-for="item in sortTypeOptions" :key="item.value" :label="item.label"
                      :value="item.value" />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col class="list-page-search-form__col--wide" :xs="24" :sm="12" :md="12" :lg="7">
                <el-form-item :label="t('common.createTime')">
                  <el-date-picker v-model="dateRange" size="small" type="datetimerange" :range-separator="t('psdSet.to')"
                    :start-placeholder="t('common.startTimeText')" :end-placeholder="t('common.endTimeText')" format="YYYY-MM-DD HH:mm:ss"
                    value-format="YYYY-MM-DD HH:mm:ss" :shortcuts="dateShortcuts" @change="handleDateRangeChange" />
                </el-form-item>
              </el-col>
              <el-col class="list-page-search-form__col--wide" :xs="24" :sm="12" :md="12" :lg="6">
                <el-form-item :label="t('psdSet.deduplicateConfig')">
                  <el-select v-model="queryParams.publishUsageConfigId" size="small" :placeholder="t('psdSet.deduplicateConfigPlaceholder')"
                    clearable filterable multiple collapse-tags collapse-tags-tooltip
                    @change="handlePublishUsageViewChange">
                    <el-option v-for="item in publishUsageConfigOptions" :key="item.id"
                      :label="formatPublishUsageConfigLabel(item)" :value="item.id" />
                  </el-select>
                </el-form-item>
              </el-col>
            </el-row>
            <div class="list-page-search-form__actions psd-set-page__actions">
              <el-button size="small" type="primary" :icon="Search" :loading="loading"
                @click="() => getList()">{{ t('common.search') }}</el-button>
              <el-dropdown trigger="click" :disabled="!selectedIds.length">
                <el-button size="small" :disabled="!selectedIds.length" :loading="batchUpdatingStatus">
                  {{ t('psdSet.batchUpdateStatus', { count: selectedIds.length }) }}
                </el-button>
                <template #dropdown>
                  <el-dropdown-menu class="operation-menu-compact">
                    <el-dropdown-item @click="() => handleBatchUpdateStatus('pending')">{{ t('psdSet.statusPending') }}</el-dropdown-item>
                    <el-dropdown-item @click="() => handleBatchUpdateStatus('processing')">{{ t('psdSet.statusProcessing') }}</el-dropdown-item>
                    <el-dropdown-item @click="() => handleBatchUpdateStatus('completed')">{{ t('psdSet.statusCompleted') }}</el-dropdown-item>
                    <el-dropdown-item @click="() => handleBatchUpdateStatus('failed')">{{ t('psdSet.statusFailed') }}</el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
              <el-button size="small" type="success" :disabled="!selectedIds.length" :loading="batchGeneratingProducts"
                @click="handleBatchGenerateProduct">
                {{ t('psdSet.batchGenerateProduct', { count: selectedIds.length }) }}
              </el-button>
              <el-button size="small" type="primary" :disabled="!selectedIds.length" :loading="publishConfigSubmitting"
                @click="handleBatchCreatePublishTask">
                {{ t('psdSet.batchCreatePublishTask', { count: selectedIds.length }) }}
              </el-button>
              <el-button size="small" type="danger" @click="handleBatchDelete">
                {{ t('psdSet.batchDelete', { count: selectedIds.length }) }}
              </el-button>

              <div class="psd-set-page__auto-dispatch-bar">
                <div class="psd-set-page__auto-dispatch-indicator" :class="`is-${psdSetSchedulerIndicator.tone}`">
                  <span class="psd-set-page__auto-dispatch-dot" />
                  <span class="psd-set-page__auto-dispatch-indicator-text">{{ psdSetSchedulerIndicator.text }}</span>
                </div>

                <div class="psd-set-page__auto-dispatch-content">
                  <template v-if="autoDispatchProcessingRows.length">
                    <span v-for="item in autoDispatchProcessingRows" :key="item.key"
                      class="psd-set-page__auto-dispatch-task-chip">
                      <span class="psd-set-page__chip-client">{{ item.clientLabel }}</span>
                      <span class="psd-set-page__chip-task-id">{{ item.taskId }}</span>
                      <span v-if="item.stepLabel" class="psd-set-page__chip-step">{{ item.stepLabel }}</span>
                    </span>
                  </template>
                  <template v-else>
                    <span v-if="psdSetAutoDispatchTargetLabel" class="psd-set-page__auto-dispatch-target" :title="psdSetAutoDispatchTargetLabel">
                      {{ psdSetAutoDispatchTargetLabel }}
                    </span>
                    <span v-if="psdSetSchedulerRuntimeSummary" class="psd-set-page__auto-dispatch-interval">
                      {{ psdSetSchedulerRuntimeSummary }}
                    </span>
                    <span class="psd-set-page__auto-dispatch-pending">
                      {{ t('psdSet.pendingCount', { count: schedulerClientStats.pending }) }}
                    </span>
                  </template>
                </div>

                <div class="psd-set-page__auto-dispatch-actions">
                  <el-button size="small" :type="userAutoSchedulingEnabled ? 'danger' : 'success'"
                    :loading="userAutoSchedulingLoading"
                    plain
                    @click="handleToggleUserAutoScheduling(!userAutoSchedulingEnabled)">
                    {{ userAutoSchedulingEnabled ? t('psdSet.disableAutoProduction') : t('psdSet.enableAutoProduction') }}
                  </el-button>
                  <el-button size="small" :loading="resettingPsRuntime" @click="handleResetAllPsAutomationRuntime">
                    {{ t('psdSet.resetStatus') }}
                  </el-button>
                </div>
              </div>
            </div>
          </el-form>
        </div>
      </template>

      <template #table>
        <div
          class="common-table list-page-panel list-page-panel--flat list-page-table-panel list-page-table-panel--flat">
          <div class="list-page-table-panel__body psd-set-page__table-body">
            <vxe-grid ref="psdSetGridRef" v-bind="gridOptions" :max-height="gridOptions.maxHeight" :data="dataSource" :loading="loading"
              :row-class-name="psdSetRowClassName" @checkbox-change="onSelectionChange"
              @checkbox-all="onSelectionChange" @cell-click="handlePsdSetCellClick">
              <template #idSlot="{ row }">
                <div class="table-cell-copyable" @click="copyId(row.id)">
                  <span class="table-cell-id">{{ row.id }}</span>
                  <el-icon>
                    <DocumentCopy />
                  </el-icon>
                </div>
              </template>
              <template #stickersCountSlot="{ row }">
                <div class="flex items-center gap-2">
                  <el-tag :type="getStickersCount(row) > 1 ? 'success' : 'info'" size="small" effect="plain"
                    class="material-association-tag">
                    <span class="tag-text">{{
                      getStickersCount(row) > 1 ? t('psdSet.multiMaterials', { count: getStickersCount(row) }) : t('psdSet.singleMaterial')
                      }}</span>
                  </el-tag>
                </div>
              </template>
              <template #statusSlot="{ row }">
                <div class="status-cell">
                  <el-tag :type="statusTagType(getPsdSetDisplayStatus(row))" effect="plain" size="small">
                    {{ statusLabel(getPsdSetDisplayStatus(row)) }}
                  </el-tag>
                </div>
              </template>
              <template #imagesSlot="{ row }">
                <PsdSetTableImageCell v-memo="[row.id, row.name, row.images, getPreviewImageIndex(row)]"
                  :row-id="row.id" :name="row.name" :images="row.images" :current-index="getPreviewImageIndex(row)"
                  @shift="(delta) => shiftPreviewImage(row, delta)"
                  @preview="(index) => openPsdSetImagePreview(row, index)"
                  @download="() => handleDownloadPsdSetImages(row)" />
              </template>
              <template #configSlot="{ row }">
                <div class="flex items-center gap-2">
                  <el-tag v-if="row.hasConfig" type="info" size="small" effect="plain" class="cursor-pointer"
                    @click="() => handleViewConfig(row)">
                    {{ t('psdSet.configured') }}
                  </el-tag>
                  <span v-else class="table-cell-empty">{{ t('psdSet.notConfigured') }}</span>
                </div>
              </template>
              <!-- 关联信息插槽：合并显示贴纸详情和PSD模板详情 -->
              <template #operationSlot="{ row }">
                <el-dropdown class="operation-dropdown" placement="bottom-end">
                  <el-button type="primary" link size="small" class="operation-trigger-button">
                    {{ t('common.operation') }}
                  </el-button>
                  <template #dropdown>
                    <el-dropdown-menu class="operation-menu-compact">
                      <el-dropdown-item @click="() => handleViewDetail(row)">{{ t('psdSet.viewDetail') }}</el-dropdown-item>
                      <el-dropdown-item @click="() => handleEditConfigDirectly(row)">{{ t('psdSet.editConfig') }}</el-dropdown-item>
                      <el-dropdown-item
                        divided
                        :disabled="!isClientConnected || startingProductionId === row.id"
                        @click="() => handleStartProduction(row)"
                      >
                        {{ t('psdSet.startProduction') }}
                      </el-dropdown-item>
                      <el-dropdown-item divided @click="() => updateRowStatus(row, 'pending')">{{ t('psdSet.markPending') }}</el-dropdown-item>
                      <el-dropdown-item @click="() => updateRowStatus(row, 'processing')">{{ t('psdSet.markProcessing') }}</el-dropdown-item>
                      <el-dropdown-item @click="() => updateRowStatus(row, 'completed')">{{ t('psdSet.markCompleted') }}</el-dropdown-item>
                      <el-dropdown-item @click="() => updateRowStatus(row, 'failed')">{{ t('psdSet.markFailed') }}</el-dropdown-item>
                      <el-dropdown-item
                        divided
                        :disabled="generatingProductId === row.id"
                        @click="() => handleToProduct(row)"
                      >
                        {{ t('psdSet.generateProduct') }}
                      </el-dropdown-item>
                      <el-dropdown-item @click="() => handleCreatePublishTask(row)">{{ t('psdSet.generatePublishTask') }}</el-dropdown-item>
                      <el-dropdown-item divided @click="() => handleViewProducts(row)">{{ t('psdSet.viewProducts') }}</el-dropdown-item>
                      <el-dropdown-item @click="() => handleViewPublishTasks(row)">{{ t('psdSet.viewPublishTasks') }}</el-dropdown-item>
                      <el-dropdown-item @click="() => handleViewPublishUsageRecords(row)">{{ t('psdSet.viewPublishUsageRecords') }}</el-dropdown-item>
                      <el-dropdown-item
                        divided
                        class="operation-menu-item--danger"
                        @click="() => handleDelete(row)"
                      >
                        {{ t('common.delete') }}
                      </el-dropdown-item>
                    </el-dropdown-menu>
                  </template>
                </el-dropdown>
              </template>
            </vxe-grid>
          </div>
        </div>
      </template>

      <template #pagination>
        <div
          class="pagination-container list-page-panel list-page-panel--flat list-page-table-panel__pagination list-page-table-panel__pagination--flat">
          <pagination :total="total" v-model:page="queryParams.currentPage" v-model:limit="queryParams.pageSize"
            @pagination="() => getList()" />
        </div>
      </template>
    </ListPageLayout>

    <el-dialog v-model="detailDialogVisible" fullscreen :show-close="true" :destroy-on-close="false"
      class="psd-set-detail-dialog" @closed="handleCloseDetailDialog">
      <template #header>
        <div class="psd-set-detail-header">
          <div class="psd-set-detail-heading">
            <div class="psd-set-detail-title">{{ detailData?.name || t('psdSet.psdSetDetail') }}</div>
            <div class="psd-set-detail-subtitle">
              {{ t('psdSet.createdAt', { time: formatTimestamp(detailData?.createTime) }) }}
              <span v-if="detailData?.uploader?.account || detailData?.uploader?.name || detailData?.userId">
                · {{ detailData?.uploader?.account || detailData?.uploader?.name || detailData?.userId }}
              </span>
            </div>
          </div>
          <div class="psd-set-detail-header__tags" v-if="detailData">
            <el-tag :type="statusTagType(getPsdSetDisplayStatus(detailData))" effect="plain" size="small">{{
              statusLabel(getPsdSetDisplayStatus(detailData))
              }}</el-tag>
            <el-tag type="info" effect="plain" size="small">{{ t('psdSet.images', { count: detailImages.length }) }}</el-tag>
            <el-tag type="info" effect="plain" size="small">{{ t('psdSet.materials', { count: detailStickers.length }) }}</el-tag>
            <el-tag v-if="detailAutomationCount" type="warning" effect="plain" size="small">
              {{ t('psdSet.autoTasks', { count: detailAutomationCount }) }}
            </el-tag>
          </div>
        </div>
      </template>

      <div v-loading="detailLoading" class="psd-set-detail-layout" v-if="detailData">
        <section class="psd-set-detail-top">
          <div class="psd-set-detail-panel psd-set-detail-panel--hero">
            <div class="detail-header">
              <span class="detail-label">{{ t('psdSet.finishedImages') }}</span>
              <span class="detail-count">{{ t('psdSet.pieceCount', { count: detailImages.length }) }}</span>
            </div>
            <div class="psd-set-detail-image-grid">
              <div v-for="(img, idx) in detailImages" :key="idx" class="psd-set-detail-image-card">
                <el-image v-if="img" :src="img" :preview-src-list="detailImages" :initial-index="Number(idx)"
                  :preview-teleported="true" :hide-on-click-modal="false" class="psd-set-detail-image" fit="contain"
                  loading="lazy" />
                <span class="psd-set-detail-image-index">{{ Number(idx) + 1 }}</span>
              </div>
              <el-empty v-if="!detailImages.length" :description="t('psdSet.noPsdSetImages')" :image-size="80" />
            </div>
          </div>

          <div class="psd-set-detail-panel psd-set-detail-panel--compact">
            <div class="detail-header">
              <span class="detail-label">{{ t('psdSet.psdSetInfo') }}</span>
            </div>
            <div class="psd-set-detail-summary">
              <div class="psd-set-detail-summary__item">
                <span class="info-label">{{ t('psdSet.psdSetId') }}</span>
                <span class="info-value cursor-pointer" @click="copyId(detailData.id)">{{
                  detailData.id || "-"
                  }}</span>
              </div>
              <div class="psd-set-detail-summary__item">
                <span class="info-label">{{ t('common.status') }}</span>
                <el-tag :type="statusTagType(getPsdSetDisplayStatus(detailData))" size="small" effect="plain">
                  {{ statusLabel(getPsdSetDisplayStatus(detailData)) }}
                </el-tag>
              </div>
              <div class="psd-set-detail-summary__item">
                <span class="info-label">{{ t('psdSet.uploader') }}</span>
                <span class="info-value">{{
                  detailData?.uploader?.account ||
                  detailData?.uploader?.name ||
                  detailData?.userId ||
                  "-"
                  }}</span>
              </div>
              <div class="psd-set-detail-summary__item">
                <span class="info-label">{{ t('psdSet.processingTime') }}</span>
                <span class="info-value">{{
                  formatProcessingTime(detailData.processingTime)
                  }}</span>
              </div>
              <div class="psd-set-detail-summary__item">
                <span class="info-label">{{ t('common.createTime') }}</span>
                <span class="info-value">{{ formatTimestamp(detailData.createTime) }}</span>
              </div>
              <div class="psd-set-detail-summary__item">
                <span class="info-label">{{ t('common.updateTime') }}</span>
                <span class="info-value">{{ formatTimestamp(detailData.updateTime) }}</span>
              </div>
              <div class="psd-set-detail-summary__item">
                <span class="info-label">{{ t('psdSet.publishTaskCount') }}</span>
                <span class="info-value">{{ detailPublishTaskCount }}</span>
              </div>
            </div>
            <div class="psd-set-detail-text-grid">
              <div class="psd-set-detail-text-card">
                <div class="info-label">{{ t('common.description') }}</div>
                <div class="info-value">{{ detailData.description || "-" }}</div>
              </div>
              <div class="psd-set-detail-text-card">
                <div class="info-label">{{ t('psdSet.keyword') }}</div>
                <div class="info-value">{{ detailData.keywords || "-" }}</div>
              </div>
              <div class="psd-set-detail-text-card">
                <div class="info-label">{{ t('psdSet.statusDescription') }}</div>
                <div class="info-value">{{ resolvePsdSetStatusMessage(detailData) }}</div>
              </div>
            </div>
          </div>
        </section>

        <section class="psd-set-detail-middle">
          <!-- 关联素材图片信息 -->
          <div class="psd-set-detail-panel psd-set-detail-panel--balanced">
            <div class="detail-header">
              <div class="detail-header__left">
                <span class="detail-label">{{ t('psdSet.imageInfo') }}</span>
                <span class="detail-count">{{ t('psdSet.itemCount', { count: detailStickers.length }) }}</span>
              </div>
              <div class="detail-header__right" v-if="detailStickers.length > 1">
                <el-tag size="small" type="primary" effect="plain">{{ t('psdSet.multiMaterials') }}</el-tag>
              </div>
            </div>

            <div v-if="detailStickers.length" class="detail-entity-list">
              <div v-for="sticker in detailStickers" :key="sticker.id" class="detail-entity-card">
                <div class="detail-entity-card__thumb">
                  <el-image v-if="sticker.url" :src="sticker.url"
                    :preview-src-list="detailStickers.map((s) => s.url).filter(Boolean)"
                    :initial-index="detailStickers.findIndex((s) => s.id === sticker.id)"
                    :preview-teleported="true"
                    :hide-on-click-modal="false" fit="contain" class="detail-entity-card__image" />
                  <span v-else class="detail-entity-card__empty-thumb">{{ t('psdSet.noImage') }}</span>
                </div>

                <div class="detail-entity-card__main">
                  <div class="detail-entity-card__head">
                    <span class="detail-entity-card__name" :title="sticker.name">{{ sticker.name || t('psdSet.unnamedSticker') }}</span>
                    <el-tag v-if="sticker.category" size="small" type="info" effect="light">{{ sticker.category }}</el-tag>
                  </div>

                  <div class="detail-entity-grid">
                    <div class="detail-entity-grid__item">
                      <span class="detail-field-label">ID:</span>
                      <span class="detail-field-value detail-field-value--code cursor-pointer" @click="copyId(sticker.id)" :title="'点击复制 ID: ' + sticker.id">
                        {{ sticker.id || '-' }}
                        <el-icon class="copy-icon"><DocumentCopy /></el-icon>
                      </span>
                    </div>

                    <div v-if="sticker.code" class="detail-entity-grid__item">
                      <span class="detail-field-label">编码:</span>
                      <span class="detail-field-value detail-field-value--code">{{ sticker.code }}</span>
                    </div>

                    <div class="detail-entity-grid__item detail-entity-grid__item--full">
                      <span class="detail-field-label">关键词:</span>
                      <span class="detail-field-value" :title="sticker.keywords">{{ sticker.keywords || '-' }}</span>
                    </div>

                    <div class="detail-entity-grid__item detail-entity-grid__item--full">
                      <span class="detail-field-label">描述:</span>
                      <span class="detail-field-value" :title="sticker.description">{{ sticker.description || '-' }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <el-empty v-else :description="t('psdSet.noSourceMaterials')" :image-size="72" />
          </div>

          <!-- 关联 PSD 模版信息 -->
          <div class="psd-set-detail-panel psd-set-detail-panel--balanced">
            <div class="detail-header">
              <div class="detail-header__left">
                <span class="detail-label">{{ t('psdSet.psdTemplateInfo') }}</span>
              </div>
              <div class="detail-header__right" v-if="detailData.psdTemplate">
                <el-tag v-if="detailData.psdTemplate.cropMode" size="small" type="warning" effect="plain">
                  {{ detailData.psdTemplate.cropMode }}
                </el-tag>
              </div>
            </div>

            <div v-if="detailData.psdTemplate" class="detail-entity-card detail-entity-card--template">
              <div class="detail-entity-card__thumb">
                <el-image v-if="detailData.psdTemplate.thumbnail"
                  :src="getPreviewImageUrl(detailData.psdTemplate.thumbnail, { width: 360, quality: 80, format: 'webp' })"
                  :preview-src-list="[detailData.psdTemplate.thumbnail]"
                  :preview-teleported="true"
                  :hide-on-click-modal="false" fit="contain" class="detail-entity-card__image" />
                <span v-else class="detail-entity-card__empty-thumb">{{ t('psdSet.noImage') }}</span>
              </div>

              <div class="detail-entity-card__main">
                <div class="detail-entity-card__head">
                  <span class="detail-entity-card__name" :title="detailData.psdTemplate.name">
                    {{ detailData.psdTemplate.name || t('psdSet.unnamedTemplate') }}
                  </span>
                  <el-tag v-if="detailData.psdTemplate.category" size="small" type="info" effect="light">
                    {{ detailData.psdTemplate.category }}
                  </el-tag>
                </div>

                <div class="detail-entity-grid">
                  <div class="detail-entity-grid__item detail-entity-grid__item--full">
                    <span class="detail-field-label">模版 ID:</span>
                    <span class="detail-field-value detail-field-value--code cursor-pointer" @click="copyId(detailData.psdTemplate.id)" :title="'点击复制 ID: ' + detailData.psdTemplate.id">
                      {{ detailData.psdTemplate.id || '-' }}
                      <el-icon class="copy-icon"><DocumentCopy /></el-icon>
                    </span>
                  </div>

                  <div v-if="detailData.psdTemplate.suitableSizes" class="detail-entity-grid__item detail-entity-grid__item--full">
                    <span class="detail-field-label">适用尺寸:</span>
                    <span class="detail-field-value">{{ detailData.psdTemplate.suitableSizes }}</span>
                  </div>

                  <div class="detail-entity-grid__item detail-entity-grid__item--full">
                    <span class="detail-field-label">关键词:</span>
                    <span class="detail-field-value" :title="detailData.psdTemplate.keywords">{{ detailData.psdTemplate.keywords || '-' }}</span>
                  </div>

                  <div class="detail-entity-grid__item detail-entity-grid__item--full">
                    <span class="detail-field-label">描述:</span>
                    <span class="detail-field-value" :title="detailData.psdTemplate.description">{{ detailData.psdTemplate.description || '-' }}</span>
                  </div>

                  <div v-if="detailData.psdTemplate.url" class="detail-entity-grid__item detail-entity-grid__item--full">
                    <span class="detail-field-label">云端资源:</span>
                    <span class="detail-field-value detail-field-value--path cursor-pointer" @click="copyText(detailData.psdTemplate.url, '云端路径已复制')" :title="detailData.psdTemplate.url">
                      {{ detailData.psdTemplate.url }}
                      <el-icon class="copy-icon"><DocumentCopy /></el-icon>
                    </span>
                  </div>

                  <div v-if="detailData.psdTemplate.windowsLocalPath" class="detail-entity-grid__item detail-entity-grid__item--full">
                    <span class="detail-field-label">本地路径:</span>
                    <span class="detail-field-value detail-field-value--path cursor-pointer" @click="copyText(detailData.psdTemplate.windowsLocalPath, '本地路径已复制')" :title="detailData.psdTemplate.windowsLocalPath">
                      {{ detailData.psdTemplate.windowsLocalPath }}
                      <el-icon class="copy-icon"><DocumentCopy /></el-icon>
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <el-empty v-else :description="t('psdSet.noTemplate')" :image-size="72" />
          </div>
        </section>

        <section class="psd-set-detail-bottom">
          <div class="psd-set-detail-panel psd-set-detail-panel--muted">
            <div class="detail-header">
              <span class="detail-label">{{ t('psdSet.configAndMeta') }}</span>
            </div>

            <div class="psd-set-detail-json-stack">
              <div class="psd-set-detail-json-block">
                <div class="psd-set-detail-json-title">
                  <span>{{ t('psdSet.psdSetConfig') }}</span>
                  <el-tag v-if="detailData?.stickerPsdSetConfig" type="info" size="small" effect="plain">
                    {{ t('psdSet.configured') }}
                  </el-tag>
                </div>
                <div v-if="detailData?.stickerPsdSetConfig" class="config-preview-container">
                  <pre class="config-preview">{{ formattedConfig }}</pre>
                </div>
                <span v-else class="text-gray-400 text-sm">{{ t('psdSet.notConfigured') }}</span>
              </div>

              <div class="psd-set-detail-json-block">
                <div class="psd-set-detail-json-title">
                  <span>{{ t('psdSet.metaInfo') }}</span>
                  <el-tag v-if="detailMetaFormatted" type="info" size="small" effect="plain">JSON</el-tag>
                </div>
                <div v-if="detailMetaFormatted" class="config-preview-container">
                  <pre class="config-preview">{{ detailMetaFormatted }}</pre>
                </div>
                <span v-else class="text-gray-400 text-sm">{{ t('psdSet.noMetaInfo') }}</span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </el-dialog>

    <!-- 编辑配置对话框 -->
    <el-dialog v-model="configEditDialogVisible" :title="t('psdSet.editConfigInfo')" width="60%" align-center :destroy-on-close="true">
      <div v-loading="configEditDialogLoading" class="config-edit-dialog-content">
        <div v-if="configEditDialogData" class="config-edit-info">
          <div class="config-edit-info-item">
            <span class="config-edit-info-label">{{ t('psdSet.psdSetName') }}：</span>
            <span class="config-edit-info-value">{{ configEditDialogData.name || "-" }}</span>
          </div>
          <div class="config-edit-info-item">
            <span class="config-edit-info-label">{{ t('psdSet.psdSetId') }}：</span>
            <span class="config-edit-info-value">{{ configEditDialogData.id || "-" }}</span>
          </div>
        </div>
        <div class="config-editor-container">
          <el-input v-model="configEditDialogValue" type="textarea" :rows="16"
            :placeholder='t("psdSet.jsonConfigPlaceholder")'
            class="config-textarea" @input="handleConfigInputChange" />
          <div v-if="configEditDialogError" class="config-error">
            <el-icon>
              <WarningFilled />
            </el-icon>
            <span>{{ configEditDialogError }}</span>
          </div>
          <div v-else-if="configEditDialogValue.trim()" class="config-success">
            <el-icon>
              <CircleCheck />
            </el-icon>
            <span>{{ t('psdSet.jsonFormatValid') }}</span>
          </div>
        </div>
      </div>
      <template #footer>
        <el-button @click="handleCancelConfigEditDialog">{{ t('common.cancel') }}</el-button>
        <el-button type="primary" :loading="configEditDialogSaving" @click="handleSaveConfigDialog">
          {{ t('common.save') }}
        </el-button>
      </template>
    </el-dialog>

    <!-- 查看配置对话框 -->
    <el-dialog v-model="configViewDialogVisible" :title="t('psdSet.viewConfigInfo')" width="60%" align-center :destroy-on-close="true">
      <div v-loading="configViewDialogLoading" class="config-view-dialog-content">
        <div v-if="configViewDialogData" class="config-view-info">
          <div class="config-view-info-item">
            <span class="config-view-info-label">{{ t('psdSet.psdSetName') }}：</span>
            <span class="config-view-info-value">{{ configViewDialogData.name || "-" }}</span>
          </div>
          <div class="config-view-info-item">
            <span class="config-view-info-label">{{ t('psdSet.psdSetId') }}：</span>
            <span class="config-view-info-value">{{ configViewDialogData.id || "-" }}</span>
          </div>
        </div>
        <div v-if="configViewFormatted" class="config-view-container">
          <pre class="config-view-content">{{ configViewFormatted }}</pre>
        </div>
        <div v-else class="config-view-empty">
          <span class="text-gray-400">{{ t('psdSet.notConfigured') }}</span>
        </div>
      </div>
      <template #footer>
        <el-button @click="configViewDialogVisible = false">{{ t('common.close') }}</el-button>
        <el-button v-if="configViewDialogData?.stickerPsdSetConfig" type="primary" @click="handleEditFromView">
          {{ t('psdSet.editConfig') }}
        </el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="generateProductDialogVisible" fullscreen :show-close="true" :destroy-on-close="false"
      class="generate-product-dialog" @close="handleCloseGenerateProductDialog">
      <template #header>
        <div class="generate-product-dialog-header">
          <div>
            <div class="generate-product-dialog-title">{{ t('psdSet.generateProductTitle') }}</div>
            <div class="generate-product-dialog-subtitle">
              {{ t('psdSet.generateProductSubtitle', { count: generateProductTargetIds.length }) }}
            </div>
          </div>
        </div>
      </template>

      <div v-loading="generateProductDialogLoading" class="generate-product-dialog-body">
        <div class="generate-product-panel">
          <div class="generate-product-panel-title">{{ t('psdSet.basicConfig') }}</div>
          <el-form label-position="top">
            <el-form-item :label="t('psdSet.productGenerationTemplate')">
              <el-alert
                :type="generateProductTargetTemplateAlert.type"
                :title="generateProductTargetTemplateAlert.title"
                :closable="false"
                show-icon
                class="generate-product-template-alert"
              />
              <div class="generate-product-template-toolbar">
                <el-input
                  v-model="generateProductTemplateSearchText"
                  size="small"
                  clearable
                  :placeholder="t('psdSet.searchTemplatePlaceholder')"
                />
                <el-tag size="small" type="info">
                  {{ t('psdSet.selectedTemplates', { count: generateProductSelectedTemplateIds.length }) }}
                </el-tag>
                <el-tag size="small" type="warning">
                  {{ t('psdSet.expectedProducts', { count: generateProductExpectedCount }) }}
                </el-tag>
              </div>
              <vxe-grid
                :key="generateProductDialogKey"
                class="generate-product-template-grid"
                border
                size="mini"
                :data="filteredGenerateProductTemplateOptions"
                :columns="generateProductTemplateColumns"
                :max-height="360"
                :row-config="{ keyField: 'id', isHover: true }"
                :row-class-name="generateProductTemplateRowClassName"
                :checkbox-config="generateProductTemplateCheckboxConfig"
                @checkbox-change="handleGenerateProductTemplateCheckboxChange"
                @checkbox-all="handleGenerateProductTemplateCheckboxChange"
              />
              <div class="generate-product-tip">
                {{ t('psdSet.generateProductTip') }}
              </div>
              <div v-if="generateProductBatchProgress" class="generate-product-progress">
                <el-progress
                  :percentage="Number(generateProductBatchProgress.progress || 0)"
                  :status="generateProductBatchProgress.status === 'failed' ? 'exception' : undefined"
                />
                <div class="generate-product-progress__text">
                  {{ generateProductBatchProgress.message || t('psdSet.processing') }}
                  · {{ t('psdSet.successCount', { count: generateProductBatchProgress.completed || 0 }) }}
                  · {{ t('psdSet.failedCount', { count: generateProductBatchProgress.failed || 0 }) }}
                  · {{ t('psdSet.totalCount', { count: generateProductBatchProgress.total || 0 }) }}
                </div>
                <div
                  v-if="generateProductFailedItems.length"
                  class="generate-product-progress__errors"
                >
                  <div
                    v-for="item in generateProductFailedItems"
                    :key="`${item.psdSetId}-${item.productGenerationTemplateId}`"
                    class="generate-product-progress__error"
                  >
                    {{ t('psdSet.generateFailedItem', { psdSetId: item.psdSetId, templateId: item.productGenerationTemplateId, error: item.error || t('psdSet.generateFailed') }) }}
                  </div>
                </div>
              </div>
            </el-form-item>
          </el-form>
        </div>
      </div>

      <template #footer>
        <div class="generate-product-dialog-footer">
          <el-button @click="handleCloseGenerateProductDialog">{{ t('common.cancel') }}</el-button>
          <el-button
            type="primary"
            :loading="generateProductSubmitting"
            :disabled="isGenerateProductBatchRunning"
            @click="handleSubmitGenerateProduct"
          >
            {{ isGenerateProductBatchRunning ? t('psdSet.generatingInBackground') : t('psdSet.confirmGenerateProduct') }}
          </el-button>
        </div>
      </template>
    </el-dialog>

    <el-dialog v-model="publishConfigDialogVisible" fullscreen :show-close="true" :destroy-on-close="false"
      class="generate-product-dialog publish-config-dialog" @close="handleClosePublishConfigDialog">
      <template #header>
        <div class="generate-product-dialog-header">
          <div>
            <div class="generate-product-dialog-title">{{ t('psdSet.generatePublishTaskTitle') }}</div>
            <div class="generate-product-dialog-subtitle">
              {{ t('psdSet.generatePublishTaskSubtitle', { count: publishConfigTargetIds.length }) }}
            </div>
          </div>
        </div>
      </template>

      <div v-loading="publishConfigDialogLoading" class="generate-product-dialog-body publish-config-dialog-body">
        <div class="generate-product-panel generate-product-panel--wide publish-config-panel-wrap">
          <div class="publish-config-toolbar">
            <div class="publish-config-toolbar__stats">
              <div class="publish-config-stat-card">
                <div class="publish-config-stat-card__label">{{ t('psdSet.targetPsdSets') }}</div>
                <div class="publish-config-stat-card__value">
                  {{ publishConfigTargetIds.length }}
                </div>
              </div>
              <div class="publish-config-stat-card">
                <div class="publish-config-stat-card__label">{{ t('psdSet.availableTaskConfigs') }}</div>
                <div class="publish-config-stat-card__value">
                  {{ filteredPublishConfigs.length }}
                </div>
              </div>
              <div class="publish-config-stat-card">
                <div class="publish-config-stat-card__label">{{ t('psdSet.selectedTaskConfigs') }}</div>
                <div class="publish-config-stat-card__value">
                  {{ publishConfigSelectedIds.length }}
                </div>
              </div>
            </div>
            <el-alert
              class="publish-config-template-alert"
              :type="publishConfigTargetTemplateAlert.type"
              :title="publishConfigTargetTemplateAlert.title"
              show-icon
              :closable="false"
            />
            <div class="publish-config-toolbar__actions">
              <el-input v-model="publishConfigSearchText" :placeholder="t('psdSet.searchTaskConfigPlaceholder')" clearable
                @input="publishConfigCurrentPage = 1" class="publish-config-search" />
              <el-tag v-if="publishConfigSelectedNames.length" type="primary" effect="plain">
                {{ publishConfigSelectedNames.join("、") }}
              </el-tag>
            </div>
          </div>

          <div class="common-table publish-config-grid-wrap">
            <vxe-grid v-bind="publishConfigGridOptions" :data="publishConfigDataSource"
              @checkbox-change="handlePublishConfigCheckboxChange"
              @checkbox-all="handlePublishConfigCheckboxAllChange">
              <template #publishConfigTemplateSlot="{ row }">
                <span>{{ getPublishConfigBindingLabel(row) }}</span>
              </template>
              <template #publishConfigMatchSlot="{ row }">
                <el-tag :type="getPublishConfigMatchInfo(row).type" size="small" effect="plain">
                  {{ getPublishConfigMatchInfo(row).label }}
                </el-tag>
              </template>
            </vxe-grid>
          </div>

          <div class="publish-config-pagination">
            <el-pagination v-model:current-page="publishConfigCurrentPage" v-model:page-size="publishConfigPageSize"
              :total="filteredPublishConfigs.length" :page-sizes="[10, 20, 50, 100, 200, 500, 1000]"
              layout="total, sizes, prev, pager, next" size="small" background />
          </div>
        </div>
      </div>

      <template #footer>
        <div class="generate-product-dialog-footer">
          <el-button @click="handleClosePublishConfigDialog">{{ t('common.cancel') }}</el-button>
          <el-button type="primary" :loading="publishConfigSubmitting" @click="handleSubmitCreatePublishTask">
            {{ t('psdSet.confirmGeneratePublishTask') }}
          </el-button>
        </div>
      </template>
    </el-dialog>

    <el-dialog v-model="publishTasksVisible" fullscreen :show-close="true" :destroy-on-close="false"
      class="publish-task-list-dialog">
      <template #header>
        <div class="generate-product-dialog-header">
          <div>
            <div class="generate-product-dialog-title">{{ t('psdSet.publishTasksTitle') }}</div>
            <div class="generate-product-dialog-subtitle">
              {{ t('psdSet.publishTasksCount', { count: publishTasks.length }) }}
            </div>
          </div>
        </div>
      </template>

      <div v-loading="publishTasksLoading" class="publish-task-list-body">
        <div class="publish-task-list-toolbar">
          <div class="publish-task-list-toolbar__stats">
            <el-tag type="info" effect="plain">{{ t('psdSet.totalCount', { count: publishTasks.length }) }}</el-tag>
            <el-tag type="success" effect="plain">{{ t('psdSet.completedCount', { count: publishTaskStatusCount.completed }) }}</el-tag>
            <el-tag type="warning" effect="plain">{{ t('psdSet.processingCount', { count: publishTaskStatusCount.processing }) }}</el-tag>
            <el-tag type="danger" effect="plain">{{ t('psdSet.failedCount', { count: publishTaskStatusCount.failed }) }}</el-tag>
          </div>
        </div>

        <el-empty v-if="!publishTasksLoading && publishTasks.length === 0" :description="t('psdSet.noPublishTasks')" />
        <vxe-grid v-else v-bind="publishTasksGridOptions" :data="publishTasks" class="publish-task-list-grid">
          <template #taskPlatformSlot="{ row }">
            <el-tag size="small" effect="plain">{{ formatPlatformName(row.platform) }}</el-tag>
          </template>
          <template #taskStatusSlot="{ row }">
            <el-tag :type="getPublishTaskStatusTag(row.status)" size="small">
              {{ getPublishTaskStatusLabel(row.status) }}
            </el-tag>
          </template>
          <template #taskErrorSlot="{ row }">
            <span v-if="row.error" class="publish-task-error">{{ row.error }}</span>
            <span v-else class="text-gray-400">-</span>
          </template>
          <template #taskActionSlot="{ row }">
            <el-button link type="primary" :disabled="publishTasksLoading || getPsdSetDisplayStatus(row) === 'processing'"
              @click="handleRegeneratePublishTask(row)">
              {{ t('psdSet.regeneratePublishData') }}
            </el-button>
          </template>
        </vxe-grid>
      </div>
      <template #footer>
        <el-button @click="publishTasksVisible = false">{{ t('common.close') }}</el-button>
      </template>
    </el-dialog>

    <!-- 查看生成的产品对话框 -->
    <el-dialog v-model="productsDialogVisible" fullscreen :show-close="true" :destroy-on-close="false"
      class="publish-task-list-dialog">
      <template #header>
        <div class="generate-product-dialog-header">
          <div>
            <div class="generate-product-dialog-title">{{ t('psdSet.productsTitle') }}</div>
            <div class="generate-product-dialog-subtitle">
              {{ t('psdSet.productsTotal', { count: productsDialogTotal }) }}
            </div>
          </div>
        </div>
      </template>

      <div v-loading="productsDialogLoading" class="publish-task-list-body">
        <div v-if="productsDialogData.length" class="publish-task-list-toolbar">
          <el-tag type="info" effect="plain">{{ t('psdSet.totalCount', { count: productsDialogTotal }) }}</el-tag>
          <el-tag type="success" effect="plain">{{ t('psdSet.publishedCount', { count: productsDialogData.filter((p: any) => p.isPublish).length }) }}</el-tag>
        </div>

        <el-empty v-if="!productsDialogLoading && productsDialogData.length === 0" :description="t('psdSet.noRelatedProducts')" />
        <vxe-grid v-else v-bind="productsGridOptions" :data="productsDialogData" class="publish-task-list-grid">
          <template #productImageSlot="{ row }">
            <div v-if="row.images && row.images.length" class="product-thumb-cell">
              <el-image :src="getPreviewImageUrl(row.images[0], { width: 120, quality: 80, format: 'webp' })"
                :preview-src-list="row.images" :preview-teleported="true" :hide-on-click-modal="false"
                fit="contain" class="product-thumb-image" />
            </div>
            <span v-else class="text-gray-400 text-xs">{{ t('psdSet.noImage') }}</span>
          </template>
          <template #productStatusSlot="{ row }">
            <el-tag :type="row.isPublish ? 'success' : 'info'" size="small" effect="plain">
              {{ row.isPublish ? t('psdSet.published') : t('psdSet.unpublished') }}
            </el-tag>
          </template>
          <template #productPriceSlot="{ row }">
            <div class="product-price-cell">
              <span v-if="row.salePrice" class="product-price-sale">¥{{ Number(row.salePrice).toFixed(2) }}</span>
              <span v-if="row.price && row.price !== row.salePrice" class="product-price-original">¥{{ Number(row.price).toFixed(2) }}</span>
              <span v-if="!row.salePrice && !row.price" class="text-gray-400">-</span>
            </div>
          </template>
          <template #productActionSlot="{ row }">
            <el-button link type="primary" size="small" @click="handleOpenProductDetail(row)">
              {{ t('psdSet.viewDetail') }}
            </el-button>
          </template>
        </vxe-grid>

        <div v-if="productsDialogTotal > productsDialogPageSize" class="publish-config-pagination">
          <el-pagination v-model:current-page="productsDialogPage" v-model:page-size="productsDialogPageSize"
            :total="productsDialogTotal" :page-sizes="[10, 20, 50]"
            layout="total, sizes, prev, pager, next" size="small" background
            @current-change="handleProductsPageChange" @size-change="handleProductsPageChange" />
        </div>
      </div>
      <template #footer>
        <el-button @click="productsDialogVisible = false">{{ t('common.close') }}</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="productionDispatchDialogVisible" width="960px" :title="productionDispatchDialogTitle"
      align-center append-to-body destroy-on-close class="production-dispatch-dialog" @open="handleOpenProductionDispatchDialog"
      @closed="handleCloseProductionDispatchDialog">
      <div class="production-dispatch-dialog__body">
        <div v-loading="productionDispatchLoading" :element-loading-text="DISPATCH_DIALOG_LOADING_TEXT"
          class="production-dispatch-dialog__panel">
          <div class="production-dispatch-dialog__panel-title">{{ t('psdSet.clientNode') }}</div>
          <div v-if="!productionDispatchLoading && dispatchClientRows.length" class="production-dispatch-dialog__table">
            <el-table :data="dispatchClientRows" border size="small" row-key="id" :max-height="420"
              class="production-dispatch-dialog__table-main" :row-class-name="resolveDispatchClientRowClassName"
              @row-click="handleDispatchClientRowClick">
              <el-table-column label="" width="46" align="center">
                <template #default="{ row }">
                  <el-radio v-model="selectedDispatchClientId" :value="row.id" :disabled="!row.selectable"
                    @click.stop />
                </template>
              </el-table-column>
              <el-table-column prop="clientLabel" :label="t('psdSet.clientNode')" min-width="190" show-overflow-tooltip />
              <el-table-column prop="connectedAtLabel" :label="t('psdSet.connectedAt')" min-width="170" show-overflow-tooltip />
              <el-table-column :label="t('psdSet.currentPsdSet')" min-width="260" show-overflow-tooltip>
                <template #default="{ row }">
                  <div class="production-dispatch-dialog__task">
                    <span>{{ row.activeTaskLabel }}</span>
                    <small v-if="row.activeTaskStep">{{ row.activeTaskStep }}</small>
                  </div>
                </template>
              </el-table-column>
              <el-table-column :label="t('psdSet.online')" width="76" align="center">
                <template #default="{ row }">
                  <span class="production-dispatch-dialog__state-text" :class="`is-${row.onlineStatusTone}`">
                    {{ row.onlineStatusText }}
                  </span>
                </template>
              </el-table-column>
              <el-table-column label="PS" min-width="190">
                <template #default="{ row }">
                  <div class="production-dispatch-dialog__ps-status">
                    <span class="production-dispatch-dialog__state-text" :class="`is-${row.psStatusTone}`">
                      {{ row.psStatusText }}
                    </span>
                    <el-tooltip
                      v-if="row.psStatusReason"
                      :content="row.psStatusReason"
                      placement="top"
                      :show-after="200"
                    >
                      <span class="production-dispatch-dialog__ps-reason">{{ row.psStatusReason }}</span>
                    </el-tooltip>
                  </div>
                </template>
              </el-table-column>
              <el-table-column :label="t('psdSet.production')" width="82" align="center">
                <template #default="{ row }">
                  <span class="production-dispatch-dialog__state-text" :class="`is-${row.productionStatusTone}`">
                    {{ row.productionStatusText }}
                  </span>
                </template>
              </el-table-column>
            </el-table>
          </div>
          <div v-else class="production-dispatch-dialog__empty">{{ t('psdSet.noClientNodes') }}</div>
        </div>
        <div v-if="productionDispatchMode === 'auto'" class="production-dispatch-dialog__filters">
          <div class="production-dispatch-dialog__panel-title">{{ t('psdSet.autoClaimConditions') }}</div>
          <el-form label-position="top" class="production-dispatch-dialog__filter-form">
            <el-row :gutter="12">
              <el-col :xs="24" :sm="12">
                <el-form-item :label="t('psdSet.keyword')">
                  <el-input
                    v-model="autoDispatchFilterForm.keyword"
                    clearable
                    :placeholder="t('psdSet.nameDescKeywordId')"
                  />
                </el-form-item>
              </el-col>
              <el-col :xs="24" :sm="12">
                <el-form-item :label="t('psdSet.sort')">
                  <el-select
                    v-model="autoDispatchFilterForm.sortOrder"
                    :placeholder="t('psdSet.selectSortType')"
                    style="width: 100%"
                  >
                    <el-option :label="t('psdSet.oldestFirst')" value="oldest" />
                    <el-option :label="t('psdSet.newestFirst')" value="newest" />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :span="24">
                <el-form-item :label="t('common.createTime')">
                  <el-date-picker
                    v-model="autoDispatchFilterForm.createdAtRange"
                    type="datetimerange"
                    :range-separator="t('psdSet.to')"
                    :start-placeholder="t('common.startTimeText')"
                    :end-placeholder="t('common.endTimeText')"
                    format="YYYY-MM-DD HH:mm:ss"
                    value-format="YYYY-MM-DD HH:mm:ss"
                    clearable
                    style="width: 100%"
                  />
                </el-form-item>
              </el-col>
            </el-row>
          </el-form>
        </div>
      </div>
      <template #footer>
        <div class="production-dispatch-dialog__footer">
          <el-button @click="productionDispatchDialogVisible = false">{{ t('common.cancel') }}</el-button>
          <el-button type="primary" :loading="productionDispatchSubmitting"
            :disabled="!selectedDispatchClientId || !selectedDispatchClient"
            @click="handleConfirmStartProduction">
            {{ productionDispatchConfirmText }}
          </el-button>
        </div>
      </template>
    </el-dialog>

    <el-dialog v-model="publishUsageDialogVisible" :title="t('psdSet.publishUsageRecords')" width="920px" :destroy-on-close="true">
      <div v-loading="publishUsageLoading" class="publish-usage-dialog">
        <el-empty v-if="!publishUsageLoading && !publishUsageRecords.length" :description="t('psdSet.noPublishUsageRecords')" />
        <vxe-grid v-else v-bind="publishUsageGridOptions" :data="publishUsageRecords">
          <template #usageImageSlot="{ row }">
            <el-image v-if="row.imageUrl" :src="row.imageUrl" fit="cover" class="publish-usage-image"
              :preview-src-list="[row.imageUrl]" :preview-teleported="true" />
          </template>
          <template #usageConfigSlot="{ row }">
            <div class="publish-usage-config-cell">
              <span>{{ row.publishConfig?.name || row.publishConfigId || "-" }}</span>
              <el-tag size="small" effect="plain">{{ formatPlatformName(row.publishConfig?.platform) }}</el-tag>
            </div>
          </template>
          <template #usageStatusSlot="{ row }">
            <el-tag :type="getPublishUsageStatusTag(row.status)" size="small">
              {{ getPublishUsageStatusLabel(row.status) }}
            </el-tag>
          </template>
        </vxe-grid>
      </div>
    </el-dialog>

    <el-image-viewer v-if="tableImageViewerVisible" :url-list="tableImageViewerUrls"
      :initial-index="tableImageViewerIndex" :hide-on-click-modal="false" teleported
      @switch="handleTableImageViewerSwitch" @close="handleTableImageViewerClose" />

    <!-- 状态详情对话框已移除；状态说明使用默认单元格文本显示 -->
  </ContentWrap>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted, watch, watchEffect } from "vue";
import ContentWrap from "@/components/ContentWrap/src/ContentWrap.vue";
import ListPageLayout from "@/components/ListPageLayout/index.vue";
import { useWindowSize } from "@vueuse/core";
import { Search, DocumentCopy, WarningFilled, CircleCheck } from "@element-plus/icons-vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { useI18n } from "@/hooks/web/useI18n";
import { buildOperationColumn, commonGridOptions } from "@/common/table";
import { formatTimestamp } from "@/common/date";
import { stickerPsdSetApi } from "@/api/stickerPsdSet";
import { getProductList } from "@/api/product/index";
import { productGenerationTemplateApi } from "@/api/product-generation-template";
import {
  getPublishConfigListApi,
  createPublishTaskApi,
  regeneratePublishTaskApi,
} from "@/api/product/publishConfig";
import request from "@/config/axios";
import { isLocalConnected } from "@/stores/connectionStatus";
import { websocketClient, type PsAutomationStatusEvent } from "@/services/websocketClient";
import { useClientNodeState } from "@/services/clientNodeState";
import { ClientControlService } from "@/services/clientControl";
import { usePsdSetRuntimeState } from "@/services/psdSetRuntimeState";
import {
  getPsdSetAutoDispatchRuntime,
  resetAllPsAutomationRuntime,
  type AutoDispatchSchedulerRuntime,
} from "@/api/system/websocket";
import {
  normalizeAutoDispatchSchedulerRuntime,
  resolveAutoDispatchSchedulerIndicator,
} from "@/services/autoDispatchSchedulerRuntime";
import { sortTypeOptions, defaultSortingValue } from "@/common/sort";
import { getPreviewImageUrl } from "@/utils/image";
import PsdSetTableImageCell from "./components/PsdSetTableImageCell.vue";
import {
  derivePublishTaskTypeByPlatform,
  getTaskTypeLabel,
  resolveTaskTypePlatform,
} from "@/config/task-types";
import { downloadImageEnhanced } from "@/common/download";
import { useGlobalNotificationStore } from "@/store/modules/globalNotification";
const globalNotificationStore = useGlobalNotificationStore();
const { t } = useI18n();
const loading = ref(false);
const dataSource = ref<any[]>([]);
const total = ref(0);
const selectedIds = ref<string[]>([]);
const selectedPsdSetRows = ref<any[]>([]);
const psdSetGridRef = ref<any>(null);
const tablePreviewImageIndexMap = reactive<Record<string, number>>({});
const tableImageViewerVisible = ref(false);
const tableImageViewerUrls = ref<string[]>([]);
const tableImageViewerIndex = ref(0);
const tableImageViewerDisplayIndex = computed(() =>
  tableImageViewerUrls.value.length
    ? Math.min(Math.max(tableImageViewerIndex.value, 0), tableImageViewerUrls.value.length - 1) + 1
    : 0,
);
let tableImageViewerLabelEl: HTMLDivElement | null = null;
const DISPATCH_DIALOG_LOADING_TEXT = t("psdSet.syncingAvailableNodes");
const generatingProductId = ref<string>("");
const batchGeneratingProducts = ref(false);
const batchUpdatingStatus = ref(false);
const startingProductionId = ref<string>("");
const productionDispatchDialogVisible = ref(false);
const productionDispatchLoading = ref(false);
const productionDispatchRow = ref<any>(null);
const productionDispatchMode = ref<"manual" | "auto">("manual");
const selectedDispatchClientId = ref("");
const autoDispatchFilterForm = reactive({
  keyword: "",
  createdAtRange: [] as string[],
  sortOrder: "oldest" as "oldest" | "newest",
});
const resettingPsRuntime = ref(false);
const userAutoSchedulingLoading = ref(false);
const psdSetSchedulerRuntime = ref<AutoDispatchSchedulerRuntime | null>(null);
const generateProductDialogVisible = ref(false);
const generateProductDialogLoading = ref(false);
const generateProductSubmitting = ref(false);
const generateProductTargetIds = ref<string[]>([]);
const generateProductTargetRows = ref<any[]>([]);
const generateProductTemplateOptions = ref<any[]>([]);
const generateProductSelectedTemplateIds = ref<string[]>([]);
const generateProductTemplateSearchText = ref("");
const generateProductDialogKey = ref(0);
const generateProductBatchTaskId = ref("");
const generateProductBatchProgress = ref<any>(null);
let generateProductBatchProgressTimer: ReturnType<typeof setTimeout> | null = null;
let generateProductBatchPollCount = 0;
const GENERATE_PRODUCT_BATCH_PROGRESS_STORAGE_KEY = "psd-set-generate-product-batch-task";
const isGenerateProductBatchRunning = computed(() =>
  ["queued", "processing"].includes(generateProductBatchProgress.value?.status || ""),
);
const generateProductFailedItems = computed(() =>
  (generateProductBatchProgress.value?.items || []).filter((item: any) => item?.status === "failed"),
);
const generateProductExpectedCount = computed(
  () => generateProductTargetIds.value.length * generateProductSelectedTemplateIds.value.length,
);
const generateProductTargetTemplateIds = computed(() =>
  Array.from(
    new Set(
      generateProductTargetRows.value
        .map((item) => getPsdSetTemplateId(item))
        .filter(Boolean),
    ),
  ),
);
const generateProductTargetTemplateMode = computed(() => {
  const hasMissingTemplate = generateProductTargetRows.value.some(
    (item) => !getPsdSetTemplateId(item),
  );
  if (generateProductTargetTemplateIds.value.length === 1 && !hasMissingTemplate) {
    return "single";
  }
  if (generateProductTargetTemplateIds.value.length > 1) return "multiple";
  return "unknown";
});
const generateProductTargetTemplateAlert = computed(() => {
  if (generateProductTargetTemplateMode.value === "single") {
    return {
      type: "success" as const,
      title: t("psdSet.sameTemplateAlert", { templateId: generateProductTargetTemplateIds.value[0] }),
    };
  }
  if (generateProductTargetTemplateMode.value === "multiple") {
    return {
      type: "warning" as const,
      title: t("psdSet.multipleTemplatesAlert", { count: generateProductTargetTemplateIds.value.length }),
    };
  }
  return {
    type: "warning" as const,
    title: t("psdSet.missingTemplateAlert"),
  };
});
const generateProductTemplateCheckboxConfig = computed(() => ({
  checkRowKeys: generateProductSelectedTemplateIds.value,
  highlight: true,
  trigger: "row" as const,
  checkMethod: ({ row }: any) => isGenerateProductTemplateSelectable(row),
}));
const SEO_DESCRIPTION_SAFE_LENGTH = 240;
const getTextLength = (value: unknown) => String(value || "").length;
const isSeoDescriptionTooLongError = (error: any) =>
  String(error?.message || error?.response?.data?.message || error || "")
    .toLowerCase()
    .includes("seo_description");

const filteredGenerateProductTemplateOptions = computed(() => {
  const keyword = generateProductTemplateSearchText.value.trim().toLowerCase();
  if (!keyword) {
    return generateProductTemplateOptions.value;
  }
  return generateProductTemplateOptions.value.filter((item) =>
    [item.name, item.productType, item.tags]
      .map((value) => String(value || "").toLowerCase())
      .some((value) => value.includes(keyword)),
  );
});
const generateProductTemplateColumns: any[] = [
  { type: "checkbox", width: 48 },
  { field: "name", title: t("psdSet.templateName"), minWidth: 180, showOverflow: true },
  { field: "productType", title: t("psdSet.productType"), width: 120, showOverflow: true },
  {
    field: "psdTemplateId",
    title: t("psdSet.boundPsdTemplate"),
    minWidth: 190,
    showOverflow: true,
    formatter: ({ cellValue }) => String(cellValue || "").trim() || t("psdSet.notBound"),
  },
  {
    field: "matchStatus",
    title: t("psdSet.matchStatus"),
    width: 130,
    formatter: ({ row }) => getGenerateProductTemplateMatchInfo(row).label,
  },
  {
    field: "imagePolicy",
    title: t("psdSet.image"),
    width: 120,
    formatter: ({ row }) =>
      row?.imagePolicy?.psdImageIndexes ||
      row?.imagePolicy?.imageIndexes ||
      row?.imagePolicy?.indexes ||
      t("psdSet.all"),
  },
  {
    field: "salePrice",
    title: t("psdSet.salePrice"),
    width: 90,
    formatter: ({ cellValue }) => {
      const amount = Number(cellValue || 0);
      return amount > 0 ? amount.toFixed(2) : "-";
    },
  },
  { field: "stock", title: t("psdSet.stock"), width: 80 },
  { field: "tags", title: t("psdSet.tags"), minWidth: 180, showOverflow: true },
  {
    field: "seoPrompt",
    title: t("psdSet.seoPrompt"),
    width: 110,
    formatter: ({ cellValue }) => {
      const length = getTextLength(cellValue);
      if (!length) return "-";
      return length > SEO_DESCRIPTION_SAFE_LENGTH
        ? t("psdSet.seoPromptLengthLong", { length })
        : t("psdSet.seoPromptLength", { length });
    },
  },
];
const publishConfigDialogVisible = ref(false);
const publishConfigDialogLoading = ref(false);
const publishConfigSubmitting = ref(false);
const publishConfigOptions = ref<any[]>([]);
const publishConfigSelectedIds = ref<string[]>([]);
const publishConfigTargetIds = ref<string[]>([]);
const publishConfigTargetRows = ref<any[]>([]);
const publishConfigSearchText = ref("");
const publishConfigCurrentPage = ref(1);
const publishConfigPageSize = ref(10);
const publishTasksVisible = ref(false);
const publishTasksLoading = ref(false);
const publishTasks = ref<any[]>([]);
const currentPublishTasksPsdSetId = ref<string>("");
const publishUsageConfigOptions = ref<any[]>([]);
const publishUsageDialogVisible = ref(false);
const publishUsageLoading = ref(false);
const publishUsageRecords = ref<any[]>([]);
// 查看产品对话框状态
const productsDialogVisible = ref(false);
const productsDialogLoading = ref(false);
const productsDialogData = ref<any[]>([]);
const productsDialogTotal = ref(0);
const productsDialogPage = ref(1);
const productsDialogPageSize = ref(20);
const currentProductsPsdSetId = ref<string>("");
let psdSetMenuRuntimeSyncTimer: ReturnType<typeof setTimeout> | null = null;
let psdSetListRequestSeq = 0;
let pendingNonSilentRequests = 0;
let pendingNonSilentDetailRequests = 0;

// 客户端连接状态（参考 header 中的状态检测方式）
const isClientConnected = computed(() => isLocalConnected.value);
const { clients: clientNodes, refresh: refreshClientNodes } = useClientNodeState();
const {
  userAutoSchedulingEnabled,
  userAutoDispatchClientId,
  userAutoDispatchFilters,
  activePsdSets,
  activePsdSetClientIds,
  refreshActiveSummary: refreshPsdSetRuntimeSummary,
  refreshUserAutoScheduling,
  setUserAutoSchedulingEnabled,
  setUserAutoDispatchTarget,
  setUserAutoDispatchFilters,
} = usePsdSetRuntimeState();

function schedulePsdSetMenuRuntimeSync() {
  void refreshPsdSetRuntimeSummary();
  void refreshClientNodes();
  void loadPsdSetSchedulerRuntime();
  if (psdSetMenuRuntimeSyncTimer) {
    clearTimeout(psdSetMenuRuntimeSyncTimer);
  }
  psdSetMenuRuntimeSyncTimer = setTimeout(() => {
    psdSetMenuRuntimeSyncTimer = null;
    void refreshPsdSetRuntimeSummary();
    void refreshClientNodes();
    void getList(true);
    void loadPsdSetSchedulerRuntime();
    if (detailDialogVisible.value && detailData.value?.id) {
      void loadPsdSetDetailById(detailData.value.id, true);
    }
  }, 1500);
}

const publishPlatformNameMap: Record<string, string> = {
  douyin: t("psdSet.platformDouyin"),
  kuaishou: t("psdSet.platformKuaishou"),
  xiaohongshu: t("psdSet.platformXiaohongshu"),
  weibo: t("psdSet.platformWeibo"),
  doudian: t("psdSet.platformDoudian"),
  kuaishou_shop: t("psdSet.platformKuaishouShop"),
  xianyu: t("psdSet.platformXianyu"),
  bilibili: "Bilibili",
  tiktok: "TikTok",
  youtube: "YouTube",
  temu: "Temu",
  pdd: t("psdSet.platformPdd"),
};

function formatPlatformName(platform?: string) {
  return publishPlatformNameMap[String(platform || "")] || String(platform || "-");
}

function formatTaskTypeName(taskType?: string, platform?: string) {
  return getTaskTypeLabel(taskType || derivePublishTaskTypeByPlatform(platform), platform);
}

function formatPublishUsageConfigLabel(config: any) {
  const name = String(config?.name || "").trim();
  const platform = formatPlatformName(config?.platform);
  return name ? `${name} / ${platform}` : platform;
}

function getPublishUsageStatusLabel(status?: string) {
  const map: Record<string, string> = {
    pending: t("psdSet.usagePublishing"),
    waiting: t("psdSet.usageWaiting"),
    processing: t("psdSet.usagePublishing"),
    completed: t("psdSet.usageUsed"),
    success: t("psdSet.usageUsed"),
    failed: t("psdSet.usageFailed"),
    expired: t("psdSet.usageExpired"),
    deleted: t("psdSet.usageReleased"),
  };
  return map[String(status || "")] || String(status || "-");
}

function getPublishUsageStatusTag(status?: string) {
  const map: Record<string, "info" | "warning" | "success" | "danger"> = {
    pending: "warning",
    waiting: "warning",
    processing: "warning",
    completed: "success",
    success: "success",
    failed: "danger",
    expired: "info",
    deleted: "info",
  };
  return map[String(status || "")] || "info";
}

function getPublishTaskStatusLabel(status?: string) {
  const map: Record<string, string> = {
    pending: t("psdSet.taskPending"),
    waiting: t("psdSet.usageWaiting"),
    processing: t("psdSet.taskProcessing"),
    completed: t("psdSet.taskCompleted"),
    failed: t("psdSet.usageFailed"),
  };
  return map[String(status || "")] || String(status || "-");
}

function getPublishTaskStatusTag(status?: string) {
  const map: Record<string, "info" | "warning" | "success" | "danger"> = {
    pending: "info",
    waiting: "warning",
    processing: "warning",
    completed: "success",
    failed: "danger",
  };
  return map[String(status || "")] || "info";
}

const filteredPublishConfigs = computed(() => {
  const text = publishConfigSearchText.value.toLowerCase().trim();
  const list = publishConfigOptions.value || [];
  if (!text) {
    return list;
  }
  return list.filter(
    (item: any) =>
      String(item?.name || "")
        .toLowerCase()
        .includes(text) ||
      formatTaskTypeName(item?.taskType, item?.platform).toLowerCase().includes(text) ||
      formatPlatformName(item?.platform).toLowerCase().includes(text),
  );
});

const publishConfigSelectedNames = computed(() =>
  publishConfigSelectedIds.value
    .map((id) => publishConfigOptions.value.find((item: any) => item.id === id)?.name)
    .filter(Boolean),
);

const publishConfigTargetTemplateIds = computed(() =>
  Array.from(
    new Set(
      publishConfigTargetRows.value
        .map((item) => getPsdSetTemplateId(item))
        .filter(Boolean),
    ),
  ),
);

const publishConfigTargetTemplateMode = computed(() => {
  const hasMissingTemplate = publishConfigTargetRows.value.some((item) => !getPsdSetTemplateId(item));
  if (publishConfigTargetTemplateIds.value.length === 1 && !hasMissingTemplate) {
    return "single";
  }
  if (publishConfigTargetTemplateIds.value.length > 1) {
    return "multiple";
  }
  return "unknown";
});

const publishConfigTargetTemplateAlert = computed(() => {
  if (publishConfigTargetTemplateMode.value === "single") {
    return {
      type: "success" as const,
      title: t("psdSet.sameTemplateConfigAlert", { templateId: publishConfigTargetTemplateIds.value[0] }),
    };
  }
  if (publishConfigTargetTemplateMode.value === "multiple") {
    return {
      type: "warning" as const,
      title: t("psdSet.multipleTemplatesConfigAlert", { count: publishConfigTargetTemplateIds.value.length }),
    };
  }
  if (publishConfigTargetTemplateIds.value.length === 1) {
    return {
      type: "warning" as const,
      title: t("psdSet.partialMissingTemplateConfigAlert"),
    };
  }
  return {
    type: "warning" as const,
    title: t("psdSet.missingTemplateConfigAlert"),
  };
});

const publishConfigDataSource = computed(() => {
  const start = (publishConfigCurrentPage.value - 1) * publishConfigPageSize.value;
  const end = start + publishConfigPageSize.value;
  return filteredPublishConfigs.value.slice(start, end);
});

const publishConfigGridOptions = computed(() => ({
  ...commonGridOptions,
  height: 520,
  loading: false,
  rowConfig: { isHover: true, keyField: "id" },
  columnConfig: { resizable: true },
  checkboxConfig: {
    checkRowKeys: publishConfigSelectedIds.value,
    highlight: true,
    trigger: "row" as const,
    checkMethod: ({ row }: any) => isPublishConfigSelectable(row),
  },
  columns: [
    { type: "checkbox" as any, width: 60, align: "center" as any },
    {
      field: "taskType",
      title: t("psdSet.taskType"),
      width: 180,
      formatter: ({ row }: any) => formatTaskTypeName(row?.taskType, row?.platform),
    },
    { field: "name", title: t("psdSet.configName"), minWidth: 180, showOverflow: true },
    {
      field: "templateBinding",
      title: t("psdSet.boundTemplate"),
      width: 180,
      showOverflow: true,
      slots: { default: "publishConfigTemplateSlot" },
    },
    {
      field: "matchStatus",
      title: t("psdSet.matchStatus"),
      width: 160,
      slots: { default: "publishConfigMatchSlot" },
    },
    { field: "description", title: t("psdSet.remark"), minWidth: 220, showOverflow: true },
  ],
}));

const publishTasksGridOptions = computed(() => ({
  ...commonGridOptions,
  maxHeight: Math.max(height.value - 260, 360),
  rowConfig: { isHover: true, keyField: "id" },
  columnConfig: { resizable: true },
  columns: [
    { field: "id", title: t("psdSet.taskId"), minWidth: 240, showOverflow: true },
    { field: "platform", title: t("psdSet.platform"), width: 120, slots: { default: "taskPlatformSlot" } },
    {
      field: "uploader",
      title: t("psdSet.creator"),
      width: 140,
      showOverflow: true,
      formatter: ({ row }: any) =>
        row?.uploader?.account || row?.uploader?.name || row?.userId || "-",
    },
    { field: "status", title: t("common.status"), width: 120, slots: { default: "taskStatusSlot" } },
    { field: "description", title: t("psdSet.description"), minWidth: 280, showOverflow: true },
    {
      field: "createdAt",
      title: t("common.createTime"),
      width: 180,
      formatter: ({ cellValue }: any) => formatTimestamp(cellValue),
    },
    {
      field: "updatedAt",
      title: t("common.updateTime"),
      width: 180,
      formatter: ({ cellValue }: any) => formatTimestamp(cellValue),
    },
    {
      field: "error",
      title: t("psdSet.errorInfo"),
      minWidth: 260,
      showOverflow: true,
      slots: { default: "taskErrorSlot" },
    },
    buildOperationColumn("taskActionSlot"),
  ],
}));

const publishUsageGridOptions = computed(() => ({
  ...commonGridOptions,
  maxHeight: Math.max(height.value - 260, 360),
  rowConfig: { isHover: true, keyField: "id" },
  columnConfig: { resizable: true },
  columns: [
    { field: "imageUrl", title: t("psdSet.relatedImage"), width: 96, slots: { default: "usageImageSlot" } },
    { field: "publishConfigId", title: t("psdSet.publishConfig"), minWidth: 220, slots: { default: "usageConfigSlot" } },
    { field: "status", title: t("common.status"), width: 110, slots: { default: "usageStatusSlot" } },
    { field: "taskId", title: t("psdSet.taskId"), minWidth: 220, showOverflow: true },
    {
      field: "createTime",
      title: t("common.createTime"),
      width: 170,
      formatter: ({ cellValue }: any) => formatTimestamp(cellValue),
    },
    {
      field: "updateTime",
      title: t("common.updateTime"),
      width: 170,
      formatter: ({ cellValue }: any) => formatTimestamp(cellValue),
    },
  ],
}));

const productsGridOptions = computed(() => ({
  ...commonGridOptions,
  maxHeight: Math.max(height.value - 320, 360),
  rowConfig: { isHover: true, keyField: "id" },
  columnConfig: { resizable: true },
  columns: [
    { field: "id", title: t("psdSet.productId"), minWidth: 200, showOverflow: true },
    { field: "images", title: t("psdSet.image"), width: 100, slots: { default: "productImageSlot" } },
    { field: "name", title: t("psdSet.productName"), minWidth: 220, showOverflow: true },
    { field: "type", title: t("psdSet.type"), width: 110, showOverflow: true },
    { field: "salePrice", title: t("psdSet.price"), width: 140, slots: { default: "productPriceSlot" } },
    { field: "stock", title: t("psdSet.stock"), width: 80 },
    { field: "isPublish", title: t("common.status"), width: 100, slots: { default: "productStatusSlot" } },
    {
      field: "createTime",
      title: t("common.createTime"),
      width: 180,
      formatter: ({ cellValue }: any) => formatTimestamp(cellValue),
    },
    buildOperationColumn("productActionSlot"),
  ],
}));

const publishTaskStatusCount = computed(() => {
  const summary = {
    completed: 0,
    processing: 0,
    failed: 0,
  };
  publishTasks.value.forEach((item: any) => {
    if (item?.status === "completed") summary.completed += 1;
    else if (item?.status === "failed") summary.failed += 1;
    else summary.processing += 1;
  });
  return summary;
});

const statusOptions = [
  { label: t("psdSet.statusPending"), value: "pending" },
  { label: t("psdSet.statusProcessing"), value: "processing" },
  { label: t("psdSet.statusCompleted"), value: "completed" },
  { label: t("psdSet.statusFailed"), value: "failed" },
];

const queryParams = reactive({
  currentPage: 1,
  pageSize: 20,
  id: "",
  keyword: "",
  stickerId: "",
  psdTemplateId: "",
  status: "",
  sortingFields: defaultSortingValue(),
  startTime: "",
  endTime: "",
  publishUsageConfigId: [] as string[],
});

const dateRange = ref<[string, string] | null>(null);

// 日期快捷选项
const dateShortcuts = [
  {
    text: t("psdSet.shortcutLastHour"),
    value: () => {
      const end = new Date();
      const start = new Date(end.getTime() - 60 * 60 * 1000);
      return [start, end];
    },
  },
  {
    text: t("psdSet.shortcutToday"),
    value: () => {
      const end = new Date();
      const start = new Date(end.getFullYear(), end.getMonth(), end.getDate(), 0, 0, 0, 0);
      return [start, end];
    },
  },
  {
    text: t("psdSet.shortcutYesterday"),
    value: () => {
      const end = new Date();
      end.setDate(end.getDate() - 1);
      end.setHours(23, 59, 59, 999);
      const start = new Date(end.getFullYear(), end.getMonth(), end.getDate(), 0, 0, 0, 0);
      return [start, end];
    },
  },
  {
    text: t("psdSet.shortcutLast3Days"),
    value: () => {
      const end = new Date();
      const start = new Date(end.getTime() - 3 * 24 * 60 * 60 * 1000);
      start.setHours(0, 0, 0, 0);
      return [start, end];
    },
  },
  {
    text: t("psdSet.shortcutLastWeek"),
    value: () => {
      const end = new Date();
      const start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
      start.setHours(0, 0, 0, 0);
      return [start, end];
    },
  },
  {
    text: t("psdSet.shortcutLastMonth"),
    value: () => {
      const end = new Date();
      const start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
      start.setHours(0, 0, 0, 0);
      return [start, end];
    },
  },
  {
    text: t("psdSet.shortcutLast3Months"),
    value: () => {
      const end = new Date();
      const start = new Date(end.getTime() - 90 * 24 * 60 * 60 * 1000);
      start.setHours(0, 0, 0, 0);
      return [start, end];
    },
  },
];

// 处理日期范围选择器变化
function handleDateRangeChange(value: [string, string] | null) {
  if (value && value.length === 2) {
    queryParams.startTime = value[0];
    queryParams.endTime = value[1];
  } else {
    queryParams.startTime = "";
    queryParams.endTime = "";
  }
  getList();
}

const showDetails = ref(false);
const detailDialogVisible = ref(false);
const detailLoading = ref(false);
const detailData = ref<any>(null);
const detailStickers = computed(() => getStickers(detailData.value || {}));
const detailImages = computed(() =>
  Array.isArray(detailData.value?.images) ? detailData.value.images : [],
);
const detailMetaObject = computed(() => {
  const meta = detailData.value?.meta;
  if (!meta) return null;
  if (typeof meta === "string") {
    try {
      return JSON.parse(meta);
    } catch (e) {
      return null;
    }
  }
  return typeof meta === "object" ? meta : null;
});
const detailAutomationList = computed(() => {
  const automations = detailMetaObject.value?.automations;
  return Array.isArray(automations) ? automations : [];
});
const detailAutomationCount = computed(() => detailAutomationList.value.length);
const detailAutomationText = computed(() => {
  if (!detailAutomationList.value.length) return t("psdSet.none");
  return detailAutomationList.value
    .map((item: any) => item?.type || item?.action || item?.kind || t("psdSet.unnamedAction"))
    .join("、");
});
const detailStickerIdsText = computed(() => {
  const ids = detailStickers.value.map((item: any) => item?.id).filter(Boolean);
  return ids.length ? ids.join("\n") : "-";
});
const detailPublishTaskCount = computed(() => {
  const value =
    detailData.value?.publishTaskCount ??
    detailMetaObject.value?.publishTaskCount ??
    detailMetaObject.value?.publishTasks?.length ??
    0;
  return Number(value) || 0;
});

function normalizePsdSetId(value: unknown) {
  return String(value || "").trim();
}

function getPsdSetTemplateId(row: any) {
  return String(row?.psdTemplateId || row?.psdTemplate?.id || "").trim();
}

function getProductGenerationTemplatePsdId(template: any) {
  return String(template?.psdTemplateId || "").trim();
}

function getGenerateProductTemplateMatchInfo(template: any) {
  const boundTemplateId = getProductGenerationTemplatePsdId(template);
  if (!boundTemplateId) {
    return {
      selectable: false,
      label: t("psdSet.notBoundTemplate"),
      reason: t("psdSet.notBoundTemplateReason"),
    };
  }
  if (generateProductTargetTemplateMode.value === "multiple") {
    return {
      selectable: false,
      label: t("psdSet.needBatchGenerate"),
      reason: t("psdSet.needBatchGenerateReason"),
    };
  }
  if (generateProductTargetTemplateMode.value !== "single") {
    return {
      selectable: false,
      label: t("psdSet.missingTemplate"),
      reason: t("psdSet.missingTemplateReason"),
    };
  }

  const matched = boundTemplateId === generateProductTargetTemplateIds.value[0];
  return {
    selectable: matched,
    label: matched ? t("psdSet.templateMatched") : t("psdSet.templateMismatch"),
    reason: matched ? "" : t("psdSet.templateMismatchReason"),
  };
}

function isGenerateProductTemplateSelectable(template: any) {
  return getGenerateProductTemplateMatchInfo(template).selectable;
}

function generateProductTemplateRowClassName({ row }: any) {
  return isGenerateProductTemplateSelectable(row) ? "" : "is-template-mismatch";
}

function getPublishConfigBoundTemplateId(config: any) {
  return String(config?.configData?.templateBinding?.psdTemplateId || "").trim();
}

function getPublishConfigBindingLabel(config: any) {
  const boundTemplateId = getPublishConfigBoundTemplateId(config);
  return boundTemplateId || t("psdSet.generalConfig");
}

function getPublishConfigMatchInfo(config: any) {
  const boundTemplateId = getPublishConfigBoundTemplateId(config);
  if (!boundTemplateId) {
    return {
      selectable: true,
      label: t("psdSet.selectable"),
      type: "success" as const,
      reason: "",
    };
  }

  if (publishConfigTargetTemplateMode.value === "multiple") {
    return {
      selectable: false,
      label: t("psdSet.multiTemplateUnavailable"),
      type: "warning" as const,
      reason: t("psdSet.multiTemplateUnavailableReason"),
    };
  }

  if (publishConfigTargetTemplateMode.value !== "single") {
    return {
      selectable: false,
      label: t("psdSet.missingTemplate"),
      type: "warning" as const,
      reason: t("psdSet.missingTemplateConfigReason"),
    };
  }

  const targetTemplateId = publishConfigTargetTemplateIds.value[0];
  const matched = boundTemplateId === targetTemplateId;
  return {
    selectable: matched,
    label: matched ? t("psdSet.templateMatched") : t("psdSet.templateMismatch"),
    type: matched ? ("success" as const) : ("danger" as const),
    reason: matched ? "" : t("psdSet.configTemplateMismatchReason"),
  };
}

function isPublishConfigSelectable(config: any) {
  return getPublishConfigMatchInfo(config).selectable;
}

function normalizePsdSetRecord(record: any) {
  if (!record || typeof record !== "object" || Array.isArray(record)) {
    return record;
  }
  return { ...record };
}

function normalizePsdSetRuntimeStatus(status?: unknown) {
  const normalizedStatus = String(status || "").trim().toLowerCase();
  if (normalizedStatus === "running" || normalizedStatus === "assigned") {
    return "processing";
  }
  return normalizedStatus;
}

function resolvePsdSetStatusMessage(record: any) {
  if (!record || typeof record !== "object") {
    return "-";
  }
  return String(record.statusMessage || "").trim() || "-";
}

function findPsdSetRowIndexById(psdSetId: unknown) {
  const normalizedId = normalizePsdSetId(psdSetId);
  if (!normalizedId) {
    return -1;
  }

  return dataSource.value.findIndex((item) => normalizePsdSetId(item?.id) === normalizedId);
}

function findPsdSetRowById(psdSetId: unknown) {
  const index = findPsdSetRowIndexById(psdSetId);
  return index >= 0 ? dataSource.value[index] : null;
}

function buildPsdSetStatusRecord(target: any, status: string, statusMessage?: string) {
  if (!target || typeof target !== "object") {
    return target;
  }
  const nextStatus = normalizePsdSetRuntimeStatus(status || target.status) || target.status;

  return {
    ...target,
    status: nextStatus,
    statusMessage: String(statusMessage ?? target.statusMessage ?? "").trim(),
  };
}

function applyPsdSetStatusLocally(psdSetId: unknown, status: string, statusMessage?: string) {
  const normalizedId = normalizePsdSetId(psdSetId);
  if (!normalizedId) {
    return;
  }
  const normalizedStatus = normalizePsdSetRuntimeStatus(status) || status;
  const rowIndex = findPsdSetRowIndexById(normalizedId);
  if (rowIndex >= 0) {
    const nextRow = buildPsdSetStatusRecord(
      dataSource.value[rowIndex],
      normalizedStatus,
      statusMessage,
    );
    dataSource.value.splice(rowIndex, 1, nextRow);
  }

  if (normalizePsdSetId(detailData.value?.id) === normalizedId) {
    detailData.value = buildPsdSetStatusRecord(
      detailData.value,
      normalizedStatus,
      statusMessage,
    );
  }
}

function getPsdSetDisplayStatus(record: any) {
  if (!record || typeof record !== "object") {
    return normalizePsdSetRuntimeStatus(record) || "";
  }
  return normalizePsdSetRuntimeStatus(record.status) || record.status || "";
}

function applyManualPsdSetStatusLocally(psdSetId: unknown, status: string) {
  const normalizedStatus = normalizePsdSetRuntimeStatus(status) || status;
  applyPsdSetStatusLocally(psdSetId, normalizedStatus, "");
}

// 编辑配置对话框相关状态
const configEditDialogVisible = ref(false);
const configEditDialogLoading = ref(false);
const configEditDialogData = ref<any>(null);
const configEditDialogValue = ref("");
const configEditDialogError = ref("");
const configEditDialogSaving = ref(false);
let configValidateTimer: ReturnType<typeof setTimeout> | null = null;
let psdSetSchedulerRuntimeTimer: ReturnType<typeof setInterval> | null = null;
let psdSetRuntimeReloadTimer: ReturnType<typeof setTimeout> | null = null;
let psdSetActiveRuntimeTimer: ReturnType<typeof setInterval> | null = null;
// 查看配置对话框相关状态
const configViewDialogVisible = ref(false);
const configViewDialogLoading = ref(false);
const configViewDialogData = ref<any>(null);
const configViewFormatted = computed(() => {
  const config = configViewDialogData.value?.stickerPsdSetConfig;
  if (!config) return "";
  try {
    const parsed = typeof config === "string" ? JSON.parse(config) : config;
    return JSON.stringify(parsed, null, 2);
  } catch (e) {
    return String(config);
  }
});

// 格式化配置信息用于预览
const formattedConfig = computed(() => {
  const config = detailData.value?.stickerPsdSetConfig;
  if (!config) return "";
  try {
    const parsed = typeof config === "string" ? JSON.parse(config) : config;
    return JSON.stringify(parsed, null, 2);
  } catch (e) {
    return String(config);
  }
});

const detailMetaFormatted = computed(() => {
  const meta = detailData.value?.meta;
  if (!meta) return "";
  try {
    const parsed = typeof meta === "string" ? JSON.parse(meta) : meta;
    return JSON.stringify(parsed, null, 2);
  } catch (e) {
    return String(meta);
  }
});

function getColumns() {
  const baseColumns = [
    { type: "checkbox", width: 50, fixed: "left" as const },
    { title: t("psdSet.psdSetImage"), field: "images", width: 200, slots: { default: "imagesSlot" } },
    { title: t("psdSet.psdSetName"), field: "name", minWidth: 180 },
    { title: t("psdSet.multiMaterialAssociation"), field: "stickers", width: 120, slots: { default: "stickersCountSlot" } },
    { title: t("common.status"), field: "status", width: 120, slots: { default: "statusSlot" } },
    {
      title: t("psdSet.statusDescription"),
      field: "statusMessage",
      width: 280,
      showOverflow: true,
      formatter: ({ row }) => resolvePsdSetStatusMessage(row),
    },
    { title: t("psdSet.configInfo"), field: "config", width: 150, slots: { default: "configSlot" } },
    {
      title: t("psdSet.processingDuration"),
      field: "processingTime",
      width: 140,
      formatter: ({ cellValue }) => formatProcessingTime(cellValue),
    },
    {
      title: "ID",
      field: "id",
      width: 120,
      showOverflow: false,
      slots: { default: "idSlot" },
    },
    {
      title: t("common.createTime"),
      field: "createTime",
      width: 160,
      formatter: ({ cellValue }) => formatTimestamp(cellValue),
    },
    {
      title: t("common.updateTime"),
      field: "updateTime",
      width: 160,
      formatter: ({ cellValue }) => formatTimestamp(cellValue),
    },
  ];

  const operationColumn = [buildOperationColumn("operationSlot")];

  return [...baseColumns, ...operationColumn];
}

const { height } = useWindowSize();

const gridOptions = ref<any>({
  ...commonGridOptions,
  maxHeight: Math.max(height.value - 280, 360),
  rowConfig: {
    keyField: "id",
  },
  checkboxConfig: {
    reserve: true,
  },
  columns: getColumns(),
});

function psdSetRowClassName({ row }: any) {
  if (row?.publishUsage?.occupied === true) {
    return "is-publish-usage-occupied has-publish-usage-badge";
  }
  if (row?.publishUsage?.occupied === false) {
    return "is-publish-usage-available has-publish-usage-badge";
  }
  return "";
}

function handlePsdSetCellClick({ row, column }: any) {
  if (!row?.publishUsage) {
    return;
  }
  if (String(column?.type || "") === "checkbox" || String(column?.field || "") === "checkbox") {
    void handleViewPublishUsageRecords(row);
  }
}

watchEffect(() => {
  gridOptions.value.maxHeight = Math.max(height.value - 280, 360);
});

async function getList(silent = false) {
  const requestSeq = ++psdSetListRequestSeq;
  if (!silent) {
    pendingNonSilentRequests++;
    loading.value = true;
  }
  try {
    const res = await stickerPsdSetApi.page({
      ...queryParams,
      id: queryParams.id?.trim() || undefined,
      stickerId: queryParams.stickerId?.trim() || undefined,
      psdTemplateId: queryParams.psdTemplateId?.trim() || undefined,
      status: queryParams.status || undefined,
      keyword: queryParams.keyword?.trim() || undefined,
      includeDetails: showDetails.value,
      sortingFields: queryParams.sortingFields,
      startTime: queryParams.startTime || undefined,
      endTime: queryParams.endTime || undefined,
      publishUsageConfigId: queryParams.publishUsageConfigId.length
        ? queryParams.publishUsageConfigId
        : undefined,
    });
    if (requestSeq !== psdSetListRequestSeq) {
      return;
    }
    const normalizedList = Array.isArray(res.list)
      ? res.list.map((item) => normalizePsdSetRecord(item))
      : [];
    dataSource.value = normalizedList;
    total.value = res.total || 0;
  } catch (error) {
    if (!silent) {
      console.error("加载 PSD 套图列表失败:", error);
    }
  } finally {
    if (!silent) {
      pendingNonSilentRequests = Math.max(0, pendingNonSilentRequests - 1);
    }
    // 只要没有在途的前台非静默请求，或者当前完成的是最新请求，必须安全重置 loading 状态
    if (pendingNonSilentRequests === 0 || requestSeq === psdSetListRequestSeq) {
      loading.value = false;
    }
  }
}

function handleIdChange(val: string) {
  if (!val) {
    getList();
  }
}

function handleKeywordChange(val: string) {
  if (!val) {
    getList();
  }
}

function handleStickerIdChange(val: string) {
  if (!val) {
    getList();
  }
}

function handlePsdTemplateIdChange(val: string) {
  if (!val) {
    getList();
  }
}

function formatProcessingTime(seconds: any): string {
  const s = Number(seconds);
  if (isNaN(s) || s <= 0) return "-";
  if (s < 60) {
    const formatted = s % 1 === 0 ? String(s) : s.toFixed(2).replace(/\.?0+$/, "");
    return t("psdSet.secondsShort", { s: formatted, count: formatted });
  }
  if (s < 3600) {
    const minutes = Math.floor(s / 60);
    const rawSecs = s % 60;
    const secs = rawSecs % 1 === 0 ? String(rawSecs) : rawSecs.toFixed(2).replace(/\.?0+$/, "");
    return t("psdSet.minutesSeconds", {
      m: minutes,
      s: secs,
      minutes,
      seconds: secs,
      count: s,
    });
  }
  const hours = Math.floor(s / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const rawSecs = s % 60;
  const secs = rawSecs % 1 === 0 ? String(rawSecs) : rawSecs.toFixed(2).replace(/\.?0+$/, "");
  return t("psdSet.hoursMinutesSeconds", {
    h: hours,
    m: minutes,
    s: secs,
    hours,
    minutes,
    seconds: secs,
    count: s,
  });
}

function getPreviewImageList(row: any): string[] {
  return Array.isArray(row?.images)
    ? row.images.filter((url: any) => typeof url === "string" && url.trim())
    : [];
}

function handlePublishUsageViewChange() {
  queryParams.currentPage = 1;
  getList();
}

function getPreviewImageKey(row: any) {
  const id = normalizePsdSetId(row?.id);
  return id || getPreviewImageList(row).join("|");
}

function getPreviewImageCount(row: any) {
  return getPreviewImageList(row).length;
}

function getPreviewImageIndex(row: any) {
  const imageCount = getPreviewImageCount(row);
  if (imageCount <= 0) {
    return 0;
  }

  const key = getPreviewImageKey(row);
  const rawIndex = Number(tablePreviewImageIndexMap[key] ?? 0);
  const index = Number.isFinite(rawIndex) ? Math.trunc(rawIndex) : 0;
  return Math.min(Math.max(index, 0), imageCount - 1);
}

function shiftPreviewImage(row: any, delta: number) {
  const images = getPreviewImageList(row);
  if (images.length <= 1) {
    return;
  }

  const key = getPreviewImageKey(row);
  const currentIndex = getPreviewImageIndex(row);
  tablePreviewImageIndexMap[key] = (currentIndex + delta + images.length) % images.length;
}

function openPsdSetImagePreview(row: any, initialIndex?: number) {
  const images = getPreviewImageList(row);
  if (!images.length) {
    return;
  }

  const index = typeof initialIndex === "number" ? initialIndex : getPreviewImageIndex(row);
  tableImageViewerUrls.value = images;
  tableImageViewerIndex.value = Math.min(Math.max(Math.trunc(index), 0), images.length - 1);
  tableImageViewerVisible.value = true;
  nextTick(() => {
    mountTableImageViewerIndexLabel();
    updateTableImageViewerIndexLabel();
  });
}

function handleTableImageViewerSwitch(index: number) {
  tableImageViewerIndex.value = Math.min(
    Math.max(Math.trunc(Number(index) || 0), 0),
    Math.max(tableImageViewerUrls.value.length - 1, 0),
  );
  updateTableImageViewerIndexLabel();
}

function handleTableImageViewerClose() {
  tableImageViewerVisible.value = false;
  removeTableImageViewerIndexLabel();
}

function mountTableImageViewerIndexLabel() {
  if (typeof document === "undefined") {
    return;
  }

  const viewerWrapper = document.querySelector(".el-image-viewer__wrapper");
  if (!viewerWrapper) {
    return;
  }

  if (!tableImageViewerLabelEl) {
    tableImageViewerLabelEl = document.createElement("div");
    tableImageViewerLabelEl.className = "psd-set-image-viewer-index-label";
    tableImageViewerLabelEl.style.cssText = [
      "position:absolute",
      "left:24px",
      "top:24px",
      "z-index:10",
      "display:inline-flex",
      "align-items:center",
      "justify-content:center",
      "height:34px",
      "min-width:104px",
      "padding:0 14px",
      "border-radius:999px",
      "background:rgba(15,23,42,.82)",
      "color:#fff",
      "font-size:14px",
      "line-height:34px",
      "box-shadow:0 8px 22px rgba(0,0,0,.28)",
      "pointer-events:none",
    ].join(";");
  }

  if (tableImageViewerLabelEl.parentElement !== viewerWrapper) {
    viewerWrapper.appendChild(tableImageViewerLabelEl);
  }
}

function updateTableImageViewerIndexLabel() {
  if (!tableImageViewerLabelEl) {
    return;
  }

  tableImageViewerLabelEl.textContent = t("psdSet.imageViewerIndex", {
    index: tableImageViewerDisplayIndex.value,
    total: tableImageViewerUrls.value.length,
  });
}

function removeTableImageViewerIndexLabel() {
  tableImageViewerLabelEl?.remove();
  tableImageViewerLabelEl = null;
}

// 批量下载套图图片（与商品页面逻辑一致）
async function handleDownloadPsdSetImages(row: any) {
  if (!row || !Array.isArray(row.images) || !row.images.length) {
    ElMessage.warning(t("psdSet.noDownloadableImages"));
    return;
  }

  const images: string[] = row.images.filter((u: any) => typeof u === "string" && u.trim());
  if (!images.length) {
    ElMessage.warning(t("psdSet.noDownloadableImages"));
    return;
  }

  const baseName = row.name || t("psdSet.psdSetImages");
  ElMessage.info(t("psdSet.startDownloading", { count: images.length }));

  for (let i = 0; i < images.length; i++) {
    const url = images[i];
    const suffixMatch = String(url).match(/\.([a-zA-Z0-9]+)(\?.*)?$/);
    const ext = suffixMatch ? suffixMatch[1] : "jpg";
    const filename = `${baseName}_${i + 1}.${ext}`;

    try {
      await downloadImageEnhanced(url, filename, { showMessage: false, fallbackToNewWindow: true });
    } catch (e) {
      console.error("下载单张图片失败:", e);
    }
  }

  ElMessage.success(t("psdSet.batchDownloadCompleted"));
}

function statusLabel(status: string) {
  const normalizedStatus = normalizePsdSetRuntimeStatus(status);
  const item = statusOptions.find((s) => s.value === normalizedStatus);
  return item ? item.label : normalizedStatus || "-";
}

function getClientPhotoshopService(client: any) {
  return (
    client?.clientInfo?.services?.["ps-automation"] ||
    client?.clientInfo?.services?.photoshop ||
    null
  );
}

function isPhotoshopRuntimeErrorMessage(message: unknown) {
  const text = String(message || "").trim().toLowerCase();
  if (!text) {
    return false;
  }

  const positiveHints = [
    "已连接",
    "可执行",
    "已就绪",
    "已启动",
    "服务在线",
    "在线",
    "可用",
    "等待 photoshop 启动",
    "等待 ps 就绪",
  ];
  if (positiveHints.some((hint) => text.includes(hint))) {
    return false;
  }

  const explicitErrorHints = [
    "ps 自动化连接异常",
    "network error",
    "econnrefused",
    "econnreset",
    "econnaborted",
    "etimedout",
    "timeout",
    "timed out",
    "socket hang up",
    "ps 处理服务未启动",
    "photoshop 处理请求超时",
    "状态检测失败",
    "状态检测暂时未响应",
    "处理服务异常",
    "服务异常",
    "连接失败",
    "连接异常",
    "无法连接",
  ];
  if (explicitErrorHints.some((hint) => text.includes(hint))) {
    return true;
  }

  const hasPhotoshopSignal =
    text.includes("ps 自动化") ||
    text.includes("photoshop") ||
    text.includes("localhost:1595") ||
    text.includes("ps 处理服务");

  return !!(
    hasPhotoshopSignal &&
    (text.includes("失败") ||
      text.includes("异常") ||
      text.includes("未启动") ||
      text.includes("不可用") ||
      text.includes("拒绝") ||
      text.includes("超时"))
  );
}

function resolvePhotoshopServiceIssue(service: any) {
  if (!service) {
    return {
      kind: "missing" as const,
      reason: t("psdSet.psAutomationNotReported"),
    };
  }

  const details = service?.details || {};
  const state = String(service?.state || service?.status || "").toLowerCase();
  const lastError = String(service?.lastError || "").trim();
  const transientError = String(details?.transientStatusError || "").trim();
  const message = String(service?.message || "").trim();
  const fallbackReason = lastError || transientError || message;

  if (isPhotoshopServiceReady(service)) {
    return {
      kind: "ready" as const,
      reason: message || t("psdSet.psReady"),
    };
  }

  if (state === "error" || service?.status === "error") {
    return {
      kind: "error" as const,
      reason: fallbackReason || t("psdSet.psServiceError"),
    };
  }

  if (isPhotoshopRuntimeErrorMessage(lastError)) {
    return {
      kind: "error" as const,
      reason: lastError,
    };
  }

  if (state === "offline" || state === "disconnected" || service?.status === "disconnected") {
    return {
      kind: "offline" as const,
      reason: message || t("psdSet.psAutomationDisconnected"),
    };
  }

  if (transientError && !isPhotoshopServiceReady(service)) {
    return {
      kind: "not_ready" as const,
      reason: transientError,
    };
  }

  return {
    kind: "not_ready" as const,
    reason: fallbackReason || t("psdSet.psNotReady"),
  };
}

function isPhotoshopServiceReady(service: any) {
  if (!service) {
    return false;
  }
  if (service?.available === true || service?.details?.photoshopReady === true) {
    return true;
  }
  const state = String(service?.state || service?.status || "").toLowerCase();
  if (
    state === "error" ||
    state === "offline" ||
    state === "disconnected" ||
    isPhotoshopRuntimeErrorMessage(service?.lastError)
  ) {
    return false;
  }
  return false;
}

function getDispatchClientUnavailableReason(client: any) {
  if (!client?.isOnline) {
    return t("psdSet.clientOffline");
  }
  const service = getClientPhotoshopService(client);
  if (!service) {
    return t("psdSet.clientNoPsAutomation");
  }
  if (isDispatchClientBusy(client)) {
    return t("psdSet.clientMakingOtherPsdSet");
  }
  const issue = resolvePhotoshopServiceIssue(service);
  if (issue.kind === "ready") {
    return "";
  }
  return issue.reason || t("psdSet.clientPsUnavailable");
}

function getClientDisplayName(client: any) {
  return client?.clientInfo?.machine?.code || client?.id || "-";
}

function getClientRuntimePsdSet(client: any) {
  const psAutomation = client?.clientInfo?.psAutomation || {};
  const service = getClientPhotoshopService(client) || {};
  const progress = typeof psAutomation?.progress === "number" ? psAutomation.progress : null;
  const running = psAutomation?.running === true || service?.busy === true;
  const psdSetId =
    String(psAutomation?.currentPsSetId || "").trim() ||
    String(service?.currentTaskId || "").trim();
  if (!running) {
    return null;
  }
  return {
    id: psdSetId || String(client?.id || "ps-running"),
    name: String(psAutomation?.currentPsSetName || "").trim() || null,
    currentStep:
      String(psAutomation?.currentStep || "").trim() ||
      String(service?.message || "").trim() ||
      t("psdSet.photoshopMaking"),
    progress,
  };
}

function getDispatchClientRuntimeBusyLabel(client: any) {
  const runtimeItem = getClientRuntimePsdSet(client);
  if (!runtimeItem) {
    return "";
  }
  const taskLabel = String(runtimeItem.name || runtimeItem.id || "").trim();
  const step = String(runtimeItem.currentStep || "").trim();
  return [taskLabel, step].filter(Boolean).join(" · ");
}

function getDispatchClientActivePsdSets(client: any) {
  const clientId = String(client?.id || "").trim();
  if (!clientId) {
    return [];
  }
  return activePsdSets.value.filter(
    (item) => String(item?.assignedClientId || "").trim() === clientId,
  );
}

function isDispatchClientBusy(client: any) {
  const clientId = String(client?.id || "").trim();
  const runtimeItem = getClientRuntimePsdSet(client);
  return !!clientId && (activePsdSetClientIds.value.includes(clientId) || !!runtimeItem);
}

function isDispatchClientExecutable(client: any) {
  return !getDispatchClientUnavailableReason(client);
}

function getDispatchClientOnlineStatus(client: any) {
  return client?.isOnline
    ? { text: t("psdSet.online"), tone: "success" }
    : { text: t("psdSet.offline"), tone: "danger" };
}

function getDispatchClientPsStatus(client: any) {
  const service = getClientPhotoshopService(client);
  if (!client?.isOnline) {
    return { text: t("psdSet.unavailable"), tone: "danger", reason: t("psdSet.clientOffline") };
  }
  if (!service) {
    return { text: t("psdSet.notEnabled"), tone: "muted", reason: t("psdSet.psAutomationNotReported") };
  }

  const issue = resolvePhotoshopServiceIssue(service);
  if (issue.kind === "ready") {
    return { text: t("psdSet.enabled"), tone: "success", reason: issue.reason };
  }
  if (issue.kind === "error") {
    return { text: t("psdSet.abnormal"), tone: "danger", reason: issue.reason };
  }
  if (issue.kind === "offline") {
    return { text: t("psdSet.notConnected"), tone: "danger", reason: issue.reason };
  }
  if (service.connected) {
    return { text: t("psdSet.notReady"), tone: "info", reason: issue.reason };
  }
  return { text: t("psdSet.notEnabled"), tone: "muted", reason: issue.reason };
}

function getDispatchClientProductionStatus(client: any) {
  const activeItems = getDispatchClientActivePsdSets(client);
  if (activeItems.length > 0) {
    return {
      text:
        activeItems.length > 1
          ? `${t("psdSet.making")}(${activeItems.length})`
          : t("psdSet.making"),
      tone: "warning",
    };
  }
  if (getClientRuntimePsdSet(client)) {
    return { text: t("psdSet.busy"), tone: "warning" };
  }
  return { text: t("psdSet.idle"), tone: isDispatchClientExecutable(client) ? "success" : "muted" };
}

const dispatchCandidateClients = computed(() =>
  clientNodes.value.filter((client) => {
    if (!client?.isOnline) {
      return false;
    }
    const service = getClientPhotoshopService(client);
    return !!(service || client?.clientInfo?.psAutomation);
  }),
);

const dispatchClientRows = computed(() =>
  dispatchCandidateClients.value
    .map((client) => {
      const onlineStatus = getDispatchClientOnlineStatus(client);
      const psStatus = getDispatchClientPsStatus(client);
      const productionStatus = getDispatchClientProductionStatus(client);
      return {
        id: client.id,
        client,
        clientLabel: getClientDisplayName(client),
        connectedAtLabel: formatTimestamp(client.connectedAt) || "-",
        onlineStatusText: onlineStatus.text,
        onlineStatusTone: onlineStatus.tone,
        psStatusText: psStatus.text,
        psStatusTone: psStatus.tone,
        psStatusReason: psStatus.reason,
        productionStatusText: productionStatus.text,
        productionStatusTone: productionStatus.tone,
        activeTaskLabel: getDispatchClientTaskLabel(client),
        activeTaskStep: getDispatchClientTaskStep(client),
        selectable: isDispatchClientExecutable(client),
      };
    })
    .sort((a, b) => {
      if (a.selectable !== b.selectable) {
        return a.selectable ? -1 : 1;
      }
      return a.clientLabel.localeCompare(b.clientLabel, "zh-CN");
    }),
);

function getDispatchClientTaskLabel(client: any) {
  const item = getDispatchClientActivePsdSets(client)[0];
  if (!item) {
    return getClientRuntimePsdSet(client) ? t("psdSet.clientBusyWaiting") : t("psdSet.none");
  }
  return String(item?.name || item?.id || t("psdSet.unnamedPsdSet"));
}

function formatDispatchTaskStep(item: any) {
  if (!item) {
    return "";
  }
  const runtimeItem = item as any;
  const progress = typeof runtimeItem?.progress === "number" ? `${runtimeItem.progress}%` : "";
  const step = String(runtimeItem?.currentStep || runtimeItem?.statusMessage || "").trim();
  return [step, progress].filter(Boolean).join(" · ");
}

function getDispatchClientTaskStep(client: any) {
  const activeItem = getDispatchClientActivePsdSets(client)[0];
  return activeItem ? formatDispatchTaskStep(activeItem) : getDispatchClientRuntimeBusyLabel(client);
}

const schedulerClientStats = computed(() => {
  const online = dispatchCandidateClients.value.filter((client) => client?.isOnline).length;
  const idle = dispatchCandidateClients.value.filter((client) => isDispatchClientExecutable(client)).length;
  const running = dataSource.value.filter((item) => normalizePsdSetRuntimeStatus(item?.status) === "processing").length;
  const pending = dataSource.value.filter((item) => normalizePsdSetRuntimeStatus(item?.status) === "pending").length;
  return { online, idle, running, pending };
});

function getDispatchClientLabelById(clientId: unknown, fallbackMachineCode?: unknown) {
  const normalizedClientId = String(clientId || "").trim();
  const client = dispatchCandidateClients.value.find((item) => item.id === normalizedClientId);
  return (
    (client ? getClientDisplayName(client) : "") ||
    String(fallbackMachineCode || "").trim() ||
    normalizedClientId ||
    t("psdSet.unknownClient")
  );
}

function getPsdSetProcessingRuntimeSource(item: any) {
  return {
    id: normalizePsdSetId(item?.id),
    name: String(item?.name || "").trim() || null,
    assignedClientId: String(item?.assignedClientId || "").trim() || null,
    assignedMachineCode: String(item?.assignedMachineCode || "").trim() || null,
    currentStep: String(item?.currentStep || item?.statusMessage || "").trim() || null,
    progress: typeof item?.progress === "number" ? item.progress : null,
  };
}

function getAutoDispatchProcessingRowKey(source: any, clientId?: string) {
  return source?.id || (clientId ? `client:${clientId}` : "ps-running");
}

function buildAutoDispatchProcessingRow(client: any, item: any) {
  const runtimeSource = getPsdSetProcessingRuntimeSource(item);
  const clientId = String(client?.id || runtimeSource.assignedClientId || "").trim();
  const taskId = runtimeSource.id || "ps-running";
  return {
    key: getAutoDispatchProcessingRowKey(runtimeSource, clientId),
    clientId,
    clientLabel: client ? getClientDisplayName(client) : getDispatchClientLabelById(clientId, runtimeSource.assignedMachineCode),
    taskId,
    taskName: String(runtimeSource.name || "").trim(),
    taskLabel: String(runtimeSource.name || runtimeSource.id || t("psdSet.unnamedPsdSet")),
    stepLabel: formatDispatchTaskStep(runtimeSource),
  };
}

function mergeAutoDispatchProcessingRows(
  clientRow: ReturnType<typeof buildAutoDispatchProcessingRow>,
  taskRow: ReturnType<typeof buildAutoDispatchProcessingRow>,
) {
  return {
    ...taskRow,
    key: taskRow.key || clientRow.key,
    clientId: clientRow.clientId || taskRow.clientId,
    clientLabel:
      clientRow.clientLabel && clientRow.clientLabel !== t("psdSet.unknownClient")
        ? clientRow.clientLabel
        : taskRow.clientLabel,
    stepLabel: clientRow.stepLabel || taskRow.stepLabel,
  };
}

const autoDispatchProcessingRows = computed(() => {
  const rowMap = new Map<string, ReturnType<typeof buildAutoDispatchProcessingRow>>();
  const dataRows = dataSource.value
    .filter((item) => normalizePsdSetRuntimeStatus(item?.status) === "processing")
    .map((item: any) => buildAutoDispatchProcessingRow(null, item));
  const activeSummaryRows = activePsdSets.value.map((item: any) => {
    const clientId = String(item?.assignedClientId || "").trim();
    const client = clientId
      ? dispatchCandidateClients.value.find((candidate) => candidate.id === clientId) || null
      : null;
    return buildAutoDispatchProcessingRow(client, item);
  });

  activeSummaryRows.forEach((row) => rowMap.set(row.key, row));
  dataRows.forEach((row) => {
    const previous = rowMap.get(row.key);
    if (!previous) {
      rowMap.set(row.key, row);
      return;
    }
    rowMap.set(row.key, mergeAutoDispatchProcessingRows(previous, row));
  });

  return Array.from(rowMap.values());
});

const dispatchableClients = computed(() =>
  dispatchCandidateClients.value.filter((client) => isDispatchClientExecutable(client)),
);

const selectedDispatchClient = computed(
  () =>
    dispatchCandidateClients.value.find((item) => item.id === selectedDispatchClientId.value) ||
    null,
);

const productionDispatchDialogTitle = computed(() =>
  productionDispatchMode.value === "auto" ? t("psdSet.enableAutoProduction") : t("psdSet.startProduction"),
);

const productionDispatchConfirmText = computed(() =>
  productionDispatchMode.value === "auto" ? t("psdSet.enableAutoProduction") : t("psdSet.startProduction"),
);

const productionDispatchSubmitting = computed(() =>
  productionDispatchMode.value === "auto"
    ? userAutoSchedulingLoading.value
    : !!productionDispatchRow.value?.id &&
      startingProductionId.value === productionDispatchRow.value.id,
);

const psdSetAutoDispatchTargetLabel = computed(() => {
  const clientId = String(userAutoDispatchClientId.value || "").trim();
  if (!clientId) {
    return "";
  }
  const client = dispatchCandidateClients.value.find((item) => item.id === clientId);
  const clientLabel = client ? getClientDisplayName(client) : clientId;
  return `${t("psdSet.target")} / ${clientLabel}`;
});

const autoDispatchFilterSummary = computed(() => {
  const parts = [];
  const keyword = autoDispatchFilterForm.keyword.trim();
  if (keyword) {
    parts.push(`${t("psdSet.keyword")}：${keyword}`);
  }
  if (autoDispatchFilterForm.createdAtRange?.length === 2) {
    parts.push(`${t("common.createTime")}：${autoDispatchFilterForm.createdAtRange[0]} ${t("psdSet.to")} ${autoDispatchFilterForm.createdAtRange[1]}`);
  }
  parts.push(autoDispatchFilterForm.sortOrder === "newest" ? t("psdSet.newestFirst") : t("psdSet.oldestFirst"));
  return parts.join("，");
});

const psdSetSchedulerIndicator = computed(() =>
  resolveAutoDispatchSchedulerIndicator(psdSetSchedulerRuntime.value),
);

const formatDurationSeconds = (milliseconds?: number | null) => {
  const seconds = Math.max(0, Math.round(Number(milliseconds || 0) / 1000));
  return `${seconds}s`;
};

const psdSetSchedulerRuntimeSummary = computed(() => {
  const runtime = psdSetSchedulerRuntime.value;
  if (!runtime) {
    return t("psdSet.waitingDetection");
  }
  if (runtime.running) {
    return `${t("psdSet.detecting")} ${formatDurationSeconds(runtime.cycleElapsedMs)}`;
  }
  return runtime.dispatchIntervalMs > 0
    ? `${Math.round(runtime.dispatchIntervalMs / 1000)} ${t("psdSet.secondsDetection")}`
    : t("psdSet.realTimeDetection");
});

function normalizeAutoDispatchFilters(filters?: Record<string, any> | null) {
  return {
    keyword: String(filters?.keyword || "").trim(),
    createdAtStart: String(filters?.createdAtStart || "").trim(),
    createdAtEnd: String(filters?.createdAtEnd || "").trim(),
    sortOrder: filters?.sortOrder === "newest" ? "newest" : "oldest",
  };
}

function applyAutoDispatchFiltersToForm(filters?: Record<string, any> | null) {
  const normalized = normalizeAutoDispatchFilters(filters);
  autoDispatchFilterForm.keyword = normalized.keyword;
  autoDispatchFilterForm.createdAtRange =
    normalized.createdAtStart && normalized.createdAtEnd
      ? [normalized.createdAtStart, normalized.createdAtEnd]
      : [];
  autoDispatchFilterForm.sortOrder = normalized.sortOrder;
}

function buildAutoDispatchFiltersPayload() {
  const [createdAtStart = "", createdAtEnd = ""] = autoDispatchFilterForm.createdAtRange || [];
  return {
    keyword: autoDispatchFilterForm.keyword.trim(),
    createdAtStart,
    createdAtEnd,
    sortOrder: autoDispatchFilterForm.sortOrder,
  };
}

async function openProductionDispatchDialog(row: any) {
  productionDispatchMode.value = "manual";
  productionDispatchRow.value = row;
  selectedDispatchClientId.value = "";
  productionDispatchLoading.value = true;
  productionDispatchDialogVisible.value = true;
}

async function openAutoSchedulingDispatchDialog() {
  userAutoSchedulingLoading.value = false;
  productionDispatchMode.value = "auto";
  productionDispatchRow.value = null;
  selectedDispatchClientId.value = userAutoDispatchClientId.value || "";
  applyAutoDispatchFiltersToForm(userAutoDispatchFilters.value);
  productionDispatchLoading.value = true;
  productionDispatchDialogVisible.value = true;
}

async function handleOpenProductionDispatchDialog() {
  productionDispatchLoading.value = true;
  try {
    await Promise.all([refreshClientNodes(), refreshPsdSetRuntimeSummary()]);
    if (!selectedDispatchClientId.value && dispatchableClients.value.length === 1) {
      selectedDispatchClientId.value = dispatchableClients.value[0].id;
    }
  } finally {
    productionDispatchLoading.value = false;
  }
}

function handleCloseProductionDispatchDialog() {
  productionDispatchLoading.value = false;
  productionDispatchRow.value = null;
  productionDispatchMode.value = "manual";
  selectedDispatchClientId.value = "";
}

function handleSelectDispatchClient(clientId: string) {
  selectedDispatchClientId.value = clientId;
}

function handleDispatchClientRowClick(row: any) {
  if (!row?.selectable) {
    return;
  }
  handleSelectDispatchClient(row.id);
}

function resolveDispatchClientRowClassName({ row }: { row: any }) {
  const classNames: string[] = [];
  if (row?.id === selectedDispatchClientId.value) {
    classNames.push("is-selected");
  }
  if (!row?.selectable) {
    classNames.push("is-disabled");
  }
  return classNames.join(" ");
}

async function refreshUserAutoSchedulingSetting() {
  await refreshUserAutoScheduling();
}

async function loadPsdSetDetailById(psdSetId: unknown, silent = false) {
  const normalizedId = normalizePsdSetId(psdSetId);
  if (!normalizedId) {
    return;
  }

  if (!silent) {
    pendingNonSilentDetailRequests++;
    detailLoading.value = true;
  }

  try {
    const res = await request.get({
      url: `/sticker-psd-set/${normalizedId}`,
    });
    detailData.value = normalizePsdSetRecord(res?.data || res || {});
  } catch (error: any) {
    if (!silent) {
      console.error("获取套图详情失败:", error);
      ElMessage.error(error?.message || t("psdSet.getDetailFailed"));
      detailDialogVisible.value = false;
    }
  } finally {
    if (!silent) {
      pendingNonSilentDetailRequests = Math.max(0, pendingNonSilentDetailRequests - 1);
    }
    if (pendingNonSilentDetailRequests === 0) {
      detailLoading.value = false;
    }
  }
}

async function loadPsdSetSchedulerRuntime() {
  try {
    const response = await getPsdSetAutoDispatchRuntime();
    psdSetSchedulerRuntime.value = normalizeAutoDispatchSchedulerRuntime(response);
  } catch {
    psdSetSchedulerRuntime.value = null;
  }
}

function schedulePsdSetRuntimeRefresh(delay = 600) {
  if (psdSetRuntimeReloadTimer) {
    clearTimeout(psdSetRuntimeReloadTimer);
  }

  psdSetRuntimeReloadTimer = setTimeout(() => {
    psdSetRuntimeReloadTimer = null;
    void getList(true);
    void loadPsdSetSchedulerRuntime();
    if (detailDialogVisible.value && detailData.value?.id) {
      void loadPsdSetDetailById(detailData.value.id, true);
    }
  }, delay);
}

function stopPsdSetActiveRuntimeRefresh() {
  if (!psdSetActiveRuntimeTimer) {
    return;
  }
  clearInterval(psdSetActiveRuntimeTimer);
  psdSetActiveRuntimeTimer = null;
}

async function handleToggleUserAutoScheduling(enabled: boolean) {
  if (enabled) {
    await openAutoSchedulingDispatchDialog();
    return;
  }

  const previousEnabled = userAutoSchedulingEnabled.value;
  const previousClientId = userAutoDispatchClientId.value;
  const previousFilters = userAutoDispatchFilters.value;
  setUserAutoSchedulingEnabled(enabled);
  userAutoSchedulingLoading.value = true;
  try {
    const result = await ClientControlService.setPsAutomationUserAutoScheduling(enabled, false, {
      filters: previousFilters,
    });
    if (!result.success) {
      setUserAutoSchedulingEnabled(previousEnabled);
      setUserAutoDispatchTarget({
        clientId: previousClientId,
      });
      setUserAutoDispatchFilters(previousFilters);
      return;
    }

    if (enabled) {
      void refreshPsdSetRuntimeSummary();
      schedulePsdSetRuntimeRefresh(120);
    }
    void loadPsdSetSchedulerRuntime();
  } catch {
    setUserAutoSchedulingEnabled(previousEnabled);
  } finally {
    userAutoSchedulingLoading.value = false;
  }
}

function statusTagType(status: string) {
  switch (normalizePsdSetRuntimeStatus(status)) {
    case "completed":
      return "success";
    case "processing":
      return "warning";
    case "failed":
      return "danger";
    case "pending":
      return "info";
    default:
      return "info";
  }
}

// 获取贴纸数组（兼容旧数据：优先使用 stickers，没有则使用 sticker）
function getStickers(row: any) {
  if (Array.isArray(row.stickers) && row.stickers.length > 0) {
    return row.stickers;
  }
  if (row.sticker) {
    return [row.sticker];
  }
  return [];
}

// 获取贴纸数量
function getStickersCount(row: any) {
  const stickers = getStickers(row);
  if (stickers.length > 0) {
    return stickers.length;
  }
  // 如果没有 stickers 数据，尝试从 stickerIds 获取数量
  if (Array.isArray(row.stickerIds) && row.stickerIds.length > 0) {
    return row.stickerIds.length;
  }
  // 如果有 stickerId，说明至少有一个
  if (row.stickerId) {
    return 1;
  }
  return 0;
}

// 复制 ID
async function copyId(id: string) {
  if (!id) return;
  try {
    await navigator.clipboard.writeText(id);
    ElMessage.success(t("psdSet.idCopied"));
  } catch (e) {
    // 降级方案
    const textarea = document.createElement("textarea");
    textarea.value = id;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
    ElMessage.success(t("psdSet.idCopied"));
  }
}

// 复制通用文本
async function copyText(text: string, successMsg?: string) {
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
    ElMessage.success(successMsg || t("common.copySuccess") || "已复制到剪贴板");
  } catch (e) {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
    ElMessage.success(successMsg || t("common.copySuccess") || "已复制到剪贴板");
  }
}

function onSelectionChange({ records, reserves }) {
  const current = Array.isArray(records) ? records : [];
  const reserveList = Array.isArray(reserves) ? reserves : [];
  const selectedRows = [...current, ...reserveList];
  selectedIds.value = selectedRows.map((item) => item.id);
  selectedPsdSetRows.value = selectedRows;
}

async function updateRowStatus(row, status: string) {
  try {
    await stickerPsdSetApi.updateStatus(row.id, { status });
    applyManualPsdSetStatusLocally(row.id, status);
    ElMessage.success(t("psdSet.statusUpdated"));
    getList(true);
  } catch (error: any) {
    ElMessage.error(error?.message || t("psdSet.statusUpdateFailed"));
  }
}

async function handleToProduct(row: any) {
  if (!row?.id) {
    return ElMessage.warning(t("psdSet.missingIdCannotGenerateProduct"));
  }
  generatingProductId.value = row.id;
  await openGenerateProductDialog([row.id]);
}

// 查看配置信息（独立的弹窗）
async function handleViewConfig(row: any) {
  if (!row?.id) {
    return ElMessage.warning(t("psdSet.missingIdCannotViewConfig"));
  }
  configViewDialogVisible.value = true;
  configViewDialogLoading.value = true;
  try {
    const res = await request.get({
      url: `/sticker-psd-set/${row.id}`,
    });
    configViewDialogData.value = res?.data || res || {};
  } catch (error: any) {
    console.error("获取套图详情失败:", error);
    ElMessage.error(error?.message || t("psdSet.getConfigFailed"));
    configViewDialogVisible.value = false;
  } finally {
    configViewDialogLoading.value = false;
  }
}

// 从查看配置弹窗跳转到编辑配置
function handleEditFromView() {
  if (!configViewDialogData.value?.id) {
    return ElMessage.warning(t("psdSet.missingIdCannotEditConfig"));
  }
  // 关闭查看配置弹窗
  configViewDialogVisible.value = false;
  // 打开编辑配置弹窗
  handleEditConfigDirectly(configViewDialogData.value);
}

async function handleViewDetail(row: any) {
  if (!row?.id) {
    return ElMessage.warning(t("psdSet.missingIdCannotViewDetail"));
  }
  detailDialogVisible.value = true;
  await loadPsdSetDetailById(row.id);
}

function handleCloseDetailDialog() {
  detailLoading.value = false;
  detailData.value = null;
}

// 直接编辑配置信息（打开独立的编辑配置对话框）
async function handleEditConfigDirectly(row: any) {
  if (!row?.id) {
    return ElMessage.warning(t("psdSet.missingIdCannotEditConfig"));
  }
  configEditDialogVisible.value = true;
  configEditDialogLoading.value = true;
  configEditDialogError.value = "";
  configEditDialogValue.value = "";
  try {
    const res = await request.get({
      url: `/sticker-psd-set/${row.id}`,
    });
    configEditDialogData.value = res?.data || res || {};
    // 初始化配置编辑值
    const config = configEditDialogData.value?.stickerPsdSetConfig;
    if (config) {
      try {
        const parsed = typeof config === "string" ? JSON.parse(config) : config;
        configEditDialogValue.value = JSON.stringify(parsed, null, 2);
      } catch (e) {
        // 如果解析失败，显示原始值并提示错误
        configEditDialogValue.value = String(config);
        configEditDialogError.value = t("psdSet.configFormatInvalidSave");
      }
    } else {
      configEditDialogValue.value = "{}";
    }
  } catch (error: any) {
    console.error("获取套图详情失败:", error);
    ElMessage.error(error?.message || t("psdSet.getDetailFailed"));
    configEditDialogVisible.value = false;
  } finally {
    configEditDialogLoading.value = false;
  }
}

// 增强的JSON校验函数（用于编辑配置对话框）
function validateJsonEnhanced(jsonString: string): { valid: boolean; error?: string } {
  const trimmed = jsonString?.trim() || "";

  // 空值视为有效
  if (!trimmed) {
    return { valid: true };
  }

  // 检查是否以 { 或 [ 开头（基本结构检查）
  const firstChar = trimmed.charAt(0);
  const lastChar = trimmed.charAt(trimmed.length - 1);

  if (firstChar === "{" && lastChar !== "}") {
    return { valid: false, error: t("psdSet.jsonMissingClosingBrace") };
  }

  if (firstChar === "[" && lastChar !== "]") {
    return { valid: false, error: t("psdSet.jsonMissingClosingBracket") };
  }

  // 尝试解析JSON
  try {
    const parsed = JSON.parse(trimmed);

    // 额外检查：确保解析后是对象或数组（不允许原始值）
    if (parsed !== null && typeof parsed !== "object" && !Array.isArray(parsed)) {
      return { valid: false, error: t("psdSet.jsonMustBeObjectOrArray") };
    }

    return { valid: true };
  } catch (e: any) {
    // 提供更友好的错误信息
    let errorMsg = t("psdSet.jsonFormatError");
    if (e.message) {
      if (e.message.includes("Unexpected token")) {
        errorMsg = t("psdSet.jsonSyntaxError", { detail: e.message });
      } else if (e.message.includes("Unexpected end")) {
        errorMsg = t("psdSet.jsonIncomplete");
      } else if (e.message.includes("Unexpected string")) {
        errorMsg = t("psdSet.jsonStringError");
      } else {
        errorMsg = t("psdSet.jsonParseError", { detail: e.message });
      }
    }
    return { valid: false, error: errorMsg };
  }
}

// 实时校验JSON（用于编辑配置对话框）
function validateJsonRealtime(jsonString: string) {
  const result = validateJsonEnhanced(jsonString);
  configEditDialogError.value = result.error || "";
  return result.valid;
}

// 处理配置输入变化（带防抖）
function handleConfigInputChange() {
  // 清除之前的定时器
  if (configValidateTimer) {
    clearTimeout(configValidateTimer);
  }

  // 如果输入为空，清除错误信息
  if (!configEditDialogValue.value.trim()) {
    configEditDialogError.value = "";
    return;
  }

  // 防抖：500ms后执行校验
  configValidateTimer = setTimeout(() => {
    validateJsonRealtime(configEditDialogValue.value);
  }, 500);
}

// 取消编辑配置对话框
function handleCancelConfigEditDialog() {
  // 清理定时器
  if (configValidateTimer) {
    clearTimeout(configValidateTimer);
    configValidateTimer = null;
  }
  configEditDialogVisible.value = false;
  configEditDialogError.value = "";
  // 延迟清空数据，避免关闭动画时闪烁
  setTimeout(() => {
    configEditDialogData.value = null;
    configEditDialogValue.value = "";
  }, 300);
}

// 保存编辑配置对话框的配置信息
async function handleSaveConfigDialog() {
  const trimmedValue = configEditDialogValue.value?.trim() || "";

  // 验证JSON格式
  const validation = validateJsonEnhanced(trimmedValue);
  if (!validation.valid) {
    configEditDialogError.value = validation.error || t("psdSet.jsonFormatError");
    return;
  }

  if (!configEditDialogData.value?.id) {
    return ElMessage.warning(t("psdSet.missingIdCannotSaveConfig"));
  }

  configEditDialogSaving.value = true;
  try {
    // 解析并格式化JSON
    let configValue: any = null;
    if (trimmedValue) {
      configValue = JSON.parse(trimmedValue);
    }

    // 调用更新API（使用新字段名 stickerPsdSetConfig）
    await stickerPsdSetApi.update(configEditDialogData.value.id, {
      stickerPsdSetConfig: configValue,
    });

    ElMessage.success(t("psdSet.configSaved"));

    // 清理定时器
    if (configValidateTimer) {
      clearTimeout(configValidateTimer);
      configValidateTimer = null;
    }

    configEditDialogVisible.value = false;
    configEditDialogError.value = "";

    // 刷新列表以同步数据
    getList();

    // 延迟清空数据
    setTimeout(() => {
      configEditDialogData.value = null;
      configEditDialogValue.value = "";
    }, 300);
  } catch (error: any) {
    console.error("保存配置信息失败:", error);
    ElMessage.error(error?.message || t("psdSet.saveConfigFailed"));
  } finally {
    configEditDialogSaving.value = false;
  }
}

function handleDelete(row) {
  ElMessageBox.confirm(t("psdSet.confirmDeletePsdSet"), t("psdSet.deleteConfirm"), {
    confirmButtonText: t("common.delete"),
    cancelButtonText: t("common.cancel"),
    type: "warning",
  })
    .then(async () => {
      await stickerPsdSetApi.remove(row.id);
      ElMessage.success(t("psdSet.deleteSuccess"));
      selectedIds.value = selectedIds.value.filter((id) => id !== row.id);
      selectedPsdSetRows.value = selectedPsdSetRows.value.filter((r) => r.id !== row.id);
      getList();
    })
    .catch(() => { });
}

function handleBatchDelete() {
  if (!selectedIds.value.length) {
    return ElMessage.warning(t("psdSet.selectAtLeastOne"));
  }
  ElMessageBox.confirm(t("psdSet.confirmBatchDelete", { count: selectedIds.value.length }), t("psdSet.batchDelete"), {
    confirmButtonText: t("common.delete"),
    cancelButtonText: t("common.cancel"),
    type: "warning",
  })
    .then(async () => {
      await stickerPsdSetApi.removeBatch(selectedIds.value);
      ElMessage.success(t("psdSet.batchDeleteSuccess"));
      selectedIds.value = [];
      selectedPsdSetRows.value = [];
      psdSetGridRef.value?.clearCheckboxRow();
      getList();
    })
    .catch(() => { });
}

async function handleBatchUpdateStatus(status: string) {
  if (!selectedIds.value.length) {
    return ElMessage.warning(t("psdSet.selectAtLeastOne"));
  }

  const statusLabel = statusOptions.find((s) => s.value === status)?.label || status;
  try {
    await ElMessageBox.confirm(
      t("psdSet.confirmBatchUpdateStatus", { count: selectedIds.value.length, status: statusLabel }),
      t("psdSet.batchUpdateStatusTitle"),
      {
        confirmButtonText: t("common.confirm"),
        cancelButtonText: t("common.cancel"),
        type: "info",
      },
    );
  } catch (e) {
    return;
  }

  batchUpdatingStatus.value = true;
  let successCount = 0;
  let failCount = 0;

  try {
    for (const id of selectedIds.value) {
      try {
        await stickerPsdSetApi.updateStatus(id, { status });
        applyManualPsdSetStatusLocally(id, status);
        successCount += 1;
      } catch (error) {
        failCount += 1;
        console.error(`批量更新状态失败（ID: ${id}）`, error);
      }
    }

    if (successCount) {
      ElMessage.success(t("psdSet.batchUpdateStatusSuccess", { count: successCount }));
    }
    if (failCount) {
      ElMessage.warning(t("psdSet.batchUpdateStatusPartialFail", { count: failCount }));
    }

    if (successCount > 0) {
      selectedIds.value = [];
      getList();
    }
  } finally {
    batchUpdatingStatus.value = false;
  }
}

async function handleBatchGenerateProduct() {
  if (!selectedIds.value.length) {
    return ElMessage.warning(t("psdSet.selectProductGenerationRecords"));
  }
  await openGenerateProductDialog(selectedIds.value);
}

async function ensurePublishConfigOptions() {
  if (publishConfigDialogLoading.value || publishConfigOptions.value.length > 0) {
    return;
  }

  publishConfigDialogLoading.value = true;
  try {
    const res = await getPublishConfigListApi();
    const list = Array.isArray(res)
      ? res
      : Array.isArray((res as any)?.list)
        ? (res as any).list
        : [];
    publishConfigOptions.value = list.filter((item: any) => item?.isActive !== false);
  } catch (error: any) {
    console.error("加载任务配置失败:", error);
    ElMessage.error(error?.message || t("psdSet.loadPublishConfigsFailed"));
  } finally {
    publishConfigDialogLoading.value = false;
  }
}

async function openPublishConfigDialog(ids: string[]) {
  const normalizedIds = Array.from(
    new Set((ids || []).map((item) => String(item).trim()).filter(Boolean)),
  );
  if (!normalizedIds.length) {
    return ElMessage.warning(t("psdSet.selectPublishTaskPsdSets"));
  }

  const selectedRowMap = new Map<string, any>();
  selectedPsdSetRows.value.forEach((item) => {
    const id = normalizePsdSetId(item?.id);
    if (id) {
      selectedRowMap.set(id, item);
    }
  });
  dataSource.value.forEach((item) => {
    const id = normalizePsdSetId(item?.id);
    if (id && !selectedRowMap.has(id)) {
      selectedRowMap.set(id, item);
    }
  });

  publishConfigTargetIds.value = normalizedIds;
  publishConfigTargetRows.value = normalizedIds.map((id) => selectedRowMap.get(id) || { id });
  publishConfigSelectedIds.value = [];
  publishConfigSearchText.value = "";
  publishConfigCurrentPage.value = 1;
  publishConfigDialogVisible.value = true;
  await ensurePublishConfigOptions();
}

function handleClosePublishConfigDialog() {
  publishConfigDialogVisible.value = false;
  publishConfigSelectedIds.value = [];
  publishConfigTargetIds.value = [];
  publishConfigTargetRows.value = [];
  publishConfigSearchText.value = "";
  publishConfigCurrentPage.value = 1;
}

function handlePublishConfigCheckboxChange({ checked, row }) {
  if (checked && !isPublishConfigSelectable(row)) {
    ElMessage.warning(getPublishConfigMatchInfo(row).reason || t("psdSet.taskConfigNotSelectable"));
    return;
  }
  if (checked) {
    if (!publishConfigSelectedIds.value.includes(row.id)) {
      publishConfigSelectedIds.value.push(row.id);
    }
  } else {
    publishConfigSelectedIds.value = publishConfigSelectedIds.value.filter((id) => id !== row.id);
  }
}

function handlePublishConfigCheckboxAllChange({ checked }) {
  const currentPageIds = publishConfigDataSource.value
    .filter((item: any) => isPublishConfigSelectable(item))
    .map((item: any) => item.id);
  if (checked) {
    currentPageIds.forEach((id: string) => {
      if (!publishConfigSelectedIds.value.includes(id)) {
        publishConfigSelectedIds.value.push(id);
      }
    });
  } else {
    publishConfigSelectedIds.value = publishConfigSelectedIds.value.filter(
      (id) => !currentPageIds.includes(id),
    );
  }
}

async function handleCreatePublishTask(row: any) {
  if (!row?.id) {
    return ElMessage.warning(t("psdSet.missingIdCannotCreatePublishTask"));
  }
  await openPublishConfigDialog([row.id]);
}

async function handleBatchCreatePublishTask() {
  if (!selectedIds.value.length) {
    return ElMessage.warning(t("psdSet.selectPublishTaskPsdSets"));
  }
  await openPublishConfigDialog(selectedIds.value);
}

async function handleSubmitCreatePublishTask() {
  if (!publishConfigTargetIds.value.length) {
    return ElMessage.warning(t("psdSet.noPsdSetSelected"));
  }
  if (!publishConfigSelectedIds.value.length) {
    return ElMessage.warning(t("psdSet.selectTaskConfig"));
  }

  const invalidSelectedConfigs = publishConfigSelectedIds.value
    .map((id) => publishConfigOptions.value.find((item: any) => item.id === id))
    .filter((item) => item && !isPublishConfigSelectable(item));
  if (invalidSelectedConfigs.length) {
    const firstInvalid = invalidSelectedConfigs[0];
    publishConfigSelectedIds.value = publishConfigSelectedIds.value.filter((id) => {
      const config = publishConfigOptions.value.find((item: any) => item.id === id);
      return config && isPublishConfigSelectable(config);
    });
    return ElMessage.warning(
      getPublishConfigMatchInfo(firstInvalid).reason || t("psdSet.selectedConfigTemplateMismatch"),
    );
  }

  publishConfigSubmitting.value = true;
  let successCount = 0;
  let failCount = 0;

  try {
    for (const psdSetId of publishConfigTargetIds.value) {
      for (const publishConfigId of publishConfigSelectedIds.value) {
        try {
          const config = publishConfigOptions.value.find(
            (item: any) => item.id === publishConfigId,
          );
          const resolvedTaskType = String(
            config?.taskType || derivePublishTaskTypeByPlatform(config?.platform),
          ).trim();
          const resolvedPlatform = String(
            config?.platform || resolveTaskTypePlatform(resolvedTaskType),
          ).trim();
          if (!resolvedTaskType || !resolvedPlatform) {
            throw new Error(t("psdSet.taskConfigMissingTypeOrPlatform"));
          }
          await createPublishTaskApi({
            psdSetId,
            taskType: resolvedTaskType,
            platform: resolvedPlatform,
            publishConfigId,
            description: `${t("psdSet.psdSet")} ${psdSetId} -> ${config.name || resolvedTaskType || publishConfigId}`,
            metadata: {
              publishConfigId,
              publishConfigName: config?.name || "",
            },
          });
          successCount += 1;
        } catch (error) {
          failCount += 1;
          console.error(
            `生成发布任务失败（套图ID: ${psdSetId}, 配置ID: ${publishConfigId}）`,
            error,
          );
        }
      }
    }

    if (successCount > 0) {
      ElMessage.success(t("psdSet.publishTasksCreated", { count: successCount }));
      handleClosePublishConfigDialog();
    }
    if (failCount > 0) {
      ElMessage.warning(t("psdSet.publishTasksCreatePartialFail", { count: failCount }));
    }
  } finally {
    publishConfigSubmitting.value = false;
  }
}

async function handleViewPublishTasks(row: any) {
  if (!row?.id) {
    return ElMessage.warning(t("psdSet.missingIdCannotViewPublishTasks"));
  }

  currentPublishTasksPsdSetId.value = String(row.id);
  publishTasksVisible.value = true;
  publishTasksLoading.value = true;
  publishTasks.value = [];

  try {
    const res = await stickerPsdSetApi.getPublishTasks(row.id);
    publishTasks.value = Array.isArray(res)
      ? res
      : Array.isArray((res as any)?.data)
        ? (res as any).data
        : [];
  } catch (error: any) {
    console.error("获取发布任务失败:", error);
    ElMessage.error(error?.message || t("psdSet.getPublishTasksFailed"));
    publishTasksVisible.value = false;
  } finally {
    publishTasksLoading.value = false;
  }
}

async function handleViewPublishUsageRecords(row: any) {
  if (!row?.id) {
    return ElMessage.warning(t("psdSet.missingPsdSetIdCannotViewUsage"));
  }
  publishUsageDialogVisible.value = true;
  publishUsageLoading.value = true;
  publishUsageRecords.value = [];
  try {
    const activeUsageConfigId = queryParams.publishUsageConfigId[0] || undefined;
    const res = await stickerPsdSetApi.getPublishUsageRecords({
      psdSetId: row.id,
      publishConfigId: activeUsageConfigId,
    });
    publishUsageRecords.value = Array.isArray(res)
      ? res
      : Array.isArray((res as any)?.data)
        ? (res as any).data
        : [];
  } catch (error: any) {
    console.error("获取套图使用记录失败:", error);
    ElMessage.error(error?.message || t("psdSet.getPublishUsageRecordsFailed"));
    publishUsageDialogVisible.value = false;
  } finally {
    publishUsageLoading.value = false;
  }
}

// 查看套图关联的产品
async function handleViewProducts(row: any) {
  if (!row?.id) {
    return ElMessage.warning(t("psdSet.missingPsdSetIdCannotViewProducts"));
  }
  currentProductsPsdSetId.value = String(row.id);
  productsDialogPage.value = 1;
  await loadProductsForPsdSet(row.id);
}

async function loadProductsForPsdSet(psdSetId: string) {
  productsDialogVisible.value = true;
  productsDialogLoading.value = true;
  productsDialogData.value = [];
  productsDialogTotal.value = 0;
  try {
    const res = await getProductList({
      psdSetId,
      currentPage: productsDialogPage.value,
      pageSize: productsDialogPageSize.value,
      sortBy: "createTime",
      sortDir: "DESC",
    });
    productsDialogData.value = Array.isArray(res?.list) ? res.list : [];
    productsDialogTotal.value = Number(res?.total || 0);
  } catch (error: any) {
    console.error("获取套图关联产品失败:", error);
    ElMessage.error(error?.message || t("psdSet.getProductsFailed"));
    productsDialogVisible.value = false;
  } finally {
    productsDialogLoading.value = false;
  }
}

async function handleProductsPageChange() {
  if (!currentProductsPsdSetId.value) return;
  await loadProductsForPsdSet(currentProductsPsdSetId.value);
}

function handleOpenProductDetail(row: any) {
  if (!row?.id) return;
  window.open(`${window.location.origin}/#/independent-site/product?id=${row.id}`, "_blank");
}

async function loadPublishUsageConfigOptions() {
  try {
    const res = await stickerPsdSetApi.getPublishUsageConfigOptions();
    publishUsageConfigOptions.value = Array.isArray(res)
      ? res
      : Array.isArray((res as any)?.data)
        ? (res as any).data
        : [];
  } catch (error) {
    console.error("获取查重配置选项失败:", error);
    publishUsageConfigOptions.value = [];
  }
}

async function reloadCurrentPublishTasks() {
  if (!currentPublishTasksPsdSetId.value) {
    return;
  }
  publishTasksLoading.value = true;
  try {
    const res = await stickerPsdSetApi.getPublishTasks(currentPublishTasksPsdSetId.value);
    publishTasks.value = Array.isArray(res)
      ? res
      : Array.isArray((res as any)?.data)
        ? (res as any).data
        : [];
  } finally {
    publishTasksLoading.value = false;
  }
}

async function handleRegeneratePublishTask(row: any) {
  const taskId = String(row?.id || "").trim();
  if (!taskId) {
    return ElMessage.warning(t("psdSet.missingTaskIdCannotRegenerate"));
  }

  await ElMessageBox.confirm(
    t("psdSet.confirmRegeneratePublishTask"),
    t("psdSet.regeneratePublishData"),
    {
      type: "warning",
      confirmButtonText: t("common.confirm"),
      cancelButtonText: t("common.cancel"),
    },
  );

  publishTasksLoading.value = true;
  try {
    await regeneratePublishTaskApi(taskId);
    ElMessage.success(t("psdSet.regenerateTriggered"));
    await reloadCurrentPublishTasks();
  } catch (error: any) {
    console.error("重新生成发布数据失败:", error);
    ElMessage.error(error?.message || t("psdSet.regenerateFailed"));
    publishTasksLoading.value = false;
  }
}

async function ensureGenerateProductDialogOptions() {
  const res = await productGenerationTemplateApi.getList({
    currentPage: 1,
    pageSize: 1000,
    isActive: true,
  });
  generateProductTemplateOptions.value = Array.isArray(res?.list) ? res.list : [];
}

async function openGenerateProductDialog(ids: string[]) {
  const normalizedIds = Array.from(
    new Set((ids || []).map((item) => String(item).trim()).filter(Boolean)),
  );
  if (!normalizedIds.length) {
    return ElMessage.warning(t("psdSet.selectProductGenerationPsdSets"));
  }

  const selectedRowMap = new Map<string, any>();
  selectedPsdSetRows.value.forEach((item) => {
    const id = normalizePsdSetId(item?.id);
    if (id) selectedRowMap.set(id, item);
  });
  dataSource.value.forEach((item) => {
    const id = normalizePsdSetId(item?.id);
    if (id && !selectedRowMap.has(id)) selectedRowMap.set(id, item);
  });

  generateProductTargetIds.value = normalizedIds;
  generateProductTargetRows.value = normalizedIds.map(
    (id) => selectedRowMap.get(id) || { id },
  );
  generateProductSelectedTemplateIds.value = [];
  generateProductTemplateSearchText.value = "";
  generateProductTemplateOptions.value = [];
  generateProductDialogKey.value += 1;
  generateProductDialogVisible.value = true;
  generateProductDialogLoading.value = true;

  try {
    await ensureGenerateProductDialogOptions();
  } catch (error: any) {
    console.error("加载生成产品配置失败:", error);
    ElMessage.error(error?.message || t("psdSet.loadConfigFailed"));
  } finally {
    generateProductDialogLoading.value = false;
  }
}

function handleCloseGenerateProductDialog() {
  generateProductDialogVisible.value = false;
  generateProductTargetIds.value = [];
  generateProductTargetRows.value = [];
  generateProductSelectedTemplateIds.value = [];
  generateProductTemplateSearchText.value = "";
  generateProductTemplateOptions.value = [];
  generateProductDialogLoading.value = false;
  generateProductSubmitting.value = isGenerateProductBatchRunning.value;
  generateProductDialogKey.value += 1;
  generatingProductId.value = "";
  batchGeneratingProducts.value = isGenerateProductBatchRunning.value;
}

function handleGenerateProductTemplateCheckboxChange(event: any) {
  if (event?.checked && event?.row && !isGenerateProductTemplateSelectable(event.row)) {
    ElMessage.warning(
      getGenerateProductTemplateMatchInfo(event.row).reason || t("psdSet.templateMismatchReason"),
    );
  }
  generateProductSelectedTemplateIds.value = (event?.records || [])
    .filter((item: any) => isGenerateProductTemplateSelectable(item))
    .map((item: any) => String(item?.id || "").trim())
    .filter(Boolean);
}

function stopGenerateProductBatchProgressPolling() {
  if (generateProductBatchProgressTimer) {
    clearTimeout(generateProductBatchProgressTimer);
    generateProductBatchProgressTimer = null;
  }
}

function getGenerateProductBatchPollDelay() {
  if (typeof document !== "undefined" && document.hidden) {
    return 10000;
  }
  if (generateProductBatchPollCount < 4) {
    return 2500;
  }
  if (generateProductBatchPollCount < 12) {
    return 5000;
  }
  return 8000;
}

function persistGenerateProductBatchTask(taskId: string) {
  const normalizedTaskId = String(taskId || "").trim();
  if (!normalizedTaskId) return;
  localStorage.setItem(
    GENERATE_PRODUCT_BATCH_PROGRESS_STORAGE_KEY,
    JSON.stringify({
      taskId: normalizedTaskId,
      savedAt: Date.now(),
    }),
  );
}

function clearPersistedGenerateProductBatchTask() {
  localStorage.removeItem(GENERATE_PRODUCT_BATCH_PROGRESS_STORAGE_KEY);
}

function syncGenerateProductBatchProgressToast(progress: any, options: { force?: boolean } = {}) {
  if (!progress?.taskId) return;
  const isDone = progress.status === "completed" || progress.status === "failed";
  if (!options.force && !isDone) return;
  const hasFailure = Number(progress.failed || 0) > 0;
  const notificationId = `sticker-psd-set-generate-product:${progress.taskId}`;
  globalNotificationStore.removeBySource("sticker-psd-set-generate-product", notificationId);
  globalNotificationStore.upsertNotification({
    id: notificationId,
    title: t("psdSet.batchGenerateProductNotificationTitle"),
    message: progress.message || t("psdSet.processing"),
    level: isDone ? (hasFailure ? "warning" : "success") : "info",
    category: "task",
    source: "sticker-psd-set-generate-product",
    sticky: !isDone,
    durationMs: isDone ? 6000 : null,
    progress: Number(progress.progress || 0),
    status: isDone ? (hasFailure ? "warning" : "success") : "running",
    metadata: {
      taskId: progress.taskId,
      total: Number(progress.total || 0),
      completed: Number(progress.completed || 0),
      failed: Number(progress.failed || 0),
    },
    createdAt: progress.createdAt || new Date().toISOString(),
    updatedAt: progress.updateTime || new Date().toISOString(),
  });
}

function restoreGenerateProductBatchProgress() {
  try {
    const raw = localStorage.getItem(GENERATE_PRODUCT_BATCH_PROGRESS_STORAGE_KEY);
    if (!raw) {
      globalNotificationStore.removeBySource("sticker-psd-set-generate-product");
      return;
    }
    const parsed = JSON.parse(raw);
    const taskId = String(parsed?.taskId || "").trim();
    if (!taskId) {
      clearPersistedGenerateProductBatchTask();
      globalNotificationStore.removeBySource("sticker-psd-set-generate-product");
      return;
    }
    generateProductBatchTaskId.value = taskId;
    generateProductSubmitting.value = true;
    batchGeneratingProducts.value = true;
    generateProductBatchPollCount = 0;
    void pollGenerateProductBatchProgress(taskId);
  } catch {
    clearPersistedGenerateProductBatchTask();
  }
}

async function pollGenerateProductBatchProgress(taskId: string) {
  stopGenerateProductBatchProgressPolling();
  if (!taskId) return;

  try {
    const progress: any = await stickerPsdSetApi.getGenerateProductBatchProgress(taskId);
    generateProductBatchProgress.value = progress;
    generateProductBatchTaskId.value = taskId;
    generateProductBatchPollCount += 1;
    if (progress?.status === "completed" || progress?.status === "failed") {
      generateProductSubmitting.value = false;
      batchGeneratingProducts.value = false;
      clearPersistedGenerateProductBatchTask();
      syncGenerateProductBatchProgressToast(progress, { force: true });
      if (progress?.completed > 0) {
        ElMessage.success(progress.message || t("psdSet.batchGenerateProductSuccess", { count: progress.completed }));
        getList();
      } else {
        ElMessage.warning(progress?.message || t("psdSet.batchGenerateProductFailed"));
      }
      return;
    }
  } catch (error: any) {
    generateProductSubmitting.value = false;
    batchGeneratingProducts.value = false;
    clearPersistedGenerateProductBatchTask();
    ElMessage.error(error?.message || t("psdSet.queryGenerateProgressFailed"));
    return;
  }

  generateProductBatchProgressTimer = setTimeout(() => {
    void pollGenerateProductBatchProgress(taskId);
  }, getGenerateProductBatchPollDelay());
}

async function handleSubmitGenerateProduct() {
  if (!generateProductTargetIds.value.length) {
    return ElMessage.warning(t("psdSet.noPsdSetSelected"));
  }
  if (!generateProductSelectedTemplateIds.value.length) {
    return ElMessage.warning(t("psdSet.selectProductGenerationTemplate"));
  }

  const invalidSelectedTemplates = generateProductSelectedTemplateIds.value
    .map((id) => generateProductTemplateOptions.value.find((item: any) => String(item.id) === id))
    .filter((item) => item && !isGenerateProductTemplateSelectable(item));
  if (invalidSelectedTemplates.length) {
    generateProductSelectedTemplateIds.value = generateProductSelectedTemplateIds.value.filter(
      (id) => {
        const template = generateProductTemplateOptions.value.find(
          (item: any) => String(item.id) === id,
        );
        return template && isGenerateProductTemplateSelectable(template);
      },
    );
    return ElMessage.warning(
      getGenerateProductTemplateMatchInfo(invalidSelectedTemplates[0]).reason ||
        t("psdSet.templateMismatchReason"),
    );
  }

  const expectedCount = generateProductExpectedCount.value;
  await ElMessageBox.confirm(
    t("psdSet.confirmGenerateProductBatch", {
      psdSetCount: generateProductTargetIds.value.length,
      templateCount: generateProductSelectedTemplateIds.value.length,
      count: expectedCount,
    }),
    t("psdSet.confirmGenerateProductTitle"),
    {
      confirmButtonText: t("psdSet.generateProductConfirmButton"),
      cancelButtonText: t("common.cancel"),
      type: "warning",
    },
  );

  generateProductSubmitting.value = true;
  generateProductBatchProgress.value = null;
  generateProductBatchPollCount = 0;

  try {
    const response: any = await stickerPsdSetApi.generateProductBatch({
      ids: generateProductTargetIds.value,
      productGenerationTemplateIds: generateProductSelectedTemplateIds.value,
    });
    generateProductBatchTaskId.value = response?.taskId || response?.id || "";
    if (!generateProductBatchTaskId.value) {
      throw new Error(t("psdSet.backendMissingBatchTaskId"));
    }
    persistGenerateProductBatchTask(generateProductBatchTaskId.value);
    generateProductBatchProgress.value = {
      taskId: generateProductBatchTaskId.value,
      status: "queued",
      total: expectedCount,
      completed: 0,
      failed: 0,
      progress: 0,
      message: response?.message || t("psdSet.batchGenerateProductSubmitted"),
    };
    syncGenerateProductBatchProgressToast(generateProductBatchProgress.value, { force: true });
    await pollGenerateProductBatchProgress(generateProductBatchTaskId.value);
  } catch (error: any) {
    generateProductSubmitting.value = false;
    batchGeneratingProducts.value = false;
    ElMessage.error(
      isSeoDescriptionTooLongError(error)
        ? t("psdSet.seoDescriptionTooLong")
        : error?.message || t("psdSet.submitBatchGenerateProductFailed"),
    );
  }
}

async function handleStartProduction(row: any) {
  if (!row?.id) {
    return ElMessage.warning(t("psdSet.missingIdCannotStartProduction"));
  }

  if (!isClientConnected.value) {
    return ElMessage.warning(t("psdSet.clientNotConnectedStart"));
  }

  if (websocketClient.state.status !== "connected") {
    return ElMessage.warning(t("psdSet.websocketNotConnected"));
  }

  await openProductionDispatchDialog(row);
}

function normalizePsdSetErrorPart(value: unknown): string {
  if (value === undefined || value === null || value === "") {
    return "";
  }
  if (Array.isArray(value)) {
    return value.map(normalizePsdSetErrorPart).filter(Boolean).join("; ");
  }
  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

function getPsdSetRequestErrorDetail(error: any) {
  const status = error?.response?.status;
  const data = error?.response?.data;
  const url = error?.config?.url || "";
  const method = String(error?.config?.method || "").toUpperCase();
  const responseMessage =
    [
      data?.message,
      data?.msg,
      data?.error,
      data?.details,
      data?.detail,
      data?.errors,
    ]
      .map(normalizePsdSetErrorPart)
      .filter(Boolean)
      .join("; ") || error?.message || "";

  return {
    status,
    data,
    url,
    method,
    message: responseMessage || t("psdSet.unknownError"),
  };
}

function showPsdSetProductionError(error: any, context: Record<string, any>) {
  const detail = getPsdSetRequestErrorDetail(error);
  const statusText = detail.status ? `HTTP ${detail.status}` : t("psdSet.requestFailed");
  const message =
    detail.status === 422
      ? t("psdSet.startProductionValidationFailed", { detail: detail.message })
      : t("psdSet.startProductionFailedWithDetail", { detail: detail.message });

  console.error("[PSD 套图] 开始制作失败详情", {
    ...context,
    request: {
      method: detail.method,
      url: detail.url,
    },
    responseStatus: detail.status,
    responseData: detail.data,
    error,
  });

  ElMessageBox.alert(
    [
      message,
      "",
      t("psdSet.productionErrorPsdSetId", { value: context.psdSetId || "-" }),
      t("psdSet.productionErrorClientId", { value: context.clientId || "-" }),
      t("psdSet.productionErrorEndpoint", {
        method: detail.method || "POST",
        url: detail.url || "/sticker-psd-set/:id/dispatch",
      }),
      t("psdSet.productionErrorStatus", { status: statusText }),
      "",
      t("psdSet.rawResponse"),
      normalizePsdSetErrorPart(detail.data) || detail.message,
    ].join("\n"),
    t("psdSet.startProductionFailed"),
    {
      type: "error",
      confirmButtonText: t("psdSet.gotIt"),
      customClass: "psd-set-production-error-dialog",
    },
  );
}

async function handleConfirmStartProduction() {
  const row = productionDispatchRow.value;
  const isAutoMode = productionDispatchMode.value === "auto";
  if (!isAutoMode && !row?.id) {
    return ElMessage.warning(t("psdSet.missingIdCannotStartProduction"));
  }

  if (!selectedDispatchClientId.value) {
    return ElMessage.warning(t("psdSet.selectClientNode"));
  }

  if (!selectedDispatchClient.value) {
    return ElMessage.warning(t("psdSet.selectedClientNotExists"));
  }

  const unavailableReason = getDispatchClientUnavailableReason(selectedDispatchClient.value);
  if (unavailableReason) {
    return ElMessage.warning(unavailableReason);
  }

  try {
    await ElMessageBox.confirm(
      isAutoMode
        ? t("psdSet.confirmEnableAutoProduction", {
            client: getClientDisplayName(selectedDispatchClient.value),
            filters: autoDispatchFilterSummary.value,
          })
        : t("psdSet.confirmStartProductionByClient", {
            client: getClientDisplayName(selectedDispatchClient.value),
          }),
      isAutoMode ? t("psdSet.enableAutoProductionConfirmTitle") : t("psdSet.startProductionConfirmTitle"),
      {
        confirmButtonText: t("common.confirm"),
        cancelButtonText: t("common.cancel"),
        type: "info",
      },
    );
  } catch (e) {
    return;
  }

  try {
    startingProductionId.value = isAutoMode ? "" : row.id;

    if (isAutoMode) {
      const previousEnabled = userAutoSchedulingEnabled.value;
      const previousClientId = userAutoDispatchClientId.value;
      const previousFilters = userAutoDispatchFilters.value;
      const nextFilters = buildAutoDispatchFiltersPayload();
      userAutoSchedulingLoading.value = true;
      setUserAutoSchedulingEnabled(true);
      setUserAutoDispatchTarget({
        clientId: selectedDispatchClientId.value,
      });
      setUserAutoDispatchFilters(nextFilters);
      try {
        const result = await ClientControlService.setPsAutomationUserAutoScheduling(
          true,
          false,
          {
            clientId: selectedDispatchClientId.value,
            filters: nextFilters,
          },
        );
        if (!result.success) {
          setUserAutoSchedulingEnabled(previousEnabled);
          setUserAutoDispatchTarget({
            clientId: previousClientId,
          });
          setUserAutoDispatchFilters(previousFilters);
          return;
        }
        productionDispatchDialogVisible.value = false;
        void refreshPsdSetRuntimeSummary();
        schedulePsdSetRuntimeRefresh(120);
        void loadPsdSetSchedulerRuntime();
      } finally {
        startingProductionId.value = "";
        userAutoSchedulingLoading.value = false;
      }
      return;
    }

    const dispatchPayload = {
      clientId: selectedDispatchClientId.value,
    };
    console.info("[PSD 套图] 开始制作请求", {
      psdSetId: row.id,
      payload: dispatchPayload,
      selectedClient: selectedDispatchClient.value,
      row,
    });
    const response = await stickerPsdSetApi.dispatch(row.id, dispatchPayload);
    startingProductionId.value = "";
    productionDispatchDialogVisible.value = false;

    if (response?.success) {
      applyPsdSetStatusLocally(
        row.id,
        "processing",
        response.message || t("psdSet.taskAssignedWaitingClient"),
      );
      schedulePsdSetMenuRuntimeSync();
      ElMessage.success(response.message || t("psdSet.productionTaskScheduled"));
      await Promise.all([getList(), refreshClientNodes()]);
    } else {
      ElMessage.warning(response?.message || t("psdSet.startProductionFailed"));
    }
  } catch (error: any) {
    showPsdSetProductionError(error, {
      psdSetId: row?.id,
      clientId: selectedDispatchClientId.value,
      selectedClient: selectedDispatchClient.value,
      row,
    });
    startingProductionId.value = "";
  }
}

async function handleResetAllPsAutomationRuntime() {
  try {
    await ElMessageBox.confirm(
      t("psdSet.confirmResetPsAutomationRuntime"),
      t("psdSet.resetStatusConfirmTitle"),
      {
        confirmButtonText: t("psdSet.resetButton"),
        cancelButtonText: t("common.cancel"),
        type: "warning",
      },
    );
  } catch {
    return;
  }

  resettingPsRuntime.value = true;
  try {
    const response = await resetAllPsAutomationRuntime();
    ElMessage.success(response?.message || t("psdSet.statusResetSuccess"));
    schedulePsdSetMenuRuntimeSync();
    resettingPsRuntime.value = false;
    void Promise.allSettled([
      refreshClientNodes(),
      refreshPsdSetRuntimeSummary(),
      loadPsdSetSchedulerRuntime(),
    ]).catch((refreshError) => {
      console.warn("重置状态后的运行态刷新失败:", refreshError);
    });
  } catch (error: any) {
    ElMessage.error(error?.message || t("psdSet.resetStatusFailed"));
  } finally {
    resettingPsRuntime.value = false;
  }
}

// 监听客户端推送的制作状态（实时更新表格行）
const productionStatusHandler = (data: {
  psdSetId?: string;
  status: string;
  message?: string;
  name?: string | null;
}) => {
  try {
    const normalizedPsdSetId = normalizePsdSetId(data?.psdSetId);
    if (!normalizedPsdSetId) return;

    const incomingStatus = normalizePsdSetRuntimeStatus(data.status);
    if (!["pending", "processing", "completed", "failed"].includes(incomingStatus)) {
      return;
    }
    applyPsdSetStatusLocally(
      normalizedPsdSetId,
      incomingStatus,
      incomingStatus === "processing" ? t("psdSet.making") : data.message,
    );

    if (incomingStatus === "processing" && !findPsdSetRowById(normalizedPsdSetId)) {
      dataSource.value.unshift({
        id: normalizedPsdSetId,
        name: String(data?.name || normalizedPsdSetId).trim(),
        status: "processing",
        statusMessage: t("psdSet.making"),
        updateTime: new Date().toISOString(),
      });
    }

    schedulePsdSetRuntimeRefresh(
      data.status === "completed" || data.status === "failed" ? 260 : 900,
    );
  } catch (e) {
    console.error("处理 production-status 事件失败", e);
  }
};

const psAutomationStatusHandler = (data: PsAutomationStatusEvent) => {
  if (data?.running || data?.lastError) {
    void refreshClientNodes();
    void refreshPsdSetRuntimeSummary();
    void loadPsdSetSchedulerRuntime();
  }
};

watch(
  () =>
    activePsdSets.value
      .map((item: any) =>
        [
          normalizePsdSetId(item?.id),
          String(item?.status || "").trim(),
          String(item?.schedulerStatus || "").trim(),
          String(item?.statusMessage || "").trim(),
          String(item?.currentStep || "").trim(),
          typeof item?.progress === "number" ? String(item.progress) : "",
          String(item?.updateTime || "").trim(),
        ].join(":"),
      )
      .join("|"),
  (fingerprint) => {
    if (!fingerprint) {
      stopPsdSetActiveRuntimeRefresh();
      if (psdSetRuntimeReloadTimer) {
        clearTimeout(psdSetRuntimeReloadTimer);
        psdSetRuntimeReloadTimer = null;
      }
      void loadPsdSetSchedulerRuntime();
      return;
    }

    void loadPsdSetSchedulerRuntime();
  },
);

onMounted(() => {
  websocketClient.events.on("production-status", productionStatusHandler);
  websocketClient.events.on("psAutomationStatus", psAutomationStatusHandler);
  void Promise.all([
    refreshUserAutoSchedulingSetting(),
    loadPsdSetSchedulerRuntime(),
    loadPublishUsageConfigOptions(),
  ]);
  restoreGenerateProductBatchProgress();
  psdSetSchedulerRuntimeTimer = setInterval(() => {
    void loadPsdSetSchedulerRuntime();
  }, 30000);
});

onUnmounted(() => {
  stopGenerateProductBatchProgressPolling();
  websocketClient.events.off("production-status", productionStatusHandler);
  websocketClient.events.off("psAutomationStatus", psAutomationStatusHandler);
  stopPsdSetActiveRuntimeRefresh();
  if (psdSetMenuRuntimeSyncTimer) {
    clearTimeout(psdSetMenuRuntimeSyncTimer);
    psdSetMenuRuntimeSyncTimer = null;
  }
  if (psdSetRuntimeReloadTimer) {
    clearTimeout(psdSetRuntimeReloadTimer);
    psdSetRuntimeReloadTimer = null;
  }
  if (psdSetSchedulerRuntimeTimer) {
    clearInterval(psdSetSchedulerRuntimeTimer);
    psdSetSchedulerRuntimeTimer = null;
  }
});

getList();
</script>

<style scoped>


@media (width <= 1100px) {
  .psd-set-detail-dialog :deep(.el-dialog__body) {
    height: calc(100vh - 78px);
  }

  .psd-set-detail-layout,
  .psd-set-detail-top,
  .psd-set-detail-middle,
  .psd-set-detail-bottom {
    grid-template-columns: 1fr;
    height: auto;
  }

  .psd-set-detail-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .psd-set-detail-header__tags {
    justify-content: flex-start;
  }

  .psd-set-detail-meta-list--inline {
    grid-template-columns: 1fr;
  }

  .psd-set-detail-summary,
  .psd-set-detail-text-grid {
    grid-template-columns: 1fr;
  }
}

@media (width <= 768px) {
  .psd-set-page__auto-dispatch-bar {
    width: 100%;
    flex-wrap: wrap;
    height: auto;
    padding: 6px;
  }

  .production-dispatch-dialog__table :deep(.el-table) {
    font-size: 12px;
  }

  .publish-task-list-dialog :deep(.el-dialog__body) {
    height: auto;
    min-height: calc(100vh - 78px);
  }

  .publish-task-list-body {
    height: auto;
    min-height: calc(100vh - 200px);
  }

  .publish-config-search {
    width: 100%;
  }

  .publish-config-toolbar__actions {
    width: 100%;
    justify-content: flex-start;
  }
}

.psd-set-row-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  white-space: nowrap;
}

.psd-set-action-btn {
  font-size: 12px;
  padding: 0 2px;
  font-weight: 500;
}

.psd-set-page {
  padding-top: 8px;
}

.psd-set-page__layout {
  gap: 10px;
  padding: 0;
}

.psd-set-page__layout :deep(.list-page-layout__main) {
  gap: 10px;
}

.psd-set-page__filter {
  gap: 10px;
}

.psd-set-page__actions {
  max-width: 100%;
  min-width: 0;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.psd-set-page__auto-dispatch-bar {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 28px;
  padding: 2px 8px;
  background: var(--el-fill-color-light);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 4px;
  font-size: 12px;
  line-height: 1;
  color: var(--el-text-color-regular);
  flex-wrap: wrap;
}

.psd-set-page__auto-dispatch-indicator {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-weight: 500;
  white-space: nowrap;
}

.psd-set-page__auto-dispatch-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentcolor;
  flex-shrink: 0;
}

.psd-set-page__auto-dispatch-indicator.is-success {
  color: #67c23a;
}

.psd-set-page__auto-dispatch-indicator.is-success .psd-set-page__auto-dispatch-dot {
  box-shadow: 0 0 0 0 rgb(103 194 58 / 24%);
  animation: status-breath-success 1.8s infinite ease-in-out;
}

.psd-set-page__auto-dispatch-indicator.is-warning {
  color: #f97316;
}

.psd-set-page__auto-dispatch-indicator.is-warning .psd-set-page__auto-dispatch-dot {
  box-shadow: 0 0 0 0 rgb(249 115 22 / 22%);
  animation: status-breath-warning 1.8s infinite ease-in-out;
}

.psd-set-page__auto-dispatch-indicator.is-danger {
  color: #f56c6c;
}

.psd-set-page__auto-dispatch-indicator.is-info {
  color: #909399;
}

.psd-set-page__auto-dispatch-indicator-text {
  font-size: 12px;
  white-space: nowrap;
}

.psd-set-page__auto-dispatch-content {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  white-space: nowrap;
  padding: 0 6px;
  border-left: 1px solid var(--el-border-color-lighter);
  border-right: 1px solid var(--el-border-color-lighter);
}

.psd-set-page__auto-dispatch-target {
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 11px;
  color: var(--el-text-color-primary);
}

.psd-set-page__auto-dispatch-interval {
  white-space: nowrap;
}

.psd-set-page__auto-dispatch-pending {
  color: #f97316;
  font-weight: 500;
  white-space: nowrap;
}

.psd-set-page__auto-dispatch-task-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.psd-set-page__chip-client {
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.psd-set-page__chip-task-id {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 11px;
}

.psd-set-page__chip-step {
  padding-left: 4px;
  border-left: 1px solid var(--el-border-color-lighter);
  color: var(--el-text-color-placeholder);
}

.psd-set-page__auto-dispatch-actions {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.psd-set-page__auto-dispatch-actions .el-button {
  margin-left: 0;
}

.psd-set-page__table-body {
  padding: 0;
}

.psd-set-page :deep(.list-page-filter--flat) {
  gap: 10px;
  padding-bottom: 10px;
}

.psd-set-page :deep(.list-page-table-panel__pagination--flat) {
  padding-top: 10px;
}

.psd-set-page :deep(.vxe-table--body tbody tr.is-publish-usage-occupied .vxe-body--column) {
  background: rgb(245 158 11 / 10%) !important;
}

.psd-set-page :deep(.vxe-table--body tbody tr.is-publish-usage-available .vxe-body--column) {
  background: rgb(34 197 94 / 8%) !important;
}

.psd-set-page :deep(.vxe-table--body tbody tr.is-publish-usage-occupied:hover .vxe-body--column) {
  background: rgb(245 158 11 / 16%) !important;
}

.psd-set-page :deep(.vxe-table--body tbody tr.is-publish-usage-available:hover .vxe-body--column) {
  background: rgb(34 197 94 / 13%) !important;
}

.psd-set-page :deep(.vxe-table--body tbody tr.has-publish-usage-badge .vxe-body--column:first-child) {
  position: relative;
  cursor: pointer;
}

.psd-set-page :deep(.vxe-table--body tbody tr.has-publish-usage-badge .vxe-body--column:first-child::before) {
  position: absolute;
  top: 2px;
  left: 2px;
  z-index: 4;
  height: 16px;
  padding: 0 5px;
  font-size: 10px;
  font-weight: 600;
  line-height: 16px;
  letter-spacing: 0;
  color: #fff;
  pointer-events: none;
  border-radius: 999px;
  box-shadow: 0 2px 8px rgb(15 23 42 / 18%);
}

.psd-set-page :deep(.vxe-table--body tbody tr.is-publish-usage-occupied .vxe-body--column:first-child::before) {
  background: rgb(217 119 6 / 94%);
  content: "已用";
}

.psd-set-page :deep(.vxe-table--body tbody tr.is-publish-usage-available .vxe-body--column:first-child::before) {
  background: rgb(22 163 74 / 94%);
  content: "未用";
}

.status-message {
  margin-top: 4px;
  font-size: 12px;
  color: #999;
}

.status-cell {
  display: flex;
  width: 100%;
  text-align: left;
  align-items: center;
  justify-content: flex-start;
}

.pagination-container {
  display: flex;
  justify-content: flex-end;
  padding: 16px 0;
}

.pagination-container :deep(.el-pagination) {
  font-size: 14px;
}

/* 详情列样式 */
.details-summary {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}

.related-info-container {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}

.detail-section-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: 100%;
}

.detail-dialog-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.psd-set-detail-dialog :deep(.el-dialog__body) {
  height: calc(100vh - 78px);
  padding: 0 18px 18px;
  overflow: hidden;
  background: var(--el-bg-color);
  box-sizing: border-box;
}

.psd-set-detail-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  width: 100%;
  padding-right: 28px;
}

.psd-set-detail-heading {
  min-width: 0;
}

.psd-set-detail-title {
  overflow: hidden;
  font-size: 18px;
  font-weight: 600;
  line-height: 1.35;
  color: var(--el-text-color-primary);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.psd-set-detail-subtitle {
  margin-top: 4px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.psd-set-detail-header__tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.psd-set-detail-layout {
  display: flex;
  height: 100%;
  padding: 2px 4px 2px 0;
  overflow-y: auto;
  flex-direction: column;
  gap: 10px;
}

.psd-set-detail-top {
  display: grid;
  grid-template-columns: 1fr;
  gap: 10px;
  align-items: start;
}

.psd-set-detail-middle {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  align-items: start;
}

.psd-set-detail-bottom {
  display: block;
}

.psd-set-detail-panel {
  padding: 12px;
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-light);
  border-radius: 6px;
}

.psd-set-detail-panel--hero {
  order: 2;
  padding: 12px;
}

.psd-set-detail-panel--compact,
.psd-set-detail-panel--muted {
  order: 1;
  padding: 12px;
}

.psd-set-detail-panel--balanced {
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.psd-set-detail-summary {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 6px;
}

.psd-set-detail-summary__item,
.psd-set-detail-text-card {
  display: flex;
  min-width: 0;
  padding: 7px 9px;
  background: var(--el-fill-color-extra-light);
  border-radius: 6px;
  flex-direction: column;
  gap: 4px;
}

.psd-set-detail-text-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 6px;
  margin-top: 8px;
}

.psd-set-detail-image-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 8px;
}

.psd-set-detail-image-card {
  position: relative;
  min-width: 0;
  padding: 5px;
  background: var(--el-fill-color-extra-light);
  border: 1px solid var(--el-border-color-light);
  border-radius: 6px;
}

.psd-set-detail-image {
  width: 100%;
  height: 160px;
  background: var(--el-bg-color-page);
  border-radius: 6px;
}

.psd-set-detail-image-index {
  position: absolute;
  top: 10px;
  right: 10px;
  height: 22px;
  min-width: 22px;
  padding: 0 6px;
  font-size: 12px;
  line-height: 22px;
  color: var(--el-text-color-secondary);
  text-align: center;
  background: rgb(255 255 255 / 92%);
  border-radius: 999px;
  box-shadow: 0 1px 4px rgb(15 23 42 / 8%);
}

.detail-entity-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
  min-height: 0;
}

.detail-entity-card {
  display: flex;
  gap: 12px;
  padding: 10px 12px;
  background: var(--el-fill-color-extra-light);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 6px;
  align-items: flex-start;
  transition: all 0.2s ease;
}

.detail-entity-card:hover {
  border-color: var(--el-color-primary-light-5);
  box-shadow: 0 2px 8px rgb(0 0 0 / 4%);
}

.detail-entity-card--template {
  background: var(--el-fill-color-extra-light);
}

.detail-entity-card__thumb {
  width: 92px;
  height: 92px;
  flex: 0 0 92px;
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-light);
  border-radius: 6px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.detail-entity-card__image {
  width: 100%;
  height: 100%;
  border-radius: 4px;
}

.detail-entity-card__empty-thumb {
  font-size: 12px;
  color: var(--el-text-color-placeholder);
}

.detail-entity-card__main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.detail-entity-card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-width: 0;
}

.detail-entity-card__name {
  font-size: 13px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.detail-entity-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 4px 12px;
}

.detail-entity-grid__item {
  display: flex;
  align-items: baseline;
  gap: 6px;
  font-size: 12px;
  min-width: 0;
}

.detail-entity-grid__item--full {
  grid-column: 1 / -1;
}

.detail-field-label {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  flex-shrink: 0;
  font-weight: 500;
}

.detail-field-value {
  font-size: 12px;
  color: var(--el-text-color-regular);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.detail-field-value--code {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 11px;
  color: var(--el-text-color-primary);
  font-weight: 500;
}

.detail-field-value--path {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 11px;
  color: var(--el-text-color-secondary);
  max-width: 100%;
}

.detail-field-value.cursor-pointer {
  cursor: pointer;
}

.detail-field-value.cursor-pointer:hover {
  color: var(--el-color-primary);
}

.detail-field-value.cursor-pointer .copy-icon {
  font-size: 12px;
  margin-left: 4px;
  vertical-align: -1px;
  opacity: 0.5;
  transition: opacity 0.2s;
}

.detail-field-value.cursor-pointer:hover .copy-icon {
  opacity: 1;
}

.detail-header__left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.detail-header__right {
  display: flex;
  align-items: center;
  gap: 6px;
}

@media (width <= 1024px) {
  .psd-set-detail-middle {
    grid-template-columns: 1fr;
  }
}

.detail-header {
  display: flex;
  margin-bottom: 8px;
  font-size: 13px;
  line-height: 1.4;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.detail-label {
  font-size: 14px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  white-space: nowrap;
}

.detail-count {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.detail-sub-grid {
  width: 100%;
  padding: 0;
  margin: 0;
  background: none;
}

.detail-sub-grid :deep(.vxe-table) {
  font-size: 12px;
}

.detail-sub-grid :deep(.vxe-table--header) {
  background-color: var(--el-table-header-bg-color);
}

.detail-sub-grid :deep(.vxe-table--body) {
  background-color: transparent;
}

.detail-sub-grid :deep(.vxe-cell) {
  padding: 4px 8px;
}

.detail-sub-grid :deep(.vxe-table--header-wrapper) {
  .vxe-cell {
    font-size: 12px;
    font-weight: 500;
  }
}

.detail-thumb-image {
  width: 78px;
  height: 78px;
  cursor: pointer;
  background-color: var(--el-bg-color-page);
  border: 1px solid var(--el-border-color-light);
  border-radius: 6px;
  transition: all 0.2s ease;
  object-fit: contain;
  flex: 0 0 auto;
}

.detail-thumb-image:hover {
  border-color: var(--el-color-primary);
}

.detail-thumb-image--template {
  width: 96px;
  height: 96px;
}

.detail-template-card--unified {
  padding: 8px;
  background: var(--el-bg-color);
  border-color: var(--el-border-color-light);
  border-radius: 6px;
  align-items: flex-start;
}

.psd-set-detail-runtime-strip {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  margin-bottom: 8px;
}

.psd-set-detail-runtime-strip>div {
  display: flex;
  min-width: 0;
  padding: 8px;
  background: var(--el-fill-color-extra-light);
  border-radius: 6px;
  flex-direction: column;
  gap: 4px;
}

.psd-set-detail-runtime-note {
  padding: 8px 10px;
  margin-bottom: 8px;
  font-size: 12px;
  line-height: 1.5;
  color: var(--el-text-color-regular);
  word-break: break-word;
  background: var(--el-color-warning-light-9);
  border-radius: 6px;
}

.psd-set-detail-json-stack {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.psd-set-detail-json-block {
  min-width: 0;
}

.psd-set-detail-json-title {
  display: flex;
  margin-bottom: 6px;
  font-size: 12px;
  font-weight: 600;
  color: var(--el-text-color-regular);
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.detail-template-card {
  display: flex;
  padding: 10px;
  background: var(--el-fill-color-lighter);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  align-items: center;
  gap: 16px;
}

.detail-template-meta {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.detail-template-paths {
  font-size: 12px;
  line-height: 1.5;
  color: var(--el-text-color-regular);
}

.template-file-tags {
  display: inline-flex;
  min-width: 120px;
  padding: 4px 0;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
  justify-content: flex-start;
}

/* 素材关联标签样式 */
.material-association-tag {
  min-width: 70px;
  font-weight: 500;
  text-align: center;
}

.material-association-tag .tag-text {
  display: inline-block;
}

/* 配置信息相关样式 */
.config-editor-container {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.config-textarea :deep(.el-textarea__inner) {
  font-family: "Courier New", Consolas, monospace;
  font-size: 13px;
  line-height: 1.5;
}

.config-error {
  display: flex;
  padding: 8px 12px;
  font-size: 12px;
  color: var(--el-color-danger);
  background: var(--el-color-danger-light-9);
  border: 1px solid var(--el-color-danger-light-7);
  border-radius: 4px;
  align-items: center;
  gap: 6px;
}

.config-success {
  display: flex;
  padding: 8px 12px;
  font-size: 12px;
  color: var(--el-color-success);
  background: var(--el-color-success-light-9);
  border: 1px solid var(--el-color-success-light-7);
  border-radius: 4px;
  align-items: center;
  gap: 6px;
}

.config-preview-container {
  padding: 10px;
  overflow: auto;
  background: var(--el-fill-color-extra-light);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 4px;
}

.config-preview {
  margin: 0;
  font-family: "Courier New", Consolas, monospace;
  font-size: 12px;
  line-height: 1.45;
  color: var(--el-text-color-secondary);
  word-wrap: break-word;
  white-space: pre-wrap;
}

.config-display {
  padding: 8px 0;
}

/* 编辑配置对话框相关样式 */
.config-edit-dialog-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.config-edit-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  background: var(--el-fill-color-lighter);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 4px;
}

.config-edit-info-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}

.config-edit-info-label {
  min-width: 80px;
  font-weight: 500;
  color: var(--el-text-color-secondary);
}

.config-edit-info-value {
  color: var(--el-text-color-regular);
  flex: 1;
}

/* 查看配置对话框相关样式 */
.config-view-dialog-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.config-view-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  background: var(--el-fill-color-lighter);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 4px;
}

.config-view-info-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}

.config-view-info-label {
  min-width: 80px;
  font-weight: 500;
  color: var(--el-text-color-secondary);
}

.config-view-info-value {
  color: var(--el-text-color-regular);
  flex: 1;
}

.config-view-container {
  max-height: 500px;
  padding: 16px;
  overflow: auto;
  background: var(--el-fill-color-lighter);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 4px;
}

.config-view-content {
  margin: 0;
  font-family: "Courier New", Consolas, monospace;
  font-size: 13px;
  line-height: 1.6;
  color: var(--el-text-color-regular);
  word-wrap: break-word;
  white-space: pre-wrap;
}

.config-view-empty {
  padding: 40px;
  font-size: 14px;
  text-align: center;
}

.generate-product-dialog-body {
  min-height: calc(100vh - 140px);
  padding: 8px 0 24px;
}

.publish-config-dialog-body {
  display: flex;
  min-height: calc(100vh - 140px);
  overflow: hidden;
}

.generate-product-dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.generate-product-dialog-title {
  font-size: 20px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.generate-product-dialog-subtitle {
  margin-top: 6px;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.generate-product-panel {}

.generate-product-panel--wide {
  width: 100%;
}

.publish-config-panel-wrap {
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-height: 100%;
}

.publish-config-toolbar {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.publish-config-toolbar__stats {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.publish-config-template-alert {
  flex: 1 1 360px;
  min-width: 280px;
}

.publish-config-stat-card {
  min-width: 132px;
  padding: 14px 16px;
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 12px;
}

.publish-config-stat-card__label {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.publish-config-stat-card__value {
  margin-top: 8px;
  font-size: 22px;
  font-weight: 600;
  line-height: 1;
  color: var(--el-text-color-primary);
}

.publish-config-toolbar__actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  justify-content: flex-start;
}

.publish-config-search {
  width: 320px;
}

.publish-config-grid-wrap {
  flex: 1;
  min-height: 0;
}

.publish-config-pagination {
  display: flex;
  justify-content: flex-end;
  padding-top: 4px;
}

.publish-config-tip {
  margin-top: 0;
}

.generate-product-panel-title {
  margin-bottom: 16px;
  font-size: 15px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.generate-product-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
}

.generate-product-option-id,
.generate-product-option-meta {
  flex-shrink: 0;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.generate-product-template-toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
  flex-wrap: wrap;
}

.generate-product-template-alert {
  margin-bottom: 10px;
}

.generate-product-template-grid :deep(.is-template-mismatch .vxe-body--column) {
  color: var(--el-text-color-secondary);
  background: var(--el-fill-color-lighter);
}

.generate-product-template-toolbar .el-input {
  max-width: 360px;
  min-width: 240px;
}

.generate-product-template-grid {
  width: 100%;
  overflow: hidden;
  border-radius: 6px;
}

.generate-product-template-grid :deep(.vxe-table) {
  font-size: 12px;
}

.generate-product-template-grid :deep(.vxe-header--row) {
  height: 34px;
}

.generate-product-template-grid :deep(.vxe-header--column) {
  height: 34px !important;
  padding-top: 6px !important;
  padding-bottom: 6px !important;
  font-size: 12px !important;
  background: var(--el-fill-color-light);
}

.generate-product-template-grid :deep(.vxe-header--column .vxe-cell),
.generate-product-template-grid :deep(.vxe-header--column .vxe-cell--title) {
  min-height: 18px !important;
  padding-top: 0 !important;
  padding-bottom: 0 !important;
  font-size: 12px !important;
  font-weight: 600 !important;
  line-height: 18px !important;
}

.generate-product-template-grid :deep(.vxe-body--column) {
  height: 32px;
  padding-top: 5px;
  padding-bottom: 5px;
}

.generate-product-tip {
  margin-top: 6px;
  font-size: 12px;
  line-height: 1.5;
  color: var(--el-text-color-secondary);
}

.generate-product-progress {
  padding: 10px 12px;
  margin-top: 12px;
  background: var(--el-fill-color-extra-light);
  border: 1px solid var(--el-border-color-extra-light);
  border-radius: 6px;
}

.generate-product-progress__text {
  margin-top: 6px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.generate-product-progress__errors {
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: 96px;
  margin-top: 8px;
  overflow: auto;
}

.generate-product-progress__error {
  font-size: 12px;
  line-height: 1.5;
  color: var(--el-color-danger);
}

.generate-product-dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  width: 100%;
}

.publish-task-list-body {
  display: flex;
  flex-direction: column;
  gap: 14px;
  height: calc(100vh - 150px);
  min-height: 0;
  overflow: hidden;
}

.publish-task-list-dialog :deep(.el-dialog__body) {
  height: calc(100vh - 78px);
  overflow: hidden;
  box-sizing: border-box;
}

.publish-task-list-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.publish-task-list-toolbar__stats {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.publish-task-list-grid {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.publish-task-error {
  color: var(--el-color-danger);
}

.production-dispatch-dialog__body {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 204px;
}

.production-dispatch-dialog__panel {
  min-height: 206px;
  padding: 10px;
  background: color-mix(in srgb, var(--el-bg-color) 94%, var(--el-fill-color-light) 6%);
  border: 1px solid color-mix(in srgb, var(--el-border-color) 62%, transparent 38%);
  border-radius: 12px;
}

.production-dispatch-dialog__filters {
  padding: 10px;
  background: var(--el-bg-color);
  border: 1px solid color-mix(in srgb, var(--el-border-color) 62%, transparent 38%);
  border-radius: 12px;
}

.production-dispatch-dialog__filter-form :deep(.el-form-item) {
  margin-bottom: 8px;
}

.production-dispatch-dialog__panel-title {
  font-size: 13px;
  font-weight: 700;
  color: var(--el-text-color-primary);
}

.production-dispatch-dialog__panel-title {
  margin-bottom: 10px;
}

.production-dispatch-dialog__empty {
  font-size: 12px;
  line-height: 1.6;
  color: var(--el-text-color-secondary);
}

.production-dispatch-dialog__table {
  overflow: hidden;
}

.production-dispatch-dialog__table :deep(.el-table) {
  --el-table-row-hover-bg-color: transparent;
  --el-table-current-row-bg-color: transparent;

  font-size: 12px;
}

.production-dispatch-dialog__table :deep(.el-table td),
.production-dispatch-dialog__table :deep(.el-table th) {
  padding-top: 7px;
  padding-bottom: 7px;
}

.production-dispatch-dialog__table :deep(.el-table .cell) {
  padding-right: 8px;
  padding-left: 8px;
  line-height: 1.35;
}

.production-dispatch-dialog__table :deep(.el-table__row) {
  cursor: pointer;
}

.production-dispatch-dialog__table :deep(.el-table__row.is-disabled) {
  cursor: not-allowed;
}

.production-dispatch-dialog__table :deep(.el-table__row.is-disabled td) {
  color: var(--el-text-color-placeholder);
}

.production-dispatch-dialog__table :deep(.el-radio) {
  pointer-events: none;
}

.production-dispatch-dialog__ps-status {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.production-dispatch-dialog__ps-reason {
  display: block;
  overflow: hidden;
  font-size: 11px;
  line-height: 1.35;
  color: var(--el-text-color-secondary);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.production-dispatch-dialog__state-text {
  font-size: 11px;
  font-weight: 600;
  line-height: 1.2;
}

.production-dispatch-dialog__state-text.is-success {
  color: #1f8f46;
}

.production-dispatch-dialog__state-text.is-warning {
  color: #b26a00;
}

.production-dispatch-dialog__state-text.is-danger {
  color: #d5485a;
}

.production-dispatch-dialog__state-text.is-info {
  color: #356dd1;
}

.production-dispatch-dialog__state-text.is-muted {
  color: var(--el-text-color-secondary);
}

.production-dispatch-dialog__task {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  line-height: 1.25;
}

.production-dispatch-dialog__task span,
.production-dispatch-dialog__task small {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.production-dispatch-dialog__task span {
  font-size: 12px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.production-dispatch-dialog__task small {
  font-size: 11px;
  color: var(--el-text-color-secondary);
}

.production-dispatch-dialog__footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  width: 100%;
}

.publish-usage-image {
  width: 56px;
  height: 56px;
  overflow: hidden;
  background: var(--el-fill-color-light);
  border-radius: 6px;
}

.publish-usage-config-cell {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.product-thumb-cell {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 80px;
  height: 80px;
  overflow: hidden;
}

.product-thumb-image {
  width: 72px;
  height: 72px;
  cursor: pointer;
  border-radius: 4px;
  object-fit: contain;
}

.product-price-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.product-price-sale {
  font-weight: 600;
  color: var(--el-color-danger);
}

.product-price-original {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  text-decoration: line-through;
}
</style>
