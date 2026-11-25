import type { WorkflowExecutionContext, NodeExecutionResult } from '../types'
import { messagePushExecutor } from './messagePushExecutor'
import { hotsearchWeiboExecutor } from './hotsearchWeiboExecutor'

/**
 * 节点执行器调度表
 * 根据 capabilityType 或 node.type 路由到对应执行器
 */
const hotsearchPlatforms = [
  'hotsearch_weibo', 'hotsearch_douyin', 'hotsearch_bilibili', 'hotsearch_zhihu',
  'hotsearch_toutiao', 'hotsearch_douban', 'hotsearch_kuaishou', 'hotsearch_v2ex',
  'hotsearch_36kr', 'hotsearch_ithome',
  'hotsearch_hackernews', 'hotsearch_github',
  'hotsearch_wikipedia', 'hotsearch_bbc_news', 'hotsearch_cnn', 'hotsearch_nytimes',
  'hotsearch_aljazeera', 'hotsearch_devto', 'hotsearch_ebay_trending',
  'hotsearch_shopify_trending',
  'hotsearch_xiaohongshu', 'xiaohongshu_note_detail',
  'douyin_jingxuan_search',
]

const executorMap: Record<string, (
  node: any,
  context: WorkflowExecutionContext
) => Promise<NodeExecutionResult>> = {
  message_push: messagePushExecutor,
  ...Object.fromEntries(hotsearchPlatforms.map(p => [p, hotsearchWeiboExecutor])),
}

/**
 * 通用节点执行入口
 */
export async function executeNode(
  node: any,
  context: WorkflowExecutionContext
): Promise<NodeExecutionResult> {
  const capabilityType = node.data?.capabilityType || node.type
  const executor = executorMap[capabilityType] || executorMap[node.type]

  if (!executor) {
    // 不可执行节点直接透传
    if (node.type === 'start' || node.type === 'end') {
      return {
        success: true,
        outputs: node.type === 'start'
          ? { triggerTime: new Date().toISOString(), triggerType: 'manual' }
          : {},
      }
    }
    return { success: false, error: `未找到节点类型 "${capabilityType}" 的执行器` }
  }

  return executor(node, context)
}

export { messagePushExecutor, hotsearchWeiboExecutor }
