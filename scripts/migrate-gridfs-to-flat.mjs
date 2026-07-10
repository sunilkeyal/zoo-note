import { MongoClient, Binary } from 'mongodb';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, '..', '.env.local');
try {
  const envContent = readFileSync(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = val;
  }
} catch { /* .env.local might not exist */ }

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/zoo-note';
const isDryRun = process.argv.includes('--dry-run');
console.log(`Connecting to: ${uri}`);
console.log(`Mode: ${isDryRun ? 'DRY RUN (no changes)' : 'LIVE'}`);

const client = new MongoClient(uri);
await client.connect();
const db = client.db();

// Check if migration already done
const hasGridFSFiles = await db.listCollections({ name: 'images.files' }).hasNext();
const hasImages = await db.listCollections({ name: 'images' }).hasNext();

if (!hasGridFSFiles && hasImages) {
  console.log('\nMigration already completed (images.files gone, images exists). Nothing to do.');
  await client.close();
  process.exit(0);
}

if (!hasGridFSFiles) {
  console.log('\nNo GridFS collections found. Nothing to migrate.');
  await client.close();
  process.exit(0);
}

const fileCount = await db.collection('images.files').countDocuments({});
console.log(`\nFound ${fileCount} images in GridFS (images.files).`);

if (fileCount === 0) {
  console.log('No images to migrate. Dropping empty GridFS collections...');
  if (!isDryRun) {
    await db.collection('images.files').drop();
    await db.collection('images.chunks').drop();
    console.log('Done.');
  }
  await client.close();
  process.exit(0);
}

const files = await db.collection('images.files').find({}).toArray();
const migrated = [];
let errors = [];

for (const file of files) {
  try {
    const chunks = await db.collection('images.chunks')
      .find({ files_id: file._id })
      .sort({ n: 1 })
      .toArray();

    const data = Buffer.concat(chunks.map(c => c.data.buffer));

    if (!isDryRun) {
      await db.collection('images').insertOne({
        _id: file._id,
        filename: file.filename,
        contentType: file.contentType,
        length: data.length,
        data: new Binary(data),
        metadata: file.metadata || {},
        uploadDate: file.uploadDate || new Date(),
      });
    }

    migrated.push(file._id.toString());
  } catch (e) {
    errors.push(`${file._id}: ${e.message}`);
  }
}

console.log(`\nMigrated: ${migrated.length}/${fileCount} images`);
if (errors.length > 0) {
  console.log(`Errors: ${errors.length}`);
  for (const err of errors) console.log(`  ${err}`);
}

if (!isDryRun && errors.length === 0) {
  console.log('\nCreating index on images.metadata.userId...');
  await db.collection('images').createIndex({ 'metadata.userId': 1 });

  console.log('Dropping old GridFS collections...');
  await db.collection('images.files').drop();
  await db.collection('images.chunks').drop();
}

const stats = await db.command({ collStats: 'images' });
console.log(`\nNew images collection: ${migrated.length} docs, ${(stats.storageSize / 1024 / 1024).toFixed(2)} MB`);

const dbStats = await db.command({ dbStats: 1, scale: 1 });
console.log(`Total db storage: ${(dbStats.storageSize / 1024 / 1024).toFixed(2)} MB`);

await client.close();
