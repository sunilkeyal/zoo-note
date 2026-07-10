/**
 * MongoDB diagnostics script
 * Investigates why database storage size doesn't drop after deleting notes/images.
 *
 * Usage: node scripts/db-diagnostics.mjs [--compact]
 *   --compact  Run compact on all collections to reclaim free space (takes a moment)
 */

import { MongoClient } from 'mongodb';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------------------
// Load .env.local manually (no dotenv dependency required)
// ---------------------------------------------------------------------------
function loadEnv() {
  const envPath = resolve(__dirname, '../.env.local');
  try {
    const text = readFileSync(envPath, 'utf8');
    for (const line of text.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
      if (!process.env[key]) process.env[key] = val;
    }
  } catch {
    // No .env.local – rely on environment variables already set
  }
}
loadEnv();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/zoo-note';
const RUN_COMPACT = process.argv.includes('--compact');

function fmt(bytes) {
  if (bytes == null) return 'N/A';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(2)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(2)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
}

function section(title) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(` ${title}`);
  console.log('='.repeat(60));
}

async function main() {
  const client = new MongoClient(MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
  await client.connect();
  const dbName = client.db().databaseName;
  const db = client.db(dbName);

  console.log(`Connected to database: ${dbName}`);
  console.log(`URI: ${MONGODB_URI.replace(/:\/\/.*@/, '://***@')}`);

  // -------------------------------------------------------------------------
  // 1. Database-level stats
  // -------------------------------------------------------------------------
  section('1. Database Storage Stats');
  const dbStats = await db.command({ dbStats: 1, scale: 1 });
  console.log(`  dataSize    (actual doc data)   : ${fmt(dbStats.dataSize)}`);
  console.log(`  storageSize (allocated on disk) : ${fmt(dbStats.storageSize)}`);
  console.log(`  indexSize   (all indexes)       : ${fmt(dbStats.indexSize)}`);
  console.log(`  totalSize   (storage + index)   : ${fmt(dbStats.totalSize ?? (dbStats.storageSize + dbStats.indexSize))}`);
  console.log(`  fsUsedSize  (filesystem used)   : ${fmt(dbStats.fsUsedSize)}`);
  console.log(`  fsTotalSize (filesystem total)  : ${fmt(dbStats.fsTotalSize)}`);
  console.log(`  freeStorageSize (reusable space): ${fmt(dbStats.freeStorageSize)}`);
  console.log(`  objects (total doc count)       : ${dbStats.objects}`);
  console.log(`  collections                     : ${dbStats.collections}`);

  const reclaimable = dbStats.storageSize - dbStats.dataSize;
  if (reclaimable > 0) {
    console.log(`\n  ⚠️  Reclaimable space (free blocks held by WiredTiger): ${fmt(reclaimable)}`);
    console.log(`     MongoDB pre-allocates and reuses blocks; deleted docs leave`);
    console.log(`     free space inside data files until compact/repair is run.`);
  }

  // -------------------------------------------------------------------------
  // 2. Per-collection stats
  // -------------------------------------------------------------------------
  section('2. Per-Collection Stats');
  const collections = await db.listCollections().toArray();
  const colNames = collections.map(c => c.name).sort();

  const colRows = [];
  for (const name of colNames) {
    const s = await db.command({ collStats: name, scale: 1 });
    colRows.push({
      name,
      count: s.count ?? 0,
      dataSize: s.size ?? 0,
      storageSize: s.storageSize ?? 0,
      totalIndexSize: s.totalIndexSize ?? 0,
      freeStorageSize: s.freeStorageSize ?? 0,
      wiredTigerAllocated: (s.storageSize ?? 0) + (s.totalIndexSize ?? 0),
    });
  }

  // Print table
  const colW = Math.max(...colRows.map(r => r.name.length), 10);
  console.log(
    `  ${'Collection'.padEnd(colW)}  ${'Docs'.padStart(8)}  ${'dataSize'.padStart(10)}  ${'allocated'.padStart(10)}  ${'freeBlocks'.padStart(10)}  ${'indexSize'.padStart(10)}`
  );
  console.log(`  ${'-'.repeat(colW + 58)}`);
  for (const r of colRows) {
    console.log(
      `  ${r.name.padEnd(colW)}  ${String(r.count).padStart(8)}  ${fmt(r.dataSize).padStart(10)}  ${fmt(r.storageSize).padStart(10)}  ${fmt(r.freeStorageSize).padStart(10)}  ${fmt(r.totalIndexSize).padStart(10)}`
    );
  }

  // -------------------------------------------------------------------------
  // 3. Images collection deep-dive
  // -------------------------------------------------------------------------
  section('3. Images Collection Deep-Dive');
  const imageCount = await db.collection('images').countDocuments();
  console.log(`  Total image documents : ${imageCount}`);

  if (imageCount > 0) {
    // Sample a few docs to check sizes
    const samples = await db.collection('images').find(
      {},
      { projection: { _id: 1, filename: 1, length: 1, contentType: 1, 'metadata.userId': 1, uploadDate: 1 } }
    ).limit(5).toArray();
    console.log(`  Sample image records:`);
    for (const img of samples) {
      console.log(`    _id=${img._id}  size=${fmt(img.length)}  type=${img.contentType}  user=${img.metadata?.userId}`);
    }

    // Aggregate total size of image data
    const agg = await db.collection('images').aggregate([
      { $group: { _id: null, totalLength: { $sum: '$length' }, count: { $sum: 1 } } }
    ]).toArray();
    if (agg[0]) {
      console.log(`  Aggregate image payload size: ${fmt(agg[0].totalLength)} across ${agg[0].count} images`);
    }
  }

  // -------------------------------------------------------------------------
  // 4. Orphaned image check
  // -------------------------------------------------------------------------
  section('4. Orphaned Image Check');

  // Gather all image IDs referenced in note content
  const notes = await db.collection('notes').find(
    {},
    { projection: { _id: 1, content: 1, userId: 1 } }
  ).toArray();

  const referencedIds = new Set();
  const imgIdPattern = /\/api\/images\/([a-f0-9]{24})/gi;
  for (const note of notes) {
    const content = typeof note.content === 'string' ? note.content : JSON.stringify(note.content ?? '');
    for (const match of content.matchAll(imgIdPattern)) {
      referencedIds.add(match[1]);
    }
  }

  const allImageIds = await db.collection('images').find({}, { projection: { _id: 1 } }).toArray();
  const orphanedIds = allImageIds.filter(doc => !referencedIds.has(doc._id.toString()));

  console.log(`  Notes scanned              : ${notes.length}`);
  console.log(`  Image IDs referenced       : ${referencedIds.size}`);
  console.log(`  Total images in collection : ${allImageIds.length}`);
  console.log(`  Orphaned images found      : ${orphanedIds.length}`);

  if (orphanedIds.length > 0) {
    const orphanDocs = await db.collection('images').find(
      { _id: { $in: orphanedIds.map(d => d._id) } },
      { projection: { _id: 1, filename: 1, length: 1, 'metadata.userId': 1 } }
    ).toArray();
    let orphanBytes = 0;
    console.log(`  Orphaned image details:`);
    for (const d of orphanDocs) {
      orphanBytes += d.length ?? 0;
      console.log(`    _id=${d._id}  size=${fmt(d.length)}  user=${d.metadata?.userId}  file=${d.filename}`);
    }
    console.log(`  Total orphaned data size: ${fmt(orphanBytes)}`);
  }

  // -------------------------------------------------------------------------
  // 5. Notes/folders remaining for user in question
  // -------------------------------------------------------------------------
  section('5. Data Remaining for sunilkeyal@hotmail.com');
  const user = await db.collection('users').findOne(
    { email: 'sunilkeyal@hotmail.com' },
    { projection: { _id: 1, email: 1 } }
  );

  if (!user) {
    console.log('  User not found in users collection.');
  } else {
    const uid = user._id.toString();
    console.log(`  userId: ${uid}`);
    const activeNotes   = await db.collection('notes').countDocuments({ userId: uid, isDeleted: { $ne: true } });
    const deletedNotes  = await db.collection('notes').countDocuments({ userId: uid, isDeleted: true });
    const totalNotes    = await db.collection('notes').countDocuments({ userId: uid });
    const activeFolders = await db.collection('folders').countDocuments({ userId: uid, isDeleted: { $ne: true } });
    const userImages    = await db.collection('images').countDocuments({ 'metadata.userId': uid });

    console.log(`  Active notes   : ${activeNotes}`);
    console.log(`  Deleted notes  : ${deletedNotes}  (soft-deleted, awaiting TTL expiry)`);
    console.log(`  Total notes    : ${totalNotes}`);
    console.log(`  Active folders : ${activeFolders}`);
    console.log(`  Image docs     : ${userImages}`);
  }

  // -------------------------------------------------------------------------
  // 6. TTL index status
  // -------------------------------------------------------------------------
  section('6. TTL Index Status (auto-expiry)');
  for (const col of ['notes', 'folders']) {
    const indexes = await db.collection(col).indexes();
    const ttlIndexes = indexes.filter(i => i.expireAfterSeconds != null);
    if (ttlIndexes.length) {
      for (const idx of ttlIndexes) {
        const field = Object.keys(idx.key)[0];
        const ttlSecs = idx.expireAfterSeconds;
        console.log(`  ${col}.${field}: TTL=${ttlSecs}s (${(ttlSecs/86400).toFixed(1)} days) — MongoDB auto-deletes docs after this`);
      }
    }
  }

  // -------------------------------------------------------------------------
  // 7. WiredTiger explanation & compact (optional)
  // -------------------------------------------------------------------------
  section('7. Why Storage Size Stays at 12 MB');
  console.log(`
  MongoDB's WiredTiger storage engine does NOT immediately return disk space
  to the OS when documents are deleted. Instead it:

    1. Marks the space as "free blocks" reusable for future inserts.
    2. Keeps data files at their current allocated size.

  This means:
    - dbStats.dataSize  = actual bytes of current documents (should be tiny now)
    - dbStats.storageSize = space allocated on disk (still shows ~12 MB)
    - The delta is "free blocks" — wasted but reserved space

  To reclaim the space you must run compact() on each collection,
  which rewrites the collection files and releases free blocks back to the OS.

  Run this script with --compact flag to do that automatically:
    node scripts/db-diagnostics.mjs --compact
`);

  if (RUN_COMPACT) {
    section('8. Running compact() on all collections');
    for (const name of colNames) {
      process.stdout.write(`  compact ${name} ... `);
      try {
        await db.command({ compact: name });
        console.log('done');
      } catch (err) {
        console.log(`SKIP (${err.message})`);
      }
    }

    // Re-print db stats after compaction
    const after = await db.command({ dbStats: 1, scale: 1 });
    console.log(`\n  After compact:`);
    console.log(`    dataSize    : ${fmt(after.dataSize)}`);
    console.log(`    storageSize : ${fmt(after.storageSize)}`);
    console.log(`    indexSize   : ${fmt(after.indexSize)}`);
    console.log(`    totalSize   : ${fmt(after.totalSize ?? (after.storageSize + after.indexSize))}`);
  }

  await client.close();
}

main().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
