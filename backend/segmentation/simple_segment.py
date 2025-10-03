#!/usr/bin/env python3
"""
Simplified garment segmentation using basic image processing
Fallback when U²-Net dependencies are not available
"""

import sys
import os
import cv2
import numpy as np
import json
import argparse
from PIL import Image
from colorthief import ColorThief
import warnings
warnings.filterwarnings("ignore")

def rgb_to_hex(rgb):
    """Convert RGB tuple to hex string"""
    return "#{:02x}{:02x}{:02x}".format(int(rgb[0]), int(rgb[1]), int(rgb[2]))

def hex_to_rgb(hex_color):
    """Convert hex string to RGB tuple"""
    hex_color = hex_color.lstrip('#')
    return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))

def adjust_brightness(rgb, factor):
    """Adjust brightness of RGB color by factor (0-2, where 1=original)"""
    return tuple(max(0, min(255, int(c * factor))) for c in rgb)

def rgb_to_hsl(r, g, b):
    """Convert RGB to HSL"""
    r, g, b = r/255.0, g/255.0, b/255.0
    max_val = max(r, g, b)
    min_val = min(r, g, b)
    diff = max_val - min_val
    
    # Lightness
    l = (max_val + min_val) / 2
    
    if diff == 0:
        h = s = 0  # achromatic
    else:
        # Saturation
        s = diff / (2 - max_val - min_val) if l > 0.5 else diff / (max_val + min_val)
        
        # Hue
        if max_val == r:
            h = (g - b) / diff + (6 if g < b else 0)
        elif max_val == g:
            h = (b - r) / diff + 2
        else:
            h = (r - g) / diff + 4
        h /= 6
    
    return h, s, l

def hsl_to_rgb(h, s, l):
    """Convert HSL to RGB"""
    def hue_to_rgb(p, q, t):
        if t < 0: t += 1
        if t > 1: t -= 1
        if t < 1/6: return p + (q - p) * 6 * t
        if t < 1/2: return q
        if t < 2/3: return p + (q - p) * (2/3 - t) * 6
        return p
    
    if s == 0:
        r = g = b = l  # achromatic
    else:
        q = l * (1 + s) if l < 0.5 else l + s - l * s
        p = 2 * l - q
        r = hue_to_rgb(p, q, h + 1/3)
        g = hue_to_rgb(p, q, h)
        b = hue_to_rgb(p, q, h - 1/3)
    
    return tuple(int(round(c * 255)) for c in (r, g, b))

def create_extreme_variations(rgb):
    """Create more extreme lighter and darker variations using HSL"""
    h, s, l = rgb_to_hsl(*rgb)
    
    # Create much lighter version (increase lightness significantly)
    lighter_l = min(0.95, l + 0.4)  # Add 40% lightness, cap at 95%
    lighter_rgb = hsl_to_rgb(h, s, lighter_l)
    
    # Create much darker version (decrease lightness significantly)  
    darker_l = max(0.05, l - 0.45)  # Subtract 45% lightness, floor at 5%
    darker_rgb = hsl_to_rgb(h, s, darker_l)
    
    return lighter_rgb, darker_rgb

def get_complementary_color(rgb):
    """Get complementary color on color wheel"""
    return tuple(255 - c for c in rgb)

def extract_color_palette(image_path, mask_path):
    """Extract dominant color and generate palette using ColorThief"""
    try:
        # Read original image and mask
        image = cv2.imread(image_path)
        mask = cv2.imread(mask_path, cv2.IMREAD_GRAYSCALE)
        
        if image is None or mask is None:
            return None
        
        # Convert image to RGB (PIL format)
        image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        
        # Create transparent PNG with masked region
        # Create RGBA image
        height, width = mask.shape
        rgba_image = np.zeros((height, width, 4), dtype=np.uint8)
        
        # Copy RGB channels where mask is present
        mask_indices = mask > 0
        rgba_image[mask_indices, :3] = image_rgb[mask_indices]
        rgba_image[mask_indices, 3] = 255  # Full alpha where mask exists
        # Alpha is 0 (transparent) where mask doesn't exist
        
        # Save masked image with transparency
        masked_pil = Image.fromarray(rgba_image, 'RGBA')
        masked_path = os.path.join(os.path.dirname(mask_path), 'masked_transparent.png')
        masked_pil.save(masked_path)
        
        # Use ColorThief on the transparent masked image
        print(f"🔍 Analyzing colors from: {masked_path}", file=sys.stderr)
        color_thief = ColorThief(masked_path)
        
        # Get dominant color
        dominant_color = color_thief.get_color(quality=1)
        print(f"📊 ColorThief dominant color: RGB{dominant_color}", file=sys.stderr)
        
        # Get color palette (top 5 colors)
        try:
            palette = color_thief.get_palette(color_count=5, quality=1)
            print(f"🎨 ColorThief palette extracted: {len(palette)} colors", file=sys.stderr)
            for i, color in enumerate(palette, 1):
                print(f"     Color {i}: RGB{color}", file=sys.stderr)
        except Exception as e:
            # Fallback if palette extraction fails
            print(f"⚠️  Palette extraction failed: {e}, using dominant color only", file=sys.stderr)
            palette = [dominant_color]
        
        # Generate color variations
        dominant_rgb = dominant_color
        print(f"🧮 Calculating color variations from RGB{dominant_rgb}:", file=sys.stderr)
        
        # 1 & 2. Create extreme lighter and darker variations using HSL
        lighter_rgb, darker_rgb = create_extreme_variations(dominant_rgb)
        print(f"     ☀️  Extreme lighter shade: RGB{lighter_rgb}", file=sys.stderr)
        print(f"     🌙 Extreme darker shade: RGB{darker_rgb}", file=sys.stderr)
        
        # 3. Complementary color
        complementary_rgb = get_complementary_color(dominant_rgb)
        print(f"     🔄 Complementary color: RGB{complementary_rgb}", file=sys.stderr)
        
        # 4. Standard colors
        black_rgb = (0, 0, 0)
        white_rgb = (255, 255, 255)
        print(f"     ⚫ Neutral black: RGB{black_rgb}", file=sys.stderr)
        print(f"     ⚪ Neutral white: RGB{white_rgb}", file=sys.stderr)
        
        # Convert all to hex
        color_analysis = {
            'dominant_color': {
                'rgb': dominant_rgb,
                'hex': rgb_to_hex(dominant_rgb)
            },
            'palette': [
                {
                    'rgb': color,
                    'hex': rgb_to_hex(color)
                } for color in palette
            ],
            'recommended_colors': {
                'lighter_shade': {
                    'rgb': lighter_rgb,
                    'hex': rgb_to_hex(lighter_rgb)
                },
                'darker_shade': {
                    'rgb': darker_rgb,
                    'hex': rgb_to_hex(darker_rgb)
                },
                'complementary': {
                    'rgb': complementary_rgb,
                    'hex': rgb_to_hex(complementary_rgb)
                },
                'neutral_black': {
                    'rgb': black_rgb,
                    'hex': rgb_to_hex(black_rgb)
                },
                'neutral_white': {
                    'rgb': white_rgb,
                    'hex': rgb_to_hex(white_rgb)
                }
            },
            'masked_image_path': masked_path
        }
        
        return color_analysis
        
    except Exception as e:
        print(f"Color extraction error: {e}", file=sys.stderr)
        return None

def simple_segmentation(image_path, output_dir):
    """Simple segmentation using background subtraction and edge detection"""
    try:
        # Read image
        image = cv2.imread(image_path)
        if image is None:
            return {'success': False, 'error': 'Could not read image'}
        
        original_image = image.copy()
        h, w = image.shape[:2]
        
        # Convert to different color spaces for better segmentation
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
        
        # Create mask using multiple techniques
        
        # 1. Edge detection
        edges = cv2.Canny(gray, 50, 150)
        edges = cv2.dilate(edges, np.ones((3,3), np.uint8), iterations=1)
        
        # 2. GrabCut algorithm (simple background/foreground separation)
        mask = np.zeros(gray.shape[:2], np.uint8)
        
        # Create rectangle around center region (assuming garment is centered)
        margin = int(min(w, h) * 0.1)
        rect = (margin, margin, w - 2*margin, h - 2*margin)
        
        bgd_model = np.zeros((1, 65), np.float64)
        fgd_model = np.zeros((1, 65), np.float64)
        
        cv2.grabCut(image, mask, rect, bgd_model, fgd_model, 5, cv2.GC_INIT_WITH_RECT)
        
        # Create binary mask
        mask2 = np.where((mask == 2) | (mask == 0), 0, 1).astype('uint8')
        
        # 3. Color-based segmentation (remove uniform backgrounds)
        # Assume corners are background
        corner_colors = [
            image[0, 0], image[0, -1], 
            image[-1, 0], image[-1, -1]
        ]
        
        # Create mask excluding similar colors to corners
        color_mask = np.ones((h, w), dtype=np.uint8)
        for corner_color in corner_colors:
            diff = np.sum(np.abs(image.astype(np.float32) - corner_color.astype(np.float32)), axis=2)
            color_mask[diff < 30] = 0
        
        # Combine masks
        final_mask = mask2 * color_mask
        
        # Morphological operations to clean up
        kernel = np.ones((5, 5), np.uint8)
        final_mask = cv2.morphologyEx(final_mask, cv2.MORPH_OPEN, kernel)
        final_mask = cv2.morphologyEx(final_mask, cv2.MORPH_CLOSE, kernel)
        
        # Keep largest connected component
        num_labels, labels, stats, _ = cv2.connectedComponentsWithStats(final_mask)
        if num_labels > 1:
            largest_label = 1 + np.argmax(stats[1:, cv2.CC_STAT_AREA])
            final_mask = (labels == largest_label).astype(np.uint8)
        
        # Fill holes
        final_mask = cv2.morphologyEx(final_mask, cv2.MORPH_CLOSE, np.ones((10, 10), np.uint8))
        
        # Extract bounding box
        coords = np.where(final_mask > 0)
        if len(coords[0]) == 0:
            return {'success': False, 'error': 'No garment detected in image'}
        
        y_min, y_max = coords[0].min(), coords[0].max()
        x_min, x_max = coords[1].min(), coords[1].max()
        
        # Add padding
        padding = 20
        y_min = max(0, y_min - padding)
        y_max = min(h, y_max + padding)
        x_min = max(0, x_min - padding)
        x_max = min(w, x_max + padding)
        
        # Extract crop
        crop = original_image[y_min:y_max, x_min:x_max]
        
        bbox = {
            'x_min': int(x_min),
            'y_min': int(y_min),
            'x_max': int(x_max),
            'y_max': int(y_max),
            'width': int(x_max - x_min),
            'height': int(y_max - y_min)
        }
        
        # Save outputs
        os.makedirs(output_dir, exist_ok=True)
        
        # Save mask
        mask_path = os.path.join(output_dir, 'garment_mask.png')
        cv2.imwrite(mask_path, final_mask * 255)
        
        # Save crop
        crop_path = os.path.join(output_dir, 'garment_crop.jpg')
        cv2.imwrite(crop_path, crop)
        
        # Extract colors from the masked region
        print("🎨 Starting color extraction...", file=sys.stderr)
        color_analysis = extract_color_palette(image_path, mask_path)
        
        result = {
            'success': True,
            'mask_path': mask_path,
            'crop_path': crop_path,
            'bbox': bbox,
            'mask_area': int(np.sum(final_mask > 0)),
            'crop_size': {
                'width': crop.shape[1],
                'height': crop.shape[0]
            },
            'method': 'simple_segmentation'
        }
        
        # Add color analysis if successful
        if color_analysis:
            result['color_analysis'] = color_analysis
            
            # Print detailed color information
            print("=" * 60, file=sys.stderr)
            print("🎨 COLOR EXTRACTION RESULTS", file=sys.stderr)
            print("=" * 60, file=sys.stderr)
            
            # Print dominant color
            dom_color = color_analysis['dominant_color']
            print(f"🔥 DOMINANT COLOR:", file=sys.stderr)
            print(f"   RGB: {dom_color['rgb']}", file=sys.stderr)
            print(f"   HEX: {dom_color['hex']}", file=sys.stderr)
            print("", file=sys.stderr)
            
            # Print full color palette
            print(f"🎭 FULL COLOR PALETTE ({len(color_analysis['palette'])} colors):", file=sys.stderr)
            for i, color in enumerate(color_analysis['palette'], 1):
                print(f"   {i}. RGB{color['rgb']} → {color['hex']}", file=sys.stderr)
            print("", file=sys.stderr)
            
            # Print recommended color variations
            print("✨ RECOMMENDED COLOR VARIATIONS:", file=sys.stderr)
            rec_colors = color_analysis['recommended_colors']
            for color_type, color_info in rec_colors.items():
                color_name = color_type.replace('_', ' ').title()
                print(f"   {color_name}: RGB{color_info['rgb']} → {color_info['hex']}", file=sys.stderr)
            
            print("=" * 60, file=sys.stderr)
            
        else:
            print("❌ Color analysis failed", file=sys.stderr)
        
        return result
        
    except Exception as e:
        return {
            'success': False,
            'error': str(e)
        }

def main():
    parser = argparse.ArgumentParser(description='Simple Garment Segmentation with Weather Analysis')
    parser.add_argument('--input', required=True, help='Input image path')
    parser.add_argument('--output', required=True, help='Output directory')
    parser.add_argument('--temperature', type=float, help='Temperature in Celsius for material recommendations')
    parser.add_argument('--category', help='Garment category (top, bottom, footwear, accessory)')
    
    args = parser.parse_args()
    
    # Send debug message to stderr, not stdout
    print("Pre-trained model not found, using random weights (demo mode)", file=sys.stderr)
    
    # Try U²-Net first, fall back to simple method
    try:
        from u2net_segment import segment_garment
        result = segment_garment(args.input, args.output)
        if result['success']:
            result['method'] = 'u2net'
        else:
            result = simple_segmentation(args.input, args.output)
    except ImportError:
        result = simple_segmentation(args.input, args.output)
    except Exception as e:
        print(f"U²-Net failed: {e}, falling back to simple segmentation", file=sys.stderr)
        result = simple_segmentation(args.input, args.output)
    
    # Output only JSON to stdout
    print(json.dumps(result))

if __name__ == '__main__':
    main()