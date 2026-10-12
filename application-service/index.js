require('dotenv').config({ path: require('path').join(__dirname, '.env'), override: true });
const express = require('express');
const jwt = require('jsonwebtoken');
const connectDB = require('./db');
const Application = require('./Application');

const app = express();
app.use(express.json());

connectDB();

const JOB_SEARCH_URL = process.env.JOB_SEARCH_URL || 'http://localhost:5005';

// Reads the JWT and only lets seekers through
function seekerOnly(req, res, next) {
  const header = req.headers['authorization'];
  if (!header) {
    return res.status(401).json({ message: 'No token provided' });
  }
  try {
    const decoded = jwt.verify(header.split(' ')[1], process.env.JWT_SECRET);
    if (decoded.role !== 'seeker') {
      return res.status(403).json({ message: 'Access denied for your role' });
    }
    req.seekerId = decoded.id;
    req.seekerEmail = decoded.email;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid or expired token' });
  }
}

// API 1: apply to a job
app.post('/applications', seekerOnly, async (req, res) => {
  try {
    const { jobId } = req.body;
    if (!jobId) {
      return res.status(400).json({ message: 'jobId is required' });
    }

    // Service-to-service call: ask the Job Search service whether this job exists
    let jobResponse;
    try {
      jobResponse = await fetch(`${JOB_SEARCH_URL}/jobs/${jobId}`, {
        headers: { Authorization: req.headers['authorization'] }
      });
    } catch (error) {
      return res.status(503).json({ message: 'Job Search service is unavailable' });
    }

    if (jobResponse.status === 404) {
      return res.status(404).json({ message: 'Job not found' });
    }
    if (jobResponse.status === 400) {
      return res.status(400).json({ message: 'Invalid job id' });
    }
    if (!jobResponse.ok) {
      return res.status(502).json({ message: 'Could not check the job' });
    }
    const { job } = await jobResponse.json();

    const existing = await Application.findOne({ jobId, seekerId: req.seekerId });
    if (existing) {
      return res.status(409).json({ message: 'You already applied to this job' });
    }

    const application = await Application.create({
      jobId,
      jobTitle: job.title,
      employerId: job.employerId,
      seekerId: req.seekerId,
      seekerEmail: req.seekerEmail
    });

    res.status(201).json({ message: 'Application submitted successfully', application });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// API 2: view my applications and their status
app.get('/applications', seekerOnly, async (req, res) => {
  try {
    const applications = await Application.find({ seekerId: req.seekerId }).sort({ createdAt: -1 });
    res.json({ count: applications.length, applications });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// API 3: withdraw one of my applications
app.delete('/applications/:id', seekerOnly, async (req, res) => {
  try {
    const application = await Application.findOneAndDelete({ _id: req.params.id, seekerId: req.seekerId });
    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }
    res.json({ message: 'Application withdrawn successfully' });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({ message: 'Invalid application id' });
    }
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

const PORT = process.env.PORT || 5006;
app.listen(PORT, () => {
  console.log(`Application service running on port ${PORT}`);
});