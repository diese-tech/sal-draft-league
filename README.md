# Serpent Ascension League Draft Platform

Serpent Ascension League (SAL) is a persistent Smite 2 Conquest league platform centered around live snake drafts, stream-ready presentation, and social player identity.

This repository is currently in planning and component-design mode. The first implementation target is a mock-data Card Lab, not the full production draft engine.

## Product North Star

Build a Discord-native competitive esports draft experience for SAL.

SAL should feel like a premium live event board, not a spreadsheet, fantasy football clone, or trading card simulator.

## Confirmed Direction

- SAL is one league with multiple seasons.
- Future tournaments may exist, but they are not MVP.
- Drafts assign individual players to org/captain-led rosters.
- Orgs are selected by the league and assign captains to represent them.
- Captains are players, are not draftable, and usually count as a roster slot.
- Rosters are normally 6 to 8 players.
- Roles follow Smite 2 Conquest: Solo, Jungle, Mid, Carry/ADC, Support.
- Player identity persists across seasons.
- Org participation is season-based and interchangeable.
- Public draft presentation is a first-class product concern.

## First Build Target

Create `/lab/cards`, a component lab using mock data only.

The Card Lab should explore:

- full player profile cards
- compact draft player cards
- roster slot cards
- empty roster slots
- ghost queue states
- captain-locked roster cards
- org roster cards
- active/on-clock states
- free agent and team affiliation badges
- public/spectator vs captain-only variants

No auth, database, live draft engine, Google sync, or production routing should be built before the Card Lab visual language is established.

## Planned Stack

Likely production stack:

- Next.js
- TypeScript
- Tailwind CSS
- Prisma
- Neon Postgres
- Auth.js / NextAuth
- Discord OAuth eventually
- Vercel hosting

Realtime can begin with polling/SSE before introducing heavier WebSocket infrastructure.

## Documentation

See `docs/` for current product and architecture planning.
