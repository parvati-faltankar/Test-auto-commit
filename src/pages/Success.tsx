import { useNavigate } from "react-router-dom";
import { Box, Button, Paper, Typography, Container } from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { logout } from "../utils/auth";
import Chatbot from "../components/Chatbot";

export default function Success() {
  const navigate = useNavigate();

  return (
    <Box
      sx={{
        minHeight: "100vh",
        py: 4,
        px: 2,
        bgcolor: "grey.100",
      }}
    >
      <Container maxWidth="lg">
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
            gap: 3,
          }}
        >
          {/* Welcome Card */}
          <Paper elevation={3} sx={{ p: 4, borderRadius: 3, textAlign: "center" }}>
            <CheckCircleIcon sx={{ fontSize: 72, color: "success.main", mb: 2 }} />
            <Typography variant="h4" sx={{ fontWeight: 700 }} gutterBottom>
              Login Successfully
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              You are now logged in. Welcome! Use the assistant on the right to navigate the app.
            </Typography>
            <Button
              variant="outlined"
              onClick={() => {
                logout();
                navigate("/login");
              }}
            >
              Logout
            </Button>
          </Paper>

          {/* Chatbot */}
          <Chatbot />
        </Box>
      </Container>
    </Box>
  );
}
