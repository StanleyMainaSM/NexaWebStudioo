import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../lib/auth';
import { FolderKanban, CheckSquare } from 'lucide-react';

export default function DeveloperDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    activeProjects: 0,
    tasks: 0,
  });

  useEffect(() => {
    const userId = user?.id;
    if (!userId) return;

    async function loadStats() {
      const [
        { count: projectsCount },
      ] = await Promise.all([
        supabase.from('projects').select('*', { count: 'exact', head: true }).eq('developer_id', userId).neq('status', 'completed'),
      ]);

      setStats({
        activeProjects: projectsCount || 0,
        tasks: 0, // Mock for now if project_tasks isn't there
      });
    }

    loadStats();
  }, [user]);

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
        <div className="glass rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <FolderKanban className="w-5 h-5 text-accent-500" />
            <div className="text-xs font-bold text-ink-500 uppercase tracking-widest">Active Projects</div>
          </div>
          <div className="text-4xl font-light text-white">{stats.activeProjects}</div>
        </div>
        
        <div className="glass rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <CheckSquare className="w-5 h-5 text-accent-500" />
            <div className="text-xs font-bold text-ink-500 uppercase tracking-widest">My Tasks</div>
          </div>
          <div className="text-4xl font-light text-white">{stats.tasks}</div>
        </div>
      </div>
    </div>
  );
}
