'use client';

import { useEffect, useState } from 'react';
import { Activity, Camera, Database, ShieldAlert } from 'lucide-react';

export default function StatsPanel() {
  const [stats, setStats] = useState({ 
    status: 'connecting', 
    camera_alive: false, 
    authorized_faces: 0, 
    total_events_logged: 0 
  });

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch('http://localhost:8000/health');
        if (res.ok) {
          setStats(await res.json());
        }
      } catch (e) {
        setStats(prev => ({ ...prev, status: 'offline' }));
      }
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const items = [
    { 
      label: 'SYSTEM STATUS', 
      value: stats.status === 'healthy' ? 'ONLINE' : 'OFFLINE',
      color: stats.status === 'healthy' ? 'text-emerald-400' : 'text-red-500',
      icon: Activity 
    },
    { 
      label: 'CAMERA FEED', 
      value: stats.camera_alive ? 'ACTIVE' : 'NO SIGNAL',
      color: stats.camera_alive ? 'text-blue-400' : 'text-amber-500',
      icon: Camera
    },
    { 
      label: 'DATABASE', 
      value: `${stats.authorized_faces} FACES`,
      color: 'text-purple-400',
      icon: Database
    },
    { 
      label: 'EVENTS', 
      value: stats.total_events_logged,
      color: 'text-slate-200',
      icon: ShieldAlert
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 w-full">
      {items.map((item, idx) => (
        <div key={idx} className="bg-slate-900/50 border border-slate-800 p-3 rounded-lg flex items-center gap-3">
          <div className={`p-2 rounded-md bg-slate-950 ${item.color} bg-opacity-10`}>
            <item.icon size={18} className={item.color} />
          </div>
          <div>
            <div className="text-[10px] text-slate-500 font-mono tracking-widest">{item.label}</div>
            <div className={`text-sm font-bold font-mono ${item.color}`}>{item.value}</div>
          </div>
        </div>
      ))}
    </div>
  );
}