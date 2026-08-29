import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, FolderKanban, Loader2, Search, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';

interface Project { id: string; title: string; description: string | null; status: string | null; created_at: string; client_id: string | null; operator_id: string | null; connector_id: string | null; }
type StatusFilter = 'all' | 'active' | 'completed';
const activeStatuses = ['pending','in_progress','review','on_hold','maintenance'];
const completedStatuses = ['completed'];
function formatStatus(status: string | null | undefined) { if (!status) return 'Pending'; return status.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase()); }
function getStatusClasses(status: string | null | undefined) { if (!status) return 'border-accent-500/20 bg-accent-500/10 text-accent-400'; if (completedStatuses.includes(status)) return 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400'; if (activeStatuses.includes(status)) return 'border-accent-500/20 bg-accent-500/10 text-accent-400'; return 'border-ink-700/60 bg-white/5 text-gray-300'; }

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
      setLoading(true); setError(null);
      try {
        const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser();
        if (authError) throw authError;
        if (!currentUser) throw new Error('No authenticated user found.');
        const currentUserId = currentUser.id;
        const { data: roleData, error: roleError } = await supabase.rpc('get_my_roles');
        if (roleError) console.warn('Could not load roles:', roleError);
        const userRoles = Array.isArray(roleData) ? (roleData as Array<{ role: string }>).map((item) => item.role) : roles;
        const workspace = activeWorkspace || (userRoles.includes('owner') ? 'owner' : userRoles.includes('admin') ? 'admin' : userRoles.includes('operator') ? 'operator' : userRoles.includes('connector') ? 'connector' : userRoles.includes('client') ? 'client' : null);
        let query = supabase.from('projects').select('id, title, description, status, created_at, client_id, operator_id, connector_id').order('created_at', { ascending: false });
        if (workspace === 'owner' || workspace === 'admin') {
          // Owner and admin can see all projects.
        } else if (workspace === 'operator') {
          query = query.eq('operator_id', currentUserId);
        } else if (workspace === 'connector') {
          query = query.eq('connector_id', currentUserId);
        } else if (workspace === 'client') {
          query = query.eq('client_id', currentUserId);
        } else {
          if (!cancelled) { setProjects([]); setLoading(false); }
          return;
        }
        const { data: projectData, error: projectError } = await query;
        if (projectError) throw projectError;
        if (cancelled) return;
        setProjects((projectData || []) as Project[]);
      } catch (err) {
        console.error('Error fetching projects:', err);
        if (!cancelled) { setProjects([]); setError(err instanceof Error ? err.message : 'Unable to load projects.'); }
      } finally { if (!cancelled) setLoading(false); }
    }
    fetchProjects();
    return () => { cancelled = true; };
  }, [user?.id, activeWorkspace, roles.join('|')]);

  const filteredProjects = useMemo(() => {
    const searchText = search.trim().toLowerCase();
    return projects.filter((project) => {
      const matchesSearch = !searchText || `${project.title} ${project.description || ''}`.toLowerCase().includes(searchText);
      const matchesFilter = filter === 'all' ? true : filter === 'active' ? !!project.status && activeStatuses.includes(project.status) : !!project.status && completedStatuses.includes(project.status);
      return matchesSearch && matchesFilter;
    });
  }, [projects, search, filter]);

  if (loading) return <div className="space-y-6"><div className="glass rounded-2xl p-12 border border-ink-800/50"><div className="flex flex-col items-center justify-center text-center"><Loader2 className="w-8 h-8 animate-spin text-accent-500 mb-4" /><h2 className="text-lg font-medium text-white">Loading projects</h2><p className="mt-2 text-sm text-gray-400">We are loading the projects assigned to your account.</p></div></div></div>;

  return <div className="space-y-6">
    <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between"><div><h2 className="text-2xl font-bold text-white mb-2">Projects</h2><p className="text-gray-400 text-sm">Track your assigned work and review project details in one place.</p></div><div className="text-sm text-gray-400">{filteredProjects.length} of {projects.length} visible</div></div>
    {error ? <div className="glass rounded-2xl p-10 border border-red-500/20 bg-red-500/5"><div className="flex flex-col items-center text-center"><AlertCircle className="w-10 h-10 text-red-400 mb-4" /><h3 className="text-lg font-medium text-white mb-2">We could not load your projects</h3><p className="text-sm text-gray-400 max-w-xl">{error}</p></div></div> : projects.length === 0 ? <div className="glass rounded-2xl p-12 text-center border border-ink-800/50"><FolderKanban className="w-12 h-12 text-ink-600 mx-auto mb-4" /><h3 className="text-lg font-medium text-white mb-2">No projects assigned</h3><p className="text-gray-400 text-sm max-w-md mx-auto">Projects will appear here once the owner or admin assigns a project to your account.</p></div> : <>
      <div className="glass rounded-2xl p-4 border border-ink-800/50 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"><label className="flex items-center gap-3 rounded-2xl border border-ink-800/50 bg-white/5 px-4 py-3 text-sm text-gray-300 flex-1"><Search className="w-4 h-4 text-gray-500" /><input type="text" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search your projects" className="w-full bg-transparent outline-none placeholder:text-gray-500" /></label><div className="flex flex-wrap gap-2">{[{ value: 'all', label: 'All' },{ value: 'active', label: 'Active' },{ value: 'completed', label: 'Completed' }].map((option) => <button key={option.value} type="button" onClick={() => setFilter(option.value as StatusFilter)} className={`rounded-full px-3 py-2 text-sm font-medium transition-colors ${filter === option.value ? 'bg-accent-600 text-white' : 'bg-white/5 text-gray-300 hover:bg-white/[0.08]'}`}>{option.label}</button>)}</div></div>
      {filteredProjects.length === 0 ? <div className="glass rounded-2xl p-12 text-center border border-ink-800/50"><FolderKanban className="w-12 h-12 text-ink-600 mx-auto mb-4" /><h3 className="text-lg font-medium text-white mb-2">No matching projects</h3><p className="text-gray-400 text-sm">Try adjusting your search or filter.</p></div> : <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">{filteredProjects.map((project) => <div key={project.id} className="glass rounded-2xl p-6 border border-ink-800/50 flex h-full flex-col"><div className="flex items-center justify-between gap-3 mb-4"><div className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] ${getStatusClasses(project.status)}`}>{formatStatus(project.status)}</div><div className="text-xs text-gray-500">{new Date(project.created_at).toLocaleDateString()}</div></div><h3 className="text-lg font-medium text-white">{project.title}</h3>{project.description ? <p className="mt-3 text-sm text-gray-400 line-clamp-3">{project.description}</p> : <p className="mt-3 text-sm text-gray-400">No project summary has been shared yet.</p>}<Link to={`/portal/projects/${project.id}`} className="mt-6 inline-flex items-center gap-2 rounded-xl bg-accent-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-500">View Project<ArrowRight className="w-4 h-4" /></Link></div>)}</div>}
    </>}
  </div>;
}
