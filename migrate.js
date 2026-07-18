const { MongoClient } = require('mongodb');
const data = require('./data.json');
require('dotenv').config();

const uri = process.env.MONGODB_URI;

if (!uri) {
  console.error("❌ MONGODB_URI is not defined in the environment variables!");
  process.exit(1);
}

async function migrate() {
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db("skillNavigator");

  // Clear existing collections if desired or just insert
  // Let's just insert as in the original script
  await db.collection('skills').insertMany(
    data.skills.map(skill => ({ name: skill }))
  );

  await db.collection('jobs').insertMany(data.jobs);

  console.log("✅ Data migrated to Atlas!");
  await client.close();
}

migrate().catch(console.error);
