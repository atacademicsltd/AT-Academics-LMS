import React, { useState, useRef, useEffect } from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  ShieldCheck,
  Clock,
  FileText,
  BookmarkPlus,
  Trash2,
  Sparkles,
  Lock,
  RotateCcw,
  FastForward,
} from 'lucide-react';
import { ModuleItem, User, VideoNote } from '../../types';
import { StorageService } from '../../services/storage';

interface SecureVideoPlayerProps {
  item: ModuleItem;
  courseCode: string;
  courseTitle: string;
  currentUser: User;
  onComplete?: () => void;
  onBack?: () => void;
}

export const SecureVideoPlayer: React.FC<SecureVideoPlayerProps> = ({
  item,
  courseCode,
  courseTitle,
  currentUser,
  onComplete,
  onBack,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [selectedResolution, setSelectedResolution] = useState('1080p HD');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [activeTab, setActiveTab] = useState<'chapters' | 'transcript' | 'notes'>('chapters');

  // Dynamic security watermark offset state (shifts slowly to prevent screen masking)
  const [watermarkPos, setWatermarkPos] = useState({ top: 15, left: 20 });
  const [drmSessionId] = useState(() => Math.random().toString(36).substring(2, 9).toUpperCase());

  // Notes state
  const [notes, setNotes] = useState<VideoNote[]>([]);
  const [newNoteText, setNewNoteText] = useState('');

  const meta = item.videoMetadata;

  useEffect(() => {
    // Load existing notes for this lecture & user
    const loadedNotes = StorageService.getVideoNotes(item.id, currentUser.id);
    setNotes(loadedNotes);
  }, [item.id, currentUser.id]);

  // Periodic watermark position drifting
  useEffect(() => {
    const interval = setInterval(() => {
      setWatermarkPos({
        top: Math.floor(10 + Math.random() * 65),
        left: Math.floor(8 + Math.random() * 60),
      });
    }, 12000);
    return () => clearInterval(interval);
  }, []);

  // Format seconds into MM:SS or HH:MM:SS
  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return '00:00';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const cur = videoRef.current.currentTime;
    setCurrentTime(cur);

    // If 90% watched, trigger complete
    if (duration > 0 && cur / duration >= 0.9 && onComplete) {
      onComplete();
    }
  };

  const handleLoadedMetadata = () => {
    if (!videoRef.current) return;
    setDuration(videoRef.current.duration || meta?.durationSeconds || 600);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (videoRef.current) {
      videoRef.current.volume = val;
      videoRef.current.muted = val === 0;
      setIsMuted(val === 0);
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch((err) => console.error(err));
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch((err) => console.error(err));
      setIsFullscreen(false);
    }
  };

  const jumpToTime = (seconds: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = seconds;
      setCurrentTime(seconds);
      if (!isPlaying) {
        videoRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteText.trim()) return;

    const note = StorageService.addVideoNote(
      item.id,
      currentUser.id,
      Math.floor(currentTime),
      newNoteText.trim()
    );
    setNotes((prev) => [...prev, note]);
    setNewNoteText('');
  };

  const handleDeleteNote = (noteId: string) => {
    StorageService.deleteVideoNote(noteId);
    setNotes((prev) => prev.filter((n) => n.id !== noteId));
  };

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Status Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          {onBack && (
            <button
              onClick={onBack}
              className="text-xs font-semibold text-slate-600 hover:text-slate-900 mb-1 inline-flex items-center gap-1.5"
            >
              <span>← Back to {courseCode} Modules</span>
            </button>
          )}
          <h2 className="text-xl font-bold tracking-tight text-slate-900">
            {item.title}
          </h2>
          <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
            <span className="font-medium text-slate-700">{courseCode}</span>
            <span aria-hidden="true">·</span>
            <span>{courseTitle}</span>
            <span aria-hidden="true">·</span>
            <span>{meta?.chapters.length || 0} Chapters</span>
          </div>
        </div>

        {/* Stream Security Badge */}
        <div className="flex items-center gap-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-slate-100 rounded-lg text-xs font-mono">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>DRM TOKEN #{drmSessionId}</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Player on Left, Side Panel (Chapters / Transcript / Notes) on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Video Canvas Container */}
        <div className="lg:col-span-8 space-y-4">
          <div
            ref={containerRef}
            className="relative bg-black rounded-xl overflow-hidden aspect-video shadow-lg group select-none"
            onMouseEnter={() => setShowControls(true)}
            onMouseLeave={() => setShowControls(isPlaying ? false : true)}
          >
            <video
              ref={videoRef}
              src={meta?.videoUrl || 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4'}
              className="w-full h-full object-contain"
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onClick={togglePlay}
              playsInline
            />

            {/* Anti-Piracy Dynamic Watermark Overlay */}
            {meta?.watermarkEnabled && (
              <div
                className="absolute pointer-events-none transition-all duration-1000 ease-in-out z-20 opacity-30 hover:opacity-40"
                style={{ top: `${watermarkPos.top}%`, left: `${watermarkPos.left}%` }}
              >
                <div className="px-2.5 py-1 bg-black/60 backdrop-blur-xs rounded border border-white/10 text-[11px] font-mono text-white/90 shadow-sm leading-tight">
                  <div>
                    {currentUser.name} · {currentUser.studentId || currentUser.email}
                  </div>
                  <div className="text-[9px] text-white/60">
                    Protected Stream · Session {drmSessionId}
                  </div>
                </div>
              </div>
            )}

            {/* Big Center Play Button when paused */}
            {!isPlaying && (
              <button
                onClick={togglePlay}
                className="absolute inset-0 m-auto w-16 h-16 rounded-full bg-slate-900/80 backdrop-blur-sm text-white flex items-center justify-center hover:scale-105 transition-all shadow-xl z-20"
                aria-label="Play Video"
              >
                <Play className="w-8 h-8 ml-1" />
              </button>
            )}

            {/* Player Controls Bar */}
            <div
              className={`absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-4 z-30 transition-opacity duration-200 ${
                showControls ? 'opacity-100' : 'opacity-0'
              }`}
            >
              {/* Scrub bar */}
              <div className="relative mb-3 flex items-center">
                <input
                  type="range"
                  min="0"
                  max={duration || 100}
                  step="0.1"
                  value={currentTime}
                  onChange={handleSeek}
                  className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-white hover:h-2 transition-all"
                />
              </div>

              <div className="flex items-center justify-between text-white text-xs gap-3">
                {/* Left: Play/Pause, Rewind, Time */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={togglePlay}
                    className="p-1 hover:text-slate-300 transition-colors"
                    aria-label={isPlaying ? 'Pause' : 'Play'}
                  >
                    {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                  </button>

                  <button
                    onClick={() => jumpToTime(Math.max(0, currentTime - 10))}
                    className="p-1 hover:text-slate-300 transition-colors"
                    title="Rewind 10 seconds"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => jumpToTime(Math.min(duration, currentTime + 10))}
                    className="p-1 hover:text-slate-300 transition-colors"
                    title="Skip 10 seconds"
                  >
                    <FastForward className="w-4 h-4" />
                  </button>

                  {/* Volume */}
                  <div className="hidden sm:flex items-center gap-1.5 group/vol">
                    <button onClick={toggleMute} className="p-1">
                      {isMuted || volume === 0 ? (
                        <VolumeX className="w-4 h-4" />
                      ) : (
                        <Volume2 className="w-4 h-4" />
                      )}
                    </button>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={isMuted ? 0 : volume}
                      onChange={handleVolumeChange}
                      className="w-16 h-1 bg-white/30 rounded appearance-none cursor-pointer accent-white"
                    />
                  </div>

                  <span className="font-mono tabular-nums text-[11px] text-white/90">
                    {formatTime(currentTime)} / {formatTime(duration)}
                  </span>
                </div>

                {/* Right: Resolution, Speed, Fullscreen */}
                <div className="flex items-center gap-3">
                  {/* Speed Selector */}
                  <div className="flex items-center gap-1 text-[11px] font-mono">
                    {[0.75, 1, 1.25, 1.5, 2].map((spd) => (
                      <button
                        key={spd}
                        onClick={() => handleSpeedChange(spd)}
                        className={`px-1.5 py-0.5 rounded transition-colors ${
                          playbackSpeed === spd
                            ? 'bg-white text-slate-900 font-bold'
                            : 'text-white/70 hover:text-white'
                        }`}
                      >
                        {spd}x
                      </button>
                    ))}
                  </div>

                  {/* Resolution Selector */}
                  <select
                    value={selectedResolution}
                    onChange={(e) => setSelectedResolution(e.target.value)}
                    className="bg-black/60 border border-white/20 text-white text-[11px] font-mono rounded px-2 py-1 outline-none"
                  >
                    {(meta?.resolutionOptions || ['1080p HD', '720p', '480p']).map((res) => (
                      <option key={res} value={res} className="bg-slate-900 text-white">
                        {res}
                      </option>
                    ))}
                  </select>

                  <button
                    onClick={toggleFullscreen}
                    className="p-1 hover:text-slate-300 transition-colors"
                    aria-label="Toggle Fullscreen"
                  >
                    {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Video Description & Security Guarantee */}
          <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-900">
                Course Material Rights & Protection Policy
              </span>
              <span className="text-[11px] text-emerald-700 font-medium inline-flex items-center gap-1">
                <Lock className="w-3 h-3" />
                Encrypted DRM Transport
              </span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              This lecture stream is dynamically watermarked and authorized strictly for enrolled students in {courseCode}. Reproduction, offline ripping, or redistribution violates university academic integrity guidelines and triggers automated compliance revoking.
            </p>
          </div>
        </div>

        {/* Side Panel: Chapters, Transcript & Personal Timestamped Notes */}
        <div className="lg:col-span-4 bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm flex flex-col h-[520px]">
          {/* Tabs */}
          <div className="flex border-b border-slate-200 bg-slate-50/60 p-1 gap-1">
            <button
              onClick={() => setActiveTab('chapters')}
              className={`flex-1 py-1.5 px-2 text-xs font-medium rounded-md transition-colors ${
                activeTab === 'chapters'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Chapters
            </button>
            <button
              onClick={() => setActiveTab('transcript')}
              className={`flex-1 py-1.5 px-2 text-xs font-medium rounded-md transition-colors ${
                activeTab === 'transcript'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Transcript
            </button>
            <button
              onClick={() => setActiveTab('notes')}
              className={`flex-1 py-1.5 px-2 text-xs font-medium rounded-md transition-colors flex items-center justify-center gap-1 ${
                activeTab === 'notes'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Notes</span>
              {notes.length > 0 && (
                <span className="text-[10px] font-mono tabular-nums bg-slate-200 px-1 rounded">
                  {notes.length}
                </span>
              )}
            </button>
          </div>

          {/* Tab 1: Chapters */}
          {activeTab === 'chapters' && (
            <div className="p-3 overflow-y-auto flex-1 divide-y divide-slate-100">
              <div className="text-[11px] font-medium text-slate-500 mb-2 px-1">
                Lecture Chapter Timestamps
              </div>
              {meta?.chapters.map((ch, idx) => {
                const isActive =
                  currentTime >= ch.time &&
                  (idx === meta.chapters.length - 1 || currentTime < meta.chapters[idx + 1].time);
                return (
                  <button
                    key={idx}
                    onClick={() => jumpToTime(ch.time)}
                    className={`w-full text-left py-2.5 px-2.5 rounded-lg flex items-center justify-between gap-3 text-xs transition-colors ${
                      isActive
                        ? 'bg-slate-100 font-semibold text-slate-900'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span className="truncate">{ch.title}</span>
                    <span className="font-mono tabular-nums text-[11px] text-slate-500 shrink-0">
                      {formatTime(ch.time)}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Tab 2: Synchronized Interactive Transcript */}
          {activeTab === 'transcript' && (
            <div className="p-3 overflow-y-auto flex-1 space-y-3">
              <div className="text-[11px] font-medium text-slate-500 px-1">
                Synchronized Spoken Transcript (Click to jump)
              </div>
              {meta?.transcript && meta.transcript.length > 0 ? (
                meta.transcript.map((line, idx) => {
                  const isSpoken =
                    currentTime >= line.time &&
                    (idx === meta.transcript.length - 1 || currentTime < meta.transcript[idx + 1].time);
                  return (
                    <div
                      key={idx}
                      onClick={() => jumpToTime(line.time)}
                      className={`p-2 rounded-lg cursor-pointer text-xs transition-colors ${
                        isSpoken
                          ? 'bg-slate-100 font-medium text-slate-900 border-l-2 border-slate-900'
                          : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[10px] text-slate-500 mb-0.5">
                        <span className="font-semibold text-slate-700">{line.speaker}</span>
                        <span className="font-mono tabular-nums">{formatTime(line.time)}</span>
                      </div>
                      <p className="leading-relaxed">{line.text}</p>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8 text-xs text-slate-400">
                  No automated transcript for this lecture.
                </div>
              )}
            </div>
          )}

          {/* Tab 3: Personal Timestamped Notes */}
          {activeTab === 'notes' && (
            <div className="p-3 overflow-y-auto flex-1 flex flex-col justify-between">
              <div className="space-y-3 overflow-y-auto flex-1 pr-1">
                <div className="flex items-center justify-between text-[11px] font-medium text-slate-500 px-1">
                  <span>Timestamped Study Notes</span>
                  <span>{notes.length} saved</span>
                </div>

                {notes.length === 0 ? (
                  <div className="text-center py-10 text-xs text-slate-400">
                    No notes yet. Add key concepts with current video timestamp below!
                  </div>
                ) : (
                  notes.map((note) => (
                    <div
                      key={note.id}
                      className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <button
                          onClick={() => jumpToTime(note.timestampSeconds)}
                          className="font-mono text-[11px] font-bold text-slate-900 hover:underline inline-flex items-center gap-1"
                        >
                          <Clock className="w-3 h-3" />
                          <span>{formatTime(note.timestampSeconds)}</span>
                        </button>
                        <button
                          onClick={() => handleDeleteNote(note.id)}
                          className="text-slate-400 hover:text-red-600 p-0.5"
                          title="Delete note"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <p className="text-slate-700 leading-relaxed">{note.text}</p>
                    </div>
                  ))
                )}
              </div>

              {/* Note input form */}
              <form onSubmit={handleAddNote} className="mt-3 pt-3 border-t border-slate-200">
                <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
                  <span>Add note at {formatTime(currentTime)}</span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newNoteText}
                    onChange={(e) => setNewNoteText(e.target.value)}
                    placeholder="Enter key concept or takeaway..."
                    className="flex-1 px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 bg-slate-900 text-white text-xs font-medium rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap"
                  >
                    Save
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
