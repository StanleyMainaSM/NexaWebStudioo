import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, ArrowDown, ArrowLeft, ArrowUp, Check, Eye, Loader2, Monitor, Palette, Plus, Save, Smartphone, Sparkles, Tablet, Trash2 } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { generateWebsiteFromSpecification, generateWebsiteOutputFromSpecification, generateWebsiteSpecification, validateBusinessInformation } from '../lib/websiteCreation/generator';
import { getWebsiteGenerationLifecycleState, lifecycleStateLabel } from '../lib/websiteCreation/lifecycle';
import { addWebsiteSection, applyWebsiteSpecificationPatch, removeWebsiteSection, updateWebsiteBusinessField, updateWebsiteNavigationItem, updateWebsiteSectionContent } from '../lib/websiteCreation/editor';
import type { BusinessInformation, CreationProject, WebsiteSectionId, WebsiteSpecification, WebsiteTemplate } from '../lib/websiteCreation/types';
import WebsitePreviewRenderer from '../components/websiteCreation/WebsitePreviewRenderer';

const emptyBusiness: BusinessInformation = { businessName: '', industry: '', businessDescription: '', services: [], products: [], targetAudience: '', location: '', phone: '', email: '', whatsapp: '', socialLinks: {}, logoUrl: '', brandColors: {}, imagery: [], websiteType: 'Business website', specialRequirements: '' };
const sectionLabels: Record<WebsiteSectionId, string> = { navbar: 'Navigation', hero: 'Hero', about: 'About', services: 'Services', products: 'Products', gallery: 'Gallery', testimonials: 'Testimonials', pricing: 'Pricing', faq: 'FAQ', contact: 'Contact', location: 'Location', footer: 'Footer' };
const structuralSections = new Set<WebsiteSectionId>(['navbar', 'hero', 'footer']);
type PreviewMode = 'desktop' | 'tablet' | 'mobile';
type HeroContent = { eyebrow?: string; title?: string; subtitle?: string; cta?: string };
const clone = (spec: WebsiteSpecification) => JSON.parse(JSON.stringify(spec)) as WebsiteSpecification;
const record = (spec: WebsiteSpecification, section: WebsiteSectionId) => (spec.content[section] || {}) as Record<string, unknown>;
const items = (spec: WebsiteSpecification, section: WebsiteSectionId) => Array.isArray(record(spec, section).items) ? record(spec, section).items as unknown[] : [];
const list = (value: string) => value.split(',').map((v) => v.trim()).filter(Boolean);

function Field({ label, value, onChange, multiline = false }: { label: string; value: string; onChange: (value: string) => void; multiline?: boolean }) {
  return <label className="block text-sm"><span className="mb-1.5 block text-gray-400">{label}</span>{multiline ? <textarea rows={4} value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-xl border border-white/10 bg-ink-950 px-3 py-2.5 text-white outline-none focus:border-accent-500/50" /> : <input value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-xl border border-white/10 bg-ink-950 px-3 py-2.5 text-white outline-none focus:border-accent-500/50" />}</label>;
}

export default function WebsiteCreationStudio({ creationProjectId, leadId }: { creationProjectId?: string; leadId?: string }) {
  const { user, roles } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const resolvedLeadId = leadId || params.get('leadId') || undefined;
  const [templates, setTemplates] = useState<WebsiteTemplate[]>([]);
  const [project, setProject] = useState<CreationProject | null>(null);
  const [business, setBusiness] = useState<BusinessInformation>(emptyBusiness);
  const [specification, setSpecification] = useState<WebsiteSpecification | null>(null);
  const [persisted, setPersisted] = useState<WebsiteSpecification | null>(null);
  const [templateId, setTemplateId] = useState('');
  const [selectedSection, setSelectedSection] = useState<WebsiteSectionId>('hero');
  const [previewMode, setPreviewMode] = useState<PreviewMode>('desktop');
  const [usage, setUsage] = useState({ used: 0, limit: 5, remaining: 5 });
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishedOutputIdentity, setPublishedOutputIdentity] = useState<string | null>(null);
  const [publishedAt, setPublishedAt] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [templateWarning, setTemplateWarning] = useState<WebsiteTemplate | null>(null);
  const authenticated = Boolean(user?.id);
  const selectedTemplate = useMemo(() => templates.find((t) => t.id === templateId) || null, [templates, templateId]);
  const templateChanged = Boolean(specification && selectedTemplate && specification.template.id !== selectedTemplate.id);
  const dirty = Boolean(specification && (JSON.stringify(specification) !== JSON.stringify(persisted) || templateChanged));
  const lifecycleState = useMemo(() => getWebsiteGenerationLifecycleState(specification, project?.id, selectedTemplate, project), [specification, project, selectedTemplate]);
  const lifecycleDisplay = generating ? 'Generating…' : publishing ? 'Publishing…' : dirty ? 'Unsaved changes' : lifecycleStateLabel(lifecycleState);
  const publishedCurrent = Boolean(project?.latest_generated_output_identity && publishedOutputIdentity === project.latest_generated_output_identity && !dirty && lifecycleState === 'current');
  const canPublish = Boolean(authenticated && !publishing && !generating && !dirty && lifecycleState === 'current' && project?.id && project.latest_generated_output_identity && !publishedCurrent);
  const lifecycleClass = generating || publishing || dirty
    ? 'border-amber-500/30 bg-amber-500/10 text-amber-300'
    : publishedCurrent
      ? 'border-sky-500/20 bg-sky-500/5 text-sky-300'
      : lifecycleState === 'current'
        ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-300'
        : lifecycleState === 'generation_failed'
          ? 'border-red-500/20 bg-red-500/5 text-red-300'
          : 'border-white/10 bg-white/[.03] text-gray-400';
  const canOpenPublicPreview = Boolean(project?.public_preview_token && !dirty && lifecycleState === 'current');

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true); setError('');
      try {
        const templateResult = await supabase.from('website_templates').select('id,slug,name,description,categories,visual_style,sections,typography,color_direction,layout,preview,is_active,is_protected').eq('is_active', true).order('name');
        if (templateResult.error) throw templateResult.error;
        const loadedTemplates = (templateResult.data || []) as unknown as WebsiteTemplate[];
        if (!mounted) return;
        setTemplates(loadedTemplates);
        const existingId = creationProjectId || params.get('creationProjectId');
        if (authenticated) {
          const usageResult = await supabase.rpc('get_creation_generation_status');
          if (!usageResult.error && usageResult.data) setUsage(usageResult.data as typeof usage);
          if (existingId) {
            const result = await supabase.from('creation_projects').select('*').eq('id', existingId).maybeSingle();
            if (result.error) throw result.error;
            const loaded = result.data as unknown as CreationProject | null;
            if (!loaded) throw new Error('This website project is unavailable or you do not have access to it.');
            setProject(loaded); setBusiness(loaded.business_info || emptyBusiness); setSpecification(loaded.specification); setPersisted(loaded.specification ? clone(loaded.specification) : null);
            if (loaded.selected_template_id) setTemplateId(loaded.selected_template_id);
            if (loaded.specification?.sections?.length) setSelectedSection(loaded.specification.sections.includes('hero') ? 'hero' : loaded.specification.sections[0]);
            if (loaded.latest_generated_output_identity) {
              const artifactResult = await supabase.from('creation_generated_website_outputs').select('id,status,published_at').eq('creation_project_id', loaded.id).eq('id', loaded.latest_generated_output_identity).maybeSingle();
              if (!artifactResult.error && artifactResult.data?.status === 'published') {
                setPublishedOutputIdentity(artifactResult.data.id as string);
                setPublishedAt((artifactResult.data.published_at as string | null) || null);
              } else {
                setPublishedOutputIdentity(null); setPublishedAt(null);
              }
            }
          } else if (loadedTemplates[0]) setTemplateId(loadedTemplates[0].id);
        } else if (loadedTemplates[0]) setTemplateId(loadedTemplates[0].id);
        if (resolvedLeadId && authenticated) {
          const leadResult = await supabase.from('leads').select('id,business_id,connector_id,requirements').eq('id', resolvedLeadId).maybeSingle();
          const lead = leadResult.data;
          if (!leadResult.error && lead) {
            const businessResult = await supabase.from('businesses').select('id,name,industry,contact_name,email,phone').eq('id', lead.business_id).maybeSingle();
            const businessRecord = businessResult.data;
            if (!businessResult.error && businessRecord) setBusiness((current) => ({ ...current, businessName: businessRecord.name || '', industry: businessRecord.industry || '', email: businessRecord.email || '', phone: businessRecord.phone || '', specialRequirements: lead.requirements || '' }));
          }
        }
      } catch (err) { if (mounted) setError(err instanceof Error ? err.message : 'Unable to load Template Studio.'); }
      finally { if (mounted) setLoading(false); }
    };
    void load();
    return () => { mounted = false; };
  }, [creationProjectId, authenticated, params, resolvedLeadId]);

  const updateSpec = (next: WebsiteSpecification) => { setSpecification(next); setBusiness(next.business); };
  const editBusiness = <K extends keyof BusinessInformation>(field: K, value: BusinessInformation[K]) => { setBusiness((current) => ({ ...current, [field]: value })); if (specification) updateSpec(updateWebsiteBusinessField(specification, field, value)); };
  const editSection = (field: string, value: unknown) => { if (specification) updateSpec(updateWebsiteSectionContent(specification, selectedSection, field, value)); };

  async function ensureProject() {
    if (!user) throw new Error('Sign in to save a creation project and use your generation allowance.');
    if (project) return project;
    const normalized = roles.map((role) => role.toLowerCase());
    const result = await supabase.rpc('create_creation_project', { p_type: 'website', p_title: `${business.businessName || 'Website'} Website`, p_client_id: normalized.includes('client') ? user.id : null, p_connector_id: normalized.includes('connector') ? user.id : null, p_lead_id: resolvedLeadId || null, p_business_id: null, p_project_id: null, p_business_info: business, p_requested_sections: [] });
    if (result.error) throw result.error;
    const created: CreationProject = { id: result.data, type: 'website', client_id: normalized.includes('client') ? user.id : null, connector_id: normalized.includes('connector') ? user.id : null, operator_id: null, lead_id: resolvedLeadId || null, project_id: null, business_id: null, title: `${business.businessName || 'Website'} Website`, business_info: business, requested_sections: [], selected_template_id: null, specification: null, attribution_enabled: true, status: 'draft', created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    setProject(created); return created;
  }

  async function markGenerationFailed(projectId: string, message: string) {
    const failure = message || 'Website generation failed.';
    const result = await supabase.rpc('mark_creation_generation_failed', { p_creation_project_id: projectId, p_error: failure });
    if (!result.error) setProject((current) => current ? { ...current, generation_state: 'generation_failed', last_generation_error: failure } : current);
  }

  async function generate() {
    if (generating || publishing) return;
    setError(''); setNotice('');
    const validation = validateBusinessInformation(business);
    if (validation.length) { if (project) await markGenerationFailed(project.id, validation.join(' ')); setError(validation.join(' ')); return; }
    if (!selectedTemplate) { if (project) await markGenerationFailed(project.id, 'Select a template first.'); setError('Select a template first.'); return; }
    if (authenticated && usage.remaining <= 0) { if (project) await markGenerationFailed(project.id, 'Your five free template generations have been used.'); setError('Your five free template generations have been used.'); return; }
    setGenerating(true);
    let currentProject: CreationProject | null = project;
    try {
      const current = specification && specification.template.id === selectedTemplate.id
        ? generateWebsiteFromSpecification(specification, selectedTemplate)
        : { ok: true as const, artifact: generateWebsiteSpecification(business, selectedTemplate, [], currentProject?.attribution_enabled ?? true), template: selectedTemplate };
      if (!current.ok) {
        if (currentProject) await markGenerationFailed(currentProject.id, current.errors.join(' '));
        throw new Error(current.errors.join(' '));
      }
      const spec = current.artifact;
      if (!authenticated) {
        setSpecification(spec); setNotice('Preview generated. Sign in when you want to save it.');
        return;
      }
      currentProject = await ensureProject();
      const generatedAt = new Date().toISOString();
      const output = generateWebsiteOutputFromSpecification(spec, selectedTemplate, currentProject.id, generatedAt, null);
      if (!output.ok) {
        await markGenerationFailed(currentProject.id, output.errors.join(' '));
        throw new Error(output.errors.join(' '));
      }
      const result = await supabase.rpc('consume_creation_generation', {
        p_creation_project_id: currentProject.id,
        p_template_id: selectedTemplate.id,
        p_requested_sections: output.output.specification.sections,
        p_specification: output.output.specification,
        p_output_identity: output.output.id,
        p_output_version: output.output.outputVersion,
        p_generated_at: output.output.generatedAt,
      });
      if (result.error) {
        await markGenerationFailed(currentProject.id, result.error.message);
        throw result.error;
      }
      const next = result.data as { generation_count: number; generation_limit: number; public_preview_token?: string; latest_generated_output_identity?: string; latest_generated_output_version?: string; latest_generated_at?: string; generation_state?: 'current' };
      setUsage({ used: next.generation_count, limit: next.generation_limit, remaining: Math.max(next.generation_limit - next.generation_count, 0) });
      setSpecification(output.output.specification);
      setPersisted(clone(output.output.specification));
      setPublishedOutputIdentity(null);
      setPublishedAt(null);
      setProject({
        ...currentProject,
        selected_template_id: selectedTemplate.id,
        requested_sections: output.output.specification.sections,
        specification: output.output.specification,
        public_preview_token: next.public_preview_token || currentProject.public_preview_token || null,
        preview_enabled: true,
        latest_generated_output_identity: next.latest_generated_output_identity || output.output.id,
        latest_generated_output_version: next.latest_generated_output_version || output.output.outputVersion,
        latest_generated_at: next.latest_generated_at || output.output.generatedAt,
        generation_state: next.generation_state || 'current',
        last_generation_error: null,
        status: 'preview',
      });
      setSelectedSection(output.output.specification.sections.includes('hero') ? 'hero' : output.output.specification.sections[0]);
      setNotice('Website generated and saved.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Generation failed.';
      if (currentProject) await markGenerationFailed(currentProject.id, message);
      setError(message);
    } finally { setGenerating(false); }
  }

  async function publishWebsite() {
    if (publishing || generating) return;
    if (!project?.id || !project.latest_generated_output_identity || dirty || lifecycleState !== 'current') {
      setError('Generate the current website before publishing it.');
      return;
    }
    setPublishing(true); setError(''); setNotice('');
    try {
      const result = await supabase.rpc('publish_creation_generated_output', {
        p_creation_project_id: project.id,
        p_output_identity: project.latest_generated_output_identity,
      });
      if (result.error) throw result.error;
      const next = result.data as { output_identity: string; output_version: string; status: 'published'; published_at: string; idempotent?: boolean };
      setPublishedOutputIdentity(next.output_identity);
      setPublishedAt(next.published_at || null);
      setProject((current) => current ? { ...current, generation_state: 'current' } : current);
      setNotice(next.idempotent ? 'Website is already published.' : 'Website published successfully.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to publish the generated website.');
    } finally { setPublishing(false); }
  }

  async function saveSpecification() {
    if (!project || !specification) { setNotice('Generate a preview before saving editor changes.'); return; }
    if (templateChanged) { setNotice('Generate Website to apply the selected template.'); return; }
    setSaving(true); setError('');
    const result = await supabase.from('creation_projects').update({ business_info: specification.business, requested_sections: specification.sections, selected_template_id: specification.template.id, specification }).eq('id', project.id);
    if (result.error) setError('Unable to save your changes. Please try again.'); else { setPersisted(clone(specification)); setProject((current) => current ? { ...current, business_info: specification.business, requested_sections: specification.sections, selected_template_id: specification.template.id, specification, updated_at: new Date().toISOString() } : current); setNotice('All changes saved. Generate Website to update the current preview.'); }
    setSaving(false);
  }

  function moveSection(direction: -1 | 1) { if (!specification) return; const sections = [...specification.sections]; const index = sections.indexOf(selectedSection); const next = index + direction; if (index < 0 || next < 0 || next >= sections.length) return; [sections[index], sections[next]] = [sections[next], sections[index]]; updateSpec(applyWebsiteSpecificationPatch(specification, { kind: 'section_order', sections })); }
  function toggleSection(section: WebsiteSectionId) { if (!specification) return; updateSpec(specification.sections.includes(section) ? removeWebsiteSection(specification, section) : addWebsiteSection(specification, section)); setSelectedSection(section); }
  function chooseTemplate(template: WebsiteTemplate) { if (specification && template.id !== specification.template.id && dirty) setTemplateWarning(template); else setTemplateId(template.id); }

  const data = specification ? record(specification, selectedSection) : {};
  const hero = (specification?.content.hero || {}) as HeroContent;
  const width = previewMode === 'mobile' ? 'max-w-[390px]' : previewMode === 'tablet' ? 'max-w-[768px]' : 'max-w-none';
  const navTargets = specification?.sections.filter((section) => !structuralSections.has(section)) || [];

  if (loading) return <div className="flex min-h-96 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-accent-400" /></div>;
  return <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-4"><div className="flex items-center gap-3"><button type="button" onClick={() => navigate('/portal/creation-studio')} aria-label="Back to website projects" className="rounded-xl border border-white/10 p-2.5 text-gray-300 hover:bg-white/5"><ArrowLeft className="h-4 w-4" /></button><div><div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.18em] text-accent-400"><Sparkles className="h-3.5 w-3.5" />Template Studio</div><h1 className="mt-1 text-2xl font-bold text-white">{project?.title || 'New website'}</h1></div></div><div className="flex flex-wrap items-center gap-2"><span className={`rounded-full border px-3 py-2 text-xs font-semibold ${lifecycleClass}`}>{publishedCurrent ? 'Published' : lifecycleDisplay}</span>{authenticated && <span className="rounded-full border border-white/10 px-3 py-2 text-xs text-gray-400">{usage.remaining}/{usage.limit} generations</span>}<button type="button" onClick={() => void saveSpecification()} disabled={!dirty || saving || templateChanged || publishing} className="inline-flex items-center gap-2 rounded-xl bg-accent-500 px-4 py-2.5 text-sm font-bold text-ink-950 disabled:opacity-40"><Save className="h-4 w-4" />{saving ? 'Saving…' : 'Save'}</button></div></div>
    {(error || notice) && <div className={`rounded-2xl border px-4 py-3 text-sm ${error ? 'border-red-500/20 bg-red-500/5 text-red-300' : 'border-emerald-500/20 bg-emerald-500/5 text-emerald-300'}`}>{error ? <AlertCircle className="mr-2 inline h-4 w-4" /> : <Check className="mr-2 inline h-4 w-4" />}{error || notice}</div>}
    <div className="grid min-h-[calc(100vh-12rem)] overflow-hidden rounded-3xl border border-white/10 bg-[#0b0d12] xl:grid-cols-[250px_minmax(0,1fr)_320px]">
      <aside className="border-b border-white/10 p-4 xl:border-b-0 xl:border-r"><h2 className="text-sm font-semibold text-white">Website structure</h2>{!specification ? <div className="mt-5 space-y-3"><p className="text-xs leading-5 text-gray-500">Select a database-backed template and generate a website to open the editor.</p>{templates.map((template) => <button key={template.id} type="button" onClick={() => chooseTemplate(template)} className={`w-full rounded-xl border p-3 text-left ${templateId === template.id ? 'border-accent-500/40 bg-accent-500/10' : 'border-white/10 bg-white/[.02]'}`}><div className="text-sm font-semibold text-white">{template.name}</div><div className="mt-1 text-[11px] text-gray-500">{template.visual_style}</div></button>)}<button type="button" onClick={() => void generate()} disabled={generating || publishing || !selectedTemplate} className="w-full rounded-xl bg-accent-500 px-4 py-3 text-sm font-bold text-ink-950 disabled:opacity-40">{generating ? 'Generating…' : 'Generate website'}</button></div> : <><div className="mt-4 space-y-1">{specification.sections.map((section) => <button key={section} type="button" onClick={() => setSelectedSection(section)} className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm ${selectedSection === section ? 'bg-accent-500/10 text-accent-300' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}><span>{sectionLabels[section]}</span>{structuralSections.has(section) && <span className="text-[9px] uppercase tracking-widest text-gray-600">Core</span>}</button>)}</div><div className="my-4 border-t border-white/10" /><p className="text-[10px] font-bold uppercase tracking-widest text-gray-600">Add section</p><div className="mt-2 grid grid-cols-2 gap-1">{Object.keys(sectionLabels).filter((s) => !specification.sections.includes(s as WebsiteSectionId)).map((s) => <button key={s} type="button" onClick={() => toggleSection(s as WebsiteSectionId)} className="rounded-lg border border-white/5 px-2 py-2 text-[11px] text-gray-500 hover:border-accent-500/30 hover:text-accent-300"><Plus className="mx-auto mb-1 h-3 w-3" />{sectionLabels[s as WebsiteSectionId]}</button>)}</div></>}</aside>
      <main className="min-w-0 border-b border-white/10 bg-[#151820] xl:border-b-0 xl:border-r"><div className="flex items-center justify-between border-b border-white/10 bg-[#0f1117] px-4 py-3"><div className="flex items-center gap-1 rounded-xl border border-white/10 p-1"><button type="button" onClick={() => setPreviewMode('desktop')} aria-label="Desktop preview" className={`rounded-lg p-2 ${previewMode === 'desktop' ? 'bg-white/10 text-white' : 'text-gray-500'}`}><Monitor className="h-4 w-4" /></button><button type="button" onClick={() => setPreviewMode('tablet')} aria-label="Tablet preview" className={`rounded-lg p-2 ${previewMode === 'tablet' ? 'bg-white/10 text-white' : 'text-gray-500'}`}><Tablet className="h-4 w-4" /></button><button type="button" onClick={() => setPreviewMode('mobile')} aria-label="Mobile preview" className={`rounded-lg p-2 ${previewMode === 'mobile' ? 'bg-white/10 text-white' : 'text-gray-500'}`}><Smartphone className="h-4 w-4" /></button></div><div className="flex items-center gap-2 text-xs text-gray-500"><Eye className="h-4 w-4" />Live preview</div></div><div className="h-full overflow-auto p-4 md:p-6"><div className={`mx-auto w-full ${width}`}>{specification ? <WebsitePreviewRenderer spec={specification} /> : <div className="grid min-h-[620px] place-items-center rounded-3xl border border-dashed border-white/10 text-center"><div><Sparkles className="mx-auto h-8 w-8 text-accent-400" /><h2 className="mt-4 text-xl font-semibold text-white">Start your website</h2><p className="mt-2 max-w-sm text-sm text-gray-500">The preview uses the same typed specification and renderer that will be saved to your project.</p></div></div>}</div></div></main>
      <aside className="min-w-0 overflow-y-auto p-4 md:p-5"><div className="flex items-center gap-2"><Palette className="h-4 w-4 text-accent-400" /><h2 className="text-sm font-semibold text-white">Properties</h2></div>{!specification ? <div className="mt-5 space-y-4"><Field label="Business name" value={business.businessName} onChange={(v) => editBusiness('businessName', v)} /><Field label="Description" value={business.businessDescription || ''} onChange={(v) => editBusiness('businessDescription', v)} multiline /><Field label="Logo URL" value={business.logoUrl || ''} onChange={(v) => editBusiness('logoUrl', v)} /><Field label="Email" value={business.email || ''} onChange={(v) => editBusiness('email', v)} /><Field label="Phone" value={business.phone || ''} onChange={(v) => editBusiness('phone', v)} /></div> : <div className="mt-5 space-y-5">
        {selectedSection === 'navbar' && <><h3 className="text-sm font-semibold text-white">Navigation</h3>{specification.navigation.map((item) => <div key={item.section} className="space-y-2 rounded-xl border border-white/10 p-3"><Field label={sectionLabels[item.section]} value={item.label} onChange={(v) => updateSpec(updateWebsiteNavigationItem(specification, item.section, { label: v, section: item.section }))} /><label className="block text-xs text-gray-500">Destination<select value={item.section} onChange={(e) => updateSpec(updateWebsiteNavigationItem(specification, item.section, { label: item.label, section: e.target.value as WebsiteSectionId }))} className="mt-1 w-full rounded-lg border border-white/10 bg-ink-950 px-2 py-2 text-white">{navTargets.map((target) => <option key={target} value={target}>{`#${target}`}</option>)}</select></label></div>)}</>}
        {selectedSection === 'hero' && <><h3 className="text-sm font-semibold text-white">Hero</h3><Field label="Eyebrow" value={String((hero.eyebrow || ''))} onChange={(v) => editSection('eyebrow', v)} /><Field label="Headline" value={String(hero.title || '')} onChange={(v) => editSection('title', v)} /><Field label="Supporting text" value={String(hero.subtitle || '')} onChange={(v) => editSection('subtitle', v)} multiline /><Field label="CTA label" value={String(hero.cta || '')} onChange={(v) => editSection('cta', v)} /><Field label="Logo URL" value={specification.business.logoUrl || ''} onChange={(v) => editBusiness('logoUrl', v)} /></>}
        {selectedSection === 'about' && <><h3 className="text-sm font-semibold text-white">About</h3><Field label="Title" value={String(data.title || '')} onChange={(v) => editSection('title', v)} /><Field label="Body" value={String(data.body || '')} onChange={(v) => editSection('body', v)} multiline /></>}
        {(['services', 'products'] as WebsiteSectionId[]).includes(selectedSection) && <><h3 className="text-sm font-semibold text-white">{sectionLabels[selectedSection]}</h3><Field label="Items (comma separated)" value={items(specification, selectedSection).map(String).join(', ')} onChange={(v) => editSection('items', list(v))} multiline /></>}
        {selectedSection === 'gallery' && <><h3 className="text-sm font-semibold text-white">Gallery</h3><Field label="Image URLs (comma separated)" value={Array.isArray(data.images) ? (data.images as unknown[]).map(String).join(', ') : ''} onChange={(v) => editSection('images', list(v))} multiline /></>}
        {selectedSection === 'contact' && <><h3 className="text-sm font-semibold text-white">Contact</h3><Field label="Phone" value={String(data.phone || '')} onChange={(v) => editSection('phone', v)} /><Field label="Email" value={String(data.email || '')} onChange={(v) => editSection('email', v)} /><Field label="WhatsApp" value={String(data.whatsapp || '')} onChange={(v) => editSection('whatsapp', v)} /></>}
        {selectedSection === 'location' && <><h3 className="text-sm font-semibold text-white">Location</h3><Field label="Address" value={String(data.address || '')} onChange={(v) => editSection('address', v)} multiline /></>}
        {selectedSection === 'testimonials' && <><h3 className="text-sm font-semibold text-white">Testimonials</h3>{items(specification, 'testimonials').map((item, index) => { const row = item as { quote?: string; author?: string }; return <div key={index} className="space-y-2 rounded-xl border border-white/10 p-3"><Field label={`Quote ${index + 1}`} value={row.quote || ''} onChange={(v) => { const next = [...items(specification, 'testimonials')]; next[index] = { ...row, quote: v }; editSection('items', next); }} multiline /><Field label="Author" value={row.author || ''} onChange={(v) => { const next = [...items(specification, 'testimonials')]; next[index] = { ...row, author: v }; editSection('items', next); }} /></div>; })}</>}
        {selectedSection === 'pricing' && <><h3 className="text-sm font-semibold text-white">Pricing</h3>{items(specification, 'pricing').map((item, index) => { const row = item as { name?: string; price?: string }; return <div key={index} className="space-y-2 rounded-xl border border-white/10 p-3"><Field label={`Plan ${index + 1}`} value={row.name || ''} onChange={(v) => { const next = [...items(specification, 'pricing')]; next[index] = { ...row, name: v }; editSection('items', next); }} /><Field label="Price" value={row.price || ''} onChange={(v) => { const next = [...items(specification, 'pricing')]; next[index] = { ...row, price: v }; editSection('items', next); }} /></div>; })}<button type="button" onClick={() => editSection('items', [...items(specification, 'pricing'), { name: 'New plan', price: 'Contact us' }])} className="text-xs font-semibold text-accent-300"><Plus className="mr-1 inline h-3 w-3" />Add plan</button></>}
        {selectedSection === 'faq' && <><h3 className="text-sm font-semibold text-white">FAQ</h3>{items(specification, 'faq').map((item, index) => { const row = item as { question?: string; answer?: string }; return <div key={index} className="space-y-2 rounded-xl border border-white/10 p-3"><Field label={`Question ${index + 1}`} value={row.question || ''} onChange={(v) => { const next = [...items(specification, 'faq')]; next[index] = { ...row, question: v }; editSection('items', next); }} /><Field label="Answer" value={row.answer || ''} onChange={(v) => { const next = [...items(specification, 'faq')]; next[index] = { ...row, answer: v }; editSection('items', next); }} multiline /></div>; })}<button type="button" onClick={() => editSection('items', [...items(specification, 'faq'), { question: 'New question', answer: 'Answer' }])} className="text-xs font-semibold text-accent-300"><Plus className="mr-1 inline h-3 w-3" />Add question</button></>}
        {selectedSection === 'footer' && <Field label="Business name" value={specification.business.businessName} onChange={(v) => editBusiness('businessName', v)} />}
        <div className="border-t border-white/10 pt-4"><h3 className="text-xs font-bold uppercase tracking-widest text-gray-600">Presentation</h3><div className="mt-3 space-y-3"><Field label="Primary color" value={specification.theme.primary} onChange={(v) => updateSpec({ ...specification, theme: { ...specification.theme, primary: v } })} /><Field label="Accent color" value={specification.theme.accent} onChange={(v) => updateSpec({ ...specification, theme: { ...specification.theme, accent: v } })} /></div></div>
        <div className="flex gap-2 border-t border-white/10 pt-4"><button type="button" onClick={() => moveSection(-1)} disabled={specification.sections.indexOf(selectedSection) <= 0} aria-label="Move section up" className="flex-1 rounded-xl border border-white/10 p-2 text-gray-400 disabled:opacity-30"><ArrowUp className="mx-auto h-4 w-4" /></button><button type="button" onClick={() => moveSection(1)} disabled={specification.sections.indexOf(selectedSection) < 0 || specification.sections.indexOf(selectedSection) >= specification.sections.length - 1} aria-label="Move section down" className="flex-1 rounded-xl border border-white/10 p-2 text-gray-400 disabled:opacity-30"><ArrowDown className="mx-auto h-4 w-4" /></button>{!structuralSections.has(selectedSection) && <button type="button" onClick={() => toggleSection(selectedSection)} aria-label="Delete section" className="flex-1 rounded-xl border border-red-500/20 p-2 text-red-300"><Trash2 className="mx-auto h-4 w-4" /></button>}</div>
        <div className="border-t border-white/10 pt-4"><h3 className="text-xs font-bold uppercase tracking-widest text-gray-600">Template</h3><select value={templateId} onChange={(e) => { const next = templates.find((t) => t.id === e.target.value); if (next) chooseTemplate(next); }} className="mt-3 w-full rounded-xl border border-white/10 bg-ink-950 px-3 py-2.5 text-sm text-white">{templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></div>
      </div>}</aside>
    </div>
    {specification && <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[.03] p-4"><div><div className="text-sm font-semibold text-white">{selectedTemplate?.name || specification.template.name}</div><div className="mt-1 text-xs text-gray-500">{publishedCurrent ? `Published${publishedAt ? ` ${new Date(publishedAt).toLocaleString()}` : ''}.` : lifecycleState === 'generation_failed' && project?.last_generation_error ? project.last_generation_error : dirty ? 'Changes are waiting to be saved.' : lifecycleState === 'needs_regeneration' ? 'The saved website changed. Generate Website to update the preview.' : lifecycleState === 'current' ? 'The generated website matches the saved specification.' : 'This project has not been generated yet.'}</div></div><div className="flex flex-wrap gap-2">{canOpenPublicPreview ? <a href={`/preview/${project?.public_preview_token}`} target="_blank" rel="noreferrer" className="rounded-xl border border-white/10 px-4 py-2.5 text-sm text-gray-300">Open public preview</a> : project?.public_preview_token ? <span className="rounded-xl border border-white/10 px-4 py-2.5 text-sm text-gray-500">Generate to update preview</span> : null}{canPublish && <button type="button" onClick={() => void publishWebsite()} className="rounded-xl border border-sky-500/30 bg-sky-500/10 px-4 py-2.5 text-sm font-semibold text-sky-300">{publishing ? 'Publishing…' : 'Publish Website'}</button>}{publishedCurrent && <span className="rounded-xl border border-sky-500/20 bg-sky-500/5 px-4 py-2.5 text-sm font-semibold text-sky-300">Published</span>}<button type="button" onClick={() => void generate()} disabled={generating || publishing || !selectedTemplate || (authenticated && usage.remaining <= 0)} className="rounded-xl border border-accent-500/30 bg-accent-500/10 px-4 py-2.5 text-sm font-semibold text-accent-300 disabled:opacity-40">{generating ? 'Generating…' : publishedCurrent ? 'Regenerate Website' : lifecycleState === 'needs_regeneration' ? 'Regenerate Website' : 'Generate Website'}</button></div></div>}
    {templateWarning && <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-5"><div className="w-full max-w-md rounded-3xl border border-white/10 bg-ink-900 p-6"><h2 className="text-xl font-semibold text-white">Change template?</h2><p className="mt-3 text-sm leading-6 text-gray-400">Your current specification has unsaved edits. Switching templates does not overwrite it until you generate again.</p><div className="mt-6 flex justify-end gap-3"><button type="button" onClick={() => setTemplateWarning(null)} className="rounded-xl border border-white/10 px-4 py-2.5 text-sm text-gray-300">Keep editing</button><button type="button" onClick={() => { setTemplateId(templateWarning.id); setTemplateWarning(null); }} className="rounded-xl bg-accent-500 px-4 py-2.5 text-sm font-bold text-ink-950">Change template</button></div></div></div>}
  </div>;
}
