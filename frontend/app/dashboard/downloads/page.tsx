'use client';

import React, { useState, useEffect } from 'react';
import { Download, Archive, FileVideo, Clock, CheckCircle, ChevronRight, Search, Loader2, AlertCircle } from 'lucide-react';
import { api } from '@/lib/api';
import Link from 'next/link';

interface Project {
  id: string;
  title: string;
  status: string;
  clip_count: number;
  created_at: string;
  thumbnail_url?: string;
  original_filename: string;
}

interface Clip {
  id: string;
  title: string;
  duration: number;
  viral_score?: number;
  status: string;
  output_url?: string;
}

export default function DownloadsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [expandedProject, setExpandedProject] = useState<string | null>(null);
  const [clips, setClips] = useState<Record<string, Clip[]>>({});
  const [loading, setLoading] = useState(true);
  const [clipsLoading, setClipsLoading] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [zipLoading, setZipLoading] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchProjects();
  }, []);

  async function fetchProjects() {
    try {
      setLoading(true);
      const res = await api.projects.list({ status: 'completed' });
      setProjects(res.data.projects || res.data || []);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  }

  async function toggleProject(projectId: string) {
    if (expandedProject === projectId) {
      setExpandedProject(null);
      return;
    }
    setExpandedProject(projectId);
    if (!clips[projectId]) {
      setClipsLoading(prev => ({ ...prev, [projectId]: true }));
      try {
        const res = await api.clips.list(projectId);
        setClips(prev => ({ ...prev, [projectId]: res.data.clips || res.data || [] }));
      } catch {
        // ignore
      } finally {
        setClipsLoading(prev => ({ ...prev, [projectId]: false }));
      }
    }
  }

  async function downloadClip(clip: Clip) {
    if (!clip.output_url) return;
    const link = document.createElement('a');
    link.href = `/api/clips/${clip.id}/download`;
    link.download = `${clip.title || 'clip'}.mp4`;
    link.click();
  }

  async function downloadZip(projectId: string, projectTitle: string) {
    setZipLoading(prev => ({ ...prev, [projectId]: true }));
    try {
      const res = await api.downloads.zip(projectId);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = `${projectTitle.replace(/\s+/g, '_')}_clips.zip`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert('Failed to generate ZIP. Please try again.');
    } finally {
      setZipLoading(prev => ({ ...prev, [projectId]: false }));
    }
  }

  const filtered = projects.filter(p =>
    p.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.original_filename?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Downloads</h1>
        <p className="text-sm text-gray-500 mt-1">Download your generated clips and ZIP archives.</p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search projects..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        />
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <Archive className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-700">No completed projects</h3>
          <p className="text-sm text-gray-500 mt-1">Process a video to see your downloads here.</p>
          <Link
            href="/dashboard/create"
            className="mt-4 inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            Create Clips
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(project => (
            <div key={project.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              {/* Project row */}
              <div
                className="flex items-center gap-4 p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => toggleProject(project.id)}
              >
                {/* Thumbnail */}
                <div className="h-14 w-24 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                  {project.thumbnail_url ? (
                    <img src={project.thumbnail_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center">
                      <FileVideo className="h-6 w-6 text-gray-400" />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{project.title || project.original_filename}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="flex items-center gap-1 text-xs text-gray-500">
                      <Clock className="h-3 w-3" />
                      {new Date(project.created_at).toLocaleDateString()}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-green-600">
                      <CheckCircle className="h-3 w-3" />
                      {project.clip_count || 0} clips
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={e => { e.stopPropagation(); downloadZip(project.id, project.title || project.original_filename); }}
                    disabled={zipLoading[project.id]}
                    className="flex items-center gap-1.5 bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-blue-700 transition-colors disabled:opacity-60"
                  >
                    {zipLoading[project.id] ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Archive className="h-3.5 w-3.5" />
                    )}
                    Download ZIP
                  </button>
                  <ChevronRight
                    className={`h-5 w-5 text-gray-400 transition-transform ${expandedProject === project.id ? 'rotate-90' : ''}`}
                  />
                </div>
              </div>

              {/* Clips list */}
              {expandedProject === project.id && (
                <div className="border-t border-gray-100 bg-gray-50 p-4">
                  {clipsLoading[project.id] ? (
                    <div className="flex items-center justify-center py-6">
                      <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                    </div>
                  ) : (clips[project.id] || []).length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">No clips available.</p>
                  ) : (
                    <div className="space-y-2">
                      {(clips[project.id] || []).map((clip, idx) => (
                        <div key={clip.id} className="flex items-center gap-3 bg-white border border-gray-200 rounded-lg px-4 py-3">
                          <span className="text-xs font-mono text-gray-400 w-6">{String(idx + 1).padStart(2, '0')}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-800 truncate">{clip.title || `Clip ${idx + 1}`}</p>
                            <div className="flex items-center gap-3 mt-0.5">
                              <span className="text-xs text-gray-500">{clip.duration?.toFixed(1)}s</span>
                              {clip.viral_score !== undefined && clip.viral_score !== null && (
                                <span className="text-xs font-semibold text-violet-600">
                                  ⚡ {clip.viral_score}/100
                                </span>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={() => downloadClip(clip)}
                            disabled={clip.status !== 'completed' || !clip.output_url}
                            className="flex items-center gap-1.5 text-blue-600 border border-blue-200 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-blue-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            <Download className="h-3.5 w-3.5" />
                            Download
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
