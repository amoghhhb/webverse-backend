require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const app = express();

// Enhanced CORS Configuration
const allowedOrigins = [
  'http://localhost:3000',
  'https://webverse-game.vercel.app'
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

app.use(cors(corsOptions));
app.use(express.json());

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/webverse-game';

mongoose.connect(MONGODB_URI)
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

// Root Route
app.get('/', (req, res) => {
  res.status(200).json({ message: 'Welcome to the Webverse Game API!' });
});

// API Routes
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
