import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const SITE_URL = 'https://www.avelixa.co.ke';
const SITE_NAME = 'Avelixa';
const DEFAULT_IMAGE = `${SITE_URL}/og-image.jpg`;
const BRAND_LOGO = `${SITE_URL}/pwa-512x512.png`;

type PageSeo = {
  title: string;
  description: string;
  path: string;
  image?: string;
  noIndex?: boolean;
  type?: 'website' | 'article';
};

const SEO_PAGES: Record<string, PageSeo> = {
  '/': {
    title: 'Avelixa — Web Design & Development in Kenya',
    description:
      'Avelixa builds modern, high-converting websites for businesses in Kenya. Get a professional website designed to attract customers, build trust, and grow your business online.',
    path: '/',
  },

  '/services': {
    title: 'Web Design & Development Services in Kenya | Avelixa',
    description:
      'Explore Avelixa web design, web development, UI/UX, responsive design, SEO, e-commerce, and website performance services for businesses in Kenya.',
    path: '/services',
  },

  '/work': {
    title: 'Website Design Portfolio & Projects | Avelixa Kenya',
    description:
      'Explore websites and digital projects created by Avelixa for businesses looking to attract customers, build credibility, and grow online.',
    path: '/work',
  },

  '/about': {
    title: 'About Avelixa — Web Design Agency in Kenya',
    description:
      'Learn about Avelixa, a Kenya-based web design and development studio focused on building modern websites that help businesses grow.',
    path: '/about',
  },

  '/pricing': {
    title: 'Website Design Pricing in Kenya | Avelixa',
    description:
      'View Avelixa website design and development packages for businesses in Kenya. Choose a professional website package built around your business goals.',
    path: '/pricing',
  },

  '/reviews': {
    title: 'Avelixa Reviews & Client Testimonials',
    description:
      'Read reviews and testimonials from clients who have worked with Avelixa on professional websites and digital projects.',
    path: '/reviews',
  },

  '/contact': {
    title: 'Contact Avelixa — Get a Website for Your Business',
    description:
      'Contact Avelixa to discuss your business website, web design, development, e-commerce, SEO, or digital project in Kenya.',
    path: '/contact',
  },

  '/connector-apply': {
    title: 'Become an Avelixa Connector | Earn Through Referrals',
    description:
      'Apply to become an Avelixa Connector and refer businesses that need professional websites and digital solutions.',
    path: '/connector-apply',
  },
};

function setMeta(
  attribute: 'name' | 'property',
  key: string,
  content: string,
) {
  let element = document.head.querySelector(
    `meta[${attribute}="${key}"]`,
  ) as HTMLMetaElement | null;

  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }

  element.setAttribute('content', content);
}

function removeMeta(attribute: 'name' | 'property', key: string) {
  const element = document.head.querySelector(
    `meta[${attribute}="${key}"]`,
  );

  element?.remove();
}

function setCanonical(url: string) {
  let element = document.head.querySelector(
    'link[rel="canonical"]',
  ) as HTMLLinkElement | null;

  if (!element) {
    element = document.createElement('link');
    element.setAttribute('rel', 'canonical');
    document.head.appendChild(element);
  }

  element.setAttribute('href', url);
}

function setStructuredData(
  id: string,
  data: Record<string, unknown>,
) {
  let element = document.head.querySelector(
    `script[data-seo-id="${id}"]`,
  ) as HTMLScriptElement | null;

  if (!element) {
    element = document.createElement('script');
    element.type = 'application/ld+json';
    element.setAttribute('data-seo-id', id);
    document.head.appendChild(element);
  }

  element.textContent = JSON.stringify(data);
}

function removeStructuredData(id: string) {
  const element = document.head.querySelector(
    `script[data-seo-id="${id}"]`,
  );

  element?.remove();
}

export default function SEO() {
  const location = useLocation();

  useEffect(() => {
    const page = SEO_PAGES[location.pathname];

    const isPortal =
      location.pathname === '/login' ||
      location.pathname.startsWith('/portal');

    /*
     * Private application pages must never be indexed.
     */
    if (isPortal || !page) {
      document.title = `${SITE_NAME} Portal`;

      setMeta(
        'name',
        'robots',
        'noindex, nofollow, noarchive, nosnippet',
      );

      setMeta(
        'name',
        'googlebot',
        'noindex, nofollow, noarchive, nosnippet',
      );

      removeMeta('name', 'description');

      removeMeta('property', 'og:type');
      removeMeta('property', 'og:title');
      removeMeta('property', 'og:description');
      removeMeta('property', 'og:url');
      removeMeta('property', 'og:image');
      removeMeta('property', 'og:image:alt');

      removeMeta('name', 'twitter:card');
      removeMeta('name', 'twitter:title');
      removeMeta('name', 'twitter:description');
      removeMeta('name', 'twitter:image');
      removeMeta('name', 'twitter:image:alt');

      removeStructuredData('website');
      removeStructuredData('organization');
      removeStructuredData('services');
      removeStructuredData('reviews');

      return;
    }

    const canonicalUrl = `${SITE_URL}${page.path}`;
    const image = page.image || DEFAULT_IMAGE;

    document.title = page.title;

    /*
     * Basic SEO
     */
    setMeta('name', 'description', page.description);

    setMeta(
      'name',
      'robots',
      page.noIndex
        ? 'noindex, nofollow, noarchive'
        : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1',
    );

    setMeta(
      'name',
      'googlebot',
      page.noIndex
        ? 'noindex, nofollow, noarchive'
        : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1',
    );

    /*
     * Open Graph
     */
    setMeta(
      'property',
      'og:type',
      page.type || 'website',
    );

    setMeta(
      'property',
      'og:site_name',
      SITE_NAME,
    );

    setMeta(
      'property',
      'og:title',
      page.title,
    );

    setMeta(
      'property',
      'og:description',
      page.description,
    );

    setMeta(
      'property',
      'og:url',
      canonicalUrl,
    );

    setMeta(
      'property',
      'og:image',
      image,
    );

    setMeta(
      'property',
      'og:image:alt',
      page.title,
    );

    setMeta(
      'property',
      'og:locale',
      'en_KE',
    );

    /*
     * Twitter / X
     */
    setMeta(
      'name',
      'twitter:card',
      'summary_large_image',
    );

    setMeta(
      'name',
      'twitter:title',
      page.title,
    );

    setMeta(
      'name',
      'twitter:description',
      page.description,
    );

    setMeta(
      'name',
      'twitter:image',
      image,
    );

    setMeta(
      'name',
      'twitter:image:alt',
      page.title,
    );

    /*
     * Canonical URL
     */
    setCanonical(canonicalUrl);

    /*
     * Website structured data
     */
    setStructuredData('website', {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      '@id': `${SITE_URL}/#website`,
      name: SITE_NAME,
      url: SITE_URL,
      description:
        'Avelixa — Web Design & Development in Kenya',
      publisher: {
        '@id': `${SITE_URL}/#organization`,
      },
      inLanguage: 'en-KE',
    });

    /*
     * Organization structured data.
     * The same current brand asset used by the PWA is exposed here
     * so search engines receive one consistent Avelixa logo signal.
     */
    setStructuredData('organization', {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      '@id': `${SITE_URL}/#organization`,
      name: SITE_NAME,
      url: SITE_URL,
      logo: {
        '@type': 'ImageObject',
        '@id': `${SITE_URL}/#logo`,
        url: BRAND_LOGO,
        contentUrl: BRAND_LOGO,
        caption: 'Avelixa logo',
      },
      image: BRAND_LOGO,
      description:
        'Avelixa builds modern, high-converting websites for businesses in Kenya.',
      email: 'contact@avelixa.co.ke',
      telephone: '+254100601060',
      areaServed: {
        '@type': 'Country',
        name: 'Kenya',
      },
      sameAs: [
        'https://www.instagram.com/avelixa_hq/',
        'https://www.facebook.com/share/1FJM6v5SfN/',
      ],
    });

    /*
     * Services structured data
     */
    if (location.pathname === '/services') {
      setStructuredData('services', {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: 'Avelixa Web Design & Development Services',
        url: canonicalUrl,
        itemListElement: [
          'Web Development',
          'UI / UX Design',
          'Responsive Design',
          'SEO Optimization',
          'E-Commerce',
          'Website Performance',
        ].map((name, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          name,
        })),
      });
    } else {
      removeStructuredData('services');
    }

    /*
     * Reviews page structured data.
     *
     * The actual approved reviews are loaded by the Reviews page.
     * We intentionally do not manufacture review/rating values here.
     */
    removeStructuredData('reviews');
  }, [location.pathname]);

  return null;
}