import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';
import {
  FolderKanban,
  RefreshCw,
  Search,
  User,
  Users,
  CalendarDays,
  DollarSign,
  ArrowRight,
  AlertCircle,
  CheckCircle,
  Clock,
  Settings2,
  ListChecks,
  FileText,
  Plus,
  Trash2,
  X,
  Save,
  ShieldCheck,
  ShieldX,
} from 'lucide-react';

type Project = {
  id: string;
  client_id: string | null;
  operator_id: string | null;
  connector_id: string | null;
  title: string;
  description: string | null;
  status: string | null;
  price: number | null;
  created_at: string | null;
  updated_at: string | null;
  business_id: string | null;
  package_id: string | null;
  internal_notes: string | null;
  operator_payment: number | null;
  progress: number | null;
  progress_note: string | null;
  deadline: string | null;
  priority: string | null;
  developer_id: string | null;
};

type Profile = {
  id: string;
  full_name: string | null;
  email: string | null;
};

type Operator = Profile;

type ProjectTask = {
  id: string;
  project_id: string | null;
  assigned_to: string | null;
  title: string;
  description: string | null;
  status: string | null;
  due_date: string | null;
  created_at: string | null;
  updated_at: string | null;
  assignee?: Profile | null;
};

type ProjectFile = {
  id: string;
  project_id: string | null;
  uploaded_by: string | null;
  file_name: string;
  file_size: number | null;
  storage_path: string;
  is_internal: boolean | null;
  created_at: string | null;
  uploader?: Profile | null;
};

type ProjectWithPeople = Project & {
  client: Profile | null;
  operator: Profile | null;
};

const statusOptions = [
  'all',
  'pending',
  'in_progress',
  'review',
  'completed',
  'cancelled',
];

const priorityOptions = [
  'all',
  'low',
  'medium',
  'high',
  'urgent',
];

const taskStatusOptions = [
  'pending',
  'in_progress',
  'completed',
];

function formatStatus(status: string | null) {
  if (!status) return 'Unknown';

  return status
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatCurrency(value: number | null) {
  if (value === null || value === undefined) {
    return 'Not set';
  }

  return `KSh ${Number(value).toLocaleString('en-KE')}`;
}

function formatDate(value: string | null) {
  if (!value) return 'Not set';

  return new Date(value).toLocaleDateString('en-KE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatDateTime(value: string | null) {
  if (!value) return 'Not set';

  return new Date(value).toLocaleString('en-KE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatFileSize(value: number | null) {
  if (!value) return 'Unknown size';

  if (value < 1024) {
    return `${value} B`;
  }

  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(1)} KB`;
  }

  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}


function getStatusClasses(status: string | null) {
  switch (status) {
    case 'completed':
      return 'bg-green-500/10 text-green-400 border-green-500/20';

    case 'in_progress':
      return 'bg-blue-500/10 text-blue-400 border-blue-500/20';

    case 'review':
      return 'bg-purple-500/10 text-purple-400 border-purple-500/20';

    case 'cancelled':
      return 'bg-red-500/10 text-red-400 border-red-500/20';

    case 'pending':
    default:
      return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
  }
}

function getPriorityClasses(priority: string | null) {
  switch (priority) {
    case 'urgent':
      return 'text-red-400';

    case 'high':
      return 'text-orange-400';

    case 'medium':
      return 'text-yellow-400';

    case 'low':
      return 'text-green-400';

    default:
      return 'text-gray-400';
  }
}

function getTaskStatusClasses(status: string | null) {
  switch (status) {
    case 'completed':
      return 'bg-green-500/10 text-green-400 border-green-500/20';

    case 'in_progress':
      return 'bg-blue-500/10 text-blue-400 border-blue-500/20';

    default:
      return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
  }
}

export default function AdminProjects() {
  const [projects, setProjects] = useState<ProjectWithPeople[]>([]);
  const [operators, setOperators] = useState<Operator[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');

  const [selectedProjectId, setSelectedProjectId] =
    useState<string | null>(null);

  const [tasks, setTasks] = useState<ProjectTask[]>([]);
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [workspaceLoading, setWorkspaceLoading] = useState(false);

  const [savingProject, setSavingProject] = useState(false);
  const [creatingTask, setCreatingTask] = useState(false);
  const [savingTaskId, setSavingTaskId] = useState<string | null>(null);
  const [reviewAction, setReviewAction] = useState<
    'approve' | 'reject' | null
  >(null);

  const [operatorId, setOperatorId] = useState('');
  const [operatorPayment, setOperatorPayment] = useState('');
  const [deadline, setDeadline] = useState('');
  const [priority, setPriority] = useState('medium');
  const [projectStatus, setProjectStatus] = useState('pending');

  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [taskDueDate, setTaskDueDate] = useState('');

  const selectedProject = projects.find(
    (project) => project.id === selectedProjectId
  ) || null;

  async function loadOperators() {
    const { data, error: operatorError } =
      await supabase.rpc('get_operator_profiles');

    if (operatorError) {
      console.error('Could not load operators:', operatorError);
      return;
    }

    setOperators((data || []) as Operator[]);
  }

  async function loadProjects() {
    setLoading(true);
    setError('');

    try {
      const {
        data: projectData,
        error: projectError,
      } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });

      if (projectError) {
        throw projectError;
      }

      const loadedProjects = (projectData || []) as Project[];

      if (loadedProjects.length === 0) {
        setProjects([]);
        return;
      }

      const userIds = Array.from(
        new Set(
          loadedProjects.flatMap((project) =>
            [
              project.client_id,
              project.operator_id,
            ].filter(Boolean)
          )
        )
      ) as string[];

      let profiles: Profile[] = [];

      if (userIds.length > 0) {
        const {
          data: profileData,
          error: profileError,
        } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', userIds);

        if (profileError) {
          console.warn(
            'Could not load project profiles:',
            profileError
          );
        } else {
          profiles = (profileData || []) as Profile[];
        }
      }

      const profileMap = new Map(
        profiles.map((profile) => [profile.id, profile])
      );

      const projectsWithPeople: ProjectWithPeople[] =
        loadedProjects.map((project) => ({
          ...project,
          client: project.client_id
            ? profileMap.get(project.client_id) || null
            : null,
          operator: project.operator_id
            ? profileMap.get(project.operator_id) || null
            : null,
        }));

      setProjects(projectsWithPeople);
    } catch (err) {
      console.error('Admin projects error:', err);

      setError(
        err instanceof Error
          ? err.message
          : 'Failed to load projects.'
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadWorkspace(project: ProjectWithPeople) {
    setSelectedProjectId(project.id);
    setWorkspaceLoading(true);
    setTasks([]);
    setFiles([]);

    setOperatorId(project.operator_id || '');
    setOperatorPayment(
      project.operator_payment !== null &&
      project.operator_payment !== undefined
        ? String(project.operator_payment)
        : ''
    );
    setDeadline(project.deadline || '');
    setPriority(project.priority || 'medium');
    setProjectStatus(project.status || 'pending');

    try {
      const [
        { data: taskData, error: taskError },
        { data: fileData, error: fileError },
      ] = await Promise.all([
        supabase
          .from('project_tasks')
          .select('*')
          .eq('project_id', project.id)
          .order('created_at', { ascending: false }),

        supabase
          .from('project_files')
          .select('*')
          .eq('project_id', project.id)
          .eq('is_internal', false)
          .order('created_at', { ascending: false }),
      ]);

      if (taskError) {
        throw taskError;
      }

      if (fileError) {
        throw fileError;
      }

      const loadedTasks = (taskData || []) as ProjectTask[];
      const loadedFiles = (fileData || []) as ProjectFile[];

      const taskUserIds = Array.from(
        new Set(
          loadedTasks
            .map((task) => task.assigned_to)
            .filter(Boolean)
        )
      ) as string[];

      const fileUserIds = Array.from(
        new Set(
          loadedFiles
            .map((file) => file.uploaded_by)
            .filter(Boolean)
        )
      ) as string[];

      const allUserIds = Array.from(
        new Set([...taskUserIds, ...fileUserIds])
      );

      let people: Profile[] = [];

      if (allUserIds.length > 0) {
        const {
          data: peopleData,
          error: peopleError,
        } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', allUserIds);

        if (!peopleError) {
          people = (peopleData || []) as Profile[];
        }
      }

      const peopleMap = new Map(
        people.map((person) => [person.id, person])
      );

      setTasks(
        loadedTasks.map((task) => ({
          ...task,
          assignee: task.assigned_to
            ? peopleMap.get(task.assigned_to) || null
            : null,
        }))
      );

      setFiles(
        loadedFiles.map((file) => ({
          ...file,
          uploader: file.uploaded_by
            ? peopleMap.get(file.uploaded_by) || null
            : null,
        }))
      );
    } catch (err) {
      console.error('Admin workspace error:', err);

      setError(
        err instanceof Error
          ? err.message
          : 'Could not load the project workspace.'
      );
    } finally {
      setWorkspaceLoading(false);
    }
  }

  async function saveProjectSettings() {
    if (!selectedProject) return;

    setSavingProject(true);
    setError('');

    try {
      const paymentValue =
        operatorPayment.trim() === ''
          ? null
          : Number(operatorPayment);

      if (
        paymentValue !== null &&
        (!Number.isFinite(paymentValue) || paymentValue < 0)
      ) {
        throw new Error(
          'Operator payment must be a valid non-negative amount.'
        );
      }

      const { data, error: updateError } =
        await supabase
          .from('projects')
          .update({
            operator_id: operatorId || null,
            operator_payment: paymentValue,
            deadline: deadline || null,
            priority: priority || null,
            status: projectStatus,
          })
          .eq('id', selectedProject.id)
          .select('*')
          .single();

      if (updateError) {
        throw updateError;
      }

      const updatedProject = data as Project;

      setProjects((current) =>
        current.map((project) => {
          if (project.id !== updatedProject.id) {
            return project;
          }

          const selectedOperator =
            operators.find(
              (operator) =>
                operator.id === updatedProject.operator_id
            ) || null;

          return {
            ...project,
            ...updatedProject,
            operator: selectedOperator,
          };
        })
      );
    } catch (err) {
      console.error('Project update error:', err);

      setError(
        err instanceof Error
          ? err.message
          : 'Could not save project settings.'
      );
    } finally {
      setSavingProject(false);
    }
  }

  async function createTask() {
    if (!selectedProject) return;

    if (!taskTitle.trim()) {
      setError('Task title is required.');
      return;
    }

    if (!operatorId) {
      setError(
        'Assign an operator to the project before creating a task.'
      );
      return;
    }

    setCreatingTask(true);
    setError('');

    try {
      const { data, error: taskError } =
        await supabase
          .from('project_tasks')
          .insert({
            project_id: selectedProject.id,
            assigned_to: operatorId,
            title: taskTitle.trim(),
            description:
              taskDescription.trim() || null,
            status: 'pending',
            due_date: taskDueDate
              ? new Date(taskDueDate).toISOString()
              : null,
          })
          .select('*')
          .single();

      if (taskError) {
        throw taskError;
      }

      const createdTask = data as ProjectTask;

      setTasks((current) => [
        {
          ...createdTask,
          assignee:
            operators.find(
              (operator) => operator.id === operatorId
            ) || null,
        },
        ...current,
      ]);

      setTaskTitle('');
      setTaskDescription('');
      setTaskDueDate('');
    } catch (err) {
      console.error('Create task error:', err);

      setError(
        err instanceof Error
          ? err.message
          : 'Could not create the task.'
      );
    } finally {
      setCreatingTask(false);
    }
  }

  async function updateTaskStatus(
    taskId: string,
    status: string
  ) {
    setSavingTaskId(taskId);
    setError('');

    try {
      const { error: updateError } =
        await supabase
          .from('project_tasks')
          .update({
            status,
            updated_at: new Date().toISOString(),
          })
          .eq('id', taskId);

      if (updateError) {
        throw updateError;
      }

      setTasks((current) =>
        current.map((task) =>
          task.id === taskId
            ? {
                ...task,
                status,
                updated_at:
                  new Date().toISOString(),
              }
            : task
        )
      );
    } catch (err) {
      console.error('Task update error:', err);

      setError(
        err instanceof Error
          ? err.message
          : 'Could not update task.'
      );
    } finally {
      setSavingTaskId(null);
    }
  }

  async function deleteTask(taskId: string) {
    if (
      !window.confirm(
        'Delete this task? This cannot be undone.'
      )
    ) {
      return;
    }

    setSavingTaskId(taskId);
    setError('');

    try {
      const { error: deleteError } =
        await supabase
          .from('project_tasks')
          .delete()
          .eq('id', taskId);

      if (deleteError) {
        throw deleteError;
      }

      setTasks((current) =>
        current.filter((task) => task.id !== taskId)
      );
    } catch (err) {
      console.error('Delete task error:', err);

      setError(
        err instanceof Error
          ? err.message
          : 'Could not delete task.'
      );
    } finally {
      setSavingTaskId(null);
    }
  }

  async function approveSubmittedWork() {
    if (!selectedProject) return;

    if (
      !window.confirm(
        'Approve this submitted work and mark the project completed?'
      )
    ) {
      return;
    }

    setReviewAction('approve');
    setError('');

    try {
      const { data, error: updateError } =
        await supabase
          .from('projects')
          .update({
            status: 'completed',
            progress: 100,
            updated_at: new Date().toISOString(),
          })
          .eq('id', selectedProject.id)
          .select('*')
          .single();

      if (updateError) {
        throw updateError;
      }

      const updatedProject = data as Project;

      setProjects((current) =>
        current.map((project) =>
          project.id === updatedProject.id
            ? {
                ...project,
                ...updatedProject,
              }
            : project
        )
      );

      setProjectStatus('completed');
    } catch (err) {
      console.error('Approve work error:', err);

      setError(
        err instanceof Error
          ? err.message
          : 'Could not approve submitted work.'
      );
    } finally {
      setReviewAction(null);
    }
  }

  async function rejectSubmittedWork() {
    if (!selectedProject) return;

    if (
      !window.confirm(
        'Reject this submitted work and return the project to in-progress?'
      )
    ) {
      return;
    }

    setReviewAction('reject');
    setError('');

    try {
      const { data, error: updateError } =
        await supabase
          .from('projects')
          .update({
            status: 'in_progress',
            updated_at: new Date().toISOString(),
          })
          .eq('id', selectedProject.id)
          .select('*')
          .single();

      if (updateError) {
        throw updateError;
      }

      const updatedProject = data as Project;

      setProjects((current) =>
        current.map((project) =>
          project.id === updatedProject.id
            ? {
                ...project,
                ...updatedProject,
              }
            : project
        )
      );

      setProjectStatus('in_progress');
    } catch (err) {
      console.error('Reject work error:', err);

      setError(
        err instanceof Error
          ? err.message
          : 'Could not reject submitted work.'
      );
    } finally {
      setReviewAction(null);
    }
  }

  async function refreshAll() {
    await Promise.all([
      loadProjects(),
      loadOperators(),
    ]);

    if (selectedProjectId) {
      const refreshedProject = projects.find(
        (project) =>
          project.id === selectedProjectId
      );

      if (refreshedProject) {
        await loadWorkspace(refreshedProject);
      }
    }
  }

  useEffect(() => {
    void loadProjects();
    void loadOperators();
  }, []);

  const filteredProjects = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    return projects.filter((project) => {
      const matchesSearch =
        !search ||
        project.title.toLowerCase().includes(search) ||
        project.description
          ?.toLowerCase()
          .includes(search) ||
        project.client?.full_name
          ?.toLowerCase()
          .includes(search) ||
        project.client?.email
          ?.toLowerCase()
          .includes(search) ||
        project.operator?.full_name
          ?.toLowerCase()
          .includes(search);

      const matchesStatus =
        statusFilter === 'all' ||
        project.status === statusFilter;

      const matchesPriority =
        priorityFilter === 'all' ||
        project.priority === priorityFilter;

      return (
        matchesSearch &&
        matchesStatus &&
        matchesPriority
      );
    });
  }, [
    projects,
    searchTerm,
    statusFilter,
    priorityFilter,
  ]);

  const totalProjects = projects.length;

  const activeProjects = projects.filter(
    (project) => project.status === 'in_progress'
  ).length;

  const reviewProjects = projects.filter(
    (project) => project.status === 'review'
  ).length;

  const completedProjects = projects.filter(
    (project) => project.status === 'completed'
  ).length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
        <div>
          <div className="flex items-center gap-3">
            <FolderKanban className="w-7 h-7 text-accent-500" />

            <h1 className="text-3xl font-light text-white tracking-tight">
              Project Management
            </h1>
          </div>

          <p className="text-gray-400 mt-2">
            Assign operators, manage payments and deadlines,
            create tasks, monitor progress, and review submitted work.
          </p>
        </div>

        <button
          type="button"
          onClick={refreshAll}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 transition-colors disabled:opacity-50"
        >
          <RefreshCw
            className={`w-4 h-4 ${
              loading ? 'animate-spin' : ''
            }`}
          />

          Refresh
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />

          <div className="flex-1">
            <div className="text-red-400 font-medium">
              Project management error
            </div>

            <div className="text-red-300/80 text-sm mt-1">
              {error}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setError('')}
            className="text-gray-500 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        <div className="glass rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <FolderKanban className="w-5 h-5 text-accent-500" />

            <span className="text-xs font-bold text-ink-500 uppercase tracking-widest">
              Total Projects
            </span>
          </div>

          <div className="text-3xl font-light text-white">
            {totalProjects}
          </div>
        </div>

        <div className="glass rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <Clock className="w-5 h-5 text-blue-400" />

            <span className="text-xs font-bold text-ink-500 uppercase tracking-widest">
              In Progress
            </span>
          </div>

          <div className="text-3xl font-light text-white">
            {activeProjects}
          </div>
        </div>

        <div className="glass rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <AlertCircle className="w-5 h-5 text-purple-400" />

            <span className="text-xs font-bold text-ink-500 uppercase tracking-widest">
              Awaiting Review
            </span>
          </div>

          <div className="text-3xl font-light text-white">
            {reviewProjects}
          </div>
        </div>

        <div className="glass rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <CheckCircle className="w-5 h-5 text-green-400" />

            <span className="text-xs font-bold text-ink-500 uppercase tracking-widest">
              Completed
            </span>
          </div>

          <div className="text-3xl font-light text-white">
            {completedProjects}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="glass rounded-2xl p-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />

            <input
              type="text"
              value={searchTerm}
              onChange={(event) =>
                setSearchTerm(event.target.value)
              }
              placeholder="Search projects, clients, operators..."
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 outline-none focus:border-accent-500/50"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value)
            }
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-gray-300 outline-none focus:border-accent-500/50"
          >
            {statusOptions.map((status) => (
              <option
                key={status}
                value={status}
                className="bg-ink-900"
              >
                {status === 'all'
                  ? 'All Statuses'
                  : formatStatus(status)}
              </option>
            ))}
          </select>

          <select
            value={priorityFilter}
            onChange={(event) =>
              setPriorityFilter(event.target.value)
            }
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-gray-300 outline-none focus:border-accent-500/50"
          >
            {priorityOptions.map((priorityOption) => (
              <option
                key={priorityOption}
                value={priorityOption}
                className="bg-ink-900"
              >
                {priorityOption === 'all'
                  ? 'All Priorities'
                  : formatStatus(priorityOption)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Project List */}
      <div className="glass rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-white/5">
          <h2 className="text-xl font-medium text-white">
            All Projects
          </h2>

          <p className="text-sm text-gray-500 mt-1">
            {filteredProjects.length} project
            {filteredProjects.length === 1 ? '' : 's'} displayed
          </p>
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <RefreshCw className="w-7 h-7 text-accent-500 animate-spin mx-auto mb-3" />

            <p className="text-gray-500">
              Loading projects...
            </p>
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="p-12 text-center">
            <FolderKanban className="w-10 h-10 text-gray-600 mx-auto mb-3" />

            <h3 className="text-white font-medium">
              No projects found
            </h3>

            <p className="text-gray-500 text-sm mt-1">
              Try changing your search or filters.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {filteredProjects.map((project) => {
              const isSelected =
                selectedProjectId === project.id;

              return (
                <div
                  key={project.id}
                  className="p-6"
                >
                  <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-6">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-3 mb-3">
                        <h3 className="text-lg font-medium text-white">
                          {project.title}
                        </h3>

                        <span
                          className={`px-2.5 py-1 rounded-full border text-xs font-medium ${getStatusClasses(
                            project.status
                          )}`}
                        >
                          {formatStatus(project.status)}
                        </span>

                        {project.priority && (
                          <span
                            className={`text-xs font-medium uppercase ${getPriorityClasses(
                              project.priority
                            )}`}
                          >
                            {project.priority} priority
                          </span>
                        )}
                      </div>

                      {project.description && (
                        <p className="text-gray-400 text-sm line-clamp-2 mb-5 max-w-3xl">
                          {project.description}
                        </p>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="flex items-start gap-3">
                          <User className="w-4 h-4 text-gray-500 mt-0.5 shrink-0" />

                          <div className="min-w-0">
                            <div className="text-xs text-gray-500">
                              Client
                            </div>

                            <div className="text-sm text-gray-200 mt-0.5 truncate">
                              {project.client?.full_name ||
                                project.client?.email ||
                                'Not assigned'}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-start gap-3">
                          <Users className="w-4 h-4 text-gray-500 mt-0.5 shrink-0" />

                          <div className="min-w-0">
                            <div className="text-xs text-gray-500">
                              Operator
                            </div>

                            <div className="text-sm text-gray-200 mt-0.5 truncate">
                              {project.operator?.full_name ||
                                project.operator?.email ||
                                'Not assigned'}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-start gap-3">
                          <DollarSign className="w-4 h-4 text-gray-500 mt-0.5 shrink-0" />

                          <div>
                            <div className="text-xs text-gray-500">
                              Client Price
                            </div>

                            <div className="text-sm text-gray-200 mt-0.5">
                              {formatCurrency(project.price)}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-start gap-3">
                          <CalendarDays className="w-4 h-4 text-gray-500 mt-0.5 shrink-0" />

                          <div>
                            <div className="text-xs text-gray-500">
                              Deadline
                            </div>

                            <div className="text-sm text-gray-200 mt-0.5">
                              {formatDate(project.deadline)}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Progress */}
                      <div className="mt-5 max-w-3xl">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs text-gray-500">
                            Operator Progress
                          </span>

                          <span className="text-xs text-gray-300">
                            {project.progress ?? 0}%
                          </span>
                        </div>

                        <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-accent-500 transition-all"
                            style={{
                              width: `${Math.min(
                                Math.max(
                                  project.progress ?? 0,
                                  0
                                ),
                                100
                              )}%`,
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() =>
                          isSelected
                            ? setSelectedProjectId(null)
                            : void loadWorkspace(project)
                        }
                        className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-accent-600 text-white hover:bg-accent-500 transition-colors"
                      >
                        <Settings2 className="w-4 h-4" />

                        {isSelected
                          ? 'Close Management'
                          : 'Manage Project'}
                      </button>

                      <Link
                        to={`/portal/projects/${project.id}`}
                        className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 transition-colors"
                      >
                        View Project

                        <ArrowRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>

                  {/* ==================================================
                      ADMIN MANAGEMENT WORKSPACE
                  ================================================== */}
                  {isSelected && (
                    <div className="mt-8 pt-8 border-t border-white/10 space-y-8">
                      {workspaceLoading ? (
                        <div className="p-10 text-center">
                          <RefreshCw className="w-7 h-7 text-accent-500 animate-spin mx-auto mb-3" />

                          <p className="text-gray-500">
                            Loading project management workspace...
                          </p>
                        </div>
                      ) : (
                        <>
                          {/* Assignment / payment / deadline / priority */}
                          <section>
                            <div className="flex items-center gap-3 mb-5">
                              <Settings2 className="w-5 h-5 text-accent-500" />

                              <div>
                                <h3 className="text-lg font-medium text-white">
                                  Project Assignment & Controls
                                </h3>

                                <p className="text-sm text-gray-500 mt-1">
                                  Admin-only project management settings.
                                </p>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
                              {/* Operator */}
                              <div>
                                <label className="block text-xs text-gray-500 mb-2">
                                  Assign Operator
                                </label>

                                <select
                                  value={operatorId}
                                  onChange={(event) =>
                                    setOperatorId(event.target.value)
                                  }
                                  className="w-full px-3 py-3 rounded-xl bg-white/5 border border-white/10 text-gray-200 outline-none focus:border-accent-500/50"
                                >
                                  <option
                                    value=""
                                    className="bg-ink-900"
                                  >
                                    Unassigned
                                  </option>

                                  {operators.map((operator) => (
                                    <option
                                      key={operator.id}
                                      value={operator.id}
                                      className="bg-ink-900"
                                    >
                                      {operator.full_name ||
                                        operator.email ||
                                        operator.id}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              {/* Payment */}
                              <div>
                                <label className="block text-xs text-gray-500 mb-2">
                                  Operator Payment
                                </label>

                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={operatorPayment}
                                  onChange={(event) =>
                                    setOperatorPayment(
                                      event.target.value
                                    )
                                  }
                                  placeholder="KSh amount"
                                  className="w-full px-3 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 outline-none focus:border-accent-500/50"
                                />
                              </div>

                              {/* Deadline */}
                              <div>
                                <label className="block text-xs text-gray-500 mb-2">
                                  Deadline
                                </label>

                                <input
                                  type="date"
                                  value={deadline}
                                  onChange={(event) =>
                                    setDeadline(event.target.value)
                                  }
                                  className="w-full px-3 py-3 rounded-xl bg-white/5 border border-white/10 text-gray-200 outline-none focus:border-accent-500/50"
                                />
                              </div>

                              {/* Priority */}
                              <div>
                                <label className="block text-xs text-gray-500 mb-2">
                                  Priority
                                </label>

                                <select
                                  value={priority}
                                  onChange={(event) =>
                                    setPriority(event.target.value)
                                  }
                                  className="w-full px-3 py-3 rounded-xl bg-white/5 border border-white/10 text-gray-200 outline-none focus:border-accent-500/50"
                                >
                                  {priorityOptions
                                    .filter(
                                      (item) =>
                                        item !== 'all'
                                    )
                                    .map((item) => (
                                      <option
                                        key={item}
                                        value={item}
                                        className="bg-ink-900"
                                      >
                                        {formatStatus(item)}
                                      </option>
                                    ))}
                                </select>
                              </div>

                              {/* Status */}
                              <div>
                                <label className="block text-xs text-gray-500 mb-2">
                                  Project Status
                                </label>

                                <select
                                  value={projectStatus}
                                  onChange={(event) =>
                                    setProjectStatus(
                                      event.target.value
                                    )
                                  }
                                  className="w-full px-3 py-3 rounded-xl bg-white/5 border border-white/10 text-gray-200 outline-none focus:border-accent-500/50"
                                >
                                  {statusOptions
                                    .filter(
                                      (item) =>
                                        item !== 'all'
                                    )
                                    .map((item) => (
                                      <option
                                        key={item}
                                        value={item}
                                        className="bg-ink-900"
                                      >
                                        {formatStatus(item)}
                                      </option>
                                    ))}
                                </select>
                              </div>
                            </div>

                            <div className="mt-5 flex justify-end">
                              <button
                                type="button"
                                onClick={saveProjectSettings}
                                disabled={savingProject}
                                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent-600 text-white hover:bg-accent-500 transition-colors disabled:opacity-50"
                              >
                                {savingProject ? (
                                  <RefreshCw className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Save className="w-4 h-4" />
                                )}

                                Save Project Controls
                              </button>
                            </div>
                          </section>

                          {/* Progress monitor */}
                          <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
                            <div className="flex items-center justify-between gap-4 mb-4">
                              <div className="flex items-center gap-3">
                                <Clock className="w-5 h-5 text-blue-400" />

                                <div>
                                  <h3 className="text-lg font-medium text-white">
                                    Monitor Progress
                                  </h3>

                                  <p className="text-sm text-gray-500">
                                    Current operator progress.
                                  </p>
                                </div>
                              </div>

                              <span className="text-2xl font-medium text-white">
                                {selectedProject?.progress ?? 0}%
                              </span>
                            </div>

                            <div className="h-3 rounded-full bg-white/5 overflow-hidden">
                              <div
                                className="h-full rounded-full bg-accent-500 transition-all"
                                style={{
                                  width: `${Math.min(
                                    Math.max(
                                      selectedProject?.progress ?? 0,
                                      0
                                    ),
                                    100
                                  )}%`,
                                }}
                              />
                            </div>

                            {selectedProject?.progress_note && (
                              <div className="mt-4 rounded-xl bg-white/5 border border-white/5 p-4">
                                <div className="text-xs text-gray-500 mb-1">
                                  Operator Progress Note
                                </div>

                                <p className="text-sm text-gray-300">
                                  {selectedProject.progress_note}
                                </p>
                              </div>
                            )}
                          </section>

                          {/* Tasks */}
                          <section>
                            <div className="flex items-center gap-3 mb-5">
                              <ListChecks className="w-5 h-5 text-accent-500" />

                              <div>
                                <h3 className="text-lg font-medium text-white">
                                  Project Tasks
                                </h3>

                                <p className="text-sm text-gray-500 mt-1">
                                  Create tasks and monitor their completion.
                                </p>
                              </div>
                            </div>

                            {/* Create task */}
                            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 mb-5">
                              <div className="flex items-center gap-2 mb-4">
                                <Plus className="w-4 h-4 text-accent-500" />

                                <h4 className="text-sm font-medium text-white">
                                  Create Task
                                </h4>
                              </div>

                              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                                <input
                                  type="text"
                                  value={taskTitle}
                                  onChange={(event) =>
                                    setTaskTitle(event.target.value)
                                  }
                                  placeholder="Task title"
                                  className="px-3 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 outline-none focus:border-accent-500/50"
                                />

                                <input
                                  type="text"
                                  value={taskDescription}
                                  onChange={(event) =>
                                    setTaskDescription(
                                      event.target.value
                                    )
                                  }
                                  placeholder="Task description"
                                  className="px-3 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 outline-none focus:border-accent-500/50"
                                />

                                <input
                                  type="datetime-local"
                                  value={taskDueDate}
                                  onChange={(event) =>
                                    setTaskDueDate(event.target.value)
                                  }
                                  className="px-3 py-3 rounded-xl bg-white/5 border border-white/10 text-gray-200 outline-none focus:border-accent-500/50"
                                />
                              </div>

                              <div className="mt-4 flex justify-end">
                                <button
                                  type="button"
                                  onClick={createTask}
                                  disabled={
                                    creatingTask ||
                                    !operatorId
                                  }
                                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent-600 text-white hover:bg-accent-500 transition-colors disabled:opacity-50"
                                >
                                  {creatingTask ? (
                                    <RefreshCw className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <Plus className="w-4 h-4" />
                                  )}

                                  Create Task
                                </button>
                              </div>
                            </div>

                            {/* Task list */}
                            {tasks.length === 0 ? (
                              <div className="rounded-2xl border border-white/10 p-8 text-center">
                                <ListChecks className="w-9 h-9 text-gray-600 mx-auto mb-3" />

                                <p className="text-gray-400">
                                  No tasks have been created for this project.
                                </p>
                              </div>
                            ) : (
                              <div className="space-y-3">
                                {tasks.map((task) => (
                                  <div
                                    key={task.id}
                                    className="rounded-2xl border border-white/10 bg-white/[0.02] p-5"
                                  >
                                    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                                      <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-3">
                                          <h4 className="text-white font-medium">
                                            {task.title}
                                          </h4>

                                          <span
                                            className={`px-2.5 py-1 rounded-full border text-xs ${getTaskStatusClasses(
                                              task.status
                                            )}`}
                                          >
                                            {formatStatus(
                                              task.status
                                            )}
                                          </span>
                                        </div>

                                        {task.description && (
                                          <p className="text-sm text-gray-400 mt-2">
                                            {task.description}
                                          </p>
                                        )}

                                        <div className="flex flex-wrap gap-4 mt-3 text-xs text-gray-500">
                                          <span>
                                            Assigned to:{' '}
                                            <span className="text-gray-300">
                                              {task.assignee
                                                ?.full_name ||
                                                task.assignee
                                                  ?.email ||
                                                'Unknown'}
                                            </span>
                                          </span>

                                          <span>
                                            Due:{' '}
                                            <span className="text-gray-300">
                                              {formatDateTime(
                                                task.due_date
                                              )}
                                            </span>
                                          </span>
                                        </div>
                                      </div>

                                      <div className="flex items-center gap-2">
                                        <select
                                          value={
                                            task.status ||
                                            'pending'
                                          }
                                          disabled={
                                            savingTaskId ===
                                            task.id
                                          }
                                          onChange={(event) =>
                                            void updateTaskStatus(
                                              task.id,
                                              event.target.value
                                            )
                                          }
                                          className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-gray-300 text-sm outline-none"
                                        >
                                          {taskStatusOptions.map(
                                            (status) => (
                                              <option
                                                key={status}
                                                value={status}
                                                className="bg-ink-900"
                                              >
                                                {formatStatus(
                                                  status
                                                )}
                                              </option>
                                            )
                                          )}
                                        </select>

                                        <button
                                          type="button"
                                          onClick={() =>
                                            void deleteTask(
                                              task.id
                                            )
                                          }
                                          disabled={
                                            savingTaskId ===
                                            task.id
                                          }
                                          className="p-2 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 disabled:opacity-50"
                                          title="Delete task"
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </section>

                          {/* Submitted work review */}
                          <section className="rounded-2xl border border-purple-500/20 bg-purple-500/5 p-5">
                            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-5">
                              <div className="flex items-center gap-3">
                                <FileText className="w-5 h-5 text-purple-400" />

                                <div>
                                  <h3 className="text-lg font-medium text-white">
                                    Review Submitted Work
                                  </h3>

                                  <p className="text-sm text-gray-500 mt-1">
                                    Review the operator's submitted files and
                                    progress before approving completion.
                                  </p>
                                </div>
                              </div>

                              <span
                                className={`px-3 py-1.5 rounded-full border text-xs font-medium ${getStatusClasses(
                                  selectedProject?.status || null
                                )}`}
                              >
                                {formatStatus(
                                  selectedProject?.status || null
                                )}
                              </span>
                            </div>

                            {files.length === 0 ? (
                              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6 text-center">
                                <FileText className="w-8 h-8 text-gray-600 mx-auto mb-3" />

                                <p className="text-gray-400 text-sm">
                                  No non-internal submitted files were found
                                  for this project.
                                </p>
                              </div>
                            ) : (
                              <div className="space-y-3">
                                {files.map((file) => (
                                  <div
                                    key={file.id}
                                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-xl border border-white/10 bg-white/[0.02] p-4"
                                  >
                                    <div className="flex items-start gap-3 min-w-0">
                                      <FileText className="w-5 h-5 text-gray-500 mt-0.5 shrink-0" />

                                      <div className="min-w-0">
                                        <div className="text-sm text-white truncate">
                                          {file.file_name}
                                        </div>

                                        <div className="text-xs text-gray-500 mt-1">
                                          Uploaded by{' '}
                                          {file.uploader
                                            ?.full_name ||
                                            file.uploader
                                              ?.email ||
                                            'Unknown'}{' '}
                                          •{' '}
                                          {formatFileSize(
                                            file.file_size
                                          )}
                                        </div>

                                        <div className="text-xs text-gray-600 mt-1">
                                          {formatDateTime(
                                            file.created_at
                                          )}
                                        </div>
                                      </div>
                                    </div>

                                    <div className="text-xs text-gray-600 break-all max-w-sm">
                                      {file.storage_path}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}

                            {selectedProject?.status ===
                              'review' && (
                              <div className="mt-6 flex flex-col sm:flex-row gap-3 sm:justify-end">
                                <button
                                  type="button"
                                  onClick={rejectSubmittedWork}
                                  disabled={
                                    reviewAction !== null
                                  }
                                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-red-500/20 bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-50"
                                >
                                  {reviewAction === 'reject' ? (
                                    <RefreshCw className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <ShieldX className="w-4 h-4" />
                                  )}

                                  Reject & Return to Operator
                                </button>

                                <button
                                  type="button"
                                  onClick={approveSubmittedWork}
                                  disabled={
                                    reviewAction !== null
                                  }
                                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-green-600 text-white hover:bg-green-500 transition-colors disabled:opacity-50"
                                >
                                  {reviewAction === 'approve' ? (
                                    <RefreshCw className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <ShieldCheck className="w-4 h-4" />
                                  )}

                                  Approve & Complete
                                </button>
                              </div>
                            )}

                            {selectedProject?.status ===
                              'completed' && (
                              <div className="mt-5 rounded-xl border border-green-500/20 bg-green-500/10 p-4 flex items-center gap-3">
                                <CheckCircle className="w-5 h-5 text-green-400" />

                                <div>
                                  <div className="text-sm font-medium text-green-400">
                                    Work approved
                                  </div>

                                  <div className="text-xs text-green-300/70 mt-1">
                                    This project has been marked as completed.
                                  </div>
                                </div>
                              </div>
                            )}
                          </section>

                          {/* Footer project summary */}
                          <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
                              <div className="text-xs text-gray-500 mb-2">
                                Operator Payment
                              </div>

                              <div className="text-xl text-white">
                                {formatCurrency(
                                  Number.isFinite(
                                    Number(operatorPayment)
                                  )
                                    ? Number(operatorPayment)
                                    : selectedProject?.operator_payment ?? null
                                )}
                              </div>
                            </div>

                            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
                              <div className="text-xs text-gray-500 mb-2">
                                Deadline
                              </div>

                              <div className="text-xl text-white">
                                {formatDate(
                                  deadline ||
                                    selectedProject?.deadline ||
                                    null
                                )}
                              </div>
                            </div>

                            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
                              <div className="text-xs text-gray-500 mb-2">
                                Priority
                              </div>

                              <div
                                className={`text-xl capitalize ${getPriorityClasses(
                                  priority
                                )}`}
                              >
                                {priority || 'Not set'}
                              </div>
                            </div>
                          </section>
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
