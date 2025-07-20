require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const app = express();

// Enhanced CORS Configuration
const allowedOrigins = [
  'http://localhost:3000',
  'https://webverse-flame.vercel.app',
  'https://webverse-game.vercel.app' // Add all possible frontend URLs
];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn('Blocked by CORS:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(express.json());

// MongoDB Connection with enhanced options
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/webverse-game';

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000
})
.then(() => console.log('MongoDB connected successfully'))
.catch(err => console.error('MongoDB connection error:', err));

// Player Model with validation
const playerSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true,
    trim: true,
    maxlength: 50
  },
  department: { 
    type: String, 
    required: true,
    trim: true,
    maxlength: 50 
  },
  timeTaken: { 
    type: Number, 
    required: true,
    min: 0,
    max: 600
  },
  score: { 
    type: Number,
    index: true 
  }
}, { 
  timestamps: true 
});

// Auto-calculate score before saving
playerSchema.pre('save', function(next) {
  this.score = Math.floor((600 - this.timeTaken) * 1.5);
  next();
});

const Player = mongoose.model('Player', playerSchema);

// API Routes with improved error handling
app.post('/api/players', async (req, res) => {
  try {
    const { name, department, timeTaken } = req.body;
    
    // Validate input
    if (!name || !department || timeTaken === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }

    const player = new Player({ name, department, timeTaken });
    await player.save();
    
    res.status(201).json({
      success: true,
      data: {
        id: player._id,
        name: player.name,
        department: player.department,
        timeTaken: player.timeTaken,
        score: player.score,
        createdAt: player.createdAt
      }
    });
  } catch (error) {
    console.error('Save player error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save player data'
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
      rank: index + 1,
      timeFormatted: formatTime(player.timeTaken)
    }));

    res.json({
      success: true,
      data: rankedPlayers
    });
  } catch (error) {
    console.error('Leaderboard error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load leaderboard'
    });
  }
});

// Helper function
function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Allowed origins: ${allowedOrigins.join(', ')}`);
  console.log(`MongoDB URI: ${MONGODB_URI.includes('@') ? '*****' : MONGODB_URI}`);
});
