// backend/controllers/login.js
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const loginUser = async (req, res) => {
  const { mobileOrEmail, password } = req.body;

  if (!mobileOrEmail || !password) {
    return res.status(400).json({ message: "Mobile/Email and Password are required" });
  }

  // get the pool initialized in server.js
  const pool = req.app && req.app.locals && req.app.locals.pool;
  if (!pool) {
    console.error("Postgres pool not found on app.locals.pool");
    return res.status(500).json({ message: "Database not configured" });
  }

  try {
    // Find user by mobile or email
    const result = await pool.query(
      "SELECT * FROM users WHERE mobile = $1 OR email = $1",
      [mobileOrEmail]
    );

    const user = result.rows[0];

    if (!user) return res.status(401).json({ message: "Invalid credentials" });

    // Compare password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) return res.status(401).json({ message: "Invalid credentials" });

    // Generate JWT
    const token = jwt.sign(
      { id: user.id, fullName: user.full_name, mobile: user.mobile },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    // return token and (sanitized) user info if you want
    const safeUser = {
      id: user.id,
      fullName: user.full_name,
      email: user.email,
      mobile: user.mobile,
    };

    res.status(200).json({ message: "Login successful", token, user: safeUser });
  } catch (error) {
    console.error("Error logging in user:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = { loginUser };
