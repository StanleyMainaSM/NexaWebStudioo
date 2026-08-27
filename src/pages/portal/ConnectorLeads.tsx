import { useEffect, useState } from 'react';
import { ArrowLeft, Building2, Loader2, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';

interface Lead {
  id: string;
  business_id: string;
  title: string;
  requirements: string | null;
  estimated_budget: number | null;
  status: string | null;
  created_at: string;
}

interface Business {
  id: string;
  name: string;
  industry: string | null;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
}

export default function ConnectorLeads() {
  const { user, roles } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [businesses, setBusinesses] = useState<Record<string, Business>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const userId = user?.id;

    if (!userId || !roles.includes('connector')) {
      setLoading(false);
      return;
    }

    let mounted = true;

    async function loadLeads() {
      setLoading(true);
      setError(null);

      try {
        const { data, error: leadsError } = await supabase
          .from('leads')
          .select('id, business_id, title, requirements, estimated_budget, status, created_at')
          .eq('connector_id', userId)
          .order('created_at', { ascending: false });

        if (leadsError) throw leadsError;

        const leadRows = (data || []) as Lead[];
        const businessIds = [...new Set(leadRows.map((lead) => lead.business_id).filter(Boolean))];

        let businessMap: Record<string, Business> = {};

        if (businessIds.length > 0) {
          const { data: businessData, error: businessesError } = await supabase
            .from('businesses')
            .select('id, name, industry, contact_name, email, phone')
            .in('id', businessIds);

          if (businessesError) throw businessesError;

          businessMap = Object.fromEntries(
            ((businessData || []) as Business[]).map((business) => [business.id, business]),
          );
        }

        if (!mounted) return;
        setLeads(leadRows);
        setBusinesses(businessMap);
      } catch (err) {
        console.error('Error loading connector leads:', err);
        if (mounted) {
          setError('We could not load your leads right now. Please try again.');
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadLeads();

    return () => {
      mounted = false;
    };
  }, [user?.id, roles]);

  if (loading) {
    return (
      <div className="glass rounded-2xl border border-ink-800/50 p-8">
        <div className="flex items-center gap-3 text-gray-300">
          <Loader2 className="h-5 w-5 animate-spin text-accent-400" />
          Loading your leads...
        </div>
      </div>
    );
  }

  if (!user || !roles.includes('connector')) {
    return (
      <div className="glass rounded-2xl border border-ink-800/50 p-10 text-center">
        <Users className="mx-auto mb-4 h-10 w-10 text-gray-500" />
        <h1 className="text-xl font-semibold text-white">Connector access required</h1>
        <p className="mt-2 text-sm text-gray-400">This page is available only to approved active connectors.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          to="/portal/connector"
          className="mb-4 inline-flex items-center text-sm font-medium text-gray-400 transition-colors hover:text-white"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Connector Dashboard
        </Link>

        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent-500/10">
            <Users className="h-5 w-5 text-accent-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">My Leads</h1>
            <p className="mt-1 text-sm text-gray-400">Track the businesses you have submitted to Avelixa.</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {!error && leads.length === 0 && (
        <div className="glass rounded-2xl border border-ink-800/50 p-12 text-center">
          <Users className="mx-auto mb-4 h-12 w-12 text-gray-600" />
          <h2 className="text-lg font-medium text-white">No leads yet</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-gray-400">
            Leads you submit will appear here so you can track their progress.
          </p>
          <Link
            to="/portal/leads/new"
            className="mt-6 inline-flex rounded-xl bg-accent-600 px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-accent-500"
          >
            Submit New Lead
          </Link>
        </div>
      )}

      {!error && leads.length > 0 && (
        <div className="space-y-4">
          {leads.map((lead) => {
            const business = businesses[lead.business_id];
            const status = lead.status || 'pending';

            return (
              <div key={lead.id} className="glass rounded-2xl border border-ink-800/50 p-6">
                <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-500/10">
                        <Building2 className="h-5 w-5 text-accent-400" />
                      </div>
                      <div className="min-w-0">
                        <h2 className="truncate text-lg font-semibold text-white">
                          {business?.name || lead.title || 'Business lead'}
                        </h2>
                        <p className="mt-1 text-sm text-gray-400">
                          {business?.industry || 'Business'}
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                      <div>
                        <span className="text-gray-500">Contact</span>
                        <p className="text-gray-300">{business?.contact_name || 'Not provided'}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Submitted</span>
                        <p className="text-gray-300">{new Date(lead.created_at).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Email</span>
                        <p className="truncate text-gray-300">{business?.email || 'Not provided'}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Phone</span>
                        <p className="text-gray-300">{business?.phone || 'Not provided'}</p>
                      </div>
                    </div>

                    {lead.requirements && (
                      <div className="mt-5 rounded-xl border border-white/5 bg-white/[0.03] p-4">
                        <span className="text-xs font-bold uppercase tracking-widest text-gray-500">Requirements</span>
                        <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-gray-300">{lead.requirements}</p>
                      </div>
                    )}
                  </div>

                  <div className="shrink-0 text-left md:text-right">
                    <span className="inline-flex rounded-full border border-accent-500/20 bg-accent-500/10 px-3 py-1 text-xs font-medium capitalize text-accent-300">
                      {status.replace(/_/g, ' ')}
                    </span>
                    {lead.estimated_budget !== null && (
                      <p className="mt-3 text-sm text-gray-400">
                        Budget: <span className="text-white">KSh {Number(lead.estimated_budget).toLocaleString()}</span>
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
