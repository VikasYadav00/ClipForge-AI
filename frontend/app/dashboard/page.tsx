'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Video,
  Film,
  Clock,
  Zap,
  Plus,
  ArrowRight,
  TrendingUp,
  FolderOpen,
  Loader2,
  Trash2,
  Sparkles,
  AlertCircle
} from 'lucide-react';
import { projectsApi, usageApi } from '@/lib/api';
import { formatDuration, formatDate } from '@/lib/utils';

export default function DashboardOverview() {
  const [projects, setProjects] = useState<any[]>([]);
  const [usage, setUsage] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [projRes, usageRes] = await Promise.all([
        projectsApi.list({ skip: 0, limit: 6 }),
        usageApi.get(),
      ]);
      setProjects(projRes.data.projects || []);
      setUsage(usageRes.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Auto-poll if any project is actively processing
    const interval = setInterval(() => {
      setProjects((current) => {
        const hasProcessing = current.some((p) =>
          ['queued', 'transcribing', 'analyzing', 'detecting_highlights', 'generating_clips', 'rendering'].includes(
            p.processing_status
          )
        );
        if (hasProcessing) {
          fetchData();
        }
        return current;
      });
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this project?')) {
      try {
        await projectsApi.delete(id);
        setProjects(projects.filter((p) => p.id !== id));
      } catch (err) {
        alert('Failed to delete project');
      }
    }
  };

  const getStatusBadge = (status: string, stage: string) => {
    switch (status) {
      case 'completed':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">Completed</span>;
      case 'failed':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-red-50 text-red-700 border border-red-200">Failed</span>;
      case 'uploaded':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-slate-100 text-slate-700">Uploaded</span>;
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full bg-brand-50 text-brand-700 border border-brand-200 animate-pulse">
            <Loader2 className="w-3 h-3 animate-spin" />
            <span>{stage || 'Processing'}</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-8">
      {/* ── Welcome Header & Quick Action ─────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Creator Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">
            Convert your long podcasts, tutorials, and streams into high-retention vertical Shorts.
          </p>
        </div>
        <Link
          href="/dashboard/create"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm shadow-sm hover:shadow transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Create New Clips</span>
        </Link>
      </div>

      {/* ── Stats Row ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Videos Processed</p>
            <p className="mt-1 text-2xl font-black text-slate-900">{usage?.videos_processed ?? 0}</p>
            <p className="mt-1 text-xs text-emerald-600 font-semibold">Unlimited Quota (∞)</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Video className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Clips Generated</p>
            <p className="mt-1 text-2xl font-black text-slate-900">{usage?.clips_generated ?? 0}</p>
            <p className="mt-1 text-xs text-emerald-600 font-medium">All ≤ 30s Guaranteed</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center">
            <Film className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Minutes Processed</p>
            <p className="mt-1 text-2xl font-black text-slate-900">{Math.round(usage?.minutes_processed ?? 0)}m</p>
            <p className="mt-1 text-xs text-slate-400">Audio speech analyzed</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Creator Access</p>
            <p className="mt-1 text-2xl font-black text-emerald-600">Unlimited (∞)</p>
            <p className="mt-1 text-xs text-slate-400">Up to 20 GB • Any Format</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Zap className="w-5 h-5 fill-emerald-600 text-emerald-600" />
          </div>
        </div>
      </div>

      {/* ── Recent Projects ───────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Recent Projects</h2>
            <p className="text-xs text-slate-500 mt-0.5">Your video clipping pipeline status and generated shorts</p>
          </div>
          <Link
            href="/dashboard/projects"
            className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1"
          >
            <span>View All</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-brand-600" />
            <span className="text-sm">Loading your projects...</span>
          </div>
        ) : projects.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center mx-auto mb-4">
              <FolderOpen className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">No projects yet</h3>
            <p className="mt-1 text-sm text-slate-500 max-w-sm mx-auto">
              Upload your first video to start automatically extracting viral 30-second clips.
            </p>
            <Link
              href="/dashboard/create"
              className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Create Your First Clip</span>
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {projects.map((project) => (
              <Link
                key={project.id}
                href={`/dashboard/projects/${project.id}`}
                className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/80 transition-colors group"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-14 h-14 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0 overflow-hidden border border-slate-200">
                    <Video className="w-6 h-6 text-slate-400 group-hover:text-brand-600 transition-colors" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-slate-900 truncate group-hover:text-brand-600 transition-colors">
                      {project.project_name}
                    </h3>
                    <div className="mt-1 flex items-center gap-3 text-xs text-slate-500">
                      <span>{formatDate(project.created_at)}</span>
                      {project.original_duration > 0 && (
                        <>
                          <span>•</span>
                          <span>{formatDuration(project.original_duration)}</span>
                        </>
                      )}
                      <span>•</span>
                      <span className="font-semibold text-slate-700">{project.clips_count || 0} clips</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-4">
                  {getStatusBadge(project.processing_status, project.processing_stage)}
                  <button
                    onClick={(e) => handleDelete(project.id, e)}
                    title="Delete project"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
