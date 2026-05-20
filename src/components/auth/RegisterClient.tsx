"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { LeaguePlayer } from "@/types/league";
import type { FormField, Registration } from "@/types/auth";
import { cn } from "@/lib/utils";

interface Props {
  discordId: string;
  discordDisplayName: string;
  claimedPlayer: LeaguePlayer | null;
  matchedByUsername: LeaguePlayer | null;
  existingRegistration: Registration | null;
  formFields: FormField[];
}

const STATUS_LABEL: Record<Registration["status"], string> = {
  pending: "Pending review",
  approved: "Approved",
  rejected: "Rejected",
};
const STATUS_STYLE: Record<Registration["status"], string> = {
  pending: "border-amber-300/30 bg-amber-300/10 text-amber-200",
  approved: "border-emerald-300/30 bg-emerald-300/10 text-emerald-200",
  rejected: "border-red-300/30 bg-red-300/10 text-red-200",
};

export function RegisterClient({
  discordId,
  discordDisplayName,
  claimedPlayer,
  matchedByUsername,
  existingRegistration,
  formFields,
}: Props) {
  const router = useRouter();
  const [claiming, setClaiming] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);
  const [claimed, setClaimed] = useState(false);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  // ── Flow A: already claimed ──────────────────────────────────────────────
  if (claimedPlayer || claimed) {
    const player = claimedPlayer;
    return (
      <div className="rounded-2xl border border-emerald-300/25 bg-slate-950/84 p-6 backdrop-blur">
        <div className="mb-4 flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-emerald-500/30 to-cyan-500/20 text-sm font-black text-emerald-100">
            {player?.avatarInitials ?? discordDisplayName.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <p className="font-black text-white">{player?.ign ?? discordDisplayName}</p>
            <p className="text-xs text-slate-500">Profile linked to your Discord</p>
          </div>
          <span className="ml-auto rounded-xl border border-emerald-300/30 bg-emerald-300/10 px-2.5 py-0.5 text-[0.65rem] font-black uppercase text-emerald-200">
            Claimed
          </span>
        </div>
        {player && (
          <Link
            href={`/players/${player.id}`}
            className="block w-full rounded-xl border border-white/10 bg-white/[0.04] py-2 text-center text-sm font-black uppercase text-slate-300 transition hover:bg-white/[0.08] hover:text-white"
          >
            View Your Profile →
          </Link>
        )}
      </div>
    );
  }

  // ── Flow A: username match, prompt to claim ──────────────────────────────
  if (matchedByUsername && !existingRegistration) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-cyan-300/20 bg-slate-950/84 p-6 backdrop-blur">
          <p className="mb-4 text-sm font-semibold text-slate-300">
            We found a player profile matching your Discord username.
          </p>
          <div className="mb-5 flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3">
            <div
              className={cn(
                "grid h-11 w-11 shrink-0 place-items-center rounded-xl text-sm font-black text-white",
                matchedByUsername.avatarGradient,
              )}
            >
              {matchedByUsername.avatarInitials}
            </div>
            <div>
              <p className="font-black text-white">{matchedByUsername.ign}</p>
              <p className="text-xs text-slate-500">@{matchedByUsername.discordUsername}</p>
            </div>
            <span className="ml-auto text-xs font-black uppercase text-slate-500">
              {matchedByUsername.primaryRole}
            </span>
          </div>
          <p className="mb-4 text-xs text-slate-500">
            Is this you? Claiming links your Discord account to this profile permanently.
          </p>
          <div className="flex gap-2">
            <button
              onClick={async () => {
                setClaiming(true);
                setClaimError(null);
                const res = await fetch("/api/auth/claim", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ playerId: matchedByUsername.id }),
                });
                const data = await res.json();
                if (!res.ok) setClaimError(data.error);
                else { setClaimed(true); router.refresh(); }
                setClaiming(false);
              }}
              disabled={claiming}
              className="flex-1 rounded-xl border border-cyan-300/40 bg-cyan-300/15 py-2 text-sm font-black uppercase text-cyan-100 transition hover:bg-cyan-300/22 disabled:opacity-60"
            >
              {claiming ? "Linking…" : "Yes, this is me"}
            </button>
            <button
              onClick={() => router.push("/register?skip=1")}
              className="flex-1 rounded-xl border border-white/10 bg-white/[0.04] py-2 text-sm font-black uppercase text-slate-400 transition hover:bg-white/[0.08]"
            >
              Not me
            </button>
          </div>
          {claimError && <p className="mt-2 text-xs font-semibold text-red-400">{claimError}</p>}
        </div>
      </div>
    );
  }

  // ── Existing registration status ─────────────────────────────────────────
  if (existingRegistration) {
    return (
      <div className="rounded-2xl border border-white/10 bg-slate-950/84 p-6 backdrop-blur">
        <div className="mb-4 flex items-center justify-between">
          <p className="font-black text-white">Registration submitted</p>
          <span
            className={cn(
              "rounded-xl border px-2.5 py-0.5 text-[0.65rem] font-black uppercase",
              STATUS_STYLE[existingRegistration.status],
            )}
          >
            {STATUS_LABEL[existingRegistration.status]}
          </span>
        </div>
        <div className="space-y-2 rounded-xl border border-white/8 bg-white/[0.02] p-3">
          {Object.entries(existingRegistration.formData).map(([key, value]) => (
            <div key={key} className="flex justify-between gap-4 text-xs">
              <span className="font-semibold uppercase text-slate-500">{key.replace(/_/g, " ")}</span>
              <span className="truncate text-slate-300">{value}</span>
            </div>
          ))}
        </div>
        {existingRegistration.status === "rejected" && existingRegistration.reviewerNote && (
          <p className="mt-3 text-xs text-red-400">
            <span className="font-black">Note:</span> {existingRegistration.reviewerNote}
          </p>
        )}
        {existingRegistration.status === "pending" && (
          <p className="mt-3 text-xs text-slate-500">
            An admin will review your registration. You&apos;ll receive a Discord DM when approved.
          </p>
        )}
      </div>
    );
  }

  // ── Flow B: new registration form ────────────────────────────────────────
  const visibleFields = formFields.filter((f) => !f.hidden).sort((a, b) => a.fieldOrder - b.fieldOrder);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError(null);

    // Client-side validation
    for (const field of visibleFields) {
      if (!field.required) continue;
      const val = formData[field.key] ?? "";
      if (!val.trim()) {
        setSubmitError(`${field.label} is required.`);
        setSubmitting(false);
        return;
      }
      if (field.fieldType === "url" && field.validationHint?.includes("tracker.gg")) {
        if (!val.includes("tracker.gg")) {
          setSubmitError(`${field.label} must be a tracker.gg link.`);
          setSubmitting(false);
          return;
        }
        try { new URL(val); } catch {
          setSubmitError(`${field.label} must be a valid URL.`);
          setSubmitting(false);
          return;
        }
      }
    }

    // Validate roles differ
    const primary = formData["primary_role"];
    const secondary = formData["secondary_role"];
    if (primary && secondary && primary === secondary) {
      setSubmitError("Primary and Secondary Role must be different.");
      setSubmitting(false);
      return;
    }

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ formData }),
    });
    const data = await res.json();
    if (!res.ok) setSubmitError(data.error ?? "Submission failed.");
    else setSubmitted(true);
    setSubmitting(false);
  }

  if (submitted) {
    return (
      <div className="rounded-2xl border border-emerald-300/20 bg-slate-950/84 p-8 text-center backdrop-blur">
        <p className="text-2xl font-black text-emerald-300">✓</p>
        <p className="mt-2 font-black text-white">Registration submitted!</p>
        <p className="mt-1 text-sm text-slate-400">
          An admin will review your registration. You&apos;ll receive a Discord DM when approved.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-white/10 bg-slate-950/84 p-6 backdrop-blur"
    >
      <div className="mb-5 flex items-center gap-2 rounded-xl border border-indigo-400/20 bg-indigo-400/8 px-3 py-2 text-xs text-indigo-200">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.015.043.03.054a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/></svg>
        Signed in as <strong>{discordDisplayName}</strong>
      </div>

      <div className="space-y-4">
        {visibleFields.map((field) => (
          <FieldInput
            key={field.id}
            field={field}
            value={formData[field.key] ?? ""}
            onChange={(v) => setFormData((prev) => ({ ...prev, [field.key]: v }))}
          />
        ))}
      </div>

      {submitError && (
        <p className="mt-4 text-sm font-semibold text-red-400">{submitError}</p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="mt-6 w-full rounded-xl border border-cyan-300/40 bg-cyan-300/15 py-2.5 text-sm font-black uppercase text-cyan-100 transition hover:bg-cyan-300/22 disabled:opacity-60"
      >
        {submitting ? "Submitting…" : "Submit Registration"}
      </button>
    </form>
  );
}

function FieldInput({
  field,
  value,
  onChange,
}: {
  field: FormField;
  value: string;
  onChange: (v: string) => void;
}) {
  const inputClass =
    "w-full rounded-xl border border-white/10 bg-black/45 px-4 py-2 text-sm font-semibold text-white placeholder:text-slate-600 focus:border-cyan-500/40 focus:outline-none focus:ring-1 focus:ring-cyan-500/20";

  return (
    <div>
      <label className="mb-1.5 block text-xs font-black uppercase text-slate-400">
        {field.label}
        {field.required && <span className="ml-1 text-red-400">*</span>}
      </label>
      {field.fieldType === "select" ? (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cn(inputClass, "appearance-none")}
        >
          <option value="">Select…</option>
          {(field.options ?? []).map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      ) : field.fieldType === "textarea" ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          rows={3}
          className={inputClass}
        />
      ) : (
        <input
          type={field.fieldType === "url" ? "url" : "text"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          className={inputClass}
        />
      )}
      {field.validationHint && (
        <p className="mt-1 text-[0.65rem] text-slate-500">{field.validationHint}</p>
      )}
    </div>
  );
}
