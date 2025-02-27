import { defineConfig } from "drizzle-kit";
import dotenv from "dotenv";

dotenv.config();

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL, ensure the database is provisioned");
}

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    host: "",
    port: "",
    user: "",
    password: "",
    database: "",
    ssl: true,
    sslmode: "require"
  },
});
