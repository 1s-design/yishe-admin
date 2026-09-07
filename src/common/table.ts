import { computed, type ComputedRef } from "vue";
import { useWindowSize } from "@vueuse/core";
import { formatTimestamp } from "@/common/date";

export const TABLE_TIME_COLUMN_WIDTH = 168;
export const TABLE_OPERATION_COLUMN_WIDTH = 96;

export const DEFAULT_TABLE_MIN_HEIGHT = 360;
export const DEFAULT_TABLE_OFFSET = 280;

/**
 * 统一表格自适应最大高度 Hook
 * @param offset 顶部导航、筛选表单、间距与分页所占用的垂直空间，默认 280px
 * @param minHeight 保底最小高度，默认 360px
 */
export function useTableMaxHeight(
  offset = DEFAULT_TABLE_OFFSET,
  minHeight = DEFAULT_TABLE_MIN_HEIGHT,
): ComputedRef<number> {
  const { height } = useWindowSize();
  return computed(() => Math.max(height.value - offset, minHeight));
}

/**
 * 单次或已知窗口高度时的计算辅助函数
 */
export function calcTableMaxHeight(
  windowHeight: number,
  offset = DEFAULT_TABLE_OFFSET,
  minHeight = DEFAULT_TABLE_MIN_HEIGHT,
): number {
  return Math.max(Number(windowHeight || 0) - offset, minHeight);
}

export const formatTableDateTime = (value: unknown) => {
  if (!value) return "-";
  return formatTimestamp(value);
};

export const buildTimeColumn = (
  title: string,
  field = "createTime",
  width = TABLE_TIME_COLUMN_WIDTH,
  extra: Record<string, unknown> = {},
): any => ({
  title,
  field,
  width,
  showOverflow: true,
  className: "table-time-cell",
  formatter: ({ cellValue }: { cellValue: unknown }) => formatTableDateTime(cellValue),
  ...extra,
});

export const buildOperationColumn = (
  slotName = "operationDefaultSlot",
  width = TABLE_OPERATION_COLUMN_WIDTH,
  extra: Record<string, unknown> = {},
): any => ({
  title: "操作",
  field: "operation",
  fixed: "right" as const,
  width,
  className: "table-operation-cell",
  headerClassName: "table-operation-header-cell",
  slots: {
    default: slotName,
  },
  ...extra,
});

export const commonGridOptions = {
  size: "mini" as const,
  border: "inner" as const,
  autoResize: true,
  minHeight: DEFAULT_TABLE_MIN_HEIGHT,
  headerCellClassName: "common-table__header-cell",
  cellClassName: "common-table__body-cell",
  columnConfig: {
    resizable: true,
  },
  rowConfig: {
    resizable: true,
  },
  resizableConfig: {},
  customConfig: {
    // storage: {
    //     resizable: true,
    // }
  },
};
