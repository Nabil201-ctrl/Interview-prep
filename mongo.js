/**
 * ============================================================================
 *                    MONGODB INTERVIEW & REVISION GUIDE
 * ============================================================================
 * 
 * This comprehensive guide covers everything you need to know about MongoDB
 * for interviews and practical implementation.
 */

// ============================================================================
// SECTION 1: WHAT IS MONGODB?
// ============================================================================

/**
 * DEFINITION:
 * MongoDB is a NoSQL, document-oriented database that stores data in flexible,
 * JSON-like documents (BSON - Binary JSON). Unlike traditional relational
 * databases (SQL), it doesn't use tables and rows.
 * 
 * WHY USE MONGODB?
 * 1. Flexible Schema - Documents can have different structures
 * 2. Scalability - Easy horizontal scaling (sharding)
 * 3. Performance - Fast reads/writes for large datasets
 * 4. Developer Friendly - Uses JSON-like syntax
 * 5. Rich Query Language - Powerful aggregation framework
 * 
 * WHEN TO USE:
 * - Real-time analytics
 * - Content management systems
 * - Mobile applications
 * - IoT applications
 * - Catalogs and user profiles
 * 
 * WHEN NOT TO USE:
 * - Complex transactions across multiple collections
 * - Highly structured data with many relationships
 * - When ACID compliance is critical
 */


// ============================================================================
// SECTION 2: KEY TERMINOLOGY
// ============================================================================

/**
 * DATABASE COMPARISON: SQL vs MongoDB
 * 
 * SQL Term          | MongoDB Term
 * ------------------|------------------
 * Database          | Database
 * Table             | Collection
 * Row               | Document
 * Column            | Field
 * Index             | Index
 * Primary Key       | _id (auto-generated ObjectId)
 * Foreign Key       | Reference (using ObjectId)
 * JOIN              | $lookup (aggregation)
 */

const terminology = {
    // Document: Basic unit of data (like a row in SQL)
    document: {
        _id: "ObjectId('507f1f77bcf86cd799439011')", // Unique identifier
        name: "John Doe",
        email: "john@example.com",
        age: 30,
        hobbies: ["reading", "gaming"], // Arrays are allowed!
        address: {                       // Nested documents are allowed!
            city: "Lagos",
            country: "Nigeria"
        }
    },

    // Collection: Group of documents (like a table in SQL)
    collection: "users", // Contains multiple user documents

    // BSON: Binary JSON (MongoDB's storage format)
    // Supports more data types than JSON: Date, Binary, ObjectId, etc.
};


// ============================================================================
// SECTION 3: CONNECTING TO MONGODB
// ============================================================================

const mongoose = require('mongoose');

/**
 * MONGOOSE: The most popular MongoDB ODM (Object Data Modeling)
 * 
 * WHY USE MONGOOSE?
 * 1. Schema validation
 * 2. Type casting
 * 3. Query building
 * 4. Middleware (hooks)
 * 5. Population (joining documents)
 */

// Connection String Structure:
// mongodb://username:password@host:port/database?options
// mongodb+srv://username:password@cluster.mongodb.net/database (Atlas)

async function connectToMongoDB() {
    try {
        // Basic connection
        await mongoose.connect('mongodb://localhost:27017/myapp', {
            // Connection options (Mongoose 6+ has sensible defaults)
        });

        console.log('✅ MongoDB Connected Successfully');

        // Connection events
        mongoose.connection.on('error', (err) => {
            console.error('MongoDB connection error:', err);
        });

        mongoose.connection.on('disconnected', () => {
            console.log('MongoDB disconnected');
        });

    } catch (error) {
        console.error('❌ MongoDB Connection Failed:', error.message);
        process.exit(1);
    }
}

// Production connection with options
async function connectToMongoDBProduction() {
    const options = {
        maxPoolSize: 10,           // Maximum connections in pool
        serverSelectionTimeoutMS: 5000, // Timeout for server selection
        socketTimeoutMS: 45000,    // Timeout for socket operations
        family: 4                  // Use IPv4
    };

    await mongoose.connect(process.env.MONGODB_URI, options);
}


// ============================================================================
// SECTION 4: SCHEMAS & MODELS
// ============================================================================

/**
 * SCHEMA: Defines the structure of documents in a collection
 * MODEL: A compiled version of the schema that provides an interface to the database
 * 
 * Schema → Model → Document
 * Blueprint → Constructor → Instance
 */

const { Schema, model } = mongoose;

// ----------------------
// BASIC SCHEMA EXAMPLE
// ----------------------
const userSchema = new Schema({
    // String with validation
    name: {
        type: String,
        required: [true, 'Name is required'],
        trim: true,                    // Remove whitespace
        minlength: [2, 'Name must be at least 2 characters'],
        maxlength: [50, 'Name cannot exceed 50 characters']
    },

    // Email with custom validation
    email: {
        type: String,
        required: true,
        unique: true,                  // Creates unique index
        lowercase: true,               // Convert to lowercase
        validate: {
            validator: function (v) {
                return /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(v);
            },
            message: props => `${props.value} is not a valid email!`
        }
    },

    // Number with min/max
    age: {
        type: Number,
        min: [0, 'Age cannot be negative'],
        max: [120, 'Age seems unrealistic']
    },

    // Enum - restricted values
    role: {
        type: String,
        enum: ['user', 'admin', 'moderator'],
        default: 'user'
    },

    // Boolean with default
    isActive: {
        type: Boolean,
        default: true
    },

    // Date
    createdAt: {
        type: Date,
        default: Date.now
    },

    // Array of strings
    tags: [String],

    // Array of objects
    socialLinks: [{
        platform: String,
        url: String
    }],

    // Nested object (subdocument)
    profile: {
        bio: String,
        avatar: String,
        website: String
    },

    // Reference to another collection (like foreign key)
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: 'User'                    // Reference to User model
    }
}, {
    // Schema options
    timestamps: true,                  // Adds createdAt and updatedAt
    collection: 'users',               // Explicit collection name
    toJSON: { virtuals: true },        // Include virtuals in JSON
    toObject: { virtuals: true }
});

// Create the model
const User = model('User', userSchema);


// ----------------------
// SCHEMA TYPES REFERENCE
// ----------------------
const allSchemaTypes = {
    string: String,
    number: Number,
    date: Date,
    buffer: Buffer,                    // For binary data
    boolean: Boolean,
    mixed: Schema.Types.Mixed,         // Any type (flexible)
    objectId: Schema.Types.ObjectId,   // Reference to other docs
    array: [],                         // Array
    decimal: Schema.Types.Decimal128,  // High precision decimals
    map: Map,                          // Key-value pairs
    uuid: Schema.Types.UUID            // UUID type
};


// ----------------------
// ADVANCED SCHEMA: E-COMMERCE PRODUCT
// ----------------------
const productSchema = new Schema({
    name: {
        type: String,
        required: true,
        index: true                    // Create index for faster queries
    },

    slug: {
        type: String,
        unique: true
    },

    price: {
        type: Number,
        required: true,
        min: 0
    },

    discountPrice: Number,

    description: {
        type: String,
        maxlength: 2000
    },

    // Array of image URLs
    images: [{
        url: String,
        altText: String
    }],

    // Category reference
    category: {
        type: Schema.Types.ObjectId,
        ref: 'Category',
        required: true
    },

    // Stock management
    stock: {
        type: Number,
        default: 0,
        min: 0
    },

    // Ratings
    ratings: {
        average: {
            type: Number,
            default: 0,
            min: 0,
            max: 5
        },
        count: {
            type: Number,
            default: 0
        }
    },

    // Status
    status: {
        type: String,
        enum: ['draft', 'published', 'archived'],
        default: 'draft'
    },

    // SEO fields
    seo: {
        metaTitle: String,
        metaDescription: String,
        keywords: [String]
    }
}, { timestamps: true });

const Product = model('Product', productSchema);


// ============================================================================
// SECTION 5: VIRTUALS, METHODS & STATICS
// ============================================================================

/**
 * VIRTUALS: Computed properties that are not stored in the database
 * METHODS: Instance methods - called on documents
 * STATICS: Model methods - called on the model itself
 */

// ----------------------
// VIRTUALS
// ----------------------
userSchema.virtual('fullName').get(function () {
    return `${this.firstName} ${this.lastName}`;
});

// Virtual with setter
userSchema.virtual('fullName').set(function (name) {
    const parts = name.split(' ');
    this.firstName = parts[0];
    this.lastName = parts[1];
});

// Virtual populate (for reverse references)
userSchema.virtual('posts', {
    ref: 'Post',
    localField: '_id',
    foreignField: 'author'
});

// ----------------------
// INSTANCE METHODS
// ----------------------
userSchema.methods.comparePassword = async function (candidatePassword) {
    const bcrypt = require('bcrypt');
    return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.generateAuthToken = function () {
    const jwt = require('jsonwebtoken');
    return jwt.sign(
        { id: this._id, email: this.email },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
    );
};

// Usage: const isMatch = await user.comparePassword('password123');

// ----------------------
// STATIC METHODS
// ----------------------
userSchema.statics.findByEmail = function (email) {
    return this.findOne({ email: email.toLowerCase() });
};

userSchema.statics.findActiveUsers = function () {
    return this.find({ isActive: true });
};

// Usage: const user = await User.findByEmail('john@example.com');


// ============================================================================
// SECTION 6: MIDDLEWARE (HOOKS)
// ============================================================================

/**
 * MIDDLEWARE: Functions that run at specific stages of the document lifecycle
 * 
 * Types:
 * - Document middleware: save, validate, remove
 * - Query middleware: find, findOne, updateOne, deleteOne
 * - Aggregate middleware: aggregate
 */

// ----------------------
// PRE MIDDLEWARE (runs BEFORE the operation)
// ----------------------

// Hash password before saving
userSchema.pre('save', async function (next) {
    // Only hash if password is modified
    if (!this.isModified('password')) return next();

    const bcrypt = require('bcrypt');
    this.password = await bcrypt.hash(this.password, 12);
    next();
});

// Generate slug before saving product
productSchema.pre('save', function (next) {
    if (this.isModified('name')) {
        this.slug = this.name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '');
    }
    next();
});

// Update 'updatedAt' on every save
userSchema.pre('save', function (next) {
    this.updatedAt = new Date();
    next();
});

// ----------------------
// POST MIDDLEWARE (runs AFTER the operation)
// ----------------------

// Log after user is saved
userSchema.post('save', function (doc) {
    console.log(`User ${doc.email} was saved`);
});

// Send welcome email after user creation
userSchema.post('save', async function (doc, next) {
    if (doc.wasNew) { // Check if this is a new document
        // await sendWelcomeEmail(doc.email);
    }
    next();
});

// ----------------------
// QUERY MIDDLEWARE
// ----------------------

// Automatically exclude inactive users from queries
userSchema.pre(/^find/, function (next) {
    // 'this' refers to the query
    this.where({ isActive: { $ne: false } });
    next();
});

// Log query execution time
userSchema.pre('find', function () {
    this._startTime = Date.now();
});

userSchema.post('find', function () {
    console.log(`Query took ${Date.now() - this._startTime}ms`);
});


// ============================================================================
// SECTION 7: CRUD OPERATIONS
// ============================================================================

/**
 * CRUD: Create, Read, Update, Delete
 * The fundamental database operations
 */

async function crudOperations() {

    // ========================================
    // CREATE - Adding new documents
    // ========================================

    // Method 1: Using save()
    const user1 = new User({
        name: 'John Doe',
        email: 'john@example.com',
        age: 30
    });
    await user1.save();

    // Method 2: Using create() - shortcut
    const user2 = await User.create({
        name: 'Jane Smith',
        email: 'jane@example.com',
        age: 25
    });

    // Method 3: Insert many documents
    const users = await User.insertMany([
        { name: 'User 1', email: 'user1@example.com' },
        { name: 'User 2', email: 'user2@example.com' },
        { name: 'User 3', email: 'user3@example.com' }
    ]);


    // ========================================
    // READ - Querying documents
    // ========================================

    // Find all documents
    const allUsers = await User.find();

    // Find with conditions
    const activeUsers = await User.find({ isActive: true });

    // Find one document
    const john = await User.findOne({ name: 'John Doe' });

    // Find by ID
    const userById = await User.findById('507f1f77bcf86cd799439011');

    // Select specific fields (projection)
    const userNames = await User.find().select('name email');
    const usersWithoutPassword = await User.find().select('-password');

    // Sorting
    const sortedUsers = await User.find().sort({ createdAt: -1 }); // Descending
    const sortAscending = await User.find().sort({ name: 1 });     // Ascending
    const multiSort = await User.find().sort({ age: -1, name: 1 });

    // Pagination
    const page = 1;
    const limit = 10;
    const skip = (page - 1) * limit;
    const paginatedUsers = await User.find()
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 });

    // Count documents
    const totalUsers = await User.countDocuments();
    const activeCount = await User.countDocuments({ isActive: true });

    // Check if document exists
    const exists = await User.exists({ email: 'john@example.com' });

    // Distinct values
    const uniqueRoles = await User.distinct('role');


    // ========================================
    // UPDATE - Modifying documents
    // ========================================

    // Update one document
    await User.updateOne(
        { email: 'john@example.com' },     // Filter
        { $set: { age: 31 } }              // Update
    );

    // Update many documents
    await User.updateMany(
        { isActive: false },
        { $set: { status: 'inactive' } }
    );

    // Find and update (returns the document)
    const updatedUser = await User.findOneAndUpdate(
        { email: 'john@example.com' },
        { $set: { age: 32 } },
        { new: true }                       // Return updated document
    );

    // Find by ID and update
    const updatedById = await User.findByIdAndUpdate(
        '507f1f77bcf86cd799439011',
        { $inc: { loginCount: 1 } },
        { new: true, runValidators: true }
    );

    // Upsert - Update or Insert if not found
    await User.findOneAndUpdate(
        { email: 'new@example.com' },
        { $set: { name: 'New User' } },
        { upsert: true, new: true }
    );


    // ========================================
    // DELETE - Removing documents
    // ========================================

    // Delete one
    await User.deleteOne({ email: 'john@example.com' });

    // Delete many
    await User.deleteMany({ isActive: false });

    // Find and delete (returns deleted document)
    const deletedUser = await User.findOneAndDelete({ email: 'jane@example.com' });

    // Find by ID and delete
    await User.findByIdAndDelete('507f1f77bcf86cd799439011');
}


// ============================================================================
// SECTION 8: QUERY OPERATORS
// ============================================================================

/**
 * MongoDB provides powerful query operators for complex queries
 */

async function queryOperators() {

    // ========================================
    // COMPARISON OPERATORS
    // ========================================

    // $eq - Equal
    await User.find({ age: { $eq: 30 } });
    // Same as: await User.find({ age: 30 });

    // $ne - Not equal
    await User.find({ role: { $ne: 'admin' } });

    // $gt - Greater than
    await User.find({ age: { $gt: 21 } });

    // $gte - Greater than or equal
    await User.find({ age: { $gte: 18 } });

    // $lt - Less than
    await User.find({ age: { $lt: 65 } });

    // $lte - Less than or equal
    await User.find({ age: { $lte: 30 } });

    // $in - Match any value in array
    await User.find({ role: { $in: ['admin', 'moderator'] } });

    // $nin - Not in array
    await User.find({ status: { $nin: ['banned', 'deleted'] } });

    // Range query (combination)
    await User.find({ age: { $gte: 18, $lte: 65 } });


    // ========================================
    // LOGICAL OPERATORS
    // ========================================

    // $and - All conditions must be true
    await User.find({
        $and: [
            { age: { $gte: 18 } },
            { isActive: true }
        ]
    });
    // Same as: await User.find({ age: { $gte: 18 }, isActive: true });

    // $or - Any condition can be true
    await User.find({
        $or: [
            { role: 'admin' },
            { role: 'moderator' }
        ]
    });

    // $not - Negates the condition
    await User.find({
        age: { $not: { $lt: 18 } }
    });

    // $nor - None of the conditions should be true
    await User.find({
        $nor: [
            { isActive: false },
            { role: 'banned' }
        ]
    });


    // ========================================
    // ELEMENT OPERATORS
    // ========================================

    // $exists - Check if field exists
    await User.find({ phone: { $exists: true } });
    await User.find({ deletedAt: { $exists: false } });

    // $type - Check field type
    await User.find({ age: { $type: 'number' } });


    // ========================================
    // ARRAY OPERATORS
    // ========================================

    // $all - Array contains all specified elements
    await User.find({ tags: { $all: ['developer', 'nodejs'] } });

    // $elemMatch - Match array element with multiple conditions
    await User.find({
        scores: {
            $elemMatch: { $gte: 80, $lte: 100 }
        }
    });

    // $size - Array has specific length
    await User.find({ hobbies: { $size: 3 } });


    // ========================================
    // TEXT SEARCH
    // ========================================

    // First, create a text index
    // userSchema.index({ name: 'text', bio: 'text' });

    // Then search
    await User.find({
        $text: { $search: 'john developer' }
    });

    // Search with score
    await User.find(
        { $text: { $search: 'nodejs' } },
        { score: { $meta: 'textScore' } }
    ).sort({ score: { $meta: 'textScore' } });


    // ========================================
    // REGEX - Pattern matching
    // ========================================

    // Find names starting with 'J'
    await User.find({ name: /^J/ });

    // Case insensitive search
    await User.find({ name: { $regex: 'john', $options: 'i' } });

    // Email domain search
    await User.find({ email: /@gmail\.com$/i });
}


// ============================================================================
// SECTION 9: UPDATE OPERATORS
// ============================================================================

async function updateOperators() {

    // ========================================
    // FIELD UPDATE OPERATORS
    // ========================================

    // $set - Set field value
    await User.updateOne(
        { _id: userId },
        { $set: { name: 'New Name', age: 31 } }
    );

    // $unset - Remove field
    await User.updateOne(
        { _id: userId },
        { $unset: { temporaryField: '' } }
    );

    // $inc - Increment number
    await User.updateOne(
        { _id: userId },
        { $inc: { loginCount: 1, points: 10 } }
    );

    // $mul - Multiply number
    await User.updateOne(
        { _id: userId },
        { $mul: { price: 1.1 } }  // Increase by 10%
    );

    // $min - Only update if new value is less
    await User.updateOne(
        { _id: userId },
        { $min: { lowestScore: 50 } }
    );

    // $max - Only update if new value is greater
    await User.updateOne(
        { _id: userId },
        { $max: { highestScore: 100 } }
    );

    // $rename - Rename a field
    await User.updateOne(
        { _id: userId },
        { $rename: { 'oldField': 'newField' } }
    );

    // $currentDate - Set to current date
    await User.updateOne(
        { _id: userId },
        { $currentDate: { lastModified: true } }
    );


    // ========================================
    // ARRAY UPDATE OPERATORS
    // ========================================

    // $push - Add to array
    await User.updateOne(
        { _id: userId },
        { $push: { hobbies: 'swimming' } }
    );

    // $push with $each - Add multiple items
    await User.updateOne(
        { _id: userId },
        { $push: { hobbies: { $each: ['reading', 'coding'] } } }
    );

    // $push with $position - Add at specific position
    await User.updateOne(
        { _id: userId },
        { $push: { hobbies: { $each: ['gaming'], $position: 0 } } }
    );

    // $addToSet - Add only if not exists (no duplicates)
    await User.updateOne(
        { _id: userId },
        { $addToSet: { tags: 'developer' } }
    );

    // $pop - Remove first (-1) or last (1) element
    await User.updateOne(
        { _id: userId },
        { $pop: { hobbies: 1 } }  // Remove last
    );

    // $pull - Remove specific element
    await User.updateOne(
        { _id: userId },
        { $pull: { hobbies: 'swimming' } }
    );

    // $pullAll - Remove multiple elements
    await User.updateOne(
        { _id: userId },
        { $pullAll: { hobbies: ['swimming', 'running'] } }
    );

    // $ positional operator - Update matched array element
    await User.updateOne(
        { _id: userId, 'items.productId': productId },
        { $set: { 'items.$.quantity': 5 } }
    );

    // $[] - Update all array elements
    await User.updateOne(
        { _id: userId },
        { $inc: { 'scores.$[]': 10 } }  // Add 10 to all scores
    );
}


// ============================================================================
// SECTION 10: AGGREGATION PIPELINE
// ============================================================================

/**
 * AGGREGATION: Powerful data processing framework
 * Documents pass through stages in a pipeline, each stage transforms the data
 * 
 * Common stages: $match, $group, $sort, $project, $limit, $skip, $lookup, $unwind
 */

async function aggregationExamples() {

    // ========================================
    // BASIC AGGREGATION
    // ========================================

    // Count users by role
    const usersByRole = await User.aggregate([
        {
            $group: {
                _id: '$role',
                count: { $sum: 1 }
            }
        }
    ]);
    // Result: [{ _id: 'admin', count: 5 }, { _id: 'user', count: 100 }]


    // ========================================
    // $MATCH - Filter documents (like find)
    // ========================================

    const activeAdmins = await User.aggregate([
        {
            $match: {
                isActive: true,
                role: 'admin'
            }
        }
    ]);


    // ========================================
    // $GROUP - Group and aggregate
    // ========================================

    // Average age by role
    const avgAgeByRole = await User.aggregate([
        {
            $group: {
                _id: '$role',
                averageAge: { $avg: '$age' },
                minAge: { $min: '$age' },
                maxAge: { $max: '$age' },
                totalUsers: { $sum: 1 }
            }
        }
    ]);

    // Total sales by product
    const salesByProduct = await Order.aggregate([
        {
            $group: {
                _id: '$productId',
                totalSales: { $sum: '$amount' },
                orderCount: { $sum: 1 },
                avgOrderValue: { $avg: '$amount' }
            }
        }
    ]);


    // ========================================
    // $PROJECT - Shape output documents
    // ========================================

    const userProfiles = await User.aggregate([
        {
            $project: {
                fullName: { $concat: ['$firstName', ' ', '$lastName'] },
                email: 1,
                age: 1,
                isAdult: { $gte: ['$age', 18] },
                yearOfBirth: { $subtract: [2024, '$age'] }
            }
        }
    ]);


    // ========================================
    // $SORT, $LIMIT, $SKIP - Ordering & Pagination
    // ========================================

    const topUsers = await User.aggregate([
        { $match: { isActive: true } },
        { $sort: { points: -1 } },
        { $skip: 0 },
        { $limit: 10 },
        { $project: { name: 1, points: 1 } }
    ]);


    // ========================================
    // $LOOKUP - Join collections (like SQL JOIN)
    // ========================================

    const ordersWithUserDetails = await Order.aggregate([
        {
            $lookup: {
                from: 'users',              // Collection to join
                localField: 'userId',       // Field in orders
                foreignField: '_id',        // Field in users
                as: 'user'                  // Output array field
            }
        },
        { $unwind: '$user' },           // Convert array to object
        {
            $project: {
                orderNumber: 1,
                amount: 1,
                'user.name': 1,
                'user.email': 1
            }
        }
    ]);


    // ========================================
    // $UNWIND - Deconstruct arrays
    // ========================================

    // Each tag becomes a separate document
    const usersByTag = await User.aggregate([
        { $unwind: '$tags' },
        {
            $group: {
                _id: '$tags',
                users: { $push: '$name' },
                count: { $sum: 1 }
            }
        }
    ]);


    // ========================================
    // COMPLEX AGGREGATION EXAMPLE
    // ========================================

    // Monthly sales report with product details
    const monthlySalesReport = await Order.aggregate([
        // Stage 1: Filter date range
        {
            $match: {
                createdAt: {
                    $gte: new Date('2024-01-01'),
                    $lt: new Date('2025-01-01')
                },
                status: 'completed'
            }
        },

        // Stage 2: Lookup product details
        {
            $lookup: {
                from: 'products',
                localField: 'productId',
                foreignField: '_id',
                as: 'product'
            }
        },
        { $unwind: '$product' },

        // Stage 3: Group by month and product category
        {
            $group: {
                _id: {
                    month: { $month: '$createdAt' },
                    year: { $year: '$createdAt' },
                    category: '$product.category'
                },
                totalRevenue: { $sum: '$amount' },
                orderCount: { $sum: 1 },
                avgOrderValue: { $avg: '$amount' }
            }
        },

        // Stage 4: Sort by month
        { $sort: { '_id.year': 1, '_id.month': 1 } },

        // Stage 5: Format output
        {
            $project: {
                _id: 0,
                month: '$_id.month',
                year: '$_id.year',
                category: '$_id.category',
                totalRevenue: { $round: ['$totalRevenue', 2] },
                orderCount: 1,
                avgOrderValue: { $round: ['$avgOrderValue', 2] }
            }
        }
    ]);


    // ========================================
    // AGGREGATION OPERATORS REFERENCE
    // ========================================

    const operators = {
        // Arithmetic
        $add: 'Add numbers',
        $subtract: 'Subtract numbers',
        $multiply: 'Multiply numbers',
        $divide: 'Divide numbers',
        $mod: 'Modulo',
        $round: 'Round to decimal places',

        // String
        $concat: 'Concatenate strings',
        $substr: 'Get substring',
        $toLower: 'Convert to lowercase',
        $toUpper: 'Convert to uppercase',
        $trim: 'Trim whitespace',

        // Date
        $year: 'Extract year',
        $month: 'Extract month',
        $dayOfMonth: 'Extract day',
        $hour: 'Extract hour',
        $minute: 'Extract minute',
        $dateToString: 'Format date as string',

        // Conditional
        $cond: 'If-then-else',
        $ifNull: 'Null check with default',
        $switch: 'Switch case',

        // Array
        $size: 'Array length',
        $arrayElemAt: 'Get element at index',
        $first: 'First element',
        $last: 'Last element',
        $filter: 'Filter array elements',
        $map: 'Transform array elements',

        // Accumulator (for $group)
        $sum: 'Sum values',
        $avg: 'Average values',
        $min: 'Minimum value',
        $max: 'Maximum value',
        $push: 'Push to array',
        $addToSet: 'Push unique to array',
        $first: 'First document value',
        $last: 'Last document value'
    };
}


// ============================================================================
// SECTION 11: INDEXES
// ============================================================================

/**
 * INDEXES: Data structures that improve query performance
 * 
 * WHY USE INDEXES?
 * - Faster query execution
 * - Efficient sorting
 * - Unique constraints
 * 
 * TRADE-OFFS:
 * - Takes up storage space
 * - Slows down writes (inserts, updates, deletes)
 */

// ----------------------
// CREATING INDEXES
// ----------------------

// Single field index
userSchema.index({ email: 1 });           // Ascending
userSchema.index({ createdAt: -1 });      // Descending

// Compound index (multiple fields)
userSchema.index({ lastName: 1, firstName: 1 });

// Unique index
userSchema.index({ email: 1 }, { unique: true });

// Sparse index (only index documents that have the field)
userSchema.index({ phone: 1 }, { sparse: true });

// TTL index (auto-delete documents after time)
const sessionSchema = new Schema({
    token: String,
    createdAt: { type: Date, default: Date.now }
});
sessionSchema.index({ createdAt: 1 }, { expireAfterSeconds: 3600 }); // 1 hour

// Text index (for full-text search)
productSchema.index({ name: 'text', description: 'text' });

// Geospatial index
const locationSchema = new Schema({
    name: String,
    location: {
        type: { type: String, default: 'Point' },
        coordinates: [Number]  // [longitude, latitude]
    }
});
locationSchema.index({ location: '2dsphere' });

// ----------------------
// MANAGING INDEXES
// ----------------------

async function manageIndexes() {
    // Get all indexes
    const indexes = await User.collection.getIndexes();

    // Create index programmatically
    await User.collection.createIndex({ username: 1 }, { unique: true });

    // Drop an index
    await User.collection.dropIndex('email_1');

    // Explain query execution (see if index is used)
    const explained = await User.find({ email: 'test@example.com' }).explain('executionStats');
    console.log(explained.executionStats);
}


// ============================================================================
// SECTION 12: POPULATION (JOINING DOCUMENTS)
// ============================================================================

/**
 * POPULATION: Mongoose's way to join documents from different collections
 * Similar to SQL JOINs but for MongoDB
 */

// Schema with references
const postSchema = new Schema({
    title: String,
    content: String,
    author: {
        type: Schema.Types.ObjectId,
        ref: 'User'                    // Reference to User model
    },
    comments: [{
        type: Schema.Types.ObjectId,
        ref: 'Comment'
    }]
});

const commentSchema = new Schema({
    text: String,
    author: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    post: {
        type: Schema.Types.ObjectId,
        ref: 'Post'
    }
});

const Post = model('Post', postSchema);
const Comment = model('Comment', commentSchema);

async function populationExamples() {
    // Basic population
    const posts = await Post.find()
        .populate('author');  // Replace author ID with full user document

    // Select specific fields when populating
    const postsWithAuthorName = await Post.find()
        .populate('author', 'name email');  // Only get name and email

    // Populate multiple fields
    const fullPosts = await Post.find()
        .populate('author', 'name')
        .populate('comments');

    // Nested population (populate comments and their authors)
    const postsWithComments = await Post.find()
        .populate({
            path: 'comments',
            populate: {
                path: 'author',
                select: 'name avatar'
            }
        });

    // Conditional population
    const populatedPosts = await Post.find()
        .populate({
            path: 'author',
            match: { isActive: true },    // Only populate if user is active
            select: 'name email'
        });

    // Population with options
    const sortedComments = await Post.findById(postId)
        .populate({
            path: 'comments',
            options: {
                sort: { createdAt: -1 },
                limit: 10
            }
        });
}


// ============================================================================
// SECTION 13: TRANSACTIONS
// ============================================================================

/**
 * TRANSACTIONS: Ensure multiple operations either all succeed or all fail
 * Provides ACID compliance for MongoDB
 * 
 * USE CASES:
 * - Money transfers
 * - Order processing
 * - Any operation that modifies multiple documents
 * 
 * REQUIREMENTS:
 * - MongoDB replica set (even single-node replica)
 * - MongoDB 4.0+ for multi-document transactions
 */

async function transactionExample() {
    // Start a session
    const session = await mongoose.startSession();

    try {
        // Start transaction
        session.startTransaction();

        // All operations in this transaction
        const sender = await User.findByIdAndUpdate(
            senderId,
            { $inc: { balance: -amount } },
            { session, new: true }
        );

        if (sender.balance < 0) {
            throw new Error('Insufficient balance');
        }

        await User.findByIdAndUpdate(
            receiverId,
            { $inc: { balance: amount } },
            { session }
        );

        // Create transaction record
        await Transaction.create([{
            from: senderId,
            to: receiverId,
            amount: amount,
            type: 'transfer'
        }], { session });

        // Commit the transaction
        await session.commitTransaction();
        console.log('Transaction successful');

    } catch (error) {
        // Abort/rollback on error
        await session.abortTransaction();
        console.error('Transaction failed:', error.message);
        throw error;

    } finally {
        // End the session
        session.endSession();
    }
}

// Cleaner approach with withTransaction()
async function transactionWithHelper() {
    const session = await mongoose.startSession();

    await session.withTransaction(async () => {
        await User.updateOne(
            { _id: senderId },
            { $inc: { balance: -100 } },
            { session }
        );

        await User.updateOne(
            { _id: receiverId },
            { $inc: { balance: 100 } },
            { session }
        );
    });

    session.endSession();
}


// ============================================================================
// SECTION 14: ERROR HANDLING
// ============================================================================

/**
 * Common MongoDB/Mongoose errors and how to handle them
 */

async function errorHandling() {
    try {
        const user = await User.create({
            name: 'John',
            email: 'john@example.com'
        });
    } catch (error) {

        // Duplicate key error (unique constraint violation)
        if (error.code === 11000) {
            const field = Object.keys(error.keyPattern)[0];
            console.error(`${field} already exists`);
            // Response: "email already exists"
        }

        // Validation error
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(e => e.message);
            console.error('Validation failed:', messages);
            // Response: ["Name is required", "Age cannot be negative"]
        }

        // Cast error (invalid ObjectId)
        if (error.name === 'CastError') {
            console.error(`Invalid ${error.path}: ${error.value}`);
            // Response: "Invalid _id: abc123"
        }

        // Document not found
        if (error.name === 'DocumentNotFoundError') {
            console.error('Document not found');
        }

        // Connection error
        if (error.name === 'MongoNetworkError') {
            console.error('Database connection failed');
        }
    }
}

// Centralized error handler for Express
function mongooseErrorHandler(err, req, res, next) {
    if (err.code === 11000) {
        const field = Object.keys(err.keyPattern)[0];
        return res.status(409).json({
            error: 'Duplicate Entry',
            message: `${field} already exists`
        });
    }

    if (err.name === 'ValidationError') {
        const errors = Object.values(err.errors).map(e => ({
            field: e.path,
            message: e.message
        }));
        return res.status(400).json({
            error: 'Validation Failed',
            details: errors
        });
    }

    if (err.name === 'CastError') {
        return res.status(400).json({
            error: 'Invalid ID',
            message: `Invalid ${err.path}`
        });
    }

    // Default error
    res.status(500).json({
        error: 'Internal Server Error',
        message: err.message
    });
}


// ============================================================================
// SECTION 15: BEST PRACTICES
// ============================================================================

/**
 * MongoDB & Mongoose Best Practices for Production
 */

const bestPractices = {

    // 1. SCHEMA DESIGN
    schemaDesign: {
        // Embed when:
        embed: [
            'Data is always accessed together',
            'One-to-few relationship',
            'Data doesn\'t change frequently'
        ],
        // Reference when:
        reference: [
            'Data is accessed independently',
            'One-to-many or many-to-many',
            'Data changes frequently',
            'Need to avoid document size limits (16MB)'
        ]
    },

    // 2. QUERY OPTIMIZATION
    queryOptimization: [
        'Always use indexes for frequently queried fields',
        'Use projection to return only needed fields',
        'Use .lean() for read-only queries (faster)',
        'Avoid using $where (JavaScript execution)',
        'Use aggregation instead of multiple queries',
        'Limit results to avoid memory issues'
    ],

    // 3. CONNECTION MANAGEMENT
    connection: [
        'Use connection pooling (default in Mongoose)',
        'Handle connection errors gracefully',
        'Implement reconnection logic',
        'Set appropriate timeouts'
    ],

    // 4. SECURITY
    security: [
        'Never expose MongoDB directly to the internet',
        'Use authentication and authorization',
        'Validate all input before saving',
        'Sanitize queries to prevent NoSQL injection',
        'Use TLS/SSL for connections'
    ]
};

// Using .lean() for faster read-only queries
async function optimizedQuery() {
    // Returns plain JavaScript objects instead of Mongoose documents
    // 5-10x faster for large datasets
    const users = await User.find({ isActive: true })
        .select('name email')
        .lean();

    // Note: lean() documents don't have Mongoose methods
    // users[0].save() would throw an error
}

// NoSQL injection prevention
const safeQuery = async (req, res) => {
    // BAD - vulnerable to injection
    // const user = await User.findOne({ email: req.body.email });

    // GOOD - sanitize input
    const email = String(req.body.email).toLowerCase().trim();
    const user = await User.findOne({ email });

    // GOOD - use mongoose-sanitize plugin
    // or check for $ operators in input
    const sanitize = (obj) => {
        for (const key in obj) {
            if (key.startsWith('$')) {
                delete obj[key];
            }
        }
        return obj;
    };
};


// ============================================================================
// SECTION 16: INTERVIEW QUESTIONS & ANSWERS
// ============================================================================

const interviewQA = {

    // Q1: What is the difference between SQL and MongoDB?
    q1: {
        question: 'What is the difference between SQL and MongoDB?',
        answer: `
            SQL (Relational):
            - Uses tables with fixed schema
            - Relationships through foreign keys
            - Vertical scaling
            - ACID transactions (strong)
            - Good for complex queries and joins
            
            MongoDB (NoSQL):
            - Uses collections with flexible documents
            - Relationships through embedding or references
            - Horizontal scaling (sharding)
            - Eventually consistent (by default)
            - Good for unstructured data and high write loads
        `
    },

    // Q2: What is an ObjectId?
    q2: {
        question: 'What is an ObjectId in MongoDB?',
        answer: `
            ObjectId is a 12-byte unique identifier:
            - 4 bytes: timestamp
            - 5 bytes: random value (machine + process)
            - 3 bytes: incrementing counter
            
            Benefits:
            - Globally unique without central coordination
            - Contains creation timestamp
            - Sortable by creation time
        `
    },

    // Q3: Explain embedding vs referencing
    q3: {
        question: 'When should you embed documents vs reference them?',
        answer: `
            EMBED when:
            - Data is always accessed together
            - One-to-few relationship (< 100)
            - Data rarely changes
            Example: User with address
            
            REFERENCE when:
            - Data accessed independently
            - One-to-many (hundreds+)
            - Data changes frequently
            - Avoid exceeding 16MB limit
            Example: User with posts
        `
    },

    // Q4: What is sharding?
    q4: {
        question: 'What is sharding in MongoDB?',
        answer: `
            Sharding is horizontal scaling by distributing data across
            multiple machines (shards).
            
            Components:
            - Shard: Each holds a portion of data
            - Config servers: Store cluster metadata
            - Mongos: Query router
            
            Shard key: Field used to distribute data
            - Choose carefully: frequently queried, high cardinality
        `
    },

    // Q5: What is the aggregation pipeline?
    q5: {
        question: 'Explain the aggregation pipeline',
        answer: `
            A framework for data processing through sequential stages.
            
            Common stages:
            - $match: Filter documents
            - $group: Group and aggregate
            - $project: Shape output
            - $sort: Order results
            - $lookup: Join collections
            - $unwind: Flatten arrays
            
            Benefits over find():
            - Complex transformations
            - Group operations
            - Multiple collection joins
        `
    },

    // Q6: How do you optimize MongoDB queries?
    q6: {
        question: 'How do you optimize MongoDB queries?',
        answer: `
            1. Create appropriate indexes
            2. Use explain() to analyze queries
            3. Use projection (select only needed fields)
            4. Use .lean() for read-only operations
            5. Avoid $where (uses JavaScript)
            6. Use aggregation for complex operations
            7. Implement pagination (skip/limit)
            8. Use compound indexes for multiple filters
        `
    },

    // Q7: What are the ACID properties in MongoDB?
    q7: {
        question: 'Does MongoDB support ACID transactions?',
        answer: `
            Yes, since MongoDB 4.0:
            
            Single document: Always ACID compliant
            
            Multi-document transactions:
            - Supported in replica sets (4.0+)
            - Supported in sharded clusters (4.2+)
            
            Use session.startTransaction() and 
            session.commitTransaction()
            
            Note: Transactions have performance overhead,
            design schema to minimize their need.
        `
    },

    // Q8: What is a replica set?
    q8: {
        question: 'What is a replica set?',
        answer: `
            A group of MongoDB instances maintaining the same data.
            
            Components:
            - Primary: Receives all writes
            - Secondaries: Replicate from primary
            - Arbiter: Only votes, no data
            
            Benefits:
            - High availability (automatic failover)
            - Data redundancy
            - Read scaling (read from secondaries)
        `
    }
};


// ============================================================================
// SECTION 17: COMPLETE EXPRESS + MONGODB EXAMPLE
// ============================================================================

/**
 * A complete REST API example with MongoDB
 */

const express = require('express');
const app = express();

// Middleware
app.use(express.json());

// User routes
const userRouter = express.Router();

// CREATE - POST /api/users
userRouter.post('/', async (req, res, next) => {
    try {
        const user = await User.create(req.body);
        res.status(201).json({
            success: true,
            data: user
        });
    } catch (error) {
        next(error);
    }
});

// READ ALL - GET /api/users
userRouter.get('/', async (req, res, next) => {
    try {
        const { page = 1, limit = 10, sort = '-createdAt', search } = req.query;

        const query = {};
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ];
        }

        const users = await User.find(query)
            .sort(sort)
            .skip((page - 1) * limit)
            .limit(Number(limit))
            .select('-password')
            .lean();

        const total = await User.countDocuments(query);

        res.json({
            success: true,
            data: users,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        next(error);
    }
});

// READ ONE - GET /api/users/:id
userRouter.get('/:id', async (req, res, next) => {
    try {
        const user = await User.findById(req.params.id)
            .select('-password');

        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        res.json({ success: true, data: user });
    } catch (error) {
        next(error);
    }
});

// UPDATE - PUT /api/users/:id
userRouter.put('/:id', async (req, res, next) => {
    try {
        const user = await User.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        ).select('-password');

        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        res.json({ success: true, data: user });
    } catch (error) {
        next(error);
    }
});

// DELETE - DELETE /api/users/:id
userRouter.delete('/:id', async (req, res, next) => {
    try {
        const user = await User.findByIdAndDelete(req.params.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        res.json({
            success: true,
            message: 'User deleted successfully'
        });
    } catch (error) {
        next(error);
    }
});

// Mount router
app.use('/api/users', userRouter);

// Error handler
app.use(mongooseErrorHandler);

// Start server
const startServer = async () => {
    await connectToMongoDB();
    app.listen(3000, () => {
        console.log('Server running on port 3000');
    });
};

// startServer();


// ============================================================================
// EXPORTS (for testing/reference)
// ============================================================================

module.exports = {
    User,
    Product,
    Post,
    Comment,
    connectToMongoDB,
    userRouter,
    terminology,
    bestPractices,
    interviewQA
};


/**
 * ============================================================================
 *                              QUICK REFERENCE CHEAT SHEET
 * ============================================================================
 * 
 * CONNECT:
 *   mongoose.connect('mongodb://localhost:27017/dbname')
 * 
 * SCHEMA:
 *   new Schema({ field: Type }, { timestamps: true })
 * 
 * MODEL:
 *   model('Name', schema)
 * 
 * CREATE:
 *   Model.create(data)
 *   new Model(data).save()
 *   Model.insertMany([...])
 * 
 * READ:
 *   Model.find(filter)
 *   Model.findOne(filter)
 *   Model.findById(id)
 *   .select('field1 field2')
 *   .sort({ field: -1 })
 *   .skip(n).limit(n)
 *   .populate('ref')
 *   .lean()
 * 
 * UPDATE:
 *   Model.updateOne(filter, update)
 *   Model.updateMany(filter, update)
 *   Model.findByIdAndUpdate(id, update, { new: true })
 * 
 * DELETE:
 *   Model.deleteOne(filter)
 *   Model.deleteMany(filter)
 *   Model.findByIdAndDelete(id)
 * 
 * OPERATORS:
 *   Comparison: $eq, $ne, $gt, $gte, $lt, $lte, $in, $nin
 *   Logical: $and, $or, $not, $nor
 *   Update: $set, $unset, $inc, $push, $pull, $addToSet
 * 
 * AGGREGATION:
 *   Model.aggregate([
 *     { $match: {} },
 *     { $group: { _id: '$field', count: { $sum: 1 } } },
 *     { $sort: { count: -1 } },
 *     { $limit: 10 }
 *   ])
 * 
 * ============================================================================
 */
