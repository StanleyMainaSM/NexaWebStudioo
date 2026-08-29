import { useEffect } from 'react';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import Connectors from './Connectors';

const SITE_URL = 'https://www.avelixa.co.ke';
const TITLE = 'Become an Avelixa Connector | Earn 20% Commission';
const DESCRIPTION = 'Become an Avelixa Connector, refer businesses that need professional websites, and earn a 20% commission on eligible successful projects.';

export default function ConnectorLandingPage() {
  useEffect(() => {
    document.title = TITLE;

    const setMeta = (attribute: 'name' | 'property', key: string, content: string) => {
      let element = document.head.querySelector(`meta[${attribute}="${key}"]`) as HTMLMetaElement | null;
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(attribute, key);
        document.head.appendChild(element);
      }
      element.setAttribute('content', content);
    };

    setMeta('name', 'description', DESCRIPTION);
    setMeta('name', 'robots', 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1');
    setMeta('name', 'googlebot', 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1');
    setMeta('property', 'og:type', 'website');
    setMeta('property', 'og:site_name', 'Avelixa');
    setMeta('property', 'og:title', TITLE);
    setMeta('property', 'og:description', DESCRIPTION);
    setMeta('property', 'og:url', `${SITE_URL}/connectors`);
    setMeta('property', 'og:image', `${SITE_URL}/og-image.jpg`);
    setMeta('property', 'og:image:alt', TITLE);
    setMeta('property', 'og:locale', 'en_KE');
    setMeta('name', 'twitter:card', 'summary_large_image');
    setMeta('name', 'twitter:title', TITLE);
    setMeta('name', 'twitter:description', DESCRIPTION);
    setMeta('name', 'twitter:image', `${SITE_URL}/og-image.jpg`);
    setMeta('name', 'twitter:image:alt', TITLE);

    let canonical = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', `${SITE_URL}/connectors`);
  }, []);

  return (
    <>
      <Connectors />
      <div className="fixed inset-x-0 bottom-0 z-40 px-4 pb-4 md:hidden pointer-events-none">
        <div className="mx-auto max-w-md rounded-2xl border border-accent-400/20 bg-ink-950/95 backdrop-blur-xl shadow-2xl p-2 pointer-events-auto">
          <Link to="/connector-apply" className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-100 px-5 py-3.5 text-black hover:bg-accent-400 transition-colors uppercase tracking-widest text-xs font-bold">
            Become a Connector <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </>
  );
}
