const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema({
  jobId: { type: String, required: true },
  jobTitle: { type: String },
  employerId: { type: String, required: true },   // copied from the job, so the employer can find their applicants
  seekerId: { type: String, required: true },
  seekerEmail: { type: String },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected'],
    default: 'pending'
  }
}, { timestamps: true });

// A seeker can only apply to the same job once
applicationSchema.index({ jobId: 1, seekerId: 1 }, { unique: true });

module.exports = mongoose.model('Application', applicationSchema);