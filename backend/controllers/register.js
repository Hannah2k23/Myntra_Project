// backend/controllers/register.js
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken"); // optional, only used when JWT_SECRET present

const registerUser = async (req, res) => {
  const {
    fullName,   // frontend uses camelCase; DB column is `fullname`
    mobile,
    email,
    password,
    gender,
    wantsUpdates, // frontend boolean
  } = req.body;

  // DB schema requires fullname, email, password (email and fullname are NOT NULL)
  if (!fullName || !email || !password) {
    return res.status(400).json({
      message: "fullname, email and password are required",
    });
  }

  // get the pg Pool from app.locals (as you already do)
  const pool = req.app && req.app.locals && req.app.locals.pool;
  if (!pool) {
    console.error("Postgres pool not found on app.locals.pool");
    return res.status(500).json({ message: "Database not configured" });
  }

  try {
    // Normalize wants_updates boolean (DB column: wants_updates)
    const wants_updates = !!wantsUpdates;

    // Check if mobile or email already exists
    const { rows: existing } = await pool.query(
      `SELECT user_id, mobile, email
       FROM users
       WHERE mobile = $1 OR email = $2
       LIMIT 1`,
      [mobile ?? null, email ?? null]
    );

    if (existing.length > 0) {
      const conflict =
        existing[0].mobile === mobile ? "mobile" :
        existing[0].email === email ? "email" : "credentials";
      return res.status(409).json({ message: `User with this ${conflict} already exists` });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Insert user using DB column names exactly and RETURN the inserted row
    const insertQuery = `
      INSERT INTO users (fullname, mobile, email, password, gender, wants_updates, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, now())
      RETURNING user_id, fullname, email, mobile, gender, wants_updates, created_at;
    `;
    const insertValues = [
      fullName,
      mobile ?? null,
      email,
      hashedPassword,
      gender ?? null,
      wants_updates,
    ];

    const { rows } = await pool.query(insertQuery, insertValues);
    const newUser = rows[0];

    // Build safe user object
    const safeUser = {
      user_id: newUser.user_id,
      fullname: newUser.fullname,
      email: newUser.email,
      mobile: newUser.mobile,
      gender: newUser.gender,
      wants_updates: newUser.wants_updates,
      created_at: newUser.created_at,
    };

    // Optionally sign a JWT if JWT_SECRET exists
    let token = null;
    const secret = process.env.JWT_SECRET;
    if (secret) {
      token = jwt.sign(
        { userId: newUser.user_id, email: newUser.email },
        secret,
        { expiresIn: "7d" }
      );
    }

    return res.status(201).json({ message: "User registered", user: safeUser, token });
  } catch (err) {
    console.error("Error registering user:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = { registerUser };
