from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Response, Request  # type: ignore
from fastapi.responses import StreamingResponse, FileResponse  # type: ignore
from fastapi.middleware.cors import CORSMiddleware  # type: ignore
from pydantic import BaseModel  # type: ignore
import redis  # type: ignore
import json
import os
import time
from datetime import datetime
from typing import List, Dict, Any
import asyncio
import shutil
import psutil  # type: ignore

app = FastAPI(title="Aeternum Hub API")

# CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://100.125.216.4:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

REDIS_URL = "redis://localhost:6379/0"
redis_client = redis.Redis.from_url(REDIS_URL, decode_responses=False)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
EVIDENCE_DIR = os.path.join(BASE_DIR, "evidence")
DATA_DIR = os.path.join(BASE_DIR, "data")
LOGS_FILE = os.path.join(DATA_DIR, "system_logs.json")
ANALYSIS_DIR = os.path.join(DATA_DIR, "ai_analysis")

os.makedirs(EVIDENCE_DIR, exist_ok=True)
os.makedirs(DATA_DIR, exist_ok=True)
os.makedirs(ANALYSIS_DIR, exist_ok=True)

# LOGGING SYSTEM
def log_event(log_type: str, title: str, desc: str):
    try:
        if os.path.exists(LOGS_FILE):
            with open(LOGS_FILE, 'r') as f:
                logs: List[Dict[str, Any]] = json.load(f)
        else:
            logs = []
        
        now = time.time()
        dt = datetime.fromtimestamp(now)
        
        log_entry = {
            "id": int(now * 1000),
            "type": log_type,
            "title": title,
            "desc": desc,
            "timestamp": now,
            "date": dt.strftime("%Y-%m-%d"),
            "time": dt.strftime("%H:%M:%S")
        }
        
        logs.insert(0, log_entry)
        logs = logs[:100]  # type: ignore # Keep only last 100
        
        with open(LOGS_FILE, 'w') as f:
            json.dump(logs, f, indent=2)
    except Exception as e:
        print(f"[API] ⚠️ Log error: {e}", flush=True)

# ENDPOINTS
@app.get("/api/status")
def get_status():
    armed = redis_client.get("system:armed") != b"0"
    
    # Estimate active threats (parse bounding box tracks directly looking for UNKNOWN)
    active_threats = 0
    events_latest = redis_client.get("ai:metadata") # Not in spec but a good approximation, relying on tracking data via AI_Worker
    
    try:
        usage = shutil.disk_usage(EVIDENCE_DIR)
        storage_percent = (usage.used / usage.total) * 100
    except Exception:
        storage_percent = 0.0
        
    cpu_percent = psutil.cpu_percent()
    
    return {
        "armed": armed, 
        "active_threats": active_threats, 
        "storage_percent": round(float(storage_percent), 1),  # type: ignore 
        "cpu_percent": round(float(cpu_percent), 1)  # type: ignore
    }

class ArmRequest(BaseModel):
    armed: bool

@app.post("/api/arm")
def set_arm(body: ArmRequest):
    redis_client.set("system:armed", "1" if body.armed else "0")
    state = "Armed" if body.armed else "Disarmed"
    log_event("system", f"System {state}", f"User {state.lower()} the security system.")
    return {"success": True, "armed": body.armed}

@app.get("/api/llm_description/{person_id}")
def get_llm_description(person_id: str):
    desc = redis_client.get(f"llm:desc:{person_id}")
    if desc:
        return {"description": desc.decode('utf-8')}
    return {"description": "Analyzing..."}

class AuthorizeRequest(BaseModel):
    person_id: str
    name: str

@app.post("/api/authorize")
def authorize_person(body: AuthorizeRequest):
    # Call saving via subprocess or script depending on engine loading safely
    # For now, append to npz correctly through embedding load
    try:
        import numpy as np  # type: ignore
        emb_key = f"auth:embs:{body.person_id}"
        embs_bytes = redis_client.lrange(emb_key, 0, -1)
        
        if embs_bytes:
            FACE_DB_PATH = os.path.join(DATA_DIR, "face_database.npz")
            if os.path.exists(FACE_DB_PATH):
                data = np.load(FACE_DB_PATH)
                known_embeddings = data['embeddings'].tolist()
                known_names = data['names'].tolist()
            else:
                known_embeddings, known_names = [], []
                
            for raw in embs_bytes:
                known_embeddings.append(np.frombuffer(raw, dtype=np.float32))
                known_names.append(body.name)
                
            np.savez(FACE_DB_PATH, embeddings=np.array(known_embeddings), names=np.array(known_names))
            redis_client.set("ai:reload_db", "1")
            redis_client.delete(emb_key)
            log_event("system", "Authorization Successful", f"Added '{body.name}' to verified database.")
            return {"success": True}
        return {"success": False, "error": "No embeddings found in Redis for this ID."}
    except Exception as e:
        log_event("system", "Authorization Failed", str(e))
        return {"success": False, "error": str(e)}

@app.get("/api/evidence")
def list_evidence():
    files = []
    if os.path.exists(EVIDENCE_DIR):
        for f in os.listdir(EVIDENCE_DIR):
            if f.endswith(".webm"):
                path = os.path.join(EVIDENCE_DIR, f)
                stats = os.stat(path)
                files.append({
                    "filename": f,
                    "size_mb": round(float(stats.st_size) / (1024*1024), 2),  # type: ignore
                    "created": stats.st_mtime,
                    "url": f"/api/stream/{f}"
                })
    return sorted(files, key=lambda x: x["created"], reverse=True)

def range_generator(file_path, start, end, chunk_size=4*1024*1024):
    with open(file_path, "rb") as f:
        f.seek(start)
        remaining = (end - start) + 1
        while remaining > 0:
            read_size = min(chunk_size, remaining)
            chunk = f.read(read_size)
            if not chunk or len(chunk) == 0:  # type: ignore
                break
            yield chunk
            remaining -= len(chunk)

@app.get("/api/stream/{filename}")
def stream_video(filename: str, request: Request):
    file_path = os.path.join(EVIDENCE_DIR, filename)
    if not os.path.exists(file_path):
        return Response(status_code=404)
        
    file_size = os.path.getsize(file_path)
    range_header = request.headers.get("range")
    
    if range_header:
        try:
            range_parts = range_header.replace("bytes=", "").split("-")
            start = int(range_parts[0])
            end = int(range_parts[1]) if range_parts[1] else file_size - 1
            
            if start >= file_size:
                return Response(status_code=416)
                
            return StreamingResponse(
                range_generator(file_path, start, end),
                status_code=206,
                headers={
                    "Accept-Ranges": "bytes",
                    "Content-Range": f"bytes {start}-{end}/{file_size}",
                    "Content-Length": str((end - start) + 1),
                    "Content-Type": "video/webm",
                    "Cache-Control": "no-cache"
                }
            )
        except Exception:
            return Response(status_code=416)
            
    return FileResponse(file_path, media_type="video/webm", headers={"Accept-Ranges": "bytes"})

@app.get("/api/analysis")
def list_analysis():
    reports = []
    if os.path.exists(ANALYSIS_DIR):
        for f in os.listdir(ANALYSIS_DIR):
            if f.endswith('.json') and f != 'processed_videos.json':
                filepath = os.path.join(ANALYSIS_DIR, f)
                try:
                    with open(filepath, 'r') as file:
                        data = json.load(file)
                        reports.append({
                            "filename": f,
                            "type": "video" if "police_report" in f else "image",
                            "data": data,
                            "created": os.path.getctime(filepath)
                        })
                except Exception:
                    pass
    return sorted(reports, key=lambda x: x["created"], reverse=True)

def generate_video_stream():
    while True:
        frame_bytes = redis_client.get("camera:frame")
        if frame_bytes:
            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')
        time.sleep(0.033)  # ~30 FPS

@app.get("/video/feed")
def video_feed():
    return StreamingResponse(generate_video_stream(), media_type="multipart/x-mixed-replace; boundary=frame")

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    
    # Subscribe to Redis events
    pubsub = redis_client.pubsub()
    pubsub.subscribe("events")
    
    try:
        while True:
            message = pubsub.get_message()
            if message and message['type'] == 'message':
                await websocket.send_text(message['data'].decode('utf-8'))
            await asyncio.sleep(0.01)
    except WebSocketDisconnect:
        pass
    finally:
        pubsub.unsubscribe()
        pubsub.close()

class LogInternalRequest(BaseModel):
    type: str
    title: str
    desc: str

@app.post("/api/logs/internal")
def create_internal_log(body: LogInternalRequest):
    log_event(body.type, body.title, body.desc)
    return {"success": True}

@app.get("/api/logs")
def get_logs():
    if os.path.exists(LOGS_FILE):
        try:
            with open(LOGS_FILE, 'r') as f:
                logs = json.load(f)
                return sorted(logs, key=lambda x: x["timestamp"], reverse=True)
        except Exception:
            return []
    return []

@app.get("/api/image/popup")
def get_popup_image():
    img_bytes = redis_client.get("alert:latest_image")
    if img_bytes:
        return Response(content=img_bytes, media_type="image/jpeg")
    return Response(status_code=404)

@app.get("/api/health")
def health_check():
    checks = {
        "redis": False,
        "camera": False,
        "gpu": False,
        "llm": False
    }
    
    try:
        redis_client.ping()
        checks["redis"] = True
    except:
        pass
    
    try:
        frame = redis_client.get("camera:frame")
        checks["camera"] = frame is not None
    except:
        pass
    
    try:
        import torch  # type: ignore
        checks["gpu"] = torch.cuda.is_available()
    except:
        pass
    
    try:
        # Check LLM accessibility (simple test if import is possible without loading the whole model)
        try:
            from backend.llm_analyzer import TRANSFORMERS_AVAILABLE  # type: ignore
            checks["llm"] = TRANSFORMERS_AVAILABLE
        except:
            checks["llm"] = False
    except:
        pass
    
    return {
        "status": "healthy" if all(checks.values()) else "degraded",
        "checks": checks,
        "timestamp": time.time()
    }
