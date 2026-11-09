import { useMemo, useEffect } from 'react'
import { Heart, Loader } from 'lucide-react'
import { useFavorites, pruneFavoritesAgainstValidIds } from '../hooks/useFavorites'
import { useGuns } from '../hooks/useGuns'
import { getArchivedIds, getPermanentlyDeletedIds } from '../services/gunService'
import GUNS_LOCAL from '../data/guns'
import GunCard from '../components/gun/GunCard'

export default function FavoritesPage({ onSelectGun, onNavigateCatalog }) {
  const { favorites } = useFavorites()
  const { guns: apiGuns, loading } = useGuns({ limit: 50 })

  const activeCatalog = useMemo(() => {
    const archivedIds = getArchivedIds()
    const deletedIds = getPermanentlyDeletedIds()
    const source =
      apiGuns && apiGuns.length > 0
        ? apiGuns
        : GUNS_LOCAL.map((g, i) => ({ ...g, id: g.id || `local-${i}` }))

    return source.filter(
      (g) => !archivedIds.includes(String(g.id)) && !deletedIds.includes(String(g.id))
    )
  }, [apiGuns])

  // Begitu halaman Favorites selesai memuat katalog, pangkas semua ID favorit hantu/terhapus
  useEffect(() => {
    if (!loading && activeCatalog.length > 0) {
      pruneFavoritesAgainstValidIds(activeCatalog.map((g) => g.id))
    }
  }, [loading, activeCatalog])

  const favoriteGuns = useMemo(() => {
    const favSet = new Set(favorites.map(String))
    return activeCatalog.filter((g) => favSet.has(String(g.id)))
  }, [activeCatalog, favorites])

  return (
    <div className="favorites-page">
      <section className="masthead">
        <h1 className="display">Saved Hardware</h1>
        <p className="lede">Daftar persenjataan yang kamu tandai sebagai favorit.</p>
      </section>

      {loading ? (
        <div className="state-box">
          <Loader size={28} className="spin" />
          <p>Memeriksa daftar favorit...</p>
        </div>
      ) : favoriteGuns.length === 0 ? (
        <div className="state-box">
          <Heart size={32} stroke="#ef4444" />
          <p>Belum ada produk favorit yang ditandai.</p>
          {onNavigateCatalog && (
            <button type="button" className="btn btn--outline" onClick={onNavigateCatalog}>
              Jelajahi Katalog
            </button>
          )}
        </div>
      ) : (
        <ul className="stock">
          {favoriteGuns.map((gun) => (
            <GunCard key={gun.id} gun={gun} onSelect={onSelectGun} />
          ))}
        </ul>
      )}
    </div>
  )
}
