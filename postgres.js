/**
 * ============================================================================
 *                  POSTGRESQL INTERVIEW & REVISION GUIDE
 * ============================================================================
 * 
 * This comprehensive guide covers everything you need to know about PostgreSQL
 * (SQL) for interviews and practical implementation.
 */

// ============================================================================
// SECTION 1: WHAT IS POSTGRESQL?
// ============================================================================

/**
 * DEFINITION:
 * PostgreSQL (or Postgres) is a powerful, open-source Object-Relational Database 
 * System (ORDBMS) that uses and extends the SQL language combined with many 
 * features that safely store and scale the most complicated data workloads.
 * 
 * WHY USE POSTGRESQL?
 * 1. ACID Compliance - Guarantees validity of transactions (Atomicity, Consistency, Isolation, Durability).
 * 2. Advanced Features - Complex queries, foreign keys, triggers, views, stored procedures.
 * 3. Extensibility - User-defined types, functions, and libraries.
 * 4. JSON Support - Excellent support for JSONB, allowing NoSQL-like features (Hybrid).
 * 5. Concurrency - MVCC (Multi-Version Concurrency Control) for high performance.
 * 
 * WHEN TO USE:
 * - Complex data relationships (many-to-many, etc.).
 * - Financial applications (strict data integrity).
 * - Analytics and complex reporting.
 * - When strict consistency is required.
 * 
 * SQL VS NOSQL (Postgres vs Mongo):
 * - Structure: Tables/Rows (Strict) vs Document/JSON (Flexible).
 * - Scaling: Vertical (Stronger server) vs Horizontal (Sharding).
 * - Relations: JOINs (Native/Fast) vs $lookup (Aggregations).
 */


// ============================================================================
// SECTION 2: CONNECTING (Node.js with 'pg')
// ============================================================================

const { Pool, Client } = require('pg');

/**
 * CONNECTION POOLING:
 * In production, always use a Pool. It maintains a set of open connections 
 * that can be reused, reducing the overhead of establishing new connections.
 */

const pool = new Pool({
    user: 'dbuser',
    host: 'database.server.com',
    database: 'mydb',
    password: 'secretpassword',
    port: 5432,
    max: 20, // Max number of clients in the pool
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

async function connectToPostgres() {
    try {
        const client = await pool.connect();
        console.log('✅ Connected to PostgreSQL');

        // Always release the client back to the pool!
        client.release();
    } catch (err) {
        console.error('❌ Connection error', err.stack);
    }
}


// ============================================================================
// SECTION 3: SCHEMA DEFINITION (DDL)
// ============================================================================

/**
 * DDL (Data Definition Language)
 * Commands: CREATE, ALTER, DROP, TRUNCATE
 */

const schemaSQL = `
    -- 1. Create Enum Type (Custom data type)
    CREATE TYPE user_role AS ENUM ('admin', 'user', 'moderator');

    -- 2. Create Users Table
    CREATE TABLE users (
        id SERIAL PRIMARY KEY,              -- Auto-incrementing integer
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role user_role DEFAULT 'user',
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        metadata JSONB                      -- NoSQL capability!
    );

    -- 3. Create Products Table
    CREATE TABLE products (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        price DECIMAL(10, 2) NOT NULL CHECK (price >= 0), -- Constraint
        stock INT DEFAULT 0,
        category_id INT
    );

    -- 4. Create Orders Table (Relationships)
    CREATE TABLE orders (
        id SERIAL PRIMARY KEY,
        user_id INT REFERENCES users(id) ON DELETE CASCADE, -- Foreign Key
        total_amount DECIMAL(10, 2) NOT NULL,
        status VARCHAR(20) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- 5. Junction Table for Many-to-Many (Orders <-> Products)
    CREATE TABLE order_items (
        order_id INT REFERENCES orders(id),
        product_id INT REFERENCES products(id),
        quantity INT NOT NULL CHECK (quantity > 0),
        price_at_purchase DECIMAL(10, 2) NOT NULL,
        PRIMARY KEY (order_id, product_id)  -- Composite Primary Key
    );
`;


// ============================================================================
// SECTION 4: CRUD OPERATIONS (DML)
// ============================================================================

/**
 * DML (Data Manipulation Language)
 * Commands: SELECT, INSERT, UPDATE, DELETE
 */

async function crudOperations() {
    const client = await pool.connect();
    try {

        // ========================================
        // CREATE (INSERT)
        // ========================================

        // Basic Insert
        const insertQuery = `
            INSERT INTO users (username, email, password_hash)
            VALUES ($1, $2, $3)
            RETURNING *; -- Returns the created row immediately
        `;
        const newUser = await client.query(insertQuery, ['john_doe', 'john@example.com', 'hashed_pw']);

        // Bulk Insert involves constructing a large value string or using helper libraries like 'pg-format'

        // ========================================
        // READ (SELECT)
        // ========================================

        // Select All
        const allUsers = await client.query('SELECT * FROM users');

        // Select with Filter
        const activeUsers = await client.query(
            'SELECT username, email FROM users WHERE is_active = $1',
            [true]
        );

        // Select with ID
        const userById = await client.query('SELECT * FROM users WHERE id = $1', [1]);

        // Filtering Patterns (LIKE, IN, BETWEEN)
        /*
        SELECT * FROM products WHERE name LIKE 'App%';    -- Starts with App
        SELECT * FROM users WHERE id IN (1, 2, 3);        -- List match
        SELECT * FROM orders WHERE total_amount BETWEEN 100 AND 500;
        */

        // ========================================
        // UPDATE
        // ========================================

        const updateQuery = `
            UPDATE users 
            SET is_active = $1, role = $2 
            WHERE id = $3 
            RETURNING id, username, role; -- Very useful to get updated state
        `;
        const updated = await client.query(updateQuery, [false, 'admin', 1]);

        // ========================================
        // DELETE
        // ========================================

        const deleteQuery = 'DELETE FROM users WHERE id = $1';
        await client.query(deleteQuery, [99]);

    } finally {
        client.release();
    }
}


// ============================================================================
// SECTION 5: JOINS & RELATIONS
// ============================================================================

/**
 * JOINS are the superpower of SQL. They combine rows from two or more tables.
 * 
 * Types:
 * 1. INNER JOIN: Default. Returns records valid in BOTH tables.
 * 2. LEFT JOIN: Returns ALL records from Left table, and matched from Right.
 * 3. RIGHT JOIN: Returns ALL from Right, matched from Left.
 * 4. FULL JOIN: Returns ALL records when there is a match in EITHER.
 */

async function joinExamples() {

    // Get all orders with the user who made them (INNER JOIN)
    // Only returns orders that have a valid user
    const innerJoin = `
        SELECT orders.id as order_id, users.username, orders.total_amount
        FROM orders
        INNER JOIN users ON orders.user_id = users.id;
    `;

    // Get ALL users and their orders, even if they have no orders (LEFT JOIN)
    // Users with no orders will have NULL in order columns
    const leftJoin = `
        SELECT users.username, orders.id as order_id
        FROM users
        LEFT JOIN orders ON users.id = orders.user_id;
    `;

    // Complex Join: User -> Orders -> OrderItems -> Products
    const complexJoin = `
        SELECT u.username, o.id as order_id, p.name as product_name, oi.quantity
        FROM users u
        JOIN orders o ON u.id = o.user_id
        JOIN order_items oi ON o.id = oi.order_id
        JOIN products p ON oi.product_id = p.id
        WHERE u.id = $1;
    `;
}


// ============================================================================
// SECTION 6: AGGREGATION & GROUPING
// ============================================================================

/**
 * Functions: COUNT, SUM, AVG, MIN, MAX
 * Clauses: GROUP BY, HAVING
 */

async function aggregationExamples() {

    // Count users by role
    const countByRole = `
        SELECT role, COUNT(*) as user_count
        FROM users
        GROUP BY role;
    `;

    // Total spent by each user (Filter groups with HAVING)
    // HAVING is like WHERE, but for groups
    const highSpenders = `
        SELECT user_id, SUM(total_amount) as total_spent
        FROM orders
        GROUP BY user_id
        HAVING SUM(total_amount) > 1000;
    `;

    // Average order value per month
    const monthlyStats = `
        SELECT 
            EXTRACT(MONTH FROM created_at) as month,
            AVG(total_amount) as average_order
        FROM orders
        GROUP BY EXTRACT(MONTH FROM created_at)
        ORDER BY month;
    `;
}


// ============================================================================
// SECTION 7: ADVANCED POSTGRES FEATURES
// ============================================================================

/**
 * 1. JSONB: Postgres as a NoSQL Database
 * 2. Transactions: ACID Compliance
 * 3. Indexing: Performance
 * 4. Views: Virtual tables
 */

async function advancedFeatures() {
    const client = await pool.connect();

    // --- JSONB (Binary JSON) ---
    // Querying inside a JSON column
    /*
      Assumption: users table has a 'metadata' JSONB column
      metadata = { "preferences": { "theme": "dark", "notifications": true } }
    */

    // Find users with dark theme
    const jsonQuery = `
        SELECT * FROM users 
        WHERE metadata->'preferences'->>'theme' = 'dark';
    `;

    // Update a JSON field
    const jsonUpdate = `
        UPDATE users 
        SET metadata = jsonb_set(metadata, '{preferences, theme}', '"light"')
        WHERE id = 1;
    `;

    // --- TRANSACTIONS (ACID) ---
    // Example: Bank Transfer (Must completely succeed or completely fail)
    try {
        await client.query('BEGIN'); // Start transaction

        const withdraw = 'UPDATE accounts SET balance = balance - 100 WHERE id = 1';
        await client.query(withdraw);

        const deposit = 'UPDATE accounts SET balance = balance + 100 WHERE id = 2';
        await client.query(deposit);

        await client.query('COMMIT'); // Save changes
    } catch (e) {
        await client.query('ROLLBACK'); // Undo everything if error
        console.error('Transaction Failed');
    } finally {
        client.release();
    }

    // --- INDEXING ---
    // B-Tree (Default): Good for equality and range (=, <, >, <=, >=)
    /* CREATE INDEX idx_users_email ON users(email); */

    // GIN (Generalized Inverted Index): Essential for JSONB and Full Text Search
    /* CREATE INDEX idx_metadata ON users USING GIN (metadata); */
}


// ============================================================================
// SECTION 8: INTERVIEW QUESTIONS
// ============================================================================

const interviewQA = {
    q1: {
        question: "Difference between WHERE and HAVING?",
        answer: "WHERE filters rows BEFORE grouping. HAVING filters groups AFTER grouping. You cannot use aggregate functions (SUM, COUNT) in WHERE."
    },
    q2: {
        question: "What is an Index and why not index everything?",
        answer: "Indexes are data structures (like B-Trees) that speed up reads. However, they slow down writes (INSERT/UPDATE) because the index must also be updated. They also consume disk space."
    },
    q3: {
        question: "Explain ACID properties.",
        answer: `
        - Atomicity: All or nothing. If one part fails, the whole transaction rolls back.
        - Consistency: Database moves from one valid state to another (constraints enforced).
        - Isolation: Transactions don't interfere with each other.
        - Durability: Once committed, data is saved even if power fails.
        `
    },
    q4: {
        question: "Primary Key vs Foreign Key?",
        answer: "Primary Key uniquely identifies a row in a table. Foreign Key is a field that links to the Primary Key of another table, creating a relationship."
    },
    q5: {
        question: "What is Normalization?",
        answer: "The process of organizing data to reduce redundancy and dependency. 1NF (Atomic values), 2NF (No partial dependency), 3NF (No transitive dependency)."
    },
    q6: {
        question: "Postgres JSONB vs JSON?",
        answer: "JSON is stored as text (slow to query). JSONB is stored in a decomposed binary format (slower to insert, but much faster to query/index). Always use JSONB."
    },
    q7: {
        question: "What is MVCC?",
        answer: "Multi-Version Concurrency Control. Postgres handles concurrent access by keeping multiple versions of a row. Readers don't block writers, and writers don't block readers."
    }
};


// ============================================================================
// QUICK REFERENCE CHEAT SHEET
// ============================================================================

/*
CONNECT:
  psql -U username -d dbname

DDL:
  CREATE TABLE name (col type ...);
  DROP TABLE name;
  ALTER TABLE name ADD COLUMN col type;

DML:
  SELECT col FROM table WHERE cond ORDER BY col LIMIT n;
  INSERT INTO table (col1, col2) VALUES (val1, val2);
  UPDATE table SET col1 = val WHERE cond;
  DELETE FROM table WHERE cond;

AGGREGATES:
  SELECT COUNT(*), AVG(col) FROM table GROUP BY category;

JOINS:
  SELECT * FROM t1 JOIN t2 ON t1.id = t2.ref_id;

JSONB:
  SELECT * FROM table WHERE data->>'key' = 'value';
*/

module.exports = {
    connectToPostgres,
    crudOperations,
    joinExamples,
    interviewQA
};
