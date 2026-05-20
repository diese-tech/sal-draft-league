import { redirect } from "next/navigation";
import {
  getAuthUser,
  getDiscordId,
  getDiscordDisplayName,
} from "@/lib/supabase-auth-server";
import {
  getLeagueData,
  getFormFields,
  getPlayerByDiscordId,
  getRegistrationByDiscordId,
} from "@/lib/league-data";
import { RegisterClient } from "@/components/auth/RegisterClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Register — SAL" };

export default async function RegisterPage() {
  const user = await getAuthUser();
  if (!user) redirect("/auth/signin");

  const discordId = getDiscordId(user);
  if (!discordId) redirect("/auth/error?message=discord_id_missing");

  const [{ players }, formFields, claimedPlayer, existingReg] = await Promise.all([
    getLeagueData(),
    getFormFields(),
    getPlayerByDiscordId(discordId),
    getRegistrationByDiscordId(discordId),
  ]);

  // Try to match by discord username if no discord_id link yet
  const discordUsername = user.user_metadata?.user_name as string | undefined;
  const matchedByUsername = !claimedPlayer && discordUsername
    ? players.find(
        (p) =>
          p.discordUsername.toLowerCase() === discordUsername.toLowerCase() &&
          !p.stats, // avoid matching if already stats-rich (unlikely to be unclaimed)
      ) ?? null
    : null;

  return (
    <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <div className="mb-8">
        <p className="mb-1 text-[0.65rem] font-black uppercase tracking-widest text-cyan-300/70">
          Serpent Ascension League
        </p>
        <h1 className="text-2xl font-black text-white">
          {claimedPlayer ? "Your Profile" : "Player Registration"}
        </h1>
      </div>
      <RegisterClient
        discordId={discordId}
        discordDisplayName={getDiscordDisplayName(user)}
        claimedPlayer={claimedPlayer}
        matchedByUsername={matchedByUsername}
        existingRegistration={existingReg}
        formFields={formFields}
      />
    </main>
  );
}
