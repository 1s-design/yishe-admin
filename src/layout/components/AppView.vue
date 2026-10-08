<script lang="ts" setup>
import { useAppStore } from "@/store/modules/app";
import { useTagsViewStore } from "@/store/modules/tagsView";
import { Icon } from "@/components/Icon";
import { useFullscreen } from "@vueuse/core";
import { useRoute } from "vue-router";

defineOptions({ name: "AppView" });

const { t } = useI18n();

const appStore = useAppStore();
const tagsViewStore = useTagsViewStore();
const route = useRoute();

const footer = computed(() => appStore.getFooter);
const keepAliveMax = Number(import.meta.env.VITE_APP_KEEP_ALIVE_MAX || 12);

const shouldCacheRoute = (route: any): boolean => {
  return route?.meta?.noCache !== true;
};

// 基于 refreshViewMap 生成动态 key，刷新时 key 变化会触发 keep-alive 创建新组件实例
const getComponentKey = (route: any): string => {
  const refreshCount = tagsViewStore.refreshViewMap[route.name] || 0;
  return refreshCount > 0 ? `${route.fullPath}__refresh_${refreshCount}` : route.fullPath;
};

// 全屏功能
const appViewRef = ref<HTMLElement | null>(null);
const { toggle: toggleFullscreen, isFullscreen } = useFullscreen(appViewRef);

// 全屏时顶栏/标签栏/页脚被隐藏，把布局高度变量归零，
// 让页面里用 calc(100vh - var(--top-tool-height) ...) 计算高度的区域自动撑满全屏。
// 通过 JS 加 class + 内联变量，避免 :fullscreen 伪类选择器在某些环境不生效。
const FULLSCREEN_ZERO_VARS = {
  "--top-tool-height": "0px",
  "--tags-view-height": "0px",
  "--app-footer-height": "0px",
  "--app-content-padding": "0px",
};

// 关键布局属性用内联样式设置，避免 scoped CSS 选择器在某些环境不生效导致无法滚动/被裁剪
const FULLSCREEN_INLINE_STYLES = {
  height: "100vh",
  "box-sizing": "border-box",
  padding: "0px",
  "overflow-y": "auto",
  "background-color": "var(--app-content-bg-color)",
};

const syncFullscreenState = () => {
  const el = appViewRef.value;
  if (!el) return;
  const doc = document as any;
  const active =
    doc.fullscreenElement === el ||
    doc.webkitFullscreenElement === el ||
    doc.mozFullScreenElement === el ||
    doc.msFullscreenElement === el;
  el.classList.toggle("is-app-view-fullscreen", active);
  if (active) {
    Object.entries(FULLSCREEN_ZERO_VARS).forEach(([key, value]) =>
      el.style.setProperty(key, value),
    );
    Object.entries(FULLSCREEN_INLINE_STYLES).forEach(([key, value]) =>
      el.style.setProperty(key, value),
    );
  } else {
    Object.keys(FULLSCREEN_ZERO_VARS).forEach((key) => el.style.removeProperty(key));
    Object.keys(FULLSCREEN_INLINE_STYLES).forEach((key) => el.style.removeProperty(key));
  }
};

watch(isFullscreen, syncFullscreenState, { immediate: true });
onMounted(() => {
  document.addEventListener("fullscreenchange", syncFullscreenState);
  document.addEventListener("webkitfullscreenchange", syncFullscreenState);
});
onBeforeUnmount(() => {
  document.removeEventListener("fullscreenchange", syncFullscreenState);
  document.removeEventListener("webkitfullscreenchange", syncFullscreenState);
});

// 无感刷新
const routerAlive = ref(true);
const reload = () => {
  routerAlive.value = false;
  nextTick(() => (routerAlive.value = true));
};
provide("reload", reload);
</script>

<template>
  <section
    ref="appViewRef"
    :id="'app-view-main'"
    :class="[
      'p-[var(--app-content-padding)] w-full bg-[var(--app-content-bg-color)] relative',
      { 'app-view-no-padding': route.meta?.noAppViewPadding === true },
      {
        '!min-h-[calc(100vh-var(--top-tool-height)-var(--tags-view-height)-var(--app-footer-height))] pb-0':
          footer,
      },
    ]"
  >
    <!-- 全屏按钮 - 极简小图标 -->
    <button
      type="button"
      class="absolute right-0 top-0 z-20 flex h-6 w-6 items-center justify-center text-[var(--el-text-color-secondary)] hover:text-[var(--el-color-primary)] opacity-0 hover:opacity-100 transition-all duration-200 p-0 border-none bg-transparent cursor-pointer"
      @click.stop="toggleFullscreen"
      :title="isFullscreen ? t('layout.screenfull.exitFullscreen') : t('layout.screenfull.fullscreen')"
    >
      <Icon :icon="isFullscreen ? 'zmdi:fullscreen-exit' : 'zmdi:fullscreen'" :size="14" />
    </button>

    <router-view v-if="routerAlive" v-slot="{ Component, route }">
      <!-- 单出口 + key 强制切换；keep-alive 仅缓存 include 命中的路由组件 -->
      <keep-alive :max="keepAliveMax">
        <component
          :is="Component"
          v-if="shouldCacheRoute(route)"
          :key="getComponentKey(route)"
        />
      </keep-alive>
      <component
        :is="Component"
        v-if="!shouldCacheRoute(route)"
        :key="`${getComponentKey(route)}::${String(route.name || '')}`"
      />
    </router-view>
  </section>
</template>

<style lang="scss" scoped>
#app-view-main.app-view-no-padding {
  padding: 0;
}

#app-view-main:fullscreen,
#app-view-main.is-app-view-fullscreen,
#app-view-main:full-screen,
#app-view-main:full-screen,
#app-view-main:fullscreen {
  /* 全屏时顶栏/标签栏/页脚已隐藏，把布局高度变量归零，
     让页面里用 calc(100vh - var(--top-tool-height) ...) 计算高度的区域自动撑满全屏。
     同时把 --app-content-padding 归零，消除内容区自身的底部 padding 残留空白 */
  --top-tool-height: 0px;
  --tags-view-height: 0px;
  --app-footer-height: 0px;
  --app-content-padding: 0px;

  /* 与页面内 calc(100vh - ...) 保持一致，避免 100dvh 造成的高度差 */
  height: 100vh;
  padding: var(--app-content-padding);
  overflow-y: auto;
  background-color: var(--app-content-bg-color);
  box-sizing: border-box;
}

/* 页面内容作为普通块级子项：短页面通过 min-height 撑满，长页面保持内容高度由外层滚动，
   不能用 flex + 固定高度，否则 height:100% 的页面内容会被裁剪且无法滚动 */
#app-view-main:fullscreen > :not(.absolute),
#app-view-main.is-app-view-fullscreen > :not(.absolute),
#app-view-main:full-screen > :not(.absolute),
#app-view-main:full-screen > :not(.absolute),
#app-view-main:fullscreen > :not(.absolute) {
  min-height: 100%;
}
</style>
