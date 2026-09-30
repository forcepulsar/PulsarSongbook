import { transposeChordLabel } from '../lib/chordpro/transpose';
import { formatTransposedChordPro, parseAndFormatChordPro } from '../lib/chordpro/renderUtils';

function chords(html: string) {
  const container = document.createElement('div');
  container.innerHTML = html;
  return [...container.querySelectorAll('.chord')].map(el => el.textContent).filter(Boolean);
}

describe('transposition', () => {
  it.each([
    ['C', 2, 'D'], ['Am', -2, 'Gm'], ['G/B', 2, 'A/C#'],
    ['G', -1, 'F#'], ['A', -1, 'G#'], ['G/B', -1, 'F#/A#'],
    ['F#m7', 1, 'Gm7'], ['Bb', 1, 'B'], ['B', 1, 'C'],
    ['C', -1, 'B'], ['C7(b9)', 2, 'D7(b9)'], ['F#m7add11', 2, 'G#m7add11'],
    ['|C G/B Am| x2', 2, '|D A/C# Bm| x2'], ['(Em), G, D, A', 2, '(F#m), A, E, B'],
    ['F7*', 2, 'G7*'], ['N.C.', 2, 'N.C.'], ['C', 12, 'C'], ['C', -12, 'C'],
  ])('transposes %s by %i to %s', (input, delta, expected) => {
    expect(transposeChordLabel(input, delta)).toEqual({ text: expected, unchanged: false });
  });

  it.each(['Intro', 'Capo 7th fret', 'B Section', 'G(frm2)', 'D/F# 2x0233', 'Esus4/E7'])('preserves ambiguous annotation %s', input => {
    expect(transposeChordLabel(input, 2)).toEqual({ text: input, unchanged: true });
  });

  it('only changes bracketed chords, retaining lyrics, comments, tabs and annotations', () => {
    const input = '{title: Test}\n{comment: Play C G}\n[C]Hello [G/B]world\n[|Am F| x2]\n[Intro]\nPlain C G\n{start_of_tab}\ne|--0--2--\n{end_of_tab}';
    const result = formatTransposedChordPro(input, 2);
    expect(chords(result.html)).toEqual(['D', 'A/C#', '|Bm G| x2', 'Intro']);
    expect(result.unchangedLabels).toEqual(['Intro']);
    expect(result.html).toContain('Hello');
    expect(result.html).toContain('Play C G');
    expect(result.html).toContain('Plain C G');
    expect(result.html).toContain('e|--0--2--');
  });

  it('restores the exact original rendering at zero', () => {
    const input = '[Bb]Lyrics [Cma7]more [Intro]';
    const before = parseAndFormatChordPro(input);
    formatTransposedChordPro(input, 3);
    expect(formatTransposedChordPro(input, 0)).toEqual({ html: before, unchangedLabels: [] });
  });
});
