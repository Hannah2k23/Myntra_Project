const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.POSTGRESQL_DB_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

/**
 * Utility to inspect the existing products table structure
 */
const inspectProductsTable = async () => {
  try {
    console.log('🔍 Inspecting existing products table...');
    
    // Get table schema
    const schemaQuery = `
      SELECT column_name, data_type, is_nullable, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'products' 
      ORDER BY ordinal_position;
    `;
    
    const schemaResult = await pool.query(schemaQuery);
    console.log('📋 Products table schema:');
    schemaResult.rows.forEach(row => {
      console.log(`   ${row.column_name} (${row.data_type}) - ${row.is_nullable === 'YES' ? 'nullable' : 'not null'}`);
    });
    
    // Get sample data
    const sampleQuery = 'SELECT * FROM products LIMIT 3';
    const sampleResult = await pool.query(sampleQuery);
    console.log('\n📄 Sample data:');
    console.log(JSON.stringify(sampleResult.rows, null, 2));
    
    // Get total count
    const countQuery = 'SELECT COUNT(*) as total FROM products';
    const countResult = await pool.query(countQuery);
    console.log(`\n📊 Total products: ${countResult.rows[0].total}`);
    
    // Get unique categories
    const categoriesQuery = 'SELECT DISTINCT category FROM products WHERE category IS NOT NULL';
    const categoriesResult = await pool.query(categoriesQuery);
    console.log('\n🏷️ Available categories:');
    categoriesResult.rows.forEach(row => console.log(`   - ${row.category}`));
    
    return {
      schema: schemaResult.rows,
      sampleData: sampleResult.rows,
      totalCount: countResult.rows[0].total,
      categories: categoriesResult.rows
    };
    
  } catch (error) {
    console.error('❌ Error inspecting database:', error);
    throw error;
  }
};

/**
 * Test the database connection
 */
const testConnection = async () => {
  try {
    console.log('🔗 Testing database connection...');
    const result = await pool.query('SELECT NOW() as current_time');
    console.log('✅ Database connected successfully!');
    console.log(`⏰ Server time: ${result.rows[0].current_time}`);
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    return false;
  }
};

module.exports = {
  testConnection,
  inspectProductsTable,
  pool
};