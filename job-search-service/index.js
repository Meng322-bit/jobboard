require('dotenv').config({ path: require('path').join(__dirname, '.env'), override: true });
const os = require('os');
const express = require('express');
const jwt = require('jsonwebtoken');
const connectDB = require('./db');
const Job = require('./Job');

const app = express();
app.use(express.json());

connectDB();

// Name shown in responses so a load balancer demo can show which copy answered
const INSTANCE_NAME = process.env.INSTANCE_NAME || os.hostname();

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
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid or expired token' });
  }
}

// Makes user text safe to use inside a MongoDB regex
function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// API 1: browse all jobs, with optional filters: ?title=dev&location=phnom&category=IT
app.get('/jobs', seekerOnly, async (req, res) => {
  try {
    const { title, location, category } = req.query;
    const filter = {};
    if (title) filter.title = { $regex: escapeRegex(title), $options: 'i' };
    if (location) filter.location = { $regex: escapeRegex(location), $options: 'i' };
    if (category) filter.category = { $regex: escapeRegex(category), $options: 'i' };

    const jobs = await Job.find(filter).sort({ createdAt: -1 });
    res.json({ servedBy: INSTANCE_NAME, count: jobs.length, jobs });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// API 2: view one job by id (the Application service also uses this to check a job exists)
app.get('/jobs/:id', seekerOnly, async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }
    res.json({ job });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({ message: 'Invalid job id' });
    }
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

const PORT = process.env.PORT || 5005;
app.listen(PORT, () => {
  console.log(`Job Search service running on port ${PORT} (${INSTANCE_NAME})`);
});