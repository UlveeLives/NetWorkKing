/*! NetWorkKing — © 2026 Ulvi Badalov. Bütün hüquqlar qorunur / All rights reserved. Proprietary — see LICENSE. */
// Guided tours (balloons with "Got it" / "Done") shown when a page opens, and the written user guide in Settings.
"use strict";
const tourSeen = new Set();   // pages already shown in this session
let tourSkipped = false;      // "Skip" pressed: no more automatic tours until the app is opened again
const pageId = () => UI.app + "." + curTab().id;
// raised when balloons are added: pages switched off with «Don't show again» show their (new) balloons once more
const TOUR_REV = 2;
function tourRev(){ const h = store.settings.help; if ((h.rev || 1) < TOUR_REV){ h.off = {}; h.rev = TOUR_REV; persist(); } }
// one balloon: tip(selector, key) → title from key + "T", text from key
const tip = (sel, k) => ({sel, title:t(k + "T"), text:t(k)});
// balloons every app uses
const TIPS = {
  warn:() => tip("details.warns", "tp_warn"), places:() => tip('[data-act="places"]', "tp_places"), link:() => tip('[data-act="link"]', "tp_link"),
  help:() => tip('[data-h="help"]', "tp_help"), labels:() => tip('[data-act="labels"]', "tp_labels")
};
/* ---------- side-panel balloons ----------
   The first time a kind of side panel opens (a fibre cable, a port, a camera, any device…) its own balloons are shown.
   An app lists them in panelTours(): {id, when:selector that is only in that panel, steps()}; the device panel is common. */
const PANEL_TOURS = [
  {id:"device", when:'#drawer [data-dr="catalog"]', steps:() => [tip('#drawer [data-dr="catalog"]', "tp_dCat"), tip('#drawer [data-dr="webFill"]', "tp_dWeb"), tip('#drawer [data-f="mount"]', "tp_dMount"),
    tip('#drawer [data-f="ipMode"]', "tp_dIp"), tip('#drawer [data-f="params.sfp"]', "tp_dSfp"), tip("#drawer details.dsec", "tp_dSec")]}
];
const panelSeen = new Set();
function panelTour(){ const a = curApp(); return [...(a.panelTours ? a.panelTours() : []), ...PANEL_TOURS].find(p => $(p.when)) || null; }
function maybePanelTour(){
  if (!store.settings.setupDone || tourSkipped || store.settings.help.allOff || tourState) return;
  const p = panelTour(); if (!p) return; const id = "panel." + p.id; if (panelSeen.has(id) || store.settings.help.off[id]) return;
  setTimeout(() => { if (tourState || panelSeen.has(id) || !$(p.when)) return; panelSeen.add(id); const steps = p.steps().filter(s => !s.sel || $(s.sel)); if (steps.length) runTour(steps, id); }, 450);
}
function maybeTour(){
  if (!store.settings.setupDone) return;
  tourRev();
  const id = pageId(); if (tourSkipped || tourSeen.has(id) || store.settings.help.off[id] || store.settings.help.allOff) return;
  const steps = tourSteps(); if (!steps.length) return;
  tourSeen.add(id); setTimeout(() => runTour(steps, id), 250);
}
function tourSteps(){ const tab = curTab(), a = curApp(); return [...(UI.tourShell === false ? [] : []), ...((tab.tour ? tab.tour() : []) || [])].filter(s => !s.sel || $(s.sel)); }
function startTour(force){
  // a side panel is open: its own balloons
  const p = panelTour(); if (p){ const st = p.steps().filter(s => !s.sel || $(s.sel)); if (st.length){ runTour(st, "panel." + p.id); return; } }
  const steps = tourSteps(); if (!steps.length){ toast(t("tourNone")); return; } runTour(steps, pageId()); }
let tourState = null;
function endTour(){ if (!tourState) return; tourState.el.remove(); tourState.hl && tourState.hl.remove(); window.removeEventListener("resize", tourState.pos); tourState = null; }
function runTour(steps, id){
  endTour();
  const el = document.createElement("div"); el.className = "tour"; document.body.appendChild(el);
  const hl = document.createElement("div"); hl.className = "tour-hl"; document.body.appendChild(hl);
  tourState = {el, hl, steps, i:0, id, pos:null};
  const show = () => {
    const s = steps[tourState.i], last = tourState.i === steps.length - 1, tgt = s.sel && $(s.sel);
    el.innerHTML = `<div class="tb-head"><b>${esc(s.title)}</b><span class="muted">${tourState.i + 1} / ${steps.length}</span></div><div class="tb-body">${s.html || esc(s.text)}</div>
      <div class="tb-foot"><label class="chk small"><input type="checkbox" id="tour-off"${store.settings.help.off[id] ? " checked" : ""}> ${esc(t("tourNever"))}</label><span class="grow"></span>
      ${last ? "" : `<button class="btn small" data-tour="skip" title="${esc(t("tourSkipT"))}">${esc(t("tourSkip"))}</button>`}${tourState.i ? `<button class="btn small" data-tour="back">‹</button>` : ""}<button class="btn small pri" data-tour="${last ? "done" : "next"}">${esc(last ? t("tourDone") : t("tourNext"))}</button></div>`;
    const place = () => {
      const pad = 6, W = Math.min(360, innerWidth - 24); el.style.width = W + "px";
      if (tgt){ const r = tgt.getBoundingClientRect(); hl.style.display = "block"; Object.assign(hl.style, {left:(r.left - pad) + "px", top:(r.top - pad) + "px", width:(r.width + pad * 2) + "px", height:(r.height + pad * 2) + "px"});
        const h = el.offsetHeight; let x = r.left + r.width / 2 - W / 2, y = r.bottom + 12; if (y + h > innerHeight - 10) y = r.top - h - 12; if (y < 10) y = clamp(r.top + 12, 10, innerHeight - h - 10);
        el.style.left = clamp(x, 12, innerWidth - W - 12) + "px"; el.style.top = y + "px"; el.classList.remove("center"); }
      else { hl.style.display = "none"; el.style.left = (innerWidth - W) / 2 + "px"; el.style.top = Math.max(20, innerHeight / 2 - el.offsetHeight / 2) + "px"; el.classList.add("center"); }
    };
    if (tgt && tgt.scrollIntoView){ const r = tgt.getBoundingClientRect(); if (r.top < 0 || r.bottom > innerHeight) tgt.scrollIntoView({block:"center"}); }
    place(); tourState.pos = place; window.addEventListener("resize", place);
  };
  el.addEventListener("click", e => {
    const b = e.target.closest("[data-tour]"); if (!b) return; const k = b.dataset.tour;
    const off = $("#tour-off").checked; if (off) store.settings.help.off[id] = true; else delete store.settings.help.off[id]; persist();
    window.removeEventListener("resize", tourState.pos);
    if (k === "skip"){ tourSkipped = true; endTour(); return; }
    if (k === "next"){ tourState.i++; show(); } else if (k === "back"){ tourState.i--; show(); } else endTour();
  });
  show();
}
/* ---------- written guide (Settings → User guide) ---------- */
function guideHtml(){
  return APP_ORDER.map(id => { const a = APPS[id]; const g = (a.guide ? a.guide() : []);
    return `<details class="dsec guide"><summary>${appIcon(a, 22)} ${esc(t(a.name))}</summary><div class="dsb">${g.map(([h, p]) => `<h4>${esc(h)}</h4><p>${p}</p>`).join("")}</div></details>`; }).join("")
    + `<details class="dsec guide"><summary>🧭 ${esc(t("gCommonT"))}</summary><div class="dsb">${commonGuide().map(([h, p]) => `<h4>${esc(h)}</h4><p>${p}</p>`).join("")}</div></details>`;
}
function commonGuide(){ return [[t("gc1h"), t("gc1")], [t("gc2h"), t("gc2")], [t("gc3h"), t("gc3")], [t("gc4h"), t("gc4")], [t("gc5h"), t("gc5")], [t("gc6h"), t("gc6")], [t("gc7h"), t("gc7")], [t("gc8h"), t("gc8")]]; }
