<template>
  <el-popover
    placement="right"
    trigger="hover"
    :width="300"
    :show-after="300"
    :hide-after="120"
    popper-class="material-relation-popper"
    :popper-style="{ padding: '12px 14px', borderRadius: '10px' }"
    @before-enter="load"
  >
    <template #reference>
      <button
        type="button"
        class="relation-trigger relation-trigger--link"
        :class="{ 'relation-trigger--linked': hasRelated }"
        title="查看/管理关联图"
        @click.stop="emit('open-manage', row)"
      >
        <el-icon :size="12"><Link /></el-icon>
      </button>
    </template>

    <div v-loading="loading" class="relation-card">
      <section class="relation-card__section">
        <header class="relation-card__header">
          <span class="relation-card__title">关联图</span>
          <span v-if="related.length" class="relation-card__count">{{ related.length }}</span>
          <span v-else-if="!loading" class="relation-card__hint">未关联</span>
          <button type="button" class="relation-card__action" @click.stop="emit('open-manage', row)">管理</button>
        </header>

        <div v-if="related.length" class="relation-card__thumbs">
          <el-image
            v-for="item in related.slice(0, 8)"
            :key="item.id"
            :src="thumbUrl(item)"
            :preview-src-list="[item.url || item.originUrl].filter(Boolean)"
            :preview-teleported="true"
            :hide-on-click-modal="true"
            fit="cover"
            class="relation-card__thumb"
          >
            <template #error>
              <div class="relation-card__thumb relation-card__thumb--empty">无图</div>
            </template>
          </el-image>
          <span v-if="related.length > 8" class="relation-card__rest">+{{ related.length - 8 }}</span>
        </div>
        <div v-else-if="!loading" class="relation-card__empty-tip">
          暂无关联印花，点击「管理」可快速添加
        </div>
      </section>

      <p v-for="message in errors" :key="message" class="relation-card__error">{{ message }}</p>
    </div>
  </el-popover>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { Link } from '@element-plus/icons-vue'
import { getFastPreviewImageUrl } from '@/utils/image'
import {
  loadMaterialRelations,
  type MaterialRelations
} from './useMaterialRelations'

const props = defineProps<{ row: any }>()

const emit = defineEmits<{
  (e: 'open-manage', row: any): void
}>()

const loading = ref(false)
const relations = ref<MaterialRelations>({ related: [], bindings: [], errors: [] })

const related = computed(() => relations.value.related)
const errors = computed(() => relations.value.errors)

/** 列表接口已返回 relatedImageIds，这里免费取数量做高亮，不额外发查询 */
const hasRelated = computed(() => {
  const ids = props.row?.relatedImageIds
  return Array.isArray(ids) && ids.length > 0
})

async function load() {
  const id = String(props.row?.id || '')
  if (!id) return
  loading.value = true
  try {
    relations.value = await loadMaterialRelations(id)
  } finally {
    loading.value = false
  }
}

function thumbUrl(item: any) {
  const url = item?.url || item?.originUrl || ''
  return url ? getFastPreviewImageUrl(url, { width: 96, height: 96 }) : ''
}
</script>

<style scoped>
/* 缩略图触发胶囊：圆形高级暗色磨砂小胶囊 */
.relation-trigger {
  position: relative;
  display: inline-flex;
  width: 20px;
  height: 20px;
  box-sizing: border-box;
  margin: 0;
  padding: 0;
  appearance: none;
  -webkit-appearance: none;
  cursor: pointer;
  align-items: center;
  justify-content: center;
  line-height: 1;
  color: #ffffff;
  background: rgba(18, 20, 24, 0.68);
  backdrop-filter: blur(6px) saturate(140%);
  -webkit-backdrop-filter: blur(6px) saturate(140%);
  border: 1px solid rgba(255, 255, 255, 0.25);
  border-radius: 50%;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.35);
  outline: none;
  transition: all 160ms cubic-bezier(0.2, 0.8, 0.3, 1);
}

.relation-trigger:hover {
  color: #ffffff;
  background: #0284c7;
  border-color: #38bdf8;
  box-shadow: 0 3px 8px rgba(2, 132, 199, 0.45);
  transform: translateY(-1px) scale(1.1);
  z-index: 2;
}

.relation-trigger:active {
  transform: translateY(0) scale(0.92);
}

.relation-trigger:focus-visible {
  outline: 2px solid #0284c7;
  outline-offset: 1px;
}

/* 已有关联图高亮状态：带清爽蓝色微光环 */
.relation-trigger--linked {
  border-color: rgba(56, 189, 248, 0.8);
  box-shadow:
    0 1px 3px rgba(0, 0, 0, 0.35),
    0 0 0 1.5px rgba(56, 189, 248, 0.35);
}

/* 浮动卡片弹层全局圆角与阴影增强 */
:global(.relation-popover.el-popover) {
  padding: 12px !important;
  border-radius: 12px !important;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.16) !important;
}

:global(html.dark .relation-popover.el-popover),
:global(html[class*="dark"] .relation-popover.el-popover) {
  border-color: rgba(255, 255, 255, 0.12) !important;
  box-shadow: 0 12px 36px rgba(0, 0, 0, 0.6) !important;
}

.relation-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 32px;
}

.relation-card__section {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.relation-card__section + .relation-card__section {
  padding-top: 10px;
  border-top: 1px solid var(--el-border-color-lighter);
}

.relation-card__header {
  display: flex;
  gap: 6px;
  align-items: center;
}

.relation-card__title {
  font-size: 12px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.relation-card__count {
  padding: 0 5px;
  font-size: 11px;
  color: var(--el-text-color-secondary);
  background: var(--el-fill-color);
  border-radius: 999px;
}

.relation-card__header .relation-card__action {
  margin-left: auto;
}

.relation-card__thumbs {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}

.relation-card__thumb {
  width: 40px;
  height: 40px;
  overflow: hidden;
  cursor: zoom-in;
  background: var(--el-fill-color-lighter);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 5px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06);
  transition:
    transform 140ms cubic-bezier(0.2, 0.8, 0.3, 1),
    border-color 140ms ease,
    box-shadow 140ms ease;
}

.relation-card__thumb:hover {
  border-color: color-mix(in srgb, var(--el-color-primary) 45%, transparent);
  transform: translateY(-1px);
  box-shadow: 0 3px 8px rgba(0, 0, 0, 0.14);
}

.relation-card__thumb--empty {
  display: flex;
  font-size: 10px;
  color: var(--el-text-color-placeholder);
  cursor: default;
  align-items: center;
  justify-content: center;
}

.relation-card__rest {
  font-size: 11px;
  color: var(--el-text-color-secondary);
}

.relation-card__list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.relation-card__item {
  padding: 4px 0;
  border-bottom: 1px dashed var(--el-border-color-lighter);
}

.relation-card__item:last-child {
  border-bottom: none;
}

.relation-card__item-main {
  display: flex;
  gap: 6px;
  align-items: center;
  justify-content: space-between;
}

.relation-card__item-name {
  overflow: hidden;
  font-size: 12px;
  color: var(--el-text-color-primary);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.relation-card__item-meta {
  display: flex;
  gap: 8px;
  font-size: 11px;
  color: var(--el-text-color-secondary);
}

.relation-card__item-meta span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.relation-card__hint {
  font-size: 11px;
  color: var(--el-text-color-placeholder);
}

.relation-card__empty-tip {
  padding: 8px 4px;
  font-size: 12px;
  line-height: 1.4;
  color: var(--el-text-color-secondary);
}

.relation-card__error {
  margin: 0;
  font-size: 12px;
  color: var(--el-color-danger);
}

.relation-card__action {
  display: inline-flex;
  gap: 2px;
  align-items: center;
  padding: 2px 8px;
  margin: 0;
  font-size: 12px;
  font-weight: 500;
  color: var(--el-color-primary);
  cursor: pointer;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 6px;
  transition:
    background-color 140ms ease,
    border-color 140ms ease,
    color 140ms ease;
}

.relation-card__action:hover {
  color: var(--el-color-primary-light-3);
  background: color-mix(in srgb, var(--el-color-primary) 9%, transparent);
  border-color: color-mix(in srgb, var(--el-color-primary) 20%, transparent);
}

.relation-card__action:focus-visible {
  outline: 2px solid var(--el-color-primary);
  outline-offset: 1px;
}

.relation-card__action--block {
  align-self: flex-start;
}
</style>
