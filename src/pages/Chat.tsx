import { formatDistanceToNow } from 'date-fns';
import {
  ArrowLeft,
  Check,
  CheckCheck,
  MessageSquare,
  MoreHorizontal,
  Pencil,
  Search,
  Send,
  Trash2,
  UserRound,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import { toast } from 'sonner';

import LoadingSpinner from '@/components/LoadingSpinner';
import PageShell from '@/components/PageShell';
import UserAvatar from '@/components/UserAvatar';
import UserProfileDrawer from '@/components/UserProfileDrawer';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
  ResponsiveModal,
  ResponsiveModalContent,
  ResponsiveModalDescription,
  ResponsiveModalFooter,
  ResponsiveModalHeader,
  ResponsiveModalTitle,
} from '@/components/ui/responsive-modal';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import {
  deleteDmConversation,
  deleteDmMessage,
  editDmMessage,
  getDmConversations,
  getDmMessages,
  markDmRead,
  searchUsers,
  sendDmMessage,
  type DirectMessage,
  type DmConversation,
} from '@/utils/api';

type Peer = DmConversation['peer'];

export default function ChatPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [conversations, setConversations] = useState<DmConversation[]>([]);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [activePeer, setActivePeer] = useState<Peer | null>(null);
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [sending, setSending] = useState(false);
  const [draft, setDraft] = useState('');
  const [editingMsg, setEditingMsg] = useState<DirectMessage | null>(null);
  const [editDraft, setEditDraft] = useState('');
  const activePeerRef = useRef<Peer | null>(null);
  const openConversationRef = useRef<(peer: Peer) => Promise<void>>(
    async () => {},
  );

  const [newChatQuery, setNewChatQuery] = useState('');
  const [newChatResults, setNewChatResults] = useState<Peer[]>([]);
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [newChatLoading, setNewChatLoading] = useState(false);
  const newChatDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [profileUserId, setProfileUserId] = useState<string | null>(null);
  const [deleteConvTarget, setDeleteConvTarget] = useState<Peer | null>(null);
  const [deleteMsgTarget, setDeleteMsgTarget] = useState<DirectMessage | null>(
    null,
  );

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const socketRef = useRef<Socket | null>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (!user) return;
    setLoadingConvs(true);
    getDmConversations(user.id)
      .then((res) => {
        const convs: DmConversation[] = res.data.data ?? res.data ?? [];
        setConversations(convs);
      })
      .catch(() => toast.error('Could not load conversations'))
      .finally(() => setLoadingConvs(false));
  }, [user]);

  const peerId = searchParams.get('peer');
  useEffect(() => {
    if (!peerId || !user) return;
    setSearchParams({}, { replace: true });
    const existing = conversations.find((c) => c.peer.id === peerId);
    if (existing) {
      void openConversation(existing.peer);
      return;
    }
    import('@/utils/api')
      .then(({ getUserInfo }) => getUserInfo(peerId))
      .then((res) => {
        const peer = res.data.data ?? res.data;
        if (peer?.id) void openConversation(peer as Peer);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [peerId, user]);

  useEffect(() => {
    if (!user?.id) return;
    const userId = user.id;

    const socket = io(`${import.meta.env.VITE_API_BASE_URL}/chat`, {
      auth: { userId },
      transports: ['websocket'],
    });
    socketRef.current = socket;

    socket.on('dm:edited', (msg: DirectMessage) => {
      setMessages((prev) => prev.map((m) => (m.id === msg.id ? msg : m)));
    });

    socket.on('dm:deleted', ({ messageId }: { messageId: string }) => {
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
    });

    socket.on('dm:conversation-deleted', () => {
      setActivePeer((current) => {
        if (current) {
          activePeerRef.current = null;
          setMessages([]);
        }
        return null;
      });
      setConversations([]);
    });

    socket.on('dm:read', (_payload: { readBy: string }) => {
      setMessages((prev) =>
        prev.map((m) => (m.senderId === userId ? { ...m, read: true } : m)),
      );
    });

    socket.on('dm:message', (msg: DirectMessage) => {
      const peerId = msg.senderId === userId ? msg.recipientId : msg.senderId;
      const peer = msg.senderId === userId ? msg.recipient : msg.sender;

      setConversations((prev) => {
        const idx = prev.findIndex((c) => c.peer.id === peerId);
        const isUnread = msg.senderId !== userId;
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = {
            ...updated[idx],
            lastMessage: msg,
            unreadCount: isUnread
              ? updated[idx].unreadCount + 1
              : updated[idx].unreadCount,
          };
          return [updated[idx], ...updated.filter((_, i) => i !== idx)];
        }
        return [
          {
            peer: peer ?? { id: peerId, email: '' },
            lastMessage: msg,
            unreadCount: isUnread ? 1 : 0,
          },
          ...prev,
        ];
      });

      if (activePeerRef.current?.id === peerId) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
        if (msg.senderId !== userId) {
          markDmRead(userId, peerId).catch(() => {});
          setConversations((prev) =>
            prev.map((c) =>
              c.peer.id === peerId ? { ...c, unreadCount: 0 } : c,
            ),
          );
        }
      } else if (msg.senderId !== userId) {
        const senderName =
          msg.sender?.displayName ?? msg.sender?.email ?? 'Someone';
        const toastPeer = (msg.sender ?? {
          id: msg.senderId,
          email: '',
        }) as Peer;
        toast.info(`New message from ${senderName}`, {
          action: {
            label: 'Open',
            onClick: () => void openConversationRef.current(toastPeer),
          },
        });
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [user?.id]);

  const handleDeleteConversation = useCallback(async () => {
    if (!user || !deleteConvTarget) return;
    try {
      await deleteDmConversation(user.id, deleteConvTarget.id);
      setConversations((prev) =>
        prev.filter((c) => c.peer.id !== deleteConvTarget.id),
      );
      if (activePeerRef.current?.id === deleteConvTarget.id) {
        setActivePeer(null);
        activePeerRef.current = null;
        setMessages([]);
      }
      setDeleteConvTarget(null);
    } catch {
      toast.error('Could not delete conversation');
    }
  }, [user, deleteConvTarget]);

  const openConversation = useCallback(
    async (peer: Peer) => {
      if (!user) return;
      setActivePeer(peer);
      activePeerRef.current = peer;
      setLoadingMsgs(true);
      try {
        const res = await getDmMessages(user.id, peer.id);
        setMessages(res.data.data ?? res.data ?? []);
        await markDmRead(user.id, peer.id);
        setConversations((prev) =>
          prev.map((c) =>
            c.peer.id === peer.id ? { ...c, unreadCount: 0 } : c,
          ),
        );
      } catch {
        toast.error('Could not load messages');
      } finally {
        setLoadingMsgs(false);
      }
    },
    [user],
  );

  useEffect(() => {
    openConversationRef.current = openConversation;
  }, [openConversation]);

  const handleSend = useCallback(async () => {
    if (!user || !activePeer || !draft.trim()) return;
    if (activePeer.id === user.id) {
      toast.error('You cannot send a message to yourself');
      return;
    }
    const body = draft.trim();
    setDraft('');
    setSending(true);
    try {
      const res = await sendDmMessage(user.id, activePeer.id, body);
      const saved: DirectMessage = res.data.data ?? res.data;
      setMessages((prev) => {
        if (prev.some((m) => m.id === saved.id)) return prev;
        return [...prev, saved];
      });
      setConversations((prev) => {
        const idx = prev.findIndex((c) => c.peer.id === activePeer.id);
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = { ...updated[idx], lastMessage: saved };
          return [updated[idx], ...updated.filter((_, i) => i !== idx)];
        }
        return [
          { peer: activePeer, lastMessage: saved, unreadCount: 0 },
          ...prev,
        ];
      });
    } catch {
      toast.error('Could not send message');
      setDraft(body);
    } finally {
      setSending(false);
    }
  }, [user, activePeer, draft]);

  const handleEditSave = useCallback(async () => {
    if (!user || !activePeer || !editingMsg || !editDraft.trim()) return;
    try {
      const res = await editDmMessage(
        user.id,
        activePeer.id,
        editingMsg.id,
        editDraft.trim(),
      );
      const updated: DirectMessage = res.data.data ?? res.data;
      setMessages((prev) =>
        prev.map((m) => (m.id === updated.id ? updated : m)),
      );
      setEditingMsg(null);
      setEditDraft('');
    } catch {
      toast.error('Could not edit message');
    }
  }, [user, activePeer, editingMsg, editDraft]);

  const handleDeleteMessage = useCallback(async () => {
    if (!user || !activePeer || !deleteMsgTarget) return;
    try {
      await deleteDmMessage(user.id, activePeer.id, deleteMsgTarget.id);
      setMessages((prev) => prev.filter((m) => m.id !== deleteMsgTarget.id));
      setDeleteMsgTarget(null);
    } catch {
      toast.error('Could not delete message');
    }
  }, [user, activePeer, deleteMsgTarget]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  const handleNewChatSearch = (value: string) => {
    setNewChatQuery(value);
    setNewChatOpen(value.length >= 2);
    if (newChatDebounceRef.current) clearTimeout(newChatDebounceRef.current);
    if (value.length < 2) {
      setNewChatResults([]);
      return;
    }
    newChatDebounceRef.current = setTimeout(async () => {
      setNewChatLoading(true);
      try {
        const res = await searchUsers(value, user?.id);
        const users: Peer[] = res.data.data ?? res.data ?? [];
        setNewChatResults(users.filter((u) => u.id !== user?.id));
      } catch {
        setNewChatResults([]);
      } finally {
        setNewChatLoading(false);
      }
    }, 300);
  };

  const startNewChat = (peer: Peer) => {
    setNewChatQuery('');
    setNewChatResults([]);
    setNewChatOpen(false);

    const existing = conversations.find((c) => c.peer.id === peer.id);
    if (!existing) {
      setConversations((prev) => [
        { peer, lastMessage: null, unreadCount: 0 },
        ...prev,
      ]);
    }
    void openConversation(peer);
  };

  const groupedMessages = useMemo(() => {
    const groups: { date: string; msgs: DirectMessage[] }[] = [];
    for (const msg of messages) {
      const date = new Date(msg.createdAt).toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      });
      const last = groups[groups.length - 1];
      if (last && last.date === date) {
        last.msgs.push(msg);
      } else {
        groups.push({ date, msgs: [msg] });
      }
    }
    return groups;
  }, [messages]);

  if (!user) return null;

  return (
    <PageShell
      title="Messages"
      description="Direct messages between team members."
    >
      <div className="relative flex h-[calc(100vh-11.5rem)] bg-card overflow-hidden rounded-xl ring-1 ring-foreground/10">
        {/* Sidebar — hidden on mobile when chat is open */}
        <div
          className={`flex shrink-0 flex-col border-r transition-transform duration-300 ease-in-out lg:w-72 lg:translate-x-0 lg:opacity-100 ${
            activePeer
              ? 'absolute inset-y-0 left-0 z-10 w-full -translate-x-full opacity-0 lg:relative lg:flex'
              : 'relative w-full lg:w-72'
          }`}
        >
          {/* Search new chat */}
          <div className="relative flex items-center min-h-[64px] border-b p-3">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-8 text-sm"
                placeholder="Start new conversation…"
                value={newChatQuery}
                autoComplete="off"
                onChange={(e) => handleNewChatSearch(e.target.value)}
                onFocus={() => newChatQuery.length >= 2 && setNewChatOpen(true)}
                onBlur={() => setTimeout(() => setNewChatOpen(false), 150)}
              />
            </div>
            {newChatOpen && (
              <div className="absolute left-3 right-3 top-full z-50 mt-1 overflow-hidden rounded-md border bg-popover shadow-md">
                {newChatLoading ? (
                  <div className="p-3 text-sm text-muted-foreground">
                    Searching…
                  </div>
                ) : newChatResults.length ? (
                  newChatResults.map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-accent"
                      onMouseDown={() => startNewChat(u)}
                    >
                      <UserAvatar
                        src={u.avatarUrl}
                        name={u.displayName ?? u.email}
                        className="size-7 shrink-0"
                      />
                      <span className="min-w-0">
                        {u.displayName && (
                          <span className="block truncate font-medium">
                            {u.displayName}
                          </span>
                        )}
                        <span className="block truncate text-xs text-muted-foreground">
                          {u.email}
                        </span>
                      </span>
                    </button>
                  ))
                ) : (
                  <p className="p-3 text-sm text-muted-foreground">
                    No users found
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Conversation list */}
          <div className="flex-1 overflow-y-auto">
            {loadingConvs ? (
              <div className="flex h-32 items-center justify-center">
                <LoadingSpinner />
              </div>
            ) : conversations.length === 0 ? (
              <div className="flex h-32 flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
                <MessageSquare className="size-6" />
                <p>No conversations yet</p>
              </div>
            ) : (
              conversations.map((conv) => {
                const peerName = conv.peer.displayName ?? conv.peer.email;
                const isActive = activePeer?.id === conv.peer.id;

                return (
                  <button
                    key={conv.peer.id}
                    type="button"
                    className={`flex w-full items-center gap-3 px-3 py-3 text-left transition hover:bg-accent ${isActive ? 'bg-accent' : ''}`}
                    onClick={() => openConversation(conv.peer)}
                  >
                    <div className="relative shrink-0">
                      <UserAvatar
                        src={conv.peer.avatarUrl}
                        name={peerName}
                        className="size-9"
                      />
                      {conv.unreadCount > 0 && (
                        <span className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
                          {conv.unreadCount > 9 ? '9+' : conv.unreadCount}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-1">
                        <span className="truncate text-sm font-medium">
                          {peerName}
                        </span>
                        {conv.lastMessage && (
                          <span className="shrink-0 text-[10px] text-muted-foreground">
                            {formatDistanceToNow(
                              new Date(conv.lastMessage.createdAt),
                              { addSuffix: false },
                            )}
                          </span>
                        )}
                      </div>
                      {conv.lastMessage && (
                        <p
                          className={`truncate text-xs ${conv.unreadCount > 0 ? 'font-medium text-foreground' : 'text-muted-foreground'}`}
                        >
                          {conv.lastMessage.senderId === user.id ? 'You: ' : ''}
                          {conv.lastMessage.body}
                        </p>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Message pane */}
        {activePeer ? (
          <div
            className={`flex flex-col overflow-hidden transition-transform duration-300 ease-in-out lg:flex-1 lg:translate-x-0 ${
              activePeer
                ? 'absolute inset-0 z-20 flex w-full translate-x-0 lg:relative lg:inset-auto lg:z-auto'
                : 'absolute inset-0 translate-x-full lg:hidden'
            }`}
          >
            {/* Header */}
            <div className="flex items-center gap-3 border-b px-4 py-3">
              <Button
                variant="ghost"
                size="icon"
                className="mr-1 lg:hidden"
                onClick={() => {
                  setActivePeer(null);
                  activePeerRef.current = null;
                }}
              >
                <ArrowLeft className="size-5" />
              </Button>
              <button
                type="button"
                className="rounded-full"
                onClick={() => setProfileUserId(activePeer.id)}
              >
                <UserAvatar
                  src={activePeer.avatarUrl}
                  name={activePeer.displayName ?? activePeer.email}
                  className="size-9"
                />
              </button>
              <div className="min-w-0">
                <p className="truncate font-medium">
                  {activePeer.displayName ?? activePeer.email}
                </p>
                {activePeer.displayName && (
                  <p className="truncate text-xs text-muted-foreground">
                    {activePeer.email}
                  </p>
                )}
              </div>
              <div className="ml-auto flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setProfileUserId(activePeer.id)}
                >
                  <UserRound className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => setDeleteConvTarget(activePeer)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4">
              {loadingMsgs ? (
                <div className="flex h-full items-center justify-center">
                  <LoadingSpinner />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
                  <MessageSquare className="size-8" />
                  <p>
                    Start the conversation with{' '}
                    <span className="font-medium text-foreground">
                      {activePeer.displayName ?? activePeer.email}
                    </span>
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {groupedMessages.map(({ date, msgs }) => (
                    <div key={date}>
                      <div className="relative mb-4 flex items-center">
                        <div className="flex-1 border-t" />
                        <Badge
                          variant="outline"
                          className="mx-3 shrink-0 text-xs font-normal text-muted-foreground"
                        >
                          {date}
                        </Badge>
                        <div className="flex-1 border-t" />
                      </div>
                      <div className="space-y-1">
                        {msgs.map((msg, idx) => {
                          const isMine = msg.senderId === user.id;
                          const showAvatar =
                            !isMine &&
                            (idx === 0 ||
                              msgs[idx - 1]?.senderId !== msg.senderId);
                          const isEditing = editingMsg?.id === msg.id;

                          return (
                            <div
                              key={msg.id}
                              className={`group flex items-end gap-1 ${isMine ? 'flex-row-reverse' : 'flex-row'}`}
                            >
                              {!isMine && (
                                <div className="mb-0.5 w-7 shrink-0">
                                  {showAvatar && (
                                    <UserAvatar
                                      src={activePeer.avatarUrl}
                                      name={
                                        activePeer.displayName ??
                                        activePeer.email
                                      }
                                      className="size-7"
                                    />
                                  )}
                                </div>
                              )}

                              <div className="flex max-w-[70%] flex-col">
                                {isEditing ? (
                                  <div className="flex flex-col gap-1">
                                    <Textarea
                                      className="min-h-8 resize-none text-sm"
                                      value={editDraft}
                                      autoFocus
                                      onChange={(e) =>
                                        setEditDraft(e.target.value)
                                      }
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                          e.preventDefault();
                                          void handleEditSave();
                                        }
                                        if (e.key === 'Escape') {
                                          setEditingMsg(null);
                                          setEditDraft('');
                                        }
                                      }}
                                    />
                                    <div className="flex justify-end gap-1">
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        className="size-6"
                                        onClick={() => {
                                          setEditingMsg(null);
                                          setEditDraft('');
                                        }}
                                      >
                                        <X className="size-3" />
                                      </Button>
                                      <Button
                                        size="icon"
                                        className="size-6"
                                        disabled={
                                          !editDraft.trim() ||
                                          editDraft === msg.body
                                        }
                                        onClick={handleEditSave}
                                      >
                                        <Check className="size-3" />
                                      </Button>
                                    </div>
                                  </div>
                                ) : (
                                  <div
                                    className={`rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${
                                      isMine
                                        ? 'rounded-br-sm bg-primary text-primary-foreground'
                                        : 'rounded-bl-sm bg-muted'
                                    }`}
                                  >
                                    <p className="whitespace-pre-wrap break-words">
                                      {msg.body}
                                    </p>
                                    <div
                                      className={`mt-0.5 flex items-center justify-end gap-1 text-[10px] ${
                                        isMine
                                          ? 'text-primary-foreground/60'
                                          : 'text-muted-foreground'
                                      }`}
                                    >
                                      {msg.edited && (
                                        <span className="italic">edited</span>
                                      )}
                                      <span>
                                        {new Date(
                                          msg.createdAt,
                                        ).toLocaleTimeString([], {
                                          hour: '2-digit',
                                          minute: '2-digit',
                                        })}
                                      </span>
                                      {isMine && (
                                        <span
                                          title={msg.read ? 'Read' : 'Sent'}
                                        >
                                          {msg.read ? (
                                            <CheckCheck className="size-3" />
                                          ) : (
                                            <Check className="size-3" />
                                          )}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>

                              {isMine && !isEditing && (
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="mb-1 size-6 opacity-0 transition-opacity group-hover:opacity-100"
                                    >
                                      <MoreHorizontal className="size-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem
                                      onClick={() => {
                                        setEditingMsg(msg);
                                        setEditDraft(msg.body);
                                      }}
                                    >
                                      <Pencil className="mr-2 size-4" />
                                      Edit
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      variant="destructive"
                                      onClick={() => setDeleteMsgTarget(msg)}
                                    >
                                      <Trash2 className="mr-2 size-4" />
                                      Delete
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="border-t px-4 py-3">
              <div className="flex items-end gap-2">
                <Textarea
                  ref={textareaRef}
                  className="max-h-24 min-h-px flex-1 resize-none"
                  placeholder={`Message ${activePeer.displayName ?? activePeer.email}…`}
                  value={draft}
                  rows={1}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={handleKeyDown}
                />
                <Button
                  size="icon-lg"
                  className="size-[38px]"
                  disabled={!draft.trim() || sending}
                  onClick={handleSend}
                  aria-label="Send"
                >
                  <Send />
                </Button>
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Enter to send · Shift+Enter for new line
              </p>
            </div>
          </div>
        ) : (
          <div className="hidden flex-1 flex-col items-center justify-center gap-3 text-center text-muted-foreground lg:flex">
            <MessageSquare className="size-10" />
            <div>
              <p className="font-medium text-foreground">
                Select a conversation
              </p>
              <p className="mt-1 text-sm">or search above to start a new one</p>
            </div>
          </div>
        )}
      </div>

      <ResponsiveModal
        open={!!deleteConvTarget}
        onOpenChange={(open) => !open && setDeleteConvTarget(null)}
      >
        <ResponsiveModalContent showCloseButton={false}>
          <ResponsiveModalHeader>
            <ResponsiveModalTitle>Delete conversation?</ResponsiveModalTitle>
            <ResponsiveModalDescription>
              All messages with{' '}
              <span className="font-medium text-foreground">
                {deleteConvTarget?.displayName ?? deleteConvTarget?.email}
              </span>{' '}
              will be permanently deleted for both sides.
            </ResponsiveModalDescription>
          </ResponsiveModalHeader>
          <ResponsiveModalFooter>
            <Button variant="outline" onClick={() => setDeleteConvTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteConversation}>
              Delete
            </Button>
          </ResponsiveModalFooter>
        </ResponsiveModalContent>
      </ResponsiveModal>

      <ResponsiveModal
        open={!!deleteMsgTarget}
        onOpenChange={(open) => !open && setDeleteMsgTarget(null)}
      >
        <ResponsiveModalContent showCloseButton={false}>
          <ResponsiveModalHeader>
            <ResponsiveModalTitle>Delete message?</ResponsiveModalTitle>
            <ResponsiveModalDescription>
              This message will be permanently deleted for both sides.
            </ResponsiveModalDescription>
          </ResponsiveModalHeader>
          <ResponsiveModalFooter>
            <Button variant="outline" onClick={() => setDeleteMsgTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteMessage}>
              Delete
            </Button>
          </ResponsiveModalFooter>
        </ResponsiveModalContent>
      </ResponsiveModal>

      <UserProfileDrawer
        userId={profileUserId}
        onClose={() => setProfileUserId(null)}
        onMessage={(id) => navigate(`/chat?peer=${id}`)}
        currentUserId={user.id}
      />
    </PageShell>
  );
}
