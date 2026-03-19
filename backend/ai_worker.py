import json
import os
import time
import requests  # type: ignore
import typing
from datetime import datetime
from math import hypot
import cv2  # type: ignore
import numpy as np  # type: ignore
import redis  # type: ignore
from backend.engine import SecurityEngine  # type: ignore
from backend.notifications import Notifier  # type: ignore

RECOGNITION_COOLDOWN = 0.5
MIN_CONFIDENCE_DIFF = 0.05

REDIS_URL = "redis://localhost:6379/0"
FRAME_KEY = "camera:frame"
EVENT_KEY = "events"
IMAGE_KEY = "alert:latest_image"
SYSTEM_ARMED_KEY = "system:armed"
RELOAD_SIGNAL_KEY = "ai:reload_db"
UNKNOWN_FACE_EMBS_KEY = "auth:embs:"

BACKEND_URL = "http://localhost:8000"
LOG_ENDPOINT = f"{BACKEND_URL}/api/logs/internal"

# TIMING - CRITICAL FOR INSTANT RESPONSE
RECOGNITION_INTERVAL = 0.0  # Recognize IMMEDIATELY on every frame
OBJECT_SCAN_INTERVAL = 0.0  # Objects IMMEDIATELY on every frame

# STAGE TIMERS
STAGE_1_START = 5.0   # Warning
STAGE_2_START = 10.0  # Critical (popup)
STAGE_3_START = 20.0  # Panic (recording + notifications)

TRACK_TIMEOUT = 2.0
RECORDER_PATIENCE = 3.0

EVIDENCE_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "evidence")
os.makedirs(EVIDENCE_DIR, exist_ok=True)

def get_redis_client() -> redis.Redis:
    while True:
        try:
            client = redis.Redis.from_url(REDIS_URL, decode_responses=False)
            client.ping()
            return client
        except Exception:
            time.sleep(2)

def decode_frame(data):
    if not data:
        return None
    try:
        return cv2.imdecode(np.frombuffer(data, dtype=np.uint8), cv2.IMREAD_COLOR)
    except Exception:
        return None

class NumpyEncoder(json.JSONEncoder):
    def default(self, obj: typing.Any) -> typing.Any:  # type: ignore
        if isinstance(obj, (np.integer, np.floating)):
            return float(obj)
        if isinstance(obj, np.ndarray):
            return obj.tolist()
        return super().default(obj)

def process_loop():
    redis_client = get_redis_client()
    
    print("[AI_WORKER] 🤖 Loading Engine...", flush=True)
    engine = SecurityEngine()
    
    print("[AI_WORKER] 🤖 Loading LLM...", flush=True)
    try:
        from backend.llm_analyzer import LLMAnalyzer  # type: ignore
        llm = LLMAnalyzer()
        print("[AI_WORKER] ✅ LLM Ready", flush=True)
    except Exception as e:
        llm = None
        print(f"[AI_WORKER] ⚠️ LLM Disabled: {e}", flush=True)
    
    try:
        notifier = Notifier()
        print("[AI_WORKER] 📱 Notifier Ready", flush=True)
    except Exception:
        notifier = None
    
    tracks: typing.Any = {}  # type: ignore
    active_recorders: typing.Any = {}  # type: ignore
    last_persons = []
    last_objects = []
    last_object_scan_time: float = 0.0
    
    print("[AI_WORKER] 🚀 LIVE", flush=True)
    
    while True:
        # Check armed state
        is_armed = redis_client.get(SYSTEM_ARMED_KEY) != b"0"
        
        # Check reload signal
        if redis_client.exists(RELOAD_SIGNAL_KEY):
            engine.reload_db()  # type: ignore
            redis_client.delete(RELOAD_SIGNAL_KEY)
            tracks = {}
        
        # Get frame
        frame_bytes = redis_client.get(FRAME_KEY)
        if not frame_bytes:
            time.sleep(0.01)
            continue
        
        frame = decode_frame(frame_bytes)
        if frame is None:
            continue
        
        now = time.time()
        h, w, _ = frame.shape
        
        # DETECTION
        if (now - last_object_scan_time) > OBJECT_SCAN_INTERVAL:
            last_persons, last_objects = engine.detect_all(frame)  # type: ignore
            last_object_scan_time = now
        else:
            last_persons, _ = engine.detect_all(frame)  # type: ignore
            
        current_frame_ids = set()
        metadata_dets = []
        
        # TRACKING
        for det in last_persons:
            x1, y1, x2, y2, conf = det
            cx, cy = (x1 + x2) / 2.0, (y1 + y2) / 2.0
            
            best_id = None
            best_dist = 120.0
            
            for tid, tdata in tracks.items():  # type: ignore
                dist = hypot(cx - tdata['cx'], cy - tdata['cy'])
                if dist < best_dist:
                    best_dist = dist
                    best_id = tid
                    
            if best_id is None:
                best_id = f"person_{int(now*1000)}"
                tracks[best_id] = {  # type: ignore
                    "first_seen": now,
                    "last_seen": now,
                    "last_rec_time": 0,
                    "name": "Scanning",
                    "prev_name": None,
                    "cx": cx,
                    "cy": cy,
                    "stage_1_triggered": False,
                    "stage_2_triggered": False,
                    "stage_3_triggered": False,
                    "last_alert_time": 0,
                    "embeddings_saved": False
                }
                
            tracks[best_id].update({"cx": cx, "cy": cy, "last_seen": now})  # type: ignore
            current_frame_ids.add(best_id)
            track_data = tracks[best_id]  # type: ignore
            
            # RECOGNITION (CRITICAL LOGIC)
            if (now - track_data["last_rec_time"]) >= RECOGNITION_INTERVAL:
                # Suppress numpy warnings by turning off rcond warnings briefly
                import warnings
                with warnings.catch_warnings():
                    warnings.simplefilter("ignore", category=FutureWarning)
                    embedding, name, score = engine.recognize_face(frame, (x1, y1, x2, y2))
                
                # Save embeddings for later authorization
                if embedding is not None and not track_data["embeddings_saved"]:
                    emb_key = f"{UNKNOWN_FACE_EMBS_KEY}{best_id}"
                    redis_client.rpush(emb_key, embedding.tobytes())
                    redis_client.expire(emb_key, 300)
                    track_data["embeddings_saved"] = True
                    
                old_name = track_data["name"]
                
                # SMOOTHING: Only change if significantly different
                should_update = False
                
                if name and name not in ["Scanning", "No face"]:
                    # Recognized someone
                    if old_name != name:
                        # Only switch if confident enough
                        if score >= 0.45:  # Higher threshold for switching
                            should_update = True
                elif score < 0.35:  # Lower threshold to become UNKNOWN
                    if old_name not in ["UNKNOWN", "Scanning", "No face"]:
                        should_update = True
                
                if should_update:
                    track_data["name"] = name if name else "UNKNOWN"
                    
                    # INSTANT SWITCH DETECTION
                    if track_data["name"] != old_name and old_name not in [None, "Scanning", "No face"]:
                        print(f"[SWITCH] {old_name} → {track_data['name']}", flush=True)
                        # RESET TIMER
                        track_data["first_seen"] = now
                        track_data["stage_1_triggered"] = False
                        track_data["stage_2_triggered"] = False
                        track_data["stage_3_triggered"] = False
                elif not name and old_name in ["Scanning", "No face"]:
                    track_data["name"] = "No face"
                
                track_data["last_rec_time"] = now
                    
            # TIMER & ALERT LOGIC
            current_name = track_data["name"]
            duration = now - track_data["first_seen"]
            
            is_unauthorized = current_name in ["UNKNOWN", "Scanning", "No face", "Too far"]
            if not is_armed or not is_unauthorized:
                status = "safe"
            else:
                if duration < STAGE_1_START:
                    status = "tracking"
                elif STAGE_1_START <= duration < STAGE_2_START:
                    status = "warning"
                    if not track_data["stage_1_triggered"]:
                        print(f"[STAGE 1] ⚠️ {best_id}", flush=True)
                        redis_client.publish(EVENT_KEY, json.dumps({
                            "type": "WARNING",
                            "data": {"person_id": best_id, "status": "warning", "duration": round(duration, 1), "stage": 1}  # type: ignore
                        }))
                        track_data["stage_1_triggered"] = True
                        
                elif STAGE_2_START <= duration < STAGE_3_START:
                    status = "critical"
                    if not track_data["stage_2_triggered"]:
                        print(f"[STAGE 2] 🚨 {best_id} - TRIGGERING POPUP", flush=True)
                        
                        # SAVE FACE IMAGE FOR POPUP
                        pad = 40
                        fx1, fy1 = max(0, int(x1)-pad), max(0, int(y1)-pad)
                        fx2, fy2 = min(w, int(x2)+pad), min(h, int(y2)+pad)
                        face_crop = frame[fy1:fy2, fx1:fx2]
                        
                        if face_crop.size > 0:
                            _, buf = cv2.imencode(".jpg", face_crop, [int(cv2.IMWRITE_JPEG_QUALITY), 85])
                            redis_client.set(IMAGE_KEY, buf.tobytes())
                            print(f"[STAGE 2] 📸 Face image saved to Redis", flush=True)
                            
                            # LLM DESCRIPTION - WITH DETAILED LOGGING
                            if llm and llm.enabled:  # type: ignore
                                import tempfile
                                try:
                                    # Save to temp file
                                    temp_img = tempfile.NamedTemporaryFile(delete=False, suffix='.jpg')
                                    temp_img.write(buf.tobytes())
                                    temp_img.close()
                                    
                                    print(f"[POPUP] 📝 Temp file created: {temp_img.name}", flush=True)
                                    print(f"[POPUP] 📊 File size: {os.path.getsize(temp_img.name)} bytes", flush=True)
                                    
                                    # Verify file is valid image
                                    from PIL import Image  # type: ignore
                                    test_img = Image.open(temp_img.name)
                                    print(f"[POPUP] 🖼️ Image verified: {test_img.size} {test_img.mode}", flush=True)
                                    test_img.close()
                                    
                                    print(f"[POPUP] 🤖 Calling LLM.get_quick_description()...", flush=True)
                                    
                                    # Call LLM
                                    description = llm.get_quick_description(temp_img.name)  # type: ignore
                                    
                                    print(f"[POPUP] 📤 LLM returned: '{description}'", flush=True)
                                    
                                    # Clean up
                                    os.unlink(temp_img.name)
                                    print(f"[POPUP] 🧹 Temp file deleted", flush=True)
                                
                                except Exception as e:
                                    print(f"[POPUP] ❌ Exception in LLM call: {e}", flush=True)
                                    import traceback
                                    traceback.print_exc()
                                    description = "Error calling AI. Manual verification required."
                            else:
                                print(f"[POPUP] ⚠️ LLM not available (enabled={llm.enabled if llm else 'None'})", flush=True)  # type: ignore
                                description = "AI offline. Manual verification required."
                            
                            # SAVE TO REDIS
                            redis_client.set(f"llm:desc:{best_id}", description.encode('utf-8'))
                            redis_client.expire(f"llm:desc:{best_id}", 300)
                            print(f"[POPUP] 💾 Saved to Redis: llm:desc:{best_id}", flush=True)
                            print(f"[POPUP] 💾 Value: '{description}'", flush=True)
                                    
                        redis_client.publish(EVENT_KEY, json.dumps({
                            "type": "CRITICAL",
                            "data": {
                                "person_id": best_id, 
                                "status": "critical", 
                                "duration": round(duration, 1),  # type: ignore
                                "stage": 2
                            }
                        }))
                        print(f"[STAGE 2] 📡 CRITICAL event published", flush=True)
                        track_data["stage_2_triggered"] = True
                        
                else:  # 20+ seconds
                    status = "critical"
                    if not track_data["stage_3_triggered"]:
                        print(f"[STAGE 3] 🔥 {best_id}", flush=True)
                        
                        # NOTIFICATIONS
                        if notifier:
                            try:
                                notifier.make_call("Critical Alert", person_id=best_id)  # type: ignore
                                notifier.send_sms("🚨 PANIC", person_id=best_id)  # type: ignore
                            except Exception as e:
                                print(f"[AI_WORKER] ⚠️ Notification Failed: {e}", flush=True)
                                
                        # START RECORDING
                        if best_id not in active_recorders:
                            ts = datetime.now().strftime("%Y%m%d_%H%M%S")
                            fname = f"intruder_{ts}_{best_id}.webm"
                            fpath = os.path.join(EVIDENCE_DIR, fname)
                            fourcc = cv2.VideoWriter_fourcc(*'VP80')
                            writer = cv2.VideoWriter(fpath, fourcc, 10.0, (w, h))
                            active_recorders[best_id] = {
                                "writer": writer,
                                "file": fname,
                                "last_frame_time": now
                            }
                            
                        redis_client.publish(EVENT_KEY, json.dumps({
                            "type": "PANIC",
                            "data": {"person_id": best_id, "status": "critical", "duration": round(duration, 1), "stage": 3}  # type: ignore
                        }))
                        track_data["stage_3_triggered"] = True
                        
                # CONTINUOUS ALERTS (every 1s)
                if status != "safe" and (now - track_data["last_alert_time"]) >= 1.0:
                    redis_client.publish(EVENT_KEY, json.dumps({
                        "type": "ALERT",
                        "data": {"person_id": best_id, "status": status, "duration": round(duration, 1)}  # type: ignore
                    }))
                    track_data["last_alert_time"] = now
                    
            # RECORDING
            if best_id in active_recorders:
                active_recorders[best_id]["writer"].write(frame)  # type: ignore
                active_recorders[best_id]["last_frame_time"] = now  # type: ignore
                
            metadata_dets.append({
                "id": best_id,
                "bbox": [int(x1), int(y1), int(x2), int(y2)],
                "name": current_name,
                "status": status,
                "type": "person"
            })
            
        for obj in last_objects:
            metadata_dets.append({
                "id": f"obj_{obj['label']}",
                "bbox": obj['bbox'],
                "name": obj['label'].upper(),
                "status": "object",
                "type": "object",
                "confidence": obj['conf']
            })
            
        # RECORDING CLEANUP
        for rid, rdata in list(active_recorders.items()):  # type: ignore
            if not is_armed or (now - rdata["last_frame_time"]) > RECORDER_PATIENCE:  # type: ignore
                rdata["writer"].release()  # type: ignore
                print(f"[REC] 💾 Saved {rdata['file']}", flush=True)  # type: ignore
                del active_recorders[rid]  # type: ignore
                
        # TRACK CLEANUP
        for tid in [t for t, d in tracks.items() if (now - d["last_seen"]) > TRACK_TIMEOUT]:  # type: ignore
            del tracks[tid]  # type: ignore
            
        redis_client.publish(EVENT_KEY, json.dumps({
            "type": "detection_update", 
            "data": {"detections": metadata_dets}
        }, cls=NumpyEncoder))

if __name__ == "__main__":
    try:
        process_loop()
    except KeyboardInterrupt:
        print("\n[AI_WORKER] 🛑 Stop", flush=True)