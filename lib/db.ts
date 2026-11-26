import mongoose from "mongoose";

function getEnv() {
  const MONGODB_URI = process.env.MONGODB_URI;
  const MONGODB_DB = process.env.MONGODB_DB || "support_prototype";
  if (!MONGODB_URI) {
    throw new Error("MONGODB_URI is not set. Add it to .env.local");
  }
  return { MONGODB_URI, MONGODB_DB };
}

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  // eslint-disable-next-line no-var
  var mongooseCache: MongooseCache | undefined;
}

const cached: MongooseCache = global.mongooseCache || { conn: null, promise: null };
if (!global.mongooseCache) global.mongooseCache = cached;

export async function connectDB(): Promise<typeof mongoose> {
  if (cached.conn) return cached.conn;
  if (!cached.promise) {
    const { MONGODB_URI, MONGODB_DB } = getEnv();
    cached.promise = mongoose
      .connect(MONGODB_URI as string, {
        dbName: MONGODB_DB,
        serverSelectionTimeoutMS: 10000,
        socketTimeoutMS: 45000,
        bufferCommands: false,
      })
      .then((m) => m)
      .catch((err) => {
        cached.promise = null;
        throw err;
      });
  }
  try {
    cached.conn = await cached.promise;
  } catch (err) {
    cached.promise = null;
    throw err;
  }
  return cached.conn;
}

export default connectDB;