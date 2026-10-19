import React, { useState } from 'react';
import {
  GraduationCap,
  Bell,
  Menu,
  X,
  BookOpen,
  CheckCircle2,
  FileSpreadsheet,
  UserPlus,
  MessageSquare,
  Megaphone,
  ChevronDown,
  LogOut,
  User as UserIcon,
  Shield,
  Award,
} from 'lucide-react';
import { User, NotificationItem } from '../types';
import { ThemeToggle } from './common/ThemeToggle';

interface NavbarProps {
  currentUser: User;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  notifications: NotificationItem[];
  onNotificationClick: (notif: NotificationItem) => void;
  onMarkAllNotificationsRead: () => void;
  onOpenProfile: () => void;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  activeTab,
  setActiveTab,
  notifications,
  onNotificationClick,
  onMarkAllNotificationsRead,
  onOpenProfile,
  onLogout,
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNotifDropdownOpen, setIsNotifDropdownOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Build nav items dynamically based on role
  const navItems = [
    {
      id: 'courses',
      label: currentUser.role === 'student' ? 'My Enrolled Courses' : 'Courses',
      icon: BookOpen,
    },
    ...(currentUser.role === 'admin'
      ? [
          {
            id: 'user_creation',
            label: 'User Creation',
            icon: UserPlus,
          },
        ]
      : []),
    {
      id: 'assignments',
      label: currentUser.role === 'student' ? 'Tasks & Grades' : 'Assignments & Grades',
      icon: FileSpreadsheet,
    },
    {
      id: 'progress',
      label: 'Semester Progress',
      icon: CheckCircle2,
    },
    {
      id: 'messaging',
      label: currentUser.role === 'student' ? 'Message Teachers' : 'Instructor Feedback',
      icon: MessageSquare,
    },
    {
      id: 'announcements',
      label: 'Announcements',
      icon: Megaphone,
    },
    {
      id: 'verify',
      label: 'Verify Qualification',
      icon: Award,
    },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Zone 1: Brand Wordmark */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => setActiveTab('courses')}
              className="flex items-center gap-2.5 text-left group cursor-pointer"
            >
              <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-0.5 shadow-2xs flex items-center justify-center shrink-0 overflow-hidden group-hover:border-slate-300 dark:group-hover:border-slate-600 transition-colors">
                <img
                  src="/logo.png"
                  alt="AT Academics LMS"
                  className="w-full h-full object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="leading-tight">
                <span className="text-base font-bold tracking-tight text-slate-900 dark:text-white block whitespace-nowrap">
                  AT Academics LMS
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-normal">
                  {currentUser.role === 'admin'
                    ? 'Admin Portal'
                    : currentUser.role === 'teacher'
                    ? 'Instructor Portal'
                    : 'Student Portal'}
                </span>
              </div>
            </button>
          </div>

          {/* Zone 2: Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1 xl:gap-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-md whitespace-nowrap transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold shadow-2xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Zone 3: Notification Bell, Theme Toggle & User Account Menu */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            {/* Global Theme Toggle */}
            <ThemeToggle />

            {/* Notification Bell */}
            <div className="relative">
              <button
                onClick={() => setIsNotifDropdownOpen(!isNotifDropdownOpen)}
                className="relative p-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                title="Notifications & Upcoming Deadlines"
                aria-label="Notifications"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 flex items-center justify-center min-w-[16px] h-4 px-1 text-[10px] font-bold text-white bg-red-600 rounded-full font-mono tabular-nums">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Dropdown */}
              {isNotifDropdownOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 py-2 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                  <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-semibold text-slate-900 dark:text-white">
                        Notifications & Alerts
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {unreadCount} unread system notifications
                      </p>
                    </div>
                    {unreadCount > 0 && (
                      <button
                        onClick={onMarkAllNotificationsRead}
                        className="text-[11px] text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white underline whitespace-nowrap cursor-pointer"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>

                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center text-xs text-slate-500 dark:text-slate-400">
                        No notifications at this time
                      </div>
                    ) : (
                      notifications.slice(0, 8).map((notif) => (
                        <div
                          key={notif.id}
                          onClick={() => {
                            onNotificationClick(notif);
                            setIsNotifDropdownOpen(false);
                          }}
                          className={`p-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer transition-colors ${
                            !notif.read ? 'bg-slate-50/70 dark:bg-slate-800/40' : ''
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-xs font-semibold text-slate-900 dark:text-white">
                              {notif.title}
                            </span>
                            {notif.courseCode && (
                              <span className="text-[10px] font-mono text-slate-600 dark:text-slate-400 shrink-0">
                                {notif.courseCode}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-1 line-clamp-2 leading-relaxed">
                            {notif.message}
                          </p>
                          <div className="mt-1.5 flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                            <span>{new Date(notif.timestamp).toLocaleDateString()}</span>
                            {notif.urgent && (
                              <span className="text-amber-700 dark:text-amber-400 font-medium">Urgent</span>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User Profile Button & Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-colors text-left cursor-pointer"
              >
                {currentUser.avatarUrl ? (
                  <img
                    src={currentUser.avatarUrl}
                    alt={currentUser.name}
                    className="w-6 h-6 rounded-md object-cover border border-slate-200 dark:border-slate-700"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-md bg-slate-900 dark:bg-slate-700 text-white flex items-center justify-center text-xs font-bold">
                    {currentUser.name.charAt(0)}
                  </div>
                )}
                <div className="hidden sm:block leading-none">
                  <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                    <span className="truncate max-w-[120px]">{currentUser.name}</span>
                    <span className="text-[10px] font-mono uppercase bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 px-1 py-0.2 rounded font-semibold">
                      {currentUser.role}
                    </span>
                  </div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {isUserMenuOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 py-2 z-50 animate-in fade-in duration-150">
                  <div className="px-3.5 py-2 border-b border-slate-100 dark:border-slate-800">
                    <div className="text-xs font-bold text-slate-900 dark:text-white">
                      {currentUser.name}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono truncate">
                      {currentUser.email}
                    </div>
                    {currentUser.role === 'student' && (
                      <div className="text-[10px] font-mono text-slate-600 dark:text-slate-400 mt-0.5">
                        Student ID: {currentUser.studentId || currentUser.loginId}
                      </div>
                    )}
                  </div>

                  <div className="p-1 space-y-0.5">
                    {/* Theme Mode Toggle inside menu */}
                    <ThemeToggle variant="menu-item" />

                    <div className="border-t border-slate-100 dark:border-slate-800 my-1" />

                    <button
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        onOpenProfile();
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-left font-medium cursor-pointer"
                    >
                      <UserIcon className="w-3.5 h-3.5 text-slate-500" />
                      <span>Edit Profile</span>
                    </button>

                    <div className="border-t border-slate-100 dark:border-slate-800 my-1" />

                    <button
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        onLogout();
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg text-left font-semibold cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Mobile menu hamburger */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
              aria-label="Toggle navigation menu"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {isMobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 pt-2 pb-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg text-left cursor-pointer ${
                  isActive
                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                }`}
              >
                <Icon className="w-4 h-4 text-slate-500" />
                <span>{item.label}</span>
              </button>
            );
          })}

          <div className="border-t border-slate-200 dark:border-slate-800 pt-2 mt-2 space-y-1">
            <ThemeToggle variant="menu-item" />

            <button
              onClick={() => {
                setIsMobileMenuOpen(false);
                onOpenProfile();
              }}
              className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg font-medium cursor-pointer"
            >
              <UserIcon className="w-4 h-4 text-slate-500" />
              <span>Edit Profile</span>
            </button>
            <button
              onClick={() => {
                setIsMobileMenuOpen(false);
                onLogout();
              }}
              className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg font-semibold cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
