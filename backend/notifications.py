import os
import time
import requests
from twilio.rest import Client
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# YOUR TWILIO CONFIGURATION
ACCOUNT_SID = os.getenv("TWILIO_SID", "your_sid_here")
AUTH_TOKEN = os.getenv("TWILIO_TOKEN", "your_token_here")
TWILIO_PHONE = os.getenv("FROM_NUMBER", "+1234567890")
YOUR_PHONE = os.getenv("TO_NUMBER", "+919999999999")

# BACKEND LOGGING ENDPOINT
BACKEND_URL = "http://localhost:8000"
LOG_ENDPOINT = f"{BACKEND_URL}/api/logs/internal"

class Notifier:
    def __init__(self):
        try:
            self.client = Client(ACCOUNT_SID, AUTH_TOKEN)
            self.last_alert_time = 0
            self.alert_cooldown = 60
            print("[NOTIFIER] ✅ Twilio System Armed.", flush=True)
        except Exception as e:
            print(f"[NOTIFIER] ❌ Failed to connect to Twilio: {e}", flush=True)
            self.client = None
    
    def _log_to_backend(self, log_type: str, title: str, desc: str):
        """Send log entry to backend"""
        try:
            requests.post(LOG_ENDPOINT, json={
                "type": log_type,
                "title": title,
                "desc": desc
            }, timeout=2)
        except Exception as e:
            print(f"[NOTIFIER] ⚠️ Logging failed: {e}", flush=True)
    
    def make_call(self, message_text: str, person_id: str = "unknown"):
        """Make a voice call and log it"""
        if not self.client:
            return None
        
        # Check Cooldown
        if (time.time() - self.last_alert_time) < self.alert_cooldown:
            print("[NOTIFIER] ⏳ Call cooldown active", flush=True)
            return None
        
        print(f"[NOTIFIER] 🚨 INITIATING CALL TO {YOUR_PHONE}...", flush=True)
        try:
            twiml_response = f'<Response><Say voice="alice">{message_text}</Say></Response>'
            call = self.client.calls.create(
                to=YOUR_PHONE,
                from_=TWILIO_PHONE,
                twiml=twiml_response
            )
            self.last_alert_time = time.time()
            print(f"[NOTIFIER] ✅ Call Sent! SID: {call.sid}", flush=True)
            
            # LOG TO BACKEND
            self._log_to_backend(
                "call",
                "Voice Alert Triggered",
                f"Called owner regarding intruder {person_id}. Duration: 20+ seconds."
            )
            
            return call.sid
        except Exception as e:
            print(f"[NOTIFIER] ❌ Call Failed: {e}", flush=True)
            
            # LOG FAILURE
            self._log_to_backend(
                "error",
                "Call Failed",
                f"Twilio call error: {str(e)}"
            )
            return None
    
    def send_sms(self, message_text: str, person_id: str = "unknown"):
        """Send SMS and log it"""
        if not self.client:
            return None
        
        print(f"[NOTIFIER] 📩 SENDING SMS TO {YOUR_PHONE}...", flush=True)
        try:
            message = self.client.messages.create(
                body=message_text,
                from_=TWILIO_PHONE,
                to=YOUR_PHONE
            )
            print(f"[NOTIFIER] ✅ SMS Sent! SID: {message.sid}", flush=True)
            
            # LOG TO BACKEND
            self._log_to_backend(
                "sms",
                "SMS Dispatched",
                f"Sent panic alert to owner. Intruder: {person_id}"
            )
            
            return message.sid
        except Exception as e:
            print(f"[NOTIFIER] ❌ SMS Failed: {e}", flush=True)
            
            # LOG FAILURE
            self._log_to_backend(
                "error",
                "SMS Failed",
                f"Twilio SMS error: {str(e)}"
            )
            return None