import { useState, useMemo, useEffect } from 'react'
import { RefreshCw, Plus, Loader, AlertCircle, PackageOpen, Check } from 'lucide-react'
import { useGuns } from '../hooks/useGuns'
import GUNS_LOCAL from '../data/guns'
import GunCard from '../components/gun/GunCard'
import AdvancedFilter from '../components/common/AdvancedFilter'
import gunService, { getArchivedIds } from '../services/gunService'
import { matchesSearch, matchesCategory, sortItems, extractCategories } from '../utils/helpers'

export default function Catalog({ onNavigate }) {
  const { guns: apiGuns, loading, error, refetch } = useGuns({ limit: 50 })
  const [useLocal, setUseLocal] = useState(false)
  const [archivedVersion, setArchivedVersion] = useState(0)
  const [toastMsg, setToastMsg] = useState('')

  useEffect(() => {
    const onArchiveChange = () => setArchivedVersion((v) => v + 1)
    window.addEventListener('archive-updated', onArchiveChange)
    return () => window.removeEventListener('archive-updated', onArchiveChange)
  }, [])

  const rawGuns = useMemo(() => {
    const archivedIds = getArchivedIds().map(String)
    const baseList =
      useLocal || (error && apiGuns.length === 0)
        ? GUNS_LOCAL.map((g, i) => ({ ...g, id: g.id || `local-${i}` }))
        : apiGuns
    return baseList.filter((g) => !archivedIds.includes(String(g.id)))
  }, [apiGuns, error, useLocal, archivedVersion])

  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState('All')
  const [sortKey, setSortKey] = useState('name')
  const [sortOrder, setSortOrder] = useState('asc')
  const categories = useMemo(() => extractCategories(rawGuns), [rawGuns])

  const filteredGuns = useMemo(() => {
    const result = rawGuns.filter(
      (g) => matchesSearch(g, search) && matchesCategory(g, activeCategory)
    )
    return sortItems(result, sortKey, sortOrder)
  }, [rawGuns, search, activeCategory, sortKey, sortOrder])

  // Arsipkan instan begitu tombol arsip diklik
  const handleInstantArchive = async (gun) => {
    if (!gun) return
    await gunService.archiveGun(gun.id, gun)
    setArchivedVersion((v) => v + 1)
    setToastMsg(`"${gun.name}" langsung dipindahkan ke Gudang Arsip di menu Profile.`)
    setTimeout(() => setToastMsg(''), 3000)
  }

  return (
    <>
      <section className="masthead">
        <h1 className="display">Hardware, by the spec sheet.</h1>
        <p className="lede">
          A small armory of pistols, rifles, and shotguns. Every piece listed with its type,
          caliber, and price — nothing else.
        </p>
      </section>

      {toastMsg && (
        <div className="toast toast--success" style={{ marginBottom: '16px' }}>
          <Check size={18} /> {toastMsg}
        </div>
      )}

      <section>
        <div className="list-head">
          <h2>Current stock</h2>
          <div className="list-head-right">
            <span className="count">
              {filteredGuns.length} piece{filteredGuns.length !== 1 ? 's' : ''}
            </span>
            {onNavigate && (
              <button
                type="button"
                className="btn btn--primary btn--sm"
                onClick={() => onNavigate('Create')}
              >
                <Plus size={16} /> Add
              </button>
            )}
          </div>
        </div>

        <AdvancedFilter
          search={search}
          onSearch={setSearch}
          categories={categories}
          activeCategory={activeCategory}
          onCategory={setActiveCategory}
          sortKey={sortKey}
          sortOrder={sortOrder}
          onSort={({ key, order }) => {
            setSortKey(key)
            setSortOrder(order)
          }}
        />

        {loading && (
          <div className="state-box">
            <Loader size={28} className="spin" />
            <p>Loading products…</p>
          </div>
        )}
        {!loading && error && !useLocal && (
          <div className="state-box state-box--error">
            <AlertCircle size={28} />
            <p>{error}</p>
            <div className="state-box__actions">
              <button type="button" className="btn btn--outline" onClick={refetch}>
                <RefreshCw size={16} /> Retry
              </button>
              <button
                type="button"
                className="btn btn--outline"
                onClick={() => setUseLocal(true)}
              >
                View Local Catalog
              </button>
            </div>
          </div>
        )}
        {!loading && filteredGuns.length === 0 && !error && (
          <div className="state-box">
            <PackageOpen size={28} />
            <p>No products match your search.</p>
          </div>
        )}

        {filteredGuns.length > 0 && (
          <ul className="stock">
            {filteredGuns.map((gun) => (
              <GunCard
                key={gun.id || gun.name}
                gun={gun}
                onSelect={(g) => onNavigate('Detail', g)}
                onEdit={onNavigate ? (g) => onNavigate('Edit', g) : undefined}
                onDelete={handleInstantArchive}
              />
            ))}
          </ul>
        )}
      </section>
    </>
  )
}
