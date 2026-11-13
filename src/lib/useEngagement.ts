import { useMemo } from "react";
import { astronauts } from "@/data/astronauts";
import type { Astronaut } from "@/data/types";
import { computeEngagement, type Engagement } from "@/lib/engagement";
import { useLive } from "@/lib/liveData";

export interface LeaderboardEntry {
  rank: number;
  astronaut: Astronaut;
  engagement: Engagement;
}

/**
 * Crew ranked by task completion and engagement only. Health status and assessment
 * answers are deliberately not inputs to the ranking.
 */
export function useLeaderboard(): LeaderboardEntry[] {
  const { state } = useLive();
  const ledger = state.engagement;
  return useMemo(() => {
    const now = Date.now();
    return astronauts
      .map((astronaut) => ({ astronaut, engagement: computeEngagement(astronaut.id, astronaut.points, ledger, now) }))
      .sort(
        (a, b) =>
          b.engagement.totalPoints - a.engagement.totalPoints ||
          b.engagement.weeklyPoints - a.engagement.weeklyPoints ||
          a.astronaut.name.localeCompare(b.astronaut.name),
      )
      .map((entry, index) => ({ ...entry, rank: index + 1 }));
  }, [ledger]);
}

export function useMyEngagement(astronautId: string | undefined): LeaderboardEntry | undefined {
  const board = useLeaderboard();
  return board.find((e) => e.astronaut.id === astronautId);
}
