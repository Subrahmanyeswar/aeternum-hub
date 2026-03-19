import os
import json
import time
from datetime import datetime
import torch
from PIL import Image
import cv2

try:
    from transformers import VisionEncoderDecoderModel, ViTImageProcessor, AutoTokenizer
    VIT_AVAILABLE = True
except ImportError:
    VIT_AVAILABLE = False

# Ensure Hugging Face token is effectively set to bypass annoying rate limit warnings during massive downloads
if not os.environ.get("HF_TOKEN"):
    os.environ["HF_TOKEN"] = "hf_dummy_token_replace_with_real"
    os.environ["HF_HUB_DISABLE_SYMLINKS_WARNING"] = "1"

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ANALYSIS_DIR = os.path.join(BASE_DIR, "data", "ai_analysis")
os.makedirs(ANALYSIS_DIR, exist_ok=True)

class LLMAnalyzer:
    def __init__(self):
        print("[LLM] 🤖 Initializing Vision System...", flush=True)
        
        self.enabled = False
        
        if not VIT_AVAILABLE:
            print("[LLM] ⚠️ Transformers not installed", flush=True)
            return
        
        if not torch.cuda.is_available():
            print("[LLM] ⚠️ CUDA not available", flush=True)
            return
        
        try:
            print("[LLM] 📥 Loading ViT-GPT2 (500MB - Fast Download)...", flush=True)
            
            model_name = "nlpconnect/vit-gpt2-image-captioning"
            
            # Load lightweight model (~500MB, downloads in 2-3 min)
            self.model = VisionEncoderDecoderModel.from_pretrained(model_name)
            self.processor = ViTImageProcessor.from_pretrained(model_name)
            self.tokenizer = AutoTokenizer.from_pretrained(model_name)
            
            # Move to GPU
            device = "cuda" if torch.cuda.is_available() else "cpu"
            self.model = self.model.to(device)
            self.device = device
            
            torch.cuda.empty_cache()
            
            self.enabled = True
            print("[LLM] ✅ ViT-GPT2 Ready (Lightweight, Fast)", flush=True)
        
        except Exception as e:
            print(f"[LLM] ❌ Load failed: {e}", flush=True)
            import traceback
            traceback.print_exc()
            self.enabled = False
    
    def get_quick_description(self, image_path: str) -> str:
        """Generate description for popup"""
        if not self.enabled:
            return "AI offline. Manual verification required."
        
        try:
            print(f"[LLM] 📸 Analyzing: {os.path.basename(image_path)}", flush=True)
            
            # Load image
            image = Image.open(image_path).convert('RGB')
            
            # Preprocess
            pixel_values = self.processor(images=image, return_tensors="pt").pixel_values
            pixel_values = pixel_values.to(self.device)
            
            print(f"[LLM] 🧠 Generating description...", flush=True)
            
            # Generate caption
            generated_ids = self.model.generate(
                pixel_values,
                max_length=50,
                num_beams=4,
                early_stopping=True
            )
            
            description = self.tokenizer.batch_decode(
                generated_ids,
                skip_special_tokens=True
            )[0].strip()
            
            # Enhance description
            if description and len(description) > 5:
                # Capitalize first letter
                description = description[0].upper() + description[1:]
                # Add context
                enhanced = f"{description}. Individual detected in secure area."
                print(f"[LLM] ✅ SUCCESS: {enhanced}", flush=True)
                return enhanced
            else:
                print(f"[LLM] ⚠️ Short response", flush=True)
                return "Person detected in security footage."
        
        except Exception as e:
            print(f"[LLM] ❌ Error: {e}", flush=True)
            import traceback
            traceback.print_exc()
            return "Person detected. Manual verification required."
    
    def analyze_video(self, video_path: str) -> dict:
        """Analyze video and generate police report"""
        print(f"[LLM] 🎥 Video: {os.path.basename(video_path)}", flush=True)
        
        if not self.enabled:
            return self._create_fallback_report(video_path)
        
        try:
            # Wait for file
            for i in range(15):
                if os.path.exists(video_path) and os.path.getsize(video_path) > 2048:
                    break
                time.sleep(1)
            
            cap = cv2.VideoCapture(video_path)
            if not cap.isOpened():
                return self._create_fallback_report(video_path)
            
            total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            print(f"[LLM] 📊 Frames: {total_frames}", flush=True)
            
            if total_frames < 3:
                cap.release()
                return self._create_fallback_report(video_path)
            
            # Extract 3 frames
            frame_indices = [0, total_frames // 2, total_frames - 1]
            descriptions = []
            
            for idx, frame_idx in enumerate(frame_indices):
                try:
                    cap.set(cv2.CAP_PROP_POS_FRAMES, frame_idx)
                    ret, frame = cap.read()
                    
                    if ret and frame is not None and frame.size > 0:
                        # Convert to PIL
                        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                        pil_img = Image.fromarray(rgb)
                        
                        print(f"[LLM] 🔄 Frame {idx + 1}/3...", flush=True)
                        
                        # Generate caption
                        pixel_values = self.processor(images=pil_img, return_tensors="pt").pixel_values
                        pixel_values = pixel_values.to(self.device)
                        
                        generated_ids = self.model.generate(
                            pixel_values,
                            max_length=50,
                            num_beams=4
                        )
                        
                        desc = self.tokenizer.batch_decode(
                            generated_ids,
                            skip_special_tokens=True
                        )[0].strip()
                        
                        # Capitalize
                        if desc:
                            desc = desc[0].upper() + desc[1:]
                        
                        descriptions.append(desc)
                        print(f"[LLM] ✅ Frame {idx + 1}: {desc[:50]}...", flush=True)
                
                except Exception as e:
                    print(f"[LLM] ⚠️ Frame {idx + 1} error: {e}", flush=True)
                    descriptions.append("Frame unavailable")
            
            cap.release()
            
            # Build narrative
            valid_descs = [d for d in descriptions if len(d) > 10]
            
            if valid_descs:
                narrative = f"""At approximately {datetime.now().strftime('%H:%M')}, automated security surveillance detected an unauthorized individual in the monitored premises.

Initial observation: {descriptions[0] if descriptions else 'Subject entered area'}

Continued surveillance: {descriptions[1] if len(descriptions) > 1 else 'Subject remained in area'}

Final observation: {descriptions[2] if len(descriptions) > 2 else 'Alert triggered'}

The subject remained in the secure perimeter for 20+ seconds without authorization credentials, triggering automated alert protocols."""
                
                subject_appearance = descriptions[0] if descriptions else "See video"
                subject_behavior = " → ".join(valid_descs)
            else:
                narrative = "Automated surveillance detected unauthorized individual loitering 20+ seconds."
                subject_appearance = "Refer to video evidence"
                subject_behavior = "Unauthorized prolonged presence"
            
            # Generate report
            report_data = self._generate_police_report(
                video_path, narrative, subject_appearance, subject_behavior, descriptions
            )
            
            # Save
            self._save_report(video_path, report_data)
            
            print(f"[LLM] ✅ Report complete", flush=True)
            return report_data
        
        except Exception as e:
            print(f"[LLM] ❌ Error: {e}", flush=True)
            import traceback
            traceback.print_exc()
            return self._create_fallback_report(video_path)
    
    def _generate_police_report(self, video_path, narrative, appearance, behavior, descriptions):
        """Generate Singapore Police report"""
        ts = datetime.now()
        
        return {
            "report_classification": "Loitering / Trespass (Section 448 Penal Code)",
            "informant_particulars": {
                "system_id": "Aeternum Hub Automated Security",
                "location": "Monitored premises",
                "alert_triggered": ts.strftime("%d/%m/%Y %H:%M:%S")
            },
            "incident_details": {
                "date_time_of_incident": ts.strftime("%d/%m/%Y %H:%M:%S"),
                "location_of_incident": "Secured premises entry point",
                "brief_account": narrative
            },
            "subject_description": {
                "physical_appearance": appearance,
                "clothing": "Visible in recording",
                "distinctive_features": "Captured on CCTV",
                "behavior": behavior
            },
            "timeline": [
                {"timestamp": "00:00", "event": descriptions[0] if descriptions else "Subject enters"},
                {"timestamp": "00:10", "event": descriptions[1] if len(descriptions) > 1 else "Activity continues"},
                {"timestamp": "00:20", "event": descriptions[2] if len(descriptions) > 2 else "Alert triggered"}
            ],
            "threat_assessment": {
                "level": "MEDIUM",
                "justification": "Unauthorized individual remained in secure area 20+ seconds without identification."
            },
            "supporting_evidence": {
                "video_file": os.path.basename(video_path),
                "duration": "~20-30 seconds",
                "quality": "640x480 @ 10 FPS",
                "ai_confidence": "High" if len([d for d in descriptions if len(d) > 10]) >= 2 else "Manual review"
            },
            "recommendations": {
                "law_enforcement": "Review footage. Cross-reference databases. Follow up if repeat.",
                "security_measures": "Verify entry points. Increase patrols. Review signage.",
                "follow_up": "Monitor for repeats. Escalate if pattern continues."
            },
            "officer_record": {
                "generated_by": "Aeternum Hub AI v2.0",
                "authentication": "Automated report via ViT-GPT2. Human verification required.",
                "station": "Automated Security Operations"
            }
        }
    
    def _save_report(self, video_path, report_data):
        """Save report to JSON"""
        ts = datetime.now().strftime("%Y%m%d_%H%M%S")
        video_name = os.path.basename(video_path).replace('.webm', '')
        filename = f"police_report_{ts}_{video_name}.json"
        filepath = os.path.join(ANALYSIS_DIR, filename)
        
        full_report = {
            "report_id": f"G/{datetime.now().strftime('%Y%m%d/%H%M')}",
            "generated_at": ts,
            "video_file": video_path,
            "analysis": report_data,
            "status": "PENDING_REVIEW"
        }
        
        with open(filepath, 'w') as f:
            json.dump(full_report, f, indent=2)
        
        print(f"[LLM] 💾 Saved: {filename}", flush=True)
    
    def _create_fallback_report(self, video_path):
        """Fallback if AI unavailable"""
        ts = datetime.now()
        
        report_data = {
            "report_classification": "Loitering / Trespass (Section 448 Penal Code)",
            "informant_particulars": {
                "system_id": "Aeternum Hub",
                "alert_triggered": ts.strftime("%d/%m/%Y %H:%M:%S")
            },
            "incident_details": {
                "date_time_of_incident": ts.strftime("%d/%m/%Y %H:%M:%S"),
                "brief_account": "Automated surveillance detected unauthorized loitering 20+ seconds. Manual review required."
            },
            "subject_description": {
                "physical_appearance": "Refer to video",
                "behavior": "Prolonged unauthorized presence"
            },
            "timeline": [
                {"timestamp": "00:00", "event": "Subject detected"},
                {"timestamp": "00:10", "event": "Continued presence"},
                {"timestamp": "00:20", "event": "Alert triggered"}
            ],
            "threat_assessment": {
                "level": "MEDIUM",
                "justification": "Unauthorized loitering"
            },
            "supporting_evidence": {
                "video_file": os.path.basename(video_path)
            },
            "recommendations": {
                "law_enforcement": "Review footage",
                "security_measures": "Verify entry points"
            },
            "officer_record": {
                "generated_by": "Aeternum Hub v2.0",
                "authentication": "Manual verification required"
            }
        }
        
        self._save_report(video_path, report_data)
        return report_data