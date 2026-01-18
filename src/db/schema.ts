import Dexie, { type EntityTable } from 'dexie';
import type { Song, AppSettings, SyncQueueItem } from '../types/song';

// Define the database schema
export class PulsarSongbookDB extends Dexie {
  songs!: EntityTable<Song, 'id'>;
  settings!: EntityTable<AppSettings, 'id'>;
  syncQueue!: EntityTable<SyncQueueItem, 'id'>;

  constructor() {
    super('PulsarSongbook');

    this.version(1).stores({
      songs: 'id, title, artist, language, difficulty, myLevel, priority, chordProStatus, createdAt, updatedAt, syncStatus',
      settings: 'id',
      syncQueue: 'id, songId, action, timestamp'
    });
  }
}

// Create and export a singleton instance
export const db = new PulsarSongbookDB();

// Initialize default settings
export async function initializeDefaultSettings(): Promise<void> {
  const existingSettings = await db.settings.get(1);

  if (!existingSettings) {
    await db.settings.add({
      id: 1,
      fontSize: 16,
      scrollSpeed: 0.2,
      showChords: true,
      theme: 'light'
    });
  }
}

// Helper to get settings
export async function getSettings(): Promise<AppSettings> {
  const settings = await db.settings.get(1);
  if (!settings) {
    await initializeDefaultSettings();
    return (await db.settings.get(1))!;
  }
  return settings;
}

// Helper to update settings
export async function updateSettings(updates: Partial<AppSettings>): Promise<void> {
  await db.settings.update(1, updates);
}

// Update a song in IndexedDB
export async function updateSong(id: string, updates: Partial<Song>): Promise<void> {
  const song = await db.songs.get(id);
  if (!song) throw new Error('Song not found');

  await db.songs.update(id, {
    ...updates,
    updatedAt: new Date()
  });
}

// Export all songs to Salesforce JSON format
export async function exportSongsToJSON(): Promise<string> {
  const songs = await db.songs.toArray();

  const salesforceFormat = {
    records: songs.map((song, index) => ({
      attributes: {
        type: 'song__c',
        referenceId: `song__cRef${index + 1}`
      },
      Song__c: song.title,
      Artist__c: song.artist || null,
      Language__c: song.language || null,
      ChordPro_Content__c: song.chordProContent,
      Priority__c: song.priority || null,
      My_Level__c: song.myLevel || null,
      Difficulty__c: song.difficulty || null,
      ChordPro_Status__c: song.chordProStatus || null,
      Editing_Notes__c: song.editingNotes || null,
      Learning_resource__c: song.learningResource || null
    }))
  };

  return JSON.stringify(salesforceFormat, null, 2);
}
