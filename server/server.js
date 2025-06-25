const Contact = require('./models/contact');
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const bcrypt = require('bcrypt');
const session = require('express-session');
const User = require('./models/user');
const fs = require('fs');
require('dotenv').config();

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '..', 'public')));
app.use(session({
  secret: 'your-secret',
  resave: false,
  saveUninitialized: true
}));

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/myWebsiteDB', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log("✅ MongoDB connected"))
  .catch(err => console.error("❌ MongoDB connection failed:", err));

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

app.get('/sign-in-sign-up', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'signin-signup.html'));
});

app.get('/dashboard', (req, res) => {
  if (req.session.userId) {
    res.sendFile(path.join(__dirname, '..', 'public', 'dashboard.html'));
  } else {
    res.redirect('/sign-in-sign-up');
  }
});

app.post('/signup', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password)
    return res.status(400).json({ message: 'Please fill all fields' });

  const userExists = await User.findOne({ $or: [{ email }, { name }] });
  if (userExists)
    return res.status(400).json({ message: 'Username or Email already taken' });

  const hashed = await bcrypt.hash(password, 10);
  const newUser = new User({ name, email, password: hashed });
  await newUser.save();

  // Create user folder
  const userFolderPath = path.join(__dirname, '..', 'users', name);
  if (!fs.existsSync(userFolderPath)) {
    fs.mkdirSync(userFolderPath, { recursive: true });
    console.log(`📁 Created folder for user: ${name}`);
  }

  req.session.userId = newUser._id;
  res.status(200).json({ username: newUser.name }); // ✅ Send username
});

app.post('/signin', async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user)
    return res.status(400).json({ message: 'User not found' });

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch)
    return res.status(401).json({ message: 'Incorrect password' });

  req.session.userId = user._id;
  res.status(200).json({ username: user.name }); // ✅ Send username
});

app.post('/api/contact', async (req, res) => {
  try {
    const { name, email, message } = req.body;
    if (!name || !email || !message) {
      return res.status(400).json({ message: 'All fields are required.' });
    }

    await Contact.create({ name, email, message });
    res.status(200).json({ message: 'Your message has been sent!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error. Please try again.' });
  }
});

app.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running at http://localhost:${PORT}`));
