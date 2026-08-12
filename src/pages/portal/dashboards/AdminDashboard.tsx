import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import {
  FolderKanban,
  Users,
  ClipboardList,
  CheckCircle,
  XCircle,
  RefreshCw,
} from 'lucide-react';

type ConnectorApplication = {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  national_id_secure: string | null;
  county: string | null;
  town: string | null;
  referring_connector_id: string | null;
  status: string | null;
  rejection_reason: string | null;
  admin_notes: string | null;
  created_at: string | null;
};

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    projects: 0,
    leads: 0,
    connectors: 0,
  });

  const [applications, setApplications] = useState<ConnectorApplication[]>([]);
  const [loadingApplications, setLoadingApplications] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState('');

  async function loadDashboard() {
    setError('');

    try {
      const [
        { count: projectsCount },
        { count: leadsCount },
        { count: connectorsCount },
        { data: applicationsData, error: applicationsError },
      ] = await Promise.all([
        supabase
          .from('projects')
          .select('*', { count: 'exact', head: true }),

        supabase
          .from('leads')
          .select('*', { count: 'exact', head: true }),

        supabase
          .from('connector_applications')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending'),

        supabase
          .from('connector_applications')
          .select('*')
          .eq('status', 'pending')
          .order('created_at', { ascending: false }),
      ]);

      if (applicationsError) {
        throw applicationsError;
      }

      setStats({
        projects: projectsCount || 0,
        leads: leadsCount || 0,
        connectors: connectorsCount || 0,
      });

      setApplications(applicationsData || []);
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : 'Failed to load the admin dashboard.'
      );
    } finally {
      setLoadingApplications(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  async function approveApplication(id: string) {
    setActionLoading(id);
    setError('');

    try {
      const { error } = await supabase
        .from('connector_applications')
        .update({
          status: 'approved',
          rejection_reason: null,
        })
        .eq('id', id);

      if (error) {
        throw error;
      }

      await loadDashboard();
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : 'Failed to approve the application.'
      );
    } finally {
      setActionLoading(null);
    }
  }

  async function rejectApplication(id: string) {
    const reason = window.prompt(
      'Enter the reason for rejecting this connector application:'
    );

    if (reason === null) {
      return;
    }

    if (!reason.trim()) {
      setError('A rejection reason is required.');
      return;
    }

    setActionLoading(id);
    setError('');

    try {
      const { error } = await supabase
        .from('connector_applications')
        .update({
          status: 'rejected',
          rejection_reason: reason.trim(),
        })
        .eq('id', id);

      if (error) {
        throw error;
      }

      await loadDashboard();
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : 'Failed to reject the application.'
      );
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-light text-white tracking-tight">
            Owner Dashboard
          </h1>

          <p className="text-gray-400 mt-1">
            Manage Avelixa operations and connector applications.
          </p>
        </div>

        <button
          onClick={loadDashboard}
          disabled={loadingApplications}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 transition-colors disabled:opacity-50"
        >
          <RefreshCw
            className={`w-4 h-4 ${
              loadingApplications ? 'animate-spin' : ''
            }`}
          />

          Refresh
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="glass rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <FolderKanban className="w-5 h-5 text-accent-500" />

            <div className="text-xs font-bold text-ink-500 uppercase tracking-widest">
              Total Projects
            </div>
          </div>

          <div className="text-4xl font-light text-white">
            {stats.projects}
          </div>
        </div>

        <div className="glass rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <ClipboardList className="w-5 h-5 text-accent-500" />

            <div className="text-xs font-bold text-ink-500 uppercase tracking-widest">
              Total Leads
            </div>
          </div>

          <div className="text-4xl font-light text-white">
            {stats.leads}
          </div>
        </div>

        <div className="glass rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <Users className="w-5 h-5 text-accent-500" />

            <div className="text-xs font-bold text-ink-500 uppercase tracking-widest">
              Pending Connectors
            </div>
          </div>

          <div className="text-4xl font-light text-white">
            {stats.connectors}
          </div>
        </div>
      </div>

      {/* Connector Applications */}
      <div className="glass rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-white/5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-medium text-white">
                Connector Applications
              </h2>

              <p className="text-sm text-gray-500 mt-1">
                Review and manage pending connector applications.
              </p>
            </div>

            <div className="px-3 py-1.5 rounded-full bg-accent-500/10 text-accent-400 text-sm font-medium">
              {applications.length} Pending
            </div>
          </div>
        </div>

        {loadingApplications ? (
          <div className="p-10 text-center text-gray-500">
            Loading applications...
          </div>
        ) : applications.length === 0 ? (
          <div className="p-10 text-center">
            <CheckCircle className="w-10 h-10 text-green-400 mx-auto mb-3" />

            <h3 className="text-white font-medium">
              No pending applications
            </h3>

            <p className="text-gray-500 text-sm mt-1">
              New connector applications will appear here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {applications.map((application) => (
              <div
                key={application.id}
                className="p-6 hover:bg-white/[0.02] transition-colors"
              >
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-3 mb-4">
                      <h3 className="text-lg font-medium text-white">
                        {application.full_name}
                      </h3>

                      <span className="px-2.5 py-1 rounded-full bg-yellow-500/10 text-yellow-400 text-xs font-medium uppercase">
                        Pending
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 text-sm">
                      <div>
                        <span className="text-gray-500">
                          Email
                        </span>

                        <div className="text-gray-200 mt-0.5">
                          {application.email}
                        </div>
                      </div>

                      <div>
                        <span className="text-gray-500">
                          Phone
                        </span>

                        <div className="text-gray-200 mt-0.5">
                          {application.phone || 'Not provided'}
                        </div>
                      </div>

                      <div>
                        <span className="text-gray-500">
                          County
                        </span>

                        <div className="text-gray-200 mt-0.5">
                          {application.county || 'Not provided'}
                        </div>
                      </div>

                      <div>
                        <span className="text-gray-500">
                          Town / City
                        </span>

                        <div className="text-gray-200 mt-0.5">
                          {application.town || 'Not provided'}
                        </div>
                      </div>

                      <div>
                        <span className="text-gray-500">
                          Referring Connector
                        </span>

                        <div className="text-gray-200 mt-0.5">
                          {application.referring_connector_id ||
                            'None'}
                        </div>
                      </div>

                      <div>
                        <span className="text-gray-500">
                          Application Date
                        </span>

                        <div className="text-gray-200 mt-0.5">
                          {application.created_at
                            ? new Date(
                                application.created_at
                              ).toLocaleDateString()
                            : 'Unknown'}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row lg:flex-col gap-2 shrink-0">
                    <button
                      onClick={() =>
                        approveApplication(application.id)
                      }
                      disabled={
                        actionLoading === application.id
                      }
                      className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20 transition-colors disabled:opacity-50"
                    >
                      <CheckCircle className="w-4 h-4" />

                      Approve
                    </button>

                    <button
                      onClick={() =>
                        rejectApplication(application.id)
                      }
                      disabled={
                        actionLoading === application.id
                      }
                      className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors disabled:opacity-50"
                    >
                      <XCircle className="w-4 h-4" />

                      Reject
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
