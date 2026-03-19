'use client';

import { useEffect, useState, useRef } from 'react';
import { AlertTriangle, User, ShieldCheck } from 'lucide-react';

interface EventLogProps {
  onAuthorize: (id: string) => void;
}

export default function EventLog({ onAuthorize }: EventLogProps) {
  const [events, setEvents] = useState<any[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ws = new WebSocket('ws://localhost:8000/ws/events');
    ws.onmessage = (msg) => {
      try {
        const payload = JSON.parse(msg.data);
        const { type, data } = payload;
        if (['CRITICAL', 'WARNING', 'DETECTION'].includes(type)) {
          setEvents(prev => {
            if (prev.length > 0 && prev[0].timestamp === data.timestamp) return prev;
            return [data, ...prev].slice(0, 50);
          });
        }
      } catch (e) { console.error(e); }
    };
    return () => ws.close();
  }, []);

  return (
    <div className="flex-1 overflow-hidden flex flex-col bg-slate-900/50 border-t border-slate-800">
      <div className="p-3 bg-slate-900/80 border-b border-slate-800 text-xs font-mono text-slate-400 uppercase tracking-widest">
        Live Intelligence Log
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {events.map((evt: any, idx: number) => { // --- FIXED TYPES HERE ---
          const isUnknown = evt.person_name === 'UNKNOWN';
          return (
            <div key={idx} className="bg-slate-950/50 border border-slate-800 p-3 rounded-md text-sm">
              <div className="flex justify-between items-start mb-1">
                <span className={`font-bold font-mono flex items-center gap-2 
                  ${evt.event_type === 'CRITICAL' ? 'text-red-500' : 
                    evt.event_type === 'WARNING' ? 'text-amber-500' : 'text-emerald-500'}`}>
                  {evt.event_type === 'CRITICAL' ? <AlertTriangle size={14}/> : 
                   evt.event_type === 'WARNING' ? <ShieldCheck size={14}/> : <User size={14}/>}
                  {evt.event_type}
                </span>
                <span className="text-slate-600 text-xs font-mono">
                  {new Date(evt.timestamp * 1000).toLocaleTimeString()}
                </span>
              </div>
              
              <div className="text-slate-300 ml-6">
                <span className="text-slate-500">Subject:</span> {evt.person_name} 
                {evt.status && <span className="ml-2 px-1.5 py-0.5 bg-slate-800 rounded text-[10px] text-slate-400 uppercase">{evt.status}</span>}
              </div>

              {evt.message && (
                <div className="text-slate-500 text-xs ml-6 mt-1">{evt.message}</div>
              )}

              {isUnknown && evt.person_id && (
                <button 
                  onClick={() => onAuthorize(evt.person_id)}
                  className="ml-6 mt-2 text-xs bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-1 rounded transition-colors"
                >
                  + Authorize Identity
                </button>
              )}
            </div>
          );
        })}
        {events.length === 0 && <div className="text-slate-600 text-center py-10 italic">Waiting for events...</div>}
      </div>
    </div>
  );
}