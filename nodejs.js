/**
 * ============================================================================
 *                    NODE.JS INTERVIEW & REVISION GUIDE
 * ============================================================================
 * 
 * Comprehensive guide to Node.js internals, patterns, and best practices.
 */

// ============================================================================
// SECTION 1: WHAT IS NODE.JS?
// ============================================================================

/**
 * DEFINITION:
 * Node.js is an open-source, cross-platform JavaScript runtime environment
 * that executes JavaScript code outside a web browser.
 * 
 * CORE COMPONENTS:
 * 1. V8 Engine: Google's engine that compiles JS to machine code.
 * 2. Libuv: C++ library that handles the Event Loop and asynchronous I/O.
 * 3. Bindings: Connects JS code to C++ internals (Node API).
 * 
 * KEY CHARACTERISTICS:
 * - Single-Threaded Event Loop: Handles concurrency without creating threads for every request.
 * - Non-Blocking I/O: Operations like file reading or DB queries don't stop execution.
 * - Event-Driven: Architecture relies on emitting and listening for events.
 * 
 * WHEN TO USE:
 * - Real-time applications (Chat, Live updates)
 * - REST APIs / JSON APIs
 * - Single Page Application (SPA) backends
 * - Streaming applications
 * - Microservices
 * 
 * WHEN NOT TO USE:
 * - CPU-intensive tasks (Video encoding, complex math) - Blocks the Event Loop!
 *   (Unless you use Worker Threads or specialized services)
 */


// ============================================================================
// SECTION 2: THE EVENT LOOP
// ============================================================================

/**
 * THE HEART OF NODE.JS
 * The Event Loop allows Node.js to perform non-blocking I/O operations by
 * offloading operations to the system kernel whenever possible.
 * 
 * PHASES (Order of execution):
 * 1. Timers: setTimeout(), setInterval()
 * 2. Pending Callbacks: I/O callbacks deferred to the next loop iteration.
 * 3. Idle, Prepare: Internal use.
 * 4. Poll: Retrieve new I/O events; execute I/O related callbacks.
 * 5. Check: setImmediate() callbacks.
 * 6. Close Callbacks: socket.on('close', ...)
 * 
 * MICROTASK QUEUE (Runs BETWEEN phases):
 * - process.nextTick() (Highest priority)
 * - Promise.then() / catch() / finally()
 */

const fs = require('fs');

async function eventLoopExample() {
    console.log('1. Start');

    setTimeout(() => console.log('2. setTimeout'), 0);

    setImmediate(() => console.log('3. setImmediate'));

    process.nextTick(() => console.log('4. nextTick'));

    Promise.resolve().then(() => console.log('5. Promise'));

    fs.readFile(__filename, () => {
        console.log('6. I/O Callback');
        // Inside I/O callback, setImmediate is always faster than setTimeout
        setTimeout(() => console.log('7. Inner Timeout'), 0);
        setImmediate(() => console.log('8. Inner Immediate'));
    });

    console.log('9. End');

    /**
     * OUTPUT ORDER:
     * 1. Start
     * 9. End
     * 4. nextTick (Microtask - Priority 1)
     * 5. Promise (Microtask - Priority 2)
     * 2. setTimeout (Timers Phase)
     * 3. setImmediate (Check Phase)
     * 6. I/O Callback (Poll Phase)
     * 8. Inner Immediate (Check Phase runs after Poll)
     * 7. Inner Timeout (Timers Phase - next loop)
     */
}


// ============================================================================
// SECTION 3: IMPORTANT MODULES
// ============================================================================

/**
 * 1. fs (File System): Read/Write files.
 * 2. path: Handle file paths.
 * 3. http: Create servers.
 * 4. events: Event Emitter.
 * 5. stream: Handle streaming data.
 * 6. buffer: Handle binary data.
 * 7. cluster: Multi-core scalability.
 */

// --- FS MODULE (Promise-based is modern/preferred) ---
const fsPromises = require('fs').promises;

async function fileOperations() {
    try {
        // Read
        const data = await fsPromises.readFile('input.txt', 'utf8');

        // Write (Overwrite)
        await fsPromises.writeFile('output.txt', data);

        // Append
        await fsPromises.appendFile('logs.txt', '\nLog entry');

    } catch (err) {
        console.error('File Error:', err);
    }
}


// ============================================================================
// SECTION 4: EVENT EMITTER
// ============================================================================

/**
 * Observer Pattern implementation.
 * Most Node.js objects (streams, sockets, http) rely on this.
 */

const EventEmitter = require('events');

class MyEmitter extends EventEmitter { }
const myEmitter = new MyEmitter();

// Listener
myEmitter.on('event', (a, b) => {
    console.log(a, b, this); // 'this' works differently in arrow vs regular
});

// One-time Listener
myEmitter.once('onceEvent', () => {
    console.log('Only happens once');
});

// Emit
// myEmitter.emit('event', 'a', 'b');


// ============================================================================
// SECTION 5: STREAMS & BUFFERS
// ============================================================================

/**
 * STREAMS: Collections of data that might not be available all at once.
 * memory efficient (don't load whole file into RAM).
 * 
 * Types:
 * 1. Readable (fs.createReadStream)
 * 2. Writable (fs.createWriteStream)
 * 3. Duplex (Sockets - TCP)
 * 4. Transform (Zlib - Compression)
 */

async function streamExample() {
    // Bad way: Load entire file into memory
    // const file = fs.readFileSync('huge-video.mp4');
    // res.write(file);

    // Good way: Stream it
    const readStream = fs.createReadStream('huge-video.mp4');
    // readStream.pipe(res); // Sending to HTTP response

    // Piping through transform (Zipping)
    const zlib = require('zlib');
    const gzip = zlib.createGzip();

    // Read -> Compress -> Write
    // readStream.pipe(gzip).pipe(fs.createWriteStream('video.mp4.gz'));
}

/**
 * BUFFERS: Fixed-size chunks of memory (outside V8 heap) for binary data.
 */
const buf = Buffer.from('Hello');
// console.log(buf.toString('hex')); // 48656c6c6f
// console.log(buf.toString('base64')); // SGVsbG8=


// ============================================================================
// SECTION 6: SCALING & MULTITHREADING
// ============================================================================

/**
 * Since Node is single-threaded, how do we use multi-core CPUs?
 * 
 * 1. CLUSTER MODULE:
 *    - Forks the main process (Master).
 *    - Creates Workers (child processes) that share the same server port.
 *    - Best for HTTP servers.
 * 
 * 2. WORKER THREADS:
 *    - Unlike Cluster, threads share memory (ArrayBuffer).
 *    - Best for CPU-intensive tasks (Image processing, Encryption).
 */

const cluster = require('cluster');
const os = require('os');

if (cluster.isMaster) {
    // Master Process
    const numCPUs = os.cpus().length;
    console.log(`Master ${process.pid} is running`);

    // Fork workers
    for (let i = 0; i < numCPUs; i++) {
        cluster.fork();
    }

    cluster.on('exit', (worker, code, signal) => {
        console.log(`Worker ${worker.process.pid} died`);
        cluster.fork(); // Replace dead worker
    });
} else {
    // Worker Process
    /*
    http.createServer((req, res) => {
        res.writeHead(200);
        res.end('Hello World');
    }).listen(8000);
    */
    console.log(`Worker ${process.pid} started`);
}


// ============================================================================
// SECTION 7: INTERVIEW QUESTIONS
// ============================================================================

const interviewQA = {
    q1: {
        question: "Explain process.nextTick() vs setImmediate()",
        answer: "`process.nextTick()` fires immediately after the current operation completes, BEFORE the event loop continues. `setImmediate()` fires in the 'Check' phase of the next event loop iteration. nextTick can starve I/O if overused."
    },
    q2: {
        question: "Difference between fork() and spawn()?",
        answer: "`spawn()` creates a new process and streams data (stdout/stderr). `fork()` is a special instance of spawn that creates a Node.js process and adds a communication channel (IPC) to send messages back and forth."
    },
    q3: {
        question: "How does Node.js handle concurrency?",
        answer: "Through the Event Loop and Libuv. It delegates I/O operations (file system, network) to the OS kernel. When the operation completes, the kernel signals Node.js, and the callback is added to the poll queue."
    },
    q4: {
        question: "What is a Memory Leak in Node.js? How to detect?",
        answer: "When objects are no longer needed but are still referenced, preventing Garbage Collection. Common causes: Global variables, unclosed listeners, caching without expiry. Detect using `node --inspect` and Chrome DevTools Memory tab."
    },
    q5: {
        question: "CommonJS vs ES Modules?",
        answer: "CommonJS: `require()`, `module.exports`, synchronous loading (server-side default). ES Modules: `import`, `export`, asynchronous loading, tree-shaking support (standard in modern JS/Browsers)."
    },
    q6: {
        question: "What is callback hell and how to fix it?",
        answer: "Nested callbacks that make code hard to read/debug. Fixes: 1. Modularization (named functions). 2. Promises. 3. Async/Await (Syntactic sugar for Promises)."
    }
};


// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
    eventLoopExample,
    fileOperations,
    streamExample,
    interviewQA
};
