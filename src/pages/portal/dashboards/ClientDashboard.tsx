import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  CheckCircle2,
  FileText,
  FolderKanban,
  Loader2,
  ReceiptText,
  Settings,
  Sparkles,
  UploadCloud,
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../lib/auth';

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
  type: 'project' | 'invoice';
}

const activeStatuses = [
  'pending',
  'in_progress',
  'review',
  'on_hold',
  'maintenance',
];

function getDisplayName(profile: Profile | null, email?: string | null) {
  if (profile?.full_name?.trim()) {
    return profile.full_name.trim();
  }

  if (email) {
    return email.split('@')[0];
  }

  return 'Client';
}

function formatStatus(status: string | null | undefined) {
  if (!status) return 'Pending';

  return status
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatCurrency(value: number | null | undefined) {
  if (typeof value !== 'number') {
    return '—';
  }

  return `KSh ${value.toLocaleString()}`;
}

function getStatusStyle(status: string | null | undefined) {
  if (status === 'completed') {
    return 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400';
  }

  if (status === 'in_progress' || status === 'review') {
    return 'border-accent-500/20 bg-accent-500/10 text-accent-400';
  }

  return 'border-amber-500/20 bg-amber-500/10 text-amber-400';
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
      setProfile(null);
      setProjects([]);
      setInvoices([]);
      return;
    }

    let mounted = true;

    async function loadDashboard() {
      setLoading(true);
      setError(null);

      try {
        const [profileResult, projectsResult, invoicesResult] =
          await Promise.all([
            supabase
              .from('profiles')
              .select('full_name, email')
              .eq('id', userId)
              .maybeSingle(),

            supabase
              .from('projects')
              .select(
                'id, title, description, status, created_at, price'
              )
              .eq('client_id', userId)
              .order('created_at', { ascending: false }),

            supabase
              .from('invoices')
              .select(
                'id, amount, status, created_at, due_date'
              )
              .eq('client_id', userId)
              .order('created_at', { ascending: false }),
          ]);

        if (profileResult.error) throw profileResult.error;
        if (projectsResult.error) throw projectsResult.error;
        if (invoicesResult.error) throw invoicesResult.error;

        if (!mounted) return;

        setProfile(profileResult.data as Profile | null);
        setProjects((projectsResult.data || []) as Project[]);
        setInvoices((invoicesResult.data || []) as Invoice[]);
      } catch (err) {
        console.error('Error loading client dashboard:', err);

        if (mounted) {
          setError(
            'We could not load your dashboard right now. Please try again.'
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadDashboard();

    return () => {
      mounted = false;
    };
  }, [user?.id]);

  const totalProjects = projects.length;

  const activeProjects = projects.filter(
    (project) =>
      project.status && activeStatuses.includes(project.status)
  ).length;

  const completedProjects = projects.filter(
    (project) => project.status === 'completed'
  ).length;

  const totalInvoices = invoices.length;

  const currentProject = useMemo(() => {
    return (
      projects.find(
        (project) =>
          project.status &&
          activeStatuses.includes(project.status)
      ) ||
      projects[0] ||
      null
    );
  }, [projects]);

  const totalInvoiced = invoices.reduce(
    (total, invoice) =>
      total + (typeof invoice.amount === 'number' ? invoice.amount : 0),
    0
  );

  const outstandingInvoices = invoices.filter(
    (invoice) =>
      invoice.status !== 'paid' &&
      invoice.status !== 'completed'
  );

  const outstandingAmount = outstandingInvoices.reduce(
    (total, invoice) =>
      total + (typeof invoice.amount === 'number' ? invoice.amount : 0),
    0
  );

  const recentActivity: ActivityItem[] = [
    ...projects.slice(0, 4).map((project) => ({
      id: `project-${project.id}`,
      title: project.title,
      description: `Project status: ${formatStatus(project.status)}`,
      createdAt: project.created_at,
      type: 'project' as const,
    })),

    ...invoices.slice(0, 4).map((invoice) => ({
      id: `invoice-${invoice.id}`,
      title: `Invoice ${invoice.id.slice(0, 8)}`,
      description: `Invoice status: ${formatStatus(invoice.status)}`,
      createdAt: invoice.created_at,
      type: 'invoice' as const,
    })),
  ]
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() -
        new Date(a.createdAt).getTime()
    )
    .slice(0, 5);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="glass rounded-3xl border border-ink-800/50 p-8">
          <div className="flex items-center gap-3 text-white">
            <Loader2 className="h-5 w-5 animate-spin text-accent-500" />
            <span>Loading your client workspace...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass rounded-3xl border border-red-500/20 bg-red-500/5 p-8">
        <h2 className="text-xl font-semibold text-white">
          Dashboard unavailable
        </h2>

        <p className="mt-2 text-sm text-gray-400">
          {error}
        </p>
      </div>
    );
  }

  const displayName = getDisplayName(profile, user?.email);

  return (
    <div className="space-y-6 pb-8">

      {/* Welcome */}
      <section className="relative overflow-hidden rounded-3xl border border-ink-800/50 bg-gradient-to-br from-accent-600/15 via-white/[0.04] to-transparent p-6 md:p-8">
        <div className="absolute right-0 top-0 h-48 w-48 rounded-full bg-accent-500/10 blur-3xl" />

        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full border border-accent-500/20 bg-accent-500/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.25em] text-accent-400">
            <Sparkles className="h-3.5 w-3.5" />
            Avelixa Client Workspace
          </div>

          <h1 className="mt-5 text-3xl font-semibold tracking-tight text-white md:text-4xl">
            Welcome back, {displayName}
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-400">
            Manage your website projects, documents, invoices and
            important updates from one place.
          </p>
        </div>
      </section>

      {/* Statistics */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="glass rounded-2xl border border-ink-800/50 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-ink-500">
                Total projects
              </p>

              <p className="mt-3 text-3xl font-light text-white">
                {totalProjects}
              </p>
            </div>

            <FolderKanban className="h-5 w-5 text-accent-400" />
          </div>
        </div>

        <div className="glass rounded-2xl border border-ink-800/50 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-ink-500">
                Active projects
              </p>

              <p className="mt-3 text-3xl font-light text-white">
                {activeProjects}
              </p>
            </div>

            <FolderKanban className="h-5 w-5 text-accent-400" />
          </div>
        </div>

        <div className="glass rounded-2xl border border-ink-800/50 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-ink-500">
                Completed
              </p>

              <p className="mt-3 text-3xl font-light text-white">
                {completedProjects}
              </p>
            </div>

            <CheckCircle2 className="h-5 w-5 text-emerald-400" />
          </div>
        </div>

        <div className="glass rounded-2xl border border-ink-800/50 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-ink-500">
                Invoices
              </p>

              <p className="mt-3 text-3xl font-light text-white">
                {totalInvoices}
              </p>
            </div>

            <ReceiptText className="h-5 w-5 text-amber-400" />
          </div>
        </div>
      </section>

      {/* Main content */}
      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.35fr_0.65fr]">

        {/* Current project */}
        <div className="glass rounded-3xl border border-ink-800/50 p-6 md:p-7">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-ink-500">
                Your workspace
              </p>

              <h2 className="mt-2 text-xl font-semibold text-white">
                Current project
              </h2>
            </div>

            <Link
              to="/portal/projects"
              className="inline-flex items-center gap-2 text-sm font-medium text-accent-400 hover:text-accent-300"
            >
              View all
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {currentProject ? (
            <div className="mt-6 rounded-2xl border border-ink-800/50 bg-white/[0.04] p-5">
              <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">

                <div className="min-w-0">
                  <div
                    className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] ${getStatusStyle(
                      currentProject.status
                    )}`}
                  >
                    {formatStatus(currentProject.status)}
                  </div>

                  <h3 className="mt-4 text-2xl font-semibold text-white">
                    {currentProject.title}
                  </h3>

                  <p className="mt-2 max-w-xl text-sm leading-6 text-gray-400">
                    {currentProject.description ||
                      'Your project details will appear here as they become available.'}
                  </p>
                </div>

                <div className="shrink-0 md:text-right">
                  <p className="text-xs uppercase tracking-[0.2em] text-ink-500">
                    Project value
                  </p>

                  <p className="mt-2 text-lg font-medium text-white">
                    {formatCurrency(currentProject.price)}
                  </p>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-ink-800/50 bg-black/10 p-4">
                  <p className="text-xs uppercase tracking-[0.15em] text-ink-500">
                    Started
                  </p>

                  <p className="mt-2 text-sm text-gray-200">
                    {new Date(
                      currentProject.created_at
                    ).toLocaleDateString()}
                  </p>
                </div>

                <div className="rounded-xl border border-ink-800/50 bg-black/10 p-4">
                  <p className="text-xs uppercase tracking-[0.15em] text-ink-500">
                    Status
                  </p>

                  <p className="mt-2 text-sm text-gray-200">
                    {formatStatus(currentProject.status)}
                  </p>
                </div>
              </div>

              <Link
                to={`/portal/projects/${currentProject.id}`}
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-accent-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-accent-500"
              >
                Open project
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          ) : (
            <div className="mt-6 rounded-2xl border border-dashed border-ink-700/70 bg-white/[0.03] p-8 text-center">
              <FolderKanban className="mx-auto h-10 w-10 text-ink-600" />

              <h3 className="mt-4 text-lg font-medium text-white">
                Your project workspace is ready
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-400">
                Once Avelixa assigns a project to your account,
                you will be able to track its progress, documents
                and billing here.
              </p>
            </div>
          )}
        </div>

        {/* Quick actions */}
        <div className="glass rounded-3xl border border-ink-800/50 p-6 md:p-7">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-ink-500">
            Shortcuts
          </p>

          <h2 className="mt-2 text-xl font-semibold text-white">
            Quick actions
          </h2>

          <div className="mt-6 space-y-3">

            <Link
              to="/portal/projects"
              className="flex items-center justify-between rounded-2xl border border-ink-800/50 bg-white/[0.04] p-4 transition hover:bg-white/[0.08]"
            >
              <span className="flex items-center gap-3 text-sm text-gray-200">
                <FolderKanban className="h-4 w-4 text-accent-400" />
                View projects
              </span>

              <ArrowRight className="h-4 w-4 text-gray-500" />
            </Link>

            <Link
              to="/portal/documents"
              className="flex items-center justify-between rounded-2xl border border-ink-800/50 bg-white/[0.04] p-4 transition hover:bg-white/[0.08]"
            >
              <span className="flex items-center gap-3 text-sm text-gray-200">
                <UploadCloud className="h-4 w-4 text-accent-400" />
                Upload documents
              </span>

              <ArrowRight className="h-4 w-4 text-gray-500" />
            </Link>

            <Link
              to="/portal/invoices"
              className="flex items-center justify-between rounded-2xl border border-ink-800/50 bg-white/[0.04] p-4 transition hover:bg-white/[0.08]"
            >
              <span className="flex items-center gap-3 text-sm text-gray-200">
                <ReceiptText className="h-4 w-4 text-amber-400" />
                View invoices
              </span>

              <ArrowRight className="h-4 w-4 text-gray-500" />
            </Link>

            <Link
              to="/portal/settings"
              className="flex items-center justify-between rounded-2xl border border-ink-800/50 bg-white/[0.04] p-4 transition hover:bg-white/[0.08]"
            >
              <span className="flex items-center gap-3 text-sm text-gray-200">
                <Settings className="h-4 w-4 text-accent-400" />
                Account settings
              </span>

              <ArrowRight className="h-4 w-4 text-gray-500" />
            </Link>

          </div>
        </div>
      </section>

      {/* Billing */}
      <section className="glass rounded-3xl border border-ink-800/50 p-6 md:p-7">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-ink-500">
              Financial overview
            </p>

            <h2 className="mt-2 text-xl font-semibold text-white">
              Billing & payments
            </h2>

            <p className="mt-1 text-sm text-gray-400">
              Keep track of invoices and payments related to your projects.
            </p>
          </div>

          <Link
            to="/portal/invoices"
            className="inline-flex items-center gap-2 text-sm font-medium text-accent-400 hover:text-accent-300"
          >
            Manage invoices
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-ink-800/50 bg-white/[0.04] p-5">
            <p className="text-xs uppercase tracking-[0.15em] text-ink-500">
              Total invoiced
            </p>

            <p className="mt-3 text-2xl font-light text-white">
              {formatCurrency(totalInvoiced)}
            </p>
          </div>

          <div className="rounded-2xl border border-ink-800/50 bg-white/[0.04] p-5">
            <p className="text-xs uppercase tracking-[0.15em] text-ink-500">
              Outstanding
            </p>

            <p className="mt-3 text-2xl font-light text-white">
              {formatCurrency(outstandingAmount)}
            </p>
          </div>

          <div className="rounded-2xl border border-ink-800/50 bg-white/[0.04] p-5">
            <p className="text-xs uppercase tracking-[0.15em] text-ink-500">
              Invoice count
            </p>

            <p className="mt-3 text-2xl font-light text-white">
              {totalInvoices}
            </p>
          </div>
        </div>

        {outstandingInvoices.length > 0 ? (
          <div className="mt-5 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5">
            <div className="flex items-start gap-3">
              <ReceiptText className="mt-0.5 h-5 w-5 text-amber-400" />

              <div>
                <h3 className="font-medium text-white">
                  Payment requires your attention
                </h3>

                <p className="mt-1 text-sm text-gray-400">
                  You currently have {outstandingInvoices.length}{' '}
                  outstanding invoice
                  {outstandingInvoices.length === 1 ? '' : 's'}.
                </p>

                <Link
                  to="/portal/invoices"
                  className="mt-4 inline-flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm font-medium text-amber-300 hover:bg-amber-500/20"
                >
                  Review invoices
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-5 flex items-center gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5">
            <CheckCircle2 className="h-5 w-5 text-emerald-400" />

            <div>
              <p className="font-medium text-white">
                No outstanding invoices
              </p>

              <p className="mt-1 text-sm text-gray-400">
                Your account currently has no unpaid invoices.
              </p>
            </div>
          </div>
        )}
      </section>

      {/* Activity + documents */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">

        {/* Activity */}
        <div className="glass rounded-3xl border border-ink-800/50 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-ink-500">
                Timeline
              </p>

              <h2 className="mt-2 text-xl font-semibold text-white">
                Recent activity
              </h2>
            </div>
          </div>

          {recentActivity.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-dashed border-ink-700/70 bg-white/[0.03] p-7 text-center">
              <FileText className="mx-auto h-8 w-8 text-ink-600" />

              <p className="mt-3 text-sm text-gray-400">
                Your project updates will appear here.
              </p>
            </div>
          ) : (
            <div className="mt-6 space-y-3">
              {recentActivity.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-ink-800/50 bg-white/[0.04] p-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 rounded-lg bg-accent-500/10 p-2">
                      {item.type === 'project' ? (
                        <FolderKanban className="h-4 w-4 text-accent-400" />
                      ) : (
                        <ReceiptText className="h-4 w-4 text-amber-400" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-white">
                        {item.title}
                      </p>

                      <p className="mt-1 text-sm text-gray-400">
                        {item.description}
                      </p>

                      <p className="mt-2 text-xs text-gray-600">
                        {new Date(item.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Documents */}
        <div className="glass rounded-3xl border border-ink-800/50 p-6">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-ink-500">
            Project resources
          </p>

          <h2 className="mt-2 text-xl font-semibold text-white">
            Documents
          </h2>

          <p className="mt-1 text-sm text-gray-400">
            Upload logos, photos, content and other materials needed
            for your project.
          </p>

          <div className="mt-6 rounded-2xl border border-dashed border-accent-500/20 bg-accent-500/5 p-6">
            <UploadCloud className="h-8 w-8 text-accent-400" />

            <h3 className="mt-4 font-medium text-white">
              Share project files
            </h3>

            <p className="mt-2 text-sm leading-6 text-gray-400">
              Keep all the materials for your Avelixa project in one
              secure place.
            </p>

            <Link
              to="/portal/documents"
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-accent-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-accent-500"
            >
              Manage documents
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}