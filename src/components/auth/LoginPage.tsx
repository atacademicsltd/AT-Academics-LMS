import React, { useState } from 'react';
import { User } from '../../types';
import { StorageService } from '../../services/storage';
import {
  GraduationCap,
  Shield,
  UserCheck,
  KeyRound,
  Mail,
  Lock,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Eye,
  EyeOff,
  Award,
} from 'lucide-react';
import { WorldClock } from '../common/WorldClock';
import { ThemeToggle } from '../common/ThemeToggle';

interface LoginPageProps {
  onLoginSuccess: (user: User) => void;
  sessionTimeoutMessage?: string | null;
  onOpenVerification?: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  onLoginSuccess,
  sessionTimeoutMessage,
  onOpenVerification,
}) => {
  const [roleMode, setRoleMode] = useState<'staff' | 'student'>('staff');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState(sessionTimeoutMessage || '');
  const [successMsg, setSuccessMsg] = useState('');

  // Reset password workflow state
  const [isResetOpen, setIsResetOpen] = useState(false);
  const [resetMethod, setResetMethod] = useState<'current_password' | 'email_otp'>('email_otp');

  // Reset by current password fields
  const [resetId, setResetId] = useState('');
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');

  // Reset by OTP fields
  const [otpStep, setOtpStep] = useState<'request' | 'verify'>('request');
  const [otpEmailOrId, setOtpEmailOrId] = useState('');
  const [enteredOtp, setEnteredOtp] = useState('');
  const [otpNewPass, setOtpNewPass] = useState('');
  const [otpNotificationNotice, setOtpNotificationNotice] = useState<string | null>(null);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    // 1. Try local storage match for the selected role
    let res =
      roleMode === 'staff'
        ? StorageService.loginStaff(identifier, password)
        : StorageService.loginStudent(identifier, password);

    if (res.success && res.user) {
      onLoginSuccess(res.user);
      return;
    }

    // If local returned an explicit role mismatch rejection message, display it immediately
    if (res.message && res.message.includes('Access denied')) {
      setErrorMsg(res.message);
      return;
    }

    // 2. Call authoritative server-side endpoint with roleMode enforced
    try {
      const serverRes = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password, roleMode }),
      });
      const json = await serverRes.json();
      if (json.success && json.user) {
        StorageService.setCurrentUser(json.user);
        await StorageService.syncWithServer();
        onLoginSuccess(json.user);
        return;
      } else if (json.message) {
        setErrorMsg(json.message);
        return;
      }
    } catch {
      // Network error, show local message
    }

    setErrorMsg(
      res.message ||
        `Invalid credentials for ${roleMode === 'staff' ? 'Staff' : 'Student'} portal. Please verify your Login ID and password.`
    );
  };

  const handleResetCurrentPass = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const res = StorageService.changePasswordWithCurrent(resetId, currentPass, newPass);
    if (res.success) {
      setSuccessMsg(res.message);
      setIsResetOpen(false);
      setPassword(newPass);
    } else {
      setErrorMsg(res.message);
    }
  };

  const handleRequestOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const res = StorageService.requestPasswordResetOtp(otpEmailOrId);
    if (res.success) {
      setSuccessMsg(res.message);
      if (res.otpCode) {
        setOtpNotificationNotice(
          `One-Time Verification Code sent to email (${res.otpCode}). Enter it below.`
        );
      }
      setOtpStep('verify');
    } else {
      setErrorMsg(res.message);
    }
  };

  const handleVerifyOtpAndReset = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const res = StorageService.resetPasswordWithOtp(otpEmailOrId, enteredOtp, otpNewPass);
    if (res.success) {
      setSuccessMsg(res.message);
      setIsResetOpen(false);
      setOtpStep('request');
      setEnteredOtp('');
      setOtpNewPass('');
      setOtpNotificationNotice(null);
    } else {
      setErrorMsg(res.message);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans transition-colors duration-200 relative">
      {/* Top Floating Controls */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6 flex items-center gap-2">
        <ThemeToggle />
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center space-y-2">
        <div className="w-16 h-16 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-1 shadow-sm flex items-center justify-center mx-auto overflow-hidden">
          <img
            src="/logo.png"
            alt="AT Academics LMS"
            className="w-full h-full object-contain"
            referrerPolicy="no-referrer"
          />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          AT Academics LMS
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Official Institutional Learning Portal
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white dark:bg-slate-900 py-8 px-6 shadow-xl border border-slate-200 dark:border-slate-800 rounded-2xl sm:px-10 space-y-6">
          {/* Role Choice Buttons */}
          <div>
            <label className="text-[11px] font-mono text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-2 text-center">
              Select Your Access Role
            </label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl">
              <button
                type="button"
                onClick={() => {
                  setRoleMode('staff');
                  setErrorMsg('');
                  setSuccessMsg('');
                }}
                className={`py-2 px-3 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  roleMode === 'staff'
                    ? 'bg-slate-900 dark:bg-slate-700 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                <span>Staff (Admin & Instructors)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setRoleMode('student');
                  setErrorMsg('');
                  setSuccessMsg('');
                }}
                className={`py-2 px-3 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  roleMode === 'student'
                    ? 'bg-slate-900 dark:bg-slate-700 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <GraduationCap className="w-3.5 h-3.5" />
                <span>Student</span>
              </button>
            </div>
          </div>

          {/* Feedback Alerts */}
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs text-emerald-800">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                {roleMode === 'staff' ? 'Staff Login ID' : 'Student ID'}
              </label>
              <input
                type="text"
                autoComplete="username"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder={roleMode === 'staff' ? 'Staff Login ID' : 'Student ID'}
                className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-slate-500 font-mono"
                required
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Password</label>
                <button
                  type="button"
                  onClick={() => setIsResetOpen(true)}
                  className="text-[11px] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white underline font-medium cursor-pointer"
                >
                  Forgot / Reset Password?
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-3.5 pr-10 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-slate-500 font-mono"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1 cursor-pointer"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 px-4 bg-slate-900 dark:bg-slate-800 text-white text-xs font-semibold rounded-lg hover:bg-slate-800 dark:hover:bg-slate-700 transition-colors shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>Sign In as {roleMode === 'staff' ? 'Staff' : 'Student'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col items-center gap-2.5 text-center">
            {onOpenVerification && (
              <button
                type="button"
                onClick={onOpenVerification}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200 hover:text-slate-950 dark:hover:text-white underline transition-colors cursor-pointer"
              >
                <Award className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span>Verify Academic Qualification / Degree</span>
              </button>
            )}
            <div className="text-[11px] text-slate-400 dark:text-slate-500">
              Secure Session Authentication · AT Academics Information Systems
            </div>
          </div>
        </div>
      </div>

      {/* Password Reset Modal */}
      {isResetOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-slate-900 dark:text-white" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Password Recovery & Reset
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsResetOpen(false);
                  setOtpNotificationNotice(null);
                  setErrorMsg('');
                }}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* Method switcher */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-lg text-xs font-medium">
              <button
                type="button"
                onClick={() => setResetMethod('email_otp')}
                className={`py-1.5 px-2 rounded-md transition-colors ${
                  resetMethod === 'email_otp'
                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Via Email One-Time Code
              </button>
              <button
                type="button"
                onClick={() => setResetMethod('current_password')}
                className={`py-1.5 px-2 rounded-md transition-colors ${
                  resetMethod === 'current_password'
                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Using Current Password
              </button>
            </div>

            {/* Method 1: Email One-Time Code */}
            {resetMethod === 'email_otp' && (
              <div className="space-y-3.5">
                {otpNotificationNotice && (
                  <div className="p-3 bg-slate-900 text-white rounded-xl text-xs space-y-1 font-mono">
                    <div className="text-amber-400 font-bold flex items-center gap-1">
                      <Mail className="w-3.5 h-3.5" />
                      Email Verification Notice
                    </div>
                    <p className="text-[11px] text-slate-200">{otpNotificationNotice}</p>
                  </div>
                )}

                {otpStep === 'request' ? (
                  <form onSubmit={handleRequestOtp} className="space-y-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">
                        Enter Registered Email or Login ID
                      </label>
                      <input
                        type="text"
                        value={otpEmailOrId}
                        onChange={(e) => setOtpEmailOrId(e.target.value)}
                        placeholder="Registered Email or Login ID"
                        className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 font-mono"
                        required
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full py-2 bg-slate-900 text-white text-xs font-semibold rounded-lg hover:bg-slate-800 transition-colors"
                    >
                      Request One-Time Code (OTP)
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleVerifyOtpAndReset} className="space-y-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">
                        6-Digit One-Time Code
                      </label>
                      <input
                        type="text"
                        maxLength={6}
                        value={enteredOtp}
                        onChange={(e) => setEnteredOtp(e.target.value)}
                        placeholder="Enter 6-digit code"
                        className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 font-mono tracking-widest text-center text-sm font-bold"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">
                        Create New Password
                      </label>
                      <input
                        type="password"
                        value={otpNewPass}
                        onChange={(e) => setOtpNewPass(e.target.value)}
                        placeholder="Enter new password"
                        className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 font-mono"
                        required
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setOtpStep('request')}
                        className="px-3 py-2 border border-slate-200 text-slate-600 rounded-lg text-xs"
                      >
                        Resend
                      </button>
                      <button
                        type="submit"
                        className="flex-1 py-2 bg-slate-900 text-white text-xs font-semibold rounded-lg hover:bg-slate-800 transition-colors"
                      >
                        Set New Password
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {/* Method 2: Current Password */}
            {resetMethod === 'current_password' && (
              <form onSubmit={handleResetCurrentPass} className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Login ID or Email
                  </label>
                  <input
                    type="text"
                    value={resetId}
                    onChange={(e) => setResetId(e.target.value)}
                    placeholder="Login ID or Email"
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Current Password
                  </label>
                  <input
                    type="password"
                    value={currentPass}
                    onChange={(e) => setCurrentPass(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    New Password
                  </label>
                  <input
                    type="password"
                    value={newPass}
                    onChange={(e) => setNewPass(e.target.value)}
                    placeholder="Enter new secure password"
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 font-mono"
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2 bg-slate-900 text-white text-xs font-semibold rounded-lg hover:bg-slate-800 transition-colors"
                >
                  Update Password
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* World Clock displayed on sign in page */}
      <div className="mt-8 flex justify-center pb-6">
        <WorldClock />
      </div>
    </div>
  );
};
