'use client';

import React, { useState, useEffect, useRef } from 'react';
import BottomNav from '@/components/BottomNav';
import HomeView from '@/components/views/HomeView';
import LiveFeedView from '@/components/views/LiveFeedView';
import VaultView from '@/components/views/VaultView';
import SettingsView from '@/components/views/SettingsView';
import { BACKEND_URL } from '@/utils/config';

const WARN_TIME = 5;
const POPUP_TIME = 10;
const PANIC_TIME = 20;

export default function SecurityApp() {
  const [view, setView] = useState<'home' | 'reels' | 'search' | 'profile'>('home');
  const [globalSoundEnabled, setGlobalSoundEnabled] = useState(true);

  // Profile State
  const [ownerName, setOwnerName] = useState("Subbu Kolluru");
  const [ownerPhone, setOwnerPhone] = useState("+91 95739 49549");
  const [ownerEmail, setOwnerEmail] = useState("subrahmanyeswarkolluru@gmail.com");

  // Detection Engine State
  const [detections, setDetections] = useState<any[]>([]);
  const [analysisTimer, setAnalysisTimer] = useState(0);
  const [authModal, setAuthModal] = useState<{ show: boolean; id: string | null; imageUrl: string | null; }>({
    show: false, id: null, imageUrl: null
  });
  const [lastHeartbeat, setLastHeartbeat] = useState(Date.now());

  // AUDIO REFS
  const sirenRef = useRef<HTMLAudioElement | null>(null);
  const spokenWarningRef = useRef(false);
  const spokenCriticalRef = useRef(false);
  const sirenPlayingRef = useRef(false);

  // Initialize Siren Audio object
  useEffect(() => {
    if (typeof window !== 'undefined') {
      sirenRef.current = new Audio("/alarm.mp3");
      sirenRef.current.loop = true;
    }
  }, []);

  // GLOBAL AUDIO MANAGER
  const speak = (text: string) => {
    if (!globalSoundEnabled || typeof window === 'undefined') return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    utterance.voice = voices.find(v => v.lang === 'en-US' || v.name.includes('Google')) || voices[0];
    window.speechSynthesis.speak(utterance);
  };

  const playSiren = () => {
    if (globalSoundEnabled && sirenRef.current && sirenRef.current.paused) {
      sirenRef.current.play().catch(e => console.log("Siren playback blocked:", e));
      console.log('🚨 SIREN PLAYED');
    }
  };

  const stopSiren = () => {
    if (sirenRef.current) {
      sirenRef.current.pause();
      sirenRef.current.currentTime = 0;
    }
  };

  // SOUND LOGIC LOOP
  useEffect(() => {
    if (analysisTimer === 0) {
      spokenWarningRef.current = false;
      spokenCriticalRef.current = false;
      sirenPlayingRef.current = false;
      stopSiren();
      return;
    }

    // 5s Warning Voice
    if (analysisTimer >= WARN_TIME && analysisTimer < POPUP_TIME && !spokenWarningRef.current) {
      speak("Warning. Unauthorized person detected in restricted zone.");
      spokenWarningRef.current = true;
    }

    // 10s Critical Voice
    if (analysisTimer >= POPUP_TIME && !spokenCriticalRef.current) {
      speak("Critical Alert. Authorization required or local authorities will be notified.");
      spokenCriticalRef.current = true;
    }

    // 20s Panic Siren
    if (analysisTimer >= PANIC_TIME && !sirenPlayingRef.current) {
      playSiren();
      sirenPlayingRef.current = true;
    }
  }, [analysisTimer, globalSoundEnabled]);

  // WEBSOCKET CONNECTION
  useEffect(() => {
    const wsUrl = BACKEND_URL.replace("https://", "wss://").replace("http://", "ws://");
    const ws = new WebSocket(`${wsUrl}/ws`);

    ws.onopen = () => {
      console.log('✅ WebSocket connected to', `${wsUrl}/ws`);
    };

    ws.onmessage = (event) => {
      try {
        setLastHeartbeat(Date.now());
        const payload = JSON.parse(event.data);

        console.log('📨 WS payload type:', payload.type);

        if (payload.type === 'detection_update') {
          const incomingDets = payload.data.detections || [];
          setDetections(incomingDets);

          // If an Authorized User is in frame, reset everything
          const isAuthorizedInFrame = incomingDets.some((d: any) =>
            d.name !== "UNKNOWN" && d.name !== "Scanning" && d.name !== "No face" && d.name !== "Too far"
          );

          if (isAuthorizedInFrame) {
            setAnalysisTimer(0);
            stopSiren();
          }
        }

        if (payload.type === 'ALERT' || payload.type === 'WARNING' || payload.type === 'CRITICAL' || payload.type === 'PANIC') {
          const data = payload.data;
          setAnalysisTimer(data.duration);

          if (data.duration >= POPUP_TIME && !authModal.show) {
            const timestamp = new Date().getTime();
            const freshImageUrl = `${BACKEND_URL}/api/image/popup?t=${timestamp}`;
            setAuthModal({ show: true, id: data.person_id, imageUrl: freshImageUrl });
          }
        }
      } catch (e) { console.error("WS Parse Error", e); }
    };

    ws.onerror = (e) => console.error("❌ WebSocket error", e);

    return () => ws.close();
  }, [authModal.show]);

  // Watchdog
  useEffect(() => {
    const watchdog = setInterval(() => {
      if (Date.now() - lastHeartbeat > 1200 && detections.length > 0) {
        setDetections([]);
        setAnalysisTimer(0);
        stopSiren();
      }
    }, 500);
    return () => clearInterval(watchdog);
  }, [lastHeartbeat, detections]);

  return (
    <div className="min-h-screen bg-[#000000] text-white selection:bg-[#3797EF] font-sans">
      {view === 'home' && <HomeView ownerName={ownerName} />}

      {view === 'reels' && (
        <LiveFeedView
          soundEnabled={globalSoundEnabled}
          setSoundEnabled={setGlobalSoundEnabled}
          detections={detections}
          analysisTimer={analysisTimer}
          authModal={authModal}
          setAuthModal={setAuthModal}
          onAuthorize={() => {
            setAnalysisTimer(0);
            stopSiren();
          }}
          onIgnore={() => {
            setAnalysisTimer(0);
            stopSiren();
          }}
        />
      )}

      {view === 'search' && <VaultView />}

      {view === 'profile' && (
        <SettingsView
          userName={ownerName}
          setUserName={setOwnerName}
          userPhone={ownerPhone}
          setUserPhone={setOwnerPhone}
          userEmail={ownerEmail}
          setUserEmail={setOwnerEmail}
        />
      )}

      <BottomNav
        currentView={view}
        setCurrentView={setView}
        isAlerting={analysisTimer > 0}
      />
    </div>
  );
}