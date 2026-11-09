// ---------------------------------------------------------------------------
// draftStorage.js — auto-save / restore form drafts via localStorage.
// ---------------------------------------------------------------------------
const PREFIX = 'gun_draft_'
const TS_SUFFIX = '_ts'

/**
 * Persist a draft object.
 */
export const saveDraft = (draftData, draftId = 'create') => {
  try {
    const key = `${PREFIX}${draftId}`
    const ts = new Date().toISOString()
    localStorage.setItem(key, JSON.stringify({ ...draftData, savedAt: ts }))
    localStorage.setItem(`${key}${TS_SUFFIX}`, ts)
    return true
  } catch {
    return false
  }
}

/**
 * Load a previously saved draft.
 */
export const loadDraft = (draftId = 'create') => {
  try {
    const raw = localStorage.getItem(`${PREFIX}${draftId}`)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

/**
 * Remove a draft and its timestamp from storage.
 */
export const deleteDraft = (draftId = 'create') => {
  try {
    const key = `${PREFIX}${draftId}`
    localStorage.removeItem(key)
    localStorage.removeItem(`${key}${TS_SUFFIX}`)
    return true
  } catch {
    return false
  }
}

/**
 * Check whether a draft exists.
 */
export const hasDraft = (draftId = 'create') => {
  try {
    return localStorage.getItem(`${PREFIX}${draftId}`) !== null
  } catch {
    return false
  }
}

/**
 * Return the ISO-8601 timestamp string of the last save, or null.
 */
export const getDraftTimestamp = (draftId = 'create') => {
  try {
    return localStorage.getItem(`${PREFIX}${draftId}${TS_SUFFIX}`)
  } catch {
    return null
  }
}

/**
 * Human-readable "time ago" label for a draft timestamp.
 */
export const formatDraftTime = (timestamp) => {
  if (!timestamp) return ''
  const diff = Date.now() - new Date(timestamp).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Baru saja'
  if (mins < 60) return `${mins} menit yang lalu`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs} jam yang lalu`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days} hari yang lalu`
  return new Date(timestamp).toLocaleDateString('id-ID')
}

/**
 * Return all existing draft ids.
 */
export const getAllDraftIds = () => {
  try {
    return Object.keys(localStorage)
      .filter((k) => k.startsWith(PREFIX) && !k.endsWith(TS_SUFFIX))
      .map((k) => k.slice(PREFIX.length))
  } catch {
    return []
  }
}

/**
 * Remove every gun draft from storage.
 */
export const clearAllDrafts = () => {
  getAllDraftIds().forEach(deleteDraft)
}
