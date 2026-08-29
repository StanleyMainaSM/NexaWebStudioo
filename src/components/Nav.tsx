import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, MessageCircle, LogIn } from 'lucide-react';
import { useSiteContactLinks, whatsappUrl } from '../lib/siteSettings';

const links = [
  { label: 'Home', to: '/' },
  { label: 'Services', to: '/services' },
  { label: 'Work', to: '/work' },
  { label: 'Pricing', to: '/pricing' },
  { label: 'Reviews', to: '/reviews' },
  { label: 'Connectors', to: '/connectors' },
];

export default function Nav() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const site = useSiteContactLinks();
  const whatsapp = whatsappUrl(site.whatsapp_number, "Hi Avelixa! I'd love to hire you to build a website for my business. Can we talk?");

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 20);
    h();
    window.addEventListener('scroll', h);
    return () => window.removeEventListener('scroll', h);
  }, []);

  useEffect(() => {
    setOpen(false);
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <header className={`fixed top-0 inset-x-0 z-50 transition-all duration-500 ${scrolled ? 'h-20 bg-ink-950/80 backdrop-blur-xl border-b border-ink-800/50 flex items-center shrink-0' : 'h-20 flex items-center border-b border-transparent shrink-0'}`}>
      <nav className="w-full max-w-7xl mx-auto px-6 lg:px-12 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3"><img src="/logo.avif" alt="Avelixa" className="w-10 h-10 object-contain" /><span className="text-xl font-medium tracking-tight text-white">Avelixa</span></Link>
        <div className="hidden md:flex items-center gap-6 lg:gap-10 text-sm font-medium text-ink-600 uppercase tracking-widest">{links.map((l) => <Link key={l.to} to={l.to} className={`cursor-pointer transition-colors ${location.pathname === l.to ? 'text-accent-400' : 'hover:text-accent-400'}`}>{l.label}</Link>)}</div>
        <div className="hidden md:flex items-center gap-4 lg:gap-6">
          <Link to="/login" className="text-white hover:text-accent-400 transition-colors uppercase tracking-widest text-sm font-medium flex items-center gap-2"><LogIn className="w-4 h-4" />Portal</Link>
          <a href={whatsapp} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 px-5 py-2 bg-zinc-100 text-black rounded-full hover:bg-accent-400 transition-colors uppercase tracking-widest text-sm font-medium"><MessageCircle className="w-4 h-4" />Start a Project</a>
        </div>
        <button onClick={() => setOpen(!open)} className="md:hidden p-2 text-white" aria-label="Menu">{open ? <X /> : <Menu />}</button>
      </nav>
      {open && <div className="md:hidden absolute top-20 inset-x-0 mx-4 glass rounded-2xl p-4 flex flex-col gap-1">{links.map((l) => <Link key={l.to} to={l.to} className={`px-4 py-3 rounded-lg transition-colors text-sm font-medium uppercase tracking-widest ${location.pathname === l.to ? 'text-accent-400 bg-white/5' : 'text-gray-400 hover:bg-white/5'}`}>{l.label}</Link>)}<Link to="/login" className="px-4 py-3 rounded-lg transition-colors text-sm font-medium uppercase tracking-widest text-accent-400 bg-accent-400/10">Portal Login</Link><Link to="/connector-apply" className="mt-2 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-zinc-100 text-black hover:bg-accent-400 transition-colors uppercase tracking-widest text-sm font-bold">Become a Connector</Link><a href={whatsapp} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-white/10 text-white hover:bg-white/5 transition-colors uppercase tracking-widest text-sm font-medium"><MessageCircle className="w-4 h-4" />Message on WhatsApp</a></div>}
    </header>
  );
}
