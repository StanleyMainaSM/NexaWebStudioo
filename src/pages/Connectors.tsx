import { useMemo, useState } from 'react';
import { ArrowRight, Check, ChevronDown, Coins, Handshake, LayoutDashboard, Search, Send, Sparkles, Users, Wallet } from 'lucide-react';
import { Link } from 'react-router-dom';

const steps = [
  {
    number: '01',
    icon: Search,
    title: 'Find a business',
    description: 'Spot a business that could benefit from a professional website or stronger digital presence.',
  },
  {
    number: '02',
    icon: Send,
    title: 'Submit the lead',
    description: 'Use your Avelixa Connector access to submit a qualified business lead and its requirements.',
  },
  {
    number: '03',
    icon: Handshake,
    title: 'Avelixa handles delivery',
    description: 'Avelixa works with the client and manages the website project through the existing delivery workflow.',
  },
  {
    number: '04',
    icon: Wallet,
    title: 'Earn your commission',
    description: 'Eligible project commissions are calculated and paid through the existing Avelixa Connector payout workflow.',
  },
];

const benefits = [
  'Earn commission from eligible successful client projects',
  'No need to build the websites yourself',
  'Avelixa handles project delivery with the client',
  'Submit and track leads through your Connector portal',
  'See your Connector ID, commissions and performance information',
  'Refer other people into the Connector program',
];

const portalFeatures = [
  { icon: LayoutDashboard, label: 'Connector dashboard', detail: 'See your activity and commission information.' },
  { icon: Send, label: 'Lead submission', detail: 'Introduce businesses that need Avelixa.' },
  { icon: Coins, label: 'Commissions', detail: 'Track eligible project commission activity.' },
  { icon: Users, label: 'Referrals', detail: 'Build your Connector network through referrals.' },
];

const faqs = [
  {
    question: 'What is an Avelixa Connector?',
    answer: 'An Avelixa Connector identifies businesses that could benefit from Avelixa services and introduces qualified opportunities through the Connector system.',
  },
  {
    question: 'How much commission can I earn?',
    answer: 'The standard Connector commission rate is 20% for eligible project commissions. Your actual commission depends on the qualifying project and the commission configuration recorded for that transaction.',
  },
  {
    question: 'How does the 20% commission work?',
    answer: 'For an eligible project payment of KSh 20,000 at a 20% commission rate, the commission is KSh 4,000. The actual transaction amount is calculated by Avelixa from its financial records.',
  },
  {
    question: 'Do I need to know how to build websites?',
    answer: 'No. The Connector role is focused on identifying and introducing businesses. Avelixa handles the website project delivery.',
  },
  {
    question: 'How do I submit a business?',
    answer: 'After approval and onboarding, eligible Connectors use the Avelixa Connector portal to submit and track leads.',
  },
  {
    question: 'When is commission paid?',
    answer: 'Commission payout follows the existing Avelixa workflow. Once an eligible commission is ready, Avelixa initiates the payout and the Connector confirms receipt through the portal.',
  },
  {
    question: 'Can I refer another Connector?',
    answer: 'Yes. Avelixa Connectors have a referral ID that can be shared with prospective Connectors. A referral becomes successful after the referred applicant completes the required Connector onboarding.',
  },
  {
    question: 'What happens after I apply?',
    answer: 'Your application is reviewed by Avelixa. If approved, the existing secure provisioning and activation process creates your Connector access so you can complete onboarding.',
  },
  {
    question: 'How does Connector approval work?',
    answer: 'Avelixa reviews applications before provisioning Connector access. Approved applicants receive the existing activation/setup process and must complete the required Connector onboarding steps.',
  },
];

const examples = [20000, 35000, 50000];

export default function Connectors() {
  const [projectValue, setProjectValue] = useState('20000');
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const numericValue = useMemo(() => {
    const parsed = Number(projectValue.replace(/[^0-9.]/g, ''));
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
  }, [projectValue]);

  const commission = numericValue * 0.2;

  return (
    <div className="bg-ink-950 text-white overflow-hidden">
      <section className="relative min-h-[calc(100vh-5rem)] flex items-center pt-24 pb-20 px-6 lg:px-12">
        <div className="absolute inset-0 grid-bg opacity-30 pointer-events-none" />
        <div className="absolute -top-40 -left-40 w-[560px] h-[560px] rounded-full bg-accent-500/15 blur-[140px] pointer-events-none" />
        <div className="absolute -bottom-48 right-0 w-[520px] h-[520px] rounded-full bg-indigo-500/10 blur-[140px] pointer-events-none" />
        <div className="max-w-7xl mx-auto w-full relative z-10">
          <div className="grid lg:grid-cols-[1.15fr_.85fr] gap-14 lg:gap-20 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-accent-400/20 bg-accent-400/5 text-accent-300 text-[11px] font-bold uppercase tracking-[0.22em] mb-7">
                <Sparkles className="w-3.5 h-3.5" /> Avelixa Connector Program
              </div>
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-light tracking-[-0.04em] leading-[0.98] mb-7">
                Turn your network into <span className="text-gradient font-medium">opportunity.</span>
              </h1>
              <p className="text-lg sm:text-xl text-gray-400 max-w-2xl leading-relaxed mb-9">
                Become an Avelixa Connector. Find businesses that need better websites, introduce them to Avelixa, and earn a <span className="text-white font-semibold">20% commission</span> on eligible successful projects.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 mb-10">
                <Link to="/connector-apply" className="inline-flex items-center justify-center gap-2 px-7 py-4 rounded-xl bg-zinc-100 text-black hover:bg-accent-400 transition-colors uppercase tracking-widest text-xs font-bold">
                  Become a Connector <ArrowRight className="w-4 h-4" />
                </Link>
                <a href="#how-it-works" className="inline-flex items-center justify-center px-7 py-4 rounded-xl border border-white/10 bg-white/[0.03] text-white hover:bg-white/[0.07] transition-colors uppercase tracking-widest text-xs font-bold">
                  How It Works
                </a>
              </div>
              <div className="flex flex-wrap gap-x-7 gap-y-3 text-sm text-gray-500">
                <span className="inline-flex items-center gap-2"><Check className="w-4 h-4 text-accent-400" /> 20% standard commission</span>
                <span className="inline-flex items-center gap-2"><Check className="w-4 h-4 text-accent-400" /> Connector portal access</span>
                <span className="inline-flex items-center gap-2"><Check className="w-4 h-4 text-accent-400" /> Referral network</span>
              </div>
            </div>

            <div className="relative">
              <div className="glass rounded-[2rem] p-6 sm:p-8 glow">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.22em] text-ink-500 font-bold">Connector opportunity</p>
                    <h2 className="text-2xl font-semibold mt-2">Earn on eligible projects</h2>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-accent-500/10 border border-accent-400/20 flex items-center justify-center">
                    <Coins className="w-6 h-6 text-accent-300" />
                  </div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/20 p-5 mb-4">
                  <div className="flex justify-between text-xs uppercase tracking-widest text-ink-500 mb-2"><span>Example project value</span><span>Estimate</span></div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">KSh</span>
                    <input
                      value={projectValue}
                      onChange={(event) => setProjectValue(event.target.value.replace(/[^0-9.]/g, ''))}
                      inputMode="decimal"
                      aria-label="Project value"
                      className="w-full bg-transparent text-3xl sm:text-4xl font-semibold text-white outline-none"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="rounded-2xl bg-white/[0.04] border border-white/5 p-4">
                    <p className="text-[10px] uppercase tracking-widest text-ink-500 mb-2">Commission rate</p>
                    <p className="text-xl font-semibold">20%</p>
                  </div>
                  <div className="rounded-2xl bg-accent-500/10 border border-accent-400/15 p-4">
                    <p className="text-[10px] uppercase tracking-widest text-accent-200/60 mb-2">Estimated commission</p>
                    <p className="text-xl font-semibold text-accent-200">KSh {commission.toLocaleString('en-KE', { maximumFractionDigits: 2 })}</p>
                  </div>
                </div>
                <p className="text-xs text-gray-500 leading-relaxed">Illustrative calculator only. Actual commission is determined by Avelixa's qualifying payment and transaction records.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="py-24 px-6 lg:px-12 border-y border-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-2xl mb-14">
            <p className="text-xs uppercase tracking-[0.22em] text-accent-400 font-bold mb-4">Simple by design</p>
            <h2 className="text-4xl sm:text-5xl font-light tracking-tight mb-5">Find. Submit. <span className="text-gradient">Connect.</span></h2>
            <p className="text-gray-400 leading-relaxed">Your role is to create the introduction. Avelixa takes the project forward through the existing client and delivery workflow.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {steps.map(({ number, icon: Icon, title, description }) => (
              <div key={number} className="glass rounded-2xl p-6 hover:bg-white/[0.05] transition-colors">
                <div className="flex items-center justify-between mb-7"><div className="w-11 h-11 rounded-xl bg-white/[0.05] border border-white/10 flex items-center justify-center"><Icon className="w-5 h-5 text-accent-300" /></div><span className="font-mono text-xs text-ink-500">{number}</span></div>
                <h3 className="text-lg font-semibold mb-3">{title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 px-6 lg:px-12">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-[.9fr_1.1fr] gap-14 items-start">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-accent-400 font-bold mb-4">Why connect?</p>
            <h2 className="text-4xl sm:text-5xl font-light tracking-tight mb-5">Build a business network that <span className="text-gradient">creates value.</span></h2>
            <p className="text-gray-400 leading-relaxed mb-8">You do not have to be a web developer. If you know business owners, entrepreneurs, shops, professionals or organisations that need a stronger digital presence, you can help make the introduction.</p>
            <Link to="/connector-apply" className="inline-flex items-center gap-2 text-white hover:text-accent-300 transition-colors font-semibold">Start your application <ArrowRight className="w-4 h-4" /></Link>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            {benefits.map((benefit) => <div key={benefit} className="rounded-2xl border border-white/7 bg-white/[0.025] p-5 flex gap-3"><Check className="w-5 h-5 text-accent-400 flex-shrink-0 mt-0.5" /><span className="text-sm text-gray-300 leading-relaxed">{benefit}</span></div>)}
          </div>
        </div>
      </section>

      <section className="py-24 px-6 lg:px-12 bg-white/[0.018] border-y border-white/5">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-[1fr_1fr] gap-12 items-center">
          <div className="glass rounded-[2rem] p-5 sm:p-7">
            <div className="rounded-[1.5rem] border border-white/10 bg-ink-950/80 p-5">
              <div className="flex items-center justify-between border-b border-white/5 pb-5 mb-5"><div><p className="text-[10px] uppercase tracking-widest text-ink-500">Connector portal</p><p className="font-semibold mt-1">Your Avelixa workspace</p></div><span className="px-2.5 py-1 rounded-full bg-green-500/10 text-green-300 text-[10px] font-bold uppercase tracking-widest">Active</span></div>
              <div className="grid grid-cols-2 gap-3">
                {portalFeatures.map(({ icon: Icon, label, detail }) => <div key={label} className="rounded-xl bg-white/[0.035] border border-white/5 p-4"><Icon className="w-4 h-4 text-accent-300 mb-3" /><p className="text-sm font-medium text-white">{label}</p><p className="text-xs text-gray-500 leading-relaxed mt-1">{detail}</p></div>)}
              </div>
            </div>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-accent-400 font-bold mb-4">Your workspace</p>
            <h2 className="text-4xl sm:text-5xl font-light tracking-tight mb-5">Everything you need to <span className="text-gradient">connect.</span></h2>
            <p className="text-gray-400 leading-relaxed mb-7">Approved Connectors get access to the existing Avelixa portal for lead submission, commission visibility, Connector identity and referral activity.</p>
            <div className="flex items-center gap-3 text-sm text-gray-500"><span className="w-2 h-2 rounded-full bg-accent-400" /> Built around the existing Avelixa Connector workflow</div>
          </div>
        </div>
      </section>

      <section className="py-24 px-6 lg:px-12">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-[.85fr_1.15fr] gap-14 items-start">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-accent-400 font-bold mb-4">Grow the network</p>
              <h2 className="text-4xl sm:text-5xl font-light tracking-tight mb-5">Refer another <span className="text-gradient">Connector.</span></h2>
              <p className="text-gray-400 leading-relaxed mb-7">Once you are an active Connector, you have an Avelixa Connector ID you can share with someone you believe would be a good fit for the program.</p>
              <div className="rounded-2xl border border-accent-400/15 bg-accent-400/[0.04] p-5 text-sm text-gray-300 leading-relaxed">Become a Connector → get your referral ID → invite another Connector → they apply → they complete onboarding → your successful referral is recorded.</div>
            </div>
            <div className="grid sm:grid-cols-3 gap-3">
              {['Share your Connector ID', 'They complete application & onboarding', 'Successful referral is recorded'].map((item, index) => <div key={item} className="glass rounded-2xl p-5"><span className="font-mono text-xs text-accent-400">0{index + 1}</span><p className="font-medium text-white mt-5 leading-relaxed">{item}</p></div>)}
            </div>
          </div>
        </div>
      </section>

      <section className="py-24 px-6 lg:px-12 border-y border-white/5">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12"><p className="text-xs uppercase tracking-[0.22em] text-accent-400 font-bold mb-4">Commission examples</p><h2 className="text-4xl sm:text-5xl font-light tracking-tight">See what <span className="text-gradient">20%</span> looks like.</h2><p className="text-gray-500 mt-4">Illustrative estimates based on the standard 20% Connector commission rate.</p></div>
          <div className="grid md:grid-cols-3 gap-4">
            {examples.map((value) => <div key={value} className="glass rounded-2xl p-6 text-center"><p className="text-xs uppercase tracking-widest text-ink-500 mb-3">Project value</p><p className="text-2xl font-semibold">KSh {value.toLocaleString('en-KE')}</p><div className="my-5 h-px bg-white/5" /><p className="text-xs uppercase tracking-widest text-ink-500 mb-2">20% estimate</p><p className="text-3xl font-semibold text-accent-300">KSh {(value * 0.2).toLocaleString('en-KE')}</p></div>)}
          </div>
        </div>
      </section>

      <section className="py-24 px-6 lg:px-12">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12"><p className="text-xs uppercase tracking-[0.22em] text-accent-400 font-bold mb-4">FAQ</p><h2 className="text-4xl sm:text-5xl font-light tracking-tight">Questions, answered.</h2></div>
          <div className="space-y-2">
            {faqs.map((faq, index) => {
              const isOpen = openFaq === index;
              return <div key={faq.question} className="border border-white/7 rounded-2xl bg-white/[0.02] overflow-hidden"><button type="button" onClick={() => setOpenFaq(isOpen ? null : index)} className="w-full flex items-center justify-between gap-5 text-left p-5 sm:p-6"><span className="font-medium text-white">{faq.question}</span><ChevronDown className={`w-5 h-5 text-gray-500 flex-shrink-0 transition-transform ${isOpen ? 'rotate-180 text-accent-300' : ''}`} /></button>{isOpen && <div className="px-5 sm:px-6 pb-6 text-sm text-gray-400 leading-relaxed max-w-3xl">{faq.answer}</div>}</div>;
            })}
          </div>
        </div>
      </section>

      <section className="px-6 lg:px-12 pb-24">
        <div className="max-w-7xl mx-auto relative overflow-hidden rounded-[2rem] border border-accent-400/15 bg-accent-500/[0.06] p-8 sm:p-12 lg:p-16 text-center">
          <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[520px] h-[320px] rounded-full bg-accent-500/15 blur-[100px] pointer-events-none" />
          <div className="relative z-10">
            <p className="text-xs uppercase tracking-[0.22em] text-accent-300 font-bold mb-4">Ready to connect?</p>
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-light tracking-tight mb-5">Know a business that needs a better website?</h2>
            <p className="text-gray-400 max-w-2xl mx-auto leading-relaxed mb-8">Introduce them to Avelixa. Start your Connector application and build your network one quality connection at a time.</p>
            <Link to="/connector-apply" className="inline-flex items-center justify-center gap-2 px-7 py-4 rounded-xl bg-zinc-100 text-black hover:bg-accent-400 transition-colors uppercase tracking-widest text-xs font-bold">Become a Connector <ArrowRight className="w-4 h-4" /></Link>
          </div>
        </div>
      </section>
    </div>
  );
}
