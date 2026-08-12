import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Loader2, ReceiptText } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';

interface Invoice {
  id: string;
  amount: number | null;
  status: string | null;
  created_at: string;
  due_date: string | null;
  project_id: string | null;
}

interface ProjectSummary {
  id: string;
  title: string;
}

function formatCurrency(amount: number | null | undefined) {
  if (typeof amount !== 'number') return '—';
  return `KSh ${amount.toLocaleString()}`;
}

function formatStatus(status: string | null | undefined) {
  if (!status) return 'Pending';
  return status.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

function getStatusClasses(status: string | null | undefined) {
  const normalized = (status || '').toLowerCase();

  if (normalized === 'paid') {
    return 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400';
  }

  if (normalized === 'overdue' || normalized === 'unpaid') {
    return 'border-amber-500/20 bg-amber-500/10 text-amber-400';
  }

  return 'border-accent-500/20 bg-accent-500/10 text-accent-400';
}

export default function Invoices() {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [projectsById, setProjectsById] = useState<Record<string, ProjectSummary>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const currentUserId = user?.id;

    if (!currentUserId) {
      setLoading(false);
      setInvoices([]);
      setProjectsById({});
      return;
    }

    let isMounted = true;

    async function loadInvoices() {
      setLoading(true);
      setError(null);

      try {
        const { data, error: invoiceError } = await supabase
          .from('invoices')
          .select('id, amount, status, created_at, due_date, project_id')
          .eq('client_id', currentUserId)
          .order('created_at', { ascending: false });

        if (invoiceError) throw invoiceError;

        const invoiceRows = (data || []) as Invoice[];
        const projectIds = invoiceRows.map((invoice) => invoice.project_id).filter(Boolean) as string[];
        let fetchedProjects: Record<string, ProjectSummary> = {};

        if (projectIds.length > 0) {
          const { data: projectsData, error: projectsError } = await supabase
            .from('projects')
            .select('id, title')
            .in('id', projectIds);

          if (projectsError) throw projectsError;
          fetchedProjects = Object.fromEntries(((projectsData || []) as ProjectSummary[]).map((project) => [project.id, project]));
        }

        if (!isMounted) return;
        setInvoices(invoiceRows);
        setProjectsById(fetchedProjects);
      } catch (err) {
        console.error('Error loading invoices', err);
        if (isMounted) {
          setError('We could not load your invoices right now. Please try again shortly.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadInvoices();

    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  const summary = useMemo(() => {
    const totalAmount = invoices.reduce((sum, invoice) => sum + Number(invoice.amount || 0), 0);
    const outstandingAmount = invoices
      .filter((invoice) => ['unpaid', 'overdue'].includes((invoice.status || '').toLowerCase()))
      .reduce((sum, invoice) => sum + Number(invoice.amount || 0), 0);
    const paidCount = invoices.filter((invoice) => (invoice.status || '').toLowerCase() === 'paid').length;

    return {
      totalAmount,
      outstandingAmount,
      paidCount,
      totalCount: invoices.length,
    };
  }, [invoices]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="glass rounded-2xl p-6 border border-ink-800/50">
          <div className="flex items-center gap-3 text-white">
            <Loader2 className="w-5 h-5 animate-spin text-accent-500" />
            <span>Loading your invoices…</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Invoices</h2>
          <p className="mt-2 text-sm text-gray-400">Review your invoices and payment status in one place.</p>
        </div>
      </div>

      {error ? (
        <div className="glass rounded-2xl p-12 text-center border border-ink-800/50">
          <ReceiptText className="w-12 h-12 text-ink-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">We could not load your invoices</h3>
          <p className="text-gray-400 text-sm">{error}</p>
        </div>
      ) : invoices.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center border border-ink-800/50">
          <ReceiptText className="w-12 h-12 text-ink-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No invoices yet</h3>
          <p className="text-gray-400 text-sm">Your invoices will appear here once they are created for your account.</p>
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="glass rounded-2xl p-5 border border-ink-800/50">
              <div className="text-xs font-bold uppercase tracking-[0.25em] text-ink-500">Total invoiced</div>
              <div className="mt-3 text-2xl font-semibold text-white">{formatCurrency(summary.totalAmount)}</div>
            </div>
            <div className="glass rounded-2xl p-5 border border-ink-800/50">
              <div className="text-xs font-bold uppercase tracking-[0.25em] text-ink-500">Outstanding</div>
              <div className="mt-3 text-2xl font-semibold text-white">{formatCurrency(summary.outstandingAmount)}</div>
            </div>
            <div className="glass rounded-2xl p-5 border border-ink-800/50">
              <div className="text-xs font-bold uppercase tracking-[0.25em] text-ink-500">Paid invoices</div>
              <div className="mt-3 text-2xl font-semibold text-white">{summary.paidCount}</div>
            </div>
          </div>

          <div className="space-y-4">
            {invoices.map((invoice) => (
              <div key={invoice.id} className="glass rounded-2xl border border-ink-800/50 p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="text-lg font-medium text-white">Invoice {invoice.id.slice(0, 8)}</h3>
                      <div className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] ${getStatusClasses(invoice.status)}`}>
                        {formatStatus(invoice.status)}
                      </div>
                    </div>
                    <div className="mt-2 text-sm text-gray-400">
                      {invoice.project_id && projectsById[invoice.project_id] ? `Project: ${projectsById[invoice.project_id].title}` : 'Project: Not linked'}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-4 text-sm text-gray-500">
                      <span>Issued {new Date(invoice.created_at).toLocaleDateString()}</span>
                      <span>Due {invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : '—'}</span>
                    </div>
                  </div>

                  <div className="flex flex-col items-start gap-3 lg:items-end">
                    <div className="text-2xl font-semibold text-white">{formatCurrency(invoice.amount)}</div>
                    <Link to={`/portal/invoices/${invoice.id}`} className="inline-flex items-center gap-2 rounded-xl bg-accent-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-500">
                      View invoice
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
