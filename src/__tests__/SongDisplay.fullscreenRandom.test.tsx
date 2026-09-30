import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import SongDisplay from '../components/SongDisplay';
import * as firestoreService from '../services/firestore';
import type { Song } from '../types/song';

vi.mock('../lib/firebase/config', () => ({
  db: {},
  auth: {},
  app: {},
  googleProvider: {},
}));

vi.mock('../services/firestore', () => ({
  getSong: vi.fn(),
  getAllSongs: vi.fn(),
}));

vi.mock('../db/schema', () => ({
  getSettings: vi.fn().mockResolvedValue({ fontSize: 16, showChords: true, scrollSpeed: 1 }),
  updateSettings: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ currentUser: null, isApproved: false, signOut: vi.fn() }),
}));

// jsdom has no Fullscreen API — swap in a state-backed fake so the toggle works.
vi.mock('../hooks/useFullscreen', async () => {
  const { useState } = await import('react');
  return {
    useFullscreen: () => {
      const [isFullscreen, setIsFullscreen] = useState(false);
      return {
        isFullscreen,
        toggleFullscreen: () => setIsFullscreen((v) => !v),
        enterFullscreen: () => setIsFullscreen(true),
        exitFullscreen: () => setIsFullscreen(false),
      };
    },
  };
});

const route = vi.hoisted(() => ({ id: 'song-1' }));
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => mockNavigate, useParams: () => route };
});

const currentSong = {
  id: 'song-1',
  title: 'Amazing Grace',
  artist: 'Traditional',
  chordProContent: '[C]Amazing grace',
  chordProStatus: 'Done',
};

const librarySongs = [
  currentSong,
  { id: 'song-2', title: 'Bohemian Rhapsody', artist: 'Queen', chordProStatus: 'Done' },
];

const RANDOM_TITLE = 'Random Song (R)';

function renderSongDisplay() {
  return render(
    <MemoryRouter>
      <SongDisplay />
    </MemoryRouter>
  );
}

describe('SongDisplay random button in fullscreen', () => {
  beforeEach(() => {
    // Fixtures carry only the fields these tests exercise.
    vi.mocked(firestoreService.getSong).mockResolvedValue(currentSong as Song);
    vi.mocked(firestoreService.getAllSongs).mockResolvedValue(librarySongs as Song[]);
    mockNavigate.mockClear();
  });

  it('keeps the random button out of the control bar when not fullscreen', async () => {
    renderSongDisplay();
    await waitFor(() => screen.getByTitle(RANDOM_TITLE));

    const controls = within(screen.getByTestId('song-controls'));
    expect(controls.queryByTitle(RANDOM_TITLE)).toBeNull();
  });

  it('shows the random button in the control bar once fullscreen is on', async () => {
    const user = userEvent.setup();
    renderSongDisplay();
    await waitFor(() => screen.getByTitle(RANDOM_TITLE));

    await user.click(screen.getByTitle('Fullscreen (F)'));

    const controls = within(screen.getByTestId('song-controls'));
    expect(controls.getByTitle(RANDOM_TITLE)).toBeInTheDocument();
    // The header copy is unmounted, so no covered-but-focusable duplicate remains
    expect(screen.getAllByTitle(RANDOM_TITLE)).toHaveLength(1);
  });

  it('navigates to another song when the control bar random button is tapped', async () => {
    const user = userEvent.setup();
    renderSongDisplay();
    await waitFor(() => screen.getByTitle(RANDOM_TITLE));

    await user.click(screen.getByTitle('Fullscreen (F)'));

    const controls = within(screen.getByTestId('song-controls'));
    await user.click(controls.getByTitle(RANDOM_TITLE));

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/song/song-2'));
  });
});


describe('SongDisplay transposition controls', () => {
  beforeEach(() => {
    route.id = 'song-1';
    vi.mocked(firestoreService.getSong).mockResolvedValue(currentSong as Song);
  });

  it('transposes, retains the offset in fullscreen and restores the original', async () => {
    const user = userEvent.setup();
    const { container } = renderSongDisplay();
    await screen.findByRole('button', { name: 'Transpose up one semitone' });
    await user.click(screen.getByRole('button', { name: 'Transpose up one semitone' }));
    expect(container.querySelector('.chord')).toHaveTextContent('C#');
    expect(screen.getByRole('status')).toHaveTextContent('+1 semitones');
    await user.click(screen.getByTitle('Fullscreen (F)'));
    expect(container.querySelector('.chord')).toHaveTextContent('C#');
    await user.click(screen.getByRole('button', { name: 'Reset transposition' }));
    expect(container.querySelector('.chord')?.textContent).toBe('C');
    expect(currentSong.chordProContent).toBe('[C]Amazing grace');
  });

  it('bounds the controls at an octave in either direction', async () => {
    const user = userEvent.setup();
    renderSongDisplay();
    const up = await screen.findByRole('button', { name: 'Transpose up one semitone' });
    for (let i = 0; i < 12; i++) await user.click(up);
    expect(up).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Reset transposition' }));
    const down = screen.getByRole('button', { name: 'Transpose down one semitone' });
    for (let i = 0; i < 12; i++) await user.click(down);
    expect(down).toBeDisabled();
    expect(screen.getByRole('status')).toHaveTextContent('-12 semitones');
  });

  it('resets when navigating to another song and renders the new content', async () => {
    const user = userEvent.setup();
    const view = renderSongDisplay();
    await user.click(await screen.findByRole('button', { name: 'Transpose up one semitone' }));
    vi.mocked(firestoreService.getSong).mockResolvedValue({ ...currentSong, id: 'song-2', chordProContent: '[G]Next song' } as Song);
    route.id = 'song-2';
    view.rerender(<MemoryRouter><SongDisplay /></MemoryRouter>);
    await waitFor(() => expect(firestoreService.getSong).toHaveBeenCalledWith('song-2'));
    await waitFor(() => expect([...view.container.querySelectorAll('.lyrics')].map(el => el.textContent).join('')).toBe('Next song'));
    expect(screen.getByRole('status')).toHaveTextContent('0 semitones');
    expect(view.container.querySelector('.chord')?.textContent).toBe('G');
  });

  it('shows annotations that could not be transposed', async () => {
    vi.mocked(firestoreService.getSong).mockResolvedValue({ ...currentSong, chordProContent: '[C]Hi [Capo 7th fret]' } as Song);
    const user = userEvent.setup();
    renderSongDisplay();
    await user.click(await screen.findByRole('button', { name: 'Transpose up one semitone' }));
    expect(screen.getByText('1 unrecognized annotations left unchanged — review')).toBeInTheDocument();
  });
});
