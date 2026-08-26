import { useState, useCallback, useEffect } from 'react';
import { Star, Check, AlertCircle, Send } from 'lucide-react';
import { supabase, type Review } from '../lib/supabase';
import { useReveal } from '../lib/hooks';

const STAR_LABELS: Record<number, string> = {
  1: 'Poor',
  2: 'Fair',
  3: 'Average',
  4: 'Great',
  5: 'Excellent',
};

function StarPicker({
  value,
  onChange,
  disabled,
}: {
  value: number;
  onChange: (n: number) => void;
  disabled: boolean;
}) {
  const [hovered, setHovered] = useState(0);

  return (
    <div className="flex gap-2">
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = n <= (hovered || value);

        return (
          <button
            key={n}
            type="button"
            disabled={disabled}
            onClick={() => onChange(n)}
            onMouseEnter={() => setHovered(n)}
            onMouseLeave={() => setHovered(0)}
            className="focus:outline-none disabled:cursor-not-allowed transition-transform hover:scale-110"
            aria-label={`${n} star${n !== 1 ? 's' : ''}`}
          >
            <Star
              className={`w-9 h-9 transition-colors ${
                filled
                  ? 'text-accent-400 fill-accent-400'
                  : 'text-gray-600'
              }`}
            />
          </button>
        );
      })}
    </div>
  );
}

function ReviewForm() {
  const [stars, setStars] = useState(0);
  const [name, setName] = useState('');
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError('');

      const trimmedName = name.trim();
      const trimmedComment = comment.trim();

      if (!stars) {
        setError('Please select a star rating.');
        return;
      }

      if (!trimmedName) {
        setError('Please enter your name.');
        return;
      }

      if (trimmedName.length > 120) {
        setError('Your name must be 120 characters or fewer.');
        return;
      }

      if (!trimmedComment) {
        setError('Please write your review.');
        return;
      }

      if (trimmedComment.length > 2000) {
        setError('Your review must be 2,000 characters or fewer.');
        return;
      }

      setLoading(true);

      const { error: dbErr } = await supabase.from('reviews').insert({
        reviewer_name: trimmedName,
        rating: stars,
        comment: trimmedComment,
        project_id: null,
        client_id: null,
        status: 'pending',
        reviewed_by: null,
        reviewed_at: null,
      });

      setLoading(false);

      if (dbErr) {
        console.error('Review submission failed:', dbErr);
        setError(
          'Something went wrong while sending your review. Please try again.'
        );
        return;
      }

      setDone(true);
    },
    [stars, name, comment]
  );

  if (done) {
    return (
      <div className="glass rounded-3xl p-10 text-center">
        <div className="w-16 h-16 rounded-full bg-accent-400/20 flex items-center justify-center mx-auto mb-5">
          <Check
            className="w-8 h-8 text-accent-400"
            strokeWidth={2.5}
          />
        </div>

        <h3 className="font-display font-bold text-2xl text-white mb-3">
          Review sent successfully.
        </h3>

        <p className="text-gray-300 text-lg">
          Thank you for sharing your thoughts about Avelixa.
        </p>

        <p className="text-gray-500 text-sm mt-3">
          Your review has been submitted for approval.
        </p>

        <div className="mt-5 flex gap-1 justify-center">
          {Array.from({ length: stars }).map((_, i) => (
            <Star
              key={i}
              className="w-5 h-5 text-accent-400 fill-accent-400"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="glass rounded-3xl p-8">
      <h3 className="font-display font-bold text-2xl text-white mb-2">
        Leave a Review
      </h3>

      <p className="text-gray-400 text-sm mb-7">
        Tell us what you think about Avelixa. Anyone can share their
        experience.
      </p>

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-300 mb-3">
          Your Rating
        </label>

        <StarPicker
          value={stars}
          onChange={setStars}
          disabled={loading}
        />

        {stars > 0 && (
          <p
            className={`mt-2 text-sm font-medium ${
              stars >= 4 ? 'text-accent-400' : 'text-yellow-400'
            }`}
          >
            {STAR_LABELS[stars]}
          </p>
        )}
      </div>

      <div className="mb-5">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Your Name
        </label>

        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={loading}
          maxLength={120}
          placeholder="e.g. Jane Mwangi"
          className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-accent-400/60 focus:bg-white/[0.07] transition-all disabled:opacity-50"
        />
      </div>

      <div className="mb-5">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Your Review
        </label>

        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          disabled={loading}
          rows={5}
          maxLength={2000}
          placeholder="Tell us what you think about Avelixa..."
          className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-accent-400/60 focus:bg-white/[0.07] transition-all resize-none disabled:opacity-50"
        />

        <div className="mt-2 flex items-center justify-between gap-3">
          <p className="text-xs text-gray-500">
            Your review will be checked by the Avelixa team before it
            appears publicly.
          </p>

          <span className="text-xs text-gray-600 flex-shrink-0">
            {comment.length}/2000
          </span>
        </div>
      </div>

      {error && (
        <div className="mb-5 flex items-start gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <button
        type="submit"
        disabled={loading || !stars}
        className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full bg-gradient-to-r from-accent-400 to-brand-500 text-ink-950 font-semibold hover:shadow-[0_0_30px_-5px_rgba(34,211,238,0.6)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <span className="w-4 h-4 border-2 border-ink-950/30 border-t-ink-950 rounded-full animate-spin" />
            Sending...
          </span>
        ) : (
          <>
            <Send className="w-4 h-4" />
            Send Review
          </>
        )}
      </button>
    </form>
  );
}

function ReviewCard({
  review,
  index,
}: {
  review: Review;
  index: number;
}) {
  const reviewerName = review.reviewer_name?.trim() || 'Avelixa Client';
  const rating = Math.min(5, Math.max(1, review.rating));

  return (
    <div
      data-reveal
      style={{ transitionDelay: `${index * 60}ms` }}
      className="glass rounded-2xl p-7"
    >
      <div className="flex gap-1 mb-4">
        {Array.from({ length: 5 }).map((_, j) => (
          <Star
            key={j}
            className={`w-4 h-4 ${
              j < rating
                ? 'text-accent-400 fill-accent-400'
                : 'text-gray-700'
            }`}
          />
        ))}
      </div>

      <p className="text-gray-200 leading-relaxed mb-5">
        &quot;{review.comment}&quot;
      </p>

      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-full bg-gradient-to-br from-accent-400 to-brand-500 flex items-center justify-center text-ink-950 font-semibold text-lg flex-shrink-0">
          {reviewerName.charAt(0).toUpperCase()}
        </div>

        <div>
          <div className="font-semibold text-white text-sm">
            {reviewerName}
          </div>

          <div className="text-xs text-gray-500">
            {new Date(review.created_at).toLocaleDateString('en-KE', {
              month: 'short',
              year: 'numeric',
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Reviews() {
  useReveal();

  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const loadReviews = async () => {
      setLoading(true);

      const { data, error } = await supabase
        .from('reviews')
        .select(
          'id, project_id, client_id, rating, comment, status, created_at, updated_at, reviewed_by, reviewed_at, rejection_reason, reviewer_name'
        )
        .eq('status', 'approved')
        .order('created_at', { ascending: false })
        .limit(9);

      if (!active) {
        return;
      }

      if (error) {
        console.error('Failed to load public reviews:', error);
        setReviews([]);
      } else {
        setReviews((data ?? []) as Review[]);
      }

      setLoading(false);
    };

    void loadReviews();

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="relative pt-32 pb-28">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col lg:flex-row gap-16">
          <div
            className="lg:w-[420px] flex-shrink-0"
            data-reveal
          >
            <div className="text-xs font-semibold uppercase tracking-widest text-accent-400 mb-3">
              Share Your Experience
            </div>

            <h1 className="font-display font-bold text-4xl text-white tracking-tight mb-8">
              Tell us what you think
            </h1>

            <ReviewForm />
          </div>

          <div className="flex-1">
            <div
              className="text-xs font-semibold uppercase tracking-widest text-accent-400 mb-3"
              data-reveal
            >
              Reviews
            </div>

            <h2
              className="font-display font-bold text-4xl text-white tracking-tight mb-8"
              data-reveal
            >
              What people say
            </h2>

            {loading ? (
              <div className="grid sm:grid-cols-2 gap-5">
                {[1, 2, 3].map((n) => (
                  <div
                    key={n}
                    className="glass rounded-2xl p-7 animate-pulse"
                  >
                    <div className="flex gap-1 mb-4">
                      {[1, 2, 3, 4, 5].map((j) => (
                        <div
                          key={j}
                          className="w-4 h-4 rounded-full bg-white/10"
                        />
                      ))}
                    </div>

                    <div className="h-3 w-full rounded-full bg-white/10 mb-2" />
                    <div className="h-3 w-3/4 rounded-full bg-white/5 mb-6" />

                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-full bg-white/10" />

                      <div>
                        <div className="h-3 w-20 rounded-full bg-white/10 mb-1" />
                        <div className="h-2 w-16 rounded-full bg-white/5" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : reviews.length === 0 ? (
              <div className="glass rounded-2xl p-12 text-center text-gray-500">
                <Star className="w-12 h-12 mx-auto mb-4 opacity-30" />

                <p>No approved reviews yet — be the first!</p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-5">
                {reviews.map((review, index) => (
                  <ReviewCard
                    key={review.id}
                    review={review}
                    index={index}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}