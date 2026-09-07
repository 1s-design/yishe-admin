<template>
  <ContentWrap :plain="true">
    <ListPageLayout
      class="file-resource-page"
      :sidebar-width="folderTreeCollapsed ? '28px' : '280px'"
    >
      <template #filter>
        <div class="list-page-filter list-page-filter--flat">
          <el-form :model="queryParams" label-position="top" class="list-page-search-form">
            <el-row :gutter="12" class="list-page-search-form__row">
              <el-col class="list-page-search-form__col--wide" :xs="24" :sm="12" :md="8" :lg="6">
                <el-form-item :label="t('fileResource.searchByName')">
                  <el-input
                    v-model="queryParams.keyword"
                    size="small"
                    :placeholder="t('fileResource.searchPlaceholder')"
                    clearable
                    @change="
                      (val) => {
                        if (!val) getList();
                      }
                    "
                  />
                </el-form-item>
              </el-col>
              <el-col class="list-page-search-form__col--narrow" :xs="24" :sm="12" :md="8" :lg="4">
                <el-form-item :label="t('fileResource.sort')">
                  <el-select
                    v-model="queryParams.sortingFields"
                    size="small"
                    :placeholder="t('fileResource.selectSortPlaceholder')"
                    @change="getList"
                  >
                    <el-option :label="t('fileResource.createTimeDesc')" value="createTime DESC" />
                    <el-option :label="t('fileResource.createTimeAsc')" value="createTime ASC" />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col class="list-page-search-form__col--narrow" :xs="24" :sm="12" :md="8" :lg="4">
                <el-form-item :label="t('fileResource.suffix')">
                  <el-select
                    v-model="queryParams.suffix"
                    size="small"
                    :placeholder="t('fileResource.selectSuffixPlaceholder')"
                    clearable
                    @change="getList"
                  >
                    <el-option :label="t('fileResource.all')" value="" />
                    <el-option
                      v-for="option in suffixOptions"
                      :key="option.value"
                      :label="option.label"
                      :value="option.value"
                    />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col class="list-page-search-form__col--narrow" :xs="24" :sm="12" :md="8" :lg="4">
                <el-form-item :label="t('fileResource.category')">
                  <el-select
                    v-model="queryParams.category"
                    size="small"
                    :placeholder="t('fileResource.selectCategoryPlaceholder')"
                    clearable
                    @change="getList"
                  >
                    <el-option :label="t('fileResource.all')" value="" />
                    <el-option :label="t('fileResource.categoryScenery')" value="风景" />
                    <el-option :label="t('fileResource.categoryPeople')" value="人物" />
                    <el-option :label="t('fileResource.categoryAnimal')" value="动物" />
                    <el-option :label="t('fileResource.categoryBuilding')" value="建筑" />
                    <el-option :label="t('fileResource.categoryAnimation')" value="动画" />
                    <el-option :label="t('fileResource.categoryOther')" value="其他" />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col class="list-page-search-form__col--narrow" :xs="24" :sm="12" :md="8" :lg="3">
                <el-form-item :label="t('fileResource.idExactQuery')">
                  <el-input
                    v-model="queryParams.id"
                    size="small"
                    :placeholder="t('fileResource.idPlaceholder')"
                    clearable
                    @change="
                      (val) => {
                        if (!val) getList();
                      }
                    "
                  />
                </el-form-item>
              </el-col>
              <el-col class="list-page-search-form__col--wide" :xs="24" :sm="12" :md="8" :lg="5">
                <el-form-item :label="t('fileResource.timeRange')">
                  <DateRangePicker
                    @change="
                      (val) => {
                        queryParams.startTime = val.start;
                        queryParams.endTime = val.end;
                        getList();
                      }
                    "
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
                @click="getList"
                >{{ t('common.search') }}</el-button
              >
              <el-button
                size="small"
                type="primary"
                @click="
                  () => {
                    uploadModalVisible = true;
                  }
                "
              >
                {{ t('fileResource.upload') }}
              </el-button>
              <el-button size="small" @click="handleMultiDownload"
                >{{ t('fileResource.downloadCount', { count: ids.length }) }}</el-button
              >
              <el-button
                size="small"
                type="danger"
                :icon="Delete"
                @click="handleDelete(null)"
              >
                {{ t('fileResource.batchDeleteCount', { count: ids.length }) }}
              </el-button>
              <el-dropdown
                trigger="click"
                :disabled="!ids.length"
                @command="(cmd: FileResourceUserTransferAction) => openFileResourceUserTransferDialog(cmd)"
              >
                <el-button size="small" type="success" :disabled="!ids.length">
                  {{ t('fileResource.shareCount', { count: ids.length }) }}
                  <el-icon class="el-icon--right"><ArrowDown /></el-icon>
                </el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item command="share">
                      <el-icon><Share /></el-icon>
                      <span>{{ t('fileResource.share') }}</span>
                    </el-dropdown-item>
                    <el-dropdown-item command="copy">
                      <el-icon><DocumentCopy /></el-icon>
                      <span>{{ t('fileResource.copy') }}</span>
                    </el-dropdown-item>
                    <el-dropdown-item command="move">
                      <el-icon><TopRight /></el-icon>
                      <span>{{ t('fileResource.transfer') }}</span>
                    </el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
              <el-button
                v-if="isAdmin"
                size="small"
                type="warning"
                :disabled="!ids.length"
                @click="handleBatchPublishToLibrary"
              >
                发布到库 ({{ ids.length }})
              </el-button>
              <el-button v-if="isMobile" size="small" @click="filterDialogVisible = true"
                >{{ t('fileResource.filter') }}</el-button
              >
            </div>
          </el-form>
        </div>

        <el-dialog v-model="filterDialogVisible" :title="t('fileResource.filter')" width="90%" align-center>
          <el-form :model="queryParams" label-width="80px">
            <el-form-item :label="t('fileResource.searchByName')">
              <el-input
                v-model="queryParams.keyword"
                :placeholder="t('fileResource.searchPlaceholder')"
                clearable
              />
            </el-form-item>
            <el-form-item :label="t('fileResource.sort')">
              <el-select v-model="queryParams.sortingFields" :placeholder="t('fileResource.selectSortPlaceholder')">
                <el-option :label="t('fileResource.createTimeDesc')" value="createTime DESC" />
                <el-option :label="t('fileResource.createTimeAsc')" value="createTime ASC" />
              </el-select>
            </el-form-item>
            <el-form-item :label="t('fileResource.category')">
              <el-select v-model="queryParams.category" :placeholder="t('fileResource.selectCategoryPlaceholder')">
                <el-option :label="t('fileResource.all')" value="" />
                <el-option :label="t('fileResource.categoryScenery')" value="风景" />
                <el-option :label="t('fileResource.categoryPeople')" value="人物" />
                <el-option :label="t('fileResource.categoryAnimal')" value="动物" />
                <el-option :label="t('fileResource.categoryBuilding')" value="建筑" />
                <el-option :label="t('fileResource.categoryAnimation')" value="动画" />
                <el-option :label="t('fileResource.categoryOther')" value="其他" />
              </el-select>
            </el-form-item>
            <el-form-item :label="t('fileResource.suffix')">
              <el-select v-model="queryParams.suffix" :placeholder="t('fileResource.selectSuffixPlaceholder')" clearable>
                <el-option :label="t('fileResource.all')" value="" />
                <el-option
                  v-for="option in suffixOptions"
                  :key="option.value"
                  :label="option.label"
                  :value="option.value"
                />
              </el-select>
            </el-form-item>
            <el-form-item :label="t('fileResource.idExactQuery')">
              <el-input v-model="queryParams.id" :placeholder="t('fileResource.idPlaceholder')" clearable />
            </el-form-item>
            <el-form-item :label="t('fileResource.queryByTime')">
              <DateRangePicker
                @change="
                  (val) => {
                    queryParams.startTime = val.start;
                    queryParams.endTime = val.end;
                  }
                "
              />
            </el-form-item>
          </el-form>
          <template #footer>
            <el-button @click="filterDialogVisible = false">{{ t('common.cancel') }}</el-button>
            <el-button type="primary" @click="onMobileFilterSubmit">{{ t('common.confirm') }}</el-button>
          </template>
        </el-dialog>
      </template>

      <template #sidebar>
        <div
          class="list-page-panel list-page-panel--flat list-page-sidebar file-resource-sidebar folder-sidebar-shell"
        >
          <div class="list-page-sidebar__body file-resource-sidebar__body folder-sidebar-body">
            <div
              v-show="!folderTreeCollapsed"
              class="file-resource-sidebar__tree folder-sidebar-tree"
            >
              <FolderTree
                v-model="selectedFolderId"
                width="100%"
                :folder-category="FOLDER_CATEGORY"
                :show-count="false"
                :drag-state="dragState"
                @change="handleFolderChange"
                @folder-drag-over="handleFolderDragOver"
                @folder-drag-leave="handleFolderDragLeave"
                @folder-drop="handleFolderDrop"
              />
            </div>
          </div>
          <button
            type="button"
            class="file-resource-sidebar__toggle folder-sidebar-toggle"
            @click="folderTreeCollapsed = !folderTreeCollapsed"
          >
            <el-icon :size="14">
              <DArrowRight v-if="folderTreeCollapsed" />
              <DArrowLeft v-else />
            </el-icon>
          </button>
        </div>
      </template>

      <template #table>
        <div
          class="list-page-panel list-page-panel--flat list-page-table-panel list-page-table-panel--flat"
        >
          <div class="list-page-table-panel__body">
            <div class="common-table">
              <vxe-grid
                ref="gridRef"
                class="file-resource-dnd-grid"
                v-bind="gridOptions"
                :max-height="gridOptions.maxHeight"
                :data="dataSource"
                :loading="loading"
                @checkbox-change="checkboxChange"
                @checkbox-all="checkboxAllChange"
              >
                <template #dragHandleSlot>
                  <TableRowDragHandle />
                </template>

                <template #previewDefaultSlot="{ row }">
                  <div class="table-media-cell table-file-cell p-2">
                    <video
                      v-if="row.url && isVideoFile(row.suffix)"
                      :src="row.url"
                      :alt="row.name || t('fileResource.fileResource')"
                      class="table-file-cell__video"
                      @click="openFilePreview(row)"
                      @error="handleVideoError"
                      controls
                      preload="metadata"
                    />
                    <img
                      v-else-if="row.url && isImageFile(row.suffix)"
                      :src="row.url"
                      :alt="row.name || t('fileResource.imageFile')"
                      class="table-file-cell__image"
                      @click="openFilePreview(row)"
                      @error="handleImageError"
                    />
                    <div
                      v-else-if="row.url && isAudioFile(row.suffix)"
                      class="table-file-audio-card"
                      @click="openFilePreview(row)"
                    >
                      <div class="table-file-audio-card__meta">
                        <el-icon size="18"><Headset /></el-icon>
                        <span class="table-file-audio-card__title">{{
                          row.name || t('fileResource.audioFile')
                        }}</span>
                        <span class="table-file-audio-card__suffix">{{
                          String(row.suffix || "").toUpperCase()
                        }}</span>
                      </div>
                      <div class="table-file-audio-card__player-wrap" @click.stop>
                        <audio
                          :src="row.url"
                          controls
                          preload="metadata"
                          class="table-file-audio-card__player"
                          @error="handleAudioError"
                        />
                      </div>
                    </div>
                    <div
                      v-else-if="row.url && isPdfFile(row.suffix)"
                      class="table-file-doc-card table-file-doc-card--pdf"
                      @click="openFilePreview(row)"
                    >
                      <el-icon size="24"><Document /></el-icon>
                      <div class="table-file-doc-card__title">{{ row.name || t('fileResource.pdfFile') }}</div>
                      <div class="table-file-doc-card__tip">{{ t('fileResource.clickPreviewPdf') }}</div>
                    </div>
                    <div
                      v-else-if="row.url && isTextFile(row.suffix)"
                      class="table-file-doc-card table-file-doc-card--text"
                      @click="openFilePreview(row)"
                    >
                      <el-icon size="24"><Document /></el-icon>
                      <div class="table-file-doc-card__title">{{ row.name || t('fileResource.textFile') }}</div>
                      <div class="table-file-doc-card__tip">
                        {{ String(row.suffix || "FILE").toUpperCase() }} · {{ t('fileResource.clickPreview') }}
                      </div>
                    </div>
                    <div
                      v-else-if="row.url && isExcelFile(row.suffix)"
                      class="table-file-doc-card table-file-doc-card--excel"
                      @click="openFilePreview(row)"
                    >
                      <el-icon size="24"><Document /></el-icon>
                      <div class="table-file-doc-card__title">{{ row.name || t('fileResource.excelFile') }}</div>
                      <div class="table-file-doc-card__tip">
                        {{ String(row.suffix || "XLSX").toUpperCase() }} · {{ t('fileResource.clickPreview') }}
                      </div>
                    </div>
                    <div v-else class="table-file-doc-card">
                      <el-icon size="24">
                        <component :is="getFileIcon(row.suffix)" />
                      </el-icon>
                      <div class="table-file-doc-card__title">{{ row.name || t('fileResource.fileResource') }}</div>
                      <div class="table-file-doc-card__tip">
                        {{ String(row.suffix || "FILE").toUpperCase() }}
                      </div>
                    </div>
                  </div>
                </template>

                <template #nameSlot="{ row }">
                  <div class="flex items-center gap-2 flex-wrap">
                    <span>{{ row.name || t('fileResource.resourceId', { id: row.id }) }}</span>
                  </div>
                </template>

                <template #shareTypeSlot="{ row }">
                  <el-tooltip
                    v-if="row.shareType === 'shared'"
                    :content="t('fileResource.sharedRefTip')"
                    placement="top"
                  >
                    <el-tag type="warning" size="small" effect="light" style="cursor: help">
                      {{ t('fileResource.sharedByUser', { user: row.sourceUser?.name || row.sourceUser?.account || t('fileResource.userWithId', { id: row.sourceUserId }) }) }}
                    </el-tag>
                  </el-tooltip>
                  <el-tag v-else-if="row.shareType === 'copy' || (row.sourceUserId && row.sourceUserId !== row.userId)" type="success" size="small" effect="light">
                    {{ t('fileResource.copiedByUser', { user: row.sourceUser?.name || row.sourceUser?.account || t('fileResource.userWithId', { id: row.sourceUserId }) }) }}
                  </el-tag>
                  <el-tag v-else type="info" size="small" effect="plain">{{ t('fileResource.myUpload') }}</el-tag>
                </template>

                <template #categorySlot="{ row }">
                  <el-tag v-if="row.category" :type="getCategoryTagType(row.category)" size="small">
                    {{ row.category }}
                  </el-tag>
                  <span v-else>-</span>
                </template>

                <template #tagsSlot="{ row }">
                  <div v-if="row.tags" class="flex flex-wrap gap-1">
                    <el-tag v-for="tag in row.tags.split(',')" :key="tag" size="small" type="info">
                      {{ tag.trim() }}
                    </el-tag>
                  </div>
                  <span v-else>-</span>
                </template>

                <!-- isPublic display removed -->

                <template #operationDefaultSlot="{ row }">
                  <div class="flex items-center">
                    <el-dropdown
                      class="operation-dropdown"
                      placement="bottom-end"
                      @command="(command) => handleOperationCommand(String(command), row)"
                    >
                      <el-button type="primary" link size="small" class="operation-trigger-button"
                        >{{ t('common.operation') }}</el-button
                      >
                      <template #dropdown>
                        <el-dropdown-menu class="operation-menu-compact">
                          <el-dropdown-item command="edit">
                            <el-icon><Edit /></el-icon>
                            <span>{{ t('common.edit') }}</span>
                          </el-dropdown-item>
                          <el-dropdown-item command="download">
                            <el-icon><Download /></el-icon>
                            <span>{{ t('fileResource.download') }}</span>
                          </el-dropdown-item>
                          <el-dropdown-item command="preview" v-if="isPreviewableFile(row.suffix)">
                            <el-icon
                              ><VideoPlay v-if="isVideoFile(row.suffix)" /><Headset
                                v-else-if="isAudioFile(row.suffix)" /><Document
                                v-else-if="isPdfFile(row.suffix) || isTextFile(row.suffix)" /><Picture v-else
                            /></el-icon>
                            <span>{{ t('fileResource.preview') }}</span>
                          </el-dropdown-item>
                          <el-dropdown-item command="share-to-user">
                            <el-icon><Share /></el-icon>
                            <span>{{ t('fileResource.share') }}</span>
                          </el-dropdown-item>
                          <el-dropdown-item command="copy-to-user">
                            <el-icon><DocumentCopy /></el-icon>
                            <span>{{ t('fileResource.copy') }}</span>
                          </el-dropdown-item>
                          <el-dropdown-item v-if="isAdmin" command="move-to-user">
                            <el-icon><TopRight /></el-icon>
                            <span>{{ t('fileResource.transfer') }}</span>
                          </el-dropdown-item>
                          <el-dropdown-item command="view-shared">
                            <el-icon><Connection /></el-icon>
                            <span>{{ t('fileResource.viewShare') }}</span>
                          </el-dropdown-item>
                          <!-- toggle public/private removed -->
                          <el-dropdown-item
                            command="delete"
                            divided
                            class="operation-menu-item--danger"
                          >
                            <el-icon><Delete /></el-icon>
                            <span>{{ t('common.delete') }}</span>
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
      </template>

      <template #pagination>
        <div
          class="list-page-panel list-page-panel--flat list-page-table-panel__pagination list-page-table-panel__pagination--flat"
        >
          <pagination
            v-model:page="queryParams.currentPage"
            v-model:limit="queryParams.pageSize"
            :total="total"
            @pagination="getList"
          />
        </div>
      </template>
    </ListPageLayout>

    <el-dialog
      v-model="uploadModalVisible"
      :title="t('fileResource.uploadTitle')"
      fullscreen
      :footer="false"
      :destroy-on-close="true"
      class="file-resource-upload-dialog"
      @close="uploadModalClose"
    >
      <div class="file-resource-upload-dialog__content">
        <file-resource-upload @single-file-uploaded="singleFileUploaded" />
      </div>
    </el-dialog>

    <el-dialog
      v-model="editDialogVisible"
      :title="t('fileResource.editTitle')"
      width="800px"
      :destroy-on-close="true"
      align-center
    >
      <el-form :model="editForm" label-width="100px" class="px-2">
        <el-form-item :label="t('fileResource.name')">
          <el-input v-model="editForm.name" :placeholder="t('fileResource.namePlaceholder')" class="w-full" />
        </el-form-item>
        <el-form-item :label="t('common.description')">
          <el-input
            v-model="editForm.description"
            type="textarea"
            :rows="5"
            :placeholder="t('fileResource.descriptionPlaceholder')"
            class="w-full"
          />
        </el-form-item>
        <el-form-item :label="t('fileResource.keywords')">
          <el-input
            v-model="editForm.keywords"
            :placeholder="t('fileResource.keywordsPlaceholder')"
            class="w-full"
          />
        </el-form-item>
        <el-form-item :label="t('fileResource.category')">
          <el-select v-model="editForm.category" :placeholder="t('fileResource.selectCategoryPlaceholder')" class="w-full">
            <el-option :label="t('fileResource.categoryScenery')" value="风景" />
            <el-option :label="t('fileResource.categoryPeople')" value="人物" />
            <el-option :label="t('fileResource.categoryAnimal')" value="动物" />
            <el-option :label="t('fileResource.categoryBuilding')" value="建筑" />
            <el-option :label="t('fileResource.categoryAnimation')" value="动画" />
            <el-option :label="t('fileResource.categoryOther')" value="其他" />
          </el-select>
        </el-form-item>
        <el-form-item :label="t('fileResource.tags')">
          <el-input v-model="editForm.tags" :placeholder="t('fileResource.tagsPlaceholder')" class="w-full" />
        </el-form-item>
        <!-- 是否公开 编辑项已移除 -->
      </el-form>
      <template #footer>
        <el-button @click="editDialogVisible = false">{{ t('common.cancel') }}</el-button>
        <el-button type="primary" :loading="editLoading" @click="submitEdit">{{ t('common.save') }}</el-button>
      </template>
    </el-dialog>

    <VideoPreview
      :visible="videoPreviewVisible"
      :file-url="currentPreviewUrl"
      :file-name="currentPreviewName"
      :file-suffix="currentPreviewSuffix"
      @close="closeVideoPreview"
    />

    <el-dialog
      v-model="fileResourceUserTransferDialogVisible"
      :title="fileResourceUserTransferDialogTitle"
      width="560px"
      align-center
      :close-on-click-modal="false"
      @closed="resetFileResourceUserTransferDialog"
    >
      <div class="sticker-user-transfer-dialog">



        <el-form label-width="96px" class="sticker-user-transfer-form">
          <el-form-item :label="t('fileResource.targetUser')" required>
            <el-select
              v-model="fileResourceUserTransferTargetUserId"
              class="sticker-user-transfer-form__select"
              filterable
              clearable
              :loading="fileResourceUserTransferUsersLoading"
              :placeholder="t('fileResource.selectTargetUserPlaceholder')"
            >
              <el-option
                v-for="item in fileResourceUserTransferUserOptions"
                :key="item.id"
                :label="item.label"
                :value="item.id"
              >
                <div class="sticker-user-transfer-option">
                  <div class="sticker-user-transfer-option__main">
                    <span>{{ item.name || item.account || t('fileResource.userHashId', { id: item.id }) }}</span>
                    <el-tag v-if="item.isAdmin" size="small" type="warning">{{ t('fileResource.admin') }}</el-tag>
                  </div>
                  <span class="sticker-user-transfer-option__meta">
                    {{ item.account || t('fileResource.idWithId', { id: item.id }) }}
                  </span>
                </div>
              </el-option>
            </el-select>
          </el-form-item>

          <el-form-item :label="t('fileResource.resourceCount')">
            <el-tag type="info">{{ fileResourceUserTransferIds.length }}</el-tag>
          </el-form-item>

          <el-form-item :label="t('fileResource.selectedResources')">
            <div class="sticker-user-transfer-preview">
              <el-tag
                v-for="item in fileResourceUserTransferPreviewItems"
                :key="item.id"
                size="small"
                effect="plain"
              >
                {{ item.label }}
              </el-tag>
              <span
                v-if="fileResourceUserTransferIds.length > fileResourceUserTransferPreviewItems.length"
                class="sticker-user-transfer-preview__more"
              >
                {{ t('fileResource.etcItems', { count: fileResourceUserTransferIds.length }) }}
              </span>
            </div>
          </el-form-item>
        </el-form>
      </div>

      <template #footer>
        <el-button @click="fileResourceUserTransferDialogVisible = false">{{ t('common.cancel') }}</el-button>
        <el-button
          type="primary"
          :loading="fileResourceUserTransferSubmitting"
          @click="submitFileResourceUserTransfer"
        >
          {{ fileResourceUserTransferSubmitText }}
        </el-button>
      </template>
    </el-dialog>

    <!-- 查看分享记录弹窗 -->
    <el-dialog
      v-model="shareRecordsDialogVisible"
      :title="t('fileResource.shareRecordsTitle', { name: shareRecordsResourceName })"
      width="600px"
      destroy-on-close
    >
      <div v-loading="shareRecordsLoading">
        <el-empty v-if="!shareRecordsLoading && shareRecordsList.length === 0" :description="t('fileResource.noShareRecords')" />
        <el-table v-else :data="shareRecordsList" style="width: 100%">
          <el-table-column prop="userName" :label="t('fileResource.sharedTo')" min-width="120">
            <template #default="{ row }">
              <span>{{ row.userName || row.userId }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="shareType" :label="t('fileResource.shareType')" width="120">
            <template #default="{ row }">
              <el-tag v-if="row.shareType === 'shared'" type="warning" size="small" effect="light">{{ t('fileResource.quickShare') }}</el-tag>
              <el-tag v-else-if="row.shareType === 'copy'" type="success" size="small" effect="light">{{ t('fileResource.physicalCopy') }}</el-tag>
              <el-tag v-else type="info" size="small" effect="plain">{{ row.shareType || '-' }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="createTime" :label="t('fileResource.shareTime')" width="180">
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
import { ref, reactive, computed, nextTick, watchEffect } from "vue";

import {
  getFileResourceList,
  deleteFileResource,
  updateFileResource,
  batchMoveFileResource,
  copyFileResourceToUser,
  shareFileResourceToUser,
  moveFileResourceToUser,
} from "@/api/file-resource";
import { ResourceLibraryApi } from "@/api/resource-library";
import { getUserList } from "@/api/user";

import { buildOperationColumn, commonGridOptions } from "@/common/table";
import { formatTimestamp } from "@/common/date";

import { useDebounceFn, useLocalStorage, useWindowSize } from "@vueuse/core";

import { useUserStore } from "@/store/modules/user";
import fileResourceUpload from "./file-resource-upload.vue";
import VideoPreview from "./VideoPreview.vue";
import FolderTree from "@/components/material/FolderTree.vue";
import TableRowDragHandle from "@/components/TableRowDragHandle/index.vue";
import DateRangePicker from "@/components/DateRangePicker.vue";
import Pagination from "@/components/Pagination/index.vue";
import ListPageLayout from "@/components/ListPageLayout/index.vue";
import { ElButton, ElNotification, ElMessage, ElMessageBox } from "element-plus";
import { useI18n } from "@/hooks/web/useI18n";
import {
  Delete,
  Search,
  Edit,
  Download,
  VideoPlay,
  Document,
  Picture,
  Folder,
  Headset,
  DArrowLeft,
  DArrowRight,
  Share,
  ArrowDown,
  DocumentCopy,
  TopRight,
} from "@element-plus/icons-vue";
import { downloadFileByElement } from "@/common/download";
import { useFolderRowDrag } from "@/hooks/useFolderRowDrag";
import { FOLDER_FILTER, convertFolderIdToApiParam } from "@/constants/folder";

const userStore = useUserStore();
const { t } = useI18n();
const FOLDER_CATEGORY = "fileresource";
const suffixOptions = [
  { label: "mp4", value: "mp4" },
  { label: "mov", value: "mov" },
  { label: "mp3", value: "mp3" },
  { label: "wav", value: "wav" },
  { label: "pdf", value: "pdf" },
  { label: "png", value: "png" },
  { label: "jpg", value: "jpg" },
  { label: "webp", value: "webp" },
];

// 判断是否为管理员
const isAdmin = computed(() => userStore.user?.isAdmin ?? false);

const queryParams = reactive({
  currentPage: 1,
  pageSize: 20,
  keyword: "",
  startTime: "",
  endTime: "",
  suffix: "",
  id: "",
  category: "",
  sortingFields: "createTime DESC",
  folderId: FOLDER_FILTER.ALL as string | null,
});

// 移动端相关
const isMobile = computed(() => window.innerWidth <= 768);
const filterDialogVisible = ref(false);

function onMobileFilterSubmit() {
  filterDialogVisible.value = false;
  getList();
}

const gridRef = ref();

function resetCheckStatus() {
  if (gridRef.value?.clearCheckboxRow) {
    gridRef.value?.clearCheckboxRow();
  }
  if (gridRef.value?.clearCheckboxReserve) {
    gridRef.value?.clearCheckboxReserve();
  }
  ids.value = [];
}

const { height } = useWindowSize();

const gridOptions = ref({
  ...commonGridOptions,
  maxHeight: Math.max(height.value - 280, 360),
  rowConfig: {
    keyField: "id",
  },
  checkboxConfig: {
    reserve: true,
  },
  columns: [
    {
      title: "",
      field: "dragHandle",
      width: 34,
      showOverflow: false,
      align: "center",
      slots: { default: "dragHandleSlot" },
    },
    { type: "checkbox", width: 42, ellipsis: true, reserve: true },
    {
      title: t("fileResource.filePreview"),
      field: "url",
      width: 400,
      slots: { default: "previewDefaultSlot" },
    },
    { title: t("fileResource.resourceName"), field: "name", minWidth: 180, className: "font-bold", slots: { default: "nameSlot" } },
    {
      title: t("fileResource.resourceType"),
      field: "shareType",
      width: 200,
      slots: { default: "shareTypeSlot" },
    },
    { title: t("common.description"), field: "description", minWidth: 200 },
    { title: t("fileResource.keywords"), field: "keywords", minWidth: 160 },
    { title: t("fileResource.suffix"), field: "suffix", width: 80 },
    { title: t("fileResource.category"), field: "category", width: 100, slots: { default: "categorySlot" } },
    { title: t("fileResource.tags"), field: "tags", minWidth: 150, slots: { default: "tagsSlot" } },
    {
      title: t("fileResource.uploader"),
      field: "uploader",
      width: 140,
      formatter: ({ row }) => row?.uploader?.account || row?.uploader?.name || row?.userId || "-",
    },
    { title: t("common.id"), field: "id", width: 80 },
    {
      title: t("common.createTime"),
      field: "createTime",
      width: 150,
      ellipsis: true,
      formatter: (e) => {
        return formatTimestamp(e.cellValue);
      },
    },
    {
      title: t("common.updateTime"),
      field: "updateTime",
      width: 150,
      ellipsis: true,
      formatter: (e) => {
        return formatTimestamp(e.cellValue);
      },
    },
    buildOperationColumn("operationDefaultSlot"),
  ],
});

watchEffect(() => {
  gridOptions.value.maxHeight = Math.max(height.value - 280, 360);
});

const dataSource = ref([]);
const loading = ref(false);
const ids = ref<any[]>([]);
const total = ref(0);
type FileResourceUserTransferAction = "share" | "copy" | "move";
type FileResourceUserTransferUserOption = {
  id: string;
  name?: string;
  account?: string;
  label: string;
  isAdmin?: boolean;
};
const fileResourceUserTransferDialogVisible = ref(false);
const fileResourceUserTransferSubmitting = ref(false);
const fileResourceUserTransferUsersLoading = ref(false);
const fileResourceUserTransferUsersLoaded = ref(false);
const fileResourceUserTransferAction = ref<FileResourceUserTransferAction>("share");
const fileResourceUserTransferIds = ref<string[]>([]);
const fileResourceUserTransferTargetUserId = ref("");
const fileResourceUserTransferUserOptions = ref<FileResourceUserTransferUserOption[]>([]);
const fileResourceUserTransferDialogTitle = computed(() => {
  if (fileResourceUserTransferAction.value === "share") return t("fileResource.quickShareDialogTitle");
  if (fileResourceUserTransferAction.value === "copy") return t("fileResource.copyDialogTitle");
  return t("fileResource.transferDialogTitle");
});
const fileResourceUserTransferSubmitText = computed(() => {
  if (fileResourceUserTransferAction.value === "share") return t("fileResource.confirmQuickShare");
  if (fileResourceUserTransferAction.value === "copy") return t("fileResource.confirmCopy");
  return t("fileResource.confirmTransfer");
});
const fileResourceUserTransferPreviewItems = computed(() =>
  fileResourceUserTransferIds.value.slice(0, 5).map((id) => {
    const row = dataSource.value.find((item: any) => String(item.id) === String(id));
    return {
      id: String(id),
      label: row?.name || t("fileResource.idWithValue", { id }),
    };
  }),
);

// 查看分享记录
const shareRecordsDialogVisible = ref(false);
const shareRecordsLoading = ref(false);
const shareRecordsList = ref<any[]>([]);
const shareRecordsTotal = ref(0);
const shareRecordsResourceName = ref('');

async function openShareRecordsDialog(row: any) {
  shareRecordsResourceName.value = row.name || t("fileResource.idWithValue", { id: row.id });
  shareRecordsDialogVisible.value = true;
  shareRecordsLoading.value = true;
  shareRecordsList.value = [];
  try {
    const res = await getFileResourceSharedRecords(String(row.id));
    shareRecordsList.value = res?.list || [];
    shareRecordsTotal.value = res?.total || 0;
  } catch (e: any) {
    ElMessage.error(e?.message || t('fileResource.getShareRecordsFailed'));
  } finally {
    shareRecordsLoading.value = false;
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
  gridClass: "file-resource-dnd-grid",
  dataSource,
  selectedIds: ids,
  onDropToFolder: handleFolderDrop,
});

// 上传相关
const uploadModalVisible = ref(false);
const folderTreeCollapsed = useLocalStorage("file_resource_folder_collapsed", false);
const selectedFolderId = ref<string | null>(FOLDER_FILTER.ALL);

function uploadModalClose() {}

async function getList() {
  loading.value = true;
  let res = await getFileResourceList({
    ...queryParams,
    folderId: convertFolderIdToApiParam(queryParams.folderId),
  }).finally(() => {
    loading.value = false;
  });
  dataSource.value = res.list;
  total.value = res.total;
  nextTick(setupRowDrag);
}

function ensureFileResourceAdminOperation() {
  if (!isAdmin.value) {
    ElMessage.warning(t("fileResource.adminOnlyOperation"));
    return false;
  }
  return true;
}

async function loadFileResourceTransferUserOptions() {
  if (fileResourceUserTransferUsersLoaded.value || fileResourceUserTransferUsersLoading.value) {
    return;
  }

  fileResourceUserTransferUsersLoading.value = true;
  try {
    const res = await getUserList({
      currentPage: 1,
      pageSize: 1000,
    });
    const list = Array.isArray(res?.list) ? res.list : [];
    fileResourceUserTransferUserOptions.value = list.map((item: any) => ({
      id: String(item.id),
      name: item.name || "",
      account: item.account || "",
      label: item.name || item.account || t("fileResource.userHashId", { id: item.id }),
      isAdmin: !!item.isAdmin,
    }));
    fileResourceUserTransferUsersLoaded.value = true;
  } catch (error: any) {
    ElMessage.error(error?.message || t("fileResource.loadUsersFailed"));
  } finally {
    fileResourceUserTransferUsersLoading.value = false;
  }
}

function resetFileResourceUserTransferDialog() {
  fileResourceUserTransferSubmitting.value = false;
  fileResourceUserTransferAction.value = "copy";
  fileResourceUserTransferIds.value = [];
  fileResourceUserTransferTargetUserId.value = "";
}

async function handleBatchPublishToLibrary() {
  const targetIds = (Array.isArray(ids.value) ? ids.value : []).map(String).filter(Boolean);
  if (!targetIds.length) {
    return ElMessage.warning(t("fileResource.selectResourcesFirst"));
  }
  try {
    await ElMessageBox.confirm(`确认将选中的 ${targetIds.length} 项文件资源发布到公共资源广场吗？`, "发布提示", {
      confirmButtonText: "确认发布",
      cancelButtonText: "取消",
      type: "info",
    });
    await ResourceLibraryApi.batchPublish({
      resourceType: "file_resource",
      ids: targetIds,
    });
    ElMessage.success("已成功发布到公共文件资源库");
  } catch {
    // cancel
  }
}

async function openFileResourceUserTransferDialog(
  action: FileResourceUserTransferAction,
  row?: any,
) {
  if (action === "move" && !ensureFileResourceAdminOperation()) {
    return;
  }

  const targetIds = row
    ? [String(row.id)]
    : (Array.isArray(ids.value) ? ids.value : []).map((id) => String(id)).filter(Boolean);

  if (!targetIds.length) {
    ElMessage.warning(t("fileResource.selectResourcesFirst"));
    return;
  }

  fileResourceUserTransferAction.value = action;
  fileResourceUserTransferIds.value = Array.from(new Set(targetIds));
  fileResourceUserTransferTargetUserId.value = "";
  await loadFileResourceTransferUserOptions();
  fileResourceUserTransferDialogVisible.value = true;
}

async function submitFileResourceUserTransfer() {
  if (fileResourceUserTransferAction.value === "move" && !ensureFileResourceAdminOperation()) {
    return;
  }

  if (!fileResourceUserTransferIds.value.length) {
    ElMessage.warning(t("fileResource.selectResourcesFirst"));
    return;
  }

  if (!fileResourceUserTransferTargetUserId.value) {
    ElMessage.warning(t("fileResource.selectTargetUser"));
    return;
  }

  fileResourceUserTransferSubmitting.value = true;
  const actionLabel =
    fileResourceUserTransferAction.value === "share"
      ? t("fileResource.quickShare")
      : fileResourceUserTransferAction.value === "copy"
      ? t("fileResource.copy")
      : t("fileResource.transfer");

  try {
    const payload = {
      ids: fileResourceUserTransferIds.value,
      targetUserId: fileResourceUserTransferTargetUserId.value,
    };
    const res =
      fileResourceUserTransferAction.value === "share"
        ? await shareFileResourceToUser(payload)
        : fileResourceUserTransferAction.value === "copy"
        ? await copyFileResourceToUser(payload)
        : await moveFileResourceToUser(payload);
    const result = res || {};

    const successCount = Array.isArray(result?.list)
      ? result.list.length
      : Number(result?.total || 0);
    const failedCount = Array.isArray(result?.failed) ? result.failed.length : 0;
    const warningCount = Array.isArray(result?.warnings) ? result.warnings.length : 0;

    if (successCount > 0) {
      ElNotification.success(
        t("fileResource.transferResult", {
          action: actionLabel,
          success: successCount,
          failed: failedCount,
          failedPart: failedCount ? t("fileResource.transferFailedPart", { count: failedCount }) : "",
          warningPart: warningCount ? t("fileResource.transferWarningPart", { count: warningCount }) : "",
        }),
      );
      fileResourceUserTransferDialogVisible.value = false;
      resetCheckStatus();
      await getList();
    } else if (failedCount > 0) {
      ElMessage.error(t("fileResource.transferFailedCount", { action: actionLabel, count: failedCount }));
    } else {
      ElMessage.warning(t("fileResource.transferNoProcessed"));
    }

    if (failedCount > 0) {
      ElNotification.warning({
        title: t("fileResource.transferFailedDetailTitle", { action: actionLabel }),
        message: result.failed
          .slice(0, 3)
          .map((item: any) => `${item.id}: ${item.message}`)
          .join("；"),
        duration: 6000,
      });
    }

    if (warningCount > 0) {
      ElNotification.warning({
        title: t("fileResource.transferWarningTitle", { action: actionLabel }),
        message: result.warnings
          .slice(0, 3)
          .map((item: any) => `${item.id}: ${item.message}`)
          .join("；"),
        duration: 6000,
      });
    }
  } catch (error: any) {
    ElMessage.error(error?.message || t("fileResource.transferFailed", { action: actionLabel }));
  } finally {
    fileResourceUserTransferSubmitting.value = false;
  }
}

getList();

// 下载
function handleMultiDownload() {
  if (!ids.value.length) {
    return ElMessage.warning(t("fileResource.selectDataToDownload"));
  }

  // 处理文件下载
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
          const downloadUrl = row.url;
          const fileName = row.name || `file_${id}.${row.suffix || "unknown"}`;

          if (!downloadUrl) {
            ElMessage.error(t("fileResource.downloadFailedMissingUrl", { name: fileName }));
            return;
          }

          // 使用新的下载函数
          await downloadFileByElement(downloadUrl, fileName);
          ElNotification.success(t("fileResource.downloadSuccess", { name: fileName }));
        } catch (error) {
          console.error("下载失败:", error);
          ElMessage.error(t("fileResource.downloadFailed", { message: error.message }));
        }
      }, 500 * index);
    });
  } catch (e) {
    console.error("批量下载失败:", e);
    ElMessage.error(t("fileResource.batchDownloadFailed"));
  }
}

async function handleDelete(row?) {
  let delIds: any = null;

  if (row) {
    delIds = [row.id];
  } else if (!ids.value.length) {
    return ElMessage.warning(t("fileResource.selectDataToDelete"));
  } else {
    delIds = [...ids.value];
  }

  const targetItems = delIds.map(
    (id: any) =>
      dataSource.value.find((item: any) => String(item.id) === String(id)) ||
      (row && String(row.id) === String(id) ? row : null),
  ).filter(Boolean);

  const sharedItems = targetItems.filter(
    (item: any) =>
      item.isShared ||
      item.resourceLibraryId ||
      item.shareType ||
      (item.sourceUserId && String(item.sourceUserId) !== String(item.userId)),
  );

  let confirmMsg = t("fileResource.confirmDelete");
  if (sharedItems.length > 0) {
    const sampleNames = sharedItems
      .slice(0, 3)
      .map((i: any) => `「${i.name || i.id}」`)
      .join("、");
    const moreText = sharedItems.length > 3 ? ` 等共 ${sharedItems.length} 项` : "";
    confirmMsg = `选中的文件资源中包含已发布到素材中心或已共享给其他用户的资源（如 ${sampleNames}${moreText}）。删除后相关记录将被移除，是否确认继续删除？`;
  }

  try {
    await ElMessageBox.confirm(confirmMsg, t("fileResource.deleteTip"), {
      confirmButtonText: t("common.confirm"),
      cancelButtonText: t("common.cancel"),
      type: sharedItems.length > 0 ? "warning" : "error",
    });

    await deleteFileResource({ ids: delIds });
    ElNotification.success(t("common.deleteSuccess"));
    resetCheckStatus();
    getList();
  } catch (error: any) {
    if (error === "cancel" || error === "close" || error?.action === "cancel" || error?.action === "close") {
      return;
    }
    console.error("删除失败:", error);
    ElMessage.error(t("fileResource.deleteFailed", { message: error?.message || t("fileResource.unknownError") }));
  }
}

function checkboxChange(e) {
  console.log("checkboxChange事件:", e);
  console.log("records:", e.records);
  console.log("reserves:", e.reserves);
  const records = Array.isArray(e.records) ? e.records : [];
  const reserves = Array.isArray(e.reserves) ? e.reserves : [];
  ids.value = [...records.map((item) => item.id), ...reserves.map((item) => item.id)];
  console.log("最终的ids:", ids.value);
}

function checkboxAllChange(e) {
  console.log("checkboxAllChange事件:", e);
  console.log("records:", e.records);
  console.log("reserves:", e.reserves);
  const records = Array.isArray(e.records) ? e.records : [];
  const reserves = Array.isArray(e.reserves) ? e.reserves : [];
  ids.value = [...records.map((item) => item.id), ...reserves.map((item) => item.id)];
  console.log("最终的ids:", ids.value);
}

async function handleDownload(row) {
  // 处理文件下载
  try {
    const downloadUrl = row.url;
    const fileName = row.name || `file_${row.id}.${row.suffix || "unknown"}`;

    if (!downloadUrl) {
      ElMessage.error(t("fileResource.downloadFailedMissingUrl", { name: fileName }));
      return;
    }

    // 使用新的下载函数
    await downloadFileByElement(downloadUrl, fileName);
    ElNotification.success(t("fileResource.downloadSuccess", { name: fileName }));
  } catch (error) {
    console.error("下载失败:", error);
    ElMessage.error(t("fileResource.downloadFailed", { message: error.message }));
  }
}

const delayUpdateList = useDebounceFn(() => {
  getList();
}, 1999);

function handleFolderChange(payload: { folderId: string | null; node?: any }) {
  selectedFolderId.value = payload.folderId || FOLDER_FILTER.ALL;
  queryParams.folderId = selectedFolderId.value;
  queryParams.currentPage = 1;
  getList();
}

async function handleFolderDrop(payload: { data: any }) {
  markExternalFolderDropHandled();
  if (!dragState.draggingIds.length) return;

  let targetFolderId: string | null = null;
  if (payload.data.id === FOLDER_FILTER.ALL) {
    ElMessage.warning("不能移动到全部");
    resetAfterDrop();
    return;
  }

  if (payload.data.id === FOLDER_FILTER.NOT_GROUP) {
    targetFolderId = FOLDER_FILTER.NOT_GROUP;
  } else {
    targetFolderId = payload.data.id;
  }

  const movingIds = dragState.draggingIds.map((id) => String(id));
  const targetPath = payload.data.path || "";

  try {
    await batchMoveFileResource({
      ids: movingIds,
      folderId: convertFolderIdToApiParam(targetFolderId) as string | null,
    });
    ElMessage.success(`已移动 ${movingIds.length} 个文件资源到 ${targetPath || "未分类"}`);
    resetCheckStatus();
    await getList();
  } catch (error) {
    ElMessage.error((error as Error).message || "移动失败");
  } finally {
    resetAfterDrop();
  }
}

function singleFileUploaded() {
  console.log("单个文件上传");
  delayUpdateList();
}

// 编辑相关
const editDialogVisible = ref(false);
const editForm = ref({
  id: "",
  name: "",
  description: "",
  keywords: "",
  category: "",
  tags: "",
  folderId: null as string | null,
});
const editLoading = ref(false);

// 批量操作loading状态
// batch public/private removed

function handleEdit(row) {
  editForm.value = {
    id: row.id,
    name: row.name,
    description: row.description,
    keywords: row.keywords,
    category: row.category || "",
    tags: row.tags || "",
    folderId: row.folderId ?? row.folder?.id ?? null,
  };
  editDialogVisible.value = true;
}

async function submitEdit() {
  editLoading.value = true;
  try {
    await updateFileResource(editForm.value);
    ElNotification.success("保存成功");
    editDialogVisible.value = false;
    getList();
  } catch (e) {
    ElNotification.error("保存失败");
  } finally {
    editLoading.value = false;
  }
}

// 视频预览相关状态
const videoPreviewVisible = ref(false);
const currentPreviewUrl = ref("");
const currentPreviewName = ref("");
const currentPreviewSuffix = ref("");

function openFilePreview(row: { url?: string; name?: string; suffix?: string }) {
  currentPreviewUrl.value = row?.url || "";
  currentPreviewName.value = row?.name || "文件资源";
  currentPreviewSuffix.value = row?.suffix || "";
  videoPreviewVisible.value = true;
}

function closeVideoPreview() {
  videoPreviewVisible.value = false;
  currentPreviewUrl.value = "";
  currentPreviewName.value = "";
  currentPreviewSuffix.value = "";
}

function handleVideoError(event: Event) {
  const video = event.target as HTMLVideoElement;
  console.warn("视频加载失败:", video.src);
}

function handleAudioError(event: Event) {
  const audio = event.target as HTMLAudioElement;
  console.warn("音频加载失败:", audio.src);
}

function handleImageError(event: Event) {
  const image = event.target as HTMLImageElement;
  console.warn("图片加载失败:", image.src);
}

function normalizeSuffix(suffix: string): string {
  return String(suffix || "")
    .trim()
    .toLowerCase();
}

// 判断是否为视频文件
function isVideoFile(suffix: string): boolean {
  const videoSuffixes = ["mp4", "mov", "avi", "mkv", "wmv", "flv", "webm", "m4v", "3gp", "ogv"];
  return videoSuffixes.includes(normalizeSuffix(suffix));
}

// 判断是否为音频文件
function isAudioFile(suffix: string): boolean {
  const audioSuffixes = ["mp3", "wav", "aac", "ogg", "oga", "m4a", "flac", "wma", "opus", "amr"];
  return audioSuffixes.includes(normalizeSuffix(suffix));
}

function isPdfFile(suffix: string): boolean {
  return normalizeSuffix(suffix) === "pdf";
}

// 判断是否为图片文件
function isImageFile(suffix: string): boolean {
  const imageSuffixes = ["jpg", "jpeg", "png", "gif", "bmp", "webp", "svg", "ico", "tiff", "tif"];
  return imageSuffixes.includes(normalizeSuffix(suffix));
}

// 判断是否为文本/代码文件
function isTextFile(suffix: string): boolean {
  const textSuffixes = [
    "txt", "md", "json", "xml", "csv", "log",
    "js", "ts", "jsx", "tsx", "vue", "html", "htm", "css", "scss", "less",
    "py", "java", "c", "cpp", "h", "hpp", "cs", "go", "rs", "rb", "php", "sh", "bat",
    "yml", "yaml", "toml", "ini", "cfg", "conf", "env",
    "sql", "graphql", "prisma",
  ];
  return textSuffixes.includes(normalizeSuffix(suffix));
}

function isExcelFile(suffix: string): boolean {
  return ['xls', 'xlsx'].includes(normalizeSuffix(suffix));
}

function isPreviewableFile(suffix: string): boolean {
  return isVideoFile(suffix) || isAudioFile(suffix) || isImageFile(suffix) || isPdfFile(suffix) || isTextFile(suffix) || isExcelFile(suffix);
}

// 获取文件图标
function getFileIcon(suffix: string) {
  const videoSuffixes = ["mp4", "mov", "avi", "mkv", "wmv", "flv", "webm", "m4v", "3gp", "ogv"];
  const audioSuffixes = ["mp3", "wav", "aac", "ogg", "oga", "m4a", "flac", "wma", "opus", "amr"];
  const imageSuffixes = ["jpg", "jpeg", "png", "gif", "bmp", "webp", "svg", "ico", "tiff", "tif"];
  const documentSuffixes = ["pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt", "rtf"];
  const normalizedSuffix = normalizeSuffix(suffix);

  if (videoSuffixes.includes(normalizedSuffix)) {
    return VideoPlay;
  } else if (audioSuffixes.includes(normalizedSuffix)) {
    return Headset;
  } else if (imageSuffixes.includes(normalizedSuffix)) {
    return Picture;
  } else if (documentSuffixes.includes(normalizedSuffix)) {
    return Document;
  } else {
    return Folder;
  }
}

// 分类标签颜色
function getCategoryTagType(category: string) {
  const typeMap = {
    风景: "success",
    人物: "primary",
    动物: "warning",
    建筑: "info",
    动画: "danger",
    其他: "",
  };
  return typeMap[category] || "";
}

// public/private toggle and batch functions removed

// 处理dropdown操作命令
function handleOperationCommand(command: string, row: any) {
  switch (command) {
    case "edit":
      handleEdit(row);
      break;
    case "download":
      handleDownload(row);
      break;
    case "preview":
      openFilePreview(row);
      break;
    case "copy-to-user":
      openFileResourceUserTransferDialog("copy", row);
      break;
    case "share-to-user":
      openFileResourceUserTransferDialog("share", row);
      break;
    case "move-to-user":
      openFileResourceUserTransferDialog("move", row);
      break;
    case "view-shared":
      openShareRecordsDialog(row);
      break;
    case "delete":
      handleDelete(row);
      break;
    default:
      console.warn("未知的操作命令:", command);
  }
}
</script>

<style lang="less" scoped>
:deep(.file-resource-page) {
  gap: 10px;
  padding: 8px 0 0;
}

:deep(.file-resource-page .list-page-layout__body),
:deep(.file-resource-page .list-page-layout__main) {
  gap: 10px;
}

:deep(.file-resource-page .list-page-filter--flat) {
  gap: 10px;
  padding-bottom: 10px;
}

:deep(.file-resource-page .list-page-table-panel__pagination--flat) {
  padding-top: 10px;
}

:deep(.file-resource-upload-dialog) {
  .el-dialog {
    display: flex;
    width: 100% !important;
    max-width: none;
    height: 100%;
    max-height: none;
    flex-direction: column;
    margin: 0 auto !important;
    border-radius: 0;
    overflow: hidden;
  }

  .el-dialog__header {
    padding: 18px 24px 16px;
    margin-right: 0;
    border-bottom: 1px solid var(--el-border-color-lighter);
    background: var(--el-bg-color);
  }

  .el-dialog__body {
    display: flex;
    flex: 1;
    min-height: 0;
    padding: 12px 14px 14px;
    overflow: hidden;
    background: var(--el-bg-color-page);
  }

  .el-dialog__body > div {
    flex: 1;
    min-height: 0;
  }
}

:global(.file-resource-upload-dialog.el-dialog) {
  display: flex;
  width: 100% !important;
  max-width: none;
  height: 100%;
  max-height: none;
  flex-direction: column;
  margin-top: 0 !important;
  margin-bottom: 0 !important;
  border-radius: 0;
  overflow: hidden;
}

:global(.file-resource-upload-dialog.el-dialog .el-dialog__header) {
  padding: 18px 24px 16px;
  margin-right: 0;
  border-bottom: 1px solid var(--el-border-color-lighter);
  background: var(--el-bg-color);
}

:global(.file-resource-upload-dialog.el-dialog .el-dialog__body) {
  display: flex;
  flex: 1;
  min-height: 0;
  padding: 12px 14px 14px;
  overflow: hidden;
  background: var(--el-bg-color-page);
}

.file-resource-upload-dialog__content {
  display: flex;
  flex: 1;
  min-width: 0;
  min-height: 0;
}

.file-resource-sidebar {
  position: relative;
  min-height: 100%;
}

.file-resource-sidebar__body {
  min-height: 0;
  padding: 0;
}

.file-resource-sidebar__tree {
  min-height: 0;
  height: 100%;
  overflow: hidden;
}

.table-file-cell {
  display: flex;
  align-items: center;
  width: 100%;
  min-width: 0;
}

.table-file-cell__video,
.table-file-cell__image {
  display: block;
  width: 180px;
  max-width: 180px;
  max-height: 120px;
  border-radius: 10px;
  border: 1px solid var(--el-border-color-light);
  background: var(--el-fill-color-light);
  object-fit: contain;
  cursor: pointer;
}

.table-file-audio-card,
.table-file-doc-card {
  min-height: 120px;
  padding: 12px;
  border-radius: 12px;
  border: 1px solid var(--el-border-color-light);
  background: var(--el-fill-color-blank);
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 10px;
}

.table-file-audio-card {
  width: min(100%, 320px);
  min-height: 128px;
  padding: 14px 16px;
  box-sizing: border-box;
  cursor: pointer;
  background: linear-gradient(
    180deg,
    var(--el-color-primary-light-9) 0%,
    var(--el-fill-color-blank) 100%
  );
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.2s ease;
}

.table-file-audio-card:hover {
  border-color: var(--el-color-primary-light-5);
  box-shadow: 0 10px 24px color-mix(in srgb, var(--el-color-primary) 12%, transparent);
  transform: translateY(-1px);
}

.table-file-audio-card__meta {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  color: var(--el-text-color-primary);
}

.table-file-audio-card__title,
.table-file-doc-card__title {
  flex: 1;
  min-width: 0;
  font-size: 13px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  word-break: break-word;
}

.table-file-audio-card__suffix {
  font-size: 11px;
  color: var(--el-text-color-secondary);
}

.table-file-audio-card__player {
  width: calc(100% / 0.92);
  min-width: 0;
  height: 40px;
  display: block;
  transform: scale(0.92);
  transform-origin: left center;
  will-change: transform;
}

.table-file-audio-card__player-wrap {
  width: 100%;
  overflow: hidden;
}

.table-file-audio-card__player::-webkit-media-controls-panel {
  padding-inline: 4px;
}

.table-file-audio-card__player::-webkit-media-controls-current-time-display,
.table-file-audio-card__player::-webkit-media-controls-time-remaining-display {
  font-size: 11px;
  min-width: auto;
}

.table-file-audio-card__player::-webkit-media-controls-timeline {
  margin-inline: 4px;
}

.table-file-doc-card {
  width: 180px;
  align-items: center;
  text-align: center;
  color: var(--el-text-color-secondary);
}

.table-file-doc-card--pdf {
  cursor: pointer;
  background: linear-gradient(
    180deg,
    var(--el-color-danger-light-9) 0%,
    var(--el-fill-color-blank) 100%
  );
}

.table-file-doc-card--excel {
  cursor: pointer;
  background: linear-gradient(
    180deg,
    var(--el-color-success-light-9) 0%,
    var(--el-fill-color-blank) 100%
  );
}

.table-file-doc-card__tip {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

@media (max-width: 1360px) {
  :deep(.file-resource-upload-dialog) {
    .el-dialog__body {
      overflow-y: auto;
      overscroll-behavior: contain;
    }
  }
}

@media (max-width: 1024px) {
  :deep(.file-resource-upload-dialog) {
    .el-dialog {
      width: 100% !important;
      max-width: 100%;
      height: 100%;
      max-height: 100%;
      margin: 0 auto !important;
      border-radius: 0;
    }

    .el-dialog__header {
      padding: 14px 16px;
    }

    .el-dialog__body {
      padding: 12px;
    }
  }

  :global(.file-resource-upload-dialog.el-dialog) {
    width: 100% !important;
    max-width: 100%;
    height: 100%;
    max-height: 100%;
    margin-top: 0 !important;
    margin-bottom: 0 !important;
    border-radius: 0;
  }

  :global(.file-resource-upload-dialog.el-dialog .el-dialog__header) {
    padding: 14px 16px;
  }

  :global(.file-resource-upload-dialog.el-dialog .el-dialog__body) {
    padding: 12px;
  }

  .file-resource-sidebar__body {
    padding: 0;
  }
}
</style>
