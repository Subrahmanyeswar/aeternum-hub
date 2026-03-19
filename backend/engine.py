import os
import cv2  # type: ignore
import numpy as np  # type: ignore
import torch  # type: ignore
import typing
from ultralytics import YOLO  # type: ignore
from insightface.app import FaceAnalysis  # type: ignore

DEVICE = 0 if torch.cuda.is_available() else 'cpu'
CUDA_AVAILABLE = torch.cuda.is_available()

# THRESHOLDS - DO NOT CHANGE
PERSON_CONF = 0.35
OBJECT_CONF = 0.30
FACE_MATCH_THRESHOLD = 0.40
MIN_FACE_SIZE = 50

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
FACE_DB_PATH = os.path.join(DATA_DIR, "face_database.npz")
os.makedirs(DATA_DIR, exist_ok=True)

class SecurityEngine:
    def __init__(self):
        print("[ENGINE] 🔧 INITIALIZING HIGH-SPEED MODE", flush=True)
        
        # 1. Enable PyTorch optimizations
        if CUDA_AVAILABLE:
            gpu_name = torch.cuda.get_device_name(0)
            print(f"[GPU] ✅ {gpu_name}", flush=True)
            torch.backends.cudnn.benchmark = True
            torch.backends.cuda.matmul.allow_tf32 = True
            torch.cuda.empty_cache()
            
        # 2. Load YOLO11m
        print("[ENGINE] Loading YOLO...", flush=True)
        try:
            self.yolo = YOLO("yolo11m.engine", task='detect')
            print("[YOLO] ✅ TensorRT Engine Loaded", flush=True)
        except Exception as e:
            print(f"[YOLO] ⚠️ TensorRT Failed ({e}), falling back to PyTorch", flush=True)
            self.yolo = YOLO("yolo11m.pt", task='detect')
            if CUDA_AVAILABLE:
                self.yolo.to(f'cuda:{DEVICE}')
                print("[YOLO] ✅ PyTorch Engine Loaded on GPU", flush=True)
                
        # 3. Load ArcFace (InsightFace)
        print("[ENGINE] Loading ArcFace...", flush=True)
        providers = [('CUDAExecutionProvider', {
            'device_id': DEVICE,
            'gpu_mem_limit': 2 * 1024 * 1024 * 1024
        })] if CUDA_AVAILABLE else ['CPUExecutionProvider']
        
        self.face_app = FaceAnalysis(name='buffalo_l', providers=providers)
        self.face_app.prepare(ctx_id=0 if CUDA_AVAILABLE else -1, det_size=(640, 640))
        print("[ARCFACE] ✅ Ready", flush=True)
        
        # 4. Initialize face database
        self.known_embeddings_np = np.array([])
        self.known_embeddings_torch = None
        self.known_names = np.array([])
        self.reload_db()
        
        # 5. Object classes dictionary
        self.object_classes = {
            24: "backpack", 26: "handbag", 28: "suitcase", 
            39: "bottle", 43: "knife", 67: "cell phone", 73: "laptop"
        }
        
        self.frame_count = 0
        
        print("[ENGINE] ✅ READY", flush=True)

    def detect_all(self, frame: np.ndarray) -> typing.Tuple[typing.List[typing.List[float]], typing.List[typing.Dict[str, typing.Any]]]:
        self.frame_count += 1
        if self.frame_count % 100 == 0 and CUDA_AVAILABLE:
            torch.cuda.empty_cache()
            
        results = self.yolo.predict(
            source=frame,
            conf=0.30,
            iou=0.45,
            classes=[0, 24, 26, 28, 39, 43, 67, 73],
            device=DEVICE if CUDA_AVAILABLE else 'cpu',
            half=True if CUDA_AVAILABLE else False,
            verbose=False,
            max_det=50
        )
        
        persons = []
        objects = []
        
        if results and len(results) > 0:
            boxes = results[0].boxes
            if boxes is not None:
                for box in boxes:
                    if CUDA_AVAILABLE:
                        cls_id = int(box.cls[0].cpu().item())
                        x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
                        conf = box.conf[0].cpu().item()
                    else:
                        cls_id = int(box.cls[0].item())
                        x1, y1, x2, y2 = box.xyxy[0].numpy()
                        conf = box.conf[0].item()
                    
                    if cls_id == 0 and conf >= PERSON_CONF:
                        persons.append([float(x1), float(y1), float(x2), float(y2), float(conf)])
                    elif cls_id in self.object_classes and conf >= OBJECT_CONF:
                        objects.append({
                            "label": self.object_classes[cls_id],
                            "bbox": [int(float(x1)), int(float(y1)), int(float(x2)), int(float(y2))],
                            "conf": round(float(conf), 2),  # type: ignore
                            "class_id": cls_id
                        })
                        
        return persons, objects

    def recognize_face(self, frame: np.ndarray, bbox: tuple):
        x1, y1, x2, y2 = bbox
        h, w, _ = frame.shape
        
        pad = 20
        fx1, fy1 = max(0, int(x1) - pad), max(0, int(y1) - pad)
        fx2, fy2 = min(w, int(x2) + pad), min(h, int(y2) + pad)
        face_crop = frame[fy1:fy2, fx1:fx2]
        
        if face_crop.size == 0:
            return None, "No face", 0.0
            
        crop_h, crop_w = face_crop.shape[:2]
        if crop_w < MIN_FACE_SIZE or crop_h < MIN_FACE_SIZE:
            return None, "Too far", 0.0
            
        try:
            faces = self.face_app.get(face_crop)
            if not faces or len(faces) == 0:
                return None, "No face", 0.0
                
            # Extract largest face
            face = max(faces, key=lambda f: (f.bbox[2] - f.bbox[0]) * (f.bbox[3] - f.bbox[1]))
            embedding = face.normed_embedding
            
            if len(self.known_embeddings_np) == 0:
                return embedding, None, 0.0
                
            if CUDA_AVAILABLE and self.known_embeddings_torch is not None:
                emb_tensor = torch.from_numpy(embedding).float().cuda()
                similarities = torch.nn.functional.cosine_similarity(
                    emb_tensor.unsqueeze(0), 
                    self.known_embeddings_torch, 
                    dim=1
                )
                best_match_idx = torch.argmax(similarities).cpu().item()
                best_score = similarities[best_match_idx].cpu().item()
            else:
                similarities = np.dot(self.known_embeddings_np, embedding)
                best_match_idx = np.argmax(similarities)
                best_score = similarities[best_match_idx]
                
            if best_score >= FACE_MATCH_THRESHOLD:
                return embedding, self.known_names[best_match_idx], best_score
            else:
                return embedding, None, best_score
        except Exception:
            return None, "Scanning", 0.0

    def reload_db(self):
        if os.path.exists(FACE_DB_PATH):
            try:
                data = np.load(FACE_DB_PATH)
                self.known_embeddings_np = data['embeddings']
                self.known_names = data['names']
                
                if CUDA_AVAILABLE and len(self.known_embeddings_np) > 0:
                    self.known_embeddings_torch = torch.from_numpy(self.known_embeddings_np).float().cuda()
                    
                print(f"[ENGINE] 🔄 {len(self.known_names)} faces loaded", flush=True)
            except Exception as e:
                print(f"[ENGINE] ❌ Failed to load face DB: {e}", flush=True)
                self.known_embeddings_np = np.array([])
                self.known_embeddings_torch = None
                self.known_names = np.array([])
        else:
            self.known_embeddings_np = np.array([])
            self.known_embeddings_torch = None
            self.known_names = np.array([])
            print("[ENGINE] 🔄 0 faces loaded (empty database)", flush=True)

    def save_face_to_database(self, embedding: np.ndarray, name: str):
        try:
            if os.path.exists(FACE_DB_PATH):
                data = np.load(FACE_DB_PATH)
                known_embeddings = data['embeddings'].tolist()
                known_names = data['names'].tolist()
            else:
                known_embeddings = []
                known_names = []
                
            known_embeddings.append(embedding)
            known_names.append(name)
            
            np.savez(FACE_DB_PATH, 
                     embeddings=np.array(known_embeddings), 
                     names=np.array(known_names))
            self.reload_db()
            
            print(f"[ENGINE] ✅ Saved '{name}' to database", flush=True)
            return True
        except Exception as e:
            print(f"[ENGINE] ❌ Failed to save face: {e}", flush=True)
            return False
