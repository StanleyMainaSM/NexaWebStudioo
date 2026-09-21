import { Link } from 'react-router-dom';
import {
  ArrowUpRight,
  MessageCircle,
  Zap,
  TrendingUp,
  ChevronDown,
  CheckCircle2,
  Briefcase,
  Star,
} from 'lucide-react';
import { DEFAULT_WA } from '../lib/constants';

const highlights = [
  'Professional, modern website',
  'Built to attract customers',
  'Mobile-first and fast',
  'Designed around your business goals',
];

export default function Home() {
  return (
    <section className="relative min-h-screen flex flex-col overflow-hidden page-tint">
      {/* Hero image banner */}
      <div className="relative w-full h-[30vh] min-h-[240px] overflow-hidden">
        <img
          src="https://images.pexels.com/photos/1181467/pexels-photo-1181467.jpeg?auto=compress&cs=tinysrgb&w=1600"
          alt="Professional web development workspace"
          className="w-full h-full object-cover"
        />
        <div className="hero-image-overlay absolute inset-0 bg-gradient-to-b from-ink-950/85 via-ink-950/65 to-ink-950" />
        <div className="absolute inset-0 grid-bg opacity-10" />
      </div>

      {/* Main content */}
      <div className="home-content relative flex-1 bg-ink-950">
        <div className="absolute top-0 -left-32 w-[500px] h-[500px] rounded-full bg-accent-500/15 blur-[120px] animate-pulse-glow" />
        <div
          className="absolute top-0 -right-32 w-[400px] h-[400px] rounded-full bg-brand-500/15 blur-[120px] animate-pulse-glow"
          style={{ animationDelay: '2s' }}
        />

        <div className="relative max-w-7xl mx-auto px-6 py-16 grid lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-ink-900 border border-ink-800 rounded-full text-[10px] uppercase tracking-[0.2em] text-accent-400 font-semibold mb-6">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              A professional web design & development agency
            </div>

            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-light leading-[1.1] tracking-tight text-white mb-6">
              Your Website Should
              <br className="hidden sm:block" />
              <span className="font-semibold italic text-accent-500">
                {' '}Bring You Customers.
              </span>
            </h1>

            <p className="text-lg text-gray-400 max-w-2xl leading-relaxed">
              Avelixa creates professional, modern websites for businesses in
              Kenya and beyond — helping you attract customers, build trust,
              and grow your business online.
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-4">
              <a
                href={DEFAULT_WA}
                target="_blank"
                rel="noreferrer"
                className="light-primary-button group inline-flex items-center gap-2.5 px-7 py-4 rounded-full bg-zinc-100 text-black hover:bg-accent-400 transition-colors uppercase tracking-widest text-sm font-medium"
              >
                <MessageCircle className="w-5 h-5" />
                Hire Avelixa
                <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </a>

              <Link
                to="/services"
                className="inline-flex items-center gap-2 px-7 py-4 rounded-full glass text-white hover:text-accent-400 transition-colors uppercase tracking-widest text-sm font-medium"
              >
                Explore Services
              </Link>
            </div>

            <div className="mt-10 grid sm:grid-cols-2 gap-3 max-w-xl">
              {highlights.map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-2.5 text-sm text-gray-400"
                >
                  <CheckCircle2 className="w-4 h-4 text-accent-400 flex-shrink-0" />
                  {item}
                </div>
              ))}
            </div>

            <div className="mt-12 flex flex-wrap items-center gap-6 sm:gap-8">
              <div>
                <div className="font-light text-3xl text-white">40+</div>
                <div className="text-xs font-bold text-ink-600 uppercase tracking-widest mt-1">
                  Projects shipped
                </div>
              </div>

              <div className="w-px h-12 bg-ink-800/50 hidden sm:block" />

              <div>
                <div className="font-light text-3xl text-white">100%</div>
                <div className="text-xs font-bold text-ink-600 uppercase tracking-widest mt-1">
                  Client focused
                </div>
              </div>

              <div className="w-px h-12 bg-ink-800/50 hidden sm:block" />

              <div>
                <div className="font-light text-3xl text-white">Kenya</div>
                <div className="text-xs font-bold text-ink-600 uppercase tracking-widest mt-1">
                  Based & serving businesses
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 relative hidden lg:block">
            <div className="relative animate-float">
              <div className="glass rounded-3xl overflow-hidden glow">
                <img
                  src="https://images.pexels.com/photos/196644/pexels-photo-196644.jpeg?auto=compress&cs=tinysrgb&w=700"
                  alt="Professional website displayed on a laptop"
                  className="w-full h-52 object-cover"
                />

                <div className="p-5 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-accent-400/20 flex items-center justify-center">
                      <Briefcase className="w-5 h-5 text-accent-400" />
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">
                        Business Website
                      </div>
                      <div className="font-display font-bold text-white">
                        Built for Growth
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="h-3 w-3/4 rounded-full bg-white/10" />
                    <div className="h-3 w-1/2 rounded-full bg-white/5" />
                  </div>

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
                    <div className="text-xs text-gray-500">Business Goal</div>
                    <div className="font-display font-bold text-white">
                      More Customers
                    </div>
                  </div>
                </div>
              </div>

              <div
                className="absolute -top-6 -left-6 glass rounded-2xl p-4 animate-float-slow"
                style={{ animationDelay: '1.5s' }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-accent-400/20 flex items-center justify-center">
                    <Zap className="w-5 h-5 text-accent-400" />
                  </div>

                  <div>
                    <div className="text-xs text-gray-500">Performance</div>
                    <div className="font-display font-bold text-white">
                      Fast & Responsive
                    </div>
                  </div>
                </div>
              </div>

              <div className="absolute top-1/2 -right-10 glass rounded-2xl p-4">
                <div className="flex items-center gap-3">
                  <Star className="w-5 h-5 text-accent-400 fill-accent-400" />
                  <div>
                    <div className="text-xs text-gray-500">Experience</div>
                    <div className="font-display font-bold text-white">
                      Professional
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Internal navigation / conversion journey */}
        <div className="relative max-w-7xl mx-auto px-6 pb-14">
          <div className="glass rounded-3xl p-6 sm:p-8">
            <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <Link to="/services" className="group rounded-2xl p-4 hover:bg-white/[0.05] transition-colors">
                <div className="text-xs uppercase tracking-widest text-accent-400 mb-2">01</div>
                <div className="font-semibold text-white group-hover:text-accent-400 transition-colors">Services</div>
                <div className="text-sm text-gray-500 mt-1">See what we build</div>
              </Link>
              <Link to="/work" className="group rounded-2xl p-4 hover:bg-white/[0.05] transition-colors">
                <div className="text-xs uppercase tracking-widest text-accent-400 mb-2">02</div>
                <div className="font-semibold text-white group-hover:text-accent-400 transition-colors">Our Work</div>
                <div className="text-sm text-gray-500 mt-1">See what we have delivered</div>
              </Link>
              <Link to="/pricing" className="group rounded-2xl p-4 hover:bg-white/[0.05] transition-colors">
                <div className="text-xs uppercase tracking-widest text-accent-400 mb-2">03</div>
                <div className="font-semibold text-white group-hover:text-accent-400 transition-colors">Pricing</div>
                <div className="text-sm text-gray-500 mt-1">Explore our packages</div>
              </Link>
              <Link to="/reviews" className="group rounded-2xl p-4 hover:bg-white/[0.05] transition-colors">
                <div className="text-xs uppercase tracking-widest text-accent-400 mb-2">04</div>
                <div className="font-semibold text-white group-hover:text-accent-400 transition-colors">Reviews</div>
                <div className="text-sm text-gray-500 mt-1">Hear from our clients</div>
              </Link>
              <Link to="/contact" className="group rounded-2xl p-4 bg-accent-400/10 hover:bg-accent-400/15 transition-colors">
                <div className="text-xs uppercase tracking-widest text-accent-400 mb-2">05</div>
                <div className="font-semibold text-white group-hover:text-accent-400 transition-colors">Hire Avelixa</div>
                <div className="text-sm text-gray-500 mt-1">Start your project</div>
              </Link>
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
              <span>React</span><span>•</span><span>Next.js</span><span>•</span><span>Tailwind CSS</span><span>•</span><span>SEO</span><span>•</span><span>Shopify</span><span>•</span><span>WordPress</span><span>•</span><span>UI / UX</span><span>•</span><span>TypeScript</span><span>•</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
