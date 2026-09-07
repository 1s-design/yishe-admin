<template>
  <ContentWrap :plain="true">
    <ListPageLayout class="design-inspiration-page">
      <template #filter>
        <div class="list-page-filter list-page-filter--flat">
          <el-form :model="queryParams" label-position="top" class="list-page-search-form">
            <el-row :gutter="12" class="list-page-search-form__row">
              <el-col class="list-page-search-form__col--wide" :xs="24" :sm="12" :md="10" :lg="8">
                <el-form-item label="关键词">
                  <el-input
                    v-model="queryParams.keyword"
                    size="small"
                    clearable
                    placeholder="搜索标题、内容、分类、关键词"
                    @keyup.enter="handleSearch"
                    @clear="handleSearch"
                  >
                    <template #prefix>
                      <el-icon><Search /></el-icon>
                    </template>
                  </el-input>
                </el-form-item>
              </el-col>
              <el-col class="list-page-search-form__col--narrow" :xs="24" :sm="12" :md="7" :lg="4">
                <el-form-item label="分类">
                  <el-input
                    v-model="queryParams.category"
                    size="small"
                    clearable
                    placeholder="全部"
                    @keyup.enter="handleSearch"
                    @clear="handleSearch"
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
                @click="handleSearch"
              >
                搜索
              </el-button>
              <el-button size="small" :disabled="loading" @click="handleReset">重置</el-button>
              <el-button size="small" type="primary" :icon="Plus" @click="handleAdd"
                >新增</el-button
              >
              <el-button
                size="small"
                type="danger"
                :icon="Delete"
                :loading="deleteLoading"
                @click="handleDelete(null)"
              >
                批量删除 ({{ ids.length }})
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
                :max-height="gridOptions.maxHeight"
                :data="dataSource"
                :loading="loading"
                @checkbox-change="checkboxChange"
                @checkbox-all="checkboxAllChange"
              >
                <template #titleSlot="{ row }">
                  <div class="design-inspiration-title">{{ row.title }}</div>
                </template>

                <template #contentSlot="{ row }">
                  <div class="design-inspiration-content">{{ row.content }}</div>
                </template>

                <template #keywordsSlot="{ row }">
                  <div v-if="row.keywords?.length" class="design-inspiration-tags">
                    <el-tag v-for="tag in row.keywords" :key="tag" size="small" type="info">
                      {{ tag }}
                    </el-tag>
                  </div>
                  <span v-else>-</span>
                </template>

                <template #promptHintsSlot="{ row }">
                  <div class="design-inspiration-content">{{ row.promptHints || "-" }}</div>
                </template>

                <template #operationDefaultSlot="{ row }">
                  <div class="flex justify-start">
                    <el-dropdown class="operation-dropdown" placement="bottom-end">
                      <el-button type="primary" link size="small" class="operation-trigger-button">
                        操作
                      </el-button>
                      <template #dropdown>
                        <el-dropdown-menu class="operation-menu-compact">
                          <el-dropdown-item @click="handleEdit(row)">编辑</el-dropdown-item>
                          <el-dropdown-item
                            divided
                            :disabled="loading || deleteLoading"
                            class="operation-menu-item--danger"
                            @click="handleDelete(row)"
                          >
                            删除
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
          <Pagination
            :total="total"
            v-model:page="queryParams.currentPage"
            v-model:limit="queryParams.pageSize"
            @pagination="getList"
          />
        </div>
      </template>
    </ListPageLayout>

    <el-dialog
      :title="dialogTitle"
      v-model="dialogVisible"
      width="720px"
      align-center
      class="design-inspiration-dialog"
      :class="{ 'is-mobile': isMobile }"
      :style="isMobile ? { width: 'calc(100vw - 16px)', margin: '8px auto' } : {}"
      :close-on-click-modal="!isMobile"
      @close="dialogClose"
    >
      <el-scrollbar :max-height="isMobile ? '55vh' : '60vh'" class="design-inspiration-dialog__scroll">
        <el-form ref="formRef" :model="form" :rules="rules" :label-width="isMobile ? undefined : '86px'" :label-position="isMobile ? 'top' : undefined">
          <el-form-item label="标题" prop="title">
            <el-input
              v-model="form.title"
              maxlength="200"
              show-word-limit
              placeholder="例如：太极 / LOL / 绝命毒师"
            />
          </el-form-item>
          <el-form-item label="分类" prop="category">
            <el-input v-model="form.category" maxlength="80" show-word-limit placeholder="可选" />
          </el-form-item>
          <el-form-item label="关键词">
            <el-input v-model="form.keywordsText" placeholder="多个关键词用逗号分隔" />
          </el-form-item>
          <el-form-item label="内容" prop="content">
            <el-input
              v-model="form.content"
              type="textarea"
              :rows="isMobile ? 4 : 6"
              maxlength="4000"
              show-word-limit
              placeholder="记录画面、情绪、元素、颜色或设计方向"
            />
          </el-form-item>
          <el-form-item label="自我认知片段">
            <el-input
              v-model="form.promptHints"
              type="textarea"
              :rows="isMobile ? 2 : 3"
              placeholder="后续可给 agent 使用的提示片段"
            />
          </el-form-item>
          <el-form-item label="避让事项">
            <el-input
              v-model="form.avoidNotes"
              type="textarea"
              :rows="isMobile ? 2 : 3"
              placeholder="例如：不要直接复刻 Logo，不要使用具体人物肖像"
            />
          </el-form-item>
        </el-form>
      </el-scrollbar>

      <template #footer>
        <div class="design-inspiration-dialog__footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" :loading="submitLoading" @click="submitForm">确定</el-button>
        </div>
      </template>
    </el-dialog>
  </ContentWrap>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watchEffect } from "vue";
import type { FormInstance, FormRules } from "element-plus";
import { ElMessage, ElMessageBox } from "element-plus";
import { Delete, Plus, Search } from "@element-plus/icons-vue";
import { useWindowSize } from "@vueuse/core";
import {
  createDesignInspiration,
  deleteDesignInspiration,
  getDesignInspirationPage,
  updateDesignInspiration,
  type DesignInspiration,
} from "@/api/design-inspiration";
import { buildOperationColumn, buildTimeColumn, commonGridOptions } from "@/common/table";
import ContentWrap from "@/components/ContentWrap/src/ContentWrap.vue";
import ListPageLayout from "@/components/ListPageLayout/index.vue";
import Pagination from "@/components/Pagination/index.vue";

const isMobile = computed(() => window.innerWidth < 768);

const queryParams = reactive({
  currentPage: 1,
  pageSize: 20,
  keyword: "",
  category: "",
});

const { height } = useWindowSize();
const gridOptions = ref<any>({
  ...commonGridOptions,
  maxHeight: Math.max(height.value - 280, 360),
  columns: [
    { type: "checkbox", width: 50 },
    { title: "标题", field: "title", minWidth: 180, slots: { default: "titleSlot" } },
    { title: "分类", field: "category", width: 120 },
    { title: "关键词", field: "keywords", minWidth: 180, slots: { default: "keywordsSlot" } },
    { title: "内容", field: "content", minWidth: 320, slots: { default: "contentSlot" } },
    {
      title: "提示词片段",
      field: "promptHints",
      minWidth: 240,
      slots: { default: "promptHintsSlot" },
    },
    buildTimeColumn("创建时间", "createTime", 160),
    buildTimeColumn("更新时间", "updateTime", 160),
    buildOperationColumn("operationDefaultSlot"),
  ],
});

watchEffect(() => {
  gridOptions.value.maxHeight = Math.max(height.value - 280, 360);
});

const dataSource = ref<DesignInspiration[]>([]);
const loading = ref(false);
const ids = ref<string[]>([]);
const total = ref(0);
const deleteLoading = ref(false);
const formRef = ref<FormInstance>();
const dialogTitle = ref("");
const dialogVisible = ref(false);
const submitLoading = ref(false);
const isEdit = ref(false);

const defaultForm = () => ({
  id: "",
  title: "",
  content: "",
  keywordsText: "",
  category: "",
  promptHints: "",
  avoidNotes: "",
});

const form = ref(defaultForm());

const rules: FormRules = {
  title: [{ required: true, message: "请输入标题", trigger: "blur" }],
  content: [{ required: true, message: "请输入内容", trigger: "blur" }],
  category: [{ max: 80, message: "分类长度不能超过 80 个字符", trigger: "blur" }],
};

function parseKeywords(value: string) {
  return value
    .split(/[,，、\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

async function getList() {
  loading.value = true;
  try {
    const res = await getDesignInspirationPage({ ...queryParams });
    dataSource.value = res.list || [];
    total.value = Number(res.total || 0);
    ids.value = [];
  } catch (error) {
    console.error("获取设计灵感失败:", error);
    ElMessage.error("获取设计灵感失败");
  } finally {
    loading.value = false;
  }
}

function handleSearch() {
  queryParams.currentPage = 1;
  getList();
}

function handleReset() {
  queryParams.keyword = "";
  queryParams.category = "";
  handleSearch();
}

function handleAdd() {
  isEdit.value = false;
  dialogTitle.value = "新增设计灵感";
  form.value = defaultForm();
  dialogVisible.value = true;
}

function handleEdit(row: DesignInspiration) {
  isEdit.value = true;
  dialogTitle.value = "编辑设计灵感";
  form.value = {
    id: row.id || "",
    title: row.title,
    content: row.content,
    keywordsText: (row.keywords || []).join(", "),
    category: row.category || "",
    promptHints: row.promptHints || "",
    avoidNotes: row.avoidNotes || "",
  };
  dialogVisible.value = true;
}

function checkboxChange(e) {
  ids.value = e.records.map((item) => item.id);
}

function checkboxAllChange(e) {
  ids.value = e.records.map((item) => item.id);
}

function handleDelete(row?: DesignInspiration | null) {
  const delIds = row?.id ? [row.id] : [...ids.value];
  if (!delIds.length) {
    return ElMessage.warning("请选择要删除的数据");
  }

  const message = row
    ? `确认删除设计灵感"${row.title}"吗？`
    : `确认删除选中的 ${delIds.length} 条数据吗？`;
  ElMessageBox.confirm(message, "删除提示", {
    confirmButtonText: "确认",
    cancelButtonText: "取消",
    type: "warning",
  })
    .then(async () => {
      try {
        deleteLoading.value = true;
        await deleteDesignInspiration(delIds);
        ElMessage.success(`成功删除 ${delIds.length} 条数据`);
        if (dataSource.value.length === delIds.length && queryParams.currentPage > 1) {
          queryParams.currentPage--;
        }
        getList();
      } catch (error) {
        console.error("删除设计灵感失败:", error);
        ElMessage.error("删除失败");
      } finally {
        deleteLoading.value = false;
      }
    })
    .catch(() => {});
}

function dialogClose() {
  dialogVisible.value = false;
  submitLoading.value = false;
  formRef.value?.resetFields();
}

async function submitForm() {
  if (!formRef.value) return;
  try {
    await formRef.value.validate();
    submitLoading.value = true;
    const payload: DesignInspiration = {
      id: form.value.id || undefined,
      title: form.value.title,
      content: form.value.content,
      category: form.value.category,
      keywords: parseKeywords(form.value.keywordsText),
      promptHints: form.value.promptHints,
      avoidNotes: form.value.avoidNotes,
    };

    if (isEdit.value) {
      await updateDesignInspiration(payload);
      ElMessage.success("更新成功");
    } else {
      await createDesignInspiration(payload);
      ElMessage.success("新增成功");
    }

    dialogVisible.value = false;
    getList();
  } catch (error) {
    console.error("提交设计灵感失败:", error);
    ElMessage.error("操作失败");
  } finally {
    submitLoading.value = false;
  }
}

onMounted(() => {
  getList();
});
</script>

<style scoped>
:deep(.design-inspiration-page) {
  gap: 10px;
  padding: 8px 0 0;
}

:deep(.design-inspiration-page .list-page-filter--flat) {
  gap: 10px;
  padding-bottom: 10px;
}

.design-inspiration-title {
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.design-inspiration-content {
  display: -webkit-box;
  overflow: hidden;
  line-height: 1.5;
  color: var(--el-text-color-secondary);
  word-break: break-all;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.design-inspiration-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

@media (width <= 767px) {
  .design-inspiration-dialog :deep(.el-dialog) {
    width: calc(100vw - 16px) !important;
    max-height: calc(100vh - 16px);
    margin: 8px auto !important;
  }

  .design-inspiration-dialog :deep(.el-dialog__header) {
    padding: 12px 16px;
    margin-right: 0;
  }

  .design-inspiration-dialog :deep(.el-dialog__body) {
    padding: 12px 16px 0;
  }

  .design-inspiration-dialog__scroll :deep(.el-form-item) {
    margin-bottom: 14px;
  }

  .design-inspiration-dialog__scroll :deep(.el-form-item__label) {
    font-size: 13px;
  }

  .design-inspiration-dialog__scroll :deep(.el-textarea__inner) {
    font-size: 14px;
  }

  .design-inspiration-dialog__footer {
    display: flex;
    gap: 10px;
    padding: 12px 16px;
  }

  .design-inspiration-dialog__footer .el-button {
    flex: 1;
    height: 40px;
    font-size: 15px;
  }
}
</style>
