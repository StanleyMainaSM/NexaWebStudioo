import {
  MessageCircle,
  Star,
  ArrowUpRight,
  CheckCircle2,
  Building2,
  Target,
  Users,
  Globe2,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { DEFAULT_WA } from '../lib/constants';
import { useReveal } from '../lib/hooks';

const strengths = [
  {
    icon: Target,
    title: 'Business-focused',
    desc: 'Every website is built around what the business wants customers to do next.',
  },
  {
    icon: Building2,
    title: 'Professional presence',
    desc: 'We help businesses establish a credible and modern presence online.',
  },
  {
    icon: Users,
    title: 'Customer-focused',
    desc: 'Design decisions are made with the target customer and their experience in mind.',
  },
  {
    icon: Globe2,
    title: 'Built for the web',
    desc: 'Responsive, fast, modern websites designed for customers across devices.',
  },
];

export default function About() {
  useReveal();

  return (
    <div className="relative pt-32 pb-28">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div className="relative" data-reveal>
            <div className="relative rounded-3xl overflow-hidden">
              <img
                src="/images/profile.jpg"
                alt="Avelixa web design and development studio"
                className="w-full h-[520px] object-cover"
              />

              <div className="absolute inset-0 bg-gradient-to-t from-ink-950/80 via-transparent to-transparent" />

              <div className="absolute bottom-6 left-6 right-6">
                <div className="glass rounded-2xl p-5">
                  <div className="text-xs uppercase tracking-widest text-accent-400 mb-2">
                    Avelixa
                  </div>

                  <div className="font-display font-bold text-2xl text-white">
                    Web Design & Development
                  </div>

                  <div className="text-sm text-gray-400 mt-1">
                    Business-focused. Growth-driven.
                  </div>
                </div>
              </div>
            </div>

            <div className="absolute -bottom-6 -right-6 glass rounded-2xl p-5 glow">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-accent-400/20 flex items-center justify-center">
                  <Star className="w-5 h-5 text-accent-400 fill-accent-400" />
                </div>

                <div>
                  <div className="text-xs text-gray-500 mb-0.5">
                    What we focus on
                  </div>

                  <div className="text-sm font-semibold text-white">
                    Quality & Results
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div data-reveal style={{ transitionDelay: '120ms' }}>
            <div className="text-xs font-semibold uppercase tracking-widest text-accent-400 mb-4">
              About Avelixa
            </div>

            <h1 className="font-display font-bold text-4xl sm:text-5xl text-white tracking-tight mb-6">
              A professional web design and development studio
            </h1>

            <p className="text-gray-300 text-lg leading-relaxed mb-5">
              Avelixa helps businesses build a stronger presence online through
              professional, modern, and purpose-driven websites.
            </p>

            <p className="text-gray-400 leading-relaxed mb-8">
              We believe a business website should do more than simply exist.
              It should communicate what you offer, build confidence with
              potential customers, make it easy to take action, and support
              the growth of your business.
            </p>

            <div className="grid sm:grid-cols-2 gap-4 mb-8">
              {strengths.map((item) => (
                <div key={item.title} className="glass rounded-xl p-5">
                  <item.icon className="w-5 h-5 text-accent-400 mb-3" />

                  <div className="font-semibold text-white text-sm mb-1">
                    {item.title}
                  </div>

                  <div className="text-xs text-gray-500 leading-relaxed">
                    {item.desc}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-4">
              <a
                href={DEFAULT_WA}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2.5 px-7 py-4 rounded-full bg-gradient-to-r from-accent-400 to-brand-500 text-ink-950 font-semibold hover:shadow-[0_0_40px_-5px_rgba(34,211,238,0.6)] transition-all"
              >
                <MessageCircle className="w-5 h-5" />
                Talk to Avelixa
              </a>

              <Link
                to="/work"
                className="inline-flex items-center gap-2.5 px-7 py-4 rounded-full glass text-white hover:text-accent-400 transition-colors"
              >
                See Our Work
                <ArrowUpRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>

        {/* Trust section */}
        <div className="mt-28" data-reveal>
          <div className="max-w-3xl mb-10">
            <div className="text-xs font-semibold uppercase tracking-widest text-accent-400 mb-3">
              Why Avelixa
            </div>

            <h2 className="font-display font-bold text-4xl sm:text-5xl text-white tracking-tight">
              We build websites with a reason behind every decision
            </h2>

            <p className="mt-4 text-gray-400 leading-relaxed">
              From the first conversation to launch, the goal is simple:
              create a digital experience that makes your business easier to
              understand, easier to trust, and easier to choose.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-5">
            <div className="glass rounded-2xl p-7">
              <CheckCircle2 className="w-6 h-6 text-accent-400 mb-4" />
              <h3 className="font-display font-semibold text-xl text-white mb-2">
                Clear communication
              </h3>
              <p className="text-gray-400 leading-relaxed">
                You should always understand what is being built, why it is
                being built, and what happens next.
              </p>
            </div>

            <div className="glass rounded-2xl p-7">
              <CheckCircle2 className="w-6 h-6 text-accent-400 mb-4" />
              <h3 className="font-display font-semibold text-xl text-white mb-2">
                Modern technology
              </h3>
              <p className="text-gray-400 leading-relaxed">
                We use modern web technologies to create fast, responsive, and
                maintainable digital experiences.
              </p>
            </div>

            <div className="glass rounded-2xl p-7">
              <CheckCircle2 className="w-6 h-6 text-accent-400 mb-4" />
              <h3 className="font-display font-semibold text-xl text-white mb-2">
                Long-term value
              </h3>
              <p className="text-gray-400 leading-relaxed">
                The objective is not simply to launch a website, but to give
                your business a useful digital asset.
              </p>
            </div>
          </div>
        </div>

        {/* Process section */}
        <div className="mt-28">
          <div className="grid lg:grid-cols-5 gap-16 items-center">
            <div className="lg:col-span-2" data-reveal>
              <div className="text-xs font-semibold uppercase tracking-widest text-accent-400 mb-3">
                How It Works
              </div>

              <h2 className="font-display font-bold text-4xl sm:text-5xl text-white tracking-tight mb-5">
                A simple path from idea to launch
              </h2>

              <p className="text-gray-400 leading-relaxed">
                No unnecessary complexity. We understand your business,
                establish the direction, build the experience, and prepare
                your website for launch.
              </p>
            </div>

            <div className="lg:col-span-3 grid sm:grid-cols-2 gap-5">
              {[
                {
                  n: '01',
                  title: 'Discovery',
                  desc: 'We discuss your business, goals, customers, services, and what you need the website to achieve.',
                },
                {
                  n: '02',
                  title: 'Design',
                  desc: 'We create a professional visual direction and structure the experience around your customers.',
                },
                {
                  n: '03',
                  title: 'Build',
                  desc: 'The approved design is developed into a responsive, functional website.',
                },
                {
                  n: '04',
                  title: 'Launch',
                  desc: 'We prepare the website for launch and make sure the finished experience is ready for customers.',
                },
              ].map((step, i) => (
                <div
                  key={step.n}
                  data-reveal
                  style={{ transitionDelay: `${i * 80}ms` }}
                  className="glass rounded-2xl p-7"
                >
                  <div className="font-display font-extrabold text-5xl text-white/10 mb-3">
                    {step.n}
                  </div>

                  <h3 className="font-display font-semibold text-xl text-white mb-2">
                    {step.title}
                  </h3>

                  <p className="text-gray-400 text-sm leading-relaxed">
                    {step.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-16 text-center" data-reveal>
          <p className="text-gray-400 mb-5">
            Ready to build your business's online presence?
          </p>

          <Link
            to="/contact"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-gradient-to-r from-accent-400 to-brand-500 text-ink-950 font-semibold"
          >
            Start Your Project
            <ArrowUpRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
