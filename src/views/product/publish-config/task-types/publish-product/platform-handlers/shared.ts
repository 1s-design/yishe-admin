export function normalizeHttpUrlList(input: unknown): string[] {
  const values = Array.isArray(input)
    ? input
    : typeof input === 'string'
      ? input.split(/\r?\n/)
      : []

  // 保留 urlA|urlB 随机语法，仅过滤掉无效行
  return Array.from(
    new Set(
      values
        .map((item) => String(item || '').trim())
        .filter(Boolean)
        .filter((item) => {
          // 支持 urlA|urlB 格式：只要其中至少一个片段是有效 URL 即可
          const parts = item.split('|').map((s) => s.trim()).filter(Boolean)
          return parts.some((p) => /^https?:\/\//i.test(p))
        })
    )
  )
}

export function normalizePsdImageIndexes(input: unknown): string {
  if (Array.isArray(input)) {
    return input.map((item) => String(item || '').trim()).filter(Boolean).join(',')
  }

  return String(input || '')
    .trim()
    .replace(/，/g, ',')
    .replace(/\s+/g, '')
}

export function validatePsdImageIndexes(input: unknown): boolean {
  const normalized = normalizePsdImageIndexes(input)
  if (!normalized) {
    return true
  }

  return normalized
    .split(',')
    .filter(Boolean)
    .every((segment) => {
      if (/^\d+$/.test(segment)) {
        return Number(segment) > 0
      }

      const rangeMatch = segment.match(/^(\d+)-(\d+)$/)
      if (rangeMatch) {
        const start = Number(rangeMatch[1])
        const end = Number(rangeMatch[2])
        return start > 0 && end >= start
      }

      const randomMatch = segment.match(/^random\((\d+(?:,\d+)*)\)$/)
      if (randomMatch) {
        return randomMatch[1]
          .split(',')
          .filter(Boolean)
          .every((n) => /^\d+$/.test(n) && Number(n) > 0)
      }

      return false
    })
}

export function parsePsdImageIndexes(input: unknown): number[] {
  const normalized = normalizePsdImageIndexes(input)
  if (!normalized) {
    return []
  }

  const indexes: number[] = []
  normalized
    .split(',')
    .filter(Boolean)
    .forEach((segment) => {
      if (/^\d+$/.test(segment)) {
        const index = Number(segment)
        if (index > 0) {
          indexes.push(index)
        }
        return
      }

      const rangeMatch = segment.match(/^(\d+)-(\d+)$/)
      if (rangeMatch) {
        const start = Number(rangeMatch[1])
        const end = Number(rangeMatch[2])
        if (start <= 0 || end < start) {
          return
        }
        for (let index = start; index <= end; index += 1) {
          indexes.push(index)
        }
        return
      }

      const randomMatch = segment.match(/^random\((\d+(?:,\d+)*)\)$/)
      if (randomMatch) {
        const pool = randomMatch[1]
          .split(',')
          .filter(Boolean)
          .map((n) => Number(n))
          .filter((n) => n > 0)
        if (pool.length > 0) {
          const picked = pool[Math.floor(Math.random() * pool.length)]
          indexes.push(picked)
        }
      }
    })

  return indexes
}

export function normalizeIndexList(input: unknown): string {
  if (Array.isArray(input)) {
    return input.map((item) => String(item || '').trim()).filter(Boolean).join(',')
  }

  return String(input || '')
    .trim()
    .replace(/，/g, ',')
    .replace(/\s+/g, '')
}

export function validatePositiveIndexList(input: unknown): boolean {
  const normalized = normalizeIndexList(input)
  if (!normalized) {
    return true
  }

  return normalized
    .split(',')
    .filter(Boolean)
    .every((segment) => /^\d+$/.test(segment) && Number(segment) > 0)
}

export function normalizeVendorProductMappings(input: unknown): Array<{
  vendorProductId?: number
  code: string
  name: string
  model: string
  sort: number
}> {
  if (!Array.isArray(input)) return []
  return input
    .map((item: any, index: number) => ({
      vendorProductId: item?.vendorProductId ? Number(item.vendorProductId) : undefined,
      code: String(item?.code || '').trim(),
      name: String(item?.name || '').trim(),
      model: String(item?.model || '').trim(),
      sort: Number(item?.sort) || index + 1,
    }))
    .filter((item) => item.vendorProductId !== undefined || item.code)
}

export function normalizeTemuCategoryPath(input: unknown): string[] {
  if (Array.isArray(input)) {
    return Array.from(
      new Set(
        input
          .map((item) => String(item || '').trim())
          .filter(Boolean)
      )
    )
  }

  const raw = String(input || '').trim()
  if (!raw) {
    return []
  }

  const tryParseJsonArray = (value: string) => {
    try {
      const parsed = JSON.parse(value)
      return Array.isArray(parsed)
        ? parsed.map((item) => String(item || '').trim()).filter(Boolean)
        : []
    } catch {
      return []
    }
  }

  const parsedJsonArray = tryParseJsonArray(raw)
  const jsonArray = parsedJsonArray.length > 0
    ? parsedJsonArray
    : tryParseJsonArray(raw.replace(/'/g, '"'))
  if (jsonArray.length > 0) {
    return Array.from(new Set(jsonArray))
  }

  return Array.from(
    new Set(
      raw
        .split(/\r?\n|,|，|>|\/|\\|\|/g)
        .map((item) => item.trim())
        .filter(Boolean)
    )
  )
}

/** 解析 urlA|urlB 随机语法，返回选中的单个 URL */
export function resolveRandomUrl(input: string): string {
  const raw = String(input || '').trim()
  if (!raw) return ''
  const parts = raw.split('|').map((s) => s.trim()).filter(Boolean)
  if (parts.length === 0) return ''
  if (parts.length === 1) return parts[0]
  return parts[Math.floor(Math.random() * parts.length)]
}

/** 常用价格尾数，可随机选取 */
export const DEFAULT_PRICE_DECIMALS = [0.19, 0.5, 0.88, 0.99, 0.69, 0, 0.08, 0.66, 0.89, 0.9]

/**
 * 根据范围和尾数列表生成随机价格
 * @param min 最小值（元）
 * @param max 最大值（元）
 * @param decimals 可选尾数数组，默认使用 DEFAULT_PRICE_DECIMALS
 * @returns 形如 34.99 的价格
 */
export function generateRandomPrice(
  min: number,
  max: number,
  decimals: number[] = DEFAULT_PRICE_DECIMALS
): number {
  if (!Number.isFinite(min) || !Number.isFinite(max) || min < 0 || max < min) {
    return 0
  }
  const validDecimals = Array.isArray(decimals)
    ? decimals.filter((d) => Number.isFinite(d) && d >= 0 && d < 1)
    : []
  const pool = validDecimals.length > 0 ? validDecimals : [0]
  const integerPart = Math.floor(Math.random() * (Math.floor(max) - Math.ceil(min) + 1)) + Math.ceil(min)
  const decimal = pool[Math.floor(Math.random() * pool.length)]
  return Number((integerPart + decimal).toFixed(2))
}

export function normalizeSkuConfig(input: unknown): Array<{
  stockMode?: 'fixed' | 'random'
  stock?: number
  stockMin?: number
  stockMax?: number
  priceMode?: 'fixed' | 'random'
  price?: number
  priceMin?: number
  priceMax?: number
  priceDecimals?: number[]
  vendorProductId?: number
}> {
  if (!Array.isArray(input)) return []
  return input
    .map((item: any) => {
      if (!item || typeof item !== 'object') return null
      const result: {
        stockMode?: 'fixed' | 'random'
        stock?: number
        stockMin?: number
        stockMax?: number
        priceMode?: 'fixed' | 'random'
        price?: number
        priceMin?: number
        priceMax?: number
        priceDecimals?: number[]
        vendorProductId?: number
      } = {}
      // 保留模式字段
      if (item.stockMode === 'random' || item.stockMode === 'fixed') {
        result.stockMode = item.stockMode
      }
      if (item.priceMode === 'random' || item.priceMode === 'fixed') {
        result.priceMode = item.priceMode
      }
      if (item.stockMode === 'random') {
        const min = Number(item.stockMin)
        const max = Number(item.stockMax)
        if (Number.isFinite(min) && min >= 0 && Number.isFinite(max) && max >= min) {
          result.stockMin = min
          result.stockMax = max
        }
      } else {
        if (Number.isFinite(Number(item.stock)) && Number(item.stock) >= 0) {
          result.stock = Number(item.stock)
        }
      }
      if (item.priceMode === 'random') {
        const pMin = Number(item.priceMin)
        const pMax = Number(item.priceMax)
        if (Number.isFinite(pMin) && pMin >= 0 && Number.isFinite(pMax) && pMax >= pMin) {
          result.priceMin = pMin
          result.priceMax = pMax
          if (Array.isArray(item.priceDecimals)) {
            const validDecimals = item.priceDecimals
              .filter((d: any) => Number.isFinite(Number(d)) && Number(d) >= 0 && Number(d) < 1)
              .map((d: any) => Number(d))
            if (validDecimals.length > 0) {
              result.priceDecimals = validDecimals
            }
          }
        }
      } else {
        if (Number.isFinite(Number(item.price)) && Number(item.price) >= 0) {
          result.price = Number(item.price)
        }
      }
      if (Number.isFinite(Number(item.vendorProductId)) && Number(item.vendorProductId) > 0) {
        result.vendorProductId = Number(item.vendorProductId)
      }
      return result
    })
    .filter(Boolean)
}
