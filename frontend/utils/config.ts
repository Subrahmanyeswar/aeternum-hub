// TAILSCALE CONFIGURATION
// Your PC's Tailscale IP (from startup script)
const TAILSCALE_IP = "100.125.216.4";  // ✅ YOUR IP

// Detect environment and return correct URL
const getBaseUrl = (): string => {
  if (typeof window === 'undefined') {
    // Server-side rendering
    return `http://${TAILSCALE_IP}:8000`;
  }
  
  const hostname = window.location.hostname;
  
  // If accessing from localhost (PC browser)
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:8000';
  }
  
  // If accessing from Tailscale IP (mobile browser)
  // Force HTTP (not HTTPS) to avoid SSL errors
  if (hostname === TAILSCALE_IP) {
    return `http://${TAILSCALE_IP}:8000`;
  }
  
  // Default fallback
  return `http://${TAILSCALE_IP}:8000`;
};

export const BACKEND_URL = getBaseUrl();

// WebSocket URL (auto-converts http to ws)
export const WS_URL = BACKEND_URL.replace('http://', 'ws://') + '/ws/events';

// Debug logging (remove after testing)
if (typeof window !== 'undefined') {
  console.log('🔧 BACKEND_URL:', BACKEND_URL);
  console.log('🔧 WS_URL:', WS_URL);
}