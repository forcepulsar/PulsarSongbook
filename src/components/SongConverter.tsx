import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

/* ------------------------------------------------------------------ */
/*  Chord pattern (mirrors converter.js)                               */
/* ------------------------------------------------------------------ */
const CHORD_PATTERN =
  '(?:' +
    'N\\.C\\.' +
    '|' +
    '[A-G]' +
      '(?:#|b)?' +
      '(?:maj|min|m|M|dim|aug|sus|add)?' +
      '[0-9]*' +
      '(?:b5|#5|b9|#9|#11|b13)?' +
      '(?:/[A-G](?:#|b)?)?' +
  ')';

const isChordLineRegex = new RegExp(
  `^[\\s]*${CHORD_PATTERN}(?:\\s+${CHORD_PATTERN})*\\s*$`
);
const chordRegex = new RegExp(CHORD_PATTERN, 'g');

function convertToChordPro(input: string): string {
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
            const insertPos = position + offset;
            if (insertPos <= lyricLine.length) {
              lyricLine =
                lyricLine.slice(0, insertPos) +
                `[${chord}]` +
                lyricLine.slice(insertPos);
            } else {
              lyricLine += `[${chord}]`;
            }
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

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */
export default function SongConverter() {
  const { isApproved } = useAuth();
  const navigate = useNavigate();
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  if (!isApproved) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-gray-500 dark:text-gray-400">Access denied.</p>
      </div>
    );
  }

  const handleConvert = () => {
    if (!input.trim()) {
      setError('Paste a song first.');
      return;
    }
    setError('');
    try {
      setOutput(convertToChordPro(input));
    } catch (e) {
      setError('Conversion failed. Check the input format.');
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCreateSong = () => {
    navigate('/song/new', { state: { chordProContent: output } });
  };

  const handleClear = () => {
    setInput('');
    setOutput('');
    setError('');
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Song Converter
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Paste a plain-text song (chords above lyrics) and convert it to ChordPro format.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Input — plain text
            </label>
            {input && (
              <button
                onClick={handleClear}
                className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition"
              >
                Clear
              </button>
            )}
          </div>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Song Title\nArtist Name\n\n[Verse 1]\nC        G\nLine one lyrics here\nAm       F\nLine two lyrics here\n\n[Chorus]\nF    G    C\nChorus lyrics…`}
            className="flex-1 min-h-[400px] font-mono text-sm p-4 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 resize-y focus:outline-none focus:ring-2 focus:ring-red-500"
            spellCheck={false}
          />
          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          )}
          <button
            onClick={handleConvert}
            className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition"
          >
            Convert →
          </button>
        </div>

        {/* Output */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Output — ChordPro
            </label>
            {output && (
              <div className="flex gap-2">
                <button
                  onClick={handleCopy}
                  className="text-xs px-3 py-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded transition"
                >
                  {copied ? '✓ Copied!' : 'Copy'}
                </button>
                <button
                  onClick={handleCreateSong}
                  className="text-xs px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded transition"
                >
                  Create Song →
                </button>
              </div>
            )}
          </div>
          <textarea
            value={output}
            onChange={(e) => setOutput(e.target.value)}
            placeholder="Converted ChordPro will appear here…"
            className="flex-1 min-h-[400px] font-mono text-sm p-4 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 resize-y focus:outline-none focus:ring-2 focus:ring-blue-500"
            spellCheck={false}
          />
          {output && (
            <p className="text-xs text-gray-400 dark:text-gray-500">
              You can edit the output before using it.
            </p>
          )}
        </div>
      </div>

      {/* Format reference */}
      <details className="mt-8 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
        <summary className="px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-400 cursor-pointer select-none">
          Input format reference
        </summary>
        <div className="px-4 pb-4 text-xs text-gray-500 dark:text-gray-400 font-mono whitespace-pre-wrap">
{`Song Title                ← becomes {title:}
Artist Name               ← becomes {st:}

[Verse 1]                 ← becomes {c:Verse 1}
C        G       Am
Lyrics go on the line below the chords.

[Chorus]                  ← wrapped in {soc} / {eoc}
F    G    C
Chorus lyrics here.

[Bridge]                  ← {c:Bridge}`}
        </div>
      </details>
    </div>
  );
}
