import type { RouteMeta } from 'vue-router'
import { ElPopover } from 'element-plus'
import { Icon } from '@/components/Icon'
import { useI18n } from '@/hooks/web/useI18n'
import { useAgentRunStatus } from '@/hooks/web/useAgentRunStatus'

export const useRenderMenuTitle = () => {
  const { t } = useI18n()
  const { agentRun, badgeText, hasActivity } = useAgentRunStatus()

  const renderAgentBadge = () => {
    const list = agentRun.value.tasks
    const popContent = (
      <div class="agent-menu-pop">
        <div class="agent-menu-pop__head">
          <span>智能体运行状态</span>
          <span class="agent-menu-pop__num">
            运行 {agentRun.value.running} · 等待 {agentRun.value.waiting} · 开启 {agentRun.value.dutyOn}
          </span>
        </div>
        <div class="agent-menu-pop__list">
          {list.length === 0 ? (
            <div class="agent-menu-pop__empty">暂无运行中任务</div>
          ) : (
            list.map((item) => (
              <div class="agent-menu-pop__row" key={item.id}>
                <span class={`agent-menu-pop__dot is-${item.status}`} />
                <span class="agent-menu-pop__name">{item.agentName}</span>
                <span class="agent-menu-pop__status">{item.statusLabel}</span>
              </div>
            ))
          )}
        </div>
      </div>
    )

    return (
      <ElPopover placement="right-start" width={260} trigger="hover" popper-class="agent-menu-popper">
        {{
          reference: () => (
            <span
              class={{
                'agent-menu-badge': true,
                'is-active': hasActivity.value
              }}
            >
              {badgeText.value}
            </span>
          ),
          default: () => popContent
        }}
      </ElPopover>
    )
  }

  const renderMenuTitle = (meta: RouteMeta, level = 0, routeName?: string, fullPath?: string) => {
    const { title = 'Please set title' } = meta
    const name = String(routeName || '')
    const path = String(fullPath || '')
    const titleKey = String(meta?.title || '')
    const isAgent =
      name === 'AiAgent' ||
      name === 'AiAgentChat' ||
      titleKey === 'router.aiAgent' ||
      path.includes('ai/agent') ||
      path.endsWith('/agent') ||
      titleKey.includes('aiAgent')
    const badge = isAgent ? renderAgentBadge() : null

    return meta.icon ? (
      <div class={['v-menu__label', `v-menu__label--level-${level}`]}>
        <Icon class="v-menu__icon" icon={meta.icon}></Icon>
        <span class="v-menu__title overflow-hidden overflow-ellipsis whitespace-nowrap">
          {t(title as string)}
        </span>
        {badge}
      </div>
    ) : (
      <div class={['v-menu__label', `v-menu__label--level-${level}`]}>
        <span class="v-menu__title overflow-hidden overflow-ellipsis whitespace-nowrap">
          {t(title as string)}
        </span>
        {badge}
      </div>
    )
  }

  return {
    renderMenuTitle
  }
}
