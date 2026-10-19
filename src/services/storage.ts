import {
  User,
  Department,
  Course,
  CourseModule,
  ModuleItem,
  StudyMaterial,
  AssignmentGuide,
  Quiz,
  QuizAttempt,
  StudentCredential,
  Assignment,
  AssignmentSubmission,
  StudentCourseProgress,
  NotificationItem,
  Announcement,
  ChatThread,
  ChatMessage,
  VideoNote,
  DeletionRequest,
} from '../types';

import {
  INITIAL_USERS,
  INITIAL_DEPARTMENTS,
  INITIAL_COURSES,
  INITIAL_ASSIGNMENTS,
  INITIAL_SUBMISSIONS,
  INITIAL_STUDENT_CREDENTIALS,
  INITIAL_PROGRESS,
  INITIAL_NOTIFICATIONS,
  INITIAL_ANNOUNCEMENTS,
  INITIAL_CHAT_THREADS,
  INITIAL_CHAT_MESSAGES,
  INITIAL_VIDEO_NOTES,
} from './mockData';

const STORAGE_KEYS = {
  CURRENT_USER: 'at_academics_current_user_v5',
  USERS: 'at_academics_users_v5',
  DEPARTMENTS: 'at_academics_departments_v5',
  COURSES: 'at_academics_courses_v5',
  QUIZ_ATTEMPTS: 'at_academics_quiz_attempts_v5',
  ASSIGNMENTS: 'at_academics_assignments_v5',
  SUBMISSIONS: 'at_academics_submissions_v5',
  CREDENTIALS: 'at_academics_credentials_v5',
  PROGRESS: 'at_academics_progress_v5',
  NOTIFICATIONS: 'at_academics_notifications_v5',
  ANNOUNCEMENTS: 'at_academics_announcements_v5',
  CHAT_THREADS: 'at_academics_chat_threads_v5',
  CHAT_MESSAGES: 'at_academics_chat_messages_v5',
  VIDEO_NOTES: 'at_academics_video_notes_v5',
  DELETION_REQUESTS: 'at_academics_deletion_requests_v5',
  DELETED_IDS: 'at_academics_deleted_ids_v5',
  LAST_ACTIVITY: 'at_academics_last_activity_v5',
  LAST_SYNC: 'at_academics_last_sync_v5',
};

// Check and migrate legacy localStorage keys from v1-v4
function migrateLegacyStorage(): void {
  try {
    const legacyUserKeys = [
      'at_academics_users_v4',
      'at_academics_users_v3',
      'at_academics_users_v2',
      'at_academics_users',
    ];

    const currentRaw = localStorage.getItem(STORAGE_KEYS.USERS);
    let currentUsers: User[] = currentRaw ? JSON.parse(currentRaw) : [];

    for (const oldKey of legacyUserKeys) {
      const oldRaw = localStorage.getItem(oldKey);
      if (oldRaw) {
        try {
          const oldUsers: User[] = JSON.parse(oldRaw);
          if (Array.isArray(oldUsers)) {
            oldUsers.forEach((ou) => {
              if (
                ou &&
                ou.loginId &&
                !currentUsers.some(
                  (u) =>
                    u.loginId?.toLowerCase() === ou.loginId?.toLowerCase() ||
                    (ou.email && u.email?.toLowerCase() === ou.email?.toLowerCase())
                )
              ) {
                currentUsers.push(ou);
              }
            });
          }
        } catch {
          // ignore corrupted legacy key
        }
      }
    }

    if (currentUsers.length > 0) {
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(currentUsers));
    }
  } catch (err) {
    console.error('Error migrating legacy storage:', err);
  }
}

migrateLegacyStorage();

// In-memory cache to bypass 5MB localStorage quotas for 30+ modules and course files
const memoryStore: Record<string, any> = {};

function sanitizeForLocalStorage(key: string, value: any): any {
  if (key === STORAGE_KEYS.COURSES && Array.isArray(value)) {
    // Strip heavy base64 strings from localStorage copy only (keeps memory & server intact)
    return value.map((c: any) => ({
      ...c,
      modules: (c.modules || []).map((m: any) => ({
        ...m,
        studyMaterials: (m.studyMaterials || []).map((sm: any) => ({
          ...sm,
          fileContentBase64: sm.fileContentBase64 && sm.fileContentBase64.length > 50000 ? undefined : sm.fileContentBase64,
        })),
        assignmentGuides: (m.assignmentGuides || []).map((ag: any) => ({
          ...ag,
          fileContentBase64: ag.fileContentBase64 && ag.fileContentBase64.length > 50000 ? undefined : ag.fileContentBase64,
        })),
      })),
      studyMaterials: (c.studyMaterials || []).map((sm: any) => ({
        ...sm,
        fileContentBase64: sm.fileContentBase64 && sm.fileContentBase64.length > 50000 ? undefined : sm.fileContentBase64,
      })),
      assignmentGuides: (c.assignmentGuides || []).map((ag: any) => ({
        ...ag,
        fileContentBase64: ag.fileContentBase64 && ag.fileContentBase64.length > 50000 ? undefined : ag.fileContentBase64,
      })),
    }));
  }
  if (key === STORAGE_KEYS.SUBMISSIONS && Array.isArray(value)) {
    return value.map((s: any) => ({
      ...s,
      fileContentPreview: s.fileContentPreview && s.fileContentPreview.length > 50000 ? undefined : s.fileContentPreview,
    }));
  }
  return value;
}

function getStored<T>(key: string, defaultValue: T): T {
  if (memoryStore[key] !== undefined) {
    return memoryStore[key];
  }
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      memoryStore[key] = defaultValue;
      return defaultValue;
    }
    const parsed = JSON.parse(raw);
    memoryStore[key] = parsed;
    return parsed;
  } catch (err) {
    console.error(`Failed to read from localStorage for key ${key}`, err);
    memoryStore[key] = defaultValue;
    return defaultValue;
  }
}

let lastLocalWrite = 0;

function setStored<T>(key: string, value: T, notifySync: boolean = true): void {
  // Always update memory store immediately
  memoryStore[key] = value;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    // If quota exceeded (common when uploading 11+ modules with files in localStorage),
    // save sanitized metadata to localStorage while full payload remains in memory & server
    console.warn(`LocalStorage quota exceeded for ${key}, falling back to memory + server sync`, err);
    try {
      const sanitized = sanitizeForLocalStorage(key, value);
      localStorage.setItem(key, JSON.stringify(sanitized));
    } catch {
      // Memory store still has the full payload
    }
  }

  if (notifySync) {
    lastLocalWrite = Date.now();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('at_academics_local_change', { detail: { key } }));
    }
  }
}

// Background sync state
let syncInProgress = false;
let pollingInterval: any = null;

export const StorageService = {
  // Admin Deletion Tracking
  getDeletedItemIds(): string[] {
    return getStored<string[]>(STORAGE_KEYS.DELETED_IDS, []);
  },

  recordAdminDeletion(id: string): void {
    if (!id) return;
    const deleted = this.getDeletedItemIds();
    if (!deleted.includes(id)) {
      deleted.push(id);
      setStored(STORAGE_KEYS.DELETED_IDS, deleted, false);
    }
    fetch('/api/admin/delete-item', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    }).catch(() => {});
  },

  // Real-Time Server Synchronization (Safe, Non-Destructive Merging)
  async syncWithServer(): Promise<boolean> {
    if (syncInProgress) return false;
    syncInProgress = true;
    try {
      const res = await fetch('/api/sync');
      if (!res.ok) throw new Error('Sync endpoint returned ' + res.status);
      const json = await res.json();
      if (json.success && json.data) {
        const d = json.data;

        // Merge deleted item IDs
        const serverDeleted: string[] = Array.isArray(json.deletedItemIds) ? json.deletedItemIds : [];
        const localDeleted = this.getDeletedItemIds();
        const mergedDeleted = Array.from(new Set([...localDeleted, ...serverDeleted]));
        setStored(STORAGE_KEYS.DELETED_IDS, mergedDeleted, false);
        const deletedSet = new Set(mergedDeleted);

        // 1. Users safe merge
        if (Array.isArray(d.users)) {
          const localUsers = getStored<User[]>(STORAGE_KEYS.USERS, []);
          const userMap = new Map<string, User>();
          localUsers.forEach((u) => { if (u && u.id && !deletedSet.has(u.id)) userMap.set(u.id, u); });
          d.users.forEach((u: User) => {
            if (u && u.id && !deletedSet.has(u.id)) {
              userMap.set(u.id, { ...(userMap.get(u.id) || {}), ...u });
            }
          });
          setStored(STORAGE_KEYS.USERS, Array.from(userMap.values()), false);
        }

        // 2. Departments safe merge
        if (Array.isArray(d.departments)) {
          const localDepts = getStored<Department[]>(STORAGE_KEYS.DEPARTMENTS, INITIAL_DEPARTMENTS);
          const deptMap = new Map<string, Department>();
          localDepts.forEach((dept) => { if (dept && dept.id && !deletedSet.has(dept.id)) deptMap.set(dept.id, dept); });
          d.departments.forEach((dept: Department) => {
            if (dept && dept.id && !deletedSet.has(dept.id)) {
              deptMap.set(dept.id, { ...(deptMap.get(dept.id) || {}), ...dept });
            }
          });
          setStored(STORAGE_KEYS.DEPARTMENTS, Array.from(deptMap.values()), false);
        }

        // 3. Courses, Modules, Materials safe merge (NEVER DROP USER ADDED CONTENT UNLESS DELETED BY ADMIN)
        if (Array.isArray(d.courses)) {
          const localCourses = getStored<Course[]>(STORAGE_KEYS.COURSES, []);
          const courseMap = new Map<string, Course>();

          // Index local courses that aren't deleted
          localCourses.forEach((lc) => {
            if (lc && lc.id && !deletedSet.has(lc.id)) {
              courseMap.set(lc.id, lc);
            }
          });

          // Deep merge server courses
          d.courses.forEach((sc: Course) => {
            if (!sc || !sc.id || deletedSet.has(sc.id)) return;
            const existing = courseMap.get(sc.id);
            if (!existing) {
              courseMap.set(sc.id, sc);
            } else {
              // Deep merge modules
              const exMods = Array.isArray(existing.modules) ? existing.modules : [];
              const sMods = Array.isArray(sc.modules) ? sc.modules : [];
              const modMap = new Map<string, CourseModule>();
              exMods.forEach((m) => { if (m && m.id && !deletedSet.has(m.id)) modMap.set(m.id, m); });
              sMods.forEach((m) => {
                if (!m || !m.id || deletedSet.has(m.id)) return;
                const prevM = modMap.get(m.id);
                if (!prevM) {
                  modMap.set(m.id, m);
                } else {
                  // Merge module items
                  const exItems = Array.isArray(prevM.items) ? prevM.items : [];
                  const sItems = Array.isArray(m.items) ? m.items : [];
                  const itemMap = new Map<string, ModuleItem>();
                  exItems.forEach((it) => { if (it && it.id && !deletedSet.has(it.id)) itemMap.set(it.id, it); });
                  sItems.forEach((it) => {
                    if (it && it.id && !deletedSet.has(it.id)) {
                      itemMap.set(it.id, { ...(itemMap.get(it.id) || {}), ...it });
                    }
                  });

                  // Merge module studyMaterials
                  const exSM = Array.isArray(prevM.studyMaterials) ? prevM.studyMaterials : [];
                  const sSM = Array.isArray(m.studyMaterials) ? m.studyMaterials : [];
                  const smMap = new Map<string, StudyMaterial>();
                  exSM.forEach((sm) => { if (sm && sm.id && !deletedSet.has(sm.id)) smMap.set(sm.id, sm); });
                  sSM.forEach((sm) => {
                    if (sm && sm.id && !deletedSet.has(sm.id)) {
                      smMap.set(sm.id, { ...(smMap.get(sm.id) || {}), ...sm });
                    }
                  });

                  modMap.set(m.id, {
                    ...prevM,
                    ...m,
                    items: Array.from(itemMap.values()),
                    studyMaterials: Array.from(smMap.values()),
                  });
                }
              });

              // Merge course studyMaterials
              const exCSM = Array.isArray(existing.studyMaterials) ? existing.studyMaterials : [];
              const sCSM = Array.isArray(sc.studyMaterials) ? sc.studyMaterials : [];
              const csmMap = new Map<string, StudyMaterial>();
              exCSM.forEach((sm) => { if (sm && sm.id && !deletedSet.has(sm.id)) csmMap.set(sm.id, sm); });
              sCSM.forEach((sm) => {
                if (sm && sm.id && !deletedSet.has(sm.id)) {
                  csmMap.set(sm.id, { ...(csmMap.get(sm.id) || {}), ...sm });
                }
              });

              // Merge assignment guides
              const exAG = Array.isArray(existing.assignmentGuides) ? existing.assignmentGuides : [];
              const sAG = Array.isArray(sc.assignmentGuides) ? sc.assignmentGuides : [];
              const agMap = new Map<string, AssignmentGuide>();
              exAG.forEach((ag) => { if (ag && ag.id && !deletedSet.has(ag.id)) agMap.set(ag.id, ag); });
              sAG.forEach((ag) => {
                if (ag && ag.id && !deletedSet.has(ag.id)) {
                  agMap.set(ag.id, { ...(agMap.get(ag.id) || {}), ...ag });
                }
              });

              // Merge quizzes
              const exQz = Array.isArray(existing.quizzes) ? existing.quizzes : [];
              const sQz = Array.isArray(sc.quizzes) ? sc.quizzes : [];
              const qzMap = new Map<string, Quiz>();
              exQz.forEach((q) => { if (q && q.id && !deletedSet.has(q.id)) qzMap.set(q.id, q); });
              sQz.forEach((q) => {
                if (q && q.id && !deletedSet.has(q.id)) {
                  qzMap.set(q.id, { ...(qzMap.get(q.id) || {}), ...q });
                }
              });

              courseMap.set(sc.id, {
                ...existing,
                ...sc,
                modules: Array.from(modMap.values()),
                studyMaterials: Array.from(csmMap.values()),
                assignmentGuides: Array.from(agMap.values()),
                quizzes: Array.from(qzMap.values()),
              });
            }
          });

          setStored(STORAGE_KEYS.COURSES, Array.from(courseMap.values()), false);
        }

        // 4. Assignments safe merge
        if (Array.isArray(d.assignments)) {
          const localAssigns = getStored<Assignment[]>(STORAGE_KEYS.ASSIGNMENTS, INITIAL_ASSIGNMENTS);
          const aMap = new Map<string, Assignment>();
          localAssigns.forEach((a) => { if (a && a.id && !deletedSet.has(a.id)) aMap.set(a.id, a); });
          d.assignments.forEach((a: Assignment) => {
            if (a && a.id && !deletedSet.has(a.id)) {
              aMap.set(a.id, { ...(aMap.get(a.id) || {}), ...a });
            }
          });
          setStored(STORAGE_KEYS.ASSIGNMENTS, Array.from(aMap.values()), false);
        }

        // 5. Submissions safe merge (student submissions must never be lost)
        if (Array.isArray(d.submissions)) {
          const localSubs = getStored<AssignmentSubmission[]>(STORAGE_KEYS.SUBMISSIONS, INITIAL_SUBMISSIONS);
          const sMap = new Map<string, AssignmentSubmission>();
          localSubs.forEach((s) => { if (s && s.id && !deletedSet.has(s.id)) sMap.set(s.id, s); });
          d.submissions.forEach((s: AssignmentSubmission) => {
            if (s && s.id && !deletedSet.has(s.id)) {
              sMap.set(s.id, { ...(sMap.get(s.id) || {}), ...s });
            }
          });
          setStored(STORAGE_KEYS.SUBMISSIONS, Array.from(sMap.values()), false);
        }

        // 6. Announcements safe merge
        if (Array.isArray(d.announcements)) {
          const localAnn = getStored<Announcement[]>(STORAGE_KEYS.ANNOUNCEMENTS, INITIAL_ANNOUNCEMENTS);
          const annMap = new Map<string, Announcement>();
          localAnn.forEach((a) => { if (a && a.id && !deletedSet.has(a.id)) annMap.set(a.id, a); });
          d.announcements.forEach((a: Announcement) => {
            if (a && a.id && !deletedSet.has(a.id)) {
              annMap.set(a.id, { ...(annMap.get(a.id) || {}), ...a });
            }
          });
          setStored(STORAGE_KEYS.ANNOUNCEMENTS, Array.from(annMap.values()), false);
        }

        // 7. Video notes safe merge
        if (Array.isArray(d.videoNotes)) {
          const localVN = getStored<VideoNote[]>(STORAGE_KEYS.VIDEO_NOTES, INITIAL_VIDEO_NOTES);
          const vnMap = new Map<string, VideoNote>();
          localVN.forEach((v) => { if (v && v.id && !deletedSet.has(v.id)) vnMap.set(v.id, v); });
          d.videoNotes.forEach((v: VideoNote) => {
            if (v && v.id && !deletedSet.has(v.id)) {
              vnMap.set(v.id, { ...(vnMap.get(v.id) || {}), ...v });
            }
          });
          setStored(STORAGE_KEYS.VIDEO_NOTES, Array.from(vnMap.values()), false);
        }

        // 8. Progress safe merge (union completed items and modules)
        if (d.progress && typeof d.progress === 'object') {
          const localProg = getStored<Record<string, StudentCourseProgress>>(STORAGE_KEYS.PROGRESS, INITIAL_PROGRESS);
          const mergedProg: Record<string, StudentCourseProgress> = { ...localProg };
          for (const [k, p] of Object.entries(d.progress as Record<string, StudentCourseProgress>)) {
            if (!mergedProg[k]) {
              mergedProg[k] = p;
            } else {
              const prevP = mergedProg[k];
              const compItems = Array.from(new Set([...(prevP.completedItems || []), ...(p.completedItems || [])]));
              const compMods = Array.from(new Set([...(prevP.completedModules || []), ...(p.completedModules || [])]));
              mergedProg[k] = {
                ...prevP,
                ...p,
                completedItems: compItems,
                completedModules: compMods,
                watchedLecturesCount: Math.max(prevP.watchedLecturesCount || 0, p.watchedLecturesCount || 0, compItems.length),
              };
            }
          }
          setStored(STORAGE_KEYS.PROGRESS, mergedProg, false);
        }

        // 9. Deletion requests, notifications, chat
        if (Array.isArray(d.deletionRequests)) {
          const localReqs = getStored<DeletionRequest[]>(STORAGE_KEYS.DELETION_REQUESTS, []);
          const reqMap = new Map<string, DeletionRequest>();
          localReqs.forEach((r) => { if (r && r.id) reqMap.set(r.id, r); });
          d.deletionRequests.forEach((r: DeletionRequest) => { if (r && r.id) reqMap.set(r.id, { ...(reqMap.get(r.id) || {}), ...r }); });
          setStored(STORAGE_KEYS.DELETION_REQUESTS, Array.from(reqMap.values()), false);
        }
        if (Array.isArray(d.notifications)) {
          const localNotifs = getStored<NotificationItem[]>(STORAGE_KEYS.NOTIFICATIONS, INITIAL_NOTIFICATIONS);
          const notifMap = new Map<string, NotificationItem>();
          localNotifs.forEach((n) => { if (n && n.id) notifMap.set(n.id, n); });
          d.notifications.forEach((n: NotificationItem) => { if (n && n.id) notifMap.set(n.id, { ...(notifMap.get(n.id) || {}), ...n }); });
          setStored(STORAGE_KEYS.NOTIFICATIONS, Array.from(notifMap.values()), false);
        }
        if (Array.isArray(d.chatThreads)) {
          const localCT = getStored<ChatThread[]>(STORAGE_KEYS.CHAT_THREADS, INITIAL_CHAT_THREADS);
          const ctMap = new Map<string, ChatThread>();
          localCT.forEach((t) => { if (t && t.id) ctMap.set(t.id, t); });
          d.chatThreads.forEach((t: ChatThread) => { if (t && t.id) ctMap.set(t.id, { ...(ctMap.get(t.id) || {}), ...t }); });
          setStored(STORAGE_KEYS.CHAT_THREADS, Array.from(ctMap.values()), false);
        }
        if (Array.isArray(d.chatMessages)) {
          const localCM = getStored<ChatMessage[]>(STORAGE_KEYS.CHAT_MESSAGES, INITIAL_CHAT_MESSAGES);
          const cmMap = new Map<string, ChatMessage>();
          localCM.forEach((m) => { if (m && m.id) cmMap.set(m.id, m); });
          d.chatMessages.forEach((m: ChatMessage) => { if (m && m.id) cmMap.set(m.id, { ...(cmMap.get(m.id) || {}), ...m }); });
          setStored(STORAGE_KEYS.CHAT_MESSAGES, Array.from(cmMap.values()), false);
        }
        if (Array.isArray(d.quizAttempts)) {
          const localQA = getStored<QuizAttempt[]>(STORAGE_KEYS.QUIZ_ATTEMPTS, []);
          const qaMap = new Map<string, QuizAttempt>();
          localQA.forEach((q) => { if (q && q.id) qaMap.set(q.id, q); });
          d.quizAttempts.forEach((q: QuizAttempt) => { if (q && q.id) qaMap.set(q.id, { ...(qaMap.get(q.id) || {}), ...q }); });
          setStored(STORAGE_KEYS.QUIZ_ATTEMPTS, Array.from(qaMap.values()), false);
        }

        localStorage.setItem(STORAGE_KEYS.LAST_SYNC, Date.now().toString());
        window.dispatchEvent(new CustomEvent('at_academics_data_updated'));
        return true;
      }
      return false;
    } catch (err) {
      // Local fallback in offline mode
      return false;
    } finally {
      syncInProgress = false;
    }
  },

  async pushToServer(): Promise<void> {
    try {
      const payload = {
        users: this.getAllUsers(),
        departments: this.getDepartments(),
        courses: this.getCourses(),
        assignments: this.getAssignments(),
        submissions: this.getSubmissions(),
        deletionRequests: this.getDeletionRequests(),
        notifications: this.getNotifications(),
        announcements: this.getAnnouncements(),
        chatThreads: this.getChatThreads(),
        chatMessages: getStored<ChatMessage[]>(STORAGE_KEYS.CHAT_MESSAGES, INITIAL_CHAT_MESSAGES),
        videoNotes: getStored<VideoNote[]>(STORAGE_KEYS.VIDEO_NOTES, INITIAL_VIDEO_NOTES),
        quizAttempts: getStored<QuizAttempt[]>(STORAGE_KEYS.QUIZ_ATTEMPTS, []),
        progress: this.getProgressMap(),
      };

      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: payload, adminDeletedIds: this.getDeletedItemIds() }),
      });
      if (res.ok) {
        localStorage.setItem(STORAGE_KEYS.LAST_SYNC, Date.now().toString());
      }
    } catch (err) {
      console.warn('Could not push sync to server:', err);
    }
  },

  startRealtimePolling(intervalMs: number = 3500): () => void {
    this.syncWithServer();
    if (pollingInterval) clearInterval(pollingInterval);
    pollingInterval = setInterval(() => {
      this.syncWithServer();
    }, intervalMs);

    const onFocus = () => this.syncWithServer();
    const onStorage = (e: StorageEvent) => {
      if (e.key && e.key.startsWith('at_academics_')) {
        window.dispatchEvent(new CustomEvent('at_academics_data_updated'));
      }
    };

    window.addEventListener('focus', onFocus);
    window.addEventListener('storage', onStorage);

    return () => {
      if (pollingInterval) clearInterval(pollingInterval);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('storage', onStorage);
    };
  },

  // Session & 1-hour idle timeout detection
  getCurrentUser(): User | null {
    const raw = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    if (!raw) return null;

    const lastActivityStr = localStorage.getItem(STORAGE_KEYS.LAST_ACTIVITY);
    if (lastActivityStr) {
      const lastActivity = parseInt(lastActivityStr, 10);
      const oneHour = 60 * 60 * 1000;
      if (Date.now() - lastActivity > oneHour) {
        this.logout();
        return null;
      }
    }

    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },

  touchActivity(): void {
    localStorage.setItem(STORAGE_KEYS.LAST_ACTIVITY, Date.now().toString());
  },

  setCurrentUser(user: User | null): void {
    if (user === null) {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
      localStorage.removeItem(STORAGE_KEYS.LAST_ACTIVITY);
    } else {
      setStored(STORAGE_KEYS.CURRENT_USER, user);
      this.touchActivity();
    }
  },

  logout(): void {
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    localStorage.removeItem(STORAGE_KEYS.LAST_ACTIVITY);
  },

  // Resilient Authentication (Staff & Student with automatic role detection)
  loginStaff(loginIdOrEmail: string, passwordAttempt: string): { success: boolean; user?: User; message?: string } {
    const users = this.getAllUsers();
    const cleanInput = loginIdOrEmail.trim().toLowerCase();
    const cleanPass = passwordAttempt.trim();

    // Find user across all fields
    const user = users.find(
      (u) =>
        (u.loginId && u.loginId.trim().toLowerCase() === cleanInput) ||
        (u.studentId && u.studentId.trim().toLowerCase() === cleanInput) ||
        (u.email && u.email.trim().toLowerCase() === cleanInput)
    );

    if (!user) {
      return { success: false, message: 'No staff account found with this Login ID or Email.' };
    }

    // Role check: If student tries to use staff login, explicitly reject
    if (user.role === 'student') {
      return {
        success: false,
        message: 'Access denied: Student credentials cannot sign in via Staff login. Please select the Student login option.',
      };
    }

    if (user.status === 'suspended') {
      return { success: false, message: 'This staff account has been suspended by administration.' };
    }

    const storedPass = (user.password || '').trim();
    if (storedPass !== cleanPass) {
      return { success: false, message: 'Incorrect password. Please verify your credentials or reset password.' };
    }

    this.setCurrentUser(user);
    this.pushToServer();
    return { success: true, user };
  },

  loginStudent(studentIdOrEmail: string, passwordAttempt: string): { success: boolean; user?: User; message?: string } {
    const users = this.getAllUsers();
    const cleanInput = studentIdOrEmail.trim().toLowerCase();
    const cleanPass = passwordAttempt.trim();

    const user = users.find(
      (u) =>
        (u.studentId && u.studentId.trim().toLowerCase() === cleanInput) ||
        (u.loginId && u.loginId.trim().toLowerCase() === cleanInput) ||
        (u.email && u.email.trim().toLowerCase() === cleanInput)
    );

    if (!user) {
      return { success: false, message: 'No student account found with this Student ID or Email.' };
    }

    // Role check: If staff/admin tries to use student login, explicitly reject
    if (user.role === 'admin' || user.role === 'teacher') {
      return {
        success: false,
        message: `Access denied: Staff accounts cannot sign in via Student login. Please select the Staff (Admin & Instructors) option.`,
      };
    }

    if (user.status === 'suspended') {
      return { success: false, message: 'Your student account is currently suspended. Please contact admissions.' };
    }

    const storedPass = (user.password || '').trim();
    if (storedPass !== cleanPass) {
      return { success: false, message: 'Incorrect password for Student ID.' };
    }

    this.setCurrentUser(user);
    this.pushToServer();
    return { success: true, user };
  },

  // Password reset workflows
  changePasswordWithCurrent(
    userIdOrLoginId: string,
    currentPass: string,
    newPass: string
  ): { success: boolean; message: string } {
    const users = this.getAllUsers();
    const cleanId = userIdOrLoginId.trim().toLowerCase();

    const userIndex = users.findIndex(
      (u) =>
        u.id.toLowerCase() === cleanId ||
        (u.loginId && u.loginId.toLowerCase() === cleanId) ||
        (u.email && u.email.toLowerCase() === cleanId)
    );

    if (userIndex === -1) {
      return { success: false, message: 'User account not found.' };
    }

    const user = users[userIndex];
    if ((user.password || '').trim() !== currentPass.trim()) {
      return { success: false, message: 'Current password provided is incorrect.' };
    }

    if (newPass.length < 6) {
      return { success: false, message: 'New password must contain at least 6 characters.' };
    }

    users[userIndex].password = newPass.trim();
    setStored(STORAGE_KEYS.USERS, users);

    const currentUser = this.getCurrentUser();
    if (currentUser?.id === user.id) {
      currentUser.password = newPass.trim();
      this.setCurrentUser(currentUser);
    }

    this.pushToServer();
    return { success: true, message: 'Password has been updated successfully.' };
  },

  requestPasswordResetOtp(emailOrLoginId: string): { success: boolean; message: string; otpCode?: string } {
    const users = this.getAllUsers();
    const cleanInput = emailOrLoginId.trim().toLowerCase();

    const userIndex = users.findIndex(
      (u) =>
        (u.email && u.email.toLowerCase() === cleanInput) ||
        (u.loginId && u.loginId.toLowerCase() === cleanInput)
    );

    if (userIndex === -1) {
      return { success: false, message: 'No account registered with this email address or login identifier.' };
    }

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    users[userIndex].resetOtp = otpCode;
    users[userIndex].resetOtpExpiry = expiry;
    setStored(STORAGE_KEYS.USERS, users);
    this.pushToServer();

    return {
      success: true,
      message: `A 6-digit one-time code has been generated and dispatched to ${users[userIndex].email}.`,
      otpCode,
    };
  },

  resetPasswordWithOtp(emailOrLoginId: string, enteredOtp: string, newPass: string): { success: boolean; message: string } {
    const users = this.getAllUsers();
    const cleanInput = emailOrLoginId.trim().toLowerCase();

    const userIndex = users.findIndex(
      (u) =>
        (u.email && u.email.toLowerCase() === cleanInput) ||
        (u.loginId && u.loginId.toLowerCase() === cleanInput)
    );

    if (userIndex === -1) {
      return { success: false, message: 'User account not found.' };
    }

    const user = users[userIndex];
    if (!user.resetOtp || user.resetOtp !== enteredOtp.trim()) {
      return { success: false, message: 'Invalid verification code entered.' };
    }

    if (user.resetOtpExpiry && new Date(user.resetOtpExpiry).getTime() < Date.now()) {
      return { success: false, message: 'The verification code has expired. Please request a new code.' };
    }

    if (newPass.length < 6) {
      return { success: false, message: 'New password must be at least 6 characters.' };
    }

    users[userIndex].password = newPass.trim();
    users[userIndex].resetOtp = undefined;
    users[userIndex].resetOtpExpiry = undefined;
    setStored(STORAGE_KEYS.USERS, users);

    const currentUser = this.getCurrentUser();
    if (currentUser?.id === user.id) {
      currentUser.password = newPass.trim();
      this.setCurrentUser(currentUser);
    }

    this.pushToServer();
    return { success: true, message: 'Password reset confirmed. You may now log in with your new password.' };
  },

  // Users Directory
  getAllUsers(): User[] {
    return getStored<User[]>(STORAGE_KEYS.USERS, INITIAL_USERS);
  },

  updateUserProfile(userId: string, updates: Partial<User>): User | null {
    const users = this.getAllUsers();
    const index = users.findIndex((u) => u.id === userId);
    if (index === -1) return null;

    users[index] = { ...users[index], ...updates };
    setStored(STORAGE_KEYS.USERS, users);

    const currentUser = this.getCurrentUser();
    if (currentUser?.id === userId) {
      const updatedCurrent = { ...currentUser, ...updates };
      this.setCurrentUser(updatedCurrent);
      this.pushToServer();
      return updatedCurrent;
    }
    this.pushToServer();
    return users[index];
  },

  // Admin user creation with GBP financial ledger
  adminCreateUser(userData: {
    name: string;
    email: string;
    loginId: string;
    password: string;
    role: 'teacher' | 'student';
    department?: string;
    cohort?: string;
    coursesEnrolled: string[];
    totalTuitionFee?: number;
    tuitionPaid?: number;
    graduationStatus?: 'graduated' | 'not_graduated' | 'expected';
    expectedGraduationDate?: string;
    graduatedOn?: string;
    passingMonth?: string;
    passingYear?: string;
    isGraduated?: boolean;
    qualificationTitle?: string;
    qualificationGrade?: string;
    awardInstitute?: string;
    awardingBody?: string;
    regulatedBy?: string;
  }): { success: boolean; user?: User; message?: string } {
    const users = this.getAllUsers();
    const cleanLoginId = userData.loginId.trim();
    const cleanEmail = userData.email.trim().toLowerCase();

    if (users.some((u) => u.loginId?.toLowerCase() === cleanLoginId.toLowerCase() || (cleanEmail && u.email?.toLowerCase() === cleanEmail))) {
      return { success: false, message: 'A user with this Login ID or Email already exists.' };
    }

    const totalFee = userData.totalTuitionFee || 0;
    const paid = userData.tuitionPaid || 0;
    const due = Math.max(0, totalFee - paid);

    const newUser: User = {
      id: `user-${Date.now()}`,
      name: userData.name.trim(),
      email: cleanEmail || `${cleanLoginId.toLowerCase()}@atacademics.co.uk`,
      loginId: cleanLoginId,
      studentId: userData.role === 'student' ? cleanLoginId : undefined,
      password: userData.password.trim(),
      role: userData.role,
      department: userData.department || 'General Academics',
      cohort: userData.cohort || '2026 Cohort',
      coursesEnrolled: userData.coursesEnrolled || [],
      status: 'active',
      totalTuitionFee: userData.role === 'student' ? totalFee : undefined,
      tuitionPaid: userData.role === 'student' ? paid : undefined,
      tuitionDue: userData.role === 'student' ? due : undefined,
      graduationStatus: userData.graduationStatus,
      expectedGraduationDate: userData.expectedGraduationDate,
      graduatedOn: userData.graduatedOn,
      passingMonth: userData.passingMonth,
      passingYear: userData.passingYear,
      isGraduated: userData.isGraduated,
      qualificationTitle: userData.qualificationTitle,
      qualificationGrade: userData.qualificationGrade,
      awardInstitute: userData.awardInstitute || 'AT Academics',
      awardingBody: userData.awardingBody,
      regulatedBy: userData.regulatedBy,
    };

    users.push(newUser);
    setStored(STORAGE_KEYS.USERS, users);

    // Initialize course progress for student
    if (userData.role === 'student') {
      const progressMap = this.getProgressMap();
      const allCourses = this.getCourses();
      (userData.coursesEnrolled || []).forEach((code) => {
        const crs = allCourses.find((c) => c.code === code);
        if (crs) {
          const key = `${newUser.studentId}_${crs.id}`;
          progressMap[key] = {
            studentId: newUser.studentId!,
            courseId: crs.id,
            watchedLecturesCount: 0,
            totalLecturesCount: (crs.modules || []).reduce(
              (acc, m) => acc + (m.items || []).filter((i) => i.type === 'video').length,
              0
            ),
            completedItems: [],
            assignmentScores: [],
            currentAverageScore: 0,
            letterGrade: 'N/A',
            attendancePercent: 0,
            lastActive: new Date().toISOString(),
            atRisk: false,
          };
        }
      });
      setStored(STORAGE_KEYS.PROGRESS, progressMap);
    }

    this.pushToServer();
    return { success: true, user: newUser };
  },

  adminUpdateUser(userId: string, updates: Partial<User>): User | null {
    const users = this.getAllUsers();
    const index = users.findIndex((u) => u.id === userId);
    if (index === -1) return null;

    if (updates.totalTuitionFee !== undefined || updates.tuitionPaid !== undefined) {
      const total = updates.totalTuitionFee ?? users[index].totalTuitionFee ?? 0;
      const paid = updates.tuitionPaid ?? users[index].tuitionPaid ?? 0;
      updates.tuitionDue = Math.max(0, total - paid);
    }

    if (updates.loginId) {
      const role = updates.role || users[index].role;
      if (role === 'student') {
        updates.studentId = updates.loginId;
      }
    }

    users[index] = { ...users[index], ...updates };
    setStored(STORAGE_KEYS.USERS, users);

    const current = this.getCurrentUser();
    if (current?.id === userId) {
      this.setCurrentUser(users[index]);
    }
    this.pushToServer();
    return users[index];
  },

  deleteUser(userId: string): { success: boolean; message?: string } {
    const users = this.getAllUsers();
    const user = users.find((u) => u.id === userId);
    if (!user) return { success: false, message: 'User not found' };
    if (user.role === 'admin') return { success: false, message: 'Administrator profile cannot be deleted.' };

    const remaining = users.filter((u) => u.id !== userId);
    setStored(STORAGE_KEYS.USERS, remaining);
    this.recordAdminDeletion(userId);
    this.pushToServer();
    return { success: true };
  },

  // Qualification & Degree Certificate Verification
  verifyQualification(
    studentIdOrLoginId: string,
    passingMonth: string = 'July',
    passingYear: string = '2026',
    graduationOption?: 'graduated' | 'not_graduated' | 'expected'
  ): {
    verified: boolean;
    record?: {
      studentId: string;
      studentName: string;
      qualificationTitle: string;
      passingMonth: string;
      passingYear: string;
      graduatedOn: string;
      grade: string;
      awardInstitute: string;
      awardingBody?: string;
      regulatedBy?: string;
      status: string;
    };
    message: string;
  } {
    const cleanId = studentIdOrLoginId.trim().toLowerCase();
    const cleanMonth = passingMonth.trim().toLowerCase();
    const cleanYear = passingYear.trim();

    const users = this.getAllUsers();
    const student = users.find(
      (u) =>
        u.role === 'student' &&
        ((u.studentId && u.studentId.trim().toLowerCase() === cleanId) ||
          (u.loginId && u.loginId.trim().toLowerCase() === cleanId))
    );

    if (!student) {
      return {
        verified: false,
        message: `No student record found with Student ID "${studentIdOrLoginId}".`,
      };
    }

    const firstCourse = this.getCourses().find((c) => (student.coursesEnrolled || []).includes(c.code));
    const qualTitle =
      student.qualificationTitle ||
      (firstCourse ? `Degree of ${firstCourse.title}` : 'BSc (Hons) Business Management');

    const resolveAwardingBody = (qTitle: string, customBody?: string, customReg?: string) => {
      const q = (qTitle || '').toLowerCase();
      const b = (customBody || '').toLowerCase();

      // Explicit custom body for AT Academics
      if (customBody === 'AT Academics' || b.includes('at academics') || q.includes('at academics')) {
        return {
          awardingBody: 'AT Academics',
          regulatedBy: customReg || 'AT Academics Academic Registry',
        };
      }

      if (customBody && customReg) {
        return { awardingBody: customBody, regulatedBy: customReg };
      }

      if (q.includes('athe') || b.includes('athe')) {
        return {
          awardingBody: 'ATHE',
          regulatedBy: 'Regulated by Ofqual',
        };
      }
      if (
        q.includes('othm') ||
        b.includes('othm') ||
        q.includes('extended level 5') ||
        q.includes('240 credit') ||
        q.includes('level 3') ||
        q.includes('level 4') ||
        q.includes('level 5') ||
        q.includes('level 6') ||
        q.includes('level 7')
      ) {
        return {
          awardingBody: 'OTHM',
          regulatedBy: 'Regulated by Ofqual',
        };
      }
      return {
        awardingBody: customBody || 'AT Academics',
        regulatedBy: customReg || 'AT Academics Academic Registry',
      };
    };

    const awardInfo = resolveAwardingBody(qualTitle, student.awardingBody, student.regulatedBy);

    // Check if student has not graduated yet
    if (
      student.isGraduated === false ||
      student.graduationStatus === 'not_graduated' ||
      student.graduatedOn === 'Not Graduated Yet'
    ) {
      return {
        verified: true,
        record: {
          studentId: student.studentId || student.loginId,
          studentName: student.name,
          qualificationTitle: qualTitle,
          passingMonth: 'In Progress',
          passingYear: 'Active',
          graduatedOn: 'Not Graduated Yet',
          grade: 'In Progress (Active Coursework)',
          awardInstitute: student.awardInstitute || 'AT Academics',
          awardingBody: awardInfo.awardingBody,
          regulatedBy: awardInfo.regulatedBy,
          status: 'Currently Enrolled (Not Graduated Yet)',
        },
        message: `Student "${student.name}" (${student.studentId || student.loginId}) is an active enrolled student at AT Academics and has NOT graduated yet (Degree in progress).`,
      };
    }

    if (
      student.graduationStatus === 'expected' ||
      (student.graduatedOn && student.graduatedOn.startsWith('Expected'))
    ) {
      const expDate =
        student.expectedGraduationDate ||
        student.graduatedOn?.replace('Expected: ', '') ||
        'July 2027';
      return {
        verified: true,
        record: {
          studentId: student.studentId || student.loginId,
          studentName: student.name,
          qualificationTitle: qualTitle,
          passingMonth: expDate.split(' ')[0] || 'Expected',
          passingYear: expDate.split(' ')[1] || '2027',
          graduatedOn: `Expected: ${expDate}`,
          grade: 'In Progress (Active Candidate)',
          awardInstitute: student.awardInstitute || 'AT Academics',
          awardingBody: awardInfo.awardingBody,
          regulatedBy: awardInfo.regulatedBy,
          status: `Active Student (Expected Graduation: ${expDate})`,
        },
        message: `Student "${student.name}" (${student.studentId || student.loginId}) is an active candidate with an expected graduation date of ${expDate}.`,
      };
    }

    // Default or configured qualification details (synced with Graduated On for graduated students)
    let recMonth = (student.passingMonth || '').trim().toLowerCase();
    let recYear = (student.passingYear || '').trim();

    if (student.graduatedOn) {
      const parts = student.graduatedOn.trim().split(/\s+/);
      if (parts.length >= 2) {
        if (!recMonth) recMonth = parts[0].toLowerCase();
        if (!recYear) recYear = parts[1];
      }
    }
    if (!recMonth) recMonth = 'july';
    if (!recYear) recYear = '2026';

    const monthMatches =
      recMonth === cleanMonth ||
      cleanMonth.startsWith(recMonth.slice(0, 3)) ||
      recMonth.startsWith(cleanMonth.slice(0, 3));
    const yearMatches = recYear === cleanYear;

    if (!monthMatches || !yearMatches) {
      const displayExpected =
        student.graduatedOn || `${student.passingMonth || 'July'} ${student.passingYear || '2026'}`;
      return {
        verified: false,
        message: `Student ID "${student.studentId || student.loginId}" found, but entered graduation date (${passingMonth} ${passingYear}) does not match student's recorded graduation date (${displayExpected}).`,
      };
    }

    const effectiveGradMonth = student.passingMonth || (student.graduatedOn ? student.graduatedOn.split(' ')[0] : 'July');
    const effectiveGradYear = student.passingYear || (student.graduatedOn ? student.graduatedOn.split(' ')[1] : '2026');
    const effectiveGradOn = student.graduatedOn || `${effectiveGradMonth} ${effectiveGradYear}`;

    return {
      verified: true,
      record: {
        studentId: student.studentId || student.loginId,
        studentName: student.name,
        qualificationTitle: qualTitle,
        passingMonth: effectiveGradMonth,
        passingYear: effectiveGradYear,
        graduatedOn: effectiveGradOn,
        grade: student.qualificationGrade || 'First Class Honours (1st)',
        awardInstitute: student.awardInstitute || 'AT Academics',
        awardingBody: awardInfo.awardingBody,
        regulatedBy: awardInfo.regulatedBy,
        status: student.status === 'active' ? 'Award Conferred & Authenticated' : 'Under Review',
      },
      message: 'Official Academic Qualification Authenticated.',
    };
  },

  // Departments
  getDepartments(): Department[] {
    return getStored<Department[]>(STORAGE_KEYS.DEPARTMENTS, INITIAL_DEPARTMENTS);
  },

  addDepartment(data: { name: string; code: string; description: string; headOfDepartment?: string }): Department {
    const departments = this.getDepartments();
    const newDept: Department = {
      id: `dept-${Date.now()}`,
      name: data.name.trim(),
      code: data.code.trim().toUpperCase(),
      description: data.description.trim(),
      headOfDepartment: data.headOfDepartment?.trim() || 'Academic Faculty Dean',
    };
    departments.push(newDept);
    setStored(STORAGE_KEYS.DEPARTMENTS, departments);
    this.pushToServer();
    return newDept;
  },

  updateDepartment(deptId: string, updates: Partial<Department>): Department | null {
    const departments = this.getDepartments();
    const index = departments.findIndex((d) => d.id === deptId);
    if (index === -1) return null;

    const oldName = departments[index].name;
    const newName = updates.name ? updates.name.trim() : oldName;

    departments[index] = {
      ...departments[index],
      ...updates,
      name: newName,
      code: updates.code ? updates.code.trim().toUpperCase() : departments[index].code,
    };
    setStored(STORAGE_KEYS.DEPARTMENTS, departments);

    // If department name changed, sync in courses
    if (newName !== oldName) {
      const courses = this.getCourses();
      courses.forEach((c) => {
        if (c.departmentId === deptId || c.department === oldName) {
          c.department = newName;
        }
      });
      setStored(STORAGE_KEYS.COURSES, courses);
    }

    this.pushToServer();
    return departments[index];
  },

  deleteDepartment(deptId: string): void {
    const departments = this.getDepartments().filter((d) => d.id !== deptId);
    setStored(STORAGE_KEYS.DEPARTMENTS, departments);
    this.recordAdminDeletion(deptId);
    this.pushToServer();
  },

  // Courses / Programs (Full Admin & Instructor Capabilities)
  getCourses(): Course[] {
    return getStored<Course[]>(STORAGE_KEYS.COURSES, INITIAL_COURSES);
  },

  getCourseById(courseId: string): Course | undefined {
    return this.getCourses().find((c) => c.id === courseId || c.code === courseId);
  },

  addCourse(newCourse: Omit<Course, 'id' | 'enrolledCount' | 'modules' | 'studyMaterials' | 'assignmentGuides' | 'quizzes'>): Course {
    const courses = this.getCourses();
    const course: Course = {
      ...newCourse,
      id: `course-${newCourse.code.toLowerCase().replace(/[^a-z0-9]/g, '')}-${Date.now()}`,
      enrolledCount: 0,
      modules: [],
      studyMaterials: [],
      assignmentGuides: [],
      quizzes: [],
    };
    courses.unshift(course);
    setStored(STORAGE_KEYS.COURSES, courses);

    this.addNotification({
      type: 'announcement',
      title: `New Program Created: ${course.code} - ${course.title}`,
      message: `Curriculum published under ${course.department} by ${course.instructorName}.`,
      courseCode: course.code,
      read: false,
    });

    this.pushToServer();
    return course;
  },

  // ADMIN FULL ACCESS: Update course name, course code, department, level, description, etc.
  updateCourse(courseId: string, updates: Partial<Course>): Course | null {
    const courses = this.getCourses();
    const index = courses.findIndex((c) => c.id === courseId);
    if (index === -1) return null;

    const oldCode = courses[index].code;
    const newCode = updates.code ? updates.code.trim().toUpperCase() : oldCode;

    courses[index] = {
      ...courses[index],
      ...updates,
      code: newCode,
    };

    // If course code changed, synchronize enrolled courses in all users and assignments
    if (newCode !== oldCode) {
      const users = this.getAllUsers();
      users.forEach((u) => {
        if (Array.isArray(u.coursesEnrolled)) {
          u.coursesEnrolled = u.coursesEnrolled.map((c) => (c === oldCode ? newCode : c));
        }
      });
      setStored(STORAGE_KEYS.USERS, users);

      const assignments = this.getAssignments();
      assignments.forEach((a) => {
        if (a.courseCode === oldCode) a.courseCode = newCode;
      });
      setStored(STORAGE_KEYS.ASSIGNMENTS, assignments);

      const submissions = this.getSubmissions();
      submissions.forEach((s) => {
        if (s.courseCode === oldCode) s.courseCode = newCode;
      });
      setStored(STORAGE_KEYS.SUBMISSIONS, submissions);
    }

    setStored(STORAGE_KEYS.COURSES, courses);

    this.addNotification({
      type: 'announcement',
      title: `Curriculum Updated: ${courses[index].code} - ${courses[index].title}`,
      message: `Administrator updated course specifications and details.`,
      courseCode: courses[index].code,
      read: false,
    });

    this.pushToServer();
    return courses[index];
  },

  deleteCourseDirectly(courseId: string): void {
    const courses = this.getCourses().filter((c) => c.id !== courseId);
    setStored(STORAGE_KEYS.COURSES, courses);
    this.recordAdminDeletion(courseId);
    this.pushToServer();
  },

  eraseAllCourses(): void {
    // Retained for backward-compat type signature but strictly disabled to prevent accidental wipes
    console.warn('eraseAllCourses called - ignored to enforce permanent data retention');
  },

  // Study Materials
  addStudyMaterial(courseId: string, materialData: Omit<StudyMaterial, 'id' | 'uploadedAt'>): StudyMaterial | null {
    const courses = this.getCourses();
    const course = courses.find((c) => c.id === courseId);
    if (!course) return null;

    if (!course.studyMaterials) course.studyMaterials = [];

    const newMaterial: StudyMaterial = {
      ...materialData,
      id: `mat-${Date.now()}`,
      uploadedAt: new Date().toISOString(),
    };

    course.studyMaterials.unshift(newMaterial);
    if (materialData.moduleId && course.modules) {
      const targetMod = course.modules.find((m) => m.id === materialData.moduleId);
      if (targetMod) {
        if (!targetMod.studyMaterials) targetMod.studyMaterials = [];
        targetMod.studyMaterials.unshift(newMaterial);
      }
    }
    setStored(STORAGE_KEYS.COURSES, courses);

    this.addNotification({
      type: 'announcement',
      title: `New Material in ${course.code}: ${newMaterial.title}`,
      message: `${newMaterial.fileName} (${newMaterial.fileSize}) uploaded by ${newMaterial.uploadedBy}.`,
      courseCode: course.code,
      read: false,
    });

    this.pushToServer();
    return newMaterial;
  },

  updateStudyMaterial(courseId: string, materialId: string, updates: Partial<StudyMaterial>): StudyMaterial | null {
    const courses = this.getCourses();
    const course = courses.find((c) => c.id === courseId);
    if (!course || !course.studyMaterials) return null;
    const index = course.studyMaterials.findIndex((m) => m.id === materialId);
    if (index === -1) return null;

    course.studyMaterials[index] = { ...course.studyMaterials[index], ...updates };
    if (course.modules) {
      course.modules.forEach((mod) => {
        if (mod.studyMaterials) {
          const modMatIdx = mod.studyMaterials.findIndex((m) => m.id === materialId);
          if (modMatIdx !== -1) {
            mod.studyMaterials[modMatIdx] = { ...mod.studyMaterials[modMatIdx], ...updates };
          }
        }
      });
    }
    setStored(STORAGE_KEYS.COURSES, courses);
    this.pushToServer();
    return course.studyMaterials[index];
  },

  deleteStudyMaterial(courseId: string, materialId: string): void {
    const courses = this.getCourses();
    const course = courses.find((c) => c.id === courseId);
    if (!course || !course.studyMaterials) return;
    course.studyMaterials = course.studyMaterials.filter((m) => m.id !== materialId);
    if (course.modules) {
      course.modules.forEach((mod) => {
        if (mod.studyMaterials) {
          mod.studyMaterials = mod.studyMaterials.filter((m) => m.id !== materialId);
        }
      });
    }
    setStored(STORAGE_KEYS.COURSES, courses);
    this.recordAdminDeletion(materialId);
    this.pushToServer();
  },

  // Erase all study materials across every course and module
  eraseAllStudyMaterials(): void {
    // Retained for backward-compat type signature but strictly disabled to prevent accidental wipes
    console.warn('eraseAllStudyMaterials called - ignored to enforce permanent data retention');
  },

  // Assignment Guides
  addAssignmentGuide(courseId: string, guideData: Omit<AssignmentGuide, 'id' | 'uploadedAt'>): AssignmentGuide | null {
    const courses = this.getCourses();
    const course = courses.find((c) => c.id === courseId);
    if (!course) return null;

    if (!course.assignmentGuides) course.assignmentGuides = [];

    const newGuide: AssignmentGuide = {
      ...guideData,
      id: `guide-${Date.now()}`,
      uploadedAt: new Date().toISOString(),
    };

    course.assignmentGuides.unshift(newGuide);
    if (guideData.moduleId && course.modules) {
      const targetMod = course.modules.find((m) => m.id === guideData.moduleId);
      if (targetMod) {
        if (!targetMod.assignmentGuides) targetMod.assignmentGuides = [];
        targetMod.assignmentGuides.unshift(newGuide);
      }
    }
    setStored(STORAGE_KEYS.COURSES, courses);

    this.addNotification({
      type: 'deadline',
      title: `Assignment Guide Published: ${newGuide.title}`,
      message: `Brief and marking matrix published in ${course.code}.`,
      courseCode: course.code,
      read: false,
      urgent: true,
      dueDate: newGuide.dueDate,
    });

    this.pushToServer();
    return newGuide;
  },

  updateAssignmentGuide(courseId: string, guideId: string, updates: Partial<AssignmentGuide>): AssignmentGuide | null {
    const courses = this.getCourses();
    const course = courses.find((c) => c.id === courseId);
    if (!course || !course.assignmentGuides) return null;
    const index = course.assignmentGuides.findIndex((g) => g.id === guideId);
    if (index === -1) return null;

    course.assignmentGuides[index] = { ...course.assignmentGuides[index], ...updates };
    if (course.modules) {
      course.modules.forEach((mod) => {
        if (mod.assignmentGuides) {
          const modGuideIdx = mod.assignmentGuides.findIndex((g) => g.id === guideId);
          if (modGuideIdx !== -1) {
            mod.assignmentGuides[modGuideIdx] = { ...mod.assignmentGuides[modGuideIdx], ...updates };
          }
        }
      });
    }
    setStored(STORAGE_KEYS.COURSES, courses);
    this.pushToServer();
    return course.assignmentGuides[index];
  },

  deleteAssignmentGuide(courseId: string, guideId: string): void {
    const courses = this.getCourses();
    const course = courses.find((c) => c.id === courseId);
    if (!course || !course.assignmentGuides) return;
    course.assignmentGuides = course.assignmentGuides.filter((g) => g.id !== guideId);
    if (course.modules) {
      course.modules.forEach((mod) => {
        if (mod.assignmentGuides) {
          mod.assignmentGuides = mod.assignmentGuides.filter((g) => g.id !== guideId);
        }
      });
    }
    setStored(STORAGE_KEYS.COURSES, courses);
    this.recordAdminDeletion(guideId);
    this.pushToServer();
  },

  // Quizzes
  addQuiz(courseId: string, quizData: Omit<Quiz, 'id' | 'createdAt'>): Quiz | null {
    const courses = this.getCourses();
    const course = courses.find((c) => c.id === courseId);
    if (!course) return null;

    if (!course.quizzes) course.quizzes = [];

    const newQuiz: Quiz = {
      ...quizData,
      id: `quiz-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };

    course.quizzes.unshift(newQuiz);
    if (quizData.moduleId && course.modules) {
      const targetMod = course.modules.find((m) => m.id === quizData.moduleId);
      if (targetMod) {
        if (!targetMod.quizzes) targetMod.quizzes = [];
        targetMod.quizzes.unshift(newQuiz);
      }
    }
    setStored(STORAGE_KEYS.COURSES, courses);

    this.addNotification({
      type: 'announcement',
      title: `New Assessment Quiz: ${newQuiz.title}`,
      message: `${newQuiz.questions.length} questions assessing ${course.code} curriculum.`,
      courseCode: course.code,
      read: false,
    });

    this.pushToServer();
    return newQuiz;
  },

  updateQuiz(courseId: string, quizId: string, updates: Partial<Quiz>): Quiz | null {
    const courses = this.getCourses();
    const course = courses.find((c) => c.id === courseId);
    if (!course || !course.quizzes) return null;
    const index = course.quizzes.findIndex((q) => q.id === quizId);
    if (index === -1) return null;

    course.quizzes[index] = { ...course.quizzes[index], ...updates };
    if (course.modules) {
      course.modules.forEach((mod) => {
        if (mod.quizzes) {
          const modQIdx = mod.quizzes.findIndex((q) => q.id === quizId);
          if (modQIdx !== -1) {
            mod.quizzes[modQIdx] = { ...mod.quizzes[modQIdx], ...updates };
          }
        }
      });
    }
    setStored(STORAGE_KEYS.COURSES, courses);
    this.pushToServer();
    return course.quizzes[index];
  },

  deleteQuiz(courseId: string, quizId: string): void {
    const courses = this.getCourses();
    const course = courses.find((c) => c.id === courseId);
    if (!course || !course.quizzes) return;
    course.quizzes = course.quizzes.filter((q) => q.id !== quizId);
    if (course.modules) {
      course.modules.forEach((mod) => {
        if (mod.quizzes) {
          mod.quizzes = mod.quizzes.filter((q) => q.id !== quizId);
        }
      });
    }
    setStored(STORAGE_KEYS.COURSES, courses);
    this.recordAdminDeletion(quizId);
    this.pushToServer();
  },

  // Student Quiz Attempts & Results
  getQuizAttempts(quizId?: string, studentId?: string): QuizAttempt[] {
    const attempts = getStored<QuizAttempt[]>(STORAGE_KEYS.QUIZ_ATTEMPTS, []);
    return attempts.filter((a) => {
      const matchQuiz = !quizId || a.quizId === quizId;
      const matchStudent = !studentId || a.studentId === studentId;
      return matchQuiz && matchStudent;
    });
  },

  saveQuizAttempt(attemptData: Omit<QuizAttempt, 'id' | 'completedAt'>): QuizAttempt {
    const attempts = getStored<QuizAttempt[]>(STORAGE_KEYS.QUIZ_ATTEMPTS, []);
    const newAttempt: QuizAttempt = {
      ...attemptData,
      id: `attempt-${Date.now()}`,
      completedAt: new Date().toISOString(),
    };
    attempts.unshift(newAttempt);
    setStored(STORAGE_KEYS.QUIZ_ATTEMPTS, attempts);
    this.pushToServer();
    return newAttempt;
  },

  // Modules & Items
  addModuleToCourse(courseId: string, moduleData: Omit<CourseModule, 'id' | 'items'>): CourseModule | null {
    const courses = this.getCourses();
    const course = courses.find((c) => c.id === courseId);
    if (!course) return null;
    const newModule: CourseModule = {
      ...moduleData,
      id: `mod-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      items: [],
      studyMaterials: moduleData.studyMaterials || [],
      assignmentGuides: moduleData.assignmentGuides || [],
      quizzes: moduleData.quizzes || [],
    };
    if (!course.modules) course.modules = [];
    course.modules.push(newModule);
    setStored(STORAGE_KEYS.COURSES, courses);
    this.pushToServer();
    return newModule;
  },

  addModulesBatch(courseId: string, modules: Array<Omit<CourseModule, 'id' | 'items'>>): CourseModule[] {
    const courses = this.getCourses();
    const course = courses.find((c) => c.id === courseId);
    if (!course) return [];
    if (!course.modules) course.modules = [];

    const now = Date.now();
    const newModules: CourseModule[] = modules.map((m, idx) => ({
      ...m,
      id: `mod-${now}-${idx}-${Math.random().toString(36).substr(2, 5)}`,
      items: [],
      studyMaterials: m.studyMaterials || [],
      assignmentGuides: m.assignmentGuides || [],
      quizzes: m.quizzes || [],
    }));

    course.modules.push(...newModules);
    setStored(STORAGE_KEYS.COURSES, courses);
    this.pushToServer();
    return newModules;
  },

  updateModule(courseId: string, moduleId: string, updates: Partial<CourseModule>): CourseModule | null {
    const courses = this.getCourses();
    const course = courses.find((c) => c.id === courseId);
    if (!course || !course.modules) return null;
    const index = course.modules.findIndex((m) => m.id === moduleId);
    if (index === -1) return null;

    course.modules[index] = { ...course.modules[index], ...updates };
    setStored(STORAGE_KEYS.COURSES, courses);
    this.pushToServer();
    return course.modules[index];
  },

  deleteModuleDirectly(courseId: string, moduleId: string): void {
    const courses = this.getCourses();
    const course = courses.find((c) => c.id === courseId);
    if (!course || !course.modules) return;
    course.modules = course.modules.filter((m) => m.id !== moduleId);
    setStored(STORAGE_KEYS.COURSES, courses);
    this.recordAdminDeletion(moduleId);
    this.pushToServer();
  },

  addModuleItem(courseId: string, moduleId: string, itemData: Omit<ModuleItem, 'id'>): ModuleItem | null {
    const courses = this.getCourses();
    const course = courses.find((c) => c.id === courseId);
    if (!course) return null;
    const courseModule = course.modules.find((m) => m.id === moduleId);
    if (!courseModule) return null;

    const newItem: ModuleItem = {
      ...itemData,
      id: `item-${Date.now()}`,
    };
    if (!courseModule.items) courseModule.items = [];
    courseModule.items.push(newItem);
    setStored(STORAGE_KEYS.COURSES, courses);

    if (itemData.type === 'video') {
      this.addNotification({
        type: 'announcement',
        title: `New Video Lecture Published in ${course.code}`,
        message: `${newItem.title} is now available for secure streaming.`,
        courseCode: course.code,
        read: false,
      });
    }

    this.pushToServer();
    return newItem;
  },

  updateModuleItem(courseId: string, moduleId: string, itemId: string, updates: Partial<ModuleItem>): ModuleItem | null {
    const courses = this.getCourses();
    const course = courses.find((c) => c.id === courseId);
    if (!course || !course.modules) return null;
    const courseModule = course.modules.find((m) => m.id === moduleId);
    if (!courseModule || !courseModule.items) return null;
    const index = courseModule.items.findIndex((i) => i.id === itemId);
    if (index === -1) return null;

    courseModule.items[index] = { ...courseModule.items[index], ...updates };
    setStored(STORAGE_KEYS.COURSES, courses);
    this.pushToServer();
    return courseModule.items[index];
  },

  deleteModuleItemDirectly(courseId: string, moduleId: string, itemId: string): void {
    const courses = this.getCourses();
    const course = courses.find((c) => c.id === courseId);
    if (!course || !course.modules) return;
    const mod = course.modules.find((m) => m.id === moduleId);
    if (!mod || !mod.items) return;
    mod.items = mod.items.filter((i) => i.id !== itemId);
    setStored(STORAGE_KEYS.COURSES, courses);
    this.recordAdminDeletion(itemId);
    this.pushToServer();
  },

  // Deletion Requests
  getDeletionRequests(): DeletionRequest[] {
    return getStored<DeletionRequest[]>(STORAGE_KEYS.DELETION_REQUESTS, []);
  },

  submitDeletionRequest(data: {
    teacherId: string;
    teacherName: string;
    targetType: 'course' | 'module' | 'assignment' | 'material';
    targetId: string;
    targetTitle: string;
    courseCode?: string;
    reason: string;
  }): DeletionRequest {
    const requests = this.getDeletionRequests();
    const newReq: DeletionRequest = {
      ...data,
      id: `req-${Date.now()}`,
      requestedAt: new Date().toISOString(),
      status: 'pending',
    };
    requests.unshift(newReq);
    setStored(STORAGE_KEYS.DELETION_REQUESTS, requests);

    this.addNotification({
      type: 'announcement',
      title: `Instructor Deletion Request: ${data.targetTitle}`,
      message: `${data.teacherName} requested permission to delete ${data.targetType}.`,
      urgent: true,
      read: false,
    });

    this.pushToServer();
    return newReq;
  },

  resolveDeletionRequest(requestId: string, approve: boolean, adminFeedback?: string): void {
    const requests = this.getDeletionRequests();
    const req = requests.find((r) => r.id === requestId);
    if (!req) return;

    req.status = approve ? 'approved' : 'rejected';
    req.adminFeedback = adminFeedback;
    setStored(STORAGE_KEYS.DELETION_REQUESTS, requests);

    if (approve) {
      if (req.targetType === 'course') {
        this.deleteCourseDirectly(req.targetId);
      } else if (req.targetType === 'module') {
        const courses = this.getCourses();
        for (const c of courses) {
          if (c.modules?.some((m) => m.id === req.targetId)) {
            this.deleteModuleDirectly(c.id, req.targetId);
            break;
          }
        }
      } else if (req.targetType === 'material') {
        const courses = this.getCourses();
        for (const c of courses) {
          if (
            c.studyMaterials?.some((m) => m.id === req.targetId) ||
            c.modules?.some((mod) => mod.studyMaterials?.some((m) => m.id === req.targetId))
          ) {
            this.deleteStudyMaterial(c.id, req.targetId);
            break;
          }
        }
      } else if (req.targetType === 'assignment') {
        this.deleteAssignmentDirectly(req.targetId);
      }
    }
    this.pushToServer();
  },

  // Assignments & Submissions
  getAssignments(): Assignment[] {
    return getStored<Assignment[]>(STORAGE_KEYS.ASSIGNMENTS, INITIAL_ASSIGNMENTS);
  },

  addAssignment(newAssignment: Omit<Assignment, 'id'>): Assignment {
    const assignments = this.getAssignments();
    const assignment: Assignment = {
      ...newAssignment,
      id: `assign-${Date.now()}`,
    };
    assignments.unshift(assignment);
    setStored(STORAGE_KEYS.ASSIGNMENTS, assignments);

    this.addNotification({
      type: 'deadline',
      title: `Assignment Published: ${assignment.title}`,
      message: `Due date: ${new Date(assignment.dueDate).toLocaleDateString()}. Total marks: ${assignment.totalPoints}.`,
      courseCode: assignment.courseCode,
      targetLink: 'assignments',
      read: false,
      urgent: true,
      dueDate: assignment.dueDate,
    });

    this.pushToServer();
    return assignment;
  },

  deleteAssignmentDirectly(assignmentId: string): void {
    const assignments = this.getAssignments().filter((a) => a.id !== assignmentId);
    setStored(STORAGE_KEYS.ASSIGNMENTS, assignments);
    this.recordAdminDeletion(assignmentId);
    this.pushToServer();
  },

  getSubmissions(): AssignmentSubmission[] {
    return getStored<AssignmentSubmission[]>(STORAGE_KEYS.SUBMISSIONS, INITIAL_SUBMISSIONS);
  },

  addSubmission(subData: Omit<AssignmentSubmission, 'id' | 'submittedAt' | 'status'>): AssignmentSubmission {
    const submissions = this.getSubmissions();
    const submission: AssignmentSubmission = {
      ...subData,
      id: `sub-${Date.now()}`,
      submittedAt: new Date().toISOString(),
      status: 'submitted',
    };
    submissions.unshift(submission);
    setStored(STORAGE_KEYS.SUBMISSIONS, submissions);

    this.addNotification({
      type: 'announcement',
      title: `Submission Received: ${submission.assignmentTitle}`,
      message: `${submission.studentName} uploaded "${submission.fileName}".`,
      courseCode: submission.courseCode,
      targetLink: 'assignments',
      read: false,
    });

    this.pushToServer();
    return submission;
  },

  createAssignment(newAssignment: Omit<Assignment, 'id'>): Assignment {
    return this.addAssignment(newAssignment);
  },

  submitAssignment(data: {
    assignmentId: string;
    moduleId?: string;
    courseId?: string;
    courseCode?: string;
    studentId: string;
    studentName: string;
    studentEmail: string;
    fileName: string;
    fileSize: string;
    fileContentPreview: string;
  }): AssignmentSubmission {
    const assignment = this.getAssignments().find((a) => a.id === data.assignmentId);
    const resolvedCourseId = data.courseId || assignment?.courseId || '';
    const resolvedCourseCode = data.courseCode || assignment?.courseCode || '';
    const resolvedModuleId = data.moduleId || assignment?.moduleId;

    const sub = this.addSubmission({
      assignmentId: data.assignmentId,
      moduleId: resolvedModuleId,
      assignmentTitle: assignment?.title || 'Academic Module Assignment',
      courseId: resolvedCourseId,
      courseCode: resolvedCourseCode,
      studentId: data.studentId,
      studentName: data.studentName,
      studentEmail: data.studentEmail,
      fileName: data.fileName,
      fileSize: data.fileSize,
      fileContentPreview: data.fileContentPreview,
    });

    if (resolvedCourseId) {
      const progressMap = this.getProgressMap();
      const key = `${data.studentId}_${resolvedCourseId}`;
      const existing = progressMap[key] || {
        studentId: data.studentId,
        courseId: resolvedCourseId,
        watchedLecturesCount: 1,
        totalLecturesCount: 1,
        completedItems: [],
        assignmentScores: [],
        currentAverageScore: 100,
        letterGrade: 'A+',
        attendancePercent: 100,
        lastActive: new Date().toISOString(),
        atRisk: false,
      };
      if (resolvedModuleId && !existing.completedItems.includes(resolvedModuleId)) {
        existing.completedItems.push(resolvedModuleId);
      }
      existing.currentAverageScore = 100;
      existing.letterGrade = 'A+';
      progressMap[key] = existing;
      setStored(STORAGE_KEYS.PROGRESS, progressMap);
    }

    return sub;
  },

  exportGradebookCsv(courseId?: string): void {
    const submissions = this.getSubmissions().filter((s) => !courseId || s.courseId === courseId || s.courseCode === courseId);
    let csv = 'Student ID,Student Name,Student Email,Course Code,Assignment,Score,Letter Grade,Status,Graded At\n';
    submissions.forEach((s) => {
      csv += `"${s.studentId}","${s.studentName}","${s.studentEmail}","${s.courseCode}","${s.assignmentTitle}",${s.score ?? 'N/A'},"${s.letterGrade || 'N/A'}","${s.status}","${s.gradedAt || 'N/A'}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `AT_Academics_Gradebook_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },

  downloadBatchSubmissionsReport(assignmentId: string): void {
    const subs = this.getSubmissions().filter((s) => s.assignmentId === assignmentId);
    const assign = this.getAssignments().find((a) => a.id === assignmentId);
    let report = `AT ACADEMICS LMS - BATCH SUBMISSION REPORT\nAssignment: ${assign?.title || assignmentId}\nCourse: ${assign?.courseCode || 'General'}\nGenerated: ${new Date().toISOString()}\nTotal Submissions: ${subs.length}\n\n`;
    subs.forEach((s, idx) => {
      report += `--------------------------------------------------\n`;
      report += `[#${idx + 1}] Student: ${s.studentName} (${s.studentId})\n`;
      report += `Submitted: ${s.submittedAt} | File: ${s.fileName} (${s.fileSize})\n`;
      report += `Status: ${s.status} | Score: ${s.score ?? 'Ungraded'}\n`;
      report += `Content Preview:\n${s.fileContentPreview}\n\n`;
    });
    const blob = new Blob([report], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Batch_Submissions_${assign?.courseCode || 'Assignment'}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },

  downloadSubmissionFile(submission: AssignmentSubmission): void {
    const content = submission.fileContentPreview || `// Archive for ${submission.fileName}\n// Submitted by ${submission.studentName}`;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = submission.fileName.endsWith('.txt') ? submission.fileName : `${submission.fileName}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },

  gradeSubmission(
    submissionId: string,
    gradeData: {
      score: number;
      letterGrade?: string;
      feedback: string;
      gradedBy: string;
      rubricScores?: Record<string, number>;
    }
  ): AssignmentSubmission | null {
    const submissions = this.getSubmissions();
    const sub = submissions.find((s) => s.id === submissionId);
    if (!sub) return null;

    const calcGrade =
      gradeData.letterGrade ||
      (gradeData.score >= 70 ? 'First Class (A)' : gradeData.score >= 60 ? 'Upper Second (2:1)' : gradeData.score >= 50 ? 'Lower Second (2:2)' : 'Pass (C)');

    sub.score = gradeData.score;
    sub.letterGrade = calcGrade;
    sub.feedback = gradeData.feedback;
    sub.gradedBy = gradeData.gradedBy;
    sub.gradedAt = new Date().toISOString();
    sub.rubricScores = gradeData.rubricScores;
    sub.status = 'graded';

    setStored(STORAGE_KEYS.SUBMISSIONS, submissions);

    this.addNotification({
      type: 'grade',
      title: `Grade Published: ${sub.assignmentTitle}`,
      message: `Your work received ${sub.score} marks (${sub.letterGrade}). Feedback recorded.`,
      courseCode: sub.courseCode,
      targetLink: 'assignments',
      read: false,
    });

    this.pushToServer();
    return sub;
  },

  // Student Progress
  getProgressMap(): Record<string, StudentCourseProgress> {
    return getStored<Record<string, StudentCourseProgress>>(STORAGE_KEYS.PROGRESS, INITIAL_PROGRESS);
  },

  getStudentCourseProgress(studentId: string, courseId: string): StudentCourseProgress | null {
    const key = `${studentId}_${courseId}`;
    const map = this.getProgressMap();
    return map[key] || null;
  },

  markItemComplete(studentId: string, courseId: string, itemId: string): void {
    const key = `${studentId}_${courseId}`;
    const map = this.getProgressMap();
    if (!map[key]) {
      const crs = this.getCourseById(courseId);
      map[key] = {
        studentId,
        courseId,
        watchedLecturesCount: 0,
        totalLecturesCount: (crs?.modules || []).reduce(
          (acc, m) => acc + (m.items || []).filter((i) => i.type === 'video').length,
          0
        ) || 1,
        completedItems: [],
        assignmentScores: [],
        currentAverageScore: 100,
        letterGrade: 'A',
        attendancePercent: 100,
        lastActive: new Date().toISOString(),
        atRisk: false,
      };
    }

    if (!map[key].completedItems.includes(itemId)) {
      map[key].completedItems.push(itemId);
      map[key].watchedLecturesCount += 1;
      map[key].lastActive = new Date().toISOString();
      setStored(STORAGE_KEYS.PROGRESS, map);
      this.pushToServer();
    }
  },

  // Module-based completion and course progress tracking
  getCompletedModules(studentId: string, courseId: string): string[] {
    const key = `${studentId}_${courseId}`;
    const map = this.getProgressMap();
    const prog = map[key];
    const completedSet = new Set<string>(prog?.completedModules || []);

    // Also include modules where all items are completed or where student has a submission
    const course = this.getCourseById(courseId) || this.getCourses().find((c) => c.code === courseId);
    if (!course) return Array.from(completedSet);

    // Check if user is graduated
    const user = this.getAllUsers().find((u) => u.studentId === studentId || u.loginId === studentId || u.id === studentId);
    if (user?.isGraduated) {
      return (course.modules || []).map((m) => m.id);
    }

    const subs = this.getSubmissions().filter(
      (s) => (s.studentId === studentId || (user && (s.studentId === user.studentId || s.studentId === user.loginId))) &&
             (s.courseId === course.id || s.courseCode === course.code)
    );

    (course.modules || []).forEach((m) => {
      // Completed via explicit flag
      if (completedSet.has(m.id)) return;

      // Completed via assignment submission
      const hasSub = subs.some((s) => s.moduleId === m.id);
      if (hasSub) {
        completedSet.add(m.id);
        return;
      }

      // Completed via all items finished
      if (m.items && m.items.length > 0 && prog?.completedItems) {
        const allItemsDone = m.items.every((it) => prog.completedItems.includes(it.id));
        if (allItemsDone) {
          completedSet.add(m.id);
        }
      }
    });

    return Array.from(completedSet);
  },

  isModuleCompleted(studentId: string, courseId: string, moduleId: string): boolean {
    const completed = this.getCompletedModules(studentId, courseId);
    return completed.includes(moduleId);
  },

  markModuleComplete(studentId: string, courseId: string, moduleId: string, isCompleted: boolean = true): void {
    const course = this.getCourseById(courseId) || this.getCourses().find((c) => c.code === courseId);
    const resolvedCourseId = course ? course.id : courseId;
    const key = `${studentId}_${resolvedCourseId}`;
    const map = this.getProgressMap();

    if (!map[key]) {
      map[key] = {
        studentId,
        courseId: resolvedCourseId,
        watchedLecturesCount: 0,
        totalLecturesCount: (course?.modules || []).reduce(
          (acc, m) => acc + (m.items || []).filter((i) => i.type === 'video').length,
          0
        ) || 1,
        completedItems: [],
        completedModules: [],
        assignmentScores: [],
        currentAverageScore: 100,
        letterGrade: 'A',
        attendancePercent: 100,
        lastActive: new Date().toISOString(),
        atRisk: false,
      };
    }

    if (!map[key].completedModules) {
      map[key].completedModules = [];
    }

    const targetModule = course?.modules?.find((m) => m.id === moduleId);

    if (isCompleted) {
      if (!map[key].completedModules.includes(moduleId)) {
        map[key].completedModules.push(moduleId);
      }
      // Also mark all items inside this module as completed
      if (targetModule && targetModule.items) {
        targetModule.items.forEach((item) => {
          if (!map[key].completedItems.includes(item.id)) {
            map[key].completedItems.push(item.id);
          }
        });
      }
    } else {
      map[key].completedModules = map[key].completedModules.filter((id) => id !== moduleId);
      // Remove module items
      if (targetModule && targetModule.items) {
        const itemIds = new Set(targetModule.items.map((i) => i.id));
        map[key].completedItems = map[key].completedItems.filter((id) => !itemIds.has(id));
      }
    }

    map[key].lastActive = new Date().toISOString();
    setStored(STORAGE_KEYS.PROGRESS, map);
    this.pushToServer();

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('at_academics_local_change'));
    }
  },

  getCourseModuleProgress(studentId: string, courseId: string): {
    totalModules: number;
    completedCount: number;
    progressPercent: number;
    completedModuleIds: string[];
  } {
    const course = this.getCourseById(courseId) || this.getCourses().find((c) => c.code === courseId);
    if (!course) {
      return { totalModules: 0, completedCount: 0, progressPercent: 0, completedModuleIds: [] };
    }

    const modules = course.modules || [];
    const totalModules = modules.length;
    if (totalModules === 0) {
      return { totalModules: 0, completedCount: 0, progressPercent: 0, completedModuleIds: [] };
    }

    const completedModuleIds = this.getCompletedModules(studentId, course.id);
    // Count how many modules in THIS course are completed
    const matchingCompleted = modules.filter((m) => completedModuleIds.includes(m.id));
    const completedCount = matchingCompleted.length;
    const progressPercent = Math.round((completedCount / totalModules) * 100);

    return {
      totalModules,
      completedCount,
      progressPercent,
      completedModuleIds: matchingCompleted.map((m) => m.id),
    };
  },

  // Student Credentials
  getStudentCredentials(): StudentCredential[] {
    return getStored<StudentCredential[]>(STORAGE_KEYS.CREDENTIALS, INITIAL_STUDENT_CREDENTIALS);
  },

  // Notifications
  getNotifications(): NotificationItem[] {
    return getStored<NotificationItem[]>(STORAGE_KEYS.NOTIFICATIONS, INITIAL_NOTIFICATIONS);
  },

  addNotification(notif: Omit<NotificationItem, 'id' | 'timestamp'>): void {
    const list = this.getNotifications();
    const item: NotificationItem = {
      ...notif,
      id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
    };
    list.unshift(item);
    setStored(STORAGE_KEYS.NOTIFICATIONS, list);
    this.pushToServer();
  },

  markNotificationRead(notifId: string): void {
    const list = this.getNotifications();
    const item = list.find((n) => n.id === notifId);
    if (item) {
      item.read = true;
      setStored(STORAGE_KEYS.NOTIFICATIONS, list);
      this.pushToServer();
    }
  },

  markAllNotificationsRead(): void {
    const list = this.getNotifications();
    list.forEach((n) => (n.read = true));
    setStored(STORAGE_KEYS.NOTIFICATIONS, list);
    this.pushToServer();
  },

  // Announcements
  getAnnouncements(): Announcement[] {
    return getStored<Announcement[]>(STORAGE_KEYS.ANNOUNCEMENTS, INITIAL_ANNOUNCEMENTS);
  },

  addAnnouncement(annData: Omit<Announcement, 'id' | 'postedAt'>): Announcement {
    const list = this.getAnnouncements();
    const ann: Announcement = {
      ...annData,
      id: `ann-${Date.now()}`,
      postedAt: new Date().toISOString(),
    };
    list.unshift(ann);
    setStored(STORAGE_KEYS.ANNOUNCEMENTS, list);

    this.addNotification({
      type: 'announcement',
      title: `Notice: ${ann.title}`,
      message: ann.content.substring(0, 100) + '...',
      courseCode: ann.courseCode,
      targetLink: 'announcements',
      read: false,
      urgent: ann.priority === 'urgent',
    });

    this.pushToServer();
    return ann;
  },

  // Messaging
  getChatThreads(userId?: string): ChatThread[] {
    const list = getStored<ChatThread[]>(STORAGE_KEYS.CHAT_THREADS, INITIAL_CHAT_THREADS);
    if (!userId) return list;
    return list.filter((t) => t.participants.some((p) => p.id === userId));
  },

  getChatMessages(threadId: string): ChatMessage[] {
    const all = getStored<ChatMessage[]>(STORAGE_KEYS.CHAT_MESSAGES, INITIAL_CHAT_MESSAGES);
    return all.filter((m) => m.threadId === threadId);
  },

  sendMessage(messageData: Omit<ChatMessage, 'id' | 'timestamp'>): ChatMessage {
    const allMessages = getStored<ChatMessage[]>(STORAGE_KEYS.CHAT_MESSAGES, INITIAL_CHAT_MESSAGES);
    const newMsg: ChatMessage = {
      ...messageData,
      id: `msg-${Date.now()}`,
      timestamp: new Date().toISOString(),
      editCount: 0,
    };
    allMessages.push(newMsg);
    setStored(STORAGE_KEYS.CHAT_MESSAGES, allMessages);

    const threads = this.getChatThreads();
    const thread = threads.find((t) => t.id === messageData.threadId);
    if (thread) {
      thread.lastMessage = messageData.content;
      thread.lastMessageTimestamp = newMsg.timestamp;
      setStored(STORAGE_KEYS.CHAT_THREADS, threads);
    }

    this.pushToServer();
    return newMsg;
  },

  editChatMessage(
    messageId: string,
    userId: string,
    newContent: string
  ): { success: boolean; message?: ChatMessage; error?: string } {
    const allMessages = getStored<ChatMessage[]>(STORAGE_KEYS.CHAT_MESSAGES, INITIAL_CHAT_MESSAGES);
    const msg = allMessages.find((m) => m.id === messageId);
    if (!msg) {
      return { success: false, error: 'Message not found.' };
    }

    if (msg.senderId !== userId) {
      return { success: false, error: 'You can only edit your own messages.' };
    }

    const editCount = msg.editCount || 0;
    if (editCount >= 1) {
      return { success: false, error: 'Messages can only be edited 1 time.' };
    }

    const sentTime = new Date(msg.timestamp).getTime();
    const now = Date.now();
    const diffMinutes = (now - sentTime) / (1000 * 60);

    if (diffMinutes > 15) {
      return {
        success: false,
        error: 'Edit window expired. Messages can only be edited within 15 minutes of sending.',
      };
    }

    msg.content = newContent.trim();
    msg.editCount = editCount + 1;
    msg.editedAt = new Date().toISOString();

    setStored(STORAGE_KEYS.CHAT_MESSAGES, allMessages);

    // Update lastMessage on thread if this was the last message
    const threads = this.getChatThreads();
    const thread = threads.find((t) => t.id === msg.threadId);
    if (thread && thread.lastMessageTimestamp === msg.timestamp) {
      thread.lastMessage = msg.content;
      setStored(STORAGE_KEYS.CHAT_THREADS, threads);
    }

    this.pushToServer();
    return { success: true, message: msg };
  },

  createChatThread(threadData: Omit<ChatThread, 'id' | 'lastMessageTimestamp' | 'unreadCount'>): ChatThread {
    const threads = this.getChatThreads();
    const newThread: ChatThread = {
      ...threadData,
      id: `thread-${Date.now()}`,
      lastMessageTimestamp: new Date().toISOString(),
      unreadCount: 0,
    };
    threads.unshift(newThread);
    setStored(STORAGE_KEYS.CHAT_THREADS, threads);
    this.pushToServer();
    return newThread;
  },

  createThread(threadData: {
    courseCode?: string;
    courseTitle?: string;
    participants: { id: string; name: string; role: any; email: string }[];
    firstMessage?: string;
    senderId?: string;
    senderName?: string;
    senderRole?: any;
    lastMessage?: string;
  }): ChatThread {
    const threads = this.getChatThreads();
    const newThread: ChatThread = {
      id: `thread-${Date.now()}`,
      courseCode: threadData.courseCode,
      courseTitle: threadData.courseTitle,
      participants: threadData.participants,
      lastMessage: threadData.firstMessage || threadData.lastMessage || 'Conversation initiated.',
      lastMessageTimestamp: new Date().toISOString(),
      unreadCount: 0,
    };
    threads.unshift(newThread);
    setStored(STORAGE_KEYS.CHAT_THREADS, threads);

    if (threadData.firstMessage && threadData.senderId && threadData.senderName) {
      this.sendMessage({
        threadId: newThread.id,
        senderId: threadData.senderId,
        senderName: threadData.senderName,
        senderRole: threadData.senderRole || 'student',
        content: threadData.firstMessage,
      });
    }

    this.pushToServer();
    return newThread;
  },

  // Video Notes
  getVideoNotes(lectureId: string, userId: string): VideoNote[] {
    const all = getStored<VideoNote[]>(STORAGE_KEYS.VIDEO_NOTES, INITIAL_VIDEO_NOTES);
    return all.filter((n) => n.lectureId === lectureId && n.userId === userId);
  },

  addVideoNote(
    lectureIdOrData: string | Omit<VideoNote, 'id' | 'createdAt'>,
    userId?: string,
    timestampSeconds?: number,
    text?: string
  ): VideoNote {
    const all = getStored<VideoNote[]>(STORAGE_KEYS.VIDEO_NOTES, INITIAL_VIDEO_NOTES);
    let noteData: Omit<VideoNote, 'id' | 'createdAt'>;

    if (typeof lectureIdOrData === 'string') {
      noteData = {
        lectureId: lectureIdOrData,
        userId: userId || '',
        timestampSeconds: timestampSeconds || 0,
        text: text || '',
      };
    } else {
      noteData = lectureIdOrData;
    }

    const newNote: VideoNote = {
      ...noteData,
      id: `note-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    all.push(newNote);
    setStored(STORAGE_KEYS.VIDEO_NOTES, all);
    this.pushToServer();
    return newNote;
  },

  deleteVideoNote(noteId: string): void {
    const all = getStored<VideoNote[]>(STORAGE_KEYS.VIDEO_NOTES, INITIAL_VIDEO_NOTES);
    const filtered = all.filter((n) => n.id !== noteId);
    setStored(STORAGE_KEYS.VIDEO_NOTES, filtered);
    this.pushToServer();
  },
};
