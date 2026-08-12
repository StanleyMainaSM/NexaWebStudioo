import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { ArrowRight, FolderKanban, Loader2, Search } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Project {
  id: string;
  title: string;
  description: string | null;
  status: string | null;
  price: number | null;
  created_at: string;
}

type StatusFilter = 'all' | 'active' | 'completed';

const activeStatuses = ['pending', 'in_progress', 'review', 'on_hold', 'maintenance'];
const completedStatuses = ['completed'];

function formatStatus(status: string | null | undefined) {
  if (!status) return 'Pending';
  return status.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

function getStatusClasses(status: string | null | undefined) {
  if (!status) {
    return 'border-accent-500/20 bg-accent-500/10 text-accent-400';
  }

  if (completedStatuses.includes(status)) {
    return 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400';
  }

  if (activeStatuses.includes(status)) {
    return 'border-accent-500/20 bg-accent-500/10 text-accent-400';
  }

  return 'border-ink-700/60 bg-white/5 text-gray-300';
}

function formatCurrency(value: number | null | undefined) {
  if (typeof value !== 'number') return null;
  return `KSh ${value.toLocaleString()}`;
}

export default function Projects() {
  const { user, roles } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<StatusFilter>('all');

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    let isMounted = true;

    async function fetchProjects() {
      setLoading(true);
      setError(null);

      try {
        const userId = user?.id;
        if (!userId) {
          setError('You must be signed in to view projects.');
          return;
        }

        let query = supabase
          .from('projects')
          .select('id, title, description, status, price, created_at')
          .order('created_at', { ascending: false });

        if (roles.includes('owner') || roles.includes('admin')) {
          // See all projects
        } else if (roles.includes('client')) {
          query = query.eq('client_id', userId);
        } else if (roles.includes('developer')) {
          query = query.eq('developer_id', userId);
        } else if (roles.includes('connector')) {
          query = query.eq('connector_id', userId);
        }

        const { data, error } = await query;
        if (error) throw error;

        if (!isMounted) return;
        setProjects((data || []) as Project[]);
      } catch (err) {
        console.error('Error fetching projects:', err);
        if (isMounted) {
          setError('We could not load your projects right now. Please try again shortly.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchProjects();

    return () => {
      isMounted = false;
    };
  }, [user, roles]);

  const filteredProjects = useMemo(() => {
    const query = search.trim().toLowerCase();

    return projects.filter((project) => {
      const matchesSearch = !query || `${project.title} ${project.description || ''}`.toLowerCase().includes(query);
      const matchesFilter = filter === 'all'
        ? true
        : filter === 'active'
          ? !!project.status && activeStatuses.includes(project.status)
          : !!project.status && completedStatuses.includes(project.status);

      return matchesSearch && matchesFilter;
    });
  }, [projects, search, filter]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="glass rounded-2xl p-6 border border-ink-800/50">
          <div className="flex items-center gap-3 text-white">
            <Loader2 className="w-5 h-5 animate-spin text-accent-500" />
            <span>Loading your projects…</span>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="glass rounded-2xl p-6 border border-ink-800/50 h-48 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="mb-2 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Projects</h2>
          <p className="text-gray-400 text-sm">Track your active work and review project details in one place.</p>
        </div>
        <div className="text-sm text-gray-400">{filteredProjects.length} of {projects.length} visible</div>
      </div>

      {error ? (
        <div className="glass rounded-2xl p-12 text-center border border-ink-800/50">
          <FolderKanban className="w-12 h-12 text-ink-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">We could not load your projects</h3>
          <p className="text-gray-400 text-sm">{error}</p>
        </div>
      ) : projects.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center border border-ink-800/50">
          <FolderKanban className="w-12 h-12 text-ink-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No projects yet</h3>
          <p className="text-gray-400 text-sm">Projects will appear here once they have been assigned to your account.</p>
        </div>
      ) : (
        <>
          <div className="glass rounded-2xl p-4 border border-ink-800/50 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <label className="flex items-center gap-3 rounded-2xl border border-ink-800/50 bg-white/5 px-4 py-3 text-sm text-gray-300 flex-1">
              <Search className="w-4 h-4 text-gray-500" />
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search your projects"
                className="w-full bg-transparent outline-none placeholder:text-gray-500"
              />
            </label>

            <div className="flex flex-wrap gap-2">
              {[
                { value: 'all', label: 'All' },
                { value: 'active', label: 'Active' },
                { value: 'completed', label: 'Completed' },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setFilter(option.value as StatusFilter)}
                  className={`rounded-full px-3 py-2 text-sm font-medium transition-colors ${filter === option.value ? 'bg-accent-600 text-white' : 'bg-white/5 text-gray-300 hover:bg-white/[0.08]'}`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {filteredProjects.length === 0 ? (
            <div className="glass rounded-2xl p-12 text-center border border-ink-800/50">
              <FolderKanban className="w-12 h-12 text-ink-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">No matching projects</h3>
              <p className="text-gray-400 text-sm">Try adjusting your search or filter to find the project you need.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProjects.map((project) => (
                <div key={project.id} className="glass rounded-2xl p-6 border border-ink-800/50 flex h-full flex-col">
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <div className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] ${getStatusClasses(project.status)}`}>
                      {formatStatus(project.status)}
                    </div>
                    <div className="text-xs text-gray-500">{new Date(project.created_at).toLocaleDateString()}</div>
                  </div>

                  <h3 className="text-lg font-medium text-white">{project.title}</h3>
                  {project.description ? (
                    <p className="mt-3 text-sm text-gray-400 line-clamp-3">{project.description}</p>
                  ) : (
                    <p className="mt-3 text-sm text-gray-400">No project summary has been shared yet.</p>
                  )}

                  <div className="mt-5 flex items-center justify-between text-sm text-gray-400">
                    <div>{formatCurrency(project.price) || 'Budget pending'}</div>
                    <div className="text-xs uppercase tracking-[0.2em] text-ink-500">{project.status || 'pending'}</div>
                  </div>

                  <Link to={`/portal/projects/${project.id}`} className="mt-6 inline-flex items-center gap-2 rounded-xl bg-accent-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-500">
                    View Project
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
