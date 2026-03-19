'use client';

import { useState } from 'react';
import { API_URL } from '@/utils/config';

interface Props {
  personId: string;
  onClose: () => void;
  onAuthorized: (name: string) => void;
}

export default function AuthorizeModal({ personId, onClose, onAuthorized }: Props) {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleAuthorize = async () => {
    if (!name.trim()) {
      setError('Please enter a name');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_URL}/api/authorize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ person_id: personId, name: name.trim() }),
      });

      const data = await res.json();

      if (data.status === 'authorized') {
        setSuccess(true);
        setTimeout(() => {
          onAuthorized(name.trim());
          onClose();
        }, 1500);
      } else {
        setError(data.message ?? 'Authorization failed');
      }
    } catch {
      setError('Connection error — is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-gray-900 border border-white/20 rounded-2xl p-6 w-full max-w-sm mx-4 shadow-2xl">

        {success ? (
          <div className="text-center py-4">
            <div className="text-5xl mb-4">✅</div>
            <h2 className="text-white font-bold text-lg">Authorized!</h2>
            <p className="text-gray-400 text-sm mt-1">
              <span className="text-green-400 font-medium">{name}</span> has been added to the trusted list
            </p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-orange-500/20 border border-orange-500/40 flex items-center justify-center text-xl">
                  🚨
                </div>
                <div>
                  <h2 className="text-white font-bold">Unknown Person</h2>
                  <p className="text-xs text-gray-500 font-mono truncate max-w-40">{personId}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-gray-500 hover:text-white text-xl leading-none"
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <p className="text-gray-400 text-sm mb-4">
              An unknown person has been detected. Enter their name to add them to the
              trusted faces list and stop future alerts.
            </p>

            <input
              type="text"
              placeholder="Enter name (e.g. Uncle Kumar)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAuthorize()}
              className="w-full bg-white/5 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-blue-500 mb-3"
              autoFocus
            />

            {error && (
              <p className="text-red-400 text-xs mb-3">{error}</p>
            )}

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 py-2.5 rounded-lg bg-white/5 border border-white/20 text-gray-300 text-sm font-medium hover:bg-white/10 transition-all"
              >
                Dismiss
              </button>
              <button
                onClick={handleAuthorize}
                disabled={loading || !name.trim()}
                className="flex-1 py-2.5 rounded-lg bg-green-500 hover:bg-green-400 text-white text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Saving…' : '✅ Trust Person'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}














































































