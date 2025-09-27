import express from 'express';
import dotenv from 'dotenv';
import { Pool } from 'pg';
import cors from 'cors';

dotenv.config();

const app = express();
app.use(express.json());

// CORS configuration to allow frontend on localhost:3000
const corsOptions: cors.CorsOptions = {
  origin: [
    'http://localhost:3000',
    'http://127.0.0.1:3000'
  ],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: false,
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

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
  }
  catch (err: any) {
    res.status(500).json({ status: 'error', db: 'down', error: err?.message || String(err) });
  }
});

// Minimal login endpoint to accept credentials (no logic yet)
app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body || {};
  const sql = `SELECT id, username FROM player WHERE username = '${email}' AND password_hash = '${password}'`;
  const result = await pool.query(sql);

  if (result.rows.length)
      return res.status(200).json({ status: 'success' });

  return res.status(401).send({ success: false });
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
