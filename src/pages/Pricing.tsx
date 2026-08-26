import { MessageCircle, Check, ArrowUpRight, Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import { waLink } from '../lib/constants';
import { useReveal } from '../lib/hooks';

const tiers = [
  {
    name: 'Basic',
    price: 'KSh 15,000–20,000',
    desc: 'A professional website for individuals, startups, and small businesses ready to establish a strong online presence.',
    features: [
      'Professional custom website',
      'Up to 5 pages',
      'Mobile-responsive design',
      'Basic on-page SEO',
      'Contact / enquiry form',
      'WhatsApp integration',
      '2 revision rounds',
      'Launch support',
    ],
    highlighted: false,
  },
  {
    name: 'Standard',
    price: 'KSh 30,000–35,000',
    desc: 'Our stronger business package for growing businesses that need a polished website with more features and optimization.',
    features: [
      'Everything in Basic',
      'Up to 12 pages',
      'Premium UI/UX design',
      'Advanced SEO setup',
      'CMS / blog integration',
      'Google Analytics',
      'Performance optimization',
      'More advanced functionality',
      'Ongoing refinement during development',
    ],
    highlighted: true,
  },
  {
    name: 'Custom',
    price: 'Let’s discuss',
    desc: 'Tailored solutions for businesses that need e-commerce, booking systems, custom integrations, or more advanced functionality.',
    features: [
      'Custom page structure',
      'E-commerce / online shop',
      'Custom features & integrations',
      'Booking / reservation systems',
      'API integrations',
      'Advanced business workflows',
      'Ongoing support options',
      'Priority development available',
    ],
    highlighted: false,
  },
];

export default function Pricing() {
  useReveal();

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

        <div className="grid md:grid-cols-3 gap-6">
          {tiers.map((t, i) => (
            <div
              key={t.name}
              data-reveal
              style={{ transitionDelay: `${i * 80}ms` }}
              className={`relative rounded-3xl p-8 ${
                t.highlighted
                  ? 'bg-gradient-to-b from-accent-500/10 to-brand-500/5 border border-accent-400/40 glow'
                  : 'glass'
              }`}
            >
              {t.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-accent-400 to-brand-500 text-ink-950 text-xs font-semibold whitespace-nowrap flex items-center gap-1.5">
                  <Star className="w-3 h-3 fill-current" />
                  Best for Growing Businesses
                </div>
              )}

              <h3 className="font-display font-semibold text-2xl text-white">
                {t.name}
              </h3>

              <p className="text-gray-400 text-sm mt-2 mb-6 leading-relaxed">
                {t.desc}
              </p>

              <div className="mb-1">
                <span className="font-display font-extrabold text-3xl sm:text-4xl text-white">
                  {t.price}
                </span>
              </div>

              <p className="text-xs text-accent-400 mb-6 italic">
                Starting scope — final quote depends on requirements
              </p>

              <ul className="space-y-3 mb-8">
                {t.features.map((feature) => (
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

              <a
                href={waLink(
                  `Hi Avelixa! I'm interested in the ${t.name} website package (${t.price}). I'd like to discuss my business and get a custom quote.`
                )}
                target="_blank"
                rel="noreferrer"
                className={`w-full inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-full font-semibold transition-all ${
                  t.highlighted
                    ? 'bg-gradient-to-r from-accent-400 to-brand-500 text-ink-950 hover:shadow-[0_0_30px_-5px_rgba(34,211,238,0.6)]'
                    : 'glass text-white hover:bg-white/10'
                }`}
              >
                <MessageCircle className="w-4 h-4" />
                Discuss This Package
              </a>
            </div>
          ))}
        </div>

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