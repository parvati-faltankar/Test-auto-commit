import { useState } from "react";
import {
  Box,
  Container,
  Paper,
  Typography,
  Avatar,
  Button,
  TextField,
  Divider,
  Stack,
  Alert,
  Chip,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import SaveIcon from "@mui/icons-material/Save";
import CancelIcon from "@mui/icons-material/Cancel";
import PersonIcon from "@mui/icons-material/Person";
import PhoneAndroidIcon from "@mui/icons-material/PhoneAndroid";
import { useAuth } from "../context/AuthContext";
import { getToken } from "../utils/auth";

const API = "http://localhost:5000/api";

export default function Profile() {
  const { user, updateUser } = useAuth();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ username: user?.username ?? "", mobile: user?.mobile ?? "" });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleEdit = () => {
    setForm({ username: user?.username ?? "", mobile: user?.mobile ?? "" });
    setMessage(null);
    setEditing(true);
  };

  const handleCancel = () => {
    setEditing(false);
    setMessage(null);
  };

  const handleSave = async () => {
    if (!form.username.trim() || form.username.length < 3) {
      setMessage({ type: "error", text: "Username must be at least 3 characters." });
      return;
    }
    if (!/^\d{10}$/.test(form.mobile)) {
      setMessage({ type: "error", text: "Mobile must be a valid 10-digit number." });
      return;
    }

    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`${API}/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ newUsername: form.username, newMobile: form.mobile }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      updateUser({ username: form.username, mobile: form.mobile });
      setEditing(false);
      setMessage({ type: "success", text: "Profile updated successfully!" });
    } catch (err: unknown) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Update failed." });
    } finally {
      setSaving(false);
    }
  };

  const initial = user?.username?.[0]?.toUpperCase() ?? "U";

  return (
    <Box
      sx={{
        minHeight: "100vh",
        pt: "80px",
        pb: 4,
        px: 2,
        background:
          "radial-gradient(circle at 0% 0%, #f5deb3 0%, rgba(245,222,179,0) 42%), radial-gradient(circle at 100% 100%, #cde8d5 0%, rgba(205,232,213,0) 48%), linear-gradient(135deg, #fdf7ed 0%, #f3f7ff 100%)",
      }}
    >
      <Container maxWidth="sm">
        <Paper
          elevation={0}
          sx={{
            borderRadius: 4,
            border: "1px solid rgba(23,36,28,0.12)",
            boxShadow: "0 18px 55px rgba(30,40,55,0.12)",
            backgroundColor: "rgba(255,255,255,0.9)",
            backdropFilter: "blur(10px)",
            overflow: "hidden",
          }}
        >
          {/* Header band */}
          <Box
            sx={{
              background: "linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)",
              p: 4,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 1.5,
            }}
          >
            <Avatar
              sx={{
                width: 80,
                height: 80,
                fontSize: 34,
                fontWeight: 700,
                bgcolor: "#1d4ed8",
                border: "3px solid rgba(255,255,255,0.25)",
                boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
              }}
            >
              {initial}
            </Avatar>
            <Typography variant="h5" sx={{ fontWeight: 800, color: "#f8fafc" }}>
              {user?.username}
            </Typography>
            <Chip
              label="Registered User"
              size="small"
              sx={{ bgcolor: "rgba(255,255,255,0.12)", color: "#cbd5e1", fontWeight: 600 }}
            />
          </Box>

          {/* Body */}
          <Box sx={{ p: { xs: 3, sm: 4 } }}>
            {message && (
              <Alert severity={message.type} sx={{ mb: 3, borderRadius: 2 }} onClose={() => setMessage(null)}>
                {message.text}
              </Alert>
            )}

            <Stack spacing={2.5}>
              {/* Username field */}
              <Box>
                <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 1 }}>
                  <PersonIcon sx={{ fontSize: 18, color: "text.secondary" }} />
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}
                  >
                    Username
                  </Typography>
                </Stack>
                {editing ? (
                  <TextField
                    value={form.username}
                    onChange={(e) => setForm({ ...form, username: e.target.value })}
                    fullWidth
                    size="small"
                    sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
                  />
                ) : (
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>
                    {user?.username}
                  </Typography>
                )}
              </Box>

              <Divider />

              {/* Mobile field */}
              <Box>
                <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 1 }}>
                  <PhoneAndroidIcon sx={{ fontSize: 18, color: "text.secondary" }} />
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}
                  >
                    Mobile Number
                  </Typography>
                </Stack>
                {editing ? (
                  <TextField
                    value={form.mobile}
                    onChange={(e) => setForm({ ...form, mobile: e.target.value })}
                    fullWidth
                    size="small"
                    slotProps={{ htmlInput: { maxLength: 10 } }}
                    sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
                  />
                ) : (
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>
                    {user?.mobile}
                  </Typography>
                )}
              </Box>
            </Stack>

            {/* Action buttons */}
            <Box sx={{ mt: 4, display: "flex", gap: 2, justifyContent: "flex-end" }}>
              {editing ? (
                <>
                  <Button
                    variant="outlined"
                    startIcon={<CancelIcon />}
                    onClick={handleCancel}
                    sx={{ borderRadius: 2, textTransform: "none" }}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="contained"
                    startIcon={<SaveIcon />}
                    onClick={handleSave}
                    disabled={saving}
                    sx={{
                      borderRadius: 2,
                      textTransform: "none",
                      fontWeight: 700,
                      background: "linear-gradient(135deg, #0f172a 0%, #1d4ed8 100%)",
                    }}
                  >
                    {saving ? "Saving..." : "Save Changes"}
                  </Button>
                </>
              ) : (
                <Button
                  variant="contained"
                  startIcon={<EditIcon />}
                  onClick={handleEdit}
                  sx={{
                    borderRadius: 2,
                    textTransform: "none",
                    fontWeight: 700,
                    background: "linear-gradient(135deg, #0f172a 0%, #1d4ed8 100%)",
                    boxShadow: "0 6px 16px rgba(29,78,216,0.3)",
                  }}
                >
                  Edit Profile
                </Button>
              )}
            </Box>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
}
