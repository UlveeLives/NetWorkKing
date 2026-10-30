/*! NetWorkKing — © 2026 Ulvi Badalov. Bütün hüquqlar qorunur / All rights reserved. Proprietary — see LICENSE. */
// Settings window (language, theme, help, user guide, device catalog, AI lookup, project) and the first-run setup.
"use strict";
function openSettings(tab){
  const s = store.settings, cur = tab || "gen", p = P(), ri = CAT.remoteInfo;
  const tabs = [["gen", "⚙ " + t("setGeneral")], ["help", "💬 " + t("setHelp")], ["guide", "📖 " + t("setGuide")], ["cat", "📚 " + t("setCatalog")], ["ai", "🤖 " + t("setAi")], ["proj", "🗂 " + t("setProject")], ["about", "ⓘ " + t("setAbout")]];
  const pages = APP_ORDER.flatMap(id => APPS[id].tabs.filter(x => x.tour).map(x => [id + "." + x.id, `${t(APPS[id].name)} — ${t(x.label)}`]));
  modal(`<h3>⚙ ${esc(t("settings"))}</h3><div class="tabs">${tabs.map(([k, l]) => `<button class="tabb${k === cur ? " on" : ""}" data-m="tab:${k}">${esc(l)}</button>`).join("")}</div>
  <div class="tsec" data-t="gen"${cur === "gen" ? "" : " hidden"}>
    <div class="subtabs"><button class="on" data-m="gsub:main">${esc(t("setMain"))}</button><button data-m="gsub:look">🎨 ${esc(t("setLook"))}</button></div>
    <div class="gsub" data-g="main">
    <label class="fld"><span>${esc(t("lang"))}</span><select id="s-lang">${LANGS.map(([k, l]) => opt(k, l, s.lang)).join("")}</select></label>
    <label class="chk"><input type="checkbox" id="s-boxed"${s.addBoxed ? " checked" : ""}> ${esc(t("setBoxed"))}</label></div>
    <div class="gsub" data-g="look" hidden>
    <div class="seg" style="margin-bottom:10px"><button class="on" data-m="lsub:theme">${esc(t("setTheme"))}</button><button data-m="lsub:tbar">${esc(t("setTitleBar"))}</button><button data-m="lsub:snd">🔊 ${esc(t("snd_tab"))}</button></div>
    <div class="lsub" data-l="theme"><label class="fld"><span>${esc(t("theme"))}</span><select id="s-theme">${[["system", t("thSystem")], ["light", t("thLight")], ["dark", t("thDark")]].map(([k, l]) => opt(k, l, s.theme)).join("")}</select></label></div>
    <div class="lsub" data-l="tbar" hidden><p class="muted small">${esc(t("tbHint"))}</p>${tbPicker(s.tbStyle || "code")}
      ${WINB ? `<label class="chk"><input type="checkbox" id="s-winfx"${s.winFx === false ? "" : " checked"}> ${esc(t("winFxOpt"))}</label><label class="chk"><input type="checkbox" id="s-splash"${s.splash === false ? "" : " checked"}> ${esc(t("splashOpt"))}</label>` : `<p class="muted small">${esc(t("winWebOnly"))}</p>`}</div>
    <div class="lsub" data-l="snd" hidden>${sndPane(s)}</div></div></div>
  <div class="tsec" data-t="help"${cur === "help" ? "" : " hidden"}><p class="muted small">${esc(t("setHelpHint"))}</p>
    <label class="chk"><input type="checkbox" id="s-alloff"${s.help.allOff ? " checked" : ""}> ${esc(t("setHelpAllOff"))}</label>
    <div class="scroll" style="max-height:40vh">${pages.map(([k, l]) => `<label class="chk"><input type="checkbox" class="s-pg" data-k="${esc(k)}"${s.help.off[k] ? "" : " checked"}> ${esc(l)}</label>`).join("")}</div>
    <div class="btns"><button class="btn" data-m="helpAll">↺ ${esc(t("setHelpReset"))}</button></div></div>
  <div class="tsec" data-t="guide"${cur === "guide" ? "" : " hidden"}>${guideHtml()}</div>
  <div class="tsec" data-t="cat"${cur === "cat" ? "" : " hidden"}>
    <p>${esc(t("catCount",{a:CAT.all().length, b:CAT.builtin.length, r:CAT.remote.length, u:CAT.user.length}))}</p>
    <p class="muted small">${ri ? esc(t("catLast",{d:new Date(ri.checked).toLocaleString(), v:ri.version || ri.date || "—"})) : esc(t("catNever"))}</p>
    <label class="fld"><span>${esc(t("catUrl"))}</span><input id="s-curl" value="${esc(s.catalogUrl)}"></label>
    <label class="chk"><input type="checkbox" id="s-cauto"${s.catalogAuto ? " checked" : ""}> ${esc(t("catAuto"))}</label>
    <div class="btns"><button class="btn pri" data-m="catUpd">⟳ ${esc(t("catUpdNow"))}</button><button class="btn" data-m="devDb">🗂 ${esc(t("ddbBtn"))}</button><button class="btn" data-m="catBrowse">📚 ${esc(t("catBrowse"))}</button><button class="btn" data-m="catExport">⤒ ${esc(t("catExportMine"))}</button></div>
    <p class="muted small">${esc(t("catSrcHint"))}</p></div>
  <div class="tsec" data-t="ai"${cur === "ai" ? "" : " hidden"}><p class="small">${esc(t("aiIntro"))}</p>
    <label class="chk"><input type="checkbox" id="s-aion"${s.ai.enabled ? " checked" : ""}> ${esc(t("aiEnable"))}</label>
    <label class="fld"><span>${esc(t("aiKey"))}</span><input id="s-aikey" type="password" value="${esc(s.ai.key)}" placeholder="sk-ant-…" autocomplete="off"></label>
    <label class="fld"><span>${esc(t("aiModel"))}</span><select id="s-aimodel">${["claude-sonnet-5-5","claude-opus-5-5","claude-haiku-5-5"].map(m => opt(m, m, s.ai.model)).join("")}</select></label>
    <p class="muted small">${esc(t("aiPrivacy"))}</p><div class="btns"><button class="btn" data-m="aiTest">✓ ${esc(t("aiTestBtn"))}</button></div></div>
  <div class="tsec" data-t="proj"${cur === "proj" ? "" : " hidden"}>
    <label class="fld"><span>${esc(t("projName"))}</span><input id="s-pname" value="${esc(p.name)}"></label>
    <label class="fld"><span>${esc(t("projCompany"))}</span><input id="s-pcomp" value="${esc(p.company)}"></label>
    <div class="btns"><button class="btn" data-m="places">🏢 ${esc(t("places"))}</button><button class="btn" data-m="dupProj">⧉ ${esc(t("projDup"))}</button><button class="btn dan" data-m="delProj"${Object.keys(store.projects).length < 2 ? " disabled" : ""}>🗑 ${esc(t("projDel"))}</button></div></div>
  <div class="tsec" data-t="about"${cur === "about" ? "" : " hidden"}><p><b>NetWorkKing ${esc(APP_VERSION)}</b></p><p class="small"><b>${esc(COPYRIGHT)}.</b> ${esc(t("rightsReserved"))}</p><p class="muted small">${esc(t("aboutText"))}</p>
    <div class="btns"><button class="btn" data-m="eula">📜 ${esc(t("eulaBtn"))}</button></div><div id="s-storage" class="muted small"></div>
    <div class="btns"><button class="btn" data-m="wizard">🧭 ${esc(t("setupAgain"))}</button></div></div>
  <div class="mfoot"><button class="btn" data-m="close">${esc(t("cancel"))}</button><button class="btn pri" data-m="save">${esc(t("save"))}</button></div>`, {
    eula: () => showEula(),
    gsub: (bt, e, k) => { $$(".subtabs button").forEach(x => x.classList.toggle("on", x === bt)); $$(".gsub").forEach(x => x.hidden = x.dataset.g !== k); },
    lsub: (bt, e, k) => { bt.parentElement.querySelectorAll("button").forEach(x => x.classList.toggle("on", x === bt)); $$(".lsub").forEach(x => x.hidden = x.dataset.l !== k); },
    tab: (bt, e, k) => { $$(".mbox .tabb").forEach(x => x.classList.toggle("on", x === bt)); $$(".mbox .tsec").forEach(x => x.hidden = x.dataset.t !== k); },
    save: () => { readSettings(); closeModal(); applyTheme(); render(); toast("✓ " + t("saved")); },
    helpAll: () => { s.help.off = {}; s.help.allOff = false; tourSeen.clear(); $$(".s-pg").forEach(x => x.checked = true); $("#s-alloff").checked = false; persist(); toast("✓ " + t("setHelpDone")); },
    catUpd: async bt => { readSettings(); bt.disabled = true; await CAT.update(true); bt.disabled = false; openSettings("cat"); },
    catBrowse: () => { readSettings(); openCatalogPicker("", () => {}); },
    devDb: () => { readSettings(); openDevDb(); },
    catExport: () => saveText("networkking-catalog-mine.json", JSON.stringify({app:"networkking-catalog", version:today(), date:today(), models:CAT.user}, null, 1), "json", "application/json"),
    aiTest: () => { readSettings(); aiTest(); },
    places: () => { readSettings(); openPlaces(); },
    dupProj: () => { readSettings(); const c = clone(P()); c.id = uid("p"); c.name += " (" + t("copy") + ")"; store.projects[c.id] = c; store.cur = c.id; persist(); closeModal(); render(); },
    delProj: async () => { if (!await uiConfirm(t("projDelConf",{n:P().name}), t("delete"), true)) return; delete store.projects[store.cur]; store.cur = Object.keys(store.projects)[0]; undoStack = []; redoStack = []; persist(); closeModal(); render(); },
    wizard: () => { closeModal(); openWizard(true); }
  }, {wide:true});
  if (navigator.storage && navigator.storage.estimate) navigator.storage.estimate().then(e => { const el = $("#s-storage"); if (el) el.textContent = t("storageUse",{u:(e.usage / 1048576).toFixed(1), q:(e.quota / 1073741824).toFixed(1)}); });
}
// Settings → Look → Splash sounds — the same layout as the sound samples page: a card per sound (listen / choose), a
// «silent» chip per group, the volume and a small splash that plays the chosen pair in order (dial-up while the bar
// fills, a pause while the circles spin away, the crackle while the N goes out and the name comes on)
function sndPane(s){ const S = Object.assign({d:"D1", e:"E4", vol:60}, s.splashSnd || {});
  const nm = k => t("snd_" + k).replace(/^[DE]\d\s*·\s*/, "");
  const card = (k, kind) => `<div class="sncard${S[kind] === k ? " sel" : ""}" data-snk="${k}"><div class="sncode">${k}</div><h4>${esc(nm(k))}</h4><p>${esc(t("snd_" + k + "d"))}</p>
    <div class="snacts"><button type="button" class="snplay" data-snplay="${k}">▶ ${esc(t("snd_play"))}</button><button type="button" class="snpick" data-snpick="${kind}:${k}">${S[kind] === k ? "✓ " + esc(t("snd_picked")) : esc(t("snd_pick"))}</button><span class="sndur">${NKSND.len(k).toFixed(1)} s</span></div></div>`;
  const group = (kind, title, sub) => `<div class="sngrp" data-kind="${kind}"><div class="snh"><h3>${esc(title)}</h3><small>${esc(sub)}</small><span class="grow"></span>
    <button type="button" class="snoff${S[kind] === "0" ? " on" : ""}" data-snpick="${kind}:0">🔇 ${esc(t("snd_off"))}</button></div>
    <div class="sngrid">${NKSND[kind.toUpperCase()].map(k => card(k, kind)).join("")}</div></div>`;
  return `<div class="sndp"><input type="hidden" id="s-sd" value="${S.d}"><input type="hidden" id="s-se" value="${S.e}">
    <p class="snlead">${esc(t("snd_hint"))}</p>
    <div class="snbar"><label>${esc(t("snd_vol"))} <input type="range" id="s-sv" min="0" max="100" step="5" value="${S.vol}"> <b id="s-svn">${S.vol}%</b></label><span class="grow"></span><span class="snsel">${esc(t("snd_sel"))}: <b id="s-snsel"></b></span></div>
    ${group("d", t("snd_load"), t("snd_loadSub"))}${group("e", t("snd_flick"), t("snd_flickSub"))}
    <div class="snh"><h3>${esc(t("snd_both"))}</h3><small>${esc(t("snd_mini"))}</small></div>
    <div class="snstage"><div class="snmini"><svg viewBox="200 196 112 120" aria-hidden="true"><path d="M227 287v-62l58 62v-62" fill="none" stroke-linecap="round" stroke-linejoin="round" stroke="#16ff5a" stroke-width="23" stroke-opacity=".55" class="nout"/><path d="M227 287v-62l58 62v-62" fill="none" stroke-linecap="round" stroke-linejoin="round" stroke="#16ff5a" stroke-width="17" class="ntube"/><path d="M227 287v-62l58 62v-62" fill="none" stroke-linecap="round" stroke-linejoin="round" stroke="#050806" stroke-width="13" opacity="0" class="nhole"/></svg>
      <div class="snname"><span class="o">Net</span><span class="g">Work</span><span class="o">King</span></div>
      <div class="snload"><div class="sntrack"><i></i></div><div class="snpct"><span class="snln">${esc(t("snd_ready"))}</span><span class="snpc">0%</span></div></div></div>
      <div class="snside"><p>${esc(t("snd_order"))}</p><div class="btns"><button type="button" class="snplay big" data-snplay="both">▶ ${esc(t("snd_both"))}</button><button type="button" class="snstop" data-snstop="1">■ ${esc(t("snd_stop"))}</button></div>
      ${WINB ? "" : `<p class="snnote">${esc(t("snd_web"))}</p>`}</div></div></div>`; }
const SNP = {on:null, timers:[], raf:0};
function sndStop(){ NKSND.stopAll(); SNP.timers.forEach(clearTimeout); SNP.timers = []; cancelAnimationFrame(SNP.raf); SNP.on = null;
  $$(".sndp [data-snplay]").forEach(b => { b.classList.remove("playing"); b.textContent = "▶ " + t(b.dataset.snplay === "both" ? "snd_both" : "snd_play"); }); sndMini(1, 0, 0); }
function sndMini(tube, name, pct, line){ const p = $(".sndp"); if (!p) return; const q = c => p.querySelector(c);
  q(".ntube").style.opacity = tube; q(".nhole").style.opacity = tube < .5 ? 1 - tube : 0; q(".snname").style.opacity = name; q(".nout").setAttribute("stroke-opacity", name >= 1 && tube === 0 ? "1" : ".55");
  q(".sntrack i").style.width = pct + "%"; q(".snpc").textContent = Math.round(pct) + "%"; q(".snln").textContent = line || t("snd_ready"); }
// the N / name flicker in step with the crackle (the same table and stretch as the splash)
function sndFlick(){ const F = NKSND.FL.map(f => [f[0] * 1.3, f[1], f[2]]), t0 = performance.now(); let i = 0;
  const step = () => { const e = performance.now() - t0; while (i < F.length && F[i][0] <= e){ sndMini(F[i][1], F[i][2], 100, "✓"); i++; } if (i < F.length) SNP.raf = requestAnimationFrame(step); };
  SNP.raf = requestAnimationFrame(step); }
function sndLoadBar(sec){ const t0 = performance.now(), L = [t("snd_l1"), t("snd_l2"), t("snd_l3"), "✓"];
  const step = () => { const k = Math.min(1, (performance.now() - t0) / (sec * 1000)); sndMini(1, 0, k * 100, L[Math.min(L.length - 1, Math.floor(k * L.length))]); if (k < 1) SNP.raf = requestAnimationFrame(step); };
  SNP.raf = requestAnimationFrame(step); }
function sndPlay(k, btn){ const was = SNP.on === k; sndStop(); if (was) return; NKSND.setVol(+$("#s-sv").value / 100); SNP.on = k;
  if (btn){ btn.classList.add("playing"); btn.textContent = "■ " + t("snd_stop"); }
  let len = 0;
  if (/^D/.test(k)) len = NKSND.dialStart(k);
  else if (/^E/.test(k)){ len = NKSND.crackle(k); sndFlick(); }
  else { const d = $("#s-sd").value, e = $("#s-se").value, L = d !== "0" ? NKSND.dialStart(d) : 3; sndLoadBar(L);
    SNP.timers.push(setTimeout(() => { cancelAnimationFrame(SNP.raf); sndMini(0, 0, 100, "↻"); }, L * 1000));
    SNP.timers.push(setTimeout(() => { if (e !== "0") NKSND.crackle(e); sndFlick(); }, (L + 1.2) * 1000)); len = L + 1.2 + 2.2; }
  SNP.timers.push(setTimeout(() => { if (SNP.on === k){ const keep = k === "both"; sndStop(); if (keep) sndMini(0, 1, 100, "✓"); } }, (len + .4) * 1000)); }
function sndShowSel(){ const d = $("#s-sd"), e = $("#s-se"), o = $("#s-snsel"); if (o && d) o.textContent = `${d.value === "0" ? t("snd_off") : d.value} + ${e.value === "0" ? t("snd_off") : e.value}`; }
function sndPick(kind, k){ $("#s-s" + kind).value = k;
  $$(`.sndp .sngrp[data-kind="${kind}"] .sncard`).forEach(c => { const on = c.dataset.snk === k; c.classList.toggle("sel", on); const b = c.querySelector(".snpick"); b.textContent = on ? "✓ " + t("snd_picked") : t("snd_pick"); });
  const off = $(`.sndp .sngrp[data-kind="${kind}"] .snoff`); off.classList.toggle("on", k === "0"); sndShowSel(); }
document.addEventListener("click", ev => { const x = ev.target.closest(".sndp [data-snplay], .sndp [data-snpick], .sndp [data-snstop]"); if (!x) return; ev.preventDefault();
  if (x.dataset.snplay) sndPlay(x.dataset.snplay, x); else if (x.dataset.snpick){ const [kind, k] = x.dataset.snpick.split(":"); sndPick(kind, k); } else sndStop(); });
document.addEventListener("input", ev => { if (ev.target.id === "s-sv"){ const n = $("#s-svn"); if (n) n.textContent = ev.target.value + "%"; NKSND.setVol(+ev.target.value / 100); } });
new MutationObserver(() => { if ($(".sndp") && !$(".sndp").dataset.init){ $(".sndp").dataset.init = 1; sndShowSel(); } if (SNP.on && !$(".sndp")) sndStop(); }).observe(document.getElementById("modal") || document.body, {childList:true, subtree:true, attributes:true, attributeFilter:["hidden"]});
function readSettings(){
  const s = store.settings, v = id => $("#" + id);
  if (v("s-winfx")) s.winFx = v("s-winfx").checked; if (v("s-splash")) s.splash = v("s-splash").checked;
  if (v("s-sd")) s.splashSnd = {d:v("s-sd").value, e:v("s-se").value, vol:+v("s-sv").value};
  if (v("s-lang")) s.lang = v("s-lang").value; if (v("s-theme")) s.theme = v("s-theme").value; if (v("s-boxed")) s.addBoxed = v("s-boxed").checked;
  if (v("s-alloff")) s.help.allOff = v("s-alloff").checked;
  $$(".s-pg").forEach(x => { if (x.checked) delete s.help.off[x.dataset.k]; else s.help.off[x.dataset.k] = true; });
  if (v("s-curl")) s.catalogUrl = v("s-curl").value.trim(); if (v("s-cauto")) s.catalogAuto = v("s-cauto").checked;
  if (v("s-aion")) s.ai.enabled = v("s-aion").checked; if (v("s-aikey")) s.ai.key = v("s-aikey").value.trim(); if (v("s-aimodel")) s.ai.model = v("s-aimodel").value;
  if (v("s-pname")){ P().name = v("s-pname").value.trim() || P().name; P().company = v("s-pcomp").value.trim(); }
  persist();
}
/* ---------- first-run setup ---------- */
function openWizard(again){
  const s = store.settings; let step = 0;
  const steps = [
    () => `<h3>👋 ${esc(t("wzWelcome"))}</h3><p>${esc(t("wzIntro"))}</p>
      <label class="fld"><span>${esc(t("lang"))}</span><select id="w-lang">${LANGS.map(([k, l]) => opt(k, l, s.lang)).join("")}</select></label>
      <div class="fld"><span>${esc(t("wzThemeQ"))}</span><div class="thpick">${[["dark", t("thDark")], ["light", t("thLight")]].map(([k, l]) => `<label class="thcard th-${k}${s.theme === k ? " on" : ""}"><input type="radio" name="w-th" value="${k}"${s.theme === k ? " checked" : ""}><img src="icons/logo-${k}.png" alt="" width="96" height="96"><b>${esc(l)}</b></label>`).join("")}</div>
      <label class="chk"><input type="radio" name="w-th" value="system"${s.theme === "system" ? " checked" : ""}> ${esc(t("thSystem"))} <small class="muted">— ${esc(t("wzThemeSys"))}</small></label></div>`,
    () => `<h3>🏢 ${esc(t("wzProject"))}</h3><p class="muted small">${esc(t("wzProjectHint"))}</p>
      <label class="fld"><span>${esc(t("projCompany"))}</span><input id="w-comp" value="${esc(P().company)}" placeholder="Company name"></label>
      <label class="fld"><span>${esc(t("projName"))}</span><input id="w-proj" value="${esc(/^(Project|Yeni layihə|New project) ?\d*$/i.test(P().name) ? "" : P().name)}" placeholder="${esc(t("wzProjPh"))}"></label>
      <label class="fld"><span>${esc(t("wzBuilding"))}</span><input id="w-bld" value="${esc(B().name)}"></label>`,
    () => `<h3>🤖 ${esc(t("wzAi"))}</h3><p class="small">${esc(t("aiIntro"))}</p>
      <label class="chk"><input type="radio" name="w-ai" value="key"${s.ai.enabled ? " checked" : ""}> ${esc(t("wzAiYes"))}</label>
      <div id="w-keybox"${s.ai.enabled ? "" : " hidden"}><label class="fld"><span>${esc(t("aiKey"))}</span><input id="w-key" type="password" value="${esc(s.ai.key)}" placeholder="sk-ant-…" autocomplete="off"></label><p class="muted small">${esc(t("aiPrivacy"))}</p></div>
      <label class="chk"><input type="radio" name="w-ai" value="no"${s.ai.enabled ? "" : " checked"}> ${esc(t("wzAiNo"))}</label>
      <p class="muted small">${esc(t("wzAiLater"))}</p>`,
    () => `<h3>✓ ${esc(t("wzDone"))}</h3><p>${esc(t("wzDoneText"))}</p><div class="appsgrid">${APP_ORDER.map(id => `<div class="appcard">${appIcon(APPS[id], 34)}<b>${esc(t(APPS[id].name))}</b><small>${esc(t(APPS[id].desc))}</small></div>`).join("")}</div>`
  ];
  const draw = () => {
    modal(`<div class="wz">${steps[step]()}</div><div class="wzdots">${steps.map((_, i) => `<i class="${i === step ? "on" : ""}"></i>`).join("")}</div>
      <div class="mfoot">${step ? `<button class="btn" data-m="back">‹ ${esc(t("back"))}</button>` : ""}<span class="grow"></span><button class="btn pri" data-m="next">${esc(step === steps.length - 1 ? t("wzStart") : t("next") + " ›")}</button></div>`, {
      next: () => { read(); if (step === steps.length - 1){ s.setupDone = true; persist(); closeModal(); if (!B().floors.length && APPS.building){ UI.app = "building"; P().cur.app = "building"; } render(); return; } step++; draw(); },
      back: () => { read(); step--; draw(); }
    }, {nofocus:true});
    $(".mbox").classList.add("lock");
    const lg = $("#w-lang"); if (lg) lg.addEventListener("change", () => { s.lang = lg.value; render(); draw(); });
    $$('input[name="w-th"]').forEach(x => x.addEventListener("change", () => { s.theme = x.value; $$(".thcard").forEach(c => c.classList.toggle("on", c.querySelector("input").checked)); applyTheme(); }));
    $$('input[name="w-ai"]').forEach(x => x.addEventListener("change", () => { $("#w-keybox").hidden = $('input[name="w-ai"]:checked').value !== "key"; }));
  };
  const read = () => {
    if ($("#w-comp")){ P().company = $("#w-comp").value.trim(); if ($("#w-proj").value.trim()) P().name = $("#w-proj").value.trim(); else if (P().company) P().name = P().company; if ($("#w-bld").value.trim()) B().name = $("#w-bld").value.trim(); }
    const r = $('input[name="w-ai"]:checked'); if (r){ s.ai.enabled = r.value === "key" && !!$("#w-key").value.trim(); s.ai.key = $("#w-key").value.trim(); }
    persist();
  };
  draw();
}

// licence agreement (the same text the Windows installer shows)
function showEula(){
  let lang = store.settings.lang === "az" ? "az" : "en";
  const o = layer(`<div class="eulabox"><div class="btns"><button class="btn small" data-el="az">Azərbaycanca</button><button class="btn small" data-el="en">English</button></div><pre class="eulatx"></pre><div class="mfoot"><span class="grow"></span><button class="btn pri" data-x="1">OK</button></div></div>`);
  const draw = () => { o.querySelector(".eulatx").textContent = EULA[lang]; o.querySelectorAll("[data-el]").forEach(b => b.classList.toggle("pri", b.dataset.el === lang)); };
  o.addEventListener("click", e => { const b = e.target.closest("[data-el]"); if (b){ lang = b.dataset.el; draw(); return; } if (e.target.closest("[data-x]")) o.remove(); });
  draw();
}
