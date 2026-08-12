import { useState, useCallback, useEffect } from 'react';
import { Star, Check, AlertCircle, Send } from 'lucide-react';
import { supabase, type Testimonial } from '../lib/supabase';
import { useReveal } from '../lib/hooks';

const AUTO_COMMENTS: Record<number, string> = {
  4: "I'm in love with the work of this organization",
  5: 'Fast, Modern, Secure and reliable websites. Thanks.',
};

const STAR_LABELS: Record<number, string> = {
  1: 'Poor', 2: 'Fair', 3: 'Average', 4: 'Great', 5: 'Excellent',
};

function StarPicker({ value, onChange, disabled }: { value: number; onChange: (n: number) => void; disabled: boolean }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex gap-2">
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = n <= (hovered || value);
        return (
          <button key={n} type="button" disabled={disabled}
            onClick={() => onChange(n)} onMouseEnter={() => setHovered(n)} onMouseLeave={() => setHovered(0)}
            className="focus:outline-none disabled:cursor-not-allowed transition-transform hover:scale-110"
            aria-label={`${n} star${n !== 1 ? 's' : ''}`}>
            <Star className={`w-9 h-9 transition-colors ${filled ? 'text-accent-400 fill-accent-400' : 'text-gray-600'}`} />
          </button>
        );
      })}
    </div>
  );
}

function TestimonialForm({ onSubmitted }: { onSubmitted: (t: Testimonial) => void }) {
  const [stars, setStars] = useState(0);
  const [name, setName] = useState('');
  const [complaint, setComplaint] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const isLowRating = stars >= 1 && stars <= 3;
  const isHighRating = stars === 4 || stars === 5;
  const autoComment = isHighRating ? AUTO_COMMENTS[stars] : '';

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!stars) { setError('Please select a star rating.'); return; }
    if (!name.trim()) { setError('Please enter your name.'); return; }
    if (isLowRating && !complaint.trim()) { setError('Please describe the issue so we can improve.'); return; }

    const comment = isHighRating ? autoComment : complaint.trim();
    const is_public = isHighRating;

    setLoading(true);
    const { data, error: dbErr } = await supabase
      .from('testimonials').insert({ name: name.trim(), stars, comment, is_public })
      .select().maybeSingle();
    setLoading(false);
    if (dbErr) { setError('Something went wrong. Please try again.'); return; }
    setDone(true);
    if (data && is_public) onSubmitted(data as Testimonial);
  }, [stars, name, complaint, isHighRating, isLowRating, autoComment, onSubmitted]);

  if (done) {
    return (
      <div className="glass rounded-3xl p-10 text-center">
        <div className="w-16 h-16 rounded-full bg-accent-400/20 flex items-center justify-center mx-auto mb-5">
          <Check className="w-8 h-8 text-accent-400" strokeWidth={2.5} />
        </div>
        <h3 className="font-display font-bold text-2xl text-white mb-3">Thanks a lot for your comment.</h3>
        <p className="text-gray-300 text-lg">Wish you all the best with your new website.</p>
        <div className="mt-5 flex gap-1 justify-center">
          {Array.from({ length: stars }).map((_, i) => (
            <Star key={i} className="w-5 h-5 text-accent-400 fill-accent-400" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="glass rounded-3xl p-8">
      <h3 className="font-display font-bold text-2xl text-white mb-2">Leave a Review</h3>
      <p className="text-gray-400 text-sm mb-7">How was your experience with Avelixa?</p>
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-300 mb-3">Your Rating</label>
        <StarPicker value={stars} onChange={setStars} disabled={loading} />
        {stars > 0 && (
          <p className={`mt-2 text-sm font-medium ${stars >= 4 ? 'text-accent-400' : 'text-yellow-400'}`}>
            {STAR_LABELS[stars]}
          </p>
        )}
      </div>
      <div className="mb-5">
        <label className="block text-sm font-medium text-gray-300 mb-2">Your Name</label>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} disabled={loading}
          placeholder="e.g. Jane Mwangi"
          className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-accent-400/60 focus:bg-white/[0.07] transition-all disabled:opacity-50" />
      </div>
      {isHighRating && (
        <div className="mb-5">
          <label className="block text-sm font-medium text-gray-300 mb-2">Your Comment</label>
          <div className="w-full px-4 py-3 rounded-xl bg-accent-400/5 border border-accent-400/30 text-accent-200 text-sm leading-relaxed">
            "{autoComment}"
          </div>
          <p className="mt-1.5 text-xs text-gray-500">This message will be displayed publicly with your review.</p>
        </div>
      )}
      {isLowRating && (
        <div className="mb-5">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            We're sorry to hear that — what went wrong?
          </label>
          <textarea value={complaint} onChange={(e) => setComplaint(e.target.value)} disabled={loading} rows={4}
            placeholder="Please describe the issue so we can improve..."
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-yellow-400/60 focus:bg-white/[0.07] transition-all resize-none disabled:opacity-50" />
          <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
            <AlertCircle className="w-3.5 h-3.5" />
            Your feedback is private and will only be seen by our team.
          </div>
        </div>
      )}
      {error && (
        <div className="mb-5 flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
        </div>
      )}
      <button type="submit" disabled={loading || !stars}
        className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full bg-gradient-to-r from-accent-400 to-brand-500 text-ink-950 font-semibold hover:shadow-[0_0_30px_-5px_rgba(34,211,238,0.6)] transition-all disabled:opacity-50 disabled:cursor-not-allowed">
        {loading ? (
          <span className="flex items-center gap-2">
            <span className="w-4 h-4 border-2 border-ink-950/30 border-t-ink-950 rounded-full animate-spin" />
            Submitting...
          </span>
        ) : (
          <><Send className="w-4 h-4" /> Submit Review</>
        )}
      </button>
    </form>
  );
}

export default function Reviews() {
  useReveal();
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('testimonials').select('*')
        .eq('is_public', true).order('created_at', { ascending: false }).limit(9);
      if (data) setTestimonials(data as Testimonial[]);
      setLoading(false);
    })();
  }, []);

  const handleNewTestimonial = useCallback((t: Testimonial) => {
    setTestimonials((prev) => [t, ...prev]);
  }, []);

  return (
    <div className="relative pt-32 pb-28">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col lg:flex-row gap-16">
          <div className="lg:w-[420px] flex-shrink-0" data-reveal>
            <div className="text-xs font-semibold uppercase tracking-widest text-accent-400 mb-3">Share Your Experience</div>
            <h1 className="font-display font-bold text-4xl text-white tracking-tight mb-8">Rate our work</h1>
            <TestimonialForm onSubmitted={handleNewTestimonial} />
          </div>

          <div className="flex-1">
            <div className="text-xs font-semibold uppercase tracking-widest text-accent-400 mb-3" data-reveal>Client Reviews</div>
            <h2 className="font-display font-bold text-4xl text-white tracking-tight mb-8" data-reveal>What clients say</h2>
            {loading ? (
              <div className="grid sm:grid-cols-2 gap-5">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="glass rounded-2xl p-7 animate-pulse">
                    <div className="flex gap-1 mb-4">{[1,2,3,4,5].map((j) => <div key={j} className="w-4 h-4 rounded-full bg-white/10" />)}</div>
                    <div className="h-3 w-full rounded-full bg-white/10 mb-2" />
                    <div className="h-3 w-3/4 rounded-full bg-white/5 mb-6" />
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-full bg-white/10" />
                      <div><div className="h-3 w-20 rounded-full bg-white/10 mb-1" /><div className="h-2 w-16 rounded-full bg-white/5" /></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : testimonials.length === 0 ? (
              <div className="glass rounded-2xl p-12 text-center text-gray-500">
                <Star className="w-12 h-12 mx-auto mb-4 opacity-30" />
                <p>No reviews yet — be the first!</p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-5">
                {testimonials.map((t, i) => (
                  <div key={t.id} data-reveal style={{ transitionDelay: `${i * 60}ms` }} className="glass rounded-2xl p-7">
                    <div className="flex gap-1 mb-4">
                      {Array.from({ length: 5 }).map((_, j) => (
                        <Star key={j} className={`w-4 h-4 ${j < t.stars ? 'text-accent-400 fill-accent-400' : 'text-gray-700'}`} />
                      ))}
                    </div>
                    <p className="text-gray-200 leading-relaxed mb-5">"{t.comment}"</p>
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-full bg-gradient-to-br from-accent-400 to-brand-500 flex items-center justify-center text-ink-950 font-semibold text-lg flex-shrink-0">
                        {t.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-semibold text-white text-sm">{t.name}</div>
                        <div className="text-xs text-gray-500">
                          {new Date(t.created_at).toLocaleDateString('en-KE', { month: 'short', year: 'numeric' })}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
