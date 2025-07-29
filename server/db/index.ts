import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

// For demo purposes, you can use this connection string
// In production, get your connection string from Neon dashboard
const connectionString = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_tyd9c6BVzPlw@ep-gentle-shadow-a1n7jn0s-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require'
  
const sql = neon(connectionString);
export const db = drizzle(sql, { schema });

export type Database = typeof db;
