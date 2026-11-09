import { useState, useEffect, useCallback } from 'react'
import gunService, { getArchivedIds, getPermanentlyDeletedIds } from '../services/gunService'
import { pruneFavoritesAgainstValidIds } from './useFavorites'

const queryCache = {}

export const invalidateGunsCache = () => {
  Object.keys(queryCache).forEach((k) => delete queryCache[k])
}

export function useGuns(params = {}) {
  const [guns, setGuns] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [pagination, setPagination] = useState(null)
  const paramKey = JSON.stringify(params)

  const filterOutInactive = useCallback((list) => {
    const archivedIds = getArchivedIds()
    const deletedIds = getPermanentlyDeletedIds()
    const activeList = (list || []).filter(
      (item) =>
        !archivedIds.includes(String(item.id)) && !deletedIds.includes(String(item.id))
    )

    // Bersihkan otomatis ID favorit hantu yang tidak ada di daftar senjata aktif
    if (activeList.length > 0) {
      pruneFavoritesAgainstValidIds(activeList.map((item) => item.id))
    }

    return activeList
  }, [])

  const fetchGuns = useCallback(
    async (forceRefresh = false) => {
      if (!forceRefresh && queryCache[paramKey]) {
        const filtered = filterOutInactive(queryCache[paramKey].data)
        setGuns(filtered)
        setPagination(queryCache[paramKey].pagination)
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)
        const response = await gunService.getGuns(params)

        if (response.success) {
          queryCache[paramKey] = {
            data: response.data || [],
            pagination: response.pagination || null,
          }
          setGuns(filterOutInactive(response.data || []))
          setPagination(response.pagination || null)
        } else {
          setError(response.message || 'Failed to fetch products.')
        }
      } catch (err) {
        const pesanEror =
          typeof err.message === 'string'
            ? err.message
            : 'An error occurred while fetching products.'
        setError(pesanEror)
        setGuns([])
      } finally {
        setLoading(false)
      }
    },
    [paramKey, filterOutInactive]
  )

  useEffect(() => {
    fetchGuns(false)
  }, [fetchGuns])

  useEffect(() => {
    const handleArchiveUpdate = () => {
      setGuns((prev) => filterOutInactive(prev))
    }
    const handleCacheInvalidate = () => {
      invalidateGunsCache()
      fetchGuns(true)
    }
    window.addEventListener('archive-updated', handleArchiveUpdate)
    window.addEventListener('guns-cache-invalidate', handleCacheInvalidate)
    return () => {
      window.removeEventListener('archive-updated', handleArchiveUpdate)
      window.removeEventListener('guns-cache-invalidate', handleCacheInvalidate)
    }
  }, [filterOutInactive, fetchGuns])

  return {
    guns,
    loading,
    error,
    pagination,
    refetch: () => fetchGuns(true),
  }
}

export function useGunById(id) {
  const [gun, setGun] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchGun = useCallback(async () => {
    if (!id) {
      setLoading(false)
      return
    }
    if (queryCache[`gun_${id}`]) {
      setGun(queryCache[`gun_${id}`])
      setLoading(false)
      return
    }
    try {
      setLoading(true)
      setError(null)
      const response = await gunService.getGunById(id)
      if (response.success) {
        queryCache[`gun_${id}`] = response.data
        setGun(response.data)
      } else {
        setError(response.message || 'Product not found.')
      }
    } catch (err) {
      setError(err.message || 'Failed to load product details.')
      setGun(null)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchGun()
  }, [fetchGun])

  return { gun, loading, error, refetch: fetchGun }
}
