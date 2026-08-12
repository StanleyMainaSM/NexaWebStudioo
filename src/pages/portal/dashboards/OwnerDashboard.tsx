import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { Users, FolderKanban, Briefcase, FileText } from 'lucide-react';

export default function OwnerDashboard() {
  const [stats, setStats] = useState({
    projects: 0,
    invoices: 0,
    messages: 0,
    users: 0,
  });

  useEffect(() => {
    async function loadStats() {
      const [
        { count: projectsCount },
        { count: invoicesCount },
        { count: messagesCount },
        { count: usersCount },
      ] = await Promise.all([
        supabase.from('projects').select('*', { count: 'exact', head: true }),
        supabase.from('invoices').select('*', { count: 'exact', head: true }),
        supabase.from('messages').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
      ]);

      setStats({
        projects: projectsCount || 0,
        invoices: invoicesCount || 0,
        messages: messagesCount || 0,
        users: usersCount || 0,
      });
    }

    loadStats();
  }, []);

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
        <div className="glass rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <FolderKanban className="w-5 h-5 text-accent-500" />
            <div className="text-xs font-bold text-ink-500 uppercase tracking-widest">Total Projects</div>
          </div>
          <div className="text-4xl font-light text-white">{stats.projects}</div>
        </div>
        
        <div className="glass rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <FileText className="w-5 h-5 text-accent-500" />
            <div className="text-xs font-bold text-ink-500 uppercase tracking-widest">Total Invoices</div>
          </div>
          <div className="text-4xl font-light text-white">{stats.invoices}</div>
        </div>
        
        <div className="glass rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <Briefcase className="w-5 h-5 text-accent-500" />
            <div className="text-xs font-bold text-ink-500 uppercase tracking-widest">Messages</div>
          </div>
          <div className="text-4xl font-light text-white">{stats.messages}</div>
        </div>

        <div className="glass rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <Users className="w-5 h-5 text-accent-500" />
            <div className="text-xs font-bold text-ink-500 uppercase tracking-widest">Total Users</div>
          </div>
          <div className="text-4xl font-light text-white">{stats.users}</div>
        </div>
      </div>
    </div>
  );
}
