import React, { useState, useEffect } from 'react';
import { Quiz, User, QuizAttempt } from '../../types';
import { StorageService } from '../../services/storage';
import {
  Clock,
  Award,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCcw,
  X,
  FileQuestion,
  HelpCircle,
  ArrowRight,
} from 'lucide-react';

interface QuizTakerModalProps {
  quiz: Quiz;
  currentUser: User;
  isOpen: boolean;
  onClose: () => void;
  onAttemptCompleted?: (attempt: QuizAttempt) => void;
}

export const QuizTakerModal: React.FC<QuizTakerModalProps> = ({
  quiz,
  currentUser,
  isOpen,
  onClose,
  onAttemptCompleted,
}) => {
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [timeRemainingSeconds, setTimeRemainingSeconds] = useState(quiz.timeLimitMinutes * 60);
  const [result, setResult] = useState<{
    score: number;
    totalPoints: number;
    percentage: number;
    passed: boolean;
  } | null>(null);

  // Timer countdown
  useEffect(() => {
    if (!isOpen || isSubmitted) return;

    const timer = setInterval(() => {
      setTimeRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmitQuiz();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, isSubmitted]);

  if (!isOpen) return null;

  const handleSelectOption = (questionId: string, optionIdx: number) => {
    if (isSubmitted) return;
    setSelectedAnswers((prev) => ({
      ...prev,
      [questionId]: optionIdx,
    }));
  };

  const handleSubmitQuiz = () => {
    if (isSubmitted) return;

    let correctCount = 0;
    quiz.questions.forEach((q) => {
      if (selectedAnswers[q.id] === q.correctAnswerIndex) {
        correctCount += 1;
      }
    });

    const totalQuestions = quiz.questions.length;
    const percentage = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
    const passed = percentage >= quiz.passingScorePercent;
    const score = correctCount * 10;
    const totalPoints = totalQuestions * 10;

    const quizResult = { score, totalPoints, percentage, passed };
    setResult(quizResult);
    setIsSubmitted(true);

    const attempt = StorageService.saveQuizAttempt({
      quizId: quiz.id,
      studentId: currentUser.studentId || currentUser.id,
      studentName: currentUser.name,
      score,
      totalPoints,
      percentage,
      answers: selectedAnswers,
      passed,
    });

    if (onAttemptCompleted) {
      onAttemptCompleted(attempt);
    }
  };

  const handleReset = () => {
    setSelectedAnswers({});
    setIsSubmitted(false);
    setTimeRemainingSeconds(quiz.timeLimitMinutes * 60);
    setResult(null);
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const answeredCount = Object.keys(selectedAnswers).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <FileQuestion className="w-5 h-5 text-purple-600" />
              <span>{quiz.title}</span>
            </h2>
            <p className="text-xs text-slate-500">
              {quiz.description || 'Complete all multiple-choice questions to validate academic mastery.'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {!isSubmitted && (
              <div
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-mono text-xs font-bold ${
                  timeRemainingSeconds < 120
                    ? 'bg-red-50 text-red-700 border-red-200 animate-pulse'
                    : 'bg-white text-slate-700 border-slate-200'
                }`}
              >
                <Clock className="w-4 h-4 text-slate-400" />
                <span>{formatTimer(timeRemainingSeconds)}</span>
              </div>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Results Banner if submitted */}
        {isSubmitted && result && (
          <div
            className={`p-4 sm:p-6 border-b flex flex-wrap items-center justify-between gap-4 ${
              result.passed
                ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
                : 'bg-amber-50/80 border-amber-200 text-amber-950'
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold ${
                  result.passed
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-amber-600 text-white shadow-xs'
                }`}
              >
                {result.passed ? <Award className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
              </div>
              <div>
                <h3 className="text-base font-bold">
                  {result.passed ? 'Assessment Passed Successfully' : 'Review Required - Pass Benchmark Missed'}
                </h3>
                <p className="text-xs opacity-90">
                  Passing Standard: {quiz.passingScorePercent}% · Your Score:{' '}
                  <span className="font-bold font-mono">{result.percentage}%</span> ({result.score} / {result.totalPoints} Marks)
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleReset}
                className="px-3 py-1.5 bg-white border border-slate-300 text-slate-800 rounded-lg text-xs font-semibold hover:bg-slate-50 flex items-center gap-1.5 transition-colors shadow-2xs"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Retake Quiz</span>
              </button>
              <button
                onClick={onClose}
                className="px-4 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 transition-colors shadow-2xs"
              >
                Finish & Close
              </button>
            </div>
          </div>
        )}

        {/* Questions Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-6">
          <div className="flex items-center justify-between text-xs text-slate-500 pb-2 border-b border-slate-100">
            <span>
              Question Progress: <strong className="text-slate-900">{answeredCount}</strong> of{' '}
              {quiz.questions.length} answered
            </span>
            <span>Target Pass: {quiz.passingScorePercent}%</span>
          </div>

          <div className="space-y-6">
            {quiz.questions.map((q, qIdx) => {
              const selectedOpt = selectedAnswers[q.id];
              const isCorrect = isSubmitted && selectedOpt === q.correctAnswerIndex;
              const isWrong = isSubmitted && selectedOpt !== undefined && selectedOpt !== q.correctAnswerIndex;

              return (
                <div
                  key={q.id}
                  className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                    isSubmitted
                      ? isCorrect
                        ? 'bg-emerald-50/50 border-emerald-300'
                        : isWrong
                        ? 'bg-red-50/50 border-red-300'
                        : 'bg-slate-50 border-slate-200'
                      : selectedOpt !== undefined
                      ? 'bg-white border-purple-200 shadow-xs'
                      : 'bg-white border-slate-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <span className="text-xs font-bold font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                      Question {qIdx + 1}
                    </span>
                    {isSubmitted && (
                      <div>
                        {isCorrect ? (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 font-mono">
                            <CheckCircle2 className="w-4 h-4" /> Correct (+10)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-red-600 font-mono">
                            <XCircle className="w-4 h-4" /> Incorrect (0)
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <h3 className="text-sm font-semibold text-slate-900 mb-3 leading-snug">
                    {q.question}
                  </h3>

                  {/* Options */}
                  <div className="space-y-2">
                    {q.options.map((opt, optIdx) => {
                      const isOptionSelected = selectedOpt === optIdx;
                      const isOptionCorrect = isSubmitted && q.correctAnswerIndex === optIdx;
                      const isOptionIncorrectSelected = isSubmitted && isOptionSelected && !isOptionCorrect;

                      return (
                        <button
                          key={optIdx}
                          type="button"
                          disabled={isSubmitted}
                          onClick={() => handleSelectOption(q.id, optIdx)}
                          className={`w-full text-left p-3 rounded-xl border text-xs flex items-center gap-3 transition-colors ${
                            isOptionCorrect
                              ? 'bg-emerald-100/70 border-emerald-400 font-bold text-emerald-950'
                              : isOptionIncorrectSelected
                              ? 'bg-red-100/70 border-red-400 font-semibold text-red-950 line-through'
                              : isOptionSelected
                              ? 'bg-purple-50 border-purple-400 font-semibold text-purple-950 shadow-2xs'
                              : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-800'
                          }`}
                        >
                          <div
                            className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold font-mono shrink-0 ${
                              isOptionCorrect
                                ? 'bg-emerald-600 text-white'
                                : isOptionIncorrectSelected
                                ? 'bg-red-600 text-white'
                                : isOptionSelected
                                ? 'bg-purple-600 text-white'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {String.fromCharCode(65 + optIdx)}
                          </div>
                          <span className="flex-1">{opt}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Explanation after submission */}
                  {isSubmitted && q.explanation && (
                    <div className="mt-3.5 p-3 rounded-xl bg-white border border-slate-200 text-xs text-slate-700 space-y-1">
                      <div className="font-semibold text-purple-900 flex items-center gap-1.5">
                        <HelpCircle className="w-3.5 h-3.5 text-purple-600" />
                        <span>Academic Explanation</span>
                      </div>
                      <p className="text-[11px] text-slate-600 leading-relaxed italic">
                        {q.explanation}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer actions */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <span className="text-xs text-slate-500 font-mono">
            {answeredCount}/{quiz.questions.length} Questions Answered
          </span>

          <div className="flex items-center gap-2">
            {!isSubmitted ? (
              <button
                type="button"
                onClick={handleSubmitQuiz}
                disabled={answeredCount === 0}
                className="px-5 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center gap-2"
              >
                <span>Submit Quiz for Grading</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-slate-800 transition-colors"
              >
                Done Reviewing
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
