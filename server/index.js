const path = require("path");
const fs = require("fs");

// Manually parse .env to avoid global dotenvx interference
const envFile = path.join(__dirname, ".env");
if (fs.existsSync(envFile)) {
  fs.readFileSync(envFile, "utf-8")
    .split("\n")
    .forEach((line) => {
      const [key, ...rest] = line.split("=");
      if (key && rest.length) process.env[key.trim()] = rest.join("=").trim();
    });
}
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const authRoutes = require("./routes/auth");
const chatRoutes = require("./routes/chat");
const { runAgent, resetSession } = require("./agent");

const app = express();
const PORT = process.env.PORT || 5000;

// ── Middleware ──────────────────────────────
const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (curl/Postman) or any localhost port
    if (!origin || /^http:\/\/localhost:\d+$/.test(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};
app.use(cors(corsOptions));
app.use(express.json());

// ── Auth Routes ─────────────────────────────
app.use("/api", authRoutes);

// ── Chat Routes ──────────────────────────────
app.use("/api", chatRoutes);

// ── Agent Chat Endpoint ──────────────────────
app.post("/agent/chat", async (req, res) => {
  try {
    const { message, sessionId } = req.body;
    if (!message?.trim()) {
      return res.status(400).json({ error: "Message is required" });
    }
    const result = await runAgent(message, sessionId || "default");
    res.json(result);
  } catch (err) {
    console.error("Agent chat error:", err);
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
});

// Reset conversation session
app.post("/agent/reset", (req, res) => {
  const { sessionId } = req.body;
  resetSession(sessionId || "default");
  res.json({ message: "Conversation reset successfully" });
});

// ── Health check ────────────────────────────
app.get("/health", (_, res) => res.json({ status: "ok" }));

// ── MongoDB Connection ───────────────────────
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB connected");
    app.listen(PORT, () => {
      console.log(`🚀 Server running at http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("❌ MongoDB connection failed:", err.message);
    process.exit(1);
  });
