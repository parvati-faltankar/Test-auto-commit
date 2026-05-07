const path = require("path");
const fs = require("fs");

// Load .env
const envFile = path.join(__dirname, ".env");
if (fs.existsSync(envFile)) {
  fs.readFileSync(envFile, "utf-8")
    .split("\n")
    .forEach((line) => {
      const [key, ...rest] = line.split("=");
      if (key && rest.length) process.env[key.trim()] = rest.join("=").trim();
    });
}

const { ChatOpenRouter } = require("@langchain/openrouter");
const { createReactAgent } = require("@langchain/langgraph/prebuilt");
const { HumanMessage, AIMessage, SystemMessage } = require("@langchain/core/messages");
const { tool } = require("@langchain/core/tools");
const { z } = require("zod");
const fetch = require("node-fetch");

const API_BASE = "http://localhost:5000/api";

// ──────────────────────────────────────────────
// TOOL 1: Register User
// ──────────────────────────────────────────────
const registerUserTool = tool(
  async ({ username, password, mobile }) => {
    try {
      const res = await fetch(`${API_BASE}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, mobile }),
      });
      const data = await res.json();
      return res.ok ? `Registration successful for user "${username}"` : `Error: ${data.message}`;
    } catch (e) {
      return `Error contacting server: ${e.message}`;
    }
  },
  {
    name: "register_user",
    description: "Register a new user with username, password, and mobile number. Call this when user wants to create an account.",
    schema: z.object({
      username: z.string().min(3).describe("Username (min 3 chars)"),
      password: z.string().min(6).describe("Password (min 6 chars)"),
      mobile: z.string().regex(/^\d{10}$/).describe("10-digit mobile number"),
    }),
  }
);

// ──────────────────────────────────────────────
// TOOL 2: Login with Username & Password
// ──────────────────────────────────────────────
const loginUserTool = tool(
  async ({ username, password }) => {
    try {
      const res = await fetch(`${API_BASE}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (res.ok) {
        return `LOGIN_SUCCESS:${JSON.stringify({ token: data.token, username: data.user?.username })}`;
      }
      return `Error: ${data.message}`;
    } catch (e) {
      return `Error contacting server: ${e.message}`;
    }
  },
  {
    name: "login_user",
    description: "Login a user with username and password. Call this when user provides both username and password.",
    schema: z.object({
      username: z.string().describe("Username"),
      password: z.string().describe("Password"),
    }),
  }
);

// ──────────────────────────────────────────────
// TOOL 3: Send OTP
// ──────────────────────────────────────────────
const sendOtpTool = tool(
  async ({ mobile }) => {
    try {
      const res = await fetch(`${API_BASE}/login/otp/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile }),
      });
      const data = await res.json();
      if (res.ok) {
        // In dev, otp is returned in response for testing
        return data.otp
          ? `OTP sent successfully. (Dev mode OTP: ${data.otp})`
          : "OTP sent to your mobile number. Please check your phone.";
      }
      return `Error: ${data.message}`;
    } catch (e) {
      return `Error contacting server: ${e.message}`;
    }
  },
  {
    name: "send_otp",
    description: "Send OTP to a registered mobile number. Call this when user wants to login via mobile OTP.",
    schema: z.object({
      mobile: z.string().regex(/^\d{10}$/).describe("10-digit mobile number"),
    }),
  }
);

// ──────────────────────────────────────────────
// TOOL 5: List All Users
// ──────────────────────────────────────────────
const listUsersTool = tool(
  async () => {
    try {
      const res = await fetch(`${API_BASE}/users`);
      const data = await res.json();
      if (!res.ok) return `Error: ${data.message}`;
      if (!data.users?.length) return "No users registered yet.";
      const list = data.users
        .map((u, i) => `${i + 1}. ${u.username} | mobile: ${u.mobile} | joined: ${u.joined}`)
        .join("\n");
      return `${data.count} registered user(s):\n\n${list}`;
    } catch (e) {
      return `Error contacting server: ${e.message}`;
    }
  },
  {
    name: "list_users",
    description: "List all registered users. Call this when the user asks to see all users or user list.",
    schema: z.object({}),
  }
);

// ──────────────────────────────────────────────
// TOOL 4: Verify OTP
// ──────────────────────────────────────────────
const verifyOtpTool = tool(
  async ({ mobile, otp }) => {
    try {
      const res = await fetch(`${API_BASE}/login/otp/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile, otp }),
      });
      const data = await res.json();
      if (res.ok) {
        return `LOGIN_SUCCESS:${JSON.stringify({ token: data.token, username: data.user?.username })}`;
      }
      return `Error: ${data.message}`;
    } catch (e) {
      return `Error contacting server: ${e.message}`;
    }
  },
  {
    name: "verify_otp",
    description: "Verify OTP entered by user to complete mobile login. Call this when user provides OTP.",
    schema: z.object({
      mobile: z.string().regex(/^\d{10}$/).describe("Mobile number OTP was sent to"),
      otp: z.string().regex(/^\d{4}$/).describe("4-digit OTP entered by user"),
    }),
  }
);

// ──────────────────────────────────────────────
// Session store (in-memory, keyed by sessionId)
// ──────────────────────────────────────────────
const sessions = new Map();

const SYSTEM_MESSAGE = new SystemMessage(`You are a friendly authentication assistant for a web application.

You help users with:
1. REGISTER - Create a new account (need: username, password, mobile)
2. LOGIN with username/password (need: username, password)  
3. LOGIN with mobile OTP (need: mobile → send OTP → get OTP from user)
4. LIST USERS - Show all registered users

Rules:
- Ask for missing info one step at a time
- Do NOT ask for info the user already provided
- After LOGIN_SUCCESS in tool response, tell user "Login successful! Redirecting you now..."
- After registration success, tell user to login
- Always be friendly and concise
- If user greets you, explain what you can help with`);

// ──────────────────────────────────────────────
// Initialize LLM
// ──────────────────────────────────────────────
const llm = new ChatOpenRouter(
  "openai/gpt-oss-120b:free",
  { temperature: 0 }
);

const tools = [registerUserTool, loginUserTool, sendOtpTool, verifyOtpTool, listUsersTool];

// ──────────────────────────────────────────────
// Agent runner
// ──────────────────────────────────────────────
async function runAgent(userMessage, sessionId = "default") {
  // Get or create session history
  if (!sessions.has(sessionId)) {
    sessions.set(sessionId, []);
  }
  const history = sessions.get(sessionId);

  // Build message list: system + history + new user message
  const messages = [SYSTEM_MESSAGE, ...history, new HumanMessage(userMessage)];

  try {
    const agent = createReactAgent({ llm, tools });

    const result = await agent.invoke({ messages });

    // Extract last AI message
    const lastMessage = result.messages[result.messages.length - 1];
    const assistantText = typeof lastMessage.content === "string"
      ? lastMessage.content
      : lastMessage.content?.[0]?.text ?? "I'm not sure how to help with that.";

    // Update session history
    history.push(new HumanMessage(userMessage));
    history.push(new AIMessage(assistantText));

    // Detect login success
    const loginSuccess = assistantText.toLowerCase().includes("login successful") ||
      assistantText.toLowerCase().includes("redirecting");

    return {
      success: true,
      message: assistantText,
      loginSuccess,
    };
  } catch (error) {
    console.error("Agent error:", error.message);
    return {
      success: false,
      message: "Sorry, I encountered an error. Please try again.",
      error: error.message,
    };
  }
}

function resetSession(sessionId = "default") {
  sessions.delete(sessionId);
}

module.exports = { runAgent, resetSession };
