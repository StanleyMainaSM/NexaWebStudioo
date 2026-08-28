import { useEffect, useState } from 'react';
import { CheckCircle2, Instagram, Facebook, MessageCircle, Mail, Save, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

type WebsiteLinks = {
  whatsapp_number: string;
  whatsapp_url: string;
  instagram_name: string;
  instagram_url: string;
  facebook_name: string;
  facebook_url: string;
  email: string;
  website_url: string;
};

const defaults: WebsiteLinks = {
  whatsapp_number: '',
  whatsapp_url: '',
  instagram_name: '',
  instagram_url: '',
  facebook_name: '',
  facebook_url: '',
  email: '',
  website_url: 'https://avelixa.co.ke',
};

function normalizeLinks(value: unknown): WebsiteLinks {
  const data = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  return {
    whatsapp_number: String(data.whatsapp_number ?? ''),
    whatsapp_url: String(data.whatsapp_url ?? ''),
    instagram_name: String(data.instagram_name ?? ''),
    instagram_url: String(data.instagram_url ?? ''),
    facebook_name: String(data.facebook_name ?? ''),
    facebook_url: String(data.facebook_url ?? ''),
    email: String(data.email ?? ''),
    website_url: String(data.website_url ?? defaults.website_url),
  };
}

function Field({ label, value, onChange, placeholder, type = 'text' }: { label: string; value: string; onChange: (value: string) => void; placeholder: string; type?: string }) {
  return (
    <label className="block space-y-2">
      <span className="text-xs font-bold uppercase tracking-widest text-gray-500">{label}</span>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full rounded-xl border border-ink-700 bg-ink-900/70 px-4 py-3 text-sm text-white outline-none transition focus:border-accent-500/50" />
    </label>
  );
}

export default function WebsiteLinks() {
  const [links, setLinks] = useState<WebsiteLinks>(defaults);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    (async () => {
      const { data, error: dbError } = await supabase.from('settings').select('value').eq('key', 'site_contact_links').maybeSingle();
      if (!active) return;
      if (dbError) setError('Could not load website links. Please refresh and try again.');
      else if (data?.value) setLinks(normalizeLinks(data.value));
      setLoading(false);
    })();
    return () => { active = false; };
  }, []);

  const update = (key: keyof WebsiteLinks, value: string) => setLinks((current) => ({ ...current, [key]: value }));

  const save = async () => {
    setSaving(true); setMessage(''); setError('');
    const { error: dbError } = await supabase.from('settings').upsert({ key: 'site_contact_links', value: links, updated_by: (await supabase.auth.getUser()).data.user?.id ?? null, updated_at: new Date().toISOString() }, { onConflict: 'key' });
    if (dbError) setError(dbError.message || 'Could not save website links.');
    else setMessage('Website links saved successfully.');
    setSaving(false);
  };

  if (loading) return <div className="flex items-center gap-3 text-gray-400"><Loader2 className="w-5 h-5 animate-spin" />Loading website links...</div>;

  return (
    <div className="space-y-8">
      <div>
        <div className="text-xs font-semibold uppercase tracking-widest text-accent-400 mb-2">Owner Controls</div>
        <h1 className="text-3xl md:text-4xl font-display font-bold text-white">Website Links</h1>
        <p className="mt-2 text-sm text-gray-500 max-w-2xl">Change Avelixa public contact and social links here. You do not need to edit the website code.</p>
      </div>

      {message && <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300"><CheckCircle2 className="w-5 h-5" />{message}</div>}
      {error && <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>}

      <div className="grid gap-5 md:grid-cols-2">
        <section className="glass rounded-3xl p-6 space-y-5">
          <div className="flex items-center gap-3"><MessageCircle className="w-5 h-5 text-accent-400" /><h2 className="font-semibold text-white">WhatsApp</h2></div>
          <Field label="WhatsApp Number" value={links.whatsapp_number} onChange={(v) => update('whatsapp_number', v)} placeholder="254..." />
          <Field label="WhatsApp Link" value={links.whatsapp_url} onChange={(v) => update('whatsapp_url', v)} placeholder="https://wa.me/..." />
        </section>

        <section className="glass rounded-3xl p-6 space-y-5">
          <div className="flex items-center gap-3"><Instagram className="w-5 h-5 text-accent-400" /><h2 className="font-semibold text-white">Instagram</h2></div>
          <Field label="Account Name" value={links.instagram_name} onChange={(v) => update('instagram_name', v)} placeholder="@avelixa_hq" />
          <Field label="Instagram URL" value={links.instagram_url} onChange={(v) => update('instagram_url', v)} placeholder="https://www.instagram.com/..." />
        </section>

        <section className="glass rounded-3xl p-6 space-y-5">
          <div className="flex items-center gap-3"><Facebook className="w-5 h-5 text-accent-400" /><h2 className="font-semibold text-white">Facebook</h2></div>
          <Field label="Page Name" value={links.facebook_name} onChange={(v) => update('facebook_name', v)} placeholder="Avelixa" />
          <Field label="Facebook URL" value={links.facebook_url} onChange={(v) => update('facebook_url', v)} placeholder="https://www.facebook.com/..." />
        </section>

        <section className="glass rounded-3xl p-6 space-y-5">
          <div className="flex items-center gap-3"><Mail className="w-5 h-5 text-accent-400" /><h2 className="font-semibold text-white">Business Contact</h2></div>
          <Field label="Business Email" type="email" value={links.email} onChange={(v) => update('email', v)} placeholder="contact@avelixa.co.ke" />
          <Field label="Website URL" value={links.website_url} onChange={(v) => update('website_url', v)} placeholder="https://avelixa.co.ke" />
        </section>
      </div>

      <div className="flex justify-end">
        <button type="button" onClick={save} disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-accent-500 px-5 py-3 text-sm font-semibold text-ink-950 hover:bg-accent-400 disabled:opacity-50"><Save className="w-4 h-4" />{saving ? 'Saving...' : 'Save Website Links'}</button>
      </div>
    </div>
  );
}
