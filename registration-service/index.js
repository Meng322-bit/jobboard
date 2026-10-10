require('dotenv').config({ path: require('path').join(__dirname, '.env'), override: true });
const express = require('express');
const bcrypt = require('bcrypt');
const connectDB = require('./db');
const User = require('./User');

const app = express();
app.use(express.json());

connectDB();

// API 1: register a new user (employer or seeker)
app.post('/userregister', async (req, res) => {
  try {
    const { name, email, password, role, phone } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: 'name, email, password and role are required' });
    }

    if (!['employer', 'seeker'].includes(role)) {
      return res.status(400).json({ message: 'role must be employer or seeker' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      role,
      phone
    });

    await newUser.save();

    res.status(201).json({
      message: 'User registered successfully',
      user: { id: newUser._id, name, email, role, phone }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// API 2: check whether an email is already registered
app.get('/checkemail', async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) {
      return res.status(400).json({ message: 'email query parameter is required' });
    }
    const existingUser = await User.findOne({ email });
    res.json({ email, registered: !!existingUser });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`Registration service running on port ${PORT}`);
});