<template>
  <Transition name="upload-panel-fade">
    <div
      v-if="globalUploadTasks.length"
      class="global-upload-panel"
      :class="{ 'is-dark': isDarkTheme }"
    >
      <!-- 头部：标题与操作 -->
      <div class="global-upload-panel__header">
        <div class="global-upload-panel__title-wrap">
          <div class="global-upload-panel__title-dot" :class="{ 'is-active': hasRunningGlobalUploadTasks }" />
          <span class="global-upload-panel__title">文件上传任务</span>
          <span class="global-upload-panel__badge" v-if="runningCount > 0">
            {{ runningCount }} 进行中
          </span>
        </div>
        <div class="global-upload-panel__actions">
          <button
            v-if="hasFinishedTasks"
            type="button"
            class="global-upload-panel__btn-text"
            title="清除已完成任务"
            @click="clearFinishedGlobalUploadTasks"
          >
            清除完成
          </button>
        </div>
      </div>

      <!-- 任务列表 -->
      <div class="global-upload-panel__list">
        <TransitionGroup name="upload-item-slide">
          <div
            v-for="task in globalUploadTasks"
            :key="task.id"
            class="global-upload-panel__item"
            :class="`is-${task.status}`"
          >
            <!-- 顶部行：图标、文件名、状态标签、删除按钮 -->
            <div class="global-upload-panel__item-row">
              <div class="global-upload-panel__item-info">
                <span class="global-upload-panel__item-icon">
                  <!-- 上传中旋转图标 -->
                  <svg
                    v-if="task.status === 'running'"
                    class="spin-icon"
                    viewBox="0 0 24 24"
                    width="14"
                    height="14"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2.5"
                    stroke-linecap="round"
                  >
                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                  </svg>
                  <!-- 成功对勾图标 -->
                  <svg
                    v-else-if="task.status === 'success'"
                    viewBox="0 0 24 24"
                    width="14"
                    height="14"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2.5"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <!-- 错误感叹号图标 -->
                  <svg
                    v-else
                    viewBox="0 0 24 24"
                    width="14"
                    height="14"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2.5"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                </span>
                <span class="global-upload-panel__item-name" :title="task.name">
                  {{ task.name }}
                </span>
              </div>

              <div class="global-upload-panel__item-actions">
                <span class="global-upload-panel__item-tag" :class="task.status">
                  {{ getGlobalUploadTaskStatusText(task.status) }}
                </span>
                <button
                  type="button"
                  class="global-upload-panel__item-close"
                  title="移除此项"
                  @click="removeGlobalUploadTask(task.id)"
                >
                  <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="2.5" fill="none">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            </div>

            <!-- 进度条 -->
            <div class="global-upload-panel__progress-bar">
              <div
                class="global-upload-panel__progress-inner"
                :style="{ width: `${task.progress}%` }"
              />
            </div>

            <!-- 底部行：阶段描述与进度百分比 -->
            <div class="global-upload-panel__item-footer">
              <span class="global-upload-panel__item-stage" :title="task.error || task.stage">
                {{ task.error || task.stage }}
              </span>
              <span class="global-upload-panel__item-percentage">
                {{ task.progress }}%
              </span>
            </div>
          </div>
        </TransitionGroup>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import { useAppStore } from "@/store/modules/app";
import {
  clearFinishedGlobalUploadTasks,
  removeGlobalUploadTask,
  getGlobalUploadTaskStatusText,
  globalUploadTasks,
  hasRunningGlobalUploadTasks,
  runningGlobalUploadTaskCount,
} from "@/services/globalUploadTasks";

defineOptions({ name: "GlobalUploadTaskPanel" });

const appStore = useAppStore();

// 响应式 DOM 暗黑模式监听（同时支持 appStore 和 html.dark / documentElement.classList）
const isDomDark = ref(typeof document !== "undefined" && document.documentElement.classList.contains("dark"));

let darkMutationObserver: MutationObserver | null = null;

const isDarkTheme = computed(() => {
  return Boolean(appStore.getIsDark || isDomDark.value);
});

const runningCount = computed(() => runningGlobalUploadTaskCount.value);
const hasFinishedTasks = computed(() =>
  globalUploadTasks.value.some((t) => t.status !== "running"),
);

const handleBeforeUnload = (event: BeforeUnloadEvent) => {
  if (!hasRunningGlobalUploadTasks.value) {
    return;
  }

  event.preventDefault();
  event.returnValue = "文件仍在上传中，关闭页面可能导致上传中断。";
};

onMounted(() => {
  window.addEventListener("beforeunload", handleBeforeUnload);

  if (typeof MutationObserver !== "undefined" && document?.documentElement) {
    darkMutationObserver = new MutationObserver(() => {
      isDomDark.value = document.documentElement.classList.contains("dark");
    });
    darkMutationObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "data-theme"],
    });
  }
});

onUnmounted(() => {
  window.removeEventListener("beforeunload", handleBeforeUnload);
  if (darkMutationObserver) {
    darkMutationObserver.disconnect();
    darkMutationObserver = null;
  }
});
</script>

<style scoped lang="scss">
.global-upload-panel {
  position: fixed;
  right: 20px;
  bottom: 20px;
  z-index: 3000;
  width: min(340px, calc(100vw - 32px));
  padding: 12px 14px;
  
  // 基础背景与质感
  background: var(--upload-card-bg, #ffffff);
  border: 1px solid var(--upload-card-border, rgba(0, 0, 0, 0.08));
  border-radius: 12px;
  box-shadow: var(
    --upload-card-shadow,
    0 10px 25px -5px rgba(0, 0, 0, 0.1),
    0 8px 10px -6px rgba(0, 0, 0, 0.1)
  );
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  user-select: none;
  transition: background 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease;

  // 白天模式变量（默认）
  --upload-card-bg: rgba(255, 255, 255, 0.96);
  --upload-card-border: rgba(226, 232, 240, 0.95);
  --upload-card-shadow: 0 12px 28px -4px rgba(15, 23, 42, 0.12), 0 4px 10px -2px rgba(15, 23, 42, 0.06);
  --upload-text-title: #0f172a;
  --upload-text-sub: #64748b;
  --upload-btn-hover: #f1f5f9;

  // 各状态卡片在白天模式的色彩
  --upload-item-bg-running: #f0f7ff;
  --upload-item-border-running: #bae0ff;
  --upload-item-icon-running: #1677ff;
  --upload-bar-running: #1677ff;

  --upload-item-bg-success: #f6ffed;
  --upload-item-border-success: #b7eb8f;
  --upload-item-icon-success: #52c41a;
  --upload-bar-success: #52c41a;

  --upload-item-bg-error: #fff2f0;
  --upload-item-border-error: #ffccc7;
  --upload-item-icon-error: #ff4d4f;
  --upload-bar-error: #ff4d4f;

  // 暗色模式：支持类名 .is-dark、上级 html.dark 以及 [data-theme="dark"]
  &.is-dark {
    --upload-card-bg: rgba(26, 26, 26, 0.95);
    --upload-card-border: rgba(255, 255, 255, 0.12);
    --upload-card-shadow: 0 16px 36px -4px rgba(0, 0, 0, 0.6), 0 6px 14px -2px rgba(0, 0, 0, 0.45);
    --upload-text-title: #f8fafc;
    --upload-text-sub: #94a3b8;
    --upload-btn-hover: rgba(255, 255, 255, 0.1);

    --upload-item-bg-running: rgba(22, 119, 255, 0.14);
    --upload-item-border-running: rgba(22, 119, 255, 0.38);
    --upload-item-icon-running: #69b1ff;
    --upload-bar-running: #3b82f6;

    --upload-item-bg-success: rgba(82, 196, 26, 0.14);
    --upload-item-border-success: rgba(82, 196, 26, 0.38);
    --upload-item-icon-success: #95de64;
    --upload-bar-success: #10b981;

    --upload-item-bg-error: rgba(255, 77, 79, 0.16);
    --upload-item-border-error: rgba(255, 77, 79, 0.4);
    --upload-item-icon-error: #ff7875;
    --upload-bar-error: #ef4444;
  }
}

// 兼容全局选择器 html.dark 与 [data-theme='dark']
:global(html.dark) .global-upload-panel,
:global([data-theme='dark']) .global-upload-panel {
  --upload-card-bg: rgba(26, 26, 26, 0.95);
  --upload-card-border: rgba(255, 255, 255, 0.12);
  --upload-card-shadow: 0 16px 36px -4px rgba(0, 0, 0, 0.6), 0 6px 14px -2px rgba(0, 0, 0, 0.45);
  --upload-text-title: #f8fafc;
  --upload-text-sub: #94a3b8;
  --upload-btn-hover: rgba(255, 255, 255, 0.1);

  --upload-item-bg-running: rgba(22, 119, 255, 0.14);
  --upload-item-border-running: rgba(22, 119, 255, 0.38);
  --upload-item-icon-running: #69b1ff;
  --upload-bar-running: #3b82f6;

  --upload-item-bg-success: rgba(82, 196, 26, 0.14);
  --upload-item-border-success: rgba(82, 196, 26, 0.38);
  --upload-item-icon-success: #95de64;
  --upload-bar-success: #10b981;

  --upload-item-bg-error: rgba(255, 77, 79, 0.16);
  --upload-item-border-error: rgba(255, 77, 79, 0.4);
  --upload-item-icon-error: #ff7875;
  --upload-bar-error: #ef4444;
}

.global-upload-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 10px;
  margin-bottom: 8px;
  border-bottom: 1px solid var(--upload-card-border);
}

.global-upload-panel__title-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
}

.global-upload-panel__title-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background-color: #94a3b8;
  transition: all 0.3s ease;

  &.is-active {
    background-color: #10b981;
    box-shadow: 0 0 8px #10b981;
    animation: pulse-dot 2s infinite ease-in-out;
  }
}

@keyframes pulse-dot {
  0%, 100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.3);
    opacity: 0.7;
  }
}

.global-upload-panel__title {
  font-size: 13px;
  font-weight: 600;
  color: var(--upload-text-title);
  letter-spacing: -0.2px;
}

.global-upload-panel__badge {
  font-size: 11px;
  font-weight: 500;
  padding: 1px 7px;
  border-radius: 999px;
  background: var(--upload-item-bg-running);
  color: var(--upload-item-icon-running);
  border: 1px solid var(--upload-item-border-running);
}

.global-upload-panel__btn-text {
  border: none;
  background: transparent;
  color: var(--upload-text-sub);
  font-size: 12px;
  padding: 3px 8px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    color: var(--upload-text-title);
    background: var(--upload-btn-hover);
  }
}

.global-upload-panel__list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 260px;
  overflow-y: auto;
  overflow-x: hidden;
  padding-right: 2px;

  /* 细滚动条 */
  &::-webkit-scrollbar {
    width: 4px;
  }
  &::-webkit-scrollbar-thumb {
    background: rgba(148, 163, 184, 0.3);
    border-radius: 4px;
  }
}

.global-upload-panel__item {
  position: relative;
  padding: 9px 10px;
  border-radius: 8px;
  border: 1px solid transparent;
  transition: all 0.2s ease;

  &.is-running {
    background: var(--upload-item-bg-running);
    border-color: var(--upload-item-border-running);

    .global-upload-panel__item-icon {
      color: var(--upload-item-icon-running);
    }
    .global-upload-panel__progress-inner {
      background: var(--upload-bar-running);
    }
  }

  &.is-success {
    background: var(--upload-item-bg-success);
    border-color: var(--upload-item-border-success);

    .global-upload-panel__item-icon {
      color: var(--upload-item-icon-success);
    }
    .global-upload-panel__progress-inner {
      background: var(--upload-bar-success);
    }
  }

  &.is-error {
    background: var(--upload-item-bg-error);
    border-color: var(--upload-item-border-error);

    .global-upload-panel__item-icon {
      color: var(--upload-item-icon-error);
    }
    .global-upload-panel__progress-inner {
      background: var(--upload-bar-error);
    }
  }
}

.global-upload-panel__item-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-width: 0;
  margin-bottom: 6px;
}

.global-upload-panel__item-info {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  flex: 1;
}

.global-upload-panel__item-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  .spin-icon {
    animation: spin 1.2s linear infinite;
  }
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.global-upload-panel__item-name {
  overflow: hidden;
  font-size: 12px;
  font-weight: 500;
  color: var(--upload-text-title);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.global-upload-panel__item-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.global-upload-panel__item-tag {
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 4px;
  font-weight: 500;
  line-height: 1.4;

  &.running {
    color: var(--upload-item-icon-running);
    background: rgba(22, 119, 255, 0.1);
  }
  &.success {
    color: var(--upload-item-icon-success);
    background: rgba(82, 196, 26, 0.1);
  }
  &.error {
    color: var(--upload-item-icon-error);
    background: rgba(255, 77, 79, 0.1);
  }
}

.global-upload-panel__item-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  padding: 0;
  border: none;
  background: transparent;
  color: var(--upload-text-sub);
  border-radius: 4px;
  cursor: pointer;
  opacity: 0.6;
  transition: all 0.15s ease;

  &:hover {
    opacity: 1;
    background: var(--upload-btn-hover);
    color: var(--upload-text-title);
  }
}

.global-upload-panel__progress-bar {
  width: 100%;
  height: 4px;
  background: rgba(148, 163, 184, 0.2);
  border-radius: 999px;
  overflow: hidden;
  margin: 5px 0 6px;
}

.global-upload-panel__progress-inner {
  height: 100%;
  border-radius: 999px;
  transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.global-upload-panel__item-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.global-upload-panel__item-stage {
  overflow: hidden;
  font-size: 11px;
  color: var(--upload-text-sub);
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}

.global-upload-panel__item-percentage {
  font-size: 11px;
  font-weight: 500;
  color: var(--upload-text-sub);
  font-variant-numeric: tabular-nums;
  flex-shrink: 0;
}

// 动画
.upload-panel-fade-enter-active,
.upload-panel-fade-leave-active {
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.upload-panel-fade-enter-from,
.upload-panel-fade-leave-to {
  opacity: 0;
  transform: translateY(12px) scale(0.96);
}

.upload-item-slide-enter-active,
.upload-item-slide-leave-active {
  transition: all 0.25s ease;
}

.upload-item-slide-enter-from {
  opacity: 0;
  transform: translateX(16px);
}

.upload-item-slide-leave-to {
  opacity: 0;
  transform: translateX(20px);
}
</style>
