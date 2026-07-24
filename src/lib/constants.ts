export const WHATSAPP_INTL = '254100601060';
export const EMAIL = 'Nexawebstudioo@gmail.com';
export const INSTAGRAM = 'https://www.instagram.com/nexawebstudioofficial/#';
export const FACEBOOK = 'https://www.facebook.com/share/1FJM6v5SfN/';

export function waLink(msg: string) {
  return `https://wa.me/${WHATSAPP_INTL}?text=${encodeURIComponent(msg)}`;
}

export const DEFAULT_WA = waLink(
  "Hi Nexa Web Studio! I'd love to hire you to build a website for my business. Can we talk?"
);
