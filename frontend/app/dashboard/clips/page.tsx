'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Film,
  Download,
  TrendingUp,
  Clock,
  Sliders,
  Loader2,
  Trash2,
  Search,
} from 'lucide-react';
import { clipsApi } from '@/lib/api';
import { formatDuration } from '@/lib/utils';

export default function AllClipsPage() {
  const [clips, setClips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  const fetchClips = async () => {
    try {
      const res = await clipsApi.list({ skip: 0, limit: 100 });
      setClips(res.data.clips || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClips();
  }, []);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    if (confirm('Delete this clip?')) {
      try {
        await clipsApi.delete(id);
        setClips(clips.filter((c) => c.id !== id));
      } catch (err) {
        alert('Failed to delete clip');
      }
    }
  };

  const filteredClips = clips.filter((c) => {
    const matchesSearch = (c.title || '').toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === 'all' || c.clip_type === typeFilter;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-8 pb-16">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">All Generated Clips</h1>
          <p className="mt-1 text-sm text-slate-500">
            Browse, preview, edit, and export every vertical 9:16 clip produced by ClipForge AI.
          </p>
        </div>
      </div>

      {/* Filter bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search clip titles..."
            className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all placeholder:text-slate-400"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
          {['all', 'podcast', 'funny', 'educational', 'gaming', 'storytelling'].map((type) => (
            <button
              key={type}
              onClick={() => setTypeFilter(type)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize whitespace-nowrap transition-colors ${
                typeFilter === type ? 'bg-brand-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="p-16 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-7 h-7 animate-spin text-brand-600" />
          <span className="text-sm">Loading clips...</span>
        </div>
      ) : filteredClips.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center">
          <Film className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">No clips found</h3>
          <p className="text-xs text-slate-500 mt-1">Upload and process a video to generate clips.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredClips.map((clip) => (
            <div
              key={clip.id}
              className="bg-white rounded-3xl border border-slate-200/80 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col justify-between"
            >
              <div>
                <div className="relative bg-slate-950 aspect-[9/16] overflow-hidden flex items-center justify-center">
                  <video
                    src={clip.video_url || ''}
                    controls
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-3 left-3 pointer-events-none">
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

                <div className="p-4 space-y-2">
                  <p className="text-xs text-slate-400 font-semibold uppercase">{clip.clip_type}</p>
                  <h3 className="text-sm font-bold text-slate-900 line-clamp-1">{clip.title}</h3>
                </div>
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
                <Link
                  href={`/dashboard/clips/${clip.id}`}
                  className="flex-1 py-2 px-3 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-semibold text-xs text-center transition-colors flex items-center justify-center gap-1.5"
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </Link>

                <a
                  href={`/api/clips/${clip.id}/download`}
                  download
                  className="py-2 px-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs text-center transition-colors flex items-center justify-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>MP4</span>
                </a>

                <button
                  onClick={(e) => handleDelete(clip.id, e)}
                  title="Delete"
                  className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
