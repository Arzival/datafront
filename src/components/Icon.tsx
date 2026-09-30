import type { CSSProperties } from 'react'

const paths = {
  grid: 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
  layers: 'm12 3 10 6-10 6L2 9l10-6 M2 14l10 6 10-6 M2 19l10 6 10-6',
  plus: 'M12 5v14 M5 12h14',
  search: 'M21 21l-5-5 M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0',
  arrow: 'M5 12h14 M13 6l6 6-6 6',
  upload: 'M12 16V3 M7 8l5-5 5 5 M4 15v6h16v-6',
  spark: 'm12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3',
  close: 'm6 6 12 12 M6 18 18 6',
  refresh: 'M20 7a9 9 0 1 0 1 8 M20 2v6h-6',
  filter: 'M4 7h16 M4 17h16 M8 4v6 M16 14v6',
  check: 'm5 12 4 4L19 6',
  chevron: 'm9 5 7 7-7 7',
  clock: 'M12 8v5l3 2 M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',
  copy: 'M9 9h12v12H9z M15 5V3H3v12h2',
  compact: 'M3 3h4v4H3z M10 3h4v4h-4z M17 3h4v4h-4z M3 10h4v4H3z M10 10h4v4h-4z M17 10h4v4h-4z M3 17h4v4H3z M10 17h4v4h-4z M17 17h4v4h-4z',
} as const
export function Icon({ name, size = 18, style }: { name: keyof typeof paths; size?: number; style?: CSSProperties }) {
  return <svg width={size} height={size} viewBox="0 0 24 26" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={style}><path d={paths[name]} /></svg>
}
