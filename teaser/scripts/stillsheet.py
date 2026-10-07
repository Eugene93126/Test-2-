"""Lay the style frames out on one review sheet: python3 scripts/stillsheet.py"""
from PIL import Image, ImageDraw, ImageFont
import os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
order = [('C0', 'Prompt'), ('S1', 'Archive'), ('S2', 'Three spheres'), ('S3', 'Bodies'),
         ('S4a', 'Glass'), ('S4b', 'Seal'), ('S5', 'CrossBody-12'), ('S6', 'Convergence'), ('S7', 'Reveal')]
d = os.path.join(ROOT, 'out', 'stills')
W, cols, gap, label = 640, 3, 14, 34
ims = [(k, n, Image.open(os.path.join(d, f'{k}.png')).convert('RGB')) for k, n in order if os.path.exists(os.path.join(d, f'{k}.png'))]
h = round(W * 1080 / 1920)
rows = (len(ims) + cols - 1) // cols
sheet = Image.new('RGB', (cols * W + (cols + 1) * gap, rows * (h + label) + (rows + 1) * gap), (11, 14, 18))
font = ImageFont.truetype(os.path.join(ROOT, 'public', 'fonts', 'JetBrainsMono.ttf'), 15)
g = ImageDraw.Draw(sheet)
for i, (k, n, im) in enumerate(ims):
    r, c = divmod(i, cols)
    x, y = gap + c * (W + gap), gap + r * (h + label + gap)
    sheet.paste(im.resize((W, h), Image.LANCZOS), (x, y))
    g.text((x, y + h + 9), f'{k}  {n}', fill=(150, 162, 170), font=font)
out = os.path.join(ROOT, 'out', 'style_frames.jpg')
sheet.save(out, quality=90)
print(out)
