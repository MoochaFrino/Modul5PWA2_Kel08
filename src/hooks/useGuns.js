import { useState, useEffect, useCallback } from 'react'
import gunService from '../services/gunService'

const queryCache = {}

export function useGuns(params = {}) {
  const [guns, setGuns] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [pagination, setPagination] = useState(null)
  const paramKey = JSON.stringify(params)

  const fetchGuns = useCallback(async () => {
    if (queryCache[paramKey]) {
      setGuns(queryCache[paramKey].data)
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
          pagination: response.pagination || null
        }
        setGuns(response.data || [])
        setPagination(response.pagination || null)
      } else {
        setError(response.message || 'Failed to fetch products.')
      }
    } catch (err) {
      setError(err.message || 'An error occurred while fetching products.')
      setGuns([])
    } finally {
      setLoading(false)
    }
  }, [paramKey])

  useEffect(() => {
    fetchGuns()
  }, [fetchGuns])

  return { guns, loading, error, pagination, refetch: fetchGuns }
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
