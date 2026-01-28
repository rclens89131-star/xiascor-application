import { useCallback, useRef, useState } from "react";
import { apiFetch } from "../api";

type TeamInfo = { teamName: string | null; teamSlug: string | null };

export function usePlayerTeams() {
  // cache { playerSlug -> TeamInfo }
  const cacheRef = useRef<Record<string, TeamInfo>>({});
  const inFlightRef = useRef<Record<string, Promise<TeamInfo> | null>>({});
  const [, forceRerender] = useState(0);

  const getTeam = useCallback(async (playerSlug: string): Promise<TeamInfo> => {
    if (!playerSlug) return { teamName: null, teamSlug: null };

    const cached = cacheRef.current[playerSlug];
    if (cached) return cached;

    const inflight = inFlightRef.current[playerSlug];
    if (inflight) return inflight;

    const p = (async () => {
      try {
        const data = await apiFetch(`/public-player?slug=${encodeURIComponent(playerSlug)}`);
        const info: TeamInfo = {
          teamName: data?.teamName ?? null,
          teamSlug: data?.teamSlug ?? null,
        };
        cacheRef.current[playerSlug] = info;
        return info;
      } catch {
        const info: TeamInfo = { teamName: null, teamSlug: null };
        cacheRef.current[playerSlug] = info;
        return info;
      } finally {
        inFlightRef.current[playerSlug] = null;
        forceRerender((x) => x + 1);
      }
    })();

    inFlightRef.current[playerSlug] = p;
    return p;
  }, []);

  const peek = useCallback((playerSlug: string): TeamInfo | null => {
    return cacheRef.current[playerSlug] ?? null;
  }, []);

  return { getTeam, peek };
}
