import React, { useState, useEffect, useRef } from 'react';
import { ChatThread, ChatMessage, User, Course } from '../../types';
import { StorageService } from '../../services/storage';
import {
  Send,
  MessageSquare,
  Search,
  UserCheck,
  Clock,
  Sparkles,
  ShieldCheck,
  Plus,
  Edit2,
  Check,
  X,
  AlertCircle,
  GraduationCap,
  Shield,
} from 'lucide-react';

interface InstructorMessagingHubProps {
  currentUser: User;
  allUsers: User[];
  courses: Course[];
}

export const InstructorMessagingHub: React.FC<InstructorMessagingHubProps> = ({
  currentUser,
  allUsers,
  courses,
}) => {
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string>('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [searchThread, setSearchThread] = useState('');
  const [isNewThreadOpen, setIsNewThreadOpen] = useState(false);

  // Edit message state (1 edit allowed within 15 minutes of sending)
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editContentText, setEditContentText] = useState<string>('');
  const [editError, setEditError] = useState<string | null>(null);

  // New thread form state
  const [selectedRecipientId, setSelectedRecipientId] = useState('');
  const [newThreadCourse, setNewThreadCourse] = useState(courses[0]?.code || 'BUS101');
  const [firstMessageText, setFirstMessageText] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Reload threads and messages
  const loadChatData = () => {
    const loadedThreads = StorageService.getChatThreads(currentUser.id);
    setThreads(loadedThreads);
    if (loadedThreads.length > 0 && !activeThreadId) {
      setActiveThreadId(loadedThreads[0].id);
    }
  };

  useEffect(() => {
    loadChatData();
  }, [currentUser.id]);

  useEffect(() => {
    if (activeThreadId) {
      const msgs = StorageService.getChatMessages(activeThreadId);
      setMessages(msgs);
    }
  }, [activeThreadId]);

  // Listen to cross-client real-time sync events
  useEffect(() => {
    const handleSync = () => {
      const loadedThreads = StorageService.getChatThreads(currentUser.id);
      setThreads(loadedThreads);
      if (activeThreadId) {
        setMessages(StorageService.getChatMessages(activeThreadId));
      }
    };
    window.addEventListener('at_academics_data_updated', handleSync);
    window.addEventListener('at_academics_local_change', handleSync);
    return () => {
      window.removeEventListener('at_academics_data_updated', handleSync);
      window.removeEventListener('at_academics_local_change', handleSync);
    };
  }, [currentUser.id, activeThreadId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const activeThread = threads.find((t) => t.id === activeThreadId);

  // Find other participant in thread
  const otherParticipant =
    activeThread?.participants.find((p) => p.id !== currentUser.id) ||
    activeThread?.participants[0];

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !activeThreadId) return;

    const sent = StorageService.sendMessage({
      threadId: activeThreadId,
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderRole: currentUser.role,
      content: messageInput.trim(),
    });

    setMessages((prev) => [...prev, sent]);
    setMessageInput('');
    setThreads(StorageService.getChatThreads(currentUser.id));
  };

  const handleStartEdit = (msg: ChatMessage) => {
    setEditError(null);
    setEditingMessageId(msg.id);
    setEditContentText(msg.content);
  };

  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditContentText('');
    setEditError(null);
  };

  const handleSaveEdit = (messageId: string) => {
    if (!editContentText.trim()) return;

    const res = StorageService.editChatMessage(messageId, currentUser.id, editContentText.trim());
    if (res.success) {
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? res.message! : m))
      );
      setEditingMessageId(null);
      setEditContentText('');
      setEditError(null);
      setThreads(StorageService.getChatThreads(currentUser.id));
    } else {
      setEditError(res.error || 'Failed to edit message.');
    }
  };

  const canEditMessage = (msg: ChatMessage): boolean => {
    if (msg.senderId !== currentUser.id) return false;
    if ((msg.editCount || 0) >= 1) return false;
    const sentTime = new Date(msg.timestamp).getTime();
    const now = Date.now();
    const diffMinutes = (now - sentTime) / (1000 * 60);
    return diffMinutes <= 15;
  };

  const handleStartNewThread = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecipientId || !firstMessageText.trim()) return;

    const recipient = allUsers.find((u) => u.id === selectedRecipientId);
    if (!recipient) return;

    const newThread = StorageService.createThread({
      courseCode: newThreadCourse,
      courseTitle: courses.find((c) => c.code === newThreadCourse)?.title || '',
      participants: [
        {
          id: currentUser.id,
          name: currentUser.name,
          role: currentUser.role,
          email: currentUser.email,
        },
        {
          id: recipient.id,
          name: recipient.name,
          role: recipient.role,
          email: recipient.email,
        },
      ],
      firstMessage: firstMessageText.trim(),
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderRole: currentUser.role,
    });

    setIsNewThreadOpen(false);
    setSelectedRecipientId('');
    setFirstMessageText('');

    const updatedThreads = StorageService.getChatThreads(currentUser.id);
    setThreads(updatedThreads);
    setActiveThreadId(newThread.id);
  };

  const filteredThreads = threads.filter((t) => {
    const names = t.participants.map((p) => p.name).join(' ');
    const code = t.courseCode || '';
    return (
      names.toLowerCase().includes(searchThread.toLowerCase()) ||
      code.toLowerCase().includes(searchThread.toLowerCase())
    );
  });

  // Eligible recipients: students can text Admin, Teachers, and peers.
  // All other users except current user are listed with role badges.
  const eligibleRecipients = allUsers.filter((u) => u.id !== currentUser.id);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Real-Time Academic Messaging & Communications
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Persistent, synchronous discussion channels between students, instructors, and administrators with permanent history retention.
          </p>
        </div>

        <button
          onClick={() => {
            setIsNewThreadOpen(true);
            setEditError(null);
          }}
          className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded-xl hover:bg-slate-800 transition-colors shadow-2xs"
        >
          <Plus className="w-4 h-4" />
          <span>New Discussion Thread</span>
        </button>
      </div>

      {editError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center justify-between text-xs text-red-700">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{editError}</span>
          </div>
          <button onClick={() => setEditError(null)} className="text-red-500 hover:text-red-800">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Messaging Interface Container */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs grid grid-cols-1 md:grid-cols-12 h-[640px]">
        {/* Left: Threads List (4 cols) */}
        <div className="md:col-span-4 border-r border-slate-200 flex flex-col h-full bg-slate-50/40">
          <div className="p-3 border-b border-slate-200 bg-white">
            <div className="flex items-center gap-2 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg">
              <Search className="w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                value={searchThread}
                onChange={(e) => setSearchThread(e.target.value)}
                placeholder="Search conversations..."
                className="w-full text-xs bg-transparent border-none focus:outline-none text-slate-900 placeholder:text-slate-400"
              />
            </div>
          </div>

          {/* Thread items */}
          <div className="overflow-y-auto flex-1 divide-y divide-slate-100">
            {filteredThreads.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">
                No active messaging threads found. Click &quot;New Discussion Thread&quot; to begin.
              </div>
            ) : (
              filteredThreads.map((thread) => {
                const partner =
                  thread.participants.find((p) => p.id !== currentUser.id) ||
                  thread.participants[0];
                const isActive = thread.id === activeThreadId;

                const roleBadgeClass =
                  partner?.role === 'admin'
                    ? 'bg-purple-100 text-purple-800 font-bold'
                    : partner?.role === 'teacher'
                    ? 'bg-blue-100 text-blue-800 font-bold'
                    : 'bg-emerald-100 text-emerald-800 font-bold';

                return (
                  <button
                    key={thread.id}
                    onClick={() => {
                      setActiveThreadId(thread.id);
                      setEditingMessageId(null);
                      setEditError(null);
                    }}
                    className={`w-full text-left p-3.5 transition-colors ${
                      isActive
                        ? 'bg-white font-medium border-l-2 border-slate-900 shadow-2xs'
                        : 'hover:bg-slate-100/70'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-xs font-bold text-slate-900 truncate">
                          {partner?.name || 'Academic Discussion'}
                        </span>
                        <span className={`text-[9px] font-mono uppercase px-1.5 py-0.2 rounded shrink-0 ${roleBadgeClass}`}>
                          {partner?.role === 'teacher' ? 'Instructor' : partner?.role}
                        </span>
                      </div>
                      {thread.courseCode && (
                        <span className="text-[10px] font-mono text-slate-600 bg-slate-100 px-1 rounded shrink-0">
                          {thread.courseCode}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 truncate leading-relaxed">
                      {thread.lastMessage}
                    </p>
                    <div className="mt-1 text-[10px] font-mono text-slate-400 flex items-center justify-between">
                      <span>
                        {new Date(thread.lastMessageTimestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      <span className="text-slate-300">Permanent History</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Active Chat Conversation (8 cols) */}
        <div className="md:col-span-8 flex flex-col h-full bg-white">
          {activeThread ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-white">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-xs shadow-2xs">
                    {otherParticipant?.name.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-slate-900">
                        {otherParticipant?.name}
                      </h3>
                      <span
                        className={`text-[10px] font-mono uppercase px-1.5 py-0.5 rounded font-semibold ${
                          otherParticipant?.role === 'admin'
                            ? 'bg-purple-100 text-purple-800'
                            : otherParticipant?.role === 'teacher'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {otherParticipant?.role === 'teacher' ? 'Instructor' : otherParticipant?.role}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono">
                      {activeThread.courseCode || 'Direct'} · Permanent Academic Message Channel
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Real-Time Sync Active</span>
                </div>
              </div>

              {/* Messages Body */}
              <div className="p-4 overflow-y-auto flex-1 space-y-3.5 bg-slate-50/20">
                {messages.length === 0 ? (
                  <div className="text-center p-8 text-xs text-slate-400">
                    No messages yet in this conversation. Send a message below.
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isMe = msg.senderId === currentUser.id;
                    const isEditingThis = editingMessageId === msg.id;
                    const canEdit = canEditMessage(msg);

                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} group`}
                      >
                        {/* Sender, Time, Edit Flag */}
                        <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400 mb-1 px-1">
                          <span className="font-semibold text-slate-600">{msg.senderName}</span>
                          <span>·</span>
                          <span>
                            {new Date(msg.timestamp).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                          {msg.editCount && msg.editCount > 0 ? (
                            <span className="text-amber-600 font-semibold">(edited)</span>
                          ) : null}
                          {isMe && canEdit && !isEditingThis && (
                            <button
                              onClick={() => handleStartEdit(msg)}
                              className="opacity-0 group-hover:opacity-100 transition-opacity ml-1 text-slate-500 hover:text-slate-900 inline-flex items-center gap-0.5"
                              title="Edit sent message (1 time allowed within 15 minutes)"
                            >
                              <Edit2 className="w-2.5 h-2.5" />
                              <span className="text-[9px]">Edit</span>
                            </button>
                          )}
                        </div>

                        {/* Assignment Quote tag if present */}
                        {msg.assignmentContext && (
                          <div className="mb-1 text-[11px] bg-slate-100 border border-slate-200 rounded px-2 py-0.5 text-slate-700 font-mono">
                            Re: {msg.assignmentContext.assignmentTitle}
                          </div>
                        )}

                        {/* Message Bubble or Inline Edit Form */}
                        {isEditingThis ? (
                          <div className="w-full max-w-md p-3 bg-white rounded-2xl border border-slate-300 shadow-sm space-y-2">
                            <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
                              <span className="font-semibold text-slate-700">Edit Message</span>
                              <span>1 edit allowed within 15 mins</span>
                            </div>
                            <textarea
                              value={editContentText}
                              onChange={(e) => setEditContentText(e.target.value)}
                              rows={3}
                              className="w-full p-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
                              autoFocus
                            />
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={handleCancelEdit}
                                className="px-2.5 py-1 text-xs text-slate-600 hover:text-slate-900 flex items-center gap-1"
                              >
                                <X className="w-3 h-3" />
                                <span>Cancel</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSaveEdit(msg.id)}
                                className="px-3 py-1 bg-slate-900 text-white text-xs font-semibold rounded-lg hover:bg-slate-800 flex items-center gap-1 shadow-2xs"
                              >
                                <Check className="w-3 h-3" />
                                <span>Save Changes</span>
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div
                            className={`max-w-md p-3 rounded-2xl text-xs leading-relaxed ${
                              isMe
                                ? 'bg-slate-900 text-white rounded-tr-xs'
                                : 'bg-white text-slate-900 border border-slate-200 shadow-2xs rounded-tl-xs'
                            }`}
                          >
                            {msg.content}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input Bar */}
              <form
                onSubmit={handleSendMessage}
                className="p-3 border-t border-slate-200 bg-white flex items-center gap-2"
              >
                <input
                  type="text"
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  placeholder={`Write message to ${otherParticipant?.name}...`}
                  className="flex-1 px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-slate-900"
                />

                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded-xl hover:bg-slate-800 transition-colors flex items-center gap-1.5 shadow-2xs"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send</span>
                </button>
              </form>
            </>
          ) : (
            <div className="m-auto text-center p-8 text-xs text-slate-400">
              Select or start a messaging thread to view conversations. All records are permanently stored.
            </div>
          )}
        </div>
      </div>

      {/* Modal: New Thread */}
      {isNewThreadOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Start Discussion Thread</h3>
              <button
                onClick={() => setIsNewThreadOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleStartNewThread} className="space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Recipient (Admin, Instructor, or Student)
                </label>
                <select
                  value={selectedRecipientId}
                  onChange={(e) => setSelectedRecipientId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
                  required
                >
                  <option value="">Select recipient...</option>
                  {eligibleRecipients.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} [{u.role.toUpperCase()}] - {u.email}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-400 mt-1">
                  Students can message Administrators and Instructors directly.
                </p>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Course Context
                </label>
                <select
                  value={newThreadCourse}
                  onChange={(e) => setNewThreadCourse(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 font-mono"
                >
                  {courses.map((c) => (
                    <option key={c.id} value={c.code}>
                      {c.code} · {c.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Initial Message
                </label>
                <textarea
                  value={firstMessageText}
                  onChange={(e) => setFirstMessageText(e.target.value)}
                  rows={4}
                  placeholder="Type your message, inquiry, or academic feedback..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsNewThreadOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-xl hover:bg-slate-800 transition-colors shadow-2xs"
                >
                  Start Discussion
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
