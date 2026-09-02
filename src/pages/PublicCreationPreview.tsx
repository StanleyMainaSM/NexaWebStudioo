import { useEffect, useState } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import { useParams } from 'react-router-dom';
import GeneratedWebsitePreview from '../components/websiteCreation/GeneratedWebsitePreview';
import { supabase } from '../lib/supabase';
import { generateWebsiteFromSpecification, validateWebsiteSpecification } from '../lib/websiteCreation/generator';
import type { WebsiteSpecification, WebsiteTemplate } from '../lib/websiteCreation/types';

type PublishedWebsitePayload = {
  output_identity: string;
  output_version: string;
  generated_at: string;
  published_at: string;
  specification: WebsiteSpecification;
};

export default function PublicCreationPreview({ publishedOnly = false }: { publishedOnly?: boolean }) {
  const { token, outputIdentity } = useParams<{ token: string; outputIdentity?: string }>();
  const [specification, setSpecification] = useState<WebsiteSpecification | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        if (!token) throw new Error(publishedOnly ? 'This website address is incomplete.' : 'Preview link is incomplete.');

        if (publishedOnly) {
          const result = await supabase.rpc('get_public_creation_website', {
            p_preview_token: token,
          });
          if (result.error || !result.data) throw new Error('This website has not been published yet.');

          const payload = result.data as PublishedWebsitePayload;
          const persisted = payload.specification;
          const validationErrors = validateWebsiteSpecification(persisted);
          if (validationErrors.length) throw new Error('This published website contains invalid data and cannot be displayed.');
          if (!payload.output_identity || !payload.output_version || !payload.published_at) throw new Error('The published website is unavailable.');

          if (mounted) setSpecification(persisted);
          return;
        }

        const result = await supabase.rpc('get_public_creation_preview', {
          p_preview_token: token,
          ...(outputIdentity ? { p_output_identity: outputIdentity } : {}),
        });
        if (result.error || !result.data) throw new Error('This preview is unavailable or has been disabled.');
        const persisted = result.data as WebsiteSpecification;
        const templateResult = await supabase
          .from('website_templates')
          .select('id,slug,name,description,categories,visual_style,sections,typography,color_direction,layout,preview,is_active,is_protected')
          .eq('id', persisted.template.id)
          .eq('is_active', true)
          .maybeSingle();
        if (templateResult.error || !templateResult.data) throw new Error('The template used by this preview is no longer available.');
        const generated = generateWebsiteFromSpecification(persisted, templateResult.data as unknown as WebsiteTemplate);
        if (!generated.ok) throw new Error('This preview contains invalid website data and cannot be displayed.');
        if (mounted) setSpecification(generated.artifact);
      } catch (err) {
        if (mounted) setError(err instanceof Error ? err.message : (publishedOnly ? 'This website is unavailable.' : 'This preview is unavailable or has been disabled.'));
      } finally {
        if (mounted) setLoading(false);
      }
    };
    void load();
    return () => { mounted = false; };
  }, [token, outputIdentity, publishedOnly]);

  if (loading) return <div className="grid min-h-screen place-items-center bg-ink-950"><Loader2 className="h-8 w-8 animate-spin text-accent-400" /></div>;
  if (error || !specification) return <div className="grid min-h-screen place-items-center bg-ink-950 px-6"><div className="max-w-md rounded-3xl border border-white/10 bg-white/[.03] p-8 text-center"><AlertCircle className="mx-auto h-8 w-8 text-red-400" /><h1 className="mt-4 text-xl font-semibold text-white">{publishedOnly ? 'Website unavailable' : 'Preview unavailable'}</h1><p className="mt-2 text-sm text-gray-400">{error || (publishedOnly ? 'This website has not been published yet.' : 'This Avelixa preview is no longer public.')}</p></div></div>;
  return <GeneratedWebsitePreview specification={specification} published={publishedOnly} />;
}
