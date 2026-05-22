import type {
  DivisionId,
  Org,
  OrgGodTendency,
  PlayerGodStats,
  PlayerMatchStat,
  PlayerSeasonSummary,
  TeamPlayerStat,
} from '@/types/league';
import { getSupabaseServerClient } from '@/lib/supabase-server';

// ── internal types ────────────────────────────────────────────────────────────

/** Extended internal type: adds own-org and player fields needed by aggregations. */
type MatchStatFull = PlayerMatchStat & {
  ownOrgId: string;
  ownOrgName: string;
  ownOrgTag: string;
  playerPrimaryRole: string;
};

type GodAcc = {
  gamesPlayed: number;
  wins: number;
  kills: number;
  deaths: number;
  assists: number;
  totalDamage: number;
  totalMitigated: number;
  mitigatedGames: number;
};

// ── helpers ───────────────────────────────────────────────────────────────────

function godAccToStats(godPlayed: string, acc: GodAcc): PlayerGodStats {
  return {
    godPlayed,
    gamesPlayed: acc.gamesPlayed,
    wins: acc.wins,
    winRate: Math.round((acc.wins / acc.gamesPlayed) * 100),
    kills: acc.kills,
    deaths: acc.deaths,
    assists: acc.assists,
    kda: parseFloat(((acc.kills + acc.assists) / Math.max(acc.deaths, 1)).toFixed(2)),
    avgDamage: Math.round(acc.totalDamage / acc.gamesPlayed),
    avgMitigated: acc.mitigatedGames > 0 ? Math.round(acc.totalMitigated / acc.mitigatedGames) : null,
  };
}

type GodStatRow = {
  god_played: string | null;
  kills: number | null;
  deaths: number | null;
  assists: number | null;
  damage_dealt: number | null;
  damage_mitigated: number | null;
  won: boolean | null;
};

type LeagueGodStatRow = GodStatRow & {
  matches: {
    division_id: string;
  };
};

type GodMetadata = {
  godClass?: string;
};

function stringFromRecord(row: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === 'string' && value.trim()) return value;
  }
  return undefined;
}

function aggregateGods(rows: GodStatRow[]): PlayerGodStats[] {
  const byGod = new Map<string, GodAcc>();

  for (const row of rows) {
    const god = row.god_played || 'Unknown';
    if (!byGod.has(god)) {
      byGod.set(god, {
        gamesPlayed: 0, wins: 0, kills: 0, deaths: 0, assists: 0,
        totalDamage: 0, totalMitigated: 0, mitigatedGames: 0,
      });
    }
    const acc = byGod.get(god)!;
    acc.gamesPlayed += 1;
    acc.wins += row.won ? 1 : 0;
    acc.kills += row.kills ?? 0;
    acc.deaths += row.deaths ?? 0;
    acc.assists += row.assists ?? 0;
    acc.totalDamage += row.damage_dealt ?? 0;
    if (row.damage_mitigated !== null && row.damage_mitigated !== undefined) {
      acc.totalMitigated += row.damage_mitigated;
      acc.mitigatedGames += 1;
    }
  }

  return Array.from(byGod.entries())
    .map(([god, acc]) => godAccToStats(god, acc))
    .sort((a, b) => b.gamesPlayed - a.gamesPlayed);
}

// ── private query ─────────────────────────────────────────────────────────────

async function fetchMatchStatsFull(
  playerId: string,
  seasonId?: string,
): Promise<MatchStatFull[]> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return [];

  type OrgRow = { id: string; name: string; tag: string };
  type DbRow = {
    match_id: string;
    game_number: number;
    god_played: string | null;
    role: string | null;
    kills: number | null;
    deaths: number | null;
    assists: number | null;
    damage_dealt: number | null;
    damage_mitigated: number | null;
    healing_done: number | null;
    won: boolean | null;
    matches: {
      scheduled_date: string;
      division_id: string;
      season_id: string | null;
      home_org_id: string;
      away_org_id: string;
      home_org: OrgRow | null;
      away_org: OrgRow | null;
    };
    player: { org_id: string | null; primary_role: string };
  };

  let query = supabase
    .from('player_stats')
    .select(`
      match_id,
      game_number,
      god_played,
      role,
      kills,
      deaths,
      assists,
      damage_dealt,
      damage_mitigated,
      healing_done,
      won,
      matches!inner(
        scheduled_date,
        division_id,
        season_id,
        home_org_id,
        away_org_id,
        home_org:orgs!matches_home_org_id_fkey(id, name, tag),
        away_org:orgs!matches_away_org_id_fkey(id, name, tag)
      ),
      player:players!inner(org_id, primary_role)
    `)
    .eq('player_id', playerId)
    .not('won', 'is', null);

  if (seasonId) {
    query = query.eq('matches.season_id', seasonId);
  }

  const { data, error } = await query;
  if (error) {
    console.error('fetchMatchStatsFull error:', error.message);
    return [];
  }

  return ((data ?? []) as unknown as DbRow[])
    .map((row): MatchStatFull => {
      const m = row.matches;
      const playerOrgId = row.player.org_id;
      const isHome = playerOrgId !== null && playerOrgId === m.home_org_id;
      const ownOrg = isHome ? m.home_org : m.away_org;
      const opponentOrg = isHome ? m.away_org : m.home_org;

      return {
        matchId: row.match_id,
        gameNumber: row.game_number,
        godPlayed: row.god_played ?? '',
        role: row.role ?? '',
        kills: row.kills ?? 0,
        deaths: row.deaths ?? 0,
        assists: row.assists ?? 0,
        damageDealt: row.damage_dealt ?? 0,
        damageMitigated: row.damage_mitigated ?? null,
        healingDone: row.healing_done ?? null,
        won: row.won ?? false,
        opponentOrgId: opponentOrg?.id ?? '',
        opponentOrgName: opponentOrg?.name ?? '',
        opponentOrgTag: opponentOrg?.tag ?? '',
        matchDate: m.scheduled_date,
        divisionId: m.division_id as DivisionId,
        seasonId: m.season_id ?? '',
        ownOrgId: ownOrg?.id ?? '',
        ownOrgName: ownOrg?.name ?? '',
        ownOrgTag: ownOrg?.tag ?? '',
        playerPrimaryRole: row.player.primary_role,
      };
    })
    .sort((a, b) => {
      const d = b.matchDate.localeCompare(a.matchDate);
      return d !== 0 ? d : a.gameNumber - b.gameNumber;
    });
}

// ── public query functions ────────────────────────────────────────────────────

export async function getPlayerMatchHistory(
  playerId: string,
  seasonId?: string,
): Promise<PlayerMatchStat[]> {
  return fetchMatchStatsFull(playerId, seasonId);
}

export async function getPlayerGodStats(
  playerId: string,
  seasonId?: string,
): Promise<PlayerGodStats[]> {
  const history = await getPlayerMatchHistory(playerId, seasonId);
  if (!history.length) return [];
  return aggregateGods(
    history.map((h) => ({
      god_played: h.godPlayed || null,
      kills: h.kills,
      deaths: h.deaths,
      assists: h.assists,
      damage_dealt: h.damageDealt,
      damage_mitigated: h.damageMitigated,
      won: h.won,
    })),
  );
}

export async function getPlayerSeasonSummaries(
  playerId: string,
): Promise<PlayerSeasonSummary[]> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return [];

  const [history, { data: seasonRows }] = await Promise.all([
    fetchMatchStatsFull(playerId),
    supabase.from('seasons').select('id, name, start_date').order('start_date', { ascending: false }),
  ]);

  if (!history.length) return [];

  const seasonNames = new Map<string, string>();
  const seasonDates = new Map<string, string>();
  for (const s of (seasonRows ?? [])) {
    const row = s as { id: string; name: string; start_date: string };
    seasonNames.set(row.id, row.name);
    seasonDates.set(row.id, row.start_date);
  }

  type SeasonAcc = {
    seasonId: string;
    divisionId: DivisionId;
    orgId: string;
    orgName: string;
    orgTag: string;
    primaryRole: string;
    gamesPlayed: number;
    wins: number;
    kills: number;
    deaths: number;
    assists: number;
  };

  const byKey = new Map<string, SeasonAcc>();

  for (const stat of history) {
    const key = `${stat.seasonId}|${stat.divisionId}|${stat.ownOrgId}`;
    if (!byKey.has(key)) {
      byKey.set(key, {
        seasonId: stat.seasonId,
        divisionId: stat.divisionId,
        orgId: stat.ownOrgId,
        orgName: stat.ownOrgName,
        orgTag: stat.ownOrgTag,
        primaryRole: stat.playerPrimaryRole,
        gamesPlayed: 0,
        wins: 0,
        kills: 0,
        deaths: 0,
        assists: 0,
      });
    }
    const acc = byKey.get(key)!;
    acc.gamesPlayed += 1;
    acc.wins += stat.won ? 1 : 0;
    acc.kills += stat.kills;
    acc.deaths += stat.deaths;
    acc.assists += stat.assists;
  }

  return Array.from(byKey.values())
    .map((acc): PlayerSeasonSummary => ({
      seasonId: acc.seasonId,
      seasonName: seasonNames.get(acc.seasonId) ?? acc.seasonId,
      divisionId: acc.divisionId,
      orgId: acc.orgId,
      orgName: acc.orgName,
      orgTag: acc.orgTag,
      role: acc.primaryRole,
      gamesPlayed: acc.gamesPlayed,
      wins: acc.wins,
      losses: acc.gamesPlayed - acc.wins,
      kda: parseFloat(((acc.kills + acc.assists) / Math.max(acc.deaths, 1)).toFixed(2)),
    }))
    .sort((a, b) => {
      const aDate = seasonDates.get(a.seasonId) ?? '';
      const bDate = seasonDates.get(b.seasonId) ?? '';
      return bDate.localeCompare(aDate);
    });
}

export async function getTeamRosterStats(
  orgId: string,
  seasonId?: string,
): Promise<TeamPlayerStat[]> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return [];

  const matchJoin = seasonId ? ', matches!inner(season_id)' : '';
  let query = supabase
    .from('player_stats')
    .select(`player_id, kills, deaths, assists, damage_dealt, damage_mitigated, won, players!inner(id, ign, primary_role, org_id)${matchJoin}`)
    .eq('players.org_id', orgId)
    .not('won', 'is', null);

  if (seasonId) {
    query = query.eq('matches.season_id', seasonId);
  }

  const { data, error } = await query;
  if (error) {
    console.error('getTeamRosterStats error:', error.message);
    return [];
  }

  type RosterRow = {
    player_id: string;
    kills: number | null;
    deaths: number | null;
    assists: number | null;
    damage_dealt: number | null;
    damage_mitigated: number | null;
    won: boolean | null;
    players: { ign: string; primary_role: string };
  };

  type PlayerAcc = {
    playerId: string;
    ign: string;
    primaryRole: string;
    gamesPlayed: number;
    wins: number;
    kills: number;
    deaths: number;
    assists: number;
    totalDamage: number;
    totalMitigated: number;
    mitigatedGames: number;
  };

  const byPlayer = new Map<string, PlayerAcc>();

  for (const row of (data ?? []) as unknown as RosterRow[]) {
    const pid = row.player_id;
    if (!byPlayer.has(pid)) {
      byPlayer.set(pid, {
        playerId: pid,
        ign: row.players.ign,
        primaryRole: row.players.primary_role,
        gamesPlayed: 0,
        wins: 0,
        kills: 0,
        deaths: 0,
        assists: 0,
        totalDamage: 0,
        totalMitigated: 0,
        mitigatedGames: 0,
      });
    }
    const acc = byPlayer.get(pid)!;
    acc.gamesPlayed += 1;
    acc.wins += row.won ? 1 : 0;
    acc.kills += row.kills ?? 0;
    acc.deaths += row.deaths ?? 0;
    acc.assists += row.assists ?? 0;
    acc.totalDamage += row.damage_dealt ?? 0;
    if (row.damage_mitigated !== null && row.damage_mitigated !== undefined) {
      acc.totalMitigated += row.damage_mitigated;
      acc.mitigatedGames += 1;
    }
  }

  return Array.from(byPlayer.values())
    .map((acc): TeamPlayerStat => ({
      playerId: acc.playerId,
      ign: acc.ign,
      primaryRole: acc.primaryRole as import('@/types/card-lab').PlayerRole,
      gamesPlayed: acc.gamesPlayed,
      kills: acc.kills,
      deaths: acc.deaths,
      assists: acc.assists,
      kda: parseFloat(((acc.kills + acc.assists) / Math.max(acc.deaths, 1)).toFixed(2)),
      winRate: Math.round((acc.wins / acc.gamesPlayed) * 100),
      totalDamage: acc.totalDamage,
      avgDamage: Math.round(acc.totalDamage / acc.gamesPlayed),
      totalMitigated: acc.mitigatedGames > 0 ? acc.totalMitigated : null,
      avgMitigated: acc.mitigatedGames > 0 ? Math.round(acc.totalMitigated / acc.mitigatedGames) : null,
    }))
    .sort((a, b) => b.gamesPlayed - a.gamesPlayed);
}

export async function getOrgBrandGodStats(
  brandId: string,
  seasonId?: string,
): Promise<PlayerGodStats[]> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return [];

  // Step 1: resolve player IDs for all players in orgs with this brand
  const { data: playerData, error: playerError } = await supabase
    .from('players')
    .select('id, orgs!inner(brand_id)')
    .eq('orgs.brand_id', brandId);

  if (playerError) {
    console.error('getOrgBrandGodStats players error:', playerError.message);
    return [];
  }

  const playerIds = (playerData ?? []).map((p) => (p as { id: string }).id);
  if (!playerIds.length) return [];

  // Step 2: aggregate god stats for those players
  const matchJoin = seasonId ? ', matches!inner(season_id)' : '';
  let query = supabase
    .from('player_stats')
    .select(`god_played, kills, deaths, assists, damage_dealt, damage_mitigated, won${matchJoin}`)
    .in('player_id', playerIds)
    .not('won', 'is', null);

  if (seasonId) {
    query = query.eq('matches.season_id', seasonId);
  }

  const { data, error } = await query;
  if (error) {
    console.error('getOrgBrandGodStats stats error:', error.message);
    return [];
  }

  return aggregateGods((data ?? []) as unknown as GodStatRow[]);
}

export async function getLeagueGodStats(seasonId?: string, divisionId?: DivisionId): Promise<PlayerGodStats[]> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return [];

  let query = supabase
    .from('player_stats')
    .select(`
      god_played,
      kills,
      deaths,
      assists,
      damage_dealt,
      damage_mitigated,
      won,
      matches!inner(season_id, division_id)
    `)
    .not('won', 'is', null);

  if (seasonId) {
    query = query.eq('matches.season_id', seasonId);
  }
  if (divisionId) {
    query = query.eq('matches.division_id', divisionId);
  }

  const { data, error } = await query;
  if (error) {
    console.error('getLeagueGodStats error:', error.message);
    return [];
  }

  const rows = (data ?? []) as unknown as LeagueGodStatRow[];
  const divisionIdsByGod = new Map<string, Set<DivisionId>>();

  for (const row of rows) {
    const god = row.god_played || 'Unknown';
    if (!divisionIdsByGod.has(god)) divisionIdsByGod.set(god, new Set());
    divisionIdsByGod.get(god)!.add(row.matches.division_id as DivisionId);
  }

  const { data: godRows, error: godError } = await supabase.from('gods').select('*');
  const metadataByGod = new Map<string, GodMetadata>();
  if (!godError) {
    for (const row of (godRows ?? []) as Record<string, unknown>[]) {
      const name = stringFromRecord(row, ['name', 'god_name', 'godPlayed', 'god_played']);
      if (!name) continue;
      metadataByGod.set(name.toLowerCase(), {
        godClass: stringFromRecord(row, ['class', 'god_class', 'role']),
      });
    }
  } else {
    console.error('getLeagueGodStats gods metadata error:', godError.message);
  }

  return aggregateGods(rows).map((stat) => ({
    ...stat,
    godClass: metadataByGod.get(stat.godPlayed.toLowerCase())?.godClass,
    divisionIds: Array.from(divisionIdsByGod.get(stat.godPlayed) ?? []),
  }));
}

export async function getOrgGodTendencies(orgs: Org[], seasonId?: string, divisionId?: DivisionId): Promise<OrgGodTendency[]> {
  const supabase = getSupabaseServerClient();
  if (!supabase || orgs.length === 0) return [];

  type OrgStatRow = GodStatRow & {
    matches: {
      season_id: string | null;
      division_id: string;
    };
    player: {
      org_id: string | null;
    };
  };

  const orgById = new Map(orgs.map((org) => [org.id, org]));
  const groupMeta = new Map<string, OrgGodTendency>();
  const rowsByGroup = new Map<string, GodStatRow[]>();

  let query = supabase
    .from('player_stats')
    .select(`
      god_played,
      kills,
      deaths,
      assists,
      damage_dealt,
      damage_mitigated,
      won,
      matches!inner(season_id, division_id),
      player:players!inner(org_id)
    `)
    .not('won', 'is', null);

  if (seasonId) {
    query = query.eq('matches.season_id', seasonId);
  }
  if (divisionId) {
    query = query.eq('matches.division_id', divisionId);
  }

  const { data, error } = await query;
  if (error) {
    console.error('getOrgGodTendencies error:', error.message);
    return [];
  }

  for (const row of (data ?? []) as unknown as OrgStatRow[]) {
    if (!row.player.org_id) continue;
    const org = orgById.get(row.player.org_id);
    if (!org) continue;

    const groupId = org.brandId ?? org.id;
    if (!groupMeta.has(groupId)) {
      const groupedOrgs = org.brandId ? orgs.filter((candidate) => candidate.brandId === org.brandId) : [org];
      groupMeta.set(groupId, {
        orgId: org.id,
        orgName: org.brandId ? org.name.replace(/\s+(Solar|Lunar|Gaia)$/i, '') : org.name,
        orgTag: org.tag,
        brandId: org.brandId,
        divisionIds: Array.from(new Set(groupedOrgs.map((candidate) => candidate.divisionId))),
        gamesPlayed: 0,
        topGods: [],
      });
      rowsByGroup.set(groupId, []);
    }

    groupMeta.get(groupId)!.gamesPlayed += 1;
    rowsByGroup.get(groupId)!.push(row);
  }

  return Array.from(groupMeta.entries())
    .map(([groupId, tendency]) => ({
      ...tendency,
      topGods: aggregateGods(rowsByGroup.get(groupId) ?? []).slice(0, 5),
    }))
    .sort((a, b) => {
      const games = b.gamesPlayed - a.gamesPlayed;
      return games !== 0 ? games : a.orgName.localeCompare(b.orgName);
    });
}
