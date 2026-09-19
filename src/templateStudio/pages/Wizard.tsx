import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from '../motion';
import { generateTemplate } from '../lib/template-generator';
import { useAppStore } from '../store';
import { Loader2, ArrowRight, ArrowLeft, Wand2, Check } from 'lucide-react';
import { TemplateIndustry, TemplateStyle, TemplateColor } from '../types';
import { useAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import { generateWebsiteOutputFromSpecification } from '../../lib/websiteCreation/generator';
import { adaptTemplateStudioTemplateToWebsiteSpecification, selectAvelixaTemplateForTemplateStudio } from '../lib/website-spec-adapter';
import type { WebsiteTemplate } from '../../lib/websiteCreation/types';

const industries = [
  'Restaurant', 'Hotel', 'Real Estate', 'Construction', 'Law', 'Finance', 'Accounting', 
  'Technology', 'SaaS', 'AI', 'Software', 'Digital Agency', 'Marketing Agency', 'E-commerce', 
  'Fashion', 'Beauty', 'Salon', 'Fitness', 'Gym', 'Healthcare', 'Dental', 'Education', 'School', 
  'University', 'Consulting', 'Photography', 'Architecture', 'Interior Design', 'Automotive', 
  'Travel', 'Tourism', 'Logistics', 'Security', 'Cleaning', 'NGO', 'Church', 'Events', 'Entertainment', 
  'Music', 'Agriculture', 'Manufacturing', 'Insurance', 'Personal Portfolio', 'Freelancer', 'Startup', 
  'Local Business', 'Other'
];

const websiteTypes = [
  'Business Website', 'Landing Page', 'Portfolio', 'SaaS', 'E-commerce', 'Agency', 'Corporate', 
  'Blog', 'Personal Website', 'Booking Website', 'Restaurant Website', 'Real Estate Website', 'Service Website', 'Custom'
];

const styles = [
  'Auto', 'Modern', 'Minimal', 'Luxury', 'Bold', 'Corporate', 'Futuristic', 'Editorial', 'Creative', 'Elegant', 'Playful'
];

const colors = [
  'Auto', 'Blue', 'Purple', 'Green', 'Red', 'Orange', 'Gold', 'Black', 'Neutral', 'Custom'
];

const generationStates = [
  "Building template structure...",
  "Applying industry layout...",
  "Populating tailored content...",
  "Setting visual identity...",
  "Finalizing design..."
];

export default function Wizard() {
  const navigate = useNavigate();
  const { setCurrentTemplate, addTemplate, setCreationProjectId } = useAppStore();
  const { user, roles } = useAuth();
  
  const [step, setStep] = useState(1);
  const [industry, setIndustry] = useState<TemplateIndustry | ''>('');
  const [customIndustry, setCustomIndustry] = useState('');
  
  const [websiteType, setWebsiteType] = useState('');
  const [customType, setCustomType] = useState('');
  
  const [style, setStyle] = useState<TemplateStyle | ''>('Auto');
  const [color, setColor] = useState<TemplateColor | ''>('Auto');
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationMsgIndex, setGenerationMsgIndex] = useState(0);

  const handleNext = () => setStep(s => s + 1);
  const handleBack = () => setStep(s => s - 1);

  useEffect(() => {
    let interval: any;
    if (isGenerating) {
      interval = setInterval(() => {
        setGenerationMsgIndex(prev => {
          if (prev < generationStates.length - 1) return prev + 1;
          return prev;
        });
      }, 800);
    }
    return () => clearInterval(interval);
  }, [isGenerating]);

  const handleGenerate = async () => {
    setIsGenerating(true);
    const finalIndustry = industry === 'Other' && customIndustry ? customIndustry : industry;
    const finalType = websiteType === 'Custom' && customType ? customType : websiteType;
    const finalStyle = style === 'Auto' || style === 'AI Choose' ? 'Modern' : style;
    const finalColor = color === 'Auto' || color === 'AI chooses' ? 'Auto' : color;

    try {
      const template = await generateTemplate(finalIndustry || 'SaaS', finalStyle, finalColor, ['Home']);

      if (user?.id) {
        const normalizedRoles = roles.map((role) => role.toLowerCase());
        const clientId = normalizedRoles.includes('client') && !normalizedRoles.includes('connector') ? user.id : null;
        const connectorId = normalizedRoles.includes('connector') && !normalizedRoles.includes('client') ? user.id : null;

        const templateResult = await supabase.from('website_templates')
          .select('id,slug,name,description,categories,visual_style,sections,typography,color_direction,layout,preview,is_active,is_protected')
          .eq('is_active', true)
          .order('name');
        if (templateResult.error) throw templateResult.error;

        const available = (templateResult.data || []) as unknown as WebsiteTemplate[];
        const match = selectAvelixaTemplateForTemplateStudio(template, available);
        const specification = adaptTemplateStudioTemplateToWebsiteSpecification(
          template,
          match,
          finalType || 'Business Website',
          true,
        );

        const projectResult = await supabase.rpc('create_creation_project', {
          p_type: 'website',
          p_title: specification.business.businessName + ' Website',
          p_client_id: clientId,
          p_connector_id: connectorId,
          p_lead_id: null,
          p_business_id: null,
          p_project_id: null,
          p_business_info: specification.business,
          p_requested_sections: specification.sections,
        });
        if (projectResult.error) throw projectResult.error;

        const projectId = String(projectResult.data);
        const output = generateWebsiteOutputFromSpecification(
          specification,
          match,
          projectId,
          new Date().toISOString(),
          null,
        );
        if (!output.ok) throw new Error(output.errors.join(' '));

        const consume = await supabase.rpc('consume_creation_generation', {
          p_creation_project_id: projectId,
          p_template_id: match.id,
          p_requested_sections: output.output.specification.sections,
          p_specification: output.output.specification,
          p_output_identity: output.output.id,
          p_output_version: output.output.outputVersion,
          p_generated_at: output.output.generatedAt,
        });
        if (consume.error) throw consume.error;

        setCreationProjectId(projectId);
      }

      addTemplate(template);
      setCurrentTemplate(template);
      navigate('../preview');
    } catch (e) {
      console.error(e);
    } finally {
      setIsGenerating(false);
    }
  };

  if (isGenerating) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-brand-50">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
          className="mb-8 relative"
        >
          <div className="absolute inset-0 bg-brand-400 blur-xl opacity-50 rounded-full"></div>
          <Loader2 className="h-16 w-16 text-brand-600 relative z-10" />
        </motion.div>
        
        <div className="h-8 overflow-hidden relative w-full max-w-md text-center">
          <AnimatePresence mode="popLayout">
            <motion.h2 
              key={generationMsgIndex}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-2xl font-bold text-slate-900 absolute w-full"
            >
              {generationStates[generationMsgIndex]}
            </motion.h2>
          </AnimatePresence>
        </div>
        
        <div className="mt-8 w-64 h-2 bg-brand-200 rounded-full overflow-hidden">
          <motion.div 
            className="h-full bg-brand-600"
            initial={{ width: "0%" }}
            animate={{ width: `${((generationMsgIndex + 1) / generationStates.length) * 100}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8 min-h-[80vh]">
      <div className="mb-12 flex items-center justify-between bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
        <div className="flex gap-2 w-full max-w-md">
          {[1, 2, 3, 4].map(s => (
            <div key={s} className="flex-1 h-2 rounded-full relative overflow-hidden bg-slate-100">
               <motion.div 
                 className={`absolute inset-0 ${s <= step ? 'bg-brand-600' : 'bg-transparent'}`}
                 initial={{ x: '-100%' }}
                 animate={{ x: s <= step ? 0 : '-100%' }}
                 transition={{ duration: 0.3 }}
               />
            </div>
          ))}
        </div>
        <span className="text-sm font-bold text-slate-400 ml-4">Step {step} of 4</span>
      </div>

      <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/40 border border-slate-100 overflow-hidden min-h-[500px] flex flex-col">
        <div className="p-8 md:p-12 flex-1">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2">What is your industry?</h1>
                <p className="text-slate-500 mb-8 text-lg">We'll tailor the structure, layout, and copy to match your business.</p>
                
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 max-h-[400px] overflow-y-auto pr-2 pb-4">
                  {industries.map(ind => (
                    <button
                      key={ind}
                      onClick={() => setIndustry(ind)}
                      className={`p-3 rounded-xl border text-sm font-medium transition-all flex items-center justify-center text-center h-16 ${industry === ind ? 'border-brand-600 bg-brand-50 text-brand-700 ring-1 ring-brand-600 shadow-sm' : 'border-slate-200 hover:border-brand-300 hover:bg-slate-50 text-slate-700 bg-white'}`}
                    >
                      {ind}
                    </button>
                  ))}
                </div>

                {industry === 'Other' && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-6 p-6 bg-slate-50 rounded-2xl border border-slate-200">
                    <label className="block text-sm font-bold text-slate-700 mb-2">Describe your custom industry</label>
                    <input
                      type="text"
                      value={customIndustry}
                      onChange={(e) => setCustomIndustry(e.target.value)}
                      placeholder="e.g. Space Tourism, Pet Grooming, Quantum Computing"
                      className="w-full p-4 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 bg-white text-lg"
                    />
                  </motion.div>
                )}
              </motion.div>
            )}

            {step === 2 && (
              <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2">What type of website?</h1>
                <p className="text-slate-500 mb-8 text-lg">This determines the page architecture and primary call to actions.</p>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
                  {websiteTypes.map(type => (
                    <button
                      key={type}
                      onClick={() => setWebsiteType(type)}
                      className={`p-4 rounded-2xl border text-left transition-all ${websiteType === type ? 'border-brand-600 bg-brand-50 text-brand-700 ring-1 ring-brand-600 shadow-sm' : 'border-slate-200 hover:border-brand-300 hover:bg-slate-50 text-slate-700 bg-white'}`}
                    >
                      <span className="font-bold block mb-1">{type}</span>
                    </button>
                  ))}
                </div>

                {websiteType === 'Custom' && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-6 p-6 bg-slate-50 rounded-2xl border border-slate-200">
                    <label className="block text-sm font-bold text-slate-700 mb-2">Describe your custom website type</label>
                    <input
                      type="text"
                      value={customType}
                      onChange={(e) => setCustomType(e.target.value)}
                      placeholder="e.g. Interactive WebGL Experience"
                      className="w-full p-4 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 bg-white text-lg"
                    />
                  </motion.div>
                )}
              </motion.div>
            )}

            {step === 3 && (
              <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2">Choose a design style</h1>
                <p className="text-slate-500 mb-8 text-lg">This sets the typography, spacing, and overall aesthetic feel.</p>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {styles.map(s => (
                    <button
                      key={s}
                      onClick={() => setStyle(s)}
                      className={`p-5 rounded-2xl border transition-all ${style === s ? 'border-brand-600 bg-brand-600 text-white shadow-lg shadow-brand-500/20' : 'border-slate-200 hover:border-brand-400 hover:bg-brand-50 text-slate-800 bg-white'}`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold">{s}</span>
                        {style === s && <Check className="h-4 w-4" />}
                      </div>
                      {s === 'Auto' && <span className="text-xs opacity-80">Best suited for your industry</span>}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {step === 4 && (
              <motion.div key="step4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2">Select a primary color</h1>
                <p className="text-slate-500 mb-8 text-lg">We'll automatically generate a cohesive palette around your choice.</p>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                  {colors.map(c => (
                    <button
                      key={c}
                      onClick={() => setColor(c)}
                      className={`p-4 flex flex-col items-center justify-center gap-3 rounded-2xl border transition-all ${color === c ? 'border-brand-600 ring-2 ring-brand-500/20 bg-brand-50' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 bg-white'}`}
                    >
                      {c !== 'Auto' && c !== 'Custom' && (
                        <div className="w-10 h-10 rounded-full shadow-sm" style={{ 
                          backgroundColor: 
                            c === 'Blue' ? '#2563eb' : 
                            c === 'Purple' ? '#7c3aed' : 
                            c === 'Green' ? '#16a34a' : 
                            c === 'Red' ? '#dc2626' : 
                            c === 'Orange' ? '#ea580c' : 
                            c === 'Gold' ? '#d97706' : 
                            c === 'Black' ? '#09090b' : 
                            '#71717a'
                        }} />
                      )}
                      {c === 'Auto' && <Wand2 className="h-8 w-8 text-brand-500" />}
                      <span className="font-bold text-slate-800">{c}</span>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
          {step > 1 ? (
            <button onClick={handleBack} className="flex items-center gap-2 px-6 py-3 font-medium text-slate-600 hover:text-slate-900 transition-colors">
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
          ) : <div />}
          
          {step < 4 ? (
            <button 
              onClick={handleNext} 
              disabled={(step === 1 && (!industry || (industry === 'Other' && !customIndustry))) || (step === 2 && (!websiteType || (websiteType === 'Custom' && !customType)))}
              className="flex items-center gap-2 px-8 py-3 rounded-full bg-slate-900 font-medium text-white hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continue <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button 
              onClick={handleGenerate}
              className="flex items-center gap-2 px-8 py-3 rounded-full bg-brand-600 font-bold text-white hover:bg-brand-700 shadow-lg shadow-brand-500/20 transition-all hover:scale-105"
            >
              Generate Website <Wand2 className="ml-2 h-5 w-5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
