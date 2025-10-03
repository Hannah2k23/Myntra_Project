import React from "react";
import { Link } from "react-router-dom";
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

export default function Header() {
  return (
    <AppBar
      position="static"
      color="inherit"
      elevation={1}
      sx={{ borderBottom: "1px solid #eee" }}
    >
      <Toolbar sx={{ minHeight: 70, px: 2 }}>
        {/* Logo */}
        <Box sx={{ display: "flex", alignItems: "center", mr: 3 }}>
          <img
            src="/logo.jpg"
            alt="Myntra"
            style={{ height: 75, marginRight: 8 }}
          />
          {/* <Typography
            variant="h6"
            sx={{ fontWeight: 700, color: "#ff3f6c", letterSpacing: 1 }}
          >
            Myntra
          </Typography> */}
        </Box>

        {/* Navigation Links */}
        <Box sx={{ display: { xs: "none", md: "flex" }, gap: 2, mr: 3 }}>
          {navLinks.map((link) => (
            <Button
              key={link}
              sx={{
                color: "#282c3f",
                fontWeight: 500,
                textTransform: "none",
                fontSize: 16,
              }}
            >
              {link}
            </Button>
          ))}{/* Add Complete My Look button */}
          <Button
            component={Link}
            to="/complete-my-look"
            sx={{
              color: "#ff3f6c",
              fontWeight: 600,
              textTransform: "none",
              fontSize: 16,
            }}
          >
            Complete My Look
          </Button>
        </Box>

        {/* Search Bar */}
        <Box sx={{ flexGrow: 1, mx: 2, maxWidth: 400 }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              background: "#f5f5f6",
              borderRadius: 2,
              px: 2,
              py: 0.5,
            }}
          >
            <SearchIcon sx={{ color: "#696e79", mr: 1 }} />
            <InputBase
              placeholder="Search for products, brands and more"
              sx={{ width: "100%", fontSize: 15 }}
            />
          </Box>
        </Box>

        {/* Icons: Profile, Wishlist, Cart */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 3 }}>
          <Box sx={{ textAlign: "center" }}>
            <IconButton>
              <PersonOutlineIcon sx={{ color: "#282c3f" }} />
            </IconButton>
            <Typography
              variant="caption"
              sx={{ display: "block", fontSize: 12 }}
            >
              Profile
            </Typography>
          </Box>
          <Box sx={{ textAlign: "center" }}>
            <IconButton>
              <FavoriteBorderIcon sx={{ color: "#282c3f" }} />
            </IconButton>
            <Typography
              variant="caption"
              sx={{ display: "block", fontSize: 12 }}
            >
              Wishlist
            </Typography>
          </Box>
          <Box sx={{ textAlign: "center" }}>
            <IconButton>
              <ShoppingCartIcon sx={{ color: "#282c3f" }} />
            </IconButton>
            <Typography
              variant="caption"
              sx={{ display: "block", fontSize: 12 }}
            >
              Cart
            </Typography>
          </Box>
        </Box>
      </Toolbar>
    </AppBar>
  );
}
