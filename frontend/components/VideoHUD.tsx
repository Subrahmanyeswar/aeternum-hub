'use client';
import React, { useEffect, useRef, useState, useCallback } from 'react';

// Backend source dimensions
const SOURCE_W = 640;
const SOURCE_H = 480;

interface Detection {
  bbox: [number, number, number, number];
  name: string;
  status: string;
  duration: number;
}

export default function VideoHUD() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const detectionsRef = useRef<Detection[]>([]);
  const [tick, setTick] = useState(0); // Force UI update for counter

  // 1. WebSocket
  useEffect(() => {
    let ws: WebSocket | null = null;
    const connect = () => {
      ws = new WebSocket('ws://localhost:8000/ws/events');
      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.type === 'detection_update') {
            detectionsRef.current = payload.data.detections || [];
            setTick(t => t + 1); // Update badge count
          }
        } catch (e) {}
      };
      ws.onclose = () => setTimeout(connect, 3000);
    };
    connect();
    return () => ws?.close();
  }, []);

  // 2. Drawing Loop
  const draw = useCallback(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Match screen size
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
    const w = canvas.width;
    const h = canvas.height;

    // Calculate "Object Cover" Scale
    // This matches how the CSS 'object-cover' stretches the video
    const scale = Math.max(w / SOURCE_W, h / SOURCE_H);
    const scaledW = SOURCE_W * scale;
    const scaledH = SOURCE_H * scale;
    const offsetX = (w - scaledW) / 2;
    const offsetY = (h - scaledH) / 2;

    ctx.clearRect(0, 0, w, h);

    detectionsRef.current.forEach(det => {
      const [bx1, by1, bx2, by2] = det.bbox;

      // Apply the Offset Math
      const x = (bx1 * scale) + offsetX;
      const y = (by1 * scale) + offsetY;
      const width = (bx2 - bx1) * scale;
      const height = (by2 - by1) * scale;

      const color = det.status === 'critical' ? '#ef4444' : 
                    det.status === 'warning' ? '#f59e0b' : '#10b981';

      // Draw Box
      ctx.lineWidth = 3;
      ctx.strokeStyle = color;
      ctx.strokeRect(x, y, width, height);

      // Draw Label
      ctx.fillStyle = color;
      ctx.font = 'bold 16px Arial';
      ctx.fillText(det.name, x, y - 10);
    });
    
    requestAnimationFrame(draw);
  }, []);

  useEffect(() => {
    requestAnimationFrame(draw);
  }, [draw]);

  return (
    <div ref={containerRef} className="fixed inset-0 w-full h-full bg-black">
      <img
        src="http://localhost:8000/video/feed"
        className="absolute inset-0 w-full h-full object-cover"
        alt="feed"
      />
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
      />
      {/* Test Badge to prove CSS is working */}
      <div className="absolute top-10 right-10 bg-red-600 text-white px-4 py-2 rounded font-bold z-50">
        LIVE HUD ACTIVE
      </div>
    </div>
  );
}