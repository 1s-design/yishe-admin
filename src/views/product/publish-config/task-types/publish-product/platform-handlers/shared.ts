export function normalizeHttpUrlList(input: unknown): string[] {
  const values = Array.isArray(input)
    ? input
    : typeof input === 'string'
      ? input.split(/\r?\n/)
      : []

  return Array.from(
    new Set(
      values
        .map((item) => String(item || '').trim())
        .filter(Boolean)
        .filter((item) => /^https?:\/\//i.test(item))
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
