import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, ReceiptText } from 'lucide-react';
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

function formatStatus(status: string | null | undefined) {
  if (!status) return 'Pending';
  return status.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatCurrency(amount: number | null | undefined) {
  if (typeof amount !== 'number') return '—';
  return `KSh ${amount.toLocaleString()}`;
}

export default function InvoiceDetails() {
  const { invoiceId } = useParams();
  const { user } = useAuth();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [project, setProject] = useState<ProjectSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const currentUserId = user?.id;

    if (!currentUserId || !invoiceId) {
      setLoading(false);
      return;
    }

    let isMounted = true;

    async function loadInvoice() {
      setLoading(true);
      setError(null);

      try {
        const { data, error: invoiceError } = await supabase
          .from('invoices')
          .select('id, amount, status, created_at, due_date, project_id')
          .eq('id', invoiceId)
          .eq('client_id', currentUserId)
          .maybeSingle();

        if (invoiceError) throw invoiceError;

        if (!data) {
          if (!isMounted) return;
          setInvoice(null);
          setProject(null);
          return;
        }

        let projectData: ProjectSummary | null = null;
        if (data.project_id) {
          const { data: projectResult, error: projectError } = await supabase
            .from('projects')
            .select('id, title')
            .eq('id', data.project_id)
            .maybeSingle();

          if (projectError) throw projectError;
          projectData = projectResult as ProjectSummary | null;
        }

        if (!isMounted) return;
        setInvoice(data as Invoice);
        setProject(projectData);
      } catch (err) {
        console.error('Error loading invoice', err);
        if (isMounted) {
          setError('This invoice is not available to your account right now.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadInvoice();

    return () => {
      isMounted = false;
    };
  }, [invoiceId, user?.id]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="glass rounded-2xl p-6 border border-ink-800/50">
          <div className="flex items-center gap-3 text-white">
            <Loader2 className="w-5 h-5 animate-spin text-accent-500" />
            <span>Loading invoice…</span>
          </div>
        </div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="space-y-4">
        <Link to="/portal/invoices" className="inline-flex items-center gap-2 text-sm font-medium text-gray-400 hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to invoices
        </Link>
        <div className="glass rounded-2xl p-12 text-center border border-ink-800/50">
          <ReceiptText className="w-12 h-12 text-ink-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white">Invoice unavailable</h2>
          <p className="mt-3 text-sm text-gray-400">{error || 'This invoice could not be opened right now.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link to="/portal/invoices" className="inline-flex items-center gap-2 text-sm font-medium text-gray-400 hover:text-white transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Back to invoices
      </Link>

      <div className="glass rounded-2xl border border-ink-800/50 p-6 sm:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.25em] text-accent-400">Client invoice</div>
            <h2 className="mt-3 text-2xl font-semibold text-white">Invoice {invoice.id.slice(0, 8)}</h2>
            <p className="mt-2 text-sm text-gray-400">Review invoice details and payment status for this project.</p>
          </div>
          <div className="rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-amber-400">
            {formatStatus(invoice.status)}
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-ink-800/50 bg-white/5 p-5">
            <div className="text-xs font-bold uppercase tracking-[0.25em] text-ink-500">Amount</div>
            <div className="mt-2 text-2xl font-semibold text-white">{formatCurrency(invoice.amount)}</div>
          </div>
          <div className="rounded-2xl border border-ink-800/50 bg-white/5 p-5">
            <div className="text-xs font-bold uppercase tracking-[0.25em] text-ink-500">Project</div>
            <div className="mt-2 text-sm font-medium text-white">{project?.title || 'Not linked to a project'}</div>
          </div>
          <div className="rounded-2xl border border-ink-800/50 bg-white/5 p-5">
            <div className="text-xs font-bold uppercase tracking-[0.25em] text-ink-500">Issued</div>
            <div className="mt-2 text-sm font-medium text-white">{new Date(invoice.created_at).toLocaleDateString()}</div>
          </div>
          <div className="rounded-2xl border border-ink-800/50 bg-white/5 p-5">
            <div className="text-xs font-bold uppercase tracking-[0.25em] text-ink-500">Due date</div>
            <div className="mt-2 text-sm font-medium text-white">{invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : '—'}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
