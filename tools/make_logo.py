# NetWorkKing — © 2026 Ulvi Badalov. All rights reserved.
# Logo v2 / v3 generator: neon-green "N" on black in the centre (like cmd "color a"), 8 devices on a web globe around it.
#   python3 tools/make_logo.py  → branding/v2/*.svg
import math, os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "branding", "v2"); os.makedirs(OUT, exist_ok=True)
NEON = "#16ff5a"          # cmd "color a" bright green, a little more neon
# white symbols, drawn in a 48×48 box (stroke 3.6, round)
G = {
 # network basics
 "cloud":   '<path d="M14 33h21a7.5 7.5 0 0 0 .7-15A10 10 0 0 0 16.5 15.6 8.5 8.5 0 0 0 14 33z"/>',
 "router":  '<circle cx="24" cy="24" r="14"/><path d="M24 12v8m-3-5 3-3 3 3M24 36v-8m-3 5 3 3 3-3M12 24h8m-5-3-3 3 3 3M36 24h-8m5-3 3 3-3 3"/>',
 "switch":  '<rect x="8" y="14" width="32" height="20" rx="3"/><path d="M14 21h18m-4-3 4 3-4 3M34 28H16m4-3-4 3 4 3"/>',
 "firewall":'<rect x="8" y="12" width="32" height="24" rx="2"/><path d="M8 20h32M8 28h32M18 12v8M30 12v8M13 20v8M24 20v8M35 20v8M18 28v8M30 28v8"/>',
 "server":  '<rect x="11" y="9" width="26" height="9" rx="2"/><rect x="11" y="20" width="26" height="9" rx="2"/><rect x="11" y="31" width="26" height="9" rx="2"/><path d="M16 13.5h1M16 24.5h1M16 35.5h1"/>',
 "wifi":    '<path d="M9 19a21 21 0 0 1 30 0M14 25a13 13 0 0 1 20 0M19 31a6 6 0 0 1 10 0"/><circle cx="24" cy="36" r="1.8" fill="#fff"/>',
 "pc":      '<rect x="9" y="11" width="30" height="20" rx="2"/><path d="M24 31v6M17 37h14"/>',
 "rj45":    '<path d="M13 12h22v17h-5v5h-4v3h-4v-3h-4v-5h-5z"/><path d="M18 17v5M22 17v5M26 17v5M30 17v5"/>',
 # the 8 apps of NetWorkKing
 "building":'<path d="M13 38V12l11-5 11 5v26M13 38h22"/><path d="M18 16h3M27 16h3M18 22h3M27 22h3M18 28h3M27 28h3M22 38v-5h4v5"/>',
 "topology":'<circle cx="24" cy="12" r="4.5"/><circle cx="12" cy="34" r="4.5"/><circle cx="36" cy="34" r="4.5"/><path d="M22 16l-8 14M26 16l8 14M17 34h14"/>',
 "portmap": '<rect x="8" y="14" width="32" height="20" rx="2"/><path d="M13 19h4v4h-4zM22 19h4v4h-4zM31 19h4v4h-4zM13 26h4v4h-4zM22 26h4v4h-4zM31 26h4v4h-4z"/>',
 "rack":    '<rect x="13" y="7" width="22" height="34" rx="2"/><path d="M17 13h14M17 19h14M17 25h14M17 31h14M17 37h6"/>',
 "fiber":   '<circle cx="24" cy="24" r="14"/><circle cx="24" cy="24" r="3" fill="#fff"/><circle cx="24" cy="15" r="2" fill="#fff"/><circle cx="24" cy="33" r="2" fill="#fff"/><circle cx="15" cy="24" r="2" fill="#fff"/><circle cx="33" cy="24" r="2" fill="#fff"/>',
 "cctv":    '<path d="M9 16l22-5 3 9-22 5z"/><path d="M31 20l7 3M18 24l2 8h-8M12 32v6"/>',
 "wifiplan":'<rect x="8" y="9" width="32" height="30" rx="2"/><path d="M8 25h12v14M28 9v10"/><path d="M27 31a6 6 0 0 1 8 0M29.5 34a2.5 2.5 0 0 1 3 0"/>',
 "summary": '<rect x="11" y="8" width="26" height="33" rx="3"/><path d="M17 8v-1h14v1M17 18h14M17 25h14M17 32h9"/>',
}
SETS = {
 "net":  [("cloud", "#3aa8f0"), ("router", "#2f6fe0"), ("switch", "#14a37f"), ("firewall", "#e24b3b"), ("server", "#6b5bd6"), ("wifi", "#0fb5c9"), ("pc", "#f28c1c"), ("rj45", "#d6409f")],
 "apps": [("building", "#8b5cf6"), ("topology", "#2563eb"), ("portmap", "#10b981"), ("rack", "#64748b"), ("fiber", "#d946ef"), ("cctv", "#ef4444"), ("wifiplan", "#06b6d4"), ("summary", "#f59e0b")],
}
BG = {"dark": {"bg": "#0d1530", "rim": "#2448a8", "globe": "#3b6fe0", "gop": .55, "ring": "#ffffff"},
      "light": {"bg": "#f3f6fb", "rim": "#c3cde3", "globe": "#2448a8", "gop": .45, "ring": "#ffffff"}}
def logo(setname, theme, frame=True, small=False):
    T = BG[theme]; C, R, NR = 256, 168, 46
    if small: R, NR = 172, 50
    s = ['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">',
         '<defs><filter id="glow" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>']
    if frame: s.append(f'<rect x="16" y="16" width="480" height="480" rx="104" fill="{T["bg"]}" stroke="{T["rim"]}" stroke-width="8"/>')
    # web globe: outline, meridians, parallels — the devices sit on it and are linked by it
    g = T["globe"]
    s.append(f'<g fill="none" stroke="{g}" stroke-opacity="{T["gop"]}" stroke-width="6" stroke-linecap="round">'
             f'<circle cx="{C}" cy="{C}" r="{R}"/>'
             f'<ellipse cx="{C}" cy="{C}" rx="{R*.42:.0f}" ry="{R}"/><ellipse cx="{C}" cy="{C}" rx="{R*.78:.0f}" ry="{R}"/>'
             f'<path d="M{C-R} {C}H{C+R}M{C} {C-R}V{C+R}"/>'
             f'<ellipse cx="{C}" cy="{C}" rx="{R}" ry="{R*.42:.0f}"/></g>')
    # centre: black disc, neon green N
    cr, k = (96, 1.45) if small else (70, 1)
    s.append(f'<circle cx="{C}" cy="{C}" r="{cr}" fill="#050806" stroke="{NEON}" stroke-width="{5*k:.0f}" stroke-opacity=".9"/>')
    s.append(f'<g transform="translate({C} {C}) scale({k})"><path d="M-29 31v-62l58 62v-62" fill="none" stroke="{NEON}" stroke-width="17" stroke-linecap="round" stroke-linejoin="round" filter="url(#glow)"/></g>')
    # 8 devices around the globe
    for i, (gl, col) in enumerate(SETS[setname]):
        a = math.radians(-90 + i * 45); x, y = C + R * math.cos(a), C + R * math.sin(a)
        s.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{NR}" fill="{col}" stroke="{T["ring"]}" stroke-width="7"/>')
        if small: continue
        s.append(f'<g transform="translate({x - NR*.82:.1f} {y - NR*.82:.1f}) scale({NR*1.64/48:.3f})" fill="none" stroke="#fff" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round">{G[gl]}</g>')
    s.append('</svg>')
    return "\n".join(s)
for st in SETS:
    for th in BG:
        open(os.path.join(OUT, f"logo-{st}-{th}.svg"), "w").write(logo(st, th))
        open(os.path.join(OUT, f"mark-{st}-{th}.svg"), "w").write(logo(st, th, frame=False))
        open(os.path.join(OUT, f"small-{st}-{th}.svg"), "w").write(logo(st, th, small=True))
print("ok", sorted(os.listdir(OUT)))

# ---------- v3 (chosen): network symbols; spokes from the centre to every device (the splash animates them);
# no background globe — the links between the 8 devices themselves make the globe (ring, meridians, parallels) ----------
OUT3 = os.path.join(ROOT, "branding", "v3"); os.makedirs(OUT3, exist_ok=True)
T3 = {"dark": {"bg": "#0d1530", "rim": "#2448a8", "spoke": "#8fa8f0", "web": "#3f63d8"},
      "light": {"bg": "#f3f6fb", "rim": "#c3cde3", "spoke": "#2448a8", "web": "#7f95d6"}}
def logo3(theme, frame=True, small=False):
    T = T3[theme]; C, R, NR = 256, 168, 46
    if small: R, NR = 172, 50
    P = [(C + R * math.cos(math.radians(-90 + i * 45)), C + R * math.sin(math.radians(-90 + i * 45))) for i in range(8)]
    q = lambda a, b, cx, cy: f'M{P[a][0]:.1f} {P[a][1]:.1f}Q{cx:.1f} {cy:.1f} {P[b][0]:.1f} {P[b][1]:.1f}'
    d = .7071 * R
    web = [  # ring: each device to its neighbours along the outline of the globe
      " ".join(f'M{P[i][0]:.1f} {P[i][1]:.1f}A{R} {R} 0 0 1 {P[(i+1)%8][0]:.1f} {P[(i+1)%8][1]:.1f}' for i in range(8)),
      q(0, 4, C - R * .62, C), q(0, 4, C + R * .62, C),               # meridians: top ↔ bottom
      q(7, 5, C - d + R * .42, C), q(1, 3, C + d - R * .42, C),       # meridians: the side pairs
      q(7, 1, C, C - d + R * .30), q(5, 3, C, C + d + R * .30),       # parallels (bent like a globe seen from a little above)
      q(6, 2, C, C + R * .30)]                                        # equator
    s = ['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">',
         '<defs><filter id="glow" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>']
    if frame: s.append(f'<rect x="16" y="16" width="480" height="480" rx="104" fill="{T["bg"]}" stroke="{T["rim"]}" stroke-width="8"/>')
    s.append(f'<g id="web" fill="none" stroke="{T["web"]}" stroke-width="{9 if small else 7}" stroke-linecap="round">' + "".join(f'<path d="{x}"/>' for x in web) + '</g>')
    s.append(f'<g id="spokes" stroke="{T["spoke"]}" stroke-width="{18 if small else 15}" stroke-linecap="round">' + "".join(f'<path d="M{C} {C}L{x:.1f} {y:.1f}"/>' for x, y in P) + '</g>')
    cr, k = (96, 1.45) if small else (70, 1)
    s.append(f'<circle cx="{C}" cy="{C}" r="{cr}" fill="#050806" stroke="{NEON}" stroke-width="{5*k:.0f}" stroke-opacity=".9"/>')
    s.append(f'<g transform="translate({C} {C}) scale({k})"><path d="M-29 31v-62l58 62v-62" fill="none" stroke="{NEON}" stroke-width="17" stroke-linecap="round" stroke-linejoin="round" filter="url(#glow)"/></g>')
    for i, (gl, col) in enumerate(SETS["net"]):
        x, y = P[i]
        s.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{NR}" fill="{col}" stroke="#ffffff" stroke-width="7"/>')
        if not small: s.append(f'<g transform="translate({x - NR*.82:.1f} {y - NR*.82:.1f}) scale({NR*1.64/48:.3f})" fill="none" stroke="#fff" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round">{G[gl]}</g>')
    s.append('</svg>'); return "\n".join(s)
for th in T3:
    open(os.path.join(OUT3, f"logo-{th}.svg"), "w").write(logo3(th))
    open(os.path.join(OUT3, f"mark-{th}.svg"), "w").write(logo3(th, frame=False))
    open(os.path.join(OUT3, f"small-{th}.svg"), "w").write(logo3(th, small=True))
print("v3", sorted(os.listdir(OUT3)))

# ---------- v4: only the devices' own links. Every device ↔ its neighbours (arcs) and ↔ the centre (spokes) in the colours
# of the first logo; every device ↔ the two devices beside the one opposite it (i ↔ i±3), thin and faintly neon green,
# bent outward a little so they pass the centre disc instead of crossing it ----------
OUT4 = os.path.join(ROOT, "branding", "v4"); os.makedirs(OUT4, exist_ok=True)
T4 = {"dark": {"bg": "#14204f", "rim": "#2448a8"}, "light": {"bg": "#f3f6fb", "rim": "#c3cde3"}}
SPOKE, RING = "#9fb0e6", "#3a4f9e"        # the line colours of the first NetWorkKing logo
def logo4(theme, frame=True, small=False):
    T = T4[theme]; C, R, NR = 256, 168, 46
    if small: R, NR = 172, 50
    A = [math.radians(-90 + i * 45) for i in range(8)]
    P = [(C + R * math.cos(a), C + R * math.sin(a)) for a in A]
    s = ['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">',
         '<defs><filter id="glow" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>']
    if frame: s.append(f'<rect x="16" y="16" width="480" height="480" rx="104" fill="{T["bg"]}" stroke="{T["rim"]}" stroke-width="10"/>')
    # cross links i ↔ i+3 (8 of them: i ↔ i+5 is the same set seen from the other end)
    cross = []
    for i in range(8):
        j = (i + 3) % 8; mx, my = (P[i][0] + P[j][0]) / 2, (P[i][1] + P[j][1]) / 2
        dx, dy = mx - C, my - C; L = math.hypot(dx, dy) or 1; want = 2 * 94 - L     # curve's middle passes ~94 from the centre
        cx, cy = C + dx / L * want, C + dy / L * want
        cross.append(f'M{P[i][0]:.1f} {P[i][1]:.1f}Q{cx:.1f} {cy:.1f} {P[j][0]:.1f} {P[j][1]:.1f}')
    s.append(f'<g id="cross" fill="none" stroke="{NEON}" stroke-opacity="{.28 if theme == "dark" else .24}" stroke-width="{9 if small else 7}" stroke-linecap="round">' + "".join(f'<path d="{x}"/>' for x in cross) + '</g>')
    # neighbours: arcs along the ring
    s.append(f'<g id="ring" fill="none" stroke="{RING}" stroke-width="{14 if small else 12}" stroke-linecap="round">' + "".join(f'<path d="M{P[i][0]:.1f} {P[i][1]:.1f}A{R} {R} 0 0 1 {P[(i+1)%8][0]:.1f} {P[(i+1)%8][1]:.1f}"/>' for i in range(8)) + '</g>')
    # spokes: centre ↔ every device (the splash animates these)
    s.append(f'<g id="spokes" stroke="{SPOKE}" stroke-width="{20 if small else 18}" stroke-linecap="round">' + "".join(f'<path d="M{C} {C}L{x:.1f} {y:.1f}"/>' for x, y in P) + '</g>')
    cr, k = (96, 1.45) if small else (70, 1)
    s.append(f'<circle cx="{C}" cy="{C}" r="{cr}" fill="#050806" stroke="{NEON}" stroke-width="{5*k:.0f}" stroke-opacity=".9"/>')
    s.append(f'<g transform="translate({C} {C}) scale({k})"><path d="M-29 31v-62l58 62v-62" fill="none" stroke="{NEON}" stroke-width="17" stroke-linecap="round" stroke-linejoin="round" filter="url(#glow)"/></g>')
    for i, (gl, col) in enumerate(SETS["net"]):
        x, y = P[i]
        s.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{NR}" fill="{col}" stroke="#ffffff" stroke-width="7"/>')
        if not small: s.append(f'<g transform="translate({x - NR*.82:.1f} {y - NR*.82:.1f}) scale({NR*1.64/48:.3f})" fill="none" stroke="#fff" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round">{G[gl]}</g>')
    s.append('</svg>'); return "\n".join(s)
for th in T4:
    open(os.path.join(OUT4, f"logo-{th}.svg"), "w").write(logo4(th))
    open(os.path.join(OUT4, f"mark-{th}.svg"), "w").write(logo4(th, frame=False))
    open(os.path.join(OUT4, f"small-{th}.svg"), "w").write(logo4(th, small=True))
print("v4", sorted(os.listdir(OUT4)))

# ---------- splash: logo v4 on the title-bar green, frame in the neon of the centre ring; parts carry classes for animation ----------
BAR = "#0d2a1a"
def logo_splash():
    C, R, NR = 256, 168, 46
    A = [math.radians(-90 + i * 45) for i in range(8)]
    P = [(C + R * math.cos(a), C + R * math.sin(a)) for a in A]
    s = ['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" class="lg">',
         '<defs><filter id="glow" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>',
         f'<rect class="frame" x="16" y="16" width="480" height="480" rx="104" fill="{BAR}" stroke="{NEON}" stroke-width="8"/>']
    cross = []
    for i in range(8):
        j = (i + 3) % 8; mx, my = (P[i][0] + P[j][0]) / 2, (P[i][1] + P[j][1]) / 2
        dx, dy = mx - C, my - C; L = math.hypot(dx, dy) or 1; want = 2 * 94 - L
        cross.append(f'M{P[i][0]:.1f} {P[i][1]:.1f}Q{C + dx / L * want:.1f} {C + dy / L * want:.1f} {P[j][0]:.1f} {P[j][1]:.1f}')
    s.append(f'<g class="cross" fill="none" stroke="{NEON}" stroke-opacity=".28" stroke-width="7" stroke-linecap="round">' + "".join(f'<path d="{x}"/>' for x in cross) + '</g>')
    s.append(f'<g class="ring" fill="none" stroke="{RING}" stroke-width="12" stroke-linecap="round">' + "".join(f'<path d="M{P[i][0]:.1f} {P[i][1]:.1f}A{R} {R} 0 0 1 {P[(i+1)%8][0]:.1f} {P[(i+1)%8][1]:.1f}"/>' for i in range(8)) + '</g>')
    s.append(f'<g class="spokes" stroke="{SPOKE}" stroke-width="18" stroke-linecap="round">' + "".join(f'<path d="M{C} {C}L{x:.1f} {y:.1f}"/>' for x, y in P) + '</g>')
    # packets: short neon dashes running out along every spoke
    s.append(f'<g class="pk" stroke="{NEON}" stroke-width="9" stroke-linecap="round" fill="none">' + "".join(f'<path style="--i:{i}" d="M{C} {C}L{x:.1f} {y:.1f}"/>' for i, (x, y) in enumerate(P)) + '</g>')
    s.append(f'<circle class="core" cx="{C}" cy="{C}" r="70" fill="#050806" stroke="{NEON}" stroke-width="5" stroke-opacity=".9"/>')
    s.append(f'<path class="n" d="M227 287v-62l58 62v-62" fill="none" stroke="{NEON}" stroke-width="17" stroke-linecap="round" stroke-linejoin="round" filter="url(#glow)"/>')
    for i, (gl, col) in enumerate(SETS["net"]):
        x, y = P[i]
        s.append(f'<g class="nd" style="--i:{i};transform-origin:{x:.1f}px {y:.1f}px"><circle cx="{x:.1f}" cy="{y:.1f}" r="{NR}" fill="{col}" stroke="#ffffff" stroke-width="7"/>'
                 f'<g transform="translate({x - NR*.82:.1f} {y - NR*.82:.1f}) scale({NR*1.64/48:.3f})" fill="none" stroke="#fff" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round">{G[gl]}</g></g>')
    s.append('</svg>'); return "".join(s)
open(os.path.join(ROOT, "branding", "splash-test", "logo-splash.svg"), "w").write(logo_splash())
print("splash logo ok")
