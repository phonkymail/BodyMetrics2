import { MongoClient, Db } from "mongodb";

let cachedDb: Db;

/**
 * Connects to MongoDB and caches the database instance.
 * Uses environment variables MONGODB_URI and MONGODB_DB.
 */
export async function connectToDatabase(): Promise<Db> {
  if (cachedDb) return cachedDb;

  const uri = process.env.MONGODB_URI as string;
  const dbName = process.env.MONGODB_DB as string;

  try {
    const client = new MongoClient(uri, {
      tls: true,  // Use tls (or ssl: true for older MongoDB drivers)
      // The following two options can help during testing but should NOT be used in production:
      // tlsAllowInvalidCertificates: true,
      // tlsAllowInvalidHostnames: true,
    });
    console.log('Forbinder til MongoDB via URI:', uri)
    await client.connect();
    const db = client.db(dbName);

    cachedDb = db;
    return db;
  } catch (error) {
    console.error("MongoDB connection error:", error);
    throw error;
  }
}
