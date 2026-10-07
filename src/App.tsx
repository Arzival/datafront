import { useEffect, useMemo, useState } from 'react'
import { useVaultApi } from './hooks/useVaultApi.ts'
import { useProviders } from './hooks/useProviders.ts'
import { useReferences } from './hooks/useReferences.ts'
import { useInbox } from './hooks/useInbox.ts'
import { useStoredState } from './hooks/useStoredState.ts'
import { buildFacets, filterReferences } from './lib/facets.ts'
import { referencesToMixPrompt } from './lib/prompt.ts'
import { Icon } from './components/Icon.tsx'
import { Modal } from './components/Modal.tsx'
import { FilterPanel } from './components/FilterPanel.tsx'
import { InboxPanel } from './components/InboxPanel.tsx'
import { ImageViewer } from './components/ImageViewer.tsx'
import { ReferenceDetail } from './components/ReferenceDetail.tsx'
import { ReferenceGrid } from './components/ReferenceGrid.tsx'
import { SelectionBar } from './components/SelectionBar.tsx'
import { UploadPanel } from './components/UploadPanel.tsx'
import type { InboxItem, ProcessingChoice, Reference } from './types/vault.ts'
import './App.css'

const CHOICE_STORAGE_KEY = 'datafront.processing-choice'

export default function App() {
  const { api, status, ready: apiReady, recheck } = useVaultApi()
  const { providers, loading: providersLoading } = useProviders(api, apiReady)
  const { references, loading, error, refresh, upsert, removeLocal } = useReferences(api, apiReady)
  const [view, setView] = useState<'all' | 'mix' | 'inbox'>('all')
  const {
    inbox,
    loading: inboxLoading,
    error: inboxError,
    refresh: refreshInbox,
  } = useInbox(api, view === 'inbox', apiReady)

  const [choice, setChoice] = useStoredState<ProcessingChoice | null>(CHOICE_STORAGE_KEY, null)
  const [search, setSearch] = useState('')
  const [activeTagKeys, setActiveTagKeys] = useState<string[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  /** Ids del mix, en el orden en que se marcaron: ese orden llega al prompt. */
  const [pickedIds, setPickedIds] = useState<string[]>([])
  const [mixCopied, setMixCopied] = useState(false)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [statusFilter, setStatusFilter] = useState('all')
  const [sort, setSort] = useState('newest')
  const [compact, setCompact] = useState(false)
  const [copyError, setCopyError] = useState('')

  // Si no hay elección guardada (o apunta a un proveedor que ya no sirve),
  // nos quedamos con el primero disponible que reporte el backend.
  useEffect(() => {
    if (providers.length === 0) return
    const current = providers.find((item) => item.id === choice?.providerId)
    if (current?.available) return
    const fallback = providers.find((item) => item.available) ?? providers[0]
    if (fallback) setChoice({ providerId: fallback.id, model: fallback.defaultModel })
  }, [providers, choice, setChoice])

  const facets = useMemo(() => buildFacets(references), [references])
  const visible = useMemo(() => {
    return filterReferences(references, search, activeTagKeys)
      .filter((item) => view !== 'mix' || pickedIds.includes(item.id))
      .filter((item) => statusFilter === 'all' || (statusFilter === 'pending'
        ? item.status === 'pending' || item.status === 'processing'
        : item.status === statusFilter))
      .sort((a, b) => sort === 'name'
        ? (a.title ?? a.filename).localeCompare(b.title ?? b.filename)
        : (sort === 'oldest' ? 1 : -1) * (Date.parse(a.createdAt) - Date.parse(b.createdAt)))
  }, [references, search, activeTagKeys, view, pickedIds, statusFilter, sort])
  const selected = references.find((item) => item.id === selectedId) ?? null

  const picked = useMemo(
    () =>
      pickedIds
        .map((id) => references.find((item) => item.id === id))
        .filter((item): item is Reference => item !== undefined),
    [pickedIds, references],
  )

  const unpickedVisible = visible.filter((item) => !pickedIds.includes(item.id))

  function toggleTag(key: string): void {
    setActiveTagKeys((current) =>
      current.includes(key) ? current.filter((item) => item !== key) : [...current, key],
    )
  }

  function togglePick(reference: Reference): void {
    setPickedIds((current) =>
      current.includes(reference.id)
        ? current.filter((id) => id !== reference.id)
        : [...current, reference.id],
    )
  }

  async function copyMix(): Promise<void> {
    if (picked.length === 0) return
    try {
      setCopyError('')
      await navigator.clipboard.writeText(referencesToMixPrompt(picked))
      setMixCopied(true)
      setTimeout(() => setMixCopied(false), 1800)
    } catch {
      setCopyError('No se pudo copiar. Revisa el permiso del portapapeles e inténtalo de nuevo.')
    }
  }

  async function handleUpload(
    file: File,
    uploadChoice: ProcessingChoice,
    sourceUrl: string | null,
    onProgress: (percent: number) => void,
  ): Promise<Reference> {
    const created = await api.upload({ file, choice: uploadChoice, sourceUrl, onProgress })
    upsert(created)
    return created
  }

  async function handleReclassify(reference: Reference): Promise<void> {
    if (!choice) return
    const updated = await api.reclassify(reference.id, choice)
    upsert(updated)
  }

  async function handleDelete(reference: Reference): Promise<void> {
    await api.remove(reference.id)
    removeLocal(reference.id)
    setPickedIds((current) => current.filter((id) => id !== reference.id))
    setSelectedId(null)
  }

  const pending = references.filter(
    (item) => item.status === 'pending' || item.status === 'processing',
  ).length

  const ready = references.filter((item) => item.status === 'ready').length
  const failed = references.filter((item) => item.status === 'failed').length
  const filtering = search.length > 0 || activeTagKeys.length > 0 || statusFilter !== 'all'
  /**
   * Pasa una captura de la bandeja a la bóveda. El backend renombra el
   * original a __procesada, que es lo que impide que el homelab la recapture.
   */
  async function handleInboxImport(item: InboxItem): Promise<void> {
    if (!choice) return
    const created = await api.importFromInbox(item.filename, choice)
    upsert(created)
    await refreshInbox()
  }

  /** Descarta sin importar: el archivo no se borra, se marca con el motivo. */
  async function handleInboxReject(item: InboxItem, reason: string): Promise<void> {
    await api.rejectFromInbox(item.filename, reason)
    await refreshInbox()
  }

  function clearFilters() { setSearch(''); setActiveTagKeys([]); setStatusFilter('all') }

  return (
    <div className="app">
      <aside className={`app__sidebar${filtersOpen ? ' app__sidebar--open' : ''}`}>
        <a className="app__brand" href="#" onClick={(event) => { event.preventDefault(); setView('all'); clearFilters() }}>
          <span className="app__brand-mark"><Icon name="layers" size={23} /></span>
          <span>datafront<span className="app__brand-dot">.</span></span>
        </a>
        <nav className="sidebar__nav" aria-label="Biblioteca">
          <button className={view === 'all' ? 'nav-item nav-item--active' : 'nav-item'} onClick={() => { setView('all'); setFiltersOpen(false) }}><Icon name="grid" />Todas las referencias<span>{references.length}</span></button>
          <button className={view === 'mix' ? 'nav-item nav-item--active' : 'nav-item'} onClick={() => { setView('mix'); setFiltersOpen(false) }}><Icon name="layers" />Mi mix<span>{picked.length}</span></button>
          <button className={view === 'inbox' ? 'nav-item nav-item--active' : 'nav-item'} onClick={() => { setView('inbox'); setFiltersOpen(false) }}><Icon name="upload" />Bandeja del homelab<span>{inbox.items.length}</span></button>
        </nav>
        <div className="sidebar__divider" />
        <FilterPanel facets={facets} activeTagKeys={activeTagKeys} onToggleTag={toggleTag} onClear={clearFilters} />
        <div className="sidebar__bottom">

          <span className={`app__mode app__mode--${status}`}><span className="app__mode-dot" />{status === 'checking' ? 'Conectando…' : status === 'http' ? 'Backend conectado' : 'Modo de ejemplo'}<span className="sidebar__version">v.01</span></span>
        </div>
      </aside>
      {filtersOpen && <button className="sidebar__scrim" aria-label="Cerrar filtros" onClick={() => setFiltersOpen(false)} />}
      <div className="app__workspace">
        <header className="app__header">
          <button className="btn btn--icon mobile-menu" aria-label="Abrir filtros" onClick={() => setFiltersOpen(!filtersOpen)}><Icon name="filter" /></button>

          <label className="app__search"><Icon name="search" size={17} /><input type="search" aria-label="Buscar referencias" placeholder="Buscar referencias…" value={search} onChange={(event) => setSearch(event.target.value)} /></label>
          <button className="btn btn--primary" onClick={() => setUploadOpen(true)}><Icon name="plus" size={17} /><span>Subir referencias</span></button>
        </header>
        <main className="app__main">
          {status === 'mock' && <div className="app__banner"><span className="app__mode-dot" /><p><strong>Modo de ejemplo.</strong> Los cambios no se guardan.</p><button onClick={recheck}>Reconectar <Icon name="refresh" size={13} /></button></div>}
          {view === 'inbox' && (
            <InboxPanel
              inbox={inbox}
              loading={inboxLoading}
              error={inboxError}
              choice={choice}
              canImport={Boolean(choice && providers.find((p) => p.id === choice.providerId)?.available)}
              onRefresh={() => void refreshInbox()}
              onImport={handleInboxImport}
              onReject={handleInboxReject}
            />
          )}
          {view !== 'inbox' && (
          <section className="collection" aria-label="Catálogo de referencias">
            <div className="collection__heading"><h1>{view === 'all' ? 'Referencias' : 'Mi mix'} <span>{visible.length}</span></h1><button className="btn btn--ghost" onClick={() => void refresh()} aria-label="Actualizar biblioteca"><Icon name="refresh" size={16} /></button></div>
            <div className="collection__toolbar">
              <div className="collection__tabs" aria-label="Estado de clasificación">{[
                ['all', 'Todas', references.length], ['ready', 'Clasificadas', ready], ['pending', 'En proceso', pending], ['failed', 'Por revisar', failed],
              ].map(([value, label, count]) => <button key={value} className={statusFilter === value ? 'collection__tab collection__tab--active' : 'collection__tab'} aria-pressed={statusFilter === value} onClick={() => setStatusFilter(String(value))}>{label}<span>{count}</span></button>)}</div>
              <div className="collection__controls"><select aria-label="Ordenar referencias" value={sort} onChange={(event) => setSort(event.target.value)}><option value="newest">Más recientes</option><option value="oldest">Más antiguas</option><option value="name">Nombre A–Z</option></select><div className="view-toggle"><button className={!compact ? 'is-active' : ''} aria-label="Vista amplia" aria-pressed={!compact} onClick={() => setCompact(false)}><Icon name="grid" size={16} /></button><button className={compact ? 'is-active' : ''} aria-label="Vista compacta" aria-pressed={compact} onClick={() => setCompact(true)}><Icon name="compact" size={16} /></button></div></div>
            </div>
            <div className="collection__meta"><span>{filtering ? `${visible.length} resultados encontrados` : `${visible.length} referencias`}{filtering && <button onClick={clearFilters}>Limpiar filtros <Icon name="close" size={12} /></button>}</span>{unpickedVisible.length > 0 && <button onClick={() => setPickedIds((current) => [...current, ...unpickedVisible.map((item) => item.id)])}><Icon name="plus" size={14} />Añadir visibles al mix</button>}</div>
            {error && <p className="app__error" role="alert">{error}</p>}
            {loading && <div className="loading-grid" aria-label="Cargando referencias" role="status">{[1, 2, 3, 4, 5, 6].map((n) => <div key={n} />)}</div>}
            {!loading && visible.length === 0 && <div className="empty"><Icon name={view === 'mix' ? 'layers' : 'grid'} size={36} /><h3>{filtering ? 'Sin resultados' : view === 'mix' ? 'Sin referencias seleccionadas' : 'Sin referencias'}</h3><button className="btn btn--primary" onClick={() => filtering ? clearFilters() : view === 'mix' ? setView('all') : setUploadOpen(true)}>{filtering ? 'Limpiar filtros' : view === 'mix' ? 'Explorar biblioteca' : 'Subir referencias'}<Icon name="arrow" size={16} /></button></div>}
            {!loading && visible.length > 0 && <ReferenceGrid references={visible} selectedId={selectedId} pickedIds={pickedIds} compact={compact} onSelect={(reference) => setSelectedId(reference.id)} onTogglePick={togglePick} />}
          </section>
          )}

          {copyError && <p className="app__error" role="alert">{copyError}</p>}
          <SelectionBar picked={picked} onRemove={togglePick} onClear={() => setPickedIds([])} onCopyMix={() => void copyMix()} copied={mixCopied} />
        </main>
      </div>
      <Modal open={uploadOpen} onClose={() => setUploadOpen(false)} label="Subir referencias" className="upload-modal">
        <div className="upload-modal__intro"><h2>Subir referencias</h2><button className="btn btn--icon" aria-label="Cerrar subida" onClick={() => setUploadOpen(false)}><Icon name="close" /></button></div>
        <UploadPanel providers={providers} providersLoading={providersLoading} choice={choice} onChoiceChange={setChoice} onUpload={handleUpload} onPasteWhileClosed={() => setUploadOpen(true)} />
      </Modal>
      <Modal open={Boolean(selected)} onClose={() => setSelectedId(null)} label="Detalle de referencia" className="detail-modal">
        {selected && <ReferenceDetail key={selected.id} reference={selected} providers={providers} choice={choice} onChoiceChange={setChoice} onClose={() => setSelectedId(null)} onReclassify={handleReclassify} onDelete={handleDelete} />}
        {selected && <ImageViewer key={`visor-${selected.id}`} src={selected.imageUrl} alt={selected.title ?? selected.filename} />}
      </Modal>
    </div>
  )
}
