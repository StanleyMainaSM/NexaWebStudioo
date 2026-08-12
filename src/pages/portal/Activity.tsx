import { useEffect, useState } from 'react';
import { BellRing, Loader2, Sparkles } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';

interface NotificationItem {
  id: string;
  title: string;
  content: string;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

interface ProjectItem {
  id: string;
  title: string;
  description: string | null;
  created_at: string;
}

interface InvoiceItem {
  id: string;
  status: string | null;
  created_at: string;
}

export default function Activity() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [invoices, setInvoices] = useState<InvoiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const currentUserId = user?.id;

    if (!currentUserId) {
      setLoading(false);
      return;
    }

    let isMounted = true;

    async function loadActivity() {
      setLoading(true);
      setError(null);

      try {
        const [notificationsResult, projectsResult, invoicesResult] = await Promise.all([
          supabase.from('notifications').select('id, title, content, link, is_read, created_at').eq('user_id', currentUserId).order('created_at', { ascending: false }),
          supabase.from('projects').select('id, title, description, created_at').eq('client_id', currentUserId).order('created_at', { ascending: false }),
          supabase.from('invoices').select('id, status, created_at').eq('client_id', currentUserId).order('created_at', { ascending: false }),
        ]);

        if (notificationsResult.error) throw notificationsResult.error;
        if (projectsResult.error) throw projectsResult.error;
        if (invoicesResult.error) throw invoicesResult.error;

        if (!isMounted) return;
        setNotifications((notificationsResult.data || []) as NotificationItem[]);
        setProjects((projectsResult.data || []) as ProjectItem[]);
        setInvoices((invoicesResult.data || []) as InvoiceItem[]);
      } catch (err) {
        console.error('Error loading activity', err);
        if (isMounted) {
          setError('We could not load your recent activity right now.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadActivity();

    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  const combinedActivity = [...notifications.map((item) => ({ id: item.id, title: item.title, description: item.content, createdAt: item.created_at, kind: 'notification' as const })), ...projects.map((project) => ({ id: `project-${project.id}`, title: project.title, description: project.description || 'Project created', createdAt: project.created_at, kind: 'project' as const })), ...invoices.map((invoice) => ({ id: `invoice-${invoice.id}`, title: `Invoice ${invoice.id.slice(0, 8)}`, description: `Invoice status: ${invoice.status || 'pending'}`, createdAt: invoice.created_at, kind: 'invoice' as const }))].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 10);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="glass rounded-2xl p-6 border border-ink-800/50">
          <div className="flex items-center gap-3 text-white">
            <Loader2 className="w-5 h-5 animate-spin text-accent-500" />
            <span>Loading recent activity…</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">Activity</h2>
        <p className="mt-2 text-sm text-gray-400">A timeline of your recent project, invoice, and notification updates.</p>
      </div>

      {error ? <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div> : null}

      {combinedActivity.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center border border-ink-800/50">
          <BellRing className="w-12 h-12 text-ink-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No activity yet</h3>
          <p className="text-gray-400 text-sm">Recent project and billing updates will appear here as they become available.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {combinedActivity.map((item) => (
            <div key={item.id} className="glass rounded-2xl border border-ink-800/50 p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-sm font-medium text-white">
                    {item.kind === 'notification' ? <BellRing className="w-4 h-4 text-accent-400" /> : <Sparkles className="w-4 h-4 text-accent-400" />}
                    {item.title}
                  </div>
                  <div className="mt-2 text-sm text-gray-400">{item.description}</div>
                </div>
                <div className="text-xs whitespace-nowrap text-gray-500">{new Date(item.createdAt).toLocaleDateString()}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
