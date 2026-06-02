import { describe, it, expect } from 'vitest';
import { convertToChordPro } from '../lib/chordpro/converter';

// ── helpers ──────────────────────────────────────────────────────────────────

function song(...sections: string[]): string {
  return ['My Song', 'My Artist', '', ...sections].join('\n');
}

// ── chord recognition ─────────────────────────────────────────────────────────

describe('chord recognition', () => {
  it('recognizes D7sus2 as a chord and inlines it', () => {
    const input = song('[Verse]', '          D7sus2', "Don't you notice how");
    expect(convertToChordPro(input)).toContain("Don't you [D7sus2]notice how");
  });

  it('recognizes Dmaj7sus2 as a chord and inlines it', () => {
    const input = song('[Verse]', 'Dmaj7sus2', 'lyrics here');
    expect(convertToChordPro(input)).toContain('[Dmaj7sus2]lyrics here');
  });

  it('recognizes A7(b13) as a chord and inlines it', () => {
    // Em7 at col 0, A7(b13) at col 10; col 10 in lyric is mid-"lyrics" → snaps to word start
    const input = song('[Verse]', 'Em7       A7(b13)', 'some lyrics here now');
    const out = convertToChordPro(input);
    expect(out).toContain('[Em7]some ');
    expect(out).toContain('[A7(b13)]lyrics here now');
  });

  it('recognizes a mixed chord line with D7sus2 and G6', () => {
    const input = song('[Verse]', 'Em7       A7(b13)      D7sus2   G6', "Don't you dare look at me that way");
    const out = convertToChordPro(input);
    expect(out).toContain('[Em7]');
    expect(out).toContain('[A7(b13)]');
    expect(out).toContain('[D7sus2]');
    expect(out).toContain('[G6]');
  });

  it('still recognizes simple chords: G6, Em7, Cmaj7', () => {
    const input = song('[Verse]', 'G6                              Cmaj7', "I get quiet when there's no one else around?");
    const out = convertToChordPro(input);
    expect(out).toContain('[G6]I get quiet');
    expect(out).toContain('[Cmaj7]else around?');
  });

  it('still recognizes N.C.', () => {
    const input = song('[Intro]', 'N.C.', 'Some lyric');
    expect(convertToChordPro(input)).toContain('[N.C.]Some lyric');
  });
});

// ── word-boundary snap ────────────────────────────────────────────────────────

describe('word-boundary snap', () => {
  it('snaps chord to word start when column falls mid-word', () => {
    // G6 at col 5; lyric "the same" has 's' at col 4, 'a' at col 5
    const input = song('[Verse]', '     G6', 'the same');
    const out = convertToChordPro(input);
    expect(out).toContain('the [G6]same');
    expect(out).not.toContain('s[G6]ame');
  });

  it('does not snap when column already lands at a word start', () => {
    // D7sus2 at col 10; "Don't you " is 10 chars, so "notice" starts at col 10
    const input = song('[Verse]', '          D7sus2', "Don't you notice how");
    expect(convertToChordPro(input)).toContain("Don't you [D7sus2]notice how");
  });

  it('appends chord when column exceeds lyric length', () => {
    const input = song('[Verse]', 'C               G', 'Hi');
    const out = convertToChordPro(input);
    expect(out).toContain('[C]Hi');
    expect(out).toContain('[G]');
  });

  it('chord on inter-word space snaps to next word start', () => {
    // col 4 = space between "the" and "same" → chord lands on "same"
    const input = song('[Verse]', '    G6', 'the same');
    const out = convertToChordPro(input);
    expect(out).toContain('the [G6]same');
    expect(out).not.toContain('the[G6]');
  });
});

// ── basic conversion ──────────────────────────────────────────────────────────

describe('basic conversion', () => {
  it('emits title and subtitle directives', () => {
    const out = convertToChordPro('My Song\nThe Artist\n\n[Verse]\nC\nLyrics');
    expect(out).toContain('{title: My Song}');
    expect(out).toContain('{st: The Artist}');
  });

  it('converts simple chord-above-lyric pair', () => {
    const input = song('[Verse]', 'C        G', 'Line one lyrics here');
    expect(convertToChordPro(input)).toContain('[C]Line one [G]lyrics here');
  });

  it('wraps chorus in soc/eoc', () => {
    const input = song('[Chorus]', 'C G', 'Chorus lyrics', '', '[Verse]', 'Am', 'Verse');
    const out = convertToChordPro(input);
    expect(out).toContain('{soc}');
    expect(out).toContain('{eoc}');
  });

  it('passes through lyric-only lines unchanged', () => {
    const input = song('[Verse]', 'Me and you and awkward silence');
    expect(convertToChordPro(input)).toContain('Me and you and awkward silence');
  });

  it('passes through parenthetical annotations unchanged', () => {
    const input = song('[Intro]', '(Strum only on the words with the chords)');
    expect(convertToChordPro(input)).toContain('(Strum only on the words with the chords)');
  });
});

// ── regression: From The Start ────────────────────────────────────────────────

describe('regression: From The Start by Laufey', () => {
  const verse1 = [
    '[Verse 1]',
    '          D7sus2',
    "Don't you notice how",
    'G6                              Cmaj7',
    "I get quiet when there's no one else around?",
  ].join('\n');

  it('inlines D7sus2 on "notice"', () => {
    const input = ['From The Start', 'Laufey', '', verse1].join('\n');
    expect(convertToChordPro(input)).toContain("Don't you [D7sus2]notice how");
  });

  it('inlines G6 and Cmaj7 correctly', () => {
    const input = ['From The Start', 'Laufey', '', verse1].join('\n');
    const out = convertToChordPro(input);
    expect(out).toContain("[G6]I get quiet when there's no one [Cmaj7]else around?");
  });

  it('handles the mixed chord line Em7 A7(b13) D7sus2 G6', () => {
    const input = [
      'From The Start',
      'Laufey',
      '',
      '[Verse 1]',
      'Em7       A7(b13)      D7sus2   G6',
      "Don't you dare look at me that way",
    ].join('\n');
    const out = convertToChordPro(input);
    expect(out).toContain('[Em7]');
    expect(out).toContain('[A7(b13)]');
    expect(out).toContain('[D7sus2]');
    expect(out).toContain('[G6]');
    expect(out).not.toMatch(/Em7\s+A7/); // raw chord line should not appear
  });
});
