import {
  User,
  Department,
  Course,
  StudentCredential,
  Assignment,
  AssignmentSubmission,
  StudentCourseProgress,
  NotificationItem,
  Announcement,
  ChatThread,
  ChatMessage,
  VideoNote,
} from '../types';

export const INITIAL_USERS: User[] = [
  {
    id: 'user-admin-atikur',
    name: 'Atikur Rahman',
    email: 'atacademicsltd@gmail.com',
    loginId: 'atikur.rahman',
    password: 'ATAcademicslms@2026',
    role: 'admin',
    department: 'University Administration',
    coursesEnrolled: [],
    status: 'active',
  },
];

export const INITIAL_DEPARTMENTS: Department[] = [
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
];

// Active courses erased - kept blank so teachers and admins can add fresh programs
export const INITIAL_COURSES: Course[] = [];

export const INITIAL_ASSIGNMENTS: Assignment[] = [];
export const INITIAL_SUBMISSIONS: AssignmentSubmission[] = [];
export const INITIAL_STUDENT_CREDENTIALS: StudentCredential[] = [];
export const INITIAL_PROGRESS: Record<string, StudentCourseProgress> = {};
export const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'notif-welcome',
    type: 'announcement',
    title: 'AT Academics LMS Initialized',
    message: 'Welcome to AT Academics LMS. Academic departments and curriculum management are active.',
    timestamp: new Date().toISOString(),
    read: false,
  },
];
export const INITIAL_ANNOUNCEMENTS: Announcement[] = [];
export const INITIAL_CHAT_THREADS: ChatThread[] = [];
export const INITIAL_CHAT_MESSAGES: ChatMessage[] = [];
export const INITIAL_VIDEO_NOTES: VideoNote[] = [];
