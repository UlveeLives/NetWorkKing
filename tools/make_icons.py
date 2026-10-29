# NetWorkKing — © 2026 Ulvi Badalov. All rights reserved.
# Makes every app icon from one square PNG (at least 1024×1024, transparent background):
#   python3 tools/make_icons.py branding/networkking-logo-2048.png
# → build/icon.png (512), build/icon.ico (16–256), icons/icon-512.png, icons/icon-192.png, icons/apple-touch-icon.png (180)
import sys, os
from PIL import Image
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
src = Image.open(sys.argv[1]).convert("RGBA")
if src.width != src.height or src.width < 1024: sys.exit("need a square PNG of at least 1024×1024")
def save(size, rel): src.resize((size, size), Image.LANCZOS).save(os.path.join(ROOT, rel)); print(rel, size)
save(512, "build/icon.png"); save(512, "icons/icon-512.png"); save(192, "icons/icon-192.png"); save(180, "icons/apple-touch-icon.png")
src.resize((256, 256), Image.LANCZOS).save(os.path.join(ROOT, "build/icon.ico"), sizes=[(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]); print("build/icon.ico")
