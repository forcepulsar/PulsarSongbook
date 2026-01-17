// Style utilities for ChordPro rendering

export function applyChordSheetStyles(chordSheet: HTMLElement | null, fontSize: number): void {
  if (!chordSheet) return;

  Object.assign(chordSheet.style, {
    fontFamily: 'monospace',
    fontSize: `${fontSize}px`,
    lineHeight: '1.5',
    paddingBottom: '2rem'
  });
}

export function applyHeadingStyles(container: HTMLElement, fontSize: number): void {
  container.querySelectorAll('h1').forEach((h1) => {
    const element = h1 as HTMLElement;
    Object.assign(element.style, {
      fontSize: `${fontSize * 1.5}px`,
      fontWeight: 'bold',
      marginBottom: '0.5rem'
    });
  });

  container.querySelectorAll('h2').forEach((h2) => {
    const element = h2 as HTMLElement;
    Object.assign(element.style, {
      fontSize: `${fontSize * 1.125}px`,
      fontWeight: 'normal',
      marginBottom: '1.5rem',
      color: '#666'
    });
  });
}

export function applyParagraphStyles(container: HTMLElement): void {
  container.querySelectorAll('.paragraph').forEach((para) => {
    const element = para as HTMLElement;
    element.style.marginBottom = '1.5rem';

    if (element.classList.contains('chorus')) {
      Object.assign(element.style, {
        background: '#f3f6fc',
        padding: '1rem',
        borderRadius: '4px',
        marginLeft: '0'
      });
    }
  });
}

export function applyRowStyles(container: HTMLElement): void {
  container.querySelectorAll('.row').forEach((row) => {
    const element = row as HTMLElement;
    Object.assign(element.style, {
      position: 'relative',
      margin: '0',
      padding: '0',
      minHeight: '1.5em',
      display: 'flex',
      flexWrap: 'wrap',
      alignItems: 'flex-end',
      width: '100%'
    });
  });
}

export function calculateMinWidth(chord: HTMLElement | null): string {
  if (!chord || !chord.textContent) return '1.5em';
  return `${Math.max(chord.textContent.length * 0.8, 1.5)}em`;
}
