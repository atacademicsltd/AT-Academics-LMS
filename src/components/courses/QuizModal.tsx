import React, { useState } from 'react';
import { Course, Quiz, QuizQuestion, User } from '../../types';
import { StorageService } from '../../services/storage';
import {
  Sparkles,
  HelpCircle,
  Plus,
  Trash2,
  CheckCircle2,
  Clock,
  Award,
  AlertCircle,
  X,
  FileQuestion,
  RefreshCw,
} from 'lucide-react';

interface QuizModalProps {
  course: Course;
  currentUser: User;
  isOpen: boolean;
  onClose: () => void;
  onQuizCreated: (quiz: Quiz) => void;
  initialModuleId?: string | null;
  initialQuiz?: Quiz | null;
}

export const QuizModal: React.FC<QuizModalProps> = ({
  course,
  currentUser,
  isOpen,
  onClose,
  onQuizCreated,
  initialModuleId,
  initialQuiz,
}) => {
  const [selectedModuleId, setSelectedModuleId] = useState<string>(initialModuleId || '');
  const [mode, setMode] = useState<'ai' | 'manual'>('ai');
  const [topic, setTopic] = useState(`${course.title} Core Assessment`);
  const [difficulty, setDifficulty] = useState<'introductory' | 'intermediate' | 'advanced'>('intermediate');
  const [questionCount, setQuestionCount] = useState(5);
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Staged quiz form
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [timeLimitMinutes, setTimeLimitMinutes] = useState(15);
  const [passingScorePercent, setPassingScorePercent] = useState(70);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [isAiGenerated, setIsAiGenerated] = useState(false);

  React.useEffect(() => {
    if (initialQuiz) {
      setTitle(initialQuiz.title);
      setDescription(initialQuiz.description || '');
      setTimeLimitMinutes(initialQuiz.timeLimitMinutes || 15);
      setPassingScorePercent(initialQuiz.passingScorePercent || 70);
      setQuestions(initialQuiz.questions || []);
      setSelectedModuleId(initialQuiz.moduleId || '');
      setIsAiGenerated(Boolean(initialQuiz.isAiGenerated));
      setMode('manual');
    } else {
      setTitle('');
      setDescription('');
      setTimeLimitMinutes(15);
      setPassingScorePercent(70);
      setQuestions([]);
      setSelectedModuleId(initialModuleId || '');
      setIsAiGenerated(false);
      setMode('ai');
    }
    setErrorMsg(null);
  }, [initialQuiz, initialModuleId, isOpen]);

  if (!isOpen) return null;

  const handleGenerateWithAI = async () => {
    setIsGenerating(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/ai/generate-quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: topic.trim(),
          department: course.department,
          programName: course.title,
          numberOfQuestions: questionCount,
          difficulty,
        }),
      });

      const data = await res.json();
      if (data.success && data.quiz) {
        setTitle(data.quiz.title || `${topic} Assessment`);
        setDescription(data.quiz.description || `Evaluates key concepts in ${course.title}.`);
        setTimeLimitMinutes(data.quiz.timeLimitMinutes || 15);
        setPassingScorePercent(data.quiz.passingScorePercent || 70);

        const mappedQuestions: QuizQuestion[] = (data.quiz.questions || []).map(
          (q: any, idx: number) => ({
            id: `q-${Date.now()}-${idx}`,
            question: q.question,
            options: q.options || ['Option A', 'Option B', 'Option C', 'Option D'],
            correctAnswerIndex: Number(q.correctAnswerIndex) || 0,
            explanation: q.explanation || 'Accurate answer according to academic syllabus guidelines.',
          })
        );

        setQuestions(mappedQuestions);
        setIsAiGenerated(true);
      } else {
        throw new Error(data.warning || 'Failed to generate questions');
      }
    } catch (err: any) {
      console.error('Quiz generation error:', err);
      setErrorMsg('Unable to contact AI generator. Please verify your connection or try manual creation.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAddBlankQuestion = () => {
    const newQ: QuizQuestion = {
      id: `q-manual-${Date.now()}`,
      question: '',
      options: ['', '', '', ''],
      correctAnswerIndex: 0,
      explanation: '',
    };
    setQuestions([...questions, newQ]);
  };

  const handleRemoveQuestion = (idx: number) => {
    setQuestions(questions.filter((_, i) => i !== idx));
  };

  const handleQuestionTextChange = (idx: number, text: string) => {
    const updated = [...questions];
    updated[idx].question = text;
    setQuestions(updated);
  };

  const handleOptionChange = (qIdx: number, optIdx: number, text: string) => {
    const updated = [...questions];
    updated[qIdx].options[optIdx] = text;
    setQuestions(updated);
  };

  const handleCorrectAnswerSelect = (qIdx: number, optIdx: number) => {
    const updated = [...questions];
    updated[qIdx].correctAnswerIndex = optIdx;
    setQuestions(updated);
  };

  const handleExplanationChange = (qIdx: number, text: string) => {
    const updated = [...questions];
    updated[qIdx].explanation = text;
    setQuestions(updated);
  };

  const handleSaveQuiz = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMsg('Please specify a quiz title.');
      return;
    }
    if (questions.length === 0) {
      setErrorMsg('Please add at least one question to the quiz.');
      return;
    }

    if (initialQuiz) {
      const updated = StorageService.updateQuiz(course.id, initialQuiz.id, {
        moduleId: selectedModuleId || undefined,
        title: title.trim(),
        description: description.trim(),
        timeLimitMinutes: Number(timeLimitMinutes) || 15,
        questions,
        totalPoints: questions.length * 10,
        passingScorePercent: Number(passingScorePercent) || 70,
        isAiGenerated,
      });

      if (updated) {
        onQuizCreated(updated);
        onClose();
      }
      return;
    }

    const saved = StorageService.addQuiz(course.id, {
      courseId: course.id,
      moduleId: selectedModuleId || undefined,
      title: title.trim(),
      description: description.trim(),
      timeLimitMinutes: Number(timeLimitMinutes) || 15,
      questions,
      createdById: currentUser.id,
      createdByName: currentUser.name,
      totalPoints: questions.length * 10,
      passingScorePercent: Number(passingScorePercent) || 70,
      sharedWithStudents: true,
      isAiGenerated,
    });

    if (saved) {
      onQuizCreated(saved);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>{initialQuiz ? 'Edit Quiz & Assessment' : 'Academic Quiz Creator'}</span>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-purple-100 text-purple-800 font-bold">
                  {course.code}
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                {initialQuiz
                  ? 'Update quiz questions, timer, passing criteria, and module linkage.'
                  : 'Author and publish evaluative assessments for students using Gemini AI or custom authoring.'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-5">
          {/* Mode Switcher */}
          <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
            <button
              type="button"
              onClick={() => setMode('ai')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                mode === 'ai'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI Quiz Generator (Gemini)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setMode('manual');
                if (questions.length === 0) handleAddBlankQuestion();
              }}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                mode === 'manual'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <FileQuestion className="w-3.5 h-3.5" />
              <span>Manual Authoring</span>
            </button>
          </div>

          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* AI Generator Controls */}
          {mode === 'ai' && questions.length === 0 && (
            <div className="p-4 bg-purple-50/70 border border-purple-200/80 rounded-2xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-purple-900 font-bold text-xs">
                  <Sparkles className="w-4 h-4 text-purple-600" />
                  <span>Gemini Academic Question Synthesizer</span>
                </div>
                <span className="text-[10px] font-mono text-purple-700 bg-purple-100 px-2 py-0.5 rounded">
                  Department: {course.department}
                </span>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Quiz Topic / Learning Objective
                </label>
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g. Risk Mitigation & Incident Response in Cyber Security"
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Academic Rigour
                  </label>
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 font-medium"
                  >
                    <option value="introductory">Introductory / Foundational</option>
                    <option value="intermediate">Intermediate / Undergraduate Year 2</option>
                    <option value="advanced">Advanced / Honours & Master's</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Number of Questions
                  </label>
                  <select
                    value={questionCount}
                    onChange={(e) => setQuestionCount(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 font-medium"
                  >
                    <option value={3}>3 Questions (Quick Knowledge Check)</option>
                    <option value={5}>5 Questions (Standard Diagnostic)</option>
                    <option value={8}>8 Questions (Module Assessment)</option>
                    <option value={10}>10 Questions (Comprehensive Exam)</option>
                  </select>
                </div>
              </div>

              <button
                type="button"
                onClick={handleGenerateWithAI}
                disabled={isGenerating || !topic.trim()}
                className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center justify-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Synthesizing Academic Questions with Gemini...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Generate Academic Quiz with AI</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Quiz Details Form (when questions exist or in manual mode) */}
          {(questions.length > 0 || mode === 'manual') && (
            <form onSubmit={handleSaveQuiz} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Quiz Assessment Title
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Contract Law Principles Diagnostic"
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 font-medium"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Time Limit (Mins)
                    </label>
                    <input
                      type="number"
                      min={5}
                      max={120}
                      value={timeLimitMinutes}
                      onChange={(e) => setTimeLimitMinutes(Number(e.target.value) || 15)}
                      className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg font-mono font-bold"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Pass Score (%)
                    </label>
                    <input
                      type="number"
                      min={40}
                      max={100}
                      value={passingScorePercent}
                      onChange={(e) => setPassingScorePercent(Number(e.target.value) || 70)}
                      className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg font-mono font-bold"
                      required
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Description / Instructions for Students
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Instructions for students regarding time allocation and review expectations..."
                  rows={2}
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>

              {/* Questions List */}
              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <HelpCircle className="w-4 h-4 text-purple-600" />
                    <span>Questions ({questions.length})</span>
                    {isAiGenerated && (
                      <span className="text-[10px] font-mono bg-purple-100 text-purple-800 px-1.5 py-0.2 rounded font-semibold">
                        AI Generated
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={handleAddBlankQuestion}
                    className="px-2.5 py-1 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg flex items-center gap-1 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Question</span>
                  </button>
                </div>

                {questions.map((q, qIdx) => (
                  <div
                    key={q.id}
                    className="p-4 bg-slate-50/80 border border-slate-200 rounded-xl space-y-3 relative group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold font-mono text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                        Question {qIdx + 1}
                      </span>
                      {questions.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveQuestion(qIdx)}
                          className="text-slate-400 hover:text-red-600 transition-colors p-1"
                          title="Remove question"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <div>
                      <input
                        type="text"
                        value={q.question}
                        onChange={(e) => handleQuestionTextChange(qIdx, e.target.value)}
                        placeholder="Enter the question text..."
                        className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 font-semibold"
                        required
                      />
                    </div>

                    {/* 4 Options */}
                    <div className="space-y-1.5">
                      <span className="text-[11px] font-mono text-slate-500 block">
                        Options (Select the radio button for the correct answer):
                      </span>
                      {q.options.map((opt, optIdx) => (
                        <div key={optIdx} className="flex items-center gap-2">
                          <input
                            type="radio"
                            name={`correct-${q.id}`}
                            checked={q.correctAnswerIndex === optIdx}
                            onChange={() => handleCorrectAnswerSelect(qIdx, optIdx)}
                            className="text-purple-600 focus:ring-purple-500 cursor-pointer"
                          />
                          <span className="text-[11px] font-mono font-bold text-slate-400 w-4">
                            {String.fromCharCode(65 + optIdx)}
                          </span>
                          <input
                            type="text"
                            value={opt}
                            onChange={(e) => handleOptionChange(qIdx, optIdx, e.target.value)}
                            placeholder={`Option ${String.fromCharCode(65 + optIdx)}`}
                            className={`flex-1 px-2.5 py-1 text-xs rounded-lg border transition-colors ${
                              q.correctAnswerIndex === optIdx
                                ? 'bg-purple-50/70 border-purple-300 font-semibold text-purple-950'
                                : 'bg-white border-slate-200 text-slate-800'
                            }`}
                            required
                          />
                        </div>
                      ))}
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 block mb-0.5">
                        Academic Explanation (Displayed after student completes attempt):
                      </label>
                      <input
                        type="text"
                        value={q.explanation}
                        onChange={(e) => handleExplanationChange(qIdx, e.target.value)}
                        placeholder="Why is this answer correct? Reference syllabus principles..."
                        className="w-full px-2.5 py-1 text-xs bg-white border border-slate-200 rounded-lg text-slate-600 italic"
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Submit / Action buttons */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    setQuestions([]);
                    setMode('ai');
                  }}
                  className="text-xs text-slate-500 hover:text-slate-800 underline"
                >
                  Clear & Re-generate
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Publish Quiz to Course</span>
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
