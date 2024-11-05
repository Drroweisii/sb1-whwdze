import express from 'express';
import { auth } from '../middleware/auth.js';
import User from '../models/User.js';

const router = express.Router();

// Get user game data
router.get('/game-data', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user.gameData);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching game data' });
  }
});

// Save game data
router.post('/save-game', auth, async (req, res) => {
  try {
    const { balance, completedMissions, prisonTime } = req.body;
    
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.gameData = {
      balance,
      completedMissions,
      prisonTime
    };

    await user.save();
    res.json({ message: 'Game data saved successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error saving game data' });
  }
});

export default router;