import time
import subprocess
import os
import sys

# Define the components to monitor
COMPONENTS = [
    {"name": "Backend API", "cmd": ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]},
    {"name": "Camera Worker", "cmd": [sys.executable, "-m", "backend.camera_worker"]},
    {"name": "AI Worker", "cmd": [sys.executable, "-m", "backend.ai_worker"]},
    {"name": "Video Processor", "cmd": [sys.executable, "-m", "backend.video_processor"]}
]

def main():
    print("========================================")
    print("🐶 AETERNUM HUB WATCHDOG STARTED")
    print("========================================")
    
    processes = {}
    
    # Start all components
    for comp in COMPONENTS:
        print(f"[WATCHDOG] Starting {comp['name']}...")
        p = subprocess.Popen(comp['cmd'])
        processes[comp['name']] = {"process": p, "config": comp}
        time.sleep(2)
        
    print("[WATCHDOG] ✅ All critical services monitored")
    
    try:
        while True:
            for name, data in processes.items():
                p = data["process"]
                if p.poll() is not None:
                    # Process died
                    print(f"\n[WATCHDOG] ⚠️ CRITICAL: {name} crashed (Exit code: {p.returncode})!")
                    print(f"[WATCHDOG] 🔄 Restarting {name}...")
                    
                    # Restart
                    new_p = subprocess.Popen(data["config"]['cmd'])
                    processes[name]["process"] = new_p
                    
            time.sleep(5)
            
    except KeyboardInterrupt:
        print("\n[WATCHDOG] 🛑 Shutting down all services...")
        for name, data in processes.items():
            try:
                data["process"].terminate()
                data["process"].wait(timeout=3)
            except Exception:
                data["process"].kill()
        print("[WATCHDOG] Terminated safely.")

if __name__ == "__main__":
    main()
