import { apiClient, IS_SUPABASE } from '../config/api'

// --- HELPER SOFT DELETE CLIENT-SIDE ---
const getArchivedIds = () => {
  try {
    const raw = localStorage.getItem('archived_hardware');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const archiveId = (id) => {
  const archived = getArchivedIds();
  if (!archived.includes(id)) {
    archived.push(id);
    localStorage.setItem('archived_hardware', JSON.stringify(archived));
  }
};
// --------------------------------------

export const normalizeProduct = (item) => {
  if (!item) return null
  let specsList = []
  if (Array.isArray(item.specs)) {
    specsList = item.specs.map((s, idx) => {
      if (typeof s === 'string') {
        const colonIndex = s.indexOf(':')
        if (colonIndex > -1) {
          return { id: `spec-${idx}`, name: s.substring(0, colonIndex).trim(), quantity: s.substring(colonIndex + 1).trim() }
        }
        return { id: `spec-${idx}`, name: 'Specification', quantity: s.trim() }
      }
      return s
    })
  } else if (Array.isArray(item.ingredients)) {
    specsList = item.ingredients
  }
  
  const stepsList = Array.isArray(item.steps) && item.steps.length > 0 ? item.steps : ['Verify firearm is completely unloaded.', 'Inspect receiver mechanism.']
  
  return {
    ...item,
    id: item.id,
    name: item.name || 'Hardware Piece',
    type: item.type || item.category || 'Hardware',
    category: item.type || item.category || 'Hardware',
    caliber: item.caliber || 'Standard',
    price: Number(item.price ?? item.cook_time ?? 0),
    description: item.description || '',
    image_url: item.image_url || item.image || '/guns/pistol.svg',
    image: item.image_url || item.image || '/guns/pistol.svg',
    ingredients: specsList,
    steps: stepsList,
  }
}

class GunService {
  async getGuns(params = {}) {
    if (IS_SUPABASE) {
      const queryParts = ['select=*']
      
      if (params.search) queryParts.push(`name=ilike.*${encodeURIComponent(params.search)}*`)
      if (params.category && params.category !== 'All') queryParts.push(`type=eq.${encodeURIComponent(params.category)}`)
      
      if (params.sort_by) {
        const order = params.order === 'desc' ? 'desc' : 'asc'
        queryParts.push(`order=${encodeURIComponent(params.sort_by)}.${order}`)
      } else {
        queryParts.push('order=created_at.desc')
      }
      if (params.limit) queryParts.push(`limit=${params.limit}`)
      
      const queryString = queryParts.join('&')
      const data = await apiClient.get(`/rest/v1/products?${queryString}`)
      let list = Array.isArray(data) ? data.map(normalizeProduct) : []
      
      // IMPLEMENTASI SOFT DELETE: Memfilter data yang ID-nya sudah diarsipkan
      const archivedIds = getArchivedIds();
      list = list.filter(item => !archivedIds.includes(item.id));

      return {
        success: true,
        data: list,
        pagination: { total: list.length, page: params.page || 1, limit: params.limit || 50 }
      }
    }
    
    const clean = Object.fromEntries(Object.entries(params).filter(([, v]) => v !== '' && v != null))
    return apiClient.get('/api/v1/recipes', { params: clean })
  }

  async getGunById(id) {
    if (IS_SUPABASE) {
      const data = await apiClient.get(`/rest/v1/products?id=eq.${id}&select=*`)
      if (Array.isArray(data) && data.length > 0) return { success: true, data: normalizeProduct(data[0]) }
      throw new Error('Hardware item not found.')
    }
    return apiClient.get(`/api/v1/recipes/${id}`)
  }

  async createGun(data) {
    if (IS_SUPABASE) {
      const specsArray = Array.isArray(data.ingredients) ? data.ingredients.map((i) => `${i.name}: ${i.quantity}`) : Array.isArray(data.specs) ? data.specs : []
      const payload = {
        name: data.name,
        type: data.type || (data.category === 'minuman' ? 'Rifle' : 'Pistol'),
        caliber: data.caliber || '9mm',
        price: Number(data.price ?? data.cook_time ?? 0),
        description: data.description || '',
        specs: specsArray,
        image_url: data.image_url || null
      }
      const res = await apiClient.post('/rest/v1/products', payload, { headers: { Prefer: 'return=representation' } })
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
      if (data.price !== undefined || data.cook_time !== undefined) payload.price = Number(data.price ?? data.cook_time ?? 0)
      if (data.description !== undefined) payload.description = data.description
      if (data.image_url !== undefined) payload.image_url = data.image_url
      
      const specsArray = Array.isArray(data.ingredients) ? data.ingredients.map((i) => `${i.name}: ${i.quantity}`) : Array.isArray(data.specs) ? data.specs : undefined
      if (specsArray !== undefined) payload.specs = specsArray

      const res = await apiClient.patch(`/rest/v1/products?id=eq.${id}`, payload, { headers: { Prefer: 'return=representation' } })
      return { success: true, data: normalizeProduct(Array.isArray(res) ? res[0] : res) }
    }
    return apiClient.put(`/api/v1/recipes/${id}`, data)
  }

  async deleteGun(id) {
    if (IS_SUPABASE) {
      // IMPLEMENTASI SOFT DELETE: Mengarsipkan ID secara lokal alih-alih menghapus dari database
      archiveId(id);
      return { success: true }
    }
    return apiClient.delete(`/api/v1/recipes/${id}`)
  }
}
export default new GunService()
