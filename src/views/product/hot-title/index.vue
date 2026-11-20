<script setup lang="ts">
import { ref, reactive, computed, watchEffect, onMounted } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { Plus, Upload, CopyDocument, Edit, Delete } from "@element-plus/icons-vue";
import { useWindowSize } from "@vueuse/core";
import ContentWrap from "@/components/ContentWrap/src/ContentWrap.vue";
import ListPageLayout from "@/components/ListPageLayout/index.vue";
import { buildOperationColumn, commonGridOptions } from "@/common/table";
import { formatTime } from "@/utils";
import {
  getHotTitlePageApi,
  createHotTitleApi,
  batchCreateHotTitleApi,
  updateHotTitleApi,
  deleteHotTitleApi,
  batchDeleteHotTitleApi,
  type HotTitleItem,
} from "@/api/product/hotTitle";

defineOptions({ name: "HotTitle" });

const PLATFORM_OPTIONS = [
  { label: "全平台通用", value: "all" },
  { label: "抖店", value: "doudian" },
  { label: "拼多多", value: "pdd" },
  { label: "淘宝 / 天猫", value: "taobao" },
  { label: "快手小店", value: "kuaishou_shop" },
  { label: "Temu", value: "temu" },
  { label: "小红书", value: "xiaohongshu" },
  { label: "闲鱼", value: "xianyu" },
];

const CATEGORY_PRESETS = ["手机壳", "T恤", "卫衣", "帆布包", "马克杯", "鼠标垫", "抱枕", "贴纸"];

const loading = ref(false);
const deleteLoading = ref(false);
const tableData = ref<HotTitleItem[]>([]);
const total = ref(0);
const selectedIds = ref<string[]>([]);

const queryParams = reactive({
  page: 1,
  pageSize: 20,
  keyword: "",
  platform: "",
  category: "",
});

const { width, height } = useWindowSize();
const isMobile = computed(() => width.value < 768);
const gridMaxHeight = ref<number>(400);

watchEffect(() => {
  gridMaxHeight.value = Math.max(height.value - 230, 360);
});

const isRowActive = (row: any): boolean => {
  if (!row) return false;
  return row.isActive === true || row.isActive === 1 || row.isActive === "1" || row.isActive === "true";
};

const getPlatformLabel = (platform?: string) => {
  const key = String(platform || "all").toLowerCase();
  const hit = PLATFORM_OPTIONS.find((item) => item.value === key);
  return hit ? hit.label : key || "全平台通用";
};

const getPlatformBadgeStyle = (platform?: string) => {
  const p = String(platform || "all").toLowerCase();
  if (!p || p === "all") {
    return { bg: "rgba(64, 158, 255, 0.12)", color: "#409eff", border: "rgba(64, 158, 255, 0.3)" };
  }
  if (p.includes("doudian") || p.includes("douyin")) {
    return { bg: "rgba(254, 44, 85, 0.12)", color: "#fe2c55", border: "rgba(254, 44, 85, 0.3)" };
  }
  if (p.includes("pdd")) {
    return { bg: "rgba(227, 20, 54, 0.12)", color: "#e31436", border: "rgba(227, 20, 54, 0.3)" };
  }
  if (p.includes("taobao") || p.includes("tmall")) {
    return { bg: "rgba(255, 80, 0, 0.12)", color: "#ff5000", border: "rgba(255, 80, 0, 0.3)" };
  }
  if (p.includes("kuaishou")) {
    return { bg: "rgba(255, 54, 0, 0.12)", color: "#ff3600", border: "rgba(255, 54, 0, 0.3)" };
  }
  if (p.includes("temu")) {
    return { bg: "rgba(251, 119, 1, 0.12)", color: "#fb7701", border: "rgba(251, 119, 1, 0.3)" };
  }
  if (p.includes("xiaohongshu") || p.includes("xhs")) {
    return { bg: "rgba(255, 36, 66, 0.12)", color: "#ff2442", border: "rgba(255, 36, 66, 0.3)" };
  }
  if (p.includes("xianyu")) {
    return { bg: "rgba(255, 197, 0, 0.15)", color: "#b88600", border: "rgba(255, 197, 0, 0.4)" };
  }
  return {
    bg: "var(--el-fill-color-light)",
    color: "var(--el-color-primary)",
    border: "var(--el-color-primary-light-5)",
  };
};

const splitTags = (raw?: string | null): string[] => {
  if (!raw) return [];
  return String(raw)
    .split(/[,，、;\n]+/)
    .map((s) => s.trim())
    .filter(Boolean);
};

const gridOptions = computed(() => ({
  ...commonGridOptions,
  maxHeight: gridMaxHeight.value,
  rowConfig: { keyField: "id" },
  rowClassName: ({ row }: any) => (!isRowActive(row) ? "hot-title-row--disabled" : ""),
  columns: [
    { type: "checkbox", width: 46, fixed: "left" as const },
    {
      field: "title",
      title: "热门标题",
      minWidth: 380,
      headerAlign: "left" as const,
      slots: { default: "titleSlot" },
    },
    {
      field: "platform",
      title: "平台",
      width: 112,
      align: "center" as const,
      slots: { default: "platformSlot" },
    },
    {
      field: "category",
      title: "品类",
      width: 108,
      align: "center" as const,
      slots: { default: "categorySlot" },
    },
    {
      field: "styleTags",
      title: "标签",
      minWidth: 160,
      headerAlign: "left" as const,
      slots: { default: "tagsSlot" },
    },
    {
      field: "isActive",
      title: "状态",
      width: 78,
      align: "center" as const,
      slots: { default: "statusSlot" },
    },
    {
      field: "updateTime",
      title: "更新时间",
      width: 146,
      align: "center" as const,
      slots: { default: "timeSlot" },
    },
    buildOperationColumn("action"),
  ],
}));

const getList = async () => {
  loading.value = true;
  try {
    const res: any = await getHotTitlePageApi({
      pageNo: queryParams.page,
      pageSize: queryParams.pageSize,
      keyword: queryParams.keyword.trim() || undefined,
      platform: queryParams.platform || undefined,
      category: queryParams.category.trim() || undefined,
    });
    const payload = res?.data && !Array.isArray(res.data) ? res.data : res;
    tableData.value = Array.isArray(payload?.list) ? payload.list : [];
    total.value = Number(payload?.total ?? tableData.value.length);
    selectedIds.value = [];
  } catch (err: any) {
    ElMessage.error(err?.message || "加载失败");
  } finally {
    loading.value = false;
  }
};

const handleSearch = () => {
  queryParams.page = 1;
  getList();
};

const resetQuery = () => {
  queryParams.keyword = "";
  queryParams.platform = "";
  queryParams.category = "";
  handleSearch();
};

const handlePagination = () => {
  getList();
};

const handleSelectionChange = (e: any) => {
  selectedIds.value = (e?.records || []).map((item: any) => String(item.id));
};

const toggleMobileSelect = (id: string, checked: boolean) => {
  const sid = String(id);
  if (checked) {
    if (!selectedIds.value.includes(sid)) {
      selectedIds.value = [...selectedIds.value, sid];
    }
  } else {
    selectedIds.value = selectedIds.value.filter((item) => item !== sid);
  }
};

const handleToggleActive = async (row: HotTitleItem) => {
  const nextStatus = !isRowActive(row);
  try {
    await updateHotTitleApi(row.id, { isActive: nextStatus });
    row.isActive = nextStatus;
    ElMessage.success(nextStatus ? "已启用" : "已停用");
  } catch (err: any) {
    ElMessage.error(err?.message || "操作失败");
  }
};

const handleCopyTitle = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text);
    ElMessage.success("已复制");
  } catch {
    ElMessage.warning("复制失败，请手动复制");
  }
};

// ── 新增 / 编辑弹窗 ──
const dialogVisible = ref(false);
const dialogTitle = ref("新增标题");
const submitLoading = ref(false);
const formRef = ref();

const form = reactive({
  id: "",
  title: "",
  platform: "all",
  category: "",
  styleTags: "",
  isActive: true,
});

const formRules = {
  title: [{ required: true, message: "请输入标题内容", trigger: "blur" }],
};

const handleAdd = () => {
  dialogTitle.value = "新增标题";
  form.id = "";
  form.title = "";
  form.platform = "all";
  form.category = "";
  form.styleTags = "";
  form.isActive = true;
  dialogVisible.value = true;
};

const handleEdit = (row: HotTitleItem) => {
  dialogTitle.value = "编辑标题";
  form.id = row.id;
  form.title = row.title || "";
  form.platform = row.platform || "all";
  form.category = row.category || "";
  form.styleTags = row.styleTags || "";
  form.isActive = isRowActive(row);
  dialogVisible.value = true;
};

const submitForm = async () => {
  if (!formRef.value || submitLoading.value) return;
  submitLoading.value = true;
  try {
    await formRef.value.validate();
    const payload = {
      title: form.title.trim(),
      platform: form.platform || "all",
      category: form.category.trim() || undefined,
      styleTags: form.styleTags.trim() || undefined,
      isActive: form.isActive,
    };
    if (form.id) {
      await updateHotTitleApi(form.id, payload);
      ElMessage.success("已保存");
    } else {
      await createHotTitleApi(payload);
      ElMessage.success("已添加");
    }
    dialogVisible.value = false;
    getList();
  } catch (err: any) {
    if (err?.message) {
      ElMessage.error(err.message);
    }
  } finally {
    submitLoading.value = false;
  }
};

// ── 批量导入弹窗 ──
const batchDialogVisible = ref(false);
const batchSubmitLoading = ref(false);
const batchForm = reactive({
  rawText: "",
  platform: "all",
  category: "",
});

const parsedBatchTitles = computed(() => {
  return batchForm.rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
});

const handleOpenBatch = () => {
  batchForm.rawText = "";
  batchForm.platform = "all";
  batchForm.category = "";
  batchDialogVisible.value = true;
};

const submitBatch = async () => {
  const titles = parsedBatchTitles.value;
  if (!titles.length) {
    ElMessage.warning("请粘贴标题（每行一条）");
    return;
  }
  batchSubmitLoading.value = true;
  try {
    const items = titles.map((title) => ({
      title,
      platform: batchForm.platform || "all",
      category: batchForm.category.trim() || undefined,
      isActive: true,
    }));
    const res: any = await batchCreateHotTitleApi(items);
    const data = res?.data || res || {};
    const created = Number(data.created ?? titles.length);
    const skipped = Number(data.skipped ?? 0);
    ElMessage.success(
      skipped > 0 ? `导入 ${created} 条，跳过重复 ${skipped} 条` : `导入 ${created} 条`,
    );
    batchDialogVisible.value = false;
    getList();
  } catch (err: any) {
    ElMessage.error(err?.message || "导入失败");
  } finally {
    batchSubmitLoading.value = false;
  }
};

// ── 删除 ──
const handleDelete = (row: HotTitleItem) => {
  const preview = row.title.length > 24 ? `${row.title.slice(0, 24)}...` : row.title;
  ElMessageBox.confirm(`确认删除「${preview}」吗？`, "删除确认", {
    confirmButtonText: "删除",
    cancelButtonText: "取消",
    type: "warning",
  })
    .then(async () => {
      deleteLoading.value = true;
      try {
        await deleteHotTitleApi(row.id);
        ElMessage.success("已删除");
        getList();
      } catch (err: any) {
        ElMessage.error(err?.message || "删除失败");
      } finally {
        deleteLoading.value = false;
      }
    })
    .catch(() => {});
};

const handleBatchDelete = () => {
  if (!selectedIds.value.length) return;
  ElMessageBox.confirm(`确认删除选中的 ${selectedIds.value.length} 条标题吗？`, "批量删除", {
    confirmButtonText: "删除",
    cancelButtonText: "取消",
    type: "warning",
  })
    .then(async () => {
      deleteLoading.value = true;
      try {
        await batchDeleteHotTitleApi(selectedIds.value);
        ElMessage.success(`已删除 ${selectedIds.value.length} 条`);
        selectedIds.value = [];
        getList();
      } catch (err: any) {
        ElMessage.error(err?.message || "删除失败");
      } finally {
        deleteLoading.value = false;
      }
    })
    .catch(() => {});
};

onMounted(() => {
  getList();
});
</script>

<template>
  <ContentWrap :plain="true">
    <ListPageLayout class="hot-title-page">
      <template #filter>
        <div class="hot-title-toolbar">
          <div class="hot-title-toolbar__filters">
            <el-input
              v-model="queryParams.keyword"
              :size="isMobile ? 'default' : 'small'"
              clearable
              placeholder="搜索标题 / 标签"
              class="hot-title-toolbar__keyword"
              @keyup.enter="handleSearch"
              @clear="handleSearch"
            />
            <el-select
              v-model="queryParams.platform"
              :size="isMobile ? 'default' : 'small'"
              clearable
              placeholder="全部平台"
              class="hot-title-toolbar__select"
              @change="handleSearch"
            >
              <el-option
                v-for="item in PLATFORM_OPTIONS"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </el-select>
            <el-input
              v-model="queryParams.category"
              :size="isMobile ? 'default' : 'small'"
              clearable
              placeholder="品类"
              class="hot-title-toolbar__category"
              @keyup.enter="handleSearch"
              @clear="handleSearch"
            />
          </div>

          <div class="hot-title-toolbar__actions">
            <el-button size="small" type="primary" :loading="loading" @click="handleSearch">
              查询
            </el-button>
            <el-button
              v-if="queryParams.keyword || queryParams.platform || queryParams.category"
              size="small"
              :disabled="loading"
              @click="resetQuery"
            >
              重置
            </el-button>
            <el-button
              size="small"
              type="primary"
              :icon="Plus"
              :disabled="loading"
              @click="handleAdd"
            >
              新增
            </el-button>
            <el-button
              size="small"
              type="success"
              plain
              :icon="Upload"
              :disabled="loading"
              @click="handleOpenBatch"
            >
              批量导入
            </el-button>
            <el-button
              v-if="selectedIds.length > 0"
              size="small"
              type="danger"
              :loading="deleteLoading"
              @click="handleBatchDelete"
            >
              删除({{ selectedIds.length }})
            </el-button>
          </div>
        </div>
      </template>

      <template #table>
        <!-- 移动端卡片列表 -->
        <div v-if="isMobile" v-loading="loading" class="hot-title-mobile-list">
          <el-empty v-if="!loading && tableData.length === 0" description="暂无热门标题" :image-size="72" />
          <div
            v-for="row in tableData"
            :key="row.id"
            class="hot-title-card"
            :class="{ 'hot-title-card--disabled': !isRowActive(row) }"
          >
            <div class="hot-title-card__top">
              <div class="hot-title-card__badges">
                <el-checkbox
                  :model-value="selectedIds.includes(String(row.id))"
                  @change="(val: any) => toggleMobileSelect(row.id, Boolean(val))"
                />
                <el-tag
                  size="small"
                  effect="plain"
                  :style="{
                    background: getPlatformBadgeStyle(row.platform).bg,
                    color: getPlatformBadgeStyle(row.platform).color,
                    borderColor: getPlatformBadgeStyle(row.platform).border,
                  }"
                >
                  {{ getPlatformLabel(row.platform) }}
                </el-tag>
                <el-tag v-if="row.category" size="small" type="info" effect="plain">
                  {{ row.category }}
                </el-tag>
              </div>
              <el-switch
                :model-value="isRowActive(row)"
                size="small"
                @change="handleToggleActive(row)"
              />
            </div>

            <div class="hot-title-card__title" @click="handleEdit(row)">
              {{ row.title }}
            </div>

            <div v-if="row.styleTags" class="hot-title-card__tags">
              <el-tag
                v-for="(tag, idx) in splitTags(row.styleTags).slice(0, 5)"
                :key="`ms-${idx}`"
                size="small"
                type="info"
                effect="light"
              >
                {{ tag }}
              </el-tag>
            </div>

            <div class="hot-title-card__footer">
              <span class="hot-title-card__time">
                {{ formatTime(row.updateTime, "MM-dd HH:mm") }}
              </span>
              <div class="hot-title-card__ops">
                <el-button link size="small" :icon="CopyDocument" @click="handleCopyTitle(row.title)">
                  复制
                </el-button>
                <el-button link type="primary" size="small" :icon="Edit" @click="handleEdit(row)">
                  编辑
                </el-button>
                <el-button link type="danger" size="small" :icon="Delete" @click="handleDelete(row)">
                  删除
                </el-button>
              </div>
            </div>
          </div>
        </div>

        <!-- 桌面端表格 -->
        <div
          v-else
          class="list-page-panel list-page-panel--flat list-page-table-panel list-page-table-panel--flat"
        >
          <div class="list-page-table-panel__body">
            <div class="common-table">
              <vxe-grid
                v-bind="gridOptions"
                :data="tableData"
                :loading="loading"
                @checkbox-change="handleSelectionChange"
                @checkbox-all="handleSelectionChange"
              >
                <template #titleSlot="{ row }">
                  <div class="hot-title-text" @click="handleEdit(row)">
                    {{ row.title }}
                  </div>
                </template>

                <template #platformSlot="{ row }">
                  <el-tag
                    size="small"
                    effect="plain"
                    :style="{
                      background: getPlatformBadgeStyle(row.platform).bg,
                      color: getPlatformBadgeStyle(row.platform).color,
                      borderColor: getPlatformBadgeStyle(row.platform).border,
                    }"
                  >
                    {{ getPlatformLabel(row.platform) }}
                  </el-tag>
                </template>

                <template #categorySlot="{ row }">
                  <el-tag v-if="row.category" size="small" type="info" effect="plain">
                    {{ row.category }}
                  </el-tag>
                  <span v-else class="hot-title-empty">-</span>
                </template>

                <template #tagsSlot="{ row }">
                  <div v-if="row.styleTags" class="hot-title-tags">
                    <el-tag
                      v-for="(tag, idx) in splitTags(row.styleTags).slice(0, 4)"
                      :key="`s-${idx}`"
                      size="small"
                      type="info"
                      effect="light"
                    >
                      {{ tag }}
                    </el-tag>
                  </div>
                  <span v-else class="hot-title-empty">-</span>
                </template>

                <template #statusSlot="{ row }">
                  <el-switch
                    :model-value="isRowActive(row)"
                    size="small"
                    inline-prompt
                    active-text="启"
                    inactive-text="停"
                    @change="handleToggleActive(row)"
                  />
                </template>

                <template #timeSlot="{ row }">
                  <span class="hot-title-time">
                    {{ formatTime(row.updateTime, "yyyy-MM-dd HH:mm") }}
                  </span>
                </template>

                <template #action="{ row }">
                  <el-dropdown class="operation-dropdown" placement="bottom-end">
                    <el-button type="primary" link size="small" class="operation-trigger-button">
                      操作
                    </el-button>
                    <template #dropdown>
                      <el-dropdown-menu class="operation-menu-compact">
                        <el-dropdown-item @click="handleEdit(row)">编辑</el-dropdown-item>
                        <el-dropdown-item @click="handleCopyTitle(row.title)">复制</el-dropdown-item>
                        <el-dropdown-item
                          divided
                          class="operation-menu-item--danger"
                          @click="handleDelete(row)"
                        >
                          删除
                        </el-dropdown-item>
                      </el-dropdown-menu>
                    </template>
                  </el-dropdown>
                </template>
              </vxe-grid>
            </div>
          </div>
        </div>
      </template>

      <template #pagination>
        <div
          class="list-page-panel list-page-panel--flat list-page-table-panel__pagination list-page-table-panel__pagination--flat hot-title-pagination"
        >
          <pagination
            v-model:page="queryParams.page"
            v-model:limit="queryParams.pageSize"
            :total="total"
            :layout="isMobile ? 'prev, pager, next' : undefined"
            @pagination="handlePagination"
          />
        </div>
      </template>
    </ListPageLayout>

    <!-- 新增 / 编辑弹窗 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      :width="isMobile ? '94vw' : '520px'"
      :top="isMobile ? '6vh' : '12vh'"
      class="hot-title-dialog"
      destroy-on-close
    >
      <el-form
        ref="formRef"
        :model="form"
        :rules="formRules"
        :label-position="isMobile ? 'top' : 'right'"
        :label-width="isMobile ? 'auto' : '68px'"
      >
        <el-form-item label="标题" prop="title">
          <el-input
            v-model="form.title"
            type="textarea"
            :rows="3"
            maxlength="255"
            show-word-limit
            placeholder="输入热门参考标题"
          />
        </el-form-item>

        <el-row :gutter="12">
          <el-col :xs="24" :sm="12">
            <el-form-item label="平台">
              <el-select v-model="form.platform" style="width: 100%">
                <el-option
                  v-for="item in PLATFORM_OPTIONS"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12">
            <el-form-item label="品类">
              <el-input v-model="form.category" clearable placeholder="选填，如手机壳 / T恤" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label=" ">
          <div class="hot-title-presets">
            <span
              v-for="cat in CATEGORY_PRESETS"
              :key="cat"
              class="hot-title-preset-chip"
              :class="{ 'is-active': form.category === cat }"
              @click="form.category = form.category === cat ? '' : cat"
            >
              {{ cat }}
            </span>
          </div>
        </el-form-item>

        <el-form-item label="标签">
          <el-input v-model="form.styleTags" clearable placeholder="选填，逗号分隔，如：搞笑,复古,国潮" />
        </el-form-item>

        <el-form-item label="状态">
          <el-switch v-model="form.isActive" active-text="启用" inactive-text="停用" />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button :disabled="submitLoading" @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitLoading" @click="submitForm">保存</el-button>
      </template>
    </el-dialog>

    <!-- 批量导入弹窗 -->
    <el-dialog
      v-model="batchDialogVisible"
      title="批量导入"
      :width="isMobile ? '94vw' : '520px'"
      :top="isMobile ? '6vh' : '12vh'"
      class="hot-title-dialog"
      destroy-on-close
    >
      <el-form
        :model="batchForm"
        :label-position="isMobile ? 'top' : 'right'"
        :label-width="isMobile ? 'auto' : '68px'"
      >
        <el-form-item label="标题列表">
          <el-input
            v-model="batchForm.rawText"
            type="textarea"
            :rows="isMobile ? 6 : 8"
            placeholder="每行一条标题，自动去重"
          />
          <div class="hot-title-batch-tip">
            已识别 <strong>{{ parsedBatchTitles.length }}</strong> 条
          </div>
        </el-form-item>

        <el-row :gutter="12">
          <el-col :xs="24" :sm="12">
            <el-form-item label="平台">
              <el-select v-model="batchForm.platform" style="width: 100%">
                <el-option
                  v-for="item in PLATFORM_OPTIONS"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12">
            <el-form-item label="品类">
              <el-input v-model="batchForm.category" clearable placeholder="选填" />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>

      <template #footer>
        <el-button :disabled="batchSubmitLoading" @click="batchDialogVisible = false">取消</el-button>
        <el-button
          type="primary"
          :loading="batchSubmitLoading"
          :disabled="parsedBatchTitles.length === 0"
          @click="submitBatch"
        >
          导入 {{ parsedBatchTitles.length }} 条
        </el-button>
      </template>
    </el-dialog>
  </ContentWrap>
</template>

<style scoped lang="less">
:deep(.hot-title-page) {
  gap: 10px;
  padding: 8px 0 0;
}

/* ── 顶部简洁工具栏 ── */
.hot-title-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding-bottom: 4px;
}

.hot-title-toolbar__filters {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
}

.hot-title-toolbar__keyword {
  width: 240px;
}

.hot-title-toolbar__select {
  width: 140px;
}

.hot-title-toolbar__category {
  width: 130px;
}

.hot-title-toolbar__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;

  :deep(.el-button + .el-button) {
    margin-left: 0;
  }
}

/* ── 移动端卡片列表 ── */
.hot-title-mobile-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 200px;
}

.hot-title-card {
  padding: 12px;
  border-radius: 8px;
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-lighter);
  transition: opacity 0.2s ease;
}

.hot-title-card--disabled {
  opacity: 0.55;
}

.hot-title-card__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
}

.hot-title-card__badges {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  min-width: 0;

  :deep(.el-checkbox) {
    height: auto;
    margin-right: 2px;
  }
}

.hot-title-card__title {
  font-size: 14px;
  font-weight: 500;
  line-height: 1.5;
  color: var(--el-text-color-primary);
  word-break: break-word;
  cursor: pointer;
}

.hot-title-card__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 8px;
}

.hot-title-card__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-top: 10px;
  padding-top: 8px;
  border-top: 1px solid var(--el-border-color-extra-light);
}

.hot-title-card__time {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  font-variant-numeric: tabular-nums;
}

.hot-title-card__ops {
  display: flex;
  align-items: center;
  gap: 4px;

  :deep(.el-button) {
    padding: 4px 6px;
    margin-left: 0;
  }
}

/* ── 桌面端表格样式 ── */
.hot-title-text {
  padding: 4px 0;
  font-size: 13px;
  font-weight: 500;
  line-height: 1.45;
  color: var(--el-text-color-primary);
  cursor: pointer;

  &:hover {
    color: var(--el-color-primary);
  }
}

.hot-title-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.hot-title-time {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  font-variant-numeric: tabular-nums;
}

.hot-title-empty {
  color: var(--el-text-color-placeholder);
  font-size: 12px;
}

.hot-title-presets {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.hot-title-preset-chip {
  padding: 2px 8px;
  font-size: 12px;
  line-height: 18px;
  border-radius: 4px;
  cursor: pointer;
  color: var(--el-text-color-regular);
  background: var(--el-fill-color-light);
  border: 1px solid var(--el-border-color-lighter);
  transition: all 0.15s ease;

  &:hover {
    color: var(--el-color-primary);
    border-color: var(--el-color-primary-light-5);
  }

  &.is-active {
    color: #fff;
    background: var(--el-color-primary);
    border-color: var(--el-color-primary);
  }
}

.hot-title-batch-tip {
  margin-top: 6px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

:deep(.hot-title-row--disabled) {
  opacity: 0.4;
  transition: opacity 0.2s ease;

  &:hover {
    opacity: 0.85;
  }
}

/* ── 弹窗与移动端适配 ── */
:deep(.hot-title-dialog .el-dialog__body) {
  max-height: 74vh;
  overflow-y: auto;
}

@media (max-width: 767px) {
  :deep(.hot-title-page) {
    padding: 4px 0 0;
  }

  .hot-title-toolbar {
    flex-direction: column;
    align-items: stretch;
  }

  .hot-title-toolbar__filters {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }

  .hot-title-toolbar__keyword {
    grid-column: 1 / -1;
    width: 100%;
  }

  .hot-title-toolbar__select,
  .hot-title-toolbar__category {
    width: 100%;
  }

  .hot-title-pagination {
    display: flex;
    justify-content: center;
  }

  :deep(.hot-title-dialog .el-dialog__body) {
    padding: 12px 14px;
    max-height: 76vh;
  }

  :deep(.hot-title-dialog .el-form-item) {
    margin-bottom: 12px;
  }
}
</style>
