import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CalendarDays, FolderKanban, Loader2, Search, AlertCircle, TrendingUp } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { getClientProjectPresentation } from '../../lib/clientPortal';

interface Project {
  id: string;
  title: string;
  description: string | null;
  status: string | null;
  created_at: string;
  updated_at: string | null;
  deadline: string | null;
  progress: number | null;
  client_id: string | null;
  operator_id: string | null;
  connector_id: string | null;
}

type StatusFilter = 'all' | 'active' | 'completed';

const activeStatuses = ['pending', 'in_progress', 'review', 'pending_review', 'on_hold', 'maintenance'];
const completedStatuses = ['completed'];

function formatDate(value: string | null | undefined) {
  if (!value) return 'Not set';
  return new Date(value).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatStatus(status: string | null | undefined) {
  return getClientProjectPresentation(status).label;
}

function getStatusClasses(status: string | null | undefined) {
  const normalized = String(status || '').toLowerCase();
  if (normalized === 'completed') return 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400';
  if (['review', 'pending_review'].includes(normalized)) return 'border-amber-500/20 bg-amber-500/10 text-amber-400';
  if (activeStatuses.includes(normalized)) return 'border-accent-500/20 bg-accent-500/10 text-accent-400';
  return 'border-ink-700/60 bg-white/5 text-gray-300';
}

function clampProgress(progress: number | null | undefined) {
  return Math.min(100, Math.max(0, Number(progress ?? 0)));
}

export default function Projects() {
  const { user, roles, activeWorkspace } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<StatusFilter>('all');

  useEffect(() => {
    let cancelled = false;

    async function fetchProjects() {
      setLoading(true);
      setError(null);

      try {
        const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser();
        if (authError) throw authError;
        if (!currentUser) throw new Error('No authenticated user found.');

        const { data: roleData, error: roleError } = await supabase.rpc('get_my_roles');
        if (roleError) console.warn('Could not load roles:', roleError);

        const userRoles = Array.isArray(roleData)
          ? (roleData as Array<{ role: string }>).map((item) => item.role)
          : roles;
        const workspace = activeWorkspace || (
          userRoles.includes('owner') ? 'owner' :
          userRoles.includes('admin') ? 'admin' :
          userRoles.includes('operator') ? 'operator' :
          userRoles.includes('connector') ? 'connector' :
          userRoles.includes('client') ? 'client' : null
        );

        let query = supabase
          .from('projects')
          .select('id, title, description, status, created_at, updated_at, deadline, progress, client_id, operator_id, connector_id')
          .order('created_at', { ascending: false });

        if (workspace === 'owner' || workspace === 'admin') {
          // Owner and admin can see all projects.
        } else if (workspace === 'operator') {
          query = query.eq('operator_id', currentUser.id);
        } else if (workspace === 'connector') {
          query = query.eq('connector_id', currentUser.id);
        } else if (workspace === 'client') {
          query = query.eq('client_id', currentUser.id);
        } else {
          if (!cancelled) {
            setProjects([]);
            setLoading(false);
          }
          return;
        }

        const { data: projectData, error: projectError } = await query;
        if (projectError) throw projectError;
        if (cancelled) return;
        setProjects((projectData || []) as Project[]);
      } catch (err) {
        console.error('Error fetching projects:', err);
        if (!cancelled) {
          setProjects([]);
          setError(err instanceof Error ? err.message : 'Unable to load projects.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void fetchProjects();
    return () => { cancelled = true; };
  }, [user?.id, activeWorkspace, roles.join('|')]);

  const filteredProjects = useMemo(() => {
    const searchText = search.trim().toLowerCase();
    return projects.filter((project) => {
      const normalizedStatus = String(project.status || '').toLowerCase();
      const matchesSearch = !searchText || `${project.title} ${project.description || ''}`.toLowerCase().includes(searchText);
      const matchesFilter = filter === 'all'
        ? true
        : filter === 'active'
          ? activeStatuses.includes(normalizedStatus)
          : completedStatuses.includes(normalizedStatus);
      return matchesSearch && matchesFilter;
    });
  }, [projects, search, filter]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="glass rounded-2xl p-12 border border-ink-800/50">
          <div className="flex flex-col items-center justify-center text-center">
            <Loader2 className="w-8 h-8 animate-spin text-accent-500 mb-4" />
            <h2 className="text-lg font-medium text-white">Loading projects</h2>
            <p className="mt-2 text-sm text-gray-400">We are loading the projects assigned to your account.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Projects</h2>
          <p className="mt-2 text-sm text-gray-400">Track your request-to-delivery journey, project progress and next action.</p>
        </div>
        <div className="text-sm text-gray-400">{filteredProjects.length} of {projects.length} visible</div>
      </div>

      {error ? (
        <div className="glass rounded-2xl p-10 border border-red-500/20 bg-red-500/5">
          <div className="flex flex-col items-center text-center">
            <AlertCircle className="w-10 h-10 text-red-400 mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">We could not load your projects</h3>
            <p className="text-sm text-gray-400 max-w-xl">{error}</p>
          </div>
        </div>
      ) : projects.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center border border-ink-800/50">
          <FolderKanban className="w-12 h-12 text-ink-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No projects assigned</h3>
          <p className="text-gray-400 text-sm max-w-md mx-auto">Your request will appear here as a project once it is converted and assigned to your account.</p>
        </div>
      ) : (
        <>
          <div className="glass rounded-2xl p-4 border border-ink-800/50 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <label className="flex items-center gap-3 rounded-2xl border border-ink-800/50 bg-white/5 px-4 py-3 text-sm text-gray-300 flex-1">
              <Search className="w-4 h-4 text-gray-500" />
              <input type="text" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search your projects" className="w-full bg-transparent outline-none placeholder:text-gray-500" />
            </label>
            <div className="flex flex-wrap gap-2">
              {[{ value: 'all', label: 'All' }, { value: 'active', label: 'Active' }, { value: 'completed', label: 'Completed' }].map((option) => (
                <button key={option.value} type="button" onClick={() => setFilter(option.value as StatusFilter)} className={`rounded-full px-3 py-2 text-sm font-medium transition-colors ${filter === option.value ? 'bg-accent-600 text-white' : 'bg-white/5 text-gray-300 hover:bg-white/[0.08]'}`}>
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {filteredProjects.length === 0 ? (
            <div className="glass rounded-2xl p-12 text-center border border-ink-800/50">
              <FolderKanban className="w-12 h-12 text-ink-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">No matching projects</h3>
              <p className="text-gray-400 text-sm">Try adjusting your search or filter.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProjects.map((project) => {
                const progress = clampProgress(project.progress);
                const presentation = getClientProjectPresentation(project.status);
                const status = String(project.status || '').toLowerCase();

                return (
                  <div key={project.id} className="glass rounded-2xl p-6 border border-ink-800/50 flex h-full flex-col">
                    <div className="flex items-center justify-between gap-3 mb-4">
                      <div className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] ${getStatusClasses(project.status)}`}>
                        {formatStatus(project.status)}
                      </div>
                      <div className="text-xs text-gray-500">{formatDate(project.updated_at || project.created_at)}</div>
                    </div>

                    <h3 className="text-lg font-medium text-white">{project.title}</h3>
                    {project.description ? <p className="mt-3 text-sm text-gray-400 line-clamp-3">{project.description}</p> : <p className="mt-3 text-sm text-gray-400">No project summary has been shared yet.</p>}

                    <div className="mt-5 rounded-xl border border-white/5 bg-white/[0.03] p-4">
                      <div className="flex items-center justify-between gap-3 text-xs">
                        <span className="inline-flex items-center gap-2 text-gray-400"><TrendingUp className="h-3.5 w-3.5" />Progress</span>
                        <span className="font-medium text-gray-200">{progress}%</span>
                      </div>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                        <div className="h-full rounded-full bg-accent-500 transition-all" style={{ width: `${progress}%` }} />
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
                        <div className="text-[11px] uppercase tracking-[0.18em] text-gray-500">Next action</div>
                        <div className="mt-1 text-xs leading-5 text-gray-300">{presentation.nextAction}</div>
                      </div>
                      <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
                        <div className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.18em] text-gray-500"><CalendarDays className="h-3 w-3" />Deadline</div>
                        <div className="mt-1 text-xs leading-5 text-gray-300">{formatDate(project.deadline)}</div>
                      </div>
                    </div>

                    {status === 'in_progress' && progress > 0 && project.updated_at && (
                      <p className="mt-4 text-xs text-gray-500">Last updated {formatDate(project.updated_at)}.</p>
                    )}

                    <Link to={`/portal/projects/${project.id}`} className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-accent-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-500">
                      Open project <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
