import cv2
import redis
import time
import numpy as np

REDIS_URL = "redis://localhost:6379/0"
FRAME_KEY = "camera:frame"

def main():
    print("[CAMERA] 🎥 Starting camera worker...", flush=True)
    
    redis_client = redis.Redis.from_url(REDIS_URL, decode_responses=False)
    
    # Open camera
    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        print("[CAMERA] ❌ Cannot open camera", flush=True)
        return
    
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
    cap.set(cv2.CAP_PROP_FPS, 30)
    
    print("[CAMERA] ✅ Camera ready", flush=True)
    
    frame_count = 0
    
    while True:
        ret, frame = cap.read()
        
        if not ret:
            print("[CAMERA] ⚠️ Frame read failed", flush=True)
            time.sleep(0.1)
            continue
        
        # Encode as JPEG
        _, buffer = cv2.imencode('.jpg', frame, [int(cv2.IMWRITE_JPEG_QUALITY), 90])
        
        # Push to Redis (overwrites previous frame)
        redis_client.set(FRAME_KEY, buffer.tobytes())
        
        frame_count += 1
        if frame_count % 300 == 0:  # Every 10 seconds tracking at 30fps
            print(f"[CAMERA] 📸 {frame_count} frames captured", flush=True)
        
        time.sleep(0.033)  # ~30 FPS

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n[CAMERA] 🛑 Stopped", flush=True)