// ./server/server.js

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcrypt');
const fs = require('fs');
const session = require('express-session');
const multer = require('multer');
const { execSync, spawn } = require('child_process');
require('dotenv').config();

const MultiUserPipelineManager = require('../organiser/multi-user-pipeline');

const app = express();
app.use(cors());
app.use(express.json());

// Initialize multi-user pipeline manager
const pipelineManager = new MultiUserPipelineManager();
pipelineManager.initialize().then(() => {
  console.log('Multi-user pipeline manager initialized');
  // Start monitoring for file processing
  pipelineManager.startMonitoring();
}).catch(err => {
  console.error('Failed to initialize pipeline manager:', err);
});

// MongoDB connection
const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/aifileorganiser';
mongoose.connect(mongoUri, {
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

// Multer storage config for user queue folder
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    if (!req.session.user) return cb(new Error('Unauthorized'));
    const userQueueDir = path.join(__dirname, '../users', req.session.user.name, 'queue');
    if (!fs.existsSync(userQueueDir)) {
      fs.mkdirSync(userQueueDir, { recursive: true });
    }
    // Strict enforcement: only allow upload to queue folder
    if (!userQueueDir.endsWith(path.join('users', req.session.user.name, 'queue'))) {
      console.error('Attempted upload to non-queue folder:', userQueueDir);
      return cb(new Error('Uploads are only allowed to the queue folder.'));
    }
    cb(null, userQueueDir);
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  }
});
const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});

// Helper to sanitize username (alphanumeric, hyphens, underscores only)
function isValidUsername(username) {
  return /^[a-zA-Z0-9_-]+$/.test(username);
}

// Sign Up route
app.post('/signup', async (req, res) => {
  console.log(`[SIGNUP] Attempt for user: ${req.body.name}`);
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

  // Create new user folder structure using pipeline
  try {
    // Initialize user directories using the pipeline system
    await pipelineManager.createUser(name);
  } catch (err) {
    console.error('Error creating user directories:', err);
    return res.status(500).json({ message: 'User registered, but failed to create user directories.' });
  }

  res.json({ message: 'User registered successfully!' });
});

// Sign In route
app.post('/signin', async (req, res) => {
  console.log(`[SIGNIN] Attempt for email: ${req.body.email}`);
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
  console.log(`[DASHBOARD] Accessed by user: ${req.session.user.name}`);
  res.json({ message: `Welcome, ${req.session.user.name}!` });
});

// File upload route (protected)
app.post('/upload', requireLogin, (req, res, next) => {
  console.log(`[UPLOAD] User: ${req.session.user.name} is uploading a file...`);
  upload.single('file')(req, res, function (err) {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        console.error(`[UPLOAD] File too large for user: ${req.session.user.name}`);
        return res.status(400).json({ message: 'File too large. Max size is 5MB.' });
      }
      console.error(`[UPLOAD] Error for user: ${req.session.user.name}:`, err.message);
      return res.status(400).json({ message: err.message });
    }
    if (!req.file) {
      console.error(`[UPLOAD] No file uploaded by user: ${req.session.user.name}`);
      return res.status(400).json({ message: 'No file uploaded' });
    }
    console.log(`[UPLOAD] File uploaded successfully for user: ${req.session.user.name}, filename: ${req.file.filename}`);
    res.json({ message: 'File uploaded successfully', filename: req.file.filename });
  });
});

const getUserRootDir = (user) => path.join(__dirname, '../users', user.name);

// Explorer API route
app.get('/api/explorer', requireLogin, (req, res) => {
  const dir = req.query.dir || '';
  console.log(`[EXPLORER] User: ${req.session.user.name} browsing dir: ${dir}`);
  const userDir = path.join(getUserRootDir(req.session.user), dir);
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

// Get user pipeline statistics
app.get('/api/user/stats', requireLogin, async (req, res) => {
  console.log(`[STATS] User: ${req.session.user.name} requested stats`);
  try {
    const stats = await pipelineManager.getUserStats(req.session.user.name);
    if (stats) {
      res.json(stats);
    } else {
      res.status(404).json({ message: 'User stats not found' });
    }
  } catch (err) {
    console.error('Error getting user stats:', err);
    res.status(500).json({ message: 'Failed to get user statistics' });
  }
});

// Manually trigger pipeline for current user
app.post('/api/user/process', requireLogin, async (req, res) => {
  console.log(`[PROCESS] User: ${req.session.user.name} triggered manual processing`);
  try {
    await pipelineManager.processUserFiles(req.session.user.name);
    res.json({ message: 'Pipeline processing triggered successfully' });
  } catch (err) {
    console.error('Error triggering pipeline:', err);
    res.status(500).json({ message: 'Failed to trigger pipeline processing' });
  }
});

// Get all users stats (admin endpoint - you might want to add admin auth)
app.get('/api/admin/stats', async (req, res) => {
  console.log(`[ADMIN] Admin requested all user stats`);
  try {
    const allStats = await pipelineManager.getAllUserStats();
    res.json(allStats);
  } catch (err) {
    console.error('Error getting all user stats:', err);
    res.status(500).json({ message: 'Failed to get all user statistics' });
  }
});

// File system API (newly added)

const USER_DATA_ROOT = path.join(__dirname, 'user_data');

// Dummy authentication middleware (replace with real one)
function authenticate(req, res, next) {
  // req.user = getUserFromSession(req); // Implement your auth
  req.user = 'demo_user'; // For testing
  next();
}

// List files/folders
app.get('/api/files', authenticate, (req, res) => {
  const user = req.user;
  const dir = req.query.dir || '';
  const userDir = path.join(USER_DATA_ROOT, user, dir);

  fs.readdir(userDir, { withFileTypes: true }, (err, files) => {
    if (err) return res.status(500).json({ error: 'Cannot read directory' });
    res.json(files.map(f => ({
      name: f.name,
      isDirectory: f.isDirectory()
    })));
  });
});

// Download file
app.get('/api/download', authenticate, (req, res) => {
  const user = req.user;
  const filePath = req.query.path;
  const absPath = path.join(USER_DATA_ROOT, user, filePath);

  if (!absPath.startsWith(path.join(USER_DATA_ROOT, user))) {
    return res.status(403).send('Forbidden');
  }
  res.download(absPath);
});

const organiserDir = path.join(__dirname, '../organiser');
const fsSync = require('fs'); // Use sync for startup

// List all .js files in organiser root (except multi-user-pipeline.js and extract_organized_to_context.js)
const organiserScripts = fsSync.readdirSync(organiserDir)
  .filter(f => f.endsWith('.js') && !['multi-user-pipeline.js', 'extract_organized_to_context.js'].includes(f));

// Spawn each script as a persistent child process
organiserScripts.forEach(script => {
  function startScript() {
    const proc = spawn('node', [path.join(organiserDir, script)], { stdio: 'inherit' });
    proc.on('close', (code) => {
      console.error(`[ORGANISER] ${script} exited with code ${code}. Restarting...`);
      setTimeout(startScript, 2000); // Restart after 2 seconds
    });
  }
  startScript();
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/homepage.html'));
});