import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, ShoppingBag, Heart } from "lucide-react";

const apiUrl = import.meta.env.VITE_BACKEND_URL
const MyntraLoginPage = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    mobileOrEmail: "",
    password: "",
  });
  const [focusedField, setFocusedField] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(`${apiUrl}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Login failed");
      } else {
        setSuccess("Login successful!");
        localStorage.setItem("token", data.token);
        navigate("/");
      }
    } catch (err) {
      setError("Server error. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="myntra-login-page">
      <div className="login-left">
        <div className="logo-row">
          <ShoppingBag className="icon-shop" strokeWidth={2.5} />
          <h1 className="brand-title">Myntra</h1>
        </div>

        {/* Tabs */}
        <div className="tabs" role="tablist" aria-label="Auth tabs">
          <button
            onClick={() => navigate("/login")}
            className="tab-btn active"
            role="tab"
            aria-selected={true}
          >
            LOGIN
          </button>
          <button
            onClick={() => navigate("/register")}
            className="tab-btn"
            role="tab"
            aria-selected={false}
          >
            SIGNUP
          </button>
        </div>

        {/* Login Form */}
        <form className="auth-form" onSubmit={handleSubmit} aria-labelledby="login-form">
          <div className="form-group">
            <input
              type="text"
              value={formData.mobileOrEmail}
              onChange={(e) => handleInputChange("mobileOrEmail", e.target.value)}
              onFocus={() => setFocusedField("mobileOrEmail")}
              onBlur={() => setFocusedField("")}
              className={`input ${focusedField === "mobileOrEmail" ? "input-focused" : ""}`}
              placeholder="Mobile Number* or Email ID"
              aria-label="Mobile or Email"
            />
          </div>

          <div className="form-group password-group">
            <input
              type={showPassword ? "text" : "password"}
              value={formData.password}
              onChange={(e) => handleInputChange("password", e.target.value)}
              onFocus={() => setFocusedField("password")}
              onBlur={() => setFocusedField("")}
              className={`input ${focusedField === "password" ? "input-focused" : ""}`}
              placeholder="Password*"
              aria-label="Password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="show-pass-btn"
              aria-label="Toggle password visibility"
            >
              {showPassword ? <EyeOff className="eye-icon" /> : <Eye className="eye-icon" />}
            </button>
          </div>

          <div style={{ textAlign: "right" }}>
            <button type="button" className="link-btn">
              Forgot Password?
            </button>
          </div>

          {/* Error / Success */}
          {error && <p style={{ color: "red" }}>{error}</p>}
          {success && <p style={{ color: "green" }}>{success}</p>}

          <button type="submit" className="primary-btn" disabled={loading}>
            {loading ? "Logging in..." : "LOGIN"}
          </button>

          <div className="divider" aria-hidden>
            <div className="hr" />
            <span className="or-text">OR</span>
            <div className="hr" />
          </div>

          <button type="button" className="secondary-btn">
            Request OTP
          </button>
        </form>

        <div className="trouble">
          <p>
            Have trouble logging in? <button className="link-btn-inline">Get help</button>
          </p>
        </div>
      </div>

      {/* Right Marketing Card */}
      <div className="login-right" aria-hidden={false}>
        <div className="marketing-card">
          <div className="marketing-top">
            <div className="logo-circle">
              <ShoppingBag className="brand-icon" strokeWidth={2} />
            </div>
            <div className="small-badge">
              <Heart className="heart-icon" />
            </div>
          </div>

          <h2 className="marketing-title">Login to Myntra</h2>
          <p className="marketing-sub">Shop from millions of fashion & lifestyle products</p>

          <div className="marketing-list">
            <div className="marketing-item">
              <span className="dot" />
              <p>Get access to your Orders, Wishlist and Recommendations</p>
            </div>
            <div className="marketing-item">
              <span className="dot" />
              <p>Enjoy special offers and exclusive deals</p>
            </div>
            <div className="marketing-item">
              <span className="dot" />
              <p>Faster checkout with saved addresses</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MyntraLoginPage;
