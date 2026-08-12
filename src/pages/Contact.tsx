import { MessageCircle, Mail, Rocket, Shield, Clock, TrendingUp, ArrowUpRight } from 'lucide-react';
import { DEFAULT_WA, EMAIL, WHATSAPP_INTL } from '../lib/constants';
import { useReveal } from '../lib/hooks';

const features = [
  { icon: Rocket, title: 'Fast Delivery', desc: 'Most projects launch in 7–30 days.' },
  { icon: Shield, title: 'Reliable', desc: 'Trusted by businesses across the region.' },
  { icon: Clock, title: 'Always Available', desc: 'Reach me directly on WhatsApp anytime.' },
  { icon: TrendingUp, title: 'Results-Driven', desc: 'Built to grow revenue, not just look good.' },
];

export default function Contact() {
  useReveal();
  return (
    <div className="relative pt-32 pb-28">
      <div className="max-w-5xl mx-auto px-6">
        <div data-reveal className="relative overflow-hidden rounded-[2.5rem] p-10 sm:p-16 text-center glass glow">
          <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full bg-accent-500/20 blur-[100px]" />
          <div className="absolute inset-0 overflow-hidden rounded-[2.5rem] opacity-[0.04]">
            <img src="https://images.pexels.com/photos/270404/pexels-photo-270404.jpeg?auto=compress&cs=tinysrgb&w=1600"
              alt="" className="w-full h-full object-cover" />
          </div>
          <div className="relative">
            <div className="text-xs font-semibold uppercase tracking-widest text-accent-400 mb-4">Get In Touch</div>
            <h1 className="font-display font-extrabold text-4xl sm:text-6xl text-white tracking-tight">
              Let's build something that <span className="text-gradient">sells</span>.
            </h1>
            <p className="mt-5 text-gray-400 text-lg max-w-xl mx-auto">
              Tell me about your business on WhatsApp and I'll reply with a free game plan within hours.
            </p>
            <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
              <a href={DEFAULT_WA} target="_blank" rel="noreferrer"
                className="group inline-flex items-center gap-2.5 px-8 py-4 rounded-full bg-gradient-to-r from-accent-400 to-brand-500 text-ink-950 font-semibold hover:shadow-[0_0_40px_-5px_rgba(34,211,238,0.7)] transition-all">
                <MessageCircle className="w-5 h-5" />
                Message Me on WhatsApp
                <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </a>
              <a href={`mailto:${EMAIL}`}
                className="inline-flex items-center gap-2.5 px-8 py-4 rounded-full glass text-white font-medium hover:bg-white/10 transition-colors">
                <Mail className="w-5 h-5" />
                Send an Email
              </a>
            </div>
            <div className="mt-6 text-sm text-gray-500">
              Or call:{' '}
              <a href={`tel:+${WHATSAPP_INTL}`} className="text-accent-400 font-medium">
                +254 100 601 060
              </a>
            </div>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-10">
          {features.map((f, i) => (
            <div key={f.title} data-reveal style={{ transitionDelay: `${i * 60}ms` }}
              className="glass rounded-2xl p-6">
              <f.icon className="w-7 h-7 text-accent-400 mb-3" />
              <h3 className="font-display font-semibold text-white mb-1">{f.title}</h3>
              <p className="text-sm text-gray-400">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
