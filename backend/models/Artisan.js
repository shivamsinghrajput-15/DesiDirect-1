const mongoose = require('mongoose');

const artisanSchema = new mongoose.Schema({
  name: { type: String, required: true },
  bio: { type: String, required: true },
  craft: { type: String, required: true },
  location: { type: String, required: true },
  imageUrl: { type: String, required: false },
  userId: { type: String, required: false }, // Firebase UID link
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Artisan', artisanSchema);
