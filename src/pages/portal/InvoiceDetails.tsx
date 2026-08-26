import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Clock3, CreditCard, Loader2, ReceiptText } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';

interface Invoice { id: string; amount: number | null; status: string | null; created_at: string; due_date: string | null; project_id: string | null; }
interface ProjectSummary { id: string; title: string; }
interface Payment { id: string; amount: number; payment_date: string | null; payment_method: string | null; reference_number: string | null; status: string | null; created_at: string | null; verification_message?: string | null; }

function formatStatus(status: string | null | undefined) { if (!status) return 'Pending'; return status.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase()); }
function formatCurrency(amount: number | null | undefined) { if (typeof amount !== 'number' || Number.isNaN(amount)) return 'KSh —'; return `KSh ${amount.toLocaleString('en-KE', { maximumFractionDigits: 0 })}`; }
function normalizePaymentStatus(status: string | null | undefined) { return (status || '').toLowerCase(); }
function getInvoiceStatusClasses(status: string | null | undefined) { const normalized = (status || '').toLowerCase(); if (normalized === 'paid') return 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400'; if (normalized === 'overdue') return 'border-red-500/20 bg-red-500/10 text-red-400'; if (['unpaid','pending','due'].includes(normalized)) return 'border-amber-500/20 bg-amber-500/10 text-amber-400'; return 'border-accent-500/20 bg-accent-500/10 text-accent-400'; }
function getPaymentStatusClasses(status: string | null | undefined) { const normalized = normalizePaymentStatus(status); if (['completed','paid','successful','success'].includes(normalized)) return 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400'; if (['failed','cancelled','canceled'].includes(normalized)) return 'border-red-500/20 bg-red-500/10 text-red-400'; return 'border-amber-500/20 bg-amber-500/10 text-amber-400'; }
function isSuccessfulPayment(payment: Payment) { return ['paid','completed','successful','success'].includes(normalizePaymentStatus(payment.status)); }

export default function InvoiceDetails() {
  const { invoiceId } = useParams();
  const { user } = useAuth();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [project, setProject] = useState<ProjectSummary | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentError, setPaymentError] = useState('');
  const [paymentSuccess, setPaymentSuccess] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('mpesa');
  const [referenceNumber, setReferenceNumber] = useState('');

  const loadInvoice = async () => {
    const currentUserId = user?.id;
    if (!currentUserId || !invoiceId) { setLoading(false); return; }
    setLoading(true); setError(null);
    try {
      const { data, error: invoiceError } = await supabase.from('invoices').select('id, amount, status, created_at, due_date, project_id').eq('id', invoiceId).eq('client_id', currentUserId).maybeSingle();
      if (invoiceError) throw invoiceError;
      if (!data) { setInvoice(null); setProject(null); setPayments([]); return; }
      let projectData: ProjectSummary | null = null;
      if (data.project_id) {
        const { data: projectResult, error: projectError } = await supabase.from('projects').select('id, title').eq('id', data.project_id).maybeSingle();
        if (projectError) throw projectError;
        projectData = projectResult as ProjectSummary | null;
      }
      const { data: paymentsData, error: paymentsError } = await supabase.from('payments').select('id, amount, payment_date, payment_method, reference_number, status, created_at, verification_message').eq('invoice_id', invoiceId).order('created_at', { ascending: false });
      if (paymentsError) throw paymentsError;
      setInvoice(data as Invoice); setProject(projectData); setPayments((paymentsData || []) as Payment[]);
    } catch (err) { console.error('Error loading invoice', err); setError('This invoice is not available to your account right now.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { void loadInvoice(); }, [invoiceId, user?.id]);

  const paymentSummary = useMemo(() => {
    const invoiceAmount = Number(invoice?.amount || 0);
    const paidAmount = payments.filter(isSuccessfulPayment).reduce((total, payment) => total + Number(payment.amount || 0), 0);
    const pendingAmount = payments.filter(payment => normalizePaymentStatus(payment.status) === 'pending').reduce((total, payment) => total + Number(payment.amount || 0), 0);
    const balance = Math.max(invoiceAmount - paidAmount, 0);
    const percentage = invoiceAmount > 0 ? Math.min((paidAmount / invoiceAmount) * 100, 100) : 0;
    return { invoiceAmount, paidAmount, pendingAmount, balance, percentage };
  }, [invoice, payments]);

  const effectiveStatus = useMemo(() => {
    if (!invoice) return 'pending';
    if (paymentSummary.invoiceAmount > 0 && paymentSummary.balance <= 0) return 'paid';
    return invoice.status || 'pending';
  }, [invoice, paymentSummary]);

  const hasPendingPayment = paymentSummary.pendingAmount > 0;
  const canSubmitPayment = !!invoice && ['unpaid','overdue'].includes((invoice.status || '').toLowerCase()) && paymentSummary.balance > 0 && !hasPendingPayment;

  const submitPayment = async (event: FormEvent) => {
    event.preventDefault(); setPaymentError(''); setPaymentSuccess('');
    if (!invoice) return;
    if (!canSubmitPayment) { setPaymentError('This invoice is not currently available for payment.'); return; }
    if (!referenceNumber.trim()) { setPaymentError('Enter the payment reference number before submitting.'); return; }
    setSubmitting(true);
    try {
      const { error: submitError } = await supabase.rpc('submit_invoice_payment', { p_invoice_id: invoice.id, p_amount: paymentSummary.balance, p_payment_method: paymentMethod, p_reference_number: referenceNumber.trim() });
      if (submitError) throw submitError;
      setReferenceNumber(''); setPaymentSuccess('Payment submitted successfully. It is now awaiting Owner/Admin verification.'); await loadInvoice();
    } catch (err) { console.error('Payment submission failed', err); setPaymentError(err instanceof Error ? err.message : 'Unable to submit the payment right now.'); }
    finally { setSubmitting(false); }
  };

  if (loading) return <div className="space-y-4"><div className="glass rounded-2xl p-6 border border-ink-800/50"><div className="flex items-center gap-3 text-white"><Loader2 className="w-5 h-5 animate-spin text-accent-500" /><span>Loading invoice...</span></div></div></div>;

  if (!invoice) return <div className="space-y-4"><Link to="/portal/invoices" className="inline-flex items-center gap-2 text-sm font-medium text-gray-400 hover:text-white transition-colors"><ArrowLeft className="w-4 h-4" />Back to invoices</Link><div className="glass rounded-2xl p-12 text-center border border-ink-800/50"><ReceiptText className="w-12 h-12 text-ink-600 mx-auto mb-4" /><h2 className="text-xl font-semibold text-white">Invoice unavailable</h2><p className="mt-3 text-sm text-gray-400">{error || 'This invoice could not be opened right now.'}</p></div></div>;

  return <div className="space-y-6">
    <Link to="/portal/invoices" className="inline-flex items-center gap-2 text-sm font-medium text-gray-400 hover:text-white transition-colors"><ArrowLeft className="w-4 h-4" />Back to invoices</Link>

    <div className="glass rounded-2xl border border-ink-800/50 p-6 sm:p-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"><div><div className="text-xs font-bold uppercase tracking-[0.25em] text-accent-400">Client invoice</div><h2 className="mt-3 text-2xl font-semibold text-white">Invoice {invoice.id.slice(0, 8)}</h2><p className="mt-2 text-sm text-gray-400">Review invoice details, payments and remaining balance for this project.</p></div><div className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] ${getInvoiceStatusClasses(effectiveStatus)}`}>{formatStatus(effectiveStatus)}</div></div>
      <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4"><div className="rounded-2xl border border-ink-800/50 bg-white/5 p-5"><div className="text-xs font-bold uppercase tracking-[0.25em] text-ink-500">Invoice amount</div><div className="mt-2 text-2xl font-semibold text-white">{formatCurrency(paymentSummary.invoiceAmount)}</div></div><div className="rounded-2xl border border-ink-800/50 bg-white/5 p-5"><div className="text-xs font-bold uppercase tracking-[0.25em] text-ink-500">Amount paid</div><div className="mt-2 text-2xl font-semibold text-emerald-400">{formatCurrency(paymentSummary.paidAmount)}</div></div><div className="rounded-2xl border border-ink-800/50 bg-white/5 p-5"><div className="text-xs font-bold uppercase tracking-[0.25em] text-ink-500">Remaining balance</div><div className="mt-2 text-2xl font-semibold text-white">{formatCurrency(paymentSummary.balance)}</div></div><div className="rounded-2xl border border-ink-800/50 bg-white/5 p-5"><div className="text-xs font-bold uppercase tracking-[0.25em] text-ink-500">Project</div><div className="mt-2 text-sm font-medium text-white">{project?.title || 'Not linked to a project'}</div></div></div>
      <div className="mt-6"><div className="flex items-center justify-between text-sm"><span className="text-gray-400">Payment progress</span><span className="font-medium text-white">{Math.round(paymentSummary.percentage)}%</span></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-accent-500 transition-all" style={{ width: `${paymentSummary.percentage}%` }} /></div></div>
      <div className="mt-6 grid gap-4 md:grid-cols-2"><div className="rounded-2xl border border-ink-800/50 bg-white/5 p-5"><div className="text-xs font-bold uppercase tracking-[0.25em] text-ink-500">Issued</div><div className="mt-2 text-sm font-medium text-white">{new Date(invoice.created_at).toLocaleDateString('en-KE')}</div></div><div className="rounded-2xl border border-ink-800/50 bg-white/5 p-5"><div className="text-xs font-bold uppercase tracking-[0.25em] text-ink-500">Due date</div><div className="mt-2 text-sm font-medium text-white">{invoice.due_date ? new Date(invoice.due_date).toLocaleDateString('en-KE') : '—'}</div></div></div>
    </div>

    <div className={`rounded-2xl border p-6 ${paymentSummary.balance <= 0 && paymentSummary.invoiceAmount > 0 ? 'border-emerald-500/20 bg-emerald-500/10' : hasPendingPayment ? 'border-blue-500/20 bg-blue-500/10' : 'border-amber-500/20 bg-amber-500/10'}`}><div className="flex items-start gap-4">{paymentSummary.balance <= 0 && paymentSummary.invoiceAmount > 0 ? <CheckCircle2 className="mt-1 h-6 w-6 text-emerald-400" /> : <Clock3 className="mt-1 h-6 w-6 text-amber-400" />}<div><h3 className="text-lg font-semibold text-white">{paymentSummary.balance <= 0 && paymentSummary.invoiceAmount > 0 ? 'Invoice fully paid' : hasPendingPayment ? 'Payment awaiting verification' : paymentSummary.paidAmount > 0 ? 'Partial payment recorded' : 'Payment required'}</h3><p className="mt-1 text-sm text-gray-400">{paymentSummary.balance <= 0 && paymentSummary.invoiceAmount > 0 ? 'This invoice has been fully settled.' : hasPendingPayment ? 'A payment has already been submitted for this invoice. Owner/Admin verification is required before another payment can be submitted.' : paymentSummary.paidAmount > 0 ? `You have paid ${formatCurrency(paymentSummary.paidAmount)}. The remaining balance is ${formatCurrency(paymentSummary.balance)}.` : `The outstanding amount is ${formatCurrency(paymentSummary.balance)}.`}</p></div></div></div>

    {canSubmitPayment && <div className="glass rounded-2xl border border-accent-500/20 p-6 sm:p-8"><div className="flex items-center gap-3"><CreditCard className="w-5 h-5 text-accent-500" /><div><h3 className="text-lg font-medium text-white">Submit payment</h3><p className="mt-1 text-sm text-gray-400">Submit the payment reference for Owner/Admin verification.</p></div></div>{paymentError && <div className="mt-5 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">{paymentError}</div>}{paymentSuccess && <div className="mt-5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-300">{paymentSuccess}</div>}<form onSubmit={submitPayment} className="mt-6 grid gap-4 md:grid-cols-2"><div><label className="block text-sm text-gray-400 mb-2">Amount</label><input value={formatCurrency(paymentSummary.balance)} readOnly className="w-full rounded-xl bg-ink-950 border border-ink-800 px-4 py-3 text-white" /></div><div><label className="block text-sm text-gray-400 mb-2">Payment method</label><select value={paymentMethod} onChange={event => setPaymentMethod(event.target.value)} className="w-full rounded-xl bg-ink-950 border border-ink-800 px-4 py-3 text-white outline-none focus:border-accent-500"><option value="mpesa">M-Pesa</option><option value="bank_transfer">Bank transfer</option><option value="card">Card</option><option value="cash">Cash</option><option value="other">Other</option></select></div><div className="md:col-span-2"><label className="block text-sm text-gray-400 mb-2">Payment reference</label><input value={referenceNumber} onChange={event => setReferenceNumber(event.target.value)} placeholder="e.g. M-Pesa transaction code" className="w-full rounded-xl bg-ink-950 border border-ink-800 px-4 py-3 text-white outline-none focus:border-accent-500" /></div><div className="md:col-span-2 flex justify-end"><button type="submit" disabled={submitting || !referenceNumber.trim()} className="inline-flex items-center gap-2 rounded-xl bg-accent-600 px-5 py-3 text-sm font-medium text-white hover:bg-accent-500 disabled:opacity-50">{submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}{submitting ? 'Submitting...' : 'Submit payment'}</button></div></form></div>}

    <div className="glass rounded-2xl border border-ink-800/50 p-6 sm:p-8"><div className="flex items-center gap-3"><CreditCard className="w-5 h-5 text-accent-500" /><div><h3 className="text-lg font-medium text-white">Payment history</h3><p className="mt-1 text-sm text-gray-400">Payments recorded against this invoice.</p></div></div>{payments.length === 0 ? <div className="mt-6 rounded-2xl border border-dashed border-ink-700/70 bg-white/[0.03] p-8 text-center"><CreditCard className="w-8 h-8 text-ink-600 mx-auto mb-3" /><p className="text-sm text-gray-400">No payments have been recorded for this invoice yet.</p></div> : <div className="mt-6 space-y-3">{payments.map(payment => <div key={payment.id} className="rounded-2xl border border-ink-800/50 bg-white/5 p-4"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex flex-wrap items-center gap-3"><div className="font-medium text-white">{formatCurrency(payment.amount)}</div><div className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] ${getPaymentStatusClasses(payment.status)}`}>{formatStatus(payment.status)}</div></div><div className="mt-2 flex flex-wrap gap-4 text-xs text-gray-500"><span>{payment.payment_date ? `Paid ${new Date(payment.payment_date).toLocaleDateString('en-KE')}` : payment.created_at ? `Recorded ${new Date(payment.created_at).toLocaleDateString('en-KE')}` : 'Date unavailable'}</span>{payment.payment_method && <span>Method: {payment.payment_method}</span>}</div>{payment.reference_number && <div className="mt-2 text-xs text-gray-500">Reference: {payment.reference_number}</div>}{payment.verification_message && <div className="mt-2 text-xs text-gray-400">{payment.verification_message}</div>}</div><div className="text-xs text-gray-500">Payment {payment.id.slice(0, 8)}</div></div></div>)}</div>}</div>
  </div>;
}
