import { Layout } from "@/utils/routerHelper";
import { ROUTE_MENU_KEY_MAP, ROUTE_MENU_LEGACY_KEY_MAP } from "@/constants/access-control";

const { t } = useI18n();
/**
 * 路由字段说明：
 * redirect: 设置重定向地址。
 * name: 路由名称，需保持唯一，便于 keep-alive 与菜单状态管理。
 * meta.hidden: 是否在侧边栏隐藏。
 * meta.alwaysShow: 即使只有一个子路由，也始终显示父级菜单。
 * meta.title: 菜单、面包屑、标签页显示名称。
 * meta.icon: 菜单图标。
 * meta.noCache: 是否禁用 keep-alive 缓存。
 * meta.breadcrumb: 是否显示在面包屑中。
 * meta.affix: 是否固定在标签页。
 * meta.noTagsView: 是否不显示在标签页中。
 * meta.activeMenu: 高亮指定菜单。
 * meta.followAuth: 跟随指定路由做权限控制。
 * meta.canTo: 即使 hidden 为 true，也允许路由跳转。
 */
const remainingRouter: AppRouteRecordRaw[] = [
  // ── 工作流 ────────────────────────────────────────────────────
  {
    path: '/workflow',
    component: Layout,
    name: 'Workflow',
    redirect: '/workflow/index',
    meta: {
      title: "router.workflow",
      icon: 'lucide:workflow',
      order: 10,
      alwaysShow: true,
    },
    children: [
      {
        path: 'index',
        component: () => import('@/views/workflow/index/index.vue'),
        name: 'WorkflowIndex',
        meta: {
          title: "router.myWorkflow",
          noCache: true,
        },
      },
      {
        path: 'library',
        component: () => import('@/views/workflow/library/index.vue'),
        name: 'WorkflowLibrary',
        meta: {
          title: "router.workflowLibrary",
          noCache: true,
        },
      },
      {
        path: 'editor/:id',
        component: () => import('@/views/workflow/editor/index.vue'),
        name: 'WorkflowEditor',
        meta: {
          title: "router.workflowEditor",
          hidden: true,
          noCache: true,
          noAppViewPadding: true,
          activeMenu: '/workflow/index',
        },
      },
    ],
  },
  // ── 思维导图 ───────────────────────────────────────────────────
  {
    path: '/mind-map',
    component: Layout,
    name: 'MindMap',
    redirect: '/mind-map/index',
    meta: {
      title: "router.mindMap",
      icon: 'lucide:git-branch',
      order: 15,
      alwaysShow: true,
    },
    children: [
      {
        path: 'index',
        component: () => import('@/views/mind-map/index/index.vue'),
        name: 'MindMapIndex',
        meta: {
          title: "router.myMindMap",
          noCache: true,
        },
      },
      {
        path: 'editor/:id',
        component: () => import('@/views/mind-map/editor/index.vue'),
        name: 'MindMapEditor',
        meta: {
          title: "router.mindMapEditor",
          hidden: true,
          noCache: true,
          noAppViewPadding: true,
          activeMenu: '/mind-map/index',
        },
      },
    ],
  },
  {
    path: '/resource-library',
    component: Layout,
    name: 'ResourceLibraryRoute',
    redirect: '/resource-library/sticker',
    meta: {
      title: "router.resourceLibrary",
      icon: 'lucide:sparkles',
      order: 11,
      alwaysShow: true,
    },
    children: [
      {
        path: 'sticker',
        component: () => import('@/views/resource-library/index.vue'),
        name: 'ResourceLibrarySticker',
        meta: {
          title: "router.resourceLibrarySticker",
          noCache: true,
          resourceType: 'sticker',
        },
      },
      {
        path: 'custom-sticker',
        component: () => import('@/views/resource-library/index.vue'),
        name: 'ResourceLibraryCustomSticker',
        meta: {
          title: 'router.resourceLibraryCustomSticker',
          noCache: true,
          resourceType: 'custom_sticker',
        },
      },
      {
        path: 'psd-template',
        component: () => import('@/views/resource-library/index.vue'),
        name: 'ResourceLibraryPsd',
        meta: {
          title: "router.resourceLibraryPsd",
          noCache: true,
          resourceType: 'psd_template',
        },
      },
      {
        path: 'font-template',
        component: () => import('@/views/resource-library/index.vue'),
        name: 'ResourceLibraryFont',
        meta: {
          title: "router.resourceLibraryFont",
          noCache: true,
          resourceType: 'font_template',
        },
      },
      {
        path: 'asset-3d',
        component: () => import('@/views/resource-library/index.vue'),
        name: 'ResourceLibraryAsset3d',
        meta: {
          title: "router.resourceLibraryAsset3d",
          noCache: true,
          resourceType: 'asset_3d',
        },
      },
      {
        path: 'file-resource',
        component: () => import('@/views/resource-library/index.vue'),
        name: 'ResourceLibraryFile',
        meta: {
          title: "router.resourceLibraryFile",
          noCache: true,
          resourceType: 'file_resource',
        },
      },
      {
        path: 'sentence',
        component: () => import('@/views/resource-library/index.vue'),
        name: 'ResourceLibrarySentence',
        meta: {
          title: "router.resourceLibrarySentence",
          noCache: true,
          resourceType: 'sentence',
        },
      },
      {
        path: 'ai-skill',
        component: () => import('@/views/resource-library/index.vue'),
        name: 'ResourceLibraryAiSkill',
        meta: {
          title: "router.resourceLibraryAiSkill",
          noCache: true,
          resourceType: 'ai_skill',
        },
      },
      {
        path: 'prompt',
        component: () => import('@/views/resource-library/index.vue'),
        name: 'ResourceLibraryPrompt',
        meta: {
          title: "router.resourceLibraryPrompt",
          noCache: true,
          resourceType: 'prompt',
        },
      },
      {
        path: 'design-prompt',
        component: () => import('@/views/resource-library/index.vue'),
        name: 'ResourceLibraryDesignPrompt',
        meta: {
          title: "router.resourceLibraryDesignPrompt",
          noCache: true,
          resourceType: 'design_prompt',
        },
      },
    ],
  },
  {
    path: "/",
    name: "Root",
    redirect: "/home/index",
    meta: {
      hidden: true,
    },
  },
  {
    path: "/redirect",
    component: Layout,
    name: "RedirectRoot",
    children: [
      {
        path: ":path(.*)",
        name: "Redirect",
        component: () => import("@/views/Redirect/Redirect.vue"),
        meta: {
          noCache: true,
        },
      },
    ],
    meta: {
      hidden: true,
      noTagsView: true,
    },
  },
  // ── 1. 工作台 ──────────────────────────────────────────────────
  {
    path: "/home",
    component: Layout,
    name: "Home",
    redirect: "/home/index",
    meta: {
      title: "router.workplace",
      icon: "lucide:layout-dashboard",
      order: 1,
      alwaysShow: true,
    },
    children: [
      {
        path: "index",
        component: () => import("@/views/Home/Index.vue"),
        name: "Index",
        meta: {
          title: "router.home",
          noCache: false,
          affix: true,
        },
      },
      {
        path: "hot-search",
        component: () => import("@/views/Home/HotSearch.vue"),
        name: "HotSearch",
        meta: {
          title: "router.hotSearch",
        },
      },
      {
        path: "tools/index",
        component: () => import("@/views/Home/Tools/Index.vue"),
        name: "ToolsIndex",
        meta: {
          title: "router.tools",
        },
      },
      {
        path: "statistics",
        component: () => import("@/views/Home/Statistics/index.vue"),
        name: "Statistics",
        meta: {
          title: "router.statistics",
        },
      },
      {
        path: "vector-search",
        component: () => import("@/views/vector-search/Index.vue"),
        name: "VectorSearch",
        meta: {
          title: "router.vectorSearch",
          menuKey: "home.vector-search",
        },
      },
      {
        path: "design-knowledge",
        component: () => import("@/views/design-knowledge/index.vue"),
        name: "DesignKnowledge",
        meta: {
          title: "router.designKnowledge",
          menuKey: "home.design-knowledge",
        },
      },
      {
        path: "design-prompt",
        component: () => import("@/views/design-prompt/index.vue"),
        name: "DesignPrompt",
        meta: {
          title: "router.designPrompt",
          menuKey: "home.design-prompt",
        },
      },
    ],
  },
  {
    path: "/login",
    component: () => import("@/views/Login/Login.vue"),
    name: "Login",
    meta: {
      hidden: true,
      title: t("router.login"),
      noTagsView: true,
    },
  },
  {
    path: "/oauth/authorize",
    component: () => import("@/views/OAuth/Authorize.vue"),
    name: "OAuthAuthorize",
    meta: {
      hidden: true,
      title: "授权登录",
      noTagsView: true,
    },
  },
  {
    path: "/403",
    component: () => import("@/views/Error/403.vue"),
    name: "NoAccess",
    meta: {
      hidden: true,
      title: "403",
      noTagsView: true,
    },
  },
  {
    path: "/404",
    component: () => import("@/views/Error/404.vue"),
    name: "NoFound",
    meta: {
      hidden: true,
      title: "404",
      noTagsView: true,
      noAppViewPadding: true,
    },
  },
  {
    path: "/500",
    component: () => import("@/views/Error/500.vue"),
    name: "Error",
    meta: {
      hidden: true,
      title: "500",
      noTagsView: true,
    },
  },
  // ── 2. 资源中心 ─────────────────────────────────────────────────────
  {
    path: "/resource",
    component: Layout,
    name: "Resource",
    redirect: "/resource/material",
    meta: {
      hidden: false,
      title: "router.resourceCenter",
      icon: "lucide:folder-open",
      noCache: false,
      affix: false,
      order: 2,
      alwaysShow: true,
    },
    children: [
      {
        path: "crawler-material",
        component: () => import("@/views/material/index/crawler-material.vue"),
        name: "CrawlerMaterial",
        meta: {
          canTo: true,
          hidden: false,
          noTagsView: false,
          title: "router.crawlerMaterial",
        },
      },
      {
        path: "material",
        component: () => import("@/views/material/index/index.vue"),
        name: "Material",
        meta: {
          canTo: true,
          hidden: false,
          noTagsView: false,
          title: "router.imageMaterial",
        },
      },
      {
        path: "custom-sticker",
        component: () => import("@/views/custom-sticker/index.vue"),
        name: "CustomSticker",
        meta: {
          canTo: true,
          hidden: false,
          noTagsView: false,
          title: "router.customSticker",
        },
      },
      {
        path: "file-resource",
        component: () => import("@/views/material/file-resource/index.vue"),
        name: "FileResource",
        meta: {
          canTo: true,
          hidden: false,
          noTagsView: false,
          title: "router.fileResource",
        },
      },
      {
        path: "file-asset",
        component: () => import("@/views/system/file-asset/index.vue"),
        name: "FileAsset",
        meta: {
          canTo: true,
          hidden: false,
          noTagsView: false,
          title: "router.fileAsset",
        },
      },
      {
        path: "asset-3d",
        component: () => import("@/views/material/asset3d/index.vue"),
        name: "Asset3d",
        meta: {
          canTo: true,
          hidden: false,
          noTagsView: false,
          title: "router.asset3d",
        },
      },
      {
        path: "font",
        component: () => import("@/views/material/fontTemplate/index.vue"),
        name: "Font",
        meta: {
          canTo: true,
          hidden: false,
          noTagsView: false,
          title: "router.font",
        },
      },
      {
        path: "psd",
        component: () => import("@/views/material/psdTemplate/index.vue"),
        name: "Psd",
        meta: {
          canTo: true,
          hidden: false,
          noTagsView: false,
          title: "router.psdTemplate",
        },
      },
      {
        path: "story-script",
        component: () => import("@/views/material/storyScript/index.vue"),
        name: "StoryScript",
        meta: {
          canTo: true,
          hidden: false,
          noTagsView: false,
          title: "router.storyScript",
        },
      },
      {
        path: "sentence",
        component: () => import("@/views/material/sentence/index.vue"),
        name: "Sentence",
        meta: {
          canTo: true,
          hidden: false,
          noTagsView: false,
          title: "router.sentence",
        },
      },
      {
        path: "text-document",
        component: () => import("@/views/material/textDocument/index.vue"),
        name: "TextDocument",
        meta: {
          canTo: true,
          hidden: false,
          noTagsView: false,
          title: "router.textDocument",
        },
      },
      {
        path: "common-url",
        component: () => import("@/views/material/commonUrl/index.vue"),
        name: "CommonUrlIndex",
        meta: {
          canTo: true,
          hidden: false,
          noTagsView: false,
          title: "router.commonUrl",
        },
      },
      {
        path: "design-inspiration",
        component: () => import("@/views/material/designInspiration/index.vue"),
        name: "DesignInspiration",
        meta: {
          canTo: true,
          hidden: false,
          noTagsView: false,
          title: "router.designInspiration",
          menuKey: "resource.design-inspiration",
        },
      },
    ],
  },
  // ── 3. AI创作 ─────────────────────────────────────────────────────
  {
    path: "/ai",
    component: Layout,
    name: "AiService",
    redirect: "/ai/assistant",
    meta: {
      title: "router.aiCreation",
      icon: "lucide:sparkles",
      order: 3,
      alwaysShow: true,
    },
    children: [
      {
        path: "assistant",
        component: () => import("@/views/ai/assistant/index.vue"),
        name: "AiAssistant",
        meta: {
          title: "router.aiAssistant",
          noAppViewPadding: true,
        },
      },
      {
        path: "skills",
        component: () => import("@/views/ai/skills/index.vue"),
        name: "AiSkills",
        meta: {
          title: "router.aiSkills",
        },
      },
      {
        path: "mcp",
        component: () => import("@/views/ai/mcp/index.vue"),
        name: "McpConsole",
        meta: {
          title: "router.mcpManagement",
          serviceStatusKey: "mcp",
        },
      },
      {
        path: "tti",
        component: () => import("@/views/ai/tti.vue"),
        name: "AiTti",
        meta: {
          title: "router.aiTextToImage",
        },
      },
      {
        path: "tts",
        component: () => import("@/views/ai/tts.vue"),
        name: "AiTts",
        meta: {
          title: "router.aiTextToSpeech",
        },
      },
      {
        path: "prompt",
        component: () => import("@/views/material/prompt/index.vue"),
        name: "Prompt",
        meta: {
          canTo: true,
          hidden: false,
          noTagsView: false,
          title: "router.aiPromptManagement",
        },
      },
      {
        path: "model-service",
        component: () => import("@/views/ai/model-service/index.vue"),
        name: "AiModelService",
        meta: {
          title: "router.modelService",
          serviceStatusKey: "modelService",
        },
      },
      {
        path: "image-analysis",
        component: () => import("@/views/ai/image-analysis/index.vue"),
        name: "AiImageAnalysis",
        meta: {
          title: "router.aiImageAnalysis",
        },
      },
    ],
  },
  // ── 4. 内容与自动化 ───────────────────────────────────────────────────
  {
    path: "/content",
    component: Layout,
    name: "Content",
    redirect: "/content/code-script",
    meta: {
      title: "router.contentAutomation",
      icon: "lucide:cpu",
      order: 4,
      alwaysShow: true,
    },
    children: [
      {
        path: "code-script",
        component: () => import("@/views/material/codeScript/index.vue"),
        name: "CodeScript",
        meta: {
          canTo: true,
          hidden: false,
          noTagsView: false,
          title: "router.codeScript",
          serviceStatusKey: "sandbox",
        },
      },
      {
        path: "code-script-schedule",
        component: () => import("@/views/material/codeScriptSchedule/index.vue"),
        name: "CodeScriptSchedule",
        meta: {
          canTo: true,
          hidden: false,
          noTagsView: false,
          title: "router.scriptSchedule",
        },
      },
      {
        path: "sandbox",
        component: () => import("@/views/material/sandbox/index.vue"),
        name: "Sandbox",
        meta: {
          canTo: true,
          hidden: false,
          noTagsView: false,
          title: "router.sandbox",
        },
      },
      {
        path: "remotion-video-record",
        component: () => import("@/views/material/remotionVideoRecord/index.vue"),
        name: "RemotionVideoRecord",
        meta: {
          canTo: true,
          hidden: false,
          noTagsView: false,
          title: "router.videoTemplate",
          serviceStatusKey: "videoTemplate",
        },
      },
      {
        path: "image-processing-record",
        component: () => import("@/views/material/imageProcessingRecord/index.vue"),
        name: "ImageProcessingRecord",
        meta: {
          canTo: true,
          hidden: false,
          noTagsView: false,
          title: "router.imageProcessing",
          serviceStatusKey: "images",
        },
      },
    ],
  },
  // ── 5. 客户端功能 ────────────────────────────────────────────────────
  {
    path: "/external",
    component: Layout,
    name: "ExternalFeature",
    redirect: "/external/browser-automation",
    meta: {
      title: "router.clientFunction",
      icon: "lucide:monitor",
      order: 5,
      alwaysShow: true,
    },
    children: [
      {
        path: "toolkit",
        redirect: "/operation/toolkit/temu",
        name: "ExternalToolkitLegacy",
        meta: {
          hidden: true,
          noTagsView: true,
          canTo: true,
        },
      },
      {
        path: "temu",
        redirect: "/operation/toolkit/temu",
        name: "ExternalTemuLegacy",
        meta: {
          hidden: true,
          noTagsView: true,
          canTo: true,
        },
      },
      {
        path: "browser-automation",
        component: () => import("@/views/external/browser-automation/index.vue"),
        name: "ExternalBrowserAutomation",
        meta: {
          title: "router.browserAutomation",
        },
      },
      {
        path: "browser-plugin",
        component: () => import("@/views/external/browser-plugin/index.vue"),
        name: "ExternalBrowserPlugin",
        meta: {
          title: "router.browserPlugin",
        },
      },
      {
        path: "ps-automation",
        component: () => import("@/views/system/ps-console/index.vue"),
        name: "ExternalPsAutomation",
        meta: {
          title: "router.psAutomation",
        },
      },
      {
        path: "data-collect",
        component: () => import("@/views/external/data-collect/index.vue"),
        name: "ExternalDataCollect",
        meta: {
          title: "router.dataCollection",
          icon: "lucide:database-zap",
        },
      },
      {
        path: "google-art",
        redirect: "/external/data-collect?tab=google-art",
        meta: { hidden: true },
      },
      {
        path: "pinterest",
        redirect: "/external/data-collect?tab=pinterest",
        meta: { hidden: true },
      },
      {
        path: "wikimedia",
        redirect: "/external/data-collect?tab=wikimedia",
        meta: { hidden: true },
      },
      {
        path: "pexels",
        redirect: "/external/data-collect?tab=pexels",
        meta: { hidden: true },
      },
      {
        path: "pixabay",
        redirect: "/external/data-collect?tab=pixabay",
        meta: { hidden: true },
      },
      {
        path: "rawpixel",
        redirect: "/external/data-collect?tab=rawpixel",
        meta: { hidden: true },
      },
      {
        path: "openverse",
        redirect: "/external/data-collect?tab=openverse",
        meta: { hidden: true },
      },
      {
        path: "kaboompics",
        redirect: "/external/data-collect?tab=kaboompics",
        meta: { hidden: true },
      },
      {
        path: "openclipart",
        redirect: "/external/data-collect?tab=openclipart",
        meta: { hidden: true },
      },
      {
        path: "undraw",
        redirect: "/external/data-collect?tab=undraw",
        meta: { hidden: true },
      },
      {
        path: "iconify",
        redirect: "/external/data-collect?tab=iconify",
        meta: { hidden: true },
      },
      {
        path: "nounproject",
        redirect: "/external/data-collect?tab=nounproject",
        meta: { hidden: true },
      },
      {
        path: "vecteezy",
        redirect: "/external/data-collect?tab=vecteezy",
        meta: { hidden: true },
      },
      {
        path: "openmoji",
        redirect: "/external/data-collect?tab=openmoji",
        meta: { hidden: true },
      },
      {
        path: "googleicons",
        redirect: "/external/data-collect?tab=googleicons",
        meta: { hidden: true },
      },
      {
        path: "emojipedia",
        redirect: "/external/data-collect?tab=emojipedia",
        meta: { hidden: true },
      },
      {
        path: "baidu",
        redirect: "/external/data-collect?tab=baidu",
        meta: { hidden: true },
      },
      {
        path: "bing",
        redirect: "/external/data-collect?tab=bing",
        meta: { hidden: true },
      },
      {
        path: "duckduckgo",
        redirect: "/external/data-collect?tab=duckduckgo",
        meta: { hidden: true },
      },
      {
        path: "sogou",
        redirect: "/external/data-collect?tab=sogou",
        meta: { hidden: true },
      },
      {
        path: "so",
        redirect: "/external/data-collect?tab=so",
        meta: { hidden: true },
      },
      {
        path: "wallhaven",
        redirect: "/external/data-collect?tab=wallhaven",
        meta: { hidden: true },
      },
      {
        path: "unsplash",
        redirect: "/external/data-collect?tab=unsplash",
        meta: { hidden: true },
      },
      {
        path: "flickr",
        redirect: "/external/data-collect?tab=flickr",
        meta: { hidden: true },
      },
      {
        path: "googleimages",
        redirect: "/external/data-collect?tab=googleimages",
        meta: { hidden: true },
      },
      {
        path: "yandex",
        redirect: "/external/data-collect?tab=yandex",
        meta: { hidden: true },
      },
      {
        path: "news",
        component: () => import("@/views/external/news/index.vue"),
        name: "ExternalNewsCollect",
        meta: {
          title: "router.newsCollect",
        },
      },
      {
        path: "hotsearch",
        component: () => import("@/views/external/hotsearch/index.vue"),
        name: "ExternalHotsearchCollect",
        meta: {
          title: "router.hotsearchCollect",
        },
      },
      {
        path: "data-tools",
        component: () => import("@/views/external/data-tools/index.vue"),
        name: "ExternalDataToolsCollect",
        meta: {
          title: "router.dataToolsCollect",
        },
      },
      {
        path: "client-management",
        component: () => import("@/views/external/client-management/index.vue"),
        name: "ClientManagement",
        meta: {
          title: "router.clientManagement",
        },
      },
      {
        path: "design-tool",
        component: () => import("@/views/external/design-tool/index.vue"),
        name: "DesignToolConnection",
        meta: {
          title: "router.designToolConnection",
        },
      },
    ],
  },
  // ── 6. 工具集 ─────────────────────────────────────────────────────
  {
    path: "/operation/toolkit",
    component: Layout,
    name: "OperationToolkitRoot",
    redirect: "/operation/toolkit/temu",
    meta: {
      title: "router.toolkit",
      icon: "lucide:wrench",
      order: 6,
      alwaysShow: true,
    },
    children: [
      {
        path: "temu",
        component: () => import("@/views/external/toolkit/index.vue"),
        name: "OperationToolkitTemu",
        meta: {
          title: "router.toolkitTemu",
          toolkitPlatform: "temu",
        },
      },
      {
        path: "doudian",
        component: () => import("@/views/external/toolkit/doudian/index.vue"),
        name: "OperationToolkitDoudian",
        meta: {
          title: "router.toolkitDoudian",
          toolkitPlatform: "doudian",
        },
      },
      {
        path: "pdd",
        component: () => import("@/views/external/toolkit/pdd/index.vue"),
        name: "OperationToolkitPdd",
        meta: {
          title: "router.toolkitPdd",
          toolkitPlatform: "pdd",
        },
      },
      {
        path: "kuaishou-shop",
        component: () => import("@/views/external/toolkit/kuaishou-shop/index.vue"),
        name: "OperationToolkitKuaishouShop",
        meta: {
          title: "router.toolkitKuaishou",
          toolkitPlatform: "kuaishou_shop",
        },
      },
      {
        path: "qianniu",
        component: () => import("@/views/external/toolkit/qianniu/index.vue"),
        name: "OperationToolkitQianniu",
        meta: {
          title: "router.toolkitQianniu",
          toolkitPlatform: "qianniu",
        },
      },
      {
        path: "alibaba-1688",
        component: () => import("@/views/external/toolkit/alibaba-1688/index.vue"),
        name: "OperationToolkitAlibaba1688",
        meta: {
          title: "router.toolkit1688",
          toolkitPlatform: "alibaba_1688",
        },
      },
      {
        path: "amazon",
        component: () => import("@/views/external/toolkit/amazon/index.vue"),
        name: "OperationToolkitAmazon",
        meta: {
          title: "router.toolkitAmazon",
          toolkitPlatform: "amazon",
        },
      },
    ],
  },
  // ── 7. 独立站 ──────────────────────────────────────────────────────────────────
  {
    path: "/independent-site",
    component: Layout,
    name: "IndependentSite",
    redirect: "/independent-site/product",
    meta: {
      title: "router.independentSite",
      icon: "lucide:store",
      order: 7,
      alwaysShow: true,
    },
    children: [
      {
        path: "category",
        component: () => import("@/views/product/category/index.vue"),
        name: "ProductCategory",
        meta: {
          title: "router.productCategory",
          order: 0.5,
        },
      },
      {
        path: "product",
        component: () => import("@/views/product/index/index.vue"),
        name: "ProductIndex",
        meta: {
          title: "router.productModule",
          order: 1,
        },
      },
      {
        path: "generation-template",
        component: () => import("@/views/product/generation-template/index.vue"),
        name: "ProductGenerationTemplate",
        meta: {
          title: "router.productGenTemplate",
          order: 2,
        },
      },
      {
        path: "design-request",
        component: () => import("@/views/material/designRequest/index.vue"),
        name: "DesignRequest",
        meta: {
          title: "router.designRequest",
          order: 3,
        },
      },
      {
        path: "public-user",
        component: () => import("@/views/system/public-user/index.vue"),
        name: "PublicUser",
        meta: {
          title: "router.openUserManagement",
          requiresAdmin: true,
          order: 4,
        },
      },
      {
        path: "open-docs",
        component: () => import("@/views/independent-site/open-docs/index.vue"),
        name: "IndependentSiteOpenDocs",
        meta: {
          title: "router.openDocs",
          order: 5,
        },
      },
      {
        path: "user-behavior-log",
        component: () => import("@/views/independent-site/user-behavior-log/index.vue"),
        name: "IndependentSiteUserBehaviorLog",
        meta: {
          title: "router.openUserLogs",
          order: 6,
        },
      },
      {
        path: "comment",
        component: () => import("@/views/independent-site/comment/index.vue"),
        name: "IndependentSiteComment",
        meta: {
          title: "router.independentSiteReviews",
          order: 7,
        },
      },
    ],
  },
  // ── 9. 商品发布 ────────────────────────────────────────────────────
  {
    path: "/product-publish",
    component: Layout,
    name: "ProductPublishGroup",
    redirect: "/product-publish/psd-set",
    meta: {
      title: "router.productPublish",
      icon: "lucide:shopping-bag",
      order: 9,
      alwaysShow: true,
    },
    children: [
      {
        path: "psd-set",
        component: () => import("@/views/material/psdSet/index.vue"),
        name: "PsdSet",
        meta: {
          canTo: true,
          hidden: false,
          noTagsView: false,
          title: "router.psdSet",
          order: 2,
        },
      },
      {
        path: "binding-records",
        component: () => import("@/views/product/binding-records/index.vue"),
        name: "PublishBindingRecords",
        meta: {
          title: "router.publishBindingRecords",
          order: 3.5,
        },
      },
      {
        path: "publish-config",
        component: () => import("@/views/product/publish-config/index.vue"),
        name: "PublishConfig",
        meta: {
          title: "router.publishTaskConfig",
          order: 4,
        },
      },
      {
        path: "queue",
        component: () => import("@/views/system/queue/index.vue"),
        name: "SystemQueue",
        meta: {
          title: "router.platformTask",
          order: 5,
        },
      },
    ],
  },
  // ── 10. 电商数据链路 ───────────────────────────────────────────────────
  {
    path: "/ecom-platform-collect",
    component: Layout,
    name: "EcomPlatformCollectRoot",
    redirect: "/ecom-platform-collect/tasks",
    meta: {
      title: "router.ecommerceDataPipeline",
      icon: "lucide:line-chart",
      order: 10,
      alwaysShow: true,
    },
    children: [
      {
        path: "capabilities",
        component: () => import("@/views/operation/ecom-platform-collect/capabilities.vue"),
        name: "EcomPlatformCollectCapabilityPage",
        meta: {
          title: "router.platformCapability",
          order: 1,
        },
      },
      {
        path: "tasks",
        component: () => import("@/views/operation/ecom-platform-collect/index.vue"),
        name: "EcomPlatformCollectTaskPage",
        meta: {
          title: "router.collectionTask",
          order: 2,
        },
      },
      {
        path: "runs",
        component: () => import("@/views/operation/ecom-platform-collect/runs.vue"),
        name: "EcomPlatformCollectRunPage",
        meta: {
          title: "router.collectionRun",
          order: 3,
        },
      },
      {
        path: "raw-records",
        component: () => import("@/views/operation/ecom-platform-collect/raw-records.vue"),
        name: "EcomPlatformCollectRawPage",
        meta: {
          title: "router.rawData",
          order: 4,
        },
      },
      {
        path: "selection-analysis/tasks",
        component: () => import("@/views/operation/ecom-selection-analysis/index.vue"),
        name: "EcomSelectionAnalysisTaskPage",
        meta: {
          title: "router.selectionAnalysisTask",
          order: 5,
        },
      },
      {
        path: "selection-analysis/runs",
        component: () => import("@/views/operation/ecom-selection-analysis/runs.vue"),
        name: "EcomSelectionAnalysisRunPage",
        meta: {
          title: "router.selectionAnalysisRun",
          order: 6,
        },
      },
      {
        path: "selection-analysis/results",
        component: () => import("@/views/operation/ecom-selection-analysis/results.vue"),
        name: "EcomSelectionAnalysisResultPage",
        meta: {
          title: "router.selectionAnalysisResult",
          order: 7,
        },
      },
      {
        path: "supply-match/tasks",
        component: () => import("@/views/operation/ecom-selection-supply-match/index.vue"),
        name: "EcomSelectionSupplyMatchTaskPage",
        meta: {
          title: "router.supplyMatchTask",
          order: 8,
        },
      },
      {
        path: "supply-match/runs",
        component: () => import("@/views/operation/ecom-selection-supply-match/runs.vue"),
        name: "EcomSelectionSupplyMatchRunPage",
        meta: {
          title: "router.supplyMatchRun",
          order: 9,
        },
      },
      {
        path: "supply-match/items",
        component: () => import("@/views/operation/ecom-selection-supply-match/items.vue"),
        name: "EcomSelectionSupplyMatchItemPage",
        meta: {
          title: "router.supplyMatchResult",
          order: 10,
        },
      },
      {
        path: "extension-collect",
        component: () => import("@/views/operation/extension-collect/index.vue"),
        name: "ExtensionCollectIndex",
        meta: {
          title: "router.extensionCollect",
          order: 11,
        },
      },
    ],
  },
  // ── 11. 运营支持 ─────────────────────────────────────────────────────
  {
    path: "/operation",
    component: Layout,
    name: "Operation",
    redirect: "/operation/link-navigation",
    meta: {
      title: "router.operationSupport",
      icon: "lucide:briefcase",
      order: 11,
      alwaysShow: true,
    },
    children: [
      {
        path: "link-navigation",
        component: () => import("@/views/operation/link-navigation/index.vue"),
        name: "OperationLinkNavigation",
        meta: {
          title: "router.commonNavigation",
        },
      },
      {
        path: "shop",
        component: () => import("@/views/shop/index.vue"),
        name: "ShopIndex",
        meta: {
          title: "router.shopList",
        },
      },
      {
        path: "vendor",
        component: () => import("@/views/vendor/index.vue"),
        name: "VendorIndex",
        meta: {
          title: "router.vendorManagement",
        },
      },
      {
        path: "vendor-product",
        component: () => import("@/views/vendor-product/index.vue"),
        name: "VendorProductIndex",
        meta: {
          title: "router.vendorProduct",
        },
      },
    ],
  },
  // ── 12. 个人设置 ────────────────────────────────────────────────────
  {
    path: "/personal",
    component: Layout,
    name: "Personal",
    redirect: "/personal/settings",
    meta: {
      title: "router.personalProfile",
      icon: "lucide:user",
      order: 12,
      alwaysShow: true,
    },
    children: [
      {
        path: "settings",
        component: () => import("@/views/Profile/Index.vue"),
        name: "PersonalSettings",
        meta: {
          title: "router.personalProfile",
        },
      },
      {
        path: "organization",
        component: () => import("@/views/company/index.vue"),
        name: "MyOrganization",
        meta: {
          title: "我的组织",
          menuKey: "personal.organization",
        },
      },
      {
        path: "notify-message",
        component: () => import("@/views/system/notify-message/index.vue"),
        name: "MyNotifyMessage",
        meta: {
          title: "router.myMessages",
        },
      },
    ],
  },
  // ── 13. 系统管理 ────────────────────────────────────────────────────
  {
    path: "/system",
    component: Layout,
    name: "System",
    redirect: "/system/user",
    meta: {
      title: "router.systemManagement",
      icon: "lucide:settings",
      order: 13,
      alwaysShow: true,
    },
    children: [
      {
        path: "ai-api-key",
        component: () => import("@/views/system/ai-api-key/index.vue"),
        name: "SystemAiApiKeyIndex",
        meta: {
          title: "router.aiApiKey",
          order: 1,
        },
      },
      {
        path: "message-push",
        component: () => import("@/views/message-push/index.vue"),
        name: "MessagePushIndex",
        meta: {
          title: "router.messagePush",
          order: 2,
        },
      },

      {
        path: "user",
        component: () => import("@/views/system/user/index.vue"),
        name: "User",
        meta: {
          title: "router.userManagement",
          requiresAdmin: true,
          order: 3,
        },
      },
      {
        path: "company",
        component: () => import("@/views/system/company/index.vue"),
        name: "Company",
        meta: {
          title: "router.companyManagement",
          requiresAdmin: true,
          order: 4,
        },
      },
      {
        path: "role",
        component: () => import("@/views/system/role/index.vue"),
        name: "Role",
        meta: {
          title: "router.roleManagement",
          requiresAdmin: true,
          order: 4.5,
        },
      },
      {
        path: "websocket",
        component: () => import("@/views/system/websocket/index.vue"),
        name: "SystemWebsocketConnections",
        meta: {
          title: "router.remoteConnection",
          requiresAdmin: true,
          order: 5,
        },
      },
      {
        path: "service-file-cache",
        component: () => import("@/views/system/service-file-cache/index.vue"),
        name: "SystemServiceFileCache",
        meta: {
          title: "router.serviceCache",
          requiresAdmin: true,
          order: 6,
        },
      },
      {
        path: "operatelog",
        component: () => import("@/views/system/operatelog/index.vue"),
        name: "SystemOperateLog",
        meta: {
          title: "router.operateLog",
          requiresAdmin: true,
          order: 7,
        },
      },
      {
        path: "file-log",
        component: () => import("@/views/system/file-log/index.vue"),
        name: "SystemFileLog",
        meta: {
          title: "router.systemLog",
          requiresAdmin: true,
          order: 8,
        },
      },
      // {
      //   path: "public-user-behavior-log",
      //   component: () => import("@/views/system/public-user-behavior-log/index.vue"),
      //   name: "PublicUserBehaviorLog",
      //   meta: {
      //     title: "router.openUserLogs",
      //     order: 9,
      //   },
      // },
    ],
  },
  {
    path: "/user/profile",
    redirect: "/personal/settings",
    name: "UserProfileCompat",
    meta: {
      hidden: true,
      noTagsView: true,
    },
  },
  {
    path: "/design-tool/connection",
    redirect: "/external/design-tool",
    name: "DesignToolConnectionCompat",
    meta: {
      hidden: true,
      noTagsView: true,
    },
  },
  {
    path: "/external/connection",
    redirect: "/external/design-tool",
    name: "ExternalConnectionCompat",
    meta: {
      hidden: true,
      noTagsView: true,
    },
  },
  {
    path: "/resource/material-center/crawler-material",
    redirect: "/resource/crawler-material",
    name: "ResourceMaterialCenterCrawlerCompat",
    meta: {
      hidden: true,
      noTagsView: true,
    },
  },
  {
    path: "/resource/material-center/material",
    redirect: "/resource/material",
    name: "ResourceMaterialCenterMaterialCompat",
    meta: {
      hidden: true,
      noTagsView: true,
    },
  },
  {
    path: "/resource/asset-library/font",
    redirect: "/resource/font",
    name: "ResourceAssetLibraryFontCompat",
    meta: {
      hidden: true,
      noTagsView: true,
    },
  },
  {
    path: "/resource/asset-library/psd",
    redirect: "/resource/psd",
    name: "ResourceAssetLibraryPsdCompat",
    meta: {
      hidden: true,
      noTagsView: true,
    },
  },
  {
    path: "/resource/content-assets/sentence",
    redirect: "/resource/sentence",
    name: "ResourceContentAssetsSentenceCompat",
    meta: {
      hidden: true,
      noTagsView: true,
    },
  },
  {
    path: "/resource/content-assets/story-script",
    redirect: "/resource/story-script",
    name: "ResourceContentAssetsStoryScriptCompat",
    meta: {
      hidden: true,
      noTagsView: true,
    },
  },
  {
    path: "/ai/assets/prompt",
    redirect: "/ai/prompt",
    name: "AiAssetsPromptCompat",
    meta: {
      hidden: true,
      noTagsView: true,
    },
  },
  {
    path: "/resource/content-assets/text-document",
    redirect: "/resource/text-document",
    name: "ResourceContentAssetsTextDocumentCompat",
    meta: {
      hidden: true,
      noTagsView: true,
    },
  },
  {
    path: "/text-document",
    redirect: "/resource/text-document",
    name: "TextDocumentCompat",
    meta: {
      hidden: true,
      noTagsView: true,
    },
  },
  {
    path: "/content/automation/code-script",
    redirect: "/content/code-script",
    name: "ContentAutomationCodeScriptCompat",
    meta: {
      hidden: true,
      noTagsView: true,
    },
  },
  {
    path: "/content/automation/code-script-schedule",
    redirect: "/content/code-script-schedule",
    name: "ContentAutomationCodeScriptScheduleCompat",
    meta: {
      hidden: true,
      noTagsView: true,
    },
  },
  {
    path: "/content/automation/remotion-video-record",
    redirect: "/content/remotion-video-record",
    name: "ContentAutomationRemotionVideoRecordCompat",
    meta: {
      hidden: true,
      noTagsView: true,
    },
  },
  {
    path: "/content/automation/image-processing-record",
    redirect: "/content/image-processing-record",
    name: "ContentAutomationImageProcessingRecordCompat",
    meta: {
      hidden: true,
      noTagsView: true,
    },
  },
  {
    path: "/ai/generation/tti",
    redirect: "/ai/tti",
    name: "AiGenerationTtiCompat",
    meta: {
      hidden: true,
      noTagsView: true,
    },
  },
  {
    path: "/ai/generation/tts",
    redirect: "/ai/tts",
    name: "AiGenerationTtsCompat",
    meta: {
      hidden: true,
      noTagsView: true,
    },
  },
  {
    path: "/shop",
    redirect: "/operation/shop",
    name: "ShopCompat",
    meta: {
      hidden: true,
      noTagsView: true,
    },
  },
  {
    path: "/shop/index",
    redirect: "/operation/shop",
    name: "ShopIndexCompat",
    meta: {
      hidden: true,
      noTagsView: true,
    },
  },
  {
    path: "/shop/vendor",
    redirect: "/operation/vendor",
    name: "ShopVendorCompat",
    meta: {
      hidden: true,
      noTagsView: true,
    },
  },
  {
    path: "/product/collaboration/vendor",
    redirect: "/operation/vendor",
    name: "ProductCollaborationVendorCompat",
    meta: {
      hidden: true,
      noTagsView: true,
    },
  },
  {
    path: "/common-url",
    redirect: "/resource/common-url",
    name: "CommonUrlCompat",
    meta: {
      hidden: true,
      noTagsView: true,
    },
  },
  {
    path: "/common-url/index",
    redirect: "/resource/common-url",
    name: "CommonUrlIndexCompat",
    meta: {
      hidden: true,
      noTagsView: true,
    },
  },
  {
    path: "/product/catalog/category",
    redirect: "/product/category",
    name: "ProductCatalogCategoryCompat",
    meta: {
      hidden: true,
      noTagsView: true,
    },
  },
  {
    path: "/product/catalog/index",
    redirect: "/independent-site/product",
    name: "ProductCatalogIndexCompat",
    meta: {
      hidden: true,
      noTagsView: true,
    },
  },
  {
    path: "/product/index",
    redirect: "/independent-site/product",
    name: "ProductIndexCompat",
    meta: {
      hidden: true,
      noTagsView: true,
    },
  },
  {
    path: "/product/generation-template",
    redirect: "/independent-site/generation-template",
    name: "ProductGenerationTemplateCompat",
    meta: {
      hidden: true,
      noTagsView: true,
    },
  },
  {
    path: "/product/catalog/psd-set",
    redirect: "/product/psd-set",
    name: "ProductCatalogPsdSetCompat",
    meta: {
      hidden: true,
      noTagsView: true,
    },
  },
  {
    path: "/product/designRequest",
    redirect: "/independent-site/design-request",
    name: "ProductDesignRequestCompat",
    meta: {
      hidden: true,
      noTagsView: true,
    },
  },
  {
    path: "/product/design-request",
    redirect: "/independent-site/design-request",
    name: "ProductDesignRequestKebabCompat",
    meta: {
      hidden: true,
      noTagsView: true,
    },
  },
  {
    path: "/product/collaboration/design-request",
    redirect: "/independent-site/design-request",
    name: "ProductCollaborationDesignRequestCompat",
    meta: {
      hidden: true,
      noTagsView: true,
    },
  },
  {
    path: "/product/publishing/publish-config",
    redirect: "/product/publish-config",
    name: "ProductPublishingPublishConfigCompat",
    meta: {
      hidden: true,
      noTagsView: true,
    },
  },
  {
    path: "/product/publishing/queue",
    redirect: "/product/queue",
    name: "ProductPublishingQueueCompat",
    meta: {
      hidden: true,
      noTagsView: true,
    },
  },
  {
    path: "/operation/shop/index",
    redirect: "/operation/shop",
    name: "OperationShopIndexCompat",
    meta: {
      hidden: true,
      noTagsView: true,
    },
  },
  {
    path: "/operation/shop/vendor",
    redirect: "/operation/vendor",
    name: "OperationShopVendorCompat",
    meta: {
      hidden: true,
      noTagsView: true,
    },
  },
  {
    path: "/operation/tools/common-url",
    redirect: "/resource/common-url",
    name: "OperationToolsCommonUrlCompat",
    meta: {
      hidden: true,
      noTagsView: true,
    },
  },
  {
    path: "/system/organization/ai-api-key",
    redirect: "/system/ai-api-key",
    name: "SystemOrganizationAiApiKeyCompat",
    meta: {
      hidden: true,
      noTagsView: true,
    },
  },
  {
    path: "/system/organization/message-push",
    redirect: "/system/message-push",
    name: "SystemOrganizationMessagePushCompat",
    meta: {
      hidden: true,
      noTagsView: true,
    },
  },
  {
    path: "/system/organization/user",
    redirect: "/system/user",
    name: "SystemOrganizationUserCompat",
    meta: {
      hidden: true,
      noTagsView: true,
    },
  },
  {
    path: "/system/organization/company",
    redirect: "/system/company",
    name: "SystemOrganizationCompanyCompat",
    meta: {
      hidden: true,
      noTagsView: true,
    },
  },
  {
    path: "/system/organization/public-user",
    redirect: "/independent-site/public-user",
    name: "SystemOrganizationPublicUserCompat",
    meta: {
      hidden: true,
      noTagsView: true,
    },
  },
  {
    path: "/system/public-user",
    redirect: "/independent-site/public-user",
    name: "SystemPublicUserCompat",
    meta: {
      hidden: true,
      noTagsView: true,
    },
  },
  {
    path: "/system/audit/websocket",
    redirect: "/system/websocket",
    name: "SystemAuditWebsocketCompat",
    meta: {
      hidden: true,
      noTagsView: true,
    },
  },
  {
    path: "/system/audit/operatelog",
    redirect: "/system/operatelog",
    name: "SystemAuditOperatelogCompat",
    meta: {
      hidden: true,
      noTagsView: true,
    },
  },
  {
    path: "/system/audit/file-log",
    redirect: "/system/file-log",
    name: "SystemAuditFileLogCompat",
    meta: {
      hidden: true,
      noTagsView: true,
    },
  },
  {
    path: "/operation/ecom-platform-collect",
    redirect: "/ecom-platform-collect/tasks",
    name: "OperationEcomPlatformCollectCompat",
    meta: {
      hidden: true,
      noTagsView: true,
    },
  },
  {
    path: "/system/account/:pathMatch(.*)*",
    redirect: (to) => `/system/${String(to.params.pathMatch || "")}`,
    name: "SystemAccountCompat",
    meta: {
      hidden: true,
      noTagsView: true,
    },
  },
  {
    path: "/system/ops/:pathMatch(.*)*",
    redirect: (to) => `/system/${String(to.params.pathMatch || "")}`,
    name: "SystemOpsCompat",
    meta: {
      hidden: true,
      noTagsView: true,
    },
  },
  {
    path: "/:pathMatch(.*)*",
    component: () => import("@/views/Error/404.vue"),
    name: "",
    meta: {
      title: "404",
      hidden: true,
      breadcrumb: false,
      noTagsView: true,
      noAppViewPadding: true,
    },
  },
];

function attachMenuKeys(routes: AppRouteRecordRaw[]): AppRouteRecordRaw[] {
  return routes.map((route) => {
    const routeName = route.name ? String(route.name) : "";
    const menuKey = routeName ? ROUTE_MENU_KEY_MAP[routeName] : "";
    const legacyMenuKeys = routeName ? ROUTE_MENU_LEGACY_KEY_MAP[routeName] : [];
    return {
      ...route,
      meta: menuKey
        ? {
          ...(route.meta || {}),
          menuKey,
          ...(legacyMenuKeys?.length ? { legacyMenuKeys } : {}),
        }
        : route.meta,
      children: route.children ? attachMenuKeys(route.children) : route.children,
    };
  });
}

export default attachMenuKeys(remainingRouter);
