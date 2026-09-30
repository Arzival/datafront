import type {
  InboxItem,
  InboxStatus,
  ProcessingChoice,
  Provider,
  Reference,
  Tag,
} from '../types/vault.ts'
import { VaultApiError, type UploadInput, type VaultApi } from './VaultApi.ts'

/**
 * Bóveda de ejemplo en memoria. Sirve para trabajar la UI sin backend y para
 * ver el flujo completo de clasificación (en cola → clasificando → lista).
 * No persiste: al recargar vuelve al estado semilla.
 */

/**
 * Wireframe SVG como marcador de posición, para no depender de imágenes reales.
 * Cada layout separa las formas neutras (`base`) del elemento que lleva el
 * color de acento, así el thumbnail insinúa una jerarquía visual.
 */
interface Wireframe {
  base: string
  accent: string
}

const LAYOUTS = {
  dashboard: {
    base: '<rect x="76" y="14" width="90" height="10" rx="5"/><rect x="156" y="38" width="70" height="44" rx="8"/><rect x="236" y="38" width="70" height="44" rx="8"/><rect x="76" y="94" width="230" height="90" rx="8"/>',
    accent: '<rect x="0" y="0" width="64" height="200"/><rect x="76" y="38" width="70" height="44" rx="8"/>',
  },
  landing: {
    base: '<rect x="24" y="78" width="110" height="8" rx="4"/><rect x="196" y="48" width="100" height="100" rx="12"/><rect x="24" y="160" width="272" height="24" rx="6"/>',
    accent: '<rect x="0" y="0" width="320" height="26"/><rect x="24" y="52" width="150" height="16" rx="8"/><rect x="24" y="96" width="70" height="18" rx="9"/>',
  },
  checkout: {
    base: '<rect x="20" y="16" width="170" height="168" rx="10"/><rect x="204" y="16" width="96" height="76" rx="10"/><rect x="36" y="36" width="80" height="8" rx="4"/>',
    accent: '<rect x="204" y="104" width="96" height="20" rx="10"/><rect x="36" y="58" width="138" height="18" rx="6"/><rect x="36" y="86" width="138" height="18" rx="6"/>',
  },
  mobile: {
    base: '<rect x="110" y="8" width="100" height="184" rx="18"/><rect x="122" y="26" width="52" height="8" rx="4"/><rect x="122" y="100" width="76" height="12" rx="6"/><rect x="122" y="120" width="76" height="12" rx="6"/>',
    accent: '<rect x="122" y="46" width="76" height="46" rx="8"/><rect x="122" y="164" width="76" height="16" rx="8"/>',
  },
  pricing: {
    base: '<rect x="16" y="40" width="88" height="130" rx="10"/><rect x="216" y="40" width="88" height="130" rx="10"/>',
    accent: '<rect x="116" y="26" width="88" height="158" rx="10"/><rect x="120" y="10" width="80" height="8" rx="4"/>',
  },
  settings: {
    base: '<rect x="112" y="16" width="70" height="10" rx="5"/><rect x="112" y="42" width="192" height="30" rx="8"/><rect x="112" y="80" width="192" height="30" rx="8"/><rect x="112" y="118" width="192" height="30" rx="8"/>',
    accent: '<rect x="0" y="0" width="96" height="200"/><rect x="112" y="160" width="60" height="18" rx="9"/>',
  },
} satisfies Record<string, Wireframe>

type LayoutName = keyof typeof LAYOUTS

function panel(bg: string, accent: string, layout: LayoutName): string {
  const { base, accent: highlight } = LAYOUTS[layout]
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 200">` +
    `<rect width="320" height="200" fill="${bg}"/>` +
    `<g fill="#94a3b8" opacity="0.28">${base}</g>` +
    `<g fill="${accent}" opacity="0.85">${highlight}</g>` +
    `</svg>`
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

/**
 * Imita la ruta en la que el backend guardará los originales. En modo ejemplo
 * el archivo no existe: solo sirve para ver la forma del prompt.
 */
const MOCK_VAULT_DIR =
  '/Users/armandoreyesrivera/Documents/Proyectos/Laravel/datafrontback/storage/app/vault/images'

function vaultPath(filename: string): string {
  return `${MOCK_VAULT_DIR}/${filename}`
}

function tag(category: Tag['category'], value: string, confidence: number): Tag {
  return { category, value, confidence }
}

function daysAgo(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString()
}

const seed: Reference[] = [
  {
    id: 'ref-1',
    title: 'Dashboard analítico oscuro con sidebar fijo',
    filename: 'linear-analytics.png',
    imageUrl: panel('#0b1120', '#6366f1', 'dashboard'),
    thumbUrl: panel('#0b1120', '#6366f1', 'dashboard'),
    filePath: vaultPath('linear-analytics.png'),
    width: 2560,
    height: 1600,
    bytes: 842_113,
    sourceUrl: 'https://linear.app',
    status: 'ready',
    error: null,
    providerId: 'claude-cli',
    model: 'claude-opus-5',
    summary:
      'Panel de métricas sobre fondo casi negro con una navegación lateral estrecha y persistente. La jerarquía se apoya en tres tarjetas de KPI alineadas arriba y una tabla densa que ocupa el resto del ancho.',
    notes:
      'Sidebar de 64px con solo iconos, expandible al hover. Las tarjetas usan borde de 1px en lugar de sombra. El acento índigo aparece únicamente en datos y estados activos, nunca en superficies.',
    tags: [
      tag('screen_type', 'dashboard', 0.97),
      tag('style', 'dark minimal', 0.93),
      tag('layout', 'sidebar fijo', 0.95),
      tag('components', 'stat cards', 0.91),
      tag('components', 'data table', 0.89),
      tag('palette', '#0b1120', 0.99),
      tag('palette', '#6366f1', 0.94),
      tag('density', 'alta', 0.86),
      tag('industry', 'saas', 0.8),
    ],
    createdAt: daysAgo(1),
  },
  {
    id: 'ref-2',
    title: 'Landing editorial con tipografía grande',
    filename: 'landing-serif.png',
    imageUrl: panel('#fdfcf8', '#1c1917', 'landing'),
    thumbUrl: panel('#fdfcf8', '#1c1917', 'landing'),
    filePath: vaultPath('landing-serif.png'),
    width: 1920,
    height: 1280,
    bytes: 512_400,
    sourceUrl: null,
    status: 'ready',
    error: null,
    providerId: 'codex-cli',
    model: 'gpt-6.1-sol',
    summary:
      'Portada de producto con aire editorial: fondo hueso, titular en serif de gran tamaño y una sola imagen de apoyo a la derecha. El contraste lo hace la tipografía, no el color.',
    notes:
      'Titular alrededor de 72px con line-height 1.05 y tracking negativo. Un único botón sólido negro como CTA. Mucho espacio en blanco vertical entre bloques (~120px).',
    tags: [
      tag('screen_type', 'landing', 0.96),
      tag('style', 'editorial', 0.92),
      tag('style', 'serif tipográfico', 0.88),
      tag('layout', 'dos columnas asimétricas', 0.84),
      tag('components', 'hero', 0.94),
      tag('palette', '#fdfcf8', 0.98),
      tag('palette', '#1c1917', 0.97),
      tag('density', 'baja', 0.9),
    ],
    createdAt: daysAgo(3),
  },
  {
    id: 'ref-3',
    title: 'Checkout en dos columnas con resumen fijo',
    filename: 'checkout-stripe.png',
    imageUrl: panel('#ffffff', '#0ea5e9', 'checkout'),
    thumbUrl: panel('#ffffff', '#0ea5e9', 'checkout'),
    filePath: vaultPath('checkout-stripe.png'),
    width: 1600,
    height: 1000,
    bytes: 388_921,
    sourceUrl: 'https://stripe.com',
    status: 'ready',
    error: null,
    providerId: 'claude-cli',
    model: 'claude-opus-5',
    summary:
      'Formulario de pago a la izquierda y resumen del pedido anclado a la derecha. Los campos están agrupados en secciones con títulos pequeños en mayúsculas.',
    notes:
      'La columna del resumen queda sticky al hacer scroll. Inputs de 44px de alto con borde gris claro y foco en azul. El botón de pago ocupa el 100% del ancho de su columna.',
    tags: [
      tag('screen_type', 'checkout', 0.98),
      tag('style', 'clean corporativo', 0.85),
      tag('layout', 'dos columnas con sticky', 0.93),
      tag('components', 'form', 0.97),
      tag('components', 'order summary', 0.9),
      tag('palette', '#ffffff', 0.99),
      tag('palette', '#0ea5e9', 0.92),
      tag('density', 'media', 0.88),
      tag('industry', 'fintech', 0.86),
    ],
    createdAt: daysAgo(6),
  },
  {
    id: 'ref-4',
    title: 'App móvil de hábitos con tarjetas apiladas',
    filename: 'habit-mobile.png',
    imageUrl: panel('#f5f3ff', '#7c3aed', 'mobile'),
    thumbUrl: panel('#f5f3ff', '#7c3aed', 'mobile'),
    filePath: vaultPath('habit-mobile.png'),
    width: 1170,
    height: 2532,
    bytes: 724_010,
    sourceUrl: null,
    status: 'ready',
    error: null,
    providerId: 'claude-cli',
    model: 'claude-sonnet-5',
    summary:
      'Pantalla principal de una app de seguimiento de hábitos. Tarjetas redondeadas apiladas verticalmente, cada una con un anillo de progreso y acento violeta.',
    notes:
      'Radios muy generosos (20–24px). Fondo lila tenue que separa las tarjetas blancas sin necesidad de bordes. Barra inferior de navegación con cuatro iconos.',
    tags: [
      tag('screen_type', 'app móvil', 0.95),
      tag('style', 'soft playful', 0.9),
      tag('layout', 'lista vertical de tarjetas', 0.92),
      tag('components', 'progress ring', 0.87),
      tag('components', 'bottom nav', 0.91),
      tag('palette', '#f5f3ff', 0.97),
      tag('palette', '#7c3aed', 0.95),
      tag('density', 'baja', 0.85),
      tag('industry', 'productividad', 0.82),
    ],
    createdAt: daysAgo(9),
  },
  {
    id: 'ref-5',
    title: 'Tabla de precios con plan destacado',
    filename: 'pricing-3col.png',
    imageUrl: panel('#0f172a', '#22d3ee', 'pricing'),
    thumbUrl: panel('#0f172a', '#22d3ee', 'pricing'),
    filePath: vaultPath('pricing-3col.png'),
    width: 1800,
    height: 1100,
    bytes: 455_332,
    sourceUrl: null,
    status: 'failed',
    error: 'El proveedor devolvió un JSON inválido en el segundo intento.',
    providerId: 'codex-cli',
    model: 'gpt-6.1-sol',
    summary: null,
    notes: null,
    tags: [],
    createdAt: daysAgo(0.2),
  },
  {
    id: 'ref-6',
    title: null,
    filename: 'settings-panel.png',
    imageUrl: panel('#18181b', '#a3e635', 'settings'),
    thumbUrl: panel('#18181b', '#a3e635', 'settings'),
    filePath: vaultPath('settings-panel.png'),
    width: 2048,
    height: 1280,
    bytes: 601_882,
    sourceUrl: null,
    status: 'pending',
    error: null,
    providerId: null,
    model: null,
    summary: null,
    notes: null,
    tags: [],
    createdAt: daysAgo(0.05),
  },
]

const mockProviders: Provider[] = [
  {
    id: 'claude-cli',
    label: 'Claude Code (CLI local)',
    kind: 'cli',
    description:
      'Usa el binario `claude` instalado en tu máquina. No consume API key: va contra tu suscripción.',
    available: true,
    unavailableReason: null,
    models: [
      { id: 'claude-opus-5', label: 'Opus 5', hint: 'El más capaz' },
      { id: 'claude-sonnet-5', label: 'Sonnet 5', hint: 'Equilibrado' },
      { id: 'claude-haiku-4-5', label: 'Haiku 4.5', hint: 'El más rápido' },
    ],
    defaultModel: 'claude-opus-5',
    allowCustomModel: false,
  },
  {
    id: 'codex-cli',
    label: 'Codex (CLI local)',
    kind: 'cli',
    description:
      'Usa el binario `codex` con `codex exec -i`. Tampoco consume API key propia.',
    available: true,
    unavailableReason: null,
    models: [
      { id: 'gpt-6.1-sol', label: 'Sol', hint: 'gpt-6.1-sol' },
      { id: 'gpt-6-astra', label: 'Astra', hint: 'gpt-6-astra' },
    ],
    defaultModel: 'gpt-6.1-sol',
    allowCustomModel: false,
  },
  {
    id: 'claude-api',
    label: 'Anthropic API',
    kind: 'api',
    description:
      'Llamada directa a la Messages API. Más rápido en lotes grandes, pero se factura aparte.',
    available: false,
    unavailableReason: 'Falta ANTHROPIC_API_KEY en el .env del backend',
    models: [
      { id: 'claude-opus-5', label: 'Opus 5', hint: null },
      { id: 'claude-sonnet-5', label: 'Sonnet 5', hint: null },
      { id: 'claude-haiku-4-5', label: 'Haiku 4.5', hint: null },
    ],
    defaultModel: 'claude-opus-5',
    allowCustomModel: false,
  },
]

/**
 * Bandeja simulada. Cubre los tres casos que la UI tiene que saber manejar:
 * una captura normal, una que sigue sincronizándose y otra que ya está en la
 * bóveda porque la subiste a mano antes.
 */
let inboxItems: InboxItem[] = [
  {
    filename: '20260930-101500__e5f7a1c3__pendiente.png',
    hash: 'e5f7a1c3',
    capturedAt: daysAgo(0.1),
    bytes: 684_221,
    width: 1440,
    height: 900,
    settling: false,
    alreadyInVault: false,
    previewUrl: panel('#0f172a', '#38bdf8', 'dashboard'),
    sourceUrl: 'https://proyectorium.app/projects',
    sourceTitle: 'Proyectorium — Proyectos',
  },
  {
    filename: '20260930-094210__b2c8d4f6__pendiente.png',
    hash: 'b2c8d4f6',
    capturedAt: daysAgo(0.15),
    bytes: 412_880,
    width: 1280,
    height: 800,
    settling: true,
    alreadyInVault: false,
    previewUrl: panel('#fefce8', '#ca8a04', 'pricing'),
    sourceUrl: 'https://stripe.com/pricing',
    sourceTitle: 'Pricing — Stripe',
  },
  {
    filename: '20260929-221040__a3f9c2e1__pendiente.png',
    hash: 'a3f9c2e1',
    capturedAt: daysAgo(0.4),
    bytes: 902_114,
    width: 1179,
    height: 2676,
    settling: false,
    alreadyInVault: true,
    previewUrl: panel('#18181b', '#f472b6', 'mobile'),
    sourceUrl: null,
    sourceTitle: null,
  },
]

let references: Reference[] = seed.map((item) => ({ ...item }))
let counter = references.length

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function find(id: string): Reference {
  const match = references.find((item) => item.id === id)
  if (!match) throw new VaultApiError('Esa referencia ya no existe', 404)
  return match
}

/** Resultado inventado pero con forma realista, para ver la UI completa. */
function fakeClassification(reference: Reference, choice: ProcessingChoice): Reference {
  return {
    ...reference,
    status: 'ready',
    providerId: choice.providerId,
    model: choice.model,
    title: reference.title ?? `Referencia ${reference.filename}`,
    summary:
      'Clasificación simulada: el backend todavía no está conectado, así que este texto es de ejemplo para poder maquetar la ficha completa.',
    notes:
      'Cuando el backend esté conectado, aquí aparecerán las notas de implementación reales que devuelva el modelo.',
    tags: [
      tag('screen_type', 'sin clasificar', 0.5),
      tag('style', 'pendiente de backend', 0.5),
      tag('palette', '#64748b', 0.5),
    ],
    error: null,
  }
}

/** Simula el trabajo en cola: pending → processing → ready. */
function scheduleClassification(id: string, choice: ProcessingChoice): void {
  void (async () => {
    await delay(900)
    const queued = references.find((item) => item.id === id)
    if (!queued) return
    references = references.map((item) =>
      item.id === id ? { ...item, status: 'processing', providerId: choice.providerId } : item,
    )

    await delay(2600)
    const processing = references.find((item) => item.id === id)
    if (!processing) return
    references = references.map((item) =>
      item.id === id ? fakeClassification(item, choice) : item,
    )
  })()
}

export const mockVault: VaultApi = {
  mode: 'mock',

  async listProviders() {
    await delay(120)
    return mockProviders.map((item) => ({ ...item }))
  },

  async listReferences() {
    await delay(160)
    return references.map((item) => ({ ...item }))
  },

  async getReference(id) {
    await delay(80)
    return { ...find(id) }
  },

  async upload({ file, choice, sourceUrl, onProgress }: UploadInput) {
    for (const percent of [12, 38, 64, 88, 100]) {
      await delay(110)
      onProgress?.(percent)
    }

    const objectUrl = URL.createObjectURL(file)
    counter += 1
    const created: Reference = {
      id: `ref-local-${counter}`,
      title: null,
      filename: file.name,
      imageUrl: objectUrl,
      thumbUrl: objectUrl,
      filePath: vaultPath(file.name),
      width: 0,
      height: 0,
      bytes: file.size,
      sourceUrl: sourceUrl ?? null,
      status: 'pending',
      error: null,
      providerId: null,
      model: choice.model,
      summary: null,
      notes: null,
      tags: [],
      createdAt: new Date().toISOString(),
    }

    references = [created, ...references]
    scheduleClassification(created.id, choice)
    return { ...created }
  },

  async reclassify(id, choice) {
    await delay(140)
    const target = find(id)
    references = references.map((item) =>
      item.id === id
        ? { ...item, status: 'pending', error: null, tags: [], summary: null, notes: null }
        : item,
    )
    scheduleClassification(target.id, choice)
    return { ...find(id) }
  },

  async remove(id) {
    await delay(120)
    find(id)
    references = references.filter((item) => item.id !== id)
  },

  async inbox(): Promise<InboxStatus> {
    await delay(150)

    return {
      path: '~/Sync/datafront-inbox',
      exists: true,
      rejectReasons: [
        { id: 'borrosa', label: 'Borrosa o ilegible' },
        { id: 'irrelevante', label: 'No me sirve como referencia' },
      ],
      items: inboxItems.map((item) => ({ ...item })),
    }
  },

  async importFromInbox(filename, choice, sourceUrl) {
    await delay(320)

    const item = inboxItems.find((entry) => entry.filename === filename)
    if (!item) throw new VaultApiError('Esa captura ya no está en la bandeja', 404)
    if (item.settling) {
      throw new VaultApiError('El archivo sigue sincronizándose. Espera unos segundos.', 422)
    }

    counter += 1
    const created: Reference = {
      id: `ref-inbox-${counter}`,
      title: null,
      filename,
      imageUrl: item.previewUrl,
      thumbUrl: item.previewUrl,
      filePath: `~/Sync/datafront-inbox/${filename}`,
      width: item.width,
      height: item.height,
      bytes: item.bytes,
      sourceUrl: sourceUrl ?? null,
      status: 'pending',
      error: null,
      providerId: null,
      model: choice.model,
      summary: null,
      notes: null,
      tags: [],
      createdAt: new Date().toISOString(),
    }

    references = [created, ...references]
    // Sale de la bandeja: en el backend real pasa a __procesada.
    inboxItems = inboxItems.filter((entry) => entry.filename !== filename)
    scheduleClassification(created.id, choice)

    return { ...created }
  },

  async rejectFromInbox(filename) {
    await delay(200)

    if (!inboxItems.some((entry) => entry.filename === filename)) {
      throw new VaultApiError('Esa captura ya no está en la bandeja', 404)
    }

    // El archivo no se borra: se renombra a __rechazada-<motivo>.
    inboxItems = inboxItems.filter((entry) => entry.filename !== filename)
  },
}
