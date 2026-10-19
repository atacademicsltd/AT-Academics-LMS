import React, { useState } from 'react';
import {
  Assignment,
  AssignmentSubmission,
  Course,
  User,
  RubricItem,
} from '../../types';
import { StorageService } from '../../services/storage';
import {
  FileSpreadsheet,
  Download,
  Upload,
  CheckCircle2,
  Clock,
  Search,
  Plus,
  FileCode,
  FileText,
  AlertCircle,
  Award,
  ChevronDown,
  Layers,
  Archive,
} from 'lucide-react';

interface AssignmentGradingHubProps {
  assignments: Assignment[];
  submissions: AssignmentSubmission[];
  courses: Course[];
  currentUser: User;
  onRefresh: () => void;
  preSelectedAssignmentId?: string;
}

export const AssignmentGradingHub: React.FC<AssignmentGradingHubProps> = ({
  assignments,
  submissions,
  courses,
  currentUser,
  onRefresh,
  preSelectedAssignmentId,
}) => {
  const [selectedCourseFilter, setSelectedCourseFilter] = useState('all');
  const [selectedAssignmentFilter, setSelectedAssignmentFilter] = useState(
    preSelectedAssignmentId || 'all'
  );
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [isCreateAssignmentOpen, setIsCreateAssignmentOpen] = useState(false);
  const [gradingSubmission, setGradingSubmission] = useState<AssignmentSubmission | null>(null);
  const [submittingAssignment, setSubmittingAssignment] = useState<Assignment | null>(null);

  // Grading form state
  const [gradeScore, setGradeScore] = useState<number>(90);
  const [gradeFeedback, setGradeFeedback] = useState('');
  const [rubricScores, setRubricScores] = useState<Record<string, number>>({});

  // Student upload submission state
  const [submissionFileName, setSubmissionFileName] = useState('');
  const [submissionContent, setSubmissionContent] = useState('');
  const [submissionSize, setSubmissionSize] = useState('1.5 MB');

  // New assignment form state
  const [newTitle, setNewTitle] = useState('');
  const [newCourseId, setNewCourseId] = useState(courses[0]?.id || '');
  const [newDesc, setNewDesc] = useState('');
  const [newDueDate, setNewDueDate] = useState('2026-10-25T23:59');
  const [newPoints, setNewPoints] = useState(100);

  const isTeacherOrAdmin = currentUser.role === 'teacher' || currentUser.role === 'admin';

  // Filtered lists
  const filteredAssignments = assignments.filter((a) => {
    const isEnrolled =
      currentUser.role === 'student' ? currentUser.coursesEnrolled.includes(a.courseCode) : true;
    const matchesCourse = selectedCourseFilter === 'all' || a.courseId === selectedCourseFilter;
    const matchesSearch =
      a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.courseCode.toLowerCase().includes(searchQuery.toLowerCase());
    return isEnrolled && matchesCourse && matchesSearch;
  });

  const handleDownloadBrief = (asg: Assignment) => {
    let content = `AT ACADEMICS LMS - OFFICIAL ASSIGNMENT BRIEF\n`;
    content += `Course: ${asg.courseCode} - ${asg.courseTitle}\n`;
    content += `Title: ${asg.title}\n`;
    content += `Due Date: ${new Date(asg.dueDate).toLocaleString()}\n`;
    content += `Total Points: ${asg.totalPoints}\n`;
    content += `Allowed File Types: ${asg.fileTypesAllowed.join(', ')}\n`;
    content += `====================================================\n\n`;
    content += `ASSIGNMENT DESCRIPTION & DELIVERABLES:\n`;
    content += `${asg.description}\n\n`;
    content += `EVALUATION RUBRIC BREAKDOWN:\n`;
    asg.rubric.forEach((r, idx) => {
      content += `${idx + 1}. ${r.criterion} [Max: ${r.maxPoints} pts]\n   Description: ${r.description}\n`;
    });
    content += `\n====================================================\n`;
    content += `Submission Instructions: Submit code or report archive before the deadline through AT Academics LMS.\n`;

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${asg.courseCode}_${asg.title.replace(/[^a-zA-Z0-9]/g, '_')}_brief.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const filteredSubmissions = submissions.filter((s) => {
    const matchesCourse = selectedCourseFilter === 'all' || s.courseId === selectedCourseFilter;
    const matchesAssign =
      selectedAssignmentFilter === 'all' || s.assignmentId === selectedAssignmentFilter;
    const matchesSearch =
      s.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.studentId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.assignmentTitle.toLowerCase().includes(searchQuery.toLowerCase());

    if (currentUser.role === 'student' && currentUser.studentId) {
      return s.studentId === currentUser.studentId && matchesCourse && matchesSearch;
    }

    return matchesCourse && matchesAssign && matchesSearch;
  });

  const handleOpenGrading = (sub: AssignmentSubmission) => {
    setGradingSubmission(sub);
    setGradeScore(sub.score !== undefined ? sub.score : 90);
    setGradeFeedback(sub.feedback || 'Well-executed solution. All test cases passed.');

    const initialRubric: Record<string, number> = {};
    const asg = assignments.find((a) => a.id === sub.assignmentId);
    if (asg && asg.rubric) {
      asg.rubric.forEach((r) => {
        initialRubric[r.id] = sub.rubricScores?.[r.id] ?? r.maxPoints;
      });
    }
    setRubricScores(initialRubric);
  };

  const handleSaveGrade = (e: React.FormEvent) => {
    e.preventDefault();
    if (!gradingSubmission) return;

    StorageService.gradeSubmission(gradingSubmission.id, {
      score: gradeScore,
      feedback: gradeFeedback.trim(),
      gradedBy: currentUser.name,
      rubricScores,
    });

    setGradingSubmission(null);
    onRefresh();
  };

  const handleSubmitWork = (e: React.FormEvent) => {
    e.preventDefault();
    if (!submittingAssignment || !currentUser.studentId) return;

    StorageService.submitAssignment({
      assignmentId: submittingAssignment.id,
      studentId: currentUser.studentId,
      studentName: currentUser.name,
      studentEmail: currentUser.email,
      fileName: submissionFileName || `${currentUser.studentId}_${submittingAssignment.id}.zip`,
      fileSize: submissionSize,
      fileContentPreview:
        submissionContent.trim() ||
        `// Source package submitted for ${submittingAssignment.title}\n// Author: ${currentUser.name}\npackage main\n\nfunc main() {\n    // Implementation verified\n}`,
    });

    setSubmittingAssignment(null);
    setSubmissionFileName('');
    setSubmissionContent('');
    onRefresh();
  };

  const handleCreateAssignment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newCourseId) return;

    const course = courses.find((c) => c.id === newCourseId);
    if (!course) return;

    StorageService.createAssignment({
      courseId: course.id,
      courseCode: course.code,
      courseTitle: course.title,
      title: newTitle.trim(),
      description: newDesc.trim() || 'Please complete according to assignment specifications.',
      dueDate: new Date(newDueDate).toISOString(),
      totalPoints: newPoints,
      allowLateSubmission: true,
      fileTypesAllowed: ['.zip', '.pdf', '.py', '.go'],
      rubric: [
        {
          id: `r-${Date.now()}-1`,
          criterion: 'Correctness & Algorithmic Rigor',
          maxPoints: Math.round(newPoints * 0.5),
          description: 'Passes automated test assertions and verification suites.',
        },
        {
          id: `r-${Date.now()}-2`,
          criterion: 'Code Quality & Modular Architecture',
          maxPoints: Math.round(newPoints * 0.3),
          description: 'Adheres to idiomatic conventions and documentation standards.',
        },
        {
          id: `r-${Date.now()}-3`,
          criterion: 'Written Analysis & Technical Report',
          maxPoints: Math.round(newPoints * 0.2),
          description: 'Clear explanation of complexity and performance trade-offs.',
        },
      ],
    });

    setIsCreateAssignmentOpen(false);
    setNewTitle('');
    setNewDesc('');
    onRefresh();
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Export Hub */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Assignments & Gradebook Dashboard
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Download student submission archives, grade with structured rubrics, and export full course gradebooks.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5">
          {/* Download Gradebook CSV */}
          <button
            onClick={() => StorageService.exportGradebookCsv(selectedCourseFilter === 'all' ? '' : selectedCourseFilter)}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 text-white text-xs font-semibold rounded-lg hover:bg-slate-800 transition-colors shadow-sm"
            title="Download full course gradebook with scores and GPA weighting as CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Gradebook (CSV)</span>
          </button>

          {isTeacherOrAdmin && (
            <button
              onClick={() => setIsCreateAssignmentOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 border border-slate-300 text-slate-800 hover:text-slate-950 hover:bg-slate-50 text-xs font-semibold rounded-lg transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Assignment</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Strip */}
      <div className="p-3 bg-white rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-slate-400 ml-1" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search assignments or student submissions..."
            className="w-full text-xs bg-transparent border-none focus:outline-none text-slate-900 placeholder:text-slate-400"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Course filter */}
          <select
            value={selectedCourseFilter}
            onChange={(e) => setSelectedCourseFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 outline-none"
          >
            <option value="all">All Courses</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.code} · {c.title}
              </option>
            ))}
          </select>

          {/* Assignment filter */}
          <select
            value={selectedAssignmentFilter}
            onChange={(e) => setSelectedAssignmentFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 outline-none max-w-xs truncate"
          >
            <option value="all">All Assignments</option>
            {assignments
              .filter((a) => selectedCourseFilter === 'all' || a.courseId === selectedCourseFilter)
              .map((a) => (
                <option key={a.id} value={a.id}>
                  {a.courseCode}: {a.title}
                </option>
              ))}
          </select>

          {/* Batch download for selected assignment */}
          {selectedAssignmentFilter !== 'all' && isTeacherOrAdmin && (
            <button
              onClick={() => StorageService.downloadBatchSubmissionsReport(selectedAssignmentFilter)}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-medium rounded-lg transition-colors whitespace-nowrap"
              title="Download all submissions package for this assignment"
            >
              <Archive className="w-3.5 h-3.5 text-slate-600" />
              <span>Batch Download (.txt)</span>
            </button>
          )}
        </div>
      </div>

      {/* Submissions Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900">
            {currentUser.role === 'student' ? 'Your Assignment Submissions' : 'Student Submissions Roster'}
          </h2>
          <span className="text-xs font-mono text-slate-500 tabular-nums">
            {filteredSubmissions.length} records found
          </span>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-500 font-mono text-[11px] border-b border-slate-200 uppercase">
                <tr>
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">Course & Assignment</th>
                  <th className="py-3 px-4">Submitted File</th>
                  <th className="py-3 px-4">Submission Date</th>
                  <th className="py-3 px-4">Status & Score</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSubmissions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-slate-400 text-xs">
                      No submissions matching current criteria.
                    </td>
                  </tr>
                ) : (
                  filteredSubmissions.map((sub) => {
                    const asg = assignments.find((a) => a.id === sub.assignmentId);
                    const isGraded = sub.status === 'graded';

                    return (
                      <tr key={sub.id} className="hover:bg-slate-50/60 transition-colors">
                        {/* Student */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="font-semibold text-slate-900">{sub.studentName}</div>
                          <div className="text-[11px] text-slate-500 font-mono">
                            {sub.studentId}
                          </div>
                        </td>

                        {/* Course & Assignment */}
                        <td className="py-3.5 px-4 max-w-xs">
                          <div className="font-mono text-[11px] text-slate-500">
                            {sub.courseCode}
                          </div>
                          <div className="font-medium text-slate-900 truncate">
                            {sub.assignmentTitle}
                          </div>
                        </td>

                        {/* File */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-700">
                            <FileCode className="w-3.5 h-3.5 text-slate-400" />
                            <span className="truncate max-w-[140px]">{sub.fileName}</span>
                            <span className="text-[10px] text-slate-400">({sub.fileSize})</span>
                          </div>
                        </td>

                        {/* Submitted Date */}
                        <td className="py-3.5 px-4 whitespace-nowrap font-mono text-[11px] text-slate-600">
                          {new Date(sub.submittedAt).toLocaleDateString()} ·{' '}
                          {new Date(sub.submittedAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>

                        {/* Status & Score */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {isGraded ? (
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-slate-900">
                                {sub.score} / {asg?.totalPoints || 100}
                              </span>
                              <span className="font-mono text-[11px] font-semibold text-emerald-700">
                                [{sub.letterGrade}]
                              </span>
                            </div>
                          ) : (
                            <span className="text-amber-700 font-medium capitalize">
                              {sub.status === 'late' ? 'Late - Pending Review' : 'Submitted (Ungraded)'}
                            </span>
                          )}
                        </td>

                        {/* Actions: Download Submission & Grade */}
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-2">
                            {/* Download file button */}
                            <button
                              onClick={() => StorageService.downloadSubmissionFile(sub)}
                              className="px-2.5 py-1 border border-slate-200 text-slate-700 hover:text-slate-950 hover:bg-slate-50 rounded-lg text-xs font-medium inline-flex items-center gap-1"
                              title="Download student submitted file directly to disk"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>Download</span>
                            </button>

                            {/* Grade button for teachers */}
                            {isTeacherOrAdmin && (
                              <button
                                onClick={() => handleOpenGrading(sub)}
                                className="px-2.5 py-1 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 transition-colors shadow-xs"
                              >
                                {isGraded ? 'Edit Grade' : 'Grade Submission'}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Active Assignments Overview (With Submit Work action for students) */}
      <div className="pt-4 space-y-4">
        <h2 className="text-base font-bold text-slate-900">
          Semester Assignments Specifications & Due Dates
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAssignments.map((asg) => {
            const mySubmission = submissions.find(
              (s) => s.assignmentId === asg.id && s.studentId === currentUser.studentId
            );

            return (
              <div
                key={asg.id}
                className="bg-white rounded-xl border border-slate-200 p-5 space-y-3 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between text-xs font-mono text-slate-500 mb-1">
                    <span>{asg.courseCode}</span>
                    <span>{asg.totalPoints} PTS</span>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 leading-snug">
                    {asg.title}
                  </h3>

                  <p className="text-xs text-slate-600 mt-2 line-clamp-2 leading-relaxed">
                    {asg.description}
                  </p>

                  <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] font-mono text-slate-500">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      Due {new Date(asg.dueDate).toLocaleDateString()}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDownloadBrief(asg)}
                      className="text-slate-700 hover:text-slate-950 underline font-semibold flex items-center gap-1 font-sans text-xs"
                      title="Download Assignment Brief"
                    >
                      <Download className="w-3 h-3" />
                      <span>Download Brief</span>
                    </button>
                  </div>
                </div>

                <div className="pt-2">
                  {currentUser.role === 'student' ? (
                    mySubmission ? (
                      <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs flex items-center justify-between">
                        <div>
                          <span className="text-[10px] text-slate-500 block font-mono">STATUS</span>
                          <span className="font-semibold text-slate-900">
                            {mySubmission.status === 'graded'
                              ? `Graded: ${mySubmission.score}/${asg.totalPoints} (${mySubmission.letterGrade})`
                              : 'Submitted for Review'}
                          </span>
                        </div>
                        <button
                          onClick={() => setSubmittingAssignment(asg)}
                          className="text-[11px] text-slate-700 hover:text-slate-900 underline"
                        >
                          Resubmit
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setSubmittingAssignment(asg)}
                        className="w-full py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 transition-colors flex items-center justify-center gap-1.5 shadow-xs"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Upload Submission</span>
                      </button>
                    )
                  ) : (
                    <button
                      onClick={() => setSelectedAssignmentFilter(asg.id)}
                      className="w-full py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1"
                    >
                      <span>Filter Roster for this Assignment</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal: Grade Submission with Rubric */}
      {gradingSubmission && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-mono text-slate-400 block uppercase">
                  Academic Assessment
                </span>
                <h3 className="text-base font-bold text-slate-900">
                  Grade Submission: {gradingSubmission.studentName}
                </h3>
              </div>
              <button
                onClick={() => setGradingSubmission(null)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* Submission preview */}
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-2">
              <div className="flex justify-between font-mono text-[11px] text-slate-600">
                <span>File: {gradingSubmission.fileName}</span>
                <span>Submitted: {new Date(gradingSubmission.submittedAt).toLocaleString()}</span>
              </div>
              <div className="p-2.5 bg-slate-900 text-slate-100 font-mono text-[11px] rounded overflow-x-auto max-h-36 whitespace-pre">
                {gradingSubmission.fileContentPreview}
              </div>
              <button
                type="button"
                onClick={() => StorageService.downloadSubmissionFile(gradingSubmission)}
                className="text-slate-700 font-semibold underline text-[11px] inline-flex items-center gap-1"
              >
                <Download className="w-3 h-3" />
                <span>Download full file to inspect</span>
              </button>
            </div>

            <form onSubmit={handleSaveGrade} className="space-y-4">
              {/* Rubric Breakdown */}
              <div className="space-y-2">
                <span className="text-xs font-semibold text-slate-700 block">
                  Evaluation Rubric Criteria
                </span>
                {assignments
                  .find((a) => a.id === gradingSubmission.assignmentId)
                  ?.rubric?.map((rubric) => (
                    <div
                      key={rubric.id}
                      className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <div className="font-semibold text-slate-800">{rubric.criterion}</div>
                        <div className="text-[11px] text-slate-500">{rubric.description}</div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0 font-mono">
                        <input
                          type="number"
                          min="0"
                          max={rubric.maxPoints}
                          value={rubricScores[rubric.id] ?? rubric.maxPoints}
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 0;
                            setRubricScores((prev) => ({ ...prev, [rubric.id]: val }));
                          }}
                          className="w-14 px-2 py-1 bg-white border border-slate-300 rounded text-center text-xs font-bold"
                        />
                        <span className="text-slate-400">/ {rubric.maxPoints}</span>
                      </div>
                    </div>
                  ))}
              </div>

              {/* Total Score Field */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Overall Points Awarded
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={gradeScore}
                    onChange={(e) => setGradeScore(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 font-mono font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Graded By
                  </label>
                  <input
                    type="text"
                    value={currentUser.name}
                    disabled
                    className="w-full px-3 py-1.5 text-xs bg-slate-100 border border-slate-200 rounded-lg text-slate-600"
                  />
                </div>
              </div>

              {/* Instructor Feedback */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Instructor Qualitative Feedback
                </label>
                <textarea
                  value={gradeFeedback}
                  onChange={(e) => setGradeFeedback(e.target.value)}
                  rows={3}
                  placeholder="Provide constructive feedback, notes on edge cases, and strengths..."
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setGradingSubmission(null)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-lg hover:bg-slate-800 transition-colors"
                >
                  Publish Grade & Notify Student
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Student Submit Assignment */}
      {submittingAssignment && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold text-slate-900">
              Submit Assignment: {submittingAssignment.title}
            </h3>
            <p className="text-xs text-slate-500">
              Allowed file types: {submittingAssignment.fileTypesAllowed.join(', ')} · Due {new Date(submittingAssignment.dueDate).toLocaleString()}
            </p>

            <form onSubmit={handleSubmitWork} className="space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Submission File Name
                </label>
                <input
                  type="text"
                  value={submissionFileName}
                  onChange={(e) => setSubmissionFileName(e.target.value)}
                  placeholder="e.g. alex_rivera_lab2_consensus.zip"
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 font-mono"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Solution Code or Report Summary (Embedded Preview)
                </label>
                <textarea
                  value={submissionContent}
                  onChange={(e) => setSubmissionContent(e.target.value)}
                  rows={5}
                  placeholder="Paste solution code, terminal test runs, or executive summary..."
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 font-mono"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSubmittingAssignment(null)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-lg hover:bg-slate-800 transition-colors"
                >
                  Confirm & Submit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Create Assignment */}
      {isCreateAssignmentOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold text-slate-900">Create New Course Assignment</h3>

            <form onSubmit={handleCreateAssignment} className="space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Target Course
                </label>
                {courses.length === 0 ? (
                  <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                    No active courses found. Please create a course first in the Programs tab.
                  </div>
                ) : (
                  <select
                    value={newCourseId || courses[0]?.id || ''}
                    onChange={(e) => setNewCourseId(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
                  >
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.code} · {c.title}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Assignment Title
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Lab 3: Paxos Consensus State Machine"
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Due Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Maximum Points
                  </label>
                  <input
                    type="number"
                    min="10"
                    max="500"
                    value={newPoints}
                    onChange={(e) => setNewPoints(parseInt(e.target.value) || 100)}
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 font-mono"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Description & Deliverables
                </label>
                <textarea
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  rows={3}
                  placeholder="Specify problem constraints, allowed libraries, and submission format..."
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateAssignmentOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-lg hover:bg-slate-800 transition-colors"
                >
                  Publish Assignment & Rubric
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
