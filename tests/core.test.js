const SPACE = () => demoWords('space').words.map((w) => ({ answer: w.answer, clue: w.clue }));

test('cleanAnswer keeps letters only and strips accents', () => {
  assert.eq(cleanAnswer('Café au lait!'), 'CAFEAULAIT');
  assert.eq(cleanAnswer("O'Neil"), 'ONEIL');
});

test('buildCrossword places most words in a valid, consistent grid', () => {
  for (const seed of [1, 7, 42, 99, 2024]) {
    const p = buildCrossword(SPACE(), seed);
    assert.ok(p.words.length >= 14, `seed ${seed}: ${p.words.length}`);
    assert.deepEq(validateGrid(p), [], `seed ${seed}`);
    p.words.forEach((w) => cellsOf(w).forEach(([y, x], i) => assert.eq(p.cells[y][x].ch, w.answer[i])));
    const crossed = p.words.filter((w) => cellsOf(w).some(([y, x]) => Object.keys(p.cells[y][x].words).length === 2));
    assert.eq(crossed.length, p.words.length, 'every word crosses another');
  }
});

test('buildCrossword is deterministic for a seed and numbers in reading order', () => {
  const a = buildCrossword(SPACE(), 5), b = buildCrossword(SPACE(), 5);
  assert.deepEq(a.words.map((w) => [w.answer, w.y, w.x, w.d]), b.words.map((w) => [w.answer, w.y, w.x, w.d]));
  const starts = a.words.map((w) => [w.y, w.x, w.num]).sort((p, q) => p[2] - q[2]);
  starts.forEach((s, i) => { if (i) assert.ok(s[0] > starts[i - 1][0] || (s[0] === starts[i - 1][0] && s[1] >= starts[i - 1][1])); });
  assert.eq(Math.max(...a.words.map((w) => w.num)), new Set(a.words.map((w) => w.y + ',' + w.x)).size);
});

test('validateGrid catches unintended words', () => {
  const p = buildCrossword([{ answer: 'CAT', clue: '' }, { answer: 'TOP', clue: '' }], 1);
  assert.deepEq(validateGrid(p), []);
  const bad = JSON.parse(JSON.stringify(p));
  bad.words = bad.words.slice(0, 1);
  assert.eq(validateGrid(bad).length, 1);
});

test('parseWordList accepts several formats and reports problems', () => {
  const r = parseWordList('Sun: Our star\nmoon - Earth’s satellite\nComet\tIcy visitor\nNebula\nab: too short\nsun: dupe\n# comment\nMars: Mars bars');
  assert.deepEq(r.entries.map((e) => [e.answer, e.clue]), [['SUN', 'Our star'], ['MOON', 'Earth’s satellite'], ['COMET', 'Icy visitor'], ['NEBULA', '']]);
  assert.eq(r.errors.length, 3);
  assert.ok(/contains the answer/.test(r.errors[2]));
});

test('share codes round-trip, including non-ASCII clues', () => {
  const code = encodeShare('Café quiz', 77, [{ answer: 'LATTE', clue: 'Café drink ☕' }]);
  assert.ok(/^[A-Za-z0-9_-]+$/.test(code));
  const d = decodeShare(code);
  assert.deepEq(d, { title: 'Café quiz', seed: 77, entries: [{ answer: 'LATTE', clue: 'Café drink ☕' }] });
  assert.throws(() => decodeShare(toBase64Url('[2]')));
  const p1 = buildCrossword(d.entries.concat(SPACE()), d.seed), p2 = buildCrossword(d.entries.concat(SPACE()), d.seed);
  assert.eq(JSON.stringify(p1.words), JSON.stringify(p2.words));
});

test('ipuz export', () => {
  const p = buildCrossword(SPACE(), 3), ip = toIpuz(p, 'Lost in Space');
  assert.deepEq(ip.dimensions, { width: p.W, height: p.H });
  assert.eq(ip.clues.Across.length + ip.clues.Down.length, p.words.length);
  const w = p.words[0];
  assert.eq(ip.puzzle[w.y][w.x], w.num);
  assert.eq(ip.solution[w.y][w.x], w.answer[0]);
  assert.ok(ip.puzzle.flat().includes('#') || p.words.length < 2);
});

test('wordSearch hides every word along valid lines', () => {
  const words = ['ORBIT', 'COMET', 'MARS', 'GALAXY', 'NEBULA', 'ROCKET'];
  const ws = wordSearch(words, 10, 9, { backwards: true });
  assert.eq(ws.grid.length, 10);
  assert.ok(ws.grid.every((row) => row.length === 10 && row.every((c) => /^[A-Z]$/.test(c))));
  assert.eq(ws.placements.length, 6);
  ws.placements.forEach((p) => assert.eq(readPlacement(ws.grid, p), p.word));
  assert.deepEq(wordSearch(['TOOLONGWORDHERE'], 6, 1).skipped, ['TOOLONGWORDHERE']);
  assert.ok(wordSearch(words, 10, 4, { diagonal: false }).placements.every((p) => ['E', 'S'].includes(p.dir)));
  assert.eq(fmtTime(125), '2:05');
});
