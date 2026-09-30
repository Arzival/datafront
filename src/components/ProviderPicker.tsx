import { useState } from 'react'
import type { ProcessingChoice, Provider } from '../types/vault.ts'
import './ProviderPicker.css'

interface ProviderPickerProps {
  providers: Provider[]
  value: ProcessingChoice | null
  onChange: (choice: ProcessingChoice) => void
  loading: boolean
}

const CUSTOM_MODEL = '__custom__'

/**
 * Elige qué IA se encarga del procesado. El backend expone los proveedores
 * disponibles con su motivo de indisponibilidad, así que aquí solo se pintan.
 */
export function ProviderPicker({ providers, value, onChange, loading }: ProviderPickerProps) {
  const [customProvider, setCustomProvider] = useState<string | null>(null)
  const selected = providers.find((item) => item.id === value?.providerId) ?? null
  const model = value?.model ?? null
  const knownModel = selected?.models.some((item) => item.id === (model ?? ''))
  const usingCustom = Boolean(selected?.allowCustomModel && (customProvider === selected.id || (model && !knownModel)))

  function selectProvider(providerId: string): void {
    setCustomProvider(null)
    const provider = providers.find((item) => item.id === providerId)
    onChange({ providerId, model: provider?.defaultModel ?? null })
  }

  function selectModel(next: string): void {
    if (!value) return
    if (next === CUSTOM_MODEL) {
      setCustomProvider(value.providerId)
      onChange({ ...value, model: '' })
      return
    }
    setCustomProvider(null)
    onChange({ ...value, model: next })
  }

  if (loading) {
    return <p className="hint">Consultando proveedores disponibles…</p>
  }

  if (providers.length === 0) {
    return <p className="hint">El backend no reportó ningún proveedor de IA.</p>
  }

  return (
    <div className="picker">
      <div className="picker__row">
        <label className="field">
          <span className="field__label">Procesa con</span>
          <select
            className="select"
            value={selected?.id ?? ''}
            onChange={(event) => selectProvider(event.target.value)}
          >
            {providers.map((provider) => (
              <option key={provider.id} value={provider.id} disabled={!provider.available}>
                {provider.label}
                {provider.available ? '' : ' — no disponible'}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span className="field__label">Modelo</span>
          <select
            className="select"
            value={usingCustom ? CUSTOM_MODEL : (model ?? '')}
            onChange={(event) => selectModel(event.target.value)}
            disabled={!selected}
          >
            {selected?.models.map((item) => (
              <option key={item.id || 'default'} value={item.id}>
                {item.label}
              </option>
            ))}
            {selected?.allowCustomModel && (
              <option value={CUSTOM_MODEL}>Otro (escribir)…</option>
            )}
          </select>
        </label>
      </div>

      {usingCustom && (
        <label className="field">
          <span className="field__label">Identificador del modelo</span>
          <input
            className="input"
            value={model ?? ''}
            placeholder="el que pasarías a codex -m"
            onChange={(event) => value && onChange({ ...value, model: event.target.value })}
          />
        </label>
      )}

      {selected && (
        <p className="picker__desc">
          <span className="picker__badge">{selected.kind === 'cli' ? 'CLI local' : 'API'}</span>
          {selected.description}
        </p>
      )}

      {selected && !selected.available && selected.unavailableReason && (
        <p className="picker__warning">{selected.unavailableReason}</p>
      )}
    </div>
  )
}
