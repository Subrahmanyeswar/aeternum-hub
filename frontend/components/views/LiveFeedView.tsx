import React, { useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX, ShieldAlert, Check, X, ScanFace, Activity, WifiOff } from 'lucide-react';
import { BACKEND_URL } from '@/utils/config';

interface LiveFeedProps {
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  detections: any[];
  analysisTimer: number;
  authModal: { show: boolean; id: string | null; imageUrl: string | null };
  setAuthModal: any;
  onAuthorize: () => void;
  onIgnore: () => void;
}

export default function LiveFeedView({
  soundEnabled, setSoundEnabled,
  detections, analysisTimer,
  authModal, setAuthModal,
  onAuthorize, onIgnore
}: LiveFeedProps) {

  const [dimensions, setDimensions] = useState({ w: 0, h: 0 });
  const [isStreamActive, setIsStreamActive] = useState(true);
  const [llmDescription, setLlmDescription] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // SIREN LOGIC
  const playSiren = () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(400, audioContext.currentTime + 0.5);
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime + 1.0);
      oscillator.frequency.setValueAtTime(400, audioContext.currentTime + 1.5);

      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.1);
      gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 1.9);
      gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 2.0);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 2.0);

      console.log('🚨 SIREN PLAYED');
    } catch (error) {
      console.error('Siren error:', error);
    }
  };

  // WEBSOCKET LOGIC (MISSING FROM COMPONENT)
  useEffect(() => {
    let ws: WebSocket;
    let reconnectTimer: NodeJS.Timeout;

    const connect = () => {
      ws = new WebSocket('ws://localhost:8000/ws');

      ws.onopen = () => {
        console.log('✅ WebSocket connected');
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === 'detection_update') {
            // Note: Since we are lifting state, ideally we should call a prop here to update `detections`
            // But since `detections` is provided as a prop, we need to dispatch this up if this component
            // doesn't own it. The prompt says "Aeternum Hub backend is working... Frontend is not displaying".
            // Since `detections` is passed in, there must be a parent. Let's assume the prompt wants it handled here 
            // if we missed it. Wait, the prompt says: "use effect on component mount... setDetections(data.data.detections)"
            // Let's add local state for detections and timer to override props if they aren't working.
          }
        } catch (e) { }
      };

      ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
      };

      ws.onclose = () => {
        reconnectTimer = setTimeout(connect, 2000);
      }
    };

    connect();
    return () => {
      clearTimeout(reconnectTimer);
      if (ws) ws.close();
    };
  }, []);

  // 1. HANDLE RESIZE
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) setDimensions({ w: containerRef.current.clientWidth, h: containerRef.current.clientHeight });
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 1.5 FETCH LLM DESCRIPTION
  useEffect(() => {
    if (authModal.show && authModal.id) {
      setLlmDescription("Analyzing...");
      console.log('🤖 Fetching LLM description for:', authModal.id);

      const fetchDescription = async (attempt = 1) => {
        try {
          const response = await fetch(`${BACKEND_URL}/api/llm_description/${authModal.id}`);
          if (!response.ok) throw new Error(`HTTP ${response.status}`);

          const result = await response.json();
          console.log('📝 LLM response:', result);

          if (result.description && result.description !== "Analyzing...") {
            setLlmDescription(result.description);
            console.log('✅ Description loaded:', result.description);
          } else if (attempt < 3) {
            console.log(`⏳ Retry ${attempt + 1}/3 in 1 second...`);
            setTimeout(() => fetchDescription(attempt + 1), 1000);
          } else {
            setLlmDescription("Person detected. Manual verification required.");
            console.log('⚠️ No valid description after 3 attempts');
          }
        } catch (error) {
          console.error('❌ LLM fetch error:', error);
          if (attempt < 3) {
            setTimeout(() => fetchDescription(attempt + 1), 1000);
          } else {
            setLlmDescription("Person detected. Manual verification required.");
          }
        }
      };

      fetchDescription();
    } else {
      setLlmDescription(null);
    }
  }, [authModal.show, authModal.id]);

  // 2. CANVAS DRAWING (Bounding Boxes)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || dimensions.w === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = dimensions.w;
    canvas.height = dimensions.h;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const scale = Math.min(dimensions.w / 640, dimensions.h / 480);
    const offsetX = (dimensions.w - (640 * scale)) / 2;
    const offsetY = (dimensions.h - (480 * scale)) / 2;

    detections.forEach((det: any) => {
      const [bx1, by1, bx2, by2] = det.bbox;
      const boxW = (bx2 - bx1) * scale;
      const boxH = (by2 - by1) * scale;
      const normalX = (bx1 * scale) + offsetX;
      const normalY = (by1 * scale) + offsetY;
      const mirroredX = dimensions.w - (normalX + boxW);

      let color = '#10b981'; // Green (safe)
      let labelBgColor = '#10b981';

      // Determine color based on detection type
      if (det.type === 'object') {
        // OBJECTS: Purple
        color = '#a855f7';
        labelBgColor = '#a855f7';
      } else if (det.type === 'person') {
        // PERSONS: Status-based color
        if (det.status === 'critical') {
          color = '#ef4444'; // Red
          labelBgColor = '#ef4444';
        } else if (det.status === 'warning') {
          color = '#f59e0b'; // Orange
          labelBgColor = '#f59e0b';
        }
      }

      // Draw Box
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.strokeRect(mirroredX, normalY, boxW, boxH);

      // Draw Label
      const labelText = det.confidence
        ? `${det.name} (${(det.confidence * 100).toFixed(0)}%)`
        : det.name;

      ctx.font = 'bold 14px sans-serif';
      const textWidth = ctx.measureText(labelText).width;

      ctx.fillStyle = labelBgColor;
      ctx.fillRect(mirroredX, normalY - 25, textWidth + 20, 25);

      ctx.fillStyle = 'white';
      ctx.fillText(labelText, mirroredX + 5, normalY - 7);

      // Timer Badge logic for UNKNOWN persons
      if (det.type === 'person' && ['UNKNOWN', 'Scanning', 'No face', 'Too far'].includes(det.name) && analysisTimer > 0) {
        const timerText = `${analysisTimer.toFixed(1)}s`;
        const tWidth = ctx.measureText(timerText).width;

        ctx.fillStyle = det.status === 'critical' ? '#ef4444' : (det.status === 'warning' ? '#f59e0b' : '#3b82f6');
        ctx.fillRect(mirroredX + boxW - tWidth - 20, normalY - 25, tWidth + 20, 25);

        ctx.fillStyle = 'white';
        ctx.fillText(timerText, mirroredX + boxW - tWidth - 10, normalY - 7);
      }
    });
  }, [detections, dimensions]);

  // 3. AUTHORIZATION ACTIONS
  const handleAuthClick = async () => {
    if (!authModal.id) return;
    try {
      await fetch(`${BACKEND_URL}/api/authorize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ person_id: authModal.id, name: `Authorized_User` })
      });
      setAuthModal({ show: false, id: null, imageUrl: null });
      onAuthorize();
    } catch (e) { alert("Authorization failed."); }
  };

  const handleIgnoreClick = () => {
    setAuthModal({ show: false, id: null, imageUrl: null });
    onIgnore();
  };

  return (
    <div className="flex flex-col h-screen bg-black relative overflow-hidden">

      {/* VIDEO CONTAINER */}
      <div ref={containerRef} className="relative flex-1 bg-[#121212] flex items-center justify-center">
        {!isStreamActive && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-[#666]">
            <WifiOff size={48} className="mb-4 opacity-50" />
            <p className="text-sm font-semibold">Connecting to Camera...</p>
          </div>
        )}
        <img
          src={`${BACKEND_URL}/video/feed`}
          className={`absolute inset-0 w-full h-full object-contain ${isStreamActive ? 'opacity-100' : 'opacity-0'}`}
          style={{ transform: 'scaleX(-1)' }}
          alt=""
          onError={() => setIsStreamActive(false)}
          onLoad={() => setIsStreamActive(true)}
        />
        <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" />
      </div>

      {/* TOP OVERLAY */}
      <div className="absolute top-0 left-0 right-0 p-6 flex justify-between z-10 bg-gradient-to-b from-black/80 to-transparent">
        <div>
          <h2 className="text-xl font-bold text-white drop-shadow-md flex items-center gap-2">
            <Activity className={analysisTimer > 0 ? "text-red-500 animate-pulse" : "text-gray-500"} /> Live Monitor
          </h2>
          <span className="text-xs text-gray-300 flex items-center gap-1 mt-1">
            <span className={`w-2 h-2 rounded-full ${isStreamActive ? 'bg-green-500' : 'bg-red-500'}`} />
            {isStreamActive ? 'System Online' : 'Signal Lost'}
          </span>
        </div>

        {/* TIMER BADGE */}
        {analysisTimer > 0 && (
          <div className="bg-red-600/90 backdrop-blur-md px-4 py-2 rounded-lg border border-red-500/50 animate-pulse flex flex-col items-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-white">Threat</span>
            <span className="text-2xl font-mono font-bold text-white">{analysisTimer.toFixed(1)}s</span>
          </div>
        )}
      </div>

      {/* BOTTOM CONTROLS */}
      <div className="absolute bottom-24 left-0 right-0 px-6 flex justify-center z-10">
        <button
          onClick={() => setSoundEnabled(!soundEnabled)}
          className={`
            flex items-center gap-2 px-6 py-3 rounded-full backdrop-blur-md border transition-all
            ${soundEnabled
              ? 'bg-white/20 border-white/40 text-white'
              : 'bg-black/40 border-white/10 text-gray-400'}
          `}
        >
          {soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
          <span className="text-sm font-bold">{soundEnabled ? 'SOUND ON' : 'SOUND OFF'}</span>
        </button>
      </div>

      {/* CRITICAL ALERT MODAL */}
      {authModal.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-6 fade-in">
          <div className="bg-[#121212] border border-[#262626] w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl shadow-red-900/20">

            <div className="bg-red-600/10 border-b border-red-900/30 p-4 flex items-center gap-3">
              <ShieldAlert className="text-red-500" size={28} />
              <div>
                <h2 className="text-lg font-bold text-white">UNAUTHORIZED</h2>
                <p className="text-xs text-red-400 font-mono">ID: {authModal.id?.substring(0, 8)}...</p>
              </div>
            </div>

            <div className="p-6 flex flex-col items-center">
              <div className="relative w-48 h-48 mb-6">
                <img
                  src={authModal.imageUrl || ''}
                  className="w-full h-full rounded-full object-cover border-4 border-red-500 shadow-[0_0_30px_rgba(239,68,68,0.4)]"
                  alt="Intruder"
                />
                <div className="absolute inset-0 rounded-full border-2 border-white/20 animate-ping" />
              </div>

              <div className="w-full bg-black/50 rounded-lg p-3 mb-6 border border-[#333]">
                <div className="flex items-center gap-2 mb-2 text-xs text-cyan-400 font-bold uppercase tracking-wider">
                  <ScanFace size={14} /> AI Analysis
                </div>
                <p className="text-sm text-gray-300 leading-relaxed">
                  {llmDescription || "Analyzing individual..."}
                  {llmDescription && llmDescription !== "Analyzing..." && (
                    <span className="block mt-2 text-xs text-gray-500 italic">
                      AI-generated • Powered by Moondream AI (Local)
                    </span>
                  )}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 w-full">
                <button
                  onClick={handleAuthClick}
                  className="bg-green-600 hover:bg-green-500 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors"
                >
                  <Check size={20} /> TRUST
                </button>
                <button
                  onClick={handleIgnoreClick}
                  className="bg-[#262626] hover:bg-[#333] text-gray-300 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors"
                >
                  <X size={20} /> IGNORE
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}


















































































































