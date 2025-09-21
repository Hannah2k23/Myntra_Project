import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import TryOnModal from './TryOnModal'
import ImagineModal from './ImagineModal'

export default function ProductPage(){
  const { id } = useParams()
  const [product, setProduct] = useState(null)
  const [showTry, setShowTry] = useState(false)
  const [showImagine, setShowImagine] = useState(false)

  useEffect(()=>{
    fetch(`http://localhost:4000/api/products/${id}`)
      .then(r=>r.json())
      .then(setProduct)
  }, [id])

  if (!product) return <div>Loading...</div>

  return (
    <div className="product-page">
      <div className="product-images">
        <img src={`http://localhost:4000${product.image}`} alt={product.title}/>
      </div>

      <div className="product-info">
        <h1>{product.brand}</h1>
        <h2>{product.title}</h2>
        <div className="price-row">
          <div className="price">₹{product.price}</div>
          <div className="mrp">MRP ₹{product.mrp} <span className="discount">({product.discountText})</span></div>
        </div>

        <div className="sizes">
          <strong>Select Size</strong>
          <div className="size-options">
            <button className="size">S</button>
            <button className="size">M</button>
            <button className="size">L</button>
            <button className="size">XL</button>
          </div>
        </div>

        <div className="actions">
          <button className="btn pink" onClick={()=>setShowImagine(true)}>StyleMirror</button>
          <button className="btn" onClick={()=>setShowTry(true)}>Try On</button>
          <button className="btn outline">Add to Bag</button>
        </div>
      </div>

      {showTry && <TryOnModal productImage={`http://localhost:4000${product.image}`} onClose={()=>setShowTry(false)} />}
      {showImagine && <ImagineModal productImage={`http://localhost:4000${product.image}`} onClose={()=>setShowImagine(false)} />}
    </div>
  )
}
