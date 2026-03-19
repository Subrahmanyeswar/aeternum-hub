import os
import time
import json
from datetime import datetime
import sys
import typing

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
EVIDENCE_DIR = os.path.join(BASE_DIR, "evidence")
ANALYSIS_DIR = os.path.join(BASE_DIR, "data", "ai_analysis")
PROCESSED_FILE = os.path.join(ANALYSIS_DIR, "processed_videos.json")

os.makedirs(ANALYSIS_DIR, exist_ok=True)

def load_processed():
    if os.path.exists(PROCESSED_FILE):
        try:
            with open(PROCESSED_FILE, 'r') as f:
                return json.load(f)
        except Exception:
            return []
    return []

def save_processed(processed_list):
    with open(PROCESSED_FILE, 'w') as f:
        json.dump(processed_list, f, indent=2)

def main():
    print("[VIDEO_PROC] 🎥 Starting background video processor...", flush=True)
    print(f"[VIDEO_PROC] 📂 Monitoring: {EVIDENCE_DIR}", flush=True)
    
    # Import LLM analyzer (from app paths context)
    try:
        sys.path.append(BASE_DIR)
        from backend.llm_analyzer import LLMAnalyzer  # type: ignore
        llm = LLMAnalyzer()
        print("[VIDEO_PROC] ✅ LLM Ready", flush=True)
    except Exception as e:
        print(f"[VIDEO_PROC] ❌ LLM Failed: {e}", flush=True)
        llm = None
    
    processed: typing.List[str] = load_processed()
    
    while True:
        try:
            # List all .webm files
            if not os.path.exists(EVIDENCE_DIR):
                time.sleep(5)
                continue
            
            videos = [f for f in os.listdir(EVIDENCE_DIR) if f.endswith('.webm')]
            
            for video_file in videos:
                if video_file in processed:  # type: ignore
                    continue
                
                video_path = os.path.join(EVIDENCE_DIR, video_file)
                
                # Wait for file to be complete by monitoring size differences securely
                size1 = os.path.getsize(video_path)
                time.sleep(2)
                size2 = os.path.getsize(video_path)
                
                if size1 != size2 or size2 < 1024:  # Still writing
                    continue
                
                print(f"[VIDEO_PROC] 🎥 NEW VIDEO: {video_file}", flush=True)
                print(f"[VIDEO_PROC] ⏳ Starting AI analysis...", flush=True)
                
                start_time = time.time()
                
                if llm:
                    try:
                        result = llm.analyze_video(video_path)  # type: ignore
                        elapsed = time.time() - start_time
                        print(f"[VIDEO_PROC] ✅ Analysis complete in {elapsed:.1f}s", flush=True)
                        
                        threat_level = result.get("threat_assessment", {}).get("level", "UNKNOWN")
                        print(f"[VIDEO_PROC] 📝 Threat Level: {threat_level}", flush=True)
                    except Exception as e:
                        print(f"[VIDEO_PROC] ❌ Analysis error: {e}", flush=True)
                else:
                    print(f"[VIDEO_PROC] ⚠️ LLM unavailable, skipped processing the inference layer", flush=True)
                
                # Mark as processed entirely
                processed.append(video_file)  # type: ignore
                save_processed(processed)
            
            time.sleep(5)  # Check every 5 seconds iteratively
        
        except Exception as e:
            print(f"[VIDEO_PROC] ❌ Error: {e}", flush=True)
            time.sleep(5)

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n[VIDEO_PROC] 🛑 Stopped", flush=True)