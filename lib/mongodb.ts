import mongoose from 'mongoose';

// Define the shape of our cached connection
interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

// Extend the global object with our cache type
declare global {
  // eslint-disable-next-line no-var
  var mongoose: MongooseCache | undefined;
}

// Get MongoDB URI from environment variables
const MONGODB_URI = process.env.MONGODB_URI;

// Validate that MongoDB URI is defined
if (!MONGODB_URI) {
  throw new Error(
    'Please define the MONGODB_URI environment variable inside .env.local'
  );
}

// Initialize the cached connection object
// In development, Next.js hot reloads can cause multiple connections
// Using a global variable prevents creating new connections on each reload
let cached: MongooseCache = global.mongoose || { conn: null, promise: null };

if (!global.mongoose) {
  global.mongoose = cached;
}

/**
 * Establishes and returns a cached MongoDB connection using Mongoose
 * 
 * @returns {Promise<typeof mongoose>} The Mongoose instance with an active connection
 * 
 * Connection behavior:
 * - Reuses existing connection if available
 * - Creates new connection if none exists
 * - Caches connection globally to prevent multiple instances
 */
async function connectDB(): Promise<typeof mongoose> {
  // Return existing connection if already established
  if (cached.conn) {
    return cached.conn;
  }

  // If no connection exists but a connection promise is pending, wait for it
  if (!cached.promise) {
    const opts = {
      bufferCommands: false, // Disable Mongoose buffering
    };

    // Create new connection promise
    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
      return mongoose;
    });
  }

  try {
    // Wait for the connection to be established
    cached.conn = await cached.promise;
  } catch (e) {
    // Reset promise on error so next call can retry
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

export default connectDB;
