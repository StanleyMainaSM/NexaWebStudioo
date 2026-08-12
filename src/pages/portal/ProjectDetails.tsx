import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { ArrowLeft, CircleDashed, FileText, Loader2, MessageSquare, Sparkles } from 'lucide-react';

interface Project {
  id: string;
  title: string;
  description: string | null;
  status: string | null;
  price: number | null;
  created_at: string;
}

interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  sender?: { email?: string | null } | null;
}

interface ProjectFileRecord {
  id: string;
  file_name: string;
  created_at: string;
  storage_path: string;
}

function formatStatus(status: string | null | undefined) {
  if (!status) return 'Pending';
  return status.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

function getStatusTone(status: string | null | undefined) {
  if (!status) {
    return 'border-accent-500/20 bg-accent-500/10 text-accent-400';
  }

  if (status === 'completed') {
    return 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400';
  }

  if (status === 'review') {
    return 'border-amber-500/20 bg-amber-500/10 text-amber-400';
  }

  return 'border-accent-500/20 bg-accent-500/10 text-accent-400';
}

export default function ProjectDetails() {
  const { projectId } = useParams();
  const { user } = useAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [projectFiles, setProjectFiles] = useState<ProjectFileRecord[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !projectId) {
      setLoading(false);
      return;
    }

    let isMounted = true;

    async function loadProjectAndMessages() {
      setLoading(true);
      setError(null);

      try {
        const { data: projectData, error: projectError } = await supabase
          .from('projects')
          .select('id, title, description, status, price, created_at')
          .eq('id', projectId)
          .single();

        if (projectError) throw projectError;

        const { data: messagesData, error: messagesError } = await supabase
          .from('messages')
          .select('id, content, sender_id, created_at, sender:profiles(email)')
          .eq('project_id', projectId)
          .order('created_at', { ascending: true });

        const { data: filesData, error: filesError } = await supabase
          .from('project_files')
          .select('id, file_name, created_at, storage_path')
          .eq('project_id', projectId)
          .order('created_at', { ascending: false });

        if (messagesError) throw messagesError;
        if (filesError) throw filesError;

        if (!isMounted) return;
        setProject(projectData as Project);
        setMessages(
          ((messagesData || []) as Array<{
            id: string;
            content: string;
            sender_id: string;
            created_at: string;
            sender?: { email?: string | null } | null;
          }>).map((message) => ({
            ...message,
            sender: message.sender ?? null,
          })) as Message[]
        );
        setProjectFiles((filesData || []) as ProjectFileRecord[]);
      } catch (err) {
        console.error('Error loading project details', err);
        if (isMounted) {
          setError('This project is unavailable or you do not have access to it.');
          setProject(null);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadProjectAndMessages();

    return () => {
      isMounted = false;
    };
  }, [user, projectId]);

  const handleSendMessage = async (e: FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || !projectId) return;
    setSending(true);

    try {
      const { data, error } = await supabase
        .from('messages')
        .insert([{ project_id: projectId, sender_id: user.id, content: newMessage }])
        .select('id, content, sender_id, created_at, sender:profiles(email)')
        .single();

      if (error) throw error;

      const normalizedMessage = {
        ...(data as {
          id: string;
          content: string;
          sender_id: string;
          created_at: string;
          sender?: { email?: string | null } | null;
        }),
        sender: (data as { sender?: { email?: string | null } | null }).sender ?? null,
      };

      setMessages((current) => [...current, normalizedMessage as Message]);
      setNewMessage('');
    } catch (err) {
      console.error('Error sending message', err);
      setError('Your message could not be sent right now. Please try again shortly.');
    } finally {
      setSending(false);
    }
  };

  const projectSummary = useMemo(() => {
    if (!project) return null;

    return [
      { label: 'Status', value: formatStatus(project.status) },
      { label: 'Created', value: new Date(project.created_at).toLocaleDateString() },
      { label: 'Budget', value: project.price !== null && project.price !== undefined ? `KSh ${Number(project.price).toLocaleString()}` : 'Pending' },
    ];
  }, [project]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="glass rounded-2xl p-6 border border-ink-800/50">
          <div className="flex items-center gap-3 text-white">
            <Loader2 className="w-5 h-5 animate-spin text-accent-500" />
            <span>Loading project workspace…</span>
          </div>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="space-y-4">
        <Link to="/portal/projects" className="inline-flex items-center gap-2 text-sm font-medium text-gray-400 hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to My Projects
        </Link>
        <div className="glass rounded-2xl p-12 text-center border border-ink-800/50">
          <h2 className="text-xl font-semibold text-white">Project unavailable</h2>
          <p className="mt-3 text-sm text-gray-400">{error || 'This project could not be opened right now.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <Link to="/portal/projects" className="inline-flex items-center gap-2 text-sm font-medium text-gray-400 hover:text-white transition-colors mb-4">
            <ArrowLeft className="w-4 h-4" />
            Back to My Projects
          </Link>
          <h2 className="text-2xl font-bold text-white">{project.title}</h2>
          {project.description ? (
            <p className="mt-2 max-w-2xl text-sm text-gray-400">{project.description}</p>
          ) : (
            <p className="mt-2 max-w-2xl text-sm text-gray-400">No project description has been shared yet.</p>
          )}
        </div>

        <div className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] ${getStatusTone(project.status)}`}>
          {formatStatus(project.status)}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-6">
        <div className="space-y-6">
          <div className="glass rounded-2xl p-6 border border-ink-800/50">
            <div className="flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-accent-500" />
              <h3 className="text-lg font-medium text-white">Project overview</h3>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              {projectSummary?.map((item) => (
                <div key={item.label} className="rounded-2xl border border-ink-800/50 bg-white/5 p-4">
                  <div className="text-[11px] font-bold uppercase tracking-[0.25em] text-ink-500">{item.label}</div>
                  <div className="mt-2 text-sm font-medium text-white">{item.value}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="glass rounded-2xl p-6 border border-ink-800/50">
            <div className="flex items-center gap-3">
              <CircleDashed className="w-5 h-5 text-accent-500" />
              <h3 className="text-lg font-medium text-white">Project progress</h3>
            </div>
            <div className="mt-6 rounded-2xl border border-dashed border-ink-700/70 bg-white/[0.03] p-6 text-center text-sm text-gray-400">
              {project.status ? `Current status: ${formatStatus(project.status)}.` : 'Project status is pending.'}
              {project.price !== null && project.price !== undefined ? ` Budget is set at KSh ${Number(project.price).toLocaleString()}.` : ' Budget is still being confirmed.'}
            </div>
          </div>

          <div className="glass rounded-2xl p-6 border border-ink-800/50">
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-accent-500" />
              <h3 className="text-lg font-medium text-white">Project documents</h3>
            </div>
            {projectFiles.length === 0 ? (
              <div className="mt-6 rounded-2xl border border-dashed border-ink-700/70 bg-white/[0.03] p-6 text-center text-sm text-gray-400">
                No project documents have been attached yet.
              </div>
            ) : (
              <div className="mt-6 space-y-3">
                {projectFiles.map((file) => (
                  <div key={file.id} className="rounded-2xl border border-ink-800/50 bg-white/5 p-4 text-sm text-gray-300">
                    <div className="font-medium text-white">{file.file_name}</div>
                    <div className="mt-1 text-xs text-gray-500">Added {new Date(file.created_at).toLocaleDateString()}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="glass rounded-2xl p-6 border border-ink-800/50 flex flex-col min-h-[480px]">
          <div className="flex items-center gap-3 pb-4 border-b border-white/10">
            <MessageSquare className="w-5 h-5 text-accent-500" />
            <h3 className="font-medium text-white">Project messages</h3>
          </div>

          <div className="mt-4 flex-1 overflow-y-auto space-y-4 pr-2">
            {messages.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-ink-700/70 bg-white/[0.03] p-6 text-center text-sm text-gray-400">
                No messages yet. Start the conversation.
              </div>
            ) : (
              messages.map((msg) => (
                <div key={msg.id} className={`flex flex-col ${msg.sender_id === user?.id ? 'items-end' : 'items-start'}`}>
                  <div className="text-[10px] text-gray-500 mb-1 px-1">
                    {msg.sender?.email?.split('@')[0] || 'User'} • {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <div className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm ${msg.sender_id === user?.id ? 'bg-accent-600 text-white rounded-tr-sm' : 'bg-white/10 text-gray-200 rounded-tl-sm'}`}>
                    {msg.content}
                  </div>
                </div>
              ))
            )}
          </div>

          <form onSubmit={handleSendMessage} className="mt-4">
            <label className="sr-only" htmlFor="project-message">Send a message</label>
            <div className="flex items-center gap-2 rounded-2xl border border-ink-800/50 bg-white/5 p-2">
              <input
                id="project-message"
                type="text"
                value={newMessage}
                onChange={(event) => setNewMessage(event.target.value)}
                placeholder="Type your message..."
                className="w-full bg-transparent px-3 py-2 text-sm text-white placeholder-gray-500 outline-none"
                disabled={sending}
              />
              <button
                type="submit"
                disabled={!newMessage.trim() || sending}
                className="inline-flex items-center gap-2 rounded-xl bg-accent-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-500 disabled:opacity-50"
              >
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send'}
              </button>
            </div>
            {error ? <p className="mt-2 text-sm text-red-400">{error}</p> : null}
          </form>
        </div>
      </div>
    </div>
  );
}
