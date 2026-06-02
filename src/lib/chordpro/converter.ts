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

const isChordLineRegex = new RegExp(
  `^[\\s]*${CHORD_PATTERN}(?:\\s+${CHORD_PATTERN})*\\s*$`
);
const chordRegex = new RegExp(CHORD_PATTERN, 'g');

function snapToWordStart(text: string, pos: number): number {
  if (pos <= 0) return 0;
  if (pos >= text.length) return text.length;
  if (text[pos - 1] === ' ') return pos;      // already at word start
  if (text[pos] === ' ') {                     // on a space — skip to next word
    let next = pos;
    while (next < text.length && text[next] === ' ') next++;
    return next;
  }
  // mid-word — walk left to word start
  let start = pos;
  while (start > 0 && text[start - 1] !== ' ') start--;
  return start;
}

export function convertToChordPro(input: string): string {
  const lines = input.split('\n');
  const output: string[] = [];
  let inChorus = false;
  let titleFound = false;
  let artistFound = false;
  let previousLineWasSection = false;

  for (let i = 0; i < lines.length; i++) {
    const currentLine = lines[i].trimEnd();

    if (currentLine === '') {
      if (
        !previousLineWasSection &&
        output.length > 0 &&
        output[output.length - 1] !== ''
      ) {
        output.push('');
      }
      continue;
    }

    if (!titleFound) {
      output.push(`{title: ${currentLine}}`);
      titleFound = true;
      continue;
    }
    if (titleFound && !artistFound) {
      output.push(`{st: ${currentLine}}`);
      output.push('');
      artistFound = true;
      continue;
    }

    if (/^\[.*\]$/.test(currentLine)) {
      const sectionName = currentLine.slice(1, -1);

      if (inChorus && !sectionName.toLowerCase().startsWith('chorus')) {
        output.push('{eoc}');
        output.push('');
        inChorus = false;
      }

      if (sectionName === 'Intro') {
        output.push('{c:Intro}');
      } else if (sectionName.toLowerCase().startsWith('chorus')) {
        output.push('{soc}');
        output.push('{c:Chorus}');
        inChorus = true;
      } else {
        output.push(`{c:${sectionName}}`);
      }
      previousLineWasSection = true;
      continue;
    }

    previousLineWasSection = false;

    const isChord = isChordLineRegex.test(currentLine);
    const nextLine = i + 1 < lines.length ? lines[i + 1].trimEnd() : '';

    if (isChord) {
      if (nextLine === '') {
        output.push(`[${currentLine.trim()}]`);
      } else {
        const chords: { chord: string; position: number }[] = [];
        let match: RegExpExecArray | null;
        chordRegex.lastIndex = 0;
        while ((match = chordRegex.exec(currentLine)) !== null) {
          chords.push({ chord: match[0], position: match.index });
        }

        if (chords.length > 0) {
          let lyricLine = nextLine;
          let offset = 0;

          chords.forEach(({ chord, position }) => {
            const rawPos = position + offset;
            const insertPos =
              rawPos <= lyricLine.length
                ? snapToWordStart(lyricLine, rawPos)
                : lyricLine.length;
            lyricLine =
              lyricLine.slice(0, insertPos) +
              `[${chord}]` +
              lyricLine.slice(insertPos);
            offset += chord.length + 2;
          });

          output.push(lyricLine);
          i++;
        }
      }
    } else {
      output.push(currentLine);
    }
  }

  if (inChorus) {
    while (output.length > 0 && output[output.length - 1] === '') output.pop();
    output.push('{eoc}');
    output.push('');
  }

  while (output.length > 0 && output[output.length - 1] === '') output.pop();

  return output.join('\n');
}
