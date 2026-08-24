import {
  FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import {
  Archive,
  ArrowLeft,
  CheckCircle2,
  Clock3,
  FileText,
  FolderKanban,
  Loader2,
  MessageSquare,
  Paperclip,
  Search,
  Send,
  ShieldCheck,
  UserRound,
} from 'lucide-react';

interface Project {
  id: string;
  title: string;
  status: string | null;
  operator_id: string | null;
  updated_at: string | null;
}

interface Message {
  id: string;
  project_id: string;
  content: string;
  sender_id: string;
  recipient_id: string | null;
  created_at: string;
  is_internal: boolean | null;
}

interface Conversation {
  project: Project;
  messages: Message[];
  latestMessage: Message | null;
}

function formatStatus(status: string | null | undefined) {
  if (!status) return 'Pending';

  return status
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
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

function formatTime(date: string) {
  return new Date(date).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getStatusTone(status: string | null | undefined) {
  switch (status) {
    case 'completed':
      return 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400';

    case 'review':
    case 'pending_review':
      return 'border-amber-500/20 bg-amber-500/10 text-amber-400';

    case 'in_progress':
      return 'border-blue-500/20 bg-blue-500/10 text-blue-400';

    default:
      return 'border-accent-500/20 bg-accent-500/10 text-accent-400';
  }
}

function getErrorMessage(error: unknown) {
  if (!error) return 'Unknown database error.';

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

export default function Messages() {
  const { user, roles } = useAuth();

  const isOperator = roles.includes('operator');
  const isAdmin =
    roles.includes('admin') ||
    roles.includes('owner');

  const [projects, setProjects] = useState<Project[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedProjectId, setSelectedProjectId] =
    useState<string | null>(null);

  const [messageText, setMessageText] = useState('');
  const [search, setSearch] = useState('');

  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] =
    useState(false);
  const [sending, setSending] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(
    null
  );

  const messagesEndRef = useRef<HTMLDivElement | null>(
    null
  );

  /*
   * LOAD PROJECTS
   *
   * Operators see only their assigned projects.
   * Admins/Owners see projects available to their
   * management access.
   *
   * IMPORTANT:
   * The first project is NOT automatically selected.
   * The user must click a conversation first.
   */
  useEffect(() => {
    if (!user || (!isOperator && !isAdmin)) {
      setLoading(false);
      return;
    }

    const currentUserId = user.id;

    let mounted = true;

    async function loadProjects() {
      setLoading(true);
      setError(null);

      try {
        let query = supabase
          .from('projects')
          .select(`
            id,
            title,
            status,
            operator_id,
            updated_at
          `)
          .order('updated_at', {
            ascending: false,
            nullsFirst: false,
          });

        if (isOperator && !isAdmin) {
          query = query.eq('operator_id', currentUserId);
        }

        if (isAdmin && !isOperator) {
          query = query.not(
            'operator_id',
            'is',
            null
          );
        }

        const {
          data,
          error: projectError,
        } = await query;

        if (projectError) {
          throw projectError;
        }

        if (!mounted) return;

        const loadedProjects =
          (data || []) as Project[];

        setProjects(loadedProjects);

        /*
         * DO NOT automatically open the first conversation.
         *
         * If the user already selected a project and it still
         * exists, keep it selected. Otherwise leave the page
         * on the conversation list.
         */
        setSelectedProjectId(
          (current) =>
            current &&
            loadedProjects.some(
              (project) =>
                project.id === current
            )
              ? current
              : null
        );
      } catch (err) {
        console.error(
          'Messages projects query failed:',
          err
        );

        if (mounted) {
          setError(
            `Projects could not be loaded: ${getErrorMessage(
              err
            )}`
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadProjects();

    return () => {
      mounted = false;
    };
  }, [
    user,
    isOperator,
    isAdmin,
  ]);

  /*
   * LOAD INTERNAL MESSAGES
   */
  useEffect(() => {
    if (
      !user ||
      projects.length === 0 ||
      (!isOperator && !isAdmin)
    ) {
      setMessages([]);
      return;
    }

    let mounted = true;

    async function loadMessages() {
      setLoadingMessages(true);

      try {
        const projectIds =
          projects.map(
            (project) => project.id
          );

        const {
          data,
          error: messageError,
        } = await supabase
          .from('messages')
          .select(`
            id,
            project_id,
            content,
            sender_id,
            recipient_id,
            created_at,
            is_internal
          `)
          .eq('is_internal', true)
          .in('project_id', projectIds)
          .order('created_at', {
            ascending: true,
          });

        if (messageError) {
          throw messageError;
        }

        if (mounted) {
          setMessages(
            (data || []) as Message[]
          );
        }
      } catch (err) {
        console.error(
          'Internal messages query failed:',
          err
        );

        if (mounted) {
          setError(
            `Messages could not be loaded: ${getErrorMessage(
              err
            )}`
          );
        }
      } finally {
        if (mounted) {
          setLoadingMessages(false);
        }
      }
    }

    loadMessages();

    return () => {
      mounted = false;
    };
  }, [
    user,
    projects,
    isOperator,
    isAdmin,
  ]);

  /*
   * AUTO-SCROLL
   */
  useEffect(() => {
    if (!selectedProjectId) return;

    messagesEndRef.current?.scrollIntoView({
      behavior: 'smooth',
    });
  }, [
    selectedProjectId,
    messages,
  ]);

  /*
   * REALTIME INTERNAL MESSAGES
   */
  useEffect(() => {
    if (
      !user ||
      projects.length === 0
    ) {
      return;
    }

    const projectIds =
      new Set(
        projects.map(
          (project) => project.id
        )
      );

    const channel =
      supabase
        .channel(
          `operator-admin-messages-${user.id}`
        )
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
          },
          (payload) => {
            const incoming =
              payload.new as Message;

            if (
              !incoming.is_internal ||
              !projectIds.has(
                incoming.project_id
              )
            ) {
              return;
            }

            setMessages((current) => {
              if (
                current.some(
                  (message) =>
                    message.id ===
                    incoming.id
                )
              ) {
                return current;
              }

              return [
                ...current,
                incoming,
              ];
            });
          }
        )
        .subscribe();

    return () => {
      supabase.removeChannel(
        channel
      );
    };
  }, [
    user,
    projects,
  ]);

  const conversations =
    useMemo<Conversation[]>(() => {
      return projects.map(
        (project) => {
          const projectMessages =
            messages.filter(
              (message) =>
                message.project_id ===
                project.id
            );

          return {
            project,
            messages:
              projectMessages,
            latestMessage:
              projectMessages.length > 0
                ? projectMessages[
                    projectMessages.length -
                      1
                  ]
                : null,
          };
        }
      );
    }, [
      projects,
      messages,
    ]);

  const filteredConversations =
    useMemo(() => {
      const query =
        search.trim().toLowerCase();

      if (!query) {
        return conversations;
      }

      return conversations.filter(
        (conversation) => {
          const title =
            conversation.project.title.toLowerCase();

          const latest =
            conversation.latestMessage?.content
              .toLowerCase() || '';

          return (
            title.includes(query) ||
            latest.includes(query)
          );
        }
      );
    }, [
      conversations,
      search,
    ]);

  const selectedConversation =
    conversations.find(
      (conversation) =>
        conversation.project.id ===
        selectedProjectId
    ) || null;

  const selectedMessages =
    selectedConversation?.messages ||
    [];

  /*
   * SELECT CONVERSATION
   */
  const handleSelectConversation = (
    projectId: string
  ) => {
    setSelectedProjectId(projectId);
    setError(null);
    setSuccess(null);
  };

  /*
   * RETURN TO CONVERSATION LIST
   *
   * Used primarily on smaller screens so the
   * interface behaves more like WhatsApp.
   */
  const handleBackToConversations = () => {
    setSelectedProjectId(null);
    setMessageText('');
    setError(null);
    setSuccess(null);
  };

  /*
   * SEND INTERNAL MESSAGE
   */
  const handleSendMessage = async (
    event: FormEvent
  ) => {
    event.preventDefault();

    if (
      !user ||
      !selectedConversation ||
      !messageText.trim()
    ) {
      return;
    }

    setSending(true);
    setError(null);
    setSuccess(null);

    try {
      const project =
        selectedConversation.project;

      /*
       * Operator messages go to Admin.
       * Admin messages go directly to the
       * operator assigned to this project.
       */
      const recipientId =
        isAdmin && !isOperator
          ? project.operator_id
          : null;

      const {
        data,
        error: insertError,
      } = await supabase
        .from('messages')
        .insert([
          {
            project_id: project.id,
            sender_id: user.id,
            recipient_id:
              recipientId,
            content:
              messageText.trim(),
            is_internal: true,
          },
        ])
        .select(`
          id,
          project_id,
          content,
          sender_id,
          recipient_id,
          created_at,
          is_internal
        `)
        .maybeSingle();

      if (insertError) {
        throw insertError;
      }

      if (!data) {
        throw new Error(
          'Supabase did not return the newly created message.'
        );
      }

      setMessages((current) => {
        if (
          current.some(
            (message) =>
              message.id === data.id
          )
        ) {
          return current;
        }

        return [
          ...current,
          data as Message,
        ];
      });

      setMessageText('');
      setSuccess(
        'Message sent successfully.'
      );

      window.setTimeout(() => {
        setSuccess(null);
      }, 2500);
    } catch (err) {
      console.error(
        'Internal message sending failed:',
        err
      );

      setError(
        `Your message could not be sent: ${getErrorMessage(
          err
        )}`
      );
    } finally {
      setSending(false);
    }
  };

  if (!isOperator && !isAdmin) {
    return (
      <div className="glass rounded-2xl border border-red-500/20 bg-red-500/5 p-8">
        <h2 className="text-xl font-semibold text-white">
          Messages unavailable
        </h2>

        <p className="mt-2 text-sm leading-6 text-gray-400">
          This messaging center is reserved for
          Operator and Admin communication.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="glass rounded-2xl border border-ink-800/50 p-8">
        <div className="flex items-center gap-3 text-white">
          <Loader2 className="h-5 w-5 animate-spin text-accent-500" />
          <span>
            Loading messages...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* PAGE HEADER */}
      <div>
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-accent-500/20 bg-accent-500/10">
            <MessageSquare className="h-5 w-5 text-accent-400" />
          </div>

          <div>
            <h1 className="text-2xl font-bold text-white">
              Messages
            </h1>

            <p className="mt-1 text-sm text-gray-400">
              {isOperator
                ? 'Communicate privately with Admin about your assigned projects.'
                : 'Communicate privately with Operators about assigned projects.'}
            </p>
          </div>
        </div>
      </div>

      {/* ALERTS */}
      {error && (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm leading-6 text-red-300">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
          {success}
        </div>
      )}

      {/* MESSAGING CENTER */}
      <div className="grid min-h-[680px] grid-cols-1 overflow-hidden rounded-2xl border border-ink-800/50 bg-ink-950/80 shadow-2xl lg:grid-cols-[320px_1fr]">

        {/* CONVERSATIONS LIST */}
        <aside
          className={`min-h-[600px] flex-col border-b border-ink-800/50 bg-ink-950 lg:flex lg:border-b-0 lg:border-r ${
            selectedConversation
              ? 'hidden'
              : 'flex'
          }`}
        >
          <div className="border-b border-ink-800/50 p-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-white">
                  Conversations
                </div>

                <div className="mt-1 text-xs text-gray-500">
                  {conversations.length}{' '}
                  {conversations.length === 1
                    ? 'project'
                    : 'projects'}
                </div>
              </div>

              <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-accent-500/20 bg-accent-500/10">
                <ShieldCheck className="h-4 w-4 text-accent-400" />
              </div>
            </div>

            <div className="relative mt-4">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />

              <input
                type="text"
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value
                  )
                }
                placeholder="Search conversations..."
                className="w-full rounded-xl border border-ink-800/50 bg-white/5 py-2.5 pl-9 pr-3 text-sm text-white outline-none placeholder:text-gray-600 focus:border-accent-500/40"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2">
            {filteredConversations.length ===
            0 ? (
              <div className="m-3 rounded-2xl border border-dashed border-ink-700/70 bg-white/[0.03] p-6 text-center">
                <FolderKanban className="mx-auto h-7 w-7 text-gray-600" />

                <p className="mt-3 text-sm text-gray-400">
                  No project conversations found.
                </p>
              </div>
            ) : (
              filteredConversations.map(
                (conversation) => {
                  const isSelected =
                    conversation.project.id ===
                    selectedProjectId;

                  return (
                    <button
                      key={
                        conversation.project.id
                      }
                      type="button"
                      onClick={() =>
                        handleSelectConversation(
                          conversation.project.id
                        )
                      }
                      className={`mb-1 w-full rounded-2xl p-4 text-left transition-colors ${
                        isSelected
                          ? 'border border-accent-500/20 bg-accent-500/10'
                          : 'border border-transparent hover:bg-white/5'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                            isSelected
                              ? 'bg-accent-500/15 text-accent-400'
                              : 'bg-white/5 text-gray-500'
                          }`}
                        >
                          <FolderKanban className="h-4 w-4" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <div className="truncate text-sm font-medium text-white">
                              {
                                conversation
                                  .project
                                  .title
                              }
                            </div>

                            {conversation.latestMessage && (
                              <span className="shrink-0 text-[9px] text-gray-600">
                                {formatTime(
                                  conversation
                                    .latestMessage
                                    .created_at
                                )}
                              </span>
                            )}
                          </div>

                          <div className="mt-1 flex items-center gap-2">
                            <span
                              className={`rounded-full border px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider ${getStatusTone(
                                conversation
                                  .project
                                  .status
                              )}`}
                            >
                              {formatStatus(
                                conversation
                                  .project
                                  .status
                              )}
                            </span>
                          </div>

                          <p className="mt-2 truncate text-xs text-gray-500">
                            {conversation
                              .latestMessage
                              ?.content ||
                              'No messages yet.'}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                }
              )
            )}
          </div>
        </aside>

        {/* CONVERSATION */}
        <section
          className={`min-h-[600px] min-w-0 flex-col bg-[#0b0d12] lg:flex ${
            selectedConversation
              ? 'flex'
              : 'hidden'
          }`}
        >

          {selectedConversation ? (
            <>
              {/* CONVERSATION HEADER */}
              <header className="border-b border-ink-800/50 bg-ink-950/70 px-5 py-4 backdrop-blur-md">
                <div className="flex items-center justify-between gap-4">

                  <div className="flex min-w-0 items-center gap-3">

                    {/* MOBILE BACK BUTTON */}
                    <button
                      type="button"
                      onClick={
                        handleBackToConversations
                      }
                      className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-ink-800/50 bg-white/5 text-gray-400 transition-colors hover:bg-white/10 hover:text-white lg:hidden"
                      title="Back to conversations"
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </button>

                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-accent-500/20 bg-accent-500/10">
                      <FolderKanban className="h-5 w-5 text-accent-400" />
                    </div>

                    <div className="min-w-0">
                      <h2 className="truncate text-sm font-semibold text-white">
                        {
                          selectedConversation
                            .project.title
                        }
                      </h2>

                      <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
                        <ShieldCheck className="h-3.5 w-3.5 text-accent-500" />

                        {isOperator
                          ? 'Private conversation with Admin'
                          : 'Private conversation with Operator'}
                      </div>
                    </div>
                  </div>

                  <span
                    className={`shrink-0 rounded-full border px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider ${getStatusTone(
                      selectedConversation
                        .project.status
                    )}`}
                  >
                    {formatStatus(
                      selectedConversation
                        .project.status
                    )}
                  </span>
                </div>
              </header>

              {/* MESSAGES */}
              <div className="flex-1 overflow-y-auto px-5 py-6">
                {loadingMessages ? (
                  <div className="flex h-full items-center justify-center">
                    <div className="flex items-center gap-3 text-sm text-gray-400">
                      <Loader2 className="h-4 w-4 animate-spin text-accent-500" />
                      Loading conversation...
                    </div>
                  </div>
                ) : selectedMessages.length ===
                  0 ? (
                  <div className="flex h-full min-h-[400px] items-center justify-center">
                    <div className="max-w-sm text-center">
                      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-accent-500/20 bg-accent-500/10">
                        <MessageSquare className="h-6 w-6 text-accent-400" />
                      </div>

                      <h3 className="mt-4 text-base font-semibold text-white">
                        Start the conversation
                      </h3>

                      <p className="mt-2 text-sm leading-6 text-gray-500">
                        Send a message about this project.
                        This conversation is private between
                        the Operator and Admin.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-5">
                    <div className="mx-auto flex max-w-md items-center gap-3 text-center text-[10px] uppercase tracking-[0.2em] text-gray-600">
                      <div className="h-px flex-1 bg-white/5" />
                      Private project communication
                      <div className="h-px flex-1 bg-white/5" />
                    </div>

                    {selectedMessages.map(
                      (message) => {
                        const ownMessage =
                          message.sender_id ===
                          user?.id;

                        return (
                          <div
                            key={message.id}
                            className={`flex ${
                              ownMessage
                                ? 'justify-end'
                                : 'justify-start'
                            }`}
                          >
                            <div
                              className={`max-w-[82%] ${
                                ownMessage
                                  ? 'items-end'
                                  : 'items-start'
                              }`}
                            >
                              <div
                                className={`mb-1 flex items-center gap-2 px-1 text-[10px] text-gray-600 ${
                                  ownMessage
                                    ? 'justify-end'
                                    : ''
                                }`}
                              >
                                <UserRound className="h-3 w-3" />

                                {ownMessage
                                  ? 'You'
                                  : isOperator
                                    ? 'Admin'
                                    : 'Operator'}

                                <span>
                                  •
                                </span>

                                {formatTime(
                                  message.created_at
                                )}
                              </div>

                              <div
                                className={`rounded-2xl px-4 py-3 text-sm leading-6 ${
                                  ownMessage
                                    ? 'rounded-tr-sm bg-accent-600 text-white'
                                    : 'rounded-tl-sm bg-white/10 text-gray-200'
                                }`}
                              >
                                {message.content}
                              </div>

                              <div
                                className={`mt-1 px-1 text-[9px] text-gray-700 ${
                                  ownMessage
                                    ? 'text-right'
                                    : ''
                                }`}
                              >
                                {formatDateTime(
                                  message.created_at
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      }
                    )}

                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>

              {/* COMPOSER */}
              <div className="border-t border-ink-800/50 bg-ink-950/80 p-4">
                <form
                  onSubmit={
                    handleSendMessage
                  }
                >
                  <div className="rounded-2xl border border-ink-800/50 bg-white/5 p-2 focus-within:border-accent-500/30">
                    <textarea
                      value={messageText}
                      onChange={(event) =>
                        setMessageText(
                          event.target.value
                        )
                      }
                      onKeyDown={(event) => {
                        if (
                          event.key ===
                            'Enter' &&
                          !event.shiftKey
                        ) {
                          event.preventDefault();

                          if (
                            messageText.trim() &&
                            !sending
                          ) {
                            event.currentTarget.form?.requestSubmit();
                          }
                        }
                      }}
                      rows={3}
                      placeholder={
                        isOperator
                          ? 'Message Admin about this project...'
                          : 'Message the Operator about this project...'
                      }
                      disabled={sending}
                      className="w-full resize-none bg-transparent px-3 py-2 text-sm leading-6 text-white outline-none placeholder:text-gray-600"
                    />

                    <div className="flex items-center justify-between gap-3 px-1 pb-1">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled
                          title="File attachments will be enabled in the next messaging upgrade."
                          className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-gray-600 opacity-50"
                        >
                          <Paperclip className="h-4 w-4" />
                        </button>

                        <button
                          type="button"
                          disabled
                          title="File sharing will be enabled in the next messaging upgrade."
                          className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-gray-600 opacity-50"
                        >
                          <FileText className="h-4 w-4" />
                        </button>

                        <span className="hidden text-[10px] text-gray-600 sm:inline">
                          Enter to send • Shift+Enter for a new line
                        </span>
                      </div>

                      <button
                        type="submit"
                        disabled={
                          !messageText.trim() ||
                          sending
                        }
                        className="inline-flex items-center gap-2 rounded-xl bg-accent-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-500 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {sending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}

                        Send
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center p-8">
              <div className="max-w-sm text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-accent-500/20 bg-accent-500/10">
                  <MessageSquare className="h-7 w-7 text-accent-400" />
                </div>

                <h2 className="mt-5 text-lg font-semibold text-white">
                  No conversation selected
                </h2>

                <p className="mt-2 text-sm leading-6 text-gray-500">
                  Select a project from the conversations
                  list to start communicating.
                </p>
              </div>
            </div>
          )}
        </section>
      </div>

      {/* MESSAGING POLICY */}
      <div className="rounded-2xl border border-accent-500/20 bg-accent-500/5 p-5">
        <div className="flex items-start gap-3">
          <Archive className="mt-0.5 h-5 w-5 shrink-0 text-accent-500" />

          <div>
            <h3 className="text-sm font-semibold text-white">
              Private project communication
            </h3>

            <p className="mt-1 text-sm leading-6 text-gray-400">
              This messaging center is for internal
              Operator / Admin communication. Client
              communication remains handled through Admin.
            </p>

            <div className="mt-3 flex flex-wrap gap-4 text-xs text-gray-600">
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                Project aware
              </span>

              <span className="inline-flex items-center gap-1.5">
                <Clock3 className="h-3.5 w-3.5 text-accent-500" />
                Timestamped
              </span>

              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-accent-500" />
                Internal
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
