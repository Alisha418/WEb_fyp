# AI Waste Detection System - Auto-Start Guide

The AI Detection system now supports automatic startup of both the backend and frontend together.

## Quick Start Methods

Choose **one** of the methods below based on your operating system:

### 🪟 **Windows - Batch Script (Easiest)**
```batch
start-system.bat
```
This creates two separate windows:
- One for the backend (Python Flask server)
- One for the frontend (React dev server)

**Double-click** `start-system.bat` in File Explorer to start both servers.

---

### 🪟 **Windows - PowerShell Script**
```powershell
.\start-system.ps1
```
Run this in PowerShell (with execution policy allowing scripts):
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
.\start-system.ps1
```

---

### ⚡ **Node.js Script (All Platforms)**
```bash
node start-system.js
```
This works on Windows, macOS, and Linux.

---

### 📦 **NPM Scripts (Manual)**
If you prefer to run them separately:

**Terminal 1 - Backend:**
```bash
npm run backend
# or
python backend.py
```

**Terminal 2 - Frontend:**
```bash
npm run dev:frontend
# or
npm run dev:frontend
```

---

## Expected Startup Process

1. **Backend starts first** (Python Flask server)
   - Loads the ML model from `model_ml/best/best.pt`
   - Starts API server on `http://localhost:5000`
   - Look for: `✅ Server running on: http://localhost:5000`

2. **Frontend starts 3 seconds later** (React development server)
   - Starts on `http://localhost:5173` (or next available port)
   - Automatically opens in browser (usually)
   - Frontend can now call backend at `http://localhost:5000/api/detect`

---

## System Endpoints

| Service | URL | Purpose |
|---------|-----|---------|
| **Backend API** | `http://localhost:5000/api/detect` | AI waste detection endpoint |
| **Frontend** | `http://localhost:5173` | React Admin Panel UI |
| **Health Check** | `http://localhost:5000/api/health` | Verify backend is running |

---

## How It Works

### Backend (Flask + PyTorch)
- Accepts image uploads via `/api/detect`
- Runs YOLOv8 model from `model_ml/best/best.pt`
- Returns waste detections with confidence scores
- Supports 9 waste categories:
  - Animal Waste, Construction Waste, Garbage Bag
  - Glass, Metal, Organic, Paper, Plastic, Waste

### Frontend (React)
- Integrated **"🤖 AI Verify"** button in Report Detail modal
- Shows detection results with:
  - Bounding boxes on image
  - Confidence percentages
  - Waste type classification
  - Statistics (total objects, average confidence)

---

## Troubleshooting

### Backend won't start
- ✅ Ensure Python 3.13+ is installed: `python --version`
- ✅ Check if port 5000 is available: `netstat -ano | findstr :5000`
- ✅ Verify model exists: `ls model_ml/best/best.pt`
- ✅ Restart: Kill any existing Python/backend processes

### Frontend won't start
- ✅ Ensure Node.js is installed: `node --version`
- ✅ Run `npm install` if packages are missing
- ✅ Clear node_modules if issues persist: `rm -r node_modules && npm install`
- ✅ Check if port 5173 is available

### AI Detection not working
- ✅ Verify backend is running: `curl http://localhost:5000/api/health`
- ✅ Check browser console (F12) for errors
- ✅ Ensure image is being uploaded correctly
- ✅ Review backend logs for Python errors

### Ports already in use
Backend uses **5000**, frontend uses **5173** by default
- To change: Modify `backend.py` and `vite.config.ts`
- Or kill existing processes using those ports

---

## File Structure

```
neat-now-AdminPanel-Web-noor/
├── start-system.bat          ← Double-click to start (Windows)
├── start-system.ps1          ← Run in PowerShell (Windows)
├── start-system.js           ← Node.js auto-start (All platforms)
├── backend.py                ← Flask API server
├── model_ml/
│   └── best/
│       └── best.pt           ← YOLOv8 waste detection model (390MB)
├── src/
│   ├── services/
│   │   └── aiDetectionServiceSimplified.ts  ← Frontend AI service
│   └── components/
│       ├── ReportDetailModal.tsx            ← Has "AI Verify" button
│       └── DetectionResultsModal.tsx        ← Shows results
└── package.json              ← npm configuration
```

---

## Environment Variables (Optional)

Create `.env` file in project root:
```
VITE_API_URL=http://localhost:5000
PYTHON_ENV=development
```

---

## Performance Notes

- **First startup:** 15-20 seconds (model loading to GPU/CPU)
- **Detection per image:** 2-5 seconds (CPU bound)
- **Confidence threshold:** 0.3 (shows all detections)
- **Max detections:** 100 objects per image
- **Supported formats:** JPG, PNG, GIF, WebP

---

## Next Steps

1. **Run auto-start script** matching your OS
2. **Wait for both servers** to be ready
3. **Open frontend** at `http://localhost:5173`
4. **Click "AI Verify"** on any report to test detection
5. **Check results** with bounding boxes and waste classification

---

## For Developers

### Manual debugging:
```bash
# Terminal 1 - Backend with verbose logging
python backend.py

# Terminal 2 - Frontend
npm run dev:frontend

# Terminal 3 - Test API directly
curl -X POST -F "image=@test.jpg" http://localhost:5000/api/detect
```

### Check model integrity:
```python
from ultralytics import YOLO
model = YOLO("model_ml/best/best.pt")
print(model.names)  # Should show 9 waste categories
```

---

## Support

- Backend logs: Check Python terminal window
- Frontend logs: Open Browser DevTools (F12)
- Model info: `model_ml/fyp-yolo-v8.ipynb`
- Test page: `test_detection.html` (standalone testing)

Enjoy the AI waste detection system! 🎉
