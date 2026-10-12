const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema({
  jobId: { type: String, required: true },
  jobTitle: { type: String },
  employerId: { type: String, required: true },
  seekerId: { type: String, required: true },
  seekerEmail: { type: String },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected'],
    default: 'pending'
  }
}, { timestamps: true });

module.exports = mongoose.model('Application', applicationSchema);