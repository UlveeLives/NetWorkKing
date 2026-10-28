/*! NetWorkKing — © 2026 Ulvi Badalov. Bütün hüquqlar qorunur / All rights reserved. Proprietary — see LICENSE. */
// Labels to print on A4 sheets of stickers: switch / panel ports (TIA-606 name and where it goes), cables (a flag for each
// end), devices (name, IP, MAC) and data outlets — each with a QR code that holds the same text, for scanning on site.
"use strict";
const LABELS = (function(){
const SIZES = {s:{w:38.1, h:21.2, cols:5, rows:13}, m:{w:63.5, h:38.1, cols:3, rows:7}, f:{w:70, h:25.4, cols:3, rows:11}};
function items(b, what){
  const PMx = window.PM, L = [];
  if (what === "ports"){ b.devices.filter(d => PMx && PMx.portDev(d) && num(d.ports) > 0 && d.kind !== "outlet").forEach(d => { for (let i = 1; i <= Math.round(num(d.ports)); i++){ const p = String(i), ls = PMx.linksAt(b, d.id, p); if (!ls.length) continue;
      const pr = PMx.parts(b, d.id, p), ed = pr.end && devById(b, pr.end.d), pas = PMx.passive(d), head = pas ? PMx.label606(b, d, p) : `${devLabel(d)} : ${p}`;
      const to = ed ? devLabel(ed) + (roomName(b, ed.room) ? " · " + roomName(b, ed.room) : "") : pr.panel ? devLabel(devById(b, pr.panel.d)) + " : " + pr.panel.p : "";
      L.push({t:head, s:to ? "→ " + to : "", q:[head, to].filter(Boolean).join("\n")}); } }); }
  if (what === "cables") b.links.forEach(l => { const A = devById(b, l.a.d), Bd = devById(b, l.b.d); if (!A || !Bd) return; const id = l.cid || "", s = `${devLabel(A)}${l.a.p ? ":" + l.a.p : ""} ⇄ ${devLabel(Bd)}${l.b.p ? ":" + l.b.p : ""}`;
    for (let k = 0; k < 2; k++) L.push({t:id || mediaName(l.media), s, q:[id, s].filter(Boolean).join("\n")}); });
  if (what === "devices") b.devices.filter(d => !(KINDS[d.kind] || {}).acc && d.kind !== "outlet").forEach(d => { const s = [d.ip, d.mac].filter(Boolean).join(" · "), r = [kindName(d.kind), roomName(b, d.room)].filter(Boolean).join(" · ");
    L.push({t:devLabel(d), s:s || r, s2:s ? r : "", q:[devLabel(d), kindName(d.kind), d.ip, d.mac, d.serial && "S/N " + d.serial, roomName(b, d.room)].filter(Boolean).join("\n")}); });
  if (what === "outlets") b.devices.filter(d => d.kind === "outlet").forEach(d => { const pr = PMx ? PMx.chainAt(b, d.id, "1") : [], pp = pr.find(h => { const x = devById(b, h.d); return x && x.kind !== "outlet" && PMx.passive(x); });
    const lab = pp ? PMx.label606(b, devById(b, pp.d), pp.p) : ""; L.push({t:devLabel(d), s:[lab, roomName(b, d.room)].filter(Boolean).join(" · "), q:[devLabel(d), lab, roomName(b, d.room)].filter(Boolean).join("\n")}); });
  return L;
}
function sheet(L, size, qr){ const S = SIZES[size] || SIZES.m, per = S.cols * S.rows, pages = [];
  for (let i = 0; i < L.length; i += per) pages.push(L.slice(i, i + per));
  const qmm = Math.min(S.h - 4, 30);
  return pages.map(P => `<div class="lblpage" style="grid-template-columns:repeat(${S.cols},${S.w}mm);grid-auto-rows:${S.h}mm">${P.map(x => { let q = ""; if (qr) try { q = QR.svg(x.q, 100).replace(/width="100" height="100"/, `width="${qmm}mm" height="${qmm}mm"`); } catch(e){ q = ""; }
    return `<div class="lbl">${q ? `<div class="lq">${q}</div>` : ""}<div class="lt"><b>${esc(x.t)}</b>${x.s ? `<span>${esc(x.s)}</span>` : ""}${x.s2 ? `<span>${esc(x.s2)}</span>` : ""}</div></div>`; }).join("")}</div>`).join("");
}
function open(def){
  const b = B(), st = {what:def || "ports", size:"m", qr:true};
  const draw = () => { const L = items(b, st.what), S = SIZES[st.size];
    modal(`<h3>🏷 ${esc(t("lbT"))}</h3><p class="muted small">${esc(t("lbH"))}</p>
      <div class="two"><label class="fld"><span>${esc(t("lbWhat"))}</span><select id="lb-w">${["ports", "cables", "devices", "outlets"].map(k => opt(k, t("lb_" + k), st.what)).join("")}</select></label>
      <label class="fld"><span>${esc(t("lbSize"))}</span><select id="lb-s">${Object.entries(SIZES).map(([k, s]) => opt(k, `${s.w} × ${s.h} mm (${s.cols * s.rows} / A4)`, st.size)).join("")}</select></label></div>
      <label class="chk"><input type="checkbox" id="lb-q"${st.qr ? " checked" : ""}> ${esc(t("lbQr"))}</label>
      <p class="small">${esc(t("lbCount", {n:L.length, p:Math.ceil(L.length / (S.cols * S.rows))}))}</p>
      <div class="lblprev">${L.length ? sheet(L.slice(0, S.cols * 2), st.size, st.qr) : `<p class="muted">${esc(t("lbNone"))}</p>`}</div>
      <div class="mfoot"><button class="btn" data-m="close">${esc(t("cancel"))}</button><span class="grow"></span><button class="btn pri" data-m="print"${L.length ? "" : " disabled"}>🖨 ${esc(t("lbPrint"))}</button></div>`,
      {print:() => { closeModal(); print(L, st.size, st.qr); }}, {wide:true, nofocus:true});
    $("#lb-w").addEventListener("change", e => { st.what = e.target.value; draw(); }); $("#lb-s").addEventListener("change", e => { st.size = e.target.value; draw(); }); $("#lb-q").addEventListener("change", e => { st.qr = e.target.checked; draw(); }); };
  draw();
}
function print(L, size, qr){
  const root = document.createElement("div"); root.id = "lblroot"; root.innerHTML = sheet(L, size, qr); document.body.appendChild(root); document.body.classList.add("printlabels");
  let st = $("#pagecss"); if (!st){ st = document.createElement("style"); st.id = "pagecss"; document.head.appendChild(st); } const old = st.textContent; st.textContent = "@media print{@page{size:210mm 297mm;margin:10mm 7mm}}";
  const done = () => { if (!root.isConnected) return; root.remove(); document.body.classList.remove("printlabels"); st.textContent = old; window.removeEventListener("afterprint", done); };
  // window.print() waits for the print window to close; afterprint covers browsers where it does not
  window.addEventListener("afterprint", done); setTimeout(() => { window.print(); if (root.isConnected) setTimeout(done, 300); }, 50);
}
return {open, items, sheet};
})();
