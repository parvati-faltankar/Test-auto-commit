import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AppBar,
  Toolbar,
  Typography,
  Avatar,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Box,
} from "@mui/material";
import PersonIcon from "@mui/icons-material/Person";
import LogoutIcon from "@mui/icons-material/Logout";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import { useAuth } from "../context/AuthContext";

export default function Header() {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  if (!isAuthenticated) return null;

  const initial = user?.username?.[0]?.toUpperCase() ?? "U";

  const handleClose = () => setAnchorEl(null);

  const handleLogout = () => {
    handleClose();
    logout();
    navigate("/login");
  };

  return (
    <AppBar
      position="fixed"
      elevation={0}
      sx={{
        background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
        zIndex: (theme) => theme.zIndex.drawer + 1,
      }}
    >
      <Toolbar sx={{ justifyContent: "space-between", px: { xs: 2, sm: 3 } }}>
        {/* Logo */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Box
            sx={{
              width: 32,
              height: 32,
              borderRadius: "10px",
              bgcolor: "#fef9c3",
              display: "grid",
              placeItems: "center",
            }}
          >
            <LockOutlinedIcon sx={{ fontSize: 18, color: "#0f172a" }} />
          </Box>
          <Typography
            variant="h6"
            sx={{ fontWeight: 800, color: "#f8fafc", letterSpacing: "0.02em" }}
          >
            AuthApp
          </Typography>
        </Box>

        {/* Profile icon */}
        <Box>
          <IconButton
            onClick={(e) => setAnchorEl(e.currentTarget)}
            sx={{
              p: 0.5,
              border: "2px solid rgba(255,255,255,0.2)",
              borderRadius: "50%",
              transition: "border-color 0.2s",
              "&:hover": { borderColor: "rgba(255,255,255,0.5)" },
            }}
          >
            <Avatar
              sx={{
                width: 36,
                height: 36,
                bgcolor: "#1d4ed8",
                fontSize: 16,
                fontWeight: 700,
              }}
            >
              {initial}
            </Avatar>
          </IconButton>

          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleClose}
            transformOrigin={{ horizontal: "right", vertical: "top" }}
            anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
            slotProps={{
              paper: {
                elevation: 4,
                sx: {
                  mt: 1,
                  minWidth: 180,
                  borderRadius: 2,
                  overflow: "visible",
                  "&::before": {
                    content: '""',
                    display: "block",
                    position: "absolute",
                    top: 0,
                    right: 16,
                    width: 10,
                    height: 10,
                    bgcolor: "background.paper",
                    transform: "translateY(-50%) rotate(45deg)",
                    zIndex: 0,
                  },
                },
              },
            }}
          >
            <Box sx={{ px: 2, py: 1, borderBottom: "1px solid rgba(0,0,0,0.08)" }}>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                {user?.username}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {user?.mobile}
              </Typography>
            </Box>

            <MenuItem
              onClick={() => {
                handleClose();
                navigate("/profile");
              }}
              sx={{ mt: 0.5 }}
            >
              <ListItemIcon>
                <PersonIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>View Profile</ListItemText>
            </MenuItem>

            <MenuItem onClick={handleLogout} sx={{ color: "error.main" }}>
              <ListItemIcon>
                <LogoutIcon fontSize="small" color="error" />
              </ListItemIcon>
              <ListItemText>Logout</ListItemText>
            </MenuItem>
          </Menu>
        </Box>
      </Toolbar>
    </AppBar>
  );
}
