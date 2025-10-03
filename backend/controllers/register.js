const bcrypt = require("bcrypt");
const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.POSTGRESQL_DB_URL,
  ssl: {
    rejectUnauthorized: false, // allows self-signed certs
  },
});

const registerUser = async (req, res) => {
    const { fullName, mobile, email, password, gender, wantsUpdates } = req.body;

    if (!fullName || !mobile || !password) {
        return res.status(400).json({ message: "Full Name, Mobile, and Password are required" });
    }

    try {
        // Check if the user already exists (by mobile or email)
        const existingUser = await pool.query(
            "SELECT * FROM users WHERE mobile = $1 OR email = $2",
            [mobile, email]
        );

        if (existingUser.rows.length > 0) {
            return res.status(409).json({ message: "User already exists" });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Save user in DB
        await pool.query(
            `INSERT INTO users (fullname, mobile, email, password, gender, wants_updates) 
   VALUES ($1, $2, $3, $4, $5, $6)`,
            [fullName, mobile, email, hashedPassword, gender, wantsUpdates]
        );

        res.status(201).json({ message: "User registered successfully" });
    } catch (error) {
        console.error("Error registering user:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

module.exports = { registerUser };
