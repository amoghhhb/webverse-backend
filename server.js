require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const app = express();

// Enhanced CORS Configuration
const allowedOrigins = [
  'http://localhost:3000',
  'https://webverse-flame.vercel.app',
  'https://webverse-production.up.railway.app',
  'https://webverse-flames.vercel.app',
  'https://webverse-flaames.vercel.app',
  'https://webverse-fllamess.vercel.app',
  'https://escape-leaderboard.vercel.app'
];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
};

// Apply CORS middleware
app.use(cors(corsOptions));

// ⭐️ FIX: Add this line to explicitly handle all preflight requests
app.options('*', cors(corsOptions)); 

// Middleware to parse JSON
app.use(express.json());

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/webverse-game';

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('MongoDB connection established'))
.catch(err => console.error('MongoDB connection error:', err));

// Player Model
const playerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  department: { type: String, required: true },
  timeTaken: { type: Number, required: true },
  score: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

// Create index for leaderboard queries
playerSchema.index({ score: -1, timeTaken: 1 });

const Player = mongoose.model('Player', playerSchema);

// API Routes
app.post('/submit', (req, res) => {
  const { name, department } = req.body;
  console.log('Test submission received:');
  console.log('Name:', name);
  console.log('Department:', department);
  res.send({ message: 'Test data received successfully!' });
});

app.post('/api/players', async (req, res) => {
  try {
    const { name, department, timeTaken } = req.body;
    if (!name || !department || timeTaken === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: name, department or timeTaken'
      });
    }

    const score = Math.floor((600 - timeTaken) * 1.5);
    const player = new Player({ name, department, timeTaken, score });
    await player.save();
    
    res.status(201).json({
      success: true,
      data: player
    });
  } catch (error) {
    console.error('Error saving player:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
});

app.get('/api/leaderboard', async (req, res) => {
  try {
    const players = await Player.find()
      .sort({ score: -1, timeTaken: 1 })
      .limit(50)
      .lean();

    const rankedPlayers = players.map((player, index) => ({
      ...player,
      rank: index + 1
    }));

    res.status(200).json({
      success: true,
      data: rankedPlayers
    });
  } catch (error) {
    console.error('Leaderboard fetch error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch leaderboard data'
    });
  }
});

// Health Check Endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK',
    database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected'
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    error: 'Internal Server Error'
  });
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`CORS allowed origins: ${allowedOrigins.join(', ')}`);
});
