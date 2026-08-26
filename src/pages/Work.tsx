import { useEffect, useState } from 'react';
import {
  ArrowUpRight,
  ExternalLink,
  Loader2,
  MessageCircle,
  CheckCircle2,
} from 'lucide-react';

import { DEFAULT_WA } from '../lib/constants';
import { useReveal } from '../lib/hooks';
import { supabase } from '../lib/supabase';

type PortfolioItem = {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  image_alt: string | null;
  live_url: string | null;
  tags: string[] | null;
  category: string | null;
  is_featured: boolean | null;
  sort_order: number | null;
};

export default function Work() {
  useReveal();

  const [work, setWork] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const loadWork = async () => {
      const { data, error: dbError } = await supabase
        .from('portfolio_items')
        .select(
          `
            id,
            title,
            description,
            image_url,
            image_alt,
            live_url,
            tags,
            category,
            is_featured,
            sort_order
          `
        )
        .eq('is_published', true)
        .order('is_featured', {
          ascending: false,
        })
        .order('sort_order', {
          ascending: true,
        })
        .order('published_at', {
          ascending: false,
        });

      if (dbError) {
        console.error('Failed to load public portfolio:', dbError);
        setError(true);
        setWork([]);
      } else {
        setWork((data || []) as PortfolioItem[]);
      }

      setLoading(false);
    };

    void loadWork();
  }, []);

  return (
    <div className="relative pt-32 pb-28">
      <div className="max-w-7xl mx-auto px-6">
        <div
          className="flex items-end justify-between flex-wrap gap-6 mb-14"
          data-reveal
        >
          <div className="max-w-3xl">
            <div className="text-xs font-semibold uppercase tracking-widest text-accent-400 mb-3">
              Selected Work
            </div>

            <h1 className="font-display font-bold text-4xl sm:text-5xl text-white tracking-tight">
              Real projects. Real proof.
            </h1>

            <p className="mt-4 text-gray-400 leading-7 text-lg">
              Explore websites and digital experiences delivered by Avelixa.
              Every project represents our approach to professional design,
              practical development, and business-focused results.
            </p>
          </div>

          <a
            href={DEFAULT_WA}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 text-accent-400 hover:text-accent-300 font-medium"
          >
            Start your project
            <ArrowUpRight className="w-4 h-4" />
          </a>
        </div>

        <div
          className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-12"
          data-reveal
        >
          <div className="glass rounded-2xl p-5">
            <CheckCircle2 className="w-5 h-5 text-accent-400 mb-3" />
            <h2 className="font-semibold text-white mb-1">
              Professional presentation
            </h2>
            <p className="text-sm text-gray-400">
              Websites designed to make businesses look credible and
              established online.
            </p>
          </div>

          <div className="glass rounded-2xl p-5">
            <CheckCircle2 className="w-5 h-5 text-accent-400 mb-3" />
            <h2 className="font-semibold text-white mb-1">
              Customer-focused experiences
            </h2>
            <p className="text-sm text-gray-400">
              Clear layouts and calls to action that help visitors know what
              to do next.
            </p>
          </div>

          <div className="glass rounded-2xl p-5">
            <CheckCircle2 className="w-5 h-5 text-accent-400 mb-3" />
            <h2 className="font-semibold text-white mb-1">
              Built for modern devices
            </h2>
            <p className="text-sm text-gray-400">
              Responsive experiences designed for customers using phones,
              tablets, and computers.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="min-h-[360px] flex items-center justify-center">
            <div className="inline-flex items-center gap-3 text-sm text-gray-400">
              <Loader2 className="w-5 h-5 animate-spin text-accent-400" />
              Loading our work...
            </div>
          </div>
        ) : error ? (
          <div className="rounded-3xl glass p-10 text-center">
            <h2 className="font-display font-semibold text-2xl text-white">
              Our portfolio is temporarily unavailable
            </h2>

            <p className="mt-3 text-gray-400 max-w-xl mx-auto">
              Please try again shortly, or contact Avelixa to discuss a
              similar project.
            </p>

            <a
              href={DEFAULT_WA}
              target="_blank"
              rel="noreferrer"
              className="mt-6 inline-flex items-center gap-2 text-accent-400 hover:text-accent-300 font-medium"
            >
              <MessageCircle className="w-4 h-4" />
              Contact Avelixa
            </a>
          </div>
        ) : work.length === 0 ? (
          <div className="rounded-3xl glass p-10 text-center">
            <h2 className="font-display font-semibold text-2xl text-white">
              New work is on the way
            </h2>

            <p className="mt-3 text-gray-400 max-w-xl mx-auto">
              We are preparing our latest completed projects for publication.
              Start your own project with Avelixa today.
            </p>

            <a
              href={DEFAULT_WA}
              target="_blank"
              rel="noreferrer"
              className="mt-6 inline-flex items-center gap-2 text-accent-400 hover:text-accent-300 font-medium"
            >
              <MessageCircle className="w-4 h-4" />
              Start a project
            </a>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {work.map((item, index) => {
              const hasLiveSite = Boolean(item.live_url);

              const category =
                item.category ||
                item.tags?.[0] ||
                'Avelixa Project';

              return (
                <div
                  key={item.id}
                  data-reveal
                  style={{
                    transitionDelay: `${index * 80}ms`,
                  }}
                  className="group relative overflow-hidden rounded-3xl glass hover:-translate-y-1 transition-all duration-500"
                >
                  <div className="relative h-64 overflow-hidden bg-ink-900">
                    {item.image_url ? (
                      <img
                        src={item.image_url}
                        alt={item.image_alt || item.title}
                        className="w-full h-full object-cover opacity-60 group-hover:opacity-80 group-hover:scale-105 transition-all duration-700"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-600 text-sm">
                        Avelixa project
                      </div>
                    )}

                    <div className="absolute inset-0 bg-gradient-to-t from-ink-900 via-ink-900/30 to-transparent" />

                    <div className="absolute top-4 left-4 flex items-center gap-2 flex-wrap">
                      <span className="px-3 py-1 rounded-full bg-ink-950/70 text-xs text-white border border-white/10 backdrop-blur">
                        {category}
                      </span>

                      {item.is_featured && (
                        <span className="px-3 py-1 rounded-full bg-purple-500/20 text-xs text-purple-200 border border-purple-400/30">
                          Featured
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="p-7">
                    <h3 className="font-display font-semibold text-2xl text-white mb-2">
                      {item.title}
                    </h3>

                    <p className="text-gray-400 mb-5 leading-relaxed">
                      {item.description ||
                        'A professional digital experience delivered by Avelixa.'}
                    </p>

                    <div className="mb-6 pt-4 border-t border-white/5">
                      <div className="flex items-start gap-2 text-sm text-gray-400">
                        <CheckCircle2 className="w-4 h-4 text-accent-400 flex-shrink-0 mt-0.5" />
                        <span>
                          Demonstrates Avelixa's approach to professional
                          design, usability, and business-focused web
                          development.
                        </span>
                      </div>
                    </div>

                    {hasLiveSite ? (
                      <a
                        href={item.live_url || '#'}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 text-accent-400 hover:text-accent-300 font-medium text-sm transition-colors"
                      >
                        <ExternalLink className="w-4 h-4" />
                        View Live Site
                      </a>
                    ) : (
                      <a
                        href={DEFAULT_WA}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 text-accent-400 hover:text-accent-300 font-medium text-sm transition-colors"
                      >
                        <MessageCircle className="w-4 h-4" />
                        Request Similar
                      </a>
                    )}
                  </div>

                  <div className="absolute inset-0 rounded-3xl border border-accent-400/0 group-hover:border-accent-400/30 transition-colors pointer-events-none" />
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-16 rounded-3xl glass p-8 sm:p-10 text-center" data-reveal>
          <div className="text-xs uppercase tracking-widest text-accent-400 mb-3">
            Your business could be next
          </div>

          <h2 className="font-display font-bold text-3xl sm:text-4xl text-white">
            Want a website like these?
          </h2>

          <p className="mt-4 text-gray-400 max-w-2xl mx-auto leading-relaxed">
            Tell Avelixa what your business needs and we will help you choose
            the right approach, package, and next step.
          </p>

          <div className="mt-7 flex flex-wrap justify-center gap-4">
            <a
              href={DEFAULT_WA}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-7 py-4 rounded-full bg-gradient-to-r from-accent-400 to-brand-500 text-ink-950 font-semibold"
            >
              <MessageCircle className="w-5 h-5" />
              Hire Avelixa
            </a>

            <a
              href="/pricing"
              className="inline-flex items-center gap-2 px-7 py-4 rounded-full glass text-white hover:text-accent-400 transition-colors"
            >
              View Pricing
              <ArrowUpRight className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}