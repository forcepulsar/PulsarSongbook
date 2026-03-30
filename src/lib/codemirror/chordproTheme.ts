import { EditorView } from '@codemirror/view';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags as t } from '@lezer/highlight';

// ChordPro syntax highlighting - light theme (matching ChordProject.com style)
export const chordProHighlighting = syntaxHighlighting(
  HighlightStyle.define([
    { tag: t.keyword, color: '#2563eb', fontWeight: '700' },
    { tag: t.meta, color: '#92400e', fontStyle: 'italic' },
    { tag: t.string, color: '#b45309', fontStyle: 'italic' },
    { tag: t.comment, color: '#6b7280', fontStyle: 'italic' }
  ])
);

// ChordPro syntax highlighting - dark theme (bright colors for dark background)
export const chordProHighlightingDark = syntaxHighlighting(
  HighlightStyle.define([
    { tag: t.keyword, color: '#4fc1ff', fontWeight: '700' },   // bright blue for chords [C], [G]
    { tag: t.meta, color: '#ce9178', fontStyle: 'italic' },    // salmon for {directive:}
    { tag: t.string, color: '#ffd700', fontStyle: 'italic' },  // gold for directive content
    { tag: t.comment, color: '#6a9955', fontStyle: 'italic' }  // green for # comments
  ])
);

// Light theme
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
  }
}, { dark: false });

// Dark theme
export const chordProThemeDark = EditorView.theme({
  '&': {
    fontSize: '14px',
    backgroundColor: '#1e1e1e'
  },
  '.cm-content': {
    fontFamily: "'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', monospace",
    lineHeight: '1.6',
    caretColor: '#ffffff',
    color: '#d4d4d4'
  },
  '.cm-line': {
    padding: '0 4px',
    color: '#d4d4d4'
  },
  '.cm-gutters': {
    backgroundColor: '#252526',
    color: '#858585',
    borderRight: '1px solid #333'
  },
  '.cm-activeLineGutter': {
    backgroundColor: '#2a2d2e'
  },
  '.cm-activeLine': {
    backgroundColor: '#2a2d2e'
  },
  '&.cm-focused .cm-cursor': {
    borderLeftColor: '#ffffff'
  },
  '&.cm-focused .cm-selectionBackground, ::selection': {
    backgroundColor: '#3a3d41 !important'
  }
}, { dark: true });
