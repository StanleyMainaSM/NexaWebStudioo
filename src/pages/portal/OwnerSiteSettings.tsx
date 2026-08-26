import { FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Link2, Loader2, Save, WalletCards } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { DEFAULT_SITE_CONTACT_LINKS, SiteContactLinks } from '../../lib/siteSettings';

export default function OwnerSiteSettings() {
  const [form, setForm] = useState<SiteContactLinks>(DEFAULT_SITE_CONTACT_LINKS);
  const [account, setAccount] = useState<{ account_number: string; account_identifier: string; currency: string; account_name: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    void (async () => {
      setLoading(true);
      const [{ data: setting }, { data: financeAccount, error: accountError }] = await Promise.all([
        supabase.from('settings').select('value').eq('key', 'site_contact_links').maybeSingle(),
        supabase.from('finance_accounts').select('account_name,account_number,account_identifier,currency').eq('is_primary', true).eq('is_active', true).maybeSingle(),
      ]);
      if (setting?.value) setForm({ ...DEFAULT_SITE_CONTACT_LINKS, ...(setting.value as Partial<SiteContactLinks>) });
      if (!accountError && financeAccount) setAccount(financeAccount);
      setLoading(false);
    })();
  }, []);

  const save = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true); setMessage(''); setError('');
    try {
      const { error: saveError } = await supabase.from('settings').upsert({ key: 'site_contact_links', value: form, updated_at: new Date().toISOString() }, { onConflict: 'key' });
      if (saveError) throw saveError;
      setMessage('Website contact links updated successfully.');
    } catch (err: any) {
      setError(err?.message || 'Unable to save website settings.');
    } finally { setSaving(false); }
  };

  if (loading) return <div className="py-12 flex items-center justify-center text-gray-400"><Loader2 className="w-5 h-5 animate-spin mr-2" />Loading site settings...</div>;

  return <div className="space-y-8 max-w-4xl">
    <div><Link to="/portal/owner" className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white"><ArrowLeft className="w-4 h-4" />Back to Owner Dashboard</Link><h1 className="mt-5 text-3xl font-semibold text-white">Website & Business Settings</h1><p className="mt-2 text-sm text-gray-400">Change the public Avelixa contact links without editing the code.</p></div>
    {(message || error) && <div className={`rounded-xl border p-4 text-sm ${message ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300' : 'border-red-500/20 bg-red-500/10 text-red-300'}`}>{message || error}</div>}
    <form onSubmit={save} className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 space-y-5">
      <div className="flex items-center gap-3 mb-2"><Link2 className="w-5 h-5 text-accent-400" /><div><h2 className="text-lg font-medium text-white">Public Contact Links</h2><p className="text-sm text-gray-500">These values are used by the public website.</p></div></div>
      {([['instagram_url','Instagram URL','https://www.instagram.com/'],['facebook_url','Facebook URL','https://www.facebook.com/'],['whatsapp_number','WhatsApp number','254700000000'],['email','Business email','contact@avelixa.co.ke']] as const).map(([key,label,placeholder]) => <label key={key} className="block"><span className="block text-sm text-gray-300 mb-2">{label}</span><input value={form[key]} onChange={e => setForm({ ...form, [key]: e.target.value })} placeholder={placeholder} className="w-full rounded-xl bg-ink-950 border border-ink-800 px-4 py-3 text-white outline-none focus:border-accent-500" /></label>)}
      <button disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-accent-600 px-5 py-3 text-white font-medium disabled:opacity-50">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}Save Website Settings</button>
    </form>
    {account && <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-6"><div className="flex items-center gap-3"><WalletCards className="w-5 h-5 text-emerald-400" /><div><h2 className="text-lg font-medium text-white">Primary Transaction Account</h2><p className="text-sm text-gray-400">New client receipts, payouts and recorded business expenses are assigned to this primary account by default.</p></div></div><div className="mt-5 grid sm:grid-cols-3 gap-4"><div><div className="text-xs uppercase tracking-widest text-gray-500">Account</div><div className="mt-1 text-white font-medium">{account.account_number}</div></div><div><div className="text-xs uppercase tracking-widest text-gray-500">Paybill</div><div className="mt-1 text-white font-medium">{account.account_identifier}</div></div><div><div className="text-xs uppercase tracking-widest text-gray-500">Currency</div><div className="mt-1 text-white font-medium">{account.currency}</div></div></div><div className="mt-4 flex items-center gap-2 text-xs text-emerald-300"><CheckCircle2 className="w-4 h-4" />Primary and active</div></div>}
  </div>;
}
