import { useState, useEffect, useCallback } from 'react'
import {
  ArrowLeft,
  Star,
  Send,
  Share2,
  Trash,
  Edit2,
  ThumbsUp,
  ThumbsDown,
  Check,
  X,
} from 'lucide-react'
import FavoriteButton from '../common/FavoriteButton'
import reviewService from '../../services/reviewService'
import { getUserIdentifier, getUserProfile } from '../../services/userService'
import { formatPrice, averageRating } from '../../utils/helpers'

const LOCAL_REVIEWS_KEY = 'bore_barrel_local_reviews_v2'
const DELETED_REVIEWS_KEY = 'bore_barrel_deleted_reviews_v2'
const EDITED_REVIEWS_KEY = 'bore_barrel_edited_reviews_v2'
const MY_REVIEW_IDS_KEY = 'bore_barrel_my_review_ids_v2'
const REACTIONS_KEY = 'bore_barrel_review_reactions_v3'

const getJSON = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

// Kumpulan 24 Review Fiktif (Didominasi Bintang 5, dengan variasi Bintang 4 & 3 serta Like/Dislike acak)
const PEER_REVIEW_POOL = [
  {
    user_identifier: 'Viper-Actual',
    rating: 5,
    comment: 'Ergonomi grip sangat pas di tangan, recoil sangat mudah dikontrol saat rapid fire.',
    created_at: '2026-11-08T14:20:00.000Z',
    defaultLikes: 18,
    defaultDislikes: 1,
  },
  {
    user_identifier: 'Ranger_Kilo',
    rating: 5,
    comment: 'Sudah dipakai latihan lebih dari 1.000 butir di lapangan tembak tanpa kendala jamming sedikit pun.',
    created_at: '2026-11-07T09:15:00.000Z',
    defaultLikes: 24,
    defaultDislikes: 0,
  },
  {
    user_identifier: 'TacticalBudi',
    rating: 4,
    comment: 'Akurasi di jarak menengah sangat memuaskan, cuma tarikan trigger bawaan terasa sedikit berat di awal.',
    created_at: '2026-11-06T16:40:00.000Z',
    defaultLikes: 9,
    defaultDislikes: 2,
  },
  {
    user_identifier: 'Shadow_09',
    rating: 5,
    comment: 'Material receiver sangat solid dan finishing pelapisnya tahan gores. Worth every penny.',
    created_at: '2026-11-05T11:30:00.000Z',
    defaultLikes: 15,
    defaultDislikes: 1,
  },
  {
    user_identifier: 'DeltaForce_ID',
    rating: 5,
    comment: 'Proses bongkar pasang untuk pembersihan rutin sangat praktis, tidak butuh alat khusus.',
    created_at: '2026-11-04T19:10:00.000Z',
    defaultLikes: 12,
    defaultDislikes: 0,
  },
  {
    user_identifier: 'ZeroCool_99',
    rating: 3,
    comment: 'Unit berfungsi baik, tapi bobotnya lumayan bikin pegal kalau dibawa latihan seharian penuh.',
    created_at: '2026-11-03T08:45:00.000Z',
    defaultLikes: 6,
    defaultDislikes: 4,
  },
  {
    user_identifier: 'HawkEye_Sniper',
    rating: 5,
    comment: 'Grouping tembakan sangat rapat di jarak 50 meter. Sight bawaan pabrik sudah sangat presisi.',
    created_at: '2026-11-02T13:25:00.000Z',
    defaultLikes: 31,
    defaultDislikes: 2,
  },
  {
    user_identifier: 'BravoSix_Ops',
    rating: 5,
    comment: 'Keseimbangan bobot depan dan belakang sangat pas. Transisi antar target jadi jauh lebih cepat.',
    created_at: '2026-11-01T17:50:00.000Z',
    defaultLikes: 19,
    defaultDislikes: 1,
  },
  {
    user_identifier: 'ArmoryMaster',
    rating: 4,
    comment: 'Kualitas build secara keseluruhan mantap, hanya saja per magazine agak keras saat pertama kali diisi.',
    created_at: '2026-10-30T10:05:00.000Z',
    defaultLikes: 11,
    defaultDislikes: 3,
  },
  {
    user_identifier: 'GhostRecon_21',
    rating: 5,
    comment: 'Salah satu koleksi terbaik di katalog ini. Suara mekanisme bolt-nya terdengar sangat kokoh dan presisi.',
    created_at: '2026-10-29T15:12:00.000Z',
    defaultLikes: 22,
    defaultDislikes: 0,
  },
  {
    user_identifier: 'Sierra_Tango',
    rating: 5,
    comment: 'Sangat direkomendasikan baik untuk pemula maupun penembak berpengalaman. Penanganan hentakannya halus.',
    created_at: '2026-10-28T20:30:00.000Z',
    defaultLikes: 14,
    defaultDislikes: 1,
  },
  {
    user_identifier: 'IronSight_Pro',
    rating: 4,
    comment: 'Harga sangat kompetitif untuk spesifikasi setinggi ini. Kondisi unit saat diterima sangat mulus.',
    created_at: '2026-10-27T12:00:00.000Z',
    defaultLikes: 8,
    defaultDislikes: 1,
  },
  {
    user_identifier: 'AlphaWolf_88',
    rating: 5,
    comment: 'Sudah diuji pada kondisi cuaca lembap dan berdebu, mekanisme penembakan tetap lancar tanpa macet.',
    created_at: '2026-10-26T09:40:00.000Z',
    defaultLikes: 27,
    defaultDislikes: 2,
  },
  {
    user_identifier: 'Kestrel_One',
    rating: 5,
    comment: 'Desain punya estetika klasik tapi performanya tetap relevan dengan standar taktis modern.',
    created_at: '2026-10-25T18:15:00.000Z',
    defaultLikes: 16,
    defaultDislikes: 0,
  },
  {
    user_identifier: 'NusantaraShooter',
    rating: 5,
    comment: 'Sangat puas dengan akurasinya! Langsung jadi andalan utama saat sesi latihan akhir pekan.',
    created_at: '2026-10-24T14:55:00.000Z',
    defaultLikes: 20,
    defaultDislikes: 1,
  },
  {
    user_identifier: 'Outlaw_77',
    rating: 3,
    comment: 'Secara performa oke dan akurat, tapi aksesoris tambahan untuk model ini agak jarang di pasaran.',
    created_at: '2026-10-23T11:20:00.000Z',
    defaultLikes: 5,
    defaultDislikes: 5,
  },
  {
    user_identifier: 'Capt_Price',
    rating: 5,
    comment: 'Reliabilitas tingkat tinggi. Tidak pernah mengecewakan saat dibutuhkan di medan latihan.',
    created_at: '2026-10-22T07:30:00.000Z',
    defaultLikes: 34,
    defaultDislikes: 1,
  },
  {
    user_identifier: 'Falcon_Punch',
    rating: 4,
    comment: 'Tekstur grip sangat membantu saat tangan berkeringat, hanya perlu sedikit kalibrasi ulang pada pisir.',
    created_at: '2026-10-21T16:10:00.000Z',
    defaultLikes: 10,
    defaultDislikes: 2,
  },
  {
    user_identifier: 'Omega_Squad',
    rating: 5,
    comment: 'Presisi machining pada bagian laras dan slide benar-benar rapi tanpa cacat produksi.',
    created_at: '2026-10-20T13:45:00.000Z',
    defaultLikes: 13,
    defaultDislikes: 0,
  },
  {
    user_identifier: 'Ronin_Tactical',
    rating: 5,
    comment: 'Cycle rate sangat mulus dan arah lontaran selongsong peluru selalu konsisten.',
    created_at: '2026-10-19T19:05:00.000Z',
    defaultLikes: 17,
    defaultDislikes: 1,
  },
  {
    user_identifier: 'Blitzkrieg_01',
    rating: 5,
    comment: 'Nilai investasi yang sangat bagus. Kualitas baja larasnya jauh di atas rata-rata kompetitor sekelasnya.',
    created_at: '2026-10-18T10:50:00.000Z',
    defaultLikes: 21,
    defaultDislikes: 2,
  },
  {
    user_identifier: 'Spectre_Ops',
    rating: 4,
    comment: 'Sangat nyaman digunakan, walau butuh sedikit waktu adaptasi dengan posisi tuas pengamannya.',
    created_at: '2026-10-17T15:35:00.000Z',
    defaultLikes: 7,
    defaultDislikes: 1,
  },
  {
    user_identifier: 'Garuda_Marksman',
    rating: 5,
    comment: 'Benar-benar sesuai dengan lembar spesifikasi. Akurasi langsung terasa sejak tembakan pertama.',
    created_at: '2026-10-16T08:25:00.000Z',
    defaultLikes: 25,
    defaultDislikes: 0,
  },
  {
    user_identifier: 'Valhalla_Guard',
    rating: 5,
    comment: 'Konstruksi sangat kokoh, distribusi beban merata, dan komponen internalnya mudah dirawat.',
    created_at: '2026-10-15T21:00:00.000Z',
    defaultLikes: 15,
    defaultDislikes: 1,
  },
]

// Fungsi untuk memilih 3-6 review unik secara acak namun konsisten untuk tiap senjata
const getSeededReviewsForGun = (gunId, gunName = '') => {
  const seedStr = `${gunId}-${gunName}`
  let hash = 0
  for (let i = 0; i < seedStr.length; i++) {
    hash = (hash * 31 + seedStr.charCodeAt(i)) % 100000
  }

  // Jumlah review per senjata bervariasi antara 3 sampai 6 review
  const reviewCount = 3 + (hash % 4)
  const step = 5 + (hash % 7) // Langkah lompatan prima/ganjil agar kombinasi selalu berbeda
  const selected = []
  const usedIndices = new Set()

  for (let i = 0; i < reviewCount; i++) {
    let idx = (hash + i * step) % PEER_REVIEW_POOL.length
    while (usedIndices.has(idx)) {
      idx = (idx + 1) % PEER_REVIEW_POOL.length
    }
    usedIndices.add(idx)
    const item = PEER_REVIEW_POOL[idx]
    selected.push({
      ...item,
      id: `peer-review-${gunId}-${idx}`,
      isPeerSeed: true,
    })
  }

  return selected
}

export default function GunDetail({ gun, onBack, onEdit, onDelete }) {
  let parsedImages = []
  try {
    parsedImages = JSON.parse(gun.image_url)
  } catch {
    parsedImages = [gun.image_url || '/guns/pistol.svg']
  }
  if (!Array.isArray(parsedImages)) parsedImages = [parsedImages]

  const [activeImage, setActiveImage] = useState(parsedImages[0] || '/guns/pistol.svg')
  const currentUser = getUserIdentifier()
  const userProfile = getUserProfile()
  const displayUsername = userProfile?.username || currentUser

  const [reviews, setReviews] = useState([])
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // State untuk Edit Review
  const [editingReviewId, setEditingReviewId] = useState(null)
  const [editRating, setEditRating] = useState(5)
  const [editComment, setEditComment] = useState('')

  // State Reaksi (Total Thumbs Up & Thumbs Down per Review)
  const [reactions, setReactions] = useState(() => getJSON(REACTIONS_KEY, {}))

  const loadCombinedReviews = useCallback(async () => {
    let remoteReviews = []
    try {
      const res = await reviewService.getReviews(gun.id)
      if (Array.isArray(res)) remoteReviews = res
      else if (Array.isArray(res?.data)) remoteReviews = res.data
    } catch {
      remoteReviews = []
    }

    const localMap = getJSON(LOCAL_REVIEWS_KEY, {})
    const localList = localMap[String(gun.id)] || []
    const deletedIds = new Set(getJSON(DELETED_REVIEWS_KEY, []).map(String))
    const editedMap = getJSON(EDITED_REVIEWS_KEY, {})

    const mergedMap = new Map()
    remoteReviews.forEach((r) => mergedMap.set(String(r.id), r))
    localList.forEach((r) => mergedMap.set(String(r.id), r))

    // Masukkan variasi review fiktif yang berbeda untuk setiap senjata
    const seededList = getSeededReviewsForGun(gun.id, gun.name)
    seededList.forEach((seedRev) => {
      if (!mergedMap.has(seedRev.id) && !deletedIds.has(seedRev.id)) {
        mergedMap.set(seedRev.id, seedRev)
      }
    })

    const finalReviews = Array.from(mergedMap.values())
      .filter((r) => !deletedIds.has(String(r.id)))
      .map((r) => {
        const override = editedMap[String(r.id)]
        return override ? { ...r, ...override } : r
      })
      .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))

    setReviews(finalReviews)
  }, [gun.id, gun.name])

  useEffect(() => {
    loadCombinedReviews()
  }, [loadCombinedReviews])

  const isReviewOwner = (rev) => {
    if (rev.isPeerSeed) return false
    const myIds = getJSON(MY_REVIEW_IDS_KEY, []).map(String)
    if (myIds.includes(String(rev.id))) return true
    return (
      rev.user_identifier === currentUser ||
      rev.user_identifier === displayUsername ||
      rev.user_id === currentUser
    )
  }

  // Ambil statistik Like & Dislike untuk suatu review
  const getReactionStats = (rev) => {
    const key = String(rev.id)
    if (reactions[key]) return reactions[key]
    return {
      likes: rev.defaultLikes ?? 0,
      dislikes: rev.defaultDislikes ?? 0,
      userReaction: null,
    }
  }

  // Submit Review Baru
  const handleSubmitReview = async (e) => {
    e.preventDefault()
    if (!comment.trim()) return
    setSubmitting(true)

    const newRev = {
      id: `rev-${Date.now()}`,
      gun_id: gun.id,
      user_identifier: displayUsername,
      rating,
      comment: comment.trim(),
      created_at: new Date().toISOString(),
      defaultLikes: 0,
      defaultDislikes: 0,
    }

    try {
      const res = await reviewService.createReview(gun.id, {
        user_identifier: displayUsername,
        rating,
        comment: comment.trim(),
      })
      if (res?.data?.id) newRev.id = res.data.id
    } catch {
      // Tetap simpan di localStorage jika server menolak
    }

    const myIds = getJSON(MY_REVIEW_IDS_KEY, [])
    localStorage.setItem(MY_REVIEW_IDS_KEY, JSON.stringify([...myIds, String(newRev.id)]))

    const localMap = getJSON(LOCAL_REVIEWS_KEY, {})
    const listForGun = localMap[String(gun.id)] || []
    localMap[String(gun.id)] = [newRev, ...listForGun]
    localStorage.setItem(LOCAL_REVIEWS_KEY, JSON.stringify(localMap))

    setComment('')
    setRating(5)
    setSubmitting(false)
    loadCombinedReviews()
  }

  const startEditReview = (rev) => {
    setEditingReviewId(rev.id)
    setEditRating(rev.rating || 5)
    setEditComment(rev.comment || '')
  }

  const handleSaveEdit = async (reviewId) => {
    if (!editComment.trim()) return
    const updatedFields = {
      rating: editRating,
      comment: editComment.trim(),
      updated_at: new Date().toISOString(),
    }

    const editedMap = getJSON(EDITED_REVIEWS_KEY, {})
    editedMap[String(reviewId)] = updatedFields
    localStorage.setItem(EDITED_REVIEWS_KEY, JSON.stringify(editedMap))

    try {
      if (reviewService.updateReview) {
        await reviewService.updateReview(reviewId, updatedFields)
      }
    } catch {
      // Abaikan jika endpoint PATCH belum diizinkan RLS
    }

    setEditingReviewId(null)
    loadCombinedReviews()
  }

  const handleDeleteReview = async (reviewId) => {
    const deletedIds = getJSON(DELETED_REVIEWS_KEY, [])
    localStorage.setItem(
      DELETED_REVIEWS_KEY,
      JSON.stringify([...deletedIds, String(reviewId)])
    )

    const localMap = getJSON(LOCAL_REVIEWS_KEY, {})
    if (localMap[String(gun.id)]) {
      localMap[String(gun.id)] = localMap[String(gun.id)].filter(
        (r) => String(r.id) !== String(reviewId)
      )
      localStorage.setItem(LOCAL_REVIEWS_KEY, JSON.stringify(localMap))
    }

    try {
      if (reviewService.deleteReview) {
        await reviewService.deleteReview(reviewId)
      }
    } catch {
      // Sudah dihapus dari state lokal
    }

    setReviews((prev) => prev.filter((r) => String(r.id) !== String(reviewId)))
  }

  // Toggle Like / Dislike beserta Perhitungan Total
  const handleReaction = (rev, type) => {
    const key = String(rev.id)
    const current = getReactionStats(rev)

    let { likes, dislikes, userReaction } = current

    if (userReaction === type) {
      if (type === 'like') likes = Math.max(0, likes - 1)
      if (type === 'dislike') dislikes = Math.max(0, dislikes - 1)
      userReaction = null
    } else {
      if (userReaction === 'like') likes = Math.max(0, likes - 1)
      if (userReaction === 'dislike') dislikes = Math.max(0, dislikes - 1)
      if (type === 'like') likes += 1
      if (type === 'dislike') dislikes += 1
      userReaction = type
    }

    const updated = { ...reactions, [key]: { likes, dislikes, userReaction } }
    setReactions(updated)
    localStorage.setItem(REACTIONS_KEY, JSON.stringify(updated))
  }

  const handleShare = () => {
    const directUrl = `${window.location.origin}/?gunId=${gun.id}`
    if (navigator.share) {
      navigator
        .share({ title: gun.name, text: `Cek ${gun.name}!`, url: directUrl })
        .catch(console.error)
    } else {
      navigator.clipboard.writeText(directUrl)
      alert('Tautan langsung disalin ke clipboard!')
    }
  }

  const avgRating = averageRating(reviews) || gun.average_rating || 0

  return (
    <div className="detail">
      <button type="button" className="detail-back" onClick={onBack}>
        <ArrowLeft size={18} /> Back
      </button>

      <div className="detail-hero">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <img
            className="detail-img"
            src={activeImage}
            alt={gun.name}
            onError={(e) => {
              e.target.onerror = null
              e.target.src = '/guns/pistol.svg'
            }}
          />
          {parsedImages.length > 1 && (
            <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
              {parsedImages.map((img, i) => (
                <img
                  key={i}
                  src={img}
                  alt={`Thumb ${i}`}
                  style={{
                    width: '64px',
                    height: '44px',
                    objectFit: 'cover',
                    cursor: 'pointer',
                    borderRadius: '4px',
                    border: activeImage === img ? '2px solid var(--brass)' : '1px solid var(--line)',
                  }}
                  onClick={() => setActiveImage(img)}
                />
              ))}
            </div>
          )}
        </div>

        <div className="detail-info">
          <h1 className="display">{gun.name}</h1>
          <p className="type">
            {gun.type} {gun.caliber ? `· ${gun.caliber}` : ''}
          </p>
          <p className="price detail-price">{formatPrice(gun.price ?? gun.cook_time ?? 0)}</p>

          {avgRating > 0 && (
            <p className="detail-rating">
              <Star size={16} fill="var(--brass)" stroke="var(--brass)" />
              {avgRating.toFixed(1)} ({reviews.length} review{reviews.length !== 1 ? 's' : ''})
            </p>
          )}

          <div className="detail-actions">
            <FavoriteButton gunId={gun.id} />
            <button type="button" className="btn btn--outline" onClick={handleShare}>
              <Share2 size={16} /> Share
            </button>
            {onEdit && (
              <button type="button" className="btn btn--outline" onClick={() => onEdit(gun)}>
                Edit
              </button>
            )}
            {onDelete && (
              <button type="button" className="btn btn--danger" onClick={() => onDelete(gun)}>
                Archive
              </button>
            )}
          </div>
        </div>
      </div>

      <section className="detail-section">
        <h2>Description</h2>
        <p>{gun.description || 'No description available.'}</p>
      </section>

      {gun.ingredients && gun.ingredients.length > 0 && (
        <section className="detail-section">
          <h2>Specifications</h2>
          <ul className="detail-specs">
            {gun.ingredients.map((ing, i) => (
              <li key={ing.id || i}>
                <strong>{ing.name}</strong> — {ing.quantity}
              </li>
            ))}
          </ul>
        </section>
      )}

      {gun.steps && gun.steps.length > 0 && (
        <section className="detail-section">
          <h2>Assembly / Maintenance Steps</h2>
          <ol className="detail-steps">
            {gun.steps.map((step, i) => (
              <li key={step.id || i}>{step.instruction || step}</li>
            ))}
          </ol>
        </section>
      )}

      <section className="detail-section">
        <h2>Reviews ({reviews.length})</h2>
        <form className="review-form" onSubmit={handleSubmitReview}>
          <div className="review-stars">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button" className="star-btn" onClick={() => setRating(n)}>
                <Star
                  size={22}
                  fill={n <= rating ? 'var(--brass)' : 'none'}
                  stroke={n <= rating ? 'var(--brass)' : 'var(--steel)'}
                />
              </button>
            ))}
          </div>
          <textarea
            className="review-input"
            rows="3"
            placeholder="Tulis ulasan kamu di sini..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            required
          />
          <button type="submit" className="btn btn--primary" disabled={submitting}>
            <Send size={16} /> Submit Review
          </button>
        </form>

        {reviews.length > 0 ? (
          <ul className="review-list">
            {reviews.map((rev) => {
              const isOwner = isReviewOwner(rev)
              const rStats = getReactionStats(rev)
              const isEditingThis = editingReviewId === rev.id

              return (
                <li key={rev.id} className="review-item">
                  <div className="review-head">
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span className="review-user">
                        {rev.user_identifier || 'Anonymous'}{' '}
                        {isOwner && (
                          <span style={{ color: 'var(--brass)', fontSize: '0.8rem' }}>(Anda)</span>
                        )}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--steel)' }}>
                        {rev.created_at
                          ? new Date(rev.created_at).toLocaleDateString('id-ID', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })
                          : 'Baru saja'}
                        {rev.updated_at ? ' · (Diedit)' : ''}
                      </span>
                    </div>

                    {!isEditingThis && (
                      <span className="review-stars-display">
                        {Array.from({ length: 5 }, (_, i) => (
                          <Star
                            key={i}
                            size={14}
                            fill={i < rev.rating ? 'var(--brass)' : 'none'}
                            stroke={i < rev.rating ? 'var(--brass)' : 'var(--line)'}
                          />
                        ))}
                      </span>
                    )}
                  </div>

                  {isEditingThis ? (
                    <div
                      style={{
                        marginTop: '10px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                      }}
                    >
                      <div className="review-stars">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <button
                            key={n}
                            type="button"
                            className="star-btn"
                            onClick={() => setEditRating(n)}
                          >
                            <Star
                              size={18}
                              fill={n <= editRating ? 'var(--brass)' : 'none'}
                              stroke={n <= editRating ? 'var(--brass)' : 'var(--steel)'}
                            />
                          </button>
                        ))}
                      </div>
                      <textarea
                        className="form-textarea"
                        rows="2"
                        value={editComment}
                        onChange={(e) => setEditComment(e.target.value)}
                      />
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          type="button"
                          className="btn btn--primary btn--sm"
                          onClick={() => handleSaveEdit(rev.id)}
                        >
                          <Check size={14} /> Simpan
                        </button>
                        <button
                          type="button"
                          className="btn btn--outline btn--sm"
                          onClick={() => setEditingReviewId(null)}
                        >
                          <X size={14} /> Batal
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="review-comment">{rev.comment}</p>
                  )}

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginTop: '12px',
                      flexWrap: 'wrap',
                      gap: '10px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <button
                        type="button"
                        className="btn btn--outline btn--sm"
                        disabled={isOwner}
                        onClick={() => handleReaction(rev, 'like')}
                        title={
                          isOwner
                            ? 'Jumlah Like pada ulasan Anda'
                            : 'Sukai ulasan ini (Thumbs Up)'
                        }
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          borderColor: rStats.userReaction === 'like' ? 'var(--brass)' : undefined,
                          color: rStats.userReaction === 'like' ? 'var(--brass)' : undefined,
                          opacity: isOwner ? 0.75 : 1,
                        }}
                      >
                        <ThumbsUp size={14} />
                        <span>{rStats.likes}</span>
                      </button>

                      <button
                        type="button"
                        className="btn btn--outline btn--sm"
                        disabled={isOwner}
                        onClick={() => handleReaction(rev, 'dislike')}
                        title={
                          isOwner
                            ? 'Jumlah Dislike pada ulasan Anda'
                            : 'Tidak sukai ulasan ini (Thumbs Down)'
                        }
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          borderColor: rStats.userReaction === 'dislike' ? '#ef4444' : undefined,
                          color: rStats.userReaction === 'dislike' ? '#ef4444' : undefined,
                          opacity: isOwner ? 0.75 : 1,
                        }}
                      >
                        <ThumbsDown size={14} />
                        <span>{rStats.dislikes}</span>
                      </button>
                    </div>

                    {isOwner && !isEditingThis && (
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          type="button"
                          className="btn btn--outline btn--sm"
                          onClick={() => startEditReview(rev)}
                        >
                          <Edit2 size={14} /> Edit
                        </button>
                        <button
                          type="button"
                          className="btn btn--danger-ghost btn--sm"
                          onClick={() => handleDeleteReview(rev.id)}
                        >
                          <Trash size={14} /> Hapus
                        </button>
                      </div>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="detail-empty">Belum ada ulasan.</p>
        )}
      </section>
    </div>
  )
}
