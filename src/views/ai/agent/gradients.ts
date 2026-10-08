/** 液体/丝绸/霓虹/玻璃头像：g1–g100（样式在 agent-gradients.css） */
export const AGENT_GRADIENT_COUNT = 100

export const AGENT_GRADIENT_NAMES: string[] = (() => {
  const families = [
    'Ocean', 'Mint', 'Plasma', 'Sunset', 'Lava',
    'Arctic', 'Emerald', 'Lemon', 'Cobalt', 'PinkChrome',
    'Amber', 'CyanInk', 'Magenta', 'Tropic', 'Coral',
    'Berry', 'Ultra', 'Lime', 'Ice', 'Copper',
    'Aqua', 'Forest', 'Galaxy', 'Peach', 'Turq',
  ]
  const styles = ['Silk', 'Nebula', 'Disc', 'Ink', 'Neon', 'Weave', 'Glass', 'Blade', 'Aurora', 'Foil', 'Acid', 'Sphere']
  const names: string[] = []
  for (let i = 1; i <= AGENT_GRADIENT_COUNT; i++) {
    const fam = families[Math.floor((i - 1) / 4) % families.length]
    const st = styles[((Math.floor((i - 1) / 4) + ((i - 1) % 4) * 3) % 12)]
    names.push(`${fam} ${st} · ${String(i).padStart(2, '0')}`)
  }
  return names
})()

/** 未设置时按名称稳定落到 g1–g100 */
export function resolveAgentGradient(agent?: {
  avatarStyle?: string | null
  name?: string
  id?: string
}): string {
  const raw = String(agent?.avatarStyle || '').trim()
  const m = raw.match(/^g(\d{1,3})$/i) || raw.match(/^(\d{1,3})$/)
  if (m) {
    const n = Number(m[1])
    if (n >= 1 && n <= AGENT_GRADIENT_COUNT) return `g${n}`
  }
  const key = agent?.name || agent?.id || 'a'
  let hash = 0
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) | 0
  return `g${(Math.abs(hash) % AGENT_GRADIENT_COUNT) + 1}`
}
