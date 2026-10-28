/*! NetWorkKing — © 2026 Ulvi Badalov. Bütün hüquqlar qorunur / All rights reserved. Proprietary — see LICENSE. */
// Devices from a table: cells copied from Excel / Google Sheets and pasted, or a CSV file. The first row names the
// columns; each column is matched to a device field by its name (Azerbaijani, Turkish, English or Russian) and can be
// changed by hand. Rows become devices; a row whose name already exists updates that device (empty cells keep the old
// value). Floors, rooms and VLANs that don't exist yet are created. One Undo step.
"use strict";
const TIMP = (function(){
const FIELDS = ["", "name", "kind", "brand", "model", "ip", "mac", "host", "floor", "room", "vlan", "serial", "status", "notes", "asset", "ports"];
const ALIAS = {name:/^(ad|adı|name|cihaz|device|hostname?\s*\/\s*ad|isim|имя|название|устройство)$/i, kind:/^(növ|nov|tip|type|kind|cihaz növü|tür|tur|тип|вид)$/i, brand:/^(marka|brand|vendor|istehsalçı|üretici|производитель|бренд)$/i,
  model:/^(model|модель)$/i, ip:/^(ip|ip ünvanı|ip adres[i]?|ip address|ip-адрес|адрес ip)$/i, mac:/^(mac|mac ünvanı|mac adres[i]?|mac address|mac-адрес)$/i, host:/^(host|hostname|host adı)$/i,
  floor:/^(mərtəbə|mertebe|kat|floor|level|этаж)$/i, room:/^(otaq|oda|room|yer|location|mekan|помещение|комната)$/i, vlan:/^(vlan|влан)$/i, serial:/^(seriya|seriya nömrəsi|seri no|serial|serial number|s\/n|sn|серийный номер)$/i,
  status:/^(status|vəziyyət|durum|состояние|статус)$/i, notes:/^(qeyd|qeydlər|not|notlar|notes?|comment|примечание)$/i, asset:/^(inventar|inventar nömrəsi|demirbaş|asset|asset tag|инвентарный)$/i, ports:/^(port|portlar|port sayı|ports|порты)$/i};
// rows from pasted cells (tab), or CSV with ; or , — quotes respected
function parse(txt){
  txt = String(txt || "").replace(/^﻿/, "").replace(/\r\n?/g, "\n").replace(/\n+$/, ""); if (!txt) return [];
  const first = txt.split("\n")[0], sep = first.includes("\t") ? "\t" : (first.split(";").length > first.split(",").length ? ";" : ",");
  const rows = []; let row = [], cell = "", q = false;
  for (let i = 0; i < txt.length; i++){ const c = txt[i];
    if (q){ if (c === '"' && txt[i + 1] === '"'){ cell += '"'; i++; } else if (c === '"') q = false; else cell += c; continue; }
    if (c === '"' && cell === "") q = true; else if (c === sep){ row.push(cell); cell = ""; } else if (c === "\n"){ row.push(cell); rows.push(row); row = []; cell = ""; } else cell += c; }
  row.push(cell); rows.push(row);
  return rows.map(r => r.map(x => x.trim())).filter(r => r.some(Boolean));
}
function guess(h){ const x = String(h).trim(); return Object.keys(ALIAS).find(k => ALIAS[k].test(x)) || ""; }
// a kind written in any language (or its key) → kind key
function kindOf(v){ const x = nameKey(v); if (!x) return ""; if (KINDS[v]) return v;
  for (const k of KIND_ORDER){ if (nameKey(kindName(k)) === x) return k; for (const lg of Object.keys(I18N)){ const n = I18N[lg]["k_" + k]; if (n && nameKey(n) === x) return k; } }
  for (const k of KIND_ORDER){ for (const lg of Object.keys(I18N)){ const n = I18N[lg]["k_" + k]; if (n && x.length > 2 && nameKey(n).includes(x)) return k; } }
  return /kamera|camera|cam/i.test(v) ? "camera" : /\bap\b|access point|wifi/i.test(v) ? "ap" : /switch|svič/i.test(v) ? "switch" : /tv|televiz/i.test(v) ? "tv" : /printer|yazıcı|printer/i.test(v) ? "printer" : /pc|kompüter|bilgisayar|computer/i.test(v) ? "pc" : "other"; }
function statusOf(v){ const x = nameKey(v); if (!x) return ""; return STATUSES.find(s => nameKey(s) === x || Object.keys(I18N).some(lg => nameKey(I18N[lg]["st_" + s] || "") === x)) || ""; }
function open(){
  const b = B(), S = {rows:[], map:[], mode:"fill"};
  const draw = () => {
    const H = S.rows[0] || [], body = S.rows.slice(1);
    modal(`<h3>⤓ ${esc(t("tiT"))}</h3><p class="muted small">${esc(t("tiH"))}</p>
      <textarea id="ti-t" class="mono" rows="${S.rows.length ? 3 : 8}" style="width:100%" spellcheck="false" placeholder="${esc(t("tiPh"))}">${esc(S.txt || "")}</textarea>
      <div class="row" style="gap:8px;margin-top:6px"><button class="btn small" data-m="file">📄 CSV</button><span class="grow"></span><button class="btn" data-m="read">👁 ${esc(t("ciPreview"))}</button></div>
      ${S.rows.length ? `<p class="small">${esc(t("tiRows", {n:body.length}))}</p><div class="scroll" style="max-height:40vh"><table class="t"><tr>${H.map((h, i) => `<th><select data-tic="${i}">${FIELDS.map(f => opt(f, f ? t("ti_" + f) : "— " + t("tiSkip") + " —", S.map[i])).join("")}</select><br><small class="muted">${esc(h)}</small></th>`).join("")}</tr>
        ${body.slice(0, 12).map(r => `<tr>${H.map((_, i) => `<td class="small">${esc(r[i] || "")}</td>`).join("")}</tr>`).join("")}${body.length > 12 ? `<tr><td colspan="${H.length}" class="muted small">… +${body.length - 12}</td></tr>` : ""}</table></div>
        <div class="lbox"><b>${esc(t("tiSame"))}</b><label class="chk"><input type="radio" name="ti-m" value="fill"${S.mode === "fill" ? " checked" : ""}> ${esc(t("tiFill"))}</label><label class="chk"><input type="radio" name="ti-m" value="over"${S.mode === "over" ? " checked" : ""}> ${esc(t("tiOver"))}</label><label class="chk"><input type="radio" name="ti-m" value="new"${S.mode === "new" ? " checked" : ""}> ${esc(t("tiNew"))}</label></div>` : ""}
      <div class="mfoot"><button class="btn" data-m="close">${esc(t("cancel"))}</button><span class="grow"></span><button class="btn pri" data-m="ok"${S.rows.length > 1 && S.map.includes("name") || S.map.includes("kind") ? "" : " disabled"}>✓ ${esc(t("tiApply", {n:Math.max(0, S.rows.length - 1)}))}</button></div>`,
      {read:() => { S.txt = $("#ti-t").value; S.rows = parse(S.txt); S.map = (S.rows[0] || []).map(guess); draw(); },
       file:async () => { const x = await openTextFile(".csv,.txt,.tsv"); if (x){ S.txt = x; S.rows = parse(x); S.map = (S.rows[0] || []).map(guess); draw(); } },
       ok:() => { const md = $('input[name="ti-m"]:checked'); if (md) S.mode = md.value; closeModal(); apply(); }}, {xwide:true, nofocus:!!S.rows.length});
    $$("[data-tic]").forEach(el => el.addEventListener("change", () => { S.map[+el.dataset.tic] = el.value; const md = $('input[name="ti-m"]:checked'); if (md) S.mode = md.value; S.txt = $("#ti-t").value; draw(); }));
  };
  const apply = () => { let nN = 0, nU = 0;
    edit(() => { S.rows.slice(1).forEach(r => { const o = {}; S.map.forEach((f, i) => { if (f && r[i] !== undefined && r[i] !== "") o[f] = r[i]; });
      if (!o.name && !o.kind) return;
      let d = o.name && S.mode !== "new" ? b.devices.find(x => same(x.name, o.name)) : null;
      const isNew = !d;
      if (!d){ d = newDevice(kindOf(o.kind) || "other", {}); d.name = o.name || autoName(b, d.kind); if (nameTaken(b, d.name)) d.name = uniqueName(b, d.name); b.devices.push(d); nN++; } else nU++;
      const put = (k, v) => { if (v === undefined || v === "") return; if (S.mode === "fill" && d[k] && !isNew) return; d[k] = v; };
      if (o.kind && d.kind !== kindOf(o.kind) && S.mode === "over"){ d.kind = kindOf(o.kind); normDevice(d); }
      ["brand", "model", "host", "serial", "notes", "asset"].forEach(k => put(k, o[k]));
      if (o.ip) put("ip", o.ip.replace(/,/g, ".")); if (o.mac) put("mac", o.mac.toUpperCase().replace(/-/g, ":"));
      if (o.status && statusOf(o.status)) put("status", statusOf(o.status));
      if (o.ports && /^\d+$/.test(o.ports)) put("ports", +o.ports);
      if (o.floor){ const f = ensureFloor(b, o.floor); put("floor", f.id); }
      if (o.room){ const rm = ensureRoom(b, d.floor || "", o.room); put("room", rm.id); if (!d.floor && rm.floor) d.floor = rm.floor; }
      if (o.vlan){ const vid = String(o.vlan).match(/\d+/); if (vid){ let v = b.vlans.find(x => String(x.vid) === vid[0]); if (!v){ v = {id:uid("v"), vid:vid[0], name:"VLAN " + vid[0], subnet:"", gw:"", dhcp:"", color:VCOLORS[b.vlans.length % VCOLORS.length]}; b.vlans.push(v); } put("vlan", v.id); } }
      if (d.model && !d.cat){ const rec = catMatch(d); if (rec) applySpec(d, rec); }
    }); });
    toast("✓ " + t("tiDone", {n:nN, u:nU}), 6000);
  };
  draw();
}
function uniqueName(b, n){ let i = 2; while (nameTaken(b, n + " (" + i + ")")) i++; return n + " (" + i + ")"; }
return {open, parse, guess, kindOf};
})();
