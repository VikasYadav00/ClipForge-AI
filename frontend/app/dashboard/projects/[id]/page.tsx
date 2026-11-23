'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Download,
  Film,
  FileText,
  Info,
  Clock,
  Sparkles,
  TrendingUp,
  Play,
  RotateCcw,
  Trash2,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Sliders,
  ExternalLink,
  Copy,
  Check,
  FolderOpen,
  PlusCircle,
} from 'lucide-react';
import { projectsApi } from '@/lib/api';
import { formatDuration, formatDate, formatFileSize } from '@/lib/utils';

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params?.id as string;

  const [project, setProject] = useState<any>(null);
  const [clips, setClips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'clips' | 'transcript' | 'details'>('clips');
  const [sortBy, setSortBy] = useState<'score' | 'duration' | 'number'>('score');
  const [filterType, setFilterType] = useState<string>('all');
  const [isDownloadingZip, setIsDownloadingZip] = useState(false);
  const [copiedClipId, setCopiedClipId] = useState<string | null>(null);
  const [isGeneratingMore, setIsGeneratingMore] = useState(false);
  const [customClipCount, setCustomClipCount] = useState<number>(5);
  const [isOpeningFolder, setIsOpeningFolder] = useState(false);
  const [folderNotification, setFolderNotification] = useState<string | null>(null);

  const fetchProjectData = async () => {
    try {
      const [projRes, clipsRes] = await Promise.all([
        projectsApi.get(projectId),
        projectsApi.getClips(projectId).catch(() => ({ data: { clips: [] } })),
      ]);
      setProject(projRes.data);
      setClips(clipsRes.data.clips || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjectData();

    // Polling while project is in progress
    const interval = setInterval(async () => {
      try {
        const res = await projectsApi.getStatus(projectId);
        setProject((prev: any) => ({
          ...prev,
          processing_status: res.data.status,
          processing_progress: res.data.progress,
          processing_stage: res.data.stage,
          error_message: res.data.error_message,
        }));

        // Dynamically fetch clips so user sees them appear live one by one as they finish
        const clipsRes = await projectsApi.getClips(projectId).catch(() => ({ data: { clips: [] } }));
        if (clipsRes.data?.clips) {
          setClips(clipsRes.data.clips);
        }

        if (res.data.status === 'completed') {
          await fetchProjectData();
          clearInterval(interval);
        }
      } catch (err) {
        // Silently retry on next tick without crashing the UI
        console.warn('Status poll retry:', err);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [projectId]);

  const handleDownloadZip = async () => {
    setIsDownloadingZip(true);
    try {
      const res = await projectsApi.downloadZip(projectId);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `ClipForge_${project.project_name.replace(/\s+/g, '_')}.zip`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
    } catch (err) {
      alert('Failed to generate ZIP archive. Please ensure clips have completed rendering.');
    } finally {
      setIsDownloadingZip(false);
    }
  };

  const handleGenerateMore = async (countToGenerate: number = customClipCount) => {
    const validCount = Math.max(1, Math.min(50, Number(countToGenerate) || 5));
    setIsGeneratingMore(true);
    try {
      await projectsApi.generateMore(projectId, validCount);
      setProject((prev: any) => ({
        ...prev,
        processing_status: 'generating_clips',
        processing_progress: 65,
        processing_stage: `AI scanning video for ${validCount} more viral clips...`,
      }));
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to generate more clips.');
      setIsGeneratingMore(false);
    }
  };

  const handleOpenFolder = async () => {
    setIsOpeningFolder(true);
    try {
      const res = await projectsApi.openFolder(projectId);
      setFolderNotification(`Opened local folder on PC: ${res.data.export_folder}`);
      setTimeout(() => setFolderNotification(null), 6000);
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Could not open folder on host PC.');
    } finally {
      setIsOpeningFolder(false);
    }
  };

  const sortedClips = [...clips].sort((a, b) => {
    if (sortBy === 'duration') return b.duration - a.duration;
    if (sortBy === 'number') return a.clip_number - b.clip_number;
    return b.viral_score - a.viral_score;
  }).filter((c) => filterType === 'all' || c.clip_type === filterType);

  if (loading) {
    return (
      <div className="py-24 text-center flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
        <p className="text-sm text-slate-500">Loading project details...</p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="py-16 text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-slate-900">Project Not Found</h2>
        <Link href="/dashboard/projects" className="mt-4 inline-block text-sm text-brand-600 font-semibold">
          ← Back to Projects
        </Link>
      </div>
    );
  }

  const isProcessing = ['downloading', 'queued', 'uploaded', 'transcribing', 'analyzing', 'detecting_highlights', 'generating_clips', 'adding_captions', 'rendering'].includes(
    project.processing_status
  );

  return (
    <div className="space-y-8 pb-16">
      {/* ── Top Bar ────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/projects"
            className="p-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                {project.project_name}
              </h1>
              {project.processing_status === 'completed' && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Ready
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Original duration: {formatDuration(project.original_duration)} • Uploaded {formatDate(project.created_at)}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Open Folder in Windows Explorer */}
          <button
            onClick={handleOpenFolder}
            disabled={isOpeningFolder}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs sm:text-sm border border-slate-300 shadow-sm transition-all disabled:opacity-50"
            title="Open local export folder on your PC"
          >
            {isOpeningFolder ? (
              <Loader2 className="w-4 h-4 animate-spin text-slate-600" />
            ) : (
              <FolderOpen className="w-4 h-4 text-brand-600" />
            )}
            <span>Open Folder</span>
          </button>

          {/* Generate More Clips with custom manual count */}
          {project.processing_status === 'completed' && (
            <div className="flex items-center rounded-xl border border-emerald-600 bg-white overflow-hidden shadow-sm">
              <div
                className="flex items-center pl-2.5 pr-2 py-1 bg-emerald-50 border-r border-emerald-200 gap-1"
                title="Kitne clips aur generate karne hain manually yahan likhein (1 to 50)"
              >
                <span className="text-xs font-black text-emerald-800">+</span>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={customClipCount}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    setCustomClipCount(isNaN(val) ? 1 : Math.max(1, Math.min(50, val)));
                  }}
                  className="w-12 text-center text-xs sm:text-sm font-black text-emerald-950 bg-white border border-emerald-300 rounded-lg py-1 px-1 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  title="Enter number of clips (e.g. 3, 5, 10, 15)"
                />
              </div>
              <button
                onClick={() => handleGenerateMore(customClipCount)}
                disabled={isProcessing || isGeneratingMore}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs sm:text-sm transition-all disabled:opacity-50"
                title={`Generate ${customClipCount} more clips from this video`}
              >
                {isGeneratingMore || (isProcessing && project?.processing_status === 'generating_clips') ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Extracting {customClipCount} Clips...</span>
                  </>
                ) : (
                  <>
                    <PlusCircle className="w-4 h-4" />
                    <span>Generate More Clips</span>
                  </>
                )}
              </button>
            </div>
          )}

          {project.processing_status === 'completed' && clips.length > 0 && (
            <button
              onClick={handleDownloadZip}
              disabled={isDownloadingZip}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs sm:text-sm shadow-sm hover:shadow transition-all disabled:opacity-50"
            >
              {isDownloadingZip ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Packaging ZIP...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Download All (ZIP)</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Local Folder Toast Alert */}
      {folderNotification && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2">
            <FolderOpen className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{folderNotification}</span>
          </div>
          <button
            onClick={() => setFolderNotification(null)}
            className="text-emerald-700 hover:text-emerald-900 font-bold px-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* ── Real-Time Processing Status Card ──────────────────────────────── */}
      {isProcessing && (
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-brand-200 shadow-md shadow-brand-500/5 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center">
                <Sparkles className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">AI Video Processing in Progress</h3>
                <p className="text-xs text-slate-500">{project.processing_stage || 'Analyzing content...'}</p>
              </div>
            </div>
            <span className="text-lg font-black text-brand-600 font-mono">{project.processing_progress}%</span>
          </div>

          {/* Progress bar */}
          <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-brand-600 to-violet-600 rounded-full transition-all duration-500"
              style={{ width: `${project.processing_progress}%` }}
            />
          </div>

          {/* Pipeline Stage Indicators with Live Active Spinners */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            {[
              {
                label: 'Download & Metadata',
                done: project.processing_progress >= 25,
                active: project.processing_progress < 25,
              },
              {
                label: 'Whisper Transcription',
                done: project.processing_progress >= 50,
                active: project.processing_progress >= 25 && project.processing_progress < 50,
              },
              {
                label: 'Viral Peak Detection',
                done: project.processing_progress >= 55,
                active: project.processing_progress >= 50 && project.processing_progress < 55,
              },
              {
                label: '9:16 Render & Auto-Export',
                done: project.processing_progress >= 100,
                active: project.processing_progress >= 55 && project.processing_progress < 100,
              },
            ].map((step, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${step.done
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : step.active
                      ? 'bg-brand-50 border-brand-300 text-brand-900 shadow-sm ring-1 ring-brand-200'
                      : 'bg-slate-50 border-slate-200 text-slate-500'
                  }`}
              >
                {step.done ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                ) : step.active ? (
                  <Loader2 className="w-4 h-4 text-brand-600 animate-spin flex-shrink-0" />
                ) : (
                  <div className="w-4 h-4 rounded-full border-2 border-slate-300 flex-shrink-0" />
                )}
                <span className="font-semibold line-clamp-1">{step.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Tabs Navigation ─────────────────────────────────────────────────── */}
      <div className="border-b border-slate-200">
        <div className="flex items-center gap-8">
          <button
            onClick={() => setActiveTab('clips')}
            className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'clips'
                ? 'border-brand-600 text-brand-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
          >
            <Film className="w-4 h-4" />
            <span>Generated Clips ({clips.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('details')}
            className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'details'
                ? 'border-brand-600 text-brand-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
          >
            <Info className="w-4 h-4" />
            <span>Source Details</span>
          </button>
        </div>
      </div>

      {/* ── Clips Tab ───────────────────────────────────────────────────────── */}
      {activeTab === 'clips' && (
        <div className="space-y-6">
          {/* Controls bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2 overflow-x-auto">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mr-1">Filter:</span>
              {['all', 'podcast', 'funny', 'educational', 'gaming', 'storytelling'].map((type) => (
                <button
                  key={type}
                  onClick={() => setFilterType(type)}
                  className={`px-3 py-1 rounded-xl text-xs font-semibold capitalize transition-colors ${filterType === type ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                >
                  {type}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Sort:</span>
              <select
                value={sortBy}
                onChange={(e: any) => setSortBy(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 focus:outline-none"
              >
                <option value="score">Highest Viral Score</option>
                <option value="duration">Longest Duration</option>
                <option value="number">Timeline Order</option>
              </select>
            </div>
          </div>

          {/* Clips Cards Grid */}
          {sortedClips.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-3xl border border-slate-200">
              <p className="text-sm font-semibold text-slate-600">
                {isProcessing ? 'Generating your clips...' : 'No clips available yet.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sortedClips.map((clip) => {
                const breakdown = clip.score_breakdown || {};
                return (
                  <div
                    key={clip.id}
                    className="bg-white rounded-3xl border border-slate-200/80 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col justify-between"
                  >
                    <div>
                      {/* Video Player Preview / Thumbnail */}
                      <div className="relative bg-slate-950 aspect-[9/16] overflow-hidden flex items-center justify-center">
                        <video
                          src={clip.video_url || ''}
                          poster={clip.thumbnail_path ? `/api/clips/file/${project.id}/${clip.thumbnail_path.split(/[\\/]/).pop()}` : undefined}
                          controls
                          className="w-full h-full object-cover"
                        />

                        {/* Badges on top */}
                        <div className="absolute top-3 left-3 flex items-center gap-1.5 pointer-events-none">
                          <span className="px-2.5 py-1 rounded-full text-xs font-black bg-emerald-500 text-white shadow flex items-center gap-1">
                            <TrendingUp className="w-3 h-3" />
                            {clip.viral_score}/100
                          </span>
                        </div>

                        <div className="absolute top-3 right-3 pointer-events-none">
                          <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-black/70 backdrop-blur-md text-white font-mono">
                            {clip.duration}s
                          </span>
                        </div>
                      </div>

                      {/* Info & Viral Breakdown */}
                      <div className="p-5 space-y-4">
                        <div>
                          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                            <span>Clip #{clip.clip_number} • {clip.clip_type?.toUpperCase()}</span>
                            <span>{formatDuration(clip.start_time)} - {formatDuration(clip.end_time)}</span>
                          </div>
                          <h3 className="text-base font-bold text-slate-900 line-clamp-1">{clip.title}</h3>
                        </div>

                        {/* Hook preview */}
                        {clip.hook_text && (
                          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs font-bold text-slate-800">
                            <span className="text-[10px] text-brand-600 uppercase tracking-wider block font-semibold mb-0.5">
                              Hook Text Banner
                            </span>
                            "{clip.hook_text}"
                          </div>
                        )}

                        {/* Viral Score Breakdown Matrix */}
                        <div className="space-y-1.5 pt-2 border-t border-slate-100 text-[11px]">
                          <span className="font-bold text-slate-700 block text-xs">Viral Score Breakdown:</span>
                          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-slate-600">
                            <div className="flex justify-between">
                              <span>Hook:</span>
                              <span className="font-semibold text-slate-900">{breakdown.hook ?? 18}/20</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Emotion:</span>
                              <span className="font-semibold text-slate-900">{breakdown.emotion ?? 13}/15</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Content:</span>
                              <span className="font-semibold text-slate-900">{breakdown.interesting ?? 14}/15</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Replay:</span>
                              <span className="font-semibold text-slate-900">{breakdown.replay ?? 13}/15</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Context:</span>
                              <span className="font-semibold text-slate-900">{breakdown.context ?? 13}/15</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Payoff:</span>
                              <span className="font-semibold text-slate-900">{breakdown.ending ?? 8}/10</span>
                            </div>
                          </div>
                        </div>

                        {/* AI Titles preview with 1-click copy */}
                        {clip.ai_titles && clip.ai_titles.length > 0 && (
                          <div className="pt-2 border-t border-slate-100 space-y-1">
                            <span className="font-bold text-slate-700 block text-xs">AI Viral Title Option:</span>
                            <div className="flex items-center justify-between text-xs text-slate-600 p-2 rounded-lg bg-slate-50 border border-slate-100">
                              <span className="truncate mr-2 font-medium">{clip.ai_titles[0]}</span>
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(clip.ai_titles[0]);
                                  setCopiedClipId(clip.id);
                                  setTimeout(() => setCopiedClipId(null), 2000);
                                }}
                                title="Copy title"
                                className="text-slate-400 hover:text-brand-600"
                              >
                                {copiedClipId === clip.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
                      <Link
                        href={`/dashboard/clips/${clip.id}`}
                        className="flex-1 py-2 px-3 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-semibold text-xs text-center transition-colors flex items-center justify-center gap-1.5"
                      >
                        <Sliders className="w-3.5 h-3.5" />
                        <span>Edit & Reframe</span>
                      </Link>

                      <a
                        href={`/api/clips/${clip.id}/download`}
                        download
                        className="py-2 px-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs text-center transition-colors flex items-center justify-center gap-1.5"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>MP4</span>
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Details Tab ─────────────────────────────────────────────────────── */}
      {activeTab === 'details' && (
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-sm space-y-6">
          <h3 className="text-base font-bold text-slate-900">Source Video Specifications</h3>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
              <dt className="text-xs text-slate-400 font-semibold uppercase">Original Filename</dt>
              <dd className="mt-1 font-bold text-slate-800">{project.original_filename || 'video.mp4'}</dd>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
              <dt className="text-xs text-slate-400 font-semibold uppercase">Duration</dt>
              <dd className="mt-1 font-bold text-slate-800">{formatDuration(project.original_duration)} ({Math.round(project.original_duration)} seconds)</dd>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
              <dt className="text-xs text-slate-400 font-semibold uppercase">Resolution & FPS</dt>
              <dd className="mt-1 font-bold text-slate-800">{project.original_resolution || '1920x1080'} @ {project.original_fps || 30} FPS</dd>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
              <dt className="text-xs text-slate-400 font-semibold uppercase">File Size</dt>
              <dd className="mt-1 font-bold text-slate-800">{formatFileSize(project.file_size)}</dd>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
              <dt className="text-xs text-slate-400 font-semibold uppercase">AI Model Used</dt>
              <dd className="mt-1 font-bold text-slate-800 uppercase">{project.ai_model_used || 'Gemini 1.5 Flash'}</dd>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
              <dt className="text-xs text-slate-400 font-semibold uppercase">Max Allowed Duration Rule</dt>
              <dd className="mt-1 font-bold text-emerald-600">30 Seconds Maximum (Strict Enforcement)</dd>
            </div>
          </dl>
        </div>
      )}
    </div>
  );
}
