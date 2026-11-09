import { Heart } from 'lucide-react'
import { useFavorites } from '../../hooks/useFavorites'

export default function FavoriteButton({ gunId, size = 16 }) {
  const { isFavorited, toggleFavorite } = useFavorites()
  const active = isFavorited(gunId)

  const handleClick = (e) => {
    e.stopPropagation()
    e.preventDefault()
    toggleFavorite(gunId)
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`card-act-btn ${active ? 'fav-active' : ''}`}
      title={active ? 'Hapus dari Favorit' : 'Tambah ke Favorit'}
      style={{
        borderColor: active ? '#ef4444' : undefined,
        backgroundColor: active ? 'rgba(239, 68, 68, 0.15)' : undefined,
        color: active ? '#ef4444' : undefined,
        transition: 'transform 0.1s ease, background-color 0.15s ease',
      }}
    >
      <Heart
        size={size}
        fill={active ? '#ef4444' : 'none'}
        stroke={active ? '#ef4444' : 'currentColor'}
      />
    </button>
  )
}
