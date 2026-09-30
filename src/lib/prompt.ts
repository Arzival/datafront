import {
  TAG_CATEGORIES,
  TAG_CATEGORY_LABELS,
  type Reference,
  type TagCategory,
} from '../types/vault.ts'

/**
 * Traduce referencias a texto listo para pegar en un chat de IA. Siempre se
 * incluye la ruta en disco de la imagen: el objetivo es que el agente pueda
 * abrir la captura, no solo leer su descripción.
 */

function imageLocation(reference: Reference): string {
  return reference.filePath ?? `(sin ruta en disco todavía) ${reference.filename}`
}

function tagLines(reference: Reference): string[] {
  const lines: string[] = []
  for (const category of TAG_CATEGORIES) {
    const values = reference.tags
      .filter((tag) => tag.category === category)
      .map((tag) => tag.value)
    if (values.length === 0) continue
    lines.push(`- **${TAG_CATEGORY_LABELS[category]}:** ${values.join(', ')}`)
  }
  return lines
}

/** Prompt de una sola referencia. */
export function referenceToPrompt(reference: Reference): string {
  const lines: string[] = [
    `# Referencia de UI: ${reference.title ?? reference.filename}`,
    '',
    `Imagen: \`${imageLocation(reference)}\``,
    '',
  ]

  if (reference.summary) {
    lines.push(reference.summary, '')
  }

  lines.push(...tagLines(reference))

  if (reference.notes) {
    lines.push('', '## Notas de implementación', reference.notes)
  }

  if (reference.sourceUrl) {
    lines.push('', `Fuente original: ${reference.sourceUrl}`)
  }

  return lines.join('\n')
}

interface SharedTrait {
  category: TagCategory
  value: string
  count: number
}

/**
 * Tags que aparecen en más de una de las referencias seleccionadas. Son la
 * dirección dominante del mix: lo que ya se repite no hay que negociarlo.
 */
function sharedTraits(references: Reference[]): SharedTrait[] {
  const counts = new Map<string, SharedTrait>()

  for (const reference of references) {
    // Un tag repetido dentro de la misma referencia no cuenta dos veces.
    const seen = new Set<string>()
    for (const tag of reference.tags) {
      const key = `${tag.category}:${tag.value}`
      if (seen.has(key)) continue
      seen.add(key)

      const existing = counts.get(key)
      if (existing) existing.count += 1
      else counts.set(key, { category: tag.category, value: tag.value, count: 1 })
    }
  }

  return [...counts.values()]
    .filter((trait) => trait.count > 1)
    .sort(
      (a, b) =>
        b.count - a.count ||
        TAG_CATEGORIES.indexOf(a.category) - TAG_CATEGORIES.indexOf(b.category) ||
        a.value.localeCompare(b.value),
    )
}

/**
 * Prompt combinado de N referencias. Separa lo que comparten (la base) de lo
 * que aporta cada una, y cierra con la instrucción de qué hacer con el mix.
 */
export function referencesToMixPrompt(references: Reference[]): string {
  if (references.length === 1) {
    const only = references[0]
    if (only) return referenceToPrompt(only)
  }

  const total = references.length
  const lines: string[] = [
    `# Mix de ${total} referencias de UI`,
    '',
    'Quiero combinar las referencias de abajo en una sola propuesta de interfaz.',
    'Las capturas están en disco: ábrelas antes de proponer nada, las descripciones',
    'son un apoyo, no un sustituto de mirarlas.',
    '',
    '## Imágenes',
  ]

  references.forEach((reference, index) => {
    const title = reference.title ?? reference.filename
    lines.push(`${index + 1}. \`${imageLocation(reference)}\` — ${title}`)
  })

  const shared = sharedTraits(references)
  if (shared.length > 0) {
    lines.push(
      '',
      '## Rasgos compartidos',
      '',
      'Esto ya se repite entre las referencias; trátalo como la dirección dominante.',
      '',
    )
    for (const trait of shared) {
      lines.push(
        `- **${TAG_CATEGORY_LABELS[trait.category]}:** ${trait.value} (${trait.count} de ${total})`,
      )
    }
  }

  lines.push('', '## Qué aporta cada referencia')

  references.forEach((reference, index) => {
    const title = reference.title ?? reference.filename
    lines.push('', `### ${index + 1}. ${title}`, '', `Imagen: \`${imageLocation(reference)}\``, '')

    if (reference.summary) lines.push(reference.summary, '')

    const tags = tagLines(reference)
    if (tags.length > 0) lines.push(...tags)

    if (reference.notes) lines.push('', `Notas: ${reference.notes}`)
    if (reference.sourceUrl) lines.push('', `Fuente: ${reference.sourceUrl}`)
  })

  lines.push('', '## Qué necesito', '')

  if (shared.length > 0) {
    lines.push(
      'Combina lo anterior en una propuesta coherente, no en un collage. Usa los',
      'rasgos compartidos como base y toma de cada referencia lo que aporte sin',
      'romper esa base.',
    )
  } else {
    // Sin rasgos comunes no hay base que respetar: hay que elegir una dirección.
    lines.push(
      'Combina lo anterior en una propuesta coherente, no en un collage. Estas',
      'referencias no comparten ningún rasgo, así que elige tú la dirección',
      'dominante, dime cuál elegiste y usa las demás solo como detalle.',
    )
  }

  lines.push(
    '',
    'Donde dos referencias se contradigan (densidad alta contra baja, serif contra',
    'sans, claro contra oscuro), elige una opción y di explícitamente cuál',
    'descartaste y por qué.',
  )

  return lines.join('\n')
}
