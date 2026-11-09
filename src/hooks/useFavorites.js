import { useState, useEffect, useCallback } from 'react'

export const FAV_STORAGE_KEY = 'bore_barrel_favorites_v2'

export const getStoredFavorites = () => {
  try {
    const raw = localStorage.getItem(FAV_STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed.map(String) : []
  } catch {
    return []
  }
}

export const saveStoredFavorites = (list) => {
  try {
    const cleanList = Array.from(new Set(list.map(String)))
    localStorage.setItem(FAV_STORAGE_KEY, JSON.stringify(cleanList))
    window.dispatchEvent(new CustomEvent('favorites-updated', { detail: cleanList }))
  } catch (e) {
    console.error(e)
  }
}

// Hapus paksa ID tertentu dari daftar favorit (dipanggil saat senjata diarsipkan / dihapus)
export const removeFavoriteFromStorage = (gunId) => {
  if (gunId == null) return
  const strId = String(gunId)
  const current = getStoredFavorites()
  if (current.includes(strId)) {
    const updated = current.filter((id) => id !== strId)
    saveStoredFavorites(updated)
  }
}

// Sinkronisasi daftar favorit dengan ID katalog yang benar-benar valid & aktif
export const pruneFavoritesAgainstValidIds = (validIdsArray) => {
  if (!Array.isArray(validIdsArray)) return
  const validSet = new Set(validIdsArray.map(String))
  const current = getStoredFavorites()
  const cleaned = current.filter((id) => validSet.has(String(id)))

  // Jika ada ID hantu yang terbuang, perbarui storage & navbar seketika
  if (cleaned.length !== current.length) {
    saveStoredFavorites(cleaned)
  }
}

export function useFavorites() {
  const [favorites, setFavorites] = useState(() => getStoredFavorites())
  const [loading] = useState(false)

  useEffect(() => {
    const handleSync = (e) => {
      setFavorites(e.detail ? e.detail.map(String) : getStoredFavorites())
    }
    const handleStorage = () => setFavorites(getStoredFavorites())

    window.addEventListener('favorites-updated', handleSync)
    window.addEventListener('storage', handleStorage)
    return () => {
      window.removeEventListener('favorites-updated', handleSync)
      window.removeEventListener('storage', handleStorage)
    }
  }, [])

  const isFavorited = useCallback(
    (gunId) => {
      if (gunId == null) return false
      return favorites.some((id) => String(id) === String(gunId))
    },
    [favorites]
  )

  const toggleFavorite = useCallback((gunId) => {
    if (gunId == null) return
    const strId = String(gunId)
    const current = getStoredFavorites()
    const exists = current.some((id) => String(id) === strId)
    const updated = exists
      ? current.filter((id) => String(id) !== strId)
      : [...current, strId]

    setFavorites(updated)
    saveStoredFavorites(updated)
  }, [])

  return {
    favorites,
    loading,
    isFavorited,
    toggleFavorite,
    removeFavorite: removeFavoriteFromStorage,
    pruneFavorites: pruneFavoritesAgainstValidIds,
    refetch: () => setFavorites(getStoredFavorites()),
  }
}

export default useFavorites
