import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";
import dotenv from "dotenv";

dotenv.config();


if (!process.env.PGHOST || !process.env.PGDATABASE || !process.env.PGUSER || !process.env.PGPASSWORD) {
	throw new Error(
		"Database configuration environment variables are missing",
	);
}

export const pool = new pg.Pool({
	host: process.env.PGHOST,
	database: process.env.PGDATABASE,
	user: process.env.PGUSER,
	password: process.env.PGPASSWORD,
	port: parseInt(process.env.PGPORT || '25060'),
	ssl: {
		rejectUnauthorized: false
	}
});

// Test the connection on startup
pool.on('connect', () => {
	console.log('Database connection established');
});

pool.on('error', (err) => {
	console.error('Unexpected database error:', err);
});

export const db = drizzle(pool, { schema });
