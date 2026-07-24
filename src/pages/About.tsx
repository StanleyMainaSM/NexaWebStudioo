import { MessageCircle, Star } from 'lucide-react';
import { DEFAULT_WA } from '../lib/constants';
import { useReveal } from '../lib/hooks';

export default function About() {
  useReveal();
  return (
    <div className="relative pt-32 pb-28">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div className="relative" data-reveal>
            <div className="relative rounded-3xl overflow-hidden">
              <img src="/images/profile.jpg" alt="Nexa Web Studio profile"
                className="w-full h-[520px] object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-ink-950/60 to-transparent" />
            </div>
            <div className="absolute -bottom-6 -right-6 glass rounded-2xl p-5 glow">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-accent-400/20 flex items-center justify-center">
                  <Star className="w-5 h-5 text-accent-400 fill-accent-400" />
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-0.5">Client Rating</div>
                  <div className="flex gap-0.5">
                    {Array.from({ length: 5 }).map((_, j) => (
                      <Star key={j} className="w-3.5 h-3.5 text-accent-400 fill-accent-400" />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div data-reveal style={{ transitionDelay: '120ms' }}>
            <div className="text-xs font-semibold uppercase tracking-widest text-accent-400 mb-4">About Me</div>
            <h1 className="font-display font-bold text-4xl sm:text-5xl text-white tracking-tight mb-6">
              The person behind every pixel
            </h1>
            <p className="text-gray-300 text-lg leading-relaxed mb-5">
              I'm the founder of Nexa Web Studio — a web developer passionate about building
              beautiful, high-performance websites that actually move the needle for businesses.
            </p>
            <p className="text-gray-400 leading-relaxed mb-8">
              Whether you need a brand-new site, a redesign, or an online store, I handle
              everything from design concept to final launch. I communicate directly on WhatsApp,
              so you always know what's happening with your project.
            </p>
            <div className="grid grid-cols-2 gap-4 mb-8">
              {[
                { label: 'Fast turnaround', sub: '7–30 days' },
                { label: 'Direct communication', sub: 'WhatsApp always open' },
                { label: 'Clean code', sub: 'Maintained & scalable' },
                { label: 'Affordable', sub: 'Competitive KES pricing' },
              ].map((f) => (
                <div key={f.label} className="glass rounded-xl p-4">
                  <div className="w-2 h-2 rounded-full bg-accent-400 mb-2" />
                  <div className="font-semibold text-white text-sm">{f.label}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{f.sub}</div>
                </div>
              ))}
            </div>
            <a href={DEFAULT_WA} target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-2.5 px-7 py-4 rounded-full bg-gradient-to-r from-accent-400 to-brand-500 text-ink-950 font-semibold hover:shadow-[0_0_40px_-5px_rgba(34,211,238,0.6)] transition-all">
              <MessageCircle className="w-5 h-5" />
              Let's Work Together
            </a>
          </div>
        </div>

        {/* Process section */}
        <div className="mt-28">
          <div className="grid lg:grid-cols-5 gap-16 items-center">
            <div className="lg:col-span-2" data-reveal>
              <div className="text-xs font-semibold uppercase tracking-widest text-accent-400 mb-3">How It Works</div>
              <h2 className="font-display font-bold text-4xl sm:text-5xl text-white tracking-tight mb-5">
                A simple, transparent process
              </h2>
              <p className="text-gray-400 leading-relaxed">
                No confusing back-and-forths. Just a clear path from idea to live website, with you informed every step of the way.
              </p>
            </div>
            <div className="lg:col-span-3 grid sm:grid-cols-2 gap-5">
              {[
                { n: '01', title: 'Discovery', desc: 'We chat on WhatsApp about your business, goals, and target customers.' },
                { n: '02', title: 'Design', desc: 'I craft a custom design and iterate until you love every pixel.' },
                { n: '03', title: 'Build', desc: 'Pixel-perfect, fast, responsive development from scratch.' },
                { n: '04', title: 'Launch', desc: 'We go live, monitor performance, and optimize for conversions.' },
              ].map((s, i) => (
                <div key={s.n} data-reveal style={{ transitionDelay: `${i * 80}ms` }}
                  className="glass rounded-2xl p-7">
                  <div className="font-display font-extrabold text-5xl text-white/10 mb-3">{s.n}</div>
                  <h3 className="font-display font-semibold text-xl text-white mb-2">{s.title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
