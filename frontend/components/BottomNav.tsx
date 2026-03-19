import React from 'react';
import { LayoutDashboard, Cctv, FolderSearch, Settings, AlertTriangle } from 'lucide-react';

interface BottomNavProps {
  currentView: string;
  setCurrentView: (view: 'home' | 'reels' | 'search' | 'profile') => void;
  isAlerting: boolean; // Triggers the Red Pulse
}

export default function BottomNav({ currentView, setCurrentView, isAlerting }: BottomNavProps) {
  const navItems = [
    { id: 'home', icon: LayoutDashboard, label: 'Home' },
    { id: 'reels', icon: Cctv, label: 'Live' },
    { id: 'search', icon: FolderSearch, label: 'Vault' },
    { id: 'profile', icon: Settings, label: 'Settings' },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[999] flex justify-center pb-4 pt-2 px-2 pointer-events-none">
      
      {/* THE GLASS BAR */}
      <div className={`
        pointer-events-auto
        flex items-center justify-between
        w-full max-w-[500px]
        h-[65px]
        backdrop-blur-xl
        border 
        rounded-2xl
        shadow-2xl 
        px-6
        transition-all duration-500
        ${isAlerting 
          ? 'bg-red-950/90 border-red-500 shadow-[0_0_50px_rgba(220,38,38,0.5)] animate-pulse' 
          : 'bg-[#121212]/90 border-white/10 shadow-black'}
      `}>
        {navItems.map((item) => {
          const isActive = currentView === item.id;
          const Icon = item.icon;
          
          return (
            <button
              key={item.id}
              onClick={() => setCurrentView(item.id as any)}
              className="group flex flex-col items-center justify-center w-12 h-full relative"
            >
              {/* Active Indicator Glow */}
              {isActive && (
                <div className={`absolute -top-3 w-8 h-8 blur-xl rounded-full ${isAlerting ? 'bg-red-500/60' : 'bg-cyan-500/40'}`} />
              )}

              {/* Icon changes if Alerting */}
              {isAlerting && item.id === 'reels' ? (
                 <AlertTriangle size={24} className="text-red-500 animate-bounce" />
              ) : (
                <Icon 
                  size={24} 
                  className={`transition-all duration-300 ${
                    isActive 
                      ? (isAlerting ? 'text-red-400 scale-110' : 'text-cyan-400 scale-110') 
                      : 'text-[#666666] group-hover:text-white'
                  }`}
                  strokeWidth={isActive ? 2.5 : 2}
                />
              )}

              {/* Text Label */}
              {isActive && (
                <span className={`text-[10px] font-bold mt-1 tracking-wide fade-in ${isAlerting ? 'text-red-400' : 'text-cyan-400'}`}>
                  {item.label}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}