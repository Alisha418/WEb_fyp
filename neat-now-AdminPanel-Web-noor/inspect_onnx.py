#!/usr/bin/env python
"""
Detailed ONNX model inspection
"""
import onnxruntime as ort
import numpy as np
from PIL import Image

# Load model
print("=== ONNX Model Information ===\n")
ort_session = ort.InferenceSession("neatnow_yolov8_best.onnx", providers=['CPUExecutionProvider'])

# Check inputs
print("INPUTS:")
for input_info in ort_session.get_inputs():
    print(f"  Name: {input_info.name}")
    print(f"  Shape: {input_info.shape}")
    print(f"  Type: {input_info.type}")

# Check outputs
print("\nOUTPUTS:")
for i, output_info in enumerate(ort_session.get_outputs()):
    print(f"  Output {i}:")
    print(f"    Name: {output_info.name}")
    print(f"    Shape: {output_info.shape}")
    print(f"    Type: {output_info.type}")

# Create dummy input and run
test_image = Image.new('RGB', (416, 416), color='red')
image_array = np.array(test_image, dtype=np.float32)
image_array = image_array / 255.0
image_array = np.transpose(image_array, (2, 0, 1))
image_array = np.expand_dims(image_array, axis=0)

input_name = ort_session.get_inputs()[0].name
outputs = ort_session.run(None, {input_name: image_array})

print(f"\nRUNTIME OUTPUTS: {len(outputs)} total outputs")
for i, output in enumerate(outputs):
    output_info = ort_session.get_outputs()[i]
    print(f"  {output_info.name}: {output.shape}")
