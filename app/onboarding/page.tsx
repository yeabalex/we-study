'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { SparkLogo } from '@/components/illustrations/SparkLogo';
import {
  Brain,
  Layers,
  Sparkles,
  Zap,
  Target,
  Award,
  CheckCircle2,
  ArrowRight,
  HelpCircle,
  Clock,
} from 'lucide-react';

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [form, setForm] = useState({
    learningStyle: 'active_practice_quizzes',
    primaryGoal: 'ace_exams',
    preferredPace: 'moderate',
    questionDensity: 'high',
    wantsFlashcards: true,
  });

  const handleFinish = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/auth/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        router.push('/dashboard');
      } else {
        router.push('/dashboard');
      }
    } catch {
      router.push('/dashboard');
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#121316] flex items-center justify-center p-4 sm:p-6 font-sans">
      <div className="w-full max-w-2xl bg-white rounded-[32px] shadow-2xl p-8 sm:p-12 border border-neutral-800/10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 pb-6 border-b border-neutral-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-neutral-900 text-white flex items-center justify-center">
              <SparkLogo className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h2 className="font-bold text-neutral-900 text-lg">Personalize Your AI Tutor</h2>
              <p className="text-xs text-neutral-500">Antigravity adapts each study session to your learning style</p>
            </div>
          </div>
          <div className="text-xs font-semibold px-3 py-1 bg-neutral-100 text-neutral-700 rounded-full">
            Step {step} of 3
          </div>
        </div>

        {/* STEP 1: LEARNING STYLE */}
        {step === 1 && (
          <div className="space-y-6 animate-fadeIn">
            <div>
              <h3 className="text-2xl font-extrabold text-neutral-900 tracking-tight mb-1">
                How do you learn concepts best?
              </h3>
              <p className="text-sm text-neutral-500">
                Choose the approach that helps you retain information fastest.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              {[
                {
                  id: 'active_practice_quizzes',
                  title: 'Active Practice & Quizzes',
                  desc: 'Testing myself immediately with questions and active recall.',
                  icon: Zap,
                  accent: 'border-orange-500 bg-orange-50/40 text-orange-950',
                },
                {
                  id: 'deep_conceptual',
                  title: 'Deep Conceptual Breakdown',
                  desc: 'Detailed step-by-step logic, mechanism explanations, and analogies.',
                  icon: Brain,
                  accent: 'border-purple-500 bg-purple-50/40 text-purple-950',
                },
                {
                  id: 'high_yield_bullets',
                  title: 'High-Yield Bullet Points',
                  desc: 'Direct, concise facts, formula cheat-sheets, and quick summaries.',
                  icon: Target,
                  accent: 'border-blue-500 bg-blue-50/40 text-blue-950',
                },
                {
                  id: 'visual_diagrams',
                  title: 'Visual & Mental Maps',
                  desc: 'ASCII diagrams, tables, structured workflows, and visual cues.',
                  icon: Layers,
                  accent: 'border-amber-500 bg-amber-50/40 text-amber-950',
                },
              ].map((opt) => {
                const Icon = opt.icon;
                const isSelected = form.learningStyle === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setForm({ ...form, learningStyle: opt.id as any })}
                    className={`p-5 rounded-2xl border-2 text-left transition-all relative ${
                      isSelected
                        ? `${opt.accent} shadow-md scale-[1.01]`
                        : 'border-neutral-200/80 hover:border-neutral-300 bg-neutral-50/50'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                          isSelected ? 'bg-white shadow-sm' : 'bg-neutral-200/60 text-neutral-700'
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      {isSelected && <CheckCircle2 className="w-5 h-5 text-neutral-900" />}
                    </div>
                    <div className="font-bold text-base text-neutral-900 mb-1">{opt.title}</div>
                    <div className="text-xs text-neutral-500 leading-relaxed">{opt.desc}</div>
                  </button>
                );
              })}
            </div>

            <div className="pt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="px-6 py-3.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl font-medium text-sm flex items-center gap-2 transition-all shadow-sm hover:shadow"
              >
                <span>Continue</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: PRIMARY STUDY GOAL */}
        {step === 2 && (
          <div className="space-y-6 animate-fadeIn">
            <div>
              <h3 className="text-2xl font-extrabold text-neutral-900 tracking-tight mb-1">
                What is your primary study objective?
              </h3>
              <p className="text-sm text-neutral-500">
                This helps Antigravity prioritize high-yield exam traps vs comprehensive coverage.
              </p>
            </div>

            <div className="space-y-3 pt-2">
              {[
                {
                  id: 'ace_exams',
                  title: 'Ace Exams & Score an A+',
                  desc: 'Targeting top grades with comprehensive question drills and common pitfalls.',
                  icon: Award,
                },
                {
                  id: 'pass_with_minimal_time',
                  title: 'Pass Efficiently with Limited Time',
                  desc: 'Fast high-yield prioritization for crunch time and tight deadlines.',
                  icon: Clock,
                },
                {
                  id: 'deep_mastery',
                  title: 'Deep Subject Mastery',
                  desc: 'Long-term understanding of underlying principles and practical synthesis.',
                  icon: Brain,
                },
              ].map((opt) => {
                const Icon = opt.icon;
                const isSelected = form.primaryGoal === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setForm({ ...form, primaryGoal: opt.id as any })}
                    className={`w-full p-4 rounded-2xl border-2 text-left flex items-center justify-between transition-all ${
                      isSelected
                        ? 'border-neutral-900 bg-neutral-900/5 shadow-sm'
                        : 'border-neutral-200/80 hover:border-neutral-300 bg-neutral-50/50'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-white border border-neutral-200 flex items-center justify-center text-neutral-800">
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-bold text-sm text-neutral-900">{opt.title}</div>
                        <div className="text-xs text-neutral-500">{opt.desc}</div>
                      </div>
                    </div>
                    {isSelected && <CheckCircle2 className="w-5 h-5 text-neutral-900 flex-shrink-0" />}
                  </button>
                );
              })}
            </div>

            <div className="pt-4 flex justify-between">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-5 py-3 border border-neutral-200 text-neutral-700 rounded-xl text-sm font-medium hover:bg-neutral-50"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                className="px-6 py-3.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl font-medium text-sm flex items-center gap-2 transition-all shadow-sm hover:shadow"
              >
                <span>Continue</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: QUESTION DENSITY & FLASHCARDS */}
        {step === 3 && (
          <div className="space-y-6 animate-fadeIn">
            <div>
              <h3 className="text-2xl font-extrabold text-neutral-900 tracking-tight mb-1">
                Quiz Density & Practice Preferences
              </h3>
              <p className="text-sm text-neutral-500">
                You can also customize these per subject when uploading course materials.
              </p>
            </div>

            <div className="space-y-4 pt-2">
              {/* Question Density */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600 mb-2">
                  Question Density (How often do you want quizzes?)
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: 'high', label: 'High (Every Range)', sub: '4 questions per range' },
                    { id: 'medium', label: 'Balanced', sub: '2 questions per range' },
                    { id: 'low', label: 'Minimal', sub: '1 question summary' },
                  ].map((d) => (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => setForm({ ...form, questionDensity: d.id as any })}
                      className={`p-3 rounded-xl border-2 text-center transition-all ${
                        form.questionDensity === d.id
                          ? 'border-neutral-900 bg-neutral-900 text-white shadow-sm'
                          : 'border-neutral-200 bg-neutral-50 text-neutral-700 hover:border-neutral-300'
                      }`}
                    >
                      <div className="font-bold text-xs">{d.label}</div>
                      <div className={`text-[10px] mt-0.5 ${form.questionDensity === d.id ? 'text-neutral-300' : 'text-neutral-500'}`}>
                        {d.sub}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Flashcards Toggle */}
              <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200/80 flex items-center justify-between">
                <div>
                  <div className="font-bold text-sm text-neutral-900">Include Active-Recall Flashcards</div>
                  <div className="text-xs text-neutral-500">Generates 3D interactive flip flashcards for key terms</div>
                </div>
                <input
                  type="checkbox"
                  checked={form.wantsFlashcards}
                  onChange={(e) => setForm({ ...form, wantsFlashcards: e.target.checked })}
                  className="w-5 h-5 rounded text-neutral-900 focus:ring-neutral-800 cursor-pointer"
                />
              </div>
            </div>

            <div className="pt-4 flex justify-between">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="px-5 py-3 border border-neutral-200 text-neutral-700 rounded-xl text-sm font-medium hover:bg-neutral-50"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleFinish}
                disabled={isSubmitting}
                className="px-8 py-3.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl font-medium text-sm flex items-center gap-2 transition-all shadow-md hover:shadow-lg disabled:opacity-60"
              >
                {isSubmitting ? (
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span>Complete Setup & Go to Dashboard</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
