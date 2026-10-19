import React, { useState } from 'react';
import {
  Course,
  CourseModule,
  ModuleItem,
  StudyMaterial,
  AssignmentGuide,
  Quiz,
  QuizAttempt,
  User,
  Department,
  AssignmentSubmission,
} from '../../types';
import {
  Video,
  FileText,
  Calendar,
  Clock,
  CheckCircle2,
  Plus,
  Play,
  Download,
  Users,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Award,
  Sparkles,
  FileSpreadsheet,
  FileQuestion,
  HelpCircle,
  Upload,
  BookOpen,
  ArrowRight,
  Trash2,
  Edit2,
  X,
  LayoutGrid,
  List,
  File,
  TrendingUp,
  Layers,
  Check,
  Search,
} from 'lucide-react';
import { StorageService } from '../../services/storage';
import { QuizModal } from './QuizModal';
import { QuizTakerModal } from './QuizTakerModal';
import { MaterialUploadModal } from './MaterialUploadModal';
import { AssignmentGuideModal } from './AssignmentGuideModal';

interface CourseDetailProps {
  course: Course;
  currentUser: User;
  onSelectLecture: (item: ModuleItem) => void;
  onBack: () => void;
  onCourseUpdated: () => void;
  onGoToAssignment: (assignmentId: string) => void;
}

export const CourseDetail: React.FC<CourseDetailProps> = ({
  course,
  currentUser,
  onSelectLecture,
  onBack,
  onCourseUpdated,
  onGoToAssignment,
}) => {
  // Navigation tabs - default is modules
  const [activeTab, setActiveTab] = useState<'modules' | 'materials' | 'guides' | 'quizzes'>(
    'modules'
  );

  // View mode for modules: Tiles view or List view
  const [moduleViewMode, setModuleViewMode] = useState<'tiles' | 'list'>('tiles');

  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    (course.modules || []).forEach((m, idx) => {
      init[m.id] = idx === 0; // expand first by default
    });
    return init;
  });

  // Submissions state for real-time progress calculations
  const [submissions, setSubmissions] = useState<AssignmentSubmission[]>(() =>
    StorageService.getSubmissions()
  );

  // Admin Course Edit Modal State
  const [isEditCourseOpen, setIsEditCourseOpen] = useState(false);
  const [editTitle, setEditTitle] = useState(course.title);
  const [editCode, setEditCode] = useState(course.code);
  const [editDeptId, setEditDeptId] = useState(course.departmentId || '');
  const [editLevel, setEditLevel] = useState(course.level || 'Undergraduate');
  const [editCredits, setEditCredits] = useState(course.credits || 30);
  const [editSchedule, setEditSchedule] = useState(course.schedule || 'Mon & Wed 10:00 - 12:00 GMT');
  const [editDesc, setEditDesc] = useState(course.description || '');
  const [editInstructorName, setEditInstructorName] = useState(course.instructorName || '');
  const [editInstructorEmail, setEditInstructorEmail] = useState(course.instructorEmail || '');
  const [editCoverImage, setEditCoverImage] = useState(course.coverImage || '');
  const [departments, setDepartments] = useState<Department[]>(() =>
    StorageService.getDepartments()
  );

  // Module creation
  const [isAddModuleOpen, setIsAddModuleOpen] = useState(false);
  const [newModuleTitle, setNewModuleTitle] = useState('');
  const [newModuleWeek, setNewModuleWeek] = useState((course.modules?.length || 0) + 1);
  const [newModuleDesc, setNewModuleDesc] = useState('');

  // Batch Module Creation (Up to 30+ Modules)
  const [isBatchModuleOpen, setIsBatchModuleOpen] = useState(false);
  const [batchCount, setBatchCount] = useState(30);
  const [batchMode, setBatchMode] = useState<'curriculum' | 'custom'>('curriculum');
  const [batchCustomTitles, setBatchCustomTitles] = useState('');
  const [moduleSearchTerm, setModuleSearchTerm] = useState('');

  // Add Item to Module
  const [activeModuleForNewItem, setActiveModuleForNewItem] = useState<string | null>(null);

  // Teacher Deletion Request State (Only Admins can delete permanently; Teachers submit deletion requests)
  const [teacherDeletionItem, setTeacherDeletionItem] = useState<{
    targetType: 'module' | 'material' | 'assignment';
    targetId: string;
    targetTitle: string;
    courseCode?: string;
  } | null>(null);
  const [teacherDeletionReason, setTeacherDeletionReason] = useState('');
  const [newItemTitle, setNewItemTitle] = useState('');
  const [newItemDuration, setNewItemDuration] = useState('45 min');
  const [newItemVideoUrl, setNewItemVideoUrl] = useState(
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4'
  );

  // Study Material Modal
  const [isUploadMaterialOpen, setIsUploadMaterialOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<StudyMaterial | null>(null);
  const [targetModuleForMaterial, setTargetModuleForMaterial] = useState<string | null>(null);

  // Assignment Guide Modal
  const [isUploadGuideOpen, setIsUploadGuideOpen] = useState(false);
  const [editingGuide, setEditingGuide] = useState<AssignmentGuide | null>(null);
  const [targetModuleForGuide, setTargetModuleForGuide] = useState<string | null>(null);

  // Module edit state (for teachers and admins)
  const [editingModule, setEditingModule] = useState<CourseModule | null>(null);
  const [editModTitle, setEditModTitle] = useState('');
  const [editModWeek, setEditModWeek] = useState(1);
  const [editModDesc, setEditModDesc] = useState('');

  // Module item edit state
  const [editingItemModuleId, setEditingItemModuleId] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<ModuleItem | null>(null);
  const [editItemTitle, setEditItemTitle] = useState('');
  const [editItemDuration, setEditItemDuration] = useState('');

  // Quiz Modal & Quiz Taking
  const [isQuizModalOpen, setIsQuizModalOpen] = useState(false);
  const [targetModuleForQuiz, setTargetModuleForQuiz] = useState<string | null>(null);
  const [editingQuiz, setEditingQuiz] = useState<Quiz | null>(null);
  const [activeQuizToTake, setActiveQuizToTake] = useState<Quiz | null>(null);

  // In-Module Quick Assignment Submission Modal / State
  const [submittingModule, setSubmittingModule] = useState<CourseModule | null>(null);
  const [submissionFileName, setSubmissionFileName] = useState('');
  const [submissionFileSize, setSubmissionFileSize] = useState('1.8 MB');
  const [submissionFilePreview, setSubmissionFilePreview] = useState('');
  const [submissionMsg, setSubmissionMsg] = useState<string | null>(null);

  // Filtered modules for tiles and list views (supports searching across 30+ modules)
  const filteredModules = (course.modules || []).filter((module) => {
    if (!moduleSearchTerm.trim()) return true;
    const term = moduleSearchTerm.toLowerCase();
    return (
      module.title.toLowerCase().includes(term) ||
      `week ${module.weekNumber}`.toLowerCase().includes(term) ||
      (module.description && module.description.toLowerCase().includes(term))
    );
  });

  // Notification banners
  const [actionSuccessNotice, setActionSuccessNotice] = useState<string | null>(null);

  const isStaff = currentUser.role === 'teacher' || currentUser.role === 'admin';

  const toggleModule = (modId: string) => {
    setExpandedModules((prev) => ({ ...prev, [modId]: !prev[modId] }));
  };

  const handleOpenEditCourse = () => {
    setEditTitle(course.title);
    setEditCode(course.code);
    setEditDeptId(course.departmentId || '');
    setEditLevel(course.level || 'Undergraduate');
    setEditCredits(course.credits || 30);
    setEditSchedule(course.schedule || '');
    setEditDesc(course.description || '');
    setEditInstructorName(course.instructorName || '');
    setEditInstructorEmail(course.instructorEmail || '');
    setEditCoverImage(course.coverImage || '');
    setDepartments(StorageService.getDepartments());
    setIsEditCourseOpen(true);
  };

  const handleSaveEditCourse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTitle.trim() || !editCode.trim()) return;

    const targetDept = departments.find((d) => d.id === editDeptId);

    StorageService.updateCourse(course.id, {
      title: editTitle.trim(),
      code: editCode.trim().toUpperCase(),
      department: targetDept ? targetDept.name : course.department,
      departmentId: editDeptId,
      level: editLevel,
      credits: Number(editCredits) || 30,
      schedule: editSchedule.trim(),
      description: editDesc.trim(),
      instructorName: editInstructorName.trim(),
      instructorEmail: editInstructorEmail.trim(),
      coverImage: editCoverImage.trim() || course.coverImage,
    });

    setIsEditCourseOpen(false);
    setActionSuccessNotice('Course details successfully updated.');
    setTimeout(() => setActionSuccessNotice(null), 4000);
    onCourseUpdated();
  };

  const handleOpenAddModule = () => {
    setNewModuleTitle('');
    setNewModuleDesc('');
    setNewModuleWeek((course.modules?.length || 0) + 1);
    setIsAddModuleOpen(true);
  };

  const handleOpenBatchModules = () => {
    setBatchCount(30);
    setBatchMode('curriculum');
    setBatchCustomTitles('');
    setIsBatchModuleOpen(true);
  };

  const handleCreateBatchModules = (e: React.FormEvent) => {
    e.preventDefault();
    const count = Math.min(60, Math.max(1, Number(batchCount) || 30));
    const currentCount = course.modules?.length || 0;
    const modulesToAdd: Array<Omit<CourseModule, 'id' | 'items'>> = [];

    if (batchMode === 'custom' && batchCustomTitles.trim()) {
      const lines = batchCustomTitles
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l.length > 0);

      lines.forEach((line, idx) => {
        const weekNum = currentCount + idx + 1;
        const cleanTitle = line.replace(/^(module|week)\s*\d+[:\-.]\s*/i, '').trim() || line;
        modulesToAdd.push({
          title: cleanTitle,
          weekNumber: weekNum,
          description: `Curriculum module and assessment requirements for Week ${weekNum}.`,
          studyMaterials: [],
          assignmentGuides: [],
          quizzes: [],
        });
      });
    } else {
      // Professional UK university curriculum structure tailored up to 30 modules
      const standardTopics: string[] = [
        'Academic Foundations, Research Methodologies & Study Frameworks',
        'Theoretical Principles, Systems Architecture & Contemporary Concepts',
        'Governance, Regulatory Standards & Professional Compliance',
        'Strategic Planning, Stakeholder Analysis & Analytical Modeling',
        'Core Operational Infrastructures & Applied Techniques',
        'Quantitative Analysis, Data Metrics & Performance Benchmarks',
        'Critical Problem Solving, Workflow Design & Case Modeling',
        'Ethical Leadership, Corporate Responsibility & Sustainability',
        'Mid-Term Formative Evaluation, Project Brief & Peer Review',
        'Advanced Technical Architectures & Comparative Methodologies',
        'Specialised Case Analysis, Empirical Investigations & Field Data',
        'Digital Transformation, Automation Tools & Cloud Technologies',
        'Enterprise Risk Assessment, Threat Mitigation & Continuity Planning',
        'Cross-Functional Project Management, Agile Sprints & Scoping',
        'Strategic Communication, Stakeholder Pitching & Public Reporting',
        'Business Intelligence, Algorithmic Evaluation & Data Science',
        'International Regulatory Frameworks & Global Industry Standards',
        'Resource Allocation, Financial Governance & Strategic Budgeting',
        'Total Quality Management, ISO Benchmarks & Continuous Auditing',
        'Security Systems, Access Control & Asset Protection Strategy',
        'Literature Synthesis, Scholarly Research & Critical Writing',
        'Experimental Design, Empirical Hypothesis & Diagnostic Testing',
        'Professional Ethics, Industry Code of Conduct & Legal Governance',
        'Organisational Resilience, Change Leadership & Crisis Management',
        'Emerging Industry Trends, Machine Learning & Future Forecasting',
        'Applied Work-Based Learning, Industrial Practicum & Simulation',
        'Comprehensive Coursework Portfolio Assembly & Benchmark Review',
        'Pre-Capstone Proposal, Dissertation Strategy & Defence Framing',
        'Summative Examination, Technical Viva & Peer Evaluation',
        'Final Degree Capstone Presentation, Defence & Credential Award',
      ];

      for (let i = 0; i < count; i++) {
        const weekNum = currentCount + i + 1;
        const topic = standardTopics[i % standardTopics.length];
        const title = i < standardTopics.length ? `Module ${weekNum}: ${topic}` : `Module ${weekNum}: Advanced Module Study ${weekNum}`;
        modulesToAdd.push({
          title,
          weekNumber: weekNum,
          description: `Comprehensive modular curriculum for Week ${weekNum}. Includes lecture topics, syllabus notes, reading materials, and coursework assignments.`,
          studyMaterials: [],
          assignmentGuides: [],
          quizzes: [],
        });
      }
    }

    if (modulesToAdd.length > 0) {
      StorageService.addModulesBatch(course.id, modulesToAdd);
      setIsBatchModuleOpen(false);
      setActionSuccessNotice(`Successfully created and published ${modulesToAdd.length} modules for ${course.code}!`);
      setTimeout(() => setActionSuccessNotice(null), 5000);
      onCourseUpdated();
    }
  };

  // Add Module
  const handleAddModule = (e: React.FormEvent, openMaterialImmediately: boolean = false) => {
    e.preventDefault();
    if (!newModuleTitle.trim()) return;

    const added = StorageService.addModuleToCourse(course.id, {
      title: newModuleTitle.trim(),
      weekNumber: Number(newModuleWeek) || (course.modules?.length || 0) + 1,
      description: newModuleDesc.trim() || 'Comprehensive modular syllabus.',
      studyMaterials: [],
      assignmentGuides: [],
      quizzes: [],
    });

    if (added) {
      setExpandedModules((prev) => ({ ...prev, [added.id]: true }));
    }

    setNewModuleTitle('');
    setNewModuleDesc('');
    setIsAddModuleOpen(false);

    if (added && openMaterialImmediately) {
      setTargetModuleForMaterial(added.id);
      setEditingMaterial(null);
      setIsUploadMaterialOpen(true);
      setActionSuccessNotice(`Module "${added.title}" added! Now add study materials (PDF/Doc) directly under it.`);
    } else {
      setActionSuccessNotice('New module successfully added. You can now add study materials directly under it.');
    }
    setTimeout(() => setActionSuccessNotice(null), 5000);
    onCourseUpdated();
  };

  // Edit Module
  const handleOpenEditModule = (module: CourseModule) => {
    setEditingModule(module);
    setEditModTitle(module.title);
    setEditModWeek(module.weekNumber);
    setEditModDesc(module.description);
  };

  const handleSaveEditModule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingModule || !editModTitle.trim()) return;

    StorageService.updateModule(course.id, editingModule.id, {
      title: editModTitle.trim(),
      weekNumber: Number(editModWeek) || 1,
      description: editModDesc.trim(),
    });

    setEditingModule(null);
    setActionSuccessNotice('Module syllabus updated.');
    setTimeout(() => setActionSuccessNotice(null), 3000);
    onCourseUpdated();
  };

  // Add Item to Module
  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeModuleForNewItem || !newItemTitle.trim()) return;

    StorageService.addModuleItem(course.id, activeModuleForNewItem, {
      type: 'video',
      title: newItemTitle.trim(),
      durationOrPages: newItemDuration.trim() || '45 min',
      videoMetadata: {
        videoUrl:
          newItemVideoUrl.trim() ||
          'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
        durationSeconds: 2700,
        resolutionOptions: ['1080p', '720p', '480p'],
        chapters: [
          { time: 0, title: 'Introduction' },
          { time: 600, title: 'Theoretical Framework' },
          { time: 1800, title: 'Case Analysis' },
        ],
        transcript: [
          { time: 0, speaker: course.instructorName, text: 'Welcome to this syllabus lecture.' },
        ],
        isProtectedDrm: true,
        watermarkEnabled: true,
      },
    });

    setNewItemTitle('');
    setActiveModuleForNewItem(null);
    onCourseUpdated();
  };

  const handleOpenEditItem = (moduleId: string, item: ModuleItem) => {
    setEditingItemModuleId(moduleId);
    setEditingItem(item);
    setEditItemTitle(item.title);
    setEditItemDuration(item.durationOrPages || '45 min');
  };

  const handleSaveEditItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItemModuleId || !editingItem || !editItemTitle.trim()) return;

    StorageService.updateModuleItem(course.id, editingItemModuleId, editingItem.id, {
      title: editItemTitle.trim(),
      durationOrPages: editItemDuration.trim() || '45 min',
    });

    setEditingItem(null);
    setEditingItemModuleId(null);
    onCourseUpdated();
  };

  // Deletion Handlers - Permanent retention rule: Only Administrator can delete directly.
  // Teachers must submit a formal Deletion Request to the Administrator.
  const requestDeletionAsTeacher = (
    targetType: 'module' | 'material' | 'assignment',
    targetId: string,
    targetTitle: string
  ) => {
    setTeacherDeletionItem({
      targetType,
      targetId,
      targetTitle,
      courseCode: course.code,
    });
    setTeacherDeletionReason('');
  };

  const handleSendTeacherDeletionRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!teacherDeletionItem || !teacherDeletionReason.trim()) return;

    StorageService.submitDeletionRequest({
      teacherId: currentUser.id,
      teacherName: currentUser.name,
      targetType: teacherDeletionItem.targetType,
      targetId: teacherDeletionItem.targetId,
      targetTitle: teacherDeletionItem.targetTitle,
      courseCode: course.code,
      reason: teacherDeletionReason.trim(),
    });

    setTeacherDeletionItem(null);
    setActionSuccessNotice(
      `Deletion request submitted to Administrator (Atikur Rahman). Item will remain permanently active until approved by Admin.`
    );
    setTimeout(() => setActionSuccessNotice(null), 5000);
  };

  const handleDeleteModule = (moduleId: string, moduleTitle: string) => {
    if (currentUser.role === 'admin') {
      if (confirm(`ADMIN ACTION: Are you sure you want to permanently delete module "${moduleTitle}" and all attached syllabus items?`)) {
        StorageService.deleteModuleDirectly(course.id, moduleId);
        setActionSuccessNotice(`Module "${moduleTitle}" permanently deleted by Admin.`);
        setTimeout(() => setActionSuccessNotice(null), 3500);
        onCourseUpdated();
      }
    } else if (currentUser.role === 'teacher') {
      requestDeletionAsTeacher('module', moduleId, `Module: ${moduleTitle}`);
    } else {
      alert('Delete permission is strictly reserved for Administrators.');
    }
  };

  const handleDeleteModuleItem = (moduleId: string, itemId: string, itemTitle: string) => {
    if (currentUser.role === 'admin') {
      if (confirm(`ADMIN ACTION: Are you sure you want to permanently delete syllabus item "${itemTitle}"?`)) {
        StorageService.deleteModuleItemDirectly(course.id, moduleId, itemId);
        setActionSuccessNotice(`Syllabus item "${itemTitle}" permanently deleted by Admin.`);
        setTimeout(() => setActionSuccessNotice(null), 3500);
        onCourseUpdated();
      }
    } else if (currentUser.role === 'teacher') {
      requestDeletionAsTeacher('module', itemId, `Syllabus Item: ${itemTitle}`);
    } else {
      alert('Delete permission is strictly reserved for Administrators.');
    }
  };

  const handleDeleteMaterial = (materialId: string, materialTitle: string) => {
    if (currentUser.role === 'admin') {
      if (confirm(`ADMIN ACTION: Are you sure you want to permanently delete study material "${materialTitle}"?`)) {
        StorageService.deleteStudyMaterial(course.id, materialId);
        setActionSuccessNotice(`Study material "${materialTitle}" permanently deleted by Admin.`);
        setTimeout(() => setActionSuccessNotice(null), 3500);
        onCourseUpdated();
      }
    } else if (currentUser.role === 'teacher') {
      requestDeletionAsTeacher('material', materialId, `Study Material: ${materialTitle}`);
    } else {
      alert('Delete permission is strictly reserved for Administrators.');
    }
  };

  const handleEraseAllMaterials = () => {
    if (currentUser.role !== 'admin') {
      alert('Permission denied: Only Administrators can perform bulk content removal.');
      return;
    }
    if (
      confirm(
        'ADMIN ACTION: Are you sure you want to erase study materials across this course? This action cannot be undone.'
      )
    ) {
      StorageService.eraseAllStudyMaterials();
      setActionSuccessNotice('Study materials cleared by Admin.');
      setTimeout(() => setActionSuccessNotice(null), 3500);
      onCourseUpdated();
    }
  };

  const handleDeleteGuide = (guideId: string, guideTitle: string) => {
    if (currentUser.role === 'admin') {
      if (confirm(`ADMIN ACTION: Are you sure you want to permanently delete assignment brief "${guideTitle}"?`)) {
        StorageService.deleteAssignmentGuide(course.id, guideId);
        setActionSuccessNotice(`Assignment brief "${guideTitle}" permanently deleted by Admin.`);
        setTimeout(() => setActionSuccessNotice(null), 3500);
        onCourseUpdated();
      }
    } else if (currentUser.role === 'teacher') {
      requestDeletionAsTeacher('assignment', guideId, `Assignment Brief: ${guideTitle}`);
    } else {
      alert('Delete permission is strictly reserved for Administrators.');
    }
  };

  const handleDeleteQuiz = (quizId: string, quizTitle: string) => {
    if (currentUser.role === 'admin') {
      if (confirm(`ADMIN ACTION: Are you sure you want to permanently delete quiz "${quizTitle}"?`)) {
        StorageService.deleteQuiz(course.id, quizId);
        setActionSuccessNotice(`Quiz "${quizTitle}" permanently deleted by Admin.`);
        setTimeout(() => setActionSuccessNotice(null), 3500);
        onCourseUpdated();
      }
    } else if (currentUser.role === 'teacher') {
      requestDeletionAsTeacher('assignment', quizId, `Quiz: ${quizTitle}`);
    } else {
      alert('Delete permission is strictly reserved for Administrators.');
    }
  };

  // Download PDF or DOC or text file
  const handleDownloadFile = (fileName: string, title: string, base64Url?: string) => {
    if (base64Url && base64Url.startsWith('data:')) {
      const a = document.createElement('a');
      a.href = base64Url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return;
    }
    const content = `AT Academics LMS - Academic Curriculum Document\n\nTitle: ${title}\nCourse: ${course.code} - ${course.title}\nDepartment: ${course.department}\nAuthorized Recipient: ${currentUser.name} (${currentUser.role})\nTimestamp: ${new Date().toISOString()}\n\n--- DOCUMENT CONTENT ---\nOfficial academic curriculum brief and syllabus learning resource.`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName.endsWith('.txt') ? fileName : `${fileName}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Direct one-click document upload under a specific module
  const handleDirectUploadToModule = (moduleId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileName = file.name;
    const ext = fileName.split('.').pop()?.toLowerCase() || 'pdf';
    const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
    const fileSize = Number(sizeMb) < 0.1 ? `${Math.round(file.size / 1024)} KB` : `${sizeMb} MB`;
    const title = fileName.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');

    let category: StudyMaterial['category'] = 'reading_pdf';
    if (ext === 'doc' || ext === 'docx') category = 'doc_document';
    else if (ext === 'ppt' || ext === 'pptx') category = 'lecture_slides';

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = typeof reader.result === 'string' ? reader.result : undefined;
      StorageService.addStudyMaterial(course.id, {
        courseId: course.id,
        moduleId,
        title,
        description: `Official curriculum document uploaded for module.`,
        category,
        fileName,
        fileSize,
        fileType: ext,
        fileContentBase64: base64,
        uploadedBy: currentUser.name,
      });

      setActionSuccessNotice(`"${fileName}" successfully uploaded to module.`);
      setTimeout(() => setActionSuccessNotice(null), 4000);
      onCourseUpdated();
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Open direct study material upload under a specific module
  const handleAddMaterialToModule = (moduleId: string) => {
    setTargetModuleForMaterial(moduleId);
    setEditingMaterial(null);
    setIsUploadMaterialOpen(true);
  };

  // Open direct assignment brief upload under a specific module
  const handleAddGuideToModule = (moduleId: string) => {
    setTargetModuleForGuide(moduleId);
    setEditingGuide(null);
    setIsUploadGuideOpen(true);
  };

  // Open direct quiz creator under a specific module
  const handleAddQuizToModule = (moduleId: string) => {
    setTargetModuleForQuiz(moduleId);
    setEditingQuiz(null);
    setIsQuizModalOpen(true);
  };

  // Open edit modal for a study material
  const handleOpenEditMaterial = (material: StudyMaterial) => {
    setEditingMaterial(material);
    setTargetModuleForMaterial(material.moduleId || null);
    setIsUploadMaterialOpen(true);
  };

  // Open edit modal for an assignment guide / brief
  const handleOpenEditGuide = (guide: AssignmentGuide) => {
    setEditingGuide(guide);
    setTargetModuleForGuide(guide.moduleId || null);
    setIsUploadGuideOpen(true);
  };

  // Open edit modal for a quiz
  const handleOpenEditQuiz = (quiz: Quiz) => {
    setEditingQuiz(quiz);
    setTargetModuleForQuiz(quiz.moduleId || null);
    setIsQuizModalOpen(true);
  };

  // Check if student has submitted assignment for a module / course
  const checkModuleSubmission = (moduleId: string) => {
    const studentIdentifier = currentUser.studentId || currentUser.loginId;
    return submissions.find(
      (s) =>
        (s.studentId === studentIdentifier || s.studentId === currentUser.id) &&
        (s.courseId === course.id || s.courseCode === course.code) &&
        (s.moduleId === moduleId || !s.moduleId)
    );
  };

  // Quick module assignment submission (PDF or DOC)
  const handleFileSubmissionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSubmissionFileName(file.name);
      const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
      setSubmissionFileSize(Number(sizeMb) < 0.1 ? `${Math.round(file.size / 1024)} KB` : `${sizeMb} MB`);
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setSubmissionFilePreview(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmitModuleAssignment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!submittingModule) return;

    const studentIdentifier = currentUser.studentId || currentUser.loginId;
    const finalFileName = submissionFileName.trim() || `Week_${submittingModule.weekNumber}_Assignment_${currentUser.name.replace(/\s+/g, '_')}.pdf`;

    StorageService.submitAssignment({
      assignmentId: `assign-${submittingModule.id}-${Date.now()}`,
      moduleId: submittingModule.id,
      courseId: course.id,
      courseCode: course.code,
      studentId: studentIdentifier,
      studentName: currentUser.name,
      studentEmail: currentUser.email,
      fileName: finalFileName,
      fileSize: submissionFileSize || '1.8 MB',
      fileContentPreview: submissionFilePreview || `Student submission for Week ${submittingModule.weekNumber}: ${submittingModule.title}`,
    });

    const refreshed = StorageService.getSubmissions();
    setSubmissions(refreshed);
    setSubmittingModule(null);
    setSubmissionFileName('');
    setSubmissionFilePreview('');
    setActionSuccessNotice(`Assignment for Week ${submittingModule.weekNumber} submitted! Progress Report is now 100%.`);
    setTimeout(() => setActionSuccessNotice(null), 5000);
    onCourseUpdated();
  };

  return (
    <div className="space-y-6">
      {/* Toast Notice */}
      {actionSuccessNotice && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{actionSuccessNotice}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="relative rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 text-white shadow-sm">
        <div className="relative z-10 p-6 md:p-8 max-w-4xl space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <button
              onClick={onBack}
              className="text-xs font-semibold text-slate-300 hover:text-white inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>← Back to Academic Departments & Programs</span>
            </button>

            {isStaff && (
              <button
                onClick={handleOpenEditCourse}
                className="px-3.5 py-1.5 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 backdrop-blur-xs transition-colors shadow-2xs cursor-pointer"
              >
                <Edit2 className="w-3.5 h-3.5 text-amber-300" />
                <span>Edit Course Details</span>
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300">
            <span className="font-mono font-bold tracking-wider text-slate-100 bg-slate-800 px-2 py-0.5 rounded">
              {course.code}
            </span>
            <span aria-hidden="true">·</span>
            <span>{course.department}</span>
            <span aria-hidden="true">·</span>
            <span>{course.credits} Credits</span>
            <span aria-hidden="true">·</span>
            <span>{course.schedule}</span>
          </div>

          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
            {course.title}
          </h1>

          <p className="text-xs md:text-sm text-slate-300 max-w-2xl leading-relaxed">
            {course.description}
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-2 text-xs text-slate-300">
            <div className="flex items-center gap-2">
              <span className="text-slate-400">Instructor:</span>
              <span className="font-semibold text-white">{course.instructorName}</span>
              <span className="text-slate-500 font-mono text-[11px]">({course.instructorEmail})</span>
            </div>

            <div className="flex items-center gap-2 bg-white/10 px-2.5 py-1 rounded-lg backdrop-blur-xs border border-white/15">
              <span className="text-slate-400">Awarding Body:</span>
              <span className="font-bold text-white font-mono">{course.awardingBody || 'OTHM'}</span>
            </div>

            {(() => {
              const modProg = StorageService.getCourseModuleProgress(
                currentUser.studentId || currentUser.loginId || currentUser.id,
                course.id
              );
              return (
                <div className="flex items-center gap-2 bg-emerald-950/40 px-2.5 py-1 rounded-lg border border-emerald-500/30 text-emerald-200">
                  <span className="text-emerald-300 font-medium">Course Progress:</span>
                  <span className="font-bold font-mono text-white">
                    {modProg.completedCount} / {modProg.totalModules} Modules ({modProg.progressPercent}%)
                  </span>
                </div>
              );
            })()}
          </div>
        </div>

        {/* Ambient background image */}
        <div
          className="absolute inset-0 opacity-20 bg-cover bg-center"
          style={{ backgroundImage: `url(${course.coverImage})` }}
        />
      </div>

      {/* Program Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveTab('modules')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-xl transition-colors whitespace-nowrap cursor-pointer ${
            activeTab === 'modules'
              ? 'bg-white border-t border-x border-slate-200 text-slate-900 shadow-2xs font-bold'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/50'
          }`}
        >
          <Layers className="w-4 h-4 text-blue-600" />
          <span>Course Modules ({course.modules?.length || 0})</span>
        </button>

        <button
          onClick={() => setActiveTab('materials')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-xl transition-colors whitespace-nowrap cursor-pointer ${
            activeTab === 'materials'
              ? 'bg-white border-t border-x border-slate-200 text-slate-900 shadow-2xs font-bold'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/50'
          }`}
        >
          <FileText className="w-4 h-4 text-blue-600" />
          <span>Study Materials ({course.studyMaterials?.length || 0})</span>
        </button>

        <button
          onClick={() => setActiveTab('guides')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-xl transition-colors whitespace-nowrap cursor-pointer ${
            activeTab === 'guides'
              ? 'bg-white border-t border-x border-slate-200 text-slate-900 shadow-2xs font-bold'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/50'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
          <span>Assignment Guides & Briefs ({course.assignmentGuides?.length || 0})</span>
        </button>

        <button
          onClick={() => setActiveTab('quizzes')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-xl transition-colors whitespace-nowrap cursor-pointer ${
            activeTab === 'quizzes'
              ? 'bg-white border-t border-x border-slate-200 text-slate-900 shadow-2xs font-bold'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/50'
          }`}
        >
          <Sparkles className="w-4 h-4 text-purple-600" />
          <span>Quizzes & Tests ({course.quizzes?.length || 0})</span>
        </button>
      </div>

      {/* TAB 1: COURSE MODULES - FIRST SHOW ALL REQUIRED MODULES AS LIST OR TILES */}
      {activeTab === 'modules' && (
        <div className="space-y-6">
          {/* Top Controls: View Switcher (Tiles vs List) & Add Module */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span>Course Modules & Curriculum</span>
                <span className="text-xs font-mono text-slate-500">
                  ({course.modules?.length || 0} Modules Required)
                </span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Every module contains its syllabus, study materials (PDF/Doc), assignment guides, quizzes, and progress report.
              </p>
            </div>

            <div className="flex items-center gap-2">
              {/* Tiles vs List View Toggle */}
              <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200">
                <button
                  onClick={() => setModuleViewMode('tiles')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                    moduleViewMode === 'tiles'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Tiles View"
                >
                  <LayoutGrid className="w-3.5 h-3.5 text-blue-600" />
                  <span>Tiles</span>
                </button>

                <button
                  onClick={() => setModuleViewMode('list')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                    moduleViewMode === 'list'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="List View"
                >
                  <List className="w-3.5 h-3.5 text-slate-700" />
                  <span>List</span>
                </button>
              </div>

              {/* Add Module & Bulk 30 Modules Buttons (Teacher and Admin) */}
              {isStaff && (
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={handleOpenAddModule}
                    className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Add Module</span>
                  </button>

                  <button
                    onClick={handleOpenBatchModules}
                    className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
                    title="Generate and upload up to 30 modules for this course"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>⚡ Setup 30 Modules</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Module search bar & quick controls when modules exist */}
          {course.modules && course.modules.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-white rounded-xl border border-slate-200">
              <div className="flex items-center gap-2 flex-1 min-w-[220px]">
                <Search className="w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={moduleSearchTerm}
                  onChange={(e) => setModuleSearchTerm(e.target.value)}
                  placeholder={`Search in all ${course.modules.length} modules...`}
                  className="w-full text-xs text-slate-900 bg-transparent outline-none placeholder:text-slate-400"
                />
                {moduleSearchTerm && (
                  <button
                    onClick={() => setModuleSearchTerm('')}
                    className="text-xs text-slate-400 hover:text-slate-600 font-mono"
                  >
                    Clear
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="font-mono text-slate-500 font-semibold text-[11px]">
                  {course.modules.length} / 30+ Modules
                </span>
                <span className="text-slate-300">|</span>
                <button
                  type="button"
                  onClick={() => {
                    const allOpen: Record<string, boolean> = {};
                    course.modules.forEach((m) => { allOpen[m.id] = true; });
                    setExpandedModules(allOpen);
                  }}
                  className="text-slate-600 hover:text-slate-900 font-medium cursor-pointer"
                >
                  Expand All
                </button>
                <span className="text-slate-300">·</span>
                <button
                  type="button"
                  onClick={() => setExpandedModules({})}
                  className="text-slate-600 hover:text-slate-900 font-medium cursor-pointer"
                >
                  Collapse All
                </button>
              </div>
            </div>
          )}

          {/* If no modules */}
          {(!course.modules || course.modules.length === 0) ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 space-y-4">
              <Layers className="w-10 h-10 text-slate-300 mx-auto" />
              <div>
                <h3 className="text-base font-bold text-slate-800">No Modules Added Yet</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                  Instructors can create weekly modules and publish study materials (PDF/Doc), assignment briefs, and quizzes directly under each module. You can upload up to 30 modules for a full degree curriculum.
                </p>
              </div>
              {isStaff && (
                <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                  <button
                    onClick={handleOpenAddModule}
                    className="px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded-xl hover:bg-slate-800 cursor-pointer shadow-xs"
                  >
                    + Create Single Module
                  </button>
                  <button
                    onClick={handleOpenBatchModules}
                    className="px-4 py-2 bg-emerald-700 text-white text-xs font-semibold rounded-xl hover:bg-emerald-800 cursor-pointer shadow-xs flex items-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>⚡ Quick Setup 30 Modules</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              {/* 1. TILES VIEW */}
              {moduleViewMode === 'tiles' && (
                    filteredModules.length === 0 ? (
                      <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 space-y-2">
                        <p className="text-sm font-semibold text-slate-700">No modules match &quot;{moduleSearchTerm}&quot;</p>
                        <button onClick={() => setModuleSearchTerm('')} className="text-xs text-blue-600 font-semibold hover:underline">
                          Clear search filter
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {filteredModules.map((module) => {
                          const modMaterials = (course.studyMaterials || []).filter(
                            (sm) => sm.moduleId === module.id
                          );
                          const modGuides = (course.assignmentGuides || []).filter(
                            (ag) => ag.moduleId === module.id
                          );
                          const modQuizzes = (course.quizzes || []).filter(
                            (q) => q.moduleId === module.id
                          );
                          const submission = checkModuleSubmission(module.id);
                          const isComplete =
                            StorageService.isModuleCompleted(
                              currentUser.studentId || currentUser.loginId || currentUser.id,
                              course.id,
                              module.id
                            ) || Boolean(submission);

                      return (
                        <div
                          key={module.id}
                          className={`bg-white rounded-2xl border p-5 shadow-2xs transition-all hover:shadow-md flex flex-col justify-between ${
                            isComplete ? 'border-emerald-200 ring-1 ring-emerald-100' : 'border-slate-200'
                          }`}
                        >
                          <div className="space-y-3">
                            {/* Top badge & progress indicator */}
                            <div className="flex items-center justify-between gap-2">
                              <span className="w-8 h-8 rounded-xl bg-slate-900 text-white font-mono text-xs font-bold flex items-center justify-center shadow-2xs">
                                W{module.weekNumber}
                              </span>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  StorageService.markModuleComplete(
                                    currentUser.studentId || currentUser.loginId || currentUser.id,
                                    course.id,
                                    module.id,
                                    !isComplete
                                  );
                                  onCourseUpdated();
                                }}
                                className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold flex items-center gap-1 cursor-pointer transition-colors ${
                                  isComplete
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200 hover:bg-emerald-200'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                                title="Click to toggle module unit completion"
                              >
                                {isComplete ? (
                                  <>
                                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                    <span>100% COMPLETE</span>
                                  </>
                                ) : (
                                  <span>0% · IN PROGRESS</span>
                                )}
                              </button>
                            </div>

                            <div>
                              <h3 className="text-sm font-bold text-slate-900 line-clamp-1">
                                {module.title}
                              </h3>
                              <p className="text-xs text-slate-500 line-clamp-2 mt-1">
                                {module.description}
                              </p>
                            </div>

                            {/* Counts pill grid */}
                            <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                              <div className="p-2 bg-slate-50 rounded-lg border border-slate-100 flex items-center gap-1.5 text-slate-700">
                                <Video className="w-3.5 h-3.5 text-slate-500" />
                                <span>{module.items?.length || 0} Topics</span>
                              </div>
                              <div className="p-2 bg-slate-50 rounded-lg border border-slate-100 flex items-center gap-1.5 text-blue-700">
                                <FileText className="w-3.5 h-3.5 text-blue-600" />
                                <span>{modMaterials.length} Materials</span>
                              </div>
                              <div className="p-2 bg-slate-50 rounded-lg border border-slate-100 flex items-center gap-1.5 text-emerald-700">
                                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                                <span>{modGuides.length} Briefs</span>
                              </div>
                              <div className="p-2 bg-slate-50 rounded-lg border border-slate-100 flex items-center gap-1.5 text-purple-700">
                                <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                                <span>{modQuizzes.length} Quizzes</span>
                              </div>
                            </div>
                          </div>

                          {/* Action Buttons on Tile */}
                          <div className="pt-4 border-t border-slate-100 flex items-center gap-2 mt-3">
                            <button
                              onClick={() => {
                                setExpandedModules((prev) => ({ ...prev, [module.id]: true }));
                                setModuleViewMode('list');
                              }}
                              className="flex-1 py-1.5 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                            >
                              <span>Explore Module ↓</span>
                            </button>

                            {/* Action buttons on tile */}
                            <div className="flex items-center gap-1.5">
                              {isStaff && (
                                <>
                                  <button
                                    onClick={() => handleAddMaterialToModule(module.id)}
                                    className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                                    title="Add Study Material (PDF/Doc) to this Module"
                                  >
                                    <Upload className="w-3.5 h-3.5 text-blue-600" />
                                  </button>
                                  <button
                                    onClick={() => handleAddGuideToModule(module.id)}
                                    className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                                    title="Add Assignment Brief to this Module"
                                  >
                                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                                  </button>
                                  <button
                                    onClick={() => handleAddQuizToModule(module.id)}
                                    className="p-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                                    title="Create Quiz for this Module"
                                  >
                                    <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                                  </button>
                                  <button
                                    onClick={() => handleOpenEditModule(module)}
                                    className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                                    title="Edit Module"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteModule(module.id, module.title)}
                                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                                    title="Delete Module"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )
            )}

              {/* 2. DETAILED LIST VIEW & EXPANDED MODULAR CONTENT */}
              <div className="space-y-6">
                <div className="border-t border-slate-200 pt-6">
                  <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500 mb-4">
                    Modular Breakdown: Syllabus, Materials, Briefs, Quizzes & Progress
                  </h3>
                </div>

                {filteredModules.map((module) => {
                  const isExpanded = expandedModules[module.id] ?? true;

                  // Study materials for this module (merged course-level and module-level)
                  const directModMaterials = module.studyMaterials || [];
                  const courseLevelMaterials = (course.studyMaterials || []).filter(
                    (sm) => sm.moduleId === module.id
                  );
                  const smMap = new Map<string, StudyMaterial>();
                  courseLevelMaterials.forEach((sm) => smMap.set(sm.id, sm));
                  directModMaterials.forEach((sm) => smMap.set(sm.id, sm));
                  const moduleMaterials = Array.from(smMap.values());

                  // Assignment guides & briefs for this module
                  const directModGuides = module.assignmentGuides || [];
                  const courseLevelGuides = (course.assignmentGuides || []).filter(
                    (ag) => ag.moduleId === module.id
                  );
                  const agMap = new Map<string, AssignmentGuide>();
                  courseLevelGuides.forEach((ag) => agMap.set(ag.id, ag));
                  directModGuides.forEach((ag) => agMap.set(ag.id, ag));
                  const moduleGuides = Array.from(agMap.values());

                  // Quizzes for this module
                  const directModQuizzes = module.quizzes || [];
                  const courseLevelQuizzes = (course.quizzes || []).filter(
                    (q) => q.moduleId === module.id
                  );
                  const qzMap = new Map<string, Quiz>();
                  courseLevelQuizzes.forEach((q) => qzMap.set(q.id, q));
                  directModQuizzes.forEach((q) => qzMap.set(q.id, q));
                  const moduleQuizzes = Array.from(qzMap.values());

                  // Check if student has submitted assignment or marked module completed
                  const moduleSubmission = checkModuleSubmission(module.id);
                  const isComplete =
                    StorageService.isModuleCompleted(
                      currentUser.studentId || currentUser.loginId || currentUser.id,
                      course.id,
                      module.id
                    ) || Boolean(moduleSubmission);

                  return (
                    <div
                      key={module.id}
                      className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs space-y-0"
                    >
                      {/* Module Header Bar */}
                      <div className="flex items-center justify-between p-4 sm:p-5 bg-slate-50/70 border-b border-slate-200">
                        <button
                          onClick={() => toggleModule(module.id)}
                          className="flex-1 flex items-center gap-3.5 text-left hover:text-slate-900 transition-colors cursor-pointer"
                        >
                          <span className="w-9 h-9 rounded-xl bg-slate-900 text-white font-mono text-xs font-bold flex items-center justify-center shrink-0 shadow-2xs">
                            W{module.weekNumber}
                          </span>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-sm sm:text-base font-bold text-slate-900">
                                {module.title}
                              </h3>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  StorageService.markModuleComplete(
                                    currentUser.studentId || currentUser.loginId || currentUser.id,
                                    course.id,
                                    module.id,
                                    !isComplete
                                  );
                                  onCourseUpdated();
                                }}
                                className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold cursor-pointer transition-colors ${
                                  isComplete
                                    ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                    : 'bg-slate-200/80 text-slate-700 hover:bg-slate-300'
                                }`}
                                title="Click to toggle module completion"
                              >
                                {isComplete ? '✓ 100% COMPLETE' : 'IN PROGRESS'}
                              </button>
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5">{module.description}</p>
                          </div>
                        </button>

                        <div className="flex items-center gap-2 ml-2">
                          {/* Direct Teacher actions */}
                          {isStaff && (
                            <>
                              <button
                                onClick={() => handleAddMaterialToModule(module.id)}
                                className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-semibold rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                                title="Add Study Material (PDF or Doc) directly under this module"
                              >
                                <Upload className="w-3.5 h-3.5 text-blue-600" />
                                <span className="hidden sm:inline">+ Add Material</span>
                              </button>

                              <button
                                onClick={() => handleAddGuideToModule(module.id)}
                                className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-semibold rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                                title="Add Assignment Brief directly under this module"
                              >
                                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                                <span className="hidden md:inline">+ Add Brief</span>
                              </button>

                              <button
                                onClick={() => handleAddQuizToModule(module.id)}
                                className="px-2.5 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-xs font-semibold rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                                title="Create Quiz directly under this module"
                              >
                                <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                                <span className="hidden md:inline">+ Add Quiz</span>
                              </button>

                              <button
                                onClick={() => handleOpenEditModule(module)}
                                className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors cursor-pointer"
                                title="Edit Module"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() => handleDeleteModule(module.id, module.title)}
                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                title="Delete Module"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}

                          <button
                            onClick={() => toggleModule(module.id)}
                            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                          >
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      {/* EXPANDED CONTENT UNDER MODULE: SYLLABUS, MATERIALS, BRIEFS, QUIZZES, PROGRESS */}
                      {isExpanded && (
                        <div className="p-5 sm:p-6 space-y-6 divide-y divide-slate-100">
                          {/* 1. SYLLABUS SECTION */}
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <h4 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                                <BookOpen className="w-3.5 h-3.5 text-slate-500" />
                                <span>1. Syllabus & Learning Topics</span>
                              </h4>

                              {isStaff && (
                                <button
                                  onClick={() => setActiveModuleForNewItem(module.id)}
                                  className="px-2 py-1 text-[11px] font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                                >
                                  + Add Syllabus Topic
                                </button>
                              )}
                            </div>

                            {(!module.items || module.items.length === 0) ? (
                              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-400 italic text-center">
                                No syllabus lecture topics added yet.
                              </div>
                            ) : (
                              <div className="space-y-2">
                                {module.items.map((item) => (
                                  <div
                                    key={item.id}
                                    className="p-3 rounded-xl border border-slate-200 bg-slate-50/60 flex items-center justify-between gap-3 hover:bg-slate-50 transition-colors"
                                  >
                                    <div className="flex items-center gap-3 min-w-0">
                                      <div className="p-2 rounded-lg bg-slate-900 text-white shrink-0">
                                        <Video className="w-3.5 h-3.5" />
                                      </div>
                                      <div className="truncate">
                                        <h5 className="text-xs font-bold text-slate-900 truncate">
                                          {item.title}
                                        </h5>
                                        <div className="flex items-center gap-2 text-[11px] text-slate-500 font-mono mt-0.5">
                                          <span>{item.durationOrPages || '45 min'}</span>
                                          <span>·</span>
                                          <span className="text-emerald-700 font-semibold flex items-center gap-1">
                                            <ShieldCheck className="w-3 h-3" /> DRM Protected Stream
                                          </span>
                                        </div>
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-1.5 shrink-0">
                                      <button
                                        onClick={() => onSelectLecture(item)}
                                        className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
                                      >
                                        <Play className="w-3 h-3" />
                                        <span>Study Topic</span>
                                      </button>

                                      {isStaff && (
                                        <button
                                          onClick={() => handleOpenEditItem(module.id, item)}
                                          className="p-1.5 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer"
                                          title="Edit Topic"
                                        >
                                          <Edit2 className="w-3 h-3" />
                                        </button>
                                      )}

                                      <button
                                        onClick={() =>
                                          handleDeleteModuleItem(module.id, item.id, item.title)
                                        }
                                        className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                                        title="Delete Topic"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* 2. STUDY MATERIALS SECTION (PDF & DOC DIRECTLY UNDER MODULE) */}
                          <div className="pt-4 space-y-3">
                            <div className="flex items-center justify-between">
                              <h4 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                                <FileText className="w-3.5 h-3.5 text-blue-600" />
                                <span>2. Study Materials (PDF & Doc Files)</span>
                              </h4>

                              {isStaff && (
                                <div className="flex items-center gap-2">
                                  <label
                                    className="px-2.5 py-1 text-[11px] font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                                    title="Upload PDF or Doc directly to this module"
                                  >
                                    <Upload className="w-3 h-3" />
                                    <span>Upload Document</span>
                                    <input
                                      type="file"
                                      className="hidden"
                                      accept=".pdf,.doc,.docx,.txt,.ppt,.pptx,.xls,.xlsx"
                                      onChange={(e) => handleDirectUploadToModule(module.id, e)}
                                    />
                                  </label>
                                  <button
                                    onClick={() => handleAddMaterialToModule(module.id)}
                                    className="px-2.5 py-1 text-[11px] font-semibold text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                                  >
                                    <span>+ Custom Material</span>
                                  </button>
                                </div>
                              )}
                            </div>

                            {moduleMaterials.length === 0 ? (
                              <div className="p-4 bg-slate-50 rounded-xl border border-dashed border-slate-300 text-xs text-slate-500 text-center space-y-2">
                                <p className="italic">No study materials attached to this module yet.</p>
                                {isStaff && (
                                  <div className="flex items-center justify-center gap-2 pt-1">
                                    <label className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-[11px] cursor-pointer inline-flex items-center gap-1.5 shadow-2xs">
                                      <Upload className="w-3.5 h-3.5" />
                                      <span>Browse & Upload PDF / Doc</span>
                                      <input
                                        type="file"
                                        className="hidden"
                                        accept=".pdf,.doc,.docx,.txt,.ppt,.pptx,.xls,.xlsx"
                                        onChange={(e) => handleDirectUploadToModule(module.id, e)}
                                      />
                                    </label>
                                    <button
                                      onClick={() => handleAddMaterialToModule(module.id)}
                                      className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-lg font-semibold text-[11px] cursor-pointer"
                                    >
                                      Enter Details Manually
                                    </button>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {moduleMaterials.map((mat) => {
                                  const isPdf = mat.fileName.endsWith('.pdf') || mat.fileType === 'pdf';
                                  const isDoc =
                                    mat.fileName.endsWith('.doc') ||
                                    mat.fileName.endsWith('.docx') ||
                                    mat.fileType === 'doc' ||
                                    mat.fileType === 'docx';

                                  return (
                                    <div
                                      key={mat.id}
                                      className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-2 hover:border-blue-200 transition-colors"
                                    >
                                      <div className="flex items-start justify-between gap-2">
                                        <div className="flex items-center gap-2">
                                          <span
                                            className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase ${
                                              isPdf
                                                ? 'bg-red-100 text-red-700'
                                                : isDoc
                                                ? 'bg-blue-100 text-blue-700'
                                                : 'bg-slate-100 text-slate-700'
                                            }`}
                                          >
                                            {isPdf ? 'PDF' : isDoc ? 'DOC' : 'FILE'}
                                          </span>
                                          <h5 className="text-xs font-bold text-slate-900 truncate">
                                            {mat.title}
                                          </h5>
                                        </div>

                                        <div className="flex items-center gap-1">
                                          <button
                                            onClick={() =>
                                              handleDownloadFile(mat.fileName, mat.title, mat.fileContentBase64)
                                            }
                                            className="p-1 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors cursor-pointer"
                                            title="Download Document"
                                          >
                                            <Download className="w-3.5 h-3.5" />
                                          </button>
                                          {isStaff && (
                                            <>
                                              <button
                                                onClick={() => handleOpenEditMaterial(mat)}
                                                className="p-1 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                                                title="Edit Study Material"
                                              >
                                                <Edit2 className="w-3.5 h-3.5" />
                                              </button>
                                              <button
                                                onClick={() => handleDeleteMaterial(mat.id, mat.title)}
                                                className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                                                title="Delete Study Material"
                                              >
                                                <Trash2 className="w-3.5 h-3.5" />
                                              </button>
                                            </>
                                          )}
                                        </div>
                                      </div>

                                      <p className="text-[11px] text-slate-500 line-clamp-2">
                                        {mat.description}
                                      </p>

                                      <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 pt-1 border-t border-slate-100">
                                        <span className="truncate max-w-[140px]">{mat.fileName}</span>
                                        <span>{mat.fileSize}</span>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>

                          {/* 3. ASSIGNMENT GUIDES & BRIEFS SECTION */}
                          <div className="pt-4 space-y-3">
                            <div className="flex items-center justify-between">
                              <h4 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                                <span>3. Assignment Guides & Briefs</span>
                              </h4>

                              {isStaff && (
                                <button
                                  onClick={() => handleAddGuideToModule(module.id)}
                                  className="px-2.5 py-1 text-[11px] font-semibold text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                                >
                                  <Plus className="w-3 h-3" />
                                  <span>+ Add Assignment Brief</span>
                                </button>
                              )}
                            </div>

                            {moduleGuides.length === 0 ? (
                              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-400 italic text-center">
                                No assignment guides published for this module yet.
                              </div>
                            ) : (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {moduleGuides.map((guide) => (
                                  <div
                                    key={guide.id}
                                    className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-2 hover:border-emerald-200 transition-colors"
                                  >
                                    <div className="flex items-start justify-between gap-2">
                                      <h5 className="text-xs font-bold text-slate-900 truncate">
                                        {guide.title}
                                      </h5>
                                      <div className="flex items-center gap-1">
                                        <button
                                          onClick={() => handleDownloadFile(guide.fileName, guide.title)}
                                          className="p-1 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors cursor-pointer"
                                          title="Download Brief"
                                        >
                                          <Download className="w-3.5 h-3.5" />
                                        </button>
                                        {isStaff && (
                                          <>
                                            <button
                                              onClick={() => handleOpenEditGuide(guide)}
                                              className="p-1 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                                              title="Edit Assignment Brief"
                                            >
                                              <Edit2 className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                              onClick={() => handleDeleteGuide(guide.id, guide.title)}
                                              className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                                              title="Delete Assignment Brief"
                                            >
                                              <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                          </>
                                        )}
                                      </div>
                                    </div>

                                    <p className="text-[11px] text-slate-500 line-clamp-2">
                                      {guide.description}
                                    </p>

                                    <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 pt-1 border-t border-slate-100">
                                      <span>Total: {guide.totalMarks || 100} Marks</span>
                                      {guide.dueDate && (
                                        <span className="text-amber-700 font-semibold">
                                          Due: {new Date(guide.dueDate).toLocaleDateString()}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* 4. QUIZZES AND TESTS SECTION */}
                          <div className="pt-4 space-y-3">
                            <div className="flex items-center justify-between">
                              <h4 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                                <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                                <span>4. Quizzes & Tests</span>
                              </h4>

                              {isStaff && (
                                <button
                                  onClick={() => handleAddQuizToModule(module.id)}
                                  className="px-2.5 py-1 text-[11px] font-semibold text-purple-700 hover:text-purple-900 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                                >
                                  <Plus className="w-3 h-3" />
                                  <span>+ Create Quiz for Module</span>
                                </button>
                              )}
                            </div>

                            {moduleQuizzes.length === 0 ? (
                              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-400 italic text-center">
                                No quizzes created for this module yet.
                              </div>
                            ) : (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {moduleQuizzes.map((quiz) => (
                                  <div
                                    key={quiz.id}
                                    className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-2 hover:border-purple-200 transition-colors"
                                  >
                                    <div className="flex items-start justify-between gap-2">
                                      <h5 className="text-xs font-bold text-slate-900 truncate">
                                        {quiz.title}
                                      </h5>
                                      <span className="px-1.5 py-0.5 rounded bg-purple-100 text-purple-800 text-[10px] font-mono font-bold">
                                        {quiz.questions?.length || 0} Questions
                                      </span>
                                    </div>

                                    <p className="text-[11px] text-slate-500 line-clamp-2">
                                      {quiz.description || 'Modular test assessing curriculum objectives.'}
                                    </p>

                                    <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                                      <span className="text-[10px] font-mono text-slate-400">
                                        {quiz.timeLimitMinutes} Mins · Pass: {quiz.passingScorePercent}%
                                      </span>

                                      <div className="flex items-center gap-1.5">
                                        {isStaff && (
                                          <>
                                            <button
                                              onClick={() => handleOpenEditQuiz(quiz)}
                                              className="p-1 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                                              title="Edit Quiz"
                                            >
                                              <Edit2 className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                              onClick={() => handleDeleteQuiz(quiz.id, quiz.title)}
                                              className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                                              title="Delete Quiz"
                                            >
                                              <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                          </>
                                        )}
                                        <button
                                          onClick={() => setActiveQuizToTake(quiz)}
                                          className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                                        >
                                          Take Quiz
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* 5. PROGRESS REPORT SECTION (100% ONCE STUDENT SUBMITS ASSIGNMENT) */}
                          <div className="pt-4 space-y-3">
                            <h4 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                              <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                              <span>5. Module Progress Report</span>
                            </h4>

                            <div
                              className={`p-4 rounded-xl border transition-all ${
                                isComplete
                                  ? 'bg-emerald-50/70 border-emerald-200'
                                  : 'bg-slate-50 border-slate-200'
                              }`}
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                                <div className="flex items-center gap-2">
                                  {isComplete ? (
                                    <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                                      <Check className="w-3.5 h-3.5" />
                                    </div>
                                  ) : (
                                    <div className="w-6 h-6 rounded-full bg-slate-300 text-slate-700 flex items-center justify-center font-bold text-xs">
                                      !
                                    </div>
                                  )}
                                  <div>
                                    <span className="text-xs font-bold text-slate-900 block">
                                      {isComplete
                                        ? 'Module Requirements Satisfied (100% Completed)'
                                        : 'Pending Assignment Submission'}
                                    </span>
                                    <span className="text-[11px] text-slate-500">
                                      {isComplete
                                        ? `Assignment submission verified: ${moduleSubmission?.fileName}`
                                        : 'Once the student submits the assignment, they will get 100% on the progress report.'}
                                    </span>
                                  </div>
                                </div>

                                <span
                                  className={`px-3 py-1 rounded-full text-xs font-mono font-bold ${
                                    isComplete
                                      ? 'bg-emerald-600 text-white shadow-2xs'
                                      : 'bg-slate-200 text-slate-700'
                                  }`}
                                >
                                  {isComplete ? '100% COMPLETED' : '0% PROGRESS'}
                                </span>
                              </div>

                              {/* Progress bar */}
                              <div className="w-full h-3 bg-white rounded-full overflow-hidden border border-slate-200/80 mb-3">
                                <div
                                  className={`h-full rounded-full transition-all duration-700 ${
                                    isComplete ? 'bg-emerald-500' : 'bg-slate-300'
                                  }`}
                                  style={{ width: isComplete ? '100%' : '0%' }}
                                />
                              </div>

                              {/* Submission action or Details */}
                              {isComplete && moduleSubmission ? (
                                <div className="text-[11px] font-mono text-emerald-800 flex flex-wrap items-center justify-between pt-1 gap-2">
                                  <span>✓ File: {moduleSubmission.fileName} ({moduleSubmission.fileSize})</span>
                                  <div className="flex items-center gap-2">
                                    <span>Submitted: {new Date(moduleSubmission.submittedAt || '').toLocaleDateString()}</span>
                                    <button
                                      onClick={() => setSubmittingModule(module)}
                                      className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-[11px] font-semibold cursor-pointer shadow-2xs flex items-center gap-1"
                                      title="Upload a new or revised assignment document"
                                    >
                                      <Upload className="w-3 h-3" />
                                      <span>Re-upload Submission</span>
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="pt-2 flex items-center justify-end">
                                  <button
                                    onClick={() => setSubmittingModule(module)}
                                    className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                                  >
                                    <Upload className="w-3.5 h-3.5" />
                                    <span>Submit Assignment for Week {module.weekNumber} (Get 100%)</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* TAB 2: ALL STUDY MATERIALS (OVERVIEW) */}
      {activeTab === 'materials' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-600" />
                <span>All Study Materials (PDF & Doc Files)</span>
              </h2>
              <p className="text-xs text-slate-500">
                Official curriculum slides, readings, and reference documents across all modules.
              </p>
            </div>

            <div className="flex items-center gap-2">
              {isStaff && (
                <>
                  {currentUser.role === 'admin' && (
                    <button
                      onClick={handleEraseAllMaterials}
                      className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                      title="Erase all study materials across courses"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                      <span>Erase All Materials</span>
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setTargetModuleForMaterial(null);
                      setEditingMaterial(null);
                      setIsUploadMaterialOpen(true);
                    }}
                    className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>+ Upload Study Material</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {(!course.studyMaterials || course.studyMaterials.length === 0) ? (
            <div className="p-10 text-center bg-white rounded-2xl border border-slate-200 space-y-3">
              <FileText className="w-8 h-8 text-slate-300 mx-auto" />
              <h3 className="text-sm font-bold text-slate-800">No Study Materials Uploaded Yet</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Teachers can upload PDF and Doc files directly under each module.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {course.studyMaterials.map((mat) => {
                const isPdf = mat.fileName.endsWith('.pdf') || mat.fileType === 'pdf';
                const isDoc =
                  mat.fileName.endsWith('.doc') ||
                  mat.fileName.endsWith('.docx') ||
                  mat.fileType === 'doc' ||
                  mat.fileType === 'docx';

                const targetMod = course.modules?.find((m) => m.id === mat.moduleId);

                return (
                  <div
                    key={mat.id}
                    className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-3 hover:border-blue-200 transition-colors flex flex-col justify-between"
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                            isPdf
                              ? 'bg-red-100 text-red-700'
                              : isDoc
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {isPdf ? 'PDF' : isDoc ? 'DOC' : 'FILE'}
                        </span>

                        {targetMod && (
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-mono font-semibold">
                            Week {targetMod.weekNumber}
                          </span>
                        )}
                      </div>

                      <h4 className="text-xs font-bold text-slate-900 line-clamp-1">{mat.title}</h4>
                      <p className="text-xs text-slate-500 line-clamp-2">{mat.description}</p>
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-[10px] font-mono text-slate-400">{mat.fileSize}</span>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() =>
                            handleDownloadFile(mat.fileName, mat.title, mat.fileContentBase64)
                          }
                          className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Download className="w-3 h-3" />
                          <span>Download</span>
                        </button>
                        {isStaff && (
                          <>
                            <button
                              onClick={() => handleOpenEditMaterial(mat)}
                              className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                              title="Edit Study Material"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteMaterial(mat.id, mat.title)}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                              title="Delete Study Material"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: ALL ASSIGNMENT GUIDES & BRIEFS */}
      {activeTab === 'guides' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>Assignment Briefs & Marking Specifications</span>
              </h2>
              <p className="text-xs text-slate-500">
                Official rubrics and specifications for student coursework across modules.
              </p>
            </div>

            {isStaff && (
              <button
                onClick={() => {
                  setTargetModuleForGuide(null);
                  setEditingGuide(null);
                  setIsUploadGuideOpen(true);
                }}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Publish Brief</span>
              </button>
            )}
          </div>

          {(!course.assignmentGuides || course.assignmentGuides.length === 0) ? (
            <div className="p-10 text-center bg-white rounded-2xl border border-slate-200 space-y-3">
              <FileSpreadsheet className="w-8 h-8 text-slate-300 mx-auto" />
              <h3 className="text-sm font-bold text-slate-800">No Assignment Briefs Published Yet</h3>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {course.assignmentGuides.map((guide) => (
                <div
                  key={guide.id}
                  className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-3 hover:border-emerald-200 transition-colors flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-slate-900 line-clamp-1">{guide.title}</h4>
                    <p className="text-xs text-slate-500 line-clamp-2">{guide.description}</p>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[10px] font-mono text-slate-400">
                      {guide.totalMarks || 100} Marks
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleDownloadFile(guide.fileName, guide.title)}
                        className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Download className="w-3 h-3" />
                        <span>Download Brief</span>
                      </button>
                      {isStaff && (
                        <>
                          <button
                            onClick={() => handleOpenEditGuide(guide)}
                            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                            title="Edit Assignment Brief"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteGuide(guide.id, guide.title)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            title="Delete Assignment Brief"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: ALL QUIZZES & TESTS */}
      {activeTab === 'quizzes' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-600" />
                <span>Quizzes & Assessment Tests</span>
              </h2>
              <p className="text-xs text-slate-500">
                Interactive modular quizzes assessing knowledge of course concepts.
              </p>
            </div>

            {isStaff && (
              <button
                onClick={() => {
                  setTargetModuleForQuiz(null);
                  setIsQuizModalOpen(true);
                }}
                className="px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Create Quiz</span>
              </button>
            )}
          </div>

          {(!course.quizzes || course.quizzes.length === 0) ? (
            <div className="p-10 text-center bg-white rounded-2xl border border-slate-200 space-y-3">
              <Sparkles className="w-8 h-8 text-slate-300 mx-auto" />
              <h3 className="text-sm font-bold text-slate-800">No Quizzes Created Yet</h3>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {course.quizzes.map((quiz) => (
                <div
                  key={quiz.id}
                  className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-3 hover:border-purple-200 transition-colors flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-900 line-clamp-1">{quiz.title}</h4>
                      <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-800 text-[10px] font-mono font-bold">
                        {quiz.questions?.length || 0} Qs
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 line-clamp-2">{quiz.description}</p>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[10px] font-mono text-slate-400">
                      {quiz.timeLimitMinutes} Mins · Pass: {quiz.passingScorePercent}%
                    </span>
                    <div className="flex items-center gap-1.5">
                      {isStaff && (
                        <>
                          <button
                            onClick={() => handleOpenEditQuiz(quiz)}
                            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                            title="Edit Quiz"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteQuiz(quiz.id, quiz.title)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            title="Delete Quiz"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => setActiveQuizToTake(quiz)}
                        className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                      >
                        Take Quiz
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* QUICK IN-MODULE ASSIGNMENT SUBMISSION MODAL */}
      {submittingModule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-emerald-50/70">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                  <Upload className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Submit Assignment: Week {submittingModule.weekNumber}
                  </h3>
                  <p className="text-xs text-slate-500">{submittingModule.title}</p>
                </div>
              </div>
              <button
                onClick={() => setSubmittingModule(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitModuleAssignment} className="p-5 space-y-4">
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-800 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Immediate Progress Report Achievement</span>
                </div>
                <p className="text-[11px] text-emerald-900/80">
                  Submitting your assignment document guarantees 100% completion on this module&apos;s progress report.
                </p>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Upload Assignment Document (PDF or Doc)
                </label>
                <div className="flex items-center gap-3">
                  <label className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-lg cursor-pointer border border-slate-300 transition-colors flex items-center gap-1.5 shadow-2xs">
                    <Upload className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Browse PDF or Doc File</span>
                    <input
                      type="file"
                      onChange={handleFileSubmissionChange}
                      className="hidden"
                      accept=".pdf,.doc,.docx,.txt"
                    />
                  </label>
                  <div className="text-xs font-mono text-slate-600 truncate flex-1">
                    {submissionFileName ? `${submissionFileName} (${submissionFileSize})` : 'No file selected yet'}
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSubmittingModule(null)}
                  className="px-4 py-2 border border-slate-200 text-xs font-semibold text-slate-600 rounded-xl hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Submit Assignment & Complete (100%)</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODALS */}
      {/* 1. Add/Edit Study Material Modal */}
      <MaterialUploadModal
        course={course}
        currentUser={currentUser}
        isOpen={isUploadMaterialOpen}
        onClose={() => {
          setIsUploadMaterialOpen(false);
          setEditingMaterial(null);
          setTargetModuleForMaterial(null);
        }}
        initialMaterial={editingMaterial}
        initialModuleId={targetModuleForMaterial}
        onMaterialUploaded={() => {
          setIsUploadMaterialOpen(false);
          setActionSuccessNotice('Study material successfully published.');
          setTimeout(() => setActionSuccessNotice(null), 3000);
          onCourseUpdated();
        }}
      />

      {/* 2. Add/Edit Assignment Guide Modal */}
      <AssignmentGuideModal
        course={course}
        currentUser={currentUser}
        isOpen={isUploadGuideOpen}
        onClose={() => {
          setIsUploadGuideOpen(false);
          setEditingGuide(null);
          setTargetModuleForGuide(null);
        }}
        initialGuide={editingGuide}
        initialModuleId={targetModuleForGuide}
        onGuideUploaded={() => {
          setIsUploadGuideOpen(false);
          setActionSuccessNotice('Assignment brief successfully published.');
          setTimeout(() => setActionSuccessNotice(null), 3000);
          onCourseUpdated();
        }}
      />

      {/* 3. Create or Edit Quiz Modal */}
      <QuizModal
        course={course}
        currentUser={currentUser}
        isOpen={isQuizModalOpen}
        initialModuleId={targetModuleForQuiz}
        initialQuiz={editingQuiz}
        onClose={() => {
          setIsQuizModalOpen(false);
          setEditingQuiz(null);
          setTargetModuleForQuiz(null);
        }}
        onQuizCreated={() => {
          setIsQuizModalOpen(false);
          setEditingQuiz(null);
          setTargetModuleForQuiz(null);
          setActionSuccessNotice('Assessment quiz saved successfully.');
          setTimeout(() => setActionSuccessNotice(null), 3000);
          onCourseUpdated();
        }}
      />

      {/* 4. Quiz Taker Modal */}
      {activeQuizToTake && (
        <QuizTakerModal
          quiz={activeQuizToTake}
          currentUser={currentUser}
          isOpen={Boolean(activeQuizToTake)}
          onClose={() => setActiveQuizToTake(null)}
          onAttemptCompleted={() => {
            setActiveQuizToTake(null);
            onCourseUpdated();
          }}
        />
      )}

      {/* 5. Add Single Module Modal */}
      {isAddModuleOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Add New Course Module</h3>
                <p className="text-[11px] text-slate-500">Supports full 30-week modular degree programs</p>
              </div>
              <button
                onClick={() => setIsAddModuleOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddModule} className="p-5 space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Week # (1-60)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="60"
                    value={newModuleWeek}
                    onChange={(e) => setNewModuleWeek(Number(e.target.value) || 1)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold"
                    required
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Module Title
                  </label>
                  <input
                    type="text"
                    value={newModuleTitle}
                    onChange={(e) => setNewModuleTitle(e.target.value)}
                    placeholder="e.g. Strategic Management Fundamentals"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Description / Syllabus Overview
                </label>
                <textarea
                  value={newModuleDesc}
                  onChange={(e) => setNewModuleDesc(e.target.value)}
                  rows={3}
                  placeholder="Summarize key learning objectives and topics..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 space-y-1 font-mono">
                <div className="flex items-center justify-between font-semibold text-slate-700">
                  <span>Current Module Sequence:</span>
                  <span>Week {newModuleWeek}</span>
                </div>
                <p className="text-slate-500 font-sans">
                  Tip: You can add modules one by one up to 30+ weeks, or use &quot;⚡ Quick Setup 30 Modules&quot; to build all 30 modules in one click.
                </p>
              </div>

              <div className="pt-2 flex flex-wrap items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModuleOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-lg cursor-pointer"
                >
                  Add Module
                </button>
                <button
                  type="button"
                  onClick={(e) => handleAddModule(e, true)}
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg cursor-pointer shadow-xs flex items-center gap-1.5"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Add Module & Upload Materials</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5b. Batch Setup 30 Modules Modal */}
      {isBatchModuleOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-900 text-white">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">⚡ Quick Setup 30 Course Modules</h3>
                  <p className="text-[11px] text-slate-300">
                    Instantly build up to 30 structured weekly modules for {course.code}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsBatchModuleOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateBatchModules} className="p-5 space-y-4">
              <div className="bg-emerald-50 border border-emerald-200 p-3.5 rounded-xl space-y-1">
                <div className="flex items-center gap-2 text-emerald-900 font-bold text-xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Full Degree Modular Curriculum (30 Modules)</span>
                </div>
                <p className="text-[11px] text-emerald-800 leading-relaxed">
                  Currently {course.modules?.length || 0} modules exist. This tool extends and uploads the full 30-week modular syllabus so teachers can upload study materials, briefs, and exams for every week.
                </p>
              </div>

              {/* Mode Selection */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-700 block">
                  Select Generation Mode:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setBatchMode('curriculum')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      batchMode === 'curriculum'
                        ? 'border-emerald-600 bg-emerald-50/50 ring-1 ring-emerald-500'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <span className="text-xs font-bold text-slate-900 block">
                      Auto-Generate 30 Modules
                    </span>
                    <span className="text-[11px] text-slate-500 block mt-0.5">
                      Progressive UK degree curriculum structure (Weeks 1 to 30)
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setBatchMode('custom')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      batchMode === 'custom'
                        ? 'border-emerald-600 bg-emerald-50/50 ring-1 ring-emerald-500'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <span className="text-xs font-bold text-slate-900 block">
                      Custom Titles / Paste List
                    </span>
                    <span className="text-[11px] text-slate-500 block mt-0.5">
                      Paste custom syllabus or CSV lines (one per module)
                    </span>
                  </button>
                </div>
              </div>

              {batchMode === 'curriculum' ? (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-700 block">
                      Number of Modules to Add
                    </label>
                    <span className="text-[11px] font-mono font-bold text-emerald-700">
                      {batchCount} Modules
                    </span>
                  </div>
                  <input
                    type="number"
                    min="1"
                    max="60"
                    value={batchCount}
                    onChange={(e) => setBatchCount(Number(e.target.value) || 30)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Generates modules from Week {(course.modules?.length || 0) + 1} to Week {(course.modules?.length || 0) + batchCount} covering core foundations, intermediate theory, practical applications, risk governance, and capstone defence.
                  </p>
                </div>
              ) : (
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Paste Custom Module Titles (One Per Line, up to 30):
                  </label>
                  <textarea
                    rows={6}
                    value={batchCustomTitles}
                    onChange={(e) => setBatchCustomTitles(e.target.value)}
                    placeholder="Module 1: Foundations of Academic Research&#10;Module 2: Theoretical Principles&#10;Module 3: Strategic Quality Governance&#10;...&#10;Module 30: Capstone Project Defence"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg font-mono leading-relaxed"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Each line becomes a sequential module starting from Week {(course.modules?.length || 0) + 1}.
                  </p>
                </div>
              )}

              <div className="pt-2 flex flex-wrap items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsBatchModuleOpen(false)}
                  className="px-3.5 py-1.5 text-xs text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Publish {batchMode === 'custom' ? 'Custom' : batchCount} Modules</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Edit Module Modal */}
      {editingModule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="text-sm font-bold text-slate-900">Edit Module Syllabus</h3>
              <button
                onClick={() => setEditingModule(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditModule} className="p-5 space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Week #
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={editModWeek}
                    onChange={(e) => setEditModWeek(Number(e.target.value) || 1)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold"
                    required
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Module Title
                  </label>
                  <input
                    type="text"
                    value={editModTitle}
                    onChange={(e) => setEditModTitle(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg font-bold"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Description
                </label>
                <textarea
                  value={editModDesc}
                  onChange={(e) => setEditModDesc(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingModule(null)}
                  className="px-3.5 py-1.5 text-xs text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-lg hover:bg-slate-800 cursor-pointer shadow-xs"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. Add Syllabus Topic Modal */}
      {activeModuleForNewItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="text-sm font-bold text-slate-900">Add Syllabus Topic</h3>
              <button
                onClick={() => setActiveModuleForNewItem(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddItem} className="p-5 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Topic Title
                </label>
                <input
                  type="text"
                  value={newItemTitle}
                  onChange={(e) => setNewItemTitle(e.target.value)}
                  placeholder="e.g. Introduction to Competitive Advantage"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Duration / Estimated Time
                </label>
                <input
                  type="text"
                  value={newItemDuration}
                  onChange={(e) => setNewItemDuration(e.target.value)}
                  placeholder="e.g. 45 min"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Video Stream URL
                </label>
                <input
                  type="text"
                  value={newItemVideoUrl}
                  onChange={(e) => setNewItemVideoUrl(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg font-mono text-[11px]"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setActiveModuleForNewItem(null)}
                  className="px-3.5 py-1.5 text-xs text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-lg hover:bg-slate-800 cursor-pointer shadow-xs"
                >
                  Add Topic
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 8. Edit Syllabus Topic Modal */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="text-sm font-bold text-slate-900">Edit Syllabus Topic</h3>
              <button
                onClick={() => setEditingItem(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditItem} className="p-5 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Topic Title
                </label>
                <input
                  type="text"
                  value={editItemTitle}
                  onChange={(e) => setEditItemTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg font-bold"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Duration / Estimated Time
                </label>
                <input
                  type="text"
                  value={editItemDuration}
                  onChange={(e) => setEditItemDuration(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-3.5 py-1.5 text-xs text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-lg hover:bg-slate-800 cursor-pointer shadow-xs"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 9. Edit Course Details (Admin) */}
      {isEditCourseOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="text-sm font-bold text-slate-900">Edit Program Specifications (Admin)</h3>
              <button
                onClick={() => setIsEditCourseOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditCourse} className="p-5 space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Course Code</label>
                  <input
                    type="text"
                    value={editCode}
                    onChange={(e) => setEditCode(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold"
                    required
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Course Title</label>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg font-bold"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Academic Department</label>
                  <select
                    value={editDeptId}
                    onChange={(e) => setEditDeptId(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                  >
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Credits</label>
                  <input
                    type="number"
                    value={editCredits}
                    onChange={(e) => setEditCredits(Number(e.target.value) || 30)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Description</label>
                <textarea
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditCourseOpen(false)}
                  className="px-3.5 py-1.5 text-xs text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-lg hover:bg-slate-800 cursor-pointer shadow-xs"
                >
                  Save Program Details
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Teacher Content Deletion Request Modal */}
      {teacherDeletionItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-xs">
                  REQ
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Request Item Deletion</h3>
                  <p className="text-[11px] text-slate-500">Administrator Approval Required</p>
                </div>
              </div>
              <button
                onClick={() => setTeacherDeletionItem(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSendTeacherDeletionRequest} className="mt-4 space-y-4 text-xs">
              <div className="p-3 bg-amber-50/70 border border-amber-200/60 rounded-xl text-amber-900 space-y-1">
                <div className="font-semibold text-xs flex items-center gap-1.5">
                  <span>Permanent Retention Policy</span>
                </div>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  Under LMS governance, all added course content remains active permanently unless the Administrator (Atikur Rahman) authorizes removal.
                </p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">Target Item</div>
                <div className="text-xs font-bold text-slate-900 mt-0.5">{teacherDeletionItem.targetTitle}</div>
                <div className="text-[11px] text-slate-600 mt-0.5 font-mono">{course.code} &bull; Type: {teacherDeletionItem.targetType}</div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Reason for Deletion Request <span className="text-rose-500">*</span>
                </label>
                <textarea
                  value={teacherDeletionReason}
                  onChange={(e) => setTeacherDeletionReason(e.target.value)}
                  placeholder="Explain why this content should be permanently deleted..."
                  rows={3}
                  required
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 focus:outline-hidden"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setTeacherDeletionItem(null)}
                  className="px-3.5 py-2 text-xs text-slate-600 hover:text-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!teacherDeletionReason.trim()}
                  className="px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded-xl hover:bg-slate-800 disabled:opacity-50 cursor-pointer shadow-xs"
                >
                  Submit Request to Admin
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
