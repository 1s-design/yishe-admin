<template>
  <ContentWrap :plain="true">
    <ListPageLayout class="remotion-skill-page">
      <template #filter>
        <div class="list-page-filter list-page-filter--flat">
          <el-form :model="queryParams" label-position="top" class="list-page-search-form">
            <el-row :gutter="12" class="list-page-search-form__row">
              <el-col
                class="list-page-search-form__col--wide"
                :xs="24"
                :sm="12"
                :md="8"
                :lg="6"
                :xl="5"
              >
                <el-form-item label="关键词">
                  <el-input
                    v-model="queryParams.search"
                    size="small"
                    placeholder="请输入技能名称或标识码"
                    clearable
                    @keyup.enter="loadSkills"
                    @change="(val) => { if (!val) loadSkills(); }"
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
                <el-form-item label="所属分类">
                  <el-select
                    v-model="queryParams.category"
                    size="small"
                    clearable
                    placeholder="全部分类"
                    @change="loadSkills"
                  >
                    <el-option label="全部" value="all" />
                    <el-option label="动效规范" value="motion" />
                    <el-option label="文案字幕" value="caption" />
                    <el-option label="音频媒体" value="audio" />
                    <el-option label="电商营销" value="marketing" />
                    <el-option label="电影调性" value="cinematic" />
                    <el-option label="自定义" value="custom" />
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
                <el-form-item label="状态">
                  <el-select
                    v-model="queryParams.status"
                    size="small"
                    clearable
                    placeholder="全部状态"
                    @change="loadSkills"
                  >
                    <el-option label="全部" value="all" />
                    <el-option label="启用" value="active" />
                    <el-option label="停用" value="inactive" />
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
                @click="loadSkills"
              >
                搜索
              </el-button>
              <el-button size="small" type="primary" :icon="Plus" @click="openCreateDialog">
                新增技能
              </el-button>
              <el-button size="small" type="success" plain :icon="Upload" @click="openImportDialog">
                导入 SKILL.md
              </el-button>
              <el-button size="small" @click="router.push('/content/remotion-video-record')">
                返回视频模板
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
                :max-height="tableMaxHeight"
                :data="filteredSkills"
                :loading="loading"
              >
                <template #nameSlot="{ row }">
                  <div class="flex items-center gap-1.5">
                    <span class="font-medium text-[var(--el-text-color-primary)]">{{ row.name }}</span>
                    <el-tag v-if="row.isSystem" size="small" type="info">
                      系统
                    </el-tag>
                  </div>
                </template>

                <template #codeSlot="{ row }">
                  <span class="skill-code-tag">{{ row.code }}</span>
                </template>

                <template #categorySlot="{ row }">
                  <el-tag size="small" :type="getCategoryTagType(row.category)">
                    {{ getCategoryLabel(row.category) }}
                  </el-tag>
                </template>

                <template #ruleSlot="{ row }">
                  <el-button size="small" link type="primary" @click="openRulePreview(row)">
                    查看规则
                  </el-button>
                </template>

                <template #statusSlot="{ row }">
                  <el-switch
                    v-model="row.isActive"
                    inline-prompt
                    active-text="开"
                    inactive-text="关"
                    @change="handleToggleActive(row)"
                  />
                </template>

                <template #timeSlot="{ row }">
                  <span class="text-xs text-[var(--el-text-color-secondary)]">
                    {{ formatDate(row.updateTime) }}
                  </span>
                </template>

                <template #operationSlot="{ row }">
                  <div class="flex items-center gap-2">
                    <el-button size="small" link type="primary" @click="openEditDialog(row)">
                      编辑
                    </el-button>
                    <el-popconfirm
                      v-if="!row.isSystem"
                      title="确认删除该技能？"
                      @confirm="handleDelete(row)"
                    >
                      <template #reference>
                        <el-button size="small" link type="danger">
                          删除
                        </el-button>
                      </template>
                    </el-popconfirm>
                  </div>
                </template>
              </vxe-grid>
            </div>
          </div>
        </div>
      </template>
    </ListPageLayout>

    <!-- 新建 / 编辑技能对话框 -->
    <el-dialog
      v-model="editDialogVisible"
      :title="editForm.id ? '编辑技能' : '新增技能'"
      width="640px"
      :append-to-body="true"
      destroy-on-close
    >
      <el-form label-position="top" size="small">
        <el-row :gutter="16">
          <el-col :span="14">
            <el-form-item label="技能名称" required>
              <el-input v-model="editForm.name" placeholder="请输入技能名称，如：极速爆品卡点" maxlength="50" />
            </el-form-item>
          </el-col>
          <el-col :span="10">
            <el-form-item label="所属分类">
              <el-select v-model="editForm.category" style="width: 100%;">
                <el-option label="动效规范" value="motion" />
                <el-option label="文案字幕" value="caption" />
                <el-option label="音频媒体" value="audio" />
                <el-option label="电商营销" value="marketing" />
                <el-option label="电影调性" value="cinematic" />
                <el-option label="自定义" value="custom" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="16">
          <el-col :span="16">
            <el-form-item label="技能标识码 (Code)">
              <el-input
                v-model="editForm.code"
                placeholder="留空自动生成，如 ecom-fast"
                :disabled="Boolean(editForm.id && editForm.isSystem)"
              />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="排序权重">
              <el-input-number v-model="editForm.sortOrder" :min="0" :max="999" style="width: 100%;" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="说明描述">
          <el-input
            v-model="editForm.description"
            type="textarea"
            :rows="2"
            placeholder="描述此技能的核心编导规则与适用场景"
            maxlength="200"
            show-word-limit
          />
        </el-form-item>

        <el-form-item label="编导规则内容 (Prompt Markdown)" required>
          <el-input
            v-model="editForm.promptContent"
            type="textarea"
            :rows="8"
            placeholder="编写具体的规则约束提示词..."
          />
        </el-form-item>

        <el-form-item label="默认参数 (JSON)">
          <el-input
            v-model="editForm.defaultParamsJson"
            type="textarea"
            :rows="2"
            placeholder='可选配置默认参数，例如：{ "fps": 30 }'
          />
        </el-form-item>

        <el-form-item label="是否启用">
          <el-switch v-model="editForm.isActive" inline-prompt active-text="开" inactive-text="关" />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button size="small" @click="editDialogVisible = false">取消</el-button>
        <el-button size="small" type="primary" :loading="editLoading" @click="handleSave">
          保存
        </el-button>
      </template>
    </el-dialog>

    <!-- 导入 SKILL.md 对话框 -->
    <el-dialog
      v-model="importDialogVisible"
      title="导入 SKILL.md"
      width="640px"
      :append-to-body="true"
      destroy-on-close
    >
      <div class="mb-3 text-xs text-[var(--el-text-color-secondary)]">
        支持粘贴带有 YAML Frontmatter 标头的 Remotion 官方或社区 SKILL.md 文档内容，系统将自动解析元数据入库。
      </div>
      <el-input
        v-model="importMarkdownText"
        type="textarea"
        :rows="12"
        placeholder="---&#10;name: remotion-motion&#10;title: 弹簧动效规范&#10;category: motion&#10;description: 描述内容...&#10;---&#10;&#10;## 规则详情&#10;..."
      />
      <template #footer>
        <el-button size="small" @click="importDialogVisible = false">取消</el-button>
        <el-button
          size="small"
          type="primary"
          :loading="importLoading"
          :disabled="!importMarkdownText.trim()"
          @click="handleImport"
        >
          导入
        </el-button>
      </template>
    </el-dialog>

    <!-- 规则预览对话框 -->
    <el-dialog
      v-model="previewDialogVisible"
      :title="`规则内容 - ${previewSkill?.name || ''}`"
      width="640px"
      :append-to-body="true"
    >
      <div class="rule-preview-container">
        <pre class="rule-preview-code">{{ previewSkill?.promptContent || '暂无内容' }}</pre>
      </div>
      <template #footer>
        <el-button size="small" @click="previewDialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </ContentWrap>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { Search, Plus, Upload } from '@element-plus/icons-vue';
import ContentWrap from '@/components/ContentWrap/src/ContentWrap.vue';
import ListPageLayout from '@/components/ListPageLayout/index.vue';
import {
  buildOperationColumn,
  commonGridOptions,
  useTableMaxHeight,
} from '@/common/table';
import {
  getRemotionSkillList,
  createRemotionSkill,
  updateRemotionSkill,
  deleteRemotionSkill,
  toggleRemotionSkill,
  importRemotionSkillMarkdown,
  type RemotionSkillItem,
} from '@/api/remotion-skill';

const router = useRouter();
const loading = ref(false);
const skillsList = ref<RemotionSkillItem[]>([]);

const tableMaxHeight = useTableMaxHeight(240, 360);

const queryParams = reactive({
  search: '',
  category: 'all',
  status: 'all',
});

const gridOptions = computed(() => ({
  ...commonGridOptions,
  rowConfig: { keyField: 'id' },
  columns: [
    { title: '技能名称', field: 'name', minWidth: 170, slots: { default: 'nameSlot' } },
    { title: '标识码 (Code)', field: 'code', minWidth: 170, slots: { default: 'codeSlot' } },
    { title: '分类', field: 'category', width: 110, slots: { default: 'categorySlot' } },
    { title: '说明描述', field: 'description', minWidth: 240, showOverflow: true },
    { title: '规则内容', width: 95, align: 'center', slots: { default: 'ruleSlot' } },
    { title: '排序', field: 'sortOrder', width: 75, align: 'center' },
    { title: '生效状态', field: 'isActive', width: 95, align: 'center', slots: { default: 'statusSlot' } },
    { title: '更新时间', field: 'updateTime', width: 150, align: 'center', slots: { default: 'timeSlot' } },
    buildOperationColumn('operationSlot', 120),
  ],
}));

// 编辑状态
const editDialogVisible = ref(false);
const editLoading = ref(false);
const editForm = ref<{
  id?: string;
  code?: string;
  name: string;
  category: string;
  description: string;
  promptContent: string;
  defaultParamsJson: string;
  isSystem?: boolean;
  isActive: boolean;
  sortOrder: number;
}>({
  name: '',
  category: 'custom',
  description: '',
  promptContent: '',
  defaultParamsJson: '',
  isActive: true,
  sortOrder: 0,
});

// 导入状态
const importDialogVisible = ref(false);
const importLoading = ref(false);
const importMarkdownText = ref('');

// 预览状态
const previewDialogVisible = ref(false);
const previewSkill = ref<RemotionSkillItem | null>(null);

function getCategoryLabel(cat: string) {
  const map: Record<string, string> = {
    motion: '动效规范',
    caption: '文案字幕',
    audio: '音频媒体',
    marketing: '电商营销',
    cinematic: '电影调性',
    custom: '自定义',
  };
  return map[cat] || cat || '通用';
}

function getCategoryTagType(cat: string) {
  const map: Record<string, string> = {
    motion: 'primary',
    caption: 'success',
    audio: 'warning',
    marketing: 'danger',
    cinematic: 'info',
    custom: 'info',
  };
  return map[cat] || 'info';
}

function formatDate(dateStr: string) {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  } catch {
    return dateStr;
  }
}

const filteredSkills = computed(() => {
  let list = skillsList.value;
  if (queryParams.category && queryParams.category !== 'all') {
    list = list.filter((s) => s.category === queryParams.category);
  }
  if (queryParams.status === 'active') {
    list = list.filter((s) => s.isActive);
  } else if (queryParams.status === 'inactive') {
    list = list.filter((s) => !s.isActive);
  }
  if (queryParams.search.trim()) {
    const q = queryParams.search.trim().toLowerCase();
    list = list.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.code.toLowerCase().includes(q) ||
        (s.description && s.description.toLowerCase().includes(q)),
    );
  }
  return list;
});

async function loadSkills() {
  loading.value = true;
  try {
    const res = await getRemotionSkillList();
    skillsList.value = res.data || [];
  } catch (err: any) {
    ElMessage.error(err?.message || '加载技能列表失败');
  } finally {
    loading.value = false;
  }
}

async function handleToggleActive(row: RemotionSkillItem) {
  try {
    await toggleRemotionSkill(row.id, row.isActive);
    ElMessage.success(`已${row.isActive ? '启用' : '停用'}技能：${row.name}`);
  } catch (err: any) {
    row.isActive = !row.isActive;
    ElMessage.error(err?.message || '更新状态失败');
  }
}

function openCreateDialog() {
  editForm.value = {
    name: '',
    code: '',
    category: 'custom',
    description: '',
    promptContent: '',
    defaultParamsJson: '',
    isActive: true,
    sortOrder: 0,
  };
  editDialogVisible.value = true;
}

function openEditDialog(row: RemotionSkillItem) {
  editForm.value = {
    id: row.id,
    name: row.name,
    code: row.code,
    category: row.category,
    description: row.description || '',
    promptContent: row.promptContent,
    defaultParamsJson:
      row.defaultParams && Object.keys(row.defaultParams).length > 0
        ? JSON.stringify(row.defaultParams, null, 2)
        : '',
    isSystem: row.isSystem,
    isActive: row.isActive,
    sortOrder: row.sortOrder || 0,
  };
  editDialogVisible.value = true;
}

function openRulePreview(row: RemotionSkillItem) {
  previewSkill.value = row;
  previewDialogVisible.value = true;
}

async function handleSave() {
  if (!editForm.value.name.trim()) {
    ElMessage.warning('请输入技能名称');
    return;
  }
  if (!editForm.value.promptContent.trim()) {
    ElMessage.warning('请输入编导规则内容');
    return;
  }

  let defaultParams: Record<string, any> | undefined = undefined;
  if (editForm.value.defaultParamsJson.trim()) {
    try {
      defaultParams = JSON.parse(editForm.value.defaultParamsJson.trim());
    } catch {
      ElMessage.warning('默认参数 JSON 格式不合法');
      return;
    }
  }

  editLoading.value = true;
  try {
    if (editForm.value.id) {
      await updateRemotionSkill(editForm.value.id, {
        name: editForm.value.name.trim(),
        code: editForm.value.code?.trim(),
        category: editForm.value.category,
        description: editForm.value.description.trim(),
        promptContent: editForm.value.promptContent,
        defaultParams,
        isActive: editForm.value.isActive,
        sortOrder: editForm.value.sortOrder,
      });
      ElMessage.success('更新技能成功');
    } else {
      await createRemotionSkill({
        name: editForm.value.name.trim(),
        code: editForm.value.code?.trim() || undefined,
        category: editForm.value.category,
        description: editForm.value.description.trim(),
        promptContent: editForm.value.promptContent,
        defaultParams,
        isActive: editForm.value.isActive,
        sortOrder: editForm.value.sortOrder,
      });
      ElMessage.success('创建技能成功');
    }
    editDialogVisible.value = false;
    await loadSkills();
  } catch (err: any) {
    ElMessage.error(err?.message || '保存技能失败');
  } finally {
    editLoading.value = false;
  }
}

async function handleDelete(row: RemotionSkillItem) {
  try {
    await deleteRemotionSkill(row.id);
    ElMessage.success(`已删除技能：${row.name}`);
    await loadSkills();
  } catch (err: any) {
    ElMessage.error(err?.message || '删除失败');
  }
}

function openImportDialog() {
  importMarkdownText.value = '';
  importDialogVisible.value = true;
}

async function handleImport() {
  if (!importMarkdownText.value.trim()) return;
  importLoading.value = true;
  try {
    await importRemotionSkillMarkdown(importMarkdownText.value.trim());
    ElMessage.success('导入技能成功');
    importDialogVisible.value = false;
    await loadSkills();
  } catch (err: any) {
    ElMessage.error(err?.message || '导入技能失败');
  } finally {
    importLoading.value = false;
  }
}

onMounted(() => {
  loadSkills();
});
</script>

<style scoped>
:deep(.remotion-skill-page) {
  gap: 10px;
  padding: 8px 0 0;
}

:deep(.remotion-skill-page .list-page-layout__main) {
  gap: 10px;
}

:deep(.remotion-skill-page .list-page-filter--flat) {
  gap: 10px;
  padding-bottom: 10px;
}

:deep(.remotion-skill-page .list-page-table-panel__body) {
  padding: 0;
}

.skill-code-tag {
  font-family: var(--el-font-family-monospace, monospace);
  font-size: 11px;
  padding: 1px 6px;
  border-radius: 4px;
  background: color-mix(in srgb, var(--el-color-primary) 10%, transparent);
  color: var(--el-color-primary);
  border: 1px solid color-mix(in srgb, var(--el-color-primary) 28%, transparent);
  display: inline-block;
  line-height: 18px;
}

:global(html.dark) .skill-code-tag {
  background: color-mix(in srgb, var(--el-color-primary) 18%, transparent);
  border-color: color-mix(in srgb, var(--el-color-primary) 38%, transparent);
  color: var(--el-color-primary-light-3, var(--el-color-primary));
}

.rule-preview-container {
  max-height: 480px;
  overflow-y: auto;
  background-color: var(--el-fill-color-lighter, #f8fafc);
  border: 1px solid var(--el-border-color-lighter, #e2e8f0);
  border-radius: 6px;
  padding: 14px;
}

:global(html.dark) .rule-preview-container {
  background-color: #181818;
  border-color: rgba(255, 255, 255, 0.08);
}

.rule-preview-code {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 12px;
  line-height: 1.6;
  color: var(--el-text-color-primary);
}
</style>
