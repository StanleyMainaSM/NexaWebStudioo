import { MessageCircle, Check } from 'lucide-react';
import { waLink } from '../lib/constants';
import { useReveal } from '../lib/hooks';

const tiers = [
  {
    name: 'Starter', price: 'KES 8,000', note: 'from',
    desc: 'Perfect for individuals and small businesses just getting online.',
    features: ['Up to 5 custom pages', 'Mobile-responsive design', 'Basic on-page SEO', 'Contact form', '2 revision rounds', 'Delivery in ~7 days'],
    highlighted: false,
  },
  {
    name: 'Standard', price: 'KES 22,000', note: 'from',
    desc: 'For growing businesses that need a polished, full-featured site.',
    features: ['Up to 12 custom pages', 'Premium UI/UX design', 'Advanced SEO setup', 'CMS / blog integration', 'Google Analytics', 'Speed optimization', 'Unlimited revisions', 'Delivery in ~21 days'],
    highlighted: true,
  },
  {
    name: 'Enterprise', price: 'Custom', note: '',
    desc: 'Tailored solutions for complex or large-scale business needs.',
    features: ['Unlimited pages', 'E-commerce / online shop', 'Custom features & APIs', 'Booking / reservation system', 'Ongoing support plan', 'Priority delivery'],
    highlighted: false,
  },
];

export default function Pricing() {
  useReveal();
  return (
    <div className="relative pt-32 pb-28">
      <div className="max-w-7xl mx-auto px-6">
        <div className="max-w-2xl mx-auto text-center mb-6" data-reveal>
          <div className="text-xs font-semibold uppercase tracking-widest text-accent-400 mb-3">Pricing</div>
          <h1 className="font-display font-bold text-4xl sm:text-5xl text-white tracking-tight">
            Transparent pricing in Kenyan Shillings
          </h1>
          <p className="mt-4 text-gray-400 text-lg">
            Prices are starting points only.{' '}
            <span className="text-accent-300 font-medium">All rates are open to discussion and negotiation.</span>{' '}
            Message me on WhatsApp for a free custom quote.
          </p>
        </div>

        <div className="max-w-xl mx-auto mb-12" data-reveal>
          <div className="glass rounded-2xl p-4 flex items-start gap-3 border border-accent-400/20">
            <MessageCircle className="w-5 h-5 text-accent-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-gray-300">
              Not sure which plan fits? <strong className="text-white">Just message me</strong> — I'll listen to your needs and we'll agree on a price that works for both of us.
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {tiers.map((t, i) => (
            <div key={t.name} data-reveal style={{ transitionDelay: `${i * 80}ms` }}
              className={`relative rounded-3xl p-8 ${t.highlighted
                ? 'bg-gradient-to-b from-accent-500/10 to-brand-500/5 border border-accent-400/40 glow'
                : 'glass'}`}>
              {t.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-accent-400 to-brand-500 text-ink-950 text-xs font-semibold whitespace-nowrap">
                  Most Popular
                </div>
              )}
              <h3 className="font-display font-semibold text-2xl text-white">{t.name}</h3>
              <p className="text-gray-400 text-sm mt-1 mb-5">{t.desc}</p>
              <div className="mb-1">
                {t.note && <span className="text-xs text-gray-500 uppercase tracking-wider">{t.note} </span>}
                <span className="font-display font-extrabold text-4xl text-white">{t.price}</span>
              </div>
              <p className="text-xs text-accent-400 mb-6 italic">Negotiable — contact for custom quote</p>
              <ul className="space-y-3 mb-8">
                {t.features.map((f) => (
                  <li key={f} className="flex items-start gap-3 text-gray-300 text-sm">
                    <div className="mt-0.5 w-5 h-5 rounded-full bg-accent-400/20 flex items-center justify-center flex-shrink-0">
                      <Check className="w-3 h-3 text-accent-300" strokeWidth={3} />
                    </div>
                    {f}
                  </li>
                ))}
              </ul>
              <a href={waLink(`Hi Nexa! I'm interested in the ${t.name} package (starting at ${t.price}). I'd love to discuss my project and get a custom quote.`)}
                target="_blank" rel="noreferrer"
                className={`w-full inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-full font-semibold transition-all ${t.highlighted
                  ? 'bg-gradient-to-r from-accent-400 to-brand-500 text-ink-950 hover:shadow-[0_0_30px_-5px_rgba(34,211,238,0.6)]'
                  : 'glass text-white hover:bg-white/10'}`}>
                <MessageCircle className="w-4 h-4" />
                Discuss on WhatsApp
              </a>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
