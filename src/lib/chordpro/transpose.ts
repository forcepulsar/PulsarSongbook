import { Chord } from 'chordsheetjs';

// ChordSheetJS accepts arbitrary suffixes (even "Capo" as C + apo).
// Validate complete tokens before asking it to do the musical arithmetic.
const CHORD = /^[A-G][#b]?(?:maj|min|ma|dim|aug|sus|add|m|M|\d+|[#b]\d+|\+|°|ø)*(?:\((?:[#b]?\d+)(?:,[#b]?\d+)*\))?(?:\/[A-G][#b]?)?$/;
const MARKER = /^(?:N\.C\.|[xX]\d+|\d+[xX]|\d+\/\d+|[-/]+)$/;

export function transposeChordLabel(label: string, semitones: number): {
  text: string;
  unchanged: boolean;
} {
  if (semitones === 0 || !label.trim()) return { text: label, unchanged: false };

  let unsupported = false;
  const text = label.split(/([\s|,]+)/).map((part) => {
    if (!part || /^[\s|,]+$/.test(part)) return part;
    // Preserve optional-chord parentheses and performance marks.
    const match = CHORD.test(part) ? [part, '', part, ''] : part.match(/^(\(?)(.*?)([*!]?\)?)$/)!;
    const [, prefix, token, suffix] = match;
    if (MARKER.test(token)) return part;
    if (!CHORD.test(token)) {
      unsupported = true;
      return part;
    }
    const chord = Chord.parse(token);
    if (!chord) {
      unsupported = true;
      return part;
    }
    const shifted = chord.transpose(semitones)
      .useAccidental('#')
      .normalize();
    return prefix + shifted.toString() + suffix;
  }).join('');

  // Do not partially transpose a label containing instructions or fingerings.
  return { text: unsupported ? label : text, unchanged: unsupported };
}
