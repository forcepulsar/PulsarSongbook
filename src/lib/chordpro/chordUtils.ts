// Chord utilities for ChordPro rendering
import { CHORD_FIXES } from './constants';

// Matches any key A-G (with optional #/b and minor "m"), followed by "ma7"
const MAJ7_REGEX = /^([A-G](?:#|b)?m?)ma7$/i;

export function fixChordNames(chord: HTMLElement | null): void {
  if (!chord) return;

  let txt = chord.textContent || '';

  // 1. Generic maj7 repair
  if (MAJ7_REGEX.test(txt)) {
    txt = txt.replace(/ma7$/i, 'maj7');
  }

  // 2. Existing explicit fixes
  if (CHORD_FIXES[txt]) {
    txt = CHORD_FIXES[txt];
  }

  chord.textContent = txt; // write the corrected label
}

export function applyChordStyles(
  chord: HTMLElement | null,
  fontSize: number,
  showChords: boolean
): void {
  if (!chord) return;

  Object.assign(chord.style, {
    color: '#dc3545',
    fontWeight: 'bold',
    position: 'absolute',
    top: '0',
    left: '0',
    height: `${fontSize * 1.2}px`,
    whiteSpace: 'pre',
    minWidth: `${Math.max((chord.textContent?.length || 0) * 0.8, 1.5)}em`,
    display: showChords ? 'block' : 'none',
    fontSize: `${fontSize}px`,
    textAlign: 'center'
  });
}

export function handleConsecutiveChords(row: HTMLElement): void {
  const columns = Array.from(row.querySelectorAll('.column'));
  const lastColumns = columns.slice(-3);

  lastColumns.forEach((col) => {
    const element = col as HTMLElement;
    const chord = element.querySelector('.chord') as HTMLElement | null;
    const lyrics = element.querySelector('.lyrics') as HTMLElement | null;

    if (chord && lyrics && lyrics.textContent?.trim() === '') {
      lyrics.style.minWidth = `${Math.max((chord.textContent?.length || 0) * 0.8, 1.5)}em`;
      element.style.marginRight = '0.2em';
    }
  });
}

export function setupColumnWithChord(
  col: HTMLElement,
  chord: HTMLElement | null,
  lyrics: HTMLElement | null,
  fontSize: number
): void {
  const minWidth = `${Math.max((chord?.textContent?.length || 0) * 0.8, 1.5)}em`;

  Object.assign(col.style, {
    display: 'inline-block',
    position: 'relative',
    padding: `${fontSize * 1.2}px 0 0`,
    margin: '0',
    minHeight: '1.5em',
    minWidth
  });

  if (lyrics) {
    if (lyrics.textContent?.trim() === '') {
      if (chord && chord.textContent?.trim()) {
        lyrics.innerHTML = '&nbsp;';
        lyrics.style.minWidth = minWidth;
      } else {
        lyrics.style.minWidth = '0.5em';
      }
    }
  }
}
