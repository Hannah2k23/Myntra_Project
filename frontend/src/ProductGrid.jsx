import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "./styles.css";

export default function ProductGrid({ filters }) {
  const [products, setProducts] = useState([]);

  useEffect(() => {
    fetch("http://localhost:4001/api/products")
      .then((r) => r.json())
      .then(setProducts);
  }, []);

  // Filtering logic
  const filtered = products.filter((p) => {
    const inCategory =
      !filters?.categories?.length || filters.categories.includes(p.category);
    const inBrand =
      !filters?.brands?.length || filters.brands.includes(p.brand);
    const inPrice =
      !filters?.price ||
      (p.price >= filters.price[0] && p.price <= filters.price[1]);
    return inCategory && inBrand && inPrice;
  });

  return (
    <div>
      <h2 className="featured-title">Featured Products</h2>
      <div className="product-grid">
        {filtered.map((p) => (
          <div className="product-card" key={p.id}>
            <Link
              to={`/product/${p.id}`}
              style={{ textDecoration: "none", color: "inherit" }}
            >
              <div className="card-img-wrap">
                <img
                  //src={`http://localhost:4000${p.image}`}
                  src={p.image}
                  alt={p.title}
                  className="card-img"
                />
                {p.discountText && (
                  <span className="discount-badge">{p.discountText}</span>
                )}
              </div>
              <div className="card-meta">
                <div className="card-brand">{p.brand}</div>
                <div className="card-title">{p.title}</div>
                <div className="card-price-row">
                  <span className="card-price">₹{p.price}</span>
                  <span className="card-mrp">₹{p.mrp}</span>
                </div>
                <div className="card-rating">
                  <span className="star">★</span> {p.rating} | {p.ratingCount}
                </div>
              </div>
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
