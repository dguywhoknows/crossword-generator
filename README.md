# crossword-generator

[![tests](https://github.com/dguywhoknows/crossword-generator/actions/workflows/tests.yml/badge.svg)](https://github.com/dguywhoknows/crossword-generator/actions/workflows/tests.yml)

Pick any theme: AI writes the words and clues, a backtracking-style constructor builds the grid, and you solve it in the browser.

Live: https://dguywhoknows.github.io/crossword-generator/

## Overview

Type a theme ("Space exploration", "90s cartoons", "Your best friend's hobbies") and choose a clue style. The AI writes about 18 themed answers with clues, from easy definitions to punny misdirection. A local constructor then interlocks them: it tries dozens of orderings, scores every legal crossing (no illegal side-by-side letters, proper word boundaries), and keeps the densest, squarest layout before numbering it in standard reading order. The solving UI behaves like a real crossword app, with arrow keys, Tab/Shift+Tab between clues, Space to switch direction, Backspace, a live clue bar, check/reveal, a timer and printing.

## Pages

- **Puzzle**
- **Build**
- **Word search**
- **Archive**
- **Settings**

## Features

- AI-written themed answers + clues in three styles (easy, NYT-Tuesday, punny/tricky)
- Grid constructor: multi-attempt search, crossing validation, adjacency rules, area/squareness scoring
- Standard numbering, across/down clue lists with completion strike-through
- Full keyboard solving: arrows, Tab/Shift+Tab, Space to flip direction, smart Backspace
- Check, reveal word, reveal all, clear, solve timer with completion detection
- New layout from the same words; print-friendly stylesheet (blank grid + clues)
- Build page: paste your own word list (ANSWER: clue, answer - clue, or bare words) with validation, a live layout preview, and model-written clues for any words missing one
- Word search page: the same words hidden horizontally, vertically, diagonally and optionally backwards; drag across letters to mark them; printable
- Share links encode the title, layout seed and entries, so a friend gets the identical grid with nothing stored on a server
- Export to .ipuz, the open crossword format
- Pencil mode for tentative letters and an optional autocheck
- Archive page: completed puzzles with solve times, best and average time, and replay
- Grid validation: every run of letters in the finished grid must be an intended entry

## How it works

LLM calls are used for:

- Themed answer/clue generation with style control (JSON), sanitized locally

Everything else (grid construction, numbering, solving UI, checking, timing, printing) runs locally in the browser.

## Getting started

No build step and no dependencies. Serve the folder with any static server:

```bash
git clone https://github.com/dguywhoknows/crossword-generator.git
cd crossword-generator
python -m http.server 8000
```

Then open http://localhost:8000.

`index.html` is the public home page, `login.html` handles accounts and `app.html` is the app.

### Telling the app what to do

Every page has an **Ask AI** box (Ctrl/Cmd+K). Type a request in plain words and the model plans a sequence of
calls to the app's own functions, runs them and reports back. The **Instructions** tab stores standing
preferences that are added to every AI request the app makes.

### Configuration

`src/lib/config.js` is generated from the build settings: the Supabase project (accounts) and the AI proxy URL.
Signed-in users get the built-in AI through the proxy, which keeps the provider key as a server-side secret.
Without those settings the app runs for guests, in demo mode, or with a personal [Groq](https://console.groq.com/keys)
or [OpenRouter](https://openrouter.ai/keys) key entered under **Settings → Model provider** (stored only in this
browser and sent only to that provider).

## Testing

`src/core.js` holds the app's logic as pure functions and is covered by 8 unit tests.

```bash
node tests/run-node.js        # CI runs this on every push
```

Or open `tests/index.html` in a browser ([live](https://dguywhoknows.github.io/crossword-generator/tests/)).

## Project structure

```
index.html           public home page (generated)
login.html           sign-in and sign-up (generated)
app.html             the app: markup for every page
src/app.js           UI, page wiring and event handlers
src/core.js          pure logic with no DOM access (unit-tested)
src/demo.js          sample responses used when no API key is configured
src/lib/ai.js        LLM client: Groq / OpenRouter, streaming, JSON mode, retries
src/lib/dom.js       DOM helpers, namespaced storage, markdown renderer
src/lib/router.js    hash router and the Settings page
src/lib/copilot.js   AI command box that drives the app's own functions
src/lib/auth.js      accounts (Supabase Auth) and the sign-in gate
styles/base.css      design tokens and shared components
styles/app.css       app-specific styles
tests/               unit tests (browser runner + Node runner for CI)
```

## Tech

- Constraint-based crossword construction heuristic
- Seeded RNG for reproducible layouts
- CSS Grid board + print media queries
- Construction, numbering, validation, word-list parsing, share codes, ipuz and word-search generation in src/core.js covered by unit tests run in the browser and in CI
- Vanilla JavaScript, no framework or bundler
- Deployed with GitHub Pages

## License

MIT
