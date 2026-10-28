// CCTV: every camera is its own device (model, lens, field of view, DORI, IP, NVR channel, PoE switch port);
// NVR channels / bandwidth / storage with RAID and retention, PoE budget, camera schedule and document.
"use strict";
(function(){
const CODEC = {"H.264":1, "H.264+":.5, "H.265":.55, "H.265+":.3};
const SENSOR = {"1/3\"":6.0, "1/2.9\"":6.2, "1/2.8\"":6.43, "1/2.7\"":6.6, "1/2.5\"":7.2, "1/2\"":8.0, "1/1.8\"":8.93, "1/1.2\"":13.3};
const HPX = {1:1280, 2:1920, 3:2304, 4:2560, 5:2592, 6:3200, 8:3840, 12:4000};
const DORI = [["D",25],["O",62.5],["R",125],["I",250]];       // IEC 62676-4 pixels per metre
const CK = ["camera","nvr","dvr","switch","monitor","videowall","workstation","pp","outlet","server","ups","other"];
const RAIDS = [["none","—"],["0","RAID 0"],["1","RAID 1"],["5","RAID 5"],["6","RAID 6"],["10","RAID 10"]];
const cset = b => b.cctv = Object.assign({retain:30, fmt:0.9}, b.cctv || {});
const cams = b => b.devices.filter(d => d.kind === "camera");
const nvrs = b => b.devices.filter(d => d.kind === "nvr" || d.kind === "dvr");
// NVRs a camera records on (several allowed); with exactly one NVR in the building and none chosen, that one is used.
function nvrsOf(b, d){ const L = (d.nvrs || []).map(id => devById(b, id)).filter(Boolean); if (L.length) return L; const N = nvrs(b); return N.length === 1 ? [N[0]] : []; }
const nvrOf = (b, d) => nvrsOf(b, d)[0] || null;
const chOn = (d, nv) => (d.chs && d.chs[nv.id]) || "";
const nvrText = (b, d) => nvrsOf(b, d).map(nv => devLabel(nv) + (chOn(d, nv) ? " · CH" + chOn(d, nv) : "")).join(", ");
function camCalc(b, d){
  const C = d.camera, mp = num(C.mp, 2), fps = num(C.fps, 25), f = CODEC[C.codec] ?? .55;
  const auto = Math.max(.3, mp * 1.6 * fps / 25 * f), mbps = num(C.bitrate) || auto;
  const duty = C.rec === "motion" ? Math.min(100, num(C.act, 30)) / 100 : 1, hrs = Math.min(24, num(C.hours, 24));
  const gbDay = mbps * 3600 * hrs * duty / 8 / 1000, days = num(C.retain) || cset(b).retain;
  const focal = num(String(C.lens).split(/[-–]/)[0], 0);
  let fov = num(C.hfov);
  if (!fov && Array.isArray(C.lenses) && C.hfovs){ const i = C.lenses.map(String).indexOf(String(C.lens)); if (i >= 0 && C.hfovs[i]) fov = num(C.hfovs[i]); }
  if (!fov && focal){ const sw = (SENSOR[C.sensor] || 6.43) * 0.8716; fov = 2 * Math.atan(sw / (2 * focal)) * 180 / Math.PI; }
  const hpx = HPX[Math.round(mp)] || Math.round(Math.sqrt(mp * 1e6 * 16 / 9));
  const dori = fov ? DORI.map(([, ppm]) => Math.round(hpx / (ppm * 2 * Math.tan(fov * Math.PI / 360)))) : null;
  return {mbps, auto, gbDay, tb:gbDay * days / 1000, days, fov, dori, w:num(d.params.poeIn)};
}
function nvrCalc(b, nv){
  const L = cams(b).filter(d => nvrsOf(b, d).includes(nv)); let mbps = 0, tb = 0, tbDay = 0;
  L.forEach(d => { const C = camCalc(b, d); mbps += C.mbps; tb += C.tb; tbDay += C.gbDay / 1000; });
  const p = nv.nvrp, bays = num(p.bays), hdd = num(p.hdd), raw = bays * hdd;
  const ur = !bays ? 0 : p.raid === "1" || p.raid === "10" ? raw / 2 : p.raid === "5" ? (bays - 1) * hdd : p.raid === "6" ? (bays - 2) * hdd : raw;
  const usable = ur * cset(b).fmt, days = usable && tbDay ? usable / tbDay : 0;
  return {L, cams:L.length, mbps, tb, tbDay, usable, days, okCh:!num(p.channels) || L.length <= num(p.channels), okBw:!num(p.inMbps) || mbps <= num(p.inMbps), okSt:!usable || tb <= usable};
}
const upOf = (b, d) => window.PM ? PM.upstream(b, d) : {};
function cWarnings(b){
  const W = [], chs = {}, grp = {model:[], nvr:[], link:[]};
  cams(b).forEach(d => { const NV = nvrsOf(b, d), n = devLabel(d);
    if (!d.model) grp.model.push(d);
    if (!NV.length && nvrs(b).length) grp.nvr.push(d);
    NV.forEach(nv => { const ch = chOn(d, nv); if (ch){ const k = nv.id + ":" + ch; if (chs[k]) W.push(["err", t("cw_ch",{c:ch, a:chs[k], b:n, v:devLabel(nv)}), d.id]); chs[k] = n; }
      if (num(nv.nvrp.maxMp) && num(d.camera.mp) > num(nv.nvrp.maxMp)) W.push(["err", t("cw_mp",{n, m:d.camera.mp, v:devLabel(nv), x:nv.nvrp.maxMp}), d.id]); });
    if (!linksOf(b, d.id).length) grp.link.push(d); });
  [["model","info"],["nvr",""],["link","info"]].forEach(([k, lv]) => { const L = grp[k]; if (!L.length) return; const nm = L.slice(0, 4).map(devLabel).join(", ") + (L.length > 4 ? " … (+" + (L.length - 4) + ")" : ""); W.push([lv, t("cw_" + k, {n:nm}), L[0].id]); });
  nvrs(b).forEach(nv => { const N = nvrCalc(b, nv), n = devLabel(nv);
    if (!N.okCh) W.push(["err", t("cw_nch",{n, c:N.cams, m:nv.nvrp.channels}), nv.id]);
    if (!N.okBw) W.push(["err", t("cw_nbw",{n, c:Math.round(N.mbps), m:nv.nvrp.inMbps}), nv.id]);
    if (!N.okSt) W.push(["err", t("cw_nst",{n, c:N.tb.toFixed(1), m:N.usable.toFixed(1), d:Math.floor(N.days), r:cset(b).retain}), nv.id]); });
  return W;
}
/* ---------- diagram ---------- */
const cfg = {id:"cctv", media:["poe","cat6","fiber_sm","hdmi","coax","wifi","ptp"], kinds:CK,
  nodeLines(b, d, v){ if (d.kind === "camera"){ const C = d.camera; return [[d.brand, d.model].filter(Boolean).join(" ") || "", `${C.mp || "?"} MP · ${C.lens || "?"} mm${C.ir ? " · IR " + C.ir + " m" : ""}`, d.ip ? d.ip.split("/")[0] : "", nvrText(b, d)]; }
    if (d.kind === "nvr" || d.kind === "dvr"){ const N = nvrCalc(b, d); return [[d.brand, d.model].filter(Boolean).join(" "), `${N.cams}/${d.nvrp.channels || "—"} ch · ${Math.round(N.mbps)} Mbps`, N.usable ? `${N.usable.toFixed(1)} TB · ${Math.floor(N.days)} ${t("days")}` : ""]; }
    return defaultLines(b, d, v); },
  devExtra:(b, d) => camExtra(b, d)
};
function camExtra(b, d){
  if (d.kind === "camera"){ const C = d.camera, K = camCalc(b, d), lenses = Array.isArray(C.lenses) && C.lenses.length ? C.lenses : null;
    return sec("cam", "📷 " + t("camSec"), `<div class="two"><label class="fld"><span>${esc(t("camStyle"))}</span><select data-f="camera.style">${Object.keys(CAM_STYLES).map(k => opt(k, t("cs_" + k), C.style)).join("")}</select></label><label class="fld"><span>${esc(t("camLoc"))}</span><select data-f="camera.loc">${opt("in", t("camIn"), C.loc)}${opt("out", t("camOut"), C.loc)}</select></label></div>
      <div class="two">${fld("MP", "camera.mp", C.mp, "number", ' min="0.3" step="0.1"')}${lenses ? `<label class="fld"><span>${esc(t("camLens"))} (mm)</span><select data-f="camera.lens">${lenses.map(l => opt(l, l + " mm", C.lens)).join("")}</select></label>` : fld(t("camLens") + " (mm)", "camera.lens", C.lens, "text", ' placeholder="2.8 / 2.8-12"')}</div>
      <div class="two"><label class="fld"><span>${esc(t("camSensor"))}</span><select data-f="camera.sensor">${Object.keys(SENSOR).map(k => opt(k, k, C.sensor)).join("")}</select></label>${fld(t("camHfov"), "camera.hfov", C.hfov || "", "number", ` placeholder="${K.fov ? K.fov.toFixed(0) : ""}"`)}</div>
      <div class="two">${fld("IR (m)", "camera.ir", C.ir, "number")}${fld("IP / IK", "camera.ipr", C.ipr)}</div>
      <div class="lbox ok">${esc(t("camFov"))}: <b>${K.fov ? K.fov.toFixed(0) + "°" : "—"}</b> · DORI: ${K.dori ? DORI.map(([k], i) => `${k} <b>${K.dori[i]}</b> m`).join(" · ") : "—"}</div>`, true)
    + sec("rec", "💾 " + t("recSec"), `<div class="two"><label class="fld"><span>${esc(t("camCodec"))}</span><select data-f="camera.codec">${Object.keys(CODEC).map(k => opt(k, k, C.codec)).join("")}</select></label>${fld("FPS", "camera.fps", C.fps, "number")}</div>
      <div class="two">${fld(t("camBitrate"), "camera.bitrate", C.bitrate, "number", ` step="0.1" placeholder="auto ${K.auto.toFixed(1)}"`)}<label class="fld"><span>${esc(t("camRec"))}</span><select data-f="camera.rec">${opt("cont", t("rec_cont"), C.rec)}${opt("motion", t("rec_motion"), C.rec)}${opt("sched", t("rec_sched"), C.rec)}</select></label></div>
      <div class="two">${C.rec === "motion" ? fld(t("camAct"), "camera.act", C.act, "number") : "<span></span>"}${fld(t("camHours"), "camera.hours", C.hours, "number")}</div>
      <div class="two">${fld(t("camRetain"), "camera.retain", C.retain, "number", ` placeholder="${cset(b).retain}"`)}<span></span></div>
      ${nvrRows(b, d)}
      <div class="lbox ok">${esc(t("perCam"))}: <b>${K.mbps.toFixed(1)} Mbps</b> · ${K.gbDay.toFixed(1)} GB/${esc(t("day"))} · <b>${K.tb.toFixed(2)} TB</b> / ${K.days} ${esc(t("days"))}</div>`, true); }
  if (d.kind === "nvr" || d.kind === "dvr"){ const p = d.nvrp, N = nvrCalc(b, d);
    return sec("nvr", "🗄 " + t("nvrSec"), `<div class="two">${fld(t("nvrCh"), "nvrp.channels", p.channels, "number")}${fld(t("nvrIn") + " (Mbps)", "nvrp.inMbps", p.inMbps, "number")}</div>
      <div class="two">${fld(t("nvrBays"), "nvrp.bays", p.bays, "number")}${fld(t("nvrHdd"), "nvrp.hdd", p.hdd, "number")}</div>
      <div class="two"><label class="fld"><span>RAID</span><select data-f="nvrp.raid">${RAIDS.map(([k, l]) => opt(k, l, p.raid)).join("")}</select></label>${fld(t("nvrMaxMp"), "nvrp.maxMp", p.maxMp, "number")}</div>
      ${nvrBox(b, d, N)}`, true); }
  return "";
}
// NVRs of one camera: each with its channel, ＋ to add another NVR (e.g. the same cameras recorded on two NVRs).
function nvrRows(b, d){
  const N = nvrs(b), mine = (d.nvrs || []).map(id => devById(b, id)).filter(Boolean), rest = N.filter(x => !mine.includes(x));
  return `<div class="fld"><span>NVR</span></div>${mine.map(nv => `<div class="mrow"><span><b>${esc(devLabel(nv))}</b></span><label class="row small">${esc(t("camCh"))} <input data-cch="${nv.id}" type="number" min="1" value="${esc(chOn(d, nv))}" style="width:70px"></label><button class="x" data-dr="cnvrRm:${nv.id}" title="${esc(t("delete"))}">×</button></div>`).join("")}
    ${!mine.length ? `<p class="muted small">${N.length === 1 ? esc(t("auto") + ": " + devLabel(N[0])) : N.length ? esc(t("nvrNoneSel")) : esc(t("nvrNone"))}</p>` : ""}
    ${rest.length ? `<label class="fld"><select data-cnvr="1">${opt("", "＋ " + t("nvrAdd"), "")}${rest.map(x => opt(x.id, devLabel(x), "")).join("")}</select></label>` : ""}`;
}
function nvrBox(b, d, N){ return `<div class="lbox ${N.okCh && N.okBw && N.okSt ? "ok" : "bad"}">${esc(t("nvrCh"))}: <b>${N.cams}/${d.nvrp.channels || "—"}</b> · ${esc(t("nvrIn"))}: <b>${Math.round(N.mbps)}/${d.nvrp.inMbps || "—"} Mbps</b><br>${esc(t("nvrNeed"))}: <b>${N.tb.toFixed(1)} TB</b> · ${esc(t("nvrUsable"))}: <b>${N.usable ? N.usable.toFixed(1) + " TB" : "—"}</b>${N.usable ? ` · ≈ <b>${Math.floor(N.days)}</b> ${esc(t("days"))}` : ""}</div>`; }
/* ---------- several cameras at once (each one its own device) ---------- */
function bulkAdd(){
  const b = B(), boxed = store.settings.addBoxed;
  modal(`<h3>📷 ${esc(t("bulkT"))}</h3><p class="muted small">${esc(t("bulkHint"))}</p>
    <div class="two"><label class="fld"><span>${esc(t("bulkN"))}</span><input id="bk-n" type="number" min="1" max="256" value="8"></label><label class="fld"><span>${esc(t("bulkPfx"))}</span><input id="bk-p" value="CAM-"></label></div>
    <div class="two"><label class="fld"><span>${esc(t("camStyle"))}</span><select id="bk-s">${Object.keys(CAM_STYLES).map(k => opt(k, t("cs_" + k), "turret")).join("")}</select></label><label class="fld"><span>${esc(t("camLoc"))}</span><select id="bk-l">${opt("in", t("camIn"), "in")}${opt("out", t("camOut"), "")}</select></label></div>
    <label class="fld"><span>${esc(t("bulkIp"))}</span><input id="bk-ip" placeholder="10.10.40.11" inputmode="text" autocomplete="off"></label>
    ${nvrs(b).length ? `<div class="fld"><span>NVR</span>${nvrs(b).map((x, i) => `<label class="chk"><input type="checkbox" class="bk-nv" value="${x.id}"${i === 0 ? " checked" : ""}> ${esc(devLabel(x))}</label>`).join("")}</div>` : ""}
    <div class="two"><label class="fld"><span>${esc(t("bulkSw"))}</span><select id="bk-sw">${opt("", "—", "")}${b.devices.filter(x => KINDS[x.kind].sw || x.kind === "nvr").map(x => opt(x.id, devFull(b, x), "")).join("")}</select></label><label class="fld"><span>${esc(t("bulkPort"))}</span><input id="bk-port" type="number" min="1" value="1"></label></div>
    <div class="two"><label class="fld"><span>${esc(t("f_floor"))}</span><select id="bk-f">${floorOpts(b, "", false)}</select></label><label class="fld"><span>${esc(t("f_room"))}</span><input id="bk-r" list="bk-rl"><datalist id="bk-rl">${b.rooms.map(r => `<option value="${esc(r.name)}">`).join("")}</datalist></label></div>
    <label class="chk"><input type="checkbox" id="bk-box" checked> ${esc(t("bulkBox"))}</label>
    <div class="mfoot"><button class="btn" data-m="close">${esc(t("cancel"))}</button><button class="btn pri" data-m="ok">${esc(t("add"))}</button></div>`, {
    ok: () => { const v = {n:clamp(Math.round(num($("#bk-n").value, 1)), 1, 256), p:$("#bk-p").value, s:$("#bk-s").value, l:$("#bk-l").value, ip:$("#bk-ip").value.trim().replace(/,/g, ".").replace(/\s+/g, ""), nv:$$(".bk-nv:checked").map(x => x.value), sw:$("#bk-sw").value, port:Math.max(1, Math.round(num($("#bk-port").value, 1))), f:$("#bk-f").value, r:$("#bk-r").value.trim(), box:$("#bk-box").checked};
      if (v.ip && IP.toInt(v.ip) === null) return toast("⚠ " + t("ipBad")); closeModal();
      edit(() => { const vw = view(b, cfg.id), room = v.r ? ensureRoom(b, v.f, v.r) : null, base = v.ip ? IP.toInt(v.ip) : null, used = new Set(b.devices.map(x => x.name));
        const cols = Math.min(v.n, 6), w = boxed ? 170 : 60, h = boxed ? 70 : 90, start = freeSpot(b, vw, cols * (w + 20) + 40, Math.ceil(v.n / cols) * (h + 30) + 60);
        if (v.box) vw.boxes.push({id:uid("z"), x:start.x, y:start.y, w:cols * (w + 20) + 30, h:Math.ceil(v.n / cols) * (h + 30) + 50, label:v.r || v.p.replace(/[-_ ]$/, ""), sub:"", color:v.l === "out" ? "green" : "blue", dash:false, fill:false, tpos:"left", tsize:15});
        const chUsed = {}; v.nv.forEach(id => { chUsed[id] = new Set(cams(b).filter(c => (c.nvrs || []).includes(id)).map(c => +c.chs[id]).filter(Boolean)); }); const mask = v.ip.includes("/") ? "/" + v.ip.split("/")[1] : "";
        for (let i = 0; i < v.n; i++){ let k = i + 1, nm; do { nm = v.p + String(k++).padStart(2, "0"); } while (used.has(nm)); used.add(nm);
          const chs = {}; v.nv.forEach(id => { let c = 1; while (chUsed[id].has(c)) c++; chUsed[id].add(c); chs[id] = String(c); });
          const d = newDevice("camera", {name:nm, floor:v.f || (room && room.floor) || "", room:room ? room.id : "", ip:base !== null ? IP.str(base + i) + mask : "", nvrs:v.nv.slice(), chs});
          d.camera.style = v.s; d.camera.loc = v.l; b.devices.push(d);
          vw.nodes[d.id] = boxed ? {x:start.x + 15 + (i % cols) * (w + 20), y:start.y + 40 + Math.floor(i / cols) * (h + 30), boxed:true, w:150, h:64} : {x:start.x + 20 + (i % cols) * (w + 20), y:start.y + 40 + Math.floor(i / cols) * (h + 30), size:52};
          if (v.sw) addLink(b, v.sw, d.id, "poe", {pa:String(v.port + i)}); } });
      toast("✓ " + t("bulkDone",{n:v.n})); }
  });
}
/* ---------- tables ---------- */
function camTable(b){
  const L = cams(b).sort((a, c) => devLabel(a).localeCompare(devLabel(c), undefined, {numeric:true})), q = String(UI.q && UI.q["q-cam"] || "").toLowerCase();
  const R = L.filter(d => !q || [d.name, d.model, d.ip, roomName(b, d.room), floorName(b, d.floor)].join(" ").toLowerCase().includes(q));
  if (!L.length) return `<div class="empty"><h3>${esc(t("camEmptyT"))}</h3><p>${esc(t("camEmpty"))}</p><div class="btns" style="justify-content:center"><button class="btn pri" data-ca="bulk">＋ ${esc(t("bulkT"))}</button></div></div>`;
  const inp = (d, k, w, type = "text") => `<input data-cf="${d.id}:${k}" type="${type}" value="${esc(getPath(d, k) ?? "")}" style="width:${w}">`, s = UI.sel;
  let tot = {mbps:0, tb:0};
  const rows = R.map(d => { const K = camCalc(b, d), nv = nvrOf(b, d), up = upOf(b, d); tot.mbps += K.mbps; tot.tb += K.tb;
    return `<tr class="${s && s.type === "dev" && s.id === d.id ? "on" : ""}"><td class="click nw" data-sel="dev:${d.id}"><b>${esc(devLabel(d))}</b></td><td>${esc([d.brand, d.model].filter(Boolean).join(" "))}</td><td>${esc(t("cs_" + d.camera.style))}</td><td>${inp(d, "camera.mp", "46px", "number")}</td><td>${inp(d, "camera.lens", "60px")}</td><td class="c">${K.fov ? K.fov.toFixed(0) + "°" : "—"}</td><td class="nw small">${K.dori ? K.dori.join(" / ") : "—"}</td>
      <td class="nw">${esc([floorName(b, d.floor), roomName(b, d.room)].filter(Boolean).join(" · "))}</td><td>${inp(d, "ip", "112px")}</td><td class="small" colspan="2">${esc(nvrText(b, d) || "—")}</td>
      <td class="nw">${up.sw ? esc(devLabel(up.sw) + " :" + up.p) : "—"}</td><td class="r">${K.mbps.toFixed(1)}</td><td class="r">${K.tb.toFixed(2)}</td></tr>`; }).join("");
  return `<div class="scroll"><table class="t"><tr><th>${esc(t("f_name"))}</th><th>${esc(t("f_model"))}</th><th>${esc(t("camStyle"))}</th><th>MP</th><th>${esc(t("camLens"))}</th><th>${esc(t("camFov"))}</th><th>DORI (m)</th><th>${esc(t("f_floor"))} / ${esc(t("f_room"))}</th><th>IP</th><th>NVR</th><th>${esc(t("camCh"))}</th><th>Switch :port</th><th>Mbps</th><th>TB</th></tr>${rows}
    <tr class="tot"><td colspan="12">${esc(t("total"))}: ${R.length}</td><td class="r">${tot.mbps.toFixed(0)}</td><td class="r">${tot.tb.toFixed(1)}</td></tr></table></div>`;
}
function nvrView(b){
  const N = nvrs(b), S = cset(b);
  return `<div class="card"><h3>⚙ ${esc(t("cctvSet"))}</h3><div class="two" style="max-width:520px"><label class="fld"><span>${esc(t("camRetain"))}</span><input data-cs="retain" type="number" min="1" value="${esc(S.retain)}"></label><label class="fld"><span>${esc(t("cctvFmt"))}</span><input data-cs="fmt" type="number" step="0.01" min="0.5" max="1" value="${esc(S.fmt)}"></label></div></div>
    ${N.length ? N.map(nv => { const R = nvrCalc(b, nv); return `<div class="card"><h3>🗄 ${esc(devLabel(nv))} <small class="muted">${esc([nv.brand, nv.model].filter(Boolean).join(" "))}</small><span class="grow"></span><button class="btn small" data-ca="allTo:${nv.id}">＋ ${esc(t("nvrAllCams"))}</button><button class="btn small" data-sel="dev:${nv.id}">✎ ${esc(t("edit"))}</button></h3>${nvrBox(b, nv, R)}
      ${R.L.length ? `<div class="scroll"><table class="t"><tr><th>${esc(t("camCh"))}</th><th>${esc(t("f_name"))}</th><th>IP</th><th>MP</th><th>Mbps</th><th>GB/${esc(t("day"))}</th></tr>${R.L.slice().sort((a, c) => num(chOn(a, nv)) - num(chOn(c, nv))).map(d => { const K = camCalc(b, d); return `<tr class="click" data-sel="dev:${d.id}"><td class="c">${esc(chOn(d, nv) || "—")}</td><td>${esc(devLabel(d))}</td><td class="mono">${esc(d.ip)}</td><td class="c">${esc(d.camera.mp)}</td><td class="r">${K.mbps.toFixed(1)}</td><td class="r">${K.gbDay.toFixed(1)}</td></tr>`; }).join("")}</table></div>` : `<p class="muted">${esc(t("nvrNoCams"))}</p>`}</div>`; }).join("") : `<div class="empty"><p>${esc(t("nvrNone"))}</p></div>`}`;
}
function camCsv(b){ saveText(`${fileSafe(b.name)} - CCTV.csv`, csvText([t("f_name"), t("f_brand"), t("f_model"), t("camStyle"), "MP", t("camLens"), t("camFov"), "DORI D/O/R/I (m)", t("f_floor"), t("f_room"), "IP", "MAC", "NVR", t("camCh"), "Switch", "Port", "Mbps", "TB", t("f_status")],
  cams(b).map(d => { const K = camCalc(b, d), nv = nvrOf(b, d), up = upOf(b, d); return [devLabel(d), d.brand, d.model, t("cs_" + d.camera.style), d.camera.mp, d.camera.lens, K.fov ? K.fov.toFixed(0) : "", K.dori ? K.dori.join("/") : "", floorName(b, d.floor), roomName(b, d.room), d.ip, d.mac, nvrsOf(b, d).map(devLabel).join(", "), nvrsOf(b, d).map(x => chOn(d, x)).join(", "), up.sw ? devLabel(up.sw) : "", up.p || "", K.mbps.toFixed(1), K.tb.toFixed(2), t("st_" + d.status)]; })), "csv", "text/csv"); }
function docBody(b){
  const v = view(b, cfg.id), by = {};
  cams(b).forEach(d => { const k = [d.camera.loc, d.camera.style, d.brand + " " + d.model, d.camera.mp, d.camera.lens].join("|"); (by[k] = by[k] || {d, n:0}).n++; });
  return `${Object.keys(v.nodes).length || v.boxes.length ? `<div style="border:1px solid #c7d1e6;border-radius:6px;overflow:hidden">${dgSvg(b, cfg, {print:true}).replace(/width="[\d.]+" height="[\d.]+"/, 'width="100%"')}</div>` : ""}
    <div style="display:grid;grid-template-columns:1.3fr 1fr;gap:12px;margin-top:12px"><div><h3>${esc(t("camSpec"))}</h3><table class="t"><tr><th>${esc(t("camLoc"))}</th><th>${esc(t("camStyle"))}</th><th>${esc(t("f_model"))}</th><th>MP</th><th>${esc(t("camLens"))}</th><th>${esc(t("camFov"))}</th><th>DORI (m)</th><th>${esc(t("qty"))}</th></tr>
      ${Object.values(by).map(({d, n}) => { const K = camCalc(b, d); return `<tr><td>${esc(t(d.camera.loc === "out" ? "camOut" : "camIn"))}</td><td>${esc(t("cs_" + d.camera.style))}</td><td>${esc([d.brand, d.model].filter(Boolean).join(" ") || "—")}</td><td class="c">${esc(d.camera.mp)}</td><td>${esc(d.camera.lens)} mm</td><td class="c">${K.fov ? K.fov.toFixed(0) + "°" : "—"}</td><td>${K.dori ? K.dori.join(" / ") : "—"}</td><td class="c"><b>${n}</b></td></tr>`; }).join("")}<tr class="tot"><td colspan="7">${esc(t("total"))}</td><td class="c">${cams(b).length}</td></tr></table></div>
    <div><h3>NVR</h3><table class="t"><tr><th>NVR</th><th>${esc(t("nvrCh"))}</th><th>Mbps</th><th>TB</th><th>${esc(t("days"))}</th></tr>${nvrs(b).map(nv => { const R = nvrCalc(b, nv); return `<tr><td>${esc(devLabel(nv))}</td><td class="c">${R.cams}/${esc(nv.nvrp.channels)}</td><td class="r">${Math.round(R.mbps)}</td><td class="r">${R.tb.toFixed(1)} / ${R.usable ? R.usable.toFixed(1) : "—"}</td><td class="r">${R.usable ? Math.floor(R.days) : "—"}</td></tr>`; }).join("")}</table></div></div>
    <h3>${esc(t("camList"))}</h3><table class="t"><tr><th>${esc(t("f_name"))}</th><th>${esc(t("f_room"))}</th><th>IP</th><th>NVR · ${esc(t("camCh"))}</th><th>Switch :port</th></tr>${cams(b).sort((a, c) => devLabel(a).localeCompare(devLabel(c), undefined, {numeric:true})).map(d => { const nv = nvrOf(b, d), up = upOf(b, d); return `<tr><td>${esc(devLabel(d))}</td><td>${esc(roomName(b, d.room))}</td><td class="mono">${esc(d.ip)}</td><td>${esc(nvrText(b, d) || "—")}</td><td>${up.sw ? esc(devLabel(up.sw) + " :" + up.p) : "—"}</td></tr>`; }).join("")}</table>`;
}
registerApp({
  id:"cctv", name:"app_cctv", desc:"app_cctv_d", docName:"doc_cctv", color:"#d0453b", dg:cfg,
  glyph:`<path d="M9 17l22-4 6 4v8l-6 4-22-3z" fill="#fff"/><circle cx="35" cy="21" r="3" fill="#1d2433"/><path d="M19 28v8h-4M13 38h12" stroke="#fff" stroke-width="3"/>`,
  tabs:[
    {id:"map", label:"tabMap", icon:"🗺", palette:() => `<div class="psec"><button class="btn pri" style="width:100%" data-ca="bulk">📷 ${esc(t("bulkT"))}</button></div>` + dgPalette(B(), cfg),
      render(){ const b = B(), v = view(b, cfg.id); document.body.classList.toggle("linkmode", DG.mode === "link"); return `${warnBox(cWarnings(b))}${!Object.keys(v.nodes).length && !v.boxes.length ? `<div class="empty"><h3>${esc(t("camEmptyT"))}</h3><p>${esc(t("camEmpty"))}</p></div>` : ""}<div id="dgwrap">${dgSvg(b, cfg)}</div><p class="dghint">${esc(DG.mode === "link" ? t("hintLink") : t("hintMap"))}</p>`; },
      tour:() => [{sel:"#appsw", title:t("tShellT1"), text:t("tShell1")}, {sel:'[data-ca="bulk"]', title:t("tCcT1"), text:t("tCc1")}, {sel:"#pal .pgrid", title:t("tCcT2"), text:t("tCc2")}, {sel:'[data-tab="cams"]', title:t("tCcT3"), text:t("tCc3")}, {sel:'[data-tab="nvr"]', title:t("tCcT4"), text:t("tCc4")}]},
    {id:"cams", label:"tabCams", icon:"📷", render(){ const b = B(); return `${warnBox(cWarnings(b))}<div class="row" style="margin-bottom:10px">${searchBox("q-cam")}<span class="grow"></span><button class="btn small" data-ca="bulk">＋ ${esc(t("bulkT"))}</button><button class="btn small" data-ca="csv">⤓ CSV</button></div>${camTable(b)}`; }},
    {id:"nvr", label:"tabNvr", icon:"🗄", render(){ return nvrView(B()); }},
    docTab("cctv", docBody)
  ],
  actions(tab){ const a = [{id:"bulk", icon:"📷", label:"bulkT", fn:bulkAdd}, {id:"places", icon:"🏢", label:"places", fn:() => openPlaces()}]; if (tab.id === "map") a.unshift({id:"link", icon:"🔗", label:"linkMode", on:DG.mode === "link", fn:() => { DG.mode = DG.mode === "link" ? "select" : "link"; DG.media = DG.media || "poe"; DG.linkFrom = null; render(); }}); return a; },
  drawer(tab){ const b = B(), s = UI.sel; if (!s) return ""; if (tab.id === "map") return dgDrawer(b, cfg);
    if (s.type === "dev"){ const d = devById(b, s.id); return d ? deviceEditor(b, d, {extra:camExtra}) : ""; } if (s.type === "link"){ const l = linkById(b, s.id); return l ? linkEditor(b, l) : ""; } return ""; },
  onDrawerAct:(k, el) => { if (k.startsWith("cnvrRm:")){ const b = B(), d = UI.sel && devById(b, UI.sel.id), id = k.slice(7); if (d) edit(() => { d.nvrs = d.nvrs.filter(x => x !== id); delete d.chs[id]; }); return; } return dgDrawerAct(cfg, k, el); }, onField:(p, v, el) => dgField(cfg, p, v, el),
  onKey(e, tab){ if (tab.id === "map") dgKey(cfg, e); }, onEsc(){ return dgEsc(); },
  exports(){ const b = B(); return [{icon:"🖼", label:t("exPng"), fn:() => exportDiagram(cfg, "png")}, {icon:"◇", label:t("exSvg"), fn:() => exportDiagram(cfg, "svg")}, {icon:"▦", label:t("camCsv"), fn:() => camCsv(b)}]; },
  reveal(s){ if (s && s.type === "dev"){ UI.tabs.cctv = "map"; render(); } },
  guide:() => [[t("gCc1h"), t("gCc1")], [t("gCc2h"), t("gCc2")], [t("gCc3h"), t("gCc3")], [t("gCc4h"), t("gCc4")]]
});
document.addEventListener("click", e => { if (UI.app !== "cctv") return; const a = e.target.closest("[data-ca]"); if (!a) return; const k = a.dataset.ca;
  if (k === "bulk") bulkAdd(); else if (k === "csv") camCsv(B());
  else if (k.startsWith("allTo:")){ const id = k.slice(6), b = B(); edit(() => { const used = new Set(cams(b).filter(c => c.nvrs.includes(id)).map(c => +c.chs[id]).filter(Boolean)); let ch = 1;
    cams(b).forEach(c => { if (c.nvrs.includes(id)) return; c.nvrs.push(id); while (used.has(ch)) ch++; c.chs[id] = String(ch); used.add(ch); }); }); toast("✓ " + t("nvrAllDone")); } });
document.addEventListener("change", e => { if (UI.app !== "cctv") return; const el = e.target, s = UI.sel, b = B(), d = s && s.type === "dev" && devById(b, s.id); if (!d || d.kind !== "camera") return;
  if (el.dataset.cch){ edit(() => { d.chs[el.dataset.cch] = String(Math.max(1, Math.round(num(el.value, 1)))); }); }
  else if (el.dataset.cnvr && el.value){ const id = el.value; edit(() => { if (!d.nvrs.includes(id)){ const used = new Set(cams(b).filter(c => c.nvrs.includes(id)).map(c => +c.chs[id]).filter(Boolean)); let ch = 1; while (used.has(ch)) ch++; d.nvrs.push(id); d.chs[id] = String(ch); } }); } });
document.addEventListener("change", e => { if (UI.app !== "cctv") return; const el = e.target;
  if (el.dataset.cf){ const [id, k] = el.dataset.cf.split(/:(.+)/), d = devById(B(), id); if (!d) return; if (k === "ip" && el.value && !IP.valid(el.value)) toast("⚠ " + t("ipBad")); edit(() => { setPath(d, k, NUMF.has(k) ? num(el.value, 0) : el.value.trim()); }); return; }
  if (el.dataset.cs){ const S = cset(B()); edit(() => { S[el.dataset.cs] = el.dataset.cs === "fmt" ? clamp(num(el.value, .9), .5, 1) : Math.max(1, Math.round(num(el.value, 30))); }); } });
APPS.cctv.init = () => dgWire(cfg);
window.CCTV = {camCalc, nvrCalc};
})();
