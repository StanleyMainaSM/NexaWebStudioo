import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';
import {
  FolderKanban,
  Users,
  WalletCards,
  ShieldCheck,
  ArrowRight,
  RefreshCw,
  Activity,
  ReceiptText,
} from 'lucide-react';

type OwnerStats = {
  projects: number;
  clients: number;
  teamMembers: number;
  pendingPayouts: number;
  pendingInvoices: number;
};

const initialStats: OwnerStats = {
  projects: 0,
  clients: 0,
  teamMembers: 0,
  pendingPayouts: 0,
  pendingInvoices: 0,
};

export default function OwnerDashboard() {
  const [stats, setStats] =
    useState<OwnerStats>(initialStats);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState('');

  const loadDashboard = async () => {
    setLoading(true);
    setError('');

    try {
      const [
        projectsResult,
        clientsResult,
        teamResult,
        payoutsResult,
        invoicesResult,
      ] = await Promise.all([
        supabase
          .from('projects')
          .select('*', {
            count: 'exact',
            head: true,
          }),

        supabase
          .from('profiles')
          .select('*', {
            count: 'exact',
            head: true,
          }),

        supabase
          .from('user_roles')
          .select('user_id'),

        supabase
          .from('payouts')
          .select('*', {
            count: 'exact',
            head: true,
          })
          .eq('status', 'pending'),

        supabase
          .from('invoices')
          .select('*', {
            count: 'exact',
            head: true,
          })
          .neq('status', 'paid'),
      ]);

      if (projectsResult.error) {
        throw projectsResult.error;
      }

      if (clientsResult.error) {
        throw clientsResult.error;
      }

      if (teamResult.error) {
        throw teamResult.error;
      }

      if (payoutsResult.error) {
        throw payoutsResult.error;
      }

      if (invoicesResult.error) {
        throw invoicesResult.error;
      }

      const uniqueTeamMembers =
        new Set(
          (teamResult.data || []).map(
            (item) => item.user_id
          )
        );

      setStats({
        projects:
          projectsResult.count || 0,

        clients:
          clientsResult.count || 0,

        teamMembers:
          uniqueTeamMembers.size,

        pendingPayouts:
          payoutsResult.count || 0,

        pendingInvoices:
          invoicesResult.count || 0,
      });
    } catch (err: any) {
      console.error(
        'Owner dashboard error:',
        err
      );

      setError(
        err?.message ||
          'Failed to load the Owner dashboard.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadDashboard();
  }, []);

  const commandCards = [
    {
      title: 'Finance',
      description:
        'Track client payments, invoices, commissions, payouts, referral bonuses and financial activity.',
      icon: WalletCards,
      path: '/portal/owner/finance',
      accent: 'text-emerald-400',
      background:
        'bg-emerald-500/10 border-emerald-500/20',
    },

    {
      title: 'User Management',
      description:
        'Add users, remove users and manage Avelixa roles and access.',
      icon: ShieldCheck,
      path: '/portal/owner/users',
      accent: 'text-accent-400',
      background:
        'bg-accent-500/10 border-accent-500/20',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-accent-500/10 border border-accent-500/20 flex items-center justify-center">
              <Activity className="w-5 h-5 text-accent-400" />
            </div>

            <div>
              <h1 className="text-2xl font-semibold text-white">
                Owner Command Center
              </h1>

              <p className="text-sm text-gray-400 mt-1">
                Complete visibility and control
                over Avelixa.
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => void loadDashboard()}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-ink-800 text-gray-300 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-50"
        >
          <RefreshCw
            className={`w-4 h-4 ${
              loading
                ? 'animate-spin'
                : ''
            }`}
          />

          Refresh
        </button>
      </div>

      {/* Error */}

      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Executive statistics */}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          icon={FolderKanban}
          label="Total Projects"
          value={stats.projects}
          loading={loading}
        />

        <StatCard
          icon={Users}
          label="Profiles"
          value={stats.clients}
          loading={loading}
        />

        <StatCard
          icon={ShieldCheck}
          label="Team Members"
          value={stats.teamMembers}
          loading={loading}
        />

        <StatCard
          icon={WalletCards}
          label="Pending Payouts"
          value={stats.pendingPayouts}
          loading={loading}
        />

        <StatCard
          icon={ReceiptText}
          label="Outstanding Invoices"
          value={stats.pendingInvoices}
          loading={loading}
        />
      </div>

      {/* Owner command modules */}

      <section>
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-white">
            Owner Controls
          </h2>

          <p className="text-sm text-gray-500 mt-1">
            Sensitive business controls are
            restricted to the Owner.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-5">
          {commandCards.map((card) => {
            const Icon = card.icon;

            return (
              <Link
                key={card.path}
                to={card.path}
                className="group rounded-2xl border border-ink-800/60 bg-ink-900/40 p-6 hover:border-accent-500/30 hover:bg-ink-900/70 transition-all"
              >
                <div className="flex items-start justify-between gap-4">
                  <div
                    className={`w-12 h-12 rounded-xl border flex items-center justify-center ${card.background}`}
                  >
                    <Icon
                      className={`w-6 h-6 ${card.accent}`}
                    />
                  </div>

                  <ArrowRight className="w-5 h-5 text-gray-600 group-hover:text-accent-400 group-hover:translate-x-1 transition-all" />
                </div>

                <h3 className="mt-5 text-lg font-semibold text-white">
                  {card.title}
                </h3>

                <p className="mt-2 text-sm leading-6 text-gray-400">
                  {card.description}
                </p>

                <div className="mt-5 text-xs font-semibold uppercase tracking-widest text-accent-400">
                  Open {card.title}
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Existing operational areas */}

      <section>
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-white">
            Business Overview
          </h2>

          <p className="text-sm text-gray-500 mt-1">
            Continue managing the rest of the
            Avelixa operation.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          <QuickLink
            title="Clients"
            description="Manage Avelixa clients."
            path="/portal/clients"
            icon={Users}
          />

          <QuickLink
            title="Projects"
            description="Review Avelixa projects."
            path="/portal/admin/projects"
            icon={FolderKanban}
          />

          <QuickLink
            title="Team"
            description="Manage operational team members."
            path="/portal/admin/team"
            icon={ShieldCheck}
          />
        </div>
      </section>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  loading,
}: {
  icon: typeof FolderKanban;
  label: string;
  value: number;
  loading: boolean;
}) {
  return (
    <div className="rounded-2xl border border-ink-800/60 bg-ink-900/40 p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs font-bold text-gray-500 uppercase tracking-widest">
          {label}
        </div>

        <Icon className="w-4 h-4 text-accent-400" />
      </div>

      <div className="mt-4 text-3xl font-light text-white">
        {loading ? '—' : value}
      </div>
    </div>
  );
}

function QuickLink({
  title,
  description,
  path,
  icon: Icon,
}: {
  title: string;
  description: string;
  path: string;
  icon: typeof FolderKanban;
}) {
  return (
    <Link
      to={path}
      className="group rounded-2xl border border-ink-800/60 bg-ink-900/40 p-5 hover:border-accent-500/30 transition-all"
    >
      <div className="flex items-center justify-between">
        <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
          <Icon className="w-5 h-5 text-accent-400" />
        </div>

        <ArrowRight className="w-4 h-4 text-gray-600 group-hover:text-accent-400 transition-colors" />
      </div>

      <h3 className="mt-4 font-semibold text-white">
        {title}
      </h3>

      <p className="mt-1 text-sm text-gray-500">
        {description}
      </p>
    </Link>
  );
}