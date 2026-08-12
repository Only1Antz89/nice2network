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

This version uses realistic local prototype data. The next production step is durable identity, project and messaging data backed by a database.

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

## Product direction

The strongest next additions are authenticated member onboarding, structured availability, role-specific project applications, real Teams/calendar integration, moderation and measurable match quality. See the project issue tracker for implementation planning.
