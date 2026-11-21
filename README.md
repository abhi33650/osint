# LinkTrack

**Consent-based location tracking & email digital-footprint intelligence platform.**

LinkTrack lets an authorized admin generate unique, shareable links. When a
recipient opens a link, they see a clear landing page explaining that their
location is being requested, and **location is collected only after they
explicitly grant their browser's permission**. Recipients can stop sharing at
any time. It also includes an Email Intelligence module that discovers an
address's **public** digital footprint using only legitimate sources.

> ### Important — ethical & legal use
> This tool is built around **informed consent**. It never collects location
> secretly and never bypasses browser permissions. Only use it where the people
> being located know and agree (e.g. "share my live location with family",
> delivery/field-team tracking, or authorized testing). Tracking people without
> their knowledge or consent is unlawful in most jurisdictions. The Email
> Intelligence module uses public data only and performs **no** account
> enumeration or login/password probing.

---

## Tech stack

- **Next.js 15** (App Router) + **TypeScript**
- **Material UI 6** (dark, purple theme) + MUI X **Data Grid** & **Charts**
- **MongoDB** via **Mongoose**
- **Leaflet** + OpenStreetMap for maps
- Custom JWT auth (httpOnly cookie) with role-based access
- Browser **Geolocation API** for consented location

## Prerequisites

- Node.js 18+ (tested on Node 22)
- A MongoDB database — either:
  - **Local:** install MongoDB Community and run `mongod` (listens on `27017`), or
  - **Atlas:** a free cloud cluster at <https://www.mongodb.com/atlas>

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
#    Your .env already has generated values; review it against .env.example.
#    At minimum set MONGODB_URI and JWT_SECRET.

# 3. Create the first admin user (reads SEED_ADMIN_* from .env)
npm run seed

# 4. Start the dev server
npm run dev
```

Open <http://localhost:3000> and sign in with the seeded admin credentials
(default `admin@linktrack.local` / `ChangeMe123!` — change these in `.env`
before seeding, or change the password after first login).

### Production

```bash
npm run build
npm start
```

## Environment variables

See [`.env.example`](.env.example). Key ones:

| Variable | Required | Purpose |
| --- | --- | --- |
| `MONGODB_URI` | ✅ | MongoDB connection string |
| `JWT_SECRET` | ✅ | Signs session cookies (long random string) |
| `NEXT_PUBLIC_APP_URL` | ✅ | Base URL used when generating share links |
| `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` / `SEED_ADMIN_NAME` | for seeding | Initial admin |
| `LOCATION_RETENTION_DAYS` | optional | If > 0, consented location pings auto-delete after N days (MongoDB TTL) |
| `HIBP_API_KEY` | optional | Enables Have I Been Pwned breach lookups. Without it, breach checks return **Not verified**. Get one at <https://haveibeenpwned.com/API/Key> |

Gravatar and DNS/MX lookups need **no** keys.

## How the consent flow works

1. Admin generates a link → unique 256-bit token → `…/track/<token>`.
2. Recipient opens the link → sees a landing page explaining the request. The
   link is marked *opened* (no location yet).
3. Recipient taps **Allow location sharing** → the browser shows its own
   permission prompt.
4. Only if permission is granted does the app record **consent** (with a
   timestamp) and then submit the location. The server **rejects any location
   ping unless consent was granted** for that link.
5. One-time mode records a single update and completes; continuous mode streams
   updates until the recipient taps **Stop sharing** (or the admin terminates
   the session).

## Project structure

```
src/
  app/
    (app)/                 # authenticated console (shared sidebar layout)
      dashboard/           # stats, charts, recent activity
      tracking-links/      # link table + create dialog
        [id]/              # session details + live map + history
      email-intelligence/  # public-footprint checker
      settings/            # account, privacy, retention
    api/                   # route handlers (auth, links, track, dashboard, email)
    login/                 # admin sign-in
    track/[token]/         # PUBLIC consent landing page
  components/              # dashboard / maps / tracking / layout UI
  lib/
    auth/                  # jwt, password, session, guard, constants
    database/              # mongoose connection
    security/              # tokens, validation (zod), rate limiting
    serialize.ts           # DB docs -> DTOs
  models/                  # Mongoose schemas (User, TrackingLink, LocationPing, …)
  services/                # emailIntelligence (DNS/MX, Gravatar, HIBP)
  theme/                   # MUI dark-purple theme + registry
  types/                   # shared TypeScript types
scripts/seedAdmin.ts       # create the first admin
```

## Security & privacy features

- Unguessable 256-bit tracking tokens (`crypto.randomBytes`)
- httpOnly, SameSite session cookies; bcrypt password hashing (12 rounds)
- Admin-only API guard + edge middleware route protection
- Zod input validation on every write endpoint
- In-memory rate limiting on login, pings and email lookups
- Consent trail (timestamp, IP, user-agent) stored per link
- Append-only audit log of privacy-relevant actions
- Optional location-data retention via MongoDB TTL index
- Server-side enforcement that **no ping is stored without prior consent**

> **Note:** the in-memory rate limiter suits a single instance. For serverless
> or multi-instance deployments, back it with Redis (e.g. Upstash). `npm audit`
> reports some advisories from transitive deps — review before production.
