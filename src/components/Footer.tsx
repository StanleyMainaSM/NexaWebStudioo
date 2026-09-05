import { Link } from 'react-router-dom';
import { Sparkles, Instagram, Facebook, Mail, MessageCircle, Phone } from 'lucide-react';
import { useSiteContactLinks, whatsappUrl } from '../lib/siteSettings';

export default function Footer() {
  const site = useSiteContactLinks();
  const whatsapp = whatsappUrl(site.whatsapp_number, "Hi Avelixa! I'd love to hire you to build a website for my business. Can we talk?");
  const phone = site.whatsapp_number.replace(/^(254)(\d{3})(\d{3})(\d{3})$/, '+$1 $2 $3 $4');
  const socials = [
    { href: site.instagram_url, Icon: Instagram, label: 'Instagram', tone: 'social-instagram' },
    { href: site.facebook_url, Icon: Facebook, label: 'Facebook', tone: 'social-facebook' },
    { href: `mailto:${site.email}`, Icon: Mail, label: 'Email', tone: 'social-email' },
    { href: whatsapp, Icon: MessageCircle, label: 'WhatsApp', tone: 'social-whatsapp' },
  ];
  return (
    <footer className="relative border-t border-ink-800/50 py-14 bg-ink-950">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid md:grid-cols-3 gap-10 mb-12">
          <div>
            <Link to="/" className="flex items-center gap-3 mb-4"><div className="w-10 h-10 rounded-lg bg-accent-600 flex items-center justify-center rotate-3"><Sparkles className="w-5 h-5 text-white" strokeWidth={2.5} /></div><span className="text-xl font-medium tracking-tight text-white">Avelixa</span></Link>
            <p className="text-gray-400 text-sm max-w-xs mb-5 leading-relaxed">I build websites that help businesses get more customers — modern, fast, and conversion-focused.</p>
            <div className="flex gap-3">{socials.map(({ href, Icon, label, tone }) => <a key={label} href={href} target={href.startsWith('http') ? '_blank' : undefined} rel="noreferrer" aria-label={label} data-social={tone} className={`social-link ${tone} w-10 h-10 rounded-xl glass flex items-center justify-center transition-all`}><Icon className="w-4 h-4" /></a>)}</div>
          </div>
          <div><h4 className="text-xs font-bold text-ink-500 uppercase tracking-widest mb-4">Quick Links</h4><ul className="space-y-3 text-sm">{[{ label: 'Services', to: '/services' },{ label: 'My Work', to: '/work' },{ label: 'About Me', to: '/about' },{ label: 'Pricing', to: '/pricing' },{ label: 'Reviews', to: '/reviews' },{ label: 'Connectors', to: '/connectors' },{ label: 'Contact', to: '/contact' }].map((l) => <li key={l.to}><Link to={l.to} className="text-gray-400 hover:text-accent-400 transition-colors font-medium">{l.label}</Link></li>)}</ul></div>
          <div><h4 className="text-xs font-bold text-ink-500 uppercase tracking-widest mb-4">Get in touch</h4><ul className="space-y-3 text-sm"><li><a href={`tel:+${site.whatsapp_number.replace(/\D/g,'')}`} className="flex items-center gap-3 text-gray-400 hover:text-accent-400 transition-colors font-medium"><Phone className="w-4 h-4 flex-shrink-0" /> {phone}</a></li><li><a href={`mailto:${site.email}`} className="flex items-center gap-3 text-gray-400 hover:text-accent-400 transition-colors font-medium"><Mail className="w-4 h-4 flex-shrink-0" /> {site.email}</a></li><li><a href={whatsapp} target="_blank" rel="noreferrer" className="flex items-center gap-3 text-gray-400 hover:text-accent-400 transition-colors font-medium"><MessageCircle className="w-4 h-4 flex-shrink-0" /> WhatsApp: {phone}</a></li><li><a href={site.instagram_url} target="_blank" rel="noreferrer" className="flex items-center gap-3 text-gray-400 hover:text-accent-400 transition-colors font-medium"><Instagram className="w-4 h-4 flex-shrink-0" /> Instagram</a></li></ul></div>
        </div>
        <div className="pt-8 border-t border-ink-800/50 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-ink-500 uppercase tracking-widest font-medium"><div>© {new Date().getFullYear()} Avelixa. All rights reserved.</div><div className="flex gap-4"><span className="font-mono">STATUS: OPTIMIZED</span><span className="font-mono">LOC: NAIROBI / REMOTE</span></div></div>
      </div>
    </footer>
  );
}
