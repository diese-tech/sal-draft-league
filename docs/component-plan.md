# Component Plan

## Philosophy

SAL should be built component-first.

The initial implementation target is a reusable visual system using mock data.

Do not begin with backend systems.

## Initial Route

`/lab/cards`

Purpose:

- experiment rapidly
- establish visual language
- test component states
- validate stream readability
- validate responsive layouts

## Core Components

### PlayerProfileCard

Large profile card.

Used for:

- player profiles
- free agency
- roster pages

Contains:

- Discord avatar
- banner image
- IGN
- Discord username
- primary role
- secondary roles
- timezone
- player tags
- org/free agent badge

## DraftPlayerCard

Compact version for draft pool.

Used for:

- captain draft overlay
- searchable player pool

Contains:

- avatar
- banner
- role pills
- timezone
- queue icon
- note icon
- draft button state

## RosterSlotCard

Ultra-compact card.

Used inside org draft cards.

Contains:

- pick number
- avatar
- IGN
- role

States:

- empty
- drafted
- queued ghost
- active selection

## GhostQueueCard

Semi-transparent future roster placeholder.

Visible only to owning captain.

Should:

- appear translucent
- sit in future roster slot
- disappear if drafted elsewhere

## OrgRosterCard

Primary board card.

Contains:

- org logo
- org name
- captain locked slot
- roster slots
- active drafting state

States:

- inactive
- active/on-the-clock
- completed roster

## RecentPickWidget

Displays:

- last drafted players
- org
- pick number
- round

## DraftTopBanner

Displays:

- current round
- active org
- timer
- draft state

## Responsive Board

Board should NOT use naive equal grids.

Preferred layouts:

- 4-4
- 5-4
- centered weighted rows

The board should feel intentionally composed.

## Future Stream Components

Eventually support browser-source widgets:

- recent picks ticker
- active pick overlay
- caster-only clean board
- draft alert widgets
