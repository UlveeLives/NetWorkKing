/*! NetWorkKing — © 2026 Ulvi Badalov. Bütün hüquqlar qorunur / All rights reserved. Proprietary — see LICENSE. */
// QR code (ISO/IEC 18004) for labels, without any library: byte mode, error correction level M, versions 1–10
// (up to 213 bytes). QR.svg(text, size) → an <svg> string; QR.matrix(text) → rows of true/false.
"use strict";
const QR = (function(){
// level M: [EC codewords per block, [blocks, data codewords per block], …]
const BLK = [null, [10, [1, 16]], [16, [1, 28]], [26, [1, 44]], [18, [2, 32]], [24, [2, 43]], [16, [4, 27]], [18, [4, 31]], [22, [2, 38], [2, 39]], [22, [3, 36], [2, 37]], [26, [4, 43], [1, 44]]];
const ALIGN = [null, [], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34], [6, 22, 38], [6, 24, 42], [6, 26, 46], [6, 28, 50]];
const REM = [0, 0, 7, 7, 7, 7, 7, 0, 0, 0, 0];
// GF(256), polynomial 0x11D
const EXP = new Array(512), LOG = new Array(256); (() => { let x = 1; for (let i = 0; i < 255; i++){ EXP[i] = x; LOG[x] = i; x <<= 1; if (x & 256) x ^= 0x11D; } for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255]; })();
const mul = (a, b) => a && b ? EXP[LOG[a] + LOG[b]] : 0;
function rsGen(n){ let g = [1]; for (let i = 0; i < n; i++){ const ng = new Array(g.length + 1).fill(0); for (let j = 0; j < g.length; j++){ ng[j] ^= g[j]; ng[j + 1] ^= mul(g[j], EXP[i]); } g = ng; } return g; }
function rsEc(data, n){ const g = rsGen(n), r = data.concat(new Array(n).fill(0)); for (let i = 0; i < data.length; i++){ const c = r[i]; if (c) for (let j = 0; j < g.length; j++) r[i + j] ^= mul(g[j], c); } return r.slice(data.length); }
const utf8 = s => Array.from(new TextEncoder().encode(String(s)));
const capOf = v => BLK[v].slice(1).reduce((a, [n, d]) => a + n * d, 0);
function codewords(bytes){
  let v = 1; for (; v <= 10; v++){ const bits = 4 + (v < 10 ? 8 : 16) + bytes.length * 8; if (bits <= capOf(v) * 8) break; }
  if (v > 10) throw new Error("QR: text too long");
  const cap = capOf(v), bits = [], put = (x, n) => { for (let i = n - 1; i >= 0; i--) bits.push((x >>> i) & 1); };
  put(4, 4); put(bytes.length, v < 10 ? 8 : 16); bytes.forEach(b => put(b, 8));
  for (let i = 0; i < 4 && bits.length < cap * 8; i++) bits.push(0);
  while (bits.length % 8) bits.push(0);
  const data = []; for (let i = 0; i < bits.length; i += 8) data.push(parseInt(bits.slice(i, i + 8).join(""), 2));
  for (let p = 0; data.length < cap; p++) data.push(p % 2 ? 0x11 : 0xEC);
  // blocks, error correction, interleaving
  const ec = BLK[v][0], blocks = []; let k = 0; BLK[v].slice(1).forEach(([n, d]) => { for (let i = 0; i < n; i++){ const D = data.slice(k, k + d); k += d; blocks.push({D, E:rsEc(D, ec)}); } });
  const out = [], maxD = Math.max(...blocks.map(b => b.D.length));
  for (let i = 0; i < maxD; i++) blocks.forEach(b => { if (i < b.D.length) out.push(b.D[i]); });
  for (let i = 0; i < ec; i++) blocks.forEach(b => out.push(b.E[i]));
  return {v, cw:out};
}
function matrix(text){
  const {v, cw} = codewords(utf8(text)), N = 17 + 4 * v;
  const M = Array.from({length:N}, () => new Array(N).fill(null)), F = Array.from({length:N}, () => new Array(N).fill(false));
  const set = (r, c, val) => { M[r][c] = val; F[r][c] = true; };
  const finder = (r0, c0) => { for (let r = -1; r <= 7; r++) for (let c = -1; c <= 7; c++){ const R = r0 + r, C = c0 + c; if (R < 0 || C < 0 || R >= N || C >= N) continue;
    const on = r >= 0 && r <= 6 && c >= 0 && c <= 6 && (r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4)); set(R, C, on); } };
  finder(0, 0); finder(0, N - 7); finder(N - 7, 0);
  for (let i = 8; i < N - 8; i++){ set(6, i, i % 2 === 0); set(i, 6, i % 2 === 0); }
  const A = ALIGN[v], last = A.length - 1; A.forEach((r, i) => A.forEach((c, j) => { if ((i === 0 && j === 0) || (i === 0 && j === last) || (i === last && j === 0)) return; for (let y = -2; y <= 2; y++) for (let x = -2; x <= 2; x++) set(r + y, c + x, Math.max(Math.abs(y), Math.abs(x)) !== 1); }));
  set(4 * v + 9, 8, true);   // dark module
  // format areas reserved (filled after masking)
  for (let i = 0; i < 9; i++){ if (!F[8][i]) set(8, i, false); if (!F[i][8]) set(i, 8, false); }
  for (let i = 0; i < 8; i++){ if (!F[8][N - 1 - i]) set(8, N - 1 - i, false); if (!F[N - 1 - i][8]) set(N - 1 - i, 8, false); }
  // version information (v ≥ 7)
  if (v >= 7){ let d = v << 12; for (let i = 17; i >= 12; i--) if (d & (1 << i)) d ^= 0x1F25 << (i - 12); const bits = (v << 12) | d;
    for (let i = 0; i < 18; i++){ const b = !!((bits >> i) & 1), r = Math.floor(i / 3), c = N - 11 + i % 3; set(r, c, b); set(c, r, b); } }
  // data bits, zigzag from the bottom-right corner
  const bits = []; cw.forEach(b => { for (let i = 7; i >= 0; i--) bits.push((b >> i) & 1); }); for (let i = 0; i < REM[v]; i++) bits.push(0);
  let bi = 0, up = true;
  for (let c = N - 1; c > 0; c -= 2){ if (c === 6) c--;
    for (let k = 0; k < N; k++){ const r = up ? N - 1 - k : k; for (let j = 0; j < 2; j++){ const cc = c - j; if (F[r][cc]) continue; M[r][cc] = bi < bits.length ? !!bits[bi] : false; bi++; } }
    up = !up; }
  // masks: the one with the lowest penalty
  const MASK = [(r, c) => (r + c) % 2 === 0, r => r % 2 === 0, (r, c) => c % 3 === 0, (r, c) => (r + c) % 3 === 0, (r, c) => (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0,
    (r, c) => (r * c) % 2 + (r * c) % 3 === 0, (r, c) => ((r * c) % 2 + (r * c) % 3) % 2 === 0, (r, c) => ((r + c) % 2 + (r * c) % 3) % 2 === 0];
  const withFormat = (G, m) => { let d = (0 << 3 | m) << 10; const raw = d; for (let i = 14; i >= 10; i--) if (d & (1 << i)) d ^= 0x537 << (i - 10); const f = ((raw | d) ^ 0x5412);
    // level M = 00
    const bit = i => !!((f >> i) & 1);
    for (let i = 0; i <= 5; i++) G[i][8] = bit(i); G[7][8] = bit(6); G[8][8] = bit(7); G[8][7] = bit(8); for (let i = 9; i < 15; i++) G[8][14 - i] = bit(i);
    for (let i = 0; i < 8; i++) G[8][N - 1 - i] = bit(i); for (let i = 8; i < 15; i++) G[N - 15 + i][8] = bit(i); G[N - 8][8] = true; return G; };
  const penalty = G => { let p = 0;
    for (let r = 0; r < N; r++) for (const rowWise of [true, false]){ let run = 1; for (let c = 1; c < N; c++){ const a = rowWise ? G[r][c] : G[c][r], b = rowWise ? G[r][c - 1] : G[c - 1][r]; if (a === b){ run++; if (run === 5) p += 3; else if (run > 5) p++; } else run = 1; } }
    for (let r = 0; r < N - 1; r++) for (let c = 0; c < N - 1; c++){ const x = G[r][c]; if (x === G[r][c + 1] && x === G[r + 1][c] && x === G[r + 1][c + 1]) p += 3; }
    const pat = [1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 0], pat2 = pat.slice().reverse();
    for (let r = 0; r < N; r++) for (let c = 0; c <= N - 11; c++) for (const P of [pat, pat2]){ if (P.every((v, i) => G[r][c + i] === !!v)) p += 40; if (P.every((v, i) => G[c + i][r] === !!v)) p += 40; }
    let dark = 0; G.forEach(row => row.forEach(x => { if (x) dark++; })); p += Math.floor(Math.abs(dark * 20 - N * N * 10) / (N * N)) * 10;
    return p; };
  let best = null, bp = Infinity;
  for (let m = 0; m < 8; m++){ const G = M.map((row, r) => row.map((x, c) => F[r][c] ? x : (x !== MASK[m](r, c)))); withFormat(G, m); const pp = penalty(G); if (pp < bp){ bp = pp; best = G; } }
  return best;
}
function svg(text, size = 96, quiet = 4){ const G = matrix(text), N = G.length, T = N + quiet * 2; let d = "";
  G.forEach((row, r) => row.forEach((x, c) => { if (x) d += `M${c + quiet} ${r + quiet}h1v1h-1z`; }));
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${T} ${T}" width="${size}" height="${size}" shape-rendering="crispEdges"><rect width="${T}" height="${T}" fill="#fff"/><path d="${d}" fill="#000"/></svg>`; }
return {matrix, svg};
})();
if (typeof module !== "undefined") module.exports = QR;
