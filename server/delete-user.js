const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

fs.readFileSync(path.join(__dirname, '.env'), 'utf-8').split('\n').forEach(line => {
  const [key, ...rest] = line.split('=');
  if (key && rest.length) process.env[key.trim()] = rest.join('=').trim();
});

const User = require('./models/User');
const username = process.argv[2];

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const result = await User.deleteOne({ username });
  if (result.deletedCount > 0) {
    console.log(`User "${username}" has been deleted.`);
  } else {
    console.log(`User "${username}" was not found — nothing deleted.`);
  }
  await mongoose.disconnect();
});
