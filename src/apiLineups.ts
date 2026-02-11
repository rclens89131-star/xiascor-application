import { apiFetch } from "./api";
import type { Lineup } from "./types";

export async function createLineup(payload: { name: string; mode: "classic" | "cap" | "custom"; cardSlugs: string[]; gw?: string | null }) {
  return apiFetch<{ ok: true; item: Lineup }>("/lineups", { method: "POST", body: JSON.stringify(payload) });
}

export async function listLineups() {
  return apiFetch<{ items: Lineup[] }>("/lineups");
}
