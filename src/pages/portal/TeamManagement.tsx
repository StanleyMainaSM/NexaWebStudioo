import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Users, UserCheck, UserX, RefreshCw } from 'lucide-react';

type TeamMember = {
  id: string;
  email: string;
  full_name: string | null;
  roles: string[];
  connector_active: boolean | null;
  avl_id: string | null;
};

export default function TeamManagement() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadTeam = async () => {
    setLoading(true);
    setError('');

    try {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id,email,full_name')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id,role');

      if (rolesError) throw rolesError;

      const { data: connectors, error: connectorError } = await supabase
        .from('connector_profiles')
        .select('user_id,avl_id,is_active');

      if (connectorError) throw connectorError;

      const result: TeamMember[] = (profiles || []).map((profile) => {
        const memberRoles = (roles || [])
          .filter((item) => item.user_id === profile.id)
          .map((item) => item.role);

        const connector = (connectors || []).find(
          (item) => item.user_id === profile.id
        );

        return {
          id: profile.id,
          email: profile.email,
          full_name: profile.full_name,
          roles: memberRoles,
          connector_active: connector?.is_active ?? null,
          avl_id: connector?.avl_id ?? null,
        };
      });

      setMembers(result);
    } catch (err: any) {
      setError(err?.message || 'Unable to load team members.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTeam();
  }, []);

  const teamMembers = members.filter((member) =>
    member.roles.some((role) =>
      ['operator', 'connector', 'admin', 'owner'].includes(
        role.toLowerCase()
      )
    )
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent-600/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-accent-400" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-white">
                Team Management
              </h1>
              <p className="text-sm text-gray-400 mt-1">
                Manage Avelixa connectors, operators, administrators and owners.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={loadTeam}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-ink-800 text-gray-300 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="rounded-2xl border border-ink-800/60 bg-ink-900/40 overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-gray-400">
            Loading team members...
          </div>
        ) : teamMembers.length === 0 ? (
          <div className="p-10 text-center">
            <Users className="w-10 h-10 mx-auto text-gray-600 mb-3" />
            <p className="text-gray-400">No team members found.</p>
          </div>
        ) : (
          <div className="divide-y divide-ink-800/60">
            {teamMembers.map((member) => (
              <div
                key={member.id}
                className="p-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5"
              >
                <div className="flex items-center gap-4">
                  <div className="w-11 h-11 rounded-full bg-ink-800 flex items-center justify-center text-accent-400 font-semibold uppercase">
                    {(member.full_name || member.email).charAt(0)}
                  </div>

                  <div>
                    <p className="font-medium text-white">
                      {member.full_name || 'Unnamed User'}
                    </p>
                    <p className="text-sm text-gray-500">
                      {member.email}
                    </p>

                    {member.avl_id && (
                      <p className="text-xs text-accent-500 mt-1">
                        AVL ID: {member.avl_id}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {member.roles.map((role) => (
                    <span
                      key={role}
                      className="px-3 py-1.5 rounded-lg bg-white/5 border border-ink-800 text-xs text-gray-300 capitalize"
                    >
                      {role}
                    </span>
                  ))}

                  {member.connector_active !== null && (
                    <span
                      className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs ${
                        member.connector_active
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : 'bg-red-500/10 text-red-400'
                      }`}
                    >
                      {member.connector_active ? (
                        <UserCheck className="w-3.5 h-3.5" />
                      ) : (
                        <UserX className="w-3.5 h-3.5" />
                      )}
                      {member.connector_active ? 'Active' : 'Inactive'}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
