<script lang="tsx">
import type { VNode } from "vue";
import { watch } from "vue";
import { Icon } from "@/components/Icon";
import { ElInput, ElTooltip } from "element-plus";
import { Search } from "@element-plus/icons-vue";
import { useDesign } from "@/hooks/web/useDesign";
import { usePermissionStore } from "@/store/modules/permission";
import { useAppStore } from "@/store/modules/app";
import { isUrl } from "@/utils/is";
import { pathResolve } from "@/utils/routerHelper";
import { Logo } from "@/layout/components/Logo";
import { usePsdSetRuntimeState } from "@/services/psdSetRuntimeState";
import { usePublishTaskRuntimeState } from "@/services/publishTaskRuntimeState";
import { isClientServiceRuntimeBusy } from "@/services/clientServiceRuntime";
import { aiConfigState, refreshAiConfigState } from "@/services/aiConfigState";
import { messagePushMenuState, refreshMessagePushMenuState } from "@/services/messagePushState";
import { getBrowserAutomationRuntimeHint } from "@/services/browserAutomationRuntime";
import {
  ensureServiceHealthInitialized,
  isServiceHealthKey,
  resolveServiceHealthMenuTooltip,
  resolveServiceHealthTone,
  serviceHealthStates,
} from "@/services/serviceHealthState";
import {
  ensureAiAssistantRuntimeInitialized,
  resolveAiAssistantRuntimeTone,
  resolveAiAssistantRuntimeTooltip,
  aiAssistantRuntimeState,
} from "@/services/aiAssistantRuntimeState";
import {
  designToolRuntimeState,
  ensureDesignToolRuntimeInitialized,
  resolveDesignToolRuntimeTone,
  resolveDesignToolRuntimeTooltip,
} from "@/services/designToolRuntimeState";
import {
  getClientServiceRuntime,
  type ClientPluginKey,
  useClientNodeStore,
} from "@/store/modules/clientNode";
import { getWorkflowPageApi } from "@/api/workflow";
import { useResourceLibraryMenuUpdate } from "@/hooks/web/useResourceLibraryMenuUpdate";

const { getPrefixCls } = useDesign();
const prefixCls = getPrefixCls("menu");

export default defineComponent({
  name: "Menu",
  setup() {
    const appStore = useAppStore();
    const permissionStore = usePermissionStore();
    const { push, currentRoute } = useRouter();
    const closeMobileMenu = inject<() => void>("closeMobileMenu", () => {});
    const logo = computed(() => appStore.logo);
    const mobile = computed(() => appStore.getMobile);
    const menuKeyword = ref("");
    const { t } = useI18n();

    const collapseMenu = () => {
      appStore.setCollapse(true);
    };

    const routers = computed(() =>
      permissionStore.getRouters.filter((route) => !route.meta?.hidden),
    );
    const normalizeMenuText = (value: unknown) =>
      String(value ?? "")
        .trim()
        .toLowerCase();
    const menuSearchText = computed(() => normalizeMenuText(menuKeyword.value));
    const getRouteSearchText = (route: AppRouteRecordRaw, routePath: string) => {
      const rawTitle = (route.meta?.title as string) || '';
      const translatedTitle = t(rawTitle);
      return normalizeMenuText(
        [translatedTitle, rawTitle, route.name, route.path, routePath].filter(Boolean).join(" "),
      );
    };
    const filterMenuRoutes = (
      routeList: AppRouteRecordRaw[],
      keyword: string,
      parentPath = "/",
    ): AppRouteRecordRaw[] => {
      if (!keyword) {
        return routeList;
      }

      return routeList
        .map((route) => {
          const routePath = getRoutePath(route, parentPath);
          const children = getVisibleChildren(route);
          const matched = getRouteSearchText(route, routePath).includes(keyword);
          const filteredChildren = filterMenuRoutes(children, keyword, routePath);

          if (!matched && !filteredChildren.length) {
            return null;
          }

          return {
            ...route,
            children: matched ? children : filteredChildren,
          };
        })
        .filter(Boolean) as AppRouteRecordRaw[];
    };
    const visibleRouters = computed(() => filterMenuRoutes(routers.value, menuSearchText.value));
    const activeMenu = computed(
      () => (currentRoute.value.meta.activeMenu as string) || currentRoute.value.path,
    );
    const expandedMenus = ref<Record<string, boolean>>({});
    const {
      userAutoSchedulingEnabled,
      isAnyPsdSetProcessing,
      processingTooltipText,
      refresh: refreshPsdSetRuntime,
    } = usePsdSetRuntimeState();
    const {
      isAnyPublishTaskRunning,
      autoSchedulingEnabled: publishTaskAutoSchedulingEnabled,
      menuStatusTone: publishTaskMenuStatusTone,
      tooltipText: publishTaskTooltipText,
      refresh: refreshPublishTaskRuntime,
    } = usePublishTaskRuntimeState();
    const clientNodeStore = useClientNodeStore();
    clientNodeStore.ensureInitialized({ summary: true });

    // 资源广场"新"标签状态
    const {
      hasNewContentByRoute,
      getNewContentIntensityByRoute,
      markVisited: markResourceLibraryVisited,
    } = useResourceLibraryMenuUpdate();

    const renderResourceLibraryNewTag = (routePath: string) => {
      if (!hasNewContentByRoute(routePath)) return undefined;
      const intensity = getNewContentIntensityByRoute(routePath);
      // 颜色深度：越近越深。intensity 1 → 深红 #dc2626, intensity 0 → 浅红 #fca5a5
      const r = Math.round(220 + (252 - 220) * (1 - intensity));
      const g = Math.round(38 + (165 - 38) * (1 - intensity));
      const b = Math.round(38 + (165 - 38) * (1 - intensity));
      const bg = `rgb(${r}, ${g}, ${b})`;
      return (
        <span class={`${prefixCls}__new-tag`} style={{ background: bg }}>
          新
        </span>
      );
    };

    const runningWorkflowCount = ref(0);
    const workflowRuntimeLoading = ref(false);
    let workflowRuntimeTimer: ReturnType<typeof setInterval> | null = null;
    const refreshWorkflowRuntime = async () => {
      if (workflowRuntimeLoading.value) return;
      workflowRuntimeLoading.value = true;
      try {
        const response: any = await getWorkflowPageApi({ currentPage: 1, pageSize: 100 });
        const workflows = response?.list || response?.data?.list || [];
        runningWorkflowCount.value = workflows.filter((workflow: any) => workflow?.isRunning === true).length;
      } catch {
        // 菜单状态是辅助信息，查询失败不影响路由和工作流执行。
      } finally {
        workflowRuntimeLoading.value = false;
      }
    };
    // 只在工作流相关页面时才轮询
    const startWorkflowRuntimePolling = () => {
      if (workflowRuntimeTimer) return;
      void refreshWorkflowRuntime();
      workflowRuntimeTimer = setInterval(() => void refreshWorkflowRuntime(), 30_000);
    };
    const stopWorkflowRuntimePolling = () => {
      if (workflowRuntimeTimer) {
        clearInterval(workflowRuntimeTimer);
        workflowRuntimeTimer = null;
      }
    };
    // 监听路由变化，只在工作流相关页面时轮询
    watch(
      () => currentRoute.value.path,
      (path) => {
        if (path.startsWith('/workflow')) {
          startWorkflowRuntimePolling();
        } else {
          stopWorkflowRuntimePolling();
        }
      },
      { immediate: true }
    );
    onBeforeUnmount(() => {
      stopWorkflowRuntimePolling();
    });

    const menuStatusRouteMap: Record<string, string> = {
      "/operation/toolkit": "browser-automation",
      "/external/toolkit": "browser-automation",
      "/external/browser-automation": "browser-automation",
      "/external/ps-automation": "ps-automation",
      "/external/google-art": "google-art",
      "/content/image-processing-record": "image-processing",
      "/content/remotion-video-record": "video-template",
    };
    const busyIndicatorDisabledRoutes = new Set([
      "/operation/toolkit",
      "/external/toolkit",
      "/external/browser-automation",
    ]);

    const routeStatusMap = computed<Record<string, "available" | "offline">>(() => {
      const result: Record<string, "available" | "offline"> = {};
      Object.entries(menuStatusRouteMap).forEach(([routePath, pluginKey]) => {
        result[routePath] =
          clientNodeStore.pluginStatusMap[
            pluginKey as keyof typeof clientNodeStore.pluginStatusMap
          ] || "offline";
      });
      result["/product-publish/queue"] = publishTaskMenuStatusTone.value;
      return result;
    });

    const routeRunningMap = computed<Record<string, boolean>>(() => {
      const result: Record<string, boolean> = {};

      Object.entries(menuStatusRouteMap).forEach(([routePath, pluginKey]) => {
        if (busyIndicatorDisabledRoutes.has(routePath)) {
          result[routePath] = false;
          return;
        }
        result[routePath] = clientNodeStore.clients.some((client) => {
          if (!client.isOnline) return false;
          const serviceRuntime = getClientServiceRuntime(client, pluginKey as ClientPluginKey);
          return isClientServiceRuntimeBusy(serviceRuntime);
        });
      });
      result["/product-publish/queue"] = isAnyPublishTaskRunning.value;

      return result;
    });

    const renderMenuStatusHint = (dotNode: VNode, title: string) => {
      return (
        <ElTooltip
          content={title}
          placement="right"
          effect="light"
          showAfter={0}
          hideAfter={0}
          popperClass={`${prefixCls}__status-tooltip-popper`}
        >
          {{
            default: () => (
              <span class={`${prefixCls}__status-indicator`} aria-label={title}>
                {dotNode}
              </span>
            ),
          }}
        </ElTooltip>
      );
    };

    const renderRunningStatusDot = (title: string, variant?: "queue" | "psd" | "video") => {
      return renderMenuStatusHint(
        <span
          class={[
            `${prefixCls}__status-dot`,
            `${prefixCls}__status-dot--running`,
            variant ? `${prefixCls}__status-dot--running-${variant}` : undefined,
          ]}
        />,
        title,
      );
    };

    const renderAutoModeBadge = (
      title: string,
      options?: {
        enabled?: boolean;
        variant?: "queue" | "psd" | "message" | "ai";
        label?: string;
      },
    ) => {
      return renderMenuStatusHint(
        <span
          class={[
            `${prefixCls}__auto-badge`,
            options?.enabled === false
              ? `${prefixCls}__auto-badge--muted`
              : `${prefixCls}__auto-badge--enabled`,
            options?.variant ? `${prefixCls}__auto-badge--${options.variant}` : undefined,
          ]}
        >
          {options?.label || (options?.enabled === false ? t("layout.menu.manual") : t("layout.menu.auto"))}
        </span>,
        title,
      );
    };

    const resolveBrowserAutomationStatusTitle = (
      status: "available" | "offline",
      running: boolean,
      routePath: string,
    ) => {
      if (running) {
        return routePath === "/operation/toolkit" || routePath === "/external/toolkit"
          ? t("layout.menu.toolTaskRunning")
          : t("layout.menu.taskRunning");
      }

      if (status === "available") {
        return routePath === "/operation/toolkit" || routePath === "/external/toolkit"
          ? t("layout.menu.toolkitAvailable")
          : t("layout.menu.browserAutomationAvailable");
      }

      if (status === "offline") {
        return routePath === "/operation/toolkit" || routePath === "/external/toolkit"
          ? t("layout.menu.toolkitUnavailable")
          : t("layout.menu.browserAutomationUnavailable");
      }

      const browserRuntimes = clientNodeStore.clients
        .filter((client) => client.isOnline)
        .map((client) => getClientServiceRuntime(client, "browser-automation"))
        .filter(Boolean);

      const runtimePriority = (runtime: Record<string, any>) => {
        if (runtime.lastError || runtime.status === "error" || runtime.state === "error") {
          return 4;
        }
        if (runtime.details?.hasInstance) {
          return 3;
        }
        if (runtime.connected) {
          return 2;
        }
        return 1;
      };

      const targetRuntime = browserRuntimes
        .slice()
        .sort((left, right) => runtimePriority(right) - runtimePriority(left))[0];

      if (!targetRuntime) {
        return t("layout.menu.clientConnectedButServiceNotStarted");
      }

      const hint = getBrowserAutomationRuntimeHint(targetRuntime);
      if (hint === t("layout.menu.automationServiceNotStarted")) {
        return t("layout.menu.clientConnectedButServiceNotStarted");
      }
      if (hint === t("layout.menu.automationServiceError")) {
        return t("layout.menu.clientConnectedButServiceError");
      }

      return hint;
    };

    const renderStatusDot = (routePath: string) => {
      const rawStatus = routeStatusMap.value[routePath];
      const status = rawStatus;
      if (!status) {
        return undefined;
      }
      const supportsRunningIndicator =
        routePath !== "/external/ps-automation" && !busyIndicatorDisabledRoutes.has(routePath);
      const running = supportsRunningIndicator ? routeRunningMap.value[routePath] : false;

      const titleMap: Record<string, Record<"available" | "offline", string>> = {
        "/operation/toolkit": {
          available: t("layout.menu.toolkitAvailable"),
          offline: t("layout.menu.toolkitUnavailable"),
        },
        "/external/toolkit": {
          available: t("layout.menu.toolkitAvailable"),
          offline: t("layout.menu.toolkitUnavailable"),
        },
        "/external/browser-automation": {
          available: t("layout.menu.browserAutomationAvailable"),
          offline: t("layout.menu.browserAutomationUnavailable"),
        },
        "/external/ps-automation": {
          available: t("layout.menu.psAutomationAvailable"),
          offline: t("layout.menu.psAutomationUnavailable"),
        },
        "/external/google-art": {
          available: t("layout.menu.googleArtAvailable"),
          offline: t("layout.menu.googleArtUnavailable"),
        },
        "/content/image-processing-record": {
          available: t("layout.menu.imageProcessingAvailable"),
          offline: t("layout.menu.imageProcessingUnavailable"),
        },
        "/content/remotion-video-record": {
          available: t("layout.menu.videoTemplateAvailable"),
          offline: t("layout.menu.videoTemplateUnavailable"),
        },
        "/product-publish/queue": {
          available: t("layout.menu.publishTaskAvailable"),
          offline: t("layout.menu.publishTaskUnavailable"),
        },
      };

      const title =
        routePath === "/product-publish/queue"
          ? publishTaskTooltipText.value
          : routePath === "/external/browser-automation" ||
              routePath === "/operation/toolkit" ||
              routePath === "/external/toolkit"
            ? resolveBrowserAutomationStatusTitle(status, running, routePath)
            : routePath === "/content/image-processing-record" && running
              ? t("layout.menu.imageTaskRunning")
              : running
                ? t("layout.menu.taskRunning")
                : titleMap[routePath]?.[status];

      if (running) {
        return renderRunningStatusDot(
          title || t("layout.menu.taskRunning"),
          routePath === "/product-publish/queue"
            ? "queue"
            : isRemotionRoute(routePath)
              ? "video"
              : undefined,
        );
      }

      return renderMenuStatusHint(
        <span class={[`${prefixCls}__status-dot`, `${prefixCls}__status-dot--${status}`]} />,
        title || t("layout.menu.currentlyUnavailable"),
      );
    };

    const renderServiceHealthDot = (route: AppRouteRecordRaw, routePath: string) => {
      if (menuStatusRouteMap[routePath]) {
        return undefined;
      }

      const statusKey = route.meta?.serviceStatusKey;
      if (!isServiceHealthKey(statusKey)) {
        return undefined;
      }

      if (!!routeRunningMap.value[routePath]) {
        return renderRunningStatusDot(t("layout.menu.videoTaskRunning"));
      }

      ensureServiceHealthInitialized(statusKey);
      const snapshot = serviceHealthStates[statusKey];
      const tone = resolveServiceHealthTone(snapshot);
      const title = resolveServiceHealthMenuTooltip(snapshot);

      return renderMenuStatusHint(
        <span class={[`${prefixCls}__status-dot`, `${prefixCls}__status-dot--${tone}`]} />,
        title,
      );
    };

    const isPsdSetRoute = (routePath: string) => routePath === "/product-publish/psd-set";
    const isQueueRoute = (routePath: string) => routePath === "/product-publish/queue";
    const isImageProcessingRoute = (routePath: string) =>
      routePath === "/content/image-processing-record";
    const isRemotionRoute = (routePath: string) => routePath === "/content/remotion-video-record";

    const renderPsdSetAutoDot = (routePath: string) => {
      if (!isPsdSetRoute(routePath)) {
        return undefined;
      }

      if (isAnyPsdSetProcessing.value) {
        return renderRunningStatusDot(processingTooltipText.value, "psd");
      }

      return renderAutoModeBadge(
        userAutoSchedulingEnabled.value ? t("layout.menu.autoProcessingEnabled") : t("layout.menu.autoProcessingDisabled"),
        {
          enabled: userAutoSchedulingEnabled.value,
          variant: "psd",
        },
      );
    };

    const renderPublishTaskAutoBadge = (routePath: string) => {
      if (!isQueueRoute(routePath)) {
        return undefined;
      }

      if (routeRunningMap.value[routePath]) {
        return renderRunningStatusDot(publishTaskTooltipText.value, "queue");
      }

      if (!publishTaskAutoSchedulingEnabled.value) {
        return undefined;
      }

      return renderAutoModeBadge(
        publishTaskMenuStatusTone.value === "offline"
          ? t("layout.menu.autoExecuteEnabledButTaskUnavailable")
          : t("layout.menu.autoExecuteEnabled"),
        {
          enabled: true,
          variant: "queue",
        },
      );
    };

    const renderAiConfigBadge = (routePath: string) => {
      if (
        routePath !== "/system/ai-api-key" ||
        !aiConfigState.initialized ||
        aiConfigState.loading ||
        aiConfigState.totalFeatureCount <= 0
      ) {
        return undefined;
      }

      const label = `${aiConfigState.boundFeatureCount}/${aiConfigState.totalFeatureCount}`;
      const title = aiConfigState.missing
        ? t("layout.menu.aiConfigIncomplete", { reason: aiConfigState.reason, label })
        : t("layout.menu.aiConfigComplete", { label });

      return renderAutoModeBadge(title, {
        enabled: !aiConfigState.missing,
        variant: "ai",
        label,
      });
    };

    const renderMessagePushBadge = (routePath: string) => {
      if (routePath !== "/system/message-push" || !messagePushMenuState.initialized) {
        return undefined;
      }

      const enabledCount = messagePushMenuState.enabledSceneCount;
      const configuredCount = messagePushMenuState.configuredSceneCount;

      if (enabledCount === 0) {
        return renderAutoModeBadge(t("layout.menu.notificationDisabled"), {
          enabled: false,
          variant: "message",
          label: t("layout.menu.off"),
        });
      }

      const label = `${configuredCount}/${enabledCount}`;
      const tip = t("layout.menu.notificationEnabledTip", { enabledCount, configuredCount });

      return renderAutoModeBadge(tip, {
        enabled: true,
        variant: "message",
        label,
      });
    };

    const renderWorkflowRuntimeBadge = (routePath: string) => {
      if (routePath !== "/workflow/index") return undefined;
      if (workflowRuntimeLoading.value && runningWorkflowCount.value === 0) {
        return renderMenuStatusHint(
          <span class={`${prefixCls}__status-loader`} />,
          "正在获取工作流运行状态",
        );
      }
      if (runningWorkflowCount.value <= 0) return undefined;
      return renderMenuStatusHint(
        <span class={`${prefixCls}__workflow-running-badge`}>
          <span class={`${prefixCls}__workflow-running-loader`}>
            {runningWorkflowCount.value}
          </span>
        </span>,
        `当前有 ${runningWorkflowCount.value} 个工作流正在运行`,
      );
    };

    const renderAiAssistantRuntimeBadge = (routePath: string) => {
      if (routePath !== "/ai/assistant") {
        return undefined;
      }

      ensureAiAssistantRuntimeInitialized();
      const tone = resolveAiAssistantRuntimeTone();
      const title = resolveAiAssistantRuntimeTooltip();
      const runningCount = aiAssistantRuntimeState.runningCount;

      if (tone === "running" && runningCount > 0) {
        // 显示运行中的 Agent 数量 - 使用与状态点相同大小的圆点
        return renderMenuStatusHint(
          <span class={`${prefixCls}__status-count`} />,
          t("layout.menu.agentRunningCount", { runningCount }),
        );
      }

      if (tone === "checking") {
        return renderMenuStatusHint(<span class={`${prefixCls}__status-loader`} />, title);
      }

      return renderMenuStatusHint(
        <span
          class={[
            `${prefixCls}__status-dot`,
            tone === "available"
              ? `${prefixCls}__status-dot--available`
              : `${prefixCls}__status-dot--offline`,
          ]}
        />,
        title,
      );
    };

    const renderDesignToolRuntimeBadge = (routePath: string) => {
      if (routePath !== "/external/design-tool") {
        return undefined;
      }

      ensureDesignToolRuntimeInitialized();
      const tone = resolveDesignToolRuntimeTone();
      const title = resolveDesignToolRuntimeTooltip();

      if (tone === "checking") {
        return renderMenuStatusHint(<span class={`${prefixCls}__status-loader`} />, title);
      }

      return renderMenuStatusHint(
        <span
          class={[
            `${prefixCls}__design-tool-badge`,
            `${prefixCls}__design-tool-badge--${tone}`,
          ]}
        >
          <span class={`${prefixCls}__design-tool-badge-dot`} />
          <span>{designToolRuntimeState.onlineCount}</span>
        </span>,
        title,
      );
    };

    const isMenuLinkRunning = (routePath: string) => {
      if (isPsdSetRoute(routePath)) {
        return isAnyPsdSetProcessing.value;
      }
      if (isQueueRoute(routePath)) {
        return !!routeRunningMap.value[routePath];
      }
      if (isRemotionRoute(routePath)) {
        return !!routeRunningMap.value[routePath];
      }
      if (isImageProcessingRoute(routePath)) {
        return !!routeRunningMap.value[routePath];
      }
      if (routePath === "/external/design-tool") {
        return designToolRuntimeState.runningCount > 0;
      }
      return false;
    };

    const getRoutePath = (route: AppRouteRecordRaw, parentPath = "/") => {
      return isUrl(route.path) ? route.path : pathResolve(parentPath, route.path);
    };

    const getVisibleChildren = (route: AppRouteRecordRaw) => {
      return (route.children ?? []).filter((child) => !child.meta?.hidden);
    };

    const hasRoutePath = (
      routeList: AppRouteRecordRaw[],
      targetPath: string,
      parentPath = "/",
    ): boolean => {
      return routeList.some((route) => {
        const fullPath = getRoutePath(route, parentPath);
        if (fullPath === targetPath) {
          return true;
        }
        const children = getVisibleChildren(route);
        if (!children.length) {
          return false;
        }
        return hasRoutePath(children, targetPath, fullPath);
      });
    };

    const shouldTrackAiConfig = computed(() => hasRoutePath(routers.value, "/system/ai-api-key"));
    const shouldTrackAiAssistant = computed(() => hasRoutePath(routers.value, "/ai/assistant"));
    const shouldTrackDesignTool = computed(() =>
      hasRoutePath(routers.value, "/external/design-tool"),
    );
    const shouldTrackMessagePush = computed(() =>
      hasRoutePath(routers.value, "/system/message-push"),
    );

    const hasActiveChild = (route: AppRouteRecordRaw) => {
      const routePath = getRoutePath(route);
      return getVisibleChildren(route).some(
        (child) => getRoutePath(child, routePath) === activeMenu.value,
      );
    };

    const isRouteActive = (route: AppRouteRecordRaw) => {
      return getRoutePath(route) === activeMenu.value || hasActiveChild(route);
    };

    const selectMenu = async (path: string) => {
      if (isUrl(path)) {
        window.open(path);
        closeMobileMenu();
        return;
      }
      // 标记资源广场页面为已访问（消除"新"标签）
      markResourceLibraryVisited(path);
      await push(path);
      closeMobileMenu();
    };

    const toggleSection = (routePath: string) => {
      expandedMenus.value = {
        ...expandedMenus.value,
        [routePath]: !expandedMenus.value[routePath],
      };
    };

    watch(
      routers,
      (value) => {
        const nextExpanded: Record<string, boolean> = {};
        value.forEach((route) => {
          const routePath = getRoutePath(route);
          nextExpanded[routePath] =
            !!menuSearchText.value ||
            (expandedMenus.value[routePath] ?? getVisibleChildren(route).length > 0);
        });
        expandedMenus.value = nextExpanded;
      },
      { immediate: true, deep: true },
    );

    watch(
      [visibleRouters, menuSearchText],
      ([value, keyword]) => {
        if (!keyword) {
          return;
        }
        const nextExpanded = { ...expandedMenus.value };
        value.forEach((route) => {
          const routePath = getRoutePath(route);
          if (getVisibleChildren(route).length) {
            nextExpanded[routePath] = true;
          }
        });
        expandedMenus.value = nextExpanded;
      },
      { immediate: true },
    );

    watch(
      shouldTrackAiAssistant,
      (enabled) => {
        if (enabled) {
          ensureAiAssistantRuntimeInitialized();
        }
      },
      { immediate: true },
    );

    watch(
      shouldTrackDesignTool,
      (enabled) => {
        if (enabled) {
          ensureDesignToolRuntimeInitialized();
        }
      },
      { immediate: true },
    );

    watch(
      shouldTrackAiConfig,
      (enabled) => {
        if (enabled) {
          void refreshAiConfigState();
        }
      },
      { immediate: true },
    );

    watch(
      shouldTrackMessagePush,
      (enabled) => {
        if (enabled) {
          void refreshMessagePushMenuState();
        }
      },
      { immediate: true },
    );

    onMounted(() => {
      void refreshPsdSetRuntime();
      void refreshPublishTaskRuntime();
    });

    return () => (
      <nav id={prefixCls} class={`${prefixCls} h-full`}>
        <div class={`${prefixCls}__panel`}>
          {logo.value ? (
            <div class={`${prefixCls}__logo`}>
              <Logo class={`${prefixCls}__logo-inner`} />
            </div>
          ) : undefined}

          <div class={`${prefixCls}__search`}>
            <ElInput
              class={`${prefixCls}__search-input`}
              v-model={menuKeyword.value}
              size="small"
              clearable
              placeholder={t("layout.menu.searchMenu")}
              prefixIcon={Search}
            />
            {!mobile.value ? (
              <ElTooltip content={t("layout.menu.collapseMenu")} placement="right" effect="light" showAfter={300}>
                <button
                  type="button"
                  class={`${prefixCls}__collapse-button`}
                  aria-label={t("layout.menu.collapseMenu")}
                  onClick={collapseMenu}
                >
                  <Icon icon="ep:fold" />
                </button>
              </ElTooltip>
            ) : undefined}
          </div>

          {visibleRouters.value.length ? (
            visibleRouters.value.map((route) => {
              const routePath = getRoutePath(route);
              const children = getVisibleChildren(route);
              const sectionActive = isRouteActive(route);
              const expanded = menuSearchText.value ? true : expandedMenus.value[routePath];

              if (!children.length) {
                return (
                  <button
                    type="button"
                    key={routePath}
                    class={[
                      `${prefixCls}__section`,
                      `${prefixCls}__section--leaf`,
                      { [`${prefixCls}__section--active`]: sectionActive },
                    ]}
                    onClick={() => selectMenu(routePath)}
                  >
                    <div class={`${prefixCls}__section-head`}>
                      <div class={`${prefixCls}__section-label`}>
                        {route.meta?.icon ? (
                          <Icon class={`${prefixCls}__section-icon`} icon={route.meta.icon} size={11} />
                        ) : undefined}
                        <span class={`${prefixCls}__section-title`}>{t(route.meta?.title as string)}</span>
                      </div>
                      {renderWorkflowRuntimeBadge(routePath) ||
                        renderMessagePushBadge(routePath) ||
                        renderServiceHealthDot(route, routePath)}
                    </div>
                  </button>
                );
              }

              return (
                <section
                  key={routePath}
                  class={[
                    `${prefixCls}__section`,
                    { [`${prefixCls}__section--active`]: sectionActive },
                  ]}
                >
                  <button
                    type="button"
                    class={`${prefixCls}__section-head`}
                    onClick={() => toggleSection(routePath)}
                  >
                    <div class={`${prefixCls}__section-label`}>
                      {route.meta?.icon ? (
                        <Icon class={`${prefixCls}__section-icon`} icon={route.meta.icon} size={11} />
                      ) : undefined}
                      <span class={`${prefixCls}__section-title`}>{t(route.meta?.title as string)}</span>
                    </div>
                    <Icon
                      class={`${prefixCls}__section-arrow`}
                      icon={expanded ? "ep:arrow-up" : "ep:arrow-down"}
                    />
                  </button>

                  {expanded ? (
                    <div class={`${prefixCls}__links`}>
                      {children.map((child) => {
                        const childPath = getRoutePath(child, routePath);
                        return (
                          <button
                            type="button"
                            key={childPath}
                            title={t(String(child.meta?.title ?? ""))}
                            class={[
                              `${prefixCls}__link`,
                              {
                                [`${prefixCls}__link--active`]: childPath === activeMenu.value,
                                [`${prefixCls}__link--warning`]:
                                  childPath === "/system/ai-api-key" &&
                                  aiConfigState.initialized &&
                                  !aiConfigState.loading &&
                                  aiConfigState.missing,
                                [`${prefixCls}__link--running`]: isMenuLinkRunning(childPath),
                                [`${prefixCls}__link--running-psd`]:
                                  isPsdSetRoute(childPath) && isAnyPsdSetProcessing.value,
                                [`${prefixCls}__link--running-queue`]:
                                  isQueueRoute(childPath) && !!routeRunningMap.value[childPath],
                                [`${prefixCls}__link--running-video`]:
                                  isRemotionRoute(childPath) && !!routeRunningMap.value[childPath],
                              },
                            ]}
                            onClick={() => selectMenu(childPath)}
                          >
                            <span class={`${prefixCls}__link-text`}>{t(child.meta?.title as string)}</span>
                            {renderResourceLibraryNewTag(childPath) ||
                              renderWorkflowRuntimeBadge(childPath) ||
                              renderDesignToolRuntimeBadge(childPath) ||
                              renderAiAssistantRuntimeBadge(childPath) ||
                              renderAiConfigBadge(childPath) ||
                              renderMessagePushBadge(childPath) ||
                              renderPsdSetAutoDot(childPath) ||
                              renderPublishTaskAutoBadge(childPath) ||
                              renderServiceHealthDot(child, childPath) ||
                              renderStatusDot(childPath)}
                          </button>
                        );
                      })}
                    </div>
                  ) : undefined}
                </section>
              );
            })
          ) : (
            <div class={`${prefixCls}__empty`}>{t("layout.menu.noMatchingMenu")}</div>
          )}
        </div>
      </nav>
    );
  },
});
</script>

<style lang="scss" scoped>
$prefix-cls: #{$namespace}-menu;

@keyframes menu-status-loader-spin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes design-tool-runtime-pulse {
  0%,
  100% {
    opacity: 0.65;
    transform: scale(0.9);
    box-shadow: 0 0 0 0 rgb(245 158 11 / 0%);
  }

  50% {
    opacity: 1;
    transform: scale(1.25);
    box-shadow: 0 0 0 3px rgb(245 158 11 / 16%);
  }
}

@keyframes status-dot-breathe-available {
  0%,
  100% {
    transform: scale(0.96);
    box-shadow:
      0 0 0 1px rgb(52 211 153 / 20%),
      0 0 8px rgb(52 211 153 / 28%),
      0 0 14px rgb(52 211 153 / 12%);
  }

  50% {
    transform: scale(1.08);
    box-shadow:
      0 0 0 1px rgb(52 211 153 / 28%),
      0 0 14px rgb(52 211 153 / 48%),
      0 0 26px rgb(52 211 153 / 24%);
  }
}

@keyframes status-dot-wave-available {
  0% {
    opacity: 0.42;
    transform: scale(1);
  }

  70%,
  100% {
    opacity: 0;
    transform: scale(2.8);
  }
}

@keyframes status-dot-breathe-offline {
  0%,
  100% {
    transform: scale(1);
    box-shadow:
      0 0 0 1px rgb(148 163 184 / 10%),
      0 0 6px rgb(148 163 184 / 10%);
  }

  50% {
    transform: scale(1.03);
    box-shadow:
      0 0 0 1px rgb(148 163 184 / 14%),
      0 0 10px rgb(148 163 184 / 16%);
  }
}

@keyframes status-ring-spin {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}

@keyframes status-dot-running-core {
  0%,
  100% {
    transform: scale(0.98);
    box-shadow:
      inset 0 0 0 1px rgb(245 158 11 / 20%),
      0 0 8px rgb(245 158 11 / 16%);
  }

  50% {
    transform: scale(1.04);
    box-shadow:
      inset 0 0 0 1px rgb(245 158 11 / 28%),
      0 0 12px rgb(245 158 11 / 28%);
  }
}

@keyframes status-dot-running-pulse {
  0%,
  100% {
    opacity: 0.88;
    transform: scale(0.92);
  }

  50% {
    opacity: 1;
    transform: scale(1);
  }
}

@media (width >= 768px) and (width <= 1180px) {
  .#{$prefix-cls}__panel {
    gap: 4px;
    padding: 0 10px 22px;
  }

  .#{$prefix-cls}__logo {
    padding: 10px 0 12px;
  }

  .#{$prefix-cls}__search {
    top: 54px;
    padding-bottom: 7px;
  }

  .#{$prefix-cls}__section {
    padding: 7px 0 9px;
  }

  .#{$prefix-cls}__section-head {
    min-height: 42px;
    padding: 8px 10px;
    border-radius: 12px;
  }

  .#{$prefix-cls}__links {
    gap: 6px 8px;
    padding: 9px 2px 0 28px;
  }

  .#{$prefix-cls}__link {
    min-height: 34px;
    padding: 6px 10px;
    border-left-width: 3px;
    border-radius: 0 8px 8px 0;
  }

  .#{$prefix-cls}__link-text {
    font-size: 11px;
  }

  .#{$prefix-cls}__status-dot,
  .#{$prefix-cls}__auto-badge {
    transform: scale(1.08);
  }
}

@media (width <= 767px) {
  .#{$prefix-cls}__panel {
    gap: 4px;
    padding: 0 8px 18px;
  }

  .#{$prefix-cls}__logo {
    padding: 8px 0 10px;
    margin-bottom: 2px;
  }

  .#{$prefix-cls}__search {
    top: 50px;
    padding: 5px 0 7px;
  }

  .#{$prefix-cls}__section {
    padding: 5px 0 7px;
  }

  .#{$prefix-cls}__section-head {
    padding: 7px 8px;
    border-radius: 10px;
  }

  .#{$prefix-cls}__section-title {
    font-size: 11px;
  }

  .#{$prefix-cls}__links {
    gap: 5px;
    padding: 8px 2px 0 20px;
  }

  .#{$prefix-cls}__link {
    min-height: 30px;
    padding: 5px 8px;
    border-radius: 0 7px 7px 0;
  }

  .#{$prefix-cls}__link-text {
    font-size: 11px;
  }
}

.#{$prefix-cls} {
  @keyframes status-count-breathe {
    0%,
    100% {
      opacity: 0.85;
      transform: scale(1);
    }

    50% {
      opacity: 1;
      transform: scale(1.05);
    }
  }

  @keyframes status-count-ring {
    0%,
    100% {
      opacity: 0.3;
      transform: scale(1);
    }

    50% {
      opacity: 0.6;
      transform: scale(1.15);
    }
  }

  height: 100%;
  overflow: hidden scroll;
  background: var(--left-menu-bg-color, #141414);
  border-right: 1px solid var(--left-menu-border-color, #2f3542);
  scrollbar-gutter: stable;
  scrollbar-width: thin;
  scrollbar-color: var(--app-scrollbar-thumb-color) transparent;

  @media (width >= 768px) and (width <= 1180px),
    (width >= 1181px) and (width <= 1366px) and (any-pointer: coarse) {
    &__panel {
      gap: 1px;
    }

    &__section-title {
      font-weight: 500;
      line-height: 1.05;
    }

    &__links {
      grid-template-columns: 1fr;
      padding-left: var(--left-menu-links-padding-left);
    }

    &__link-text {
      line-height: 1.05;
    }
  }

  @media (width <= 767px) {
    &__links {
      grid-template-columns: 1fr;
      padding-left: calc(var(--left-menu-links-padding-left) + 2px);
    }
  }

  &::-webkit-scrollbar {
    width: 4px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background: var(--app-scrollbar-thumb-color);
    border-radius: 999px;
  }

  &::-webkit-scrollbar-thumb:hover {
    background: var(--app-scrollbar-thumb-hover-color);
  }

  &__panel {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-height: 100%;
    padding: 0 var(--left-menu-panel-padding-x) var(--left-menu-panel-padding-bottom);
  }

  &__logo {
    position: sticky;
    top: 0;
    z-index: 2;
    padding: var(--left-menu-logo-padding-top) 0 var(--left-menu-logo-padding-bottom);
    margin-bottom: var(--left-menu-logo-margin-bottom);
    background: var(--left-menu-bg-color, #141414);
    border-bottom: 1px solid var(--left-menu-divider-color);
  }

  &__logo-inner {
    width: 100%;
    border: 0 !important;
  }

  &__search {
    position: sticky;
    top: var(--left-menu-search-sticky-top, 64px);
    z-index: 2;
    display: flex;
    padding: 6px 0 8px;
    background: var(--left-menu-bg-color, #141414);
    border-bottom: 1px solid var(--left-menu-divider-color);
    align-items: center;
    gap: 4px;
  }

  &__search-input {
    min-width: 0;
    flex: 1;
  }

  &__search-input :deep(.el-input__wrapper) {
    min-height: 30px;
    background: transparent;
    border-radius: 0;
    box-shadow: inset 0 -1px 0 transparent;
    transition: box-shadow 0.16s ease;
    padding-inline: 4px;
  }

  &__search-input :deep(.el-input__wrapper:hover) {
    box-shadow: inset 0 -1px 0 var(--left-menu-divider-color);
  }

  &__search-input :deep(.el-input__wrapper.is-focus) {
    box-shadow: inset 0 -1px 0 color-mix(in srgb, var(--el-color-primary) 68%, transparent);
  }

  &__search-input :deep(.el-input__inner) {
    font-size: 12px;
    color: var(--left-menu-title-color);
  }

  &__search-input :deep(.el-input__inner::placeholder) {
    color: color-mix(in srgb, var(--left-menu-title-color) 44%, transparent);
  }

  &__search-input :deep(.el-input__prefix),
  &__search-input :deep(.el-input__clear) {
    color: color-mix(in srgb, var(--left-menu-title-color) 58%, transparent);
  }

  &__collapse-button {
    display: inline-flex;
    width: 28px;
    height: 28px;
    padding: 0;
    color: color-mix(in srgb, var(--left-menu-title-color) 62%, transparent);
    cursor: pointer;
    background: transparent;
    border: 0;
    border-radius: 6px;
    transition:
      color 0.16s ease,
      background-color 0.16s ease;
    flex: 0 0 28px;
    align-items: center;
    justify-content: center;
  }

  &__collapse-button:hover,
  &__collapse-button:focus-visible {
    color: var(--left-menu-text-active-color) !important;
    background: var(--left-menu-hover-color);
    outline: none;
  }

  &__empty {
    padding: 22px 8px;
    font-size: 12px;
    color: rgb(203 213 225 / 56%);
    text-align: center;
  }

  &__section {
    width: 100%;
    padding: var(--left-menu-section-padding-top) 0 var(--left-menu-section-padding-bottom);
    border-bottom: 1px solid var(--left-menu-divider-color);
  }

  &__section--leaf {
    display: block;
    padding-bottom: 3px;
    background: transparent;
    border: none;
    outline: none;
    box-shadow: none;
    appearance: none;
    appearance: none;
  }

  &__section-head {
    display: flex;
    width: 100%;
    padding: var(--left-menu-section-head-padding-y) var(--left-menu-section-head-padding-x);
    text-align: left;
    cursor: pointer;
    background: transparent;
    border: none;
    border-radius: var(--left-menu-section-radius);
    outline: none;
    box-shadow: none;
    transition:
      background-color var(--transition-time-02),
      color var(--transition-time-02);
    appearance: none;
    appearance: none;
    align-items: center;
    justify-content: space-between;
  }

  &__section-head:hover {
    background: var(--left-menu-hover-color);
  }

  &__section-head::-moz-focus-inner {
    padding: 0;
    border: 0;
  }

  &__section-head:focus {
    outline: none;
  }

  &__section-head:focus-visible {
    outline: 2px solid rgb(64 158 255 / 32%);
    outline-offset: 1px;
  }

  &__section-label {
    display: flex;
    align-items: center;
    gap: var(--left-menu-section-gap);
    flex: 1;
    min-width: 0;
  }

  &__section-icon {
    flex: none;
    font-size: var(--left-menu-section-icon-size, 11px) !important;
    width: var(--left-menu-section-icon-size, 11px) !important;
    height: var(--left-menu-section-icon-size, 11px) !important;
    color: var(--left-menu-icon-color);
    display: inline-flex;
    align-items: center;
    justify-content: center;

    :deep(svg),
    :deep(.iconify) {
      width: 100% !important;
      height: 100% !important;
      font-size: inherit !important;
    }
  }

  &__section-title {
    min-width: 0;
    overflow: hidden;
    font-size: var(--left-menu-section-title-size);
    font-weight: 600;
    line-height: 1.15;
    color: var(--left-menu-title-color);
    text-overflow: ellipsis;
    white-space: nowrap;
    flex: 1;
  }

  &__section-arrow {
    flex: none;
    font-size: var(--left-menu-section-arrow-size);
    color: var(--left-menu-arrow-color);
  }

  &__section--active > .#{$prefix-cls}__section-head {
    background: var(--left-menu-hover-color);
  }

  &__section--active > .#{$prefix-cls}__section-head .#{$prefix-cls}__section-icon,
  &__section--active > .#{$prefix-cls}__section-head .#{$prefix-cls}__section-title {
    color: var(--left-menu-text-active-color) !important;
  }

  &__links {
    display: grid;
    grid-template-columns: repeat(var(--left-menu-links-columns), minmax(0, 1fr));
    gap: var(--left-menu-links-gap-y) var(--left-menu-links-gap-x);
    padding: var(--left-menu-links-padding-top) var(--left-menu-links-padding-right) 0
      var(--left-menu-links-padding-left);
  }

  &__link {
    display: flex;
    width: 100%;
    min-width: 0;
    min-height: var(--left-menu-link-min-height);
    padding: var(--left-menu-link-padding-y) var(--left-menu-link-padding-x);
    color: var(--left-menu-link-text-color);
    text-align: left;
    cursor: pointer;
    background: transparent;
    border: 0;
    border-left: 2px solid transparent;
    border-radius: 0 var(--left-menu-link-radius) var(--left-menu-link-radius) 0;
    outline: none;
    box-shadow: none;
    transition:
      background-color var(--transition-time-02),
      border-color var(--transition-time-02),
      color var(--transition-time-02),
      transform var(--transition-time-02);
    appearance: none;
    appearance: none;
    align-items: center;
  }

  &__link:hover {
    color: var(--left-menu-link-hover-color);
    background: var(--left-menu-link-hover-bg);
    border-left-color: var(--left-menu-link-active-border-color);
    transform: translateX(1px);
  }

  &__link::-moz-focus-inner {
    padding: 0;
    border: 0;
  }

  &__link:focus {
    outline: none;
  }

  &__link:focus-visible {
    outline: 2px solid rgb(64 158 255 / 28%);
    outline-offset: 1px;
  }

  &__link--active {
    color: var(--left-menu-link-active-color);
    background: var(--left-menu-link-active-bg);
    border-left-color: var(--left-menu-link-active-border-color);
  }

  &__link--warning:not(.#{$prefix-cls}__link--active) {
    color: rgb(255 236 205 / 92%);
    background: linear-gradient(90deg, rgb(245 158 11 / 10%) 0%, rgb(245 158 11 / 0%) 100%);
    border-left-color: rgb(245 158 11 / 42%);
  }

  &__link--warning:hover:not(.#{$prefix-cls}__link--active) {
    color: rgb(255 245 228 / 96%);
    background:
      linear-gradient(90deg, rgb(245 158 11 / 15%) 0%, rgb(245 158 11 / 2%) 100%),
      var(--left-menu-link-hover-bg);
    border-left-color: rgb(245 158 11 / 60%);
  }

  &__link-text {
    position: relative;
    z-index: 1;
    display: block;
    min-width: 0;
    padding: 2px 0;
    overflow: hidden;
    font-size: var(--left-menu-link-font-size);
    font-weight: 500;
    line-height: 1.1;
    text-overflow: ellipsis;
    white-space: nowrap;
    flex: 1;
  }

  &__status-indicator {
    position: relative;
    z-index: 1;
    display: inline-flex;
    flex: none;
    align-items: center;
  }

  :global(.#{$prefix-cls}__status-tooltip-popper.el-popper),
  :global(.#{$prefix-cls}__status-tooltip-popper.el-popper .el-popper__arrow) {
    animation: none !important;
    transition: none !important;
  }

  &__auto-badge {
    position: relative;
    z-index: 1;
    display: inline-flex;
    height: 16px;
    min-width: 28px;
    padding: 0 6px;
    margin-left: var(--left-menu-psd-dot-margin-left);
    font-size: 8px;
    font-weight: 400;
    line-height: 1;
    letter-spacing: 0.04em;
    color: rgb(226 232 240 / 72%);
    text-indent: 0.04em;
    white-space: nowrap;
    background: rgb(148 163 184 / 10%);
    border: 1px solid rgb(148 163 184 / 20%);
    border-radius: 999px;
    box-shadow:
      inset 0 1px 0 rgb(255 255 255 / 4%),
      0 2px 6px rgb(15 23 42 / 12%);
    flex: none;
    align-items: center;
    justify-content: center;
    backdrop-filter: blur(6px);
  }

  &__auto-badge--enabled {
    color: rgb(255 140 0 / 94%);
  }

  &__auto-badge--psd.#{$prefix-cls}__auto-badge--enabled {
    background: linear-gradient(135deg, rgb(245 158 11 / 26%) 0%, rgb(251 191 36 / 16%) 100%);
    border-color: rgb(245 158 11 / 30%);
    box-shadow:
      inset 0 1px 0 rgb(255 255 255 / 6%),
      0 4px 12px rgb(245 158 11 / 14%);
  }

  &__auto-badge--queue.#{$prefix-cls}__auto-badge--enabled {
    background: linear-gradient(135deg, rgb(245 158 11 / 26%) 0%, rgb(251 191 36 / 16%) 100%);
    border-color: rgb(245 158 11 / 30%);
    box-shadow:
      inset 0 1px 0 rgb(255 255 255 / 6%),
      0 4px 12px rgb(245 158 11 / 14%);
  }

  &__auto-badge--message.#{$prefix-cls}__auto-badge--enabled {
    color: rgb(134 239 172 / 94%);
    background: linear-gradient(135deg, rgb(34 197 94 / 24%) 0%, rgb(16 185 129 / 14%) 100%);
    border-color: rgb(34 197 94 / 30%);
    box-shadow:
      inset 0 1px 0 rgb(255 255 255 / 6%),
      0 4px 12px rgb(34 197 94 / 12%);
  }

  &__auto-badge--ai {
    min-width: 34px;
    padding: 0 5px;
    letter-spacing: 0;
    text-indent: 0;
  }

  &__auto-badge--ai.#{$prefix-cls}__auto-badge--enabled {
    color: rgb(134 239 172 / 94%);
    background: rgb(34 197 94 / 14%);
    border-color: rgb(34 197 94 / 30%);
  }

  &__auto-badge--ai.#{$prefix-cls}__auto-badge--muted {
    color: rgb(253 186 116 / 95%);
    background: rgb(245 158 11 / 14%);
    border-color: rgb(245 158 11 / 28%);
  }

  &__auto-badge--muted {
    color: rgb(203 213 225 / 56%);
    background: rgb(148 163 184 / 8%);
    border-color: rgb(148 163 184 / 16%);
  }

  &__design-tool-badge {
    display: inline-flex;
    height: 18px;
    min-width: 30px;
    padding: 0 6px;
    margin-left: var(--left-menu-status-dot-margin-left);
    font-size: 9px;
    font-weight: 600;
    line-height: 1;
    color: rgb(203 213 225 / 72%);
    background: rgb(148 163 184 / 9%);
    border: 1px solid rgb(148 163 184 / 20%);
    border-radius: 999px;
    flex: none;
    align-items: center;
    justify-content: center;
    gap: 5px;
  }

  &__design-tool-badge-dot {
    width: 5px;
    height: 5px;
    background: currentcolor;
    border-radius: 50%;
    flex: 0 0 5px;
  }

  &__design-tool-badge--available {
    color: rgb(110 231 183 / 94%);
    background: rgb(52 211 153 / 10%);
    border-color: rgb(52 211 153 / 24%);
  }

  &__design-tool-badge--running {
    color: rgb(251 191 36 / 96%);
    background: rgb(245 158 11 / 14%);
    border-color: rgb(245 158 11 / 30%);
  }

  &__design-tool-badge--running &__design-tool-badge-dot {
    animation: design-tool-runtime-pulse 1.2s ease-in-out infinite;
  }

  &__design-tool-badge--offline {
    opacity: 0.58;
  }

  &__link--running {
    background: linear-gradient(
      90deg,
      rgb(var(--menu-running-rgb, 245 158 11) / 12%) 0%,
      rgb(var(--menu-running-highlight-rgb, 251 191 36) / 16%) 52%,
      rgb(var(--menu-running-rgb, 245 158 11) / 12%) 100%
    );
    box-shadow:
      inset 0 0 0 1px rgb(var(--menu-running-rgb, 245 158 11) / 18%),
      0 3px 12px rgb(var(--menu-running-rgb, 245 158 11) / 8%);
  }

  &__link--running:not(.#{$prefix-cls}__link--active) {
    color: var(--menu-running-text-color, rgb(255 244 214 / 92%));
  }

  &__link--running:hover {
    box-shadow:
      inset 0 0 0 1px rgb(var(--menu-running-rgb, 245 158 11) / 24%),
      0 4px 14px rgb(var(--menu-running-rgb, 245 158 11) / 12%);
  }

  &__link--running.#{$prefix-cls}__link--active {
    background: linear-gradient(
      90deg,
      rgb(var(--menu-running-rgb, 245 158 11) / 10%) 0%,
      rgb(var(--menu-running-highlight-rgb, 251 191 36) / 12%) 52%,
      rgb(var(--menu-running-rgb, 245 158 11) / 10%) 100%
    );
    box-shadow:
      inset 0 0 0 1px rgb(var(--menu-running-rgb, 245 158 11) / 18%),
      0 0 0 1px rgb(var(--menu-running-rgb, 245 158 11) / 9%);
  }

  &__link--running-queue {
    --menu-running-rgb: 234 179 8;
    --menu-running-highlight-rgb: 250 204 21;
    --menu-running-text-color: rgb(234 179 8 / 98%);
  }

  &__link--running-psd {
    --menu-running-rgb: 234 179 8;
    --menu-running-highlight-rgb: 250 204 21;
    --menu-running-text-color: rgb(234 179 8 / 98%);
  }

  &__link--running-video {
    --menu-running-rgb: 234 179 8;
    --menu-running-highlight-rgb: 250 204 21;
    --menu-running-text-color: rgb(234 179 8 / 98%);
  }

  &__new-tag {
    position: relative;
    z-index: 1;
    display: inline-flex;
    height: 14px;
    min-width: 14px;
    padding: 0 3px;
    margin-left: var(--left-menu-status-dot-margin-left);
    font-size: 9px;
    font-weight: 600;
    line-height: 1;
    color: #fff;
    white-space: nowrap;
    background: #ef4444;
    border-radius: 3px;
    box-shadow:
      inset 0 1px 0 rgb(255 255 255 / 18%),
      0 2px 4px rgb(239 68 68 / 24%);
    flex: none;
    align-items: center;
    justify-content: center;
  }

  &__status-dot {
    position: relative;
    z-index: 1;
    width: var(--left-menu-status-dot-size);
    height: var(--left-menu-status-dot-size);
    margin-left: var(--left-menu-status-dot-margin-left);
    background: var(--el-text-color-placeholder);
    border-radius: 999px;
    box-shadow: 0 0 0 1px rgb(255 255 255 / 10%);
    flex: none;
  }

  &__status-loader {
    width: 10px;
    height: 10px;
    flex: 0 0 10px;
    margin-left: var(--left-menu-status-dot-margin-left);
    border: 1.5px solid color-mix(in srgb, var(--left-menu-title-color) 20%, transparent);
    border-top-color: color-mix(in srgb, var(--el-color-primary) 82%, white 18%);
    border-radius: 999px;
    animation: menu-status-loader-spin 0.72s linear infinite;
  }

  &__status-dot::before,
  &__status-dot::after {
    position: absolute;
    inset: 0;
    border-radius: inherit;
    content: "";
  }

  &__status-dot::before {
    background: inherit;
    opacity: 0.95;
  }

  &__status-dot::after {
    opacity: 0;
    transform: scale(1);
  }

  &__status-dot--available {
    background: #34d399;
    box-shadow:
      0 0 0 1px rgb(52 211 153 / 22%),
      0 0 10px rgb(52 211 153 / 40%),
      0 0 18px rgb(52 211 153 / 18%);
    animation: status-dot-breathe-available 2.2s ease-in-out infinite;
  }

  &__status-dot--available::after {
    background: rgb(52 211 153 / 30%);
    animation: status-dot-wave-available 2.2s ease-out infinite;
  }

  &__status-dot--running {
    background: rgb(var(--menu-running-rgb, 245 158 11) / 10%);
    box-shadow:
      inset 0 0 0 1px rgb(var(--menu-running-rgb, 245 158 11) / 22%),
      0 0 10px rgb(var(--menu-running-rgb, 245 158 11) / 20%);
    animation: status-dot-running-core 1.35s ease-in-out infinite;
  }

  &__status-dot--running::before {
    background: transparent;
    border: 1.5px solid transparent;
    border-top-color: rgb(var(--menu-running-rgb, 245 158 11));
    border-right-color: rgb(var(--menu-running-highlight-rgb, 251 191 36) / 88%);
    animation: status-ring-spin 0.9s linear infinite;
    inset: -1px;
  }

  &__status-dot--running::after {
    inset: 3px;
    background: rgb(var(--menu-running-rgb, 245 158 11) / 92%);
    opacity: 0.92;
    transform: scale(1);
    box-shadow:
      0 0 0 1px rgb(255 255 255 / 18%),
      0 0 8px rgb(var(--menu-running-rgb, 245 158 11) / 34%);
    animation: status-dot-running-pulse 1.25s ease-in-out infinite;
  }

  &__status-dot--running-queue {
    --menu-running-rgb: 234 179 8;
    --menu-running-highlight-rgb: 250 204 21;
  }

  &__status-dot--running-psd {
    --menu-running-rgb: 234 179 8;
    --menu-running-highlight-rgb: 250 204 21;
  }

  &__status-dot--running-video {
    --menu-running-rgb: 234 179 8;
    --menu-running-highlight-rgb: 250 204 21;
  }

  &__status-dot--offline {
    background: rgb(148 163 184 / 88%);
    opacity: 0.1;
    box-shadow:
      0 0 0 1px rgb(148 163 184 / 12%),
      0 0 8px rgb(148 163 184 / 12%);
  }

  &__link:hover &__status-dot--offline,
  &__link--active &__status-dot--offline {
    animation: status-dot-breathe-offline 3s ease-in-out infinite;
  }

  // Agent 运行数量徽章 - 小巧精致风格
  &__status-count {
    position: relative;
    display: inline-flex;
    width: 8px;
    height: 8px;
    margin-left: var(--left-menu-status-dot-margin-left);
    font-size: 0;
    color: transparent;
    background: rgb(var(--menu-running-rgb, 245 158 11) / 90%);
    border-radius: 50%;
    box-shadow: 0 0 6px rgb(var(--menu-running-rgb, 245 158 11) / 30%);
    animation: status-count-breathe 1.8s ease-in-out infinite;
    align-items: center;
    justify-content: center;

    &::before {
      position: absolute;
      border: 1px solid rgb(var(--menu-running-rgb, 245 158 11) / 30%);
      border-radius: 50%;
      content: "";
      animation: status-count-ring 1.5s ease-in-out infinite;
      inset: -2px;
    }
  }

  &__workflow-running-badge {
    display: inline-flex;
    width: 22px;
    height: 22px;
    margin-left: var(--left-menu-status-dot-margin-left);
    align-items: center;
    justify-content: center;
  }

  // 工作流数量直接显示在 loading 圆环中，避免 loading 和数字分离占位。
  &__workflow-running-loader {
    position: relative;
    display: inline-flex;
    width: 21px;
    height: 21px;
    color: #f59e0b;
    font-size: 10px;
    font-weight: 700;
    line-height: 1;
    background: rgb(245 158 11 / 8%);
    border: 1px solid rgb(245 158 11 / 20%);
    border-radius: 50%;
    align-items: center;
    justify-content: center;

    &::before {
      position: absolute;
      border: 2px solid transparent;
      border-top-color: #f59e0b;
      border-right-color: rgb(245 158 11 / 72%);
      border-radius: 50%;
      content: "";
      inset: -2px;
      animation: status-ring-spin 0.8s linear infinite;
    }
  }
}

:global(html.dark) {
  .#{$prefix-cls}__link--running-queue {
    --menu-running-text-color: rgb(250 204 21 / 98%);
  }

  .#{$prefix-cls}__link--running-psd {
    --menu-running-text-color: rgb(250 204 21 / 98%);
  }

  .#{$prefix-cls}__link--running-video {
    --menu-running-text-color: rgb(250 204 21 / 98%);
  }
}

:global(html.light .v-menu__link--warning:not(.v-menu__link--active)) {
  color: rgb(146 64 14 / 98%) !important;
  background: linear-gradient(90deg, rgb(245 158 11 / 16%) 0%, rgb(245 158 11 / 2%) 100%) !important;
  border-left-color: rgb(217 119 6 / 55%) !important;
}

:global(html.light .v-menu__link--warning:hover:not(.v-menu__link--active)) {
  color: rgb(124 45 18 / 98%) !important;
  background:
    linear-gradient(90deg, rgb(245 158 11 / 22%) 0%, rgb(245 158 11 / 4%) 100%),
    var(--left-menu-link-hover-bg) !important;
  border-left-color: rgb(217 119 6 / 70%) !important;
}

:global(html.light .v-menu__auto-badge) {
  color: rgb(51 65 85 / 98%) !important;
  background: rgb(241 245 249 / 98%) !important;
  border-color: rgb(100 116 139 / 34%) !important;
  box-shadow: none !important;
}

:global(html.light .v-menu__design-tool-badge) {
  color: rgb(71 85 105 / 92%) !important;
  background: rgb(248 250 252 / 96%) !important;
  border-color: rgb(100 116 139 / 30%) !important;
}

:global(html.light .v-menu__design-tool-badge--available) {
  color: rgb(5 150 105 / 96%) !important;
  background: rgb(236 253 245 / 96%) !important;
  border-color: rgb(5 150 105 / 30%) !important;
}

:global(html.light .v-menu__design-tool-badge--running) {
  color: rgb(194 65 12 / 96%) !important;
  background: rgb(255 247 237 / 98%) !important;
  border-color: rgb(217 119 6 / 34%) !important;
}

:global(html.light .v-menu__auto-badge--enabled) {
  color: rgb(154 52 18 / 98%) !important;
  background: rgb(255 247 237 / 98%) !important;
  border-color: rgb(217 119 6 / 44%) !important;
}

:global(html.light .v-menu__auto-badge--psd.v-menu__auto-badge--enabled),
:global(html.light .v-menu__auto-badge--queue.v-menu__auto-badge--enabled) {
  color: rgb(154 52 18 / 98%) !important;
  background: rgb(255 247 237 / 98%) !important;
  border-color: rgb(217 119 6 / 46%) !important;
  box-shadow: none !important;
}

:global(html.light .v-menu__auto-badge--message.v-menu__auto-badge--enabled),
:global(html.light .v-menu__auto-badge--ai.v-menu__auto-badge--enabled) {
  color: rgb(21 128 61 / 98%) !important;
  background: rgb(240 253 244 / 98%) !important;
  border-color: rgb(22 163 74 / 44%) !important;
  box-shadow: none !important;
}

:global(html.light .v-menu__auto-badge--muted),
:global(html.light .v-menu__auto-badge--ai.v-menu__auto-badge--muted) {
  color: rgb(51 65 85 / 98%) !important;
  background: rgb(248 250 252 / 98%) !important;
  border-color: rgb(100 116 139 / 40%) !important;
}
</style>
