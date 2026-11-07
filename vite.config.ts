import { resolve } from 'path'
import { pathToFileURL } from 'url'
import { defineConfig, loadEnv, type ConfigEnv } from 'vite'
import {createVitePlugins} from './build/vite'
import {exclude, include} from "./build/vite/optimize"
// 当前执行node命令时文件夹的地址(工作目录)
const root = process.cwd()

// 路径查找
function pathResolve(dir: string) {
    return resolve(root, '.', dir)
}

// 体积大、整体引入、且只被少数路由使用的依赖单独成 chunk，便于浏览器长期缓存。
// 这里只改变产物的切分归属，不改变任何模块的执行内容。
// element-plus / ant-design-vue 走按需引入，强行合并反而会把其它路由的组件
// 拖进首屏，因此不纳入；vue / vue-router / pinia 等核心也不拆，避免循环依赖。
const VENDOR_CHUNKS: Array<{ name: string; patterns: string[] }> = [
    { name: 'echarts', patterns: ['/node_modules/echarts/', '/node_modules/echarts-wordcloud/'] },
    { name: 'vxe', patterns: ['/node_modules/vxe-table/', '/node_modules/vxe-pc-ui/'] },
    {
        name: 'bpmn',
        patterns: [
            '/node_modules/bpmn-js/',
            '/node_modules/bpmn-js-properties-panel/',
            '/node_modules/bpmn-js-token-simulation/',
            '/node_modules/camunda-bpmn-moddle/',
        ],
    },
    { name: 'codemirror', patterns: ['/node_modules/codemirror/', '/node_modules/@codemirror/'] },
    { name: 'vue-flow', patterns: ['/node_modules/@vue-flow/'] },
    { name: 'wangeditor', patterns: ['/node_modules/@wangeditor/'] },
    { name: 'xlsx', patterns: ['/node_modules/xlsx/'] },
]

// https://vitejs.dev/config/
export default defineConfig(({ mode }: ConfigEnv) => {
    const env = loadEnv(mode, root, '')
    const scssVariablesEntry = pathToFileURL(pathResolve('src/styles/variables.scss')).href
    const proxyTarget = (env.VITE_BASE_URL || '').replace(/\/$/, '')
    return {
        base: env.VITE_BASE_PATH,
        root: root,
        // 服务端渲染
        server: {
            port: Number(env.VITE_PORT) || 5173, // 端口号
            host: "0.0.0.0",
            open: env.VITE_OPEN === 'true',
            proxy: proxyTarget
              ? {
                  ['/api']: {
                    target: proxyTarget,
                    changeOrigin: true,
                  },
                  ['/infra/ws']: {
                    target: proxyTarget,
                    changeOrigin: true,
                    ws: true,
                  },
                  ['/socket.io']: {
                    target: proxyTarget,
                    changeOrigin: true,
                    ws: true,
                  },
                }
              : undefined,
        },
        // 项目使用的vite插件。 单独提取到build/vite/plugin中管理
        plugins: createVitePlugins(root),
        css: {
            preprocessorOptions: {
                scss: {
                    additionalData: `@use "${scssVariablesEntry}" as *;`,
                    javascriptEnabled: true,
                    silenceDeprecations: ["legacy-js-api"], // 参考自 https://stackoverflow.com/questions/78997907/the-legacy-js-api-is-deprecated-and-will-be-removed-in-dart-sass-2-0-0
                }
            }
        },
        resolve: {
            extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json', '.scss', '.css'],
            alias: [
                {
                    find: 'vue-i18n',
                    replacement: 'vue-i18n/dist/vue-i18n.cjs.js'
                },
                {
                    find: /\@\//,
                    replacement: `${pathResolve('src')}/`
                }
            ]
        },
        build: {
            minify: 'terser',
            outDir: env.VITE_OUT_DIR || 'dist',
            sourcemap: env.VITE_SOURCEMAP === 'true' ? 'inline' : false,
            // brotliSize: false,
            terserOptions: {
                compress: {
                    drop_debugger: env.VITE_DROP_DEBUGGER === 'true',
                    drop_console: env.VITE_DROP_CONSOLE === 'true'
                }
            },
            rollupOptions: {
                output: {
                    manualChunks(id) {
                        const normalizedId = id.replace(/\\/g, '/')
                        for (const group of VENDOR_CHUNKS) {
                            if (group.patterns.some((pattern) => normalizedId.includes(pattern))) {
                                return group.name
                            }
                        }
                        return undefined
                    }
                },
            },
        },
        optimizeDeps: {include, exclude}
    }
})
