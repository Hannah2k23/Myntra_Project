import React, { useState } from "react";
import { Routes, Route } from "react-router-dom";
import Header from "./Header";
import Filters from "./Filters";
import ProductGrid from "./ProductGrid";
import ProductPage from "./ProductPage";
import MyntraLoginPage from "./Login";
import MyntraRegisterPage from "./Register";

export default function App() {
  const [selected, setSelected] = useState({
    categories: [],
    brands: [],
    price: [500, 5000],
  });

  const handleFilterChange = (type, value) => {
    setSelected((prev) => {
      if (type === "price") return { ...prev, price: value };
      const arr = prev[type] || [];
      return arr.includes(value)
        ? { ...prev, [type]: arr.filter((v) => v !== value) }
        : { ...prev, [type]: [...arr, value] };
    });
  };

  return (
    <div>
      <Header />
      <main
        className="container"
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 32,
          padding: 32,
          background: "#f5f5f6",
          minHeight: "100vh",
        }}
      >
        <Routes>
          {/* Login page */}
          <Route path="/login" element={<MyntraLoginPage defaultTab="login" />} />

          {/* Register page */}
          <Route path="/register" element={<MyntraRegisterPage defaultTab="signup" />} />

          {/* Home / Product grid */}
          <Route
            path="/"
            element={
              <>
                <Filters selected={selected} onChange={handleFilterChange} />
                <div style={{ flex: 1 }}>
                  <ProductGrid filters={selected} />
                </div>
              </>
            }
          />

          {/* Single product page */}
          <Route path="/product/:id" element={<ProductPage />} />
        </Routes>
      </main>
    </div>
  );
}
