export const LEAD_HUNTING_CATEGORIES = [
  'Restaurants',
  'Salons & Barbershops',
  'Clothing & Fashion',
  'Hotels & Guest Houses',
  'Real Estate',
  'Clinics',
  'Law Firms',
  'Schools & Training Centres',
  'Gyms',
  'Car Dealerships',
  'Auto Repair',
  'Tour & Travel',
  'Construction',
  'Professional Services',
  'Local Shops',
  'Growing SMEs',
] as const;

export const GOOD_PROSPECTS = [
  'No website or an outdated website',
  'Heavy reliance on WhatsApp or social media',
  'Growing business or multiple locations',
  'Weak online visibility or calls-to-action',
  'Products or services that need clearer presentation',
  'Active advertising with a weak digital destination',
  'Strong physical presence but limited online presence',
] as const;

export const LEAD_FIND_STEPS = [
  ['Search', 'Google Maps, Instagram, Facebook, TikTok, local directories, business listings, physical businesses and your own network.'],
  ['Identify the opportunity', 'Look for missing, outdated or weak digital presence, poor mobile presentation, weak calls-to-action or a need for enquiries/bookings.'],
  ['Contact the business', 'Start a professional conversation. Ask about the business and its goals before pitching a solution.'],
  ['Submit the lead', 'Capture accurate contact details, explain the opportunity and submit the business through Avelixa.'],
] as const;

export const OUTREACH_SCRIPTS = [
  ['WhatsApp', 'Hi! I came across your business and noticed there may be an opportunity to strengthen how customers find and learn about your services online. I work with Avelixa, which helps businesses build professional websites and digital solutions. Would you be open to a quick conversation about what you currently use online?'],
  ['Phone', 'Hi, my name is [Name]. I work with Avelixa and I am reaching out because I noticed your business may have an opportunity to improve its online presence. Is now a good time for a quick question about how customers currently find you online?'],
  ['In person', 'Hi, I am [Name]. I work with Avelixa, a web and digital solutions company. I was looking at your business and thought there may be a few ways to make it easier for customers to discover your services online. Could I briefly explain?'],
  ['Follow-up', 'Hi [Name], just following up on my earlier message. I would be happy to share a few practical ideas for improving your business presence online. If it is useful, we can have a short conversation at a time that works for you.'],
] as const;

export function buildLeadStatusLabel(status: string | null | undefined): string {
  const key = (status || 'pending').trim().toLowerCase();
  return ({
    pending: 'Submitted',
    submitted: 'Submitted',
    contacted: 'Contacted',
    qualified: 'Qualified',
    proposal: 'Proposal',
    won: 'Won',
    lost: 'Lost',
  } as Record<string, string>)[key] ?? key.replace(/_/g, ' ');
}
