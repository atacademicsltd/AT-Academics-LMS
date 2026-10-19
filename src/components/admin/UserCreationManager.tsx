import React, { useState } from 'react';
import { User, Course, DeletionRequest, AssignmentSubmission } from '../../types';
import { StorageService } from '../../services/storage';
import {
  UserPlus,
  Users,
  Shield,
  GraduationCap,
  Receipt,
  Search,
  Trash2,
  Edit2,
  CheckCircle2,
  AlertCircle,
  FileText,
  Award,
  TrendingUp,
  Printer,
  Calendar,
} from 'lucide-react';
import { OfficialCertificateModal } from './OfficialCertificateModal';
import { OfficialTranscriptModal } from './OfficialTranscriptModal';
import { StudentProgressStatsModal } from './StudentProgressStatsModal';

interface UserCreationManagerProps {
  users: User[];
  courses: Course[];
  currentUser: User;
  onRefresh: () => void;
}

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const YEARS = ['2030', '2029', '2028', '2027', '2026', '2025', '2024', '2023', '2022', '2021', '2020'];

export const QUAL_PRESETS = [
  { title: 'OTHM Level 3', awardingBody: 'OTHM', regulatedBy: 'Regulated by Ofqual' },
  { title: 'OTHM Level 4', awardingBody: 'OTHM', regulatedBy: 'Regulated by Ofqual' },
  { title: 'Extended Level 5 (240 Credit)', awardingBody: 'OTHM', regulatedBy: 'Regulated by Ofqual' },
  { title: 'OTHM Level 6', awardingBody: 'OTHM', regulatedBy: 'Regulated by Ofqual' },
  { title: 'OTHM Level 7', awardingBody: 'OTHM', regulatedBy: 'Regulated by Ofqual' },
  { title: 'ATHE Level 3 diploma', awardingBody: 'ATHE', regulatedBy: 'Regulated by Ofqual' },
  { title: 'AT Academics Professional Diploma', awardingBody: 'AT Academics', regulatedBy: 'AT Academics Academic Registry' },
];

export const UserCreationManager: React.FC<UserCreationManagerProps> = ({
  users,
  courses,
  currentUser,
  onRefresh,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<
    'create' | 'roster' | 'progress_stats' | 'documents' | 'deletion_requests'
  >('create');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'student' | 'teacher' | 'admin'>('all');

  // Form State for User Creation
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'teacher' | 'student'>('student');
  const [department, setDepartment] = useState('Computer Science & Engineering');
  const [cohort, setCohort] = useState('Fall 2026 Cohort');
  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);
  const [totalTuition, setTotalTuition] = useState<number>(4500);
  const [tuitionPaid, setTuitionPaid] = useState<number>(1500);

  // Graduation fields for creation
  const [createGradStatus, setCreateGradStatus] = useState<'graduated' | 'not_graduated' | 'expected'>('not_graduated');
  const [createGradMonth, setCreateGradMonth] = useState('July');
  const [createGradYear, setCreateGradYear] = useState('2026');
  const [createExpectedMonth, setCreateExpectedMonth] = useState('July');
  const [createExpectedYear, setCreateExpectedYear] = useState('2027');
  const [createIsGraduated, setCreateIsGraduated] = useState(false);
  const [createQualTitle, setCreateQualTitle] = useState('OTHM Level 4');
  const [createQualGrade, setCreateQualGrade] = useState('First Class Honours (1st)');
  const [createAwardingBody, setCreateAwardingBody] = useState('OTHM');
  const [createRegulatedBy, setCreateRegulatedBy] = useState('Regulated by Ofqual');

  // Editing User Financials & All Details
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editLoginId, setEditLoginId] = useState('');
  const [editRole, setEditRole] = useState<'admin' | 'teacher' | 'student'>('student');
  const [editDepartment, setEditDepartment] = useState('');
  const [editCohort, setEditCohort] = useState('');
  const [editTotalTuition, setEditTotalTuition] = useState<number>(0);
  const [editTuitionPaid, setEditTuitionPaid] = useState<number>(0);
  const [editCourses, setEditCourses] = useState<string[]>([]);
  const [editPassword, setEditPassword] = useState<string>('');

  // Graduation fields for edit
  const [editGradStatus, setEditGradStatus] = useState<'graduated' | 'not_graduated' | 'expected'>('not_graduated');
  const [editGradMonth, setEditGradMonth] = useState('July');
  const [editGradYear, setEditGradYear] = useState('2026');
  const [editExpectedMonth, setEditExpectedMonth] = useState('July');
  const [editExpectedYear, setEditExpectedYear] = useState('2027');
  const [editIsGraduated, setEditIsGraduated] = useState(false);
  const [editQualTitle, setEditQualTitle] = useState('');
  const [editQualGrade, setEditQualGrade] = useState('First Class Honours (1st)');
  const [editAwardingBody, setEditAwardingBody] = useState('OTHM');
  const [editRegulatedBy, setEditRegulatedBy] = useState('Regulated by Ofqual');

  // Document & Progress Stats Modals State
  const [certificateStudent, setCertificateStudent] = useState<User | null>(null);
  const [transcriptStudent, setTranscriptStudent] = useState<User | null>(null);
  const [progressStatsStudent, setProgressStatsStudent] = useState<User | null>(null);

  // Alerts
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const deletionRequests = StorageService.getDeletionRequests();
  const submissions: AssignmentSubmission[] = StorageService.getSubmissions();
  const students = users.filter((u) => u.role === 'student');

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg(null);

    let gradOn = 'Not Graduated Yet';
    let isGrad = false;
    let pMonth: string | undefined = undefined;
    let pYear: string | undefined = undefined;
    let expDate: string | undefined = undefined;

    if (createGradStatus === 'graduated') {
      gradOn = `${createGradMonth} ${createGradYear}`;
      isGrad = true;
      pMonth = createGradMonth;
      pYear = createGradYear;
    } else if (createGradStatus === 'expected') {
      expDate = `${createExpectedMonth} ${createExpectedYear}`;
      gradOn = `Expected: ${createExpectedMonth} ${createExpectedYear}`;
      isGrad = false;
      pMonth = createExpectedMonth;
      pYear = createExpectedYear;
    } else {
      gradOn = 'Not Graduated Yet';
      isGrad = false;
    }

    const res = StorageService.adminCreateUser({
      name: name.trim(),
      email: email.trim(),
      loginId: loginId.trim(),
      password: password.trim(),
      role,
      department,
      cohort,
      coursesEnrolled: selectedCourses,
      totalTuitionFee: role === 'student' ? Number(totalTuition) : undefined,
      tuitionPaid: role === 'student' ? Number(tuitionPaid) : undefined,
      graduationStatus: role === 'student' ? createGradStatus : undefined,
      expectedGraduationDate: role === 'student' ? expDate : undefined,
      graduatedOn: role === 'student' ? gradOn : undefined,
      passingMonth: role === 'student' ? pMonth : undefined,
      passingYear: role === 'student' ? pYear : undefined,
      isGraduated: role === 'student' ? isGrad : undefined,
      qualificationTitle: role === 'student' ? createQualTitle.trim() : undefined,
      qualificationGrade: role === 'student' ? createQualGrade : undefined,
      awardInstitute: role === 'student' ? 'AT Academics' : undefined,
      awardingBody: role === 'student' ? createAwardingBody : undefined,
      regulatedBy: role === 'student' ? createRegulatedBy : undefined,
    });

    if (res.success) {
      setStatusMsg({
        type: 'success',
        text: `User ${name} (${role}) successfully created with Login ID: ${loginId}. Status: ${gradOn}`,
      });
      setName('');
      setEmail('');
      setLoginId('');
      setPassword('');
      setSelectedCourses([]);
      onRefresh();
    } else {
      setStatusMsg({ type: 'error', text: res.message || 'Failed to create user.' });
    }
  };

  const handleOpenEdit = (user: User) => {
    setEditingUser(user);
    setEditName(user.name);
    setEditEmail(user.email);
    setEditLoginId(user.loginId || user.studentId || '');
    setEditRole(user.role);
    setEditDepartment(user.department || 'Computer Science & Engineering');
    setEditCohort(user.cohort || 'Fall 2026 Cohort');
    setEditTotalTuition(user.totalTuitionFee || 0);
    setEditTuitionPaid(user.tuitionPaid || 0);
    setEditCourses(user.coursesEnrolled || []);
    setEditPassword(user.password || '');

    // Parse graduation fields
    let initialGradStatus: 'graduated' | 'not_graduated' | 'expected' = 'not_graduated';
    if (user.graduationStatus) {
      initialGradStatus = user.graduationStatus;
    } else if (user.isGraduated === false || user.graduatedOn === 'Not Graduated Yet') {
      initialGradStatus = 'not_graduated';
    } else if (user.graduatedOn?.startsWith('Expected')) {
      initialGradStatus = 'expected';
    } else if (user.isGraduated === true || user.graduatedOn) {
      initialGradStatus = 'graduated';
    }
    setEditGradStatus(initialGradStatus);

    const month = user.passingMonth || (user.graduatedOn && !user.graduatedOn.includes('Not') ? user.graduatedOn.replace('Expected: ', '').split(' ')[0] : 'July');
    const year = user.passingYear || (user.graduatedOn && !user.graduatedOn.includes('Not') ? user.graduatedOn.replace('Expected: ', '').split(' ')[1] : '2026');
    setEditGradMonth(month);
    setEditGradYear(year);
    setEditExpectedMonth(user.expectedGraduationDate?.split(' ')[0] || month);
    setEditExpectedYear(user.expectedGraduationDate?.split(' ')[1] || '2027');
    setEditIsGraduated(user.isGraduated ?? (initialGradStatus === 'graduated'));
    const initialQual = user.qualificationTitle || 'OTHM Level 4';
    setEditQualTitle(initialQual);
    setEditQualGrade(user.qualificationGrade || 'First Class Honours (1st)');
    const initialAwarding =
      user.awardingBody ||
      (initialQual.toLowerCase().includes('at academics')
        ? 'AT Academics'
        : initialQual.toLowerCase().includes('athe')
        ? 'ATHE'
        : 'OTHM');
    setEditAwardingBody(initialAwarding);
    setEditRegulatedBy(
      user.regulatedBy ||
      (initialAwarding === 'AT Academics'
        ? 'AT Academics Academic Registry'
        : 'Regulated by Ofqual')
    );
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    let gradOn = 'Not Graduated Yet';
    let isGrad = false;
    let pMonth: string | undefined = undefined;
    let pYear: string | undefined = undefined;
    let expDate: string | undefined = undefined;

    if (editGradStatus === 'graduated') {
      gradOn = `${editGradMonth} ${editGradYear}`;
      isGrad = true;
      pMonth = editGradMonth;
      pYear = editGradYear;
    } else if (editGradStatus === 'expected') {
      expDate = `${editExpectedMonth} ${editExpectedYear}`;
      gradOn = `Expected: ${editExpectedMonth} ${editExpectedYear}`;
      isGrad = false;
      pMonth = editExpectedMonth;
      pYear = editExpectedYear;
    } else {
      gradOn = 'Not Graduated Yet';
      isGrad = false;
    }

    StorageService.adminUpdateUser(editingUser.id, {
      name: editName.trim(),
      email: editEmail.trim(),
      loginId: editLoginId.trim(),
      role: editRole,
      department: editDepartment.trim(),
      cohort: editCohort.trim(),
      coursesEnrolled: editCourses,
      password: editPassword.trim() ? editPassword.trim() : editingUser.password,
      totalTuitionFee: editRole === 'student' ? Number(editTotalTuition) : undefined,
      tuitionPaid: editRole === 'student' ? Number(editTuitionPaid) : undefined,
      graduationStatus: editRole === 'student' ? editGradStatus : undefined,
      expectedGraduationDate: editRole === 'student' ? expDate : undefined,
      graduatedOn: editRole === 'student' ? gradOn : undefined,
      passingMonth: editRole === 'student' ? pMonth : undefined,
      passingYear: editRole === 'student' ? pYear : undefined,
      isGraduated: editRole === 'student' ? isGrad : undefined,
      qualificationTitle: editRole === 'student' ? editQualTitle.trim() : undefined,
      qualificationGrade: editRole === 'student' ? editQualGrade : undefined,
      awardInstitute: editRole === 'student' ? (editingUser.awardInstitute || 'AT Academics') : undefined,
      awardingBody: editRole === 'student' ? editAwardingBody : undefined,
      regulatedBy: editRole === 'student' ? editRegulatedBy : undefined,
    });

    setEditingUser(null);
    setStatusMsg({
      type: 'success',
      text: `Updated all details for ${editName}, including Graduated On (${gradOn}). Synced with Qualification Verification.`,
    });
    onRefresh();
  };

  const handleDeleteUser = (userId: string, userName: string) => {
    if (confirm(`Are you sure you want to permanently delete user account "${userName}"?`)) {
      const res = StorageService.deleteUser(userId);
      if (res.success) {
        setStatusMsg({ type: 'success', text: `Deleted user ${userName}.` });
        onRefresh();
      } else {
        setStatusMsg({ type: 'error', text: res.message || 'Cannot delete user.' });
      }
    }
  };

  const handleResolveDeletion = (requestId: string, approve: boolean) => {
    const feedback = prompt(
      approve
        ? 'Optional feedback to teacher (e.g. Approved and cleared):'
        : 'Reason for rejection to teacher:'
    );
    StorageService.resolveDeletionRequest(requestId, approve, feedback || undefined);
    onRefresh();
  };

  const toggleCourseSelection = (code: string) => {
    setSelectedCourses((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  const toggleEditCourse = (code: string) => {
    setEditCourses((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.loginId.toLowerCase().includes(search.toLowerCase()) ||
      (u.studentId && u.studentId.toLowerCase().includes(search.toLowerCase()));
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-2">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              User Creation & Academic Registry
            </h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-900 text-white">
              ADMINISTRATOR ONLY
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Provision student and staff credentials, configure Graduated On dates, view course progress stats, and generate official Transcripts and Certificates.
          </p>
        </div>

        {/* Sub-tab Switchers */}
        <div className="flex flex-wrap items-center gap-1 p-1 bg-white border border-slate-200 rounded-xl shadow-2xs">
          <button
            onClick={() => setActiveSubTab('create')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeSubTab === 'create'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Create User</span>
          </button>

          <button
            onClick={() => setActiveSubTab('roster')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeSubTab === 'roster'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>All Users Roster ({users.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('progress_stats')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeSubTab === 'progress_stats'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
            <span>Course Progress Stats ({students.length})</span>
          </button>

          {currentUser.role === 'admin' && (
            <button
              onClick={() => setActiveSubTab('documents')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeSubTab === 'documents'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Award className="w-3.5 h-3.5 text-amber-500" />
              <span>Certificates & Transcripts (Admin)</span>
            </button>
          )}

          <button
            onClick={() => setActiveSubTab('deletion_requests')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeSubTab === 'deletion_requests'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <AlertCircle className="w-3.5 h-3.5" />
            <span>
              Teacher Deletions ({deletionRequests.filter((r) => r.status === 'pending').length})
            </span>
          </button>
        </div>
      </div>

      {/* Status banner */}
      {statusMsg && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center justify-between ${
            statusMsg.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-red-50 text-red-800 border-red-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {statusMsg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            )}
            <span>{statusMsg.text}</span>
          </div>
          <button
            onClick={() => setStatusMsg(null)}
            className="text-slate-400 hover:text-slate-600 font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* SUB-TAB 1: CREATE USER FORM */}
      {activeSubTab === 'create' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs max-w-3xl">
          <div className="border-b border-slate-100 pb-4 mb-5">
            <h2 className="text-base font-bold text-slate-900">
              Provision New User Account
            </h2>
            <p className="text-xs text-slate-500">
              Register teachers or students with full academic profile, assigned courses, financial ledgers, and graduation records.
            </p>
          </div>

          <form onSubmit={handleCreateUser} className="space-y-4">
            {/* Role Switcher */}
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                Account Role
              </label>
              <div className="grid grid-cols-2 gap-3 max-w-md">
                <button
                  type="button"
                  onClick={() => setRole('student')}
                  className={`py-2 px-3 text-xs font-semibold rounded-lg flex items-center justify-center gap-2 border transition-colors cursor-pointer ${
                    role === 'student'
                      ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <GraduationCap className="w-4 h-4" />
                  <span>Student Account</span>
                </button>

                <button
                  type="button"
                  onClick={() => setRole('teacher')}
                  className={`py-2 px-3 text-xs font-semibold rounded-lg flex items-center justify-center gap-2 border transition-colors cursor-pointer ${
                    role === 'teacher'
                      ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <Shield className="w-4 h-4" />
                  <span>Instructor Account</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Full Legal Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Johnathan Davis"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. j.davis@atacademics.edu"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  {role === 'student' ? 'Student ID (Login Identifier)' : 'Staff Login ID'}
                </label>
                <input
                  type="text"
                  value={loginId}
                  onChange={(e) => setLoginId(e.target.value)}
                  placeholder={role === 'student' ? 'e.g. STU-2026-101' : 'e.g. prof.davis'}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 font-mono"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Initial Password
                </label>
                <input
                  type="text"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="e.g. AT#Student2026"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 font-mono"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Department
                </label>
                <input
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Cohort / Academic Year
                </label>
                <input
                  type="text"
                  value={cohort}
                  onChange={(e) => setCohort(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>
            </div>

            {/* Course Enrollment Selection */}
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                {role === 'student'
                  ? 'Assign Enrolled Courses'
                  : 'Assign Teaching Courses'}
              </label>
              {courses.length === 0 ? (
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-500">
                  No courses created yet.
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200 max-h-36 overflow-y-auto">
                  {courses.map((c) => {
                    const isChecked = selectedCourses.includes(c.code);
                    return (
                      <label
                        key={c.id}
                        className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer select-none"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleCourseSelection(c.code)}
                          className="rounded border-slate-300 text-slate-900 focus:ring-0"
                        />
                        <span className="font-mono font-bold">{c.code}</span>
                        <span className="truncate text-slate-500 text-[11px]">{c.title}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Graduation & Degree Record (Students Only) - Synced with Qualification Verification */}
            {role === 'student' && (
              <div className="p-4 bg-emerald-50/60 rounded-xl border border-emerald-200 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <GraduationCap className="w-4 h-4 text-emerald-700" />
                    <span className="text-xs font-bold text-slate-900">
                      Graduation Record & Conferred Degree
                    </span>
                  </div>
                  <span className="text-[11px] font-mono font-bold text-emerald-800">
                    {createGradStatus === 'graduated'
                      ? `Graduated On: ${createGradMonth} ${createGradYear}`
                      : createGradStatus === 'expected'
                      ? `Expected: ${createExpectedMonth} ${createExpectedYear}`
                      : 'Status: Not Graduated Yet'}
                  </span>
                </div>

                {/* 3-way Graduation Status Selector */}
                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1.5">
                    Graduation Status
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setCreateGradStatus('not_graduated')}
                      className={`py-2 px-2.5 rounded-lg text-xs font-semibold border transition-all text-center cursor-pointer ${
                        createGradStatus === 'not_graduated'
                          ? 'bg-amber-100 text-amber-900 border-amber-300 shadow-2xs font-bold'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <span>⏳ Not Graduated Yet</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setCreateGradStatus('expected')}
                      className={`py-2 px-2.5 rounded-lg text-xs font-semibold border transition-all text-center cursor-pointer ${
                        createGradStatus === 'expected'
                          ? 'bg-blue-100 text-blue-900 border-blue-300 shadow-2xs font-bold'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <span>📅 Expected Date</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setCreateGradStatus('graduated')}
                      className={`py-2 px-2.5 rounded-lg text-xs font-semibold border transition-all text-center cursor-pointer ${
                        createGradStatus === 'graduated'
                          ? 'bg-emerald-100 text-emerald-900 border-emerald-300 shadow-2xs font-bold'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <span>🎓 Graduated</span>
                    </button>
                  </div>
                </div>

                {/* If Not Graduated Yet */}
                {createGradStatus === 'not_graduated' && (
                  <div className="p-2.5 bg-amber-50/80 rounded-lg border border-amber-200 text-xs text-amber-800">
                    Student is recorded as active and not graduated yet. Transcripts, student roster, and verification will reflect &quot;Not Graduated Yet&quot;.
                  </div>
                )}

                {/* If Expected Date */}
                {createGradStatus === 'expected' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-blue-50/60 rounded-lg border border-blue-200">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                        Expected Graduation Month
                      </label>
                      <select
                        value={createExpectedMonth}
                        onChange={(e) => setCreateExpectedMonth(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg font-medium"
                      >
                        {MONTHS.map((m) => (
                          <option key={m} value={m}>
                            {m}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                        Expected Graduation Year
                      </label>
                      <select
                        value={createExpectedYear}
                        onChange={(e) => setCreateExpectedYear(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg font-mono font-medium"
                      >
                        {YEARS.map((y) => (
                          <option key={y} value={y}>
                            {y}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                {/* If Graduated */}
                {createGradStatus === 'graduated' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                        Conferred Graduation Month
                      </label>
                      <select
                        value={createGradMonth}
                        onChange={(e) => setCreateGradMonth(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg font-medium"
                      >
                        {MONTHS.map((m) => (
                          <option key={m} value={m}>
                            {m}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                        Conferred Graduation Year
                      </label>
                      <select
                        value={createGradYear}
                        onChange={(e) => setCreateGradYear(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg font-mono font-medium"
                      >
                        {YEARS.map((y) => (
                          <option key={y} value={y}>
                            {y}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                <div className="space-y-2 pt-1 border-t border-emerald-200/60">
                  <div className="flex flex-wrap items-center justify-between gap-1">
                    <label className="text-[11px] font-semibold text-slate-700 block">
                      Qualification Title & Awarding Body
                    </label>
                    <span className="text-[10px] font-mono text-emerald-800 font-bold bg-emerald-100/70 px-2 py-0.5 rounded">
                      {createAwardingBody} · {createRegulatedBy}
                    </span>
                  </div>

                  {/* Preset quick buttons */}
                  <div className="flex flex-wrap gap-1.5 pb-1">
                    {QUAL_PRESETS.map((p) => (
                      <button
                        key={p.title}
                        type="button"
                        onClick={() => {
                          setCreateQualTitle(p.title);
                          setCreateAwardingBody(p.awardingBody);
                          setCreateRegulatedBy(p.regulatedBy);
                        }}
                        className={`px-2 py-1 rounded-md text-[11px] font-semibold transition-all border cursor-pointer ${
                          createQualTitle === p.title
                            ? 'bg-slate-900 text-white border-slate-900 shadow-2xs font-bold'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        {p.title}
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <label className="text-[10px] font-mono uppercase text-slate-500 block mb-1">
                        Qualification Title
                      </label>
                      <input
                        type="text"
                        value={createQualTitle}
                        onChange={(e) => {
                          const val = e.target.value;
                          setCreateQualTitle(val);
                          const lower = val.toLowerCase();
                          if (lower.includes('athe')) {
                            setCreateAwardingBody('ATHE');
                            setCreateRegulatedBy('Regulated by Ofqual');
                          } else if (
                            lower.includes('othm') ||
                            lower.includes('extended level 5') ||
                            lower.includes('level 4 extended level 5') ||
                            lower.includes('level 3') ||
                            lower.includes('level 4') ||
                            lower.includes('level 5') ||
                            lower.includes('level 6') ||
                            lower.includes('level 7')
                          ) {
                            setCreateAwardingBody('OTHM');
                            setCreateRegulatedBy('Regulated by Ofqual');
                          }
                        }}
                        placeholder="e.g. OTHM Level 4 or Extended Level 5 (240 Credit)"
                        className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg font-medium"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-mono uppercase text-slate-500 block mb-1">
                        Classification Grade
                      </label>
                      <select
                        value={createQualGrade}
                        onChange={(e) => setCreateQualGrade(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg"
                      >
                        <option value="First Class Honours (1st)">First Class Honours (1st)</option>
                        <option value="Second Class Honours, Upper (2:1)">Second Class Honours, Upper (2:1)</option>
                        <option value="Second Class Honours, Lower (2:2)">Second Class Honours, Lower (2:2)</option>
                        <option value="Third Class Honours (3rd)">Third Class Honours (3rd)</option>
                        <option value="Distinction">Distinction</option>
                        <option value="Merit">Merit</option>
                        <option value="Pass">Pass</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="text-[10px] uppercase font-mono text-slate-500 block mb-0.5">
                        Awarding Body
                      </label>
                      <select
                        value={createAwardingBody}
                        onChange={(e) => {
                          const b = e.target.value;
                          setCreateAwardingBody(b);
                          if (b === 'OTHM' || b === 'ATHE') {
                            setCreateRegulatedBy('Regulated by Ofqual');
                          } else if (b === 'AT Academics') {
                            setCreateRegulatedBy('AT Academics Academic Registry');
                          }
                        }}
                        className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg font-semibold text-slate-900"
                      >
                        <option value="OTHM">OTHM (Awarding body, Regulated by Ofqual)</option>
                        <option value="ATHE">ATHE (Awarding body, Regulated by Ofqual)</option>
                        <option value="AT Academics">AT Academics</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] uppercase font-mono text-slate-500 block mb-0.5">
                        Regulatory Authority
                      </label>
                      <input
                        type="text"
                        value={createRegulatedBy}
                        onChange={(e) => setCreateRegulatedBy(e.target.value)}
                        placeholder="e.g. Regulated by Ofqual"
                        className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg font-mono text-emerald-800 font-medium"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Financial Ledger (Students Only) in GBP (£) */}
            {role === 'student' && (
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-slate-700" />
                    <span className="text-xs font-bold text-slate-900">
                      Student Tuition Fee & Payment Ledger (Admin Only) - GBP (£)
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-500">
                    Calculated Due: £{Math.max(0, totalTuition - tuitionPaid).toLocaleString()}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] text-slate-600 block mb-1 font-mono">
                      TOTAL TUITION (£)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={totalTuition}
                      onChange={(e) => setTotalTuition(Number(e.target.value) || 0)}
                      className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg font-mono font-bold text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-600 block mb-1 font-mono">
                      PAYMENT RECEIVED (£)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={tuitionPaid}
                      onChange={(e) => setTuitionPaid(Number(e.target.value) || 0)}
                      className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg font-mono font-bold text-emerald-700"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-600 block mb-1 font-mono">
                      BALANCE DUE (£)
                    </label>
                    <input
                      type="text"
                      disabled
                      value={`£${Math.max(0, totalTuition - tuitionPaid).toLocaleString()}`}
                      className="w-full px-3 py-1.5 text-xs bg-slate-100 border border-slate-200 rounded-lg font-mono font-bold text-slate-800"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="px-5 py-2.5 bg-slate-900 text-white text-xs font-semibold rounded-lg hover:bg-slate-800 transition-colors shadow-xs cursor-pointer"
              >
                Create Account & Issue Credentials
              </button>
            </div>
          </form>
        </div>
      )}

      {/* SUB-TAB 2: ALL USERS ROSTER */}
      {activeSubTab === 'roster' && (
        <div className="space-y-4">
          {/* Controls */}
          <div className="p-3 bg-white rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
              <Search className="w-4 h-4 text-slate-400 ml-1" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, login ID, or email..."
                className="w-full text-xs bg-transparent border-none focus:outline-none text-slate-900 placeholder:text-slate-400"
              />
            </div>

            <div className="flex items-center gap-1">
              {(['all', 'student', 'teacher', 'admin'] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setRoleFilter(r)}
                  className={`px-2.5 py-1 text-xs rounded-md font-medium capitalize transition-colors cursor-pointer ${
                    roleFilter === r
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 text-slate-500 font-mono text-[11px] border-b border-slate-200 uppercase">
                  <tr>
                    <th className="py-3 px-4">User & Role</th>
                    <th className="py-3 px-4">Login Identifier</th>
                    <th className="py-3 px-4">Graduated On & Degree</th>
                    <th className="py-3 px-4">Tuition Ledger</th>
                    <th className="py-3 px-4 text-right">Admin Generation & Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUsers.map((u) => {
                    const total = u.totalTuitionFee || 0;
                    const paid = u.tuitionPaid || 0;
                    const due = u.tuitionDue || Math.max(0, total - paid);
                    const gradDisplay = u.graduatedOn || `${u.passingMonth || 'July'} ${u.passingYear || '2026'}`;

                    return (
                      <tr key={u.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                            <span>{u.name}</span>
                            <span className="text-[10px] font-mono uppercase bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded font-semibold">
                              {u.role}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono">{u.email}</div>
                        </td>

                        <td className="py-3 px-4 font-mono text-slate-800 whitespace-nowrap">
                          <div>{u.loginId}</div>
                          <div className="text-[10px] text-slate-400">
                            Pass: {u.password ? '••••••••' : 'Unset'}
                          </div>
                        </td>

                        {/* Graduated On Field */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          {u.role === 'student' ? (
                            <div className="space-y-0.5">
                              {(() => {
                                const isNotGrad =
                                  u.isGraduated === false ||
                                  u.graduationStatus === 'not_graduated' ||
                                  u.graduatedOn === 'Not Graduated Yet';
                                const isExp =
                                  u.graduationStatus === 'expected' ||
                                  u.graduatedOn?.startsWith('Expected');

                                if (isNotGrad) {
                                  return (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                      <span>⏳ Not Graduated Yet</span>
                                    </span>
                                  );
                                }
                                if (isExp) {
                                  return (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-50 text-blue-800 border border-blue-200">
                                      <span>📅 Expected: {u.expectedGraduationDate || u.graduatedOn?.replace('Expected: ', '')}</span>
                                    </span>
                                  );
                                }
                                return (
                                  <div className="font-bold text-slate-900 flex items-center gap-1 text-[11px]">
                                    <GraduationCap className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                    <span>Graduated: {gradDisplay}</span>
                                  </div>
                                );
                              })()}
                              <div className="text-[10px] text-slate-500 truncate max-w-xs">
                                {u.qualificationTitle || 'BSc (Hons) Business Management'}
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-400 text-[11px]">N/A (Staff)</span>
                          )}
                        </td>

                        <td className="py-3 px-4 whitespace-nowrap font-mono text-[11px]">
                          {u.role === 'student' ? (
                            <div className="space-y-0.5">
                              <div>Total: £{total.toLocaleString()}</div>
                              <div className="text-emerald-700">Paid: £{paid.toLocaleString()}</div>
                              <div className={due > 0 ? 'text-amber-700 font-bold' : 'text-slate-500'}>
                                Due: £{due.toLocaleString()}
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-400">N/A (Staff)</span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5">
                            {/* Course Progress Stats Button */}
                            {u.role === 'student' && (
                              <button
                                onClick={() => setProgressStatsStudent(u)}
                                className="px-2.5 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-lg text-xs font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer"
                                title="View Course Progress Stats"
                              >
                                <TrendingUp className="w-3 h-3 text-blue-600" />
                                <span>Stats</span>
                              </button>
                            )}

                            {/* Official Certificate Generation (Admin Only) */}
                            {u.role === 'student' && currentUser.role === 'admin' && (
                              <button
                                onClick={() => setCertificateStudent(u)}
                                className="px-2.5 py-1 bg-amber-50 text-amber-900 hover:bg-amber-100 border border-amber-300 rounded-lg text-xs font-bold inline-flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                                title="Generate Official Certificate (Admin Only)"
                              >
                                <Award className="w-3 h-3 text-amber-600" />
                                <span>Certificate</span>
                              </button>
                            )}

                            {/* Official Transcript Generation (Admin Only) */}
                            {u.role === 'student' && currentUser.role === 'admin' && (
                              <button
                                onClick={() => setTranscriptStudent(u)}
                                className="px-2.5 py-1 bg-purple-50 text-purple-900 hover:bg-purple-100 border border-purple-300 rounded-lg text-xs font-bold inline-flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                                title="Generate Official Transcript (Admin Only)"
                              >
                                <FileText className="w-3 h-3 text-purple-600" />
                                <span>Transcript</span>
                              </button>
                            )}

                            {/* Edit All User Details */}
                            <button
                              onClick={() => handleOpenEdit(u)}
                              className="px-2.5 py-1 border border-slate-200 text-slate-700 hover:text-slate-950 hover:bg-slate-50 rounded-lg text-xs font-medium inline-flex items-center gap-1 cursor-pointer"
                            >
                              <Edit2 className="w-3 h-3" />
                              <span>Edit Details</span>
                            </button>

                            {u.role !== 'admin' && (
                              <button
                                onClick={() => handleDeleteUser(u.id, u.name)}
                                className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 cursor-pointer"
                                title="Delete user account"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: COURSE PROGRESS STATS OVERVIEW */}
      {activeSubTab === 'progress_stats' && (
        <div className="space-y-4">
          <div className="p-4 bg-white rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-600" />
                <span>Student Course Progress & Completion Matrix</span>
              </h2>
              <p className="text-xs text-slate-500">
                Track completion percentage, assignment submissions, modular progress, and grading standing across all registered students.
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-slate-700">
              Total Students: {students.length}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {students.map((st) => {
              const subs = submissions.filter(
                (s) => s.studentId === st.studentId || s.studentId === st.loginId
              );
              const gradDisplay = st.graduatedOn || `${st.passingMonth || 'July'} ${st.passingYear || '2026'}`;
              const enrolledCodes = st.coursesEnrolled || [];

              return (
                <div
                  key={st.id}
                  className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-3.5"
                >
                  <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">{st.name}</h3>
                      <p className="text-xs font-mono text-slate-500">
                        ID: {st.studentId || st.loginId} · {st.department || 'Academics'}
                      </p>
                    </div>
                    {(() => {
                      const isNotGrad =
                        st.isGraduated === false ||
                        st.graduationStatus === 'not_graduated' ||
                        st.graduatedOn === 'Not Graduated Yet';
                      const isExp =
                        st.graduationStatus === 'expected' ||
                        st.graduatedOn?.startsWith('Expected');
                      if (isNotGrad) {
                        return (
                          <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 text-[10px] font-mono font-bold border border-amber-200">
                            ⏳ Not Graduated Yet
                          </span>
                        );
                      }
                      if (isExp) {
                        return (
                          <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-800 text-[10px] font-mono font-bold border border-blue-200">
                            📅 Expected: {st.expectedGraduationDate || st.graduatedOn?.replace('Expected: ', '')}
                          </span>
                        );
                      }
                      return (
                        <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 text-[10px] font-mono font-bold border border-emerald-200">
                          🎓 Graduated: {gradDisplay}
                        </span>
                      );
                    })()}
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                      <span className="text-[10px] font-mono text-slate-400 block">ENROLLED</span>
                      <span className="font-bold text-slate-800">{enrolledCodes.length} Courses</span>
                    </div>
                    <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                      <span className="text-[10px] font-mono text-slate-400 block">SUBMISSIONS</span>
                      <span className="font-bold text-emerald-700">{subs.length} Filed</span>
                    </div>
                    <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                      <span className="text-[10px] font-mono text-slate-400 block">PROGRESS</span>
                      <span className="font-bold text-blue-700">{subs.length > 0 ? '100%' : '0%'}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <button
                      onClick={() => setProgressStatsStudent(st)}
                      className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <TrendingUp className="w-3.5 h-3.5" />
                      <span>Inspect Course Progress Details</span>
                    </button>

                    {currentUser.role === 'admin' && (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setCertificateStudent(st)}
                          className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                          title="Generate Official Certificate (Admin Only)"
                        >
                          <Award className="w-3 h-3 text-amber-600" />
                          <span>Certificate</span>
                        </button>
                        <button
                          onClick={() => setTranscriptStudent(st)}
                          className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-300 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                          title="Generate Official Transcript (Admin Only)"
                        >
                          <FileText className="w-3 h-3 text-purple-600" />
                          <span>Transcript</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SUB-TAB 4: OFFICIAL CERTIFICATES & TRANSCRIPTS HUB (ADMIN ONLY) */}
      {activeSubTab === 'documents' && currentUser.role === 'admin' && (
        <div className="space-y-4">
          <div className="p-4 bg-white rounded-xl border border-slate-200">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-500" />
              <h2 className="text-base font-bold text-slate-900">
                Official Degree Certificates & Academic Transcripts Generation
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Strictly restricted to Administrators. Generate, preview, and print verifiable graduation certificates and official academic transcripts for students.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {students.map((st) => {
              const gradDisplay = st.graduatedOn || `${st.passingMonth || 'July'} ${st.passingYear || '2026'}`;
              return (
                <div
                  key={st.id}
                  className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold">
                      {st.name.charAt(0)}
                    </div>
                    <div className="truncate">
                      <h4 className="text-sm font-bold text-slate-900 truncate">{st.name}</h4>
                      <p className="text-xs font-mono text-slate-500">{st.studentId || st.loginId}</p>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs space-y-1">
                    <div className="text-[10px] uppercase font-mono text-slate-400">Award Title & Date</div>
                    <div className="font-semibold text-slate-800 truncate">
                      {st.qualificationTitle || 'BSc (Hons) Business Management'}
                    </div>
                    {(() => {
                      const isNotGrad =
                        st.isGraduated === false ||
                        st.graduationStatus === 'not_graduated' ||
                        st.graduatedOn === 'Not Graduated Yet';
                      const isExp =
                        st.graduationStatus === 'expected' ||
                        st.graduatedOn?.startsWith('Expected');
                      if (isNotGrad) {
                        return (
                          <div className="font-bold text-amber-800 flex items-center gap-1 text-[11px]">
                            <span>⏳ Status: Not Graduated Yet</span>
                          </div>
                        );
                      }
                      if (isExp) {
                        return (
                          <div className="font-bold text-blue-800 flex items-center gap-1 text-[11px]">
                            <span>📅 Expected: {st.expectedGraduationDate || st.graduatedOn?.replace('Expected: ', '')}</span>
                          </div>
                        );
                      }
                      return (
                        <div className="font-bold text-emerald-800 flex items-center gap-1 text-[11px]">
                          <GraduationCap className="w-3.5 h-3.5" />
                          <span>Graduated On: {gradDisplay}</span>
                        </div>
                      );
                    })()}
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      onClick={() => setCertificateStudent(st)}
                      className="px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-950 border border-amber-300 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                    >
                      <Award className="w-3.5 h-3.5 text-amber-600" />
                      <span>Certificate</span>
                    </button>

                    <button
                      onClick={() => setTranscriptStudent(st)}
                      className="px-3 py-2 bg-purple-50 hover:bg-purple-100 text-purple-950 border border-purple-300 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                    >
                      <FileText className="w-3.5 h-3.5 text-purple-600" />
                      <span>Transcript</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SUB-TAB 5: TEACHER DELETION REQUESTS INBOX */}
      {activeSubTab === 'deletion_requests' && (
        <div className="space-y-4">
          <div className="p-4 bg-white rounded-xl border border-slate-200">
            <h2 className="text-sm font-bold text-slate-900">
              Teacher Content Deletion Permissions Inbox
            </h2>
            <p className="text-xs text-slate-500">
              Teachers cannot delete course content without administrator authorization. Review and approve or reject pending requests below.
            </p>
          </div>

          {deletionRequests.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-xl border border-slate-200 text-xs text-slate-400">
              No deletion requests submitted by teachers.
            </div>
          ) : (
            <div className="space-y-3">
              {deletionRequests.map((req) => (
                <div
                  key={req.id}
                  className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4 text-xs"
                >
                  <div className="space-y-1 max-w-xl">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] uppercase px-1.5 py-0.5 bg-slate-100 rounded font-semibold text-slate-700">
                        {req.targetType}
                      </span>
                      <span className="font-bold text-slate-900">{req.targetTitle}</span>
                      {req.courseCode && (
                        <span className="text-[11px] font-mono text-slate-500">
                          ({req.courseCode})
                        </span>
                      )}
                    </div>
                    <div className="text-slate-600">
                      Requested by <span className="font-semibold">{req.teacherName}</span> on{' '}
                      {new Date(req.requestedAt).toLocaleDateString()}
                    </div>
                    <div className="p-2 bg-slate-50 rounded border border-slate-200 text-slate-700 italic">
                      &quot;{req.reason}&quot;
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {req.status === 'pending' ? (
                      <>
                        <button
                          onClick={() => handleResolveDeletion(req.id, false)}
                          className="px-3 py-1.5 border border-slate-200 text-slate-700 hover:text-red-700 hover:bg-red-50 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                        >
                          Reject
                        </button>
                        <button
                          onClick={() => handleResolveDeletion(req.id, true)}
                          className="px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 transition-colors cursor-pointer"
                        >
                          Approve & Delete
                        </button>
                      </>
                    ) : (
                      <span
                        className={`font-semibold capitalize px-2 py-1 rounded text-xs ${
                          req.status === 'approved'
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-red-50 text-red-700'
                        }`}
                      >
                        {req.status}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* EDIT USER MODAL - FULL ACCESS FOR ADMIN (INCLUDING GRADUATED ON) */}
      {editingUser && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-xl w-full p-6 space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
                  ADMINISTRATIVE REGISTRY CONTROL
                </span>
                <h3 className="text-base font-bold text-slate-900">
                  Edit All User Details: {editingUser.name}
                </h3>
              </div>
              <button
                onClick={() => setEditingUser(null)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              {/* Role Selection */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Account Role
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['student', 'teacher', 'admin'] as const).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setEditRole(r)}
                      className={`py-1.5 px-2 text-xs font-semibold rounded-lg capitalize border transition-colors cursor-pointer ${
                        editRole === r
                          ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              {/* Name & Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Full Legal Name
                  </label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
                    required
                  />
                </div>
              </div>

              {/* Login ID & Password */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    {editRole === 'student' ? 'Student ID (Login Identifier)' : 'Staff Login ID'}
                  </label>
                  <input
                    type="text"
                    value={editLoginId}
                    onChange={(e) => setEditLoginId(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Password (Change / Override)
                  </label>
                  <input
                    type="text"
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    placeholder="Enter new password"
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 font-mono"
                    required
                  />
                </div>
              </div>

              {/* Department & Cohort */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Department
                  </label>
                  <input
                    type="text"
                    value={editDepartment}
                    onChange={(e) => setEditDepartment(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Cohort / Academic Year
                  </label>
                  <input
                    type="text"
                    value={editCohort}
                    onChange={(e) => setEditCohort(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
                  />
                </div>
              </div>

              {/* GRADUATED ON FIELD (MONTH AND YEAR) - SPECIFICALLY REQUIRED */}
              {editRole === 'student' && (
                <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <GraduationCap className="w-4 h-4 text-emerald-700" />
                      <span className="text-xs font-bold text-slate-900">
                        Graduation Record & Conferred Date
                      </span>
                    </div>
                    <span className="text-[11px] font-mono font-bold text-emerald-800">
                      {editGradStatus === 'graduated'
                        ? `Graduated On: ${editGradMonth} ${editGradYear}`
                        : editGradStatus === 'expected'
                        ? `Expected: ${editExpectedMonth} ${editExpectedYear}`
                        : 'Status: Not Graduated Yet'}
                    </span>
                  </div>

                  {/* 3-way Status Selector */}
                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 block mb-1.5">
                      Graduation Status
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setEditGradStatus('not_graduated')}
                        className={`py-2 px-2.5 rounded-lg text-xs font-semibold border transition-all text-center cursor-pointer ${
                          editGradStatus === 'not_graduated'
                            ? 'bg-amber-100 text-amber-900 border-amber-300 shadow-2xs font-bold'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <span>⏳ Not Graduated Yet</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditGradStatus('expected')}
                        className={`py-2 px-2.5 rounded-lg text-xs font-semibold border transition-all text-center cursor-pointer ${
                          editGradStatus === 'expected'
                            ? 'bg-blue-100 text-blue-900 border-blue-300 shadow-2xs font-bold'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <span>📅 Expected Date</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditGradStatus('graduated')}
                        className={`py-2 px-2.5 rounded-lg text-xs font-semibold border transition-all text-center cursor-pointer ${
                          editGradStatus === 'graduated'
                            ? 'bg-emerald-100 text-emerald-900 border-emerald-300 shadow-2xs font-bold'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <span>🎓 Graduated</span>
                      </button>
                    </div>
                  </div>

                  {/* If Not Graduated Yet */}
                  {editGradStatus === 'not_graduated' && (
                    <div className="p-2.5 bg-amber-50/80 rounded-lg border border-amber-200 text-xs text-amber-800">
                      Student is marked as active and not graduated yet. Transcripts, roster, and verification will reflect &quot;Not Graduated Yet&quot;.
                    </div>
                  )}

                  {/* If Expected Date */}
                  {editGradStatus === 'expected' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-blue-50/60 rounded-lg border border-blue-200">
                      <div>
                        <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                          Expected Graduation Month
                        </label>
                        <select
                          value={editExpectedMonth}
                          onChange={(e) => setEditExpectedMonth(e.target.value)}
                          className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg font-medium text-slate-900"
                        >
                          {MONTHS.map((m) => (
                            <option key={m} value={m}>
                              {m}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                          Expected Graduation Year
                        </label>
                        <select
                          value={editExpectedYear}
                          onChange={(e) => setEditExpectedYear(e.target.value)}
                          className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg font-mono font-medium text-slate-900"
                        >
                          {YEARS.map((y) => (
                            <option key={y} value={y}>
                              {y}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}

                  {/* If Graduated */}
                  {editGradStatus === 'graduated' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                      <div>
                        <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                          Conferred Graduation Month
                        </label>
                        <select
                          value={editGradMonth}
                          onChange={(e) => setEditGradMonth(e.target.value)}
                          className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg font-medium text-slate-900"
                        >
                          {MONTHS.map((m) => (
                            <option key={m} value={m}>
                              {m}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                          Conferred Graduation Year
                        </label>
                        <select
                          value={editGradYear}
                          onChange={(e) => setEditGradYear(e.target.value)}
                          className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg font-mono font-medium text-slate-900"
                        >
                          {YEARS.map((y) => (
                            <option key={y} value={y}>
                              {y}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2 pt-1 border-t border-emerald-200/60">
                    <div className="flex flex-wrap items-center justify-between gap-1">
                      <label className="text-[11px] font-semibold text-slate-700 block">
                        Qualification Title & Awarding Body
                      </label>
                      <span className="text-[10px] font-mono text-emerald-800 font-bold bg-emerald-100/70 px-2 py-0.5 rounded">
                        {editAwardingBody} · {editRegulatedBy}
                      </span>
                    </div>

                    {/* Preset quick buttons */}
                    <div className="flex flex-wrap gap-1.5 pb-1">
                      {QUAL_PRESETS.map((p) => (
                        <button
                          key={p.title}
                          type="button"
                          onClick={() => {
                            setEditQualTitle(p.title);
                            setEditAwardingBody(p.awardingBody);
                            setEditRegulatedBy(p.regulatedBy);
                          }}
                          className={`px-2 py-1 rounded-md text-[11px] font-semibold transition-all border cursor-pointer ${
                            editQualTitle === p.title
                              ? 'bg-slate-900 text-white border-slate-900 shadow-2xs font-bold'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          {p.title}
                        </button>
                      ))}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="sm:col-span-2">
                        <label className="text-[10px] font-mono uppercase text-slate-500 block mb-1">
                          Qualification Title
                        </label>
                        <input
                          type="text"
                          value={editQualTitle}
                          onChange={(e) => {
                            const val = e.target.value;
                            setEditQualTitle(val);
                            const lower = val.toLowerCase();
                            if (lower.includes('athe')) {
                              setEditAwardingBody('ATHE');
                              setEditRegulatedBy('Regulated by Ofqual');
                            } else if (
                              lower.includes('othm') ||
                              lower.includes('extended level 5') ||
                              lower.includes('level 4 extended level 5') ||
                              lower.includes('level 3') ||
                              lower.includes('level 4') ||
                              lower.includes('level 5') ||
                              lower.includes('level 6') ||
                              lower.includes('level 7')
                            ) {
                              setEditAwardingBody('OTHM');
                              setEditRegulatedBy('Regulated by Ofqual');
                            }
                          }}
                          placeholder="e.g. OTHM Level 4 or Extended Level 5 (240 Credit)"
                          className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg font-medium"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-mono uppercase text-slate-500 block mb-1">
                          Classification Grade
                        </label>
                        <select
                          value={editQualGrade}
                          onChange={(e) => setEditQualGrade(e.target.value)}
                          className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg font-medium"
                        >
                          <option value="First Class Honours (1st)">First Class Honours (1st)</option>
                          <option value="Second Class Honours, Upper (2:1)">Second Class Honours, Upper (2:1)</option>
                          <option value="Second Class Honours, Lower (2:2)">Second Class Honours, Lower (2:2)</option>
                          <option value="Third Class Honours (3rd)">Third Class Honours (3rd)</option>
                          <option value="Distinction">Distinction</option>
                          <option value="Merit">Merit</option>
                          <option value="Pass">Pass</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <div>
                        <label className="text-[10px] uppercase font-mono text-slate-500 block mb-0.5">
                          Awarding Body
                        </label>
                        <select
                          value={editAwardingBody}
                          onChange={(e) => {
                            const b = e.target.value;
                            setEditAwardingBody(b);
                            if (b === 'OTHM' || b === 'ATHE') {
                              setEditRegulatedBy('Regulated by Ofqual');
                            } else if (b === 'AT Academics') {
                              setEditRegulatedBy('AT Academics Academic Registry');
                            }
                          }}
                          className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg font-semibold text-slate-900"
                        >
                          <option value="OTHM">OTHM (Awarding body, Regulated by Ofqual)</option>
                          <option value="ATHE">ATHE (Awarding body, Regulated by Ofqual)</option>
                          <option value="AT Academics">AT Academics</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] uppercase font-mono text-slate-500 block mb-0.5">
                          Regulatory Authority
                        </label>
                        <input
                          type="text"
                          value={editRegulatedBy}
                          onChange={(e) => setEditRegulatedBy(e.target.value)}
                          placeholder="e.g. Regulated by Ofqual"
                          className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg font-mono text-emerald-800 font-medium"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Course Enrollments */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Enrolled / Assigned Courses
                </label>
                {courses.length === 0 ? (
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-500">
                    No courses available in catalog yet.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200 max-h-36 overflow-y-auto">
                    {courses.map((c) => {
                      const isChecked = editCourses.includes(c.code);
                      return (
                        <label
                          key={c.id}
                          className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer select-none"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleEditCourse(c.code)}
                            className="rounded border-slate-300 text-slate-900 focus:ring-0"
                          />
                          <span className="font-mono font-bold">{c.code}</span>
                          <span className="truncate text-slate-500 text-[11px]">{c.title}</span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Tuition Ledger (Students) in GBP (£) */}
              {editRole === 'student' && (
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <Receipt className="w-4 h-4 text-emerald-700" />
                      <span>Tuition Fee & Payment Adjustments (Admin Only) - GBP (£)</span>
                    </div>
                    <span className="text-[11px] font-mono text-slate-500">
                      Due: £{Math.max(0, editTotalTuition - editTuitionPaid).toLocaleString()}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] text-slate-600 block mb-1 font-mono">
                        TOTAL TUITION (£)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={editTotalTuition}
                        onChange={(e) => setEditTotalTuition(Number(e.target.value) || 0)}
                        className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg font-mono font-bold"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] text-slate-600 block mb-1 font-mono">
                        PAYMENT RECEIVED (£)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={editTuitionPaid}
                        onChange={(e) => setEditTuitionPaid(Number(e.target.value) || 0)}
                        className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg font-mono font-bold text-emerald-700"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-lg hover:bg-slate-800 transition-colors shadow-xs cursor-pointer"
                >
                  Save All Details
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADMIN-ONLY OFFICIAL DEGREE CERTIFICATE MODAL */}
      <OfficialCertificateModal
        student={certificateStudent}
        isOpen={Boolean(certificateStudent)}
        onClose={() => setCertificateStudent(null)}
        adminUser={currentUser}
      />

      {/* ADMIN-ONLY OFFICIAL ACADEMIC TRANSCRIPT MODAL */}
      <OfficialTranscriptModal
        student={transcriptStudent}
        isOpen={Boolean(transcriptStudent)}
        onClose={() => setTranscriptStudent(null)}
        adminUser={currentUser}
        courses={courses}
        submissions={submissions}
      />

      {/* COURSE PROGRESS STATS MODAL */}
      <StudentProgressStatsModal
        student={progressStatsStudent}
        isOpen={Boolean(progressStatsStudent)}
        onClose={() => setProgressStatsStudent(null)}
        courses={courses}
        submissions={submissions}
      />
    </div>
  );
};
