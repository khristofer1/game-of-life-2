import { db, auth } from './firebase';
import { collection, doc, getDocs, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import type { Quest } from '../types/quest';

// --- SECURITY HELPER ---
// This ensures we always save data to the currently logged-in user's private folder
const getUserId = () => {
  const user = auth.currentUser;
  if (!user) throw new Error("Critical Error: Cannot access database. User is not logged in.");
  return user.uid;
};

// --- CRUD OPERATIONS ---

// 1. Fetch all quests from the cloud
export async function getAllTasks(): Promise<Quest[]> {
  const uid = getUserId();
  const tasksRef = collection(db, `users/${uid}/tasks`);
  const snapshot = await getDocs(tasksRef);
  
  // Convert Firestore documents back into our Quest interface
  return snapshot.docs.map(doc => doc.data() as Quest);
}

// 2. Save or Update a quest in the cloud
export async function saveTaskToDB(task: Quest): Promise<void> {
  const uid = getUserId();
  
  // If this is a brand new quest, give it a unique numeric ID
  if (!task.id) {
    task.id = Date.now();
  }
  
  // Firestore crashes if it sees 'undefined' values.
  // This completely strips out any undefined properties before uploading!
  const cleanTask = JSON.parse(JSON.stringify(task));
  
  // Save it specifically under: users / [my_id] / tasks / [task_id]
  const taskRef = doc(db, `users/${uid}/tasks`, cleanTask.id.toString());
  await setDoc(taskRef, cleanTask);
}

// 3. Permanently destroy a quest in the cloud
export async function deleteTaskFromDB(id: number): Promise<void> {
  const uid = getUserId();
  const taskRef = doc(db, `users/${uid}/tasks`, id.toString());
  await deleteDoc(taskRef);
}

// --- METADATA OPERATIONS (Gems, Streaks, Freezes) ---

// 4. Get a specific meta value (like your gem count)
export async function getMeta<T>(key: string, defaultValue: T): Promise<T> {
  const uid = getUserId();
  const metaRef = doc(db, `users/${uid}/meta`, 'data');
  const metaSnap = await getDoc(metaRef);
  
  if (metaSnap.exists()) {
    const data = metaSnap.data();
    return data[key] !== undefined ? (data[key] as T) : defaultValue;
  }
  return defaultValue;
}

// 5. Update a specific meta value
export async function setMeta<T>(key: string, value: T): Promise<void> {
  const uid = getUserId();
  const metaRef = doc(db, `users/${uid}/meta`, 'data');
  
  // { merge: true } is crucial! It tells Firebase to only update the exact key 
  // we passed (e.g., gems) without accidentally deleting our streak data!
  await setDoc(metaRef, { [key]: value }, { merge: true });
}