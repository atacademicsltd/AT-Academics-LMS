import React, { useState } from 'react';
import { User } from '../../types';
import { StorageService } from '../../services/storage';
import {
  User as UserIcon,
  Camera,
  Lock,
  Receipt,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Mail,
  KeyRound,
  FileText,
  GraduationCap,
} from 'lucide-react';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  onProfileUpdated: (updatedUser: User) => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onProfileUpdated,
}) => {
  const [activeTab, setActiveTab] = useState<'details' | 'password' | 'finance'>('details');

  // Details
  const [name, setName] = useState(currentUser.name);
  const [avatarUrl, setAvatarUrl] = useState(currentUser.avatarUrl || '');

  // Password Change
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [pwSuccessMsg, setPwSuccessMsg] = useState('');
  const [pwErrorMsg, setPwErrorMsg] = useState('');

  // Email OTP Option inside profile
  const [otpStep, setOtpStep] = useState<'idle' | 'sent'>('idle');
  const [enteredOtp, setEnteredOtp] = useState('');
  const [otpNotice, setOtpNotice] = useState<string | null>(null);

  // Status message
  const [profileMsg, setProfileMsg] = useState('');

  if (!isOpen) return null;

  const handleAvatarFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveDetails = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = StorageService.updateUserProfile(currentUser.id, {
      name: name.trim(),
      avatarUrl: avatarUrl || undefined,
    });
    if (updated) {
      onProfileUpdated(updated);
      setProfileMsg('Profile updated successfully.');
      setTimeout(() => setProfileMsg(''), 3000);
    }
  };

  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    setPwErrorMsg('');
    setPwSuccessMsg('');

    if (newPass !== confirmPass) {
      setPwErrorMsg('New password and confirmation do not match.');
      return;
    }

    if (otpStep === 'sent') {
      const res = StorageService.resetPasswordWithOtp(currentUser.email, enteredOtp, newPass);
      if (res.success) {
        setPwSuccessMsg(res.message);
        setOtpStep('idle');
        setEnteredOtp('');
        setNewPass('');
        setConfirmPass('');
        setOtpNotice(null);
      } else {
        setPwErrorMsg(res.message);
      }
    } else {
      const res = StorageService.changePasswordWithCurrent(currentUser.id, currentPass, newPass);
      if (res.success) {
        setPwSuccessMsg(res.message);
        setCurrentPass('');
        setNewPass('');
        setConfirmPass('');
      } else {
        setPwErrorMsg(res.message);
      }
    }
  };

  const handleSendEmailOtp = () => {
    setPwErrorMsg('');
    const res = StorageService.requestPasswordResetOtp(currentUser.email);
    if (res.success) {
      setOtpStep('sent');
      setOtpNotice(`OTP sent to your email (${res.otpCode}). Enter it below.`);
    } else {
      setPwErrorMsg(res.message);
    }
  };

  const totalFee = currentUser.totalTuitionFee ?? (currentUser.role === 'student' ? 4500 : 0);
  const paid = currentUser.tuitionPaid ?? (currentUser.role === 'student' ? 3000 : 0);
  const due = currentUser.tuitionDue ?? Math.max(0, totalFee - paid);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-xl w-full p-6 space-y-5 animate-in fade-in duration-150 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={currentUser.name}
                  className="w-12 h-12 rounded-full object-cover border border-slate-200"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-base shadow-xs">
                  {currentUser.name.charAt(0)}
                </div>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">{currentUser.name}</h2>
                <span className="text-[10px] font-mono uppercase bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-semibold">
                  {currentUser.role}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-mono">
                {currentUser.role === 'student' ? `ID: ${currentUser.studentId || currentUser.loginId}` : currentUser.email}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 text-sm font-bold p-1"
          >
            ✕
          </button>
        </div>

        {/* Tab Controls */}
        <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-xl text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('details')}
            className={`py-2 px-3 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'details'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <UserIcon className="w-3.5 h-3.5" />
            <span>Profile & Photo</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('password')}
            className={`py-2 px-3 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'password'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Change Password</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('finance')}
            className={`py-2 px-3 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'finance'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>Tuition Status (£)</span>
          </button>
        </div>

        {/* Tab 1: Profile & Photo */}
        {activeTab === 'details' && (
          <form onSubmit={handleSaveDetails} className="space-y-4">
            {profileMsg && (
              <div className="p-3 bg-emerald-50 text-emerald-800 text-xs rounded-lg flex items-center gap-2 border border-emerald-200">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{profileMsg}</span>
              </div>
            )}

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Profile Photo
              </label>
              <div className="flex items-center gap-4">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt="Preview"
                    className="w-16 h-16 rounded-full object-cover border border-slate-200"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-slate-100 border border-slate-300 flex items-center justify-center text-slate-400">
                    <UserIcon className="w-8 h-8" />
                  </div>
                )}
                <div className="space-y-1.5">
                  <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-medium rounded-lg transition-colors border border-slate-200">
                    <Camera className="w-3.5 h-3.5" />
                    <span>Upload Local Photo</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarFile}
                      className="hidden"
                    />
                  </label>
                  <p className="text-[11px] text-slate-400">
                    JPG, PNG or GIF up to 5MB
                  </p>
                </div>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Full Legal Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Department
                </label>
                <input
                  type="text"
                  value={currentUser.department || 'Academics'}
                  disabled
                  className="w-full px-3 py-2 text-xs bg-slate-100 border border-slate-200 rounded-lg text-slate-600 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Enrolled / Assigned Courses
                </label>
                <div className="px-3 py-2 text-xs bg-slate-100 border border-slate-200 rounded-lg text-slate-600 font-mono truncate">
                  {currentUser.coursesEnrolled.length > 0
                    ? currentUser.coursesEnrolled.join(', ')
                    : 'None assigned yet'}
                </div>
              </div>
            </div>

            {currentUser.role === 'student' && (
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Graduation Status / Date
                  </label>
                  <div className="px-3 py-2 text-xs bg-slate-100 border border-slate-200 rounded-lg text-slate-800 font-bold flex items-center gap-1.5">
                    <GraduationCap className="w-3.5 h-3.5 text-emerald-600" />
                    <span>
                      {currentUser.isGraduated === false ||
                      currentUser.graduationStatus === 'not_graduated' ||
                      currentUser.graduatedOn === 'Not Graduated Yet'
                        ? '⏳ Not Graduated Yet'
                        : currentUser.graduationStatus === 'expected' ||
                          currentUser.graduatedOn?.startsWith('Expected')
                        ? `📅 Expected: ${currentUser.expectedGraduationDate || currentUser.graduatedOn?.replace('Expected: ', '')}`
                        : `🎓 ${currentUser.graduatedOn || `${currentUser.passingMonth || 'July'} ${currentUser.passingYear || '2026'}`}`}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Degree / Qualification
                  </label>
                  <div className="px-3 py-2 text-xs bg-slate-100 border border-slate-200 rounded-lg text-slate-700 truncate font-medium">
                    {currentUser.qualificationTitle || 'BSc (Hons) Business Management'}
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded-lg hover:bg-slate-800 transition-colors shadow-xs"
              >
                Save Profile Changes
              </button>
            </div>
          </form>
        )}

        {/* Tab 2: Change Password */}
        {activeTab === 'password' && (
          <form onSubmit={handlePasswordChange} className="space-y-3.5">
            {pwSuccessMsg && (
              <div className="p-3 bg-emerald-50 text-emerald-800 text-xs rounded-lg flex items-center gap-2 border border-emerald-200">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{pwSuccessMsg}</span>
              </div>
            )}

            {pwErrorMsg && (
              <div className="p-3 bg-red-50 text-red-700 text-xs rounded-lg flex items-center gap-2 border border-red-200">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{pwErrorMsg}</span>
              </div>
            )}

            {otpNotice && (
              <div className="p-3 bg-slate-900 text-white text-xs rounded-xl space-y-1 font-mono">
                <div className="text-amber-400 font-bold flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5" />
                  Email Security Verification
                </div>
                <p className="text-[11px] text-slate-200">{otpNotice}</p>
              </div>
            )}

            {otpStep === 'idle' ? (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700">
                    Current Password
                  </label>
                  <button
                    type="button"
                    onClick={handleSendEmailOtp}
                    className="text-[11px] text-slate-600 hover:text-slate-900 underline font-medium"
                  >
                    Forgot? Request code to {currentUser.email}
                  </button>
                </div>
                <input
                  type="password"
                  value={currentPass}
                  onChange={(e) => setCurrentPass(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 font-mono"
                  required
                />
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700">
                    Enter One-Time Code (Sent to Email)
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setOtpStep('idle');
                      setOtpNotice(null);
                    }}
                    className="text-[11px] text-slate-600 hover:text-slate-900 underline font-medium"
                  >
                    Use Current Password Instead
                  </button>
                </div>
                <input
                  type="text"
                  maxLength={6}
                  value={enteredOtp}
                  onChange={(e) => setEnteredOtp(e.target.value)}
                  placeholder="6-digit verification code"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 font-mono tracking-widest text-center font-bold"
                  required
                />
              </div>
            )}

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                New Password
              </label>
              <input
                type="password"
                value={newPass}
                onChange={(e) => setNewPass(e.target.value)}
                placeholder="Enter new secure password"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 font-mono"
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Confirm New Password
              </label>
              <input
                type="password"
                value={confirmPass}
                onChange={(e) => setConfirmPass(e.target.value)}
                placeholder="Confirm new password"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 font-mono"
                required
              />
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded-lg hover:bg-slate-800 transition-colors shadow-xs"
              >
                Update Password
              </button>
            </div>
          </form>
        )}

        {/* Tab 3: Tuition Fee Status */}
        {activeTab === 'finance' && (
          <div className="space-y-4">
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
                    ACADEMIC FINANCIAL LEDGER (GBP £)
                  </span>
                  <h3 className="text-sm font-bold text-slate-900">
                    Tuition & Fee Balance Overview
                  </h3>
                </div>
                <div className="p-2 bg-slate-900 text-white rounded-lg">
                  <Receipt className="w-5 h-5" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 pt-2">
                <div className="bg-white p-3 rounded-xl border border-slate-200 text-center">
                  <span className="text-[11px] font-mono text-slate-500 block">
                    TOTAL TUITION
                  </span>
                  <span className="text-lg font-bold font-mono text-slate-900 tabular-nums">
                    £{totalFee.toLocaleString()}
                  </span>
                </div>

                <div className="bg-white p-3 rounded-xl border border-slate-200 text-center">
                  <span className="text-[11px] font-mono text-slate-500 block">
                    PAID AMOUNT
                  </span>
                  <span className="text-lg font-bold font-mono text-emerald-700 tabular-nums">
                    £{paid.toLocaleString()}
                  </span>
                </div>

                <div className="bg-white p-3 rounded-xl border border-slate-200 text-center">
                  <span className="text-[11px] font-mono text-slate-500 block">
                    DUE BALANCE
                  </span>
                  <span
                    className={`text-lg font-bold font-mono tabular-nums ${
                      due > 0 ? 'text-amber-700' : 'text-slate-900'
                    }`}
                  >
                    £{due.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] font-mono text-slate-500">
                  <span>Settlement Progress</span>
                  <span>{totalFee > 0 ? Math.round((paid / totalFee) * 100) : 100}% Paid</span>
                </div>
                <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-600 rounded-full transition-all duration-500"
                    style={{
                      width: `${totalFee > 0 ? Math.min(100, Math.round((paid / totalFee) * 100)) : 100}%`,
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Authority Disclaimer */}
            <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-1">
              <div className="font-semibold flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-amber-700" />
                Administrative Authority Policy
              </div>
              <p className="text-[11px] leading-relaxed">
                Tuition fee assessments, payment ledger updates, and balance adjustments are legally managed and can strictly only be modified by the Administrator (Atikur Rahman) via the User Creation & Finance portal.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
