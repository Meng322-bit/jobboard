const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  location: { type: String, required: true },
  category: { type: String, default: 'general' },
  employerId: { type: String, required: true }   // the employer who posted it (from their JWT)
}, { timestamps: true });

module.exports = mongoose.model('Job', jobSchema);