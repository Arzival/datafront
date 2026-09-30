/**
 * Contrato de datos de la bóveda. Es la fuente de verdad compartida con el
 * backend (datafrontback): cualquier cambio aquí debe reflejarse en los
 * resources de Laravel y viceversa.
 */

export const TAG_CATEGORIES = [
  'screen_type',
  'style',
  'palette',
  'layout',
  'components',
  'density',
  'industry',
] as const

export type TagCategory = (typeof TAG_CATEGORIES)[number]

export const TAG_CATEGORY_LABELS: Record<TagCategory, string> = {
  screen_type: 'Tipo de pantalla',
  style: 'Estilo visual',
  palette: 'Paleta',
  layout: 'Layout',
  components: 'Componentes',
  density: 'Densidad',
  industry: 'Sector',
}

export interface Tag {
  category: TagCategory
  value: string
  /** 0–1 según lo seguro que estuviera el modelo. null si se etiquetó a mano. */
  confidence: number | null
}

export type ClassificationStatus = 'pending' | 'processing' | 'ready' | 'failed'

export const STATUS_LABELS: Record<ClassificationStatus, string> = {
  pending: 'En cola',
  processing: 'Clasificando',
  ready: 'Clasificada',
  failed: 'Falló',
}

export interface Reference {
  id: string
  /** Título corto que genera la IA. null mientras no se ha clasificado. */
  title: string | null
  filename: string
  imageUrl: string
  thumbUrl: string
  /**
   * Ruta absoluta del original en disco. Es lo que se incluye en los prompts
   * para que un agente (Claude Code, Codex) pueda abrir la imagen él mismo.
   * La sirve el backend; es null si el archivo aún no se ha materializado.
   */
  filePath: string | null
  width: number
  height: number
  bytes: number
  /** De dónde salió la captura, para dar crédito a la referencia. */
  sourceUrl: string | null
  status: ClassificationStatus
  /** Mensaje de error cuando status === 'failed'. */
  error: string | null
  /** Qué IA la procesó. */
  providerId: string | null
  model: string | null
  /** Descripción para leer. */
  summary: string | null
  /** Notas accionables: cómo reproducir el diseño. */
  notes: string | null
  tags: Tag[]
  createdAt: string
}

/** Un motor de IA capaz de clasificar imágenes. */
export interface Provider {
  id: string
  label: string
  /** 'cli' usa un binario local (tu suscripción); 'api' requiere API key. */
  kind: 'cli' | 'api'
  description: string
  available: boolean
  /** Por qué no se puede usar, cuando available === false. */
  unavailableReason: string | null
  models: ProviderModel[]
  defaultModel: string | null
  /** Si acepta un identificador de modelo escrito a mano. */
  allowCustomModel: boolean
}

export interface ProviderModel {
  id: string
  label: string
  hint: string | null
}

/** Qué IA debe encargarse del procesado. */
export interface ProcessingChoice {
  providerId: string
  model: string | null
}

/** Clave estable de un tag, usada para filtrar. */
export function tagKey(tag: Pick<Tag, 'category' | 'value'>): string {
  return `${tag.category}:${tag.value}`
}
