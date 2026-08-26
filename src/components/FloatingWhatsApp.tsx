import { MessageCircle } from 'lucide-react';
import { useSiteContactLinks, whatsappUrl } from '../lib/siteSettings';

export default function FloatingWhatsApp() {
  const links = useSiteContactLinks();
  const href = whatsappUrl(links.whatsapp_number, "Hi Avelixa! I'd love to hire you to build a website for my business. Can we talk?");
  return (
    <a href={href} target="_blank" rel="noreferrer"
      aria-label="Chat on WhatsApp"
      className="fixed bottom-6 right-6 z-50 group">
      <div className="relative">
        <div className="absolute inset-0 rounded-full bg-emerald-500/40 blur-xl animate-pulse-glow" />
        <div className="relative w-14 h-14 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
          <MessageCircle className="w-7 h-7 text-white" />
        </div>
      </div>
    </a>
  );
}
