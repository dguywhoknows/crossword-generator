const { $, $$, h, esc, busy, toast, store, download } = Kit;
let entries = [], seed = 1, title = '', puzzle = null, dir = 'A', focus = null, timerInt = null, t0 = 0, solved = false, revealed = false;
let archive = store.get('archive', []);

/* ================= play ================= */
function layout(newSeed) {
  seed = newSeed;
  puzzle = buildCrossword(entries, seed);
  puzzle.cells.flat().filter(Boolean).forEach((c) => { c.val = ''; c.pencil = false; });
  render();
}
function render() {
  const { H, W, cells } = puzzle, board = $('#board');
  $('#title').textContent = title;
  board.style.gridTemplateColumns = `repeat(${W}, var(--cell))`;
  board.innerHTML = '';
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const c = cells[y][x];
    if (!c) { board.append(h('div', { class: 'cell block' })); continue; }
    const inp = h('input', { maxlength: 1, 'aria-label': `row ${y + 1} column ${x + 1}`, inputmode: 'text', autocomplete: 'off' });
    inp.onfocus = () => setFocus(y, x);
    inp.onmousedown = (e) => { if (focus && focus[0] === y && focus[1] === x) { e.preventDefault(); toggleDir(); } };
    inp.onkeydown = (e) => key(e, y, x);
    inp.oninput = (e) => type(y, x, e.target.value.slice(-1).toUpperCase().replace(/[^A-Z]/, ''));
    c.el = h('div', { class: 'cell' }, c.num ? h('span', { class: 'num' }, c.num) : '', inp);
    board.append(c.el);
  }
  const list = (d) => puzzle.words.filter((w) => w.d === d).sort((a, b) => a.num - b.num).map((w) => h('li', { 'data-k': w.d + w.num, onclick: () => { dir = w.d; cellInput(w.y, w.x).focus(); } }, h('b', {}, w.num), h('span', {}, `${w.clue || '(no clue)'} (${w.answer.length})`)));
  $('#across').replaceChildren(...list('A'));
  $('#down').replaceChildren(...list('D'));
  const dropped = entries.length - puzzle.words.length;
  $('#meta').textContent = `${puzzle.words.length} words on a ${W}×${H} grid${dropped ? ` · ${dropped} word${dropped > 1 ? 's' : ''} could not interlock and were left out` : ''}.`;
  solved = false; revealed = false;
  clearInterval(timerInt); t0 = Date.now();
  timerInt = setInterval(() => { if (!solved) $('#timer').textContent = fmtTime((Date.now() - t0) / 1000); }, 1000);
  progress();
  const first = puzzle.words.find((w) => w.d === 'A') || puzzle.words[0];
  dir = first.d;
  setTimeout(() => cellInput(first.y, first.x)?.focus(), 50);
}
const cellAt = (y, x) => puzzle.cells[y]?.[x] || null;
const cellInput = (y, x) => cellAt(y, x)?.el.querySelector('input');
function currentWord() { const c = focus && cellAt(...focus); return c ? c.words[dir] || c.words[dir === 'A' ? 'D' : 'A'] : null; }
function setFocus(y, x) { focus = [y, x]; if (!cellAt(y, x).words[dir]) dir = dir === 'A' ? 'D' : 'A'; highlight(); }
function toggleDir() { const other = dir === 'A' ? 'D' : 'A'; if (cellAt(...focus).words[other]) { dir = other; highlight(); } }
function highlight() {
  $$('#board .cell').forEach((e) => e.classList.remove('word', 'focus'));
  const w = currentWord();
  if (w) cellsOf(w).forEach(([y, x]) => cellAt(y, x).el.classList.add('word'));
  cellAt(...focus).el.classList.add('focus');
  $$('.clues li').forEach((li) => li.classList.toggle('on', !!w && li.dataset.k === w.d + w.num));
  $('#curClue').textContent = w ? `${w.num} ${w.d === 'A' ? 'Across' : 'Down'}: ${w.clue || '(no clue)'}` : '';
  $(`.clues li[data-k="${w?.d}${w?.num}"]`)?.scrollIntoView({ block: 'nearest' });
}
function step(y, x, delta) { const n = [y + (dir === 'D' ? delta : 0), x + (dir === 'A' ? delta : 0)]; return cellAt(...n) ? n : null; }
function type(y, x, v) {
  const c = cellAt(y, x);
  c.val = v; c.pencil = !!v && $('#pencil').checked;
  c.el.querySelector('input').value = v;
  c.el.classList.toggle('pencil', c.pencil);
  c.el.classList.remove('ok');
  c.el.classList.toggle('wrong', $('#autocheck').checked && !!v && v !== c.ch);
  if (v) { const n = step(y, x, 1); if (n) cellInput(...n).focus(); }
  progress();
}
function key(e, y, x) {
  const arrows = { ArrowRight: [0, 1, 'A'], ArrowLeft: [0, -1, 'A'], ArrowDown: [1, 0, 'D'], ArrowUp: [-1, 0, 'D'] };
  if (arrows[e.key]) {
    e.preventDefault();
    const [dy, dx, d] = arrows[e.key];
    if (dir !== d && cellAt(y, x).words[d]) { dir = d; highlight(); return; }
    let ny = y + dy, nx = x + dx;
    while (ny >= 0 && nx >= 0 && ny < puzzle.H && nx < puzzle.W && !cellAt(ny, nx)) { ny += dy; nx += dx; }
    if (cellAt(ny, nx)) cellInput(ny, nx).focus();
  } else if (e.key === 'Backspace') {
    e.preventDefault();
    if (cellAt(y, x).val) type(y, x, '');
    else { const p = step(y, x, -1); if (p) { cellInput(...p).focus(); type(...p, ''); cellInput(...p).focus(); } }
  } else if (e.key === 'Tab') {
    e.preventDefault();
    const ws = [...puzzle.words].sort((a, b) => (a.d === b.d ? a.num - b.num : a.d === 'A' ? -1 : 1));
    const n = ws[(ws.indexOf(currentWord()) + (e.shiftKey ? -1 : 1) + ws.length) % ws.length];
    dir = n.d; cellInput(n.y, n.x).focus();
  } else if (e.key === ' ') { e.preventDefault(); toggleDir(); }
  else if (/^[a-z]$/i.test(e.key) && !e.ctrlKey && !e.metaKey) { e.preventDefault(); type(y, x, e.key.toUpperCase()); }
}
function progress() {
  const all = puzzle.cells.flat().filter(Boolean), filled = all.filter((c) => c.val).length;
  $('#progress').textContent = `${filled}/${all.length} filled`;
  $$('.clues li').forEach((li) => { const w = puzzle.words.find((x) => x.d + x.num === li.dataset.k); li.classList.toggle('done', !!w && cellsOf(w).every(([y, x]) => cellAt(y, x).val)); });
  if (!solved && all.every((c) => c.val === c.ch)) {
    solved = true;
    const secs = (Date.now() - t0) / 1000;
    all.forEach((c) => c.el.classList.add('ok'));
    archive.unshift({ t: Date.now(), title, words: puzzle.words.length, size: `${puzzle.W}×${puzzle.H}`, secs, revealed, code: encodeShare(title, seed, entries) });
    store.set('archive', archive.slice(0, 200));
    toast(revealed ? 'Completed with reveals' : `Solved in ${fmtTime(secs)}`);
  }
}
const revealCells = (list) => { revealed = true; list.forEach((c) => { c.val = c.ch; c.pencil = false; c.el.querySelector('input').value = c.ch; c.el.classList.add('revealed'); c.el.classList.remove('wrong', 'pencil'); }); progress(); };
$('#checkBtn').onclick = () => { let wrong = 0; puzzle.cells.flat().filter(Boolean).forEach((c) => { const bad = !!c.val && c.val !== c.ch; c.el.classList.toggle('wrong', bad); wrong += bad; }); toast(wrong ? `${wrong} wrong letter${wrong > 1 ? 's' : ''}` : 'No mistakes so far'); };
$('#revealWord').onclick = () => { const w = currentWord(); if (w) revealCells(cellsOf(w).map(([y, x]) => cellAt(y, x))); };
$('#revealAll').onclick = () => revealCells(puzzle.cells.flat().filter(Boolean));
$('#clear').onclick = () => { puzzle.cells.flat().filter(Boolean).forEach((c) => { c.val = ''; c.pencil = false; c.el.querySelector('input').value = ''; c.el.classList.remove('revealed', 'wrong', 'ok', 'pencil'); }); solved = false; revealed = false; t0 = Date.now(); progress(); };
$('#print').onclick = () => window.print();
$('#autocheck').onchange = () => puzzle.cells.flat().filter(Boolean).forEach((c) => c.el.classList.toggle('wrong', $('#autocheck').checked && !!c.val && c.val !== c.ch));
const shareUrl = () => `${location.origin}${location.pathname}?p=${encodeShare(title, seed, entries)}`;
$('#share').onclick = () => navigator.clipboard.writeText(shareUrl()).then(() => toast('Link copied. Anyone who opens it gets this exact grid.'));
$('#ipuz').onclick = () => download(`${title.replace(/\W+/g, '-').toLowerCase() || 'crossword'}.ipuz`, JSON.stringify(toIpuz(puzzle, title), null, 2), 'application/json');

async function make() {
  const diff = $('#diff').value;
  const out = await AI.chat([
    { role: 'system', content: `You are a crossword editor. For the theme, list 18 answers (single words or phrases with spaces removed), 3-11 letters, letters A-Z only, varied lengths, mixing obvious and surprising theme entries. Clues: ${diff === 'easy' ? 'straightforward definitions' : diff === 'cryptic' ? 'playful wordplay, puns and misdirection (mark puns with a ?)' : 'NYT-Tuesday style, concise and clever'}. Never put the answer in its clue. Return JSON {"title":"punny puzzle title","words":[{"answer":"","clue":""}]}.` },
    { role: 'user', content: 'Theme: ' + $('#theme').value },
  ], { json: true, temperature: 0.8, maxTokens: 2000, demo: () => demoWords($('#theme').value) });
  if (AI.mode() === 'demo' && !/space|astro|planet|star|ocean|sea|marine|beach|fish/i.test($('#theme').value)) toast('Without a model provider there are two built-in themes: space and ocean. Use the Build page for your own words.');
  const list = parseWordList((out.words || []).map((w) => `${w.answer}: ${w.clue || ''}`).join('\n')).entries;
  if (list.length < 4) throw new Error('Not enough usable words. Try another theme.');
  entries = list; title = out.title || $('#theme').value;
  layout(Date.now() % 1e6);
}
$('#make').onclick = (e) => busy(e.currentTarget, make);
$('#theme').addEventListener('keydown', (e) => { if (e.key === 'Enter') $('#make').click(); });
$('#reshuffle').onclick = () => entries.length && layout(Math.floor(Math.random() * 1e6));

/* ================= build ================= */
function readBuild() {
  const r = parseWordList($('#bWords').value);
  $('#bErrors').innerHTML = r.errors.map(esc).join('<br>');
  return r;
}
function previewBuild() {
  const r = readBuild();
  if (r.entries.length < 2) { $('#bPreview').innerHTML = ''; $('#bInfo').textContent = 'Add at least two words.'; return; }
  const p = buildCrossword(r.entries, 1, 20);
  $('#bPreview').style.gridTemplateColumns = `repeat(${p.W}, 18px)`;
  $('#bPreview').innerHTML = p.cells.flat().map((c) => (c ? `<div>${c.ch}</div>` : '<div class="b"></div>')).join('');
  const missing = r.entries.filter((e) => !e.clue).length;
  $('#bInfo').textContent = `${p.words.length}/${r.entries.length} words fit on a ${p.W}×${p.H} grid${missing ? ` · ${missing} without a clue` : ''}.`;
}
let buildTimer = null;
$('#bWords').addEventListener('input', () => { clearTimeout(buildTimer); buildTimer = setTimeout(previewBuild, 300); });
$('#bClues').onclick = (e) => busy(e.currentTarget, async () => {
  const r = readBuild(), need = r.entries.filter((x) => !x.clue);
  if (!need.length) return toast('Every word already has a clue');
  const out = await AI.chat([
    { role: 'system', content: 'Write one concise crossword clue per answer, NYT-Tuesday style, never containing the answer. Return JSON {"clues":[{"answer":"","clue":""}]}.' },
    { role: 'user', content: `Puzzle title: ${$('#bTitle').value}\nAnswers: ${need.map((x) => x.answer).join(', ')}` },
  ], { json: true, temperature: 0.6, demo: () => ({ clues: need.map((x) => ({ answer: x.answer, clue: `${x.answer.length}-letter term from "${$('#bTitle').value}"` })) }) });
  const map = Object.fromEntries((out.clues || []).map((c) => [cleanAnswer(c.answer), c.clue]));
  $('#bWords').value = r.entries.map((x) => `${x.answer}: ${x.clue || map[x.answer] || ''}`).join('\n');
  previewBuild();
});
$('#bBuild').onclick = () => {
  const r = readBuild();
  if (r.entries.length < 2) return toast('Add at least two words', 'err');
  entries = r.entries; title = $('#bTitle').value.trim() || 'My crossword';
  layout(Date.now() % 1e6);
  Router.go('puzzle');
};
$('#bSearch').onclick = () => { const r = readBuild(); if (r.entries.length < 2) return toast('Add at least two words', 'err'); wsWords = r.entries.map((x) => x.answer); wsTitle = $('#bTitle').value; Router.go('wordsearch'); newSearch(); };

/* ================= word search ================= */
let ws = null, wsWords = [], wsTitle = '', found = new Set(), dragStart = null;
function newSearch() {
  if (!wsWords.length) { wsWords = (entries.length ? entries : demoWords('space').words).map((x) => x.answer); wsTitle = title || 'Word search'; }
  const size = Math.max(+$('#wsSize').value, ...wsWords.map((w) => cleanAnswer(w).length));
  ws = wordSearch(wsWords, size, Date.now() % 1e6, { backwards: $('#wsBack').checked });
  found = new Set();
  $('#wsTitle').textContent = wsTitle;
  const g = $('#wsGrid');
  g.style.gridTemplateColumns = `repeat(${size}, 34px)`;
  g.innerHTML = '';
  ws.grid.forEach((row, y) => row.forEach((ch, x) => g.append(h('span', { 'data-y': y, 'data-x': x }, ch))));
  renderSearchList();
}
function renderSearchList() {
  $('#wsWords').innerHTML = ws.placements.map((p) => `<li class="${found.has(p.word) ? 'found' : ''}">${p.word}</li>`).join('');
  $('#wsStatus').textContent = `${found.size}/${ws.placements.length} found${ws.skipped.length ? ` · ${ws.skipped.join(', ')} did not fit` : ''}`;
  if (found.size && found.size === ws.placements.length) toast('All words found');
}
function lineCells(a, b) {
  const dy = Math.sign(b[0] - a[0]), dx = Math.sign(b[1] - a[1]), n = Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1]));
  if (!(a[0] === b[0] || a[1] === b[1] || Math.abs(b[0] - a[0]) === Math.abs(b[1] - a[1]))) return [a];
  return Array.from({ length: n + 1 }, (_, i) => [a[0] + dy * i, a[1] + dx * i]);
}
const spanAt = (y, x) => $(`#wsGrid span[data-y="${y}"][data-x="${x}"]`);
$('#wsGrid').addEventListener('pointerdown', (e) => { const s = e.target.closest('span'); if (!s) return; dragStart = [+s.dataset.y, +s.dataset.x]; $('#wsGrid').setPointerCapture(e.pointerId); s.classList.add('sel'); });
$('#wsGrid').addEventListener('pointermove', (e) => {
  if (!dragStart) return;
  const s = document.elementFromPoint(e.clientX, e.clientY)?.closest('#wsGrid span');
  if (!s) return;
  $$('#wsGrid span.sel').forEach((x) => x.classList.remove('sel'));
  lineCells(dragStart, [+s.dataset.y, +s.dataset.x]).forEach(([y, x]) => spanAt(y, x)?.classList.add('sel'));
});
$('#wsGrid').addEventListener('pointerup', () => {
  const sel = $$('#wsGrid span.sel'), word = sel.map((s) => s.textContent).join(''), rev = [...word].reverse().join('');
  const hit = ws.placements.find((p) => !found.has(p.word) && (p.word === word || p.word === rev));
  if (hit) { found.add(hit.word); sel.forEach((s) => s.classList.add('found')); renderSearchList(); }
  sel.forEach((s) => s.classList.remove('sel'));
  dragStart = null;
});
$('#wsNew').onclick = newSearch;
$('#wsSize').onchange = newSearch;
$('#wsBack').onchange = newSearch;
$('#wsPrint').onclick = () => window.print();

/* ================= archive ================= */
function renderArchive() {
  const clean = archive.filter((a) => !a.revealed);
  $('#arKpis').innerHTML = [['Completed', archive.length], ['Solved clean', clean.length], ['Best time', clean.length ? fmtTime(Math.min(...clean.map((a) => a.secs))) : '—'], ['Average', clean.length ? fmtTime(clean.reduce((s, a) => s + a.secs, 0) / clean.length) : '—']]
    .map(([k, v]) => `<div class="stat"><div class="k">${k}</div><div class="v">${v}</div></div>`).join('');
  const t = $('#arTable');
  t.innerHTML = '';
  t.append(h('tr', {}, ['Date', 'Puzzle', 'Words', 'Grid', 'Time', ''].map((x) => h('th', {}, x))));
  if (!archive.length) t.append(h('tr', {}, h('td', { colspan: 6, class: 'muted' }, 'Finished puzzles appear here.')));
  archive.forEach((a) => t.append(h('tr', {}, h('td', {}, new Date(a.t).toLocaleDateString()), h('td', {}, a.title), h('td', {}, a.words), h('td', {}, a.size), h('td', {}, a.revealed ? 'with reveals' : fmtTime(a.secs)),
    h('td', {}, h('button', { class: 'btn ghost sm', onclick: () => { const d = decodeShare(a.code); entries = d.entries; title = d.title; layout(d.seed); Router.go('puzzle'); } }, 'Play again')))));
}

/* ================= boot ================= */
Router.on('archive', renderArchive);
Router.on('wordsearch', () => ws || newSearch());
Router.on('build', previewBuild);
const shared = new URLSearchParams(location.search).get('p');
if (shared) {
  try { const d = decodeShare(shared); entries = d.entries; title = d.title; layout(d.seed); toast('Shared puzzle loaded'); }
  catch { toast('That puzzle link is broken', 'err'); make().catch((e) => toast(e.message, 'err')); }
} else make().catch((e) => toast(e.message, 'err'));

/* ================= AI command box ================= */
const findWord = (ref) => { const m = String(ref).match(/(\d+)\s*-?\s*(a|across|d|down)/i); if (!m) throw new Error('Say which clue, like "3 down"'); const w = puzzle.words.find((x) => x.num === +m[1] && x.d === m[2][0].toUpperCase()); if (!w) throw new Error(`No ${m[1]} ${m[2]}`); return w; };
Copilot.register({
  context: () => `Puzzle "${title}" ${puzzle ? `${puzzle.W}x${puzzle.H}, clues: ${puzzle.words.map((w) => `${w.num}${w.d} (${w.answer.length}) ${w.clue}`).join('; ')}` : 'none'}. Filled: ${$('#progress').textContent}. Build page word list: ${$('#bWords').value.split('\n').filter(Boolean).length} lines.`,
  actions: [
    { name: 'make_crossword', description: 'Write words and clues for a theme and build a new crossword', params: { theme: 'theme', difficulty: [...$('#diff').options].map((o) => o.value).join(' | ') },
      run: async ({ theme, difficulty }) => { $('#theme').value = theme; if (difficulty) $('#diff').value = difficulty; Router.go('puzzle'); await make(); return `Built "${title}" with ${puzzle.words.length} words`; } },
    { name: 'build_from_words', description: 'Put your own word list on the Build page and make a crossword or a word search from it', params: { title: 'title', words: 'array of {answer, clue}; clue optional', as: 'crossword | wordsearch' },
      run: ({ title: t, words, as }) => { if (t) $('#bTitle').value = t; if (words) $('#bWords').value = (Array.isArray(words) ? words : String(words).split(/[\n,]/)).map((w) => (typeof w === 'string' ? w.trim() : `${w.answer}: ${w.clue || ''}`)).filter(Boolean).join('\n'); const r = readBuild(); if (r.entries.length < 2) throw new Error('Need at least two words'); if (as === 'wordsearch') { wsWords = r.entries.map((x) => x.answer); wsTitle = $('#bTitle').value; Router.go('wordsearch'); newSearch(); return `Word search with ${ws.placements.length} words`; } $('#bBuild').click(); return `Crossword with ${puzzle.words.length} words`; } },
    { name: 'write_clues', description: 'Write clues for Build-page words that have none', params: {}, run: async () => { Router.go('build'); await $('#bClues').onclick({ currentTarget: $('#bClues') }); return 'Clues written'; } },
    { name: 'hint', description: 'Reveal one letter of a clue\'s answer (the first empty or wrong square)', params: { clue: 'like "3 down" or "12 across"' },
      run: ({ clue }) => { const w = findWord(clue), cs = cellsOf(w).map(([y, x]) => cellAt(y, x)), c = cs.find((k) => k.val !== k.ch); if (!c) return 'That answer is already complete'; revealCells([c]); progress(); return `Revealed "${c.ch}" in ${w.num} ${w.d === 'A' ? 'across' : 'down'} (letter ${cs.indexOf(c) + 1} of ${cs.length})`; } },
    { name: 'reveal_answer', description: 'Reveal a whole answer', params: { clue: 'like "3 down"' }, run: ({ clue }) => { const w = findWord(clue); revealCells(cellsOf(w).map(([y, x]) => cellAt(y, x))); progress(); return `${w.num} ${w.d === 'A' ? 'across' : 'down'} is ${w.answer}`; } },
    { name: 'check_grid', description: 'Mark wrong letters in the grid', params: {}, run: () => { $('#checkBtn').click(); return `${puzzle.cells.flat().filter((c) => c && c.val && c.val !== c.ch).length} wrong letters`; } },
    { name: 'reshuffle', description: 'Lay the same words out again in a different grid', params: {}, run: () => { $('#reshuffle').click(); return `New layout: ${puzzle.W}x${puzzle.H}`; } },
  ],
});
