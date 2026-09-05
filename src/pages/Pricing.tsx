import { useEffect, useState } from 'react';
import { MessageCircle, Check, ArrowUpRight, Star, AlertTriangle, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { waLink } from '../lib/constants';
import { useReveal } from '../lib/hooks';
import { supabase } from '../lib/supabase';

interface WebsitePackage {
  id: string;
  name: string;
  description: string | null;
  features: unknown;
  min_price: number | string | null;
  max_price: number | string | null;
  is_active: boolean;
}

function normalizeFeatures(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((feature): feature is string => typeof feature === 'string' && feature.trim().length > 0);
}

function formatPrice(pkg: WebsitePackage) {
  const min = pkg.min_price === null ? null : Number(pkg.min_price);
  const max = pkg.max_price === null ? null : Number(pkg.max_price);

  if (min !== null && max !== null) {
    if (min === max) {
      return `KSh ${min.toLocaleString('en-KE')}`;
    }

    return `KSh ${min.toLocaleString('en-KE')}–${max.toLocaleString('en-KE')}`;
  }

  if (min !== null) {
    return `From KSh ${min.toLocaleString('en-KE')}`;
  }

  if (max !== null) {
    return `Up to KSh ${max.toLocaleString('en-KE')}`;
  }

  return 'Let’s discuss';
}

export default function Pricing() {
  useReveal();

  const [packages, setPackages] = useState<WebsitePackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadPackages = async () => {
      setLoading(true);
      setError(null);

      const { data, error: queryError } = await supabase
        .from('packages')
        .select('id,name,description,features,min_price,max_price,is_active')
        .eq('is_active', true)
        .order('created_at', { ascending: true });

      if (!mounted) {
        return;
      }

      if (queryError) {
        console.error('Public website packages could not be loaded:', queryError);
        setError('Our package pricing is temporarily unavailable. Please contact Avelixa for a current quote.');
        setPackages([]);
      } else {
        setPackages((data || []) as WebsitePackage[]);
      }

      setLoading(false);
    };

    void loadPackages();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="relative pt-32 pb-28">
      <div className="max-w-7xl mx-auto px-6">
        <div className="max-w-3xl mx-auto text-center mb-8" data-reveal>
          <div className="text-xs font-semibold uppercase tracking-widest text-accent-400 mb-3">
            Website Design Pricing in Kenya
          </div>

          <h1 className="font-display font-bold text-4xl sm:text-5xl text-white tracking-tight">
            Professional websites at clear starting prices
          </h1>

          <p className="mt-5 text-gray-400 text-lg leading-relaxed">
            Choose a starting package based on what your business needs.
            Every Avelixa project is discussed individually so the final scope
            and price match your requirements.
          </p>
        </div>

        <div className="max-w-2xl mx-auto mb-12" data-reveal>
          <div className="glass rounded-2xl p-5 flex items-start gap-3 border border-accent-400/20">
            <MessageCircle className="w-5 h-5 text-accent-400 flex-shrink-0 mt-0.5" />

            <div>
              <p className="text-sm text-gray-300">
                <strong className="text-white">
                  Not sure which package you need?
                </strong>{' '}
                Message Avelixa. We will discuss your business, your goals, and
                the features you need before agreeing on the final scope and
                price.
              </p>

              <a
                href={waLink(
                  "Hi Avelixa! I'd like to discuss a website for my business and find out which package would be best for me."
                )}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex items-center gap-1.5 text-accent-400 text-sm font-medium"
              >
                Discuss your project on WhatsApp
                <ArrowUpRight className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>

        {loading && (
          <div className="flex items-center justify-center gap-3 py-20 text-gray-400" role="status">
            <Loader2 className="w-5 h-5 animate-spin text-accent-400" />
            Loading current packages…
          </div>
        )}

        {!loading && error && (
          <div className="max-w-2xl mx-auto mb-10 rounded-2xl border border-amber-500/20 bg-amber-500/10 px-5 py-4 text-sm text-amber-200 flex items-start gap-3" role="alert">
            <AlertTriangle className="w-5 h-5 shrink-0 text-amber-300" />
            <span>{error}</span>
          </div>
        )}

        {!loading && !error && packages.length > 0 && (
          <div className="grid md:grid-cols-3 gap-6">
            {packages.map((pkg, i) => {
              const features = normalizeFeatures(pkg.features);
              const highlighted = i === 1;
              const price = formatPrice(pkg);

              return (
                <div
                  key={pkg.id}
                  data-reveal
                  style={{ transitionDelay: `${i * 80}ms` }}
                  className={`relative rounded-3xl p-8 ${
                    highlighted
                      ? 'bg-gradient-to-b from-accent-500/10 to-brand-500/5 border border-accent-400/40 glow'
                      : 'glass'
                  }`}
                >
                  {highlighted && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-accent-400 to-brand-500 text-ink-950 text-xs font-semibold whitespace-nowrap flex items-center gap-1.5">
                      <Star className="w-3 h-3 fill-current" />
                      Best for Growing Businesses
                    </div>
                  )}

                  <h3 className="font-display font-semibold text-2xl text-white">
                    {pkg.name}
                  </h3>

                  <p className="text-gray-400 text-sm mt-2 mb-6 leading-relaxed">
                    {pkg.description || 'A flexible Avelixa website package tailored to your business requirements.'}
                  </p>

                  <div className="mb-1">
                    <span className="font-display font-extrabold text-3xl sm:text-4xl text-white">
                      {price}
                    </span>
                  </div>

                  <p className="text-xs text-accent-400 mb-6 italic">
                    Starting scope — final quote depends on requirements
                  </p>

                  {features.length > 0 && (
                    <ul className="space-y-3 mb-8">
                      {features.map((feature) => (
                        <li
                          key={feature}
                          className="flex items-start gap-3 text-gray-300 text-sm"
                        >
                          <div className="mt-0.5 w-5 h-5 rounded-full bg-accent-400/20 flex items-center justify-center flex-shrink-0">
                            <Check
                              className="w-3 h-3 text-accent-300"
                              strokeWidth={3}
                            />
                          </div>

                          {feature}
                        </li>
                      ))}
                    </ul>
                  )}

                  <a
                    href={waLink(
                      `Hi Avelixa! I'm interested in the ${pkg.name} website package (${price}). I'd like to discuss my business and get a custom quote.`
                    )}
                    target="_blank"
                    rel="noreferrer"
                    className={`w-full inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-full font-semibold transition-all ${
                      highlighted
                        ? 'bg-gradient-to-r from-accent-400 to-brand-500 text-ink-950 hover:shadow-[0_0_30px_-5px_rgba(34,211,238,0.6)]'
                        : 'glass text-white hover:bg-white/10'
                    }`}
                  >
                    <MessageCircle className="w-4 h-4" />
                    Discuss This Package
                  </a>
                </div>
              );
            })}
          </div>
        )}

        {!loading && !error && packages.length === 0 && (
          <div className="max-w-2xl mx-auto rounded-2xl border border-white/10 glass p-8 text-center text-gray-400">
            Current packages are being updated. Please contact Avelixa for a current quote.
          </div>
        )}

        <div className="mt-14 grid sm:grid-cols-3 gap-4" data-reveal>
          <div className="glass rounded-2xl p-6 text-center">
            <div className="text-accent-400 text-sm font-semibold mb-2">
              Clear scope
            </div>
            <p className="text-sm text-gray-400">
              We agree on what is being built before development begins.
            </p>
          </div>

          <div className="glass rounded-2xl p-6 text-center">
            <div className="text-accent-400 text-sm font-semibold mb-2">
              Business focused
            </div>
            <p className="text-sm text-gray-400">
              The website is designed around your customers and business
              objectives.
            </p>
          </div>

          <div className="glass rounded-2xl p-6 text-center">
            <div className="text-accent-400 text-sm font-semibold mb-2">
              Direct communication
            </div>
            <p className="text-sm text-gray-400">
              Discuss your project directly with Avelixa through WhatsApp.
            </p>
          </div>
        </div>

        <div className="mt-14 text-center" data-reveal>
          <p className="text-gray-400 mb-4">
            Want to see what Avelixa can build?
          </p>

          <div className="flex flex-wrap justify-center gap-4">
            <Link
              to="/work"
              className="inline-flex items-center gap-2 text-accent-400 hover:text-accent-300 font-medium"
            >
              View our work
              <ArrowUpRight className="w-4 h-4" />
            </Link>

            <Link
              to="/contact"
              className="inline-flex items-center gap-2 text-accent-400 hover:text-accent-300 font-medium"
            >
              Contact Avelixa
              <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
