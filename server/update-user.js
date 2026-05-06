const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

fs.readFileSync(path.join(__dirname, '.env'), 'utf-8').split('\n').forEach(line => {
  const [key, ...rest] = line.split('=');
  if (key && rest.length) process.env[key.trim()] = rest.join('=').trim();
});

const User = require('./models/User');

// Args: username field value [field value ...]
// Example: node update-user.js Parvatif mobile 9999999999
const username    = process.argv[2];
const newUsername = process.argv.indexOf('--username') !== -1 ? process.argv[process.argv.indexOf('--username') + 1] : undefined;
const newMobile   = process.argv.indexOf('--mobile')   !== -1 ? process.argv[process.argv.indexOf('--mobile')   + 1] : undefined;
const newPassword = process.argv.indexOf('--password')  !== -1 ? process.argv[process.argv.indexOf('--password')  + 1] : undefined;

if (!username) { console.log('Usage: node update-user.js <username> [--username x] [--mobile x] [--password x]'); process.exit(1); }

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const user = await User.findOne({ username });
  if (!user) { console.log(`User "${username}" not found.`); await mongoose.disconnect(); return; }

  if (newUsername) user.username = newUsername;
  if (newMobile)   user.mobile   = newMobile;
  if (newPassword) user.password = newPassword;

  await user.save();

  const changed = [
    newUsername && `username → ${newUsername}`,
    newMobile   && `mobile → ${newMobile}`,
    newPassword && `password → updated`,
  ].filter(Boolean).join(', ');

  console.log(`User "${username}" updated: ${changed}`);
  await mongoose.disconnect();
});
