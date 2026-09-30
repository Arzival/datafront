const rawBase = (import.meta.env.VITE_API_URL ?? '').trim()

/** Base de la API sin barra final. Vacío si no se configuró. */
export const API_BASE_URL = rawBase.replace(/\/+$/, '')

/** Fuerza los datos de ejemplo aunque el backend responda. */
export const FORCE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'
