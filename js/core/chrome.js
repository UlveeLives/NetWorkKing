/*! NetWorkKing — © 2026 Ulvi Badalov. Bütün hüquqlar qorunur / All rights reserved. Proprietary — see LICENSE. */
// Window chrome (3.8 beta): the macOS-style red / yellow / green buttons of the desktop app's own title bar, and the faint
// code-themed backgrounds of the title bar (chosen in Settings → General → Appearance).
"use strict";
const WINB = (window.appBridge && window.appBridge.win) || null;      // only in the desktop app
/* ---------- buttons ---------- */
function winLights(){
  if (!WINB) return "";
  const g = {close:'<path d="M3.2 3.2l5.6 5.6M8.8 3.2L3.2 8.8"/>', min:'<path d="M2.6 6h6.8"/>',
    full:document.body.classList.contains("winfull") ? '<path d="M6.6 1.8v3.6h3.6M5.4 10.2V6.6H1.8" fill="none"/>' : '<path d="M3 3h3.8L3 6.8zM9 9H5.2L9 5.2z" stroke="none" fill="currentColor"/>'};
  const b = (k, t) => `<button class="tl tl-${k}" data-win="${k}" title="${esc(t)}" aria-label="${esc(t)}"><svg viewBox="0 0 12 12" width="12" height="12" stroke="currentColor" stroke-width="1.3" stroke-linecap="round">${g[k]}</svg></button>`;
  return `<div class="tlights">${b("close", t("winClose"))}${b("min", t("winMin"))}${b("full", t("winFull"))}</div>`;
}
if (WINB){
  document.documentElement.classList.add("frameless");
  WINB.onState(s => { const c = document.documentElement.classList; c.toggle("winblur", !s.focused); const was = c.contains("winfull"); c.toggle("winfull", !!s.full); if (was !== !!s.full && typeof renderHeader === "function") renderHeader(); });
  document.addEventListener("click", e => { const b = e.target.closest("[data-win]"); if (!b) return; e.stopPropagation();
    const k = b.dataset.win; WINB.act(k, {fx:!(store && store.settings && store.settings.winFx === false)}); }, true);
  // double-click on an empty part of the title bar maximises / restores — Windows does that itself for the drag area
}
/* ---------- title bar backgrounds ---------- */
// small seeded random so every variant always looks the same
function rnd(seed){ let s = seed >>> 0; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; }
const tbEsc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
function tbSvg(w, h, body){ return `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">${body}</svg>`)}")`; }
const MONO = `font-family="JetBrains Mono,Consolas,monospace"`;
const TB_STYLES = {
  none:{name:"tbNone", css:() => "none"},
  binary:{name:"tbBinary", css:() => { const r = rnd(7); let b = "";
    for (let c = 0; c < 46; c++){ const x = c * 13 + 4; let y = -(r() * 14); for (let i = 0; i < 6; i++){ y += 11; b += `<text x="${x}" y="${y.toFixed(1)}" fill-opacity="${(.06 + r() * .1).toFixed(2)}">${r() > .5 ? 1 : 0}</text>`; } }
    return tbSvg(600, 58, `<g fill="#fff" ${MONO} font-size="10">${b}</g>`); }},
  code:{name:"tbCode", css:() => { const L = ["const sw = rack.add('SW-01', {ports:48});", "for (const p of sw.ports) if (p.vlan === 20) link(p, pp[p.n]);", "interface GigabitEthernet1/0/24", " switchport access vlan 20", "function route(a, b){ return a.ip & mask; }",
      "if (!cam.nvr) warn('NVR yoxdur');", "ping 10.0.20.1 -n 4", "show vlan brief", "</> {...} => ;"]; const r = rnd(3); let b = "";
    for (let i = 0; i < 5; i++){ let x = -r() * 120; const y = 11 + i * 11; while (x < 900){ const s = L[Math.floor(r() * L.length)]; b += `<text x="${x.toFixed(0)}" y="${y}" fill-opacity="${(.07 + r() * .07).toFixed(2)}">${tbEsc(s)}</text>`; x += s.length * 6.1 + 26; } }
    return tbSvg(900, 58, `<g fill="#c8f5d8" ${MONO} font-size="10">${b}</g>`); }},
  hex:{name:"tbHex", css:() => { const r = rnd(11), H = "0123456789ABCDEF"; let b = "";
    for (let i = 0; i < 5; i++){ let line = (i * 16).toString(16).padStart(8, "0") + "  "; for (let j = 0; j < 48; j++) line += H[Math.floor(r() * 16)] + H[Math.floor(r() * 16)] + (j % 8 === 7 ? "  " : " ");
      b += `<text x="6" y="${11 + i * 11}" fill-opacity="${(.07 + (i % 2) * .04).toFixed(2)}">${line}</text>`; }
    return tbSvg(1240, 58, `<g fill="#fff" ${MONO} font-size="10">${b}</g>`); }},
  circuit:{name:"tbCircuit", css:() => { const r = rnd(5); let b = "";
    for (let i = 0; i < 26; i++){ let x = r() * 640, y = 4 + Math.floor(r() * 6) * 9; let d = `M${x.toFixed(0)} ${y}`; const n = 2 + Math.floor(r() * 3);
      for (let k = 0; k < n; k++){ if (k % 2 === 0){ x += 20 + r() * 60; d += `H${x.toFixed(0)}`; } else { const ny = Math.max(4, Math.min(52, y + (r() > .5 ? 9 : -9) * (1 + Math.floor(r() * 2)))); x += Math.abs(ny - y); d += `L${x.toFixed(0)} ${ny}`; y = ny; } }
      b += `<path d="${d}"/><circle cx="${x.toFixed(0)}" cy="${y}" r="2.2" fill="#8fe0b0" fill-opacity=".2"/>`; }
    return tbSvg(700, 58, `<g fill="none" stroke="#8fe0b0" stroke-opacity=".16" stroke-width="1.2">${b}</g>`); }},
  packets:{name:"tbPackets", css:() => { const r = rnd(9), ip = () => `10.0.${Math.floor(r() * 40)}.${1 + Math.floor(r() * 250)}`, P = ["TCP 443", "UDP 53", "TCP 554 RTSP", "ICMP echo", "TCP 22", "UDP 5060 SIP", "TCP 8000"]; let b = "";
    for (let i = 0; i < 5; i++){ let x = -r() * 200; const y = 11 + i * 11; while (x < 1000){ const s = `${ip()} → ${ip()}  ${P[Math.floor(r() * P.length)]}`; b += `<text x="${x.toFixed(0)}" y="${y}" fill-opacity="${(.06 + r() * .07).toFixed(2)}">${tbEsc(s)}</text>`; x += s.length * 6.1 + 34; } }
    return tbSvg(1000, 58, `<g fill="#bfffe0" ${MONO} font-size="10">${b}</g>`); }},
  terminal:{name:"tbTerminal", css:() => { const L = ["$ nmap -sn 10.0.20.0/24", "Host is up (0.0012s latency).", "$ ssh admin@fortigate", "FGT # get system status", "64 bytes from 10.0.0.1: icmp_seq=1 ttl=64 time=0.9 ms", "$ show interfaces status", "Gi1/0/1  connected  20  a-full a-1000", "$ arp -a"]; const r = rnd(13); let b = "";
    for (let i = 0; i < 5; i++){ let x = -r() * 80; const y = 11 + i * 11; while (x < 1000){ const s = L[Math.floor(r() * L.length)]; b += `<text x="${x.toFixed(0)}" y="${y}" fill-opacity="${(.07 + r() * .08).toFixed(2)}">${tbEsc(s)}</text>`; x += s.length * 6.1 + 30; } }
    return tbSvg(1000, 58, `<g fill="#7dffa8" ${MONO} font-size="10">${b}</g>`); }}
};
const tbCache = {};
const tbCss = k => (tbCache[k] = tbCache[k] || (TB_STYLES[k] || TB_STYLES.none).css());
function applyTitleBg(){ const k = (store && store.settings && store.settings.tbStyle) || "code"; document.documentElement.style.setProperty("--hdrbg", tbCss(k)); }
// the picker in Settings → General → Appearance
function tbPicker(cur){ return `<div class="tbpick">${Object.keys(TB_STYLES).map(k => `<label class="tbopt${k === cur ? " on" : ""}"><input type="radio" name="s-tb" value="${k}"${k === cur ? " checked" : ""}><span class="tbprev" style="background-image:${tbCss(k).replace(/"/g, "'")}"><b>NetWorkKing</b></span><small>${esc(t(TB_STYLES[k].name))}</small></label>`).join("")}</div>`; }
document.addEventListener("change", e => { if (e.target.name !== "s-tb") return; store.settings.tbStyle = e.target.value; $$(".tbopt").forEach(x => x.classList.toggle("on", x.querySelector("input").checked)); applyTitleBg(); persist(); });
