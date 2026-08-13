import { deleteDB, openDB, type DBSchema } from 'idb';

import { parsePersistedSession, type PersistedSession } from './sessionSchema';

const DATABASE_NAME = 'rowcheck-local-session';
const DATABASE_VERSION = 1;
const STORE_NAME = 'session';
const SESSION_KEY = 'latest';

interface SessionDatabase extends DBSchema {
  session: {
    key: string;
    value: unknown;
  };
}

async function database() {
  return openDB<SessionDatabase>(DATABASE_NAME, DATABASE_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    },
  });
}

export async function saveSession(session: PersistedSession) {
  const db = await database();
  await db.put(STORE_NAME, session, SESSION_KEY);
  db.close();
}

export async function loadSession() {
  const db = await database();
  const value = await db.get(STORE_NAME, SESSION_KEY);
  db.close();
  const session = parsePersistedSession(value);
  if (value !== undefined && session === null) await clearSession();
  return session;
}

export async function clearSession() {
  const db = await database();
  await db.delete(STORE_NAME, SESSION_KEY);
  db.close();
}

export async function resetSessionDatabaseForTests() {
  await deleteDB(DATABASE_NAME);
}
