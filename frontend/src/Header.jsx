import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  AppBar,
  Toolbar,
  Typography,
  InputBase,
  IconButton,
  Box,
  Button,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";

const navLinks = ["Men", "Women", "Kids", "Home", "Beauty", "GenZ", "Studio"];
const apiUrl = import.meta.env.VITE_BACKEND_URL

export default function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  // Check login on mount or route change
  useEffect(() => {
    const token = localStorage.getItem("token") || localStorage.getItem("jwt") || localStorage.getItem("access_token");
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        setUser({ email: payload.email, name: payload.name });
      } catch (e) {
        setUser(null);
      }
    } else {
      setUser(null);
    }
  }, [location]);

  // Logout function
  const handleLogout = async () => {
    try {
      const token = localStorage.getItem("token") || localStorage.getItem("jwt") || localStorage.getItem("access_token");
      
      // Optional: call backend logout to invalidate token
      if (token) {
        await fetch(`${apiUrl}/api/auth/logout`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
      }

      // Remove all tokens locally
      localStorage.removeItem("token");
      localStorage.removeItem("jwt");
      localStorage.removeItem("access_token");

      setUser(null);

      // Redirect to homepage
      navigate("/");
    } catch (err) {
      console.error("Logout failed:", err);
      alert("Failed to logout. Try again.");
    }
  };

  // Hide header on login/register page
  if (location.pathname === "/login" || location.pathname === "/register") return null;

  return (
    <AppBar position="static" color="inherit" elevation={1} sx={{ borderBottom: "1px solid #eee" }}>
      <Toolbar sx={{ minHeight: 70, px: 2 }}>
        {/* Logo */}
        <Box sx={{ display: "flex", alignItems: "center", mr: 3 }}>
          <img src="/logo.jpg" alt="Myntra" style={{ height: 75, marginRight: 8 }} />
        </Box>

        {/* Navigation Links */}
        <Box sx={{ display: { xs: "none", md: "flex" }, gap: 2, mr: 3 }}>
          {navLinks.map((link) => (
            <Button key={link} sx={{ color: "#282c3f", fontWeight: 500, textTransform: "none", fontSize: 16 }}>
              {link}
            </Button>
          ))}
          <Button
            component={Link}
            to={user ? "/complete-my-look" : "/login"} // redirect to login if not logged in
            sx={{ color: "#ff3f6c", fontWeight: 600, textTransform: "none", fontSize: 16 }}
          >
            Complete My Look
          </Button>
        </Box>

        {/* Search Bar */}
        <Box sx={{ flexGrow: 1, mx: 2, maxWidth: 400 }}>
          <Box sx={{ display: "flex", alignItems: "center", background: "#f5f5f6", borderRadius: 2, px: 2, py: 0.5 }}>
            <SearchIcon sx={{ color: "#696e79", mr: 1 }} />
            <InputBase placeholder="Search for products, brands and more" sx={{ width: "100%", fontSize: 15 }} />
          </Box>
        </Box>

        {/* Icons */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 3 }}>
          {/* Profile */}
          <Box sx={{ textAlign: "center" }}>
            {user ? (
              <>
                <IconButton onClick={handleLogout}>
                  <PersonOutlineIcon sx={{ color: "#282c3f" }} />
                </IconButton>
                <Typography variant="caption" sx={{ display: "block", fontSize: 12 }}>
                  Logout
                </Typography>
              </>
            ) : (
              <>
                <IconButton onClick={() => navigate("/login")}>
                  <PersonOutlineIcon sx={{ color: "#282c3f" }} />
                </IconButton>
                <Typography variant="caption" sx={{ display: "block", fontSize: 12 }}>
                  Login
                </Typography>
              </>
            )}
          </Box>

          {/* Wishlist */}
          <Box sx={{ textAlign: "center" }}>
            <IconButton>
              <FavoriteBorderIcon sx={{ color: "#282c3f" }} />
            </IconButton>
            <Typography variant="caption" sx={{ display: "block", fontSize: 12 }}>
              Wishlist
            </Typography>
          </Box>

          {/* Cart */}
          <Box sx={{ textAlign: "center" }}>
            <IconButton>
              <ShoppingCartIcon sx={{ color: "#282c3f" }} />
            </IconButton>
            <Typography variant="caption" sx={{ display: "block", fontSize: 12 }}>
              Cart
            </Typography>
          </Box>
        </Box>
      </Toolbar>
    </AppBar>
  );
}
