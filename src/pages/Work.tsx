import { ArrowUpRight, ExternalLink, MessageCircle } from 'lucide-react';
import { DEFAULT_WA } from '../lib/constants';
import { useReveal } from '../lib/hooks';

const work = [
  {
    tag: 'Community', title: 'CFF Donholm',
    desc: 'A clean, welcoming community foundation website built to inform and engage visitors.',
    url: 'https://stanleymainasm.github.io/CFF-DONHOLM/',
    image: 'https://images.pexels.com/photos/1181244/pexels-photo-1181244.jpeg?auto=compress&cs=tinysrgb&w=800',
    real: true,
  },
  {
    tag: 'Creative', title: 'Happy Birthday Teddy',
    desc: "A delightful, animated birthday celebration page — fun, vibrant, and built to make someone's day special.",
    url: 'https://wize2007.github.io/happy-birthday-teddy/',
    image: 'https://images.pexels.com/photos/1323550/pexels-photo-1323550.jpeg?auto=compress&cs=tinysrgb&w=800',
    real: true,
  },
  {
    tag: 'Luxury Automotive', title: 'Luxury Auto',
    desc: 'A premium showcase website for a luxury automotive brand — sleek design, immersive galleries, and a refined user experience.',
    url: 'https://luxury-auto.ai.studio',
    image: 'https://images.pexels.com/photos/372946/pexels-photo-372946.jpeg?auto=compress&cs=tinysrgb&w=800',
    real: true,
  },
  {
    tag: 'Fashion', title: 'Suit & Wear',
    desc: 'An elegant e-commerce storefront for a menswear brand — tailored product pages, smooth checkout, and a sophisticated visual identity.',
    url: 'https://suit-and-wear-websit-0n7w.bolt.host',
    image: 'https://images.pexels.com/photos/2887544/pexels-photo-2887544.jpeg?auto=compress&cs=tinysrgb&w=800',
    real: true,
  },
  {
    tag: 'E-Commerce', title: 'Online Store',
    desc: 'High-converting product pages and seamless checkout flows that turn browsers into buyers.',
    url: DEFAULT_WA,
    image: 'https://images.pexels.com/photos/230544/pexels-photo-230544.jpeg?auto=compress&cs=tinysrgb&w=800',
    real: false,
  },
  {
    tag: 'Business', title: 'Corporate Website',
    desc: 'Professional sites that build trust, generate leads, and showcase your brand at its best.',
    url: DEFAULT_WA,
    image: 'https://images.pexels.com/photos/3184454/pexels-photo-3184454.jpeg?auto=compress&cs=tinysrgb&w=800',
    real: false,
  },
];

export default function Work() {
  useReveal();
  return (
    <div className="relative pt-32 pb-28">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-end justify-between flex-wrap gap-6 mb-14" data-reveal>
          <div className="max-w-2xl">
            <div className="text-xs font-semibold uppercase tracking-widest text-accent-400 mb-3">Selected Work</div>
            <h1 className="font-display font-bold text-4xl sm:text-5xl text-white tracking-tight">
              Real projects, real results
            </h1>
          </div>
          <a href={DEFAULT_WA} target="_blank" rel="noreferrer"
            className="inline-flex items-center gap-2 text-accent-400 hover:text-accent-300 font-medium">
            Start your project <ArrowUpRight className="w-4 h-4" />
          </a>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {work.map((w, i) => (
            <div key={w.title} data-reveal style={{ transitionDelay: `${i * 80}ms` }}
              className="group relative overflow-hidden rounded-3xl glass hover:-translate-y-1 transition-all duration-500">
              <div className="relative h-56 overflow-hidden">
                <img src={w.image} alt={w.title}
                  className="w-full h-full object-cover opacity-60 group-hover:opacity-80 group-hover:scale-105 transition-all duration-700" />
                <div className="absolute inset-0 bg-gradient-to-t from-ink-900 via-ink-900/40 to-transparent" />
                <div className="absolute top-4 left-4 flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full bg-ink-950/70 text-xs text-white border border-white/10 backdrop-blur">{w.tag}</span>
                  {w.real && <span className="px-3 py-1 rounded-full bg-accent-400/20 text-xs text-accent-300 border border-accent-400/30">Live Site</span>}
                </div>
              </div>
              <div className="p-7">
                <h3 className="font-display font-semibold text-2xl text-white mb-2">{w.title}</h3>
                <p className="text-gray-400 mb-5">{w.desc}</p>
                <a href={w.url} target="_blank" rel="noreferrer"
                  className="inline-flex items-center gap-2 text-accent-400 hover:text-accent-300 font-medium text-sm transition-colors">
                  {w.real
                    ? <><ExternalLink className="w-4 h-4" /> View Live Site</>
                    : <><MessageCircle className="w-4 h-4" /> Request Similar</>}
                </a>
              </div>
              <div className="absolute inset-0 rounded-3xl border border-accent-400/0 group-hover:border-accent-400/30 transition-colors pointer-events-none" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
