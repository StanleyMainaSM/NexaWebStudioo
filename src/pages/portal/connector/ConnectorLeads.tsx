import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../lib/auth';
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  Loader2,
  Mail,
  Phone,
  Plus,
  RefreshCw,
  Search,
} from 'lucide-react';

type Lead = {
  id: string;
  title: string;
  requirements: string | null;
  status: string | null;
  created_at: string | null;
  updated_at: string | null;
  business_id: string | null;
};

type Business = {
  id: string;
  name: string;
  industry: string | null;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
};

type LeadWithBusiness = Lead & {
  business: Business | null;
};

const formatStatus = (status: string | null) => {
  if (!status) return 'Unknown';

  return status
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
};

const getStatusClasses = (status: string | null) => {
  const normalized = (status || '').toLowerCase();

  if (
    normalized === 'approved' ||
    normalized === 'converted' ||
    normalized === 'won' ||
    normalized === 'completed'
  ) {
    return 'bg-green-500/10 text-green-400 border-green-500/20';
  }

  if (
    normalized === 'rejected' ||
    normalized === 'declined' ||
    normalized === 'lost' ||
    normalized === 'cancelled'
  ) {
    return 'bg-red-500/10 text-red-400 border-red-500/20';
  }

  if (
    normalized === 'contacted' ||
    normalized === 'in_progress' ||
    normalized === 'processing' ||
    normalized === 'reviewing' ||
    normalized === 'qualified' ||
    normalized === 'proposal'
  ) {
    return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
  }

  return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
};

const formatDate = (date: string | null) => {
  if (!date) return '—';

  return new Date(date).toLocaleDateString('en-KE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

export default function ConnectorLeads() {
  const { user } = useAuth();

  const [leads, setLeads] = useState<LeadWithBusiness[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const loadLeads = async (showRefreshState = false) => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    if (showRefreshState) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError(null);

    try {
      const { data: leadData, error: leadsError } = await supabase
        .from('leads')
        .select(
          'id, title, requirements, status, created_at, updated_at, business_id'
        )
        .eq('connector_id', user.id)
        .order('created_at', { ascending: false });

      if (leadsError) {
        throw leadsError;
      }

      const rawLeads = (leadData || []) as Lead[];

      if (rawLeads.length === 0) {
        setLeads([]);
        return;
      }

      const businessIds = Array.from(
        new Set(
          rawLeads
            .map((lead) => lead.business_id)
            .filter((id): id is string => Boolean(id))
        )
      );

      let businesses: Business[] = [];

      if (businessIds.length > 0) {
        const { data: businessData, error: businessError } =
          await supabase
            .from('businesses')
            .select(
              'id, name, industry, contact_name, email, phone'
            )
            .in('id', businessIds);

        if (businessError) {
          throw businessError;
        }

        businesses = (businessData || []) as Business[];
      }

      const businessMap = new Map(
        businesses.map((business) => [business.id, business])
      );

      const combined: LeadWithBusiness[] = rawLeads.map((lead) => ({
        ...lead,
        business: lead.business_id
          ? businessMap.get(lead.business_id) || null
          : null,
      }));

      setLeads(combined);
    } catch (err: unknown) {
      console.error('Error loading connector leads:', err);

      const message =
        err instanceof Error
          ? err.message
          : 'Unable to load your leads right now.';

      setError(message);
      setLeads([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadLeads();
  }, [user?.id]);

  const filteredLeads = leads.filter((lead) => {
    const search = searchTerm.toLowerCase().trim();

    const matchesSearch =
      !search ||
      lead.title.toLowerCase().includes(search) ||
      lead.business?.name?.toLowerCase().includes(search) ||
      lead.business?.contact_name
        ?.toLowerCase()
        .includes(search) ||
      lead.business?.email?.toLowerCase().includes(search);

    const matchesStatus =
      statusFilter === 'all' ||
      (lead.status || '').toLowerCase() ===
        statusFilter.toLowerCase();

    return matchesSearch && matchesStatus;
  });

  const statuses = Array.from(
    new Set(
      leads
        .map((lead) => lead.status?.toLowerCase())
        .filter((status): status is string => Boolean(status))
    )
  );

  const pendingCount = leads.filter(
    (lead) => (lead.status || '').toLowerCase() === 'pending'
  ).length;

  const convertedCount = leads.filter((lead) => {
    const status = (lead.status || '').toLowerCase();

    return (
      status === 'converted' ||
      status === 'won' ||
      status === 'approved'
    );
  }).length;

  return (
    <div>
      <div className="mb-8">
        <Link
          to="/portal/connector"
          className="inline-flex items-center text-sm font-medium text-gray-400 hover:text-white transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Connector Dashboard
        </Link>

        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-5">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
              My Leads
            </h1>

            <p className="text-gray-400 text-sm">
              View and track businesses you have submitted to
              Avelixa.
            </p>
          </div>

          <Link
            to="/portal/leads/new"
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-accent-600 text-white hover:bg-accent-500 transition-colors text-sm font-bold"
          >
            <Plus className="w-4 h-4" />
            Submit New Lead
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
        <div className="glass rounded-2xl p-6 border border-ink-800/50">
          <div className="text-xs font-bold text-ink-500 uppercase tracking-widest mb-3">
            Total Leads
          </div>

          <div className="text-3xl font-light text-white">
            {leads.length}
          </div>
        </div>

        <div className="glass rounded-2xl p-6 border border-ink-800/50">
          <div className="text-xs font-bold text-ink-500 uppercase tracking-widest mb-3">
            Pending Review
          </div>

          <div className="text-3xl font-light text-white">
            {pendingCount}
          </div>
        </div>

        <div className="glass rounded-2xl p-6 border border-ink-800/50">
          <div className="text-xs font-bold text-ink-500 uppercase tracking-widest mb-3">
            Converted
          </div>

          <div className="text-3xl font-light text-white">
            {convertedCount}
          </div>
        </div>
      </div>

      <div className="glass rounded-2xl p-4 border border-ink-800/50 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />

            <input
              type="text"
              value={searchTerm}
              onChange={(event) =>
                setSearchTerm(event.target.value)
              }
              placeholder="Search leads or businesses..."
              className="w-full pl-12 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-gray-600 focus:border-accent-500 focus:outline-none"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value)
            }
            className="md:w-52 px-4 py-3 rounded-xl bg-ink-900 border border-white/10 text-white focus:border-accent-500 focus:outline-none"
          >
            <option value="all">All statuses</option>

            {statuses.map((status) => (
              <option key={status} value={status}>
                {formatStatus(status)}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => loadLeads(true)}
            disabled={refreshing}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-50"
          >
            <RefreshCw
              className={`w-4 h-4 ${
                refreshing ? 'animate-spin' : ''
              }`}
            />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-5 rounded-2xl bg-red-500/10 border border-red-500/20">
          <div className="text-red-400 font-medium mb-1">
            Unable to load leads
          </div>

          <div className="text-sm text-red-300/80">
            {error}
          </div>
        </div>
      )}

      {loading ? (
        <div className="glass rounded-3xl border border-ink-800/50 p-16 flex items-center justify-center">
          <div className="flex items-center gap-3 text-gray-400">
            <Loader2 className="w-5 h-5 animate-spin" />
            Loading your leads...
          </div>
        </div>
      ) : filteredLeads.length === 0 ? (
        <div className="glass rounded-3xl border border-ink-800/50 p-12 md:p-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-accent-500/10 border border-accent-500/20 flex items-center justify-center mx-auto mb-6">
            <Building2 className="w-7 h-7 text-accent-400" />
          </div>

          {leads.length === 0 ? (
            <>
              <h2 className="text-xl font-medium text-white mb-3">
                No leads yet
              </h2>

              <p className="text-gray-400 text-sm max-w-md mx-auto mb-7">
                You have not submitted any business leads yet.
                Once you find a business interested in Avelixa,
                submit it here.
              </p>

              <Link
                to="/portal/leads/new"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-accent-600 text-white hover:bg-accent-500 transition-colors font-medium"
              >
                <Plus className="w-4 h-4" />
                Submit Your First Lead
              </Link>
            </>
          ) : (
            <>
              <h2 className="text-xl font-medium text-white mb-3">
                No matching leads
              </h2>

              <p className="text-gray-400 text-sm max-w-md mx-auto">
                Try changing your search term or status filter.
              </p>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredLeads.map((lead) => (
            <div
              key={lead.id}
              className="glass rounded-2xl border border-ink-800/50 p-6 hover:border-accent-500/20 transition-colors"
            >
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-3 mb-3">
                    <h2 className="text-lg font-medium text-white">
                      {lead.business?.name || lead.title}
                    </h2>

                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full border text-xs font-medium ${getStatusClasses(
                        lead.status
                      )}`}
                    >
                      {formatStatus(lead.status)}
                    </span>
                  </div>

                  {lead.business?.industry && (
                    <div className="text-sm text-accent-400 mb-4">
                      {lead.business.industry}
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-5">
                    {lead.business?.contact_name && (
                      <div className="flex items-center gap-2 text-sm text-gray-400">
                        <Building2 className="w-4 h-4 text-gray-600" />
                        {lead.business.contact_name}
                      </div>
                    )}

                    {lead.business?.email && (
                      <div className="flex items-center gap-2 text-sm text-gray-400 min-w-0">
                        <Mail className="w-4 h-4 text-gray-600 shrink-0" />

                        <span className="truncate">
                          {lead.business.email}
                        </span>
                      </div>
                    )}

                    {lead.business?.phone && (
                      <div className="flex items-center gap-2 text-sm text-gray-400">
                        <Phone className="w-4 h-4 text-gray-600" />
                        {lead.business.phone}
                      </div>
                    )}

                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <CalendarDays className="w-4 h-4 text-gray-600" />
                      Submitted {formatDate(lead.created_at)}
                    </div>
                  </div>

                  {lead.requirements && (
                    <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                      <div className="text-xs font-bold text-ink-500 uppercase tracking-widest mb-2">
                        Requirements
                      </div>

                      <p className="text-sm text-gray-400 leading-relaxed whitespace-pre-wrap">
                        {lead.requirements}
                      </p>
                    </div>
                  )}
                </div>

                <div className="lg:w-56 shrink-0">
                  <div className="p-4 rounded-xl bg-accent-500/5 border border-accent-500/10">
                    <div className="text-xs font-bold text-ink-500 uppercase tracking-widest mb-2">
                      Pricing
                    </div>

                    <div className="text-sm text-gray-400 leading-relaxed">
                      Final project pricing is determined by the
                      Avelixa admin team after reviewing the lead
                      and contacting the business.
                    </div>
                  </div>

                  <div className="mt-4 text-right">
                    <span className="text-xs text-gray-600 font-mono">
                      Lead ID: {lead.id.slice(0, 8).toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}