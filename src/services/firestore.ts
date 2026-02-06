import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  Timestamp
} from 'firebase/firestore';
import { db } from '../lib/firebase/config';
import type { Song } from '../types/song';

const SONGS_COLLECTION = 'songs';

function timestampToDate(timestamp: any): Date {
  if (timestamp?.toDate) {
    return timestamp.toDate();
  }
  return timestamp instanceof Date ? timestamp : new Date(timestamp);
}

export async function getAllSongs(): Promise<Song[]> {
  const q = query(collection(db, SONGS_COLLECTION), orderBy('title'));
  const querySnapshot = await getDocs(q);

  return querySnapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      createdAt: timestampToDate(data.createdAt),
      updatedAt: timestampToDate(data.updatedAt)
    } as Song;
  });
}

export async function getSong(id: string): Promise<Song | null> {
  const docRef = doc(db, SONGS_COLLECTION, id);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) return null;

  const data = docSnap.data();
  return {
    id: docSnap.id,
    ...data,
    createdAt: timestampToDate(data.createdAt),
    updatedAt: timestampToDate(data.updatedAt)
  } as Song;
}

export async function createSong(
  songData: Omit<Song, 'id' | 'createdAt' | 'updatedAt'>,
  userId: string
): Promise<string> {
  // Filter out undefined values - Firestore doesn't accept them
  // But convert empty strings to null for optional fields
  const cleanedData: Record<string, any> = {};

  for (const [key, value] of Object.entries(songData)) {
    if (value !== undefined) {
      // Convert empty strings to null for optional fields
      if (value === '' && ['priority', 'artist', 'language', 'difficulty', 'myLevel', 'chordProStatus', 'learningResource', 'editingNotes'].includes(key)) {
        cleanedData[key] = null;
      } else {
        cleanedData[key] = value;
      }
    }
  }

  const docRef = await addDoc(collection(db, SONGS_COLLECTION), {
    ...cleanedData,
    createdBy: userId,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  });

  return docRef.id;
}

export async function updateSong(
  id: string,
  updates: Partial<Song>
): Promise<void> {
  const docRef = doc(db, SONGS_COLLECTION, id);

  // Filter out undefined values - Firestore doesn't accept them
  // But convert empty strings to null for optional fields
  const cleanedUpdates: Record<string, any> = {};

  for (const [key, value] of Object.entries(updates)) {
    if (value !== undefined) {
      // Convert empty strings to null for optional fields
      if (value === '' && ['priority', 'artist', 'language', 'difficulty', 'myLevel', 'chordProStatus', 'learningResource', 'editingNotes'].includes(key)) {
        cleanedUpdates[key] = null;
      } else {
        cleanedUpdates[key] = value;
      }
    }
  }

  await updateDoc(docRef, {
    ...cleanedUpdates,
    updatedAt: Timestamp.now()
  });
}

export async function deleteSong(id: string): Promise<void> {
  const docRef = doc(db, SONGS_COLLECTION, id);
  await deleteDoc(docRef);
}
