import React, { useState, useEffect } from 'react';
import { Globe, Clock } from 'lucide-react';

export const WorldClock: React.FC = () => {
  const [time, setTime] = useState<Date>(new Date());
  const [timeZone, setTimeZone] = useState<string>('');

  useEffect(() => {
    try {
      const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
      setTimeZone(detected || 'Local');
    } catch {
      setTimeZone('Local');
    }

    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Formatted parts
  const formattedTime = time.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });

  const formattedDate = time.toLocaleDateString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  // Short city or zone label
  const cleanZoneName = timeZone.replace(/_/g, ' ');

  return (
    <div className="flex items-center gap-2 px-2.5 py-1 bg-slate-100/90 border border-slate-200/90 rounded-lg text-slate-700 shadow-2xs font-mono text-xs select-none">
      <Globe className="w-3.5 h-3.5 text-slate-500 shrink-0" />
      <div className="flex items-center gap-1.5 leading-none">
        <span className="font-bold tabular-nums text-slate-900">{formattedTime}</span>
        <span className="text-slate-300">·</span>
        <span className="text-[11px] text-slate-500 hidden sm:inline">{formattedDate}</span>
        <span className="text-slate-300 hidden sm:inline">·</span>
        <span className="text-[10px] text-slate-600 truncate max-w-[130px]" title={timeZone}>
          {cleanZoneName}
        </span>
      </div>
    </div>
  );
};
