import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../lib/auth';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock3,
  CreditCard,
  FileText,
  FolderKanban,
  Loader2,
  ReceiptText,
  Upload,
  WalletCards,
} from 'lucide-react';

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

const activeStatuses = [
  'pending',
  'in_progress',
  'review',
  'on_hold',
  'maintenance',
];

function getDisplayName(
  profile: Profile | null,
  fallbackEmail?: string | null,
) {
  if (profile?.full_name) return profile.full_name;
  if (fallbackEmail) return fallbackEmail.split('@')[0];
  return 'Client';
}

function formatStatus(status: string | null | undefined) {
  if (!status) return 'Pending';

  return status
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatCurrency(amount: number | null | undefined) {
  if (typeof amount !== 'number') return 'KSh —';

  return `KSh ${amount.toLocaleString()}`;
}

function getProjectProgress(status: string | null | undefined) {
  switch (status) {
    case 'pending':
      return 10;
    case 'in_progress':
      return 50;
    case 'review':
      return 80;
    case 'completed':
      return 100;
    case 'maintenance':
      return 100;
    case 'on_hold':
      return 35;
    default:
      return 10;
  }
}

function getProjectStage(status: string | null | undefined) {
  switch (status) {
    case 'pending':
      return 'Project awaiting kickoff';
    case 'in_progress':
      return 'Website development in progress';
    case 'review':
      return 'Website ready for your review';
    case 'completed':
      return 'Website project completed';
    case 'maintenance':
      return 'Website maintenance';
    case 'on_hold':
      return 'Project temporarily on hold';
    default:
      return 'Project awaiting kickoff';
  }
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
        const [
          profileResult,
          projectsResult,
          invoicesResult,
        ] = await Promise.all([
          supabase
            .from('profiles')
            .select('full_name, email')
            .eq('id', userId)
            .maybeSingle(),

          supabase
            .from('projects')
            .select(
              'id, title, description, status, created_at, price',
            )
            .eq('client_id', userId)
            .order('created_at', { ascending: false }),

          supabase
            .from('invoices')
            .select(
              'id, amount, status, created_at, due_date',
            )
            .eq('client_id', userId)
            .order('created_at', { ascending: false }),
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

        setError(
          'We could not load your dashboard right now. Please try again shortly.',
        );
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

  const activeProjects = projects.filter(
    (project) =>
      project.status &&
      activeStatuses.includes(project.status),
  ).length;

  const completedProjects = projects.filter(
    (project) => project.status === 'completed',
  ).length;

  const totalInvoices = invoices.length;

  const featuredProject =
    projects.find(
      (project) =>
        project.status &&
        activeStatuses.includes(project.status),
    ) ||
    projects[0] ||
    null;

  const latestInvoice = invoices[0] || null;

  const depositInvoice =
    invoices.find((invoice) => {
      const status = invoice.status?.toLowerCase();

      return (
        status === 'pending' ||
        status === 'unpaid' ||
        status === 'due' ||
        status === 'overdue'
      );
    }) || null;

  const progress = featuredProject
    ? getProjectProgress(featuredProject.status)
    : 0;

  const projectStage = featuredProject
    ? getProjectStage(featuredProject.status)
    : 'Your project has not started yet';

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="glass rounded-2xl p-8 border border-ink-800/50">
          <div className="flex items-center gap-3 text-white">
            <Loader2 className="w-5 h-5 animate-spin text-accent-500" />
            <span>Loading your dashboard...</span>
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
            <h2 className="text-lg font-medium text-white">
              We could not load your dashboard
            </h2>

            <p className="text-sm text-gray-400 mt-2">
              {error}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">

      {/* Welcome */}
      <section className="glass rounded-2xl p-6 md:p-8 border border-ink-800/50">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-accent-400">
              Client portal
            </p>

            <h1 className="mt-3 text-3xl md:text-4xl font-semibold text-white">
              Welcome back, {getDisplayName(profile, user?.email)}
            </h1>

            <p className="mt-3 max-w-2xl text-sm md:text-base text-gray-400">
              Manage your Avelixa website project, payments,
              documents, and project updates from one place.
            </p>
          </div>

          <div className="rounded-xl border border-ink-800/50 bg-white/5 px-4 py-3 text-sm text-gray-300">
            {user?.email || 'Client account'}
          </div>
        </div>
      </section>

      {/* Payment alert */}
      {depositInvoice && (
        <section className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 md:p-6">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-4">
              <div className="rounded-xl bg-amber-500/15 p-3 text-amber-400">
                <WalletCards className="w-6 h-6" />
              </div>

              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-400">
                  Action required
                </p>

                <h2 className="mt-1 text-lg font-semibold text-white">
                  Your project deposit is awaiting payment
                </h2>

                <p className="mt-1 text-sm text-gray-400">
                  Your project can move forward once the required
                  payment has been completed.
                </p>
              </div>
            </div>

            <Link
              to="/portal/invoices"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-5 py-3 text-sm font-semibold text-black hover:bg-amber-400 transition-colors"
            >
              View payment
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </section>
      )}

      {/* Statistics */}
      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="glass rounded-2xl p-5 border border-ink-800/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-ink-500">
                Total projects
              </p>

              <p className="mt-3 text-3xl font-light text-white">
                {totalProjects}
              </p>
            </div>

            <FolderKanban className="w-5 h-5 text-accent-400" />
          </div>
        </div>

        <div className="glass rounded-2xl p-5 border border-ink-800/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-ink-500">
                Active projects
              </p>

              <p className="mt-3 text-3xl font-light text-white">
                {activeProjects}
              </p>
            </div>

            <Clock3 className="w-5 h-5 text-accent-400" />
          </div>
        </div>

        <div className="glass rounded-2xl p-5 border border-ink-800/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-ink-500">
                Completed
              </p>

              <p className="mt-3 text-3xl font-light text-white">
                {completedProjects}
              </p>
            </div>

            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          </div>
        </div>

        <div className="glass rounded-2xl p-5 border border-ink-800/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-ink-500">
                Invoices
              </p>

              <p className="mt-3 text-3xl font-light text-white">
                {totalInvoices}
              </p>
            </div>

            <ReceiptText className="w-5 h-5 text-amber-400" />
          </div>
        </div>
      </section>

      {/* Current project */}
      <section className="glass rounded-2xl p-6 md:p-7 border border-ink-800/50">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent-400">
              Your project
            </p>

            <h2 className="mt-2 text-xl font-semibold text-white">
              {featuredProject
                ? featuredProject.title
                : 'No project assigned yet'}
            </h2>
          </div>

          {featuredProject && (
            <span className="inline-flex w-fit rounded-full border border-accent-500/20 bg-accent-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.15em] text-accent-400">
              {formatStatus(featuredProject.status)}
            </span>
          )}
        </div>

        {featuredProject ? (
          <div className="mt-6">

            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">
                {projectStage}
              </span>

              <span className="font-semibold text-white">
                {progress}%
              </span>
            </div>

            <div className="mt-3 h-3 overflow-hidden rounded-full bg-ink-800">
              <div
                className="h-full rounded-full bg-accent-500 transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-3">

              <div className="rounded-xl border border-ink-800/50 bg-white/5 p-4">
                <p className="text-xs text-gray-500">
                  Project started
                </p>

                <p className="mt-1 text-sm text-white">
                  {new Date(
                    featuredProject.created_at,
                  ).toLocaleDateString()}
                </p>
              </div>

              <div className="rounded-xl border border-ink-800/50 bg-white/5 p-4">
                <p className="text-xs text-gray-500">
                  Project budget
                </p>

                <p className="mt-1 text-sm text-white">
                  {formatCurrency(featuredProject.price)}
                </p>
              </div>

              <div className="rounded-xl border border-ink-800/50 bg-white/5 p-4">
                <p className="text-xs text-gray-500">
                  Current status
                </p>

                <p className="mt-1 text-sm text-white">
                  {formatStatus(featuredProject.status)}
                </p>
              </div>

            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                to={`/portal/projects/${featuredProject.id}`}
                className="inline-flex items-center gap-2 rounded-xl bg-accent-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-accent-500 transition-colors"
              >
                Open project
                <ArrowRight className="w-4 h-4" />
              </Link>

              <Link
                to="/portal/documents"
                className="inline-flex items-center gap-2 rounded-xl border border-ink-700 bg-white/5 px-4 py-2.5 text-sm font-medium text-gray-200 hover:bg-white/10 transition-colors"
              >
                <Upload className="w-4 h-4" />
                Upload materials
              </Link>
            </div>
          </div>
        ) : (
          <div className="mt-6 rounded-2xl border border-dashed border-ink-700 bg-white/[0.03] p-8 text-center">
            <FolderKanban className="mx-auto h-8 w-8 text-gray-600" />

            <p className="mt-3 text-sm text-gray-400">
              Your project will appear here once Avelixa
              creates and assigns it to your account.
            </p>
          </div>
        )}
      </section>

      {/* Client action center */}
      <section>
        <div className="mb-4">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent-400">
            Client action center
          </p>

          <h2 className="mt-1 text-xl font-semibold text-white">
            What do you need to do?
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

          <Link
            to="/portal/invoices"
            className="glass rounded-2xl p-5 border border-ink-800/50 hover:bg-white/[0.06] transition-colors"
          >
            <CreditCard className="w-6 h-6 text-amber-400" />

            <h3 className="mt-4 font-medium text-white">
              Payments
            </h3>

            <p className="mt-2 text-sm text-gray-400">
              View invoices, deposits, balances and payment
              status.
            </p>

            <div className="mt-4 flex items-center gap-2 text-sm text-accent-400">
              Open payments
              <ArrowRight className="w-4 h-4" />
            </div>
          </Link>

          <Link
            to="/portal/documents"
            className="glass rounded-2xl p-5 border border-ink-800/50 hover:bg-white/[0.06] transition-colors"
          >
            <Upload className="w-6 h-6 text-accent-400" />

            <h3 className="mt-4 font-medium text-white">
              Send materials
            </h3>

            <p className="mt-2 text-sm text-gray-400">
              Upload your logo, photos, text, documents and
              other website materials.
            </p>

            <div className="mt-4 flex items-center gap-2 text-sm text-accent-400">
              Upload files
              <ArrowRight className="w-4 h-4" />
            </div>
          </Link>

          <Link
            to="/portal/projects"
            className="glass rounded-2xl p-5 border border-ink-800/50 hover:bg-white/[0.06] transition-colors"
          >
            <FolderKanban className="w-6 h-6 text-accent-400" />

            <h3 className="mt-4 font-medium text-white">
              Track project
            </h3>

            <p className="mt-2 text-sm text-gray-400">
              Follow your website development progress and
              project milestones.
            </p>

            <div className="mt-4 flex items-center gap-2 text-sm text-accent-400">
              View project
              <ArrowRight className="w-4 h-4" />
            </div>
          </Link>

        </div>
      </section>

      {/* Invoice summary */}
      <section className="glass rounded-2xl p-6 border border-ink-800/50">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-400">
              Billing
            </p>

            <h2 className="mt-1 text-xl font-semibold text-white">
              Payment summary
            </h2>
          </div>

          <Link
            to="/portal/invoices"
            className="inline-flex items-center gap-2 text-sm text-accent-400 hover:text-accent-300"
          >
            View all invoices
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {latestInvoice ? (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">

            <div className="rounded-xl border border-ink-800/50 bg-white/5 p-4">
              <p className="text-xs text-gray-500">
                Latest invoice
              </p>

              <p className="mt-2 text-sm font-medium text-white">
                {latestInvoice.id.slice(0, 8)}
              </p>
            </div>

            <div className="rounded-xl border border-ink-800/50 bg-white/5 p-4">
              <p className="text-xs text-gray-500">
                Amount
              </p>

              <p className="mt-2 text-sm font-medium text-white">
                {formatCurrency(latestInvoice.amount)}
              </p>
            </div>

            <div className="rounded-xl border border-ink-800/50 bg-white/5 p-4">
              <p className="text-xs text-gray-500">
                Status
              </p>

              <p className="mt-2 text-sm font-medium text-white">
                {formatStatus(latestInvoice.status)}
              </p>
            </div>

          </div>
        ) : (
          <div className="mt-6 rounded-xl border border-dashed border-ink-700 bg-white/[0.03] p-7 text-center">
            <ReceiptText className="mx-auto h-7 w-7 text-gray-600" />

            <p className="mt-3 text-sm text-gray-400">
              No invoices have been created for your account yet.
            </p>
          </div>
        )}
      </section>

      {/* Help / next steps */}
      <section className="rounded-2xl border border-accent-500/20 bg-accent-500/5 p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-4">
            <FileText className="mt-1 h-6 w-6 text-accent-400" />

            <div>
              <h2 className="font-semibold text-white">
                Need help with your project?
              </h2>

              <p className="mt-1 text-sm text-gray-400">
                Keep your project moving by completing any
                outstanding payments or sending the materials
                requested by the Avelixa team.
              </p>
            </div>
          </div>

          <Link
            to="/contact"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-ink-700 bg-white/5 px-4 py-2.5 text-sm font-medium text-white hover:bg-white/10 transition-colors"
          >
            Contact Avelixa
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

    </div>
  );
}