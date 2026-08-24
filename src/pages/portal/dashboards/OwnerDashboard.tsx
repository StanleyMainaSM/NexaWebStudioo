import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import {
  Briefcase,
  FileText,
  FolderKanban,
  RefreshCw,
  ShieldCheck,
  Users,
} from 'lucide-react';

export default function OwnerDashboard() {
  const [stats, setStats] = useState({
    projects: 0,
    invoices: 0,
    messages: 0,
    users: 0,
  });

  const [refreshing, setRefreshing] = useState(false);

  const loadStats = async () => {
    const [
      { count: projectsCount },
      { count: invoicesCount },
      { count: messagesCount },
    ] = await Promise.all([
      supabase
        .from('projects')
        .select('*', {
          count: 'exact',
          head: true,
        }),

      supabase
        .from('invoices')
        .select('*', {
          count: 'exact',
          head: true,
        }),

      supabase
        .from('messages')
        .select('*', {
          count: 'exact',
          head: true,
        }),
    ]);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    let usersCount = 0;

    if (session?.access_token) {
      try {
        const response = await fetch(
          '/api/owner/users',
          {
            method: 'GET',
            headers: {
              Authorization:
                `Bearer ${session.access_token}`,
              Accept: 'application/json',
            },
          }
        );

        if (response.ok) {
          const result = await response.json();
          usersCount = (result.users || []).length;
        }
      } catch (error) {
        console.error(
          'Owner user count could not be loaded:',
          error
        );
      }
    }

    setStats({
      projects: projectsCount || 0,
      invoices: invoicesCount || 0,
      messages: messagesCount || 0,
      users: usersCount,
    });
  };

  useEffect(() => {
    loadStats();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);

    try {
      await loadStats();
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-purple-500/20 bg-purple-500/10">
              <ShieldCheck className="h-6 w-6 text-purple-300" />
            </div>

            <div>
              <h1 className="text-2xl font-bold text-white">
                Owner Dashboard
              </h1>

              <p className="mt-1 text-sm text-gray-400">
                Full business oversight and administration.
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleRefresh}
          disabled={refreshing}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-ink-800/50 bg-white/5 px-4 py-2.5 text-sm font-medium text-gray-300 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-50"
        >
          <RefreshCw
            className={`h-4 w-4 ${
              refreshing ? 'animate-spin' : ''
            }`}
          />

          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        <div className="glass rounded-2xl p-6">
          <div className="mb-4 flex items-center gap-3">
            <FolderKanban className="h-5 w-5 text-accent-500" />

            <div className="text-xs font-bold uppercase tracking-widest text-ink-500">
              Total Projects
            </div>
          </div>

          <div className="text-4xl font-light text-white">
            {stats.projects}
          </div>
        </div>

        <div className="glass rounded-2xl p-6">
          <div className="mb-4 flex items-center gap-3">
            <FileText className="h-5 w-5 text-accent-500" />

            <div className="text-xs font-bold uppercase tracking-widest text-ink-500">
              Total Invoices
            </div>
          </div>

          <div className="text-4xl font-light text-white">
            {stats.invoices}
          </div>
        </div>

        <div className="glass rounded-2xl p-6">
          <div className="mb-4 flex items-center gap-3">
            <Briefcase className="h-5 w-5 text-accent-500" />

            <div className="text-xs font-bold uppercase tracking-widest text-ink-500">
              Messages
            </div>
          </div>

          <div className="text-4xl font-light text-white">
            {stats.messages}
          </div>
        </div>

        <div className="glass rounded-2xl p-6">
          <div className="mb-4 flex items-center gap-3">
            <Users className="h-5 w-5 text-accent-500" />

            <div className="text-xs font-bold uppercase tracking-widest text-ink-500">
              Total Users
            </div>
          </div>

          <div className="text-4xl font-light text-white">
            {stats.users}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-purple-500/20 bg-purple-500/5 p-6">
        <div className="flex items-start gap-4">
          <ShieldCheck className="mt-0.5 h-6 w-6 shrink-0 text-purple-300" />

          <div>
            <h2 className="text-lg font-semibold text-white">
              Owner Control Center
            </h2>

            <p className="mt-2 text-sm leading-6 text-gray-400">
              Sensitive account administration has been moved out of
              the dashboard and into the dedicated User Management
              section in the Owner menu.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
