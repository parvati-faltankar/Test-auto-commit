const express = require("express");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const router = express.Router();

// In-memory OTP store (keyed by mobile number)
const otpStore = new Map();

// ─────────────────────────────────────────
// POST /api/register
// ─────────────────────────────────────────
router.post("/register", async (req, res) => {
  try {
    const { username, password, mobile } = req.body;

    if (!username || !password || !mobile) {
      return res.status(400).json({ message: "All fields are required." });
    }

    if (!/^\d{10}$/.test(mobile)) {
      return res.status(400).json({ message: "Mobile must be 10 digits." });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters." });
    }

    const existingUser = await User.findOne({ $or: [{ username }, { mobile }] });
    if (existingUser) {
      const field = existingUser.username === username ? "Username" : "Mobile number";
      return res.status(409).json({ message: `${field} already registered.` });
    }

    const user = new User({ username, password, mobile });
    await user.save();

    res.status(201).json({ message: "Registration successful." });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ message: "Server error during registration." });
  }
});

// ─────────────────────────────────────────
// POST /api/login  (username + password)
// ─────────────────────────────────────────
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: "Username and password are required." });
    }

    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ message: "Invalid username or password." });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid username or password." });
    }

    const token = jwt.sign(
      { id: user._id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    res.json({
      message: "Login successful.",
      token,
      user: { username: user.username, mobile: user.mobile },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Server error during login." });
  }
});

// ─────────────────────────────────────────
// POST /api/login/otp/send  (send OTP)
// ─────────────────────────────────────────
router.post("/login/otp/send", async (req, res) => {
  try {
    const { mobile } = req.body;

    if (!mobile || !/^\d{10}$/.test(mobile)) {
      return res.status(400).json({ message: "Enter a valid 10-digit mobile number." });
    }

    const user = await User.findOne({ mobile });
    if (!user) {
      return res.status(404).json({ message: "Mobile number not registered." });
    }

    // Generate 4-digit OTP
    const otp = Math.floor(1000 + Math.random() * 9000).toString();

    // Store OTP with 5-minute expiry
    otpStore.set(mobile, { otp, expiresAt: Date.now() + 5 * 60 * 1000 });

    // In production replace this with SMS (Twilio / Firebase)
    console.log(`[OTP] Mobile: ${mobile} → OTP: ${otp}`);

    res.json({ message: "OTP sent successfully.", otp }); // Remove `otp` from response in production
  } catch (err) {
    console.error("OTP send error:", err);
    res.status(500).json({ message: "Server error sending OTP." });
  }
});

// ─────────────────────────────────────────
// POST /api/login/otp/verify  (verify OTP)
// ─────────────────────────────────────────
router.post("/login/otp/verify", async (req, res) => {
  try {
    const { mobile, otp } = req.body;

    if (!mobile || !otp) {
      return res.status(400).json({ message: "Mobile and OTP are required." });
    }

    const record = otpStore.get(mobile);
    if (!record) {
      return res.status(400).json({ message: "OTP not found. Please request a new one." });
    }

    if (Date.now() > record.expiresAt) {
      otpStore.delete(mobile);
      return res.status(400).json({ message: "OTP has expired. Please request a new one." });
    }

    if (record.otp !== otp) {
      return res.status(400).json({ message: "Invalid OTP." });
    }

    otpStore.delete(mobile); // Clear OTP after successful use

    const user = await User.findOne({ mobile });

    const token = jwt.sign(
      { id: user._id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    res.json({
      message: "OTP verified. Login successful.",
      token,
      user: { username: user.username, mobile: user.mobile },
    });
  } catch (err) {
    console.error("OTP verify error:", err);
    res.status(500).json({ message: "Server error verifying OTP." });
  }
});

module.exports = router;
