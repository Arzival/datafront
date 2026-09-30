import {
  TAG_CATEGORIES,
  tagKey,
  type Reference,
  type Tag,
  type TagCategory,
} from '../types/vault.ts'

export interface Facet {
  category: TagCategory
  values: { value: string; count: number; key: string }[]
}

/** Agrupa y cuenta los tags presentes en la bóveda, por categoría. */
export function buildFacets(references: Reference[]): Facet[] {
  const counts = new Map<string, { tag: Tag; count: number }>()

  for (const reference of references) {
    for (const tag of reference.tags) {
      const key = tagKey(tag)
      const existing = counts.get(key)
      if (existing) existing.count += 1
      else counts.set(key, { tag, count: 1 })
    }
  }

  return TAG_CATEGORIES.map((category) => ({
    category,
    values: [...counts.entries()]
      .filter(([, entry]) => entry.tag.category === category)
      .map(([key, entry]) => ({ key, value: entry.tag.value, count: entry.count }))
      .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value)),
  })).filter((facet) => facet.values.length > 0)
}

/** Texto libre + AND entre tags seleccionados. */
export function filterReferences(
  references: Reference[],
  search: string,
  activeTagKeys: string[],
): Reference[] {
  const needle = search.trim().toLowerCase()

  return references.filter((reference) => {
    if (activeTagKeys.length > 0) {
      const own = new Set(reference.tags.map(tagKey))
      if (!activeTagKeys.every((key) => own.has(key))) return false
    }

    if (!needle) return true

    const haystack = [
      reference.title,
      reference.filename,
      reference.summary,
      reference.notes,
      reference.sourceUrl,
      ...reference.tags.map((tag) => tag.value),
    ]
      .filter((value): value is string => Boolean(value))
      .join(' ')
      .toLowerCase()

    return haystack.includes(needle)
  })
}
