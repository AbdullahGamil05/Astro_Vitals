import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Bell, ChevronDown, LogOut, Menu, UserRound } from "lucide-react";
import { Avatar, SeverityDot } from "@/components/ui/primitives";
import { getAstronaut } from "@/data/astronauts";
import { useAuth } from "@/lib/auth";
import { useUnifiedAlerts } from "@/lib/liveData";
import { pageTitleFor } from "./navigation";

function Popover({
  trigger,
  children,
  align = "right",
}: {
  trigger: (props: { open: boolean; toggle: () => void }) => ReactNode;
  children: (close: () => void) => ReactNode;
  align?: "right" | "left";
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const location = useLocation();

  useEffect(() => setOpen(false), [location.pathname]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      {trigger({ open, toggle: () => setOpen((o) => !o) })}
      {open ? (
        <div
          className={`absolute top-full z-50 mt-2 w-72 rounded-lg border border-orbit-line bg-orbit-side p-2 shadow-2xl shadow-black/50 ${align === "right" ? "right-0" : "left-0"}`}
        >
          {children(() => setOpen(false))}
        </div>
      ) : null}
    </div>
  );
}

export function Topbar({ onOpenMobileNav }: { onOpenMobileNav: () => void }) {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const liveAlerts = useUnifiedAlerts(user?.role === "astronaut" ? user.astronautId : undefined);
  if (!user) return null;

  const title = pageTitleFor(pathname, user.role);
  const relevantAlerts = liveAlerts.filter((a) => a.active).slice(0, 4);
  const profilePath = user.role === "astronaut" ? "/astronaut/profile" : "/medical/directory";

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-orbit-line bg-orbit-bg/85 px-4 backdrop-blur-md sm:px-6">
      <button
        type="button"
        onClick={onOpenMobileNav}
        className="rounded-md p-2 text-orbit-muted hover:bg-white/5 hover:text-ink lg:hidden"
        aria-label="Open navigation"
      >
        <Menu className="size-5" />
      </button>

      <div className="min-w-0 flex-1">
        <p className="hidden font-sans text-[11px] font-medium uppercase tracking-[0.12em] text-orbit-dim sm:block">
          {user.role === "astronaut" ? "Crew Console" : "Medical Console"}
        </p>
        <h1 className="font-display truncate text-xl font-semibold leading-tight tracking-tight text-ink">{title}</h1>
      </div>

      <Popover
        trigger={({ toggle, open }) => (
          <button
            type="button"
            onClick={toggle}
            aria-expanded={open}
            aria-label={`Notifications, ${relevantAlerts.length} active`}
            className="relative rounded-lg p-2 text-orbit-muted hover:bg-white/5 hover:text-ink"
          >
            <Bell className="size-5" />
            {relevantAlerts.length ? (
              <span className="absolute right-1 top-1 flex size-4 items-center justify-center rounded-full bg-orbit-crit font-sans text-[10px] font-semibold text-ink">
                {relevantAlerts.length}
              </span>
            ) : null}
          </button>
        )}
      >
        {(close) => (
          <div>
            <p className="px-2 pb-2 pt-1 font-sans text-[11px] font-medium uppercase tracking-[0.12em] text-orbit-dim">Active notifications</p>
            {relevantAlerts.length === 0 ? (
              <p className="px-2 py-3 text-sm text-orbit-muted">No active alerts.</p>
            ) : (
              <ul>
                {relevantAlerts.map((a) => (
                  <li key={a.id} className="flex gap-3 rounded-lg px-2 py-2 hover:bg-white/5">
                    <SeverityDot severity={a.severity} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-ink">{a.title}</p>
                      <p className="text-xs text-orbit-muted">
                        {user.role === "medical" ? `${getAstronaut(a.astronautId)?.name} · ` : ""}
                        {a.timeLabel}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {user.role === "medical" ? (
              <Link
                to="/medical/alerts"
                onClick={close}
                className="mt-1 block rounded-lg px-2 py-2 text-center text-xs font-medium text-orbit-cyan hover:bg-white/5"
              >
                View all alerts
              </Link>
            ) : null}
          </div>
        )}
      </Popover>

      <Popover
        trigger={({ toggle, open }) => (
          <button
            type="button"
            onClick={toggle}
            aria-expanded={open}
            aria-haspopup="menu"
            className="flex items-center gap-2.5 rounded-lg py-1 pl-1 pr-2 hover:bg-white/5"
          >
            <Avatar name={user.name} from={user.avatarFrom} to={user.avatarTo} size={34} />
            <span className="hidden text-left sm:block">
              <span className="block text-sm font-medium leading-tight text-ink">{user.name}</span>
              <span className="block text-xs capitalize leading-tight text-orbit-muted">
                {user.role === "astronaut" ? "Astronaut" : "Medical Officer"}
              </span>
            </span>
            <ChevronDown className="hidden size-4 text-orbit-muted sm:block" />
          </button>
        )}
      >
        {(close) => (
          <div role="menu">
            <div className="border-b border-orbit-line px-2 pb-3 pt-1">
              <p className="text-sm font-medium text-ink">{user.name}</p>
              <p className="text-xs text-orbit-muted">{user.title}</p>
              <p className="mt-0.5 font-mono text-[11px] text-orbit-dim">{user.loginId}</p>
            </div>
            <Link
              to={profilePath}
              onClick={close}
              role="menuitem"
              className="mt-1 flex items-center gap-2.5 rounded-lg px-2 py-2 text-sm text-orbit-muted hover:bg-white/5 hover:text-ink"
            >
              <UserRound className="size-4" />
              {user.role === "astronaut" ? "My profile" : "Crew directory"}
            </Link>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                close();
                logout();
                navigate("/login", { replace: true });
              }}
              className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-sm text-orbit-crit hover:bg-orbit-crit/10"
            >
              <LogOut className="size-4" />
              Log out
            </button>
          </div>
        )}
      </Popover>
    </header>
  );
}
