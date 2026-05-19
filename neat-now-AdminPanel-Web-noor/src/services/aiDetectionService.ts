import * as ort from 'onnxruntime-web';

interface Detection {
  class: string;
  confidence: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

// YOLOv8 class names (you may need to adjust based on your model)
const CLASS_NAMES = [
  'pothole', 'garbage', 'damaged_road', 'debris', 'crack',
  'water_leak', 'fallen_tree', 'street_damage', 'trash', 'litter'
];

let session: ort.InferenceSession | null = null;
let initializationAttempted = false;
let initializationFailed = false;

// Diagnostic function to check model file
export async function diagnosticCheckModelFile(): Promise<string> {
  const modelUrl = '/neatnow_yolov8_best.onnx';
  
  try {
    console.log('🔍 Checking model file at:', modelUrl);
    
    const response = await fetch(modelUrl);
    console.log('📊 Response status:', response.status);
    console.log('📊 Response headers:');
    response.headers.forEach((value, key) => {
      console.log(`   ${key}: ${value}`);
    });
    
    const buffer = await response.arrayBuffer();
    const bytes = new Uint8Array(buffer.slice(0, 100));
    const hexStr = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join(' ');
    const ascii = String.fromCharCode(...Array.from(bytes)).replace(/[^\x20-\x7E]/g, '.');
    
    console.log('📝 First 100 bytes (hex):', hexStr);
    console.log('📝 First 100 bytes (ascii):', ascii);
    
    return `File size: ${(buffer.byteLength / 1024 / 1024).toFixed(2)}MB\nFirst bytes: ${hexStr}`;
  } catch (error: any) {
    console.error('❌ Diagnostic check failed:', error);
    return `Error: ${error.message}`;
  }
}

// Initialize ONNX Runtime session with improved error handling
async function initializeSession() {
  if (session) return;
  if (initializationFailed) {
    throw new Error('ONNX Runtime initialization failed. Please ensure WebAssembly is supported in your browser.');
  }
  if (initializationAttempted) {
    throw new Error('Model initialization is already in progress...');
  }
  
  initializationAttempted = true;
  
  try {
    // Fetch the ONNX model file as a blob
    const modelUrl = '/neatnow_yolov8_best.onnx';
    console.log('📥 Fetching model from:', modelUrl);
    
    const response = await fetch(modelUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch model: ${response.status} ${response.statusText}. Model file not found at ${modelUrl}`);
    }
    
    const contentType = response.headers.get('content-type');
    console.log('📋 Content-Type:', contentType);
    
    const modelBuffer = await response.arrayBuffer();
    console.log(`✅ Model file loaded: ${(modelBuffer.byteLength / 1024 / 1024).toFixed(2)}MB`);
    
    // Verify the model buffer is valid
    if (modelBuffer.byteLength < 100) {
      throw new Error('Model file is too small (possibly corrupted or incomplete)');
    }
    
    // Verify the model buffer header
    const header = new Uint8Array(modelBuffer.slice(0, 4));
    const headerStr = Array.from(header).map(b => b.toString(16).padStart(2, '0')).join(' ');
    console.log('📊 Model header bytes:', headerStr);
    
    // Expected ONNX header is: 08 00 00 00 (little-endian for 8) followed by "ONNX"
    if (header[0] === 0x08 || header[0] === 0x09) {
      console.log('✅ Valid ONNX model header detected');
    } else {
      console.warn('⚠️ Unexpected model header - proceeding with caution');
    }
    
    // Configure and create session
    console.log('🔧 Configuring ONNX Runtime...');
    
    // Use fewer threads for stability
    ort.env.wasm.numThreads = 1;
    
    // Create session from the buffer with proper error handling
    console.log('⚙️ Creating inference session...');
    session = await ort.InferenceSession.create(modelBuffer, {
      executionProviders: ['wasm', 'cpu'],
      graphOptimizationLevel: 'all',
    });
    
    initializationAttempted = false;
    console.log('✅ ONNX Model session initialized successfully');
    console.log('📊 Model input/output info:');
    console.log('   Inputs:', Object.keys(session.inputNames));
    console.log('   Outputs:', Object.keys(session.outputNames));
    
  } catch (error: any) {
    initializationFailed = true;
    initializationAttempted = false;
    console.error('❌ Failed to load ONNX model:', error);
    
    const errorMsg = error.message || String(error);
    
    // Provide helpful error messages
    if (errorMsg.includes('WebAssembly')) {
      throw new Error('WebAssembly is not supported or is disabled in this browser. Please enable WebAssembly or use a modern browser.');
    } else if (errorMsg.includes('404') || errorMsg.includes('not found')) {
      throw new Error('AI model file not found. Make sure the model file is in the public folder.');
    } else if (errorMsg.includes('invalid')) {
      throw new Error('The model file appears to be corrupted or in an invalid format.');
    }
    
    throw new Error('Failed to initialize AI model: ' + errorMsg);
  }
}

// Preprocess image for YOLO
function preprocessImage(imageSrc: string): Promise<{
  data: Float32Array;
  originalWidth: number;
  originalHeight: number;
}> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const inputSize = 640; // YOLOv8 standard input size
      
      canvas.width = inputSize;
      canvas.height = inputSize;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }
      
      // Draw image on canvas (will be letterboxed)
      const scale = Math.min(inputSize / img.width, inputSize / img.height);
      const x = (inputSize - img.width * scale) / 2;
      const y = (inputSize - img.height * scale) / 2;
      
      ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
      
      // Get image data
      const imageData = ctx.getImageData(0, 0, inputSize, inputSize);
      const data = imageData.data;
      
      // Convert to Float32Array and normalize (0-1 range)
      const floatData = new Float32Array(inputSize * inputSize * 3);
      
      for (let i = 0; i < data.length; i += 4) {
        floatData[i / 4 * 3] = data[i] / 255.0; // R
        floatData[i / 4 * 3 + 1] = data[i + 1] / 255.0; // G
        floatData[i / 4 * 3 + 2] = data[i + 2] / 255.0; // B
      }
      
      resolve({
        data: floatData,
        originalWidth: img.width,
        originalHeight: img.height,
      });
    };
    
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = imageSrc;
  });
}

// Post-process YOLO output
function postprocessOutput(
  output: Float32Array,
  originalWidth: number,
  originalHeight: number,
  confidenceThreshold = 0.5
): Detection[] {
  const detections: Detection[] = [];
  const inputSize = 640;
  
  // Parse YOLO output format: [batch_size, 25200, 85]
  // 25200 = (640/32)^2 + (640/16)^2 + (640/8)^2 (multi-scale predictions)
  // 85 = 4 (bbox) + 1 (objectness) + 80 (classes)
  
  const numDetections = Math.min(25200, output.length / 85);
  
  for (let i = 0; i < numDetections; i++) {
    const offset = i * 85;
    
    // Get bounding box coordinates
    const x = output[offset];
    const y = output[offset + 1];
    const w = output[offset + 2];
    const h = output[offset + 3];
    
    // Get objectness score
    const objectness = output[offset + 4];
    
    if (objectness < confidenceThreshold) continue;
    
    // Get class scores
    let maxClassScore = 0;
    let classIdx = 0;
    for (let j = 0; j < CLASS_NAMES.length && j < 80; j++) {
      const score = output[offset + 5 + j];
      if (score > maxClassScore) {
        maxClassScore = score;
        classIdx = j;
      }
    }
    
    const confidence = objectness * maxClassScore;
    if (confidence < confidenceThreshold) continue;
    
    // Convert to image coordinates
    const scale = Math.min(inputSize / originalWidth, inputSize / originalHeight);
    const padX = (inputSize - originalWidth * scale) / 2;
    const padY = (inputSize - originalHeight * scale) / 2;
    
    const x1 = (x - w / 2 - padX) / scale;
    const y1 = (y - h / 2 - padY) / scale;
    const x2 = (x + w / 2 - padX) / scale;
    const y2 = (y + h / 2 - padY) / scale;
    
    // Clamp to image bounds
    const clampedX1 = Math.max(0, Math.min(x1, originalWidth));
    const clampedY1 = Math.max(0, Math.min(y1, originalHeight));
    const clampedX2 = Math.max(0, Math.min(x2, originalWidth));
    const clampedY2 = Math.max(0, Math.min(y2, originalHeight));
    
    if (clampedX2 > clampedX1 && clampedY2 > clampedY1) {
      detections.push({
        class: CLASS_NAMES[Math.min(classIdx, CLASS_NAMES.length - 1)],
        confidence,
        x1: clampedX1,
        y1: clampedY1,
        x2: clampedX2,
        y2: clampedY2,
      });
    }
  }
  
  // Sort by confidence (descending)
  return detections.sort((a, b) => b.confidence - a.confidence);
}

// Draw detections on canvas
export function drawDetectionsOnImage(
  imageSrc: string,
  detections: Detection[]
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }
      
      // Draw original image
      ctx.drawImage(img, 0, 0);
      
      // Draw detections
      detections.forEach((det, index) => {
        const colors = [
          '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
          '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B88B', '#52C1D5'
        ];
        const color = colors[index % colors.length];
        
        const x = det.x1;
        const y = det.y1;
        const w = det.x2 - det.x1;
        const h = det.y2 - det.y1;
        
        // Draw bounding box
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, w, h);
        
        // Draw label background
        const label = `${det.class} ${(det.confidence * 100).toFixed(1)}%`;
        ctx.font = 'bold 12px Arial';
        const textMetrics = ctx.measureText(label);
        const textWidth = textMetrics.width + 8;
        const textHeight = 20;
        
        ctx.fillStyle = color;
        ctx.fillRect(x, y - textHeight, textWidth, textHeight);
        
        // Draw label text
        ctx.fillStyle = '#FFF';
        ctx.fillText(label, x + 4, y - 6);
      });
      
      resolve(canvas.toDataURL());
    };
    
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = imageSrc;
  });
}

// Main detection function
export async function detectObjects(imageSrc: string): Promise<Detection[]> {
  try {
    console.log('🚀 Starting object detection...');
    console.log('🌐 Browser capabilities:');
    console.log('   WebAssembly:', typeof WebAssembly !== 'undefined');
    console.log('   SharedArrayBuffer:', typeof SharedArrayBuffer !== 'undefined');
    
    await initializeSession();
    
    if (!session) {
      throw new Error('Failed to initialize ONNX session');
    }
    
    console.log('📸 Preprocessing image...');
    // Preprocess image
    const { data, originalWidth, originalHeight } = await preprocessImage(imageSrc);
    console.log(`   Image size: ${originalWidth}x${originalHeight}`);
    console.log(`   Tensor shape: [1, 3, 640, 640]`);
    
    // Create input tensor (1, 3, 640, 640)
    const inputTensor = new ort.Tensor('float32', data, [1, 3, 640, 640]);
    
    console.log('🧠 Running inference...');
    // Run inference
    const feeds = { images: inputTensor };
    const results = await session.run(feeds);
    
    console.log('📊 Inference complete. Results:', Object.keys(results));
    
    // Get output (typically named 'output0' or 'output')
    const output = results.output0 || results.output;
    if (!output) {
      console.error('❌ No output found. Available keys:', Object.keys(results));
      throw new Error('Model output not found. Expected "output0" or "output"');
    }
    
    const outputData = output.data as Float32Array;
    
    console.log('📈 Post-processing results...');
    // Post-process
    const detections = postprocessOutput(outputData, originalWidth, originalHeight, 0.5);
    
    console.log(`✅ Detection complete: ${detections.length} objects found`);
    return detections;
  } catch (error: any) {
    console.error('❌ Detection error:', error);
    
    // Include diagnostic information in error
    const diagnostics = await diagnosticCheckModelFile();
    console.error('📋 Diagnostic info:\n', diagnostics);
    
    throw new Error(`AI Detection failed: ${error.message}\n\nDiagnostics: ${diagnostics}`);
  }
}

export { Detection };
