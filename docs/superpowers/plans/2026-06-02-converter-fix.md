# Converter Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the ChordPro converter so complex chord names (D7sus2, A7(b13)) are recognized and chords are inserted at word boundaries, not mid-word.

**Architecture:** Extract `convertToChordPro` from `SongConverter.tsx` into `src/lib/chordpro/converter.ts` for testability. Fix the chord regex and insertion logic. Add Vitest tests in `src/__tests__/converter.test.ts`.

**Tech Stack:** TypeScript, Vitest, existing project patterns.

---

### Task 1: Extract converter logic to its own module

**Files:**
- Create: `src/lib/chordpro/converter.ts`
- Modify: `src/components/SongConverter.tsx`

- [ ] Create `src/lib/chordpro/converter.ts` with the fixed `CHORD_PATTERN`, `isChordLineRegex`, `chordRegex`, and `convertToChordPro` function (see fixes below).

  **Fixed chord pattern** — adds `(?:(?:sus|add)[0-9]*)? ` after numbers and `(?:\([^)]+\))?` for parenthesized tensions:
  ```ts
  const CHORD_PATTERN =
    '(?:' +
      'N\\.C\\.' +
      '|' +
      '[A-G]' +
        '(?:#|b)?' +
        '(?:maj|min|m|M|dim|aug|sus|add)?' +
        '[0-9]*' +
        '(?:(?:sus|add)[0-9]*)?' +
        '(?:b5|#5|b9|#9|#11|b13)?' +
        '(?:\\([^)]+\\))?' +
        '(?:/[A-G](?:#|b)?)?' +
    ')';
  ```

  **Word-boundary snap helper:**
  ```ts
  function snapToWordStart(text: string, pos: number): number {
    if (pos <= 0) return 0;
    if (pos >= text.length) return text.length;
    if (text[pos - 1] === ' ') return pos;  // already at word start
    if (text[pos] === ' ') return pos;       // between words — keep
    let start = pos;
    while (start > 0 && text[start - 1] !== ' ') start--;
    return start;
  }
  ```

  **Use snap in chord insertion loop:**
  ```ts
  chords.forEach(({ chord, position }) => {
    const rawPos = position + offset;
    const insertPos = rawPos <= lyricLine.length
      ? snapToWordStart(lyricLine, rawPos)
      : lyricLine.length;
    lyricLine =
      lyricLine.slice(0, insertPos) +
      `[${chord}]` +
      lyricLine.slice(insertPos);
    offset += chord.length + 2;
  });
  ```

  Export: `export { convertToChordPro };`

- [ ] Update `src/components/SongConverter.tsx` to remove the local conversion code and import from the new module:
  ```ts
  import { convertToChordPro } from '../lib/chordpro/converter';
  ```

### Task 2: Write and run tests

**Files:**
- Create: `src/__tests__/converter.test.ts`

- [ ] Write tests covering all known failure cases plus regression for "From The Start":

  ```ts
  import { describe, it, expect } from 'vitest';
  import { convertToChordPro } from '../lib/chordpro/converter';

  describe('convertToChordPro', () => {
    // --- chord recognition ---
    it('recognizes D7sus2 as a chord line', () => {
      const input = 'Song\nArtist\n\n[Verse]\n          D7sus2\nDon\'t you notice how';
      const out = convertToChordPro(input);
      expect(out).toContain("Don't you [D7sus2]notice how");
    });

    it('recognizes A7(b13) as a chord line', () => {
      const input = 'Song\nArtist\n\n[Verse]\nEm7       A7(b13)\nsome lyrics here now';
      const out = convertToChordPro(input);
      expect(out).toContain('[Em7]some lyrics [A7(b13)]here now');
    });

    it('recognizes Dmaj7sus2 as a chord line', () => {
      const input = 'Song\nArtist\n\n[Verse]\nDmaj7sus2\nlyrics here';
      const out = convertToChordPro(input);
      expect(out).toContain('[Dmaj7sus2]lyrics here');
    });

    // --- word boundary snap ---
    it('snaps chord to word start instead of inserting mid-word', () => {
      // G6 at col 5, lyric "the same" has 's' at col 4
      const input = 'Song\nArtist\n\n[Verse]\n     G6\nthe same';
      const out = convertToChordPro(input);
      expect(out).toContain('the [G6]same');
      expect(out).not.toContain('s[G6]ame');
    });

    // --- basic functionality still works ---
    it('converts simple chord-above-lyric pair', () => {
      const input = 'Song\nArtist\n\n[Verse]\nC        G\nLine one lyrics here';
      const out = convertToChordPro(input);
      expect(out).toContain('[C]Line one [G]lyrics here');
    });

    it('emits title and subtitle directives', () => {
      const input = 'My Song\nThe Artist\n\n[Verse]\nC\nLyrics';
      const out = convertToChordPro(input);
      expect(out).toContain('{title: My Song}');
      expect(out).toContain('{st: The Artist}');
    });

    it('wraps chorus in soc/eoc', () => {
      const input = 'Song\nArtist\n\n[Chorus]\nC G\nChorus lyrics\n\n[Verse]\nAm\nVerse';
      const out = convertToChordPro(input);
      expect(out).toContain('{soc}');
      expect(out).toContain('{eoc}');
    });

    // --- regression: From The Start ---
    it('From The Start regression: D7sus2 chord inlines on notice', () => {
      const input = [
        'From The Start',
        'Laufey',
        '',
        '[Verse 1]',
        '          D7sus2',
        "Don't you notice how",
        'G6                              Cmaj7',
        "I get quiet when there's no one else around?",
      ].join('\n');
      const out = convertToChordPro(input);
      expect(out).toContain("Don't you [D7sus2]notice how");
      expect(out).toContain("[G6]I get quiet when there's no one [Cmaj7]else around?");
    });
  });
  ```

- [ ] Run tests: `npm run test:run -- src/__tests__/converter.test.ts`
- [ ] All tests pass.
