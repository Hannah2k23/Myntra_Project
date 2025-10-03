import React, { useState } from "react";
import { Eye, EyeOff, ShoppingBag, Sparkles, Shield, Zap, CheckCircle2 } from "lucide-react";

const MyntraRegisterPage = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    mobile: "",
    email: "",
    password: "",
    confirmPassword: "",
    gender: "",
  });
  const [focusedField, setFocusedField] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [wantsUpdates, setWantsUpdates] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleInputChange = (field, value) =>
    setFormData((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async () => {
    if (!agreedToTerms) return;
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("http://localhost:4000/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, wantsUpdates }),
      });
      const data = await response.json();
      if (!response.ok) setError(data.message || "Registration failed");
      else {
        setSuccess("Registration successful! Please login.");
        setFormData({
          fullName: "",
          mobile: "",
          email: "",
          password: "",
          confirmPassword: "",
          gender: "",
        });
        setAgreedToTerms(false);
        setWantsUpdates(false);
      }
    } catch (err) {
      setError("Server error. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "40px 20px",
      position: "relative",
      overflow: "hidden"
    }}>
      {/* Animated background circles */}
      <div style={{
        position: "absolute",
        width: "500px",
        height: "500px",
        borderRadius: "50%",
        background: "rgba(255,255,255,0.1)",
        top: "-200px",
        right: "-200px",
        animation: "float 20s infinite ease-in-out"
      }} />
      <div style={{
        position: "absolute",
        width: "300px",
        height: "300px",
        borderRadius: "50%",
        background: "rgba(255,255,255,0.08)",
        bottom: "-100px",
        left: "-100px",
        animation: "float 15s infinite ease-in-out reverse"
      }} />

      <style>{`
        @keyframes float {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(30px, -30px) scale(1.1); }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
      `}</style>

      <div style={{
        width: "100%",
        maxWidth: "1100px",
        display: "flex",
        gap: "40px",
        alignItems: "stretch",
        position: "relative",
        zIndex: 1
      }}>
        {/* Main Form Card */}
        <div style={{
          flex: "1 1 600px",
          background: "rgba(255, 255, 255, 0.95)",
          backdropFilter: "blur(20px)",
          borderRadius: "24px",
          padding: "50px 45px",
          boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
          animation: "slideUp 0.6s ease-out"
        }}>
          {/* Logo */}
          <div style={{ 
            display: "flex", 
            alignItems: "center", 
            gap: "12px",
            marginBottom: "32px"
          }}>
            <div style={{
              width: "48px",
              height: "48px",
              borderRadius: "12px",
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}>
              <ShoppingBag size={28} color="#fff" strokeWidth={2.5} />
            </div>
            <h1 style={{ 
              fontSize: "32px", 
              fontWeight: "800", 
              margin: 0,
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent"
            }}>
              Myntra
            </h1>
          </div>

          {/* Header */}
          <div style={{ marginBottom: "36px" }}>
            <h2 style={{ 
              fontSize: "28px", 
              fontWeight: "700", 
              margin: "0 0 8px",
              color: "#1a1a1a"
            }}>
              Join the Community
            </h2>
            <p style={{ 
              color: "#666", 
              fontSize: "15px", 
              margin: 0,
              lineHeight: "1.5"
            }}>
              Create your account and unlock exclusive fashion deals ✨
            </p>
          </div>

          {/* Form Fields */}
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {/* Full Name */}
            <div>
              <input
                type="text"
                value={formData.fullName}
                onChange={(e) => handleInputChange("fullName", e.target.value)}
                onFocus={() => setFocusedField("fullName")}
                onBlur={() => setFocusedField("")}
                placeholder="Full Name"
                style={{
                  width: "100%",
                  padding: "16px 20px",
                  borderRadius: "12px",
                  border: focusedField === "fullName" ? "2px solid #667eea" : "2px solid #e5e7eb",
                  fontSize: "15px",
                  boxSizing: "border-box",
                  transition: "all 0.3s ease",
                  background: "#fff",
                  color: "#1a1a1a",
                  fontWeight: "500"
                }}
              />
            </div>

            {/* Mobile & Email in a row */}
            <div style={{ display: "flex", gap: "16px" }}>
              <input
                type="tel"
                value={formData.mobile}
                onChange={(e) => handleInputChange("mobile", e.target.value)}
                onFocus={() => setFocusedField("mobile")}
                onBlur={() => setFocusedField("")}
                placeholder="Mobile Number"
                maxLength={10}
                style={{
                  flex: 1,
                  padding: "16px 20px",
                  borderRadius: "12px",
                  border: focusedField === "mobile" ? "2px solid #667eea" : "2px solid #e5e7eb",
                  fontSize: "15px",
                  boxSizing: "border-box",
                  transition: "all 0.3s ease",
                  background: "#fff",
                  fontWeight: "500"
                }}
              />
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
                onFocus={() => setFocusedField("email")}
                onBlur={() => setFocusedField("")}
                placeholder="Email (optional)"
                style={{
                  flex: 1,
                  padding: "16px 20px",
                  borderRadius: "12px",
                  border: focusedField === "email" ? "2px solid #667eea" : "2px solid #e5e7eb",
                  fontSize: "15px",
                  boxSizing: "border-box",
                  transition: "all 0.3s ease",
                  background: "#fff",
                  fontWeight: "500"
                }}
              />
            </div>

            {/* Password Fields */}
            <div style={{ position: "relative" }}>
              <input
                type={showPassword ? "text" : "password"}
                value={formData.password}
                onChange={(e) => handleInputChange("password", e.target.value)}
                onFocus={() => setFocusedField("password")}
                onBlur={() => setFocusedField("")}
                placeholder="Create Password"
                style={{
                  width: "100%",
                  padding: "16px 20px",
                  paddingRight: "50px",
                  borderRadius: "12px",
                  border: focusedField === "password" ? "2px solid #667eea" : "2px solid #e5e7eb",
                  fontSize: "15px",
                  boxSizing: "border-box",
                  transition: "all 0.3s ease",
                  background: "#fff",
                  fontWeight: "500"
                }}
              />
              <button
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: "absolute",
                  right: "16px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: "4px"
                }}
              >
                {showPassword ? <EyeOff size={20} color="#999" /> : <Eye size={20} color="#999" />}
              </button>
            </div>

            <div style={{ position: "relative" }}>
              <input
                type={showConfirmPassword ? "text" : "password"}
                value={formData.confirmPassword}
                onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
                onFocus={() => setFocusedField("confirmPassword")}
                onBlur={() => setFocusedField("")}
                placeholder="Confirm Password"
                style={{
                  width: "100%",
                  padding: "16px 20px",
                  paddingRight: "50px",
                  borderRadius: "12px",
                  border: focusedField === "confirmPassword" ? "2px solid #667eea" : "2px solid #e5e7eb",
                  fontSize: "15px",
                  boxSizing: "border-box",
                  transition: "all 0.3s ease",
                  background: "#fff",
                  fontWeight: "500"
                }}
              />
              <button
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                style={{
                  position: "absolute",
                  right: "16px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: "4px"
                }}
              >
                {showConfirmPassword ? <EyeOff size={20} color="#999" /> : <Eye size={20} color="#999" />}
              </button>
            </div>

            {/* Gender Selection */}
            <div>
              <p style={{ margin: "0 0 12px", fontSize: "14px", fontWeight: "600", color: "#555" }}>
                Select Gender
              </p>
              <div style={{ display: "flex", gap: "12px" }}>
                {["Male", "Female"].map((gender) => (
                  <button
                    key={gender}
                    onClick={() => handleInputChange("gender", gender.toLowerCase())}
                    style={{
                      flex: 1,
                      padding: "14px",
                      borderRadius: "12px",
                      border: formData.gender === gender.toLowerCase() ? "2px solid #667eea" : "2px solid #e5e7eb",
                      background: formData.gender === gender.toLowerCase() 
                        ? "linear-gradient(135deg, rgba(102, 126, 234, 0.1), rgba(118, 75, 162, 0.1))"
                        : "#fff",
                      color: formData.gender === gender.toLowerCase() ? "#667eea" : "#666",
                      fontWeight: "600",
                      cursor: "pointer",
                      transition: "all 0.3s ease",
                      fontSize: "15px"
                    }}
                  >
                    {gender}
                  </button>
                ))}
              </div>
            </div>

            {/* Checkboxes */}
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "8px" }}>
              <label style={{ 
                display: "flex", 
                alignItems: "center", 
                gap: "10px",
                cursor: "pointer",
                fontSize: "14px",
                color: "#555"
              }}>
                <input
                  type="checkbox"
                  checked={wantsUpdates}
                  onChange={(e) => setWantsUpdates(e.target.checked)}
                  style={{ 
                    width: "18px", 
                    height: "18px", 
                    cursor: "pointer",
                    accentColor: "#667eea"
                  }}
                />
                <span>Get exclusive WhatsApp updates & offers</span>
              </label>
              
              <label style={{ 
                display: "flex", 
                alignItems: "center", 
                gap: "10px",
                cursor: "pointer",
                fontSize: "14px",
                color: "#555"
              }}>
                <input
                  type="checkbox"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  style={{ 
                    width: "18px", 
                    height: "18px", 
                    cursor: "pointer",
                    accentColor: "#667eea"
                  }}
                />
                <span>
                  I agree to the <span style={{ color: "#667eea", fontWeight: "600" }}>Terms</span> & <span style={{ color: "#667eea", fontWeight: "600" }}>Privacy Policy</span>
                </span>
              </label>
            </div>

            {/* Error / Success */}
            {error && (
              <div style={{
                padding: "14px 18px",
                borderRadius: "12px",
                background: "#fee2e2",
                border: "1px solid #fca5a5",
                color: "#dc2626",
                fontSize: "14px",
                fontWeight: "500"
              }}>
                {error}
              </div>
            )}
            
            {success && (
              <div style={{
                padding: "14px 18px",
                borderRadius: "12px",
                background: "#d1fae5",
                border: "1px solid #6ee7b7",
                color: "#059669",
                fontSize: "14px",
                fontWeight: "500",
                display: "flex",
                alignItems: "center",
                gap: "8px"
              }}>
                <CheckCircle2 size={18} />
                {success}
              </div>
            )}

            {/* Submit Button */}
            <button
              onClick={handleSubmit}
              disabled={!agreedToTerms || loading}
              style={{
                width: "100%",
                padding: "16px",
                borderRadius: "12px",
                border: "none",
                background: (!agreedToTerms || loading) 
                  ? "#ccc"
                  : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                color: "#fff",
                fontSize: "16px",
                fontWeight: "700",
                cursor: (!agreedToTerms || loading) ? "not-allowed" : "pointer",
                transition: "all 0.3s ease",
                boxShadow: (!agreedToTerms || loading) ? "none" : "0 8px 20px rgba(102, 126, 234, 0.4)",
                marginTop: "8px"
              }}
              onMouseEnter={(e) => {
                if (!(!agreedToTerms || loading)) {
                  e.target.style.transform = "translateY(-2px)";
                  e.target.style.boxShadow = "0 12px 28px rgba(102, 126, 234, 0.5)";
                }
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = "translateY(0)";
                e.target.style.boxShadow = (!agreedToTerms || loading) ? "none" : "0 8px 20px rgba(102, 126, 234, 0.4)";
              }}
            >
              {loading ? "Creating Your Account..." : "Create Account"}
            </button>

            {/* Login Link */}
            <p style={{ 
              textAlign: "center", 
              color: "#666", 
              fontSize: "14px",
              marginTop: "12px"
            }}>
              Already have an account?{" "}
              <span style={{ 
                color: "#667eea", 
                fontWeight: "600", 
                cursor: "pointer" 
              }}>
                Login here
              </span>
            </p>
          </div>
        </div>

        {/* Benefits Card - Hidden on mobile */}
        <div style={{
          flex: "0 0 380px",
          display: "none",
          flexDirection: "column",
          gap: "20px"
        }}
        className="benefits-card">
          <style>{`
            @media (min-width: 992px) {
              .benefits-card {
                display: flex !important;
              }
            }
          `}</style>
          
          <div style={{
            background: "rgba(255, 255, 255, 0.15)",
            backdropFilter: "blur(20px)",
            borderRadius: "24px",
            padding: "40px 32px",
            border: "1px solid rgba(255, 255, 255, 0.3)",
            animation: "slideUp 0.8s ease-out"
          }}>
            <h3 style={{ 
              fontSize: "24px", 
              fontWeight: "700", 
              color: "#fff",
              margin: "0 0 24px",
              textShadow: "0 2px 10px rgba(0,0,0,0.1)"
            }}>
              Why Join Myntra?
            </h3>

            {[
              { icon: <Sparkles size={24} />, title: "Exclusive Deals", desc: "Access to member-only sales & early releases" },
              { icon: <Shield size={24} />, title: "Secure Shopping", desc: "100% secure payments & data protection" },
              { icon: <Zap size={24} />, title: "Fast Delivery", desc: "Express shipping on all your fashion finds" }
            ].map((benefit, i) => (
              <div key={i} style={{
                background: "rgba(255, 255, 255, 0.2)",
                borderRadius: "16px",
                padding: "20px",
                marginBottom: i < 2 ? "16px" : "0",
                backdropFilter: "blur(10px)",
                border: "1px solid rgba(255, 255, 255, 0.3)"
              }}>
                <div style={{ 
                  color: "#fff", 
                  marginBottom: "12px",
                  display: "flex",
                  alignItems: "center",
                  gap: "12px"
                }}>
                  <div style={{
                    width: "40px",
                    height: "40px",
                    borderRadius: "10px",
                    background: "rgba(255, 255, 255, 0.2)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                  }}>
                    {benefit.icon}
                  </div>
                  <span style={{ fontSize: "18px", fontWeight: "700" }}>
                    {benefit.title}
                  </span>
                </div>
                <p style={{ 
                  color: "rgba(255, 255, 255, 0.9)", 
                  fontSize: "14px",
                  margin: 0,
                  lineHeight: "1.6"
                }}>
                  {benefit.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MyntraRegisterPage;