import { Link } from 'react-router-dom';
import { ArrowUpRight, MessageCircle, Zap, TrendingUp, ChevronDown } from 'lucide-react';
import { DEFAULT_WA } from '../lib/constants';

export default function Home() {
  return (
    <section className="relative min-h-screen flex flex-col overflow-hidden">
      {/* Hero image banner */}
      <div className="relative w-full h-[55vh] min-h-[340px] overflow-hidden">
        <img
          src="https://images.pexels.com/photos/1181467/pexels-photo-1181467.jpeg?auto=compress&cs=tinysrgb&w=1600"
          alt="Web development workspace"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-ink-950/60 via-ink-950/40 to-ink-950" />
        <div className="absolute inset-0 grid-bg opacity-20" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center px-6">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass text-xs text-accent-300 mb-4">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Available for new projects — 2026
            </div>
            <div className="font-display font-extrabold text-3xl sm:text-4xl md:text-5xl text-white tracking-tight drop-shadow-lg">
              Modern Websites. Real Results.
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="relative flex-1 bg-ink-950">
        <div className="absolute top-0 -left-32 w-[500px] h-[500px] rounded-full bg-accent-500/15 blur-[120px] animate-pulse-glow" />
        <div className="absolute top-0 -right-32 w-[400px] h-[400px] rounded-full bg-brand-500/15 blur-[120px] animate-pulse-glow" style={{ animationDelay: '2s' }} />

        <div className="relative max-w-7xl mx-auto px-6 py-16 grid lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7">
            <h1 className="font-display font-extrabold text-5xl sm:text-6xl lg:text-7xl leading-[1.05] tracking-tight text-white">
              Do You Want a Website That{' '}
              <span className="text-gradient">Gets You More Customers?</span>
            </h1>
            <p className="mt-7 text-lg text-gray-400 max-w-xl leading-relaxed">
              Nexa Web Studio builds fast, modern, conversion-focused websites that turn
              visitors into paying customers — design that commands attention, code that performs.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-4">
              <a href={DEFAULT_WA} target="_blank" rel="noreferrer"
                className="group inline-flex items-center gap-2.5 px-7 py-4 rounded-full bg-gradient-to-r from-accent-400 to-brand-500 text-ink-950 font-semibold hover:shadow-[0_0_40px_-5px_rgba(34,211,238,0.7)] transition-all">
                <MessageCircle className="w-5 h-5" />
                Message Me on WhatsApp
                <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </a>
              <Link to="/work"
                className="inline-flex items-center gap-2 px-7 py-4 rounded-full glass text-white font-medium hover:bg-white/10 transition-colors">
                View My Work
              </Link>
            </div>
            <div className="mt-12 flex items-center gap-8">
              {[
                { val: '40+', label: 'Projects shipped' },
                { val: '3.2x', label: 'Avg. conversion lift' },
                { val: '100%', label: 'Client satisfaction' },
              ].map((s, i) => (
                <div key={i} className="flex items-center gap-8">
                  {i !== 0 && <div className="w-px h-12 bg-white/10" />}
                  <div>
                    <div className="font-display font-bold text-3xl text-white">{s.val}</div>
                    <div className="text-sm text-gray-500">{s.label}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-5 relative hidden lg:block">
            <div className="relative animate-float">
              <div className="glass rounded-3xl overflow-hidden glow">
                <img
                  src="https://images.pexels.com/photos/196644/pexels-photo-196644.jpeg?auto=compress&cs=tinysrgb&w=700"
                  alt="Web design on laptop"
                  className="w-full h-52 object-cover opacity-70"
                />
                <div className="p-5 space-y-3">
                  <div className="h-3 w-3/4 rounded-full bg-white/10" />
                  <div className="h-3 w-1/2 rounded-full bg-white/5" />
                  <div className="flex gap-2 pt-1">
                    <div className="h-8 w-24 rounded-full bg-accent-400/80" />
                    <div className="h-8 w-20 rounded-full bg-white/5" />
                  </div>
                </div>
              </div>
              <div className="absolute -bottom-6 -right-6 glass rounded-2xl p-4 animate-float-slow">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-400/20 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Conversion</div>
                    <div className="font-display font-bold text-white">+218%</div>
                  </div>
                </div>
              </div>
              <div className="absolute -top-6 -left-6 glass rounded-2xl p-4 animate-float-slow" style={{ animationDelay: '1.5s' }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-accent-400/20 flex items-center justify-center">
                    <Zap className="w-5 h-5 text-accent-400" />
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">PageSpeed</div>
                    <div className="font-display font-bold text-white">98/100</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-center pb-8">
          <Link to="/services" className="flex flex-col items-center gap-1 text-gray-600 hover:text-accent-400 transition-colors text-xs">
            <span>Explore services</span>
            <ChevronDown className="w-4 h-4 animate-bounce" />
          </Link>
        </div>
      </div>

      {/* Tech ticker */}
      <div className="overflow-hidden border-y border-white/5 bg-ink-900/40 py-4">
        <div className="flex gap-12 animate-marquee whitespace-nowrap font-display font-semibold text-gray-500 text-sm uppercase tracking-widest">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="flex gap-12">
              <span>React</span><span>•</span>
              <span>Next.js</span><span>•</span>
              <span>Tailwind CSS</span><span>•</span>
              <span>SEO</span><span>•</span>
              <span>Shopify</span><span>•</span>
              <span>WordPress</span><span>•</span>
              <span>UI / UX</span><span>•</span>
              <span>TypeScript</span><span>•</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
