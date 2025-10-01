import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import TryOnModal from "./TryOnModal";
import ImagineModal from "./ImagineModal";
import "./styles.css";

export default function ProductPage() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [showTry, setShowTry] = useState(false);
  const [showImagine, setShowImagine] = useState(false);
  const [selectedSize, setSelectedSize] = useState("");

  useEffect(() => {
    fetch(`http://localhost:4000/api/products/${id}`)
      .then((r) => r.json())
      .then(setProduct);
  }, [id]);

  if (!product) return <div className="loading">Loading...</div>;

  return (
    <div className="product-page">
      <div className="product-images">
        <img
          src={`http://localhost:4000${product.image}`}
          alt={product.title}
          className="product-main-img"
        />
        {product.discountText && (
          <span className="discount-badge product-discount">
            {product.discountText}
          </span>
        )}
      </div>

      <div className="product-info">
        <h1 className="product-brand">{product.brand}</h1>
        <h2 className="product-title">{product.title}</h2>
        <div className="price-row">
          <div className="price">₹{product.price}</div>
          <div className="mrp">
            <span className="mrp-value">MRP ₹{product.mrp}</span>{" "}
          </div>
          <span className="discount">({product.discountText})</span>
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
          productImage={`http://localhost:4000${product.image}`}
          onClose={() => setShowTry(false)}
        />
      )}
      {showImagine && (
        <ImagineModal
          productImage={`http://localhost:4000${product.image}`}
          onClose={() => setShowImagine(false)}
        />
      )}
    </div>
  );
}
