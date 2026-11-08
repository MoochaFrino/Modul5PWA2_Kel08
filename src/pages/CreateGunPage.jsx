import { useState, useEffect, useCallback } from 'react'
import { ArrowLeft, Upload, X, Plus, Loader, Save, CheckCircle, AlertCircle } from 'lucide-react'
import gunService from '../services/gunService'
import uploadService from '../services/uploadService'
import { saveDraft, loadDraft, deleteDraft, hasDraft, getDraftTimestamp, formatDraftTime } from '../utils/draftStorage'
import ConfirmModal from '../components/modals/ConfirmModal'

export default function CreateGunPage({ onBack, onSuccess }) {
  const [currentStep, setCurrentStep] = useState('upload')
  const [formData, setFormData] = useState({ name: '', type: 'Pistol', caliber: '9mm', category: 'makanan', difficulty: 'mudah', price: 599, description: '', servings: 1, is_featured: false })
  
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [uploadedImages, setUploadedImages] = useState([]) // Format Array
  
  const [specs, setSpecs] = useState([{ name: 'Frame', quantity: 'Polymer' }])
  const [steps, setSteps] = useState(['Verify firearm is unloaded.'])
  const [uploading, setUploading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')
  
  const handleImageChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  const handleUploadImage = async () => {
    if (!imageFile) {
      if (uploadedImages.length > 0) { setCurrentStep('form'); return; }
      setError('Please select an image file first.'); return;
    }
    try {
      setUploading(true)
      const result = await uploadService.uploadImage(imageFile)
      if (result.success && result.data?.url) {
        setUploadedImages(prev => [...prev, result.data.url]) // Push ke Array
      }
    } catch (err) {
      setUploadedImages(prev => [...prev, imagePreview || '/guns/pistol.svg'])
    } finally {
      setUploading(false)
      setImageFile(null)
      setImagePreview(null)
    }
  }

  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
  }

  const handleSpecChange = (index, field, value) => {
    setSpecs(prev => { const copy = [...prev]; copy[index] = { ...copy[index], [field]: value }; return copy; })
  }
  const addSpec = () => setSpecs(prev => [...prev, { name: '', quantity: '' }])
  const removeSpec = (index) => { if (specs.length > 1) setSpecs(prev => prev.filter((_, i) => i !== index)) }

  const handleStepChange = (index, value) => {
    setSteps(prev => { const copy = [...prev]; copy[index] = value; return copy; })
  }
  const addStep = () => setSteps(prev => [...prev, ''])
  const removeStep = (index) => { if (steps.length > 1) setSteps(prev => prev.filter((_, i) => i !== index)) }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    const cleanSpecs = specs.filter(s => s.name.trim()).map(s => ({ name: s.name.trim(), quantity: s.quantity.trim() || 'Standard' }))
    const cleanSteps = steps.filter(s => s.trim()).map(s => s.trim())
    
    const payload = {
      name: formData.name.trim(),
      category: formData.category || 'makanan',
      description: formData.description.trim() || `${formData.type} caliber ${formData.caliber}.`,
      image_url: uploadedImages.length > 0 ? JSON.stringify(uploadedImages) : '["/guns/pistol.svg"]',
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
        if (onSuccess) onSuccess(response.data)
      } else {
        throw new Error(response.message || 'Failed to create product.')
      }
    } catch (err) {
      setError(err.message || 'Error occurred while saving product to server.')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="form-page">
      <div className="form-head">
        <button type="button" className="detail-back" onClick={onBack}><ArrowLeft size={18} /> Back</button>
      </div>
      <div className="form-title-group">
        <h1 className="display">Register New Hardware</h1>
      </div>
      {error && <div className="toast toast--error"><AlertCircle size={18} /> {error}</div>}

      <div className="form-steps-nav">
        <div className={`step-badge ${currentStep === 'upload' ? 'step-badge--active' : 'step-badge--done'}`}>1. Imagery</div>
        <div className="step-badge-connector" />
        <div className={`step-badge ${currentStep === 'form' ? 'step-badge--active' : ''}`}>2. Specifications</div>
      </div>

      {currentStep === 'upload' && (
        <div className="card-box">
          <h2 className="card-box-title">Upload Image</h2>
          <div className="upload-dropzone">
             <input id="gun-image-input" type="file" accept="image/*" onChange={handleImageChange} className="hidden-file-input" />
             <label htmlFor="gun-image-input" className="upload-label">
                <Upload size={36} className="upload-icon" />
                <span className="upload-main-text">Click to choose an image file</span>
             </label>
          </div>
          
          {imagePreview && (
            <div className="preview-container" style={{ marginTop: '20px' }}>
              <img src={imagePreview} alt="Preview" style={{ width: '200px', height: '150px', objectFit: 'cover' }} />
              <button type="button" className="btn btn--primary" onClick={handleUploadImage} disabled={uploading}>
                 {uploading ? <Loader size={18} className="spin" /> : 'Confirm Image & Add Another'}
              </button>
            </div>
          )}
          
          {uploadedImages.length > 0 && (
             <div style={{ marginTop: '20px', borderTop: '1px solid var(--line)', paddingTop: '20px' }}>
               <h4>Images Added ({uploadedImages.length})</h4>
               <div style={{ display: 'flex', gap: '10px' }}>
                  {uploadedImages.map((img, i) => <img key={i} src={img} width="60" height="40" style={{objectFit: 'cover'}}/>)}
               </div>
               <button type="button" className="btn btn--outline" onClick={() => setCurrentStep('form')} style={{ marginTop: '14px' }}>Proceed to Form</button>
             </div>
          )}
          
          {!imagePreview && uploadedImages.length === 0 && (
             <button type="button" className="btn btn--outline" onClick={() => setCurrentStep('form')} style={{ marginTop: '20px' }}>Skip Image Upload</button>
          )}
        </div>
      )}

      {currentStep === 'form' && (
        <form onSubmit={handleSubmit} className="entry-form">
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Model Designation *</label>
              <input type="text" name="name" value={formData.name} onChange={handleFormChange} className="form-input" required />
            </div>
            <div className="form-group">
              <label className="form-label">Category *</label>
              <select name="type" value={formData.type} onChange={(e) => { handleFormChange(e); setFormData(p => ({...p, category: e.target.value === 'Pistol' ? 'makanan' : 'minuman'})) }} className="form-select">
                <option value="Pistol">Pistol</option><option value="Rifle">Rifle</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Caliber *</label>
              <input type="text" name="caliber" value={formData.caliber} onChange={handleFormChange} className="form-input" required />
            </div>
            <div className="form-group">
              <label className="form-label">Price (USD) *</label>
              <input type="number" name="price" value={formData.price} onChange={handleFormChange} className="form-input" required />
            </div>
          </div>
          <div className="form-group">
             <label className="form-label">Description</label>
             <textarea name="description" value={formData.description} onChange={handleFormChange} className="form-textarea" rows="3" />
          </div>
          
          <div className="form-fieldset">
             <div className="fieldset-header">
                <label className="form-label">Specifications</label>
                <button type="button" className="btn btn--outline btn--sm" onClick={addSpec}><Plus size={14} /> Add Spec</button>
             </div>
             <div className="multi-rows">
                {specs.map((spec, i) => (
                  <div key={i} className="multi-row">
                    <input type="text" placeholder="Attribute" value={spec.name} onChange={(e) => handleSpecChange(i, 'name', e.target.value)} className="form-input" />
                    <input type="text" placeholder="Value" value={spec.quantity} onChange={(e) => handleSpecChange(i, 'quantity', e.target.value)} className="form-input" />
                    <button type="button" className="btn btn--danger-ghost" onClick={() => removeSpec(i)} disabled={specs.length <= 1}><X size={16} /></button>
                  </div>
                ))}
             </div>
          </div>

          <div className="form-fieldset">
             <div className="fieldset-header">
                <label className="form-label">Maintenance Steps</label>
                <button type="button" className="btn btn--outline btn--sm" onClick={addStep}><Plus size={14} /> Add Step</button>
             </div>
             <div className="multi-rows">
                {steps.map((st, i) => (
                  <div key={i} className="step-row">
                    <span className="step-num">{i + 1}</span>
                    <input type="text" value={st} onChange={(e) => handleStepChange(i, e.target.value)} className="form-input" />
                    <button type="button" className="btn btn--danger-ghost" onClick={() => removeStep(i)} disabled={steps.length <= 1}><X size={16} /></button>
                  </div>
                ))}
             </div>
          </div>

          <div className="form-actions-bar">
             <button type="button" className="btn btn--outline" onClick={onBack} disabled={creating}>Cancel</button>
             <button type="submit" className="btn btn--primary" disabled={creating}>{creating ? <Loader size={18} className="spin" /> : 'Commit to Armory'}</button>
          </div>
        </form>
      )}
    </div>
  )
}
