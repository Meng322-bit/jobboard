require('dotenv').config({ path: require('path').join(__dirname, '.env'), override: true });
const express = require('express');
const jwt = require('jsonwebtoken');
const connectDB = require('./db');
const Job = require('./Job');

const app = express();
app.use(express.json());

connectDB();

// Reads the JWT, only lets employers through, and saves the employer's id in req.employerId
function employerOnly(req, res, next) {
  const header = req.headers['authorization'];
  if (!header) {
    return res.status(401).json({ message: 'No token provided' });
  }
  try {
    const decoded = jwt.verify(header.split(' ')[1], process.env.JWT_SECRET);
    if (decoded.role !== 'employer') {
      return res.status(403).json({ message: 'Access denied for your role' });
    }
    req.employerId = decoded.id;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid or expired token' });
  }
}

// API 1: create a job (the employer's id comes from the token, never from the request body)
app.post('/jobs', employerOnly, async (req, res) => {
  try {
    const { title, description, location, category } = req.body;
    if (!title || !description || !location) {
      return res.status(400).json({ message: 'title, description and location are required' });
    }
    const job = await Job.create({ title, description, location, category, employerId: req.employerId });
    res.status(201).json({ message: 'Job created successfully', job });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// API 2: view only my own jobs
app.get('/jobs', employerOnly, async (req, res) => {
  try {
    const jobs = await Job.find({ employerId: req.employerId }).sort({ createdAt: -1 });
    res.json({ count: jobs.length, jobs });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// API 3: edit one of my jobs
app.put('/jobs/:id', employerOnly, async (req, res) => {
  try {
    const { title, description, location, category } = req.body;
    const updates = {};
    if (title) updates.title = title;
    if (description) updates.description = description;
    if (location) updates.location = location;
    if (category) updates.category = category;

    const job = await Job.findOneAndUpdate(
      { _id: req.params.id, employerId: req.employerId },   // must be MY job
      updates,
      { new: true, runValidators: true }
    );
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }
    res.json({ message: 'Job updated successfully', job });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({ message: 'Invalid job id' });
    }
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// API 4: delete one of my jobs
app.delete('/jobs/:id', employerOnly, async (req, res) => {
  try {
    const job = await Job.findOneAndDelete({ _id: req.params.id, employerId: req.employerId });
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }
    res.json({ message: 'Job deleted successfully' });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({ message: 'Invalid job id' });
    }
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

const PORT = process.env.PORT || 5003;
app.listen(PORT, () => {
  console.log(`Job Listing service running on port ${PORT}`);
});