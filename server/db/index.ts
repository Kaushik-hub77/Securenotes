import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

// For demo purposes, you can use this connection string
// In production, get your connection string from Neon dashboard
const connectionString = process.env.DATABASE_URL 
const sql = neon(connectionString);
export const db = drizzle(sql, { schema });

export type Database = typeof db;
