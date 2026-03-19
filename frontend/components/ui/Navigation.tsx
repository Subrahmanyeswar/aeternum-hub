import React from 'react';
import { Home, History, Settings } from 'lucide-react';

interface NavigationProps {
  currentView: 'dashboard' | 'history' | 'settings';
  setCurrentView: (view: 'dashboard' | 'history' | 'settings') => void;
}

export default function Navigation({ currentView, setCurrentView }: NavigationProps) {
  const navItems = [
    { id: 'dashboard' as const, icon: Home, label: 'Home' },
    { id: 'history' as const, icon: History, label: 'Vault' },
    { id: 'settings' as const, icon: Settings, label: 'Settings' }
  ];

  return (
    <>
      {/* MOBILE BOTTOM BAR (Hotstar Style) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50">
        {/* Gradient Fade */}
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-black via-slate-900/90 to-transparent pointer-events-none" />
        
        {/* The Glass Bar */}
        <div className="relative flex items-center justify-around pb-4 pt-3 bg-slate-950/90 backdrop-blur-xl border-t border-white/10">
          {navItems.map((item) => {
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentView(item.id)}
                className={`flex flex-col items-center gap-1 transition-all duration-300 ${
                  isActive ? 'scale-110 text-cyan-400' : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {/* Icon Container */}
                <div className="relative">
                  <item.icon className="w-6 h-6" strokeWidth={isActive ? 2.5 : 2} />
                  {/* Glowing Dot for Active State */}
                  {isActive && (
                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-1 h-1 bg-cyan-400 rounded-full shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
                  )}
                </div>
                {/* Label */}
                <span className="text-[10px] font-bold tracking-wide mt-1">
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* DESKTOP SIDEBAR (Laptop View) */}
      <div className="hidden md:flex fixed left-0 top-0 bottom-0 w-64 bg-slate-950 border-r border-slate-800 flex-col z-50">
        <div className="h-20 flex items-center gap-3 px-6 border-b border-slate-800/50">
          <img src="/icons/icon.png" alt="Logo" className="w-8 h-8" />
          <span className="text-lg font-bold tracking-wider text-slate-100">AETERNUM</span>
        </div>
        <div className="flex-1 py-6 px-3 space-y-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setCurrentView(item.id)}
              className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200 ${
                currentView === item.id 
                  ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' 
                  : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}