const express = require('express');
const router = express.Router();
const Artisan = require('../models/Artisan');

// Get all artisans
router.get('/', async (req, res) => {
  try {
    const artisans = await Artisan.find();
    res.json(artisans);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get artisan by User ID (Firebase UID)
router.get('/user/:userId', async (req, res) => {
  try {
    const artisan = await Artisan.findOne({ userId: req.params.userId });
    if (!artisan) return res.status(404).json({ message: 'Artisan not found' });
    res.json(artisan);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create artisan profile
router.post('/', async (req, res) => {
  const artisan = new Artisan(req.body);
  try {
    const newArtisan = await artisan.save();
    res.status(201).json(newArtisan);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;
