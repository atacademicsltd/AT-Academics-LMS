import React, { useState, useEffect } from 'react';
import { Course, AssignmentGuide, User } from '../../types';
import { StorageService } from '../../services/storage';
import {
  FileSpreadsheet,
  FileText,
  X,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Award,
  Upload,
  Edit2,
} from 'lucide-react';

interface AssignmentGuideModalProps {
  course: Course;
  currentUser: User;
  isOpen: boolean;
  onClose: () => void;
  onGuideUploaded: (guide: AssignmentGuide) => void;
  initialGuide?: AssignmentGuide | null;
  initialModuleId?: string | null;
}

export const AssignmentGuideModal: React.FC<AssignmentGuideModalProps> = ({
  course,
  currentUser,
  isOpen,
  onClose,
  onGuideUploaded,
  initialGuide,
  initialModuleId,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<AssignmentGuide['category']>('assignment_brief');
  const [selectedModuleId, setSelectedModuleId] = useState<string>('');
  const [dueDate, setDueDate] = useState('2026-11-30T23:59');
  const [totalMarks, setTotalMarks] = useState(100);
  const [fileName, setFileName] = useState('');
  const [fileSize, setFileSize] = useState('1.5 MB');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    if (initialGuide) {
      setTitle(initialGuide.title);
      setDescription(initialGuide.description);
      setCategory(initialGuide.category);
      setSelectedModuleId(initialGuide.moduleId || initialModuleId || '');
      setDueDate(initialGuide.dueDate ? initialGuide.dueDate.substring(0, 16) : '2026-11-30T23:59');
      setTotalMarks(initialGuide.totalMarks || 100);
      setFileName(initialGuide.fileName);
      setFileSize(initialGuide.fileSize);
    } else {
      setTitle('');
      setDescription('');
      setCategory('assignment_brief');
      setSelectedModuleId(initialModuleId || (course.modules || [])[0]?.id || '');
      setDueDate('2026-11-30T23:59');
      setTotalMarks(100);
      setFileName('');
      setFileSize('1.5 MB');
    }
    setErrorMsg('');
  }, [isOpen, initialGuide, initialModuleId]);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
      const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
      setFileSize(`${sizeMb} MB`);
      if (!title) {
        setTitle(file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '));
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const resolvedTitle =
      title.trim() ||
      (fileName ? fileName.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ') : '') ||
      'Module Assignment Brief';

    const finalFileName = fileName.trim() || `${resolvedTitle.replace(/\s+/g, '_')}_brief.pdf`;
    const targetModId = selectedModuleId || initialModuleId || undefined;

    if (initialGuide) {
      const updated = StorageService.updateAssignmentGuide(course.id, initialGuide.id, {
        title: resolvedTitle,
        description: description.trim() || 'Official curriculum assignment specification.',
        category,
        moduleId: targetModId,
        dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
        totalMarks: Number(totalMarks) || 100,
        fileName: finalFileName,
        fileSize: fileSize || '1.2 MB',
      });
      if (updated) {
        onGuideUploaded(updated);
        onClose();
      }
    } else {
      const created = StorageService.addAssignmentGuide(course.id, {
        courseId: course.id,
        moduleId: targetModId,
        title: resolvedTitle,
        description: description.trim() || 'Official curriculum assignment specification.',
        category,
        dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
        totalMarks: Number(totalMarks) || 100,
        fileName: finalFileName,
        fileSize: fileSize || '1.2 MB',
        uploadedBy: currentUser.name,
      });

      if (created) {
        onGuideUploaded(created);
        onClose();
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-700 text-white flex items-center justify-center shadow-xs">
              {initialGuide ? <Edit2 className="w-4 h-4" /> : <FileSpreadsheet className="w-4 h-4" />}
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                {initialGuide ? 'Edit Assignment Brief / Guide' : 'Upload Assignment Brief & Rubric'}
              </h2>
              <p className="text-xs text-slate-500">
                {course.code} · {course.title}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Target Course Module
            </label>
            <select
              value={selectedModuleId}
              onChange={(e) => setSelectedModuleId(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
            >
              {(!course.modules || course.modules.length === 0) ? (
                <option value="">General Assignment Guide</option>
              ) : (
                <>
                  {(course.modules || []).map((m) => (
                    <option key={m.id} value={m.id}>
                      Week {m.weekNumber}: {m.title}
                    </option>
                  ))}
                  <option value="">General Course Brief</option>
                </>
              )}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Assignment Document Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Term 1 Summative Strategy Brief"
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 font-medium"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Document Type
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
              >
                <option value="assignment_brief">Assignment Brief</option>
                <option value="marking_rubric">Marking Rubric Matrix</option>
                <option value="specification">Task Specification</option>
                <option value="template">Submission Template</option>
                <option value="guide">Referencing Guide</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Total Marks Weighting
              </label>
              <input
                type="number"
                value={totalMarks}
                onChange={(e) => setTotalMarks(Number(e.target.value) || 100)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Submission Due Date / Deadline
            </label>
            <input
              type="datetime-local"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg font-mono text-slate-800"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Brief Description & Assessment Scope
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Word count limitations, Harvard referencing expectations, academic integrity clauses..."
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              File Attachment
            </label>
            <div className="flex items-center gap-3">
              <label className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-lg cursor-pointer border border-slate-200 transition-colors flex items-center gap-1.5">
                <Upload className="w-3.5 h-3.5 text-slate-600" />
                <span>{initialGuide ? 'Replace Brief File' : 'Browse File'}</span>
                <input
                  type="file"
                  onChange={handleFileChange}
                  className="hidden"
                  accept=".pdf,.doc,.docx,.xls,.xlsx"
                />
              </label>
              <div className="text-xs font-mono text-slate-500 truncate flex-1">
                {fileName ? `${fileName} (${fileSize})` : 'Default academic brief specification package'}
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 text-xs font-semibold text-slate-600 rounded-xl hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-emerald-700 text-white text-xs font-semibold rounded-xl hover:bg-emerald-800 transition-colors shadow-2xs flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{initialGuide ? 'Save Changes' : 'Publish Assignment Brief'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
