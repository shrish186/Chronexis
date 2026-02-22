import { MongoClient, Db, Collection } from "mongodb";
import type { Venture, VentureModel, SimRun } from "./types";

let client: MongoClient;
let db: Db;

export async function connectDB(): Promise<Db> {
  if (db) return db;
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI not set");
  console.log("[db] connecting...");
  client = new MongoClient(uri);
  await client.connect();
  const dbName = process.env.MONGODB_DB_NAME || "cognitive-twin";
  db = client.db(dbName);
  console.log(`[db] connected: ${dbName}`);
  return db;
}

export function getDB(): Db {
  if (!db) throw new Error("DB not ready");
  return db;
}

export function ventures(): Collection<Venture> {
  return getDB().collection<Venture>("ventures");
}
export function ventureModels(): Collection<VentureModel> {
  return getDB().collection<VentureModel>("ventureModels");
}
export function simRuns(): Collection<SimRun> {
  return getDB().collection<SimRun>("simRuns");
}
