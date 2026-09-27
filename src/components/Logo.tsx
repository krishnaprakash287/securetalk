import React from 'react';
import { Link } from 'react-router-dom';

interface LogoProps {
  className?: string;
  showText?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const Logo: React.FC<LogoProps> = ({
  className = '',
  showText = true,
  size = 'md',
}) => {
  const pixelSizes = {
    sm: 24,
    md: 32,
    lg: 42,
  };

  const px = pixelSizes[size];

  return (
    <Link
      to="/"
      className={`inline-flex items-center gap-2.5 group focus:outline-none select-none ${className}`}
    >
      <div className="relative flex items-center justify-center">
        {/* Subtle background glow on hover */}
        <div className="absolute -inset-1 rounded-full bg-emerald-500/20 blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        <svg
          width={px}
          height={px}
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="relative flex-shrink-0 transition-transform duration-200 group-hover:scale-105"
        >
          <defs>
            <linearGradient id="shieldGrad" x1="12" y1="4" x2="52" y2="58" gradientUnits="userSpaceOnUse">
              <stop stopColor="#0f172a" />
              <stop offset="1" stopColor="#080e1a" />
            </linearGradient>
            <linearGradient id="borderGrad" x1="12" y1="4" x2="52" y2="58" gradientUnits="userSpaceOnUse">
              <stop stopColor="#10b981" />
              <stop offset="1" stopColor="#059669" />
            </linearGradient>
          </defs>
          
          {/* Main Shield */}
          <path
            d="M32 4L12 12V28C12 42.5 20.5 54.2 32 58C43.5 54.2 52 42.5 52 28V12L32 4Z"
            fill="url(#shieldGrad)"
            stroke="url(#borderGrad)"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          
          {/* Cryptographic Grid / Lattice lines */}
          <path
            d="M32 14V50M18 28H46"
            stroke="#10b981"
            strokeWidth="1.2"
            strokeOpacity="0.2"
            strokeDasharray="2 3"
          />
          
          {/* Padlock Body */}
          <rect
            x="22"
            y="25"
            width="20"
            height="15"
            rx="3.5"
            fill="#0f192b"
            stroke="#34d399"
            strokeWidth="1.8"
          />
          
          {/* Padlock Shackle */}
          <path
            d="M27 25V20C27 17.2386 29.2386 15 32 15C34.7614 15 37 17.2386 37 20V25"
            stroke="#34d399"
            strokeWidth="2"
            strokeLinecap="round"
          />
          
          {/* Keyhole */}
          <circle cx="32" cy="31" r="2" fill="#10b981" />
          <path d="M32 33V36" stroke="#10b981" strokeWidth="1.6" strokeLinecap="round" />
          
          {/* Micro cryptographic nodes */}
          <circle cx="20" cy="18" r="1.5" fill="#34d399" opacity="0.7" />
          <circle cx="44" cy="18" r="1.5" fill="#34d399" opacity="0.7" />
          <circle cx="32" cy="52" r="1.8" fill="#10b981" />
        </svg>
      </div>

      {showText && (
        <span className="font-bold tracking-tight text-white text-base sm:text-lg flex items-center gap-1.5">
          <span>SecureTalk</span>
          <span className="badge-e2ee text-[9px] tracking-wider uppercase font-mono">
            E2EE
          </span>
        </span>
      )}
    </Link>
  );
};
