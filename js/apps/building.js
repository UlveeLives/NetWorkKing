// Building structure: floors and rooms of every building, drawn on a floor plan by drag and drop, with small ready-made
// shapes for structure (rooms, corridors, stairs, lifts, doors, windows, columns) and devices (data outlets, APs, cameras,
// TVs, phones, racks …). A guided set-up asks for floors, rooms, server rooms and what each room needs.
// Everything is shared building data: rooms with a plan rectangle are the same rooms Wi-Fi Plan uses, devices placed here
// are the same devices in every other app.
"use strict";
(function(){
const RT = {office:["#e8f0ff","#2f5fc4"], meeting:["#f1e8ff","#6a3aa0"], server:["#ffe9e6","#b3262f"], corridor:["#f2f3f5","#7b8494"], lobby:["#e6f6ef","#1f8a5a"],
  kitchen:["#fff4e0","#b26a00"], wc:["#e9f6fb","#11706f"], storage:["#f5efe6","#8a6d3b"], technical:["#eceff3","#3a4552"], other:["#f7f7f7","#59607a"]};
const RTYPES = Object.keys(RT);
// what a room can need (requirement counts), in this order everywhere
const RK = ["outlet","ap","camera","tv","phone","printer","pc","access","intercom","touch","sensor","iot"];
const RK_SHORT = {outlet:"D", ap:"AP", camera:"CAM", tv:"TV", phone:"TEL", printer:"PRN", pc:"PC", access:"ACS", intercom:"INT", touch:"TP", sensor:"SNS", iot:"IoT"};
// default needs per room type (the set-up fills these in; the user changes them)
const RDEF = {office:{outlet:4, phone:1}, meeting:{outlet:2, tv:1}, server:{outlet:2, camera:1, access:1}, corridor:{camera:1}, lobby:{outlet:2, camera:1, tv:1, access:1},
  kitchen:{outlet:1}, wc:{}, storage:{}, technical:{outlet:1}, other:{outlet:2}};
// structure shapes (not devices)
const ITEMS = {stairs:{w:3, h:5}, elevator:{w:2, h:2}, shaft:{w:1, h:1}, door:{w:1, h:.2}, window:{w:1.5, h:.2}, column:{w:.5, h:.5}, label:{w:4, h:1}};
const DEVK = ["outlet","ap","camera","tv","phone","printer","pc","laptop","access","intercom","touch","sensor","iot","switch","nvr","server","ups","workstation","monitor"];
let drag = null, place = null, lastDown = null;
const st = () => { UI.bld = UI.bld || {labels:true, grid:true}; return UI.bld; };

/* ---------- helpers ---------- */
const plan = f => f.plan;
const curFloor = b => { const S = st(); let f = b.floors.find(x => x.id === S.floor); if (!f){ f = b.floors[0] || null; S.floor = f ? f.id : null; } return f; };
const roomsOf = (b, f) => b.rooms.filter(r => r.floor === f.id);
const geoRooms = (b, f) => roomsOf(b, f).filter(r => r.geo);
function normRoom(r){ r.type = RT[r.type] ? r.type : (/server|serv/i.test(r.name) ? "server" : /dəhliz|koridor|corridor|holl/i.test(r.name) ? "corridor" : "office"); r.req = r.req && typeof r.req === "object" ? r.req : {}; return r; }
function posOf(d){ if (d.kind === "ap") return d.ap && d.ap.x !== null && d.ap.x !== undefined && d.ap.x !== "" ? {x:num(d.ap.x), y:num(d.ap.y)} : null; return d.pos && d.pos.x !== undefined ? {x:num(d.pos.x), y:num(d.pos.y)} : null; }
function setPos(d, x, y){ if (d.kind === "ap"){ d.ap.x = r1(x); d.ap.y = r1(y); } else d.pos = {x:r1(x), y:r1(y)}; }
function clearPos(d){ if (d.kind === "ap"){ d.ap.x = null; d.ap.y = null; } else delete d.pos; }
const devFloor = (b, d) => d.floor || (d.room && (roomById(b, d.room) || {}).floor) || "";
const roomAtPt = (b, f, x, y) => { const L = geoRooms(b, f).filter(r => x >= r.geo.x && x <= r.geo.x + r.geo.w && y >= r.geo.y && y <= r.geo.y + r.geo.h); return L.filter(r => r.type !== "corridor")[0] || L[0] || null; };
const placedIn = (b, r, k) => b.devices.filter(d => d.room === r.id && d.kind === k).length;
const reqOf = (r, k) => num(r.req && r.req[k]);
const area = r => r.geo ? r1(r.geo.w * r.geo.h) : 0;
function fixFloorPlan(f){ const p = f.plan; p.items = Array.isArray(p.items) ? p.items : []; f.h = f.h || 3.5; return p; }
function snap(v){ return st().grid ? Math.round(v * 2) / 2 : r1(v); }

/* ---------- the floor plan (SVG) ---------- */
function scaleFor(f){ const W = Math.max(320, (($("#view") && $("#view").clientWidth) || 1000) - 40); return clamp(W / Math.max(4, num(f.plan.wm, 40)), 6, 70); }
function planSvg(b, f, opts = {}){
  const p = fixFloorPlan(f), s = opts.s || scaleFor(f), W = p.wm * s, H = p.hm * s, sel = opts.print ? null : UI.sel, S = st();
  const isSel = (type, id) => sel && sel.type === type && sel.id === id;
  let h = `<rect class="bfl" x="0" y="0" width="${W}" height="${H}" fill="#fff" stroke="#1d2433" stroke-width="2.5"/>`;
  if (p.img && assetURL(p.img)) h += `<image href="${assetURL(p.img)}" x="0" y="0" width="${W}" height="${H}" preserveAspectRatio="none" opacity="${num(p.op, 60) / 100}"/>`;
  if (S.grid && !opts.print){ let g = ""; for (let x = 1; x < p.wm; x++) g += `M${x * s} 0V${H}`; for (let y = 1; y < p.hm; y++) g += `M0 ${y * s}H${W}`; h += `<path d="${g}" stroke="#e8ebf0" stroke-width="1"/>`; }
  geoRooms(b, f).forEach(r => { normRoom(r); const g = r.geo, [bg, fg] = RT[r.type], x = g.x * s, y = g.y * s, w = g.w * s, hh = g.h * s, on = isSel("room", r.id);
    const miss = RK.filter(k => reqOf(r, k) > placedIn(b, r, k)), sum = RK.filter(k => reqOf(r, k)).map(k => `${RK_SHORT[k]} ${placedIn(b, r, k)}/${reqOf(r, k)}`).join(" · ");
    h += `<g class="brm" data-room="${r.id}"><rect x="${x}" y="${y}" width="${w}" height="${hh}" fill="${bg}" fill-opacity=".82" stroke="${fg}" stroke-width="${on ? 3 : 1.6}"${r.type === "corridor" ? ' stroke-dasharray="6 4"' : ""}/>
      <text x="${x + 6}" y="${y + 15}" font-size="${clamp(s * .45, 10, 14)}" font-weight="700" fill="${fg}">${esc(r.name)}</text>
      ${w > 70 ? `<text x="${x + 6}" y="${y + 28}" font-size="9.5" fill="#4b5262">${esc(area(r) + " m²" + (num(r.users) ? " · 👤" + num(r.users) : ""))}</text>` : ""}
      ${sum && w > 90 ? `<text x="${x + 6}" y="${y + hh - 6}" font-size="9" fill="${miss.length ? "#b3262f" : "#1f7a35"}">${esc(sum)}</text>` : ""}</g>`;
    if (on && !opts.print) h += `<rect class="bres" data-res="room:${r.id}" x="${x + w - 7}" y="${y + hh - 7}" width="14" height="14" rx="3"/>`; });
  p.items.forEach(it => { const x = it.x * s, y = it.y * s, w = it.w * s, hh = it.h * s, on = isSel("bitem", it.id), c = "#3a4552";
    let g = "";
    if (it.type === "stairs"){ g = `<rect width="${w}" height="${hh}" fill="#fff" stroke="${c}" stroke-width="1.5"/>`; const n = Math.max(3, Math.round(it.h / .3)); for (let i = 1; i < n; i++) g += `<line x1="0" y1="${hh * i / n}" x2="${w}" y2="${hh * i / n}" stroke="${c}" stroke-width=".8"/>`; g += `<path d="M${w / 2} ${hh - 4}V6M${w / 2 - 4} 12L${w / 2} 5L${w / 2 + 4} 12" stroke="${c}" fill="none" stroke-width="1.2"/>`; }
    else if (it.type === "elevator") g = `<rect width="${w}" height="${hh}" fill="#fff" stroke="${c}" stroke-width="1.8"/><path d="M0 0L${w} ${hh}M${w} 0L0 ${hh}" stroke="${c}" stroke-width="1"/>`;
    else if (it.type === "shaft") g = `<rect width="${w}" height="${hh}" fill="#d9dde6" stroke="${c}" stroke-width="1.2"/><path d="M0 ${hh}L${w} 0" stroke="${c}"/>`;
    else if (it.type === "door") g = `<rect width="${w}" height="${Math.max(3, hh)}" fill="#fff" stroke="#b0702a" stroke-width="1.5"/><path d="M0 0A${w} ${w} 0 0 1 ${w} ${w}" fill="none" stroke="#b0702a" stroke-width=".8" stroke-dasharray="3 2"/>`;
    else if (it.type === "window") g = `<rect width="${w}" height="${Math.max(3, hh)}" fill="#d6ecff" stroke="#3b82c4" stroke-width="1.5"/>`;
    else if (it.type === "column") g = `<rect width="${w}" height="${hh}" fill="#59607a"/>`;
    else g = `<text x="2" y="${Math.min(hh, 16) - 3}" font-size="${clamp(it.size || 12, 8, 30)}" font-weight="700" fill="#1d2433">${esc(it.text || t("bd_label"))}</text>`;
    h += `<g class="bit" data-bitem="${it.id}" transform="translate(${x} ${y})${it.rot ? ` rotate(${it.rot} ${w / 2} ${hh / 2})` : ""}">${g}${on && !opts.print ? `<rect width="${w}" height="${Math.max(hh, 4)}" fill="none" stroke="#ffb703" stroke-width="2.5" stroke-dasharray="5 3"/>` : ""}</g>`;
    if (on && !opts.print && it.type !== "label") h += `<rect class="bres" data-res="bitem:${it.id}" x="${x + w - 6}" y="${y + Math.max(hh, 4) - 6}" width="12" height="12" rx="3"/>`; });
  b.racks.filter(r => r.floor === f.id && r.pos).forEach(r => { const x = r.pos.x * s, y = r.pos.y * s, on = isSel("rack", r.id);
    h += `<g class="bdev" data-brack="${r.id}" transform="translate(${x} ${y})"><rect x="-10" y="-13" width="20" height="26" rx="2" fill="#232a33" stroke="${on ? "#ffb703" : "#fff"}" stroke-width="${on ? 3 : 1.2}"/><path d="M-6 -8h12M-6 -3h12M-6 2h12M-6 7h12" stroke="#7fd1ff" stroke-width="1.6"/>
      ${S.labels ? `<text y="24" font-size="9" font-weight="700" text-anchor="middle" fill="#1d2433" stroke="#fff" stroke-width="2.5" paint-order="stroke">${esc(r.name)}</text>` : ""}</g>`; });
  b.devices.filter(d => devFloor(b, d) === f.id && posOf(d)).forEach(d => { const P0 = posOf(d), x = P0.x * s, y = P0.y * s, on = isSel("dev", d.id) || UI.multi.has("dev:" + d.id);
    h += `<g class="bdev" data-bdev="${d.id}" transform="translate(${x} ${y})"><circle r="11" fill="#fff" stroke="${on ? "#ffb703" : "#1d2433"}" stroke-width="${on ? 3 : 1.1}"/><g transform="translate(-9 -9) scale(.375)">${ICO[devIcon(d)] || ICO.box}</g>
      ${S.labels ? `<text y="21" font-size="8.5" font-weight="700" text-anchor="middle" fill="#1d2433" stroke="#fff" stroke-width="2.5" paint-order="stroke">${esc(d.name)}</text>` : ""}</g>`; });
  const m = [1,2,5,10,20].find(v => v * s >= 50) || 20;
  h += `<g transform="translate(${W - m * s - 12} ${H - 12})" pointer-events="none"><rect x="-4" y="-14" width="${m * s + 8}" height="18" fill="#fff" opacity=".85" rx="3"/><path d="M0 0V-5M0 0H${m * s}V-5" stroke="#1d2433" fill="none" stroke-width="1.5"/><text x="${m * s / 2}" y="-5" font-size="9.5" font-weight="700" text-anchor="middle">${m} m</text></g>`;
  return `<svg class="bplan" data-bfloor="${f.id}" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" font-family="Barlow,Segoe UI,Arial,sans-serif">${h}</svg>`;
}

/* ---------- plan page ---------- */
function crumbs(b, f){ return `<div class="bcrumb"><span>🏢 <b>${esc(b.name)}</b></span>${f ? `<span>›</span><span>🏬 <b>${esc(f.name)}</b> <small class="muted">${esc(r1(f.plan.wm) + " × " + r1(f.plan.hm) + " m · " + roomsOf(b, f).length + " " + t("bd_roomsN"))}</small></span>` : ""}</div>`; }
function floorChips(b, f){ return `<div class="bfloors">${b.floors.slice().reverse().map(x => `<button class="bfchip${f && x.id === f.id ? " on" : ""}" data-bfl="${x.id}">🏬 ${esc(x.name)} <small>${roomsOf(b, x).length}</small></button>`).join("")}<button class="bfchip add" data-ba="addFloor">＋ ${esc(t("floorNew"))}</button></div>`; }
function planView(){
  const b = B(), f = curFloor(b);
  if (!f) return `<div class="empty"><h3>${esc(t("bd_emptyT"))}</h3><p>${esc(t("bd_empty"))}</p><div class="btns" style="justify-content:center"><button class="btn pri" data-ba="wizard">🧭 ${esc(t("bd_wizard"))}</button><button class="btn" data-ba="addFloor">＋ ${esc(t("floorNew"))}</button></div></div>`;
  return `${crumbs(b, f)}${floorChips(b, f)}${warnBox(bWarnings(b, f))}<div class="bwrap">${planSvg(b, f)}</div><p class="dghint">${esc(place ? t("bd_hintPlace") : t("bd_hint"))}</p>`;
}
function palette(){
  const b = B(), f = curFloor(b); if (!f) return "";
  const P = (key, label, ic) => `<div class="pitem bpi${place === key ? " on" : ""}" draggable="true" data-bplace="${key}" title="${esc(label)}">${ic}<span>${esc(label)}</span></div>`;
  const svgI = ic => `<svg viewBox="0 0 48 48">${ICO[ic] || ICO.box}</svg>`;
  const unplaced = b.devices.filter(d => devFloor(b, d) === f.id && !posOf(d) && DEVK.includes(d.kind));
  return `<div class="psec"><h4>${esc(t("bd_struct"))}</h4><div class="pgrid">
      ${P("room:office", t("bd_room"), `<svg viewBox="0 0 48 48"><rect x="6" y="10" width="36" height="28" fill="#e8f0ff" stroke="#2f5fc4" stroke-width="3"/></svg>`)}
      ${P("room:corridor", t("rt_corridor"), `<svg viewBox="0 0 48 48"><rect x="4" y="18" width="40" height="12" fill="#f2f3f5" stroke="#7b8494" stroke-width="2.5" stroke-dasharray="5 3"/></svg>`)}
      ${P("room:server", t("rt_server"), `<svg viewBox="0 0 48 48"><rect x="6" y="10" width="36" height="28" fill="#ffe9e6" stroke="#b3262f" stroke-width="3"/><rect x="18" y="16" width="12" height="16" fill="#232a33"/></svg>`)}
      ${P("item:stairs", t("bi_stairs"), `<svg viewBox="0 0 48 48"><rect x="12" y="6" width="24" height="36" fill="#fff" stroke="#3a4552" stroke-width="2"/><path d="M12 14h24M12 22h24M12 30h24M12 38h24" stroke="#3a4552"/></svg>`)}
      ${P("item:elevator", t("bi_elevator"), `<svg viewBox="0 0 48 48"><rect x="10" y="10" width="28" height="28" fill="#fff" stroke="#3a4552" stroke-width="2.5"/><path d="M10 10L38 38M38 10L10 38" stroke="#3a4552"/></svg>`)}
      ${P("item:door", t("bi_door"), `<svg viewBox="0 0 48 48"><path d="M10 34h28" stroke="#b0702a" stroke-width="4"/><path d="M10 34A26 26 0 0 1 36 8" fill="none" stroke="#b0702a" stroke-dasharray="3 2"/></svg>`)}
      ${P("item:window", t("bi_window"), `<svg viewBox="0 0 48 48"><rect x="6" y="20" width="36" height="8" fill="#d6ecff" stroke="#3b82c4" stroke-width="2.5"/></svg>`)}
      ${P("item:column", t("bi_column"), `<svg viewBox="0 0 48 48"><rect x="16" y="16" width="16" height="16" fill="#59607a"/></svg>`)}
      ${P("item:shaft", t("bi_shaft"), `<svg viewBox="0 0 48 48"><rect x="12" y="12" width="24" height="24" fill="#d9dde6" stroke="#3a4552" stroke-width="2"/><path d="M12 36L36 12" stroke="#3a4552" stroke-width="2"/></svg>`)}
      ${P("item:label", t("bd_label"), `<svg viewBox="0 0 48 48">${ICO.text || ""}</svg>`)}
    </div></div>
    <div class="psec"><h4>${esc(t("bd_devs"))}</h4><div class="pgrid">${DEVK.map(k => P("dev:" + k, kindName(k), svgI(KINDS[k].icon))).join("")}${P("rack", t("k_rack") === "k_rack" ? "Rack" : t("k_rack"), svgI("rack"))}</div></div>
    ${unplaced.length ? `<div class="psec"><h4>${esc(t("bd_unplaced"))} <span class="cnt">${unplaced.length}</span></h4><div class="ulist">${unplaced.slice(0, 60).map(d => `<button class="ub${place === "put:" + d.id ? " on" : ""}" data-bput="${d.id}">${esc(devLabel(d))}${d.room ? ` <small class="muted">${esc(roomName(b, d.room))}</small>` : ""}</button>`).join("")}</div></div>` : ""}
    <div class="psec"><h4>${esc(t("palView"))}</h4><label class="chk"><input type="checkbox" data-bopt="labels"${st().labels ? " checked" : ""}> ${esc(t("bd_labels"))}</label><label class="chk"><input type="checkbox" data-bopt="grid"${st().grid ? " checked" : ""}> ${esc(t("bd_grid"))}</label>
      <button class="btn small wfull" data-ba="wizard">🧭 ${esc(t("bd_wizard"))}</button></div>`;
}

/* ---------- structure page: building → floors → rooms ---------- */
function structView(){
  const b = B();
  if (!b.floors.length) return planView();
  const F = b.floors.slice().reverse();
  return `<div class="card"><h3>🏢 ${esc(b.name)}<span class="grow"></span><button class="btn small" data-ba="wizard">🧭 ${esc(t("bd_wizard"))}</button><button class="btn small" data-ba="addFloor">＋ ${esc(t("floorNew"))}</button></h3>
    <p class="muted small">${esc(t("bd_structHint"))}</p>
    <div class="kpis">${[[b.floors.length, t("floors")], [b.rooms.length, t("rooms")], [r1(b.floors.reduce((a, f) => a + num(f.plan.wm) * num(f.plan.hm), 0)) + " m²", t("bd_areaTot")], [b.devices.length, t("devices")]].map(([v, l]) => `<div class="kpi"><b>${esc(v)}</b><span>${esc(l)}</span></div>`).join("")}</div>
    <div class="btree">${F.map(f => { const R = roomsOf(b, f), i = b.floors.indexOf(f);
      return `<div class="bfcard"><div class="bfhead"><b>🏬</b><input class="bin" data-bfn="${f.id}" value="${esc(f.name)}"><small class="muted">${esc(r1(f.plan.wm) + " × " + r1(f.plan.hm) + " m · " + R.length + " " + t("bd_roomsN"))}</small><span class="grow"></span>
        <button class="btn small" data-ba="goFloor:${f.id}">🗺 ${esc(t("bd_openPlan"))}</button><button class="btn small" data-ba="fUp:${f.id}"${i === b.floors.length - 1 ? " disabled" : ""} title="${esc(t("bd_up"))}">▲</button><button class="btn small" data-ba="fDown:${f.id}"${i === 0 ? " disabled" : ""} title="${esc(t("bd_down"))}">▼</button><button class="btn small" data-ba="addRoom:${f.id}">＋ ${esc(t("roomNew"))}</button><button class="btn small dan" data-ba="delFloor:${f.id}">🗑</button></div>
        ${R.length ? `<div class="scroll"><table class="t"><tr><th>${esc(t("f_room"))}</th><th>${esc(t("bd_type"))}</th><th>m²</th><th>👤</th>${RK.map(k => `<th title="${esc(kindName(k))}">${RK_SHORT[k]}</th>`).join("")}<th></th></tr>
          ${R.map(r => { normRoom(r); return `<tr${UI.sel && UI.sel.type === "room" && UI.sel.id === r.id ? ' class="on"' : ""}><td><input data-brn="${r.id}" value="${esc(r.name)}" style="min-width:130px"></td><td><select data-brt="${r.id}">${RTYPES.map(k => opt(k, t("rt_" + k), r.type)).join("")}</select></td><td class="c">${area(r) || "—"}</td><td><input data-bru="${r.id}" type="text" inputmode="numeric" value="${esc(num(r.users) || "")}" style="width:44px"></td>
            ${RK.map(k => { const q = reqOf(r, k), pl = placedIn(b, r, k); return `<td class="c"><input class="breq${q && pl < q ? " miss" : q && pl >= q ? " ok" : ""}" data-brq="${r.id}:${k}" type="text" inputmode="numeric" value="${q || ""}" title="${esc(kindName(k) + ": " + pl + " / " + q)}">${pl ? `<small>${pl}</small>` : ""}</td>`; }).join("")}
            <td class="nw"><button class="btn small" data-ba="selRoom:${r.id}" title="${esc(t("bd_openPlan"))}">🗺</button><button class="btn small dan" data-ba="delRoom:${r.id}">×</button></td></tr>`; }).join("")}</table></div>` : `<p class="muted small">${esc(t("bd_noRooms"))}</p>`}</div>`; }).join("")}</div></div>`;
}
/* ---------- needs page: what is required vs what is placed ---------- */
function reqView(){
  const b = B(); if (!b.rooms.length) return `<div class="empty"><p>${esc(t("bd_noRooms"))}</p></div>`;
  const tot = {}, totP = {}; RK.forEach(k => { tot[k] = 0; totP[k] = 0; });
  const rows = b.floors.slice().reverse().map(f => { const R = roomsOf(b, f); if (!R.length) return "";
    return `<tr class="tot"><td colspan="${RK.length + 2}">🏬 ${esc(f.name)}</td></tr>` + R.map(r => `<tr><td>${esc(r.name)}</td><td class="small">${esc(t("rt_" + normRoom(r).type))}</td>${RK.map(k => { const q = reqOf(r, k), pl = placedIn(b, r, k); tot[k] += q; totP[k] += pl; return `<td class="c ${q && pl < q ? "bad" : q ? "ok" : ""}">${q || pl ? `${pl}/${q}` : ""}</td>`; }).join("")}</tr>`).join(""); }).join("");
  const missing = RK.reduce((a, k) => a + Math.max(0, tot[k] - totP[k]), 0);
  return `<div class="card"><h3>📋 ${esc(t("bd_reqT"))}<span class="grow"></span>${missing ? `<button class="btn pri small" data-ba="createAll">＋ ${esc(t("bd_createAll",{n:missing}))}</button>` : ""}<button class="btn small" data-ba="reqCsv">⤓ CSV</button></h3><p class="muted small">${esc(t("bd_reqHint"))}</p>
    <div class="scroll"><table class="t"><tr><th>${esc(t("f_room"))}</th><th>${esc(t("bd_type"))}</th>${RK.map(k => `<th title="${esc(kindName(k))}">${RK_SHORT[k]}</th>`).join("")}</tr>${rows}
    <tr class="tot"><td colspan="2">${esc(t("total"))}</td>${RK.map(k => `<td class="c">${totP[k]}/${tot[k]}</td>`).join("")}</tr></table></div>
    <p class="muted small">${RK.map(k => `${RK_SHORT[k]} = ${kindName(k)}`).join(" · ")}</p></div>`;
}
function docBody(b){
  return b.floors.slice().reverse().map(f => `<h3>🏬 ${esc(f.name)} <small class="muted">${esc(r1(f.plan.wm) + " × " + r1(f.plan.hm) + " m")}</small></h3><div style="border:1px solid #c7d1e6">${planSvg(b, f, {print:true, s:clamp(1100 / Math.max(4, num(f.plan.wm, 40)), 4, 60)}).replace(/width="[\d.]+" height="[\d.]+" font/, 'width="100%" font')}</div>`).join("")
    + `<h3>${esc(t("bd_reqT"))}</h3>` + reqView().replace(/<button[^>]*>.*?<\/button>/g, "");
}
function bWarnings(b, f){
  const W = [], R = roomsOf(b, f), miss = R.filter(r => RK.some(k => reqOf(r, k) > placedIn(b, r, k)));
  if (miss.length) W.push(["info", t("bd_wMiss",{n:miss.length, r:miss.slice(0, 4).map(r => r.name).join(", ") + (miss.length > 4 ? " …" : "")})]);
  const nogeo = R.filter(r => !r.geo); if (nogeo.length) W.push(["info", t("bd_wNoGeo",{n:nogeo.length})]);
  const out = R.filter(r => r.geo && (r.geo.x + r.geo.w > f.plan.wm + .01 || r.geo.y + r.geo.h > f.plan.hm + .01 || r.geo.x < 0 || r.geo.y < 0)); if (out.length) W.push(["", t("bd_wOut",{r:out.map(r => r.name).join(", ")}), out[0].id]);
  return W;
}

/* ---------- drawer ---------- */
function drawer(tab){
  const b = B(), s = UI.sel; if (!s) return "";
  if (s.type === "dev"){ const d = devById(b, s.id); return d ? deviceEditor(b, d, {btns:posOf(d) ? `<button class="btn" data-dr="bUnplace">⤴ ${esc(t("removeFromView"))}</button>` : ""}) : ""; }
  if (s.type === "link"){ const l = linkById(b, s.id); return l ? linkEditor(b, l) : ""; }
  const head = (title, sub) => `<div class="dhead"><div><h3>${esc(title)}</h3><div class="muted small">${esc(sub)}</div></div><button class="x" data-dr="close">×</button></div>`;
  if (s.type === "room"){ const r = roomById(b, s.id); if (!r) return ""; normRoom(r); const f = floorById(b, r.floor), g = r.geo;
    return `${head(r.name, (f ? f.name + " · " : "") + (g ? area(r) + " m²" : t("bd_noGeo")))}
      <label class="fld"><span>${esc(t("f_name"))}</span><input data-f="r.name" value="${esc(r.name)}"></label>
      <div class="two"><label class="fld"><span>${esc(t("bd_type"))}</span><select data-f="r.type">${RTYPES.map(k => opt(k, t("rt_" + k), r.type)).join("")}</select></label><label class="fld"><span>${esc(t("f_users"))}</span><input data-f="r.users" type="text" inputmode="numeric" value="${esc(num(r.users))}"></label></div>
      <label class="fld"><span>${esc(t("f_floor"))}</span><select data-f="r.floor">${b.floors.map(x => opt(x.id, x.name, r.floor)).join("")}</select></label>
      ${g ? `<div class="two">${["x","y"].map(k => `<label class="fld"><span>${k.toUpperCase()} (m)</span><input data-f="g.${k}" type="text" inputmode="decimal" value="${esc(g[k])}"></label>`).join("")}</div><div class="two">${[["w", t("f_w")], ["h", t("f_hgt")]].map(([k, l]) => `<label class="fld"><span>${esc(l)} (m)</span><input data-f="g.${k}" type="text" inputmode="decimal" value="${esc(g[k])}"></label>`).join("")}</div>` : `<button class="btn small" data-dr="bDrawRoom">▭ ${esc(t("bd_putOnPlan"))}</button>`}
      ${sec("breq", "📋 " + t("bd_needs"), `<table class="t">${RK.map(k => { const q = reqOf(r, k), pl = placedIn(b, r, k); return `<tr><td>${esc(kindName(k))}</td><td style="width:70px"><input data-f="q.${k}" type="text" inputmode="numeric" value="${q || ""}" style="width:56px"></td><td class="c ${q && pl < q ? "bad" : q ? "ok" : ""}">${pl}/${q}</td></tr>`; }).join("")}</table>
        <button class="btn small" data-dr="bCreate">＋ ${esc(t("bd_createMissing"))}</button>`, true)}
      ${sec("bdevs", "🔌 " + t("devices") + ` <span class="cnt">${b.devices.filter(d => d.room === r.id).length}</span>`, b.devices.filter(d => d.room === r.id).map(d => `<div class="lnk" data-dr="sel:${d.id}"><svg viewBox="0 0 48 48" width="18" height="18">${ICO[devIcon(d)] || ICO.box}</svg><span><b>${esc(devLabel(d))}</b> <small class="muted">${esc(kindName(d.kind))}${posOf(d) ? "" : " · " + t("bd_notOnPlan")}</small></span></div>`).join("") || `<p class="muted small">—</p>`)}
      <div class="btns"><button class="btn" data-dr="bDupRoom">⧉ ${esc(t("duplicate"))}</button><button class="btn dan" data-dr="bDelRoom">🗑 ${esc(t("delete"))}</button></div>`; }
  if (s.type === "bitem"){ const f = curFloor(b), it = f && fixFloorPlan(f).items.find(x => x.id === s.id); if (!it) return "";
    return `${head(t("bi_" + it.type) === "bi_" + it.type ? it.type : t("bi_" + it.type), f.name)}
      ${it.type === "label" ? `<label class="fld"><span>${esc(t("f_text"))}</span><input data-f="i.text" value="${esc(it.text || "")}"></label><label class="fld"><span>${esc(t("bd_fsize"))}</span><input data-f="i.size" type="text" inputmode="numeric" value="${esc(it.size || 12)}"></label>` : ""}
      <div class="two">${["x","y","w","h"].map(k => `<label class="fld"><span>${k === "w" ? esc(t("f_w")) : k === "h" ? esc(t("f_hgt")) : k.toUpperCase()} (m)</span><input data-f="i.${k}" type="text" inputmode="decimal" value="${esc(it[k])}"></label>`).join("")}</div>
      <label class="fld"><span>${esc(t("bd_rot"))}</span><select data-f="i.rot">${[0, 90, 180, 270].map(a => opt(a, a + "°", String(it.rot || 0))).join("")}</select></label>
      <div class="btns"><button class="btn" data-dr="bDupItem">⧉ ${esc(t("duplicate"))}</button><button class="btn dan" data-dr="bDelItem">🗑 ${esc(t("delete"))}</button></div>`; }
  if (s.type === "rack"){ const r = rackById(b, s.id); if (!r) return "";
    return `${head(r.name, t("k_rack") === "k_rack" ? "Rack" : t("k_rack"))}<label class="fld"><span>${esc(t("f_name"))}</span><input data-f="k.name" value="${esc(r.name)}"></label>
      <label class="fld"><span>${esc(t("f_room"))}</span><select data-f="k.room">${opt("", t("none"), r.room)}${roomsOf(b, curFloor(b) || {}).map(x => opt(x.id, x.name, r.room)).join("")}</select></label>
      <div class="btns"><button class="btn" data-dr="bOpenRack">🗄 ${esc(t("bd_openRack"))}</button><button class="btn" data-dr="bUnplace">⤴ ${esc(t("removeFromView"))}</button></div>`; }
  if (s.type === "bfloor"){ const f = floorById(b, s.id); if (!f) return ""; const p = fixFloorPlan(f);
    return `${head(f.name, t("f_floor"))}<label class="fld"><span>${esc(t("f_name"))}</span><input data-f="f.name" value="${esc(f.name)}"></label>
      <div class="two"><label class="fld"><span>${esc(t("f_w"))} (m)</span><input data-f="f.wm" type="text" inputmode="decimal" value="${esc(p.wm)}"></label><label class="fld"><span>${esc(t("bd_depth"))} (m)</span><input data-f="f.hm" type="text" inputmode="decimal" value="${esc(p.hm)}"></label></div>
      <div class="two"><label class="fld"><span>${esc(t("bd_fh"))} (m)</span><input data-f="f.h" type="text" inputmode="decimal" value="${esc(f.h || 3.5)}"></label><span></span></div>
      <div class="btns"><button class="btn" data-dr="bImg">🖼 ${esc(t("wf_loadImg"))}</button>${p.img ? `<button class="btn dan" data-dr="bImgRm">${esc(t("wf_rmImg"))}</button>` : ""}</div>
      <p class="muted small">${esc(t("bd_imgHint"))}</p>`; }
  return "";
}
function onField(path, v){
  const b = B(), s = UI.sel; if (!s) return;
  const n = x => r1(Math.max(0, num(String(x).replace(",", "."), 0)));
  if (s.type === "room"){ const r = roomById(b, s.id); if (!r) return;
    edit(() => { const [g, k] = path.split(".");
      if (g === "r"){ if (k === "users") r.users = Math.round(n(v)); else if (k === "floor"){ r.floor = v; b.devices.forEach(d => { if (d.room === r.id) d.floor = v; }); } else r[k] = String(v).trim() || r[k]; }
      else if (g === "g"){ r.geo[k] = k === "w" || k === "h" ? Math.max(.5, n(v)) : n(v); }
      else if (g === "q"){ r.req[k] = Math.round(n(v)); } }); return; }
  if (s.type === "bitem"){ const f = curFloor(b), it = f && f.plan.items.find(x => x.id === s.id); if (!it) return;
    edit(() => { const k = path.split(".")[1]; if (k === "text") it.text = v; else if (k === "rot") it.rot = num(v); else it[k] = k === "w" || k === "h" ? Math.max(.1, n(v)) : k === "size" ? clamp(n(v), 8, 40) : n(v); }); return; }
  if (s.type === "rack"){ const r = rackById(b, s.id); if (!r) return; edit(() => { const k = path.split(".")[1]; if (k === "name") r.name = String(v).trim() || r.name; else r.room = v; }); return; }
  if (s.type === "bfloor"){ const f = floorById(b, s.id); if (!f) return; edit(() => { const k = path.split(".")[1]; if (k === "name") f.name = String(v).trim() || f.name; else if (k === "h") f.h = Math.max(2, n(v)); else f.plan[k] = Math.max(2, n(v)); }); }
}
async function onDrawerAct(k){
  const b = B(), s = UI.sel; if (!s) return; const f = curFloor(b);
  if (k === "bUnplace"){ edit(() => { if (s.type === "dev"){ const d = devById(b, s.id); if (d) clearPos(d); } else if (s.type === "rack"){ const r = rackById(b, s.id); if (r) delete r.pos; } }); return; }
  if (k === "bOpenRack"){ UI.rackSel = s.id; switchApp("rack"); UI.sel = {type:"rack", id:s.id}; render(); return; }
  if (k === "bImg"){ const id = await pickImage(); if (id) edit(() => { floorById(b, s.id).plan.img = id; }); return; }
  if (k === "bImgRm"){ edit(() => { floorById(b, s.id).plan.img = null; }); return; }
  if (s.type === "room"){ const r = roomById(b, s.id); if (!r) return;
    if (k === "bCreate"){ edit(() => createMissing(b, r)); toast("✓ " + t("bd_created")); return; }
    if (k === "bDelRoom") return delRoom(b, r);
    if (k === "bDupRoom"){ edit(() => { const c = Object.assign(clone(r), {id:uid("r"), name:r.name + " (2)"}); if (c.geo){ c.geo.x = r1(c.geo.x + 1); c.geo.y = r1(c.geo.y + 1); } b.rooms.push(c); UI.sel = {type:"room", id:c.id}; }); return; }
    if (k === "bDrawRoom"){ const fl = floorById(b, r.floor) || f; if (!fl) return; edit(() => { r.geo = freeRect(b, fl, 4, 4); st().floor = fl.id; UI.tabs.building = "plan"; }); return; } }
  if (s.type === "bitem" && f){ const it = f.plan.items.find(x => x.id === s.id); if (!it) return;
    if (k === "bDelItem") edit(() => { f.plan.items = f.plan.items.filter(x => x !== it); UI.sel = null; });
    if (k === "bDupItem") edit(() => { const c = Object.assign(clone(it), {id:uid("i"), x:r1(it.x + .5), y:r1(it.y + .5)}); f.plan.items.push(c); UI.sel = {type:"bitem", id:c.id}; }); }
}
async function delRoom(b, r){
  const n = b.devices.filter(d => d.room === r.id).length;
  const ch = n ? await uiChoice(t("bd_delRoomQ",{r:r.name, n}), [["keep", t("bd_delKeep")], ["all", t("bd_delAll"), "dan"]]) : (await uiConfirm(t("bd_delRoomC",{r:r.name}), t("delete"), true)) ? "keep" : null;
  if (!ch) return;
  edit(() => { if (ch === "all") removeDevices(b, b.devices.filter(d => d.room === r.id).map(d => d.id)); else b.devices.forEach(d => { if (d.room === r.id) d.room = ""; });
    b.racks.forEach(k => { if (k.room === r.id) k.room = ""; }); b.rooms = b.rooms.filter(x => x !== r); UI.sel = null; });
}
// Devices a room still needs: created inside the room (spread along its walls).
function createMissing(b, r){
  const L = []; RK.forEach(k => { for (let i = placedIn(b, r, k); i < reqOf(r, k); i++) L.push(k); });
  const g = r.geo, n = L.length; let i = 0;
  L.forEach(k => { const d = newDevice(k, {floor:r.floor, room:r.id}); d.name = autoName(b, k); b.devices.push(d);
    if (g){ const per = Math.max(1, Math.ceil(n / 2)), row = i < per ? 0 : 1, col = row ? i - per : i, cnt = row ? n - per : per;
      setPos(d, g.x + g.w * (col + 1) / (cnt + 1), row ? g.y + g.h - Math.min(.8, g.h * .2) : g.y + (k === "ap" || k === "camera" || k === "sensor" ? g.h / 2 : Math.min(1.8, g.h * .4))); }
    i++; });
  return L.length;
}
function freeRect(b, f, w, h){ const p = fixFloorPlan(f); for (let y = 0; y + h <= p.hm; y += .5) for (let x = 0; x + w <= p.wm; x += .5){ if (!geoRooms(b, f).some(r => x < r.geo.x + r.geo.w && x + w > r.geo.x && y < r.geo.y + r.geo.h && y + h > r.geo.y)) return {x, y, w, h}; } return {x:0, y:0, w, h}; }

/* ---------- placing and dragging on the plan ---------- */
function ptOf(e, svg, f){ const R = svg.getBoundingClientRect(); return {x:clamp((e.clientX - R.left) / R.width * f.plan.wm, 0, f.plan.wm), y:clamp((e.clientY - R.top) / R.height * f.plan.hm, 0, f.plan.hm)}; }
function doPlace(key, b, f, p){
  edit(() => {
    if (key.startsWith("room:")){ const type = key.slice(5), w = type === "corridor" ? 8 : 4, h = type === "corridor" ? 2 : 4;
      const r = normRoom({id:uid("r"), name:type === "office" ? t("roomN",{n:roomsOf(b, f).length + 1}) : t("rt_" + type), floor:f.id, users:0, wall:"drywall", type, req:Object.assign({}, RDEF[type]), geo:{x:snap(Math.min(p.x, f.plan.wm - w)), y:snap(Math.min(p.y, f.plan.hm - h)), w, h}});
      b.rooms.push(r); UI.sel = {type:"room", id:r.id}; }
    else if (key.startsWith("item:")){ const type = key.slice(5), D = ITEMS[type]; const it = {id:uid("i"), type, x:snap(p.x), y:snap(p.y), w:D.w, h:D.h, rot:0}; if (type === "label"){ it.text = t("bd_label"); it.size = 14; } fixFloorPlan(f).items.push(it); UI.sel = {type:"bitem", id:it.id}; }
    else if (key === "rack"){ const r = {id:uid("k"), name:nextRackName(b), u:42, floor:f.id}; normRack(r); const rm = roomAtPt(b, f, p.x, p.y); if (rm) r.room = rm.id; r.pos = {x:r1(p.x), y:r1(p.y)}; b.racks.push(r); UI.sel = {type:"rack", id:r.id}; }
    else if (key.startsWith("dev:")){ const k = key.slice(4), rm = roomAtPt(b, f, p.x, p.y), d = newDevice(k, {floor:f.id, room:rm ? rm.id : ""}); d.name = autoName(b, k); setPos(d, p.x, p.y); b.devices.push(d); UI.sel = {type:"dev", id:d.id}; }
    else if (key.startsWith("put:")){ const d = devById(b, key.slice(4)); if (d){ setPos(d, p.x, p.y); d.floor = f.id; const rm = roomAtPt(b, f, p.x, p.y); if (rm && !d.room) d.room = rm.id; UI.sel = {type:"dev", id:d.id}; } }
  });
}
async function renameAt(b, f, type, id){
  if (type === "room"){ const r = roomById(b, id), n = await uiPrompt(t("f_name"), r.name); if (n && n.trim()) edit(() => { r.name = n.trim(); }); }
  else if (type === "dev"){ const d = devById(b, id), n = await uiPrompt(t("f_name"), d.name); if (n && n.trim()) edit(() => { d.name = n.trim(); }); }
  else if (type === "rack"){ const r = rackById(b, id), n = await uiPrompt(t("f_name"), r.name); if (n && n.trim()) edit(() => { r.name = n.trim(); }); }
  else if (type === "bitem"){ const it = f.plan.items.find(x => x.id === id); if (it && it.type === "label"){ const n = await uiPrompt(t("f_text"), it.text || ""); if (n !== null) edit(() => { it.text = n; }); } }
}
function wire(){
  const onPlan = () => UI.app === "building" && curTab().id === "plan";
  document.addEventListener("dragstart", e => { const el = e.target.closest && e.target.closest("[data-bplace]"); if (!el || !onPlan()) return; place = el.dataset.bplace; e.dataTransfer.setData("text/plain", place); e.dataTransfer.effectAllowed = "copy"; });
  document.addEventListener("dragover", e => { if (onPlan() && e.target.closest && e.target.closest("svg.bplan")) e.preventDefault(); });
  document.addEventListener("drop", e => { const svg = e.target.closest && e.target.closest("svg.bplan"); if (!svg || !onPlan()) return; e.preventDefault(); const b = B(), f = curFloor(b), key = e.dataTransfer.getData("text/plain") || place; place = null; if (key) doPlace(key, b, f, ptOf(e, svg, f)); });
  document.addEventListener("click", e => { if (UI.app !== "building") return;
    const pl = e.target.closest("[data-bplace]"); if (pl){ place = place === pl.dataset.bplace ? null : pl.dataset.bplace; render(); return; }
    const pu = e.target.closest("[data-bput]"); if (pu){ const k = "put:" + pu.dataset.bput; place = place === k ? null : k; render(); return; }
    const fl = e.target.closest("[data-bfl]"); if (fl){ st().floor = fl.dataset.bfl; UI.sel = {type:"bfloor", id:fl.dataset.bfl}; render(); return; }
    const a = e.target.closest("[data-ba]"); if (a){ act(a.dataset.ba); return; } });
  document.addEventListener("change", e => { if (UI.app !== "building") return; const el = e.target, b = B();
    if (el.dataset.bopt){ st()[el.dataset.bopt] = el.checked; render(); return; }
    if (el.dataset.bfn){ const f = floorById(b, el.dataset.bfn); if (f && el.value.trim()) edit(() => { f.name = el.value.trim(); }); return; }
    if (el.dataset.brn){ const r = roomById(b, el.dataset.brn); if (r && el.value.trim()) edit(() => { r.name = el.value.trim(); }); return; }
    if (el.dataset.brt){ const r = roomById(b, el.dataset.brt); if (r) edit(() => { r.type = el.value; }); return; }
    if (el.dataset.bru){ const r = roomById(b, el.dataset.bru); if (r) edit(() => { r.users = Math.max(0, Math.round(num(el.value, 0))); }); return; }
    if (el.dataset.brq){ const [id, k] = el.dataset.brq.split(":"), r = roomById(b, id); if (r) edit(() => { normRoom(r).req[k] = Math.max(0, Math.round(num(el.value, 0))); }); } });
  document.addEventListener("pointerdown", e => {
    if (!onPlan() || (e.button !== 0 && e.pointerType !== "touch")) return; const svg = e.target.closest("svg.bplan"); if (!svg) return;
    const b = B(), f = curFloor(b); if (!f) return; const p = ptOf(e, svg, f);
    if (place){ e.preventDefault(); const k = place; place = null; doPlace(k, b, f, p); return; }
    const res = e.target.closest("[data-res]"), dv = e.target.closest("[data-bdev]"), rk = e.target.closest("[data-brack]"), it = e.target.closest("[data-bitem]"), rm = e.target.closest("[data-room]");
    let type = null, id = null;
    if (res){ const [ty, i] = res.dataset.res.split(":"), o = ty === "room" ? roomById(b, i).geo : f.plan.items.find(x => x.id === i); drag = {mode:"resize", o, p0:p, w0:o.w, h0:o.h, snap:snapshot(), moved:false}; e.preventDefault(); return; }
    if (dv){ type = "dev"; id = dv.dataset.bdev; } else if (rk){ type = "rack"; id = rk.dataset.brack; } else if (it){ type = "bitem"; id = it.dataset.bitem; } else if (rm){ type = "room"; id = rm.dataset.room; }
    if (!type){ if (UI.sel || UI.multi.size){ UI.sel = null; UI.multi.clear(); render(); } return; }
    const now = Date.now(); if (lastDown && lastDown.id === id && now - lastDown.t < 450){ lastDown = null; drag = null; e.preventDefault(); renameAt(b, f, type, id); return; } lastDown = {id, t:now};
    if (type === "dev" && (e.ctrlKey || e.metaKey || e.shiftKey)){ if (!UI.multi.size && UI.sel && UI.sel.type === "dev") UI.multi.add("dev:" + UI.sel.id); const k = "dev:" + id; UI.multi.has(k) ? UI.multi.delete(k) : UI.multi.add(k); UI.sel = null; render(); return; }
    UI.multi.clear(); UI.sel = {type, id}; e.preventDefault();
    const items = [];
    if (type === "dev"){ const d = devById(b, id); items.push({d, ...posOf(d)}); }
    else if (type === "rack"){ const r = rackById(b, id); items.push({o:r.pos, x:r.pos.x, y:r.pos.y}); }
    else if (type === "bitem"){ const o = f.plan.items.find(x => x.id === id); items.push({o, x:o.x, y:o.y}); }
    else { const r = roomById(b, id); items.push({o:r.geo, x:r.geo.x, y:r.geo.y});
      // a room carries what lies inside it
      b.devices.filter(d => d.room === r.id && posOf(d)).forEach(d => items.push({d, ...posOf(d)}));
      b.racks.filter(k => k.room === r.id && k.pos).forEach(k => items.push({o:k.pos, x:k.pos.x, y:k.pos.y})); }
    drag = {mode:"move", type, id, items, p0:p, snap:snapshot(), moved:false};
    render();
  });
  document.addEventListener("pointermove", e => { if (!drag) return; const svg = $("svg.bplan"); if (!svg) return; const b = B(), f = curFloor(b), p = ptOf(e, svg, f), dx = p.x - drag.p0.x, dy = p.y - drag.p0.y;
    if (!drag.moved && Math.hypot(dx, dy) * scaleFor(f) < 3) return; drag.moved = true;
    if (drag.mode === "resize"){ drag.o.w = Math.max(.3, snap(drag.w0 + dx)); drag.o.h = Math.max(.2, snap(drag.h0 + dy)); }
    else drag.items.forEach((it, i) => { const nx = (drag.type === "room" || drag.type === "bitem") && i === 0 ? snap(it.x + dx) : r1(it.x + dx), ny = (drag.type === "room" || drag.type === "bitem") && i === 0 ? snap(it.y + dy) : r1(it.y + dy);
      if (it.d) setPos(it.d, clamp(nx, 0, f.plan.wm), clamp(ny, 0, f.plan.hm)); else { it.o.x = nx; it.o.y = ny; } });
    const svgEl = $("svg.bplan"); if (svgEl) svgEl.outerHTML = planSvg(b, f); });
  const up = cancel => { if (!drag) return; const g = drag; drag = null; if (cancel){ render(); return; }
    if (g.moved){ const b = B(), f = curFloor(b);
      // a device or rack dropped in another room now belongs to that room
      if (g.mode === "move" && (g.type === "dev" || g.type === "rack")){ const o = g.type === "dev" ? devById(b, g.id) : rackById(b, g.id), P1 = g.type === "dev" ? posOf(o) : o.pos, rm = roomAtPt(b, f, P1.x, P1.y); if (rm) o.room = rm.id; }
      pushUndo(g.snap); normBuilding(b); persist(); }
    render(); };
  document.addEventListener("pointerup", () => up(false));
  document.addEventListener("pointercancel", () => up(true));
}
function onKey(e){
  const b = B(), f = curFloor(b), s = UI.sel; if (!s || !f) return;
  if (e.key === "Delete" || e.key === "Backspace"){ e.preventDefault();
    if (s.type === "room") return delRoom(b, roomById(b, s.id));
    if (s.type === "bitem") return edit(() => { f.plan.items = f.plan.items.filter(x => x.id !== s.id); UI.sel = null; });
    if (s.type === "dev") return edit(() => { clearPos(devById(b, s.id)); UI.sel = null; });
    if (s.type === "rack") return edit(() => { delete rackById(b, s.id).pos; UI.sel = null; }); }
  if (e.key.startsWith("Arrow")){ e.preventDefault(); const k = e.shiftKey ? .1 : .5, dx = e.key === "ArrowLeft" ? -k : e.key === "ArrowRight" ? k : 0, dy = e.key === "ArrowUp" ? -k : e.key === "ArrowDown" ? k : 0;
    edit(() => { if (s.type === "room"){ const g = roomById(b, s.id).geo; if (g){ g.x = r1(g.x + dx); g.y = r1(g.y + dy); } } else if (s.type === "bitem"){ const o = f.plan.items.find(x => x.id === s.id); o.x = r1(o.x + dx); o.y = r1(o.y + dy); }
      else if (s.type === "dev"){ const d = devById(b, s.id), P1 = posOf(d); if (P1) setPos(d, P1.x + dx, P1.y + dy); } else if (s.type === "rack"){ const r = rackById(b, s.id); if (r.pos){ r.pos.x = r1(r.pos.x + dx); r.pos.y = r1(r.pos.y + dy); } } }); }
}
async function act(k){
  const b = B();
  if (k === "wizard") return wizard();
  if (k === "addFloor"){ const n = await uiPrompt(t("floorNew"), t("floorN",{n:b.floors.length + 1})); if (n === null) return;
    return edit(() => { const f = {id:uid("f"), name:n.trim() || t("floorN",{n:b.floors.length + 1}), lvl:b.floors.length}; b.floors.push(f); normBuilding(b); const p = b.floors[b.floors.length - 2]; if (p){ f.plan.wm = p.plan.wm; f.plan.hm = p.plan.hm; } st().floor = f.id; UI.sel = {type:"bfloor", id:f.id}; }); }
  if (k === "createAll"){ let n = 0; edit(() => { b.rooms.forEach(r => { n += createMissing(b, normRoom(r)); }); }); toast("✓ " + t("bd_createdN",{n})); return; }
  if (k === "reqCsv"){ saveText(`${fileSafe(b.name)} - ${t("bd_reqT")}.csv`, csvText([t("f_floor"), t("f_room"), t("bd_type"), "m²", t("f_users"), ...RK.flatMap(x => [kindName(x) + " (" + t("bd_req") + ")", kindName(x) + " (" + t("bd_placed") + ")"])],
      b.rooms.map(r => [floorName(b, r.floor), r.name, t("rt_" + normRoom(r).type), area(r), num(r.users), ...RK.flatMap(x => [reqOf(r, x), placedIn(b, r, x)])])), "csv", "text/csv"); return; }
  const [a, id] = k.split(":"), f = id && floorById(b, id);
  if (a === "goFloor"){ st().floor = id; UI.tabs.building = "plan"; UI.sel = {type:"bfloor", id}; render(); return; }
  if (a === "selRoom"){ const r = roomById(b, id); st().floor = r.floor; UI.tabs.building = "plan"; UI.sel = {type:"room", id}; render(); return; }
  if (a === "fUp" || a === "fDown"){ const i = b.floors.indexOf(f), j = a === "fUp" ? i + 1 : i - 1; if (j < 0 || j >= b.floors.length) return; edit(() => { [b.floors[i], b.floors[j]] = [b.floors[j], b.floors[i]]; b.floors.forEach((x, n) => x.lvl = n); }); return; }
  if (a === "addRoom"){ edit(() => { const r = normRoom({id:uid("r"), name:t("roomN",{n:roomsOf(b, f).length + 1}), floor:f.id, users:0, wall:"drywall", type:"office", req:Object.assign({}, RDEF.office), geo:freeRect(b, f, 4, 4)}); b.rooms.push(r); }); return; }
  if (a === "delRoom") return delRoom(b, roomById(b, id));
  if (a === "delFloor"){ const n = roomsOf(b, f).length, nd = b.devices.filter(d => d.floor === f.id).length;
    if (!await uiConfirm(t("bd_delFloorC",{f:f.name, r:n, d:nd}), t("delete"), true)) return;
    edit(() => { const rids = new Set(roomsOf(b, f).map(r => r.id)); b.rooms = b.rooms.filter(r => !rids.has(r.id)); b.devices.forEach(d => { if (d.floor === f.id || rids.has(d.room)){ d.floor = ""; if (rids.has(d.room)) d.room = ""; clearPos(d); } });
      b.racks.forEach(r => { if (r.floor === f.id){ r.floor = ""; r.room = ""; delete r.pos; } }); b.floors = b.floors.filter(x => x !== f); if (st().floor === f.id) st().floor = null; UI.sel = null; }); }
}

/* ---------- guided set-up: floors → rooms per floor → what each room needs ---------- */
function wizard(){
  const b = B(), W = {name:b.name, floors:3, under:0, area:400, h:3.5, F:[], step:0};
  const mkFloors = () => { const old = W.F; W.F = [];
    for (let i = -W.under; i < W.floors; i++){ const o = old.find(x => x.lv === i) || {lv:i, name:i < 0 ? t("bd_floorB",{n:-i}) : t("floorN",{n:i + 1}), rooms:i < 0 ? 2 : 6, server:i === 0, area:W.area, R:[]};
      if (W.prevArea !== undefined && o.area === W.prevArea) o.area = W.area; W.F.push(o); }
    W.prevArea = W.area; };
  const mkRooms = F => { const want = Math.max(0, Math.round(num(F.rooms))) + (F.server ? 1 : 0), old = F.R; F.R = [];
    if (F.server) F.R.push(old.find(r => r.type === "server") || {name:t("rt_server"), type:"server", users:0, req:Object.assign({}, RDEF.server)});
    for (let i = 0; F.R.length < want; i++){ const o = old.filter(r => r.type !== "server")[i] || {name:t("roomN",{n:i + 1}), type:"office", users:2, req:Object.assign({}, RDEF.office)}; F.R.push(o); } };
  const steps = [
    () => `<h3>🧭 ${esc(t("bd_wz1"))}</h3><p class="muted small">${esc(t("bd_wz1h"))}</p>
      <label class="fld"><span>${esc(t("bldName"))}</span><input id="bw-name" value="${esc(W.name)}"></label>
      <div class="two"><label class="fld"><span>${esc(t("bd_wzFloors"))}</span><input id="bw-fl" type="text" inputmode="numeric" value="${W.floors}"></label><label class="fld"><span>${esc(t("bd_wzUnder"))}</span><input id="bw-un" type="text" inputmode="numeric" value="${W.under}"></label></div>
      <div class="two"><label class="fld"><span>${esc(t("bd_wzArea"))}</span><input id="bw-ar" type="text" inputmode="decimal" value="${W.area}"></label><label class="fld"><span>${esc(t("bd_fh"))} (m)</span><input id="bw-h" type="text" inputmode="decimal" value="${W.h}"></label></div>
      ${b.floors.length ? `<p class="lbox">${esc(t("bd_wzHas",{n:b.floors.length}))}</p>` : ""}`,
    () => `<h3>🏬 ${esc(t("bd_wz2"))}</h3><p class="muted small">${esc(t("bd_wz2h"))}</p><div class="scroll" style="max-height:52vh"><table class="t"><tr><th>${esc(t("f_floor"))}</th><th>${esc(t("bd_wzRooms"))}</th><th>${esc(t("bd_wzArea"))}</th><th>${esc(t("rt_server"))}</th></tr>
      ${W.F.slice().reverse().map(F => `<tr><td><input data-wf="${F.lv}:name" value="${esc(F.name)}"></td><td><input data-wf="${F.lv}:rooms" type="text" inputmode="numeric" value="${F.rooms}" style="width:60px"></td><td><input data-wf="${F.lv}:area" type="text" inputmode="decimal" value="${F.area}" style="width:80px"></td><td class="c"><input type="checkbox" data-wf="${F.lv}:server"${F.server ? " checked" : ""}></td></tr>`).join("")}</table></div>`,
    () => `<h3>🚪 ${esc(t("bd_wz3"))}</h3><p class="muted small">${esc(t("bd_wz3h"))}</p><div class="scroll" style="max-height:56vh">${W.F.slice().reverse().map(F => `<details class="dsec" open><summary>🏬 ${esc(F.name)} <span class="cnt">${F.R.length}</span></summary><div class="dsb scroll"><table class="t wzt"><tr><th>${esc(t("f_room"))}</th><th>${esc(t("bd_type"))}</th><th>👤</th>${RK.slice(0, 8).map(k => `<th title="${esc(kindName(k))}">${RK_SHORT[k]}</th>`).join("")}</tr>
      ${F.R.map((r, i) => `<tr><td><input data-wr="${F.lv}:${i}:name" value="${esc(r.name)}" style="min-width:110px"></td><td><select data-wr="${F.lv}:${i}:type">${RTYPES.map(k => opt(k, t("rt_" + k), r.type)).join("")}</select></td><td><input data-wr="${F.lv}:${i}:users" type="text" inputmode="numeric" value="${r.users || ""}" style="width:38px"></td>${RK.slice(0, 8).map(k => `<td><input data-wr="${F.lv}:${i}:q.${k}" type="text" inputmode="numeric" value="${r.req[k] || ""}" style="width:38px"></td>`).join("")}</tr>`).join("")}</table></div></details>`).join("")}</div><p class="muted small">${RK.slice(0, 8).map(k => `${RK_SHORT[k]} = ${kindName(k)}`).join(" · ")}</p>`,
    () => { const nR = W.F.reduce((a, F) => a + F.R.length, 0), nD = W.F.reduce((a, F) => a + F.R.reduce((x, r) => x + RK.reduce((y, k) => y + num(r.req[k]), 0), 0), 0);
      return `<h3>✓ ${esc(t("bd_wz4"))}</h3><p>${esc(t("bd_wz4h",{f:W.F.length, r:nR, d:nD}))}</p>
      <label class="chk"><input type="checkbox" id="bw-layout" checked> ${esc(t("bd_wzLayout"))}</label>
      <label class="chk"><input type="checkbox" id="bw-devs" checked> ${esc(t("bd_wzDevs",{n:nD}))}</label>
      <label class="chk"><input type="checkbox" id="bw-racks" checked> ${esc(t("bd_wzRacks"))}</label>
      <p class="muted small">${esc(t("bd_wzAfter"))}</p>`; }
  ];
  const read = () => {
    const v = id => $(id) && $(id).value;
    if ($("#bw-fl")){ W.name = v("#bw-name").trim() || W.name; W.floors = clamp(Math.round(num(v("#bw-fl"), 1)), 1, 120); W.under = clamp(Math.round(num(v("#bw-un"), 0)), 0, 10); W.area = Math.max(10, num(String(v("#bw-ar")).replace(",", "."), 400)); W.h = Math.max(2, num(String(v("#bw-h")).replace(",", "."), 3.5)); mkFloors(); }
    $$("[data-wf]").forEach(el => { const [lv, k] = el.dataset.wf.split(":"), F = W.F.find(x => x.lv === +lv); if (!F) return; F[k] = el.type === "checkbox" ? el.checked : k === "name" ? el.value.trim() || F.name : num(String(el.value).replace(",", "."), F[k]); });
    $$("[data-wr]").forEach(el => { const [lv, i, k] = el.dataset.wr.split(":"), F = W.F.find(x => x.lv === +lv), r = F && F.R[+i]; if (!r) return;
      if (k.startsWith("q.")) r.req[k.slice(2)] = Math.max(0, Math.round(num(el.value, 0))); else if (k === "users") r.users = Math.max(0, Math.round(num(el.value, 0)));
      else if (k === "type"){ if (r.type !== el.value){ r.type = el.value; r.req = Object.assign({}, RDEF[el.value]); } } else r[k] = el.value.trim() || r[k]; });
  };
  const draw = () => { modal(`<div class="wz">${steps[W.step]()}</div><div class="wzdots">${steps.map((_, i) => `<i class="${i === W.step ? "on" : ""}"></i>`).join("")}</div>
    <div class="mfoot"><button class="btn" data-m="close">${esc(t("cancel"))}</button><span class="grow"></span>${W.step ? `<button class="btn" data-m="back">‹ ${esc(t("back"))}</button>` : ""}<button class="btn pri" data-m="next">${esc(W.step === steps.length - 1 ? t("bd_wzBuild") : t("next") + " ›")}</button></div>`, {
      next: () => { read(); if (W.step === 1) W.F.forEach(mkRooms); if (W.step === steps.length - 1) return build(); W.step++; draw(); },
      back: () => { read(); W.step--; draw(); } }, {wide:true, nofocus:true});
    $$('[data-wr$=":type"]').forEach(el => el.addEventListener("change", () => { read(); draw(); })); };
  const build = () => {
    const layout = $("#bw-layout").checked, devs = $("#bw-devs").checked, racks = $("#bw-racks").checked; closeModal();
    edit(() => {
      b.name = W.name || b.name;
      const under = [], over = [];
      W.F.forEach(F => {
        const A = Math.max(10, num(F.area, W.area)), wm = r1(Math.sqrt(A * 2)), hm = r1(A / wm);
        const f = {id:uid("f"), name:F.name, lvl:0, h:W.h}; (F.lv < 0 ? under : over).push(f); f.plan = {wm, hm, img:null, op:60, cal:false, idf:null, walls:[], survey:[], items:[]};
        const R = F.R.map(x => normRoom({id:uid("r"), name:x.name, floor:f.id, users:num(x.users), wall:x.type === "server" ? "concrete" : "drywall", type:x.type, req:Object.assign({}, x.req)}));
        if (layout){ // rooms in two rows along a central corridor
          const cor = R.length > 2 ? 2 : 0, top = Math.ceil(R.length / 2), bot = R.length - top, rh = (hm - cor) / (bot ? 2 : 1);
          R.forEach((r, i) => { const row = i < top ? 0 : 1, n = row ? bot : top, j = row ? i - top : i, w = wm / n; r.geo = {x:r1(j * w), y:r1(row ? rh + cor : 0), w:r1(w), h:r1(rh)}; });
          if (cor) R.push(normRoom({id:uid("r"), name:t("rt_corridor"), floor:f.id, users:0, wall:"none", type:"corridor", req:Object.assign({}, RDEF.corridor), geo:{x:0, y:r1(rh), w:wm, h:cor}}));
        }
        b.rooms.push(...R);
        if (racks) R.filter(r => r.type === "server").forEach(r => { const k = {id:uid("k"), name:nextRackName(b), u:42, floor:f.id, room:r.id}; normRack(k); if (r.geo) k.pos = {x:r1(r.geo.x + r.geo.w / 2), y:r1(r.geo.y + r.geo.h / 2)}; b.racks.push(k); });
        f.__R = R;
      });
      b.floors = [...under, ...b.floors, ...over];
      b.floors.forEach((f, i) => f.lvl = i); normBuilding(b);
      if (devs) b.floors.forEach(f => (f.__R || []).forEach(r => createMissing(b, r)));
      b.floors.forEach(f => delete f.__R);
      b.struct = Object.assign(b.struct || {}, {wizard:true}); st().floor = over[0] ? over[0].id : under[0].id; UI.tabs.building = "plan"; UI.sel = null;
    });
    toast("✓ " + t("bd_built"));
  };
  mkFloors(); draw();
}

registerApp({
  id:"building", name:"app_building", desc:"app_building_d", docName:"doc_building", color:"#6a3aa0",
  glyph:`<path d="M12 38V14l12-6 12 6v24z" fill="#fff"/><path d="M17 18h4v4h-4zM27 18h4v4h-4zM17 26h4v4h-4zM27 26h4v4h-4z" fill="#6a3aa0"/><path d="M21 38v-6h6v6" fill="#ffb703"/>`,
  tabs:[
    {id:"plan", label:"bd_tabPlan", icon:"🗺", palette, render:planView,
      tour:() => [{sel:"#appsw", title:t("tShellT1"), text:t("tShell1")}, {sel:".bfloors", title:t("bd_tT1"), text:t("bd_t1")}, {sel:"#pal .psec", title:t("bd_tT2"), text:t("bd_t2")}, {sel:"svg.bplan", title:t("bd_tT3"), text:t("bd_t3")}, {sel:'[data-tab="struct"]', title:t("bd_tT4"), text:t("bd_t4")}, {sel:"#btabs", title:t("tShellT2"), text:t("tShell2")}]},
    {id:"struct", label:"bd_tabStruct", icon:"🏢", render:structView},
    {id:"req", label:"bd_tabReq", icon:"📋", render:reqView},
    docTab("building", docBody)
  ],
  actions(tab){ return [{id:"wiz", icon:"🧭", label:"bd_wizard", fn:wizard}, {id:"addFloor", icon:"＋", label:"floorNew", fn:() => act("addFloor")}, {id:"places", icon:"🏢", label:"places", fn:() => openPlaces()}]; },
  drawer, onField, onDrawerAct, onKey(e, tab){ if (tab.id === "plan") onKey(e); },
  onEsc(){ if (place){ place = null; render(); return true; } return false; },
  exports(){ return [{icon:"▦", label:t("bd_reqT") + " (CSV)", fn:() => act("reqCsv")}]; },
  reveal(s){ if (!s) return; const b = B(); if (s.type === "dev"){ const d = devById(b, s.id); if (d && devFloor(b, d)) st().floor = devFloor(b, d); } if (s.type === "room"){ const r = roomById(b, s.id); if (r) st().floor = r.floor; } UI.tabs.building = "plan"; render(); },
  guide:() => [[t("bd_g1h"), t("bd_g1")], [t("bd_g2h"), t("bd_g2")], [t("bd_g3h"), t("bd_g3")], [t("bd_g4h"), t("bd_g4")]]
});
APPS.building.init = wire;
// a building without floors opens the set-up once, the first time the app is shown for it
APPS.building.afterRender = () => { const b = B(); if (b.floors.length || b.devices.length || b.racks.length || (b.struct && b.struct.wizard) || !store.settings.setupDone || !$("#modal").hidden || document.querySelector(".tour")) return; b.struct = Object.assign(b.struct || {}, {wizard:true}); persist(); setTimeout(wizard, 300); };
window.BLD = {wizard, createMissing, posOf};
})();
