import { useEffect, useState } from 'react';
import ProjectDetails from './ProjectDetails';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { CheckCircle2, Clock3, DollarSign, Loader2, Save, Send, LockKeyhole, Pencil } from 'lucide-react';

type Finance = {
  connector_id: string | null;
  connector_name: string | null;
  connector_email: string | null;
  commission_rate: number | null;
  commission_id: string | null;
  commission_amount: number | null;
  commission_status: string | null;
  payout_id: string | null;
  payout_amount: number | null;
  payout_status: string | null;
  confirmation_status: string | null;
  payment_reference: string | null;
  sent_at: string | null;
  confirmed_at: string | null;
};

type ConnectorOption = {
  connector_id: string;
  connector_name: string;
  connector_email: string;
  commission_rate: number | null;
  is_active: boolean;
};

function money(value: number | null | undefined) {
  return `KSh ${Number(value || 0).toLocaleString('en-KE')}`;
}

function pretty(value: string | null | undefined) {
  return value
    ? value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    : 'Pending';
}

export default function ProjectDetailsWithCommission() {
  const { roles } = useAuth();
  const [projectId, setProjectId] = useState<string | null>(null);
  const [finance, setFinance] = useState<Finance | null>(null);
  const [connectors, setConnectors] = useState<ConnectorOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [paying, setPaying] = useState(false);
  const [referenceSaving, setReferenceSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [selectedConnectorId, setSelectedConnectorId] = useState('');
  const [commissionRate, setCommissionRate] = useState('');
  const [reason, setReason] = useState('');
  const [method, setMethod] = useState('Avelixa internal transfer');
  const [reference, setReference] = useState('');
  const [editableReference, setEditableReference] = useState('');

  const ownerVisible = roles.includes('owner') || roles.includes('admin');
  const locked = Boolean(
    finance?.commission_id &&
      (finance.confirmation_status === 'sent' ||
        finance.confirmation_status === 'confirmed' ||
        ['paid', 'completed'].includes(String(finance.commission_status || '').toLowerCase())),
  );

  useEffect(() => {
    const match = window.location.pathname.match(/\/portal\/projects\/([^/?#]+)/);
    setProjectId(match?.[1] || null);
  }, []);

  async function loadFinance() {
    if (!projectId || !ownerVisible) return;
    setLoading(true);
    setError('');
    try {
      const [{ data, error: rpcError }, { data: connectorData, error: connectorError }] = await Promise.all([
        supabase.rpc('owner_get_project_connector_finance', { p_project_id: projectId }),
        supabase.rpc('owner_list_connectors'),
      ]);
      if (rpcError) throw rpcError;
      if (connectorError) throw connectorError;

      const row = Array.isArray(data) ? data[0] : data;
      const nextFinance = (row || null) as Finance | null;
      setFinance(nextFinance);
      setConnectors((connectorData || []) as ConnectorOption[]);
      setSelectedConnectorId(nextFinance?.connector_id || '');
      setCommissionRate(nextFinance?.commission_rate == null ? '' : String(nextFinance.commission_rate));
      setEditableReference(nextFinance?.payment_reference || '');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load connector commission.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadFinance();
  }, [projectId, ownerVisible, roles.join('|')]);

  function handleConnectorChange(value: string) {
    setSelectedConnectorId(value);
    const option = connectors.find((connector) => connector.connector_id === value);
    if (option?.commission_rate != null) setCommissionRate(String(option.commission_rate));
  }

  async function saveManagement() {
    if (!projectId || locked) return;
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const parsedRate = commissionRate.trim() === '' ? null : Number(commissionRate);
      if (parsedRate !== null && (!Number.isFinite(parsedRate) || parsedRate < 0 || parsedRate > 100)) {
        throw new Error('Commission rate must be between 0 and 100 percent.');
      }

      const { error: rpcError } = await supabase.rpc('owner_manage_project_connector', {
        p_project_id: projectId,
        p_connector_id: selectedConnectorId || null,
        p_commission_rate: parsedRate,
        p_reason: reason.trim() || null,
      });
      if (rpcError) throw rpcError;
      setReason('');
      setMessage('Connector commission settings saved.');
      await loadFinance();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save connector commission settings.');
    } finally {
      setSaving(false);
    }
  }

  async function pay() {
    if (!finance?.commission_id || locked) return;
    setPaying(true);
    setError('');
    setMessage('');
    try {
      const paymentReference = reference.trim() || `AVL-COM-${finance.commission_id.slice(0, 8).toUpperCase()}`;
      const { error: rpcError } = await supabase.rpc('owner_mark_connector_commission_sent', {
        p_commission_id: finance.commission_id,
        p_payment_method: method,
        p_reference: paymentReference,
      });
      if (rpcError) throw rpcError;
      setReference('');
      setMessage('Payment sent. The connector must now confirm receipt.');
      await loadFinance();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to initiate connector payment.');
    } finally {
      setPaying(false);
    }
  }

  async function correctReference() {
    if (!finance?.payout_id || finance.confirmation_status !== 'sent') return;
    setReferenceSaving(true);
    setError('');
    setMessage('');
    try {
      const { error: rpcError } = await supabase.rpc('owner_update_connector_payout_reference', {
        p_payout_id: finance.payout_id,
        p_reference: editableReference.trim(),
        p_reason: 'Owner/Admin corrected the Avelixa payout reference before connector confirmation.',
      });
      if (rpcError) throw rpcError;
      setMessage('Avelixa payout reference updated.');
      await loadFinance();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update the payout reference.');
    } finally {
      setReferenceSaving(false);
    }
  }

  return (
    <>
      <ProjectDetails />
      {ownerVisible && (
        <section className="mx-auto max-w-7xl px-4 pb-8">
          <div className="rounded-2xl border border-accent-500/20 bg-accent-500/5 p-6">
            <div className="flex items-center gap-3">
              <DollarSign className="w-5 h-5 text-accent-400" />
              <div>
                <h3 className="text-lg font-medium text-white">Connector Commission Management</h3>
                <p className="text-sm text-gray-500 mt-1">Manage connector attribution, commission configuration and payout from this project.</p>
              </div>
            </div>

            {loading && (
              <div className="mt-5 flex items-center gap-2 text-sm text-gray-400">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading commission details...
              </div>
            )}

            {!loading && error && (
              <div className="mt-5 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300">{error}</div>
            )}
            {!loading && message && (
              <div className="mt-5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-300">{message}</div>
            )}

            {!loading && (
              <div className="mt-5 space-y-5">
                <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-white">
                    {locked ? <LockKeyhole className="w-4 h-4 text-amber-400" /> : <Pencil className="w-4 h-4 text-accent-400" />}
                    Commission Configuration
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    {locked
                      ? 'This commission is locked because payment has been sent or confirmed.'
                      : 'Before payout, changing the connector or rate updates the underlying relationship and recalculates the commission from the qualifying client payment.'}
                  </p>

                  <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                    <label className="text-xs text-gray-500">
                      Connector
                      <select
                        value={selectedConnectorId}
                        onChange={(event) => handleConnectorChange(event.target.value)}
                        disabled={locked || saving}
                        className="mt-2 w-full rounded-xl bg-ink-950 border border-ink-800 px-3 py-2.5 text-sm text-white disabled:opacity-50"
                      >
                        <option value="">No connector</option>
                        {connectors.map((connector) => (
                          <option key={connector.connector_id} value={connector.connector_id}>
                            {connector.connector_name} — {connector.connector_email}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="text-xs text-gray-500">
                      Connector commission rate (%)
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={commissionRate}
                        onChange={(event) => setCommissionRate(event.target.value)}
                        disabled={locked || saving || !selectedConnectorId}
                        className="mt-2 w-full rounded-xl bg-ink-950 border border-ink-800 px-3 py-2.5 text-sm text-white disabled:opacity-50"
                      />
                    </label>
                    <label className="text-xs text-gray-500">
                      Reason / audit note
                      <input
                        value={reason}
                        onChange={(event) => setReason(event.target.value)}
                        disabled={locked || saving}
                        placeholder="Optional"
                        className="mt-2 w-full rounded-xl bg-ink-950 border border-ink-800 px-3 py-2.5 text-sm text-white disabled:opacity-50"
                      />
                    </label>
                  </div>

                  <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="text-xs text-gray-500">
                      Amount is database-calculated from the qualifying client payment and rate; it is never entered manually.
                    </div>
                    {!locked && (
                      <button
                        type="button"
                        onClick={() => void saveManagement()}
                        disabled={saving || !selectedConnectorId}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent-600 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
                      >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        {saving ? 'Saving...' : 'Save Commission Settings'}
                      </button>
                    )}
                  </div>
                </div>

                {!finance?.connector_id && (
                  <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 text-sm text-gray-400">
                    No connector is currently associated with this project. Assign an eligible Connector above when the project legitimately came from a connector lead.
                  </div>
                )}

                {finance?.connector_id && !finance.commission_id && (
                  <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 text-sm text-gray-400">
                    No commission exists yet. If a qualifying client payment has already been completed, saving the connector configuration will create the commission automatically. Otherwise the existing payment workflow will create it when the qualifying payment is completed.
                  </div>
                )}

                {finance?.commission_id && (
                  <div className="space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <Info label="Connector" value={finance.connector_name || finance.connector_email || 'Connector'} />
                      <Info label="Commission Rate" value={`${Number(finance.commission_rate || 0)}%`} />
                      <Info label="Commission Amount" value={money(finance.commission_amount)} />
                      <Info
                        label="Status"
                        value={
                          finance.confirmation_status === 'confirmed'
                            ? 'Paid / Confirmed'
                            : finance.confirmation_status === 'sent'
                              ? 'Awaiting Connector Confirmation'
                              : pretty(finance.commission_status)
                        }
                      />
                    </div>

                    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs text-gray-500">Avelixa Payout Reference</p>
                          {finance.confirmation_status === 'sent' ? (
                            <div className="mt-2 flex flex-col sm:flex-row gap-2">
                              <input
                                value={editableReference}
                                onChange={(event) => setEditableReference(event.target.value)}
                                className="min-w-0 flex-1 rounded-xl bg-ink-950 border border-ink-800 px-3 py-2.5 text-sm font-mono text-white"
                              />
                              <button
                                type="button"
                                onClick={() => void correctReference()}
                                disabled={referenceSaving}
                                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white disabled:opacity-50"
                              >
                                {referenceSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                {referenceSaving ? 'Saving...' : 'Update Reference'}
                              </button>
                            </div>
                          ) : (
                            <p className="mt-1 font-mono text-sm text-white">{finance.payment_reference || 'Not assigned'}</p>
                          )}
                          {finance.sent_at && <p className="mt-2 text-xs text-gray-500">Sent {new Date(finance.sent_at).toLocaleString('en-KE')}</p>}
                          {finance.confirmed_at && <p className="mt-1 text-xs text-emerald-400">Confirmed {new Date(finance.confirmed_at).toLocaleString('en-KE')}</p>}
                        </div>

                        {finance.confirmation_status === 'confirmed' ? (
                          <span className="inline-flex items-center gap-2 rounded-xl bg-emerald-500/10 px-4 py-2.5 text-sm text-emerald-400">
                            <CheckCircle2 className="w-4 h-4" />Connector Confirmed Receipt
                          </span>
                        ) : finance.confirmation_status === 'sent' ? (
                          <span className="inline-flex items-center gap-2 rounded-xl bg-amber-500/10 px-4 py-2.5 text-sm text-amber-400">
                            <Clock3 className="w-4 h-4" />Awaiting Connector Confirmation
                          </span>
                        ) : (
                          <div className="w-full lg:max-w-xl grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <input
                              value={method}
                              onChange={(event) => setMethod(event.target.value)}
                              placeholder="Payment method"
                              className="rounded-xl bg-ink-950 border border-ink-800 px-3 py-2.5 text-sm text-white"
                            />
                            <input
                              value={reference}
                              onChange={(event) => setReference(event.target.value)}
                              placeholder="Avelixa reference (optional)"
                              className="rounded-xl bg-ink-950 border border-ink-800 px-3 py-2.5 text-sm text-white"
                            />
                            <button
                              onClick={() => void pay()}
                              disabled={paying}
                              className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent-600 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
                            >
                              {paying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                              {paying ? 'Sending...' : 'Pay Connector'}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      )}
    </>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-1 text-sm font-medium text-white truncate">{value}</p>
    </div>
  );
}
