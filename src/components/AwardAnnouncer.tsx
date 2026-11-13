import { useEffect, useRef } from "react";
import { TASKS } from "@/data/gamification";
import { useAuth } from "@/lib/auth";
import { useAwardFeed } from "@/lib/liveData";
import { useToast } from "@/lib/toast";

/** Announces new point awards for the signed-in astronaut. Renders nothing. */
export function AwardAnnouncer() {
  const { user } = useAuth();
  const feed = useAwardFeed();
  const toast = useToast();
  const seen = useRef<Set<string>>(new Set(feed.map((e) => e.id)));

  useEffect(() => {
    for (const event of feed) {
      if (seen.current.has(event.id)) continue;
      seen.current.add(event.id);
      if (event.astronautId !== user?.astronautId) continue;
      if (event.task === "bonus") {
        toast(`+${event.points} bonus points`, { detail: "All daily tasks complete." });
      } else {
        const title = TASKS.find((t) => t.id === event.task)?.title ?? "Task";
        toast(`+${event.points} points`, { detail: `${title} completed.` });
      }
    }
  }, [feed, user?.astronautId, toast]);

  return null;
}
