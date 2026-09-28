const resolveApiBaseUrl = (): string => {
  // 1. 如果运行时 window.__APP_CONFIG__ 注入了 API 地址（支持容器环境变量动态注入）
  const runtimeApiUrl = (typeof window !== 'undefined' && (window as any).__APP_CONFIG__?.API_BASE_URL) || ''
  if (runtimeApiUrl) {
    return runtimeApiUrl.replace(/\/+$/, '')
  }

  // 2. 如果配置了具体的 VITE_BASE_URL，且非相对路径，则使用配置；若为空，则直接使用相对路径 VITE_API_URL (如 /api)
  const configuredBase = String(import.meta.env.VITE_BASE_URL || '').trim().replace(/\/+$/, '')
  const apiUrl = String(import.meta.env.VITE_API_URL || '/api').trim()

  if (import.meta.env.DEV) {
    return apiUrl
  }

  if (configuredBase) {
    return `${configuredBase}${apiUrl}`
  }

  // 生产环境若未指定固定公网域名，直接使用相对路径，自适应当前访问宿主机的 Nginx 反代
  return apiUrl
}

const config: {
  base_url: string
  result_code: number | string
  default_headers: AxiosHeaders
  request_timeout: number
} = {
  /**
   * api请求基础路径
   */
  base_url: resolveApiBaseUrl(),
  /**
   * 接口成功返回状态码
   */
  result_code: 200,

  /**
   * 接口请求超时时间
   */
  request_timeout: 1200000,

  /**
   * 默认接口请求类型
   * 可选值：application/x-www-form-urlencoded multipart/form-data
   */
  default_headers: 'application/json'
}

export { config }
