'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Video,
  Plus,
  Search,
  FolderOpen,
  Loader2,
  Trash2,
  Film,
  Clock,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { projectsApi } from '@/lib/api';
import { formatDuration, formatDate } from '@/lib/utils';

export default function ProjectsListPage() {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const fetchProjects = async () => {
    try {
      const res = await projectsApi.list({ skip: 0, limit: 100 });
      setProjects(res.data.projects || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this project and all its clips?')) {
      try {
        await projectsApi.delete(id);
        setProjects(projects.filter((p) => p.id !== id));
      } catch (err) {
        alert('Failed to delete project');
      }
    }
  };

  const filteredProjects = projects.filter((p) => {
    const matchesSearch = p.project_name.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || p.processing_status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-8">
      {/* ── Header & Action ────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">My Projects</h1>
          <p className="mt-1 text-sm text-slate-500">
            All uploaded source videos, transcripts, and generated short-form collections.
          </p>
        </div>
        <Link
          href="/dashboard/create"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm shadow-sm hover:shadow transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>New Video Project</span>
        </Link>
      </div>

      {/* ── Search & Filter Bar ────────────────────────────────────────────── */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search projects..."
            className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all placeholder:text-slate-400"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
          {['all', 'completed', 'generating_clips', 'failed'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap capitalize transition-colors ${
                statusFilter === st
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* ── Project Cards Grid ─────────────────────────────────────────────── */}
      {loading ? (
        <div className="p-16 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-7 h-7 animate-spin text-brand-600" />
          <span className="text-sm">Loading projects...</span>
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center">
          <FolderOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">No projects found</h3>
          <p className="text-xs text-slate-500 mt-1">Try adjusting your search or upload a new video.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project) => (
            <Link
              key={project.id}
              href={`/dashboard/projects/${project.id}`}
              className="group bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md hover:border-slate-300 transition-all flex flex-col justify-between overflow-hidden"
            >
              <div>
                {/* Thumbnail Preview Banner */}
                <div className="h-40 bg-slate-900 relative flex items-center justify-center overflow-hidden">
                  <div className="text-slate-500 group-hover:scale-105 transition-transform duration-300 flex flex-col items-center gap-2">
                    <Video className="w-10 h-10 text-slate-400 group-hover:text-brand-400" />
                    <span className="text-xs font-mono text-slate-400">1080×1920 Vertical Ready</span>
                  </div>

                  {project.original_duration > 0 && (
                    <div className="absolute bottom-2.5 right-2.5 px-2 py-0.5 rounded bg-black/70 backdrop-blur-md text-[11px] font-mono text-white">
                      {formatDuration(project.original_duration)}
                    </div>
                  )}

                  <div className="absolute top-2.5 left-2.5">
                    {project.processing_status === 'completed' ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500 text-white shadow">
                        {project.clips_count || 0} Clips Ready
                      </span>
                    ) : project.processing_status === 'failed' ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500 text-white shadow">
                        Failed
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-brand-500 text-white shadow animate-pulse">
                        <Loader2 className="w-2.5 h-2.5 animate-spin" />
                        <span>Processing</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Details */}
                <div className="p-5">
                  <h3 className="text-base font-bold text-slate-900 group-hover:text-brand-600 transition-colors line-clamp-1">
                    {project.project_name}
                  </h3>
                  <p className="mt-1 text-xs text-slate-500">{formatDate(project.created_at)}</p>

                  <div className="mt-4 flex items-center justify-between text-xs text-slate-600 pt-3 border-t border-slate-100">
                    <span className="flex items-center gap-1.5 font-medium">
                      <Film className="w-3.5 h-3.5 text-brand-600" />
                      <span>{project.clips_count || 0} Generated Clips</span>
                    </span>
                    <span className="text-[11px] text-emerald-600 font-semibold">≤ 30s Each</span>
                  </div>
                </div>
              </div>

              {/* Bottom Card Actions */}
              <div className="px-5 py-3 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs font-semibold text-brand-600 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                  <span>Open Clips</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </span>
                <button
                  onClick={(e) => handleDelete(project.id, e)}
                  title="Delete project"
                  className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
