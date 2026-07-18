const express = require('express');
const cors = require('cors');
const { MongoClient } = require('mongodb');
const session = require('express-session');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Configure Sessions
app.use(session({
  secret: process.env.SESSION_SECRET || 'skill_navigator_fallback_secret',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000 } // 24 hours
}));

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

// Authentication Middleware
function isAuthenticated(req, res, next) {
  if (req.session && req.session.user) {
    return next();
  }
  if (req.headers['accept'] && req.headers['accept'].includes('text/html')) {
    return res.redirect('/login.html');
  }
  res.status(401).json({ error: 'Unauthorized' });
}

// Protected Static Routes (Index pages)
app.get('/', isAuthenticated, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/index.html', isAuthenticated, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Serve other static files
app.use(express.static(path.join(__dirname, 'public')));

// Authentication API Endpoints
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const envUsername = process.env.AUTH_USERNAME || 'admin';
  const envPassword = process.env.AUTH_PASSWORD || 'admin123';

  if (username === envUsername && password === envPassword) {
    req.session.user = { username };
    return res.json({ success: true });
  } else {
    return res.status(401).json({ error: 'Invalid username or password' });
  }
});

app.post('/api/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      return res.status(500).json({ error: 'Could not log out' });
    }
    res.clearCookie('connect.sid');
    res.json({ success: true });
  });
});

app.get('/api/check-auth', (req, res) => {
  if (req.session && req.session.user) {
    res.json({ authenticated: true, username: req.session.user.username });
  } else {
    res.json({ authenticated: false });
  }
});

// Connect to Atlas and start server
connectDB().then(() => {
  app.listen(3000, () => {
    console.log("🚀 Server running on http://localhost:3000");
  });
});

// Protected API Endpoints
app.get('/skills', isAuthenticated, async (req, res) => {
  try {
    const database = getDB();
    const skills = await database.collection('skills').find().toArray();
    res.json(skills);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/get-jobs', isAuthenticated, async (req, res) => {
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
