const express = require("express");
const { loginUser } = require("../controllers/login.js");
const { registerUser } = require("../controllers/register.js");

const authRoutes = express.Router();

// Route for user registration
authRoutes.post("/register", registerUser);

// Route for user login
authRoutes.post("/login", loginUser);

module.exports = authRoutes;
