<template>
  <div
    class="excel-preview"
    v-loading="loading"
    element-loading-text="加载 Excel 文件中..."
  >
    <div v-if="error" class="excel-preview__error">
      <p>{{ error }}</p>
    </div>

    <VueOfficeExcel
      v-else-if="fileUrl"
      :key="`${fileUrl}-${isXls}`"
      :src="fileUrl"
      :options="excelOptions"
      class="excel-preview__viewer"
      @rendered="handleRendered"
      @error="handleError"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";
import VueOfficeExcel from "@vue-office/excel/lib/v3/vue-office-excel.mjs";
import "@vue-office/excel/lib/v3/index.css";

const props = defineProps<{
  fileUrl: string;
  fileSuffix?: string;
}>();

const loading = ref(false);
const error = ref("");

const isXls = computed(() => {
  const suffix = String(props.fileSuffix || "")
    .trim()
    .toLowerCase();
  if (suffix) return suffix === "xls";
  return /\.xls(\?.*)?$/i.test(props.fileUrl || "");
});

const excelOptions = computed(() => ({
  xls: isXls.value,
  minColLength: 0,
  minRowLength: 0,
  widthOffset: 10,
  heightOffset: 10,
}));

watch(
  () => props.fileUrl,
  (url) => {
    error.value = "";
    loading.value = Boolean(url);
  },
  { immediate: true }
);

function handleRendered() {
  loading.value = false;
  error.value = "";
  nextTick(() => {
    window.dispatchEvent(new Event("resize"));
  });
}

function handleError(e: any) {
  loading.value = false;
  error.value = `加载失败: ${e?.message || "无法解析当前 Excel 文件"}`;
}
</script>

<style scoped>
.excel-preview {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 0;
}

.excel-preview__viewer {
  width: 100%;
  height: 100%;
}

.excel-preview__error {
  display: flex;
  width: 100%;
  height: 100%;
  padding: 40px;
  color: var(--el-color-danger);
  align-items: center;
  justify-content: center;
  text-align: center;
}
</style>
