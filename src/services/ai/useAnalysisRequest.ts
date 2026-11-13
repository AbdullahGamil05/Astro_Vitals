import { useCallback } from "react";
import { useAstronaut, useHistory, useLatestAssessment, useLive } from "@/lib/liveData";
import { buildAnalysisRequest } from "./buildRequest";
import type { AnalysisRequest } from "./schema";

/** Returns a function that snapshots the astronaut's current data into an analysis request. */
export function useAnalysisRequestBuilder(astronautId: string | undefined) {
  const astronaut = useAstronaut(astronautId);
  const samples = useHistory(astronautId, "24h");
  const assessment = useLatestAssessment(astronautId);
  const { state } = useLive();

  return useCallback(
    (): AnalysisRequest | null =>
      astronaut
        ? buildAnalysisRequest({
            astronaut,
            samples,
            alerts: state.alerts.filter((a) => a.astronautId === astronaut.id),
            assessment,
            now: Date.now(),
          })
        : null,
    [astronaut, samples, state.alerts, assessment],
  );
}
