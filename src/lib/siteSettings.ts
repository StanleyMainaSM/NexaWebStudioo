import { useEffect, useState } from 'react';
import { supabase } from './supabase';
import { FACEBOOK, INSTAGRAM, EMAIL, WHATSAPP_INTL } from './constants';

export type SiteContactLinks = {
  whatsapp_number: string;
  instagram_url: string;
  facebook_url: string;
  email: string;
};

export const DEFAULT_SITE_CONTACT_LINKS: SiteContactLinks = {
  whatsapp_number: WHATSAPP_INTL,
  instagram_url: INSTAGRAM,
  facebook_url: FACEBOOK,
  email: EMAIL,
};

export function whatsappUrl(number: string, message?: string) {
  const normalized = number.replace(/\D/g, '');
  const suffix = message ? `?text=${encodeURIComponent(message)}` : '';
  return `https://wa.me/${normalized}${suffix}`;
}

export function useSiteContactLinks() {
  const [links, setLinks] = useState<SiteContactLinks>(DEFAULT_SITE_CONTACT_LINKS);

  useEffect(() => {
    let mounted = true;
    void supabase
      .from('settings')
      .select('value')
      .eq('key', 'site_contact_links')
      .maybeSingle()
      .then(({ data }) => {
        if (!mounted || !data?.value) return;
        const value = data.value as Partial<SiteContactLinks>;
        setLinks({ ...DEFAULT_SITE_CONTACT_LINKS, ...value });
      });
    return () => {
      mounted = false;
    };
  }, []);

  return links;
}
