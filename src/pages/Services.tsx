import { Link } from 'react-router-dom';
import { Code2, PenTool, Smartphone, Search, ShoppingCart, Zap, ArrowUpRight } from 'lucide-react';
import { useReveal } from '../lib/hooks';

const services = [
  { icon: Code2, title: 'Web Development', desc: 'Hand-coded, lightning-fast sites built with React, Next.js & modern tooling.' },
  { icon: PenTool, title: 'UI / UX Design', desc: 'Interfaces designed to convert — clean, modern, and obsessed with the details.' },
  { icon: Smartphone, title: 'Responsive Design', desc: 'Pixel-perfect on every device. Mobile-first, because that\'s where your customers are.' },
  { icon: Search, title: 'SEO Optimization', desc: 'Technical SEO that gets you found on Google and outranks your competitors.' },
  { icon: ShoppingCart, title: 'E-Commerce', desc: 'Online stores that sell — Shopify, custom carts, and everything in between.' },
  { icon: Zap, title: 'Performance', desc: 'Sub-second load times, perfect Lighthouse scores, and happier visitors.' },
];

export default function Services() {
  useReveal();
  return (
    <div className="relative pt-32 pb-28">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <img src="https://images.pexels.com/photos/574071/pexels-photo-574071.jpeg?auto=compress&cs=tinysrgb&w=1600"
          alt="" className="w-full h-full object-cover opacity-[0.03]" />
      </div>
      <div className="relative max-w-7xl mx-auto px-6">
        <div className="max-w-2xl mb-16" data-reveal>
          <div className="text-xs font-semibold uppercase tracking-widest text-accent-400 mb-3">What I Do</div>
          <h1 className="font-display font-bold text-4xl sm:text-5xl text-white tracking-tight">
            Services built to grow your business
          </h1>
          <p className="mt-4 text-gray-400 text-lg">
            Every project is engineered around one goal — turning your website into a customer-generating machine.
          </p>
        </div>

        <div className="mb-10 rounded-3xl overflow-hidden h-48 relative" data-reveal>
          <img src="https://images.pexels.com/photos/1181676/pexels-photo-1181676.jpeg?auto=compress&cs=tinysrgb&w=1600"
            alt="Developer at work" className="w-full h-full object-cover opacity-40" />
          <div className="absolute inset-0 bg-gradient-to-r from-ink-950 via-transparent to-ink-950" />
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="font-display font-bold text-2xl sm:text-3xl text-white text-center px-4">
              Clean Code. Beautiful Design. Real Results.
            </p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {services.map((s, i) => (
            <div key={s.title} data-reveal style={{ transitionDelay: `${i * 60}ms` }}
              className="group glass rounded-2xl p-7 hover:bg-white/[0.07] hover:-translate-y-1 transition-all duration-300">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent-400/20 to-brand-500/20 border border-white/10 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <s.icon className="w-6 h-6 text-accent-300" />
              </div>
              <h3 className="font-display font-semibold text-xl text-white mb-2">{s.title}</h3>
              <p className="text-gray-400 leading-relaxed">{s.desc}</p>
              <Link to="/contact" className="mt-5 flex items-center gap-1.5 text-accent-400 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                Get a quote <ArrowUpRight className="w-4 h-4" />
              </Link>
            </div>
          ))}
        </div>

        <div className="mt-14 text-center" data-reveal>
          <Link to="/pricing"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-gradient-to-r from-accent-400 to-brand-500 text-ink-950 font-semibold hover:shadow-[0_0_30px_-5px_rgba(34,211,238,0.6)] transition-all">
            View Pricing <ArrowUpRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
