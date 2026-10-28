/*! NetWorkKing — © 2026 Ulvi Badalov. Bütün hüquqlar qorunur / All rights reserved. Proprietary — see LICENSE. */
// "Document" tab of every app: a printable sheet (title, app content, ISO 7200 style title block) fitted to the window.
"use strict";
function docTitle(b, app){ b.docs = b.docs || {}; return b.docs[app] = Object.assign({title:"", sub:""}, b.docs[app] || {}); }
function docTab(appId, body){
  return {id:"doc", label:"tabDoc", icon:"📄",
    render(){ const b = B(), d = docTitle(b, appId);
      return `<div class="docbar"><label class="row small"><span>${esc(t("pg_size"))}</span><select id="doc-size" style="width:auto">${Object.keys(PAGES).map(k => opt(k, k, b.pagefmt.size)).join("")}</select></label>
        <select id="doc-or" style="width:auto">${opt("landscape", t("pg_land"), b.pagefmt.orient)}${opt("portrait", t("pg_port"), b.pagefmt.orient)}</select>
        <button class="btn small" data-doc="tb">🏷 ${esc(t("tbEdit"))}</button><span class="grow"></span><button class="btn pri" data-doc="pdf">📄 ${esc(t("exPdf"))}</button></div>
        <div class="sheetwrap" id="sheetwrap"><div class="sheet" id="sheet"><h1 contenteditable="true" data-dt="title" spellcheck="false">${esc(d.title || defaultDocTitle(b, appId))}</h1><h2 contenteditable="true" data-dt="sub" spellcheck="false">${esc(d.sub || b.name)}</h2>${body(b)}${titleBlock(b, appId)}</div></div>`; },
    after: fitSheet,
    tour: () => [{sel:".docbar", title:t("tDocT"), text:t("tDoc1")}, {sel:"#sheet h1", title:t("tDocT2"), text:t("tDoc2")}, {sel:'[data-doc="tb"]', title:t("tbEdit"), text:t("tDoc3")}, {sel:'[data-doc="pdf"]', title:t("exPdf"), text:t("tDoc4")}]
  };
}
const defaultDocTitle = (b, app) => `${(P().company || P().name).toLocaleUpperCase(store.settings.lang)} – ${t(APPS[app].docName || APPS[app].name).toLocaleUpperCase(store.settings.lang)}`;
function fitSheet(){ const w = $("#sheetwrap"), s = $("#sheet"); if (!w || !s) return; s.style.transform = ""; const k = Math.min(1, (w.clientWidth - 4) / s.offsetWidth); s.style.transform = `scale(${k})`; w.style.height = (s.offsetHeight * k + 10) + "px"; }
window.addEventListener("resize", debounce(() => { if (curTab && store && curTab().id === "doc") fitSheet(); }, 120));
function titleBlock(b, app){
  const tb = b.tb, c = (lab, val, cls = "") => `<div class="tbc ${cls}"><span>${esc(t(lab))}</span><b>${esc(val || "—")}</b></div>`, revs = b.revs.slice(-4);
  return `<div class="tblock"><div class="tbc logo"><b>${esc(tb.company || P().company || "")}</b></div>
    <div class="tbrev"><table><tr><th>${esc(t("tb_rev"))}</th><th>${esc(t("tb_date"))}</th><th>${esc(t("tb_desc"))}</th><th>${esc(t("tb_by"))}</th></tr>${revs.length ? revs.map(r => `<tr><td>${esc(r.rev)}</td><td>${esc(r.date)}</td><td>${esc(r.desc)}</td><td>${esc(r.by)}</td></tr>`).join("") : `<tr><td colspan="4">—</td></tr>`}</table></div>
    <div class="tbgrid">${c("tb_project", tb.project || P().name, "w2")}${c("tb_client", tb.client)}${c("tb_site", [b.name, b.address].filter(Boolean).join(", "))}
      ${c("tb_title", docTitle(b, app).title || defaultDocTitle(b, app), "w2")}${c("tb_dno", tb.drawingNo)}${c("tb_revc", tb.rev)}
      ${c("tb_author", tb.author)}${c("tb_checked", tb.checked)}${c("tb_approved", tb.approved)}${c("tb_date", tb.date)}
      ${c("tb_scale", tb.scale)}${c("tb_sheet", tb.sheet)}${c("tb_status", tb.status)}${c("tb_page", `${b.pagefmt.size} ${t(b.pagefmt.orient === "portrait" ? "pg_port" : "pg_land")}`)}</div></div>`;
}
function openTitleBlock(tab){
  const b = B(), tb = b.tb, cur = tab || "tb", f = (k, key, v, type = "text") => `<label class="fld"><span>${esc(t(k))}</span><input id="tb-${key}" type="${type}" value="${esc(v ?? "")}"></label>`;
  modal(`<h3>🏷 ${esc(t("tbEdit"))}</h3><div class="tabs"><button class="tabb${cur === "tb" ? " on" : ""}" data-m="tab:tb">${esc(t("tbBlock"))}</button><button class="tabb${cur === "rev" ? " on" : ""}" data-m="tab:rev">${esc(t("tbRevs"))}</button></div>
  <div class="tsec" data-t="tb"${cur === "tb" ? "" : " hidden"}><div class="two">${f("tb_company","company",tb.company || P().company)}${f("tb_client","client",tb.client)}</div>${f("tb_project","project",tb.project || P().name)}
    <div class="two">${f("tb_dno","drawingNo",tb.drawingNo)}${f("tb_revc","rev",tb.rev)}</div><div class="two">${f("tb_author","author",tb.author)}${f("tb_checked","checked",tb.checked)}</div>
    <div class="two">${f("tb_approved","approved",tb.approved)}${f("tb_date","date",tb.date,"date")}</div><div class="two">${f("tb_scale","scale",tb.scale)}${f("tb_sheet","sheet",tb.sheet)}</div>${f("tb_status","status",tb.status)}</div>
  <div class="tsec" data-t="rev"${cur === "rev" ? "" : " hidden"}><table class="t" id="revt"><tr><th>${esc(t("tb_rev"))}</th><th>${esc(t("tb_date"))}</th><th>${esc(t("tb_desc"))}</th><th>${esc(t("tb_by"))}</th><th></th></tr>
    ${b.revs.map((r, i) => `<tr>${["rev","date","desc","by"].map(k => `<td><input class="rv" data-c="${k}" value="${esc(r[k])}"></td>`).join("")}<td><button class="btn small dan" data-m="revDel" data-i="${i}">×</button></td></tr>`).join("")}</table>
    <div class="btns"><button class="btn small" data-m="revAdd">＋ ${esc(t("tbAddRev"))}</button></div></div>
  <div class="mfoot"><button class="btn" data-m="close">${esc(t("cancel"))}</button><button class="btn pri" data-m="save">${esc(t("save"))}</button></div>`, {
    tab: (bt, e, k) => { $$(".mbox .tabb").forEach(x => x.classList.toggle("on", x === bt)); $$(".mbox .tsec").forEach(x => x.hidden = x.dataset.t !== k); },
    save: () => { const revs = readRevs(), vals = {}; ["company","client","project","drawingNo","rev","author","checked","approved","date","scale","sheet","status"].forEach(k => { const el = $("#tb-" + k); vals[k] = el ? el.value : tb[k]; }); closeModal(); edit(() => { Object.assign(tb, vals); b.revs = revs; }); },
    revAdd: () => { saveTbFields(); const revs = readRevs(), last = revs[revs.length - 1]; revs.push({rev:last ? String.fromCharCode((last.rev || "A").charCodeAt(0) + 1) : "A", date:today(), desc:"", by:tb.author || ""}); b.revs = revs; openTitleBlock("rev"); },
    revDel: bt => { saveTbFields(); const revs = readRevs(); revs.splice(+bt.dataset.i, 1); b.revs = revs; openTitleBlock("rev"); }
  });
  function saveTbFields(){ ["company","client","project","drawingNo","rev","author","checked","approved","date","scale","sheet","status"].forEach(k => { if ($("#tb-" + k)) tb[k] = $("#tb-" + k).value; }); }
}
function readRevs(){ return $$("#revt tr").slice(1).map(tr => { const o = {}; tr.querySelectorAll("input.rv").forEach(i => o[i.dataset.c] = i.value); return o; }); }
// document tab events
document.addEventListener("click", e => { const d = e.target.closest("[data-doc]"); if (!d) return; if (d.dataset.doc === "pdf") printNow(); else if (d.dataset.doc === "tb") openTitleBlock(); });
document.addEventListener("change", e => { if (e.target.id === "doc-size" || e.target.id === "doc-or"){ const b = B(), v = e.target.value; edit(() => { if (e.target.id === "doc-size") b.pagefmt.size = v; else b.pagefmt.orient = v; }); } });
document.addEventListener("focusout", e => { const el = e.target.closest && e.target.closest("[data-dt]"); if (!el) return; const b = B(), d = docTitle(b, UI.app), v = el.textContent.trim(); if (v !== (d[el.dataset.dt] || "")) { pushUndo(); d[el.dataset.dt] = v; persist(); } });
document.addEventListener("keydown", e => { if (e.key === "Enter" && e.target.closest && e.target.closest("[data-dt]")){ e.preventDefault(); e.target.blur(); } });
