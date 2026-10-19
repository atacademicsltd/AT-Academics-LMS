import React, { useState } from 'react';
import { Announcement, NotificationItem, User, Course } from '../../types';
import { StorageService } from '../../services/storage';
import {
  Megaphone,
  Bell,
  Clock,
  Pin,
  Plus,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Layers,
  Sparkles,
  ChevronRight,
} from 'lucide-react';

interface AnnouncementsCenterProps {
  announcements: Announcement[];
  notifications: NotificationItem[];
  currentUser: User;
  courses: Course[];
  onRefresh: () => void;
  onNavigateToTab: (tab: string) => void;
}

export const AnnouncementsCenter: React.FC<AnnouncementsCenterProps> = ({
  announcements,
  notifications,
  currentUser,
  courses,
  onRefresh,
  onNavigateToTab,
}) => {
  const [filterType, setFilterType] = useState<'all' | 'deadlines' | 'announcements' | 'grades'>('all');
  const [isBroadcastOpen, setIsBroadcastOpen] = useState(false);

  // New announcement form
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newCourseCode, setNewCourseCode] = useState(courses[0]?.code || 'CS-401');
  const [newPriority, setNewPriority] = useState<'normal' | 'high' | 'urgent'>('normal');

  const isTeacherOrAdmin = currentUser.role === 'teacher' || currentUser.role === 'admin';

  // Calculate deadline remaining string
  const getDeadlineRemaining = (dueDateStr?: string) => {
    if (!dueDateStr) return null;
    const due = new Date(dueDateStr).getTime();
    const now = Date.now();
    const diff = due - now;

    if (diff < 0) {
      return { label: 'Deadline Passed', urgent: false };
    }
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (days === 0) {
      return { label: `Due in ${hours} hours!`, urgent: true };
    }
    return { label: `Due in ${days} days (${hours}h)`, urgent: days <= 2 };
  };

  const handleBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) return;

    StorageService.addAnnouncement({
      title: newTitle.trim(),
      content: newContent.trim(),
      courseCode: newCourseCode,
      courseId: courses.find((c) => c.code === newCourseCode)?.id,
      authorName: currentUser.name,
      authorRole: currentUser.role === 'admin' ? 'University Administrator' : 'Course Director',
      priority: newPriority,
      pinned: newPriority === 'urgent',
    });

    setIsBroadcastOpen(false);
    setNewTitle('');
    setNewContent('');
    onRefresh();
  };

  const upcomingDeadlines = notifications.filter((n) => n.type === 'deadline');

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Automated Notification Center & Announcements
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time deadline tracking engines, grade publication alerts, and university broadcasts.
          </p>
        </div>

        {isTeacherOrAdmin && (
          <button
            onClick={() => setIsBroadcastOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded-lg hover:bg-slate-800 transition-colors shadow-sm"
          >
            <Megaphone className="w-4 h-4" />
            <span>Broadcast Announcement</span>
          </button>
        )}
      </div>

      {/* Urgent Deadline Countdown Callout */}
      {upcomingDeadlines.length > 0 && (
        <div className="p-4 bg-slate-900 text-white rounded-2xl shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                Automated Deadline Watch
              </span>
            </div>
            <button
              onClick={() => onNavigateToTab('assignments')}
              className="text-xs font-mono text-slate-300 hover:text-white underline inline-flex items-center gap-1"
            >
              <span>Go to assignments</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {upcomingDeadlines.slice(0, 2).map((dl) => {
              const remaining = getDeadlineRemaining(dl.dueDate);

              return (
                <div
                  key={dl.id}
                  className="p-3 bg-white/5 border border-white/10 rounded-xl flex items-center justify-between gap-3 text-xs"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] text-amber-300 font-bold">
                        {dl.courseCode}
                      </span>
                      <span className="font-semibold text-white">{dl.title}</span>
                    </div>
                    <div className="text-[11px] text-slate-300 mt-0.5">{dl.message}</div>
                  </div>

                  {remaining && (
                    <div className="font-mono text-xs font-bold text-amber-400 shrink-0 text-right">
                      {remaining.label}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Segmented Filter Control */}
      <div className="flex items-center gap-1 p-1 bg-white border border-slate-200 rounded-xl max-w-fit">
        {(['all', 'deadlines', 'announcements', 'grades'] as const).map((cat) => (
          <button
            key={cat}
            onClick={() => setFilterType(cat)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg capitalize transition-colors ${
              filterType === cat
                ? 'bg-slate-900 text-white font-semibold shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {cat === 'all' ? 'All Alerts' : cat}
          </button>
        ))}
      </div>

      {/* Grid: Campus Announcements (Left) & Notifications Stream (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Announcements Feed (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">
              Official Academic Announcements
            </h2>
            <span className="text-xs font-mono text-slate-500">
              {announcements.length} bulletins
            </span>
          </div>

          <div className="space-y-4">
            {announcements.map((ann) => (
              <div
                key={ann.id}
                className="bg-white rounded-xl border border-slate-200 p-5 space-y-3 shadow-xs"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {ann.pinned && (
                        <Pin className="w-3.5 h-3.5 text-slate-900 fill-slate-900" />
                      )}
                      <h3 className="text-sm font-bold text-slate-900 leading-snug">
                        {ann.title}
                      </h3>
                    </div>
                    <div className="text-xs text-slate-500">
                      <span>{ann.authorName}</span>
                      <span className="mx-1.5">·</span>
                      <span>{ann.authorRole}</span>
                      {ann.courseCode && (
                        <>
                          <span className="mx-1.5">·</span>
                          <span className="font-mono text-slate-700">{ann.courseCode}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <span className="text-[11px] font-mono text-slate-400 shrink-0">
                    {new Date(ann.postedAt).toLocaleDateString()}
                  </span>
                </div>

                <p className="text-xs text-slate-700 leading-relaxed">
                  {ann.content}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Automated Notification Stream (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 p-5 space-y-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-sm font-bold text-slate-900">
              Automated Event Feed
            </h2>
            <button
              onClick={() => {
                StorageService.markAllNotificationsRead();
                onRefresh();
              }}
              className="text-xs text-slate-600 hover:text-slate-900 underline"
            >
              Mark all read
            </button>
          </div>

          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
            {notifications
              .filter((n) => {
                if (filterType === 'all') return true;
                if (filterType === 'deadlines') return n.type === 'deadline';
                if (filterType === 'announcements') return n.type === 'announcement';
                if (filterType === 'grades') return n.type === 'grade';
                return true;
              })
              .map((notif) => (
                <div
                  key={notif.id}
                  className={`p-3 rounded-xl border text-xs space-y-1.5 transition-colors ${
                    !notif.read
                      ? 'bg-slate-50/90 border-slate-300'
                      : 'bg-white border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-slate-900">{notif.title}</span>
                    <span className="text-[10px] font-mono text-slate-400">
                      {new Date(notif.timestamp).toLocaleDateString()}
                    </span>
                  </div>

                  <p className="text-slate-600 leading-relaxed text-[11px]">{notif.message}</p>

                  <div className="flex items-center justify-between pt-1">
                    {notif.courseCode ? (
                      <span className="font-mono text-[10px] text-slate-500">
                        Course: {notif.courseCode}
                      </span>
                    ) : <span />}

                    {notif.targetLink && (
                      <button
                        onClick={() => onNavigateToTab(notif.targetLink!)}
                        className="text-[11px] font-semibold text-slate-800 hover:underline"
                      >
                        View Details →
                      </button>
                    )}
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Modal: Broadcast Announcement */}
      {isBroadcastOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-lg w-full p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900">
              Broadcast University Announcement
            </h3>

            <form onSubmit={handleBroadcast} className="space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Announcement Title
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Midterm Proctoring Protocol & Room Changes"
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Course Scope
                  </label>
                  <select
                    value={newCourseCode}
                    onChange={(e) => setNewCourseCode(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 font-mono"
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
                    Priority Level
                  </label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as any)}
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
                  >
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent & Pinned</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Announcement Body
                </label>
                <textarea
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  rows={4}
                  placeholder="Draft official announcement text for enrolled students..."
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsBroadcastOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-lg hover:bg-slate-800 transition-colors"
                >
                  Publish Announcement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
