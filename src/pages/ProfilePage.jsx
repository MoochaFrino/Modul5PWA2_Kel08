import { useState, useEffect } from 'react'
import { Shield, FileText, Settings, Archive } from 'lucide-react'
import userService from '../services/userService'
import gunService from '../services/gunService'
import { getAllDraftIds, loadDraft } from '../utils/draftStorage'
import GunCard from '../components/gun/GunCard'

export default function ProfilePage({ onSelectGun }) {
  const [profile, setProfile] = useState(() => userService.getUserProfile())
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [drafts, setDrafts] = useState([])
  const [archivedGuns, setArchivedGuns] = useState([])
  
  const [username, setUsername] = useState(profile.username || '')
  const [bio, setBio] = useState(profile.bio || '')
  
  useEffect(() => {
    const draftIds = getAllDraftIds();
    const loadedDrafts = draftIds.map(id => ({ draftId: id, data: loadDraft(id) })).filter(d => d.data);
    setDrafts(loadedDrafts);

    gunService.getArchivedGuns().then(res => {
      if(res.success) setArchivedGuns(res.data);
    }).catch(console.error);
  }, []);

  const handleSaveProfile = (e) => {
    e.preventDefault()
    const result = userService.saveUserProfile({ ...profile, username: username.trim(), bio: bio.trim() })
    if (result.success) {
      setProfile(result.data);
      setIsEditModalOpen(false);
    }
  }

  const handleRestore = async (gun) => {
    await gunService.restoreGun(gun.id);
    setArchivedGuns(prev => prev.filter(g => g.id !== gun.id));
  }

  const handleHardDelete = async (gun) => {
    if(window.confirm(`Hapus PERMANEN ${gun.name} dari server?`)) {
      await gunService.hardDeleteGun(gun.id);
      setArchivedGuns(prev => prev.filter(g => g.id !== gun.id));
    }
  }

  return (
    <div className="profile-page">
      <section className="masthead">
        <h1 className="display">Operator Profile</h1>
      </section>

      <div className="profile-card">
        <div className="profile-card-top">
          <div className="avatar-placeholder"><Shield size={36} stroke="var(--brass)" /></div>
          <div className="profile-identity">
            <h2 className="display">{profile.username || 'Shooter'}</h2>
            <p className="type">{profile.bio || 'Tidak ada deskripsi bio.'}</p>
          </div>
          <button className="btn btn--outline" style={{ marginLeft: 'auto' }} onClick={() => setIsEditModalOpen(true)}>
            <Settings size={16} /> Edit Profile
          </button>
        </div>
      </div>

      <div className="form-grid">
        <div className="card-box">
          <h3>Tentang Bore & Barrel</h3>
          <p className="type">Aplikasi PWA penyedia informasi persenjataan dan logistik, dirancang untuk operasional offline dan performa tinggi.</p>
        </div>
        <div className="card-box">
          <h3>Hubungi Kami</h3>
          <p className="type">123 Range Road. Selasa - Sabtu (10:00 - 18:00).<br/>Call: (555) 010-0100</p>
        </div>
      </div>

      <div className="card-box">
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><FileText size={20}/> Dokumen Draf (Offline)</h3>
        {drafts.length === 0 ? <p className="type">Tidak ada draf tersimpan.</p> : (
          <ul style={{ paddingLeft: '20px' }}>
            {drafts.map((d, i) => (
               <li key={i} className="type">
                 Draf <b>{d.data.formData?.name || 'Item Baru'}</b> (ID: {d.draftId}) - Disimpan pada {new Date(d.data.savedAt).toLocaleString()}
               </li>
            ))}
          </ul>
        )}
      </div>

      <div className="card-box" style={{ padding: '0', background: 'transparent', border: 'none' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}><Archive size={20}/> Gudang Arsip (Soft Delete)</h3>
        {archivedGuns.length === 0 ? <p className="type">Gudang arsip kosong.</p> : (
          <ul className="stock">
            {archivedGuns.map((gun) => (
              <GunCard key={gun.id} gun={gun} isArchiveMode={true} onSelect={onSelectGun} onRestore={handleRestore} onDelete={handleHardDelete} />
            ))}
          </ul>
        )}
      </div>

      {isEditModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsEditModalOpen(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <h3>Edit Profil Operator</h3>
            <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <input type="text" className="form-input" placeholder="Callsign" value={username} onChange={e => setUsername(e.target.value)} required />
              <textarea className="form-textarea" placeholder="Bio Catatan" rows="3" value={bio} onChange={e => setBio(e.target.value)} />
              <div className="modal-actions">
                <button type="button" className="btn btn--outline" onClick={() => setIsEditModalOpen(false)}>Batal</button>
                <button type="submit" className="btn btn--primary">Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
