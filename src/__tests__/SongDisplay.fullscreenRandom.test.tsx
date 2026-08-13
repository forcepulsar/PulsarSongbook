import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import SongDisplay from '../components/SongDisplay';
import * as firestoreService from '../services/firestore';

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

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => mockNavigate, useParams: () => ({ id: 'song-1' }) };
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
    vi.mocked(firestoreService.getSong).mockResolvedValue(currentSong as any);
    vi.mocked(firestoreService.getAllSongs).mockResolvedValue(librarySongs as any);
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
