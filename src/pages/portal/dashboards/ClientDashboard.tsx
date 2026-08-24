import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  FileText,
  FolderKanban,
  Loader2,
  ReceiptText,
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
  project_id?: string | null;
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

const progressStages = [
  { key: 'pending', label: 'Project started' },
  { key: 'in_progress', label: 'Development' },
  { key: 'review', label: 'Website review' },
  { key: 'completed', label: 'Completed' },
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

  if (status === 'review') {
    return 'border-amber-500/20 bg-amber-500/10 text-amber-400';
  }

  if (status === 'in_progress') {
    return 'border-accent-500/20 bg-accent-500/10 text-accent-400';
  }

  if (status === 'on_hold') {
    return 'border-red-500/20 bg-red-500/10 text-red-400';
  }

  return 'border-accent-500/20 bg-accent-500/10 text-accent-400';
}

function getProgressIndex(status: string | null | undefined) {
  if (status === 'completed') return 3;
  if (status === 'review') return 2;
  if (status === 'in_progress') return 1;
  return 0;
}

function getNextAction(
  project: Project | null,
  hasOutstandingInvoices: boolean
) {
  if (!project) {
    return {
      title: 'Your project is getting ready',
      description:
        'Your project workspace will become available once a project is assigned to your account.',
      label: 'View projects',
      href: '/portal/projects',
    };
  }

  if (hasOutstandingInvoices) {
    return {
      title: 'Payment requires your attention',
      description:
        'You have an outstanding invoice associated with your Avelixa account.',
      label: 'Review invoices',
      href: '/portal/invoices',
    };
  }

  if (project.status === 'pending') {
    return {
      title: 'Your project is ready to begin',
      description:
        'Avelixa has created your project workspace. Keep your business materials ready for the next stage.',
      label: 'Open project',
      href: `/portal/projects/${project.id}`,
    };
  }

  if (project.status === 'review') {
    return {
      title: 'Your website is ready for review',
      description:
        'Your project has reached the review stage. Open the project workspace to see the latest information and communicate with Avelixa.',
      label: 'Review project',
      href: `/portal/projects/${project.id}`,
    };
  }

  if (project.status === 'completed') {
    return {
      title: 'Your project is complete',
      description:
        'Your Avelixa project has been marked as completed. You can continue accessing your project resources from the portal.',
      label: 'View project',
      href: `/portal/projects/${project.id}`,
    };
  }

  if (project.status === 'on_hold') {
    return {
      title: 'Your project is currently on hold',
      description:
        'Avelixa has temporarily paused this project. Open the project workspace for the latest information.',
      label: 'View project',
      href: `/portal/projects/${project.id}`,
    };
  }

  return {
    title: 'Your website is in development',
    description:
      'Avelixa is currently working on your project. You can upload materials, monitor progress and stay up to date from your portal.',
    label: 'Open project',
    href: `/portal/projects/${project.id}`,
  };
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
                'id, amount, status, created_at, due_date, project_id'
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

  const paidAmount = invoices
    .filter(
      (invoice) =>
        invoice.status?.toLowerCase() === 'paid' ||
        invoice.status?.toLowerCase() === 'completed'
    )
    .reduce(
      (total, invoice) =>
        total + (typeof invoice.amount === 'number' ? invoice.amount : 0),
      0
    );

  const outstandingInvoices = invoices.filter(
    (invoice) =>
      invoice.status?.toLowerCase() !== 'paid' &&
      invoice.status?.toLowerCase() !== 'completed'
  );

  const outstandingAmount = outstandingInvoices.reduce(
    (total, invoice) =>
      total + (typeof invoice.amount === 'number' ? invoice.amount : 0),
    0
  );

  const progressIndex = getProgressIndex(currentProject?.status);

  const progressPercentage =
    progressIndex === 0
      ? 10
      : progressIndex === 1
        ? 40
        : progressIndex === 2
          ? 75
          : 100;

  const nextAction = getNextAction(
    currentProject,
    outstandingInvoices.length > 0
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
      <section className="relative overflow-hidden rounded-3xl border border-ink-800/50 bg-gradient-to-br from-accent-600/20 via-white/[0.04] to-transparent p-6 md:p-8">
        <div className="absolute -right-10 -top-10 h-56 w-56 rounded-full bg-accent-500/10 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-32 w-32 rounded-full bg-accent-500/5 blur-3xl" />

        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full border border-accent-500/20 bg-accent-500/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.25em] text-accent-400">
            <Sparkles className="h-3.5 w-3.5" />
            Avelixa Client Portal
          </div>

          <h1 className="mt-5 text-3xl font-semibold tracking-tight text-white md:text-4xl">
            Welcome back, {displayName}
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-400">
            Everything you need to follow your website project,
            share materials and stay connected with Avelixa.
          </p>
        </div>
      </section>

      {/* Next action */}
      <section className="overflow-hidden rounded-3xl border border-accent-500/20 bg-accent-500/5 p-6 md:p-7">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl bg-accent-500/10 p-3">
              <Clock3 className="h-6 w-6 text-accent-400" />
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent-400">
                Your next step
              </p>

              <h2 className="mt-2 text-xl font-semibold text-white">
                {nextAction.title}
              </h2>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-400">
                {nextAction.description}
              </p>
            </div>
          </div>

          <Link
            to={nextAction.href}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-accent-600 px-5 py-3 text-sm font-medium text-white transition hover:bg-accent-500"
          >
            {nextAction.label}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Overview statistics */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="glass rounded-2xl border border-ink-800/50 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-ink-500">
                Current project
              </p>

              <p className="mt-3 text-lg font-medium text-white">
                {currentProject ? currentProject.title : 'None yet'}
              </p>
            </div>

            <FolderKanban className="h-5 w-5 text-accent-400" />
          </div>
        </div>

        <div className="glass rounded-2xl border border-ink-800/50 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-ink-500">
                Project status
              </p>

              <p className="mt-3 text-lg font-medium text-white">
                {formatStatus(currentProject?.status)}
              </p>
            </div>

            <CircleDollarSign className="h-5 w-5 text-accent-400" />
          </div>
        </div>

        <div className="glass rounded-2xl border border-ink-800/50 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-ink-500">
                Paid
              </p>

              <p className="mt-3 text-lg font-medium text-white">
                {formatCurrency(paidAmount)}
              </p>
            </div>

            <CheckCircle2 className="h-5 w-5 text-emerald-400" />
          </div>
        </div>

        <div className="glass rounded-2xl border border-ink-800/50 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-ink-500">
                Outstanding
              </p>

              <p className="mt-3 text-lg font-medium text-white">
                {formatCurrency(outstandingAmount)}
              </p>
            </div>

            <ReceiptText className="h-5 w-5 text-amber-400" />
          </div>
        </div>
      </section>

      {/* Project + progress */}
      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.4fr_0.6fr]">

        {/* Current project */}
        <div className="glass rounded-3xl border border-ink-800/50 p-6 md:p-7">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-ink-500">
                Your website project
              </p>

              <h2 className="mt-2 text-xl font-semibold text-white">
                {currentProject?.title || 'Your project'}
              </h2>
            </div>

            <Link
              to="/portal/projects"
              className="inline-flex items-center gap-2 text-sm font-medium text-accent-400 hover:text-accent-300"
            >
              All projects
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {currentProject ? (
            <div className="mt-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <div
                    className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] ${getStatusStyle(
                      currentProject.status
                    )}`}
                  >
                    {formatStatus(currentProject.status)}
                  </div>

                  <p className="mt-4 max-w-xl text-sm leading-6 text-gray-400">
                    {currentProject.description ||
                      'Your project details and updates will appear here as Avelixa works with you.'}
                  </p>
                </div>

                <div className="shrink-0 md:text-right">
                  <p className="text-xs uppercase tracking-[0.2em] text-ink-500">
                    Project value
                  </p>

                  <p className="mt-2 text-xl font-medium text-white">
                    {formatCurrency(currentProject.price)}
                  </p>
                </div>
              </div>

              {/* Progress */}
              <div className="mt-8">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-white">
                    Project progress
                  </p>

                  <p className="text-sm text-accent-400">
                    {progressPercentage}%
                  </p>
                </div>

                <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-accent-500 transition-all"
                    style={{ width: `${progressPercentage}%` }}
                  />
                </div>

                <div className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-4">
                  {progressStages.map((stage, index) => {
                    const isComplete = index <= progressIndex;
                    const isCurrent = index === progressIndex;

                    return (
                      <div key={stage.key}>
                        <div className="flex items-center gap-2">
                          <div
                            className={`h-2.5 w-2.5 rounded-full ${
                              isComplete
                                ? 'bg-accent-500'
                                : 'bg-white/10'
                            }`}
                          />

                          <span
                            className={`text-xs ${
                              isCurrent
                                ? 'font-medium text-white'
                                : isComplete
                                  ? 'text-gray-300'
                                  : 'text-gray-600'
                            }`}
                          >
                            {stage.label}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="mt-7 flex flex-wrap gap-3">
                <Link
                  to={`/portal/projects/${currentProject.id}`}
                  className="inline-flex items-center gap-2 rounded-xl bg-accent-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-accent-500"
                >
                  Open project
                  <ArrowRight className="h-4 w-4" />
                </Link>

                <Link
                  to="/portal/documents"
                  className="inline-flex items-center gap-2 rounded-xl border border-ink-800/60 bg-white/[0.04] px-5 py-2.5 text-sm font-medium text-gray-200 transition hover:bg-white/[0.08]"
                >
                  <UploadCloud className="h-4 w-4 text-accent-400" />
                  Upload materials
                </Link>
              </div>
            </div>
          ) : (
            <div className="mt-6 rounded-2xl border border-dashed border-ink-700/70 bg-white/[0.03] p-8 text-center">
              <FolderKanban className="mx-auto h-10 w-10 text-ink-600" />

              <h3 className="mt-4 text-lg font-medium text-white">
                Your project workspace is ready
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-400">
                Once a project is assigned to your account, you
                will be able to track its progress and resources here.
              </p>
            </div>
          )}
        </div>

        {/* Quick access */}
        <div className="glass rounded-3xl border border-ink-800/50 p-6 md:p-7">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-ink-500">
            Client resources
          </p>

          <h2 className="mt-2 text-xl font-semibold text-white">
            Quick access
          </h2>

          <div className="mt-6 space-y-3">
            <Link
              to="/portal/projects"
              className="flex items-center justify-between rounded-2xl border border-ink-800/50 bg-white/[0.04] p-4 transition hover:bg-white/[0.08]"
            >
              <span className="flex items-center gap-3 text-sm text-gray-200">
                <FolderKanban className="h-4 w-4 text-accent-400" />
                My projects
              </span>

              <ArrowRight className="h-4 w-4 text-gray-500" />
            </Link>

            <Link
              to="/portal/documents"
              className="flex items-center justify-between rounded-2xl border border-ink-800/50 bg-white/[0.04] p-4 transition hover:bg-white/[0.08]"
            >
              <span className="flex items-center gap-3 text-sm text-gray-200">
                <UploadCloud className="h-4 w-4 text-accent-400" />
                Project documents
              </span>

              <ArrowRight className="h-4 w-4 text-gray-500" />
            </Link>

            <Link
              to="/portal/invoices"
              className="flex items-center justify-between rounded-2xl border border-ink-800/50 bg-white/[0.04] p-4 transition hover:bg-white/[0.08]"
            >
              <span className="flex items-center gap-3 text-sm text-gray-200">
                <ReceiptText className="h-4 w-4 text-amber-400" />
                Invoices & payments
              </span>

              <ArrowRight className="h-4 w-4 text-gray-500" />
            </Link>
          </div>

          <div className="mt-6 rounded-2xl border border-ink-800/50 bg-white/[0.03] p-4">
            <p className="text-xs uppercase tracking-[0.15em] text-ink-500">
              Workspace overview
            </p>

            <div className="mt-4 grid grid-cols-2 gap-4">
              <div>
                <p className="text-2xl font-light text-white">
                  {totalProjects}
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  Total projects
                </p>
              </div>

              <div>
                <p className="text-2xl font-light text-white">
                  {completedProjects}
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  Completed
                </p>
              </div>

              <div>
                <p className="text-2xl font-light text-white">
                  {activeProjects}
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  Active
                </p>
              </div>

              <div>
                <p className="text-2xl font-light text-white">
                  {invoices.length}
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  Invoices
                </p>
              </div>
            </div>
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
              Payments & invoices
            </h2>

            <p className="mt-1 text-sm text-gray-400">
              Keep track of the amounts invoiced and payments recorded on your account.
            </p>
          </div>

          <Link
            to="/portal/invoices"
            className="inline-flex items-center gap-2 text-sm font-medium text-accent-400 hover:text-accent-300"
          >
            View all invoices
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
              Paid
            </p>

            <p className="mt-3 text-2xl font-light text-white">
              {formatCurrency(paidAmount)}
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
        </div>

        {outstandingInvoices.length > 0 ? (
          <div className="mt-5 flex flex-col gap-4 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <ReceiptText className="mt-0.5 h-5 w-5 text-amber-400" />

              <div>
                <h3 className="font-medium text-white">
                  Payment requires your attention
                </h3>

                <p className="mt-1 text-sm text-gray-400">
                  You have {outstandingInvoices.length} outstanding invoice
                  {outstandingInvoices.length === 1 ? '' : 's'}.
                </p>
              </div>
            </div>

            <Link
              to="/portal/invoices"
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-sm font-medium text-amber-300 hover:bg-amber-500/20"
            >
              Review payment
              <ArrowRight className="h-4 w-4" />
            </Link>
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

        {/* Recent activity */}
        <div className="glass rounded-3xl border border-ink-800/50 p-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-ink-500">
              Timeline
            </p>

            <h2 className="mt-2 text-xl font-semibold text-white">
              Recent activity
            </h2>
          </div>

          {recentActivity.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-dashed border-ink-700/70 bg-white/[0.03] p-7 text-center">
              <FileText className="mx-auto h-8 w-8 text-ink-600" />

              <p className="mt-3 text-sm text-gray-400">
                Your project updates and billing activity will appear here.
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
            Documents & materials
          </h2>

          <p className="mt-1 text-sm text-gray-400">
            Share your logo, photos, business information, content and
            other materials needed to build your website.
          </p>

          <div className="mt-6 rounded-2xl border border-dashed border-accent-500/20 bg-accent-500/5 p-6">
            <UploadCloud className="h-8 w-8 text-accent-400" />

            <h3 className="mt-4 font-medium text-white">
              Keep your project materials together
            </h3>

            <p className="mt-2 text-sm leading-6 text-gray-400">
              Upload and manage the files Avelixa needs for your project.
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