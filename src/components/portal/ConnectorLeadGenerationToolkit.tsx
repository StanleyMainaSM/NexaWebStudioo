import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, CheckCircle2, Clipboard, Crosshair, Search, Send, Sparkles, Target, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { GOOD_PROSPECTS, LEAD_FIND_STEPS, LEAD_HUNTING_CATEGORIES, OUTREACH_SCRIPTS } from '../../lib/connectorLeadGeneration';

export default function ConnectorLeadGenerationToolkit() {
  const { user, roles } = useAuth();
  const [stats, setStats] = useState({ submitted: 0, active: 0, won: 0, projects: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [scriptIndex, setScriptIndex] = useState(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!user?.id || !roles.includes('connector')) {
      setLoading(false);
      return;
    }
    let mounted = true;
    async function load() {
      setLoading(true);
      setError('');
      try {
        const [leadsResult, projectsResult] = await Promise.all([
          supabase.from('leads').select('status').eq('connector_id', user.id),
          supabase.from('projects').select('id,status').eq('connector_id', user.id),
        ]);
        if (leadsResult.error) throw leadsResult.error;
        if (projectsResult.error) throw projectsResult.error;
        const rows = leadsResult.data || [];
        const projects = projectsResult.data || [];
        const activeStatuses = new Set(['pending', 'submitted', 'contacted', 'qualified', 'proposal']);
        const won = rows.filter((lead) => String(lead.status || '').toLowerCase() === 'won').length;
        if (mounted) {
          setStats({ submitted: rows.length, active: rows.filter((lead) => activeStatuses.has(String(lead.status || 'pending').toLowerCase())).length, won, projects: projects.length });
        }
      } catch (e) {
        if (mounted) setError(e instanceof Error ? e.message : 'Unable to load lead activity.');
      } finally {
        if (mounted) setLoading(false);
      }
    }
    void load();
    return () => { mounted = false; };
  }, [user?.id, roles]);

  const script = OUTREACH_SCRIPTS[scriptIndex];
  const progress = stats.submitted > 0 ? Math.min(100, Math.round((stats.won / stats.submitted) * 100)) : 0;
  const statItems = useMemo(() => [
    ['Leads Submitted', stats.submitted],
    ['In Progress', stats.active],
    ['Won Leads', stats.won],
    ['Projects Generated', stats.projects],
  ], [stats]);

  async function copyScript() {
    try {
      await navigator.clipboard.writeText(script[1]);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setError('Clipboard access was not available. Select the message and copy it manually.');
    }
  }

  if (!user?.id || !roles.includes('connector')) return null;

  return (
    <section className="rounded-2xl border border-accent-500/20 bg-accent-500/[0.035] p-6 sm:p-7 space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-accent-500/10 flex items-center justify-center"><Target className="w-5 h-5 text-accent-400" /></div>
            <div><p className="text-[10px] uppercase tracking-[0.22em] text-accent-400 font-bold">Lead generation</p><h2 className="text-xl font-semibold text-white">Find Your Next Client</h2></div>
          </div>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-gray-400">Your job is to identify businesses that could benefit from a better online presence, start the conversation, and submit qualified opportunities to Avelixa. Avelixa handles the project workflow after submission.</p>
        </div>
        <Link to="/portal/leads/new" className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-accent-600 px-5 py-3 text-sm font-semibold text-white hover:bg-accent-500"><Send className="w-4 h-4" /> Submit a Business Lead <ArrowRight className="w-4 h-4" /></Link>
      </div>

      {error && <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300">{error}</div>}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {statItems.map(([label, value]) => <div key={label} className="rounded-xl border border-white/10 bg-white/[0.025] p-4"><p className="text-[10px] uppercase tracking-widest text-gray-500">{label}</p><p className="mt-2 text-2xl font-light text-white">{loading ? '—' : value}</p></div>)}
      </div>

      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
        <div className="flex items-center justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-widest text-gray-400">Lead-to-project momentum</p><p className="mt-1 text-xs text-gray-500">Based on your submitted leads that have reached Won status.</p></div><span className="text-sm font-semibold text-accent-300">{loading ? '—' : `${progress}%`}</span></div>
        <div className="mt-3 h-2 rounded-full bg-white/5 overflow-hidden"><div className="h-full rounded-full bg-accent-500 transition-all" style={{ width: `${progress}%` }} /></div>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-3"><Crosshair className="w-4 h-4 text-accent-300" /><h3 className="text-sm font-semibold text-white">Businesses worth hunting</h3></div>
        <div className="flex flex-wrap gap-2">{LEAD_HUNTING_CATEGORIES.map((category) => <span key={category} className="rounded-full border border-white/10 bg-white/[0.025] px-3 py-1.5 text-xs text-gray-300">{category}</span>)}</div>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
          <div className="flex items-center gap-2 mb-4"><Sparkles className="w-4 h-4 text-accent-300" /><h3 className="text-sm font-semibold text-white">What makes a good prospect?</h3></div>
          <ul className="space-y-2">{GOOD_PROSPECTS.map((item) => <li key={item} className="flex gap-2 text-sm text-gray-400"><CheckCircle2 className="w-4 h-4 shrink-0 text-accent-400 mt-0.5" />{item}</li>)}</ul>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
          <div className="flex items-center gap-2 mb-4"><Search className="w-4 h-4 text-accent-300" /><h3 className="text-sm font-semibold text-white">How to find businesses</h3></div>
          <div className="space-y-3">{LEAD_FIND_STEPS.map(([title, detail], index) => <div key={title} className="flex gap-3"><span className="font-mono text-[10px] text-accent-400 pt-0.5">0{index + 1}</span><div><p className="text-sm font-medium text-white">{title}</p><p className="mt-1 text-xs leading-relaxed text-gray-500">{detail}</p></div></div>)}</div>
        </div>
      </div>

      <div className="rounded-xl border border-accent-500/15 bg-accent-500/[0.035] p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"><div><p className="text-[10px] uppercase tracking-widest text-accent-300 font-bold">Outreach toolkit</p><h3 className="mt-1 text-sm font-semibold text-white">Start the conversation professionally</h3></div><div className="flex flex-wrap gap-2">{OUTREACH_SCRIPTS.map(([title], index) => <button key={title} type="button" onClick={() => setScriptIndex(index)} className={`rounded-lg px-3 py-2 text-xs font-semibold ${scriptIndex === index ? 'bg-accent-600 text-white' : 'bg-white/5 text-gray-400 hover:text-white'}`}>{title}</button>)}</div></div>
        <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-4"><div className="flex items-start justify-between gap-4"><p className="text-sm leading-relaxed text-gray-300">{script[1]}</p><button type="button" onClick={() => void copyScript()} className="shrink-0 inline-flex items-center gap-1.5 text-xs font-semibold text-accent-300 hover:text-accent-200"><Clipboard className="w-3.5 h-3.5" />{copied ? 'Copied' : 'Copy'}</button></div></div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-xl border border-white/10 bg-white/[0.02] p-5"><div><p className="text-sm font-semibold text-white">Your next project could be one business away.</p><p className="mt-1 text-xs text-gray-500">Find businesses. Submit qualified leads. Let Avelixa handle the web development. Results are never guaranteed.</p></div><Link to="/portal/connector/leads" className="inline-flex items-center gap-2 text-sm font-semibold text-accent-300 hover:text-accent-200">View My Leads <TrendingUp className="w-4 h-4" /></Link></div>
    </section>
  );
}
