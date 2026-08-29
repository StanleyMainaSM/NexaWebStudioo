const CLIENT_REGISTER_PATH = '/client-register';

export function normalizeClientReferralId(value: string | null | undefined): string {
  return (value || '').trim().toUpperCase();
}

export function buildClientReferralLink(
  avlId: string | null | undefined,
  origin?: string,
): string {
  const normalized = normalizeClientReferralId(avlId);
  if (!normalized) return '';

  const base = (origin || (typeof window !== 'undefined' ? window.location.origin : '')).replace(/\/$/, '');
  return `${base}${CLIENT_REGISTER_PATH}?ref=${encodeURIComponent(normalized)}`;
}

export function getClientReferralIdFromSearch(search: string): string {
  return normalizeClientReferralId(new URLSearchParams(search).get('ref'));
}
