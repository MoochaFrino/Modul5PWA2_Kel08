import FavoriteButton from '../common/FavoriteButton'
import { formatPrice, truncate } from '../../utils/helpers'

export default function GunCard({ gun, onSelect, onEdit, onDelete, isArchiveMode = false, onRestore }) {
  let images = [];
  try { images = JSON.parse(gun.image_url); } catch { images = [gun.image_url || '/guns/pistol.svg']; }
  if (!Array.isArray(images)) images = [images];
  const mainImage = images[0] || '/guns/pistol.svg';

  return (
    <li className="card">
      <button type="button" className="card-btn" onClick={() => onSelect(gun)}>
        <img className="card-img" src={mainImage} alt={gun.name} loading="lazy" onError={(e) => { e.target.onerror = null; e.target.src = '/guns/pistol.svg'; }} />
        <span className="name display">{gun.name}</span>
        <span className="type">{gun.type || gun.category} {gun.caliber ? `· ${gun.caliber}` : ''}</span>
        {gun.description && <span className="card-desc">{truncate(gun.description, 72)}</span>}
        <span className="price">{formatPrice(gun.price ?? gun.cook_time ?? 0)}</span>
      </button>

      <div className="card-actions">
        {!isArchiveMode && <FavoriteButton gunId={gun.id} />}
        
        {isArchiveMode && onRestore && (
          <button type="button" className="card-act-btn" onClick={(e) => { e.stopPropagation(); onRestore(gun) }} title="Pulihkan Data">
            ♻️
          </button>
        )}
        {!isArchiveMode && onEdit && (
          <button type="button" className="card-act-btn" onClick={(e) => { e.stopPropagation(); onEdit(gun) }} title="Edit">
            ✏️
          </button>
        )}
        {onDelete && (
          <button type="button" className="card-act-btn card-act-btn--danger" onClick={(e) => { e.stopPropagation(); onDelete(gun) }} title={isArchiveMode ? "Hapus Permanen" : "Arsipkan (Soft Delete)"}>
            {isArchiveMode ? "🗑️" : "📦"}
          </button>
        )}
      </div>
    </li>
  )
}
