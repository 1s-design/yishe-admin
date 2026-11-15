<template>
  <el-dialog
    v-model="visible"
    fullscreen
    append-to-body
    destroy-on-close
    :show-close="false"
    class="media-preview-dialog"
    @open="loadAll"
  >
    <div class="mp">
      <header class="mp__header">
        <div class="mp__header-left">
          <span class="mp__platform">{{ platformLabel }}</span>
          <span v-if="variantLabel" class="mp__variant">{{ variantLabel }}</span>
          <span class="mp__desc" :title="taskDescription">{{ taskDescription }}</span>
        </div>
        <div class="mp__header-right">
          <span class="mp__review-pill" :class="`mp__review-pill--${reviewStatus}`">
            <i class="mp__review-dot"></i>{{ reviewStatusText }}
          </span>
          <el-button link class="mp__close" @click="visible = false">
            <el-icon :size="18"><Close /></el-icon>
          </el-button>
        </div>
      </header>

      <div v-loading="loading" class="mp__body">
        <main class="mp__stage">
          <template v-if="!loading && ready">
            <div v-if="displayFields.length" class="mp-doc">
              <section v-for="field in displayFields" :key="field.key" class="mp-section">
                <span class="mp-section__label">{{ field.label }}</span>
                <h2 v-if="field.kind === 'title'" class="mp-section__title">{{ field.text }}</h2>
                <p v-else-if="field.kind === 'text'" class="mp-section__text">{{ field.text }}</p>
                <div v-else-if="field.kind === 'tags'" class="mp-section__tags">
                  <span v-for="tag in field.items" :key="tag" class="mp-tag">{{ tag }}</span>
                </div>
                <div
                  v-else-if="field.kind === 'images'"
                  class="mp-section__images"
                  :class="`mp-section__images--${field.cols}`"
                >
                  <el-image
                    v-for="(img, i) in field.urls"
                    :key="i"
                    :src="img"
                    :preview-src-list="field.urls"
                    :initial-index="i"
                    fit="cover"
                    class="mp-section__img"
                    preview-teleported
                  />
                </div>
                <template v-else-if="field.kind === 'videos'">
                  <video
                    v-for="(src, i) in field.urls"
                    :key="i"
                    :src="src"
                    controls
                    preload="metadata"
                    class="mp-section__video"
                  ></video>
                </template>
                <p v-else class="mp-section__text">{{ field.text }}</p>
              </section>
            </div>
            <div v-else class="mp-doc-empty">{{ t('mediaPreview.noContent') }}</div>
          </template>

          <el-empty v-if="!loading && !ready" :description="loadError || t('mediaPreview.loadFailed')">
            <el-button size="small" @click="loadAll">{{ t('mediaPreview.retry') }}</el-button>
          </el-empty>
        </main>

        <aside class="mp__side">
          <section class="mp-side__section">
            <h4 class="mp-side__heading">{{ t('mediaPreview.specFields') }}</h4>
            <p v-if="!variantSchema" class="mp-side__note">{{ t('mediaPreview.noSchema') }}</p>
            <div v-for="field in specFields" :key="field.key" class="mp-spec-field">
              <div class="mp-spec-field__head">
                <span class="mp-spec-field__label">
                  {{ field.label }}<i v-if="field.required" class="mp-spec-field__required">*</i>
                </span>
                <span class="mp-spec-field__state" :class="`mp-spec-field__state--${field.state}`">
                  {{ field.stateText }}
                </span>
              </div>
              <code class="mp-spec-field__key">{{ field.key }}</code>
              <p v-if="field.summary" class="mp-spec-field__summary">{{ field.summary }}</p>
            </div>
          </section>

          <section class="mp-side__section">
            <h4 class="mp-side__heading">{{ t('mediaPreview.taskInfo') }}</h4>
            <div class="mp-info-row"><span>{{ t('mediaPreview.platform') }}</span><b>{{ platformLabel }}</b></div>
            <div v-if="variantLabel" class="mp-info-row"><span>{{ t('mediaPreview.variant') }}</span><b>{{ variantLabel }}</b></div>
            <div class="mp-info-row"><span>{{ t('mediaPreview.source') }}</span><b>{{ sourceText }}</b></div>
            <div v-if="createdAtText" class="mp-info-row"><span>{{ t('mediaPreview.createdAt') }}</span><b>{{ createdAtText }}</b></div>
          </section>

          <section v-if="reviewStatus !== 'none'" class="mp-side__section">
            <h4 class="mp-side__heading">{{ t('mediaPreview.reviewRecord') }}</h4>
            <div class="mp-info-row"><span>{{ t('mediaPreview.reviewStatus') }}</span><b>{{ reviewStatusText }}</b></div>
            <div v-if="reviewInfo.reviewedByName" class="mp-info-row"><span>{{ t('mediaPreview.reviewedBy') }}</span><b>{{ reviewInfo.reviewedByName }}</b></div>
            <div v-if="reviewInfo.reviewedAt" class="mp-info-row"><span>{{ t('mediaPreview.reviewedAt') }}</span><b>{{ formatTime(reviewInfo.reviewedAt) }}</b></div>
            <p v-if="reviewInfo.reason" class="mp-side__reason">{{ reviewInfo.reason }}</p>
          </section>

          <section class="mp-side__section">
            <h4 class="mp-side__heading">{{ t('mediaPreview.publishResult') }}</h4>
            <div class="mp-info-row"><span>{{ t('mediaPreview.publishPhase') }}</span><b>{{ publishPhaseText }}</b></div>
            <div v-if="dispatchInfo.profileId" class="mp-info-row"><span>{{ t('mediaPreview.execProfile') }}</span><b>{{ dispatchInfo.profileId }}</b></div>
            <div v-if="dispatchInfo.attemptCount" class="mp-info-row"><span>{{ t('mediaPreview.execAttempts') }}</span><b>{{ dispatchInfo.attemptCount }}</b></div>
            <div v-if="dispatchInfo.finishedAt" class="mp-info-row"><span>{{ t('mediaPreview.finishedAt') }}</span><b>{{ formatTime(dispatchInfo.finishedAt) }}</b></div>
            <p v-if="dispatchInfo.lastError" class="mp-side__reason">{{ dispatchInfo.lastError }}</p>
          </section>
        </aside>
      </div>

      <footer class="mp__footer">
        <template v-if="!rejectMode">
          <span class="mp__footer-hint">{{ footerHint }}</span>
          <div class="mp__footer-actions">
            <el-button type="danger" plain :loading="submitting" @click="enterRejectMode">
              {{ t('mediaPreview.reject') }}
            </el-button>
            <el-button type="success" :loading="submitting" @click="submitReview('approve')">
              {{ t('mediaPreview.approve') }}
            </el-button>
          </div>
        </template>
        <template v-else>
          <el-input
            v-model="rejectReason"
            type="textarea"
            :rows="2"
            maxlength="500"
            show-word-limit
            :placeholder="t('mediaPreview.reasonPlaceholder')"
            class="mp__reason-input"
          />
          <div class="mp__footer-actions">
            <el-button @click="rejectMode = false">{{ t('mediaPreview.cancel') }}</el-button>
            <el-button type="danger" :loading="submitting" :disabled="!rejectReason.trim()" @click="submitReview('reject')">
              {{ t('mediaPreview.confirmReject') }}
            </el-button>
          </div>
        </template>
      </footer>
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { ElMessage } from 'element-plus';
import { Close } from '@element-plus/icons-vue';
import { useI18n } from '@/hooks/web/useI18n';
import { getTaskDetail, reviewPublishTasks } from '@/api/system/queue';
import {
  getMediaPublishSchemas,
  type MediaPublishFieldRule,
  type MediaPublishVariant
} from '@/api/mediaPublish';
import { derivePublishPhase, getPublishDispatchInfo, PHASE_LABEL_KEY } from '../publishStatus';

const props = defineProps<{ modelValue: boolean; task: Record<string, any> | null }>();
const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'reviewed', payload: { id: string; action: 'approve' | 'reject' }): void;
}>();

const { t } = useI18n();

const visible = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit('update:modelValue', value)
});

const loading = ref(false);
const ready = ref(false);
const loadError = ref('');
const submitting = ref(false);
const rejectMode = ref(false);
const rejectReason = ref('');

const taskData = ref<Record<string, any>>({});
const taskMetadata = ref<Record<string, any>>({});
const variantSchema = ref<MediaPublishVariant | null>(null);
const platformLabelFromSchema = ref('');

const PLATFORM_LABELS: Record<string, string> = {
  weibo: '微博',
  douyin: '抖音',
  xiaohongshu: '小红书',
  kuaishou: '快手',
  tiktok: 'TikTok',
  youtube: 'YouTube'
};

function parseMaybeJson(value: any) {
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function getValueByPath(source: any, path: string): any {
  const segments = String(path || '').split('.').filter(Boolean);
  let cursor = source;
  for (const segment of segments) {
    if (!cursor || typeof cursor !== 'object') return undefined;
    cursor = cursor[segment];
  }
  return cursor;
}

/** 直发任务（direct-task）没有 canonical payload，从 publishData 归一到规范结构 */
function canonicalFromPublishData(publishData: Record<string, any>) {
  const images = Array.isArray(publishData?.images) ? publishData.images : [];
  const video = publishData?.video;
  return {
    title: publishData?.title || '',
    text: {
      content: publishData?.content || publishData?.description || '',
      tags: Array.isArray(publishData?.tags) ? publishData.tags : []
    },
    media: {
      images: images.filter(Boolean).map((source: string) => ({ source })),
      videos: video ? [{ source: video }] : []
    }
  };
}

const canonical = computed<Record<string, any>>(() => {
  const payload = parseMaybeJson(taskData.value?.payload);
  if (payload && typeof payload === 'object' && Object.keys(payload).length) return payload;
  const publishData = parseMaybeJson(taskData.value?.publishData) ?? taskData.value?.publishData;
  if (publishData && typeof publishData === 'object') return canonicalFromPublishData(publishData);
  return {};
});

const platformKey = computed(() => {
  const meta = taskData.value?.meta || {};
  return String(
    taskMetadata.value?.platform || meta.platform || canonical.value?.platform || props.task?.metadata?.platform || ''
  ).trim().toLowerCase();
});

const platformLabel = computed(() => platformLabelFromSchema.value || PLATFORM_LABELS[platformKey.value] || platformKey.value || '-');

const variantLabel = computed(() => {
  const meta = taskData.value?.meta || {};
  return variantSchema.value?.label || meta.variantLabel || '';
});

const taskDescription = computed(() => String(props.task?.description || '').trim());

function mediaUrls(key: string): string[] {
  const raw = getValueByPath(canonical.value, key);
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => (typeof item === 'string' ? item : String(item?.source || '').trim()))
    .filter(Boolean);
}

const sourceText = computed(() => {
  const source = String(taskMetadata.value?.source || props.task?.metadata?.source || '').trim();
  if (source === 'agent') return t('mediaPreview.sourceAgent');
  if (source === 'direct-task') return t('mediaPreview.sourceDirect');
  return source || '-';
});

const createdAtText = computed(() => formatTime(props.task?.createdAt || ''));

const reviewInfo = computed(() => {
  const raw = taskMetadata.value?.publishReview ?? props.task?.metadata?.publishReview;
  return raw && typeof raw === 'object' ? raw : {};
});

const reviewStatus = computed(() => {
  const status = String(reviewInfo.value?.status || '').trim();
  return ['pending', 'approved', 'rejected'].includes(status) ? status : 'none';
});

const reviewStatusText = computed(() => {
  const map: Record<string, string> = {
    pending: t('mediaPreview.statusPending'),
    approved: t('mediaPreview.statusApproved'),
    rejected: t('mediaPreview.statusRejected'),
    none: t('mediaPreview.statusNone')
  };
  return map[reviewStatus.value];
});

const footerHint = computed(() => {
  if (reviewStatus.value === 'approved') return t('mediaPreview.hintApproved');
  if (reviewStatus.value === 'rejected') return t('mediaPreview.hintRejected');
  return t('mediaPreview.hintPending');
});

const publishSource = computed(() => ({
  metadata: Object.keys(taskMetadata.value || {}).length ? taskMetadata.value : props.task?.metadata || {},
  status: props.task?.status || ''
}));
const dispatchInfo = computed(() => getPublishDispatchInfo(publishSource.value));
const publishPhaseText = computed(() => t(PHASE_LABEL_KEY[derivePublishPhase(publishSource.value)]));

function formatTime(value: any) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function isEmptyValue(value: any): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return !value.trim();
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
}

function summarizeValue(rule: MediaPublishFieldRule, value: any): string {
  if (isEmptyValue(value)) return '';
  if (rule.type === 'mediaItems') {
    const isVideo = rule.key.includes('video');
    return t(isVideo ? 'mediaPreview.videoCount' : 'mediaPreview.imageCount', { count: value.length });
  }
  if (Array.isArray(value)) return value.map((item) => String(item)).join('、');
  if (typeof value === 'object') return JSON.stringify(value);
  if (typeof value === 'boolean') return value ? t('mediaPreview.yes') : t('mediaPreview.no');
  return String(value);
}

/** 侧栏规范字段清单：完全由变体 schema 驱动 */
const specFields = computed(() => {
  const fields = variantSchema.value?.fields || [];
  return fields.map((rule) => {
    const value = getValueByPath(canonical.value, rule.key);
    const empty = isEmptyValue(value);
    const state = empty ? (rule.required ? 'missing' : 'empty') : 'filled';
    const stateText =
      state === 'missing'
        ? t('mediaPreview.stateMissing')
        : state === 'empty'
          ? t('mediaPreview.stateEmpty')
          : t('mediaPreview.stateFilled');
    const summary = summarizeValue(rule, value);
    return {
      key: rule.key,
      label: rule.label,
      required: !!rule.required,
      state,
      stateText,
      summary: summary.length > 80 ? `${summary.slice(0, 80)}…` : summary
    };
  });
});

interface DisplayField {
  key: string;
  label: string;
  kind: 'title' | 'text' | 'tags' | 'images' | 'videos';
  text: string;
  items: string[];
  urls: string[];
  cols: number;
}

/** 无 schema 时的兜底字段序（有 schema 时严格按规范字段序分区） */
const FALLBACK_FIELDS = [
  { key: 'title', labelKey: 'mediaPreview.fallbackTitle', type: 'string' },
  { key: 'text.content', labelKey: 'mediaPreview.fallbackContent', type: 'string' },
  { key: 'text.tags', labelKey: 'mediaPreview.fallbackTags', type: 'string[]' },
  { key: 'media.images', labelKey: 'mediaPreview.fallbackImages', type: 'mediaItems' },
  { key: 'media.videos', labelKey: 'mediaPreview.fallbackVideos', type: 'mediaItems' }
];

function imageCols(count: number) {
  if (count === 1) return 1;
  if (count === 2 || count === 4) return 2;
  return 3;
}

function toDisplayField(key: string, label: string, type: string, value: any): DisplayField | null {
  if (isEmptyValue(value)) return null;
  if (type === 'mediaItems') {
    const urls = (Array.isArray(value) ? value : [])
      .map((item: any) => (typeof item === 'string' ? item : String(item?.source || '').trim()))
      .filter(Boolean);
    if (!urls.length) return null;
    const isVideo = key.includes('video');
    return { key, label, kind: isVideo ? 'videos' : 'images', text: '', items: [], urls, cols: imageCols(urls.length) };
  }
  if (type === 'string[]') {
    const items = (Array.isArray(value) ? value : []).map((item) => String(item).trim()).filter(Boolean);
    if (!items.length) return null;
    return { key, label, kind: 'tags', text: '', items, urls: [], cols: 0 };
  }
  const text = summarizeValue({ key, label, type } as MediaPublishFieldRule, value);
  if (!text) return null;
  return { key, label, kind: key === 'title' ? 'title' : 'text', text, items: [], urls: [], cols: 0 };
}

/** 主区：每个规范字段独立分区（标题/文案/标签/图片/视频/标量），空字段不出分区 */
const displayFields = computed<DisplayField[]>(() => {
  const rules = variantSchema.value?.fields?.length
    ? variantSchema.value.fields.map((rule) => ({ key: rule.key, label: rule.label, type: rule.type as string }))
    : FALLBACK_FIELDS.map((field) => ({ key: field.key, label: t(field.labelKey), type: field.type }));
  return rules
    .map((rule) => toDisplayField(rule.key, rule.label, rule.type, getValueByPath(canonical.value, rule.key)))
    .filter((field): field is DisplayField => !!field);
});

/** 与队列页 normalizeTaskDetailMessageResponse 同口径：剥掉 success/data 包裹 */
function normalizeDetailResponse(payload: any) {
  if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
    if ('success' in payload) {
      if (payload.success === false) {
        throw new Error(String(payload.message || ''));
      }
      return payload.data;
    }
    if ('data' in payload && !('id' in payload)) {
      return payload.data;
    }
  }
  return payload;
}

async function loadAll() {
  const row = props.task;
  if (!row?.id) return;
  loading.value = true;
  ready.value = false;
  loadError.value = '';
  rejectMode.value = false;
  rejectReason.value = '';
  variantSchema.value = null;
  platformLabelFromSchema.value = '';

  const queue = String(row.queue || row.type || '').trim();
  const platform = String(row?.metadata?.platform || '').trim().toLowerCase();

  try {
    const [detailRes, schemas] = await Promise.all([
      getTaskDetail(queue, String(row.id)),
      platform ? getMediaPublishSchemas(platform).catch(() => []) : Promise.resolve([])
    ]);

    const message = normalizeDetailResponse((detailRes as any)?.data ?? detailRes);
    const data = parseMaybeJson(message?.data) ?? parseMaybeJson(row.data) ?? row.data ?? {};
    taskData.value = data && typeof data === 'object' ? data : {};
    taskMetadata.value = message?.metadata ?? row.metadata ?? {};

    const platformSchema = (schemas || []).find((item) => item.platform === platformKey.value);
    if (platformSchema) {
      platformLabelFromSchema.value = platformSchema.platformLabel || '';
      const variantKey = String(taskData.value?.meta?.variant || '').trim();
      const variants = platformSchema.variants || [];
      variantSchema.value =
        variants.find((item) => item.variant === variantKey) ||
        (variants.length === 1 ? variants[0] : null);
      if (!variantSchema.value && variants.length > 1) {
        const hasVideo = mediaUrls('media.videos').length > 0;
        variantSchema.value = variants.find((item) => item.variant === (hasVideo ? 'video' : 'image-text')) || null;
      }
    }
    ready.value = true;
  } catch (error: any) {
    loadError.value = error?.message || '';
    const fallbackData = parseMaybeJson(row.data) ?? row.data ?? {};
    taskData.value = fallbackData && typeof fallbackData === 'object' ? fallbackData : {};
    taskMetadata.value = row.metadata ?? {};
    ready.value = Object.keys(taskData.value).length > 0;
  } finally {
    loading.value = false;
  }
}

function enterRejectMode() {
  rejectMode.value = true;
  rejectReason.value = '';
}

async function submitReview(action: 'approve' | 'reject') {
  const row = props.task;
  if (!row?.id || submitting.value) return;
  if (action === 'reject' && !rejectReason.value.trim()) {
    ElMessage.warning(t('mediaPreview.reasonRequired'));
    return;
  }
  submitting.value = true;
  try {
    const response: any = await reviewPublishTasks(
      [String(row.id)],
      action,
      action === 'reject' ? rejectReason.value.trim() : undefined
    );
    const data = response?.data ?? response ?? {};
    const skipped: Array<{ id: string; reason: string }> = Array.isArray(data.skipped) ? data.skipped : [];
    if (skipped.length) {
      ElMessage.warning(skipped.map((item) => item.reason).join('、'));
      return;
    }
    ElMessage.success(action === 'approve' ? t('mediaPreview.approveSuccess') : t('mediaPreview.rejectSuccess'));
    emit('reviewed', { id: String(row.id), action });
    visible.value = false;
  } catch (error: any) {
    ElMessage.error(error?.message || t('mediaPreview.reviewFailed'));
  } finally {
    submitting.value = false;
  }
}
</script>

<style lang="less" scoped>
.mp {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
  height: 100%;
}

.mp__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 24px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.mp__header-left {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.mp__platform {
  flex-shrink: 0;
  padding: 2px 10px;
  border-radius: 6px;
  background: var(--el-fill-color);
  color: var(--el-text-color-primary);
  font-size: 13px;
  font-weight: 600;
}

.mp__variant {
  flex-shrink: 0;
  padding: 1px 8px;
  border: 1px solid var(--el-border-color);
  border-radius: 6px;
  color: var(--el-text-color-secondary);
  font-size: 12px;
}

.mp__desc {
  overflow: hidden;
  color: var(--el-text-color-secondary);
  font-size: 13px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mp__header-right {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-shrink: 0;
}

.mp__review-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 2px 10px;
  border-radius: 999px;
  font-size: 12px;
}

.mp__review-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}

.mp__review-pill--pending {
  background: var(--el-color-warning-light-9);
  color: var(--el-color-warning);
}

.mp__review-pill--approved {
  background: var(--el-color-success-light-9);
  color: var(--el-color-success);
}

.mp__review-pill--rejected {
  background: var(--el-color-danger-light-9);
  color: var(--el-color-danger);
}

.mp__review-pill--none {
  background: var(--el-fill-color);
  color: var(--el-text-color-secondary);
}

.mp__close {
  color: var(--el-text-color-secondary);
}

.mp__body {
  display: flex;
  flex: 1;
  min-height: 0;
}

.mp__stage {
  flex: 1;
  min-width: 0;
  overflow-y: auto;
  padding: 40px 48px;
  background: var(--el-bg-color);
}

.mp-doc {
  display: flex;
  flex-direction: column;
  gap: 28px;
  max-width: 680px;
  margin: 0 auto;
}

.mp-doc-empty {
  max-width: 680px;
  margin: 0 auto;
  color: var(--el-text-color-placeholder);
  font-size: 13px;
}

.mp-section__label {
  display: block;
  margin-bottom: 8px;
  color: var(--el-text-color-secondary);
  font-size: 12px;
}

.mp-section__title {
  margin: 0;
  color: var(--el-text-color-primary);
  font-size: 20px;
  font-weight: 600;
  line-height: 1.4;
  word-break: break-word;
}

.mp-section__text {
  margin: 0;
  color: var(--el-text-color-primary);
  font-size: 14px;
  line-height: 1.9;
  white-space: pre-wrap;
  word-break: break-word;
}

.mp-section__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.mp-tag {
  padding: 2px 10px;
  border-radius: 6px;
  background: var(--el-fill-color-light);
  color: var(--el-text-color-regular);
  font-size: 12px;
}

.mp-section__images {
  display: grid;
  gap: 8px;
}

.mp-section__images--1 {
  grid-template-columns: 1fr;
  max-width: 320px;
}

.mp-section__images--2 {
  grid-template-columns: repeat(2, 1fr);
  max-width: 400px;
}

.mp-section__images--3 {
  grid-template-columns: repeat(3, 1fr);
  max-width: 480px;
}

.mp-section__img {
  width: 100%;
  aspect-ratio: 1;
  border-radius: 8px;
  cursor: zoom-in;
}

.mp-section__video {
  width: 100%;
  max-height: 480px;
  border-radius: 8px;
  background: #000;
}

.mp__side {
  display: flex;
  flex-direction: column;
  gap: 24px;
  width: 320px;
  flex-shrink: 0;
  overflow-y: auto;
  padding: 20px;
  border-left: 1px solid var(--el-border-color-lighter);
}

.mp-side__heading {
  margin: 0 0 12px;
  color: var(--el-text-color-primary);
  font-size: 13px;
  font-weight: 600;
}

.mp-side__note {
  margin: 0 0 10px;
  color: var(--el-text-color-secondary);
  font-size: 12px;
  line-height: 1.6;
}

.mp-side__reason {
  margin: 8px 0 0;
  padding: 8px 10px;
  border-radius: 6px;
  background: var(--el-fill-color-light);
  color: var(--el-text-color-regular);
  font-size: 12px;
  line-height: 1.6;
  word-break: break-word;
}

.mp-spec-field {
  padding: 8px 0;
  border-bottom: 1px solid var(--el-border-color-lighter);

  &:last-child {
    border-bottom: none;
  }
}

.mp-spec-field__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.mp-spec-field__label {
  color: var(--el-text-color-primary);
  font-size: 13px;
}

.mp-spec-field__required {
  margin-left: 2px;
  color: var(--el-color-danger);
  font-style: normal;
}

.mp-spec-field__state {
  flex-shrink: 0;
  font-size: 11px;
}

.mp-spec-field__state--filled {
  color: var(--el-color-success);
}

.mp-spec-field__state--empty {
  color: var(--el-text-color-placeholder);
}

.mp-spec-field__state--missing {
  color: var(--el-color-danger);
}

.mp-spec-field__key {
  display: block;
  margin-top: 2px;
  color: var(--el-text-color-secondary);
  font-family: 'JetBrains Mono', 'SFMono-Regular', Consolas, monospace;
  font-size: 11px;
}

.mp-spec-field__summary {
  margin: 4px 0 0;
  color: var(--el-text-color-regular);
  font-size: 12px;
  line-height: 1.5;
  word-break: break-word;
}

.mp-info-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  padding: 5px 0;
  font-size: 12px;

  span {
    flex-shrink: 0;
    color: var(--el-text-color-secondary);
  }

  b {
    color: var(--el-text-color-primary);
    font-weight: 500;
    text-align: right;
    word-break: break-all;
  }
}

.mp__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 12px 24px;
  border-top: 1px solid var(--el-border-color-lighter);
}

.mp__footer-hint {
  color: var(--el-text-color-secondary);
  font-size: 12px;
}

.mp__footer-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.mp__reason-input {
  flex: 1;
}
</style>

<style>
.media-preview-dialog.is-fullscreen {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.media-preview-dialog .el-dialog__header {
  display: none;
}

.media-preview-dialog .el-dialog__body {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
  padding: 0;
  overflow: hidden;
}
</style>