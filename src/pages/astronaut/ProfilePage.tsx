import { AstronautProfileView } from "@/components/AstronautProfileView";
import { useAuth } from "@/lib/auth";
import { useAstronaut } from "@/lib/liveData";

export function OwnProfilePage() {
  const { user } = useAuth();
  const me = useAstronaut(user?.astronautId);
  if (!me) return null;
  return <AstronautProfileView astronaut={me} />;
}
