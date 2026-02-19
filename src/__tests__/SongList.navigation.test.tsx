import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import SongList from '../components/SongList';
import * as firestoreService from '../services/firestore';

vi.mock('../lib/firebase/config', () => ({
  db: {},
  auth: {},
  app: {},
  googleProvider: {},
}));

vi.mock('../services/firestore', () => ({
  getAllSongs: vi.fn(),
}));

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ currentUser: null, isApproved: false, signOut: vi.fn() }),
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => mockNavigate };
});

const mockSongs = [
  { id: 'song-1', title: 'Amazing Grace', artist: 'Traditional', language: 'English', difficulty: 'Easy' },
  { id: 'song-2', title: 'Bohemian Rhapsody', artist: 'Queen', language: 'English', difficulty: 'Hard' },
];

describe('SongList navigation', () => {
  beforeEach(() => {
    vi.mocked(firestoreService.getAllSongs).mockResolvedValue(mockSongs as any);
    mockNavigate.mockClear();
  });

  it('uses client-side navigation when clicking a desktop table row (no page reload)', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <SongList />
      </MemoryRouter>
    );

    await waitFor(() => screen.getAllByText('Amazing Grace'));

    // The desktop table renders <tr> rows with onClick handlers
    const rows = screen.getAllByRole('row');
    // rows[0] = header, rows[1] = first data row
    await user.click(rows[1]);

    expect(mockNavigate).toHaveBeenCalledWith('/song/song-1');
  });

  it('uses client-side navigation for the Random Song button (no page reload)', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <SongList />
      </MemoryRouter>
    );

    // Wait for songs to load — the random button is disabled until songs are loaded
    await waitFor(() => expect(screen.getByText('🎲 Random Song').closest('button')).not.toBeDisabled());

    await user.click(screen.getByText('🎲 Random Song'));

    expect(mockNavigate).toHaveBeenCalledWith(
      expect.stringMatching(/^\/song\/(song-1|song-2)$/)
    );
  });
});
