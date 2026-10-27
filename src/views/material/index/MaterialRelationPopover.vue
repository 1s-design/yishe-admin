<template>
  <el-popover
    placement="right"
    trigger="hover"
    :width="340"
    :show-after="350"
    :hide-after="120"
    popper-class="material-relation-popper"
    :popper-style="{ padding: '12px 14px', borderRadius: '10px' }"
    @before-enter="load"
  >
    <template #reference>
      <button
        type="button"
        class="relation-trigger"
        :class="{ 'relation-trigger--linked': hasRelated }"
        title="查看关联详情"
        @click.stop="emit('open-publish', row)"
      >
        <el-icon :size="11"><Link /></el-icon>
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
      </section>

      <section class="relation-card__section">
        <header class="relation-card__header">
          <span class="relation-card__title">发布绑定</span>
          <span v-if="bindings.length" class="relation-card__count">{{ bindings.length }}</span>
          <span v-else-if="!loading" class="relation-card__hint">未绑定</span>
        </header>
        <ul v-if="bindings.length" class="relation-card__list">
          <li v-for="item in bindings.slice(0, 5)" :key="item.id" class="relation-card__item">
            <div class="relation-card__item-main">
              <span class="relation-card__item-name">{{ item.publishConfig?.name || item.publishConfigId || '-' }}</span>
              <el-tag :type="statusTag(item.status)" size="small">{{ statusLabel(item.status) }}</el-tag>
            </div>
            <div class="relation-card__item-meta">
              <span v-if="item.taskId" :title="String(item.taskId)">{{ shortId(item.taskId) }}</span>
              <span>{{ formatTime(item.createTime) }}</span>
            </div>
          </li>
        </ul>
        <button
          v-if="bindings.length > 5"
          type="button"
          class="relation-card__action relation-card__action--block"
          @click.stop="emit('open-publish', row)"
        >
          查看全部 {{ bindings.length }} 条
          <el-icon :size="11"><ArrowRight /></el-icon>
        </button>
      </section>

      <p v-for="message in errors" :key="message" class="relation-card__error">{{ message }}</p>
    </div>
  </el-popover>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { ArrowRight, Link } from '@element-plus/icons-vue'
import { formatDate } from '@/utils/formatTime'
import { getFastPreviewImageUrl } from '@/utils/image'
import {
  loadMaterialRelations,
  PUBLISH_BINDING_STATUS_LABELS,
  PUBLISH_BINDING_STATUS_TAGS,
  type MaterialRelations
} from './useMaterialRelations'

const props = defineProps<{ row: any }>()

const emit = defineEmits<{
  (e: 'open-manage', row: any): void
  (e: 'open-publish', row: any): void
}>()

const loading = ref(false)
const relations = ref<MaterialRelations>({ related: [], bindings: [], errors: [] })

const related = computed(() => relations.value.related)
const bindings = computed(() => relations.value.bindings)
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

/** 卡内只做预览，36 位任务 ID 只留尾段，完整值放 title */
function shortId(value: any) {
  const text = String(value || '')
  return text.length > 12 ? `…${text.slice(-8)}` : text
}

function statusLabel(status?: string) {
  return PUBLISH_BINDING_STATUS_LABELS[String(status || '')] || String(status || '-')
}

function statusTag(status?: string) {
  return PUBLISH_BINDING_STATUS_TAGS[String(status || '')] || 'info'
}

function formatTime(value: any) {
  if (!value) return '-'
  try {
    return formatDate(value)
  } catch {
    return String(value)
  }
}
</script>

<style scoped>
.relation-trigger {
  display: inline-flex;
  width: 20px;
  height: 20px;
  padding: 0;
  color: rgba(255, 255, 255, 0.92);
  cursor: pointer;
  background: rgba(18, 20, 24, 0.58);
  backdrop-filter: blur(6px) saturate(150%);
  border: 1px solid rgba(255, 255, 255, 0.24);
  border-radius: 50%;
  box-shadow:
    0 1px 3px rgba(0, 0, 0, 0.32),
    inset 0 1px 0 rgba(255, 255, 255, 0.18);
  transition:
    transform 160ms cubic-bezier(0.2, 0.8, 0.3, 1),
    background-color 160ms ease,
    border-color 160ms ease,
    box-shadow 160ms ease;
  align-items: center;
  justify-content: center;
}

.relation-trigger:hover {
  color: #fff;
  background: rgba(18, 20, 24, 0.76);
  border-color: rgba(255, 255, 255, 0.4);
  transform: translateY(-1px);
  box-shadow:
    0 3px 8px rgba(0, 0, 0, 0.36),
    inset 0 1px 0 rgba(255, 255, 255, 0.24);
}

.relation-trigger:active {
  transform: translateY(0) scale(0.94);
}

.relation-trigger:focus-visible {
  outline: 2px solid var(--el-color-primary);
  outline-offset: 1px;
}

.relation-trigger--linked {
  border-color: color-mix(in srgb, var(--el-color-primary) 55%, rgba(255, 255, 255, 0.3));
  box-shadow:
    0 1px 3px rgba(0, 0, 0, 0.32),
    0 0 0 2px color-mix(in srgb, var(--el-color-primary) 22%, transparent),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
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
