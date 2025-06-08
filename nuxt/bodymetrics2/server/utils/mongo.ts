import { MongoClient, Db } from "mongodb";

let cachedDb: Db;

export async function connectToDatabase(): Promise<Db> {
  if (cachedDb) return cachedDb;

  const uri = process.env.MONGODB_URI as string;
  const dbName = process.env.MONGODB_DB as string;

  try {
    const client = new MongoClient(uri, {
      tls: true,  
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
