<template>
  <div class="tools-page">

    <section class="tools-section" aria-labelledby="tools-downloads-heading">
      <!-- 骨架屏：与真实卡片 1:1 结构对应，消除排版抖动 -->
      <div v-if="loading" class="tools-grid">
        <div v-for="i in 2" :key="i" class="tools-card tools-card--skeleton">
          <el-skeleton animated>
            <template #template>
              <div class="tools-card__top">
                <div class="tools-card__icon-group">
                  <el-skeleton-item variant="circle" class="tools-skeleton__icon" />
                  <div class="tools-skeleton__headers">
                    <el-skeleton-item variant="text" style="width: 120px; height: 18px; border-radius: 6px;" />
                    <el-skeleton-item variant="text" style="width: 80px; height: 14px; border-radius: 4px;" />
                  </div>
                </div>
                <el-skeleton-item variant="text" style="width: 52px; height: 22px; border-radius: 11px;" />
              </div>

              <div class="tools-skeleton__desc">
                <el-skeleton-item variant="text" style="width: 100%; height: 14px; border-radius: 4px;" />
                <el-skeleton-item variant="text" style="width: 75%; height: 14px; border-radius: 4px;" />
              </div>

              <div class="tools-card__actions-wrapper">
                <div class="tools-skeleton__btn-grid">
                  <el-skeleton-item variant="button" style="width: 100%; height: 40px; border-radius: 20px;" />
                  <el-skeleton-item v-if="i === 1" variant="button" style="width: 100%; height: 40px; border-radius: 20px;" />
                </div>

                <div v-if="i === 1" class="tools-skeleton__backup-block">
                  <el-skeleton-item variant="text" style="width: 72px; height: 13px; border-radius: 4px; margin-bottom: 8px;" />
                  <div class="tools-skeleton__btn-grid">
                    <el-skeleton-item variant="button" style="width: 100%; height: 36px; border-radius: 18px;" />
                    <el-skeleton-item variant="button" style="width: 100%; height: 36px; border-radius: 18px;" />
                  </div>
                </div>
              </div>
            </template>
          </el-skeleton>
        </div>
      </div>

      <!-- 真实卡片展示 -->
      <div v-else-if="downloadCards.length" class="tools-grid">
        <article
          v-for="item in downloadCards"
          :key="item.key"
          class="tools-card"
          :class="{ 'is-disabled': !item.actions.some((action) => action.downloadUrl) }"
        >
          <!-- 顶部信息：图标 + 标题/平台 + 状态标签 -->
          <div class="tools-card__top">
            <div class="tools-card__icon-group">
              <span class="tools-card__icon" aria-hidden="true">
                <Icon :icon="item.icon" />
              </span>
              <div class="tools-card__headline">
                <h3 class="tools-card__title">{{ t(item.title) }}</h3>
                <span class="tools-card__platform">{{ t(item.platform) }}</span>
              </div>
            </div>
            <el-tag
              size="small"
              effect="plain"
              round
              :type="item.actions.some((action) => action.downloadUrl) ? 'success' : 'info'"
              class="tools-card__tag"
            >
              {{ item.actions.some((action) => action.downloadUrl) ? t('home.tools.available') : t('home.tools.unconfigured') }}
            </el-tag>
          </div>

          <!-- 描述文案 -->
          <p class="tools-card__desc">{{ t(item.description) }}</p>

          <!-- 按钮操作区：主下载区 + 备用下载区分层对齐 -->
          <div class="tools-card__actions-wrapper">
            <!-- 官方推荐主下载按钮 (网格均分对齐) -->
            <div
              class="tools-card__primary-grid"
              :class="{ 'is-single': getPrimaryActions(item).length === 1 }"
            >
              <el-button
                v-for="action in getPrimaryActions(item)"
                :key="action.key"
                type="primary"
                round
                class="tools-card__btn tools-card__btn--primary"
                :disabled="!action.downloadUrl"
                @click="handleDownload(action.downloadUrl)"
              >
                <Icon :icon="getActionIcon(action.key)" class="tools-card__btn-icon" />
                <span>{{ t(action.label) }}</span>
              </el-button>
            </div>

            <!-- 备用镜像下载 (仅在存在备用链接时展示，上下严丝合缝对齐) -->
            <div v-if="getBackupActions(item).length" class="tools-card__backup-block">
              <div class="tools-card__backup-header">
                <Icon icon="lucide:link-2" class="tools-card__backup-icon" />
                <span class="tools-card__backup-label">{{ t('home.tools.mirrorTip') }}</span>
              </div>
              <div class="tools-card__backup-grid">
                <el-button
                  v-for="action in getBackupActions(item)"
                  :key="action.key"
                  type="primary"
                  round
                  class="tools-card__btn tools-card__btn--primary"
                  :disabled="!action.downloadUrl"
                  @click="handleDownload(action.downloadUrl)"
                >
                  <Icon :icon="getActionIcon(action.key)" class="tools-card__btn-icon" />
                  <span>{{ t(action.label) }}</span>
                </el-button>
              </div>
            </div>
          </div>
        </article>
      </div>

      <el-empty v-else :description="t('home.tools.unconfigured')" />
    </section>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElSkeleton, ElSkeletonItem } from 'element-plus'
import { Icon } from "@/components/Icon";
import { getDownloadConfig, type DownloadCard, type DownloadAction } from "@/config/downloads";

defineOptions({ name: "ToolsIndex" });

const { t } = useI18n()

const downloadCards = ref<DownloadCard[]>([])
const loading = ref(true)

function getPrimaryActions(card: DownloadCard): DownloadAction[] {
  return (card.actions || []).filter((action) => !action.key.includes('backup'))
}

function getBackupActions(card: DownloadCard): DownloadAction[] {
  return (card.actions || []).filter((action) => action.key.includes('backup'))
}

function getActionIcon(actionKey: string): string {
  if (actionKey.includes('windows')) return 'mdi:microsoft-windows'
  if (actionKey.includes('macos')) return 'mdi:apple'
  if (actionKey.includes('extension') || actionKey.includes('zip')) return 'mdi:puzzle'
  if (actionKey.includes('backup')) return 'lucide:link-2'
  return 'lucide:download'
}

async function loadDownloadConfig() {
  try {
    const res = await getDownloadConfig()
    downloadCards.value = res.cards || []
  } catch {
    downloadCards.value = []
  } finally {
    loading.value = false
  }
}

function handleDownload(downloadUrl: string) {
  if (!downloadUrl) return;
  window.open(downloadUrl, "_blank", "noopener");
}

onMounted(loadDownloadConfig)
</script>

<style scoped lang="scss">
.tools-page {
  display: flex;
  width: 100%;
  padding: 4px 0 24px;
  box-sizing: border-box;
  flex-direction: column;
  gap: 20px;
}

.tools-header {
  padding: 6px 0 14px;
  border-bottom: 1px solid color-mix(in srgb, var(--el-border-color) 45%, transparent 55%);
}

.tools-header__content {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.tools-header__badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 13px;
  font-weight: 600;
  color: var(--el-color-primary);

  .tools-header__badge-icon {
    font-size: 15px;
  }
}

.tools-header__title {
  margin: 0;
  font-size: 24px;
  font-weight: 700;
  line-height: 1.25;
  letter-spacing: -0.02em;
  color: var(--el-text-color-primary);
}

.tools-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* 响应式自适应网格，保证卡片宽度合理且按钮拥有充足空间 */
.tools-grid {
  display: grid;
  width: 100%;
  gap: clamp(12px, 1.4vw, 20px);
  grid-template-columns: repeat(auto-fill, minmax(min(300px, 100%), 380px));
  justify-content: start;
}

.tools-card {
  display: flex;
  flex-direction: column;
  padding: 14px 16px;
  background: var(--el-bg-color);
  border: 1px solid color-mix(in srgb, var(--el-border-color) 60%, transparent 40%);
  border-radius: 14px;
  box-shadow: 0 2px 12px -2px rgb(15 23 42 / 4%), 0 1px 4px -1px rgb(15 23 42 / 2%);
  transition:
    transform 0.2s cubic-bezier(0.16, 1, 0.3, 1),
    border-color 0.2s ease,
    box-shadow 0.2s ease;

  &:hover:not(.is-disabled):not(.tools-card--skeleton) {
    transform: translateY(-2px);
    border-color: color-mix(in srgb, var(--el-color-primary) 35%, var(--el-border-color));
    box-shadow:
      0 12px 30px -4px rgb(15 23 42 / 8%),
      0 4px 10px -2px rgb(15 23 42 / 4%);
  }

  &.is-disabled {
    opacity: 0.75;
  }

  &--skeleton {
    cursor: default;
    background: var(--el-bg-color);
    box-shadow: 0 2px 10px rgb(15 23 42 / 2%);
  }
}

.tools-card__top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.tools-card__icon-group {
  display: flex;
  align-items: center;
  gap: 12px;
}

.tools-card__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  font-size: 18px;
  color: var(--el-color-primary);
  background: color-mix(in srgb, var(--el-color-primary) 10%, var(--el-fill-color-light) 90%);
  border-radius: 10px;
  flex-shrink: 0;
}

.tools-card__headline {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.tools-card__title {
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  line-height: 1.3;
  letter-spacing: -0.01em;
  color: var(--el-text-color-primary);
}

.tools-card__platform {
  font-size: 12px;
  font-weight: 600;
  line-height: 1.25;
  color: var(--el-color-primary);
}

.tools-card__tag {
  font-weight: 500;
  padding: 0 8px;
}

.tools-card__desc {
  margin: 8px 0 0;
  font-size: 12px;
  line-height: 1.55;
  color: var(--el-text-color-secondary);
  min-height: 36px;
}

/* 按钮操作包装区：强制靠底部对齐 */
.tools-card__actions-wrapper {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: auto;
  padding-top: 12px;

  /* 彻底清除 Element Plus .el-button + .el-button 的默认左边距 */
  :deep(.el-button) {
    margin-left: 0 !important;
    width: 100%;
    justify-content: center;
    box-sizing: border-box;
  }
}

/* 主下载按钮网格：双按钮 50%/50% 严格均分；单按钮自动撑满 100% */
.tools-card__primary-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;

  &.is-single {
    grid-template-columns: 1fr;
  }
}

/* 备用下载区域 */
.tools-card__backup-block {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-top: 12px;
  border-top: 1px dashed color-mix(in srgb, var(--el-border-color) 65%, transparent 35%);
}

.tools-card__backup-header {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  color: var(--el-text-color-placeholder);
}

.tools-card__backup-icon {
  font-size: 13px;
}

.tools-card__backup-label {
  letter-spacing: 0.01em;
}

/* 备用下载按钮网格：双按钮 50%/50% 严格均分，与主按钮竖向左右边缘严格对齐 */
.tools-card__backup-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

/* 按钮通用尺寸与图标 */
.tools-card__btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border-radius: 12px !important;
  transition: all 0.15s ease;

  .tools-card__btn-icon {
    font-size: 16px;
    flex-shrink: 0;
  }

  &--primary {
    min-height: 34px;
    padding: 0 14px;
    font-weight: 600;
    font-size: 12px;
    box-shadow: 0 2px 8px color-mix(in srgb, var(--el-color-primary) 28%, transparent);

    &:hover:not(:disabled) {
      box-shadow: 0 4px 12px color-mix(in srgb, var(--el-color-primary) 38%, transparent);
    }
  }

  &--backup {
    min-height: 36px;
    padding: 0 12px;
    font-weight: 500;
    font-size: 12px;
    color: var(--el-text-color-regular);
    background: var(--el-fill-color-blank);
    border: 1px solid color-mix(in srgb, var(--el-border-color) 70%, transparent);

    &:hover:not(:disabled) {
      color: var(--el-color-primary);
      border-color: color-mix(in srgb, var(--el-color-primary) 50%, var(--el-border-color));
      background: color-mix(in srgb, var(--el-color-primary) 6%, transparent);
    }
  }
}

/* 骨架屏局部微调 */
.tools-skeleton__icon {
  width: 44px;
  height: 44px;
  border-radius: 13px !important;
  flex-shrink: 0;
}

.tools-skeleton__headers {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.tools-skeleton__desc {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 14px;
}

.tools-skeleton__btn-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.tools-skeleton__backup-block {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px dashed color-mix(in srgb, var(--el-border-color) 45%, transparent 55%);
}
</style>
