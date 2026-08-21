import React from "react";

interface PaperrrrrrLogoProps {
  size?: "sm" | "md" | "lg";
  showWordmark?: boolean;
  className?: string;
  theme?: "dark" | "light" | "auto";
}

export function PaperrrrrrLogo({
  size = "md",
  showWordmark = true,
  className = "",
  theme = "auto",
}: PaperrrrrrLogoProps) {
  const iconDimensions = {
    sm: "size-7",
    md: "size-8",
    lg: "size-10",
  }[size];

  const textDimensions = {
    sm: "text-lg",
    md: "text-xl",
    lg: "text-2xl",
  }[size];

  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      {/* Precision Vector Icon Mark */}
      <div className={`${iconDimensions} shrink-0 rounded-xl overflow-hidden shadow-sm flex items-center justify-center relative group`}>
        <svg
          viewBox="0 0 512 512"
          className="w-full h-full"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="logoBgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#2A1E1A" />
              <stop offset="100%" stopColor="#141110" />
            </linearGradient>
            <linearGradient id="logoTerracotta" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#E07A5F" />
              <stop offset="50%" stopColor="#C3644B" />
              <stop offset="100%" stopColor="#97422C" />
            </linearGradient>
            <linearGradient id="logoAccent" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFB4A2" />
              <stop offset="100%" stopColor="#C3644B" />
            </linearGradient>
            <linearGradient id="logoSheetBack" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="100%" stopColor="#E2DCD5" />
            </linearGradient>
            <linearGradient id="logoSheetFront" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FAF9F5" />
              <stop offset="100%" stopColor="#D8CFCA" />
            </linearGradient>
          </defs>

          {/* Squircle Base */}
          <rect
            x="16"
            y="16"
            width="480"
            height="480"
            rx="116"
            fill="url(#logoBgGrad)"
            stroke="#C3644B"
            strokeOpacity="0.3"
            strokeWidth="8"
          />

          {/* Layered Document Sheets */}
          <rect
            x="136"
            y="104"
            width="240"
            height="304"
            rx="20"
            fill="url(#logoSheetBack)"
            transform="rotate(-6 256 256)"
            opacity="0.85"
          />
          <rect
            x="144"
            y="112"
            width="224"
            height="288"
            rx="18"
            fill="url(#logoSheetFront)"
            transform="rotate(3 256 256)"
          />

          {/* Geometric P Monogram Spine & Loop */}
          <path
            d="M 176 140 
               L 248 140 
               C 304 140 344 176 344 232 
               C 344 288 304 324 248 324 
               L 220 324 
               L 220 372 
               L 176 372 Z"
            fill="url(#logoTerracotta)"
          />
          <path
            d="M 220 180 
               L 246 180 
               C 278 180 300 200 300 232 
               C 300 264 278 284 246 284 
               L 220 284 Z"
            fill="#181412"
          />
          <path d="M 176 140 L 220 180 L 176 220 Z" fill="url(#logoAccent)" opacity="0.9" />

          {/* Synthesis Spark */}
          <path
            d="M 336 128 
               Q 336 156 364 156 
               Q 336 156 336 184 
               Q 336 156 308 156 
               Q 336 156 336 128 Z"
            fill="url(#logoAccent)"
          />
        </svg>
      </div>

      {/* Wordmark Lockup */}
      {showWordmark && (
        <span
          className={`font-serif ${textDimensions} font-bold tracking-tight text-[#111215] select-none`}
        >
          Paperrrrrr
        </span>
      )}
    </div>
  );
}

export default PaperrrrrrLogo;
