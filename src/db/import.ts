import { db } from './schema';
import type { Song, SalesforceSongExport } from '../types/song';
import { v4 as uuidv4 } from 'uuid';

/**
 * Transform Salesforce song record to app Song format
 */
function transformSalesforceSong(sfSong: any): Song {
  const now = new Date();

  return {
    id: uuidv4(),
    title: sfSong.Song__c || 'Untitled',
    artist: sfSong.Artist__c,
    language: sfSong.Language__c as 'English' | 'Spanish' | undefined,
    chordProContent: sfSong.ChordPro_Content__c || '',
    difficulty: sfSong.Difficulty__c as 'Easy' | 'Medium' | 'Hard' | undefined,
    myLevel: sfSong.My_Level__c as 'Want to Learn' | 'Know basics' | 'Play Well' | undefined,
    priority: sfSong.Priority__c,
    learningResource: sfSong.Learning_resource__c,
    editingNotes: sfSong.Editing_Notes__c,
    chordProStatus: sfSong.ChordPro_Status__c as 'To Do' | 'In Progress' | 'Done' | undefined,
    createdAt: now,
    updatedAt: now,
    syncStatus: 'synced'
  };
}

/**
 * Import songs from Salesforce JSON export
 */
export async function importSongsFromSalesforce(jsonData: SalesforceSongExport): Promise<number> {
  const songs: Song[] = jsonData.records
    .filter(record => record.Song__c || record.ChordPro_Content__c)
    .map(transformSalesforceSong);

  await db.songs.bulkAdd(songs);

  return songs.length;
}

/**
 * Import songs from a JSON file
 */
export async function importSongsFromFile(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const jsonData = JSON.parse(e.target?.result as string) as SalesforceSongExport;
        const count = await importSongsFromSalesforce(jsonData);
        resolve(count);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

/**
 * Clear all songs from the database
 */
export async function clearAllSongs(): Promise<void> {
  await db.songs.clear();
}

/**
 * Get total song count
 */
export async function getSongCount(): Promise<number> {
  return await db.songs.count();
}

/**
 * Check if database has been initialized with songs
 */
export async function isDatabaseInitialized(): Promise<boolean> {
  const count = await getSongCount();
  return count > 0;
}
