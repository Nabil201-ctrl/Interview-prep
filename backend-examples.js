/**
 * 🚀 Backend Engineering Interview - JavaScript Examples
 * Extracted from backend-interview-guide.md
 */

// =============================================================================
// 1️⃣ DATABASES — The Foundation
// =============================================================================

// --- CRUD Operations ---
// Create
await db.users.insert({ name: "Nabil", email: "nabil@example.com" });

// Read
await db.users.find({ email: "nabil@example.com" });

// Update
await db.users.update({ email: "nabil@example.com" }, { name: "Nabil Updated" });

// Delete
await db.users.delete({ email: "nabil@example.com" });


// --- Transactions (Bank Transfer Example) ---
const transaction = await db.startTransaction();
try {
    await transaction.debit(accountA, 100);
    await transaction.credit(accountB, 100);
    await transaction.commit();  // Both succeed ✅
} catch (error) {
    await transaction.rollback(); // Both fail ❌
}


// --- Pagination ---
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


// --- Connection Pooling ---
// Without pooling: 1000 requests = 1000 connections (💀 DB dies)
// With pooling: 1000 requests = 10 shared connections (✅ efficient)
const pool = new Pool({
    max: 20,        // Maximum connections
    min: 5,         // Minimum connections
    idleTimeout: 30000
});


// --- MongoDB: Embedded vs Referenced ---
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


// --- MongoDB Aggregation Pipeline ---
db.orders.aggregate([
    { $match: { status: "completed" } },           // Filter
    {
        $group: {                                     // Group
            _id: "$userId",
            totalSpent: { $sum: "$total" },
            orderCount: { $count: {} }
        }
    },
    { $sort: { totalSpent: -1 } },                 // Sort
    { $limit: 10 }                                  // Top 10
]);


// --- ORM vs Raw SQL ---
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


// =============================================================================
// 2️⃣ NODE.JS INTERNALS
// =============================================================================

// --- Microtasks vs Macrotasks ---
console.log('1');                    // Sync

setTimeout(() => console.log('2'), 0);  // Macrotask

Promise.resolve().then(() => console.log('3'));  // Microtask

console.log('4');                    // Sync

// Output: 1, 4, 3, 2
// Microtask (Promise) runs BEFORE macrotask (setTimeout)


// --- Streams ---
// ❌ Bad: Load entire 2GB file into memory
const data = fs.readFileSync('huge-file.txt');

// ✅ Good: Stream it
const stream = fs.createReadStream('huge-file.txt');
stream.on('data', chunk => {
    console.log(`Received ${chunk.length} bytes`);
});


// --- Buffers ---
// Create buffer
const buf = Buffer.from('Hello', 'utf-8');
console.log(buf);  // <Buffer 48 65 6c 6c 6f>

// Convert back
console.log(buf.toString());  // "Hello"


// --- Worker Threads vs Cluster ---
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


// --- Error Propagation ---
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


// --- Retry Strategy ---
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


// --- Circuit Breaker ---
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


// =============================================================================
// 3️⃣ EXPRESS.JS — Production Level
// =============================================================================

// --- Middleware Lifecycle ---
// Middleware runs in ORDER
app.use(morgan('dev'));           // 1. Logging
app.use(cors());                   // 2. CORS
app.use(helmet());                 // 3. Security headers
app.use(express.json());           // 4. Parse JSON
app.use(authMiddleware);           // 5. Auth check
app.use('/api', routes);           // 6. Routes
app.use(errorHandler);             // 7. Error handling (LAST)


// --- Error Handling Middleware ---
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


// --- JWT Authentication Flow ---
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


// --- Layered Architecture ---
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


// =============================================================================
// 5️⃣ AUTHENTICATION & SECURITY
// =============================================================================

// --- Password Hashing ---
// NEVER store plain passwords!
const bcrypt = require('bcrypt');

// Hash (on registration)
const hash = await bcrypt.hash(password, 12);  // 12 = cost factor

// Verify (on login)
const isValid = await bcrypt.compare(password, hash);


// --- RBAC vs ABAC ---
// RBAC
if (user.role === 'admin') {
    allowDelete();
}

// ABAC
if (post.authorId === user.id || user.role === 'admin') {
    allowEdit();
}


// =============================================================================
// 6️⃣ SYSTEM DESIGN
// =============================================================================

// --- Caching with Redis ---
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


// --- Message Queues (BullMQ) ---
const queue = new Queue('emails');

// Producer: Add job
await queue.add('welcome-email', { userId: 123, email: 'user@example.com' });

// Consumer: Process job
const worker = new Worker('emails', async (job) => {
    await sendEmail(job.data.email, 'Welcome!');
});


// =============================================================================
// 9️⃣ TESTING
// =============================================================================

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
