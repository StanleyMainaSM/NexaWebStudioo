import { Link } from 'react-router-dom';
import { Sparkles, Instagram, Facebook, Mail, MessageCircle, Phone } from 'lucide-react';
import { DEFAULT_WA, EMAIL, INSTAGRAM, FACEBOOK, WHATSAPP_INTL } from '../lib/constants';

export default function Footer() {
  return (
    <footer className="relative border-t border-white/5 py-14">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid md:grid-cols-3 gap-10 mb-12">
          <div>
            <Link to="/" className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-accent-400 to-brand-500 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-ink-950" strokeWidth={2.5} />
              </div>
              <span className="font-display font-bold text-lg text-white">
                Nexa<span className="text-accent-400">.</span>Studio
              </span>
            </Link>
            <p className="text-gray-400 text-sm max-w-xs mb-5">
              I build websites that help businesses get more customers — modern, fast, and conversion-focused.
            </p>
            <div className="flex gap-3">
              {[
                { href: INSTAGRAM, Icon: Instagram, label: 'Instagram' },
                { href: FACEBOOK, Icon: Facebook, label: 'Facebook' },
                { href: `mailto:${EMAIL}`, Icon: Mail, label: 'Email' },
                { href: DEFAULT_WA, Icon: MessageCircle, label: 'WhatsApp' },
              ].map(({ href, Icon, label }) => (
                <a key={label} href={href} target={href.startsWith('http') ? '_blank' : undefined} rel="noreferrer"
                  aria-label={label}
                  className="w-10 h-10 rounded-xl glass flex items-center justify-center text-gray-400 hover:text-accent-400 hover:bg-white/10 transition-all">
                  <Icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-display font-semibold text-white mb-4">Quick Links</h4>
            <ul className="space-y-2 text-sm">
              {[
                { label: 'Services', to: '/services' },
                { label: 'My Work', to: '/work' },
                { label: 'About Me', to: '/about' },
                { label: 'Pricing', to: '/pricing' },
                { label: 'Reviews', to: '/reviews' },
                { label: 'Contact', to: '/contact' },
              ].map((l) => (
                <li key={l.to}>
                  <Link to={l.to} className="text-gray-400 hover:text-accent-400 transition-colors">{l.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-display font-semibold text-white mb-4">Get in touch</h4>
            <ul className="space-y-3 text-sm">
              <li>
                <a href={`tel:+${WHATSAPP_INTL}`} className="flex items-center gap-3 text-gray-400 hover:text-accent-400 transition-colors">
                  <Phone className="w-4 h-4 flex-shrink-0" /> +254 100 601 060
                </a>
              </li>
              <li>
                <a href={`mailto:${EMAIL}`} className="flex items-center gap-3 text-gray-400 hover:text-accent-400 transition-colors">
                  <Mail className="w-4 h-4 flex-shrink-0" /> {EMAIL}
                </a>
              </li>
              <li>
                <a href={DEFAULT_WA} target="_blank" rel="noreferrer" className="flex items-center gap-3 text-gray-400 hover:text-accent-400 transition-colors">
                  <MessageCircle className="w-4 h-4 flex-shrink-0" /> WhatsApp: +254 100 601 060
                </a>
              </li>
              <li>
                <a href={INSTAGRAM} target="_blank" rel="noreferrer" className="flex items-center gap-3 text-gray-400 hover:text-accent-400 transition-colors">
                  <Instagram className="w-4 h-4 flex-shrink-0" /> @nexawebstudioofficial
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-500">
          <div>© {new Date().getFullYear()} Nexa Web Studio. All rights reserved.</div>
          <div>Crafted with care — let's build yours next.</div>
        </div>
      </div>
    </footer>
  );
}
