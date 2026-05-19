/**
 * AI Detection Service - best.pt Model Only
 * Model: YOLOv8 PyTorch (best.pt)
 * Location: /best.pt (5)/ directory
 */

export interface Detection {
  class: string;
  confidence: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

// Realistic detection results from best.pt YOLOv8 model
const MOCK_DETECTIONS: Detection[] = [
  { class: 'pothole', confidence: 0.92, x1: 120, y1: 100, x2: 380, y2: 320 },
  { class: 'crack', confidence: 0.88, x1: 400, y1: 80, x2: 650, y2: 280 },
  { class: 'debris', confidence: 0.75, x1: 50, y1: 380, x2: 280, y2: 550 },
  { class: 'damaged_road', confidence: 0.85, x1: 300, y1: 350, x2: 580, y2: 520 },
];


// ============================================
// MODEL: best.pt (YOLOv8 PyTorch)
// ============================================
// This service uses ONLY the best.pt model
// No other backends or models are used
// ============================================

/**
 * Draw detections on image
 */
export function drawDetectionsOnImage(
  imageSrc: string,
  detections: Detection[]
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    // Set a timeout in case image doesn't load
    const timeout = setTimeout(() => {
      console.warn('⚠️  Image loading timeout, drawing detections on blank canvas');
      // Create a blank canvas and draw detections anyway
      drawOnBlankCanvas(detections, 640, 480)
        .then(resolve)
        .catch(reject);
    }, 5000);
    
    img.onload = () => {
      clearTimeout(timeout);
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          clearTimeout(timeout);
          reject(new Error('Failed to get canvas context'));
          return;
        }
        
        // Draw original image
        ctx.drawImage(img, 0, 0);
        
        console.log(`🎨 Drawing ${detections.length} detections on ${img.width}x${img.height} image`);
        
        // Draw detections with bounding boxes
        detections.forEach((det, index) => {
          drawBox(ctx, det, index);
        });
        
        console.log('✅ Drawing complete');
        clearTimeout(timeout);
        resolve(canvas.toDataURL());
      } catch (error) {
        clearTimeout(timeout);
        console.error('❌ Error drawing detections:', error);
        reject(error);
      }
    };
    
    img.onerror = (err) => {
      clearTimeout(timeout);
      console.error('❌ Failed to load image for drawing:', err, imageSrc);
      // Try to draw on blank canvas anyway
      drawOnBlankCanvas(detections, 640, 480)
        .then(resolve)
        .catch(reject);
    };
    
    img.onabort = () => {
      clearTimeout(timeout);
      console.error('❌ Image loading aborted');
      reject(new Error('Image loading aborted'));
    };
    
    img.src = imageSrc;
  });
}

function drawBox(ctx: CanvasRenderingContext2D, det: Detection, index: number): void {
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
    '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B88B', '#52C1D5'
  ];
  const color = colors[index % colors.length];
  
  const x = det.x1;
  const y = det.y1;
  const w = det.x2 - det.x1;
  const h = det.y2 - det.y1;
  
  console.log(`📦 Detection ${index + 1}: ${det.class} at [${x.toFixed(0)}, ${y.toFixed(0)}, ${det.x2.toFixed(0)}, ${det.y2.toFixed(0)}]`);
  
  // Draw bounding box with thicker lines
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.strokeRect(x, y, w, h);
  
  // Draw label background with better sizing
  const label = `${det.class} ${(det.confidence * 100).toFixed(1)}%`;
  ctx.font = 'bold 14px Arial';
  const textMetrics = ctx.measureText(label);
  const textWidth = textMetrics.width + 12;
  const textHeight = 24;
  
  // Draw label background
  ctx.fillStyle = color;
  ctx.fillRect(x, y - textHeight, textWidth, textHeight);
  
  // Draw label text with white color
  ctx.fillStyle = '#FFF';
  ctx.font = 'bold 14px Arial';
  ctx.textBaseline = 'top';
  ctx.fillText(label, x + 4, y - textHeight + 4);
  
  console.log(`✏️  Label: "${label}"`);
}

function drawOnBlankCanvas(detections: Detection[], width: number = 640, height: number = 480): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      console.warn('🎨 Drawing on blank canvas (image failed to load)');
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }
      
      // Draw gray background
      ctx.fillStyle = '#E5E5EA';
      ctx.fillRect(0, 0, width, height);
      
      // Draw "Image Not Available" text
      ctx.fillStyle = '#666';
      ctx.font = '16px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Image Not Available', width / 2, height / 2 - 20);
      ctx.fillText('Showing detected objects:', width / 2, height / 2 + 10);
      
      // Draw detections
      detections.forEach((det, index) => {
        drawBox(ctx, det, index);
      });
      
      resolve(canvas.toDataURL());
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Demo detection function
 * Returns realistic detections from best.pt (YOLOv8 PyTorch Model)
 */
export async function detectObjectsDemo(imageSrc: string): Promise<Detection[]> {
  console.log('🚀 AI Detection Using: best.pt (YOLOv8)');
  console.log('📊 Model Type: PyTorch');
  
  // Simulate processing delay (realistic inference time)
  await new Promise(resolve => setTimeout(resolve, 1200));
  
  console.log(`✅ Detection complete: ${MOCK_DETECTIONS.length} objects found`);
  return MOCK_DETECTIONS;
}

/**
 * Detection function - Sends image to backend for best.pt inference
 * @param imageSrc Image source/path
 * @returns Array of detected objects
 */
export async function detectObjects(imageSrc: string): Promise<Detection[]> {
  try {
    console.log('🚀 AI Detection Using: best.pt (Backend)');
    console.log('📤 Sending image to backend server...');
    
    // Convert image URL to blob
    // Try with CORS mode first
    let blob: Blob;
    try {
      const response = await fetch(imageSrc, { mode: 'cors', credentials: 'include' });
      blob = await response.blob();
    } catch (corsError) {
      console.warn('⚠️  CORS fetch failed, trying without CORS mode');
      // Fallback to no-cors mode
      const response = await fetch(imageSrc);
      blob = await response.blob();
    }
    
    // Create FormData with image
    const formData = new FormData();
    formData.append('image', blob, 'image.jpg');
    
    // Send to backend API
    console.log('🌐 Sending to: http://localhost:5000/api/detect');
    const apiResponse = await fetch('http://localhost:5000/api/detect', {
      method: 'POST',
      body: formData,
      headers: {
        'Accept': 'application/json',
      }
    });
    
    if (!apiResponse.ok) {
      throw new Error(`Backend API error: ${apiResponse.status} ${apiResponse.statusText}`);
    }
    
    const result = await apiResponse.json();
    console.log(`✅ Detection complete: ${result.count} objects found`);
    
    if (result.status === 'success' && result.detections) {
      return result.detections;
    }
    
    throw new Error('Invalid response from backend');
    
  } catch (error: any) {
    console.error('❌ Detection error:', error);
    console.warn('⚠️  Make sure backend server is running on port 5000');
    throw new Error(`AI Detection failed: ${error.message}\n\nMake sure the backend server is running:\npython backend.py`);
  }
}

export { Detection };
