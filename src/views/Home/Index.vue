<template>
  <div class="home-dashboard">
    <!-- 1. Endpoint Connection Status -->
    <section class="home-section">
      <div class="section-title-bar">
        <div class="section-title-bar__left">
          <div class="section-title-bar__icon"><Icon icon="lucide:activity" /></div>
          <div>
            <h2 class="section-title-bar__title">{{ t('home.dashboard.connStatus') }}</h2>
            <p class="section-title-bar__desc">{{ t('home.dashboard.connStatusDesc') }}</p>
          </div>
        </div>
        <ElButton plain size="small" :loading="loading" @click="loadEndpointStatus">
          {{ t('home.dashboard.refreshData') }}
        </ElButton>
      </div>

      <div class="conn-grid">
        <div class="conn-card conn-card--client">
          <div class="conn-card__top">
            <span class="conn-card__label">{{ t('home.dashboard.clientOnline') }}</span>
            <div class="conn-card__icon"><Icon icon="lucide:monitor" /></div>
          </div>
          <div class="conn-card__main">
            <div class="conn-card__value" :class="{ 'conn-card__value--offline': stats.clientOnline === 0 }">
              {{ stats.clientOnline }}
            </div>
            <span class="conn-card__badge" :class="stats.clientOnline > 0 ? 'conn-card__badge--online' : 'conn-card__badge--offline'">
              {{ stats.clientOnline > 0 ? t('home.dashboard.online') : t('home.dashboard.offline') }}
            </span>
          </div>
        </div>

        <div class="conn-card conn-card--ps">
          <div class="conn-card__top">
            <span class="conn-card__label">{{ t('home.dashboard.psAutomation') }}</span>
            <div class="conn-card__icon"><Icon icon="lucide:palette" /></div>
          </div>
          <div class="conn-card__main">
            <div class="conn-card__value" :class="{ 'conn-card__value--offline': psNodeInfo.online === 0 }">
              {{ psNodeInfo.online }}
            </div>
            <span class="conn-card__badge" :class="psNodeInfo.online > 0 ? 'conn-card__badge--online' : 'conn-card__badge--offline'">
              {{ psNodeInfo.online > 0 ? t('home.dashboard.online') : t('home.dashboard.offline') }}
            </span>
          </div>
        </div>

        <div class="conn-card conn-card--browser">
          <div class="conn-card__top">
            <span class="conn-card__label">{{ t('home.dashboard.browserAutomation') }}</span>
            <div class="conn-card__icon"><Icon icon="lucide:globe" /></div>
          </div>
          <div class="conn-card__main">
            <div class="conn-card__value" :class="{ 'conn-card__value--offline': browserClientInfo.online === 0 }">
              {{ browserClientInfo.online }}
            </div>
            <span class="conn-card__badge" :class="browserClientInfo.online > 0 ? 'conn-card__badge--online' : 'conn-card__badge--offline'">
              {{ browserClientInfo.online > 0 ? t('home.dashboard.online') : t('home.dashboard.offline') }}
            </span>
          </div>
        </div>

        <div class="conn-card conn-card--admin">
          <div class="conn-card__top">
            <span class="conn-card__label">{{ t('home.dashboard.adminService') }}</span>
            <div class="conn-card__icon"><Icon icon="lucide:shield-check" /></div>
          </div>
          <div class="conn-card__main">
            <div class="conn-card__value" :class="{ 'conn-card__value--offline': stats.adminOnline === 0 }">
              {{ stats.adminOnline }}
            </div>
            <span class="conn-card__badge" :class="stats.adminOnline > 0 ? 'conn-card__badge--online' : 'conn-card__badge--offline'">
              {{ stats.adminOnline > 0 ? t('home.dashboard.online') : t('home.dashboard.offline') }}
            </span>
          </div>
        </div>

        <div class="conn-card conn-card--total">
          <div class="conn-card__top">
            <span class="conn-card__label">{{ t('home.dashboard.totalConnections') }}</span>
            <div class="conn-card__icon"><Icon icon="lucide:link-2" /></div>
          </div>
          <div class="conn-card__main">
            <div class="conn-card__value" :class="{ 'conn-card__value--offline': stats.totalConnections === 0 }">
              {{ stats.totalConnections }}
            </div>
            <span class="conn-card__badge" :class="stats.totalConnections > 0 ? 'conn-card__badge--online' : 'conn-card__badge--offline'">
              {{ stats.totalConnections > 0 ? t('home.dashboard.online') : t('home.dashboard.offline') }}
            </span>
          </div>
        </div>
      </div>
    </section>

    <!-- 2. Quick Links -->
    <section class="home-section">
      <div class="section-title-bar">
        <div class="section-title-bar__left">
          <div class="section-title-bar__icon"><Icon icon="lucide:layout-grid" /></div>
          <h2 class="section-title-bar__title">{{ t('home.shortcuts') }}</h2>
        </div>
      </div>

      <nav class="shortcuts-strip">
        <div
          v-for="item in shortcuts"
          :key="item.key"
          class="shortcut-item"
          @click="goTo(item.route)"
          :title="t(item.description)"
        >
          <span class="shortcut-item__icon-box" :class="`shortcut-item__icon-box--${item.theme}`">
            <Icon :icon="item.icon" class="shortcut-item__icon" />
          </span>
          <span class="shortcut-item__title">{{ t(item.title) }}</span>
        </div>
      </nav>
    </section>

    <!-- 3. 发布任务统计 -->
    <section class="home-section">
      <div class="section-title-bar">
        <div class="section-title-bar__left">
          <div class="section-title-bar__icon"><Icon icon="lucide:send" /></div>
          <div>
            <h2 class="section-title-bar__title">{{ t('home.dashboard.publishTaskStats') }}</h2>
            <p class="section-title-bar__desc">{{ t('home.dashboard.publishTaskStatsDesc') }}</p>
          </div>
        </div>
        <div class="section-title-bar__right">
          <ElButton plain size="small" :loading="publishTrendLoading" @click="loadPublishTrend">
            {{ t('home.dashboard.refreshData') }}
          </ElButton>
        </div>
      </div>

      <div class="gallery-card">
        <div class="stat-row publish-stat-row">
          <div
            v-for="m in publishMetrics"
            :key="m.key"
            class="stat-item"
            :class="`stat-item--${m.tone}`"
          >
            <template v-if="m.text !== null">
              <div class="stat-item__label">{{ m.label }}</div>
              <div class="stat-item__text">{{ m.text }}</div>
            </template>
            <el-statistic
              v-else
              :title="m.label"
              :value="m.value"
              :suffix="m.suffix"
              group-separator=","
            />
          </div>
        </div>

        <div class="publish-layout">
          <div class="publish-layout__chart">
            <div class="chart-head chart-head--left">
              <ElRadioGroup v-model="publishWindow" size="small" class="chart-tabs">
                <ElRadioButton value="h24">{{ t('home.dashboard.today') }}</ElRadioButton>
                <ElRadioButton :value="7">{{ t('home.dashboard.last7Days') }}</ElRadioButton>
                <ElRadioButton :value="30">{{ t('home.dashboard.last30Days') }}</ElRadioButton>
              </ElRadioGroup>
            </div>
            <div class="chart-box publish-chart-box">
              <Echart :options="publishTrendChartOptions" height="240px" />
            </div>
          </div>

          <div class="publish-layout__platforms">
            <div class="publish-platform__head">
              <span>{{ t('home.dashboard.publishPlatform') }}</span>
              <span>{{ t('home.dashboard.publishCreated') }}</span>
              <span>{{ t('home.dashboard.publishSuccessRate') }} · {{ publishWindowLabel }}</span>
            </div>
            <div v-if="publishPlatforms.length === 0" class="publish-platform__empty">
              {{ t('home.dashboard.publishNoData') }}
            </div>
            <div
              v-for="item in publishPlatforms"
              :key="item.platform"
              class="publish-platform__row"
            >
              <span class="publish-platform__name">{{ item.platformLabel }}</span>
              <span class="publish-platform__count">{{ item.created }}</span>
              <span
                class="publish-platform__rate"
                :class="`publish-platform__rate--${rateTone(item.successRate)}`"
              >
                {{ item.successRate === null ? "-" : `${item.successRate.toFixed(1)}%` }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- 4/5. 图表区：并排双栏，省掉一整行纵向高度 -->
    <div class="dashboard-charts">
      <section class="home-section">
        <div class="section-title-bar">
          <div class="section-title-bar__left">
            <div class="section-title-bar__icon"><Icon icon="lucide:images" /></div>
            <h2 class="section-title-bar__title">{{ t('home.dashboard.galleryStats') }}</h2>
          </div>
          <div class="section-title-bar__right">
            <ElButton plain size="small" :loading="galleryLoading" @click="loadGalleryStats">
              {{ t('home.dashboard.refreshData') }}
            </ElButton>
          </div>
        </div>

        <div class="gallery-card">
          <div class="stat-row">
            <div
              v-for="m in galleryMetrics"
              :key="m.key"
              class="stat-item"
              :class="`stat-item--${m.tone}`"
            >
              <el-statistic
                :title="m.label"
                :value="m.value"
                :prefix="m.prefix"
                group-separator=","
              />
            </div>
          </div>

          <div class="chart-head">
            <ElRadioGroup v-model="galleryWindow" size="small" class="chart-tabs">
              <ElRadioButton value="h24">{{ t('home.dashboard.last24Hours') }}</ElRadioButton>
              <ElRadioButton :value="7">{{ t('home.dashboard.last7Days') }}</ElRadioButton>
              <ElRadioButton :value="30">{{ t('home.dashboard.last30Days') }}</ElRadioButton>
            </ElRadioGroup>
          </div>

          <div class="chart-box">
            <Echart :options="galleryChartOptions" height="220px" />
          </div>
        </div>
      </section>

      <section class="home-section">
        <div class="section-title-bar">
          <div class="section-title-bar__left">
            <div class="section-title-bar__icon"><Icon icon="lucide:cloud-download" /></div>
            <h2 class="section-title-bar__title">{{ t('home.dashboard.crawlerMaterial') }}</h2>
          </div>
          <div class="section-title-bar__right">
            <ElButton plain size="small" :loading="crawlerStatsLoading" @click="loadCrawlerMaterialStats">
              {{ t('home.dashboard.refreshData') }}
            </ElButton>
          </div>
        </div>

        <div class="gallery-card">
          <div class="stat-row">
            <div
              v-for="m in crawlerMetrics"
              :key="m.key"
              class="stat-item"
              :class="`stat-item--${m.tone}`"
            >
              <el-statistic
                :title="m.label"
                :value="m.value"
                :prefix="m.prefix"
                group-separator=","
              />
            </div>
          </div>

          <div class="chart-head">
            <ElRadioGroup v-model="crawlerWindow" size="small" class="chart-tabs">
              <ElRadioButton value="h24">{{ t('home.dashboard.last24Hours') }}</ElRadioButton>
              <ElRadioButton :value="7">{{ t('home.dashboard.last7Days') }}</ElRadioButton>
              <ElRadioButton :value="30">{{ t('home.dashboard.last30Days') }}</ElRadioButton>
            </ElRadioGroup>
          </div>

          <div class="chart-box">
            <Echart :options="crawlerChartOptions" height="220px" />
          </div>
        </div>
      </section>

      <section class="home-section">
        <div class="section-title-bar">
          <div class="section-title-bar__left">
            <div class="section-title-bar__icon"><Icon icon="lucide:sticker" /></div>
            <h2 class="section-title-bar__title">{{ t('home.dashboard.customSticker') }}</h2>
          </div>
          <div class="section-title-bar__right">
            <ElButton plain size="small" :loading="customStickerLoading" @click="loadCustomStickerStats">
              {{ t('home.dashboard.refreshData') }}
            </ElButton>
          </div>
        </div>

        <div class="gallery-card">
          <div class="stat-row">
            <div
              v-for="m in customStickerMetrics"
              :key="m.key"
              class="stat-item"
              :class="`stat-item--${m.tone}`"
            >
              <el-statistic
                :title="m.label"
                :value="m.value"
                :prefix="m.prefix"
                group-separator=","
              />
            </div>
          </div>

          <div class="chart-head">
            <ElRadioGroup v-model="customStickerWindow" size="small" class="chart-tabs">
              <ElRadioButton value="h24">{{ t('home.dashboard.last24Hours') }}</ElRadioButton>
              <ElRadioButton :value="7">{{ t('home.dashboard.last7Days') }}</ElRadioButton>
              <ElRadioButton :value="30">{{ t('home.dashboard.last30Days') }}</ElRadioButton>
            </ElRadioGroup>
          </div>

          <div class="chart-box">
            <Echart :options="customStickerChartOptions" height="220px" />
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { storeToRefs } from "pinia";
import { Echart } from "@/components/Echart";
import type { EChartsOption } from "echarts";
import { getDashboardStatsApi, type DashboardStats } from "@/api/dashboard";
import { getModuleStatisticsApi } from "@/api/statistics";
import { getPublishTaskTrend, type PublishTaskTrendResult } from "@/api/system/queue";
import { CrawlerMaterialApi, type ResourceStats } from "@/api/crawler-material";
import { getMyPsAutomationStatus, type PsAutomationStatusVO } from "@/api/system/websocket";
import {
  getBrowserAutomationClients,
  type BrowserAutomationClientVO,
} from "@/api/external/browserAutomation";
import { useAppStore } from "@/store/modules/app";

defineOptions({ name: "HomeIndex" });

const { t } = useI18n();
const router = useRouter();
const appStore = useAppStore();
const { isDark } = storeToRefs(appStore);
const goTo = (route: string) => router.push(route);

// ── 1. Quick Links (Real Routes) ────────────────────────────────
interface ShortcutItem {
  key: string;
  title: string;
  description: string;
  route: string;
  icon: string;
  theme: "blue" | "emerald" | "violet" | "amber" | "rose" | "indigo" | "cyan" | "orange";
}

const shortcuts: ShortcutItem[] = [
  {
    key: "tools",
    title: "home.shortcut.tools.title",
    description: "home.shortcut.tools.desc",
    route: "/home/tools/index",
    icon: "lucide:download-cloud",
    theme: "blue",
  },
  {
    key: "toolkit",
    title: "home.shortcut.toolkit.title",
    description: "home.shortcut.toolkit.desc",
    route: "/operation/toolkit",
    icon: "lucide:box",
    theme: "emerald",
  },
  {
    key: "browser-automation",
    title: "home.shortcut.browserAutomation.title",
    description: "home.shortcut.browserAutomation.desc",
    route: "/external/browser-automation",
    icon: "lucide:globe",
    theme: "violet",
  },
  {
    key: "queue",
    title: "home.shortcut.queue.title",
    description: "home.shortcut.queue.desc",
    route: "/publish-center/queue",
    icon: "lucide:list-todo",
    theme: "amber",
  },
  {
    key: "psd-set",
    title: "home.shortcut.psdSet.title",
    description: "home.shortcut.psdSet.desc",
    route: "/publish-center/psd-set",
    icon: "lucide:palette",
    theme: "rose",
  },
  {
    key: "ai-api-key",
    title: "home.shortcut.aiApiKey.title",
    description: "home.shortcut.aiApiKey.desc",
    route: "/system/ai-api-key",
    icon: "lucide:key",
    theme: "indigo",
  },
  {
    key: "statistics",
    title: "home.shortcut.statistics.title",
    description: "home.shortcut.statistics.desc",
    route: "/home/statistics",
    icon: "lucide:bar-chart-3",
    theme: "cyan",
  },
  {
    key: "hot-search",
    title: "home.shortcut.hotSearch.title",
    description: "home.shortcut.hotSearch.desc",
    route: "/home/hot-search",
    icon: "lucide:flame",
    theme: "orange",
  },
];

// ── 2. Endpoint Connection Status (Real) ────────────────────────
const loading = ref(false);
const stats = ref<DashboardStats>({
  clientOnline: 0,
  clientTotal: 0,
  designToolOnline: 0,
  designToolTotal: 0,
  pluginOnline: 0,
  pluginTotal: 0,
  adminOnline: 0,
  totalConnections: 0,
  psOnline: 0,
  browserOnline: 0,
  clientsWithPsAutomation: 0,
  clientsWithBrowserAutomation: 0,
});

const psNodes = ref<PsAutomationStatusVO[]>([]);
const browserClients = ref<BrowserAutomationClientVO[]>([]);

const psNodeInfo = computed(() => {
  const total = psNodes.value.length;
  const online = psNodes.value.filter(
    (node) => node.isOnline !== false && node.psAutomation?.enabled === true,
  ).length;
  return { online, total };
});

const browserClientInfo = computed(() => {
  const total = browserClients.value.length;
  const online = browserClients.value.filter((client) => client.isOnline === true).length;
  return { online, total };
});

// ── 3. 模块统计（图库 / 自定义贴纸 共用一套结构）──────────────
type StatModuleData = {
  label: string;
  total: number;
  today: { created: number; updated: number };
  last24Hours: { created: number; updated: number };
  last7Days: { created: number; updated: number };
  last30Days: { created: number; updated: number };
  period: { days: number; created: number; updated: number };
  series: Array<{ date: string; created: number; updated: number }>;
  hourlySeries: Array<{ date: string; created: number; updated: number }>;
};

const emptyModule = (): StatModuleData => ({
  label: "",
  total: 0,
  today: { created: 0, updated: 0 },
  last24Hours: { created: 0, updated: 0 },
  last7Days: { created: 0, updated: 0 },
  last30Days: { created: 0, updated: 0 },
  period: { days: 7, created: 0, updated: 0 },
  series: [],
  hourlySeries: [],
});

/** 从统计接口的模块对象归一化成 StatModuleData */
const toStatModule = (raw: any, fallbackLabel = ""): StatModuleData => ({
  label: String(raw?.label || fallbackLabel),
  total: Number(raw?.total || 0),
  today: {
    created: Number(raw?.today?.created || 0),
    updated: Number(raw?.today?.updated || 0),
  },
  last24Hours: {
    created: Number(raw?.last24Hours?.created || 0),
    updated: Number(raw?.last24Hours?.updated || 0),
  },
  last7Days: {
    created: Number(raw?.last7Days?.created || 0),
    updated: Number(raw?.last7Days?.updated || 0),
  },
  last30Days: {
    created: Number(raw?.last30Days?.created || 0),
    updated: Number(raw?.last30Days?.updated || 0),
  },
  period: {
    days: Number(raw?.period?.days || 30),
    created: Number(raw?.period?.created || 0),
    updated: Number(raw?.period?.updated || 0),
  },
  series: Array.isArray(raw?.series) ? raw.series : [],
  hourlySeries: Array.isArray(raw?.hourlySeries) ? raw.hourlySeries : [],
});

// 三个面板各自独立的时间窗口
const galleryWindow = ref<"h24" | 7 | 30>("h24");
const crawlerWindow = ref<"h24" | 7 | 30>("h24");
const customStickerWindow = ref<"h24" | 7 | 30>("h24");
const galleryModule = ref<StatModuleData>(emptyModule());
const customStickerModule = ref<StatModuleData>(emptyModule());

/** 模块统计图配置工厂：图库 / 自定义贴纸 共用 */
const buildModuleChart = (
  mod: StatModuleData,
  win: "h24" | 7 | 30,
): EChartsOption => {
  // 近24小时 → 按小时分桶的序列；近7/30天 → 按天序列截取对应窗口
  const isHourly = win === "h24";
  const points = isHourly
    ? (mod.hourlySeries || []).map((p) => ({
        label: String(p.date || "").slice(11, 16), // HH:mm
        value: Number(p.created || 0),
      }))
    : (mod.series || []).slice(-Number(win)).map((p) => ({
        label: String(p.date || "").slice(5), // MM-DD
        value: Number(p.created || 0),
      }));

  const dates = points.map((p) => p.label);
  const createdData = points.map((p) => p.value);

  // 根据主题使用不同颜色
  const textColor = isDark.value ? "#94a3b8" : "#64748b";
  const tooltipBg = isDark.value ? "#1e293b" : "#ffffff";
  const splitLineColor = isDark.value ? "#334155" : "#e2e8f0";
  const itemBorderColor = isDark.value ? "#1e293b" : "#ffffff";

  return {
    tooltip: {
      trigger: "axis",
      backgroundColor: tooltipBg,
      borderColor: splitLineColor,
      borderWidth: 1,
      padding: [8, 12],
      textStyle: { color: textColor, fontSize: 12 },
      extraCssText: "box-shadow: 0 8px 24px -4px rgba(0, 0, 0, 0.12); border-radius: 8px;",
      axisPointer: {
        type: "line",
        lineStyle: { color: "rgba(99, 102, 241, 0.35)", type: "dashed", width: 1.5 },
      },
    },
    grid: {
      left: "1%",
      right: "2%",
      top: "10%",
      bottom: "2%",
      containLabel: true,
    },
    xAxis: {
      type: "category",
      boundaryGap: false,
      data: dates,
      // 只保留一条极淡的基线，去掉刻度与网格
      axisLine: { show: true, lineStyle: { color: splitLineColor, width: 1 } },
      axisTick: { show: false },
      axisLabel: {
        color: textColor,
        fontSize: 11,
        margin: 12,
        interval: "auto",
        hideOverlap: true,
      },
    },
    yAxis: {
      type: "value",
      minInterval: 1,
      // 去掉横向虚线网格，靠 tooltip 读数
      splitLine: { show: false },
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        color: textColor,
        fontSize: 11,
        margin: 10,
        formatter: (value: number) =>
          value >= 10000
            ? `${(value / 10000).toFixed(value >= 100000 ? 0 : 1)}万`
            : String(value),
      },
    },
    series: [
      {
        name: t("home.dashboard.todayCreated"),
        type: "line",
        smooth: 0.35,
        showSymbol: false,
        symbol: "circle",
        symbolSize: 6,
        itemStyle: {
          color: "#6366F1",
          borderColor: itemBorderColor,
          borderWidth: 2,
        },
        lineStyle: {
          width: 2.5,
          color: "#6366F1",
        },
        areaStyle: {
          color: {
            type: "linear",
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: "rgba(99, 102, 241, 0.24)" },
              { offset: 1, color: "rgba(99, 102, 241, 0.01)" },
            ],
          },
        },
        data: createdData,
      },
    ],
  };
};

const galleryChartOptions = computed(() => buildModuleChart(galleryModule.value, galleryWindow.value));
const customStickerChartOptions = computed(() => buildModuleChart(customStickerModule.value, customStickerWindow.value));

// ── 4. 采集素材：配色计数 + 折线图 ────────────────────────────
const CRAWLER_ACCENT = "#10B981"; // 与图库的靛蓝区分开

const crawlerMetrics = computed(() => {
  const s = crawlerStats.value;
  const win = (key: string) =>
    Number(s?.windows?.find((w) => w.key === key)?.count || 0);

  return [
    { key: "today", label: t("home.dashboard.todayCreated"), value: win("today"), prefix: "+", tone: "primary" },
    { key: "d7", label: t("home.dashboard.last7Days"), value: win("d7"), prefix: "", tone: "success" },
    { key: "d30", label: t("home.dashboard.last30Days"), value: win("d30"), prefix: "", tone: "info" },
    { key: "total", label: t("home.stat.totalRecords"), value: Number(s?.total || 0), prefix: "", tone: "neutral" },
  ];
});

/** 模块指标工厂：今日 / 近7天 / 近30天 / 总量（与采集素材一致） */
const buildModuleMetrics = (g: StatModuleData) => [
  { key: "today", label: t("home.dashboard.todayCreated"), value: Number(g?.today?.created || 0), prefix: "+", tone: "primary" },
  { key: "d7", label: t("home.dashboard.last7Days"), value: Number(g?.last7Days?.created || 0), prefix: "", tone: "success" },
  { key: "d30", label: t("home.dashboard.last30Days"), value: Number(g?.last30Days?.created || 0), prefix: "", tone: "info" },
  { key: "total", label: t("home.stat.totalRecords"), value: Number(g?.total || 0), prefix: "", tone: "neutral" },
];

const galleryMetrics = computed(() => buildModuleMetrics(galleryModule.value));
const customStickerMetrics = computed(() => buildModuleMetrics(customStickerModule.value));

const crawlerChartOptions = computed<EChartsOption>(() => {
  // 与图库一致：h24 用小时序列，7/30 天用天序列截取
  const win = crawlerWindow.value;
  const isHourly = win === "h24";
  const points = isHourly
    ? (crawlerStats.value?.hourlySeries || []).map((p) => ({
        label: String(p.date || "").slice(11, 16),
        value: Number(p.count || 0),
      }))
    : (crawlerStats.value?.series || []).slice(-Number(win)).map((p) => ({
        label: String(p.date || "").slice(5),
        value: Number(p.count || 0),
      }));
  const dates = points.map((p) => p.label);
  const counts = points.map((p) => p.value);

  const textColor = isDark.value ? "#94a3b8" : "#64748b";
  const tooltipBg = isDark.value ? "#1e293b" : "#ffffff";
  const splitLineColor = isDark.value ? "#334155" : "#e2e8f0";
  const itemBorderColor = isDark.value ? "#1e293b" : "#ffffff";

  return {
    tooltip: {
      trigger: "axis",
      backgroundColor: tooltipBg,
      borderColor: splitLineColor,
      borderWidth: 1,
      padding: [8, 12],
      textStyle: { color: textColor, fontSize: 12 },
      extraCssText: "box-shadow: 0 8px 24px -4px rgba(0, 0, 0, 0.12); border-radius: 8px;",
      axisPointer: {
        type: "line",
        lineStyle: { color: "rgba(16, 185, 129, 0.35)", type: "dashed", width: 1.5 },
      },
    },
    grid: {
      left: "1%",
      right: "2%",
      top: "10%",
      bottom: "2%",
      containLabel: true,
    },
    xAxis: {
      type: "category",
      boundaryGap: false,
      data: dates,
      // 只保留一条极淡的基线，去掉刻度与网格
      axisLine: { show: true, lineStyle: { color: splitLineColor, width: 1 } },
      axisTick: { show: false },
      axisLabel: {
        color: textColor,
        fontSize: 11,
        margin: 12,
        interval: "auto",
        hideOverlap: true,
      },
    },
    yAxis: {
      type: "value",
      minInterval: 1,
      // 去掉横向虚线网格，靠 tooltip 读数
      splitLine: { show: false },
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        color: textColor,
        fontSize: 11,
        margin: 10,
        formatter: (value: number) =>
          value >= 10000
            ? `${(value / 10000).toFixed(value >= 100000 ? 0 : 1)}万`
            : String(value),
      },
    },
    series: [
      {
        name: t("home.dashboard.crawlerMaterial"),
        type: "line",
        smooth: 0.35,
        showSymbol: false,
        symbol: "circle",
        symbolSize: 6,
        itemStyle: {
          color: CRAWLER_ACCENT,
          borderColor: itemBorderColor,
          borderWidth: 2,
        },
        lineStyle: { width: 2.5, color: CRAWLER_ACCENT },
        areaStyle: {
          color: {
            type: "linear",
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: "rgba(16, 185, 129, 0.28)" },
              { offset: 1, color: "rgba(16, 185, 129, 0.01)" },
            ],
          },
        },
        data: counts,
      },
    ],
  };
});

// ── 5. 发布任务统计（创建量 / 完成 / 失败 / 成功率趋势）────────
const emptyTrendBucket = () => ({
  created: 0,
  completed: 0,
  failed: 0,
  unfinished: 0,
  successRate: null as number | null,
  failureRate: null as number | null,
});

const publishTrend = ref<PublishTaskTrendResult | null>(null);
const publishTrendLoading = ref(false);
const publishWindow = ref<"h24" | 7 | 30>("h24");

/** 成功率 / 失败率 / 待完成 跟随当前选中的时间窗口（今日 / 近7天 / 近30天，与「今日创建」卡同口径） */
const publishWindowBucket = computed(() => {
  const data = publishTrend.value;
  if (!data) return emptyTrendBucket();
  if (publishWindow.value === "h24") return data.today || emptyTrendBucket();
  if (publishWindow.value === 7) return data.last7Days || emptyTrendBucket();
  return data.last30Days || emptyTrendBucket();
});

const publishWindowLabel = computed(() =>
  publishWindow.value === "h24"
    ? t("home.dashboard.today")
    : publishWindow.value === 7
      ? t("home.dashboard.last7Days")
      : t("home.dashboard.last30Days"),
);

const publishMetrics = computed(() => {
  const data = publishTrend.value;
  const today = data?.today || emptyTrendBucket();
  const last7 = data?.last7Days || emptyTrendBucket();
  const last30 = data?.last30Days || emptyTrendBucket();
  const windowBucket = publishWindowBucket.value;
  const fmtRate = (rate: number | null) =>
    rate === null ? null : `${rate.toFixed(1)}%`;

  return [
    { key: "today", label: t("home.dashboard.publishCreatedToday"), value: today.created, suffix: "", text: null, tone: "accent" },
    { key: "d7", label: t("home.dashboard.publishCreated7d"), value: last7.created, suffix: "", text: null, tone: "primary" },
    { key: "d30", label: t("home.dashboard.publishCreated30d"), value: last30.created, suffix: "", text: null, tone: "info" },
    {
      key: "unfinished",
      label: `${t("home.dashboard.publishUnfinished")} · ${publishWindowLabel.value}`,
      value: windowBucket.unfinished,
      suffix: "",
      text: null,
      tone: "neutral",
    },
    {
      key: "success",
      label: `${t("home.dashboard.publishSuccessRate")} · ${publishWindowLabel.value}`,
      value: 0,
      suffix: "",
      text: fmtRate(windowBucket.successRate) ?? "-",
      tone: "success",
    },
    {
      key: "failure",
      label: `${t("home.dashboard.publishFailureRate")} · ${publishWindowLabel.value}`,
      value: 0,
      suffix: "",
      text: fmtRate(windowBucket.failureRate) ?? "-",
      tone: "danger",
    },
  ];
});

/** 平台榜：跟随当前选中的时间窗口取对应窗口的平台数据 */
const publishPlatforms = computed(() => {
  const items = publishTrend.value?.byPlatform || [];
  const key =
    publishWindow.value === "h24"
      ? "today"
      : publishWindow.value === 7
        ? "last7Days"
        : "last30Days";
  return items
    .map((item) => {
      const bucket = item.windows?.[key];
      return {
        platform: item.platform,
        platformLabel: item.platformLabel,
        created: Number(bucket?.created) || 0,
        successRate: bucket?.successRate ?? null,
      };
    })
    .filter((item) => item.created > 0)
    .sort((a, b) => b.created - a.created);
});

/** 成功率配色：无数据灰、≥90 绿、≥60 橙、其余红 */
function rateTone(rate: number | null) {
  if (rate === null || Number.isNaN(rate)) return "muted";
  if (rate >= 90) return "success";
  if (rate >= 60) return "warning";
  return "danger";
}

const publishTrendChartOptions = computed<EChartsOption>(() => {
  const data = publishTrend.value;
  const win = publishWindow.value;
  const isHourly = win === "h24";
  // 「今日」口径：小时序列只保留今天 00:00 之后的桶，与指标卡 / 平台榜同口径
  const todayPrefix = (() => {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  })();
  const points = isHourly
    ? (data?.hourlySeries || [])
        .filter((p) => String(p.date || "") >= `${todayPrefix} 00:00:00`)
        .map((p) => ({
          label: String(p.date || "").slice(11, 16),
          created: Number(p.created || 0),
          completed: Number(p.completed || 0),
          failed: Number(p.failed || 0),
        }))
    : (data?.series || []).slice(-Number(win)).map((p) => ({
        label: String(p.date || "").slice(5),
        created: Number(p.created || 0),
        completed: Number(p.completed || 0),
        failed: Number(p.failed || 0),
      }));

  const textColor = isDark.value ? "#94a3b8" : "#64748b";
  const tooltipBg = isDark.value ? "#1e293b" : "#ffffff";
  const splitLineColor = isDark.value ? "#334155" : "#e2e8f0";

  const createdLabel = t("home.dashboard.publishCreated");
  const completedLabel = t("home.dashboard.publishCompleted");
  const failedLabel = t("home.dashboard.publishFailed");

  return {
    tooltip: {
      trigger: "axis",
      backgroundColor: tooltipBg,
      borderColor: splitLineColor,
      borderWidth: 1,
      padding: [8, 12],
      textStyle: { color: textColor, fontSize: 12 },
      extraCssText: "box-shadow: 0 8px 24px -4px rgba(0, 0, 0, 0.12); border-radius: 8px;",
    },
    legend: {
      top: 0,
      right: 0,
      itemWidth: 10,
      itemHeight: 10,
      textStyle: { color: textColor, fontSize: 11 },
      data: [createdLabel, completedLabel, failedLabel],
    },
    grid: {
      left: "1%",
      right: "2%",
      top: "20%",
      bottom: "2%",
      containLabel: true,
    },
    xAxis: {
      type: "category",
      data: points.map((p) => p.label),
      axisLine: { show: true, lineStyle: { color: splitLineColor, width: 1 } },
      axisTick: { show: false },
      axisLabel: {
        color: textColor,
        fontSize: 11,
        margin: 12,
        interval: "auto",
        hideOverlap: true,
      },
    },
    yAxis: {
      type: "value",
      minInterval: 1,
      splitLine: { show: false },
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: textColor, fontSize: 11, margin: 10 },
    },
    series: [
      {
        name: createdLabel,
        type: "bar",
        barMaxWidth: 14,
        itemStyle: { color: "rgba(99, 102, 241, 0.78)", borderRadius: [3, 3, 0, 0] },
        data: points.map((p) => p.created),
      },
      {
        name: completedLabel,
        type: "line",
        smooth: 0.35,
        showSymbol: false,
        itemStyle: { color: "#10b981" },
        lineStyle: { width: 2, color: "#10b981" },
        data: points.map((p) => p.completed),
      },
      {
        name: failedLabel,
        type: "line",
        smooth: 0.35,
        showSymbol: false,
        itemStyle: { color: "#ef4444" },
        lineStyle: { width: 2, color: "#ef4444" },
        data: points.map((p) => p.failed),
      },
    ],
  };
});

const loadPublishTrend = async () => {
  publishTrendLoading.value = true;
  try {
    // 固定拉 30 天，卡片里的近7天 / 近30天指标都来自同一份数据
    const res: any = await getPublishTaskTrend({ days: 30 });
    const payload = res?.data?.data ?? res?.data ?? res;
    publishTrend.value =
      payload && Array.isArray(payload.series) ? (payload as PublishTaskTrendResult) : null;
  } catch {
    // 首页统计为辅助信息，失败不影响其它区块
  } finally {
    publishTrendLoading.value = false;
  }
};

// ── 6. Real Data Loading ────────────────────────────────────────
const loadEndpointStatus = async () => {
  loading.value = true;
  try {
    const results = await Promise.allSettled([
      getDashboardStatsApi(),
      getMyPsAutomationStatus(),
      getBrowserAutomationClients(),
    ]);

    const [statsRes, psRes, browserRes] = results;

    if (statsRes.status === "fulfilled") stats.value = statsRes.value;
    if (psRes.status === "fulfilled") {
      psNodes.value = Array.isArray(psRes.value) ? psRes.value : [];
    }
    if (browserRes.status === "fulfilled") {
      browserClients.value = Array.isArray(browserRes.value) ? browserRes.value : [];
    }
  } finally {
    loading.value = false;
  }
};

// 一次请求拿全部模块，图库 / 自定义贴纸 共用
const loadModuleStats = async () => {
  // 固定拉 30 天，保证「近7天 / 近30天」两个指标可算；
  // 上方的时间窗口切换只影响图表显示
  const res = (await getModuleStatisticsApi(30)) as any;
  const payload = res?.data && res.data.modules ? res.data : res;
  const modules = Array.isArray(payload?.modules) ? payload.modules : [];

  const sticker = modules.find((m: any) => m?.key === "sticker");
  if (sticker) galleryModule.value = toStatModule(sticker);

  const customSticker = modules.find((m: any) => m?.key === "custom-sticker");
  if (customSticker) customStickerModule.value = toStatModule(customSticker);
};

const galleryLoading = ref(false);
const loadGalleryStats = async () => {
  galleryLoading.value = true;
  try {
    await loadModuleStats();
  } finally {
    galleryLoading.value = false;
  }
};
const customStickerLoading = ref(false);
const loadCustomStickerStats = async () => {
  customStickerLoading.value = true;
  try {
    await loadModuleStats();
  } finally {
    customStickerLoading.value = false;
  }
};

// ── 采集素材统计（复用模块页的 ResourceStatsBar）──────────────
const crawlerStats = ref<ResourceStats | null>(null);
const crawlerStatsLoading = ref(false);

const loadCrawlerMaterialStats = async () => {
  crawlerStatsLoading.value = true;
  try {
    const res = await CrawlerMaterialApi.getStats({ days: 30 });
    crawlerStats.value = (res as any)?.data || res || null;
  } catch {
    // 首页统计是辅助信息，失败不影响其它区块
  } finally {
    crawlerStatsLoading.value = false;
  }
};

const loadDashboardData = async () => {
  await Promise.allSettled([
    loadEndpointStatus(),
    loadGalleryStats(),
    loadCrawlerMaterialStats(),
    loadPublishTrend(),
  ]);
};

let refreshTimer: ReturnType<typeof setInterval> | null = null;

onMounted(() => {
  loadDashboardData();
  refreshTimer = setInterval(loadEndpointStatus, 15000);
});

onUnmounted(() => {
  if (refreshTimer) clearInterval(refreshTimer);
});
</script>

<style scoped lang="scss">
.home-dashboard {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 0 0 16px;
}

/* ── Section Title Bar ───────────────────────────────── */
.section-title-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 7px;
  /* 用固定高度而不是 min-height：只设下限时，右侧控件较高的那条仍会把整条撑起来 */
  height: 32px;
  flex-wrap: nowrap;

  &__left {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
    overflow: hidden;
    height: 100%;
  }

  &__icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    font-size: 13px;
    color: var(--el-text-color-secondary);
    background: color-mix(in srgb, var(--el-text-color-secondary) 8%, transparent);
    border-radius: 6px;
    flex-shrink: 0;
    transition:
      background-color 0.18s ease,
      color 0.18s ease;
  }

  &__title {
    margin: 0;
    font-size: 13.5px;
    font-weight: 700;
    color: var(--el-text-color-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    line-height: 32px;
  }

  &__desc {
    display: none;
  }

  &__right {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: nowrap;
    flex-shrink: 0;
    height: 100%;
    overflow: hidden;
  }
}

/* 右侧控件统一到同一高度，否则 radio 组比按钮高，标题栏会被撑开 */
.section-title-bar :deep(.el-radio-group),
.section-title-bar :deep(.el-radio-button),
.section-title-bar :deep(.el-radio-button__inner),
.section-title-bar :deep(.el-button) {
  height: 24px;
  min-height: 24px;
}

.section-title-bar :deep(.el-radio-button__inner) {
  padding: 5px 11px;
  line-height: 1;
}

/* ── 1. Connection Status Cards ───────────────────────── */
.conn-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 8px;

  @media (max-width: 1024px) {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
}

.conn-card {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 6px;
  padding: 10px 12px;
  background: var(--el-bg-color);
  border-radius: 9px;
  box-shadow: none;
  transition:
    background-color 0.18s ease,
    transform 0.18s ease;

  &:hover {
    transform: translateY(-1px);
    background: color-mix(
      in srgb,
      var(--el-color-primary) 6%,
      var(--el-bg-color)
    );
  }

  &__top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 6px;
  }

  &__label {
    font-size: 11.5px;
    font-weight: 500;
    color: var(--el-text-color-secondary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &__icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 21px;
    height: 21px;
    font-size: 12px;
    border-radius: 6px;
    flex-shrink: 0;
    color: var(--el-text-color-secondary);
    background: color-mix(in srgb, var(--el-text-color-secondary) 8%, transparent);
    transition:
      background-color 0.18s ease,
      color 0.18s ease;
  }

  &__main {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 6px;
  }

  &__value {
    font-size: 17px;
    font-weight: 700;
    letter-spacing: -0.02em;
    color: var(--el-text-color-primary);
    line-height: 1;

    &--offline {
      color: var(--el-text-color-placeholder);
    }
  }

  &__badge {
    padding: 1px 6px;
    font-size: 10px;
    font-weight: 600;
    border-radius: 4px;
    border: 1px solid transparent;

    &--online {
      color: var(--ep-cover-feedback-success-text);
      background: var(--ep-cover-feedback-success-bg);
      border-color: var(--ep-cover-feedback-success-border);
    }

    &--offline {
      color: var(--ep-cover-feedback-error-text);
      background: var(--ep-cover-feedback-error-bg);
      border-color: var(--ep-cover-feedback-error-border);
    }
  }

  &:hover .conn-card__icon {
    color: var(--el-color-primary);
    background: color-mix(in srgb, var(--el-color-primary) 12%, transparent);
  }
}

/* ── 2. Shortcuts Strip（紧凑图标条，不再是卡片墙）────────── */
.shortcuts-strip {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 6px;

  @media (max-width: 1200px) {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
  @media (max-width: 640px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

.shortcut-item {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 7px 9px;
  background: var(--el-bg-color);
  border-radius: 7px;
  cursor: pointer;
  min-width: 0;
  transition:
    background-color 0.18s ease,
    transform 0.18s ease;

  &:hover {
    transform: translateY(-1px);
    background: color-mix(in srgb, var(--el-color-primary) 8%, var(--el-bg-color));

    .shortcut-item__icon-box {
      color: var(--el-color-primary);
      background: color-mix(in srgb, var(--el-color-primary) 13%, transparent);
    }
  }

  &__icon-box {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
    border-radius: 6px;
    flex-shrink: 0;
    color: var(--el-text-color-secondary);
    background: color-mix(in srgb, var(--el-text-color-secondary) 8%, transparent);
    transition:
      background-color 0.18s ease,
      color 0.18s ease;
  }

  &__icon {
    font-size: 13px;
  }

  &__title {
    font-size: 11.5px;
    font-weight: 550;
    color: var(--el-text-color-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    min-width: 0;
  }
}

/* ── 3/4. 图表区：多栏并排，等高 ─────────────────────────── */
.dashboard-charts {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  align-items: stretch;

  @media (max-width: 1320px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 900px) {
    grid-template-columns: minmax(0, 1fr);
  }

  .home-section {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }
}

.t-primary {
  color: var(--el-color-primary) !important;
}

/* 卡片：淡背景、无边框 */
.gallery-card {
  display: flex;
  flex-direction: column;
  /* 撑满列高，保证左右两张面板底部对齐 */
  flex: 1;
  padding: 12px 10px 10px;
  background: var(--el-bg-color);
  border-radius: 12px;
}

/* 图表上方的时间窗口切换 */
.chart-head {
  display: flex;
  justify-content: flex-end;
  margin: 8px 0 2px;
}

/* 发布任务统计：tab 靠左 */
.chart-head--left {
  justify-content: flex-start;
}

/* 无边框极简 tab：去掉边框与底色，选中项用 10% 主色药丸底 */
.chart-tabs :deep(.el-radio-button__inner) {
  border: none !important;
  background: transparent !important;
  box-shadow: none !important;
  border-radius: 6px !important;
  padding: 4px 10px;
  font-size: 11px;
  color: var(--el-text-color-secondary);
  transition:
    color 0.15s ease,
    background-color 0.15s ease;
}

.chart-tabs :deep(.el-radio-button__inner:hover) {
  color: var(--el-text-color-primary);
}

.chart-tabs :deep(.el-radio-button.is-active .el-radio-button__inner) {
  color: var(--el-color-primary);
  font-weight: 600;
  background: color-mix(in srgb, var(--el-color-primary) 10%, transparent) !important;
}

/* 图表容器用固定高度，不用 flex:1 + height:100%。
 * 后者高度取决于父级 flex 链和文字换行，两张卡会算出不同高度；
 * 固定 px 才能保证左右两个图完全等高。 */
.chart-box {
  height: 220px;
}

/* 统计条：用 el-statistic，去掉卡片壳，只留细分隔线 */
.stat-row {
  display: grid;
  /* 4 个指标，列数必须与之对应，否则多出的空列会留下大片留白 */
  grid-template-columns: repeat(4, minmax(0, 1fr));
  align-items: center;
}

.stat-item {
  padding: 2px 10px;
  min-width: 0;
  text-align: center;
}

/* 首尾去掉外侧内边距，让两端贴齐卡片边缘 */
.stat-item:first-child {
  padding-left: 0;
}

.stat-item:last-child {
  padding-right: 0;
}

.stat-item + .stat-item {
  border-left: 1px solid var(--el-border-color-lighter);
}

/* el-statistic 的标题 */
.stat-item :deep(.el-statistic__head) {
  margin-bottom: 4px;
  font-size: 11px;
  color: var(--el-text-color-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 数值：用 tone 色，数字对齐 */
.stat-item :deep(.el-statistic__number) {
  font-size: 21px;
  font-weight: 650;
  letter-spacing: -0.2px;
  font-variant-numeric: tabular-nums;
  color: var(--metric-color, var(--el-color-primary));
  white-space: nowrap;
}

/* 百分比等非计数指标直接用文本渲染，避免 el-statistic 把非数字值当计数处理 */
.stat-item__label {
  margin-bottom: 4px;
  font-size: 11px;
  color: var(--el-text-color-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.stat-item__text {
  font-size: 21px;
  font-weight: 650;
  letter-spacing: -0.2px;
  font-variant-numeric: tabular-nums;
  color: var(--metric-color, var(--el-color-primary));
}

/* 前缀（+）与数字同一行，不允许折行 */
.stat-item :deep(.el-statistic__content) {
  display: inline-flex;
  align-items: baseline;
  flex-wrap: nowrap;
  white-space: nowrap;
}

.stat-item--primary { --metric-color: #6366f1; }
.stat-item--success { --metric-color: #10b981; }
.stat-item--info { --metric-color: #0ea5e9; }
/* 近24小时：用暖色突出「刚发生」 */
.stat-item--accent { --metric-color: #f97316; }
.stat-item--neutral { --metric-color: var(--el-text-color-regular); }
.stat-item--danger { --metric-color: #ef4444; }

.stat-item--neutral :deep(.el-statistic__number) {
  font-size: 18px;
  font-weight: 600;
}

/* ── 发布任务统计 ───────────────────────────────────────── */
.publish-stat-row {
  grid-template-columns: repeat(6, minmax(0, 1fr));
}

.publish-layout {
  display: grid;
  grid-template-columns: minmax(0, 2.2fr) minmax(0, 1fr);
  gap: 12px;
  margin-top: 6px;

  @media (max-width: 900px) {
    grid-template-columns: minmax(0, 1fr);
  }
}

.publish-layout__chart {
  min-width: 0;
}

.publish-chart-box {
  height: 240px;
}

.publish-layout__platforms {
  display: flex;
  flex-direction: column;
  min-width: 0;
  max-height: 274px;
  overflow-y: auto;
  padding-right: 2px;
}

.publish-platform__head,
.publish-platform__row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 52px 108px;
  align-items: center;
  gap: 6px;
}

.publish-platform__head {
  position: sticky;
  top: 0;
  z-index: 1;
  padding: 0 4px 6px;
  font-size: 11px;
  color: var(--el-text-color-secondary);
  background: var(--el-bg-color);
  border-bottom: 1px solid var(--el-border-color-lighter);

  span:nth-child(2),
  span:nth-child(3) {
    text-align: right;
  }
}

.publish-platform__row {
  padding: 6px 4px;
  font-size: 12px;
  border-bottom: 1px solid var(--el-border-color-lighter);

  &:last-child {
    border-bottom: none;
  }
}

.publish-platform__name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--el-text-color-primary);
}

.publish-platform__count {
  text-align: right;
  font-variant-numeric: tabular-nums;
  color: var(--el-text-color-regular);
}

.publish-platform__rate {
  text-align: right;
  font-weight: 600;
  font-variant-numeric: tabular-nums;

  &--success { color: var(--el-color-success); }
  &--warning { color: var(--el-color-warning); }
  &--danger { color: var(--el-color-danger); }
  &--muted { color: var(--el-text-color-secondary); }
}

.publish-platform__empty {
  padding: 18px 4px;
  text-align: center;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

@media (width <= 720px) {
  .stat-row {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    row-gap: 8px;
  }

  /* 两列换行时，行首去掉左边线 */
  .stat-item:nth-child(2n + 1) {
    border-left: none;
    padding-left: 0;
  }
}
</style>