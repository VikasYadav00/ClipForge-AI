'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  Clock,
  Subtitles,
  Smartphone,
  ScanFace,
  TrendingUp,
  Layers,
  Download,
  Hash,
  Play,
  ArrowRight,
  CheckCircle2,
  Check,
  Video,
  Scissors,
  Wand2,
  Share2,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';

export default function LandingPage() {
  const [activeTab, setActiveTab] = useState<'demo' | 'comparison'>('demo');

  return (
    <div className="min-h-screen bg-white text-slate-900 selection:bg-brand-500 selection:text-white">
      {/* ── Navigation ──────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-600 to-violet-600 flex items-center justify-center text-white shadow-sm shadow-brand-500/20">
              <Scissors className="w-5 h-5 -rotate-45" />
            </div>
            <span className="font-bold text-xl tracking-tight text-slate-900">
              ClipForge <span className="text-brand-600 font-extrabold">AI</span>
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
            <a href="#features" className="hover:text-brand-600 transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-brand-600 transition-colors">How It Works</a>
            <a href="#platforms" className="hover:text-brand-600 transition-colors">Platforms</a>
            <a href="#pricing" className="hover:text-brand-600 transition-colors">Pricing</a>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="px-4 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="px-4 py-2 text-sm font-medium rounded-lg bg-brand-600 hover:bg-brand-700 text-white shadow-sm hover:shadow transition-all"
            >
              Start Creating Free
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero Section ────────────────────────────────────────────────────── */}
      <section className="relative pt-20 pb-24 overflow-hidden border-b border-slate-100 bg-gradient-to-b from-brand-50/40 via-white to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-100/60 text-brand-800 text-xs font-semibold mb-8 border border-brand-200/50">
            <Sparkles className="w-3.5 h-3.5 text-brand-600" />
            <span>AI-Powered Long Video to Viral Shorts & Reels</span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold text-slate-900 tracking-tight max-w-4xl mx-auto leading-[1.1]">
            Turn Long Videos Into{' '}
            <span className="bg-gradient-to-r from-brand-600 to-violet-600 bg-clip-text text-transparent">
              Viral Shorts
            </span>{' '}
            Automatically.
          </h1>

          {/* Subheadline */}
          <p className="mt-6 text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto font-normal leading-relaxed">
            Upload any long video. Our AI finds the best moments, adds animated captions,
            reframes to 9:16 vertical, and creates ready-to-publish Shorts in seconds.
          </p>

          {/* 30-Second Guarantee Pill */}
          <div className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
            <Clock className="w-3.5 h-3.5" />
            <span>Guaranteed: No generated clip exceeds 30 seconds</span>
          </div>

          {/* CTAs */}
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/register"
              className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-base shadow-md shadow-brand-500/20 hover:shadow-lg hover:shadow-brand-500/30 transition-all flex items-center justify-center gap-2 group"
            >
              <span>Start Creating Free</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
            <a
              href="#preview"
              className="w-full sm:w-auto px-7 py-3.5 rounded-xl border border-slate-200 hover:border-slate-300 bg-white text-slate-700 font-semibold text-base shadow-sm hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
            >
              <Play className="w-4 h-4 text-slate-500 fill-slate-500" />
              <span>Watch Demo</span>
            </a>
          </div>

          {/* Hero Interactive Mockup Preview */}
          <div id="preview" className="mt-16 max-w-5xl mx-auto relative">
            <div className="p-3 sm:p-4 bg-slate-900/5 rounded-3xl border border-slate-200/80 shadow-2xl">
              <div className="bg-white rounded-2xl p-4 sm:p-8 border border-slate-100 shadow-sm text-left">
                {/* Header mock */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-100 gap-4">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-brand-600">Active Pipeline</span>
                    <h3 className="text-lg font-bold text-slate-900">The Future of AI & Creator Economy (Ep. 42)</h3>
                    <p className="text-xs text-slate-500">Source: 48m 12s • 1080p • 10 Viral Shorts Generated</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Processing Complete
                    </span>
                    <Link
                      href="/dashboard"
                      className="px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition-colors"
                    >
                      Open in Editor
                    </Link>
                  </div>
                </div>

                {/* 3 Vertical Phone Previews */}
                <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Card 1 */}
                  <div className="group relative rounded-2xl border border-slate-200 overflow-hidden bg-slate-900 text-white flex flex-col aspect-[9/16] shadow-sm hover:shadow-md transition-shadow">
                    <div className="absolute top-3 left-3 z-10 bg-emerald-500 text-white text-[11px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow">
                      <TrendingUp className="w-3 h-3" />
                      Viral Score: 96/100
                    </div>
                    <div className="absolute top-3 right-3 z-10 bg-black/60 backdrop-blur-md text-white text-[10px] font-semibold px-2 py-0.5 rounded-md">
                      24s
                    </div>
                    {/* Simulated video frame */}
                    <div className="flex-1 bg-gradient-to-b from-slate-800 via-slate-900 to-slate-950 flex flex-col justify-between p-4 relative">
                      <div className="mt-8">
                        <span className="bg-yellow-400 text-slate-950 font-black text-xs px-2 py-1 rounded shadow">
                          WAIT FOR THE END...
                        </span>
                      </div>
                      <div className="text-center my-auto">
                        <div className="w-24 h-24 rounded-full bg-slate-700 mx-auto border-2 border-brand-500/40 flex items-center justify-center text-slate-400">
                          <ScanFace className="w-10 h-10 text-brand-400" />
                        </div>
                        <p className="mt-2 text-xs text-slate-300 font-mono">Face Center Tracked</p>
                      </div>
                      <div className="mb-4 text-center">
                        <p className="text-sm font-black text-white drop-shadow-md leading-tight">
                          "He predicted <span className="text-yellow-300">90% of content</span> will be AI-assisted!"
                        </p>
                      </div>
                    </div>
                    <div className="p-3 bg-white text-slate-900 flex items-center justify-between border-t border-slate-100">
                      <div>
                        <p className="text-xs font-bold truncate">Podcast Bombshell</p>
                        <p className="text-[10px] text-slate-500">Clip #01 • 9:16 Vertical</p>
                      </div>
                      <span className="text-xs font-semibold text-brand-600">Download</span>
                    </div>
                  </div>

                  {/* Card 2 */}
                  <div className="group relative rounded-2xl border border-slate-200 overflow-hidden bg-slate-900 text-white flex flex-col aspect-[9/16] shadow-sm hover:shadow-md transition-shadow">
                    <div className="absolute top-3 left-3 z-10 bg-emerald-500 text-white text-[11px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow">
                      <TrendingUp className="w-3 h-3" />
                      Viral Score: 92/100
                    </div>
                    <div className="absolute top-3 right-3 z-10 bg-black/60 backdrop-blur-md text-white text-[10px] font-semibold px-2 py-0.5 rounded-md">
                      18s
                    </div>
                    <div className="flex-1 bg-gradient-to-b from-indigo-950 via-slate-900 to-slate-950 flex flex-col justify-between p-4 relative">
                      <div className="mt-8">
                        <span className="bg-red-500 text-white font-black text-xs px-2 py-1 rounded shadow">
                          THIS CHANGED EVERYTHING
                        </span>
                      </div>
                      <div className="text-center my-auto">
                        <div className="w-24 h-24 rounded-full bg-slate-700 mx-auto border-2 border-violet-500/40 flex items-center justify-center text-slate-400">
                          <ScanFace className="w-10 h-10 text-violet-400" />
                        </div>
                        <p className="mt-2 text-xs text-slate-300 font-mono">Dynamic Smart Crop</p>
                      </div>
                      <div className="mb-4 text-center">
                        <p className="text-sm font-black text-white drop-shadow-md leading-tight">
                          "The views outpaced long video <span className="text-emerald-400">50 to 1</span>!"
                        </p>
                      </div>
                    </div>
                    <div className="p-3 bg-white text-slate-900 flex items-center justify-between border-t border-slate-100">
                      <div>
                        <p className="text-xs font-bold truncate">Shocking Analytics</p>
                        <p className="text-[10px] text-slate-500">Clip #02 • 9:16 Vertical</p>
                      </div>
                      <span className="text-xs font-semibold text-brand-600">Download</span>
                    </div>
                  </div>

                  {/* Card 3 */}
                  <div className="group relative rounded-2xl border border-slate-200 overflow-hidden bg-slate-900 text-white flex flex-col aspect-[9/16] shadow-sm hover:shadow-md transition-shadow">
                    <div className="absolute top-3 left-3 z-10 bg-brand-500 text-white text-[11px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow">
                      <TrendingUp className="w-3 h-3" />
                      Viral Score: 89/100
                    </div>
                    <div className="absolute top-3 right-3 z-10 bg-black/60 backdrop-blur-md text-white text-[10px] font-semibold px-2 py-0.5 rounded-md">
                      28s
                    </div>
                    <div className="flex-1 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 flex flex-col justify-between p-4 relative">
                      <div className="mt-8">
                        <span className="bg-yellow-400 text-slate-950 font-black text-xs px-2 py-1 rounded shadow">
                          WATCH HIS REACTION
                        </span>
                      </div>
                      <div className="text-center my-auto">
                        <div className="w-24 h-24 rounded-full bg-slate-700 mx-auto border-2 border-brand-500/40 flex items-center justify-center text-slate-400">
                          <ScanFace className="w-10 h-10 text-brand-400" />
                        </div>
                        <p className="mt-2 text-xs text-slate-300 font-mono">Speaker Tracking</p>
                      </div>
                      <div className="mb-4 text-center">
                        <p className="text-sm font-black text-white drop-shadow-md leading-tight">
                          "Are you playing the old game or <span className="text-yellow-300">the new reality</span>?"
                        </p>
                      </div>
                    </div>
                    <div className="p-3 bg-white text-slate-900 flex items-center justify-between border-t border-slate-100">
                      <div>
                        <p className="text-xs font-bold truncate">Call to Action</p>
                        <p className="text-[10px] text-slate-500">Clip #03 • 9:16 Vertical</p>
                      </div>
                      <span className="text-xs font-semibold text-brand-600">Download</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Supported Platforms ─────────────────────────────────────────────── */}
      <section id="platforms" className="py-12 bg-slate-50/70 border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
            One Click Export to Top Short-Form Video Platforms
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-8 sm:gap-16 text-slate-700 font-bold text-lg">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center text-white text-xs">▶</div>
              <span>YouTube Shorts</span>
            </div>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-yellow-500 via-pink-500 to-purple-600 flex items-center justify-center text-white text-xs">📷</div>
              <span>Instagram Reels</span>
            </div>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-black flex items-center justify-center text-white text-xs">♪</div>
              <span>TikTok</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features Section ────────────────────────────────────────────────── */}
      <section id="features" className="py-24 bg-white border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-600">Advanced AI Engine</span>
            <h2 className="mt-2 text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Everything You Need for Viral Short-Form Videos
            </h2>
            <p className="mt-4 text-base sm:text-lg text-slate-600">
              Not a basic video cutter. ClipForge AI analyzes speech, context, punchlines, and faces to generate content viewers can't stop watching.
            </p>
          </div>

          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="p-6 rounded-2xl border border-slate-100 bg-white hover:border-slate-200 hover:shadow-lg hover:shadow-slate-100 transition-all">
              <div className="w-12 h-12 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center mb-5">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">AI Viral Moment Detection</h3>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                Gemini & Whisper examine full transcript timestamps to detect emotional peaks, funny punchlines, and high-retention hooks.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-6 rounded-2xl border border-brand-200 bg-brand-50/20 hover:border-brand-300 hover:shadow-lg hover:shadow-brand-100/50 transition-all relative">
              <div className="absolute top-4 right-4 bg-brand-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                STRICT RULE
              </div>
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-5">
                <Clock className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Automatic ≤30s Clips</h3>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                Enforced at schema, model, and FFprobe rendering layers. No clip ever exceeds 30 seconds, maximizing Shorts & Reels retention algorithms.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-6 rounded-2xl border border-slate-100 bg-white hover:border-slate-200 hover:shadow-lg hover:shadow-slate-100 transition-all">
              <div className="w-12 h-12 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center mb-5">
                <Subtitles className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">AI Animated Captions</h3>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                Word-level synchronized subtitles with styles like MrBeast, Bold, Karaoke, Minimal, and Gaming with highlighted keywords.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="p-6 rounded-2xl border border-slate-100 bg-white hover:border-slate-200 hover:shadow-lg hover:shadow-slate-100 transition-all">
              <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-5">
                <Smartphone className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Smart Vertical Reframing</h3>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                Converts 16:9 landscape to 9:16 vertical (1080×1920) H.264 video, keeping focal action centered at all times.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="p-6 rounded-2xl border border-slate-100 bg-white hover:border-slate-200 hover:shadow-lg hover:shadow-slate-100 transition-all">
              <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-5">
                <ScanFace className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Face & Speaker Tracking</h3>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                MediaPipe and OpenCV detect speaker positions across frames so subjects never get cut off on mobile screens.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="p-6 rounded-2xl border border-slate-100 bg-white hover:border-slate-200 hover:shadow-lg hover:shadow-slate-100 transition-all">
              <div className="w-12 h-12 rounded-xl bg-pink-50 text-pink-600 flex items-center justify-center mb-5">
                <TrendingUp className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Viral Potential Score (0–100)</h3>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                Multi-metric AI evaluation: Hook strength (0-20), Emotion (0-15), Replay potential (0-15), Context, Visuals, and Ending payoff.
              </p>
            </div>

            {/* Feature 7 */}
            <div className="p-6 rounded-2xl border border-slate-100 bg-white hover:border-slate-200 hover:shadow-lg hover:shadow-slate-100 transition-all">
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-5">
                <Layers className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Multiple Clip Generation</h3>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                Generate 3, 5, 10, or up to 20 unique high-performing Shorts from a single podcast, tutorial, or stream in one pass.
              </p>
            </div>

            {/* Feature 8 */}
            <div className="p-6 rounded-2xl border border-slate-100 bg-white hover:border-slate-200 hover:shadow-lg hover:shadow-slate-100 transition-all">
              <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center mb-5">
                <Download className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Batch ZIP & Individual Export</h3>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                Download individual MP4s, SRTs, or one-click export a complete ZIP containing all clips, subtitles, and JSON metadata.
              </p>
            </div>

            {/* Feature 9 */}
            <div className="p-6 rounded-2xl border border-slate-100 bg-white hover:border-slate-200 hover:shadow-lg hover:shadow-slate-100 transition-all">
              <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-5">
                <Hash className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">AI Titles, Captions & Hashtags</h3>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                For every clip: 3 title variations, Shorts titles, Instagram Reel captions, and 5–10 relevant non-spam hashtags with 1-click copy.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── How It Works ────────────────────────────────────────────────────── */}
      <section id="how-it-works" className="py-24 bg-slate-50/50 border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-600">Simple Workflow</span>
            <h2 className="mt-2 text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              From Raw Video to Viral Content in 5 Steps
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            {[
              {
                step: '01',
                title: 'Upload Video',
                desc: 'Drop in MP4, MOV, MKV, or WEBM up to 2 hours in duration.',
                icon: Video,
              },
              {
                step: '02',
                title: 'AI Analysis',
                desc: 'Whisper transcribes speech with word-level accurate timestamps.',
                icon: Wand2,
              },
              {
                step: '03',
                title: 'Find Moments',
                desc: 'AI scores moments on hook, emotion, and viral potential.',
                icon: Sparkles,
              },
              {
                step: '04',
                title: 'Generate Shorts',
                desc: 'Reframed to 9:16 with animated subtitles & hook banners (≤30s).',
                icon: Smartphone,
              },
              {
                step: '05',
                title: 'Publish',
                desc: 'Download MP4s or batch ZIP with AI titles and hashtags ready.',
                icon: Download,
              },
            ].map((item, idx) => {
              const Icon = item.icon;
              return (
                <div key={idx} className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm relative flex flex-col justify-between">
                  <div>
                    <span className="text-xs font-black text-brand-600/70 font-mono">STEP {item.step}</span>
                    <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center my-4">
                      <Icon className="w-5 h-5 text-brand-600" />
                    </div>
                    <h3 className="text-base font-bold text-slate-900">{item.title}</h3>
                    <p className="mt-2 text-xs text-slate-600 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Pricing Section ─────────────────────────────────────────────────── */}
      <section id="pricing" className="py-24 bg-white border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-600">Transparent Plans</span>
            <h2 className="mt-2 text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Start Free, Scale as You Grow
            </h2>
            <p className="mt-4 text-slate-600 text-sm">
              Pricing is configurable in the Admin Panel. No credit card required to get started.
            </p>
          </div>

          <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
            {/* Free Plan */}
            <div className="p-8 rounded-3xl border border-slate-200 bg-white flex flex-col justify-between shadow-sm">
              <div>
                <h3 className="text-xl font-bold text-slate-900">Free Creator</h3>
                <p className="mt-1 text-sm text-slate-500">Perfect for trying out ClipForge AI.</p>
                <div className="mt-6 flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-slate-900">$0</span>
                  <span className="text-sm font-medium text-slate-500">/month</span>
                </div>
                <ul className="mt-8 space-y-3.5 text-sm text-slate-600">
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    <span>3 long videos per month</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    <span>Up to 5 clips per video</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    <span>Max 30 seconds per clip (Strict)</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    <span>Basic animated captions</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    <span>Standard AI moment detection</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    <span>720p output resolution</span>
                  </li>
                </ul>
              </div>
              <Link
                href="/register"
                className="mt-8 block text-center py-3 px-4 rounded-xl border border-slate-300 hover:bg-slate-50 font-semibold text-slate-700 transition-colors"
              >
                Start Free
              </Link>
            </div>

            {/* Pro Plan */}
            <div className="p-8 rounded-3xl border-2 border-brand-500 bg-brand-50/20 flex flex-col justify-between shadow-lg shadow-brand-500/10 relative">
              <div className="absolute -top-3.5 right-8 bg-brand-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow">
                MOST POPULAR
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">Pro Creator</h3>
                <p className="mt-1 text-sm text-slate-500">For serious podcasters, gamers & creators.</p>
                <div className="mt-6 flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-slate-900">$29</span>
                  <span className="text-sm font-medium text-slate-500">/month</span>
                </div>
                <ul className="mt-8 space-y-3.5 text-sm text-slate-700">
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-brand-600 flex-shrink-0" />
                    <span className="font-semibold">25 videos per month</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-brand-600 flex-shrink-0" />
                    <span className="font-semibold">Up to 20 clips per video</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-brand-600 flex-shrink-0" />
                    <span>Full 1080×1920 HD exports</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-brand-600 flex-shrink-0" />
                    <span>All subtitle styles (MrBeast, Karaoke, Bold)</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-brand-600 flex-shrink-0" />
                    <span>Advanced MediaPipe face tracking</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-brand-600 flex-shrink-0" />
                    <span>Batch ZIP exports + SRT downloads</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-brand-600 flex-shrink-0" />
                    <span>AI titles, descriptions & viral hashtags</span>
                  </li>
                </ul>
              </div>
              <Link
                href="/register"
                className="mt-8 block text-center py-3 px-4 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold shadow-md shadow-brand-500/20 hover:shadow-lg transition-all"
              >
                Get Started with Pro
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <footer className="bg-slate-900 text-slate-400 py-12 text-sm border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-brand-500 flex items-center justify-center text-white">
              <Scissors className="w-4 h-4 -rotate-45" />
            </div>
            <span className="font-bold text-white text-base">ClipForge AI</span>
            <span className="text-xs text-slate-500">© 2026 ClipForge. All rights reserved.</span>
          </div>

          <div className="flex items-center gap-6 text-xs text-slate-400">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
            <Link href="/login" className="hover:text-white transition-colors">Sign In</Link>
            <Link href="/register" className="hover:text-white transition-colors">Sign Up</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
