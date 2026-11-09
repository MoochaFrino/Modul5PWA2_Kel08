import { apiClient, IS_SUPABASE } from '../config/api'
import { removeFavoriteFromStorage } from '../hooks/useFavorites'

const ARCHIVED_IDS_KEY = 'archived_hardware'
const ARCHIVED_ITEMS_KEY = 'archived_hardware_objects'
const DELETED_PERMANENT_KEY = 'deleted_hardware_permanently'

export const getArchivedIds = () => {
  try {
    return (JSON.parse(localStorage.getItem(ARCHIVED_IDS_KEY)) || []).map(String)
  } catch {
    return []
  }
}

const saveArchivedIds = (ids) => {
  const clean = Array.from(new Set(ids.map(String)))
  localStorage.setItem(ARCHIVED_IDS_KEY, JSON.stringify(clean))
  window.dispatchEvent(new CustomEvent('archive-updated'))
}

export const getPermanentlyDeletedIds = () => {
  try {
    return (JSON.parse(localStorage.getItem(DELETED_PERMANENT_KEY)) || []).map(String)
  } catch {
    return []
  }
}

const addPermanentlyDeletedId = (id) => {
  const strId = String(id)
  const current = getPermanentlyDeletedIds()
  if (!current.includes(strId)) {
    localStorage.setItem(DELETED_PERMANENT_KEY, JSON.stringify([...current, strId]))
  }
}

export const getArchivedLocalObjects = () => {
  try {
    return JSON.parse(localStorage.getItem(ARCHIVED_ITEMS_KEY)) || {}
  } catch {
    return {}
  }
}

const saveArchivedLocalObject = (gun) => {
  if (!gun || gun.id == null) return
  const map = getArchivedLocalObjects()
  map[String(gun.id)] = gun
  localStorage.setItem(ARCHIVED_ITEMS_KEY, JSON.stringify(map))
}

const removeArchivedLocalObject = (id) => {
  const map = getArchivedLocalObjects()
  delete map[String(id)]
  localStorage.setItem(ARCHIVED_ITEMS_KEY, JSON.stringify(map))
}

export const normalizeProduct = (item) => {
  if (!item) return null
  let specsList = []
  if (Array.isArray(item.specs)) {
    specsList = item.specs.map((s, idx) => {
      if (typeof s === 'string') {
        const colonIndex = s.indexOf(':')
        if (colonIndex > -1) {
          return {
            id: `spec-${idx}`,
            name: s.substring(0, colonIndex).trim(),
            quantity: s.substring(colonIndex + 1).trim(),
          }
        }
        return { id: `spec-${idx}`, name: 'Specification', quantity: s.trim() }
      }
      return s
    })
  } else if (Array.isArray(item.ingredients)) {
    specsList = item.ingredients
  }

  const stepsList =
    Array.isArray(item.steps) && item.steps.length > 0
      ? item.steps
      : ['Verify firearm is unloaded.', 'Inspect receiver mechanism.']

  return {
    ...item,
    id: item.id,
    name: item.name || 'Hardware Piece',
    type: item.type || item.category || 'Hardware',
    category: item.type || item.category || 'Hardware',
    caliber: item.caliber || 'Standard',
    price: Number(item.price ?? item.cook_time ?? 0),
    description: item.description || '',
    image_url: item.image_url || item.image || '["/guns/pistol.svg"]',
    ingredients: specsList,
    steps: stepsList,
  }
}

class GunService {
  async getGuns(params = {}) {
    if (IS_SUPABASE) {
      const queryParts = ['select=*']
      if (params.search) queryParts.push(`name=ilike.*${encodeURIComponent(params.search)}*`)
      if (params.category && params.category !== 'All') {
        queryParts.push(`type=eq.${encodeURIComponent(params.category)}`)
      }
      queryParts.push(
        params.sort_by
          ? `order=${encodeURIComponent(params.sort_by)}.${params.order === 'desc' ? 'desc' : 'asc'}`
          : 'order=created_at.desc'
      )
      if (params.limit) queryParts.push(`limit=${params.limit}`)

      const queryString = queryParts.join('&')
      const data = await apiClient.get(`/rest/v1/products?${queryString}`)
      let list = Array.isArray(data) ? data.map(normalizeProduct) : []

      const archivedIds = getArchivedIds()
      const deletedIds = getPermanentlyDeletedIds()

      // Saring item yang sedang diarsipkan ATAU sudah dihapus permanen
      list = list.filter(
        (item) =>
          !archivedIds.includes(String(item.id)) && !deletedIds.includes(String(item.id))
      )

      return {
        success: true,
        data: list,
        pagination: { total: list.length, page: params.page || 1, limit: params.limit || 50 },
      }
    }
    const clean = Object.fromEntries(
      Object.entries(params).filter(([, v]) => v !== '' && v != null)
    )
    return apiClient.get('/api/v1/recipes', { params: clean })
  }

  async getArchivedGuns() {
    const deletedIds = getPermanentlyDeletedIds()
    const archivedIds = getArchivedIds().filter((id) => !deletedIds.includes(id))
    if (archivedIds.length === 0) return { success: true, data: [] }

    const storedMap = getArchivedLocalObjects()
    try {
      if (IS_SUPABASE) {
        const numericIds = archivedIds.filter((id) => !id.startsWith('local-'))
        let remoteList = []
        if (numericIds.length > 0) {
          const queryParts = ['select=*', `id=in.(${numericIds.join(',')})`]
          const data = await apiClient.get(`/rest/v1/products?${queryParts.join('&')}`)
          remoteList = Array.isArray(data) ? data.map(normalizeProduct) : []
        }
        const merged = archivedIds
          .map((id) => remoteList.find((r) => String(r.id) === id) || storedMap[id])
          .filter(Boolean)
        return { success: true, data: merged }
      }
    } catch {
      // Fallback ke penyimpanan objek lokal
    }
    const fallbackList = archivedIds.map((id) => storedMap[id]).filter(Boolean)
    return { success: true, data: fallbackList }
  }

  async getGunById(id) {
    const strId = String(id)
    // Cegah item yang sudah dihapus permanen agar tidak bisa dibuka kembali
    if (getPermanentlyDeletedIds().includes(strId)) {
      throw new Error('Senjata ini telah dihapus secara permanen.')
    }

    if (IS_SUPABASE) {
      const data = await apiClient.get(`/rest/v1/products?id=eq.${id}&select=*`)
      if (Array.isArray(data) && data.length > 0) {
        return { success: true, data: normalizeProduct(data[0]) }
      }
      throw new Error('Hardware item not found.')
    }
    return apiClient.get(`/api/v1/recipes/${id}`)
  }

  async createGun(data) {
    if (IS_SUPABASE) {
      const specsArray = Array.isArray(data.ingredients)
        ? data.ingredients.map((i) => `${i.name}: ${i.quantity}`)
        : []
      const payload = {
        name: data.name,
        type: data.type || 'Pistol',
        caliber: data.caliber || '9mm',
        price: Number(data.price ?? data.cook_time ?? 0),
        description: data.description || '',
        specs: specsArray,
        image_url: data.image_url || null,
      }
      const res = await apiClient.post('/rest/v1/products', payload, {
        headers: { Prefer: 'return=representation' },
      })
      window.dispatchEvent(new CustomEvent('guns-cache-invalidate'))
      return { success: true, data: normalizeProduct(Array.isArray(res) ? res[0] : res) }
    }
    return apiClient.post('/api/v1/recipes', data)
  }

  async updateGun(id, data) {
    if (IS_SUPABASE) {
      const payload = { updated_at: new Date().toISOString() }
      if (data.name !== undefined) payload.name = data.name
      if (data.type !== undefined) payload.type = data.type
      if (data.caliber !== undefined) payload.caliber = data.caliber
      if (data.price !== undefined || data.cook_time !== undefined) {
        payload.price = Number(data.price ?? 0)
      }
      if (data.description !== undefined) payload.description = data.description
      if (data.image_url !== undefined) payload.image_url = data.image_url
      const specsArray = Array.isArray(data.ingredients)
        ? data.ingredients.map((i) => `${i.name}: ${i.quantity}`)
        : undefined
      if (specsArray !== undefined) payload.specs = specsArray

      const res = await apiClient.patch(`/rest/v1/products?id=eq.${id}`, payload, {
        headers: { Prefer: 'return=representation' },
      })
      window.dispatchEvent(new CustomEvent('guns-cache-invalidate'))
      return { success: true, data: normalizeProduct(Array.isArray(res) ? res[0] : res) }
    }
    return apiClient.put(`/api/v1/recipes/${id}`, data)
  }

  // Soft Delete / Arsip: langsung hapus juga dari daftar Favorit agar tidak nyangkut
  async archiveGun(id, gunObj = null) {
    const strId = String(id)
    if (gunObj) saveArchivedLocalObject(gunObj)
    removeFavoriteFromStorage(strId)

    const archived = getArchivedIds()
    if (!archived.includes(strId)) {
      saveArchivedIds([...archived, strId])
    }
    return { success: true }
  }

  // Pulihkan dari Arsip ke Katalog (Hanya bisa jika belum dihapus permanen)
  async restoreGun(id) {
    const strId = String(id)
    if (getPermanentlyDeletedIds().includes(strId)) {
      throw new Error('Item sudah dihapus permanen dan tidak dapat dipulihkan.')
    }
    const archived = getArchivedIds().filter((aid) => aid !== strId)
    removeArchivedLocalObject(strId)
    saveArchivedIds(archived)
    window.dispatchEvent(new CustomEvent('guns-cache-invalidate'))
    return { success: true }
  }

  // Hard Delete (Hapus Permanen): hapus dari Supabase, hapus dari Arsip, hapus dari Favorit, & masukkan ke Blacklist Permanen
  async hardDeleteGun(id) {
    const strId = String(id)
    addPermanentlyDeletedId(strId)
    removeFavoriteFromStorage(strId)
    removeArchivedLocalObject(strId)

    const archived = getArchivedIds().filter((aid) => aid !== strId)
    saveArchivedIds(archived)

    if (IS_SUPABASE && !strId.startsWith('local-')) {
      try {
        await apiClient.delete(`/rest/v1/products?id=eq.${id}`)
      } catch {
        // Tetap terblokir permanen di sisi klien meskipun RLS server membatasi delete
      }
    }
    window.dispatchEvent(new CustomEvent('guns-cache-invalidate'))
    return { success: true }
  }
}

export default new GunService()
