/**
 * Self-contained test runner for convertToChordPro.
 * Run with: npx tsx src/__tests__/converter.run.ts
 */
import { convertToChordPro } from '../lib/chordpro/converter';

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (e: any) {
    console.log(`  ✗ ${name}`);
    console.log(`      ${e.message}`);
    failed++;
  }
}

function expect(actual: unknown) {
  return {
    toContain(sub: string) {
      if (typeof actual !== 'string' || !actual.includes(sub)) {
        throw new Error(`Expected output to contain:\n  "${sub}"\nActual:\n${actual}`);
      }
    },
    not: {
      toContain(sub: string) {
        if (typeof actual === 'string' && actual.includes(sub)) {
          throw new Error(`Expected output NOT to contain: "${sub}"\nActual:\n${actual}`);
        }
      },
      toMatch(re: RegExp) {
        if (typeof actual === 'string' && re.test(actual)) {
          throw new Error(`Expected output NOT to match: ${re}\nActual:\n${actual}`);
        }
      },
    },
  };
}

function song(...sections: string[]): string {
  return ['My Song', 'My Artist', '', ...sections].join('\n');
}

// ── Chord recognition ─────────────────────────────────────────────────────────
console.log('\nChord recognition:');

test('recognizes D7sus2', () => {
  const out = convertToChordPro(song('[Verse]', '          D7sus2', "Don't you notice how"));
  expect(out).toContain("Don't you [D7sus2]notice how");
});

test('recognizes Dmaj7sus2', () => {
  const out = convertToChordPro(song('[Verse]', 'Dmaj7sus2', 'lyrics here'));
  expect(out).toContain('[Dmaj7sus2]lyrics here');
});

test('recognizes A7(b13)', () => {
  // Em7 at col 0, A7(b13) at col 10; col 10 in "some lyrics here now" is mid-"lyrics" → snaps to start of "lyrics"
  const out = convertToChordPro(song('[Verse]', 'Em7       A7(b13)', 'some lyrics here now'));
  expect(out).toContain('[Em7]some ');
  expect(out).toContain('[A7(b13)]lyrics here now');
});

test('recognizes mixed line: Em7 A7(b13) D7sus2 G6', () => {
  const out = convertToChordPro(song('[Verse]', 'Em7       A7(b13)      D7sus2   G6', "Don't you dare look at me that way"));
  expect(out).toContain('[Em7]');
  expect(out).toContain('[A7(b13)]');
  expect(out).toContain('[D7sus2]');
  expect(out).toContain('[G6]');
});

test('still recognizes simple chords G6 Cmaj7', () => {
  // Use a lyric long enough for Cmaj7's column to land inside it
  const out = convertToChordPro(song('[Verse]', 'G6                              Cmaj7', "I get quiet when there's no one else around?"));
  expect(out).toContain('[G6]I get quiet');
  expect(out).toContain('[Cmaj7]else around?');
});

test('still recognizes N.C.', () => {
  const out = convertToChordPro(song('[Intro]', 'N.C.', 'Some lyric'));
  expect(out).toContain('[N.C.]Some lyric');
});

// ── Word-boundary snap ────────────────────────────────────────────────────────
console.log('\nWord-boundary snap:');

test('snaps mid-word G6 at col 5 to start of "same"', () => {
  const out = convertToChordPro(song('[Verse]', '     G6', 'the same'));
  expect(out).toContain('the [G6]same');
  expect(out).not.toContain('s[G6]ame');
});

test('D7sus2 at col 10 lands exactly on "notice" (no snap needed)', () => {
  const out = convertToChordPro(song('[Verse]', '          D7sus2', "Don't you notice how"));
  expect(out).toContain("Don't you [D7sus2]notice how");
});

test('appends chord when column exceeds lyric length', () => {
  const out = convertToChordPro(song('[Verse]', 'C               G', 'Hi'));
  expect(out).toContain('[C]Hi');
  expect(out).toContain('[G]');
});

test('chord on inter-word space snaps to next word start', () => {
  // col 4 = space between "the" and "same" → chord should land on "same"
  const out = convertToChordPro(song('[Verse]', '    G6', 'the same'));
  expect(out).toContain('the [G6]same');
  expect(out).not.toContain('the[G6]');
});

// ── Basic conversion ──────────────────────────────────────────────────────────
console.log('\nBasic conversion:');

test('emits title and subtitle', () => {
  const out = convertToChordPro('My Song\nThe Artist\n\n[Verse]\nC\nLyrics');
  expect(out).toContain('{title: My Song}');
  expect(out).toContain('{st: The Artist}');
});

test('converts simple chord-above-lyric pair', () => {
  const out = convertToChordPro(song('[Verse]', 'C        G', 'Line one lyrics here'));
  expect(out).toContain('[C]Line one [G]lyrics here');
});

test('wraps chorus in soc/eoc', () => {
  const out = convertToChordPro(song('[Chorus]', 'C G', 'Chorus lyrics', '', '[Verse]', 'Am', 'Verse'));
  expect(out).toContain('{soc}');
  expect(out).toContain('{eoc}');
});

test('passes through lyric-only lines unchanged', () => {
  const out = convertToChordPro(song('[Verse]', 'Me and you and awkward silence'));
  expect(out).toContain('Me and you and awkward silence');
});

test('passes through parenthetical annotations unchanged', () => {
  const out = convertToChordPro(song('[Intro]', '(Strum only on the words with the chords)'));
  expect(out).toContain('(Strum only on the words with the chords)');
});

// ── Regression: From The Start ────────────────────────────────────────────────
console.log('\nRegression – From The Start:');

const verse1 = [
  '[Verse 1]',
  '          D7sus2',
  "Don't you notice how",
  'G6                              Cmaj7',
  "I get quiet when there's no one else around?",
].join('\n');

test('D7sus2 inlines on "notice"', () => {
  const out = convertToChordPro(['From The Start', 'Laufey', '', verse1].join('\n'));
  expect(out).toContain("Don't you [D7sus2]notice how");
});

test('G6 and Cmaj7 inline correctly', () => {
  const out = convertToChordPro(['From The Start', 'Laufey', '', verse1].join('\n'));
  expect(out).toContain("[G6]I get quiet when there's no one [Cmaj7]else around?");
});

test('mixed line Em7 A7(b13) D7sus2 G6 fully converted', () => {
  const out = convertToChordPro([
    'From The Start', 'Laufey', '',
    '[Verse 1]',
    'Em7       A7(b13)      D7sus2   G6',
    "Don't you dare look at me that way",
  ].join('\n'));
  expect(out).toContain('[Em7]');
  expect(out).toContain('[A7(b13)]');
  expect(out).toContain('[D7sus2]');
  expect(out).toContain('[G6]');
  expect(out).not.toMatch(/Em7\s+A7/);
});

// ── Summary ───────────────────────────────────────────────────────────────────
console.log(`\n${passed + failed} tests: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
