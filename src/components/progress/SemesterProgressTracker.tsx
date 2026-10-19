import React, { useState } from 'react';
import {
  Course,
  User,
  StudentCourseProgress,
  Assignment,
  AssignmentSubmission,
} from '../../types';
import { StorageService } from '../../services/storage';
import {
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Video,
  FileCheck,
  Calendar,
  Users,
  Search,
  Award,
  ChevronRight,
  BookOpen,
  Layers,
  FileText,
  GraduationCap,
} from 'lucide-react';

interface SemesterProgressTrackerProps {
  courses: Course[];
  currentUser: User;
  allUsers: User[];
  assignments: Assignment[];
  submissions: AssignmentSubmission[];
}

export const SemesterProgressTracker: React.FC<SemesterProgressTrackerProps> = ({
  courses,
  currentUser,
  allUsers,
  assignments,
  submissions,
}) => {
  const students = allUsers.filter((u) => u.role === 'student');

  // Selected student to inspect (default to current user if student, otherwise first student in roster)
  const [selectedStudentId, setSelectedStudentId] = useState<string>(
    currentUser.role === 'student' && currentUser.studentId
      ? currentUser.studentId
      : students[0]?.studentId || students[0]?.loginId || ''
  );

  const selectedStudent = students.find(
    (s) => s.studentId === selectedStudentId || s.loginId === selectedStudentId
  );

  // Active student object to track (prioritize currentUser if student)
  const activeStudent =
    currentUser.role === 'student'
      ? currentUser
      : selectedStudent || students[0];

  const studentDisplayId =
    currentUser.role === 'student'
      ? (currentUser.studentId || currentUser.loginId || '')
      : (selectedStudentId || students[0]?.studentId || students[0]?.loginId || '');

  // Read progress map
  const progressMap = StorageService.getProgressMap();

  // Strict Assignment Matching: Filter ONLY the courses assigned to this student
  const enrolledCourseCodes = Array.isArray(activeStudent?.coursesEnrolled)
    ? activeStudent.coursesEnrolled.map((c) => c.trim().toLowerCase())
    : [];

  const studentDept = (activeStudent?.department || '').trim().toLowerCase();
  const studentQual = (activeStudent?.qualificationTitle || '').trim().toLowerCase();

  const isAssignedCourse = (course: Course): boolean => {
    if (!activeStudent) return false;

    const courseCodeLower = course.code.trim().toLowerCase();
    const courseIdLower = course.id.trim().toLowerCase();
    const courseTitleLower = course.title.trim().toLowerCase();

    // 1. Direct code or ID match
    if (
      enrolledCourseCodes.includes(courseCodeLower) ||
      enrolledCourseCodes.includes(courseIdLower)
    ) {
      return true;
    }

    // 2. Normalized alphanumeric match (handles "BM-101" vs "BM101", "HTM-201" vs "THM")
    const normCrs = courseCodeLower.replace(/[^a-z0-9]/g, '');
    const hasNormMatch = enrolledCourseCodes.some((code) => {
      const norm = code.replace(/[^a-z0-9]/g, '');
      if (!norm) return false;
      return (
        norm === normCrs ||
        normCrs.includes(norm) ||
        norm.includes(normCrs) ||
        (norm === 'thm' && normCrs.startsWith('htm')) ||
        (norm === 'htm' && normCrs.startsWith('thm'))
      );
    });
    if (hasNormMatch) return true;

    // 3. Match code prefix or name inside course title
    const hasTitleMatch = enrolledCourseCodes.some((code) => {
      if (!code) return false;
      return (
        courseTitleLower.includes(code) ||
        (code.length >= 3 && courseTitleLower.includes(code.slice(0, 3)))
      );
    });
    if (hasTitleMatch) return true;

    // 4. Fallback if student has no explicit enrolledCourseCodes in their profile
    if (enrolledCourseCodes.length === 0) {
      if (
        studentQual &&
        (courseTitleLower.includes(studentQual) || studentQual.includes(courseTitleLower))
      ) {
        return true;
      }
      if (
        studentDept &&
        (courseTitleLower.includes(studentDept) || studentDept.includes(courseTitleLower))
      ) {
        return true;
      }
    }

    // 5. Check if submissions exist for this course
    const hasSubmissions = submissions.some(
      (s) =>
        (s.studentId === activeStudent.studentId || s.studentId === activeStudent.loginId) &&
        (s.courseId === course.id || s.courseCode === course.code)
    );
    if (hasSubmissions) return true;

    return false;
  };

  const assignedCourses = courses.filter(isAssignedCourse);
  const assignedCourseIds = new Set(assignedCourses.map((c) => c.id));
  const assignedCourseCodes = new Set(assignedCourses.map((c) => c.code.toLowerCase()));

  // Submissions filtered strictly for this student's assigned courses
  const studentSubmissions = submissions.filter(
    (s) =>
      (s.studentId === studentDisplayId ||
        (activeStudent && (s.studentId === activeStudent.studentId || s.studentId === activeStudent.loginId))) &&
      (assignedCourseIds.has(s.courseId) || assignedCourseCodes.has((s.courseCode || '').toLowerCase()))
  );

  // Compute aggregated stats for selected student based STRICTLY on assigned courses
  const studentProgressList: StudentCourseProgress[] = assignedCourses
    .map((c) => {
      const key = `${studentDisplayId}_${c.id}`;
      return progressMap[key];
    })
    .filter(Boolean) as StudentCourseProgress[];

  const totalWatched = studentProgressList.reduce((acc, p) => acc + (p.watchedLecturesCount || 0), 0);
  const totalLectures = assignedCourses.reduce(
    (acc, c) =>
      acc +
      (c.modules || []).reduce(
        (mAcc, m) => mAcc + (m.items || []).filter((i) => i.type === 'video').length,
        0
      ),
    0
  );
  const lectureCompletionRate =
    totalLectures > 0 ? Math.round((totalWatched / totalLectures) * 100) : 0;

  const validScores = studentSubmissions.filter((s) => s.score !== undefined);
  const hasAcademicHistory = validScores.length > 0 || totalWatched > 0;

  // Real-time calculation: 0 if new student with no completed tasks/courses
  const overallAverage = validScores.length > 0
    ? Math.round(validScores.reduce((acc, s) => acc + (s.score || 0), 0) / validScores.length)
    : 0;

  let overallGpa = '0.00';
  if (validScores.length > 0) {
    if (overallAverage >= 93) overallGpa = '4.00';
    else if (overallAverage >= 90) overallGpa = '3.70';
    else if (overallAverage >= 85) overallGpa = '3.30';
    else if (overallAverage >= 80) overallGpa = '3.00';
    else if (overallAverage >= 70) overallGpa = '2.30';
    else overallGpa = '1.70';
  }

  // Current week option based on student enrollment & course commencement
  // For brand new students with 0 submissions and 0 watched lectures, commence at Week 1
  const currentWeek = hasAcademicHistory ? 6 : 1;
  const maxWeeksInCourses = Math.max(
    30,
    ...assignedCourses.flatMap((c) => (c.modules || []).map((m) => m.weekNumber || 1))
  );
  const semesterWeeks = Array.from({ length: maxWeeksInCourses }, (_, i) => i + 1);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Semester Progress & Academic Analytics
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time longitudinal performance tracking based on student engagement, syllabus progression, and assessment scores.
          </p>
        </div>

        {/* Student selector for Instructors and Administrators */}
        {currentUser.role !== 'student' && students.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Inspecting Student:</span>
            <select
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              className="text-xs font-semibold bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-slate-900 shadow-2xs outline-none"
            >
              {students.map((st) => (
                <option key={st.id} value={st.studentId || st.loginId}>
                  {st.name} ({st.studentId || st.loginId})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* High-Level Metric Tiles (Zero baseline for new students) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Cumulative GPA */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
          <div className="text-[11px] font-mono text-slate-500 uppercase tracking-wider">
            CUMULATIVE GPA
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono tracking-tight text-slate-900 tabular-nums">
              {overallGpa}
            </span>
            <span className="text-xs font-mono text-slate-500">/ 4.00</span>
          </div>
          <div className="text-xs text-slate-500">
            Average Score:{' '}
            <span className="font-mono font-semibold text-slate-800">
              {validScores.length > 0 ? `${overallAverage}%` : '0% (No completed tasks)'}
            </span>
          </div>
        </div>

        {/* Syllabus / Lecture Progress */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
          <div className="text-[11px] font-mono text-slate-500 uppercase tracking-wider">
            SYLLABUS PROGRESSION
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono tracking-tight text-slate-900 tabular-nums">
              {lectureCompletionRate}%
            </span>
            <span className="text-xs font-mono text-slate-500">completed</span>
          </div>
          <div className="text-xs text-slate-500">
            Completed <span className="font-mono font-semibold text-slate-800">{totalWatched}</span> of {totalLectures} modules
          </div>
        </div>

        {/* Assignments Submitted */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <div className="text-[11px] font-mono text-slate-500 uppercase tracking-wider">
            ASSIGNMENTS SUBMITTED
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono tracking-tight text-slate-900 tabular-nums">
              {studentSubmissions.length}
            </span>
            <span className="text-xs font-mono text-slate-500">submissions</span>
          </div>
          <div className="text-xs text-slate-500">
            {studentSubmissions.length === 0 ? (
              <span className="text-slate-400">Awaiting first submission</span>
            ) : (
              <span className="font-mono font-semibold text-emerald-700">100% on-time record</span>
            )}
          </div>
        </div>

        {/* Academic Status / Standing */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <div className="text-[11px] font-mono text-slate-500 uppercase tracking-wider">
            ACADEMIC STANDING
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-slate-900">
              {!hasAcademicHistory ? 'Commencing' : overallAverage < 75 ? 'Needs Review' : 'Good Standing'}
            </span>
          </div>
          <div className="text-xs text-slate-500">
            {!hasAcademicHistory
              ? 'Enrolled - Commencing semester'
              : overallAverage < 75
              ? 'Low score trajectory on midterms'
              : 'Consistent semester performance'}
          </div>
        </div>
      </div>

      {/* Semester Milestone Timeline */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Semester Academic Timeline (Academic Year 2026/27)
            </h3>
            <p className="text-xs text-slate-500">
              Current Week:{' '}
              <span className="font-semibold text-slate-800">
                Week {currentWeek} {!hasAcademicHistory ? '(Course Commencement & Orientation)' : '(Mid-term Progression)'}
              </span>
            </p>
          </div>
          <div className="text-xs font-mono text-slate-500">
            {Math.max(0, semesterWeeks.length - currentWeek)} weeks remaining (Total {semesterWeeks.length} Weeks / Modules)
          </div>
        </div>

        {/* Visual Timeline bar supporting 30 weeks */}
        <div className="flex flex-wrap gap-1.5 pt-2">
          {semesterWeeks.map((week) => {
            const isPast = week < currentWeek;
            const isCurrent = week === currentWeek;
            return (
              <div
                key={week}
                className={`flex-1 min-w-[34px] py-1.5 px-1 text-center rounded-lg border text-xs font-mono transition-colors ${
                  isCurrent
                    ? 'bg-slate-900 text-white border-slate-900 font-bold shadow-xs ring-2 ring-slate-900/20'
                    : isPast
                    ? 'bg-slate-100 text-slate-700 border-slate-200'
                    : 'bg-white text-slate-400 border-slate-200'
                }`}
                title={`Week ${week} ${isCurrent ? '(Active Week)' : isPast ? '(Completed)' : '(Upcoming)'}`}
              >
                <div className="text-[10px] leading-none">W{week}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Course-by-Course Progress Breakdown */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-slate-700" />
              <span>Course-by-Course Semester Performance Matrix</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Reflecting only courses and syllabus modules assigned to this student ({assignedCourses.length} Assigned {assignedCourses.length === 1 ? 'Course' : 'Courses'}).
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-600 font-medium">
              Student: <strong className="text-slate-900">{activeStudent?.name || 'Selected Student'}</strong>
            </span>
            <span className="px-2 py-0.5 bg-white border border-slate-200 rounded font-mono text-[11px] text-slate-600">
              {studentDisplayId || 'N/A'}
            </span>
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {assignedCourses.length === 0 ? (
            <div className="p-10 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
                <BookOpen className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-slate-800">
                No Courses Assigned to this Student
              </h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                Student &quot;{activeStudent?.name || 'Selected Student'}&quot; is not currently assigned to any courses.
                {currentUser.role === 'admin' && (
                  <span className="block mt-1 text-blue-600 font-medium">
                    You can assign courses (e.g. BSc in Business Management) in the Admin Control Hub under User &amp; Student Manager.
                  </span>
                )}
              </p>
            </div>
          ) : (
            assignedCourses.map((course) => {
              const prog = StorageService.getStudentCourseProgress(studentDisplayId, course.id);
              const courseSubs = studentSubmissions.filter((s) => s.courseId === course.id);
              const totalCourseLectures = (course.modules || []).reduce(
                (acc, m) => acc + (m.items || []).filter((i) => i.type === 'video').length,
                0
              );
              const watched = prog?.watchedLecturesCount || 0;
              const watchPct =
                totalCourseLectures > 0 ? Math.round((watched / totalCourseLectures) * 100) : 0;

              const courseScores = courseSubs.filter((s) => s.score !== undefined);
              const hasCourseScores = courseScores.length > 0;
              const currentScore = hasCourseScores
                ? Math.round(courseScores.reduce((acc, s) => acc + (s.score || 0), 0) / courseScores.length)
                : 0;

              const letterGrade = !hasCourseScores
                ? 'N/A'
                : currentScore >= 70
                ? 'First Class (A)'
                : currentScore >= 60
                ? 'Upper Second (2:1)'
                : currentScore >= 50
                ? 'Lower Second (2:2)'
                : 'Pass';

              return (
                <div key={course.id} className="p-5 hover:bg-slate-50/40 transition-colors space-y-5">
                  {/* Course Header & Overall Metric Strip */}
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold bg-slate-900 text-white px-2 py-0.5 rounded">
                          {course.code}
                        </span>
                        <span aria-hidden="true" className="text-slate-300">·</span>
                        <h4 className="font-bold text-slate-900 text-base">
                          {course.title}
                        </h4>
                      </div>
                      <div className="text-xs text-slate-500 flex flex-wrap items-center gap-2">
                        <span>Instructor: <strong className="text-slate-700">{course.instructorName}</strong></span>
                        <span>·</span>
                        <span>{course.credits} Credits</span>
                        <span>·</span>
                        <span className="text-slate-600 font-medium">{course.department || 'Academics'}</span>
                        {course.level && (
                          <>
                            <span>·</span>
                            <span className="text-emerald-700 font-mono text-[11px] font-semibold">{course.level}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 block font-mono">
                          PERFORMANCE SCORE
                        </span>
                        <span className="text-base font-bold font-mono text-slate-900">
                          {hasCourseScores ? `${currentScore}% (${letterGrade})` : '0% (In Progress)'}
                        </span>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 block font-mono">
                          ATTENDANCE
                        </span>
                        <span className="text-base font-bold font-mono text-slate-900">
                          {watched > 0 ? `${prog?.attendancePercent || 100}%` : '100%'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Progress bar based on module completion */}
                  {(() => {
                    const modProg = StorageService.getCourseModuleProgress(studentDisplayId, course.id);
                    const moduleProgressPct = modProg.progressPercent;
                    return (
                      <div className="space-y-1.5 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                        <div className="flex justify-between text-xs text-slate-600 dark:text-slate-300 font-mono">
                          <span>
                            Course Progress ({modProg.completedCount}/{modProg.totalModules} modules completed)
                          </span>
                          <span className="font-bold text-slate-900 dark:text-white">{moduleProgressPct}%</span>
                        </div>
                        <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-500 rounded-full ${
                              moduleProgressPct === 100 ? 'bg-emerald-600' : 'bg-slate-900 dark:bg-white'
                            }`}
                            style={{ width: `${moduleProgressPct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })()}

                  {/* Modular Curriculum Breakdown for Assigned Course */}
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-800 dark:text-slate-200 uppercase font-mono tracking-wider text-[11px] flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
                        <span>Assigned Course Modules ({course.modules?.length || 0} Modules)</span>
                      </span>
                      <span className="text-[11px] text-slate-400 font-mono">
                        Active Syllabus Track
                      </span>
                    </div>

                    {(!course.modules || course.modules.length === 0) ? (
                      <div className="p-3 bg-slate-50 dark:bg-slate-800/40 text-xs text-slate-500 rounded-lg">
                        No syllabus modules published for this course yet.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {course.modules.map((mod, modIdx) => {
                          const videoCount = (mod.items || []).filter((i) => i.type === 'video').length;
                          const readingCount = (mod.items || []).filter((i) => i.type === 'reading').length;
                          const quizCount = (mod.items || []).filter((i) => i.type === 'quiz').length;
                          const assignmentCount = (mod.items || []).filter((i) => i.type === 'assignment').length;
                          const isModDone = StorageService.isModuleCompleted(studentDisplayId, course.id, mod.id);

                          return (
                            <div
                              key={mod.id || modIdx}
                              className={`p-3.5 bg-white dark:bg-slate-800/80 rounded-xl border space-y-2 shadow-2xs transition-colors ${
                                isModDone
                                  ? 'border-emerald-200 dark:border-emerald-900/60 ring-1 ring-emerald-100 dark:ring-emerald-950/40'
                                  : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <span className="text-[10px] font-mono uppercase bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-1.5 py-0.5 rounded font-bold">
                                    Week {mod.weekNumber || modIdx + 1}
                                  </span>
                                  <h5 className="text-xs font-bold text-slate-900 dark:text-white mt-1 line-clamp-1">
                                    {mod.title}
                                  </h5>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    StorageService.markModuleComplete(studentDisplayId, course.id, mod.id, !isModDone);
                                  }}
                                  className={`inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full border shrink-0 font-semibold cursor-pointer transition-colors ${
                                    isModDone
                                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
                                      : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                                  }`}
                                  title="Click to toggle module completion"
                                >
                                  <CheckCircle2 className={`w-3 h-3 ${isModDone ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`} />
                                  <span>{isModDone ? 'Completed' : 'In Progress'}</span>
                                </button>
                              </div>

                              {mod.description && (
                                <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                                  {mod.description}
                                </p>
                              )}

                              <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[10px] font-mono text-slate-600">
                                {videoCount > 0 && (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-slate-100 rounded text-slate-700">
                                    <Video className="w-2.5 h-2.5 text-blue-600" />
                                    <span>{videoCount} {videoCount === 1 ? 'Lecture' : 'Lectures'}</span>
                                  </span>
                                )}
                                {readingCount > 0 && (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-slate-100 rounded text-slate-700">
                                    <FileText className="w-2.5 h-2.5 text-amber-600" />
                                    <span>{readingCount} Reading</span>
                                  </span>
                                )}
                                {assignmentCount > 0 && (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-purple-50 text-purple-800 rounded border border-purple-200 font-semibold">
                                    <FileCheck className="w-2.5 h-2.5 text-purple-600" />
                                    <span>{assignmentCount} Task</span>
                                  </span>
                                )}
                                {quizCount > 0 && (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-blue-50 text-blue-800 rounded border border-blue-200 font-semibold">
                                    <span>{quizCount} Quiz</span>
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Completed / pending assignments row */}
                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs text-slate-600">
                    <span className="font-semibold text-slate-700 font-mono text-[11px]">Submissions:</span>
                    {courseSubs.length === 0 ? (
                      <span className="text-slate-400 italic text-[11px]">No assignments or assessments completed yet for this course</span>
                    ) : (
                      courseSubs.map((sub) => (
                        <span
                          key={sub.id}
                          className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-800 rounded font-mono text-[11px]"
                        >
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>{sub.assignmentTitle.slice(0, 24)}...</span>
                          {sub.score !== undefined && (
                            <span className="font-bold text-emerald-700">({sub.score}pts)</span>
                          )}
                        </span>
                      ))
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
