import json
import time
import redis
from backend.notifications import Notifier

REDIS_URL = "redis://localhost:6379/0"
NOTIFICATION_KEY = "notification:trigger"

def notification_worker():
    """
    FIXED: Proper message decoding + heartbeat
    """
    print("[NOTIFIER] 🚀 Starting Notification Worker...", flush=True)
    
    redis_client = redis.Redis.from_url(REDIS_URL, decode_responses=False)
    pubsub = redis_client.pubsub()
    pubsub.subscribe(NOTIFICATION_KEY)
    
    try:
        notifier = Notifier()
        print("[NOTIFIER] ✅ Twilio Active", flush=True)
    except Exception as e:
        notifier = None
        print(f"[NOTIFIER] ⚠️ Twilio Disabled: {e}", flush=True)
    
    processed = set()
    last_heartbeat = time.time()
    
    print("[NOTIFIER] 📱 Listening for panic triggers...", flush=True)
    
    while True:
        try:
            # HEARTBEAT (every 10s)
            if (time.time() - last_heartbeat) > 10:
                print("[NOTIFIER] 💓 Heartbeat - Worker alive", flush=True)
                last_heartbeat = time.time()
            
            message = pubsub.get_message(ignore_subscribe_messages=True, timeout=1.0)
            
            if message and message['type'] == 'message':
                try:
                    # FIX: Decode bytes to string
                    data = json.loads(message['data'].decode('utf-8'))
                    person_id = data.get('person_id')
                    duration = data.get('duration')
                    
                    # Prevent duplicates
                    if person_id in processed:
                        continue
                    
                    processed.add(person_id)
                    
                    print(f"[NOTIFIER] 🚨 PANIC TRIGGER: {person_id} ({duration}s)", flush=True)
                    
                    if notifier:
                        try:
                            call_sid = notifier.make_call(
                                f"Critical Security Alert. Intruder detected for {duration} seconds.",
                                person_id=person_id
                            )
                            
                            if call_sid:
                                print(f"[NOTIFIER] ✅ Call sent: {call_sid}", flush=True)
                            else:
                                print(f"[NOTIFIER] ⚠️ Call failed (check Twilio)", flush=True)
                            
                            sms_sid = notifier.send_sms(
                                f"🚨 PANIC: Intruder {person_id} loitering for {duration}s!",
                                person_id=person_id
                            )
                            
                            if sms_sid:
                                print(f"[NOTIFIER] ✅ SMS sent: {sms_sid}", flush=True)
                            else:
                                print(f"[NOTIFIER] ⚠️ SMS failed", flush=True)
                        
                        except Exception as e:
                            print(f"[NOTIFIER] ❌ Notification error: {e}", flush=True)
                
                except json.JSONDecodeError as e:
                    print(f"[NOTIFIER] ⚠️ JSON decode error: {e}", flush=True)
        
        except Exception as e:
            print(f"[NOTIFIER] ⚠️ Error: {e}", flush=True)
            time.sleep(1)

if __name__ == "__main__":
    try:
        notification_worker()
    except KeyboardInterrupt:
        print("\n[NOTIFIER] 🛑 Shutdown", flush=True)