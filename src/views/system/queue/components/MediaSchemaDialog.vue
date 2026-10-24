<template>
  <el-dialog
    v-model="visible"
    :title="t('mediaSchema.title')"
    width="960"
    append-to-body
    destroy-on-close
    class="media-schema-dialog"
    @open="loadSchemas"
  >
    <div class="media-schema-dialog__header">
      <span class="media-schema-dialog__desc">{{ t('mediaSchema.desc') }}</span>
      <el-button size="small" :loading="loading" @click="loadSchemas">{{ t('mediaSchema.refresh') }}</el-button>
    </div>

    <el-radio-group v-if="schemas.length" v-model="activePlatform" class="media-schema-dialog__platforms">
      <el-radio-button v-for="item in schemas" :key="item.platform" :value="item.platform">
        {{ item.platformLabel }}
      </el-radio-button>
    </el-radio-group>

    <div v-loading="loading" class="media-schema-dialog__body">
      <section v-for="variant in currentVariants" :key="variant.variant" class="media-schema-card">
        <div class="media-schema-card__header">
          <div class="media-schema-card__title">
            <span>{{ variant.label }}</span>
            <code>{{ variant.variant }}</code>
            <span v-if="currentPlatform" class="media-schema-card__task-type">{{ currentPlatform.taskType }}</span>
          </div>
          <div v-if="variant.description" class="media-schema-card__desc">{{ variant.description }}</div>
        </div>

        <el-table :data="variant.fields" size="small" class="media-schema-card__table">
          <el-table-column :label="t('mediaSchema.fieldKey')" min-width="210">
            <template #default="{ row }">
              <code class="media-schema-card__key">{{ row.key }}</code>
            </template>
          </el-table-column>
          <el-table-column :label="t('mediaSchema.fieldLabel')" min-width="120">
            <template #default="{ row }">{{ row.label }}</template>
          </el-table-column>
          <el-table-column :label="t('mediaSchema.fieldType')" width="100">
            <template #default="{ row }">{{ typeLabel(row.type) }}</template>
          </el-table-column>
          <el-table-column :label="t('mediaSchema.fieldRequired')" width="70">
            <template #default="{ row }">
              {{ row.required ? t('mediaSchema.required') : t('mediaSchema.optional') }}
            </template>
          </el-table-column>
          <el-table-column :label="t('mediaSchema.fieldLimits')" width="140">
            <template #default="{ row }">{{ formatLimits(row) }}</template>
          </el-table-column>
          <el-table-column :label="t('mediaSchema.fieldDesc')" min-width="180">
            <template #default="{ row }">{{ row.description || '-' }}</template>
          </el-table-column>
        </el-table>

        <div class="media-schema-card__example">
          <div class="media-schema-card__example-header">
            <span>{{ t('mediaSchema.example') }}</span>
            <el-button link type="primary" size="small" @click="copyExample(variant)">
              {{ t('mediaSchema.copy') }}
            </el-button>
          </div>
          <pre class="media-schema-card__code">{{ buildExample(variant) }}</pre>
        </div>
      </section>

      <el-empty v-if="!loading && !currentVariants.length" :description="t('mediaSchema.empty')" />
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { ElMessage } from 'element-plus';
import { useI18n } from '@/hooks/web/useI18n';
import {
  getMediaPublishSchemas,
  type MediaPublishFieldRule,
  type MediaPublishPlatformSchema,
  type MediaPublishVariant
} from '@/api/mediaPublish';

const props = defineProps<{ modelValue: boolean }>();
const emit = defineEmits<{ (e: 'update:modelValue', value: boolean): void }>();

const { t } = useI18n();

const visible = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit('update:modelValue', value)
});

const loading = ref(false);
const schemas = ref<MediaPublishPlatformSchema[]>([]);
const activePlatform = ref('');

const currentPlatform = computed(() => schemas.value.find((item) => item.platform === activePlatform.value));
const currentVariants = computed(() => currentPlatform.value?.variants || []);

const typeLabels = computed<Record<string, string>>(() => ({
  string: t('mediaSchema.typeString'),
  'string[]': t('mediaSchema.typeStringArray'),
  mediaItems: t('mediaSchema.typeMediaItems'),
  boolean: t('mediaSchema.typeBoolean'),
  number: t('mediaSchema.typeNumber'),
  object: t('mediaSchema.typeObject')
}));

function typeLabel(type: string) {
  return typeLabels.value[type] || type || '-';
}

function formatLimits(rule: MediaPublishFieldRule) {
  const parts: string[] = [];
  if (rule.minItems !== undefined && rule.maxItems !== undefined) {
    parts.push(t('mediaSchema.limitRange', { min: rule.minItems, max: rule.maxItems }));
  } else if (rule.minItems !== undefined) {
    parts.push(t('mediaSchema.limitMin', { min: rule.minItems }));
  } else if (rule.maxItems !== undefined) {
    parts.push(t('mediaSchema.limitMax', { max: rule.maxItems }));
  }
  if (rule.maxLength !== undefined) {
    parts.push(t('mediaSchema.limitLength', { max: rule.maxLength }));
  }
  return parts.length ? parts.join(' / ') : '-';
}

/** 生成字段示例值，仅用于展示数据结构 */
function sampleValue(rule: MediaPublishFieldRule) {
  switch (rule.type) {
    case 'mediaItems': {
      const kind = rule.key.includes('video') ? 'video' : 'image';
      return [
        {
          source: kind === 'video' ? 'https://example.com/demo.mp4' : 'https://example.com/demo.jpg',
          kind
        }
      ];
    }
    case 'string[]':
      return [rule.label];
    case 'string':
      if (rule.key.endsWith('scheduleTime')) {
        return '2026-12-31T20:00:00+08:00';
      }
      if (rule.key.endsWith('title')) {
        return '示例标题';
      }
      if (rule.key.endsWith('privacy')) {
        return 'public';
      }
      return `${rule.label}示例`;
    case 'boolean':
      return false;
    case 'number':
      return 0;
    case 'object':
      return {};
    default:
      return undefined;
  }
}

function setByPath(target: Record<string, any>, path: string, value: unknown) {
  const segments = String(path || '')
    .split('.')
    .map((segment) => segment.trim())
    .filter(Boolean);
  if (!segments.length) {
    return;
  }
  let cursor = target;
  segments.forEach((segment, index) => {
    if (index === segments.length - 1) {
      cursor[segment] = value;
      return;
    }
    if (!cursor[segment] || typeof cursor[segment] !== 'object') {
      cursor[segment] = {};
    }
    cursor = cursor[segment];
  });
}

function buildExample(variant: MediaPublishVariant) {
  const payload: Record<string, any> = {
    contractType: 'yishe.publish.payload',
    contractVersion: '2026-03-19',
    platform: activePlatform.value
  };
  variant.fields.forEach((rule) => {
    const value = sampleValue(rule);
    if (value === undefined) {
      return;
    }
    setByPath(payload, rule.key, value);
  });
  return JSON.stringify(payload, null, 2);
}

async function copyExample(variant: MediaPublishVariant) {
  try {
    await navigator.clipboard.writeText(buildExample(variant));
    ElMessage.success(t('mediaSchema.copied'));
  } catch {
    ElMessage.error(t('mediaSchema.copyFailed'));
  }
}

async function loadSchemas() {
  loading.value = true;
  try {
    schemas.value = await getMediaPublishSchemas();
    if (!schemas.value.some((item) => item.platform === activePlatform.value)) {
      activePlatform.value = schemas.value[0]?.platform || '';
    }
  } catch (error: any) {
    ElMessage.error(error?.message || t('mediaSchema.loadFailed'));
  } finally {
    loading.value = false;
  }
}
</script>

<style lang="less" scoped>
.media-schema-dialog__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 12px;
}

.media-schema-dialog__desc {
  color: var(--el-text-color-secondary);
  font-size: 12px;
  line-height: 1.5;
}

.media-schema-dialog__platforms {
  margin-bottom: 12px;
}

.media-schema-dialog__body {
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-height: 62vh;
  overflow-y: auto;
}

.media-schema-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 6px;
}

.media-schema-card__header {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.media-schema-card__title {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  color: var(--el-text-color-primary);
  font-size: 14px;
  font-weight: 600;

  code {
    padding: 0 6px;
    border-radius: 4px;
    background: var(--el-fill-color-light);
    color: var(--el-text-color-regular);
    font-size: 12px;
    font-weight: 400;
  }
}

.media-schema-card__task-type {
  color: var(--el-text-color-secondary);
  font-size: 12px;
  font-weight: 400;
}

.media-schema-card__desc {
  color: var(--el-text-color-secondary);
  font-size: 12px;
  line-height: 1.5;
}

.media-schema-card__table {
  font-size: 12px;
}

.media-schema-card__key {
  color: var(--el-text-color-primary);
  font-family: "JetBrains Mono", "SFMono-Regular", Consolas, monospace;
  font-size: 12px;
}

.media-schema-card__example {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.media-schema-card__example-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: var(--el-text-color-secondary);
  font-size: 12px;
}

.media-schema-card__code {
  margin: 0;
  padding: 12px;
  overflow: auto;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 6px;
  background: var(--el-fill-color-light);
  color: var(--el-text-color-primary);
  font-family: "JetBrains Mono", "SFMono-Regular", Consolas, monospace;
  font-size: 12px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
