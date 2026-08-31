import { useEffect, useState } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import type { WebsiteSpecification } from '../lib/websiteCreation/types';
import WebsitePreviewRenderer from '../components/websiteCreation/WebsitePreviewRenderer';

export default function PublicCreationPreview() {
  const { token } = useParams<{ token: string }>();
  const [specification, setSpecification] = useState<WebsiteSpecification | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!token) { setError('Preview link is incomplete.'); setLoading(false); return; }
      const result = await supabase.rpc('get_public_creation_preview', { p_preview_token: token });
      if (!mounted) return;
      if (result.error) setError('This preview is unavailable or has been disabled.');
      else setSpecification(result.data as WebsiteSpecification);
      setLoading(false);
    };
    void load();
    return () => { mounted = false; };
  }, [token]);

  if (loading) return <div className="min-h-screen bg-ink-950 grid place-items-center"><Loader2 className="h-8 w-8 animate-spin text-accent-400" /></div>;
  if (error || !specification) return <div className="min-h-screen bg-ink-950 grid place-items-center px-6"><div className="max-w-md rounded-3xl border border-white/10 bg-white/[.03] p-8 text-center"><AlertCircle className="mx-auto h-8 w-8 text-red-400" /><h1 className="mt-4 text-xl font-semibold text-white">Preview unavailable</h1><p className="mt-2 text-sm text-gray-400">{error || 'This Avelixa preview is no longer public.'}</p></div></div>;
  return <div className="min-h-screen bg-slate-200"><WebsitePreviewRenderer spec={specification} /></div>;
}
