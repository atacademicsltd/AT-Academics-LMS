import React, { useState } from 'react';
import { Course, Department, User } from '../../types';
import {
  BookOpen,
  Plus,
  Search,
  Users,
  Clock,
  ArrowRight,
  Trash2,
  AlertCircle,
  ShieldAlert,
  CheckCircle2,
  Building2,
  GraduationCap,
  Sparkles,
  FileText,
  FileSpreadsheet,
  FileQuestion,
  Layers,
  ChevronRight,
  Filter,
  Edit2,
  X,
} from 'lucide-react';
import { StorageService } from '../../services/storage';

export const COURSE_LEVEL_PRESETS = [
  'OTHM Level 3',
  'OTHM Level 4',
  'Extended Level 5 (240 Credit)',
  'OTHM Level 6',
  'OTHM Level 7',
  'ATHE Level 3 diploma',
  'AT Academics Professional Diploma',
];

interface CourseListProps {
  courses: Course[];
  currentUser: User;
  onSelectCourse: (course: Course) => void;
  onRefreshCourses: () => void;
}

export const CourseList: React.FC<CourseListProps> = ({
  courses,
  currentUser,
  onSelectCourse,
  onRefreshCourses,
}) => {
  const [departments, setDepartments] = useState<Department[]>(() =>
    StorageService.getDepartments()
  );
  const [selectedDeptId, setSelectedDeptId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Creation Modals
  const [isAddDeptOpen, setIsAddDeptOpen] = useState(false);
  const [isAddProgramOpen, setIsAddProgramOpen] = useState(false);

  // New Department Form
  const [newDeptName, setNewDeptName] = useState('');
  const [newDeptCode, setNewDeptCode] = useState('');
  const [newDeptDesc, setNewDeptDesc] = useState('');
  const [newDeptHead, setNewDeptHead] = useState('');

  // New Program Form
  const [newProgTitle, setNewProgTitle] = useState('');
  const [newProgCode, setNewProgCode] = useState('');
  const [newProgDeptId, setNewProgDeptId] = useState(departments[0]?.id || 'dept-business');
  const [newProgLevel, setNewProgLevel] = useState('Undergraduate');
  const [newProgCredits, setNewProgCredits] = useState(30);
  const [newProgSchedule, setNewProgSchedule] = useState('Mon & Wed 10:00 - 12:00 GMT');
  const [newProgDesc, setNewProgDesc] = useState('');
  const [newProgAwardingBody, setNewProgAwardingBody] = useState('OTHM');
  const [newProgRegulatedBy, setNewProgRegulatedBy] = useState('Regulated by Ofqual');

  // Admin Edit Course / Program State
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editCode, setEditCode] = useState('');
  const [editDeptId, setEditDeptId] = useState('');
  const [editLevel, setEditLevel] = useState('');
  const [editCredits, setEditCredits] = useState(30);
  const [editSchedule, setEditSchedule] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editInstructorName, setEditInstructorName] = useState('');
  const [editInstructorEmail, setEditInstructorEmail] = useState('');
  const [editCoverImage, setEditCoverImage] = useState('');
  const [editAwardingBody, setEditAwardingBody] = useState('OTHM');
  const [editRegulatedBy, setEditRegulatedBy] = useState('Regulated by Ofqual');
  const [selectedAwardingBodyFilter, setSelectedAwardingBodyFilter] = useState('all');

  // Admin Edit Department State
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [editDeptName, setEditDeptName] = useState('');
  const [editDeptCode, setEditDeptCode] = useState('');
  const [editDeptHead, setEditDeptHead] = useState('');
  const [editDeptDesc, setEditDeptDesc] = useState('');

  // Deletion permission request for teachers
  const [teacherDeletionCourse, setTeacherDeletionCourse] = useState<Course | null>(null);
  const [deletionReason, setDeletionReason] = useState('');
  const [requestSentMsg, setRequestSentMsg] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Role-based course visibility:
  // Students ONLY see courses/programs they are enrolled in and saved in the system by admin
  const visibleCoursesBase =
    currentUser.role === 'student'
      ? courses.filter((c) => currentUser.coursesEnrolled.includes(c.code))
      : courses;

  const filteredCourses = visibleCoursesBase.filter((c) => {
    const matchesSearch =
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.instructorName.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesDept =
      selectedDeptId === 'all' ||
      c.departmentId === selectedDeptId ||
      c.department === departments.find((d) => d.id === selectedDeptId)?.name;

    const matchesAwardingBody =
      selectedAwardingBodyFilter === 'all' ||
      (selectedAwardingBodyFilter === 'AT Academics'
        ? c.awardingBody === 'AT Academics' || !c.awardingBody
        : c.awardingBody === selectedAwardingBodyFilter);

    return matchesSearch && matchesDept && matchesAwardingBody;
  });

  const handleCreateDepartment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeptName.trim() || !newDeptCode.trim()) return;

    StorageService.addDepartment({
      name: newDeptName.trim(),
      code: newDeptCode.trim().toUpperCase(),
      description: newDeptDesc.trim() || 'Academic faculty department at AT Academics LMS.',
      headOfDepartment: newDeptHead.trim() || 'Department Dean',
    });

    setDepartments(StorageService.getDepartments());
    setIsAddDeptOpen(false);
    setNewDeptName('');
    setNewDeptCode('');
    setNewDeptDesc('');
    setNewDeptHead('');
    setSuccessNotice('New department created successfully.');
    setTimeout(() => setSuccessNotice(null), 4000);
  };

  const handleCreateProgram = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProgTitle.trim() || !newProgCode.trim()) return;

    const targetDept = departments.find((d) => d.id === newProgDeptId) || departments[0];

    const body = newProgAwardingBody || 'OTHM';
    const reg =
      body === 'AT Academics'
        ? newProgRegulatedBy || 'AT Academics Academic Registry'
        : 'Regulated by Ofqual';

    StorageService.addCourse({
      code: newProgCode.trim().toUpperCase(),
      title: newProgTitle.trim(),
      programName: newProgTitle.trim(),
      department: targetDept.name,
      departmentId: targetDept.id,
      level: newProgLevel,
      awardingBody: body,
      regulatedBy: reg,
      instructorId: currentUser.id,
      instructorName: currentUser.name,
      instructorEmail: currentUser.email,
      semester: 'Academic Year 2026',
      credits: newProgCredits,
      description: newProgDesc.trim() || 'Comprehensive academic degree curriculum.',
      coverImage: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?q=80&w=1200&auto=format&fit=crop',
      capacity: 50,
      schedule: newProgSchedule,
    });

    setIsAddProgramOpen(false);
    setNewProgTitle('');
    setNewProgCode('');
    setNewProgDesc('');
    onRefreshCourses();
    setSuccessNotice('New program created successfully.');
    setTimeout(() => setSuccessNotice(null), 4000);
  };

  // Open Edit Course Modal
  const handleOpenEditCourse = (course: Course) => {
    setEditingCourse(course);
    setEditTitle(course.title);
    setEditCode(course.code);
    setEditDeptId(course.departmentId || departments.find((d) => d.name === course.department)?.id || departments[0]?.id || '');
    setEditLevel(course.level || 'Undergraduate');
    setEditCredits(course.credits || 30);
    setEditSchedule(course.schedule || 'Mon & Wed 10:00 - 12:00 GMT');
    setEditDesc(course.description || '');
    setEditInstructorName(course.instructorName || '');
    setEditInstructorEmail(course.instructorEmail || '');
    setEditCoverImage(course.coverImage || '');
    const currentBody = course.awardingBody || 'OTHM';
    setEditAwardingBody(currentBody);
    setEditRegulatedBy(
      course.regulatedBy ||
      (currentBody === 'AT Academics'
        ? 'AT Academics Academic Registry'
        : 'Regulated by Ofqual')
    );
  };

  // Save Edit Course
  const handleSaveEditCourse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCourse || !editTitle.trim() || !editCode.trim()) return;

    const targetDept = departments.find((d) => d.id === editDeptId);

    const body = editAwardingBody || 'OTHM';
    const reg =
      body === 'AT Academics'
        ? editRegulatedBy || 'AT Academics Academic Registry'
        : 'Regulated by Ofqual';

    StorageService.updateCourse(editingCourse.id, {
      title: editTitle.trim(),
      code: editCode.trim().toUpperCase(),
      department: targetDept ? targetDept.name : editingCourse.department,
      departmentId: targetDept ? targetDept.id : editingCourse.departmentId,
      level: editLevel.trim(),
      awardingBody: body,
      regulatedBy: reg,
      credits: Number(editCredits) || 30,
      schedule: editSchedule.trim(),
      description: editDesc.trim(),
      instructorName: editInstructorName.trim() || editingCourse.instructorName,
      instructorEmail: editInstructorEmail.trim() || editingCourse.instructorEmail,
      coverImage: editCoverImage.trim() || editingCourse.coverImage,
    });

    setEditingCourse(null);
    onRefreshCourses();
    setSuccessNotice(`Updated program details for ${editCode.trim().toUpperCase()} - ${editTitle.trim()}.`);
    setTimeout(() => setSuccessNotice(null), 4000);
  };

  // Open Edit Department Modal
  const handleOpenEditDept = (dept: Department) => {
    setEditingDept(dept);
    setEditDeptName(dept.name);
    setEditDeptCode(dept.code);
    setEditDeptHead(dept.headOfDepartment || '');
    setEditDeptDesc(dept.description || '');
  };

  // Save Edit Department
  const handleSaveEditDept = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDept || !editDeptName.trim() || !editDeptCode.trim()) return;

    StorageService.updateDepartment(editingDept.id, {
      name: editDeptName.trim(),
      code: editDeptCode.trim().toUpperCase(),
      headOfDepartment: editDeptHead.trim(),
      description: editDeptDesc.trim(),
    });

    setDepartments(StorageService.getDepartments());
    setEditingDept(null);
    onRefreshCourses();
    setSuccessNotice(`Department ${editDeptCode.trim().toUpperCase()} updated successfully.`);
    setTimeout(() => setSuccessNotice(null), 4000);
  };

  const handleDeleteCourse = (course: Course) => {
    if (currentUser.role === 'admin') {
      if (
        confirm(
          `ADMIN ACTION: Are you sure you want to permanently delete program "${course.code} - ${course.title}"?`
        )
      ) {
        StorageService.deleteCourseDirectly(course.id);
        onRefreshCourses();
      }
    } else if (currentUser.role === 'teacher') {
      // Teachers cannot delete directly; must request permission through LMS
      setTeacherDeletionCourse(course);
      setDeletionReason('');
    }
  };

  const handleSendDeletionRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!teacherDeletionCourse || !deletionReason.trim()) return;

    StorageService.submitDeletionRequest({
      teacherId: currentUser.id,
      teacherName: currentUser.name,
      targetType: 'course',
      targetId: teacherDeletionCourse.id,
      targetTitle: `${teacherDeletionCourse.code}: ${teacherDeletionCourse.title}`,
      courseCode: teacherDeletionCourse.code,
      reason: deletionReason.trim(),
    });

    setTeacherDeletionCourse(null);
    setRequestSentMsg(
      'Deletion request submitted to Administrator (Atikur Rahman). Content will remain active until approved.'
    );
    setTimeout(() => setRequestSentMsg(null), 5000);
  };

  const isStaff = currentUser.role === 'admin' || currentUser.role === 'teacher';

  return (
    <div className="space-y-6">
      {/* Top Banner / Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-slate-800" />
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              {currentUser.role === 'student'
                ? 'My Enrolled Academic Programs'
                : 'Academic Departments & Degree Programs'}
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {currentUser.role === 'student'
              ? 'Access study materials, lecture recordings, assignment briefs, and take evaluative quizzes.'
              : 'Organized hierarchically: select a Department to review available programs, study materials, and assessments.'}
          </p>
        </div>

        {/* Admin Action Buttons */}
        {currentUser.role === 'admin' && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsAddDeptOpen(true)}
              className="px-3 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors shadow-2xs"
            >
              <Building2 className="w-3.5 h-3.5 text-slate-600" />
              <span>+ New Department</span>
            </button>
            <button
              onClick={() => setIsAddProgramOpen(true)}
              className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ New Program</span>
            </button>
          </div>
        )}

        {currentUser.role === 'teacher' && (
          <button
            onClick={() => setIsAddProgramOpen(true)}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Add Program / Course</span>
          </button>
        )}
      </div>

      {successNotice && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successNotice}</span>
        </div>
      )}

      {requestSentMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{requestSentMsg}</span>
        </div>
      )}

      {/* DEPARTMENT VIEW (For Admin & Teacher): "First show Department" */}
      {isStaff && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-slate-700" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 font-mono">
                Academic Departments
              </h2>
            </div>
            <span className="text-[11px] text-slate-500 font-mono">
              Click a department to view its specific programs
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* "All Departments" Card */}
            <button
              onClick={() => setSelectedDeptId('all')}
              className={`p-3.5 rounded-xl border text-left transition-all ${
                selectedDeptId === 'all'
                  ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                  : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-900'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold uppercase ${
                    selectedDeptId === 'all'
                      ? 'bg-slate-800 text-slate-200'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  ALL FACULTIES
                </span>
                <span
                  className={`text-xs font-mono font-bold ${
                    selectedDeptId === 'all' ? 'text-slate-300' : 'text-slate-500'
                  }`}
                >
                  {courses.length} Programs
                </span>
              </div>
              <h3 className="text-xs font-bold leading-snug">All Academic Faculties</h3>
              <p
                className={`text-[11px] mt-1 line-clamp-2 ${
                  selectedDeptId === 'all' ? 'text-slate-300' : 'text-slate-500'
                }`}
              >
                Comprehensive catalog across all institutional disciplines.
              </p>
            </button>

            {/* Individual Departments */}
            {departments.map((dept) => {
              const count = courses.filter(
                (c) => c.departmentId === dept.id || c.department === dept.name
              ).length;
              const isSelected = selectedDeptId === dept.id;

              return (
                <div
                  key={dept.id}
                  onClick={() => setSelectedDeptId(dept.id)}
                  className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer relative group/card ${
                    isSelected
                      ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                      : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold ${
                        isSelected
                          ? 'bg-slate-800 text-slate-200'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {dept.code}
                    </span>

                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-xs font-mono font-bold ${
                          isSelected ? 'text-slate-300' : 'text-slate-500'
                        }`}
                      >
                        {count} {count === 1 ? 'Program' : 'Programs'}
                      </span>

                      {/* Admin Edit Department Button */}
                      {currentUser.role === 'admin' && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEditDept(dept);
                          }}
                          className={`p-1 rounded-md transition-colors ${
                            isSelected
                              ? 'text-slate-300 hover:text-white hover:bg-slate-800'
                              : 'text-slate-400 hover:text-slate-900 hover:bg-slate-200'
                          }`}
                          title="Edit Department"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                  <h3 className="text-xs font-bold leading-snug truncate" title={dept.name}>
                    {dept.name}
                  </h3>
                  <p
                    className={`text-[11px] mt-1 line-clamp-2 ${
                      isSelected ? 'text-slate-300' : 'text-slate-500'
                    }`}
                  >
                    {dept.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SEARCH AND FILTERS */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
        <div className="relative w-full sm:max-w-md">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search programs by code, title, or curriculum..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 font-medium"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto text-xs text-slate-500 shrink-0 font-mono">
          <span>
            Showing <strong className="text-slate-900 dark:text-white">{filteredCourses.length}</strong> of{' '}
            {visibleCoursesBase.length} Programs
          </span>
        </div>
      </div>

      {/* Awarding Body Filter Strip */}
      <div className="flex flex-wrap items-center gap-2 py-1">
        <span className="text-[11px] font-mono text-slate-500 uppercase tracking-wider">
          Awarding Body:
        </span>
        {['all', 'OTHM', 'ATHE', 'AT Academics'].map((body) => (
          <button
            key={body}
            type="button"
            onClick={() => setSelectedAwardingBodyFilter(body)}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all border cursor-pointer ${
              selectedAwardingBodyFilter === body
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white shadow-2xs font-bold'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/60'
            }`}
          >
            {body === 'all' ? 'All Awarding Bodies' : body}
          </button>
        ))}
      </div>

      {/* PROGRAMS LIST */}
      {filteredCourses.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 space-y-3">
          <BookOpen className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-slate-800">
            {courses.length === 0
              ? 'Course Catalog is Currently Blank'
              : currentUser.role === 'student'
              ? 'No Enrolled Programs Found'
              : 'No Degree Programs Match Selection'}
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {courses.length === 0
              ? 'All previous active courses have been cleared. Teachers and Administrators can publish fresh academic programs and courses anytime.'
              : currentUser.role === 'student'
              ? 'You are not currently enrolled in this department. Contact academic registry to verify course enrollments.'
              : 'No academic programs have been created under this selection yet. Admins and teachers can create new programs above.'}
          </p>
          {(currentUser.role === 'admin' || currentUser.role === 'teacher') && (
            <button
              onClick={() => setIsAddProgramOpen(true)}
              className="px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded-xl hover:bg-slate-800 shadow-xs cursor-pointer inline-flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Create First Program / Course</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredCourses.map((course) => {
            const materialCount = course.studyMaterials?.length || 0;
            const guideCount = course.assignmentGuides?.length || 0;
            const quizCount = course.quizzes?.length || 0;

            return (
              <div
                key={course.id}
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:border-slate-300 hover:shadow-md transition-all flex flex-col group"
              >
                {/* Image Cover */}
                <div className="h-36 relative overflow-hidden bg-slate-900">
                  <img
                    src={course.coverImage}
                    alt={course.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent" />

                  <div className="absolute top-3 left-3 flex flex-wrap items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded-md bg-slate-900/90 text-white text-[10px] font-mono font-bold tracking-wider backdrop-blur-xs border border-white/10">
                      {course.code}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-emerald-600/90 text-white text-[10px] font-mono font-bold tracking-wider backdrop-blur-xs border border-white/10">
                      {course.awardingBody || 'OTHM'}
                    </span>
                    {course.level && (
                      <span className="px-2 py-0.5 rounded-md bg-white/90 text-slate-900 text-[10px] font-semibold tracking-tight backdrop-blur-xs">
                        {course.level}
                      </span>
                    )}
                  </div>

                  {currentUser.role === 'admin' && (
                    <div className="absolute top-3 right-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenEditCourse(course);
                        }}
                        className="px-2 py-1 rounded-md bg-white/90 text-slate-900 hover:bg-white text-[11px] font-semibold flex items-center gap-1 shadow-sm backdrop-blur-xs transition-colors cursor-pointer"
                        title="Edit Course Name & Code (Admin)"
                      >
                        <Edit2 className="w-3 h-3 text-slate-700" />
                        <span>Edit</span>
                      </button>
                    </div>
                  )}

                  <div className="absolute bottom-3 left-3 right-3 text-white">
                    <span className="text-[10px] font-medium text-slate-300 block truncate">
                      {course.department}
                    </span>
                    <h3 className="text-sm font-bold truncate leading-tight">{course.title}</h3>
                  </div>
                </div>

                {/* Body Details */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-3 bg-white dark:bg-slate-900">
                  <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                    {course.description}
                  </p>

                  {/* Course Progress based on Module Completion for Students */}
                  {currentUser.role === 'student' && (() => {
                    const modProg = StorageService.getCourseModuleProgress(
                      currentUser.studentId || currentUser.loginId,
                      course.id
                    );
                    return (
                      <div className="space-y-1.5 bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                        <div className="flex items-center justify-between text-[11px] font-mono">
                          <span className="text-slate-600 dark:text-slate-400 font-medium">
                            Course Progress:
                          </span>
                          <span className="font-bold text-slate-900 dark:text-white">
                            {modProg.completedCount} / {modProg.totalModules} Modules ({modProg.progressPercent}%)
                          </span>
                        </div>
                        <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              modProg.progressPercent === 100 ? 'bg-emerald-600' : 'bg-slate-900 dark:bg-white'
                            }`}
                            style={{ width: `${modProg.progressPercent}%` }}
                          />
                        </div>
                      </div>
                    );
                  })()}

                  {/* Badges for study materials, briefs, quizzes */}
                  <div className="grid grid-cols-3 gap-1.5 py-2 border-y border-slate-100 dark:border-slate-800 text-center font-mono">
                    <div className="bg-slate-50 dark:bg-slate-800 p-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
                      <div className="flex items-center justify-center gap-1 text-[10px] text-slate-500 dark:text-slate-400">
                        <FileText className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                        <span>Materials</span>
                      </div>
                      <span className="text-xs font-bold text-slate-900 dark:text-white">{materialCount}</span>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-800 p-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
                      <div className="flex items-center justify-center gap-1 text-[10px] text-slate-500 dark:text-slate-400">
                        <FileSpreadsheet className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                        <span>Briefs</span>
                      </div>
                      <span className="text-xs font-bold text-slate-900 dark:text-white">{guideCount}</span>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-800 p-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
                      <div className="flex items-center justify-center gap-1 text-[10px] text-slate-500 dark:text-slate-400">
                        <Sparkles className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                        <span>Quizzes</span>
                      </div>
                      <span className="text-xs font-bold text-slate-900 dark:text-white">{quizCount}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                    <span className="truncate">Modules: <strong className="text-slate-800 dark:text-slate-200">{course.modules?.length || 0} Units</strong></span>
                    <span>{course.credits} Credits</span>
                  </div>

                  {/* Actions */}
                  <div className="pt-1 flex items-center justify-between gap-2">
                    <button
                      onClick={() => onSelectCourse(course)}
                      className="flex-1 py-2 px-3 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
                    >
                      <span>{currentUser.role === 'student' ? 'Study Course' : 'Manage Program'}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>

                    {currentUser.role === 'admin' && (
                      <button
                        onClick={() => handleDeleteCourse(course)}
                        className="p-2 border border-slate-200 hover:border-red-300 text-slate-400 hover:text-red-600 rounded-xl hover:bg-red-50 transition-colors"
                        title="Delete Program"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}

                    {currentUser.role === 'teacher' && (
                      <button
                        onClick={() => handleDeleteCourse(course)}
                        className="p-2 border border-slate-200 hover:border-amber-300 text-slate-400 hover:text-amber-600 rounded-xl hover:bg-amber-50 transition-colors"
                        title="Request Deletion Permission from Admin"
                      >
                        <ShieldAlert className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ADMIN EDIT COURSE / PROGRAM MODAL */}
      {editingCourse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white max-w-lg w-full rounded-2xl shadow-xl border border-slate-200 p-5 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-slate-800" />
                <div>
                  <h2 className="text-sm font-bold text-slate-900">
                    Edit Course / Program Details (Admin)
                  </h2>
                  <p className="text-[11px] text-slate-500">
                    Full administrator authorization to modify course name, code, department, and curriculum.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingCourse(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditCourse} className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Course / Program Name
                  </label>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 font-medium"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Course Code
                  </label>
                  <input
                    type="text"
                    value={editCode}
                    onChange={(e) => setEditCode(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 font-mono font-bold"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Department
                </label>
                <select
                  value={editDeptId}
                  onChange={(e) => setEditDeptId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 font-medium"
                >
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700">
                    Degree / Qualification Level
                  </label>
                  <span className="text-[10px] font-mono text-emerald-700 font-bold">
                    {editLevel.toLowerCase().includes('athe') ? 'ATHE · Regulated by Ofqual' : 'OTHM · Regulated by Ofqual'}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1 mb-1.5">
                  {COURSE_LEVEL_PRESETS.map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setEditLevel(lvl)}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border cursor-pointer ${
                        editLevel === lvl
                          ? 'bg-slate-900 text-white border-slate-900 font-bold'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <input
                      type="text"
                      value={editLevel}
                      onChange={(e) => setEditLevel(e.target.value)}
                      placeholder="e.g. OTHM Level 4, Extended Level 5, or AT Academics Diploma"
                      className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-medium"
                    />
                  </div>
                  <div>
                    <input
                      type="number"
                      value={editCredits}
                      onChange={(e) => setEditCredits(Number(e.target.value) || 30)}
                      placeholder="Credits"
                      className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Awarding Body & Regulatory Authority */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Awarding Body
                  </label>
                  <select
                    value={editAwardingBody}
                    onChange={(e) => {
                      const val = e.target.value;
                      setEditAwardingBody(val);
                      if (val === 'OTHM' || val === 'ATHE') {
                        setEditRegulatedBy('Regulated by Ofqual');
                      } else if (val === 'AT Academics') {
                        setEditRegulatedBy('AT Academics Academic Registry');
                      }
                    }}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-semibold text-slate-900 dark:text-white"
                  >
                    <option value="OTHM">OTHM (Regulated by Ofqual)</option>
                    <option value="ATHE">ATHE (Regulated by Ofqual)</option>
                    <option value="AT Academics">AT Academics (Internal Institutional Awarding Body)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Regulatory Authority
                  </label>
                  <input
                    type="text"
                    value={editRegulatedBy}
                    onChange={(e) => setEditRegulatedBy(e.target.value)}
                    placeholder="e.g. Regulated by Ofqual"
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono text-emerald-800 dark:text-emerald-400 font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Instructor Name
                  </label>
                  <input
                    type="text"
                    value={editInstructorName}
                    onChange={(e) => setEditInstructorName(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Instructor Email
                  </label>
                  <input
                    type="email"
                    value={editInstructorEmail}
                    onChange={(e) => setEditInstructorEmail(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Schedule (GMT)
                </label>
                <input
                  type="text"
                  value={editSchedule}
                  onChange={(e) => setEditSchedule(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Cover Image URL
                </label>
                <input
                  type="text"
                  value={editCoverImage}
                  onChange={(e) => setEditCoverImage(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Curriculum Overview & Description
                </label>
                <textarea
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingCourse(null)}
                  className="px-3.5 py-2 border border-slate-200 text-xs font-medium text-slate-600 rounded-xl hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-slate-900 text-white text-xs font-semibold rounded-xl hover:bg-slate-800 transition-colors shadow-2xs"
                >
                  Save Changes (Admin)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADMIN EDIT DEPARTMENT MODAL */}
      {editingDept && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white max-w-md w-full rounded-2xl shadow-xl border border-slate-200 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-slate-800" />
                <h2 className="text-sm font-bold text-slate-900">
                  Edit Department Details (Admin)
                </h2>
              </div>
              <button
                onClick={() => setEditingDept(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditDept} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Department Name
                </label>
                <input
                  type="text"
                  value={editDeptName}
                  onChange={(e) => setEditDeptName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Code / Acronym
                  </label>
                  <input
                    type="text"
                    value={editDeptCode}
                    onChange={(e) => setEditDeptCode(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Head of Department
                  </label>
                  <input
                    type="text"
                    value={editDeptHead}
                    onChange={(e) => setEditDeptHead(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Department Overview
                </label>
                <textarea
                  value={editDeptDesc}
                  onChange={(e) => setEditDeptDesc(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingDept(null)}
                  className="px-3 py-1.5 border border-slate-200 text-xs font-medium text-slate-600 rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-lg hover:bg-slate-800"
                >
                  Save Department
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TEACHER DELETION PERMISSION MODAL */}
      {teacherDeletionCourse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white max-w-md w-full rounded-2xl shadow-xl border border-slate-200 p-5 space-y-4">
            <div className="flex items-center gap-2.5 text-amber-700">
              <ShieldAlert className="w-5 h-5 shrink-0" />
              <h3 className="text-sm font-bold text-slate-900">
                Institutional Deletion Authorization Required
              </h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Teachers cannot delete degree programs without administrative clearance. Submit a request to Administrator Atikur Rahman:
            </p>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono">
              Target: {teacherDeletionCourse.code} - {teacherDeletionCourse.title}
            </div>
            <form onSubmit={handleSendDeletionRequest} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Reason for Deletion
                </label>
                <textarea
                  value={deletionReason}
                  onChange={(e) => setDeletionReason(e.target.value)}
                  placeholder="Provide academic justification..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
                  rows={3}
                  required
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setTeacherDeletionCourse(null)}
                  className="px-3 py-1.5 border border-slate-200 text-xs font-medium text-slate-700 rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-lg hover:bg-slate-800"
                >
                  Submit Request to Admin
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE DEPARTMENT MODAL (Admin Only) */}
      {isAddDeptOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white max-w-md w-full rounded-2xl shadow-xl border border-slate-200 p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-slate-800" />
              <h2 className="text-sm font-bold text-slate-900">
                Create Academic Department
              </h2>
            </div>
            <form onSubmit={handleCreateDepartment} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Department Name
                </label>
                <input
                  type="text"
                  value={newDeptName}
                  onChange={(e) => setNewDeptName(e.target.value)}
                  placeholder="e.g. Department of Law & Legal Studies"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Code / Acronym
                  </label>
                  <input
                    type="text"
                    value={newDeptCode}
                    onChange={(e) => setNewDeptCode(e.target.value)}
                    placeholder="e.g. LAW"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Head of Department
                  </label>
                  <input
                    type="text"
                    value={newDeptHead}
                    onChange={(e) => setNewDeptHead(e.target.value)}
                    placeholder="e.g. Dr. M. Thorne"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Department Overview
                </label>
                <textarea
                  value={newDeptDesc}
                  onChange={(e) => setNewDeptDesc(e.target.value)}
                  placeholder="Overview of disciplines, research clusters, and degrees..."
                  rows={2}
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddDeptOpen(false)}
                  className="px-3 py-1.5 border border-slate-200 text-xs font-medium text-slate-600 rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-lg hover:bg-slate-800"
                >
                  Save Department
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE PROGRAM MODAL */}
      {isAddProgramOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white max-w-lg w-full rounded-2xl shadow-xl border border-slate-200 p-5 space-y-4">
            <div className="flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-slate-800" />
              <h2 className="text-sm font-bold text-slate-900">
                Create Degree Program / Course
              </h2>
            </div>

            <form onSubmit={handleCreateProgram} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Parent Department
                </label>
                <select
                  value={newProgDeptId}
                  onChange={(e) => setNewProgDeptId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 font-medium"
                >
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Program Title
                  </label>
                  <input
                    type="text"
                    value={newProgTitle}
                    onChange={(e) => setNewProgTitle(e.target.value)}
                    placeholder="e.g. Cyber Security"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 font-medium"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Program Code
                  </label>
                  <input
                    type="text"
                    value={newProgCode}
                    onChange={(e) => setNewProgCode(e.target.value)}
                    placeholder="e.g. CS-202"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 font-mono"
                    required
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700 block">
                    Degree / Qualification Level
                  </label>
                  <span className="text-[10px] font-mono text-emerald-700 font-bold">
                    {newProgLevel.toLowerCase().includes('athe') ? 'ATHE · Regulated by Ofqual' : 'OTHM · Regulated by Ofqual'}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1 mb-1.5">
                  {COURSE_LEVEL_PRESETS.map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => {
                        setNewProgLevel(lvl);
                        if (lvl.includes('240 Credit')) {
                          setNewProgCredits(240);
                        } else if (lvl.includes('Level 6') || lvl.includes('Level 7')) {
                          setNewProgCredits(120);
                        }
                      }}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border cursor-pointer ${
                        newProgLevel === lvl
                          ? 'bg-slate-900 text-white border-slate-900 font-bold'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <input
                      type="text"
                      value={newProgLevel}
                      onChange={(e) => setNewProgLevel(e.target.value)}
                      placeholder="e.g. OTHM Level 4, Extended Level 5, or AT Academics Diploma"
                      className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <input
                      type="number"
                      value={newProgCredits}
                      onChange={(e) => setNewProgCredits(Number(e.target.value) || 30)}
                      placeholder="Credits (e.g. 120, 240)"
                      className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Awarding Body & Regulatory Authority */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Awarding Body
                  </label>
                  <select
                    value={newProgAwardingBody}
                    onChange={(e) => {
                      const val = e.target.value;
                      setNewProgAwardingBody(val);
                      if (val === 'OTHM' || val === 'ATHE') {
                        setNewProgRegulatedBy('Regulated by Ofqual');
                      } else if (val === 'AT Academics') {
                        setNewProgRegulatedBy('AT Academics Academic Registry');
                      }
                    }}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-semibold text-slate-900 dark:text-white"
                  >
                    <option value="OTHM">OTHM (Regulated by Ofqual)</option>
                    <option value="ATHE">ATHE (Regulated by Ofqual)</option>
                    <option value="AT Academics">AT Academics (Internal Institutional Awarding Body)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Regulatory Authority
                  </label>
                  <input
                    type="text"
                    value={newProgRegulatedBy}
                    onChange={(e) => setNewProgRegulatedBy(e.target.value)}
                    placeholder="e.g. Regulated by Ofqual"
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono text-emerald-800 dark:text-emerald-400 font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Schedule (GMT)
                </label>
                <input
                  type="text"
                  value={newProgSchedule}
                  onChange={(e) => setNewProgSchedule(e.target.value)}
                  placeholder="e.g. Mon & Wed 10:00 - 12:00 GMT"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Program Curriculum Description
                </label>
                <textarea
                  value={newProgDesc}
                  onChange={(e) => setNewProgDesc(e.target.value)}
                  placeholder="Overview of curriculum aims, learning outcomes, and technical syllabus..."
                  rows={2}
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddProgramOpen(false)}
                  className="px-3 py-1.5 border border-slate-200 text-xs font-medium text-slate-600 rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-lg hover:bg-slate-800"
                >
                  Publish Program
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
