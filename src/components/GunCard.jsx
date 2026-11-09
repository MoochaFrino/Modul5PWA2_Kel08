import { useState, useEffect, useRef } from 'react'
import FavoriteButton from '../common/FavoriteButton'
import { formatPrice, truncate } from '../../utils/helpers'

export default function GunCard({
  gun,
  onSelect,
  onEdit,
  onDelete,
  isArchiveMode = false,
  onRestore,
}) {
  const [isVisible, setIsVisible] = useState(false)
  const [imgLoaded, setImgLoaded] = useState(false)
  const cardRef = useRef(null)

  // IntersectionObserver agar gambar HANYA di-fetch saat kartu masuk ke layar (scroll)
  useEffect(() => {
    const el = cardRef.current
    if (!el) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true)
            observer.unobserve(el)
          }
        })
      },
      {
        root: null,
        rootMargin: '0px 0px -30px 0px', // Memastikan gambar di bawah layar baru di-load saat di-scroll
        threshold: 0.1,
      }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  let images = []
  try {
    images = JSON.parse(gun.image_url)
  } catch {
    images = [gun.image_url || '/guns/pistol.svg']
  }
  if (!Array.isArray(images)) images = [images]
  const rawMain = images[0] || '/guns/pistol.svg'

  // Tambahkan parameter unik pada SVG lokal agar setiap kartu tampak ter-load bertahap di tab Network -> Img
  const mainImage = rawMain.startsWith('/guns/')
    ? `${rawMain}?item=${encodeURIComponent(gun.id || gun.name)}`
    : rawMain

  return (
    <li className="card" ref={cardRef}>
      <button type="button" className="card-btn" onClick={() => onSelect(gun)}>
        <div
          style={{
            width: '100%',
            height: '160px',
            backgroundColor: 'rgba(255,255,255,0.03)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            borderRadius: '4px',
            marginBottom: '10px',
          }}
        >
          {isVisible ? (
            <img
              className="card-img"
              src={mainImage}
              alt={gun.name}
              loading="lazy"
              onLoad={() => setImgLoaded(true)}
              onError={(e) => {
                e.target.onerror = null
                e.target.src = `/guns/pistol.svg?fallback=${encodeURIComponent(gun.id)}`
                setImgLoaded(true)
              }}
              style={{
                opacity: imgLoaded ? 1 : 0,
                transition: 'opacity 0.3s ease-in-out',
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />
          ) : (
            <span className="type" style={{ fontSize: '0.75rem', opacity: 0.5 }}>
              Menunggu scroll...
            </span>
          )}
        </div>

        <span className="name display">{gun.name}</span>
        <span className="type">
          {gun.type || gun.category} {gun.caliber ? `· ${gun.caliber}` : ''}
        </span>
        {gun.description && (
          <span className="card-desc">{truncate(gun.description, 72)}</span>
        )}
        <span className="price">{formatPrice(gun.price ?? gun.cook_time ?? 0)}</span>
      </button>

      <div className="card-actions">
        {!isArchiveMode && <FavoriteButton gunId={gun.id} gun={gun} />}

        {isArchiveMode && onRestore && (
          <button
            type="button"
            className="card-act-btn"
            onClick={(e) => {
              e.stopPropagation()
              onRestore(gun)
            }}
            title="Pulihkan ke Katalog"
          >
            ♻️
          </button>
        )}
        {!isArchiveMode && onEdit && (
          <button
            type="button"
            className="card-act-btn"
            onClick={(e) => {
              e.stopPropagation()
              onEdit(gun)
            }}
            title="Edit"
          >
            ✏️
          </button>
        )}
        {onDelete && (
          <button
            type="button"
            className="card-act-btn card-act-btn--danger"
            onClick={(e) => {
              e.stopPropagation()
              onDelete(gun)
            }}
            title={isArchiveMode ? 'Hapus Permanen' : 'Arsipkan Instan'}
          >
            {isArchiveMode ? '🗑️' : '📦'}
          </button>
        )}
      </div>
    </li>
  )
}
