import { Link } from 'react-router-dom';
import {
  Code2,
  PenTool,
  Smartphone,
  Search,
  ShoppingCart,
  Zap,
  ArrowUpRight,
  CheckCircle2,
} from 'lucide-react';
import { useReveal } from '../lib/hooks';

const services = [
  {
    icon: Code2,
    title: 'Web Development',
    desc: 'Professional websites built around your business, your customers, and the actions you want visitors to take.',
    outcome: 'Give your business a strong digital presence that works for you.',
  },
  {
    icon: PenTool,
    title: 'UI / UX Design',
    desc: 'Clean, modern interfaces that make your business look credible and make it easier for customers to take action.',
    outcome: 'Build trust and turn more visitors into enquiries.',
  },
  {
    icon: Smartphone,
    title: 'Responsive Design',
    desc: 'Websites designed to work smoothly across phones, tablets, laptops, and desktop screens.',
    outcome: 'Give every customer a professional experience on every device.',
  },
  {
    icon: Search,
    title: 'SEO Optimization',
    desc: 'Search-friendly website structure and on-page optimization designed to help your business become easier to discover.',
    outcome: 'Increase your chances of being found by people searching for your services.',
  },
  {
    icon: ShoppingCart,
    title: 'E-Commerce',
    desc: 'Online stores and shopping experiences designed around your products, customers, and sales process.',
    outcome: 'Turn your website into another channel for generating sales.',
  },
  {
    icon: Zap,
    title: 'Website Performance',
    desc: 'Fast, efficient websites optimized for speed, usability, and a smoother customer experience.',
    outcome: 'Keep visitors engaged instead of losing them to a slow website.',
  },
];

export default function Services() {
  useReveal();

  return (
    <div className="relative pt-32 pb-28">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <img
          src="https://images.pexels.com/photos/574071/pexels-photo-574071.jpeg?auto=compress&cs=tinysrgb&w=1600"
          alt=""
          className="w-full h-full object-cover opacity-[0.03]"
        />
      </div>

      <div className="relative max-w-7xl mx-auto px-6">
        <div className="max-w-3xl mb-16" data-reveal>
          <div className="text-xs font-semibold uppercase tracking-widest text-accent-400 mb-3">
            What Avelixa Does
          </div>

          <h1 className="font-display font-bold text-4xl sm:text-5xl text-white tracking-tight">
            Websites built to help your business grow
          </h1>

          <p className="mt-5 text-gray-400 text-lg leading-relaxed">
            Avelixa combines professional design, development, performance,
            and strategy to create websites that do more than look good.
            They help businesses attract attention, build trust, and generate
            opportunities.
          </p>
        </div>

        <div className="mb-10 rounded-3xl overflow-hidden h-48 relative" data-reveal>
          <img
            src="https://images.pexels.com/photos/1181676/pexels-photo-1181676.jpeg?auto=compress&cs=tinysrgb&w=1600"
            alt="Developer working on a professional website"
            className="w-full h-full object-cover opacity-40"
          />

          <div className="absolute inset-0 bg-gradient-to-r from-ink-950 via-transparent to-ink-950" />

          <div className="absolute inset-0 flex items-center justify-center">
            <p className="font-display font-bold text-2xl sm:text-3xl text-white text-center px-4">
              Professional Website. Stronger Presence. More Opportunities.
            </p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {services.map((s, i) => (
            <div
              key={s.title}
              data-reveal
              style={{ transitionDelay: `${i * 60}ms` }}
              className="group glass rounded-2xl p-7 hover:bg-white/[0.07] hover:-translate-y-1 transition-all duration-300"
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent-400/20 to-brand-500/20 border border-white/10 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <s.icon className="w-6 h-6 text-accent-300" />
              </div>

              <h3 className="font-display font-semibold text-xl text-white mb-2">
                {s.title}
              </h3>

              <p className="text-gray-400 leading-relaxed">
                {s.desc}
              </p>

              <div className="mt-5 pt-5 border-t border-white/5">
                <div className="flex items-start gap-2 text-sm text-gray-300">
                  <CheckCircle2 className="w-4 h-4 text-accent-400 flex-shrink-0 mt-0.5" />
                  <span>{s.outcome}</span>
                </div>
              </div>

              <Link
                to="/contact"
                className="mt-5 inline-flex items-center gap-1.5 text-accent-400 text-sm font-medium group-hover:text-accent-300 transition-colors"
              >
                Discuss this service
                <ArrowUpRight className="w-4 h-4" />
              </Link>
            </div>
          ))}
        </div>

        <div className="mt-16 grid lg:grid-cols-3 gap-5" data-reveal>
          <div className="glass rounded-2xl p-7">
            <div className="text-xs uppercase tracking-widest text-accent-400 mb-3">
              Step 01
            </div>
            <h3 className="font-display font-semibold text-xl text-white mb-2">
              Understand your business
            </h3>
            <p className="text-gray-400 leading-relaxed">
              We first understand what you do, who your customers are, and
              what you want the website to achieve.
            </p>
          </div>

          <div className="glass rounded-2xl p-7">
            <div className="text-xs uppercase tracking-widest text-accent-400 mb-3">
              Step 02
            </div>
            <h3 className="font-display font-semibold text-xl text-white mb-2">
              Build the right experience
            </h3>
            <p className="text-gray-400 leading-relaxed">
              Design and development are shaped around your business rather
              than using a one-size-fits-all approach.
            </p>
          </div>

          <div className="glass rounded-2xl p-7">
            <div className="text-xs uppercase tracking-widest text-accent-400 mb-3">
              Step 03
            </div>
            <h3 className="font-display font-semibold text-xl text-white mb-2">
              Turn visitors into opportunities
            </h3>
            <p className="text-gray-400 leading-relaxed">
              Your finished website gives customers a clearer reason to trust
              your business and take the next step.
            </p>
          </div>
        </div>

        <div className="mt-14 text-center" data-reveal>
          <p className="text-gray-400 mb-5">
            Ready to build a website for your business?
          </p>

          <div className="flex flex-wrap justify-center gap-4">
            <Link
              to="/pricing"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-gradient-to-r from-accent-400 to-brand-500 text-ink-950 font-semibold hover:shadow-[0_0_30px_-5px_rgba(34,211,238,0.6)] transition-all"
            >
              View Pricing
              <ArrowUpRight className="w-4 h-4" />
            </Link>

            <Link
              to="/contact"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-full glass text-white hover:text-accent-400 transition-colors"
            >
              Hire Avelixa
              <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}