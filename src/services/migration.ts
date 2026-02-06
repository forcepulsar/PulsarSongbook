import { db as indexedDB } from '../db/schema';
import { createSong, getAllSongs } from './firestore';

export async function migrateIndexedDBToFirestore(userId: string): Promise<{
  success: number;
  errors: number;
  total: number;
  skipped: number;
}> {
  console.warn('[Migration] This migration tool is deprecated. All data should now be in Firebase.');
  console.log('[Migration] Starting migration from IndexedDB to Firestore...');

  try {
    const songs = await indexedDB.songs.toArray();
    console.log(`[Migration] Found ${songs.length} songs in IndexedDB`);

    // Get existing songs from Firestore to avoid duplicates
    const existingSongs = await getAllSongs();
    const existingTitles = new Set(existingSongs.map(s => s.title.toLowerCase()));
    console.log(`[Migration] Found ${existingSongs.length} existing songs in Firestore`);

    let successCount = 0;
    let errorCount = 0;
    let skippedCount = 0;

    for (const song of songs) {
      try {
        // Skip if song already exists in Firestore (case-insensitive check)
        if (existingTitles.has(song.title.toLowerCase())) {
          skippedCount++;
          console.log(`[Migration] ⊘ ${song.title} (already exists)`);
          continue;
        }

        // Filter out undefined values - Firestore doesn't accept them
        const songData: any = {
          title: song.title,
          chordProContent: song.chordProContent
        };

        // Only add optional fields if they have values
        if (song.artist !== undefined) songData.artist = song.artist;
        if (song.language !== undefined) songData.language = song.language;
        if (song.difficulty !== undefined) songData.difficulty = song.difficulty;
        if (song.myLevel !== undefined) songData.myLevel = song.myLevel;
        if (song.priority !== undefined) songData.priority = song.priority;
        if (song.learningResource !== undefined) songData.learningResource = song.learningResource;
        if (song.editingNotes !== undefined) songData.editingNotes = song.editingNotes;
        if (song.chordProStatus !== undefined) songData.chordProStatus = song.chordProStatus;

        await createSong(songData, userId);

        successCount++;
        console.log(`[Migration] ✓ ${song.title}`);
      } catch (error) {
        errorCount++;
        console.error(`[Migration] ✗ ${song.title}:`, error);
      }
    }

    console.log(`[Migration] Complete! Success: ${successCount}, Errors: ${errorCount}, Skipped: ${skippedCount}`);

    return {
      success: successCount,
      errors: errorCount,
      skipped: skippedCount,
      total: songs.length
    };
  } catch (error) {
    console.error('[Migration] Migration failed:', error);
    throw error;
  }
}
