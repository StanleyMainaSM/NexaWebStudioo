import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, ArrowLeft, ArrowDown, ArrowUp, Check, Eye, Loader2, Monitor, Palette, Plus, Save, Smartphone, Sparkles, Tablet, Trash2 } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { generateWebsiteSpecification, validateBusinessInformation } from '../lib/websiteCreation/generator';
import { addWebsiteSection, removeWebsiteSection, updateWebsiteBusinessField, updateWebsiteNavigationItem, updateWebsiteSectionContent } from '../lib/websiteCreation/editor';
import type { BusinessInformation, CreationProject, WebsiteSectionId, WebsiteSpecification, WebsiteTemplate } from '../lib/websiteCreation/types';
import WebsitePreviewRenderer from '../components/websiteCreation/WebsitePreviewRenderer';

const emptyBusiness: BusinessInformation = { businessName: '', industry: '', businessDescription: '', services: [], products: [], targetAudience: '', location: '', phone: '', email: '', whatsapp: '', socialLinks: {}, logoUrl: '', brandColors: {}, imagery: [], websiteType: 'Business website', specialRequirements: '' };
const sectionLabels: Record<WebsiteSectionId, string> = { navbar: 'Navigation', hero: 'Hero', about: 'About', services: 'Services', products: 'Products', gallery: 'Gallery', testimonials: 'Testimonials', pricing: 'Pricing', faq: 'FAQ', contact: 'Contact', location: 'Location', footer: 'Footer' };
const structuralSections = new Set<WebsiteSectionId>(['navbar', 'hero', 'footer']);
type HeroContent = { eyebrow?: string; title?: string; subtitle?: string; cta?: string };
type PreviewMode = 'desktop' | 'tablet' | 'mobile';

const splitList = (value: string) => value.split(',').map((item) => item.trim()).filter(Boolean);
const cloneSpec = (spec: WebsiteSpecification) => JSON.parse(JSON.stringify(spec)) as WebsiteSpecification;
const contentRecord = (spec: WebsiteSpecification, section: WebsiteSectionId) => (spec.content[section] || {}) as Record<string, unknown>;
const arrayValue = (spec: WebsiteSpecification, section: WebsiteSectionId, field: string) => { const value = contentRecord(spec, section)[field]; return Array.isArray(value) ? value : []; };

function Field({ label, value, onChange, multiline = false }: { label: string; value: string; onChange: (value: string) => void; multiline?: boolean }) {
  return <label className="block text-sm"><span className="mb-1.5 block text-gray-400">{label}</span>{multiline ? <textarea rows={4} value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-xl border border-white/10 bg-ink-950 px-3 py-2.5 text-white outline-none focus:border-accent-500/50" /> : <input value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-xl border border-white/10 bg-ink-950 px-3 py-2.5 text-white outline-none focus:border-accent-500/50" />}</label>;
}

export default function WebsiteCreationStudio({ creationProjectId, leadId }: { creationProjectId?: string; leadId?: string }) {
  const { user, roles } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const resolvedLeadId = leadId || params.get('leadId') || undefined;
  const [templates, setTemplates] = useState<WebsiteTemplate[]>([]);
  const [business, setBusiness] = useState<BusinessInformation>(emptyBusiness);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [project, setProject] = useState<CreationProject | null>(null);
  const [specification, setSpecification] = useState<WebsiteSpecification | null>(null);
  const [persistedSpecification, setPersistedSpecification] = useState<WebsiteSpecification | null>(null);
  const [usage, setUsage] = useState({ used: 0, limit: 5, remaining: 5 });
  const [selectedSection, setSelectedSection] = useState<WebsiteSectionId>('hero');
  const [previewMode, setPreviewMode] = useState<PreviewMode>('desktop');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [savingProject, setSavingProject] = useState(false);
  const [savingSpecification, setSavingSpecification] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [templateWarning, setTemplateWarning] = useState<WebsiteTemplate | null>(null);
  const selectedTemplate = useMemo(() => templates.find((template) => template.id === selectedTemplateId) || null, [templates, selectedTemplateId]);
  const isAuthenticated = Boolean(user?.id);
  const dirty = Boolean(specification && JSON.stringify(specification) !== JSON.stringify(persistedSpecification));

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
        if (isAuthenticated) {
          const usageResult = await supabase.rpc('get_creation_generation_status');
          if (!usageResult.error && usageResult.data) setUsage(usageResult.data as typeof usage);
          if (existingId) {
            const result = await supabase.from('creation_projects').select('*').eq('id', existingId).maybeSingle();
            if (result.error) throw result.error;
            if (!result.data) throw new Error('This website project is unavailable or you do not have access to it.');
            const loaded = result.data as unknown as CreationProject;
            setProject(loaded); setBusiness(loaded.business_info || emptyBusiness); setSpecification(loaded.specification); setPersistedSpecification(loaded.specification ? cloneSpec(loaded.specification) : null);
            if (loaded.selected_template_id) setSelectedTemplateId(loaded.selected_template_id);
            if (loaded.specification?.sections?.length) setSelectedSection(loaded.specification.sections.find((section) => section === 'hero') || loaded.specification.sections[0]);
          } else if (loadedTemplates[0]) setSelectedTemplateId(loadedTemplates[0].id);
        } else if (loadedTemplates[0]) setSelectedTemplateId(loadedTemplates[0].id);
        if (resolvedLeadId && isAuthenticated) {
          const leadResult = await supabase.from('leads').select('id,business_id,connector_id,requirements').eq('id', resolvedLeadId).maybeSingle();
          if (!leadResult.error && leadResult.data) {
            const businessResult = await supabase.from('businesses').select('id,name,industry,contact_name,email,phone').eq('id', leadResult.data.business_id).maybeSingle();
            if (!businessResult.error && businessResult.data) setBusiness((current) => ({ ...current, businessName: businessResult.data.name || '', industry: businessResult.data.industry || '', email: businessResult.data.email || '', phone: businessResult.data.phone || '', specialRequirements: leadResult.data.requirements || '' }));
          }
        }
      } catch (err) { if (mounted) setError(err instanceof Error ? err.message : 'Unable to load Template Studio.'); }
      finally { if (mounted) setLoading(false); }
    };
    void load();
    return () => { mounted = false; };
  }, [creationProjectId, isAuthenticated, params, resolvedLeadId]);

  async function ensureProject() {
    if (!user) throw new Error('Sign in to save a creation project and use your generation allowance.');
    if (project) return project;
    const normalizedRoles = roles.map((value) => value.toLowerCase());
    const connectorId = normalizedRoles.includes('connector') ? user.id : null;
    const clientId = normalizedRoles.includes('client') ? user.id : null;
    const result = await supabase.rpc('create_creation_project', { p_type: 'website', p_title: `${business.businessName || 'Website'} Website`, p_client_id: clientId, p_connector_id: connectorId, p_lead_id: resolvedLeadId || null, p_business_id: null, p_project_id: null, p_business_info: business, p_requested_sections: [] });
    if (result.error) throw result.error;
    const created: CreationProject = { id: result.data, type: 'website', client_id: clientId, connector_id: connectorId, operator_id: null, lead_id: resolvedLeadId || null, project_id: null, business_id: null, title: `${business.businessName || 'Website'} Website`, business_info: business, requested_sections: [], selected_template_id: null, specification: null, attribution_enabled: true, status: 'draft', created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    setProject(created); return created;
  }

  async function generate() {
    setError(''); setNotice('');
    const validation = validateBusinessInformation(business);
    if (validation.length) { setError(validation.join(' ')); return; }
    if (!selectedTemplate) { setError('Select a template first.'); return; }
    if (isAuthenticated && usage.remaining <= 0) { setError('Your five free template generations have been used.'); return; }
    setGenerating(true);
    try {
      if (!isAuthenticated) { setSpecification(generateWebsiteSpecification(business, selectedTemplate, [], true)); setNotice('Preview generated. Sign in when you want to save it.'); return; }
      const currentProject = await ensureProject();
      const spec = generateWebsiteSpecification(business, selectedTemplate, [], currentProject.attribution_enabled);
      const result = await supabase.rpc('consume_creation_generation', { p_creation_project_id: currentProject.id, p_template_id: selectedTemplate.id, p_requested_sections: spec.sections, p_specification: spec });
      if (result.error) throw result.error;
      const nextUsage = result.data as { generation_count: number; generation_limit: number; public_preview_token?: string };
      const savedProject = { ...currentProject, selected_template_id: selectedTemplate.id, requested_sections: spec.sections, specification: spec, public_preview_token: nextUsage.public_preview_token || null, preview_enabled: true, status: 'preview' };
      setUsage({ used: nextUsage.generation_count, limit: nextUsage.generation_limit, remaining: Math.max(nextUsage.generation_limit - nextUsage.generation_count, 0) }); setSpecification(spec); setPersistedSpecification(cloneSpec(spec)); setProject(savedProject); setSelectedSection(spec.sections.includes('hero') ? 'hero' : spec.sections[0]); setNotice('Preview generated and saved.');
    } catch (err) { setError(err instanceof Error ? err.message : 'Generation failed.'); }
    finally { setGenerating(false); }
  }

  async function saveSpecification() {
    if (!project || !specification) { setNotice('Generate a website preview before saving editor changes.'); return; }
    setSavingSpecification(true); setError('');
    const result = await supabase.from('creation_projects').update({ business_info: specification.business, requested_sections: specification.sections, selected_template_id: specification.template.id, specification }).eq('id', project.id);
    if (result.error) setError('Unable to save your changes. Please try again.');
    else { setBusiness(specification.business); setPersistedSpecification(cloneSpec(specification)); setProject((current) => current ? { ...current, business_info: specification.business, requested_sections: specification.sections, selected_template_id: specification.template.id, specification, updated_at: new Date().toISOString() } : current); setNotice('All changes saved.'); }
    setSavingSpecification(false);
  }

  function updateSpec(next: WebsiteSpecification) { setSpecification(next); setBusiness(next.business); }
  function editBusiness<K extends keyof BusinessInformation>(field: K, value: BusinessInformation[K]) { setBusiness((current) => ({ ...current, [field]: value })); if (specification) updateSpec(updateWebsiteBusinessField(specification, field, value)); }
  function editSection(field: string, value: unknown) { if (specification) updateSpec(updateWebsiteSectionContent(specification, selectedSection, field, value)); }
  function moveSection(direction: -1 | 1) { if (!specification) return; const sections = [...specification.sections]; const index = sections.indexOf(selectedSection); const next = index + direction; if (index < 0 || next < 0 || next >= sections.length) return; [sections[index], sections[next]] = [sections[next], sections[index]]; updateSpec({ ...specification, sections, navigation: specification.navigation }); }
  function toggleSection(section: WebsiteSectionId) { if (!specification) return; updateSpec(specification.sections.includes(section) ? removeWebsiteSection(specification, section) : addWebsiteSection(specification, section)); setSelectedSection(section); }
  function chooseTemplate(template: WebsiteTemplate) { if (specification && template.id !== specification.template.id && dirty) { setTemplateWarning(template); return; } setSelectedTemplateId(template.id); }
  function applyTemplateChange() { if (!templateWarning) return; setSelectedTemplateId(templateWarning.id); setTemplateWarning(null); setNotice('Template changed. Generate again to create a new specification from it.'); }

  const sectionData = specification ? contentRecord(specification, selectedSection) : {};
  const previewWidth = previewMode === 'mobile' ? 'max-w-[390px]' : previewMode === 'tablet' ? 'max-w-[768px]' : 'max-w-none';
  const navTargets = specification?.sections.filter((section) => !structuralSections.has(section)) || [];
  const hero = (specification?.content.hero || {}) as HeroContent;

  if (loading) return <div className="flex min-h-96 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-accent-400" /></div>;

  return <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-3"><button type="button" onClick={() => navigate('/portal/creation-studio')} aria-label="Back to website projects" className="rounded-xl border border-white/10 p-2.5 text-gray-300 hover:bg-white/5"><ArrowLeft className="h-4 w-4" /></button><div><div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.18em] text-accent-400"><Sparkles className="h-3.5 w-3.5" />Template Studio</div><h1 className="mt-1 text-2xl font-bold text-white">{project?.title || 'New website'}</h1></div></div>
      <div className="flex flex-wrap items-center gap-2"><span className={`rounded-full border px-3 py-2 text-xs font-semibold ${dirty ? 'border-amber-500/30 bg-amber-500/10 text-amber-300' : 'border-emerald-500/20 bg-emerald-500/5 text-emerald-300'}`}>{dirty ? 'Unsaved changes' : 'Saved'}</span>{isAuthenticated && <span className="rounded-full border border-white/10 px-3 py-2 text-xs text-gray-400">{usage.remaining}/{usage.limit} generations</span>}<button type="button" onClick={() => void saveSpecification()} disabled={!dirty || savingSpecification} className="inline-flex items-center gap-2 rounded-xl bg-accent-500 px-4 py-2.5 text-sm font-bold text-ink-950 disabled:cursor-not-allowed disabled:opacity-40"><Save className="h-4 w-4" />{savingSpecification ? 'Saving…' : 'Save'}</button></div>
    </div>
    {(error || notice) && <div className={`rounded-2xl border px-4 py-3 text-sm ${error ? 'border-red-500/20 bg-red-500/5 text-red-300' : 'border-emerald-500/20 bg-emerald-500/5 text-emerald-300'}`}>{error ? <AlertCircle className="mr-2 inline h-4 w-4" /> : <Check className="mr-2 inline h-4 w-4" />}{error || notice}</div>}

    <div className="grid min-h-[calc(100vh-12rem)] overflow-hidden rounded-3xl border border-white/10 bg-[#0b0d12] xl:grid-cols-[250px_minmax(0,1fr)_320px]">
      <aside className="border-b border-white/10 p-4 xl:border-b-0 xl:border-r"><div className="flex items-center justify-between"><h2 className="text-sm font-semibold text-white">Website structure</h2><span className="text-[10px] uppercase tracking-widest text-gray-600">{specification?.sections.length || 0}</span></div>
        {!specification ? <div className="mt-6 space-y-4"><p className="text-xs leading-5 text-gray-500">Choose a template and generate a preview to open the editor.</p><div className="space-y-2">{templates.map((template) => <button key={template.id} type="button" onClick={() => chooseTemplate(template)} className={`w-full rounded-xl border p-3 text-left ${selectedTemplateId === template.id ? 'border-accent-500/40 bg-accent-500/10' : 'border-white/10 bg-white/[.02]'}`}><div className="text-sm font-semibold text-white">{template.name}</div><div className="mt-1 text-[11px] text-gray-500">{template.visual_style}</div></button>)}</div><button type="button" onClick={() => void generate()} disabled={generating || !selectedTemplate} className="w-full rounded-xl bg-accent-500 px-4 py-3 text-sm font-bold text-ink-950 disabled:opacity-40">{generating ? 'Generating…' : 'Generate website'}</button></div> : <div className="mt-4 space-y-1">{specification.sections.map((section) => <button key={section} type="button" onClick={() => setSelectedSection(section)} className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm ${selectedSection === section ? 'bg-accent-500/10 text-accent-300' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}><span>{sectionLabels[section]}</span>{structuralSections.has(section) && <span className="text-[9px] uppercase tracking-widest text-gray-600">Core</span>}</button>)}<div className="my-4 border-t border-white/10" /><p className="px-2 text-[10px] font-bold uppercase tracking-widest text-gray-600">Add section</p><div className="mt-2 grid grid-cols-2 gap-1">{Object.keys(sectionLabels).filter((section) => !specification.sections.includes(section as WebsiteSectionId)).map((section) => <button key={section} type="button" onClick={() => toggleSection(section as WebsiteSectionId)} className="rounded-lg border border-white/5 px-2 py-2 text-[11px] text-gray-500 hover:border-accent-500/30 hover:text-accent-300"><Plus className="mx-auto mb-1 h-3 w-3" />{sectionLabels[section as WebsiteSectionId]}</button>)}</div></div>}
      </aside>

      <main className="min-w-0 border-b border-white/10 bg-[#151820] xl:border-b-0 xl:border-r">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-[#0f1117] px-4 py-3"><div className="flex items-center gap-1 rounded-xl border border-white/10 p-1"><button type="button" onClick={() => setPreviewMode('desktop')} aria-label="Desktop preview" className={`rounded-lg p-2 ${previewMode === 'desktop' ? 'bg-white/10 text-white' : 'text-gray-500'}`}><Monitor className="h-4 w-4" /></button><button type="button" onClick={() => setPreviewMode('tablet')} aria-label="Tablet preview" className={`rounded-lg p-2 ${previewMode === 'tablet' ? 'bg-white/10 text-white' : 'text-gray-500'}`}><Tablet className="h-4 w-4" /></button><button type="button" onClick={() => setPreviewMode('mobile')} aria-label="Mobile preview" className={`rounded-lg p-2 ${previewMode === 'mobile' ? 'bg-white/10 text-white' : 'text-gray-500'}`}><Smartphone className="h-4 w-4" /></button></div><div className="flex items-center gap-2 text-xs text-gray-500"><Eye className="h-4 w-4" />Live preview</div></div>
        <div className="h-full overflow-auto p-4 md:p-6"><div className={`mx-auto w-full transition-all ${previewWidth}`}>{specification ? <WebsitePreviewRenderer spec={specification} /> : <div className="grid min-h-[620px] place-items-center rounded-3xl border border-dashed border-white/10 bg-white/[.02] text-center"><div><Sparkles className="mx-auto h-8 w-8 text-accent-400" /><h2 className="mt-4 text-xl font-semibold text-white">Start your website</h2><p className="mt-2 max-w-sm text-sm text-gray-500">Select a DB-backed template and generate a structured preview.</p></div></div>}</div></div>
      </main>

      <aside className="min-w-0 overflow-y-auto p-4 md:p-5"><div className="flex items-center gap-2"><Palette className="h-4 w-4 text-accent-400" /><h2 className="text-sm font-semibold text-white">Properties</h2></div>
        {!specification ? <div className="mt-6 space-y-5"><h3 className="text-sm font-semibold text-white">Website details</h3><Field label="Business name" value={business.businessName} onChange={(value) => editBusiness('businessName', value)} /><Field label="Tagline / description" value={business.businessDescription || ''} onChange={(value) => editBusiness('businessDescription', value)} multiline /><Field label="Email" value={business.email || ''} onChange={(value) => editBusiness('email', value)} /><Field label="Phone" value={business.phone || ''} onChange={(value) => editBusiness('phone', value)} /></div> : <div className="mt-5 space-y-5">
          {selectedSection === 'navbar' && <><h3 className="text-sm font-semibold text-white">Navigation</h3>{specification.navigation.map((item) => <div key={item.section} className="space-y-2 rounded-xl border border-white/10 bg-white/[.02] p-3"><Field label={sectionLabels[item.section]} value={item.label} onChange={(value) => updateSpec(updateWebsiteNavigationItem(specification, item.section, { label: value, section: item.section }))} /><label className="block text-xs text-gray-500">Destination<select value={item.section} onChange={(event) => updateSpec(updateWebsiteNavigationItem(specification, item.section, { label: item.label, section: event.target.value as WebsiteSectionId }))} className="mt-1 w-full rounded-lg border border-white/10 bg-ink-950 px-2 py-2 text-white"><option value={item.section}>{`#${item.section}`}</option>{navTargets.filter((target) => target !== item.section).map((target) => <option key={target} value={target}>{`#${target}`}</option>)}</select></label></div>)}</>}
          {selectedSection === 'hero' && <><h3 className="text-sm font-semibold text-white">Hero content</h3><Field label="Eyebrow" value={String(hero.eyebrow || '')} onChange={(value) => editSection('eyebrow', value)} /><Field label="Headline" value={String(hero.title || '')} onChange={(value) => editSection('title', value)} /><Field label="Supporting text" value={String(hero.subtitle || '')} onChange={(value) => editSection('subtitle', value)} multiline /><Field label="CTA label" value={String(hero.cta || '')} onChange={(value) => editSection('cta', value)} /><Field label="Business name" value={specification.business.businessName} onChange={(value) => editBusiness('businessName', value)} /></>}
          {selectedSection === 'about' && <><h3 className="text-sm font-semibold text-white">About</h3><Field label="Title" value={String(sectionData.title || '')} onChange={(value) => editSection('title', value)} /><Field label="Body" value={String(sectionData.body || '')} onChange={(value) => editSection('body', value)} multiline /></>}
          {selectedSection === 'contact' && <><h3 className="text-sm font-semibold text-white">Contact</h3><Field label="Phone" value={String(sectionData.phone || '')} onChange={(value) => editSection('phone', value)} /><Field label="Email" value={String(sectionData.email || '')} onChange={(value) => editSection('email', value)} /><Field label="WhatsApp" value={String(sectionData.whatsapp || '')} onChange={(value) => editSection('whatsapp', value)} /></>}
          {selectedSection === 'location' && <><h3 className="text-sm font-semibold text-white">Location</h3><Field label="Address" value={String(sectionData.address || '')} onChange={(value) => editSection('address', value)} multiline /></>}
          {(['services', 'products'] as WebsiteSectionId[]).includes(selectedSection) && <><h3 className="text-sm font-semibold text-white">{sectionLabels[selectedSection]}</h3><Field label="Items (comma separated)" value={arrayValue(specification, selectedSection, 'items').map(String).join(', ')} onChange={(value) => editSection('items', splitList(value))} multiline /></>}
          {selectedSection === 'gallery' && <><h3 className="text-sm font-semibold text-white">Gallery</h3><Field label="Image URLs (comma separated)" value={arrayValue(specification, 'gallery', 'images').map(String).join(', ')} onChange={(value) => editSection('images', splitList(value))} multiline /></>}
          {selectedSection === 'testimonials' && <><h3 className="text-sm font-semibold text-white">Testimonials</h3>{arrayValue(specification, 'testimonials', 'items').map((item, index) => { const row = item as { quote?: string; author?: string }; return <div key={index} className="space-y-2 rounded-xl border border-white/10 p-3"><Field label={`Quote ${index + 1}`} value={row.quote || ''} onChange={(value) => { const next = [...arrayValue(specification, 'testimonials', 'items')]; next[index] = { ...row, quote: value }; editSection('items', next); }} multiline /><Field label="Author" value={row.author || ''} onChange={(value) => { const next = [...arrayValue(specification, 'testimonials', 'items')]; next[index] = { ...row, author: value }; editSection('items', next); }} /></div>; })}</>}
          {selectedSection === 'pricing' && <><h3 className="text-sm font-semibold text-white">Pricing</h3>{arrayValue(specification, 'pricing', 'items').map((item, index) => { const row = item as { name?: string; price?: string }; return <div key={index} className="space-y-2 rounded-xl border border-white/10 p-3"><Field label={`Plan ${index + 1}`} value={row.name || ''} onChange={(value) => { const next = [...arrayValue(specification, 'pricing', 'items')]; next[index] = { ...row, name: value }; editSection('items', next); }} /><Field label="Price" value={row.price || ''} onChange={(value) => { const next = [...arrayValue(specification, 'pricing', 'items')]; next[index] = { ...row, price: value }; editSection('items', next); }} /></div>; })}<button type="button" onClick={() => editSection('items', [...arrayValue(specification, 'pricing', 'items'), { name: 'New plan', price: 'Contact us' }])} className="inline-flex items-center gap-2 text-xs font-semibold text-accent-300"><Plus className="h-3 w-3" />Add plan</button></>}
          {selectedSection === 'faq' && <><h3 className="text-sm font-semibold text-white">FAQ</h3>{arrayValue(specification, 'faq', 'items').map((item, index) => { const row = item as { question?: string; answer?: string }; return <div key={index} className="space-y-2 rounded-xl border border-white/10 p-3"><Field label={`Question ${index + 1}`} value={row.question || ''} onChange={(value) => { const next = [...arrayValue(specification, 'faq', 'items')]; next[index] = { ...row, question: value }; editSection('items', next); }} /><Field label="Answer" value={row.answer || ''} onChange={(value) => { const next = [...arrayValue(specification, 'faq', 'items')]; next[index] = { ...row, answer: value }; editSection('items', next); }} multiline /></div>; })}<button type="button" onClick={() => editSection('items', [...arrayValue(specification, 'faq', 'items'), { question: 'New question', answer: 'Answer' }])} className="inline-flex items-center gap-2 text-xs font-semibold text-accent-300"><Plus className="h-3 w-3" />Add question</button></>}
          {selectedSection === 'footer' && <><h3 className="text-sm font-semibold text-white">Footer</h3><Field label="Business name" value={specification.business.businessName} onChange={(value) => editBusiness('businessName', value)} /></>}
          <div className="border-t border-white/10 pt-4"><h3 className="text-xs font-bold uppercase tracking-widest text-gray-600">Presentation</h3><div className="mt-3 space-y-3"><Field label="Primary color" value={specification.theme.primary} onChange={(value) => updateSpec({ ...specification, theme: { ...specification.theme, primary: value } })} /><Field label="Accent color" value={specification.theme.accent} onChange={(value) => updateSpec({ ...specification, theme: { ...specification.theme, accent: value } })} /></div></div>
          <div className="flex gap-2 border-t border-white/10 pt-4"><button type="button" onClick={() => moveSection(-1)} disabled={specification.sections.indexOf(selectedSection) <= 0} aria-label="Move section up" className="flex-1 rounded-xl border border-white/10 p-2 text-gray-400 disabled:opacity-30"><ArrowUp className="mx-auto h-4 w-4" /></button><button type="button" onClick={() => moveSection(1)} disabled={specification.sections.indexOf(selectedSection) < 0 || specification.sections.indexOf(selectedSection) >= specification.sections.length - 1} aria-label="Move section down" className="flex-1 rounded-xl border border-white/10 p-2 text-gray-400 disabled:opacity-30"><ArrowDown className="mx-auto h-4 w-4" /></button>{!structuralSections.has(selectedSection) && <button type="button" onClick={() => toggleSection(selectedSection)} aria-label="Delete section" className="flex-1 rounded-xl border border-red-500/20 p-2 text-red-300 hover:bg-red-500/5"><Trash2 className="mx-auto h-4 w-4" /></button>}</div>
          <div className="border-t border-white/10 pt-4"><h3 className="text-xs font-bold uppercase tracking-widest text-gray-600">Template</h3><select value={selectedTemplateId} onChange={(event) => { const next = templates.find((template) => template.id === event.target.value); if (next) chooseTemplate(next); }} className="mt-3 w-full rounded-xl border border-white/10 bg-ink-950 px-3 py-2.5 text-sm text-white"><option value="">Select template</option>{templates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}</select></div>
        </div>}
      </aside>
    </div>

    {specification && <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[.03] p-4"><div><div className="text-sm font-semibold text-white">{selectedTemplate?.name || specification.template.name}</div><div className="mt-1 text-xs text-gray-500">{dirty ? 'Changes are waiting to be saved.' : 'Your latest specification is saved.'}</div></div><div className="flex flex-wrap gap-2">{project?.public_preview_token && <a href={`/preview/${project.public_preview_token}`} target="_blank" rel="noreferrer" className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-semibold text-gray-300 hover:bg-white/5">Open public preview</a>}<button type="button" onClick={() => void generate()} disabled={generating || !selectedTemplate || (isAuthenticated && usage.remaining <= 0)} className="rounded-xl border border-accent-500/30 bg-accent-500/10 px-4 py-2.5 text-sm font-semibold text-accent-300 disabled:opacity-40">{generating ? 'Generating…' : 'Regenerate from template'}</button></div></div>}

    {templateWarning && <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-5 backdrop-blur-sm"><div className="w-full max-w-md rounded-3xl border border-white/10 bg-ink-900 p-6 shadow-2xl"><h2 className="text-xl font-semibold text-white">Change template?</h2><p className="mt-3 text-sm leading-6 text-gray-400">Your current specification has unsaved edits. Switching templates does not overwrite it immediately, but generating from the new template will create a new specification.</p><div className="mt-6 flex justify-end gap-3"><button type="button" onClick={() => setTemplateWarning(null)} className="rounded-xl border border-white/10 px-4 py-2.5 text-sm text-gray-300">Keep editing</button><button type="button" onClick={applyTemplateChange} className="rounded-xl bg-accent-500 px-4 py-2.5 text-sm font-bold text-ink-950">Change template</button></div></div></div>}
  </div>;
}
