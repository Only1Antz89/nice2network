# nice 2 network

A minimal networking product for turning ideas into collaborative projects. People discover relevant work through their skills, industry and interests; project owners see the team forming visually and get explainable suggestions for the roles still missing.

## Current product

- Personalised project feed with filtering and persistent “eyes”
- Project creation flow with AI-assisted role-gap suggestions
- Visual owner, contributor, department and open-role mapping
- Explainable people/project matches with warm-introduction paths
- Search across people, skills and projects
- Connection requests, project-linked messages and Teams/in-person meetings
- Profile, project portfolio and matching controls
- Responsive desktop and mobile layouts

The production foundation is implemented for Vercel with PostgreSQL, Auth.js, Drizzle and encrypted Google/Microsoft integration tokens. Until the Vercel environment variables are configured, the public product preview remains available while authenticated writes return a safe configuration error.

## Run locally

Requires Node.js 22.13 or newer.

```bash
npm install
npm run dev
```

Validation:

```bash
npm run build
npm run lint
npm test
```

Authenticated browser smoke testing uses an isolated PostgreSQL container:

```bash
docker compose -f compose.test.yml up -d --wait
POSTGRES_URL=postgresql://postgres:postgres@127.0.0.1:55432/nice2_test \
AUTH_SECRET=nice2-local-e2e-secret-at-least-32-characters \
SIGNUP_VERIFICATION_MODE=instant npm run test:e2e
docker compose -f compose.test.yml down
```

## Production configuration

1. Link a Neon PostgreSQL resource to the Vercel project and expose its connection string as `POSTGRES_URL`.
2. Add `AUTH_SECRET` and `INTEGRATION_ENCRYPTION_KEY` using separate randomly generated 32-byte secrets.
3. Add a Resend API key and verified sender using `RESEND_API_KEY` and `EMAIL_FROM` so registration verification emails can be delivered.
4. Create Google OAuth credentials and add the Google environment variables from `.env.example`.
5. Create a Microsoft Entra ID application and add the Microsoft environment variables from `.env.example`.
5. Run `npm run db:migrate` against production, then redeploy.

The integrations request the calendar, profile and offline-access scopes needed to create Google Meet, Outlook and Teams events. Provider access and refresh tokens are encrypted before storage.

## Product direction

The strongest next additions are authenticated member onboarding, structured availability, role-specific project applications, real Teams/calendar integration, moderation and measurable match quality. See the project issue tracker for implementation planning.
