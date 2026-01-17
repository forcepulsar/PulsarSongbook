// Render utilities for ChordPro content
import { ChordProParser, HtmlDivFormatter } from 'chordsheetjs';
import * as StyleUtils from './styleUtils';
import * as ChordUtils from './chordUtils';

/**
 * Escape '#' characters in plain-text lines so ChordSheetJS
 * does not treat them as comments. We:
 *  - Leave directives ({...}) and comment lines (#...) alone.
 *  - Leave lines containing '[' (ChordPro chords) alone.
 *  - On all other lines, replace '#' with '\#'.
 */
function escapeSharpsInPlainText(chordProContent: string): string {
  if (!chordProContent) {
    return chordProContent;
  }

  return chordProContent
    .split('\n')
    .map((line) => {
      const trimmed = line.trim();

      // ChordPro directive, e.g. {title: ...}
      if (trimmed.startsWith('{')) {
        return line;
      }

      // Explicit ChordPro comment line, e.g. # this is a comment
      if (trimmed.startsWith('#')) {
        return line;
      }

      // Lines containing chord brackets should be left to the parser,
      // since sharps inside [C#7b5] etc. are valid chord syntax.
      if (line.includes('[')) {
        return line;
      }

      // Plain text line: escape all '#' so the parser
      // doesn't treat the remainder as a comment.
      return line.replace(/#/g, '\\#');
    })
    .join('\n');
}

/**
 * Parse ChordPro content and format to HTML
 */
export function parseAndFormatChordPro(chordProContent: string): string {
  const parser = new ChordProParser();

  // Protect plain-text lines from '#' being interpreted as comments
  const safeContent = escapeSharpsInPlainText(chordProContent);

  const song = parser.parse(safeContent);
  const formatter = new HtmlDivFormatter();
  return formatter.format(song);
}

/**
 * Render formatted song HTML into a container and apply styles
 */
export function renderSong(
  container: HTMLElement,
  formattedSong: string,
  fontSize: number,
  showChords: boolean
): boolean {
  if (!container) return false;

  container.innerHTML = formattedSong;
  applyAllStyles(container, fontSize, showChords);
  return true;
}

/**
 * Apply all styling to the rendered ChordPro content
 */
export function applyAllStyles(
  container: HTMLElement,
  fontSize: number,
  showChords: boolean
): void {
  const chordSheet = container.querySelector('.chord-sheet') as HTMLElement | null;

  // Apply base styles
  StyleUtils.applyChordSheetStyles(chordSheet, fontSize);
  StyleUtils.applyHeadingStyles(container, fontSize);
  StyleUtils.applyParagraphStyles(container);
  StyleUtils.applyRowStyles(container);

  // Apply chord-specific styles
  container.querySelectorAll('.column').forEach((col) => {
    const element = col as HTMLElement;
    const chord = element.querySelector('.chord') as HTMLElement | null;
    const lyrics = element.querySelector('.lyrics') as HTMLElement | null;

    if (chord) {
      ChordUtils.fixChordNames(chord);
      ChordUtils.applyChordStyles(chord, fontSize, showChords);
    }

    ChordUtils.setupColumnWithChord(element, chord, lyrics, fontSize);
  });

  // Style lyrics
  container.querySelectorAll('.lyrics').forEach((lyric) => {
    const element = lyric as HTMLElement;
    Object.assign(element.style, {
      position: 'relative',
      whiteSpace: 'pre',
      minHeight: '1em',
      fontSize: `${fontSize}px`,
      padding: '0 0.1em'
    });

    if (element.textContent && element.textContent.includes('\\#')) {
      element.textContent = element.textContent.replace(/\\#/g, '#');
    }
  });

  // Style comments
  container.querySelectorAll('.comment').forEach((comment) => {
    const element = comment as HTMLElement;
    Object.assign(element.style, {
      color: '#28a745',
      fontStyle: 'italic',
      margin: '0.5em 0',
      width: '100%',
      fontSize: `${fontSize}px`
    });
  });

  // Handle consecutive chords
  container.querySelectorAll('.row').forEach((row) => {
    ChordUtils.handleConsecutiveChords(row as HTMLElement);
  });
}
