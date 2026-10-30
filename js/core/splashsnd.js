/*! NetWorkKing — © 2026 Ulvi Badalov. Bütün hüquqlar qorunur / All rights reserved. Proprietary — see LICENSE. */
// Splash sounds, made with Web Audio (no sound files). Used by the splash itself and by Settings → Look → Splash sounds
// (choice + preview). D = dial-up while the loading lines run, E = the short-circuit crackle while the N goes out and the
// name comes on. «0» = silent. The flicker table FL is the same one the splash animates with.
"use strict";
const NKSND = (function(){
const FL = [[0, 1, 0], [70, .15, .7], [130, 1, 0], [430, .2, .8], [480, .9, .1], [540, .05, .95], [620, .7, .25], [680, 0, 1], [860, .55, .4], [900, 0, 1], [1120, .3, .6], [1150, .08, .9], [1210, 0, 1]];
let A = null, master = null, NB = null, dbus = null, live = [], vol = .6;
function ctx(){
  if (!A){ try { A = new (window.AudioContext || window.webkitAudioContext)(); } catch(e){ return null; }
    master = A.createGain(); master.connect(A.destination);
    NB = A.createBuffer(1, A.sampleRate * 2, A.sampleRate); const d = NB.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
  if (A.state === "suspended") A.resume().catch(() => {});
  master.gain.value = vol * .7; return A;
}
function setVol(v){ vol = Math.max(0, Math.min(1, +v || 0)); if (master) master.gain.value = vol * .7; }
const rng = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const keep = n => { live.push(n); return n; };
function bus(dest){ const g = A.createGain(); g.connect(dest || master); return g; }
function tone(t, d, freqs, gain, dest, type = "sine", att = .008){
  const g = A.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(gain, t + att); g.gain.setValueAtTime(gain, t + Math.max(att, d - att)); g.gain.linearRampToValueAtTime(0, t + d); g.connect(dest);
  freqs.forEach(f => { const o = keep(A.createOscillator()); o.type = type; o.frequency.value = f; o.connect(g); o.start(t); o.stop(t + d + .02); }); }
function noise(t, d, {type = "bandpass", f = 2000, Q = 1, gain = .5, att = .003, rel = null} = {}, dest){
  const n = keep(A.createBufferSource()), fl = A.createBiquadFilter(), g = A.createGain(); n.buffer = NB; fl.type = type; fl.frequency.value = f; fl.Q.value = Q;
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(gain, t + att);
  if (rel === null) g.gain.exponentialRampToValueAtTime(.0008, t + d); else { g.gain.setValueAtTime(gain, t + d - rel); g.gain.linearRampToValueAtTime(0, t + d); }
  n.connect(fl).connect(g).connect(dest); n.start(t, Math.random() * 1.5); n.stop(t + d + .03); return {g, fl}; }
function line(dest, lo = 300, hi = 3400){ const h = A.createBiquadFilter(), l = A.createBiquadFilter(); h.type = "highpass"; h.frequency.value = lo; l.type = "lowpass"; l.frequency.value = hi; h.connect(l).connect(dest); return h; }
function shaper(dest, k = 8){ const s = A.createWaveShaper(), c = new Float32Array(1024); for (let i = 0; i < 1024; i++){ const x = i / 512 - 1; c[i] = (1 + k) * x / (1 + k * Math.abs(x)); } s.curve = c; s.connect(dest); return s; }
const DT = {"0":[941,1336],"1":[697,1209],"2":[697,1336],"3":[697,1477],"4":[770,1209],"5":[770,1336],"6":[770,1477],"7":[852,1209],"8":[852,1336],"9":[852,1477]};
const dial = (t, digits, dest, g = .22) => { [...digits].forEach((c, i) => tone(t + i * .15, .09, DT[c], g, dest)); return t + digits.length * .15; };
const answer = (t, d, dest, g = .22) => { for (let x = 0; x < d; x += .45) tone(t + x, Math.min(.43, d - x), [2100], g, dest); return t + d; };
function bong(t, dest, g = .2){ [0, .32].forEach(o => { const os = keep(A.createOscillator()), gg = A.createGain(); os.type = "sine"; os.frequency.setValueAtTime(1350, t + o); os.frequency.exponentialRampToValueAtTime(980, t + o + .22);
    gg.gain.setValueAtTime(0, t + o); gg.gain.linearRampToValueAtTime(g, t + o + .01); gg.gain.exponentialRampToValueAtTime(.001, t + o + .26); os.connect(gg).connect(dest); os.start(t + o); os.stop(t + o + .3); }); return t + .64; }
function warble(t, d, dest, r, {pairs = [[1070, 1270], [2025, 2225], [980, 1180], [1650, 1850]], slot = [.008, .022], g = .16, type = "square"} = {}){
  const o = keep(A.createOscillator()), gg = A.createGain(); o.type = type; gg.gain.setValueAtTime(0, t); gg.gain.linearRampToValueAtTime(g, t + .02); gg.gain.setValueAtTime(g, t + d - .03); gg.gain.linearRampToValueAtTime(0, t + d);
  let x = t, pr = pairs[0]; while (x < t + d){ if (r() < .12) pr = pairs[Math.floor(r() * pairs.length)]; o.frequency.setValueAtTime(pr[r() < .5 ? 0 : 1], x); x += slot[0] + r() * (slot[1] - slot[0]); }
  o.connect(gg).connect(dest); o.start(t); o.stop(t + d + .02); return t + d; }
function hiss(t, d, dest, r, {g = .34, from = 1200, to = 2600, Q = .7, mod = [.02, .05]} = {}){
  if (d < .3) return t; const {g: gg, fl} = noise(t, d, {type:"bandpass", f:from, Q, gain:g, att:.04, rel:.12}, dest); fl.frequency.setValueAtTime(from, t); fl.frequency.linearRampToValueAtTime(to, t + Math.min(d, 2.4));
  let x = t + .05; while (x < t + d - .15){ gg.gain.setValueAtTime(g * (.55 + r() * .45), x); x += mod[0] + r() * (mod[1] - mod[0]); } return t + d; }
const pops = (t, d, dest, r, n) => { for (let i = 0; i < n; i++) noise(t + r() * d, .006 + r() * .02, {type:"bandpass", f:300 + r() * 2500, Q:.6, gain:.25 + r() * .35}, dest); };
// D: play(t, end) — the «kshhh» runs until `end` (a preview stops at the sample length, the splash keeps it going until the ending)
const D = {
  D1:{len:5.8, play(t, end, o){ const L = line(o), r = rng(11); let x = t; tone(x, .55, [350, 440], .16, L); x += .6; x = dial(x, "4951812", L) + .1; tone(x, .5, [440, 480], .12, L); x += .65;
    x = answer(x, .55, L); x = warble(x + .03, 1.2, L, r, {slot:[.007, .018]}); hiss(x, end - x, L, r, {mod:[.015, .04]}); }},
  D2:{len:3.3, play(t, end, o){ const L = line(o), r = rng(11); let x = answer(t, .55, L); x = warble(x + .03, 1.2, L, r, {slot:[.007, .018]}); hiss(x, end - x, L, r, {mod:[.015, .04]}); }},
  D3:{len:6.0, play(t, end, o){ o.gain.value = .85; const L = line(shaper(o, 5), 450, 2600), r = rng(23); let x = t; tone(x, .5, [350, 440], .14, L); x += .55; x = dial(x, "0123", L, .18) + .1;
    x = answer(x, .8, L, .18); x = bong(x, L, .16); x = warble(x, 1.1, L, r, {g:.13, type:"sawtooth"}); hiss(x, end - x, L, r, {g:.3, from:900, to:1900}); pops(t, Math.min(end - t, 12), o, r, 26); }},
  D4:{len:5.0, play(t, end, o){ const lp = A.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 1700; lp.connect(o); o.gain.value = .9; const r = rng(31);
    let x = answer(t, .7, lp, .12); x = bong(x, lp, .12); x = warble(x, 1.4, lp, r, {type:"sine", g:.12, slot:[.018, .04], pairs:[[980, 1180], [1070, 1270], [1650, 1850]]}); hiss(x, end - x, lp, r, {g:.16, from:900, to:1500, mod:[.04, .09]}); }}
};
// E: play(t, F, LEN, o) with F = the flicker table in seconds [[s, tube]]
function humOsc(t, f, type, dest, lp, LEN){ const o = keep(A.createOscillator()), fl = A.createBiquadFilter(), g = A.createGain(); o.type = type; o.frequency.value = f; fl.type = "lowpass"; fl.frequency.value = lp; g.gain.value = 0; o.connect(fl).connect(g).connect(dest); o.start(t); o.stop(t + LEN + .3); return g; }
const E = {
  E1:{play(t, F, LEN, o){ const hum = humOsc(t, 100, "sawtooth", o, 1300, LEN), r = rng(41);
    F.forEach(([m, v], i) => { hum.gain.setValueAtTime(v * .3, t + m); if (i){ noise(t + m, .012, {f:3200, Q:1.2, gain:.55}, o); if (r() < .5) noise(t + m + .02, .008, {f:5200, Q:1, gain:.3}, o); } });
    hum.gain.setValueAtTime(0, t + LEN); }},
  E2:{play(t, F, LEN, o){ const r = rng(53), sz = humOsc(t, 6000, "sawtooth", o, 9000, LEN);
    F.forEach(([m, v], i) => { if (!i) return; const x = t + m, os = keep(A.createOscillator()), g = A.createGain(); os.type = "sawtooth"; os.frequency.setValueAtTime(700 + r() * 500, x); os.frequency.exponentialRampToValueAtTime(70, x + .07);
      g.gain.setValueAtTime(.22, x); g.gain.exponentialRampToValueAtTime(.001, x + .08); os.connect(g).connect(o); os.start(x); os.stop(x + .1);
      noise(x, .06 + r() * .1, {type:"highpass", f:2500, Q:.7, gain:.45}, o); for (let k = 0; k < 3 + r() * 4; k++) noise(x + r() * .05, .003 + r() * .004, {f:4000 + r() * 3000, Q:1, gain:.5}, o);
      sz.gain.setValueAtTime(v * .015, x); });
    sz.gain.setValueAtTime(0, t + LEN); }},
  E3:{play(t, F, LEN, o){ const sh = shaper(o, 10), hum = humOsc(t, 50, "sawtooth", sh, 700, LEN), r = rng(67); let pv = 1;
    F.forEach(([m, v], i) => { const x = t + m; hum.gain.setValueAtTime(v * .25, x); if (!i) return;
      if (v < pv){ const os = keep(A.createOscillator()), g = A.createGain(); os.type = "sine"; os.frequency.setValueAtTime(90, x); os.frequency.exponentialRampToValueAtTime(38, x + .14); g.gain.setValueAtTime(.55, x); g.gain.exponentialRampToValueAtTime(.001, x + .16); os.connect(g).connect(sh); os.start(x); os.stop(x + .18); }
      noise(x, .07 + r() * .06, {f:1200, Q:.7, gain:.4}, o); pv = v; });
    const e = t + F[F.length - 1][0] + .05; noise(e, .32, {type:"lowpass", f:1100, Q:.5, gain:.7}, o); hum.gain.setValueAtTime(0, e); }},
  E4:{play(t, F, LEN, o){ const hum = humOsc(t, 100, "triangle", o, 600, LEN), r = rng(79); let x = 0, k = 0;
    while (x < LEN - .1){ while (k < F.length - 1 && F[k + 1][0] <= x) k++; const v = F[k][1], chg = F.some(f => Math.abs(f[0] - x) < .04) ? 1 : 0;
      if (r() < .35 + v * .4 + chg * .4) noise(t + x, .002 + r() * .006, {type:"highpass", f:1800 + r() * 2500, Q:.7, gain:(.12 + r() * .35) * (.6 + chg * .6)}, o);
      x += .003 + r() * .009; }
    F.forEach(([m, v]) => hum.gain.setValueAtTime(v * .12, t + m)); hum.gain.setValueAtTime(0, t + LEN); }}
};
// the dial-up: hold = seconds the «kshhh» may run (the splash passes a long time and stops it with dialStop)
function dialStart(id, hold){ const d = D[id]; if (!d || !ctx()) return 0; dialStop(0); const t = A.currentTime + .08; dbus = bus(); d.play(t, t + Math.max(d.len, hold || d.len), dbus); return d.len; }
function dialStop(fade = .45){ if (!A || !dbus) return; const g = dbus.gain, t = A.currentTime; g.cancelScheduledValues(t); g.setValueAtTime(g.value, t); g.linearRampToValueAtTime(0, t + Math.max(.01, fade));
  const b = dbus; dbus = null; setTimeout(() => { try { b.disconnect(); } catch(e){} }, (fade + .1) * 1000); }
// the crackle: k stretches the flicker table (the splash uses 1.3, the phone run less); returns its length in seconds
function crackle(id, k = 1.3){ const e = E[id]; if (!e || !ctx()) return 0; const F = FL.map(f => [f[0] * k / 1000, f[1]]), LEN = F[F.length - 1][0] + .5; e.play(A.currentTime + .03, F, LEN, bus()); return LEN; }
function stopAll(){ dialStop(.05); live.forEach(n => { try { n.stop(); } catch(e){} }); live = []; }
return {FL, D:Object.keys(D), E:Object.keys(E), setVol, dialStart, dialStop, crackle, stopAll, len:id => D[id] ? D[id].len : FL[FL.length - 1][0] * 1.3 / 1000 + .5};
})();
