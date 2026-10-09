import { ElSubMenu, ElMenuItem } from 'element-plus'
import { hasOneShowingChild } from '../helper'
import { isUrl } from '@/utils/is'
import { useRenderMenuTitle } from './useRenderMenuTitle'
import { pathResolve } from '@/utils/routerHelper'

const { renderMenuTitle } = useRenderMenuTitle()

export const useRenderMenuItem = () =>
  // allRouters: AppRouteRecordRaw[] = [],
  {
    const renderMenuItem = (routers: AppRouteRecordRaw[], parentPath = '/', level = 0) => {
      return routers
        .filter((v) => !v.meta?.hidden)
        .map((v) => {
          const meta = v.meta ?? {}
          const { oneShowingChild, onlyOneChild } = hasOneShowingChild(v.children, v)
          const fullPath = isUrl(v.path) ? v.path : pathResolve(parentPath, v.path) // getAllParentPath<AppRouteRecordRaw>(allRouters, v.path).join('/')

          if (
            oneShowingChild &&
            (!onlyOneChild?.children || onlyOneChild?.noShowingChildren) &&
            !meta?.alwaysShow
          ) {
            return (
              <ElMenuItem class={['v-menu__item', `v-menu__item--level-${level}`]} index={onlyOneChild ? pathResolve(fullPath, onlyOneChild.path) : fullPath}>
                {{
                  default: () =>
                    renderMenuTitle(
                      onlyOneChild ? onlyOneChild?.meta : meta,
                      level,
                      onlyOneChild?.name?.toString() || v.name?.toString(),
                      fullPath
                    )
                }}
              </ElMenuItem>
            )
          } else {
            return (
              <ElSubMenu
                class={['v-menu__sub', `v-menu__sub--level-${level}`]}
                index={fullPath}
              >
                {{
                  title: () => renderMenuTitle(meta, level, v.name?.toString(), fullPath),
                  default: () => renderMenuItem(v.children!, fullPath, level + 1)
                }}
              </ElSubMenu>
            )
          }
        })
    }

    return {
      renderMenuItem
    }
  }
