"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { DivisionId } from "@/types/league";
import type { PlayerRole, PlayerStatus } from "@/types/card-lab";
import { cn } from "@/lib/utils";

type ParsedRow = {
  ign: string;
  discordUsername: string;
  primaryRole: PlayerRole | null;
  secondaryRoles: PlayerRole[];
  divisionId?: DivisionId;
  orgId?: string;
  confidence: "green" | "yellow" | "red";
  warnings: string[];
};

type ImportedPlayer = {
  id: string;
  ign: string;
  discordUsername: string;
  primaryRole: PlayerRole;
  secondaryRoles: PlayerRole[];
  divisionId?: DivisionId;
  orgId?: string;
  avatarInitials: string;
  avatarGradient: string;
  isStarter: boolean;
  isCaptain: boolean;
  status: PlayerStatus;
};

const VALID_ROLES: PlayerRole[] = ["Solo", "Jungle", "Mid", "Carry", "Support", "Flex"];
const VALID_DIVISIONS: DivisionId[] = ["solar", "lunar", "gaia"];

const ROLE_ALIASES: Record<string, PlayerRole> = {
  solo: "Solo", top: "Solo",
  jungle: "Jungle", jung: "Jungle", jg: "Jungle",
  mid: "Mid", middle: "Mid",
  carry: "Carry", adc: "Carry", bot: "Carry", hunter: "Carry",
  support: "Support", sup: "Support", supp: "Support",
  flex: "Flex",
};

const DIVISION_ALIASES: Record<string, DivisionId> = {
  solar: "solar", sol: "solar",
  lunar: "lunar", lun: "lunar",
  gaia: "gaia",
};

const AVATAR_GRADIENTS = [
  "from-cyan-500 to-blue-600",
  "from-orange-500 to-red-600",
  "from-emerald-500 to-teal-600",
  "from-fuchsia-500 to-purple-600",
  "from-amber-500 to-orange-600",
  "from-sky-500 to-indigo-600",
  "from-rose-500 to-pink-600",
  "from-lime-500 to-green-600",
];

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function pickGradient(ign: string): string {
  return AVATAR_GRADIENTS[hashCode(ign) % AVATAR_GRADIENTS.length];
}

function normalizeRole(raw: string): PlayerRole | null {
  const key = raw.trim().toLowerCase();
  return ROLE_ALIASES[key] ?? null;
}

function normalizeDivision(raw: string): DivisionId | null {
  const key = raw.trim().toLowerCase();
  return DIVISION_ALIASES[key] ?? null;
}

// ---- CSV/TSV parser ----

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else { inQuotes = !inQuotes; }
    } else if ((ch === "," || ch === "\t") && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

type ColMap = {
  ign: number;
  discord: number;
  role: number;
  secondary: number;
  division: number;
  org: number;
  roles: number; // Discord bot "Roles" column
};

function detectColumns(headers: string[]): Partial<ColMap> {
  const map: Partial<ColMap> = {};
  headers.forEach((h, i) => {
    const key = h.toLowerCase().trim();
    if (!("ign" in map) && /ign|in.?game|ingame|nickname|display.?name|gamertag/.test(key)) map.ign = i;
    else if (!("ign" in map) && /^name$/.test(key)) map.ign = i;
    if (!("discord" in map) && /discord|disc|username/.test(key)) map.discord = i;
    if (!("role" in map) && /^(role|primary|main|position)$/.test(key)) map.role = i;
    if (!("secondary" in map) && /secondary|off.?role|flex|alt/.test(key)) map.secondary = i;
    if (!("division" in map) && /division|div/.test(key)) map.division = i;
    if (!("org" in map) && /^(org|team)$/.test(key)) map.org = i;
    if (!("roles" in map) && /^roles$/.test(key)) map.roles = i;
  });
  return map;
}

function parseRolesColumn(raw: string): { division?: DivisionId; primaryRole: PlayerRole | null; secondaryRoles: PlayerRole[] } {
  const tokens = raw.split(",").map((t) => t.trim()).filter(Boolean);
  let division: DivisionId | undefined;
  const roles: PlayerRole[] = [];

  for (const token of tokens) {
    const div = normalizeDivision(token);
    if (div) { division = div; continue; }
    const role = normalizeRole(token);
    if (role) roles.push(role);
  }

  return { division, primaryRole: roles[0] ?? null, secondaryRoles: roles.slice(1) };
}

function parseText(text: string): ParsedRow[] {
  const rawLines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (rawLines.length < 2) return [];

  const headers = parseCsvLine(rawLines[0]);
  const colMap = detectColumns(headers);

  return rawLines.slice(1).map((line) => {
    const cells = parseCsvLine(line);
    const get = (idx: number | undefined) => (idx !== undefined ? cells[idx] ?? "" : "").trim();

    const warnings: string[] = [];
    let primaryRole: PlayerRole | null = null;
    let secondaryRoles: PlayerRole[] = [];
    let divisionId: DivisionId | undefined;

    const ign = get(colMap.ign);
    const discord = get(colMap.discord);

    // Discord bot "Roles" column takes precedence for role/division detection
    if (colMap.roles !== undefined) {
      const parsed = parseRolesColumn(get(colMap.roles));
      primaryRole = parsed.primaryRole;
      secondaryRoles = parsed.secondaryRoles;
      divisionId = parsed.division;
    } else {
      const rawRole = get(colMap.role);
      if (rawRole) {
        const normalized = normalizeRole(rawRole);
        if (!normalized) {
          warnings.push(`Unknown role "${rawRole}" — fuzzy matched`);
          const fuzzy = Object.entries(ROLE_ALIASES).find(([k]) => rawRole.toLowerCase().includes(k));
          primaryRole = fuzzy ? fuzzy[1] : null;
        } else {
          primaryRole = normalized;
        }
      }

      const rawSecondary = get(colMap.secondary);
      if (rawSecondary) {
        secondaryRoles = rawSecondary.split(",").map((r) => normalizeRole(r)).filter((r): r is PlayerRole => r !== null);
      }

      const rawDiv = get(colMap.division);
      if (rawDiv) divisionId = normalizeDivision(rawDiv) ?? undefined;
    }

    const orgId = get(colMap.org) || undefined;

    const missing: string[] = [];
    if (!ign) missing.push("IGN");
    if (!discord) missing.push("Discord");
    if (!primaryRole) missing.push("Role");

    let confidence: "green" | "yellow" | "red" = "green";
    if (missing.length > 0) confidence = "red";
    else if (warnings.length > 0) confidence = "yellow";

    if (missing.length > 0) warnings.unshift(`Missing: ${missing.join(", ")}`);

    return { ign, discordUsername: discord, primaryRole, secondaryRoles, divisionId, orgId, confidence, warnings };
  }).filter((r) => r.ign || r.discordUsername);
}

function rowToPlayer(row: ParsedRow): ImportedPlayer | null {
  if (!row.ign || !row.discordUsername || !row.primaryRole) return null;
  const slug = slugify(row.ign);
  const hash = hashCode(row.ign).toString(16).slice(0, 6);
  return {
    id: `player-${slug}-${hash}`,
    ign: row.ign,
    discordUsername: row.discordUsername,
    primaryRole: row.primaryRole,
    secondaryRoles: row.secondaryRoles,
    divisionId: row.divisionId,
    orgId: row.orgId,
    avatarInitials: row.ign.slice(0, 2).toUpperCase(),
    avatarGradient: pickGradient(row.ign),
    isStarter: false,
    isCaptain: false,
    status: (row.orgId ? "org-affiliated" : "free-agent") as PlayerStatus,
  };
}

// ---- Component ----

export function AdminImportClient() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState("");
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ imported: number; errors: Array<{ ign: string; error: string }> } | null>(null);
  const [message, setMessage] = useState("");

  function handleTextChange(value: string) {
    setText(value);
    setRows(parseText(value));
    setResult(null);
    setMessage("");
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result as string;
      setText(content);
      setRows(parseText(content));
      setResult(null);
      setMessage("");
    };
    reader.readAsText(file);
  }

  async function handleImport() {
    const players = rows.map(rowToPlayer).filter((p): p is ImportedPlayer => p !== null);
    if (players.length === 0) {
      setMessage("No valid players to import.");
      return;
    }
    setImporting(true);
    setMessage("");
    setResult(null);
    const res = await fetch("/api/admin/import/players", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ players }),
    });
    setImporting(false);
    const data = await res.json().catch(() => null) as { imported?: number; errors?: Array<{ ign: string; error: string }>; error?: string } | null;
    if (!res.ok) {
      setMessage(data?.error ? `Import failed: ${data.error}` : "Import failed.");
      return;
    }
    setResult({ imported: data?.imported ?? 0, errors: data?.errors ?? [] });
    router.refresh();
  }

  const greenRows = rows.filter((r) => r.confidence === "green").length;
  const yellowRows = rows.filter((r) => r.confidence === "yellow").length;
  const redRows = rows.filter((r) => r.confidence === "red").length;

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-6">
        <p className="mb-1 text-[0.65rem] font-black uppercase tracking-widest text-cyan-300/70">Admin</p>
        <h1 className="text-2xl font-black text-white">Player Import</h1>
        <p className="mt-1 text-sm text-slate-400">Paste CSV, TSV, or Google Sheets data — or upload a file. Existing players are updated (upserted) by IGN.</p>
      </div>

      <div className="mb-4 rounded-xl border border-white/8 bg-white/[0.025] p-4">
        <p className="mb-2 text-[0.65rem] font-black uppercase text-slate-500">Supported formats</p>
        <ul className="list-inside list-disc space-y-1 text-xs text-slate-400">
          <li><span className="font-semibold text-slate-300">CSV / Google Sheets paste</span> — any headers with IGN, Discord, Role columns</li>
          <li><span className="font-semibold text-slate-300">Discord bot export</span> — <code className="rounded bg-white/[0.06] px-1">Username</code>, <code className="rounded bg-white/[0.06] px-1">Nickname</code> (= IGN), <code className="rounded bg-white/[0.06] px-1">Roles</code> (comma-separated: division + roles)</li>
          <li><span className="font-semibold text-slate-300">File upload</span> — .csv or .tsv files</li>
        </ul>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Input area */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <label className="text-[0.65rem] font-black uppercase text-slate-500">Paste Data</label>
            <button
              onClick={() => fileRef.current?.click()}
              className="rounded-lg border border-white/10 px-2.5 py-1 text-[0.65rem] font-black uppercase text-slate-400 transition hover:border-white/20 hover:text-slate-200"
            >
              Upload File
            </button>
            <input ref={fileRef} type="file" accept=".csv,.tsv" className="hidden" onChange={handleFile} />
          </div>
          <textarea
            rows={18}
            value={text}
            onChange={(e) => handleTextChange(e.target.value)}
            className="w-full resize-y rounded-xl border border-white/10 bg-white/[0.04] p-3 font-mono text-xs text-slate-300 placeholder-slate-600 outline-none focus:border-cyan-300/30 focus:ring-1 focus:ring-cyan-300/15"
            placeholder={"Username,Nickname,Roles\nbrawler99,IceStrike,Member, Solar, Jungle, Mid\n..."}
            spellCheck={false}
          />
          {rows.length > 0 && (
            <div className="flex gap-3 text-xs font-semibold">
              <span className="text-emerald-400">{greenRows} valid</span>
              {yellowRows > 0 && <span className="text-amber-400">{yellowRows} warnings</span>}
              {redRows > 0 && <span className="text-red-400">{redRows} skipped</span>}
            </div>
          )}
          {message && (
            <p className={cn("text-xs font-semibold", message.startsWith("Import failed") ? "text-red-400" : "text-emerald-400")}>
              {message}
            </p>
          )}
          {result && (
            <div className="rounded-xl border border-emerald-300/20 bg-emerald-300/8 p-3">
              <p className="text-sm font-black text-emerald-300">Imported {result.imported} player{result.imported !== 1 ? "s" : ""}.</p>
              {result.errors.length > 0 && (
                <ul className="mt-2 space-y-0.5 text-xs text-red-400">
                  {result.errors.map((e, i) => (
                    <li key={i}>{e.ign}: {e.error}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
          <button
            onClick={handleImport}
            disabled={importing || greenRows + yellowRows === 0}
            className="rounded-xl border border-cyan-300/30 bg-cyan-300/10 py-2.5 text-xs font-black uppercase text-cyan-100 transition hover:bg-cyan-300/18 disabled:opacity-40"
          >
            {importing ? "Importing…" : `Import ${greenRows + yellowRows} Player${greenRows + yellowRows !== 1 ? "s" : ""}`}
          </button>
        </div>

        {/* Preview table */}
        <div className="overflow-x-auto">
          {rows.length === 0 ? (
            <div className="flex h-full min-h-[200px] items-center justify-center rounded-xl border border-white/8 text-sm text-slate-600">
              Parsed rows will appear here
            </div>
          ) : (
            <table className="w-full min-w-[420px] text-xs">
              <thead>
                <tr className="border-b border-white/8 text-left text-[0.6rem] font-black uppercase text-slate-500">
                  <th className="pb-2 pr-3">Status</th>
                  <th className="pb-2 pr-3">IGN</th>
                  <th className="pb-2 pr-3">Discord</th>
                  <th className="pb-2 pr-3">Role</th>
                  <th className="pb-2">Div</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={i} className={cn("border-b border-white/4", row.confidence === "red" && "opacity-50")}>
                    <td className="py-1.5 pr-3">
                      <span className={cn(
                        "inline-block h-2 w-2 rounded-full",
                        row.confidence === "green" && "bg-emerald-400",
                        row.confidence === "yellow" && "bg-amber-400",
                        row.confidence === "red" && "bg-red-400",
                      )} title={row.warnings.join("; ")} />
                    </td>
                    <td className="py-1.5 pr-3 font-semibold text-white">{row.ign || <span className="text-red-400">—</span>}</td>
                    <td className="py-1.5 pr-3 text-slate-400">{row.discordUsername || <span className="text-red-400">—</span>}</td>
                    <td className="py-1.5 pr-3 text-slate-300">
                      {row.primaryRole ?? <span className="text-red-400">—</span>}
                      {row.secondaryRoles.length > 0 && (
                        <span className="ml-1 text-slate-500">+{row.secondaryRoles.length}</span>
                      )}
                    </td>
                    <td className="py-1.5">
                      {row.divisionId ? (
                        <span className={cn(
                          "rounded px-1 py-0.5 font-black uppercase",
                          row.divisionId === "solar" && "text-orange-400",
                          row.divisionId === "lunar" && "text-cyan-400",
                          row.divisionId === "gaia" && "text-emerald-400",
                        )}>{row.divisionId.slice(0, 3)}</span>
                      ) : <span className="text-slate-600">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </main>
  );
}
