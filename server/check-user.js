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
  const user = await User.findOne({ username });
  if (user) {
    console.log(`User "${username}" EXISTS`);
    console.log(`Registered: ${user.createdAt?.toDateString() ?? 'unknown'}`);
    console.log(`Mobile: ${user.mobile}`);
  } else {
    console.log(`User "${username}" does NOT exist in the database.`);
  }
  await mongoose.disconnect();
});
