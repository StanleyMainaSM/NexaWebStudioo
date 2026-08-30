import { useEffect, useState } from 'react';
import { ArrowRight, Building2, Loader2, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../lib/auth';
import ConnectorClientReferralCard from '../../../components/portal/ConnectorClientReferralCard';

type Lead = { id: string; client_id: string | null; business_id: string | null; title: string; status: string | null; created_at: string };
type Business = { id: string; name: string; industry: string | null };
type Project = { id: string; business_id: string | null; title: string; status: string | null };

export default function ConnectorClients() {
  const { user } = useAuth();
  const [avlId, setAvlId] = useState<string | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [businesses, setBusinesses] = useState<Record<string, Business>>({});
  const [projects, setProjects] = useState<Record<string, Project>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user?.id) { setLoading(false); return; }
    let mounted = true;
    async function load() {
      setLoading(true); setError('');
      try {
        const [profileResult, leadResult] = await Promise.all([
          supabase.from('connector_profiles').select('avl_id').eq('user_id', user.id).maybeSingle(),
          supabase.from('leads').select('id,client_id,business_id,title,status,created_at').eq('connector_id', user.id).not('client_id', 'is', null).order('created_at', { ascending: false }),
        ]);
        if (profileResult.error) throw profileResult.error;
        if (leadResult.error) throw leadResult.error;
        const nextLeads = (leadResult.data || []) as Lead[];
        const businessIds = [...new Set(nextLeads.map((lead) => lead.business_id).filter(Boolean) as string[])];
        const nextBusinesses: Record<string, Business> = {};
        const nextProjects: Record<string, Project> = {};
        if (businessIds.length) {
          const [businessResult, projectResult] = await Promise.all([
            supabase.from('businesses').select('id,name,industry').in('id', businessIds),
            supabase.from('projects').select('id,business_id,title,status').eq('connector_id', user.id).in('business_id', businessIds),
          ]);
          if (businessResult.error) throw businessResult.error;
          if (projectResult.error) throw projectResult.error;
          ((businessResult.data || []) as Business[]).forEach((business) => { nextBusinesses[business.id] = business; });
          ((projectResult.data || []) as Project[]).forEach((project) => { if (project.business_id) nextProjects[project.business_id] = project; });
        }
        if (!mounted) return;
        setAvlId(profileResult.data?.avl_id || null);
        setLeads(nextLeads);
        setBusinesses(nextBusinesses);
        setProjects(nextProjects);
      } catch (loadError) {
        console.error('Connector client referrals load error:', loadError);
        if (mounted) setError(loadError instanceof Error ? loadError.message : 'Unable to load referred clients.');
      } finally { if (mounted) setLoading(false); }
    }
    void load();
    return () => { mounted = false; };
  }, [user?.id]);

  if (loading) return <div className="glass rounded-2xl p-8"><div className="flex items-center gap-3 text-gray-300"><Loader2 className="h-5 w-5 animate-spin text-accent-400" />Loading referred clients...</div></div>;

  return <div className="space-y-6"><Link to="/portal/connector" className="inline-flex items-center text-sm text-gray-400 hover:text-white">← Back to Dashboard</Link><div><div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent-500/10"><Users className="h-5 w-5 text-accent-400" /></div><div><h1 className="text-2xl font-bold text-white">Clients</h1><p className="mt-1 text-sm text-gray-400">Share your Client link and track client-originated requests already attributed to you.</p></div></div></div><ConnectorClientReferralCard avlId={avlId} />{error && <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">{error}</div>}<section className="glass rounded-2xl border border-ink-800/50 p-6"><div className="flex items-center justify-between gap-4"><div><p className="text-xs uppercase tracking-[0.2em] text-gray-500">Attributed requests</p><h2 className="mt-2 text-xl font-semibold text-white">{leads.length} referred client request{leads.length === 1 ? '' : 's'}</h2></div><Link to="/portal/connector/leads" className="text-sm text-accent-400">My Leads <ArrowRight className="ml-1 inline h-4 w-4" /></Link></div>{leads.length === 0 ? <p className="mt-5 text-sm text-gray-400">No completed client referrals yet. Share your personal Client link above.</p> : <div className="mt-5 space-y-3">{leads.map((lead) => { const business = lead.business_id ? businesses[lead.business_id] : undefined; const project = lead.business_id ? projects[lead.business_id] : undefined; return <div key={lead.id} className="rounded-xl border border-white/10 bg-white/[0.02] p-4"><div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div className="flex min-w-0 gap-3"><Building2 className="mt-0.5 h-5 w-5 shrink-0 text-accent-400" /><div className="min-w-0"><p className="truncate font-medium text-white">{business?.name || lead.title}</p><p className="mt-1 text-xs text-gray-500">{business?.industry || 'Business'} · Submitted {new Date(lead.created_at).toLocaleDateString('en-KE')}</p></div></div><span className="rounded-full border border-accent-500/20 bg-accent-500/10 px-3 py-1 text-xs capitalize text-accent-300">{(lead.status || 'submitted').replace(/_/g, ' ')}</span></div>{project && <div className="mt-4 rounded-xl border border-accent-500/10 bg-accent-500/5 p-3"><p className="text-xs uppercase tracking-widest text-gray-500">Project</p><p className="mt-1 text-sm text-white">{project.title}</p><p className="mt-1 text-xs capitalize text-gray-500">{(project.status || 'pending').replace(/_/g, ' ')}</p></div>}</div>; })}</div>}</section><div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 text-xs text-gray-500">Client identity is intentionally limited to information already exposed through your Connector-owned lead/business relationship. Internal profile and financial information remains private.</div></div>;
}
