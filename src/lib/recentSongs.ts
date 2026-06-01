const KEY = 'pulsar_recent_songs';
const HISTORY_SIZE = 30;

function getHistory(): string[] {
  try {
    const stored = sessionStorage.getItem(KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveHistory(history: string[]): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(history));
  } catch { /* sessionStorage unavailable */ }
}

/**
 * Pick a random song ID that wasn't played in the last 30 sessions.
 * Falls back to the full pool if all songs are in recent history.
 */
export function pickRandom(eligibleIds: string[], currentId: string): string | null {
  const pool = eligibleIds.filter(id => id !== currentId);
  if (pool.length === 0) return null;

  const history = getHistory();

  // Prefer songs not in recent history; fall back to full pool if needed
  const fresh = pool.filter(id => !history.includes(id));
  const candidates = fresh.length > 0 ? fresh : pool;

  const nextId = candidates[Math.floor(Math.random() * candidates.length)];

  // Add to front, keep last HISTORY_SIZE entries
  const updated = [nextId, ...history.filter(id => id !== nextId)].slice(0, HISTORY_SIZE);
  saveHistory(updated);

  return nextId;
}
