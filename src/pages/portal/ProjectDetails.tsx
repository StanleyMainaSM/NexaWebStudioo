import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import {
  ArrowLeft,
  CheckCircle2,
  CircleDashed,
  Clock3,
  Download,
  FileText,
  Flag,
  Loader2,
  MessageSquare,
  Send,
  Sparkles,
  UserRound,
} from 'lucide-react';

interface Project {
  id: string;
  title: string;
  description: string | null;
  status: string | null;
  price: number | null;
  created_at: string;
  updated_at: string | null;
  client_id: string | null;
  operator_id: string | null;
  connector_id: string | null;
  operator_payment: number | null;
  progress: number | null;
  progress_note: string | null;
  deadline: string | null;
  priority: string | null;
}

interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  recipient_id?: string | null;
  is_internal?: boolean | null;
}

interface ProjectFileRecord {
  id: string;
  file_name: string;
  file_size: number | null;
  created_at: string;
  storage_path: string;
  uploaded_by: string | null;
  is_internal: boolean | null;
}

interface ProjectTask {
  id: string;
  project_id: string;
  assigned_to: string | null;
  title: string;
  description: string | null;
  status: string | null;
  due_date: string | null;
  created_at: string;
  updated_at: string | null;
}

interface Activity {
  id: string;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
  user_id: string | null;
}

interface SectionErrors {
  messages?: string;
  adminMessages?: string;
  files?: string;
  tasks?: string;
  activity?: string;
}

function formatStatus(status: string | null | undefined) {
  if (!status) return 'Pending';

  return status
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getStatusTone(status: string | null | undefined) {
  if (!status) {
    return 'border-accent-500/20 bg-accent-500/10 text-accent-400';
  }

  if (status === 'completed') {
    return 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400';
  }

  if (
    status === 'review' ||
    status === 'pending_review'
  ) {
    return 'border-amber-500/20 bg-amber-500/10 text-amber-400';
  }

  if (status === 'in_progress') {
    return 'border-blue-500/20 bg-blue-500/10 text-blue-400';
  }

  return 'border-accent-500/20 bg-accent-500/10 text-accent-400';
}

function getPriorityTone(priority: string | null | undefined) {
  switch (priority) {
    case 'high':
      return 'text-red-400 bg-red-500/10 border-red-500/20';

    case 'medium':
      return 'text-amber-400 bg-amber-500/10 border-amber-500/20';

    case 'low':
      return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';

    default:
      return 'text-gray-400 bg-white/5 border-ink-800/50';
  }
}

function getTaskStatusTone(status: string | null | undefined) {
  switch (status) {
    case 'completed':
      return 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400';

    case 'in_progress':
      return 'border-blue-500/20 bg-blue-500/10 text-blue-400';

    case 'blocked':
      return 'border-red-500/20 bg-red-500/10 text-red-400';

    default:
      return 'border-amber-500/20 bg-amber-500/10 text-amber-400';
  }
}

function formatTaskStatus(status: string | null | undefined) {
  if (!status) return 'Pending';

  return status
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatDate(date: string | null | undefined) {
  if (!date) return 'Not set';

  return new Date(date).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatDateTime(date: string | null | undefined) {
  if (!date) return '';

  return new Date(date).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatFileSize(bytes: number | null) {
  if (!bytes || bytes <= 0) return '';

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getSupabaseErrorMessage(error: unknown) {
  if (!error) {
    return 'Unknown database error.';
  }

  if (typeof error === 'object' && error !== null) {
    const value = error as {
      message?: string;
      details?: string;
      hint?: string;
      code?: string;
    };

    const parts = [
      value.message,
      value.details,
      value.hint ? `Hint: ${value.hint}` : undefined,
      value.code ? `Code: ${value.code}` : undefined,
    ].filter(Boolean);

    if (parts.length > 0) {
      return parts.join(' • ');
    }
  }

  return String(error);
}

export default function ProjectDetails() {
  const { projectId } = useParams();
  const { user, roles } = useAuth();

  const [project, setProject] = useState<Project | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [adminMessages, setAdminMessages] = useState<Message[]>([]);
  const [projectFiles, setProjectFiles] = useState<ProjectFileRecord[]>([]);
  const [tasks, setTasks] = useState<ProjectTask[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);

  const [sectionErrors, setSectionErrors] =
    useState<SectionErrors>({});

  const [newMessage, setNewMessage] = useState('');
  const [adminMessage, setAdminMessage] = useState('');

  const [progressValue, setProgressValue] = useState(0);
  const [progressNote, setProgressNote] = useState('');

  const [savingProgress, setSavingProgress] = useState(false);
  const [submittingReview, setSubmittingReview] =
    useState(false);

  const [updatingTaskId, setUpdatingTaskId] =
    useState<string | null>(null);

  const [downloadingFileId, setDownloadingFileId] =
    useState<string | null>(null);

  const [sending, setSending] = useState(false);
  const [sendingAdminMessage, setSendingAdminMessage] =
    useState(false);

  const [loading, setLoading] = useState(true);
  const [projectError, setProjectError] =
    useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] =
    useState<string | null>(null);

  const isOperator = roles.includes('operator');

  const isAdmin =
    roles.includes('admin') ||
    roles.includes('owner');

  useEffect(() => {
    if (!user || !projectId) {
      setLoading(false);
      return;
    }

    let isMounted = true;

    async function loadWorkspace() {
      setLoading(true);
      setProjectError(null);
      setSectionErrors({});
      setMessages([]);
      setAdminMessages([]);
      setProjectFiles([]);
      setTasks([]);
      setActivities([]);

      /*
       * PROJECT
       */
      try {
        const {
          data: projectData,
          error: projectQueryError,
        } = await supabase
          .from('projects')
          .select(`
            id,
            title,
            description,
            status,
            price,
            created_at,
            updated_at,
            client_id,
            operator_id,
            connector_id,
            operator_payment,
            progress,
            progress_note,
            deadline,
            priority
          `)
          .eq('id', projectId)
          .maybeSingle();

        if (projectQueryError) {
          throw projectQueryError;
        }

        if (!projectData) {
          throw new Error(
            'This project does not exist, or your account does not have access to it.'
          );
        }

        if (!isMounted) return;

        const loadedProject =
          projectData as Project;

        setProject(loadedProject);

        setProgressValue(
          Math.min(
            100,
            Math.max(
              0,
              Number(loadedProject.progress ?? 0)
            )
          )
        );

        setProgressNote(
          loadedProject.progress_note ?? ''
        );
      } catch (err) {
        console.error(
          'Project query failed:',
          err
        );

        if (isMounted) {
          setProjectError(
            getSupabaseErrorMessage(err)
          );
          setProject(null);
        }

        setLoading(false);
        return;
      }

      /*
       * MESSAGES
       *
       * We intentionally do NOT join profiles here.
       *
       * messages has two foreign keys to profiles:
       * sender_id and recipient_id.
       */
      try {
        const {
          data,
          error: queryError,
        } = await supabase
          .from('messages')
          .select(`
            id,
            content,
            sender_id,
            created_at,
            recipient_id,
            is_internal
          `)
          .eq('project_id', projectId)
          .eq('is_internal', false)
          .order('created_at', {
            ascending: true,
          });

        if (queryError) {
          throw queryError;
        }

        if (isMounted) {
          setMessages(
            (data || []) as Message[]
          );
        }
      } catch (err) {
        console.error(
          'Messages query failed:',
          err
        );

        if (isMounted) {
          setSectionErrors((current) => ({
            ...current,
            messages:
              getSupabaseErrorMessage(err),
          }));
        }
      }

      /*
       * ADMIN MESSAGES
       */
      try {
        const {
          data,
          error: queryError,
        } = await supabase
          .from('messages')
          .select(`
            id,
            content,
            sender_id,
            created_at,
            recipient_id,
            is_internal
          `)
          .eq('project_id', projectId)
          .eq('is_internal', true)
          .order('created_at', {
            ascending: true,
          });

        if (queryError) {
          throw queryError;
        }

        if (isMounted) {
          setAdminMessages(
            (data || []) as Message[]
          );
        }
      } catch (err) {
        console.error(
          'Admin messages query failed:',
          err
        );

        if (isMounted) {
          setSectionErrors((current) => ({
            ...current,
            adminMessages:
              getSupabaseErrorMessage(err),
          }));
        }
      }

      /*
       * PROJECT FILES
       */
      try {
        const {
          data,
          error: queryError,
        } = await supabase
          .from('project_files')
          .select(`
            id,
            file_name,
            file_size,
            created_at,
            storage_path,
            uploaded_by,
            is_internal
          `)
          .eq('project_id', projectId)
          .order('created_at', {
            ascending: false,
          });

        if (queryError) {
          throw queryError;
        }

        if (isMounted) {
          setProjectFiles(
            (data || []) as ProjectFileRecord[]
          );
        }
      } catch (err) {
        console.error(
          'Project files query failed:',
          err
        );

        if (isMounted) {
          setSectionErrors((current) => ({
            ...current,
            files:
              getSupabaseErrorMessage(err),
          }));
        }
      }

      /*
       * PROJECT TASKS
       */
      try {
        const {
          data,
          error: queryError,
        } = await supabase
          .from('project_tasks')
          .select(`
            id,
            project_id,
            assigned_to,
            title,
            description,
            status,
            due_date,
            created_at,
            updated_at
          `)
          .eq('project_id', projectId)
          .order('created_at', {
            ascending: false,
          });

        if (queryError) {
          throw queryError;
        }

        if (isMounted) {
          setTasks(
            (data || []) as ProjectTask[]
          );
        }
      } catch (err) {
        console.error(
          'Project tasks query failed:',
          err
        );

        if (isMounted) {
          setSectionErrors((current) => ({
            ...current,
            tasks:
              getSupabaseErrorMessage(err),
          }));
        }
      }

      /*
       * PROJECT ACTIVITY
       */
      try {
        const {
          data,
          error: queryError,
        } = await supabase
          .from('audit_logs')
          .select(`
            id,
            action,
            entity_type,
            entity_id,
            details,
            created_at,
            user_id
          `)
          .eq('entity_id', projectId)
          .order('created_at', {
            ascending: false,
          })
          .limit(30);

        if (queryError) {
          throw queryError;
        }

        if (isMounted) {
          setActivities(
            (data || []) as Activity[]
          );
        }
      } catch (err) {
        console.error(
          'Project activity query failed:',
          err
        );

        if (isMounted) {
          setSectionErrors((current) => ({
            ...current,
            activity:
              getSupabaseErrorMessage(err),
          }));
        }
      }

      if (isMounted) {
        setLoading(false);
      }
    }

    loadWorkspace();

    return () => {
      isMounted = false;
    };
  }, [user, projectId]);

  /*
   * Activity helper
   */
  async function createActivity(
    action: string,
    details: Record<string, unknown>
  ) {
    if (!user || !projectId) return;

    const {
      data,
      error: activityError,
    } = await supabase
      .from('audit_logs')
      .insert([
        {
          user_id: user.id,
          action,
          entity_type: 'project',
          entity_id: projectId,
          details,
        },
      ])
      .select(`
        id,
        action,
        entity_type,
        entity_id,
        details,
        created_at,
        user_id
      `)
      .maybeSingle();

    if (activityError) {
      console.error(
        'Could not create activity:',
        activityError
      );

      return;
    }

    if (data) {
      setActivities((current) => [
        data as Activity,
        ...current,
      ]);
    }
  }

  /*
   * DOWNLOAD PROJECT DOCUMENT
   *
   * Files are stored in the Supabase
   * "project-documents" bucket.
   */
  const handleDownloadFile = async (
    file: ProjectFileRecord
  ) => {
    if (!file.storage_path) {
      setError(
        'This document does not have a valid storage path.'
      );
      return;
    }

    setDownloadingFileId(file.id);
    setError(null);
    setSuccessMessage(null);

    try {
      const {
        data,
        error: downloadError,
      } = await supabase.storage
        .from('project-documents')
        .download(file.storage_path);

      if (downloadError) {
        throw downloadError;
      }

      if (!data) {
        throw new Error(
          'Supabase did not return the document file.'
        );
      }

      const url =
        window.URL.createObjectURL(data);

      const link =
        document.createElement('a');

      link.href = url;
      link.download = file.file_name;

      document.body.appendChild(link);
      link.click();
      link.remove();

      window.URL.revokeObjectURL(url);

      setSuccessMessage(
        `"${file.file_name}" downloaded successfully.`
      );
    } catch (err) {
      console.error(
        'Document download failed:',
        err
      );

      setError(
        `The document could not be downloaded: ${getSupabaseErrorMessage(
          err
        )}`
      );
    } finally {
      setDownloadingFileId(null);
    }
  };

  /*
   * UPDATE PROGRESS
   */
  const handleUpdateProgress = async (
    event: FormEvent
  ) => {
    event.preventDefault();

    if (
      !project ||
      !projectId ||
      !isOperator ||
      !user
    ) {
      return;
    }

    setSavingProgress(true);
    setError(null);
    setSuccessMessage(null);

    const safeProgress = Math.min(
      100,
      Math.max(0, Number(progressValue))
    );

    try {
      const {
        data,
        error: updateError,
      } = await supabase
        .from('projects')
        .update({
          progress: safeProgress,
          progress_note:
            progressNote.trim() || null,
          updated_at:
            new Date().toISOString(),
        })
        .eq('id', projectId)
        .eq('operator_id', user.id)
        .select(`
          id,
          title,
          description,
          status,
          price,
          created_at,
          updated_at,
          client_id,
          operator_id,
          connector_id,
          operator_payment,
          progress,
          progress_note,
          deadline,
          priority
        `);

      if (updateError) {
        throw updateError;
      }

      if (!data || data.length === 0) {
        throw new Error(
          'The project could not be updated. Supabase returned 0 rows. This usually means your Operator account is not allowed to update this project under the current Row Level Security policy.'
        );
      }

      const updatedProject =
        data[0] as Project;

      setProject(updatedProject);

      await createActivity(
        'operator_updated_progress',
        {
          progress: safeProgress,
          progress_note:
            progressNote.trim() || null,
        }
      );

      setSuccessMessage(
        'Project progress updated successfully.'
      );
    } catch (err) {
      console.error(
        'Progress update failed:',
        err
      );

      setError(
        `Progress could not be updated: ${getSupabaseErrorMessage(
          err
        )}`
      );
    } finally {
      setSavingProgress(false);
    }
  };

  /*
   * SUBMIT FOR REVIEW
   */
  const handleSubmitForReview = async () => {
    if (
      !project ||
      !projectId ||
      !isOperator ||
      !user
    ) {
      return;
    }

    setSubmittingReview(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const {
        data,
        error: reviewError,
      } = await supabase
        .from('projects')
        .update({
          status: 'review',
          updated_at:
            new Date().toISOString(),
        })
        .eq('id', projectId)
        .eq('operator_id', user.id)
        .select(`
          id,
          title,
          description,
          status,
          price,
          created_at,
          updated_at,
          client_id,
          operator_id,
          connector_id,
          operator_payment,
          progress,
          progress_note,
          deadline,
          priority
        `);

      if (reviewError) {
        throw reviewError;
      }

      if (!data || data.length === 0) {
        throw new Error(
          'The project could not be submitted for review because the database returned 0 updated rows. Your Operator account may not currently have permission to update this project.'
        );
      }

      const updatedProject =
        data[0] as Project;

      setProject(updatedProject);

      await createActivity(
        'operator_submitted_for_admin_review',
        {
          progress:
            project.progress ??
            progressValue,
        }
      );

      setSuccessMessage(
        'Project submitted to Admin for review.'
      );
    } catch (err) {
      console.error(
        'Review submission failed:',
        err
      );

      setError(
        `The project could not be submitted for review: ${getSupabaseErrorMessage(
          err
        )}`
      );
    } finally {
      setSubmittingReview(false);
    }
  };

  /*
   * UPDATE TASK STATUS
   */
  const handleTaskStatusChange = async (
    taskId: string,
    status: string
  ) => {
    if (!isOperator || !user) return;

    setUpdatingTaskId(taskId);
    setError(null);
    setSuccessMessage(null);

    try {
      const {
        data,
        error: taskError,
      } = await supabase
        .from('project_tasks')
        .update({
          status,
          updated_at:
            new Date().toISOString(),
        })
        .eq('id', taskId)
        .eq('assigned_to', user.id)
        .select(`
          id,
          project_id,
          assigned_to,
          title,
          description,
          status,
          due_date,
          created_at,
          updated_at
        `);

      if (taskError) {
        throw taskError;
      }

      if (!data || data.length === 0) {
        throw new Error(
          'The task could not be updated because the database returned 0 rows.'
        );
      }

      const updatedTask =
        data[0] as ProjectTask;

      setTasks((current) =>
        current.map((task) =>
          task.id === taskId
            ? updatedTask
            : task
        )
      );

      await createActivity(
        'operator_updated_task',
        {
          task_id: taskId,
          status,
        }
      );

      setSuccessMessage(
        'Task status updated.'
      );
    } catch (err) {
      console.error(
        'Task update failed:',
        err
      );

      setError(
        `The task status could not be updated: ${getSupabaseErrorMessage(
          err
        )}`
      );
    } finally {
      setUpdatingTaskId(null);
    }
  };

  /*
   * GENERAL PROJECT MESSAGE
   */
  const handleSendMessage = async (
    event: FormEvent
  ) => {
    event.preventDefault();

    if (
      !newMessage.trim() ||
      !user ||
      !projectId
    ) {
      return;
    }

    setSending(true);
    setError(null);

    try {
      const recipientId =
        project?.client_id ?? null;

      const {
        data,
        error: messageError,
      } = await supabase
        .from('messages')
        .insert([
          {
            project_id: projectId,
            sender_id: user.id,
            recipient_id: recipientId,
            content:
              newMessage.trim(),
            is_internal: false,
          },
        ])
        .select(`
          id,
          content,
          sender_id,
          created_at,
          recipient_id,
          is_internal
        `);

      if (messageError) {
        throw messageError;
      }

      if (!data || data.length === 0) {
        throw new Error(
          'The message was not created. Supabase returned 0 rows.'
        );
      }

      const messageData =
        data[0] as Message;

      setMessages((current) => [
        ...current,
        messageData,
      ]);

      setNewMessage('');

      await createActivity(
        'operator_sent_project_message',
        {
          message_id:
            messageData.id,
        }
      );
    } catch (err) {
      console.error(
        'Message sending failed:',
        err
      );

      setError(
        `Your message could not be sent: ${getSupabaseErrorMessage(
          err
        )}`
      );
    } finally {
      setSending(false);
    }
  };

  /*
   * ADMIN COMMUNICATION
   */
  const handleSendAdminMessage = async (
    event: FormEvent
  ) => {
    event.preventDefault();

    if (
      !adminMessage.trim() ||
      !user ||
      !projectId
    ) {
      return;
    }

    setSendingAdminMessage(true);
    setError(null);

    try {
      const {
        data,
        error: messageError,
      } = await supabase
        .from('messages')
        .insert([
          {
            project_id: projectId,
            sender_id: user.id,
            recipient_id: null,
            content:
              adminMessage.trim(),
            is_internal: true,
          },
        ])
        .select(`
          id,
          content,
          sender_id,
          created_at,
          recipient_id,
          is_internal
        `);

      if (messageError) {
        throw messageError;
      }

      if (!data || data.length === 0) {
        throw new Error(
          'The Admin message was not created. Supabase returned 0 rows.'
        );
      }

      const messageData =
        data[0] as Message;

      setAdminMessages(
        (current) => [
          ...current,
          messageData,
        ]
      );

      setAdminMessage('');

      await createActivity(
        'operator_sent_admin_message',
        {
          message_id:
            messageData.id,
        }
      );
    } catch (err) {
      console.error(
        'Admin message sending failed:',
        err
      );

      setError(
        `Your Admin message could not be sent: ${getSupabaseErrorMessage(
          err
        )}`
      );
    } finally {
      setSendingAdminMessage(false);
    }
  };

  const projectSummary = useMemo(() => {
    if (!project) return [];

    return [
      {
        label: 'Status',
        value: formatStatus(
          project.status
        ),
      },
      {
        label: 'Deadline',
        value: formatDate(
          project.deadline
        ),
      },
      {
        label: 'Priority',
        value: formatStatus(
          project.priority
        ),
      },
    ];
  }, [project]);

  const completedTasks =
    tasks.filter(
      (task) =>
        task.status === 'completed'
    ).length;

  const progress =
    project?.progress !== null &&
    project?.progress !== undefined
      ? Math.min(
          100,
          Math.max(
            0,
            Number(project.progress)
          )
        )
      : 0;

  const canSubmitForReview =
    isOperator &&
    project?.status !== 'review' &&
    project?.status !== 'completed';

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="glass rounded-2xl p-6 border border-ink-800/50">
          <div className="flex items-center gap-3 text-white">
            <Loader2 className="w-5 h-5 animate-spin text-accent-500" />
            <span>
              Loading project workspace...
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="space-y-4">
        <Link
          to="/portal/projects"
          className="inline-flex items-center gap-2 text-sm font-medium text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to My Projects
        </Link>

        <div className="glass rounded-2xl p-8 border border-red-500/20">
          <h2 className="text-xl font-semibold text-white">
            Project unavailable
          </h2>

          <p className="mt-3 text-sm text-gray-400">
            The project itself could not be loaded.
          </p>

          {projectError && (
            <div className="mt-5 rounded-xl border border-red-500/20 bg-red-500/10 p-4">
              <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-red-400">
                Database error
              </div>

              <p className="mt-2 break-words text-sm leading-6 text-red-300">
                {projectError}
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* HEADER */}
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <Link
            to="/portal/projects"
            className="inline-flex items-center gap-2 text-sm font-medium text-gray-400 hover:text-white transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to My Projects
          </Link>

          <h2 className="text-2xl font-bold text-white">
            {project.title}
          </h2>

          <p className="mt-2 max-w-3xl text-sm text-gray-400">
            {project.description ||
              'No project description has been shared yet.'}
          </p>
        </div>

        <div
          className={`inline-flex self-start rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] ${getStatusTone(
            project.status
          )}`}
        >
          {formatStatus(
            project.status
          )}
        </div>
      </div>

      {/* WORKSPACE WARNINGS */}
      {Object.keys(sectionErrors).length > 0 && (
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4">
          <div className="text-xs font-bold uppercase tracking-[0.2em] text-amber-400">
            Some workspace features need attention
          </div>

          <div className="mt-3 space-y-2">
            {Object.entries(
              sectionErrors
            ).map(
              ([section, message]) => (
                <div
                  key={section}
                  className="text-sm text-amber-200"
                >
                  <span className="font-semibold">
                    {formatStatus(
                      section
                    )}
                    :
                  </span>{' '}
                  {message}
                </div>
              )
            )}
          </div>
        </div>
      )}

      {/* ACTION ERRORS */}
      {error && (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">
          {successMessage}
        </div>
      )}

      {/* OVERVIEW */}
      <div className="glass rounded-2xl p-6 border border-ink-800/50">
        <div className="flex items-center gap-3">
          <Sparkles className="w-5 h-5 text-accent-500" />

          <h3 className="text-lg font-medium text-white">
            Project overview
          </h3>
        </div>

        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
          {projectSummary.map(
            (item) => (
              <div
                key={item.label}
                className="rounded-2xl border border-ink-800/50 bg-white/5 p-4"
              >
                <div className="text-[11px] font-bold uppercase tracking-[0.25em] text-ink-500">
                  {item.label}
                </div>

                <div className="mt-2 text-sm font-medium text-white">
                  {item.value}
                </div>
              </div>
            )
          )}
        </div>
      </div>

      {/* OPERATOR PAYMENT */}
      {isOperator && (
        <div className="glass rounded-2xl p-6 border border-ink-800/50">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <CircleDashed className="w-5 h-5 text-accent-500" />

                <h3 className="text-lg font-medium text-white">
                  Operator payment
                </h3>
              </div>

              <p className="mt-2 text-sm text-gray-400">
                Payment assigned to you for completing this project.
              </p>
            </div>

            <div className="rounded-2xl border border-accent-500/20 bg-accent-500/10 px-6 py-4 text-right">
              <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-accent-400">
                Your payment
              </div>

              <div className="mt-1 text-2xl font-bold text-white">
                {project.operator_payment !==
                  null &&
                project.operator_payment !==
                  undefined
                  ? `KSh ${Number(
                      project.operator_payment
                    ).toLocaleString()}`
                  : 'Pending'}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[1.15fr_0.85fr] gap-6">

        <div className="space-y-6">

          {/* PROGRESS */}
          <div className="glass rounded-2xl p-6 border border-ink-800/50">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <CircleDashed className="w-5 h-5 text-accent-500" />

                <h3 className="text-lg font-medium text-white">
                  Project progress
                </h3>
              </div>

              <span className="text-xl font-bold text-white">
                {progress}%
              </span>
            </div>

            <div className="mt-6">
              <div className="h-3 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-accent-500 transition-all duration-500"
                  style={{
                    width: `${progress}%`,
                  }}
                />
              </div>
            </div>

            {project.progress_note && (
              <div className="mt-5 rounded-2xl border border-ink-800/50 bg-white/5 p-4">
                <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-ink-500">
                  Latest progress note
                </div>

                <p className="mt-2 text-sm leading-6 text-gray-300">
                  {project.progress_note}
                </p>
              </div>
            )}
          </div>

          {/* UPDATE PROGRESS */}
          {isOperator && (
            <div className="glass rounded-2xl p-6 border border-ink-800/50">
              <div>
                <h3 className="text-lg font-medium text-white">
                  Update progress
                </h3>

                <p className="mt-1 text-sm text-gray-400">
                  Keep Admin informed about your current work.
                </p>
              </div>

              <form
                onSubmit={
                  handleUpdateProgress
                }
                className="mt-6 space-y-5"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label
                      htmlFor="progress"
                      className="text-sm font-medium text-gray-300"
                    >
                      Progress
                    </label>

                    <span className="text-sm font-semibold text-accent-400">
                      {progressValue}%
                    </span>
                  </div>

                  <input
                    id="progress"
                    type="range"
                    min="0"
                    max="100"
                    value={progressValue}
                    onChange={(event) =>
                      setProgressValue(
                        Number(
                          event.target.value
                        )
                      )
                    }
                    className="w-full accent-accent-500"
                    disabled={
                      savingProgress
                    }
                  />
                </div>

                <div>
                  <label
                    htmlFor="progress-note"
                    className="block text-sm font-medium text-gray-300 mb-2"
                  >
                    Progress note
                  </label>

                  <textarea
                    id="progress-note"
                    value={progressNote}
                    onChange={(event) =>
                      setProgressNote(
                        event.target.value
                      )
                    }
                    rows={4}
                    placeholder="Describe what has been completed or what you are currently working on..."
                    className="w-full resize-none rounded-2xl border border-ink-800/50 bg-white/5 px-4 py-3 text-sm text-white placeholder-gray-500 outline-none transition focus:border-accent-500/50"
                    disabled={
                      savingProgress
                    }
                  />
                </div>

                <button
                  type="submit"
                  disabled={
                    savingProgress
                  }
                  className="inline-flex items-center gap-2 rounded-xl bg-accent-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {savingProgress ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}

                  Update Progress
                </button>
              </form>
            </div>
          )}

          {/* DEADLINE / PRIORITY */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">

            <div className="glass rounded-2xl p-6 border border-ink-800/50">
              <div className="flex items-center gap-3">
                <Clock3 className="w-5 h-5 text-accent-500" />

                <h3 className="text-lg font-medium text-white">
                  Deadline
                </h3>
              </div>

              <div className="mt-5 text-xl font-semibold text-white">
                {formatDate(
                  project.deadline
                )}
              </div>

              <p className="mt-2 text-xs text-gray-500">
                Project delivery deadline
              </p>
            </div>

            <div className="glass rounded-2xl p-6 border border-ink-800/50">
              <div className="flex items-center gap-3">
                <Flag className="w-5 h-5 text-accent-500" />

                <h3 className="text-lg font-medium text-white">
                  Priority
                </h3>
              </div>

              <div className="mt-5">
                <span
                  className={`inline-flex rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-wider ${getPriorityTone(
                    project.priority
                  )}`}
                >
                  {formatStatus(
                    project.priority
                  )}
                </span>
              </div>
            </div>

          </div>

          {/* TASKS */}
          <div className="glass rounded-2xl p-6 border border-ink-800/50">
            <div>
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-accent-500" />

                <h3 className="text-lg font-medium text-white">
                  Assigned tasks
                </h3>
              </div>

              <p className="mt-1 text-sm text-gray-400">
                {completedTasks} of {tasks.length} tasks completed
              </p>
            </div>

            {tasks.length === 0 ? (
              <div className="mt-6 rounded-2xl border border-dashed border-ink-700/70 bg-white/[0.03] p-6 text-center text-sm text-gray-400">
                No tasks have been assigned to this project yet.
              </div>
            ) : (
              <div className="mt-6 space-y-3">
                {tasks.map(
                  (task) => (
                    <div
                      key={task.id}
                      className="rounded-2xl border border-ink-800/50 bg-white/5 p-4"
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                          <div className="font-medium text-white">
                            {task.title}
                          </div>

                          {task.description && (
                            <p className="mt-1 text-sm leading-6 text-gray-400">
                              {task.description}
                            </p>
                          )}

                          <div className="mt-3 text-xs text-gray-500">
                            Due:{' '}
                            {formatDate(
                              task.due_date
                            )}
                          </div>
                        </div>

                        <div className="flex flex-col gap-2">
                          <span
                            className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${getTaskStatusTone(
                              task.status
                            )}`}
                          >
                            {formatTaskStatus(
                              task.status
                            )}
                          </span>

                          {isOperator && (
                            <select
                              value={
                                task.status ||
                                'pending'
                              }
                              onChange={(
                                event
                              ) =>
                                handleTaskStatusChange(
                                  task.id,
                                  event
                                    .target
                                    .value
                                )
                              }
                              disabled={
                                updatingTaskId ===
                                task.id
                              }
                              className="rounded-xl border border-ink-800/50 bg-white/5 px-3 py-2 text-xs text-white outline-none focus:border-accent-500/50"
                            >
                              <option value="pending">
                                Pending
                              </option>

                              <option value="in_progress">
                                In Progress
                              </option>

                              <option value="completed">
                                Completed
                              </option>

                              <option value="blocked">
                                Blocked
                              </option>
                            </select>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                )}
              </div>
            )}
          </div>

          {/* SUBMIT REVIEW */}
          {isOperator && (
            <div className="glass rounded-2xl p-6 border border-ink-800/50">
              <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                <div>
                  <h3 className="text-lg font-medium text-white">
                    Submit for Admin review
                  </h3>

                  <p className="mt-1 max-w-2xl text-sm leading-6 text-gray-400">
                    Submit the project when you have completed the current work and want Admin to review it.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={
                    handleSubmitForReview
                  }
                  disabled={
                    !canSubmitForReview ||
                    submittingReview
                  }
                  className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-accent-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-accent-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submittingReview ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}

                  {project.status ===
                  'review'
                    ? 'Submitted for Review'
                    : project.status ===
                        'completed'
                      ? 'Project Completed'
                      : 'Submit for Admin Review'}
                </button>
              </div>
            </div>
          )}

          {/* DOCUMENTS */}
          <div className="glass rounded-2xl p-6 border border-ink-800/50">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-accent-500" />

                <div>
                  <h3 className="text-lg font-medium text-white">
                    Project documents
                  </h3>

                  <p className="mt-1 text-xs text-gray-500">
                    Files attached to this project
                  </p>
                </div>
              </div>

              {projectFiles.length > 0 && (
                <span className="rounded-full border border-ink-800/50 bg-white/5 px-2.5 py-1 text-[10px] font-semibold text-gray-400">
                  {projectFiles.length}{' '}
                  {projectFiles.length === 1
                    ? 'file'
                    : 'files'}
                </span>
              )}
            </div>

            {sectionErrors.files && (
              <div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-xs leading-5 text-amber-300">
                Project documents could not be loaded.
                <br />
                {sectionErrors.files}
              </div>
            )}

            {projectFiles.length === 0 ? (
              <div className="mt-6 rounded-2xl border border-dashed border-ink-700/70 bg-white/[0.03] p-6 text-center text-sm text-gray-400">
                No project documents have been attached yet.
              </div>
            ) : (
              <div className="mt-6 space-y-3">
                {projectFiles.map(
                  (file) => (
                    <div
                      key={file.id}
                      className="rounded-2xl border border-ink-800/50 bg-white/5 p-4"
                    >
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-accent-500/20 bg-accent-500/10">
                              <FileText className="h-5 w-5 text-accent-400" />
                            </div>

                            <div className="min-w-0">
                              <div className="truncate font-medium text-white">
                                {file.file_name}
                              </div>

                              <div className="mt-1 text-xs text-gray-500">
                                Added{' '}
                                {formatDateTime(
                                  file.created_at
                                )}

                                {file.file_size
                                  ? ` • ${formatFileSize(
                                      file.file_size
                                    )}`
                                  : ''}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="flex shrink-0 items-center gap-2">
                          {file.is_internal && (
                            <span className="rounded-full border border-accent-500/20 bg-accent-500/10 px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-accent-400">
                              Internal
                            </span>
                          )}

                          <button
                            type="button"
                            onClick={() =>
                              handleDownloadFile(
                                file
                              )
                            }
                            disabled={
                              downloadingFileId ===
                              file.id
                            }
                            className="inline-flex items-center justify-center gap-2 rounded-xl border border-ink-800/50 bg-white/5 px-3 py-2 text-xs font-medium text-gray-200 transition-colors hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {downloadingFileId ===
                            file.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Download className="h-4 w-4" />
                            )}

                            {downloadingFileId ===
                            file.id
                              ? 'Downloading...'
                              : 'Download'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                )}
              </div>
            )}
          </div>

          {/* ACTIVITY */}
          <div className="glass rounded-2xl p-6 border border-ink-800/50">
            <div className="flex items-center gap-3">
              <Clock3 className="w-5 h-5 text-accent-500" />

              <h3 className="text-lg font-medium text-white">
                Project activity
              </h3>
            </div>

            {activities.length === 0 ? (
              <div className="mt-6 rounded-2xl border border-dashed border-ink-700/70 bg-white/[0.03] p-6 text-center text-sm text-gray-400">
                No project activity has been recorded yet.
              </div>
            ) : (
              <div className="mt-6 space-y-4">
                {activities.map(
                  (activity) => (
                    <div
                      key={activity.id}
                      className="relative pl-7"
                    >
                      <div className="absolute left-0 top-1.5 h-2.5 w-2.5 rounded-full bg-accent-500" />

                      <div className="text-sm font-medium text-white">
                        {activity.action
                          .replace(
                            /_/g,
                            ' '
                          )
                          .replace(
                            /\b\w/g,
                            (char) =>
                              char.toUpperCase()
                          )}
                      </div>

                      <div className="mt-1 text-xs text-gray-500">
                        {formatDateTime(
                          activity.created_at
                        )}
                      </div>
                    </div>
                  )
                )}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="space-y-6">

          {/* ADMIN COMMUNICATION */}
          {isOperator && (
            <div className="glass rounded-2xl p-6 border border-ink-800/50 flex flex-col min-h-[460px]">
              <div className="flex items-center gap-3 pb-4 border-b border-white/10">
                <MessageSquare className="w-5 h-5 text-accent-500" />

                <div>
                  <h3 className="font-medium text-white">
                    Communication with Admin
                  </h3>

                  <p className="mt-1 text-xs text-gray-500">
                    Internal project communication
                  </p>
                </div>
              </div>

              {sectionErrors.adminMessages && (
                <div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-xs leading-5 text-amber-300">
                  Admin communication could not be loaded.
                  <br />
                  {sectionErrors.adminMessages}
                </div>
              )}

              <div className="mt-4 flex-1 overflow-y-auto space-y-4 pr-2">
                {adminMessages.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-ink-700/70 bg-white/[0.03] p-6 text-center text-sm text-gray-400">
                    No Admin communication yet.
                  </div>
                ) : (
                  adminMessages.map(
                    (message) => (
                      <div
                        key={message.id}
                        className={`flex flex-col ${
                          message.sender_id ===
                          user?.id
                            ? 'items-end'
                            : 'items-start'
                        }`}
                      >
                        <div className="mb-1 flex items-center gap-2 px-1 text-[10px] text-gray-500">
                          <UserRound className="h-3 w-3" />

                          {message.sender_id ===
                          user?.id
                            ? 'You'
                            : 'Admin'}

                          <span>
                            •
                          </span>

                          {new Date(
                            message.created_at
                          ).toLocaleTimeString(
                            [],
                            {
                              hour: '2-digit',
                              minute: '2-digit',
                            }
                          )}
                        </div>

                        <div
                          className={`max-w-[90%] rounded-2xl px-4 py-2 text-sm ${
                            message.sender_id ===
                            user?.id
                              ? 'rounded-tr-sm bg-accent-600 text-white'
                              : 'rounded-tl-sm bg-white/10 text-gray-200'
                          }`}
                        >
                          {message.content}
                        </div>
                      </div>
                    )
                  )
                )}
              </div>

              <form
                onSubmit={
                  handleSendAdminMessage
                }
                className="mt-4"
              >
                <div className="rounded-2xl border border-ink-800/50 bg-white/5 p-2">
                  <textarea
                    value={adminMessage}
                    onChange={(event) =>
                      setAdminMessage(
                        event.target.value
                      )
                    }
                    rows={3}
                    placeholder="Message Admin about this project..."
                    className="w-full resize-none bg-transparent px-3 py-2 text-sm text-white placeholder-gray-500 outline-none"
                    disabled={
                      sendingAdminMessage
                    }
                  />

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={
                        !adminMessage.trim() ||
                        sendingAdminMessage
                      }
                      className="inline-flex items-center gap-2 rounded-xl bg-accent-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-500 disabled:opacity-50"
                    >
                      {sendingAdminMessage ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}

                      Send to Admin
                    </button>
                  </div>
                </div>
              </form>
            </div>
          )}

          {/* GENERAL MESSAGES */}
          <div className="glass rounded-2xl p-6 border border-ink-800/50 flex flex-col min-h-[480px]">
            <div className="flex items-center gap-3 pb-4 border-b border-white/10">
              <MessageSquare className="w-5 h-5 text-accent-500" />

              <div>
                <h3 className="font-medium text-white">
                  Project messages
                </h3>

                <p className="mt-1 text-xs text-gray-500">
                  Client-facing project conversation
                </p>
              </div>
            </div>

            {sectionErrors.messages && (
              <div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-xs leading-5 text-amber-300">
                Project messages could not be loaded.
                <br />
                {sectionErrors.messages}
              </div>
            )}

            <div className="mt-4 flex-1 overflow-y-auto space-y-4 pr-2">
              {messages.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-ink-700/70 bg-white/[0.03] p-6 text-center text-sm text-gray-400">
                  No messages yet.
                </div>
              ) : (
                messages.map(
                  (message) => (
                    <div
                      key={message.id}
                      className={`flex flex-col ${
                        message.sender_id ===
                        user?.id
                          ? 'items-end'
                          : 'items-start'
                      }`}
                    >
                      <div className="text-[10px] text-gray-500 mb-1 px-1">
                        {message.sender_id ===
                        user?.id
                          ? 'You'
                          : 'Client'}{' '}
                        •{' '}
                        {new Date(
                          message.created_at
                        ).toLocaleTimeString(
                          [],
                          {
                            hour: '2-digit',
                            minute: '2-digit',
                          }
                        )}
                      </div>

                      <div
                        className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm ${
                          message.sender_id ===
                          user?.id
                            ? 'bg-accent-600 text-white rounded-tr-sm'
                            : 'bg-white/10 text-gray-200 rounded-tl-sm'
                        }`}
                      >
                        {message.content}
                      </div>
                    </div>
                  )
                )
              )}
            </div>

            <form
              onSubmit={
                handleSendMessage
              }
              className="mt-4"
            >
              <div className="flex items-center gap-2 rounded-2xl border border-ink-800/50 bg-white/5 p-2">
                <input
                  id="project-message"
                  type="text"
                  value={newMessage}
                  onChange={(event) =>
                    setNewMessage(
                      event.target.value
                    )
                  }
                  placeholder="Type your message..."
                  className="w-full bg-transparent px-3 py-2 text-sm text-white placeholder-gray-500 outline-none"
                  disabled={sending}
                />

                <button
                  type="submit"
                  disabled={
                    !newMessage.trim() ||
                    sending
                  }
                  className="inline-flex items-center gap-2 rounded-xl bg-accent-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-500 disabled:opacity-50"
                >
                  {sending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    'Send'
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* OPERATOR REMINDER */}
          {isOperator && (
            <div className="rounded-2xl border border-accent-500/20 bg-accent-500/5 p-5">
              <div className="flex items-start gap-3">
                <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-accent-500" />

                <div>
                  <h4 className="font-medium text-white">
                    Operator workspace
                  </h4>

                  <p className="mt-1 text-sm leading-6 text-gray-400">
                    Work assigned to you is managed here. Keep progress, tasks and Admin communication up to date.
                  </p>

                  <p className="mt-3 text-xs leading-5 text-gray-500">
                    Client project pricing is intentionally hidden from your workspace.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ADMIN ACCESS */}
          {isAdmin && (
            <div className="rounded-2xl border border-accent-500/20 bg-accent-500/5 p-5">
              <div className="text-xs font-bold uppercase tracking-[0.2em] text-accent-400">
                Management access
              </div>

              <p className="mt-2 text-sm leading-6 text-gray-400">
                You are viewing this project with administrative access.
              </p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}