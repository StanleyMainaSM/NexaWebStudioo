import { Link } from 'react-router-dom';
import { motion } from '../motion';
import { ArrowRight, Wand2, Layout, Palette, Code, CheckCircle2, Sparkles, Layers, Search } from 'lucide-react';
import { useAppStore } from '../store';

export default function Home() {
  const templates = useAppStore(state => state.templates);
  const featuredTemplates = templates.slice(0, 3);

  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-brand-50 pt-28 pb-32">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-brand-200/50 via-brand-50 to-white" />
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-100 text-brand-700 font-medium text-sm mb-8 border border-brand-200">
                <Sparkles className="h-4 w-4" />
                TemplateForge 2.0 is now live
              </div>
              <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-slate-900 mb-6">
                Create Beautiful Websites With <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-600 to-indigo-400">AI</span>
              </h1>
              <p className="text-xl text-slate-600 mb-10 leading-relaxed max-w-2xl mx-auto">
                Generate professional website templates tailored to your industry, brand, and style in seconds. No coding required.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  to="/wizard"
                  className="inline-flex h-14 items-center justify-center rounded-full bg-brand-600 px-8 text-base font-medium text-white shadow-lg shadow-brand-500/30 transition-all hover:bg-brand-700 hover:scale-105 w-full sm:w-auto"
                >
                  Create Template <Wand2 className="ml-2 h-5 w-5" />
                </Link>
                <Link
                  to="/gallery"
                  className="inline-flex h-14 items-center justify-center rounded-full bg-white px-8 text-base font-medium text-slate-700 shadow-sm border border-slate-200 transition-all hover:bg-slate-50 hover:scale-105 w-full sm:w-auto"
                >
                  Explore Templates <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Featured Templates Showcase */}
      <section className="py-24 bg-white border-b border-slate-100">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12">
            <div>
              <h2 className="text-3xl font-bold text-slate-900 mb-4">Template Showcase</h2>
              <p className="text-lg text-slate-600">Discover what our AI can build for you.</p>
            </div>
            <Link to="/gallery" className="text-brand-600 font-medium hover:text-brand-700 flex items-center gap-1 mt-4 md:mt-0">
              View all templates <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {featuredTemplates.map((template, i) => (
              <motion.div 
                key={template.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="group flex flex-col bg-slate-50 rounded-2xl overflow-hidden border border-slate-200 transition-all hover:shadow-xl hover:shadow-brand-500/5 hover:-translate-y-1"
              >
                <div 
                  className="aspect-video w-full relative flex flex-col p-4 overflow-hidden" 
                  style={{ backgroundColor: template.theme.background, fontFamily: template.theme.fontFamily }}
                >
                  <div className="w-full flex justify-between items-center mb-4 opacity-50">
                    <div className="font-bold" style={{ color: template.theme.text }}>Logo</div>
                    <div className="flex gap-2">
                      <div className="h-2 w-8 rounded-full" style={{ backgroundColor: template.theme.text }}></div>
                      <div className="h-2 w-8 rounded-full" style={{ backgroundColor: template.theme.text }}></div>
                    </div>
                  </div>
                  <div className="flex-1 flex flex-col justify-center items-center text-center px-4">
                    <div className="w-full max-w-[80%] h-4 md:h-6 rounded mb-2" style={{ backgroundColor: template.theme.text }}></div>
                    <div className="w-full max-w-[60%] h-4 md:h-6 rounded mb-6" style={{ backgroundColor: template.theme.text, opacity: 0.7 }}></div>
                    <div className="px-6 py-2 rounded-full text-xs font-medium" style={{ backgroundColor: template.theme.primary, color: '#fff' }}>
                      CTA Button
                    </div>
                  </div>
                </div>
                <div className="p-6 bg-white border-t border-slate-100 flex-1">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs font-semibold px-2.5 py-1 bg-brand-50 text-brand-700 rounded-md">{template.industry}</span>
                    <span className="text-xs font-medium px-2.5 py-1 bg-slate-100 text-slate-600 rounded-md">{template.style}</span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-1">{template.name}</h3>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-24 bg-slate-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16 max-w-3xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">How it works</h2>
            <p className="text-lg text-slate-600">Three simple steps to your perfect website architecture</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: Search, title: "1. Choose your industry", desc: "Select from dozens of industries or describe your own custom business type for tailored sections." },
              { icon: Palette, title: "2. Set the visual direction", desc: "Pick a design style and color palette. Our AI builds a complete, cohesive design system." },
              { icon: Layers, title: "3. Generate & Customize", desc: "Instantly preview your fully responsive template, edit content, and regenerate specific sections." }
            ].map((step, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 hover:border-brand-200 transition-colors"
              >
                <div className="h-12 w-12 rounded-xl bg-brand-50 flex items-center justify-center mb-6">
                  <step.icon className="h-6 w-6 text-brand-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">{step.title}</h3>
                <p className="text-slate-600 leading-relaxed">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-4xl font-bold text-slate-900 mb-6">Designed for professionals, built by AI.</h2>
              <p className="text-lg text-slate-600 mb-8 leading-relaxed">Every template is crafted using modern web design principles to ensure a premium look and feel. No generic slop, just beautiful usable interfaces.</p>
              <ul className="space-y-5">
                {[
                  "Intelligent industry-specific layouts",
                  "WCAG accessible color contrast generation",
                  "Sophisticated typography pairings",
                  "Fully responsive mobile-first architecture"
                ].map((feature, i) => (
                  <li key={i} className="flex items-start gap-4 text-slate-700">
                    <div className="mt-1 h-6 w-6 rounded-full bg-brand-100 flex items-center justify-center flex-shrink-0">
                      <CheckCircle2 className="h-4 w-4 text-brand-600" />
                    </div>
                    <span className="font-medium text-lg">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-4 pt-12">
                <div className="bg-slate-50 aspect-[4/5] rounded-3xl p-6 flex flex-col items-center justify-center text-center border border-slate-100">
                   <Layout className="h-12 w-12 mb-4 text-brand-500" />
                   <p className="font-bold text-slate-800">Smart Layouts</p>
                </div>
                <div className="bg-brand-950 aspect-square rounded-3xl p-6 flex flex-col items-center justify-center text-center text-white shadow-xl shadow-brand-900/20">
                   <Palette className="h-12 w-12 mb-4 text-brand-300" />
                   <p className="font-bold">Color Systems</p>
                </div>
              </div>
              <div className="space-y-4">
                <div className="bg-brand-600 aspect-square rounded-3xl p-6 flex flex-col items-center justify-center text-center border border-brand-500 text-white shadow-xl shadow-brand-500/20">
                   <Code className="h-12 w-12 mb-4 text-brand-200" />
                   <p className="font-bold">Clean Code</p>
                </div>
                <div className="bg-slate-50 aspect-[4/5] rounded-3xl p-6 flex flex-col items-center justify-center text-center border border-slate-100">
                   <Wand2 className="h-12 w-12 mb-4 text-brand-500" />
                   <p className="font-bold text-slate-800">AI Copywriting</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-brand-950 text-white text-center">
        <div className="mx-auto max-w-3xl px-4">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">Ready to build your next website?</h2>
          <p className="text-xl text-brand-200 mb-10 leading-relaxed">Stop writing boilerplate. Start generating premium experiences tailored to your exact needs.</p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link
              to="/wizard"
              className="inline-flex h-14 items-center justify-center rounded-full bg-white px-8 text-base font-bold text-brand-950 transition-transform hover:scale-105"
            >
              Start Generating Now
            </Link>
            <Link
              to="/gallery"
              className="inline-flex h-14 items-center justify-center rounded-full bg-brand-900 border border-brand-800 px-8 text-base font-bold text-white transition-all hover:bg-brand-800 hover:scale-105"
            >
              View Gallery
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
