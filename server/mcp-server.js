const { McpServer } = require("@modelcontextprotocol/sdk/server/mcp.js");
const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");
const { z } = require("zod");
const mongoose = require("mongoose");
const path = require("path");
const fs = require("fs");

// ── Load .env ────────────────────────────────
const envFile = path.join(__dirname, ".env");
if (fs.existsSync(envFile)) {
  fs.readFileSync(envFile, "utf-8")
    .split("\n")
    .forEach((line) => {
      const [key, ...rest] = line.split("=");
      if (key && rest.length) process.env[key.trim()] = rest.join("=").trim();
    });
}

const User = require("./models/User");

// ── Helper: connect & disconnect ─────────────
async function withDb(fn) {
  await mongoose.connect(process.env.MONGO_URI);
  try {
    return await fn();
  } finally {
    await mongoose.disconnect();
  }
}

// ── Create MCP Server ────────────────────────
const server = new McpServer({
  name: "auth-tools",
  version: "1.0.0",
});

// ── Tool 1: check-user ───────────────────────
// Ask Copilot: "check if user 'john' exists"
server.tool(
  "check-user",
  "Check if a username is already registered in the MongoDB database",
  {
    username: z.string().min(1).describe("The username to look up"),
  },
  async ({ username }) => {
    const user = await withDb(() => User.findOne({ username }));

    return {
      content: [
        {
          type: "text",
          text: user
            ? `✅ User "${username}" EXISTS.\n📅 Registered: ${user.createdAt?.toDateString() ?? "unknown"}\n📱 Mobile: ${user.mobile}`
            : `❌ User "${username}" does NOT exist in the database.`,
        },
      ],
    };
  }
);

// ── Tool 2: list-users ───────────────────────
// Ask Copilot: "list all registered users"
server.tool(
  "list-users",
  "List all registered users (username and mobile) from the database",
  {},
  async () => {
    const users = await withDb(() =>
      User.find({}, "username mobile createdAt").sort({ createdAt: -1 })
    );

    if (users.length === 0) {
      return { content: [{ type: "text", text: "No users registered yet." }] };
    }

    const list = users
      .map(
        (u, i) =>
          `${i + 1}. username: ${u.username} | mobile: ${u.mobile} | joined: ${u.createdAt?.toDateString() ?? "?"}`
      )
      .join("\n");

    return {
      content: [
        {
          type: "text",
          text: `📋 ${users.length} registered user(s):\n\n${list}`,
        },
      ],
    };
  }
);

// ── Tool 3: delete-user ──────────────────────
// Ask Copilot: "delete user 'john' from the database"
server.tool(
  "delete-user",
  "Delete a user by username from the database",
  {
    username: z.string().min(1).describe("The username to delete"),
  },
  async ({ username }) => {
    const result = await withDb(() => User.deleteOne({ username }));

    return {
      content: [
        {
          type: "text",
          text:
            result.deletedCount > 0
              ? `🗑️ User "${username}" has been deleted.`
              : `⚠️ User "${username}" was not found — nothing deleted.`,
        },
      ],
    };
  }
);

// ── Tool 4: update-user ──────────────────────
// Ask Copilot: "update user Parvatif mobile to 9999999999"
server.tool(
  "update-user",
  "Update a user's username, password, or mobile number in the database",
  {
    username: z.string().min(1).describe("The current username to find the user"),
    newUsername: z.string().min(3).optional().describe("New username to set"),
    newMobile: z.string().regex(/^\d{10}$/).optional().describe("New 10-digit mobile number"),
    newPassword: z.string().min(6).optional().describe("New password (will be hashed automatically)"),
  },
  async ({ username, newUsername, newMobile, newPassword }) => {
    if (!newUsername && !newMobile && !newPassword) {
      return {
        content: [{ type: "text", text: "Nothing to update — provide at least one field to change." }],
      };
    }

    const result = await withDb(async () => {
      const user = await User.findOne({ username });
      if (!user) return null;

      if (newUsername) user.username = newUsername;
      if (newMobile) user.mobile = newMobile;
      if (newPassword) user.password = newPassword; // pre-save hook hashes it

      await user.save();
      return user;
    });

    if (!result) {
      return {
        content: [{ type: "text", text: `User "${username}" was not found.` }],
      };
    }

    const changed = [
      newUsername && `username → ${newUsername}`,
      newMobile  && `mobile → ${newMobile}`,
      newPassword && `password → updated`,
    ].filter(Boolean).join(", ");

    return {
      content: [{ type: "text", text: `User "${username}" updated successfully.\nChanged: ${changed}` }],
    };
  }
);

// ── Start via stdio transport ────────────────
const transport = new StdioServerTransport();
server.connect(transport);
