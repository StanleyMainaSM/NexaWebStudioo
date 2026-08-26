import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';
import {
  FolderKanban,
  CheckSquare,
  Clock3,
  CheckCircle2,
  CalendarDays,
  ArrowRight,
  Loader2,
  DollarSign,
  Target,
  MessageSquare,
  AlertCircle,
  TrendingUp,
  Timer,
} from 'lucide-react';

type Task = {
  id: string;
  title: string;
  description: string | null;
  status: string | null;
  due_date: string | null;
  project_id: string | null;
};

type Project = {
  id: string;
  title: string;
  description: string | null;
  status: string | null;
  created_at: string;
  operator_payment: number | null;
  progress: number | null;
  progress_note: string | null;
  deadline: string | null;
  priority: string | null;
};

function formatStatus(status: string | null | undefined) {
  if (!status) return 'Pending';

  return status
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatCurrency(value: number | null | undefined) {
  if (typeof value !== 'number') {
    return 'Not specified';
  }

  return `KSh ${value.toLocaleString()}`;
}

function getProgress(project: Project) {
  if (typeof project.progress === 'number') {
    return Math.min(100, Math.max(0, project.progress));
  }

  switch (project.status) {
    case 'completed':
      return 100;
    case 'review':
      return 90;
    case 'in_progress':
      return 50;
    case 'on_hold':
      return 25;
    default:
      return 0;
  }
}

function getStatusClasses(status: string | null | undefined) {
  switch (status) {
    case 'completed':
      return 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400';

    case 'review':
      return 'border-amber-500/20 bg-amber-500/10 text-amber-400';

    case 'in_progress':
      return 'border-accent-500/20 bg-accent-500/10 text-accent-400';

    case 'on_hold':
      return 'border-red-500/20 bg-red-500/10 text-red-400';

    case 'pending':
      return 'border-blue-500/20 bg-blue-500/10 text-blue-400';

    default:
      return 'border-ink-700/60 bg-white/5 text-gray-300';
  }
}

function getPriorityClasses(priority: string | null | undefined) {
  switch (priority) {
    case 'urgent':
      return 'border-red-500/20 bg-red-500/10 text-red-400';

    case 'high':
      return 'border-amber-500/20 bg-amber-500/10 text-amber-400';

    case 'medium':
      return 'border-yellow-500/20 bg-yellow-500/10 text-yellow-400';

    case 'low':
      return 'border-gray-500/20 bg-white/5 text-gray-400';

    default:
      return 'border-accent-500/20 bg-accent-500/10 text-accent-400';
  }
}

function formatPriority(priority: string | null | undefined) {
  if (!priority) return 'Normal';

  return priority.charAt(0).toUpperCase() + priority.slice(1);
}

function formatDate(date: string | null) {
  if (!date) return 'No deadline';

  return new Date(date).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function getDaysUntilDeadline(date: string | null) {
  if (!date) return null;

  const deadline = new Date(date);
  const today = new Date();

  deadline.setHours(23, 59, 59, 999);
  today.setHours(0, 0, 0, 0);

  const difference =
    deadline.getTime() - today.getTime();

  return Math.ceil(
    difference / (1000 * 60 * 60 * 24)
  );
}

function isCompletedStatus(status: string | null) {
  return (
    status === 'completed' ||
    status === 'complete' ||
    status === 'done'
  );
}

function isPendingTask(status: string | null) {
  return !isCompletedStatus(status);
}

export default function OperatorDashboard() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadDashboard() {
      setLoading(true);
      setError(null);

      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError) {
          throw authError;
        }

        if (!user) {
          throw new Error('No authenticated user found.');
        }

        const projectPromise = supabase
          .from('projects')
          .select(
            `
              id,
              title,
              description,
              status,
              created_at,
              operator_payment,
              progress,
              progress_note,
              deadline,
              priority
            `
          )
          .eq('operator_id', user.id)
          .order('created_at', {
            ascending: false,
          });

        const taskPromise = supabase
          .from('project_tasks')
          .select(
            `
              id,
              title,
              description,
              status,
              due_date,
              project_id
            `
          )
          .eq('assigned_to', user.id)
          .order('due_date', {
            ascending: true,
            nullsFirst: false,
          });

        const [
          { data: projectData, error: projectError },
          { data: taskData, error: taskError },
        ] = await Promise.all([
          projectPromise,
          taskPromise,
        ]);

        if (projectError) {
          throw projectError;
        }

        if (taskError) {
          console.warn(
            'Could not load operator tasks:',
            taskError
          );
        }

        if (cancelled) {
          return;
        }

        setProjects(
          (projectData || []) as Project[]
        );

        setTasks(
          (taskData || []) as Task[]
        );
      } catch (err) {
        console.error(
          'Operator dashboard error:',
          err
        );

        if (!cancelled) {
          setProjects([]);
          setTasks([]);

          setError(
            err instanceof Error
              ? err.message
              : 'Unable to load the operator dashboard.'
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadDashboard();

    return () => {
      cancelled = true;
    };
  }, []);

  const statistics = useMemo(() => {
    const active = projects.filter(
      (project) =>
        project.status === 'pending' ||
        project.status === 'in_progress' ||
        project.status === 'on_hold'
    ).length;

    const review = projects.filter(
      (project) =>
        project.status === 'review' ||
        project.status === 'pending_review'
    ).length;

    const completed = projects.filter(
      (project) =>
        project.status === 'completed'
    ).length;

    const totalPayments = projects.reduce(
      (total, project) =>
        total +
        (Number(project.operator_payment) || 0),
      0
    );

    const completedTasks = tasks.filter(
      (task) =>
        isCompletedStatus(task.status)
    );

    const pendingTasks = tasks.filter(
      (task) =>
        isPendingTask(task.status)
    );

    const averageProgress =
      projects.length > 0
        ? Math.round(
            projects.reduce(
              (total, project) =>
                total + getProgress(project),
              0
            ) / projects.length
          )
        : 0;

    return {
      total: projects.length,
      active,
      review,
      completed,
      totalPayments,
      completedTasks: completedTasks.length,
      pendingTasks: pendingTasks.length,
      averageProgress,
    };
  }, [projects, tasks]);

  const upcomingProjects = useMemo(() => {
    return projects
      .filter(
        (project) =>
          project.status !== 'completed' &&
          project.deadline
      )
      .sort((a, b) => {
        const first = new Date(
          a.deadline as string
        ).getTime();

        const second = new Date(
          b.deadline as string
        ).getTime();

        return first - second;
      })
      .slice(0, 3);
  }, [projects]);

  const recentProjects = useMemo(() => {
    return projects.slice(0, 5);
  }, [projects]);

  const pendingTasks = useMemo(() => {
    return tasks
      .filter(
        (task) =>
          !isCompletedStatus(task.status)
      )
      .slice(0, 5);
  }, [tasks]);

  const getProjectName = (
    projectId: string | null
  ) => {
    if (!projectId) {
      return 'No project';
    }

    const project = projects.find(
      (item) =>
        item.id === projectId
    );

    return (
      project?.title ||
      'Unknown project'
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="flex flex-col items-center text-center">
          <Loader2 className="w-8 h-8 animate-spin text-accent-500 mb-4" />

          <h2 className="text-lg font-medium text-white">
            Loading your operator workspace
          </h2>

          <p className="mt-2 text-sm text-gray-400">
            Preparing your assigned projects and work summary.
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="glass rounded-2xl border border-red-500/20 bg-red-500/5 p-10">
          <div className="flex flex-col items-center text-center">
            <AlertCircle className="w-10 h-10 text-red-400 mb-4" />

            <h2 className="text-lg font-medium text-white">
              Dashboard could not be loaded
            </h2>

            <p className="mt-3 max-w-xl text-sm text-gray-400">
              {error}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">

      {/* DASHBOARD HEADER */}
      <div>
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-accent-500">
          Operator Workspace
        </p>

        <h1 className="mt-2 text-3xl font-bold text-white">
          Your Dashboard
        </h1>

        <p className="mt-2 max-w-2xl text-sm text-gray-400">
          Manage your assigned projects, monitor your
          progress, complete your tasks, and keep Admin
          updated on your work.
        </p>
      </div>

      {/* MAIN STATISTICS */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">

        <div className="glass rounded-2xl border border-ink-800/50 p-5">
          <div className="rounded-xl bg-accent-500/10 p-3 w-fit">
            <FolderKanban className="h-5 w-5 text-accent-400" />
          </div>

          <div className="mt-5 text-3xl font-bold text-white">
            {statistics.total}
          </div>

          <p className="mt-1 text-sm text-gray-400">
            Assigned Projects
          </p>
        </div>

        <div className="glass rounded-2xl border border-ink-800/50 p-5">
          <div className="rounded-xl bg-blue-500/10 p-3 w-fit">
            <Clock3 className="h-5 w-5 text-blue-400" />
          </div>

          <div className="mt-5 text-3xl font-bold text-white">
            {statistics.active}
          </div>

          <p className="mt-1 text-sm text-gray-400">
            Active Projects
          </p>
        </div>

        <div className="glass rounded-2xl border border-ink-800/50 p-5">
          <div className="rounded-xl bg-amber-500/10 p-3 w-fit">
            <Target className="h-5 w-5 text-amber-400" />
          </div>

          <div className="mt-5 text-3xl font-bold text-white">
            {statistics.review}
          </div>

          <p className="mt-1 text-sm text-gray-400">
            Awaiting Review
          </p>
        </div>

        <div className="glass rounded-2xl border border-ink-800/50 p-5">
          <div className="rounded-xl bg-emerald-500/10 p-3 w-fit">
            <CheckCircle2 className="h-5 w-5 text-emerald-400" />
          </div>

          <div className="mt-5 text-3xl font-bold text-white">
            {statistics.completed}
          </div>

          <p className="mt-1 text-sm text-gray-400">
            Completed Projects
          </p>
        </div>

        <div className="glass rounded-2xl border border-ink-800/50 p-5">
          <div className="rounded-xl bg-emerald-500/10 p-3 w-fit">
            <DollarSign className="h-5 w-5 text-emerald-400" />
          </div>

          <div className="mt-5 text-2xl font-bold text-white">
            {formatCurrency(
              statistics.totalPayments
            )}
          </div>

          <p className="mt-1 text-sm text-gray-400">
            Total Assigned Payments
          </p>
        </div>
      </div>

      {/* PERFORMANCE SUMMARY */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

        <div className="glass rounded-2xl border border-ink-800/50 p-6">
          <div className="flex items-center gap-3">
            <TrendingUp className="w-5 h-5 text-accent-500" />

            <h2 className="font-semibold text-white">
              Average Progress
            </h2>
          </div>

          <div className="mt-6 flex items-end justify-between">
            <span className="text-4xl font-bold text-white">
              {statistics.averageProgress}%
            </span>

            <span className="text-xs uppercase tracking-widest text-gray-500">
              Across projects
            </span>
          </div>

          <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-accent-500 transition-all"
              style={{
                width: `${statistics.averageProgress}%`,
              }}
            />
          </div>
        </div>

        <div className="glass rounded-2xl border border-ink-800/50 p-6">
          <div className="flex items-center gap-3">
            <CheckSquare className="w-5 h-5 text-accent-500" />

            <h2 className="font-semibold text-white">
              Task Progress
            </h2>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-4">
            <div className="rounded-xl border border-amber-500/10 bg-amber-500/5 p-4">
              <div className="text-2xl font-bold text-white">
                {statistics.pendingTasks}
              </div>

              <div className="mt-1 text-xs text-gray-500">
                Pending
              </div>
            </div>

            <div className="rounded-xl border border-emerald-500/10 bg-emerald-500/5 p-4">
              <div className="text-2xl font-bold text-white">
                {statistics.completedTasks}
              </div>

              <div className="mt-1 text-xs text-gray-500">
                Completed
              </div>
            </div>
          </div>
        </div>

        <div className="glass rounded-2xl border border-ink-800/50 p-6">
          <div className="flex items-center gap-3">
            <MessageSquare className="w-5 h-5 text-accent-500" />

            <h2 className="font-semibold text-white">
              Admin Communication
            </h2>
          </div>

          <p className="mt-4 text-sm leading-6 text-gray-400">
            Keep Admin informed about project progress,
            questions, blockers, and review requests.
          </p>

          <Link
            to="/portal/activity"
            className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-accent-400 hover:text-accent-300"
          >
            Open Communication
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* UPCOMING DEADLINES */}
      <div className="glass rounded-2xl border border-ink-800/50 overflow-hidden">

        <div className="p-6 border-b border-white/10">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-xs font-bold text-accent-500 uppercase tracking-widest mb-2">
                Time-sensitive work
              </div>

              <h2 className="text-xl font-semibold text-white">
                Upcoming Deadlines
              </h2>

              <p className="text-sm text-gray-500 mt-1">
                Projects that need your attention soonest.
              </p>
            </div>

            <Timer className="w-5 h-5 text-gray-500" />
          </div>
        </div>

        {upcomingProjects.length === 0 ? (
          <div className="p-10 text-center">
            <CalendarDays className="w-10 h-10 text-gray-700 mx-auto mb-4" />

            <h3 className="text-white font-medium">
              No upcoming deadlines
            </h3>

            <p className="mt-2 text-sm text-gray-500">
              Your active projects do not currently have
              upcoming deadlines.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {upcomingProjects.map((project) => {
              const days =
                getDaysUntilDeadline(
                  project.deadline
                );

              const overdue =
                days !== null && days < 0;

              return (
                <div
                  key={project.id}
                  className="p-6 hover:bg-white/[0.02] transition-colors"
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-medium text-white">
                          {project.title}
                        </h3>

                        <span
                          className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
                            overdue
                              ? 'border-red-500/20 bg-red-500/10 text-red-400'
                              : 'border-amber-500/20 bg-amber-500/10 text-amber-400'
                          }`}
                        >
                          {overdue
                            ? 'Overdue'
                            : days === 0
                              ? 'Due Today'
                              : days === 1
                                ? 'Due Tomorrow'
                                : `${days} Days Left`}
                        </span>
                      </div>

                      <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-gray-500">
                        <span className="flex items-center gap-1.5">
                          <CalendarDays className="w-3.5 h-3.5" />
                          {formatDate(
                            project.deadline
                          )}
                        </span>

                        <span>
                          {getProgress(project)}% complete
                        </span>
                      </div>
                    </div>

                    <Link
                      to={`/portal/projects/${project.id}`}
                      className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-ink-800/50 bg-white/5 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/10"
                    >
                      Open Workspace
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* RECENT PROJECTS */}
      <div className="glass rounded-2xl border border-ink-800/50 overflow-hidden">

        <div className="p-6 border-b border-white/10">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-xs font-bold text-accent-500 uppercase tracking-widest mb-2">
                Assigned Work
              </div>

              <h2 className="text-xl font-semibold text-white">
                Recent Projects
              </h2>

              <p className="text-sm text-gray-500 mt-1">
                Your latest assigned projects.
              </p>
            </div>

            <FolderKanban className="w-5 h-5 text-gray-500" />
          </div>
        </div>

        {recentProjects.length === 0 ? (
          <div className="p-12 text-center">
            <FolderKanban className="w-12 h-12 text-gray-700 mx-auto mb-4" />

            <h3 className="text-white font-medium mb-2">
              No projects assigned yet
            </h3>

            <p className="text-sm text-gray-500 max-w-md mx-auto">
              Projects assigned to you will appear here once
              the owner or Admin assigns them to your operator
              account.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {recentProjects.map((project) => {
              const progress =
                getProgress(project);

              return (
                <div
                  key={project.id}
                  className="p-6 hover:bg-white/[0.02] transition-colors"
                >
                  <div className="flex flex-col gap-5">

                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-medium text-white">
                            {project.title}
                          </h3>

                          <span
                            className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.15em] ${getStatusClasses(
                              project.status
                            )}`}
                          >
                            {formatStatus(
                              project.status
                            )}
                          </span>
                        </div>

                        <p className="mt-2 text-sm text-gray-400 max-w-2xl">
                          {project.description ||
                            'No project description has been provided.'}
                        </p>
                      </div>

                      <Link
                        to={`/portal/projects/${project.id}`}
                        className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-accent-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-500"
                      >
                        Open Workspace
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">

                      <div className="rounded-xl border border-emerald-500/10 bg-emerald-500/5 p-4">
                        <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-gray-500">
                          <DollarSign className="w-4 h-4 text-emerald-400" />
                          Your Payment
                        </div>

                        <div className="mt-2 text-lg font-semibold text-white">
                          {formatCurrency(
                            project.operator_payment
                          )}
                        </div>
                      </div>

                      <div className="rounded-xl border border-ink-800/50 bg-white/[0.03] p-4">
                        <div className="flex items-center justify-between text-xs uppercase tracking-widest text-gray-500">
                          <span>Progress</span>

                          <span className="text-white">
                            {progress}%
                          </span>
                        </div>

                        <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/5">
                          <div
                            className="h-full rounded-full bg-accent-500 transition-all"
                            style={{
                              width: `${progress}%`,
                            }}
                          />
                        </div>
                      </div>

                      <div className="rounded-xl border border-ink-800/50 bg-white/[0.03] p-4">
                        <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-gray-500">
                          <CalendarDays className="w-4 h-4 text-amber-400" />
                          Deadline
                        </div>

                        <div className="mt-2 text-sm font-medium text-white">
                          {formatDate(
                            project.deadline
                          )}
                        </div>
                      </div>

                      <div className="rounded-xl border border-ink-800/50 bg-white/[0.03] p-4">
                        <div className="text-xs uppercase tracking-widest text-gray-500">
                          Priority
                        </div>

                        <div className="mt-2">
                          <span
                            className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${getPriorityClasses(
                              project.priority
                            )}`}
                          >
                            {formatPriority(
                              project.priority
                            )}
                          </span>
                        </div>
                      </div>
                    </div>

                    {project.progress_note && (
                      <div className="rounded-xl border border-accent-500/10 bg-accent-500/5 p-4">
                        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-accent-400">
                          <Target className="w-4 h-4" />
                          Latest Progress Update
                        </div>

                        <p className="mt-2 text-sm leading-6 text-gray-300">
                          {project.progress_note}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* PENDING TASKS */}
      <div className="glass rounded-2xl border border-ink-800/50 overflow-hidden">

        <div className="p-6 border-b border-white/10">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-accent-500 uppercase tracking-widest mb-2">
                Tasks
              </div>

              <h2 className="text-xl font-semibold text-white">
                Tasks Requiring Attention
              </h2>

              <p className="text-sm text-gray-500 mt-1">
                Pending tasks assigned to you.
              </p>
            </div>

            <CheckSquare className="w-5 h-5 text-gray-500" />
          </div>
        </div>

        {pendingTasks.length === 0 ? (
          <div className="p-10 text-center">
            <CheckCircle2 className="w-10 h-10 text-emerald-500/50 mx-auto mb-4" />

            <h3 className="text-white font-medium mb-2">
              All tasks are complete
            </h3>

            <p className="text-sm text-gray-500">
              You currently have no pending tasks requiring attention.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {pendingTasks.map((task) => (
              <div
                key={task.id}
                className="p-6 hover:bg-white/[0.02] transition-colors"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

                  <div className="min-w-0">
                    <h3 className="text-white font-medium">
                      {task.title}
                    </h3>

                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-gray-500">

                      <span className="flex items-center gap-1.5">
                        <FolderKanban className="w-3.5 h-3.5" />
                        {getProjectName(
                          task.project_id
                        )}
                      </span>

                      <span className="flex items-center gap-1.5">
                        <CalendarDays className="w-3.5 h-3.5" />
                        {formatDate(
                          task.due_date
                        )}
                      </span>
                    </div>

                    {task.description && (
                      <p className="mt-3 text-sm text-gray-500 line-clamp-2">
                        {task.description}
                      </p>
                    )}
                  </div>

                  <Link
                    to={
                      task.project_id
                        ? `/portal/projects/${task.project_id}`
                        : '/portal/projects'
                    }
                    className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-ink-800/50 bg-white/5 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/10"
                  >
                    Open Project
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* OPERATOR REMINDER */}
      <div className="rounded-2xl border border-accent-500/20 bg-accent-500/5 p-5">
        <div className="flex items-start gap-3">
          <Target className="mt-0.5 h-5 w-5 shrink-0 text-accent-500" />

          <div>
            <h4 className="font-medium text-white">
              Operator workspace
            </h4>

            <p className="mt-1 text-sm leading-6 text-gray-400">
              Use your project workspace to update progress,
              manage assigned tasks, communicate with Admin,
              and submit completed work for review.
            </p>

            <p className="mt-3 text-xs leading-5 text-gray-500">
              Client project pricing is intentionally hidden.
              Only your assigned operator payment is displayed.
            </p>
          </div>
        </div>
      </div>

    </div>
  );
}