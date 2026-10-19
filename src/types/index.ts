export type UserRole = 'student' | 'teacher' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  loginId: string; // for staff or student ID
  password?: string;
  role: UserRole;
  avatarUrl?: string;
  studentId?: string;
  department?: string;
  cohort?: string;
  coursesEnrolled: string[];
  status: 'active' | 'suspended';
  // Financial records in GBP (£) - Only editable by Admin
  totalTuitionFee?: number;
  tuitionPaid?: number;
  tuitionDue?: number;
  // OTP for email reset
  resetOtp?: string;
  resetOtpExpiry?: string;
  // Qualification & Degree Records (Verifiable)
  qualificationTitle?: string; // e.g. BSc (Hons) Business Management
  graduationStatus?: 'graduated' | 'not_graduated' | 'expected';
  expectedGraduationDate?: string; // e.g. "July 2027"
  passingMonth?: string; // e.g. June, July, December
  passingYear?: string; // e.g. 2026, 2025
  graduatedOn?: string; // e.g. "July 2026", "Not Graduated Yet", "Expected: July 2027"
  isGraduated?: boolean;
  qualificationGrade?: string; // e.g. First Class Honours (1st), Distinction, Merit
  awardInstitute?: string; // e.g. AT Academics
  awardingBody?: string; // e.g. OTHM, ATHE, AT Academics
  regulatedBy?: string; // e.g. Regulated by Ofqual
  certificateNumber?: string;
  transcriptIssuedAt?: string;
  certificateIssuedAt?: string;
}

export interface Department {
  id: string;
  name: string;
  code: string;
  description: string;
  icon?: string;
  headOfDepartment?: string;
}

export interface StudyMaterial {
  id: string;
  courseId: string;
  moduleId?: string;
  title: string;
  description: string;
  category: 'lecture_slides' | 'reading_pdf' | 'revision_notes' | 'handout' | 'reference_material' | 'doc_document';
  fileName: string;
  fileSize: string;
  fileType?: string;
  uploadedBy: string;
  uploadedAt: string;
  downloadUrl?: string;
  fileContentBase64?: string;
}

export interface AssignmentGuide {
  id: string;
  courseId: string;
  moduleId?: string;
  title: string;
  description: string;
  category: 'assignment_brief' | 'marking_rubric' | 'specification' | 'template' | 'guide';
  fileName: string;
  fileSize: string;
  dueDate?: string;
  totalMarks?: number;
  uploadedBy: string;
  uploadedAt: string;
  downloadUrl?: string;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
}

export interface Quiz {
  id: string;
  courseId: string;
  moduleId?: string;
  title: string;
  description: string;
  timeLimitMinutes: number;
  questions: QuizQuestion[];
  createdById: string;
  createdByName: string;
  createdAt: string;
  totalPoints: number;
  passingScorePercent: number;
  sharedWithStudents: boolean;
  isAiGenerated?: boolean;
}

export interface QuizAttempt {
  id: string;
  quizId: string;
  studentId: string;
  studentName: string;
  score: number;
  totalPoints: number;
  percentage: number;
  answers: Record<string, number>; // questionId -> selectedOptionIndex
  passed: boolean;
  completedAt: string;
}

export interface DeletionRequest {
  id: string;
  teacherId: string;
  teacherName: string;
  targetType: 'course' | 'module' | 'assignment' | 'material';
  targetId: string;
  targetTitle: string;
  courseCode?: string;
  reason: string;
  requestedAt: string;
  status: 'pending' | 'approved' | 'rejected';
  adminFeedback?: string;
}

export interface CourseChapter {
  time: number; // in seconds
  title: string;
}

export interface TranscriptLine {
  time: number; // in seconds
  speaker: string;
  text: string;
}

export interface VideoLectureMetadata {
  videoUrl: string;
  durationSeconds: number;
  resolutionOptions: string[];
  chapters: CourseChapter[];
  transcript: TranscriptLine[];
  isProtectedDrm: boolean;
  watermarkEnabled: boolean;
}

export interface ModuleItem {
  id: string;
  type: 'video' | 'reading' | 'assignment' | 'quiz';
  title: string;
  description?: string;
  durationOrPages?: string;
  videoMetadata?: VideoLectureMetadata;
  assignmentId?: string;
  quizId?: string;
  isCompleted?: boolean;
}

export interface CourseModule {
  id: string;
  title: string;
  weekNumber: number;
  description: string;
  items: ModuleItem[];
  studyMaterials?: StudyMaterial[];
  assignmentGuides?: AssignmentGuide[];
  quizzes?: Quiz[];
  unitCode?: string; // Academic Unit Code e.g. BUS-M01
  credits?: number; // UK Unit Credits e.g. 15, 20
  isCompleted?: boolean;
}

export interface Course {
  id: string;
  code: string;
  title: string;
  department: string; // Department name
  departmentId?: string;
  programName?: string;
  level?: string; // e.g. OTHM Level 3, OTHM Level 4, Extended Level 5 (240 Credit), OTHM Level 6, OTHM Level 7, ATHE Level 3 diploma
  awardingBody?: string; // e.g. OTHM, ATHE, AT Academics
  regulatedBy?: string; // e.g. Regulated by Ofqual
  instructorId: string;
  instructorName: string;
  instructorEmail: string;
  semester: string;
  credits: number;
  description: string;
  coverImage: string;
  capacity: number;
  enrolledCount: number;
  schedule: string;
  modules: CourseModule[];
  studyMaterials: StudyMaterial[];
  assignmentGuides: AssignmentGuide[];
  quizzes: Quiz[];
}

export interface StudentCredential {
  id: string;
  studentId: string;
  studentName: string;
  email: string;
  temporaryPassword: string;
  cohort: string;
  department: string;
  enrolledCourseCodes: string[];
  createdAt: string;
  status: 'active' | 'pending_first_login';
}

export interface RubricItem {
  id: string;
  criterion: string;
  maxPoints: number;
  description: string;
}

export interface Assignment {
  id: string;
  courseId: string;
  courseCode: string;
  courseTitle: string;
  moduleId?: string;
  title: string;
  description: string;
  dueDate: string; // ISO string
  totalPoints: number;
  rubric: RubricItem[];
  allowLateSubmission: boolean;
  fileTypesAllowed: string[];
}

export interface AssignmentSubmission {
  id: string;
  assignmentId: string;
  assignmentTitle: string;
  courseId: string;
  moduleId?: string;
  courseCode: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  submittedAt: string;
  fileName: string;
  fileSize: string;
  fileContentPreview: string;
  status: 'graded' | 'submitted' | 'late' | 'missing';
  score?: number;
  letterGrade?: string;
  feedback?: string;
  gradedBy?: string;
  gradedAt?: string;
  rubricScores?: Record<string, number>;
}

export interface StudentCourseProgress {
  studentId: string;
  courseId: string;
  watchedLecturesCount: number;
  totalLecturesCount: number;
  completedItems: string[];
  completedModules?: string[]; // Array of module IDs completed by this student
  assignmentScores: { assignmentId: string; score: number; maxScore: number }[];
  currentAverageScore: number;
  letterGrade: string;
  attendancePercent: number;
  lastActive: string;
  atRisk: boolean;
}

export interface NotificationItem {
  id: string;
  type: 'deadline' | 'announcement' | 'grade' | 'message';
  title: string;
  message: string;
  courseCode?: string;
  targetLink?: string;
  timestamp: string;
  read: boolean;
  urgent?: boolean;
  dueDate?: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  courseId?: string;
  courseCode?: string;
  authorName: string;
  authorRole: string;
  postedAt: string;
  pinned?: boolean;
  priority: 'normal' | 'high' | 'urgent';
}

export interface ChatMessage {
  id: string;
  threadId: string;
  senderId: string;
  senderName: string;
  senderRole: UserRole;
  content: string;
  timestamp: string;
  assignmentContext?: {
    assignmentId: string;
    assignmentTitle: string;
  };
  editCount?: number;
  editedAt?: string;
}

export interface ChatThread {
  id: string;
  courseCode?: string;
  courseTitle?: string;
  participants: {
    id: string;
    name: string;
    role: UserRole;
    email: string;
  }[];
  lastMessage: string;
  lastMessageTimestamp: string;
  unreadCount: number;
}

export interface VideoNote {
  id: string;
  lectureId: string;
  userId: string;
  timestampSeconds: number;
  text: string;
  createdAt: string;
}

export interface OfficialCertificate {
  certificateId: string;
  studentId: string;
  studentName: string;
  programTitle: string;
  gradeClassification: string;
  passingMonth: string;
  passingYear: string;
  graduatedOn: string;
  conferredDate: string;
  instituteName: string;
  verificationUrl: string;
  issuerAdminName: string;
  issueDate: string;
}

export interface TranscriptCourseEntry {
  courseCode: string;
  courseTitle: string;
  credits: number;
  score: number;
  grade: string;
  semester: string;
}

export interface OfficialTranscript {
  transcriptId: string;
  studentId: string;
  studentName: string;
  programTitle: string;
  cohort: string;
  graduatedOn: string;
  cumulativeGpa: string;
  totalCredits: number;
  status: string;
  issuedAt: string;
  issuerAdminName: string;
  entries: TranscriptCourseEntry[];
}
