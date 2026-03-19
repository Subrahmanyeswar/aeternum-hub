import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export default function Card({ children, className = '' }: CardProps) {
  return (
    <div 
      className={`
        rounded-2xl 
        bg-slate-900/60 
        backdrop-blur-md 
        border border-slate-800/50 
        shadow-xl 
        ${className}
      `}
    >
      {children}
    </div>
  );
}