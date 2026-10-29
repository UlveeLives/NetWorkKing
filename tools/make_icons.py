# NetWorkKing — © 2026 Ulvi Badalov. All rights reserved.
# Every app icon from the logo renders (1024 px PNG, transparent): full logo for ≥ 48 px, the simplified one for ≤ 32 px.
#   python3 tools/make_icons.py DIR   (DIR has full-dark.png, small-dark.png, full-light.png, small-light.png)
# → build/icon.ico (dark: installer, .exe, shortcuts), build/icon.png, build/icon-dark.png, build/icon-light.png (window /
#   taskbar icon chosen by the theme), icons/icon-192.png, icons/icon-512.png, icons/apple-touch-icon.png (PWA, dark),
#   icons/fav-dark.png, icons/fav-light.png (page icon by theme), icons/logo-dark.png, icons/logo-light.png (wizard)
import sys, os, io, struct
from PIL import Image
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); D = sys.argv[1]
img = {k: Image.open(os.path.join(D, k + ".png")).convert("RGBA") for k in ("full-dark", "small-dark", "full-light", "small-light")}
def pic(th, n): return img[("small-" if n <= 32 else "full-") + th].resize((n, n), Image.LANCZOS)
def save(im, rel): im.save(os.path.join(ROOT, rel)); print(rel, im.size[0])
def ico(th, rel):   # ICO with PNG entries, each size drawn from the right variant
    sizes = [16, 24, 32, 48, 64, 128, 256]; blobs = []
    for n in sizes: b = io.BytesIO(); pic(th, n).save(b, "PNG"); blobs.append(b.getvalue())
    out = struct.pack("<HHH", 0, 1, len(sizes)); off = 6 + 16 * len(sizes)
    for n, bl in zip(sizes, blobs): out += struct.pack("<BBBBHHII", n % 256, n % 256, 0, 0, 1, 32, len(bl), off); off += len(bl)
    open(os.path.join(ROOT, rel), "wb").write(out + b"".join(blobs)); print(rel, sizes)
ico("dark", "build/icon.ico")
save(pic("dark", 512), "build/icon.png"); save(pic("dark", 256), "build/icon-dark.png"); save(pic("light", 256), "build/icon-light.png")
save(pic("dark", 512), "icons/icon-512.png"); save(pic("dark", 192), "icons/icon-192.png"); save(pic("dark", 180), "icons/apple-touch-icon.png")
save(pic("dark", 32), "icons/fav-dark.png"); save(pic("light", 32), "icons/fav-light.png")
save(pic("dark", 256), "icons/logo-dark.png"); save(pic("light", 256), "icons/logo-light.png")
