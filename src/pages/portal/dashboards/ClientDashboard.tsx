import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../lib/auth';
import { AlertCircle, ArrowRight, FileText, FolderKanban, Loader2, ReceiptText, Settings as SettingsIcon, Sparkles } from 'lucide-react';

interface Profile {
  full_name: string | null;
  email: string | null;
}

interface Project {
  id: string;
  title: string;
  description: string | null;
  status: string | null;
  created_at: string;
  price: number | null;
}

interface Invoice {
  id: string;
  amount: number | null;
  status: string | null;
  created_at: string;
  due_date: string | null;
}

interface ActivityItem {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  kind: 'project' | 'invoice';
}

const activeStatuses = ['pending', 'in_progress', 'review', 'on_hold', 'maintenance'];

function getDisplayName(profile: Profile | null, fallbackEmail?: string | null) {
  if (profile?.full_name) return profile.full_name;
  if (fallbackEmail) return fallbackEmail.split('@')[0];
  return 'Client';
}

function formatStatus(status: string | null | undefined) {
  if (!status) return 'Pending';
  return status.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatCurrency(amount: number | null | undefined) {
  if (typeof amount !== 'number') return '—';
  return `KSh ${amount.toLocaleString()}`;
}

export default function ClientDashboard() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const userId = user?.id;
    if (!userId) {
      setLoading(false);
      setProjects([]);
      setInvoices([]);
      setProfile(null);
      return;
    }

    let isMounted = true;

    async function loadDashboardData() {
      setLoading(true);
      setError(null);

      try {
        const [profileResult, projectsResult, invoicesResult] = await Promise.all([
          supabase.from('profiles').select('full_name, email').eq('id', userId).maybeSingle(),
          supabase.from('projects').select('id, title, description, status, created_at, price').eq('client_id', userId).order('created_at', { ascending: false }),
          supabase.from('invoices').select('id, amount, status, created_at, due_date').eq('client_id', userId).order('created_at', { ascending: false }),
        ]);

        if (profileResult.error) throw profileResult.error;
        if (projectsResult.error) throw projectsResult.error;
        if (invoicesResult.error) throw invoicesResult.error;

        if (!isMounted) return;

        setProfile(profileResult.data as Profile | null);
        setProjects(projectsResult.data || []);
        setInvoices(invoicesResult.data || []);
      } catch (err) {
        if (!isMounted) return;
        console.error('Error loading client dashboard', err);
        setError('We could not load your dashboard right now. Please try again shortly.');
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadDashboardData();

    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  const totalProjects = projects.length;
  const activeProjects = projects.filter((project) => project.status && activeStatuses.includes(project.status)).length;
  const completedProjects = projects.filter((project) => project.status === 'completed').length;
  const totalInvoices = invoices.length;

  const featuredProject = projects.find((project) => project.status && activeStatuses.includes(project.status)) || projects[0] || null;

  const activityItems: ActivityItem[] = [
    ...projects.slice(0, 3).map((project) => ({
      id: `project-${project.id}`,
      title: project.title,
      description: `Project status: ${formatStatus(project.status)}`,
      createdAt: project.created_at,
      kind: 'project' as const,
    })),
    ...invoices.slice(0, 3).map((invoice) => ({
      id: `invoice-${invoice.id}`,
      title: `Invoice ${invoice.id.slice(0, 8)}`,
      description: `Invoice status: ${formatStatus(invoice.status)}`,
      createdAt: invoice.created_at,
      kind: 'invoice' as const,
    })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 4);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="glass rounded-2xl p-8 border border-ink-800/50">
          <div className="flex items-center gap-3 text-white">
            <Loader2 className="w-5 h-5 animate-spin text-accent-500" />
            <span>Loading your dashboard…</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass rounded-2xl p-8 border border-ink-800/50">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 mt-0.5" />
          <div>
            <h2 className="text-lg font-medium text-white">We could not load your dashboard</h2>
            <p className="text-sm text-gray-400 mt-2">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="glass rounded-2xl p-6 md:p-8 border border-ink-800/50">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-accent-500/20 bg-accent-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.25em] text-accent-400">
              <Sparkles className="w-3.5 h-3.5" />
              Client portal
            </div>
            <h2 className="mt-4 text-2xl font-semibold text-white">Welcome back, {getDisplayName(profile, user?.email)}</h2>
            <p className="mt-2 max-w-2xl text-sm text-gray-400">
              Here is a live overview of your current projects, invoices, and recent activity.
            </p>
          </div>

          <div className="rounded-2xl border border-ink-800/50 bg-white/5 px-4 py-3 text-sm text-gray-300">
            Signed in as <span className="font-medium text-white">{user?.email || 'your account'}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="glass rounded-2xl p-5 border border-ink-800/50">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-bold uppercase tracking-[0.25em] text-ink-500">Total projects</div>
              <div className="mt-3 text-3xl font-light text-white">{totalProjects}</div>
            </div>
            <div className="rounded-xl bg-accent-500/10 p-3 text-accent-400">
              <FolderKanban className="w-5 h-5" />
            </div>
          </div>
        </div>

        <div className="glass rounded-2xl p-5 border border-ink-800/50">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-bold uppercase tracking-[0.25em] text-ink-500">Active projects</div>
              <div className="mt-3 text-3xl font-light text-white">{activeProjects}</div>
            </div>
            <div className="rounded-xl bg-accent-500/10 p-3 text-accent-400">
              <FolderKanban className="w-5 h-5" />
            </div>
          </div>
        </div>

        <div className="glass rounded-2xl p-5 border border-ink-800/50">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-bold uppercase tracking-[0.25em] text-ink-500">Completed projects</div>
              <div className="mt-3 text-3xl font-light text-white">{completedProjects}</div>
            </div>
            <div className="rounded-xl bg-emerald-500/10 p-3 text-emerald-400">
              <FileText className="w-5 h-5" />
            </div>
          </div>
        </div>

        <div className="glass rounded-2xl p-5 border border-ink-800/50">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-bold uppercase tracking-[0.25em] text-ink-500">Total invoices</div>
              <div className="mt-3 text-3xl font-light text-white">{totalInvoices}</div>
            </div>
            <div className="rounded-xl bg-amber-500/10 p-3 text-amber-400">
              <ReceiptText className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_0.8fr] gap-6">
        <div className="glass rounded-2xl p-6 border border-ink-800/50" id="projects-summary">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-lg font-medium text-white">Current project</h3>
              <p className="mt-1 text-sm text-gray-400">Your most relevant active or recent project.</p>
            </div>
            <Link to="/portal/projects" className="inline-flex items-center gap-2 text-sm font-medium text-accent-400 hover:text-accent-300">
              View projects
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {featuredProject ? (
            <div className="mt-6 rounded-2xl border border-ink-800/50 bg-white/5 p-5">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="text-xs font-bold uppercase tracking-[0.25em] text-ink-500">Most relevant project</div>
                  <h4 className="mt-2 text-xl font-semibold text-white">{featuredProject.title}</h4>
                  <p className="mt-2 text-sm text-gray-400">
                    {featuredProject.description || 'No additional project details have been shared yet.'}
                  </p>
                </div>

                <div className="text-left md:text-right">
                  <div className="inline-flex rounded-full border border-accent-500/20 bg-accent-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-accent-400">
                    {formatStatus(featuredProject.status)}
                  </div>
                  <div className="mt-3 text-sm text-gray-400">
                    Started {new Date(featuredProject.created_at).toLocaleDateString()}
                  </div>
                  {featuredProject.price !== null && featuredProject.price !== undefined && (
                    <div className="mt-1 text-sm text-gray-400">Budget {formatCurrency(featuredProject.price)}</div>
                  )}
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                <Link to={`/portal/projects/${featuredProject.id}`} className="inline-flex items-center gap-2 rounded-xl bg-accent-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-500">
                  Open project
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          ) : (
            <div className="mt-6 rounded-2xl border border-dashed border-ink-700/70 bg-white/[0.03] p-6 text-center text-sm text-gray-400">
              You do not have any projects yet. Once a project is assigned to you, it will appear here.
            </div>
          )}
        </div>

        <div className="glass rounded-2xl p-6 border border-ink-800/50">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-white">Quick actions</h3>
              <p className="mt-1 text-sm text-gray-400">Jump to the most useful sections.</p>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            <Link to="/portal/projects" className="flex items-center justify-between rounded-2xl border border-ink-800/50 bg-white/5 px-4 py-3 text-sm text-gray-200 transition-colors hover:bg-white/[0.08]">
              <span className="flex items-center gap-3"><FolderKanban className="w-4 h-4 text-accent-400" />View Projects</span>
              <ArrowRight className="w-4 h-4 text-gray-500" />
            </Link>
            <a href="#invoice-summary" className="flex items-center justify-between rounded-2xl border border-ink-800/50 bg-white/5 px-4 py-3 text-sm text-gray-200 transition-colors hover:bg-white/[0.08]">
              <span className="flex items-center gap-3"><ReceiptText className="w-4 h-4 text-amber-400" />View Invoices</span>
              <ArrowRight className="w-4 h-4 text-gray-500" />
            </a>
            <Link to="/portal/settings" className="flex items-center justify-between rounded-2xl border border-ink-800/50 bg-white/5 px-4 py-3 text-sm text-gray-200 transition-colors hover:bg-white/[0.08]">
              <span className="flex items-center gap-3"><SettingsIcon className="w-4 h-4 text-accent-400" />Settings</span>
              <ArrowRight className="w-4 h-4 text-gray-500" />
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.05fr_0.95fr] gap-6">
        <div className="glass rounded-2xl p-6 border border-ink-800/50" id="invoice-summary">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-white">Invoice summary</h3>
              <p className="mt-1 text-sm text-gray-400">Your invoices are shown here and kept scoped to your account.</p>
            </div>
          </div>

          {invoices.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-dashed border-ink-700/70 bg-white/[0.03] p-6 text-center text-sm text-gray-400">
              You do not have any invoices yet. Invoices will appear here once they are created for your account.
            </div>
          ) : (
            <div className="mt-6 space-y-3">
              {invoices.slice(0, 3).map((invoice) => (
                <div key={invoice.id} className="flex flex-col gap-2 rounded-2xl border border-ink-800/50 bg-white/5 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="text-sm font-medium text-white">Invoice {invoice.id.slice(0, 8)}</div>
                    <div className="mt-1 text-sm text-gray-400">Due {invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : '—'}</div>
                  </div>
                  <div className="text-left sm:text-right">
                    <div className="text-sm font-medium text-white">{formatCurrency(invoice.amount)}</div>
                    <div className="mt-1 text-xs font-semibold uppercase tracking-[0.2em] text-amber-400">{formatStatus(invoice.status)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="glass rounded-2xl p-6 border border-ink-800/50">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-white">Recent activity</h3>
              <p className="mt-1 text-sm text-gray-400">A short timeline of your most recent project and invoice records.</p>
            </div>
          </div>

          {activityItems.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-dashed border-ink-700/70 bg-white/[0.03] p-6 text-center text-sm text-gray-400">
              There is not enough recent activity to show yet. Your project and invoice updates will appear here.
            </div>
          ) : (
            <div className="mt-6 space-y-3">
              {activityItems.map((item) => (
                <div key={item.id} className="rounded-2xl border border-ink-800/50 bg-white/5 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-sm font-medium text-white">{item.title}</div>
                      <div className="mt-1 text-sm text-gray-400">{item.description}</div>
                    </div>
                    <div className="text-xs whitespace-nowrap text-gray-500">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
