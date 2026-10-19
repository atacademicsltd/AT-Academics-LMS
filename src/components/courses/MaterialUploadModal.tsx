import React, { useState, useEffect } from 'react';
import { Course, StudyMaterial, User } from '../../types';
import { StorageService } from '../../services/storage';
import {
  Upload,
  FileText,
  X,
  CheckCircle2,
  AlertCircle,
  File,
  Edit2,
  Layers,
} from 'lucide-react';

interface MaterialUploadModalProps {
  course: Course;
  currentUser: User;
  isOpen: boolean;
  onClose: () => void;
  onMaterialUploaded: (material: StudyMaterial) => void;
  initialMaterial?: StudyMaterial | null;
  initialModuleId?: string | null;
}

export const MaterialUploadModal: React.FC<MaterialUploadModalProps> = ({
  course,
  currentUser,
  isOpen,
  onClose,
  onMaterialUploaded,
  initialMaterial,
  initialModuleId,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<StudyMaterial['category']>('reading_pdf');
  const [selectedModuleId, setSelectedModuleId] = useState<string>('');
  const [fileName, setFileName] = useState('');
  const [fileSize, setFileSize] = useState('1.5 MB');
  const [fileType, setFileType] = useState('pdf');
  const [fileContentBase64, setFileContentBase64] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    if (initialMaterial) {
      setTitle(initialMaterial.title);
      setDescription(initialMaterial.description);
      setCategory(initialMaterial.category);
      setSelectedModuleId(initialMaterial.moduleId || initialModuleId || '');
      setFileName(initialMaterial.fileName);
      setFileSize(initialMaterial.fileSize);
      setFileType(initialMaterial.fileType || 'pdf');
      setFileContentBase64(initialMaterial.fileContentBase64 || '');
    } else {
      setTitle('');
      setDescription('');
      setCategory('reading_pdf');
      setSelectedModuleId(initialModuleId || (course.modules || [])[0]?.id || '');
      setFileName('');
      setFileSize('1.5 MB');
      setFileType('pdf');
      setFileContentBase64('');
    }
    setErrorMsg('');
  }, [isOpen, initialMaterial, initialModuleId]);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
      const ext = file.name.split('.').pop()?.toLowerCase() || '';
      setFileType(ext);
      const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
      setFileSize(Number(sizeMb) < 0.1 ? `${Math.round(file.size / 1024)} KB` : `${sizeMb} MB`);

      if (!title) {
        setTitle(file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '));
      }

      // Auto-set category based on file type
      if (ext === 'pdf') {
        setCategory('reading_pdf');
      } else if (ext === 'doc' || ext === 'docx') {
        setCategory('doc_document');
      }

      // Read file content as Data URL for download/preview
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setFileContentBase64(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const resolvedTitle =
      title.trim() ||
      (fileName ? fileName.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ') : '') ||
      'Module Learning Document';

    const finalFileName =
      fileName.trim() || `${resolvedTitle.replace(/\s+/g, '_')}_document.${fileType || 'pdf'}`;

    const targetModId = selectedModuleId || initialModuleId || undefined;

    if (initialMaterial) {
      const updated = StorageService.updateStudyMaterial(course.id, initialMaterial.id, {
        title: resolvedTitle,
        description: description.trim() || 'Official curriculum learning material.',
        category,
        moduleId: targetModId,
        fileName: finalFileName,
        fileSize: fileSize || '1.5 MB',
        fileType: fileType || 'pdf',
        fileContentBase64: fileContentBase64 || undefined,
      });
      if (updated) {
        onMaterialUploaded(updated);
        onClose();
      }
    } else {
      const created = StorageService.addStudyMaterial(course.id, {
        courseId: course.id,
        moduleId: targetModId,
        title: resolvedTitle,
        description: description.trim() || 'Official curriculum learning material.',
        category,
        fileName: finalFileName,
        fileSize: fileSize || '1.5 MB',
        fileType: fileType || 'pdf',
        fileContentBase64: fileContentBase64 || undefined,
        uploadedBy: currentUser.name,
      });

      if (created) {
        onMaterialUploaded(created);
        onClose();
      }
    }
  };

  const getFileBadge = () => {
    const lower = (fileType || '').toLowerCase();
    if (lower === 'pdf') {
      return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-red-100 text-red-700">PDF Document</span>;
    }
    if (lower === 'doc' || lower === 'docx') {
      return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-100 text-blue-700">DOC Document</span>;
    }
    return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-700 uppercase">{lower || 'FILE'}</span>;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs">
              {initialMaterial ? <Edit2 className="w-4 h-4" /> : <Upload className="w-4 h-4" />}
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                {initialMaterial ? 'Edit Study Material' : 'Add Study Material to Module'}
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Module Selector */}
          <div>
            <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5 mb-1">
              <Layers className="w-3.5 h-3.5 text-blue-600" />
              <span>Target Course Module</span>
            </label>
            <select
              value={selectedModuleId}
              onChange={(e) => setSelectedModuleId(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 font-medium"
            >
              {(!course.modules || course.modules.length === 0) ? (
                <option value="">General Course Material (No modules created)</option>
              ) : (
                <>
                  {(course.modules || []).map((m) => (
                    <option key={m.id} value={m.id}>
                      Week {m.weekNumber}: {m.title}
                    </option>
                  ))}
                  <option value="">General / All Modules</option>
                </>
              )}
            </select>
            <p className="text-[11px] text-slate-500 mt-1">
              This document will be displayed directly under the chosen module.
            </p>
          </div>

          {/* Document Title */}
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Document Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Core Lecture Slides: Strategic Analysis & Frameworks"
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 font-medium"
              required
            />
          </div>

          {/* Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Material Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
              >
                <option value="reading_pdf">Journal Reading / Case Study (PDF)</option>
                <option value="doc_document">Curriculum Document (DOC / DOCX)</option>
                <option value="lecture_slides">Lecture Slides & Notes</option>
                <option value="revision_notes">Revision Notes & Summary</option>
                <option value="handout">Class Handout</option>
                <option value="reference_material">Reference Material</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Document Format
              </label>
              <div className="flex items-center h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg">
                {getFileBadge()}
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Description / Learning Objectives
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Outline topics covered, key concepts, or required reading before class..."
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
            />
          </div>

          {/* PDF or DOC File Upload Section */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                <File className="w-3.5 h-3.5 text-blue-600" />
                <span>Upload PDF or Doc File</span>
              </label>
              <span className="text-[11px] text-slate-500 font-mono">
                Accepted: .pdf, .doc, .docx
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <label className="px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-900 text-xs font-semibold rounded-lg cursor-pointer border border-slate-300 transition-colors flex items-center gap-2 shadow-2xs">
                <Upload className="w-3.5 h-3.5 text-blue-600" />
                <span>{fileName ? 'Choose Different File' : 'Browse PDF or Doc File'}</span>
                <input
                  type="file"
                  onChange={handleFileChange}
                  className="hidden"
                  accept=".pdf,.doc,.docx,.txt"
                />
              </label>

              {fileName ? (
                <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-200 max-w-full truncate text-xs">
                  {getFileBadge()}
                  <span className="font-mono text-slate-800 truncate font-medium">{fileName}</span>
                  <span className="text-slate-400 font-mono text-[11px]">({fileSize})</span>
                </div>
              ) : (
                <span className="text-xs text-slate-400 italic">
                  Select a required PDF or Doc file from your device
                </span>
              )}
            </div>
          </div>

          {/* Actions */}
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
              className="px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-xl hover:bg-blue-700 transition-colors shadow-2xs flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{initialMaterial ? 'Save Changes' : 'Publish Study Material'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
