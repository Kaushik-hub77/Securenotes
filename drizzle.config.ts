import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./server/db/schema.ts",
  out: "./server/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_tyd9c6BVzPlw@ep-gentle-shadow-a1n7jn0s-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require'
  },
});
