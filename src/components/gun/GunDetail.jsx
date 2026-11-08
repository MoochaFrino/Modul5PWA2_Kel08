import { useState } from 'react'
import { ArrowLeft, Star, Send, Share2, Trash, ThumbsUp, ThumbsDown, Loader } from 'lucide-react'
import FavoriteButton from '../common/FavoriteButton'
import { useReviews, useCreateReview } from '../../hooks/useReviews'
import reviewService from '../../services/reviewService'
import { getUserIdentifier } from '../../services/userService'
import { formatPrice, averageRating } from '../../utils/helpers'

export default function GunDetail({ gun, onBack, onEdit, onDelete }) {
  let parsedImages = [];
  try { parsedImages = JSON.parse(gun.image_url); } catch { parsedImages = [gun.image_url || '/guns/pistol.svg']; }
  if (!Array.isArray(parsedImages)) parsedImages = [parsedImages];
  
  const [activeImage, setActiveImage] = useState(parsedImages[0] || '/guns/pistol.svg');
  const currentUser = getUserIdentifier();

  const { reviews, refetch: refetchReviews } = useReviews(gun.id)
  const { createReview, loading: submitting } = useCreateReview()
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')

  const [likes, setLikes] = useState(() => JSON.parse(localStorage.getItem('review_likes')) || {})
  const avgRating = gun.average_rating || averageRating(reviews)

  const handleReaction = (reviewId, type) => {
    const updated = { ...likes, [reviewId]: type };
    setLikes(updated);
    localStorage.setItem('review_likes', JSON.stringify(updated));
  }

  const handleDeleteReview = async (reviewId) => {
    if(window.confirm('Hapus ulasan ini?')) {
      await reviewService.deleteReview(reviewId);
      refetchReviews();
    }
  }

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    await createReview(gun.id, { user_identifier: currentUser, rating, comment: comment.trim() });
    setComment(''); setRating(5); refetchReviews();
  }

  const handleShare = () => {
    const directUrl = `${window.location.origin}/?gunId=${gun.id}`;
    if (navigator.share) {
      navigator.share({ title: gun.name, text: `Cek ${gun.name}!`, url: directUrl }).catch(console.error);
    } else {
      navigator.clipboard.writeText(directUrl);
      alert('Tautan langsung disalin ke clipboard!');
    }
  }

  return (
    <div className="detail">
      <button type="button" className="detail-back" onClick={onBack}><ArrowLeft size={18} /> Back</button>

      <div className="detail-hero">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <img className="detail-img" src={activeImage} alt={gun.name} />
          {parsedImages.length > 1 && (
            <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
              {parsedImages.map((img, i) => (
                 <img key={i} src={img} style={{ width: '60px', height: '40px', objectFit: 'cover', cursor: 'pointer', border: activeImage === img ? '2px solid var(--brass)' : 'none' }} onClick={() => setActiveImage(img)} />
              ))}
            </div>
          )}
        </div>
        
        <div className="detail-info">
          <h1 className="display">{gun.name}</h1>
          <p className="type">{gun.type} {gun.caliber ? `· ${gun.caliber}` : ''}</p>
          <p className="price detail-price">{formatPrice(gun.price ?? gun.cook_time ?? 0)}</p>
          
          {avgRating > 0 && (
            <p className="detail-rating">
              <Star size={16} fill="var(--brass)" stroke="var(--brass)" />
              {avgRating.toFixed(1)} ({reviews.length} review{reviews.length !== 1 ? 's' : ''})
            </p>
          )}

          <div className="detail-actions">
            <FavoriteButton gunId={gun.id} />
            <button type="button" className="btn btn--outline" onClick={handleShare}><Share2 size={16} /> Share</button>
            {onEdit && <button type="button" className="btn btn--outline" onClick={() => onEdit(gun)}>Edit</button>}
            {onDelete && <button type="button" className="btn btn--danger" onClick={() => onDelete(gun)}>Archive</button>}
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
              <li key={ing.id || i}><strong>{ing.name}</strong> — {ing.quantity}</li>
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
        <h2>Reviews</h2>
        <form className="review-form" onSubmit={handleSubmitReview}>
          <div className="review-stars">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button" className="star-btn" onClick={() => setRating(n)}>
                <Star size={22} fill={n <= rating ? 'var(--brass)' : 'none'} stroke={n <= rating ? 'var(--brass)' : 'var(--steel)'} />
              </button>
            ))}
          </div>
          <textarea className="review-input" rows="3" placeholder="Tulis ulasan..." value={comment} onChange={(e) => setComment(e.target.value)} />
          <button type="submit" className="btn btn--primary" disabled={submitting}><Send size={16} /> Submit Review</button>
        </form>

        {reviews.length > 0 ? (
          <ul className="review-list">
            {reviews.map((rev) => {
              const isOwner = rev.user_identifier === currentUser || rev.user_id === currentUser;
              const userReaction = likes[rev.id];

              return (
              <li key={rev.id} className="review-item">
                <div className="review-head">
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span className="review-user">{rev.user_identifier || 'Anonymous'} {isOwner && '(Anda)'}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--steel)' }}>
                      {rev.created_at ? new Date(rev.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Baru saja'}
                    </span>
                  </div>
                  <span className="review-stars-display">
                    {Array.from({ length: 5 }, (_, i) => <Star key={i} size={14} fill={i < rev.rating ? 'var(--brass)' : 'none'} stroke={i < rev.rating ? 'var(--line)' : 'var(--steel)'} />)}
                  </span>
                </div>
                <p className="review-comment">{rev.comment}</p>
                
                <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                  {!isOwner ? (
                    <>
                      <button className="icon-btn" onClick={() => handleReaction(rev.id, 'like')} style={{ borderColor: userReaction === 'like' ? 'var(--brass)' : '' }}>
                        <ThumbsUp size={14} color={userReaction === 'like' ? 'var(--brass)' : 'var(--steel)'}/>
                      </button>
                      <button className="icon-btn" onClick={() => handleReaction(rev.id, 'dislike')} style={{ borderColor: userReaction === 'dislike' ? 'var(--brass)' : '' }}>
                        <ThumbsDown size={14} color={userReaction === 'dislike' ? 'var(--brass)' : 'var(--steel)'}/>
                      </button>
                    </>
                  ) : (
                    <button className="btn btn--danger-ghost" onClick={() => handleDeleteReview(rev.id)}>
                       <Trash size={14} /> Hapus
                    </button>
                  )}
                </div>
              </li>
            )})}
          </ul>
        ) : <p className="detail-empty">Belum ada ulasan.</p>}
      </section>
    </div>
  )
}
