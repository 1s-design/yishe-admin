<template>
  <ContentWrap :plain="true">
    <ListPageLayout class="roles-page">
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
                    placeholder="搜索名称 / 描述 / key"
                    @keyup.enter="search"
                  />
                </el-form-item>
              </el-col>
              <el-col :xs="24" :sm="12" :md="8" :lg="5" :xl="4">
                <el-form-item label="分类">
                  <el-select v-model="query.category" size="small" clearable placeholder="全部分类">
                    <el-option
                      v-for="opt in categoryOptions"
                      :key="opt.value"
                      :label="opt.label"
                      :value="opt.value"
                    />
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
              <el-button type="primary" :icon="Plus" @click="openCreate">新建角色</el-button>
            </div>
          </el-form>
        </div>
      </template>

      <template #table>
        <div class="common-table">
          <el-table
            v-loading="loading"
            :data="list"
            size="small"
            @selection-change="handleSelectionChange"
          >
                <el-table-column type="selection" width="42" />
                <el-table-column label="角色" min-width="200">
                  <template #default="{ row }">
                    <div class="role-name-cell">
                      <span class="role-name">{{ row.name }}</span>
                      <el-tag v-if="row.isPublic" size="small" type="success">公开</el-tag>
                    </div>
                    <div class="role-key">{{ row.key }}</div>
                  </template>
                </el-table-column>
                <el-table-column label="分类" width="110">
                  <template #default="{ row }">
                    {{ categoryLabel(row.category) }}
                  </template>
                </el-table-column>
                <el-table-column label="标签" min-width="160">
                  <template #default="{ row }">
                    <el-tag
                      v-for="tag in (row.tags || []).slice(0, 4)"
                      :key="tag"
                      size="small"
                      class="role-tag"
                    >
                      {{ tag }}
                    </el-tag>
                    <span v-if="(row.tags || []).length > 4" class="role-tag-more">
                      +{{ row.tags.length - 4 }}
                    </span>
                  </template>
                </el-table-column>
                <el-table-column label="描述" min-width="220" show-overflow-tooltip>
                  <template #default="{ row }">{{ row.description || "—" }}</template>
                </el-table-column>
                <el-table-column label="状态" width="80">
                  <template #default="{ row }">
                    <el-switch
                      :model-value="row.enabled"
                      size="small"
                      @change="(val: any) => toggleEnabled(row, val)"
                    />
                  </template>
                </el-table-column>
                <el-table-column label="更新时间" width="160">
                  <template #default="{ row }">{{ formatTime(row.updateTime) }}</template>
                </el-table-column>
                <el-table-column label="操作" width="80" fixed="right">
                  <template #default="{ row }">
                    <el-dropdown trigger="click" @command="(cmd: string) => handleRowCommand(cmd, row)">
                      <el-button link type="primary">操作</el-button>
                      <template #dropdown>
                        <el-dropdown-menu>
                          <el-dropdown-item command="preview">预览 Prompt</el-dropdown-item>
                          <el-dropdown-item command="edit">编辑</el-dropdown-item>
                          <el-dropdown-item command="copy">复制</el-dropdown-item>
                          <el-dropdown-item divided command="delete">
                            <span style="color: var(--el-color-danger)">删除</span>
                          </el-dropdown-item>
                        </el-dropdown-menu>
                      </template>
                    </el-dropdown>
                  </template>
                </el-table-column>
          </el-table>
        </div>
      </template>

      <template #pagination>
        <Pagination
          v-model:limit="query.pageSize"
          v-model:page="query.currentPage"
          :total="total"
          @pagination="getList"
        />
      </template>
    </ListPageLayout>
  </ContentWrap>

  <!-- ─── 新建 / 编辑弹窗 ─── -->
  <el-dialog
    v-model="formVisible"
    :title="isEdit ? `编辑角色：${form.name || ''}` : '新建角色'"
    width="780px"
    destroy-on-close
    :close-on-click-modal="false"
  >
    <el-tabs v-model="activeTab">
      <el-tab-pane label="基础" name="basic">
        <el-form :model="form" label-width="90px" label-position="right">
          <el-row :gutter="12">
            <el-col :span="12">
              <el-form-item label="角色名称" required>
                <el-input v-model="form.name" placeholder="如：生活方式博主" maxlength="160" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="角色 key" required>
                <el-input
                  v-model="form.key"
                  placeholder="如：lifestyle_blogger（字母/数字/_/-）"
                  maxlength="80"
                />
              </el-form-item>
            </el-col>
          </el-row>
          <el-form-item label="分类">
            <el-select v-model="form.category" style="width: 220px">
              <el-option
                v-for="opt in categoryOptions"
                :key="opt.value"
                :label="opt.label"
                :value="opt.value"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="描述">
            <el-input
              v-model="form.description"
              type="textarea"
              :rows="2"
              maxlength="2000"
              placeholder="角色描述（用于列表展示与自动匹配）"
            />
          </el-form-item>
          <el-form-item label="标签">
            <div class="tags-editor">
              <el-tag
                v-for="tag in form.tags"
                :key="tag"
                closable
                size="small"
                class="role-tag"
                @close="removeTag(tag)"
              >
                {{ tag }}
              </el-tag>
              <el-input
                v-if="tagInputVisible"
                ref="tagInputRef"
                v-model="tagInputValue"
                size="small"
                style="width: 120px"
                @keyup.enter="confirmTag"
                @blur="confirmTag"
              />
              <el-button v-else size="small" @click="showTagInput">+ 标签</el-button>
            </div>
          </el-form-item>
        </el-form>
      </el-tab-pane>

      <el-tab-pane label="身份" name="identity">
        <el-form label-width="90px" label-position="right">
          <el-form-item label="角色设定">
            <el-input
              v-model="form.identity.personaPrompt"
              type="textarea"
              :rows="5"
              maxlength="8000"
              placeholder="你是一位专注穿搭领域的博主，擅长把潮流趋势转化为接地气的种草笔记……（建议以「你是」开头）"
            />
          </el-form-item>
          <el-form-item label="专长领域">
            <el-select
              v-model="form.identity.expertise"
              multiple
              filterable
              allow-create
              default-first-option
              placeholder="输入后回车添加，如：穿搭、美妆"
              style="width: 100%"
            />
          </el-form-item>
          <el-form-item label="示例对话">
            <div class="dialogues-editor">
              <p class="dialogues-tip">
                few-shot 人格锚定：示例只示范语气与风格，注入 prompt 时最多取前 3 组
              </p>
              <div
                v-for="(dialogue, index) in form.identity.exampleDialogues"
                :key="index"
                class="dialogue-item"
              >
                <div class="dialogue-row">
                  <span class="dialogue-role dialogue-role--user">用户</span>
                  <el-input v-model="dialogue.user" size="small" placeholder="用户说……" />
                </div>
                <div class="dialogue-row">
                  <span class="dialogue-role dialogue-role--assistant">角色</span>
                  <el-input v-model="dialogue.assistant" size="small" placeholder="角色回答……" />
                </div>
                <el-button
                  link
                  type="danger"
                  size="small"
                  class="dialogue-remove"
                  @click="removeDialogue(index)"
                >
                  删除
                </el-button>
              </div>
              <el-button
                v-if="(form.identity.exampleDialogues?.length || 0) < 10"
                size="small"
                @click="addDialogue"
              >
                + 添加示例
              </el-button>
            </div>
          </el-form-item>
        </el-form>
      </el-tab-pane>

      <el-tab-pane label="风格" name="style">
        <el-form label-width="90px" label-position="right">
          <el-row :gutter="12">
            <el-col :span="12">
              <el-form-item label="语气">
                <el-select v-model="form.style.tone" clearable placeholder="不限制">
                  <el-option
                    v-for="opt in enumOptions.tone"
                    :key="opt.value"
                    :label="opt.label"
                    :value="opt.value"
                  />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="篇幅">
                <el-select v-model="form.style.verbosity" clearable placeholder="不限制">
                  <el-option
                    v-for="opt in enumOptions.verbosity"
                    :key="opt.value"
                    :label="opt.label"
                    :value="opt.value"
                  />
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>
          <el-row :gutter="12">
            <el-col :span="12">
              <el-form-item label="Emoji">
                <el-select v-model="form.style.emoji" clearable placeholder="不限制">
                  <el-option
                    v-for="opt in enumOptions.emoji"
                    :key="opt.value"
                    :label="opt.label"
                    :value="opt.value"
                  />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="语言风格">
                <el-select v-model="form.style.languageStyle" clearable placeholder="不限制">
                  <el-option
                    v-for="opt in enumOptions.languageStyle"
                    :key="opt.value"
                    :label="opt.label"
                    :value="opt.value"
                  />
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>
          <el-row :gutter="12">
            <el-col :span="12">
              <el-form-item label="句式">
                <el-select v-model="form.style.sentenceLength" clearable placeholder="不限制">
                  <el-option
                    v-for="opt in enumOptions.sentenceLength"
                    :key="opt.value"
                    :label="opt.label"
                    :value="opt.value"
                  />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="结构">
                <el-select v-model="form.style.structure" clearable placeholder="不限制">
                  <el-option
                    v-for="opt in enumOptions.structure"
                    :key="opt.value"
                    :label="opt.label"
                    :value="opt.value"
                  />
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>
          <el-form-item label="结尾引导">
            <el-input
              v-model="form.style.cta"
              maxlength="500"
              placeholder="如：结尾引导互动：觉得有用记得点赞收藏～"
            />
          </el-form-item>
          <el-form-item label="自定义规则">
            <el-select
              v-model="form.style.customRules"
              multiple
              filterable
              allow-create
              default-first-option
              placeholder="输入规则后回车添加，如：每段结尾用反问句"
              style="width: 100%"
            />
          </el-form-item>
        </el-form>
      </el-tab-pane>

      <el-tab-pane label="偏好" name="advanced">
        <el-form label-width="90px" label-position="right">
          <el-form-item label="行为偏好">
            <el-select
              v-model="form.preferences"
              multiple
              filterable
              allow-create
              default-first-option
              placeholder="输入偏好后回车添加，如：先给结论，再给依据"
              style="width: 100%"
            />
          </el-form-item>
          <el-form-item label="排序">
            <el-input-number
              v-model="form.sortOrder"
              :min="0"
              controls-position="right"
              placeholder="越小越靠前"
            />
          </el-form-item>
        </el-form>
      </el-tab-pane>
    </el-tabs>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="formVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="save">保存</el-button>
      </div>
    </template>
  </el-dialog>

  <!-- ─── Prompt 预览弹窗 ─── -->
  <el-dialog v-model="previewVisible" title="角色 Prompt 预览" width="720px">
    <div v-if="previewRole" class="preview-header">
      <span class="preview-role-name">{{ previewRole.name }}</span>
      <span class="preview-role-key">{{ previewRole.key }}</span>
    </div>
    <pre class="preview-prompt">{{ previewPrompt || "（该角色未配置任何 prompt 内容）" }}</pre>
  </el-dialog>

</template>

<script setup lang="ts">
import { nextTick, onMounted, reactive, ref } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { Plus, Refresh, Search } from "@element-plus/icons-vue";
import ContentWrap from "@/components/ContentWrap/src/ContentWrap.vue";
import ListPageLayout from "@/components/ListPageLayout/index.vue";
import Pagination from "@/components/Pagination/index.vue";
import {
  createAiRole,
  deleteAiRole,
  getAiRolePage,
  previewAiRolePrompt,
  updateAiRole,
  type AiRole,
  type AiRoleExampleDialogue,
  type AiRoleIdentity,
  type AiRoleStyle,
} from "@/api/ai-role";

defineOptions({ name: "AiRoles" });

// ─── 列表 ───

const loading = ref(false);
const list = ref<AiRole[]>([]);
const total = ref(0);
const selectedIds = ref<string[]>([]);
const query = reactive({
  currentPage: 1,
  pageSize: 20,
  keyword: "",
  category: "",
  enabled: undefined as boolean | undefined,
});

const categoryOptions = [
  { value: "creative", label: "创作" },
  { value: "analysis", label: "分析" },
  { value: "service", label: "服务" },
  { value: "custom", label: "自定义" },
];

const categoryLabel = (value?: string) =>
  categoryOptions.find((opt) => opt.value === value)?.label ?? value ?? "—";

const formatTime = (time?: string) => {
  if (!time) return "—";
  return String(time).replace("T", " ").slice(0, 19);
};

const getList = async () => {
  loading.value = true;
  try {
    const result = await getAiRolePage({
      currentPage: query.currentPage,
      pageSize: query.pageSize,
      keyword: query.keyword || undefined,
      category: query.category || undefined,
      enabled: query.enabled,
    });
    list.value = result.list || [];
    total.value = result.total || 0;
  } finally {
    loading.value = false;
  }
};

const search = () => {
  query.currentPage = 1;
  getList();
};

const resetSearch = () => {
  query.keyword = "";
  query.category = "";
  query.enabled = undefined;
  search();
};

const handleSelectionChange = (rows: AiRole[]) => {
  selectedIds.value = rows.map((row) => row.id!).filter(Boolean);
};

const toggleEnabled = async (row: AiRole, enabled: boolean) => {
  await updateAiRole({ id: row.id!, enabled });
  row.enabled = enabled;
  ElMessage.success(enabled ? "已启用" : "已停用");
};

const handleRowCommand = (cmd: string, row: AiRole) => {
  if (cmd === "preview") openPreview(row);
  else if (cmd === "edit") openEdit(row);
  else if (cmd === "copy") handleCopy(row);
  else if (cmd === "delete") handleRemove(row);
};

// ─── 新建 / 编辑 ───

interface RoleFormData {
  id?: string;
  key: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  identity: Required<Pick<AiRoleIdentity, "personaPrompt" | "expertise" | "exampleDialogues">>;
  style: AiRoleStyle;
  preferences: string[];
  sortOrder: number;
}

const formVisible = ref(false);
const saving = ref(false);
const isEdit = ref(false);
const activeTab = ref("basic");

const buildForm = (role?: AiRole | null): RoleFormData => ({
  id: role?.id,
  key: role?.key ?? "",
  name: role?.name ?? "",
  description: role?.description ?? "",
  category: role?.category ?? "custom",
  tags: [...(role?.tags ?? [])],
  identity: {
    personaPrompt: role?.identity?.personaPrompt ?? "",
    expertise: [...(role?.identity?.expertise ?? [])],
    exampleDialogues: (role?.identity?.exampleDialogues ?? []).map((d) => ({ ...d })),
  },
  style: { ...(role?.style ?? {}) },
  preferences: [...(role?.preferences ?? [])],
  sortOrder: role?.sortOrder ?? 0,
});

const form = reactive<RoleFormData>(buildForm());

const enumOptions = {
  tone: [
    { value: "casual", label: "轻松随意" },
    { value: "professional", label: "专业严谨" },
    { value: "humorous", label: "幽默风趣" },
    { value: "sharp", label: "犀利直接" },
    { value: "warm", label: "温暖亲切" },
    { value: "cold", label: "冷静克制" },
  ],
  verbosity: [
    { value: "minimal", label: "极简（一两句）" },
    { value: "concise", label: "简洁（3-5 句）" },
    { value: "moderate", label: "适中" },
    { value: "detailed", label: "详尽" },
  ],
  emoji: [
    { value: "none", label: "不使用" },
    { value: "light", label: "少量点缀" },
    { value: "moderate", label: "适度" },
    { value: "heavy", label: "高频" },
  ],
  languageStyle: [
    { value: "colloquial", label: "口语化" },
    { value: "written", label: "书面" },
    { value: "mixed", label: "中英混排" },
    { value: "technical", label: "技术精确" },
  ],
  sentenceLength: [
    { value: "short", label: "短句为主" },
    { value: "medium", label: "长短结合" },
    { value: "long", label: "长句为主" },
  ],
  structure: [
    { value: "paragraph", label: "连续段落" },
    { value: "bullet", label: "要点列表" },
    { value: "numbered", label: "编号列表" },
    { value: "mixed", label: "混合" },
  ],
};

const openCreate = () => {
  isEdit.value = false;
  Object.assign(form, buildForm());
  activeTab.value = "basic";
  formVisible.value = true;
};

const openEdit = (row: AiRole) => {
  isEdit.value = true;
  Object.assign(form, buildForm(row));
  activeTab.value = "basic";
  formVisible.value = true;
};

const handleCopy = async (row: AiRole) => {
  const copyKey = `${row.key}_copy_${Date.now().toString(36)}`.slice(0, 80);
  await createAiRole({
    ...row,
    key: copyKey,
    name: `${row.name}（副本）`,
    isPublic: false,
  });
  ElMessage.success("已复制");
  getList();
};

const save = async () => {
  if (!form.name.trim()) {
    ElMessage.warning("角色名称不能为空");
    activeTab.value = "basic";
    return;
  }
  if (!form.key.trim()) {
    ElMessage.warning("角色 key 不能为空");
    activeTab.value = "basic";
    return;
  }
  saving.value = true;
  try {
    const payload: Partial<AiRole> & { id?: string } = {
      key: form.key.trim(),
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      category: form.category,
      tags: form.tags,
      identity: {
        personaPrompt: form.identity.personaPrompt.trim() || undefined,
        expertise: form.identity.expertise,
        exampleDialogues: form.identity.exampleDialogues.filter(
          (d) => d.user.trim() && d.assistant.trim(),
        ),
      },
      style: form.style,
      preferences: form.preferences,
      sortOrder: form.sortOrder,
    };
    if (isEdit.value) {
      await updateAiRole({ id: form.id!, ...payload });
      ElMessage.success("已更新");
    } else {
      await createAiRole(payload as AiRole);
      ElMessage.success("已创建");
    }
    formVisible.value = false;
    getList();
  } finally {
    saving.value = false;
  }
};

const handleRemove = async (row: AiRole) => {
  await ElMessageBox.confirm(`确定删除角色「${row.name}」？`, "删除确认", { type: "warning" });
  await deleteAiRole(row.id!);
  ElMessage.success("已删除");
  getList();
};

// ─── 标签编辑 ───

const tagInputVisible = ref(false);
const tagInputValue = ref("");
const tagInputRef = ref();

const showTagInput = () => {
  tagInputVisible.value = true;
  nextTick(() => tagInputRef.value?.focus());
};

const confirmTag = () => {
  const value = tagInputValue.value.trim();
  if (value && !form.tags.includes(value) && form.tags.length < 20) {
    form.tags.push(value);
  }
  tagInputVisible.value = false;
  tagInputValue.value = "";
};

const removeTag = (tag: string) => {
  form.tags = form.tags.filter((item) => item !== tag);
};

// ─── 示例对话编辑 ───

const addDialogue = () => {
  form.identity.exampleDialogues.push({ user: "", assistant: "" } as AiRoleExampleDialogue);
};

const removeDialogue = (index: number) => {
  form.identity.exampleDialogues.splice(index, 1);
};

// ─── Prompt 预览 ───

const previewVisible = ref(false);
const previewPrompt = ref("");
const previewRole = ref<AiRole | null>(null);

const openPreview = async (row: AiRole) => {
  previewRole.value = row;
  previewPrompt.value = "";
  previewVisible.value = true;
  const result = await previewAiRolePrompt({ idOrKey: row.id! });
  previewPrompt.value = result.prompt;
};

onMounted(() => {
  getList();
});
</script>

<style scoped>
/* 与 /ai/skills 页面保持一致的紧凑间距（覆盖 ListPageLayout 默认 padding 20px / gap 18px） */
.roles-page {
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

.role-name-cell {
  display: flex;
  align-items: center;
  gap: 6px;
}

.role-name {
  font-weight: 500;
}

.role-key {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  font-family: monospace;
}

.role-tag {
  margin-right: 4px;
}

.role-tag-more {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.tags-editor {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  width: 100%;
}

.dialogues-editor {
  width: 100%;
}

.dialogues-tip {
  margin: 0 0 8px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.dialogue-item {
  position: relative;
  padding: 10px;
  margin-bottom: 8px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 6px;
}

.dialogue-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.dialogue-role {
  flex-shrink: 0;
  width: 36px;
  font-size: 12px;
}

.dialogue-role--user {
  color: var(--el-color-primary);
}

.dialogue-role--assistant {
  color: var(--el-color-success);
}

.dialogue-remove {
  position: absolute;
  top: 6px;
  right: 8px;
}

.dialog-footer {
  text-align: right;
}

.preview-header {
  margin-bottom: 10px;
}

.preview-role-name {
  font-weight: 600;
  margin-right: 8px;
}

.preview-role-key {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  font-family: monospace;
}

.preview-prompt {
  max-height: 480px;
  padding: 12px;
  margin: 0;
  overflow: auto;
  font-size: 12px;
  line-height: 1.7;
  white-space: pre-wrap;
  word-break: break-word;
  background: var(--el-fill-color-light);
  border-radius: 6px;
}
</style>
