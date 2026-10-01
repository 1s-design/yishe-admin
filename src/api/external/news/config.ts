/**
 * 新闻资讯采集数据源配置（经真实可用性与连通性测试校验保留的有效源）
 * pluginKey 与客户端 newsServicesConfig 保持一致
 */
import { genericSearchAndWait } from '../genericCommand'

export interface NewsField {
  key: string
  label: string
  placeholder?: string
  type?: 'text' | 'number' | 'password'
  default?: string | number
}

export interface NewsSource {
  key: string
  label: string
  desc: string
  category: '国外新闻' | '国内新闻' | '娱乐影视' | '体育' | '政府数据'
  fields: NewsField[]
}

const kw = (placeholder = '输入关键词，如 AI / 科技'): NewsField => ({
  key: 'keyword',
  label: '关键词',
  placeholder,
})
const cat = (placeholder = '如 policy / news / technology'): NewsField => ({
  key: 'category',
  label: '分类',
  placeholder,
})
const maxCount: NewsField = {
  key: 'maxCount',
  label: '数量',
  type: 'number',
  default: 10,
  placeholder: '返回条数',
}

export const NEWS_SOURCES: NewsSource[] = [
  // ── 国内新闻 ──────────────────────────────────────────────
  {
    key: 'thepaper',
    label: '澎湃新闻',
    desc: '专注时政、经济与思想的深度权威资讯',
    category: '国内新闻',
    fields: [kw('输入关键词，如 财经/科技'), maxCount],
  },
  {
    key: '36kr',
    label: '36氪',
    desc: '科技创投、大模型前沿突破与新商业报道',
    category: '国内新闻',
    fields: [kw('输入关键词，如 AI/大模型'), maxCount],
  },
  {
    key: 'huxiu',
    label: '虎嗅',
    desc: '深度商业洞察与科技产业分析',
    category: '国内新闻',
    fields: [kw('输入关键词，如 自动驾驶/出海'), maxCount],
  },
  {
    key: 'sspai',
    label: '少数派',
    desc: '数字效率工具与优质硬核数码生活方式',
    category: '国内新闻',
    fields: [kw('输入关键词，如 效率/生产力'), maxCount],
  },
  {
    key: 'govcn',
    label: '中国政府网',
    desc: '国务院政策文件、常务会议及政务公报',
    category: '国内新闻',
    fields: [cat('如 policy(政策) / news(要闻) / announce(公报)'), maxCount],
  },

  // ── 国外新闻 ──────────────────────────────────────────────
  {
    key: 'hackernews',
    label: 'Hacker News 热帖',
    desc: '全球极客与技术开发者高热度讨论帖',
    category: '国外新闻',
    fields: [
      { key: 'type', label: '类别', default: 'ai', placeholder: '如 ai / show / ask / jobs' },
      { key: 'minScore', label: '最低分', type: 'number', placeholder: '按得分过滤' },
      maxCount,
    ],
  },
  {
    key: 'github',
    label: 'GitHub 趋势仓库',
    desc: '近期高星标与有热度的开源项目趋势',
    category: '国外新闻',
    fields: [kw('趋势关键词'), { key: 'language', label: '语言', placeholder: '如 TypeScript / Python' }, maxCount],
  },
  {
    key: 'wired',
    label: 'Wired 连线',
    desc: '前沿科技、数字生活与商业文化深度报道',
    category: '国外新闻',
    fields: [cat(), maxCount],
  },
  {
    key: 'mittechreview',
    label: 'MIT 科技评论',
    desc: '麻省理工学院前沿突破性科学与技术进展',
    category: '国外新闻',
    fields: [cat(), maxCount],
  },
  {
    key: 'apnews',
    label: 'AP News 美联社',
    desc: '美联社全球科技突发电讯与行业报道',
    category: '国外新闻',
    fields: [cat(), maxCount],
  },
  {
    key: 'npr',
    label: 'NPR 新闻',
    desc: 'NPR 美国公共电台权威新闻资讯',
    category: '国外新闻',
    fields: [cat(), maxCount],
  },
  {
    key: 'nprtechnology',
    label: 'NPR Technology',
    desc: 'NPR 科技专栏与数字化专题报道',
    category: '国外新闻',
    fields: [cat(), maxCount],
  },
  {
    key: 'bbctechnology',
    label: 'BBC Technology',
    desc: 'BBC 全球科技频道深度专讯',
    category: '国外新闻',
    fields: [cat(), maxCount],
  },

  // ── 娱乐影视 ──────────────────────────────────────────────
  {
    key: 'douban_movie',
    label: '豆瓣电影',
    desc: '实时热播影视与高口碑评分排行',
    category: '娱乐影视',
    fields: [cat(), maxCount],
  },
  {
    key: 'douban_book',
    label: '豆瓣读书',
    desc: '近期新书速递与图书高分热门读物',
    category: '娱乐影视',
    fields: [cat(), maxCount],
  },
  {
    key: 'variety',
    label: 'Variety 综艺',
    desc: '好莱坞全球影视娱乐与流媒体行业专讯',
    category: '娱乐影视',
    fields: [cat(), maxCount],
  },
  {
    key: 'deadline',
    label: 'Deadline',
    desc: '好莱坞与娱乐产业首发独家新闻',
    category: '娱乐影视',
    fields: [cat(), maxCount],
  },
  {
    key: 'billboard',
    label: 'Billboard 公告牌',
    desc: '全球流行音乐排行榜与音乐工业动态',
    category: '娱乐影视',
    fields: [cat(), maxCount],
  },
  {
    key: 'ign',
    label: 'IGN',
    desc: '全球主流游戏评测、发售日历与泛娱乐资讯',
    category: '娱乐影视',
    fields: [cat(), maxCount],
  },

  // ── 体育 ─────────────────────────────────────────────────
  {
    key: 'flashscore',
    label: 'Flashscore',
    desc: '国际体育各大联赛比分与赛程',
    category: '体育',
    fields: [cat(), maxCount],
  },

  // ── 政府数据 ─────────────────────────────────────────────
  {
    key: 'sse',
    label: '上交所',
    desc: '上海证券交易所官方上市公司公告与信息披露',
    category: '政府数据',
    fields: [cat(), maxCount],
  },
  {
    key: 'worldometers',
    label: 'Worldometers',
    desc: '全球宏观人口、经济、环境实时动态统计数据',
    category: '政府数据',
    fields: [cat(), maxCount],
  },
  {
    key: 'ourworldindata',
    label: 'Our World in Data',
    desc: '牛津大学全球学术宏观发展数据与可视化图表',
    category: '政府数据',
    fields: [cat(), maxCount],
  },
]

export const newsSourceMap: Record<string, NewsSource> = Object.fromEntries(
  NEWS_SOURCES.map((s) => [s.key, s]),
)

export async function searchNewsSource(
  sourceKey: string,
  clientId: string,
  payload: Record<string, any>,
): Promise<any> {
  return genericSearchAndWait(clientId, sourceKey, payload)
}