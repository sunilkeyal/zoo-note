import { MongoClient, Db } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/notes-app';

let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null;

export async function connectToDatabase(): Promise<Db> {
  if (cachedDb) return cachedDb;

  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  cachedClient = client;
  cachedDb = client.db();

  await cachedDb.collection("passwordResetTokens").createIndex(
    { expiresAt: 1 },
    { expireAfterSeconds: 0 }
  ).catch(() => {});

  await cachedDb.collection("notes").createIndex(
    { deletedAt: 1 },
    { expireAfterSeconds: 604800, background: true }
  ).catch(() => {});

  await cachedDb.collection("folders").createIndex(
    { deletedAt: 1 },
    { expireAfterSeconds: 604800, background: true }
  ).catch(() => {});

  await cachedDb.collection("notes").createIndex(
    { userId: 1, isDeleted: 1 },
    { background: true }
  ).catch(() => {});

  await cachedDb.collection("folders").createIndex(
    { userId: 1, isDeleted: 1 },
    { background: true }
  ).catch(() => {});

  await cachedDb.collection("users").createIndex(
    { email: 1 },
    { unique: true, background: true }
  ).catch(() => {});

  return cachedDb;
}

export async function closeDatabase(): Promise<void> {
  if (cachedClient) {
    await cachedClient.close();
    cachedClient = null;
    cachedDb = null;
  }
}
