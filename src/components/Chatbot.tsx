import { useState, useRef, useEffect } from "react";
import {
  Box,
  Paper,
  TextField,
  IconButton,
  Typography,
  Avatar,
  CircularProgress,
} from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { logout as clearAuth } from "../utils/auth";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

const API = "http://localhost:5000/api";

export default function Chatbot() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content:
        "Hi! 👋 I'm your assistant. I can help you navigate the app. Try saying things like:\n- Show my profile\n- List all users\n- Go to chat\n- Edit my profile\n\nWhat would you like to do?",
      timestamp: Date.now(),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { user, token } = useAuth();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch(`${API}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: input,
        }),
      });

      if (!response.ok) throw new Error("Chat failed");
      const data = await response.json();

      // Handle logout action
      if (data.action === "logout") {
        const assistantMessage: Message = {
          id: Date.now().toString(),
          role: "assistant",
          content: "Logging you out...",
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, assistantMessage]);
        setTimeout(() => {
          clearAuth();
          navigate("/login");
        }, 1000);
        return;
      }

      // Handle navigation actions
      if (data.action === "navigate") {
        navigate(data.path);
        const assistantMessage: Message = {
          id: Date.now().toString(),
          role: "assistant",
          content: `Navigating to ${data.description}...`,
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, assistantMessage]);
      } else {
        const assistantMessage: Message = {
          id: Date.now().toString(),
          role: "assistant",
          content: data.message,
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, assistantMessage]);
      }
    } catch (err) {
      const errorMessage: Message = {
        id: Date.now().toString(),
        role: "assistant",
        content:
          err instanceof Error ? err.message : "Sorry, something went wrong.",
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper
      elevation={3}
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "500px",
        borderRadius: 3,
        overflow: "hidden",
        bgcolor: "#f8fafc",
        border: "1px solid #e2e8f0",
      }}
    >
      {/* Header */}
      <Box
        sx={{
          background: "linear-gradient(135deg, #0f172a 0%, #1d4ed8 100%)",
          p: 2,
          color: "white",
          display: "flex",
          alignItems: "center",
          gap: 1.5,
        }}
      >
        <SmartToyIcon sx={{ fontSize: 28 }} />
        <Typography sx={{ fontWeight: 700, fontSize: 16 }}>
          App Assistant
        </Typography>
      </Box>

      {/* Messages area */}
      <Box
        sx={{
          flex: 1,
          overflowY: "auto",
          p: 2,
          display: "flex",
          flexDirection: "column",
          gap: 2,
          "&::-webkit-scrollbar": {
            width: "6px",
          },
          "&::-webkit-scrollbar-track": {
            background: "#f1f5f9",
          },
          "&::-webkit-scrollbar-thumb": {
            background: "#cbd5e1",
            borderRadius: "3px",
          },
        }}
      >
        {messages.map((msg) => (
          <Box
            key={msg.id}
            sx={{
              display: "flex",
              gap: 1,
              justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
            }}
          >
            {msg.role === "assistant" && (
              <Avatar
                sx={{
                  width: 32,
                  height: 32,
                  bgcolor: "#1d4ed8",
                  flexShrink: 0,
                }}
              >
                <SmartToyIcon sx={{ fontSize: 18 }} />
              </Avatar>
            )}
            <Paper
              sx={{
                p: 1.5,
                maxWidth: "70%",
                bgcolor: msg.role === "user" ? "#0f172a" : "#e2e8f0",
                color: msg.role === "user" ? "white" : "text.primary",
                borderRadius: 2,
                wordBreak: "break-word",
                whiteSpace: "pre-wrap",
              }}
            >
              <Typography variant="body2">{msg.content}</Typography>
            </Paper>
            {msg.role === "user" && (
              <Avatar
                sx={{
                  width: 32,
                  height: 32,
                  bgcolor: "#64748b",
                  flexShrink: 0,
                }}
              >
                {user?.username?.[0]?.toUpperCase() ?? "U"}
              </Avatar>
            )}
          </Box>
        ))}
        {loading && (
          <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
            <Avatar sx={{ width: 32, height: 32, bgcolor: "#1d4ed8" }}>
              <SmartToyIcon sx={{ fontSize: 18 }} />
            </Avatar>
            <CircularProgress size={24} />
          </Box>
        )}
        <div ref={messagesEndRef} />
      </Box>

      {/* Input area */}
      <Box
        sx={{
          p: 2,
          borderTop: "1px solid #e2e8f0",
          bgcolor: "white",
        }}
      >
        <form onSubmit={handleSendMessage} style={{ display: "flex", gap: 1 }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Ask me anything..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
            sx={{
              "& .MuiOutlinedInput-root": {
                borderRadius: 2,
              },
            }}
          />
          <IconButton
            type="submit"
            disabled={loading || !input.trim()}
            sx={{
              bgcolor: "#1d4ed8",
              color: "white",
              "&:hover": {
                bgcolor: "#1e40af",
              },
              "&:disabled": {
                bgcolor: "#cbd5e1",
              },
            }}
          >
            <SendIcon />
          </IconButton>
        </form>
      </Box>
    </Paper>
  );
}
