<!-- 基于 ruoyi-vue3 的 Pagination 重构，核心是简化无用的属性，并使用 ts 重写 -->
<template>
  <div v-show="total > 0" class="yishe-pagination">
    <!-- 移动端优化分页条：防溢出、高触控友好、带快速选页 -->
    <div v-if="isMobile" class="yishe-pagination__mobile-bar">
      <div class="yishe-pagination__mobile-total">
        共 <strong>{{ total }}</strong> 条
      </div>
      <div class="yishe-pagination__mobile-nav">
        <el-button
          size="small"
          class="mobile-page-btn"
          :disabled="currentPage <= 1"
          @click="handleCurrentChange(currentPage - 1)"
        >
          上一页
        </el-button>
        <el-dropdown trigger="click" @command="(val: any) => handleCurrentChange(Number(val))">
          <button class="mobile-page-indicator" type="button">
            <span>{{ currentPage }} / {{ pageCount || 1 }}</span>
            <el-icon class="indicator-arrow"><ArrowDown /></el-icon>
          </button>
          <template #dropdown>
            <el-dropdown-menu class="mobile-page-dropdown-menu">
              <el-dropdown-item
                v-for="p in pageCount"
                :key="p"
                :command="p"
                :class="{ 'is-active': p === currentPage }"
              >
                第 {{ p }} 页
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
        <el-button
          size="small"
          class="mobile-page-btn"
          :disabled="currentPage >= pageCount"
          @click="handleCurrentChange(currentPage + 1)"
        >
          下一页
        </el-button>
      </div>
    </div>

    <!-- 桌面端标准分页控件 -->
    <el-pagination
      v-else
      v-model:current-page="currentPage"
      v-model:page-size="pageSize"
      :background="true"
      :page-sizes="[10, 20, 30, 50, 100, 200, 500, 1000]"
      :pager-count="responsivePagerCount"
      :total="total"
      class="yishe-pagination__control"
      :layout="responsiveLayout"
      @size-change="handleSizeChange"
      @current-change="handleCurrentChange"
    />
  </div>
</template>
<script lang="ts" setup>
import { computed, ref, onMounted, onBeforeUnmount } from 'vue'
import { ArrowDown } from '@element-plus/icons-vue'

defineOptions({ name: 'Pagination' })

const props = defineProps({
  // 总条目数
  total: {
    required: true,
    type: Number
  },
  // 当前页数：currentPage
  page: {
    type: Number,
    default: 1
  },
  // 每页显示条目个数：pageSize
  limit: {
    type: Number,
    default: 20
  },
  // 设置最大页码按钮数。 页码按钮的数量，当总页数超过该值时会折叠
  // 移动端页码按钮的数量端默认值 5
  pagerCount: {
    type: Number,
    default: typeof document !== 'undefined' && document.body.clientWidth < 992 ? 5 : 7
  }
})

const emit = defineEmits(['update:page', 'update:limit', 'pagination'])

const windowWidth = ref(typeof window === 'undefined' ? 1200 : window.innerWidth)
const updateWindowWidth = () => {
  if (typeof window !== 'undefined') {
    windowWidth.value = window.innerWidth
  }
}

onMounted(() => {
  updateWindowWidth()
  window.addEventListener('resize', updateWindowWidth, { passive: true })
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', updateWindowWidth)
})

const isMobile = computed(() => windowWidth.value <= 768)
const responsiveLayout = computed(() => {
  if (windowWidth.value <= 900) {
    return 'total, sizes, prev, pager, next'
  }
  return 'total, sizes, prev, pager, next, jumper'
})
const responsivePagerCount = computed(() => {
  if (windowWidth.value <= 900) {
    return 5
  }
  return props.pagerCount
})
const pageCount = computed(() => {
  const limit = Number(pageSize.value) || 1
  return Math.max(1, Math.ceil((Number(props.total) || 0) / limit))
})

const currentPage = computed({
  get() {
    return props.page
  },
  set(val) {
    emit('update:page', val)
  }
})
const pageSize = computed({
  get() {
    return props.limit
  },
  set(val) {
    emit('update:limit', val)
  }
})
const handleSizeChange = (val: number) => {
  if (currentPage.value * val > props.total) {
    currentPage.value = 1
  }
  emit('pagination', { page: currentPage.value, limit: val })
}
const handleCurrentChange = (val: number) => {
  currentPage.value = val
  emit('pagination', { page: val, limit: pageSize.value })
}
</script>
<style scoped lang="scss">
.yishe-pagination {
  display: flex;
  width: 100%;
  min-width: 0;
  margin: 15px 0;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
}

.yishe-pagination__control {
  max-width: 100%;
}

:deep(.el-pagination) {
  flex-wrap: wrap;
  justify-content: flex-end;
  row-gap: 8px;
  max-width: 100%;
}

/* 移动端专属分页条样式 */
.yishe-pagination__mobile-bar {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  box-sizing: border-box;
}

.yishe-pagination__mobile-total {
  font-size: 13px;
  color: var(--el-text-color-secondary);
  white-space: nowrap;

  strong {
    color: var(--el-text-color-primary);
    font-weight: 600;
  }
}

.yishe-pagination__mobile-nav {
  display: flex;
  align-items: center;
  gap: 6px;
}

.mobile-page-btn {
  height: 32px;
  padding: 0 10px;
  font-size: 12px;
  border-radius: 6px;
}

.mobile-page-indicator {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  height: 32px;
  padding: 0 8px;
  font-size: 12px;
  font-weight: 500;
  color: var(--el-text-color-primary);
  background: var(--el-fill-color-light);
  border: 1px solid var(--el-border-color);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  user-select: none;

  &:hover,
  &:active {
    border-color: var(--el-color-primary);
    color: var(--el-color-primary);
  }

  .indicator-arrow {
    font-size: 11px;
  }
}

:deep(.mobile-page-dropdown-menu) {
  max-height: 240px;
  overflow-y: auto;
  min-width: 90px;

  .el-dropdown-menu__item.is-active {
    color: var(--el-color-primary);
    font-weight: 600;
    background: var(--el-color-primary-light-9);
  }
}

@media (width <= 768px) {
  .yishe-pagination {
    align-items: stretch;
    margin: 8px 0;
  }
}

@media (width <= 360px) {
  .yishe-pagination__mobile-bar {
    gap: 4px;
  }

  .mobile-page-btn {
    padding: 0 6px;
    font-size: 11px;
  }

  .mobile-page-indicator {
    padding: 0 6px;
    font-size: 11px;
  }

  .yishe-pagination__mobile-total {
    font-size: 12px;
  }
}
</style>
