import React from 'react';

interface UserAvatarProps {
  name?: string;
  avatarUrl?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  online?: boolean;
  className?: string;
}

export const UserAvatar: React.FC<UserAvatarProps> = ({
  name = '?',
  avatarUrl,
  size = 'md',
  online,
  className = '',
}) => {
  const sizeClasses = {
    xs: 'w-6 h-6 text-[10px]',
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-xl font-bold',
  };

  const indicatorSizes = {
    xs: 'w-2 h-2',
    sm: 'w-2.5 h-2.5',
    md: 'w-3 h-3',
    lg: 'w-3.5 h-3.5',
    xl: 'w-4 h-4',
  };

  const initial = (name.trim()[0] || '?').toUpperCase();

  // Distinct elegant dark gradient presets for initial avatars
  const gradientPresets = [
    'from-emerald-900/80 to-slate-900 text-emerald-300 border-emerald-700/40',
    'from-teal-900/80 to-slate-900 text-teal-300 border-teal-700/40',
    'from-sky-900/80 to-slate-900 text-sky-300 border-sky-700/40',
    'from-indigo-900/80 to-slate-900 text-indigo-300 border-indigo-700/40',
    'from-slate-800 to-slate-950 text-slate-200 border-slate-700/50',
    'from-cyan-900/80 to-slate-900 text-cyan-300 border-cyan-700/40',
  ];
  const charCode = (name.charCodeAt(0) || 0) + (name.charCodeAt(name.length - 1) || 0);
  const colorPreset = gradientPresets[charCode % gradientPresets.length];

  return (
    <div className={`relative inline-block flex-shrink-0 select-none ${className}`}>
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={name}
          className={`${sizeClasses[size]} rounded-full object-cover border border-white/[0.1] shadow-sm`}
        />
      ) : (
        <div
          className={`${sizeClasses[size]} rounded-full flex items-center justify-center font-semibold bg-gradient-to-br ${colorPreset} border shadow-inner`}
          aria-label={name}
        >
          <span>{initial}</span>
        </div>
      )}

      {online !== undefined && (
        <span
          className={`absolute bottom-0 right-0 block rounded-full ring-2 ring-[#080b11] ${
            indicatorSizes[size]
          } ${
            online
              ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50'
              : 'bg-slate-600'
          }`}
          title={online ? 'Online' : 'Offline'}
        />
      )}
    </div>
  );
};
