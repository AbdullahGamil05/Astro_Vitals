import {
  Activity,
  BellRing,
  BrainCircuit,
  ClipboardCheck,
  FileBarChart,
  History,
  LayoutDashboard,
  Medal,
  UserRound,
  Users,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import type { Role } from "@/data/types";

export interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
  end?: boolean;
}

export const navByRole: Record<Role, NavItem[]> = {
  astronaut: [
    { label: "Home", to: "/astronaut", icon: LayoutDashboard, end: true },
    { label: "Monitoring", to: "/astronaut/monitoring", icon: Activity },
    { label: "AI Analysis", to: "/astronaut/ai-analysis", icon: BrainCircuit },
    { label: "Daily Assessment", to: "/astronaut/assessment", icon: ClipboardCheck },
    { label: "Health History", to: "/astronaut/history", icon: History },
    { label: "Leaderboard", to: "/astronaut/leaderboard", icon: Medal },
    { label: "Profile", to: "/astronaut/profile", icon: UserRound },
  ],
  medical: [
    { label: "Overview", to: "/medical", icon: LayoutDashboard, end: true },
    { label: "Astronaut Directory", to: "/medical/directory", icon: Users },
    { label: "Astronaut Profiles", to: "/medical/profiles", icon: UsersRound },
    { label: "Medical Alerts", to: "/medical/alerts", icon: BellRing },
    { label: "Health Reports", to: "/medical/reports", icon: FileBarChart },
  ],
};

export function pageTitleFor(pathname: string, role: Role): string {
  if (pathname.startsWith("/medical/astronauts/")) return "Astronaut Profile";
  if (pathname.startsWith("/medical/profiles/")) return "Astronaut Profile";
  const items = navByRole[role];
  const match = [...items].sort((a, b) => b.to.length - a.to.length).find((i) => pathname === i.to || pathname.startsWith(i.to + "/"));
  return match?.label ?? "AstroVitals";
}
