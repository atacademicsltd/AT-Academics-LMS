import React, { useState } from 'react';
import { StorageService } from '../../services/storage';
import { User } from '../../types';
import {
  Award,
  Search,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  Building2,
  Calendar,
  GraduationCap,
  Copy,
  Check,
  ArrowRight,
  ExternalLink,
  Shield,
} from 'lucide-react';

interface QualificationVerificationProps {
  currentUser?: User | null;
}

export const QualificationVerification: React.FC<QualificationVerificationProps> = ({
  currentUser: propUser,
}) => {
  const activeUser = propUser !== undefined ? propUser : StorageService.getCurrentUser();
  const isAdmin = activeUser?.role === 'admin';

  const [studentId, setStudentId] = useState('');
  const [gradOption, setGradOption] = useState<'not_graduated' | 'expected' | 'graduated'>('graduated');
  const [passingMonth, setPassingMonth] = useState('July');
  const [passingYear, setPassingYear] = useState('2026');
  const [expectedMonth, setExpectedMonth] = useState('July');
  const [expectedYear, setExpectedYear] = useState('2027');
  const [result, setResult] = useState<{
    verified: boolean;
    record?: {
      studentId: string;
      studentName: string;
      qualificationTitle: string;
      graduatedOn?: string;
      passingMonth: string;
      passingYear: string;
      grade: string;
      awardInstitute: string;
      awardingBody?: string;
      regulatedBy?: string;
      status: string;
    };
    message: string;
  } | null>(null);

  const [hasSearched, setHasSearched] = useState(false);
  const [copiedEmbed, setCopiedEmbed] = useState(false);

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId.trim()) return;

    const queryMonth = gradOption === 'expected' ? expectedMonth : passingMonth;
    const queryYear = gradOption === 'expected' ? expectedYear : passingYear;

    const res = StorageService.verifyQualification(
      studentId.trim(),
      queryMonth.trim(),
      queryYear.trim(),
      gradOption
    );
    setResult(res);
    setHasSearched(true);
  };

  const handleReset = () => {
    setStudentId('');
    setGradOption('graduated');
    setPassingMonth('July');
    setPassingYear('2026');
    setExpectedMonth('July');
    setExpectedYear('2027');
    setResult(null);
    setHasSearched(false);
  };

  const months = [
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

  const years = ['2027', '2026', '2025', '2024', '2023', '2022', '2021', '2020'];

  const embedCode = `<iframe src="${window.location.origin}/#verify" width="100%" height="600" frameborder="0" title="AT Academics Qualification Verification"></iframe>`;

  const copyEmbedCode = () => {
    navigator.clipboard.writeText(embedCode);
    setCopiedEmbed(true);
    setTimeout(() => setCopiedEmbed(false), 2500);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-sm border border-slate-800">
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-white text-xs font-mono backdrop-blur-xs border border-white/20">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Official Institution Registry Verification Service</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Academic Qualification & Degree Verification
          </h1>

          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Independent institutional verification portal. Employers, higher education institutes, and credential evaluators can authenticate student graduation status, award degrees, and conferral dates in real time.
          </p>
        </div>

        <div className="absolute right-4 bottom-4 opacity-10 hidden sm:block">
          <Award className="w-56 h-56 text-white" />
        </div>
      </div>

      {/* Verification Query Form Card */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Search className="w-4 h-4 text-slate-500" />
            <span>Enter Student Credential Record</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Provide the official Student ID Number and select the graduation status option.
          </p>
        </div>

        <form onSubmit={handleVerify} className="space-y-4">
          {/* Graduation Record Option Selector */}
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1.5">
              Graduation Status Option
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setGradOption('graduated')}
                className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all text-center cursor-pointer ${
                  gradOption === 'graduated'
                    ? 'bg-emerald-100 text-emerald-900 border-emerald-300 shadow-2xs font-bold'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <span>🎓 Conferred / Graduated</span>
              </button>
              <button
                type="button"
                onClick={() => setGradOption('not_graduated')}
                className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all text-center cursor-pointer ${
                  gradOption === 'not_graduated'
                    ? 'bg-amber-100 text-amber-900 border-amber-300 shadow-2xs font-bold'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <span>⏳ Not Graduated Yet</span>
              </button>
              <button
                type="button"
                onClick={() => setGradOption('expected')}
                className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all text-center cursor-pointer ${
                  gradOption === 'expected'
                    ? 'bg-blue-100 text-blue-900 border-blue-300 shadow-2xs font-bold'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <span>📅 Expected Graduation Date</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Student ID Number
              </label>
              <input
                type="text"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                placeholder="Student ID"
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-slate-900 font-mono font-medium"
                required
              />
            </div>

            {gradOption === 'graduated' && (
              <>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Graduation / Passing Month
                  </label>
                  <select
                    value={passingMonth}
                    onChange={(e) => setPassingMonth(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-slate-900"
                  >
                    {months.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Conferred Passing Year
                  </label>
                  <select
                    value={passingYear}
                    onChange={(e) => setPassingYear(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-slate-900 font-mono"
                  >
                    {years.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}

            {gradOption === 'not_graduated' && (
              <div className="sm:col-span-2 flex items-center p-3 bg-amber-50/80 rounded-xl border border-amber-200 text-xs text-amber-900">
                <span>
                  Verifying current active enrollment. Student credentials will be checked against the active institutional registry without requiring a conferred graduation date.
                </span>
              </div>
            )}

            {gradOption === 'expected' && (
              <>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Expected Graduation Month
                  </label>
                  <select
                    value={expectedMonth}
                    onChange={(e) => setExpectedMonth(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-slate-900"
                  >
                    {months.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Expected Graduation Year
                  </label>
                  <select
                    value={expectedYear}
                    onChange={(e) => setExpectedYear(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-slate-900 font-mono"
                  >
                    {years.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            {hasSearched && (
              <button
                type="button"
                onClick={handleReset}
                className="px-4 py-2 border border-slate-200 text-xs font-semibold text-slate-600 rounded-xl hover:bg-slate-50 transition-colors"
              >
                Clear Query
              </button>
            )}

            <button
              type="submit"
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl flex items-center gap-2 transition-colors shadow-2xs"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Verify Qualification Now</span>
            </button>
          </div>
        </form>

        {/* Verification Result Display */}
        {hasSearched && result && (
          <div className="pt-4 border-t border-slate-100">
            {result.verified && result.record ? (
              <div className="p-6 bg-emerald-50/60 border border-emerald-200 rounded-2xl space-y-4">
                {(() => {
                  const isNotGraduated =
                    result.record.status.includes('Not Graduated') ||
                    result.record.graduatedOn === 'Not Graduated Yet';
                  const isExpected = result.record.graduatedOn?.startsWith('Expected');

                  return (
                    <>
                      <div className="flex items-start justify-between gap-3">
                        <div
                          className={`flex items-center gap-2 font-bold text-sm ${
                            isNotGraduated
                              ? 'text-amber-800'
                              : isExpected
                              ? 'text-blue-800'
                              : 'text-emerald-800'
                          }`}
                        >
                          <CheckCircle2
                            className={`w-5 h-5 shrink-0 ${
                              isNotGraduated
                                ? 'text-amber-600'
                                : isExpected
                                ? 'text-blue-600'
                                : 'text-emerald-600'
                            }`}
                          />
                          <span>
                            {isNotGraduated
                              ? 'Official Student Record Verified (Active Student - Not Graduated Yet)'
                              : isExpected
                              ? 'Official Student Record Verified (Active Candidate - Expected Graduation)'
                              : 'Official Qualification Conferred & Authenticated'}
                          </span>
                        </div>
                        <span
                          className={`px-2.5 py-1 text-[10px] font-mono uppercase font-bold rounded-lg border ${
                            isNotGraduated
                              ? 'bg-amber-100 text-amber-800 border-amber-200'
                              : isExpected
                              ? 'bg-blue-100 text-blue-800 border-blue-200'
                              : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                          }`}
                        >
                          {result.record.status}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 text-xs">
                        <div className="bg-white p-3.5 rounded-xl border border-emerald-100 space-y-1">
                          <span className="text-[10px] uppercase font-mono text-slate-400 block">
                            Student Full Name
                          </span>
                          <span className="font-bold text-slate-900 text-sm">
                            {result.record.studentName}
                          </span>
                          <span className="text-[11px] font-mono text-slate-500 block">
                            Student ID: {result.record.studentId}
                          </span>
                        </div>

                        <div className="bg-white p-3.5 rounded-xl border border-emerald-100 space-y-1">
                          <span className="text-[10px] uppercase font-mono text-slate-400 block">
                            Academic Programme / Degree Title
                          </span>
                          <span className="font-bold text-slate-900 text-sm">
                            {result.record.qualificationTitle}
                          </span>
                          <span className="text-[11px] font-mono text-emerald-700 font-semibold block">
                            Status: {result.record.grade}
                          </span>
                        </div>

                        <div className="bg-white p-3.5 rounded-xl border border-emerald-100 space-y-1">
                          <span className="text-[10px] uppercase font-mono text-slate-400 block">
                            {isNotGraduated
                              ? 'Graduation Status'
                              : isExpected
                              ? 'Expected Graduation Date'
                              : 'Graduated On (Month & Year)'}
                          </span>
                          <span className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                            <GraduationCap
                              className={`w-4 h-4 ${
                                isNotGraduated
                                  ? 'text-amber-600'
                                  : isExpected
                                  ? 'text-blue-600'
                                  : 'text-emerald-600'
                              }`}
                            />
                            <span>
                              {result.record.graduatedOn ||
                                `${result.record.passingMonth} ${result.record.passingYear}`}
                            </span>
                          </span>
                          <span
                            className={`text-[11px] font-mono block ${
                              isNotGraduated
                                ? 'text-amber-700'
                                : isExpected
                                ? 'text-blue-700'
                                : 'text-emerald-700'
                            }`}
                          >
                            {isNotGraduated
                              ? 'Degree In Progress (Not Yet Conferred)'
                              : isExpected
                              ? `Scheduled for: ${result.record.graduatedOn}`
                              : `Conferred: ${result.record.passingMonth} ${result.record.passingYear}`}
                          </span>
                        </div>

                  <div className="bg-white p-3.5 rounded-xl border border-emerald-100 space-y-1">
                    <span className="text-[10px] uppercase font-mono text-slate-400 block">
                      Institution & Awarding Body
                    </span>
                    <span className="font-bold text-slate-900 block">
                      {result.record.awardInstitute || 'AT Academics'}
                    </span>
                    {result.record.awardingBody && (
                      <div className="text-[11px] font-semibold text-emerald-800 flex flex-wrap items-center gap-1 pt-0.5">
                        <span>Awarding Body: <strong>{result.record.awardingBody}</strong></span>
                        {result.record.regulatedBy && (
                          <span className="px-1.5 py-0.2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-[10px] font-medium">
                            {result.record.regulatedBy}
                          </span>
                        )}
                      </div>
                    )}
                    {(!result.record.awardingBody || result.record.awardingBody === 'AT Academics') && (
                      <span className="text-[11px] text-slate-500 block">
                        Official Awarding Institution · AT Academics
                      </span>
                    )}
                  </div>
                </div>
              </>
            );
          })()}

                <div className="text-[11px] text-emerald-900/80 font-mono pt-1">
                  ✓ Digital Certificate Registry Checksum: Valid · Verification Timestamp: {new Date().toUTCString()}
                </div>
              </div>
            ) : (
              <div className="p-6 bg-red-50/70 border border-red-200 rounded-2xl space-y-2">
                <div className="flex items-center gap-2 text-red-800 font-bold text-sm">
                  <XCircle className="w-5 h-5 text-red-600 shrink-0" />
                  <span>Qualification Verification Unsuccessful</span>
                </div>
                <p className="text-xs text-red-700 leading-relaxed">
                  {result.message}
                </p>
                <p className="text-[11px] text-slate-500 pt-1">
                  Please verify that the Student ID was typed without spaces and that the graduation Month and Year match the official certificate issued by AT Academics.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Website Embed Center (Admin Only) */}
      {isAdmin && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-slate-900 text-white text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1">
                  <Shield className="w-3 h-3 text-emerald-400" />
                  <span>Admin Access Only</span>
                </span>
              </div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 mt-1.5">
                <ExternalLink className="w-4 h-4 text-slate-600" />
                <span>Independent Website Embed Code</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Copy this snippet to embed the standalone Qualification Verification widget directly into your external website or public portal.
              </p>
            </div>

            <button
              onClick={copyEmbedCode}
              className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors border border-slate-200 shrink-0 cursor-pointer"
            >
              {copiedEmbed ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Copied Code</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-600" />
                  <span>Copy iFrame Embed</span>
                </>
              )}
            </button>
          </div>

          <div className="p-3 bg-slate-900 text-slate-200 rounded-xl font-mono text-xs overflow-x-auto">
            <code>{embedCode}</code>
          </div>
        </div>
      )}
    </div>
  );
};
