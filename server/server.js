// ./server/server.js

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcrypt');
const fs = require('fs');
const session = require('express-session');
const multer = require('multer');

const app = express();
app.use(cors());
app.use(express.json());

// MongoDB connection
mongoose.connect('mongodb://localhost:27017/aifileorganiser', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('✅ MongoDB connected'))
.catch(err => console.error('❌ MongoDB connection error:', err));

// User Schema
const userSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true }
});

const User = mongoose.model('User', userSchema);

// Serve static files
app.use(express.static(path.join(__dirname, '../public')));

// Session middleware
app.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000 } // 24 hours
}));

// Auth middleware
function requireLogin(req, res, next) {
  if (!req.session.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  next();
}

// Multer storage config for user input folder
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    if (!req.session.user) return cb(new Error('Unauthorized'));
    const userInputUploadsDir = path.join(__dirname, '../users', req.session.user.name + '-input', 'Uploads');
    if (!fs.existsSync(userInputUploadsDir)) {
      fs.mkdirSync(userInputUploadsDir, { recursive: true });
    }
    cb(null, userInputUploadsDir);
  },
  filename: function (req, file, cb) {
    // Use user ObjectId as prefix
    const userId = req.session.user && req.session.user._id ? req.session.user._id : 'unknown';
    cb(null, userId + '-' + file.originalname);
  }
});
const upload = multer({ storage });

// Helper to sanitize username (alphanumeric, hyphens, underscores only)
function isValidUsername(username) {
  return /^[a-zA-Z0-9_-]+$/.test(username);
}

// Sign Up route
app.post('/signup', async (req, res) => {
  const { name, email, password } = req.body;

  // Username validation
  if (!isValidUsername(name)) {
    return res.status(400).json({ message: 'Username must be alphanumeric and can include hyphens and underscores only.' });
  }

  // Check for existing username or email
  const existingUser = await User.findOne({ $or: [ { email }, { name } ] });
  if (existingUser) {
    if (existingUser.email === email) {
      return res.status(400).json({ message: 'Email already in use' });
    }
    if (existingUser.name === name) {
      return res.status(400).json({ message: 'Username already in use' });
    }
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  const user = new User({ name, email, password: hashedPassword });
  await user.save();

  // Create new user folder structure
  const userDir = path.join(__dirname, '../users', name);
  const inputDir = path.join(userDir, `${name}-input`);
  const outputDir = path.join(userDir, `${name}-output`);
  const infoDir = path.join(userDir, `${name}_info`);
  const infoFile = path.join(infoDir, `${name}--info.txt`);
  // Input subfolders
  const inputSubfolders = ['Uploads', 'Queue', 'Splitter', 'Scanner', 'Holder'];
  // Output subfolders
  const outputSubfolders = ['Outputs', 'Grouping', 'Merging', 'Storing', 'Multimerge'];
  try {
    // Remove old structure if it exists
    if (fs.existsSync(userDir)) {
      fs.rmSync(userDir, { recursive: true, force: true });
    }
    fs.mkdirSync(userDir, { recursive: true });
    fs.mkdirSync(inputDir);
    fs.mkdirSync(outputDir);
    fs.mkdirSync(infoDir);
    for (const sub of inputSubfolders) {
      fs.mkdirSync(path.join(inputDir, sub));
    }
    for (const sub of outputSubfolders) {
      fs.mkdirSync(path.join(outputDir, sub));
    }
    fs.writeFileSync(infoFile, ''); // No initial content
  } catch (err) {
    return res.status(500).json({ message: 'User registered, but failed to create user directories.' });
  }

  res.json({ message: 'User registered successfully!' });
});

// Sign In route
app.post('/signin', async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });
  if (!user) return res.status(400).json({ message: 'Invalid credentials' });

  const passwordMatch = await bcrypt.compare(password, user.password);
  if (!passwordMatch) return res.status(400).json({ message: 'Invalid credentials' });

  // Set session (add _id)
  req.session.user = { name: user.name, email: user.email, _id: user._id };

  res.json({ message: 'Sign In successful!', user: { name: user.name, email: user.email, _id: user._id } });
});

// Example protected route for dashboard data
app.get('/api/dashboard', requireLogin, (req, res) => {
  res.json({ message: `Welcome, ${req.session.user.name}!` });
});

// File upload route (protected)
app.post('/upload', requireLogin, upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }
  res.json({ message: 'File uploaded successfully', filename: req.file.filename });
});

const getUserRootDir = (user) => path.join(__dirname, '../users', user.name);

// Explorer API route
app.get('/api/explorer', requireLogin, (req, res) => {
  const userDir = getUserRootDir(req.session.user);
  let folders = [], files = [];
  try {
    if (fs.existsSync(userDir)) {
      const items = fs.readdirSync(userDir, { withFileTypes: true });
      for (const item of items) {
        if (item.isDirectory()) {
          folders.push(item.name);
        } else if (item.isFile()) {
          files.push(item.name);
        }
      }
    }
    res.json({ folders, files });
  } catch (err) {
    res.status(500).json({ message: 'Failed to read user directory.' });
  }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/homepage.html'));
});
