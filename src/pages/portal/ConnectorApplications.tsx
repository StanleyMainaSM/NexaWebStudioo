import { useEffect, useState } from 'react';
import { CheckCircle2, Clock3, Loader2, UserPlus, XCircle, AlertTriangle, MailCheck, RefreshCw } from 'lucide-react';
import { supabase } from '../../lib/supabase';

type Application = {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  county: string | null;
  town: string | null;
  status: string;
  provisioning_status: string;
  provisioning_error: string | null;
  provisioned_user_id: string | null;
  provisioned_at: string | null;
  created_at: string;
};

type QueueState = { status: string; attempts: number; last_error: string | null };

const provisioningLabel = (status: string) => {
  switch (status) {
    case 'completed': return 'Provisioned';
    case 'processing': return 'Provisioning';
    case 'failed': return 'Failed';
    default: return 'Pending';
  }
};

export default function ConnectorApplications() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [queueStates, setQueueStates] = useState<Record<string, QueueState>>({});
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const { data, error: queryError } = await supabase
        .from('connector_applications')
        .select('id,full_name,email,phone,county,town,status,provisioning_status,provisioning_error,provisioned_user_id,provisioned_at,created_at')
        .order('created_at', { ascending: false });
      if (queryError) throw queryError;

      const rows = (data || []) as Application[];
      setApplications(rows);

      const ids = rows.map((row) => row.id);
      if (ids.length) {
        const { data: queue, error: queueError } = await supabase
          .from('connector_provisioning_queue')
          .select('application_id,status,attempts,last_error')
          .in('application_id', ids);
        if (queueError) throw queueError;
        const map: Record<string, QueueState> = {};
        (queue || []).forEach((row: any) => {
          map[row.application_id] = { status: row.status, attempts: row.attempts, last_error: row.last_error };
        });
        setQueueStates(map);
      } else {
        setQueueStates({});
      }
    } catch (loadError: any) {
      console.error('Connector applications load error:', loadError);
      setError(loadError?.message || 'Unable to load Connector applications.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const updateApplication = async (application: Application, status: 'approved' | 'rejected') => {
    setProcessing(application.id);
    setError('');
    setMessage('');
    try {
      const { data, error: updateError } = await supabase
        .from('connector_applications')
        .update(status === 'approved'
          ? { status: 'approved', updated_at: new Date().toISOString() }
          : { status: 'rejected', rejection_reason: 'Rejected by Avelixa administration.', updated_at: new Date().toISOString() })
        .eq('id', application.id)
        .eq('status', 'pending')
        .select('id,status')
        .maybeSingle();
      if (updateError) throw updateError;
      if (!data) throw new Error('This application has already been processed. Refresh and review its current state.');
      setMessage(status === 'approved'
        ? 'Connector application approved. Provisioning and the secure password setup invitation are handled by the provisioning workflow.'
        : 'Connector application rejected. Connector access has not been provisioned.');
      await load();
    } catch (updateError: any) {
      console.error('Connector application update error:', updateError);
      setError(updateError?.message || `Unable to ${status} Connector application.`);
    } finally {
      setProcessing(null);
    }
  };

  const counts = applications.reduce((summary, application) => {
    summary[application.status] = (summary[application.status] || 0) + 1;
    return summary;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-8">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="text-xs font-bold uppercase tracking-widest text-accent-400">Connector Management</div>
          <h1 className="mt-2 text-3xl font-semibold text-white">Connector Applications</h1>
          <p className="mt-2 text-sm text-gray-400">Review applications and monitor approval, provisioning, and activation readiness from one workspace.</p>
        </div>
        <button type="button" onClick={() => void load()} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-gray-200"><RefreshCw className={loading ? 'w-4 h-4 animate-spin' : 'w-4 h-4'} />Refresh</button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"><div className="text-xs uppercase tracking-widest text-gray-500">Total</div><div className="mt-2 text-2xl font-semibold text-white">{applications.length}</div></div>
        <div className="rounded-2xl border border-yellow-500/20 bg-yellow-500/[0.04] p-4"><div className="text-xs uppercase tracking-widest text-yellow-300/70">Pending review</div><div className="mt-2 text-2xl font-semibold text-white">{counts.pending || 0}</div></div>
        <div className="rounded-2xl border border-accent-500/20 bg-accent-500/[0.04] p-4"><div className="text-xs uppercase tracking-widest text-accent-300/70">Approved</div><div className="mt-2 text-2xl font-semibold text-white">{counts.approved || 0}</div></div>
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.04] p-4"><div className="text-xs uppercase tracking-widest text-emerald-300/70">Provisioned</div><div className="mt-2 text-2xl font-semibold text-white">{applications.filter((application) => application.provisioning_status === 'completed').length}</div></div>
      </div>

      {error && <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">{error}</div>}
      {message && <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-300">{message}</div>}

      {loading ? (
        <div className="min-h-[240px] flex items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03]"><Loader2 className="w-7 h-7 animate-spin text-accent-400" /></div>
      ) : applications.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-10 text-center"><CheckCircle2 className="w-10 h-10 text-accent-400 mx-auto mb-4" /><h2 className="text-lg font-medium text-white">No Connector applications</h2><p className="mt-2 text-sm text-gray-500">New applications will appear here for Owner/Admin review.</p></div>
      ) : (
        <div className="space-y-4">
          {applications.map((application) => {
            const queue = queueStates[application.id];
            const isPendingReview = application.status === 'pending';
            const provisioned = application.provisioning_status === 'completed';
            const failed = application.provisioning_status === 'failed' || queue?.status === 'failed';
            return (
              <section key={application.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
                <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-6">
                  <div className="min-w-0">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-accent-500/10 border border-accent-500/20 flex items-center justify-center"><UserPlus className="w-5 h-5 text-accent-400" /></div>
                      <div className="min-w-0"><h2 className="text-lg font-medium text-white truncate">{application.full_name}</h2><p className="text-xs text-gray-500">Applied {new Date(application.created_at).toLocaleString()}</p></div>
                    </div>
                    <div className="mt-5 grid sm:grid-cols-2 gap-x-8 gap-y-2 text-sm text-gray-400"><p><span className="text-gray-600">Email:</span> {application.email}</p><p><span className="text-gray-600">Phone:</span> {application.phone}</p><p><span className="text-gray-600">Town:</span> {application.town || '—'}</p><p><span className="text-gray-600">County:</span> {application.county || '—'}</p></div>

                    <div className="mt-5 flex flex-wrap gap-2">
                      <span className={`rounded-full border px-3 py-1.5 text-xs font-medium ${application.status === 'approved' ? 'border-accent-500/20 bg-accent-500/5 text-accent-300' : application.status === 'rejected' ? 'border-red-500/20 bg-red-500/5 text-red-300' : 'border-yellow-500/20 bg-yellow-500/5 text-yellow-300'}`}>Application: {application.status}</span>
                      {application.status === 'approved' && <span className={`rounded-full border px-3 py-1.5 text-xs font-medium ${provisioned ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-300' : failed ? 'border-red-500/20 bg-red-500/5 text-red-300' : 'border-yellow-500/20 bg-yellow-500/5 text-yellow-300'}`}>{provisioningLabel(application.provisioning_status)}</span>}
                      {provisioned && <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/5 px-3 py-1.5 text-xs text-emerald-300"><MailCheck className="w-3.5 h-3.5" />Activation workflow completed</span>}
                    </div>

                    {queue && <p className="mt-3 text-xs text-gray-500">Provisioning queue: {queue.status} · attempts {queue.attempts}</p>}
                    {(application.provisioning_error || queue?.last_error) && <div className="mt-3 flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/5 p-3 text-xs text-red-300"><AlertTriangle className="w-4 h-4 shrink-0" />{application.provisioning_error || queue?.last_error}</div>}
                  </div>

                  {isPendingReview && <div className="flex flex-col sm:flex-row gap-3 shrink-0"><button type="button" disabled={processing === application.id} onClick={() => void updateApplication(application, 'rejected')} className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-500/20 px-5 py-3 text-sm font-medium text-red-300 hover:bg-red-500/10 disabled:opacity-50">{processing === application.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}Reject</button><button type="button" disabled={processing === application.id} onClick={() => void updateApplication(application, 'approved')} className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent-600 px-5 py-3 text-sm font-medium text-white hover:bg-accent-500 disabled:opacity-50">{processing === application.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}Approve Connector</button></div>}
                </div>
              </section>
            );
          })}
        </div>
      )}

      <div className="flex items-center gap-2 text-xs text-gray-500"><Clock3 className="w-4 h-4" />Only authenticated Owner/Admin users can access this workspace. Passwords are never displayed or sent by this UI.</div>
    </div>
  );
}
