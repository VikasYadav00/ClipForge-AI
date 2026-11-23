'use client';

import React, { useState, useEffect } from 'react';
import {
  Users, FileVideo, Film, HardDrive, AlertTriangle, Trash2,
  Ban, CheckCircle, Loader2, Search, RefreshCcw, Shield,
  TrendingUp, Database, Clock
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';

interface AdminStats {
  total_users: number;
  total_projects: number;
  total_clips: number;
  storage_used_gb: number;
  active_jobs: number;
  failed_jobs: number;
  new_users_today: number;
  clips_today: number;
}

interface AdminUser {
  id: string;
  email: string;
  full_name: string;
  is_active: boolean;
  is_admin: boolean;
  subscription_plan: string;
  created_at: string;
  projects_count?: number;
}

interface FailedJob {
  id: string;
  project_id: string;
  error_message: string;
  created_at: string;
  updated_at: string;
}

export default function AdminPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [failedJobs, setFailedJobs] = useState<FailedJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'jobs'>('overview');

  useEffect(() => {
    if (user && !user.is_admin) {
      router.push('/dashboard');
      return;
    }
    fetchData();
  }, [user]);

  async function fetchData() {
    setLoading(true);
    try {
      const [statsRes, usersRes, jobsRes] = await Promise.allSettled([
        api.admin.stats(),
        api.admin.users({ page: 1, per_page: 50 }),
        api.admin.failedJobs(),
      ]);

      if (statsRes.status === 'fulfilled') setStats(statsRes.value.data);
      if (usersRes.status === 'fulfilled') setUsers(usersRes.value.data.users || usersRes.value.data || []);
      if (jobsRes.status === 'fulfilled') setFailedJobs(jobsRes.value.data.jobs || jobsRes.value.data || []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }

  async function toggleUserStatus(userId: string, isActive: boolean) {
    setActionLoading(prev => ({ ...prev, [userId]: true }));
    try {
      if (isActive) {
        await api.admin.suspendUser(userId);
      } else {
        await api.admin.activateUser(userId);
      }
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_active: !isActive } : u));
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Action failed');
    } finally {
      setActionLoading(prev => ({ ...prev, [userId]: false }));
    }
  }

  async function deleteUser(userId: string, email: string) {
    if (!confirm(`Permanently delete user ${email}? This cannot be undone.`)) return;
    setActionLoading(prev => ({ ...prev, [`del_${userId}`]: true }));
    try {
      await api.admin.deleteUser(userId);
      setUsers(prev => prev.filter(u => u.id !== userId));
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Delete failed');
    } finally {
      setActionLoading(prev => ({ ...prev, [`del_${userId}`]: false }));
    }
  }

  if (!user?.is_admin) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <Shield className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">Admin access required.</p>
        </div>
      </div>
    );
  }

  const statCards = [
    { label: 'Total Users', value: stats?.total_users ?? '—', icon: Users, color: 'blue', sub: `+${stats?.new_users_today ?? 0} today` },
    { label: 'Total Projects', value: stats?.total_projects ?? '—', icon: FileVideo, color: 'violet', sub: 'All time' },
    { label: 'Total Clips', value: stats?.total_clips ?? '—', icon: Film, color: 'green', sub: `+${stats?.clips_today ?? 0} today` },
    { label: 'Storage Used', value: stats ? `${stats.storage_used_gb.toFixed(1)} GB` : '—', icon: HardDrive, color: 'orange', sub: 'Total storage' },
    { label: 'Active Jobs', value: stats?.active_jobs ?? '—', icon: Clock, color: 'blue', sub: 'Processing now' },
    { label: 'Failed Jobs', value: stats?.failed_jobs ?? '—', icon: AlertTriangle, color: 'red', sub: 'Need attention' },
  ];

  const colorMap: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600',
    violet: 'bg-violet-50 text-violet-600',
    green: 'bg-green-50 text-green-600',
    orange: 'bg-orange-50 text-orange-600',
    red: 'bg-red-50 text-red-600',
  };

  const filteredUsers = users.filter(u =>
    u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Shield className="h-6 w-6 text-blue-600" />
            Admin Dashboard
          </h1>
          <p className="text-sm text-gray-500 mt-1">Platform management and analytics.</p>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-2 text-sm text-gray-600 border border-gray-200 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <RefreshCcw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {(['overview', 'users', 'jobs'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-all ${
              activeTab === tab ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab}
            {tab === 'jobs' && (stats?.failed_jobs ?? 0) > 0 && (
              <span className="ml-1.5 bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5">
                {stats!.failed_jobs}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        </div>
      ) : (
        <>
          {/* Overview */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {statCards.map(card => {
                const Icon = card.icon;
                return (
                  <div key={card.label} className="bg-white border border-gray-200 rounded-xl p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${colorMap[card.color]}`}>
                        <Icon className="h-4.5 w-4.5" />
                      </div>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{card.value}</p>
                    <p className="text-sm font-medium text-gray-600 mt-0.5">{card.label}</p>
                    <p className="text-xs text-gray-400 mt-1">{card.sub}</p>
                  </div>
                );
              })}
            </div>
          )}

          {/* Users */}
          {activeTab === 'users' && (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="p-4 border-b border-gray-100">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search users..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      {['User', 'Plan', 'Status', 'Joined', 'Actions'].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredUsers.map(u => (
                      <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium text-gray-900">{u.full_name || '—'}</p>
                            <p className="text-xs text-gray-500">{u.email}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                            u.subscription_plan === 'pro' ? 'bg-violet-100 text-violet-700' : 'bg-gray-100 text-gray-600'
                          }`}>
                            {u.subscription_plan || 'free'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                            u.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {u.is_active ? 'Active' : 'Suspended'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs">
                          {new Date(u.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {!u.is_admin && (
                              <>
                                <button
                                  onClick={() => toggleUserStatus(u.id, u.is_active)}
                                  disabled={actionLoading[u.id]}
                                  className={`flex items-center gap-1 text-xs px-2 py-1 rounded-lg border transition-colors ${
                                    u.is_active
                                      ? 'border-amber-200 text-amber-700 hover:bg-amber-50'
                                      : 'border-green-200 text-green-700 hover:bg-green-50'
                                  }`}
                                >
                                  {actionLoading[u.id] ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : u.is_active ? (
                                    <Ban className="h-3 w-3" />
                                  ) : (
                                    <CheckCircle className="h-3 w-3" />
                                  )}
                                  {u.is_active ? 'Suspend' : 'Activate'}
                                </button>
                                <button
                                  onClick={() => deleteUser(u.id, u.email)}
                                  disabled={actionLoading[`del_${u.id}`]}
                                  className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg border border-red-200 text-red-700 hover:bg-red-50 transition-colors"
                                >
                                  {actionLoading[`del_${u.id}`] ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <Trash2 className="h-3 w-3" />
                                  )}
                                  Delete
                                </button>
                              </>
                            )}
                            {u.is_admin && (
                              <span className="text-xs text-blue-600 font-medium flex items-center gap-1">
                                <Shield className="h-3 w-3" /> Admin
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredUsers.length === 0 && (
                  <div className="text-center py-10 text-gray-400 text-sm">No users found.</div>
                )}
              </div>
            </div>
          )}

          {/* Failed Jobs */}
          {activeTab === 'jobs' && (
            <div className="space-y-3">
              {failedJobs.length === 0 ? (
                <div className="text-center py-16">
                  <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-3" />
                  <p className="text-gray-500 font-medium">No failed jobs</p>
                  <p className="text-sm text-gray-400 mt-1">All processing jobs are running smoothly.</p>
                </div>
              ) : (
                failedJobs.map(job => (
                  <div key={job.id} className="bg-white border border-red-200 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">
                          Job <span className="font-mono text-xs text-gray-500">{job.id}</span>
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Project: <span className="font-mono">{job.project_id}</span>
                        </p>
                        <p className="text-sm text-red-700 mt-2 bg-red-50 rounded-lg p-2 font-mono text-xs break-all">
                          {job.error_message}
                        </p>
                        <p className="text-xs text-gray-400 mt-2">
                          Failed at: {new Date(job.updated_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
