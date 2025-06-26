const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const bcrypt = require('bcrypt');
const session = require('express-session');
const fs = require('fs');
const fsPromises = require('fs').promises;
const dotenv = require('dotenv');
const multer = require('multer');
const User = require('./models/user');
const Contact = require('./models/contact');
const sendNotificationEmail = require('./utils/mailer');

dotenv.config();

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '..', 'public')));
app.use(session({
  secret: 'your-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: false
  }
}));

// MongoDB connection
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/myWebsiteDB', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log("✅ MongoDB connected"))
.catch(err => console.error("❌ MongoDB connection failed:", err));

// Multer config
const upload = multer({ dest: 'uploads/' });

// Serve pages
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

function isValidPassword(password) {
  const pattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
  return pattern.test(password);
}

app.post('/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ message: 'Please fill all fields' });

    const validUsernamePattern = /^[a-zA-Z0-9_-]+$/;
    if (!validUsernamePattern.test(name)) {
      return res.status(400).json({
        message: 'Username can only contain letters, numbers, hyphens, and underscores.'
      });
    }

    if (!isValidPassword(password)) {
      return res.status(400).json({
        message: 'Password must be at least 8 characters and include uppercase, lowercase, number, and special character.'
      });
    }

    const userExists = await User.findOne({ $or: [{ email }, { name }] });
    if (userExists)
      return res.status(400).json({ message: 'Username or Email already taken' });

    const hashed = await bcrypt.hash(password, 10);
    const newUser = new User({ name, email, password: hashed });
    await newUser.save();

    const userFolderPath = path.join(__dirname, '..', 'public', 'users', name);
    if (!fs.existsSync(userFolderPath)) {
      fs.mkdirSync(userFolderPath, { recursive: true });
      console.log(`📁 Created folder for user: ${name}`);
    }

    try {
      await sendNotificationEmail(email, 'Welcome to AI Sorter!', `Hello ${name}, thanks for signing up!`);
    } catch (emailErr) {
      console.error('Error sending welcome email:', emailErr);
    }

    req.session.userId = newUser._id;
    res.status(200).json({ username: newUser.name });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error during signup.' });
  }
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
  res.status(200).json({ username: user.name });
});

app.post('/api/contact', async (req, res) => {
  try {
    const { name, email, message } = req.body;
    if (!name || !email || !message)
      return res.status(400).json({ message: 'All fields are required.' });

    await Contact.create({ name, email, message });

    try {
      await sendNotificationEmail(
        'admin@example.com',
        '📬 New Contact Message',
        `From: ${name}\nEmail: ${email}\nMessage: ${message}`
      );
    } catch (emailErr) {
      console.error('Error sending contact notification email:', emailErr);
    }

    res.status(200).json({ message: 'Your message has been sent!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error. Please try again.' });
  }
});

app.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.session.userId) return res.status(401).json({ message: 'Unauthorized' });
    const user = await User.findById(req.session.userId);
    if (!user) return res.status(401).json({ message: 'User not found' });

    const userDir = path.join(__dirname, '..', 'public', 'users', user.name);
    const tempPath = req.file.path;
    const targetPath = path.join(userDir, req.file.originalname);

    await fsPromises.rename(tempPath, targetPath);
    res.status(200).send('File uploaded successfully');
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).send('File upload failed');
  }
});

app.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/sign-in-sign-up');
  });
});

app.get('/api/current-user', async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ message: 'Not logged in' });
  }

  try {
    const user = await User.findById(req.session.userId);
    if (!user) return res.status(401).json({ message: 'User not found' });

    res.status(200).json({ username: user.name });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

const BASE_DIR = path.join(__dirname, '..', 'public', 'users');

app.get('/api/list', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ message: 'Unauthorized. Please log in.' });
    }

    const user = await User.findById(req.session.userId).select('name');
    if (!user) return res.status(401).json({ message: 'Unauthorized' });

    let requestedPath = req.query.path || '';
    requestedPath = requestedPath.replace(/^\//, '');

    const userBasePath = path.join(BASE_DIR, user.name);
    const safePath = path.normalize(path.join(userBasePath, requestedPath));

    if (!safePath.startsWith(userBasePath)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const stats = await fsPromises.stat(safePath);
    if (!stats.isDirectory()) {
      return res.status(400).json({ message: 'Not a directory' });
    }

    const files = await fsPromises.readdir(safePath, { withFileTypes: true });

    const contents = files.map(file => ({
      name: file.name,
      isDirectory: file.isDirectory()
    }));

    res.json({ path: requestedPath, contents });
  } catch (err) {
    console.error('Error reading directory:', err);
    res.status(500).json({ message: 'Unable to read directory' });
  }
});

app.get('/explorer', async (req, res) => {
  if (!req.session.userId) return res.redirect('/');
  const user = await User.findById(req.session.userId);
  if (!user) return res.redirect('/');
  res.sendFile(path.join(__dirname, '..', 'public', 'explorer.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running at http://localhost:${PORT}`));