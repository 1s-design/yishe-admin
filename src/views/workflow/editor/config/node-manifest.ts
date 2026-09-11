import {
  weiboIcon,
  feishuIcon,
  wecomIcon,
  douyinIcon,
  douyinJingxuanIcon,
  bilibiliIcon,
  zhihuIcon,
  toutiaoIcon,
  doubanIcon,
  kuaishouIcon,
  javaScriptIcon,
  openaiIcon,
  googleArtsCultureIcon,
  pinterestIcon,
  wikimediaIcon,
  pexelsIcon,
  pixabayIcon,
  rawpixelIcon,
  stocksnapIcon,
  openverseIcon,
  openclipartIcon,
  undrawIcon,
  iconifyIcon,
  nounprojectIcon,
  vecteezyIcon,
  openmojiIcon,
  googleIconsIcon,
  emojipediaIcon,
  svgrepoIcon,
  kaboompicsIcon,
  v2exIcon,
  thirtySixKrIcon,
  ithomeIcon,
  xiaohongshuIcon,
} from '@/assets/icons/apps'

import {
  hackernewsIcon, arxivIcon, githubIcon, gdeltIcon, googlenewsIcon,
  redditIcon, producthuntIcon, theguardianIcon, bbcnewsIcon, nprIcon,
  techcrunchIcon, thevergeIcon, arstechnicaIcon, mittechreviewIcon,
  reutersIcon, chinadailyIcon, govcnIcon, xinhuanetIcon,
  thepaperIcon, thirtySixKrNewsIcon, huxiuIcon,
  techcrunchrssIcon, arstechnicarssIcon, thevergerssIcon, wiredIcon,
  mittechreviewrssIcon, engadgetIcon, bbctechnologyIcon,
  guardiantechnologyIcon, timeIcon, apnewsIcon, nprtechnologyIcon,
  sciencedailyIcon, physorgIcon, quantamagazineIcon, spacecomIcon,
  natureIcon, scienceaaasIcon, jiqizhixinIcon, sspaiIcon,
  // 娱乐影视
  varietyIcon, hollywoodReporterIcon, deadlineIcon, billboardIcon,
  tmzIcon, ignIcon, polygonIcon, doubanMovieIcon, doubanBookIcon, doubanGalleryIcon,
  // 体育
  zhibo8Icon, hupuIcon, bbcSportIcon, flashscoreIcon,
  // 招聘
  lagouIcon, zhipinIcon, job51Icon, linkedinJobsIcon,
  // 政府数据/学术
  statsGovIcon, sseIcon, chinamoneyIcon, worldometersIcon, ourworldindataIcon, medrxivIcon,
} from '@/assets/icons/news'

import {
  openmeteoIcon,
  wttrIcon,
  coingeckoIcon,
  frankfurterIcon,
  dictionaryIcon,
  jokeIcon,
  ipifyIcon,
  sunrisesunsetIcon,
  timeapiIcon,
  zippopotamIcon,
  countryisIcon,
  erapiIcon,
  fawazahmedIcon,
  colorapiIcon,
  shopifyIcon,
  weatherCnIcon,
  weatherComIcon,
  // 金融行情
  yahooFinanceIcon, sinaFinanceIcon, eastmoneyIcon, clsTelegraphIcon, coinmarketcapIcon,
} from '@/assets/icons/utility'

import {
  googleTrendsIcon,
  wikipediaIcon,
  cnnIcon,
  nytimesIcon,
  aljazeeraIcon,
  devtoIcon,
  ebayTrendingIcon,
  baiduIcon,
  lobstersIcon,
  tencentNewsIcon,
  tencentTechIcon,
} from '@/assets/icons/hotsearch'



export type NodeType =
  | 'start'
  | 'end'
  | 'http'
  | 'code'
  | 'condition'
  | 'switch'
  | 'js_code'
  | 'ai_call'
  | 'loop'
  | 'while_loop'
  | 'llm'
  | 'message_push_feishu'
  | 'message_push_wecom'
  | 'hotsearch_weibo'
  | 'hotsearch_google_trends'
  | 'hotsearch_hackernews'
  | 'hotsearch_github'
  | 'hotsearch_wikipedia'
  | 'hotsearch_bbc_news'
  | 'hotsearch_cnn'
  | 'hotsearch_nytimes'
  | 'hotsearch_aljazeera'
  | 'hotsearch_devto'
  | 'hotsearch_kuaishou'
  | 'hotsearch_ithome'
  | 'hotsearch_jd_hot'
  | 'hotsearch_ebay_trending'
  | 'hotsearch_shopify_trending'
  | 'hotsearch_xiaohongshu'
  | 'xiaohongshu_note_detail'
  | 'hotsearch_baidu'
  | 'hotsearch_lobsters'
  | 'hotsearch_tencent_news'
  | 'hotsearch_tencent_tech'
  | 'google_arts_culture'
  | 'pinterest_culture'
  | 'wikimedia_culture'
  | 'pexels_search'
  | 'pixabay_search'
  | 'rawpixel_search'
  | 'douyin_jingxuan_search'
  | 'stocksnap_search'
  | 'openverse_search'
  | 'openclipart_search'
  | 'undraw_search'
  | 'iconify_search'
  | 'nounproject_search'
  | 'vecteezy_search'
  | 'openmoji_search'
  | 'googleicons_search'
  | 'emojipedia_search'
  | 'svgrepo_search'
  | 'kaboompics_search'
  | 'baidu_search'
  | 'bing_search'
  | 'duckduckgo_search'
  | 'sogou_search'
  | 'so_search'
  | 'wallhaven_search'
  | 'unsplash_search'
  | 'flickr_search'
  | 'googleimages_search'
  | 'yandex_search'
  | 'custom'
  | 'openmeteo_search'
  | 'wttr_search'
  | 'coingecko_search'
  | 'frankfurter_search'
  | 'dictionary_search'
  | 'joke_search'
  | 'ipify_search'
  | 'sunrisesunset_search'
  | 'timeapi_search'
  | 'zippopotam_search'
  | 'countryis_search'
  | 'erapi_search'
  | 'fawazahmed_search'
  | 'colorapi_search'
  | 'shopify_search'
  | 'hackernews_search'
  | 'arxiv_search'
  | 'github_search'
  | 'gdelt_search'
  | 'googlenews_search'
  | 'reddit_search'
  | 'producthunt_search'
  | 'theguardian_search'
  | 'bbcnews_search'
  | 'npr_search'
  | 'reuters_search'
  | 'techcrunch_search'
  | 'theverge_search'
  | 'arstechnica_search'
  | 'mittechreview_search'
  | 'chinadaily_search'
  | 'govcn_search'
  | 'xinhuanet_search'
  | 'thepaper_search'
  | '36kr_search'
  | 'huxiu_search'
  | 'techcrunchrss_search'
  | 'arstechnicarss_search'
  | 'thevergerss_search'
  | 'wired_search'
  | 'mittechreviewrss_search'
  | 'engadget_search'
  | 'bbctechnology_search'
  | 'guardiantechnology_search'
  | 'time_search'
  | 'apnews_search'
  | 'nprtechnology_search'
  | 'sciencedaily_search'
  | 'physorg_search'
  | 'quantamagazine_search'
  | 'spacecom_search'
  | 'nature_search'
  | 'scienceaaas_search'
  | 'jiqizhixin_search'
  | 'variety_search'
  | 'hollywood_reporter_search'
  | 'deadline_search'
  | 'billboard_search'
  | 'tmz_search'
  | 'ign_search'
  | 'polygon_search'
  | 'douban_movie_search'
  | 'douban_book_search'
  | 'douban_gallery_search'
  | 'medrxiv_search'
  | 'stats_gov_search'
  | 'sse_search'
  | 'chinamoney_search'
  | 'worldometers_search'
  | 'ourworldindata_search'
  | 'lagou_search'
  | 'zhipin_search'
  | '51job_search'
  | 'linkedin_jobs_search'
  | 'sspai_search'
  | 'yahoo_finance_search'
  | 'sina_finance_search'
  | 'eastmoney_search'
  | 'cls_telegraph_search'
  | 'coinmarketcap_search'
  | 'zhibo8_search'
  | 'hupu_post_search'
  | 'bbc_sport_search'
  | 'flashscore_search'
  | 'weather_cn_search'
  | 'weather_com_search'

export type NodeRequirementType = 'client' | 'client_browser' | 'internet' | 'config' | 'multi-end'

export interface NodeRequirement {
  type: NodeRequirementType
  label: string
  description?: string
}

export interface NodeIOSchemaField {
  field: string
  label: string
  type: 'string' | 'number' | 'boolean' | 'select' | 'code' | 'json' | 'textarea' | 'array' | 'any'
  required?: boolean
  defaultValue?: any
  placeholder?: string
  description?: string
  help?: string
  options?: { label: string; value: string | number }[]
  isSensitive?: boolean
}

export interface NodeRuntime {
  timeout?: number
  retry?: number
  retryDelay?: number
}

export interface NodeInputMapping {
  [configField: string]: string
}

export interface NodeManifest {
  type: string
  name: string
  category: string
  icon?: string
  color: string
  badge?: string
  description: string
  iconImage?: string
  platform?: string
  defaultData?: Record<string, any>
  inputSchema?: NodeIOSchemaField[]
  outputSchema?: NodeIOSchemaField[]
  requirements?: NodeRequirement[]
}

export const NODE_REQUIREMENTS: Record<NodeRequirementType, { label: string; color: string; icon: string }> = {
  client: { label: '需客户端', color: '#8b5cf6', icon: 'ep:monitor' },
  client_browser: { label: '需客户端浏览器', color: '#7c3aed', icon: 'ep:chrome-filled' },
  internet: { label: '需外网', color: '#06b6d4', icon: 'ep:link' },
  config: { label: '需配置', color: '#64748b', icon: 'ep:setting' },
  'multi-end': { label: '多端运行', color: '#10b981', icon: 'ep:connection' },
}

export const NODE_CATEGORIES = [
  { key: 'all', label: '全部节点', icon: 'ep:grid' },
  { key: 'base', label: '基础流程', icon: 'ep:location' },
  { key: 'ai', label: 'AI & LLM 智能', icon: 'ep:magic-stick' },
  { key: 'hotsearch', label: '热搜与社交媒体', icon: 'ep:trend-charts' },
  { key: 'design', label: 'PSD & 设计渲染', icon: 'ep:picture-filled' },
  { key: 'material', label: '素材与文件管理', icon: 'ep:folder-opened' },
  { key: 'product', label: '商品与电商处理', icon: 'ep:goods' },
  { key: 'integration', label: '网络与 API 集成', icon: 'ep:connection' },
  { key: 'notify', label: '消息通知推送', icon: 'ep:bell' },
  { key: 'logic', label: '逻辑与控制流', icon: 'ep:cpu' },
] as const

export function getNodeLabel(node: any): string {
  const capType = node.data?.capabilityType || node.type
  const manifest = NODE_MANIFEST_REGISTRY.find((m) => m.type === capType)
  return node.data?.label || manifest?.name || node.type
}

export function getNodeColor(node: any): string {
  const capType = node.data?.capabilityType || node.type
  const manifest = NODE_MANIFEST_REGISTRY.find((m) => m.type === capType)
  return manifest?.color || '#64748b'
}

export function getNodeOutputSchema(node: any): NodeIOSchemaField[] {
  const capType = node.data?.capabilityType || node.type
  const manifest = NODE_MANIFEST_REGISTRY.find((m) => m.type === capType)
  return manifest?.outputSchema || []
}

export const NODE_MANIFEST_REGISTRY: NodeManifest[] = [
  // ─── 条件分支 ────────────────────────────────────────────
  {
    type: 'condition',
    name: '条件分支',
    category: 'logic',
    icon: 'ep:connection',
    color: '#f59e0b',
    description: '根据条件表达式将工作流导向不同分支。支持多条件判断，每个条件对应一个输出端口。',
    defaultData: { name: '条件分支', config: { conditions: [] } },
    inputSchema: [],
    outputSchema: [
      { field: 'branch', label: '匹配分支', type: 'string' },
      { field: 'matched', label: '是否匹配', type: 'boolean' },
    ],
    requirements: [],
  },
  // ─── 多路切换 ────────────────────────────────────────────
  {
    type: 'switch',
    name: '多路切换',
    category: 'logic',
    icon: 'ep:connection',
    color: '#06b6d4',
    description: '根据字段值匹配多个 case 分支。配置多个值和对应标签，匹配则从对应端口输出。',
    defaultData: { name: '多路切换', config: { cases: [] } },
    inputSchema: [],
    outputSchema: [
      { field: 'branch', label: '匹配分支', type: 'string' },
      { field: 'matched', label: '是否匹配', type: 'boolean' },
    ],
    requirements: [],
  },
  // ─── JS 代码沙箱 ────────────────────────────────────────
  {
    type: 'js_code',
    name: '执行 JS 代码',
    category: 'logic',
    iconImage: javaScriptIcon,
    color: '#10b981',
    description: '在安全沙箱中执行 JavaScript 代码，用于数据处理、格式转换、逻辑编排。\n\n**可用变量：**\n- `$params` - 上游节点输出，如 `$params.nodeId` 或 `$params["node-id"]`\n- `$tools` - 内置工具（HTTP 请求、文件操作、COS 上传）\n- `$log(...args)` - 打印日志到执行记录\n- `return { key: value }` - 返回结果供下游节点使用\n\n**预装库：** axios、dayjs、cheerio、lodash、sharp',
    defaultData: { name: '执行 JS 代码', config: { code: '', timeoutMs: 30000 } },
    inputSchema: [
      {
        field: 'code',
        label: 'JavaScript 代码',
        type: 'code',
        required: true,
        placeholder: '// 示例：获取上游热搜节点数据并格式化\nconst hotsearch = $params.hotsearch_weibo || {};\nconst items = hotsearch.items || [];\n\nconst text = items.slice(0, 5).map((item, i) =>\n  `${i+1}. ${item.title} 🔥${item.hot}`\n).join("\\n");\n\nreturn { message: text };',
        help: '<b>可用变量</b><br>• $params.节点类型名 — 获取上游输出，如 $params.hotsearch_weibo.items<br>• $tools — 调用 HTTP/文件/COS 工具<br>• $log(...) — 打印日志到执行记录<br><b>返回结果</b><br>• return { key: value } — 供下游节点使用',
      },
      { field: 'timeoutMs', label: '超时时间(ms)', type: 'number', defaultValue: 30000 },
    ],
    outputSchema: [
      { field: 'result', label: '执行结果', type: 'any' },
      { field: 'logs', label: '执行日志', type: 'array' },
      { field: 'durationMs', label: '耗时(ms)', type: 'number' },
    ],
    requirements: [],
  },
  // ─── AI 大模型调用 ──────────────────────────────────────
  {
    type: 'ai_call',
    name: 'AI 调用',
    category: 'logic',
    iconImage: openaiIcon,
    color: '#6366f1',
    description: '调用 AI 大模型进行文本生成、内容分析、数据处理。支持变量插值引用上游节点输出，输出格式可选文本或 JSON。',
    defaultData: { name: 'AI 调用', config: { userPrompt: '', systemPrompt: '', temperature: 0.7, maxTokens: 2000, outputFormat: 'text' } },
    inputSchema: [
      { field: 'systemPrompt', label: '系统提示词', type: 'textarea', placeholder: '可选，定义 AI 的角色和行为' },
      { field: 'userPrompt', label: '用户提示词', type: 'textarea', required: true, placeholder: '支持 {{nodeId.field}} 变量引用' },
      { field: 'temperature', label: '温度', type: 'number', defaultValue: 0.7, description: '0-2，越高越有创意' },
      { field: 'maxTokens', label: '最大Token', type: 'number', defaultValue: 2000 },
      { field: 'outputFormat', label: '输出格式', type: 'select', defaultValue: 'text', options: [{ label: '文本', value: 'text' }, { label: 'JSON', value: 'json' }] },
    ],
    outputSchema: [
      { field: 'content', label: '生成内容', type: 'string' },
      { field: 'tokens', label: 'Token用量', type: 'number' },
      { field: 'model', label: '使用模型', type: 'string' },
    ],
    requirements: [],
  },
  // ─── For Each 循环 ──────────────────────────────────────
  {
    type: 'loop',
    name: 'For 循环',
    category: 'logic',
    icon: 'ep:refresh',
    color: '#8b5cf6',
    description: '遍历数组中的每个元素，依次执行循环体。有两个输出端口：循环体和完成。',
    defaultData: { name: 'For 循环', config: { items: [] } },
    inputSchema: [],
    outputSchema: [
      { field: 'items', label: '遍历数组', type: 'array' },
      { field: 'results', label: '执行结果', type: 'array' },
      { field: 'count', label: '循环次数', type: 'number' },
    ],
    requirements: [],
  },
  // ─── While 循环 ─────────────────────────────────────────
  {
    type: 'while_loop',
    name: 'While 循环',
    category: 'logic',
    icon: 'ep:refresh',
    color: '#ec4899',
    description: '当条件满足时重复执行循环体。有两个输出端口：循环体和完成。',
    defaultData: { name: 'While 循环', config: { condition: {}, maxIterations: 100 } },
    inputSchema: [],
    outputSchema: [
      { field: 'results', label: '执行结果', type: 'array' },
      { field: 'count', label: '循环次数', type: 'number' },
    ],
    requirements: [],
  },
  // ─── 微博热搜采集 ────────────────────────────────────────
  {
    type: 'hotsearch_weibo',
    name: '微博热搜采集',
    category: 'hotsearch',
    iconImage: weiboIcon,
    color: '#e6162d',
    badge: '多端运行',
    description: '采集微博实时热搜榜。支持服务端执行（默认，稳定可靠）或客户端执行（使用本地网络）。核心逻辑由服务端统一维护，客户端动态拉取。',
    defaultData: { name: '微博热搜采集', config: { maxCount: 20, executionMode: 'server' } },
    inputSchema: [
      {
        field: 'maxCount',
        label: '获取数量',
        type: 'number',
        defaultValue: 20,
      },
      {
        field: 'executionMode',
        label: '执行位置',
        type: 'select',
        defaultValue: 'server',
        description: '服务端执行（默认）：由服务端直接采集，无需客户端在线；客户端执行：由客户端本地网络采集，适合需要客户端IP的场景。',
        options: [
          { label: '服务端执行', value: 'server' },
          { label: '客户端执行', value: 'client' },
        ],
      },
    ],
    outputSchema: [
      { field: 'platform', label: '平台标识', type: 'string' },
      { field: 'name', label: '平台名称', type: 'string' },
      { field: 'itemCount', label: '条目数', type: 'number' },
      { field: 'items', label: '热搜条目', type: 'array' },
      { field: 'fetchedAt', label: '采集时间', type: 'string' },
      { field: 'duration', label: '耗时(ms)', type: 'number' },
    ],
    requirements: [{ type: 'multi-end', label: '多端运行' }],
  },
  {
    type: 'hotsearch_douyin',
    name: '抖音热搜采集',
    category: 'hotsearch',
    iconImage: douyinIcon,
    color: '#000000',
    badge: '多端运行',
    description: '采集抖音实时热搜榜。支持服务端执行（默认，稳定可靠）或客户端执行（使用本地网络）。核心逻辑由服务端统一维护，客户端动态拉取。',
    defaultData: { name: '抖音热搜采集', config: { maxCount: 20, executionMode: 'server' } },
    inputSchema: [
      {
        field: 'maxCount',
        label: '获取数量',
        type: 'number',
        defaultValue: 20,
      },
      {
        field: 'executionMode',
        label: '执行位置',
        type: 'select',
        defaultValue: 'server',
        description: '服务端执行（默认）：由服务端直接采集，无需客户端在线；客户端执行：由客户端本地网络采集，适合需要客户端IP的场景。',
        options: [
          { label: '服务端执行', value: 'server' },
          { label: '客户端执行', value: 'client' },
        ],
      },
    ],
    outputSchema: [
      { field: 'platform', label: '平台标识', type: 'string' },
      { field: 'name', label: '平台名称', type: 'string' },
      { field: 'itemCount', label: '条目数', type: 'number' },
      { field: 'items', label: '热搜条目', type: 'array' },
      { field: 'fetchedAt', label: '采集时间', type: 'string' },
      { field: 'duration', label: '耗时(ms)', type: 'number' },
    ],
    requirements: [{ type: 'multi-end', label: '多端运行' }],
  },
  {
    type: 'hotsearch_bilibili',
    name: 'B站热搜采集',
    category: 'hotsearch',
    iconImage: bilibiliIcon,
    color: '#00a1d6',
    badge: '多端运行',
    description: '采集B站实时热搜榜。支持服务端执行（默认，稳定可靠）或客户端执行（使用本地网络）。核心逻辑由服务端统一维护，客户端动态拉取。',
    defaultData: { name: 'B站热搜采集', config: { maxCount: 20, executionMode: 'server' } },
    inputSchema: [
      {
        field: 'maxCount',
        label: '获取数量',
        type: 'number',
        defaultValue: 20,
      },
      {
        field: 'executionMode',
        label: '执行位置',
        type: 'select',
        defaultValue: 'server',
        description: '服务端执行（默认）：由服务端直接采集，无需客户端在线；客户端执行：由客户端本地网络采集，适合需要客户端IP的场景。',
        options: [
          { label: '服务端执行', value: 'server' },
          { label: '客户端执行', value: 'client' },
        ],
      },
    ],
    outputSchema: [
      { field: 'platform', label: '平台标识', type: 'string' },
      { field: 'name', label: '平台名称', type: 'string' },
      { field: 'itemCount', label: '条目数', type: 'number' },
      { field: 'items', label: '热搜条目', type: 'array' },
      { field: 'fetchedAt', label: '采集时间', type: 'string' },
      { field: 'duration', label: '耗时(ms)', type: 'number' },
    ],
    requirements: [{ type: 'multi-end', label: '多端运行' }],
  },
  {
    type: 'hotsearch_zhihu',
    name: '知乎热榜采集',
    category: 'hotsearch',
    iconImage: zhihuIcon,
    color: '#0084ff',
    badge: '多端运行',
    description: '采集知乎实时热榜。支持服务端执行（默认，稳定可靠）或客户端执行（使用本地网络）。核心逻辑由服务端统一维护，客户端动态拉取。',
    defaultData: { name: '知乎热榜采集', config: { maxCount: 20, executionMode: 'server' } },
    inputSchema: [
      {
        field: 'maxCount',
        label: '获取数量',
        type: 'number',
        defaultValue: 20,
      },
      {
        field: 'executionMode',
        label: '执行位置',
        type: 'select',
        defaultValue: 'server',
        description: '服务端执行（默认）：由服务端直接采集，无需客户端在线；客户端执行：由客户端本地网络采集，适合需要客户端IP的场景。',
        options: [
          { label: '服务端执行', value: 'server' },
          { label: '客户端执行', value: 'client' },
        ],
      },
    ],
    outputSchema: [
      { field: 'platform', label: '平台标识', type: 'string' },
      { field: 'name', label: '平台名称', type: 'string' },
      { field: 'itemCount', label: '条目数', type: 'number' },
      { field: 'items', label: '热搜条目', type: 'array' },
      { field: 'fetchedAt', label: '采集时间', type: 'string' },
      { field: 'duration', label: '耗时(ms)', type: 'number' },
    ],
    requirements: [{ type: 'multi-end', label: '多端运行' }],
  },
  {
    type: 'hotsearch_toutiao',
    name: '今日头条热搜采集',
    category: 'hotsearch',
    iconImage: toutiaoIcon,
    color: '#f5222d',
    badge: '多端运行',
    description: '采集今日头条实时热搜榜。支持服务端执行（默认，稳定可靠）或客户端执行（使用本地网络）。核心逻辑由服务端统一维护，客户端动态拉取。',
    defaultData: { name: '今日头条热搜采集', config: { maxCount: 20, executionMode: 'server' } },
    inputSchema: [
      {
        field: 'maxCount',
        label: '获取数量',
        type: 'number',
        defaultValue: 20,
      },
      {
        field: 'executionMode',
        label: '执行位置',
        type: 'select',
        defaultValue: 'server',
        description: '服务端执行（默认）：由服务端直接采集，无需客户端在线；客户端执行：由客户端本地网络采集，适合需要客户端IP的场景。',
        options: [
          { label: '服务端执行', value: 'server' },
          { label: '客户端执行', value: 'client' },
        ],
      },
    ],
    outputSchema: [
      { field: 'platform', label: '平台标识', type: 'string' },
      { field: 'name', label: '平台名称', type: 'string' },
      { field: 'itemCount', label: '条目数', type: 'number' },
      { field: 'items', label: '热搜条目', type: 'array' },
      { field: 'fetchedAt', label: '采集时间', type: 'string' },
      { field: 'duration', label: '耗时(ms)', type: 'number' },
    ],
    requirements: [{ type: 'multi-end', label: '多端运行' }],
  },
  {
    type: 'hotsearch_douban',
    name: '豆瓣热门采集',
    category: 'hotsearch',
    iconImage: doubanIcon,
    color: '#007722',
    badge: '多端运行',
    description: '采集豆瓣热门内容榜单。支持服务端执行（默认，稳定可靠）或客户端执行（使用本地网络）。核心逻辑由服务端统一维护，客户端动态拉取。',
    defaultData: { name: '豆瓣热门采集', config: { maxCount: 20, executionMode: 'server' } },
    inputSchema: [
      {
        field: 'maxCount',
        label: '获取数量',
        type: 'number',
        defaultValue: 20,
      },
      {
        field: 'executionMode',
        label: '执行位置',
        type: 'select',
        defaultValue: 'server',
        description: '服务端执行（默认）：由服务端直接采集，无需客户端在线；客户端执行：由客户端本地网络采集，适合需要客户端IP的场景。',
        options: [
          { label: '服务端执行', value: 'server' },
          { label: '客户端执行', value: 'client' },
        ],
      },
    ],
    outputSchema: [
      { field: 'platform', label: '平台标识', type: 'string' },
      { field: 'name', label: '平台名称', type: 'string' },
      { field: 'itemCount', label: '条目数', type: 'number' },
      { field: 'items', label: '热搜条目', type: 'array' },
      { field: 'fetchedAt', label: '采集时间', type: 'string' },
      { field: 'duration', label: '耗时(ms)', type: 'number' },
    ],
    requirements: [{ type: 'multi-end', label: '多端运行' }],
  },
  {
    type: 'hotsearch_kuaishou',
    name: '快手热搜采集',
    category: 'hotsearch',
    iconImage: kuaishouIcon,
    color: '#ff6600',
    badge: '热搜',
    description: '通过已登录客户端采集快手实时热搜榜单，获取当前短视频平台最热门的话题、挑战和流行内容。快手热搜反映下沉市场用户的兴趣方向和生活化内容趋势。需客户端在线且已登录快手账号，自动查找在线设备逐个尝试执行。输出包含热搜标题、热度值、相关视频量和跳转链接，适用于短视频内容策划、下沉市场热点分析和直播选题参考。',
    defaultData: { name: '快手热搜采集', platform: 'kuaishou' },
    inputSchema: [],
    outputSchema: [
      { field: 'platform', label: '平台标识', type: 'string' },
      { field: 'name', label: '平台名称', type: 'string' },
      { field: 'itemCount', label: '条目数', type: 'number' },
      { field: 'items', label: '热搜条目', type: 'array' },
      { field: 'fetchedAt', label: '采集时间', type: 'string' },
      { field: 'duration', label: '耗时(ms)', type: 'number' },
    ],
    requirements: [{ type: 'client', label: '需客户端在线' }],
  },
  {
    type: 'hotsearch_xiaohongshu',
    name: '小红书热门/探索采集',
    category: 'hotsearch',
    iconImage: xiaohongshuIcon,
    color: '#ff2442',
    badge: '探索',
    description: '通过纯 HTTP 接口采集小红书探索推荐流热门笔记。无需客户端与登录账号即可提取全网最新爆款图文与视频内容。输出包含笔记标题、封面图片、作者信息、点赞互动数及跳转链接，适用于生活方式趋势分析、灵感搜集与爆款选题。',
    defaultData: { name: '小红书热门/探索采集', platform: 'xiaohongshu' },
    inputSchema: [
      {
        field: 'maxCount',
        label: '获取数量',
        type: 'number',
        defaultValue: 20,
      },
    ],
    outputSchema: [
      { field: 'platform', label: '平台标识', type: 'string' },
      { field: 'name', label: '平台名称', type: 'string' },
      { field: 'itemCount', label: '条目数', type: 'number' },
      { field: 'items', label: '笔记条目列表', type: 'array' },
      { field: 'fetchedAt', label: '采集时间', type: 'string' },
    ],
  },
  {
    type: 'xiaohongshu_note_detail',
    name: '小红书笔记详情提取',
    category: 'hotsearch',
    iconImage: xiaohongshuIcon,
    color: '#ff2442',
    badge: '详情',
    description: '通过纯 HTTP 接口解析指定小红书笔记链接或 NoteID，提取笔记完整正文长文、高清原图集、视频播放地址、作者信息、点赞/收藏/评论/分享完整互动指标及话题标签。',
    defaultData: { name: '小红书笔记详情提取' },
    inputSchema: [
      {
        field: 'noteId',
        label: '笔记ID/链接',
        type: 'string',
        required: true,
        placeholder: '输入笔记 ID 或完整 URL (如 https://www.xiaohongshu.com/explore/...)',
      },
      {
        field: 'xsecToken',
        label: '安全 Token (xsec_token)',
        type: 'string',
        description: '由热门/探索节点输出或 URL 参数中提取的 xsec_token',
      },
    ],
    outputSchema: [
      { field: 'noteId', label: '笔记ID', type: 'string' },
      { field: 'xsecToken', label: '安全Token', type: 'string' },
      { field: 'title', label: '笔记标题', type: 'string' },
      { field: 'desc', label: '笔记正文全文', type: 'string' },
      { field: 'noteType', label: '笔记类型', type: 'string' },
      { field: 'images', label: '高清图片列表', type: 'array' },
      { field: 'videoUrl', label: '视频播放地址', type: 'string' },
      { field: 'tags', label: '话题标签列表', type: 'array' },
      { field: 'interactInfo', label: '互动指标', type: 'json' },
      { field: 'author', label: '作者信息', type: 'json' },
      { field: 'fetchedAt', label: '采集时间', type: 'string' },
    ],
  },
  {
    type: 'hotsearch_v2ex',
    name: 'V2EX热门采集',
    category: 'hotsearch',
    iconImage: v2exIcon,
    color: '#2b2b2b',
    badge: '多端运行',
    description: '采集V2EX热门话题。支持服务端执行（默认，稳定可靠）或客户端执行（使用本地网络）。核心逻辑由服务端统一维护，客户端动态拉取。',
    defaultData: { name: 'V2EX热门采集', config: { maxCount: 20, executionMode: 'server' } },
    inputSchema: [
      {
        field: 'maxCount',
        label: '获取数量',
        type: 'number',
        defaultValue: 20,
      },
      {
        field: 'executionMode',
        label: '执行位置',
        type: 'select',
        defaultValue: 'server',
        description: '服务端执行（默认）：由服务端直接采集，无需客户端在线；客户端执行：由客户端本地网络采集，适合需要客户端IP的场景。',
        options: [
          { label: '服务端执行', value: 'server' },
          { label: '客户端执行', value: 'client' },
        ],
      },
    ],
    outputSchema: [
      { field: 'platform', label: '平台标识', type: 'string' },
      { field: 'name', label: '平台名称', type: 'string' },
      { field: 'itemCount', label: '条目数', type: 'number' },
      { field: 'items', label: '热搜条目', type: 'array' },
      { field: 'fetchedAt', label: '采集时间', type: 'string' },
      { field: 'duration', label: '耗时(ms)', type: 'number' },
    ],
    requirements: [{ type: 'multi-end', label: '多端运行' }],
  },
  {
    type: 'hotsearch_baidu',
    name: '百度热搜采集',
    category: 'hotsearch',
    iconImage: baiduIcon,
    color: '#2932e1',
    badge: '多端运行',
    description: '采集百度实时热搜榜。支持服务端执行（默认，稳定可靠）或客户端执行（使用本地网络）。核心逻辑由服务端统一维护，客户端动态拉取。',
    defaultData: { name: '百度热搜采集', config: { maxCount: 20, executionMode: 'server' } },
    inputSchema: [
      { field: 'maxCount', label: '获取数量', type: 'number', defaultValue: 20 },
      { field: 'executionMode', label: '执行位置', type: 'select', defaultValue: 'server', description: '服务端执行（默认）：由服务端直接采集，无需客户端在线；客户端执行：由客户端本地网络采集，适合需要客户端IP的场景。', options: [{ label: '服务端执行', value: 'server' }, { label: '客户端执行', value: 'client' }] },
    ],
    outputSchema: [
      { field: 'platform', label: '平台标识', type: 'string' },
      { field: 'name', label: '平台名称', type: 'string' },
      { field: 'itemCount', label: '条目数', type: 'number' },
      { field: 'items', label: '热搜条目', type: 'array' },
      { field: 'fetchedAt', label: '采集时间', type: 'string' },
      { field: 'duration', label: '耗时(ms)', type: 'number' },
    ],
    requirements: [{ type: 'multi-end', label: '多端运行' }],
  },
  {
    type: 'hotsearch_kuaishou',
    name: '快手热搜采集',
    category: 'hotsearch',
    iconImage: kuaishouIcon,
    color: '#ff4906',
    badge: '多端运行',
    description: '采集快手实时热搜榜。支持服务端执行（默认，稳定可靠）或客户端执行（使用本地网络）。核心逻辑由服务端统一维护，客户端动态拉取。',
    defaultData: { name: '快手热搜采集', config: { maxCount: 20, executionMode: 'server' } },
    inputSchema: [
      { field: 'maxCount', label: '获取数量', type: 'number', defaultValue: 20 },
      { field: 'executionMode', label: '执行位置', type: 'select', defaultValue: 'server', description: '服务端执行（默认）：由服务端直接采集，无需客户端在线；客户端执行：由客户端本地网络采集，适合需要客户端IP的场景。', options: [{ label: '服务端执行', value: 'server' }, { label: '客户端执行', value: 'client' }] },
    ],
    outputSchema: [
      { field: 'platform', label: '平台标识', type: 'string' },
      { field: 'name', label: '平台名称', type: 'string' },
      { field: 'itemCount', label: '条目数', type: 'number' },
      { field: 'items', label: '热搜条目', type: 'array' },
      { field: 'fetchedAt', label: '采集时间', type: 'string' },
      { field: 'duration', label: '耗时(ms)', type: 'number' },
    ],
    requirements: [{ type: 'multi-end', label: '多端运行' }],
  },
  {
    type: 'hotsearch_github',
    name: 'GitHub Trending采集',
    category: 'hotsearch',
    iconImage: githubIcon,
    color: '#24292e',
    badge: '多端运行',
    description: '采集GitHub热门Trending项目。支持服务端执行（默认，稳定可靠）或客户端执行（使用本地网络）。核心逻辑由服务端统一维护，客户端动态拉取。',
    defaultData: { name: 'GitHub Trending采集', config: { maxCount: 20, executionMode: 'server' } },
    inputSchema: [
      { field: 'maxCount', label: '获取数量', type: 'number', defaultValue: 20 },
      { field: 'executionMode', label: '执行位置', type: 'select', defaultValue: 'server', description: '服务端执行（默认）：由服务端直接采集，无需客户端在线；客户端执行：由客户端本地网络采集，适合需要客户端IP的场景。', options: [{ label: '服务端执行', value: 'server' }, { label: '客户端执行', value: 'client' }] },
    ],
    outputSchema: [
      { field: 'platform', label: '平台标识', type: 'string' },
      { field: 'name', label: '平台名称', type: 'string' },
      { field: 'itemCount', label: '条目数', type: 'number' },
      { field: 'items', label: '热搜条目', type: 'array' },
      { field: 'fetchedAt', label: '采集时间', type: 'string' },
      { field: 'duration', label: '耗时(ms)', type: 'number' },
    ],
    requirements: [{ type: 'multi-end', label: '多端运行' }],
  },
  {
    type: 'hotsearch_xiaohongshu',
    name: '小红书热门采集',
    category: 'hotsearch',
    iconImage: xiaohongshuIcon,
    color: '#ff2442',
    badge: '多端运行',
    description: '采集小红书热门内容。支持服务端执行（默认，稳定可靠）或客户端执行（使用本地网络）。核心逻辑由服务端统一维护，客户端动态拉取。',
    defaultData: { name: '小红书热门采集', config: { maxCount: 20, executionMode: 'server' } },
    inputSchema: [
      { field: 'maxCount', label: '获取数量', type: 'number', defaultValue: 20 },
      { field: 'executionMode', label: '执行位置', type: 'select', defaultValue: 'server', description: '服务端执行（默认）：由服务端直接采集，无需客户端在线；客户端执行：由客户端本地网络采集，适合需要客户端IP的场景。', options: [{ label: '服务端执行', value: 'server' }, { label: '客户端执行', value: 'client' }] },
    ],
    outputSchema: [
      { field: 'platform', label: '平台标识', type: 'string' },
      { field: 'name', label: '平台名称', type: 'string' },
      { field: 'itemCount', label: '条目数', type: 'number' },
      { field: 'items', label: '热搜条目', type: 'array' },
      { field: 'fetchedAt', label: '采集时间', type: 'string' },
      { field: 'duration', label: '耗时(ms)', type: 'number' },
    ],
    requirements: [{ type: 'multi-end', label: '多端运行' }],
  },
  {
    type: 'hotsearch_ithome',
    name: 'IT之家热门采集',
    category: 'hotsearch',
    iconImage: ithomeIcon,
    color: '#c8102e',
    badge: '多端运行',
    description: '采集IT之家热门文章。支持服务端执行（默认，稳定可靠）或客户端执行（使用本地网络）。核心逻辑由服务端统一维护，客户端动态拉取。',
    defaultData: { name: 'IT之家热门采集', config: { maxCount: 20, executionMode: 'server' } },
    inputSchema: [
      { field: 'maxCount', label: '获取数量', type: 'number', defaultValue: 20 },
      { field: 'executionMode', label: '执行位置', type: 'select', defaultValue: 'server', description: '服务端执行（默认）：由服务端直接采集，无需客户端在线；客户端执行：由客户端本地网络采集，适合需要客户端IP的场景。', options: [{ label: '服务端执行', value: 'server' }, { label: '客户端执行', value: 'client' }] },
    ],
    outputSchema: [
      { field: 'platform', label: '平台标识', type: 'string' },
      { field: 'name', label: '平台名称', type: 'string' },
      { field: 'itemCount', label: '条目数', type: 'number' },
      { field: 'items', label: '热搜条目', type: 'array' },
      { field: 'fetchedAt', label: '采集时间', type: 'string' },
      { field: 'duration', label: '耗时(ms)', type: 'number' },
    ],
    requirements: [{ type: 'multi-end', label: '多端运行' }],
  },
  {
    type: 'hotsearch_jd_hot',
    name: '京东热搜采集',
    category: 'hotsearch',
    iconImage: null,
    color: '#e4393c',
    badge: '多端运行',
    description: '采集京东热门搜索词。支持服务端执行（默认，稳定可靠）或客户端执行（使用本地网络）。核心逻辑由服务端统一维护，客户端动态拉取。',
    defaultData: { name: '京东热搜采集', config: { maxCount: 20, executionMode: 'server' } },
    inputSchema: [
      { field: 'maxCount', label: '获取数量', type: 'number', defaultValue: 20 },
      { field: 'executionMode', label: '执行位置', type: 'select', defaultValue: 'server', description: '服务端执行（默认）：由服务端直接采集，无需客户端在线；客户端执行：由客户端本地网络采集，适合需要客户端IP的场景。', options: [{ label: '服务端执行', value: 'server' }, { label: '客户端执行', value: 'client' }] },
    ],
    outputSchema: [
      { field: 'platform', label: '平台标识', type: 'string' },
      { field: 'name', label: '平台名称', type: 'string' },
      { field: 'itemCount', label: '条目数', type: 'number' },
      { field: 'items', label: '热搜条目', type: 'array' },
      { field: 'fetchedAt', label: '采集时间', type: 'string' },
      { field: 'duration', label: '耗时(ms)', type: 'number' },
    ],
    requirements: [{ type: 'multi-end', label: '多端运行' }],
  },
  {
    type: 'hotsearch_devto',
    name: 'Dev.to热门采集',
    category: 'hotsearch',
    iconImage: devtoIcon,
    color: '#0a0a0a',
    badge: '多端运行',
    description: '采集Dev.to热门开发者文章。支持服务端执行（默认，稳定可靠）或客户端执行（使用本地网络）。核心逻辑由服务端统一维护，客户端动态拉取。',
    defaultData: { name: 'Dev.to热门采集', config: { maxCount: 20, executionMode: 'server' } },
    inputSchema: [
      { field: 'maxCount', label: '获取数量', type: 'number', defaultValue: 20 },
      { field: 'executionMode', label: '执行位置', type: 'select', defaultValue: 'server', description: '服务端执行（默认）：由服务端直接采集，无需客户端在线；客户端执行：由客户端本地网络采集，适合需要客户端IP的场景。', options: [{ label: '服务端执行', value: 'server' }, { label: '客户端执行', value: 'client' }] },
    ],
    outputSchema: [
      { field: 'platform', label: '平台标识', type: 'string' },
      { field: 'name', label: '平台名称', type: 'string' },
      { field: 'itemCount', label: '条目数', type: 'number' },
      { field: 'items', label: '热搜条目', type: 'array' },
      { field: 'fetchedAt', label: '采集时间', type: 'string' },
      { field: 'duration', label: '耗时(ms)', type: 'number' },
    ],
    requirements: [{ type: 'multi-end', label: '多端运行' }],
  },
  {
    type: 'hotsearch_36kr',
    name: '36氪热门采集',
    category: 'hotsearch',
    iconImage: thirtySixKrIcon,
    color: '#0052d9',
    badge: '热搜',
    description: '通过已登录客户端采集36氪热门内容，获取当前科技与创投领域最受关注的创业公司、行业分析和投资动态。36氪是中国知名的科技与创投媒体，内容覆盖AI、新能源、消费等热门赛道。需客户端在线，自动查找在线设备逐个尝试执行。输出包含文章标题、阅读量、发布时间和详情链接，适用于创投趋势追踪、行业研究和商业情报收集。',
    defaultData: { name: '36氪热门采集', platform: '36kr' },
    inputSchema: [],
    outputSchema: [
      { field: 'platform', label: '平台标识', type: 'string' },
      { field: 'name', label: '平台名称', type: 'string' },
      { field: 'itemCount', label: '条目数', type: 'number' },
      { field: 'items', label: '热搜条目', type: 'array' },
      { field: 'fetchedAt', label: '采集时间', type: 'string' },
      { field: 'duration', label: '耗时(ms)', type: 'number' },
    ],
    requirements: [{ type: 'client', label: '需客户端在线' }],
  },
  {
    type: 'hotsearch_ithome',
    name: 'IT之家热门采集',
    category: 'hotsearch',
    iconImage: ithomeIcon,
    color: '#c8102e',
    badge: '热搜',
    description: '通过已登录客户端采集IT之家热门资讯，获取当前科技消费电子领域最受关注的手机、电脑、互联网和智能硬件新闻。IT之家是中文互联网知名的科技消费媒体，内容覆盖数码评测、互联网动态和行业资讯。需客户端在线，自动查找在线设备逐个尝试执行。输出包含文章标题、阅读量、发布时间和详情链接，适用于科技资讯追踪、数码行业动态监控和竞品情报收集。',
    defaultData: { name: 'IT之家热门采集', platform: 'ithome' },
    inputSchema: [],
    outputSchema: [
      { field: 'platform', label: '平台标识', type: 'string' },
      { field: 'name', label: '平台名称', type: 'string' },
      { field: 'itemCount', label: '条目数', type: 'number' },
      { field: 'items', label: '热搜条目', type: 'array' },
      { field: 'fetchedAt', label: '采集时间', type: 'string' },
      { field: 'duration', label: '耗时(ms)', type: 'number' },
    ],
    requirements: [{ type: 'client', label: '需客户端在线' }],
  },
  {
    type: 'hotsearch_google_trends',
    name: 'Google Trends 热搜采集',
    category: 'integration',
    iconImage: googleTrendsIcon,
    color: '#4285F4',
    badge: '热搜',
    description: '通过已登录客户端采集 Google Trends 实时热搜趋势数据，获取全球范围内最热门的搜索关键词、话题热度和地域分布。Google Trends 反映全球用户的搜索兴趣和关注趋势，支持按时间和地区筛选。需客户端在线且可访问外网，自动查找在线设备逐个尝试执行。输出包含关键词、搜索热度指数、相关查询和趋势变化，适用于全球热点追踪、SEO关键词挖掘和市场趋势分析。',
    defaultData: { name: 'Google Trends 热搜采集', platform: 'google_trends' },
    inputSchema: [],
    outputSchema: [
      { field: 'platform', label: '平台标识', type: 'string' },
      { field: 'name', label: '平台名称', type: 'string' },
      { field: 'itemCount', label: '条目数', type: 'number' },
      { field: 'items', label: '热搜条目', type: 'array' },
      { field: 'fetchedAt', label: '采集时间', type: 'string' },
      { field: 'duration', label: '耗时(ms)', type: 'number' },
    ],
    requirements: [{ type: 'client', label: '需客户端在线' }],
  },
  {
    type: 'hotsearch_hackernews',
    name: 'Hacker News 热搜采集',
    category: 'integration',
    iconImage: hackernewsIcon,
    color: '#ff6600',
    badge: '热搜',
    description: '通过已登录客户端采集 Hacker News 实时热门话题，获取全球技术社区最受关注的创业公司、编程语言、开源项目和技术观点。Hacker News 是 Y Combinator 旗下的技术社区，用户群体以程序员和创业者为主。需客户端在线且可访问外网，自动查找在线设备逐个尝试执行。输出包含标题、得分、评论数、发布时间和原文链接，适用于技术趋势追踪、开发者社区洞察和创业资讯获取。',
    defaultData: { name: 'Hacker News 热搜采集', platform: 'hackernews' },
    inputSchema: [],
    outputSchema: [
      { field: 'platform', label: '平台标识', type: 'string' },
      { field: 'name', label: '平台名称', type: 'string' },
      { field: 'itemCount', label: '条目数', type: 'number' },
      { field: 'items', label: '热搜条目', type: 'array' },
      { field: 'fetchedAt', label: '采集时间', type: 'string' },
      { field: 'duration', label: '耗时(ms)', type: 'number' },
    ],
    requirements: [{ type: 'client', label: '需客户端在线' }],
  },
  {
    type: 'hotsearch_github',
    name: 'GitHub 热搜采集',
    category: 'integration',
    iconImage: githubIcon,
    color: '#24292f',
    badge: '热搜',
    description: '通过已登录客户端采集 GitHub 热门仓库与趋势数据，获取当前开源社区最受关注的开源项目、编程语言排行和开发者动态。GitHub Trending 反映全球开发者的技术偏好和项目热度。需客户端在线且可访问外网，自动查找在线设备逐个尝试执行。输出包含仓库名、Star数、Fork数、语言分类和项目描述，适用于开源项目发现、技术选型参考和开发者趋势分析。',
    defaultData: { name: 'GitHub 热搜采集', platform: 'github' },
    inputSchema: [],
    outputSchema: [
      { field: 'platform', label: '平台标识', type: 'string' },
      { field: 'name', label: '平台名称', type: 'string' },
      { field: 'itemCount', label: '条目数', type: 'number' },
      { field: 'items', label: '热搜条目', type: 'array' },
      { field: 'fetchedAt', label: '采集时间', type: 'string' },
      { field: 'duration', label: '耗时(ms)', type: 'number' },
    ],
    requirements: [{ type: 'client', label: '需客户端在线' }],
  },
  {
    type: 'hotsearch_wikipedia',
    name: '维基百科热搜采集',
    category: 'integration',
    iconImage: wikipediaIcon,
    color: '#636466',
    badge: '热搜',
    description: '通过已登录客户端采集维基百科最热阅读条目，获取当前全球用户最关注的百科知识条目和热门话题。维基百科是全球最大的免费百科全书，热门条目反映大众的知识需求和关注焦点。需客户端在线且可访问外网，自动查找在线设备逐个尝试执行。输出包含条目标题、浏览量、语言分类和百科链接，适用于知识热点追踪、百科内容聚合和教育资源发现。',
    defaultData: { name: '维基百科热搜采集', platform: 'wikipedia' },
    inputSchema: [],
    outputSchema: [
      { field: 'platform', label: '平台标识', type: 'string' },
      { field: 'name', label: '平台名称', type: 'string' },
      { field: 'itemCount', label: '条目数', type: 'number' },
      { field: 'items', label: '热搜条目', type: 'array' },
      { field: 'fetchedAt', label: '采集时间', type: 'string' },
      { field: 'duration', label: '耗时(ms)', type: 'number' },
    ],
    requirements: [{ type: 'client', label: '需客户端在线' }],
  },
  {
    type: 'hotsearch_bbc_news',
    name: 'BBC News 热搜采集',
    category: 'integration',
    iconImage: bbcnewsIcon,
    color: '#BB1919',
    badge: '热搜',
    description: '通过已登录客户端采集 BBC News 全球热点新闻，获取英国广播公司报道的国际新闻、科技动态和深度分析。BBC News 是全球最具影响力的公共媒体之一，以客观全面的新闻报道著称。需客户端在线且可访问外网，自动查找在线设备逐个尝试执行。输出包含新闻标题、摘要、发布时间和原文链接，适用于国际新闻追踪、全球舆情监控和多语言内容聚合。',
    defaultData: { name: 'BBC News 热搜采集', platform: 'bbc_news' },
    inputSchema: [],
    outputSchema: [
      { field: 'platform', label: '平台标识', type: 'string' },
      { field: 'name', label: '平台名称', type: 'string' },
      { field: 'itemCount', label: '条目数', type: 'number' },
      { field: 'items', label: '热搜条目', type: 'array' },
      { field: 'fetchedAt', label: '采集时间', type: 'string' },
      { field: 'duration', label: '耗时(ms)', type: 'number' },
    ],
    requirements: [{ type: 'client', label: '需客户端在线' }],
  },
  {
    type: 'hotsearch_cnn',
    name: 'CNN 热搜采集',
    category: 'integration',
    iconImage: cnnIcon,
    color: '#CC0000',
    badge: '热搜',
    description: '通过已登录客户端采集 CNN 全球热点新闻，获取美国有线电视新闻网报道的国际时事、政治动态和科技资讯。CNN 是全球最大的24小时新闻网络之一，以突发新闻报道和深度分析见长。需客户端在线且可访问外网，自动查找在线设备逐个尝试执行。输出包含新闻标题、摘要、发布时间和原文链接，适用于国际时事追踪、突发新闻监控和全球媒体内容聚合。',
    defaultData: { name: 'CNN 热搜采集', platform: 'cnn' },
    inputSchema: [],
    outputSchema: [
      { field: 'platform', label: '平台标识', type: 'string' },
      { field: 'name', label: '平台名称', type: 'string' },
      { field: 'itemCount', label: '条目数', type: 'number' },
      { field: 'items', label: '热搜条目', type: 'array' },
      { field: 'fetchedAt', label: '采集时间', type: 'string' },
      { field: 'duration', label: '耗时(ms)', type: 'number' },
    ],
    requirements: [{ type: 'client', label: '需客户端在线' }],
  },
  {
    type: 'hotsearch_nytimes',
    name: 'New York Times 热搜采集',
    category: 'integration',
    iconImage: nytimesIcon,
    color: '#000000',
    badge: '热搜',
    description: '通过已登录客户端采集 New York Times 热门新闻，获取纽约时报报道的国际时事、科技动态和文化评论。NYT 是美国最具影响力的报纸之一，以深度报道和调查新闻著称。需客户端在线且可访问外网，自动查找在线设备逐个尝试执行。输出包含新闻标题、摘要、发布时间和原文链接，适用于国际新闻追踪、深度报道分析和英文内容聚合。',
    defaultData: { name: 'New York Times 热搜采集', platform: 'nytimes' },
    inputSchema: [],
    outputSchema: [
      { field: 'platform', label: '平台标识', type: 'string' },
      { field: 'name', label: '平台名称', type: 'string' },
      { field: 'itemCount', label: '条目数', type: 'number' },
      { field: 'items', label: '热搜条目', type: 'array' },
      { field: 'fetchedAt', label: '采集时间', type: 'string' },
      { field: 'duration', label: '耗时(ms)', type: 'number' },
    ],
    requirements: [{ type: 'client', label: '需客户端在线' }],
  },
  {
    type: 'hotsearch_aljazeera',
    name: 'Al Jazeera 热搜采集',
    category: 'integration',
    iconImage: aljazeeraIcon,
    color: '#f9c744',
    badge: '热搜',
    description: '通过已登录客户端采集 Al Jazeera 全球热点新闻，获取半岛电视台报道的中东动态、国际时事和深度分析。Al Jazeera 是中东地区最具影响力的国际媒体，以独特的全球南方视角报道国际新闻。需客户端在线且可访问外网，自动查找在线设备逐个尝试执行。输出包含新闻标题、摘要、发布时间和原文链接，适用于中东局势追踪、国际多视角新闻对比和全球舆情分析。',
    defaultData: { name: 'Al Jazeera 热搜采集', platform: 'aljazeera' },
    inputSchema: [],
    outputSchema: [
      { field: 'platform', label: '平台标识', type: 'string' },
      { field: 'name', label: '平台名称', type: 'string' },
      { field: 'itemCount', label: '条目数', type: 'number' },
      { field: 'items', label: '热搜条目', type: 'array' },
      { field: 'fetchedAt', label: '采集时间', type: 'string' },
      { field: 'duration', label: '耗时(ms)', type: 'number' },
    ],
    requirements: [{ type: 'client', label: '需客户端在线' }],
  },
  {
    type: 'hotsearch_devto',
    name: 'Dev.to 热搜采集',
    category: 'integration',
    iconImage: devtoIcon,
    color: '#0A0A0A',
    badge: '热搜',
    description: '通过已登录客户端采集 Dev.to 开发者社区热门文章，获取全球开发者分享的技术教程、编程经验和职业成长内容。Dev.to 是面向开发者的开放社区，内容涵盖Web开发、DevOps、AI等热门技术方向。需客户端在线且可访问外网，自动查找在线设备逐个尝试执行。输出包含文章标题、作者、点赞数、标签和原文链接，适用于技术学习资源发现、开发者趋势追踪和技术博客内容聚合。',
    defaultData: { name: 'Dev.to 热搜采集', platform: 'devto' },
    inputSchema: [],
    outputSchema: [
      { field: 'platform', label: '平台标识', type: 'string' },
      { field: 'name', label: '平台名称', type: 'string' },
      { field: 'itemCount', label: '条目数', type: 'number' },
      { field: 'items', label: '热搜条目', type: 'array' },
      { field: 'fetchedAt', label: '采集时间', type: 'string' },
      { field: 'duration', label: '耗时(ms)', type: 'number' },
    ],
    requirements: [{ type: 'client', label: '需客户端在线' }],
  },
  {
    type: 'hotsearch_ebay_trending',
    name: 'eBay Trending 采集',
    category: 'integration',
    iconImage: ebayTrendingIcon,
    color: '#e53238',
    badge: '热搜',
    description: '通过已登录客户端采集 eBay 热销榜单数据，获取全球知名电商平台当前最热门的商品品类、搜索趋势和消费动向。eBay 是全球最大的C2C和B2C电商平台之一，热销数据反映海外消费者的购物偏好。需客户端在线且可访问外网，自动查找在线设备逐个尝试执行。输出包含商品标题、搜索热度、价格区间和分类链接，适用于跨境电商选品、海外市场趋势分析和竞品销售情报收集。',
    defaultData: { name: 'eBay Trending 采集', platform: 'ebay_trending' },
    inputSchema: [],
    outputSchema: [
      { field: 'platform', label: '平台标识', type: 'string' },
      { field: 'name', label: '平台名称', type: 'string' },
      { field: 'itemCount', label: '条目数', type: 'number' },
      { field: 'items', label: '热搜条目', type: 'array' },
      { field: 'fetchedAt', label: '采集时间', type: 'string' },
      { field: 'duration', label: '耗时(ms)', type: 'number' },
    ],
    requirements: [{ type: 'client', label: '需客户端在线' }],
  },
  {
    type: 'hotsearch_shopify_trending',
    name: 'Shopify Trending 采集',
    category: 'integration',
    iconImage: shopifyIcon,
    color: '#96BF48',
    badge: '热搜',
    description: '通过已登录客户端采集 Shopify 热门独立站商品趋势数据，获取全球独立电商平台上最受欢迎的商品品类、品牌和销售趋势。Shopify 是全球领先的独立站建站平台，承载数百万商家的商品销售数据。需客户端在线且可访问外网，自动查找在线设备逐个尝试执行。输出包含商品标题、销量趋势、价格区间和品类链接，适用于独立站选品决策、电商趋势分析和Dropshipping商品挖掘。',
    defaultData: { name: 'Shopify Trending 采集', platform: 'shopify_trending' },
    inputSchema: [],
    outputSchema: [
      { field: 'platform', label: '平台标识', type: 'string' },
      { field: 'name', label: '平台名称', type: 'string' },
      { field: 'itemCount', label: '条目数', type: 'number' },
      { field: 'items', label: '热搜条目', type: 'array' },
      { field: 'fetchedAt', label: '采集时间', type: 'string' },
      { field: 'duration', label: '耗时(ms)', type: 'number' },
    ],
    requirements: [{ type: 'client', label: '需客户端在线' }],
  },
  {
    type: 'hotsearch_baidu',
    name: '百度热搜采集',
    category: 'integration',
    iconImage: baiduIcon,
    color: '#2932e1',
    badge: '热搜',
    description: '通过已登录客户端采集百度实时热搜榜单，获取当前中文互联网最热门的搜索关键词、新闻事件和话题趋势。百度是中国最大的搜索引擎，其热搜榜反映数亿用户的实时搜索兴趣和社会关注焦点。需客户端在线，自动查找在线设备逐个尝试执行。输出包含热搜标题、搜索指数、相关新闻量和跳转链接，适用于中文舆情监控、热点事件追踪和选题策划。',
    defaultData: { name: '百度热搜采集', platform: 'baidu' },
    inputSchema: [],
    outputSchema: [
      { field: 'platform', label: '平台标识', type: 'string' },
      { field: 'name', label: '平台名称', type: 'string' },
      { field: 'itemCount', label: '条目数', type: 'number' },
      { field: 'items', label: '热搜条目', type: 'array' },
      { field: 'fetchedAt', label: '采集时间', type: 'string' },
      { field: 'duration', label: '耗时(ms)', type: 'number' },
    ],
    requirements: [{ type: 'client', label: '需客户端在线' }],
  },
  {
    type: 'hotsearch_lobsters',
    name: 'Lobsters 热门采集',
    category: 'integration',
    iconImage: lobstersIcon,
    color: '#ac3939',
    badge: '热搜',
    description: '通过已登录客户端采集 Lobsters 技术社区热门文章与链接，获取全球开发者群体中最受关注的技术话题、开源项目和编程讨论。Lobsters 是由技术人员运营的邀请制社区，内容质量高、讨论深入，聚焦编程、计算机科学和系统运维。需客户端在线且可访问外网，自动查找在线设备逐个尝试执行。输出包含文章标题、得分、评论数、标签和原文链接，适用于前沿技术趋势追踪、开发者社区洞察和高质量技术内容聚合。',
    defaultData: { name: 'Lobsters 热门采集', platform: 'lobsters' },
    inputSchema: [],
    outputSchema: [
      { field: 'platform', label: '平台标识', type: 'string' },
      { field: 'name', label: '平台名称', type: 'string' },
      { field: 'itemCount', label: '条目数', type: 'number' },
      { field: 'items', label: '热搜条目', type: 'array' },
      { field: 'fetchedAt', label: '采集时间', type: 'string' },
      { field: 'duration', label: '耗时(ms)', type: 'number' },
    ],
    requirements: [{ type: 'client', label: '需客户端在线' }],
  },
  {
    type: 'hotsearch_tencent_news',
    name: '腾讯新闻热搜采集',
    category: 'integration',
    iconImage: tencentNewsIcon,
    color: '#0052d9',
    badge: '热搜',
    description: '通过已登录客户端采集腾讯新闻实时热搜榜单，获取当前综合资讯门户最受关注的新闻事件、社会话题和搜索关键词。腾讯新闻是中国用户量最大的资讯平台之一，热搜数据基于微信和QQ生态用户行为实时更新。需客户端在线，自动查找在线设备逐个尝试执行。输出包含热搜标题、热度指数、相关新闻量和跳转链接，适用于资讯热点追踪、内容分发策略和舆情监控。',
    defaultData: { name: '腾讯新闻热搜采集', platform: 'tencent_news' },
    inputSchema: [],
    outputSchema: [
      { field: 'platform', label: '平台标识', type: 'string' },
      { field: 'name', label: '平台名称', type: 'string' },
      { field: 'itemCount', label: '条目数', type: 'number' },
      { field: 'items', label: '热搜条目', type: 'array' },
      { field: 'fetchedAt', label: '采集时间', type: 'string' },
      { field: 'duration', label: '耗时(ms)', type: 'number' },
    ],
    requirements: [{ type: 'client', label: '需客户端在线' }],
  },
  {
    type: 'hotsearch_tencent_tech',
    name: '腾讯科技热搜采集',
    category: 'integration',
    iconImage: tencentTechIcon,
    color: '#1e88e5',
    badge: '热搜',
    description: '通过已登录客户端采集腾讯科技频道热门内容，获取当前科技互联网领域最受关注的AI、互联网、数码产品和科技公司动态。腾讯科技是腾讯旗下的垂直科技媒体频道，内容覆盖前沿技术、行业分析和产品评测。需客户端在线，自动查找在线设备逐个尝试执行。输出包含文章标题、阅读量、发布时间和详情链接，适用于科技行业动态追踪、竞品情报收集和技术趋势分析。',
    defaultData: { name: '腾讯科技热搜采集', platform: 'tencent_tech' },
    inputSchema: [],
    outputSchema: [
      { field: 'platform', label: '平台标识', type: 'string' },
      { field: 'name', label: '平台名称', type: 'string' },
      { field: 'itemCount', label: '条目数', type: 'number' },
      { field: 'items', label: '热搜条目', type: 'array' },
      { field: 'fetchedAt', label: '采集时间', type: 'string' },
      { field: 'duration', label: '耗时(ms)', type: 'number' },
    ],
    requirements: [{ type: 'client', label: '需客户端在线' }],
  },
  {
    type: 'message_push_feishu',
    name: '飞书推送',
    category: 'notify',
    icon: 'ep:promotion',
    iconImage: feishuIcon,
    color: '#00d6b9',
    badge: '飞书',
    description: '通过已配置的飞书机器人渠道发送工作流执行结果或自定义消息通知到飞书群聊。支持 Markdown 格式正文和变量插值，可动态引用上游节点的输出数据。需先在「消息推送」模块中配置飞书机器人渠道。典型场景包括：工作流完成通知、数据采集结果推送、异常告警和定时任务报告。',
    platform: 'feishu',
    defaultData: { name: '飞书推送', channelId: null, title: '工作流执行完成', content: '工作流已完成执行。' },
    inputSchema: [
      { field: 'channelId', label: '飞书渠道', type: 'select', required: true, isSensitive: true, placeholder: '选择已配置的飞书渠道', description: '在「消息推送」模块中配置的飞书机器人', options: [] },
      { field: 'title', label: '消息标题', type: 'string', defaultValue: '工作流执行通知', placeholder: '例如：商品渲染任务完成', description: '支持 {{ node_id.variable }} 变量引用' },
      { field: 'content', label: '消息正文', type: 'textarea', defaultValue: '工作流已完成执行。', placeholder: '支持 {{ node_id.variable }} 变量引用', description: '飞书 Markdown 格式' },
    ],
    outputSchema: [
      { field: 'sent', label: '是否发送成功', type: 'boolean' },
      { field: 'channelName', label: '推送渠道名称', type: 'string' },
      { field: 'sentAt', label: '发送时间', type: 'string' },
    ],
  },
  {
    type: 'message_push_wecom',
    name: '企微推送',
    category: 'notify',
    icon: 'ep:chat-dot-round',
    iconImage: wecomIcon,
    color: '#07c160',
    badge: '企微',
    description: '通过已配置的企业微信渠道发送工作流执行结果或自定义消息通知到企微群聊。支持 Markdown 格式正文和变量插值，可动态引用上游节点的输出数据。需先在「消息推送」模块中配置企业微信机器人渠道。典型场景包括：工作流完成通知、业务数据推送、异常告警和团队协作消息同步。',
    platform: 'wecom',
    defaultData: { name: '企微推送', channelId: null, title: '工作流执行完成', content: '工作流已完成执行。' },
    inputSchema: [
      { field: 'channelId', label: '企微渠道', type: 'select', required: true, isSensitive: true, placeholder: '选择已配置的企微渠道', description: '在「消息推送」模块中配置的企业微信', options: [] },
      { field: 'title', label: '消息标题', type: 'string', defaultValue: '工作流执行通知', placeholder: '例如：商品渲染任务完成', description: '支持 {{ node_id.variable }} 变量引用' },
      { field: 'content', label: '消息正文', type: 'textarea', defaultValue: '工作流已完成执行。', placeholder: '支持 {{ node_id.variable }} 变量引用', description: '企微 Markdown 格式' },
    ],
    outputSchema: [
      { field: 'sent', label: '是否发送成功', type: 'boolean' },
      { field: 'channelName', label: '推送渠道名称', type: 'string' },
      { field: 'sentAt', label: '发送时间', type: 'string' },
    ],
  },  // ─── Google Art 高清素材采集 ────────────────────────────
  {
    type: 'google_arts_culture',
    name: 'Google Art 素材采集',
    category: 'material',
    iconImage: googleArtsCultureIcon,
    color: '#4285f4',
    badge: '采集',
    description: '从 Google Arts & Culture 搜索全球博物馆的艺术作品和名画，并按图片瓦片缩放层级下载后批量入库。分辨率档位 idx 从 0 开始，不是固定像素值：数字越大通常像素尺寸越高、下载切片更多、耗时也更长；若设置值高于某件作品返回的最高 idx，系统会自动采用该作品的最高可用档。需客户端在线且可访问外网。输出包含图片 URL、标题、作者和博物馆来源，适用于艺术创作参考、教育内容配图和文化遗产数字化项目。',
    defaultData: {
      name: 'Google Art 素材采集',
      config: { keyword: '', maxCount: 10, zoomLevel: null, timeoutMs: 300000 },
    },
    inputSchema: [
      { field: 'keyword', label: '搜索关键词', type: 'string', required: false, placeholder: '例如: van gogh, impressionism (留空默认精选素材)' },
      { field: 'maxCount', label: '采集数量', type: 'number', defaultValue: 10, description: '每次最多采集数量 (1-50)' },
      { field: 'zoomLevel', label: '分辨率档位', type: 'number', required: true, description: '从 0 开始填写 googleArt_zoom 返回的 zooms[].idx（不是固定像素）。数字越大通常越清晰、切片更多且下载更慢；超过该作品最高 idx 时自动使用最高可用档。' },
    ],
    outputSchema: [
      { field: 'successCount', label: '成功数量', type: 'number' },
      { field: 'failCount', label: '失败数量', type: 'number' },
      { field: 'partialSuccess', label: '是否部分成功', type: 'boolean' },
      { field: 'images', label: '图片列表', type: 'array' },
    ],
    requirements: [
      { type: 'client', label: '需客户端在线' },
      { type: 'internet', label: '需外网' },
    ],
  },
  {
    type: 'pinterest_culture',
    name: 'Pinterest 素材采集',
    category: 'material',
    iconImage: pinterestIcon,
    color: '#e60023',
    badge: '采集',
    description: '从 Pinterest 搜索灵感图片素材，按关键词采集视觉创意、设计灵感和生活美学图片，批量添加到素材库。Pinterest 是全球最大的视觉发现和创意灵感平台，涵盖室内设计、摄影、插画等领域。需客户端在线且可访问外网。输出包含图片URL、标题、作者和来源链接，适用于设计灵感收集、视觉素材库搭建和创意参考整理。',
    defaultData: {
      name: 'Pinterest 素材采集',
      config: { keyword: '', maxCount: 10, scope: 'pins' },
    },
    inputSchema: [
      { field: 'keyword', label: '搜索关键词', type: 'string', required: true, placeholder: '例如: interior design, landscape photography' },
      { field: 'maxCount', label: '采集数量', type: 'number', defaultValue: 10, description: '每次最多采集数量 (1-50)' },
    ],
    outputSchema: [
      { field: 'successCount', label: '成功数量', type: 'number' },
      { field: 'failCount', label: '失败数量', type: 'number' },
      { field: 'images', label: '图片列表', type: 'array' },
    ],
    requirements: [
      { type: 'client', label: '需客户端在线' },
      { type: 'internet', label: '需外网' },
    ],
  },
  {
    type: 'wikimedia_culture',
    name: 'Wikimedia Commons 素材采集',
    category: 'material',
    iconImage: wikimediaIcon,
    color: '#5f7d8c',
    badge: '采集',
    description: '从 Wikimedia Commons 搜索自由版权图片素材，按关键词采集可免费商用和二次创作的图片资源，批量添加到素材库。Wikimedia Commons 是全球最大的自由媒体文件仓库，所有素材均标注清晰版权许可。需客户端在线且可访问外网。输出包含图片URL、标题、作者、版权许可和来源链接，适用于商业设计配图、教育内容制作和开源项目素材获取。',
    defaultData: {
      name: 'Wikimedia Commons 素材采集',
      config: { keyword: '', maxCount: 10, type: 'image' },
    },
    inputSchema: [
      { field: 'keyword', label: '搜索关键词', type: 'string', required: true, placeholder: '例如: hitler, landscape, interior design' },
      { field: 'maxCount', label: '采集数量', type: 'number', defaultValue: 10, description: '每次最多采集数量 (1-50)' },
    ],
    outputSchema: [
      { field: 'successCount', label: '成功数量', type: 'number' },
      { field: 'failCount', label: '失败数量', type: 'number' },
      { field: 'images', label: '图片列表', type: 'array' },
    ],
    requirements: [
      { type: 'client', label: '需客户端在线' },
      { type: 'internet', label: '需外网' },
    ],
  },
  {
    type: 'pexels_search',
    name: 'Pexels 高清摄影采集',
    category: 'material',
    iconImage: pexelsIcon,
    color: '#05a081',
    badge: '采集',
    description: '从 Pexels 检索高清摄影大图与素材，按关键词采集高质量免费可商用摄影图片，批量添加到素材库。Pexels 提供数百万张免费高清摄影图片，无需署名即可商用。需客户端在线且可访问外网。输出包含图片URL、标题、摄影师和尺寸信息，适用于网站配图、商业设计、社交媒体内容制作和博客文章插图。',
    defaultData: {
      name: 'Pexels 高清摄影采集',
      config: { keyword: '', maxCount: 10 },
    },
    inputSchema: [
      { field: 'keyword', label: '搜索关键词', type: 'string', required: true, placeholder: '例如: cat, nature, interior design' },
      { field: 'maxCount', label: '采集数量', type: 'number', defaultValue: 10, description: '每次最多采集数量 (1-50)' },
    ],
    outputSchema: [
      { field: 'successCount', label: '成功数量', type: 'number' },
      { field: 'failCount', label: '失败数量', type: 'number' },
      { field: 'images', label: '图片列表', type: 'array' },
    ],
    requirements: [
      { type: 'client', label: '需客户端在线' },
      { type: 'internet', label: '需外网' },
    ],
  },
  {
    type: 'pixabay_search',
    name: 'Pixabay 采集',
    category: 'material',
    description: '从 Pixabay 免费图库按关键词搜索并同步上传至素材库。Pixabay 提供超过280万张免费可商用的图片、插画和矢量素材，无需署名即可用于商业项目。需客户端在线且可访问外网。输出包含图片URL、标题、标签和授权信息，适用于商业设计配图、网站素材获取和内容创作资源库搭建。',
    iconImage: pixabayIcon,
    color: '#02be6e',
    defaultData: {
      label: 'Pixabay 采集',
      config: { keyword: '', maxCount: 10 },
    },
    inputSchema: [
      { field: 'keyword', label: '搜索关键词', type: 'string', required: true, placeholder: '例如: hi, cat, nature, background' },
      { field: 'maxCount', label: '采集数量', type: 'number', defaultValue: 10, description: '每次最多采集数量 (1-50)' },
    ],
    outputSchema: [
      { field: 'successCount', label: '成功数量', type: 'number' },
      { field: 'failCount', label: '失败数量', type: 'number' },
      { field: 'images', label: '图片列表', type: 'array' },
    ],
    requirements: [
      { type: 'client', label: '需客户端在线' },
      { type: 'internet', label: '需外网' },
    ],
  },
  {
    type: 'rawpixel_search',
    name: 'Rawpixel 采集',
    category: 'material',
    description: '从 Rawpixel 艺术与免版权图库按关键词搜索并同步上传至素材库。Rawpixel 提供高质量的免费艺术图片、矢量插画、PSD模板和精选摄影作品，支持精选/最新/热门排序。需客户端在线且可访问外网。输出包含图片URL、标题、分类和授权信息，适用于设计师素材收集、商业项目配图和创意资源库搭建。',
    iconImage: rawpixelIcon,
    color: '#e65100',
    defaultData: {
      label: 'Rawpixel 采集',
      config: { keyword: '', maxCount: 10, sort: 'curated' },
    },
    inputSchema: [
      { field: 'keyword', label: '搜索关键词', type: 'string', required: true, placeholder: '例如: cat, pattern, vintage, art' },
      { field: 'maxCount', label: '采集数量', type: 'number', defaultValue: 10, description: '每次最多采集数量 (1-50)' },
      { field: 'sort', label: '排序模式', type: 'select', defaultValue: 'curated', options: [{ label: '精选推荐', value: 'curated' }, { label: '最新上线', value: 'latest' }, { label: '热门高赞', value: 'popular' }] },
    ],
    outputSchema: [
      { field: 'successCount', label: '成功数量', type: 'number' },
      { field: 'failCount', label: '失败数量', type: 'number' },
      { field: 'images', label: '图片列表', type: 'array' },
    ],
    requirements: [
      { type: 'client', label: '需客户端在线' },
      { type: 'internet', label: '需外网' },
    ],
  },
  {
    type: 'douyin_jingxuan_search',
    name: '抖音精选采集',
    category: 'hotsearch',
    description: '通过客户端浏览器自动化采集抖音精选首页推荐视频内容。支持分类筛选（全部、游戏、二次元、音乐、影视、美食等 18 个分类），提取视频标题、封面、时长、播放量、作者、标签等信息。需客户端在线且可访问抖音。',
    iconImage: douyinJingxuanIcon,
    color: '#fe2c55',
    badge: '浏览器',
    defaultData: {
      label: '抖音精选采集',
      config: { category: '全部', maxCount: 20 },
    },
    inputSchema: [
      {
        field: 'category',
        label: '视频分类',
        type: 'select',
        defaultValue: '全部',
        description: '选择要采集的抖音精选分类',
        options: [
          { label: '全部', value: '全部' },
          { label: '公开课', value: '公开课' },
          { label: '游戏', value: '游戏' },
          { label: '二次元', value: '二次元' },
          { label: '音乐', value: '音乐' },
          { label: '影视', value: '影视' },
          { label: '美食', value: '美食' },
          { label: '知识', value: '知识' },
          { label: '小剧场', value: '小剧场' },
          { label: '生活vlog', value: '生活vlog' },
          { label: '体育', value: '体育' },
          { label: '旅行', value: '旅行' },
          { label: '亲子', value: '亲子' },
          { label: '动物', value: '动物' },
          { label: '三农', value: '三农' },
          { label: '汽车', value: '汽车' },
          { label: '美妆', value: '美妆' },
          { label: '穿搭', value: '穿搭' },
        ],
      },
      { field: 'maxCount', label: '采集数量', type: 'number', defaultValue: 20, description: '每次最多采集数量 (1-100)' },
    ],
    outputSchema: [
      { field: 'success', label: '是否成功', type: 'boolean' },
      { field: 'count', label: '采集数量', type: 'number' },
      { field: 'total', label: '总数', type: 'number' },
      { field: 'items', label: '视频列表', type: 'array' },
      { field: 'category', label: '分类', type: 'string' },
    ],
    requirements: [
      { type: 'client_browser', label: '需客户端浏览器' },
      { type: 'internet', label: '需外网' },
    ],
  },
  {
    type: 'stocksnap_search',
    name: 'StockSnap 采集',
    category: 'material',
    description: '从 StockSnap CC0 免版权高清图库按关键词搜索并同步上传至素材库。StockSnap 提供大量 CC0 许可的高清摄影图片，每日更新，可免费用于任何商业和个人项目。支持最新发布和热门浏览排序。需客户端在线且可访问外网。输出包含图片URL、标题、作者和授权信息，适用于商业网站配图、产品设计和博客文章插图。',
    iconImage: stocksnapIcon,
    color: '#E91E63',
    defaultData: {
      label: 'StockSnap 采集',
      config: { keyword: '', maxCount: 10, sort: 'date' },
    },
    inputSchema: [
      { field: 'keyword', label: '搜索关键词', type: 'string', required: true, placeholder: '例如: cat, vintage, nature' },
      { field: 'maxCount', label: '采集数量', type: 'number', defaultValue: 10, description: '每次最多采集数量 (1-50)' },
      { field: 'sort', label: '排序模式', type: 'select', defaultValue: 'date', options: [{ label: '最新发布', value: 'date' }, { label: '热门浏览', value: 'popular' }] },
    ],
    outputSchema: [
      { field: 'successCount', label: '成功数量', type: 'number' },
      { field: 'failCount', label: '失败数量', type: 'number' },
      { field: 'images', label: '图片列表', type: 'array' },
    ],
    requirements: [
      { type: 'client', label: '需客户端在线' },
      { type: 'internet', label: '需外网' },
    ],
  },
  {
    type: 'openverse_search',
    name: 'Openverse 采集',
    category: 'material',
    description: '从 Openverse 6 亿+ CC/CC0 共享图库按关键词搜索并同步上传至素材库。Openverse 是 WordPress 旗下的开放媒体搜索引擎，聚合来自全球数十个平台的免费图片和音频素材，所有素材均标注清晰的版权许可。需客户端在线且可访问外网。输出包含图片URL、标题、作者、版权许可和来源平台，适用于大规模素材采集、商业项目配图和开放资源研究。',
    iconImage: openverseIcon,
    color: '#B23A22',
    defaultData: {
      label: 'Openverse 采集',
      config: { keyword: '', maxCount: 10 },
    },
    inputSchema: [
      { field: 'keyword', label: '搜索关键词', type: 'string', required: true, placeholder: '例如: cat, vintage, nature' },
      { field: 'maxCount', label: '采集数量', type: 'number', defaultValue: 10, description: '每次最多采集数量 (1-50)' },
    ],
    outputSchema: [
      { field: 'successCount', label: '成功数量', type: 'number' },
      { field: 'failCount', label: '失败数量', type: 'number' },
      { field: 'images', label: '图片列表', type: 'array' },
    ],
    requirements: [
      { type: 'client', label: '需客户端在线' },
      { type: 'internet', label: '需外网' },
    ],
  },
  {
    type: 'openclipart_search',
    name: 'Openclipart 矢量采集',
    category: 'material',
    description: '从 Openclipart 100% CC0 免费矢量插画图库按关键词搜索并同步上传至素材库。Openclipart 提供超过10万张完全免费的矢量插画素材，支持 PNG 和 SVG 两种格式，可自由修改和商用。需客户端在线且可访问外网。输出包含图片URL、标题、作者和格式信息，适用于商业插画素材收集、图标设计和可缩放矢量图形项目。',
    iconImage: openclipartIcon,
    color: '#D35400',
    defaultData: {
      label: 'Openclipart 矢量采集',
      config: { keyword: '', maxCount: 10, formatPreference: 'png' },
    },
    inputSchema: [
      { field: 'keyword', label: '搜索关键词', type: 'string', required: true, placeholder: '例如: cat, robot, flower, banner' },
      { field: 'maxCount', label: '采集数量', type: 'number', defaultValue: 10, description: '每次最多采集数量 (1-50)' },
      { field: 'formatPreference', label: '格式偏好', type: 'select', defaultValue: 'png', options: [{ label: '超清位图 (PNG)', value: 'png' }, { label: '矢量原图 (SVG)', value: 'svg' }] },
    ],
    outputSchema: [
      { field: 'successCount', label: '成功数量', type: 'number' },
      { field: 'failCount', label: '失败数量', type: 'number' },
      { field: 'images', label: '图片列表', type: 'array' },
    ],
    requirements: [
      { type: 'client', label: '需客户端在线' },
      { type: 'internet', label: '需外网' },
    ],
  },
  {
    type: 'undraw_search',
    name: 'undraw 开源插画采集',
    category: 'material',
    description: '从 undraw 开源插画图库按关键词搜索，支持自定义主题色，同步上传至素材库。undraw 提供大量风格统一的免费开源插画，可在线自定义插画主色调以匹配品牌风格，无需署名即可商用。需客户端在线且可访问外网。输出包含图片URL、标题、主题色和标签信息，适用于网站Hero图、App界面插图和品牌视觉素材获取。',
    iconImage: undrawIcon,
    color: '#6C63FF',
    defaultData: {
      label: 'undraw 插画采集',
      config: { keyword: '', maxCount: 10, color: '#6C63FF' },
    },
    inputSchema: [
      { field: 'keyword', label: '搜索关键词', type: 'string', required: true, placeholder: '例如: cat, robot, flower, banner' },
      { field: 'maxCount', label: '采集数量', type: 'number', defaultValue: 10, description: '每次最多采集数量 (1-50)' },
      { field: 'color', label: '主题色', type: 'select', defaultValue: '#6C63FF', options: [{ label: '经典紫 (#6C63FF)', value: '#6C63FF' }, { label: '热情红 (#E74C3C)', value: '#E74C3C' }, { label: '海洋蓝 (#3498DB)', value: '#3498DB' }, { label: '自然绿 (#2ECC71)', value: '#2ECC71' }, { label: '暖橙 (#F39C12)', value: '#F39C12' }, { label: '深色 (#2C3E50)', value: '#2C3E50' }] },
    ],
    outputSchema: [
      { field: 'successCount', label: '成功数量', type: 'number' },
      { field: 'failCount', label: '失败数量', type: 'number' },
      { field: 'images', label: '图片列表', type: 'array' },
    ],
    requirements: [
      { type: 'client', label: '需客户端在线' },
      { type: 'internet', label: '需外网' },
    ],
  },
  {
    type: 'iconify_search',
    name: 'Iconify 图标采集',
    category: 'material',
    description: '从 Iconify 200,000+ 开源图标库按关键词搜索并同步上传至素材库。Iconify 是全球最大的统一图标框架，聚合了 Material Design、Font Awesome、Heroicons、Feather 等100+图标集，支持自定义颜色。需客户端在线且可访问外网。输出包含图标URL、名称、图标集和风格信息，适用于UI设计、前端开发和品牌图标素材库搭建。',
    iconImage: iconifyIcon,
    color: '#6C63FF',
    defaultData: { label: 'Iconify 图标采集', config: { keyword: '', maxCount: 10, prefix: '', color: '#000000' } },
    inputSchema: [
      { field: 'keyword', label: '搜索关键词', type: 'string', required: true, placeholder: '例如: cat, heart, home, user' },
      { field: 'maxCount', label: '采集数量', type: 'number', defaultValue: 10, description: '每次最多采集数量 (1-50)' },
      { field: 'prefix', label: '图标集', type: 'select', defaultValue: '', options: [{ label: '全部图标集', value: '' }, { label: 'Material Design (mdi)', value: 'mdi' }, { label: 'Font Awesome (fa)', value: 'fa' }, { label: 'Heroicons', value: 'heroicons' }, { label: 'Feather', value: 'feather' }, { label: 'Lucide', value: 'lucide' }, { label: 'Tabler', value: 'tabler' }] },
      { field: 'color', label: '图标颜色', type: 'select', defaultValue: '#000000', options: [{ label: '黑色 (#000000)', value: '#000000' }, { label: '白色 (#FFFFFF)', value: '#FFFFFF' }, { label: '紫色 (#6C63FF)', value: '#6C63FF' }, { label: '红色 (#E74C3C)', value: '#E74C3C' }, { label: '蓝色 (#3498DB)', value: '#3498DB' }, { label: '绿色 (#2ECC71)', value: '#2ECC71' }] },
    ],
    outputSchema: [
      { field: 'successCount', label: '成功数量', type: 'number' },
      { field: 'failCount', label: '失败数量', type: 'number' },
      { field: 'images', label: '图片列表', type: 'array' },
    ],
    requirements: [
      { type: 'client', label: '需客户端在线' },
      { type: 'internet', label: '需外网' },
    ],
  },
  {
    type: 'nounproject_search',
    name: 'Noun Project 采集',
    category: 'material',
    description: '从 The Noun Project 搜索开源图标或摄影图片并同步上传至素材库。Noun Project 是全球最大的图标和摄影素材库，提供数百万个由全球设计师创作的图标和高质量摄影图片，支持图标和摄影两种素材类型。需客户端在线且可访问外网。输出包含素材URL、标题、作者和授权信息，适用于UI图标设计、品牌视觉素材收集和创意摄影参考。',
    iconImage: nounprojectIcon,
    color: '#1A1A1A',
    defaultData: { label: 'Noun Project 采集', config: { keyword: '', maxCount: 10, mediaType: 'icons' } },
    inputSchema: [
      { field: 'keyword', label: '搜索关键词', type: 'string', required: true, placeholder: '例如: cat, nature, business, technology' },
      { field: 'maxCount', label: '采集数量', type: 'number', defaultValue: 10, description: '每次最多采集数量 (1-50)' },
      { field: 'mediaType', label: '素材类型', type: 'select', defaultValue: 'icons', options: [{ label: '矢量图标 (Icons)', value: 'icons' }, { label: '摄影图片 (Photos)', value: 'photos' }] },
    ],
    outputSchema: [
      { field: 'successCount', label: '成功数量', type: 'number' },
      { field: 'failCount', label: '失败数量', type: 'number' },
      { field: 'images', label: '图片列表', type: 'array' },
    ],
    requirements: [
      { type: 'client', label: '需客户端在线' },
      { type: 'internet', label: '需外网' },
    ],
  },
  {
    type: 'vecteezy_search',
    name: 'Vecteezy 素材采集',
    category: 'material',
    description: '从 Vecteezy 检索免版税摄影图片、透明 PNG 或矢量素材并同步上传至素材库。Vecteezy 是全球知名的矢量素材平台，提供数百万张摄影图片、透明背景PNG和矢量插画，支持多种素材类型筛选。需客户端在线且可访问外网。输出包含素材URL、标题、类型和授权信息，适用于平面设计、网页制作和商业项目素材获取。',
    iconImage: vecteezyIcon,
    color: '#FF6D00',
    defaultData: { label: 'Vecteezy 采集', config: { keyword: '', maxCount: 10, mediaType: 'photos' } },
    inputSchema: [
      { field: 'keyword', label: '搜索关键词', type: 'string', required: true, placeholder: '例如: cat, nature, business, technology' },
      { field: 'maxCount', label: '采集数量', type: 'number', defaultValue: 10, description: '每次最多采集数量 (1-50)' },
      { field: 'mediaType', label: '素材类型', type: 'select', defaultValue: 'photos', options: [{ label: '摄影图片 (Photos)', value: 'photos' }, { label: '透明 PNG (PNG)', value: 'png' }, { label: '矢量插画 (Vector)', value: 'vector' }, { label: '矢量 SVG (Free SVG)', value: 'svg' }] },
    ],
    outputSchema: [
      { field: 'successCount', label: '成功数量', type: 'number' },
      { field: 'failCount', label: '失败数量', type: 'number' },
      { field: 'images', label: '图片列表', type: 'array' },
    ],
    requirements: [
      { type: 'client', label: '需客户端在线' },
      { type: 'internet', label: '需外网' },
    ],
  },
  {
    type: 'openmoji_search',
    name: 'OpenMoji Emoji 采集',
    category: 'material',
    description: '从 OpenMoji 开源项目检索 4500+ 高清 Emoji 矢量/彩色/黑白素材并同步上传至素材库。OpenMoji 是开源的 Emoji 设计系统，提供统一风格的彩色和黑白 SVG 格式 Emoji，可自由修改和商用。需客户端在线且可访问外网。输出包含 Emoji URL、名称、关键词和颜色模式，适用于聊天应用、UI设计和品牌表情包素材获取。',
    iconImage: openmojiIcon,
    color: '#000000',
    defaultData: { label: 'OpenMoji 采集', config: { keyword: '', maxCount: 10, colorMode: 'color' } },
    inputSchema: [
      { field: 'keyword', label: '搜索关键词', type: 'string', required: true, placeholder: '例如: cat, heart, smile, star' },
      { field: 'maxCount', label: '采集数量', type: 'number', defaultValue: 10, description: '每次最多采集数量 (1-50)' },
      { field: 'colorMode', label: '颜色模式', type: 'select', defaultValue: 'color', options: [{ label: '彩色矢量 (Color SVG)', value: 'color' }, { label: '黑白线条 (Black SVG)', value: 'black' }] },
    ],
    outputSchema: [
      { field: 'successCount', label: '成功数量', type: 'number' },
      { field: 'failCount', label: '失败数量', type: 'number' },
      { field: 'images', label: '图片列表', type: 'array' },
    ],
    requirements: [
      { type: 'client', label: '需客户端在线' },
      { type: 'internet', label: '需外网' },
    ],
  },
  {
    type: 'googleicons_search',
    name: 'Google Material Icons / Symbols 采集',
    category: 'material',
    description: '从 Google 官方检索 2500+ 矢量图标并同步上传至素材库。支持 Material Symbols (新版 M3) 与 Material Icons (经典版 M2) 的全量风格。需客户端在线且可访问外网。',
    iconImage: googleIconsIcon,
    color: '#4285F4',
    defaultData: { label: 'Google Icons / Symbols 采集', config: { keyword: '', style: 'symbols_outlined', maxCount: 10 } },
    inputSchema: [
      { field: 'keyword', label: '搜索关键词', type: 'string', required: true, placeholder: '例如: home, search, settings, person, favorite' },
      {
        field: 'style',
        label: '图标风格与体系',
        type: 'select',
        defaultValue: 'symbols_outlined',
        options: [
          { label: 'Symbols · 线性轮廓 (Outlined)', value: 'symbols_outlined' },
          { label: 'Symbols · 实心填充 (Filled)', value: 'symbols_filled' },
          { label: 'Symbols · 圆角平滑 (Rounded)', value: 'symbols_rounded' },
          { label: 'Symbols · 圆角填充 (Rounded Filled)', value: 'symbols_rounded_fill' },
          { label: 'Symbols · 直角尖锐 (Sharp)', value: 'symbols_sharp' },
          { label: 'Symbols · 直角填充 (Sharp Filled)', value: 'symbols_sharp_fill' },
          { label: 'Icons · 经典实心 (Classic Filled)', value: 'icons_filled' },
          { label: 'Icons · 经典轮廓 (Classic Outlined)', value: 'icons_outlined' },
          { label: 'Icons · 经典圆角 (Classic Round)', value: 'icons_rounded' },
          { label: 'Icons · 经典直角 (Classic Sharp)', value: 'icons_sharp' },
          { label: 'Icons · 经典双色 (Classic Two-Tone)', value: 'icons_two_tone' },
        ],
      },
      { field: 'maxCount', label: '采集数量', type: 'number', defaultValue: 10, description: '每次最多采集数量 (1-50)' },
    ],
    outputSchema: [
      { field: 'successCount', label: '成功数量', type: 'number' },
      { field: 'failCount', label: '失败数量', type: 'number' },
      { field: 'images', label: '图片列表', type: 'array' },
    ],
    requirements: [
      { type: 'client', label: '需客户端在线' },
      { type: 'internet', label: '需外网' },
    ],
  },
  {
    type: 'emojipedia_search',
    name: 'Emojipedia 贴纸采集 (Emojipedia Stickers)',
    category: 'material',
    description: '【功能】根据关键词从 Emojipedia 检索全量 Apple 原生 3D 高清 Emoji 贴纸大图并自动上传入库至素材库。【用法】配置 keyword 搜索词（如 "cat"、"fire"、"rocket"），无需配置数量，单次全自动采集入库全量匹配的图片贴纸。【场景与输出】需客户端在线且可访问外网。输出全部采集到的图片列表 images 及统计。',
    iconImage: emojipediaIcon,
    color: '#FF8C00',
    defaultData: { label: 'Emojipedia 贴纸采集', config: { keyword: '' } },
    inputSchema: [
      { field: 'keyword', label: '搜索关键词', type: 'string', required: true, placeholder: '例如: cat, fire, laugh, rocket' },
    ],
    outputSchema: [
      { field: 'successCount', label: '成功数量', type: 'number' },
      { field: 'failCount', label: '失败数量', type: 'number' },
      { field: 'images', label: '图片列表', type: 'array' },
    ],
    requirements: [
      { type: 'client', label: '需客户端在线' },
      { type: 'internet', label: '需外网' },
    ],
  },
  {
    type: 'hackernews_search',
    name: 'Hacker News 热帖',
    category: 'news_data',
    description: '从 Hacker News 搜索并获取热门技术文章、讨论和创业动态。Hacker News 是 Y Combinator 旗下的技术社区，用户群体以程序员和创业者为主，内容涵盖编程语言、开源项目和创业资讯。需客户端在线且可访问外网。输出包含标题、得分、评论数、发布时间和原文链接，适用于技术趋势追踪、开发者社区洞察和创业资讯获取。',
    iconImage: hackernewsIcon,
    color: '#FF6600',
    defaultData: { label: 'Hacker News 热帖', config: { keyword: '', maxCount: 10 } },
    inputSchema: [
      { field: 'keyword', label: '搜索关键词', type: 'string', required: true, placeholder: '例如: AI, startup, programming' },
      { field: 'maxCount', label: '采集数量', type: 'number', defaultValue: 10, description: '每次最多采集数量 (1-100)' },
    ],
    outputSchema: [
      { field: 'successCount', label: '成功数量', type: 'number' },
      { field: 'failCount', label: '失败数量', type: 'number' },
      { field: 'items', label: '数据列表', type: 'array' },
    ],
    requirements: [
      { type: 'client', label: '需客户端在线' },
      { type: 'internet', label: '需外网' },
    ],
  },
  {
    type: 'arxiv_search',
    name: 'arXiv 学术论文',
    category: 'news_data',
    description: '从 arXiv 搜索 AI/ML/CS 等前沿科研论文，获取最新发表的学术论文标题、作者、摘要和PDF链接。arXiv 是全球最大的开放获取学术论文预印本平台，覆盖物理、数学、计算机科学、人工智能等领域。需客户端在线且可访问外网。输出包含论文标题、作者、摘要、分类和PDF链接，适用于学术研究追踪、文献综述和前沿技术调研。',
    iconImage: arxivIcon,
    color: '#B31B1B',
    defaultData: { label: 'arXiv 学术论文', config: { keyword: '', maxCount: 10 } },
    inputSchema: [
      { field: 'keyword', label: '搜索关键词', type: 'string', required: true, placeholder: '例如: transformer, LLM, diffusion model' },
      { field: 'maxCount', label: '采集数量', type: 'number', defaultValue: 10, description: '每次最多采集数量 (1-100)' },
    ],
    outputSchema: [
      { field: 'successCount', label: '成功数量', type: 'number' },
      { field: 'failCount', label: '失败数量', type: 'number' },
      { field: 'items', label: '数据列表', type: 'array' },
    ],
    requirements: [
      { type: 'client', label: '需客户端在线' },
      { type: 'internet', label: '需外网' },
    ],
  },
  {
    type: 'github_search',
    name: 'GitHub 趋势仓库',
    category: 'news_data',
    description: '搜索 GitHub 热门开源项目、开发趋势和代码仓库，获取仓库名、Star数、Fork数、语言和项目描述。GitHub 是全球最大的代码托管和开源协作平台，汇聚数百万开发者和开源项目。需客户端在线且可访问外网。输出包含仓库名、描述、Star数、Fork数、语言和更新时间，适用于开源项目发现、技术选型参考和开发者趋势分析。',
    iconImage: githubIcon,
    color: '#333333',
    defaultData: { label: 'GitHub 趋势仓库', config: { keyword: '', maxCount: 10 } },
    inputSchema: [
      { field: 'keyword', label: '搜索关键词', type: 'string', required: true, placeholder: '例如: llm, chatgpt, stable-diffusion' },
      { field: 'maxCount', label: '采集数量', type: 'number', defaultValue: 10, description: '每次最多采集数量 (1-100)' },
    ],
    outputSchema: [
      { field: 'successCount', label: '成功数量', type: 'number' },
      { field: 'failCount', label: '失败数量', type: 'number' },
      { field: 'items', label: '数据列表', type: 'array' },
    ],
    requirements: [
      { type: 'client', label: '需客户端在线' },
      { type: 'internet', label: '需外网' },
    ],
  },
  {
    type: 'gdelt_search',
    name: 'GDELT 全球事件',
    category: 'news_data',
    description: '从 GDELT 获取全球新闻事件监测、舆情分析和地理编码数据。GDELT 是全球最大规模的开放事件数据库，实时监测全球100多种语言的新闻媒体，提供事件编码、情感分析和地理定位。需客户端在线且可访问外网。输出包含事件标题、时间、地点、情感分数和来源链接，适用于全球舆情监控、国际关系研究和新闻事件分析。',
    iconImage: gdeltIcon,
    color: '#1A73E8',
    defaultData: { label: 'GDELT 全球事件', config: { keyword: '', maxCount: 10 } },
    inputSchema: [
      { field: 'keyword', label: '搜索关键词', type: 'string', required: true, placeholder: '例如: election, protest, climate' },
      { field: 'maxCount', label: '采集数量', type: 'number', defaultValue: 10, description: '每次最多采集数量 (1-100)' },
    ],
    outputSchema: [
      { field: 'successCount', label: '成功数量', type: 'number' },
      { field: 'failCount', label: '失败数量', type: 'number' },
      { field: 'items', label: '数据列表', type: 'array' },
    ],
    requirements: [
      { type: 'client', label: '需客户端在线' },
      { type: 'internet', label: '需外网' },
    ],
  },
  {
    type: 'googlenews_search',
    name: 'Google News',
    category: 'news_data',
    description: '从 Google News 进行综合新闻聚合搜索，支持多语言和地区，获取全球最新新闻报道和媒体资讯。Google News 聚合了全球数万家新闻源，提供多语言、多地区的新闻搜索和分类浏览。需客户端在线且可访问外网。输出包含新闻标题、来源、发布时间、摘要和原文链接，适用于综合新闻追踪、多语言媒体监控和全球资讯聚合。',
    iconImage: googlenewsIcon,
    color: '#4285F4',
    defaultData: { label: 'Google News', config: { keyword: '', maxCount: 10 } },
    inputSchema: [
      { field: 'keyword', label: '搜索关键词', type: 'string', required: true, placeholder: '例如: AI, technology, business' },
      { field: 'maxCount', label: '采集数量', type: 'number', defaultValue: 10, description: '每次最多采集数量 (1-100)' },
    ],
    outputSchema: [
      { field: 'successCount', label: '成功数量', type: 'number' },
      { field: 'failCount', label: '失败数量', type: 'number' },
      { field: 'items', label: '数据列表', type: 'array' },
    ],
    requirements: [
      { type: 'client', label: '需客户端在线' },
      { type: 'internet', label: '需外网' },
    ],
  },
  {
    type: 'reddit_search',
    name: 'Reddit 社区热帖',
    category: 'news_data',
    description: '从 Reddit 社区搜索并获取热门讨论、行业热点和用户观点。Reddit 是全球最大的在线社区论坛，拥有数万个主题板块（subreddit），覆盖科技、商业、娱乐等各领域。需客户端在线且可访问外网。输出包含帖子标题、作者、点赞数、评论数、发布时间和原文链接，适用于社区舆情分析、用户观点挖掘和行业热点追踪。',
    iconImage: redditIcon,
    color: '#FF4500',
    defaultData: { label: 'Reddit 社区热帖', config: { keyword: '', maxCount: 10 } },
    inputSchema: [
      { field: 'keyword', label: '搜索关键词', type: 'string', required: true, placeholder: '例如: MachineLearning, technology' },
      { field: 'maxCount', label: '采集数量', type: 'number', defaultValue: 10, description: '每次最多采集数量 (1-100)' },
    ],
    outputSchema: [
      { field: 'successCount', label: '成功数量', type: 'number' },
      { field: 'failCount', label: '失败数量', type: 'number' },
      { field: 'items', label: '数据列表', type: 'array' },
    ],
    requirements: [
      { type: 'client', label: '需客户端在线' },
      { type: 'internet', label: '需外网' },
    ],
  },
  {
    type: 'producthunt_search',
    name: 'Product Hunt',
    category: 'news_data',
    description: '从 Product Hunt 发现最新 AI 产品、软件工具和创业项目，获取产品名、标语、点赞数和发布时间。Product Hunt 是科技圈知名的产品发布平台，每天展示最新的科技产品和创业公司。需客户端在线且可访问外网。输出包含产品名、标语、描述、点赞数、评论数和原文链接，适用于竞品发现、产品趋势分析和创业灵感获取。',
    iconImage: producthuntIcon,
    color: '#DA552F',
    defaultData: { label: 'Product Hunt', config: { keyword: '', maxCount: 10 } },
    inputSchema: [
      { field: 'keyword', label: '搜索关键词', type: 'string', required: true, placeholder: '例如: AI, productivity, developer tools' },
      { field: 'maxCount', label: '采集数量', type: 'number', defaultValue: 10, description: '每次最多采集数量 (1-100)' },
    ],
    outputSchema: [
      { field: 'successCount', label: '成功数量', type: 'number' },
      { field: 'failCount', label: '失败数量', type: 'number' },
      { field: 'items', label: '数据列表', type: 'array' },
    ],
    requirements: [
      { type: 'client', label: '需客户端在线' },
      { type: 'internet', label: '需外网' },
    ],
  },
  {
    type: 'theguardian_search',
    name: 'The Guardian',
    category: 'news_data',
    description: '从 The Guardian 获取卫报深度报道、国际新闻和科技资讯。The Guardian 是英国知名的国际性报纸，以深度调查报道和开放新闻理念著称，提供高质量的新闻内容API。需客户端在线且可访问外网。输出包含新闻标题、摘要、栏目、发布时间和原文链接，适用于国际新闻追踪、深度报道分析和英文内容聚合。',
    iconImage: theguardianIcon,
    color: '#052962',
    defaultData: { label: 'The Guardian', config: { keyword: '', maxCount: 10 } },
    inputSchema: [
      { field: 'keyword', label: '搜索关键词', type: 'string', required: true, placeholder: '例如: AI, climate, technology' },
      { field: 'maxCount', label: '采集数量', type: 'number', defaultValue: 10, description: '每次最多采集数量 (1-100)' },
    ],
    outputSchema: [
      { field: 'successCount', label: '成功数量', type: 'number' },
      { field: 'failCount', label: '失败数量', type: 'number' },
      { field: 'items', label: '数据列表', type: 'array' },
    ],
    requirements: [
      { type: 'client', label: '需客户端在线' },
      { type: 'internet', label: '需外网' },
    ],
  },
  {
    type: 'bbcnews_search',
    name: 'BBC News',
    category: 'news_data',
    description: '从 BBC News 获取国际新闻、科技和健康资讯，搜索全球最具影响力的公共媒体之一报道的最新新闻。BBC News 以客观全面的新闻报道著称，覆盖国际时事、科学技术、健康医疗等领域。需客户端在线且可访问外网。输出包含新闻标题、摘要、分类、发布时间和原文链接，适用于国际新闻追踪、科技资讯获取和英文内容聚合。',
    iconImage: bbcnewsIcon,
    color: '#BB1919',
    defaultData: { label: 'BBC News', config: { keyword: '', maxCount: 10 } },
    inputSchema: [
      { field: 'keyword', label: '搜索关键词', type: 'string', required: true, placeholder: '例如: technology, science, AI' },
      { field: 'maxCount', label: '采集数量', type: 'number', defaultValue: 10, description: '每次最多采集数量 (1-100)' },
    ],
    outputSchema: [
      { field: 'successCount', label: '成功数量', type: 'number' },
      { field: 'failCount', label: '失败数量', type: 'number' },
      { field: 'items', label: '数据列表', type: 'array' },
    ],
    requirements: [
      { type: 'client', label: '需客户端在线' },
      { type: 'internet', label: '需外网' },
    ],
  },
  {
    type: 'npr_search',
    name: 'NPR 新闻',
    category: 'news_data',
    description: '从 NPR 获取美国国家公共广播电台新闻、科技和文化报道。NPR 是美国知名的非营利媒体组织，以深度新闻报道和文化节目著称，内容涵盖政治、科技、艺术等领域。需客户端在线且可访问外网。输出包含新闻标题、摘要、栏目、音频链接和发布时间，适用于美国新闻追踪、文化内容获取和英文听力素材收集。',
    iconImage: nprIcon,
    color: '#000000',
    defaultData: { label: 'NPR 新闻', config: { keyword: '', maxCount: 10 } },
    inputSchema: [
      { field: 'keyword', label: '搜索关键词', type: 'string', required: true, placeholder: '例如: technology, science, AI' },
      { field: 'maxCount', label: '采集数量', type: 'number', defaultValue: 10, description: '每次最多采集数量 (1-100)' },
    ],
    outputSchema: [
      { field: 'successCount', label: '成功数量', type: 'number' },
      { field: 'failCount', label: '失败数量', type: 'number' },
      { field: 'items', label: '数据列表', type: 'array' },
    ],
    requirements: [
      { type: 'client', label: '需客户端在线' },
      { type: 'internet', label: '需外网' },
    ],
  },
  {
    type: 'techcrunch_search',
    name: 'TechCrunch',
    category: 'news_data',
    description: '从 TechCrunch 获取科技创业、AI 公司和投资新闻，搜索全球知名的科技创投媒体最新报道。TechCrunch 专注于科技创业、风险投资和创新公司报道，是科技行业最具影响力的媒体之一。需客户端在线且可访问外网。输出包含新闻标题、作者、分类、发布时间和原文链接，适用于创投趋势追踪、创业公司动态监控和科技行业情报收集。',
    iconImage: techcrunchIcon,
    color: '#0A9E01',
    defaultData: { label: 'TechCrunch', config: { keyword: '', maxCount: 10 } },
    inputSchema: [
      { field: 'keyword', label: '搜索关键词', type: 'string', required: true, placeholder: '例如: AI, startup, funding' },
      { field: 'maxCount', label: '采集数量', type: 'number', defaultValue: 10, description: '每次最多采集数量 (1-100)' },
    ],
    outputSchema: [
      { field: 'successCount', label: '成功数量', type: 'number' },
      { field: 'failCount', label: '失败数量', type: 'number' },
      { field: 'items', label: '数据列表', type: 'array' },
    ],
    requirements: [
      { type: 'client', label: '需客户端在线' },
      { type: 'internet', label: '需外网' },
    ],
  },
  {
    type: 'theverge_search',
    name: 'The Verge',
    category: 'news_data',
    description: '从 The Verge 获取科技评测、AI 和消费电子资讯，搜索知名科技媒体最新报道。The Verge 是 Vox Media 旗下的科技媒体，以消费电子评测、互联网文化和AI报道见长。需客户端在线且可访问外网。输出包含新闻标题、作者、分类、发布时间和原文链接，适用于消费电子追踪、科技产品评测参考和互联网文化动态监控。',
    iconImage: thevergeIcon,
    color: '#E2127A',
    defaultData: { label: 'The Verge', config: { keyword: '', maxCount: 10 } },
    inputSchema: [
      { field: 'keyword', label: '搜索关键词', type: 'string', required: true, placeholder: '例如: AI, review, tech' },
      { field: 'maxCount', label: '采集数量', type: 'number', defaultValue: 10, description: '每次最多采集数量 (1-100)' },
    ],
    outputSchema: [
      { field: 'successCount', label: '成功数量', type: 'number' },
      { field: 'failCount', label: '失败数量', type: 'number' },
      { field: 'items', label: '数据列表', type: 'array' },
    ],
    requirements: [
      { type: 'client', label: '需客户端在线' },
      { type: 'internet', label: '需外网' },
    ],
  },
  {
    type: 'arstechnica_search',
    name: 'Ars Technica',
    category: 'news_data',
    description: '从 Ars Technica 获取深度技术、科学和安全报道，搜索知名技术媒体的最新深度分析。Ars Technica 以深度技术文章、科学报道和安全研究著称，内容面向技术爱好者和IT专业人士。需客户端在线且可访问外网。输出包含新闻标题、作者、分类、发布时间和原文链接，适用于技术深度分析、科学资讯获取和安全动态监控。',
    iconImage: arstechnicaIcon,
    color: '#FF4500',
    defaultData: { label: 'Ars Technica', config: { keyword: '', maxCount: 10 } },
    inputSchema: [
      { field: 'keyword', label: '搜索关键词', type: 'string', required: true, placeholder: '例如: AI, security, science' },
      { field: 'maxCount', label: '采集数量', type: 'number', defaultValue: 10, description: '每次最多采集数量 (1-100)' },
    ],
    outputSchema: [
      { field: 'successCount', label: '成功数量', type: 'number' },
      { field: 'failCount', label: '失败数量', type: 'number' },
      { field: 'items', label: '数据列表', type: 'array' },
    ],
    requirements: [
      { type: 'client', label: '需客户端在线' },
      { type: 'internet', label: '需外网' },
    ],
  },
  {
    type: 'mittechreview_search',
    name: 'MIT Tech Review',
    category: 'news_data',
    description: '从 MIT Technology Review 获取前沿科技、AI 和创新深度分析，搜索麻省理工学院科技评论的最新内容。MIT Tech Review 是全球最具影响力的科技媒体之一，以深度分析和前沿科技报道著称。需客户端在线且可访问外网。输出包含文章标题、作者、分类、发布时间和原文链接，适用于前沿科技创新追踪、AI趋势分析和科技政策研究。',
    iconImage: mittechreviewIcon,
    color: '#000000',
    defaultData: { label: 'MIT Tech Review', config: { keyword: '', maxCount: 10 } },
    inputSchema: [
      { field: 'keyword', label: '搜索关键词', type: 'string', required: true, placeholder: '例如: AI, innovation, future' },
      { field: 'maxCount', label: '采集数量', type: 'number', defaultValue: 10, description: '每次最多采集数量 (1-100)' },
    ],
    outputSchema: [
      { field: 'successCount', label: '成功数量', type: 'number' },
      { field: 'failCount', label: '失败数量', type: 'number' },
      { field: 'items', label: '数据列表', type: 'array' },
    ],
    requirements: [
      { type: 'client', label: '需客户端在线' },
      { type: 'internet', label: '需外网' },
    ],
  },
  {
    type: 'reuters_search',
    name: 'Reuters 路透社',
    category: 'news_data',
    description: '从 Reuters 获取国际新闻、财经和市场资讯，搜索世界最大国际通讯社的最新报道。路透社是全球最大的国际通讯社，以客观及时的新闻报道和财经数据著称。需客户端在线且可访问外网。输出包含新闻标题、分类、发布时间、摘要和原文链接，适用于国际新闻追踪、金融市场动态监控和全球商业情报收集。',
    iconImage: reutersIcon,
    color: '#FF8000',
    defaultData: { label: 'Reuters 路透社', config: { keyword: '', maxCount: 10 } },
    inputSchema: [
      { field: 'keyword', label: '搜索关键词', type: 'string', required: true, placeholder: '例如: markets, technology, world' },
      { field: 'maxCount', label: '采集数量', type: 'number', defaultValue: 10, description: '每次最多采集数量 (1-100)' },
    ],
    outputSchema: [
      { field: 'successCount', label: '成功数量', type: 'number' },
      { field: 'failCount', label: '失败数量', type: 'number' },
      { field: 'items', label: '数据列表', type: 'array' },
    ],
    requirements: [
      { type: 'client', label: '需客户端在线' },
      { type: 'internet', label: '需外网' },
    ],
  },
  {
    type: 'chinadaily_search',
    name: '中国日报',
    category: 'news_data',
    description: '从中国日报获取国内外新闻、商业和科技报道，搜索中国国家英文日报的最新内容。中国日报是中国唯一的国家级英文日报，是对外传播中国声音的重要窗口。需客户端在线且可访问外网。输出包含新闻标题、分类、发布时间、摘要和原文链接，适用于中国对外报道追踪、双语内容聚合和中国故事国际传播分析。',
    iconImage: chinadailyIcon,
    color: '#CE1126',
    defaultData: { label: '中国日报', config: { keyword: '', maxCount: 10 } },
    inputSchema: [
      { field: 'keyword', label: '搜索关键词', type: 'string', required: true, placeholder: '例如: China, technology, business' },
      { field: 'maxCount', label: '采集数量', type: 'number', defaultValue: 10, description: '每次最多采集数量 (1-100)' },
    ],
    outputSchema: [
      { field: 'successCount', label: '成功数量', type: 'number' },
      { field: 'failCount', label: '失败数量', type: 'number' },
      { field: 'items', label: '数据列表', type: 'array' },
    ],
    requirements: [
      { type: 'client', label: '需客户端在线' },
      { type: 'internet', label: '需外网' },
    ],
  },
  {
    type: 'govcn_search',
    name: '中国政府网',
    category: 'news_data',
    description: '从中国政府网获取政府最新政策、法规和公告信息，搜索国务院及其各部门发布的官方文件。中国政府网是国务院和中央政府的官方门户网站，提供权威的政策法规和政务信息。需客户端在线。输出包含文件标题、发文机关、发布时间、文号和政策正文链接，适用于政策研究、法规合规性检查和政府公告监控。',
    iconImage: govcnIcon,
    color: '#DE2910',
    defaultData: { label: '中国政府网', config: { keyword: '', maxCount: 10 } },
    inputSchema: [
      { field: 'keyword', label: '搜索关键词', type: 'string', required: true, placeholder: '例如: 政策, 法规, 公告' },
      { field: 'maxCount', label: '采集数量', type: 'number', defaultValue: 10, description: '每次最多采集数量 (1-100)' },
    ],
    outputSchema: [
      { field: 'successCount', label: '成功数量', type: 'number' },
      { field: 'failCount', label: '失败数量', type: 'number' },
      { field: 'items', label: '数据列表', type: 'array' },
    ],
    requirements: [
      { type: 'client', label: '需客户端在线' },
      { type: 'internet', label: '需外网' },
    ],
  },
  {
    type: 'xinhuanet_search',
    name: '新华网',
    category: 'news_data',
    description: '从新华网获取国内国际新闻、财经和科技资讯，搜索新华社旗下官方网站的最新报道。新华网是中国最大的官方新闻门户网站之一，提供全天候的新闻资讯服务。需客户端在线。输出包含新闻标题、分类、发布时间、摘要和原文链接，适用于国内新闻追踪、官方信息获取和政务资讯聚合。',
    iconImage: xinhuanetIcon,
    color: '#003DA5',
    defaultData: { label: '新华网', config: { keyword: '', maxCount: 10 } },
    inputSchema: [
      { field: 'keyword', label: '搜索关键词', type: 'string', required: true, placeholder: '例如: 科技, 财经, 国际' },
      { field: 'maxCount', label: '采集数量', type: 'number', defaultValue: 10, description: '每次最多采集数量 (1-100)' },
    ],
    outputSchema: [
      { field: 'successCount', label: '成功数量', type: 'number' },
      { field: 'failCount', label: '失败数量', type: 'number' },
      { field: 'items', label: '数据列表', type: 'array' },
    ],
    requirements: [
      { type: 'client', label: '需客户端在线' },
      { type: 'internet', label: '需外网' },
    ],
  },
  {
    type: 'thepaper_search',
    name: '澎湃新闻',
    category: 'news_data',
    description: '从澎湃新闻获取社会、财经、科技深度报道与时事评论，搜索知名原创时政媒体的深度内容。澎湃新闻是中国领先的原创新闻媒体，以深度调查报道和时事评论著称，聚焦社会热点和公共政策。需客户端在线。输出包含文章标题、作者、分类、发布时间和原文链接，适用于深度新闻报道追踪、社会热点分析和时事评论收集。',
    iconImage: thepaperIcon,
    color: '#000000',
    defaultData: { label: '澎湃新闻', config: { keyword: '', maxCount: 10 } },
    inputSchema: [
      { field: 'keyword', label: '搜索关键词', type: 'string', required: true, placeholder: '例如: 财经, 科技, 评论' },
      { field: 'maxCount', label: '采集数量', type: 'number', defaultValue: 10, description: '每次最多采集数量 (1-100)' },
    ],
    outputSchema: [
      { field: 'successCount', label: '成功数量', type: 'number' },
      { field: 'failCount', label: '失败数量', type: 'number' },
      { field: 'items', label: '数据列表', type: 'array' },
    ],
    requirements: [
      { type: 'client', label: '需客户端在线' },
      { type: 'internet', label: '需外网' },
    ],
  },
  {
    type: '36kr_search',
    name: '36氪',
    category: 'news_data',
    description: '从 36氪 获取前沿科技、创投、商业热点与快讯，搜索中国知名科技与创投媒体的报道。36氪是中文互联网领先的科技与创投媒体，覆盖AI、新能源、消费等热门赛道，以深度分析和快讯见长。需客户端在线。输出包含文章标题、作者、分类、发布时间和原文链接，适用于创投趋势追踪、科技行业动态监控和商业情报收集。',
    iconImage: thirtySixKrNewsIcon,
    color: '#0052D9',
    defaultData: { label: '36氪', config: { keyword: '', maxCount: 10 } },
    inputSchema: [
      { field: 'keyword', label: '搜索关键词', type: 'string', required: true, placeholder: '例如: AI, 创业, 商业' },
      { field: 'maxCount', label: '采集数量', type: 'number', defaultValue: 10, description: '每次最多采集数量 (1-100)' },
    ],
    outputSchema: [
      { field: 'successCount', label: '成功数量', type: 'number' },
      { field: 'failCount', label: '失败数量', type: 'number' },
      { field: 'items', label: '数据列表', type: 'array' },
    ],
    requirements: [
      { type: 'client', label: '需客户端在线' },
      { type: 'internet', label: '需外网' },
    ],
  },
  {
    type: 'huxiu_search',
    name: '虎嗅',
    category: 'news_data',
    description: '从虎嗅获取科技、商业、创投深度分析与精选文章，搜索中国知名商业媒体的原创内容。虎嗅是中文互联网领先的商业科技媒体，以深度分析、独家报道和精选文章著称，聚焦商业创新和科技趋势。需客户端在线。输出包含文章标题、作者、分类、发布时间和原文链接，适用于商业趋势分析、创新案例研究和科技行业洞察。',
    iconImage: huxiuIcon,
    color: '#F44336',
    defaultData: { label: '虎嗅', config: { keyword: '', maxCount: 10 } },
    inputSchema: [
      { field: 'keyword', label: '搜索关键词', type: 'string', required: true, placeholder: '例如: 商业, 科技, 创投' },
      { field: 'maxCount', label: '采集数量', type: 'number', defaultValue: 10, description: '每次最多采集数量 (1-100)' },
    ],
    outputSchema: [
      { field: 'successCount', label: '成功数量', type: 'number' },
      { field: 'failCount', label: '失败数量', type: 'number' },
      { field: 'items', label: '数据列表', type: 'array' },
    ],
    requirements: [
      { type: 'client', label: '需客户端在线' },
      { type: 'internet', label: '需外网' },
    ],
  },
  {
    type: 'techcrunchrss_search',
    name: 'TechCrunch RSS',
    category: 'news_data',
    description: '通过 TechCrunch RSS 订阅源获取科技创业、AI 公司和投资新闻。TechCrunch RSS 提供结构化的科技创投资讯，涵盖初创公司动态、融资信息和产品发布。需客户端在线且可访问外网。输出包含新闻标题、分类、发布时间和原文链接，适用于创投趋势追踪和科技行业情报收集。',
    iconImage: techcrunchrssIcon,
    color: '#0A9E01',
    defaultData: { label: 'TechCrunch RSS', config: { keyword: '', maxCount: 10 } },
    inputSchema: [
      { field: 'keyword', label: '搜索关键词', type: 'string', required: true, placeholder: '例如: AI, startup, funding' },
      { field: 'maxCount', label: '采集数量', type: 'number', defaultValue: 10, description: '每次最多采集数量 (1-100)' },
    ],
    outputSchema: [
      { field: 'successCount', label: '成功数量', type: 'number' },
      { field: 'failCount', label: '失败数量', type: 'number' },
      { field: 'items', label: '数据列表', type: 'array' },
    ],
    requirements: [
      { type: 'client', label: '需客户端在线' },
      { type: 'internet', label: '需外网' },
    ],
  },
  {
    type: 'arstechnicarss_search',
    name: 'Ars Technica RSS',
    category: 'news_data',
    description: '通过 Ars Technica RSS 订阅源获取深度技术、科学和安全报道。Ars Technica RSS 提供面向技术爱好者的深度文章，涵盖硬件评测、科学发现和安全研究。需客户端在线且可访问外网。输出包含新闻标题、分类、发布时间和原文链接，适用于技术深度分析和科学资讯获取。',
    iconImage: arstechnicarssIcon,
    color: '#FF4500',
    defaultData: { label: 'Ars Technica RSS', config: { keyword: '', maxCount: 10 } },
    inputSchema: [
      { field: 'keyword', label: '搜索关键词', type: 'string', required: true, placeholder: '例如: AI, security, science' },
      { field: 'maxCount', label: '采集数量', type: 'number', defaultValue: 10, description: '每次最多采集数量 (1-100)' },
    ],
    outputSchema: [
      { field: 'successCount', label: '成功数量', type: 'number' },
      { field: 'failCount', label: '失败数量', type: 'number' },
      { field: 'items', label: '数据列表', type: 'array' },
    ],
    requirements: [
      { type: 'client', label: '需客户端在线' },
      { type: 'internet', label: '需外网' },
    ],
  },
  {
    type: 'thevergerss_search',
    name: 'The Verge RSS',
    category: 'news_data',
    description: '通过 The Verge RSS 订阅源获取科技评测、AI 和消费电子资讯。The Verge RSS 提供消费电子评测、互联网文化和AI报道的结构化内容。需客户端在线且可访问外网。输出包含新闻标题、分类、发布时间和原文链接，适用于消费电子追踪和科技产品评测参考。',
    iconImage: thevergerssIcon,
    color: '#E2127A',
    defaultData: { label: 'The Verge RSS', config: { keyword: '', maxCount: 10 } },
    inputSchema: [
      { field: 'keyword', label: '搜索关键词', type: 'string', required: true, placeholder: '例如: AI, review, tech' },
      { field: 'maxCount', label: '采集数量', type: 'number', defaultValue: 10, description: '每次最多采集数量 (1-100)' },
    ],
    outputSchema: [
      { field: 'successCount', label: '成功数量', type: 'number' },
      { field: 'failCount', label: '失败数量', type: 'number' },
      { field: 'items', label: '数据列表', type: 'array' },
    ],
    requirements: [
      { type: 'client', label: '需客户端在线' },
      { type: 'internet', label: '需外网' },
    ],
  },
  {
    type: 'wired_search',
    name: 'Wired',
    category: 'news_data',
    description: '通过 Wired RSS 订阅源获取科技与文化深度报道。Wired 是科技文化领域的标杆媒体，内容涵盖技术趋势、科学发现、商业创新和文化观察。需客户端在线且可访问外网。输出包含文章标题、分类、发布时间和原文链接，适用于科技文化趋势追踪和深度内容分析。',
    iconImage: wiredIcon,
    color: '#000000',
    defaultData: { label: 'Wired', config: { keyword: '', maxCount: 10 } },
    inputSchema: [
      { field: 'keyword', label: '搜索关键词', type: 'string', required: true, placeholder: '例如: AI, culture, tech' },
      { field: 'maxCount', label: '采集数量', type: 'number', defaultValue: 10, description: '每次最多采集数量 (1-100)' },
    ],
    outputSchema: [
      { field: 'successCount', label: '成功数量', type: 'number' },
      { field: 'failCount', label: '失败数量', type: 'number' },
      { field: 'items', label: '数据列表', type: 'array' },
    ],
    requirements: [
      { type: 'client', label: '需客户端在线' },
      { type: 'internet', label: '需外网' },
    ],
  },
  {
    type: 'mittechreviewrss_search',
    name: 'MIT Technology Review RSS',
    category: 'news_data',
    description: '通过 MIT Technology Review RSS 订阅源获取前沿科技、AI 和创新深度分析。MIT Tech Review RSS 提供麻省理工学院科技评论的结构化前沿内容。需客户端在线且可访问外网。输出包含文章标题、分类、发布时间和原文链接，适用于前沿科技创新追踪和科技政策研究。',
    iconImage: mittechreviewrssIcon,
    color: '#D0021B',
    defaultData: { label: 'MIT Technology Review RSS', config: { keyword: '', maxCount: 10 } },
    inputSchema: [
      { field: 'keyword', label: '搜索关键词', type: 'string', required: true, placeholder: '例如: AI, innovation, future' },
      { field: 'maxCount', label: '采集数量', type: 'number', defaultValue: 10, description: '每次最多采集数量 (1-100)' },
    ],
    outputSchema: [
      { field: 'successCount', label: '成功数量', type: 'number' },
      { field: 'failCount', label: '失败数量', type: 'number' },
      { field: 'items', label: '数据列表', type: 'array' },
    ],
    requirements: [
      { type: 'client', label: '需客户端在线' },
      { type: 'internet', label: '需外网' },
    ],
  },
  {
    type: 'engadget_search',
    name: 'Engadget',
    category: 'news_data',
    description: '通过 Engadget RSS 订阅源获取消费电子与科技新品资讯。Engadget 专注于消费电子、智能硬件和科技新品的报道与评测。需客户端在线且可访问外网。输出包含新闻标题、分类、发布时间和原文链接，适用于消费电子行业追踪和新品动态监控。',
    iconImage: engadgetIcon,
    color: '#00BFB3',
    defaultData: { label: 'Engadget', config: { keyword: '', maxCount: 10 } },
    inputSchema: [
      { field: 'keyword', label: '搜索关键词', type: 'string', required: true, placeholder: '例如: smartphone, laptop, wearable' },
      { field: 'maxCount', label: '采集数量', type: 'number', defaultValue: 10, description: '每次最多采集数量 (1-100)' },
    ],
    outputSchema: [
      { field: 'successCount', label: '成功数量', type: 'number' },
      { field: 'failCount', label: '失败数量', type: 'number' },
      { field: 'items', label: '数据列表', type: 'array' },
    ],
    requirements: [
      { type: 'client', label: '需客户端在线' },
      { type: 'internet', label: '需外网' },
    ],
  },
  {
    type: 'bbctechnology_search',
    name: 'BBC Technology',
    category: 'news_data',
    description: '通过 BBC Technology RSS 订阅源获取科技新闻、互联网动态和数字文化报道。BBC Technology 频道提供全球科技行业的权威新闻报道。需客户端在线且可访问外网。输出包含新闻标题、分类、发布时间和原文链接，适用于国际科技新闻追踪和数字文化动态监控。',
    iconImage: bbctechnologyIcon,
    color: '#1B1B1B',
    defaultData: { label: 'BBC Technology', config: { keyword: '', maxCount: 10 } },
    inputSchema: [
      { field: 'keyword', label: '搜索关键词', type: 'string', required: true, placeholder: '例如: technology, AI, internet' },
      { field: 'maxCount', label: '采集数量', type: 'number', defaultValue: 10, description: '每次最多采集数量 (1-100)' },
    ],
    outputSchema: [
      { field: 'successCount', label: '成功数量', type: 'number' },
      { field: 'failCount', label: '失败数量', type: 'number' },
      { field: 'items', label: '数据列表', type: 'array' },
    ],
    requirements: [
      { type: 'client', label: '需客户端在线' },
      { type: 'internet', label: '需外网' },
    ],
  },
  {
    type: 'guardiantechnology_search',
    name: 'The Guardian Technology',
    category: 'news_data',
    description: '通过 The Guardian Technology RSS 订阅源获取科技、互联网和数字文化报道。卫报科技频道提供数字技术、社交媒体和科技创新的深度报道。需客户端在线且可访问外网。输出包含新闻标题、分类、发布时间和原文链接，适用于科技政策追踪和数字文化动态分析。',
    iconImage: guardiantechnologyIcon,
    color: '#052962',
    defaultData: { label: 'The Guardian Technology', config: { keyword: '', maxCount: 10 } },
    inputSchema: [
      { field: 'keyword', label: '搜索关键词', type: 'string', required: true, placeholder: '例如: technology, privacy, internet' },
      { field: 'maxCount', label: '采集数量', type: 'number', defaultValue: 10, description: '每次最多采集数量 (1-100)' },
    ],
    outputSchema: [
      { field: 'successCount', label: '成功数量', type: 'number' },
      { field: 'failCount', label: '失败数量', type: 'number' },
      { field: 'items', label: '数据列表', type: 'array' },
    ],
    requirements: [
      { type: 'client', label: '需客户端在线' },
      { type: 'internet', label: '需外网' },
    ],
  },
  {
    type: 'time_search',
    name: 'TIME',
    category: 'news_data',
    description: '通过 TIME RSS 订阅源获取时代周刊综合资讯，涵盖科技、健康、政治和全球时事。TIME 是美国最具影响力的新闻周刊之一，以深度报道和年度人物评选著称。需客户端在线且可访问外网。输出包含文章标题、分类、发布时间和原文链接，适用于综合资讯追踪和全球热点分析。',
    iconImage: timeIcon,
    color: '#E60000',
    defaultData: { label: 'TIME', config: { keyword: '', maxCount: 10 } },
    inputSchema: [
      { field: 'keyword', label: '搜索关键词', type: 'string', required: true, placeholder: '例如: technology, health, politics' },
      { field: 'maxCount', label: '采集数量', type: 'number', defaultValue: 10, description: '每次最多采集数量 (1-100)' },
    ],
    outputSchema: [
      { field: 'successCount', label: '成功数量', type: 'number' },
      { field: 'failCount', label: '失败数量', type: 'number' },
      { field: 'items', label: '数据列表', type: 'array' },
    ],
    requirements: [
      { type: 'client', label: '需客户端在线' },
      { type: 'internet', label: '需外网' },
    ],
  },
  {
    type: 'apnews_search',
    name: 'AP News Technology',
    category: 'news_data',
    description: '从 AP News 科技频道抓取美联社最新科技新闻报道。AP News 是全球最大的通讯社之一，科技频道提供及时、权威的科技行业资讯。需客户端在线且可访问外网。输出包含新闻标题、摘要、发布时间和原文链接，适用于科技新闻追踪和行业动态监控。',
    iconImage: apnewsIcon,
    color: '#000000',
    defaultData: { label: 'AP News Technology', config: { keyword: '', maxCount: 10 } },
    inputSchema: [
      { field: 'keyword', label: '搜索关键词', type: 'string', required: true, placeholder: '例如: technology, AI, science' },
      { field: 'maxCount', label: '采集数量', type: 'number', defaultValue: 10, description: '每次最多采集数量 (1-100)' },
    ],
    outputSchema: [
      { field: 'successCount', label: '成功数量', type: 'number' },
      { field: 'failCount', label: '失败数量', type: 'number' },
      { field: 'items', label: '数据列表', type: 'array' },
    ],
    requirements: [
      { type: 'client', label: '需客户端在线' },
      { type: 'internet', label: '需外网' },
    ],
  },
  {
    type: 'nprtechnology_search',
    name: 'NPR Technology',
    category: 'news_data',
    description: '从 NPR 科技频道抓取美国国家公共广播电台科技报道。NPR 科技频道涵盖互联网、数字文化、太空探索和科技创新的深度报道。需客户端在线且可访问外网。输出包含新闻标题、摘要、音频链接和发布时间，适用于科技新闻追踪和英文听力素材收集。',
    iconImage: nprtechnologyIcon,
    color: '#000000',
    defaultData: { label: 'NPR Technology', config: { keyword: '', maxCount: 10 } },
    inputSchema: [
      { field: 'keyword', label: '搜索关键词', type: 'string', required: true, placeholder: '例如: technology, internet, space' },
      { field: 'maxCount', label: '采集数量', type: 'number', defaultValue: 10, description: '每次最多采集数量 (1-100)' },
    ],
    outputSchema: [
      { field: 'successCount', label: '成功数量', type: 'number' },
      { field: 'failCount', label: '失败数量', type: 'number' },
      { field: 'items', label: '数据列表', type: 'array' },
    ],
    requirements: [
      { type: 'client', label: '需客户端在线' },
      { type: 'internet', label: '需外网' },
    ],
  },
  {
    type: 'sciencedaily_search',
    name: 'ScienceDaily',
    category: 'news_data',
    description: '通过 ScienceDaily RSS 订阅源获取每日科学资讯，涵盖医学、物理、生物、环境等多学科最新研究发现。ScienceDaily 聚合全球高校和科研机构的最新科研成果报道。需客户端在线且可访问外网。输出包含文章标题、分类、发布时间和原文链接，适用于科研动态追踪和科学资讯聚合。',
    iconImage: sciencedailyIcon,
    color: '#0066CC',
    defaultData: { label: 'ScienceDaily', config: { keyword: '', maxCount: 10 } },
    inputSchema: [
      { field: 'keyword', label: '搜索关键词', type: 'string', required: true, placeholder: '例如: medicine, physics, biology' },
      { field: 'maxCount', label: '采集数量', type: 'number', defaultValue: 10, description: '每次最多采集数量 (1-100)' },
    ],
    outputSchema: [
      { field: 'successCount', label: '成功数量', type: 'number' },
      { field: 'failCount', label: '失败数量', type: 'number' },
      { field: 'items', label: '数据列表', type: 'array' },
    ],
    requirements: [
      { type: 'client', label: '需客户端在线' },
      { type: 'internet', label: '需外网' },
    ],
  },
  {
    type: 'physorg_search',
    name: 'Phys.org',
    category: 'news_data',
    description: '通过 Phys.org RSS 订阅源获取物理科学、材料科学和纳米技术领域的最新研究资讯。Phys.org 是物理科学领域知名的科研资讯平台，提供物理学、化学、地球科学等学科的前沿报道。需客户端在线且可访问外网。输出包含文章标题、分类、发布时间和原文链接，适用于物理科研动态追踪和前沿技术调研。',
    iconImage: physorgIcon,
    color: '#003366',
    defaultData: { label: 'Phys.org', config: { keyword: '', maxCount: 10 } },
    inputSchema: [
      { field: 'keyword', label: '搜索关键词', type: 'string', required: true, placeholder: '例如: physics, nanotechnology, materials' },
      { field: 'maxCount', label: '采集数量', type: 'number', defaultValue: 10, description: '每次最多采集数量 (1-100)' },
    ],
    outputSchema: [
      { field: 'successCount', label: '成功数量', type: 'number' },
      { field: 'failCount', label: '失败数量', type: 'number' },
      { field: 'items', label: '数据列表', type: 'array' },
    ],
    requirements: [
      { type: 'client', label: '需客户端在线' },
      { type: 'internet', label: '需外网' },
    ],
  },
  {
    type: 'quantamagazine_search',
    name: 'Quanta Magazine',
    category: 'news_data',
    description: '通过 Quanta Magazine RSS 订阅源获取数学、物理、生物和计算机科学领域的深度科学报道。Quanta Magazine 是西蒙斯基金会旗下的高质量科学媒体，以通俗易懂的方式报道前沿科学研究。需客户端在线且可访问外网。输出包含文章标题、分类、发布时间和原文链接，适用于前沿科学知识获取和跨学科研究追踪。',
    iconImage: quantamagazineIcon,
    color: '#F5A623',
    defaultData: { label: 'Quanta Magazine', config: { keyword: '', maxCount: 10 } },
    inputSchema: [
      { field: 'keyword', label: '搜索关键词', type: 'string', required: true, placeholder: '例如: mathematics, physics, biology' },
      { field: 'maxCount', label: '采集数量', type: 'number', defaultValue: 10, description: '每次最多采集数量 (1-100)' },
    ],
    outputSchema: [
      { field: 'successCount', label: '成功数量', type: 'number' },
      { field: 'failCount', label: '失败数量', type: 'number' },
      { field: 'items', label: '数据列表', type: 'array' },
    ],
    requirements: [
      { type: 'client', label: '需客户端在线' },
      { type: 'internet', label: '需外网' },
    ],
  },
  {
    type: 'spacecom_search',
    name: 'Space.com',
    category: 'news_data',
    description: '通过 Space.com RSS 订阅源获取太空探索、航天工程和天文学最新资讯。Space.com 是太空领域权威媒体，涵盖NASA任务、商业航天、天文发现和太空科学。需客户端在线且可访问外网。输出包含文章标题、分类、发布时间和原文链接，适用于航天动态追踪和天文科普内容聚合。',
    iconImage: spacecomIcon,
    color: '#0B3D91',
    defaultData: { label: 'Space.com', config: { keyword: '', maxCount: 10 } },
    inputSchema: [
      { field: 'keyword', label: '搜索关键词', type: 'string', required: true, placeholder: '例如: NASA, space, astronomy' },
      { field: 'maxCount', label: '采集数量', type: 'number', defaultValue: 10, description: '每次最多采集数量 (1-100)' },
    ],
    outputSchema: [
      { field: 'successCount', label: '成功数量', type: 'number' },
      { field: 'failCount', label: '失败数量', type: 'number' },
      { field: 'items', label: '数据列表', type: 'array' },
    ],
    requirements: [
      { type: 'client', label: '需客户端在线' },
      { type: 'internet', label: '需外网' },
    ],
  },
  {
    type: 'nature_search',
    name: 'Nature',
    category: 'news_data',
    description: '通过 Nature RSS 订阅源获取自然学术期刊最新科研资讯和新闻。Nature 是全球最权威的学术期刊之一，RSS 提供最新发表的研究论文和科学新闻。需客户端在线且可访问外网，首次访问需先获取首页 Cookie。输出包含文章标题、分类、发布时间和原文链接，适用于前沿科研动态追踪和学术成果监控。',
    iconImage: natureIcon,
    color: '#003E7E',
    defaultData: { label: 'Nature', config: { keyword: '', maxCount: 10 } },
    inputSchema: [
      { field: 'keyword', label: '搜索关键词', type: 'string', required: true, placeholder: '例如: genetics, climate, neuroscience' },
      { field: 'maxCount', label: '采集数量', type: 'number', defaultValue: 10, description: '每次最多采集数量 (1-100)' },
    ],
    outputSchema: [
      { field: 'successCount', label: '成功数量', type: 'number' },
      { field: 'failCount', label: '失败数量', type: 'number' },
      { field: 'items', label: '数据列表', type: 'array' },
    ],
    requirements: [
      { type: 'client', label: '需客户端在线' },
      { type: 'internet', label: '需外网' },
    ],
  },
  {
    type: 'scienceaaas_search',
    name: 'Science (AAAS)',
    category: 'news_data',
    description: '通过 Science RSS 订阅源获取美国科学促进会期刊最新科研资讯。Science 是全球顶级学术期刊之一，RSS 提供最新科学研究成果和科研政策报道。需客户端在线且可访问外网。输出包含文章标题、分类、发布时间和原文链接，适用于前沿科学研究成果追踪和科研政策分析。',
    iconImage: scienceaaasIcon,
    color: '#006633',
    defaultData: { label: 'Science (AAAS)', config: { keyword: '', maxCount: 10 } },
    inputSchema: [
      { field: 'keyword', label: '搜索关键词', type: 'string', required: true, placeholder: '例如: research, science, biology' },
      { field: 'maxCount', label: '采集数量', type: 'number', defaultValue: 10, description: '每次最多采集数量 (1-100)' },
    ],
    outputSchema: [
      { field: 'successCount', label: '成功数量', type: 'number' },
      { field: 'failCount', label: '失败数量', type: 'number' },
      { field: 'items', label: '数据列表', type: 'array' },
    ],
    requirements: [
      { type: 'client', label: '需客户端在线' },
      { type: 'internet', label: '需外网' },
    ],
  },
  {
    type: 'jiqizhixin_search',
    name: '机器之心',
    category: 'news_data',
    description: '从机器之心抓取 AI 行业资讯、技术深度报道和学术会议动态。机器之心是中文互联网领先的 AI 行业媒体，覆盖大模型、计算机视觉、自然语言处理等前沿方向。需客户端在线。输出包含文章标题、分类、发布时间和原文链接，适用于 AI 行业动态追踪和前沿技术调研。',
    iconImage: jiqizhixinIcon,
    color: '#2563EB',
    defaultData: { label: '机器之心', config: { keyword: '', maxCount: 10 } },
    inputSchema: [
      { field: 'keyword', label: '搜索关键词', type: 'string', required: true, placeholder: '例如: 大模型, 计算机视觉, NLP' },
      { field: 'maxCount', label: '采集数量', type: 'number', defaultValue: 10, description: '每次最多采集数量 (1-100)' },
    ],
    outputSchema: [
      { field: 'successCount', label: '成功数量', type: 'number' },
      { field: 'failCount', label: '失败数量', type: 'number' },
      { field: 'items', label: '数据列表', type: 'array' },
    ],
    requirements: [
      { type: 'client', label: '需客户端在线' },
      { type: 'internet', label: '需外网' },
    ],
  },
  {
    type: 'sspai_search',
    name: '少数派',
    category: 'news_data',
    description: '从少数派抓取数字生活、科技评测和效率工具推荐。少数派是中文互联网知名的数字生活媒体，以深度应用评测和效率工作方法分享著称。需客户端在线。输出包含文章标题、分类、发布时间和原文链接，适用于数字生活资讯追踪和效率工具发现。',
    iconImage: sspaiIcon,
    color: '#333333',
    defaultData: { label: '少数派', config: { keyword: '', maxCount: 10 } },
    inputSchema: [
      { field: 'keyword', label: '搜索关键词', type: 'string', required: true, placeholder: '例如: 效率, 应用, 数码' },
      { field: 'maxCount', label: '采集数量', type: 'number', defaultValue: 10, description: '每次最多采集数量 (1-100)' },
    ],
    outputSchema: [
      { field: 'successCount', label: '成功数量', type: 'number' },
      { field: 'failCount', label: '失败数量', type: 'number' },
      { field: 'items', label: '数据列表', type: 'array' },
    ],
    requirements: [
      { type: 'client', label: '需客户端在线' },
      { type: 'internet', label: '需外网' },
    ],
  },

  {
    type: 'svgrepo_search',
    name: 'SVGRepo 矢量图库采集',
    category: 'material',
    description: '从 SVGRepo 按关键词和风格筛选开源 SVG 矢量图标与矢量插画，并批量同步到素材库。SVG 素材可无限缩放，适用于 UI、网页、品牌视觉与印刷设计；支持全部、单色、多色、双色、轮廓、填充等风格。需客户端在线、浏览器环境可用且可访问外网。输出包含素材 URL、名称、风格和授权信息。',
    iconImage: svgrepoIcon,
    color: '#6b9bd2',
    defaultData: { label: 'SVGRepo 矢量采集', config: { keyword: '', maxCount: 12, style: 'all' } },
    inputSchema: [
      { field: 'keyword', label: '搜索关键词', type: 'string', required: true, placeholder: '例如: cat, animal, tech, arrow, shopping' },
      { field: 'maxCount', label: '采集数量', type: 'number', defaultValue: 12, description: '每次最多采集数量 (1-50)' },
      {
        field: 'style',
        label: '矢量风格',
        type: 'select',
        defaultValue: 'all',
        options: [
          { label: '全部风格 (All Styles)', value: 'all' },
          { label: '单色 (Monocolor)', value: 'monocolor' },
          { label: '多色 (Multicolor)', value: 'multicolor' },
          { label: '双色 (Duotone)', value: 'duotone' },
          { label: '轮廓 (Outlined)', value: 'outlined' },
          { label: '填充 (Filled)', value: 'filled' },
          { label: '图标 (Icon)', value: 'icon' },
          { label: '字形 (Glyph)', value: 'glyph' },
          { label: '圆角 (Rounded)', value: 'rounded' },
          { label: '锐角 (Sharp)', value: 'sharp' },
        ],
      },
    ],
    outputSchema: [
      { field: 'successCount', label: '成功数量', type: 'number' },
      { field: 'failCount', label: '失败数量', type: 'number' },
      { field: 'images', label: '图片列表', type: 'array' },
    ],
    requirements: [
      { type: 'client', label: '需客户端在线' },
      { type: 'client_browser', label: '需浏览器环境' },
      { type: 'internet', label: '需外网' },
    ],
  },
  {
    type: 'kaboompics_search',
    name: 'Kaboompics 高清摄影采集',
    category: 'material',
    description: '从 Kaboompics 检索精品生活美学与商业高清摄影大图并同步上传至素材库。Kaboompics 提供高质量的免费摄影图片，以生活美学、室内设计和商业场景为特色，所有图片可免费商用。需客户端在线且可访问外网。输出包含图片URL、标题、分类和尺寸信息，适用于博客配图、社交媒体内容创作和商业设计项目。',
    iconImage: kaboompicsIcon,
    color: '#C4704B',
    defaultData: { label: 'Kaboompics 摄影采集', config: { keyword: '', maxCount: 10 } },
    inputSchema: [
      { field: 'keyword', label: '搜索关键词', type: 'string', required: true, placeholder: '例如: coffee, interior, nature, lifestyle' },
      { field: 'maxCount', label: '采集数量', type: 'number', defaultValue: 10, description: '每次最多采集数量 (1-50)' },
    ],
    outputSchema: [
      { field: 'successCount', label: '成功数量', type: 'number' },
      { field: 'failCount', label: '失败数量', type: 'number' },
      { field: 'images', label: '图片列表', type: 'array' },
    ],
    requirements: [
      { type: 'client', label: '需客户端在线' },
      { type: 'internet', label: '需外网' },
    ],
  },
  {
    type: 'baidu_search',
    name: '百度图片搜索采集',
    category: 'material',
    description: '从百度图片搜索海量中文与全球素材配图、电商与国风壁纸并批量入库。需客户端在线。',
    iconImage: '/workflow-icons/baidu.png',
    color: '#2932E1',
    defaultData: { label: '百度图片采集', config: { keyword: '', maxCount: 10 } },
    inputSchema: [
      { field: 'keyword', label: '搜索关键词', type: 'string', required: true, placeholder: '例如: 现代极简, 国风壁纸, 咖啡' },
      { field: 'maxCount', label: '采集数量', type: 'number', defaultValue: 10, description: '每次最多采集数量 (1-50)' },
    ],
    outputSchema: [
      { field: 'successCount', label: '成功数量', type: 'number' },
      { field: 'failCount', label: '失败数量', type: 'number' },
      { field: 'images', label: '图片列表', type: 'array' },
    ],
    requirements: [
      { type: 'client', label: '需客户端在线' },
    ],
  },
  {
    type: 'bing_search',
    name: '必应图片搜索采集',
    category: 'material',
    description: '从必应 (Bing) 搜索全球高清摄影、设计与透明底素材并批量入库。需客户端在线。',
    iconImage: '/workflow-icons/bing.png',
    color: '#008373',
    defaultData: { label: '必应图片采集', config: { keyword: '', maxCount: 10 } },
    inputSchema: [
      { field: 'keyword', label: '搜索关键词', type: 'string', required: true, placeholder: '例如: landscape, architecture, cute cat' },
      { field: 'maxCount', label: '采集数量', type: 'number', defaultValue: 10, description: '每次最多采集数量 (1-50)' },
    ],
    outputSchema: [
      { field: 'successCount', label: '成功数量', type: 'number' },
      { field: 'failCount', label: '失败数量', type: 'number' },
      { field: 'images', label: '图片列表', type: 'array' },
    ],
    requirements: [
      { type: 'client', label: '需客户端在线' },
      { type: 'internet', label: '需外网' },
    ],
  },
  {
    type: 'duckduckgo_search',
    name: 'DuckDuckGo 图片采集',
    category: 'material',
    description: '通过 DuckDuckGo 隐私引擎检索全球多源高清图片并批量入库，免 API Key。需客户端在线。',
    iconImage: '/workflow-icons/duckduckgo.png',
    color: '#DE5833',
    defaultData: { label: 'DuckDuckGo 图搜', config: { keyword: '', maxCount: 10 } },
    inputSchema: [
      { field: 'keyword', label: '搜索关键词', type: 'string', required: true, placeholder: '例如: vintage art, poster, coffee' },
      { field: 'maxCount', label: '采集数量', type: 'number', defaultValue: 10, description: '每次最多采集数量 (1-50)' },
    ],
    outputSchema: [
      { field: 'successCount', label: '成功数量', type: 'number' },
      { field: 'failCount', label: '失败数量', type: 'number' },
      { field: 'images', label: '图片列表', type: 'array' },
    ],
    requirements: [
      { type: 'client', label: '需客户端在线' },
      { type: 'internet', label: '需外网' },
    ],
  },
  {
    type: 'sogou_search',
    name: '搜狗图片搜索采集',
    category: 'material',
    description: '从搜狗图片检索海量中文配图、表情包与高清素材并批量入库。需客户端在线。',
    iconImage: '/workflow-icons/sogou.png',
    color: '#FB6022',
    defaultData: { label: '搜狗图片采集', config: { keyword: '', maxCount: 10 } },
    inputSchema: [
      { field: 'keyword', label: '搜索关键词', type: 'string', required: true, placeholder: '例如: 极简插画, 唯美风景, 表情包' },
      { field: 'maxCount', label: '采集数量', type: 'number', defaultValue: 10, description: '每次最多采集数量 (1-50)' },
    ],
    outputSchema: [
      { field: 'successCount', label: '成功数量', type: 'number' },
      { field: 'failCount', label: '失败数量', type: 'number' },
      { field: 'images', label: '图片列表', type: 'array' },
    ],
    requirements: [
      { type: 'client', label: '需客户端在线' },
    ],
  },
  {
    type: 'so_search',
    name: '360 图片搜索采集',
    category: 'material',
    description: '从 360 图片搜索海量国内设计配图、海报背景与摄影图并批量入库。需客户端在线。',
    iconImage: '/workflow-icons/360.png',
    color: '#1DA362',
    defaultData: { label: '360图片采集', config: { keyword: '', maxCount: 10 } },
    inputSchema: [
      { field: 'keyword', label: '搜索关键词', type: 'string', required: true, placeholder: '例如: 海报背景, 唯美风景, 简约' },
      { field: 'maxCount', label: '采集数量', type: 'number', defaultValue: 10, description: '每次最多采集数量 (1-50)' },
    ],
    outputSchema: [
      { field: 'successCount', label: '成功数量', type: 'number' },
      { field: 'failCount', label: '失败数量', type: 'number' },
      { field: 'images', label: '图片列表', type: 'array' },
    ],
    requirements: [
      { type: 'client', label: '需客户端在线' },
    ],
  },
  {
    type: 'wallhaven_search',
    name: 'Wallhaven 4K 壁纸采集',
    category: 'material',
    description: '从 Wallhaven 检索 2K/4K/8K 顶级超高清壁纸、插画与场景渲染图并批量入库。需客户端在线。',
    iconImage: '/workflow-icons/wallhaven.png',
    color: '#49A9C8',
    defaultData: { label: 'Wallhaven 4K壁纸', config: { keyword: '', maxCount: 10 } },
    inputSchema: [
      { field: 'keyword', label: '搜索关键词', type: 'string', required: true, placeholder: '例如: cyberpunk, anime, landscape, abstract' },
      { field: 'maxCount', label: '采集数量', type: 'number', defaultValue: 10, description: '每次最多采集数量 (1-50)' },
    ],
    outputSchema: [
      { field: 'successCount', label: '成功数量', type: 'number' },
      { field: 'failCount', label: '失败数量', type: 'number' },
      { field: 'images', label: '图片列表', type: 'array' },
    ],
    requirements: [
      { type: 'client', label: '需客户端在线' },
      { type: 'internet', label: '需外网' },
    ],
  },
  {
    type: 'unsplash_search',
    name: 'Unsplash 顶级摄影采集',
    category: 'material',
    description: '从 Unsplash 检索全球顶尖生活美学与商业摄影大图并批量入库。需客户端在线。',
    iconImage: '/workflow-icons/unsplash.png',
    color: '#111111',
    defaultData: { label: 'Unsplash 摄影采集', config: { keyword: '', maxCount: 10 } },
    inputSchema: [
      { field: 'keyword', label: '搜索关键词', type: 'string', required: true, placeholder: '例如: coffee, interior, architecture, portrait' },
      { field: 'maxCount', label: '采集数量', type: 'number', defaultValue: 10, description: '每次最多采集数量 (1-50)' },
    ],
    outputSchema: [
      { field: 'successCount', label: '成功数量', type: 'number' },
      { field: 'failCount', label: '失败数量', type: 'number' },
      { field: 'images', label: '图片列表', type: 'array' },
    ],
    requirements: [
      { type: 'client', label: '需客户端在线' },
      { type: 'internet', label: '需外网' },
    ],
  },
  {
    type: 'flickr_search',
    name: 'Flickr 摄影社区采集',
    category: 'material',
    description: '从 Flickr 检索全球摄影师作品与自由商用版权素材并批量入库。需客户端在线。',
    iconImage: '/workflow-icons/flickr.png',
    color: '#FF0084',
    defaultData: { label: 'Flickr 摄影采集', config: { keyword: '', maxCount: 10 } },
    inputSchema: [
      { field: 'keyword', label: '搜索关键词', type: 'string', required: true, placeholder: '例如: street photography, vintage, wildlife' },
      { field: 'maxCount', label: '采集数量', type: 'number', defaultValue: 10, description: '每次最多采集数量 (1-50)' },
    ],
    outputSchema: [
      { field: 'successCount', label: '成功数量', type: 'number' },
      { field: 'failCount', label: '失败数量', type: 'number' },
      { field: 'images', label: '图片列表', type: 'array' },
    ],
    requirements: [
      { type: 'client', label: '需客户端在线' },
      { type: 'internet', label: '需外网' },
    ],
  },
  {
    type: 'googleimages_search',
    name: '谷歌图片搜索采集',
    category: 'material',
    description: '从谷歌图片 (Google Images) 全球检索图片素材并批量入库。需客户端在线。',
    iconImage: '/workflow-icons/google.png',
    color: '#4285F4',
    defaultData: { label: '谷歌图片采集', config: { keyword: '', maxCount: 10 } },
    inputSchema: [
      { field: 'keyword', label: '搜索关键词', type: 'string', required: true, placeholder: '例如: modern architecture, artwork' },
      { field: 'maxCount', label: '采集数量', type: 'number', defaultValue: 10, description: '每次最多采集数量 (1-50)' },
    ],
    outputSchema: [
      { field: 'successCount', label: '成功数量', type: 'number' },
      { field: 'failCount', label: '失败数量', type: 'number' },
      { field: 'images', label: '图片列表', type: 'array' },
    ],
    requirements: [
      { type: 'client', label: '需客户端在线' },
      { type: 'internet', label: '需外网' },
    ],
  },
  {
    type: 'yandex_search',
    name: 'Yandex 艺术插画与壁纸采集',
    category: 'material',
    description: '从 Yandex 检索全球艺术插画、二次元与欧美无水印高清大图并批量入库。需客户端在线。',
    iconImage: '/workflow-icons/yandex.png',
    color: '#FC3F1D',
    defaultData: { label: 'Yandex 艺术壁纸', config: { keyword: '', maxCount: 10 } },
    inputSchema: [
      { field: 'keyword', label: '搜索关键词', type: 'string', required: true, placeholder: '例如: digital art, wallpaper 4k, illustration' },
      { field: 'maxCount', label: '采集数量', type: 'number', defaultValue: 10, description: '每次最多采集数量 (1-50)' },
    ],
    outputSchema: [
      { field: 'successCount', label: '成功数量', type: 'number' },
      { field: 'failCount', label: '失败数量', type: 'number' },
      { field: 'images', label: '图片列表', type: 'array' },
    ],
    requirements: [
      { type: 'client', label: '需客户端在线' },
      { type: 'internet', label: '需外网' },
    ],
  },
  // ══════════════════════════════════════════════════════
  // 工具类节点 (15 utilities)
  // ══════════════════════════════════════════════════════
  {
    type: 'openmeteo_search',
    name: 'Open-Meteo 天气',
    category: 'utility',
    description: '通过 Open-Meteo API 获取全球实时天气预报和未来天气趋势，基于经纬度坐标查询温度、湿度、风速、降水等气象数据。Open-Meteo 是免费的开源天气预报API，无需API密钥即可使用，覆盖全球范围。需客户端在线且可访问外网。输出包含温度、天气状况、风速和预报数据，适用于天气应用、出行建议和农业气象服务。',
    iconImage: openmeteoIcon,
    color: '#0066CC',
    defaultData: { label: 'Open-Meteo 天气', config: { latitude: 39.9, longitude: 116.4 } },
    inputSchema: [
      { field: 'latitude', label: '纬度', type: 'number', required: true },
      { field: 'longitude', label: '经度', type: 'number', required: true },
    ],
    outputSchema: [ { field: 'temperature', label: '温度', type: 'number' } ],
    requirements: [ { type: 'client', label: '需客户端在线' }, { type: 'internet', label: '需外网' } ],
  },
  {
    type: 'coingecko_search',
    name: 'CoinGecko 币价',
    category: 'utility',
    description: '通过 CoinGecko API 获取加密货币实时价格、市值、交易量和历史行情数据。CoinGecko 是全球最大的独立加密货币数据聚合平台，覆盖超过10000种加密资产。需客户端在线且可访问外网。输出包含币种价格、24小时涨跌幅、市值和交易量，适用于加密货币行情监控、投资组合追踪和数字资产研究。',
    iconImage: coingeckoIcon,
    color: '#8DC647',
    defaultData: { label: 'CoinGecko 币价', config: { ids: 'bitcoin,ethereum' } },
    inputSchema: [ { field: 'ids', label: '币种ID', type: 'string', defaultValue: 'bitcoin,ethereum' } ],
    outputSchema: [ { field: 'prices', label: '价格', type: 'json' } ],
    requirements: [ { type: 'client', label: '需客户端在线' }, { type: 'internet', label: '需外网' } ],
  },
  {
    type: 'frankfurter_search',
    name: 'Frankfurter 汇率',
    category: 'utility',
    description: '通过 Frankfurter API 获取实时和历史外汇汇率数据，基于欧洲央行每日汇率数据，支持100+种法定货币之间的汇率查询和换算。Frankfurter 是免费的开放汇率API，无需API密钥即可使用。需客户端在线且可访问外网。输出包含基准货币、目标货币、汇率值和日期，适用于跨境电商定价、外汇换算和国际财务结算。',
    iconImage: frankfurterIcon,
    color: '#003399',
    defaultData: { label: 'Frankfurter 汇率', config: { from: 'USD', to: 'CNY,EUR' } },
    inputSchema: [ { field: 'from', label: '基准货币', type: 'string', defaultValue: 'USD' }, { field: 'to', label: '目标货币', type: 'string', defaultValue: 'CNY,EUR' } ],
    outputSchema: [ { field: 'rates', label: '汇率', type: 'json' } ],
    requirements: [ { type: 'client', label: '需客户端在线' }, { type: 'internet', label: '需外网' } ],
  },
  {
    type: 'dictionary_search',
    name: 'Free Dictionary',
    category: 'utility',
    description: '通过 Free Dictionary API 查询英语单词的详细释义、音标、发音、词源和例句。Free Dictionary 是免费的英语词典数据源，提供权威的牛津词典数据支持。需客户端在线且可访问外网。输出包含单词释义、国际音标、发音音频URL、词性和例句，适用于英语学习辅助、翻译工具和内容写作参考。',
    iconImage: dictionaryIcon,
    color: '#6B46C1',
    defaultData: { label: 'Free Dictionary', config: { word: 'hello' } },
    inputSchema: [ { field: 'word', label: '查询单词', type: 'string', required: true } ],
    outputSchema: [ { field: 'definition', label: '释义', type: 'string' } ],
    requirements: [ { type: 'client', label: '需客户端在线' }, { type: 'internet', label: '需外网' } ],
  },
  {
    type: 'sunrisesunset_search',
    name: 'Sunrise-Sunset 日出日落',
    category: 'utility',
    description: '通过 Sunrise-Sunset API 查询全球任意地点的日出、日落时间和日照时长，基于经纬度坐标计算指定日期的太阳运行数据。该API免费开放，无需API密钥即可使用。需客户端在线且可访问外网。输出包含日出时间、日落时间、日照时长、民用晨光和昏影时间，适用于户外活动规划、摄影黄金时段安排和日出日落提醒。',
    iconImage: sunrisesunsetIcon,
    color: '#FF8C00',
    defaultData: { label: '日出日落', config: { lat: 39.9, lng: 116.4 } },
    inputSchema: [ { field: 'lat', label: '纬度', type: 'number', required: true }, { field: 'lng', label: '经度', type: 'number', required: true } ],
    outputSchema: [ { field: 'sunrise', label: '日出', type: 'string' }, { field: 'sunset', label: '日落', type: 'string' } ],
    requirements: [ { type: 'client', label: '需客户端在线' }, { type: 'internet', label: '需外网' } ],
  },
  {
    type: 'timeapi_search',
    name: 'timeapi.io 时区时间',
    category: 'utility',
    description: '通过 timeapi.io 获取指定时区的当前日期和时间，支持全球任意时区的实时时间查询。timeapi.io 是免费的时间API，无需API密钥即可使用。需客户端在线且可访问外网。输出包含日期、时间、时区名称、UTC偏移量和星期几，适用于多时区时间显示、定时任务调度和全球化应用时间同步。',
    iconImage: timeapiIcon,
    color: '#4A90D9',
    defaultData: { label: '时区时间', config: { timezone: 'Asia/Shanghai' } },
    inputSchema: [ { field: 'timezone', label: '时区', type: 'string', required: true } ],
    outputSchema: [ { field: 'dateTime', label: '时间', type: 'string' } ],
    requirements: [ { type: 'client', label: '需客户端在线' }, { type: 'internet', label: '需外网' } ],
  },
  {
    type: 'zippopotam_search',
    name: 'Zippopotam 邮编查询',
    category: 'utility',
    description: '通过 Zippopotam API 查询全球各国的邮政编码对应的城市、州省和地理坐标。Zippopotam 是免费的邮编查询API，支持美国、中国、欧洲等多个国家和地区的邮编数据。需客户端在线且可访问外网。输出包含邮编、城市名称、州省、经纬度坐标，适用于地址验证、物流区域划分和地理位置服务。',
    iconImage: zippopotamIcon,
    color: '#2E8B57',
    defaultData: { label: '邮编查询', config: { countryCode: 'us', zipCode: '90210' } },
    inputSchema: [ { field: 'countryCode', label: '国家代码', type: 'string', defaultValue: 'us' }, { field: 'zipCode', label: '邮编', type: 'string', required: true } ],
    outputSchema: [ { field: 'city', label: '城市', type: 'string' } ],
    requirements: [ { type: 'client', label: '需客户端在线' }, { type: 'internet', label: '需外网' } ],
  },
  {
    type: 'countryis_search',
    name: 'country.is IP归属',
    category: 'utility',
    description: '通过 country.is API 查询IP地址对应的国家归属地和地理位置信息。country.is 是免费的IP地理位置查询API，无需API密钥即可使用。需客户端在线且可访问外网。输出包含IP地址、国家代码、国家名称和国旗信息，适用于访问者地域分析、内容区域限制和安全风控场景。',
    iconImage: countryisIcon,
    color: '#8B4513',
    defaultData: { label: 'IP归属', config: { ip: '8.8.8.8' } },
    inputSchema: [ { field: 'ip', label: 'IP地址', type: 'string', required: true } ],
    outputSchema: [ { field: 'country', label: '国家', type: 'string' } ],
    requirements: [ { type: 'client', label: '需客户端在线' }, { type: 'internet', label: '需外网' } ],
  },
  {
    type: 'erapi_search',
    name: 'open.er-api 汇率',
    category: 'utility',
    description: '通过 open.er-api.com 获取多币种实时汇率数据，支持全球160+种法定货币之间的汇率查询和换算。该API基于欧洲央行数据，免费开放使用。需客户端在线且可访问外网。输出包含基准货币、目标货币汇率列表和时间戳，适用于跨境电商定价、外汇换算和国际财务结算。',
    iconImage: erapiIcon,
    color: '#228B22',
    defaultData: { label: '汇率查询', config: { base: 'USD' } },
    inputSchema: [ { field: 'base', label: '基准货币', type: 'string', defaultValue: 'USD' } ],
    outputSchema: [ { field: 'rates', label: '汇率', type: 'json' } ],
    requirements: [ { type: 'client', label: '需客户端在线' }, { type: 'internet', label: '需外网' } ],
  },
  {
    type: 'fawazahmed_search',
    name: 'fawazahmed 汇率',
    category: 'utility',
    description: '通过 fawazahmed0/exchange-api 获取CDN加速的全币种实时汇率数据，支持全球150+种法定货币之间的汇率查询。该API通过CDN分发，响应速度快，免费开放使用。需客户端在线且可访问外网。输出包含基准货币、目标货币汇率列表和更新时间戳，适用于高频汇率查询、数字货币换算和跨境支付场景。',
    iconImage: fawazahmedIcon,
    color: '#FF6347',
    defaultData: { label: '汇率数据', config: { base: 'usd' } },
    inputSchema: [ { field: 'base', label: '基准货币', type: 'string', defaultValue: 'usd' } ],
    outputSchema: [ { field: 'currencies', label: '汇率数据', type: 'json' } ],
    requirements: [ { type: 'client', label: '需客户端在线' }, { type: 'internet', label: '需外网' } ],
  },
  {
    type: 'colorapi_search',
    name: 'The Color API',
    category: 'utility',
    description: '通过 The Color API 查询HEX颜色对应的RGB、HSL、HSV颜色值和颜色名称。The Color API 是免费的颜色数据API，提供精确的颜色空间转换和命名。需客户端在线且可访问外网。输出包含颜色名称、HEX值、RGB值、HSL值和亮度信息，适用于设计工具开发、UI配色方案和颜色数据标准化。',
    iconImage: colorapiIcon,
    color: '#24B1E0',
    defaultData: { label: '颜色查询', config: { hex: '24B1E0' } },
    inputSchema: [ { field: 'hex', label: 'HEX颜色', type: 'string', required: true } ],
    outputSchema: [ { field: 'name', label: '颜色名称', type: 'string' } ],
    requirements: [ { type: 'client', label: '需客户端在线' }, { type: 'internet', label: '需外网' } ],
  },
  {
    type: 'wttr_search',
    name: 'wttr.in 终端天气',
    category: 'utility',
    description: '通过 wttr.in 获取全球城市的实时天气状况和未来天气预报，支持中文城市名称查询。wttr.in 是知名的终端天气服务，以简洁直观的天气展示著称，免费开放使用。需客户端在线且可访问外网。输出包含温度、天气状况、湿度、风速和未来三天预报，适用于终端天气查询、出行建议和天气播报场景。',
    iconImage: wttrIcon,
    color: '#2563EB',
    defaultData: { label: 'wttr 天气', config: { city: 'Beijing' } },
    inputSchema: [ { field: 'city', label: '城市名称', type: 'string', defaultValue: 'Beijing' } ],
    outputSchema: [ { field: 'data', label: '天气详情', type: 'json' } ],
    requirements: [ { type: 'client', label: '需客户端在线' }, { type: 'internet', label: '需外网' } ],
  },

  {
    type: 'joke_search',
    name: 'JokeAPI 编程/趣味笑话',
    category: 'utility',
    description: '通过 JokeAPI 获取编程、趣味和日常笑话内容，支持多种笑话类型和分类筛选。JokeAPI 是免费的笑话数据API，提供单段式和两段式笑话，内容安全健康。需客户端在线且可访问外网。输出包含笑话类型、铺垫和笑点内容，适用于聊天机器人、娱乐应用和内容创作素材。',
    iconImage: jokeIcon,
    color: '#F59E0B',
    defaultData: { label: 'Joke 笑话', config: { category: 'Programming' } },
    inputSchema: [ { field: 'category', label: '笑话类型', type: 'string', defaultValue: 'Programming' } ],
    outputSchema: [ { field: 'joke', label: '笑话内容', type: 'string' } ],
    requirements: [ { type: 'client', label: '需客户端在线' }, { type: 'internet', label: '需外网' } ],
  },
  {
    type: 'ipify_search',
    name: 'ipify 公网IP查询',
    category: 'utility',
    description: '通过 ipify API 获取客户端当前的公网IP地址，支持IPv4和IPv6格式查询。ipify 是最简单的公网IP查询服务，免费开放使用，无需API密钥。需客户端在线且可访问外网。输出包含公网IP地址和IP版本信息，适用于网络诊断、IP白名单管理和动态DNS更新场景。',
    iconImage: ipifyIcon,
    color: '#10B981',
    defaultData: { label: '公网IP', config: {} },
    inputSchema: [],
    outputSchema: [ { field: 'ip', label: 'IP地址', type: 'string' } ],
    requirements: [ { type: 'client', label: '需客户端在线' }, { type: 'internet', label: '需外网' } ],
  },
  {
    type: 'shopify_search',
    name: 'Shopify 独立站商品',
    category: 'ecommerce',
    description: '检索 Shopify 店铺的公开商品清单，获取商品标题、价格、图片、描述和库存信息。Shopify 是全球领先的独立站建站平台，承载数百万商家的商品销售数据。需客户端在线且可访问外网，需提供店铺域名。输出包含商品列表、价格、图片URL和商品链接，适用于竞品商品分析、选品调研和电商数据收集。',
    iconImage: shopifyIcon,
    color: '#96BF48',
    defaultData: { label: 'Shopify 商品', config: { storeUrl: '', limit: 20 } },
    inputSchema: [
      { field: 'storeUrl', label: '店铺域名/URL', type: 'string', required: true, placeholder: 'example.myshopify.com' },
      { field: 'keyword', label: '筛选关键词', type: 'string' },
      { field: 'limit', label: '最多获取数', type: 'number', defaultValue: 20 },
    ],
    outputSchema: [
      { field: 'count', label: '商品数量', type: 'number' },
      { field: 'items', label: '商品列表', type: 'array' },
    ],
    requirements: [ { type: 'client', label: '需客户端在线' }, { type: 'internet', label: '需外网' } ],
  },
  // ══════════════════════════════════════════════════════
  // 娱乐/影视/文化类节点 (10 源)
  // ══════════════════════════════════════════════════════
  {
    type: 'variety_search',
    name: 'Variety 好莱坞影视娱乐 (Variety Entertainment)',
    category: 'news_data',
    description: '【功能】采集全球顶级娱乐媒体 Variety 的影视产业新闻、票房数据、剧集评论与好莱坞深度报道。【用法】配置 keyword 搜索词（如 "Marvel"、"box office"、"film"）与采集数量 maxCount（1-100）。【场景与输出】需客户端在线且可访问外网。输出包含新闻标题、分类、发布时间及原文链接，适用于娱乐行业情报追踪、影视热点监控与文娱选题分析。',
    iconImage: varietyIcon,
    color: '#8E44AD',
    defaultData: { label: 'Variety 影视娱乐', config: { keyword: '', maxCount: 10 } },
    inputSchema: [
      { field: 'keyword', label: '搜索关键词', type: 'string', required: true, placeholder: '例如: film, tv, box office' },
      { field: 'maxCount', label: '采集数量', type: 'number', defaultValue: 10, description: '每次最多采集数量 (1-100)' },
    ],
    outputSchema: [
      { field: 'successCount', label: '成功数量', type: 'number' },
      { field: 'failCount', label: '失败数量', type: 'number' },
      { field: 'items', label: '数据列表', type: 'array' },
    ],
    requirements: [
      { type: 'client', label: '需客户端在线' },
      { type: 'internet', label: '需外网' },
    ],
  },
  {
    type: 'hollywood_reporter_search',
    name: 'Hollywood Reporter 好莱坞报道 (The Hollywood Reporter)',
    category: 'news_data',
    description: '【功能】采集好莱坞权威媒体 The Hollywood Reporter 的电影资讯、流媒体动态、明星专访与颁奖季分析。【用法】配置 keyword 关键词（如 "Netflix"、"Cannes"、"movie review"）与采集数量 maxCount（1-100）。【场景与输出】需客户端在线且可访问外网。输出包含文章标题、正文摘要、发布时间与原文链接，适用于全球影视动态跟踪、海外文娱资讯聚合与影视评论创作。',
    iconImage: hollywoodReporterIcon,
    color: '#000000',
    defaultData: { label: '好莱坞报道', config: { keyword: '', maxCount: 10 } },
    inputSchema: [
      { field: 'keyword', label: '搜索关键词', type: 'string', required: true, placeholder: '例如: movies, tv, entertainment' },
      { field: 'maxCount', label: '采集数量', type: 'number', defaultValue: 10, description: '每次最多采集数量 (1-100)' },
    ],
    outputSchema: [
      { field: 'successCount', label: '成功数量', type: 'number' },
      { field: 'failCount', label: '失败数量', type: 'number' },
      { field: 'items', label: '数据列表', type: 'array' },
    ],
    requirements: [
      { type: 'client', label: '需客户端在线' },
      { type: 'internet', label: '需外网' },
    ],
  },
  {
    type: 'deadline_search',
    name: 'Deadline 好莱坞独家资讯 (Deadline Hollywood)',
    category: 'news_data',
    description: '【功能】采集好莱坞一线独家快讯网站 Deadline 的影视项目开拍、选角签约、档期变更与行业独家爆料。【用法】配置 keyword 关键词（如 "casting"、"box office"、"renewal"）与采集数量 maxCount（1-100）。【场景与输出】需客户端在线且可访问外网。输出包含突发新闻标题、详细快讯、时间与链接，适合影视行业情报速递、第一手独家选题抓取。',
    iconImage: deadlineIcon,
    color: '#D35400',
    defaultData: { label: 'Deadline 影视独家', config: { keyword: '', maxCount: 10 } },
    inputSchema: [
      { field: 'keyword', label: '搜索关键词', type: 'string', required: true, placeholder: '例如: film, tv, industry' },
      { field: 'maxCount', label: '采集数量', type: 'number', defaultValue: 10, description: '每次最多采集数量 (1-100)' },
    ],
    outputSchema: [
      { field: 'successCount', label: '成功数量', type: 'number' },
      { field: 'failCount', label: '失败数量', type: 'number' },
      { field: 'items', label: '数据列表', type: 'array' },
    ],
    requirements: [
      { type: 'client', label: '需客户端在线' },
      { type: 'internet', label: '需外网' },
    ],
  },
  {
    type: 'billboard_search',
    name: 'Billboard 音乐榜单与资讯 (Billboard Charts)',
    category: 'news_data',
    description: '【功能】采集全球权威音乐排行榜 Billboard 的 Hot 100、Billboard 200 榜单排名、流行音乐动态与新单专辑资讯。【用法】配置 keyword 关键词（如 "Hot 100"、"Taylor Swift"、"album"）与采集数量 maxCount（1-100）。【场景与输出】需客户端在线且可访问外网。输出包含榜单名称、歌曲/艺人、排名和发布时间，适用于流行音乐趋势分析、榜单盘点与音乐内容创作。',
    iconImage: billboardIcon,
    color: '#E74C3C',
    defaultData: { label: 'Billboard 音乐榜单', config: { keyword: '', maxCount: 10 } },
    inputSchema: [
      { field: 'keyword', label: '搜索关键词', type: 'string', required: true, placeholder: '例如: charts, news, reviews' },
      { field: 'maxCount', label: '采集数量', type: 'number', defaultValue: 10, description: '每次最多采集数量 (1-100)' },
    ],
    outputSchema: [
      { field: 'successCount', label: '成功数量', type: 'number' },
      { field: 'failCount', label: '失败数量', type: 'number' },
      { field: 'items', label: '数据列表', type: 'array' },
    ],
    requirements: [
      { type: 'client', label: '需客户端在线' },
      { type: 'internet', label: '需外网' },
    ],
  },
  {
    type: 'tmz_search',
    name: 'TMZ 名人娱乐八卦 (TMZ Celebrity News)',
    category: 'news_data',
    description: '【功能】采集全球最大名人娱乐八卦媒体 TMZ 的突发名人事件、独家娱乐八卦、狗仔动态与流行文化热点。【用法】配置 keyword 关键词（如 "celebrity"、"music"、"hollywood"）与采集数量 maxCount（1-100）。【场景与输出】需客户端在线且可访问外网。输出包含爆料标题、事件概要、发布时间与原文链接，适用于娱乐八卦追踪、海外名人动态监控与社交话题热点挖掘。',
    iconImage: tmzIcon,
    color: '#C0392B',
    defaultData: { label: 'TMZ 娱乐八卦', config: { keyword: '', maxCount: 10 } },
    inputSchema: [
      { field: 'keyword', label: '搜索关键词', type: 'string', required: true, placeholder: '例如: celebrity, tv, music' },
      { field: 'maxCount', label: '采集数量', type: 'number', defaultValue: 10, description: '每次最多采集数量 (1-100)' },
    ],
    outputSchema: [
      { field: 'successCount', label: '成功数量', type: 'number' },
      { field: 'failCount', label: '失败数量', type: 'number' },
      { field: 'items', label: '数据列表', type: 'array' },
    ],
    requirements: [
      { type: 'client', label: '需客户端在线' },
      { type: 'internet', label: '需外网' },
    ],
  },
  {
    type: 'ign_search',
    name: 'IGN 游戏与影视评测 (IGN Gaming & Entertainment)',
    category: 'news_data',
    description: '【功能】采集全球最大游戏媒体 IGN 的主机/PC/手游评测、权威评分、游戏攻略与科幻影视资讯。【用法】配置 keyword 关键词（如 "PS5"、"GTA"、"review"）与采集数量 maxCount（1-100）。【场景与输出】需客户端在线且可访问外网。输出包含评测标题、IGN评分、游戏分类与文章链接，适用于游戏发售动态监控、专业评测聚合与玩家社区内容建设。',
    iconImage: ignIcon,
    color: '#FF0000',
    defaultData: { label: 'IGN 游戏评测', config: { keyword: '', maxCount: 10 } },
    inputSchema: [
      { field: 'keyword', label: '搜索关键词', type: 'string', required: true, placeholder: '例如: games, movies, tv' },
      { field: 'maxCount', label: '采集数量', type: 'number', defaultValue: 10, description: '每次最多采集数量 (1-100)' },
    ],
    outputSchema: [
      { field: 'successCount', label: '成功数量', type: 'number' },
      { field: 'failCount', label: '失败数量', type: 'number' },
      { field: 'items', label: '数据列表', type: 'array' },
    ],
    requirements: [
      { type: 'client', label: '需客户端在线' },
      { type: 'internet', label: '需外网' },
    ],
  },
  {
    type: 'polygon_search',
    name: 'Polygon 游戏文化与资讯 (Polygon Gaming Culture)',
    category: 'news_data',
    description: '【功能】采集知名游戏与流行文化媒体 Polygon 的深度游戏评测、独立游戏专题、极客文化与ACG动态。【用法】配置 keyword 关键词（如 "Nintendo"、"Indie"、"anime"）与采集数量 maxCount（1-100）。【场景与输出】需客户端在线且可访问外网。输出包含专题标题、文章导读、分类与原文链接，适用于深度游戏产业观察、文化评论与游戏玩家资讯流构建。',
    iconImage: polygonIcon,
    color: '#8B5CF6',
    defaultData: { label: 'Polygon 游戏文化', config: { keyword: '', maxCount: 10 } },
    inputSchema: [
      { field: 'keyword', label: '搜索关键词', type: 'string', required: true, placeholder: '例如: reviews, news, features' },
      { field: 'maxCount', label: '采集数量', type: 'number', defaultValue: 10, description: '每次最多采集数量 (1-100)' },
    ],
    outputSchema: [
      { field: 'successCount', label: '成功数量', type: 'number' },
      { field: 'failCount', label: '失败数量', type: 'number' },
      { field: 'items', label: '数据列表', type: 'array' },
    ],
    requirements: [
      { type: 'client', label: '需客户端在线' },
      { type: 'internet', label: '需外网' },
    ],
  },
  {
    type: 'douban_movie_search',
    name: '豆瓣电影评分与热门 (Douban Movie)',
    category: 'news_data',
    description: '【功能】采集国内权威电影社区“豆瓣电影”的热门上映电影、高分榜单、评分数据与影评摘要。【用法】配置 keyword 关键词（如 "热门"、"最新"、"科幻" 或电影名称）与采集数量 maxCount（1-100）。【场景与输出】需客户端在线。输出包含电影片名、豆瓣评分、演职员信息、电影简介与条目链接，适用于影视推荐榜单制作、口碑分析与电影解说素材收集。',
    iconImage: doubanMovieIcon,
    color: '#007722',
    defaultData: { label: '豆瓣电影', config: { keyword: '', maxCount: 10 } },
    inputSchema: [
      { field: 'keyword', label: '搜索关键词', type: 'string', required: true, placeholder: '例如: 热门, 最新, 经典' },
      { field: 'maxCount', label: '采集数量', type: 'number', defaultValue: 10, description: '每次最多采集数量 (1-100)' },
    ],
    outputSchema: [
      { field: 'successCount', label: '成功数量', type: 'number' },
      { field: 'failCount', label: '失败数量', type: 'number' },
      { field: 'items', label: '数据列表', type: 'array' },
    ],
    requirements: [
      { type: 'client', label: '需客户端在线' },
    ],
  },
  {
    type: 'douban_book_search',
    name: '豆瓣读书评分与书单 (Douban Book)',
    category: 'news_data',
    description: '【功能】采集“豆瓣读书”热门图书、高分书单、图书评分、内容简介与读者书评。【用法】配置 keyword 关键词（如 "哲学"、"心理学"、"小说" 或书名）与采集数量 maxCount（1-100）。【场景与输出】需客户端在线。输出包含书名、作者、豆瓣评分、出版信息与简介，适用于好书推荐、读书笔记生成与文化内容沉淀。',
    iconImage: doubanBookIcon,
    color: '#007722',
    defaultData: { label: '豆瓣读书', config: { keyword: '', maxCount: 10 } },
    inputSchema: [
      { field: 'keyword', label: '搜索关键词', type: 'string', required: true, placeholder: '例如: 文学, 小说, 社科' },
      { field: 'maxCount', label: '采集数量', type: 'number', defaultValue: 10, description: '每次最多采集数量 (1-100)' },
    ],
    outputSchema: [
      { field: 'successCount', label: '成功数量', type: 'number' },
      { field: 'failCount', label: '失败数量', type: 'number' },
      { field: 'items', label: '数据列表', type: 'array' },
    ],
    requirements: [
      { type: 'client', label: '需客户端在线' },
    ],
  },
  {
    type: 'douban_gallery_search',
    name: '豆瓣广场热门话题 (Douban Gallery Topics)',
    category: 'news_data',
    description: '【功能】采集豆瓣社区“豆瓣广场/小组动态”的热门文化讨论、生活话题、广播动态与精华日记。【用法】配置 keyword 关键词（如 "生活"、"书影音"、"旅行"）与采集数量 maxCount（1-100）。【场景与输出】需客户端在线。输出包含话题标题、作者昵称、讨论热度、回复数与原文链接，适用于文艺圈舆情观察、社区热点捕捉与小众文化选题策划。',
    iconImage: doubanGalleryIcon,
    color: '#007722',
    defaultData: { label: '豆瓣广场话题', config: { keyword: '', maxCount: 10 } },
    inputSchema: [
      { field: 'keyword', label: '搜索关键词', type: 'string', required: true, placeholder: '例如: 话题, 讨论, 日记' },
      { field: 'maxCount', label: '采集数量', type: 'number', defaultValue: 10, description: '每次最多采集数量 (1-100)' },
    ],
    outputSchema: [
      { field: 'successCount', label: '成功数量', type: 'number' },
      { field: 'failCount', label: '失败数量', type: 'number' },
      { field: 'items', label: '数据列表', type: 'array' },
    ],
    requirements: [
      { type: 'client', label: '需客户端在线' },
    ],
  },
  // ══════════════════════════════════════════════════════
  // 学术/论文类节点 (1 新增源)
  // ══════════════════════════════════════════════════════
  {
    type: 'medrxiv_search',
    name: 'medRxiv 医学预印本论文 (medRxiv Preprint Papers)',
    category: 'news_data',
    description: '【功能】采集全球权威医学预印本平台 medRxiv 的最新临床医学、公共卫生、流行病学与生物医药前沿科研论文。【用法】配置 keyword 搜索词（如 "cancer"、"immunology"、"CRISPR"）与采集数量 maxCount（1-100）。【场景与输出】需客户端在线且可访问外网。输出包含论文标题、作者团队、摘要正文、学科分类与PDF下载链接，适用于医学学术调研、医药前沿跟踪与文献速递。',
    iconImage: medrxivIcon,
    color: '#0052CC',
    defaultData: { label: 'medRxiv 医学论文', config: { keyword: '', maxCount: 10 } },
    inputSchema: [
      { field: 'keyword', label: '搜索关键词', type: 'string', required: true, placeholder: '例如: cancer, vaccine, covid' },
      { field: 'maxCount', label: '采集数量', type: 'number', defaultValue: 10, description: '每次最多采集数量 (1-100)' },
    ],
    outputSchema: [
      { field: 'successCount', label: '成功数量', type: 'number' },
      { field: 'failCount', label: '失败数量', type: 'number' },
      { field: 'items', label: '数据列表', type: 'array' },
    ],
    requirements: [
      { type: 'client', label: '需客户端在线' },
      { type: 'internet', label: '需外网' },
    ],
  },
  // ══════════════════════════════════════════════════════
  // 政府/公开数据类节点 (5 新增源)
  // ══════════════════════════════════════════════════════
  {
    type: 'stats_gov_search',
    name: '国家统计局官方数据 (NBS China Statistics)',
    category: 'news_data',
    description: '【功能】采集中国国家统计局发布的宏观经济指标、全国人口、物价指数CPI/PPI、工业用电与社会发展统计公报。【用法】配置 keyword 关键词（如 "GDP"、"CPI"、"人口"、"PMI"）与采集数量 maxCount（1-100）。【场景与输出】需客户端在线。输出包含统计报告标题、发布时间、指标数值与官方原文链接，适用于宏观经济研报、政策研究与数据图表可视化。',
    iconImage: statsGovIcon,
    color: '#1A73E8',
    defaultData: { label: '国家统计局数据', config: { keyword: '', maxCount: 10 } },
    inputSchema: [
      { field: 'keyword', label: '搜索关键词', type: 'string', required: true, placeholder: '例如: GDP, 人口, 工业' },
      { field: 'maxCount', label: '采集数量', type: 'number', defaultValue: 10, description: '每次最多采集数量 (1-100)' },
    ],
    outputSchema: [
      { field: 'successCount', label: '成功数量', type: 'number' },
      { field: 'failCount', label: '失败数量', type: 'number' },
      { field: 'items', label: '数据列表', type: 'array' },
    ],
    requirements: [
      { type: 'client', label: '需客户端在线' },
    ],
  },
  {
    type: 'sse_search',
    name: '上交所行情与公告 (SSE Shanghai Stock Exchange)',
    category: 'news_data',
    description: '【功能】采集上海证券交易所（上交所）官方发布的上市公司公告、监管动态、科创板资讯与市场公开交易数据。【用法】配置 keyword 关键词（如 "年报"、"科创板"、"问询函" 或股票代码）与采集数量 maxCount（1-100）。【场景与输出】需客户端在线。输出包含公告标题、证券代码/简称、发布时间与公告详情链接，适用于A股上市公司舆情监控、合规风险预警与证券投资分析。',
    iconImage: sseIcon,
    color: '#003DA5',
    defaultData: { label: '上交所证券公告', config: { keyword: '', maxCount: 10 } },
    inputSchema: [
      { field: 'keyword', label: '搜索关键词', type: 'string', required: true, placeholder: '例如: 股票, 债券, 基金' },
      { field: 'maxCount', label: '采集数量', type: 'number', defaultValue: 10, description: '每次最多采集数量 (1-100)' },
    ],
    outputSchema: [
      { field: 'successCount', label: '成功数量', type: 'number' },
      { field: 'failCount', label: '失败数量', type: 'number' },
      { field: 'items', label: '数据列表', type: 'array' },
    ],
    requirements: [
      { type: 'client', label: '需客户端在线' },
    ],
  },
  {
    type: 'chinamoney_search',
    name: '中国货币网同业与利率 (ChinaMoney CFETS)',
    category: 'news_data',
    description: '【功能】采集中国外汇交易中心（全国银行间同业拆借中心）官方发布的银行间同业拆借利率Shibor、LPR贷款市场报价利率、外汇汇率与债券行情。【用法】配置 keyword 关键词（如 "Shibor"、"LPR"、"汇率"、"国债"）与采集数量 maxCount（1-100）。【场景与输出】需客户端在线。输出包含基准利率名称、最新数值、变动幅度、发布日期与官方链接，适用于固定收益分析、银行资金面监控与金融宏观建模。',
    iconImage: chinamoneyIcon,
    color: '#0066CC',
    defaultData: { label: '中国货币网数据', config: { keyword: '', maxCount: 10 } },
    inputSchema: [
      { field: 'keyword', label: '搜索关键词', type: 'string', required: true, placeholder: '例如: 利率, 汇率, 债券' },
      { field: 'maxCount', label: '采集数量', type: 'number', defaultValue: 10, description: '每次最多采集数量 (1-100)' },
    ],
    outputSchema: [
      { field: 'successCount', label: '成功数量', type: 'number' },
      { field: 'failCount', label: '失败数量', type: 'number' },
      { field: 'items', label: '数据列表', type: 'array' },
    ],
    requirements: [
      { type: 'client', label: '需客户端在线' },
    ],
  },
  {
    type: 'worldometers_search',
    name: 'Worldometers 全球实时统计 (Worldometers Real-time Stats)',
    category: 'news_data',
    description: '【功能】采集全球著名实时数据统计平台 Worldometers 的世界人口实时计数、全球经济总量、能源消耗、环境生态与健康统计数据。【用法】配置 keyword 关键词（如 "population"、"health"、"energy"、"economy"）与采集数量 maxCount（1-100）。【场景与输出】需客户端在线且可访问外网。输出包含实时统计指标、当前计数值、日增长量与更新时间，适用于科普内容制作、全球发展态势监测与动态信息图展示。',
    iconImage: worldometersIcon,
    color: '#2C3E50',
    defaultData: { label: 'Worldometers 统计', config: { keyword: '', maxCount: 10 } },
    inputSchema: [
      { field: 'keyword', label: '搜索关键词', type: 'string', required: true, placeholder: '例如: population, economy, energy' },
      { field: 'maxCount', label: '采集数量', type: 'number', defaultValue: 10, description: '每次最多采集数量 (1-100)' },
    ],
    outputSchema: [
      { field: 'successCount', label: '成功数量', type: 'number' },
      { field: 'failCount', label: '失败数量', type: 'number' },
      { field: 'items', label: '数据列表', type: 'array' },
    ],
    requirements: [
      { type: 'client', label: '需客户端在线' },
      { type: 'internet', label: '需外网' },
    ],
  },
  {
    type: 'ourworldindata_search',
    name: 'Our World in Data 全球发展数据 (Our World in Data Charts)',
    category: 'news_data',
    description: '【功能】采集牛津大学主导的全球可视化智库 Our World in Data 的科学研究图表、全球贫困、气候变化、公共卫生与技术普及数据。【用法】配置 keyword 搜索词（如 "climate"、"energy"、"poverty"、"vaccination"）与采集数量 maxCount（1-100）。【场景与输出】需客户端在线且可访问外网。输出包含研究主题标题、核心统计数据、交互图表链接与报告全文，适用于深度研究报告、数据新闻写作与科学论证支持。',
    iconImage: ourworldindataIcon,
    color: '#8B5CF6',
    defaultData: { label: 'Our World in Data', config: { keyword: '', maxCount: 10 } },
    inputSchema: [
      { field: 'keyword', label: '搜索关键词', type: 'string', required: true, placeholder: '例如: health, energy, education' },
      { field: 'maxCount', label: '采集数量', type: 'number', defaultValue: 10, description: '每次最多采集数量 (1-100)' },
    ],
    outputSchema: [
      { field: 'successCount', label: '成功数量', type: 'number' },
      { field: 'failCount', label: '失败数量', type: 'number' },
      { field: 'items', label: '数据列表', type: 'array' },
    ],
    requirements: [
      { type: 'client', label: '需客户端在线' },
      { type: 'internet', label: '需外网' },
    ],
  },
  // ══════════════════════════════════════════════════════
  // 招聘类节点 (4 源)
  // ══════════════════════════════════════════════════════
  {
    type: 'lagou_search',
    name: '拉勾互联网招聘 (Lagou Tech Jobs)',
    category: 'news_data',
    description: '【功能】采集国内知名互联网招聘平台“拉勾网”的技术开发、产品设计、AI算法与运营管理等互联网岗位信息。【用法】配置 keyword 职位/技术栈关键词（如 "Golang"、"前端架构师"、"AI产品经理"）与采集数量 maxCount（1-100）。【场景与输出】需客户端在线。输出包含岗位名称、所属公司、薪资范围、学历经验要求与职位详情链接，适用于互联网求职意向监控、薪酬调研与行业人才需求分析。',
    iconImage: lagouIcon,
    color: '#00B36A',
    defaultData: { label: '拉勾招聘', config: { keyword: '', maxCount: 10 } },
    inputSchema: [
      { field: 'keyword', label: '搜索关键词', type: 'string', required: true, placeholder: '例如: 前端, 产品经理, Java' },
      { field: 'maxCount', label: '采集数量', type: 'number', defaultValue: 10, description: '每次最多采集数量 (1-100)' },
    ],
    outputSchema: [
      { field: 'successCount', label: '成功数量', type: 'number' },
      { field: 'failCount', label: '失败数量', type: 'number' },
      { field: 'items', label: '数据列表', type: 'array' },
    ],
    requirements: [
      { type: 'client', label: '需客户端在线' },
    ],
  },
  {
    type: 'zhipin_search',
    name: 'BOSS直聘求职招聘 (BOSS Zhipin Jobs)',
    category: 'news_data',
    description: '【功能】采集中国领先的直聘平台“BOSS直聘”的全行业最新热招职位、企业直聊岗位与薪资待遇信息。【用法】配置 keyword 职位或技能关键词（如 "Python"、"新媒体运营"、"销售总监"）与采集数量 maxCount（1-100）。【场景与输出】需客户端在线。输出包含职位名称、公司全称、薪资区间、所在城市/商圈与职位详情链接，适用于全行业人才供需洞察、精准求职筛选与招聘市场动态分析。',
    iconImage: zhipinIcon,
    color: '#00BEBD',
    defaultData: { label: 'BOSS直聘', config: { keyword: '', maxCount: 10 } },
    inputSchema: [
      { field: 'keyword', label: '搜索关键词', type: 'string', required: true, placeholder: '例如: 前端, 产品经理, 运营' },
      { field: 'maxCount', label: '采集数量', type: 'number', defaultValue: 10, description: '每次最多采集数量 (1-100)' },
    ],
    outputSchema: [
      { field: 'successCount', label: '成功数量', type: 'number' },
      { field: 'failCount', label: '失败数量', type: 'number' },
      { field: 'items', label: '数据列表', type: 'array' },
    ],
    requirements: [
      { type: 'client', label: '需客户端在线' },
    ],
  },
  {
    type: '51job_search',
    name: '前程无忧综合招聘 (51job Careers)',
    category: 'news_data',
    description: '【功能】采集老牌综合招聘门户“前程无忧 (51job)”覆盖制造、金融、外企、快消及科技等全产业的招聘职位。【用法】配置 keyword 岗位关键词（如 "外贸业务员"、"机械工程师"、"会计"）与采集数量 maxCount（1-100）。【场景与输出】需客户端在线。输出包含岗位名称、雇主公司、薪资水平、工作地点与投递链接，适用于传统与实体行业职位聚合、劳动力市场趋势研究及就业信息看板建设。',
    iconImage: job51Icon,
    color: '#FF6600',
    defaultData: { label: '前程无忧招聘', config: { keyword: '', maxCount: 10 } },
    inputSchema: [
      { field: 'keyword', label: '搜索关键词', type: 'string', required: true, placeholder: '例如: 前端, 会计, 销售' },
      { field: 'maxCount', label: '采集数量', type: 'number', defaultValue: 10, description: '每次最多采集数量 (1-100)' },
    ],
    outputSchema: [
      { field: 'successCount', label: '成功数量', type: 'number' },
      { field: 'failCount', label: '失败数量', type: 'number' },
      { field: 'items', label: '数据列表', type: 'array' },
    ],
    requirements: [
      { type: 'client', label: '需客户端在线' },
    ],
  },
  {
    type: 'linkedin_jobs_search',
    name: 'LinkedIn Jobs 领英海外职位 (LinkedIn Global Jobs)',
    category: 'news_data',
    description: '【功能】采集全球最大职业社交平台 LinkedIn Jobs 的跨国公司岗位、远程工作 (Remote)、出海业务与海外高薪职位。【用法】配置 keyword 英文职位关键词（如 "Senior Software Engineer"、"Product Marketing"、"Remote"）与采集数量 maxCount（1-100）。【场景与输出】需客户端在线且可访问外网。输出包含职位名称、企业名称、工作地点国家/城市、工作职责与投递链接，适用于海外求职、跨国人才猎聘与全球雇主品牌调研。',
    iconImage: linkedinJobsIcon,
    color: '#0A66C2',
    defaultData: { label: 'LinkedIn 海外职位', config: { keyword: '', maxCount: 10 } },
    inputSchema: [
      { field: 'keyword', label: '搜索关键词', type: 'string', required: true, placeholder: '例如: software engineer, product manager' },
      { field: 'maxCount', label: '采集数量', type: 'number', defaultValue: 10, description: '每次最多采集数量 (1-100)' },
    ],
    outputSchema: [
      { field: 'successCount', label: '成功数量', type: 'number' },
      { field: 'failCount', label: '失败数量', type: 'number' },
      { field: 'items', label: '数据列表', type: 'array' },
    ],
    requirements: [
      { type: 'client', label: '需客户端在线' },
      { type: 'internet', label: '需外网' },
    ],
  },
  // ══════════════════════════════════════════════════════
  // 金融行情类节点 (5 sources)
  // ══════════════════════════════════════════════════════
  {
    type: 'yahoo_finance_search',
    name: 'Yahoo Finance 雅虎全球金融行情 (Yahoo Finance Markets)',
    category: 'utility',
    description: '【功能】采集全球最大金融资讯平台 Yahoo Finance 的美股/港股/A股实时报价、股指（S&P 500、纳指）、外汇与大宗商品行情。【用法】配置 keyword 资产代码或公司名（如 "AAPL"、"TSLA"、"NVDA"、"^GSPC"）与采集数量 maxCount（1-100）。【场景与输出】需客户端在线且可访问外网。输出包含股票代码、最新成交价、日内涨跌额与涨跌幅、成交量、市值与图表链接，适用于美股盯盘、全球资产配置与量化策略输入。',
    iconImage: yahooFinanceIcon,
    color: '#6001D2',
    defaultData: { label: 'Yahoo Finance 雅虎行情', config: { keyword: '', maxCount: 10 } },
    inputSchema: [
      { field: 'keyword', label: '股票代码/关键词', type: 'string', required: true, placeholder: '例如: AAPL / TSLA / BTC-USD' },
      { field: 'maxCount', label: '采集数量', type: 'number', defaultValue: 10, description: '每次最多采集数量 (1-100)' },
    ],
    outputSchema: [
      { field: 'successCount', label: '成功数量', type: 'number' },
      { field: 'failCount', label: '失败数量', type: 'number' },
      { field: 'items', label: '数据列表', type: 'array' },
    ],
    requirements: [
      { type: 'client', label: '需客户端在线' },
      { type: 'internet', label: '需外网' },
    ],
  },
  {
    type: 'sina_finance_search',
    name: '新浪财经快讯与行情 (Sina Finance News & Stock)',
    category: 'utility',
    description: '【功能】采集中国知名财经门户“新浪财经”的国内财经要闻、A股板块异动、宏观经济解读与券商研报要点。【用法】配置 keyword 财经搜索词（如 "大盘"、"新能源"、"降准" 或股票简称）与采集数量 maxCount（1-100）。【场景与输出】需客户端在线。输出包含财经新闻标题、发布时间、分类标签与原文链接，适用于国内宏观政策追踪、股市情绪面分析与日常财经早报生成。',
    iconImage: sinaFinanceIcon,
    color: '#E60012',
    defaultData: { label: '新浪财经快讯', config: { keyword: '', maxCount: 10 } },
    inputSchema: [
      { field: 'keyword', label: '搜索关键词', type: 'string', required: true, placeholder: '例如: 股票, 基金, 财经' },
      { field: 'maxCount', label: '采集数量', type: 'number', defaultValue: 10, description: '每次最多采集数量 (1-100)' },
    ],
    outputSchema: [
      { field: 'successCount', label: '成功数量', type: 'number' },
      { field: 'failCount', label: '失败数量', type: 'number' },
      { field: 'items', label: '数据列表', type: 'array' },
    ],
    requirements: [
      { type: 'client', label: '需客户端在线' },
      { type: 'internet', label: '需外网' },
    ],
  },
  {
    type: 'eastmoney_search',
    name: '东方财富 A股与基金行情 (Eastmoney Markets)',
    category: 'utility',
    description: '【功能】采集中国头部金融数据平台“东方财富网”的沪深A股实时行情、公募基金净值、行业板块资金流向与主力资金动向。【用法】配置 keyword 股票代码或名称（如 "600519"、"贵州茅台"、"半导体"）与采集数量 maxCount（1-100）。【场景与输出】需客户端在线。输出包含证券代码、名称、现价、涨跌幅、换手率、市盈率及盘口指标，适用于A股主力资金监控、自选股看板构建与基金投资辅助分析。',
    iconImage: eastmoneyIcon,
    color: '#E60012',
    defaultData: { label: '东方财富行情', config: { keyword: '', maxCount: 10 } },
    inputSchema: [
      { field: 'keyword', label: '股票代码/名称', type: 'string', required: true, placeholder: '例如: 000001 / 平安银行' },
      { field: 'maxCount', label: '采集数量', type: 'number', defaultValue: 10, description: '每次最多采集数量 (1-100)' },
    ],
    outputSchema: [
      { field: 'successCount', label: '成功数量', type: 'number' },
      { field: 'failCount', label: '失败数量', type: 'number' },
      { field: 'items', label: '数据列表', type: 'array' },
    ],
    requirements: [
      { type: 'client', label: '需客户端在线' },
      { type: 'internet', label: '需外网' },
    ],
  },
  {
    type: 'cls_telegraph_search',
    name: '财联社电报 7x24h 实时快讯 (CLS Telegraph)',
    category: 'utility',
    description: '【功能】采集专业财经通讯社“财联社”的 7x24 小时秒级财经电报、政经突发消息、上市公司盘中异动与海外重磅事件。【用法】配置 keyword 关键词过滤（如 "央行"、"人工智能"、"重组"、"地缘"）与采集数量 maxCount（1-100）。【场景与输出】需客户端在线。输出包含快讯正文、发布时间戳、重要度标识与原文链接，适用于金融机构盘中预警、舆情秒级响应与财经信息流推送。',
    iconImage: clsTelegraphIcon,
    color: '#D32F2F',
    defaultData: { label: '财联社 7x24h 快讯', config: { keyword: '', maxCount: 10 } },
    inputSchema: [
      { field: 'keyword', label: '搜索关键词', type: 'string', required: true, placeholder: '例如: 股市, 政策, 央行' },
      { field: 'maxCount', label: '采集数量', type: 'number', defaultValue: 10, description: '每次最多采集数量 (1-100)' },
    ],
    outputSchema: [
      { field: 'successCount', label: '成功数量', type: 'number' },
      { field: 'failCount', label: '失败数量', type: 'number' },
      { field: 'items', label: '数据列表', type: 'array' },
    ],
    requirements: [
      { type: 'client', label: '需客户端在线' },
      { type: 'internet', label: '需外网' },
    ],
  },
  {
    type: 'coinmarketcap_search',
    name: 'CoinMarketCap 加密货币行情 (CoinMarketCap Crypto)',
    category: 'utility',
    description: '【功能】采集全球权威加密资产数据平台 CoinMarketCap 的 20000+ 种数字货币实时价格、24小时涨跌幅、全球市值排名与全网交易量。【用法】配置 keyword 币种名称或代号（如 "BTC"、"Bitcoin"、"ETH"、"Solana"）与采集数量 maxCount（1-100）。【场景与输出】需客户端在线且可访问外网。输出包含代币名称、符号、美元单价、24h涨跌幅、7d走势、市值与成交量，适用于Web3资产看板、加密市场波动告警与数字货币研报编写。',
    iconImage: coinmarketcapIcon,
    color: '#3861FB',
    defaultData: { label: 'CoinMarketCap 币价', config: { keyword: '', maxCount: 10 } },
    inputSchema: [
      { field: 'keyword', label: '币种名称/代码', type: 'string', required: true, placeholder: '例如: BTC / bitcoin / ETH' },
      { field: 'maxCount', label: '采集数量', type: 'number', defaultValue: 10, description: '每次最多采集数量 (1-100)' },
    ],
    outputSchema: [
      { field: 'successCount', label: '成功数量', type: 'number' },
      { field: 'failCount', label: '失败数量', type: 'number' },
      { field: 'items', label: '数据列表', type: 'array' },
    ],
    requirements: [
      { type: 'client', label: '需客户端在线' },
      { type: 'internet', label: '需外网' },
    ],
  },
  // ══════════════════════════════════════════════════════
  // 体育赛事类节点 (4 sources)
  // ══════════════════════════════════════════════════════
  {
    type: 'zhibo8_search',
    name: '直播吧 体育赛程与新闻 (Zhibo8 Sports)',
    category: 'news_data',
    description: '【功能】采集中国知名体育平台“直播吧”的足球（五大联赛/中超/欧冠）、篮球（NBA/CBA）等热门赛事的即时赛况、赛程安排与战报新闻。【用法】配置 keyword 球队/联赛/球星关键词（如 "湖人"、"皇马"、"库里"、"欧冠"）与采集数量 maxCount（1-100）。【场景与输出】需客户端在线。输出包含赛事标题、对阵双方、比赛时间、当前比分与战报链接，适用于体育赛事日程提醒、战报自动播报与体育资讯公众号排版。',
    iconImage: zhibo8Icon,
    color: '#00A651',
    defaultData: { label: '直播吧 体育赛事', config: { keyword: '', maxCount: 10 } },
    inputSchema: [
      { field: 'keyword', label: '球队/联赛/球员', type: 'string', required: true, placeholder: '例如: 湖人 / NBA / 梅西' },
      { field: 'maxCount', label: '采集数量', type: 'number', defaultValue: 10, description: '每次最多采集数量 (1-100)' },
    ],
    outputSchema: [
      { field: 'successCount', label: '成功数量', type: 'number' },
      { field: 'failCount', label: '失败数量', type: 'number' },
      { field: 'items', label: '数据列表', type: 'array' },
    ],
    requirements: [
      { type: 'client', label: '需客户端在线' },
      { type: 'internet', label: '需外网' },
    ],
  },
  {
    type: 'hupu_post_search',
    name: '虎扑帖子搜索',
    category: 'hotsearch',
    description: '搜索虎扑论坛帖子，支持关键词搜索、多种排序方式（综合/最新发布/最早发布/亮回复数/回复数）。支持服务端执行（默认，稳定可靠）或客户端执行（使用本地网络）。核心逻辑由服务端统一维护，客户端动态拉取。',
    iconImage: hupuIcon,
    color: '#C01A20',
    badge: '多端运行',
    defaultData: { name: '虎扑帖子搜索', config: { keyword: '', category: 'all', maxCount: 20, sortby: 'general', executionMode: 'server' } },
    inputSchema: [
      {
        field: 'keyword',
        label: '搜索关键词',
        type: 'string',
        required: false,
        placeholder: '留空获取推荐热帖，或输入关键词搜索...',
        description: '输入要搜索的关键词；留空则直接获取虎扑首页/指定专区的热门推荐帖子',
      },
      {
        field: 'category',
        label: '专区分类',
        type: 'select',
        defaultValue: 'all',
        description: '当关键词留空时，从哪个专区获取默认热帖',
        options: [
          { label: '全部推荐（首页）', value: 'all' },
          { label: '步行街主干道', value: 'all-gambia' },
          { label: 'NBA专区', value: 'all-nba' },
          { label: 'CBA专区', value: 'all-cba' },
          { label: '国际足球', value: 'all-soccer' },
          { label: '中国足球', value: 'all-csl' },
          { label: '英雄联盟', value: 'all-lol' },
          { label: '数码科技', value: 'all-digital' },
          { label: '影视娱乐', value: 'all-ent' },
          { label: '综合体育', value: 'all-sports' },
        ],
      },
      {
        field: 'maxCount',
        label: '获取数量',
        type: 'number',
        defaultValue: 20,
        description: '最多返回多少条帖子（1-100）',
      },
      {
        field: 'sortby',
        label: '排序方式',
        type: 'select',
        defaultValue: 'general',
        description: '帖子的排序方式（仅在输入关键词搜索时生效）',
        options: [
          { label: '综合排序', value: 'general' },
          { label: '最新发布', value: 'createtime' },
          { label: '最早发布', value: 'createtimeasc' },
          { label: '最新回复', value: 'replytime' },
          { label: '亮回复数(近1月)', value: 'light' },
          { label: '回复数(近1月)', value: 'reply' },
        ],
      },
      {
        field: 'executionMode',
        label: '执行位置',
        type: 'select',
        defaultValue: 'server',
        description: '服务端执行（默认）：由服务端直接采集，无需客户端在线；客户端执行：由客户端本地网络采集，适合需要客户端IP的场景。',
        options: [
          { label: '服务端执行', value: 'server' },
          { label: '客户端执行', value: 'client' },
        ],
      },
    ],
    outputSchema: [
      { field: 'platform', label: '平台标识', type: 'string' },
      { field: 'name', label: '平台名称', type: 'string' },
      { field: 'keyword', label: '搜索关键词', type: 'string' },
      { field: 'category', label: '专区分类', type: 'string' },
      { field: 'itemCount', label: '帖子数', type: 'number' },
      { field: 'items', label: '帖子列表', type: 'array' },
      { field: 'fetchedAt', label: '采集时间', type: 'string' },
    ],
    requirements: [
      { type: 'multi-end', label: '多端运行' },
    ],
  },
  {
    type: 'bbc_sport_search',
    name: 'BBC Sport 英国国际体育赛事 (BBC Sport International)',
    category: 'news_data',
    description: '【功能】采集英国广播公司 BBC Sport 的英超足球、温网网球、F1赛车、奥运项目等国际顶级赛事的权威英文报道与赛果速递。【用法】配置 keyword 英文赛事或球队关键词（如 "Premier League"、"F1"、"Arsenal"、"Wimbledon"）与采集数量 maxCount（1-100）。【场景与输出】需客户端在线且可访问外网。输出包含英文新闻标题、赛事摘要、更新时间与官方报道链接，适用于国际体育赛事跟踪、外网英文战报编译与多语言体育资讯推送。',
    iconImage: bbcSportIcon,
    color: '#FFD700',
    defaultData: { label: 'BBC Sport 国际体育', config: { keyword: '', maxCount: 10 } },
    inputSchema: [
      { field: 'keyword', label: '赛事/球队/运动', type: 'string', required: true, placeholder: '例如: football / Premier League' },
      { field: 'maxCount', label: '采集数量', type: 'number', defaultValue: 10, description: '每次最多采集数量 (1-100)' },
    ],
    outputSchema: [
      { field: 'successCount', label: '成功数量', type: 'number' },
      { field: 'failCount', label: '失败数量', type: 'number' },
      { field: 'items', label: '数据列表', type: 'array' },
    ],
    requirements: [
      { type: 'client', label: '需客户端在线' },
      { type: 'internet', label: '需外网' },
    ],
  },
  {
    type: 'flashscore_search',
    name: 'Flashscore 全球体育实时比分 (Flashscore Live Scores)',
    category: 'news_data',
    description: '【功能】采集全球著名比分平台 Flashscore 覆盖 30+ 种体育运动、上千个联赛的全球赛事即时比分、半全场赛果与积分榜。【用法】配置 keyword 联赛或球队名称（如 "Premier League"、"Champions League"、"Lakers"）与采集数量 maxCount（1-100）。【场景与输出】需客户端在线且可访问外网。输出包含比赛名称、主客队伍、实时比分、比赛进行阶段（如完场/半场）与详细数据链接，适用于即时比分推演、赛事结果自动化通知与竞彩数据参考。',
    iconImage: flashscoreIcon,
    color: '#000000',
    defaultData: { label: 'Flashscore 实时比分', config: { keyword: '', maxCount: 10 } },
    inputSchema: [
      { field: 'keyword', label: '联赛/球队', type: 'string', required: true, placeholder: '例如: Premier League / Lakers' },
      { field: 'maxCount', label: '采集数量', type: 'number', defaultValue: 10, description: '每次最多采集数量 (1-100)' },
    ],
    outputSchema: [
      { field: 'successCount', label: '成功数量', type: 'number' },
      { field: 'failCount', label: '失败数量', type: 'number' },
      { field: 'items', label: '数据列表', type: 'array' },
    ],
    requirements: [
      { type: 'client', label: '需客户端在线' },
      { type: 'internet', label: '需外网' },
    ],
  },
  // ══════════════════════════════════════════════════════
  // 天气数据类节点 (2 sources)
  // ══════════════════════════════════════════════════════
  {
    type: 'weather_cn_search',
    name: '中国天气网 城市气象预报 (China Weather CN)',
    category: 'utility',
    description: '【功能】采集中国气象局“中国天气网”全国各省市县的实时天气实况、未来 7 天天气预报、空气质量指数 (AQI) 与极端灾害预警。【用法】配置 city 城市名称（如 "北京"、"上海"、"深圳"）与预报天数 maxCount（1-7）。【场景与输出】需客户端在线。输出包含目标城市、实时气温、天气现象（晴/雨/雪）、空气质量、风向风力与逐日预报数组，适用于生活助手、出行提醒、智能家居自动化与极端天气推送。',
    iconImage: weatherCnIcon,
    color: '#1E88E5',
    defaultData: { label: '中国天气网预报', config: { city: '', maxCount: 3 } },
    inputSchema: [
      { field: 'city', label: '城市', type: 'string', required: true, placeholder: '例如: 北京 / 上海 / 广州' },
      { field: 'maxCount', label: '预报天数', type: 'number', defaultValue: 3, description: '预报天数 (1-7)' },
    ],
    outputSchema: [
      { field: 'successCount', label: '成功数量', type: 'number' },
      { field: 'failCount', label: '失败数量', type: 'number' },
      { field: 'items', label: '数据列表', type: 'array' },
    ],
    requirements: [
      { type: 'client', label: '需客户端在线' },
      { type: 'internet', label: '需外网' },
    ],
  },
  {
    type: 'weather_com_search',
    name: 'Weather.com 全球城市天气 (The Weather Channel)',
    category: 'utility',
    description: '【功能】采集全球知名气象平台 Weather.com (The Weather Channel) 的全球各大城市多日气象预报、逐小时天气、紫外线指数与体感温度。【用法】配置 city 国际城市名称（如 "New York"、"Tokyo"、"London"）与预报天数 maxCount（1-10）。【场景与输出】需客户端在线且可访问外网。输出包含城市名、当前温度、湿度、降水概率、体感温度与未来多日天气趋势，适用于出境差旅提醒、跨国活动调度与全球化气象看板。',
    iconImage: weatherComIcon,
    color: '#0078D4',
    defaultData: { label: 'Weather.com 全球天气', config: { city: '', maxCount: 3 } },
    inputSchema: [
      { field: 'city', label: '城市', type: 'string', required: true, placeholder: '例如: New York / Tokyo / London' },
      { field: 'maxCount', label: '预报天数', type: 'number', defaultValue: 3, description: '预报天数 (1-10)' },
    ],
    outputSchema: [
      { field: 'successCount', label: '成功数量', type: 'number' },
      { field: 'failCount', label: '失败数量', type: 'number' },
      { field: 'items', label: '数据列表', type: 'array' },
    ],
    requirements: [
      { type: 'client', label: '需客户端在线' },
      { type: 'internet', label: '需外网' },
    ],
  },
]


export function getManifestByType(type: string): NodeManifest | undefined {
  return NODE_MANIFEST_REGISTRY.find((m) => m.type === type)
}

export function getManifestsByCategory(category: string): NodeManifest[] {
  if (category === 'all') return NODE_MANIFEST_REGISTRY
  return NODE_MANIFEST_REGISTRY.filter((m) => m.category === category)
}
