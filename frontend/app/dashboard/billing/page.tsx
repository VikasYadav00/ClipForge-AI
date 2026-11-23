'use client';

import React, { useState, useEffect } from 'react';
import { Zap, Check, CreditCard, BarChart2, ShieldCheck, Loader2, Sparkles, Infinity as InfinityIcon } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

interface UsageData {
  videos_processed: number;
  clips_generated: number;
  processing_minutes: number;
  videos_limit: number;
  clips_limit: number;
  minutes_limit: number;
  billing_period_start: string;
  billing_period_end: string;
}

const UNLIMITED_FEATURES = [
  'Unlimited videos per month',
  'Unlimited clips per video',
  'Any video format supported (MP4, MOV, MKV, WEBM, AVI, TS, etc.)',
  'Up to 20 GB upload file size limit',
  'Direct YouTube URL ingestion & auto-clipping',
  'CRF 18 visually lossless maximum render quality',
  'Word-level animated captions (6 dynamic styles)',
  'Smart 9:16 vertical crop with face tracking',
  'Batch ZIP export with manifest',
  'AI titles, description, and hashtags generation',
];

export default function BillingPage() {
  const { user } = useAuth();
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsage();
  }, []);

  async function fetchUsage() {
    try {
      const res = await api.usage.get();
      setUsage(res.data);
    } catch {
      // use defaults
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Billing & Unlimited Quota</h1>
        <p className="text-sm text-gray-500 mt-1">Your account has unlimited credits and maximum video capabilities unlocked.</p>
      </div>

      {/* Current Plan Banner */}
      <div className="rounded-2xl p-6 border bg-gradient-to-r from-emerald-50 via-blue-50 to-violet-50 border-emerald-200 shadow-sm">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3.5">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-sm">
              <Zap className="h-6 w-6 fill-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-lg font-extrabold text-gray-900">Unlimited Creator Plan</p>
                <span className="bg-emerald-100 text-emerald-800 text-xs font-black px-2.5 py-0.5 rounded-full border border-emerald-200">
                  ACTIVE
                </span>
              </div>
              <p className="text-sm text-gray-600 mt-0.5">
                Unlimited credits enabled. Process videos up to 20 GB with zero restrictions.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/80 border border-emerald-200 text-xs font-bold text-emerald-700">
            <Sparkles className="w-4 h-4 text-emerald-600" />
            <span>Lifetime Unlimited Access</span>
          </div>
        </div>
      </div>

      {/* Usage Section */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-6">
          <BarChart2 className="h-5 w-5 text-blue-600" />
          <h2 className="font-bold text-gray-900 text-base">Current Usage & Unlimited Capacity</h2>
          <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full ml-auto">
            ∞ Unlimited Quota
          </span>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                label: 'Videos Processed',
                used: usage?.videos_processed ?? 0,
                limit: 'Unlimited (∞)',
                desc: 'Upload files up to 20 GB or YouTube URLs',
              },
              {
                label: 'Clips Generated',
                used: usage?.clips_generated ?? 0,
                limit: 'Unlimited (∞)',
                desc: 'Extracted with strict 30s viral moments',
              },
              {
                label: 'Processing Time',
                used: `${Math.round(usage?.processing_minutes ?? 0)} min`,
                limit: 'Unlimited (∞)',
                desc: 'Fast AI transcription and rendering',
              },
            ].map((item) => (
              <div key={item.label} className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
                <p className="text-xs font-semibold text-slate-500">{item.label}</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl font-black text-slate-900">{item.used}</span>
                  <span className="text-xs font-bold text-emerald-600 font-mono">/ {item.limit}</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-2">{item.desc}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Unlocked Features List */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-4">
        <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-emerald-600" />
          <span>All Unlimited Features Unlocked</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
          {UNLIMITED_FEATURES.map((feat, idx) => (
            <div key={idx} className="flex items-start gap-2.5 text-sm text-gray-700">
              <div className="h-5 w-5 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Check className="h-3.5 w-3.5 stroke-[2.5]" />
              </div>
              <span className="font-medium text-slate-700">{feat}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
