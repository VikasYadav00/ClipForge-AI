'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Play,
  Pause,
  Download,
  Scissors,
  Sparkles,
  Subtitles,
  Sliders,
  Copy,
  Check,
  Save,
  RotateCcw,
  AlertTriangle,
  Loader2,
  Share2,
  Clock,
  Film
} from 'lucide-react';
import { clipsApi } from '@/lib/api';
import { formatDuration } from '@/lib/utils';

export default function ClipEditorPage() {
  const params = useParams();
  const router = useRouter();
  const clipId = params?.id as string;

  const [clip, setClip] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rendering, setRendering] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Form edit states
  const [title, setTitle] = useState('');
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(25);
  const [hookText, setHookText] = useState('');
  const [captionText, setCaptionText] = useState('');
  const [subtitleStyle, setSubtitleStyle] = useState('bold');
  const [hasCaptions, setHasCaptions] = useState(true);
  const [hasHook, setHasHook] = useState(true);
  const [hasWatermark, setHasWatermark] = useState(false);

  // Copy feedback states
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Video element
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);

  useEffect(() => {
    clipsApi
      .get(clipId)
      .then((res) => {
        const c = res.data;
        setClip(c);
        setTitle(c.title || '');
        setStartTime(c.start_time || 0);
        setEndTime(c.end_time || Math.min((c.start_time || 0) + 25, (c.start_time || 0) + 30));
        setHookText(c.hook_text || '');
        setCaptionText(c.caption_text || '');
        setSubtitleStyle(c.subtitle_style || 'bold');
        setHasCaptions(c.has_captions ?? true);
        setHasHook(c.has_hook ?? true);
        setHasWatermark(c.has_watermark ?? false);
      })
      .catch((err) => {
        console.error(err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [clipId]);

  const duration = Math.max(0, endTime - startTime);
  const isExceedingMaxDuration = duration > 30.0;

  const handleSave = async () => {
    if (isExceedingMaxDuration) {
      alert('Error: Clip duration cannot exceed 30 seconds!');
      return;
    }

    setSaving(true);
    try {
      const res = await clipsApi.update(clipId, {
        title,
        start_time: Number(startTime),
        end_time: Number(endTime),
        hook_text: hookText,
        caption_text: captionText,
        subtitle_style: subtitleStyle,
        has_captions: hasCaptions,
        has_hook: hasHook,
        has_watermark: hasWatermark,
      });
      setClip(res.data);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const handleRerender = async () => {
    if (isExceedingMaxDuration) {
      alert('Error: Clip duration cannot exceed 30 seconds before rendering!');
      return;
    }

    setRendering(true);
    try {
      // First save latest edits
      await clipsApi.update(clipId, {
        title,
        start_time: Number(startTime),
        end_time: Number(endTime),
        hook_text: hookText,
        caption_text: captionText,
        subtitle_style: subtitleStyle,
        has_captions: hasCaptions,
        has_hook: hasHook,
        has_watermark: hasWatermark,
      });

      // Trigger re-render
      const res = await clipsApi.render(clipId);
      setClip(res.data);
      if (videoRef.current) {
        videoRef.current.load();
      }
      alert('Clip re-rendered successfully in 9:16 vertical format and auto-saved to your local folder!');
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Re-rendering failed. Please verify source video.');
    } finally {
      setRendering(false);
    }
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  if (loading) {
    return (
      <div className="py-24 text-center flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
        <p className="text-sm text-slate-500">Loading clip editor...</p>
      </div>
    );
  }

  if (!clip) {
    return (
      <div className="py-16 text-center">
        <h2 className="text-lg font-bold text-slate-900">Clip Not Found</h2>
        <Link href="/dashboard" className="text-sm text-brand-600 mt-2 inline-block">
          Return to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-16 max-w-6xl mx-auto">
      {/* ── Top Bar ────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href={`/dashboard/projects/${clip.project_id}`}
            className="p-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              Clip #{clip.clip_number} Editor
            </h1>
            <p className="text-xs text-slate-500">
              Fine-tune timestamps, hook banners, subtitle styling, and AI titles.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving || isExceedingMaxDuration}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs sm:text-sm shadow-sm transition-all disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>{saveSuccess ? 'Saved!' : 'Save Edits'}</span>
          </button>

          <button
            onClick={handleRerender}
            disabled={rendering || isExceedingMaxDuration}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs sm:text-sm shadow-sm hover:shadow transition-all disabled:opacity-50"
          >
            {rendering ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
            <span>Re-Render Video</span>
          </button>

          <a
            href={`/api/clips/${clip.id}/download`}
            download
            className="p-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors"
            title="Download MP4"
          >
            <Download className="w-4 h-4" />
          </a>
        </div>
      </div>

      {/* ── Main Editor Split View ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: 9:16 Vertical Video Player (5 cols) */}
        <div className="lg:col-span-5 bg-white p-4 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
          <div className="relative bg-slate-950 aspect-[9/16] rounded-2xl overflow-hidden flex items-center justify-center shadow-inner">
            <video
              ref={videoRef}
              src={clip.video_url || ''}
              controls
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onTimeUpdate={(e) => setCurrentTime((e.target as any).currentTime)}
              className="w-full h-full object-cover"
            />
          </div>

          <div className="flex items-center justify-between text-xs text-slate-500 px-1">
            <span className="font-semibold text-slate-700">9:16 Vertical • 1080×1920</span>
            <span className="font-mono">{formatDuration(clip.duration)} Duration</span>
          </div>

          {/* Viral Score Breakdown Card */}
          <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  Viral Potential Score
                </span>
                <span className="text-[10px] text-slate-400">AI Engagement Prediction</span>
              </div>
              <div className="text-right">
                <span className="text-xl font-black text-brand-600 font-mono">
                  {clip.viral_score ?? 85}
                </span>
                <span className="text-xs text-slate-400 font-medium">/100</span>
              </div>
            </div>

            {/* Score Progress Bar */}
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
              <div
                className="bg-gradient-to-r from-blue-500 to-violet-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, clip.viral_score ?? 85)}%` }}
              />
            </div>

            {/* Breakdown Categories */}
            <div className="space-y-1.5 pt-1">
              {[
                { label: 'Hook Strength', key: 'hook', max: 20, defaultVal: 18 },
                { label: 'Emotional Impact', key: 'emotion', max: 15, defaultVal: 13 },
                { label: 'Interesting Content', key: 'interesting', max: 15, defaultVal: 14 },
                { label: 'Replay Potential', key: 'replay', max: 15, defaultVal: 13 },
                { label: 'Standalone Context', key: 'context', max: 15, defaultVal: 14 },
                { label: 'Visual Engagement', key: 'visual', max: 10, defaultVal: 9 },
                { label: 'Ending Quality', key: 'ending', max: 10, defaultVal: 8 },
              ].map((item) => {
                const val = clip.score_breakdown?.[item.key] ?? item.defaultVal;
                const pct = Math.round((val / item.max) * 100);
                return (
                  <div key={item.key} className="flex items-center justify-between text-xs">
                    <span className="text-slate-600">{item.label}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-brand-500 h-1.5 rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="font-mono text-slate-700 w-8 text-right font-medium text-[11px]">
                        {val}/{item.max}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <p className="text-[10px] text-slate-400 italic pt-1 text-center">
              * AI prediction, not a guarantee of actual viral performance.
            </p>
          </div>
        </div>

        {/* Right: Controls, Timeline, Subtitles, AI Copy (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Timeline & Duration Enforcement Box */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-brand-600" />
                <span>Trim & Duration (Max 30s)</span>
              </h2>
              <span
                className={`text-xs font-black font-mono px-2.5 py-1 rounded-full ${
                  isExceedingMaxDuration
                    ? 'bg-red-50 text-red-600 border border-red-200 animate-pulse'
                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                }`}
              >
                {duration.toFixed(1)}s / 30.0s
              </span>
            </div>

            {isExceedingMaxDuration && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>Clip duration cannot exceed 30 seconds. Please adjust start or end timestamp.</span>
              </div>
            )}

            {/* Timestamps input */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Start Time (seconds)</label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  value={startTime}
                  onChange={(e) => setStartTime(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">End Time (seconds)</label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  value={endTime}
                  onChange={(e) => setEndTime(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 font-mono"
                />
              </div>
            </div>

            <p className="text-[11px] text-slate-500">
              Timestamps are relative to the original source video ({formatDuration(clip.start_time)} to {formatDuration(clip.end_time)}).
            </p>
          </div>

          {/* Title & Hook Banner Edit */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-slate-900">Hook & Metadata</h2>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Clip Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Hook Text Overlay (Top Banner)
              </label>
              <input
                type="text"
                value={hookText}
                onChange={(e) => setHookText(e.target.value)}
                placeholder="e.g. WAIT FOR THE END..."
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 uppercase font-black tracking-wide"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Subtitles & Dialogue Text
              </label>
              <textarea
                rows={3}
                value={captionText}
                onChange={(e) => setCaptionText(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>

          {/* Subtitle Styling & Toggles */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-slate-900">Styling & Overlays</h2>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-2">Subtitle Typography Style</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'subtle', label: '✨ Subtle (Small)' },
                  { id: 'none', label: '🚫 No Captions' },
                  { id: 'bold', label: 'Bold Outline' },
                  { id: 'clean', label: 'Clean' },
                  { id: 'gaming', label: 'Gaming' },
                  { id: 'podcast', label: 'Podcast' },
                ].map((st) => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => {
                      setSubtitleStyle(st.id);
                      if (st.id === 'none') {
                        setHasCaptions(false);
                      } else {
                        setHasCaptions(true);
                      }
                    }}
                    className={`py-2 px-2.5 rounded-xl border text-xs font-bold transition-all ${
                      subtitleStyle === st.id
                        ? 'border-brand-600 bg-brand-50 text-brand-700 shadow-sm'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    {st.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <label className="flex items-center gap-2.5 text-xs font-medium text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasCaptions}
                  onChange={(e) => {
                    setHasCaptions(e.target.checked);
                    if (!e.target.checked) setSubtitleStyle('none');
                    else if (subtitleStyle === 'none') setSubtitleStyle('subtle');
                  }}
                  className="w-4 h-4 rounded text-brand-600"
                />
                <span>Burn Captions (Subtle / Small)</span>
              </label>

              <label className="flex items-center gap-2.5 text-xs font-medium text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasHook}
                  onChange={(e) => setHasHook(e.target.checked)}
                  className="w-4 h-4 rounded text-brand-600"
                />
                <span>Render Hook Banner</span>
              </label>

              <label className="flex items-center gap-2.5 text-xs font-medium text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasWatermark}
                  onChange={(e) => setHasWatermark(e.target.checked)}
                  className="w-4 h-4 rounded text-brand-600"
                />
                <span>Add ClipForge Watermark</span>
              </label>
            </div>
          </div>

          {/* AI Titles, Captions & Hashtags Box */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-brand-600" />
              <span>AI Titles & Social Hashtags</span>
            </h2>

            {/* 3 Title Options */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-600">3 AI Title Variations</label>
              {(clip.ai_titles || [clip.title]).map((t: string, idx: number) => (
                <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                  <span className="truncate mr-2 font-medium text-slate-800">{t}</span>
                  <button
                    onClick={() => copyToClipboard(t, `title-${idx}`)}
                    className="text-slate-400 hover:text-brand-600 p-1"
                    title="Copy title"
                  >
                    {copiedKey === `title-${idx}` ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              ))}
            </div>

            {/* Hashtags */}
            {clip.hashtags && clip.hashtags.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-slate-600">Recommended Hashtags</label>
                  <button
                    onClick={() => copyToClipboard(clip.hashtags.join(' '), 'hashtags')}
                    className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1"
                  >
                    {copiedKey === 'hashtags' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    <span>Copy All</span>
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {clip.hashtags.map((tag: string, idx: number) => (
                    <span key={idx} className="px-2 py-0.5 rounded-md bg-brand-50 text-brand-700 text-xs font-medium">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
