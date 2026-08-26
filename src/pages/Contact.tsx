import {
  MessageCircle,
  Mail,
  Rocket,
  Shield,
  Clock,
  TrendingUp,
  ArrowUpRight,
  CheckCircle2,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  DEFAULT_WA,
  EMAIL,
  WHATSAPP_INTL,
} from '../lib/constants';
import { useReveal } from '../lib/hooks';

const features = [
  {
    icon: Rocket,
    title: 'Fast Delivery',
    desc: 'Most projects can be delivered within a clear agreed timeline.',
  },
  {
    icon: Shield,
    title: 'Professional',
    desc: 'A business-focused approach from planning through launch.',
  },
  {
    icon: Clock,
    title: 'Direct Communication',
    desc: 'Discuss your project directly with Avelixa through WhatsApp.',
  },
  {
    icon: TrendingUp,
    title: 'Results-Driven',
    desc: 'The goal is a website that supports your business, not just a pretty page.',
  },
];

export default function Contact() {
  useReveal();

  return (
    <div className="relative pt-32 pb-28">
      <div className="max-w-5xl mx-auto px-6">
        <div
          data-reveal
          className="relative overflow-hidden rounded-[2.5rem] p-10 sm:p-16 text-center glass glow"
        >
          <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full bg-accent-500/20 blur-[100px]" />

          <div className="absolute inset-0 overflow-hidden rounded-[2.5rem] opacity-[0.04]">
            <img
              src="https://images.pexels.com/photos/270404/pexels-photo-270404.jpeg?auto=compress&cs=tinysrgb&w=1600"
              alt=""
              className="w-full h-full object-cover"
            />
          </div>

          <div className="relative">
            <div className="text-xs font-semibold uppercase tracking-widest text-accent-400 mb-4">
              Start a Project
            </div>

            <h1 className="font-display font-extrabold text-4xl sm:text-6xl text-white tracking-tight">
              Ready to build a website for your{' '}
              <span className="text-gradient">business?</span>
            </h1>

            <p className="mt-5 text-gray-400 text-lg max-w-2xl mx-auto leading-relaxed">
              Tell Avelixa what your business does, what you need, and what
              you want your website to achieve. We can discuss the right
              approach and next steps directly.
            </p>

            <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
              <a
                href={DEFAULT_WA}
                target="_blank"
                rel="noreferrer"
                className="group inline-flex items-center gap-2.5 px-8 py-4 rounded-full bg-gradient-to-r from-accent-400 to-brand-500 text-ink-950 font-semibold hover:shadow-[0_0_40px_-5px_rgba(34,211,238,0.7)] transition-all"
              >
                <MessageCircle className="w-5 h-5" />
                Hire Avelixa on WhatsApp
                <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </a>

              <a
                href={`mailto:${EMAIL}`}
                className="inline-flex items-center gap-2.5 px-8 py-4 rounded-full glass text-white font-medium hover:bg-white/10 transition-colors"
              >
                <Mail className="w-5 h-5" />
                Email Avelixa
              </a>
            </div>

            <div className="mt-7 text-sm text-gray-500">
              Prefer a call?{' '}
              <a
                href={`tel:+${WHATSAPP_INTL}`}
                className="text-accent-400 font-medium hover:text-accent-300"
              >
                +254 100 601 060
              </a>
            </div>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-10">
          {features.map((feature, i) => (
            <div
              key={feature.title}
              data-reveal
              style={{ transitionDelay: `${i * 60}ms` }}
              className="glass rounded-2xl p-6"
            >
              <feature.icon className="w-7 h-7 text-accent-400 mb-3" />

              <h3 className="font-display font-semibold text-white mb-1">
                {feature.title}
              </h3>

              <p className="text-sm text-gray-400 leading-relaxed">
                {feature.desc}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-10 grid md:grid-cols-3 gap-4" data-reveal>
          <div className="glass rounded-2xl p-6">
            <CheckCircle2 className="w-5 h-5 text-accent-400 mb-3" />
            <div className="text-xs uppercase tracking-widest text-gray-500 mb-1">
              WhatsApp
            </div>
            <div className="text-white font-medium">
              +254 100 601 060
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Best for discussing your project quickly.
            </p>
          </div>

          <div className="glass rounded-2xl p-6">
            <CheckCircle2 className="w-5 h-5 text-accent-400 mb-3" />
            <div className="text-xs uppercase tracking-widest text-gray-500 mb-1">
              Email
            </div>
            <div className="text-white font-medium break-all">
              {EMAIL}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Good for detailed project requirements.
            </p>
          </div>

          <div className="glass rounded-2xl p-6">
            <CheckCircle2 className="w-5 h-5 text-accent-400 mb-3" />
            <div className="text-xs uppercase tracking-widest text-gray-500 mb-1">
              Pricing
            </div>
            <div className="text-white font-medium">
              From KSh 15,000
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Explore packages before starting a conversation.
            </p>
          </div>
        </div>

        <div className="mt-12 text-center" data-reveal>
          <p className="text-gray-500 text-sm mb-4">
            Want to see what we offer first?
          </p>

          <div className="flex flex-wrap justify-center gap-5">
            <Link
              to="/services"
              className="text-accent-400 hover:text-accent-300 text-sm font-medium"
            >
              Services
            </Link>

            <Link
              to="/work"
              className="text-accent-400 hover:text-accent-300 text-sm font-medium"
            >
              Our Work
            </Link>

            <Link
              to="/pricing"
              className="text-accent-400 hover:text-accent-300 text-sm font-medium"
            >
              Pricing
            </Link>

            <Link
              to="/reviews"
              className="text-accent-400 hover:text-accent-300 text-sm font-medium"
            >
              Reviews
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}