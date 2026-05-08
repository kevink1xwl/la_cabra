import os
import glob
from PIL import Image, ImageDraw, ImageFont

def create_sprite_sheet(image_dir, output_file, max_cols=6):
    image_paths = glob.glob(os.path.join(image_dir, '*.png'))
    # Filter only goat frames, ignore environment
    ignored = ['grass', 'flower', 'fruit', 'roca', 'ui_baaa']
    
    goat_images = []
    for p in image_paths:
        filename = os.path.basename(p).lower()
        if not any(ign in filename for ign in ignored):
            goat_images.append(p)
            
    goat_images.sort()
    
    if not goat_images:
        print("No goat images found.")
        return

    images = [Image.open(p).convert("RGBA") for p in goat_images]
    max_w = max(img.width for img in images)
    max_h = max(img.height for img in images)
    
    # Add space for text
    cell_w = max_w
    cell_h = max_h + 30
    
    rows = (len(images) + max_cols - 1) // max_cols
    
    sheet_w = max_cols * cell_w
    sheet_h = rows * cell_h
    
    sheet = Image.new('RGBA', (sheet_w, sheet_h), (255, 255, 255, 255))
    draw = ImageDraw.Draw(sheet)
    
    try:
        font = ImageFont.truetype("arial.ttf", 14)
    except IOError:
        font = ImageFont.load_default()
    
    for i, (path, img) in enumerate(zip(goat_images, images)):
        row = i // max_cols
        col = i % max_cols
        
        x = col * cell_w
        y = row * cell_h
        
        # Draw image
        sheet.paste(img, (x, y), img)
        
        # Draw text
        filename = os.path.basename(path)
        draw.text((x + 5, y + max_h + 5), filename, fill=(0, 0, 0, 255), font=font)
        
    sheet.save(output_file)
    print(f"Saved sprite sheet to {output_file}")

if __name__ == '__main__':
    create_sprite_sheet(r'D:\escritorio\testgemini\la cabra\cabra', r'D:\escritorio\testgemini\la cabra\goat_sprites.png')
