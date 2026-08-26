import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import {
  Users,
  FolderKanban,
  Briefcase,
  UserPlus,
  CheckCircle2,
  XCircle,
  Clock3,
  Loader2,
} from 'lucide-react';

type ConnectorApplication = {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  county: string;
  town: string;
  status: string;
  created_at: string;
};

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    projects: 0,
    messages: 0,
    users: 0,
    applications: 0,
  });

  const [applications, setApplications] = useState<
    ConnectorApplication[]
  >([]);

  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const loadDashboard = async () => {
    setLoading(true);

    const [
      { count: projectsCount },
      { count: messagesCount },
      { count: usersCount },
      { count: applicationsCount },
      { data: applicationsData },
    ] = await Promise.all([
      supabase
        .from('projects')
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

      supabase
        .from('profiles')
        .select('*', {
          count: 'exact',
          head: true,
        }),

      supabase
        .from('connector_applications')
        .select('*', {
          count: 'exact',
          head: true,
        })
        .eq('status', 'pending'),

      supabase
        .from('connector_applications')
        .select(
          'id, full_name, email, phone, county, town, status, created_at'
        )
        .eq('status', 'pending')
        .order('created_at', {
          ascending: false,
        }),
    ]);

    setStats({
      projects: projectsCount || 0,
      messages: messagesCount || 0,
      users: usersCount || 0,
      applications: applicationsCount || 0,
    });

    setApplications(
      (applicationsData as ConnectorApplication[]) || []
    );

    setLoading(false);
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const processApplication = async (
    applicationId: string,
    action: 'approve' | 'reject'
  ) => {
    setProcessingId(applicationId);

    try {
      const response = await fetch(
        `/api/admin/connector-applications/${applicationId}/${action}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(
          `Unable to ${action} connector application.`
        );
      }

      await loadDashboard();
    } catch (error) {
      console.error(error);

      window.alert(
        error instanceof Error
          ? error.message
          : `Unable to ${action} connector application.`
      );
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-7 h-7 text-accent-500 animate-spin mx-auto mb-4" />

          <p className="text-gray-400 text-sm">
            Loading admin workspace...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {/* =====================================================
          HEADER
      ====================================================== */}

      <div>
        <div className="text-xs font-bold text-accent-500 uppercase tracking-widest mb-2">
          Administration
        </div>

        <h1 className="text-3xl font-light tracking-tight text-white">
          Admin Dashboard
        </h1>

        <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-400">
          Manage Avelixa clients, projects, users, communications,
          and operational activities from your administration
          workspace.
        </p>
      </div>

      {/* =====================================================
          OPERATIONAL STATS
          Finance is intentionally NOT included here.
      ====================================================== */}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
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
            <Briefcase className="w-5 h-5 text-accent-500" />

            <div className="text-xs font-bold text-ink-500 uppercase tracking-widest">
              Messages
            </div>
          </div>

          <div className="text-4xl font-light text-white">
            {stats.messages}
          </div>
        </div>

        <div className="glass rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <Users className="w-5 h-5 text-accent-500" />

            <div className="text-xs font-bold text-ink-500 uppercase tracking-widest">
              Total Users
            </div>
          </div>

          <div className="text-4xl font-light text-white">
            {stats.users}
          </div>
        </div>

        <div className="glass rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <UserPlus className="w-5 h-5 text-accent-500" />

            <div className="text-xs font-bold text-ink-500 uppercase tracking-widest">
              Pending Applications
            </div>
          </div>

          <div className="text-4xl font-light text-white">
            {stats.applications}
          </div>
        </div>
      </div>

      {/* =====================================================
          CONNECTOR APPLICATIONS
      ====================================================== */}

      <section>
        <div className="flex items-center justify-between gap-4 mb-5">
          <div>
            <h2 className="text-xl font-medium text-white">
              Connector Applications
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Review applicants waiting for administrative action.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-accent-400">
            <Clock3 className="w-4 h-4" />
            {applications.length} pending
          </div>
        </div>

        {applications.length === 0 ? (
          <div className="glass rounded-2xl p-8 text-center">
            <CheckCircle2 className="w-8 h-8 text-accent-500 mx-auto mb-3" />

            <p className="text-white font-medium">
              No pending connector applications
            </p>

            <p className="mt-2 text-sm text-gray-500">
              All connector applications have been reviewed.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {applications.map((application) => {
              const isProcessing =
                processingId === application.id;

              return (
                <div
                  key={application.id}
                  className="glass rounded-2xl p-6"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                    <div className="min-w-0">
                      <h3 className="text-white font-medium">
                        {application.full_name}
                      </h3>

                      <div className="mt-2 space-y-1 text-sm text-gray-400">
                        <p>{application.email}</p>
                        <p>{application.phone}</p>

                        <p>
                          {application.town
                            ? `${application.town}, `
                            : ''}
                          {application.county}
                        </p>
                      </div>

                      <div className="mt-3 text-xs text-gray-600">
                        Applied{' '}
                        {new Date(
                          application.created_at
                        ).toLocaleString()}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        disabled={isProcessing}
                        onClick={() =>
                          processApplication(
                            application.id,
                            'reject'
                          )
                        }
                        className="inline-flex items-center gap-2 rounded-xl border border-red-500/20 px-4 py-3 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/10 disabled:opacity-50"
                      >
                        <XCircle className="w-4 h-4" />
                        Reject
                      </button>

                      <button
                        type="button"
                        disabled={isProcessing}
                        onClick={() =>
                          processApplication(
                            application.id,
                            'approve'
                          )
                        }
                        className="inline-flex items-center gap-2 rounded-xl bg-accent-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-accent-500 disabled:opacity-50"
                      >
                        {isProcessing ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4" />
                        )}

                        Approve
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
