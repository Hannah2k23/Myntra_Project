// backend/controllers/productController.js

// List products
async function getProducts(req, res) {
  try {
    const pool = req.app.locals.pool; // get pool from server.js
    const { rows } = await pool.query(`
      SELECT product_id, sku, name, brand, price, mrp, discount_text, rating, rating_count,
             color, hex_color, stock, popularity_score, material, occasion, category, sub_category,
             image_url, model_3d_url, created_at
      FROM products
      ORDER BY popularity_score DESC NULLS LAST, created_at DESC
    `);

    const mapped = rows.map(r => ({
      ...r,
      id: r.product_id,
      title: r.name,
      image: r.image_url,
      discountText: r.discount_text,
      ratingCount: r.rating_count
    }));

    res.json(mapped);
  } catch (err) {
    console.error("getProducts error:", err);
    res.status(500).json({ error: "Server error" });
  }
}

// Get single product
async function getProductById(req, res) {
  try {
    const pool = req.app.locals.pool;
    const { id } = req.params;

    const sql = /^\d+$/.test(id)
      ? "SELECT * FROM products WHERE product_id = $1 LIMIT 1"
      : "SELECT * FROM products WHERE sku = $1 LIMIT 1";
    const params = [id];

    const { rows } = await pool.query(sql, params);
    if (!rows.length) return res.status(404).json({ error: "Not found" });

    const r = rows[0];
    res.json({
      ...r,
      id: r.product_id,
      title: r.name,
      image: r.image_url,
      discountText: r.discount_text,
      ratingCount: r.rating_count
    });
  } catch (err) {
    console.error("getProductById error:", err);
    res.status(500).json({ error: "Server error" });
  }
}

module.exports = { getProducts, getProductById };
