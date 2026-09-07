<template>
  <ContentWrap :plain="true">
    <ListPageLayout
      class="skills-page"
      :sidebar-width="folderTreeCollapsed ? '28px' : '280px'"
    >
      <template #filter>
        <div class="list-page-filter list-page-filter--flat">
          <el-form :model="query" label-position="top" class="list-page-search-form">
            <el-row :gutter="12" class="list-page-search-form__row">
              <el-col :xs="24" :sm="12" :md="8" :lg="5" :xl="4">
                <el-form-item label="关键词">
                  <el-input
                    v-model="query.keyword"
                    size="small"
                    clearable
                    placeholder="搜索名称或说明"
                    @keyup.enter="search"
                  />
                </el-form-item>
              </el-col>
              <el-col :xs="24" :sm="12" :md="8" :lg="5" :xl="4">
                <el-form-item label="适用端">
                  <el-select v-model="query.target" size="small" clearable placeholder="全部">
                    <el-option v-for="opt in targetOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :xs="24" :sm="12" :md="8" :lg="5" :xl="4">
                <el-form-item label="状态">
                  <el-select v-model="query.enabled" size="small" clearable placeholder="全部">
                    <el-option label="已启用" :value="true" />
                    <el-option label="已停用" :value="false" />
                  </el-select>
                </el-form-item>
              </el-col>
            </el-row>
            <div class="list-page-search-form__actions">
              <el-button type="primary" :icon="Search" @click="search">搜索</el-button>
              <el-button :icon="Refresh" @click="resetSearch">重置</el-button>
              <el-button type="primary" :icon="Plus" @click="openCreate">新增</el-button>
              <el-button
                type="danger"
                :icon="Delete"
                :disabled="!selectedIds.length"
                @click="removeSkills(selectedIds)"
              >
                批量删除
              </el-button>
              <el-button
                size="small"
                type="success"
                :disabled="!selectedIds.length || !isAdmin"
                @click="openTransferDialog('share', [...selectedIds])"
              >
                分享 ({{ selectedIds.length }})
              </el-button>
              <el-button
                v-if="isAdmin"
                size="small"
                type="warning"
                :disabled="!selectedIds.length"
                @click="handleBatchPublishToLibrary"
              >
                发布到库 ({{ selectedIds.length }})
              </el-button>
            </div>
          </el-form>
        </div>
      </template>

      <template #sidebar>
        <div
          class="list-page-panel list-page-panel--flat list-page-sidebar folder-sidebar-shell"
        >
          <div class="list-page-sidebar__body folder-sidebar-body">
            <div v-show="!folderTreeCollapsed" class="folder-sidebar-tree">
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
            class="folder-sidebar-toggle"
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
        <vxe-grid
          ref="gridRef"
          class="skills-dnd-grid"
          v-bind="gridOptions"
          :data="rows"
          :loading="loading"
          @checkbox-change="checkboxChange"
          @checkbox-all="checkboxAllChange"
        >
          <template #dragHandleSlot>
            <TableRowDragHandle />
          </template>
          <template #nameDefaultSlot="{ row }">
            <div class="skill-name">{{ row.name }}</div>
            <div class="skill-description">{{ row.description || "暂无说明" }}</div>
          </template>
          <template #targetsDefaultSlot="{ row }">
            <el-tag
              v-for="target in row.targets"
              :key="target"
              size="small"
              effect="plain"
              class="tag-gap"
            >
              {{ targetLabel(target) }}
            </el-tag>
          </template>
          <template #triggersDefaultSlot="{ row }">
            <span class="muted">{{ row.triggers?.slice(0, 4).join("、") || "未设置" }}</span>
          </template>
          <template #shareTypeDefaultSlot="{ row }">
            <el-tag v-if="row.shareType === 'shared' || row.shareType === 'copy' || (row.sourceUserId && row.sourceUserId !== row.userId)" type="success" size="small">
              由【{{ row.sourceUser?.name || row.sourceUser?.account || row.sourceUserId }}】分享
            </el-tag>
            <span v-else class="muted">-</span>
          </template>
          <template #permissionDefaultSlot="{ row }">
            <el-tag :type="row.isPublic ? 'success' : 'info'" size="small">
              {{ row.isPublic ? "公开" : "私有" }}
            </el-tag>
          </template>
          <template #enabledDefaultSlot="{ row }">
            <el-tag :type="row.enabled ? 'success' : 'info'" size="small" effect="plain">
              {{ row.enabled ? "启用" : "停用" }}
            </el-tag>
          </template>
          <template #operationDefaultSlot="{ row }">
            <el-dropdown trigger="click" @command="(cmd: string) => handleRowCommand(cmd, row)">
              <el-button link type="primary">操作</el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="edit" :disabled="row.permission?.canEdit === false">编辑</el-dropdown-item>
                  <el-dropdown-item v-if="isAdmin" divided command="share-to-user">分享给用户</el-dropdown-item>
                  <el-dropdown-item v-if="isAdmin" command="move-to-user">移交所有人</el-dropdown-item>
                  <el-dropdown-item v-if="isAdmin" divided command="view-shared">查看分享记录</el-dropdown-item>
                  <el-dropdown-item divided command="delete" :disabled="row.permission?.canDelete === false">
                    <span style="color: var(--el-color-danger)">删除</span>
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </template>
        </vxe-grid>
      </template>

      <template #pagination>
        <Pagination
          v-model:current-page="query.currentPage"
          v-model:page-size="query.pageSize"
          :total="total"
          @change="load"
        />
      </template>
    </ListPageLayout>
  </ContentWrap>

  <el-dialog
    v-model="dialogVisible"
    :title="form.id ? '编辑 Skill' : '新建 Skill'"
    fullscreen
    class="skill-editor-dialog"
    :close-on-click-modal="false"
    destroy-on-close
  >
    <el-form
      ref="formRef"
      :model="form"
      :rules="rules"
      label-position="top"
      class="skill-editor-form"
    >
      <div class="skill-editor-meta">
        <el-form-item label="名称" prop="name" class="skill-editor-meta__name">
          <el-input v-model="form.name" maxlength="160" show-word-limit />
        </el-form-item>
        <el-form-item label="适用 Agent" prop="targets">
          <el-select v-model="form.targets" multiple placeholder="请选择适用的 Agent">
            <el-option v-for="opt in targetOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="使用权限">
          <div class="permission-controls">
            <el-switch v-model="form.enabled" active-text="启用" inactive-text="停用" />
            <el-switch
              v-if="canSetPublic"
              v-model="form.isPublic"
              active-text="公开"
              inactive-text="私有"
            />
            <el-tag v-else type="info" effect="plain">私有</el-tag>
          </div>
        </el-form-item>
        <el-form-item label="用途说明" class="skill-editor-meta__wide">
          <el-input
            v-model="form.description"
            size="small"
            maxlength="4000"
            placeholder="说明它适合处理什么任务，便于匹配"
          />
        </el-form-item>
        <el-form-item label="触发关键词" class="skill-editor-meta__wide">
          <el-input v-model="triggerText" size="small" placeholder="用逗号分隔，例如：对联，书法，打印" />
        </el-form-item>
      </div>

      <div class="file-editor">
        <aside class="file-list">
          <div class="file-list__header">
            <span>虚拟文件</span>
            <el-tooltip content="添加文件" placement="top">
              <el-button :icon="Plus" circle text @click="addFile" />
            </el-tooltip>
          </div>
          <button
            v-for="path in filePaths"
            :key="path"
            type="button"
            class="file-row"
            :class="{ 'is-active': path === activePath }"
            @click="activePath = path"
          >
            <el-icon><Document /></el-icon>
            <span class="file-row__path">{{ path }}</span>
            <el-tooltip v-if="path === form.content.entry" content="入口文件">
              <el-icon class="entry-icon"><StarFilled /></el-icon>
            </el-tooltip>
          </button>
        </aside>

        <section class="file-content">
          <div class="file-content__header">
            <span>{{ activePath }}</span>
            <div>
              <el-button
                size="small"
                :disabled="activePath === form.content.entry"
                @click="setEntry"
              >
                设为入口
              </el-button>
              <el-button
                size="small"
                type="danger"
                plain
                :icon="Delete"
                :disabled="filePaths.length <= 1"
                @click="removeActiveFile"
              >
                删除文件
              </el-button>
            </div>
          </div>
          <el-input
            v-if="activePath"
            v-model="form.content.files[activePath]"
            type="textarea"
            class="file-textarea"
            resize="none"
            spellcheck="false"
          />
        </section>
      </div>
    </el-form>

    <template #footer>
      <el-button @click="dialogVisible = false">取消</el-button>
      <el-button type="primary" :loading="saving" @click="save">保存</el-button>
    </template>
  </el-dialog>

  <!-- 分享/转移弹窗 -->
  <el-dialog
    v-model="transferDialogVisible"
    :title="transferDialogTitle"
    width="480px"
    :close-on-click-modal="false"
    destroy-on-close
  >
    <el-form label-width="80px">
      <el-form-item label="目标用户">
        <el-select
          v-model="transferTargetUserId"
          filterable
          placeholder="搜索用户名"
          style="width: 100%"
          :loading="userListLoading"
          @focus="loadUserList"
        >
          <el-option
            v-for="u in userList"
            :key="u.id"
            :label="u.name || u.account"
            :value="u.id"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="数量">
        <span>共 {{ transferIds.length }} 个 Skill</span>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="transferDialogVisible = false">取消</el-button>
      <el-button type="primary" :loading="transferLoading" @click="submitTransfer">确定</el-button>
    </template>
  </el-dialog>

  <!-- 分享记录弹窗 -->
  <el-dialog
    v-model="sharedRecordsDialogVisible"
    title="分享记录"
    width="560px"
    destroy-on-close
  >
    <el-table :data="sharedRecordsList" size="small" v-loading="sharedRecordsLoading">
      <el-table-column prop="name" label="名称" />
      <el-table-column prop="shareType" label="类型" width="80">
        <template #default="{ row }">
          <el-tag :type="row.shareType === 'shared' ? 'warning' : 'success'" size="small">
            {{ row.shareType === 'shared' ? '共享' : '副本' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="userName" label="用户" width="120" />
      <el-table-column prop="createTime" label="时间" width="160" />
    </el-table>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, reactive, ref, watchEffect } from "vue";
import { ElMessage, ElMessageBox, type FormInstance } from "element-plus";
import { DArrowLeft, DArrowRight, Delete, Document, Plus, Refresh, Search, StarFilled } from "@element-plus/icons-vue";
import { useLocalStorage, useWindowSize } from "@vueuse/core";
import ContentWrap from "@/components/ContentWrap/src/ContentWrap.vue";
import ListPageLayout from "@/components/ListPageLayout/index.vue";
import FolderTree from "@/components/material/FolderTree.vue";
import TableRowDragHandle from "@/components/TableRowDragHandle/index.vue";
import Pagination from "@/components/Pagination/index.vue";
import { buildOperationColumn, buildTimeColumn, commonGridOptions } from "@/common/table";
import { useFolderRowDrag } from "@/hooks/useFolderRowDrag";
import { useUserStore } from "@/store/modules/user";
import { getUserList } from "@/api/user";
import {
  batchMoveAiSkill,
  copyAiSkillToUser,
  createAiSkill,
  deleteAiSkill,
  getAiSkillPage,
  getAiSkillSharedRecords,
  moveAiSkillToUser,
  shareAiSkillToUser,
  updateAiSkill,
  type AiSkill,
  type AiSkillTarget,
} from "@/api/ai-skill";
import { ResourceLibraryApi } from "@/api/resource-library";

const FOLDER_CATEGORY = "skill";

const targetOptions: { label: string; value: AiSkillTarget }[] = [
  { label: "设计工具 Agent", value: "design-agent" },
  { label: "Admin Agent", value: "admin-agent" },
  { label: "浏览器自动化", value: "browser-use" },
];
const targetLabel = (target: AiSkillTarget) =>
  targetOptions.find((o) => o.value === target)?.label ?? target;

const userStore = useUserStore();
const isAdmin = computed(() => userStore.user?.isAdmin === true);
const loading = ref(false);
const saving = ref(false);
const rows = ref<AiSkill[]>([]);
const selectedIds = ref<string[]>([]);
const total = ref(0);
const dialogVisible = ref(false);
const formRef = ref<FormInstance>();
const triggerText = ref("");
const activePath = ref("SKILL.md");

// ── 文件夹折叠 ──
const folderTreeCollapsed = useLocalStorage("ai_skill_folder_collapsed", false);

// ── 拖拽到文件夹 ──
const {
  dragState,
  setupRowDrag,
  handleFolderDragOver,
  handleFolderDragLeave,
  resetAfterDrop,
  markExternalFolderDropHandled,
} = useFolderRowDrag({
  gridClass: "skills-dnd-grid",
  dataSource: rows,
  selectedIds,
  onDropToFolder: handleFolderDrop,
});

const query = reactive<{
  currentPage: number;
  pageSize: number;
  keyword: string;
  target: AiSkillTarget | "";
  enabled: boolean | "";
  folderId: string | null;
}>({
  currentPage: 1,
  pageSize: 20,
  keyword: "",
  target: "",
  enabled: "",
  folderId: null,
});

const selectedFolderId = ref<string | null>(null);

// ── 分享/转移状态 ──
const transferDialogVisible = ref(false);
const transferAction = ref<"share" | "move">("share");
const transferIds = ref<string[]>([]);
const transferTargetUserId = ref<number | null>(null);
const transferLoading = ref(false);
const userList = ref<any[]>([]);
const userListLoading = ref(false);

const transferDialogTitle = computed(() => {
  if (transferAction.value === "share") return "分享 Skill 给用户";
  return "转移 Skill 给用户";
});

// ── 分享记录状态 ──
const sharedRecordsDialogVisible = ref(false);
const sharedRecordsList = ref<any[]>([]);
const sharedRecordsLoading = ref(false);

const createEmptySkill = (): AiSkill => ({
  name: "",
  description: "",
  targets: ["design-agent", "admin-agent"],
  triggers: [],
  content: {
    entry: "SKILL.md",
    files: {
      "SKILL.md":
        "# Skill\n\n说明这个 Skill 的目标、适用条件和执行步骤。\n\n需要引用其他文件时，请在这里写出对应路径。",
    },
  },
  enabled: true,
  isPublic: false,
  folderId: null,
});

const form = reactive<AiSkill>(createEmptySkill());
const filePaths = computed(() => Object.keys(form.content.files));
const canSetPublic = computed(() => isAdmin.value && (form.permission?.canSetPublic ?? true));
const rules = {
  name: [{ required: true, message: "请输入 Skill 名称", trigger: "blur" }],
  targets: [
    {
      type: "array",
      required: true,
      min: 1,
      message: "至少选择一个 Agent",
      trigger: "change",
    },
  ],
};

const { height } = useWindowSize();

const gridOptions = ref({
  ...commonGridOptions,
  maxHeight: Math.max(height.value - 280, 360),
  rowConfig: { keyField: "id" },
  checkboxConfig: {
    reserve: true,
    checkMethod: ({ row }: { row: AiSkill }) => row.permission?.canDelete !== false,
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
    { type: "checkbox", width: 42 },
    {
      title: "Skill",
      field: "name",
      minWidth: 240,
      slots: { default: "nameDefaultSlot" },
    },
    {
      title: "适用 Agent",
      field: "targets",
      minWidth: 180,
      slots: { default: "targetsDefaultSlot" },
    },
    {
      title: "触发词",
      field: "triggers",
      minWidth: 180,
      slots: { default: "triggersDefaultSlot" },
    },
    {
      title: "来源",
      field: "shareType",
      width: 160,
      slots: { default: "shareTypeDefaultSlot" },
    },
    {
      title: "权限",
      field: "isPublic",
      width: 88,
      slots: { default: "permissionDefaultSlot" },
    },
    {
      title: "状态",
      field: "enabled",
      width: 82,
      slots: { default: "enabledDefaultSlot" },
    },
    buildTimeColumn("更新时间", "updateTime"),
    buildOperationColumn("operationDefaultSlot", 120),
  ],
});

watchEffect(() => {
  gridOptions.value.maxHeight = Math.max(height.value - 280, 360);
});

async function load() {
  loading.value = true;
  try {
    const params: Record<string, any> = {
      currentPage: query.currentPage,
      pageSize: query.pageSize,
      keyword: query.keyword || undefined,
      target: query.target || undefined,
      folderId: query.folderId ?? undefined,
    };
    if (query.enabled !== "") params.enabled = query.enabled;
    const result = await getAiSkillPage(params);
    rows.value = result?.list || [];
    total.value = result?.total || 0;
    selectedIds.value = [];
    nextTick(setupRowDrag);
  } catch {
    ElMessage.error("Skills 加载失败");
  } finally {
    loading.value = false;
  }
}

function search() {
  query.currentPage = 1;
  void load();
}

function resetSearch() {
  query.keyword = "";
  query.target = "";
  query.enabled = "";
  search();
}

function handleFolderChange(payload: { folderId: string | null }) {
  if (payload.folderId === "all") {
    query.folderId = null;
  } else if (payload.folderId === null) {
    query.folderId = "__NOT_GROUP__";
  } else {
    query.folderId = payload.folderId;
  }
  query.currentPage = 1;
  void load();
}

function openCreate() {
  const newSkill = createEmptySkill();
  if (query.folderId && query.folderId !== "__NOT_GROUP__" && query.folderId !== "__ALL__") {
    newSkill.folderId = query.folderId;
  }
  resetForm(newSkill);
  triggerText.value = "";
  activePath.value = "SKILL.md";
  dialogVisible.value = true;
}

function openEdit(row: AiSkill) {
  const content = row.content || { entry: "SKILL.md", files: { "SKILL.md": "" } };
  resetForm({
    ...row,
    targets: [...(row.targets || [])],
    triggers: [...(row.triggers || [])],
    content: {
      entry: content.entry,
      files: { ...content.files },
    },
    permission: row.permission ? { ...row.permission } : undefined,
  });
  triggerText.value = form.triggers.join("，");
  activePath.value = form.content.entry;
  dialogVisible.value = true;
}

function resetForm(value: AiSkill) {
  for (const key of Object.keys(form)) {
    delete (form as any)[key];
  }
  Object.assign(form, value);
}

async function addFile() {
  try {
    const result = await ElMessageBox.prompt(
      "请输入相对路径，例如 references/print-spec.md",
      "添加虚拟文件",
      {
        inputPlaceholder: "references/example.md",
        inputValidator: (value) => {
          const path = String(value || "")
            .trim()
            .replace(/\\/g, "/");
          if (
            !path ||
            path.startsWith("/") ||
            path.split("/").some((part) => !part || part === "." || part === "..")
          ) {
            return "请输入安全的相对路径";
          }
          if (path in form.content.files) return "该文件已存在";
          return true;
        },
      },
    );
    const path = result.value.trim().replace(/\\/g, "/");
    form.content.files[path] = "";
    activePath.value = path;
  } catch {
    // 用户取消
  }
}

function setEntry() {
  if (activePath.value) form.content.entry = activePath.value;
}

async function removeActiveFile() {
  if (!activePath.value || filePaths.value.length <= 1) return;
  try {
    await ElMessageBox.confirm("确认删除文件 " + activePath.value + "？", "删除文件", {
      type: "warning",
    });
  } catch {
    return;
  }
  const path = activePath.value;
  delete form.content.files[path];
  const next = Object.keys(form.content.files)[0];
  if (form.content.entry === path) form.content.entry = next;
  activePath.value = next;
}

async function save() {
  await formRef.value?.validate();
  if (!filePaths.value.length || !(form.content.entry in form.content.files)) {
    ElMessage.error("请保留一个有效的入口文件");
    return;
  }
  form.triggers = [
    ...new Set(
      triggerText.value
        .split(/[,，;；\n]+/)
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  ];
  saving.value = true;
  try {
    const payload: AiSkill = {
      id: form.id,
      name: form.name.trim(),
      description: form.description?.trim() || "",
      targets: [...form.targets],
      triggers: [...form.triggers],
      content: {
        entry: form.content.entry,
        files: { ...form.content.files },
      },
      enabled: form.enabled,
      isPublic: canSetPublic.value ? form.isPublic : false,
      folderId: form.folderId || null,
    };
    if (form.id) {
      await updateAiSkill(payload);
      ElMessage.success("Skill 已更新");
    } else {
      await createAiSkill(payload);
      ElMessage.success("Skill 已创建");
    }
    dialogVisible.value = false;
    await load();
  } catch {
    ElMessage.error("Skill 保存失败");
  } finally {
    saving.value = false;
  }
}

async function removeSkills(ids: string[]) {
  if (!ids.length) return;
  try {
    await ElMessageBox.confirm("确认删除选中的 " + ids.length + " 个 Skill？", "删除 Skills", {
      type: "warning",
    });
  } catch {
    return;
  }
  try {
    await deleteAiSkill(ids);
    ElMessage.success("删除成功");
    await load();
  } catch {
    ElMessage.error("删除失败");
  }
}

function syncSelectedRows(records: AiSkill[]) {
  selectedIds.value = records
    .filter((item) => item.permission?.canDelete !== false)
    .map((item) => item.id!)
    .filter(Boolean);
}

function checkboxChange({ records }: { records: AiSkill[] }) {
  syncSelectedRows(records);
}

function checkboxAllChange({ records }: { records: AiSkill[] }) {
  syncSelectedRows(records);
}

// ── 分享/转移/发布操作 ──

async function handleBatchPublishToLibrary() {
  if (!selectedIds.value.length) return;
  try {
    await ElMessageBox.confirm(`确定将选中的 ${selectedIds.value.length} 个技能发布到公共资源广场吗？`, '发布到库', {
      confirmButtonText: '确定发布',
      cancelButtonText: '取消',
      type: 'info',
    });
    await ResourceLibraryApi.batchPublish({
      resourceType: 'ai_skill',
      ids: [...selectedIds.value],
    });
    ElMessage.success('已成功发布到公共 AI 技能库');
  } catch {
    // cancel
  }
}

function handleBatchShareCommand(command: string) {
  if (!selectedIds.value.length) return;
  if (command === "view-shared") return;
  openTransferDialog(command as "share" | "copy" | "move", [...selectedIds.value]);
}

function handleRowCommand(command: string, row: AiSkill) {
  if (command === "edit") {
    openEdit(row);
  } else if (command === "delete") {
    removeSkills(row.id ? [row.id] : []);
  } else if (command === "view-shared") {
    openSharedRecordsDialog(row);
  } else if (command === "share-to-user") {
    openTransferDialog("share", [row.id!]);
  } else if (command === "move-to-user") {
    openTransferDialog("move", [row.id!]);
  }
}

function openTransferDialog(action: "share" | "move", ids: string[]) {
  transferAction.value = action;
  transferIds.value = ids;
  transferTargetUserId.value = null;
  transferDialogVisible.value = true;
}

async function loadUserList() {
  if (userList.value.length) return;
  userListLoading.value = true;
  try {
    const res = await getUserList({ currentPage: 1, pageSize: 200 });
    userList.value = res?.list || [];
  } catch {
    // ignore
  } finally {
    userListLoading.value = false;
  }
}

async function submitTransfer() {
  if (!transferTargetUserId.value) {
    ElMessage.warning("请选择目标用户");
    return;
  }
  transferLoading.value = true;
  try {
    const payload = { ids: transferIds.value, targetUserId: transferTargetUserId.value };
    if (transferAction.value === "share") {
      await shareAiSkillToUser(payload);
      ElMessage.success("分享成功");
    } else {
      await moveAiSkillToUser(payload);
      ElMessage.success("转移成功");
    }
    transferDialogVisible.value = false;
    await load();
  } catch {
    ElMessage.error("操作失败");
  } finally {
    transferLoading.value = false;
  }
}

async function openSharedRecordsDialog(row: AiSkill) {
  sharedRecordsDialogVisible.value = true;
  sharedRecordsLoading.value = true;
  sharedRecordsList.value = [];
  try {
    const res = await getAiSkillSharedRecords(row.id!);
    sharedRecordsList.value = res?.list || [];
  } catch {
    ElMessage.error("加载分享记录失败");
  } finally {
    sharedRecordsLoading.value = false;
  }
}

async function handleFolderDrop(payload: { data: any }) {
  markExternalFolderDropHandled();
  if (!dragState.draggingIds.length) return;
  if (payload.data.id === "__ALL__") return;

  const targetFolderId =
    payload.data.id === "__NOT_GROUP__" ? null : payload.data.id;
  const targetPath = payload.data.path || "";
  const movingIds = [...dragState.draggingIds];

  try {
    await batchMoveAiSkill({ ids: movingIds, folderId: targetFolderId });
    ElMessage.success(`已移动 ${movingIds.length} 个 Skill 到 ${targetPath || "未分组"}`);
    await load();
    selectedIds.value = [];
  } catch (error: any) {
    ElMessage.error(error?.message || "移动失败");
  } finally {
    resetAfterDrop();
  }
}

onMounted(load);

onUnmounted(() => {
  // Sortable cleanup handled by useFolderRowDrag
});
</script>

<style scoped>


@media (width <= 900px) {
  .skill-editor-meta {
    grid-template-columns: 1fr 1fr;
  }

  .skill-editor-meta__wide {
    grid-column: span 2;
  }
}

@media (width <= 640px) {
  :global(.skill-editor-dialog .el-dialog__body) {
    overflow: auto;
  }

  .skill-editor-form {
    height: auto;
    min-height: 100%;
  }

  .skill-editor-meta,
  .file-editor {
    grid-template-columns: 1fr;
  }

  .skill-editor-meta__wide {
    grid-column: auto;
  }

  .file-list {
    max-height: 180px;
    border-right: 0;
    border-bottom: 1px solid var(--el-border-color);
  }

  .file-textarea :deep(.el-textarea__inner) {
    min-height: 420px !important;
  }
}

.skills-page {
  gap: 10px;
  padding: 8px 0 0;

  :deep(.list-page-layout__main) {
    gap: 10px;
  }

  :deep(.list-page-filter--flat) {
    gap: 10px;
    padding-bottom: 10px;
  }

  :deep(.list-page-table-panel__pagination--flat) {
    padding-top: 10px;
  }
}

.permission-controls,
.file-content__header > div {
  display: flex;
  align-items: center;
  gap: 8px;
}

.skill-name {
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.skill-description {
  max-width: 420px;
  margin-top: 4px;
  overflow: hidden;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tag-gap {
  margin: 2px 4px 2px 0;
}

.muted {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

/* ── 拖拽样式 ── */
:deep(.template-drag-ghost) {
  opacity: 0.4;
}

:deep(.template-drag-chosen) {
  background: var(--el-color-primary-light-9) !important;
}

.skill-editor-form {
  display: flex;
  height: 100%;
  min-height: 0;
  flex-direction: column;
}

.skill-editor-meta {
  display: grid;
  padding: 8px 16px 4px;
  border-bottom: 1px solid var(--el-border-color-lighter);
  gap: 0 12px;
  grid-template-columns: 1fr 1fr 1fr;
}

.skill-editor-meta :deep(.el-form-item) {
  margin-bottom: 6px;
}

.skill-editor-meta :deep(.el-form-item__label) {
  padding-bottom: 1px;
  font-size: 12px;
  line-height: 20px;
}

.skill-editor-meta :deep(.el-input__wrapper),
.skill-editor-meta :deep(.el-textarea__inner) {
  --el-input-height: 28px;
}

.skill-editor-meta__wide {
  grid-column: span 3;
}

.file-editor {
  display: grid;
  min-height: 0;
  flex: 1;
  overflow: hidden;
  grid-template-columns: 260px minmax(0, 1fr);
}

.file-list {
  overflow: auto;
  background: var(--el-fill-color-extra-light);
  border-right: 1px solid var(--el-border-color);
}

.file-list__header,
.file-content__header {
  display: flex;
  height: 48px;
  padding: 0 12px;
  font-weight: 600;
  line-height: 1;
  border-bottom: 1px solid var(--el-border-color);
  box-sizing: border-box;
  align-items: center;
  justify-content: space-between;
}

.file-list__header span {
  line-height: 48px;
}

.file-list__header .el-button {
  margin: 0;
}

.file-row {
  display: flex;
  width: 100%;
  min-height: 42px;
  padding: 8px 10px;
  font: inherit;
  color: var(--el-text-color-regular);
  text-align: left;
  cursor: pointer;
  background: transparent;
  border: 0;
  border-bottom: 1px solid var(--el-border-color-lighter);
  align-items: center;
  gap: 0;
}

.file-row:hover,
.file-row.is-active {
  color: var(--el-color-primary);
  background: var(--el-color-primary-light-9);
}

.file-row__path {
  min-width: 0;
  padding: 0 6px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}

.entry-icon {
  color: var(--el-color-warning);
}

.file-content {
  display: flex;
  min-width: 0;
  flex-direction: column;
}

.file-content__header > span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-textarea {
  flex: 1;
}

.file-textarea :deep(.el-textarea__inner) {
  height: 100%;
  min-height: 100% !important;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  line-height: 1.65;
  border: 0;
  border-radius: 0;
  box-shadow: none;
}

:global(.skill-editor-dialog) {
  display: flex;
  flex-direction: column;
  background: var(--el-bg-color);
}

:global(.skill-editor-dialog .el-dialog__header) {
  padding: 14px 20px;
  margin: 0;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

:global(.skill-editor-dialog .el-dialog__title) {
  font-size: 16px;
  font-weight: 600;
}

:global(.skill-editor-dialog .el-dialog__body) {
  min-height: 0;
  padding: 0;
  overflow: hidden;
  flex: 1;
}

:global(.skill-editor-dialog .el-dialog__footer) {
  padding: 10px 20px;
  border-top: 1px solid var(--el-border-color-lighter);
}
</style>
