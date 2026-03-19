# Aeternum Hub - Production Deployment Guide

## System Requirements

### Hardware
- GPU: NVIDIA RTX 3050 (6GB VRAM) or better
- CPU: 4+ cores recommended
- RAM: 16GB minimum
- Storage: 50GB free space minimum
- Camera: USB webcam or RTSP stream

### Software
- Windows 10/11 (64-bit)
- NVIDIA Drivers: Latest (compatible with CUDA 12.1)
- Python 3.10+
- Node.js 18+
- Redis 7.0+

## Installation

### Step 1: Clone Repository
```bash
cd C:\Users\SUBBU\Downloads
git clone <repository_url> "Aeternum Hub GPU"
cd "Aeternum Hub GPU"
```

### Step 2: Create Virtual Environment
```bash
python -m venv venv_gpu
.\venv_gpu\Scripts\activate
```

### Step 3: Install Dependencies
```bash
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu121
pip install -r requirements.txt
```

### Step 4: Install Frontend
```bash
cd frontend
npm install
npm run build
cd ..
```

### Step 5: Configure Twilio (Optional)
Edit `backend/notifications.py`:
```python
ACCOUNT_SID = "your_account_sid"
AUTH_TOKEN = "your_auth_token"
FROM_NUMBER = "+your_twilio_number"
TO_NUMBER = "+your_phone_number"
```

### Step 6: Generate TensorRT Engine (Optional but Recommended)
```bash
python
>>> from ultralytics import YOLO
>>> model = YOLO("yolo11m.pt")
>>> model.export(format="engine", device=0)
>>> exit()
```

## Starting the System

### Production Start
```bash
startup_gpu.bat
```

This starts:
1. Backend API (port 8000)
2. Camera Worker
3. AI Worker
4. Video Processor
5. Frontend (port 3000)

### Verification
1. Check all 6 windows opened
2. Visit http://localhost:3000
3. Verify camera feed appears
4. Check GPU-Z: utilization 70-85%

## First-Time Setup

### 1. Authorize First Face
- Stand in front of camera
- Wait 10 seconds (popup appears)
- Click TRUST
- Enter your name
- You're now authorized!

### 2. Test System
- ARM the system
- Have someone unknown enter frame
- Verify 5/10/20s alerts trigger
- Check recording saves to evidence/
- Verify police report generates

## Troubleshooting

### Camera Not Detected
- Check Device Manager → Imaging Devices
- Update camera drivers
- Try different USB port
- Restart camera_worker

### GPU Not Used
- Update NVIDIA drivers
- Run: `nvidia-smi` to verify GPU visible
- Check CUDA installed: `python -c "import torch; print(torch.cuda.is_available())"`

### LLM Not Loading
- First run downloads 2GB model (takes 5-10 min)
- Check internet connection
- Verify 5GB+ VRAM available
- System works without LLM (uses fallback)

### Redis Connection Failed
- Install Redis: https://github.com/microsoftarchive/redis/releases
- Start Redis: `redis-server`
- Verify: `redis-cli ping` returns "PONG"

### High Latency
- Check GPU utilization (should be 70-85%)
- Verify TensorRT engine exists: `yolo11m.engine`
- Reduce camera resolution in camera_worker.py
- Close other GPU applications

## Performance Tuning

### Maximum Performance
1. Set Windows power plan: High Performance
2. NVIDIA Control Panel → Manage 3D Settings → Power Management: Prefer Maximum Performance
3. Disable Windows background apps
4. Close Chrome/other GPU apps

### Reduce VRAM Usage
- Use smaller model: `yolo11n.pt` instead of `yolo11m.pt`
- Reduce ArcFace det_size to (480,480) in engine.py
- Disable LLM if not needed

## Monitoring

### Check Logs
- System logs: `backend/data/system_logs.json`
- Console outputs in each worker window
- GPU stats: `nvidia-smi` or GPU-Z

### Health Check
```bash
curl http://localhost:8000/api/health
```

### Storage Management
- Evidence auto-saved to: `backend/evidence/`
- Reports: `backend/data/ai_analysis/`
- Auto-delete old files (>30 days) if space low

## Mobile Access

### Via Tailscale
1. Install Tailscale on mobile
2. Access: `http://100.125.216.4:3000`

### Via PWA
1. Open app in mobile Chrome
2. Menu → Add to Home Screen
3. Opens as full-screen app

## Security Considerations

- Change default Twilio credentials
- Use strong passwords for admin accounts
- Regularly update face database backups
- Review evidence periodically
- Secure network access (use VPN if remote)

## Backup & Recovery

### Backup Face Database
```bash
copy backend\data\face_database.npz backup_YYYYMMDD.npz
```

### Backup Evidence
```bash
xcopy backend\evidence backup\evidence\ /E /I
```

### Restore
```bash
copy backup_YYYYMMDD.npz backend\data\face_database.npz
```

## Updates

### Update System
```bash
git pull
pip install -r requirements.txt --upgrade
cd frontend && npm install
```

### Update Models
- YOLO: Download new `.pt` file, regenerate `.engine`
- Moondream: Delete cache, will re-download on next start

## Support

For issues:
1. Check logs for error messages
2. Run `python backend/test_system.py`
3. Verify all health checks pass
4. Review troubleshooting section above

## Production Checklist

Before going live:
- [x] All tests passing
- [x] GPU utilization 70-85%
- [x] Camera feed smooth (25-30 FPS)
- [x] Face recognition <300ms
- [x] ARM/DISARM instant (<50ms)
- [x] 5/10/20s alerts work correctly
- [x] Popup shows with LLM description
- [x] Recording saves properly
- [x] Police reports generate
- [x] Mobile access works
- [x] Twilio notifications configured
- [x] Face database backed up
