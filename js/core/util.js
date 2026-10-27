// Small helpers shared by every part of NetWorker.
"use strict";
const $ = (s, el) => (el || document).querySelector(s);
const $$ = (s, el) => [...(el || document).querySelectorAll(s)];
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const uid = p => (p || "x") + Date.now().toString(36).slice(-4) + Math.random().toString(36).slice(2, 7);
const num = (v, d = 0) => { const n = parseFloat(String(v ?? "").replace(",", ".")); return isFinite(n) ? n : d; };
const clone = o => o === undefined ? undefined : JSON.parse(JSON.stringify(o));
const today = () => new Date().toISOString().slice(0, 10);
const r1 = v => Math.round(v * 10) / 10;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const debounce = (fn, ms) => { let tm; return (...a) => { clearTimeout(tm); tm = setTimeout(() => fn(...a), ms); }; };
const same = (a, b) => String(a ?? "").trim().toLowerCase() === String(b ?? "").trim().toLowerCase();
const isPhone = () => matchMedia("(max-width: 900px)").matches;
const fileSafe = s => String(s || "networker").replace(/[\\/:*?"<>|]+/g, "_").trim() || "networker";
const lines = s => String(s ?? "").split("\n");
const opt = (v, label, cur, attrs = "") => `<option value="${esc(v)}"${String(v) === String(cur ?? "") ? " selected" : ""}${attrs}>${esc(label)}</option>`;
/* ---------- IPv4 ---------- */
const IP = {
  toInt(s){ const m = String(s || "").trim().split("/")[0].split("."); if (m.length !== 4) return null; let v = 0; for (const x of m){ if (!/^\d{1,3}$/.test(x) || +x > 255) return null; v = v * 256 + +x; } return v >>> 0; },
  str(n){ return [n >>> 24, n >>> 16 & 255, n >>> 8 & 255, n & 255].join("."); },
  valid(s){ const t = String(s || "").trim(); if (!t) return false; const [a, p] = t.split("/"); return IP.toInt(a) !== null && (p === undefined || (/^\d+$/.test(p) && +p <= 32)); },
  cidr(s){ const [a, b] = String(s || "").trim().split("/"), ip = IP.toInt(a), p = +b; if (ip === null || !(b !== undefined && /^\d+$/.test(b) && p >= 0 && p <= 32)) return null;
    const mask = p ? (~0 << (32 - p)) >>> 0 : 0, net = (ip & mask) >>> 0, bc = (net | ~mask) >>> 0;
    return {net, bc, p, mask, aligned: net === ip, hosts: p >= 31 ? 2 ** (32 - p) : Math.max(0, 2 ** (32 - p) - 2)}; },
  inside(ip, c){ const v = typeof ip === "number" ? ip : IP.toInt(ip); return v !== null && c && v >= c.net && v <= c.bc; },
  host(s){ return IP.toInt(String(s || "").split("/")[0]); }
};
const MACRE = /^([0-9a-f]{2}[:-]){5}[0-9a-f]{2}$|^[0-9a-f]{4}\.[0-9a-f]{4}\.[0-9a-f]{4}$|^[0-9a-f]{12}$/i;
const macNorm = m => String(m || "").replace(/[^0-9a-f]/gi, "").toLowerCase();
const macValid = m => MACRE.test(String(m || "").trim());
/* ---------- CSV (Excel friendly: ; separator, BOM) ---------- */
function csvText(header, rows){
  const q = v => { const s = String(v ?? ""); return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  return "﻿" + [header, ...rows].map(r => r.map(q).join(";")).join("\r\n");
}
/* ---------- file save / open (desktop bridge or browser) ---------- */
async function saveText(name, data, ext, mime){
  if (window.appBridge && window.appBridge.saveFile){ const p = await window.appBridge.saveFile({name, data, filters:[{name:ext.toUpperCase(), extensions:[ext]}]}); if (p) toast(t("saved")); return; }
  saveBlob(name, new Blob([data], {type:mime || "text/plain"}));
}
async function saveBinary(name, blob, ext){
  if (window.appBridge && window.appBridge.saveBinary){ const b64 = (await blobToDataURL(blob)).split(",")[1]; const p = await window.appBridge.saveBinary({name, base64:b64, filters:[{name:ext.toUpperCase(), extensions:[ext]}]}); if (p) toast(t("saved")); return; }
  saveBlob(name, blob);
}
function saveBlob(name, blob){
  if (matchMedia("(pointer:coarse)").matches && navigator.canShare){ try { const f = new File([blob], name, {type:blob.type}); if (navigator.canShare({files:[f]})){ navigator.share({files:[f], title:name}).catch(() => {}); return; } } catch(e){} }
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
function blobToDataURL(b){ return new Promise(r => { const rd = new FileReader(); rd.onload = () => r(rd.result); rd.readAsDataURL(b); }); }
function dataURLToBlob(u){ const [h, d] = u.split(","), mime = (h.match(/data:([^;]+)/) || [])[1] || "application/octet-stream", bin = atob(d), a = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i); return new Blob([a], {type:mime}); }
function openTextFile(accept){
  return new Promise(res => {
    if (window.appBridge && window.appBridge.openFile){ window.appBridge.openFile({filters:[{name:"JSON", extensions:["json"]}]}).then(f => res(f ? f.data : null)); return; }
    const inp = document.createElement("input"); inp.type = "file"; inp.accept = accept || ".json,application/json";
    inp.onchange = () => { const f = inp.files[0]; if (!f) return res(null); const rd = new FileReader(); rd.onload = () => res(rd.result); rd.readAsText(f); }; inp.click();
  });
}
