import React, { useState, useEffect } from 'react';
import { ShieldCheck, ShieldAlert, Cpu, HardDrive, Bell, Brain, Eye, Video, Server, Activity } from 'lucide-react';
import { BACKEND_URL } from '@/utils/config';

interface HomeViewProps {
  ownerName: string;
}

export default function HomeView({ ownerName }: HomeViewProps) {
  // STATE
  const [isArmed, setIsArmed] = useState(true);
  const [storageUsed, setStorageUsed] = useState(0);
  const [systemLoad, setSystemLoad] = useState(0);
  const [isOnline, setIsOnline] = useState(false);
  const [recentEvent, setRecentEvent] = useState<any>(null);

  // DATA FETCHING
  useEffect(() => {
    const fetchSystemStatus = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/status`);
        if (!res.ok) throw new Error("Connection failed");
        
        const data = await res.json();
        setIsArmed(data.armed);
        setStorageUsed(data.storage_percent || 0);
        setSystemLoad(data.cpu_percent || 0);
        setIsOnline(true);
      } catch (e) {
        setIsOnline(false); 
      }
    };

    fetchSystemStatus();
    const interval = setInterval(fetchSystemStatus, 2000);

    // Fetch the latest log
    const fetchLatestEvent = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/logs`);
        const logs = await res.json();
        if (logs && logs.length > 0) {
          setRecentEvent(logs[0]); 
        }
      } catch (e) {}
    };
    fetchLatestEvent();

    return () => clearInterval(interval);
  }, []);

  // HANDLERS
  const toggleArm = async (newState: boolean) => {
      const originalState = isArmed;
      setIsArmed(newState); 
      try {
          const res = await fetch(`${BACKEND_URL}/api/arm`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ armed: newState })
          });
          if (!res.ok) throw new Error();
      } catch (e) {
          alert("Failed to connect to system. Verify tunnel URL in config.ts");
          setIsArmed(originalState); 
      }
  };

  const features = [
    { name: "AI Detection", icon: Eye },
    { name: "Face Recognition", icon: UserIcon }, 
    { name: "GPU Accelerated", icon: Brain },  // Changed from "LLM Analysis"
    { name: "Auto Record", icon: Video },
    { name: "Instant Alerts", icon: Bell },
    { name: "Local Vault", icon: Server },
  ];

  return (
    <div className="flex flex-col min-h-screen px-6 pt-6 pb-32 overflow-y-auto no-scrollbar">
      
      {/* 1. TOP HEADER */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-xs font-bold tracking-widest text-cyan-400 uppercase mb-1">AETERNUM GPU</h2>
          <h1 className="text-2xl font-bold text-white">Hi, {ownerName}</h1>
          <span className={`text-[10px] font-bold flex items-center gap-1 ${isOnline ? 'text-green-500' : 'text-red-500'}`}>
            <Activity size={10}/> {isOnline ? 'SYSTEM ONLINE' : 'SYSTEM OFFLINE'}
          </span>
        </div>
        
        {/* STATUS RINGS */}
        <div className="flex gap-4">
          <StatRing value={storageUsed} label="STOR" icon={HardDrive} color="text-blue-500" />
          <StatRing value={systemLoad} label="GPU" icon={Cpu} color={systemLoad > 80 ? "text-red-500" : "text-green-500"} />
        </div>
      </div>

      {/* 2. ARM / DISARM BUTTONS */}
      <div className="grid grid-cols-2 gap-4 mb-10">
        <button onClick={() => toggleArm(true)} className={`py-4 rounded-2xl font-bold text-sm tracking-wide transition-all duration-300 border ${isArmed ? 'bg-green-500/10 text-green-400 border-green-500/50 scale-[1.02] shadow-lg' : 'bg-[#121212] text-gray-500 border-[#262626] opacity-70'}`}>
          <div className="flex flex-col items-center gap-2"><ShieldCheck size={28} />ARM SYSTEM</div>
        </button>

        <button onClick={() => toggleArm(false)} className={`py-4 rounded-2xl font-bold text-sm tracking-wide transition-all duration-300 border ${!isArmed ? 'bg-red-500/10 text-red-400 border-red-500/50 scale-[1.02] shadow-lg' : 'bg-[#121212] text-gray-500 border-[#262626] opacity-70'}`}>
          <div className="flex flex-col items-center gap-2"><ShieldAlert size={28} />DISARM</div>
        </button>
      </div>

      {/* 3. CENTER BRANDING */}
      <div className="flex flex-col items-center justify-center mb-10">
        <img src="/icons/icon.png" className="w-56 h-56 object-contain drop-shadow-[0_0_30px_rgba(34,211,238,0.25)] mb-4" />
        <h1 className="text-4xl font-bold text-white mb-2 text-center">Aeternum Hub</h1>
        <p className="text-cyan-400 text-xs font-bold tracking-[0.2em] uppercase mb-4 text-center">GPU-Accelerated Security</p>
      </div>

      {/* 4. RECENT EVENT CARD */}
      {recentEvent && (
        <div className="w-full bg-[#121212] border border-[#262626] rounded-xl p-4 mb-10 flex items-center gap-4 hover:border-white/10 transition-colors cursor-pointer">
          <div className="w-12 h-12 rounded-lg bg-black border border-[#333] flex items-center justify-center">
            <Bell size={20} className="text-cyan-400" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              <span className="text-xs font-bold text-red-400 uppercase">Latest Activity</span>
            </div>
            <h3 className="font-bold text-sm text-white">{recentEvent.title}</h3>
            <p className="text-xs text-gray-500">{recentEvent.time} • {recentEvent.date}</p>
          </div>
        </div>
      )}

      {/* 5. SYSTEM CAPABILITIES GRID */}
      <h3 className="text-sm font-bold text-gray-500 mb-4 uppercase tracking-wider">System Capabilities</h3>
      <div className="grid grid-cols-2 gap-3 mb-12">
        {features.map((feat, i) => (
          <div key={i} className="bg-[#121212] border border-[#262626] rounded-xl h-24 flex flex-col items-center justify-center gap-2 hover:bg-[#1a1a1a] hover:border-cyan-500/30 transition-all group">
            <feat.icon size={22} className="text-gray-400 group-hover:text-cyan-400 transition-colors" />
            <span className="text-xs font-semibold text-gray-300 group-hover:text-white transition-colors">{feat.name}</span>
          </div>
        ))}
      </div>

    </div>
  );
}

const StatRing = ({ value, label, icon: Icon, color }: any) => (
  <div className="flex flex-col items-center gap-1">
    <div className="relative w-14 h-14 flex items-center justify-center">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
        <path className="text-[#262626]" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" />
        <path className={`${color} transition-all duration-1000`} strokeDasharray={`${value}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" />
      </svg>
      <Icon size={16} className="absolute text-gray-400" />
    </div>
    <span className="text-[10px] text-gray-500 font-bold">{value}% {label}</span>
  </div>
);

function UserIcon(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
    </svg>
  );
}