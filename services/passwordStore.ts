import { LOCAL_STORAGE_KEYS as LS } from '../constants';
import type { EncryptedVault } from '../types';

const DB_NAME = 'SparkDB';
const STORE_NAME = LS.PASSWORD_VAULT;
const VAULT_KEY = 'main_vault'; // Use a single key for the single vault object

let dbPromise: Promise<IDBDatabase> | null = null;

const getDB = (): Promise<IDBDatabase> => {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME); // Assuming DB is created elsewhere
        request.onerror = () => reject('Failed to open DB for password store');
        request.onsuccess = () => resolve(request.result);
    });
    return dbPromise;
};

const getStore = async (mode: IDBTransactionMode) => {
    const db = await getDB();
    // Check if the object store exists, this is a read-only check.
    if (!db.objectStoreNames.contains(STORE_NAME)) {
         console.error(`Object store ${STORE_NAME} not found.`);
         // This indicates a developer error or a bad DB state. 
         // In a real app, you might trigger a DB migration/re-creation flow.
         throw new Error(`Object store ${STORE_NAME} is missing.`);
    }
    return db.transaction(STORE_NAME, mode).objectStore(STORE_NAME);
};

export const saveVault = async (vault: EncryptedVault): Promise<void> => {
    const store = await getStore('readwrite');
    // We add an 'id' property because our DB setup expects it.
    const vaultToStore = { id: VAULT_KEY, ...vault };
    return new Promise((resolve, reject) => {
        const request = store.put(vaultToStore);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
    });
};

export const loadVault = async (): Promise<EncryptedVault | null> => {
    try {
        const store = await getStore('readonly');
        return new Promise((resolve, reject) => {
            const request = store.get(VAULT_KEY);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                const result = request.result;
                if (result) {
                    // The result includes the 'id' field, which we don't need externally.
                    const { id, ...vaultData } = result;
                    resolve(vaultData as EncryptedVault);
                } else {
                    resolve(null);
                }
            };
        });
    } catch (e) {
        // This can happen if the object store doesn't exist yet on first run.
        console.warn("Could not load vault, it might not exist yet.", e);
        return null;
    }
};

export const hasVault = async (): Promise<boolean> => {
    const vault = await loadVault();
    return vault !== null;
};

export const deleteVault = async (): Promise<void> => {
    const store = await getStore('readwrite');
    return new Promise((resolve, reject) => {
        const request = store.delete(VAULT_KEY);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
    });
};