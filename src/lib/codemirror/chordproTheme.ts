import { EditorView } from '@codemirror/view';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags as t } from '@lezer/highlight';

// ChordPro syntax highlighting theme - matching ChordProject.com style
export const chordProHighlighting = syntaxHighlighting(
  HighlightStyle.define([
    // Chords in square brackets [C], [G], [Am], etc. - using keyword tag
    { tag: t.keyword, color: '#2563eb', fontWeight: '700' },
    // Metadata directive brackets {title:}, {artist:}, etc. - using meta tag
    { tag: t.meta, color: '#92400e', fontStyle: 'italic' },
    // Content inside directives - using string tag
    { tag: t.string, color: '#b45309', fontStyle: 'italic' },
    // Comments starting with #
    { tag: t.comment, color: '#6b7280', fontStyle: 'italic' }
  ])
);

// Additional editor styling for ChordPro - matching ChordProject.com
export const chordProTheme = EditorView.theme({
  '&': {
    fontSize: '14px',
    backgroundColor: '#ffffff'
  },
  '.cm-content': {
    fontFamily: "'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', monospace",
    lineHeight: '1.6',
    caretColor: '#000000'
  },
  '.cm-line': {
    padding: '0 4px'
  },
  '&.cm-focused .cm-cursor': {
    borderLeftColor: '#000000'
  },
  '&.cm-focused .cm-selectionBackground, ::selection': {
    backgroundColor: '#b4d5fe !important'
  },
  // Force styles to override any theme
  '.cm-keyword': {
    color: '#2563eb !important',
    fontWeight: '700 !important'
  }
}, { dark: false });

// Dark theme variant (keeping simple for now until light mode works)
export const chordProThemeDark = EditorView.theme({
  '&': {
    fontSize: '14px',
    backgroundColor: '#1e1e1e'
  },
  '.cm-content': {
    fontFamily: "'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', monospace",
    lineHeight: '1.6',
    caretColor: '#ffffff'
  },
  '.cm-line': {
    padding: '0 4px'
  },
  '&.cm-focused .cm-cursor': {
    borderLeftColor: '#ffffff'
  },
  '&.cm-focused .cm-selectionBackground, ::selection': {
    backgroundColor: '#3a3d41 !important'
  }
}, { dark: true });
