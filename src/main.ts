/*
 * @Author: chan-max jackieontheway666@gmail.com
 * @Date: 2025-05-19 05:55:18
 * @LastEditors: chan-max jackieontheway666@gmail.com
 * @LastEditTime: 2025-05-26 06:44:10
 * @FilePath: /yishe-admin/src/main.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
// 引入unocss css
import '@/plugins/unocss'

// 导入全局的svg图标
import '@/plugins/svgIcon'
// 注册 Material Symbols 图标集
import '@/plugins/iconify/material-symbols'

// 初始化多语言
import { setupI18n } from '@/plugins/vueI18n'

// 引入状态管理
import { setupStore } from '@/store'

// 引入移动端手势防护
import '@/utils/mobileGestureGuard'

// 引入移动端调试工具
import { initVConsole } from '@/utils/vconsole'
import { initVConsoleFromCDN } from '@/utils/vconsole-fallback'

// 全局组件
import { setupGlobCom } from '@/components'

// 引入 element-plus
import { setupElementPlus } from '@/plugins/elementPlus'

// 引入 form-create
import { setupFormCreate } from '@/plugins/formCreate'
// 注册 Material Symbols 图标集

// 引入全局样式
import '@/styles/index.scss'
import '@/styles/mobile-responsive.scss'

// 引入动画
import '@/plugins/animate.css'

// 路由
import router, { setupRouter } from '@/router'

// 指令
import { setupAuth, setupMountedFocus } from '@/directives'

import { createApp } from 'vue'

import App from './App.vue'

import './permission'

import '@/plugins/tongji' // 百度统计
import Logger from '@/utils/Logger'
import { mountBootLoading } from '@/components/AppLoading'

import VueDOMPurifyHTML from 'vue-dompurify-html' // 解决v-html 的安全隐患

import 'viewerjs/dist/viewer.css'
import VueViewer from 'v-viewer'

import vPreviewImage from '@/components/PreviewImage/index'

import VxeUIAll from 'vxe-pc-ui'
import 'vxe-pc-ui/lib/style.css'
import VxeUITable from 'vxe-table'
import 'vxe-table/lib/style.css'
import { GlobalDefine } from './utils/global'
import { psdTest } from './psd'
import { initCOS } from '@/api/cos'

// import * as vue3videoPlay from 'vue3-video-play' // 引入组件
// import 'vue3-video-play/dist/style.css' // 引入css

mountBootLoading('#app', {
  text: '1s design admin...',
  label: '',
  caption: ''
})

// 创建实例
const setupAll = async () => {
  const app = createApp(App)

  await setupI18n(app)

  setupStore(app)

  setupGlobCom(app)

  setupElementPlus(app)

  setupFormCreate(app)

  setupRouter(app)

  // directives 指令
  setupAuth(app)
  setupMountedFocus(app)

  await router.isReady()

  // 初始化COS配置
  try {
    await initCOS()
    console.log('COS配置初始化成功')
  } catch (error) {
    console.error('COS配置初始化失败:', error)
  }

  // 初始化移动端调试工具
  initVConsole().catch(async (error) => {
    console.error('vConsole 模块导入失败，尝试CDN方式:', error)
    try {
      await initVConsoleFromCDN()
    } catch (cdnError) {
      console.error('vConsole CDN方式也失败:', cdnError)
    }
  })

  app.use(VueDOMPurifyHTML)

  app.use(VueViewer)

  app.use(GlobalDefine)

  app.use(vPreviewImage)

  app.use(VxeUIAll).use(VxeUITable)

  // 视频播放器
  // app.use(vue3videoPlay)

  app.mount('#app')

}

setupAll()

// psdTest()

Logger.prettyPrimary(`欢迎使用`, import.meta.env.VITE_APP_TITLE)
