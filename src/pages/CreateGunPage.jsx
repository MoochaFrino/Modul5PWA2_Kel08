import { useState, useEffect, useCallback, useRef } from 'react'
import {
  ArrowLeft,
  Upload,
  X,
  Plus,
  Loader,
  Save,
  CheckCircle,
  AlertCircle,
} from 'lucide-react'
import gunService from '../services/gunService'
import uploadService from '../services/uploadService'
import {
  saveDraft,
  loadDraft,
  deleteDraft,
  hasDraft,
  getDraftTimestamp,
  formatDraftTime,
} from '../utils/draftStorage'
import ConfirmModal from '../components/modals/ConfirmModal'

export default function CreateGunPage({ onBack, onSuccess, autoLoadDraftId = null }) {
  const [currentStep, setCurrentStep] = useState(autoLoadDraftId ? 'form' : 'upload')
  const [formData, setFormData] = useState({
    name: '',
    type: 'Pistol',
    caliber: '9mm',
    category: 'makanan',
    difficulty: 'mudah',
    price: 599,
    description: '',
    servings: 1,
    is_featured: false,
  })

  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [uploadedImages, setUploadedImages] = useState([])

  const [specs, setSpecs] = useState([
    { name: 'Frame', quantity: 'Polymer' },
    { name: 'Action', quantity: 'Striker-Fired' },
  ])
  const [steps, setSteps] = useState([
    'Verify firearm is completely unloaded and point in safe direction.',
  ])

  const [uploading, setUploading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  // Gunakan ref untuk menandai apakah user sudah mulai mengedit form
  const isDirtyRef = useRef(false)
  const latestDraftRef = useRef({ formData, specs, steps, uploadedImages })

  // Selalu sinkronkan ref dengan state terbaru
  useEffect(() => {
    latestDraftRef.current = { formData, specs, steps, uploadedImages }
  }, [formData, specs, steps, uploadedImages])

  const [showDraftModal, setShowDraftModal] = useState(
    () => !autoLoadDraftId && hasDraft('create')
  )
  const [draftTimestamp, setDraftTimestamp] = useState(() => getDraftTimestamp('create'))

  // Fungsi langsung simpan ke localStorage detik itu juga (Synchronous)
  const persistDraftNow = useCallback((nextState) => {
    isDirtyRef.current = true
    const dataToSave = {
      formData: nextState.formData ?? latestDraftRef.current.formData,
      specs: nextState.specs ?? latestDraftRef.current.specs,
      steps: nextState.steps ?? latestDraftRef.current.steps,
      uploadedImages: nextState.uploadedImages ?? latestDraftRef.current.uploadedImages,
    }
    latestDraftRef.current = dataToSave
    saveDraft(dataToSave, 'create')
    setDraftTimestamp(getDraftTimestamp('create'))
  }, [])

  // Jika dibuka dari tombol "Lanjutkan / Edit" di halaman Profile, langsung muat draf tanpa modal
  useEffect(() => {
    const targetId = autoLoadDraftId || 'create'
    if (autoLoadDraftId) {
      const draft = loadDraft(targetId)
      if (draft) {
        if (draft.formData) setFormData(draft.formData)
        if (draft.specs) setSpecs(draft.specs)
        if (draft.steps) setSteps(draft.steps)
        if (Array.isArray(draft.uploadedImages) && draft.uploadedImages.length > 0) {
          setUploadedImages(draft.uploadedImages)
        } else if (draft.uploadedImageUrl) {
          setUploadedImages([draft.uploadedImageUrl])
        }
        isDirtyRef.current = true
        setCurrentStep('form')
        setShowDraftModal(false)
      }
    }
  }, [autoLoadDraftId])

  // Cadangan pengaman: simpan saat komponen di-unmount (pindah ke tab Profile/Catalog)
  useEffect(() => {
    return () => {
      if (isDirtyRef.current) {
        saveDraft(latestDraftRef.current, 'create')
      }
    }
  }, [])

  const handleLoadDraft = () => {
    const draft = loadDraft('create')
    if (draft) {
      if (draft.formData) setFormData(draft.formData)
      if (draft.specs) setSpecs(draft.specs)
      if (draft.steps) setSteps(draft.steps)
      if (Array.isArray(draft.uploadedImages) && draft.uploadedImages.length > 0) {
        setUploadedImages(draft.uploadedImages)
      } else if (draft.uploadedImageUrl) {
        setUploadedImages([draft.uploadedImageUrl])
      }
      isDirtyRef.current = true
      setCurrentStep('form')
      setShowDraftModal(false)
      setSuccessMsg('Draf berhasil dimuat kembali.')
      setTimeout(() => setSuccessMsg(''), 3000)
    }
  }

  const handleDiscardDraft = () => {
    deleteDraft('create')
    isDirtyRef.current = false
    setShowDraftModal(false)
    setDraftTimestamp(null)
  }

  // Fungsi tombol manual Save Draft
  const handleSaveDraft = useCallback(
    (notify = true) => {
      const draftData = {
        formData,
        specs,
        steps,
        uploadedImages,
      }
      isDirtyRef.current = true
      const saved = saveDraft(draftData, 'create')
      if (saved) {
        const ts = getDraftTimestamp('create')
        setDraftTimestamp(ts)
        if (notify) {
          setSuccessMsg(`Draf berhasil disimpan (${formatDraftTime(ts)})`)
          setTimeout(() => setSuccessMsg(''), 3000)
        }
      }
    },
    [formData, specs, steps, uploadedImages]
  )

  const handleImageChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      setError('Ukuran file maksimal 5MB.')
      return
    }
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
    setError('')
  }

  const handleSelectPreset = (url) => {
    setUploadedImages((prev) => {
      const updated = [...prev, url]
      persistDraftNow({ uploadedImages: updated })
      return updated
    })
    setError('')
  }

  const handleUploadImage = async () => {
    if (!imageFile) {
      if (uploadedImages.length > 0) {
        setCurrentStep('form')
        return
      }
      setError('Pilih gambar terlebih dahulu.')
      return
    }
    try {
      setUploading(true)
      setError('')
      const result = await uploadService.uploadImage(imageFile)
      if (result.success && result.data?.url) {
        setUploadedImages((prev) => {
          const updated = [...prev, result.data.url]
          persistDraftNow({ uploadedImages: updated })
          return updated
        })
      } else {
        throw new Error('Upload gagal')
      }
    } catch {
      setUploadedImages((prev) => {
        const updated = [...prev, imagePreview || '/guns/pistol.svg']
        persistDraftNow({ uploadedImages: updated })
        return updated
      })
    } finally {
      setUploading(false)
      setImageFile(null)
      setImagePreview(null)
    }
  }

  const removeUploadedImage = (idx) => {
    setUploadedImages((prev) => {
      const updated = prev.filter((_, i) => i !== idx)
      persistDraftNow({ uploadedImages: updated })
      return updated
    })
  }

  // Setiap ketikan di form (nama, deskripsi, harga, kaliber, dll) langsung tersimpan detik itu juga
  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData((prev) => {
      const updated = {
        ...prev,
        [name]: type === 'checkbox' ? checked : value,
      }
      persistDraftNow({ formData: updated })
      return updated
    })
  }

  const handleSpecChange = (index, field, value) => {
    setSpecs((prev) => {
      const copy = [...prev]
      copy[index] = { ...copy[index], [field]: value }
      persistDraftNow({ specs: copy })
      return copy
    })
  }
  const addSpec = () =>
    setSpecs((prev) => {
      const updated = [...prev, { name: '', quantity: '' }]
      persistDraftNow({ specs: updated })
      return updated
    })
  const removeSpec = (index) => {
    if (specs.length > 1) {
      setSpecs((prev) => {
        const updated = prev.filter((_, i) => i !== index)
        persistDraftNow({ specs: updated })
        return updated
      })
    }
  }

  const handleStepChange = (index, value) => {
    setSteps((prev) => {
      const copy = [...prev]
      copy[index] = value
      persistDraftNow({ steps: copy })
      return copy
    })
  }
  const addStep = () =>
    setSteps((prev) => {
      const updated = [...prev, '']
      persistDraftNow({ steps: updated })
      return updated
    })
  const removeStep = (index) => {
    if (steps.length > 1) {
      setSteps((prev) => {
        const updated = prev.filter((_, i) => i !== index)
        persistDraftNow({ steps: updated })
        return updated
      })
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!formData.name.trim() || formData.name.trim().length < 3) {
      setError('Nama produk minimal 3 karakter.')
      return
    }

    const cleanSpecs = specs
      .filter((s) => s.name.trim())
      .map((s) => ({
        name: s.name.trim(),
        quantity: s.quantity.trim() || 'Standard',
      }))

    const cleanSteps = steps.filter((s) => s.trim()).map((s) => s.trim())

    const payload = {
      name: formData.name.trim(),
      type: formData.type,
      caliber: formData.caliber,
      price: Number(formData.price) || 500,
      category: formData.category || 'makanan',
      description:
        formData.description.trim() || `${formData.type} caliber ${formData.caliber}.`,
      image_url:
        uploadedImages.length > 0
          ? JSON.stringify(uploadedImages)
          : '["/guns/pistol.svg"]',
      prep_time: 15,
      cook_time: Number(formData.price) || 500,
      servings: Number(formData.servings) || 1,
      difficulty: formData.difficulty || 'mudah',
      is_featured: Boolean(formData.is_featured),
      ingredients: cleanSpecs,
      steps: cleanSteps,
    }

    try {
      setCreating(true)
      const response = await gunService.createGun(payload)
      if (response.success || response.data) {
        isDirtyRef.current = false
        deleteDraft('create')
        if (onSuccess) onSuccess(response.data)
        else if (onBack) onBack()
      } else {
        throw new Error(response.message || 'Gagal menyimpan produk.')
      }
    } catch (err) {
      setError(err.message || 'Terjadi kesalahan saat menyimpan ke server.')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="form-page">
      <div className="form-head">
        <button type="button" className="detail-back" onClick={onBack}>
          <ArrowLeft size={18} /> Back to Catalog
        </button>
        <div className="form-head-actions">
          <button
            type="button"
            className="btn btn--outline btn--sm"
            onClick={() => handleSaveDraft(true)}
            title="Simpan sebagai draf offline"
          >
            <Save size={14} /> Save Draft
          </button>
        </div>
      </div>

      <div className="form-title-group">
        <h1 className="display">Register New Hardware</h1>
        <p className="lede">
          Tambahkan persenjataan baru ke katalog. Perubahan formulir otomatis tersimpan di draf lokal.
        </p>
      </div>

      {error && (
        <div className="toast toast--error">
          <AlertCircle size={18} /> {error}
        </div>
      )}
      {successMsg && (
        <div className="toast toast--success">
          <CheckCircle size={18} /> {successMsg}
        </div>
      )}

      <div className="form-steps-nav">
        <div
          className={`step-badge ${
            currentStep === 'upload' ? 'step-badge--active' : 'step-badge--done'
          }`}
          onClick={() => setCurrentStep('upload')}
          style={{ cursor: 'pointer' }}
        >
          1. Imagery ({uploadedImages.length})
        </div>
        <div className="step-badge-connector" />
        <div
          className={`step-badge ${currentStep === 'form' ? 'step-badge--active' : ''}`}
          onClick={() => setCurrentStep('form')}
          style={{ cursor: 'pointer' }}
        >
          2. Specifications & Details
        </div>
      </div>

      {currentStep === 'upload' && (
        <div className="card-box">
          <h2 className="card-box-title">Weapon Imagery (Multi-Upload)</h2>
          <p className="card-box-desc">
            Unggah satu atau beberapa gambar produk (maks 5MB per file), atau pilih vektor preset.
          </p>

          <div className="upload-dropzone">
            <input
              id="gun-image-input"
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="hidden-file-input"
            />
            <label htmlFor="gun-image-input" className="upload-label">
              <Upload size={36} className="upload-icon" />
              <span className="upload-main-text">Klik untuk memilih file gambar</span>
              <span className="upload-sub-text">JPG, PNG, atau WebP (Bisa lebih dari 1 gambar)</span>
            </label>
            <div className="preset-selector">
              <span className="preset-title">Atau tambahkan gambar preset:</span>
              <div className="preset-pills">
                <button
                  type="button"
                  className="pill"
                  onClick={() => handleSelectPreset('/guns/pistol.svg')}
                >
                  + Pistol Vector
                </button>
                <button
                  type="button"
                  className="pill"
                  onClick={() => handleSelectPreset('/guns/rifle.svg')}
                >
                  + Rifle Vector
                </button>
                <button
                  type="button"
                  className="pill"
                  onClick={() => handleSelectPreset('/guns/shotgun.svg')}
                >
                  + Shotgun Vector
                </button>
              </div>
            </div>
          </div>

          {imagePreview && (
            <div className="preview-container" style={{ marginTop: '20px' }}>
              <div className="preview-image-wrap">
                <img src={imagePreview} alt="Preview" className="preview-img" />
                <button
                  type="button"
                  className="preview-remove-btn"
                  onClick={() => {
                    setImageFile(null)
                    setImagePreview(null)
                  }}
                >
                  <X size={18} />
                </button>
              </div>
              <button
                type="button"
                className="btn btn--primary"
                onClick={handleUploadImage}
                disabled={uploading}
              >
                {uploading ? (
                  <>
                    <Loader size={18} className="spin" /> Mengunggah...
                  </>
                ) : (
                  <>
                    <Upload size={18} /> Tambahkan Gambar Ini ke Daftar
                  </>
                )}
              </button>
            </div>
          )}

          {uploadedImages.length > 0 && (
            <div style={{ marginTop: '24px', borderTop: '1px solid var(--line)', paddingTop: '16px' }}>
              <h4>Daftar Gambar Terpilih ({uploadedImages.length} Gambar)</h4>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '10px' }}>
                {uploadedImages.map((img, i) => (
                  <div key={i} style={{ position: 'relative' }}>
                    <img
                      src={img}
                      alt={`Uploaded ${i}`}
                      style={{
                        width: '90px',
                        height: '65px',
                        objectFit: 'cover',
                        borderRadius: '4px',
                        border: '1px solid var(--line)',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => removeUploadedImage(i)}
                      style={{
                        position: 'absolute',
                        top: '-6px',
                        right: '-6px',
                        background: '#c0392b',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '50%',
                        width: '20px',
                        height: '20px',
                        cursor: 'pointer',
                        fontSize: '11px',
                      }}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                className="btn btn--primary"
                onClick={() => setCurrentStep('form')}
                style={{ marginTop: '16px' }}
              >
                Lanjut Isi Spesifikasi →
              </button>
            </div>
          )}

          {!imagePreview && uploadedImages.length === 0 && (
            <div style={{ marginTop: '16px', textAlign: 'right' }}>
              <button
                type="button"
                className="btn btn--outline"
                onClick={() => setCurrentStep('form')}
              >
                Lewati Tahap Gambar →
              </button>
            </div>
          )}
        </div>
      )}

      {currentStep === 'form' && (
        <form onSubmit={handleSubmit} className="entry-form">
          <div className="selected-thumb-bar">
            <img
              src={uploadedImages[0] || '/guns/pistol.svg'}
              alt="Selected"
              className="thumb-small"
            />
            <div className="thumb-info">
              <span className="thumb-title">{uploadedImages.length || 1} Gambar Terlampir</span>
              <span className="thumb-sub">Otomatis tersimpan di draf lokal</span>
            </div>
            <button
              type="button"
              className="btn btn--outline btn--sm"
              onClick={() => setCurrentStep('upload')}
            >
              Kelola Gambar
            </button>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">
                Model Designation <span className="req">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleFormChange}
                placeholder="Contoh: Glock 19 Gen 5..."
                className="form-input"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">
                Platform / Category <span className="req">*</span>
              </label>
              <select
                name="type"
                value={formData.type}
                onChange={(e) => {
                  const val = e.target.value
                  setFormData((p) => {
                    const updated = {
                      ...p,
                      type: val,
                      category: val === 'Pistol' ? 'makanan' : 'minuman',
                    }
                    persistDraftNow({ formData: updated })
                    return updated
                  })
                }}
                className="form-select"
              >
                <option value="Pistol">Pistol (Sidearm)</option>
                <option value="Rifle">Rifle (Long Gun)</option>
                <option value="Shotgun">Shotgun (Smoothbore)</option>
                <option value="Submachine Gun">Submachine Gun</option>
              </select>
            </div>
          </div>

          <div className="form-grid form-grid--3">
            <div className="form-group">
              <label className="form-label">
                Caliber <span className="req">*</span>
              </label>
              <input
                type="text"
                name="caliber"
                value={formData.caliber}
                onChange={handleFormChange}
                className="form-input"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">
                Price (USD) <span className="req">*</span>
              </label>
              <input
                type="number"
                name="price"
                value={formData.price}
                onChange={handleFormChange}
                className="form-input"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Grade</label>
              <select
                name="difficulty"
                value={formData.difficulty}
                onChange={handleFormChange}
                className="form-select"
              >
                <option value="mudah">Commercial / Standard</option>
                <option value="sedang">Mil-Spec / Service</option>
                <option value="sulit">Match Grade / Custom</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Armory Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleFormChange}
              placeholder="Deskripsi spesifikasi dan operasional..."
              className="form-textarea"
              rows="3"
            />
          </div>

          <div className="form-fieldset">
            <div className="fieldset-header">
              <label className="form-label">Specifications</label>
              <button type="button" className="btn btn--outline btn--sm" onClick={addSpec}>
                <Plus size={14} /> Add Spec
              </button>
            </div>
            <div className="multi-rows">
              {specs.map((spec, i) => (
                <div key={i} className="multi-row">
                  <input
                    type="text"
                    placeholder="Attribute"
                    value={spec.name}
                    onChange={(e) => handleSpecChange(i, 'name', e.target.value)}
                    className="form-input"
                  />
                  <input
                    type="text"
                    placeholder="Value"
                    value={spec.quantity}
                    onChange={(e) => handleSpecChange(i, 'quantity', e.target.value)}
                    className="form-input"
                  />
                  <button
                    type="button"
                    className="btn btn--danger-ghost"
                    onClick={() => removeSpec(i)}
                    disabled={specs.length <= 1}
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="form-fieldset">
            <div className="fieldset-header">
              <label className="form-label">Maintenance Steps</label>
              <button type="button" className="btn btn--outline btn--sm" onClick={addStep}>
                <Plus size={14} /> Add Step
              </button>
            </div>
            <div className="multi-rows">
              {steps.map((st, i) => (
                <div key={i} className="step-row">
                  <span className="step-num">{i + 1}</span>
                  <input
                    type="text"
                    value={st}
                    onChange={(e) => handleStepChange(i, e.target.value)}
                    className="form-input"
                  />
                  <button
                    type="button"
                    className="btn btn--danger-ghost"
                    onClick={() => removeStep(i)}
                    disabled={steps.length <= 1}
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="form-actions-bar">
            <button
              type="button"
              className="btn btn--outline"
              onClick={() => handleSaveDraft(true)}
              disabled={creating}
            >
              <Save size={16} /> Simpan Draf
            </button>
            <button type="submit" className="btn btn--primary" disabled={creating}>
              {creating ? <Loader size={18} className="spin" /> : 'Commit to Armory'}
            </button>
          </div>
        </form>
      )}

      <ConfirmModal
        open={showDraftModal}
        title="Lanjutkan Draf Sebelumnya?"
        message={`Ditemukan draf katalog yang belum diselesaikan (${
          draftTimestamp ? formatDraftTime(draftTimestamp) : 'baru saja'
        }). Apakah kamu ingin melanjutkan pengisian draf tersebut?`}
        confirmLabel="Muat Draf"
        cancelLabel="Hapus & Buat Baru"
        onConfirm={handleLoadDraft}
        onCancel={handleDiscardDraft}
      />
    </div>
  )
}
