### Authentication & Security Upgrade Summary

This project’s login/auth system was modernized to current security best practices. Below is what changed, why it changed, and how to use the new system.

---

### What Was Wrong Before

- Plaintext passwords stored in the database.
- SQL injection in the login query by string‑interpolating credentials.
- Pseudo‑auth by letting the client send `Authorization: Bearer <username>` with no real token.
- Client generated and stored its own “token” in `localStorage/sessionStorage` (no server validation, trivially forgeable). 
- CORS disallowed cookies, so no way to use HttpOnly cookies safely.
- No logout endpoint or server‑side session invalidation.
- Seed data had duplicate usernames, which could cause ambiguity.

---

### What I Implemented

1. Secure credential handling
   - Parameterized SQL for all queries that use user input to eliminate SQL injection.
   - Password hashing via `bcrypt` with automatic migration: if a legacy plaintext password matches during login, it is immediately re‑hashed and stored.

2. Proper session/auth tokens
   - On successful login, the server issues a short‑lived JWT (15 minutes) containing the user id and username.
   - The JWT is set in an HttpOnly, `SameSite=Lax` cookie so JavaScript cannot read it (mitigates XSS token theft) and it is sent automatically on same‑site requests.
   - CORS is configured to allow credentials from your frontend origins.

3. Auth middleware and protected routes
   - New middleware verifies the JWT from the cookie and attaches `req.user`.
   - Endpoints that require authentication now check `req.user` instead of trusting a username header.
   - A new `POST /auth/logout` endpoint clears the cookie.

4. Frontend changes
   - The login page now posts credentials to `/auth/login` with `credentials: 'include'`. No client‑side token storage.
   - The dashboard requests use `credentials: 'include'` and rely on the server cookie for auth.
   - The dashboard’s protected actions (like race signup) send cookies automatically; no `Authorization` header required.

5. Data fixes
   - Seed data updated to avoid duplicate usernames (`liem` and `liem2`). Plaintext remains in seed intentionally to showcase the automatic re‑hash on first login.

6. Additional hardening
   - `helmet` added for security headers.
   - Basic rate limiting applied to `/auth/login` to slow brute‑force attempts.

---

### Files Touched

- backend/src/index.ts
  - Added: `helmet`, `cookie-parser`, `bcryptjs`, `jsonwebtoken`, `express-rate-limit`.
  - Configured CORS to allow credentials from `http://localhost:3000` and `http://127.0.0.1:3000`.
  - Implemented secure `POST /auth/login` with parameterized SQL, bcrypt verify/migrate, and JWT set in HttpOnly cookie.
  - Added `authRequired` middleware (JWT verification from cookie) and applied it to `/me`, `/me/cat`, and `POST /races/:id/signup`.
  - Added `POST /auth/logout` to clear the cookie.
- backend/package.json
  - Dependencies added: `cookie-parser`, `express-rate-limit`, `jsonwebtoken`, `bcryptjs` (plus corresponding `@types/*`).
- frontend/login.js
  - Switched to cookie‑based login: uses `credentials: 'include'`; removed client token generation/storage.
- frontend/dashboard.js
  - Uses `/me` with `credentials: 'include'` to detect signed‑in state.
  - Uses cookie‑based auth for race signup; removed fake `Authorization` header.
- db/init/001_schema.sql
  - Seed updated to avoid duplicate usernames and annotated as legacy plaintext for auto‑migration.

---

### How It Works Now

- Login
  - POST `/auth/login` with JSON `{ username, password }`.
  - On success, the server sets an HttpOnly cookie named `access_token` that holds a short‑lived JWT.
  - The response body returns `{ status: 'success' }` (no token in the body).

- Authenticated requests
  - The browser automatically includes the cookie on same‑site requests when using `fetch(..., { credentials: 'include' })`.
  - The backend verifies the JWT and populates `req.user` with `{ id, username }`.

- Logout
  - POST `/auth/logout` to clear the cookie.

- Session lifetime
  - The access token expires in 15 minutes. For simplicity, there is no refresh token. If the token expires, the client must log in again.

---

### Configuration

Environment variables used by the backend:

- `PORT` — defaults to `4000`.
- `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE` — Postgres connection details.
- `JWT_SECRET` — secret used to sign the JWT. Set this to a strong random value in production.
- `NODE_ENV` — when set to `production`, cookies are marked `Secure`.

CORS/Frontend origins allowed by default:
- `http://localhost:3000`
- `http://127.0.0.1:3000`

If your frontend runs elsewhere, add the origin to the `origin` array in `backend/src/index.ts`.

---

### Migration Notes

- Existing plaintext passwords: Users can log in with their existing password once; the backend will transparently replace the plaintext with a bcrypt hash during that login. After that, the password is stored securely.
- If you already deployed data with duplicate usernames, resolve them before enabling this in production.

---

### Developer Tips

- Local development over HTTP: since `NODE_ENV` is not `production`, cookies are not forced to `Secure`, and will work over `http://localhost`.
- In production, make sure you serve over HTTPS so the `Secure` cookie is sent; also set a strong `JWT_SECRET` and consider shorter token lifetimes and refresh tokens if you need longer sessions.
- Consider adding account lockout/step‑up verification for repeated failed logins, and CSRF protections if you add non‑idempotent endpoints that rely solely on cookies. With `SameSite=Lax`, top‑level navigations are generally safe, but evaluate your flows.

---

### Quick Test Plan

1. Start backend and frontend (e.g., via Docker Compose or dev scripts).
2. Visit the login page at `http://localhost:3000/login.html`.
3. Log in with one of the seeded users (e.g., `ian` / `password`).
   - On first login, password gets re‑hashed in DB.
4. Navigate to the dashboard; profile should load without providing any headers.
5. Attempt race signup; it should succeed with cookies only.
6. Click logout; the next `/me` call should return 401 and the UI should reflect signed‑out state.

---

### Future Enhancements (Optional)

- Refresh tokens with rotation and revocation (for longer-lived sessions).
- CSRF tokens for state‑changing requests when using cookies (especially if you add cross‑site embedded flows).
- Email/password reset flows, MFA, and audit logging.
- Centralized error handling and structured logging for auth events.
