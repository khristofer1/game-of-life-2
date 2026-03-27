import type { Quest } from '../types/quest';

const DB_NAME = "HabitTrackerDB";
const DB_VERSION = 5;
const TASK_STORE = "tasks";
const META_STORE = "metadata";

// 1. Core Connection: Initializes and upgrades the DB just like the old script
export const initDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (e) => {
            const db = (e.target as IDBOpenDBRequest).result;
            // Preserving your exact schema migrations
            if (db.objectStoreNames.contains("habits")) db.deleteObjectStore("habits");
            if (!db.objectStoreNames.contains(META_STORE)) db.createObjectStore(META_STORE);
            if (!db.objectStoreNames.contains(TASK_STORE)) db.createObjectStore(TASK_STORE, { keyPath: "id", autoIncrement: true });
        };

        request.onsuccess = (e) => resolve((e.target as IDBOpenDBRequest).result);
        request.onerror = (e) => reject((e.target as IDBOpenDBRequest).error);
    });
};

// 2. Task API: Promise-based wrappers for your CRUD operations
export const getAllTasks = async (): Promise<Quest[]> => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([TASK_STORE], "readonly");
        const store = transaction.objectStore(TASK_STORE);
        const request = store.getAll();

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

export const saveTaskToDB = async (task: any): Promise<number> => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([TASK_STORE], "readwrite");
        const store = transaction.objectStore(TASK_STORE);
        
        // If it has an ID, it updates (put). If not, it adds (add).
        const request = task.id ? store.put(task) : store.add(task);

        request.onsuccess = () => resolve(request.result as number);
        request.onerror = () => reject(request.error);
    });
};

export const deleteTaskFromDB = async (id: number): Promise<void> => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([TASK_STORE], "readwrite");
        const store = transaction.objectStore(TASK_STORE);
        const request = store.delete(id);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};

// 3. Metadata API: For Gems, Freezes, and Chests
export const getMeta = async (key: string, defaultValue: any = null): Promise<any> => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([META_STORE], "readonly");
        const store = transaction.objectStore(META_STORE);
        const request = store.get(key);

        request.onsuccess = () => resolve(request.result !== undefined ? request.result : defaultValue);
        request.onerror = () => reject(request.error);
    });
};

export const setMeta = async (key: string, value: any): Promise<void> => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([META_STORE], "readwrite");
        const store = transaction.objectStore(META_STORE);
        const request = store.put(value, key);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};