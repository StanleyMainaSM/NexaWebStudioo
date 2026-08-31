import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, ArrowRight, Check, Loader2, Sparkles } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { generateWebsiteSpecification, validateBusinessInformation } from '../lib/websiteCreation/generator';
import type { BusinessInformation, CreationProject, WebsiteSectionId, WebsiteSpecification, WebsiteTemplate } from '../lib/websiteCreation/types';
import WebsitePreviewRenderer from '../components/websiteCreation/WebsitePreviewRenderer';

const emptyBusiness: BusinessInformation = { businessName: '', industry: '', businessDescription: '', services: [], products: [], targetAudience: '', location: '', phone: '', email: '', whatsapp: '', socialLinks: {}, logoUrl: '', brandColors: {}, imagery: [], websiteType: 'Business website', specialRequirements: '' };
const splitList = (value: string) => value.split(',').map((item) => item.trim()).filter(Boolean);

export default function WebsiteCreationStudio({ creationProjectId, leadId }: { creationProjectId?: string; leadId?: string }) {
  const { user, roles } = useAuth();
  const [params] = useSearchParams();
  const resolvedLeadId = leadId || params.get('leadId') || undefined;
  const [templates, setTemplates] = useState<WebsiteTemplate[]>([]);
  const [business, setBusiness] = useState<BusinessInformation>(emptyBusiness);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [requestedSections, setRequestedSections] = useState<WebsiteSectionId[]>([]);
  const [project, setProject] = useState<CreationProject | null>(null);
  const [specification, setSpecification] = useState<WebsiteSpecification | null>(null);
  const [usage, setUsage] = useState({ used: 0, limit: 5, remaining: 5 });
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [savingProject, setSavingProject] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const selectedTemplate = useMemo(() => templates.find((template) => template.id === selectedTemplateId) || null, [templates, selectedTemplateId]);
  const isAuthenticated = Boolean(user?.id);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true); setError('');
      try {
        const templateResult = await supabase.from('website_templates').select('id,slug,name,description,categories,visual_style,sections,typography,color_direction,layout,preview,is_active,is_protected').eq('is_active', true).order('name');
        if (templateResult.error) throw templateResult.error;
        if (!mounted) return;
        const loadedTemplates = (templateResult.data || []) as unknown as WebsiteTemplate[];
        setTemplates(loadedTemplates);
        if (!selectedTemplateId && loadedTemplates[0]) setSelectedTemplateId(loadedTemplates[0].id);
        if (isAuthenticated) {
          const usageResult = await supabase.rpc('get_creation_generation_status');
          if (!usageResult.error && usageResult.data) setUsage(usageResult.data as typeof usage);
        }
        const existingId = creationProjectId || params.get('creationProjectId');
        if (existingId && isAuthenticated) {
          const result = await supabase.from('creation_projects').select('*').eq('id', existingId).maybeSingle();
          if (result.error) throw result.error;
          if (result.data) {
            const loaded = result.data as unknown as CreationProject;
            setProject(loaded); setBusiness(loaded.business_info || emptyBusiness); setSpecification(loaded.specification);
            if (loaded.selected_template_id) setSelectedTemplateId(loaded.selected_template_id);
            setRequestedSections(loaded.requested_sections || []);
          }
        }
        if (resolvedLeadId && isAuthenticated) {
          const leadResult = await supabase.from('leads').select('id,business_id,connector_id,requirements').eq('id', resolvedLeadId).maybeSingle();
          if (!leadResult.error && leadResult.data) {
            const lead = leadResult.data;
            const businessResult = await supabase.from('businesses').select('id,name,industry,contact_name,email,phone').eq('id', lead.business_id).maybeSingle();
            if (!businessResult.error && businessResult.data) {
              const businessRecord = businessResult.data;
              setBusiness((current) => ({ ...current, businessName: businessRecord.name || '', industry: businessRecord.industry || '', email: businessRecord.email || '', phone: businessRecord.phone || '', specialRequirements: lead.requirements || '' }));
            }
          }
        }
      } catch (err) { if (mounted) setError(err instanceof Error ? err.message : 'Unable to load Template Studio.'); }
      finally { if (mounted) setLoading(false); }
    };
    void load();
    return () => { mounted = false; };
  }, [creationProjectId, isAuthenticated, params, resolvedLeadId]);

  function toggleSection(section: WebsiteSectionId) { setRequestedSections((current) => current.includes(section) ? current.filter((item) => item !== section) : [...current, section]); }

  async function ensureProject() {
    if (!user) throw new Error('Sign in to save a creation project and use your generation allowance.');
    if (project) return project;
    const role = roles.map((value) => value.toLowerCase());
    const connectorId = role.includes('connector') ? user.id : null;
    const clientId = role.includes('client') ? user.id : null;
    const result = await supabase.rpc('create_creation_project', { p_type: 'website', p_title: `${business.businessName || 'Website'} Preview`, p_client_id: clientId, p_connector_id: connectorId, p_lead_id: resolvedLeadId || null, p_business_id: null, p_project_id: null, p_business_info: business, p_requested_sections: requestedSections });
    if (result.error) throw result.error;
    const created: CreationProject = { id: result.data, type: 'website', client_id: clientId, connector_id: connectorId, operator_id: null, lead_id: resolvedLeadId || null, project_id: null, business_id: null, title: `${business.businessName || 'Website'} Preview`, business_info: business, requested_sections: requestedSections, selected_template_id: null, specification: null, attribution_enabled: true, status: 'draft', created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    setProject(created); return created;
  }

  async function generate() {
    setError(''); setNotice('');
    const validation = validateBusinessInformation(business);
    if (validation.length) { setError(validation.join(' ')); return; }
    if (!selectedTemplate) { setError('Select a template first.'); return; }
    if (!isAuthenticated) { setError('Sign in to generate a saved website preview and use the five-generation allowance.'); return; }
    if (usage.remaining <= 0) { setError('Your five free template generations have been used. Upgrade access can be added later.'); return; }
    setGenerating(true);
    try {
      const currentProject = await ensureProject();
      const spec = generateWebsiteSpecification(business, selectedTemplate, requestedSections, currentProject.attribution_enabled);
      const result = await supabase.rpc('consume_creation_generation', { p_creation_project_id: currentProject.id, p_template_id: selectedTemplate.id, p_requested_sections: spec.sections, p_specification: spec });
      if (result.error) throw result.error;
      const nextUsage = result.data as { generation_count: number; generation_limit: number };
      setUsage({ used: nextUsage.generation_count, limit: nextUsage.generation_limit, remaining: Math.max(nextUsage.generation_limit - nextUsage.generation_count, 0) });
      setSpecification(spec); setProject((current) => current ? { ...current, selected_template_id: selectedTemplate.id, requested_sections: spec.sections, specification: spec, status: 'preview' } : current); setNotice('Preview regenerated and saved to the creation project.');
    } catch (err) { setError(err instanceof Error ? err.message : 'Generation failed.'); }
    finally { setGenerating(false); }
  }

  async function saveBusinessInformation() {
    if (!project) { setNotice('Business information will be saved when you generate the first preview.'); return; }
    setSavingProject(true); setError('');
    const result = await supabase.from('creation_projects').update({ title: `${business.businessName || 'Website'} Preview`, business_info: business, requested_sections: requestedSections }).eq('id', project.id);
    if (result.error) setError(result.error.message); else setNotice('Business information saved.');
    setSavingProject(false);
  }
  async function requestDevelopment() {
    if (!project) return;
    const result = await supabase.from('creation_projects').update({ status: 'requested' }).eq('id', project.id);
    if (result.error) setError(result.error.message); else { setProject((current) => current ? { ...current, status: 'requested' } : current); setNotice('Professional development request submitted.'); }
  }

  if (loading) return <div className="flex min-h-96 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-accent-400" /></div>;
  return <div className="space-y-8">
    <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end"><div><div className="inline-flex items-center gap-2 rounded-full border border-accent-500/20 bg-accent-500/5 px-3 py-1 text-xs font-bold uppercase tracking-[.18em] text-accent-400"><Sparkles className="h-3.5 w-3.5" /> Template Studio</div><h1 className="mt-4 text-3xl font-bold tracking-tight text-white md:text-4xl">Create a polished website preview</h1><p className="mt-2 max-w-2xl text-gray-400">Enter the business details, choose a visual system, and generate a structured Avelixa preview.</p></div>{isAuthenticated && <div className="rounded-2xl border border-white/10 bg-white/[.03] px-4 py-3 text-sm"><span className="text-gray-400">Free generations</span><span className="ml-2 font-bold text-white">{usage.remaining} / {usage.limit} remaining</span></div>}</div>
    {(error || notice) && <div className={`rounded-2xl border px-4 py-3 text-sm ${error ? 'border-red-500/20 bg-red-500/5 text-red-300' : 'border-emerald-500/20 bg-emerald-500/5 text-emerald-300'}`}>{error ? <AlertCircle className="mr-2 inline h-4 w-4" /> : <Check className="mr-2 inline h-4 w-4" />}{error || notice}</div>}
    <div className="grid gap-8 xl:grid-cols-[420px_1fr]">
      <div className="space-y-6 rounded-3xl border border-white/10 bg-white/[.03] p-6"><div><h2 className="font-semibold text-white">Business information</h2><p className="mt-1 text-xs text-gray-500">This information becomes the structured source for the preview.</p></div>
        <div className="grid gap-4">{([['businessName','Business name'],['industry','Industry'],['location','Location'],['phone','Phone'],['email','Email'],['whatsapp','WhatsApp'],['targetAudience','Target audience'],['websiteType','Website type']] as const).map(([key,label]) => <label key={key} className="text-sm"><span className="mb-1.5 block text-gray-400">{label}</span><input value={business[key] || ''} onChange={(event) => setBusiness((current) => ({ ...current, [key]: event.target.value }))} className="w-full rounded-xl border border-white/10 bg-ink-950 px-3 py-2.5 text-white outline-none focus:border-accent-500/50" /></label>)}
          <label className="text-sm"><span className="mb-1.5 block text-gray-400">Business description</span><textarea rows={4} value={business.businessDescription || ''} onChange={(event) => setBusiness((current) => ({ ...current, businessDescription: event.target.value }))} className="w-full rounded-xl border border-white/10 bg-ink-950 px-3 py-2.5 text-white outline-none focus:border-accent-500/50" /></label>
          <label className="text-sm"><span className="mb-1.5 block text-gray-400">Services (comma separated)</span><input value={(business.services || []).join(', ')} onChange={(event) => setBusiness((current) => ({ ...current, services: splitList(event.target.value) }))} className="w-full rounded-xl border border-white/10 bg-ink-950 px-3 py-2.5 text-white outline-none focus:border-accent-500/50" /></label>
          <label className="text-sm"><span className="mb-1.5 block text-gray-400">Products (comma separated)</span><input value={(business.products || []).join(', ')} onChange={(event) => setBusiness((current) => ({ ...current, products: splitList(event.target.value) }))} className="w-full rounded-xl border border-white/10 bg-ink-950 px-3 py-2.5 text-white outline-none focus:border-accent-500/50" /></label>
          <label className="text-sm"><span className="mb-1.5 block text-gray-400">Logo URL</span><input value={business.logoUrl || ''} onChange={(event) => setBusiness((current) => ({ ...current, logoUrl: event.target.value }))} className="w-full rounded-xl border border-white/10 bg-ink-950 px-3 py-2.5 text-white outline-none focus:border-accent-500/50" /></label>
          <label className="text-sm"><span className="mb-1.5 block text-gray-400">Special requirements</span><textarea rows={3} value={business.specialRequirements || ''} onChange={(event) => setBusiness((current) => ({ ...current, specialRequirements: event.target.value }))} className="w-full rounded-xl border border-white/10 bg-ink-950 px-3 py-2.5 text-white outline-none focus:border-accent-500/50" /></label></div>
        <button type="button" onClick={() => void saveBusinessInformation()} disabled={savingProject} className="w-full rounded-xl border border-white/10 px-4 py-3 text-sm font-semibold text-gray-200 hover:bg-white/5 disabled:opacity-50">{savingProject ? 'Saving…' : 'Save business information'}</button>
      </div>
      <div className="space-y-6"><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{templates.map((template) => <button type="button" key={template.id} onClick={() => { setSelectedTemplateId(template.id); setRequestedSections([]); }} className={`text-left rounded-2xl border p-5 transition ${selectedTemplateId === template.id ? 'border-accent-500/50 bg-accent-500/10' : 'border-white/10 bg-white/[.03] hover:border-white/20'}`}><div className="flex items-center justify-between gap-3"><span className="font-semibold text-white">{template.name}</span>{selectedTemplateId === template.id && <Check className="h-4 w-4 text-accent-400" />}</div><p className="mt-2 text-xs leading-5 text-gray-500">{template.description}</p><div className="mt-4 flex flex-wrap gap-1.5">{template.categories.slice(0,3).map((category) => <span key={category} className="rounded-full bg-white/5 px-2 py-1 text-[10px] text-gray-400">{category}</span>)}</div></button>)}</div>
        {selectedTemplate && <div className="rounded-3xl border border-white/10 bg-white/[.03] p-5"><div className="flex flex-col justify-between gap-4 md:flex-row md:items-center"><div><h2 className="font-semibold text-white">Sections</h2><p className="mt-1 text-xs text-gray-500">Leave empty to use the template’s default order.</p></div><button type="button" onClick={() => void generate()} disabled={generating || !isAuthenticated || usage.remaining <= 0} className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent-500 px-5 py-3 text-sm font-bold text-white hover:bg-accent-400 disabled:cursor-not-allowed disabled:opacity-50">{generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}{generating ? 'Generating…' : 'Generate preview'}<ArrowRight className="h-4 w-4" /></button></div><div className="mt-4 flex flex-wrap gap-2">{selectedTemplate.sections.map((section) => <button key={section} type="button" onClick={() => toggleSection(section)} className={`rounded-full border px-3 py-1.5 text-xs ${requestedSections.includes(section) ? 'border-accent-500/40 bg-accent-500/10 text-accent-300' : 'border-white/10 text-gray-400'}`}>{section}</button>)}</div></div>}
        {specification ? <div className="rounded-[2rem] border border-white/10 bg-slate-200 p-2"><WebsitePreviewRenderer spec={specification} /></div> : <div className="grid min-h-[520px] place-items-center rounded-[2rem] border border-dashed border-white/10 bg-white/[.02] p-10 text-center"><div><Sparkles className="mx-auto h-8 w-8 text-accent-400" /><h2 className="mt-4 text-xl font-semibold text-white">Your preview will appear here</h2><p className="mx-auto mt-2 max-w-md text-sm text-gray-500">Select a template and generate a preview. The renderer consumes the same structured specification that will later power professional development.</p>{!isAuthenticated && <p className="mt-4 text-xs font-semibold text-accent-300">Sign in to use the five-generation allowance.</p>}</div></div>}
        {project && specification && <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[.03] p-4"><div><div className="text-sm font-semibold text-white">Creation project</div><div className="mt-1 text-xs text-gray-500">Status: {project.status}</div></div>{roles.some((role) => role.toLowerCase() === 'client') && <button type="button" onClick={() => void requestDevelopment()} className="rounded-xl border border-accent-500/30 bg-accent-500/10 px-4 py-2.5 text-sm font-semibold text-accent-300 hover:bg-accent-500/20">Request professional development</button>}</div>}
      </div>
    </div>
  </div>;
}
