'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PlayfulCharacters } from '@/components/illustrations/PlayfulCharacters';
import { SparkLogo } from '@/components/illustrations/SparkLogo';
import { GoogleButton } from '@/components/ui/GoogleButton';
import { Sparkles, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [isLoadingGoogle, setIsLoadingGoogle] = useState(false);
  const [isLoadingDemo, setIsLoadingDemo] = useState(false);

  const handleGoogleLogin = () => {
    setIsLoadingGoogle(true);
    window.location.href = '/api/auth/google';
  };

  const handleDemoLogin = () => {
    setIsLoadingDemo(true);
    window.location.href = '/api/auth/demo';
  };

  return (
    <div className="min-h-screen w-full bg-[#121316] flex items-center justify-center p-4 sm:p-6 md:p-10 font-sans">
      {/* Outer Card Container */}
      <div className="w-full max-w-[960px] bg-white rounded-[32px] shadow-2xl overflow-hidden grid grid-cols-1 md:grid-cols-2 border border-neutral-800/10 min-h-[580px]">
        {/* Left Side: Playful Illustrated Canvas */}
        <div className="bg-[#EAEBED] flex flex-col justify-between p-8 relative overflow-hidden order-2 md:order-1 min-h-[320px] md:min-h-auto">
          {/* Subtle brand tag */}
          <div className="flex items-center gap-2 z-10">
            <span className="font-bold tracking-tight text-neutral-800 text-lg">we-study</span>
            <span className="text-[10px] uppercase tracking-wider font-semibold bg-neutral-900/10 text-neutral-700 px-2 py-0.5 rounded-full">
              Antigravity AI
            </span>
          </div>

          {/* Dribbble Character Illustration */}
          <div className="my-auto z-10">
            <PlayfulCharacters />
          </div>

          {/* Bottom quote / caption */}
          <div className="z-10 text-center text-xs text-neutral-500 font-medium">
            Transform any textbook, slides, or lecture notes into exam mastery.
          </div>

          {/* Ambient background blur circle */}
          <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-orange-200/40 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -top-20 -right-20 w-64 h-64 bg-purple-200/40 rounded-full blur-3xl pointer-events-none" />
        </div>

        {/* Right Side: Auth Card Form */}
        <div className="bg-white flex flex-col justify-between p-8 sm:p-12 md:p-14 order-1 md:order-2">
          {/* Top Logo */}
          <div className="flex justify-center mb-6">
            <div className="w-12 h-12 rounded-2xl bg-neutral-50 flex items-center justify-center border border-neutral-100 shadow-sm">
              <SparkLogo className="w-7 h-7 text-neutral-900" />
            </div>
          </div>

          {/* Main Titles */}
          <div className="text-center mb-8">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-neutral-900 tracking-tight mb-2">
              Welcome back!
            </h1>
            <p className="text-sm text-neutral-500 font-normal">
              Sign in with your Google account to access your study subjects
            </p>
          </div>

          {/* Auth Actions (Google Auth Only + Quick Dev Tester) */}
          <div className="space-y-4 max-w-sm mx-auto w-full">
            {/* Primary Google Auth CTA */}
            <GoogleButton
              onClick={handleGoogleLogin}
              isLoading={isLoadingGoogle}
              text="Log in with Google"
              className="py-4 text-base"
            />

            {/* Quick 1-Click Instant Demo Login */}
            <button
              type="button"
              onClick={handleDemoLogin}
              disabled={isLoadingDemo}
              className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white font-medium text-sm transition-all shadow-sm hover:shadow active:scale-[0.99] disabled:opacity-60"
            >
              {isLoadingDemo ? (
                <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>Instant Demo Mode (1-Click Test)</span>
                  <ArrowRight className="w-4 h-4 text-neutral-400 ml-1" />
                </>
              )}
            </button>

            <div className="pt-2 text-center">
              <p className="text-xs text-neutral-400">
                By continuing, you agree to WeStudy Terms & Privacy Policy.
              </p>
            </div>
          </div>

          {/* Bottom Footer info */}
          <div className="text-center text-xs text-neutral-400 mt-8">
            Powered by Google Antigravity &bull; Safe & Secure
          </div>
        </div>
      </div>
    </div>
  );
}
