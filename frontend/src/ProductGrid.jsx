import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

export default function ProductGrid(){
  const [products, setProducts] = useState([])

  useEffect(()=>{
    fetch('http://localhost:4000/api/products')
      .then(r => r.json())
      .then(setProducts)
  }, [])

  return (
    <div>
      <h2>Featured</h2>
      <div className="grid">
        {products.map(p => (
          <div className="card" key={p.id}>
            <Link to={`/product/${p.id}`}>
              <img src={`http://localhost:4000${p.image}`} alt={p.title} />
            </Link>
            <div className="meta">
              <div className="title">{p.brand}</div>
              <div className="subtitle">{p.title}</div>
              <div className="price">₹{p.price} <span className="mrp">₹{p.mrp}</span></div>
              <div className="rating">{p.rating} ★ | {p.ratingCount}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
