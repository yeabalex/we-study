'use client';

import React, { useEffect, useState, use } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { SparkLogo } from '@/components/illustrations/SparkLogo';
import { PlayfulCharacters } from '@/components/illustrations/PlayfulCharacters';
import {
  FileText,
  Layers,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Brain,
  ListOrdered,
  BookOpen,
} from 'lucide-react';
import confetti from 'canvas-confetti';

export default function GeneratingPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('sessionId');
  const resolvedParams = use(params);
  const subjectId = resolvedParams.id;

  const [state, setState] = useState<any>({
    stage: 'phase1_processing',
    progressPercentage: 15,
    currentStepMessage: 'Initializing Antigravity AI generation pipeline...',
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) return;

    let isMounted = true;

    const pollStatus = async () => {
      try {
        const res = await fetch(`/api/session/${sessionId}/status`);
        if (!res.ok) return;

        const data = await res.json();
        if (!isMounted) return;

        setState(data);

        if (data.stage === 'completed') {
          // Trigger celebration confetti!
          try {
            confetti({
              particleCount: 80,
              spread: 70,
              origin: { y: 0.6 },
            });
          } catch {}

          // Redirect to Coursera-style course view
          setTimeout(() => {
            router.push(`/subject/${subjectId}/course`);
          }, 1200);
        } else if (data.stage === 'failed') {
          setError(data.error || 'Generation encountered an error.');
        }
      } catch (err) {
        console.warn('Polling error:', err);
      }
    };

    // Immediate first check
    pollStatus();

    // 3-SECOND POLLING INTERVAL
    const interval = setInterval(pollStatus, 3000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [sessionId, subjectId, router]);

  const stages = [
    {
      id: 'phase1_processing',
      name: 'Phase 1: File Ingestion & Page Ranges',
      desc: 'Antigravity extracts topic page ranges & whole-file summaries.',
      icon: FileText,
    },
    {
      id: 'phase2_sequencing',
      name: 'Phase 2: Curriculum Sequencing',
      desc: 'Orders files into optimal pedagogical sequence based on summaries.',
      icon: ListOrdered,
    },
    {
      id: 'phase3_generating',
      name: 'Phase 3: Deep Notes & Practice Quizzes',
      desc: 'Generates rich markdown notes and tailored questions per range in new chat contexts.',
      icon: Sparkles,
    },
  ];

  const getStageIndex = (stageName: string) => {
    if (stageName === 'phase1_processing') return 0;
    if (stageName === 'phase2_sequencing') return 1;
    if (stageName === 'phase3_generating' || stageName === 'completed') return 2;
    return 0;
  };

  const currentStageIdx = getStageIndex(state.stage);

  return (
    <div className="min-h-screen bg-[#121316] flex items-center justify-center p-4 sm:p-6 font-sans text-neutral-900">
      <div className="w-full max-w-3xl bg-white rounded-[32px] shadow-2xl p-8 sm:p-12 border border-neutral-800/10 space-y-8">
        {/* Top Branding & Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-neutral-900 text-white flex items-center justify-center mx-auto mb-4 shadow-md">
            <SparkLogo className="w-7 h-7 text-amber-400" />
          </div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Antigravity AI Pipeline Active</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-neutral-900 tracking-tight">
            Synthesizing Your Study Curriculum
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 max-w-md mx-auto">
            Our multi-phase engine is processing your documents and preparing your interactive Coursera-style study roadmap.
          </p>
        </div>

        {/* Progress Bar & Live Status Message */}
        <div className="space-y-3 bg-neutral-50 p-6 rounded-2xl border border-neutral-200/80">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-neutral-700">{state.currentStepMessage || 'Processing...'}</span>
            <span className="text-neutral-900 font-extrabold">{state.progressPercentage || 15}%</span>
          </div>

          <div className="w-full h-3 bg-neutral-200 rounded-full overflow-hidden p-0.5">
            <div
              className="h-full bg-neutral-900 rounded-full transition-all duration-700 ease-out"
              style={{ width: `${Math.max(state.progressPercentage || 15, 8)}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[10px] text-neutral-400 font-medium pt-1">
            <span>Polling every 3s via Redis session cache</span>
            <span>Session ID: {sessionId?.slice(0, 16)}...</span>
          </div>
        </div>

        {/* Multi-Phase Stepper */}
        <div className="space-y-4">
          {stages.map((st, idx) => {
            const Icon = st.icon;
            const isDone = currentStageIdx > idx || state.stage === 'completed';
            const isCurrent = currentStageIdx === idx && state.stage !== 'completed';

            return (
              <div
                key={st.id}
                className={`p-4 rounded-2xl border-2 flex items-center justify-between transition-all ${
                  isCurrent
                    ? 'border-neutral-900 bg-white shadow-md scale-[1.01]'
                    : isDone
                    ? 'border-emerald-200 bg-emerald-50/40 text-emerald-950'
                    : 'border-neutral-200/60 bg-neutral-50/40 opacity-60'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
                      isDone
                        ? 'bg-emerald-600 text-white'
                        : isCurrent
                        ? 'bg-neutral-900 text-white animate-pulse'
                        : 'bg-neutral-200 text-neutral-600'
                    }`}
                  >
                    {isDone ? <CheckCircle2 className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                  </div>
                  <div>
                    <div className="font-bold text-sm text-neutral-900">{st.name}</div>
                    <div className="text-xs text-neutral-500">{st.desc}</div>
                  </div>
                </div>

                {isCurrent && (
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-neutral-100 text-neutral-800 text-[10px] font-bold">
                    <div className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                    <span>In Progress</span>
                  </div>
                )}
                {isDone && (
                  <div className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Completed</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {error && (
          <div className="p-5 rounded-2xl bg-red-50 border border-red-200 text-red-800 space-y-3">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-600 mt-0.5" />
              <div>
                <div className="font-bold text-xs uppercase tracking-wider text-red-900">Antigravity Error</div>
                <p className="text-xs mt-1 leading-relaxed">{error}</p>
              </div>
            </div>
            <div className="pt-1 flex justify-end">
              <button
                onClick={() => router.push('/dashboard')}
                className="px-4 py-2 bg-red-900 hover:bg-red-800 text-white rounded-xl text-xs font-bold transition-colors"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
