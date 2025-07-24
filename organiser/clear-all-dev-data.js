// WARNING: This script will irreversibly DELETE ALL USER DATA and DROP the MongoDB database.
// Use ONLY for development resets!

const mongoose = require('mongoose');
const fs = require('fs').promises;
const path = require('path');

async function clearMongoDB() {
  await mongoose.connect('mongodb://localhost:27017/aifileorganiser', {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
  console.log('✅ MongoDB database dropped.');
}

async function clearUserFiles() {
  const usersDir = path.join(__dirname, '../users');
  try {
    await fs.rm(usersDir, { recursive: true, force: true });
    console.log('✅ All user files deleted.');
  } catch (err) {
    if (err.code === 'ENOENT') {
      console.log('No user files to delete.');
    } else {
      throw err;
    }
  }
}

(async () => {
  try {
    await clearMongoDB();
    await clearUserFiles();
    console.log('All dev data cleared.');
    process.exit(0);
  } catch (err) {
    console.error('Error clearing dev data:', err);
    process.exit(1);
  }
})(); 