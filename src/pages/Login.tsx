import { useState } from "react";
import { useNavigate, Link as RouterLink } from "react-router-dom";
import {
  Box,
  Button,
  Container,
  TextField,
  Typography,
  Alert,
  Paper,
  Tabs,
  Tab,
  Link,
  Divider,
} from "@mui/material";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import PhoneAndroidIcon from "@mui/icons-material/PhoneAndroid";
import { loginWithUsername, sendOtp, verifyOtp } from "../utils/auth";

type OtpStep = "mobile" | "otp";


export default function Login() {
  const navigate = useNavigate();
  const [tab, setTab] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Username/password state
  const [credentials, setCredentials] = useState({ username: "", password: "" });

  // OTP state
  const [mobile, setMobile] = useState("");
  const [otp, setOtp] = useState("");
  const [otpStep, setOtpStep] = useState<OtpStep>("mobile");

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setTab(newValue);
    setError("");
  };

  // --- Username/Password Login ---
  const handleUsernameLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError("");
      await loginWithUsername(credentials.username, credentials.password);
      navigate("/success");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed.");
    } finally {
      setLoading(false);
    }
  };

  // --- OTP Login ---
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{10}$/.test(mobile)) {
      setError("Enter a valid 10-digit mobile number.");
      return;
    }
    try {
      setLoading(true);
      setError("");
      const res = await sendOtp(mobile);
      // Dev only: show OTP from response (remove in production)
      if (res.otp) alert(`Your OTP is: ${res.otp}`);
      setOtpStep("otp");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to send OTP.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError("");
      await verifyOtp(mobile, otp);
      navigate("/success");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "OTP verification failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background:
          "radial-gradient(circle at 0% 0%, #f5deb3 0%, rgba(245, 222, 179, 0) 42%), radial-gradient(circle at 100% 100%, #cde8d5 0%, rgba(205, 232, 213, 0) 48%), linear-gradient(135deg, #fdf7ed 0%, #f3f7ff 100%)",
      }}
    >
      <Container maxWidth="xs" sx={{ position: "relative", px: 2, py: { xs: 4, md: 8 } }}>
        <Paper
          elevation={0}
          sx={{
            p: { xs: 3, sm: 4 },
            borderRadius: 4,
            border: "1px solid rgba(23, 36, 28, 0.12)",
            boxShadow: "0 18px 55px rgba(30, 40, 55, 0.15)",
            backgroundColor: "rgba(255, 255, 255, 0.86)",
            backdropFilter: "blur(10px)",
            animation: "cardRise 450ms ease-out",
            "@keyframes cardRise": {
              from: { opacity: 0, transform: "translateY(18px) scale(0.98)" },
              to: { opacity: 1, transform: "translateY(0) scale(1)" },
            },
          }}
        >
          <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", mb: 3 }}>
            <Box
              sx={{
                width: 68,
                height: 68,
                borderRadius: "22px",
                display: "grid",
                placeItems: "center",
                background: "linear-gradient(135deg, #111827 0%, #374151 100%)",
                boxShadow: "0 10px 24px rgba(17, 24, 39, 0.35)",
                mb: 1.5,
              }}
            >
              <LockOutlinedIcon sx={{ fontSize: 34, color: "#fef9c3" }} />
            </Box>
            <Typography variant="h5" sx={{ fontWeight: 800, letterSpacing: "0.02em", fontFamily: '"Poppins", "Segoe UI", sans-serif' }}>
              Welcome Back
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center", maxWidth: 240 }}>
              Login to your account
            </Typography>
          </Box>

          <Tabs
            value={tab}
            onChange={handleTabChange}
            variant="fullWidth"
            sx={{
              mb: 3,
              p: 0.5,
              borderRadius: 2.5,
              bgcolor: "rgba(17, 24, 39, 0.05)",
              "& .MuiTabs-indicator": { display: "none" },
            }}
          >
            <Tab label="Username & Password" />
            <Tab
              label="Mobile OTP"
              icon={<PhoneAndroidIcon fontSize="small" />}
              iconPosition="start"
              sx={{
                borderRadius: 2,
                minHeight: 40,
                textTransform: "none",
                fontWeight: 700,
                "&.Mui-selected": {
                  bgcolor: "#0f172a",
                  color: "#f8fafc",
                },
              }}
            />
          </Tabs>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {/* Tab 1: Username & Password */}
          {tab === 0 && (
            <Box component="form" onSubmit={handleUsernameLogin} sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <TextField
                label="Username"
                value={credentials.username}
                onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
                fullWidth
                required
                autoComplete="username"
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: 2.5,
                    bgcolor: "rgba(255, 255, 255, 0.9)",
                  },
                }}
              />
              <TextField
                label="Password"
                type="password"
                value={credentials.password}
                onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                fullWidth
                required
                autoComplete="current-password"
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: 2.5,
                    bgcolor: "rgba(255, 255, 255, 0.9)",
                  },
                }}
              />
              <Button
                type="submit"
                variant="contained"
                size="large"
                fullWidth
                disabled={loading}
                sx={{
                  mt: 0.5,
                  borderRadius: 2.5,
                  py: 1.3,
                  fontWeight: 700,
                  textTransform: "none",
                  background: "linear-gradient(135deg, #0f172a 0%, #1d4ed8 100%)",
                  boxShadow: "0 10px 20px rgba(29, 78, 216, 0.35)",
                }}
              >
                {loading ? "Logging in..." : "Login"}
              </Button>
            </Box>
          )}

          {/* Tab 2: Mobile OTP */}
          {tab === 1 && (
            <>
              {otpStep === "mobile" ? (
                <Box component="form" onSubmit={handleSendOtp} sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <TextField
                    label="Mobile Number"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    fullWidth
                    required
                    slotProps={{ htmlInput: { maxLength: 10 } }}
                    helperText="Registered 10-digit mobile number"
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        borderRadius: 2.5,
                        bgcolor: "rgba(255, 255, 255, 0.9)",
                      },
                    }}
                  />
                  <Button
                    type="submit"
                    variant="contained"
                    size="large"
                    fullWidth
                    disabled={loading}
                    sx={{
                      borderRadius: 2.5,
                      py: 1.3,
                      fontWeight: 700,
                      textTransform: "none",
                      background: "linear-gradient(135deg, #14532d 0%, #16a34a 100%)",
                      boxShadow: "0 10px 20px rgba(22, 163, 74, 0.3)",
                    }}
                  >
                    {loading ? "Sending..." : "Send OTP"}
                  </Button>
                </Box>
              ) : (
                <Box component="form" onSubmit={handleVerifyOtp} sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    align="center"
                    sx={{ p: 1.2, borderRadius: 2, bgcolor: "rgba(15, 23, 42, 0.06)" }}
                  >
                    OTP sent to <strong>{mobile}</strong> (check the alert)
                  </Typography>
                  <TextField
                    label="Enter OTP"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    fullWidth
                    required
                    slotProps={{ htmlInput: { maxLength: 4 } }}
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        borderRadius: 2.5,
                        bgcolor: "rgba(255, 255, 255, 0.9)",
                      },
                    }}
                  />
                  <Button
                    type="submit"
                    variant="contained"
                    size="large"
                    fullWidth
                    disabled={loading}
                    sx={{
                      borderRadius: 2.5,
                      py: 1.3,
                      fontWeight: 700,
                      textTransform: "none",
                      background: "linear-gradient(135deg, #7c2d12 0%, #ea580c 100%)",
                      boxShadow: "0 10px 20px rgba(234, 88, 12, 0.3)",
                    }}
                  >
                    {loading ? "Verifying..." : "Verify OTP"}
                  </Button>
                  <Button
                    variant="text"
                    size="small"
                    onClick={() => { setOtpStep("mobile"); setError(""); setOtp(""); }}
                    sx={{ textTransform: "none", fontWeight: 600 }}
                  >
                    Change Number
                  </Button>
                </Box>
              )}
            </>
          )}

          <Divider sx={{ my: 2.5, borderColor: "rgba(17, 24, 39, 0.12)" }} />

          <Typography variant="body2" align="center" sx={{ color: "text.secondary" }}>
            Don't have an account?{" "}
            <Link component={RouterLink} to="/register" sx={{ fontWeight: 700, color: "#1d4ed8" }}>
              Register
            </Link>
          </Typography>
        </Paper>
      </Container>
    </Box>
  );
}
