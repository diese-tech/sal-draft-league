import type { LeagueData, Division, Org, LeaguePlayer, Match, OrgStanding, Announcement } from "@/types/league";

const DIVISIONS: Division[] = [
  {
    id: "solar",
    name: "Solar Division",
    description: "Top-tier competitive play. The crucible where champions are forged.",
    tier: 1,
    accentColor: "orange",
  },
  {
    id: "lunar",
    name: "Lunar Division",
    description: "High-level competition across the midnight battlefield.",
    tier: 2,
    accentColor: "cyan",
  },
  {
    id: "gaia",
    name: "Gaia Division",
    description: "The proving grounds. Rise through the roots.",
    tier: 3,
    accentColor: "emerald",
  },
];

const ORGS: Org[] = [
  // Solar Division
  {
    id: "helix-reign",
    name: "Helix Reign",
    tag: "HRX",
    divisionId: "solar",
    logoInitials: "HR",
    logoGradient: "from-orange-500 to-amber-400",
    primaryColor: "#f97316",
    accentGradient: "from-orange-500/20 to-amber-400/10",
    captainId: "p-hrx-1",
    founded: "2024",
    socialLinks: { discord: "#", twitch: "#" },
  },
  {
    id: "obsidian-order",
    name: "Obsidian Order",
    tag: "OBO",
    divisionId: "solar",
    logoInitials: "OO",
    logoGradient: "from-violet-600 to-purple-800",
    primaryColor: "#7c3aed",
    accentGradient: "from-violet-600/20 to-purple-800/10",
    captainId: "p-obo-1",
    founded: "2024",
    socialLinks: { discord: "#" },
  },
  {
    id: "venom-strike",
    name: "Venom Strike",
    tag: "VSK",
    divisionId: "solar",
    logoInitials: "VS",
    logoGradient: "from-green-500 to-emerald-700",
    primaryColor: "#22c55e",
    accentGradient: "from-green-500/20 to-emerald-700/10",
    captainId: "p-vsk-1",
    founded: "2024",
    socialLinks: { twitch: "#" },
  },
  {
    id: "solstice-edge",
    name: "Solstice Edge",
    tag: "SLE",
    divisionId: "solar",
    logoInitials: "SE",
    logoGradient: "from-amber-400 to-yellow-600",
    primaryColor: "#fbbf24",
    accentGradient: "from-amber-400/20 to-yellow-600/10",
    captainId: "p-sle-1",
    founded: "2024",
  },
  // Lunar Division
  {
    id: "midnight-pact",
    name: "Midnight Pact",
    tag: "MDP",
    divisionId: "lunar",
    logoInitials: "MP",
    logoGradient: "from-cyan-400 to-blue-600",
    primaryColor: "#22d3ee",
    accentGradient: "from-cyan-400/20 to-blue-600/10",
    captainId: "p-mdp-1",
    founded: "2024",
    socialLinks: { discord: "#", twitch: "#" },
  },
  {
    id: "frost-sigil",
    name: "Frost Sigil",
    tag: "FSG",
    divisionId: "lunar",
    logoInitials: "FS",
    logoGradient: "from-sky-300 to-indigo-600",
    primaryColor: "#38bdf8",
    accentGradient: "from-sky-300/20 to-indigo-600/10",
    captainId: "p-fsg-1",
    founded: "2024",
  },
  {
    id: "nova-circuit",
    name: "Nova Circuit",
    tag: "NVC",
    divisionId: "lunar",
    logoInitials: "NC",
    logoGradient: "from-fuchsia-500 to-violet-700",
    primaryColor: "#d946ef",
    accentGradient: "from-fuchsia-500/20 to-violet-700/10",
    captainId: "p-nvc-1",
    founded: "2024",
    socialLinks: { twitch: "#" },
  },
  {
    id: "null-vector",
    name: "Null Vector",
    tag: "NLV",
    divisionId: "lunar",
    logoInitials: "NV",
    logoGradient: "from-slate-400 to-zinc-600",
    primaryColor: "#94a3b8",
    accentGradient: "from-slate-400/20 to-zinc-600/10",
    captainId: "p-nlv-1",
    founded: "2024",
  },
  // Gaia Division
  {
    id: "root-warden",
    name: "Root Warden",
    tag: "RWD",
    divisionId: "gaia",
    logoInitials: "RW",
    logoGradient: "from-emerald-400 to-teal-600",
    primaryColor: "#34d399",
    accentGradient: "from-emerald-400/20 to-teal-600/10",
    captainId: "p-rwd-1",
    founded: "2024",
    socialLinks: { discord: "#" },
  },
  {
    id: "serpent-bloom",
    name: "Serpent Bloom",
    tag: "SBL",
    divisionId: "gaia",
    logoInitials: "SB",
    logoGradient: "from-lime-400 to-green-600",
    primaryColor: "#a3e635",
    accentGradient: "from-lime-400/20 to-green-600/10",
    captainId: "p-sbl-1",
    founded: "2024",
  },
  {
    id: "terra-flux",
    name: "Terra Flux",
    tag: "TFX",
    divisionId: "gaia",
    logoInitials: "TF",
    logoGradient: "from-teal-400 to-cyan-700",
    primaryColor: "#2dd4bf",
    accentGradient: "from-teal-400/20 to-cyan-700/10",
    captainId: "p-tfx-1",
    founded: "2024",
    socialLinks: { twitch: "#" },
  },
  {
    id: "iron-canopy",
    name: "Iron Canopy",
    tag: "ICN",
    divisionId: "gaia",
    logoInitials: "IC",
    logoGradient: "from-stone-400 to-neutral-600",
    primaryColor: "#a8a29e",
    accentGradient: "from-stone-400/20 to-neutral-600/10",
    captainId: "p-icn-1",
    founded: "2024",
  },
];

function makePlayers(orgId: string, divisionId: import("@/types/league").DivisionId, prefix: string): LeaguePlayer[] {
  const gradients = [
    "from-cyan-300 via-blue-500 to-fuchsia-500",
    "from-orange-400 via-red-500 to-rose-700",
    "from-emerald-300 via-teal-500 to-cyan-600",
    "from-violet-400 via-purple-600 to-fuchsia-700",
    "from-amber-300 via-orange-500 to-red-600",
  ];
  const roles: import("@/types/card-lab").PlayerRole[] = ["Solo", "Jungle", "Mid", "Carry", "Support"];
  const igns = ["Azrael", "Vexor", "Pyreth", "Kaine", "Solus", "Drakar", "Nyxus", "Torven", "Calix", "Zephon"];
  const discords = ["azrael", "vexor", "pyreth", "kaine", "solus", "drakar", "nyxus", "torven", "calix", "zephon"];

  return [
    { id: `${prefix}-1`, orgId, divisionId, discordUsername: `${discords[0]}_${prefix}`, ign: `${igns[0]}${prefix.toUpperCase()}`, avatarInitials: igns[0].slice(0, 2).toUpperCase(), avatarGradient: gradients[0], primaryRole: roles[0], secondaryRoles: ["Flex"], isStarter: true, isCaptain: true, status: "org-affiliated", stats: { kills: 42, deaths: 18, assists: 61, gamesPlayed: 8, wins: 5 } },
    { id: `${prefix}-2`, orgId, divisionId, discordUsername: `${discords[1]}_${prefix}`, ign: `${igns[1]}${prefix.toUpperCase()}`, avatarInitials: igns[1].slice(0, 2).toUpperCase(), avatarGradient: gradients[1], primaryRole: roles[1], secondaryRoles: [], isStarter: true, isCaptain: false, status: "org-affiliated", stats: { kills: 58, deaths: 22, assists: 44, gamesPlayed: 8, wins: 5 } },
    { id: `${prefix}-3`, orgId, divisionId, discordUsername: `${discords[2]}_${prefix}`, ign: `${igns[2]}${prefix.toUpperCase()}`, avatarInitials: igns[2].slice(0, 2).toUpperCase(), avatarGradient: gradients[2], primaryRole: roles[2], secondaryRoles: ["Carry"], isStarter: true, isCaptain: false, status: "org-affiliated", stats: { kills: 71, deaths: 25, assists: 38, gamesPlayed: 8, wins: 5 } },
    { id: `${prefix}-4`, orgId, divisionId, discordUsername: `${discords[3]}_${prefix}`, ign: `${igns[3]}${prefix.toUpperCase()}`, avatarInitials: igns[3].slice(0, 2).toUpperCase(), avatarGradient: gradients[3], primaryRole: roles[3], secondaryRoles: ["Mid"], isStarter: true, isCaptain: false, status: "org-affiliated", stats: { kills: 55, deaths: 19, assists: 52, gamesPlayed: 8, wins: 5 } },
    { id: `${prefix}-5`, orgId, divisionId, discordUsername: `${discords[4]}_${prefix}`, ign: `${igns[4]}${prefix.toUpperCase()}`, avatarInitials: igns[4].slice(0, 2).toUpperCase(), avatarGradient: gradients[4], primaryRole: roles[4], secondaryRoles: ["Support"], isStarter: true, isCaptain: false, status: "org-affiliated", stats: { kills: 18, deaths: 16, assists: 88, gamesPlayed: 8, wins: 5 } },
    { id: `${prefix}-6`, orgId, divisionId, discordUsername: `${discords[5]}_${prefix}`, ign: `Sub${igns[5]}${prefix.toUpperCase()}`, avatarInitials: igns[5].slice(0, 2).toUpperCase(), avatarGradient: gradients[0], primaryRole: "Flex", secondaryRoles: ["Mid", "Carry"], isStarter: false, isCaptain: false, status: "org-affiliated", stats: { kills: 12, deaths: 8, assists: 20, gamesPlayed: 3, wins: 2 } },
  ];
}

const ALL_PLAYERS: LeaguePlayer[] = [
  ...makePlayers("helix-reign", "solar", "p-hrx"),
  ...makePlayers("obsidian-order", "solar", "p-obo"),
  ...makePlayers("venom-strike", "solar", "p-vsk"),
  ...makePlayers("solstice-edge", "solar", "p-sle"),
  ...makePlayers("midnight-pact", "lunar", "p-mdp"),
  ...makePlayers("frost-sigil", "lunar", "p-fsg"),
  ...makePlayers("nova-circuit", "lunar", "p-nvc"),
  ...makePlayers("null-vector", "lunar", "p-nlv"),
  ...makePlayers("root-warden", "gaia", "p-rwd"),
  ...makePlayers("serpent-bloom", "gaia", "p-sbl"),
  ...makePlayers("terra-flux", "gaia", "p-tfx"),
  ...makePlayers("iron-canopy", "gaia", "p-icn"),
];

const MATCHES: Match[] = [
  // Solar — completed
  { id: "s-m1", divisionId: "solar", homeOrgId: "helix-reign", awayOrgId: "obsidian-order", scheduledDate: "2025-04-28", scheduledTime: "20:00", status: "completed", week: 1, homeScore: 2, awayScore: 0 },
  { id: "s-m2", divisionId: "solar", homeOrgId: "venom-strike", awayOrgId: "solstice-edge", scheduledDate: "2025-04-28", scheduledTime: "22:00", status: "completed", week: 1, homeScore: 1, awayScore: 2 },
  { id: "s-m3", divisionId: "solar", homeOrgId: "obsidian-order", awayOrgId: "venom-strike", scheduledDate: "2025-05-05", scheduledTime: "20:00", status: "completed", week: 2, homeScore: 2, awayScore: 1 },
  { id: "s-m4", divisionId: "solar", homeOrgId: "helix-reign", awayOrgId: "solstice-edge", scheduledDate: "2025-05-05", scheduledTime: "22:00", status: "completed", week: 2, homeScore: 2, awayScore: 0 },
  // Solar — live / this week
  { id: "s-m5", divisionId: "solar", homeOrgId: "helix-reign", awayOrgId: "venom-strike", scheduledDate: "2025-05-18", scheduledTime: "20:00", status: "live", week: 3, streamUrl: "#" },
  { id: "s-m6", divisionId: "solar", homeOrgId: "obsidian-order", awayOrgId: "solstice-edge", scheduledDate: "2025-05-18", scheduledTime: "22:00", status: "scheduled", week: 3 },
  // Solar — upcoming
  { id: "s-m7", divisionId: "solar", homeOrgId: "solstice-edge", awayOrgId: "helix-reign", scheduledDate: "2025-05-25", scheduledTime: "20:00", status: "scheduled", week: 4 },
  { id: "s-m8", divisionId: "solar", homeOrgId: "venom-strike", awayOrgId: "obsidian-order", scheduledDate: "2025-05-25", scheduledTime: "22:00", status: "scheduled", week: 4 },

  // Lunar — completed
  { id: "l-m1", divisionId: "lunar", homeOrgId: "midnight-pact", awayOrgId: "frost-sigil", scheduledDate: "2025-04-29", scheduledTime: "19:00", status: "completed", week: 1, homeScore: 2, awayScore: 1 },
  { id: "l-m2", divisionId: "lunar", homeOrgId: "nova-circuit", awayOrgId: "null-vector", scheduledDate: "2025-04-29", scheduledTime: "21:00", status: "completed", week: 1, homeScore: 0, awayScore: 2 },
  { id: "l-m3", divisionId: "lunar", homeOrgId: "frost-sigil", awayOrgId: "nova-circuit", scheduledDate: "2025-05-06", scheduledTime: "19:00", status: "completed", week: 2, homeScore: 2, awayScore: 0 },
  { id: "l-m4", divisionId: "lunar", homeOrgId: "midnight-pact", awayOrgId: "null-vector", scheduledDate: "2025-05-06", scheduledTime: "21:00", status: "completed", week: 2, homeScore: 2, awayScore: 1 },
  // Lunar — this week
  { id: "l-m5", divisionId: "lunar", homeOrgId: "null-vector", awayOrgId: "midnight-pact", scheduledDate: "2025-05-19", scheduledTime: "19:00", status: "scheduled", week: 3 },
  { id: "l-m6", divisionId: "lunar", homeOrgId: "nova-circuit", awayOrgId: "frost-sigil", scheduledDate: "2025-05-19", scheduledTime: "21:00", status: "scheduled", week: 3 },
  // Lunar — upcoming
  { id: "l-m7", divisionId: "lunar", homeOrgId: "midnight-pact", awayOrgId: "nova-circuit", scheduledDate: "2025-05-26", scheduledTime: "19:00", status: "scheduled", week: 4 },
  { id: "l-m8", divisionId: "lunar", homeOrgId: "frost-sigil", awayOrgId: "null-vector", scheduledDate: "2025-05-26", scheduledTime: "21:00", status: "scheduled", week: 4 },

  // Gaia — completed
  { id: "g-m1", divisionId: "gaia", homeOrgId: "root-warden", awayOrgId: "serpent-bloom", scheduledDate: "2025-04-30", scheduledTime: "19:00", status: "completed", week: 1, homeScore: 2, awayScore: 0 },
  { id: "g-m2", divisionId: "gaia", homeOrgId: "terra-flux", awayOrgId: "iron-canopy", scheduledDate: "2025-04-30", scheduledTime: "21:00", status: "completed", week: 1, homeScore: 1, awayScore: 2 },
  { id: "g-m3", divisionId: "gaia", homeOrgId: "serpent-bloom", awayOrgId: "terra-flux", scheduledDate: "2025-05-07", scheduledTime: "19:00", status: "completed", week: 2, homeScore: 2, awayScore: 2, vodUrl: "#" },
  { id: "g-m4", divisionId: "gaia", homeOrgId: "root-warden", awayOrgId: "iron-canopy", scheduledDate: "2025-05-07", scheduledTime: "21:00", status: "completed", week: 2, homeScore: 2, awayScore: 0 },
  // Gaia — postponed + scheduled
  { id: "g-m5", divisionId: "gaia", homeOrgId: "iron-canopy", awayOrgId: "root-warden", scheduledDate: "2025-05-17", scheduledTime: "19:00", status: "postponed", week: 3 },
  { id: "g-m6", divisionId: "gaia", homeOrgId: "terra-flux", awayOrgId: "serpent-bloom", scheduledDate: "2025-05-20", scheduledTime: "21:00", status: "scheduled", week: 3 },
  { id: "g-m7", divisionId: "gaia", homeOrgId: "root-warden", awayOrgId: "terra-flux", scheduledDate: "2025-05-28", scheduledTime: "19:00", status: "scheduled", week: 4 },
  { id: "g-m8", divisionId: "gaia", homeOrgId: "serpent-bloom", awayOrgId: "iron-canopy", scheduledDate: "2025-05-28", scheduledTime: "21:00", status: "scheduled", week: 4 },
];

function calcStandings(): OrgStanding[] {
  const map = new Map<string, OrgStanding>();

  for (const org of ORGS) {
    map.set(org.id, {
      orgId: org.id,
      divisionId: org.divisionId,
      wins: 0,
      losses: 0,
      matchesPlayed: 0,
      pointsFor: 0,
      pointsAgainst: 0,
      streak: [],
      gamesBack: 0,
    });
  }

  for (const m of MATCHES) {
    if (m.status !== "completed" || m.homeScore === undefined || m.awayScore === undefined) continue;
    const home = map.get(m.homeOrgId)!;
    const away = map.get(m.awayOrgId)!;
    home.matchesPlayed++;
    away.matchesPlayed++;
    home.pointsFor += m.homeScore;
    home.pointsAgainst += m.awayScore;
    away.pointsFor += m.awayScore;
    away.pointsAgainst += m.homeScore;
    if (m.homeScore > m.awayScore) {
      home.wins++;
      away.losses++;
      home.streak = [...home.streak.slice(-4), "W"];
      away.streak = [...away.streak.slice(-4), "L"];
    } else if (m.awayScore > m.homeScore) {
      away.wins++;
      home.losses++;
      away.streak = [...away.streak.slice(-4), "W"];
      home.streak = [...home.streak.slice(-4), "L"];
    }
  }

  // Calculate games back per division
  const divIds: import("@/types/league").DivisionId[] = ["solar", "lunar", "gaia"];
  for (const divId of divIds) {
    const divStandings = [...map.values()].filter((s) => s.divisionId === divId);
    const leader = divStandings.reduce((a, b) => (b.wins - b.losses > a.wins - a.losses ? b : a), divStandings[0]);
    for (const s of divStandings) {
      s.gamesBack = ((leader.wins - leader.losses) - (s.wins - s.losses)) / 2;
    }
  }

  return [...map.values()];
}

const ANNOUNCEMENTS: Announcement[] = [
  {
    id: "ann-1",
    title: "Season 1 Week 3 — Match Day Reminder",
    body: "Week 3 matches begin tonight. Helix Reign vs Venom Strike goes live at 8PM EST on the SAL Twitch channel. Don't miss it.",
    createdAt: "2025-05-18T12:00:00Z",
    category: "general",
    pinned: true,
  },
  {
    id: "ann-2",
    title: "Gaia Division: Iron Canopy vs Root Warden Postponed",
    body: "Due to a scheduling conflict, the Week 3 match between Iron Canopy and Root Warden has been postponed. A new date will be announced shortly.",
    createdAt: "2025-05-17T09:00:00Z",
    category: "results",
    pinned: false,
  },
  {
    id: "ann-3",
    title: "Draft Rules Update — Substitute Eligibility",
    body: "Starting Week 4, substitute players may be swapped in up to 24 hours before match time. Please review the updated rulebook in the Discord server.",
    createdAt: "2025-05-15T16:00:00Z",
    category: "rules",
    pinned: false,
  },
];

export const MOCK_LEAGUE_DATA: LeagueData = {
  season: {
    id: "sal-s1",
    name: "Season 1",
    status: "active",
    startDate: "2025-04-21",
    endDate: "2025-07-13",
    currentWeek: 3,
  },
  divisions: DIVISIONS,
  orgs: ORGS,
  players: ALL_PLAYERS,
  matches: MATCHES,
  standings: calcStandings(),
  announcements: ANNOUNCEMENTS,
  lastUpdated: new Date().toISOString(),
};
