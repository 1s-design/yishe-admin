<template>
  <div class="image-group-page">
    <ListPageLayout
      class="image-group-layout"
      :sidebar-width="folderTreeCollapsed ? '28px' : '280px'"
    >
      <template #filter>
        <div class="list-page-filter list-page-filter--flat image-group-page__filter">
          <el-form
            :model="queryParams"
            label-position="top"
            class="list-page-search-form"
            @submit.prevent="handleSearch"
          >
            <el-row :gutter="12" class="list-page-search-form__row">
              <el-col class="list-page-search-form__col--narrow" :xs="24" :sm="12" :md="8" :lg="6">
                <el-form-item label="按 ID 搜索">
                  <el-input
                    v-model="queryParams.id"
                    size="small"
                    placeholder="输入组图 ID"
                    clearable
                    @keyup.enter="handleSearch"
                    @clear="handleSearch"
                  />
                </el-form-item>
              </el-col>

              <el-col class="list-page-search-form__col--wide" :xs="24" :sm="12" :md="8" :lg="8">
                <el-form-item label="搜索关键词">
                  <el-input
                    v-model="queryParams.searchText"
                    size="small"
                    placeholder="输入组图名称或描述"
                    clearable
                    @keyup.enter="handleSearch"
                    @clear="handleSearch"
                  />
                </el-form-item>
              </el-col>
            </el-row>

            <div class="list-page-search-form__actions image-group-page__actions">
              <el-button
                size="small"
                type="primary"
                :icon="Search"
                :loading="loading"
                @click="handleSearch"
              >
                {{ t('common.search') }}
              </el-button>
              <el-button size="small" :icon="Refresh" @click="resetQuery">{{ t('common.reset') }}</el-button>
              <el-button size="small" type="success" :icon="Plus" @click="handleCreateGroup">
                {{ t('material.newGroup') }}
              </el-button>
              <el-dropdown trigger="click" popper-class="material-tool-dropdown" :disabled="loading || !selectedIds.length">
                <el-button size="small" type="primary" :disabled="loading || !selectedIds.length">
                  {{ t('material.toolsCount', { count: selectedIds.length }) }}
                </el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item @click="handleCreatePsdSets">
                      <span>{{ t('material.multiImagePsdSet') }}</span>
                    </el-dropdown-item>
                    <el-dropdown-item @click="handlePublishConfigSets">
                      <span>{{ t('material.selectPublishConfig') }}</span>
                    </el-dropdown-item>
                    <el-dropdown-item @click="handleProductConfigSets">
                      <span>{{ t('material.generateSiteProduct') }}</span>
                    </el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
              <el-button
                size="small"
                type="danger"
                plain
                :icon="Delete"
                @click="handleBatchDelete"
              >
                {{ t('material.batchDelete', { count: selectedIds.length }) }}
              </el-button>
            </div>
          </el-form>
        </div>
      </template>

      <template #sidebar>
        <div
          class="list-page-panel list-page-panel--flat list-page-sidebar image-group-sidebar folder-sidebar-shell"
        >
          <div class="list-page-sidebar__body image-group-sidebar__body folder-sidebar-body">
            <div
              v-show="!folderTreeCollapsed"
              class="image-group-sidebar__tree folder-sidebar-tree"
            >
              <FolderTree
                v-model="selectedFolderId"
                width="100%"
                :show-border="false"
                :folder-category="IMAGE_GROUP_FOLDER_CATEGORY"
                :drag-state="dragState"
                @change="handleFolderChange"
                @reloaded="loadGroups"
                @folder-drag-over="handleFolderDragOver"
                @folder-drag-leave="handleFolderDragLeave"
                @folder-drop="handleFolderDrop"
              />
            </div>
          </div>
          <button
            type="button"
            class="image-group-sidebar__toggle folder-sidebar-toggle"
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
          class="common-table list-page-panel list-page-panel--flat list-page-table-panel list-page-table-panel--flat"
        >
          <div class="list-page-table-panel__body image-group-page__table-body">
            <vxe-grid
              class="image-group-dnd-grid"
              ref="gridRef"
              v-bind="gridOptions"
              :data="dataSource"
              :loading="loading"
              @checkbox-change="onSelectionChange"
              @checkbox-all="onSelectionChange"
            >
              <template #dragHandleSlot>
                <TableRowDragHandle />
              </template>

              <template #idSlot="{ row }">
                <button
                  class="image-group-id"
                  type="button"
                  title="复制组图 ID"
                  @click="copyText(row.id)"
                >
                  <span>{{ row.id }}</span>
                  <el-icon><CopyDocument /></el-icon>
                </button>
              </template>

              <template #stickersSlot="{ row }">
                <VueDraggable
                  v-if="row.stickers?.length"
                  :list="row.stickers"
                  item-key="id"
                  :group="{ name: `image-group-members-${row.id}`, pull: false, put: false }"
                  class="image-group-members-grid"
                  :class="{ 'is-saving': isMemberSortSaving(row.id) }"
                  :disabled="row.stickers.length < 2 || isMemberSortSaving(row.id)"
                  :animation="180"
                  :force-fallback="true"
                  :fallback-on-body="true"
                  :fallback-tolerance="4"
                  :delay="120"
                  :delay-on-touch-only="true"
                  :touch-start-threshold="4"
                  filter=".image-group-member__remove"
                  :prevent-on-filter="false"
                  ghost-class="image-group-member--ghost"
                  chosen-class="image-group-member--chosen"
                  drag-class="image-group-member--dragging"
                  @start="handleMemberDragStart(row)"
                  @end="handleMemberDragEnd(row, $event)"
                >
                  <template #item="{ element: sticker, index }">
                    <div
                      class="image-group-member"
                      :class="{ 'is-sortable': row.stickers.length > 1 }"
                      :title="getMemberTitle(sticker, index, row.stickers.length)"
                    >
                      <span class="image-group-member__order">#{{ index + 1 }}</span>
                      <el-image
                        v-if="sticker.url"
                        :src="sticker.url"
                        fit="contain"
                        class="image-group-member__image"
                        :preview-src-list="getPreviewUrls(row)"
                        :initial-index="index"
                        preview-teleported
                      />
                      <div v-else class="image-group-member__placeholder">
                        <el-icon><Picture /></el-icon>
                      </div>
                      <span
                        v-if="row.stickers.length > 1"
                        class="image-group-member__drag-indicator"
                        aria-hidden="true"
                      >
                        <el-icon><Rank /></el-icon>
                      </span>
                      <el-button
                        class="image-group-member__remove"
                        type="danger"
                        circle
                        :icon="CloseBold"
                        :disabled="isMemberSortSaving(row.id)"
                        title="从组图移除"
                        @click.stop="handleRemoveSticker(row, sticker)"
                      />
                    </div>
                  </template>
                </VueDraggable>
                <span v-else class="table-cell-empty">暂无图片</span>
              </template>

              <template #countSlot="{ row }">
                <el-tag size="small" type="info" effect="plain"
                  >{{ row.stickersCount || 0 }} 张</el-tag
                >
              </template>

              <template #folderSlot="{ row }">
                <span :class="{ 'table-cell-empty': !row.folder }">{{
                  row.folder || "未分组"
                }}</span>
              </template>

              <template #actionSlot="{ row }">
                <el-dropdown
                  trigger="click"
                  placement="bottom-end"
                  @command="(command) => handleRowCommand(command, row)"
                >
                  <el-button link type="primary" size="small" class="image-group-action-trigger">
                    操作
                    <el-icon><ArrowDown /></el-icon>
                  </el-button>
                  <template #dropdown>
                    <el-dropdown-menu>
                      <el-dropdown-item command="add" :icon="Plus">添加图片</el-dropdown-item>
                      <el-dropdown-item command="edit" :icon="Edit">编辑</el-dropdown-item>
                      <el-dropdown-item command="delete" :icon="Delete" divided
                        >删除</el-dropdown-item
                      >
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
          class="list-page-panel list-page-panel--flat list-page-table-panel__pagination list-page-table-panel__pagination--flat image-group-pagination"
        >
          <pagination
            v-model:page="queryParams.pageNo"
            v-model:limit="queryParams.pageSize"
            :total="total"
            @pagination="loadGroups"
          />
        </div>
      </template>
    </ListPageLayout>

    <el-dialog
      v-model="groupModalVisible"
      :title="isEditing ? '编辑组图' : '新建组图'"
      width="480px"
      append-to-body
      destroy-on-close
    >
      <el-form :model="groupForm" label-width="84px" @submit.prevent="saveGroup">
        <el-form-item label="组图名称" required>
          <el-input
            v-model="groupForm.name"
            maxlength="255"
            show-word-limit
            placeholder="请输入组图名称"
          />
        </el-form-item>
        <el-form-item label="描述">
          <el-input
            v-model="groupForm.description"
            type="textarea"
            :rows="3"
            maxlength="5000"
            placeholder="请输入描述"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="groupModalVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="saveGroup">保存</el-button>
      </template>
    </el-dialog>

  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref } from "vue";
import {
  ArrowDown,
  CloseBold,
  CopyDocument,
  DArrowLeft,
  DArrowRight,
  Delete,
  Edit,
  Picture,
  Plus,
  Rank,
  Refresh,
  Search,
} from "@element-plus/icons-vue";
import { ElMessage, ElMessageBox } from "element-plus";
import type { VxeGridInstance, VxeGridProps } from "vxe-table";
import VueDraggable from "vuedraggable";
import { imageGroupApi, type ImageGroupItem, type ImageGroupSticker } from "@/api/imageGroup";
import { buildOperationColumn, commonGridOptions } from "@/common/table";
import FolderTree from "@/components/material/FolderTree.vue";
import ListPageLayout from "@/components/ListPageLayout/index.vue";
import { FOLDER_FILTER } from "@/constants/folder";
import { useLocalStorage, useWindowSize } from "@vueuse/core";
import { useFolderRowDrag } from "@/hooks/useFolderRowDrag";
import TableRowDragHandle from "@/components/TableRowDragHandle/index.vue";
import { useI18n } from "@/hooks/web/useI18n";

const { t } = useI18n();

const emit = defineEmits<{
  addStickers: [group: ImageGroupItem];
  createPsdSets: [groups: ImageGroupItem[]];
  createPublishConfigSets: [groups: ImageGroupItem[]];
  createProductConfigSets: [groups: ImageGroupItem[]];
}>();

const IMAGE_GROUP_FOLDER_CATEGORY = "imagegroup";

const { height } = useWindowSize();
const maxHeight = computed(() => Math.max(height.value - 280, 360));

const gridRef = ref<VxeGridInstance<ImageGroupItem>>();
const loading = ref(false);
const saving = ref(false);
const dataSource = ref<ImageGroupItem[]>([]);
const total = ref(0);
const selectedIds = ref<string[]>([]);
const memberSortSavingIds = ref<Set<string>>(new Set());
const memberSortSnapshots = new Map<string, ImageGroupSticker[]>();
const selectedFolderId = ref<string | null>(FOLDER_FILTER.ALL);
const folderTreeCollapsed = useLocalStorage("material_folder_collapsed", false);
const {
  dragState,
  setupRowDrag,
  handleFolderDragOver,
  handleFolderDragLeave,
  resetAfterDrop,
  markExternalFolderDropHandled,
} = useFolderRowDrag({
  gridClass: "image-group-dnd-grid",
  dataSource,
  selectedIds,
  onDropToFolder: handleFolderDrop,
});

const queryParams = reactive({
  id: "",
  searchText: "",
  pageNo: 1,
  pageSize: 20,
});

const groupModalVisible = ref(false);
const isEditing = ref(false);
const currentGroupId = ref("");
const groupForm = reactive({
  name: "",
  description: "",
});

const gridOptions = computed<VxeGridProps<ImageGroupItem>>(() => ({
  ...commonGridOptions,
  maxHeight: maxHeight.value,
  pagerConfig: { enabled: false },
  rowConfig: {
    ...commonGridOptions.rowConfig,
    isHover: false,
    keyField: "id",
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
    { type: "checkbox", width: 42, align: "center" },
    {
      title: "图片成员",
      field: "stickers",
      minWidth: 360,
      showOverflow: false,
      className: "image-group-members-cell",
      slots: { default: "stickersSlot" },
    },
    { title: "组图名称", field: "name", minWidth: 170 },
    {
      title: "数量",
      field: "stickersCount",
      width: 84,
      align: "center",
      slots: { default: "countSlot" },
    },
    {
      title: "文件夹",
      field: "folder",
      minWidth: 130,
      slots: { default: "folderSlot" },
    },
    { title: "ID", field: "id", width: 150, slots: { default: "idSlot" } },
    { title: "创建时间", field: "createTime", width: 160, className: "table-time-cell" },
    buildOperationColumn("actionSlot", 86),
  ],
}));

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

function getPreviewUrls(group: ImageGroupItem) {
  return group.stickers.map((sticker) => sticker.url).filter((url): url is string => Boolean(url));
}

function getMemberTitle(sticker: ImageGroupSticker, index: number, memberCount: number) {
  const name = sticker.name || `图片 ${index + 1}`;
  return memberCount > 1 ? `${name}，拖动调整顺序` : name;
}

function isMemberSortSaving(groupId: string) {
  return memberSortSavingIds.value.has(String(groupId));
}

function setMemberSortSaving(groupId: string, saving: boolean) {
  const nextIds = new Set(memberSortSavingIds.value);
  if (saving) {
    nextIds.add(String(groupId));
  } else {
    nextIds.delete(String(groupId));
  }
  memberSortSavingIds.value = nextIds;
}

function handleMemberDragStart(group: ImageGroupItem) {
  memberSortSnapshots.set(String(group.id), [...group.stickers]);
}

async function handleMemberDragEnd(
  group: ImageGroupItem,
  event: { oldIndex?: number; newIndex?: number },
) {
  const groupId = String(group.id);
  const snapshot = memberSortSnapshots.get(groupId);
  memberSortSnapshots.delete(groupId);

  if (
    !snapshot ||
    event.oldIndex === undefined ||
    event.newIndex === undefined ||
    event.oldIndex === event.newIndex
  ) {
    return;
  }

  const reorderedStickers = group.stickers.map((sticker, index) => ({
    ...sticker,
    sortOrder: index,
  }));
  group.stickers = reorderedStickers;
  setMemberSortSaving(groupId, true);

  try {
    const updatedGroup = await imageGroupApi.addStickers(groupId, {
      stickers: reorderedStickers.map((sticker, index) => ({
        stickerId: sticker.id,
        sortOrder: index,
      })),
    });
    Object.assign(group, updatedGroup);
    ElMessage.success("图片顺序已更新");
  } catch (error) {
    group.stickers = snapshot;
    ElMessage.error(getErrorMessage(error, "保存图片顺序失败，已恢复原顺序"));
  } finally {
    setMemberSortSaving(groupId, false);
  }
}

async function copyText(value: string) {
  try {
    await navigator.clipboard.writeText(value);
    ElMessage.success("组图 ID 已复制");
  } catch {
    ElMessage.error("复制失败");
  }
}

function onSelectionChange() {
  const records = gridRef.value?.getCheckboxRecords() || [];
  selectedIds.value = records.map((record) => record.id);
}

function handleCreatePsdSets() {
  const selectedIdSet = new Set(selectedIds.value.map(String));
  const groups = dataSource.value.filter((group) => selectedIdSet.has(String(group.id)));
  if (!groups.length) {
    ElMessage.warning("请选择要制作套图的组图");
    return;
  }

  const emptyGroups = groups.filter((group) => !group.stickers?.length);
  if (emptyGroups.length) {
    ElMessage.warning(`组图“${emptyGroups.map((group) => group.name).join("、")}”没有图片成员`);
    return;
  }

  emit("createPsdSets", groups);
}

function handlePublishConfigSets() {
  const selectedIdSet = new Set(selectedIds.value.map(String));
  const groups = dataSource.value.filter((group) => selectedIdSet.has(String(group.id)));
  if (!groups.length) {
    ElMessage.warning(t("material.selectGroupForPublishConfig"));
    return;
  }

  const emptyGroups = groups.filter((group) => !group.stickers?.length);
  if (emptyGroups.length) {
    ElMessage.warning(t("material.groupEmptyStickersTip", { names: emptyGroups.map((group) => group.name).join("、") }));
    return;
  }

  emit("createPublishConfigSets", groups);
}

function handleProductConfigSets() {
  const selectedIdSet = new Set(selectedIds.value.map(String));
  const groups = dataSource.value.filter((group) => selectedIdSet.has(String(group.id)));
  if (!groups.length) {
    ElMessage.warning(t("material.selectGroupForProductConfig"));
    return;
  }

  const emptyGroups = groups.filter((group) => !group.stickers?.length);
  if (emptyGroups.length) {
    ElMessage.warning(t("material.groupEmptyStickersTip", { names: emptyGroups.map((group) => group.name).join("、") }));
    return;
  }

  emit("createProductConfigSets", groups);
}

async function loadGroups() {
  loading.value = true;
  try {
    const result = await imageGroupApi.page({
      id: queryParams.id.trim() || undefined,
      searchText: queryParams.searchText.trim() || undefined,
      folderId:
        selectedFolderId.value === FOLDER_FILTER.ALL
          ? undefined
          : selectedFolderId.value || FOLDER_FILTER.NOT_GROUP,
      pageNo: queryParams.pageNo,
      pageSize: queryParams.pageSize,
    });
    dataSource.value = result.list || [];
    total.value = result.total || 0;
    selectedIds.value = [];
    nextTick(setupRowDrag);
  } catch (error) {
    ElMessage.error(getErrorMessage(error, "加载组图失败"));
  } finally {
    loading.value = false;
  }
}

function handleSearch() {
  queryParams.pageNo = 1;
  loadGroups();
}

function resetQuery() {
  queryParams.id = "";
  queryParams.searchText = "";
  queryParams.pageNo = 1;
  loadGroups();
}

function handleFolderChange(payload: { folderId: string | null }) {
  selectedFolderId.value = payload.folderId || FOLDER_FILTER.ALL;
  queryParams.pageNo = 1;
  loadGroups();
}

async function handleFolderDrop(payload: { data: any }) {
  markExternalFolderDropHandled();
  if (!dragState.draggingIds.length) return;
  if (payload.data.id === FOLDER_FILTER.ALL) {
    resetAfterDrop();
    return;
  }

  const ids = [...dragState.draggingIds];
  const folderId = payload.data.id === FOLDER_FILTER.NOT_GROUP ? null : payload.data.id;
  try {
    await imageGroupApi.moveToFolder({ ids, folderId });
    ElMessage.success(`已移动 ${ids.length} 个组图`);
    await loadGroups();
    gridRef.value?.clearCheckboxRow();
  } catch (error) {
    ElMessage.error(getErrorMessage(error, "移动组图失败"));
  } finally {
    resetAfterDrop();
  }
}

function handleCreateGroup() {
  isEditing.value = false;
  currentGroupId.value = "";
  groupForm.name = "";
  groupForm.description = "";
  groupModalVisible.value = true;
}

function handleEditGroup(group: ImageGroupItem) {
  isEditing.value = true;
  currentGroupId.value = group.id;
  groupForm.name = group.name;
  groupForm.description = group.description || "";
  groupModalVisible.value = true;
}

async function saveGroup() {
  const name = groupForm.name.trim();
  if (!name) {
    ElMessage.warning("请输入组图名称");
    return;
  }

  saving.value = true;
  try {
    const payload = {
      name,
      description: groupForm.description.trim(),
      ...(!isEditing.value
        ? {
            folderId:
              selectedFolderId.value === FOLDER_FILTER.ALL ||
              selectedFolderId.value === FOLDER_FILTER.NOT_GROUP
                ? null
                : selectedFolderId.value,
          }
        : {}),
    };
    if (isEditing.value) {
      await imageGroupApi.update(currentGroupId.value, payload);
      ElMessage.success("组图已更新");
    } else {
      await imageGroupApi.create(payload);
      ElMessage.success("组图已创建");
    }
    groupModalVisible.value = false;
    await loadGroups();
  } catch (error) {
    ElMessage.error(getErrorMessage(error, "保存组图失败"));
  } finally {
    saving.value = false;
  }
}

async function confirmDelete(message: string) {
  try {
    await ElMessageBox.confirm(message, "确认删除", {
      confirmButtonText: "删除",
      cancelButtonText: "取消",
      type: "warning",
    });
    return true;
  } catch {
    return false;
  }
}

async function handleDeleteGroup(group: ImageGroupItem) {
  if (!(await confirmDelete(`确定删除组图“${group.name}”吗？组内图片不会被删除。`))) return;
  try {
    await imageGroupApi.remove(group.id);
    ElMessage.success("组图已删除");
    await loadGroups();
  } catch (error) {
    ElMessage.error(getErrorMessage(error, "删除组图失败"));
  }
}

async function handleBatchDelete() {
  const ids = [...selectedIds.value];
  if (!ids.length || !(await confirmDelete(`确定删除选中的 ${ids.length} 个组图吗？`))) return;

  const results = await Promise.allSettled(ids.map((id) => imageGroupApi.remove(id)));
  const failedCount = results.filter((result) => result.status === "rejected").length;
  await loadGroups();
  if (failedCount) {
    ElMessage.error(`${failedCount} 个组图删除失败`);
  } else {
    ElMessage.success(`已删除 ${ids.length} 个组图`);
  }
}

async function handleRemoveSticker(group: ImageGroupItem, sticker: ImageGroupSticker) {
  try {
    await ElMessageBox.confirm("确定将这张图片从组图中移除吗？", "移除图片", {
      confirmButtonText: "移除",
      cancelButtonText: "取消",
      type: "warning",
    });
  } catch {
    return;
  }

  try {
    await imageGroupApi.removeStickers(group.id, { stickerIds: [sticker.id] });
    ElMessage.success("图片已从组图移除");
    await loadGroups();
  } catch (error) {
    ElMessage.error(getErrorMessage(error, "移除图片失败"));
  }
}

function requestAddStickers(group: ImageGroupItem) {
  emit("addStickers", group);
}

function handleRowCommand(command: string | number | object, group: ImageGroupItem) {
  if (command === "add") {
    requestAddStickers(group);
  } else if (command === "edit") {
    handleEditGroup(group);
  } else if (command === "delete") {
    handleDeleteGroup(group);
  }
}

onMounted(loadGroups);
</script>

<style scoped>
.image-group-page {
  width: 100%;
  min-width: 0;
}

:deep(.image-group-layout.list-page-layout) {
  gap: 10px;
  padding: 8px 0 0;
}

.image-group-page__table-body {
  padding: 0;
}

.image-group-sidebar {
  position: relative;
  min-height: 100%;
}

.image-group-sidebar__body {
  padding: 0;
}

.image-group-sidebar__tree {
  height: 100%;
  min-height: 0;
  overflow: hidden;
}

.image-group-id {
  display: inline-flex;
  max-width: 100%;
  padding: 0;
  font: inherit;
  color: var(--el-color-primary);
  cursor: pointer;
  background: transparent;
  border: 0;
  align-items: center;
  gap: 5px;
}

.image-group-id span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.image-group-members-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, 60px);
  align-items: start;
  gap: 8px;
  width: 100%;
  max-height: 144px;
  padding: 6px 0;
  overflow-y: auto;
  white-space: normal;
}

.image-group-members-grid.is-saving {
  cursor: progress;
}

.image-group-members-grid.is-saving .image-group-member {
  pointer-events: none;
  opacity: 0.68;
}

.image-group-member {
  position: relative;
  width: 60px;
  height: 60px;
  overflow: hidden;
  background: var(--el-fill-color-light);
  border: 1px solid var(--el-border-color);
  border-radius: 6px;
  transition:
    border-color 140ms ease,
    box-shadow 140ms ease,
    opacity 140ms ease;
}

.image-group-member.is-sortable {
  cursor: grab;
  user-select: none;
}

.image-group-member.is-sortable:active {
  cursor: grabbing;
}

.image-group-member__image,
.image-group-member__placeholder {
  width: 100%;
  height: 100%;
}

.image-group-member__placeholder {
  display: grid;
  font-size: 28px;
  color: var(--el-text-color-placeholder);
  place-items: center;
}

.image-group-member__order {
  position: absolute;
  z-index: 2;
  color: #fff;
  background: rgb(0 0 0 / 72%);
}

.image-group-member__order {
  top: 0;
  left: 0;
  min-width: 18px;
  padding: 1px 4px;
  font-size: 9px;
  font-weight: 600;
  line-height: 14px;
  text-align: center;
  border-radius: 0 0 5px;
}

.image-group-member__drag-indicator {
  position: absolute;
  bottom: 2px;
  left: 2px;
  z-index: 2;
  display: grid;
  width: 17px;
  height: 17px;
  font-size: 12px;
  color: #fff;
  pointer-events: none;
  background: rgb(0 0 0 / 62%);
  border-radius: 3px;
  opacity: 0;
  transition: opacity 120ms ease;
  place-items: center;
}

.image-group-member:hover .image-group-member__drag-indicator,
.image-group-member--chosen .image-group-member__drag-indicator {
  opacity: 1;
}

.image-group-member--ghost {
  background: var(--el-color-primary-light-9) !important;
  border-color: var(--el-color-primary) !important;
  border-style: dashed !important;
  box-shadow: inset 0 0 0 1px var(--el-color-primary-light-7);
}

.image-group-member--ghost > * {
  opacity: 0 !important;
}

.image-group-member--chosen {
  border-color: var(--el-color-primary);
  box-shadow: 0 0 0 2px var(--el-color-primary-light-7);
}

.image-group-member--dragging {
  cursor: grabbing !important;
  opacity: 0.96 !important;
  box-shadow: var(--el-box-shadow-light);
}

.image-group-member__remove {
  position: absolute;
  top: 0;
  right: 0;
  z-index: 3;
  width: 18px !important;
  height: 18px !important;
  max-width: 18px;
  max-height: 18px;
  min-width: 18px !important;
  min-height: 18px !important;
  padding: 0 !important;
  font-size: 10px;
  line-height: 18px;
  border-radius: 50%;
  opacity: 0;
  transition: opacity 120ms ease;
  flex: 0 0 18px;
}

.image-group-member:hover .image-group-member__remove,
.image-group-member:focus-within .image-group-member__remove {
  opacity: 1;
}

.image-group-action-trigger {
  display: inline-flex;
  align-items: center;
  gap: 3px;
}

.image-group-pagination {
  margin-top: 0;
}

:deep(.image-group-members-cell .vxe-cell),
:deep(.image-group-members-cell .vxe-cell--wrapper),
:deep(.image-group-members-cell .vxe-cell--label) {
  max-height: 152px !important;
  overflow-y: auto !important;
  white-space: normal !important;
}

:deep(.vxe-body--row.row--hover > .vxe-body--column),
:deep(.vxe-body--row:hover > .vxe-body--column) {
  background-color: transparent !important;
}

@media (width <= 1024px) {
  .image-group-sidebar__body {
    padding-bottom: 28px;
  }
}

@media (width <= 768px) {
  .image-group-members-grid {
    grid-template-columns: repeat(auto-fill, 52px);
    gap: 5px;
  }

  .image-group-member {
    width: 52px;
    height: 52px;
  }

  .image-group-member__remove {
    opacity: 1;
  }

  .image-group-member__drag-indicator {
    opacity: 0.82;
  }
}
</style>
