import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, Sparkles, MessageCircle } from 'lucide-react';
import { DEFAULT_WA } from '../lib/constants';

const links = [
  { label: 'Home', to: '/' },
  { label: 'Services', to: '/services' },
  { label: 'Work', to: '/work' },
  { label: 'About', to: '/about' },
  { label: 'Pricing', to: '/pricing' },
  { label: 'Reviews', to: '/reviews' },
  { label: 'Contact', to: '/contact' },
];

export default function Nav() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();

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
    <header className={`fixed top-0 inset-x-0 z-50 transition-all duration-500 ${
      scrolled ? 'py-3 bg-ink-950/80 backdrop-blur-xl border-b border-white/5' : 'py-5'
    }`}>
      <nav className="max-w-7xl mx-auto px-6 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-accent-400 to-brand-500 flex items-center justify-center glow">
            <Sparkles className="w-5 h-5 text-ink-950" strokeWidth={2.5} />
          </div>
          <span className="font-display font-bold text-lg tracking-tight text-white">
            Nexa<span className="text-accent-400">.</span>Studio
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-1">
          {links.map((l) => (
            <Link key={l.to} to={l.to}
              className={`px-4 py-2 text-sm rounded-lg transition-colors ${
                location.pathname === l.to
                  ? 'text-accent-400 bg-white/5'
                  : 'text-gray-300 hover:text-white hover:bg-white/5'
              }`}>
              {l.label}
            </Link>
          ))}
        </div>

        <a href={DEFAULT_WA} target="_blank" rel="noreferrer"
          className="hidden md:inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-accent-400 to-brand-500 text-ink-950 font-semibold text-sm hover:shadow-[0_0_30px_-5px_rgba(34,211,238,0.6)] transition-all">
          <MessageCircle className="w-4 h-4" />
          Start a Project
        </a>

        <button onClick={() => setOpen(!open)} className="md:hidden p-2 text-white" aria-label="Menu">
          {open ? <X /> : <Menu />}
        </button>
      </nav>

      {open && (
        <div className="md:hidden mt-3 mx-4 glass rounded-2xl p-4 flex flex-col gap-1">
          {links.map((l) => (
            <Link key={l.to} to={l.to}
              className={`px-4 py-3 rounded-lg transition-colors ${
                location.pathname === l.to
                  ? 'text-accent-400 bg-white/5'
                  : 'text-gray-200 hover:bg-white/5'
              }`}>
              {l.label}
            </Link>
          ))}
          <a href={DEFAULT_WA} target="_blank" rel="noreferrer"
            className="mt-2 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-accent-400 to-brand-500 text-ink-950 font-semibold">
            <MessageCircle className="w-4 h-4" /> Message on WhatsApp
          </a>
        </div>
      )}
    </header>
  );
}
