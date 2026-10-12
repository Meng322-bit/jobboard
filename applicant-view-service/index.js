require('dotenv').config({ path: require('path').join(__dirname, '.env'), override: true });
const express = require('express');
const jwt = require('jsonwebtoken');
const connectDB = require('./db');
const Application = require('./Application');

const app = express();
app.use(express.json());

connectDB();

// Reads the JWT and only lets employers through
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

// API 1: list the applicants for MY jobs, with optional filters: ?status=pending&jobId=...
app.get('/applications', employerOnly, async (req, res) => {
  try {
    const filter = { employerId: req.employerId };
    if (req.query.status) filter.status = req.query.status;
    if (req.query.jobId) filter.jobId = req.query.jobId;

    const applications = await Application.find(filter).sort({ createdAt: -1 });
    res.json({ count: applications.length, applications });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// API 2: view one application (only if it belongs to one of my jobs)
app.get('/applications/:id', employerOnly, async (req, res) => {
  try {
    const application = await Application.findOne({ _id: req.params.id, employerId: req.employerId });
    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }
    res.json({ application });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({ message: 'Invalid application id' });
    }
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// API 3: accept or reject an applicant
app.patch('/applications/:id/status', employerOnly, async (req, res) => {
  try {
    const { status } = req.body;
    if (!['accepted', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'status must be accepted or rejected' });
    }

    const application = await Application.findOneAndUpdate(
      { _id: req.params.id, employerId: req.employerId },   // must be an application for MY job
      { status },
      { new: true }
    );
    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }
    res.json({ message: 'Application status updated successfully', application });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({ message: 'Invalid application id' });
    }
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

const PORT = process.env.PORT || 5004;
app.listen(PORT, () => {
  console.log(`Applicant View service running on port ${PORT}`);
});