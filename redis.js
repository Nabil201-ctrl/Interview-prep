/**
 * ============================================================================
 *                    REDIS INTERVIEW & REVISION GUIDE
 * ============================================================================
 * 
 * Comprehensive guide to Redis (Remote Dictionary Server) for interviews
 * and practical implementation.
 */

// ============================================================================
// SECTION 1: WHAT IS REDIS?
// ============================================================================

/**
 * DEFINITION:
 * Redis is an open-source, in-memory data structure store, used as a database,
 * cache, and message broker. It is a NoSQL Key-Value store.
 * 
 * CORE CHARACTERISTICS:
 * 1. In-Memory: Extremely fast (sub-millisecond latency).
 * 2. Single-Threaded: Uses an event loop (avoid complex race conditions).
 * 3. Persistence: Optional (can save to disk via RDB or AOF).
 * 4. Data Structures: Not just strings! Lists, Sets, Hashes, Sorted Sets, etc.
 * 
 * WHEN TO USE:
 * - Caching (reduce DB load)
 * - Session Management
 * - Real-time analytics / Leaderboards
 * - Pub/Sub (Messaging)
 * - Queues (Job processing)
 * 
 * WHEN NOT TO USE:
 * - Primary database for large datasets (RAM is expensive)
 * - Complex relational queries (No JOINS)
 * - Storing large binary files
 */


// ============================================================================
// SECTION 2: DATA TYPES
// ============================================================================

/**
 * 1. STRING: Basic key-value (Text, Binary, Numbers). Max 512MB.
 * 2. LIST: Linked list of strings. Good for stacks/queues.
 * 3. SET: Unordered collection of unique strings.
 * 4. SORTED SET (ZSET): Unique strings ordered by a score.
 * 5. HASH: Maps between string fields and string values (like an object).
 * 6. BITMAP: Bit-level operations.
 * 7. HYPERLOGLOG: Probabilistic uniqueness counting.
 * 8. GEOSPATIAL: Coordinate pairs.
 */


// ============================================================================
// SECTION 3: CONNECTING (Node.js with 'ioredis' or 'redis')
// ============================================================================

const Redis = require('ioredis');

// Basic Connection
async function connectToRedis() {
    // Default: localhost:6379
    const redis = new Redis();

    // Custom Connection
    const productionRedis = new Redis({
        host: 'redis-server.com',
        port: 6379,
        password: 'secret_password',
        db: 0, // Redis has 16 logical databases (0-15)
        retryStrategy: (times) => Math.min(times * 50, 2000) // Auto-reconnect
    });

    redis.on('connect', () => console.log('✅ Connected to Redis'));
    redis.on('error', (err) => console.error('❌ Redis Error:', err));

    return redis;
}


// ============================================================================
// SECTION 4: BASIC COMMANDS & OPERATIONS
// ============================================================================

async function redisOperations() {
    const redis = new Redis();

    // ========================================
    // STRINGS (Cache, Counters, Locks)
    // ========================================

    // SET & GET
    await redis.set('user:1:name', 'John Doe');
    const name = await redis.get('user:1:name');

    // SET with Expiry (TTL - Time To Live)
    // EX: seconds, PX: milliseconds
    await redis.set('session:123', 'active', 'EX', 3600); // Expires in 1 hour

    // Set only if NOT exists (NX) - Good for distributed locks
    const acquiredLock = await redis.set('lock:resource', 'holder_id', 'NX', 'EX', 10);

    // INCREMENT (Atomic counters)
    await redis.set('page_views', 0);
    await redis.incr('page_views');
    await redis.incrby('page_views', 10);


    // ========================================
    // HASHES (Objects, User Profiles)
    // ========================================
    // Good for storing objects to save memory vs separate keys

    await redis.hset('user:100', {
        name: 'Jane',
        email: 'jane@example.com',
        age: '25'
    });

    const email = await redis.hget('user:100', 'email');
    const allFields = await redis.hgetall('user:100'); // Returns object

    // Increment specific field in hash
    await redis.hincrby('user:100', 'age', 1);


    // ========================================
    // LISTS (Queues, Stacks, Activity Feeds)
    // ========================================

    // Add to Left (Head) or Right (Tail)
    await redis.lpush('tasks', 'task1');
    await redis.rpush('tasks', 'task2');

    // Pop from Left or Right
    const task = await redis.lpop('tasks'); // FIFO Queue behaviour if mixed with rpush

    // Get range (Pagination)
    const recentTasks = await redis.lrange('tasks', 0, 9); // First 10 items

    // Trim list (Keep only latest 100 items)
    await redis.ltrim('logs', 0, 99);


    // ========================================
    // SETS (Unique Tags, Friend Lists)
    // ========================================

    // Add members
    await redis.sadd('tags:nodejs', 'javascript', 'backend', 'backend'); // Duplicates ignored

    // Check membership
    const isMember = await redis.sismember('tags:nodejs', 'javascript'); // 1 (true)

    // Set Operations (Intersection, Union, Diff)
    const common = await redis.sinter('user:1:friends', 'user:2:friends');


    // ========================================
    // SORTED SETS (Leaderboards, Priority Queues)
    // ========================================
    // Uses a floating-point "score" to sort elements

    // ZADD key score member
    await redis.zadd('leaderboard', 100, 'Player1');
    await redis.zadd('leaderboard', 250, 'Player2');
    await redis.zadd('leaderboard', 50, 'Player3');

    // Get Top 3 (High to Low)
    const topPlayers = await redis.zrevrange('leaderboard', 0, 2, 'WITHSCORES');

    // Increment score
    await redis.zincrby('leaderboard', 10, 'Player1');
}


// ============================================================================
// SECTION 5: ADVANCED FEATURES
// ============================================================================

async function advancedFeatures() {
    const redis = new Redis();
    const subRedis = new Redis(); // Subscriber needs dedicated connection

    // ========================================
    // PUB/SUB (Real-time Messaging)
    // ========================================
    // Fire and forget. Messages are lost if no one listens.

    // Receiver
    subRedis.subscribe('notifications');
    subRedis.on('message', (channel, message) => {
        console.log(`Received ${message} on ${channel}`);
    });

    // Sender
    redis.publish('notifications', 'New User Signup!');


    // ========================================
    // TRANSACTIONS (Multi/Exec)
    // ========================================
    // Not strictly ACID like SQL. "All or nothing" execution, but no rollback on logic error.

    const pipeline = redis.multi();
    pipeline.set('key1', 'value1');
    pipeline.incr('counter');
    const results = await pipeline.exec(); // Executes all commands atomically


    // ========================================
    // PIPELINING (Performance)
    // ========================================
    // Send multiple commands without waiting for response of each (Batching)

    const pipeline2 = redis.pipeline();
    for (let i = 0; i < 100; i++) {
        pipeline2.set(`key:${i}`, i);
    }
    await pipeline2.exec();
}


// ============================================================================
// SECTION 6: CACHING STRATEGIES
// ============================================================================

/**
 * 1. Cache-Aside (Lazy Loading):
 *    - Check Cache.
 *    - If Hit: Return Cache.
 *    - If Miss: Read DB -> Write to Cache -> Return Data.
 * 
 * 2. Write-Through:
 *    - Write to Cache and DB simultaneously.
 *    - Pro: Consistent data.
 *    - Con: Higher write latency.
 * 
 * EVICTION POLICIES (When Redis is full):
 * - noeviction: Return error (default).
 * - allkeys-lru: Remove least recently used keys.
 * - volatile-lru: Remove LRU keys with an expiry set.
 * - allkeys-random: Remove random keys.
 */

async function cacheAsideExample(userId) {
    const redis = new Redis();
    const cacheKey = `user:${userId}`;

    // 1. Check Cache
    const cachedData = await redis.get(cacheKey);
    if (cachedData) {
        return JSON.parse(cachedData);
    }

    // 2. Fetch from DB (Simulated)
    const user = { id: userId, name: 'From DB' }; // Access Database here

    // 3. Write to Cache with Expiry
    await redis.set(cacheKey, JSON.stringify(user), 'EX', 600); // 10 mins

    return user;
}


// ============================================================================
// SECTION 7: INTERVIEW QUESTIONS
// ============================================================================

const interviewQA = {
    q1: {
        question: "Why is Redis so fast?",
        answer: "1. In-memory storage (Data lives in RAM). 2. Simple data structures. 3. Single-threaded event loop eliminates locking overhead and context switching."
    },
    q2: {
        question: "How does Redis handle persistence?",
        answer: `
        Two methods:
        1. RDB (Snapshot): Saves point-in-time snapshots of dataset to disk at intervals. (Compact, faster startup, but improved data loss risk).
        2. AOF (Append Only File): Logs every write operation. (Higher durability, larger file size, slower replay).
        `
    },
    q3: {
        question: "What happens if Redis runs out of memory?",
        answer: "It follows the configured 'maxmemory-policy'. Common is 'allkeys-lru' (evict least recently used). If 'noeviction' is set, write commands will fail."
    },
    q4: {
        question: "Redis Single-Threaded vs Node.js Single-Threaded?",
        answer: "Both use event loops. Redis processes commands one by one to ensure atomicity. It cannot use multiple CPU cores unless you run redis-cluster or multiple instances."
    },
    q5: {
        question: "What is the Thundering Herd problem?",
        answer: "When a popular cache item expires, thousands of requests miss the cache simultaneously and hit the database, causing a crash. Solution: Use mutex locks or probabilistic early expiration."
    },
    q6: {
        question: "How to handle distributed locks in Redis?",
        answer: "Use 'SET resource_name my_random_value NX PX 30000'. The NX flag ensures only one client can set the key. To release, use a Lua script to check if the value matches before deleting (to prevent deleting someone else's lock)."
    }
};


// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
    connectToRedis,
    redisOperations,
    advancedFeatures,
    cacheAsideExample,
    interviewQA
};
