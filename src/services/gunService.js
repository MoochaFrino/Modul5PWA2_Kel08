import { apiClient, IS_SUPABASE } from '../config/api'

export const getArchivedIds = () => {
  try { return JSON.parse(localStorage.getItem('archived_hardware')) || []; } catch { return []; }
};
const saveArchivedIds = (ids) => {
  localStorage.setItem('archived_hardware', JSON.stringify(ids));
};

export const normalizeProduct = (item) => {
  if (!item) return null
  let specsList = []
  if (Array.isArray(item.specs)) {
    specsList = item.specs.map((s, idx) => {
      if (typeof s === 'string') {
        const colonIndex = s.indexOf(':')
        if (colonIndex > -1) return { id: `spec-${idx}`, name: s.substring(0, colonIndex).trim(), quantity: s.substring(colonIndex + 1).trim() }
        return { id: `spec-${idx}`, name: 'Specification', quantity: s.trim() }
      }
      return s
    })
  } else if (Array.isArray(item.ingredients)) {
    specsList = item.ingredients
  }
  const stepsList = Array.isArray(item.steps) && item.steps.length > 0 ? item.steps : ['Verify firearm is unloaded.', 'Inspect receiver mechanism.']
  
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
      if (params.category && params.category !== 'All') queryParts.push(`type=eq.${encodeURIComponent(params.category)}`)
      queryParts.push(params.sort_by ? `order=${encodeURIComponent(params.sort_by)}.${params.order === 'desc' ? 'desc' : 'asc'}` : 'order=created_at.desc')
      if (params.limit) queryParts.push(`limit=${params.limit}`)
      
      const queryString = queryParts.join('&')
      const data = await apiClient.get(`/rest/v1/products?${queryString}`)
      let list = Array.isArray(data) ? data.map(normalizeProduct) : []
      
      const archivedIds = getArchivedIds();
      list = list.filter(item => !archivedIds.includes(item.id.toString()));

      return { success: true, data: list, pagination: { total: list.length, page: params.page || 1, limit: params.limit || 50 } }
    }
    const clean = Object.fromEntries(Object.entries(params).filter(([, v]) => v !== '' && v != null))
    return apiClient.get('/api/v1/recipes', { params: clean })
  }

  async getArchivedGuns() {
    const archivedIds = getArchivedIds();
    if (archivedIds.length === 0) return { success: true, data: [] };
    const queryParts = ['select=*', `id=in.(${archivedIds.join(',')})`];
    const data = await apiClient.get(`/rest/v1/products?${queryParts.join('&')}`);
    return { success: true, data: Array.isArray(data) ? data.map(normalizeProduct) : [] };
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
      const specsArray = Array.isArray(data.ingredients) ? data.ingredients.map((i) => `${i.name}: ${i.quantity}`) : []
      const payload = {
        name: data.name, type: data.type || 'Pistol', caliber: data.caliber || '9mm',
        price: Number(data.price ?? data.cook_time ?? 0), description: data.description || '',
        specs: specsArray, image_url: data.image_url || null
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
      if (data.price !== undefined || data.cook_time !== undefined) payload.price = Number(data.price ?? 0)
      if (data.description !== undefined) payload.description = data.description
      if (data.image_url !== undefined) payload.image_url = data.image_url
      const specsArray = Array.isArray(data.ingredients) ? data.ingredients.map((i) => `${i.name}: ${i.quantity}`) : undefined
      if (specsArray !== undefined) payload.specs = specsArray

      const res = await apiClient.patch(`/rest/v1/products?id=eq.${id}`, payload, { headers: { Prefer: 'return=representation' } })
      return { success: true, data: normalizeProduct(Array.isArray(res) ? res[0] : res) }
    }
    return apiClient.put(`/api/v1/recipes/${id}`, data)
  }

  async archiveGun(id) {
    const archived = getArchivedIds();
    if (!archived.includes(id.toString())) saveArchivedIds([...archived, id.toString()]);
    return { success: true };
  }
  
  async restoreGun(id) {
    const archived = getArchivedIds().filter(aid => aid !== id.toString());
    saveArchivedIds(archived);
    return { success: true };
  }

  async hardDeleteGun(id) {
    if (IS_SUPABASE) {
      await apiClient.delete(`/rest/v1/products?id=eq.${id}`);
      this.restoreGun(id);
      return { success: true };
    }
    return apiClient.delete(`/api/v1/recipes/${id}`);
  }
}
export default new GunService()
