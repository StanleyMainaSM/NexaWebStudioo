import {
  ArrowUpRight,
  BarChart3,
  CreditCard,
  DollarSign,
  RefreshCw,
  ShieldCheck,
  TrendingUp,
  Users,
} from 'lucide-react';

const metrics = [
  {
    label: 'Revenue',
    value: 'KSh 0',
    note: 'Recorded revenue',
    icon: DollarSign,
  },
  {
    label: 'Recurring Revenue',
    value: 'KSh 0',
    note: 'Active subscriptions',
    icon: RefreshCw,
  },
  {
    label: 'Outstanding',
    value: 'KSh 0',
    note: 'Awaiting payment',
    icon: CreditCard,
  },
  {
    label: 'Client Value',
    value: 'KSh 0',
    note: 'Lifetime value tracked',
    icon: Users,
  },
];

const workflow = [
  'Connector identifies opportunity',
  'Avelixa qualifies opportunity',
  'Service package selected',
  'Quote prepared',
  'Project created',
  'Delivery completed',
  'Subscription activated',
  'Recurring billing begins',
];

export default function RevenueOperations() {
  return (
    <div className="space-y-8">
      <section>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.25em] text-accent-400">
              <BarChart3 className="h-4 w-4" />
              Phase A · Monetization
            </div>

            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white">
              Revenue Operations
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-400">
              Centralize Avelixa's monetization workflow,
              recurring revenue, renewals, client value,
              and commission-aware service operations.
            </p>
          </div>

          <div className="inline-flex items-center gap-2 rounded-full border border-accent-500/20 bg-accent-500/10 px-4 py-2 text-xs font-semibold text-accent-300">
            <ShieldCheck className="h-4 w-4" />
            Owner / Admin Operations
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => {
          const Icon = metric.icon;

          return (
            <div
              key={metric.label}
              className="rounded-2xl border border-ink-800/60 bg-white/[0.03] p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-widest text-gray-500">
                    {metric.label}
                  </p>

                  <p className="mt-3 text-2xl font-semibold text-white">
                    {metric.value}
                  </p>

                  <p className="mt-1 text-xs text-gray-500">
                    {metric.note}
                  </p>
                </div>

                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-accent-500/20 bg-accent-500/10">
                  <Icon className="h-5 w-5 text-accent-400" />
                </div>
              </div>
            </div>
          );
        })}
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="rounded-2xl border border-ink-800/60 bg-white/[0.03] p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-accent-400" />

                <h2 className="text-lg font-semibold text-white">
                  Revenue workflow
                </h2>
              </div>

              <p className="mt-2 text-sm text-gray-500">
                The operating sequence that turns an
                identified business opportunity into
                recurring revenue.
              </p>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            {workflow.map((step, index) => (
              <div
                key={step}
                className="flex items-center gap-4 rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-500/10 text-xs font-bold text-accent-400">
                  {index + 1}
                </div>

                <span className="text-sm text-gray-300">
                  {step}
                </span>

                {index < workflow.length - 1 && (
                  <ArrowUpRight className="ml-auto h-4 w-4 text-gray-700" />
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-ink-800/60 bg-white/[0.03] p-6">
          <h2 className="text-lg font-semibold text-white">
            Monetization controls
          </h2>

          <p className="mt-2 text-sm leading-6 text-gray-500">
            These controls will become database-driven as
            the Phase A revenue foundation is connected to
            live service, subscription, renewal, invoice,
            payment, and commission records.
          </p>

          <div className="mt-6 space-y-3">
            {[
              'Service catalogue',
              'Website packages',
              'Maintenance plans',
              'Hosting services',
              'Domain services',
              'Business email',
              'Renewal tracking',
              'Client notifications',
              'Finance notifications',
              'Eligible commissions',
            ].map((item) => (
              <div
                key={item}
                className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3"
              >
                <div className="h-2 w-2 rounded-full bg-accent-400" />

                <span className="text-sm text-gray-300">
                  {item}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-accent-500/15 bg-accent-500/5 p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-accent-500/20 bg-accent-500/10">
            <BarChart3 className="h-5 w-5 text-accent-400" />
          </div>

          <div>
            <h2 className="text-base font-semibold text-white">
              Automation-first revenue foundation
            </h2>

            <p className="mt-2 text-sm leading-6 text-gray-400">
              Revenue Operations is intentionally structured
              around the Avelixa business flow rather than
              manual calculations. Once the underlying records
              are connected, renewals, reminders, notifications,
              commissions, and client lifetime value can be
              calculated from the database instead of being
              maintained manually.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}