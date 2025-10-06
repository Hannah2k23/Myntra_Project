// ProductGrid.jsx
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "./styles.css";

const apiUrl = import.meta.env.VITE_BACKEND_URL
export default function ProductGrid({ filters }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);
    console.log(`${apiUrl}`)
    fetch(`${apiUrl}/api/products`)
      .then((r) => {
        if (!r.ok) throw new Error(`Fetch failed: ${r.status}`);
        return r.json();
      })
      .then((data) => {
        if (!mounted) return;
        setProducts(Array.isArray(data) ? data : data.rows ?? []);
      })
      .catch((err) => {
        console.error(err);
        if (mounted) setError("Failed to load products.");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  // Helper to get image source
  const getImageSrc = (img) => {
    if (!img) return "/placeholder.png"; // fallback in public/
    if (/^https?:\/\//i.test(img)) return img; // absolute URL
    return `${apiUrl}${img}`; // relative path
  };

  if (loading) return <div className="loading">Loading products...</div>;
  if (error) return <div className="error">{error}</div>;

  // Filter products based on DB fields
  const filtered = products.filter((p) => {
    const inCategory =
      !filters?.categories?.length || filters.categories.includes(p.category);
    const inBrand = !filters?.brands?.length || filters.brands.includes(p.brand);
    const inPrice =
      !filters?.price ||
      (Number(p.price) >= filters.price[0] && Number(p.price) <= filters.price[1]);
    return inCategory && inBrand && inPrice;
  });

  return (
    <div>
      <h2 className="featured-title">Featured Products</h2>
      <div className="product-grid">
        {filtered.map((p) => (
          <div className="product-card" key={p.product_id ?? p.sku}>
            <Link
              to={`/product/${p.product_id ?? p.sku}`}
              style={{ textDecoration: "none", color: "inherit" }}
            >
              <div className="card-img-wrap">
                <img
                  src={getImageSrc(p.image_url)}
                  alt={p.name}
                  className="card-img"
                  onError={(e) => (e.currentTarget.src = "/placeholder.png")}
                />
                {p.discount_text && (
                  <span className="discount-badge">{p.discount_text}</span>
                )}
              </div>

              <div className="card-meta">
                <div className="card-brand">{p.brand}</div>
                <div className="card-title">{p.name}</div>
                <div className="card-price-row">
                  <span className="card-price">₹{p.price}</span>
                  <span className="card-mrp">₹{p.mrp}</span>
                </div>
                <div className="card-rating">
                  <span className="star">★</span> {p.rating} | {p.rating_count ?? 0}
                </div>
              </div>
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
