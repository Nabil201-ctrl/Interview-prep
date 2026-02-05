# 🚀 Backend Engineering Interview Master Guide

> **Interview Date:** Thursday | **Goal:** Understand concepts deeply, not just memorize

---

# 1️⃣ DATABASES — The Foundation

## A. Core Fundamentals (Works for ANY Database)

### CRUD Operations
**Definition:** Create, Read, Update, Delete — the 4 basic operations on data.

```javascript
// Create
await db.users.insert({ name: "Nabil", email: "nabil@example.com" });

// Read
await db.users.find({ email: "nabil@example.com" });

// Update
await db.users.update({ email: "nabil@example.com" }, { name: "Nabil Updated" });

// Delete
await db.users.delete({ email: "nabil@example.com" });
```

**Why needed:** Every app needs to store and manipulate data.
**When to implement:** Always — it's the backbone of any application.

---

### Indexes (B-Tree vs Hash)
**Definition:** Data structures that speed up data retrieval, like a book's index.

| Type | How it Works | Best For | Avoid When |
|------|-------------|----------|------------|
| **B-Tree** | Sorted tree structure | Range queries (`>`, `<`, `BETWEEN`), sorting | Very small tables |
| **Hash** | Direct key-value lookup | Exact match (`=`) only | Range queries, sorting |

```sql
-- B-Tree index (default in most DBs)
CREATE INDEX idx_users_email ON users(email);

-- Hash index (PostgreSQL)
CREATE INDEX idx_users_id ON users USING HASH(id);
```

**Why needed:** Without indexes, DB scans ALL rows (slow!)
**When to implement:** Columns used in WHERE, JOIN, ORDER BY
**When NOT to:** Small tables (<1000 rows), columns that change constantly

---

### Primary Key vs Unique Key

| Feature | Primary Key | Unique Key |
|---------|-------------|------------|
| **Null allowed?** | ❌ Never | ✅ One null allowed |
| **How many per table?** | Only 1 | Multiple allowed |
| **Purpose** | Identify each row | Prevent duplicates |

```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,           -- Primary Key
    email VARCHAR(255) UNIQUE,       -- Unique Key
    username VARCHAR(100) UNIQUE     -- Another Unique Key
);
```

**Memory trick:** Primary = passport (one per person, required). Unique = phone number (can have multiple, optional).

---

### Transactions & ACID

**Definition:** A transaction is a group of operations that must ALL succeed or ALL fail.

**ACID = 4 guarantees:**

| Letter | Meaning | Simple Explanation | Example |
|--------|---------|-------------------|---------|
| **A** | Atomicity | All or nothing | Bank transfer: debit AND credit must both happen |
| **C** | Consistency | Data always valid | Balance can't go negative |
| **I** | Isolation | Transactions don't interfere | Two people buying last item |
| **D** | Durability | Saved = permanent | After commit, survives crashes |

```javascript
// Example: Bank Transfer
const transaction = await db.startTransaction();
try {
    await transaction.debit(accountA, 100);
    await transaction.credit(accountB, 100);
    await transaction.commit();  // Both succeed ✅
} catch (error) {
    await transaction.rollback(); // Both fail ❌
}
```

**Why needed:** Data integrity in critical operations
**When to implement:** Financial operations, inventory, multi-step processes
**When NOT to:** Simple reads, analytics queries

---

### Isolation Levels

**Definition:** How much transactions can "see" each other's uncommitted changes.

| Level | Speed | Safety | Dirty Read | Non-Repeatable Read | Phantom Read |
|-------|-------|--------|------------|---------------------|--------------|
| **Read Uncommitted** | 🚀🚀🚀 | ❌ | ✅ Yes | ✅ Yes | ✅ Yes |
| **Read Committed** | 🚀🚀 | ⚠️ | ❌ No | ✅ Yes | ✅ Yes |
| **Repeatable Read** | 🚀 | ✅ | ❌ No | ❌ No | ✅ Yes |
| **Serializable** | 🐢 | ✅✅ | ❌ No | ❌ No | ❌ No |

**Memory trick:** Higher safety = slower. Most apps use "Read Committed" (default in PostgreSQL).

---

### Locks (Row vs Table)

| Lock Type | What it Locks | Use Case | Performance |
|-----------|--------------|----------|-------------|
| **Row Lock** | Single row | Update one user | 🚀 Fast |
| **Table Lock** | Entire table | Schema changes, bulk updates | 🐢 Slow |

```sql
-- Row lock (implicit during UPDATE)
UPDATE users SET balance = balance - 100 WHERE id = 1;

-- Table lock (explicit)
LOCK TABLE users IN EXCLUSIVE MODE;
```

**When to use row locks:** Normal CRUD operations
**When to use table locks:** Migrations, bulk imports

---

### Pagination: Offset vs Cursor

| Method | How it Works | Pros | Cons |
|--------|-------------|------|------|
| **Offset** | `SKIP 100, TAKE 10` | Simple, jump to any page | Slow on large data, inconsistent |
| **Cursor** | `WHERE id > last_id LIMIT 10` | Fast, consistent | Can't jump to page 50 |

```javascript
// Offset Pagination (simple but slow)
const users = await db.users.findMany({
    skip: (page - 1) * 10,
    take: 10
});

// Cursor Pagination (fast and reliable)
const users = await db.users.findMany({
    where: { id: { gt: lastSeenId } },
    take: 10,
    orderBy: { id: 'asc' }
});
```

**When to use Offset:** Small datasets, need page numbers
**When to use Cursor:** Large datasets, infinite scroll, real-time feeds

---

### Normalization vs Denormalization

| Concept | Definition | Pros | Cons |
|---------|-----------|------|------|
| **Normalization** | Split data into related tables | No duplication, easier updates | More JOINs, slower reads |
| **Denormalization** | Duplicate data for speed | Faster reads | Data can become inconsistent |

```sql
-- Normalized (separate tables)
SELECT orders.*, users.name 
FROM orders 
JOIN users ON orders.user_id = users.id;

-- Denormalized (user_name stored in orders)
SELECT * FROM orders; -- Already has user_name
```

**When to normalize:** Write-heavy apps, data integrity critical
**When to denormalize:** Read-heavy apps, reporting, caching

---

### Replication vs Sharding

| Concept | What it Does | Use Case |
|---------|-------------|----------|
| **Replication** | Copy entire DB to multiple servers | High availability, read scaling |
| **Sharding** | Split data across multiple servers | Massive data (billions of rows) |

```
Replication:
[Primary DB] → [Replica 1] (reads)
            → [Replica 2] (reads)

Sharding:
[Users A-M] → Server 1
[Users N-Z] → Server 2
```

**When to replicate:** 99.9% of apps. Safety + read performance.
**When to shard:** Extreme scale (think Twitter, Netflix). Avoid until necessary!

---

### Connection Pooling

**Definition:** Reuse database connections instead of creating new ones each time.

```javascript
// Without pooling: 1000 requests = 1000 connections (💀 DB dies)
// With pooling: 1000 requests = 10 shared connections (✅ efficient)

const pool = new Pool({
    max: 20,        // Maximum connections
    min: 5,         // Minimum connections
    idleTimeout: 30000
});
```

**Why needed:** Creating connections is EXPENSIVE (100-300ms each)
**When to implement:** Always in production
**When NOT to:** Never skip this. Just configure properly.

---

## B. SQL Databases (PostgreSQL/MySQL)

### Essential SQL Commands

```sql
-- JOINS: Combine tables
SELECT users.name, orders.total
FROM users
INNER JOIN orders ON users.id = orders.user_id;  -- Only matching rows
LEFT JOIN orders ON users.id = orders.user_id;   -- All users, even without orders
RIGHT JOIN orders ON users.id = orders.user_id;  -- All orders, even without users

-- GROUP BY + HAVING: Aggregate with conditions
SELECT user_id, COUNT(*) as order_count
FROM orders
GROUP BY user_id
HAVING COUNT(*) > 5;  -- Only users with 5+ orders

-- Window Functions: Calculations across rows
SELECT name, salary,
    RANK() OVER (ORDER BY salary DESC) as salary_rank,
    AVG(salary) OVER () as company_avg
FROM employees;

-- CTEs (Common Table Expressions): Readable subqueries
WITH high_spenders AS (
    SELECT user_id, SUM(total) as total_spent
    FROM orders
    GROUP BY user_id
    HAVING SUM(total) > 1000
)
SELECT users.name, high_spenders.total_spent
FROM users
JOIN high_spenders ON users.id = high_spenders.user_id;
```

---

### Views vs Materialized Views

| Type | Definition | Updates | Use Case |
|------|-----------|---------|----------|
| **View** | Saved query (virtual table) | Always current | Hiding complexity |
| **Materialized View** | Saved query result (actual data) | Manual refresh | Heavy reports, dashboards |

```sql
-- View (always current, but slow)
CREATE VIEW user_stats AS
SELECT user_id, COUNT(*) as orders FROM orders GROUP BY user_id;

-- Materialized View (fast, but stale)
CREATE MATERIALIZED VIEW user_stats AS
SELECT user_id, COUNT(*) as orders FROM orders GROUP BY user_id;

-- Refresh materialized view
REFRESH MATERIALIZED VIEW user_stats;
```

---

### Query Plans (EXPLAIN)

**Definition:** Shows HOW the database will execute your query.

```sql
EXPLAIN ANALYZE SELECT * FROM users WHERE email = 'test@example.com';

-- Output tells you:
-- ✅ Index Scan = Good (using index)
-- ❌ Seq Scan = Bad on large tables (scanning everything)
```

**When to use:** Slow queries, optimization, interviews!

---

## C. NoSQL (MongoDB)

### Document Modeling: Embedded vs Referenced

| Pattern | Structure | Best For | Avoid When |
|---------|----------|----------|------------|
| **Embedded** | Nested inside document | Data read together, 1:few relations | Data grows unbounded |
| **Referenced** | Separate documents linked by ID | Many:many relations, large subdocs | Need atomic updates |

```javascript
// Embedded (good for user's addresses)
{
    name: "Nabil",
    addresses: [
        { city: "Lagos", zip: "100001" },
        { city: "Abuja", zip: "900001" }
    ]
}

// Referenced (good for user's orders)
// User document
{ _id: "user123", name: "Nabil" }
// Order documents
{ _id: "order1", userId: "user123", total: 5000 }
{ _id: "order2", userId: "user123", total: 3000 }
```

---

### Aggregation Pipeline

**Definition:** MongoDB's way to transform and analyze data (like SQL GROUP BY on steroids).

```javascript
db.orders.aggregate([
    { $match: { status: "completed" } },           // Filter
    { $group: {                                     // Group
        _id: "$userId",
        totalSpent: { $sum: "$total" },
        orderCount: { $count: {} }
    }},
    { $sort: { totalSpent: -1 } },                 // Sort
    { $limit: 10 }                                  // Top 10
]);
```

---

### When MongoDB is a BAD Idea ❌

- **Many relationships:** Use SQL (JOINs are better)
- **ACID transactions across collections:** Limited support
- **Complex reporting:** SQL is more powerful
- **Financial data:** Integrity is critical

---

## D. ORM vs Raw SQL

| Approach | Speed (Dev) | Speed (Runtime) | Control |
|----------|-------------|-----------------|---------|
| **ORM (Prisma, TypeORM)** | 🚀 Fast | 🐢 Can be slow | Limited |
| **Raw SQL** | 🐢 Slower | 🚀 Optimized | Full |

**Senior Rule:** ORM for CRUD, raw SQL for complex queries.

```javascript
// Prisma (clean, but less control)
const users = await prisma.user.findMany({
    where: { status: 'active' },
    include: { orders: true }
});

// Raw SQL (full control)
const users = await prisma.$queryRaw`
    SELECT u.*, COUNT(o.id) as order_count
    FROM users u
    LEFT JOIN orders o ON u.id = o.user_id
    WHERE u.status = 'active'
    GROUP BY u.id
    HAVING COUNT(o.id) > 5
`;
```

---

# 2️⃣ NODE.JS INTERNALS

## Event Loop (THE Interview Question)

**Definition:** How Node.js handles async operations without multiple threads.

```
   ┌───────────────────────────┐
┌─>│           timers          │  setTimeout, setInterval
│  └─────────────┬─────────────┘
│  ┌─────────────┴─────────────┐
│  │     pending callbacks     │  I/O callbacks
│  └─────────────┬─────────────┘
│  ┌─────────────┴─────────────┐
│  │       idle, prepare       │  Internal
│  └─────────────┬─────────────┘
│  ┌─────────────┴─────────────┐
│  │           poll            │  Retrieve new I/O events
│  └─────────────┬─────────────┘
│  ┌─────────────┴─────────────┐
│  │           check           │  setImmediate
│  └─────────────┬─────────────┘
│  ┌─────────────┴─────────────┐
└──┤      close callbacks      │  socket.on('close')
   └───────────────────────────┘
```

### Microtasks vs Macrotasks

| Type | Examples | Priority |
|------|----------|----------|
| **Microtasks** | Promise.then, process.nextTick | 🥇 First (after each phase) |
| **Macrotasks** | setTimeout, setInterval, I/O | 🥈 Second (event loop phases) |

```javascript
console.log('1');                    // Sync

setTimeout(() => console.log('2'), 0);  // Macrotask

Promise.resolve().then(() => console.log('3'));  // Microtask

console.log('4');                    // Sync

// Output: 1, 4, 3, 2
// Microtask (Promise) runs BEFORE macrotask (setTimeout)
```

**Interview answer:** "Microtasks run between every phase of the event loop, before any macrotask."

---

## Streams & Buffers

### Streams

**Definition:** Process data piece by piece instead of loading everything into memory.

```javascript
// ❌ Bad: Load entire 2GB file into memory
const data = fs.readFileSync('huge-file.txt');

// ✅ Good: Stream it
const stream = fs.createReadStream('huge-file.txt');
stream.on('data', chunk => {
    console.log(`Received ${chunk.length} bytes`);
});
```

**Types of Streams:**
- **Readable:** Read from (files, HTTP requests)
- **Writable:** Write to (files, HTTP responses)
- **Duplex:** Both (TCP sockets)
- **Transform:** Modify data (compression)

---

### Buffers

**Definition:** Raw binary data in memory (before it becomes a string).

```javascript
// Create buffer
const buf = Buffer.from('Hello', 'utf-8');
console.log(buf);  // <Buffer 48 65 6c 6c 6f>

// Convert back
console.log(buf.toString());  // "Hello"
```

**When needed:** File uploads, images, crypto operations

---

## Worker Threads vs Cluster

| Feature | Worker Threads | Cluster |
|---------|---------------|---------|
| **Memory** | Shared (with SharedArrayBuffer) | Separate |
| **Use case** | CPU-intensive tasks | Multiple server instances |
| **Communication** | Direct | IPC (slower) |

```javascript
// Worker Threads: CPU-intensive work
const { Worker } = require('worker_threads');
const worker = new Worker('./heavy-calculation.js');

// Cluster: Scale across CPU cores
const cluster = require('cluster');
if (cluster.isMaster) {
    for (let i = 0; i < numCPUs; i++) {
        cluster.fork();
    }
} else {
    app.listen(3000);  // Each worker handles requests
}
```

---

## Async Patterns

### Error Propagation

```javascript
// ✅ Correct: Errors bubble up
async function getUser(id) {
    const user = await db.findUser(id);
    if (!user) throw new Error('User not found');
    return user;
}

// Caller handles errors
try {
    const user = await getUser(123);
} catch (error) {
    console.error('Failed:', error.message);
}
```

### Retry Strategy

```javascript
async function withRetry(fn, retries = 3, delay = 1000) {
    for (let i = 0; i < retries; i++) {
        try {
            return await fn();
        } catch (error) {
            if (i === retries - 1) throw error;
            await new Promise(r => setTimeout(r, delay * (i + 1)));  // Exponential backoff
        }
    }
}

// Usage
const data = await withRetry(() => fetchFromAPI('/users'));
```

### Circuit Breaker

**Definition:** Stop calling a failing service to prevent cascading failures.

```javascript
class CircuitBreaker {
    constructor(threshold = 5, timeout = 60000) {
        this.failures = 0;
        this.threshold = threshold;
        this.timeout = timeout;
        this.state = 'CLOSED';  // CLOSED = working, OPEN = broken
    }

    async call(fn) {
        if (this.state === 'OPEN') {
            throw new Error('Circuit is OPEN');
        }
        
        try {
            const result = await fn();
            this.failures = 0;
            return result;
        } catch (error) {
            this.failures++;
            if (this.failures >= this.threshold) {
                this.state = 'OPEN';
                setTimeout(() => this.state = 'HALF-OPEN', this.timeout);
            }
            throw error;
        }
    }
}
```

**When to use:** Third-party APIs, microservices
**When NOT to:** Internal database calls, critical paths

---

# 3️⃣ EXPRESS.JS — Production Level

## Middleware Lifecycle

```
Request → Middleware 1 → Middleware 2 → Route Handler → Response
              ↓               ↓               ↓
          (logging)      (auth check)    (business logic)
```

```javascript
// Middleware runs in ORDER
app.use(morgan('dev'));           // 1. Logging
app.use(cors());                   // 2. CORS
app.use(helmet());                 // 3. Security headers
app.use(express.json());           // 4. Parse JSON
app.use(authMiddleware);           // 5. Auth check
app.use('/api', routes);           // 6. Routes
app.use(errorHandler);             // 7. Error handling (LAST)
```

---

## Error Handling Middleware

```javascript
// Async errors need wrapper
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

// Route with async handler
app.get('/users/:id', asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id);
    if (!user) throw new NotFoundError('User not found');
    res.json(user);
}));

// Error handling middleware (4 parameters!)
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(err.status || 500).json({
        error: err.message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});
```

---

## Authentication: JWT vs Sessions

| Feature | JWT | Sessions |
|---------|-----|----------|
| **Storage** | Client (localStorage/cookie) | Server (Redis/DB) |
| **Scalability** | 🚀 Stateless | ⚠️ Need shared store |
| **Revocation** | ⚠️ Hard (use blacklist) | ✅ Easy (delete session) |
| **Size** | Larger (contains claims) | Small (just session ID) |

```javascript
// JWT Flow
// 1. Login → Generate token
const token = jwt.sign({ userId: user.id }, SECRET, { expiresIn: '1h' });

// 2. Client sends: Authorization: Bearer <token>

// 3. Middleware verifies
const authMiddleware = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    try {
        req.user = jwt.verify(token, SECRET);
        next();
    } catch {
        res.status(401).json({ error: 'Unauthorized' });
    }
};
```

---

## Layered Architecture

```
┌─────────────────────────────────────┐
│           Controllers               │  ← HTTP handling, validation
├─────────────────────────────────────┤
│            Services                 │  ← Business logic
├─────────────────────────────────────┤
│           Repositories              │  ← Database access
├─────────────────────────────────────┤
│            Database                 │
└─────────────────────────────────────┘
```

```javascript
// Controller: HTTP only
class UserController {
    async getUser(req, res) {
        const user = await userService.findById(req.params.id);
        res.json(user);
    }
}

// Service: Business logic
class UserService {
    async findById(id) {
        const user = await userRepository.findById(id);
        if (!user) throw new NotFoundError('User not found');
        return this.sanitize(user);
    }
}

// Repository: Database only
class UserRepository {
    async findById(id) {
        return prisma.user.findUnique({ where: { id } });
    }
}
```

---

# 4️⃣ NESTJS — Enterprise Node

## Core Concepts

### Modules
**Definition:** Containers that group related functionality.

```typescript
@Module({
    imports: [DatabaseModule],      // Other modules
    controllers: [UserController],  // Handle requests
    providers: [UserService],       // Business logic
    exports: [UserService]          // Share with other modules
})
export class UserModule {}
```

---

### Dependency Injection

**Definition:** Framework provides dependencies automatically.

```typescript
// NestJS injects UserService automatically
@Controller('users')
export class UserController {
    constructor(private userService: UserService) {}  // Injected!
    
    @Get(':id')
    getUser(@Param('id') id: string) {
        return this.userService.findById(id);
    }
}
```

**Why needed:** Loose coupling, easy testing, clean code

---

### Pipes, Guards, Interceptors, Filters

| Type | Purpose | Example |
|------|---------|---------|
| **Pipes** | Transform/validate input | Validate DTO, parse ID |
| **Guards** | Authorization | Check JWT, verify role |
| **Interceptors** | Modify request/response | Logging, caching, transform response |
| **Filters** | Handle exceptions | Catch errors, format response |

```
Request → Guards → Interceptors (before) → Pipes → Handler
                                                    ↓
Response ← Filters (on error) ← Interceptors (after) ←
```

```typescript
// Guard: Check if user is admin
@Injectable()
export class AdminGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean {
        const request = context.switchToHttp().getRequest();
        return request.user?.role === 'admin';
    }
}

// Usage
@UseGuards(AdminGuard)
@Delete(':id')
deleteUser(@Param('id') id: string) { ... }
```

---

### Custom Decorators

```typescript
// Create decorator that extracts user from request
export const CurrentUser = createParamDecorator(
    (data: unknown, ctx: ExecutionContext) => {
        const request = ctx.switchToHttp().getRequest();
        return request.user;
    }
);

// Usage
@Get('profile')
getProfile(@CurrentUser() user: User) {
    return user;
}
```

---

# 5️⃣ AUTHENTICATION & SECURITY

## Password Hashing

```javascript
// NEVER store plain passwords!
const bcrypt = require('bcrypt');

// Hash (on registration)
const hash = await bcrypt.hash(password, 12);  // 12 = cost factor

// Verify (on login)
const isValid = await bcrypt.compare(password, hash);
```

**bcrypt vs argon2:**
- **bcrypt:** Battle-tested, widely used
- **argon2:** Newer, more resistant to GPU attacks

---

## OAuth2 Flow (Simplified)

```
1. User clicks "Login with Google"
2. Redirect to Google's login page
3. User logs in, grants permissions
4. Google redirects back with authorization CODE
5. Your server exchanges code for ACCESS TOKEN
6. Use access token to get user info from Google
7. Create session/JWT for your app
```

---

## RBAC vs ABAC

| Type | Definition | Example |
|------|-----------|---------|
| **RBAC** | Role-Based Access Control | Admin can delete, User can read |
| **ABAC** | Attribute-Based Access Control | User can edit THEIR OWN posts |

```javascript
// RBAC
if (user.role === 'admin') {
    allowDelete();
}

// ABAC
if (post.authorId === user.id || user.role === 'admin') {
    allowEdit();
}
```

---

## Common Attacks

| Attack | What it Does | Prevention |
|--------|-------------|------------|
| **XSS** | Inject malicious scripts | Sanitize input, escape output, CSP headers |
| **CSRF** | Trick user into unwanted actions | CSRF tokens, SameSite cookies |
| **SQL Injection** | Inject SQL commands | Parameterized queries, ORMs |
| **NoSQL Injection** | Inject MongoDB operators | Validate input types |

```javascript
// SQL Injection ❌
const query = `SELECT * FROM users WHERE id = ${userId}`;

// Safe ✅
const query = 'SELECT * FROM users WHERE id = $1';
await db.query(query, [userId]);
```

---

# 6️⃣ SYSTEM DESIGN

## REST API Best Practices

```
GET    /users          → List users
GET    /users/:id      → Get one user
POST   /users          → Create user
PUT    /users/:id      → Replace user
PATCH  /users/:id      → Update user (partial)
DELETE /users/:id      → Delete user
```

### Idempotency

**Definition:** Same request multiple times = same result.

| Method | Idempotent? | Why? |
|--------|-------------|------|
| GET | ✅ Yes | Just reading |
| PUT | ✅ Yes | Replaces entire resource |
| DELETE | ✅ Yes | Already deleted = still deleted |
| POST | ❌ No | Creates new resource each time |

**Solution for POST:** Idempotency keys
```javascript
// Client sends unique key
POST /orders
Idempotency-Key: unique-uuid-here

// Server checks: already processed this key? Return cached response.
```

---

## Caching (Redis)

```javascript
async function getUser(id) {
    // Check cache first
    const cached = await redis.get(`user:${id}`);
    if (cached) return JSON.parse(cached);
    
    // Cache miss: get from DB
    const user = await db.users.findById(id);
    
    // Store in cache (expire in 1 hour)
    await redis.set(`user:${id}`, JSON.stringify(user), 'EX', 3600);
    
    return user;
}
```

### Cache Invalidation Strategies

| Strategy | How it Works | Use Case |
|----------|-------------|----------|
| **TTL** | Expire after time | General data |
| **Write-through** | Update cache on write | Strong consistency |
| **Write-behind** | Update cache, async write to DB | High write volume |
| **Cache-aside** | App manages cache manually | Most common |

---

## Message Queues

**Definition:** Async communication between services.

```
Producer → [Queue] → Consumer
(creates job)       (processes job)
```

**When to use:**
- Email sending
- Image processing
- Payment processing
- Inter-service communication

```javascript
// BullMQ example
const queue = new Queue('emails');

// Producer: Add job
await queue.add('welcome-email', { userId: 123, email: 'user@example.com' });

// Consumer: Process job
const worker = new Worker('emails', async (job) => {
    await sendEmail(job.data.email, 'Welcome!');
});
```

---

## Monolith vs Microservices

| Aspect | Monolith | Microservices |
|--------|----------|--------------|
| **Complexity** | Simple | Complex |
| **Deployment** | All or nothing | Independent |
| **Scaling** | Scale everything | Scale what's needed |
| **Team size** | Small teams | Large organizations |
| **Data** | Single database | Database per service |

**Rule:** Start monolith, split when needed.

---

# 7️⃣ PYTHON (Backend & Infra)

## FastAPI Basics

```python
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

app = FastAPI()

class User(BaseModel):
    name: str
    email: str

@app.get("/users/{user_id}")
async def get_user(user_id: int):
    user = await find_user(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@app.post("/users")
async def create_user(user: User):
    return await save_user(user)
```

**Why FastAPI:**
- Async support
- Automatic docs (Swagger)
- Type validation (Pydantic)
- Super fast

---

## When to Use Python vs Node

| Use Case | Python | Node |
|----------|--------|------|
| **APIs** | FastAPI/Django | Express/NestJS |
| **Real-time** | ⚠️ | ✅ WebSockets native |
| **ML/AI** | ✅ TensorFlow, PyTorch | ❌ |
| **Scripting** | ✅ Clean syntax | OK |
| **Web scraping** | ✅ BeautifulSoup | OK (Puppeteer) |

---

# 8️⃣ DEVOPS & PRODUCTION

## Docker Essentials

```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files first (cache layer)
COPY package*.json ./
RUN npm ci --only=production

# Copy source code
COPY . .

EXPOSE 3000
CMD ["node", "server.js"]
```

```yaml
# docker-compose.yml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgres://db:5432/myapp
    depends_on:
      - db
  
  db:
    image: postgres:14
    environment:
      POSTGRES_PASSWORD: secret
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

---

## Load Balancing

```
                    ┌─────────────┐
                    │   NGINX     │
                    │ Load Balancer│
                    └──────┬──────┘
           ┌───────────────┼───────────────┐
           ▼               ▼               ▼
    ┌──────────┐    ┌──────────┐    ┌──────────┐
    │  App 1   │    │  App 2   │    │  App 3   │
    └──────────┘    └──────────┘    └──────────┘
```

---

## PM2 for Production

```bash
# Start with PM2
pm2 start server.js -i max    # Use all CPU cores

# Monitor
pm2 monit

# Logs
pm2 logs

# Auto-restart on file changes
pm2 start server.js --watch
```

---

# 9️⃣ TESTING

## Test Pyramid

```
        /\
       /  \     E2E Tests (few, slow, expensive)
      /----\
     /      \   Integration Tests (some)
    /--------\
   /          \ Unit Tests (many, fast, cheap)
  /__________\
```

## Example Tests

```javascript
// Unit Test
describe('UserService', () => {
    it('should hash password', async () => {
        const hash = await userService.hashPassword('secret');
        expect(hash).not.toBe('secret');
        expect(hash.length).toBeGreaterThan(50);
    });
});

// Integration Test  
describe('POST /users', () => {
    it('should create user in database', async () => {
        const res = await request(app)
            .post('/users')
            .send({ email: 'test@example.com', password: 'secret' });
        
        expect(res.status).toBe(201);
        
        const user = await db.users.findByEmail('test@example.com');
        expect(user).toBeDefined();
    });
});
```

---

# 🔟 ENGINEER MINDSET

## Key Principles

1. **Tradeoffs over perfection**
   > "There's no perfect solution, only tradeoffs you can accept."

2. **Simplicity over cleverness**
   > "Clever code impresses for a day. Simple code lasts for years."

3. **Read logs before guessing**
   ```bash
   # Don't: "It's probably X..."
   # Do: 
   tail -f /var/log/app.log
   ```

4. **Know when NOT to over-engineer**
   - Don't build for scale you don't have
   - Don't implement patterns "just in case"
   - Start simple, refactor when needed

5. **Understand the "why"**
   - Why are we using Redis here?
   - Why choose MongoDB over PostgreSQL?
   - Why is this async?

---

## Interview Tips 🎯

1. **Always explain tradeoffs:**
   > "We could use X which gives us Y, but the tradeoff is Z..."

2. **Admit what you don't know:**
   > "I haven't used that in production, but my understanding is..."

3. **Think out loud:**
   > "Let me think through this... First we'd need to..."

4. **Ask clarifying questions:**
   > "What's the expected scale? Read-heavy or write-heavy?"

5. **Connect to real experience:**
   > "In my project, we faced a similar issue and solved it by..."

---

# 📝 Quick Reference Cheat Sheet

| Concept | One-liner |
|---------|-----------|
| **ACID** | Atomicity, Consistency, Isolation, Durability |
| **B-Tree** | Sorted index, good for ranges |
| **Event Loop** | How Node handles async without threads |
| **Microtask** | Promise.then, runs before macrotask |
| **JWT** | Stateless token with encoded claims |
| **RBAC** | Access based on role (admin, user) |
| **ABAC** | Access based on attributes (owner of post) |
| **Idempotency** | Same request = same result |
| **Cursor pagination** | Efficient for large datasets |
| **Circuit breaker** | Stop calling failing services |
| **CAP theorem** | Pick 2: Consistency, Availability, Partition tolerance |

---

> **Good luck on Thursday! 🚀**
> 
> Remember: They're not looking for someone who knows everything.
> They're looking for someone who **thinks clearly** and **communicates well**.
