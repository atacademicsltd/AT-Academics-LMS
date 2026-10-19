import React, { useState } from 'react';
import { User, Course, AssignmentSubmission } from '../../types';
import {
  X,
  TrendingUp,
  FileCheck,
  Award,
  Layers,
  CheckCircle2,
} from 'lucide-react';
import { StorageService } from '../../services/storage';

interface StudentProgressStatsModalProps {
  student: User | null;
  isOpen: boolean;
  onClose: () => void;
  courses: Course[];
  submissions: AssignmentSubmission[];
}

export const StudentProgressStatsModal: React.FC<StudentProgressStatsModalProps> = ({
  student,
  isOpen,
  onClose,
  courses,
  submissions,
}) => {
  const [, setRefreshKey] = useState(0);

  if (!isOpen || !student) return null;

  const enrolledCodes = Array.isArray(student.coursesEnrolled)
    ? student.coursesEnrolled.map((c) => c.trim().toLowerCase())
    : [];
  const qualLower = (student.qualificationTitle || '').trim().toLowerCase();
  const deptLower = (student.department || '').trim().toLowerCase();

  const enrolledCourses = courses.filter((c) => {
    const codeLower = c.code.trim().toLowerCase();
    const idLower = c.id.trim().toLowerCase();
    const titleLower = c.title.trim().toLowerCase();
    if (enrolledCodes.includes(codeLower) || enrolledCodes.includes(idLower)) return true;

    const normCrs = codeLower.replace(/[^a-z0-9]/g, '');
    const hasNormMatch = enrolledCodes.some((code) => {
      const norm = code.replace(/[^a-z0-9]/g, '');
      return (
        norm &&
        (norm === normCrs ||
          normCrs.includes(norm) ||
          norm.includes(normCrs) ||
          (norm === 'thm' && normCrs.startsWith('htm')))
      );
    });
    if (hasNormMatch) return true;

    if (enrolledCodes.length === 0) {
      if (qualLower && (titleLower.includes(qualLower) || qualLower.includes(titleLower))) return true;
      if (deptLower && (titleLower.includes(deptLower) || deptLower.includes(titleLower))) return true;
    }
    return false;
  });

  const displayCourses = enrolledCourses.length > 0 ? enrolledCourses : courses.slice(0, 2);

  const studentSubmissions = submissions.filter(
    (s) => s.studentId === student.studentId || s.studentId === student.loginId
  );

  const handleToggleModule = (courseId: string, moduleId: string, newState: boolean) => {
    StorageService.markModuleComplete(
      student.studentId || student.loginId,
      courseId,
      moduleId,
      newState
    );
    setRefreshKey((k) => k + 1);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/75 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 max-w-3xl w-full rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-900 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-white">
                  Course Progress & Modular Analytics
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-500/20 text-blue-300">
                  STUDENT STATS
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono">
                {student.name} · ID: {student.studentId || student.loginId} ·{' '}
                {student.department || 'Academics'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50 dark:bg-slate-950">
          {/* Summary Metric Tiles */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
              <span className="text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400 block">
                Enrolled Courses
              </span>
              <span className="text-xl font-bold font-mono text-slate-900 dark:text-white mt-0.5 block">
                {student.coursesEnrolled?.length || displayCourses.length}
              </span>
            </div>

            <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
              <span className="text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400 block">
                Submissions
              </span>
              <span className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5 block">
                {studentSubmissions.length} Filed
              </span>
            </div>

            <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
              <span className="text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400 block">
                Tuition Status
              </span>
              <span className="text-xl font-bold font-mono text-slate-900 dark:text-white mt-0.5 block">
                £{(student.tuitionPaid || 0).toLocaleString()}
              </span>
            </div>

            <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
              <span className="text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400 block">
                Graduation Status
              </span>
              <span className="text-xs font-bold text-slate-900 dark:text-white mt-1 block">
                {student.isGraduated === false ||
                student.graduationStatus === 'not_graduated' ||
                student.graduatedOn === 'Not Graduated Yet'
                  ? '⏳ Not Graduated Yet'
                  : student.graduationStatus === 'expected' ||
                    student.graduatedOn?.startsWith('Expected')
                  ? `📅 Expected: ${
                      student.expectedGraduationDate ||
                      student.graduatedOn?.replace('Expected: ', '')
                    }`
                  : `🎓 Graduated: ${
                      student.graduatedOn ||
                      `${student.passingMonth || 'July'} ${
                        student.passingYear || '2026'
                      }`
                    }`}
              </span>
            </div>
          </div>

          {/* Course-by-Course Progress Stats */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Assigned Courses & Modular Progress ({displayCourses.length} Enrolled)
            </h3>

            {displayCourses.length === 0 ? (
              <div className="p-8 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2">
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  No courses assigned to this student
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Assign courses to {student.name} using the &quot;Edit User&quot;
                  button in the roster table.
                </p>
              </div>
            ) : (
              displayCourses.map((crs) => {
                const subsForCourse = studentSubmissions.filter(
                  (s) => s.courseId === crs.id || s.courseCode === crs.code
                );

                // Course progress strictly counted based on module completion
                const modProg = StorageService.getCourseModuleProgress(
                  student.studentId || student.loginId,
                  crs.id
                );
                const totalModules =
                  modProg.totalModules || (crs.modules?.length || 1);
                const completedModulesCount = modProg.completedCount;
                const percent = modProg.progressPercent;

                return (
                  <div
                    key={crs.id}
                    className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-slate-900 dark:bg-slate-800 text-white text-[10px] font-mono font-bold">
                            {crs.code}
                          </span>
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                            {crs.title}
                          </h4>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          Instructor: {crs.instructorName} · {crs.credits} Credits ·{' '}
                          {crs.department}
                        </p>
                      </div>

                      <div className="text-right">
                        <div className="text-lg font-bold font-mono text-slate-900 dark:text-white">
                          {percent}%
                        </div>
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                            percent === 100
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : percent > 0
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                              : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                          }`}
                        >
                          {percent === 100
                            ? 'COMPLETED (100%)'
                            : percent > 0
                            ? 'IN PROGRESS'
                            : 'NOT STARTED'}
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar (based on module completion) */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
                        <span className="flex items-center gap-1.5 font-medium">
                          <Layers className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                          <span>Course Progress (Counted by Module Completion)</span>
                        </span>
                        <span className="font-mono font-bold text-slate-900 dark:text-white">
                          {completedModulesCount} of {totalModules} Modules Complete
                        </span>
                      </div>
                      <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            percent === 100 ? 'bg-emerald-500' : 'bg-blue-600'
                          }`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>

                    {/* Submissions & Modules Breakdown */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
                      {/* Submissions */}
                      <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1.5">
                        <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
                          <FileCheck className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                          <span>Assignment Submissions ({subsForCourse.length})</span>
                        </div>
                        {subsForCourse.length === 0 ? (
                          <p className="text-[11px] text-slate-400 italic">
                            No assignments submitted yet.
                          </p>
                        ) : (
                          subsForCourse.map((s) => (
                            <div
                              key={s.id}
                              className="text-[11px] flex items-center justify-between text-slate-700 dark:text-slate-300"
                            >
                              <span className="truncate max-w-[180px]">
                                {s.assignmentTitle || s.fileName}
                              </span>
                              <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                {s.score !== undefined
                                  ? `${s.score}/100`
                                  : 'Submitted (100%)'}
                              </span>
                            </div>
                          ))
                        )}
                      </div>

                      {/* Modules Completed */}
                      <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1.5">
                        <div className="flex items-center justify-between gap-1.5 font-bold text-slate-800 dark:text-slate-200">
                          <div className="flex items-center gap-1.5">
                            <Award className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                            <span>Modules as Units ({crs.modules?.length || 0})</span>
                          </div>
                          <span className="text-[10px] text-slate-400 font-normal">
                            Click to toggle
                          </span>
                        </div>
                        <div className="space-y-1 max-h-48 overflow-y-auto">
                          {(crs.modules || []).map((m) => {
                            const isDone = StorageService.isModuleCompleted(
                              student.studentId || student.loginId,
                              crs.id,
                              m.id
                            );
                            return (
                              <div
                                key={m.id}
                                className="text-[11px] flex items-center justify-between text-slate-700 dark:text-slate-300 py-0.5"
                              >
                                <span className="truncate max-w-[180px]">
                                  Week {m.weekNumber}: {m.title}
                                </span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleToggleModule(crs.id, m.id, !isDone)
                                  }
                                  className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded cursor-pointer transition-colors ${
                                    isDone
                                      ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 dark:bg-emerald-950 dark:text-emerald-300'
                                      : 'bg-slate-200 text-slate-600 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-300'
                                  }`}
                                  title="Toggle module completion status"
                                >
                                  {isDone ? '✓ Completed' : '○ In Progress'}
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer"
          >
            Close Viewer
          </button>
        </div>
      </div>
    </div>
  );
};
