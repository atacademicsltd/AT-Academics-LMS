import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
  variant?: 'icon' | 'badge' | 'menu-item';
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  className = '',
  showLabel = false,
  variant = 'icon',
}) => {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  if (variant === 'menu-item') {
    return (
      <button
        type="button"
        onClick={toggleTheme}
        className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded-lg transition-colors cursor-pointer ${
          isDark
            ? 'text-slate-200 hover:bg-slate-800'
            : 'text-slate-700 hover:bg-slate-50'
        } ${className}`}
        role="switch"
        aria-checked={isDark}
        aria-label="Toggle theme mode"
      >
        <div className="flex items-center gap-2">
          {isDark ? (
            <Sun className="w-3.5 h-3.5 text-amber-400" />
          ) : (
            <Moon className="w-3.5 h-3.5 text-slate-600" />
          )}
          <span className="font-medium">Theme Mode</span>
        </div>
        <span
          className={`text-[10px] font-mono px-2 py-0.5 rounded-full uppercase tracking-wider font-semibold ${
            isDark
              ? 'bg-slate-800 text-amber-300 border border-slate-700'
              : 'bg-slate-100 text-slate-700 border border-slate-200'
          }`}
        >
          {isDark ? 'Dark' : 'Light'}
        </span>
      </button>
    );
  }

  if (variant === 'badge') {
    return (
      <button
        type="button"
        onClick={toggleTheme}
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer shadow-2xs ${
          isDark
            ? 'bg-slate-900 border-slate-700 text-slate-200 hover:bg-slate-800 hover:border-slate-600'
            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900'
        } ${className}`}
        role="switch"
        aria-checked={isDark}
        aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      >
        {isDark ? (
          <Sun className="w-3.5 h-3.5 text-amber-400" />
        ) : (
          <Moon className="w-3.5 h-3.5 text-slate-600" />
        )}
        <span>{isDark ? 'Dark Mode' : 'Light Mode'}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`relative p-2 rounded-lg transition-colors cursor-pointer flex items-center justify-center ${
        isDark
          ? 'text-amber-400 hover:text-amber-300 hover:bg-slate-800/80'
          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
      } ${className}`}
      role="switch"
      aria-checked={isDark}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isDark ? (
        <Sun className="w-4 h-4 transition-transform duration-200 hover:rotate-45" />
      ) : (
        <Moon className="w-4 h-4 transition-transform duration-200 hover:-rotate-12" />
      )}
      {showLabel && (
        <span className="ml-1.5 text-xs font-medium">
          {isDark ? 'Light' : 'Dark'}
        </span>
      )}
    </button>
  );
};
