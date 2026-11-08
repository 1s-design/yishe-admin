import request from '@/config/axios'
import { getAccessToken, getRefreshToken } from '@/utils/auth'
import type { RegisterVO, UserLoginVO } from './types'

export interface SmsCodeVO {
  mobile: string
  scene: number
}

export interface SmsLoginVO {
  mobile: string
  code: string
}

// 登录
export const login = (data: UserLoginVO) => {
  return request.post({ url: '/auth/login', data })
}

// 注册
export const register = (data: RegisterVO) => {
  return request.post({ url: '/user/register', data })
}

// 登出：先清前端用户信息缓存，避免同浏览器切账号后命中上一个账号的缓存。
// 清缓存不改变请求 / 响应内容，也不影响后端 logout 行为。
export const loginOut = () => {
  clearUserInfoCache()
  return request.post({ url: '/auth/logout' })
}

// —— 前端 cache-first 缓存：省的是「请求本身」，不只是响应体 ——
// 本地服务未来会部署到服务端，多用户并发时每一个多余请求都要算流量。
// 因此 getUserInfo 改为前端本地缓存优先，分三层：
//   L1 页内内存：命中直接 Promise.resolve，**一个 HTTP 请求都不发**（0 流量）；
//   L2 会话 sessionStorage：整页刷新后带内容指纹做一次协商，未变仅约 106B；
//      内容一旦变化 hash 就变 → 立即返回完整新数据，权限/公司/角色变更零延迟生效；
//   L3 回源：首次登录 / 缓存失效 / force 时完整请求（lean 档约 3.8KB）。
// 失效通道：登出、切账号（按 accessToken 分桶）、WS user-setting-changed、
//   本端写用户数据后调用 invalidateGetInfoCache()、手动 force 强制回源。
// 不使用 TTL、不启动定时器：绝不凭空制造请求，只在业务真的要取用户信息时才判断。
// 服务端 etag 分支保留为「回源时的省流量手段」，不再承担缓存命中职责。
// 完全 opt-in：去掉 getInfo() 的缓存分支即回到逐次真实请求。
const USER_INFO_CACHE_PREFIX = '__yishe_userinfo_v2__'

interface UserInfoCacheEntry {
  tag: string
  data: any
}

/**
 * 极致省流量档：连「整页刷新后那一次 106B 协商」也跳过，跨刷新同样 0 请求。
 * 代价：跨端 / 后台修改权限时，要等 WS 推送、本端写操作或 force 才生效。
 * 默认关闭，以保留「整页刷新即生效」的原有业务语义。
 * 需要时在项目入口调用 setUserInfoCachePolicy({ skipRevalidateOnLoad: true })。
 */
let skipRevalidateOnLoad = false
export const setUserInfoCachePolicy = (policy: { skipRevalidateOnLoad?: boolean }) => {
  if (typeof policy?.skipRevalidateOnLoad === 'boolean') {
    skipRevalidateOnLoad = policy.skipRevalidateOnLoad
  }
}

function cacheBucketKey(): string {
  const token = getAccessToken() || ''
  let hash = 5381
  for (let i = 0; i < token.length; i += 1) {
    hash = ((hash << 5) + hash + token.charCodeAt(i)) >>> 0
  }
  return USER_INFO_CACHE_PREFIX + hash.toString(36)
}

// L1：只在当前页面生命周期内有效，页面刷新即清空（模块重新初始化）
let memoryEntry: UserInfoCacheEntry | null = null
let memoryBucket = ''

function readUserInfoCache(): UserInfoCacheEntry | null {
  try {
    if (typeof sessionStorage === 'undefined') return null
    const raw = sessionStorage.getItem(cacheBucketKey())
    if (!raw) return null
    const entry = JSON.parse(raw)
    if (!entry || typeof entry.tag !== 'string' || !entry.data || !entry.data.id) return null
    return entry as UserInfoCacheEntry
  } catch {
    return null
  }
}

function writeUserInfoCache(entry: UserInfoCacheEntry) {
  memoryEntry = entry
  memoryBucket = cacheBucketKey()
  try {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(cacheBucketKey(), JSON.stringify(entry))
    }
  } catch {
    // 隐私模式 / 配额不足：L1 仍可用，跨刷新退化为回源，不影响业务
  }
}

function clearUserInfoCache() {
  memoryEntry = null
  memoryBucket = ''
  try {
    if (typeof sessionStorage !== 'undefined') sessionStorage.removeItem(cacheBucketKey())
  } catch {
    // ignore
  }
}

/** 供登出 / 切账号 / 用户数据变更 / WS 推送等场景主动失效。 */
export const invalidateGetInfoCache = clearUserInfoCache

// 并发 in-flight 合并：登录、注册、路由守卫可能在用户初始化的 2s 窗口内
// 同时进入 setUserInfoAction，各自调用 getInfo。合并为一次网络请求。
// 失败不写缓存，finally 清空 pending，不缓存错误。
let pendingGetInfo: Promise<any> | null = null

const fetchUserInfo = (etag?: string): Promise<any> =>
  request.post({
    url: '/user/getUserInfo',
    data: { lean: true, ...(etag === undefined ? {} : { etag }) },
  })

const normalizeUserInfo = (payload: any) => {
  if (!payload || typeof payload !== 'object') return payload
  const { __etag, __notModified, ...user } = payload
  if (payload.id && typeof __etag === 'string' && __etag) {
    writeUserInfoCache({ tag: __etag, data: user })
  }
  return user
}

// 获取用户权限信息
// lean: true 只剔除全端零消费的大块配置，身份 / 权限 / 组织字段全部保留。
// Profile 资料页的 getUserInfo(id) 走独立封装且不带 etag，仍拿完整档，天然分桶。
// options.force 供「手动刷新 / 保存完个人资料」等场景强制走一次真实回源；
// 仍带 etag，内容没变只花约 106B，内容变了立即拿到新数据。
export const getInfo = (options: { force?: boolean } = {}) => {
  const bucket = cacheBucketKey()

  // L1：页内命中 → 0 请求、0 流量。token 变化（切账号）时 bucket 不同，自动失效。
  if (
    !options.force &&
    memoryEntry &&
    memoryBucket === bucket &&
    memoryEntry.data &&
    memoryEntry.data.id
  ) {
    return Promise.resolve(memoryEntry.data)
  }

  if (pendingGetInfo) return pendingGetInfo

  const cached = readUserInfoCache()

  // L2 极致档：跨刷新也直接复用，0 请求（默认关闭，见 setUserInfoCachePolicy）
  if (!options.force && skipRevalidateOnLoad && cached?.data?.id) {
    memoryEntry = cached
    memoryBucket = bucket
    return Promise.resolve(cached.data)
  }

  // L2 默认档 / L3：带内容指纹回源一次。服务端按最新内容重算 hash，
  // 未变只回约 106B 标记；权限、公司、角色等任何变更都会换 hash → 完整新数据。
  // 首次也显式带空 etag，让服务端进入 opt-in 模式并回传内容 hash。
  const requestedTag = cached?.tag ?? ''

  pendingGetInfo = fetchUserInfo(requestedTag)
    .then((payload: any) => {
      if (payload && payload.__notModified === true) {
        if (cached?.data?.id) {
          // 协商命中同样灌回 L1，后续页内调用全部 0 请求
          writeUserInfoCache({
            tag: typeof payload.__etag === 'string' && payload.__etag ? payload.__etag : cached.tag,
            data: cached.data,
          })
          return cached.data
        }
        // 本地条目缺失/损坏：立即回源一次，绝不把标记当成用户对象
        clearUserInfoCache()
        return fetchUserInfo('').then(normalizeUserInfo)
      }
      return normalizeUserInfo(payload)
    })
    .finally(() => {
      pendingGetInfo = null
    })
  return pendingGetInfo
}

//获取登录验证码
export const sendSmsCode = (data: SmsCodeVO) => {
  return request.post({ url: '/api/auth/send-sms-code', data })
}

// 短信验证码登录
export const smsLogin = (data: SmsLoginVO) => {
  return request.post({ url: '/api/auth/sms-login', data })
}

// 社交快捷登录，使用 code 授权码
export function socialLogin(type: string, code: string, state: string) {
  return request.post({
    url: '/api/auth/social-login',
    data: {
      type,
      code,
      state
    }
  })
}

// 社交授权的跳转
export const socialAuthRedirect = (type: number, redirectUri: string) => {
  return request.get({
    url: '/api/auth/social-auth-redirect?type=' + type + '&redirectUri=' + redirectUri
  })
}

// 获取验证图片以及 token
export const getCode = (data: any) => {
  return request.postOriginal({ url: 'api/captcha/get', data })
}

// 滑动或者点选验证
export const reqCheck = (data: any) => {
  return request.postOriginal({ url: 'api/captcha/check', data })
}

// 通过短信重置密码
export const smsResetPassword = (data: any) => {
  return request.post({ url: '/api/auth/reset-password', data })
}
