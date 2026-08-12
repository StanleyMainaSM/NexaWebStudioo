import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Users, Mail, Calendar, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Client {
  id: string;
  email: string | null;
  full_name: string | null;
  created_at: string;
}

interface UserRole {
  user_id: string;
  role: string;
}

export default function Clients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadClients() {
      setLoading(true);
      setError(null);

      try {
        const {
          data: roleData,
          error: roleError,
        } = await supabase
          .from('user_roles')
          .select('user_id, role')
          .eq('role', 'client');

        if (roleError) {
          throw roleError;
        }

        const roles: UserRole[] = roleData ?? [];

        if (roles.length === 0) {
          setClients([]);
          setLoading(false);
          return;
        }

        const clientIds = roles.map((role) => role.user_id);

        const {
          data: profileData,
          error: profileError,
        } = await supabase
          .from('profiles')
          .select('id, email, full_name, created_at')
          .in('id', clientIds)
          .order('created_at', { ascending: false });

        if (profileError) {
          throw profileError;
        }

        setClients(profileData ?? []);
      } catch (err) {
        console.error('Error loading clients:', err);

        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('Unable to load clients.');
        }
      } finally {
        setLoading(false);
      }
    }

    loadClients();
  }, []);

  return (
    <div>
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-accent-600/20 flex items-center justify-center">
            <Users className="w-5 h-5 text-accent-400" />
          </div>

          <div>
            <h1 className="text-3xl font-semibold text-white">
              Client Management
            </h1>

            <p className="text-sm text-gray-400 mt-1">
              Manage clients registered in the Avelixa system.
            </p>
          </div>
        </div>
      </div>

      {loading && (
        <div className="glass rounded-2xl p-8 text-center">
          <p className="text-gray-400">Loading clients...</p>
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-6">
          <p className="text-red-400 font-medium">
            Unable to load clients.
          </p>

          <p className="text-sm text-red-300/80 mt-2">
            {error}
          </p>
        </div>
      )}

      {!loading && !error && clients.length === 0 && (
        <div className="glass rounded-2xl p-10 text-center">
          <Users className="w-10 h-10 text-gray-500 mx-auto mb-4" />

          <h2 className="text-lg font-medium text-white mb-2">
            No clients yet
          </h2>

          <p className="text-sm text-gray-400">
            Client records will appear here once clients are added
            to the system.
          </p>
        </div>
      )}

      {!loading && !error && clients.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {clients.map((client) => (
            <Link
              key={client.id}
              to={`/portal/clients/${client.id}`}
              className="glass rounded-2xl p-6 border border-ink-800/50 hover:border-accent-500/40 hover:bg-white/[0.03] transition-all block"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-12 h-12 rounded-full bg-accent-600/20 flex items-center justify-center shrink-0">
                    <Users className="w-6 h-6 text-accent-400" />
                  </div>

                  <div className="min-w-0">
                    <h2 className="text-lg font-medium text-white truncate">
                      {client.full_name ?? 'Unnamed Client'}
                    </h2>

                    <p className="text-xs text-accent-400 uppercase tracking-widest">
                      Client
                    </p>
                  </div>
                </div>

                <ChevronRight className="w-5 h-5 text-gray-500 shrink-0" />
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-gray-500 shrink-0" />

                  <span className="text-sm text-gray-300 truncate">
                    {client.email ?? 'No email'}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <Calendar className="w-4 h-4 text-gray-500 shrink-0" />

                  <span className="text-sm text-gray-400">
                    Joined{' '}
                    {new Date(client.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>

              <div className="mt-6 text-xs text-accent-400">
                View client →
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

