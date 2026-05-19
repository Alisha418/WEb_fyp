import requests
from PIL import Image
import io
import json

# Create a simple test image (solid color)
print("Creating test image...")
img = Image.new('RGB', (640, 640), color=(73, 109, 137))
img_bytes = io.BytesIO()
img.save(img_bytes, format='JPEG')
img_bytes.seek(0)

# Send to backend
print("Sending to backend...")
url = 'http://localhost:5000/api/detect'
files = {'image': ('test.jpg', img_bytes, 'image/jpeg')}

try:
    response = requests.post(url, files=files, timeout=30)
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"Detections: {len(data['detections'])}")
        for i, det in enumerate(data['detections'][:5]):
            print(f"  {i+1}. {det['class']} - Confidence: {det['confidence']:.2f}")
    else:
        print(f"Error: {response.text}")
except Exception as e:
    print(f"Exception: {e}")
