// Constants for ChordPro rendering
export const SCROLL = {
  INTERVAL_MS: 50,      // How often we update scroll position
  DEFAULT_SPEED: 0.8,   // Default speed multiplier
  MIN_SPEED: 0.1,       // Minimum speed multiplier
  MAX_SPEED: 3,         // Maximum speed multiplier
  SPEED_STEP: 0.2       // How much to change speed by
};

export const FONT = {
  DEFAULT_SIZE: 16,     // Default font size for web (reduced from 30)
  MIN_SIZE: 10,
  MAX_SIZE: 30,
  SIZE_STEP: 1
};

export const CHORD_FIXES: Record<string, string> = {
  'Asus': 'Asus4',
  'Esus': 'Esus4',
  'Dsus': 'Dsus4',
  'A2': 'Asus2',
  'E2': 'Esus2',
  'D2': 'Dsus2'
};
