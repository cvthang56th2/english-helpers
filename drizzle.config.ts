import { defineConfig } from "drizzle-kit";
import "dotenv/config";

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  schemaFilter: ["public", "neon_auth"],
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
