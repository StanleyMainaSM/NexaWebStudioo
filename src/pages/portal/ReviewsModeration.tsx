import { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Clock3,
  RefreshCw,
  Star,
  X,
  XCircle,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

type Review = {
  id: string;
  project_id: string | null;
  client_id: string | null;
  rating: number | null;
  comment: string | null;
  status: string | null;
  created_at: string | null;
  updated_at: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  reviewer_name: string | null;
};

const statusStyles: Record<string, string> = {
  pending: 'border-amber-500/20 bg-amber-500/10 text-amber-300',
  approved: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300',
  rejected: 'border-red-500/20 bg-red-500/10 text-red-300',
};

function Stars({ value }: { value: number }) {
  return (
    <div className="flex gap-1">
      {Array.from({ length: 5 }).map((_, index) => (
        <Star
          key={index}
          className={`w-4 h-4 ${
            index < value
              ? 'text-accent-400 fill-accent-400'
              : 'text-gray-700'
          }`}
        />
      ))}
    </div>
  );
}

export default function ReviewsModeration() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState('');

  const [filter, setFilter] = useState<
    'pending' | 'approved' | 'rejected' | 'all'
  >('pending');

  const loadReviews = useCallback(async () => {
    setLoading(true);
    setError('');

    let query = supabase
      .from('reviews')
      .select(
        'id, project_id, client_id, rating, comment, status, created_at, updated_at, reviewed_by, reviewed_at, rejection_reason, reviewer_name'
      )
      .order('created_at', { ascending: false });

    if (filter !== 'all') {
      query = query.eq('status', filter);
    }

    const { data, error: dbErr } = await query;

    if (dbErr) {
      console.error('Failed to load reviews:', dbErr);
      setError(
        'Failed to load reviews. Please refresh and try again.'
      );
      setReviews([]);
    } else {
      setReviews((data || []) as Review[]);
    }

    setLoading(false);
  }, [filter]);

  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  const moderateReview = async (
    review: Review,
    status: 'approved' | 'rejected'
  ) => {
    setActionLoading(review.id);
    setError('');

    const { error: dbErr } = await supabase.rpc('moderate_review', {
      p_review_id: review.id,
      p_status: status,
      p_rejection_reason:
        status === 'rejected'
          ? 'Review rejected by Avelixa administration.'
          : null,
    });

    if (dbErr) {
      console.error('Failed to moderate review:', dbErr);

      setError(
        status === 'approved'
          ? 'Failed to approve the review. Please try again.'
          : 'Failed to reject the review. Please try again.'
      );

      setActionLoading(null);
      return;
    }

    await loadReviews();
    setActionLoading(null);
  };

  const pendingCount = reviews.filter(
    (review) => review.status === 'pending'
  ).length;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-widest text-accent-400 mb-2">
            Website Reviews
          </div>

          <h1 className="text-3xl md:text-4xl font-display font-bold text-white">
            Review Moderation
          </h1>

          <p className="mt-2 text-sm text-gray-500 max-w-2xl">
            Review visitor feedback submitted through the public Avelixa
            website. Approve a review to publish it, or reject it to keep it
            off the website.
          </p>
        </div>

        <button
          type="button"
          onClick={loadReviews}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-ink-700 bg-white/5 px-4 py-2.5 text-sm font-medium text-gray-200 hover:bg-white/10 disabled:opacity-50"
        >
          <RefreshCw
            className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`}
          />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            key: 'pending',
            label: 'Pending',
            icon: Clock3,
          },
          {
            key: 'approved',
            label: 'Approved',
            icon: CheckCircle2,
          },
          {
            key: 'rejected',
            label: 'Rejected',
            icon: XCircle,
          },
          {
            key: 'all',
            label: 'All Reviews',
            icon: Star,
          },
        ].map((item) => {
          const count =
            item.key === 'all'
              ? reviews.length
              : reviews.filter(
                  (review) => review.status === item.key
                ).length;

          return (
            <button
              key={item.key}
              type="button"
              onClick={() =>
                setFilter(
                  item.key as
                    | 'pending'
                    | 'approved'
                    | 'rejected'
                    | 'all'
                )
              }
              className={`rounded-2xl border p-5 text-left transition-colors ${
                filter === item.key
                  ? 'border-accent-500/30 bg-accent-500/10'
                  : 'border-ink-800/60 bg-white/[0.03] hover:bg-white/[0.05]'
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <item.icon className="w-5 h-5 text-accent-400" />

                <span className="text-2xl font-semibold text-white">
                  {count}
                </span>
              </div>

              <div className="mt-3 text-xs font-bold uppercase tracking-widest text-gray-500">
                {item.label}
              </div>
            </button>
          );
        })}
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {filter === 'pending' &&
        pendingCount === 0 &&
        !loading &&
        !error && (
          <div className="rounded-3xl border border-emerald-500/20 bg-emerald-500/5 p-8 text-center">
            <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-3" />

            <h2 className="text-lg font-semibold text-white">
              No pending reviews
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              New website reviews will appear here when visitors submit
              them.
            </p>
          </div>
        )}

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((item) => (
            <div
              key={item}
              className="glass rounded-3xl p-6 animate-pulse"
            >
              <div className="h-4 w-28 rounded bg-white/10 mb-4" />
              <div className="h-4 w-3/4 rounded bg-white/10 mb-2" />
              <div className="h-4 w-1/2 rounded bg-white/5" />
            </div>
          ))}
        </div>
      ) : reviews.length > 0 ? (
        <div className="space-y-4">
          {reviews.map((review) => (
            <article
              key={review.id}
              className="glass rounded-3xl p-6 md:p-7"
            >
              <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-3">
                    <Stars value={review.rating || 0} />

                    <span
                      className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${
                        statusStyles[review.status || 'pending'] ||
                        statusStyles.pending
                      }`}
                    >
                      {review.status || 'pending'}
                    </span>
                  </div>

                  <div className="mt-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent-400 to-brand-500 flex items-center justify-center text-ink-950 font-semibold shrink-0">
                      {(review.reviewer_name || 'A')
                        .charAt(0)
                        .toUpperCase()}
                    </div>

                    <div>
                      <div className="font-semibold text-white">
                        {review.reviewer_name || 'Anonymous'}
                      </div>

                      <div className="text-xs text-gray-500">
                        {review.created_at
                          ? new Date(
                              review.created_at
                            ).toLocaleString('en-KE', {
                              dateStyle: 'medium',
                              timeStyle: 'short',
                            })
                          : 'Date unavailable'}
                      </div>
                    </div>
                  </div>

                  <p className="mt-5 text-gray-200 leading-relaxed whitespace-pre-wrap">
                    &quot;{review.comment || ''}&quot;
                  </p>

                  {review.status === 'rejected' &&
                    review.rejection_reason && (
                      <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3">
                        <div className="text-xs font-semibold uppercase tracking-widest text-red-300 mb-1">
                          Rejection reason
                        </div>

                        <p className="text-sm text-gray-400">
                          {review.rejection_reason}
                        </p>
                      </div>
                    )}
                </div>

                {review.status === 'pending' && (
                  <div className="flex shrink-0 gap-2 md:pt-1">
                    <button
                      type="button"
                      onClick={() =>
                        moderateReview(review, 'approved')
                      }
                      disabled={actionLoading === review.id}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500/15 border border-emerald-500/25 px-4 py-2.5 text-sm font-medium text-emerald-300 hover:bg-emerald-500/25 disabled:opacity-50"
                    >
                      <Check className="w-4 h-4" />
                      Approve
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        moderateReview(review, 'rejected')
                      }
                      disabled={actionLoading === review.id}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-2.5 text-sm font-medium text-red-300 hover:bg-red-500/20 disabled:opacity-50"
                    >
                      <X className="w-4 h-4" />
                      Reject
                    </button>
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="rounded-3xl border border-ink-800/60 bg-white/[0.03] p-10 text-center text-gray-500">
          <Star className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>No reviews found for this filter.</p>
        </div>
      )}
    </div>
  );
}