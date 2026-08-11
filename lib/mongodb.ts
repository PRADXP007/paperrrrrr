import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  var mongooseCache: MongooseCache | undefined;
}

let cached: MongooseCache = global.mongooseCache || { conn: null, promise: null };

if (!global.mongooseCache) {
  global.mongooseCache = cached;
}

// Disable Mongoose global buffering so unconfigured DB calls fail immediately with 0 delay
mongoose.set("bufferCommands", false);

export function isDbConfigured(): boolean {
  return Boolean(MONGODB_URI && MONGODB_URI.trim() !== "");
}

export async function connectToDatabase() {
  if (!isDbConfigured()) {
    return null;
  }

  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 2000,
      connectTimeoutMS: 2000
    };
    cached.promise = mongoose.connect(MONGODB_URI!, opts).then((m) => m);
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    console.warn("MongoDB connection could not be established; continuing in-memory mode:", e);
    return null;
  }

  return cached.conn;
}
