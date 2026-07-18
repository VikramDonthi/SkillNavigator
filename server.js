const express = require('express');
const cors = require('cors');
const { MongoClient } = require('mongodb');
require('dotenv').config();

const app = express();
const path = require('path');
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

let db;

async function connectDB() {
  try {
    await client.connect();
    db = client.db("skillNavigator");
    console.log("✅ Connected to MongoDB Atlas");
    return db;
  } catch (err) {
    console.error("❌ Atlas connection error:", err);
    process.exit(1);
  }
}

function getDB() {
  if (!db) throw new Error("Database not connected!");
  return db;
}

// Connect to Atlas and start server
connectDB().then(() => {
  app.listen(3000, () => {
    console.log("🚀 Server running on http://localhost:3000");
  });
});

// API Endpoints
app.get('/skills', async (req, res) => {
  try {
    const database = getDB();
    const skills = await database.collection('skills').find().toArray();
    res.json(skills);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/get-jobs', async (req, res) => {
  try {
    const database = getDB();
    const selectedSkills = req.body.skills.map(skill => skill.trim().toLowerCase());

    const jobs = await database.collection('jobs').aggregate([
      {
        $match: {
          "requiredSkills": {
            $in: selectedSkills
          }
        }
      },
      {
        $addFields: {
          matchPercentage: {
            $multiply: [
              {
                $divide: [
                  { $size: { $setIntersection: ["$requiredSkills", selectedSkills] } },
                  { $size: "$requiredSkills" }
                ]
              },
              100
            ]
          }
        }
      },
      { $sort: { matchPercentage: -1 } }
    ]).toArray();

    res.json(jobs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Graceful shutdown handling
process.on('SIGINT', async () => {
  await client.close();
  console.log("🔌 MongoDB connection closed");
  process.exit(0);
});
