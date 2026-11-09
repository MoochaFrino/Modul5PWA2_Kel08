import { useState, useEffect, useCallback } from 'react'
import {
  Shield,
  FileText,
  Settings,
  Archive,
  Camera,
  Check,
  Copy,
  Trash2,
  Play,
  Edit3,
} from 'lucide-react'
import userService from '../services/userService'
import gunService from '../services/gunService'
import {
  getAllDraftIds,
  loadDraft,
  deleteDraft,
  clearAllDrafts,
  formatDraftTime,
} from '../utils/draftStorage'
import GunCard from '../components/gun/GunCard'

export default function ProfilePage({ onReplaySplash, onSelectGun, onContinueDraft }) {
  const [profile, setProfile] = useState(() => userService.getUserProfile())
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [drafts, setDrafts] = useState([])
  const [archivedGuns, setArchivedGuns] = useState([])
  const [copied, setCopied] = useState(false)
  const [feedback, setFeedback] = useState('')

  const [username, setUsername] = useState(profile.username || 'Shooter')
  const [bio, setBio] = useState(profile.bio || '')
  const [avatar, setAvatar] = useState(profile.avatar || null)

  const refreshDrafts = useCallback(() => {
    const draftIds = getAllDraftIds()
    const loadedDrafts = draftIds
      .map((id) => ({ draftId: id, data: loadDraft(id) }))
      .filter((d) => d.data)
    setDrafts(loadedDrafts)
  }, [])

  const refreshArchived = useCallback(() => {
    gunService
      .getArchivedGuns()
      .then((res) => {
        if (res.success) setArchivedGuns(res.data)
      })
      .catch(console.error)
  }, [])

  useEffect(() => {
    refreshDrafts()
    refreshArchived()

    window.addEventListener('archive-updated', refreshArchived)
    return () => window.removeEventListener('archive-updated', refreshArchived)
  }, [refreshDrafts, refreshArchived])

  const handleAvatarChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      setFeedback('Ukuran foto profil maksimal 2MB.')
      setTimeout(() => setFeedback(''), 3000)
      return
    }
    const reader = new FileReader()
    reader.onload = (event) => {
      const base64 = event.target.result
      setAvatar(base64)
      const res = userService.updateAvatar(base64)
      if (res.success) setProfile(res.data)
      setFeedback('Foto profil berhasil diperbarui!')
      setTimeout(() => setFeedback(''), 3000)
    }
    reader.readAsDataURL(file)
  }

  const handleCopyId = () => {
    if (profile.userId) {
      navigator.clipboard.writeText(profile.userId)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleSaveProfile = (e) => {
    e.preventDefault()
    const result = userService.saveUserProfile({
      ...profile,
      username: username.trim() || 'Shooter',
      bio: bio.trim(),
      avatar,
    })
    if (result.success) {
      setProfile(result.data)
      setIsEditModalOpen(false)
      setFeedback('Profil berhasil disimpan!')
      setTimeout(() => setFeedback(''), 3000)
    }
  }

  const handleDeleteSingleDraft = (draftId) => {
    deleteDraft(draftId)
    refreshDrafts()
    setFeedback('Draf berhasil dihapus.')
    setTimeout(() => setFeedback(''), 3000)
  }

  const handleClearAllDrafts = () => {
    if (window.confirm('Hapus semua draf katalog yang tersimpan?')) {
      clearAllDrafts()
      refreshDrafts()
      setFeedback('Semua draf berhasil dibersihkan.')
      setTimeout(() => setFeedback(''), 3000)
    }
  }

  const handleRestore = async (gun) => {
    await gunService.restoreGun(gun.id)
    setArchivedGuns((prev) => prev.filter((g) => String(g.id) !== String(gun.id)))
    setFeedback(`"${gun.name}" berhasil dipulihkan ke katalog utama.`)
    setTimeout(() => setFeedback(''), 3000)
  }

  const handleHardDelete = async (gun) => {
    if (window.confirm(`Hapus PERMANEN "${gun.name}" dari server?`)) {
      await gunService.hardDeleteGun(gun.id)
      setArchivedGuns((prev) => prev.filter((g) => String(g.id) !== String(gun.id)))
      setFeedback(`"${gun.name}" dihapus secara permanen.`)
      setTimeout(() => setFeedback(''), 3000)
    }
  }

  return (
    <div className="profile-page">
      <section
        className="masthead"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div>
          <h1 className="display">Operator Profile</h1>
          <p className="lede">
            Identitas operator, manajemen draf katalog offline, dan gudang arsip.
          </p>
        </div>
        {onReplaySplash && (
          <button
            type="button"
            className="btn btn--outline btn--sm"
            onClick={onReplaySplash}
          >
            <Play size={14} /> Replay Intro
          </button>
        )}
      </section>

      {feedback && (
        <div className="toast toast--success">
          <Check size={18} /> {feedback}
        </div>
      )}

      <div className="profile-card">
        <div className="profile-card-top" style={{ flexWrap: 'wrap' }}>
          <div className="avatar-wrap">
            {avatar ? (
              <img src={avatar} alt={profile.username} className="avatar-img" />
            ) : (
              <div className="avatar-placeholder">
                <Shield size={36} stroke="var(--brass)" />
              </div>
            )}
            <label
              htmlFor="avatar-file-input"
              className="avatar-upload-btn"
              title="Ganti Foto Profil"
            >
              <Camera size={14} />
              <input
                id="avatar-file-input"
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden-file-input"
              />
            </label>
          </div>

          <div className="profile-identity">
            <h2 className="display">{profile.username || 'Shooter'}</h2>
            <p className="type" style={{ marginBottom: '8px' }}>
              {profile.bio || 'Belum ada catatan bio operator.'}
            </p>
            <div className="profile-id-row">
              <span className="mono-badge">{profile.userId}</span>
              <button
                type="button"
                className="icon-btn"
                onClick={handleCopyId}
                title="Salin User ID"
              >
                {copied ? <Check size={14} color="var(--brass)" /> : <Copy size={14} />}
              </button>
            </div>
          </div>

          <button
            type="button"
            className="btn btn--outline"
            style={{ marginLeft: 'auto' }}
            onClick={() => setIsEditModalOpen(true)}
          >
            <Settings size={16} /> Edit Profile
          </button>
        </div>
      </div>

      {/* SECTION ABOUT & CONTACT */}
      <div className="form-grid">
        <div className="card-box" style={{ marginBottom: 0 }}>
          <h3 className="card-box-title">About — A One-Room Armory</h3>
          <p className="type" style={{ lineHeight: 1.5, marginTop: '8px' }}>
            Bore & Barrel sells a short, honest list of firearms. Each piece is priced
            from the bench — no markup theatre, no filler.
          </p>
        </div>
        <div className="card-box" style={{ marginBottom: 0 }}>
          <h3 className="card-box-title">Contact — Come by the Shop</h3>
          <p className="type" style={{ lineHeight: 1.5, marginTop: '8px' }}>
            123 Range Road. Open Tuesday to Saturday, 10 to 6.
            <br />
            Call: <strong>(555) 010-0100</strong>
          </p>
        </div>
      </div>

      {/* SECTION DOKUMEN DRAF KATALOG */}
      <div className="card-box" style={{ marginBottom: 0 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '12px',
          }}
        >
          <h3
            className="card-box-title"
            style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}
          >
            <FileText size={20} stroke="var(--brass)" /> Dokumen Draf Katalog ({drafts.length})
          </h3>
          {drafts.length > 0 && (
            <button
              type="button"
              className="btn btn--danger-ghost btn--sm"
              onClick={handleClearAllDrafts}
            >
              <Trash2 size={14} /> Bersihkan Semua
            </button>
          )}
        </div>

        {drafts.length === 0 ? (
          <p className="type">
            Tidak ada draf katalog yang tersimpan. Buka menu <strong>+ Add Hardware</strong> dan ketik nama produk tanpa menekan tombol Commit.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {drafts.map(({ draftId, data }) => {
              const fData = data.formData || {}
              const thumb =
                (Array.isArray(data.uploadedImages) && data.uploadedImages[0]) ||
                data.uploadedImageUrl ||
                '/guns/pistol.svg'

              return (
                <div
                  key={draftId}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                    padding: '12px',
                    background: 'var(--paper)',
                    border: '1px solid var(--line)',
                    borderRadius: '4px',
                    flexWrap: 'wrap',
                  }}
                >
                  <img
                    src={thumb}
                    alt="Draft"
                    style={{
                      width: '64px',
                      height: '48px',
                      objectFit: 'cover',
                      borderRadius: '4px',
                      border: '1px solid var(--line)',
                      background: '#fff',
                    }}
                  />
                  <div style={{ flex: 1, minWidth: '180px' }}>
                    <div style={{ fontWeight: 700, fontSize: '1rem' }}>
                      {fData.name || '(Tanpa Nama Model)'}
                    </div>
                    <div className="type" style={{ fontSize: '0.82rem', margin: 0 }}>
                      Kategori: {fData.type || 'Pistol'} · Kaliber: {fData.caliber || '9mm'} · Harga: ${fData.price ?? 0}
                    </div>
                    <div className="type" style={{ fontSize: '0.75rem', margin: 0 }}>
                      Tersimpan otomatis: {formatDraftTime(data.savedAt)}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    {onContinueDraft && (
                      <button
                        type="button"
                        className="btn btn--primary btn--sm"
                        onClick={() => onContinueDraft(draftId)}
                        title="Buka dan lanjutkan mengedit draf ini"
                      >
                        <Edit3 size={14} /> Lanjutkan / Edit
                      </button>
                    )}
                    <button
                      type="button"
                      className="btn btn--danger-ghost btn--sm"
                      onClick={() => handleDeleteSingleDraft(draftId)}
                      title="Hapus Draf"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* SECTION GUDANG ARSIP / SOFT DELETE */}
      <div className="card-box" style={{ marginBottom: 0 }}>
        <h3
          className="card-box-title"
          style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}
        >
          <Archive size={20} stroke="var(--brass)" /> Gudang Arsip / Soft Delete ({archivedGuns.length})
        </h3>
        {archivedGuns.length === 0 ? (
          <p className="type">
            Gudang arsip kosong. Produk yang diarsipkan dari katalog akan langsung muncul di sini.
          </p>
        ) : (
          <ul className="stock">
            {archivedGuns.map((gun) => (
              <GunCard
                key={gun.id}
                gun={gun}
                isArchiveMode={true}
                onSelect={onSelectGun}
                onRestore={handleRestore}
                onDelete={handleHardDelete}
              />
            ))}
          </ul>
        )}
      </div>

      {/* MODAL EDIT PROFIL */}
      {isEditModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsEditModalOpen(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title display">Edit Operator Profile</h3>
            <form
              onSubmit={handleSaveProfile}
              style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '8px' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div className="avatar-wrap" style={{ width: '64px', height: '64px' }}>
                  {avatar ? (
                    <img src={avatar} alt="Avatar" className="avatar-img" />
                  ) : (
                    <div className="avatar-placeholder">
                      <Shield size={28} stroke="var(--brass)" />
                    </div>
                  )}
                </div>
                <div>
                  <label htmlFor="modal-avatar-input" className="btn btn--outline btn--sm">
                    <Camera size={14} /> Pilih Foto Baru
                  </label>
                  <input
                    id="modal-avatar-input"
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="hidden-file-input"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Callsign / Username</label>
                <input
                  type="text"
                  className="form-input"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Armory Bio</label>
                <textarea
                  className="form-textarea"
                  rows="3"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                />
              </div>

              <div className="modal-actions" style={{ marginTop: '8px' }}>
                <button
                  type="button"
                  className="btn btn--outline"
                  onClick={() => setIsEditModalOpen(false)}
                >
                  Batal
                </button>
                <button type="submit" className="btn btn--primary">
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
