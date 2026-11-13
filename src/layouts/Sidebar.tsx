import { NavLink } from "react-router-dom";
import { PanelLeftClose, PanelLeftOpen, X } from "lucide-react";
import { Wordmark } from "@/components/Logo";
import { cn } from "@/lib/health";
import type { Role } from "@/data/types";
import { navByRole } from "./navigation";

interface SidebarProps {
  role: Role;
  collapsed: boolean;
  mobileOpen: boolean;
  onToggleCollapsed: () => void;
  onCloseMobile: () => void;
}

export function Sidebar({ role, collapsed, mobileOpen, onToggleCollapsed, onCloseMobile }: SidebarProps) {
  const items = navByRole[role];
  const roleLabel = role === "astronaut" ? "Crew Console" : "Medical Console";

  return (
    <>
      {mobileOpen ? (
        <button
          type="button"
          aria-label="Close navigation"
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={onCloseMobile}
        />
      ) : null}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex flex-col border-r border-white/10 bg-[#06080F]/90 backdrop-blur-md transition-[transform,width] duration-200 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0",
          collapsed ? "lg:w-[72px]" : "lg:w-64",
          "w-64",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className={cn("flex h-16 items-center border-b border-orbit-line px-4", collapsed ? "lg:justify-center" : "justify-between")}>
          <Wordmark showText={!collapsed || mobileOpen} />
          <button
            type="button"
            onClick={onCloseMobile}
            className="rounded-md p-1.5 text-orbit-muted hover:bg-white/5 hover:text-ink lg:hidden"
            aria-label="Close navigation"
          >
            <X className="size-5" />
          </button>
        </div>

        <p className={cn("orbit-eyebrow px-5 pb-2 pt-5", collapsed && "lg:sr-only")}>{roleLabel}</p>

        <nav aria-label="Primary" className="flex-1 space-y-1 overflow-y-auto px-3">
          {items.map(({ label, to, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={onCloseMobile}
              title={collapsed ? label : undefined}
              className={({ isActive }) =>
                cn(
                  "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  collapsed && "lg:justify-center lg:px-0",
                  isActive
                    ? "bg-white/[0.06] text-ink"
                    : "text-orbit-muted hover:bg-white/5 hover:text-ink",
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive ? (
                    <span className="absolute -left-3 top-2 bottom-2 w-0.5 bg-orbit-cyan" />
                  ) : null}
                  <Icon className={cn("size-[18px] shrink-0", isActive && "text-orbit-cyan")} aria-hidden="true" />
                  <span className={cn(collapsed && "lg:sr-only")}>{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-orbit-line p-3">
          <div className={cn("mb-3 rounded-lg border border-orbit-line bg-white/[0.02] p-3 text-xs text-orbit-muted", collapsed && "lg:hidden")}>
            <span className="orbit-eyebrow block">Prototype</span>
            <p className="mt-1.5 leading-relaxed">Demo build with simulated data. Not for clinical use.</p>
          </div>
          <button
            type="button"
            onClick={onToggleCollapsed}
            className="hidden w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-orbit-muted hover:bg-white/5 hover:text-ink lg:flex"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
            {collapsed ? null : "Collapse"}
          </button>
        </div>
      </aside>
    </>
  );
}
