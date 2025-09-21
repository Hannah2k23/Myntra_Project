import React from 'react'
import { Routes, Route, Link } from 'react-router-dom'
import ProductGrid from './ProductGrid'
import ProductPage from './ProductPage'

export default function App(){
  return (
    <div>
      <header className="topbar">
        <div className="logo">Myntra Clone</div>
        <nav>
          <Link to="/">Home</Link>
        </nav>
      </header>
      <main className="container">
        <Routes>
          <Route path="/" element={<ProductGrid />} />
          <Route path="/product/:id" element={<ProductPage />} />
        </Routes>
      </main>
    </div>
  )
}
