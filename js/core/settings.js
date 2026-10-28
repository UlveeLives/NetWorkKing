// Settings window (language, theme, help, user guide, device catalog, AI lookup, project) and the first-run setup.
"use strict";
function openSettings(tab){
  const s = store.settings, cur = tab || "gen", p = P(), ri = CAT.remoteInfo;
  const tabs = [["gen", "⚙ " + t("setGeneral")], ["help", "💬 " + t("setHelp")], ["guide", "📖 " + t("setGuide")], ["cat", "📚 " + t("setCatalog")], ["ai", "🤖 " + t("setAi")], ["proj", "🗂 " + t("setProject")], ["about", "ⓘ " + t("setAbout")]];
  const pages = APP_ORDER.flatMap(id => APPS[id].tabs.filter(x => x.tour).map(x => [id + "." + x.id, `${t(APPS[id].name)} — ${t(x.label)}`]));
  modal(`<h3>⚙ ${esc(t("settings"))}</h3><div class="tabs">${tabs.map(([k, l]) => `<button class="tabb${k === cur ? " on" : ""}" data-m="tab:${k}">${esc(l)}</button>`).join("")}</div>
  <div class="tsec" data-t="gen"${cur === "gen" ? "" : " hidden"}>
    <label class="fld"><span>${esc(t("lang"))}</span><select id="s-lang">${LANGS.map(([k, l]) => opt(k, l, s.lang)).join("")}</select></label>
    <label class="fld"><span>${esc(t("theme"))}</span><select id="s-theme">${[["system", t("thSystem")], ["light", t("thLight")], ["dark", t("thDark")]].map(([k, l]) => opt(k, l, s.theme)).join("")}</select></label>
    <label class="chk"><input type="checkbox" id="s-boxed"${s.addBoxed ? " checked" : ""}> ${esc(t("setBoxed"))}</label></div>
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
    <div class="btns"><button class="btn pri" data-m="catUpd">⟳ ${esc(t("catUpdNow"))}</button><button class="btn" data-m="catBrowse">📚 ${esc(t("catBrowse"))}</button><button class="btn" data-m="catExport">⤒ ${esc(t("catExportMine"))}</button></div>
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
  <div class="tsec" data-t="about"${cur === "about" ? "" : " hidden"}><p><b>NetWorkKing ${esc(APP_VERSION)}</b></p><p class="muted small">${esc(t("aboutText"))}</p><div id="s-storage" class="muted small"></div>
    <div class="btns"><button class="btn" data-m="wizard">🧭 ${esc(t("setupAgain"))}</button></div></div>
  <div class="mfoot"><button class="btn" data-m="close">${esc(t("cancel"))}</button><button class="btn pri" data-m="save">${esc(t("save"))}</button></div>`, {
    tab: (bt, e, k) => { $$(".mbox .tabb").forEach(x => x.classList.toggle("on", x === bt)); $$(".mbox .tsec").forEach(x => x.hidden = x.dataset.t !== k); },
    save: () => { readSettings(); closeModal(); applyTheme(); render(); toast("✓ " + t("saved")); },
    helpAll: () => { s.help.off = {}; s.help.allOff = false; tourSeen.clear(); $$(".s-pg").forEach(x => x.checked = true); $("#s-alloff").checked = false; persist(); toast("✓ " + t("setHelpDone")); },
    catUpd: async bt => { readSettings(); bt.disabled = true; await CAT.update(true); bt.disabled = false; openSettings("cat"); },
    catBrowse: () => { closeModal(); openCatalogPicker("", () => {}); },
    catExport: () => saveText("networkking-catalog-mine.json", JSON.stringify({app:"networkking-catalog", version:today(), date:today(), models:CAT.user}, null, 1), "json", "application/json"),
    aiTest: () => { readSettings(); aiTest(); },
    places: () => { readSettings(); closeModal(); openPlaces(); },
    dupProj: () => { readSettings(); const c = clone(P()); c.id = uid("p"); c.name += " (" + t("copy") + ")"; store.projects[c.id] = c; store.cur = c.id; persist(); closeModal(); render(); },
    delProj: async () => { if (!await uiConfirm(t("projDelConf",{n:P().name}), t("delete"), true)) return; delete store.projects[store.cur]; store.cur = Object.keys(store.projects)[0]; undoStack = []; redoStack = []; persist(); closeModal(); render(); },
    wizard: () => { closeModal(); openWizard(true); }
  }, {wide:true});
  if (navigator.storage && navigator.storage.estimate) navigator.storage.estimate().then(e => { const el = $("#s-storage"); if (el) el.textContent = t("storageUse",{u:(e.usage / 1048576).toFixed(1), q:(e.quota / 1073741824).toFixed(1)}); });
}
function readSettings(){
  const s = store.settings, v = id => $("#" + id);
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
      <label class="fld"><span>${esc(t("theme"))}</span><select id="w-theme">${[["system", t("thSystem")], ["light", t("thLight")], ["dark", t("thDark")]].map(([k, l]) => opt(k, l, s.theme)).join("")}</select></label>`,
    () => `<h3>🏢 ${esc(t("wzProject"))}</h3><p class="muted small">${esc(t("wzProjectHint"))}</p>
      <label class="fld"><span>${esc(t("projCompany"))}</span><input id="w-comp" value="${esc(P().company)}" placeholder="Palladium Group"></label>
      <label class="fld"><span>${esc(t("projName"))}</span><input id="w-proj" value="${esc(P().name === t("newProject") ? "" : P().name)}" placeholder="${esc(t("wzProjPh"))}"></label>
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
    const th = $("#w-theme"); if (th) th.addEventListener("change", () => { s.theme = th.value; applyTheme(); });
    $$('input[name="w-ai"]').forEach(x => x.addEventListener("change", () => { $("#w-keybox").hidden = $('input[name="w-ai"]:checked').value !== "key"; }));
  };
  const read = () => {
    if ($("#w-comp")){ P().company = $("#w-comp").value.trim(); if ($("#w-proj").value.trim()) P().name = $("#w-proj").value.trim(); else if (P().company) P().name = P().company; if ($("#w-bld").value.trim()) B().name = $("#w-bld").value.trim(); }
    const r = $('input[name="w-ai"]:checked'); if (r){ s.ai.enabled = r.value === "key" && !!$("#w-key").value.trim(); s.ai.key = $("#w-key").value.trim(); }
    persist();
  };
  draw();
}
