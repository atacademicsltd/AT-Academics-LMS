import React, { useState, useEffect } from 'react';
import {
  User,
  Course,
  ModuleItem,
  Assignment,
  AssignmentSubmission,
  NotificationItem,
  Announcement,
} from './types';
import { StorageService } from './services/storage';

import { Navbar } from './components/Navbar';
import { CourseList } from './components/courses/CourseList';
import { CourseDetail } from './components/courses/CourseDetail';
import { SecureVideoPlayer } from './components/video/SecureVideoPlayer';
import { AssignmentGradingHub } from './components/grading/AssignmentGradingHub';
import { UserCreationManager } from './components/admin/UserCreationManager';
import { SemesterProgressTracker } from './components/progress/SemesterProgressTracker';
import { InstructorMessagingHub } from './components/messaging/InstructorMessagingHub';
import { AnnouncementsCenter } from './components/notifications/AnnouncementsCenter';
import { LoginPage } from './components/auth/LoginPage';
import { UserProfileModal } from './components/profile/UserProfileModal';
import { WorldClock } from './components/common/WorldClock';
import { QualificationVerification } from './components/common/QualificationVerification';
import { ThemeToggle } from './components/common/ThemeToggle';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(() => StorageService.getCurrentUser());
  const [allUsers, setAllUsers] = useState<User[]>(() => StorageService.getAllUsers());
  const [courses, setCourses] = useState<Course[]>(() => StorageService.getCourses());
  const [assignments, setAssignments] = useState<Assignment[]>(() =>
    StorageService.getAssignments()
  );
  const [submissions, setSubmissions] = useState<AssignmentSubmission[]>(() =>
    StorageService.getSubmissions()
  );
  const [notifications, setNotifications] = useState<NotificationItem[]>(() =>
    StorageService.getNotifications()
  );
  const [announcements, setAnnouncements] = useState<Announcement[]>(() =>
    StorageService.getAnnouncements()
  );

  const [activeTab, setActiveTab] = useState<string>('courses');
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [activeLecture, setActiveLecture] = useState<{
    item: ModuleItem;
    course: Course;
  } | null>(null);
  const [preSelectedAssignmentId, setPreSelectedAssignmentId] = useState<string | undefined>(
    undefined
  );
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [timeoutNotice, setTimeoutNotice] = useState<string | null>(null);
  const [isVerifyingStandalone, setIsVerifyingStandalone] = useState<boolean>(
    () => typeof window !== 'undefined' && window.location.hash === '#verify'
  );

  useEffect(() => {
    const handleHash = () => {
      setIsVerifyingStandalone(window.location.hash === '#verify');
    };
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  // Sync state helper
  const reloadData = () => {
    const updatedUser = StorageService.getCurrentUser();
    setCurrentUser(updatedUser);
    setAllUsers(StorageService.getAllUsers());
    const updatedCourses = StorageService.getCourses();
    setCourses(updatedCourses);
    setAssignments(StorageService.getAssignments());
    setSubmissions(StorageService.getSubmissions());
    setNotifications(StorageService.getNotifications());
    setAnnouncements(StorageService.getAnnouncements());
  };

  // Real-time synchronization with server and cross-tab storage
  useEffect(() => {
    const stopPolling = StorageService.startRealtimePolling(3000);

    const onDataUpdated = () => {
      reloadData();
    };

    window.addEventListener('at_academics_data_updated', onDataUpdated);
    window.addEventListener('at_academics_local_change', onDataUpdated);

    return () => {
      stopPolling();
      window.removeEventListener('at_academics_data_updated', onDataUpdated);
      window.removeEventListener('at_academics_local_change', onDataUpdated);
    };
  }, []);

  // Keep selectedCourse in sync when admin or instructor updates courses in real-time
  useEffect(() => {
    if (selectedCourse) {
      const refreshed = courses.find((c) => c.id === selectedCourse.id);
      if (refreshed) {
        setSelectedCourse(refreshed);
      }
    }
  }, [courses]);

  // Idle timeout detection: 1 hour (3600000 ms) of complete inactivity
  useEffect(() => {
    if (!currentUser) return;

    const onUserActivity = () => {
      StorageService.touchActivity();
    };

    const events = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart'];
    events.forEach((ev) => window.addEventListener(ev, onUserActivity, { passive: true }));

    // Check every 15 seconds
    const interval = setInterval(() => {
      const stored = StorageService.getCurrentUser();
      if (!stored) {
        setTimeoutNotice('Your session has expired due to 1 hour of inactivity. Please log in again.');
        setCurrentUser(null);
        setSelectedCourse(null);
        setActiveLecture(null);
      }
    }, 15000);

    return () => {
      events.forEach((ev) => window.removeEventListener(ev, onUserActivity));
      clearInterval(interval);
    };
  }, [currentUser]);

  const handleSelectUser = (user: User) => {
    setTimeoutNotice(null);
    StorageService.setCurrentUser(user);
    setCurrentUser(user);
    reloadData();
  };

  const handleLogout = () => {
    StorageService.logout();
    setCurrentUser(null);
    setSelectedCourse(null);
    setActiveLecture(null);
    setTimeoutNotice(null);
  };

  const handleNotificationClick = (notif: NotificationItem) => {
    StorageService.markNotificationRead(notif.id);
    setNotifications(StorageService.getNotifications());
    if (notif.targetLink) {
      setActiveTab(notif.targetLink);
      setActiveLecture(null);
      setSelectedCourse(null);
    }
  };

  const handleMarkAllNotificationsRead = () => {
    StorageService.markAllNotificationsRead();
    setNotifications(StorageService.getNotifications());
  };

  const handleLectureComplete = () => {
    if (activeLecture && currentUser?.studentId) {
      StorageService.markItemComplete(
        currentUser.studentId,
        activeLecture.course.id,
        activeLecture.item.id
      );
      reloadData();
    }
  };

  // Standalone Verification View (can be embedded or accessed directly via /#verify without login)
  if (isVerifyingStandalone) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200">
        <header className="sticky top-0 z-40 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 py-3.5 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-0.5 shadow-2xs flex items-center justify-center shrink-0 overflow-hidden">
                <img
                  src="/logo.png"
                  alt="AT Academics LMS"
                  className="w-full h-full object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div>
                <span className="text-sm font-bold tracking-tight text-slate-900 dark:text-white block">
                  AT Academics
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Official Academic Registry & Qualification Verification
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <ThemeToggle />
              <button
                onClick={() => {
                  window.location.hash = '';
                  setIsVerifyingStandalone(false);
                }}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white transition-colors shadow-2xs cursor-pointer"
              >
                ← Back to Portal {currentUser ? 'Dashboard' : 'Sign In'}
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <QualificationVerification currentUser={currentUser} />
        </main>

        <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-3 mt-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>© 2026 AT Academics LMS · Academic Registry Department</span>
            <WorldClock />
          </div>
        </footer>
      </div>
    );
  }

  // If not logged in, always start with the clean LoginPage
  if (!currentUser) {
    return (
      <LoginPage
        onLoginSuccess={handleSelectUser}
        sessionTimeoutMessage={timeoutNotice}
        onOpenVerification={() => {
          window.location.hash = '#verify';
          setIsVerifyingStandalone(true);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200">
      {/* Top Navbar */}
      <Navbar
        currentUser={currentUser}
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          setActiveLecture(null);
          if (tab !== 'courses') {
            setSelectedCourse(null);
          }
        }}
        notifications={notifications}
        onNotificationClick={handleNotificationClick}
        onMarkAllNotificationsRead={handleMarkAllNotificationsRead}
        onOpenProfile={() => setIsProfileOpen(true)}
        onLogout={handleLogout}
      />

      {/* Main Workspace Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
        {/* If Active Video Lecture is selected */}
        {activeLecture ? (
          <SecureVideoPlayer
            item={activeLecture.item}
            courseCode={activeLecture.course.code}
            courseTitle={activeLecture.course.title}
            currentUser={currentUser}
            onComplete={handleLectureComplete}
            onBack={() => setActiveLecture(null)}
          />
        ) : selectedCourse ? (
          /* Course Detailed Syllabus View */
          <CourseDetail
            course={selectedCourse}
            currentUser={currentUser}
            onSelectLecture={(item) => setActiveLecture({ item, course: selectedCourse })}
            onBack={() => setSelectedCourse(null)}
            onCourseUpdated={reloadData}
            onGoToAssignment={(assignId) => {
              setPreSelectedAssignmentId(assignId);
              setActiveTab('assignments');
              setSelectedCourse(null);
            }}
          />
        ) : (
          /* Active Tab View */
          <>
            {activeTab === 'courses' && (
              <CourseList
                courses={courses}
                currentUser={currentUser}
                onSelectCourse={(course) => setSelectedCourse(course)}
                onRefreshCourses={reloadData}
              />
            )}

            {activeTab === 'user_creation' && currentUser.role === 'admin' && (
              <UserCreationManager
                users={allUsers}
                courses={courses}
                currentUser={currentUser}
                onRefresh={reloadData}
              />
            )}

            {activeTab === 'assignments' && (
              <AssignmentGradingHub
                assignments={assignments}
                submissions={submissions}
                courses={courses}
                currentUser={currentUser}
                onRefresh={reloadData}
                preSelectedAssignmentId={preSelectedAssignmentId}
              />
            )}

            {activeTab === 'progress' && (
              <SemesterProgressTracker
                courses={courses}
                currentUser={currentUser}
                allUsers={allUsers}
                assignments={assignments}
                submissions={submissions}
              />
            )}

            {activeTab === 'messaging' && (
              <InstructorMessagingHub
                currentUser={currentUser}
                allUsers={allUsers}
                courses={courses}
              />
            )}

            {activeTab === 'announcements' && (
              <AnnouncementsCenter
                announcements={announcements}
                notifications={notifications}
                currentUser={currentUser}
                courses={courses}
                onRefresh={reloadData}
                onNavigateToTab={(tab) => {
                  setActiveTab(tab);
                  setActiveLecture(null);
                  setSelectedCourse(null);
                }}
              />
            )}

            {activeTab === 'verify' && (
              <QualificationVerification currentUser={currentUser} />
            )}
          </>
        )}
      </main>

      {/* Footer with Theme Toggle and World Clock */}
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-3 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-800 dark:text-slate-200">AT Academics LMS</span>
          </div>

          <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400">
            {/* World Clock in bottom corner */}
            <WorldClock />
            <span className="text-slate-300 dark:text-slate-700">|</span>
            <ThemeToggle />
          </div>
        </div>
      </footer>

      {/* User Profile & Tuition Modal */}
      <UserProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        currentUser={currentUser}
        onProfileUpdated={(updated) => {
          setCurrentUser(updated);
          reloadData();
        }}
      />
    </div>
  );
}
