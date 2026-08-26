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
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Loader2,
  MessageSquare,
  Search,
  Send,
  ShieldCheck,
  UserRound,
  Users,
} from 'lucide-react';

interface Conversation {
  id: string;
  user_id: string;
  admin_id: string;
  subject: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  read_at: string | null;
  created_at: string;
}

interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
}

function formatDateTime(
  date: string | null | undefined
) {
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

function getErrorMessage(error: unknown) {
  if (!error) {
    return 'Unknown database error.';
  }

  if (
    typeof error === 'object' &&
    error !== null
  ) {
    const value = error as {
      message?: string;
      details?: string;
      hint?: string;
      code?: string;
    };

    const parts = [
      value.message,
      value.details,
      value.hint
        ? `Hint: ${value.hint}`
        : undefined,
      value.code
        ? `Code: ${value.code}`
        : undefined,
    ].filter(Boolean);

    if (parts.length > 0) {
      return parts.join(' • ');
    }
  }

  return String(error);
}

function getProfileName(
  profile: Profile | undefined
) {
  if (!profile) {
    return 'User';
  }

  return (
    profile.full_name ||
    profile.email ||
    'User'
  );
}

export default function Messages() {
  const { user, roles } = useAuth();

  const normalizedRoles = roles
    .map((role) =>
      String(role)
        .trim()
        .toLowerCase()
    )
    .filter(Boolean);

  const isManagement =
    normalizedRoles.includes('admin') ||
    normalizedRoles.includes('owner');

  const [conversations, setConversations] =
    useState<Conversation[]>([]);

  const [messages, setMessages] =
    useState<Message[]>([]);

  const [profiles, setProfiles] =
    useState<Profile[]>([]);

  const [
    selectedConversationId,
    setSelectedConversationId,
  ] = useState<string | null>(null);

  const [messageText, setMessageText] =
    useState('');

  const [search, setSearch] =
    useState('');

  const [loading, setLoading] =
    useState(true);

  const [loadingMessages, setLoadingMessages] =
    useState(false);

  const [sending, setSending] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [success, setSuccess] =
    useState<string | null>(null);

  const messagesEndRef =
    useRef<HTMLDivElement | null>(null);

  /*
   * LOAD CONVERSATIONS
   *
   * Normal users:
   * create/get their single Admin conversation.
   *
   * Admin/Owner:
   * see every Admin conversation.
   */
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    let mounted = true;

    async function loadConversations() {
      setLoading(true);
      setError(null);

      try {
        let loadedConversations: Conversation[] =
          [];

        if (!isManagement) {
          const {
            data: conversationId,
            error: rpcError,
          } = await supabase.rpc(
            'get_or_create_admin_portal_conversation'
          );

          if (rpcError) {
            throw rpcError;
          }

          if (!conversationId) {
            throw new Error(
              'Avelixa could not create your Admin conversation.'
            );
          }

          const {
            data,
            error: conversationError,
          } = await supabase
            .from('admin_conversations')
            .select(`
              id,
              user_id,
              admin_id,
              subject,
              status,
              created_at,
              updated_at
            `)
            .eq('id', conversationId)
            .maybeSingle();

          if (conversationError) {
            throw conversationError;
          }

          if (data) {
            loadedConversations = [
              data as Conversation,
            ];
          }
        } else {
          const {
            data,
            error: conversationError,
          } = await supabase
            .from('admin_conversations')
            .select(`
              id,
              user_id,
              admin_id,
              subject,
              status,
              created_at,
              updated_at
            `)
            .order('updated_at', {
              ascending: false,
            });

          if (conversationError) {
            throw conversationError;
          }

          loadedConversations =
            (data || []) as Conversation[];
        }

        if (!mounted) {
          return;
        }

        setConversations(
          loadedConversations
        );

        setSelectedConversationId(
          (current) => {
            if (
              current &&
              loadedConversations.some(
                (conversation) =>
                  conversation.id === current
              )
            ) {
              return current;
            }

            if (
              !isManagement &&
              loadedConversations.length === 1
            ) {
              return loadedConversations[0].id;
            }

            return null;
          }
        );
      } catch (err) {
        console.error(
          'Admin conversations query failed:',
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
          setLoading(false);
        }
      }
    }

    loadConversations();

    return () => {
      mounted = false;
    };
  }, [
    user,
    isManagement,
  ]);

  /*
   * LOAD PROFILES FOR THE CONVERSATION LIST.
   */
  useEffect(() => {
    if (
      !user ||
      conversations.length === 0
    ) {
      setProfiles([]);
      return;
    }

    let mounted = true;

    async function loadProfiles() {
      const ids = Array.from(
        new Set(
          conversations.flatMap(
            (conversation) => [
              conversation.user_id,
              conversation.admin_id,
            ]
          )
        )
      );

      const {
        data,
        error: profileError,
      } = await supabase
        .from('profiles')
        .select(`
          id,
          email,
          full_name
        `)
        .in('id', ids);

      if (profileError) {
        console.warn(
          'Could not load message profiles:',
          profileError
        );
        return;
      }

      if (mounted) {
        setProfiles(
          (data || []) as Profile[]
        );
      }
    }

    loadProfiles();

    return () => {
      mounted = false;
    };
  }, [
    user,
    conversations,
  ]);

  /*
   * LOAD ALL MESSAGES FOR THE CONVERSATIONS
   */
  useEffect(() => {
    if (
      !user ||
      conversations.length === 0
    ) {
      setMessages([]);
      return;
    }

    let mounted = true;

    async function loadMessages() {
      setLoadingMessages(true);

      try {
        const conversationIds =
          conversations.map(
            (conversation) =>
              conversation.id
          );

        const {
          data,
          error: messageError,
        } = await supabase
          .from('admin_messages')
          .select(`
            id,
            conversation_id,
            sender_id,
            recipient_id,
            content,
            read_at,
            created_at
          `)
          .in(
            'conversation_id',
            conversationIds
          )
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
          'Admin messages query failed:',
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
    conversations,
  ]);

  /*
   * REALTIME
   *
   * Postgres Changes only sends records that the
   * current user is allowed to read through RLS.
   */
  useEffect(() => {
    if (!user) {
      return;
    }

    const channel = supabase
      .channel(
        `avelixa-admin-messages-${user.id}`
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'admin_messages',
        },
        (payload) => {
          const incoming =
            payload.new as Message;

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

          /*
           * Refresh conversation ordering
           * whenever a new message arrives.
           */
          void refreshConversations();
        }
      )
      .subscribe();

    async function refreshConversations() {
      const {
        data,
        error: refreshError,
      } = await supabase
        .from('admin_conversations')
        .select(`
          id,
          user_id,
          admin_id,
          subject,
          status,
          created_at,
          updated_at
        `)
        .order('updated_at', {
          ascending: false,
        });

      if (
        !refreshError &&
        data
      ) {
        setConversations(
          data as Conversation[]
        );
      }
    }

    return () => {
      supabase.removeChannel(
        channel
      );
    };
  }, [user]);

  /*
   * AUTO SCROLL
   */
  useEffect(() => {
    if (!selectedConversationId) {
      return;
    }

    messagesEndRef.current?.scrollIntoView({
      behavior: 'smooth',
    });
  }, [
    selectedConversationId,
    messages,
  ]);

  const profileMap =
    useMemo(() => {
      return new Map(
        profiles.map((profile) => [
          profile.id,
          profile,
        ])
      );
    }, [profiles]);

  const selectedConversation =
    conversations.find(
      (conversation) =>
        conversation.id ===
        selectedConversationId
    ) || null;

  const selectedMessages =
    messages.filter(
      (message) =>
        message.conversation_id ===
        selectedConversationId
    );

  const conversationSummaries =
    useMemo(() => {
      return conversations.map(
        (conversation) => {
          const conversationMessages =
            messages.filter(
              (message) =>
                message.conversation_id ===
                conversation.id
            );

          const latestMessage =
            conversationMessages.length > 0
              ? conversationMessages[
                  conversationMessages.length - 1
                ]
              : null;

          const unreadCount =
            conversationMessages.filter(
              (message) =>
                message.read_at === null &&
                message.recipient_id ===
                  user?.id
            ).length;

          const otherProfile =
            isManagement
              ? profileMap.get(
                  conversation.user_id
                )
              : profileMap.get(
                  conversation.admin_id
                );

          return {
            conversation,
            latestMessage,
            unreadCount,
            otherProfile,
          };
        }
      );
    }, [
      conversations,
      messages,
      user,
      isManagement,
      profileMap,
    ]);

  const filteredConversations =
    useMemo(() => {
      const query =
        search.trim().toLowerCase();

      if (!query) {
        return conversationSummaries;
      }

      return conversationSummaries.filter(
        (item) => {
          const person =
            getProfileName(
              item.otherProfile
            ).toLowerCase();

          const email =
            item.otherProfile?.email
              ?.toLowerCase() || '';

          const subject =
            item.conversation.subject
              ?.toLowerCase() || '';

          const latest =
            item.latestMessage?.content
              .toLowerCase() || '';

          return (
            person.includes(query) ||
            email.includes(query) ||
            subject.includes(query) ||
            latest.includes(query)
          );
        }
      );
    }, [
      conversationSummaries,
      search,
    ]);

  /*
   * MARK MESSAGES AS READ
   */
  const markConversationRead = async (
    conversationId: string
  ) => {
    if (!user) {
      return;
    }

    const unreadMessages =
      messages.filter(
        (message) =>
          message.conversation_id ===
            conversationId &&
          message.read_at === null &&
          (
            message.recipient_id ===
              user.id ||
            isManagement
          )
      );

    if (
      unreadMessages.length === 0
    ) {
      return;
    }

    const ids =
      unreadMessages.map(
        (message) => message.id
      );

    const {
      error: updateError,
    } = await supabase
      .from('admin_messages')
      .update({
        read_at:
          new Date().toISOString(),
      })
      .in('id', ids);

    if (updateError) {
      console.warn(
        'Could not mark messages as read:',
        updateError
      );
      return;
    }

    setMessages((current) =>
      current.map((message) =>
        ids.includes(message.id)
          ? {
              ...message,
              read_at:
                new Date().toISOString(),
            }
          : message
      )
    );
  };

  /*
   * SELECT CONVERSATION
   */
  const handleSelectConversation = async (
    conversationId: string
  ) => {
    setSelectedConversationId(
      conversationId
    );

    setError(null);
    setSuccess(null);

    await markConversationRead(
      conversationId
    );
  };

  /*
   * MOBILE BACK
   */
  const handleBackToConversations =
    () => {
      setSelectedConversationId(null);
      setMessageText('');
      setError(null);
      setSuccess(null);
    };

  /*
   * SEND MESSAGE
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
      const recipientId =
        isManagement
          ? selectedConversation.user_id
          : selectedConversation.admin_id;

      const {
        data,
        error: insertError,
      } = await supabase
        .from('admin_messages')
        .insert([
          {
            conversation_id:
              selectedConversation.id,
            sender_id: user.id,
            recipient_id: recipientId,
            content:
              messageText.trim(),
          },
        ])
        .select(`
          id,
          conversation_id,
          sender_id,
          recipient_id,
          content,
          read_at,
          created_at
        `)
        .maybeSingle();

      if (insertError) {
        throw insertError;
      }

      if (!data) {
        throw new Error(
          'Supabase did not return the new message.'
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
        'Admin message sending failed:',
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

  if (!user) {
    return (
      <div className="glass rounded-2xl border border-red-500/20 bg-red-500/5 p-8">
        <h2 className="text-xl font-semibold text-white">
          Messages unavailable
        </h2>

        <p className="mt-2 text-sm text-gray-400">
          Please sign in to access Avelixa messaging.
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
            Loading Avelixa messages...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* HEADER */}
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
              {isManagement
                ? 'Manage and reply to messages from Avelixa users.'
                : 'Communicate directly with the Avelixa Admin team.'}
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
      <div className="grid min-h-[680px] grid-cols-1 overflow-hidden rounded-2xl border border-ink-800/50 bg-ink-950/80 shadow-2xl lg:grid-cols-[340px_1fr]">

        {/* CONVERSATIONS */}
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
                  {isManagement
                    ? 'User Conversations'
                    : 'Admin Conversation'}
                </div>

                <div className="mt-1 text-xs text-gray-500">
                  {conversations.length}{' '}
                  {conversations.length === 1
                    ? 'conversation'
                    : 'conversations'}
                </div>
              </div>

              <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-accent-500/20 bg-accent-500/10">
                {isManagement ? (
                  <Users className="h-4 w-4 text-accent-400" />
                ) : (
                  <ShieldCheck className="h-4 w-4 text-accent-400" />
                )}
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
                placeholder={
                  isManagement
                    ? 'Search users or messages...'
                    : 'Search messages...'
                }
                className="w-full rounded-xl border border-ink-800/50 bg-white/5 py-2.5 pl-9 pr-3 text-sm text-white outline-none placeholder:text-gray-600 focus:border-accent-500/40"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2">
            {filteredConversations.length ===
            0 ? (
              <div className="m-3 rounded-2xl border border-dashed border-ink-700/70 bg-white/[0.03] p-6 text-center">
                <MessageSquare className="mx-auto h-7 w-7 text-gray-600" />

                <p className="mt-3 text-sm text-gray-400">
                  {isManagement
                    ? 'No user conversations yet.'
                    : 'Your Admin conversation is ready.'}
                </p>
              </div>
            ) : (
              filteredConversations.map(
                (item) => {
                  const isSelected =
                    item.conversation.id ===
                    selectedConversationId;

                  const personName =
                    isManagement
                      ? getProfileName(
                          item.otherProfile
                        )
                      : 'Avelixa Admin';

                  return (
                    <button
                      key={
                        item.conversation.id
                      }
                      type="button"
                      onClick={() =>
                        handleSelectConversation(
                          item.conversation.id
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
                          {isManagement ? (
                            <UserRound className="h-4 w-4" />
                          ) : (
                            <ShieldCheck className="h-4 w-4" />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <div className="truncate text-sm font-medium text-white">
                              {personName}
                            </div>

                            {item.latestMessage && (
                              <span className="shrink-0 text-[9px] text-gray-600">
                                {formatTime(
                                  item.latestMessage.created_at
                                )}
                              </span>
                            )}
                          </div>

                          {isManagement &&
                            item.otherProfile?.email && (
                              <div className="mt-1 truncate text-[10px] text-gray-600">
                                {
                                  item.otherProfile
                                    .email
                                }
                              </div>
                            )}

                          <div className="mt-2 flex items-center gap-2">
                            <span className="rounded-full border border-accent-500/20 bg-accent-500/10 px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider text-accent-400">
                              {item.conversation.status}
                            </span>

                            {item.unreadCount >
                              0 && (
                              <span className="rounded-full bg-accent-600 px-2 py-0.5 text-[9px] font-bold text-white">
                                {item.unreadCount}
                              </span>
                            )}
                          </div>

                          <p className="mt-2 truncate text-xs text-gray-500">
                            {item.latestMessage
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
              {/* HEADER */}
              <header className="border-b border-ink-800/50 bg-ink-950/70 px-5 py-4 backdrop-blur-md">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <button
                      type="button"
                      onClick={
                        handleBackToConversations
                      }
                      className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-ink-800/50 bg-white/5 text-gray-400 transition-colors hover:bg-white/10 hover:text-white lg:hidden"
                      title="Back"
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </button>

                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-accent-500/20 bg-accent-500/10">
                      {isManagement ? (
                        <UserRound className="h-5 w-5 text-accent-400" />
                      ) : (
                        <ShieldCheck className="h-5 w-5 text-accent-400" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <h2 className="truncate text-sm font-semibold text-white">
                        {isManagement
                          ? getProfileName(
                              profileMap.get(
                                selectedConversation.user_id
                              )
                            )
                          : 'Avelixa Admin'}
                      </h2>

                      <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
                        <ShieldCheck className="h-3.5 w-3.5 text-accent-500" />

                        {isManagement
                          ? 'Admin / Owner management conversation'
                          : 'Private conversation with Admin'}
                      </div>
                    </div>
                  </div>

                  <span className="shrink-0 rounded-full border border-accent-500/20 bg-accent-500/10 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-accent-400">
                    {selectedConversation.status}
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
                        {isManagement
                          ? 'Reply to this Avelixa user here.'
                          : 'Send a message to Admin and the Avelixa management team will receive it.'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-5">
                    <div className="mx-auto flex max-w-md items-center gap-3 text-center text-[10px] uppercase tracking-[0.2em] text-gray-600">
                      <div className="h-px flex-1 bg-white/5" />
                      Private Avelixa communication
                      <div className="h-px flex-1 bg-white/5" />
                    </div>

                    {selectedMessages.map(
                      (message) => {
                        const ownMessage =
                          message.sender_id ===
                          user.id;

                        const senderProfile =
                          profileMap.get(
                            message.sender_id
                          );

                        const senderName =
                          ownMessage
                            ? 'You'
                            : isManagement
                              ? getProfileName(
                                  senderProfile
                                )
                              : 'Avelixa Admin';

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

                                {senderName}

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

                    <div
                      ref={messagesEndRef}
                    />
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
                      maxLength={5000}
                      placeholder={
                        isManagement
                          ? 'Reply to this user...'
                          : 'Message Admin...'
                      }
                      disabled={sending}
                      className="w-full resize-none bg-transparent px-3 py-2 text-sm leading-6 text-white outline-none placeholder:text-gray-600"
                    />

                    <div className="flex items-center justify-between gap-3 px-1 pb-1">
                      <div className="flex items-center gap-2">
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
                  {isManagement
                    ? 'Select a conversation'
                    : 'Your Admin conversation is ready'}
                </h2>

                <p className="mt-2 text-sm leading-6 text-gray-500">
                  {isManagement
                    ? 'Select a user from the conversation list to view and reply to their messages.'
                    : 'Select the Admin conversation from the list to start communicating with Avelixa management.'}
                </p>
              </div>
            </div>
          )}
        </section>
      </div>

      {/* POLICY */}
      <div className="rounded-2xl border border-accent-500/20 bg-accent-500/5 p-5">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-accent-500" />

          <div>
            <h3 className="text-sm font-semibold text-white">
              Avelixa Admin communication
            </h3>

            <p className="mt-1 text-sm leading-6 text-gray-400">
              Messages from Clients, Operators,
              Connectors, and Developers are sent to
              the Admin team. Admin and Owner can both
              view and reply to these conversations.
            </p>

            <div className="mt-3 flex flex-wrap gap-4 text-xs text-gray-600">
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-accent-500" />
                Admin + Owner visibility
              </span>

              <span className="inline-flex items-center gap-1.5">
                <Clock3 className="h-3.5 w-3.5 text-accent-500" />
                Timestamped
              </span>

              <span className="inline-flex items-center gap-1.5">
                <MessageSquare className="h-3.5 w-3.5 text-accent-500" />
                Realtime
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}