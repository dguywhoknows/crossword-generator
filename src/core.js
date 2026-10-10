/* Crossword construction and numbering, grid validation, word lists, share codes, ipuz export and word-search generation (pure, unit-tested). */

function seededRng(seed) {
  var a = seed >>> 0;
  return function () { a = (a + 0x6d2b79f5) | 0; var t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function cleanAnswer(s) { return String(s || '').toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Z]/g, ''); }

/* ---------- construction ---------- */
/* Greedy placement: each word must cross an existing one, never run alongside another word, and never extend one. */
function tryLayout(order, r) {
  var grid = new Map(), placed = [], minR = 0, maxR = 0, minC = 0, maxC = 0, crossings = 0;
  var key = function (y, x) { return y + ',' + x; }, at = function (y, x) { return grid.get(key(y, x)); };
  var put = function (w, y, x, d) {
    for (var i = 0; i < w.answer.length; i++) {
      var yy = y + (d === 'D' ? i : 0), xx = x + (d === 'A' ? i : 0), c = at(yy, xx);
      if (c) { c.dirs[d] = 1; crossings++; } else { var dirs = {}; dirs[d] = 1; grid.set(key(yy, xx), { ch: w.answer[i], dirs: dirs }); }
      minR = Math.min(minR, yy); maxR = Math.max(maxR, yy); minC = Math.min(minC, xx); maxC = Math.max(maxC, xx);
    }
    placed.push({ answer: w.answer, clue: w.clue, y: y, x: x, d: d });
  };
  var fits = function (w, y, x, d) {
    var dy = d === 'D' ? 1 : 0, dx = d === 'A' ? 1 : 0, L = w.answer.length, cross = 0;
    if (at(y - dy, x - dx) || at(y + dy * L, x + dx * L)) return -1;
    for (var i = 0; i < L; i++) {
      var yy = y + dy * i, xx = x + dx * i, c = at(yy, xx);
      if (c) { if (c.ch !== w.answer[i] || c.dirs[d]) return -1; cross++; }
      else if (at(yy + dx, xx + dy) || at(yy - dx, xx - dy)) return -1;
    }
    return cross;
  };
  put(order[0], 0, 0, 'A');
  order.slice(1).forEach(function (w) {
    var opts = [];
    grid.forEach(function (c, k) {
      var p = k.split(',').map(Number);
      for (var i = 0; i < w.answer.length; i++) {
        if (w.answer[i] !== c.ch) continue;
        ['A', 'D'].forEach(function (d) {
          if (c.dirs[d]) return;
          var y = d === 'D' ? p[0] - i : p[0], x = d === 'A' ? p[1] - i : p[1], cross = fits(w, y, x, d);
          if (cross < 1) return;
          var H = Math.max(maxR, y + (d === 'D' ? w.answer.length - 1 : 0)) - Math.min(minR, y) + 1, W = Math.max(maxC, x + (d === 'A' ? w.answer.length - 1 : 0)) - Math.min(minC, x) + 1;
          opts.push({ y: y, x: x, d: d, s: cross * 30 - H * W * 0.6 - Math.abs(H - W) * 4 + r() * 6 });
        });
      }
    });
    if (!opts.length) return;
    opts.sort(function (a, b) { return b.s - a.s; });
    put(w, opts[0].y, opts[0].x, opts[0].d);
  });
  return { placed: placed, minR: minR, maxR: maxR, minC: minC, maxC: maxC, crossings: crossings };
}
/* Number cells in reading order and build the cell grid. */
function finalize(res) {
  var H = res.maxR - res.minR + 1, W = res.maxC - res.minC + 1, cells = [];
  for (var y = 0; y < H; y++) { cells.push([]); for (var x = 0; x < W; x++) cells[y].push(null); }
  var words = res.placed.map(function (p) { return { answer: p.answer, clue: p.clue, y: p.y - res.minR, x: p.x - res.minC, d: p.d }; });
  words.forEach(function (p) { for (var i = 0; i < p.answer.length; i++) { var yy = p.y + (p.d === 'D' ? i : 0), xx = p.x + (p.d === 'A' ? i : 0); cells[yy][xx] = cells[yy][xx] || { ch: p.answer[i], words: {} }; } });
  words.sort(function (a, b) { return a.y - b.y || a.x - b.x || (a.d === 'A' ? -1 : 1); });
  var n = 0, starts = {};
  words.forEach(function (p) {
    var k = p.y + ',' + p.x;
    if (!starts[k]) starts[k] = ++n;
    p.num = starts[k]; cells[p.y][p.x].num = p.num;
    for (var i = 0; i < p.answer.length; i++) cells[p.y + (p.d === 'D' ? i : 0)][p.x + (p.d === 'A' ? i : 0)].words[p.d] = p;
  });
  return { H: H, W: W, cells: cells, words: words };
}
function buildCrossword(entries, seed, attempts) {
  var r = seededRng(seed || 1), best = null;
  for (var a = 0; a < (attempts || 40); a++) {
    var order = entries.slice().sort(function (x, y) { return y.answer.length - x.answer.length + (a ? (r() - 0.5) * 6 : 0); });
    var res = tryLayout(order, r), area = (res.maxR - res.minR + 1) * (res.maxC - res.minC + 1);
    var score = res.placed.length * 1000 - area + res.crossings * 5 - Math.abs((res.maxR - res.minR) - (res.maxC - res.minC)) * 8;
    if (!best || score > best.score) { best = res; best.score = score; }
    if (res.placed.length === entries.length && a > 12) break;
  }
  return finalize(best);
}
/* Every horizontal and vertical run of 2+ letters must be exactly one placed entry, and every crossing letter must agree. */
function validateGrid(p) {
  var errors = [], have = {};
  p.words.forEach(function (w) { have[w.d + ':' + w.y + ',' + w.x + ':' + w.answer] = 1; });
  ['A', 'D'].forEach(function (d) {
    var outer = d === 'A' ? p.H : p.W, inner = d === 'A' ? p.W : p.H;
    for (var o = 0; o < outer; o++) {
      var run = '', start = null;
      for (var i = 0; i <= inner; i++) {
        var c = i < inner ? (d === 'A' ? p.cells[o][i] : p.cells[i][o]) : null;
        if (c) { if (start === null) start = i; run += c.ch; }
        else {
          if (run.length >= 2) { var y = d === 'A' ? o : start, x = d === 'A' ? start : o; if (!have[d + ':' + y + ',' + x + ':' + run]) errors.push('unintended ' + (d === 'A' ? 'across' : 'down') + ' word ' + run); }
          run = ''; start = null;
        }
      }
    }
  });
  return errors;
}
function cellsOf(w) { var out = []; for (var i = 0; i < w.answer.length; i++) out.push([w.y + (w.d === 'D' ? i : 0), w.x + (w.d === 'A' ? i : 0)]); return out; }

/* ---------- word lists ---------- */
/* "ANSWER: clue", "answer - clue" or "answer<tab>clue" per line; a bare word gets an empty clue. */
function parseWordList(text) {
  var entries = [], errors = [], seen = {};
  String(text).split(/\r?\n/).forEach(function (line, i) {
    var l = line.trim();
    if (!l || l.charAt(0) === '#') return;
    var m = l.match(/^([^:\t]+?)\s*(?::|\t|\s[-–]\s)\s*(.*)$/), raw = m ? m[1] : l, clue = m ? m[2].trim() : '';
    var ans = cleanAnswer(raw);
    if (ans.length < 3) errors.push('Line ' + (i + 1) + ': "' + raw + '" needs at least 3 letters');
    else if (ans.length > 15) errors.push('Line ' + (i + 1) + ': "' + raw + '" is longer than 15 letters');
    else if (seen[ans]) errors.push('Line ' + (i + 1) + ': ' + ans + ' is a duplicate');
    else if (clue && cleanAnswer(clue).indexOf(ans) >= 0) errors.push('Line ' + (i + 1) + ': the clue for ' + ans + ' contains the answer');
    else { seen[ans] = 1; entries.push({ answer: ans, clue: clue }); }
  });
  return { entries: entries, errors: errors };
}

/* ---------- sharing ---------- */
function toBase64Url(str) { return btoa(unescape(encodeURIComponent(str))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
function fromBase64Url(s) { s = s.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; return decodeURIComponent(escape(atob(s))); }
/* A compact code that rebuilds the exact same grid: title, seed and entries. */
function encodeShare(title, seed, entries) { return toBase64Url(JSON.stringify([1, title, seed, entries.map(function (e) { return [e.answer, e.clue]; })])); }
function decodeShare(code) {
  var d = JSON.parse(fromBase64Url(code));
  if (!Array.isArray(d) || d[0] !== 1) throw new Error('Unknown puzzle code');
  return { title: d[1], seed: d[2], entries: d[3].map(function (x) { return { answer: cleanAnswer(x[0]), clue: String(x[1] || '') }; }) };
}

/* ---------- ipuz (open crossword format) ---------- */
function toIpuz(p, title, author) {
  var puzzle = [], solution = [];
  for (var y = 0; y < p.H; y++) { puzzle.push([]); solution.push([]); for (var x = 0; x < p.W; x++) { var c = p.cells[y][x]; puzzle[y].push(c ? c.num || 0 : '#'); solution[y].push(c ? c.ch : '#'); } }
  var clues = function (d) { return p.words.filter(function (w) { return w.d === d; }).sort(function (a, b) { return a.num - b.num; }).map(function (w) { return [w.num, w.clue]; }); };
  return { version: 'http://ipuz.org/v2', kind: ['http://ipuz.org/crossword#1'], title: title || 'Crossword', author: author || '', dimensions: { width: p.W, height: p.H }, puzzle: puzzle, solution: solution, clues: { Across: clues('A'), Down: clues('D') } };
}

/* ---------- word search ---------- */
var WS_DIRS = { E: [0, 1], S: [1, 0], SE: [1, 1], NE: [-1, 1], W: [0, -1], N: [-1, 0], NW: [-1, -1], SW: [1, -1] };
function wordSearch(words, size, seed, opts) {
  opts = opts || {};
  var r = seededRng(seed || 1), dirs = ['E', 'S'].concat(opts.diagonal === false ? [] : ['SE', 'NE']).concat(opts.backwards ? ['W', 'N', 'NW', 'SW'] : []);
  var grid = [], placements = [], skipped = [];
  for (var y = 0; y < size; y++) { grid.push([]); for (var x = 0; x < size; x++) grid[y].push(''); }
  words.map(cleanAnswer).filter(function (w) { return w.length >= 2; }).sort(function (a, b) { return b.length - a.length; }).forEach(function (w) {
    if (w.length > size) { skipped.push(w); return; }
    for (var t = 0; t < 400; t++) {
      var dn = dirs[Math.floor(r() * dirs.length)], d = WS_DIRS[dn], y0 = Math.floor(r() * size), x0 = Math.floor(r() * size);
      var ye = y0 + d[0] * (w.length - 1), xe = x0 + d[1] * (w.length - 1);
      if (ye < 0 || ye >= size || xe < 0 || xe >= size) continue;
      var ok = true;
      for (var i = 0; i < w.length && ok; i++) { var g = grid[y0 + d[0] * i][x0 + d[1] * i]; if (g && g !== w[i]) ok = false; }
      if (!ok) continue;
      for (i = 0; i < w.length; i++) grid[y0 + d[0] * i][x0 + d[1] * i] = w[i];
      placements.push({ word: w, y: y0, x: x0, dir: dn });
      return;
    }
    skipped.push(w);
  });
  var letters = 'EEEEAAAIIOOTTNNSSRRHLLDCUMFPGWYBVK';
  for (y = 0; y < size; y++) for (x = 0; x < size; x++) if (!grid[y][x]) grid[y][x] = letters[Math.floor(r() * letters.length)];
  return { grid: grid, placements: placements, skipped: skipped };
}
function readPlacement(grid, p) { var d = WS_DIRS[p.dir], s = ''; for (var i = 0; i < p.word.length; i++) s += grid[p.y + d[0] * i][p.x + d[1] * i]; return s; }
function fmtTime(s) { s = Math.max(0, Math.round(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }
