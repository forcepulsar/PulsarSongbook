import { initializeDefaultSettings } from './schema';
import { importSongsFromSalesforce, isDatabaseInitialized } from './import';

/**
 * Initialize the database with default settings and baseline songs
 */
export async function initializeDatabase(): Promise<void> {
  console.log('[DB] Checking database initialization...');

  // Initialize default settings
  await initializeDefaultSettings();
  console.log('[DB] Settings initialized');

  // Check if songs are already loaded
  const isInitialized = await isDatabaseInitialized();

  if (!isInitialized) {
    console.log('[DB] No songs found, loading baseline data...');

    try {
      // Fetch the baseline song data
      const response = await fetch('/song__c.json');

      if (!response.ok) {
        throw new Error(`Failed to fetch baseline data: ${response.statusText}`);
      }

      const jsonData = await response.json();
      const count = await importSongsFromSalesforce(jsonData);

      console.log(`[DB] Successfully imported ${count} songs from baseline data`);
    } catch (error) {
      console.error('[DB] Failed to import baseline data:', error);
      throw error;
    }
  } else {
    console.log('[DB] Database already initialized with songs');
  }
}
