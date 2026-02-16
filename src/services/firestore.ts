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
  where,
  Timestamp,
  writeBatch
} from 'firebase/firestore';
import { db } from '../lib/firebase/config';
import type { Song, SetList, SetListWithSongs } from '../types/song';

const SONGS_COLLECTION = 'songs';
const SETLISTS_COLLECTION = 'setLists';
const SETLIST_SONGS_COLLECTION = 'setListSongs';

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

// =============================================================================
// SET LIST FUNCTIONS
// =============================================================================

export async function getAllSetLists(): Promise<SetList[]> {
  const q = query(collection(db, SETLISTS_COLLECTION), orderBy('name'));
  const querySnapshot = await getDocs(q);

  return querySnapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      createdAt: timestampToDate(data.createdAt),
      updatedAt: timestampToDate(data.updatedAt)
    } as SetList;
  });
}

export async function getSetList(id: string): Promise<SetList | null> {
  const docRef = doc(db, SETLISTS_COLLECTION, id);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) return null;

  const data = docSnap.data();
  return {
    id: docSnap.id,
    ...data,
    createdAt: timestampToDate(data.createdAt),
    updatedAt: timestampToDate(data.updatedAt)
  } as SetList;
}

export async function getSetListWithSongs(id: string): Promise<SetListWithSongs | null> {
  const setList = await getSetList(id);
  if (!setList) return null;

  // Get all song mappings for this set list, ordered by position
  const q = query(
    collection(db, SETLIST_SONGS_COLLECTION),
    where('setListId', '==', id),
    orderBy('position')
  );
  const querySnapshot = await getDocs(q);

  // Fetch all songs in parallel
  const songPromises = querySnapshot.docs.map((doc) => {
    const data = doc.data();
    return getSong(data.songId);
  });

  const songs = (await Promise.all(songPromises)).filter((song): song is Song => song !== null);

  return {
    ...setList,
    songs
  };
}

export async function createSetList(
  setListData: Omit<SetList, 'id' | 'createdAt' | 'updatedAt'>,
  userId: string
): Promise<string> {
  const cleanedData: Record<string, any> = {};

  for (const [key, value] of Object.entries(setListData)) {
    if (value !== undefined) {
      if (value === '' && ['description'].includes(key)) {
        cleanedData[key] = null;
      } else {
        cleanedData[key] = value;
      }
    }
  }

  const docRef = await addDoc(collection(db, SETLISTS_COLLECTION), {
    ...cleanedData,
    createdBy: userId,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  });

  return docRef.id;
}

export async function updateSetList(
  id: string,
  updates: Partial<SetList>
): Promise<void> {
  const docRef = doc(db, SETLISTS_COLLECTION, id);

  const cleanedUpdates: Record<string, any> = {};

  for (const [key, value] of Object.entries(updates)) {
    if (value !== undefined) {
      if (value === '' && ['description'].includes(key)) {
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

export async function deleteSetList(id: string): Promise<void> {
  // Delete the set list and all its song mappings in a batch
  const batch = writeBatch(db);

  // Delete the set list
  const setListRef = doc(db, SETLISTS_COLLECTION, id);
  batch.delete(setListRef);

  // Delete all song mappings
  const q = query(
    collection(db, SETLIST_SONGS_COLLECTION),
    where('setListId', '==', id)
  );
  const querySnapshot = await getDocs(q);
  querySnapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });

  await batch.commit();
}

export async function addSongToSetList(setListId: string, songId: string): Promise<void> {
  // Get current max position
  const q = query(
    collection(db, SETLIST_SONGS_COLLECTION),
    where('setListId', '==', setListId),
    orderBy('position', 'desc')
  );
  const querySnapshot = await getDocs(q);

  const maxPosition = querySnapshot.empty ? -1 : querySnapshot.docs[0].data().position;
  const newPosition = maxPosition + 1;

  await addDoc(collection(db, SETLIST_SONGS_COLLECTION), {
    setListId,
    songId,
    position: newPosition,
    createdAt: Timestamp.now()
  });

  // Update the set list's updatedAt timestamp
  await updateSetList(setListId, {});
}

export async function removeSongFromSetList(setListId: string, songId: string): Promise<void> {
  // Find and delete the mapping
  const q = query(
    collection(db, SETLIST_SONGS_COLLECTION),
    where('setListId', '==', setListId),
    where('songId', '==', songId)
  );
  const querySnapshot = await getDocs(q);

  const batch = writeBatch(db);
  querySnapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });
  await batch.commit();

  // Update the set list's updatedAt timestamp
  await updateSetList(setListId, {});
}

export async function reorderSetListSongs(setListId: string, songIds: string[]): Promise<void> {
  // Get all current mappings
  const q = query(
    collection(db, SETLIST_SONGS_COLLECTION),
    where('setListId', '==', setListId)
  );
  const querySnapshot = await getDocs(q);

  // Create a map of songId -> docRef
  const mappingMap = new Map<string, any>();
  querySnapshot.docs.forEach((doc) => {
    const data = doc.data();
    mappingMap.set(data.songId, doc.ref);
  });

  // Update positions in a batch
  const batch = writeBatch(db);
  songIds.forEach((songId, index) => {
    const docRef = mappingMap.get(songId);
    if (docRef) {
      batch.update(docRef, { position: index });
    }
  });

  await batch.commit();

  // Update the set list's updatedAt timestamp
  await updateSetList(setListId, {});
}
