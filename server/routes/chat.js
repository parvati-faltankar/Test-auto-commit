const express = require("express");
const OpenAI = require("openai").default;
const verifyToken = require("../middleware/verifyToken");
const User = require("../models/User");

const router = express.Router();
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Define tools that the assistant can use
const tools = [
  {
    type: "function",
    function: {
      name: "get_user_profile",
      description: "Get the current user's profile information",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_user_profile",
      description: "Update the current user's profile (username or mobile)",
      parameters: {
        type: "object",
        properties: {
          username: {
            type: "string",
            description: "New username (must be at least 3 characters)",
          },
          mobile: {
            type: "string",
            description: "New mobile number (must be 10 digits)",
          },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_all_users",
      description: "Get a list of all registered users in the system",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "navigate_to",
      description:
        "Navigate the user to a different page in the app. Available pages: profile, assistant, chat, dashboard",
      parameters: {
        type: "object",
        properties: {
          page: {
            type: "string",
            enum: ["profile", "assistant", "chat", "dashboard"],
            description: "The page to navigate to",
          },
        },
        required: ["page"],
      },
    },
  },
];

// Tool execution functions
async function executeGetUserProfile(userId) {
  const user = await User.findById(userId);
  if (!user)
    return { error: "User not found" };
  return {
    username: user.username,
    mobile: user.mobile,
    createdAt: user.createdAt,
  };
}

async function executeUpdateUserProfile(userId, username, mobile) {
  const user = await User.findById(userId);
  if (!user) return { error: "User not found" };

  if (username && username.length < 3) {
    return { error: "Username must be at least 3 characters" };
  }
  if (mobile && !/^\d{10}$/.test(mobile)) {
    return { error: "Mobile must be 10 digits" };
  }

  if (username) user.username = username;
  if (mobile) user.mobile = mobile;
  await user.save();

  return {
    success: true,
    message: "Profile updated successfully",
    user: { username: user.username, mobile: user.mobile },
  };
}

async function executeListAllUsers() {
  const users = await User.find({}, "username mobile createdAt").sort({
    createdAt: -1,
  });
  return users.map((u) => ({
    username: u.username,
    mobile: u.mobile,
    joined: u.createdAt?.toDateString(),
  }));
}

function executeNavigateTo(page) {
  const pathMap = {
    profile: "/profile",
    assistant: "/assistant",
    chat: "/chat",
    dashboard: "/success",
  };
  return { success: true, path: pathMap[page] || "/success" };
}

// Main chat endpoint
router.post("/chat", verifyToken, async (req, res) => {
  try {
    const { message, conversationHistory } = req.body;
    if (!message?.trim()) {
      return res.status(400).json({ message: "Message is required" });
    }

    // Prepare messages for OpenAI
    const messagesForOpenAI = [
      {
        role: "system",
        content: `You are a helpful assistant for a React web application. You help users navigate and use the app features. 
        
Current user: ${req.user.username}
        
Be friendly, concise, and helpful. When users ask to navigate somewhere or perform actions, use the available tools. 
If a user asks something that requires a tool call, call the appropriate tool. 
Always explain what you're doing in a user-friendly way.`,
      },
      ...(conversationHistory || []),
      { role: "user", content: message },
    ];

    // Call OpenAI with tools
    let response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: messagesForOpenAI,
      tools: tools,
      tool_choice: "auto",
      max_tokens: 500,
    });

    // Process tool calls if present
    while (
      response.choices[0]?.finish_reason === "tool_calls" &&
      response.choices[0]?.message?.tool_calls
    ) {
      const toolCalls = response.choices[0].message.tool_calls;
      const toolResults = [];

      for (const toolCall of toolCalls) {
        let result;
        const args = toolCall.function.arguments;
        const parsedArgs = typeof args === "string" ? JSON.parse(args) : args;

        if (toolCall.function.name === "get_user_profile") {
          result = await executeGetUserProfile(req.user.id);
        } else if (toolCall.function.name === "update_user_profile") {
          result = await executeUpdateUserProfile(
            req.user.id,
            parsedArgs.username,
            parsedArgs.mobile
          );
        } else if (toolCall.function.name === "list_all_users") {
          result = await executeListAllUsers();
        } else if (toolCall.function.name === "navigate_to") {
          result = executeNavigateTo(parsedArgs.page);
          // Store navigation action to return separately
          if (result.success && result.path) {
            return res.json({
              message: `Navigating to ${parsedArgs.page}...`,
              action: "navigate",
              path: result.path,
              description: parsedArgs.page,
            });
          }
        }

        toolResults.push({
          tool_call_id: toolCall.id,
          role: "tool",
          content: JSON.stringify(result),
        });
      }

      // Continue conversation with tool results
      messagesForOpenAI.push({
        role: "assistant",
        content: response.choices[0].message.content || "",
        tool_calls: toolCalls.map((tc) => ({
          id: tc.id,
          type: "function",
          function: {
            name: tc.function.name,
            arguments: tc.function.arguments,
          },
        })),
      });

      messagesForOpenAI.push(...toolResults);

      response = await client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: messagesForOpenAI,
        tools: tools,
        tool_choice: "auto",
        max_tokens: 500,
      });
    }

    // Return final response
    const assistantMessage =
      response.choices[0]?.message?.content || "Sorry, I couldn't process that.";

    res.json({
      message: assistantMessage,
      action: null,
    });
  } catch (err) {
    console.error("Chat error:", err);
    res.status(500).json({
      message: "Error processing your message. Please try again.",
      error: err.message,
    });
  }
});

module.exports = router;
