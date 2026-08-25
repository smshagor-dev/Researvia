import mongoose from "mongoose";
import { getServerEnv } from "@/config/env";

type MongooseCache = {
  connection: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

const globalForMongoose = globalThis as typeof globalThis & {
  __researviaMongoose?: MongooseCache;
};

const cache = globalForMongoose.__researviaMongoose ?? {
  connection: null,
  promise: null
};

globalForMongoose.__researviaMongoose = cache;

export async function connectDatabase(): Promise<typeof mongoose> {
  if (cache.connection) return cache.connection;

  if (!cache.promise) {
    const { MONGODB_URI } = getServerEnv();
    cache.promise = mongoose.connect(MONGODB_URI, {
      maxPoolSize: 20,
      minPoolSize: 1,
      serverSelectionTimeoutMS: 5_000,
      socketTimeoutMS: 45_000,
      autoIndex: process.env.NODE_ENV !== "production"
    });
  }

  try {
    cache.connection = await cache.promise;
    return cache.connection;
  } catch (error) {
    cache.promise = null;
    throw error;
  }
}

export async function disconnectDatabase(): Promise<void> {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  cache.connection = null;
  cache.promise = null;
}
