import { useNavigate } from "react-router-dom";
import { Box, Button, Container, Paper, Typography } from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { logout } from "../utils/auth";

export default function Success() {
  const navigate = useNavigate();

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
        <Paper elevation={3} sx={{ p: 5, borderRadius: 3, textAlign: "center" }}>
          <CheckCircleIcon sx={{ fontSize: 72, color: "success.main", mb: 2 }} />
          <Typography variant="h4" sx={{ fontWeight: 700 }} gutterBottom>
            Login Successfully
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            You are now logged in. Welcome!
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
      </Container>
    </Box>
  );
}
