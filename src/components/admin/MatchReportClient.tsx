"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { LeagueData, Match } from "@/types/league";
import type { ExtractedGame, ExtractedPlayer, MatchReportWithMatch } from "@/types/match-report";
import { MatchReportCard } from "@/components/admin/MatchReportCard";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ReviewPlayer extends ExtractedPlayer {
  playerId?: string;
}

interface ReviewGame {
  gameNumber: number;
  winningSide: "home" | "away";
  players: ReviewPlayer[];
}

type Step = "select" | "upload" | "extracting" | "review" | "confirming" | "done";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const DIV_COLOR: Record<string, string> = {
  gaia: "text-emerald-400",
  solar: "text-orange-400",
  lunar: "text-cyan-400",
};

const DIV_DOT: Record<string, string> = {
  gaia: "bg-emerald-400",
  solar: "bg-orange-400",
  lunar: "bg-cyan-400",
};

const ROLES = ["Solo", "Jungle", "Mid", "Carry", "Support"] as const;

function fmtDate(d: string) {
  if (!d) return "";
  const [y, m, day] = d.split("-");
  return `${m}/${day}/${y}`;
}

async function resizeImage(file: File, maxWidth = 1200): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = img.naturalWidth > maxWidth ? maxWidth / img.naturalWidth : 1;
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.naturalWidth * scale);
      canvas.height = Math.round(img.naturalHeight * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("Canvas unavailable")); return; }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Canvas toBlob failed"));
      }, "image/jpeg", 0.88);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Image load failed")); };
    img.src = url;
  });
}

function makeBlankPlayers(orgId: string, players: LeagueData["players"], side: "home" | "away"): ReviewPlayer[] {
  const roster = players.filter((p) => p.orgId === orgId && !p.archivedAt);
  if (roster.length > 0) {
    return roster.slice(0, 5).map((p) => ({
      ign: p.ign,
      playerId: p.id,
      side,
      kills: 0, deaths: 0, assists: 0,
    }));
  }
  return Array.from({ length: 5 }, (_, i) => ({
    ign: "",
    side,
    kills: 0, deaths: 0, assists: 0,
  }));
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionHeader({ children }: { children: React.ReactNode }) {
  return <p className="mb-3 text-[0.65rem] font-black uppercase tracking-widest text-cyan-300/70">{children}</p>;
}

function StatInput({
  value,
  onChange,
  wide,
}: {
  value: number | undefined;
  onChange: (v: number) => void;
  wide?: boolean;
}) {
  return (
    <input
      type="number"
      min={0}
      value={value ?? ""}
      onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))}
      className={cn(
        "rounded border border-white/10 bg-black/30 px-1 py-0.5 text-center text-xs font-semibold text-white focus:border-cyan-300/40 focus:outline-none",
        wide ? "w-16" : "w-10",
      )}
    />
  );
}

function IgnInput({
  value,
  onChange,
  roster,
  onPlayerMatch,
  unmatched,
}: {
  value: string;
  onChange: (v: string) => void;
  roster: Array<{ id: string; ign: string }>;
  onPlayerMatch: (id?: string) => void;
  unmatched?: boolean;
}) {
  const listId = `roster-${Math.random().toString(36).slice(2)}`;
  return (
    <div className="relative">
      <input
        type="text"
        value={value}
        list={listId}
        onChange={(e) => {
          const v = e.target.value;
          onChange(v);
          const match = roster.find((r) => r.ign.toLowerCase() === v.toLowerCase());
          onPlayerMatch(match?.id);
        }}
        placeholder="IGN"
        className={cn(
          "w-full rounded border px-1.5 py-0.5 text-xs font-semibold text-white focus:outline-none",
          unmatched
            ? "border-amber-400/40 bg-amber-400/8 focus:border-amber-400/60"
            : "border-white/10 bg-black/30 focus:border-cyan-300/40",
        )}
      />
      <datalist id={listId}>
        {roster.map((p) => <option key={p.id} value={p.ign} />)}
      </datalist>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function MatchReportClient({
  data,
  initialReports,
}: {
  data: LeagueData;
  initialReports: MatchReportWithMatch[];
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  const [reports, setReports] = useState<MatchReportWithMatch[]>(initialReports);
  const [activeReportId, setActiveReportId] = useState<string | null>(null);
  const [step, setStep] = useState<Step>("select");
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [matchSearch, setMatchSearch] = useState("");
  const [previewFiles, setPreviewFiles] = useState<{ file: File; objectUrl: string }[]>([]);
  const [uploadedUrls, setUploadedUrls] = useState<string[]>([]);
  const [games, setGames] = useState<ReviewGame[]>([]);
  const [activeGameIdx, setActiveGameIdx] = useState(0);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const activeReport = reports.find((r) => r.id === activeReportId) ?? null;
  const orgMap = new Map(data.orgs.map((o) => [o.id, o]));

  // Matches without an existing report, that are scheduled or live
  const reportedMatchIds = new Set(reports.map((r) => r.matchId));
  const openMatches = data.matches.filter(
    (m) => !m.archivedAt && (m.status === "scheduled" || m.status === "live") && !reportedMatchIds.has(m.id),
  );

  // Group by division (Gaia → Solar → Lunar)
  const divOrder = ["gaia", "solar", "lunar"];
  const matchesByDiv = divOrder.map((divId) => ({
    divId,
    matches: openMatches.filter((m) => m.divisionId === divId && (
      matchSearch === "" ||
      orgMap.get(m.homeOrgId)?.name.toLowerCase().includes(matchSearch.toLowerCase()) ||
      orgMap.get(m.awayOrgId)?.name.toLowerCase().includes(matchSearch.toLowerCase())
    )),
  })).filter((g) => g.matches.length > 0);

  function resetToNew() {
    setActiveReportId(null);
    setStep("select");
    setSelectedMatch(null);
    setMatchSearch("");
    previewFiles.forEach((f) => URL.revokeObjectURL(f.objectUrl));
    setPreviewFiles([]);
    setUploadedUrls([]);
    setGames([]);
    setActiveGameIdx(0);
    setMessage("");
  }

  function toReviewGames(extracted: ExtractedGame[]): ReviewGame[] {
    return extracted.map((g) => ({
      gameNumber: g.gameNumber,
      winningSide: g.winningSide === "away" ? "away" : "home",
      players: g.players.map((p) => {
        const matched = data.players.find((pl) => pl.ign.toLowerCase() === p.ign.toLowerCase());
        return { ...p, playerId: matched?.id };
      }),
    }));
  }

  function openExistingReport(report: MatchReportWithMatch) {
    setActiveReportId(report.id);
    const match = data.matches.find((m) => m.id === report.matchId) ?? null;
    setSelectedMatch(match);
    setUploadedUrls(report.screenshotUrls ?? []);
    setMessage("");

    if (report.status === "done") {
      setStep("done");
      return;
    }

    if (report.status === "review") {
      const restoredGames = report.extractedData?.length
        ? toReviewGames(report.extractedData)
        : initBlankGamesValue();
      setGames(restoredGames);
      setActiveGameIdx(0);
      setStep("review");
      return;
    }

    setStep("upload");
  }

  // ── Step 1: Select match and create report ──────────────────────────────────

  async function selectMatch(match: Match) {
    setSelectedMatch(match);
    setBusy(true);
    setMessage("");
    try {
      const res = await fetch("/api/admin/match-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchId: match.id }),
      });
      const json = await res.json() as { id?: string; error?: string };
      if (!res.ok) { setMessage(json.error ?? "Failed to create report."); setBusy(false); return; }
      setActiveReportId(json.id!);
      setStep("upload");
      // Refresh reports list
      refreshReports();
    } catch {
      setMessage("Network error.");
    }
    setBusy(false);
  }

  async function refreshReports() {
    try {
      const res = await fetch("/api/admin/match-reports");
      const json = await res.json() as { reports?: MatchReportWithMatch[] };
      if (json.reports) setReports(json.reports);
    } catch { /* silent */ }
  }

  // ── Step 2: File handling ───────────────────────────────────────────────────

  function addFiles(newFiles: File[]) {
    const imageFiles = newFiles.filter((f) => f.type.startsWith("image/"));
    const remaining = 5 - previewFiles.length;
    const toAdd = imageFiles.slice(0, remaining);
    setPreviewFiles((prev) => [
      ...prev,
      ...toAdd.map((f) => ({ file: f, objectUrl: URL.createObjectURL(f) })),
    ]);
  }

  function removeFile(idx: number) {
    setPreviewFiles((prev) => {
      URL.revokeObjectURL(prev[idx]!.objectUrl);
      return prev.filter((_, i) => i !== idx);
    });
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    addFiles(Array.from(e.dataTransfer.files));
  }, [previewFiles.length]);

  function handlePaste(e: React.ClipboardEvent) {
    const items = Array.from(e.clipboardData.items);
    const imageItems = items.filter((item) => item.type.startsWith("image/"));
    addFiles(imageItems.map((item) => item.getAsFile()!).filter(Boolean));
  }

  // ── Extract ─────────────────────────────────────────────────────────────────

  async function handleExtract() {
    if (!activeReportId) return;
    if (previewFiles.length === 0 && uploadedUrls.length === 0) return;
    setBusy(true);
    setMessage("");

    if (previewFiles.length > 0) {
      // Upload files first
      const formData = new FormData();
      for (const { file } of previewFiles) {
        try {
          const resized = await resizeImage(file);
          formData.append("screenshots", resized, file.name);
        } catch {
          formData.append("screenshots", file, file.name);
        }
      }

      try {
        const uploadRes = await fetch(`/api/admin/match-reports/${activeReportId}/upload`, {
          method: "POST",
          body: formData,
        });
        const uploadJson = await uploadRes.json() as { allUrls?: string[]; error?: string };
        if (!uploadRes.ok) { setMessage(uploadJson.error ?? "Upload failed."); setBusy(false); return; }
        setUploadedUrls(uploadJson.allUrls ?? []);
      } catch {
        setMessage("Upload failed.");
        setBusy(false);
        return;
      }
    }

    // Trigger AI extraction
    setStep("extracting");
    try {
      const extractRes = await fetch(`/api/admin/match-reports/${activeReportId}/extract`, { method: "POST" });
      const extractJson = await extractRes.json() as { games?: ExtractedGame[]; error?: string; aiUnavailable?: boolean };

      if (extractJson.aiUnavailable) {
        setMessage("AI extraction not available — enter stats manually.");
        initBlankGames();
        setStep("review");
        setBusy(false);
        return;
      }
      if (!extractRes.ok) {
        setMessage(extractJson.error ?? "Extraction failed — enter stats manually.");
        initBlankGames();
        setStep("review");
        setBusy(false);
        return;
      }

      const extracted = extractJson.games ?? [];
      const reviewGames = toReviewGames(extracted);
      setGames(reviewGames.length > 0 ? reviewGames : initBlankGamesValue());
      setStep("review");
      setActiveGameIdx(0);
      refreshReports();
    } catch {
      setMessage("Extraction failed — enter stats manually.");
      initBlankGames();
      setStep("review");
    }
    setBusy(false);
  }

  function initBlankGamesValue(): ReviewGame[] {
    if (!selectedMatch) return [];
    const homeMatch = data.players.filter((p) => p.orgId === selectedMatch.homeOrgId && !p.archivedAt);
    const awayMatch = data.players.filter((p) => p.orgId === selectedMatch.awayOrgId && !p.archivedAt);
    return [
      {
        gameNumber: 1,
        winningSide: "home",
        players: [
          ...homeMatch.slice(0, 5).map((p) => ({ ign: p.ign, playerId: p.id, side: "home" as const, kills: 0, deaths: 0, assists: 0 })),
          ...awayMatch.slice(0, 5).map((p) => ({ ign: p.ign, playerId: p.id, side: "away" as const, kills: 0, deaths: 0, assists: 0 })),
        ],
      },
    ];
  }

  function initBlankGames() {
    setGames(initBlankGamesValue());
    setActiveGameIdx(0);
  }

  // ── Review helpers ──────────────────────────────────────────────────────────

  function updatePlayer(gameIdx: number, playerIdx: number, patch: Partial<ReviewPlayer>) {
    setGames((prev) => prev.map((g, gi) =>
      gi !== gameIdx ? g : {
        ...g,
        players: g.players.map((p, pi) => pi !== playerIdx ? p : { ...p, ...patch }),
      },
    ));
  }

  function setWinner(gameIdx: number, side: "home" | "away") {
    setGames((prev) => prev.map((g, gi) =>
      gi !== gameIdx ? g : {
        ...g,
        winningSide: side,
        players: g.players.map((p) => ({ ...p, won: p.side === side })),
      },
    ));
  }

  function addGame() {
    if (!selectedMatch) return;
    const newGame: ReviewGame = {
      gameNumber: games.length + 1,
      winningSide: "home",
      players: initBlankGamesValue()[0]?.players ?? [],
    };
    setGames((prev) => [...prev, newGame]);
    setActiveGameIdx(games.length);
  }

  function removeLastGame() {
    if (games.length <= 1) return;
    setGames((prev) => prev.slice(0, -1));
    setActiveGameIdx((prev) => Math.min(prev, games.length - 2));
  }

  // ── Submit ──────────────────────────────────────────────────────────────────

  async function handleSubmit() {
    if (!activeReportId) return;
    setBusy(true);
    setMessage("");

    const payload = {
      games: games.map((g) => ({
        gameNumber: g.gameNumber,
        winningSide: g.winningSide,
        players: g.players
          .filter((p) => p.ign.trim())
          .map((p) => ({
            playerIgn: p.ign,
            playerId: p.playerId,
            side: p.side,
            won: p.side === g.winningSide,
            kills: p.kills,
            deaths: p.deaths,
            assists: p.assists,
            godPlayed: p.god,
            role: p.role,
            damageDealt: p.damageDealt,
            damageMitigated: p.damageMitigated,
          })),
      })),
    };

    try {
      const res = await fetch(`/api/admin/match-reports/${activeReportId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json() as { ok?: boolean; error?: string; homeScore?: number; awayScore?: number };
      if (!res.ok) { setMessage(json.error ?? "Submit failed."); setBusy(false); return; }
      setStep("done");
      refreshReports();
      router.refresh();
    } catch {
      setMessage("Network error.");
    }
    setBusy(false);
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  const homeOrg = selectedMatch ? orgMap.get(selectedMatch.homeOrgId) : null;
  const awayOrg = selectedMatch ? orgMap.get(selectedMatch.awayOrgId) : null;
  const homeRoster = selectedMatch
    ? data.players.filter((p) => p.orgId === selectedMatch.homeOrgId && !p.archivedAt)
    : [];
  const awayRoster = selectedMatch
    ? data.players.filter((p) => p.orgId === selectedMatch.awayOrgId && !p.archivedAt)
    : [];

  const seriesScore = games.reduce(
    (acc, g) => {
      if (g.winningSide === "home") acc.home++;
      else acc.away++;
      return acc;
    },
    { home: 0, away: 0 },
  );

  const currentGame = games[activeGameIdx];
  const homePlayers = currentGame?.players.filter((p) => p.side === "home") ?? [];
  const awayPlayers = currentGame?.players.filter((p) => p.side === "away") ?? [];

  function addPlayerToSide(gameIdx: number, side: "home" | "away") {
    setGames((prev) => prev.map((g, gi) =>
      gi !== gameIdx ? g : {
        ...g,
        players: [...g.players, { ign: "", side, kills: 0, deaths: 0, assists: 0 }],
      },
    ));
  }

  function removePlayer(gameIdx: number, playerIdx: number) {
    setGames((prev) => prev.map((g, gi) =>
      gi !== gameIdx ? g : {
        ...g,
        players: g.players.filter((_, pi) => pi !== playerIdx),
      },
    ));
  }

  return (
    <div className="flex gap-5 lg:items-start">
      {/* ── Left sidebar ─────────────────────────────────────────────────── */}
      <aside className="hidden w-72 shrink-0 space-y-3 lg:block">
        <button
          onClick={resetToNew}
          className="w-full rounded-xl border border-cyan-300/35 bg-cyan-300/15 py-2 text-sm font-black uppercase text-cyan-100 transition hover:bg-cyan-300/20"
        >
          + New Match Report
        </button>

        {reports.length === 0 && (
          <p className="py-4 text-center text-xs font-semibold text-slate-600">No reports yet.</p>
        )}
        {reports.map((r) => (
          <MatchReportCard
            key={r.id}
            report={r}
            active={r.id === activeReportId}
            onClick={() => openExistingReport(r)}
          />
        ))}
      </aside>

      {/* ── Main panel ───────────────────────────────────────────────────── */}
      <div className="min-w-0 flex-1">
        {/* Mobile: new report button */}
        <div className="mb-4 lg:hidden">
          <button
            onClick={resetToNew}
            className="rounded-xl border border-cyan-300/35 bg-cyan-300/15 px-4 py-2 text-sm font-black uppercase text-cyan-100"
          >
            + New Report
          </button>
        </div>

        {message && (
          <div className="mb-4 rounded-xl border border-orange-300/30 bg-orange-300/10 px-4 py-3 text-sm font-semibold text-orange-100">
            {message}
          </div>
        )}

        {/* ── Step: Select match ───────────────────────────────────────── */}
        {step === "select" && (
          <div className="rounded-2xl border border-white/8 bg-slate-950/60 p-5">
            <SectionHeader>Select a match to report</SectionHeader>
            <input
              value={matchSearch}
              onChange={(e) => setMatchSearch(e.target.value)}
              placeholder="Search by team name…"
              className="mb-4 w-full rounded-xl border border-white/10 bg-black/45 px-3 py-2 text-sm font-semibold text-white placeholder-slate-500 outline-none focus:border-cyan-300/50"
            />
            {openMatches.length === 0 && (
              <p className="py-6 text-center text-sm font-semibold text-slate-500">
                No scheduled matches available. All matches may already have reports.
              </p>
            )}
            {matchesByDiv.map(({ divId, matches }) => (
              <div key={divId} className="mb-4 last:mb-0">
                <p className={cn("mb-2 text-[0.6rem] font-black uppercase tracking-wider", DIV_COLOR[divId])}>
                  {divId.charAt(0).toUpperCase() + divId.slice(1)} Division
                </p>
                <div className="space-y-1.5">
                  {matches.map((m) => {
                    const home = orgMap.get(m.homeOrgId);
                    const away = orgMap.get(m.awayOrgId);
                    return (
                      <button
                        key={m.id}
                        onClick={() => void selectMatch(m)}
                        disabled={busy}
                        className="flex w-full items-center justify-between rounded-xl border border-white/8 bg-black/20 px-4 py-2.5 text-left transition hover:border-white/20 hover:bg-white/[0.05] disabled:opacity-50"
                      >
                        <div className="flex items-center gap-2">
                          <span className={cn("h-2 w-2 shrink-0 rounded-full", DIV_DOT[divId])} />
                          <span className="text-sm font-black text-white">
                            {home?.name ?? m.homeOrgId} <span className="font-semibold text-slate-500">vs</span> {away?.name ?? m.awayOrgId}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <span>{fmtDate(m.scheduledDate)}</span>
                          <span className="rounded border border-white/10 px-1.5 py-0.5 text-[0.6rem] font-black uppercase">Wk {m.week}</span>
                          {m.status === "live" && (
                            <span className="rounded border border-orange-400/40 bg-orange-400/10 px-1.5 py-0.5 text-[0.6rem] font-black uppercase text-orange-300">Live</span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Step: Upload ─────────────────────────────────────────────── */}
        {step === "upload" && selectedMatch && (
          <div className="space-y-4">
            {/* Match header */}
            <div className="rounded-xl border border-white/8 bg-slate-950/60 px-4 py-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className={cn("h-2 w-2 shrink-0 rounded-full", DIV_DOT[selectedMatch.divisionId])} />
                  <p className="font-black text-white">
                    {homeOrg?.name ?? selectedMatch.homeOrgId}{" "}
                    <span className="text-slate-500">vs</span>{" "}
                    {awayOrg?.name ?? selectedMatch.awayOrgId}
                  </p>
                </div>
                <span className="text-xs text-slate-500">{fmtDate(selectedMatch.scheduledDate)} · Wk {selectedMatch.week}</span>
              </div>
            </div>

            {/* Drop zone */}
            <div
              ref={dropRef}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onPaste={handlePaste}
              tabIndex={0}
              className={cn(
                "rounded-2xl border-2 border-dashed p-8 text-center transition focus:outline-none",
                dragOver
                  ? "border-cyan-300/60 bg-cyan-300/8"
                  : "border-white/15 bg-slate-950/40 hover:border-white/25",
              )}
            >
              <p className="text-sm font-semibold text-slate-400">
                Drop DETAILS screenshots, click to browse, or Ctrl+V to paste
              </p>
              <p className="mt-1 text-xs text-slate-600">One screenshot per game · max 5 · JPEG/PNG/WebP</p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="mt-4 rounded-xl border border-white/15 bg-white/[0.06] px-4 py-2 text-xs font-black uppercase text-slate-300 transition hover:border-white/25 hover:bg-white/[0.10]"
              >
                Browse Files
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => addFiles(Array.from(e.target.files ?? []))}
              />
            </div>

            {/* Thumbnails */}
            {previewFiles.length > 0 && (
              <div className="flex flex-wrap gap-3">
                {previewFiles.map(({ objectUrl }, idx) => (
                  <div key={idx} className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={objectUrl}
                      alt={`Game ${idx + 1}`}
                      className="h-20 w-32 rounded-lg border border-white/10 object-cover"
                    />
                    <button
                      onClick={() => removeFile(idx)}
                      className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full border border-white/20 bg-slate-800 text-[0.6rem] font-black text-slate-300 hover:text-white"
                    >
                      ×
                    </button>
                    <span className="absolute bottom-1 left-1 rounded bg-black/70 px-1 text-[0.55rem] font-black text-white">G{idx + 1}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Also show previously uploaded URLs if re-opening */}
            {previewFiles.length === 0 && uploadedUrls.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-semibold text-slate-500">{uploadedUrls.length} screenshot{uploadedUrls.length !== 1 ? "s" : ""} already uploaded</p>
                <div className="flex flex-wrap gap-3">
                  {uploadedUrls.map((url, idx) => (
                    <div key={idx} className="relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt={`Game ${idx + 1}`} className="h-20 w-32 rounded-lg border border-white/10 object-cover" />
                      <span className="absolute bottom-1 left-1 rounded bg-black/70 px-1 text-[0.55rem] font-black text-white">G{idx + 1}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => void handleExtract()}
                disabled={busy || (previewFiles.length === 0 && uploadedUrls.length === 0)}
                className="rounded-xl border border-emerald-300/40 bg-emerald-300/15 px-5 py-2.5 text-sm font-black uppercase text-emerald-100 transition hover:bg-emerald-300/20 disabled:opacity-50"
              >
                {busy ? "Uploading…" : "Extract with AI"}
              </button>
              <button
                onClick={() => { initBlankGames(); setStep("review"); }}
                className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-black uppercase text-slate-400 transition hover:text-slate-200"
              >
                Skip → Manual Entry
              </button>
            </div>
          </div>
        )}

        {/* ── Step: Extracting ─────────────────────────────────────────── */}
        {step === "extracting" && (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-white/8 bg-slate-950/60 py-16">
            <div className="mb-4 h-8 w-8 animate-spin rounded-full border-2 border-cyan-300/30 border-t-cyan-300" />
            <p className="text-sm font-black text-white">AI is reading the scoreboard…</p>
            <p className="mt-1 text-xs text-slate-500">This takes a few seconds per game</p>
            {uploadedUrls.length > 0 && (
              <div className="mt-6 flex flex-wrap justify-center gap-2">
                {uploadedUrls.map((url, idx) => (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img key={idx} src={url} alt={`G${idx + 1}`} className="h-14 w-24 rounded border border-white/10 object-cover opacity-60" />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Step: Review ─────────────────────────────────────────────── */}
        {(step === "review" || step === "confirming") && currentGame && (
          <div className="space-y-4">
            {/* Series score bar */}
            <div className="flex items-center justify-between rounded-xl border border-white/8 bg-slate-950/60 px-4 py-3">
              <span className="text-sm font-black text-white">{homeOrg?.tag ?? "Home"}</span>
              <span className="text-xl font-black text-white">
                {seriesScore.home} – {seriesScore.away}
              </span>
              <span className="text-sm font-black text-white">{awayOrg?.tag ?? "Away"}</span>
            </div>

            {/* Game tabs */}
            <div className="flex flex-wrap items-center gap-1.5">
              {games.map((g, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveGameIdx(idx)}
                  className={cn(
                    "rounded-lg border px-3 py-1.5 text-xs font-black uppercase transition",
                    activeGameIdx === idx
                      ? "border-cyan-300/40 bg-cyan-300/15 text-cyan-100"
                      : "border-white/10 bg-white/[0.04] text-slate-400 hover:text-slate-200",
                  )}
                >
                  Game {g.gameNumber}
                </button>
              ))}
              {games.length < 5 && (
                <button
                  onClick={addGame}
                  className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-black uppercase text-slate-500 transition hover:text-slate-200"
                >
                  + Game
                </button>
              )}
              {games.length > 1 && (
                <button
                  onClick={removeLastGame}
                  className="rounded-lg border border-red-400/20 px-3 py-1.5 text-xs font-black uppercase text-red-400/60 transition hover:text-red-300"
                >
                  Remove Last
                </button>
              )}
            </div>

            {/* Winner toggle */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase text-slate-500">Winner:</span>
              <button
                onClick={() => setWinner(activeGameIdx, "home")}
                className={cn(
                  "rounded-lg border px-3 py-1 text-xs font-black uppercase transition",
                  currentGame.winningSide === "home"
                    ? "border-emerald-400/50 bg-emerald-400/15 text-emerald-200"
                    : "border-white/10 bg-white/[0.04] text-slate-400 hover:text-slate-200",
                )}
              >
                {homeOrg?.name ?? "Home"}
              </button>
              <button
                onClick={() => setWinner(activeGameIdx, "away")}
                className={cn(
                  "rounded-lg border px-3 py-1 text-xs font-black uppercase transition",
                  currentGame.winningSide === "away"
                    ? "border-emerald-400/50 bg-emerald-400/15 text-emerald-200"
                    : "border-white/10 bg-white/[0.04] text-slate-400 hover:text-slate-200",
                )}
              >
                {awayOrg?.name ?? "Away"}
              </button>
            </div>

            {/* Stat tables — side by side */}
            <div className="grid gap-4 xl:grid-cols-2">
              {(["home", "away"] as const).map((side) => {
                const sideOrg = side === "home" ? homeOrg : awayOrg;
                const sideRoster = side === "home" ? homeRoster : awayRoster;
                const sidePlayers = currentGame.players
                  .map((p, globalIdx) => ({ p, globalIdx }))
                  .filter(({ p }) => p.side === side);
                const isWinner = currentGame.winningSide === side;

                return (
                  <div key={side} className={cn(
                    "overflow-hidden rounded-2xl border",
                    isWinner ? "border-emerald-400/25" : "border-white/8",
                  )}>
                    <div className={cn(
                      "flex items-center justify-between px-3 py-2",
                      isWinner ? "bg-emerald-400/8" : "bg-white/[0.03]",
                    )}>
                      <p className="text-xs font-black uppercase text-white">{sideOrg?.name ?? side}</p>
                      {isWinner && <span className="text-[0.6rem] font-black uppercase text-emerald-400">Victory</span>}
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[480px] text-xs">
                        <thead>
                          <tr className="border-b border-white/8 text-left text-[0.6rem] font-black uppercase text-slate-500">
                            <th className="px-2 py-1.5">IGN</th>
                            <th className="px-1 py-1.5">Role</th>
                            <th className="px-1 py-1.5">God</th>
                            <th className="px-1 py-1.5">K</th>
                            <th className="px-1 py-1.5">D</th>
                            <th className="px-1 py-1.5">A</th>
                            <th className="px-1 py-1.5">DMG</th>
                            <th className="px-1 py-1.5">MIT</th>
                            <th className="px-1 py-1.5" />
                          </tr>
                        </thead>
                        <tbody>
                          {sidePlayers.map(({ p, globalIdx }) => {
                            const isUnmatched = p.ign && !p.playerId;
                            return (
                              <tr key={globalIdx} className={cn("border-b border-white/5 last:border-0", isUnmatched && "bg-amber-400/5")}>
                                <td className="px-2 py-1">
                                  <IgnInput
                                    value={p.ign}
                                    onChange={(v) => updatePlayer(activeGameIdx, globalIdx, { ign: v })}
                                    roster={sideRoster.map((pl) => ({ id: pl.id, ign: pl.ign }))}
                                    onPlayerMatch={(id) => updatePlayer(activeGameIdx, globalIdx, { playerId: id })}
                                    unmatched={!!isUnmatched}
                                  />
                                </td>
                                <td className="px-1 py-1">
                                  <select
                                    value={p.role ?? ""}
                                    onChange={(e) => updatePlayer(activeGameIdx, globalIdx, { role: e.target.value || undefined })}
                                    className="w-20 rounded border border-white/10 bg-black/30 px-1 py-0.5 text-xs text-white focus:outline-none"
                                  >
                                    <option value="">—</option>
                                    {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                                  </select>
                                </td>
                                <td className="px-1 py-1">
                                  <input
                                    value={p.god ?? ""}
                                    onChange={(e) => updatePlayer(activeGameIdx, globalIdx, { god: e.target.value || undefined })}
                                    placeholder="God"
                                    className="w-20 rounded border border-white/10 bg-black/30 px-1 py-0.5 text-xs text-white focus:outline-none"
                                  />
                                </td>
                                <td className="px-1 py-1"><StatInput value={p.kills} onChange={(v) => updatePlayer(activeGameIdx, globalIdx, { kills: v })} /></td>
                                <td className="px-1 py-1"><StatInput value={p.deaths} onChange={(v) => updatePlayer(activeGameIdx, globalIdx, { deaths: v })} /></td>
                                <td className="px-1 py-1"><StatInput value={p.assists} onChange={(v) => updatePlayer(activeGameIdx, globalIdx, { assists: v })} /></td>
                                <td className="px-1 py-1"><StatInput value={p.damageDealt} onChange={(v) => updatePlayer(activeGameIdx, globalIdx, { damageDealt: v })} wide /></td>
                                <td className="px-1 py-1"><StatInput value={p.damageMitigated} onChange={(v) => updatePlayer(activeGameIdx, globalIdx, { damageMitigated: v })} wide /></td>
                                <td className="px-1 py-1">
                                  <button
                                    onClick={() => removePlayer(activeGameIdx, globalIdx)}
                                    className="text-slate-600 hover:text-red-400"
                                    title="Remove row"
                                  >×</button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    <div className="border-t border-white/5 px-3 py-1.5">
                      <button
                        onClick={() => addPlayerToSide(activeGameIdx, side)}
                        className="text-[0.65rem] font-black uppercase text-slate-600 hover:text-slate-300"
                      >
                        + Add row
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Submit button */}
            {step !== "confirming" ? (
              <button
                onClick={() => setStep("confirming")}
                disabled={busy || games.length === 0}
                className="rounded-xl border border-emerald-300/40 bg-emerald-300/15 px-6 py-3 text-sm font-black uppercase text-emerald-100 transition hover:bg-emerald-300/20 disabled:opacity-50"
              >
                Submit Result
              </button>
            ) : (
              <div className="rounded-2xl border border-orange-300/30 bg-orange-950/40 p-4">
                <p className="text-sm font-semibold text-orange-100">
                  Submit result:{" "}
                  <span className="font-black text-white">
                    {homeOrg?.name ?? "Home"} {seriesScore.home} – {seriesScore.away} {awayOrg?.name ?? "Away"}
                  </span>
                  {" "}({games.length} game{games.length !== 1 ? "s" : ""}).
                  This will mark the match completed and recalculate standings.
                </p>
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => void handleSubmit()}
                    disabled={busy}
                    className="rounded-xl border border-emerald-300/40 bg-emerald-300/15 px-4 py-2 text-sm font-black uppercase text-emerald-100 disabled:opacity-60"
                  >
                    {busy ? "Submitting…" : "Confirm & Submit"}
                  </button>
                  <button
                    onClick={() => setStep("review")}
                    className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-black uppercase text-slate-300"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Step: Done ───────────────────────────────────────────────── */}
        {step === "done" && activeReport && (
          <div className="rounded-2xl border border-emerald-300/20 bg-slate-950/60 p-8 text-center">
            <p className="text-2xl font-black text-emerald-300">Result Submitted</p>
            {activeReport.homeScore !== undefined && activeReport.awayScore !== undefined && (
              <p className="mt-2 text-3xl font-black text-white">
                {activeReport.homeOrgTag} {activeReport.homeScore} – {activeReport.awayScore} {activeReport.awayOrgTag}
              </p>
            )}
            <p className="mt-1 text-sm text-slate-400">
              Match marked completed · Standings updated · {activeReport.totalGames} game{activeReport.totalGames !== 1 ? "s" : ""} recorded
            </p>
            <button
              onClick={resetToNew}
              className="mt-6 rounded-xl border border-cyan-300/35 bg-cyan-300/15 px-5 py-2.5 text-sm font-black uppercase text-cyan-100"
            >
              Report Another Match
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
