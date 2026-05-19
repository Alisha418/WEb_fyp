#!/usr/bin/env python
"""
Test script to understand ONNX model output format
"""
import onnxruntime as ort
import numpy as np
from PIL import Image
import io

# Load model
print("Loading model...")
ort_session = ort.InferenceSession("neatnow_yolov8_best.onnx", providers=['CPUExecutionProvider'])

# Create a dummy image for testing
print("Creating test image...")
test_image = Image.new('RGB', (416, 416), color='red')

# Preprocess
image_array = np.array(test_image, dtype=np.float32)
image_array = image_array / 255.0
image_array = np.transpose(image_array, (2, 0, 1))
image_array = np.expand_dims(image_array, axis=0)

print(f"Input shape: {image_array.shape}")

# Run inference
input_name = ort_session.get_inputs()[0].name
print(f"Input name: {input_name}")

outputs = ort_session.run(None, {input_name: image_array})

print(f"\nNumber of outputs: {len(outputs)}")
for i, output in enumerate(outputs):
    print(f"Output {i}: shape={output.shape}, dtype={output.dtype}")
    print(f"  Sample values: {output.flat[:20]}")

# Try to understand the format
if len(outputs) > 0:
    output = outputs[0]
    print(f"\nAnalyzing main output shape: {output.shape}")
    
    # If shape is (1, 13, 3549), let's see what's in it
    if output.shape[1] == 13 and output.shape[2] == 3549:
        print("\nOutput appears to be per-object predictions!")
        print("Each of 13 objects has 3549 values (likely flattened feature maps)")
        
        # Try to find confidence scores
        batch = output[0]
        for obj_idx in range(13):
            obj_data = batch[obj_idx]
            print(f"\nObject {obj_idx}:")
            print(f"  Min: {np.min(obj_data):.4f}, Max: {np.max(obj_data):.4f}")
            print(f"  Mean: {np.mean(obj_data):.4f}")
            print(f"  First 10 values: {obj_data[:10]}")
            print(f"  Last 10 values: {obj_data[-10:]}")
