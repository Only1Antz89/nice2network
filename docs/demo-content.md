# Demonstration content

The demonstration dataset is intentionally isolated from live member data.

- Demo members use the internal role `demo_member` and email domain `demo.nice2network.test`.
- Demo projects begin with `Demonstration project · n2 demo batch 2026-08` in their description.
- Demo records use deterministic IDs, so seeding is idempotent.
- The product derives a visible `DEMO` badge from the server-owned member role.

Commands:

```sh
npm run demo:status
npm run demo:seed
npm run demo:purge
```

`demo:purge` removes only the marked demo members and their related projects, meetings, comments, eyes, roles, milestones and updates. It does not remove ordinary accounts or their projects. Run status before and after purging, and take a Neon restore point before launch as an additional safeguard.
