import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../lib/auth';
import { FolderKanban, Users, Link as LinkIcon, DollarSign } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function ConnectorDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    leads: 0,
    activeProjects: 0,
    commissions: 0,
  });
  const [connectorProfile, setConnectorProfile] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    const userId = user?.id;
    if (!userId) return;

    async function loadData() {
      // Assuming connector_profiles table exists
      const { data: profileData } = await supabase
        .from('connector_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();
            
      if (profileData) {
        setConnectorProfile(profileData);
      }

      const [
        { count: leadsCount },
        { count: projectsCount },
        { data: commissionsData }
      ] = await Promise.all([
        supabase.from('leads').select('*', { count: 'exact', head: true }).eq('connector_id', userId),
        supabase.from('projects').select('*', { count: 'exact', head: true }).eq('connector_id', userId),
        supabase.from('commissions').select('amount').eq('connector_id', userId).eq('status', 'paid')
      ]);

      const totalCommissions = (commissionsData || []).reduce((acc: number, curr: { amount: number }) => acc + (curr.amount || 0), 0);

      setStats({
        leads: leadsCount || 0,
        activeProjects: projectsCount || 0,
        commissions: totalCommissions,
      });
    }

    loadData();
  }, [user]);

  return (
    <div>
      {connectorProfile && (
        <div className="mb-8 p-4 rounded-xl bg-accent-500/10 border border-accent-500/20 inline-flex items-center gap-3">
          <LinkIcon className="w-5 h-5 text-accent-400" />
          <span className="text-white">Your Connector ID:</span>
          <span className="font-mono text-accent-400 font-bold">{String(connectorProfile.avl_id)}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="glass rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <Users className="w-5 h-5 text-accent-500" />
            <div className="text-xs font-bold text-ink-500 uppercase tracking-widest">My Leads</div>
          </div>
          <div className="text-4xl font-light text-white">{stats.leads}</div>
        </div>
        
        <div className="glass rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <FolderKanban className="w-5 h-5 text-accent-500" />
            <div className="text-xs font-bold text-ink-500 uppercase tracking-widest">Active Projects</div>
          </div>
          <div className="text-4xl font-light text-white">{stats.activeProjects}</div>
        </div>

        <div className="glass rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <DollarSign className="w-5 h-5 text-accent-500" />
            <div className="text-xs font-bold text-ink-500 uppercase tracking-widest">Earned Commissions</div>
          </div>
          <div className="text-4xl font-light text-white">KSh {stats.commissions.toLocaleString()}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="glass rounded-2xl p-8 border border-ink-800/50">
          <h2 className="text-lg font-medium text-white mb-6">Quick Actions</h2>
          <div className="space-y-4">
            <Link to="/portal/leads/new" className="block w-full text-left px-6 py-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors border border-white/5">
              <div className="font-medium text-white mb-1">Submit New Lead</div>
              <div className="text-sm text-gray-400">Register a business you've connected with.</div>
            </Link>
            <button className="w-full text-left px-6 py-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors border border-white/5">
              <div className="font-medium text-white mb-1">Refer a Connector</div>
              <div className="text-sm text-gray-400">Invite someone to join the network.</div>
            </button>
          </div>
        </div>

        <div className="glass rounded-2xl p-8 border border-ink-800/50">
          <h2 className="text-lg font-medium text-white mb-6">Recent Activity</h2>
          <div className="flex items-center justify-center py-12">
            <div className="text-ink-600 text-sm">No recent activity to show.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
