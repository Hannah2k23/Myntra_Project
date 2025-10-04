// ProductPage.jsx
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import TryOnModal from "./TryOnModal";
import ImagineModal from "./ImagineModal";
import "./styles.css";

export default function ProductPage() {
  const { id } = useParams(); // numeric product_id or SKU
  const [product, setProduct] = useState(null);
  const [error, setError] = useState(null);
  const [showTry, setShowTry] = useState(false);
  const [showImagine, setShowImagine] = useState(false);
  const [selectedSize, setSelectedSize] = useState("");

  useEffect(() => {
    let mounted = true;
    setProduct(null);
    setError(null);

    fetch(`http://localhost:4000/api/products/${encodeURIComponent(id)}`)
      .then((r) => {
        if (!r.ok) throw new Error(`Fetch failed: ${r.status}`);
        return r.json();
      })
      .then((data) => {
        if (!mounted) return;
        setProduct(data);
      })
      .catch((err) => {
        console.error(err);
        if (mounted) setError("Failed to load product.");
      });

    return () => { mounted = false; };
  }, [id]);

  // Helper to handle image URLs
  const getImageSrc = (img) => {
    if (!img) return "/placeholder.png"; // fallback
    if (/^https?:\/\//i.test(img)) return img; // absolute URL
    return `http://localhost:4000${img}`; // relative backend path
  };

  if (error) return <div className="error">{error}</div>;
  if (!product) return <div className="loading">Loading product...</div>;

  return (
    <div className="product-page">
      <div className="product-images">
        <img
          src={getImageSrc(product.image_url)}
          alt={product.name}
          className="product-main-img"
          onError={(e) => { e.currentTarget.src = "/placeholder.png"; }}
        />
        {product.discount_text && (
          <span className="discount-badge product-discount">
            {product.discount_text}
          </span>
        )}
      </div>

      <div className="product-info">
        <h1 className="product-brand">{product.brand}</h1>
        <h2 className="product-title">{product.name}</h2>

        <div className="price-row">
          <div className="price">₹{product.price}</div>
          <div className="mrp">
            <span className="mrp-value">MRP ₹{product.mrp}</span>
          </div>
          <span className="discount">({product.discount_text})</span>
        </div>

        <div className="sizes">
          <strong>Select Size</strong>
          <div className="size-options">
            {["S", "M", "L", "XL"].map((size) => (
              <button
                key={size}
                className={`size${selectedSize === size ? " selected" : ""}`}
                onClick={() => setSelectedSize(size)}
              >
                {size}
              </button>
            ))}
          </div>
        </div>

        <div className="actions">
          <button className="btn pink" onClick={() => setShowImagine(true)}>
            StyleMirror
          </button>
          <button className="btn" onClick={() => setShowTry(true)}>
            Try On
          </button>
          <button className="btn outline">Add to Bag</button>
        </div>
      </div>

      {showTry && (
        <TryOnModal
          productImage={getImageSrc(product.image_url)}
          onClose={() => setShowTry(false)}
        />
      )}

      {showImagine && (
        <ImagineModal
          productImage={getImageSrc(product.image_url)}
          onClose={() => setShowImagine(false)}
        />
      )}
    </div>
  );
}
