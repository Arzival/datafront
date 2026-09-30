export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  const units = ['KB', 'MB', 'GB']
  let value = bytes / 1024
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit += 1
  }
  return `${value.toFixed(value < 10 ? 1 : 0)} ${units[unit]}`
}

const relative = new Intl.RelativeTimeFormat('es', { numeric: 'auto' })

export function formatRelative(iso: string): string {
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return ''
  const seconds = Math.round((then - Date.now()) / 1000)
  const steps: [Intl.RelativeTimeFormatUnit, number][] = [
    ['second', 60],
    ['minute', 60],
    ['hour', 24],
    ['day', 30],
    ['month', 12],
  ]
  let value = seconds
  for (const [unit, limit] of steps) {
    if (Math.abs(value) < limit) return relative.format(value, unit)
    value = Math.round(value / limit)
  }
  return relative.format(value, 'year')
}

/** '#0f172a' → true si el color es oscuro, para elegir el texto de contraste. */
export function isDarkHex(hex: string): boolean {
  const clean = hex.replace('#', '')
  if (clean.length !== 3 && clean.length !== 6) return false
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean
  const r = parseInt(full.slice(0, 2), 16)
  const g = parseInt(full.slice(2, 4), 16)
  const b = parseInt(full.slice(4, 6), 16)
  // Luminancia relativa aproximada (ITU-R BT.601).
  return (r * 299 + g * 587 + b * 114) / 1000 < 140
}

export function isHexColor(value: string): boolean {
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value.trim())
}
