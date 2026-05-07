const express = require("express");
const verifyToken = require("../middleware/verifyToken");
const User = require("../models/User");

const router = express.Router();

// Fallback chatbot without OpenAI - uses pattern matching
async function handleChatWithoutOpenAI(message, userId, userName) {
  const lowerMessage = message.toLowerCase();

  // Profile queries
  if (
    lowerMessage.includes("profile") ||
    lowerMessage.includes("my info") ||
    lowerMessage.includes("show my")
  ) {
    return {
      message: `I can help you view your profile! Let me get your information...`,
      action: "navigate",
      path: "/profile",
      description: "profile",
    };
  }

  // Users list
  if (
    lowerMessage.includes("list") ||
    lowerMessage.includes("all users") ||
    lowerMessage.includes("users") ||
    lowerMessage.includes("who")
  ) {
    const users = await User.find({}, "username mobile createdAt").sort({
      createdAt: -1,
    });
    const userList = users
      .map((u) => `• ${u.username} (${u.mobile})`)
      .join("\n");
    return {
      message: `Here are all registered users:\n\n${userList}\n\nTotal: ${users.length} user(s)`,
      action: null,
    };
  }

  // Edit/Update profile
  if (
    lowerMessage.includes("edit") ||
    lowerMessage.includes("update") ||
    lowerMessage.includes("change")
  ) {
    return {
      message: `Let me take you to your profile where you can edit your information.`,
      action: "navigate",
      path: "/profile",
      description: "profile",
    };
  }

  // Chat/Assistant
  if (
    lowerMessage.includes("chat") ||
    lowerMessage.includes("assistant") ||
    lowerMessage.includes("go to chat")
  ) {
    return {
      message: `Navigating to the chat assistant...`,
      action: "navigate",
      path: "/assistant",
      description: "assistant",
    };
  }

  // Help
  if (
    lowerMessage.includes("help") ||
    lowerMessage.includes("what can") ||
    lowerMessage.includes("how to")
  ) {
    return {
      message: `I can help you with:
• View your profile - say "show my profile"
• List all users - say "list all users"
• Edit your information - say "edit my profile"
• Navigate to chat - say "go to chat"
• Logout - say "logout"

What would you like to do?`,
      action: null,
    };
  }

  // Logout
  if (lowerMessage.includes("logout") || lowerMessage.includes("exit")) {
    return {
      message: `You're logging out...`,
      action: "logout",
    };
  }

  // Default response
  return {
    message: `Hi ${userName}! I'm not sure what you're asking. Here are some things I can help with:
• "Show my profile" - View your profile
• "List all users" - See registered users
• "Edit my profile" - Update your information
• "Go to chat" - Visit the chat page
• "Help" - Show all options`,
    action: null,
  };
}

// Main chat endpoint
router.post("/chat", verifyToken, async (req, res) => {
  try {
    const { message } = req.body;
    if (!message?.trim()) {
      return res.status(400).json({ message: "Message is required" });
    }

    // Get user info for context
    const user = await User.findById(req.user.id);

    // Use fallback chatbot
    const response = await handleChatWithoutOpenAI(
      message,
      req.user.id,
      user?.username || "User"
    );

    res.json(response);
  } catch (err) {
    console.error("Chat error:", err);
    res.status(500).json({
      message: "Error processing your message. Please try again.",
      error: err.message,
    });
  }
});

module.exports = router;
