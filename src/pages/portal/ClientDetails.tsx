import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import {
  ArrowLeft,
  Users,
  Mail,
  Calendar,
  FolderKanban,
  Clock,
  CheckCircle2,
  XCircle,
  PauseCircle,
} from 'lucide-react';

interface Client {
  id: string;
  email: string | null;
  full_name: string | null;
  created_at: string;
}

interface Project {
  id: string;
  title: string;
  description: string | null;
  status: string | null;
  price: number | null;
  created_at: string;
}

function formatStatus(status: string | null) {
  switch (status) {
    case 'pending':
      return 'Pending';

    case 'in_progress':
      return 'In Progress';

    case 'review':
      return 'Review';

    case 'completed':
      return 'Completed';

    case 'cancelled':
      return 'Cancelled';

    case 'on_hold':
      return 'On Hold';

    case 'maintenance':
      return 'Maintenance';

    default:
      return 'Unknown';
  }
}

function getStatusClasses(status: string | null) {
  switch (status) {
    case 'completed':
      return 'bg-green-500/10 text-green-400 border-green-500/20';

    case 'in_progress':
      return 'bg-blue-500/10 text-blue-400 border-blue-500/20';

    case 'review':
      return 'bg-purple-500/10 text-purple-400 border-purple-500/20';

    case 'cancelled':
      return 'bg-red-500/10 text-red-400 border-red-500/20';

    case 'on_hold':
      return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';

    case 'maintenance':
      return 'bg-orange-500/10 text-orange-400 border-orange-500/20';

    case 'pending':
    default:
      return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
  }
}

function getStatusIcon(status: string | null) {
  switch (status) {
    case 'completed':
      return <CheckCircle2 className="w-4 h-4" />;

    case 'cancelled':
      return <XCircle className="w-4 h-4" />;

    case 'on_hold':
      return <PauseCircle className="w-4 h-4" />;

    case 'in_progress':
    case 'review':
    case 'pending':
    case 'maintenance':
    default:
      return <Clock className="w-4 h-4" />;
  }
}

export default function ClientDetails() {
  const { clientId } = useParams<{ clientId: string }>();

  const [client, setClient] = useState<Client | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [projectsError, setProjectsError] = useState<string | null>(null);

  useEffect(() => {
    async function loadClient() {
      if (!clientId) {
        setError('Client ID is missing.');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const { data, error: clientError } = await supabase
          .from('profiles')
          .select('id, email, full_name, created_at')
          .eq('id', clientId)
          .single();

        if (clientError) {
          throw clientError;
        }

        setClient(data);
      } catch (err) {
        console.error('Error loading client:', err);

        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('Unable to load client.');
        }
      } finally {
        setLoading(false);
      }
    }

    loadClient();
  }, [clientId]);

  useEffect(() => {
    async function loadProjects() {
      if (!clientId) {
        setProjectsLoading(false);
        return;
      }

      setProjectsLoading(true);
      setProjectsError(null);

      try {
        const { data, error: projectError } = await supabase
          .from('projects')
          .select(
            'id, title, description, status, price, created_at'
          )
          .eq('client_id', clientId)
          .order('created_at', { ascending: false });

        if (projectError) {
          throw projectError;
        }

        setProjects(data ?? []);
      } catch (err) {
        console.error('Error loading projects:', err);

        if (err instanceof Error) {
          setProjectsError(err.message);
        } else {
          setProjectsError('Unable to load projects.');
        }
      } finally {
        setProjectsLoading(false);
      }
    }

    loadProjects();
  }, [clientId]);

  if (loading) {
    return (
      <div className="glass rounded-2xl p-8 text-center">
        <p className="text-gray-400">Loading client...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <Link
          to="/portal/clients"
          className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Clients
        </Link>

        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-6">
          <p className="text-red-400 font-medium">
            Unable to load client.
          </p>

          <p className="text-sm text-red-300/80 mt-2">
            {error}
          </p>
        </div>
      </div>
    );
  }

  if (!client) {
    return (
      <div>
        <Link
          to="/portal/clients"
          className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Clients
        </Link>

        <div className="glass rounded-2xl p-10 text-center">
          <Users className="w-10 h-10 text-gray-500 mx-auto mb-4" />

          <h2 className="text-lg font-medium text-white">
            Client not found
          </h2>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Link
        to="/portal/clients"
        className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white mb-8"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Clients
      </Link>

      {/* Client Header */}
      <div className="mb-8">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-accent-600/20 flex items-center justify-center">
            <Users className="w-8 h-8 text-accent-400" />
          </div>

          <div>
            <p className="text-xs text-accent-400 uppercase tracking-widest mb-1">
              Client
            </p>

            <h1 className="text-3xl font-semibold text-white">
              {client.full_name ?? 'Unnamed Client'}
            </h1>
          </div>
        </div>
      </div>

      {/* Client Information */}
      <div className="glass rounded-2xl p-6 mb-6">
        <div className="flex items-center gap-3 mb-6">
          <Users className="w-5 h-5 text-accent-400" />

          <h2 className="text-lg font-medium text-white">
            Client Information
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-widest mb-2">
              Full Name
            </p>

            <p className="text-white">
              {client.full_name ?? 'Not provided'}
            </p>
          </div>

          <div>
            <p className="text-xs text-gray-500 uppercase tracking-widest mb-2">
              Email
            </p>

            <div className="flex items-center gap-2 text-gray-300">
              <Mail className="w-4 h-4 text-gray-500" />
              {client.email ?? 'No email'}
            </div>
          </div>

          <div>
            <p className="text-xs text-gray-500 uppercase tracking-widest mb-2">
              Joined
            </p>

            <div className="flex items-center gap-2 text-gray-300">
              <Calendar className="w-4 h-4 text-gray-500" />

              {new Date(client.created_at).toLocaleDateString()}
            </div>
          </div>
        </div>
      </div>

      {/* Projects */}
      <div className="glass rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <FolderKanban className="w-5 h-5 text-accent-400" />

            <div>
              <h2 className="text-lg font-medium text-white">
                Projects
              </h2>

              <p className="text-sm text-gray-500">
                Projects assigned to this client.
              </p>
            </div>
          </div>

          <div className="px-3 py-1 rounded-full bg-accent-600/10 text-accent-400 text-sm">
            {projects.length}
          </div>
        </div>

        {projectsLoading && (
          <div className="py-8 text-center">
            <p className="text-gray-400">
              Loading projects...
            </p>
          </div>
        )}

        {projectsError && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-5">
            <p className="text-red-400 font-medium">
              Unable to load projects.
            </p>

            <p className="text-sm text-red-300/80 mt-2">
              {projectsError}
            </p>
          </div>
        )}

        {!projectsLoading &&
          !projectsError &&
          projects.length === 0 && (
            <div className="py-10 text-center">
              <FolderKanban className="w-10 h-10 text-gray-600 mx-auto mb-4" />

              <h3 className="text-white font-medium mb-2">
                No projects yet
              </h3>

              <p className="text-sm text-gray-500">
                No projects have been assigned to this client.
              </p>
            </div>
          )}

        {!projectsLoading &&
          !projectsError &&
          projects.length > 0 && (
            <div className="space-y-4">
              {projects.map((project) => (
                <div
                  key={project.id}
                  className="rounded-xl border border-ink-800/60 bg-ink-900/40 p-5"
                >
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    <div className="min-w-0">
                      <h3 className="text-lg font-medium text-white">
                        {project.title}
                      </h3>

                      {project.description && (
                        <p className="text-sm text-gray-400 mt-2">
                          {project.description}
                        </p>
                      )}
                    </div>

                    <div
                      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium shrink-0 ${getStatusClasses(
                        project.status
                      )}`}
                    >
                      {getStatusIcon(project.status)}

                      {formatStatus(project.status)}
                    </div>
                  </div>

                  <div className="mt-5 pt-4 border-t border-ink-800/60 flex flex-wrap gap-x-8 gap-y-3">
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">
                        Price
                      </p>

                      <p className="text-sm text-gray-300">
                        {project.price !== null
                          ? `KSh ${Number(project.price).toLocaleString()}`
                          : 'Not set'}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">
                        Created
                      </p>

                      <p className="text-sm text-gray-300">
                        {new Date(
                          project.created_at
                        ).toLocaleDateString()}
                      </p>
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

