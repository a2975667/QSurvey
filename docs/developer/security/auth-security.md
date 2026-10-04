Auth & Security
===============

Purpose
-------
- Document the current authentication flow (Google OAuth + JWT).
- Clarify how tokens are issued, stored, and refreshed.
- Highlight role‑based access control (RBAC) and security headers.

Auth Overview
-------------
Backend:
- Google OAuth via Passport (`server/src/auth/google.strategy.ts`)
- JWT via Passport (`server/src/auth/jwt.strategy.ts`)
- JWT guard with auto‑refresh headers (`server/src/auth/jwt-auth.guard.ts`)

Frontend:
- Login UI: `client/src/pages/login/Login.tsx`
- Login redirect handler: `client/src/App.tsx` (`/login-success`)
- Auth state + storage: `client/src/features/authSlice.tsx`

Login Flow (Google OAuth)
-------------------------
1) User clicks **Sign in with Google**.
2) Frontend redirects to:
   - `GET /api/v1/google-login`
3) Google OAuth callback hits:
   - `GET /api/v1/redirect`
4) Backend issues a JWT and redirects to:
   - `${FRONTEND_URL}/login-success?token=...&email=...&userId=...&roles=...`
5) `LoginSuccess` parses query params, dispatches `loginSuccess`, and stores:
   - JWT in localStorage (`jwt_token`)
   - User info in localStorage (`jwt_user`)

JWT Payload
-----------
Issued in `AuthService.googleLogin`:
```
{
  user_id,
  user_email,
  user_roles
}
```
Token secret:
- `SECRET` env var (see `server/src/auth/jwt.strategy.ts`)

Token Refresh (Auto‑Refresh Header)
-----------------------------------
Auto‑refresh is implemented in `JwtAuthGuard`:
- If token is close to expiration (`remainingTime < threshold * lifetime`),
  a new JWT is issued.
- New token is returned in response header:
  - `X-New-Access-Token`
- Cache headers are set to prevent caching of responses with new tokens.
- Refresh happens only when authenticated requests are made; idle sessions are
  not refreshed and will naturally expire.
- This keeps active sessions alive without interrupting normal API workflows.

Refresh threshold:
- `JWT_REFRESH_THRESHOLD` (default `0.3`)

Frontend responsibilities:
- For protected requests, if `X-New-Access-Token` is present,
  update `authSlice` via `loginSuccess({ token: newToken })`.
- Several fetch flows already do this:
  - `client/src/pages/designer/DesignerPage.tsx`
  - `client/src/pages/designer/SurveyResultsPage.tsx`
  - `client/src/pages/survey/SurveyEdit.tsx`
  - `client/src/utils/exportDownload.ts`

Important:
- There is **no** `POST /api/v1/auth/refresh` endpoint in this repo.
  `client/src/lib/api.ts` contains a helper that assumes one, but it is
  not wired to a backend route. Token refresh currently relies on the
  `X-New-Access-Token` header.

Client Auth Identity Normalization
----------------------------------
Client auth state is normalized at the auth boundary:
- `client/src/lib/jwt.ts` decodes JWT payloads and checks expiration.
- `client/src/features/authUser.ts` maps the current server JWT claims into
  the canonical client shape:
  - `user_id` -> `auth.user.id`
  - `user_email` -> `auth.user.email`
  - `user_roles` -> `auth.user.roles`
- `client/src/features/authSlice.tsx` uses that canonical shape during
  bootstrap and `loginSuccess`.

Rules:
- Feature code should consume `auth.user.id`, `auth.user.email`, and
  `auth.user.roles`.
- Feature code should not decode JWTs or guess identity from aliases such as
  `_id`, `userId`, `sub`, or email.
- Stored raw user objects may be normalized from `id` or `_id` only inside the
  auth boundary.
- A non-expired token that cannot provide `user_id` is treated as invalid
  client auth state and is cleared on bootstrap.

Role‑Based Access Control (RBAC)
--------------------------------
Role enum:
- `server/src/auth/roles/role.enum.ts`
  - `Admin`, `Designer`, `User`, `Guest`

Guards + decorators:
- `JwtAuthGuard` verifies JWT and attaches `req.user`.
- `RolesGuard` enforces allowed roles.
- `@Roles(...)` decorator sets role requirements per handler.

Protected endpoints:
- Mounted under `/api/v1/protected/*`.
- Typical requirement: `Admin` or `Designer`.

Security Headers
----------------
`JwtAuthGuard` adds the following headers on protected responses:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Strict-Transport-Security: max-age=31536000; includeSubDomains`

Local Development Notes
-----------------------
- `Strict-Transport-Security` is set even in local dev.
- Google OAuth requires `REDIRECT_URL` and `FRONTEND_URL` to match
  the Google console config.

Related Docs
------------
- Local setup: `setup/local-development.md`
- System overview: `architecture/system-overview.md`

Survey Creation Quota
---------------------
- Ordinary accounts can create a project while they have fewer than 50 projects
  in their collaborator list. Shared projects count, matching the designer's
  existing limit; this is not an ownership or billing quota.
- The existing lowercase `admin` role is exempt. There is no super-admin role.
  The exemption applies to **all** admins, not one named user. Assigning `admin`
  also gives the account existing administrative powers (including global
  survey/results and user-management access), so do not grant it solely as a
  quota workaround without separate approval.
- Self-service `PUT /api/v1/profiles` allowlists profile fields and cannot
  write roles or forward Mongo update operators. Role updates remain on the
  existing admin-only `PUT /api/v1/protected/profiles/:id` endpoint.
- The designer uses normalized `auth.user.roles`. The server reads the persisted
  user role for the exemption and checks the matching collaborator project count
  before normal creation, survey cloning, or approved-template cloning.
- Rejected creation returns HTTP 409 (`Max surveys reached (50)`), which is a
  quota conflict and does not trigger the client's authentication logout handler.
- After an approved role change, sign in again to update the role in the client
  JWT. The server does not trust a stale admin JWT for the quota exemption.
- These count-before-write checks do not provide an atomic reservation across
  concurrent requests or Cloud Run instances. Concurrent creation near the cap
  and collaborator changes can still take an account above 50. A strict global
  cap requires a separate transactional quota/reservation design; this change
  preserves the existing collaborator-count policy and closes sequential API
  and clone bypasses.
- The quota is an application constant. The code does not associate it with a
  paid plan or estimate infrastructure costs. Exempt admins may store more
  surveys, cloned questions, and collected responses, increasing database,
  compute, and transfer usage. Existing API rate limits still apply.
- Before assigning a production role, verify the Google-login email, stored
  QSurvey user ID and roles, and all current admin accounts through an authorized
  read-only source. GitHub identity alone does not establish QSurvey identity.
