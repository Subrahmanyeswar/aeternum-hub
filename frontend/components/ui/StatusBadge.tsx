import React from 'react';

interface StatusBadgeProps {
  status: 'safe' | 'warning' | 'critical' | 'standby';
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const configs = {
    safe: {
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/30',
      text: 'text-emerald-400',
      dot: 'bg-emerald-500',
      label: 'SECURE',
      glow: 'glow-emerald'
    },
    warning: {
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/30',
      text: 'text-amber-400',
      dot: 'bg-amber-500',
      label: 'WARNING',
      glow: ''
    },
    critical: {
      bg: 'bg-red-500/10',
      border: 'border-red-500/30',
      text: 'text-red-400',
      dot: 'bg-red-500',
      label: 'CRITICAL',
      glow: 'glow-red strobe'
    },
    standby: {
      bg: 'bg-slate-500/10',
      border: 'border-slate-500/30',
      text: 'text-slate-400',
      dot: 'bg-slate-500',
      label: 'STANDBY',
      glow: ''
    }
  };

  const config = configs[status];

  return (
    <div 
      className={`
        inline-flex items-center gap-2 
        px-4 py-2 
        rounded-full 
        border 
        ${config.bg} 
        ${config.border} 
        ${config.glow}
        transition-all duration-300
      `}
    >
      <div className={`w-2 h-2 rounded-full ${config.dot} ${status !== 'standby' ? 'pulse-dot' : ''}`} />
      <span className={`text-xs font-bold tracking-wider ${config.text}`}>
        {config.label}
      </span>
    </div>
  );
}