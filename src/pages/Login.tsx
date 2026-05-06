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
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "grey.100",
      }}
    >
      <Container maxWidth="xs">
        <Paper elevation={3} sx={{ p: 4, borderRadius: 3 }}>
          <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", mb: 2 }}>
            <LockOutlinedIcon sx={{ fontSize: 48, color: "primary.main", mb: 1 }} />
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              Welcome Back
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Login to your account
            </Typography>
          </Box>

          <Tabs value={tab} onChange={handleTabChange} variant="fullWidth" sx={{ mb: 3 }}>
            <Tab label="Username & Password" />
            <Tab label="Mobile OTP" icon={<PhoneAndroidIcon fontSize="small" />} iconPosition="start" />
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
              />
              <TextField
                label="Password"
                type="password"
                value={credentials.password}
                onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                fullWidth
                required
                autoComplete="current-password"
              />
              <Button type="submit" variant="contained" size="large" fullWidth disabled={loading}>
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
                  />
                  <Button type="submit" variant="contained" size="large" fullWidth disabled={loading}>
                    {loading ? "Sending..." : "Send OTP"}
                  </Button>
                </Box>
              ) : (
                <Box component="form" onSubmit={handleVerifyOtp} sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <Typography variant="body2" color="text.secondary" align="center">
                    OTP sent to <strong>{mobile}</strong> (check the alert)
                  </Typography>
                  <TextField
                    label="Enter OTP"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    fullWidth
                    required
                    slotProps={{ htmlInput: { maxLength: 4 } }}
                  />
                  <Button type="submit" variant="contained" size="large" fullWidth disabled={loading}>
                    {loading ? "Verifying..." : "Verify OTP"}
                  </Button>
                  <Button
                    variant="text"
                    size="small"
                    onClick={() => { setOtpStep("mobile"); setError(""); setOtp(""); }}
                  >
                    Change Number
                  </Button>
                </Box>
              )}
            </>
          )}

          <Divider sx={{ my: 2 }} />

          <Typography variant="body2" align="center">
            Don't have an account?{" "}
            <Link component={RouterLink} to="/register">
              Register
            </Link>
          </Typography>
        </Paper>
      </Container>
    </Box>
  );
}
