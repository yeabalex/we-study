'use client';

import React from 'react';

interface PlayfulCharactersProps {
  className?: string;
}

export function PlayfulCharacters({ className = '' }: PlayfulCharactersProps) {
  return (
    <div className={`relative flex items-center justify-center w-full h-full min-h-[380px] p-6 select-none ${className}`}>
      <svg
        viewBox="0 0 500 420"
        className="w-full max-w-[460px] h-auto drop-shadow-xl transition-transform duration-500 hover:scale-[1.02]"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Background ambient glow */}
        <defs>
          <filter id="soft-shadow" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="8" stdDeviation="12" floodOpacity="0.12" />
          </filter>
        </defs>

        {/* 1. TALL PURPLE CHARACTER (Center-Left) */}
        <g className="animate-pulse" style={{ animationDuration: '4s' }}>
          {/* Main Body */}
          <rect
            x="135"
            y="100"
            width="95"
            height="260"
            rx="4"
            fill="#6B38FB"
          />
          {/* Eyes */}
          <circle cx="168" cy="125" r="3.5" fill="#FFFFFF" />
          <circle cx="196" cy="125" r="3.5" fill="#FFFFFF" />
          {/* Nose/mouth line */}
          <rect x="181" y="130" width="3" height="18" rx="1.5" fill="#1E1F24" />
        </g>

        {/* 2. DARK CHARCOAL CHARACTER (Center-Right) */}
        <g>
          {/* Main Body */}
          <rect
            x="245"
            y="180"
            width="75"
            height="180"
            rx="4"
            fill="#1E1F24"
          />
          {/* Wide Curious Eyes */}
          <circle cx="272" cy="215" r="7" fill="#FFFFFF" />
          <circle cx="273.5" cy="215" r="3.5" fill="#1E1F24" />

          <circle cx="295" cy="215" r="7" fill="#FFFFFF" />
          <circle cx="296.5" cy="215" r="3.5" fill="#1E1F24" />
        </g>

        {/* 3. BRIGHT YELLOW ARCH CHARACTER (Right) */}
        <g>
          {/* Rounded Top Body */}
          <path
            d="M335 240 C335 190, 420 190, 420 240 L420 360 L335 360 Z"
            fill="#F4C414"
          />
          {/* Eye */}
          <circle cx="365" cy="245" r="4.5" fill="#1E1F24" />
          {/* Beak / Horizontal Line */}
          <rect x="375" y="252" width="45" height="5" rx="2.5" fill="#1E1F24" />
        </g>

        {/* 4. BRIGHT ORANGE SMILING HEMISPHERE (Front Foreground) */}
        <g className="transition-all duration-300 hover:translate-y-[-2px]">
          {/* Semicircle Dome */}
          <path
            d="M60 360 C60 260, 260 260, 260 360 Z"
            fill="#FF6A3D"
          />
          {/* Left Eye */}
          <circle cx="140" cy="318" r="5" fill="#1E1F24" />
          {/* Right Eye */}
          <circle cx="180" cy="318" r="5" fill="#1E1F24" />
          {/* Cute Curved Smile */}
          <path
            d="M152 334 Q160 344 168 334"
            stroke="#1E1F24"
            strokeWidth="4"
            strokeLinecap="round"
            fill="none"
          />
        </g>

        {/* Ground Baseline shadow */}
        <ellipse cx="250" cy="365" rx="200" ry="6" fill="#000000" fillOpacity="0.08" />
      </svg>
    </div>
  );
}
