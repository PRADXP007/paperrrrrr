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

  const timeoutPromise = new Promise<null>((resolve) =>
    setTimeout(() => resolve(null), 1500)
  );

  const connectPromise = (async () => {
    try {
      if (!cached.promise) {
        const opts = {
          bufferCommands: false,
          serverSelectionTimeoutMS: 1500,
          connectTimeoutMS: 1500,
          socketTimeoutMS: 2000
        };
        cached.promise = mongoose.connect(MONGODB_URI!, opts).then((m) => m);
      }
      cached.conn = await cached.promise;
      return cached.conn;
    } catch (e) {
      cached.promise = null;
      console.warn("MongoDB connection could not be established; continuing in-memory mode:", e);
      return null;
    }
  })();

  return Promise.race([connectPromise, timeoutPromise]);
}
