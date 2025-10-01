import React, { useState } from "react";
import { Routes, Route } from "react-router-dom";
import Header from "./Header";
import Filters from "./Filters";
import ProductGrid from "./ProductGrid";
import ProductPage from "./ProductPage";

export default function App() {
  // Filter state
  const [selected, setSelected] = useState({
    categories: [],
    brands: [],
    price: [500, 5000],
  });

  // Handler for filter changes
  const handleFilterChange = (type, value) => {
    setSelected((prev) => {
      if (type === "price") {
        return { ...prev, price: value };
      }
      const arr = prev[type] || [];
      return arr.includes(value)
        ? { ...prev, [type]: arr.filter((v) => v !== value) }
        : { ...prev, [type]: [...arr, value] };
    });
  };

  return (
    <div>
      <Header />
      <main className="container" style={{ display: "flex", alignItems: "flex-start", gap: 32, padding: 32, background: "#f5f5f6", minHeight: "100vh" }}>
        <Routes>
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
          <Route path="/product/:id" element={<ProductPage />} />
        </Routes>
      </main>
    </div>
  );
}
