# Aeternum Hub GPU

> A state-of-the-art, GPU-accelerated real-time security system featuring face recognition, object detection, and AI-powered threat analysis.

![Python](https://img.shields.io/badge/Python-3.10-blue?style=flat-square&logo=python)
![Next.js](https://img.shields.io/badge/Next.js-14.1-black?style=flat-square&logo=next.js)
![PyTorch](https://img.shields.io/badge/PyTorch-2.1-EE4C2C?style=flat-square&logo=pytorch)
![License](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)
![Status](https://img.shields.io/badge/Status-Active-green?style=flat-square)

---

## Overview

Aeternum Hub GPU is a high-performance security ecosystem designed for real-time monitoring and automated threat intelligence. It solves the problem of passive surveillance by actively identifying individuals, detecting weapons or suspicious objects, and generating comprehensive AI-driven incident reports.

By leveraging NVIDIA GPU acceleration (TensorRT/CUDA), the system achieves sub-100ms detection latency, making it suitable for high-security environments where instant response is critical. It combines traditional computer vision with modern vision-language models (LLMs) to provide human-like descriptions of events.

Whether used for residential security or commercial monitoring, Aeternum Hub provides a premium, interactive dashboard that puts advanced AI surveillance at your fingertips.

---

## Features

- **Real-time Threat Detection**: Process video at 30 FPS with YOLO11 optimization for zero-lag detection.
- **Advanced Face Recognition**: Uses ArcFace to identify authorized personnel vs. unknown intruders in under 300ms.
- **LLM-Powered Analysis**: Integrates Moondream2 to provide natural language descriptions of detected individuals.
- **Smart Alerting System**: Multi-stage escalation logic (Warning → Critical → Panic) with automated Twilio SMS and voice calls.
- **Automated Police Reports**: Generates formal incident reports in Singapore Police Force format automatically.
- **Evidence Vault**: Securely records and stores high-definition video evidence of all detected threats.
- **GPU Optimization**: Fully utilizes NVIDIA TensorRT for maximum inference performance and efficiency.

---

## Architecture

```
┌─────────────┐      ┌──────────────┐      ┌─────────────┐
│   Camera    │      │    Redis     │      │   AI Core   │
│   Worker    │─────▶│   Pub/Sub    │◀─────│    (GPU)    │
│ (CV2 Input) │      │  (Data Bus)  │      │ (YOLO/Arc)  │
└─────────────┘      └──────┬───────┘      └─────────────┘
                            │
                            ▼
                     ┌───────────────┐
                     │    FastAPI    │
                     │  (Backend API)│
                     └──────┬────────┘
                            │
                            ▼
                     ┌───────────────┐
                     │    Next.js    │
                     │  (Frontend UI)│
                     └───────────────┘
```

1. **Camera Worker**: Captures raw video streams and pushes frames to Redis for high-speed access.
2. **AI Core**: Performs GPU-accelerated inference for detection, recognition, and analysis.
3. **Redis Pub/Sub**: Acts as the central nervous system, handling all real-time events and data flow.
4. **FastAPI**: Provides a robust REST and WebSocket API for the frontend and external integrations.
5. **Next.js UI**: A responsive, interactive dashboard for live monitoring and system control.

---

## Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Frontend** | Next.js 14 | Modern React framework for the interactive dashboard. |
| **Styling** | Tailwind CSS | Utility-first CSS for a premium and responsive UI. |
| **Backend API** | FastAPI | High-performance async Python backend. |
| **Real-time Bus** | Redis | Ultra-low latency communication and frame buffering. |
| **Deep Learning** | PyTorch | Core framework for AI model execution. |
| **Object Detection** | YOLO11 | Real-time human and object detection (Optimized). |
| **Face Recognition** | InsightFace/ArcFace | High-precision facial identification. |
| **LLM Vision** | Moondream2 | Vision-language transitions for event description. |

---

## Project Structure

Aeternum-Hub-GPU/
├── backend/
│   ├── data/            # Local storage for databases and logs
│   ├── evidence/        # Recorded video evidence (.webm)
│   ├── models/          # AI model weights and engines
│   ├── ai_worker.py     # Core AI processing loop
│   ├── main.py          # FastAPI application entry point
│   ├── notifications.py # Twilio and alert logic
│   └── llm_analyzer.py  # LLM vision integration
├── frontend/
│   ├── app/             # Next.js App Router pages
│   ├── components/      # UI components and dashboards
│   └── tailwind.config.ts # Styling configuration
├── requirements.txt     # Python dependencies
├── startup_gpu.bat      # Windows boot script for GPU mode
└── README.md            # You are here

---

## Prerequisites

- **Hardware**: NVIDIA GPU (RTX 3050 6GB minimum recommended)
- **OS**: Windows 10/11 (CUDA 12.1+ support)
- **Software**:
  - Python 3.10+
  - Node.js 18+
  - Redis Server (Running on port 6379)
- **Accounts**:
  - Twilio Account (for SMS/Call alerts)

---

## Installation

### 1. Clone the repository
```bash
git clone https://github.com/Subrahmanyeswar/aeternum-hub.git
cd aeternum-hub
```

### 2. Set up environment
**Python Backend**:
```bash
python -m venv venv_gpu
.\venv_gpu\Scripts\activate
pip install -r requirements.txt
```

**Frontend**:
```bash
cd frontend
npm install
cd ..
```

### 3. Configure environment variables
```bash
cp .env.example .env
```
| Variable | Description | Where to get |
|---|---|---|
| `TWILIO_SID` | Account SID | [Twilio Console](https://twilio.com/console) |
| `TWILIO_TOKEN` | Auth Token | [Twilio Console](https://twilio.com/console) |
| `FROM_NUMBER` | Twilio Phone | [Twilio Console](https://twilio.com/console) |
| `TO_NUMBER` | Your Phone | Your personal mobile number |

### 4. Run the project
**Option A: One-click (Windows)**
```bash
.\startup_gpu.bat
```

**Option B: Manual Start**
```bash
# Terminal 1: Backend
uvicorn backend.main:app --reload

# Terminal 2: AI Worker
python backend/ai_worker.py

# Terminal 3: Frontend
cd frontend
npm run dev
```

---

## Usage

### ARMing the System
1. Open the Dashboard at `http://localhost:3000`.
2. Toggle the **ARM** switch. The system will now begin active monitoring.
3. If an unknown person is detected for >10s, a **Critical Alert** is triggered.

### Tracking and Authorization
- The **Live Feed** shows real-time bounding boxes and names.
- Click **TRUST** on a detected face to add them to the authorized database.

---

## Configuration

Settings can be adjusted in `backend/main.py` and `backend/notifications.py`:
- `alert_cooldown`: Seconds between recurring calls/SMS.
- `EVIDENCE_DIR`: Path to save recorded videos.

---

## How It Works

1. **Ingestion**: The Camera Worker captures frames and stores them in Redis.
2. **Inference**: The AI Worker pulls frames, runs YOLO11 for detection, and ArcFace for recognition.
3. **Escalation**: If an unknown person persists, a timer starts. At 10s, an SMS is sent. At 20s, a call is initiated and recording begins.
4. **Analysis**: Once an incident is recorded, the LLM Analyzer processes the keyframes to generate a detailed textual description of the intruder.
5. **Logging**: All events and analysis are stored in SQLite and displayed on the Frontend via WebSockets.

---

## Contributing

1. Fork the Project.
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`).
3. Commit your Changes (`git commit -m 'Add AmazingFeature'`).
4. Push to the Branch (`git push origin feature/AmazingFeature`).
5. Open a Pull Request.

---

## License

Distributed under the MIT License. See `LICENSE` for more information.

---

## Author

**Subrahmanyeswar**
GitHub: [@Subrahmanyeswar](https://github.com/Subrahmanyeswar)
