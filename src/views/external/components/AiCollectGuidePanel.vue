<template>
  <div class="ai-collect-guide" v-loading="loading">
    <div class="guide-header">
      <div class="guide-header__info">
        <h3>AI 智能采集站点指南</h3>
        <p class="guide-header__desc">
          以下站点支持 AI 驱动采集——系统提供工具与站点规范，外部 AI Agent（MCP）自主分析采集。
          无需编写爬虫代码，AI 自动适应页面结构。
        </p>
      </div>
      <el-button size="small" text type="primary" @click="fetchGuides">
        <el-icon><Refresh /></el-icon>
        刷新
      </el-button>
    </div>

    <!-- 可采集站点 -->
    <template v-if="activeGuides.length">
      <div class="section-label">可采集</div>
      <div class="guide-grid">
        <div v-for="guide in activeGuides" :key="guide.id" class="guide-card">
          <div class="guide-card__header">
            <div class="guide-card__title">{{ guide.name }}</div>
            <div class="guide-card__badges">
              <el-tag size="small" effect="plain" type="success">可用</el-tag>
              <el-tag size="small" effect="plain" type="info">
                {{ guide.module === 'media-collect' ? '媒体' : '图片' }}
              </el-tag>
            </div>
          </div>
          <p class="guide-card__desc">{{ guide.description }}</p>
          <div class="guide-card__meta">
            <div class="meta-row">
              <span class="meta-label">搜索方式</span>
              <span class="meta-value">{{ searchMethodLabel(guide.search?.method) }}</span>
            </div>
            <div class="meta-row" v-if="guide.website">
              <span class="meta-label">网站</span>
              <a class="meta-link" :href="guide.website" target="_blank" rel="noopener">{{ guide.website }}</a>
            </div>
          </div>
          <div class="guide-card__actions">
            <el-button size="small" text type="primary" @click="viewGuide(guide)">
              查看采集指南
            </el-button>
          </div>
        </div>
      </div>
    </template>

    <!-- 待接入站点 -->
    <template v-if="pendingGuides.length">
      <div class="section-label section-label--pending">待接入（{{ pendingGuides.length }}）</div>
      <div class="guide-grid">
        <div v-for="guide in pendingGuides" :key="guide.id" class="guide-card guide-card--pending">
          <div class="guide-card__header">
            <div class="guide-card__title">{{ guide.name }}</div>
            <div class="guide-card__badges">
              <el-tag size="small" effect="plain" type="warning">待接入</el-tag>
            </div>
          </div>
          <p class="guide-card__desc">{{ guide.description }}</p>
          <div v-if="guide.blockedReason" class="guide-card__blocked">
            <span class="blocked-label">阻塞原因：</span>{{ guide.blockedReason }}
          </div>
          <div class="guide-card__meta">
            <div class="meta-row" v-if="guide.website">
              <span class="meta-label">网站</span>
              <a class="meta-link" :href="guide.website" target="_blank" rel="noopener">{{ guide.website }}</a>
            </div>
          </div>
          <div class="guide-card__actions">
            <el-button size="small" text type="primary" @click="viewGuide(guide)">
              查看详情
            </el-button>
          </div>
        </div>
      </div>
    </template>

    <el-empty v-if="!loading && !activeGuides.length && !pendingGuides.length" description="暂无 AI 采集站点指南" :image-size="80" />

    <!-- 指南详情抽屉 -->
    <el-drawer
      v-model="drawerVisible"
      :title="selectedGuide?.name || ''"
      size="520px"
      direction="rtl"
    >
      <div v-if="selectedGuide" class="guide-detail">
        <div v-if="selectedGuide.status === 'pending'" class="detail-pending-badge">
          <el-tag type="warning" size="small">待接入</el-tag>
          <span v-if="selectedGuide.blockedReason" class="pending-reason">{{ selectedGuide.blockedReason }}</span>
        </div>

        <section class="detail-section">
          <h4>站点简介</h4>
          <p>{{ selectedGuide.description }}</p>
          <p class="detail-link" v-if="selectedGuide.website">
            主页：<a :href="selectedGuide.website" target="_blank" rel="noopener">{{ selectedGuide.website }}</a>
          </p>
        </section>

        <section class="detail-section">
          <h4>搜索方式</h4>
          <div class="detail-code">{{ selectedGuide.search?.urlTemplate }}</div>
          <p class="detail-note">{{ selectedGuide.search?.notes }}</p>
        </section>

        <section class="detail-section">
          <h4>图片解析</h4>
          <div class="detail-label">URL 模式：</div>
          <div v-for="p in selectedGuide.parsing?.imageUrlPatterns" :key="p" class="detail-code">{{ p }}</div>
          <div class="detail-label">主图规则：</div>
          <p class="detail-note">{{ selectedGuide.parsing?.primaryImage }}</p>
          <div class="detail-label">详情页特征：</div>
          <p class="detail-note">{{ selectedGuide.parsing?.detailPageHints }}</p>
        </section>

        <section class="detail-section">
          <h4>下载规范</h4>
          <div class="detail-label">Referer：</div>
          <div class="detail-code">{{ selectedGuide.download?.referer }}</div>
          <div class="detail-label">下载优先级：</div>
          <ul class="detail-list">
            <li v-for="(p, i) in selectedGuide.download?.priority" :key="i">{{ p }}</li>
          </ul>
          <p class="detail-note">{{ selectedGuide.download?.notes }}</p>
        </section>

        <section class="detail-section">
          <h4>AI 采集提示</h4>
          <ul class="detail-list">
            <li v-for="(hint, i) in selectedGuide.agentHints" :key="i">{{ hint }}</li>
          </ul>
        </section>

        <section class="detail-section" v-if="selectedGuide.status !== 'pending'">
          <h4>MCP 工具调用示例</h4>
          <div class="detail-code">{{ toolExample }}</div>
        </section>
      </div>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Refresh } from '@element-plus/icons-vue'
import { listSiteGuides } from '@/api/external/collect'

interface SiteGuide {
  id: string
  name: string
  description: string
  module: string
  homepage: string
  website?: string
  status?: string
  blockedReason?: string
  searchMethod: string
  search?: { urlTemplate?: string; notes?: string }
  parsing?: { imageUrlPatterns?: string[]; primaryImage?: string; detailPageHints?: string }
  download?: { referer?: string; priority?: string[]; notes?: string }
  agentHints?: string[]
}

const loading = ref(false)
const guides = ref<SiteGuide[]>([])
const drawerVisible = ref(false)
const selectedGuide = ref<SiteGuide | null>(null)

const activeGuides = computed(() => guides.value.filter((g) => g.status !== 'pending'))
const pendingGuides = computed(() => guides.value.filter((g) => g.status === 'pending'))

const searchMethodLabel = (method: string) => {
  const map: Record<string, string> = {
    'google-cse': 'Google CSE',
    'internal-search': '站内搜索',
    sitemap: 'Sitemap',
    'category-browse': '分类浏览',
  }
  return map[method] || method
}

const toolExample = computed(() => {
  if (!selectedGuide.value) return ''
  return `// 外部 Agent 通过 MCP 调用采集
1. ai_collect.get_guide({siteId: "${selectedGuide.value.id}"})
2. ai_collect.render_page({url: "${selectedGuide.value.search?.urlTemplate?.replace('{keyword}', '你的关键词')}"})
3. ai_collect.extract_images({html: <渲染后的HTML>})
4. ai_collect.download_images({urls: [<图片URL列表>], referer: "${selectedGuide.value.download?.referer}"})`
})

const fetchGuides = async () => {
  loading.value = true
  try {
    const res: any = await listSiteGuides(undefined, true)  // includePending=true
    const list = res?.data ?? res ?? []
    guides.value = Array.isArray(list) ? list : (list?.data || [])
  } catch (e) {
    console.error('加载 AI 采集指南失败:', e)
  } finally {
    loading.value = false
  }
}

const viewGuide = (guide: SiteGuide) => {
  selectedGuide.value = guide
  drawerVisible.value = true
}

onMounted(() => {
  fetchGuides()
})
</script>

<style scoped lang="scss">
.ai-collect-guide {
  padding: 20px;
}

.guide-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 20px;

  &__info h3 {
    margin: 0 0 6px;
    font-size: 16px;
    font-weight: 600;
  }

  &__desc {
    margin: 0;
    font-size: 13px;
    color: var(--el-text-color-secondary);
    line-height: 1.5;
    max-width: 600px;
  }
}

.guide-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 16px;
}

.guide-card {
  padding: 16px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  background: var(--el-bg-color);
  transition: border-color 0.15s;

  &:hover {
    border-color: var(--el-color-primary-light-5);
  }

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;
  }

  &__title {
    font-size: 14px;
    font-weight: 600;
  }

  &__desc {
    margin: 0 0 12px;
    font-size: 12px;
    color: var(--el-text-color-secondary);
    line-height: 1.5;
  }

  &__meta {
    margin-bottom: 12px;
  }

  &__actions {
    display: flex;
    justify-content: flex-end;
  }
}

.meta-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
  font-size: 12px;
}

.meta-label {
  color: var(--el-text-color-placeholder);
  flex-shrink: 0;
  min-width: 55px;
}

.meta-value {
  color: var(--el-text-color-regular);
}

.meta-link {
  color: var(--el-color-primary);
  text-decoration: none;
  word-break: break-all;

  &:hover {
    text-decoration: underline;
  }
}

.guide-detail {
  .detail-section {
    margin-bottom: 24px;

    h4 {
      margin: 0 0 8px;
      font-size: 14px;
      font-weight: 600;
      color: var(--el-text-color-primary);
    }

    p {
      margin: 0 0 8px;
      font-size: 13px;
      line-height: 1.6;
    }
  }

  .detail-label {
    font-size: 12px;
    color: var(--el-text-color-placeholder);
    margin: 8px 0 4px;
  }

  .detail-code {
    padding: 8px 12px;
    background: var(--el-fill-color-light);
    border-radius: 4px;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 12px;
    word-break: break-all;
    margin-bottom: 8px;
  }

  .detail-note {
    font-size: 12px;
    color: var(--el-text-color-secondary);
    line-height: 1.5;
  }

  .detail-link {
    font-size: 13px;

    a {
      color: var(--el-color-primary);
    }
  }

  .detail-list {
    margin: 4px 0 8px;
    padding-left: 16px;

    li {
      font-size: 12px;
      line-height: 1.8;
      color: var(--el-text-color-regular);
    }
  }
}/* 分组标题 */
.section-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  margin: 16px 0 10px;
  padding-bottom: 6px;
  border-bottom: 1px solid var(--el-border-color-lighter);

  &--pending {
    color: var(--el-color-warning);
  }
}

/* 卡片徽章组 */
.guide-card__badges {
  display: flex;
  gap: 4px;
  align-items: center;
}

/* 待接入卡片 */
.guide-card--pending {
  opacity: 0.75;

  &:hover {
    opacity: 1;
    border-color: var(--el-color-warning-light-5);
  }
}

/* 阻塞原因 */
.guide-card__blocked {
  margin: 6px 0;
  padding: 6px 10px;
  font-size: 11px;
  color: var(--el-color-warning);
  background: var(--el-color-warning-light-9);
  border-radius: 4px;
  line-height: 1.5;
}

.blocked-label {
  font-weight: 600;
}

/* 详情抽屉 pending 标记 */
.detail-pending-badge {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
  padding: 10px 12px;
  background: var(--el-color-warning-light-9);
  border-radius: 6px;
}

.pending-reason {
  font-size: 12px;
  color: var(--el-color-warning);
  line-height: 1.5;
}

/* 操作按钮 */
.guide-card__actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 8px;
}
</style>
