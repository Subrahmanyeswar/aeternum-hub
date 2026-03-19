'use client';

import { useState, useEffect } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function ModeSwitcher() {
  const [mode, setMode] = useState<'secure' | 'home'>('secure');
  const [loading, setLoading] = useState(false);

  // Load initial state from backend
  useEffect(() => {
    fetch(`${API_URL}/api/system/arm`)
      .then(res => res.json())
      .then(data => {
        setMode(data.armed ? 'secure' : 'home');
      })
      .catch(err => console.error('Failed to load arm status:', err));
  }, []);

  const handleToggle = async (newMode: 'secure' | 'home') => {
    setLoading(true);
    const armed = newMode === 'secure';
    
    try {
      const response = await fetch(`${API_URL}/api/system/arm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ armed })
      });
      
      if (response.ok) {
        setMode(newMode);
        console.log(`System ${armed ? 'ARMED' : 'DISARMED'}`);
      } else {
        console.error('Failed to update arm status');
      }
    } catch (error) {
      console.error('Error updating arm status:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2 bg-white/5 rounded-full p-1">
      <button
        onClick={() => handleToggle('secure')}
        disabled={loading}
        className={`px-4 py-2 rounded-full font-medium transition-all ${
          mode === 'secure'
            ? 'bg-gradient-to-r from-red-500 to-orange-500 text-white shadow-lg'
            : 'text-gray-400 hover:text-white'
        } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        🔒 Secure
      </button>
      <button
        onClick={() => handleToggle('home')}
        disabled={loading}
        className={`px-4 py-2 rounded-full font-medium transition-all ${
          mode === 'home'
            ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg'
            : 'text-gray-400 hover:text-white'
        } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        🏠 Home
      </button>
    </div>
  );
}