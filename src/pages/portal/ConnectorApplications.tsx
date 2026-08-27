import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { CheckCircle2, Clock3, Loader2, UserPlus, XCircle } from 'lucide-react';

type Application = {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  county: string | null;
  town: string | null;
  status: string;
  created_at: string;
};

export default function ConnectorApplications() {
  const [applications, setApplications] = useState<Application[]>([]);
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
        .select('id,full_name,email,phone,county,town,status,created_at')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (queryError) throw queryError;
      setApplications((data || []) as Application[]);
    } catch (e: any) {
      console.error(e);
      setError(e?.message || 'Unable to load Connector applications.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const updateApplication = async (application: Application, status: 'approved' | 'rejected') => {
    setProcessing(application.id);
    setError('');
    setMessage('');

    try {
      const { error: updateError } = await supabase
        .from('connector_applications')
        .update(
          status === 'approved'
            ? {
                status: 'approved',
                updated_at: new Date().toISOString(),
              }
            : {
                status: 'rejected',
                rejection_reason: 'Rejected by Avelixa administration.',
                updated_at: new Date().toISOString(),
              },
        )
        .eq('id', application.id)
        .eq('status', 'pending');

      if (updateError) throw updateError;

      if (status === 'approved') {
        setMessage(
          'Connector application approved. Account provisioning and the password setup invitation will be handled automatically.',
        );
      } else {
        setMessage('Connector application rejected. Connector access has been disabled.');
      }

      await load();
    } catch (e: any) {
      console.error(e);
      setError(e?.message || `Unable to ${status} Connector application.`);
    } finally {
      setProcessing(null);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="text-xs font-bold uppercase tracking-widest text-accent-400">Connector Management</div>
          <h1 className="mt-2 text-3xl font-semibold text-white">Connector Applications</h1>
          <p className="mt-2 text-sm text-gray-400">Review Connector applications and approve or reject them from one dedicated workspace.</p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-xl border border-accent-500/20 bg-accent-500/5 px-4 py-3 text-sm text-accent-300">
          <UserPlus className="w-4 h-4" />
          {applications.length} pending
        </div>
      </div>

      {error && <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">{error}</div>}
      {message && <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-300">{message}</div>}

      {loading ? (
        <div className="min-h-[240px] flex items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03]">
          <Loader2 className="w-7 h-7 animate-spin text-accent-400" />
        </div>
      ) : applications.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-10 text-center">
          <CheckCircle2 className="w-10 h-10 text-accent-400 mx-auto mb-4" />
          <h2 className="text-lg font-medium text-white">No pending Connector applications</h2>
          <p className="mt-2 text-sm text-gray-500">New Connector applications will appear here for Owner/Admin review.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {applications.map((application) => (
            <section key={application.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                <div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-accent-500/10 border border-accent-500/20 flex items-center justify-center">
                      <UserPlus className="w-5 h-5 text-accent-400" />
                    </div>
                    <div>
                      <h2 className="text-lg font-medium text-white">{application.full_name}</h2>
                      <p className="text-xs text-gray-500">Applied {new Date(application.created_at).toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="mt-5 grid sm:grid-cols-2 gap-x-8 gap-y-2 text-sm text-gray-400">
                    <p><span className="text-gray-600">Email:</span> {application.email}</p>
                    <p><span className="text-gray-600">Phone:</span> {application.phone}</p>
                    <p><span className="text-gray-600">Town:</span> {application.town || '—'}</p>
                    <p><span className="text-gray-600">County:</span> {application.county || '—'}</p>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 shrink-0">
                  <button type="button" disabled={processing === application.id} onClick={() => void updateApplication(application, 'rejected')} className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-500/20 px-5 py-3 text-sm font-medium text-red-300 hover:bg-red-500/10 disabled:opacity-50">
                    {processing === application.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                    Reject
                  </button>
                  <button type="button" disabled={processing === application.id} onClick={() => void updateApplication(application, 'approved')} className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent-600 px-5 py-3 text-sm font-medium text-white hover:bg-accent-500 disabled:opacity-50">
                    {processing === application.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    Approve Connector
                  </button>
                </div>
              </div>
            </section>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2 text-xs text-gray-500">
        <Clock3 className="w-4 h-4" />
        Only authenticated Owner/Admin users can access this route through the portal role guard.
      </div>
    </div>
  );
}
