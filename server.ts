import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Initialize Google GenAI SDK (Server-Side)
const apiKey = process.env.GEMINI_API_KEY || '';
const ai = new GoogleGenAI({
  apiKey: apiKey,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Database file persistence path
const DB_FILE = path.resolve(__dirname, 'data', 'db.json');

// Default initial database state matching AT Academics LMS requirements
const DEFAULT_INITIAL_DB = {
  users: [
    {
      id: 'user-admin-atikur',
      name: 'Atikur Rahman',
      email: 'atacademicsltd@gmail.com',
      loginId: 'atikur.rahman',
      password: 'ATAcademicslms@2026',
      role: 'admin',
      department: 'University Administration',
      cohort: 'Executive Faculty',
      coursesEnrolled: [],
      status: 'active',
    },
  ],
  departments: [
    {
      id: 'dept-business',
      name: 'Department of Business & Management',
      code: 'BUS',
      description: 'Corporate leadership, operational strategy, international finance, and service industry management.',
      headOfDepartment: 'Dr. Harrison Wells, FRSA',
    },
    {
      id: 'dept-health',
      name: 'Department of Health & Care Management',
      code: 'HCM',
      description: 'Healthcare governance, NHS clinical leadership, social care management, and health informatics.',
      headOfDepartment: 'Prof. Eleanor Vance, MBChB',
    },
    {
      id: 'dept-law',
      name: 'Department of Law & Legal Studies',
      code: 'LAW',
      description: 'UK common law, corporate jurisprudence, international human rights, and contract tort governance.',
      headOfDepartment: 'Lord Justice Marcus Thorne, KC',
    },
    {
      id: 'dept-computing',
      name: 'Department of Computing & Information Technology',
      code: 'CIT',
      description: 'Cyber threat intelligence, network cryptography, distributed systems, and defensive security architectures.',
      headOfDepartment: 'Dr. Alistair Finch, CEng MBCS',
    },
  ],
  // Active courses erased - kept blank so teachers and admins can add fresh programs
  courses: [],
  assignments: [],
  submissions: [],
  deletionRequests: [],
  notifications: [],
  announcements: [],
  chatThreads: [],
  chatMessages: [],
  videoNotes: [],
  quizAttempts: [],
  progress: {},
  deletedItemIds: [] as string[],
  lastUpdated: new Date().toISOString(),
};

// Database Read / Write helpers
function loadDatabase() {
  try {
    if (!fs.existsSync(DB_FILE)) {
      const dataDir = path.dirname(DB_FILE);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      fs.writeFileSync(DB_FILE, JSON.stringify(DEFAULT_INITIAL_DB, null, 2), 'utf-8');
      return JSON.parse(JSON.stringify(DEFAULT_INITIAL_DB));
    }
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed.deletedItemIds)) parsed.deletedItemIds = [];
    if (!Array.isArray(parsed.courses)) parsed.courses = [];
    return parsed;
  } catch (err) {
    console.error('Error reading database file, using fallback:', err);
    return JSON.parse(JSON.stringify(DEFAULT_INITIAL_DB));
  }
}

function saveDatabase(db: any) {
  try {
    db.lastUpdated = new Date().toISOString();
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('Error writing database file:', err);
    return false;
  }
}

// In-memory cache synced with disk
let cachedDb = loadDatabase();

// Ensure initial database state is an array
if (!Array.isArray(cachedDb.courses)) {
  cachedDb.courses = [];
  saveDatabase(cachedDb);
}
if (!Array.isArray(cachedDb.deletedItemIds)) {
  cachedDb.deletedItemIds = [];
  saveDatabase(cachedDb);
}

// -------------------------------------------------------------
// Real-Time Server API Routes
// -------------------------------------------------------------

// Full Database State (Sync Endpoint)
app.get('/api/sync', (_req, res) => {
  return res.json({
    success: true,
    data: cachedDb,
    deletedItemIds: cachedDb.deletedItemIds || [],
    lastUpdated: cachedDb.lastUpdated || new Date().toISOString(),
  });
});

app.post('/api/sync', (req, res) => {
  const { data, adminDeletedIds = [] } = req.body;
  if (!data) {
    return res.status(400).json({ success: false, message: 'Missing data in payload' });
  }

  if (!Array.isArray(cachedDb.deletedItemIds)) {
    cachedDb.deletedItemIds = [];
  }

  // If admin deleted specific IDs, register them permanently
  if (Array.isArray(adminDeletedIds) && adminDeletedIds.length > 0) {
    for (const id of adminDeletedIds) {
      if (id && !cachedDb.deletedItemIds.includes(id)) {
        cachedDb.deletedItemIds.push(id);
      }
    }
  }

  const deletedSet = new Set(cachedDb.deletedItemIds);

  // 1. Users merge (never drop existing users unless deleted by admin)
  if (Array.isArray(data.users)) {
    const existingUsers = Array.isArray(cachedDb.users) ? cachedDb.users : [];
    const userMap = new Map<string, any>();
    existingUsers.forEach((u: any) => {
      if (u && u.id && !deletedSet.has(u.id)) userMap.set(u.id, u);
    });
    data.users.forEach((u: any) => {
      if (u && u.id && !deletedSet.has(u.id)) {
        const prev = userMap.get(u.id) || {};
        userMap.set(u.id, { ...prev, ...u });
      }
    });
    cachedDb.users = Array.from(userMap.values());
  }

  // 2. Departments merge
  if (Array.isArray(data.departments)) {
    const existingDepts = Array.isArray(cachedDb.departments) ? cachedDb.departments : [];
    const deptMap = new Map<string, any>();
    existingDepts.forEach((d: any) => {
      if (d && d.id && !deletedSet.has(d.id)) deptMap.set(d.id, d);
    });
    data.departments.forEach((d: any) => {
      if (d && d.id && !deletedSet.has(d.id)) {
        const prev = deptMap.get(d.id) || {};
        deptMap.set(d.id, { ...prev, ...d });
      }
    });
    cachedDb.departments = Array.from(deptMap.values());
  }

  // 3. Courses & Modules & Materials merge (CRITICAL: NEVER DROP USER-ADDED COURSES OR MODULES)
  if (Array.isArray(data.courses)) {
    const existingCourses = Array.isArray(cachedDb.courses) ? cachedDb.courses : [];
    const courseMap = new Map<string, any>();

    // Index existing courses that haven't been deleted by admin
    existingCourses.forEach((c: any) => {
      if (c && c.id && !deletedSet.has(c.id)) {
        courseMap.set(c.id, c);
      }
    });

    // Merge incoming courses
    data.courses.forEach((incoming: any) => {
      if (!incoming || !incoming.id || deletedSet.has(incoming.id)) return;

      const existing = courseMap.get(incoming.id);
      if (!existing) {
        courseMap.set(incoming.id, incoming);
      } else {
        // Deep merge modules
        const existingMods = Array.isArray(existing.modules) ? existing.modules : [];
        const incomingMods = Array.isArray(incoming.modules) ? incoming.modules : [];
        const modMap = new Map<string, any>();

        existingMods.forEach((m: any) => {
          if (m && m.id && !deletedSet.has(m.id)) modMap.set(m.id, m);
        });

        incomingMods.forEach((m: any) => {
          if (!m || !m.id || deletedSet.has(m.id)) return;
          const prevM = modMap.get(m.id);
          if (!prevM) {
            modMap.set(m.id, m);
          } else {
            // Merge module items
            const prevItems = Array.isArray(prevM.items) ? prevM.items : [];
            const inItems = Array.isArray(m.items) ? m.items : [];
            const itemMap = new Map<string, any>();
            prevItems.forEach((it: any) => {
              if (it && it.id && !deletedSet.has(it.id)) itemMap.set(it.id, it);
            });
            inItems.forEach((it: any) => {
              if (it && it.id && !deletedSet.has(it.id)) {
                itemMap.set(it.id, { ...(itemMap.get(it.id) || {}), ...it });
              }
            });

            // Merge module studyMaterials
            const prevSM = Array.isArray(prevM.studyMaterials) ? prevM.studyMaterials : [];
            const inSM = Array.isArray(m.studyMaterials) ? m.studyMaterials : [];
            const smMap = new Map<string, any>();
            prevSM.forEach((sm: any) => {
              if (sm && sm.id && !deletedSet.has(sm.id)) smMap.set(sm.id, sm);
            });
            inSM.forEach((sm: any) => {
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

        // Merge course-level studyMaterials
        const existingSM = Array.isArray(existing.studyMaterials) ? existing.studyMaterials : [];
        const inSM = Array.isArray(incoming.studyMaterials) ? incoming.studyMaterials : [];
        const smMap = new Map<string, any>();
        existingSM.forEach((sm: any) => {
          if (sm && sm.id && !deletedSet.has(sm.id)) smMap.set(sm.id, sm);
        });
        inSM.forEach((sm: any) => {
          if (sm && sm.id && !deletedSet.has(sm.id)) {
            smMap.set(sm.id, { ...(smMap.get(sm.id) || {}), ...sm });
          }
        });

        // Merge assignment guides
        const existingAG = Array.isArray(existing.assignmentGuides) ? existing.assignmentGuides : [];
        const inAG = Array.isArray(incoming.assignmentGuides) ? incoming.assignmentGuides : [];
        const agMap = new Map<string, any>();
        existingAG.forEach((ag: any) => {
          if (ag && ag.id && !deletedSet.has(ag.id)) agMap.set(ag.id, ag);
        });
        inAG.forEach((ag: any) => {
          if (ag && ag.id && !deletedSet.has(ag.id)) {
            agMap.set(ag.id, { ...(agMap.get(ag.id) || {}), ...ag });
          }
        });

        // Merge quizzes
        const existingQz = Array.isArray(existing.quizzes) ? existing.quizzes : [];
        const inQz = Array.isArray(incoming.quizzes) ? incoming.quizzes : [];
        const qzMap = new Map<string, any>();
        existingQz.forEach((q: any) => {
          if (q && q.id && !deletedSet.has(q.id)) qzMap.set(q.id, q);
        });
        inQz.forEach((q: any) => {
          if (q && q.id && !deletedSet.has(q.id)) {
            qzMap.set(q.id, { ...(qzMap.get(q.id) || {}), ...q });
          }
        });

        courseMap.set(incoming.id, {
          ...existing,
          ...incoming,
          modules: Array.from(modMap.values()),
          studyMaterials: Array.from(smMap.values()),
          assignmentGuides: Array.from(agMap.values()),
          quizzes: Array.from(qzMap.values()),
        });
      }
    });

    cachedDb.courses = Array.from(courseMap.values());
  }

  // 4. Assignments merge
  if (Array.isArray(data.assignments)) {
    const existingAssigns = Array.isArray(cachedDb.assignments) ? cachedDb.assignments : [];
    const assignMap = new Map<string, any>();
    existingAssigns.forEach((a: any) => {
      if (a && a.id && !deletedSet.has(a.id)) assignMap.set(a.id, a);
    });
    data.assignments.forEach((a: any) => {
      if (a && a.id && !deletedSet.has(a.id)) {
        assignMap.set(a.id, { ...(assignMap.get(a.id) || {}), ...a });
      }
    });
    cachedDb.assignments = Array.from(assignMap.values());
  }

  // 5. Submissions merge (student submissions must never be lost)
  if (Array.isArray(data.submissions)) {
    const existingSubs = Array.isArray(cachedDb.submissions) ? cachedDb.submissions : [];
    const subMap = new Map<string, any>();
    existingSubs.forEach((s: any) => {
      if (s && s.id && !deletedSet.has(s.id)) subMap.set(s.id, s);
    });
    data.submissions.forEach((s: any) => {
      if (s && s.id && !deletedSet.has(s.id)) {
        subMap.set(s.id, { ...(subMap.get(s.id) || {}), ...s });
      }
    });
    cachedDb.submissions = Array.from(subMap.values());
  }

  // 6. Announcements merge
  if (Array.isArray(data.announcements)) {
    const existingAnn = Array.isArray(cachedDb.announcements) ? cachedDb.announcements : [];
    const annMap = new Map<string, any>();
    existingAnn.forEach((a: any) => {
      if (a && a.id && !deletedSet.has(a.id)) annMap.set(a.id, a);
    });
    data.announcements.forEach((a: any) => {
      if (a && a.id && !deletedSet.has(a.id)) {
        annMap.set(a.id, { ...(annMap.get(a.id) || {}), ...a });
      }
    });
    cachedDb.announcements = Array.from(annMap.values());
  }

  // 7. Video Notes merge
  if (Array.isArray(data.videoNotes)) {
    const existingVN = Array.isArray(cachedDb.videoNotes) ? cachedDb.videoNotes : [];
    const vnMap = new Map<string, any>();
    existingVN.forEach((v: any) => {
      if (v && v.id && !deletedSet.has(v.id)) vnMap.set(v.id, v);
    });
    data.videoNotes.forEach((v: any) => {
      if (v && v.id && !deletedSet.has(v.id)) {
        vnMap.set(v.id, { ...(vnMap.get(v.id) || {}), ...v });
      }
    });
    cachedDb.videoNotes = Array.from(vnMap.values());
  }

  // 8. Progress merge (union completed items and modules)
  if (data.progress && typeof data.progress === 'object') {
    const existingProg = cachedDb.progress || {};
    const mergedProg: Record<string, any> = { ...existingProg };
    for (const [k, p] of Object.entries(data.progress)) {
      if (!mergedProg[k]) {
        mergedProg[k] = p;
      } else {
        const prevP: any = mergedProg[k];
        const newP: any = p;
        const compItems = Array.from(new Set([...(prevP.completedItems || []), ...(newP.completedItems || [])]));
        const compMods = Array.from(new Set([...(prevP.completedModules || []), ...(newP.completedModules || [])]));
        mergedProg[k] = {
          ...prevP,
          ...newP,
          completedItems: compItems,
          completedModules: compMods,
          watchedLecturesCount: Math.max(prevP.watchedLecturesCount || 0, newP.watchedLecturesCount || 0, compItems.length),
        };
      }
    }
    cachedDb.progress = mergedProg;
  }

  // 9. Deletion requests, notifications, chat
  if (Array.isArray(data.deletionRequests)) {
    const exReqs = Array.isArray(cachedDb.deletionRequests) ? cachedDb.deletionRequests : [];
    const reqMap = new Map<string, any>();
    exReqs.forEach((r: any) => { if (r && r.id) reqMap.set(r.id, r); });
    data.deletionRequests.forEach((r: any) => { if (r && r.id) reqMap.set(r.id, { ...(reqMap.get(r.id) || {}), ...r }); });
    cachedDb.deletionRequests = Array.from(reqMap.values());
  }
  if (Array.isArray(data.notifications)) {
    const exNotifs = Array.isArray(cachedDb.notifications) ? cachedDb.notifications : [];
    const notifMap = new Map<string, any>();
    exNotifs.forEach((n: any) => { if (n && n.id) notifMap.set(n.id, n); });
    data.notifications.forEach((n: any) => { if (n && n.id) notifMap.set(n.id, { ...(notifMap.get(n.id) || {}), ...n }); });
    cachedDb.notifications = Array.from(notifMap.values());
  }
  if (Array.isArray(data.chatThreads)) {
    const exCT = Array.isArray(cachedDb.chatThreads) ? cachedDb.chatThreads : [];
    const ctMap = new Map<string, any>();
    exCT.forEach((t: any) => { if (t && t.id) ctMap.set(t.id, t); });
    data.chatThreads.forEach((t: any) => { if (t && t.id) ctMap.set(t.id, { ...(ctMap.get(t.id) || {}), ...t }); });
    cachedDb.chatThreads = Array.from(ctMap.values());
  }
  if (Array.isArray(data.chatMessages)) {
    const exCM = Array.isArray(cachedDb.chatMessages) ? cachedDb.chatMessages : [];
    const cmMap = new Map<string, any>();
    exCM.forEach((m: any) => { if (m && m.id) cmMap.set(m.id, m); });
    data.chatMessages.forEach((m: any) => { if (m && m.id) cmMap.set(m.id, { ...(cmMap.get(m.id) || {}), ...m }); });
    cachedDb.chatMessages = Array.from(cmMap.values());
  }
  if (Array.isArray(data.quizAttempts)) {
    const exQA = Array.isArray(cachedDb.quizAttempts) ? cachedDb.quizAttempts : [];
    const qaMap = new Map<string, any>();
    exQA.forEach((q: any) => { if (q && (q.id || q.attemptId)) qaMap.set(q.id || q.attemptId, q); });
    data.quizAttempts.forEach((q: any) => { if (q && (q.id || q.attemptId)) qaMap.set(q.id || q.attemptId, { ...(qaMap.get(q.id || q.attemptId) || {}), ...q }); });
    cachedDb.quizAttempts = Array.from(qaMap.values());
  }

  saveDatabase(cachedDb);

  return res.json({
    success: true,
    data: cachedDb,
    deletedItemIds: cachedDb.deletedItemIds,
    lastUpdated: cachedDb.lastUpdated,
  });
});

// Authentication endpoint - Server authoritative login
app.post('/api/auth/login', (req, res) => {
  const { identifier = '', password = '', roleMode = 'staff' } = req.body;
  const cleanInput = identifier.trim().toLowerCase();
  const cleanPass = password.trim();

  const users: any[] = cachedDb.users || [];

  // Match against loginId, studentId, or email
  const user = users.find((u) => {
    const matchId =
      (u.loginId && u.loginId.trim().toLowerCase() === cleanInput) ||
      (u.studentId && u.studentId.trim().toLowerCase() === cleanInput) ||
      (u.email && u.email.trim().toLowerCase() === cleanInput);
    return matchId;
  });

  if (!user) {
    return res.status(401).json({
      success: false,
      message: `No account found with identifier "${identifier}". Please check spelling or contact administration.`,
    });
  }

  if (user.status === 'suspended') {
    return res.status(403).json({
      success: false,
      message: 'Account suspended. Please contact the administrator at atacademicsltd@gmail.com.',
    });
  }

  // Compare passwords
  const storedPass = (user.password || '').trim();
  if (storedPass !== cleanPass) {
    return res.status(401).json({
      success: false,
      message: 'Incorrect password provided. Please check credentials or request a reset OTP.',
    });
  }

  // Role mode enforcement: Student cannot sign in as Staff and vice versa
  if (roleMode === 'staff' && user.role === 'student') {
    return res.status(403).json({
      success: false,
      message: 'Access denied: Student credentials cannot be used to sign in to Staff portal. Please switch to the Student login option.',
    });
  }

  if (roleMode === 'student' && (user.role === 'admin' || user.role === 'teacher')) {
    return res.status(403).json({
      success: false,
      message: 'Access denied: Staff credentials cannot be used to sign in to Student portal. Please switch to the Staff (Admin & Instructors) login option.',
    });
  }

  return res.json({
    success: true,
    user,
  });
});

// User Management Endpoints
app.get('/api/users', (_req, res) => {
  return res.json({ success: true, users: cachedDb.users || [] });
});

app.post('/api/users', (req, res) => {
  const userData = req.body;
  if (!userData.name || !userData.loginId) {
    return res.status(400).json({ success: false, message: 'Name and Login ID are required.' });
  }

  const cleanLoginId = userData.loginId.trim();
  const cleanEmail = (userData.email || '').trim().toLowerCase();

  const users = cachedDb.users || [];
  if (users.some((u: any) => u.loginId?.toLowerCase() === cleanLoginId.toLowerCase() || (cleanEmail && u.email?.toLowerCase() === cleanEmail))) {
    return res.status(400).json({ success: false, message: 'A user with this Login ID or Email already exists.' });
  }

  const totalFee = Number(userData.totalTuitionFee) || 0;
  const paid = Number(userData.tuitionPaid) || 0;
  const due = Math.max(0, totalFee - paid);

  const newUser = {
    id: `user-${Date.now()}`,
    name: userData.name.trim(),
    email: cleanEmail || `${cleanLoginId.toLowerCase()}@atacademics.co.uk`,
    loginId: cleanLoginId,
    studentId: userData.role === 'student' ? cleanLoginId : undefined,
    password: userData.password?.trim() || 'ATAcademics@2026',
    role: userData.role || 'student',
    department: userData.department || 'General Academics',
    cohort: userData.cohort || '2026 Cohort',
    coursesEnrolled: userData.coursesEnrolled || [],
    status: 'active',
    graduationStatus: userData.graduationStatus || (userData.isGraduated === false ? 'not_graduated' : undefined),
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
    totalTuitionFee: userData.role === 'student' ? totalFee : undefined,
    tuitionPaid: userData.role === 'student' ? paid : undefined,
    tuitionDue: userData.role === 'student' ? due : undefined,
  };

  users.push(newUser);
  cachedDb.users = users;
  saveDatabase(cachedDb);

  return res.json({ success: true, user: newUser });
});

app.put('/api/users/:id', (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  const users = cachedDb.users || [];
  const index = users.findIndex((u: any) => u.id === id);

  if (index === -1) {
    return res.status(404).json({ success: false, message: 'User not found.' });
  }

  if (updates.totalTuitionFee !== undefined || updates.tuitionPaid !== undefined) {
    const total = Number(updates.totalTuitionFee ?? users[index].totalTuitionFee ?? 0);
    const paid = Number(updates.tuitionPaid ?? users[index].tuitionPaid ?? 0);
    updates.tuitionDue = Math.max(0, total - paid);
  }

  users[index] = { ...users[index], ...updates };
  cachedDb.users = users;
  saveDatabase(cachedDb);

  return res.json({ success: true, user: users[index] });
});

app.delete('/api/users/:id', (req, res) => {
  const { id } = req.params;
  const users = cachedDb.users || [];
  const target = users.find((u: any) => u.id === id);

  if (!target) {
    return res.status(404).json({ success: false, message: 'User not found.' });
  }

  if (target.role === 'admin') {
    return res.status(403).json({ success: false, message: 'Administrator profile cannot be deleted.' });
  }

  cachedDb.users = users.filter((u: any) => u.id !== id);
  if (!Array.isArray(cachedDb.deletedItemIds)) cachedDb.deletedItemIds = [];
  if (!cachedDb.deletedItemIds.includes(id)) cachedDb.deletedItemIds.push(id);
  saveDatabase(cachedDb);

  return res.json({ success: true });
});

// Course / Program Management Endpoints (Full Admin Control)
app.get('/api/courses', (_req, res) => {
  return res.json({ success: true, courses: cachedDb.courses || [] });
});

app.post('/api/courses', (req, res) => {
  const courseData = req.body;
  const courses = cachedDb.courses || [];

  const newCourse = {
    ...courseData,
    id: `course-${(courseData.code || 'CRS').toLowerCase().replace(/[^a-z0-9]/g, '')}-${Date.now()}`,
    enrolledCount: 0,
    modules: courseData.modules || [],
    studyMaterials: courseData.studyMaterials || [],
    assignmentGuides: courseData.assignmentGuides || [],
    quizzes: courseData.quizzes || [],
  };

  courses.unshift(newCourse);
  cachedDb.courses = courses;
  saveDatabase(cachedDb);

  return res.json({ success: true, course: newCourse });
});

app.put('/api/courses/:id', (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  const courses = cachedDb.courses || [];
  const index = courses.findIndex((c: any) => c.id === id);

  if (index === -1) {
    return res.status(404).json({ success: false, message: 'Course not found.' });
  }

  const oldCode = courses[index].code;
  const newCode = updates.code || oldCode;

  courses[index] = { ...courses[index], ...updates };

  // If course code changed, update enrolled courses on students
  if (newCode !== oldCode) {
    const users = cachedDb.users || [];
    users.forEach((u: any) => {
      if (Array.isArray(u.coursesEnrolled)) {
        u.coursesEnrolled = u.coursesEnrolled.map((code: string) => (code === oldCode ? newCode : code));
      }
    });
    cachedDb.users = users;
  }

  cachedDb.courses = courses;
  saveDatabase(cachedDb);

  return res.json({ success: true, course: courses[index] });
});

app.delete('/api/courses/:id', (req, res) => {
  const { id } = req.params;
  const courses = cachedDb.courses || [];
  cachedDb.courses = courses.filter((c: any) => c.id !== id);
  if (!Array.isArray(cachedDb.deletedItemIds)) cachedDb.deletedItemIds = [];
  if (!cachedDb.deletedItemIds.includes(id)) cachedDb.deletedItemIds.push(id);
  saveDatabase(cachedDb);
  return res.json({ success: true });
});

// Add single module to course
app.post('/api/courses/:id/modules', (req, res) => {
  const { id } = req.params;
  const modData = req.body;
  const courses = cachedDb.courses || [];
  const course = courses.find((c: any) => c.id === id);
  if (!course) return res.status(404).json({ success: false, message: 'Course not found' });
  if (!course.modules) course.modules = [];

  const newMod = {
    ...modData,
    id: `mod-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    items: modData.items || [],
    studyMaterials: modData.studyMaterials || [],
    assignmentGuides: modData.assignmentGuides || [],
    quizzes: modData.quizzes || [],
  };
  course.modules.push(newMod);
  cachedDb.courses = courses;
  saveDatabase(cachedDb);
  return res.json({ success: true, module: newMod, course });
});

// Batch create / upload up to 30+ modules for a course
app.post('/api/courses/:id/modules/batch', (req, res) => {
  const { id } = req.params;
  const { modules = [] } = req.body;
  const courses = cachedDb.courses || [];
  const course = courses.find((c: any) => c.id === id);
  if (!course) return res.status(404).json({ success: false, message: 'Course not found' });
  if (!course.modules) course.modules = [];

  const now = Date.now();
  const addedMods = modules.map((m: any, idx: number) => ({
    ...m,
    id: `mod-${now}-${idx}-${Math.random().toString(36).substr(2, 5)}`,
    items: m.items || [],
    studyMaterials: m.studyMaterials || [],
    assignmentGuides: m.assignmentGuides || [],
    quizzes: m.quizzes || [],
  }));

  course.modules.push(...addedMods);
  cachedDb.courses = courses;
  saveDatabase(cachedDb);
  return res.json({ success: true, modules: addedMods, course });
});

// Update single module
app.put('/api/courses/:id/modules/:moduleId', (req, res) => {
  const { id, moduleId } = req.params;
  const updates = req.body;
  const courses = cachedDb.courses || [];
  const course = courses.find((c: any) => c.id === id);
  if (!course || !course.modules) return res.status(404).json({ success: false, message: 'Course or modules not found' });

  const idx = course.modules.findIndex((m: any) => m.id === moduleId);
  if (idx === -1) return res.status(404).json({ success: false, message: 'Module not found' });

  course.modules[idx] = { ...course.modules[idx], ...updates };
  cachedDb.courses = courses;
  saveDatabase(cachedDb);
  return res.json({ success: true, module: course.modules[idx] });
});

// Delete module from course
app.delete('/api/courses/:id/modules/:moduleId', (req, res) => {
  const { id, moduleId } = req.params;
  const courses = cachedDb.courses || [];
  const course = courses.find((c: any) => c.id === id);
  if (!course || !course.modules) return res.status(404).json({ success: false, message: 'Course or modules not found' });

  course.modules = course.modules.filter((m: any) => m.id !== moduleId);
  if (!Array.isArray(cachedDb.deletedItemIds)) cachedDb.deletedItemIds = [];
  if (!cachedDb.deletedItemIds.includes(moduleId)) cachedDb.deletedItemIds.push(moduleId);
  cachedDb.courses = courses;
  saveDatabase(cachedDb);
  return res.json({ success: true });
});

// Admin-exclusive permanent deletion endpoint for any item (module item, material, guide, quiz, assignment)
app.post('/api/admin/delete-item', (req, res) => {
  const { id } = req.body;
  if (!id) return res.status(400).json({ success: false, message: 'Item ID is required.' });

  if (!Array.isArray(cachedDb.deletedItemIds)) cachedDb.deletedItemIds = [];
  if (!cachedDb.deletedItemIds.includes(id)) cachedDb.deletedItemIds.push(id);

  if (Array.isArray(cachedDb.courses)) {
    cachedDb.courses = cachedDb.courses.filter((c: any) => c.id !== id);
    cachedDb.courses.forEach((c: any) => {
      if (Array.isArray(c.modules)) {
        c.modules = c.modules.filter((m: any) => m.id !== id);
        c.modules.forEach((m: any) => {
          if (Array.isArray(m.items)) m.items = m.items.filter((i: any) => i.id !== id);
          if (Array.isArray(m.studyMaterials)) m.studyMaterials = m.studyMaterials.filter((sm: any) => sm.id !== id);
          if (Array.isArray(m.assignmentGuides)) m.assignmentGuides = m.assignmentGuides.filter((ag: any) => ag.id !== id);
          if (Array.isArray(m.quizzes)) m.quizzes = m.quizzes.filter((q: any) => q.id !== id);
        });
      }
      if (Array.isArray(c.studyMaterials)) c.studyMaterials = c.studyMaterials.filter((sm: any) => sm.id !== id);
      if (Array.isArray(c.assignmentGuides)) c.assignmentGuides = c.assignmentGuides.filter((ag: any) => ag.id !== id);
      if (Array.isArray(c.quizzes)) c.quizzes = c.quizzes.filter((q: any) => q.id !== id);
    });
  }
  if (Array.isArray(cachedDb.assignments)) cachedDb.assignments = cachedDb.assignments.filter((a: any) => a.id !== id);
  if (Array.isArray(cachedDb.announcements)) cachedDb.announcements = cachedDb.announcements.filter((a: any) => a.id !== id);

  saveDatabase(cachedDb);
  return res.json({ success: true, deletedItemIds: cachedDb.deletedItemIds });
});

// Department Endpoints
app.get('/api/departments', (_req, res) => {
  return res.json({ success: true, departments: cachedDb.departments || [] });
});

app.post('/api/departments', (req, res) => {
  const deptData = req.body;
  const departments = cachedDb.departments || [];

  const newDept = {
    id: `dept-${Date.now()}`,
    name: deptData.name.trim(),
    code: (deptData.code || 'DEPT').trim().toUpperCase(),
    description: deptData.description?.trim() || 'Academic department',
    headOfDepartment: deptData.headOfDepartment?.trim() || 'Dean of Faculty',
  };

  departments.push(newDept);
  cachedDb.departments = departments;
  saveDatabase(cachedDb);

  return res.json({ success: true, department: newDept });
});

app.put('/api/departments/:id', (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  const departments = cachedDb.departments || [];
  const index = departments.findIndex((d: any) => d.id === id);

  if (index === -1) {
    return res.status(404).json({ success: false, message: 'Department not found.' });
  }

  departments[index] = { ...departments[index], ...updates };
  cachedDb.departments = departments;
  saveDatabase(cachedDb);

  return res.json({ success: true, department: departments[index] });
});

app.delete('/api/departments/:id', (req, res) => {
  const { id } = req.params;
  const departments = cachedDb.departments || [];
  cachedDb.departments = departments.filter((d: any) => d.id !== id);
  if (!Array.isArray(cachedDb.deletedItemIds)) cachedDb.deletedItemIds = [];
  if (!cachedDb.deletedItemIds.includes(id)) cachedDb.deletedItemIds.push(id);
  saveDatabase(cachedDb);
  return res.json({ success: true });
});

// High quality fallback curriculum questions by academic domain
function generateFallbackQuiz(topic: string, programName?: string, department?: string, count: number = 5) {
  const cleanTopic = topic || programName || 'Academic Subject';
  const questions = [
    {
      question: `What is the core foundational principle governing ${cleanTopic} in professional practice?`,
      options: [
        `Systematic evaluation, evidence-based methodology, and compliance with statutory frameworks`,
        `Ad-hoc decision making without formal empirical validation`,
        `Exclusively prioritizing short-term output over ethical and operational integrity`,
        `Disregarding regulatory standards in favour of isolated personal intuition`,
      ],
      correctAnswerIndex: 0,
      explanation: `Professional practice in ${cleanTopic} requires structured methodology, rigorous compliance with established governance, and adherence to legal and quality standards.`,
    },
    {
      question: `When assessing operational risk and mitigation strategies in ${cleanTopic}, which strategy delivers the highest resilience?`,
      options: [
        `Relying on a single unverified safeguard without redundancy`,
        `Proactive threat modeling, continuous monitoring, and structured contingency plans`,
        `Ignoring risk assessments until catastrophic failure occurs`,
        `Delegating all accountability to external third parties without oversight`,
      ],
      correctAnswerIndex: 1,
      explanation: `Proactive threat modeling coupled with continuous monitoring and tiered response plans ensures systemic resilience across operational workflows.`,
    },
    {
      question: `In modern UK and international academic standards for ${cleanTopic}, which element is essential for statutory compliance?`,
      options: [
        `Transparent documentation, stakeholder auditability, and adherence to regulatory benchmarks`,
        `Informal unrecorded oral agreements between department heads`,
        `Circumventing statutory audit trails to expedite processing`,
        `Restricting policy documentation to confidential personal notes`,
      ],
      correctAnswerIndex: 0,
      explanation: `Auditability, strict adherence to national frameworks, and transparent ledger documentation form the backbone of UK quality assurance standards.`,
    },
    {
      question: `How do practitioners in ${cleanTopic} evaluate the long-term effectiveness of an intervention or policy?`,
      options: [
        `Purely by initial anecdotal reception during the launch week`,
        `Through quantitative metrics, qualitative feedback loops, and comparative benchmark KPIs`,
        `By completely halting monitoring once deployment is signed off`,
        `By measuring only marketing impressions regardless of educational or operational outcomes`,
      ],
      correctAnswerIndex: 1,
      explanation: `A balanced scorecard combining quantitative metrics, qualitative peer reviews, and longitudinal KPIs is critical for assessing true effectiveness.`,
    },
    {
      question: `What ethical consideration must be continuously upheld when managing sensitive records in ${cleanTopic}?`,
      options: [
        `Strict adherence to Data Protection Act 2018 / UK GDPR and confidentiality protocols`,
        `Open dissemination of unencrypted participant identifiers on public portals`,
        `Retention of private records without access controls or role permissions`,
        `Selling confidential academic transcripts to third-party commercial brokers`,
      ],
      correctAnswerIndex: 0,
      explanation: `The Data Protection Act 2018 (UK GDPR) mandates confidentiality, role-based access control, purpose limitation, and strict data security protocols.`,
    },
  ];

  return {
    title: `${cleanTopic} - Academic Knowledge Assessment`,
    description: `Comprehensive diagnostic quiz assessing key theoretical foundations, operational models, and regulatory standards in ${cleanTopic}.`,
    timeLimitMinutes: Math.max(10, count * 3),
    passingScorePercent: 70,
    questions: questions.slice(0, count),
  };
}

// AI Quiz Generation Endpoint using Gemini API
app.post('/api/ai/generate-quiz', async (req, res) => {
  const {
    topic = 'Course Knowledge',
    department = 'Academic Studies',
    programName = 'Degree Program',
    questionCount = 5,
    difficulty = 'Intermediate',
    customPrompt = '',
  } = req.body;

  const qCount = Math.min(Math.max(1, Number(questionCount) || 5), 10);

  if (!apiKey) {
    console.warn('GEMINI_API_KEY not configured. Providing high quality curriculum fallback.');
    const fallback = generateFallbackQuiz(topic, programName, department, qCount);
    return res.json({
      success: true,
      quiz: fallback,
      source: 'curriculum-engine',
    });
  }

  try {
    const prompt = `You are an expert UK University Academic Dean and Examinations Board Director designing an evaluative knowledge quiz.
Course / Degree Program: "${programName}"
Academic Faculty / Department: "${department}"
Subject Assessment Topic: "${topic}"
Target Cognitive Rigor & Level: "${difficulty}"
Question Count: Exactly ${qCount} questions.
${customPrompt ? `Additional Assessment Criteria: ${customPrompt}` : ''}

Generate high-quality multiple choice assessment questions following UK higher education QAA benchmarks.
Each question must have:
1. Clear, rigorous question stem.
2. 4 distinct options with one unambiguously correct choice.
3. Index of the correct answer (0, 1, 2, or 3).
4. Academic explanation justifying why the answer is correct according to theoretical and statutory frameworks.

Return ONLY valid JSON matching this schema:
{
  "title": "Title of the assessment",
  "description": "Short description of learning outcomes tested",
  "timeLimitMinutes": number (recommend 3 minutes per question),
  "passingScorePercent": number (e.g. 70),
  "questions": [
    {
      "question": "question text",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswerIndex": number,
      "explanation": "concise academic rationale"
    }
  ]
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'object' as any,
          properties: {
            title: { type: 'string' as any },
            description: { type: 'string' as any },
            timeLimitMinutes: { type: 'integer' as any },
            passingScorePercent: { type: 'integer' as any },
            questions: {
              type: 'array' as any,
              items: {
                type: 'object' as any,
                properties: {
                  question: { type: 'string' as any },
                  options: {
                    type: 'array' as any,
                    items: { type: 'string' as any },
                  },
                  correctAnswerIndex: { type: 'integer' as any },
                  explanation: { type: 'string' as any },
                },
                required: ['question', 'options', 'correctAnswerIndex', 'explanation'],
              },
            },
          },
          required: ['title', 'description', 'timeLimitMinutes', 'passingScorePercent', 'questions'],
        },
      },
    });

    const quizData = JSON.parse(response.text || '{}');
    if (!quizData.questions || quizData.questions.length === 0) {
      throw new Error('Empty questions returned from Gemini model');
    }

    return res.json({
      success: true,
      quiz: quizData,
      source: 'gemini-3.8-flash',
    });
  } catch (error: any) {
    console.error('Gemini Quiz Generation API error:', error);
    const fallback = generateFallbackQuiz(topic, programName, department, qCount);
    return res.json({
      success: true,
      quiz: fallback,
      source: 'curriculum-fallback',
      warning: error?.message || 'Using curriculum engine fallback',
    });
  }
});

// Mount Vite middleware in development or serve static dist in production
async function startServer() {
  const isDev = process.env.NODE_ENV !== 'production';

  if (isDev) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  const PORT = Number(process.env.PORT) || 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`AT Academics LMS server running with real-time persistent DB at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
