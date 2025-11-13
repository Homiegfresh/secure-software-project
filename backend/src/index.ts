import express from 'express';
import dotenv from 'dotenv';
import { Pool } from 'pg';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';

dotenv.config();

const app = express();
app.set('trust proxy', 1);
app.use(helmet());
app.use(express.json());
app.use(cookieParser());

// CORS configuration to allow frontend on localhost:3000 and send cookies
const corsOptions: cors.CorsOptions = {
  origin: [
    'http://localhost:3000',
    'http://127.0.0.1:3000'
  ],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
  credentials: true,
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

const PORT = Number(process.env.PORT || 4000);
const JWT_SECRET = process.env.JWT_SECRET || 'dev-insecure-secret-change-me';
const COOKIE_NAME = 'access_token';
const COOKIE_SECURE = process.env.NODE_ENV === 'production';

// Database connection pool using environment variables with sensible defaults for Docker Compose
const pool = new Pool({
  host: process.env.PGHOST || 'postgres',
  port: Number(process.env.PGPORT || 5432),
  user: process.env.PGUSER || 'app',
  password: process.env.PGPASSWORD || 'app',
  database: process.env.PGDATABASE || 'app',
});

//Checks the status of the database
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

// Rate limit for login to mitigate brute force
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});

function setAuthCookie(res: any, token: string) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: COOKIE_SECURE,
    sameSite: 'lax',
    path: '/',
    maxAge: 15 * 60 * 1000,
  });
}

// Secure login endpoint
app.post('/auth/login', loginLimiter, async (req, res) => {
  const username = (req.body && String(req.body.username || '').trim()) || '';
  const password = (req.body && String(req.body.password || '')) || '';
  if (!username || !password) {
    return res.status(400).json({ status: 'error', message: 'Username and password are required' });
  }
  try {
    const r = await pool.query('SELECT id, username, password FROM player WHERE username = $1', [username]);
    if (!r.rows.length) return res.status(401).json({ status: 'unauthorized' });
    const user = r.rows[0] as { id: number; username: string; password: string };

    let ok = false;
    const stored = user.password || '';
    const isBcrypt = stored.startsWith('$2a$') || stored.startsWith('$2b$') || stored.startsWith('$2y$');

    if (isBcrypt) {
      ok = await bcrypt.compare(password, stored);
    } else {
      // legacy plaintext support; if matches, re-hash and store
      if (stored === password) {
        ok = true;
        const hash = await bcrypt.hash(password, 12);
        await pool.query('UPDATE player SET password = $1 WHERE id = $2', [hash, user.id]);
      }
    }

    if (!ok) return res.status(401).json({ status: 'unauthorized' });

    const token = jwt.sign({ sub: String(user.id), username: user.username }, JWT_SECRET, { expiresIn: '15m' });
    setAuthCookie(res, token);
    return res.status(200).json({ status: 'success' });
  } catch (err: any) {
    return res.status(500).json({ status: 'error', message: err?.message || String(err) });
  }
});

// Authentication middleware using JWT stored in HttpOnly cookie
function authRequired(req: any, res: any, next: any) {
  try {
    const token = req.cookies && req.cookies[COOKIE_NAME];
    if (!token) return res.status(401).json({ status: 'unauthorized' });
    const payload: any = jwt.verify(token, JWT_SECRET);
    // attach to request
    req.user = { id: Number(payload.sub), username: payload.username };
    return next();
  } catch {
    return res.status(401).json({ status: 'unauthorized' });
  }
}

// Current player with cat details (auth required)
app.get('/me', authRequired, async (req: any, res) => {
  const userId = Number(req.user.id);
  try {
    const r = await pool.query(
      `SELECT p.id, p.username, p.displayname, p.catid,
              c.name as cat_name, c.color as cat_color, c.age as cat_age
         FROM player p
         LEFT JOIN cat c ON c.id = p.catid
        WHERE p.id = $1`,
      [userId]
    );
    if (!r.rows.length) return res.status(401).json({ status: 'unauthorized' }); // unknown user
    const row = r.rows[0];
    return res.json({
      status: 'ok',
      player: {
        id: row.id,
        username: row.username,
        displayname: row.displayname,
        catid: row.catid,
      },
      cat: row.catid ? {
        id: row.catid,
        name: row.cat_name,
        color: row.cat_color,
        age: row.cat_age,
      } : null
    });
  } catch (err: any) {
    return res.status(500).json({ status: 'error', message: err?.message || String(err) });
  }
});

// Create or update current player's cat (auth required)
app.put('/me/cat', authRequired, async (req: any, res) => {
  const userId = Number(req.user.id);

  let { name, color, age } = req.body || {};
  if (typeof name !== 'string') name = '';
  if (typeof color !== 'string') color = '';
  const ageNum = Number(age);

  name = name.trim();
  color = color.trim();

  if (!name || name.length > 100) {
    return res.status(400).json({ status: 'error', message: 'Name is required and must be <= 100 chars' });
  }
  if (!color || color.length > 50) {
    return res.status(400).json({ status: 'error', message: 'Color is required and must be <= 50 chars' });
  }
  if (!Number.isFinite(ageNum) || ageNum < 0 || ageNum > 50) {
    return res.status(400).json({ status: 'error', message: 'Age must be a number between 0 and 50' });
  }

  try {
    const pr = await pool.query('SELECT id, catid FROM player WHERE id = $1', [userId]);
    if (!pr.rows.length) return res.status(401).json({ status: 'unauthorized' });
    const playerId = pr.rows[0].id as number;
    const catId = pr.rows[0].catid as number | null;

    if (catId) {
      const ur = await pool.query(
        'UPDATE cat SET name = $1, color = $2, age = $3 WHERE id = $4 RETURNING id, name, color, age',
        [name, color, ageNum, catId]
      );
      const row = ur.rows[0];
      return res.json({ status: 'ok', cat: row });
    } else {
      const ir = await pool.query(
        'INSERT INTO cat (name, color, age) VALUES ($1, $2, $3) RETURNING id, name, color, age',
        [name, color, ageNum]
      );
      const newCat = ir.rows[0];
      await pool.query('UPDATE player SET catid = $1 WHERE id = $2', [newCat.id, playerId]);
      return res.json({ status: 'ok', cat: newCat });
    }
  } catch (err: any) {
    return res.status(500).json({ status: 'error', message: err?.message || String(err) });
  }
});

// List races
app.get('/races', async (_req, res) => {
  try {
    const r = await pool.query(
      `SELECT id, name, distance_m, starts_at, status
         FROM race
        WHERE status = $1
        ORDER BY starts_at ASC`,
      ['scheduled']
    );
    return res.json({ status: 'ok', races: r.rows });
  } catch (err: any) {
    return res.status(500).json({ status: 'error', message: err?.message || String(err) });
  }
});

// Sign up current player for a race (auth required)
app.post('/races/:id/signup', authRequired, async (req: any, res) => {
  const userId = Number(req.user.id);
  const raceId = Number(req.params.id);
  if (!Number.isFinite(raceId) || raceId <= 0) {
    return res.status(400).json({ status: 'error', message: 'Invalid race id' });
  }
  try {
    // Ensure race exists and is schedulable
    const rr = await pool.query('SELECT id FROM race WHERE id = $1 AND status = $2', [raceId, 'scheduled']);
    if (!rr.rows.length) return res.status(404).json({ status: 'not_found' });

    const ir = await pool.query(
      `INSERT INTO race_signup (raceid, playerid) VALUES ($1, $2)
       ON CONFLICT (raceid, playerid) DO NOTHING
       RETURNING id`,
      [raceId, userId]
    );

    const inserted = ir.rows.length > 0;
    return res.json({ status: 'ok', signedUp: inserted, already: !inserted });
  } catch (err: any) {
    return res.status(500).json({ status: 'error', message: err?.message || String(err) });
  }
});

// Logout - clear auth cookie
app.post('/auth/logout', (req, res) => {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure: COOKIE_SECURE,
    sameSite: 'lax',
    path: '/',
  });
  return res.json({ status: 'ok' });
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
