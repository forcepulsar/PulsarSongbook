import { StreamLanguage } from '@codemirror/language';

// State interface for ChordPro parser
interface ChordProState {
  inDirective: boolean;
}

// ChordPro language definition using StreamLanguage with standard tags
const chordProLanguage = StreamLanguage.define<ChordProState>({
  token(stream, state) {
    // Match chords in square brackets like [C], [G], [Am], [F#m]
    // Use 'keyword' which will be styled with our custom highlighting
    if (stream.match(/^\[[^\]]+\]/)) {
      return 'keyword';
    }

    // Match complete directive lines like {title: Song Name}
    if (stream.match(/^\{[a-z_]+:/)) {
      // Matched opening like {title:
      state.inDirective = true;
      return 'meta';
    }

    // Continue matching directive content
    if (state.inDirective) {
      if (stream.match(/^\}/)) {
        state.inDirective = false;
        return 'meta';
      }
      // Match the content inside directives
      if (stream.match(/^[^}]+/)) {
        return 'string';
      }
    }

    // Match simple directives like {end_of_verse}, {end_of_chorus}
    if (stream.match(/^\{[a-z_]+\}/)) {
      return 'meta';
    }

    // Match comments starting with #
    if (stream.match(/^#.*/)) {
      return 'comment';
    }

    // Default: consume one character and continue
    stream.next();
    return null;
  },

  startState(): ChordProState {
    return {
      inDirective: false
    };
  }
});

export { chordProLanguage };
