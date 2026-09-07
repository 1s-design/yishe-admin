<template>
  <ContentWrap :plain="true">
    <el-tabs v-model="materialViewMode" class="material-view-mode-tabs" style="margin-bottom: 8px;">
      <el-tab-pane :label="t('material.singleList')" name="single" />
      <el-tab-pane :label="t('material.groupView')" name="group" />
    </el-tabs>

    <KeepAlive>
      <ImageGroupView v-if="materialViewMode === 'group'" @add-stickers="handleGroupAddStickers"
        @create-psd-sets="openImageGroupPsdSetDialog"
        @create-publish-config-sets="openImageGroupPublishConfigDialog"
        @create-product-config-sets="openImageGroupProductConfigDialog" />
    </KeepAlive>

    <ListPageLayout v-show="materialViewMode === 'single'" class="material-index-page"
      :sidebar-width="folderTreeCollapsed ? '28px' : '280px'">
      <template #filter>
        <div v-if="!isMobile" class="list-page-filter list-page-filter--flat material-index-filter">
          <el-form :model="queryParams" label-position="top" class="list-page-search-form material-index-search-form">
            <el-row :gutter="12" class="list-page-search-form__row">
              <el-col class="list-page-search-form__col--wide" :xs="24" :sm="12" :md="12" :lg="6" :xl="6">
                <el-form-item :label="t('common.search')">
                  <el-input v-model="queryParams.searchText" size="small" :placeholder="t('material.nameDescKeyword')" clearable @change="
                    (val) => {
                      if (!val) getList();
                    }
                  " @keyup.enter="getList" />
                </el-form-item>
              </el-col>

              <el-col class="list-page-search-form__col--narrow" :xs="24" :sm="12" :md="8" :lg="4" :xl="3">
                <el-form-item :label="t('material.sort')">
                  <el-select v-model="queryParams.sortingFields" size="small" :placeholder="t('material.sort')" @change="getList">
                    <el-option :label="t('material.createTimeDesc')" value="createTime DESC" />
                    <el-option :label="t('material.createTimeAsc')" value="createTime ASC" />
                  </el-select>
                </el-form-item>
              </el-col>

              <el-col class="list-page-search-form__col--wide" :xs="24" :sm="12" :md="12" :lg="5" :xl="4">
                <el-form-item :label="t('material.suffix')">
                  <el-select v-model="queryParams.suffix" size="small" :placeholder="t('material.suffix')" multiple clearable collapse-tags
                    collapse-tags-tooltip @change="getList">
                    <el-option label="jpg" value="jpg" />
                    <el-option label="jpeg" value="jpeg" />
                    <el-option label="png" value="png" />
                    <el-option label="gif" value="gif" />
                    <el-option label="webp" value="webp" />
                    <el-option label="svg" value="svg" />
                    <el-option label="bmp" value="bmp" />
                    <el-option label="tiff" value="tiff" />
                  </el-select>
                </el-form-item>
              </el-col>

              <el-col class="list-page-search-form__col--narrow" :xs="24" :sm="12" :md="8" :lg="3" :xl="2">
                <el-form-item :label="t('common.id')">
                  <el-input v-model="queryParams.id" size="small" :placeholder="t('common.id')" clearable @change="
                    (val) => {
                      if (!val) getList();
                    }
                  " />
                </el-form-item>
              </el-col>

              <el-col class="list-page-search-form__col--narrow" :xs="24" :sm="12" :md="8" :lg="3" :xl="3">
                <el-form-item :label="t('material.custom')">
                  <el-select v-model="queryParams.isCustom" size="small" :placeholder="t('material.custom')" clearable @change="getList">
                    <el-option :label="t('material.all')" value="" />
                    <el-option :label="t('material.yes')" :value="true" />
                    <el-option :label="t('material.no')" :value="false" />
                  </el-select>
                </el-form-item>
              </el-col>

              <el-col class="list-page-search-form__col--narrow" :xs="24" :sm="12" :md="8" :lg="3" :xl="3">
                <el-form-item :label="t('material.infringement')">
                  <el-select v-model="queryParams.isInfringement" size="small" :placeholder="t('material.infringement')" clearable
                    @change="getList">
                    <el-option :label="t('material.all')" value="" />
                    <el-option :label="t('material.infringement')" :value="true" />
                    <el-option :label="t('material.notInfringement')" :value="false" />
                  </el-select>
                </el-form-item>
              </el-col>

              <el-col class="list-page-search-form__col--narrow" :xs="24" :sm="12" :md="8" :lg="3" :xl="3">
                <el-form-item :label="t('material.cutout')">
                  <el-select v-model="queryParams.isCutout" size="small" :placeholder="t('material.cutout')" clearable @change="getList">
                    <el-option :label="t('material.all')" value="" />
                    <el-option :label="t('material.yes')" :value="true" />
                    <el-option :label="t('material.no')" :value="false" />
                  </el-select>
                </el-form-item>
              </el-col>

              <el-col class="list-page-search-form__col--narrow" :xs="24" :sm="12" :md="8" :lg="3" :xl="3">
                <el-form-item :label="t('material.seamless')">
                  <el-select v-model="queryParams.seamless" size="small" :placeholder="t('material.seamless')" clearable @change="getList">
                    <el-option :label="t('material.all')" value="" />
                    <el-option :label="t('material.yes')" :value="true" />
                    <el-option :label="t('material.no')" :value="false" />
                  </el-select>
                </el-form-item>
              </el-col>

              <el-col class="list-page-search-form__col--wide" :xs="24" :sm="12" :md="12" :lg="7" :xl="6">
                <el-form-item :label="t('material.size')">
                  <el-select v-model="queryParams.sizeShape" size="small" :placeholder="t('material.sizeShape')" clearable multiple
                    collapse-tags collapse-tags-tooltip @change="getList" :teleported="false">
                    <el-option-group :label="t('material.square')">
                      <el-option v-for="config in sizeShapeGroups.square" :key="config.key" :value="config.key"
                        :label="getFullLabel(config)">
                        <div class="size-option">
                          <div class="size-thumb" :class="`${config.key}-thumb`" :style="{
                            width: `${config.thumbWidth}px`,
                            height: `${config.thumbHeight}px`,
                          }"></div>
                          <span class="size-label">{{ config.label }} ({{ config.ratio }})</span>
                          <span class="size-key">[{{ config.key }}]</span>
                        </div>
                      </el-option>
                    </el-option-group>
                    <el-option-group :label="t('material.landscapeWide')">
                      <el-option v-for="config in sizeShapeGroups.landscape" :key="config.key" :value="config.key"
                        :label="getFullLabel(config)">
                        <div class="size-option">
                          <div class="size-thumb" :class="`${config.key}-thumb`" :style="{
                            width: `${config.thumbWidth}px`,
                            height: `${config.thumbHeight}px`,
                          }"></div>
                          <span class="size-label">{{ config.label }} ({{ config.ratio }})</span>
                          <span class="size-key">[{{ config.key }}]</span>
                        </div>
                      </el-option>
                    </el-option-group>
                    <el-option-group :label="t('material.portraitTall')">
                      <el-option v-for="config in sizeShapeGroups.portrait" :key="config.key" :value="config.key"
                        :label="getFullLabel(config)">
                        <div class="size-option">
                          <div class="size-thumb" :class="`${config.key}-thumb`" :style="{
                            width: `${config.thumbWidth}px`,
                            height: `${config.thumbHeight}px`,
                          }"></div>
                          <span class="size-label">{{ config.label }} ({{ config.ratio }})</span>
                          <span class="size-key">[{{ config.key }}]</span>
                        </div>
                      </el-option>
                    </el-option-group>
                  </el-select>
                </el-form-item>
              </el-col>

              <el-col class="list-page-search-form__col--narrow" :xs="24" :sm="12" :md="8" :lg="2" :xl="2">
                <el-form-item :label="t('material.random')">
                  <div class="material-index-search-form__switch">
                    <el-switch v-model="queryParams.random" size="small" @change="getList" />
                  </div>
                </el-form-item>
              </el-col>

              <el-col class="list-page-search-form__col--wide" :xs="24" :sm="12" :md="12" :lg="5" :xl="5">
                <el-form-item :label="t('material.time')">
                  <DateRangePicker @change="
                    (val) => {
                      queryParams.startTime = val.start;
                      queryParams.endTime = val.end;
                      getList();
                    }
                  " />
                </el-form-item>
              </el-col>

              <el-col v-if="!phashSearchDisabled" class="list-page-search-form__col--full" :xs="24" :sm="24" :md="24"
                :lg="24" :xl="24">
                <el-form-item :label="t('material.similarSearch')">
                  <div class="material-index-phash">
                    <div class="material-index-phash__row">
                      <el-input v-model="queryParams.phash" size="small" :placeholder="t('material.enterPhashOrUrl')" clearable
                        @blur="onPhashInputBlur" />
                      <div class="material-index-phash__modes">
                        <el-check-tag :checked="queryParams.phashMode === 'range'"
                          @change="() => (queryParams.phashMode = 'range')">
                          {{ t('material.similarMatch') }}
                        </el-check-tag>
                        <el-tooltip :content="t('material.exactMatchTip')" placement="top">
                          <el-check-tag :checked="queryParams.phashMode === 'exact'"
                            @change="() => (queryParams.phashMode = 'exact')">
                            {{ t('material.exactMatch') }}
                          </el-check-tag>
                        </el-tooltip>
                      </div>
                      <div class="material-index-phash__actions">
                        <el-button size="small" type="primary" @click="handlePhashSearch">{{ t('material.searchSimilarImages') }}</el-button>
                        <el-button size="small" @click="clearPhashSearch">{{ t('material.clear') }}</el-button>
                      </div>
                    </div>
                  </div>
                </el-form-item>
              </el-col>
              <el-col class="list-page-search-form__col--wide" :xs="24" :sm="12" :md="12" :lg="6" :xl="6">
                <el-form-item :label="t('material.duplicateCheckConfig')">
                  <div class="flex items-center gap-2" style="min-width: 0">
                    <el-select v-model="queryParams.publishUsageConfigId" size="small" :placeholder="t('material.selectToMarkUsed')" clearable
                      filterable multiple style="min-width: 200px" @change="handlePublishUsageViewChange">
                      <el-option v-for="item in publishUsageConfigOptions" :key="item.id"
                        :label="formatPublishUsageConfigLabel(item)" :value="item.id" />
                    </el-select>
                    <el-button size="small" @click="toggleSelectAll">
                      {{ isAllSelected ? t('material.deselectAll') : t('material.selectAll') }}
                    </el-button>
                  </div>
                </el-form-item>
              </el-col>
            </el-row>
            <div class="list-page-search-form__actions material-index-search-form__actions">
              <el-button size="small" type="primary" :icon="Search" :loading="loading" @click="getList">
                {{ t('material.search') }}
              </el-button>
              <el-button size="small" type="success" plain :icon="Picture" :loading="similarImageSubmitting"
                @click="openSimilarImageDialog()">
                {{ t('material.fuzzySearch') }}
              </el-button>
              <el-button size="small" type="primary" @click="
                () => {
                  uploadModalVisible = true;
                }
              ">
                {{ t('material.upload') }}
              </el-button>
              <el-button size="small" @click="
                () => {
                  urlUploadModalVisible = true;
                }
              ">
                {{ t('material.urlUpload') }}
              </el-button>
              <el-button size="small" @click="handleMultiDownload">
                {{ t('material.downloadCount', { count: ids.length }) }}
              </el-button>
              <el-button size="small" type="danger" :loading="deleteLoading" @click="handleDelete(null)">
                <el-icon>
                  <Delete />
                </el-icon>
                <span>{{ t('material.batchDelete', { count: ids.length }) }}</span>
              </el-button>
              <el-dropdown trigger="click" popper-class="material-tool-dropdown"
                @command="(cmd: StickerUserTransferAction) => openStickerUserTransferDialog(cmd)">
                <el-button size="small" type="success" :disabled="loading || !ids.length">
                  {{ t('material.shareCount', { count: ids.length }) }}
                </el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item command="share">
                      <span>{{ t('material.share') }}</span>
                    </el-dropdown-item>
                    <el-dropdown-item command="copy">
                      <span>{{ t('material.copyCopy') }}</span>
                    </el-dropdown-item>
                    <el-dropdown-item command="move">
                      <span>{{ t('material.transferAll') }}</span>
                    </el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
              <el-button
                  v-if="isAdmin"
                  size="small"
                  type="warning"
                  :disabled="loading || !ids.length"
                  @click="handleBatchPublishToLibrary"
                >
                  发布到库 ({{ ids.length }})
                </el-button>
              <el-dropdown trigger="click" popper-class="material-tool-dropdown" :disabled="loading || !ids.length">
                <el-button size="small" type="primary" :disabled="loading || !ids.length">
                  {{ t('material.toolsCount', { count: ids.length }) }}
                </el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item @click="() => openPsdSetDialog(false)">
                      <span>{{ t('material.createPsSet') }}</span>
                    </el-dropdown-item>
                    <el-dropdown-item @click="openMaterialPublishConfigDialog">
                      <span>{{ t('material.selectPublishConfig') }}</span>
                    </el-dropdown-item>
                    <el-dropdown-item @click="openMaterialProductConfigDialog">
                      <span>{{ t('material.generateSiteProduct') }}</span>
                    </el-dropdown-item>
                    <el-dropdown-item @click="openBatchImageProcessing('process')">
                      <span>{{ t('material.imageChainProcess') }}</span>
                    </el-dropdown-item>
                    <el-dropdown-item :title="addToGroupButtonTitle" @click="openBatchAddToGroupDialog">
                      <span>{{ addToGroupButtonText }}</span>
                    </el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </div>
          </el-form>
        </div>
        <div v-else class="material-index-mobile-filter">
          <el-button size="small" type="primary" @click="filterDialogVisible = true">{{ t('material.filter') }}</el-button>
        </div>
        <div v-if="similarImageSearchStatusVisible" class="similar-image-search-status">
          <div v-if="similarImageActiveSourceType === 'text'"
            class="similar-image-search-status__thumb similar-image-search-status__thumb--text">
            <el-icon :size="18" color="#67c23a">
              <Search />
            </el-icon>
          </div>
          <div v-else class="similar-image-search-status__thumb">
            <img :src="similarImageActivePreviewUrl" :alt="t('material.similarImageQuery')" />
          </div>
          <div class="similar-image-search-status__content">
            <div class="similar-image-search-status__line">
              <el-tag size="small" type="success" effect="plain">
                {{ similarImageActiveSourceType === 'text' ? t('material.textSearch') : t('material.similarImage') }}
              </el-tag>
              <span class="similar-image-search-status__source">
                {{ similarImageActiveSourceText }}
              </span>
              <span v-if="similarImageSearchMeta" class="similar-image-search-status__meta">
                {{ t('material.searchMeta', { time: similarImageSearchMeta.searchTimeMs, score: similarImageSearchMeta.scoreRange?.max ?
                  (similarImageSearchMeta.scoreRange.max * 100).toFixed(1) + '%' : '-' }) }}
              </span>
            </div>
          </div>
          <div class="similar-image-search-status__actions">
            <el-button size="small" text type="primary" @click="openSimilarImageDialog()">
              {{ similarImageActiveSourceType === 'text' ? t('material.searchAgain') : t('material.changeImage') }}
            </el-button>
            <el-button size="small" text @click="clearSimilarImageSearchResults">
              {{ t('material.clear') }}
            </el-button>
          </div>
        </div>
        <el-dialog v-model="filterDialogVisible" :title="t('material.filter')" width="90%" align-center>
          <el-form :model="queryParams" label-width="80px">
            <el-form-item :label="t('common.search')">
              <el-input v-model="queryParams.searchText" :placeholder="t('material.searchTextPlaceholder')" clearable />
            </el-form-item>
            <el-form-item :label="t('material.sort')">
              <el-select v-model="queryParams.sortingFields" :placeholder="t('material.selectSort')">
                <el-option :label="t('material.createTimeDesc')" value="createTime DESC" />
                <el-option :label="t('material.createTimeAsc')" value="createTime ASC" />
              </el-select>
            </el-form-item>
            <el-form-item :label="t('material.custom')">
              <el-select v-model="queryParams.isCustom" :placeholder="t('material.selectType')">
                <el-option :label="t('material.all')" value="" />
                <el-option :label="t('material.yes')" :value="true" />
                <el-option :label="t('material.no')" :value="false" />
              </el-select>
            </el-form-item>
            <el-form-item :label="t('material.infringement')">
              <el-select v-model="queryParams.isInfringement" :placeholder="t('material.selectStatus')">
                <el-option :label="t('material.all')" value="" />
                <el-option :label="t('material.infringement')" :value="true" />
                <el-option :label="t('material.notInfringement')" :value="false" />
              </el-select>
            </el-form-item>
            <el-form-item :label="t('material.cutout')">
              <el-select v-model="queryParams.isCutout" :placeholder="t('material.selectType')">
                <el-option :label="t('material.all')" value="" />
                <el-option :label="t('material.yes')" :value="true" />
                <el-option :label="t('material.no')" :value="false" />
              </el-select>
            </el-form-item>
            <el-form-item :label="t('material.seamless')">
              <el-select v-model="queryParams.seamless" :placeholder="t('material.selectType')">
                <el-option :label="t('material.all')" value="" />
                <el-option :label="t('material.yes')" :value="true" />
                <el-option :label="t('material.no')" :value="false" />
              </el-select>
            </el-form-item>
            <el-form-item :label="t('material.sizeShape')">
              <el-select v-model="queryParams.sizeShape" :placeholder="t('material.selectSizeShape')" clearable multiple>
                <el-option-group :label="t('material.common')">
                  <el-option value="landscape" :label="t('material.landscape')">
                    <div class="size-option">
                      <div class="size-thumb landscape-thumb"></div>
                      <span class="size-label">{{ t('material.landscape') }}</span>
                    </div>
                  </el-option>
                  <el-option value="portrait" :label="t('material.portrait')">
                    <div class="size-option">
                      <div class="size-thumb portrait-thumb"></div>
                      <span class="size-label">{{ t('material.portrait') }}</span>
                    </div>
                  </el-option>
                  <el-option value="square" :label="t('material.squareImage')">
                    <div class="size-option">
                      <div class="size-thumb square-thumb"></div>
                      <span class="size-label">{{ t('material.squareImage') }}</span>
                    </div>
                  </el-option>
                </el-option-group>
                <el-option-group :label="t('material.landscapeDetail')">
                  <el-option value="ultra-wide" :label="t('material.ultraWide')">
                    <div class="size-option">
                      <div class="size-thumb ultra-wide-thumb"></div>
                      <span class="size-label">{{ t('material.ultraWide') }}</span>
                    </div>
                  </el-option>
                  <el-option value="wide" :label="t('material.wide')">
                    <div class="size-option">
                      <div class="size-thumb wide-thumb"></div>
                      <span class="size-label">{{ t('material.wide') }}</span>
                    </div>
                  </el-option>
                  <el-option value="slightly-wide" :label="t('material.slightlyWide')">
                    <div class="size-option">
                      <div class="size-thumb slightly-wide-thumb"></div>
                      <span class="size-label">{{ t('material.slightlyWide') }}</span>
                    </div>
                  </el-option>
                </el-option-group>
                <el-option-group :label="t('material.portraitDetail')">
                  <el-option value="slightly-long" :label="t('material.slightlyLong')">
                    <div class="size-option">
                      <div class="size-thumb slightly-long-thumb"></div>
                      <span class="size-label">{{ t('material.slightlyLong') }}</span>
                    </div>
                  </el-option>
                  <el-option value="long" :label="t('material.longImage')">
                    <div class="size-option">
                      <div class="size-thumb long-thumb"></div>
                      <span class="size-label">{{ t('material.longImage') }}</span>
                    </div>
                  </el-option>
                  <el-option value="ultra-long" :label="t('material.ultraLong')">
                    <div class="size-option">
                      <div class="size-thumb ultra-long-thumb"></div>
                      <span class="size-label">{{ t('material.ultraLong') }}</span>
                    </div>
                  </el-option>
                </el-option-group>
              </el-select>
            </el-form-item>
            <el-form-item :label="t('material.suffix')">
              <el-select v-model="queryParams.suffix" :placeholder="t('material.selectSuffix')" multiple clearable>
                <el-option label="jpg" value="jpg" />
                <el-option label="jpeg" value="jpeg" />
                <el-option label="png" value="png" />
                <el-option label="gif" value="gif" />
                <el-option label="webp" value="webp" />
                <el-option label="svg" value="svg" />
                <el-option label="bmp" value="bmp" />
                <el-option label="tiff" value="tiff" />
              </el-select>
            </el-form-item>
            <el-form-item :label="t('material.duplicateCheckConfig')">
              <div class="flex items-center gap-2">
                <el-select v-model="queryParams.publishUsageConfigId" :placeholder="t('material.selectToMarkUsed')" clearable filterable
                  multiple collapse-tags collapse-tags-tooltip style="min-width: 200px">
                  <el-option v-for="item in publishUsageConfigOptions" :key="item.id"
                    :label="formatPublishUsageConfigLabel(item)" :value="item.id" />
                </el-select>
                <el-button size="small" @click="toggleSelectAll">
                  {{ isAllSelected ? t('material.deselectAll') : t('material.selectAll') }}
                </el-button>
              </div>
            </el-form-item>
            <el-form-item :label="t('material.randomOrder')">
              <el-switch v-model="queryParams.random" :active-text="t('material.random')" :inactive-text="t('material.default')" />
            </el-form-item>
            <el-form-item :label="t('material.queryByTime')">
              <DateRangePicker @change="
                (val) => {
                  queryParams.startTime = val.start;
                  queryParams.endTime = val.end;
                }
              " />
            </el-form-item>
          </el-form>
          <template #footer>
            <el-button @click="filterDialogVisible = false">{{ t('material.cancel') }}</el-button>
            <el-button type="primary" @click="onMobileFilterSubmit">{{ t('material.confirm') }}</el-button>
          </template>
        </el-dialog>
        <!-- PC 顶部筛选栅格布局样式 -->
        <!--（放在这里是为了避免全局影响，保持只作用于本页） -->

        <el-dialog v-model="materialPublishConfigDialogVisible" fullscreen align-center :destroy-on-close="false"
          class="material-publish-config-dialog" @close="handleCloseMaterialPublishConfigDialog">
          <template #header>
            <div class="material-publish-config-dialog__header">
              <div class="material-publish-config-dialog__header-main">
                <div class="material-publish-config-dialog__header-title">{{ t('material.selectPublishConfig') }}</div>
              </div>

              <div class="material-publish-config-dialog__header-chips">
                <span class="material-publish-config-dialog__header-chip">
                  {{ t('material.materialCount', { count: selectedMaterialsForPublishConfig.length }) }}
                </span>
                <span class="material-publish-config-dialog__header-chip">
                  {{ t('material.usableConfigCount', { count: materialPublishConfigUsableCount }) }}
                </span>
              </div>
            </div>
          </template>

          <div v-loading="materialPublishConfigLoading" class="material-publish-config-dialog__body">
            <div class="material-publish-config-dialog__panel material-publish-config-dialog__panel--materials">
              <div class="material-publish-config-dialog__section-head">
                <div>
                  <div class="material-publish-config-dialog__section-eyebrow">{{ t('material.step1') }}</div>
                  <div class="material-publish-config-dialog__section-title">{{ t('material.selectedImages') }}</div>
                  <div class="material-publish-config-dialog__section-desc">
                    {{ t('material.materialCountConfirm', { count: selectedMaterialsForPublishConfig.length }) }}
                  </div>
                </div>
                <div class="material-publish-config-dialog__tag-list">
                  <el-tag :type="hasInvalidFormatMaterials ? 'warning' : 'success'" effect="plain">
                    {{
                      hasInvalidFormatMaterials
                        ? t('material.formatNeedsProcess', { count: invalidFormatMaterialsList.length })
                        : t('material.formatCheckPassed')
                    }}
                  </el-tag>
                  <el-tag type="info" effect="plain">
                    {{ t('material.allowedFormats') }}：{{ psdSetAllowedFormats.join("、") }}
                  </el-tag>
                </div>
              </div>

              <el-alert v-if="hasInvalidFormatMaterials" type="warning" :closable="false" show-icon
                class="material-publish-config-dialog__warning">
                <template #title>
                  {{ t('material.invalidFormatAlert', {
                    count: invalidFormatMaterialsList.length,
                    names: invalidFormatMaterialsList.map((item) => item.name).join("、")
                  }) }}
                </template>
              </el-alert>

              <div class="material-publish-config-dialog__material-list">
                <div v-for="material in selectedMaterialsForPublishConfig" :key="material.id"
                  class="material-publish-config-dialog__material-item" :class="{
                    'material-publish-config-dialog__material-item--invalid':
                      isMaterialFormatInvalid(material.id),
                  }">
                  <button type="button" class="material-publish-config-dialog__material-remove" :title="t('material.removeImage')"
                    @click.stop="removeSelectedMaterial(material.id)">
                    ×
                  </button>
                  <div class="material-publish-config-dialog__material-preview">
                    <img v-if="getMaterialPreviewSource(material)"
                      :src="getFastPreviewImageUrl(getMaterialPreviewSource(material), { width: 220 })"
                      :alt="material.name || t('material.materialId', { id: material.id })" :title="material.name || t('material.materialId', { id: material.id })" />
                    <div v-else class="material-publish-config-dialog__material-placeholder">
                      {{ t('material.noPreview') }}
                    </div>
                  </div>

                  <div class="material-publish-config-dialog__material-meta">
                    <span class="material-publish-config-dialog__material-name">
                      {{ material.name || t('material.materialId', { id: material.id }) }}
                    </span>
                    <span class="material-publish-config-dialog__material-suffix">
                      {{ getMaterialSuffix(material.id) || t('material.unknownFormat') }}
                    </span>
                  </div>
                </div>

                <el-empty v-if="!selectedMaterialsForPublishConfig.length" :description="t('material.selectMaterialFirst')" :image-size="84" />
              </div>
            </div>

            <div class="material-publish-config-dialog__panel material-publish-config-dialog__panel--configs">
              <div
                class="material-publish-config-dialog__section-head material-publish-config-dialog__section-head--configs">
                <div>
                  <div class="material-publish-config-dialog__section-eyebrow">{{ t('material.step2') }}</div>
                  <div class="material-publish-config-dialog__section-title">{{ t('material.publishConfig') }}</div>
                  <div class="material-publish-config-dialog__section-desc">
                    {{ t('material.publishConfigSectionDesc') }}
                  </div>
                </div>
                <div class="material-publish-config-dialog__section-tools">
                  <el-tag type="success" effect="plain">
                    {{ t('material.usable') }} {{ materialPublishConfigUsableCount }} / {{ filteredMaterialPublishConfigs.length }}
                  </el-tag>
                  <div class="material-publish-config-dialog__search">
                    <el-input v-model="materialPublishConfigSearchText" clearable :placeholder="t('material.searchConfigPlaceholder')"
                      @input="materialPublishConfigCurrentPage = 1">
                      <template #prefix>
                        <el-icon>
                          <Search />
                        </el-icon>
                      </template>
                    </el-input>
                  </div>
                </div>
              </div>

              <div class="common-table material-publish-config-dialog__table">
                <vxe-grid ref="materialPublishConfigGridRef" v-bind="materialPublishConfigGridOptions"
                  :data="materialPublishConfigDataSource" @checkbox-change="handleMaterialPublishConfigCheckboxChange"
                  @checkbox-all="handleMaterialPublishConfigCheckboxAllChange" />
              </div>

              <div v-if="filteredMaterialPublishConfigs.length > 0" class="material-publish-config-dialog__pagination">
                <pagination v-model:page="materialPublishConfigCurrentPage"
                  v-model:limit="materialPublishConfigPageSize" :total="filteredMaterialPublishConfigs.length" />
              </div>
            </div>
          </div>

          <template #footer>
            <div class="material-publish-config-dialog__footer">
              <div class="material-publish-config-dialog__footer-info">
                <span class="material-publish-config-dialog__footer-chip">
                  {{ isImageGroupPsdSet ? t('material.groupCount', { count: psdSetImageGroups.length }) : t('material.materialCount', { count: ids.length }) }}
                </span>
                <span class="material-publish-config-dialog__footer-chip">
                  {{ t('material.publishConfigCount', { count: materialPublishConfigSelectedIds.length }) }}
                </span>
                <span class="material-publish-config-dialog__footer-chip">
                  {{ t('material.expectedPsdTasks', { count: materialPublishConfigTaskCount }) }}
                </span>
                <span v-if="hasInvalidFormatMaterials" class="material-publish-config-dialog__footer-tip">
                  {{ t('material.incompatibleFormatTip') }}
                </span>
                <span v-else
                  class="material-publish-config-dialog__footer-tip material-publish-config-dialog__footer-tip--muted">
                  {{ t('material.publishConfigFooterMuted') }}
                </span>
              </div>
              <div class="material-publish-config-dialog__footer-actions">
                <el-button @click="handleCloseMaterialPublishConfigDialog">{{ t('material.cancel') }}</el-button>
                <el-button type="primary" :loading="materialPublishConfigSubmitting" :disabled="!(isImageGroupPsdSet ? psdSetImageGroups.length : ids.length) ||
                  !materialPublishConfigSelectedIds.length ||
                  hasInvalidFormatMaterials
                  " @click="handleCreatePsdSetsByPublishConfig">
                  {{ t('material.createPublishTask') }}
                </el-button>
              </div>
            </div>
          </template>
        </el-dialog>

        <el-dialog v-model="materialProductConfigDialogVisible" fullscreen align-center :destroy-on-close="false"
          class="material-publish-config-dialog" @close="handleCloseMaterialProductConfigDialog">
          <template #header>
            <div class="material-publish-config-dialog__header">
              <div class="material-publish-config-dialog__header-main">
                <div class="material-publish-config-dialog__header-title">
                  {{ t('material.generateSiteProduct') }}
                </div>
              </div>

              <div class="material-publish-config-dialog__header-chips">
                <span class="material-publish-config-dialog__header-chip">
                  {{ t('material.materialCount', { count: selectedMaterialsForPublishConfig.length }) }}
                </span>
                <span class="material-publish-config-dialog__header-chip">
                  {{ t('material.usableConfigCount', { count: materialProductConfigUsableCount }) }}
                </span>
              </div>
            </div>
          </template>

          <div v-loading="materialProductConfigLoading" class="material-publish-config-dialog__body">
            <div class="material-publish-config-dialog__panel material-publish-config-dialog__panel--materials">
              <div class="material-publish-config-dialog__section-head">
                <div>
                  <div class="material-publish-config-dialog__section-eyebrow">{{ t('material.step1') }}</div>
                  <div class="material-publish-config-dialog__section-title">{{ t('material.selectedImages') }}</div>
                  <div class="material-publish-config-dialog__section-desc">
                    {{ t('material.materialCountSimple', { count: selectedMaterialsForPublishConfig.length }) }}
                  </div>
                </div>
                <div class="material-publish-config-dialog__tag-list">
                  <el-tag :type="hasInvalidFormatMaterials ? 'warning' : 'success'" effect="plain">
                    {{
                      hasInvalidFormatMaterials
                        ? t('material.formatNeedsProcess', { count: invalidFormatMaterialsList.length })
                        : t('material.formatCheckPassed')
                    }}
                  </el-tag>
                  <el-tag type="info" effect="plain">
                    {{ t('material.allowedFormats') }}：{{ psdSetAllowedFormats.join("、") }}
                  </el-tag>
                </div>
              </div>

              <el-alert v-if="hasInvalidFormatMaterials" type="warning" :closable="false" show-icon
                class="material-publish-config-dialog__warning">
                <template #title>
                  {{ t('material.invalidFormatAlert', {
                    count: invalidFormatMaterialsList.length,
                    names: invalidFormatMaterialsList.map((item) => item.name).join("、")
                  }) }}
                </template>
              </el-alert>

              <div class="material-publish-config-dialog__material-list">
                <div v-for="material in selectedMaterialsForPublishConfig" :key="material.id"
                  class="material-publish-config-dialog__material-item" :class="{
                    'material-publish-config-dialog__material-item--invalid':
                      isMaterialFormatInvalid(material.id),
                  }">
                  <button type="button" class="material-publish-config-dialog__material-remove" :title="t('material.removeImage')"
                    @click.stop="removeSelectedMaterial(material.id)">
                    ×
                  </button>
                  <div class="material-publish-config-dialog__material-preview">
                    <img v-if="getMaterialPreviewSource(material)"
                      :src="getFastPreviewImageUrl(getMaterialPreviewSource(material), { width: 220 })"
                      :alt="material.name || t('material.materialId', { id: material.id })" :title="material.name || t('material.materialId', { id: material.id })" />
                    <div v-else class="material-publish-config-dialog__material-placeholder">
                      {{ t('material.noPreview') }}
                    </div>
                  </div>

                  <div class="material-publish-config-dialog__material-meta">
                    <span class="material-publish-config-dialog__material-name">
                      {{ material.name || t('material.materialId', { id: material.id }) }}
                    </span>
                    <span class="material-publish-config-dialog__material-suffix">
                      {{ getMaterialSuffix(material.id) || t('material.unknownFormat') }}
                    </span>
                  </div>
                </div>

                <el-empty v-if="!selectedMaterialsForPublishConfig.length" :description="t('material.selectMaterialFirst')" :image-size="84" />
              </div>
            </div>

            <div class="material-publish-config-dialog__panel material-publish-config-dialog__panel--configs">
              <div
                class="material-publish-config-dialog__section-head material-publish-config-dialog__section-head--configs">
                <div>
                  <div class="material-publish-config-dialog__section-eyebrow">{{ t('material.step2') }}</div>
                  <div class="material-publish-config-dialog__section-title">
                    {{ t('material.siteProductConfig') }}
                  </div>
                  <div class="material-publish-config-dialog__section-desc">
                    {{ t('material.siteProductSectionDesc') }}
                  </div>
                </div>
                <div class="material-publish-config-dialog__section-tools">
                  <el-tag type="success" effect="plain">
                    {{ t('material.usable') }} {{ materialProductConfigUsableCount }} /
                    {{ filteredMaterialProductConfigs.length }}
                  </el-tag>
                  <div class="material-publish-config-dialog__search">
                    <el-input v-model="materialProductConfigSearchText" clearable :placeholder="t('material.searchProductConfigPlaceholder')"
                      @input="materialProductConfigCurrentPage = 1">
                      <template #prefix>
                        <el-icon>
                          <Search />
                        </el-icon>
                      </template>
                    </el-input>
                  </div>
                </div>
              </div>

              <div class="common-table material-publish-config-dialog__table">
                <vxe-grid ref="materialProductConfigGridRef" v-bind="materialProductConfigGridOptions"
                  :data="materialProductConfigDataSource" @checkbox-change="handleMaterialProductConfigCheckboxChange"
                  @checkbox-all="handleMaterialProductConfigCheckboxAllChange" />
              </div>

              <div v-if="filteredMaterialProductConfigs.length > 0" class="material-publish-config-dialog__pagination">
                <pagination v-model:page="materialProductConfigCurrentPage"
                  v-model:limit="materialProductConfigPageSize" :total="filteredMaterialProductConfigs.length" />
              </div>
            </div>
          </div>

          <template #footer>
            <div class="material-publish-config-dialog__footer">
              <div class="material-publish-config-dialog__footer-info">
                <span class="material-publish-config-dialog__footer-chip">
                  {{ isImageGroupPsdSet ? t('material.groupCount', { count: psdSetImageGroups.length }) : t('material.materialCount', { count: ids.length }) }}
                </span>
                <span class="material-publish-config-dialog__footer-chip">
                  {{ t('material.productConfigCount', { count: materialProductConfigSelectedIds.length }) }}
                </span>
                <span class="material-publish-config-dialog__footer-chip">
                  {{ t('material.expectedSiteProducts', { count: materialProductConfigTaskCount }) }}
                </span>
                <span v-if="hasInvalidFormatMaterials" class="material-publish-config-dialog__footer-tip">
                  {{ t('material.incompatibleFormatTipProduct') }}
                </span>
                <span v-else
                  class="material-publish-config-dialog__footer-tip material-publish-config-dialog__footer-tip--muted">
                  {{ t('material.siteProductFooterMuted') }}
                </span>
              </div>
              <div class="material-publish-config-dialog__footer-actions">
                <el-button @click="handleCloseMaterialProductConfigDialog">{{ t('material.cancel') }}</el-button>
                <el-button type="primary" :loading="materialProductConfigSubmitting" :disabled="!(isImageGroupPsdSet ? psdSetImageGroups.length : ids.length) ||
                  !materialProductConfigSelectedIds.length ||
                  hasInvalidFormatMaterials
                  " @click="handleCreatePsdSetsByProductConfig">
                  {{ t('material.createProductTask') }}
                </el-button>
              </div>
            </div>
          </template>
        </el-dialog>

        <el-dialog v-model="psdSetDialogVisible" fullscreen align-center append-to-body :destroy-on-close="true"
          class="psd-set-dialog" @close="resetPsdSetState">
          <template #header>
            <div class="psd-set-dialog__header">
              <div class="psd-set-dialog__header-main">
                <div class="psd-set-dialog__header-title">{{ psdSetDialogTitle }}</div>
              </div>
              <div class="psd-set-dialog__header-chips">
                <span v-if="isImageGroupPsdSet" class="psd-set-dialog__header-chip">
                  {{ t('material.groupCount', { count: psdSetImageGroups.length }) }}
                </span>
                <span class="psd-set-dialog__header-chip">
                  {{ t('material.materialCount', { count: psdSetSelectedMaterialIds.length }) }}
                </span>
                <span class="psd-set-dialog__header-chip">
                  {{ t('material.templateCount', { count: selectedPsdTemplateIds.length }) }}
                </span>
                <span class="psd-set-dialog__header-chip is-accent">
                  {{ t('material.expectedTasks', { count: psdSetTaskCount }) }}
                </span>
              </div>
            </div>
          </template>

          <div class="psd-set-body">
            <div class="psd-set-materials">
              <div class="psd-set-panel__head">
                <div>
                  <div class="psd-set-panel__eyebrow">{{ t('material.step1') }}</div>
                  <div class="section-title">
                    {{ isImageGroupPsdSet ? t('material.selectedGroups') : t('material.selectedMaterials') }}
                    ({{ isImageGroupPsdSet ? psdSetImageGroups.length : psdSetSelectedMaterialIds.length }})
                  </div>
                  <div class="psd-set-panel__desc">
                    {{
                      isImageGroupPsdSet
                        ? t('material.groupTaskDesc')
                        : t('material.materialTaskDesc')
                    }}
                  </div>
                </div>
                <div class="psd-set-panel__tags">
                  <el-tag :type="hasInvalidFormatMaterials ? 'warning' : 'success'" effect="plain">
                    {{
                      hasInvalidFormatMaterials
                        ? t('material.formatNeedsProcess', { count: invalidFormatMaterialsList.length })
                        : t('material.formatCheckPassed')
                    }}
                  </el-tag>
                </div>
              </div>
              <el-alert v-if="hasInvalidFormatMaterials" type="warning" :closable="false" show-icon
                class="psd-set-panel__alert">
                <template #title>
                  {{ t('material.incompatibleFormatAlert', {
                    count: invalidFormatMaterialsList.length,
                    names: invalidFormatMaterialsList.map((item) => item.name).join("、")
                  }) }}
                </template>
              </el-alert>
              <div v-if="isImageGroupPsdSet" class="psd-set-source-groups">
                <div v-for="group in psdSetImageGroups" :key="group.id" class="psd-set-source-group">
                  <div class="psd-set-source-group__head">
                    <span class="psd-set-source-group__name">{{ group.name }}</span>
                    <el-tag size="small" type="info" effect="plain">
                      {{ t('material.imageCount', { count: group.stickers.length }) }}
                    </el-tag>
                  </div>
                  <div class="psd-set-source-group__members">
                    <div v-for="(sticker, index) in group.stickers" :key="sticker.id"
                      class="psd-set-source-group__member">
                      <span class="psd-set-source-group__order">#{{ index + 1 }}</span>
                      <img :src="getFastPreviewImageUrl(getMaterialPreviewSource(sticker), { width: 120 })"
                        :alt="sticker.name || t('material.imageIndex', { index: index + 1 })" loading="lazy" />
                    </div>
                  </div>
                </div>
              </div>
              <div v-else class="thumbs">
                <div v-for="id in psdSetSelectedMaterialIds" :key="id" class="thumb"
                  :class="{ 'thumb-invalid-format': isMaterialFormatInvalid(id) }">
                  <button type="button" class="thumb-remove" :title="t('material.removeImage')" @click.stop="removeSelectedMaterial(id)">
                    ×
                  </button>
                  <div class="thumb-image-wrapper">
                    <img :src="getFastPreviewImageUrl(
                      getMaterialPreviewSource(getMaterialById(id)),
                      { width: 150 },
                    )
                      " class="thumb-img" :alt="t('material.materialPreview')" loading="lazy" />
                    <div v-if="isMaterialFormatInvalid(id)" class="thumb-format-badge">
                      <el-icon>
                        <Warning />
                      </el-icon>
                      <span>{{ getMaterialSuffix(id) || t('material.unknown') }}</span>
                    </div>
                    <div v-else-if="getMaterialSuffix(id)" class="thumb-format-badge valid">
                      <span>{{ getMaterialSuffix(id) }}</span>
                    </div>
                  </div>
                  <div class="thumb-info-row">
                    <el-tag v-if="getMaterialShapeLabel(id)" size="small" type="info" class="thumb-info-tag">
                      {{ getMaterialShapeLabel(id) }}
                    </el-tag>
                    <el-tag v-if="getMaterialCutoutStatus(id) !== null" size="small"
                      :type="getMaterialCutoutStatus(id) ? 'success' : 'info'" class="thumb-info-tag">
                      {{ getMaterialCutoutStatus(id) ? t('material.cutout') : t('material.nonCutout') }}
                    </el-tag>
                  </div>
                  <div class="thumb-action-row">
                    <el-button size="small" type="primary" link
                      :disabled="!getMaterialShapeKey(id) && !getMaterialCutoutMode(id)"
                      @click="applyMaterialFilters(id)">
                      {{ t('material.filterByThisImage') }}
                    </el-button>
                  </div>
                </div>
              </div>
            </div>
            <div class="psd-set-templates">
              <div class="psd-set-panel__head">
                <div>
                  <div class="psd-set-panel__eyebrow">{{ t('material.step2') }}</div>
                  <div class="section-title">
                    {{ t('material.selectPsdTemplate') }}
                    <span v-if="psdSetTemplatePageParams.total > 0" class="template-count-info">
                      ({{ t('material.totalCount', { count: psdSetTemplatePageParams.total }) }})
                    </span>
                  </div>
                  <div class="psd-set-panel__desc">
                    {{ t('material.templateListDesc') }}
                  </div>
                </div>
                <div class="psd-set-panel__tags">
                  <el-tag type="primary" effect="plain">
                    {{ t('material.selectedCount', { count: selectedPsdTemplateIds.length }) }}
                  </el-tag>
                  <el-tag type="info" effect="plain">{{ t('material.expectedTasks', { count: psdSetTaskCount }) }}</el-tag>
                </div>
              </div>

              <div class="psd-set-content-container">
                <div class="psd-template-folder-filter">
                  <span class="psd-template-folder-filter__label">{{ t('material.folder') }}</span>
                  <el-cascader v-model="selectedPsdFolderId" :options="psdFolderTreeData" :props="{
                    value: 'id',
                    label: 'name',
                    children: 'children',
                    checkStrictly: true,
                    emitPath: false,
                  }" :placeholder="t('material.selectTemplateFolder')" filterable clearable :show-all-levels="false"
                    popper-class="psd-template-folder-cascader-popper" class="psd-template-folder-filter__cascader"
                    @change="handlePsdFolderChange" />
                </div>

                <div class="psd-template-list-container">
                  <div class="psd-set-template-toolbar">
                    <el-input v-model="psdSetTemplateSearchText" :placeholder="t('material.search')" clearable
                      class="psd-set-template-toolbar__search">
                      <template #prefix>
                        <el-icon>
                          <Search />
                        </el-icon>
                      </template>
                    </el-input>

                    <!-- 尺寸过滤 -->
                    <el-select v-model="psdSetTemplatePageParams.suitableSizesArray" :placeholder="t('material.size')" clearable multiple
                      style="max-width: 200px" @change="
                        () => {
                          psdSetTemplatePageParams.currentPage = 1;
                          loadPsdTemplatesForPsdSet();
                        }
                      ">
                      <el-option-group :label="t('material.square')">
                        <el-option v-for="config in SIZE_SHAPE_GROUPS.square" :key="config.key" :label="config.label"
                          :value="config.key" />
                      </el-option-group>
                      <el-option-group :label="t('material.landscape')">
                        <el-option v-for="config in SIZE_SHAPE_GROUPS.landscape" :key="config.key" :label="config.label"
                          :value="config.key" />
                      </el-option-group>
                      <el-option-group :label="t('material.portrait')">
                        <el-option v-for="config in SIZE_SHAPE_GROUPS.portrait" :key="config.key" :label="config.label"
                          :value="config.key" />
                      </el-option-group>
                    </el-select>

                    <!-- 抠图过滤 -->
                    <el-select v-model="psdSetTemplatePageParams.cutoutModesArray" :placeholder="t('material.cutoutSupport')" clearable multiple
                      style="max-width: 200px" @change="
                        () => {
                          psdSetTemplatePageParams.currentPage = 1;
                          loadPsdTemplatesForPsdSet();
                        }
                      ">
                      <el-option :label="t('material.cutout')" value="CUTOUT" />
                      <el-option :label="t('material.nonCutout')" value="NON_CUTOUT" />
                    </el-select>

                    <el-button size="default" class="psd-template-toolbar-button" @click="handlePsdTemplateSelectAll">
                      {{ isAllPsdTemplatesSelected ? t('material.deselectAll') : t('material.selectAll') }}
                    </el-button>
                    <el-button size="default" :icon="Edit" class="psd-template-toolbar-button"
                      @click="handlePsdTemplateDetailConfig">
                      {{ t('material.detailConfig') }}
                    </el-button>
                    <span class="selected-count" v-if="selectedPsdTemplateIds.length > 0">
                      {{ t('material.selectedCount', { count: selectedPsdTemplateIds.length }) }}
                    </span>
                  </div>
                  <div class="template-list-wrapper">
                    <div class="template-list" v-loading="psdSetTemplatesLoading">
                      <div v-for="tpl in filteredPsdSetTemplates" :key="tpl.id" class="template-item"
                        :class="{ 'is-checked': selectedPsdTemplateIds.includes(String(tpl.id)) }">
                        <div class="template-content-wrapper" @click="togglePsdTemplate(tpl.id)">
                          <img v-if="tpl.thumbnail || tpl.preview || tpl.image" :src="getFastPreviewImageUrl(tpl.thumbnail || tpl.preview || tpl.image, {
                            width: 200,
                          })
                            " :alt="tpl.name || t('material.templateThumbnail')" class="template-thumbnail" loading="lazy" :title="t('material.clickToPreview')"
                            @click.stop="openImagePreview(tpl.thumbnail || tpl.preview || tpl.image, tpl.name)"
                            @error="handleTemplateImageError" />
                          <div class="template-info">
                            <div class="template-header">
                              <div class="template-title-row">
                                <div class="template-title">{{ tpl.name || t('material.unnamedTemplate') }}</div>
                                <el-link type="primary" underline="never" class="template-detail-link"
                                  @click.stop="openTemplateDetail(tpl)">
                                  {{ t('material.viewDetail') }}
                                </el-link>
                              </div>
                            </div>
                            <div class="template-paths">
                              <div class="path-row">
                                <span class="path-label">{{ t('material.suitableSizes') }}：</span>
                                <div v-if="tpl.suitableSizes && tpl.suitableSizes.length > 0"
                                  class="suitable-sizes-wrap">
                                  <el-tag v-for="sizeKey in tpl.suitableSizes" :key="sizeKey" size="small" :style="{
                                    backgroundColor: getSizeShapeUiConfig(sizeKey)?.color + '20',
                                    borderColor: getSizeShapeUiConfig(sizeKey)?.color,
                                    color: getSizeShapeUiConfig(sizeKey)?.color,
                                    marginRight: '4px',
                                  }">
                                    {{ getSizeShapeUiConfig(sizeKey)?.label || sizeKey }}
                                  </el-tag>
                                </div>
                                <span v-else class="path-empty">{{ t('material.none') }}</span>
                              </div>
                              <div class="path-row">
                                <span class="path-label">{{ t('material.suitableCutout') }}：</span>
                                <div v-if="tpl.cutoutModes && tpl.cutoutModes.length > 0" class="suitable-cutout-wrap">
                                  <el-tag v-for="mode in tpl.cutoutModes" :key="mode" size="small" type="info"
                                    style="margin-right: 4px">
                                    {{ getCutoutModeLabel(mode) }}
                                  </el-tag>
                                </div>
                                <span v-else class="path-empty">{{ t('material.none') }}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      <el-empty v-if="!filteredPsdSetTemplates.length && !psdSetTemplatesLoading"
                        :description="psdSetTemplateSearchText ? t('material.noMatchingTemplate') : t('material.noPsdTemplate')" />
                    </div>
                    <!-- PSD模板分页 -->
                    <div class="template-pagination" v-if="psdSetTemplatePageParams.total > 0">
                      <pagination v-model:page="psdSetTemplatePageParams.currentPage"
                        v-model:limit="psdSetTemplatePageParams.pageSize" :total="psdSetTemplatePageParams.total"
                        @pagination="loadPsdTemplatesForPsdSet" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="psd-set-footer">
            <div class="psd-set-footer-main">
              <div class="psd-set-info">
                <el-icon>
                  <InfoFilled />
                </el-icon>
                <div class="psd-set-info-content">
                  <span class="psd-set-info-chip">
                    {{
                      isImageGroupPsdSet
                        ? t('material.groupTaskInfo', { groups: psdSetImageGroups.length, templates: selectedPsdTemplateIds.length, count: psdSetTaskCount })
                        : psdSetMergeSticker
                          ? t('material.mergeTaskInfo', { count: psdSetTaskCount })
                          : t('material.singleTaskInfo', { materials: ids.length, templates: selectedPsdTemplateIds.length, count: psdSetTaskCount })
                    }}
                  </span>
                  <span class="psd-set-info-chip psd-set-info-chip--subtle">
                    {{ t('material.allowedFormats') }}：{{ allowedFormatsForSelectedTemplates.join("、") }}
                  </span>
                  <span class="psd-set-info-chip psd-set-info-chip--subtle">
                    {{ t('material.automationActions') }}：{{
                      enabledPsdSetAutomationCount ? enabledPsdSetAutomationKeys.join("、") : t('material.notEnabled')
                    }}
                  </span>
                </div>
              </div>

              <div class="psd-set-mode-inline">
                <span class="psd-set-mode-label">{{ t('material.generateMode') }}:</span>
                <el-tag :type="psdSetMergeSticker ? 'success' : 'primary'" size="large">
                  {{
                    isImageGroupPsdSet
                      ? t('material.groupXTemplate')
                      : psdSetMergeSticker
                        ? t('material.mergedXTemplate')
                        : t('material.singleXTemplate')
                  }}
                </el-tag>
              </div>

              <div class="psd-set-footer-actions">
                <el-button @click="psdSetDialogVisible = false">{{ t('material.cancel') }}</el-button>
                <el-button plain @click="psdSetAutomationDialogVisible = true">
                  {{ t('material.postActions') }}{{ enabledPsdSetAutomationCount ? `(${enabledPsdSetAutomationCount})` : "" }}
                </el-button>
                <el-button type="info" plain
                  :disabled="!psdSetSelectedMaterialIds.length || !selectedPsdTemplateIds.length"
                  @click="showPsdSetParams">{{ t('material.viewSendParams') }}</el-button>
                <el-tooltip v-if="hasInvalidFormatMaterials"
                  :content="t('material.invalidFormatTooltip', { names: invalidFormatMaterialsList.map((m) => m.name).join('、') })"
                  placement="top">
                  <el-button type="primary" :disabled="!psdSetSelectedMaterialIds.length ||
                    !selectedPsdTemplateIds.length ||
                    hasInvalidFormatMaterials
                    " :loading="psdSetSubmitting" @click="handleCreatePsdSets">
                    {{ t('material.startMaking') }}
                  </el-button>
                </el-tooltip>
                <el-button v-else type="primary"
                  :disabled="!psdSetSelectedMaterialIds.length || !selectedPsdTemplateIds.length"
                  :loading="psdSetSubmitting" @click="handleCreatePsdSets">
                  {{ t('material.startMaking') }}
                </el-button>
              </div>
            </div>
          </div>
        </el-dialog>

        <el-dialog v-model="psdSetAutomationDialogVisible" fullscreen align-center append-to-body
          class="psd-set-automation-dialog">
          <template #header>
            <div class="psd-set-automation-dialog__header">
              <div>
                <div class="psd-set-automation-dialog__eyebrow">{{ t('material.optionalEnhancement') }}</div>
                <div class="psd-set-automation-dialog__title">{{ t('material.autoExecuteAfter') }}</div>
                <div class="psd-set-automation-dialog__subtitle">
                  {{ t('material.autoExecuteSubtitle') }}
                </div>
              </div>
            </div>
          </template>
          <div class="psd-set-automation-dialog-body">
            <div class="psd-set-automation-dialog__intro">
              {{ t('material.autoExecuteIntro') }}
            </div>
            <div v-for="action in psdSetAutomationActions" :key="action.key" class="psd-set-automation-item"
              :class="{ 'is-active': action.enabled }">
              <div class="psd-set-automation-head">
                <el-checkbox v-model="action.enabled">
                  {{ action.label }}
                </el-checkbox>
                <el-tag :type="action.enabled ? 'success' : 'info'" effect="plain">
                  {{ action.enabled ? t('material.enabled') : t('material.notEnabled') }}
                </el-tag>
                <span class="psd-set-automation-key">{{ action.key }}</span>
              </div>
              <div class="psd-set-automation-desc">{{ action.description }}</div>
              <div v-if="action.enabled && action.fields?.length" class="psd-set-automation-config">
                <div v-for="field in action.fields" :key="`${action.key}-${field.key}`"
                  class="psd-set-automation-field">
                  <div class="psd-set-automation-field-title">
                    <span>{{ field.label }}</span>
                    <span class="psd-set-automation-field-key">{{ field.key }}</span>
                  </div>
                  <el-input v-if="field.component === 'textarea'" v-model="action.params[field.key]" type="textarea"
                    :rows="field.rows || 2" :placeholder="field.placeholder" />
                  <div v-else-if="field.component === 'product-template-list'" class="psd-set-automation-list">
                    <div class="psd-set-automation-list__toolbar">
                      <el-input v-model="psdSetAutomationProductTemplateSearchText" size="small" clearable
                        :placeholder="t('material.searchTemplateNameType')" />
                      <el-tag size="small" type="info">
                        {{ t('material.selectedTemplates', { count: action.params[field.key]?.length || 0 }) }}
                      </el-tag>
                    </div>
                    <vxe-grid class="psd-set-automation-list__grid" border size="mini"
                      :loading="psdSetAutomationProductTemplatesLoading"
                      :data="filteredPsdSetAutomationProductTemplates" :columns="psdSetAutomationProductTemplateColumns"
                      :max-height="360" :row-config="{ keyField: 'id', isHover: true }"
                      :checkbox-config="{ checkRowKeys: action.params[field.key] || [] }" @checkbox-change="
                        (event) => handlePsdSetAutomationListCheckboxChange(action, field.key, event)
                      " @checkbox-all="
                        (event) => handlePsdSetAutomationListCheckboxChange(action, field.key, event)
                      " />
                  </div>
                  <div v-else-if="field.component === 'publish-config-list'" class="psd-set-automation-list">
                    <div class="psd-set-automation-list__toolbar">
                      <el-input v-model="psdSetAutomationPublishConfigSearchText" size="small" clearable
                        :placeholder="t('material.searchTaskConfig')" />
                      <el-tag size="small" type="info">
                        {{ t('material.selectedConfigs', { count: action.params[field.key]?.length || 0 }) }}
                      </el-tag>
                    </div>
                    <vxe-grid class="psd-set-automation-list__grid" border size="mini"
                      :loading="psdSetAutomationPublishConfigsLoading" :data="filteredPsdSetAutomationPublishConfigs"
                      :columns="psdSetAutomationPublishConfigColumns" :max-height="360"
                      :row-config="{ keyField: 'id', isHover: true }"
                      :checkbox-config="{ checkRowKeys: action.params[field.key] || [] }" @checkbox-change="
                        (event) => handlePsdSetAutomationListCheckboxChange(action, field.key, event)
                      " @checkbox-all="
                        (event) => handlePsdSetAutomationListCheckboxChange(action, field.key, event)
                      " />
                  </div>
                  <el-input v-else v-model="action.params[field.key]" :placeholder="field.placeholder" />
                </div>
              </div>
            </div>
          </div>
          <template #footer>
            <el-button @click="psdSetAutomationDialogVisible = false">{{ t('material.close') }}</el-button>
          </template>
        </el-dialog>

        <!-- 批量详细配置全屏弹窗（选中的PSD模板） -->
        <el-dialog v-model="batchDetailConfigDialogVisible" :title="t('material.detailConfigSelectedTemplates')" fullscreen append-to-body
          :destroy-on-close="true">
          <div class="batch-detail-config-content">
            <div class="batch-detail-config-header">
              <div class="batch-detail-config-title">
                <span>{{ t('material.templateTotalCount', { count: templateConfigList.length }) }}</span>
              </div>
            </div>
            <div class="batch-detail-config-body">
              <div v-for="(template, index) in templateConfigList" :key="template.id" class="template-config-row">
                <div class="template-config-left">
                  <div class="template-config-header-row">
                    <span class="template-name">{{ template.name || t('material.templateIndex', { index: index + 1 }) }}</span>
                    <el-tag :type="template.psdTemplateConfig ? 'success' : 'info'" size="small">
                      {{ template.psdTemplateConfig ? t('material.configured') : t('material.notConfigured') }}
                    </el-tag>
                  </div>
                  <div class="template-config-images">
                    <div class="config-image-item">
                      <div class="config-image-label">{{ t('material.materialImage') }}</div>
                      <div class="config-image-wrapper">
                        <template v-if="template.materialId !== undefined">
                          <!-- 单素材模式：显示单个匹配的素材图 -->
                          <img v-if="getMatchedMaterialId(index)"
                            :src="getMaterialImageUrl(getMatchedMaterialId(index))" :alt="t('material.materialImage')" class="config-image" />
                          <span v-else class="config-image-placeholder">{{ t('material.noMatchingMaterial') }}</span>
                        </template>
                        <template v-else>
                          <!-- 合并模式：显示所有素材图 -->
                          <img v-for="materialId in ids" :key="materialId" :src="getMaterialImageUrl(materialId)"
                            :alt="t('material.materialImage')" class="config-image" />
                          <span v-if="!ids.length" class="config-image-placeholder">{{ t('material.noMaterial') }}</span>
                        </template>
                      </div>
                    </div>
                    <div class="config-image-item">
                      <div class="config-image-label">{{ t('material.templateConfigImage') }}</div>
                      <div class="config-image-wrapper">
                        <img v-if="template.thumbnail" :src="getFastPreviewImageUrl(template.thumbnail, { width: 200 })"
                          :alt="template.name" class="config-image" />
                        <span v-else class="config-image-placeholder">{{ t('material.noThumbnail') }}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div class="template-config-right">
                  <div class="config-editor-toolbar">
                    <el-button @click="handleResetConfigForTemplate(index)" type="warning" :icon="RefreshLeft"
                      size="small">
                      {{ t('material.resetToDefault') }}
                    </el-button>
                  </div>
                  <el-input v-model="template.configText" type="textarea" :rows="18"
                    :placeholder='t("material.jsonConfigPlaceholder")' class="config-textarea" />
                </div>
              </div>
            </div>
          </div>
          <template #footer>
            <el-button @click="batchDetailConfigDialogVisible = false">{{ t('material.cancel') }}</el-button>
            <el-button type="primary" @click="handleSaveConfigToMemory"> {{ t('material.saveTemporary') }} </el-button>
          </template>
        </el-dialog>

        <!-- PSD模板详情弹窗 -->
        <el-dialog v-model="psdTemplateDetailDialogVisible" :title="t('material.psdTemplateDetail')" fullscreen align-center append-to-body
          :destroy-on-close="true">
          <div v-if="currentPsdTemplate" class="psd-template-detail">
            <div class="detail-layout">
              <div class="detail-left">
                <div class="detail-thumbnail">
                  <img v-if="
                    currentPsdTemplate.thumbnail ||
                    currentPsdTemplate.preview ||
                    currentPsdTemplate.image
                  " :src="getPreviewImageUrl(
                    currentPsdTemplate.thumbnail ||
                    currentPsdTemplate.preview ||
                    currentPsdTemplate.image,
                    { width: 600, quality: 90, format: 'webp' },
                  )
                    " :alt="currentPsdTemplate.name || t('material.templateThumbnail')" class="detail-thumbnail-img" loading="lazy" />
                  <div v-else class="detail-thumbnail-placeholder">{{ t('material.noThumbnail') }}</div>
                </div>
              </div>

              <div class="detail-right">
                <div class="detail-item">
                  <span class="detail-label">{{ t('material.templateName') }}：</span>
                  <span class="detail-value">{{ currentPsdTemplate.name || t('material.unnamedTemplate') }}</span>
                </div>

                <div class="detail-item">
                  <span class="detail-label">{{ t('material.description') }}：</span>
                  <span class="detail-value">{{ currentPsdTemplate.description || t('material.none') }}</span>
                </div>

                <div class="detail-item">
                  <span class="detail-label">{{ t('material.keywords') }}：</span>
                  <span class="detail-value">{{ currentPsdTemplate.keywords || t('material.none') }}</span>
                </div>

                <div v-if="currentPsdTemplate.psdTemplateConfig" class="detail-item">
                  <span class="detail-label">{{ t('material.psdConfig') }}：</span>
                  <div class="detail-value psd-config-value">
                    {{ currentPsdTemplate.psdTemplateConfig }}
                  </div>
                </div>

                <div class="detail-item">
                  <span class="detail-label">{{ t('material.remoteLink') }}：</span>
                  <div class="detail-value">
                    <el-link v-if="currentPsdTemplate.url" :href="currentPsdTemplate.url" target="_blank" type="primary"
                      underline="never">
                      {{ currentPsdTemplate.url }}
                    </el-link>
                    <span v-else class="detail-empty">{{ t('material.none') }}</span>
                  </div>
                </div>

                <div class="detail-item">
                  <span class="detail-label">{{ t('material.localPath') }}：</span>
                  <span class="detail-value">{{
                    currentPsdTemplate.windowsLocalPath || t('material.none')
                  }}</span>
                </div>
              </div>
            </div>
          </div>
          <template #footer>
            <el-button @click="psdTemplateDetailDialogVisible = false">{{ t('material.close') }}</el-button>
          </template>
        </el-dialog>
      </template>

      <template #sidebar>
        <div
          class="list-page-panel list-page-panel--flat list-page-sidebar material-index-sidebar folder-sidebar-shell">
          <div class="list-page-sidebar__body material-index-sidebar__body folder-sidebar-body">
            <div v-show="!folderTreeCollapsed" class="material-index-sidebar__tree folder-sidebar-tree">
              <FolderTree v-model="selectedStickerFolderId" width="100%" :folder-category="FOLDER_CATEGORY"
                :drag-state="dragState" @change="handleStickerFolderChange" @reloaded="loadStickerFolderTree"
                @folder-drag-over="handleFolderDragOver" @folder-drag-leave="handleFolderDragLeave"
                @folder-drop="handleFolderDrop" />
            </div>
          </div>
          <button type="button" class="material-index-sidebar__toggle folder-sidebar-toggle"
            @click="folderTreeCollapsed = !folderTreeCollapsed">
            <el-icon :size="14">
              <DArrowRight v-if="folderTreeCollapsed" />
              <DArrowLeft v-else />
            </el-icon>
          </button>
        </div>
      </template>

      <template #table>
        <div class="list-page-panel list-page-panel--flat list-page-table-panel list-page-table-panel--flat">
          <div class="list-page-table-panel__body material-index-table-panel__body">
            <div class="common-table">
              <vxe-grid class="material-dnd-grid dnd-text-selectable" ref="gridRef" v-bind="gridOptions"
                :max-height="maxHeight"
                :data="dataSource" :loading="loading" :row-class-name="materialRowClassName"
                @cell-click="handleMaterialCellClick" @checkbox-change="checkboxChange"
                @checkbox-all="checkboxAllChange">
                <template #dragHandleSlot>
                  <TableRowDragHandle />
                </template>
                <template #previewDefaultSlot="{ row }">
                  <div class="material-compact-preview"
                    :class="{ 'material-compact-preview--custom': isCustomMaterial(row) }">
                    <span v-if="isCustomMaterial(row)" class="material-compact-preview__corner">
                      {{ t('material.custom') }}
                    </span>
                    <div class="material-compact-preview__image-wrap">
                      <img v-if="row.url && !row._imageError" :key="`preview-${row.id}-${row.url}`"
                        :src="getFastPreviewImageUrl(row.url, { width: 160 })" :alt="row.name || t('material.materialImage')"
                        class="material-compact-preview__image" loading="lazy" decoding="async"
                        @error="row._imageError = true" @click="openImagePreview(row.url, row.name)" />
                      <div v-else class="material-compact-preview__empty">{{ t('material.noImage') }}</div>
                    </div>
                  </div>
                </template>

                <template #compactNameSlot="{ row }">
                  <div class="material-compact-name">
                    <div class="material-compact-name__title material-compact-name__title--wrap">
                      <span>{{ row.name || t('material.materialSpaceId', { id: row.id }) }}</span>
                    </div>
                  </div>
                </template>

                <template #shareTypeSlot="{ row }">
                  <el-tooltip v-if="row.shareType === 'shared'" :content="t('material.sharedReferenceTip')"
                    placement="top">
                    <el-tag type="warning" size="small" effect="light" style="cursor: help">
                      {{ (row.sourceUserId && String(row.sourceUserId) !== String(row.userId)) ?
                        t('material.sharedBy', { name: row.sourceUser?.name || row.sourceUser?.account || t('material.userId', { id: row.sourceUserId }) }) : t('material.share') }}
                    </el-tag>
                  </el-tooltip>
                  <el-tag
                    v-else-if="row.shareType === 'copy' || (row.sourceUserId && String(row.sourceUserId) !== String(row.userId))"
                    type="success" size="small" effect="light">
                    {{ (row.sourceUserId && String(row.sourceUserId) !== String(row.userId)) ? t('material.copiedBy', { name: row.sourceUser?.name
                      || row.sourceUser?.account || t('material.userId', { id: row.sourceUserId }) }) : t('material.copyCopy') }}
                  </el-tag>
                  <el-tag v-else type="info" size="small" effect="plain">{{ t('material.uploadedByMe') }}</el-tag>
                </template>

                <template #codeSlot="{ row }">
                  <div v-if="row.code || row.id" class="code-cell">
                    <span v-if="row.code" class="code-value code-clickable" @click.stop="handleCopyText(row.code, t('material.code'))"
                      :title="t('material.clickToCopyCode')">{{ row.code }}</span>
                    <span v-if="row.id" class="id-value id-clickable" @click.stop="handleCopyText(row.id, 'ID')"
                      :title="t('material.clickToCopyId')">#{{ row.id }}</span>
                  </div>
                  <span v-else class="table-cell-empty">-</span>
                </template>

                <template #fileInfoSlot="{ row }">
                  <div v-if="row.suffix || row.width || row.fileSize" class="file-info">
                    <span v-if="row.suffix" class="file-info__tag">
                      {{ String(row.suffix).toUpperCase() }}
                    </span>
                    <span v-if="row.fileSize" class="file-info__size">
                      {{ formatFileSize(row.fileSize) }}
                    </span>
                    <span v-if="row.width && row.height" class="file-info__resolution">
                      {{ row.width }} × {{ row.height }}
                    </span>
                    <span v-if="row.aspectRatio" class="file-info__ratio">
                      {{ Number(row.aspectRatio).toFixed(2) }}
                    </span>
                  </div>
                  <span v-else class="table-cell-empty">-</span>
                </template>

                <template #cutoutSlot="{ row }">
                  <el-tag :type="row.isCutout ? 'success' : 'info'" effect="plain" size="small" class="cutout-tag">
                    {{ row.isCutout ? t('material.yes') : t('material.no') }}
                  </el-tag>
                </template>

                <template #nameBilingualSlot="{ row }">
                  <div class="table-bilingual-cell">
                    <div class="table-bilingual-cell__item" :class="{ 'table-bilingual-cell__item--empty': !row.name }"
                      @click.stop="handleCopyText(row.name, t('material.zhName'))" role="button">
                      <span class="table-bilingual-cell__label">{{ t('material.zhLabel') }}</span>
                      <el-tooltip :content="row.name || '-'" placement="top" effect="light" :show-after="500"
                        :disabled="!(row.name && row.name.length > 0)" popper-class="text-cell-tooltip">
                        <span class="table-bilingual-cell__content">{{ row.name || "-" }}</span>
                      </el-tooltip>
                      <el-icon v-if="row.name" class="table-bilingual-cell__icon">
                        <DocumentCopy />
                      </el-icon>
                    </div>
                    <div class="table-bilingual-cell__item"
                      :class="{ 'table-bilingual-cell__item--empty': !row.nameEn }"
                      @click.stop="handleCopyText(row.nameEn, t('material.enName'))" role="button">
                      <span class="table-bilingual-cell__label">En:</span>
                      <el-tooltip :content="row.nameEn || '-'" placement="top" effect="light" :show-after="500"
                        :disabled="!(row.nameEn && row.nameEn.length > 0)" popper-class="text-cell-tooltip">
                        <span class="table-bilingual-cell__content">{{ row.nameEn || "-" }}</span>
                      </el-tooltip>
                      <el-icon v-if="row.nameEn" class="table-bilingual-cell__icon">
                        <DocumentCopy />
                      </el-icon>
                    </div>
                  </div>
                </template>

                <template #descriptionBilingualSlot="{ row }">
                  <div class="table-bilingual-cell">
                    <div class="table-bilingual-cell__item table-bilingual-cell__item--multiline"
                      :class="{ 'table-bilingual-cell__item--empty': !row.description }"
                      @click.stop="handleCopyText(row.description, t('material.zhDescription'))" role="button">
                      <span class="table-bilingual-cell__label">{{ t('material.zhLabel') }}</span>
                      <el-tooltip :content="row.description || '-'" placement="top" effect="light" :show-after="500"
                        :disabled="!(row.description && row.description.length > 0)"
                        popper-class="text-cell-tooltip">
                        <span class="table-bilingual-cell__content">
                          {{ row.description || "-" }}
                        </span>
                      </el-tooltip>
                      <el-icon v-if="row.description" class="table-bilingual-cell__icon">
                        <DocumentCopy />
                      </el-icon>
                    </div>
                    <div class="table-bilingual-cell__item table-bilingual-cell__item--multiline"
                      :class="{ 'table-bilingual-cell__item--empty': !row.descriptionEn }"
                      @click.stop="handleCopyText(row.descriptionEn, t('material.enDescription'))" role="button">
                      <span class="table-bilingual-cell__label">En:</span>
                      <el-tooltip :content="row.descriptionEn || '-'" placement="top" effect="light" :show-after="500"
                        :disabled="!(row.descriptionEn && row.descriptionEn.length > 0)"
                        popper-class="text-cell-tooltip">
                        <span class="table-bilingual-cell__content">
                          {{ row.descriptionEn || "-" }}
                        </span>
                      </el-tooltip>
                      <el-icon v-if="row.descriptionEn" class="table-bilingual-cell__icon">
                        <DocumentCopy />
                      </el-icon>
                    </div>
                  </div>
                </template>

                <template #keywordsBilingualSlot="{ row }">
                  <div class="table-bilingual-cell">
                    <div class="table-bilingual-cell__item table-bilingual-cell__item--multiline"
                      :class="{ 'table-bilingual-cell__item--empty': !row.keywords }"
                      @click.stop="handleCopyText(row.keywords, t('material.zhKeywords'))" role="button">
                      <span class="table-bilingual-cell__label">{{ t('material.zhLabel') }}</span>
                      <el-tooltip :content="row.keywords || '-'" placement="top" effect="light" :show-after="500"
                        :disabled="!(row.keywords && row.keywords.length > 0)" popper-class="text-cell-tooltip">
                        <span class="table-bilingual-cell__content">
                          {{ row.keywords || "-" }}
                        </span>
                      </el-tooltip>
                      <el-icon v-if="row.keywords" class="table-bilingual-cell__icon">
                        <DocumentCopy />
                      </el-icon>
                    </div>
                    <div class="table-bilingual-cell__item table-bilingual-cell__item--multiline"
                      :class="{ 'table-bilingual-cell__item--empty': !row.keywordsEn }"
                      @click.stop="handleCopyText(row.keywordsEn, t('material.enKeywords'))" role="button">
                      <span class="table-bilingual-cell__label">En:</span>
                      <el-tooltip :content="row.keywordsEn || '-'" placement="top" effect="light" :show-after="500"
                        :disabled="!(row.keywordsEn && row.keywordsEn.length > 0)" popper-class="text-cell-tooltip">
                        <span class="table-bilingual-cell__content">
                          {{ row.keywordsEn || "-" }}
                        </span>
                      </el-tooltip>
                      <el-icon v-if="row.keywordsEn" class="table-bilingual-cell__icon">
                        <DocumentCopy />
                      </el-icon>
                    </div>
                  </div>
                </template>

                <template #originWebSlot="{ row }">
                  <span v-if="row.originWeb" class="table-cell-text">{{ row.originWeb }}</span>
                  <span v-else class="table-cell-empty">-</span>
                </template>
                <template #sizeSlot="{ row }">
                  <span v-if="row.size" class="table-cell-text table-time-cell">{{
                    (row.size / 1024).toFixed(1) + " KB"
                  }}</span>
                  <span v-else class="table-cell-empty">-</span>
                </template>

                <template #isCustomSlot="{ row }">
                  <el-tag :type="row.isCustom ? 'success' : 'info'" size="small">
                    {{ row.isCustom ? t('material.yes') : t('material.no') }}
                  </el-tag>
                </template>

                <template #isInfringementSlot="{ row }">
                  <el-tag :type="row.isInfringement ? 'danger' : 'success'" size="small">
                    {{ row.isInfringement ? t('material.infringement') : t('material.notInfringement') }}
                  </el-tag>
                </template>

                <template #isCutoutSlot="{ row }">
                  <el-tag :type="row.isCutout ? 'success' : 'info'" size="small">
                    {{ row.isCutout ? t('material.yes') : t('material.no') }}
                  </el-tag>
                </template>

                <template #seamlessSlot="{ row }">
                  <el-tag :type="normalizeBooleanValue(row.seamless) ? 'success' : 'info'" size="small">
                    {{ normalizeBooleanValue(row.seamless) ? t('material.yes') : t('material.no') }}
                  </el-tag>
                </template>

                <template #fileSizeSlot="{ row }">
                  <span v-if="row.fileSize" class="table-cell-text table-time-cell">
                    {{ formatFileSize(row.fileSize) }}
                  </span>
                  <span v-else class="table-cell-empty">-</span>
                </template>

                <template #suitableForSlot="{ row }">
                  <div v-if="row.suitableFor" class="table-tag-list">
                    <el-tag v-for="(item, index) in (row.suitableFor || '').split(',').slice(0, 2)" :key="index"
                      size="small" type="info">
                      {{ item.trim() }}
                    </el-tag>
                    <el-tooltip v-if="(row.suitableFor || '').split(',').length > 2" :content="(row.suitableFor || '')
                      .split(',')
                      .map((item) => item.trim())
                      .join('、')
                      " placement="top" effect="dark" :show-after="200">
                      <el-tag size="small" type="info">
                        +{{ (row.suitableFor || "").split(",").length - 2 }}
                      </el-tag>
                    </el-tooltip>
                  </div>
                  <span v-else class="table-cell-empty">-</span>
                </template>

                <template #similaritySlot="{ row }">
                  <el-tag v-if="row.similarity !== undefined" :type="row.similarity >= 90 ? 'success' : row.similarity >= 70 ? 'warning' : 'info'
                    " size="small">
                    {{ row.similarity.toFixed(1) }}%
                  </el-tag>
                  <span v-else class="table-cell-empty">-</span>
                </template>

                <template #colorPaletteSlot="{ row }">
                  <div v-if="row.colorPalette" class="table-color-palette">
                    <div v-for="(color, index) in row.colorPalette.split(',').slice(0, 10)" :key="index"
                      class="table-color-swatch" :style="{ backgroundColor: color.trim() }" :title="color.trim()" />
                  </div>
                  <span v-else class="table-cell-empty">-</span>
                </template>

                <template #originUrlSlot="{ row }">
                  <el-link v-if="row.originUrl" :href="row.originUrl" target="_blank" type="primary" underline="never"
                    class="table-cell-link">
                    {{
                      row.originUrl.length > 50
                        ? row.originUrl.substring(0, 50) + "..."
                        : row.originUrl
                    }}
                  </el-link>
                  <span v-else class="table-cell-empty">-</span>
                </template>

                <template #sourceSlot="{ row }">
                  <el-link v-if="row.source && /^https?:\/\//i.test(row.source)" :href="row.source" target="_blank"
                    type="primary" underline="never" class="table-cell-link">
                    {{ row.source.length > 50 ? row.source.substring(0, 50) + "..." : row.source }}
                  </el-link>
                  <span v-else-if="row.source" class="table-cell-text table-cell-text--secondary">{{
                    row.source.length > 50 ? row.source.substring(0, 50) + "..." : row.source
                  }}</span>
                  <span v-else class="table-cell-empty">-</span>
                </template>

                <template #folderSlot="{ row }">
                  <el-tag v-if="row.folder" type="info" size="small">
                    <el-icon class="mr-4px">
                      <Folder />
                    </el-icon>
                    {{ row.folder }}
                  </el-tag>
                  <span v-else class="table-cell-empty">{{ t('material.rootDirectory') }}</span>
                </template>

                <template #operationDefaultSlot="{ row }">
                  <div class="flex items-center gap-1">
                    <el-dropdown :ref="(el) => setOperationDropdownRef(row.id, el)" class="operation-dropdown"
                      popper-class="operation-dropdown-popper" placement="bottom-end" trigger="click"
                      @visible-change="(visible) => handleOperationDropdownVisibleChange(visible, row)">
                      <el-button type="primary" link size="small" class="operation-trigger-button"
                        :loading="operationCommandLoadingId === String(row.id)">{{ t('material.operation') }}</el-button>
                      <template #dropdown>
                        <div class="op-menu" @click.stop>
                          <!-- 内容相关（仅管理员） -->
                          <div class="op-menu-item has-submenu" @mouseenter="handleSubmenuEnter"
                            @mouseleave="handleSubmenuLeave">
                            <el-icon class="op-menu-arrow">
                              <ArrowLeft />
                            </el-icon>
                            <span class="op-menu-label">{{ t('material.contentRelated') }}</span>
                            <div class="op-submenu" data-submenu="content" @mouseenter="handleSubmenuKeepVisible"
                              @mouseleave="handleSubmenuHide">
                              <div class="op-submenu-item" @click.stop="handleOperationCommand('ai-generate', row)">
                                {{ t('material.aiAutoGenerateContent') }}
                              </div>
                              <div class="op-submenu-item"
                                @click.stop="handleOperationCommand('generate-image-info', row)">
                                {{ t('material.generateImageInfo') }}
                              </div>
                              <div class="op-submenu-item" @click.stop="handleOperationCommand('story-script', row)">
                                {{ t('material.generateStoryScript') }}
                              </div>
                              <div class="op-submenu-item" @click.stop="handleOperationCommand('view-meta', row)">
                                {{ t('material.viewMetaData') }}
                              </div>
                            </div>
                          </div>

                          <!-- 制作操作 -->
                          <div class="op-menu-item has-submenu" @mouseenter="handleSubmenuEnter"
                            @mouseleave="handleSubmenuLeave">
                            <el-icon class="op-menu-arrow">
                              <ArrowLeft />
                            </el-icon>
                            <span class="op-menu-label">{{ t('material.make') }}</span>
                            <div class="op-submenu" data-submenu="design" @mouseenter="handleSubmenuKeepVisible"
                              @mouseleave="handleSubmenuHide">
                              <div class="op-submenu-item" @click.stop="handleOperationCommand('create-ps-set', row)">
                                {{ t('material.createPsSet') }}
                              </div>
                              <div class="op-submenu-item" @click.stop="handleOperationCommand('view-ps-sets', row)">
                                {{ t('material.viewMaterialPsSets') }}
                              </div>
                            </div>
                          </div>

                          <!-- 图片操作 -->
                          <div class="op-menu-item has-submenu" @mouseenter="handleSubmenuEnter"
                            @mouseleave="handleSubmenuLeave">
                            <el-icon class="op-menu-arrow">
                              <ArrowLeft />
                            </el-icon>
                            <span class="op-menu-label">{{ t('material.imageOperations') }}</span>
                            <div class="op-submenu" data-submenu="image" @mouseenter="handleSubmenuKeepVisible"
                              @mouseleave="handleSubmenuHide">
                              <div class="op-submenu-item" @click.stop="handleOperationCommand('download', row)">
                                {{ t('material.download') }}
                              </div>
                              <div class="op-submenu-item"
                                @click.stop="handleOperationCommand('download-rotated-90', row)">
                                {{ t('material.downloadRotated90') }}
                              </div>
                              <div v-if="isAdmin" class="op-submenu-item"
                                @click.stop="handleOperationCommand('copy', row)">
                                {{ t('material.copy') }}
                              </div>
                              <div class="op-submenu-item" @click.stop="handleOperationCommand('copy-origin-url', row)">
                                {{ t('material.copyOriginUrl') }}
                              </div>
                              <div v-if="!visualSimilarSearchDisabled" class="op-submenu-item"
                                @click.stop="handleOperationCommand('find-similar', row)">
                                {{ t('material.findSimilarImages') }}
                              </div>
                              <div class="op-submenu-item"
                                @click.stop="handleOperationCommand('view-publish-usage', row)">
                                {{ t('material.viewPublishBinding') }}
                              </div>
                              <div v-if="isAdmin && (row.suffix || '').toLowerCase() === 'png'" class="op-submenu-item"
                                @click.stop="handleOperationCommand('trim-png', row)">
                                {{ t('material.generateNoBlankPng') }}
                              </div>
                              <div v-if="isAdmin && (row.suffix || '').toLowerCase() === 'svg'" class="op-submenu-item"
                                @click.stop="handleOperationCommand('svg-to-png', row)">
                                {{ t('material.svgToPng') }}
                              </div>
                            </div>
                          </div>

                          <div class="op-menu-item has-submenu" @mouseenter="handleSubmenuEnter"
                            @mouseleave="handleSubmenuLeave">
                            <el-icon class="op-menu-arrow">
                              <ArrowLeft />
                            </el-icon>
                            <span class="op-menu-label">{{ t('material.ownershipOperations') }}</span>
                            <div class="op-submenu" data-submenu="ownership" @mouseenter="handleSubmenuKeepVisible"
                              @mouseleave="handleSubmenuHide">
                              <div class="op-submenu-item" @click.stop="handleOperationCommand('share-to-user', row)">
                                {{ t('material.share') }}
                              </div>
                              <div class="op-submenu-item" @click.stop="handleOperationCommand('copy-to-user', row)">
                                {{ t('material.copyCopy') }}
                              </div>
                              <div class="op-submenu-item" @click.stop="handleOperationCommand('move-to-user', row)">
                                {{ t('material.transferAll') }}
                              </div>
                            </div>
                          </div>

                          <div class="op-menu-item" @click.stop="handleOperationCommand('view-shared', row)">
                            <el-icon>
                              <Connection />
                            </el-icon>
                            <span>{{ t('material.viewShare') }}</span>
                          </div>

                          <!-- 图片裂变和视频制作 -->
                          <div class="op-menu-item has-submenu" @mouseenter="handleSubmenuEnter"
                            @mouseleave="handleSubmenuLeave">
                            <el-icon class="op-menu-arrow">
                              <ArrowLeft />
                            </el-icon>
                            <span class="op-menu-label">{{ t('material.makeTools') }}</span>
                            <div class="op-submenu" data-submenu="production" @mouseenter="handleSubmenuKeepVisible"
                              @mouseleave="handleSubmenuHide">
                              <div class="op-submenu-item" @click.stop="handleOperationCommand('image-process', row)">
                                {{ t('material.imageProcess') }}
                              </div>
                              <div class="op-submenu-item" @click.stop="handleOperationCommand('image-split', row)">
                                {{ t('material.imageSplit') }}
                              </div>
                              <div class="op-submenu-item"
                                @click.stop="handleOperationCommand('video-production', row)">
                                {{ t('material.videoProduction') }}
                              </div>
                            </div>
                          </div>

                          <div class="op-divider"></div>
                          <div class="op-menu-item" @click.stop="handleOperationCommand('view-detail', row)">
                            <span class="op-menu-arrow-placeholder"></span>
                            <span class="op-menu-label">{{ t('material.viewDetail') }}</span>
                          </div>

                          <div class="op-divider"></div>
                          <div class="op-menu-item" @click.stop="handleOperationCommand('edit', row)">
                            <span class="op-menu-arrow-placeholder"></span>
                            <span class="op-menu-label">{{ t('material.edit') }}</span>
                          </div>
                          <div class="op-menu-item danger" @click.stop="handleOperationCommand('delete', row)">
                            <span class="op-menu-arrow-placeholder"></span>
                            <span class="op-menu-label">{{ t('material.delete') }}</span>
                          </div>
                        </div>
                      </template>
                    </el-dropdown>

                    <el-icon v-if="aiTableLoading?.[row?.id]" class="is-loading ml-2"
                      style=" font-size: 18px;color: var(--el-color-primary)" />
                  </div>
                </template>
              </vxe-grid>
            </div>
          </div>
        </div>
      </template>

      <template #pagination>
        <div
          class="list-page-panel list-page-panel--flat list-page-table-panel__pagination list-page-table-panel__pagination--flat material-index-pagination">
          <pagination v-model:page="queryParams.currentPage" v-model:limit="queryParams.pageSize" :total="total"
            @pagination="handlePagination" />
        </div>
      </template>
    </ListPageLayout>

    <el-dialog v-model="addToGroupDialogVisible" :title="t('material.addToGroup')" width="520px" append-to-body destroy-on-close>
      <el-form label-width="88px" @submit.prevent="submitBatchAddToGroup">
        <el-form-item :label="t('material.selectedMaterials')">
          <el-tag type="info" effect="plain">{{ t('material.imageCount', { count: selectedGroupStickerIds.length }) }}</el-tag>
        </el-form-item>

        <el-form-item :label="t('material.addMethod')">
          <el-radio-group v-model="addToGroupMode">
            <el-radio-button value="existing">{{ t('material.existingGroups') }}</el-radio-button>
            <el-radio-button value="new">{{ t('material.newGroup') }}</el-radio-button>
          </el-radio-group>
        </el-form-item>

        <el-form-item v-if="addToGroupMode === 'existing'" :label="t('material.targetGroup')" required>
          <el-select v-model="targetGroupValue" :loading="availableGroupsLoading" :placeholder="t('material.selectExistingGroup')" filterable
            clearable style="width: 100%">
            <el-option v-for="group in availableGroupList" :key="group.id"
              :label="`${group.name} (${group.stickersCount || 0})`" :value="group.id" />
          </el-select>
        </el-form-item>

        <el-form-item v-else :label="t('material.groupName')" required>
          <el-input v-model="newGroupName" maxlength="255" show-word-limit clearable :placeholder="t('material.enterNewGroupName')"
            @keyup.enter="submitBatchAddToGroup" />
        </el-form-item>

        <el-form-item v-if="addToGroupMode === 'existing' && selectedTargetGroup" :label="t('material.existingImages')">
          <div class="add-to-group-preview">
            <div v-if="selectedTargetGroup.stickers.length" class="add-to-group-preview__grid">
              <el-image v-for="sticker in selectedTargetGroup.stickers" :key="sticker.id" :src="sticker.url || ''"
                fit="cover" class="add-to-group-preview__image"
                :preview-src-list="getGroupPreviewUrls(selectedTargetGroup)" preview-teleported />
            </div>
            <span v-else class="table-cell-empty">{{ t('material.noImages') }}</span>
          </div>
        </el-form-item>

      </el-form>

      <template #footer>
        <el-button @click="addToGroupDialogVisible = false">{{ t('material.cancel') }}</el-button>
        <el-button type="primary" :loading="addingToGroup" :disabled="!canSubmitAddToGroup"
          @click="submitBatchAddToGroup">
          {{ addToGroupMode === "new" ? t('material.createGroup') : t('material.addCount', { count: selectedGroupStickerIds.length }) }}
        </el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="similarImageDialogVisible" :title="t('material.fuzzySearch')" width="560px" align-center :destroy-on-close="false"
      class="similar-image-search-dialog" @closed="resetSimilarImageDialog">
      <div class="similar-image-search">
        <el-tabs v-model="similarImageSearchTab" class="similar-image-search__tabs">
          <el-tab-pane :label="t('material.textSearch')" name="text">
            <div class="similar-image-search__section">
              <el-input v-model="similarImageSearchText" :placeholder="t('material.textSearchPlaceholder')" clearable
                @keyup.enter="submitSimilarImageSearch" />
            </div>
          </el-tab-pane>
          <el-tab-pane :label="t('material.imageUrl')" name="url">
            <div class="similar-image-search__section">
              <el-input v-model="similarImageUrl" :placeholder="t('material.imageUrlPlaceholder')" clearable
                @keyup.enter="submitSimilarImageSearch" />
            </div>
          </el-tab-pane>
          <el-tab-pane :label="t('material.localImage')" name="file">
            <div class="similar-image-search__section">
              <el-upload class="similar-image-upload" drag action="#" accept="image/*" :auto-upload="false"
                :show-file-list="false" :on-change="handleSimilarImageUploadChange">
                <el-icon class="similar-image-upload__icon">
                  <UploadFilled />
                </el-icon>
                <div class="similar-image-upload__text">{{ t('material.dragImageHere') }}</div>
              </el-upload>
              <div v-if="similarImageFileName" class="similar-image-file-name">
                {{ similarImageFileName }}
              </div>
            </div>
          </el-tab-pane>
        </el-tabs>

        <div class="similar-image-search__options">
          <div class="similar-image-search__option-item">
            <span class="similar-image-search__option-label">{{ t('material.searchCount') }}：</span>
            <el-input-number v-model="similarImageSearchLimit" size="small" :min="1" :max="200"
              controls-position="right" style="width: 100px" />
          </div>
        </div>

        <div v-if="similarImageSearchTab !== 'text'" class="similar-image-preview">
          <div class="similar-image-preview__title">{{ t('material.queryImage') }}</div>
          <div v-if="similarImagePreviewSrc" class="similar-image-preview__frame">
            <img :src="similarImagePreviewSrc" :alt="t('material.queryImagePreview')" />
          </div>
          <div v-else class="similar-image-preview__empty">
            <el-icon>
              <PictureFilled />
            </el-icon>
            <span>{{ t('material.waitingForImage') }}</span>
          </div>
        </div>
      </div>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="similarImageDialogVisible = false">{{ t('material.cancel') }}</el-button>
          <el-button type="primary" :loading="similarImageSubmitting" @click="submitSimilarImageSearch">
            {{ t('material.search') }}
          </el-button>
        </div>
      </template>
    </el-dialog>

    <el-dialog v-model="uploadModalVisible" :title="t('material.materialUpload')" fullscreen :footer="false"
      :destroy-on-close="false" class="material-upload-dialog" @close="uploadModalClose">
      <div class="material-upload-dialog__content">
        <list-upload :current-upload-info="currentUploadInfo" @single-file-uploaded="singleFileUploaded" />
      </div>
    </el-dialog>

    <!-- URL上传弹窗 -->
    <el-dialog v-model="urlUploadModalVisible" :title="t('material.urlUploadMaterial')" width="480px" align-center class="url-upload-dialog"
      :destroy-on-close="true" @close="resetUrlUploadForm">
      <el-form ref="urlUploadFormRef" :model="urlUploadForm" :rules="urlUploadFormRules" label-position="top">
        <el-form-item :label="t('material.imageUrl')" prop="url">
          <el-input v-model="urlUploadForm.url" :placeholder="t('material.enterFullImageUrl')" clearable />
        </el-form-item>
        <el-form-item :label="t('material.fileName')" prop="name">
          <el-input v-model="urlUploadForm.name" :placeholder="t('material.enterFileName')" clearable />
        </el-form-item>
        <el-form-item :label="t('material.aiGenerate')">
          <el-switch v-model="urlUploadForm.useAiGenerate" :active-text="t('material.useAiAutoGenerate')" />
        </el-form-item>
      </el-form>

      <!-- 预览区域 -->
      <div class="preview-section">
        <div class="preview-label">{{ t('material.imagePreview') }}</div>
        <div v-if="urlUploadForm.url && urlPreviewVisible" class="image-preview">
          <img :src="urlUploadForm.url" :alt="t('material.previewImage')" class="preview-image" loading="lazy" @error="handlePreviewError"
            @load="handlePreviewLoad" />
          <div v-if="imageInfo" class="image-info">
            <el-tag size="small" type="info">{{ t('material.size') }}: {{ imageInfo.width }} × {{ imageInfo.height }}</el-tag>
          </div>
        </div>
        <div v-else-if="urlUploadForm.url && !urlPreviewVisible" class="preview-error">
          <el-icon size="28" color="#f56c6c">
            <PictureFilled />
          </el-icon>
          <p>{{ t('material.previewLoadFailed') }}</p>
        </div>
        <div v-else class="preview-placeholder">
          <el-icon size="28" color="#c0c4cc">
            <PictureFilled />
          </el-icon>
          <p>{{ t('material.enterUrlForPreview') }}</p>
        </div>
      </div>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="urlUploadModalVisible = false">{{ t('material.cancel') }}</el-button>
          <el-button type="primary" :loading="urlUploadLoading" @click="handleUrlUpload">{{ t('material.upload') }}</el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 制作设计模型弹窗 -->

    <el-dialog v-model="editDialogVisible" :title="t('material.editMaterialInfo')" fullscreen :destroy-on-close="true"
      class="edit-material-dialog">
      <div class="edit-material-body">
        <el-form :model="editForm" label-position="top" size="small" class="edit-form material-index-search-form">
          <section class="edit-section">
            <div class="edit-section-title">{{ t('material.basicInfo') }}</div>
            <el-row :gutter="12">
              <el-col :xs="24" :md="12">
                <el-form-item :label="t('material.name')">
                  <el-input v-model="editForm.name" :placeholder="t('material.enterName')" clearable />
                </el-form-item>
              </el-col>
              <el-col :xs="24" :md="12">
                <el-form-item :label="t('material.enName')">
                  <el-input v-model="editForm.nameEn" :placeholder="t('material.enterEnName')" clearable />
                </el-form-item>
              </el-col>
              <el-col :xs="24">
                <el-form-item :label="t('material.description')">
                  <el-input v-model="editForm.description" type="textarea" :rows="4" :placeholder="t('material.enterDescription')"
                    maxlength="1000" show-word-limit />
                </el-form-item>
              </el-col>
              <el-col :xs="24">
                <el-form-item :label="t('material.enDescription')">
                  <el-input v-model="editForm.descriptionEn" type="textarea" :rows="4" :placeholder="t('material.enterEnDescription')"
                    maxlength="1000" show-word-limit />
                </el-form-item>
              </el-col>
              <el-col :xs="24" :md="12">
                <el-form-item :label="t('material.keywords')">
                  <el-input v-model="editForm.keywords" :placeholder="t('material.enterKeywords')" clearable />
                </el-form-item>
              </el-col>
              <el-col :xs="24" :md="12">
                <el-form-item :label="t('material.enKeywords')">
                  <el-input v-model="editForm.keywordsEn" :placeholder="t('material.enterEnKeywords')" clearable />
                </el-form-item>
              </el-col>
              <el-col :xs="24" :md="12">
                <el-form-item :label="t('material.suitableScene')">
                  <el-input v-model="editForm.suitableFor" :placeholder="t('material.enterSuitableScene')"
                    clearable />
                </el-form-item>
              </el-col>
            </el-row>
          </section>

          <section class="edit-section">
            <div class="edit-section-title">{{ t('material.statusAndAttributes') }}</div>
            <el-row :gutter="12">
              <el-col :xs="12" :sm="8" :lg="4">
                <el-form-item :label="t('material.custom')">
                  <el-switch v-model="editForm.isCustom" size="small" :active-text="t('material.yes')" :inactive-text="t('material.no')" />
                </el-form-item>
              </el-col>
              <el-col :xs="12" :sm="8" :lg="4">
                <el-form-item :label="t('material.isPublic')">
                  <el-switch v-model="editForm.isPublic" size="small" :active-text="t('material.yes')" :inactive-text="t('material.no')" />
                </el-form-item>
              </el-col>
              <el-col :xs="12" :sm="8" :lg="4">
                <el-form-item :label="t('material.isTexture')">
                  <el-switch v-model="editForm.isTexture" size="small" :active-text="t('material.yes')" :inactive-text="t('material.no')" />
                </el-form-item>
              </el-col>
              <el-col :xs="12" :sm="8" :lg="4">
                <el-form-item :label="t('material.cutout')">
                  <el-switch v-model="editForm.isCutout" size="small" :active-text="t('material.yes')" :inactive-text="t('material.no')" />
                </el-form-item>
              </el-col>
              <el-col :xs="12" :sm="8" :lg="4">
                <el-form-item :label="t('material.seamless')">
                  <el-switch v-model="editForm.seamless" size="small" :active-text="t('material.yes')" :inactive-text="t('material.no')" />
                </el-form-item>
              </el-col>
              <el-col :xs="12" :sm="8" :lg="4">
                <el-form-item :label="t('material.infringement')">
                  <el-select v-model="editForm.isInfringement" :placeholder="t('material.pleaseSelect')" style="width: 100%">
                    <el-option :label="t('material.notInfringement')" :value="false" />
                    <el-option :label="t('material.infringement')" :value="true" />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :xs="24" :md="12">
                <el-form-item :label="t('material.materialCode')">
                  <el-input v-model="editForm.code" :placeholder="t('material.codeFormat')" clearable maxlength="14">
                    <template #append>
                      <el-button size="small" :loading="generatingCode"
                        @click="handleGenerateMaterialCode">{{ t('material.generateCode') }}</el-button>
                    </template>
                  </el-input>
                </el-form-item>
              </el-col>
              <el-col :xs="24" :md="12">
                <el-form-item :label="t('material.fileSuffix')">
                  <el-input v-model="editForm.suffix" :placeholder="t('material.suffixPlaceholder')" clearable maxlength="20" />
                </el-form-item>
              </el-col>
            </el-row>
          </section>

          <section class="edit-section">
            <div class="edit-section-title">{{ t('material.metaInfoReadonly') }}</div>
            <el-row :gutter="12">
              <el-col :xs="24" :sm="12" :lg="8">
                <el-form-item :label="t('material.imageSize')">
                  <el-input :value="editForm.width && editForm.height
                    ? `${editForm.width} × ${editForm.height}`
                    : '-'
                    " disabled />
                </el-form-item>
              </el-col>
              <el-col :xs="24" :sm="12" :lg="8">
                <el-form-item :label="t('material.aspectRatio')">
                  <el-input :value="editForm.aspectRatio ? editForm.aspectRatio.toFixed(4) : '-'" disabled />
                </el-form-item>
              </el-col>
              <el-col :xs="24" :sm="12" :lg="8">
                <el-form-item :label="t('material.fileSize')">
                  <el-input :value="editForm.fileSize ? formatFileSize(editForm.fileSize) : '-'" disabled />
                </el-form-item>
              </el-col>
              <el-col :xs="24" :md="12">
                <el-form-item :label="t('material.colorPalette')">
                  <el-input :value="editForm.colorPalette || '-'" disabled :placeholder="t('material.autoGenerate')" />
                </el-form-item>
              </el-col>
              <el-col :xs="24" :md="12">
                <el-form-item :label="t('material.phash')">
                  <el-input :value="editForm.phash || '-'" disabled :placeholder="t('material.autoGenerate')" />
                </el-form-item>
              </el-col>
            </el-row>
          </section>

          <section class="edit-section">
            <div class="edit-section-title">{{ t('material.sourceInfo') }}</div>
            <el-row :gutter="12">
              <el-col :xs="24">
                <el-form-item :label="t('material.originUrl')">
                  <el-input v-model="editForm.originUrl" :placeholder="t('material.enterOriginUrl')" clearable />
                </el-form-item>
              </el-col>
              <el-col :xs="24">
                <el-form-item :label="t('material.source')">
                  <el-input v-model="editForm.source" :placeholder="t('material.enterSource')" clearable />
                </el-form-item>
              </el-col>
            </el-row>
          </section>
        </el-form>
      </div>
      <template #footer>
        <div class="edit-dialog-footer">
          <el-button size="small" @click="editDialogVisible = false">{{ t('material.cancel') }}</el-button>
          <el-button size="small" type="primary" :loading="editLoading" @click="submitEdit">{{ t('material.save') }}</el-button>
        </div>
      </template>
    </el-dialog>

    <el-dialog v-model="detailDialogVisible" :title="t('material.materialDetail')" fullscreen :destroy-on-close="true"
      class="material-detail-dialog">
      <div v-loading="detailDialogLoading" class="material-detail-body">
        <el-empty v-if="!stickerDetailCurrent && !detailDialogLoading" :description="t('material.noMaterialDetail')" />
        <template v-else-if="stickerDetailCurrent">
          <section class="material-detail-hero">
            <div class="material-detail-preview">
              <el-image v-if="stickerDetailCurrent.url" :src="stickerDetailCurrent.url" fit="contain"
                :preview-src-list="[stickerDetailCurrent.url]" :preview-teleported="true">
                <template #error>
                  <div class="material-detail-preview__empty">{{ t('material.imageLoadFailed') }}</div>
                </template>
              </el-image>
              <div v-else class="material-detail-preview__empty">{{ t('material.noImage') }}</div>
            </div>
            <div class="material-detail-summary">
              <div class="material-detail-title">
                {{ stickerDetailCurrent.name || stickerDetailCurrent.code || stickerDetailCurrent.id || t('material.unnamedMaterial') }}
              </div>
              <div class="material-detail-subtitle">
                {{ stickerDetailCurrent.nameEn || stickerDetailCurrent.description || t('material.noEnNameOrDescription') }}
              </div>
              <div class="material-detail-tags">
                <el-tag v-if="stickerDetailCurrent.code" size="small" effect="plain">
                  {{ stickerDetailCurrent.code }}
                </el-tag>
                <el-tag v-if="stickerDetailCurrent.suffix" size="small" type="info" effect="plain">
                  {{ stickerDetailCurrent.suffix }}
                </el-tag>
                <el-tag v-if="stickerDetailCurrent.isInfringement" size="small" type="danger" effect="plain">
                  {{ t('material.infringement') }}
                </el-tag>
                <el-tag v-if="stickerDetailCurrent.isCutout" size="small" type="success" effect="plain">
                  {{ t('material.cutout') }}
                </el-tag>
                <el-tag v-if="normalizeBooleanValue(stickerDetailCurrent.seamless)" size="small" type="warning"
                  effect="plain">
                  {{ t('material.seamless') }}
                </el-tag>
              </div>
              <div class="material-detail-actions">
                <el-button size="small" :disabled="!stickerDetailCurrent.url"
                  @click="handleCopyText(stickerDetailCurrent.url || '', t('material.imageLink'))">
                  {{ t('material.copyImageLink') }}
                </el-button>
                <el-button size="small" :disabled="!stickerDetailCurrent.phash"
                  @click="handleCopyText(stickerDetailCurrent.phash || '', t('material.phash'))">
                  {{ t('material.copyPhash') }}
                </el-button>
                <el-button size="small" :disabled="!stickerDetailCurrent.originUrl"
                  @click="handleCopyText(stickerDetailCurrent.originUrl || '', t('material.originUrl'))">
                  {{ t('material.copyOriginUrl') }}
                </el-button>
              </div>
            </div>
          </section>

          <section class="material-detail-section">
            <div class="material-detail-section__title">{{ t('material.basicInfo') }}</div>
            <div class="material-detail-grid">
              <div class="material-detail-field">
                <span class="material-detail-label">ID</span>
                <span class="material-detail-value">{{ formatDetailValue(stickerDetailCurrent.id) }}</span>
              </div>
              <div class="material-detail-field">
                <span class="material-detail-label">{{ t('material.materialCode') }}</span>
                <span class="material-detail-value">{{ formatDetailValue(stickerDetailCurrent.code) }}</span>
              </div>
              <div class="material-detail-field">
                <span class="material-detail-label">{{ t('material.fileSuffix') }}</span>
                <span class="material-detail-value">{{ formatDetailValue(stickerDetailCurrent.suffix) }}</span>
              </div>
              <div class="material-detail-field">
                <span class="material-detail-label">{{ t('material.group') }}</span>
                <span class="material-detail-value">{{ formatDetailValue(stickerDetailCurrent.group) }}</span>
              </div>
              <div class="material-detail-field">
                <span class="material-detail-label">{{ t('material.uploader') }}</span>
                <span class="material-detail-value">{{ getDetailUploaderLabel(stickerDetailCurrent) }}</span>
              </div>
              <div class="material-detail-field">
                <span class="material-detail-label">{{ t('material.ownerUserId') }}</span>
                <span class="material-detail-value">{{ formatDetailValue(stickerDetailCurrent.userId) }}</span>
              </div>
              <div class="material-detail-field">
                <span class="material-detail-label">{{ t('material.folderId') }}</span>
                <span class="material-detail-value">{{ formatDetailValue(stickerDetailCurrent.folderId) }}</span>
              </div>
              <div class="material-detail-field">
                <span class="material-detail-label">{{ t('material.folderPath') }}</span>
                <span class="material-detail-value">{{ formatDetailValue(stickerDetailCurrent.folder ||
                  stickerDetailCurrent.folderEntity?.path) }}</span>
              </div>
            </div>
          </section>

          <section class="material-detail-section">
            <div class="material-detail-section__title">{{ t('material.copywritingInfo') }}</div>
            <div class="material-detail-grid">
              <div class="material-detail-field">
                <span class="material-detail-label">{{ t('material.name') }}</span>
                <span class="material-detail-value">{{ formatDetailValue(stickerDetailCurrent.name) }}</span>
              </div>
              <div class="material-detail-field">
                <span class="material-detail-label">{{ t('material.enName') }}</span>
                <span class="material-detail-value">{{ formatDetailValue(stickerDetailCurrent.nameEn) }}</span>
              </div>
              <div class="material-detail-field material-detail-field--wide">
                <span class="material-detail-label">{{ t('material.description') }}</span>
                <span class="material-detail-value material-detail-value--multiline">{{
                  formatDetailValue(stickerDetailCurrent.description) }}</span>
              </div>
              <div class="material-detail-field material-detail-field--wide">
                <span class="material-detail-label">{{ t('material.enDescription') }}</span>
                <span class="material-detail-value material-detail-value--multiline">{{
                  formatDetailValue(stickerDetailCurrent.descriptionEn) }}</span>
              </div>
              <div class="material-detail-field material-detail-field--wide">
                <span class="material-detail-label">{{ t('material.keywords') }}</span>
                <span class="material-detail-value material-detail-value--multiline">{{
                  formatDetailValue(stickerDetailCurrent.keywords) }}</span>
              </div>
              <div class="material-detail-field material-detail-field--wide">
                <span class="material-detail-label">{{ t('material.enKeywords') }}</span>
                <span class="material-detail-value material-detail-value--multiline">{{
                  formatDetailValue(stickerDetailCurrent.keywordsEn) }}</span>
              </div>
              <div class="material-detail-field material-detail-field--wide">
                <span class="material-detail-label">{{ t('material.suitableScene') }}</span>
                <span class="material-detail-value material-detail-value--multiline">{{
                  formatDetailValue(stickerDetailCurrent.suitableFor) }}</span>
              </div>
            </div>
          </section>

          <section class="material-detail-section">
            <div class="material-detail-section__title">{{ t('material.imageInfo') }}</div>
            <div class="material-detail-grid">
              <div class="material-detail-field">
                <span class="material-detail-label">{{ t('material.imageSize') }}</span>
                <span class="material-detail-value">
                  {{
                    stickerDetailCurrent.width && stickerDetailCurrent.height
                      ? `${stickerDetailCurrent.width} × ${stickerDetailCurrent.height}`
                      : "-"
                  }}
                </span>
              </div>
              <div class="material-detail-field">
                <span class="material-detail-label">{{ t('material.aspectRatio') }}</span>
                <span class="material-detail-value">{{ formatAspectRatio(stickerDetailCurrent.aspectRatio) }}</span>
              </div>
              <div class="material-detail-field">
                <span class="material-detail-label">{{ t('material.fileSize') }}</span>
                <span class="material-detail-value">{{ formatDetailFileSize(stickerDetailCurrent.fileSize) }}</span>
              </div>
              <div class="material-detail-field">
                <span class="material-detail-label">{{ t('material.colorPalette') }}</span>
                <span class="material-detail-value">
                  <span v-if="stickerDetailCurrent.colorPalette" class="material-detail-palette">
                    <span v-for="color in stickerDetailCurrent.colorPalette.split(',').slice(0, 12)" :key="color"
                      class="material-detail-swatch" :style="{ backgroundColor: color.trim() }" :title="color.trim()" />
                  </span>
                  <span v-else>-</span>
                </span>
              </div>
              <div class="material-detail-field material-detail-field--wide">
                <span class="material-detail-label">{{ t('material.imageLink') }}</span>
                <span class="material-detail-value material-detail-value--break">{{
                  formatDetailValue(stickerDetailCurrent.url)
                }}</span>
              </div>
              <div class="material-detail-field material-detail-field--wide">
                <span class="material-detail-label">{{ t('material.originUrl') }}</span>
                <span class="material-detail-value material-detail-value--break">{{
                  formatDetailValue(stickerDetailCurrent.originUrl) }}</span>
              </div>
              <div class="material-detail-field material-detail-field--wide">
                <span class="material-detail-label">{{ t('material.source') }}</span>
                <span class="material-detail-value material-detail-value--break">{{
                  formatDetailValue(stickerDetailCurrent.source) }}</span>
              </div>
              <div class="material-detail-field material-detail-field--wide">
                <span class="material-detail-label">{{ t('material.phash') }}</span>
                <span class="material-detail-value material-detail-value--break">{{
                  formatDetailValue(stickerDetailCurrent.phash) }}</span>
              </div>
            </div>
          </section>

          <section class="material-detail-section">
            <div class="material-detail-section__title">{{ t('material.statusAndTime') }}</div>
            <div class="material-detail-grid">
              <div class="material-detail-field">
                <span class="material-detail-label">{{ t('material.public') }}</span>
                <span class="material-detail-value">{{ formatBooleanDetail(stickerDetailCurrent.isPublic) }}</span>
              </div>
              <div class="material-detail-field">
                <span class="material-detail-label">{{ t('material.texture') }}</span>
                <span class="material-detail-value">{{ formatBooleanDetail(stickerDetailCurrent.isTexture) }}</span>
              </div>
              <div class="material-detail-field">
                <span class="material-detail-label">{{ t('material.custom') }}</span>
                <span class="material-detail-value">{{ formatBooleanDetail(stickerDetailCurrent.isCustom) }}</span>
              </div>
              <div class="material-detail-field">
                <span class="material-detail-label">{{ t('material.infringement') }}</span>
                <span class="material-detail-value">{{ formatBooleanDetail(stickerDetailCurrent.isInfringement)
                }}</span>
              </div>
              <div class="material-detail-field">
                <span class="material-detail-label">{{ t('material.cutout') }}</span>
                <span class="material-detail-value">{{ formatBooleanDetail(stickerDetailCurrent.isCutout) }}</span>
              </div>
              <div class="material-detail-field">
                <span class="material-detail-label">{{ t('material.seamless') }}</span>
                <span class="material-detail-value">{{ formatBooleanDetail(stickerDetailCurrent.seamless) }}</span>
              </div>
              <div class="material-detail-field">
                <span class="material-detail-label">{{ t('material.createTime') }}</span>
                <span class="material-detail-value">{{ formatDetailDate(stickerDetailCurrent.createTime) }}</span>
              </div>
              <div class="material-detail-field">
                <span class="material-detail-label">{{ t('material.updateTime') }}</span>
                <span class="material-detail-value">{{ formatDetailDate(stickerDetailCurrent.updateTime) }}</span>
              </div>
            </div>
          </section>

          <section class="material-detail-section">
            <div class="material-detail-section__title">{{ t('material.metaData') }}</div>
            <vue-json-pretty v-if="parsedDetailMetaData" :data="parsedDetailMetaData" />
            <pre v-else class="material-detail-raw">{{ formatDetailValue(stickerDetailCurrent.meta, t('material.noMetaData')) }}</pre>
          </section>

          <section class="material-detail-section">
            <div class="material-detail-section__title">{{ t('material.fullDetailJson') }}</div>
            <vue-json-pretty :data="stickerDetailJsonData" />
          </section>
        </template>
      </div>
      <template #footer>
        <div class="edit-dialog-footer">
          <el-button size="small" @click="detailDialogVisible = false">{{ t('material.close') }}</el-button>
        </div>
      </template>
    </el-dialog>

    <el-dialog v-model="aiGenDialogVisible" :title="t('material.aiAutoGenerateContent')" width="1000px" align-center :destroy-on-close="true">
      <div class="ai-gen-form">
        <div class="form-section">
          <label class="section-label">{{ t('material.rawInfo') }}</label>
          <div class="section-desc">{{ t('material.rawInfoDesc') }}</div>
          <el-input v-model="aiGenerateRawInfo" type="textarea" :rows="10" :placeholder="t('material.rawInfoPlaceholder')"
            style=" width: 100%; min-height: 200px;font-size: 14px; resize: vertical" />
        </div>

        <div class="form-section">
          <label class="section-label">{{ t('material.analysisStyle') }}</label>
          <div class="section-desc">{{ t('material.analysisStyleDesc') }}</div>
          <el-input v-model="aiGenPrompt" type="textarea" :rows="10" :placeholder="t('material.analysisStylePlaceholder')"
            style=" width: 100%; min-height: 200px;font-size: 14px; resize: vertical" />
        </div>
      </div>
      <template #footer>
        <el-button @click="aiGenDialogVisible = false">{{ t('material.cancel') }}</el-button>
        <el-button type="primary" :loading="aiGenDialogLoading" @click="submitAiGenDialog">{{ t('material.confirm') }}</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="metaDialogVisible" fullscreen :title="t('material.metaDataDetail')" :close-on-click-modal="false">
      <div v-if="metaDialogContent">
        <vue-json-pretty v-if="parsedMetaData" :data="parsedMetaData" />
        <div v-else class="meta-error">
          <el-alert type="warning" :closable="false" show-icon :title="t('material.metaFormatError')" :description="t('material.metaFormatErrorDesc')" />
          <div class="meta-raw-content">
            <pre>{{ metaDialogContent }}</pre>
          </div>
        </div>
      </div>
      <div v-else class="meta-empty">
        <el-empty :description="t('material.noMetaInfo')" />
      </div>
    </el-dialog>

    <el-dialog v-model="stickerUserTransferDialogVisible" :title="stickerUserTransferDialogTitle" width="560px"
      align-center :close-on-click-modal="false" @closed="resetStickerUserTransferDialog">
      <div class="sticker-user-transfer-dialog">

        <el-form label-width="96px" class="sticker-user-transfer-form">
          <el-form-item :label="t('material.targetUser')" required>
            <el-select v-model="stickerUserTransferTargetUserId" class="sticker-user-transfer-form__select" filterable
              clearable :loading="stickerUserTransferUsersLoading" :placeholder="t('material.selectTargetUser')">
              <el-option v-for="item in stickerUserTransferUserOptions" :key="item.id" :label="item.label"
                :value="item.id">
                <div class="sticker-user-transfer-option">
                  <div class="sticker-user-transfer-option__main">
                    <span>{{ item.name || item.account || t('material.userIdTemplate', { id: item.id }) }}</span>
                    <el-tag v-if="item.isAdmin" size="small" type="warning">{{ t('material.admin') }}</el-tag>
                  </div>
                  <span class="sticker-user-transfer-option__meta">
                    {{ item.account || t('material.idTemplate', { id: item.id }) }}
                  </span>
                </div>
              </el-option>
            </el-select>
          </el-form-item>

          <el-form-item :label="t('material.materialCount')">
            <el-tag type="info">{{ stickerUserTransferIds.length }}</el-tag>
          </el-form-item>

          <el-form-item :label="t('material.selectedMaterials')">
            <div class="sticker-user-transfer-preview">
              <el-tag v-for="item in stickerUserTransferPreviewItems" :key="item.id" size="small" effect="plain">
                {{ item.label }}
              </el-tag>
              <span v-if="stickerUserTransferIds.length > stickerUserTransferPreviewItems.length"
                class="sticker-user-transfer-preview__more">
                {{ t('material.andMoreCount', { count: stickerUserTransferIds.length }) }}
              </span>
            </div>
          </el-form-item>
        </el-form>
      </div>

      <template #footer>
        <el-button @click="stickerUserTransferDialogVisible = false">{{ t('material.cancel') }}</el-button>
        <el-button type="primary" :loading="stickerUserTransferSubmitting" @click="submitStickerUserTransfer">
          {{ stickerUserTransferSubmitText }}
        </el-button>
      </template>
    </el-dialog>

    <!-- SVG转PNG尺寸设置弹窗 -->
    <el-dialog v-model="svgToPngDialogVisible" :title="t('material.svgToPngSizeSetting')" width="500px" align-center
      :destroy-on-close="true">
      <div class="svg-to-png-form">
        <div class="form-section">
          <h4 class="section-title">{{ t('material.outputSizeSetting') }}</h4>
          <div class="original-info" v-if="svgToPngForm.originalWidth && svgToPngForm.originalHeight">
            <el-tag type="info" size="small">
              {{ t('material.originalSize', { width: svgToPngForm.originalWidth, height: svgToPngForm.originalHeight, ratio: svgToPngForm.aspectRatio.toFixed(2) }) }}
            </el-tag>
          </div>
          <el-form :model="svgToPngForm" label-width="120px">
            <el-form-item :label="t('material.outputWidthPx')">
              <el-input-number v-model="svgToPngForm.width" :min="64" :max="4096" :step="64" controls-position="right"
                style="width: 200px" @change="handleWidthChange" />
            </el-form-item>
            <el-form-item :label="t('material.autoHeight')">
              <el-tag type="info" size="large"> {{ svgToPngForm.height }} px </el-tag>
              <span class="aspect-ratio-info">
                {{ t('material.autoHeightHint', { ratio: svgToPngForm.aspectRatio.toFixed(2) }) }}
              </span>
            </el-form-item>
          </el-form>
        </div>

        <div class="preset-section">
          <h4 class="section-title">{{ t('material.commonSizePresets') }}</h4>
          <div class="preset-buttons">
            <el-button v-for="preset in sizePresets" :key="preset.name" size="small" @click="applyPreset(preset)">
              {{ preset.name }}<br />
              <span class="preset-size">{{ preset.width }}px</span>
            </el-button>
          </div>
        </div>

        <div class="preview-section">
          <h4 class="section-title">{{ t('material.previewInfo') }}</h4>
          <div class="preview-info">
            <el-tag type="info" size="large">
              {{ t('material.outputSize', { width: svgToPngForm.width, height: svgToPngForm.height }) }}
            </el-tag>
            <el-tag type="success" size="large" style="margin-left: 8px">
              {{ t('material.approxFileSize', { size: Math.round((svgToPngForm.width * svgToPngForm.height * 4) / 1024) }) }}
            </el-tag>
          </div>
        </div>
      </div>

      <template #footer>
        <el-button @click="svgToPngDialogVisible = false">{{ t('material.cancel') }}</el-button>
        <el-button type="primary" @click="confirmSvgToPng">{{ t('material.startConvert') }}</el-button>
      </template>
    </el-dialog>

    <RelatedPsdSetDialog ref="relatedPsdSetDialogRef" />
    <el-dialog v-model="storyScriptDialogVisible" fullscreen destroy-on-close class="story-script-dialog"
      :title="t('material.storyScriptFor', { name: storyScriptCurrentSticker?.name || t('material.materialImage') })">
      <div
        class="grid h-[calc(100vh-96px)] min-h-0 grid-cols-1 gap-4 overflow-hidden lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside class="min-h-0 overflow-hidden rounded-2xl border shadow-sm">
          <div class="flex h-full min-h-0 flex-col overflow-hidden">
            <div class="border-b px-5 py-4">
              <div class="text-base font-semibold">{{ t('material.scriptList') }}</div>
              <div class="mt-1 text-xs opacity-70">{{ t('material.scriptListHint') }}</div>
            </div>

            <div v-if="storyScriptCurrentSticker" class="border-b px-5 py-4 text-sm">
              <div class="truncate font-medium">
                {{ storyScriptCurrentSticker.name || t('material.unnamedMaterial') }}
              </div>
              <div class="mt-2 line-clamp-3 text-xs opacity-70">
                {{
                  storyScriptCurrentSticker.description ||
                  storyScriptCurrentSticker.keywords ||
                  t('material.noMaterialInfo')
                }}
              </div>
            </div>

            <div v-if="!storyScriptList.length && !storyScriptListLoading"
              class="flex flex-1 items-center justify-center px-4">
              <el-empty :description="t('material.noScript')" :image-size="88" />
            </div>

            <div v-else class="flex-1 overflow-y-auto p-3">
              <button v-for="item in storyScriptList" :key="item.id" type="button"
                class="mb-3 block w-full rounded-xl border px-4 py-3 text-left transition last:mb-0"
                :class="selectedStoryScript?.id === item.id ? 'border-primary' : ''"
                @click="selectedStoryScriptId = item.id">
                <div class="flex items-center justify-between gap-3">
                  <div class="min-w-0 truncate text-sm font-medium">
                    {{ item.title || t('material.versionNo', { no: item.versionNo }) }}
                  </div>
                </div>
                <div class="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs opacity-70">
                  <span>v{{ item.versionNo }}</span>
                  <span>{{ item.sceneType }}</span>
                </div>
                <div class="mt-2 line-clamp-3 text-xs leading-5 opacity-80">
                  {{ item.content || t('material.noContent') }}
                </div>
              </button>
            </div>
          </div>
        </aside>

        <section class="min-h-0 overflow-hidden rounded-2xl border shadow-sm" v-loading="storyScriptListLoading">
          <div class="flex h-full min-h-0 flex-col overflow-hidden">
            <div class="grid min-h-0 flex-1 grid-cols-1 xl:grid-cols-[minmax(0,1fr)_380px]">
              <div class="min-h-0 px-6 py-5 xl:border-r">
                <div v-if="!selectedStoryScript" class="flex h-full items-center justify-center">
                  <el-empty :description="t('material.selectScriptFirst')" />
                </div>

                <div v-else class="flex h-full min-h-0 flex-col">
                  <div class="flex flex-wrap items-start justify-between gap-4 border-b pb-4">
                    <div class="min-w-0">
                      <div class="flex flex-wrap items-center gap-2">
                        <h3 class="break-words text-lg font-semibold">
                          {{ selectedStoryScript.title || t('material.versionNo', { no: selectedStoryScript.versionNo }) }}
                        </h3>
                        <el-tag effect="plain">{{
                          selectedStoryScript.status || "generated"
                        }}</el-tag>
                      </div>
                      <div class="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-xs opacity-70">
                        <span>{{ t('material.versionV', { no: selectedStoryScript.versionNo }) }}</span>
                        <span>{{ t('material.scene', { type: selectedStoryScript.sceneType }) }}</span>
                        <span>{{
                          selectedStoryScript.createTime
                            ? formatTimestamp(selectedStoryScript.createTime)
                            : ""
                        }}</span>
                      </div>
                    </div>

                    <div class="flex flex-wrap gap-2">
                      <el-button size="small"
                        @click="handleCopyStoryScript(selectedStoryScript.content, t('material.scriptBody'))">{{ t('material.copyScriptBody') }}</el-button>
                      <el-button v-if="selectedStoryScript.subtitleContent" size="small" @click="
                        handleCopyStoryScript(selectedStoryScript.subtitleContent, t('material.scriptSubtitle'))
                        ">{{ t('material.copySubtitle') }}</el-button>
                      <el-button size="small" type="danger" plain
                        @click="handleDeleteStoryScript(selectedStoryScript)">{{ t('material.delete') }}</el-button>
                    </div>
                  </div>

                  <div class="mt-5 min-h-0 flex-1 overflow-y-auto pr-1">
                    <div class="rounded-2xl border p-4">
                      <div class="mb-2 text-xs font-medium uppercase tracking-wide opacity-60">
                        {{ t('material.scriptBody') }}
                      </div>
                      <div class="whitespace-pre-wrap break-words text-[15px] leading-7">
                        {{ selectedStoryScript.content || "-" }}
                      </div>
                    </div>

                    <div v-if="selectedStoryScript.subtitleContent" class="mt-4 rounded-2xl border p-4">
                      <div class="mb-2 text-xs font-medium uppercase tracking-wide opacity-60">
                        {{ t('material.scriptSubtitle') }}
                      </div>
                      <pre class="whitespace-pre-wrap break-words font-sans text-sm leading-7">{{
                        selectedStoryScript.subtitleContent
                      }}</pre>
                    </div>

                    <div v-if="selectedStoryScript.hashtags" class="mt-4 rounded-2xl border p-4 text-sm">
                      <div class="mb-2 text-xs font-medium uppercase tracking-wide opacity-60">
                        {{ t('material.tags') }}
                      </div>
                      <div class="break-all">{{ selectedStoryScript.hashtags }}</div>
                    </div>
                  </div>
                </div>
              </div>

              <div class="min-h-0 border-t px-6 py-5 xl:border-t-0 xl:border-l">
                <div class="h-full overflow-y-auto pl-0 xl:pl-1">
                  <div class="mb-4">
                    <div class="text-base font-semibold">{{ t('material.generateConfig') }}</div>
                    <div class="mt-1 text-xs opacity-70">
                      {{ t('material.generateConfigHint') }}
                    </div>
                  </div>

                  <el-form label-position="top" class="space-y-1">
                    <el-form-item :label="t('material.usageScene')">
                      <el-select v-model="storyScriptForm.sceneType" class="w-full">
                        <el-option :label="t('material.socialPost')" value="social_post" />
                        <el-option :label="t('material.shortVideoSubtitle')" value="short_video_subtitle" />
                        <el-option :label="t('material.voiceoverScript')" value="voiceover" />
                      </el-select>
                    </el-form-item>
                    <el-form-item :label="t('material.styleRequirement')">
                      <el-input v-model="storyScriptForm.stylePrompt" type="textarea" :rows="4" resize="vertical" />
                    </el-form-item>
                    <el-form-item :label="t('material.toneRequirement')">
                      <el-input v-model="storyScriptForm.tonePrompt" type="textarea" :rows="4" resize="vertical" />
                    </el-form-item>
                    <el-form-item :label="t('material.lengthRequirement')">
                      <el-input v-model="storyScriptForm.lengthPrompt" />
                    </el-form-item>
                    <el-form-item :label="t('material.extraRequirement')">
                      <el-input v-model="storyScriptForm.extraPrompt" type="textarea" :rows="8" resize="vertical" />
                    </el-form-item>
                  </el-form>

                  <div class="mt-4 flex flex-col gap-3">
                    <el-button type="primary" class="!ml-0 w-full" :loading="storyScriptSubmitting"
                      @click="handleGenerateStoryScript">
                      {{ t('material.generateStoryScript') }}
                    </el-button>
                    <el-button class="!ml-0 w-full" @click="refreshStoryScriptList">{{ t('material.refreshList') }}</el-button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </el-dialog>

    <!-- PSD套图参数查看弹窗 -->
    <el-dialog v-model="psdSetParamsDialogVisible" :title="t('material.psdSetParams')" width="80%" :destroy-on-close="true" align-center>
      <div class="psd-params-viewer">
        <pre class="params-content">{{ psdSetParamsContent }}</pre>
      </div>
      <template #footer>
        <el-button @click="psdSetParamsDialogVisible = false">{{ t('material.close') }}</el-button>
        <el-button type="primary"
          @click="() => { (navigator as any).clipboard.writeText(psdSetParamsContent); ElMessage.success(t('material.copiedToClipboard')) }">{{ t('material.copyParams') }}</el-button>
      </template>
    </el-dialog>

    <!-- 图片预览弹窗 -->
    <ImagePreview :visible="imagePreviewVisible" :image-url="currentImageUrl" @close="closeImagePreview" />

    <el-dialog v-model="publishUsageDialogVisible" :title="t('material.publishBinding')" width="920px" :destroy-on-close="true">
      <div v-loading="publishUsageLoading" class="publish-usage-dialog">
        <el-empty v-if="!publishUsageLoading && !publishUsageRecords.length" :description="t('material.noPublishBinding')" />
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

    <!-- 查看分享记录弹窗 -->
    <el-dialog v-model="shareRecordsDialogVisible" :title="t('material.shareRecordsFor', { name: shareRecordsResourceName })" width="600px"
      destroy-on-close>
      <div v-loading="shareRecordsLoading">
        <el-empty v-if="!shareRecordsLoading && shareRecordsList.length === 0" :description="t('material.noShareRecords')" />
        <el-table v-else :data="shareRecordsList" style="width: 100%">
          <el-table-column prop="userName" :label="t('material.sharedTo')" min-width="120">
            <template #default="{ row }">
              <span>{{ row.userName || row.userId }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="shareType" :label="t('material.shareType')" width="120">
            <template #default="{ row }">
              <el-tag v-if="row.shareType === 'shared'" type="warning" size="small" effect="light">{{ t('material.quickShare') }}</el-tag>
              <el-tag v-else-if="row.shareType === 'copy'" type="success" size="small" effect="light">{{ t('material.physicalCopy') }}</el-tag>
              <el-tag v-else type="info" size="small" effect="plain">{{ row.shareType || '-' }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="createTime" :label="t('material.shareTime')" width="180">
            <template #default="{ row }">
              {{ formatTimestamp(row.createTime) }}
            </template>
          </el-table-column>
        </el-table>
      </div>
    </el-dialog>
  </ContentWrap>
</template>

<script setup lang="tsx">
import {
  ref,
  reactive,
  computed,
  onMounted,
  onUnmounted,
  watch,
  handleError,
  watchEffect,
  nextTick,
} from "vue";
import { gridRef, resetCheckStatus } from "./selection";

import {
  getMaterialList,
  deleteAssetLibrary,
  checkAssetLibrary,
  pullAsset,
  materialDistribute,
  getMaterialDetail,
  handleDropMaterial,
  aiAutoGenerateMaterialInfo,
  updateAssetLibrary,
  generateImageInfo, // 新增
  generateStickerCode,
  batchMoveStickers,
  getStickerFolderTree,
  uploadMaterialFile,
  copyStickers,
  copyStickersToUser,
  shareStickersToUser,
  moveStickersToUser,
  getStickerById,
  trimPng,
  svgToPng,
  generateStickerStoryScript,
  getStickerStoryScriptList,
  deleteStickerStoryScript,
  searchStickerByImage,
  searchStickerByText,
  getStickerSharedRecords,
} from "@/api/material"; // 实际接口导入
import { ResourceLibraryApi } from "@/api/resource-library";

import { uploadToCOS } from "@/api/cos";
import { stickerPsdSetApi } from "@/api/stickerPsdSet";

import { buildOperationColumn, commonGridOptions } from "@/common/table";
import { formatTimestamp } from "@/common/date";
import CryptoJS from "crypto-js";

import {
  useDebounceFn,
  useLocalStorage,
  useSessionStorage,
  useWindowSize,
  useMouse,
} from "@vueuse/core";
import { sortTypeOptions, defaultSortingValue } from "@/common/sort";
import { saveAs } from "file-saver";

import { useUserStore } from "@/store/modules/user";
import { useI18n } from "@/hooks/web/useI18n";
import listUpload from "./listUpload.vue";

import { ElButton, ElNotification, ElMessage, ElMessageBox } from "element-plus";
import { isQueuedAiTaskResult, notifyQueuedAiTask, unwrapAiTaskResult } from "@/utils/aiTask";
import {
  Delete,
  Plus,
  Search,
  Loading,
  Check,
  More,
  InfoFilled,
  ArrowRight,
  ArrowLeft,
  Edit,
  Picture,
  UploadFilled,
  Key,
  Document,
  Warning,
  PictureFilled,
  DocumentCopy,
  RefreshLeft,
  Folder,
  Files,
  DArrowLeft,
  DArrowRight,
  Connection,
} from "@element-plus/icons-vue";
import tree from "./tree.vue";
import { materialStatusOptions } from ".";
import { psdTemplateApi } from "@/api/psdTemplate";
import { formatDate } from "@/utils/formatTime";
import { getTitleTemplateList } from "@/api/publish";
import { downloadCrossOriginImage, downloadFileByElement, downloadImage } from "@/common/download";
import { getConfigTemplateList } from "@/api/publish/config";
import { getPublishConfigListApi } from "@/api/product/publishConfig";
import { productGenerationTemplateApi } from "@/api/product-generation-template";
import genPicture from "./genPicture.vue";
import { getAccessToken } from "@/utils/auth";
import { buildImageProcessingRouteLocation } from "@/utils/imageProcessingRoute";
import { getUserList } from "@/api/user";
import { getDesignModelList } from "@/api/designModel";
import request from "@/config/axios";
import VueJsonPretty from "vue-json-pretty";
import "vue-json-pretty/lib/styles.css";
import { getFastPreviewImageUrl, getPreviewImageUrl, getRotatedImageUrl } from "@/utils/image";
import {
  SIZE_SHAPE_GROUPS,
  getFullLabel,
  getSizeShapeByRatio,
  getSizeShapeUiConfig,
} from "./sizeShapeConfig";
import { useFolderRowDrag } from "@/hooks/useFolderRowDrag";
import RelatedPsdSetDialog from "./RelatedPsdSetDialog.vue";
import FolderTree from "@/components/material/FolderTree.vue";
import TableRowDragHandle from "@/components/TableRowDragHandle/index.vue";
import ListPageLayout from "@/components/ListPageLayout/index.vue";
import ImageGroupView from "../imageGroup/index.vue";
import { imageGroupApi, type ImageGroupItem } from "@/api/imageGroup";
import { FOLDER_FILTER } from "@/constants/folder";
import { derivePublishTaskTypeByPlatform, getTaskTypeLabel } from "@/config/task-types";
import { useServiceHealthState } from "@/services/serviceHealthState";

const userStore = useUserStore();
const { t } = useI18n();
const router = useRouter();
const FOLDER_CATEGORY = "sticker";

// 判断是否为管理员
const isAdmin = computed(() => userStore.user?.isAdmin ?? false);
const visualSimilarSearchDisabled = false;
const phashSearchDisabled = true;
const VISUAL_SIMILAR_SEARCH_DISABLED_MESSAGE = t("material.visualSimilarSearchDisabled");
const PHASH_SEARCH_DISABLED_MESSAGE = t("material.phashSearchDisabled");

// 模型服务健康状态检查
const modelServiceHealth = useServiceHealthState("modelService");

type StickerUserTransferAction = "share" | "copy" | "move";
type StickerUserTransferUserOption = {
  id: string;
  name: string;
  account: string;
  label: string;
  isAdmin: boolean;
};

const storyScriptDialogVisible = ref(false);
const storyScriptSubmitting = ref(false);
const storyScriptListLoading = ref(false);
const storyScriptCurrentSticker = ref<any>(null);
const storyScriptList = ref<any[]>([]);
const selectedStoryScriptId = ref("");
const selectedStoryScript = computed(() => {
  if (!storyScriptList.value.length) return null;
  return (
    storyScriptList.value.find((item) => item.id === selectedStoryScriptId.value) ||
    storyScriptList.value[0]
  );
});
const storyScriptForm = reactive({
  sceneType: "social_post",
  stylePrompt: t("material.stylePromptDefault"),
  tonePrompt: t("material.tonePromptDefault"),
  lengthPrompt: t("material.lengthPromptDefault"),
  extraPrompt: "",
});

async function openStoryScriptDialog(row: any) {
  storyScriptCurrentSticker.value = row;
  storyScriptDialogVisible.value = true;
  storyScriptForm.sceneType = "social_post";
  storyScriptForm.stylePrompt = t("material.stylePromptDefault");
  storyScriptForm.tonePrompt = t("material.tonePromptDefault");
  storyScriptForm.lengthPrompt = t("material.lengthPromptDefault");
  storyScriptForm.extraPrompt = "";
  await loadStoryScriptList(row.id);
}

async function loadStoryScriptList(stickerId?: string) {
  const currentStickerId = stickerId || storyScriptCurrentSticker.value?.id;
  if (!currentStickerId) {
    storyScriptList.value = [];
    return;
  }
  storyScriptListLoading.value = true;
  try {
    const result = await getStickerStoryScriptList({ stickerId: currentStickerId });
    storyScriptList.value = Array.isArray(result) ? result : [];
    selectedStoryScriptId.value = storyScriptList.value[0]?.id || "";
  } catch (error: any) {
    storyScriptList.value = [];
    selectedStoryScriptId.value = "";
    ElMessage.error(error?.message || t("material.storyScriptListLoadFailed"));
  } finally {
    storyScriptListLoading.value = false;
  }
}

async function refreshStoryScriptList() {
  await loadStoryScriptList();
}

async function handleGenerateStoryScript() {
  if (!storyScriptCurrentSticker.value?.id) {
    ElMessage.warning(t("material.selectMaterialImageFirst"));
    return;
  }
  storyScriptSubmitting.value = true;
  try {
    await generateStickerStoryScript({
      stickerId: storyScriptCurrentSticker.value.id,
      sceneType: storyScriptForm.sceneType,
      stylePrompt: storyScriptForm.stylePrompt,
      tonePrompt: storyScriptForm.tonePrompt,
      lengthPrompt: storyScriptForm.lengthPrompt,
      extraPrompt: storyScriptForm.extraPrompt,
    });
    ElMessage.success(t("material.storyScriptGenerated"));
    await loadStoryScriptList();
  } catch (error: any) {
    ElMessage.error(error?.message || t("material.storyScriptGenerateFailed"));
  } finally {
    storyScriptSubmitting.value = false;
  }
}

async function handleDeleteStoryScript(item: any) {
  try {
    await ElMessageBox.confirm(t("material.confirmDeleteStoryScript"), t("material.deleteConfirm"), { type: "warning" });
    await deleteStickerStoryScript(item.id);
    ElMessage.success(t("material.deleteSuccess"));
    await loadStoryScriptList();
  } catch (error: any) {
    if (error !== "cancel") {
      ElMessage.error(error?.message || t("material.storyScriptDeleteFailed"));
    }
  }
}

async function handleCopyStoryScript(text: string, label: string) {
  if (!text) {
    ElMessage.warning(t("material.emptySuffix", { label }));
    return;
  }
  try {
    await navigator.clipboard.writeText(text);
    ElMessage.success(t("material.copiedSuffix", { label }));
  } catch (error) {
    ElMessage.error(t("material.copyFailedSuffix", { label }));
  }
}

// 尺寸形状配置
const sizeShapeGroups = SIZE_SHAPE_GROUPS;

// 抠图模式标签映射
const getCutoutModeLabel = (mode: string) => {
  const map = {
    CUTOUT: t("material.cutout"),
    NON_CUTOUT: t("material.nonCutout"),
  };
  return map[mode] || mode;
};

const form = ref({});

const { height } = useWindowSize();
const maxHeight = ref(Math.max(height.value - 280, 360));

watchEffect(() => {
  maxHeight.value = Math.max(height.value - 280, 360);
});

const queryParams = reactive({
  currentPage: 1,
  pageSize: 20,
  keyword: "",
  searchText: "", // 多字段搜索（名称、描述、关键词等）
  sortingFields: "createTime DESC", // 排序字段
  startTime: "",
  endTime: "",
  suffix: [], // 新增后缀参数（支持多选）
  id: "", // 新增ID精确查询参数
  phash: "", // phash值或直接输入图片地址
  phashMode: "range", // range | exact
  isCustom: "" as boolean | string, // 空字符串表示"全部"，请求时转为 null
  isInfringement: "" as boolean | string,
  isCutout: "" as boolean | string,
  seamless: "" as boolean | string,
  sizeShape: [] as string[], // 尺寸形状：landscape(横图) | portrait(竖图) | square(正方图) | ultra-wide | wide | slightly-wide | slightly-long | long | ultra-long（支持多选）
  random: false, // 是否随机
  folderId: FOLDER_FILTER.ALL as string | null | undefined, // 文件夹ID
  publishUsageConfigId: [] as string[],
});

const vectorSimilarSearchActive = ref(false);
const similarImageSearchMeta = ref<any>(null);
const similarImageSearchLimit = ref(10); // 检索数量默认 10
const similarImageDialogVisible = ref(false);
const similarImageSearchTab = useLocalStorage<"url" | "file" | "text">(
  "material_similar_image_search_tab",
  "url",
);
const similarImageUrl = ref("");
const similarImageFile = ref<File | null>(null);
const similarImageFileName = ref("");
const similarImageFilePreviewUrl = ref("");
const similarImageSubmitting = ref(false);
const similarImageActivePreviewUrl = ref("");
const similarImageActiveSourceType = ref<"url" | "file" | "text" | "">("");
const similarImageActiveSourceLabel = ref("");
const similarImageSearchText = ref("");
const similarImagePreviewSrc = computed(() => {
  if (similarImageSearchTab.value === "url") {
    return similarImageUrl.value.trim();
  }
  if (similarImageSearchTab.value === "text") {
    return "";
  }
  return similarImageFilePreviewUrl.value;
});
const similarImageSearchStatusVisible = computed(
  () =>
    vectorSimilarSearchActive.value &&
    (Boolean(similarImageActivePreviewUrl.value) ||
      similarImageActiveSourceType.value === "text"),
);
const similarImageActiveSourceText = computed(() => {
  if (similarImageActiveSourceType.value === "file") {
    return similarImageActiveSourceLabel.value
      ? t("material.localImageWithName", { name: similarImageActiveSourceLabel.value })
      : t("material.localImage");
  }
  if (similarImageActiveSourceType.value === "url") {
    return similarImageActiveSourceLabel.value || t("material.imageUrl");
  }
  if (similarImageActiveSourceType.value === "text") {
    return t("material.textSearchWithLabel", { text: similarImageActiveSourceLabel.value });
  }
  return t("material.queryImage");
});

const publishUsageConfigOptions = ref<any[]>([]);
const publishUsageDialogVisible = ref(false);
const publishUsageLoading = ref(false);
const publishUsageRecords = ref<any[]>([]);

// 查看分享记录
const shareRecordsDialogVisible = ref(false);
const shareRecordsLoading = ref(false);
const shareRecordsList = ref<any[]>([]);
const shareRecordsTotal = ref(0);
const shareRecordsResourceName = ref('');

const publishPlatformNameMap: Record<string, string> = {
  douyin: t("material.platformDouyin"),
  kuaishou: t("material.platformKuaishou"),
  xiaohongshu: t("material.platformXiaohongshu"),
  weibo: t("material.platformWeibo"),
  doudian: t("material.platformDoudian"),
  kuaishou_shop: t("material.platformKuaishouShop"),
  xianyu: t("material.platformXianyu"),
  bilibili: "Bilibili",
  tiktok: "TikTok",
  youtube: "YouTube",
  temu: "Temu",
  taobao: t("material.platformTaobao"),
  pdd: t("material.platformPdd"),
};

function formatPlatformName(platform?: string) {
  return publishPlatformNameMap[String(platform || "")] || String(platform || "-");
}

function formatPublishUsageConfigLabel(config: any) {
  const name = String(config?.name || "").trim();
  const platform = formatPlatformName(config?.platform);
  return name ? `${name} / ${platform}` : platform;
}

function getPublishUsageStatusLabel(status?: string) {
  const map: Record<string, string> = {
    pending: t("material.publishStatusPending"),
    success: t("material.publishStatusSuccess"),
    failed: t("material.publishStatusFailed"),
    expired: t("material.publishStatusExpired"),
    deleted: t("material.publishStatusDeleted"),
  };
  return map[String(status || "")] || String(status || "-");
}

function getPublishUsageStatusTag(status?: string) {
  const map: Record<string, "info" | "warning" | "success" | "danger"> = {
    pending: "warning",
    success: "success",
    failed: "danger",
    expired: "info",
    deleted: "info",
  };
  return map[String(status || "")] || "info";
}

const publishUsageGridOptions = computed(() => ({
  ...commonGridOptions,
  maxHeight: Math.max(height.value - 280, 360),
  rowConfig: { isHover: true, keyField: "id" },
  columnConfig: { resizable: true },
  columns: [
    { field: "imageUrl", title: t("material.image"), width: 96, slots: { default: "usageImageSlot" } },
    { field: "publishConfigId", title: t("material.publishConfig"), minWidth: 220, slots: { default: "usageConfigSlot" } },
    { field: "status", title: t("material.status"), width: 110, slots: { default: "usageStatusSlot" } },
    { field: "taskId", title: t("material.taskId"), minWidth: 220, showOverflow: true },
    {
      field: "createTime",
      title: t("material.createTime"),
      width: 170,
      formatter: ({ cellValue }: any) => formatTimestamp(cellValue),
    },
    {
      field: "updateTime",
      title: t("material.updateTime"),
      width: 170,
      formatter: ({ cellValue }: any) => formatTimestamp(cellValue),
    },
  ],
}));

function handlePublishUsageViewChange() {
  queryParams.currentPage = 1;
  getList();
}

const isAllSelected = computed(() => {
  return (
    publishUsageConfigOptions.value.length > 0 &&
    queryParams.publishUsageConfigId.length === publishUsageConfigOptions.value.length
  );
});

function toggleSelectAll() {
  if (isAllSelected.value) {
    queryParams.publishUsageConfigId = [];
  } else {
    queryParams.publishUsageConfigId = publishUsageConfigOptions.value.map((item) => item.id);
  }
  queryParams.currentPage = 1;
  getList();
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

async function handleViewPublishUsageRecords(row: any) {
  const stickerId = String(row?.id || "").trim();
  const imageUrl = String(row?.url || row?.originUrl || "").trim();
  if (!stickerId && !imageUrl) {
    return ElMessage.warning(t("material.missingImageIdForUsage"));
  }
  publishUsageDialogVisible.value = true;
  publishUsageLoading.value = true;
  publishUsageRecords.value = [];
  try {
    const res = await stickerPsdSetApi.getPublishUsageRecords({
      stickerId: stickerId || undefined,
      imageUrl: stickerId ? undefined : imageUrl,
    });
    publishUsageRecords.value = Array.isArray(res)
      ? res
      : Array.isArray((res as any)?.data)
        ? (res as any).data
        : [];
  } catch (error: any) {
    console.error("获取发布绑定失败:", error);
    ElMessage.error(error?.message || t("material.publishBindingLoadFailed"));
    publishUsageDialogVisible.value = false;
  } finally {
    publishUsageLoading.value = false;
  }
}

// 尺寸形状选项配置
const sizeShapeOptions = {
  landscape: { label: "横图", thumbClass: "landscape-thumb" },
  portrait: { label: "竖图", thumbClass: "portrait-thumb" },
  square: { label: "正方图", thumbClass: "square-thumb" },
  "ultra-wide": { label: "超宽图 (≥2:1)", thumbClass: "ultra-wide-thumb" },
  wide: { label: "宽图 (1.5:1 - 2:1)", thumbClass: "wide-thumb" },
  "slightly-wide": { label: "微宽图 (1.1:1 - 1.5:1)", thumbClass: "slightly-wide-thumb" },
  "slightly-long": { label: "微长图 (1:1.1 - 1:1.5)", thumbClass: "slightly-long-thumb" },
  long: { label: "长图 (1:1.5 - 1:2)", thumbClass: "long-thumb" },
  "ultra-long": { label: "超长图 (≤1:2)", thumbClass: "ultra-long-thumb" },
};

// 展示模式见 ./selection.ts

// 格式化文件大小
function formatFileSize(bytes: number): string {
  if (!bytes || bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

// 获取格式标签类型
function getFormatTagType(suffix: string): string {
  const typeMap: Record<string, string> = {
    png: "success",
    jpg: "",
    jpeg: "",
    svg: "warning",
    gif: "info",
    webp: "",
    psd: "danger",
  };
  return typeMap[suffix?.toLowerCase()] || "info";
}

const gridOptions = computed(() => {
  const showSimilarityColumn =
    vectorSimilarSearchActive.value || Boolean(String(queryParams.phash || "").trim());
  const baseColumns = [
    {
      title: "",
      field: "dragHandle",
      width: 34,
      showOverflow: false,
      align: "center" as const,
      slots: {
        default: "dragHandleSlot",
      },
    },
    {
      type: "checkbox" as const,
      field: "checkbox",
      title: "",
      width: 42,
      ellipsis: true,
      reserve: true,
      minWidth: 42,
      className: "" as any,
    },
    {
      title: t("material.previewImage"),
      field: "url",
      width: 128,
      slots: { default: "previewDefaultSlot" },
    },
    {
      title: t("material.material"),
      field: "name",
      minWidth: 220,
      className: "font-bold",
      slots: { default: "compactNameSlot" },
    },
    {
      title: t("material.resourceType"),
      field: "shareType",
      width: 200,
      slots: { default: "shareTypeSlot" },
    },
    {
      title: t("material.code"),
      field: "code",
      width: 100,
      slots: { default: "codeSlot" },
    },
    {
      title: t("material.fileInfo"),
      field: "fileInfo",
      minWidth: 200,
      slots: { default: "fileInfoSlot" },
    },
    {
      title: t("material.cutout"),
      field: "isCutout",
      width: 72,
      slots: { default: "cutoutSlot" },
    },
    {
      title: t("material.folder"),
      field: "folder",
      minWidth: 140,
      formatter: ({ cellValue }: any) => cellValue || t("material.rootDirectory"),
    },
    {
      title: t("material.createTime"),
      field: "createTime",
      width: 150,
      className: "table-time-cell",
      formatter: ({ cellValue }: any) => (cellValue ? formatTimestamp(cellValue) : "-"),
    },
    {
      title: t("material.updateTime"),
      field: "updateTime",
      width: 150,
      className: "table-time-cell",
      formatter: ({ cellValue }: any) => (cellValue ? formatTimestamp(cellValue) : "-"),
    },
    ...(showSimilarityColumn
      ? [
        {
          title: t("material.similarity"),
          field: "similarity",
          width: 80,
          slots: { default: "similaritySlot" },
        },
      ]
      : []),
  ];

  const operationColumn = buildOperationColumn("operationDefaultSlot");

  return {
    ...commonGridOptions,
    maxHeight: maxHeight.value,
    rowConfig: {
      keyField: "id",
    },
    checkboxConfig: {
      reserve: true,
    },
    columns: [...baseColumns, operationColumn],
  };
});

const dataSource = ref([]);
const stickerDetailCache = new Map<string, any>();
const selectedMaterialCache = reactive<Record<string, any>>({});
const loading = ref(false);
const deleteLoading = ref(false);
const activeOperationRowId = ref("");
const operationCommandLoadingId = ref("");
const operationDropdownRefs = new Map<string, any>();
const open = ref(false);
const title = ref("");
const ids = ref<string[]>([]);
const psdSetImageGroups = ref<ImageGroupItem[]>([]);
const isImageGroupPsdSet = computed(() => psdSetImageGroups.value.length > 0);
const psdSetSelectedMaterialIds = computed(() =>
  isImageGroupPsdSet.value
    ? psdSetImageGroups.value.flatMap((group) =>
      (group.stickers || []).map((sticker) => String(sticker.id)),
    )
    : ids.value.map(String),
);
const materialViewMode = useLocalStorage<"single" | "group">(
  "material_view_mode",
  "single",
);
const addToGroupDialogVisible = ref(false);
const availableGroupsLoading = ref(false);
const addingToGroup = ref(false);
const addToGroupMode = ref<"existing" | "new">("existing");
const targetGroupValue = ref("");
const newGroupName = ref("");
const availableGroupList = ref<ImageGroupItem[]>([]);
const selectedGroupStickerIds = ref<string[]>([]);
const preferredTargetGroup = ref<ImageGroupItem | null>(null);
const addToGroupButtonText = computed(() => {
  const name = preferredTargetGroup.value?.name?.trim();
  if (!name) return t("material.addToGroup");
  const displayName = name.length > 10 ? `${name.slice(0, 10)}...` : name;
  return t("material.addToGroupNamed", { name: displayName });
});
const addToGroupButtonTitle = computed(() =>
  preferredTargetGroup.value?.name
    ? t("material.targetGroupSelected", { name: preferredTargetGroup.value.name })
    : t("material.addToGroup"),
);
const selectedTargetGroup = computed(
  () => availableGroupList.value.find((group) => group.id === targetGroupValue.value) || null,
);
const canSubmitAddToGroup = computed(
  () =>
    selectedGroupStickerIds.value.length > 0 &&
    (addToGroupMode.value === "new"
      ? Boolean(newGroupName.value.trim())
      : Boolean(targetGroupValue.value)),
);

function handleGroupAddStickers(group: ImageGroupItem) {
  preferredTargetGroup.value = group;
  materialViewMode.value = "single";
  ElMessage.info(t("material.targetGroupSet", { name: group.name }));
}

function getGroupPreviewUrls(group: ImageGroupItem) {
  return group.stickers.map((item) => item.url).filter((url): url is string => Boolean(url));
}

async function openBatchAddToGroupDialog() {
  if (!ids.value.length) {
    ElMessage.warning(t("material.selectMaterialsToAddGroup"));
    return;
  }
  if (ids.value.length > 200) {
    ElMessage.warning(t("material.addGroupMaxLimit"));
    return;
  }

  selectedGroupStickerIds.value = [...ids.value];
  addToGroupMode.value = "existing";
  targetGroupValue.value = preferredTargetGroup.value?.id || "";
  newGroupName.value = "";
  addToGroupDialogVisible.value = true;
  availableGroupsLoading.value = true;

  try {
    const result = await imageGroupApi.page({ pageNo: 1, pageSize: 100 });
    availableGroupList.value = result.list || [];
    if (
      preferredTargetGroup.value &&
      !availableGroupList.value.some((group) => group.id === preferredTargetGroup.value?.id)
    ) {
      availableGroupList.value.unshift(preferredTargetGroup.value);
    }
  } catch (error: any) {
    availableGroupList.value = preferredTargetGroup.value ? [preferredTargetGroup.value] : [];
    ElMessage.error(error?.message || t("material.groupListLoadFailed"));
  } finally {
    availableGroupsLoading.value = false;
  }
}

async function submitBatchAddToGroup() {
  if (!selectedGroupStickerIds.value.length) {
    ElMessage.warning(t("material.noMaterialsToAdd"));
    return;
  }

  const isCreatingGroup = addToGroupMode.value === "new";
  const targetValue = targetGroupValue.value.trim();
  const normalizedNewGroupName = newGroupName.value.trim();
  if (isCreatingGroup && !normalizedNewGroupName) {
    ElMessage.warning(t("material.enterNewGroupName"));
    return;
  }
  if (!isCreatingGroup && !targetValue) {
    ElMessage.warning(t("material.selectTargetGroup"));
    return;
  }

  const stickers = selectedGroupStickerIds.value.map((stickerId, index) => ({
    stickerId,
    ...(isCreatingGroup ? { sortOrder: index } : {}),
  }));
  const existingGroup = availableGroupList.value.find((group) => group.id === targetValue);

  addingToGroup.value = true;
  try {
    if (isCreatingGroup) {
      await imageGroupApi.create({
        name: normalizedNewGroupName,
        stickers,
      });
      ElMessage.success(t("material.groupCreatedWithCount", { name: normalizedNewGroupName, count: stickers.length }));
    } else if (existingGroup) {
      await imageGroupApi.addStickers(existingGroup.id, { stickers });
      ElMessage.success(t("material.addedToGroup", { count: stickers.length }));
    } else {
      ElMessage.warning(t("material.targetGroupNotFound"));
      return;
    }
    addToGroupDialogVisible.value = false;
    preferredTargetGroup.value = null;
    selectedGroupStickerIds.value = [];
    newGroupName.value = "";
    resetCheckStatus(ids);
    await getList();
  } catch (error: any) {
    ElMessage.error(error?.message || t("material.addToGroupFailed"));
  } finally {
    addingToGroup.value = false;
  }
}

const {
  dragState,
  setupRowDrag,
  handleFolderDragOver,
  handleFolderDragLeave,
  resetAfterDrop,
  markExternalFolderDropHandled,
} = useFolderRowDrag({
  gridClass: "material-dnd-grid",
  dataSource,
  selectedIds: ids,
  onDropToFolder: handleFolderDrop,
});

function materialRowClassName({ row }: any) {
  if (dragState.dragging && dragState.draggingIds.includes(String(row.id))) {
    return "is-dragging-row";
  }
  if (row?.publishUsage?.occupied === true) {
    return "is-publish-usage-occupied has-publish-usage-badge";
  }
  if (row?.publishUsage?.occupied === false) {
    return "is-publish-usage-available has-publish-usage-badge";
  }
  return "";
}

function handleMaterialCellClick({ row, column }: any) {
  if (!row?.publishUsage) {
    return;
  }
  const firstColumnFields = new Set(["dragHandle", "checkbox"]);
  if (firstColumnFields.has(String(column?.field || ""))) {
    void handleViewPublishUsageRecords(row);
  }
}

function isCustomMaterial(row: any) {
  return row?.isCustom === true || row?.isCustom === "true" || row?.isCustom === 1;
}

const single = ref(false);
const multiple = ref(true);
const total = ref(0);
const formRef = ref();
const dialogTitle = ref("");
const dialogVisible = ref(false);
const isEdit = ref(true);
const currentRow = ref();
const submitLoading = ref(false);

const rules = {
  name: [{ required: true, message: "", trigger: "blur" }],
};

const editDialogVisible = ref(false);
const editForm = ref({
  id: "",
  code: "",
  name: "",
  nameEn: "",
  description: "",
  descriptionEn: "",
  keywords: "",
  keywordsEn: "",
  suitableFor: "",
  suffix: "",
  isCustom: false,
  isPublic: false,
  isTexture: false,
  isInfringement: false,
  isCutout: false,
  seamless: false,
  originUrl: "",
  source: "",
  folderId: null, // 文件夹ID
  folderPath: "", // 展示用路径
  // 只读字段（用于显示）
  width: null,
  height: null,
  aspectRatio: null,
  fileSize: null,
  colorPalette: "",
  phash: "",
});
const editLoading = ref(false);
const generatingCode = ref(false);
const detailDialogVisible = ref(false);
const detailDialogLoading = ref(false);
const stickerDetailCurrent = ref<any>(null);
const parsedDetailMetaData = computed(() => {
  const meta = stickerDetailCurrent.value?.meta;
  if (!meta) return null;
  if (typeof meta === "object") return meta;
  if (typeof meta !== "string") return null;
  const trimmed = meta.trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed);
  } catch {
    return null;
  }
});
const stickerDetailJsonData = computed(() => stickerDetailCurrent.value || {});

function formatDetailValue(value: any, fallback = "-") {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value === "object") {
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

function formatBooleanDetail(value: any) {
  if (value === undefined || value === null || value === "") return "-";
  return normalizeBooleanValue(value) ? t("material.yes") : t("material.no");
}

function normalizeBooleanValue(value: any) {
  if (value === true || value === 1) return true;
  const normalized = String(value ?? "").trim().toLowerCase();
  return normalized === "true" || normalized === "1" || normalized === "yes";
}

function formatAspectRatio(value: any) {
  const ratio = Number(value);
  return Number.isFinite(ratio) && ratio > 0 ? ratio.toFixed(4) : "-";
}

function formatDetailFileSize(value: any) {
  const size = Number(value);
  return Number.isFinite(size) && size > 0 ? formatFileSize(size) : "-";
}

function formatDetailDate(value: any) {
  return value ? formatTimestamp(value) : "-";
}

function getDetailUploaderLabel(detail: any) {
  return (
    detail?.uploader?.account ||
    detail?.uploader?.name ||
    detail?.uploaderAccount ||
    detail?.userId ||
    "-"
  );
}

// 其他缺少的变量
const currentUploadInfo = ref({
  path: "",
  folderId: null as string | null,
  folderPath: "",
  folder: "",
});
const currentGenPictureConfig = ref([]);
const genPicturesForm = ref({});
const genPicturesFormRules = ref({});
const genPicturesModalVisible = ref(false);

// 图片预览相关状态
const imagePreviewVisible = ref(false);
const currentImageUrl = ref("");

function closeImagePreview() {
  imagePreviewVisible.value = false;
  currentImageUrl.value = "";
}

// 元数据弹窗（提前定义，避免与模板渲染顺序问题）
const metaDialogVisible = ref(false);
const metaDialogContent = ref("");

// 素材转移 / 分享给用户
const stickerUserTransferDialogVisible = ref(false);
const stickerUserTransferSubmitting = ref(false);
const stickerUserTransferUsersLoading = ref(false);
const stickerUserTransferUsersLoaded = ref(false);
const stickerUserTransferAction = ref<StickerUserTransferAction>("share");
const stickerUserTransferIds = ref<string[]>([]);
const stickerUserTransferTargetUserId = ref("");
const stickerUserTransferUserOptions = ref<StickerUserTransferUserOption[]>([]);

const stickerUserTransferDialogTitle = computed(() => {
  if (stickerUserTransferAction.value === "share") return t("material.quickShareToUser");
  if (stickerUserTransferAction.value === "copy") return t("material.copyToUser");
  return t("material.transferToUser");
});
const stickerUserTransferSubmitText = computed(() => {
  if (stickerUserTransferAction.value === "share") return t("material.confirmQuickShare");
  if (stickerUserTransferAction.value === "copy") return t("material.confirmCopy");
  return t("material.confirmTransfer");
});
const stickerUserTransferPreviewItems = computed(() => {
  return stickerUserTransferIds.value.slice(0, 5).map((id) => {
    const row = dataSource.value.find((item) => String(item.id) === String(id));
    return {
      id: String(id),
      label: row?.name || row?.nameEn || `ID: ${id}`,
    };
  });
});

// SVG转PNG相关状态
const svgToPngDialogVisible = ref(false);
const currentSvgRow = ref<any>(null);
const svgToPngForm = ref({
  width: 512,
  height: 512,
  originalWidth: 512,
  originalHeight: 512,
  aspectRatio: 1,
});

// 尺寸预设
const sizePresets = ref([
  { name: t("material.sizePresetSmall"), width: 64 },
  { name: t("material.sizePresetMedium"), width: 128 },
  { name: t("material.sizePresetLarge"), width: 256 },
  { name: t("material.sizePresetStandard"), width: 512 },
  { name: t("material.sizePresetHd"), width: 1024 },
  { name: t("material.sizePresetUhd"), width: 2048 },
  { name: t("material.sizePresetCommon"), width: 800 },
  { name: t("material.sizePresetMiddle"), width: 1200 },
  { name: t("material.sizePresetBig"), width: 1600 },
  { name: t("material.sizePresetExtraLarge"), width: 2400 },
]);

const filterDialogVisible = ref(false);
const isMobile = ref(false);
// 不再需要折叠状态，所有搜索字段始终显示

// PS 套图制作
const psdSetDialogVisible = ref(false);
const psdSetTemplates = ref<any[]>([]);
const psdSetTemplatesLoading = ref(false);
const selectedPsdTemplateIds = ref<string[]>([]);
// PSD模板文件夹相关
const selectedPsdFolderId = ref<string | null>("__root__");
const psdFolderTreeData = ref<any[]>([]);

// PSD模板分页相关
const psdSetTemplatePageParams = reactive({
  currentPage: 1,
  pageSize: 12,
  total: 0,
  suitableSizesArray: [] as string[], // 适用尺寸筛选
  cutoutModesArray: [] as string[], // 抠图模式筛选
});

// 批量详细配置相关状态
const batchDetailConfigDialogVisible = ref(false);
const templateConfigList = ref<
  Array<{
    id: string;
    name: string;
    thumbnail?: string;
    psdInfo: any;
    originalPsdInfo: any;
    configText: string;
    psdTemplateConfig?: any;
    materialId?: string | number; // 关联的素材ID
  }>
>([]);
const psdSetSubmitting = ref(false);
const materialPublishConfigDialogVisible = ref(false);
const materialPublishConfigLoading = ref(false);
const materialPublishConfigSubmitting = ref(false);
const materialPublishConfigSearchText = ref("");
const materialPublishConfigCurrentPage = ref(1);
const materialPublishConfigPageSize = ref(10);
const materialPublishConfigOptions = ref<any[]>([]);
const materialPublishConfigSelectedIds = ref<string[]>([]);
const materialPublishConfigGridRef = ref<any>(null);
const materialProductConfigDialogVisible = ref(false);
const materialProductConfigLoading = ref(false);
const materialProductConfigSubmitting = ref(false);
const materialProductConfigSearchText = ref("");
const materialProductConfigCurrentPage = ref(1);
const materialProductConfigPageSize = ref(10);
const materialProductConfigOptions = ref<any[]>([]);
const materialProductConfigSelectedIds = ref<string[]>([]);
const materialProductConfigGridRef = ref<any>(null);
const psdSetMergeSticker = ref(false);
const psdSetTemplateSearchText = ref("");
const psdSetAutomationDialogVisible = ref(false);
const psdSetAutomationPublishConfigsLoading = ref(false);
const psdSetAutomationPublishConfigs = ref<any[]>([]);
const psdSetAutomationPublishConfigSearchText = ref("");
const psdSetAutomationProductTemplatesLoading = ref(false);
const psdSetAutomationProductTemplates = ref<any[]>([]);
const psdSetAutomationProductTemplateSearchText = ref("");
const psdSetAutomationActions = ref([
  {
    key: "generate_product",
    label: t("material.autoGenerateProduct"),
    description: t("material.autoGenerateProductDesc"),
    enabled: false,
    params: {
      productGenerationTemplateIds: [] as string[],
    },
    fields: [
      {
        key: "productGenerationTemplateIds",
        label: t("material.productGenerationTemplate"),
        component: "product-template-list",
        placeholder: t("material.selectProductGenerationTemplates"),
      },
    ],
  },
  {
    key: "create_publish_task_from_config",
    label: t("material.autoGeneratePublishTask"),
    description: t("material.autoGeneratePublishTaskDesc"),
    enabled: false,
    params: {
      publishConfigIds: [] as string[],
    },
    fields: [
      {
        key: "publishConfigIds",
        label: t("material.taskConfig"),
        component: "publish-config-list",
        placeholder: t("material.selectTaskConfigs"),
      },
    ],
  },
]);

// PSD参数查看
const psdSetParamsDialogVisible = ref(false);
const psdSetParamsContent = ref("");

// PSD模板详情弹窗
const psdTemplateDetailDialogVisible = ref(false);
const currentPsdTemplate = ref<any>(null);

// 直接使用后端返回的模板列表（后端已过滤）
const filteredPsdSetTemplates = computed(() => {
  return psdSetTemplates.value;
});

// 判断是否所有可见模板都已选中
const isAllPsdTemplatesSelected = computed(() => {
  if (!filteredPsdSetTemplates.value.length) return false;
  return filteredPsdSetTemplates.value.every((tpl) =>
    selectedPsdTemplateIds.value.includes(String(tpl.id)),
  );
});

const psdSetTaskCount = computed(() =>
  isImageGroupPsdSet.value
    ? psdSetImageGroups.value.length * selectedPsdTemplateIds.value.length
    : psdSetMergeSticker.value
      ? selectedPsdTemplateIds.value.length
      : ids.value.length * selectedPsdTemplateIds.value.length,
);
function cacheSelectedMaterialRows(rows: any[] = []) {
  rows.forEach((row) => {
    if (!row?.id) return;
    selectedMaterialCache[String(row.id)] = {
      ...(selectedMaterialCache[String(row.id)] || {}),
      ...row,
    };
  });
}

const selectedMaterialsForPublishConfig = computed(() => {
  if (isImageGroupPsdSet.value) {
    return psdSetImageGroups.value.flatMap((group) =>
      (group.stickers || []).map((s: any) => ({
        ...s,
        groupName: group.name,
      })),
    );
  }
  return ids.value
    .map(
      (id) =>
        getMaterialById(id) || {
          id,
          name: t("material.materialWithId", { id }),
          url: "",
          suffix: "",
        },
    )
    .filter(Boolean);
});
const materialPublishConfigMissingPreviewIds = computed(() =>
  selectedMaterialsForPublishConfig.value
    .filter((material: any) => !getMaterialPreviewSource(material))
    .map((material: any) => String(material.id)),
);
const filteredMaterialPublishConfigs = computed(() => {
  const keyword = materialPublishConfigSearchText.value.trim().toLowerCase();
  return materialPublishConfigOptions.value
    .filter((item: any) => item?.isActive !== false)
    .filter((item: any) => {
      if (!keyword) {
        return true;
      }

      const taskTypeLabel = getTaskTypeLabel(
        item?.taskType || derivePublishTaskTypeByPlatform(item?.platform),
        item?.platform,
      ).toLowerCase();
      return (
        String(item?.name || "")
          .toLowerCase()
          .includes(keyword) ||
        String(item?.description || "")
          .toLowerCase()
          .includes(keyword) ||
        String(item?.platform || "")
          .toLowerCase()
          .includes(keyword) ||
        taskTypeLabel.includes(keyword)
      );
    });
});
const materialPublishConfigDataSource = computed(() => {
  const start = (materialPublishConfigCurrentPage.value - 1) * materialPublishConfigPageSize.value;
  const end = start + materialPublishConfigPageSize.value;
  return filteredMaterialPublishConfigs.value.slice(start, end);
});
const materialPublishConfigTaskCount = computed(() =>
  isImageGroupPsdSet.value
    ? psdSetImageGroups.value.length * materialPublishConfigSelectedIds.value.length
    : ids.value.length * materialPublishConfigSelectedIds.value.length,
);
const materialPublishConfigUsableCount = computed(
  () =>
    filteredMaterialPublishConfigs.value.filter((item: any) => isMaterialPublishConfigUsable(item))
      .length,
);
const materialPublishConfigGridOptions = computed(() => ({
  ...commonGridOptions,
  loading: false,
  rowConfig: { isHover: true, keyField: "id" },
  rowClassName: ({ row }: any) =>
    isMaterialPublishConfigUsable(row) ? "" : "material-publish-config-dialog__row--disabled",
  columnConfig: { resizable: true },
  checkboxConfig: {
    checkRowKeys: materialPublishConfigSelectedIds.value,
    highlight: true,
    trigger: "row" as const,
    checkMethod: ({ row }: any) => isMaterialPublishConfigUsable(row),
  },
  columns: [
    {
      type: "checkbox",
      width: 50,
      align: "center",
      headerAlign: "center",
    },
    {
      title: t('material.taskConfigName'),
      field: "name",
      minWidth: 200,
      showOverflow: true,
      slots: {
        default: "nameSlot",
      },
    },
    {
      title: t('material.platform'),
      field: "platform",
      width: 120,
      align: "center",
      headerAlign: "center",
      slots: {
        default: "platformSlot",
      },
    },
    {
      title: t('material.boundPsdTemplate'),
      field: "templateBinding",
      minWidth: 220,
      showOverflow: true,
      slots: {
        default: "templateBindingSlot",
      },
    },
    {
      title: t('material.taskType'),
      field: "taskType",
      width: 130,
      align: "center",
      headerAlign: "center",
      slots: {
        default: "taskTypeSlot",
      },
    },
    {
      title: t('material.configDescription'),
      field: "description",
      minWidth: 160,
      showOverflow: true,
      formatter: ({ cellValue }) => cellValue || "-",
    },
  ],
}));
const filteredMaterialProductConfigs = computed(() => {
  const keyword = materialProductConfigSearchText.value.trim().toLowerCase();
  return materialProductConfigOptions.value
    .filter((item: any) => item?.isActive !== false)
    .filter((item: any) => {
      if (!keyword) return true;
      return [item?.name, item?.productType, item?.tags]
        .map((value) => String(value || "").toLowerCase())
        .some((value) => value.includes(keyword));
    });
});
const materialProductConfigDataSource = computed(() => {
  const start = (materialProductConfigCurrentPage.value - 1) * materialProductConfigPageSize.value;
  return filteredMaterialProductConfigs.value.slice(
    start,
    start + materialProductConfigPageSize.value,
  );
});
const materialProductConfigTaskCount = computed(
  () => ids.value.length * materialProductConfigSelectedIds.value.length,
);
const materialProductConfigUsableCount = computed(
  () =>
    filteredMaterialProductConfigs.value.filter((item: any) =>
      isMaterialProductConfigUsable(item),
    ).length,
);
const materialProductConfigGridOptions = computed(() => ({
  ...commonGridOptions,
  loading: false,
  rowConfig: { isHover: true, keyField: "id" },
  rowClassName: ({ row }: any) =>
    isMaterialProductConfigUsable(row) ? "" : "material-publish-config-dialog__row--disabled",
  columnConfig: { resizable: true },
  checkboxConfig: {
    checkRowKeys: materialProductConfigSelectedIds.value,
    highlight: true,
    trigger: "row" as const,
    checkMethod: ({ row }: any) => isMaterialProductConfigUsable(row),
  },
  columns: [
    { type: "checkbox" as any, width: 60, align: "center" as any },
    { field: "name", title: t("material.productConfig"), minWidth: 180, showOverflow: true },
    {
      field: "productType",
      title: t("material.productType"),
      width: 140,
      formatter: ({ cellValue }: any) => String(cellValue || "").trim() || t("material.aiAutoRecognize"),
    },
    {
      field: "pricingMode",
      title: t("material.pricingStrategy"),
      width: 110,
      formatter: ({ cellValue }: any) => (cellValue === "ai" ? t("material.aiGenerated") : t("material.fixedPrice")),
    },
    {
      field: "psdTemplateId",
      title: t("material.psdTemplate"),
      width: 170,
      formatter: ({ row }: any) =>
        isMaterialProductConfigUsable(row) ? t("material.bound") : t("material.notBound"),
    },
    {
      field: "autoPublish",
      title: t("material.publishAfterGenerate"),
      width: 110,
      formatter: ({ cellValue }: any) => (cellValue === false ? t("material.no") : t("material.yes")),
    },
  ],
}));
const filteredPsdSetAutomationPublishConfigs = computed(() => {
  const keyword = psdSetAutomationPublishConfigSearchText.value.trim().toLowerCase();
  if (!keyword) {
    return psdSetAutomationPublishConfigs.value;
  }
  return psdSetAutomationPublishConfigs.value.filter((item: any) => {
    const taskTypeLabel = getTaskTypeLabel(
      item?.taskType || derivePublishTaskTypeByPlatform(item?.platform),
      item?.platform,
    ).toLowerCase();
    return [item?.name, item?.description, item?.platform]
      .map((value) => String(value || "").toLowerCase())
      .some((value) => value.includes(keyword)) || taskTypeLabel.includes(keyword);
  });
});
const filteredPsdSetAutomationProductTemplates = computed(() => {
  const keyword = psdSetAutomationProductTemplateSearchText.value.trim().toLowerCase();
  if (!keyword) {
    return psdSetAutomationProductTemplates.value;
  }
  return psdSetAutomationProductTemplates.value.filter((item: any) =>
    [item?.name, item?.productType, item?.tags]
      .map((value) => String(value || "").toLowerCase())
      .some((value) => value.includes(keyword)),
  );
});
const psdSetAutomationProductTemplateColumns: any[] = [
  { type: "checkbox", width: 48 },
  { field: "name", title: t("material.templateName"), minWidth: 180, showOverflow: true },
  { field: "productType", title: t("material.productType"), width: 120, showOverflow: true },
  {
    field: "salePrice",
    title: t("material.salePrice"),
    width: 90,
    formatter: ({ cellValue }: any) => {
      const amount = Number(cellValue || 0);
      return amount > 0 ? amount.toFixed(2) : "-";
    },
  },
  { field: "stock", title: t("material.stock"), width: 80 },
  { field: "tags", title: t("material.tags"), minWidth: 180, showOverflow: true },
];
const psdSetAutomationPublishConfigColumns: any[] = [
  { type: "checkbox", width: 48 },
  {
    field: "taskType",
    title: t("material.taskType"),
    width: 170,
    formatter: ({ row }: any) =>
      getTaskTypeLabel(
        row?.taskType || derivePublishTaskTypeByPlatform(row?.platform),
        row?.platform,
      ),
  },
  { field: "name", title: t("material.configName"), minWidth: 180, showOverflow: true },
  { field: "platform", title: t("material.platform"), width: 110, showOverflow: true },
  { field: "description", title: t("material.remark"), minWidth: 220, showOverflow: true },
];
const enabledPsdSetAutomationCount = computed(
  () => psdSetAutomationActions.value.filter((action) => action.enabled).length,
);
const enabledPsdSetAutomationKeys = computed(() =>
  psdSetAutomationActions.value.filter((action) => action.enabled).map((action) => action.key),
);
const relatedPsdSetDialogRef = ref<any>(null);

// PSD制作套图允许的图片格式（固定为这三个）
const psdSetAllowedFormats = ["jpg", "png", "jpeg", "svg", "webp"];

// 获取当前选中PSD模板的允许格式
const allowedFormatsForSelectedTemplates = computed(() => {
  // 固定返回允许的格式列表
  return psdSetAllowedFormats;
});

// 检查是否有不符合格式的素材
const hasInvalidFormatMaterials = computed(() => {
  if (!psdSetSelectedMaterialIds.value.length) return false;

  const allowedFormatsSet = new Set(psdSetAllowedFormats);

  return psdSetSelectedMaterialIds.value.some((id) => {
    const material = getMaterialById(id);
    if (!material) return false;

    const materialSuffix = (material.suffix || "").toLowerCase().replace(/^\./, "");
    if (!materialSuffix) return true; // 没有后缀视为无效

    return !allowedFormatsSet.has(materialSuffix);
  });
});

// 获取不符合格式的素材列表（用于提示）
const invalidFormatMaterialsList = computed(() => {
  const allowedFormatsSet = new Set(psdSetAllowedFormats);
  const invalidList: Array<{ name: string; suffix: string }> = [];

  psdSetSelectedMaterialIds.value.forEach((id) => {
    const material = getMaterialById(id);
    if (!material) return;

    const materialSuffix = (material.suffix || "").toLowerCase().replace(/^\./, "");
    if (!materialSuffix || !allowedFormatsSet.has(materialSuffix)) {
      invalidList.push({
        name: material.name || `ID: ${material.id}`,
        suffix: materialSuffix || t("material.unknownFormat"),
      });
    }
  });

  return invalidList;
});
const psdSetDialogTitle = computed(() =>
  isImageGroupPsdSet.value
    ? t("material.groupPsdWorkbench")
    : psdSetMergeSticker.value
      ? t("material.multiPsdWorkbench")
      : t("material.psWorkbench"),
);

// 处理上传

const uploadModalVisible = ref(false);

function uploadModalClose() {
  // 关闭时更新 currentUploadInfo，确保下次打开时使用当前选中的文件夹
  currentUploadInfo.value = {
    path: "",
    folderId: getSelectedStickerFolderTargetId(),
    folderPath: selectedStickerFolderPath.value || "",
    folder: selectedStickerFolderPath.value || "",
  };
}

// 打开上传对话框时，更新当前上传信息
watch(uploadModalVisible, (visible) => {
  if (visible) {
    currentUploadInfo.value = {
      path: "",
      folderId: getSelectedStickerFolderTargetId(),
      folderPath: selectedStickerFolderPath.value || "",
      folder: selectedStickerFolderPath.value || "",
    };
  }
});

async function getList() {
  loading.value = true;
  vectorSimilarSearchActive.value = false;
  similarImageActivePreviewUrl.value = "";
  similarImageActiveSourceType.value = "";
  similarImageActiveSourceLabel.value = "";
  stickerDetailCache.clear();
  if (phashSearchDisabled) {
    queryParams.phash = "";
  }
  // 立即清空旧数据，确保旧图片被销毁
  dataSource.value = [];

  // 构建查询参数，确保 suffix 和 sizeShape 数组格式正确传递；空字符串转为 null 以兼容后端
  const phash = phashSearchDisabled ? "" : String(queryParams.phash || "").trim();
  const searchText = String(queryParams.searchText || "").trim();
  const suffixList = Array.isArray(queryParams.suffix)
    ? queryParams.suffix
    : queryParams.suffix
      ? [queryParams.suffix]
      : [];
  const sizeShapeList = Array.isArray(queryParams.sizeShape)
    ? queryParams.sizeShape
    : queryParams.sizeShape
      ? [queryParams.sizeShape]
      : [];
  const params = {
    ...queryParams,
    listMode: "compact",
    includeRelations: true,
    keyword: undefined,
    searchText: searchText || undefined,
    id: String(queryParams.id || "").trim() || undefined,
    phash: phash || undefined,
    phashMode: phash ? queryParams.phashMode : undefined,
    startTime: queryParams.startTime || undefined,
    endTime: queryParams.endTime || undefined,
    folderId: getStickerFolderFilterForQuery(queryParams.folderId),
    isCustom: queryParams.isCustom === "" ? null : queryParams.isCustom,
    isInfringement: queryParams.isInfringement === "" ? null : queryParams.isInfringement,
    isCutout: queryParams.isCutout === "" ? null : queryParams.isCutout,
    seamless: queryParams.seamless === "" ? null : queryParams.seamless,
    suffix: suffixList.length ? suffixList : undefined,
    sizeShape: sizeShapeList.length ? sizeShapeList : undefined,
    publishUsageConfigId: queryParams.publishUsageConfigId.length
      ? queryParams.publishUsageConfigId
      : undefined,
  };

  let res = await getMaterialList(params).finally(() => {
    loading.value = false;
  });
  // 将后端返回的宽高/比例信息映射到列表行数据，便于展示
  dataSource.value = normalizeMaterialListRows(res.list || []);
  total.value = res.total;

  cacheSelectedMaterialRows(dataSource.value.filter((item) => ids.value.includes(String(item.id))));

  // 列表渲染完成后挂载拖拽
  nextTick(setupRowDrag);
}

function normalizeMaterialListRows(items: any[]) {
  return (items || []).map((item) => {
    const width = item.width;
    const height = item.height;
    const aspectRatio = item.aspectRatio || (width && height ? width / height : undefined);
    const shapeConfig = aspectRatio ? getSizeShapeByRatio(aspectRatio) : undefined;
    const shapeLabel = shapeConfig
      ? shapeConfig.group === "portrait"
        ? t("material.longImage")
        : shapeConfig.group === "landscape"
          ? t("material.wide")
          : t("material.squareImage")
      : "";
    const rawScore = Number(item._score ?? item.score ?? 0);
    const similarity =
      item.similarity !== undefined
        ? Number(item.similarity)
        : rawScore > 0
          ? Math.min(100, Math.max(0, rawScore * 100))
          : undefined;

    return {
      ...item,
      resolutionWidth: width ?? item.resolutionWidth,
      resolutionHeight: height ?? item.resolutionHeight,
      aspectRatio,
      shapeLabel,
      similarity,
      _imageError: false,
    };
  });
}

async function loadVectorSimilarResults(imageUrl: string, resetPage = true): Promise<boolean> {
  if (!imageUrl) {
    ElMessage.warning(t("material.noSearchableImageUrl"));
    return false;
  }

  loading.value = true;
  stickerDetailCache.clear();
  dataSource.value = [];
  if (resetPage) {
    queryParams.currentPage = 1;
    queryParams.pageSize = similarImageSearchLimit.value;
  }
  try {
    const offset = (queryParams.currentPage - 1) * queryParams.pageSize;
    const result = await searchStickerByImage({
      imageUrl,
      mode: "visual",
      limit: queryParams.pageSize,
      offset,
    });
    const items = normalizeMaterialListRows(result?.results || []);
    dataSource.value = items;
    total.value = result?.total || items.length;
    similarImageSearchMeta.value = result?.meta || null;
    queryParams.phash = "";
    vectorSimilarSearchActive.value = true;
    cacheSelectedMaterialRows(dataSource.value.filter((item) => ids.value.includes(String(item.id))));
    nextTick(setupRowDrag);
    return true;
  } catch (error: any) {
    vectorSimilarSearchActive.value = false;
    similarImageSearchMeta.value = null;
    const errorMsg = error?.message || "";
    const lowerMsg = errorMsg.toLowerCase();
    // 检测模型服务不可用的错误
    if (
      lowerMsg.includes("connection refused") ||
      lowerMsg.includes("econnrefused") ||
      lowerMsg.includes("model service") ||
      lowerMsg.includes("模型服务")
    ) {
      ElMessage.error(t("material.modelServiceNotStarted"));
    } else {
      ElMessage.error(errorMsg || t("material.searchFailed"));
    }
    return false;
  } finally {
    loading.value = false;
  }
}

async function loadVectorSimilarTextResults(text: string, resetPage = true): Promise<boolean> {
  if (!text?.trim()) {
    ElMessage.warning(t("material.enterSearchText"));
    return false;
  }

  loading.value = true;
  stickerDetailCache.clear();
  dataSource.value = [];
  if (resetPage) {
    queryParams.currentPage = 1;
    queryParams.pageSize = similarImageSearchLimit.value;
  }
  try {
    const offset = (queryParams.currentPage - 1) * queryParams.pageSize;
    const result = await searchStickerByText({
      text: text.trim(),
      limit: queryParams.pageSize,
      offset,
    });
    const items = normalizeMaterialListRows(result?.results || []);
    dataSource.value = items;
    total.value = result?.total || items.length;
    similarImageSearchMeta.value = result?.meta || null;
    queryParams.phash = "";
    vectorSimilarSearchActive.value = true;
    cacheSelectedMaterialRows(dataSource.value.filter((item) => ids.value.includes(String(item.id))));
    nextTick(setupRowDrag);
    return true;
  } catch (error: any) {
    vectorSimilarSearchActive.value = false;
    similarImageSearchMeta.value = null;
    const errorMsg = error?.message || "";
    const lowerMsg = errorMsg.toLowerCase();
    // 检测模型服务不可用的错误
    if (
      lowerMsg.includes("connection refused") ||
      lowerMsg.includes("econnrefused") ||
      lowerMsg.includes("model service") ||
      lowerMsg.includes("模型服务")
    ) {
      ElMessage.error(t("material.modelServiceNotStarted"));
    } else {
      ElMessage.error(errorMsg || t("material.textSearchFailed"));
    }
    return false;
  } finally {
    loading.value = false;
  }
}

function openSimilarImageDialog(defaultImageUrl = "") {
  if (visualSimilarSearchDisabled) {
    ElMessage.warning(VISUAL_SIMILAR_SEARCH_DISABLED_MESSAGE);
    return;
  }
  if (defaultImageUrl) {
    similarImageSearchTab.value = "url";
    similarImageUrl.value = defaultImageUrl;
  }
  similarImageDialogVisible.value = true;
}

function setSimilarImageActiveStatus(options: {
  previewUrl: string;
  sourceType: "url" | "file";
  sourceLabel?: string;
}) {
  similarImageActivePreviewUrl.value = options.previewUrl;
  similarImageActiveSourceType.value = options.sourceType;
  similarImageActiveSourceLabel.value = options.sourceLabel || "";
}

async function clearSimilarImageSearchResults() {
  vectorSimilarSearchActive.value = false;
  similarImageActivePreviewUrl.value = "";
  similarImageActiveSourceType.value = "";
  similarImageActiveSourceLabel.value = "";
  similarImageSearchMeta.value = null;
  queryParams.currentPage = 1;
  queryParams.pageSize = 20; // 恢复默认分页大小
  await getList();
}

async function handlePagination() {
  if (vectorSimilarSearchActive.value) {
    if (similarImageActiveSourceType.value === "text") {
      await loadVectorSimilarTextResults(similarImageActiveSourceLabel.value, false);
    } else {
      await loadVectorSimilarResults(similarImageActivePreviewUrl.value, false);
    }
  } else {
    await getList();
  }
}

function releaseSimilarImagePreviewUrl() {
  if (similarImageFilePreviewUrl.value) {
    URL.revokeObjectURL(similarImageFilePreviewUrl.value);
    similarImageFilePreviewUrl.value = "";
  }
}

function resetSimilarImageDialog() {
  similarImageUrl.value = "";
  similarImageFile.value = null;
  similarImageFileName.value = "";
  similarImageSearchText.value = "";
  releaseSimilarImagePreviewUrl();
}

function handleSimilarImageUploadChange(uploadFile: any) {
  const file = uploadFile?.raw as File | undefined;
  if (!file) return;

  if (!file.type.startsWith("image/")) {
    ElMessage.warning(t("material.selectImageFile"));
    return;
  }

  releaseSimilarImagePreviewUrl();
  similarImageFile.value = file;
  similarImageFileName.value = file.name || t("material.localImage");
  similarImageFilePreviewUrl.value = URL.createObjectURL(file);
  similarImageSearchTab.value = "file";
}

function isValidRemoteImageUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

async function submitSimilarImageSearch() {
  if (visualSimilarSearchDisabled) {
    ElMessage.warning(VISUAL_SIMILAR_SEARCH_DISABLED_MESSAGE);
    return;
  }

  // 检查模型服务是否可用
  if (modelServiceHealth.checked && !modelServiceHealth.available) {
    ElMessage.warning(t("material.modelServiceNotStarted"));
    return;
  }

  similarImageSubmitting.value = true;
  try {
    // Handle text search
    if (similarImageSearchTab.value === "text") {
      const searchText = similarImageSearchText.value.trim();
      if (!searchText) {
        ElMessage.warning(t("material.enterSearchText"));
        return;
      }
      const success = await loadVectorSimilarTextResults(searchText);
      if (success) {
        setSimilarImageActiveStatus({
          previewUrl: "",
          sourceType: "text",
          sourceLabel: searchText,
        });
        similarImageDialogVisible.value = false;
      }
      return;
    }

    let imageUrl = "";
    let activePreviewUrl = "";
    let activeSourceType: "url" | "file" = "url";
    let activeSourceLabel = "";
    if (similarImageSearchTab.value === "url") {
      imageUrl = similarImageUrl.value.trim();
      if (!imageUrl) {
        ElMessage.warning(t("material.enterImageUrl"));
        return;
      }
      if (!isValidRemoteImageUrl(imageUrl)) {
        ElMessage.warning(t("material.enterValidHttpUrl"));
        return;
      }
      activePreviewUrl = imageUrl;
      activeSourceType = "url";
      activeSourceLabel = t("material.imageUrl");
    } else {
      const file = similarImageFile.value;
      if (!file) {
        ElMessage.warning(t("material.selectLocalImage"));
        return;
      }
      imageUrl = await readImageFileAsSearchDataUrl(file);
      activePreviewUrl = imageUrl;
      activeSourceType = "file";
      activeSourceLabel = file.name || similarImageFileName.value || t("material.localImage");
    }

    const success = await loadVectorSimilarResults(imageUrl);
    if (success) {
      setSimilarImageActiveStatus({
        previewUrl: activePreviewUrl,
        sourceType: activeSourceType,
        sourceLabel: activeSourceLabel,
      });
      similarImageDialogVisible.value = false;
    }
  } catch (error: any) {
    ElMessage.error(error?.message || t("material.readImageFailed"));
  } finally {
    similarImageSubmitting.value = false;
  }
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error || new Error(t("material.readImageFailed")));
    reader.readAsDataURL(file);
  });
}

async function readImageFileAsSearchDataUrl(file: File): Promise<string> {
  const fallback = () => readFileAsDataUrl(file);

  if (!file.type.startsWith("image/") || file.type.includes("svg")) {
    return fallback();
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(t("material.imageDecodeFailed")));
      img.src = objectUrl;
    });

    const maxSide = 1024;
    const scale = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight));
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return fallback();
    ctx.drawImage(image, 0, 0, width, height);

    return await new Promise<string>((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error(t("material.imageCompressFailed")));
            return;
          }
          readFileAsDataUrl(new File([blob], file.name || "search-image.jpg", { type: blob.type }))
            .then(resolve)
            .catch(reject);
        },
        "image/jpeg",
        0.86,
      );
    });
  } catch {
    return fallback();
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function normalizeStickerDetailResponse(res: any) {
  if (!res) return null;
  if (res.id) return res;
  if (res.data?.id) return res.data;
  if (Array.isArray(res.list) && res.list[0]) return res.list[0];
  if (Array.isArray(res.data?.list) && res.data.list[0]) return res.data.list[0];
  return null;
}

async function fetchStickerDetail(rowOrId: any) {
  const id = String(typeof rowOrId === "object" ? rowOrId?.id : rowOrId || "").trim();
  if (!id) {
    throw new Error(t("material.missingMaterialId"));
  }

  const cached = stickerDetailCache.get(id);
  if (cached) {
    return cached;
  }

  const detail = normalizeStickerDetailResponse(await getStickerById(id));
  if (!detail) {
    throw new Error(t("material.materialDetailNotFound"));
  }

  const row = dataSource.value.find((item: any) => String(item.id) === id);
  const merged = row ? { ...row, ...detail } : detail;
  stickerDetailCache.set(id, merged);
  if (row) {
    Object.assign(row, merged);
  }
  return merged;
}

onUnmounted(() => {
  hideAllOperationSubmenus();
  operationDropdownRefs.clear();
  resetAfterDrop();
  releaseSimilarImagePreviewUrl();
});

// phash相似图片搜索
async function handlePhashSearch() {
  if (phashSearchDisabled) {
    ElMessage.warning(PHASH_SEARCH_DISABLED_MESSAGE);
    return;
  }
  // 去除phash值的前后空格
  queryParams.phash = queryParams.phash.trim();

  if (!queryParams.phash) {
    ElMessage.warning(t("material.enterPhashOrUrl"));
    return;
  }

  // 重置页码
  queryParams.currentPage = 1;
  // 调用现有的getList函数，它会自动检测phash参数并调用相似度搜索
  await getList();
}

// phash输入框失去焦点时自动trim
function onPhashInputBlur() {
  if (phashSearchDisabled) {
    return;
  }
  queryParams.phash = queryParams.phash.trim();
}

// 清空phash搜索
function clearPhashSearch() {
  queryParams.phash = "";
  queryParams.currentPage = 1;
  getList();
}

// 文件夹相关状态
const folderTreeCollapsed = useLocalStorage("material_folder_collapsed", false);
const selectedStickerFolderId = ref<string | null>(FOLDER_FILTER.ALL);
const selectedStickerFolderPath = ref("");
const stickerFolderTreeData = ref<any[]>([]);

function getSelectedStickerFolderTargetId() {
  if (
    selectedStickerFolderId.value === FOLDER_FILTER.ALL ||
    selectedStickerFolderId.value === FOLDER_FILTER.NOT_GROUP
  ) {
    return null;
  }
  return selectedStickerFolderId.value;
}

function getStickerFolderFilterForQuery(folderId: string | null | undefined) {
  if (folderId === FOLDER_FILTER.ALL || folderId === undefined || folderId === null) {
    return undefined;
  }
  if (folderId === FOLDER_FILTER.NOT_GROUP) {
    return "root";
  }
  return folderId;
}

// 加载文件夹树
async function loadStickerFolderTree() {
  try {
    const res = await getStickerFolderTree({ folderCategory: FOLDER_CATEGORY });
    const rootFolders = (res || []).filter(
      (folder: any) => folder.parentId === null || folder.parentId === undefined,
    );

    const allNode = {
      id: FOLDER_FILTER.ALL,
      name: t("material.all"),
      path: "",
      parentId: null,
      children: [] as any[],
      isAll: true,
    };

    const rootNode = {
      id: FOLDER_FILTER.NOT_GROUP,
      name: t("material.uncategorized"),
      path: "",
      parentId: null,
      children: [] as any[],
      stickerCount: 0,
    };

    stickerFolderTreeData.value = [allNode, rootNode, ...rootFolders];
    if (!selectedStickerFolderId.value) {
      selectedStickerFolderId.value = FOLDER_FILTER.ALL;
    }
  } catch (error) {
    console.error("加载文件夹失败:", error);
    ElMessage.error(t("material.folderLoadFailed"));
  }
}

function handleStickerFolderChange(payload: { folderId: string | null; node?: any }) {
  const { folderId, node } = payload;
  selectedStickerFolderId.value = folderId;
  selectedStickerFolderPath.value =
    folderId && folderId !== FOLDER_FILTER.ALL && folderId !== FOLDER_FILTER.NOT_GROUP
      ? node?.path || ""
      : "";
  queryParams.folderId = folderId;
  queryParams.currentPage = 1;
  getList();
}

// 拖拽到文件夹时的交互
async function handleFolderDrop(payload: { data: any }) {
  markExternalFolderDropHandled();
  if (!dragState.draggingIds.length) return;
  if (payload.data.id === FOLDER_FILTER.ALL) {
    resetAfterDrop();
    return;
  }

  const targetFolderId = payload.data.id === FOLDER_FILTER.NOT_GROUP ? null : payload.data.id;
  const targetPath = payload.data.path || "";
  const movingIds = [...dragState.draggingIds];

  try {
    await batchMoveStickers({ ids: movingIds, folderId: targetFolderId });
    ElMessage.success(t("material.movedToFolder", { count: movingIds.length, path: targetPath || t("material.rootDirectory") }));

    await loadStickerFolderTree();
    await getList();
    resetCheckStatus(ids);
  } catch (error) {
    ElMessage.error((error as Error).message || t("material.moveFailed"));
  } finally {
    resetAfterDrop();
  }
}

// 文件夹变更时，同步更新上传信息
watch(selectedStickerFolderPath, (newPath) => {
  currentUploadInfo.value = {
    ...currentUploadInfo.value,
    folderPath: newPath || "",
    folder: newPath || "",
    folderId: getSelectedStickerFolderTargetId(),
  };
});

// 初始化时加载文件夹树
loadStickerFolderTree();

loadPublishUsageConfigOptions();
getList();

// 批量移动素材到文件夹
async function handleBatchMoveToFolder() {
  if (!ids.value.length) {
    return ElMessage.warning(t("material.selectMaterialsToMove"));
  }

  try {
    const targetFolderId = getSelectedStickerFolderTargetId();
    const targetFolderPath = selectedStickerFolderPath.value || "";

    await batchMoveStickers({ ids: ids.value, folderId: targetFolderId });
    ElMessage.success(
      t("material.moveSuccess", {
        count: ids.value.length,
        target: targetFolderPath
          ? t("material.toPath", { path: targetFolderPath })
          : t("material.toRoot"),
      }),
    );
    getList();
    ids.value = [];
    resetCheckStatus(ids);
  } catch (error) {
    ElMessage.error((error as Error).message || t("material.moveFailed"));
  }
}

getList();

// 操作函数
function handleQuery() {
  queryParams.currentPage = 1;
}

function resetQuery() {
  getList();
}

// 移动端筛选提交
function onMobileFilterSubmit() {
  filterDialogVisible.value = false;
  getList();
}

// 下载
function handleMultiDownload() {
  if (!ids.value.length) {
    return ElMessage.warning(t("material.selectDataToDownload"));
  }

  // 处理图片下载
  try {
    ids.value.forEach(async (id, index) => {
      let row = dataSource.value.find((item) => {
        return item.id == id;
      });

      if (!row) {
        return;
      }
      setTimeout(async () => {
        try {
          const downloadUrl = row.url || row.ossObjectName;
          const fileName = row.name || row.imageName || `image_${id}.jpg`;

          if (!downloadUrl) {
            ElMessage.error(t("material.downloadFailedMissingLink", { fileName }));
            return;
          }

          // 使用新的下载函数，确保文件被下载而不是打开新页面
          await downloadImage(downloadUrl, fileName);
          ElNotification.success(t("material.downloadSuccess", { fileName }));
        } catch (error) {
          console.error("下载失败:", error);
          ElMessage.error(t("material.downloadFailed", { message: error.message }));
        }
      }, 500 * index);
    });
  } catch (e) {
    console.error("批量下载失败:", e);
    ElMessage.error(t("material.batchDownloadFailed"));
  }
}

async function handleDelete(row?) {
  let delIds: any = null;
  if (row) {
    delIds = [row.id];
  } else {
    delIds = Array.isArray(ids.value) ? [...ids.value] : [];
    if (!delIds.length) {
      return ElMessage.warning(t("material.selectDataToDelete"));
    }
  }

  const targetItems = delIds.map(
    (id: any) =>
      dataSource.value.find((item: any) => String(item.id) === String(id)) ||
      selectedMaterialCache[String(id)] ||
      (row && String(row.id) === String(id) ? row : null),
  ).filter(Boolean);

  const sharedItems = targetItems.filter(
    (item: any) =>
      item.isShared ||
      item.resourceLibraryId ||
      item.shareType ||
      (item.sourceUserId && String(item.sourceUserId) !== String(item.userId)),
  );

  let confirmMsg = t("material.confirmDeleteData");
  if (sharedItems.length > 0) {
    const sampleNames = sharedItems
      .slice(0, 3)
      .map((i: any) => `「${i.name || i.code || i.id}」`)
      .join("、");
    const moreText = sharedItems.length > 3 ? ` 等共 ${sharedItems.length} 项` : "";
    confirmMsg = `选中的素材中包含已发布到素材中心或已共享给其他用户的资源（如 ${sampleNames}${moreText}）。删除后相关记录将被移除，是否确认继续删除？`;
  }

  try {
    await ElMessageBox.confirm(confirmMsg, t("material.deleteTip"), {
      confirmButtonText: t("material.confirm"),
      cancelButtonText: t("material.cancel"),
      type: sharedItems.length > 0 ? "warning" : "error",
    });
    delIds = delIds.map((id: any) => String(id));
    deleteLoading.value = true;
    await deleteAssetLibrary({ ids: delIds });
    ElNotification.success(t("material.deleteSuccess"));
    resetCheckStatus(ids);
    await getList();
  } catch (error: any) {
    if (error === "cancel" || error === "close" || error?.action === "cancel" || error?.action === "close") {
      return;
    }
    console.error("删除失败:", error);
    ElMessage.error(error?.message || t("material.deleteFailed"));
  } finally {
    deleteLoading.value = false;
  }
}
function checkboxChange(e) {
  const records = Array.isArray(e.records) ? e.records : [];
  const reserves = Array.isArray(e.reserves) ? e.reserves : [];
  cacheSelectedMaterialRows([...records, ...reserves]);
  ids.value = [...records.map((item) => item.id), ...reserves.map((item) => item.id)];
}

function checkboxAllChange(e) {
  const records = Array.isArray(e.records) ? e.records : [];
  const reserves = Array.isArray(e.reserves) ? e.reserves : [];
  cacheSelectedMaterialRows([...records, ...reserves]);
  ids.value = [...records.map((item) => item.id), ...reserves.map((item) => item.id)];
}

function removeSelectedMaterial(materialId: string | number) {
  const normalizedId = String(materialId);
  ids.value = ids.value.filter((id) => String(id) !== normalizedId);
  const tableRef = gridRef.value;
  const row =
    dataSource.value.find((item) => String(item.id) === normalizedId) ||
    selectedMaterialCache[normalizedId];
  if (row) {
    tableRef?.setCheckboxRow?.(row, false);
  }
  tableRef?.removeCheckboxReserveRow?.(row || { id: normalizedId });
  if (!ids.value.length) {
    materialPublishConfigSelectedIds.value = [];
    selectedPsdTemplateIds.value = [];
  }
}

async function handleDownload(row) {
  // 处理图片下载
  try {
    const downloadUrl = row.url || row.ossObjectName;
    const fileName = row.name || row.imageName || `image_${row.id}.jpg`;

    if (!downloadUrl) {
      ElMessage.error(t("material.downloadFailedMissingLink", { fileName }));
      return;
    }

    // 使用新的下载函数，确保文件被下载而不是打开新页面
    await downloadImage(downloadUrl, fileName);
    ElNotification.success(t("material.downloadSuccess", { fileName }));
  } catch (error) {
    console.error("下载失败:", error);
    ElMessage.error(t("material.downloadFailed", { message: error.message }));
  }
}

async function handleDownloadRotated90(row) {
  try {
    const originalUrl = row.url || row.ossObjectName;
    const fileName = row.name || row.imageName || `image_${row.id}.jpg`;

    if (!originalUrl) {
      ElMessage.error(t("material.downloadFailedMissingLink", { fileName }));
      return;
    }

    const rotatedUrl = getRotatedImageUrl(originalUrl, 90);
    if (!rotatedUrl) {
      ElMessage.error(t("material.rotateNotSupported", { fileName }));
      return;
    }

    // 给文件名加上旋转标记
    const dotIndex = fileName.lastIndexOf('.');
    const rotatedFileName = dotIndex > 0
      ? `${fileName.substring(0, dotIndex)}_rotated90${fileName.substring(dotIndex)}`
      : `${fileName}_rotated90`;

    await downloadImage(rotatedUrl, rotatedFileName);
    ElNotification.success(t("material.rotatedDownloadSuccess", { fileName: rotatedFileName }));
  } catch (error) {
    console.error("旋转下载失败:", error);
    ElMessage.error(t("material.rotatedDownloadFailed", { message: error.message }));
  }
}

// 复制单个素材
async function handleCopy(row) {
  try {
    const res = await copyStickers({ ids: String(row.id) });
    const count = Array.isArray(res?.list) ? res.list.length : 1;
    ElMessage.success(t("material.copySuccessCount", { count }));
    getList();
  } catch (e) {
    ElMessage.error(t("material.copyFailed"));
  }
}

function ensureStickerAdminOperation() {
  if (!isAdmin.value) {
    ElMessage.warning(t("material.adminOnlyOperation"));
    return false;
  }
  return true;
}

async function loadStickerTransferUserOptions() {
  if (stickerUserTransferUsersLoading.value || stickerUserTransferUsersLoaded.value) {
    return;
  }

  stickerUserTransferUsersLoading.value = true;
  try {
    const res = await getUserList({ currentPage: 1, pageSize: 1000 });
    stickerUserTransferUserOptions.value = (res?.list || []).map((item: any) => ({
      id: String(item.id),
      name: String(item.name || "").trim(),
      account: String(item.account || "").trim(),
      label: t("material.userOptionLabel", { name: item.name || item.account || t("material.userWithId", { id: item.id }), account: item.account || item.id }),
      isAdmin: !!item.isAdmin,
    }));
    stickerUserTransferUsersLoaded.value = true;
  } catch (error: any) {
    ElMessage.error(error?.message || t("material.userListLoadFailed"));
  } finally {
    stickerUserTransferUsersLoading.value = false;
  }
}

function resetStickerUserTransferDialog() {
  stickerUserTransferSubmitting.value = false;
  stickerUserTransferAction.value = "copy";
  stickerUserTransferIds.value = [];
  stickerUserTransferTargetUserId.value = "";
}

async function openStickerUserTransferDialog(action: StickerUserTransferAction, row?: any) {
  if (action === "move" && !ensureStickerAdminOperation()) {
    return;
  }

  const targetIds = row
    ? [String(row.id)]
    : (Array.isArray(ids.value) ? ids.value : []).map((id) => String(id)).filter(Boolean);

  if (!targetIds.length) {
    ElMessage.warning(t("material.selectMaterialsToOperate"));
    return;
  }

  stickerUserTransferAction.value = action;
  stickerUserTransferIds.value = Array.from(new Set(targetIds));
  stickerUserTransferTargetUserId.value = "";
  await loadStickerTransferUserOptions();
  stickerUserTransferDialogVisible.value = true;
}

async function handleBatchPublishToLibrary() {
  const targetIds = (Array.isArray(ids.value) ? ids.value : []).map(String).filter(Boolean);
  if (!targetIds.length) {
    return ElMessage.warning(t("material.selectMaterialsToOperate"));
  }
  try {
    await ElMessageBox.confirm(`确认将选中的 ${targetIds.length} 项贴纸素材发布到公共资源广场吗？`, "发布提示", {
      confirmButtonText: "确认发布",
      cancelButtonText: "取消",
      type: "info",
    });
    await ResourceLibraryApi.batchPublish({
      resourceType: "sticker",
      ids: targetIds,
    });
    ElMessage.success("已成功发布到公共贴纸素材库");
  } catch {
    // cancel
  }
}

async function openShareRecordsDialog(row: any) {
  shareRecordsResourceName.value = row.name || `ID: ${row.id}`;
  shareRecordsDialogVisible.value = true;
  shareRecordsLoading.value = true;
  shareRecordsList.value = [];
  try {
    const res = await getStickerSharedRecords(String(row.id));
    shareRecordsList.value = res?.list || [];
    shareRecordsTotal.value = res?.total || 0;
  } catch (e: any) {
    ElMessage.error(e?.message || t('material.shareRecordsLoadFailed'));
  } finally {
    shareRecordsLoading.value = false;
  }
}

async function submitStickerUserTransfer() {
  if (stickerUserTransferAction.value === "move" && !ensureStickerAdminOperation()) {
    return;
  }

  if (!stickerUserTransferIds.value.length) {
    ElMessage.warning(t("material.selectMaterialsToOperate"));
    return;
  }

  if (!stickerUserTransferTargetUserId.value) {
    ElMessage.warning(t("material.selectTargetUser"));
    return;
  }

  stickerUserTransferSubmitting.value = true;
  const actionLabel =
    stickerUserTransferAction.value === "share"
      ? t("material.quickShare")
      : stickerUserTransferAction.value === "copy"
        ? t("material.copyCopy")
        : t("material.transfer");

  try {
    const payload = {
      ids: stickerUserTransferIds.value,
      targetUserId: stickerUserTransferTargetUserId.value,
    };
    const res =
      stickerUserTransferAction.value === "share"
        ? await shareStickersToUser(payload)
        : stickerUserTransferAction.value === "copy"
          ? await copyStickersToUser(payload)
          : await moveStickersToUser(payload);
    const result = res || {};

    const successCount = Array.isArray(result?.list)
      ? result.list.length
      : Number(result?.total || 0);
    const failedCount = Array.isArray(result?.failed) ? result.failed.length : 0;
    const warningCount = Array.isArray(result?.warnings) ? result.warnings.length : 0;

    if (successCount > 0) {
      ElNotification.success(
        t("material.transferSuccessSummary", {
          actionLabel,
          successCount,
          failedText: failedCount ? t("material.failedCountText", { count: failedCount }) : "",
          warningText: warningCount ? t("material.warningCountText", { count: warningCount }) : "",
        }),
      );
      stickerUserTransferDialogVisible.value = false;
      resetCheckStatus(ids);
      await getList();
    } else if (failedCount > 0) {
      ElMessage.error(t("material.transferFailedCount", { actionLabel, count: failedCount }));
    } else {
      ElMessage.warning(t("material.nothingProcessed"));
    }

    if (failedCount > 0) {
      ElNotification.warning({
        title: t("material.failedDetailTitle", { actionLabel }),
        message: result.failed
          .slice(0, 3)
          .map((item: any) => `${item.id}: ${item.message}`)
          .join("；"),
        duration: 6000,
      });
    }

    if (warningCount > 0) {
      ElNotification.warning({
        title: t("material.completedWithWarning", { actionLabel }),
        message: result.warnings
          .slice(0, 3)
          .map((item: any) => `${item.id}: ${item.message}`)
          .join("；"),
        duration: 6000,
      });
    }
  } catch (error: any) {
    ElMessage.error(error?.message || t("material.actionFailed", { actionLabel }));
  } finally {
    stickerUserTransferSubmitting.value = false;
  }
}

// 生成无空白PNG（仅对 png 后缀显示）
async function handleTrimPng(row) {
  if ((row.suffix || "").toLowerCase() !== "png") {
    ElMessage.warning(t("material.pngOnly"));
    return;
  }
  try {
    const res = await trimPng({ id: String(row.id) });
    if (res && res.id) {
      ElMessage.success(t("material.generateSuccess"));
    } else {
      ElMessage.success(t("material.generateSuccess"));
    }
    getList();
  } catch (e) {
    ElMessage.error(t("material.generateFailed"));
  }
}

// SVG转PNG（仅对 svg 后缀显示）
async function handleSvgToPng(row) {
  if ((row.suffix || "").toLowerCase() !== "svg") {
    ElMessage.warning(t("material.svgOnly"));
    return;
  }

  // 获取SVG原始尺寸
  try {
    const svgDimensions = await getSvgDimensions(row.url);
    if (svgDimensions) {
      svgToPngForm.value.originalWidth = (svgDimensions as any).width;
      svgToPngForm.value.originalHeight = (svgDimensions as any).height;
      svgToPngForm.value.aspectRatio = (svgDimensions as any).width / (svgDimensions as any).height;

      // 根据原始比例设置默认尺寸
      const baseSize = 512;
      if (svgToPngForm.value.aspectRatio > 1) {
        // 宽度大于高度
        svgToPngForm.value.width = baseSize;
        svgToPngForm.value.height = Math.round(baseSize / svgToPngForm.value.aspectRatio);
      } else {
        // 高度大于等于宽度
        svgToPngForm.value.height = baseSize;
        svgToPngForm.value.width = Math.round(baseSize * svgToPngForm.value.aspectRatio);
      }
    }
  } catch (error) {
    console.warn("获取SVG尺寸失败:", error);
    // 如果获取失败，使用默认值
    svgToPngForm.value.originalWidth = 512;
    svgToPngForm.value.originalHeight = 512;
    svgToPngForm.value.aspectRatio = 1;
    svgToPngForm.value.width = 512;
    svgToPngForm.value.height = 512;
  }

  // 打开尺寸设置弹窗
  currentSvgRow.value = row;
  svgToPngDialogVisible.value = true;
}

// 获取SVG原始尺寸
async function getSvgDimensions(svgUrl) {
  return new Promise((resolve) => {
    const img = new Image();

    img.onload = function () {
      const naturalWidth = (this as HTMLImageElement).naturalWidth;
      const naturalHeight = (this as HTMLImageElement).naturalHeight;

      console.log("SVG自然尺寸:", { naturalWidth, naturalHeight });

      // 如果naturalWidth和naturalHeight都是0或undefined，尝试解析SVG内容
      if (!naturalWidth || !naturalHeight || naturalWidth === 0 || naturalHeight === 0) {
        console.log("naturalWidth/naturalHeight无效，尝试解析SVG内容");
        parseSvgContent(svgUrl).then(resolve);
      } else {
        resolve({ width: naturalWidth, height: naturalHeight });
      }
    };

    img.onerror = function () {
      console.log("图片加载失败，尝试解析SVG内容");
      parseSvgContent(svgUrl).then(resolve);
    };

    // 设置crossOrigin以支持跨域
    img.crossOrigin = "anonymous";
    img.src = svgUrl;
  });
}

// 解析SVG内容的备用方法
async function parseSvgContent(svgUrl) {
  try {
    const response = await fetch(svgUrl);
    const svgText = await response.text();

    const parser = new DOMParser();
    const svgDoc = parser.parseFromString(svgText, "image/svg+xml");
    const svgElement = svgDoc.querySelector("svg");

    if (!svgElement) return { width: 512, height: 512 };

    let width, height;

    // 优先使用viewBox
    const viewBox = svgElement.getAttribute("viewBox");
    if (viewBox) {
      const parts = viewBox.split(/\s+/);
      if (parts.length >= 4) {
        width = parseFloat(parts[2]);
        height = parseFloat(parts[3]);
      }
    }

    // 如果没有viewBox，使用width和height属性
    if (!width || !height) {
      width = parseFloat(svgElement.getAttribute("width")) || 512;
      height = parseFloat(svgElement.getAttribute("height")) || 512;
    }

    console.log("SVG解析尺寸:", { width, height });
    return { width, height };
  } catch (error) {
    console.error("解析SVG失败:", error);
    return { width: 512, height: 512 };
  }
}

// 确认SVG转PNG
async function confirmSvgToPng() {
  if (!currentSvgRow.value?.id) return;

  try {
    ElMessage.info(t("material.svgConverting"));
    const res = await svgToPng({
      id: String(currentSvgRow.value.id),
      width: svgToPngForm.value.width,
      height: svgToPngForm.value.height,
    });
    if (res && res.id) {
      ElMessage.success(t("material.svgToPngSuccess"));
    } else {
      ElMessage.success(t("material.svgToPngSuccess"));
    }
    svgToPngDialogVisible.value = false;
    getList();
  } catch (e) {
    ElMessage.error(t("material.svgToPngFailed"));
  }
}

async function openPsdSetDialog(mergeMode?: boolean | any) {
  resetPsdSetState();

  // 如果传入的是对象(row),则是从表格行点击的,默认使用单素材模式
  if (mergeMode && typeof mergeMode === "object") {
    ids.value = [mergeMode.id];
    psdSetMergeSticker.value = false;
  } else {
    // 如果是布尔值,则是从按钮点击的,使用传入的模式
    if (!ids.value.length) {
      ElMessage.warning(t("material.selectMaterialsToMake"));
      return;
    }
    psdSetMergeSticker.value = mergeMode === true;
  }
  // 打开弹窗时重置分页
  psdSetTemplatePageParams.currentPage = 1;
  psdSetDialogVisible.value = true;
  // 加载PSD模板文件夹
  loadPsdFolderTree();
  await loadPsdTemplatesForPsdSet();
}

async function openImageGroupPsdSetDialog(groups: ImageGroupItem[]) {
  const selectedGroups = Array.isArray(groups)
    ? groups.filter((group) => group?.id && group.stickers?.length)
    : [];
  if (!selectedGroups.length) {
    ElMessage.warning(t("material.selectGroupWithImages"));
    return;
  }

  resetPsdSetState();
  psdSetImageGroups.value = selectedGroups.map((group) => ({
    ...group,
    stickers: [...(group.stickers || [])].sort(
      (a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0),
    ),
  }));
  cacheSelectedMaterialRows(
    psdSetImageGroups.value.flatMap((group) => group.stickers || []),
  );
  psdSetMergeSticker.value = true;
  psdSetTemplatePageParams.currentPage = 1;
  psdSetDialogVisible.value = true;
  loadPsdFolderTree();
  await loadPsdTemplatesForPsdSet();
}

async function openMaterialPublishConfigDialog() {
  if (!ids.value.length) {
    ElMessage.warning(t("material.selectMaterialsToProcess"));
    return;
  }

  isImageGroupPsdSet.value = false;
  clearMaterialPublishConfigSelection();
  materialPublishConfigDialogVisible.value = true;
  materialPublishConfigSearchText.value = "";
  materialPublishConfigCurrentPage.value = 1;
  await ensureSelectedMaterialPreviews();
  await loadPublishConfigsForMaterialPublishDialog();
}

async function openImageGroupPublishConfigDialog(groups: ImageGroupItem[]) {
  const selectedGroups = Array.isArray(groups)
    ? groups.filter((group) => group?.id && group.stickers?.length)
    : [];
  if (!selectedGroups.length) {
    ElMessage.warning(t("material.selectGroupWithImages"));
    return;
  }

  psdSetImageGroups.value = selectedGroups.map((group) => ({
    ...group,
    stickers: [...(group.stickers || [])].sort(
      (a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0),
    ),
  }));
  cacheSelectedMaterialRows(
    psdSetImageGroups.value.flatMap((group) => group.stickers || []),
  );
  isImageGroupPsdSet.value = true;
  clearMaterialPublishConfigSelection();
  materialPublishConfigDialogVisible.value = true;
  materialPublishConfigSearchText.value = "";
  materialPublishConfigCurrentPage.value = 1;
  await loadPublishConfigsForMaterialPublishDialog();
}

async function openMaterialProductConfigDialog() {
  if (!ids.value.length) {
    ElMessage.warning(t("material.selectMaterialsToProcess"));
    return;
  }

  isImageGroupPsdSet.value = false;
  clearMaterialProductConfigSelection();
  materialProductConfigDialogVisible.value = true;
  materialProductConfigSearchText.value = "";
  materialProductConfigCurrentPage.value = 1;
  await ensureSelectedMaterialPreviews();
  await loadProductConfigsForMaterialDialog();
}

async function openImageGroupProductConfigDialog(groups: ImageGroupItem[]) {
  const selectedGroups = Array.isArray(groups)
    ? groups.filter((group) => group?.id && group.stickers?.length)
    : [];
  if (!selectedGroups.length) {
    ElMessage.warning(t("material.selectGroupWithImages"));
    return;
  }

  psdSetImageGroups.value = selectedGroups.map((group) => ({
    ...group,
    stickers: [...(group.stickers || [])].sort(
      (a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0),
    ),
  }));
  cacheSelectedMaterialRows(
    psdSetImageGroups.value.flatMap((group) => group.stickers || []),
  );
  isImageGroupPsdSet.value = true;
  clearMaterialProductConfigSelection();
  materialProductConfigDialogVisible.value = true;
  materialProductConfigSearchText.value = "";
  materialProductConfigCurrentPage.value = 1;
  await loadProductConfigsForMaterialDialog();
}

function handleCloseMaterialProductConfigDialog() {
  materialProductConfigDialogVisible.value = false;
  clearMaterialProductConfigSelection();
  materialProductConfigSearchText.value = "";
  materialProductConfigCurrentPage.value = 1;
}

function clearMaterialProductConfigSelection() {
  materialProductConfigSelectedIds.value = [];
  materialProductConfigGridRef.value?.clearCheckboxRow?.();
}

async function loadProductConfigsForMaterialDialog() {
  materialProductConfigLoading.value = true;
  try {
    const res: any = await productGenerationTemplateApi.getList({
      currentPage: 1,
      pageSize: 1000,
      isActive: true,
    });
    materialProductConfigOptions.value = Array.isArray(res?.list) ? res.list : [];
  } catch (error) {
    console.error("加载独立站商品配置失败:", error);
    ElMessage.error(t("material.productConfigLoadFailed"));
  } finally {
    materialProductConfigLoading.value = false;
  }
}

function handleCloseMaterialPublishConfigDialog() {
  materialPublishConfigDialogVisible.value = false;
  clearMaterialPublishConfigSelection();
  materialPublishConfigSearchText.value = "";
  materialPublishConfigCurrentPage.value = 1;
}

function clearMaterialPublishConfigSelection() {
  materialPublishConfigSelectedIds.value = [];
  materialPublishConfigGridRef.value?.clearCheckboxRow?.();
}

async function ensureSelectedMaterialPreviews() {
  const missingIds = materialPublishConfigMissingPreviewIds.value;
  if (!missingIds.length) {
    return;
  }

  await Promise.allSettled(
    missingIds.map(async (id) => {
      try {
        const detail = await fetchStickerDetail(id);
        cacheSelectedMaterialRows([detail]);
      } catch (error) {
        console.warn("补全素材预览失败", { id, error });
      }
    }),
  );
}

function isMaterialPublishConfigUsable(row: any) {
  return Boolean(String(row?.configData?.templateBinding?.psdTemplateId || "").trim());
}

function isMaterialProductConfigUsable(row: any) {
  return row?.isActive !== false && Boolean(String(row?.psdTemplateId || "").trim());
}

function handleMaterialPublishConfigCheckboxChange({ checked, row }) {
  if (!isMaterialPublishConfigUsable(row)) {
    return;
  }
  if (checked) {
    if (!materialPublishConfigSelectedIds.value.includes(row.id)) {
      materialPublishConfigSelectedIds.value.push(row.id);
    }
  } else {
    materialPublishConfigSelectedIds.value = materialPublishConfigSelectedIds.value.filter(
      (id) => id !== row.id,
    );
  }
}

function handleMaterialPublishConfigCheckboxAllChange({ checked }) {
  const currentPageIds = materialPublishConfigDataSource.value
    .filter((item: any) => isMaterialPublishConfigUsable(item))
    .map((item: any) => item.id);
  if (checked) {
    currentPageIds.forEach((id: string) => {
      if (!materialPublishConfigSelectedIds.value.includes(id)) {
        materialPublishConfigSelectedIds.value.push(id);
      }
    });
  } else {
    materialPublishConfigSelectedIds.value = materialPublishConfigSelectedIds.value.filter(
      (id) => !currentPageIds.includes(id),
    );
  }
}

function handleMaterialProductConfigCheckboxChange({ checked, row }) {
  if (!isMaterialProductConfigUsable(row)) return;
  const rowId = String(row.id);
  if (checked) {
    if (!materialProductConfigSelectedIds.value.includes(rowId)) {
      materialProductConfigSelectedIds.value.push(rowId);
    }
  } else {
    materialProductConfigSelectedIds.value = materialProductConfigSelectedIds.value.filter(
      (id) => id !== rowId,
    );
  }
}

function handleMaterialProductConfigCheckboxAllChange({ checked }) {
  const currentPageIds = materialProductConfigDataSource.value
    .filter((item: any) => isMaterialProductConfigUsable(item))
    .map((item: any) => String(item.id));
  if (checked) {
    currentPageIds.forEach((id) => {
      if (!materialProductConfigSelectedIds.value.includes(id)) {
        materialProductConfigSelectedIds.value.push(id);
      }
    });
  } else {
    materialProductConfigSelectedIds.value = materialProductConfigSelectedIds.value.filter(
      (id) => !currentPageIds.includes(id),
    );
  }
}

function handlePsdSetAutomationListCheckboxChange(action: any, fieldKey: string, event: any) {
  action.params[fieldKey] = (event?.records || [])
    .map((item: any) => String(item?.id || "").trim())
    .filter(Boolean);
}

async function handleCreatePsdSetsByPublishConfig() {
  const hasItems = isImageGroupPsdSet.value
    ? psdSetImageGroups.value.length > 0
    : ids.value.length > 0;
  if (!hasItems) {
    return ElMessage.warning(isImageGroupPsdSet.value ? t("material.selectGroupWithImages") : t("material.selectMaterialsFirst"));
  }
  if (!materialPublishConfigSelectedIds.value.length) {
    return ElMessage.warning(t("material.selectPublishConfig"));
  }

  const formatCheckResult = checkMaterialFormats();
  if (!formatCheckResult || !formatCheckResult.valid) {
    ElMessage.warning(formatCheckResult?.message || t("material.formatCheckError"));
    return;
  }

  materialPublishConfigSubmitting.value = true;
  try {
    const res: any = isImageGroupPsdSet.value
      ? await stickerPsdSetApi.batchCreateByPublishConfig({
          imageGroupIds: psdSetImageGroups.value.map((group) => String(group.id)),
          publishConfigIds: [...materialPublishConfigSelectedIds.value],
        })
      : await stickerPsdSetApi.batchCreateByPublishConfig({
          stickerIds: ids.value.map((id) => String(id)),
          publishConfigIds: [...materialPublishConfigSelectedIds.value],
        });
    const createdCount = Array.isArray(res?.list)
      ? res.list.length
      : Number(res?.total || materialPublishConfigTaskCount.value);
    ElMessage.success(t("material.psdTasksCreated", { count: createdCount }));
    handleCloseMaterialPublishConfigDialog();
    if (!isImageGroupPsdSet.value) {
      resetCheckStatus(ids);
    }
  } catch (error: any) {
    console.error("按发布配置创建套图失败:", error);
    ElMessage.error(error?.message || t("material.psdCreateByConfigFailed"));
  } finally {
    materialPublishConfigSubmitting.value = false;
  }
}

async function handleCreatePsdSetsByProductConfig() {
  const hasItems = isImageGroupPsdSet.value
    ? psdSetImageGroups.value.length > 0
    : ids.value.length > 0;
  if (!hasItems) {
    return ElMessage.warning(isImageGroupPsdSet.value ? t("material.selectGroupWithImages") : t("material.selectMaterialsFirst"));
  }
  if (!materialProductConfigSelectedIds.value.length) {
    return ElMessage.warning(t("material.selectProductConfig"));
  }

  const formatCheckResult = checkMaterialFormats();
  if (!formatCheckResult || !formatCheckResult.valid) {
    ElMessage.warning(formatCheckResult?.message || t("material.formatCheckError"));
    return;
  }

  materialProductConfigSubmitting.value = true;
  try {
    const res: any = isImageGroupPsdSet.value
      ? await stickerPsdSetApi.batchCreateByProductGenerationTemplate({
          imageGroupIds: psdSetImageGroups.value.map((group) => String(group.id)),
          productGenerationTemplateIds: [...materialProductConfigSelectedIds.value],
        })
      : await stickerPsdSetApi.batchCreateByProductGenerationTemplate({
          stickerIds: ids.value.map((id) => String(id)),
          productGenerationTemplateIds: [...materialProductConfigSelectedIds.value],
        });
    const productTotal = Number(res?.productTotal || materialProductConfigTaskCount.value);
    const psdSetTotal = Array.isArray(res?.list) ? res.list.length : Number(res?.total || 0);
    ElMessage.success(t("material.productTasksCreated", { psdSetTotal, productTotal }));
    handleCloseMaterialProductConfigDialog();
    if (!isImageGroupPsdSet.value) {
      resetCheckStatus(ids);
    }
  } catch (error: any) {
    console.error("按独立站商品配置创建套图失败:", error);
    ElMessage.error(error?.message || t("material.productTaskCreateFailed"));
  } finally {
    materialProductConfigSubmitting.value = false;
  }
}

// 处理PSD模板缩略图加载错误
function handleTemplateImageError(event: Event) {
  const img = event.target as HTMLImageElement;
  img.style.display = "none";
}

// 打开PSD模板详情
function openTemplateDetail(template: any) {
  currentPsdTemplate.value = template;
  psdTemplateDetailDialogVisible.value = true;
}

// 获取素材图片URL
function getMaterialImageUrl(materialId: string | number): string {
  const material = getMaterialById(materialId);
  const source = getMaterialPreviewSource(material);
  if (!source) return "";
  return getFastPreviewImageUrl(source, { width: 200 });
}

// 获取与配置项匹配的素材ID
function getMatchedMaterialId(configIndex: number): string | number | null {
  const config = templateConfigList.value[configIndex];
  if (!config) return null;

  // 如果配置项有关联的素材ID（单素材模式），直接返回
  if (config.materialId !== undefined) {
    return config.materialId;
  }

  // 合并模式：显示第一个素材作为参考（实际上所有素材都会合并）
  if (psdSetSelectedMaterialIds.value.length > 0) {
    return psdSetSelectedMaterialIds.value[0];
  }

  return null;
}

// 重置模板配置为默认
function handleResetConfigForTemplate(templateIndex: number) {
  const template = templateConfigList.value[templateIndex];
  ElMessageBox.confirm(t("material.resetConfirmMessage"), t("material.resetConfirmTitle"), {
    confirmButtonText: t("material.ok"),
    cancelButtonText: t("material.cancel"),
    type: "warning",
  })
    .then(() => {
      if (template.originalPsdInfo) {
        template.configText = JSON.stringify(template.originalPsdInfo, null, 2);
        template.psdInfo = JSON.parse(JSON.stringify(template.originalPsdInfo));
      } else {
        template.configText = "";
        template.psdInfo = null;
      }
      ElMessage.success(t("material.resetToDefaultSuccess"));
    })
    .catch(() => { });
}

// 验证配置文本格式（在生成套图前调用）
function validateConfigTexts(): boolean {
  for (const template of templateConfigList.value) {
    if (!template.configText || !template.configText.trim()) {
      // 空配置也是允许的
      continue;
    }

    try {
      JSON.parse(template.configText.trim());
    } catch (e) {
      ElMessage.warning(t("material.jsonFormatError", { name: template.name }));
      return false;
    }
  }
  return true;
}

// 保存配置到内存（暂存，不调用接口）
function handleSaveConfigToMemory() {
  // 验证所有配置文本的JSON格式
  let hasError = false;
  for (const template of templateConfigList.value) {
    if (!template.configText || !template.configText.trim()) {
      // 空配置也是允许的
      continue;
    }

    try {
      JSON.parse(template.configText.trim());
    } catch (e) {
      ElMessage.warning(t("material.jsonFormatErrorSave", { name: template.name }));
      hasError = true;
      break;
    }
  }

  if (hasError) {
    return;
  }

  // 配置已暂存到内存中（templateConfigList），无需额外操作
  ElMessage.success(t("material.configSavedTemp"));
  // 可以选择关闭弹窗，或者保持打开让用户继续编辑
  // batchDetailConfigDialogVisible.value = false
}

// PSD模板相关逻辑

// 重置状态
function resetPsdSetState() {
  psdSetImageGroups.value = [];
  selectedPsdTemplateIds.value = [];
  psdSetTemplates.value = [];
  templateConfigList.value = [];
  batchDetailConfigDialogVisible.value = false;
  psdSetMergeSticker.value = false;
  psdSetTemplateSearchText.value = "";
  psdSetAutomationDialogVisible.value = false;
  psdSetParamsDialogVisible.value = false;
  psdSetParamsContent.value = "";
  psdTemplateDetailDialogVisible.value = false;
  currentPsdTemplate.value = null;
  psdSetTemplatePageParams.currentPage = 1;
  psdSetTemplatePageParams.pageSize = 12;
  psdSetTemplatePageParams.total = 0;
  psdSetTemplatePageParams.suitableSizesArray = [];
  psdSetTemplatePageParams.cutoutModesArray = [];
  selectedPsdFolderId.value = "__root__";
  psdSetAutomationActions.value = psdSetAutomationActions.value.map((action) => ({
    ...action,
    enabled: false,
    params: {
      ...(action.params || {}),
      promptId: null,
      productGenerationTemplateIds: [],
      publishConfigIds: [],
    },
  }));
}

async function loadProductTemplatesForPsdAutomation() {
  if (
    psdSetAutomationProductTemplatesLoading.value ||
    psdSetAutomationProductTemplates.value.length > 0
  ) {
    return;
  }

  psdSetAutomationProductTemplatesLoading.value = true;
  try {
    const res = await productGenerationTemplateApi.getList({
      currentPage: 1,
      pageSize: 1000,
      isActive: true,
    });
    psdSetAutomationProductTemplates.value = Array.isArray((res as any)?.list)
      ? (res as any).list
      : [];
  } catch (error) {
    console.error("加载商品生成模板失败:", error);
    ElMessage.error(t("material.productTemplateLoadFailed"));
  } finally {
    psdSetAutomationProductTemplatesLoading.value = false;
  }
}

async function fetchPublishConfigOptions() {
  const res = await getPublishConfigListApi();
  return Array.isArray(res) ? res : Array.isArray((res as any)?.list) ? (res as any).list : [];
}

async function loadPublishConfigsForPsdAutomation() {
  if (
    psdSetAutomationPublishConfigsLoading.value ||
    psdSetAutomationPublishConfigs.value.length > 0
  ) {
    return;
  }

  psdSetAutomationPublishConfigsLoading.value = true;
  try {
    const list = await fetchPublishConfigOptions();
    psdSetAutomationPublishConfigs.value = list.filter((item: any) => item?.isActive !== false);
  } catch (error) {
    console.error("加载任务配置失败:", error);
    ElMessage.error(t("material.taskConfigLoadFailed"));
  } finally {
    psdSetAutomationPublishConfigsLoading.value = false;
  }
}

async function loadPublishConfigsForMaterialPublishDialog() {
  materialPublishConfigLoading.value = true;
  try {
    materialPublishConfigOptions.value = await fetchPublishConfigOptions();
  } catch (error) {
    console.error("加载发布配置失败:", error);
    ElMessage.error(t("material.publishConfigLoadFailed"));
  } finally {
    materialPublishConfigLoading.value = false;
  }
}

// 加载PSD模板文件夹树
async function loadPsdFolderTree() {
  try {
    const res = await getStickerFolderTree({ folderCategory: "psdtemplate" });
    const rootFolders = (res || []).filter(
      (folder: any) => folder.parentId === null || folder.parentId === undefined,
    );

    // 创建根目录节点
    // 创建"全部"节点
    const allNode = {
      id: "__all__",
      name: t("material.all"),
      path: "",
      parentId: null,
      children: [],
      isRoot: true,
    };

    const uncatNode = {
      id: "__root__",
      name: t("material.uncategorized"),
      path: "",
      parentId: null,
      children: [],
      isRoot: false,
    };

    psdFolderTreeData.value = [allNode, uncatNode, ...rootFolders];
  } catch (error) {
    console.error("加载PSD文件夹失败:", error);
  }
}

// PSD文件夹切换
function handlePsdFolderChange(value: string | null | undefined) {
  selectedPsdFolderId.value = value || "__all__";
  psdSetTemplatePageParams.currentPage = 1;
  loadPsdTemplatesForPsdSet();
}

// 加载PSD模板列表
async function loadPsdTemplatesForPsdSet() {
  psdSetTemplatesLoading.value = true;
  try {
    const res = await psdTemplateApi.getPsdTemplatePage({
      currentPage: psdSetTemplatePageParams.currentPage,
      pageSize: psdSetTemplatePageParams.pageSize,
      searchKeyword: psdSetTemplateSearchText.value.trim() || undefined,
      suitableSizes: psdSetTemplatePageParams.suitableSizesArray?.length
        ? psdSetTemplatePageParams.suitableSizesArray.join(",")
        : undefined,
      cutoutModes: psdSetTemplatePageParams.cutoutModesArray?.length
        ? psdSetTemplatePageParams.cutoutModesArray.join(",")
        : undefined,
      enabled: true,
      folderId:
        selectedPsdFolderId.value === "__all__"
          ? undefined
          : selectedPsdFolderId.value === "__root__"
            ? null
            : selectedPsdFolderId.value,
    });
    // 处理 suitableSizes 和 cutoutModes 字段（从字符串转为数组）
    psdSetTemplates.value = (res.list || []).map((item) => {
      if (item && typeof item.suitableSizes === "string") {
        try {
          item.suitableSizes = item.suitableSizes
            ? item.suitableSizes
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
            : [];
        } catch (e) {
          item.suitableSizes = [];
        }
      }
      if (item && typeof item.cutoutModes === "string") {
        try {
          item.cutoutModes = item.cutoutModes
            ? item.cutoutModes
              .split(",")
              .map((mode) => mode.trim())
              .filter(Boolean)
            : [];
        } catch (e) {
          item.cutoutModes = [];
        }
      }
      return item;
    });
    psdSetTemplatePageParams.total = res.total || 0;
  } catch (error) {
    console.error("加载PSD模板失败:", error);
    ElMessage.error(t("material.psdTemplateLoadFailed"));
  } finally {
    psdSetTemplatesLoading.value = false;
  }
}

// 切换选中状态
function togglePsdTemplate(templateId: string | number) {
  const id = String(templateId);
  const index = selectedPsdTemplateIds.value.indexOf(id);
  if (index > -1) {
    selectedPsdTemplateIds.value.splice(index, 1);
  } else {
    selectedPsdTemplateIds.value.push(id);
  }
}

// 搜索防抖
const debouncedSearchPsdTemplates = useDebounceFn(() => {
  if (psdSetDialogVisible.value) {
    psdSetTemplatePageParams.currentPage = 1;
    loadPsdTemplatesForPsdSet();
  }
}, 500);

watch(psdSetTemplateSearchText, () => {
  if (psdSetDialogVisible.value) {
    debouncedSearchPsdTemplates();
  }
});

watch(psdSetAutomationDialogVisible, (visible) => {
  if (visible) {
    loadProductTemplatesForPsdAutomation();
    loadPublishConfigsForPsdAutomation();
  }
});

// 全选/取消全选
function handlePsdTemplateSelectAll() {
  if (isAllPsdTemplatesSelected.value) {
    filteredPsdSetTemplates.value.forEach((tpl) => {
      const id = String(tpl.id);
      const index = selectedPsdTemplateIds.value.indexOf(id);
      if (index > -1) {
        selectedPsdTemplateIds.value.splice(index, 1);
      }
    });
  } else {
    filteredPsdSetTemplates.value.forEach((tpl) => {
      const id = String(tpl.id);
      if (!selectedPsdTemplateIds.value.includes(id)) {
        selectedPsdTemplateIds.value.push(id);
      }
    });
  }
}

// 详细配置弹窗处理
function handlePsdTemplateDetailConfig() {
  if (!selectedPsdTemplateIds.value.length) {
    ElMessage.warning(t("material.selectPsdTemplateFirst"));
    return;
  }

  const selectedTemplates = psdSetTemplates.value.filter((tpl) =>
    selectedPsdTemplateIds.value.includes(String(tpl.id)),
  );

  if (selectedTemplates.length === 0) {
    ElMessage.warning(t("material.selectedTemplateNotFound"));
    return;
  }

  templateConfigList.value = [];

  if (psdSetMergeSticker.value) {
    templateConfigList.value = selectedTemplates.map((template) => {
      const templateConfig = template.psdTemplateConfig;
      let psdInfoObj = null;
      let configText = "";
      if (templateConfig) {
        try {
          psdInfoObj =
            typeof templateConfig === "string" ? JSON.parse(templateConfig) : templateConfig;
          configText = JSON.stringify(psdInfoObj, null, 2);
        } catch (e) {
          console.error("解析模板配置失败:", e);
          configText = typeof templateConfig === "string" ? templateConfig : "";
        }
      }
      const originalPsdInfo = psdInfoObj ? JSON.parse(JSON.stringify(psdInfoObj)) : null;

      return {
        id: String(template.id),
        name: template.name || t("material.unnamedTemplate"),
        thumbnail: template.thumbnail || template.preview || template.image,
        psdInfo: psdInfoObj,
        originalPsdInfo,
        configText,
        materialId: undefined,
      };
    });
  } else {
    ids.value.forEach((materialId) => {
      selectedTemplates.forEach((template) => {
        const templateConfig = template.psdTemplateConfig;
        let psdInfoObj = null;
        let configText = "";
        if (templateConfig) {
          try {
            psdInfoObj =
              typeof templateConfig === "string" ? JSON.parse(templateConfig) : templateConfig;
            configText = JSON.stringify(psdInfoObj, null, 2);
          } catch (e) {
            console.error("解析模板配置失败:", e);
            configText = typeof templateConfig === "string" ? templateConfig : "";
          }
        }
        const originalPsdInfo = psdInfoObj ? JSON.parse(JSON.stringify(psdInfoObj)) : null;
        const material = dataSource.value.find((item) => String(item.id) === String(materialId));
        const materialName = material?.name || t("material.materialWithId", { id: materialId });

        templateConfigList.value.push({
          id: `${template.id}_${materialId}`,
          name: t("material.materialTimesTemplate", { materialName, templateName: template.name || t("material.unnamedTemplate") }),
          thumbnail: template.thumbnail || template.preview || template.image,
          psdInfo: psdInfoObj,
          originalPsdInfo,
          configText,
          materialId: materialId,
        });
      });
    });
  }

  batchDetailConfigDialogVisible.value = true;
}

// 构建PSD套图发送参数
function buildPsdSetAutomationConfig() {
  console.log("[PSD 套图] 自动化动作:", psdSetAutomationActions.value);
  const automations = psdSetAutomationActions.value
    .filter((action) => {
      console.log(
        "[PSD 套图] 动作",
        action.key,
        "enabled:",
        action.enabled,
        "params:",
        action.params,
      );
      return action.enabled;
    })
    .map((action) => ({
      action_type: action.key,
      config: Object.fromEntries(
        Object.entries(action.params || {}).filter(
          ([, value]) => value !== "" && value !== null && value !== undefined,
        ),
      ),
    }));

  console.log("[PSD 套图] 构建的自动化配置:", automations);
  if (!automations.length) {
    return undefined;
  }

  return automations;
}

function buildPsdSetParams() {
  const configBindings: Array<{
    stickerId?: string;
    stickerIds?: string[];
    psdTemplateId: string;
    psdTemplateConfig?: any;
  }> = [];
  if (templateConfigList.value.length > 0) {
    templateConfigList.value.forEach((config) => {
      let psdInfo = null;
      if (config.configText && config.configText.trim()) {
        try {
          psdInfo = JSON.parse(config.configText.trim());
        } catch (e) {
          console.error("解析配置失败:", e);
        }
      }

      const normalizedTemplateId = psdSetMergeSticker.value
        ? String(config.id || "").trim()
        : String(config.id || "").split("_")[0]?.trim();
      if (!normalizedTemplateId) {
        return;
      }

      if (psdSetMergeSticker.value) {
        configBindings.push({
          stickerIds: ids.value.map((id) => String(id)),
          psdTemplateId: normalizedTemplateId,
          psdTemplateConfig: psdInfo,
        });
        return;
      }

      configBindings.push({
        stickerId:
          config.materialId !== undefined && config.materialId !== null
            ? String(config.materialId)
            : undefined,
        psdTemplateId: normalizedTemplateId,
        psdTemplateConfig: psdInfo,
      });
    });
  }

  const automationConfig = buildPsdSetAutomationConfig();

  if (isImageGroupPsdSet.value) {
    return {
      imageGroupIds: psdSetImageGroups.value.map((group) => String(group.id)),
      psdTemplateIds: [...selectedPsdTemplateIds.value],
      templateConfigs: configBindings.map((binding) => ({
        psdTemplateId: binding.psdTemplateId,
        psdTemplateConfig: binding.psdTemplateConfig,
      })),
      meta: automationConfig ? { automations: automationConfig } : undefined,
    };
  }

  return {
    stickerIds: ids.value.map((id) => String(id)),
    psdTemplateIds: [...selectedPsdTemplateIds.value],
    mergeSticker: psdSetMergeSticker.value,
    configBindings: configBindings.length > 0 ? configBindings : undefined,
    meta: automationConfig ? { automations: automationConfig } : undefined,
  };
}

// 显示PSD套图发送参数
function showPsdSetParams() {
  const params = buildPsdSetParams();
  psdSetParamsContent.value = JSON.stringify(params, null, 2);
  psdSetParamsDialogVisible.value = true;
}

async function handleCreatePsdSets() {
  if (!psdSetSelectedMaterialIds.value.length) {
    return ElMessage.warning(isImageGroupPsdSet.value ? t("material.selectGroupsFirst") : t("material.selectMaterialsFirst"));
  }
  if (!selectedPsdTemplateIds.value.length) {
    return ElMessage.warning(t("material.selectPsdTemplate"));
  }

  // 检查图片格式是否符合要求
  const formatCheckResult = checkMaterialFormats();
  if (!formatCheckResult || !formatCheckResult.valid) {
    ElMessage.warning(formatCheckResult?.message || t("material.formatCheckError"));
    return;
  }

  // 验证配置文本格式（如果有配置）
  if (templateConfigList.value.length > 0 && !validateConfigTexts()) {
    return;
  }

  psdSetSubmitting.value = true;
  try {
    const params = buildPsdSetParams();
    console.log("[PSD 套图] 发送参数:", JSON.stringify(params, null, 2));
    const createdFromImageGroups = isImageGroupPsdSet.value;
    const res = createdFromImageGroups
      ? await stickerPsdSetApi.batchCreateByImageGroup(params as any)
      : await stickerPsdSetApi.batchCreate(params as any);
    console.log("[PSD 套图] 后端响应:", res);
    const createdList = (res as any)?.list;
    const createdCount = Array.isArray(createdList)
      ? createdList.length
      : ((res as any)?.total ?? psdSetTaskCount.value);

    // 如果后端返回“所有组合都已存在”，列表通常为空，此时提示为“无需重复创建”
    if (Array.isArray(createdList) && createdList.length === 0) {
      ElMessage.info((res as any)?.message || t("material.allCombinationsExist"));
    } else {
      ElMessage.success(t("material.psdTasksCreated", { count: createdCount }));
    }
    psdSetDialogVisible.value = false;
    resetPsdSetState();
    if (!createdFromImageGroups) {
      resetCheckStatus(ids);
    }
  } catch (error: any) {
    console.error("创建套图失败:", error);
    ElMessage.error(error?.message || t("material.psdCreateFailed"));
  } finally {
    psdSetSubmitting.value = false;
  }
}

// 判断素材格式是否无效
function isMaterialFormatInvalid(materialId: string | number): boolean {
  const material = getMaterialById(materialId);
  if (!material) return false;

  const materialSuffix = (material.suffix || "").toLowerCase().replace(/^\./, "");
  if (!materialSuffix) return true; // 没有后缀视为无效

  // 检查格式是否在允许列表中（jpg、png、jpeg）
  return !psdSetAllowedFormats.includes(materialSuffix);
}

// 获取素材的后缀
function getMaterialSuffix(materialId: string | number): string {
  const material = getMaterialById(materialId);
  if (!material || !material.suffix) return "";
  return (material.suffix || "").toLowerCase().replace(/^\./, "");
}

function getMaterialById(materialId: string | number) {
  const id = String(materialId);
  return dataSource.value.find((item) => String(item.id) === id) || selectedMaterialCache[id];
}

function getMaterialPreviewSource(material: any): string {
  return String(
    material?.url ||
    material?.previewUrl ||
    material?.preview ||
    material?.thumbnail ||
    material?.imageUrl ||
    material?.image ||
    material?.ossObjectName ||
    "",
  ).trim();
}

// 获取素材的形状标签（长图/宽图/正方图）
function getMaterialShapeLabel(materialId: string | number): string {
  const material = getMaterialById(materialId);
  if (!material || !material.aspectRatio) return "";
  const sizeShape = getSizeShapeByRatio(material.aspectRatio);
  return sizeShape?.label || "";
}

function getMaterialShapeKey(materialId: string | number): string {
  const material = getMaterialById(materialId);
  if (!material || !material.aspectRatio) return "";
  const sizeShape = getSizeShapeByRatio(material.aspectRatio);
  return sizeShape?.key || "";
}

// 获取素材的抠图状态
function getMaterialCutoutStatus(materialId: string | number): boolean | null {
  const material = getMaterialById(materialId);
  if (!material) return null;
  return material.isCutout ?? null;
}

function getMaterialCutoutMode(materialId: string | number): string {
  const isCutout = getMaterialCutoutStatus(materialId);
  if (isCutout === true) return "CUTOUT";
  if (isCutout === false) return "NON_CUTOUT";
  return "";
}

function applyMaterialFilters(materialId: string | number) {
  const sizeKey = getMaterialShapeKey(materialId);
  const cutoutMode = getMaterialCutoutMode(materialId);

  if (!sizeKey && !cutoutMode) {
    ElMessage.warning(t("material.materialMissingFilterInfo"));
    return;
  }

  psdSetTemplatePageParams.currentPage = 1;
  psdSetTemplatePageParams.suitableSizesArray = sizeKey ? [sizeKey] : [];
  psdSetTemplatePageParams.cutoutModesArray = cutoutMode ? [cutoutMode] : [];
  loadPsdTemplatesForPsdSet();
}

// 检查素材格式是否符合PSD模板要求
function checkMaterialFormats() {
  // 使用固定的允许格式列表
  const allowedFormatsSet = new Set(psdSetAllowedFormats);

  // 检查所有选中素材的格式
  const invalidMaterials: Array<{ id: string | number; name: string; suffix: string }> = [];

  psdSetSelectedMaterialIds.value.forEach((id) => {
    const material = getMaterialById(id);
    if (!material) return;

    const materialSuffix = (material.suffix || "").toLowerCase().replace(/^\./, "");

    // 如果素材没有后缀，也视为无效
    if (!materialSuffix) {
      invalidMaterials.push({
        id: material.id,
        name: material.name || `ID: ${material.id}`,
        suffix: t("material.unknownFormat"),
      });
      return;
    }

    // 检查格式是否在允许列表中
    if (!allowedFormatsSet.has(materialSuffix)) {
      invalidMaterials.push({
        id: material.id,
        name: material.name || `ID: ${material.id}`,
        suffix: materialSuffix,
      });
    }
  });

  // 如果有不符合格式的素材，返回错误信息
  if (invalidMaterials.length > 0) {
    const allowedFormatsList = psdSetAllowedFormats.join("、");
    const invalidNames = invalidMaterials
      .slice(0, 5)
      .map((m) => `${m.name}(${m.suffix})`)
      .join("、");
    const moreCount = invalidMaterials.length > 5 ? t("material.andMoreCount", { count: invalidMaterials.length }) : "";

    return {
      valid: false,
      message: t("material.formatCheckMessage", {
        allowedFormats: allowedFormatsList,
        invalidNames,
        moreCount,
      }),
    };
  }

  return { valid: true, message: "" };
}

const delayUpdateList = useDebounceFn(() => {
  getList();
}, 1999);

function singleFileUploaded(payload?: { useAiGenerate?: boolean }) {
  console.log("单个文件上传");
  if (!payload?.useAiGenerate) delayUpdateList();
}

/**
 * @group
 */

const aiGenDialogVisible = ref(false);
const aiGenPrompt = ref("");
const aiGenerateRawInfo = ref("");
const aiGenDialogLoading = ref(false);
let aiGenRow = null;

const aiTableLoading = ref<Record<string, boolean>>({});

// meta 内容解析（metaDialogVisible/metaDialogContent 已在前方定义）
const parsedMetaData = computed(() => {
  if (!metaDialogContent.value) return null;
  try {
    // 尝试解析 JSON 字符串
    const parsed = JSON.parse(metaDialogContent.value);
    return parsed;
  } catch (error) {
    // 如果解析失败，返回 null，显示原始内容
    return null;
  }
});

function onAiTableAutoGenerate(row) {
  if (aiTableLoading.value[row.id]) return;
  aiGenRow = row;
  aiGenPrompt.value = "";
  aiGenerateRawInfo.value = "";
  aiGenDialogVisible.value = true;
}

async function submitAiGenDialog() {
  if (!aiGenRow) return;
  aiGenDialogLoading.value = true;
  aiTableLoading.value = { ...aiTableLoading.value, [aiGenRow.id]: true };
  try {
    await handleAiAutoGenerate(
      aiGenRow,
      () => {
        aiTableLoading.value = { ...aiTableLoading.value, [aiGenRow.id]: false };
        aiGenDialogLoading.value = false;
        aiGenDialogVisible.value = false;
        aiGenRow = null;
      },
      aiGenPrompt.value,
      aiGenerateRawInfo.value,
    );
  } catch (e) {
    aiTableLoading.value = { ...aiTableLoading.value, [aiGenRow.id]: false };
    aiGenDialogLoading.value = false;
    aiGenDialogVisible.value = false;
    aiGenRow = null;
  }
}

async function handleAiAutoGenerate(row, cb, prompt, aiGenerateRawInfo) {
  try {
    const res = await aiAutoGenerateMaterialInfo({
      id: row.id,
      prompt: prompt || "",
      aiGenerateRawInfo: aiGenerateRawInfo || "",
    });
    const resultData = unwrapAiTaskResult(res);

    if (isQueuedAiTaskResult(resultData)) {
      notifyQueuedAiTask(resultData, {
        title: t("material.aiTaskSubmitted"),
        fallbackMessage: t("material.aiTaskSubmittedFallback"),
      });
      if (typeof cb === "function") cb();
      return;
    }

    // 更新行数据 - 兼容不同的返回结构
    if (resultData) {
      row.name = resultData.name || row.name;
      row.nameEn = resultData.nameEn || row.nameEn;
      row.description = resultData.description || row.description;
      row.descriptionEn = resultData.descriptionEn || row.descriptionEn;
      row.keywords = resultData.keywords || row.keywords;
      row.keywordsEn = resultData.keywordsEn || row.keywordsEn;
      // 更新侵权信息
      if (typeof resultData.isInfringement === "boolean") {
        row.isInfringement = resultData.isInfringement;
      }
      // 更新适用商品
      if (resultData.suitableFor) {
        row.suitableFor = resultData.suitableFor;
      }
    }
    const infringementText =
      typeof resultData?.isInfringement === "boolean"
        ? resultData.isInfringement
          ? t("material.markedAsInfringement")
          : t("material.markedAsNotInfringement")
        : "";
    const suitableText = resultData?.suitableFor ? t("material.suitableForText", { suitableFor: resultData.suitableFor }) : "";
    ElNotification.success(t("material.aiGenerateContentSuccess", { infringementText, suitableText }));
    if (typeof cb === "function") cb();
  } catch (e) {
    ElNotification.error(t("material.aiGenerateContentFailed"));
    if (typeof cb === "function") cb();
  }
}

// 查找相似图：使用视觉向量搜索当前图片的近似素材
async function handleFindSimilar(row) {
  if (visualSimilarSearchDisabled) {
    ElMessage.warning(VISUAL_SIMILAR_SEARCH_DISABLED_MESSAGE);
    return;
  }
  const imageUrl = String(row?.url || row?.originUrl || "").trim();
  if (!imageUrl) {
    ElMessage.warning(t("material.noSearchableImageUrl"));
    return;
  }
  const success = await loadVectorSimilarResults(imageUrl);
  if (success) {
    setSimilarImageActiveStatus({
      previewUrl: imageUrl,
      sourceType: "url",
      sourceLabel: row?.name || row?.code || t("material.currentMaterial"),
    });
  }
}

// 处理宽度变化
function handleWidthChange(value) {
  // 根据原始宽高比自动计算高度
  if (svgToPngForm.value.aspectRatio) {
    svgToPngForm.value.height = Math.round(value / svgToPngForm.value.aspectRatio);
  }
}

// 应用预设尺寸
function applyPreset(preset) {
  // 设置宽度，高度会自动计算
  svgToPngForm.value.width = preset.width;
  handleWidthChange(preset.width);
}

async function handleViewDetail(row: any) {
  detailDialogVisible.value = true;
  detailDialogLoading.value = true;
  stickerDetailCurrent.value = null;
  try {
    stickerDetailCurrent.value = await fetchStickerDetail(row);
  } catch (error: any) {
    detailDialogVisible.value = false;
    ElMessage.error(error?.message || t("material.materialDetailLoadFailed"));
  } finally {
    detailDialogLoading.value = false;
  }
}

async function handleEdit(row) {
  let detail = row;
  try {
    detail = await fetchStickerDetail(row);
  } catch (error: any) {
    ElMessage.error(error?.message || t("material.materialDetailLoadFailed"));
    return;
  }

  editForm.value = {
    id: detail.id,
    code: detail.code || "",
    name: detail.name || "",
    nameEn: detail.nameEn || "",
    description: detail.description || "",
    descriptionEn: detail.descriptionEn || "",
    keywords: detail.keywords || "",
    keywordsEn: detail.keywordsEn || "",
    suitableFor: detail.suitableFor || "",
    suffix: detail.suffix || "",
    isCustom: normalizeBooleanValue(detail.isCustom),
    isPublic: normalizeBooleanValue(detail.isPublic),
    isTexture: normalizeBooleanValue(detail.isTexture),
    seamless: normalizeBooleanValue(detail.seamless),
    isInfringement: normalizeBooleanValue(detail.isInfringement),
    isCutout: normalizeBooleanValue(detail.isCutout),
    originUrl: detail.originUrl || "",
    source: detail.source || "",
    folderId: detail.folderId ?? detail.folder?.id ?? null,
    folderPath: detail.folder || detail.folderEntity?.path || "",
    // 只读字段（用于显示）
    width: detail.width || null,
    height: detail.height || null,
    aspectRatio: detail.aspectRatio || null,
    fileSize: detail.fileSize || null,
    colorPalette: detail.colorPalette || "",
    phash: detail.phash || "",
  };
  editDialogVisible.value = true;
}

async function handleGenerateMaterialCode() {
  if (generatingCode.value) return;

  generatingCode.value = true;
  try {
    const res = await generateStickerCode();
    const generatedCode = (res?.code || res?.data?.code || "").trim().toLowerCase();

    if (!generatedCode) {
      throw new Error(t("material.codeNotReturned"));
    }

    editForm.value.code = generatedCode;
    ElMessage.success(t("material.codeGenerated"));
  } catch (e: any) {
    ElMessage.error(e?.message || t("material.codeGenerateFailed"));
  } finally {
    generatingCode.value = false;
  }
}

async function submitEdit() {
  editLoading.value = true;
  try {
    const inputCode = (editForm.value.code || "").trim().toLowerCase();
    if (inputCode && !/^[a-z]{3,6}\d{2,7}$/.test(inputCode)) {
      ElMessage.warning(t("material.codeFormatRule"));
      return;
    }

    // 只提交可编辑的字段，排除只读字段
    const submitData = {
      id: editForm.value.id,
      code: inputCode,
      name: editForm.value.name,
      nameEn: editForm.value.nameEn,
      description: editForm.value.description,
      descriptionEn: editForm.value.descriptionEn,
      keywords: editForm.value.keywords,
      keywordsEn: editForm.value.keywordsEn,
      suitableFor: editForm.value.suitableFor,
      suffix: editForm.value.suffix,
      isCustom: editForm.value.isCustom,
      isPublic: editForm.value.isPublic,
      isTexture: editForm.value.isTexture,
      seamless: editForm.value.seamless,
      isInfringement: editForm.value.isInfringement,
      isCutout: editForm.value.isCutout,
      originUrl: editForm.value.originUrl,
      source: editForm.value.source,
    };
    await updateAssetLibrary(submitData);
    ElNotification.success(t("material.saveSuccess"));
    editDialogVisible.value = false;
    getList();
  } catch (e) {
    ElNotification.error(t("material.saveFailed"));
  } finally {
    editLoading.value = false;
  }
}

// 图片预览相关方法（closeImagePreview 已在前方定义）
function openImagePreview(imageUrl: string, imageName?: string) {
  currentImageUrl.value = imageUrl;
  imagePreviewVisible.value = true;
}

// 显示meta详情
async function handleShowMetaDetail(row: any) {
  try {
    const detail = await fetchStickerDetail(row);
    showMetaDetail(detail.meta);
  } catch (error: any) {
    ElMessage.error(error?.message || t("material.materialDetailLoadFailed"));
  }
}

function showMetaDetail(meta: any) {
  if (!meta) {
    ElMessage.warning(t("material.noMetaInfo"));
    return;
  }

  try {
    // 如果 meta 是字符串，直接使用
    if (typeof meta === "string") {
      metaDialogContent.value = meta;
    } else {
      // 如果是对象，转换为格式化的 JSON 字符串
      metaDialogContent.value = JSON.stringify(meta, null, 2);
    }
    metaDialogVisible.value = true;
  } catch (error) {
    console.error("处理元数据失败:", error);
    ElMessage.error(t("material.metaProcessFailed"));
    // 即使出错也显示原始数据
    metaDialogContent.value = String(meta);
    metaDialogVisible.value = true;
  }
}

// 生成图片信息
async function handleGenerateImageInfo(row) {
  if (!row.url) {
    ElMessage.error(t("material.noValidImageLink"));
    return;
  }

  try {
    aiTableLoading.value = { ...aiTableLoading.value, [row.id]: true };
    const res = await generateImageInfo({
      id: row.id,
    });
    if (res) {
      // 更新行数据 - 直接更新 dataSource 中对应的行
      const index = dataSource.value.findIndex((item) => String(item.id) === String(row.id));
      if (index !== -1) {
        const targetRow = dataSource.value[index];
        if (res.width !== undefined) {
          targetRow.width = res.width;
          targetRow.resolutionWidth = res.width;
        }
        if (res.height !== undefined) {
          targetRow.height = res.height;
          targetRow.resolutionHeight = res.height;
        }
        if (res.aspectRatio !== undefined) targetRow.aspectRatio = res.aspectRatio;
        if (res.fileSize !== undefined) targetRow.fileSize = res.fileSize;
        if (res.colorPalette !== undefined) targetRow.colorPalette = res.colorPalette;
        if (res.suffix !== undefined) targetRow.suffix = res.suffix;
        if (res.phash !== undefined) targetRow.phash = res.phash;
        if (res.isCutout !== undefined) targetRow.isCutout = res.isCutout;
      }

      // 同时更新当前 row 对象（用于显示）
      if (res.width !== undefined) {
        row.width = res.width;
        row.resolutionWidth = res.width;
      }
      if (res.height !== undefined) {
        row.height = res.height;
        row.resolutionHeight = res.height;
      }
      if (res.aspectRatio !== undefined) row.aspectRatio = res.aspectRatio;
      if (res.fileSize !== undefined) row.fileSize = res.fileSize;
      if (res.colorPalette !== undefined) row.colorPalette = res.colorPalette;
      if (res.suffix !== undefined) row.suffix = res.suffix;
      if (res.phash !== undefined) row.phash = res.phash;
      if (res.isCutout !== undefined) row.isCutout = res.isCutout;

      const infoParts = [];
      if (res.width && res.height) {
        infoParts.push(t("material.dimensionInfo", { width: res.width, height: res.height }));
      }
      if (res.fileSize) {
        infoParts.push(t("material.sizeInfo", { size: formatFileSize(res.fileSize) }));
      }
      if (res.colorPalette) {
        const colors = res.colorPalette.split(",").slice(0, 3).join(", ");
        infoParts.push(t("material.colorPaletteInfo", { colors, more: res.colorPalette.split(",").length > 3 ? "..." : "" }));
      }
      if (res.isCutout !== undefined) {
        infoParts.push(t("material.cutoutInfo", { value: res.isCutout ? t("material.yes") : t("material.no") }));
      }

      ElNotification.success(
        t("material.generateImageInfoSuccess", {
          details: infoParts.length
            ? t("material.infoDetails", { list: infoParts.join(t("material.infoSeparator")) })
            : "",
        }),
      );
      // 刷新列表以更新所有数据
      await getList();
    }
  } catch (e) {
    console.error("生成图片信息失败:", e);
    ElMessage.error(t("material.generateImageInfoFailed", { message: e?.message || t("material.unknownError") }));
  } finally {
    aiTableLoading.value = { ...aiTableLoading.value, [row.id]: false };
  }
}

function buildImageProcessingPrefillOptions(row: any, taskType: "process" | "variations") {
  if (taskType !== "process") {
    return {};
  }

  const isSeamlessMaterial = normalizeBooleanValue(row?.seamless) || normalizeBooleanValue(row?.isTexture);
  if (!isSeamlessMaterial) {
    return {};
  }

  const params: Record<string, any> = {
    mode: "sticker",
    tileMode: "mirror",
    blendPercent: 12,
    preserveTransparent: true,
  };
  if (!row?.width || !row?.height) {
    params.outputSize = 1024;
  }

  return {
    operationKeyword: "无缝",
    operations: [
      {
        type: "seamless-tile",
        params,
      },
    ],
  };
}

function openImageProcessingWorkbench(row: any, taskType: "process" | "variations" = "process") {
  if (!isAdmin.value) {
    ElMessage.warning(t("material.adminOnlyFeature"));
    return;
  }

  const imageUrl = String(row?.url || "").trim();
  if (!imageUrl) {
    ElMessage.warning(t("material.materialNoProcessableUrl"));
    return;
  }

  router.push(
    buildImageProcessingRouteLocation({
      imageUrl,
      title: row?.name || row?.nameEn || "",
      sourceName: row?.name || row?.nameEn || "",
      sourceModule: "material",
      sourceRecordId: row?.id ? String(row.id) : "",
      taskType,
      openCreate: true,
      ...buildImageProcessingPrefillOptions(row, taskType),
    }),
  );
}

function openBatchImageProcessing(taskType: "process" | "variations" = "process") {
  const selectedItems = dataSource.value.filter((item) => ids.value.includes(item.id));
  const firstWithUrl = selectedItems.find((item) => String(item?.url || "").trim());
  if (!firstWithUrl) {
    ElMessage.warning(t("material.selectValidImageMaterials"));
    return;
  }
  openImageProcessingWorkbench(firstWithUrl, taskType);
}

// 处理dropdown操作命令
async function handleOperationCommand(command: string, row: any) {
  const rowId = String(row?.id || "");
  closeOperationDropdown(rowId);
  if (rowId) {
    operationCommandLoadingId.value = rowId;
  }
  try {
    switch (command) {
      case "view-detail":
        await handleViewDetail(row);
        break;
      case "edit":
        await handleEdit(row);
        break;
      case "download":
        await handleDownload(row);
        break;
      case "download-rotated-90":
        await handleDownloadRotated90(row);
        break;
      case "ai-generate":
        await onAiTableAutoGenerate(row);
        break;
      case "generate-image-info":
        await handleGenerateImageInfo(row);
        break;
      case "find-similar":
        await handleFindSimilar(row);
        break;
      case "view-publish-usage":
        await handleViewPublishUsageRecords(row);
        break;
      case "view-meta":
        await handleShowMetaDetail(row);
        break;
      case "trim-png":
        await handleTrimPng(row);
        break;
      case "svg-to-png":
        await handleSvgToPng(row);
        break;
      case "copy":
        await handleCopy(row);
        break;
      case "copy-origin-url":
        await handleCopyText(row?.url || "", t("material.imageLink"));
        break;
      case "copy-to-user":
        openStickerUserTransferDialog("copy", row);
        break;
      case "share-to-user":
        openStickerUserTransferDialog("share", row);
        break;
      case "move-to-user":
        openStickerUserTransferDialog("move", row);
        break;
      case "view-shared":
        openShareRecordsDialog(row);
        break;
      case "create-ps-set":
        openPsdSetDialog(row);
        break;
      case "view-ps-sets":
        relatedPsdSetDialogRef.value?.open(row);
        break;
      case "image-process":
        openImageProcessingWorkbench(row, "process");
        break;
      case "image-split":
        openImageProcessingWorkbench(row, "variations");
        break;
      case "video-production":
        ElMessage.info(t("material.videoProductionWip"));
        break;
      case "story-script":
        await openStoryScriptDialog(row);
        break;
      case "delete":
        await handleDelete(row);
        break;
      default:
        console.warn("未知的操作命令:", command);
    }
  } catch (error: any) {
    console.error("[material] 操作执行失败:", command, error);
    ElMessage.error(error?.message || t("material.operationFailed"));
  } finally {
    if (operationCommandLoadingId.value === rowId) {
      operationCommandLoadingId.value = "";
    }
  }
}

function handleOperationDropdownVisibleChange(visible: boolean, row: any) {
  const rowId = String(row?.id || "");
  hideAllOperationSubmenus();
  if (visible) {
    const previousRowId = activeOperationRowId.value;
    if (previousRowId && previousRowId !== rowId) {
      operationDropdownRefs.get(previousRowId)?.handleClose?.();
    }
    activeOperationRowId.value = rowId;
    return;
  }
  if (!rowId || activeOperationRowId.value === rowId) {
    activeOperationRowId.value = "";
  }
}

function setOperationDropdownRef(rowId: any, el: any) {
  const key = String(rowId || "");
  if (!key) return;
  if (el) {
    operationDropdownRefs.set(key, el);
  } else {
    operationDropdownRefs.delete(key);
  }
}

// URL上传相关
const urlUploadModalVisible = ref(false);
const urlUploadLoading = ref(false);
const urlUploadFormRef = ref();
const urlPreviewVisible = ref(false);
const imageInfo = ref(null);

const urlUploadForm = reactive({
  url: "",
  name: "",
  nameEn: "",
  description: "",
  descriptionEn: "",
  keywords: "",
  keywordsEn: "",
  isCustom: false,
  isInfringement: false,
  useAiGenerate: false, // 是否使用AI生成补全内容
});

const urlUploadFormRules = {
  url: [
    { required: true, message: t("material.enterImageUrlRequired"), trigger: "blur" },
    {
      pattern: /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp|svg|bmp|tiff)(\?.*)?$/i,
      message: t("material.enterValidImageUrl"),
      trigger: "blur",
    },
  ],
  name: [{ required: true, message: t("material.enterFileName"), trigger: "blur" }],
};

// 重置URL上传表单
function resetUrlUploadForm() {
  urlUploadForm.url = "";
  urlUploadForm.name = "";
  urlUploadForm.nameEn = "";
  urlUploadForm.description = "";
  urlUploadForm.descriptionEn = "";
  urlUploadForm.keywords = "";
  urlUploadForm.keywordsEn = "";
  urlUploadForm.isCustom = false;
  urlUploadForm.isInfringement = false;
  urlUploadForm.useAiGenerate = false;
  urlPreviewVisible.value = false;
  imageInfo.value = null;
}

// 监听URL变化，自动显示预览
watch(
  () => urlUploadForm.url,
  (newUrl) => {
    if (newUrl && isValidImageUrl(newUrl)) {
      urlPreviewVisible.value = true;
      imageInfo.value = null;
    } else {
      urlPreviewVisible.value = false;
      imageInfo.value = null;
    }
  },
);

// 验证是否为有效的图片URL
function isValidImageUrl(url) {
  const imageExtensions = /\.(jpg|jpeg|png|gif|webp|svg|bmp|tiff)(\?.*)?$/i;
  return imageExtensions.test(url);
}

// 处理预览图片加载成功
function handlePreviewLoad(event) {
  const img = event.target;
  imageInfo.value = {
    width: img.naturalWidth,
    height: img.naturalHeight,
    size: t("material.unknown"),
  };
}

// 处理预览图片加载失败
function handlePreviewError() {
  ElMessage.warning(t("material.previewLoadFailed"));
  urlPreviewVisible.value = false;
}

// 从URL获取图片文件
async function fetchImageFromUrl(url) {
  try {
    const response = await fetch(url, {
      method: "GET",
      mode: "cors",
      headers: {
        Accept: "image/*",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.startsWith("image/")) {
      throw new Error(t("material.notAnImageFile"));
    }

    const blob = await response.blob();

    // 检查文件大小（限制10MB）
    if (blob.size > 10 * 1024 * 1024) {
      throw new Error(t("material.imageFileTooLarge"));
    }

    // 从URL或content-type获取文件扩展名
    let extension = "jpg";
    const urlMatch = url.match(/\.([a-zA-Z0-9]+)(\?.*)?$/i);
    if (urlMatch) {
      extension = urlMatch[1].toLowerCase();
    } else if (contentType) {
      const typeMatch = contentType.match(/image\/([a-zA-Z0-9]+)/i);
      if (typeMatch) {
        extension = typeMatch[1].toLowerCase();
        if (extension === "jpeg") extension = "jpg";
      }
    }

    // 创建File对象
    const fileName = urlUploadForm.name || `image_${Date.now()}.${extension}`;
    const file = new File([blob], fileName, { type: blob.type });

    return { file, extension };
  } catch (error) {
    console.error("获取图片失败:", error);
    throw new Error(t("material.fetchImageFailed", { message: error.message }));
  }
}

let submenuHideTimer: ReturnType<typeof setTimeout> | null = null;

function hideAllOperationSubmenus() {
  if (submenuHideTimer) {
    clearTimeout(submenuHideTimer);
    submenuHideTimer = null;
  }

  const allSubmenus = document.querySelectorAll(".op-submenu") as NodeListOf<HTMLElement>;
  allSubmenus.forEach((submenu) => {
    submenu.style.opacity = "0";
    submenu.style.visibility = "hidden";
    submenu.style.pointerEvents = "none";
    submenu.style.transform = "";
  });
}

function closeOperationDropdown(rowId?: string) {
  const targetRowId = rowId || activeOperationRowId.value;
  if (targetRowId) {
    operationDropdownRefs.get(targetRowId)?.handleClose?.();
  }
  if (!rowId || activeOperationRowId.value === rowId) {
    activeOperationRowId.value = "";
  }
  hideAllOperationSubmenus();
}

// 处理子菜单显示和定位
function handleSubmenuEnter(event: MouseEvent) {
  const menuItem = event.currentTarget as HTMLElement;
  if (!menuItem) return;

  const submenu = menuItem.querySelector(".op-submenu") as HTMLElement;
  if (!submenu) return;

  // 先隐藏所有其他子菜单
  const allSubmenus = document.querySelectorAll(".op-submenu") as NodeListOf<HTMLElement>;
  allSubmenus.forEach((sm) => {
    if (sm !== submenu) {
      sm.style.opacity = "0";
      sm.style.visibility = "hidden";
      sm.style.pointerEvents = "none";
    }
  });

  // 清除之前的隐藏定时器
  if (submenuHideTimer) {
    clearTimeout(submenuHideTimer);
    submenuHideTimer = null;
  }

  // 获取菜单项的位置（使用 getBoundingClientRect 获取相对于视口的位置）
  const menuItemRect = menuItem.getBoundingClientRect();

  // 临时显示子菜单到屏幕外以获取其真实尺寸
  submenu.style.position = "fixed";
  submenu.style.left = "-9999px";
  submenu.style.top = "0";
  submenu.style.right = "auto"; // 清除可能存在的 right 属性
  submenu.style.opacity = "1";
  submenu.style.visibility = "visible";
  submenu.style.transform = "none";
  submenu.style.pointerEvents = "none";

  // 强制重排以获取真实尺寸
  void submenu.offsetWidth;

  // 获取子菜单的尺寸
  const submenuWidth = submenu.offsetWidth || 160; // 如果没有获取到，使用默认值 160px
  const submenuHeight = submenu.offsetHeight;

  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  // 计算子菜单的位置（优先右侧，空间不足则左侧）
  let left = menuItemRect.right + 4;
  let top = menuItemRect.top;

  // 检查右侧是否有足够空间
  if (left + submenuWidth > viewportWidth - 10) {
    // 如果右侧空间不足，显示在左侧
    left = menuItemRect.left - submenuWidth - 4;
    // 确保不会超出屏幕左边界
    if (left < 10) {
      left = 10;
    }
  }

  // 检查底部是否有足够空间，如果不够则向上调整
  if (top + submenuHeight > viewportHeight - 10) {
    top = Math.max(10, viewportHeight - submenuHeight - 10);
  }

  // 确保顶部不会超出屏幕
  if (top < 10) {
    top = 10;
  }

  // 设置子菜单的最终位置和样式
  // 使用 setProperty 并设置 important 标志，确保位置不被 CSS 覆盖
  submenu.style.setProperty("right", "auto", "important");
  submenu.style.setProperty("left", `${left}px`, "important");
  submenu.style.setProperty("top", `${top}px`, "important");
  submenu.style.opacity = "1";
  submenu.style.visibility = "visible";
  submenu.style.transform = "translateX(0)";
  submenu.style.pointerEvents = "auto";

  // 确保位置设置生效，强制重排
  void submenu.offsetWidth;
}

function handleSubmenuLeave(event: MouseEvent) {
  const menuItem = event.currentTarget as HTMLElement;
  if (!menuItem) return;

  const submenu = menuItem.querySelector(".op-submenu") as HTMLElement;
  if (!submenu) return;

  // 清除之前的定时器
  if (submenuHideTimer) {
    clearTimeout(submenuHideTimer);
  }

  // 延迟隐藏，允许鼠标移动到子菜单
  submenuHideTimer = setTimeout(() => {
    // 检查鼠标是否仍在子菜单上
    const elementUnderMouse = document.elementFromPoint(event.clientX, event.clientY);
    const isHovering =
      elementUnderMouse?.closest(".op-submenu") === submenu ||
      elementUnderMouse?.closest(".has-submenu") === menuItem;

    if (!isHovering) {
      submenu.style.opacity = "0";
      submenu.style.visibility = "hidden";
      submenu.style.pointerEvents = "none";
    }
  }, 200);
}

// 保持子菜单可见
function handleSubmenuKeepVisible(event: MouseEvent) {
  const submenu = event.currentTarget as HTMLElement;
  if (!submenu) return;

  // 先隐藏所有其他子菜单
  const allSubmenus = document.querySelectorAll(".op-submenu") as NodeListOf<HTMLElement>;
  allSubmenus.forEach((sm) => {
    if (sm !== submenu) {
      sm.style.opacity = "0";
      sm.style.visibility = "hidden";
      sm.style.pointerEvents = "none";
    }
  });

  // 清除隐藏定时器
  if (submenuHideTimer) {
    clearTimeout(submenuHideTimer);
    submenuHideTimer = null;
  }

  // 确保子菜单可见
  submenu.style.opacity = "1";
  submenu.style.visibility = "visible";
  submenu.style.pointerEvents = "auto";
}

// 隐藏子菜单
function handleSubmenuHide(event: MouseEvent) {
  const submenu = event.currentTarget as HTMLElement;
  if (!submenu) return;

  // 延迟隐藏
  submenuHideTimer = setTimeout(() => {
    submenu.style.opacity = "0";
    submenu.style.visibility = "hidden";
    submenu.style.pointerEvents = "none";
  }, 200);
}

// 复制文本到剪贴板
async function handleCopyText(text: string, label: string) {
  if (!text) {
    ElMessage.warning(t("material.emptyCannotCopy", { label }));
    return;
  }

  try {
    await navigator.clipboard.writeText(text);
    ElMessage.success(t("material.copiedToClipboard", { label }));
  } catch (error) {
    // 降级方案：使用传统方法
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand("copy");
      ElMessage.success(t("material.copiedToClipboard", { label }));
    } catch (e) {
      ElMessage.error(t("material.copyFailed"));
    }
    document.body.removeChild(textarea);
  }
}

// 处理URL上传
async function handleUrlUpload() {
  if (!urlUploadFormRef.value) return;

  try {
    // 验证表单
    await urlUploadFormRef.value.validate();

    urlUploadLoading.value = true;

    // 获取图片文件
    const { file, extension } = await fetchImageFromUrl(urlUploadForm.url);

    // 上传到COS
    const userAccount =
      (userStore.user as any)?.account ||
      userStore.user?.shortName ||
      userStore.user?.name ||
      "anonymous";
    const userId = (userStore.user as any)?.id || (userStore as any).userInfo?.id;
    const cos = await uploadToCOS({
      file,
      category: "sticker", // 素材上传到 sticker 分类
      account: userAccount,
      userId,
    });
    const { key, url } = cos;

    // 计算图片宽高及宽高比（如果预览阶段已经获取到了尺寸，则优先使用）
    const width = imageInfo.value?.width || 0;
    const height = imageInfo.value?.height || 0;
    const aspectRatio = width && height ? width / height : undefined;

    // 上传到服务器
    await uploadMaterialFile({
      url,
      name: urlUploadForm.name,
      nameEn: urlUploadForm.nameEn,
      description: urlUploadForm.description,
      descriptionEn: urlUploadForm.descriptionEn,
      keywords: urlUploadForm.keywords,
      keywordsEn: urlUploadForm.keywordsEn,
      suffix: extension,
      isCustom: urlUploadForm.isCustom,
      isInfringement: urlUploadForm.isInfringement,
      width,
      height,
      aspectRatio,
      userId: userStore.user?.id,
      useAiGenerate: urlUploadForm.useAiGenerate, // 是否使用AI生成补全内容
    });

    ElNotification.success(t("material.imageUploadSuccess"));
    urlUploadModalVisible.value = false;
    resetUrlUploadForm();

    // 刷新列表
    getList();
  } catch (error) {
    console.error("URL上传失败:", error);
    ElMessage.error(t("material.uploadFailed", { message: error.message }));
  } finally {
    urlUploadLoading.value = false;
  }
}
</script>
<style scoped>


@media (width <= 960px) {
  .psd-set-body {
    grid-template-columns: 1fr;
  }

  .psd-set-content-container {
    flex-direction: column;
  }

  .psd-template-folder-filter {
    width: 100%;
    align-items: stretch;
  }

  .psd-template-folder-filter__cascader {
    width: 100%;
  }

  .psd-set-footer {
    align-items: stretch;
  }

  .psd-set-dialog :deep(.el-dialog__body) {
    padding: 0 12px 12px;
  }

  .psd-set-footer-actions,
  .footer-actions {
    width: 100%;
    justify-content: flex-end;
    gap: 8px;
  }

}

@media (width <= 1366px) {
  /* 在较小分辨率下进一步缩小避免溢出 */
  .search-bar-form :deep(.el-col) {
    /* 保持栅格布局，不再通过 flex-basis/min-width 干预 */
  }
}

@media (width <= 992px) {
  .phash-form-row {
    grid-template-columns: 1fr;
    align-items: stretch;
  }

  .search-actions-col {
    justify-content: flex-start;
  }

  .search-actions {
    justify-content: flex-start;
  }
}

@media (width <= 600px) {

  .flex.pb-4,
  .search-bar {
    flex-direction: column !important;
    align-items: stretch !important;
    gap: 8px !important;
    padding-bottom: 8px !important;
  }

  .flex.pb-4>*,
  .search-bar>* {
    width: 100% !important;
    min-width: 0 !important;
    margin-right: 0 !important;
    margin-bottom: 8px !important;
  }

  .el-input,
  .el-select,
  .el-button,
  .el-date-editor {
    width: 100% !important;
    min-width: 0 !important;
    box-sizing: border-box;
  }

  .date-range-picker {
    width: 100% !important;
    max-width: 100% !important;
    min-width: 0 !important;
    box-sizing: border-box;
  }

  .date-range-picker .el-date-editor,
  .date-range-picker .el-range-editor {
    width: 100% !important;
    max-width: 100% !important;
    min-width: 0 !important;
  }

  .content-container {
    padding: 0 4px !important;
  }
}

/* 响应式布局 */
@media (width <= 768px) {
  .url-upload-container {
    flex-direction: column;
    gap: 16px;
  }

  .preview-section {
    min-height: 150px;
  }

  .image-preview,
  .preview-placeholder,
  .preview-error {
    min-height: 150px;
  }

  .preset-buttons {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (width <= 960px) {
  .material-publish-config-dialog {
    :deep(.el-dialog__body) {
      overflow: auto;
    }
  }

  .material-publish-config-dialog__body {
    grid-template-columns: 1fr;
    height: auto;
    min-height: auto;
  }

  .material-publish-config-dialog__section-head--configs,
  .material-publish-config-dialog__footer {
    flex-direction: column;
    align-items: stretch;
  }

  .material-publish-config-dialog__search {
    width: 100%;
  }

  .material-publish-config-dialog__footer-actions {
    justify-content: flex-end;
  }
}

@media (width <= 640px) {
  .material-publish-config-dialog {
    :deep(.el-dialog__header) {
      padding: 12px 12px 0;
    }

    :deep(.el-dialog__body) {
      padding: 0 12px 12px;
    }

    :deep(.el-dialog__footer) {
      padding: 10px 12px 12px;
    }
  }

  .material-publish-config-dialog__material-item {
    min-width: 0;
  }

  .material-publish-config-dialog__material-preview {
    width: 100%;
  }
}

.material-compact-preview {
  position: relative;
  display: inline-flex;
  width: 96px;
  height: 96px;
  overflow: hidden;
  background: var(--el-fill-color-lighter);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 6px;
  align-items: center;
  justify-content: center;
}

.material-compact-preview__image-wrap {
  display: flex;
  width: 100%;
  height: 100%;
  align-items: center;
  justify-content: center;
}

.material-compact-preview__image {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
  cursor: zoom-in;
}

.material-compact-preview__empty {
  font-size: 12px;
  color: var(--el-text-color-placeholder);
}

.material-compact-preview__corner {
  position: absolute;
  top: 3px;
  left: 3px;
  z-index: 2;
  display: inline-flex;
  height: 16px;
  padding: 0 5px;
  font-size: 10px;
  line-height: 1;
  color: #fff;
  pointer-events: none;
  background: color-mix(in srgb, var(--el-color-primary) 92%, transparent);
  border-radius: 999px;
  align-items: center;
}

.material-compact-name {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 4px;
}

.material-compact-name__title {
  overflow: hidden;
  font-size: 13px;
  font-weight: 600;
  line-height: 1.35;
  color: var(--el-text-color-primary);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.material-compact-name__title--wrap {
  word-break: break-word;
  white-space: normal;
}

/* 编码列 */
.code-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 12px;
  line-height: 1.3;
}

.code-value {
  font-family: "Courier New", Consolas, monospace;
  font-size: 11px;
  color: var(--el-text-color-regular);
}

.code-clickable {
  padding: 1px 4px;
  cursor: pointer;
  border-radius: 3px;
  transition: background-color 0.2s;
}

.code-clickable:hover {
  color: var(--el-color-primary);
  background-color: var(--el-color-primary-light-9);
}

.id-value {
  font-size: 11px;
  color: var(--el-text-color-secondary);
}

.id-clickable {
  padding: 1px 4px;
  cursor: pointer;
  border-radius: 3px;
  transition: background-color 0.2s;
}

.id-clickable:hover {
  color: var(--el-color-info);
  background-color: var(--el-color-info-light-9);
}

/* 文件信息合并列 */
.file-info {
  display: flex;
  flex-direction: column;
  gap: 1px;
  padding: 2px 0;
}

.file-info__tag,
.file-info__size,
.file-info__resolution,
.file-info__ratio {
  width: fit-content;
  padding: 0 4px;
  font-family: "Courier New", Consolas, monospace;
  font-size: 10px;
  line-height: 14px;
  letter-spacing: 0.3px;
  color: var(--el-text-color-secondary);
  background: var(--el-fill-color-lighter);
  border-radius: 2px;
}

.material-compact-name__meta {
  display: flex;
  min-width: 0;
  overflow: hidden;
  font-size: 12px;
  line-height: 1.2;
  color: var(--el-text-color-secondary);
  text-overflow: ellipsis;
  white-space: nowrap;
  gap: 5px;
}

/* 抠图标签 */
.cutout-tag {
  font-size: 11px;
}

.material-compact-badge {
  display: inline-flex;
  height: 20px;
  padding: 0 6px;
  font-size: 12px;
  line-height: 1;
  color: var(--el-text-color-regular);
  white-space: nowrap;
  background: var(--el-fill-color-lighter);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 999px;
  align-items: center;
}

.material-compact-badge--success {
  color: var(--el-color-success);
  background: var(--el-color-success-light-9);
  border-color: var(--el-color-success-light-7);
}

.material-compact-badge--danger {
  color: var(--el-color-danger);
  background: var(--el-color-danger-light-9);
  border-color: var(--el-color-danger-light-7);
}

/* 预览图片容器样式 */
.preview-image-wrapper {
  position: relative;
  display: flex;
  width: 120px;
  min-height: 80px;
  border-radius: 4px;
  align-items: center;
  justify-content: center;
}

.table-preview-stack--custom {
  position: relative;
  padding-top: 20px;
}

.preview-custom-corner {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 2;
  display: inline-flex;
  height: 17px;
  padding: 0 6px;
  font-size: 10px;
  font-weight: 600;
  line-height: 1;
  letter-spacing: 0;
  color: #f5fff0;
  white-space: nowrap;
  pointer-events: none;
  background: linear-gradient(135deg, #a3ff12 0%, #39ff14 55%, #00dc82 100%);
  border-radius: 999px;
  box-shadow:
    0 0 0 1px rgb(210 255 165 / 52%),
    0 3px 8px rgb(57 255 20 / 24%);
  align-items: center;
  justify-content: center;
}

.preview-image {
  display: block;
  width: 120px;
  height: auto;
  max-height: 120px;
  cursor: pointer;
  object-fit: contain;
}

.preview-image-loading {
  display: none !important;
  opacity: 0;
  visibility: hidden;
}

.preview-loading {
  position: absolute;
  top: 50%;
  left: 50%;
  z-index: 1;
  font-size: 12px;
  color: #999;
  pointer-events: none;
  background: transparent;
  transform: translate(-50%, -50%);
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

.design-model-dialog :deep(.el-dialog__body) {
  max-height: calc(100vh - 160px);
  overflow: hidden;
}

.design-model-flex {
  height: 100%;
  overflow: hidden;
}

.design-model-content {
  max-height: calc(100vh - 80px);
  overflow: auto;
}

.selected-materials {
  display: flex;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  flex-direction: column;
}

.selected-materials .thumbs {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.selected-materials .thumb {
  width: 72px;
  height: 72px;
  overflow: hidden;
  background: var(--el-fill-color-lighter);
  border: 1px solid var(--el-border-color);
  border-radius: 4px;
}

.selected-materials .thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.template-header {
  padding-bottom: 8px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.template-title {
  margin: 0;
  margin-bottom: 4px;
  font-size: 16px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.template-description {
  margin-top: 4px;
  font-size: 13px;
  line-height: 1.5;
  color: var(--el-text-color-secondary);
}

.template-content {
  width: 100%;
}

.config-summary {
  width: 100%;
  text-align: center;
}

.config-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.config-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 2px 0;
  font-size: 12px;
}

.config-label {
  font-size: 11px;
  font-weight: 500;
  color: var(--el-text-color-secondary);
}

.config-value {
  font-size: 11px;
  font-weight: 600;
  color: var(--el-color-primary);
}

.config-default {
  padding: 8px;
  font-size: 11px;
  font-style: italic;
  color: var(--el-text-color-placeholder);
  background: var(--el-fill-color-lighter);
  border: 1px dashed var(--el-border-color-light);
  border-radius: 4px;
}

.section-title {
  display: flex;
  padding-bottom: 0;
  margin-bottom: 8px;
  font-size: 14px;
  border-bottom: none;
  align-items: center;
  gap: 12px;
}

.section-title .selected-count {
  padding: 2px 8px;
  font-size: 13px;
  font-weight: 500;
  color: var(--el-color-primary);
  background: color-mix(in srgb, var(--el-color-primary) 10%, transparent);
  border: 1px solid color-mix(in srgb, var(--el-color-primary) 30%, transparent);
  border-radius: 4px;
}

.section-title .template-count-info {
  margin-left: 4px;
  font-size: 12px;
  font-weight: normal;
  color: var(--el-text-color-secondary);
}

.result-info {
  grid-column: 1 / -1;
}

:global(.psd-set-dialog.el-dialog) {
  --psd-set-workbench-min-height: 560px;

  display: flex;
  width: 100%;
  height: 100vh;
  height: 100dvh;
  min-height: 760px;
  flex-direction: column;
  margin: 0;
  overflow: hidden;
  background: var(--el-dialog-bg-color, var(--el-bg-color));
}

:global(.psd-set-dialog.el-dialog .el-dialog__header) {
  padding: 14px 16px 12px;
  margin-right: 0;
  flex: 0 0 auto;
}

:global(.psd-set-dialog.el-dialog .el-dialog__body) {
  flex: 1 1 0;
  display: grid;
  grid-template-rows: minmax(var(--psd-set-workbench-min-height), 1fr) auto;
  gap: 10px;
  height: 0;
  min-height: 0;
  padding: 0 16px 16px;
  overflow: auto;
  background: var(--el-bg-color-page);
}

.psd-set-dialog__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
  width: 100%;
  flex-wrap: wrap;
}

.psd-set-dialog__header-main {
  min-width: 0;
}

.psd-set-dialog__header-title {
  font-size: 20px;
  font-weight: 700;
  color: var(--el-text-color-primary);
}

.psd-set-dialog__header-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.psd-set-dialog__header-chip {
  display: inline-flex;
  min-height: 28px;
  padding: 0 12px;
  font-size: 12px;
  color: var(--el-text-color-regular);
  background: var(--el-fill-color-light);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 999px;
  align-items: center;
}

.psd-set-dialog__header-chip.is-accent {
  color: #188058;
  background: rgb(24 160 88 / 10%);
  border-color: rgb(24 160 88 / 18%);
}

.psd-set-panel__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.psd-set-panel__eyebrow {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.08em;
  color: var(--el-color-primary);
  text-transform: uppercase;
}

.psd-set-panel__desc {
  margin-top: -6px;
  font-size: 12px;
  line-height: 1.6;
  color: var(--el-text-color-secondary);
}

.psd-set-panel__tags {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.psd-set-panel__alert {
  margin: 0;
}

.psd-set-mode-inline {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.psd-set-mode-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--el-text-color-regular);
}

.psd-set-mode-group {
  margin: 0;
}

.psd-set-mode-tip {
  font-size: 12px;
  line-height: 1.6;
  color: var(--el-text-color-secondary);
}

.psd-set-footer {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex-shrink: 0;
  padding-top: 10px;
  border-top: 1px solid var(--el-border-color-lighter);
}

.psd-set-footer-main {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  flex-wrap: wrap;
}

.psd-set-footer-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-left: auto;
}

.psd-set-info {
  display: flex;
  min-width: 0;
  font-size: 12px;
  color: var(--el-color-info);
  align-items: center;
  gap: 4px;
}

.psd-set-info :deep(.el-icon) {
  margin-top: 0;
  font-size: 14px;
  flex-shrink: 0;
}

.psd-set-info-content {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
  flex: 1;
}

.psd-set-info-chip {
  display: inline-flex;
  min-height: 22px;
  padding: 1px 7px;
  font-size: 12px;
  line-height: 1.35;
  color: var(--el-color-info-dark-2);
  background: var(--el-color-info-light-9);
  border-radius: 999px;
  align-items: center;
}

.psd-set-info-chip--subtle {
  color: var(--el-text-color-secondary);
  background: var(--el-fill-color-lighter);
}

.psd-set-automation-dialog-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.psd-set-automation-dialog__header {
  width: 100%;
}

.psd-set-automation-dialog__eyebrow {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.08em;
  color: var(--el-color-primary);
  text-transform: uppercase;
}

.psd-set-automation-dialog__title {
  margin-top: 4px;
  font-size: 18px;
  font-weight: 700;
  color: var(--el-text-color-primary);
}

.psd-set-automation-dialog__subtitle,
.psd-set-automation-dialog__intro {
  margin-top: 6px;
  font-size: 12px;
  line-height: 1.6;
  color: var(--el-text-color-secondary);
}

.psd-set-automation-item {
  display: flex;
  padding: 16px;
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 14px;
  flex-direction: column;
  gap: 10px;
}

.psd-set-automation-item.is-active {
  background: linear-gradient(135deg, rgb(24 160 88 / 8%), rgb(24 160 88 / 2%));
  border-color: rgb(24 160 88 / 24%);
  box-shadow: 0 8px 24px rgb(24 160 88 / 8%);
}

.psd-set-automation-head {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.psd-set-automation-key {
  font-family: Menlo, Monaco, Consolas, "Courier New", monospace;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.psd-set-automation-desc {
  font-size: 12px;
  line-height: 1.6;
  color: var(--el-text-color-secondary);
}

.psd-set-automation-config {
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-width: 720px;
}

.psd-set-automation-field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.psd-set-automation-field-title {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  font-size: 13px;
  color: var(--el-text-color-primary);
}

.psd-set-automation-field-key {
  font-family: Menlo, Monaco, Consolas, "Courier New", monospace;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.psd-set-automation-list {
  width: 100%;
}

.psd-set-automation-list__toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
  flex-wrap: wrap;
}

.psd-set-automation-list__toolbar .el-input {
  max-width: 360px;
  min-width: 240px;
}

.psd-set-automation-list__grid {
  width: 100%;
  overflow: hidden;
  border-radius: 6px;
}

.psd-set-automation-list__grid :deep(.vxe-table) {
  font-size: 12px;
}

.psd-set-automation-list__grid :deep(.vxe-header--row) {
  height: 34px;
}

.psd-set-automation-list__grid :deep(.vxe-header--column) {
  height: 34px !important;
  padding-top: 6px !important;
  padding-bottom: 6px !important;
  font-size: 12px !important;
  background: var(--el-fill-color-light);
}

.psd-set-automation-list__grid :deep(.vxe-header--column .vxe-cell),
.psd-set-automation-list__grid :deep(.vxe-header--column .vxe-cell--title) {
  min-height: 18px !important;
  padding-top: 0 !important;
  padding-bottom: 0 !important;
  font-size: 12px !important;
  font-weight: 600 !important;
  line-height: 18px !important;
}

.psd-set-automation-list__grid :deep(.vxe-body--column) {
  height: 32px;
  padding-top: 5px;
  padding-bottom: 5px;
}

.footer-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
  margin-left: auto;
}

.material-dnd-grid :deep(.vxe-table--body tbody tr.is-dragging-row) {
  background: var(--el-color-primary-light-9) !important;
  opacity: 0.6 !important;
}

.material-dnd-grid :deep(.vxe-table--body tbody tr.is-publish-usage-occupied .vxe-body--column) {
  background: rgb(245 158 11 / 10%) !important;
}

.material-dnd-grid :deep(.vxe-table--body tbody tr.is-publish-usage-available .vxe-body--column) {
  background: rgb(34 197 94 / 8%) !important;
}

.material-dnd-grid :deep(.vxe-table--body tbody tr.is-publish-usage-occupied:hover .vxe-body--column) {
  background: rgb(245 158 11 / 16%) !important;
}

.material-dnd-grid :deep(.vxe-table--body tbody tr.is-publish-usage-available:hover .vxe-body--column) {
  background: rgb(34 197 94 / 13%) !important;
}

.material-dnd-grid :deep(.vxe-table--body tbody tr.has-publish-usage-badge .vxe-body--column:first-child) {
  position: relative;
  cursor: pointer;
}

.material-dnd-grid :deep(.vxe-table--body tbody tr.has-publish-usage-badge .vxe-body--column:first-child::before) {
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

.material-dnd-grid :deep(.vxe-table--body tbody tr.is-publish-usage-occupied .vxe-body--column:first-child::before) {
  background: rgb(217 119 6 / 94%);
  content: "已用";
}

.material-dnd-grid :deep(.vxe-table--body tbody tr.is-publish-usage-available .vxe-body--column:first-child::before) {
  background: rgb(22 163 74 / 94%);
  content: "未用";
}

.material-drag-ghost {
  background: var(--el-color-primary-light-8) !important;
  opacity: 0.4 !important;
}

.flex.pb-4,
.search-bar {
  gap: 12px;

  /* 收紧整体水平/垂直间距 */
  flex-wrap: wrap;
  align-items: center;
}

.flex.pb-4>*,
.search-bar>* {
  margin-bottom: 0;
}

/* 顶部筛选：el-form 栅格布局（PC） */
.search-bar-form {
  width: 100%;
  margin-bottom: 8px;

  /* 收紧表单与列表间距 */
}

.search-bar-form :deep(.el-form-item) {
  margin-bottom: 6px;

  /* 控件间垂直间距收紧 */
}

.search-bar-form :deep(.el-form-item__label) {
  padding-right: 6px;

  /* 收紧 label 与控件的左右间距 */
  text-align: right;

  /* label 右对齐，保持整齐 */
}

.search-bar-form :deep(.el-form-item__label),
.search-bar-form :deep(.el-form-item__content) {
  line-height: 32px;
}

.search-bar-form :deep(.el-form-item__content) {
  display: flex;
  min-height: 32px;
  align-items: center;

  /* 解决 switch / date 等控件高度导致的错位 */
}

.search-btn-offset {
  /* 与表单 label-width 对齐，避免按钮列挤压导致大屏错位 */
  display: flex;
  padding-left: 84px;
  align-items: center;
}

.search-field {
  display: flex;
  width: 240px;
  min-height: 32px;
  align-items: center;
  gap: 6px;

  /* 默认固定宽度 */
  flex-shrink: 0;
}

/* 宽字段 - 用于需要更大输入空间的字段 */
.search-field-wide {
  width: 320px;
}

/* 窄字段 - 用于开关等简单控件 */
.search-field-narrow {
  width: 120px;
}

/* 时间字段 - 需要更宽的空间 */
.search-field-time {
  width: 380px;
}

.search-label {
  width: 48px;
  min-width: 48px;
  padding-right: 4px;
  font-size: 13px;
  line-height: 32px;
  color: var(--el-text-color-regular);
  text-align: right;
  flex-shrink: 0;
}

.search-field> :not(.search-label) {
  max-width: 100%;
  min-width: 0;
  flex: 1;
}

.search-field .el-input,
.search-field .el-select {
  width: 100%;
}

.search-field .el-button {
  white-space: nowrap;
}

.search-bar-form :deep(.el-form-item__content)>* {
  width: 100%;
}

.search-bar-form :deep(.el-switch) {
  width: auto;

  /* switch 不要被拉伸占满，避免看起来不齐 */
}

/* 搜索表单容器 - Flex布局 */
.search-form-container {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-start;
  gap: 10px 12px;

  /* 紧凑的间距 */
  margin-bottom: 12px;
}

.search-button-field {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  flex-basis: 100%;
  margin-top: 8px;
}

.search-field-actions {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  width: 100%;
  flex-basis: 100%;
  padding-top: 8px;
  margin-top: 4px;
  border-top: 1px solid var(--el-border-color-lighter);
}

/* 相似搜索 - 占满整行 */
.search-field-similar {
  width: 100%;
  flex-basis: 100%;
  padding-top: 8px;
  margin-top: 4px;
  border-top: 1px solid var(--el-border-color-lighter);
  align-items: flex-start;
}

.search-field-similar .phash-form-row {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 10px;
  flex: 1;
  min-width: 0;
}

.search-field-similar .phash-form-row .el-input {
  max-width: none;
  flex: 1 1 auto;
}

.search-field-similar .phash-mode {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}

.search-field-similar .phash-top-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  min-width: 0;
}

.search-field-similar .phash-top-row .el-input {
  min-width: 260px;
  flex: 1 1 420px;
}

.search-field-similar .phash-top-actions {
  display: flex;
  gap: 6px;
  align-items: center;
  flex-wrap: wrap;
  flex-shrink: 0;
}

.search-field-similar .phash-actions {
  display: flex;
  gap: 6px;
  align-items: center;
  flex-wrap: wrap;
  width: 100%;
  flex: 0 0 auto;
}

.search-field-similar .el-button {
  white-space: nowrap;
}

/* 移除按钮字段的特定宽度限制 */

/* 搜索区域允许换行 */
.search-bar .el-row {
  flex-wrap: wrap !important;

  /* 强制允许换行，避免挤压 */
  gap: 12px 8px;
}

.search-bar-form :deep(.el-row) {
  flex-wrap: wrap;

  /* 允许控件换行，避免挤压重叠 */
  gap: 6px;

  /* 进一步收紧间距 */
}

.search-bar-form :deep(.el-col) {
  /* 不要覆盖 Element Plus 栅格（span/lg/xl），否则大屏下会错位且宽度调整不生效 */
  max-width: 100%;
  padding-right: 0;
  padding-left: 0;
}

.search-bar-form :deep(.el-input),
.search-bar-form :deep(.el-select),
.search-bar-form :deep(.el-date-editor) {
  width: 100%;

  /* 让控件随栅格收缩，不会撑破布局 */
  max-width: 100%;
  min-width: 0;
}

.search-bar-form :deep(.el-input__wrapper),
.search-bar-form :deep(.el-select__wrapper),
.search-bar-form :deep(.el-date-editor .el-input__wrapper) {
  max-width: 100%;
  min-width: 0;
}

.search-actions-col {
  display: flex;
  justify-content: flex-start;

  /* 让筛选表单操作按钮靠左对齐 */
  margin-top: 4px;
}

.search-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-start;

  /* 左对齐避免两侧空白 */
  gap: 6px;
  align-items: center;
}

.phash-form-row {
  display: grid;
  grid-template-columns: 1fr auto auto;
  gap: 8px;
  align-items: center;
  width: 100%;
}

.phash-mode {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}

.phash-actions {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}

.table-header {
  border-radius: 4px;
  box-shadow: rgb(17 17 26 / 15%) 0 1px 0;
}

h1 {
  font-size: 1rem;
}

/* 步骤内容区块统一透明背景风格 */
.step-content {
  padding: 24px;
  margin-bottom: 24px;
  color: #fff;
  background: transparent;
  border-radius: 8px;
  transition:
    box-shadow 0.2s,
    background 0.2s,
    opacity 0.2s;
}

.step-active {
  background: color-mix(in srgb, var(--el-color-primary) 10%, transparent) !important;

  /* 高亮：主色+透明 */
  opacity: 1;
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--el-color-primary) 27%, transparent);
}

.step-inactive {
  background: rgb(100 100 100 / 6%) !important;

  /* 弱化：深灰+透明 */
  opacity: 0.6;
  filter: grayscale(0.2);
}

/* 去除步骤内容内部的白色/灰色背景 */
.bg-gray-50,
.border-blue-200,
.bg-blue-50 {
  background: transparent !important;
  border-color: color-mix(in srgb, var(--el-color-primary) 15%, transparent) !important;
}

.design-model-flex {
  display: flex;
  flex-direction: row;
  height: 100%;
}

.steps-vertical {
  flex-shrink: 0;
  min-width: 180px;
  margin-right: 32px;
}

.design-model-content {
  flex: 1;
  overflow-y: auto;
}

/* URL上传容器布局 */
.url-upload-container {
  display: flex;
  gap: 20px;
  min-height: 300px;
}

.form-section {
  flex: 1;
  min-width: 0;
}

.preview-section {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
}

.preview-label {
  margin-bottom: 12px;
  font-size: 14px;
  font-weight: 500;
  color: #606266;
}

.image-preview {
  display: flex;
  min-height: 200px;

  /* background-color: #fafafa; */
  padding: 16px;
  border: 1px solid #e4e7ed;
  border-radius: 6px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.preview-image {
  max-width: 100%;
  max-height: 200px;
  background-color: #fff;
  background-image:
    linear-gradient(45deg, #e0e0e0 25%, transparent 25%),
    linear-gradient(-45deg, #e0e0e0 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #e0e0e0 75%),
    linear-gradient(-45deg, transparent 75%, #e0e0e0 75%);
  background-position:
    0 0,
    0 5px,
    5px -5px,
    -5px 0;
  background-size: 10px 10px;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgb(0 0 0 / 10%);
  object-fit: contain;
}

.image-info {
  display: flex;
  margin-top: 12px;
  justify-content: center;
  gap: 8px;
  flex-wrap: wrap;
}

.preview-placeholder,
.preview-error {
  display: flex;
  min-height: 200px;
  padding: 16px;
  color: #909399;
  text-align: center;
  background-color: #fafafa;
  border: 1px solid #e4e7ed;
  border-radius: 6px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.preview-error {
  color: #f56c6c;
}

.error-text {
  margin-top: 4px;
  font-size: 12px;
}

.preview-placeholder p,
.preview-error p {
  margin: 8px 0 0;
  font-size: 14px;
}

/* URL上传弹窗：扁平简洁 */
:global(.url-upload-dialog .el-form-item) {
  margin-bottom: 14px;
}

:global(.url-upload-dialog .preview-section) {
  margin-top: 4px;
}

:global(.url-upload-dialog .preview-label) {
  margin-bottom: 8px;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

:global(.url-upload-dialog .image-preview),
:global(.url-upload-dialog .preview-placeholder),
:global(.url-upload-dialog .preview-error) {
  min-height: 150px;
  padding: 0;
  background: transparent;
  border: none;
  border-radius: 0;
}

:global(.url-upload-dialog .preview-image) {
  max-height: 180px;
  box-shadow: none;
}

:global(.url-upload-dialog .preview-placeholder p),
:global(.url-upload-dialog .preview-error p) {
  font-size: 13px;
}

/* SVG转PNG弹窗样式 */
.svg-to-png-form {
  padding: 16px 0;
}

.section-title {
  padding-bottom: 8px;
  margin: 0 0 16px;
  font-size: 16px;
  font-weight: 600;
  border-bottom: 1px solid #e4e7ed;
}

.form-section {
  margin-bottom: 24px;
}

.original-info {
  padding: 8px 12px;
  margin-bottom: 16px;
  background-color: color-mix(in srgb, var(--el-color-primary) 10%, transparent);
  border: 1px solid color-mix(in srgb, var(--el-color-primary) 30%, transparent);
  border-radius: 6px;
}

.aspect-ratio-info {
  margin-left: 8px;
  font-size: 12px;
  color: #909399;
}

.preset-section {
  margin-bottom: 24px;
}

.preset-buttons {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 8px;
}

.preset-buttons .el-button {
  height: auto;
  padding: 8px 12px;
  line-height: 1.2;
  text-align: center;
}

.preset-size {
  font-size: 12px;
  font-weight: normal;
  color: #909399;
}

.preview-section {
  margin-bottom: 16px;
}

.preview-info {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.material-publish-config-dialog {
  :deep(.el-dialog) {
    display: flex;
    width: 1100px;
    height: 100vh;
    margin: 0;
    background: var(--el-dialog-bg-color, var(--el-bg-color));
    flex-direction: column;
  }

  :deep(.el-dialog__header) {
    padding: 14px 16px 0;
    margin-right: 0;
  }

  :deep(.el-dialog__body) {
    padding: 0 16px 14px;
    overflow: hidden;
    background: var(--el-bg-color-page);
    flex: 1;
  }

  :deep(.el-dialog__footer) {
    padding: 10px 16px 14px;
    background: var(--el-dialog-bg-color, var(--el-bg-color));
    border-top: 1px solid var(--el-border-color-lighter);
    flex-shrink: 0;
  }
}

.material-publish-config-dialog__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  flex-wrap: wrap;
}

.material-publish-config-dialog__header-main {
  min-width: 0;
}

.material-publish-config-dialog__header-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.material-publish-config-dialog__header-chip {
  display: inline-flex;
  min-height: 28px;
  padding: 0 12px;
  font-size: 12px;
  color: var(--el-text-color-regular);
  background: var(--el-fill-color-light);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 999px;
  align-items: center;
}

.material-publish-config-dialog__header-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.material-publish-config-dialog__body {
  display: grid;
  grid-template-columns: 520px minmax(0, 1fr);
  gap: 12px;
  height: 100%;
  min-height: calc(100vh - 144px);
  box-sizing: border-box;
}

.material-publish-config-dialog__panel {
  display: flex;
  min-height: 0;
  padding: 14px;
  overflow: auto;
  background: linear-gradient(180deg, var(--el-bg-color), var(--el-fill-color-extra-light));
  border: 1px solid color-mix(in srgb, var(--el-color-primary) 8%, transparent);
  border-radius: 16px;
  box-shadow: 0 10px 28px rgb(15 23 42 / 4%);
  flex-direction: column;
  gap: 8px;
}

.material-publish-config-dialog__panel--configs {
  align-self: start;
}

.material-publish-config-dialog__section-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
  flex-wrap: wrap;
}

.material-publish-config-dialog__section-head--configs {
  align-items: flex-end;
}

.material-publish-config-dialog__section-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.material-publish-config-dialog__section-eyebrow {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.08em;
  color: var(--el-color-primary);
  text-transform: uppercase;
}

.material-publish-config-dialog__section-desc {
  margin-top: 2px;
  font-size: 12px;
  line-height: 1.4;
  color: var(--el-text-color-secondary);
}

.material-publish-config-dialog__tag-list,
.material-publish-config-dialog__section-tools {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.material-publish-config-dialog__warning {
  margin: 0;
}

.material-publish-config-dialog__warning :deep(.el-alert__title) {
  line-height: 1.6;
}

.material-publish-config-dialog__material-list {
  display: flex;
  max-height: 100vh;
  min-height: 0;
  padding-right: 2px;
  overflow: hidden auto;
  flex-wrap: wrap;
  gap: 12px;
  flex: 1 1 auto;
  align-content: start;
}

.material-publish-config-dialog__material-item {
  position: relative;
  display: flex;
  width: 140px;
  padding: 0;
  overflow: hidden;
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 12px;
  transition:
    transform 0.16s ease,
    box-shadow 0.16s ease,
    border-color 0.16s ease;
  flex-direction: column;
  flex-shrink: 0;
}

.material-publish-config-dialog__material-item:hover {
  border-color: color-mix(in srgb, var(--el-color-primary) 16%, transparent);
  transform: translateY(-1px);
  box-shadow: 0 10px 20px rgb(15 23 42 / 6%);
}

.material-publish-config-dialog__material-item--invalid {
  border-color: var(--el-color-danger);
  box-shadow: 0 0 0 1px rgb(245 108 108 / 12%);
}

.material-publish-config-dialog__material-preview {
  display: flex;
  width: 100%;
  height: 120px;
  overflow: hidden;
  background: var(--el-fill-color-lighter);
  border-radius: 0;
  align-items: center;
  justify-content: center;

  img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.material-publish-config-dialog__material-placeholder {
  display: flex;
  width: 100%;
  height: 100%;
  padding: 0 8px;
  font-size: 12px;
  color: var(--el-text-color-placeholder);
  text-align: center;
  align-items: center;
  justify-content: center;
}

.material-publish-config-dialog__material-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  width: 100%;
  padding: 8px 10px;
  background: var(--el-fill-color-extra-light);
  border-top: 1px solid var(--el-border-color-lighter);
}

.material-publish-config-dialog__material-name {
  min-width: 0;
  overflow: hidden;
  font-size: 12px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}

.material-publish-config-dialog__material-suffix {
  font-size: 11px;
  color: var(--el-text-color-secondary);
  text-transform: uppercase;
}

.material-publish-config-dialog__search {
  width: min(280px, 100%);
}

.material-publish-config-dialog__search :deep(.el-input) {
  width: 100%;
}

.material-publish-config-dialog__table {
  flex: none;
  min-height: 0;
}

.material-publish-config-dialog__table :deep(.material-publish-config-dialog__row--disabled .vxe-body--column) {
  background: var(--el-fill-color-light);
}

.material-publish-config-dialog__table :deep(.material-publish-config-dialog__row--disabled .vxe-cell),
.material-publish-config-dialog__table :deep(.material-publish-config-dialog__row--disabled .vxe-cell--wrapper),
.material-publish-config-dialog__table :deep(.material-publish-config-dialog__row--disabled .vxe-cell--label) {
  opacity: 0.58;
}

.material-publish-config-dialog__table :deep(.material-publish-config-dialog__row--disabled:hover .vxe-body--column) {
  background: var(--el-fill-color);
}

.material-publish-config-dialog__table :deep(.material-publish-config-dialog__row--disabled .vxe-cell--checkbox.is--disabled) {
  opacity: 0.5;
}

.material-publish-config-dialog__pagination,
.material-publish-config-dialog__footer,
.material-publish-config-dialog__footer-actions {
  display: flex;
}

.material-publish-config-dialog__pagination {
  justify-content: flex-end;
  padding-top: 6px;
  border-top: 1px solid var(--el-border-color-lighter);
}

.material-publish-config-dialog__footer {
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.material-publish-config-dialog__footer-info {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  min-width: 0;
}

.material-publish-config-dialog__footer-chip {
  display: inline-flex;
  min-height: 22px;
  padding: 1px 7px;
  font-size: 12px;
  color: var(--el-text-color-regular);
  background: var(--el-fill-color-light);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 999px;
  align-items: center;
}

.material-publish-config-dialog__footer-tip {
  font-size: 12px;
  color: var(--el-color-danger);
}

.material-publish-config-dialog__footer-tip--muted {
  color: var(--el-text-color-secondary);
}

.material-publish-config-dialog__footer-actions {
  gap: 8px;
  flex-shrink: 0;
}
</style>
<style>
.el-popper.is-pure {
  overflow: visible !important;
}

.el-popper[x-placement] {
  overflow: visible !important;
}

/* 确保所有 dropdown 相关的容器都允许溢出 */
.el-dropdown__popper {
  overflow: visible !important;
}

.el-dropdown__popper .el-dropdown-menu {
  overflow: visible !important;
}

.el-dropdown__popper .el-dropdown-menu__item {
  overflow: visible !important;
}

/* 工具栏下拉：扁平化样式（无位移、无边框、柔和主题色高亮） */
.material-tool-dropdown .el-dropdown-menu {
  min-width: 150px;
  padding: 5px;
}

.material-tool-dropdown .el-dropdown-menu__item {
  padding: 7px 12px;
  font-size: 13px;
  line-height: 1.45;
}

.material-tool-dropdown .el-dropdown-menu__item:not(.is-disabled):hover,
.material-tool-dropdown .el-dropdown-menu__item:not(.is-disabled):focus-visible {
  color: var(--el-color-primary);
  background: color-mix(in srgb, var(--el-color-primary) 8%, transparent);
  outline: none;
  transform: none;
  box-shadow: none;
}
</style>
<style scoped>


/* 响应式布局 */
@media (width <= 1360px) {
  .material-upload-dialog :deep(.el-dialog__body) {
    overflow-y: auto;
    overscroll-behavior: contain;
  }
}

@media (width <= 1200px) {

  .edit-material-body,
  .material-detail-body {
    padding: 16px;
  }

  .material-detail-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (width <= 768px) {
  .material-detail-hero {
    grid-template-columns: 1fr;
  }

  .material-detail-grid {
    grid-template-columns: 1fr;
  }

  .material-detail-field--wide {
    grid-column: span 1;
  }

  .op-submenu {
    min-width: 140px;
  }

  .op-submenu-item {
    min-height: 36px;
    padding: 10px 12px;
    font-size: 14px;
  }

  .material-upload-dialog :deep(.el-dialog) {
    width: 100% !important;
    height: 100%;
    max-width: 100%;
    max-height: 100%;
    margin: 0 auto !important;
    border-radius: 0;
  }

  :global(.material-upload-dialog.el-dialog) {
    width: 100% !important;
    height: 100%;
    max-width: 100%;
    max-height: 100%;
    margin-top: 0 !important;
    margin-bottom: 0 !important;
    border-radius: 0;
  }

  :global(.material-upload-dialog.el-dialog .el-dialog__header) {
    padding: 14px 16px;
  }

  :global(.material-upload-dialog.el-dialog .el-dialog__body) {
    padding: 12px;
  }

  .material-upload-dialog :deep(.el-dialog__header) {
    padding: 14px 16px;
  }

  .material-upload-dialog :deep(.el-dialog__body) {
    padding: 12px;
  }

  .edit-material-dialog :deep(.el-dialog__header),
  .edit-material-dialog :deep(.el-dialog__footer) {
    padding-right: 16px;
    padding-left: 16px;
  }

  .edit-material-body {
    height: calc(100vh - 116px);
    padding: 12px;
  }

  .edit-section {
    padding: 12px 12px 0;
  }
}

@media (width <= 960px) {
  :global(.psd-set-dialog.el-dialog) {
    --psd-set-workbench-min-height: 440px;

    min-height: 100vh;
    min-height: 100dvh;
  }

  :global(.psd-set-dialog.el-dialog .el-dialog__body) {
    display: block;
    overflow-y: auto;
  }

  .psd-set-body {
    height: auto;
    min-height: 0;
    grid-template-columns: 1fr;
    overflow: visible;
  }

  .psd-set-materials,
  .psd-set-templates {
    max-height: none;
    min-height: 440px;
  }
}

/* 响应式布局 */
@media (width <= 1200px) {
  .psd-template-detail .detail-layout {
    flex-direction: column;
  }

  .psd-template-detail .detail-left {
    width: 100%;
  }

  .psd-template-detail .detail-thumbnail {
    position: static;
  }
}

.operation-dropdown {
  line-height: 1;
}

.operation-trigger-button {
  min-width: 42px;
  padding: 2px 6px;
  background: transparent !important;
  border-radius: 4px;
}

.operation-trigger-button:hover,
.operation-trigger-button:focus-visible {
  background: color-mix(in srgb, var(--el-color-primary) 12%, transparent) !important;
  outline: none;
}

:global(.operation-dropdown-popper),
:global(.operation-dropdown-popper .el-scrollbar),
:global(.operation-dropdown-popper .el-scrollbar__wrap),
:global(.operation-dropdown-popper .el-scrollbar__view) {
  overflow: visible !important;
}

.op-menu {
  min-width: 136px;
  padding: 5px;
  background: var(--el-bg-color-overlay);
  border-radius: 8px;
}

.op-menu-item,
.op-submenu-item {
  display: flex;
  min-height: 32px;
  color: var(--el-text-color-regular);
  cursor: pointer;
  border-radius: 6px;
  box-sizing: border-box;
  transition:
    background-color 0.14s ease,
    color 0.14s ease,
    box-shadow 0.14s ease;
  user-select: none;
  align-items: center;
}

.op-menu-item {
  position: relative;
  gap: 8px;
  padding: 7px 10px;
  font-size: 13px;
  line-height: 1.45;
}

.op-menu-item:hover,
.op-menu-item:focus-visible,
.op-menu-item.has-submenu:hover,
.op-submenu-item:hover,
.op-submenu-item:focus-visible {
  color: var(--el-color-primary);
  background: color-mix(in srgb, var(--el-color-primary) 8%, transparent);
  outline: none;
}

.op-menu-item.danger {
  color: var(--el-color-danger);
}

.op-menu-item.danger:hover,
.op-menu-item.danger:focus-visible {
  color: var(--el-color-danger);
  background: color-mix(in srgb, var(--el-color-danger) 8%, transparent);
}

.op-menu-arrow,
.op-menu-arrow-placeholder {
  width: 14px;
  flex: 0 0 14px;
}

.op-menu-arrow {
  color: var(--el-text-color-placeholder);
  transition:
    color 0.14s ease,
    transform 0.14s ease;
}

.op-menu-item.has-submenu:hover .op-menu-arrow {
  color: var(--el-color-primary);
  transform: translateX(-2px);
}

.op-menu-label {
  display: inline-block !important;
  min-width: 0;
  white-space: nowrap;
  flex: 1;
}

.op-divider {
  height: 1px;
  margin: 5px 4px;
  background: var(--el-border-color-lighter);
}

.op-submenu {
  position: fixed;
  top: 0;
  left: -9999px;
  z-index: 3200;
  max-height: calc(100vh - 20px);
  min-width: 132px;
  padding: 5px;
  overflow-y: auto;
  pointer-events: none;
  background: var(--el-bg-color-overlay);
  border: 1px solid var(--el-border-color-light);
  border-radius: 8px;
  opacity: 0;
  visibility: hidden;
  box-shadow: var(--el-box-shadow-light);
}

.op-submenu-item {
  min-height: 31px;
  padding: 7px 12px;
  font-size: 12px;
  line-height: 1.45;
}

.material-upload-dialog :deep(.el-dialog) {
  display: flex;
  width: 100% !important;
  height: 100%;
  max-width: none;
  max-height: none;
  margin: 0 !important;
  overflow: hidden;
  border-radius: 0;
  flex-direction: column;
}

:global(.material-upload-dialog.el-dialog) {
  display: flex;
  width: 100% !important;
  height: 100%;
  max-width: none;
  max-height: none;
  margin-top: 0 !important;
  margin-bottom: 0 !important;
  overflow: hidden;
  border-radius: 0;
  flex-direction: column;
}

:global(.material-upload-dialog.el-dialog .el-dialog__header) {
  padding: 18px 24px 16px;
  margin-right: 0;
  background: var(--el-bg-color);
  border-bottom: 1px solid var(--el-border-color-lighter);
}

:global(.material-upload-dialog.el-dialog .el-dialog__body) {
  display: flex;
  flex: 1;
  min-height: 0;
  padding: 12px 14px 14px;
  overflow: hidden;
  background: var(--el-bg-color-page);
}

.material-upload-dialog :deep(.el-dialog__header) {
  padding: 18px 24px 16px;
  margin-right: 0;
  background: var(--el-bg-color);
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.material-upload-dialog :deep(.el-dialog__body) {
  display: flex;
  flex: 1;
  min-height: 0;
  padding: 12px 14px 14px;
  overflow: hidden;
  background: var(--el-bg-color-page);
}

.material-upload-dialog :deep(.el-dialog__body > div) {
  flex: 1;
  min-height: 0;
}

.material-upload-dialog__content {
  display: flex;
  flex: 1;
  min-width: 0;
  min-height: 0;
}

.edit-material-dialog :deep(.el-dialog__body) {
  flex: 1;
  min-height: 0;
  padding: 0;
  overflow: hidden;
}

.edit-material-dialog :deep(.el-dialog) {
  display: flex;
  height: 100vh;
  overflow: hidden;
  border-radius: 0;
  flex-direction: column;
}

.edit-material-dialog :deep(.el-dialog__header) {
  padding: 10px 16px;
  margin-right: 0;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.edit-material-dialog :deep(.el-dialog__footer) {
  padding: 8px 16px;
  border-top: 1px solid var(--el-border-color-lighter);
}

.edit-material-body {
  height: auto;
  min-height: 0;
  padding: 10px 12px;
  overflow-y: auto;
  background: var(--el-bg-color-page);
  flex: 1;
}

.edit-form {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.edit-section {
  padding: 10px 12px 2px;
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
}

.edit-section-title {
  margin-bottom: 6px;
  font-size: 13px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.edit-form :deep(.el-form-item) {
  margin-bottom: 8px;
}

.edit-form :deep(.el-form-item__label) {
  padding-bottom: 3px;
  font-weight: 500;
  line-height: 1.35;
  color: var(--el-text-color-regular);
}

.edit-form :deep(.el-row) {
  margin-bottom: 0;
}

.edit-form :deep(.el-form-item__content) {
  display: flex;
  min-height: 28px;
  align-items: center;
}

.edit-form :deep(.el-form-item__content)>* {
  width: 100%;
}

.edit-form :deep(.el-input__wrapper),
.edit-form :deep(.el-select__wrapper) {
  min-height: 28px;
}

.edit-form :deep(.el-switch) {
  --el-switch-on-color: var(--el-color-primary);

  width: auto;
  height: 22px;
}

.edit-form :deep(.el-input-group__append .el-button) {
  min-width: 64px;
}

.edit-form :deep(.el-textarea__inner) {
  min-height: 84px;
  line-height: 1.45;
}

.material-detail-dialog :deep(.el-dialog__body) {
  padding: 0;
  overflow: hidden;
}

.material-detail-dialog :deep(.el-dialog) {
  border-radius: 0;
}

.material-detail-dialog :deep(.el-dialog__header) {
  padding: 16px 24px;
  margin-right: 0;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.material-detail-dialog :deep(.el-dialog__footer) {
  padding: 12px 24px;
  border-top: 1px solid var(--el-border-color-lighter);
}

.material-detail-body {
  height: calc(100vh - 124px);
  padding: 20px 24px;
  overflow-y: auto;
  background: var(--el-bg-color-page);
}

.material-detail-hero,
.material-detail-section {
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 10px;
}

.material-detail-hero {
  display: grid;
  grid-template-columns: minmax(220px, 320px) minmax(0, 1fr);
  gap: 20px;
  padding: 16px;
  margin-bottom: 12px;
}

.material-detail-preview {
  display: flex;
  min-height: 220px;
  overflow: hidden;
  background-color: var(--el-fill-color-lighter);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  align-items: center;
  justify-content: center;
}

.material-detail-preview :deep(.el-image) {
  width: 100%;
  height: 220px;
}

.material-detail-preview__empty {
  display: flex;
  width: 100%;
  height: 100%;
  min-height: 220px;
  font-size: 13px;
  color: var(--el-text-color-secondary);
  align-items: center;
  justify-content: center;
}

.material-detail-summary {
  display: flex;
  min-width: 0;
  flex-direction: column;
  justify-content: center;
  gap: 12px;
}

.material-detail-title {
  font-size: 20px;
  font-weight: 600;
  line-height: 1.35;
  color: var(--el-text-color-primary);
  word-break: break-word;
}

.material-detail-subtitle {
  line-height: 1.5;
  color: var(--el-text-color-secondary);
  word-break: break-word;
}

.material-detail-tags,
.material-detail-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.material-detail-section {
  padding: 16px;
  margin-bottom: 12px;
}

.material-detail-section__title {
  margin-bottom: 12px;
  font-size: 14px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.material-detail-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px 12px;
}

.material-detail-field {
  min-width: 0;
  padding: 10px 12px;
  background: var(--el-fill-color-blank);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
}

.material-detail-field--wide {
  grid-column: span 2;
}

.material-detail-label {
  display: block;
  margin-bottom: 6px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.material-detail-value {
  display: block;
  min-width: 0;
  font-size: 13px;
  line-height: 1.5;
  color: var(--el-text-color-primary);
  word-break: break-word;
}

.material-detail-value--multiline {
  white-space: pre-wrap;
}

.material-detail-value--break {
  word-break: break-all;
}

.material-detail-palette {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  align-items: center;
}

.material-detail-swatch {
  width: 18px;
  height: 18px;
  border: 1px solid var(--el-border-color);
  border-radius: 4px;
}

.material-detail-raw {
  margin: 0;
  font-size: 13px;
  line-height: 1.6;
  color: var(--el-text-color-regular);
  word-break: break-word;
  white-space: pre-wrap;
}

.edit-dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

/* 元数据弹窗样式 */
.meta-error {
  padding: 20px;
}

.meta-raw-content {
  padding: 16px;
  margin-top: 20px;
  background: #f5f7fa;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
}

.meta-raw-content pre {
  max-height: 600px;
  padding: 0;
  margin: 0;
  overflow: auto;
  font-family: Monaco, Menlo, "Ubuntu Mono", Consolas, monospace;
  font-size: 12px;
  line-height: 1.6;
  color: #606266;
  word-wrap: break-word;
  white-space: pre-wrap;
}

.meta-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 400px;
}

:global(.text-cell-tooltip) {
  max-width: 520px;
  line-height: 1.5;
  word-break: break-word;
  white-space: normal;
}

.psd-set-body {
  display: grid;
  width: 100%;
  height: 100%;
  min-height: var(--psd-set-workbench-min-height);
  padding-right: 2px;
  overflow: hidden;
  grid-template-columns: minmax(260px, 0.88fr) minmax(0, 1.72fr);
  gap: 14px;
}

.psd-set-materials,
.psd-set-templates {
  display: flex;
  max-height: 100%;
  min-height: 220px;
  padding: 14px;
  overflow: hidden;
  background: linear-gradient(180deg, var(--el-bg-color), var(--el-fill-color-extra-light));
  border: 1px solid color-mix(in srgb, var(--el-color-primary) 8%, transparent);
  border-radius: 16px;
  box-shadow: 0 10px 28px rgb(15 23 42 / 4%);
  flex-direction: column;
  gap: 10px;
}

.psd-set-content-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.psd-template-folder-filter {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.psd-template-folder-filter__label {
  font-size: 14px;
  font-weight: 500;
  color: var(--el-text-color-primary);
}

.psd-template-folder-filter__cascader {
  width: min(100%, 360px);
}

.psd-template-folder-filter__cascader :deep(.el-cascader-node__prefix) {
  display: none;
}

:deep(.psd-template-folder-cascader-popper .el-cascader-node__prefix) {
  display: none;
}

:deep(.psd-template-folder-cascader-popper .el-radio) {
  display: none;
}

:deep(.psd-template-folder-cascader-popper .el-cascader-node) {
  padding-left: 16px;
}

:deep(.psd-template-folder-cascader-popper .el-cascader-node__label) {
  padding-left: 0;
}

.psd-template-list-container {
  display: flex;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  flex: 1 1 0;
  flex-direction: column;
}

.psd-set-materials .format-tip {
  display: flex;
  padding: 8px 12px;
  margin-bottom: 12px;
  font-size: 12px;
  color: var(--el-text-color-regular);
  background: var(--el-fill-color-lighter);
  border-left: 2px solid var(--el-color-primary);
  border-radius: 4px;
  align-items: center;
  gap: 6px;
}

.psd-set-materials .format-tip .el-icon {
  font-size: 14px;
  color: var(--el-color-primary);
}

.psd-set-source-groups {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 0;
  overflow-y: auto;
}

.psd-set-source-group {
  padding-bottom: 12px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.psd-set-source-group:last-child {
  padding-bottom: 0;
  border-bottom: 0;
}

.psd-set-source-group__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
}

.psd-set-source-group__name {
  min-width: 0;
  overflow: hidden;
  font-size: 13px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.psd-set-source-group__members {
  display: grid;
  grid-template-columns: repeat(auto-fill, 60px);
  gap: 8px;
}

.psd-set-source-group__member {
  position: relative;
  width: 60px;
  height: 60px;
  overflow: hidden;
  background: var(--el-fill-color-light);
  border: 1px solid var(--el-border-color-light);
  border-radius: 6px;
}

.psd-set-source-group__member img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.psd-set-source-group__order {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 1;
  min-width: 18px;
  padding: 1px 3px;
  font-size: 9px;
  line-height: 14px;
  color: #fff;
  text-align: center;
  background: rgb(0 0 0 / 70%);
}

.psd-set-materials .thumbs {
  display: flex;
  max-height: 100vh;
  min-height: 0;
  overflow: hidden auto;
  flex-wrap: wrap;
  gap: 8px;
}

.psd-set-materials .thumb {
  position: relative;
  display: flex;
  width: calc(50% - 4px);
  max-width: 132px;
  max-height: 152px;
  min-width: 108px;
  min-height: 136px;
  padding: 8px;
  overflow: hidden;
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-light);
  border-radius: 12px;
  transition:
    transform 0.18s ease,
    box-shadow 0.18s ease,
    border-color 0.18s ease;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
}

.psd-set-materials .thumb:hover {
  border-color: color-mix(in srgb, var(--el-color-primary) 18%, transparent);
  transform: translateY(-1px);
  box-shadow: 0 12px 24px rgb(15 23 42 / 6%);
}

.psd-set-materials .thumb.thumb-invalid-format {
  border-color: var(--el-color-danger);
  box-shadow: 0 0 0 2px rgb(245 108 108 / 20%);
}

.psd-set-materials .thumb-remove,
.material-publish-config-dialog__material-remove {
  position: absolute;
  top: 6px;
  right: 6px;
  z-index: 2;
  display: flex;
  width: 22px;
  height: 22px;
  padding: 0;
  font-size: 18px;
  line-height: 18px;
  color: #fff;
  cursor: pointer;
  background: rgb(15 23 42 / 68%);
  border: 1px solid rgb(255 255 255 / 72%);
  border-radius: 999px;
  box-shadow: 0 6px 14px rgb(15 23 42 / 18%);
  transition:
    background 0.16s ease,
    transform 0.16s ease;
  align-items: center;
  justify-content: center;
}

.psd-set-materials .thumb-remove:hover,
.material-publish-config-dialog__material-remove:hover {
  background: var(--el-color-danger);
  transform: scale(1.04);
}

.psd-set-materials .thumb-image-wrapper {
  position: relative;
  display: flex;
  width: 100%;
  height: 92px;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.psd-set-materials .thumb img {
  width: auto;
  height: auto;
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  background: #f5f7fa;
}

.psd-set-materials .thumb-format-badge {
  position: absolute;
  right: 4px;
  bottom: 4px;
  left: 4px;
  display: flex;
  padding: 2px 6px;
  font-size: 11px;
  font-weight: 500;
  color: white;
  background: rgb(245 108 108 / 90%);
  border-radius: 3px;
  align-items: center;
  justify-content: center;
  gap: 4px;
  backdrop-filter: blur(4px);
}

.psd-set-materials .thumb-format-badge.valid {
  background: rgb(103 194 58 / 90%);
}

.psd-set-materials .thumb-format-badge .el-icon {
  font-size: 12px;
}

.psd-set-materials .thumb-info-row {
  display: flex;
  margin-top: 4px;
  flex-wrap: wrap;
  gap: 4px;
  justify-content: center;
}

.psd-set-materials .thumb-info-tag {
  height: 20px;
  padding: 0 6px;
  font-size: 11px;
  line-height: 18px;
}

.psd-set-materials .thumb-action-row {
  display: flex;
  margin-top: 2px;
  line-height: 1;
  flex-wrap: wrap;
  gap: 4px;
  justify-content: center;
}

.psd-set-materials .thumb-action-row .el-button {
  min-height: auto;
  padding: 0;
  margin: 0;
  font-size: 12px;
}

.psd-set-template-toolbar {
  display: flex;
  padding-bottom: 10px;
  margin-bottom: 10px;
  border-bottom: 1px solid var(--el-border-color-lighter);
  flex-shrink: 0;
  align-items: center;
  gap: 8px;
}

.psd-set-template-toolbar__search {
  flex: 1;
  max-width: 260px;
}

.psd-template-toolbar-button,
.psd-template-toolbar-button:hover,
.psd-template-toolbar-button:focus,
.psd-template-toolbar-button:active,
.psd-template-toolbar-button:focus-visible {
  box-shadow: none !important;
}

.psd-set-template-toolbar .selected-count {
  padding: 3px 8px;
  font-size: 12px;
  font-weight: 500;
  color: var(--el-color-primary);
  white-space: nowrap;
  background: color-mix(in srgb, var(--el-color-primary) 10%, transparent);
  border: 1px solid color-mix(in srgb, var(--el-color-primary) 22%, transparent);
  border-radius: 4px;
}

.psd-set-templates .template-list-wrapper {
  display: flex;
  min-height: 0;
  overflow: hidden;
  flex: 1 1 0;
  flex-direction: column;
  gap: 8px;
}

.psd-set-templates .template-list {
  display: flex;
  min-height: 0;
  padding: 1em;
  overflow: hidden auto;
  flex: 1;
  flex-direction: column;
  gap: 8px;
}

.psd-set-templates .template-pagination {
  display: flex;
  padding-top: 8px;
  border-top: 1px solid var(--el-border-color-lighter);
  flex-shrink: 0;
  justify-content: flex-end;
}

.psd-set-templates .template-item {
  padding: 12px;
  cursor: pointer;
  background: linear-gradient(180deg, var(--el-bg-color), var(--el-fill-color-extra-light));
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 14px;
  transition:
    transform 0.16s ease,
    box-shadow 0.16s ease,
    border-color 0.16s ease,
    background-color 0.16s ease;
}

.psd-set-templates .template-item:hover {
  border-color: color-mix(in srgb, var(--el-color-primary) 18%, transparent);
  transform: translateY(-1px);
  box-shadow: 0 14px 28px rgb(15 23 42 / 6%);
}

.psd-set-templates .template-item.is-checked {
  background: linear-gradient(180deg, color-mix(in srgb, var(--el-color-primary) 8%, transparent), color-mix(in srgb, var(--el-color-primary) 3%, transparent));
  border-color: var(--el-color-primary);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--el-color-primary) 18%, transparent);
}

.psd-set-templates .template-content-wrapper {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.psd-set-templates .template-thumbnail {
  width: 72px;
  height: 72px;
  min-width: 72px;
  cursor: zoom-in;
  background: var(--el-fill-color-lighter);
  border: 1px solid var(--el-border-color-light);
  border-radius: 10px;
  object-fit: cover;
  flex-shrink: 0;
}

.psd-set-templates .template-info {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 6px;
}

.psd-set-templates .template-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 2px;
}

.psd-set-templates .template-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  flex: 1;
}

.psd-set-templates .template-detail-link {
  font-size: 12px;
  flex-shrink: 0;
}

.psd-set-templates .template-psd-info {
  padding: 5px 8px;
  margin-bottom: 2px;
  font-size: 12px;
  line-height: 1.4;
  color: var(--el-text-color-regular);
  background: var(--el-fill-color-lighter);
  border-left: 3px solid var(--el-color-primary);
  border-radius: 4px;
}

.psd-set-templates .template-meta {
  display: flex;
  margin-top: 2px;
  font-size: 12px;
  color: #909399;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.psd-set-templates .template-paths {
  display: flex;
  margin-top: 2px;
  font-size: 12px;
  color: #666;
  flex-direction: column;
  gap: 3px;
}

.psd-set-templates .path-row {
  display: flex;
  align-items: center;
  gap: 6px;
  line-height: 1.4;
  word-break: break-all;
}

.psd-set-templates .suitable-sizes-wrap,
.psd-set-templates .suitable-cutout-wrap {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
}

.psd-set-templates .path-label {
  color: #909399;
  flex-shrink: 0;
}

.psd-set-templates .path-empty {
  color: #c0c4cc;
}

.psd-set-templates .path-text {
  color: #606266;
}

.psd-set-templates .path-link {
  max-width: 100%;
}

.psd-set-templates .path-tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.psd-set-footer {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

/* PSD模板详情弹窗样式 */
.psd-template-detail {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.psd-template-detail .detail-layout {
  display: flex;
  gap: 24px;
  align-items: flex-start;
}

.psd-template-detail .detail-left {
  flex-shrink: 0;
  width: 600px;
}

.psd-template-detail .detail-right {
  flex: 1;
  min-width: 0;
}

.psd-template-detail .detail-thumbnail {
  position: sticky;
  top: 20px;
  display: flex;
  width: 100%;
  padding: 20px;
  background: var(--el-fill-color-lighter);
  border: 1px solid var(--el-border-color-light);
  border-radius: 8px;
  justify-content: center;
  align-items: center;
}

.psd-template-detail .detail-thumbnail-img {
  max-width: 100%;
  max-height: calc(100vh - 200px);
  border-radius: 4px;
  object-fit: contain;
}

.psd-template-detail .detail-thumbnail-placeholder {
  width: 100%;
  padding: 100px 20px;
  font-size: 14px;
  color: var(--el-text-color-placeholder);
  text-align: center;
}

.psd-template-detail .detail-item {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 16px 0;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.psd-template-detail .detail-item:last-child {
  border-bottom: none;
}

.psd-template-detail .detail-label {
  min-width: 120px;
  font-size: 15px;
  font-weight: 600;
  color: var(--el-text-color-regular);
  flex-shrink: 0;
}

.psd-template-detail .detail-value {
  font-size: 15px;
  line-height: 1.8;
  color: var(--el-text-color-primary);
  word-break: break-word;
  flex: 1;
}

.psd-template-detail .psd-config-value {
  max-height: 500px;
  padding: 16px;
  overflow-y: auto;
  font-family: "Courier New", Consolas, Monaco, monospace;
  font-size: 14px;
  word-break: break-all;
  white-space: pre-wrap;
  background: var(--el-fill-color-lighter);
  border-left: 3px solid var(--el-color-primary);
  border-radius: 4px;
}

.psd-template-detail .detail-empty {
  font-style: italic;
  color: var(--el-text-color-placeholder);
}
</style>

<style scoped>
.size-option {
  display: flex;
  min-height: 40px;
  padding: 6px 0;
  box-sizing: border-box;
  align-items: center;
  gap: 10px;
}

.size-thumb {
  position: relative;
  display: flex;
  width: 48px;
  height: 24px;
  background: linear-gradient(135deg, color-mix(in srgb, var(--el-color-primary) 10%, transparent) 0%, color-mix(in srgb, var(--el-color-primary) 20%, transparent) 100%);
  border: 1.5px solid var(--el-border-color);
  border-radius: 3px;
  box-shadow: 0 1px 3px rgb(0 0 0 / 10%);
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
}

.size-thumb::after {
  position: absolute;
  border: 1px solid color-mix(in srgb, var(--el-color-primary) 30%, transparent);
  border-radius: 2px;
  content: "";
  inset: 2px;
}

.size-label {
  flex: 1;
  font-size: 13px;
  color: var(--el-text-color-primary);
}

.size-key {
  padding: 2px 6px;
  font-family: "Courier New", Consolas, Monaco, monospace;
  font-size: 11px;
  color: var(--el-text-color-secondary);
  background: var(--el-fill-color-light);
  border-radius: 3px;
  flex-shrink: 0;
}

/* 横图系列 - 使用渐变背景区分 */
.landscape-thumb,
.slightly-wide-thumb,
.wide-thumb,
.very-wide-thumb,
.ultra-wide-thumb,
.extreme-wide-thumb {
  background: linear-gradient(135deg, color-mix(in srgb, var(--el-color-primary) 15%, transparent) 0%, color-mix(in srgb, var(--el-color-primary) 25%, transparent) 100%);
}

/* 正方形 */
.square-thumb {
  background: linear-gradient(135deg, rgb(103 194 58 / 15%) 0%, rgb(103 194 58 / 25%) 100%);
}

.square-thumb::after {
  border-color: rgb(103 194 58 / 30%);
}

/* 竖图系列 - 使用渐变背景区分 */
.portrait-thumb,
.slightly-long-thumb,
.long-thumb,
.very-long-thumb,
.ultra-long-thumb,
.extreme-long-thumb {
  background: linear-gradient(135deg, rgb(245 108 108 / 15%) 0%, rgb(245 108 108 / 25%) 100%);
}

.portrait-thumb::after,
.slightly-long-thumb::after,
.long-thumb::after,
.very-long-thumb::after,
.ultra-long-thumb::after,
.extreme-long-thumb::after {
  border-color: rgb(245 108 108 / 30%);
}

/* 选中状态 */
:deep(.el-select-dropdown__item.is-selected) .size-thumb {
  border-color: var(--el-color-primary);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--el-color-primary) 20%, transparent);
}

:deep(.el-select-dropdown__item:hover) .size-thumb {
  border-color: var(--el-color-primary);
  transform: scale(1.05);
  transition: transform 0.2s;
}

/* 确保选项内容不被截断 - 增加高度和内边距 */
:deep(.el-select-dropdown__item) {
  display: flex;
  height: auto;
  min-height: 50px;
  padding: 10px 14px;
  line-height: 1.5;
  align-items: center;
}

/* 选项组标题样式 */
:deep(.el-select-group__title) {
  padding: 8px 14px;
  font-weight: 600;
  color: var(--el-text-color-regular);
}

/* 确保选项容器有足够空间 */
:deep(.el-select-dropdown__list) {
  padding: 4px 0;
}

/* 选中值的显示优化 */
:deep(.el-select__input-wrapper) {
  display: flex;
  align-items: center;
}

/* 选中值中显示缩略图（如果支持） */
.size-select-value {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* 选中值显示时的缩略图尺寸会根据实际比例自动缩放 */
.size-select-value .size-thumb {
  max-width: 40px;
  max-height: 32px;
}
</style>

<style>
.template-detail-tooltip {
  max-width: 400px;
  padding: 12px;
}

.template-detail-tooltip,
.template-detail-tooltip.el-popper {
  transition: none !important;
}

.template-tooltip-content {
  display: flex;
  flex-direction: column;
  gap: 10px;
  font-size: 13px;
  line-height: 1.6;
}

.template-tooltip-content .tooltip-item {
  padding: 4px 0;
}

.template-tooltip-content .tooltip-item strong {
  display: inline-block;
  min-width: 60px;
  margin-right: 6px;
  font-weight: 600;
}
</style>

<style lang="less" scoped>
.material-index-filter {
  gap: 10px;
  padding-top: 8px;
}

.material-index-page {
  gap: 10px;
  padding: 8px 0 0;
  --material-copy-hover-bg: var(--el-fill-color-light);
  --material-copy-hover-border: var(--el-border-color);
  --material-copy-hover-text: var(--el-color-primary);
  --material-copy-hover-label: var(--el-text-color-primary);
  --material-copy-hover-icon: var(--el-color-primary);
}

:global(html.dark) .material-index-page {
  --material-copy-hover-bg: var(--el-fill-color);
  --material-copy-hover-border: var(--el-border-color-light);
  --material-copy-hover-text: var(--el-color-primary-light-3);
  --material-copy-hover-label: var(--el-text-color-primary);
  --material-copy-hover-icon: var(--el-color-primary-light-3);
}

.material-index-search-form {
  width: 100%;
}

.material-index-search-form__actions {
  justify-content: flex-start;
}

.material-index-search-form__switch {
  display: flex;
  min-height: 28px;
  align-items: center;
}

.material-index-mobile-filter {
  display: flex;
  justify-content: flex-start;
}

.similar-image-search-status {
  display: inline-flex;
  max-width: 100%;
  align-items: center;
  gap: 6px;
  margin-top: 6px;
  padding: 3px 6px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 4px;
  background: var(--el-fill-color-extra-light);
}

.similar-image-search-status__thumb {
  flex: 0 0 36px;
  width: 36px;
  height: 36px;
  overflow: hidden;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 3px;
  background: var(--el-bg-color);
}

.similar-image-search-status__thumb img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.similar-image-search-status__thumb--text {
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--el-color-success-light-9);
}

.similar-image-search-status__content {
  min-width: 0;
  flex: 1 1 auto;
}

.similar-image-search-status__line {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 6px;
}

.similar-image-search-status__source {
  min-width: 0;
  max-width: 280px;
  overflow: hidden;
  color: var(--el-text-color-regular);
  font-size: 12px;
  line-height: 16px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.similar-image-search-status__meta {
  color: var(--el-text-color-secondary);
  font-size: 11px;
  line-height: 16px;
  white-space: nowrap;
  opacity: 0.8;
}

.similar-image-search-status__actions {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 0;
}

.similar-image-search-status__actions :deep(.el-button) {
  height: 22px;
  padding: 0 4px;
  font-size: 12px;
}

.similar-image-search {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.similar-image-search__tabs {
  width: 100%;
}

.similar-image-search__section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.similar-image-search__options {
  display: flex;
  align-items: center;
  padding: 0 4px;
}

.similar-image-search__option-item {
  display: flex;
  align-items: center;
}

.similar-image-search__option-label {
  font-size: 13px;
  color: var(--el-text-color-regular);
  margin-right: 8px;
}

.similar-image-upload {
  width: 100%;
}

.similar-image-upload :deep(.el-upload) {
  width: 100%;
}

.similar-image-upload :deep(.el-upload-dragger) {
  width: 100%;
  padding: 24px 16px;
}

.similar-image-upload__icon {
  margin-bottom: 8px;
  font-size: 32px;
  color: var(--el-color-primary);
}

.similar-image-upload__text {
  color: var(--el-text-color-regular);
  font-size: 14px;
}

.similar-image-file-name {
  color: var(--el-text-color-secondary);
  font-size: 12px;
  line-height: 18px;
  word-break: break-all;
}

.similar-image-preview {
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 6px;
  background: var(--el-fill-color-extra-light);
  padding: 12px;
}

.similar-image-preview__title {
  margin-bottom: 10px;
  color: var(--el-text-color-regular);
  font-size: 13px;
  font-weight: 600;
}

.similar-image-preview__frame,
.similar-image-preview__empty {
  display: flex;
  min-height: 180px;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  background: var(--el-bg-color);
}

.similar-image-preview__frame img {
  display: block;
  max-width: 100%;
  max-height: 260px;
  object-fit: contain;
}

.similar-image-preview__empty {
  flex-direction: column;
  gap: 8px;
  color: var(--el-text-color-placeholder);
  font-size: 13px;
}

.similar-image-preview__empty .el-icon {
  font-size: 32px;
}

.material-index-phash__row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.material-index-phash__row> :first-child {
  flex: 1 1 280px;
  min-width: 220px;
}

.material-index-phash__modes,
.material-index-phash__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}

.sticker-user-transfer-dialog {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.sticker-user-transfer-form {
  margin-top: 4px;
}

.sticker-user-transfer-form__select {
  width: 100%;
}

.sticker-user-transfer-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
}

.sticker-user-transfer-option__main {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  color: var(--el-text-color-primary);
}

.sticker-user-transfer-option__meta {
  flex-shrink: 0;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.sticker-user-transfer-preview {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.sticker-user-transfer-preview__more {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  line-height: 24px;
}

.material-index-sidebar {
  position: relative;
  min-height: 100%;
}

.material-index-sidebar__body {
  padding: 0;
}

.material-index-sidebar__tree {
  min-height: 0;
  height: 100%;
  overflow: hidden;
}

.material-index-table-panel__body {
  padding: 0;
  overflow: hidden;
}

.material-index-page :deep(.table-bilingual-cell__item:not(.table-bilingual-cell__item--empty)) {
  padding: 4px 6px;
  border-radius: 6px;
  transition:
    background-color 0.2s ease,
    box-shadow 0.2s ease;
}

.material-index-page :deep(.table-bilingual-cell__content),
.material-index-page :deep(.table-bilingual-cell__label),
.material-index-page :deep(.table-bilingual-cell__icon) {
  transition:
    color 0.2s ease,
    opacity 0.2s ease;
}

.material-index-page :deep(.table-bilingual-cell__item:not(.table-bilingual-cell__item--empty):hover) {
  background: var(--material-copy-hover-bg);
  box-shadow: inset 0 0 0 1px var(--material-copy-hover-border);
}

.material-index-page :deep(.table-bilingual-cell__item:not(.table-bilingual-cell__item--empty):hover .table-bilingual-cell__content) {
  color: var(--material-copy-hover-text);
}

.material-index-page :deep(.table-bilingual-cell__item:not(.table-bilingual-cell__item--empty):hover .table-bilingual-cell__label) {
  color: var(--material-copy-hover-label);
}

.material-index-page :deep(.table-bilingual-cell__item:not(.table-bilingual-cell__item--empty):hover .table-bilingual-cell__icon) {
  color: var(--material-copy-hover-icon);
}

.material-index-pagination {
  margin-top: 0;
}

@media (max-width: 1024px) {
  .material-index-sidebar__body {
    padding-bottom: 28px;
  }
}

.batch-detail-config-content {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 120px);

  .batch-detail-config-header {
    padding: 12px 16px;
    border-bottom: 1px solid var(--el-border-color-lighter);
    background: var(--el-bg-color);

    .batch-detail-config-title {
      font-size: 16px;
      color: var(--el-text-color-primary);
      font-weight: 600;
    }
  }

  .batch-detail-config-body {
    flex: 1;
    overflow: auto;
    padding: 12px 16px 16px;
    background: var(--el-bg-color);

    .template-config-row {
      display: flex;
      gap: 16px;
      padding: 14px 0;
      margin-bottom: 0;
      background: transparent;
      border-bottom: 1px solid var(--el-border-color-lighter);

      &:last-child {
        border-bottom: none;
      }

      .template-config-left {
        width: 280px;
        flex-shrink: 0;

        .template-config-header-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 10px;

          .template-name {
            font-size: 15px;
            font-weight: 600;
            color: var(--el-text-color-primary);
          }
        }

        .template-config-images {
          display: flex;
          flex-direction: column;
          gap: 10px;

          .config-image-item {
            .config-image-label {
              font-size: 12px;
              font-weight: 500;
              color: var(--el-text-color-regular);
              margin-bottom: 6px;
            }

            .config-image-wrapper {
              display: flex;
              flex-wrap: wrap;
              gap: 8px;

              .config-image {
                width: 108px;
                height: 108px;
                border: 1px solid var(--el-border-color-lighter);
                border-radius: 4px;
                object-fit: contain;
                background: var(--el-fill-color-lighter);
              }

              .config-image-placeholder {
                display: block;
                color: var(--el-text-color-placeholder);
                font-size: 12px;
                padding: 40px 20px;
                text-align: center;
                border: 1px dashed var(--el-border-color-lighter);
                border-radius: 4px;
                background: var(--el-fill-color-lighter);
                width: 108px;
                height: 108px;
                box-sizing: border-box;
              }
            }
          }
        }
      }

      .template-config-right {
        flex: 1;
        min-width: 0;

        .config-editor-toolbar {
          margin-bottom: 8px;
          display: flex;
          justify-content: flex-start;
          gap: 8px;
        }

        .config-textarea {
          :deep(.el-textarea__inner) {
            font-family: "Courier New", "Consolas", "Monaco", monospace;
            font-size: 13px;
            line-height: 1.6;
          }
        }
      }
    }
  }
}

@media (max-width: 1024px) {
  .batch-detail-config-content {
    .batch-detail-config-body {
      padding: 10px 12px 12px;

      .template-config-row {
        flex-direction: column;
        gap: 12px;

        .template-config-left {
          width: 100%;
        }
      }
    }
  }
}

@media (max-width: 640px) {
  .similar-image-search-status {
    display: flex;
    flex-wrap: wrap;
  }

  .similar-image-search-status__source {
    max-width: 180px;
  }

  .similar-image-search-status__actions {
    margin-left: auto;
  }
}
</style>

<style lang="less">
.ai-generate-raw-info-dialog {
  :deep(.el-messagebox__message) {
    margin: 10px 0 20px 0;
  }

  :deep(.el-textarea) {
    width: 100%;

    .el-textarea__inner {
      min-height: 120px;
      resize: vertical;
    }
  }
}

.ai-gen-form {
  .form-section {
    margin-bottom: 24px;

    &:last-child {
      margin-bottom: 0;
    }

    .section-label {
      display: block;
      font-weight: 600;
      color: var(--el-text-color-primary);
      margin-bottom: 6px;
      font-size: 14px;
    }

    .section-desc {
      color: var(--el-text-color-regular);
      font-size: 13px;
      margin-bottom: 12px;
      line-height: 1.5;
    }

    :deep(.el-textarea) {
      .el-textarea__inner {
        min-height: 100px;
        resize: vertical;
        font-family: inherit;
      }
    }
  }
}

:deep(.material-view-mode-tabs) {
  .el-tabs__nav-wrap::after {
    display: none !important;
  }

  .el-tabs__active-bar {
    display: none !important;
  }

  .el-tabs__item {
    padding: 0 6px !important;
    font-size: 14px;
    font-weight: 500;
    color: #606266;
  }

  .el-tabs__item:first-child {
    padding-left: 0 !important;
  }

  .el-tabs__item.is-active {
    color: #303133;
    font-weight: 700;
  }

  .el-tabs__header {
    margin-bottom: 6px !important;
  }
}

.add-to-group-preview {
  width: 100%;
}

.add-to-group-preview__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, 56px);
  gap: 8px;
  width: 100%;
}

.add-to-group-preview__image {
  width: 56px;
  height: 56px;
  border: 1px solid var(--el-border-color);
  border-radius: 4px;
}
</style>
