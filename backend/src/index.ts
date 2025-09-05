import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { Pool } from 'pg';
import helmet from "helmet";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(helmet());

const PORT = Number(process.env.PORT || 4000);

// Database connection pool using environment variables with sensible defaults for Docker Compose
const pool = new Pool({
  host: process.env.PGHOST || 'postgres',
  port: Number(process.env.PGPORT || 5432),
  user: process.env.PGUSER || 'app',
  password: process.env.PGPASSWORD || 'app',
  database: process.env.PGDATABASE || 'app',
});

app.get('/health', async (_req, res) => {
  try {
    const r = await pool.query('SELECT 1 as ok');
    const ok = r.rows?.[0]?.ok === 1;
    res.json({ status: 'ok', db: ok ? 'up' : 'unknown', time: new Date().toISOString() });
  } catch (err: any) {
    res.status(500).json({ status: 'error', db: 'down', error: err?.message || String(err) });
  }
});

// Graceful shutdown
const shutdown = async () => {
  try {
    await pool.end();
  } finally {
    process.exit(0);
  }
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

app.listen(PORT, () => {
  console.log(`Backend listening on port ${PORT}`);
});
