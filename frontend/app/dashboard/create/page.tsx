'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  UploadCloud,
  FileVideo,
  X,
  CheckCircle2,
  Clock,
  Sparkles,
  Subtitles,
  Smartphone,
  ScanFace,
  Wand2,
  Loader2,
  AlertCircle,
  Hash,
  Type,
  Music,
  ShieldCheck,
  Link2,
  Youtube,
  HardDrive,
  Zap,
} from 'lucide-react';
import { projectsApi } from '@/lib/api';
import { formatFileSize } from '@/lib/utils';

export default function CreateClipsPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Input Mode: 'upload' or 'youtube'
  const [inputMode, setInputMode] = useState<'upload' | 'youtube'>('upload');

  // File Upload State
  const [file, setFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [projectName, setProjectName] = useState('');

  // YouTube State
  const [youtubeUrl, setYoutubeUrl] = useState('');

  // General State
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Clip Settings State
  const [maxDuration, setMaxDuration] = useState<number>(30); // STRICT: max 30
  const [minDuration, setMinDuration] = useState<number>(10);
  const [numClips, setNumClips] = useState<number>(5);
  const [clipStyle, setClipStyle] = useState<string>('auto');
  const [captionStyle, setCaptionStyle] = useState<string>('subtle');

  // Feature Toggles
  const [addCaptions, setAddCaptions] = useState(true);
  const [addHook, setAddHook] = useState(true);
  const [addWatermark, setAddWatermark] = useState(false);
  const [smartCrop, setSmartCrop] = useState(true);
  const [faceTracking, setFaceTracking] = useState(true);
  const [addBackgroundMusic, setAddBackgroundMusic] = useState(false);
  const [generateTitles, setGenerateTitles] = useState(true);
  const [generateHashtags, setGenerateHashtags] = useState(true);

  const handleFileSelect = (selectedFile: File) => {
    setError(null);
    // Allow ANY video format up to 20 GB
    const maxSizeBytes = 20 * 1024 * 1024 * 1024; // 20 GB

    if (selectedFile.size > maxSizeBytes) {
      setError('File size exceeds the 20 GB limit.');
      return;
    }

    setFile(selectedFile);
    if (!projectName) {
      setProjectName(selectedFile.name.replace(/\.[^/.]+$/, ''));
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const isValidYoutubeUrl = (url: string) => {
    const pattern = /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|shorts\/|live\/)|youtu\.be\/)[\w\-]{11}/i;
    return pattern.test(url.trim());
  };

  const startProcessing = async () => {
    setError(null);

    const settingsPayload = {
      max_clip_duration: Math.min(Number(maxDuration), 30), // STRICT 30s CHECK
      min_clip_duration: Number(minDuration),
      num_clips: Number(numClips),
      clip_style: clipStyle,
      video_format: '9:16',
      caption_style: captionStyle,
      add_captions: addCaptions && captionStyle !== 'none',
      add_hook: addHook,
      add_watermark: addWatermark,
      smart_crop: smartCrop,
      face_tracking: faceTracking,
      add_background_music: addBackgroundMusic,
      generate_titles: generateTitles,
      generate_hashtags: generateHashtags,
    };

    if (inputMode === 'upload') {
      if (!file) {
        setError('Please select a video file to upload.');
        return;
      }

      setIsUploading(true);

      try {
        // 1. Create Project
        const name = projectName.trim() || file.name.replace(/\.[^/.]+$/, '');
        const projRes = await projectsApi.create({ project_name: name });
        const projId = projRes.data.id;

        // 2. Upload video file with progress (supports up to 20 GB)
        const formData = new FormData();
        formData.append('file', file);
        await projectsApi.upload(projId, formData, (percent) => {
          setUploadProgress(percent);
        });

        // 3. Start AI Processing
        setIsProcessing(true);
        await projectsApi.process(projId, settingsPayload);

        // Redirect to project detail view for live progress
        router.push(`/dashboard/projects/${projId}`);
      } catch (err: any) {
        const msg = err.response?.data?.detail || 'Failed to upload and start processing.';
        setError(typeof msg === 'string' ? msg : JSON.stringify(msg));
        setIsUploading(false);
        setIsProcessing(false);
      }
    } else {
      // YouTube Mode
      if (!youtubeUrl.trim()) {
        setError('Please paste a YouTube video URL.');
        return;
      }

      if (!isValidYoutubeUrl(youtubeUrl)) {
        setError('Invalid YouTube link. Please provide a valid youtube.com or youtu.be URL.');
        return;
      }

      setIsProcessing(true);

      try {
        // 1. Ingest YouTube Video with clipping settings
        const ytRes = await projectsApi.createFromYouTube({
          youtube_url: youtubeUrl.trim(),
          project_name: projectName.trim() || undefined,
          clip_settings: settingsPayload,
        });
        const projId = ytRes.data.id;

        // 2. Redirect to project detail view where live progress is monitored
        router.push(`/dashboard/projects/${projId}`);
      } catch (err: any) {
        const msg = err.response?.data?.detail || 'Failed to ingest YouTube video.';
        setError(typeof msg === 'string' ? msg : JSON.stringify(msg));
        setIsProcessing(false);
      }
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16">
      {/* ── Title Header ──────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Create Viral Clips</h1>
          <p className="mt-1 text-sm text-slate-500">
            Upload any video format (up to 20 GB) or paste a YouTube URL to extract viral 9:16 Shorts.
          </p>
        </div>

        {/* Unlimited Credits Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold w-fit">
          <Zap className="w-3.5 h-3.5 text-emerald-600 fill-emerald-600" />
          <span>Unlimited AI Credits Active</span>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* ── Step 1: Video Ingestion Mode Selector ──────────────────────────── */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-sm space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-brand-600 text-white text-xs flex items-center justify-center font-bold">1</span>
            <span>Choose Video Source</span>
          </h2>

          {/* Mode Switch Tabs */}
          <div className="flex p-1 bg-slate-100 rounded-xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => { setInputMode('upload'); setError(null); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                inputMode === 'upload'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <HardDrive className="w-3.5 h-3.5 text-brand-600" />
              <span>Upload Video (Up to 20GB)</span>
            </button>
            <button
              type="button"
              onClick={() => { setInputMode('youtube'); setError(null); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                inputMode === 'youtube'
                  ? 'bg-white text-red-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Youtube className="w-3.5 h-3.5 text-red-600" />
              <span>Paste YouTube Link</span>
            </button>
          </div>
        </div>

        {/* ── Sub-view A: File Upload ───────────────────────────────────────── */}
        {inputMode === 'upload' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Any Video Format Supported (MP4, MOV, MKV, WEBM, AVI, FLV, WMV, TS, etc.)</span>
              <span className="font-bold text-brand-600">Max 20 GB</span>
            </div>

            {!file ? (
              <div
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 hover:border-brand-500 rounded-2xl p-10 text-center cursor-pointer transition-colors bg-slate-50/50 hover:bg-brand-50/20 group"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/*,.mp4,.mov,.mkv,.webm,.avi,.flv,.wmv,.m4v,.3gp,.ts,.mts,.mpeg,.mpg,.vob,.mxf"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileSelect(e.target.files[0]);
                    }
                  }}
                />
                <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 text-brand-600 flex items-center justify-center mx-auto mb-4 group-hover:scale-105 transition-transform shadow-sm">
                  <UploadCloud className="w-7 h-7" />
                </div>
                <p className="text-sm font-bold text-slate-800">
                  Drag and drop your video file here, or <span className="text-brand-600">browse</span>
                </p>
                <p className="text-xs text-slate-500 mt-1">Supports any video format • Files up to 20 GB in size</p>
              </div>
            ) : (
              <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-12 h-12 rounded-xl bg-brand-100 text-brand-600 flex items-center justify-center flex-shrink-0">
                    <FileVideo className="w-6 h-6" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900 truncate">{file.name}</p>
                    <p className="text-xs text-slate-500">{formatFileSize(file.size)}</p>
                  </div>
                </div>
                {!isUploading && (
                  <button
                    onClick={() => setFile(null)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
            )}

            {/* Upload Progress */}
            {isUploading && (
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-semibold text-slate-600">
                  <span>{isProcessing ? 'Initiating AI clipping engine...' : 'Uploading video to server...'}</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-brand-600 to-violet-600 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Sub-view B: YouTube URL Ingestion ─────────────────────────────── */}
        {inputMode === 'youtube' && (
          <div className="space-y-4">
            <div className="p-4 bg-red-50/60 border border-red-200/60 rounded-2xl">
              <label className="block text-xs font-bold text-red-950 uppercase tracking-wider mb-2 flex items-center gap-2">
                <Youtube className="w-4 h-4 text-red-600" />
                <span>Paste YouTube Video or Shorts URL</span>
              </label>
              <div className="relative">
                <input
                  type="url"
                  value={youtubeUrl}
                  onChange={(e) => {
                    setYoutubeUrl(e.target.value);
                    setError(null);
                  }}
                  placeholder="https://www.youtube.com/watch?v=... or https://youtu.be/..."
                  className="w-full pl-10 pr-4 py-3 bg-white rounded-xl border border-red-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500 transition-all placeholder:text-slate-400 font-mono"
                />
                <Link2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              </div>
              <p className="text-xs text-slate-500 mt-2">
                ClipForge AI will automatically download the stream, transcribe speech with Whisper, detect the best viral moments, and render 9:16 vertical Shorts.
              </p>
            </div>
          </div>
        )}

        {/* Project Name Input */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
            Project Name (Optional)
          </label>
          <input
            type="text"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            placeholder="e.g., Podcast Episode Highlights #42"
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all placeholder:text-slate-400"
          />
        </div>
      </div>

      {/* ── Step 2: Clip Settings (Strict Duration Enforced) ───────────────── */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-sm space-y-8">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-brand-600 text-white text-xs flex items-center justify-center font-bold">2</span>
            <span>Clip & Timing Preferences</span>
          </h2>
          <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
            Strict Limit: Max 30 Seconds
          </span>
        </div>

        {/* Maximum Duration Selection */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
            Maximum Duration per Clip (Hard Capped at 30s)
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[15, 20, 25, 30].map((dur) => (
              <button
                key={dur}
                type="button"
                onClick={() => setMaxDuration(dur)}
                className={`py-3 px-4 rounded-xl border text-sm font-semibold transition-all ${
                  maxDuration === dur
                    ? 'border-brand-600 bg-brand-50 text-brand-700 shadow-sm'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                }`}
              >
                {dur} Seconds {dur === 30 && '(Recommended)'}
              </button>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-slate-500">
            Clips will be intelligently trimmed to the strongest punchline or statement within this threshold.
          </p>
        </div>

        {/* Number of clips */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
            Number of Clips to Generate
          </label>
          <div className="grid grid-cols-5 gap-3">
            {[3, 5, 10, 15, 20].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => setNumClips(num)}
                className={`py-2.5 px-3 rounded-xl border text-sm font-semibold transition-all ${
                  numClips === num
                    ? 'border-brand-600 bg-brand-50 text-brand-700 shadow-sm'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                }`}
              >
                {num} Clips
              </button>
            ))}
          </div>
        </div>

        {/* Clip Style Selection */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
            Highlight Moment Style
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { id: 'auto', label: '🎯 Auto Detect Best' },
              { id: 'funny', label: '😂 Funny Moments' },
              { id: 'podcast', label: '🎙️ Podcast Highlights' },
              { id: 'gaming', label: '🎮 Gaming Highlights' },
              { id: 'educational', label: '📚 Educational' },
              { id: 'storytelling', label: '📖 Storytelling' },
              { id: 'emotional', label: '😢 Emotional' },
              { id: 'motivational', label: '💪 Motivational' },
              { id: 'controversial', label: '🔥 Controversial' },
            ].map((style) => (
              <button
                key={style.id}
                type="button"
                onClick={() => setClipStyle(style.id)}
                className={`py-2.5 px-3 rounded-xl border text-xs sm:text-sm font-semibold text-left transition-all ${
                  clipStyle === style.id
                    ? 'border-brand-600 bg-brand-50 text-brand-700 shadow-sm'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                }`}
              >
                {style.label}
              </button>
            ))}
          </div>
        </div>

        {/* Subtitle Styles */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
            Caption & Subtitle Typography Style
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { id: 'subtle', label: '✨ Subtle / Small (Shorts)', desc: 'Compact, 1-2 line modern Shorts captions (Recommended)' },
              { id: 'none', label: '🚫 No Captions (Clean Video)', desc: '100% clean video with zero subtitle overlay' },
              { id: 'bold', label: 'Bold Outline', desc: 'White text, thin black outline' },
              { id: 'clean', label: 'Clean Minimal', desc: 'Subtle white modern sans-serif' },
              { id: 'gaming', label: 'Gaming Neon', desc: 'Vibrant punchy high-contrast' },
              { id: 'podcast', label: 'Podcast Dialogue', desc: 'Warm professional dialogue font' },
            ].map((sub) => (
              <button
                key={sub.id}
                type="button"
                onClick={() => {
                  setCaptionStyle(sub.id);
                  if (sub.id === 'none') {
                    setAddCaptions(false);
                  } else {
                    setAddCaptions(true);
                  }
                }}
                className={`p-3 rounded-xl border text-left transition-all ${
                  captionStyle === sub.id
                    ? 'border-brand-600 bg-brand-50 text-brand-700 shadow-sm'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                }`}
              >
                <p className="text-xs font-bold">{sub.label}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">{sub.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Feature Toggles */}
        <div className="space-y-3 pt-4 border-t border-slate-100">
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
            AI Rendering Enhancements (Maximum Quality)
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              {
                id: 'captions',
                label: 'Animated Subtitles',
                desc: 'Generate word-level animated captions',
                checked: addCaptions,
                setter: setAddCaptions,
                icon: Subtitles,
              },
              {
                id: 'hook',
                label: 'Visual Hook Overlay',
                desc: 'Overlay high-impact hook headline at top',
                checked: addHook,
                setter: setAddHook,
                icon: Type,
              },
              {
                id: 'smartcrop',
                label: 'Smart 9:16 Vertical Crop',
                desc: 'Intelligently reframe landscape to portrait',
                checked: smartCrop,
                setter: setSmartCrop,
                icon: Smartphone,
              },
              {
                id: 'face',
                label: 'Face Tracking & Centering',
                desc: 'Center camera on active speaker dynamically',
                checked: faceTracking,
                setter: setFaceTracking,
                icon: ScanFace,
              },
              {
                id: 'titles',
                label: 'AI Viral Titles',
                desc: 'Generate 3 high-CTR titles for YouTube/TikTok',
                checked: generateTitles,
                setter: setGenerateTitles,
                icon: Wand2,
              },
              {
                id: 'hashtags',
                label: 'Trending Hashtags',
                desc: 'Generate viral niche hashtags for publishing',
                checked: generateHashtags,
                setter: setGenerateHashtags,
                icon: Hash,
              },
            ].map((feature) => {
              const Icon = feature.icon;
              return (
                <label
                  key={feature.id}
                  className={`flex items-start gap-3 p-3.5 rounded-2xl border cursor-pointer transition-all ${
                    feature.checked
                      ? 'border-brand-500/80 bg-brand-50/30'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={feature.checked}
                    onChange={(e) => feature.setter(e.target.checked)}
                    className="mt-0.5 rounded text-brand-600 focus:ring-brand-500 w-4 h-4"
                  />
                  <div>
                    <div className="flex items-center gap-1.5">
                      <Icon className="w-3.5 h-3.5 text-brand-600" />
                      <p className="text-xs font-bold text-slate-900">{feature.label}</p>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">{feature.desc}</p>
                  </div>
                </label>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Start Processing CTA ───────────────────────────────────────────── */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={startProcessing}
          disabled={isUploading || isProcessing || (inputMode === 'upload' ? !file : !youtubeUrl.trim())}
          className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm sm:text-base flex items-center justify-center gap-2.5 shadow-lg shadow-brand-500/25 hover:shadow-brand-500/35 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {isUploading || isProcessing ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>{isUploading ? 'Uploading Video...' : 'Starting AI Processing...'}</span>
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5" />
              <span>{inputMode === 'youtube' ? 'Start AI YouTube Clipping' : 'Start AI Processing'}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
