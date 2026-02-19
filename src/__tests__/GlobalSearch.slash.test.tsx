import { render, screen, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import GlobalSearch from '../components/GlobalSearch';

vi.mock('../lib/firebase/config', () => ({
  db: {},
  auth: {},
  app: {},
  googleProvider: {},
}));

vi.mock('../services/firestore', () => ({
  getAllSongs: vi.fn().mockResolvedValue([]),
}));

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => vi.fn() };
});

// Helper: render GlobalSearch and wait for the async getAllSongs effect to settle
async function renderGlobalSearch() {
  await act(async () => {
    render(
      <MemoryRouter>
        <GlobalSearch />
      </MemoryRouter>
    );
  });
  return screen.getByPlaceholderText(/search songs/i);
}

describe('GlobalSearch slash shortcut', () => {
  it('focuses the search input when / is pressed on a regular element', async () => {
    const input = await renderGlobalSearch();
    const focusSpy = vi.spyOn(input, 'focus');

    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: '/', bubbles: true }));

    expect(focusSpy).toHaveBeenCalledOnce();
  });

  it('does not focus search when / is pressed inside a contentEditable element (e.g. CodeMirror)', async () => {
    const input = await renderGlobalSearch();
    const focusSpy = vi.spyOn(input, 'focus');

    const editor = document.createElement('div');
    editor.contentEditable = 'true';
    document.body.appendChild(editor);
    editor.dispatchEvent(new KeyboardEvent('keydown', { key: '/', bubbles: true }));
    document.body.removeChild(editor);

    expect(focusSpy).not.toHaveBeenCalled();
  });

  it('does not focus search when / is pressed inside an <input>', async () => {
    const input = await renderGlobalSearch();
    const focusSpy = vi.spyOn(input, 'focus');

    const otherInput = document.createElement('input');
    document.body.appendChild(otherInput);
    otherInput.dispatchEvent(new KeyboardEvent('keydown', { key: '/', bubbles: true }));
    document.body.removeChild(otherInput);

    expect(focusSpy).not.toHaveBeenCalled();
  });
});
