import { useEffect, useRef, useState } from "react";
import { useNavigate, Link as RouterLink } from "react-router-dom";
import {
  Alert,
  Box,
  CircularProgress,
  Container,
  Divider,
  IconButton,
  Link,
  Paper,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import SendIcon from "@mui/icons-material/Send";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import PersonIcon from "@mui/icons-material/Person";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const SESSION_ID = `session_${Date.now()}`;
const AGENT_URL = "http://localhost:5000";
const WELCOME = "👋 Hi! I'm your authentication assistant.\n\nI can help you:\n• **Register** a new account\n• **Login** with username & password\n• **Login** with mobile OTP\n\nWhat would you like to do?";

export default function ChatAssistant() {
  const navigate = useNavigate();
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: WELCOME },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Auto-scroll to bottom on new message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;

    setError("");
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setLoading(true);

    try {
      const res = await fetch(`${AGENT_URL}/agent/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, sessionId: SESSION_ID }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");

      const reply = data.message || "Something went wrong.";
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);

      // Redirect on successful login
      if (data.loginSuccess) {
        setTimeout(() => navigate("/success"), 1800);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to send message");
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, I couldn't process that. Please try again." },
      ]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const resetChat = async () => {
    try {
      await fetch(`${AGENT_URL}/agent/reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: SESSION_ID }),
      });
    } catch (_) {
      // Silent — reset on client side regardless
    }
    setMessages([{ role: "assistant", content: WELCOME }]);
    setError("");
    setInput("");
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "grey.100",
        py: 2,
      }}
    >
      <Container maxWidth="sm">
        <Paper
          elevation={4}
          sx={{
            borderRadius: 3,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            height: "90vh",
            maxHeight: 680,
          }}
        >
          {/* ── Header ── */}
          <Box
            sx={{
              px: 2.5,
              py: 1.5,
              bgcolor: "primary.main",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <SmartToyIcon />
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                  Auth Assistant
                </Typography>
                <Typography variant="caption" sx={{ opacity: 0.85 }}>
                  Powered by Claude AI
                </Typography>
              </Box>
            </Box>
            <Tooltip title="Reset conversation">
              <IconButton size="small" onClick={resetChat} sx={{ color: "#fff" }}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          </Box>

          <Divider />

          {/* ── Messages ── */}
          <Box
            sx={{
              flex: 1,
              overflowY: "auto",
              px: 2,
              py: 1.5,
              display: "flex",
              flexDirection: "column",
              gap: 1.5,
              bgcolor: "#f9fafb",
            }}
          >
            {messages.map((msg, idx) => (
              <Box
                key={idx}
                sx={{
                  display: "flex",
                  justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
                  alignItems: "flex-end",
                  gap: 1,
                }}
              >
                {msg.role === "assistant" && (
                  <SmartToyIcon sx={{ fontSize: 22, color: "primary.main", mb: 0.5 }} />
                )}
                <Paper
                  elevation={1}
                  sx={{
                    px: 2,
                    py: 1.2,
                    maxWidth: "82%",
                    borderRadius: msg.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                    bgcolor: msg.role === "user" ? "primary.main" : "#fff",
                    color: msg.role === "user" ? "#fff" : "text.primary",
                  }}
                >
                  <Typography
                    variant="body2"
                    sx={{ whiteSpace: "pre-wrap", lineHeight: 1.6 }}
                  >
                    {msg.content}
                  </Typography>
                </Paper>
                {msg.role === "user" && (
                  <PersonIcon sx={{ fontSize: 22, color: "grey.500", mb: 0.5 }} />
                )}
              </Box>
            ))}

            {/* Typing indicator */}
            {loading && (
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <SmartToyIcon sx={{ fontSize: 22, color: "primary.main" }} />
                <Paper
                  elevation={1}
                  sx={{ px: 2, py: 1.2, borderRadius: "18px 18px 18px 4px", bgcolor: "#fff" }}
                >
                  <CircularProgress size={16} />
                </Paper>
              </Box>
            )}
            <div ref={bottomRef} />
          </Box>

          {/* ── Error ── */}
          {error && (
            <Alert severity="error" onClose={() => setError("")} sx={{ mx: 2, mb: 1 }}>
              {error}
            </Alert>
          )}

          <Divider />

          {/* ── Input ── */}
          <Box sx={{ px: 2, py: 1.5, display: "flex", gap: 1, bgcolor: "#fff" }}>
            <TextField
              inputRef={inputRef}
              fullWidth
              size="small"
              placeholder="Type a message..."
              value={input}
              autoFocus
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              disabled={loading}
              sx={{ "& .MuiOutlinedInput-root": { borderRadius: 3 } }}
            />
            <Tooltip title="Send (Enter)">
              <span>
                <IconButton
                  color="primary"
                  onClick={sendMessage}
                  disabled={loading || !input.trim()}
                  sx={{
                    bgcolor: "primary.main",
                    color: "#fff",
                    borderRadius: 2,
                    "&:hover": { bgcolor: "primary.dark" },
                    "&.Mui-disabled": { bgcolor: "grey.300", color: "grey.500" },
                  }}
                >
                  <SendIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
          </Box>

          {/* ── Footer links ── */}
          <Box sx={{ textAlign: "center", pb: 1.5, bgcolor: "#fff" }}>
            <Typography variant="caption" color="text.secondary">
              Or use the{" "}
              <Link component={RouterLink} to="/login">
                classic login
              </Link>{" "}
              ·{" "}
              <Link component={RouterLink} to="/register">
                register
              </Link>
            </Typography>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
}
